function getNumberValue(id) {
  const raw = document.getElementById(id).value.trim();
  if (raw === "") {
    return null;
  }

  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function getCheckboxValue(id) {
  return document.getElementById(id).checked;
}

function getSelectValue(id) {
  return document.getElementById(id).value;
}

function normalizeFev1FvcValue(value) {
  if (!Number.isFinite(value)) {
    return { value: null, convertedFromPercent: false };
  }

  if (value >= 30 && value <= 90) {
    return { value: value / 100, convertedFromPercent: true };
  }

  return { value, convertedFromPercent: false };
}

function getNormalizedFev1FvcFromDom() {
  const ratioInput = document.getElementById("fev1fvc");
  const raw = ratioInput.value.trim();

  if (raw === "") {
    return null;
  }

  const parsed = Number(raw);
  const normalized = normalizeFev1FvcValue(parsed);

  if (normalized.value === null) {
    return null;
  }

  if (normalized.convertedFromPercent) {
    ratioInput.value = normalized.value.toFixed(2);
  }

  return normalized.value;
}

function getInputState() {
  const normalizedFev1Fvc = getNormalizedFev1FvcFromDom();

  return {
    managementPhase: getSelectValue("management-phase"),
    age: getNumberValue("age"),
    spirometryConfirmed: getCheckboxValue("spirometry-confirmed"),
    fev1fvc: normalizedFev1Fvc,
    fev1Predicted: getNumberValue("fev1-predicted"),
    restingSpo2: getNumberValue("resting-spo2"),
    catScore: getNumberValue("cat-score"),
    mmrcScore: getNumberValue("mmrc-score"),
    moderateExac: getNumberValue("moderate-exac") === null ? 0 : getNumberValue("moderate-exac"),
    severeExac: getNumberValue("severe-exac") === null ? 0 : getNumberValue("severe-exac"),
    eosinophils: getNumberValue("eosinophils"),
    smokingStatus: getSelectValue("smoking-status"),
    packYears: getNumberValue("pack-years"),
    cigarettesPerDay: getNumberValue("cigarettes-per-day"),
    firstCigarette30: getCheckboxValue("first-cigarette-30"),
    chronicBronchitis: getCheckboxValue("chronic-bronchitis"),
    concomitantAsthma: getCheckboxValue("concomitant-asthma"),
    aatdStatus: getSelectValue("aatd-status"),
    pneumococcalStatus: getSelectValue("pneumococcal-status"),
    rsvStatus: getSelectValue("rsv-status"),
    zosterStatus: getSelectValue("zoster-status"),
    tdapStatus: getSelectValue("tdap-status"),
    currentRegimen: getSelectValue("current-regimen"),
    persistentDyspnea: getCheckboxValue("persistent-dyspnea"),
    icsSideEffects: getCheckboxValue("ics-side-effects")
  };
}

function getCatCalculatorState() {
  const inputs = Array.from(document.querySelectorAll("[data-cat-item]"));
  const values = inputs.map((input) => {
    if (input.value === "") {
      return null;
    }

    const score = Number(input.value);
    return Number.isFinite(score) ? score : null;
  });

  const answered = values.filter((value) => value !== null).length;
  const complete = answered === values.length && values.length > 0;
  const total = values.reduce((sum, value) => sum + (value === null ? 0 : value), 0);

  return { answered, complete, total, itemCount: values.length, inputs };
}

function updateCatCalculatorDisplay() {
  const state = getCatCalculatorState();
  const display = document.getElementById("cat-total-display");
  const note = document.getElementById("cat-calc-note");

  display.textContent = `CAT total: ${state.total}/40`;
  if (state.complete) {
    note.textContent = "CAT questionnaire complete. Click Apply CAT Total to copy this value.";
  } else {
    note.textContent = `CAT questionnaire incomplete (${state.answered}/${state.itemCount} items answered).`;
  }
}

function applyCatScore() {
  const state = getCatCalculatorState();
  const note = document.getElementById("cat-calc-note");

  if (!state.complete) {
    note.textContent = "Complete all 8 CAT items before applying the total.";
    return;
  }

  document.getElementById("cat-score").value = String(state.total);
  note.textContent = `Applied CAT score ${state.total} to symptom input.`;
}

function clearCatCalculator() {
  const state = getCatCalculatorState();
  state.inputs.forEach((input) => {
    input.value = "";
  });
  document.getElementById("cat-score").value = "";
  updateCatCalculatorDisplay();
}

function getSelectedMmrc() {
  const selected = document.querySelector('input[name="mmrc-choice"]:checked');
  if (!selected) {
    return null;
  }

  const score = Number(selected.value);
  return Number.isFinite(score) ? score : null;
}

function updateMmrcDisplay() {
  const selected = getSelectedMmrc();
  const display = document.getElementById("mmrc-display");
  const note = document.getElementById("mmrc-note");

  if (selected === null) {
    display.textContent = "mMRC selected: --/4";
    note.textContent = "Select one mMRC statement, then click Apply mMRC Score.";
    return;
  }

  display.textContent = `mMRC selected: ${selected}/4`;
  note.textContent = "mMRC statement selected. Click Apply mMRC Score to copy this value.";
}

function applyMmrcScore() {
  const selected = getSelectedMmrc();
  const note = document.getElementById("mmrc-note");

  if (selected === null) {
    note.textContent = "Select one mMRC statement before applying.";
    return;
  }

  document.getElementById("mmrc-score").value = String(selected);
  note.textContent = `Applied mMRC score ${selected} to symptom input.`;
}

function clearMmrcCalculator() {
  document.querySelectorAll('input[name="mmrc-choice"]').forEach((input) => {
    input.checked = false;
  });
  document.getElementById("mmrc-score").value = "";
  updateMmrcDisplay();
}

function initSymptomCalculators() {
  document.querySelectorAll("[data-cat-item]").forEach((input) => {
    input.addEventListener("change", updateCatCalculatorDisplay);
  });
  document.getElementById("calc-cat-btn").addEventListener("click", applyCatScore);
  document.getElementById("clear-cat-btn").addEventListener("click", clearCatCalculator);

  document.querySelectorAll('input[name="mmrc-choice"]').forEach((input) => {
    input.addEventListener("change", updateMmrcDisplay);
  });
  document.getElementById("apply-mmrc-btn").addEventListener("click", applyMmrcScore);
  document.getElementById("clear-mmrc-btn").addEventListener("click", clearMmrcCalculator);

  updateCatCalculatorDisplay();
  updateMmrcDisplay();
}

function syncSpirometryConfirmationFromRatio() {
  const confirmationInput = document.getElementById("spirometry-confirmed");
  const normalizedValue = getNormalizedFev1FvcFromDom();

  if (normalizedValue === null) {
    return;
  }

  confirmationInput.checked = normalizedValue < 0.7;
}

function initSpirometryHelpers() {
  const ratioInput = document.getElementById("fev1fvc");
  ["input", "change", "blur"].forEach((eventName) => {
    ratioInput.addEventListener(eventName, syncSpirometryConfirmationFromRatio);
  });
  syncSpirometryConfirmationFromRatio();
}

function getCatImpact(score) {
  if (score === null) {
    return null;
  }
  if (score <= 9) {
    return "low impact";
  }
  if (score <= 20) {
    return "medium impact";
  }
  if (score <= 30) {
    return "high impact";
  }
  return "very high impact";
}

function classifySymptoms(data) {
  const hasCat = data.catScore !== null;
  const hasMmrc = data.mmrcScore !== null;
  const highByCat = hasCat && data.catScore >= 10;
  const highByMmrc = hasMmrc && data.mmrcScore >= 2;

  if (!hasCat && !hasMmrc) {
    return {
      high: null,
      summary: "Symptom burden cannot be fully classified because CAT/CAAT and mMRC are both missing.",
      noteLine: "Symptom scoring is incomplete because both CAT/CAAT and mMRC are missing."
    };
  }

  const catText = hasCat
    ? `CAT ${data.catScore}/40 (${getCatImpact(data.catScore)}; higher CAT scores correlate with worse symptom burden).`
    : "CAT/CAAT not entered.";
  const mmrcText = hasMmrc
    ? `mMRC ${data.mmrcScore}/4.`
    : "mMRC not entered.";
  const high = highByCat || highByMmrc;

  return {
    high,
    summary: `${catText} ${mmrcText} ${high ? "Overall symptom burden is higher." : "Overall symptom burden is lower based on available scores."}`,
    noteLine: `${catText} ${mmrcText}`
  };
}

function classifyExacerbationRisk(data) {
  const totalModerateOrSevere = data.moderateExac + data.severeExac;
  const high = totalModerateOrSevere >= 1 || data.severeExac >= 1;

  return {
    high,
    summary: high
      ? "Exacerbation-priority profile: at least one moderate or severe exacerbation in the previous year."
      : "No recorded moderate or severe exacerbation in the previous year.",
    noteLine: `${data.moderateExac} moderate and ${data.severeExac} severe exacerbations in the previous 12 months.`
  };
}

function assignGoldGroup(symptoms, exacRisk) {
  if (exacRisk.high) {
    return "E";
  }
  if (symptoms.high === null) {
    return "A/B (symptom score required to distinguish)";
  }
  return symptoms.high ? "B" : "A";
}

function getPhaseLabel(phase) {
  return phase === "followup"
    ? "Follow-up pharmacologic management"
    : "Initial pharmacologic management";
}

function getRegimenLabel(regimen) {
  const labels = {
    naive: "No maintenance inhaler (treatment-naive)",
    mono: "Single long-acting bronchodilator",
    "laba-lama": "LABA + LAMA",
    triple: "LABA + LAMA + ICS",
    other: "Other / unclear regimen"
  };

  return labels[regimen] || "Unknown regimen";
}

function getRoflumilastDetail() {
  return "Roflumilast dosing: 250 mcg by mouth once daily for the first 4 weeks, then 500 mcg by mouth once daily maintenance. It is an add-on anti-inflammatory, not a rescue bronchodilator. Avoid in moderate-to-severe hepatic impairment; monitor for weight loss, insomnia, anxiety, depression, and suicidality.";
}

function getAzithromycinDetail() {
  return "Azithromycin prophylaxis in GOLD evidence: 250 mg by mouth daily or 500 mg by mouth three times weekly for 1 year in exacerbation-prone patients. Check baseline QT risk, interacting drugs, hearing impairment, and antimicrobial-resistance concerns. GOLD notes less benefit in active smokers.";
}

function getEnsifentrineDetail() {
  return "Ensifentrine dosing: 3 mg (one unit-dose ampule) by nebulization twice daily using a standard jet nebulizer with mouthpiece. Empty the full ampule into the nebulizer cup; do not mix with other nebulized medicines. It is maintenance therapy, not rescue therapy. Avoid if prior serious hypersensitivity to ensifentrine or excipients.";
}

function getDupilumabDetail() {
  return "Dupilumab dosing for COPD: 300 mg subcutaneously every 2 weeks as add-on maintenance therapy. Administer by prefilled pen or syringe into thigh, abdomen, or upper arm; rotate sites. It is not for acute bronchospasm. Avoid in patients with prior serious hypersensitivity; review helminth infection status and avoid live vaccines during therapy.";
}

function getMepolizumabDetail() {
  return "Mepolizumab dosing for COPD: 100 mg subcutaneously once every 4 weeks as add-on maintenance therapy. It may be given by autoinjector, prefilled syringe, or reconstituted vial. It is not for acute bronchospasm. Avoid in patients with prior serious hypersensitivity; consider herpes zoster vaccination before treatment when appropriate.";
}

function getAzithromycinRoflumilastInteractionDetail() {
  return "If azithromycin and roflumilast are used together, review the full medication list carefully. Macrolides as a class can affect CYP-mediated metabolism and may increase roflumilast systemic exposure; monitor tolerability and adverse effects.";
}

function getSmokingCessationDetails(data) {
  const details = [];

  details.push("Smoking cessation works best with combined counseling plus pharmacotherapy. Refer to a structured cessation program and offer quit-line support.");
  details.push("Varenicline: start 1 week before quit date. 0.5 mg by mouth once daily on days 1-3, 0.5 mg by mouth twice daily on days 4-7, then 1 mg by mouth twice daily for 12 weeks. Key cautions: serious hypersensitivity or severe skin reaction history, renal dose adjustment, possible nausea, sleep disturbance, neuropsychiatric symptoms, and seizure risk.");
  details.push("Bupropion SR: 150 mg by mouth once daily for 3 days, then 150 mg by mouth twice daily, starting before the quit date. Key contraindications: seizure disorder, current or prior bulimia/anorexia nervosa, abrupt alcohol/benzodiazepine/barbiturate withdrawal, monoamine oxidase inhibitor use, or another bupropion product.");

  if (data.cigarettesPerDay !== null) {
    if (data.cigarettesPerDay > 10) {
      details.push("Nicotine patch: 21 mg/24 hour transdermal daily for 6 weeks, then 14 mg daily for 2 weeks, then 7 mg daily for 2 weeks. Do not smoke while wearing the patch. Use caution after a recent myocardial infarction or stroke.");
    } else {
      details.push("Nicotine patch: 14 mg/24 hour transdermal daily for 6 weeks, then 7 mg daily for 2 weeks. Do not smoke while wearing the patch. Use caution after a recent myocardial infarction or stroke.");
    }
  } else {
    details.push("Nicotine patch dosing depends on baseline cigarette consumption; use caution after a recent myocardial infarction or stroke.");
  }

  if (data.firstCigarette30) {
    details.push("Nicotine gum or lozenge: use the 4 mg strength if the first cigarette is within 30 minutes of waking. Gum: 1 piece every 1-2 hours for weeks 1-6, at least 9 pieces/day, maximum 24/day. Lozenge: 1 lozenge every 1-2 hours for weeks 1-6, maximum 20/day.");
  } else {
    details.push("Nicotine gum or lozenge: use the 2 mg strength if the first cigarette is more than 30 minutes after waking. Gum: 1 piece every 1-2 hours for weeks 1-6, at least 9 pieces/day, maximum 24/day. Lozenge: 1 lozenge every 1-2 hours for weeks 1-6, maximum 20/day.");
  }

  return details;
}

function isRoflumilastCandidate(data) {
  return (
    data.fev1Predicted !== null &&
    data.fev1Predicted < 50 &&
    data.chronicBronchitis &&
    data.severeExac >= 1
  );
}

function isLungCancerScreenEligible(data) {
  return (
    data.age !== null &&
    data.age >= 50 &&
    data.age <= 80 &&
    (data.smokingStatus === "current" || data.smokingStatus === "former") &&
    data.packYears !== null &&
    data.packYears >= 20
  );
}

function hasAdvancedCopdFeatures(data) {
  const severeAirflowObstruction = data.fev1Predicted !== null && data.fev1Predicted < 50;
  const severeSymptomBurden =
    (data.catScore !== null && data.catScore >= 20) ||
    (data.mmrcScore !== null && data.mmrcScore >= 3);
  const severeEventHistory = data.severeExac >= 1;
  const hypoxemiaSignal = data.restingSpo2 !== null && data.restingSpo2 <= 92;

  return severeAirflowObstruction || (severeSymptomBurden && severeEventHistory) || hypoxemiaSignal;
}

function buildInitialRecommendations(group, data) {
  const plan = [];
  const rationale = [];
  const medicationDetails = [];

  if (group === "A") {
    plan.push("Start a bronchodilator for breathlessness. A long-acting bronchodilator is preferred when available and affordable unless symptoms are very occasional.");
    plan.push("Continue the bronchodilator only if clinical benefit is documented.");
  }

  if (group === "B") {
    plan.push("Initiate LABA + LAMA combination therapy as the preferred initial pharmacologic treatment.");
    plan.push("If LABA + LAMA is not feasible, choose either a LABA or a LAMA based on symptom response, cost, and tolerability.");
  }

  if (group === "E") {
    plan.push("Preferred initial treatment is LABA + LAMA because the patient is in GOLD Group E.");
    if (data.eosinophils !== null && data.eosinophils >= 300) {
      plan.push("Because eosinophils are at least 300 cells/uL, consider initial LABA + LAMA + ICS.");
    }
    plan.push("Avoid LABA + ICS alone when COPD is the only diagnosis. If an ICS is indicated, prefer triple therapy.");
  }

  if (group === "A/B (symptom score required to distinguish)") {
    plan.push("Complete CAT/CAAT or mMRC scoring to distinguish Group A from Group B before finalizing initial inhaled therapy.");
  }

  if (data.concomitantAsthma) {
    plan.push("Because concomitant asthma is suspected or confirmed, use an ICS-containing maintenance regimen and follow asthma-focused treatment principles. Avoid LABA without ICS.");
    if (group === "B" || group === "E") {
      plan.push("Because this patient otherwise meets a higher-intensity COPD pathway, consider LABA + LAMA + ICS so the regimen remains ICS-containing.");
    }
    rationale.push("Asthma overlap changes the initial pathway because GOLD states COPD with concomitant asthma should be treated like asthma and requires ICS.");
  }

  plan.push("Ensure a rescue short-acting bronchodilator is available for immediate symptom relief.");
  rationale.push("Initial treatment path follows GOLD 2026 Figure 3.8 for treatment-naive COPD.");

  return { plan, rationale, medicationDetails };
}

function buildFollowUpRecommendations(data) {
  const plan = [];
  const rationale = [];
  const medicationDetails = [];
  const hasExacerbation = data.moderateExac + data.severeExac >= 1;

  if (data.currentRegimen === "naive") {
    plan.push("Follow-up management was selected, but no maintenance regimen is documented. Use the initial pharmacologic pathway first, then reassess response.");
    if (data.concomitantAsthma) {
      plan.push("Because concomitant asthma is suspected or confirmed, the next maintenance regimen should include ICS rather than bronchodilator monotherapy alone.");
    }
    rationale.push("Follow-up algorithms in GOLD 2026 are intended for patients already receiving maintenance treatment.");
    return { plan, rationale, medicationDetails };
  }

  if (hasExacerbation) {
    rationale.push("Exacerbation pathway selected because GOLD prioritizes exacerbation prevention when both dyspnea and exacerbations are present.");

    if (data.currentRegimen === "mono") {
      plan.push("Escalate from bronchodilator monotherapy to LABA + LAMA because exacerbations occurred on monotherapy.");
    } else if (data.currentRegimen === "laba-lama") {
      if (data.eosinophils !== null && data.eosinophils >= 100) {
        plan.push("Escalate from LABA + LAMA to LABA + LAMA + ICS because exacerbations occurred and eosinophils are at least 100 cells/uL.");
      } else {
        plan.push("Because exacerbations occurred on LABA + LAMA and eosinophils are below 100 cells/uL or unavailable, consider non-ICS add-on strategies.");
        if (data.eosinophils === null) {
          plan.push("Obtain a blood eosinophil count soon because it helps guide ICS benefit.");
        }
        if (data.smokingStatus !== "current") {
          plan.push("Consider chronic azithromycin as an add-on because the patient is not currently smoking.");
          medicationDetails.push(getAzithromycinDetail());
        }
        if (isRoflumilastCandidate(data)) {
          plan.push("Consider roflumilast because FEV1 is below 50%, chronic bronchitis is present, and there is a history of severe exacerbation or hospitalization.");
          medicationDetails.push(getRoflumilastDetail());
        }
      }
    } else if (data.currentRegimen === "triple") {
      if (data.eosinophils !== null && data.eosinophils >= 300) {
        if (data.chronicBronchitis) {
          plan.push("Consider dupilumab as add-on biologic therapy because eosinophils are at least 300 cells/uL and chronic bronchitis is present.");
          medicationDetails.push(getDupilumabDetail());
        }
        plan.push("Consider mepolizumab as add-on biologic therapy because eosinophils are at least 300 cells/uL.");
        medicationDetails.push(getMepolizumabDetail());
      }
      if (data.smokingStatus !== "current") {
        plan.push("Consider chronic azithromycin because exacerbations persist and the patient is not currently smoking.");
        medicationDetails.push(getAzithromycinDetail());
      }
      if (isRoflumilastCandidate(data)) {
        plan.push("Consider roflumilast because FEV1 is below 50%, chronic bronchitis is present, and there is a history of severe exacerbation.");
        medicationDetails.push(getRoflumilastDetail());
      }
      if (data.icsSideEffects) {
        if (data.eosinophils !== null && data.eosinophils >= 300) {
          plan.push("Use caution with ICS withdrawal because eosinophils are at least 300 cells/uL and de-escalation may increase exacerbation risk.");
        } else {
          plan.push("If ICS was ineffective, inappropriate, or harmful, ICS de-escalation may be considered with close follow-up.");
        }
      }
    } else {
      plan.push("Clarify the current maintenance regimen and align it to a standard pathway before adjusting therapy.");
    }
  } else if (data.persistentDyspnea) {
    rationale.push("Dyspnea pathway selected because persistent breathlessness is the main follow-up issue.");

    if (data.currentRegimen === "mono") {
      plan.push("Escalate from bronchodilator monotherapy to LABA + LAMA for persistent dyspnea or exercise limitation.");
    } else if (data.currentRegimen === "laba-lama") {
      plan.push("If dyspnea persists on LABA + LAMA, consider switching inhaler device or bronchodilator molecules, and escalate non-pharmacologic therapy such as pulmonary rehabilitation.");
      plan.push("Consider ensifentrine if it is available.");
      medicationDetails.push(getEnsifentrineDetail());
    } else if (data.currentRegimen === "triple") {
      plan.push("Persistent dyspnea on triple therapy should prompt reassessment of inhaler technique, device choice, comorbid contributors, and rehabilitation needs.");
      plan.push("Consider ensifentrine if symptoms remain limiting despite optimized inhaler use and rehabilitation.");
      medicationDetails.push(getEnsifentrineDetail());
    } else {
      plan.push("Clarify the current maintenance regimen and optimize bronchodilation before escalating further.");
    }

    plan.push("Investigate non-COPD causes of dyspnea, including cardiac disease, deconditioning, anemia, anxiety, or other comorbidity.");
  } else {
    plan.push("No active dyspnea or exacerbation trigger was entered for follow-up escalation, so maintain current therapy if it is effective and well tolerated.");
    rationale.push("Follow-up reassessment did not identify a dominant dyspnea or exacerbation target.");
  }

  // GOLD states COPD with concomitant asthma should be treated like asthma, so ICS should not be omitted.
  if (data.concomitantAsthma) {
    rationale.push("Asthma overlap changes the follow-up pathway because GOLD states COPD with concomitant asthma should be treated like asthma and requires ICS.");

    if (data.currentRegimen === "mono") {
      plan.push("Current maintenance therapy may not include ICS. Because concomitant asthma is present, transition to an ICS-containing regimen rather than bronchodilator monotherapy alone.");
    } else if (data.currentRegimen === "laba-lama") {
      plan.push("Current LABA + LAMA regimen lacks ICS. Because concomitant asthma is present, step up to LABA + LAMA + ICS unless ICS is contraindicated or the asthma diagnosis is revised.");
    } else if (data.currentRegimen === "triple") {
      plan.push("Maintain the ICS-containing component because concomitant asthma is present; only consider ICS withdrawal after careful reassessment if harms clearly outweigh benefit.");
    } else {
      plan.push("Clarify the current maintenance regimen and ensure it includes ICS because concomitant asthma is present.");
    }
  }

  plan.push("At every follow-up visit, review adherence, inhaler technique, device fit, and comorbid contributors before escalating treatment.");
  plan.push("Ensure a rescue short-acting bronchodilator is available for immediate symptom relief.");

  return { plan, rationale, medicationDetails };
}

function buildPreventiveCare(data) {
  const prevention = [];

  if (data.aatdStatus === "unknown" || data.aatdStatus === "not-done") {
    prevention.push("Screen once for alpha-1 antitrypsin deficiency because GOLD recommends AATD testing in all patients with COPD.");
  } else if (data.aatdStatus === "known-aatd") {
    prevention.push("Known alpha-1 antitrypsin deficiency: confirm specialist follow-up and consider family screening.");
  }

  if (isLungCancerScreenEligible(data)) {
    prevention.push("Meets American Cancer Society lung cancer screening criteria: recommend annual low-dose thoracic CT.");
  }

  if (data.pneumococcalStatus === "unknown" || data.pneumococcalStatus === "unvaccinated") {
    prevention.push("Recommend one dose of PCV20 or PCV21 now because COPD is a qualifying chronic lung disease and vaccination status is unknown or incomplete.");
  }

  if (data.age !== null && data.age >= 50 && data.rsvStatus !== "complete") {
    prevention.push("Recommend RSV vaccination because the patient is age 50 or older and has chronic lung disease.");
  }

  if (data.age !== null && data.age >= 50 && data.zosterStatus !== "complete") {
    prevention.push("Recommend recombinant zoster vaccine (Shingrix) as a 2-dose intramuscular series, with the second dose 2 to 6 months after the first.");
  }

  if (data.tdapStatus === "unknown" || data.tdapStatus === "not-up-to-date") {
    prevention.push("Recommend tetanus booster vaccination now because no tetanus-containing vaccine is documented within the last 10 years.");
  }

  prevention.push("Keep influenza and COVID-19 vaccination current according to local recommendations.");

  if (data.restingSpo2 !== null && data.restingSpo2 <= 92) {
    prevention.push("Resting SpO2 is 92% or lower, so check ABG and formally assess for oxygen need.");
  }

  if (hasAdvancedCopdFeatures(data)) {
    prevention.push("Severe or advanced COPD features are present. Consider assessment for LTOT eligibility, home NIV candidacy if hypercapnic, lung volume reduction or LVRS referral in the right phenotype, and supportive or palliative care needs.");
  }

  if (data.smokingStatus === "current") {
    prevention.push("Offer intensive smoking-cessation treatment now. Counseling plus pharmacotherapy is more effective than either approach alone.");
  }

  return prevention;
}

function buildNonPharmacologicBundle(data) {
  const bundle = [
    "Check inhaler technique and adherence at every review and correct barriers before further escalation.",
    "Provide written self-management education and an exacerbation action plan.",
    "Offer pulmonary rehabilitation when dyspnea, reduced exercise tolerance, or advanced disease features are present.",
    "Address multimorbidity actively, including cardiovascular disease, mood symptoms, osteoporosis, sleep-disordered breathing, and malignancy risk."
  ];

  if (data.smokingStatus === "current") {
    bundle.push("Advise complete smoking cessation at every visit and document readiness to quit.");
  }

  return bundle;
}

function getSmokingSummary(data) {
  const labels = {
    current: "Current smoker",
    former: "Former smoker",
    never: "Never smoker"
  };
  const parts = [labels[data.smokingStatus] || "Smoking status unknown"];

  if (data.packYears !== null) {
    parts.push(`${data.packYears} pack-years`);
  }

  return parts.join(", ");
}

function buildCautions(data) {
  const cautions = [];

  if (!data.spirometryConfirmed) {
    cautions.push("Confirm airflow obstruction with post-bronchodilator spirometry before making long-term treatment decisions.");
  }
  if (data.fev1fvc !== null && data.fev1fvc >= 0.7) {
    cautions.push("Entered FEV1/FVC is 0.70 or greater; re-check the diagnosis and differential before applying the COPD algorithm.");
  }
  if (data.concomitantAsthma) {
    cautions.push("Asthma overlap is suspected or confirmed, so include asthma treatment principles and an ICS-containing regimen. Avoid LABA without ICS and be cautious about ICS withdrawal.");
  }
  if (data.managementPhase === "initial" && data.currentRegimen !== "naive") {
    cautions.push("Initial management was selected, but a maintenance regimen is already documented. Confirm whether this should instead be handled as follow-up management.");
  }
  if (data.managementPhase === "followup" && data.currentRegimen === "naive") {
    cautions.push("Follow-up management was selected, but no maintenance regimen is documented. The app will default to an initial-treatment style recommendation.");
  }
  if ((data.smokingStatus === "current" || data.smokingStatus === "former") && data.packYears === null) {
    cautions.push("Pack-year history is missing, so lung cancer screening eligibility cannot be fully assessed.");
  }
  if (data.age === null) {
    cautions.push("Age is missing, so age-based vaccine and lung cancer screening recommendations may be incomplete.");
  }

  if (cautions.length === 0) {
    cautions.push("No additional high-risk data issues were detected from the entered fields.");
  }

  return cautions;
}

function buildRecommendation(data) {
  const symptoms = classifySymptoms(data);
  const exacRisk = classifyExacerbationRisk(data);
  const group = assignGoldGroup(symptoms, exacRisk);
  const prevention = buildPreventiveCare(data);
  const nonPharm = buildNonPharmacologicBundle(data);
  const cautions = buildCautions(data);

  let therapy;
  if (data.managementPhase === "followup") {
    therapy = buildFollowUpRecommendations(data);
  } else {
    therapy = buildInitialRecommendations(group, data);
  }

  const medicationDetails = [...therapy.medicationDetails];
  if (data.smokingStatus === "current") {
    medicationDetails.push(...getSmokingCessationDetails(data));
  }

  const hasAzithromycin = medicationDetails.some((item) => item.includes("Azithromycin prophylaxis"));
  const hasRoflumilast = medicationDetails.some((item) => item.includes("Roflumilast dosing"));
  if (hasAzithromycin && hasRoflumilast) {
    medicationDetails.push(getAzithromycinRoflumilastInteractionDetail());
  }

  return {
    phaseLabel: getPhaseLabel(data.managementPhase),
    group,
    symptomSummary: symptoms.summary,
    symptomNoteLine: symptoms.noteLine,
    riskSummary: exacRisk.summary,
    riskNoteLine: exacRisk.noteLine,
    plan: therapy.plan,
    rationale: therapy.rationale,
    medicationDetails,
    prevention,
    cautions,
    nonPharm
  };
}

function fillList(elementId, items, emptyText) {
  const container = document.getElementById(elementId);
  container.innerHTML = "";

  const sourceItems = items.length > 0 ? items : [emptyText];
  sourceItems.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    container.appendChild(li);
  });
}

