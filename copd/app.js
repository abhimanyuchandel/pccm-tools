const {
  DEFAULT_NO_RISK_ISSUE,
  describeFev1FvcEntry,
  classifySymptoms,
  classifyExacerbationRisk,
  assignGoldGroup,
  isRoflumilastCandidate,
  isLungCancerScreenEligible,
  getLungCancerScreeningCaveat
} = window.copdLogic;

const NUMERIC_FIELD_CONFIG = {
  age: { id: "age", label: "Age", options: { min: 18, max: 120, integer: true } },
  fev1fvc: {
    id: "fev1fvc",
    label: "Post-BD FEV1/FVC",
    options: {
      validate: (value) => describeFev1FvcEntry(value).ratio !== null,
      ruleText: "a numeric value entered either as a ratio between 0 and 1.2 or as a percent between 0 and 100"
    }
  },
  fev1Predicted: { id: "fev1-predicted", label: "FEV1 % predicted", options: { min: 0, max: 150, integer: true } },
  restingSpo2: { id: "resting-spo2", label: "Resting SpO2 %", options: { min: 50, max: 100, integer: true } },
  catScore: { id: "cat-score", label: "CAT or CAAT score", options: { min: 0, max: 40, integer: true } },
  mmrcScore: { id: "mmrc-score", label: "mMRC dyspnea score", options: { min: 0, max: 4, integer: true } },
  moderateExac: {
    id: "moderate-exac",
    label: "Moderate exacerbation count",
    options: { min: 0, max: 20, integer: true }
  },
  severeExac: {
    id: "severe-exac",
    label: "Severe exacerbation count",
    options: { min: 0, max: 20, integer: true }
  },
  eosinophils: { id: "eosinophils", label: "Blood eosinophils", options: { min: 0, max: 5000, integer: true } },
  packYears: { id: "pack-years", label: "Pack-years", options: { min: 0, max: 200 } },
  cigarettesPerDay: {
    id: "cigarettes-per-day",
    label: "Cigarettes per day",
    options: { min: 0, max: 100, integer: true }
  },
  yearsSinceQuit: { id: "years-since-quit", label: "Years since quit", options: { min: 0, max: 80 } }
};

function readNumericField(id) {
  const raw = document.getElementById(id).value.trim();
  if (raw === "") {
    return { value: null, invalid: false };
  }

  const value = Number(raw);
  if (!Number.isFinite(value)) {
    return { value: null, invalid: true };
  }

  return { value, invalid: false };
}

function isNumericValueInvalid(value, options = {}) {
  if (!Number.isFinite(value)) {
    return true;
  }

  if (options.validate) {
    return !options.validate(value);
  }

  if (options.integer && !Number.isInteger(value)) {
    return true;
  }

  if (options.min !== undefined && value < options.min) {
    return true;
  }

  if (options.max !== undefined && value > options.max) {
    return true;
  }

  return false;
}

function describeNumericRule(options = {}) {
  if (options.ruleText) {
    return options.ruleText;
  }

  const parts = [];

  if (options.integer) {
    parts.push("a whole number");
  } else {
    parts.push("a numeric value");
  }

  if (options.min !== undefined && options.max !== undefined) {
    parts.push(`between ${options.min} and ${options.max}`);
  } else if (options.min !== undefined) {
    parts.push(`at least ${options.min}`);
  } else if (options.max !== undefined) {
    parts.push(`no more than ${options.max}`);
  }

  return parts.join(" ");
}

function setNumericFieldAlertState(id, isInvalid) {
  const field = document.getElementById(id);
  if (!field) {
    return;
  }

  field.classList.toggle("numeric-alert", isInvalid);

  const label = field.closest("label");
  if (label) {
    label.classList.toggle("numeric-alert-label", isInvalid);
  }

  if (isInvalid) {
    field.setAttribute("aria-invalid", "true");
  } else {
    field.removeAttribute("aria-invalid");
  }
}

