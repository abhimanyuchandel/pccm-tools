# COPD guided encounter revision

Clinical review date: October 14, 2026. Asset version: 20261014-2.
Delivery: preview branch `codex/copd-guided-soap`; production promotion requires clinical review.

## Architecture and documentation

- The application remains static HTML/CSS/JavaScript at /copd/. No patient persistence, prediction service, external clinical API, or backend was added.
- `input-schema.js` defines the structured questions. `workflow.js` selects applicable screens. `logic.js` is the deterministic clinical layer. `medications.js` holds product references. `notes.js` composes the SOAP note from the same findings and selected actions rendered by `app.js`.
- Missing numeric and safety-critical answers remain unknown. Positive exacerbations and urgent findings are retained when other answers are unavailable. Choosing no maintenance add-ons explicitly records no exposure; a specific known positive exposure takes precedence over a conflicting general answer.
- Unchecked routine technique, adherence, access and device barriers are treated as absent, following the approved asthma workflow. This is a pragmatic data-entry convention, not an assessment of longitudinal optimization.
- Selecting a COPD biologic requires a separate clinical eligibility/optimization/safety review. A candidate card is not a claim of FDA, trial or payer eligibility.
- Three routine documentation placeholders cover interval history, actual medications and examination. Acute encounters add history/actual-treatment placeholders. No normal examination, denial, consent, medication administration, vaccination or response is invented.
- Unselected treatment alternatives, references and rationale are not copied. Unresolved decisions use \*\*\*. Clinical edits mark output stale and disable copying until regeneration.
- Numbered plan topics consolidate related actions into concise bullets. Due pneumococcal vaccination opens a product/interval selection rather than copying competing vaccine alternatives.
- Successful generation displays a green check without moving the viewport. Plan selections update the note only when clinical findings remain current.

## Guideline rules and clinical safeguards

### Diagnosis, symptoms and exacerbations

