# Oxygen-Distance-Dyspnea-Saturation (ODDS) Score for Prognosis in IPF

Open `index.html` in a browser to use the app. It is static and does not need a server.

## Prediction Logic

- Predictions use ODDS score only.
- One available ODDS score uses the baseline ODDS Cox model from `analysis/ODDS_validation_recalibration/ODDS_validation_recalibration_analysis.Rmd`.
- Serial ODDS scores use the time-updated ODDS Cox longitudinal model from the same analysis.
- 6MWD and other 6MWT fields are used only to calculate the ODDS score or to format the clinical note; 6MWD is not used as a standalone predictor.
- Event-free survival is defined as freedom from death or lung transplantation.

ODDS score is calculated as:

```text
0.18 * O2 L/min - 0.004 * 6MWD(m) - 0.069 * nadir SpO2(%) + 0.07 * Borg
```

## Clinical Note Round Trip

The `Copy Table` button writes a formatted HTML table plus a tab-delimited plain-text fallback to the clipboard. Paste it into a clinical note, then copy the note table back into `Import from note` at a later encounter to restore the prior 6MWT rows before adding a new visit.

## Regenerating Model Parameters

From the project root:

```sh
Rscript ipf-6mwt-survival-app/scripts/export_model_parameters.R
```

This rewrites `model-parameters.js` from `analysis/ODDS_validation_recalibration/data/derived_analysis_data.rds`.

## About

Last updated: June 17, 2026.

The ODDS score was developed in the ISABELA IPF cohort to use the full signal of the six-minute walk test: oxygen requirement, walk distance, exertional dyspnea, and oxygen saturation, rather than relying on distance alone. It was subsequently externally validated and applied longitudinally, demonstrating that serial ODDS measurements can help estimate evolving event-free survival risk over time.

Contributors:

Abhimanyu Chandel
Jie Gao
Ho Cheol Kim
Henry Chen
Xiaomin Lu
Bernt van den Blink
Lixin Shao
Timothy R Watkins
Toby M Maher
Lisa Lancaster
Steven D Nathan

This tool is intended to support clinical discussion, risk stratification, and shared decision-making. It is not intended to be used in isolation to determine prognosis or decisions about IPF related management.

This calculator is provided for research and educational purposes only and has not been approved as a medical device. Use does not replace expert clinical assessment.

### Citations

1. Nathan SD, Gao J, Kim HC, Chandel A, Chen H, Lu X, van den Blink B, Shao L, Watkins TR, Maher TM, Lancaster L. Development and validation of a predictive 6-min walk score in patients with idiopathic pulmonary fibrosis. European Respiratory Journal. 2025;66(5):2402565. doi:10.1183/13993003.02565-2024. PMID: 40610052; PMCID: PMC12591136.
2. Maher TM, Ford P, Brown KK, et al. Ziritaxestat, a Novel Autotaxin Inhibitor, and Lung Function in Idiopathic Pulmonary Fibrosis: The ISABELA 1 and 2 Randomized Clinical Trials. JAMA. 2023;329(18):1567-1578. doi:10.1001/jama.2023.5355