function getValidatedNumericValue(configKey, invalidEntries = null) {
  const config = NUMERIC_FIELD_CONFIG[configKey];
  const parsed = readNumericField(config.id);
  const invalid = parsed.value !== null && isNumericValueInvalid(parsed.value, config.options);

  setNumericFieldAlertState(config.id, invalid);

  if (invalid && invalidEntries) {
    invalidEntries.push(`${config.label} must be ${describeNumericRule(config.options)}.`);
  }

  return invalid ? null : parsed.value;
}

function refreshNumericFieldAlerts() {
  Object.keys(NUMERIC_FIELD_CONFIG).forEach((configKey) => {
    getValidatedNumericValue(configKey);
  });
}

function getCheckboxValue(id) {
  return document.getElementById(id).checked;
}

function getSelectValue(id) {
  return document.getElementById(id).value;
}

function formatRatio(value) {
  return value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

function getFev1FvcStateFromDom() {
  const input = document.getElementById("fev1fvc");
  const raw = input.value.trim();

  if (raw === "") {
    return {
      hasEntry: false,
      rawValue: null,
      ratio: null,
      entryMode: null
    };
  }

  const parsed = Number(raw);
  const normalized = describeFev1FvcEntry(parsed);

  return {
    hasEntry: true,
    rawValue: Number.isFinite(parsed) ? parsed : null,
    ratio: normalized.ratio,
    entryMode: normalized.entryMode
  };
}

function getInputState() {
  const fev1fvcState = getFev1FvcStateFromDom();

  return {
    managementPhase: getSelectValue("management-phase"),
    age: getValidatedNumericValue("age"),
    spirometryConfirmed: getCheckboxValue("spirometry-confirmed"),
    fev1fvc: getValidatedNumericValue("fev1fvc") === null ? null : fev1fvcState.ratio,
    fev1fvcEntryMode: fev1fvcState.entryMode,
    fev1fvcRawValue: fev1fvcState.rawValue,
    fev1Predicted: getValidatedNumericValue("fev1Predicted"),
    restingSpo2: getValidatedNumericValue("restingSpo2"),
    catScore: getValidatedNumericValue("catScore"),
    mmrcScore: getValidatedNumericValue("mmrcScore"),
    moderateExac: getValidatedNumericValue("moderateExac"),
    severeExac: getValidatedNumericValue("severeExac"),
    eosinophils: getValidatedNumericValue("eosinophils"),
    smokingStatus: getSelectValue("smoking-status"),
    packYears: getValidatedNumericValue("packYears"),
    cigarettesPerDay: getValidatedNumericValue("cigarettesPerDay"),
    yearsSinceQuit: getValidatedNumericValue("yearsSinceQuit"),
    firstCigarette30: getCheckboxValue("first-cigarette-30"),
    chronicBronchitis: getCheckboxValue("chronic-bronchitis"),
    concomitantAsthma: getCheckboxValue("concomitant-asthma"),
    endemicAreaExposure: getCheckboxValue("endemic-area-exposure"),
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
  refreshNumericFieldAlerts();
  note.textContent = `Applied CAT score ${state.total} to symptom input.`;
}

function clearCatCalculator() {
  const state = getCatCalculatorState();
  state.inputs.forEach((input) => {
    input.value = "";
  });
  document.getElementById("cat-score").value = "";
  refreshNumericFieldAlerts();
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
  refreshNumericFieldAlerts();
  note.textContent = `Applied mMRC score ${selected} to symptom input.`;
}

function clearMmrcCalculator() {
  document.querySelectorAll('input[name="mmrc-choice"]').forEach((input) => {
    input.checked = false;
  });
  document.getElementById("mmrc-score").value = "";
  refreshNumericFieldAlerts();
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

function updateFev1FvcHelperChip() {
  const display = document.getElementById("fev1fvc-normalized");
  const state = getFev1FvcStateFromDom();

  if (!state.hasEntry) {
    display.textContent = "Normalized ratio: --";
    return state;
  }

  if (state.ratio === null) {
    display.textContent = "Normalized ratio: unable to interpret entry";
    return state;
  }

  if (state.entryMode === "percent") {
    display.textContent = `Normalized ratio: ${formatRatio(state.ratio)} (interpreted from ${state.rawValue})`;
  } else {
    display.textContent = `Normalized ratio: ${formatRatio(state.ratio)} (entered as ratio)`;
  }

  return state;
}

function syncSpirometryConfirmationFromRatio() {
  const confirmationInput = document.getElementById("spirometry-confirmed");
  const state = updateFev1FvcHelperChip();

  if (state.ratio === null) {
    return;
  }

  confirmationInput.checked = state.ratio < 0.7;
}

function initSpirometryHelpers() {
  const ratioInput = document.getElementById("fev1fvc");
  ["input", "change", "blur"].forEach((eventName) => {
    ratioInput.addEventListener(eventName, syncSpirometryConfirmationFromRatio);
  });
  syncSpirometryConfirmationFromRatio();
}

function syncSmokingFields() {
  const smokingStatus = getSelectValue("smoking-status");
  const yearsSinceQuitWrap = document.getElementById("years-since-quit-wrap");
  const yearsSinceQuitInput = document.getElementById("years-since-quit");

  if (smokingStatus === "former") {
    yearsSinceQuitWrap.classList.remove("hidden");
    yearsSinceQuitInput.disabled = false;
    refreshNumericFieldAlerts();
    return;
  }

  yearsSinceQuitWrap.classList.add("hidden");
  yearsSinceQuitInput.disabled = true;
  yearsSinceQuitInput.value = "";
  refreshNumericFieldAlerts();
}

function initSmokingFieldHelpers() {
  document.getElementById("smoking-status").addEventListener("change", syncSmokingFields);
  syncSmokingFields();
}

function setNoExacerbationCounts() {
  document.getElementById("moderate-exac").value = "0";
  document.getElementById("severe-exac").value = "0";
  refreshNumericFieldAlerts();
}

function initExacerbationHelpers() {
  document.getElementById("set-no-exac-btn").addEventListener("click", setNoExacerbationCounts);
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
  return "Roflumilast option: 250 mcg PO daily x4 weeks, then 500 mcg PO daily. Not rescue therapy; avoid in moderate-severe hepatic impairment and monitor weight, mood, insomnia, and suicidality.";
}

function getAzithromycinDetail() {
  return "Azithromycin option: 250 mg PO daily or 500 mg PO three times weekly for 1 year. Review QT risk, hearing impairment, drug interactions, and antimicrobial-resistance concerns; benefit is lower in active smokers.";
}

function getEnsifentrineDetail() {
  return "Ensifentrine option: 3 mg by nebulization BID. Do not mix with other nebulized drugs; use as maintenance, not rescue therapy.";
}

function getDupilumabDetail() {
  return "Dupilumab option: 300 mg SC every 2 weeks as add-on maintenance therapy. Not for acute bronchospasm; review hypersensitivity history, helminth risk, and live-vaccine plans.";
}

function getMepolizumabDetail() {
  return "Mepolizumab option: 100 mg SC every 4 weeks as add-on maintenance therapy. Not for acute bronchospasm; review hypersensitivity history and zoster vaccination status.";
}

function getAzithromycinRoflumilastInteractionDetail() {
  return "If azithromycin and roflumilast are used together, review for drug interactions and monitor tolerability/adverse effects.";
}

function getSmokingCessationDetails(data) {
  const details = [];

  details.push("Offer smoking-cessation counseling plus pharmacotherapy; refer to a structured program and quit-line.");
  details.push("Varenicline option: start 1 week before quit date; titrate to 1 mg PO BID for 12 weeks. Review renal dosing and adverse effects (nausea, sleep disturbance, neuropsychiatric symptoms, seizure risk).");
  details.push("Bupropion SR option: 150 mg PO daily for 3 days, then 150 mg PO BID. Avoid in seizure disorder, eating disorders, abrupt sedative/alcohol withdrawal, MAOI use, or concurrent bupropion use.");

  if (data.cigarettesPerDay !== null) {
    if (data.cigarettesPerDay > 10) {
      details.push("Nicotine patch option: 21 mg daily x6 weeks, then 14 mg daily x2 weeks, then 7 mg daily x2 weeks. Do not smoke while patch is on; use caution after recent MI or stroke.");
    } else {
      details.push("Nicotine patch option: 14 mg daily x6 weeks, then 7 mg daily x2 weeks. Do not smoke while patch is on; use caution after recent MI or stroke.");
    }
  } else {
    details.push("Choose nicotine patch dose based on baseline cigarette consumption; use caution after recent MI or stroke.");
  }

  if (data.firstCigarette30) {
    details.push("High nicotine dependence marker: first cigarette within 30 minutes of waking.");
    details.push("Use 4 mg nicotine gum or lozenge because first cigarette is within 30 minutes of waking; use every 1-2 hours initially.");
  } else {
    details.push("Use 2 mg nicotine gum or lozenge because first cigarette is >30 minutes after waking; use every 1-2 hours initially.");
  }

  return details;
}

function hasAdvancedCopdFeatures(data) {
  const severeAirflowObstruction = data.fev1Predicted !== null && data.fev1Predicted < 50;
  const severeSymptomBurden =
    (data.catScore !== null && data.catScore >= 20) ||
    (data.mmrcScore !== null && data.mmrcScore >= 3);
  const severeEventHistory = data.severeExac !== null && data.severeExac >= 1;
  const hypoxemiaSignal = data.restingSpo2 !== null && data.restingSpo2 <= 92;

  return severeAirflowObstruction || (severeSymptomBurden && severeEventHistory) || hypoxemiaSignal;
}

function shouldRecommendParasitePrecaution(data) {
  return data.eosinophils !== null && data.eosinophils > 300 && data.endemicAreaExposure;
}

function getParasitePrecautionRecommendation() {
  return "If eosinophils >300 cells/uL and there is epidemiologic helminth risk, screen for and treat parasitic infection before biologic therapy.";
}

function buildInitialRecommendations(group, data, symptoms) {
  const plan = [];
  const rationale = [];
  const medicationDetails = [];
  const followUpRecommendation = "Follow up: Consider clinical follow-up in 3-6 months and annual spirometry.";

  if (group === "A") {
    plan.push("Start bronchodilator therapy for dyspnea; prefer a long-acting bronchodilator if symptoms are more than occasional.");
    plan.push("Continue bronchodilator only if symptomatic benefit is documented.");
  }

  if (group === "B") {
    plan.push("Initial therapy: start LABA + LAMA.");
    plan.push("If LABA + LAMA is not feasible, use either LABA or LAMA based on response, cost, and tolerability.");
  }

  if (group === "E") {
    plan.push("Initial therapy: start LABA + LAMA (GOLD Group E).");
    if (data.eosinophils !== null && data.eosinophils >= 300) {
      plan.push("Eosinophils >=300 cells/uL: consider initial LABA + LAMA + ICS.");
    }
    plan.push("Avoid LABA + ICS alone in COPD without asthma; if ICS is indicated, prefer triple therapy.");
  }

  if (group === "A/B/E (exacerbation history required to classify)") {
    plan.push("Confirm prior-year moderate and severe exacerbation counts before assigning final GOLD A/B/E group and inhaled therapy.");
    rationale.push("Final GOLD A/B/E group cannot be assigned when exacerbation history is missing.");
  }

  if (group === "A/B (symptom score required to distinguish)" || symptoms.high === null) {
    plan.push("Obtain CAT/CAAT or mMRC score before finalizing symptom-based inhaled therapy intensity.");
  }

  if (data.concomitantAsthma) {
    plan.push("Asthma overlap present: use an ICS-containing regimen and avoid LABA without ICS.");
    if (group === "B" || group === "E") {
      plan.push("Because higher-intensity therapy is otherwise indicated and asthma overlap is present, consider LABA + LAMA + ICS.");
    }
    rationale.push("Asthma overlap changes the initial pathway because ICS-containing therapy is required.");
  }

  plan.push("Ensure rescue SABA/SAMA is available for breakthrough symptoms.");
  rationale.push("Initial-treatment logic mapped to GOLD 2026 treatment-naive COPD pathway.");

  return { plan, rationale, medicationDetails, followUpRecommendation };
}

function buildFollowUpRecommendations(data, exacRisk) {
  const plan = [];
  const rationale = [];
  const medicationDetails = [];
  const hasExacerbation = exacRisk.high === true;
  const exacHistoryMissing = exacRisk.high === null;
  let managementChangeRecommended = false;
  let followUpRecommendation = "Follow up: Consider clinical follow-up in 6-12 months and annual spirometry.";

  if (data.currentRegimen === "naive") {
    managementChangeRecommended = true;
    plan.push("No maintenance regimen documented; apply the initial-treatment pathway, then reassess response.");
    if (data.concomitantAsthma) {
      plan.push("Asthma overlap present: the next maintenance regimen should include ICS, not bronchodilator monotherapy alone.");
    }
    rationale.push("Follow-up algorithms apply to patients already receiving maintenance therapy.");
    followUpRecommendation = "Follow up: Consider clinical follow-up in 3-6 months and annual spirometry.";
    return { plan, rationale, medicationDetails, followUpRecommendation };
  }

  if (hasExacerbation) {
    managementChangeRecommended = true;
    rationale.push("Exacerbation pathway selected because exacerbation prevention takes priority when both dyspnea and exacerbations are present.");

    if (data.currentRegimen === "mono") {
      plan.push("Escalate bronchodilator monotherapy to LABA + LAMA because exacerbations occurred.");
    } else if (data.currentRegimen === "laba-lama") {
      if (data.eosinophils !== null && data.eosinophils >= 100) {
        plan.push("Escalate LABA + LAMA to triple therapy because exacerbations occurred and eosinophils are >=100 cells/uL.");
      } else {
        plan.push("Exacerbations on LABA + LAMA with eosinophils <100 cells/uL or unavailable: consider non-ICS add-on therapy.");
        if (data.eosinophils === null) {
          plan.push("Obtain blood eosinophil count; it helps estimate expected ICS benefit.");
        }
        if (data.smokingStatus !== "current") {
          plan.push("Consider add-on azithromycin because the patient is not currently smoking.");
          medicationDetails.push(getAzithromycinDetail());
        }
        if (isRoflumilastCandidate(data)) {
          plan.push("Consider roflumilast (FEV1 <50%, chronic bronchitis, persistent exacerbations despite maintenance therapy).");
          medicationDetails.push(getRoflumilastDetail());
        }
      }
    } else if (data.currentRegimen === "triple") {
      if (data.eosinophils !== null && data.eosinophils >= 300) {
        if (data.chronicBronchitis) {
          plan.push("Consider one add-on biologic (dupilumab or mepolizumab) because eosinophils >=300 cells/uL and chronic bronchitis are present; do not use both together.");
          medicationDetails.push(getDupilumabDetail());
        } else {
          plan.push("Consider add-on mepolizumab (eosinophils >=300 cells/uL).");
        }
        if (shouldRecommendParasitePrecaution(data)) {
          plan.push(getParasitePrecautionRecommendation());
        }
        medicationDetails.push(getMepolizumabDetail());
      }
      if (data.smokingStatus !== "current") {
        plan.push("Consider azithromycin prophylaxis because exacerbations persist and the patient is not currently smoking.");
        medicationDetails.push(getAzithromycinDetail());
      }
      if (isRoflumilastCandidate(data)) {
        plan.push("Consider roflumilast (FEV1 <50%, chronic bronchitis, persistent exacerbations despite optimized inhaled therapy).");
        medicationDetails.push(getRoflumilastDetail());
      }
      if (data.icsSideEffects) {
        if (data.eosinophils !== null && data.eosinophils >= 300) {
          plan.push("Use caution with ICS withdrawal; eosinophils >=300 cells/uL may predict higher exacerbation risk after de-escalation.");
        } else {
          plan.push("If ICS was ineffective, not indicated, or harmful, consider ICS de-escalation with close follow-up.");
        }
      }
    } else {
      plan.push("Clarify the current maintenance regimen and align it with a standard pathway before adjusting therapy.");
    }
  } else if (data.persistentDyspnea) {
    managementChangeRecommended = true;
    rationale.push("Dyspnea pathway selected because persistent breathlessness is the main follow-up issue.");

    if (data.currentRegimen === "mono") {
      plan.push("Escalate bronchodilator monotherapy to LABA + LAMA for persistent dyspnea or exercise limitation.");
    } else if (data.currentRegimen === "laba-lama") {
      plan.push("If dyspnea persists on LABA + LAMA, consider switching device or bronchodilator molecule and intensifying nonpharmacologic therapy (for example pulmonary rehabilitation).");
      plan.push("Consider ensifentrine if available.");
      medicationDetails.push(getEnsifentrineDetail());
    } else if (data.currentRegimen === "triple") {
      plan.push("Persistent dyspnea on triple therapy warrants reassessment of inhaler technique, device choice, comorbidities, and rehabilitation needs.");
      plan.push("Consider ensifentrine if symptoms remain limiting despite optimized inhaler use and rehabilitation.");
      medicationDetails.push(getEnsifentrineDetail());
    } else {
      plan.push("Clarify the current maintenance regimen and optimize bronchodilation before further escalation.");
    }

    plan.push("Evaluate non-COPD contributors to dyspnea (for example cardiac disease, deconditioning, anemia, or anxiety).");
  } else if (exacHistoryMissing) {
    plan.push("Exacerbation history is incomplete; confirm prior-year moderate and severe exacerbation counts before deciding that no escalation is needed.");
    rationale.push("Follow-up recommendations should not assume zero exacerbations when history is missing.");
    followUpRecommendation = "Follow up: Consider clinical follow-up in 3-6 months and annual spirometry.";
  } else {
    plan.push("Symptoms stable and no recent exacerbations: continue current maintenance therapy.");
    rationale.push("Reassessment did not identify a dominant dyspnea or exacerbation target.");
  }

  if (data.concomitantAsthma) {
    rationale.push("Asthma overlap changes follow-up management because ICS-containing therapy is required.");

    if (data.currentRegimen === "mono") {
      managementChangeRecommended = true;
      plan.push("Current regimen may lack ICS; with asthma overlap, transition to an ICS-containing regimen.");
    } else if (data.currentRegimen === "laba-lama") {
      managementChangeRecommended = true;
      plan.push("LABA + LAMA lacks ICS; with asthma overlap, step up to LABA + LAMA + ICS unless ICS is contraindicated or the asthma diagnosis is revised.");
    } else if (data.currentRegimen === "triple") {
      plan.push("Maintain ICS because asthma overlap is present; consider withdrawal only if harms clearly outweigh benefit.");
    } else {
      managementChangeRecommended = true;
      plan.push("Clarify the current regimen and ensure it includes ICS because asthma overlap is present.");
    }
  }

  plan.push("Before escalation, reassess adherence, inhaler technique, device fit, and comorbid contributors.");
  plan.push("Ensure rescue SABA/SAMA is available for breakthrough symptoms.");

  if (managementChangeRecommended) {
    followUpRecommendation = "Follow up: Consider clinical follow-up in 3-6 months and annual spirometry.";
  }

  return { plan, rationale, medicationDetails, followUpRecommendation };
}

function buildPreventiveCare(data) {
  const prevention = [];

  if (data.aatdStatus === "unknown" || data.aatdStatus === "not-done") {
    prevention.push("If not previously done, obtain one-time alpha-1 antitrypsin deficiency testing.");
  } else if (data.aatdStatus === "known-aatd") {
    prevention.push("Known alpha-1 antitrypsin deficiency: confirm specialist follow-up and discuss family screening.");
  }

  if (isLungCancerScreenEligible(data)) {
    prevention.push("Eligible for annual low-dose CT lung cancer screening; confirm that the patient is willing and able to undergo curative-intent evaluation and treatment if screening is positive.");
    const screeningCaveat = getLungCancerScreeningCaveat(data);
    if (screeningCaveat) {
      prevention.push(screeningCaveat);
    }
  }

  if (data.pneumococcalStatus === "unknown" || data.pneumococcalStatus === "unvaccinated") {
    prevention.push("Verify pneumococcal vaccine history; if no prior PCV is documented, give PCV20 or PCV21 now (or PCV15 then PPSV23).");
  }

  if (data.age !== null && data.age >= 50 && data.rsvStatus !== "complete") {
    prevention.push("Recommend a single RSV vaccine dose because chronic lung disease increases RSV risk.");
  }

  if (data.age !== null && data.age >= 50 && data.zosterStatus !== "complete") {
    prevention.push("Recommend recombinant zoster vaccine (Shingrix), 2-dose series.");
  }

  if (data.tdapStatus === "unknown" || data.tdapStatus === "not-up-to-date") {
    prevention.push("Review Td/Tdap history; give Tdap once if never documented, otherwise give Td or Tdap booster if due (every 10 years).");
  }

  prevention.push("Keep influenza and COVID-19 vaccination up to date.");

  if (data.restingSpo2 !== null && data.restingSpo2 <= 92) {
    prevention.push("Resting SpO2 <=92%: obtain ABG and formally assess oxygen requirement.");
  }

  if (hasAdvancedCopdFeatures(data)) {
    prevention.push("Advanced COPD features present: assess for LTOT eligibility, home NIV if hypercapnic, lung volume reduction/LVRS candidacy, and supportive or palliative needs.");
  }

  if (data.smokingStatus === "current") {
    prevention.push("Offer smoking-cessation treatment now (counseling plus pharmacotherapy).");
  }

  return prevention;
}

function buildNonPharmacologicBundle(data) {
  const bundle = [
    "At each review, assess inhaler technique and adherence and correct barriers before escalation.",
    "Provide written self-management education and an exacerbation action plan.",
    "Offer pulmonary rehabilitation for dyspnea, reduced exercise tolerance, or advanced disease.",
    "Actively address multimorbidity, including cardiovascular disease, mood symptoms, osteoporosis, sleep-disordered breathing, and malignancy risk."
  ];

  if (data.smokingStatus === "current") {
    bundle.push("Advise smoking cessation at every visit and document readiness to quit.");
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

  if (data.smokingStatus === "current" && data.cigarettesPerDay !== null) {
    parts.push(`${data.cigarettesPerDay} cigarettes/day`);
  }

  if (data.smokingStatus === "former" && data.yearsSinceQuit !== null) {
    parts.push(`quit ${data.yearsSinceQuit} years ago`);
  }

  return parts.join(", ");
}

function buildCautions(data, exacRisk) {
  const cautions = [];

  if (data.fev1fvcRawValue !== null && data.fev1fvc === null) {
    cautions.push("FEV1/FVC entry could not be interpreted; enter either a ratio (for example 0.65) or a percent (for example 65).");
  }
  if (!data.spirometryConfirmed) {
    cautions.push("Confirm airflow obstruction with post-bronchodilator spirometry before long-term treatment decisions.");
  }
  if (data.fev1fvc !== null && data.fev1fvc >= 0.7) {
    cautions.push("Entered FEV1/FVC is >=0.70; recheck diagnosis and differential before applying COPD-specific recommendations.");
  }
  if (exacRisk.high === null) {
    cautions.push("Exacerbation history missing; GOLD grouping and escalation logic are provisional until prior-year counts are confirmed.");
  } else if (exacRisk.missing) {
    cautions.push(`${exacRisk.missing[0].toUpperCase() + exacRisk.missing.slice(1)} exacerbation count missing and provisionally treated as 0; confirm full prior-year exacerbation history.`);
  }
  if (data.concomitantAsthma) {
    cautions.push("Asthma overlap present: include asthma treatment principles, avoid LABA without ICS, and use caution with ICS withdrawal.");
  }
  if (data.managementPhase === "initial" && data.currentRegimen !== "naive") {
    cautions.push("Initial-treatment mode selected, but maintenance therapy is already documented; consider using follow-up mode.");
  }
  if (data.managementPhase === "followup" && data.currentRegimen === "naive") {
    cautions.push("Follow-up mode selected, but no maintenance regimen is documented; output defaults to an initial-treatment style recommendation.");
  }
  if ((data.smokingStatus === "current" || data.smokingStatus === "former") && data.packYears === null) {
    cautions.push("Pack-year history missing; lung cancer screening eligibility cannot be fully assessed.");
  }
  if (data.age === null) {
    cautions.push("Age missing; age-based vaccine and lung cancer screening recommendations may be incomplete.");
  }

  if (cautions.length === 0) {
    cautions.push(DEFAULT_NO_RISK_ISSUE);
  }

  return cautions;
}

function buildRecommendation(data) {
  const symptoms = classifySymptoms(data);
  const exacRisk = classifyExacerbationRisk(data);
  const group = assignGoldGroup(symptoms, exacRisk);
  const prevention = buildPreventiveCare(data);
  const nonPharm = buildNonPharmacologicBundle(data);
  const cautions = buildCautions(data, exacRisk);

  let therapy;
  if (data.managementPhase === "followup") {
    therapy = buildFollowUpRecommendations(data, exacRisk);
  } else {
    therapy = buildInitialRecommendations(group, data, symptoms);
  }

  const medicationDetails = [...therapy.medicationDetails];
  if (data.smokingStatus === "current") {
    medicationDetails.push(...getSmokingCessationDetails(data));
  }

  const hasAzithromycin = medicationDetails.some((item) => item.includes("Azithromycin option"));
  const hasRoflumilast = medicationDetails.some((item) => item.includes("Roflumilast option"));
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
    followUpRecommendation: therapy.followUpRecommendation,
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
  const pneumococcalLabel = {
    unknown: "Unknown",
    unvaccinated: "Unvaccinated / incomplete",
    complete: "Complete (PCV20/PCV21 or equivalent)"
  };
  const rsvLabel = {
    unknown: "Unknown",
    unvaccinated: "Unvaccinated",
    complete: "Complete"
  };
  const zosterLabel = {
    unknown: "Unknown",
    unvaccinated: "Unvaccinated / incomplete",
    complete: "Complete"
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
      spirometryParts.push(`FEV1/FVC ${formatRatio(data.fev1fvc)}`);
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
  if (data.endemicAreaExposure) {
    lines.push("- History of living or residing in an endemic area for parasitic infection: yes.");
  }
  lines.push(`- AATD screening status: ${aatdLabel[data.aatdStatus] || "Unknown"}.`);
  lines.push(`- Pneumococcal vaccine status: ${pneumococcalLabel[data.pneumococcalStatus] || "Unknown"}.`);
  lines.push(`- RSV vaccine status: ${rsvLabel[data.rsvStatus] || "Unknown"}.`);
  lines.push(`- Zoster vaccine status: ${zosterLabel[data.zosterStatus] || "Unknown"}.`);
  lines.push(`- Tdap / tetanus booster status: ${tdapLabel[data.tdapStatus] || "Unknown"}.`);
  lines.push("");
  lines.push("Plan:");
  rec.plan.forEach((item, index) => {
    lines.push(`${index + 1}. ${item}`);
  });
  lines.push(`${rec.plan.length + 1}. ${rec.followUpRecommendation}`);

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

  const noteCautions = rec.cautions.filter((item) => item !== DEFAULT_NO_RISK_ISSUE);

  if (noteCautions.length > 0) {
    lines.push("");
    lines.push("Clinical cautions:");
    noteCautions.forEach((item) => {
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
initSmokingFieldHelpers();
initExacerbationHelpers();
Object.values(NUMERIC_FIELD_CONFIG).forEach(({ id }) => {
  const element = document.getElementById(id);
  element.addEventListener("input", refreshNumericFieldAlerts);
  element.addEventListener("change", refreshNumericFieldAlerts);
});
refreshNumericFieldAlerts();
