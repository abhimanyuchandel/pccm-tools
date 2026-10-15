# Asthma Common-Encounter Audit

Review date: October 15, 2026. Preview only: `codex/asthma-guided-inhaler-soap`.

## Scope

`scenarios.test.js` generates **279 synthetic encounters**, independently of the prior regression suite. No patient records are used.

| Coverage | Encounters | Principal expectations |
| --- | ---: | --- |
| Complete common encounters | 39 | Diagnosis, initiation, follow-up, step-down, biologics, smoking cessation, prevention, and active/resolved exacerbations |
| Current controller and reliever combinations | 96 | Product-specific history, dose uncertainty, compatible relief, and no automatic continuation of unsupported combinations |
| Symptom and annual exacerbation-history combinations | 108 | Missing answers are not negatives; known admissions/bursts remain actionable even with controlled symptoms |
| Urgent findings across three encounter contexts | 36 | Urgency survives changing context and suppresses elective prescriptions or false reassurance |

Every encounter checks SOAP structure, editable history/examination placeholders, and absence of invalid numeric output or invented denials, normal examinations, vaccine administration, or completed counseling. Selected plans check matching product schedules, unselected alternatives, and prescribing prerequisites. Browser checks also exercise the corrected branches, copy/stale behavior, regeneration without viewport movement, keyboard access, and 320/390/768/1280 px layouts.

## Findings Corrected

1. Follow-up with explicitly absent controller treatment or SABA-only treatment could imply continuation of an ICS regimen that did not exist. It now offers a clinician-selected ICS-containing start with early review. Existing treatment history and encounter phase remain intact.
2. Uncontrolled medium/high-dose ICS monotherapy, or as-needed ICS-SABA alone, could yield only regimen clarification despite a known regimen. Supported combination/maintenance options now appear after optimization. Product and reliever selection remain explicit.
3. A reported high-dose SMART regimen could enable a low-dose step-down prescription even though its original dosing was unverified. Unverified, unsupported, or duplicate regimens now require reconciliation before automatic reduction.
4. Selecting Track 2, continuation, or another strategy could leave an earlier SMART proposal in the SOAP Assessment. The shared proposed-medication field now follows the validated selection, so an unchosen SMART regimen is not documented as the plan.

## Clinical Reference Checks

- [GINA 2026 Summary Guide](https://ginasthma.org/wp-content/uploads/2026/07/GINA-Summary-Guide-2026-WEB-WMS.pdf): adult diagnosis, control and future risk, ICS-containing treatment, MART schedules, adjustment, and acute assessment.
- [GINA 2026 Severe Asthma Guide](https://ginasthma.org/wp-content/uploads/2026/06/GINA-Severe-Asthma-Guide-2026-WEB-WMS.pdf): optimization, phenotype matching, longitudinal eligibility, and biologic prerequisites.
- U.S. label spot-checks: [Airsupra](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=e60aa9f9-5139-44df-b886-ebddc3c7eb13), [Spiriva Respimat](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=7b656b14-fcaa-2741-f6f0-e0be48971c02), and [Breo Ellipta](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=96428df1-ea05-431a-98d3-1ec2c4b63878). Product-specific preset sources remain in `inhalers.js`; this audit did not add or change doses.
- CDC [pneumococcal](https://www.cdc.gov/pneumococcal/hcp/vaccine-recommendations/index.html) and [RSV](https://www.cdc.gov/rsv/hcp/vaccine-clinical-guidance/adults.html) guidance: age/risk eligibility, prior doses, and unknown history.

## Limits

These are deterministic software checks and a focused guideline-alignment review, not independent clinical validation or a guarantee of safety in every presentation. They do not establish payer authorization, procedural suitability, patient preferences, or completion of care. Exact prescribed therapy remains a clinician decision. In particular, a medium-dose MART transition from medium/high-dose ICS monotherapy is a pragmatic selectable strategy, not cross-product dose equivalence. Severe-asthma eligibility still requires longitudinal clinician review. The original broader regression tests remain necessary, including dosing-table and eosinophil boundaries.

Run the clinical suite with `node --test asthma/logic.test.js asthma/workflow.test.js asthma/guided.test.js asthma/scenarios.test.js`. Run `asthma/browser.test.cjs` against a local server or `ASTHMA_TEST_URL` for browser verification.

Verification result: all **205 asthma test cases** passed, including the 279-encounter expansion. The combined asthma/COPD/PERT suite passed **328 test cases**. The expanded browser runner passed navigation, prescribing, Assessment/Plan agreement, clipboard/stale safeguards, and all four viewport widths. Production was not changed by this audit.
