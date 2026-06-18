#!/usr/bin/env Rscript

suppressPackageStartupMessages({
  library(httpuv)
  library(jsonlite)
  library(JMbayes2)
})

script_arg <- grep("^--file=", commandArgs(FALSE), value = TRUE)
if (length(script_arg) > 0) {
  app_dir <- dirname(normalizePath(sub("^--file=", "", script_arg[[1]]), mustWork = TRUE))
} else {
  app_dir <- normalizePath(getwd(), mustWork = TRUE)
}

project_dir <- normalizePath(file.path(app_dir, ".."), mustWork = TRUE)

default_model_paths <- c(
  file.path(app_dir, "Models", "joint_model_Serial_ODDS_joint_model.sanitized.rds"),
  file.path(app_dir, "private-models", "joint_model_Serial_ODDS_joint_model.sanitized.rds"),
  file.path(project_dir, "Models", "joint_model_Serial_ODDS_joint_model.sanitized.rds"),
  file.path(
    project_dir,
    "analysis",
    "ODDS_validation_recalibration",
    "models",
    "joint_model_Serial_ODDS_joint_model.rds"
  )
)

env_model_path <- Sys.getenv("ODDS_JOINT_MODEL_PATH", "")
joint_model_path <- if (nzchar(env_model_path)) {
  env_model_path
} else {
  existing <- default_model_paths[file.exists(default_model_paths)]
  if (length(existing)) existing[[1]] else default_model_paths[[1]]
}

if (!file.exists(joint_model_path)) {
  stop("Joint model object not found: ", joint_model_path, call. = FALSE)
}

joint_model <- readRDS(joint_model_path)
marker_center <- as.numeric(Sys.getenv("ODDS_MARKER_CENTER", "-7.172273"))
marker_scale <- as.numeric(Sys.getenv("ODDS_MARKER_SCALE", "1.236317"))

if (!is.finite(marker_center) || !is.finite(marker_scale) || marker_scale <= 0) {
  stop("Could not configure ODDS marker scaling.", call. = FALSE)
}

split_env <- function(value) {
  entries <- trimws(unlist(strsplit(value, ",")))
  entries[nzchar(entries)]
}

allowed_origins <- split_env(Sys.getenv(
  "ODDS_ALLOWED_ORIGINS",
  "https://pccmtools.org,https://www.pccmtools.org,http://127.0.0.1:8787,http://localhost:8787"
))

response_origin <- function(req) {
  origin <- req$HTTP_ORIGIN
  if (!is.null(origin) && origin %in% allowed_origins) {
    return(origin)
  }
  allowed_origins[[1]]
}

json_response <- function(status, payload, origin = allowed_origins[[1]]) {
  list(
    status = status,
    headers = list(
      "Content-Type" = "application/json; charset=utf-8",
      "Access-Control-Allow-Origin" = origin,
      "Vary" = "Origin",
      "Access-Control-Allow-Methods" = "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers" = "Content-Type"
    ),
    body = jsonlite::toJSON(payload, auto_unbox = TRUE, null = "null", digits = 8)
  )
}

error_response <- function(status, message, origin = allowed_origins[[1]]) {
  json_response(status, list(ok = FALSE, error = message), origin)
}

read_request_body <- function(req) {
  body <- req$rook.input$read()
  if (is.raw(body)) {
    return(rawToChar(body))
  }
  if (is.character(body)) {
    return(paste0(body, collapse = ""))
  }
  if (length(body) == 0) {
    return("")
  }
  paste0(as.character(body), collapse = "")
}

coerce_finite <- function(value) {
  out <- suppressWarnings(as.numeric(value))
  if (!is.finite(out)) {
    return(NA_real_)
  }
  out
}

validate_rows <- function(rows) {
  if (is.list(rows) && !is.data.frame(rows)) {
    rows <- jsonlite::rbind_pages(lapply(rows, as.data.frame))
  }
  if (!is.data.frame(rows) || nrow(rows) < 2) {
    stop("At least two complete 6MWT rows are required for joint-model prediction.", call. = FALSE)
  }

  years <- vapply(rows$years, coerce_finite, numeric(1))
  odds <- vapply(rows$oddsScore, coerce_finite, numeric(1))
  complete <- is.finite(years) & is.finite(odds)
  years <- years[complete]
  odds <- odds[complete]

  if (length(years) < 2) {
    stop("At least two complete rows with years and ODDS score are required.", call. = FALSE)
  }
  if (any(years < 0)) {
    stop("Years since baseline cannot be negative.", call. = FALSE)
  }

  ordering <- order(years)
  years <- years[ordering]
  odds <- odds[ordering]

  if (any(diff(years) < 0)) {
    stop("Visit years could not be sorted.", call. = FALSE)
  }

  data.frame(years = years, odds = odds)
}