function buildNoteText(data, rec) {
  const lines = [];
  const aatdLabel = {
    unknown: "Unknown / not documented",
    "not-done": "Not done",
    completed: "Completed and negative",
    "known-aatd": "Known alpha-1 antitrypsin deficiency"
  };
  const tdapLabel = {
    unknown: "Unknown / not documented within the last 10 years",
    "not-up-to-date": "No tetanus-containing vaccine documented within the last 10 years",
    "up-to-date": "Documented within the last 10 years"
  };

  lines.push("COPD Management Decision Support Summary");
  lines.push(`Management phase: ${rec.phaseLabel}`);
  lines.push("");
  lines.push("Case summary:");
  lines.push(`- COPD confirmed by post-bronchodilator spirometry: ${data.spirometryConfirmed ? "Yes" : "No / not documented"}.`);

  if (data.age !== null) {
    lines.push(`- Age: ${data.age} years.`);
  }
  if (data.fev1fvc !== null || data.fev1Predicted !== null) {
    const spirometryParts = [];
    if (data.fev1fvc !== null) {
      spirometryParts.push(`FEV1/FVC ${data.fev1fvc.toFixed(2)}`);
    }
    if (data.fev1Predicted !== null) {
      spirometryParts.push(`FEV1 ${data.fev1Predicted}% predicted`);
    }
    lines.push(`- Spirometry details: ${spirometryParts.join(", ")}.`);
  }
  if (data.restingSpo2 !== null) {
    lines.push(`- Resting SpO2: ${data.restingSpo2}%.`);
  }

  lines.push(`- Symptoms: ${rec.symptomNoteLine}`);
  lines.push(`- Exacerbation history: ${rec.riskNoteLine}`);
  lines.push(`- GOLD group: ${rec.group}.`);

  if (data.eosinophils !== null) {
    lines.push(`- Blood eosinophils: ${data.eosinophils} cells/uL.`);
  } else {
    lines.push("- Blood eosinophils: not available.");
  }

  lines.push(`- Smoking status: ${getSmokingSummary(data)}.`);
  lines.push(`- Current maintenance regimen: ${getRegimenLabel(data.currentRegimen)}.`);
  lines.push(`- Chronic bronchitis phenotype: ${data.chronicBronchitis ? "Present (chronic productive cough for 3 months in the year)" : "Not documented"}.`);
  lines.push(`- Concomitant asthma: ${data.concomitantAsthma ? "Suspected / confirmed" : "Not documented"}.`);
  lines.push(`- AATD screening status: ${aatdLabel[data.aatdStatus] || "Unknown"}.`);
  lines.push(`- Tdap / tetanus booster status: ${tdapLabel[data.tdapStatus] || "Unknown"}.`);
  lines.push("");
  lines.push("Plan:");
  rec.plan.forEach((item, index) => {
    lines.push(`${index + 1}. ${item}`);
  });

  if (rec.medicationDetails.length > 0) {
    lines.push("");
    lines.push("Medication details and administration notes:");
    rec.medicationDetails.forEach((item) => {
      lines.push(`- ${item}`);
    });
  }

  if (rec.prevention.length > 0) {
    lines.push("");
    lines.push("Prevention and screening:");
    rec.prevention.forEach((item) => {
      lines.push(`- ${item}`);
    });
  }

  if (rec.nonPharm.length > 0) {
    lines.push("");
    lines.push("Non-pharmacologic priorities:");
    rec.nonPharm.forEach((item) => {
      lines.push(`- ${item}`);
    });
  }

  if (rec.cautions.length > 0) {
    lines.push("");
    lines.push("Clinical cautions:");
    rec.cautions.forEach((item) => {
      lines.push(`- ${item}`);
    });
  }

  return lines.join("\n");
}

