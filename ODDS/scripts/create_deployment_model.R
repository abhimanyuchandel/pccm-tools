#!/usr/bin/env Rscript

args <- commandArgs(trailingOnly = TRUE)

if (length(args) < 2) {
  stop(
    "Usage: Rscript ODDS/scripts/create_deployment_model.R <source-model.rds> <output-model.rds>",
    call. = FALSE
  )
}

source_path <- normalizePath(args[[1]], mustWork = TRUE)
output_path <- args[[2]]

model <- readRDS(source_path)

remap_ids <- function(ids) {
  original <- as.character(ids)
  levels_out <- sort(unique(original))
  mapped <- setNames(sprintf("odds%04d", seq_along(levels_out)), levels_out)
  unname(mapped[original])
}

sanitize_patient_id_column <- function(data) {
  if (is.data.frame(data) && "patient_id" %in% names(data)) {
    data$patient_id <- remap_ids(data$patient_id)
  }
  data
}

if (!is.null(model$model_data)) {
  model$model_data$dataL <- sanitize_patient_id_column(model$model_data$dataL)
  model$model_data$dataS <- sanitize_patient_id_column(model$model_data$dataS)

  if (!is.null(model$model_data$idT)) {
    model$model_data$idT <- factor(remap_ids(model$model_data$idT))
  }

  if (!is.null(model$model_data$unq_idL)) {
    model$model_data$unq_idL <- lapply(model$model_data$unq_idL, remap_ids)
  }
}

dir.create(dirname(output_path), recursive = TRUE, showWarnings = FALSE)
saveRDS(model, output_path)

cat("Wrote sanitized deployment model to: ", output_path, "\n", sep = "")