[GOLD 2026 report and pocket guide](https://goldcopd.org/2026-gold-report-and-pocket-guide/)

- Diagnose in clinical context with post-bronchodilator obstruction below 0.70, without rounding across the threshold. Prior objective evidence supports an established diagnosis without repeating spirometry at every visit. Discordant or borderline results prompt reconciliation/repeat consideration.
- CAT/CAAT or mMRC can supply symptom burden; neither both instruments nor a new spirometry measurement is mandatory.
- Initial GOLD Group E includes at least one moderate or hospitalized exacerbation under the 2026 framework. A positive count is actionable even if the other count is unknown. Zero plus unknown cannot establish low risk.
- Airflow grade, initial group and follow-up decisions are distinct. Follow-up uses current treatment, symptoms and exacerbations. Current maintenance therapy overrides an initial-mode selection, with an assumption in Safety Checks only.
- Optional CAT item-score entry preserves item-specific anchors and links the [official questionnaire](https://www.catestonline.org/). It is a scoring aid, not a replacement validation claim. Partial entry does not overwrite a manually entered score.

### Maintenance medication pathways

- Long-acting bronchodilator treatment is individualized by symptoms and exacerbations. LABA/LAMA is offered for appropriate higher-burden initial profiles or persistent problems on monotherapy.
- Triple therapy is offered for the appropriate exacerbation/eosinophil context. Coexisting asthma requires an ICS-containing strategy.
- ICS withdrawal is not asthma-style step-down. The preview restricts an explicit withdrawal option to documented adverse effects/pneumonia with reconciled asthma, eosinophils and negative exacerbation history. This conservative decision gate is a workflow safeguard, not a universal prohibition when an expert weighs exceptional circumstances.
- Technique, adherence, access and device concerns block routine escalation until addressed. Continuing existing treatment and clarifying the history remain available.
- Add-on candidates include ensifentrine for persistent dyspnea, roflumilast for appropriate low-FEV1/chronic-bronchitis exacerbation profiles, and monitored off-label azithromycin particularly for non-current smokers with exacerbations. Duplicate exposure and unresolved selected-drug safety prevent a definitive prescription.
- COPD biologic candidates require recurrent events on triple therapy. Dupilumab's GOLD/trial profile includes eosinophils at least 300 and chronic bronchitis. Mepolizumab's GOLD/MATINEE higher-eosinophil population differs from the broader METREX phenotype. Current eosinophils at least 150 or a historical peak at least 300 can trigger a provisional mepolizumab review, not a claim that GOLD universally recommends that lower threshold.
- FDA eosinophilic-phenotype indications, study populations and payer rules are distinguished. Current biologic exposure and unassessed helminth risk block definitive new-agent selection. Agent choice is clinician-selected; no automatic switch, dual biologic, or immediate prescription from a biomarker alone.

Product presets use COPD-specific U.S. labeling:

- [Spiriva Respimat](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=7b656b14-fcaa-2741-f6f0-e0be48971c02): 2.5 mcg per actuation, two inhalations daily.
- [Striverdi](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=5d9a5433-857e-44ea-b3d6-2a400ca0cef5): two 2.5 mcg inhalations daily.
- [Anoro / umeclidinium-vilanterol](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=6de414b1-f707-4b98-9e4b-742032ec90af): 62.5/25 mcg daily.
- [Trelegy](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=b5a81d5a-4648-4c7a-951d-33c014a63c7e): 100/62.5/25 mcg daily, not the asthma-only 200 mcg fluticasone strength.
- [Breztri](https://www.azpicentral.com/breztri/breztri.pdf): two 160/9/4.8 mcg inhalations twice daily.
- [Symbicort](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=fafa4cf1-99c2-43d5-73ad-51f256de3be0): 160/4.5 mcg, two inhalations twice daily; COPD use is not SMART.
- [Ohtuvayre](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=e6433c98-41a0-4f99-8f7f-d0e9db6e3f40): 3 mg twice daily by standard jet nebulizer.
- [Daliresp](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=c9a1d0a8-581f-4f91-a2b8-f419192d0ebf): 500 mcg daily; an optional 250 mcg introductory month is not the therapeutic dose.
- [Dupixent](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=595f437d-2729-40bb-9c62-c8ece1f82780): COPD 300 mg every two weeks, without the asthma loading schedule.
- [Nucala](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=fefb887c-e4ac-431e-8893-e9d1a5a63fea): COPD 100 mg every four weeks.

### Active outpatient exacerbations

- Acute context exposes trajectory, sputum changes, observations, oxygen setting, differential assessment and actual reassessment. Recovery context uses routine risk review instead.
- Known severe distress, altered mentation, rapid deterioration, marked hypoxemia, major vital-sign abnormalities or hypercapnic acidosis override routine prescriptions. The conservative urgent thresholds are triage safeguards, not a validated discharge rule.
- Marked resting hypoxemia entered in the routine section also triggers urgent assessment (SpO2 at most 85% or confirmed arterial PaO2 at most 40 mmHg). These conservative workflow alerts do not replace evaluation of a concerning value above those boundaries.
- Rome moderate-severity features are counted separately. Incomplete data never classify an episode as mild or establish outpatient safety.
- Outpatient prescription choices require the key observations, explicit clinician judgment and support/access review. Even a complete screen does not assert safe discharge or improvement.
- Prednisone 40 mg for five days is an option after oral-steroid exposure review; chronic OCS requires individualized dosing. Short-acting bronchodilator and antibiotic decisions are separate.
- Purulence plus increased dyspnea or sputum volume opens antibiotic treatment review. Allergy, pregnancy, renal function, interactions, bronchiectasis and resistance context must be reviewed before a default prescription. A separate suspected infection uses diagnostic/culture-directed management.
- Doxycycline 100 mg twice daily or amoxicillin/clavulanate 875/125 mg twice daily for five days are pragmatic U.S. outpatient presets, not universal GOLD-mandated agents. See [Nebraska Medicine antimicrobial guidance](https://www.unmc.edu/intmed/_documents/id/asp/clinicpath-copd_pathway2018_update.pdf). Local susceptibility and patient factors take precedence.
- Albuterol MDI dosing follows [U.S. labeling](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=2e449282-ee58-4e36-b983-85c4e6f0864d). Initial monitored treatment may need a different frequency and is not implemented as an emergency-department protocol.
- An early outpatient reassessment in 24-72 hours is a pragmatic follow-up interval, not a validated clearance endpoint. Post-exacerbation review within 1-4 weeks and again by three months follows recovery care principles.

### Tobacco cessation

[ATS tobacco guideline](https://pmc.ncbi.nlm.nih.gov/articles/PMC7365361/) and [WHO guideline](https://www.who.int/publications/i/item/9789240096431)

- Current cigarette smoking opens readiness, dependence and medication-specific review. Varenicline, combination NRT, bupropion or behavioral support are clinician-selected. Stable psychiatric illness is not an automatic exclusion.
- Varenicline uses [label-specific titration and renal limits](https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=2f86bb7b-c6a6-4915-8ba1-17251540971c).
- Patch/short-acting NRT is tailored to cigarette consumption and time to first cigarette. [CDC lozenge guidance](https://www.cdc.gov/tobacco/campaign/tips/quit-smoking/quit-smoking-medications/how-to-use-quit-smoking-medicines/how-to-use-the-nicotine-lozenge.html) and [gum guidance](https://www.cdc.gov/tobacco/campaign/tips/quit-smoking/quit-smoking-medications/how-to-use-quit-smoking-medicines/how-to-use-nicotine-gum.html) provide technique and limits.
- Bupropion follows [smoking-cessation labeling](https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=8069c521-c49a-4b6d-baa8-4b0be897d585); unresolved contraindications or organ impairment prevent a default prescription.
- Behavioral support and follow-up are recommended actions, not claims that counseling occurred.

### Prevention and supportive care

- [AAT deficiency guidance](https://journal.copdfoundation.org/jcopdf/id/1115/The-Diagnosis-and-Management-of-Alpha-1-Antitrypsin-Deficiency-in-the-Adult): one-time assessment for all COPD patients, with appropriate genotype/level/confirmation. Known deficiency prompts family/liver/specialist review, not automatic augmentation.
- [NCCN screening policy](https://www.nccn.org/guidelines/guidelines-detail?category=2&id=1441): preserve the site's age at least 50 and at least 20 pack-year rule, without a quit-year cutoff or upper-age cutoff. Confirm asymptomatic context, curative-treatment benefit and preferences. Diagnostic imaging and cancer/nodule surveillance are separate. Coverage can differ. The displayed reference footnote is not copied into the SOAP note.
- [CDC adult schedule](https://www.cdc.gov/vaccines/hcp/imz-schedules/adult-notes.html), [pneumococcal](https://www.cdc.gov/pneumococcal/hcp/vaccine-recommendations/index.html), [RSV](https://www.cdc.gov/rsv/hcp/vaccine-clinical-guidance/adults.html), [Shingrix](https://www.cdc.gov/shingles/hcp/vaccine-considerations/index.html), and [COVID-19 guidance](https://www.cdc.gov/covid/hcp/vaccine-considerations/routine-guidance.html): unknown records call for reconciliation; due status prompts an age/risk-appropriate recommendation, never assumed administration.
- [ATS rehabilitation](https://pmc.ncbi.nlm.nih.gov/articles/PMC10449064/): stable/post-hospitalization referral and appropriate remote programs are supported. Patient preference and access remain explicit.
- [ATS oxygen](https://pmc.ncbi.nlm.nih.gov/articles/PMC7667898/): distinguish stable resting, exertional and acute needs. LTOT evaluation requires known conditions; no flow prescription is inferred. Moderate desaturation alone does not establish benefit.
- [ATS NIV](https://pmc.ncbi.nlm.nih.gov/articles/PMC7427384/): stable arterial hypercapnia, OSA assessment and post-acute timing are explicit. Do not substitute venous PCO2 or automatically initiate chronic NIV during acute illness.
- Positive concern prompts address bronchiectasis, nutrition, cardiovascular contributors, mood, bone health and supportive care without diagnosing these conditions automatically.

### Advanced-care assessment

[GOLD](https://goldcopd.org/2026-gold-report-and-pocket-guide/), [FDA valve labeling](https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpma/pma.cfm?id=P180002), and [ISHLT consensus](https://pmc.ncbi.nlm.nih.gov/articles/PMC8979471/)

- A broad screening trigger invites optional workup; it is not procedural eligibility. BODE is calculated only with all four valid components.
- Valve and surgical assessments have separate selections. Collateral ventilation limits valves, not all surgery. The NETT high-risk surgical profile is not a universal valve exclusion.
- Transplant prompts identify opportunities for discussion/referral. BODE, obstruction, progression, gas exchange and pulmonary hypertension are contextual signals, not listing criteria implemented as an automatic rule. Center-specific risk, nicotine exposure, goals, frailty and comorbidities remain necessary.
- Volume reduction and transplant evaluation can proceed in parallel. Deferral is supported.

## Verification

- Pure-rule tests: unknowns, revised answers, diagnosis, GOLD grouping, symptom instruments, medication compatibility, prerequisites, selection invalidation, product doses, prevention, advanced care, acute boundaries and SOAP facts.
- Browser checks: synthetic routine and acute encounters, no auto-advance, review/edit, CAT/mMRC automatic totals, clipboard, stale output, generation check/viewport, keyboard access, page-memory-only data and widths 320/390/768/1280.
- Run `node --test asthma/logic.test.js asthma/workflow.test.js copd/logic.test.js PERT-Team-Support/logic.test.js`.
- Run the development-only `copd/browser.test.cjs` against a local server or the preview using Playwright.