function renderRecommendation(rec, data) {
  document.getElementById("group-output").textContent = `Management phase: ${rec.phaseLabel}. Assigned GOLD category: ${rec.group}`;
  document.getElementById("symptom-output").textContent = rec.symptomSummary;
  document.getElementById("risk-output").textContent = rec.riskSummary;

  fillList("plan-list", rec.plan, "No treatment changes were triggered.");
  fillList("medication-list", rec.medicationDetails, "No medication-specific dosing instructions were triggered by the current scenario.");
  fillList("prevention-list", rec.prevention, "No additional preventive care gaps were triggered from the entered fields.");
  fillList("rationale-list", rec.rationale, "No extra rationale notes were needed.");
  fillList("caution-list", rec.cautions, "No cautions identified.");
  fillList("nonpharm-list", rec.nonPharm, "No additional non-pharmacologic recommendations were triggered.");

  document.getElementById("note-output").value = buildNoteText(data, rec);
  document.getElementById("copy-note-status").textContent = "";

  document.getElementById("results").classList.remove("hidden");
  document.getElementById("results").scrollIntoView({ behavior: "smooth", block: "start" });
}

async function copyNoteOutput() {
  const noteOutput = document.getElementById("note-output");
  const status = document.getElementById("copy-note-status");

  if (!noteOutput.value.trim()) {
    status.textContent = "Generate a recommendation before copying the note.";
    return;
  }

  try {
    await navigator.clipboard.writeText(noteOutput.value);
    status.textContent = "Note copied to clipboard.";
  } catch (error) {
    noteOutput.select();
    document.execCommand("copy");
    status.textContent = "Note copied using fallback copy.";
  }
}

document.getElementById("copd-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = getInputState();
  const recommendation = buildRecommendation(data);
  renderRecommendation(recommendation, data);
});

document.getElementById("copy-note-btn").addEventListener("click", copyNoteOutput);

initSymptomCalculators();
initSpirometryHelpers();
