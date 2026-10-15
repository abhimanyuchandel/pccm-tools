# Detailed COPD Clinical Scenario Audit

Review date: October 15, 2026. Preview branch: `codex/copd-clinical-scenario-audit`.

## Scope and Method

The additional suite generates **946 synthetic SOAP notes** from named encounters and crossed input/selection combinations. No actual patient records are used. Assertions test clinical expectations and note consistency, not just absence of JavaScript errors.

| Coverage | Generated Notes |
| --- | ---: |
| 61 named clinical scenarios, including focused answer/selection variants | 78 |
| Controller class, eosinophil boundaries, events and asthma coexistence | 200 |
| Biologic phenotype, events, historical counts and prescribing prerequisites | 480 |
| Every curated U.S. controller prescription | 17 |
| Urgent findings across routine, active and recovery contexts | 36 |
| Resting oxygen thresholds and measurement conditions | 54 |
| Screening age, exposure, curative benefit and imaging context | 81 |
| **Total** | **946** |

Separate checks cover zero/invalid spirometry, retained urgency despite invalid inputs and conditional workflow visibility. Every valid generated note must contain all four SOAP sections, retain every shared selected action, resolve medication references, avoid invalid numeric strings, and not invent normal examination, vaccine administration, completed counseling or consent.

## Clinically Important Corrections

1. Exacerbations on single-agent LABA or LAMA treatment now expose the appropriate high-eosinophil triple-therapy option. ICS/LABA exacerbations use the distinct 100-cell decision boundary rather than offering triple therapy indiscriminately.
2. Persistent dyspnea on ICS/LABA asks about prior ICS benefit. An unknown response does not mean no benefit. Historically high or missing eosinophils require reconciliation before an automated non-ICS change.
3. Unknown existing treatment no longer permits a new overlapping prescription. Routine ipratropium cannot be copied unchanged with a current or proposed LAMA; short-course monitored acute treatment remains a separate pathway.
4. The standard amoxicillin/clavulanate 875/125 mg preset requires renal suitability. A general safety confirmation cannot override known severe impairment/dialysis. Individualized antibiotic planning remains available.
5. Zero spirometry is not accepted as diagnostic evidence or severe airflow obstruction. Nonobstructive current spirometry does not receive an obstruction grade from FEV1 alone; an established diagnosis is retained for reconciliation.
6. BODE/gas-exchange review signals are no longer hidden by the broader advanced-care screen. Referral prompts do not establish transplant listing or procedure eligibility, and patient deferral remains effective.
7. Urgent observations remain in copied documentation even if encounter context changes. New maintenance add-ons receive early reassessment rather than a routine long follow-up interval.
8. Narrow-screen testing exposed an existing overflow with long triple-inhaler ingredient names. Prescription cards now shrink and wrap without widening the page.

## Preserved Safeguards

- Unknown exacerbation counts and symptoms are not negative findings. A positive admission remains actionable when another count is unknown. Symptom burden, airflow obstruction and initial GOLD group remain separate concepts.
- Asthma coexistence protects necessary ICS. ICS withdrawal is not routine asthma-style step-down. Device/technique/access concerns prevent routine escalation; current and planned prescriptions remain distinct.
- COPD biologics retain COPD-specific dosing, separate clinical eligibility review, drug-specific precautions and no automatic dual-agent initiation. Candidate matching is not proof of full trial inclusion, FDA/payer qualification or authorization. The broader mepolizumab phenotype review is not presented as a universal GOLD numeric rule.
- Roflumilast, maintenance azithromycin and ensifentrine have independent safety gates. Tobacco treatment remains clinician-selected and uses dependence/renal prerequisites. Stable psychiatric illness is not automatically excluded.
- AAT deficiency does not automatically generate augmentation therapy. Screening is separate from symptomatic diagnostic imaging and nodule/cancer surveillance. Unknown vaccine records do not imply missing doses or completed vaccination.
- Stable resting, exertional and acute oxygen assessment remain distinct. No flow prescription is guessed. Stable arterial hypercapnia, post-acute timing and OSA review remain necessary for home NIV assessment.
- Incomplete acute assessment cannot establish outpatient safety, response or discharge readiness. Known urgent findings override routine prescriptions. Chronic OCS exposure blocks a duplicate standard burst.

## Sources and Judgment Boundaries

- [GOLD 2026](https://goldcopd.org/2026-gold-report-and-pocket-guide/), including the official full report's follow-up treatment section and Figures 3.9/3.12. Guide text and diagrams were checked; no source PDF or guideline image is deployed.
- U.S. prescribing information: [Stiolto](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=01e15aee-40e0-23f3-537f-c96dd63e2cb1), [amoxicillin/clavulanate](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=7ef8592d-c7d0-49a4-a559-3190e559fa2f), [Daliresp](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=c9a1d0a8-581f-4f91-a2b8-f419192d0ebf), [Dupixent](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=595f437d-2729-40bb-9c62-c8ece1f82780) and [Nucala](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=fefb887c-e4ac-431e-8893-e9d1a5a63fea). Existing product-specific sources remain in `medications.js`.
- [ATS oxygen guidance](https://pmc.ncbi.nlm.nih.gov/articles/PMC7667898/), [ATS NIV guidance](https://pmc.ncbi.nlm.nih.gov/articles/PMC7427384/) and [ISHLT consensus](https://www.ishlt.org/education-and-publications/standards-guidelines-detail/consensus-document-for-the-selection-of-lung-transplant-candidates-an-update-from-ishlt). BODE and gas exchange are review signals, not complete candidacy criteria.
- The existing CDC vaccine, AAT testing, rehabilitation and NCCN screening policies were regression-tested. The site's NCCN age/exposure policy is preserved; these tests are not an independent verification of every proprietary NCCN recommendation or insurance rule.

Conservative reconciliation gates and the 4-6-week review after new add-ons are pragmatic workflow choices. Rare presentations, treatment contraindications not encoded in the form, alternative diagnoses, treatment preferences and full procedure/transplant candidacy require clinician judgment. This audit is not independent clinical validation or proof of safety for every possible presentation.

Verification passed: 182 COPD test cases, 336 combined COPD/asthma/PERT regression tests, and the local browser suite. The scenario suite generated and checked all 946 synthetic SOAP notes.

Run `node --test copd/logic.test.js copd/scenarios.test.js` and the browser runner `copd/browser.test.cjs`. Browser verification includes the corrected clinical branches, answer changes, note/clipboard agreement, stale-output safeguards, regeneration without viewport movement, keyboard access and 320/390/768/1280 px layouts. Production promotion requires subsequent clinical review.
