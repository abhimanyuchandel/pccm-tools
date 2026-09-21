# ELSO-derived ECPR Calculator

The September 21, 2026 revision uses the frozen ten-input, pH-free ridge model without bystander CPR. It requires complete predictor entry. It estimates survival to discharge with CPC 1–2 among adult OHCA patients supported with ECPR. It does not estimate ECPR treatment benefit.

## Implementation

- `model.mjs`: frozen coefficients, spline knots and factor definitions. The original equation SHA-256 is recorded in its header.
- `predict.mjs`: complete-entry equation, with the existing verified R-to-JavaScript adapter unchanged. Age is capped at 80, age and CPR duration use three-knot restricted cubic splines, and shocks use `log(1 + shocks)`.
- `presentation.mjs`: descriptive bands below 5%, 5% to below 20%, and 20% or greater. Band assignment uses the unrounded probability. These are not validated treatment thresholds.
- `app.mjs`: form checks and result display. Any input change clears the previous result. Entered values are not stored or transmitted.
- `calculator.css`: route-specific styling that preserves the site's shared layout and colors.
- `fixtures.json`: 60 hypothetical examples generated from the frozen R fit. No patient records are included.

## Verification

From the repository root:

```sh
node ohca-ecpr-calc/test.mjs
```

This checks agreement with the R-generated reference cases to an absolute tolerance of `1e-12`, input validation, complete entry, age top-coding, threshold boundaries, stale-result clearing, reset and history behavior, and requested copy. The controller tests use a DOM test double and do not replace browser checks.

To check every case in the original hypothetical fixture bank, pass its path as the first argument. No analysis needs to be rerun.

Preview on the isolated review branch before merging to `main`. Cloudflare Pages previews are not production deployments. Independent external validation and author/statistical review remain necessary before clinical use.
