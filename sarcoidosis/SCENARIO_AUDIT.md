# Sarcoidosis Preview Verification

Review date: October 16, 2026. Branch: `codex/sarcoidosis-guided-soap`.

## Automated Coverage

- 42 sarcoidosis test cases, generating and checking 890 valid synthetic SOAP drafts. No patient records or source data are used.
- Includes a 576-combination drug/activity/indication/review matrix and 126 urgent-feature/context/strategy combinations, plus focused diagnostic, dosing, taper, screening, vaccine and documentation cases.
- Every valid draft retains the shared clinical actions and resolves their references. Assertions check SOAP sections, numeric integrity and absence of invented examination, vaccine administration or completed counseling.
- Boundary checks cover weekly MTX, eGFR, delivered dose increments, TPMT/NUDT15, interacting drugs, HCQ weight limits, TNF initiation versus maintenance, switching, combined treatment, current infusion units and steroid exposure before cessation.
- All 440 combined sarcoidosis, asthma, COPD, PERT and OHCA regression tests passed locally. The existing asthma and COPD browser suites also passed.
- Sarcoidosis browser verification covers actual guided entry, retained answers, editable schedules, drug-specific safety, selected pneumococcal product, urgent priority, staged taper, clipboard agreement, stale-output protection, keyboard focus and regeneration without viewport movement at 320/390/768/1280 px widths.

## Suggested Clinical Review Encounters

1. **Stable, untreated disease:** established diagnosis with unavailable original records, no systemic medication, stable course, no clinically important activity or treatment indication. Choose observation. Confirm there is no automatic steroid prescription or repeat biopsy and that screening reflects the documented record status.
2. **Symptomatic inflammatory pulmonary disease:** establish the diagnostic context and treatment indication. Compare prednisone, MTX alone and an MTX/prednisone bridge. Review the starting preset, adjust dose/route, complete safety review and inspect the matched prescription, folate and monitoring in the note.
3. **Steroid toxicity or taper-associated symptoms:** enter the actual steroid product, dose/exposure and prior response. Choose a staged reduction or steroid-sparing plan. Confirm background treatment is retained/stopped only as selected and that chronic cessation does not assume adrenal recovery.
4. **Refractory active disease:** document conventional treatment failure/intolerance, select infliximab or adalimumab, and distinguish initiation/switch from maintenance. Confirm missing infection/organ-safety data prevent definitive initiation, and verify the selected dose, weight-dependent calculation and background-agent plan.
5. **Fibrotic disease or disproportionate dyspnea:** enter comparable PFTs and relevant oxygen data. Choose PH evaluation or multidisciplinary advanced-care referral. Confirm the note does not automatically diagnose PH, prescribe PAH/antifibrotic therapy or declare transplant eligibility.
6. **Warning symptoms:** enter syncope, acute eye symptoms, neurologic changes, severe hypoxemia or marked calcium elevation. Change encounter context and treatment selections. Confirm the warning remains effective and routine prescriptions/prevention are not allowed to override urgent assessment.
7. **Prevention:** compare unknown versus due screening/vaccine records, low-dose prednisone versus explicitly confirmed immune compromise, and prior PCV20/21 versus no prior pneumococcal vaccine. Check that no completed vaccination or counseling is invented.

## Limits

These checks are implementation verification, not independent clinical validation or a guarantee for every presentation. Full interaction review, rare contraindications, actual product/infusion orders, pregnancy-specific care, individualized renal dosing, organ-threatening treatment and procedural/transplant candidacy remain clinician responsibilities. Conservative template boundaries and other pragmatic choices are identified in the source-linked clinical change log.

Production promotion requires clinical review and subsequent approval.