joint_prediction_payload <- function(payload) {
  rows <- validate_rows(payload$rows)

  horizons <- if (!is.null(payload$horizons)) {
    vapply(payload$horizons, coerce_finite, numeric(1))
  } else {
    c(1, 2, 3)
  }
  horizons <- horizons[is.finite(horizons) & horizons > 0]
  if (!length(horizons)) {
    stop("At least one positive prediction horizon is required.", call. = FALSE)
  }

  n_samples <- if (!is.null(payload$nSamples)) {
    as.integer(coerce_finite(payload$nSamples))
  } else {
    500L
  }
  if (!is.finite(n_samples) || n_samples < 50L) {
    n_samples <- 500L
  }
  n_samples <- min(n_samples, 4000L)

  seed <- if (!is.null(payload$seed)) {
    as.integer(coerce_finite(payload$seed))
  } else {
    20260617L
  }
  if (!is.finite(seed)) {
    seed <- 20260617L
  }

  prediction_origin <- max(rows$years)
  newdata <- data.frame(
    patient_id = "app-patient",
    years_since_baseline = rows$years,
    marker = (rows$odds - marker_center) / marker_scale,
    follow_time_years = prediction_origin,
    primary_event = 0
  )

  predicted <- predict(
    joint_model,
    newdata = newdata,
    process = "event",
    times = prediction_origin + horizons,
    return_newdata = TRUE,
    cores = 1,
    n_samples = n_samples,
    seed = seed
  )
  predicted <- as.data.frame(predicted)
  future <- predicted[predicted$years_since_baseline > prediction_origin + 1e-8, , drop = FALSE]

  predictions <- list()
  intervals <- list()
  for (horizon in horizons) {
    target_time <- prediction_origin + horizon
    index <- which.min(abs(future$years_since_baseline - target_time))
    if (!length(index) || !is.finite(future$pred_CIF[[index]])) {
      next
    }
    key <- as.character(horizon)
    estimate <- max(0, min(1, 1 - future$pred_CIF[[index]]))
    lower <- if ("upp_CIF" %in% names(future)) max(0, min(1, 1 - future$upp_CIF[[index]])) else NA_real_
    upper <- if ("low_CIF" %in% names(future)) max(0, min(1, 1 - future$low_CIF[[index]])) else NA_real_
    predictions[[key]] <- estimate
    intervals[[key]] <- list(lower = lower, upper = upper)
  }

  list(
    ok = TRUE,
    model = "JMbayes2 Serial ODDS joint model",
    predictionOriginYears = prediction_origin,
    horizons = horizons,
    predictions = predictions,
    intervals = intervals,
    markerCenter = marker_center,
    markerScale = marker_scale,
    nSamples = n_samples
  )
}

handle_joint_prediction <- function(body) {
  payload <- tryCatch(jsonlite::fromJSON(body, simplifyVector = FALSE), error = function(error) {
    stop("Request body must be valid JSON.", call. = FALSE)
  })
  joint_prediction_payload(payload)
}

mime_type <- function(path) {
  extension <- tolower(tools::file_ext(path))
  switch(
    extension,
    html = "text/html; charset=utf-8",
    js = "text/javascript; charset=utf-8",
    css = "text/css; charset=utf-8",
    json = "application/json; charset=utf-8",
    png = "image/png",
    jpg = "image/jpeg",
    jpeg = "image/jpeg",
    svg = "image/svg+xml",
    "application/octet-stream"
  )
}

static_response <- function(path_info) {
  rel_path <- sub("^/+", "", path_info)
  if (!nzchar(rel_path)) {
    rel_path <- "index.html"
  }

  candidate <- normalizePath(file.path(app_dir, rel_path), mustWork = FALSE)
  app_root <- paste0(normalizePath(app_dir, mustWork = TRUE), .Platform$file.sep)
  if (!startsWith(candidate, app_root) && candidate != normalizePath(file.path(app_dir, "index.html"), mustWork = FALSE)) {
    return(error_response(403L, "Forbidden"))
  }
  if (!file.exists(candidate) || dir.exists(candidate)) {
    return(error_response(404L, "Not found"))
  }

  list(
    status = 200L,
    headers = list("Content-Type" = mime_type(candidate)),
    body = readBin(candidate, what = "raw", n = file.info(candidate)$size)
  )
}

app <- list(
  call = function(req) {
    method <- req$REQUEST_METHOD
    path <- req$PATH_INFO
    origin <- response_origin(req)

    if (identical(method, "OPTIONS")) {
      return(json_response(204L, list(), origin))
    }

    if (identical(path, "/api/joint-odds-prediction")) {
      if (!identical(method, "POST")) {
        return(error_response(405L, "Use POST for joint-model prediction.", origin))
      }
      return(tryCatch(
        json_response(200L, handle_joint_prediction(read_request_body(req)), origin),
        error = function(error) error_response(400L, conditionMessage(error), origin)
      ))
    }

    static_response(path)
  }
)

args <- commandArgs(trailingOnly = TRUE)
if ("--test" %in% args) {
  test_body <- jsonlite::toJSON(
    list(
      rows = list(
        list(visit = 1, years = 0, oddsScore = -7.57),
        list(visit = 2, years = 0.9966, oddsScore = -6.81),
        list(visit = 3, years = 2.0109, oddsScore = -6.05)
      ),
      horizons = c(1, 2, 3),
      nSamples = 200,
      seed = 20260617
    ),
    auto_unbox = TRUE
  )
  cat(jsonlite::toJSON(handle_joint_prediction(test_body), auto_unbox = TRUE, digits = 8), "\n")
  quit(save = "no", status = 0)
}

host <- Sys.getenv("ODDS_JOINT_HOST", "127.0.0.1")
port <- as.integer(Sys.getenv("ODDS_JOINT_PORT", "8787"))
if (!is.finite(port)) {
  port <- 8787L
}

server <- httpuv::startServer(host, port, app)
on.exit(httpuv::stopServer(server), add = TRUE)

cat("ODDS JMbayes2 app server running at http://", host, ":", port, "\n", sep = "")
cat("Using joint model: ", joint_model_path, "\n", sep = "")
cat("Press Ctrl+C to stop.\n")

while (TRUE) {
  httpuv::service()
  Sys.sleep(0.01)
}
