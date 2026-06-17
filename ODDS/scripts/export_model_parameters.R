args <- commandArgs(trailingOnly = FALSE)
file_arg <- args[grepl("^--file=", args)]
if (length(file_arg) == 0) {
  stop("Run this script with Rscript so the --file argument is available.")
}

script_path <- normalizePath(sub("^--file=", "", file_arg[[1]]), mustWork = TRUE)
app_dir <- dirname(dirname(script_path))
project_dir <- dirname(app_dir)

suppressPackageStartupMessages({
  library(jsonlite)
  library(survival)
})

derived_path <- file.path(
  project_dir,
  "analysis",
  "ODDS_validation_recalibration",
  "data",
  "derived_analysis_data.rds"
)

analysis <- readRDS(derived_path)
analysis_base <- analysis$wide
long_clean <- analysis$long

primary_cc <- subset(
  analysis_base,
  !is.na(follow_time_years) &
    follow_time_years > 0 &
    !is.na(primary_event) &
    !is.na(z_6mwd_worse) &
    !is.na(z_odds_raw)
)

cox_odds <- coxph(
  Surv(follow_time_years, primary_event) ~ z_odds_raw,
  data = primary_cc,
  x = TRUE,
  y = TRUE,
  model = TRUE
)

make_start_stop <- function(marker_col) {
  marker <- long_clean[[marker_col]]
  dat <- long_clean[!is.na(marker) &
    !is.na(long_clean$follow_time_years) &
    long_clean$follow_time_years > 0, ]
  dat <- dat[order(dat$patient_id, dat$years_since_baseline), ]
  split_dat <- split(dat, dat$patient_id)
  out <- lapply(split_dat, function(patient_rows) {
    n <- nrow(patient_rows)
    next_time <- c(patient_rows$years_since_baseline[-1], NA_real_)
    patient_rows$tstart <- pmax(patient_rows$years_since_baseline, 0)
    patient_rows$tstop <- pmin(
      ifelse(is.na(next_time), patient_rows$follow_time_years, next_time),
      patient_rows$follow_time_years
    )
    patient_rows$event_interval <- ifelse(patient_rows$primary_event & is.na(next_time), 1, 0)
    patient_rows$marker <- patient_rows[[marker_col]]
    patient_rows
  })
  out <- do.call(rbind, out)
  out[out$tstop > out$tstart, ]
}

td_odds_data <- make_start_stop("z_odds_raw_visit")

td_odds_fit <- coxph(
  Surv(tstart, tstop, event_interval) ~ marker + cluster(patient_id),
  data = td_odds_data
)

basehaz_payload <- function(fit) {
  bh <- basehaz(fit, centered = FALSE)
  list(
    time = unname(bh$time),
    hazard = unname(bh$hazard)
  )
}

cox_payload <- function(fit, term) {
  s <- summary(fit)
  list(
    beta = unname(coef(fit)[[term]]),
    hazardRatio = unname(exp(coef(fit)[[term]])),
    standardError = unname(s$coefficients[term, "se(coef)"]),
    baselineHazard = basehaz_payload(fit)
  )
}

td_payload <- function(fit) {
  s <- summary(fit)
  list(
    beta = unname(coef(fit)[["marker"]]),
    hazardRatio = unname(exp(coef(fit)[["marker"]])),
    robustStandardError = unname(s$coefficients["marker", "robust se"]),
    baselineHazard = basehaz_payload(fit)
  )
}

scaling <- list(
  baseline = list(
    oddsRaw = list(
      transformed = "odds_raw",
      center = mean(analysis_base$baseline_odds_raw, na.rm = TRUE),
      scale = sd(analysis_base$baseline_odds_raw, na.rm = TRUE)
    )
  ),
  longitudinal = list(
    oddsRaw = list(
      transformed = "odds_raw",
      center = mean(long_clean$odds_raw, na.rm = TRUE),
      scale = sd(long_clean$odds_raw, na.rm = TRUE)
    )
  )
)

bundle <- list(
  version = "2026-06-17",
  generatedAt = format(Sys.time(), "%Y-%m-%d %H:%M:%S %Z"),
  source = list(
    derivedAnalysisData = derived_path,
    analysis = "analysis/ODDS_validation_recalibration/ODDS_validation_recalibration_analysis.Rmd",
    endpoint = "death or lung transplantation",
    population = "IPF ODDS validation analytic cohort",
    timeScale = "years from first retained 6MWT"
  ),
  horizonsYears = c(1, 2, 3),
  scaling = scaling,
  models = list(
    baselineOddsRaw = cox_payload(cox_odds, "z_odds_raw"),
    longitudinalOddsRaw = td_payload(td_odds_fit)
  ),
  training = list(
    baselinePatients = nrow(primary_cc),
    baselineEvents = unname(cox_odds$nevent),
    longitudinalOddsIntervals = nrow(td_odds_data),
    ranges = list(
      baselineOddsRaw = unname(range(analysis_base$baseline_odds_raw, na.rm = TRUE)),
      longitudinalOddsRaw = unname(range(long_clean$odds_raw, na.rm = TRUE))
    )
  )
)

json <- toJSON(bundle, auto_unbox = TRUE, digits = 16, pretty = TRUE)
writeLines(
  c(
    "window.IPF_6MWT_MODEL = ",
    json,
    ";"
  ),
  file.path(app_dir, "model-parameters.js")
)

message("Wrote ", file.path(app_dir, "model-parameters.js"))
