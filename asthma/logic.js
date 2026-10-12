(function (root, factory) {
  const catalog = typeof module !== "undefined" && module.exports ? require("./medications.js") : root.asthmaMedications;
  const logic = factory(catalog);
  if (typeof module !== "undefined" && module.exports) module.exports = logic;
  if (root) root.asthmaLogic = logic;
})(typeof globalThis !== "undefined" ? globalThis : this, function (catalog) {
  "use strict";

  const NUMBERS = "age biologicMonths maintenanceOcsDose fev1Pre fev1Post fvcPre fvcPost fev1Predicted fvcPredicted pefVariability airUsesPerWeek sabaCanisters ocsExacerbations hospitalExacerbations stableMonths eosinophils historicalEosinophils feno totalIge weightKg heartRate respiratoryRate spo2 systolicBp diastolicBp temperature acuteLungFunctionPercent postTreatmentSpo2 postTreatmentRespiratoryRate postTreatmentLungFunctionPercent observationMinutes".split(" ");
  const BOOLEANS = "lamaAddon maintenanceOcs accessBarrier optimizedTherapy severeAsthmaEstablished icsSideEffects typicalSymptoms icsObjectiveResponse clinicalIcsResponse bronchodilatorHeld activityLimitation recentExacerbation priorIcu persistentExacerbations lungFunctionStable pregnant respiratoryInfection travelling allergenDriven perennialSensitization igePretreatment nasalPolyps atopicDermatitis endemicExposure urgentRedFlags acuteCanLieDown acuteCannotDrink acuteUnableToLieDown acuteCyanosis roomAir postTreatmentRoomAir postTreatmentMildFeatures homeSupport".split(" ");
  const HISTORY = "dxBd dxIcsObjective dxChallenge dxPef".split(" ");
  const TEXT = "currentMedicationText exposureText hpi exam clinicianContext counselingDocumented acuteHistory acuteTreatmentGiven".split(" ");
  const ENUMS = {
    managementPhase: ["initial", "followup"], controller: ["unknown", "none", "saba-only", "ics", "ics-formoterol", "ics-laba", "triple"],
    icsDose: ["unknown", "low", "medium", "high"], labaType: ["unknown", "formoterol", "non-formoterol"],
    reliever: ["unknown", "ics-formoterol", "ics-saba", "saba", "none"], adherence: ["unknown", "adequate", "suboptimal"], technique: ["unknown", "correct", "incorrect"],
    diagnosisContext: ["unknown", "established", "suspected"], bronchoprovocation: ["unknown", "not-done", "positive", "negative"],
    symptomDays: ["unknown", "none", "one-two", "three", "four-six", "daily"], nightWaking: ["unknown", "none", "less-weekly", "weekly-plus"],
    sabaFrequency: ["unknown", "none", "one-two", "more-two"], egpa: ["unknown", "no", "suspected", "confirmed"], smoking: ["unknown", "never", "former", "current"],
    acutePresentation: ["unknown", "none", "active", "recent"], acuteSpeech: ["unknown", "sentences", "phrases", "unable"], acuteMentalStatus: ["unknown", "normal", "agitated", "drowsy", "confused"],
    acuteRespiratoryEffort: ["unknown", "normal-mild", "increased"], acuteAccessoryMuscles: ["unknown", "none-mild", "marked"], acuteAirEntry: ["unknown", "normal", "reduced", "silent"],
    acuteWheeze: ["unknown", "none-mild", "expiratory"], acuteLungFunctionType: ["unknown", "pef", "fev1"], acuteLungFunctionReference: ["unknown", "personal-best", "predicted"], acuteResponse: ["unknown", "improving", "unchanged", "worsening"]
  };
  ENUMS.currentBiologic = ["unknown", "none", "omalizumab", "mepolizumab", "benralizumab", "reslizumab", "dupilumab", "tezepelumab", "depemokimab"];
  for (const key of ["pneumococcal", "rsv", "zoster", "tdap", "flu", "covid"]) ENUMS[key] = ["unknown", "due", "complete"];

  function createEmptyState() {
    const data = {};
    NUMBERS.forEach(key => { data[key] = null; });
    BOOLEANS.forEach(key => { data[key] = null; });
    HISTORY.forEach(key => { data[key] = false; });
    TEXT.forEach(key => { data[key] = ""; });
    Object.keys(ENUMS).forEach(key => { data[key] = ENUMS[key][0]; });
    return data;
  }

  function normalizeState(input = {}) {
    const data = createEmptyState();
    NUMBERS.forEach(key => {
      const value = input[key];
      data[key] = value === null || value === undefined || String(value).trim() === "" ? null : Number(value);
    });
    BOOLEANS.forEach(key => { data[key] = input[key] === true || input[key] === "yes" ? true : input[key] === false || input[key] === "no" ? false : null; });
    HISTORY.forEach(key => { data[key] = input[key] === true; });
    TEXT.forEach(key => { data[key] = typeof input[key] === "string" ? input[key].trim() : ""; });
    Object.keys(ENUMS).forEach(key => { if (ENUMS[key].includes(input[key])) data[key] = input[key]; });
    return data;
  }

  function assessDataQuality(input) {
    const d = normalizeState(input), errors = [], warnings = [];
    NUMBERS.forEach(key => { if (d[key] !== null && (!Number.isFinite(d[key]) || d[key] < 0)) errors.push(`${key}: enter a finite, nonnegative value.`); });
    for (const key of ["age", "ocsExacerbations", "hospitalExacerbations", "sabaCanisters"]) if (d[key] !== null && !Number.isInteger(d[key])) errors.push(`${key}: enter a whole number.`);
    if (d.age !== null && (d.age < 18 || d.age > 120)) errors.push("This application supports adults aged 18 years or older; verify the age.");
    for (const key of ["spo2", "postTreatmentSpo2"]) if (d[key] !== null && d[key] > 100) errors.push("Oxygen saturation cannot exceed 100%.");
    for (const key of ["fev1Pre", "fev1Post", "fvcPre", "fvcPost", "weightKg"]) if (d[key] === 0) errors.push(`${key}: a zero value is not usable; verify or leave blank.`);
    if ((d.fev1Pre !== null && d.fvcPre !== null && d.fev1Pre > d.fvcPre) || (d.fev1Post !== null && d.fvcPost !== null && d.fev1Post > d.fvcPost)) errors.push("FEV1 exceeds FVC in the same spirometry phase; verify the measurements.");
    if (d.systolicBp !== null && d.diastolicBp !== null && d.diastolicBp >= d.systolicBp) errors.push("Diastolic BP must be lower than systolic BP; verify the measurements.");
    if (d.eosinophils !== null && d.eosinophils >= 1500 || d.historicalEosinophils !== null && d.historicalEosinophils >= 1500) warnings.push("Marked eosinophilia warrants evaluation for alternative causes, including EGPA and hypereosinophilic disease; do not attribute it to asthma alone.");
    if (d.bronchodilatorHeld === false) warnings.push("Bronchodilators were not withheld before testing; a negative reversibility result may be less informative. Follow laboratory washout instructions if repeating diagnostic testing.");
    if (d.endemicExposure === true && (d.eosinophils >= 300 || d.historicalEosinophils >= 300)) warnings.push("Consider parasitic infection evaluation before systemic corticosteroids or biologic treatment when exposure and eosinophilia are present.");
    return { errors, warnings };
  }

  function getBronchodilatorAssessment(input) {
    const d = normalizeState(input), result = { available: false, positive: false, atsErsPositive: false, highConfidence: false };
    const lines = [];
    for (const [prefix, label] of [["fev1", "FEV1"], ["fvc", "FVC"]]) {
      const pre = d[`${prefix}Pre`], post = d[`${prefix}Post`], predictedPercent = d[`${prefix}Predicted`];
      const available = pre !== null && post !== null && pre > 0;
      const deltaMl = available ? (post - pre) * 1000 : null, percent = available ? (post - pre) / pre * 100 : null;
      const predictedDeltaPercent = available && predictedPercent > 0 ? (post - pre) / pre * predictedPercent : null;
      const traditional = available && deltaMl + 1e-8 >= 200 && percent + 1e-8 >= 12;
      const ats = predictedDeltaPercent !== null && predictedDeltaPercent > 10 + 1e-8;
      Object.assign(result, { [`${prefix}DeltaMl`]: deltaMl, [`${prefix}Percent`]: percent, [`${prefix}PredictedDeltaPercent`]: predictedDeltaPercent, [`${prefix}AtsErsPositive`]: ats });
      result.available ||= available; result.positive ||= traditional; result.atsErsPositive ||= ats;
      result.highConfidence ||= available && deltaMl >= 400 && percent >= 15;
      if (available) lines.push(`${label} change ${deltaMl.toFixed(0)} mL (${percent.toFixed(1)}% from baseline)${predictedDeltaPercent === null ? "" : `; ${predictedDeltaPercent.toFixed(1)}% of predicted`}`);
    }
    result.summary = result.available ? `${lines.join(". ")}. GINA adult criterion (at least 12% and 200 mL): ${result.positive ? "met" : "not met"}. ATS/ERS greater-than-10%-of-predicted responsiveness: ${result.atsErsPositive ? "met" : "not met or predicted value unavailable"}.` : "Paired spirometry is not documented; bronchodilator responsiveness cannot be assessed.";
    return result;
  }

  function assessDiagnosis(input) {
    const d = normalizeState(input), bd = getBronchodilatorAssessment(d), evidence = [];
    if (bd.positive || d.dxBd) evidence.push("documented bronchodilator responsiveness");
    if (d.icsObjectiveResponse === true || d.dxIcsObjective) evidence.push("documented objective airflow improvement after ICS");
    if (d.bronchoprovocation === "positive" || d.dxChallenge) evidence.push("positive bronchoprovocation testing");
    if (d.pefVariability > 10 || d.dxPef) evidence.push("excessive diurnal PEF variability");
    const objective = evidence.length > 0, established = d.diagnosisContext === "established";
    const confirmed = objective && (d.typicalSymptoms === true || established);
    const supported = confirmed || established;
    return { bd, evidence, objective, established, confirmed, supported,
      label: confirmed ? "Asthma supported by objective evidence" : established ? "Established clinical asthma; original objective evidence not documented here" : "Suspected asthma; confirmation remains needed",
      summary: confirmed ? `Asthma is supported by ${evidence.join(" and ")}.` : established ? "An established clinical asthma diagnosis is recorded. Retrieve historical evidence or arrange suitable confirmation without automatically invalidating the diagnosis or withdrawing effective treatment." : "Confirm asthma with a compatible symptom history and objective variable expiratory airflow limitation; symptom improvement with ICS alone is not objective confirmation." };
  }

  function classifyControl(input) {
    const d = normalizeState(input);
    const items = [d.symptomDays === "unknown" ? null : ["three", "four-six", "daily"].includes(d.symptomDays), d.nightWaking === "unknown" ? null : d.nightWaking !== "none", d.activityLimitation];
    const sabaApplicable = d.reliever === "saba";
    if (sabaApplicable) items.push(d.sabaFrequency === "unknown" ? null : d.sabaFrequency === "more-two");
    const count = items.filter(value => value === true).length, answered = items.filter(value => value !== null).length;
    const complete = answered === items.length && !["unknown", "none"].includes(d.reliever);
    const classification = count >= 3 ? "uncontrolled" : !complete ? "not fully assessed" : count > 0 ? "partly controlled" : "well controlled";
    return { count, answered, total: items.length, complete, sabaApplicable, classification, poor: count > 0,
      summary: `GINA symptom control: ${classification}; ${count} positive of ${answered} documented items${complete ? "" : "; assessment incomplete"}. ${sabaApplicable ? "SABA use excludes pre-exercise doses." : "The SABA-frequency question is not applied to an ICS-containing reliever."}` };
  }

  function classifyExacerbationRisk(input) {
    const d = normalizeState(input), complete = d.ocsExacerbations !== null && d.hospitalExacerbations !== null;
    const any = (d.ocsExacerbations > 0 || d.hospitalExacerbations > 0) ? true : complete ? false : null;
    const frequent = d.ocsExacerbations >= 2 || d.hospitalExacerbations >= 1;
    const factors = [];
    if (any) factors.push("exacerbation requiring systemic corticosteroids or hospitalization in the past year");
    if (d.recentExacerbation === true) factors.push("recent exacerbation");
    if (d.priorIcu === true) factors.push("prior ICU admission or life-threatening asthma");
    if (d.fev1Predicted !== null && d.fev1Predicted < 60) factors.push("FEV1 below 60% predicted");
    if (d.sabaCanisters >= 3) factors.push("SABA dispensing of at least three canisters/year");
    if (d.smoking === "current") factors.push("current smoking");
    if (d.adherence === "suboptimal" || d.accessBarrier === true) factors.push("suboptimal controller adherence or access");
    if (d.technique === "incorrect") factors.push("incorrect inhaler technique");
    if ((d.diagnosisContext === "established" || d.typicalSymptoms === true) && ["none", "saba-only"].includes(d.controller) && ["none", "saba"].includes(d.reliever)) factors.push("absence of ICS protection");
    if (d.pregnant === true) factors.push("pregnancy");
    if (d.eosinophils >= 300 || d.historicalEosinophils >= 300) factors.push("raised blood eosinophils");
    if (d.feno >= 50) factors.push("high FeNO");
    if (d.maintenanceOcs === true) factors.push("maintenance systemic corticosteroid exposure");
    return { complete, anyExacerbation: any, frequent, factors, elevated: factors.length > 0,
      summary: factors.length ? `Future exacerbation risk factors: ${factors.join("; ")}${complete ? "." : "; annual exacerbation history remains incomplete."}` : complete ? "No exacerbations requiring oral corticosteroids or hospitalization are documented in the past year; assess other future-risk factors separately." : "Annual exacerbation history is incomplete; absence of future risk cannot be assumed." };
  }

  function getTreatmentContext(input) {
    const d = normalizeState(input), maintenance = ["ics", "ics-formoterol", "ics-laba", "triple"].includes(d.controller) || d.maintenanceOcs === true || !["none", "unknown"].includes(d.currentBiologic);
    const effectivePhase = d.managementPhase === "initial" && maintenance ? "followup" : d.managementPhase;
    const combination = ["ics-formoterol", "ics-laba", "triple"].includes(d.controller);
    const formoterol = d.controller === "ics-formoterol" || combination && d.labaType === "formoterol";
    const incompatible = d.reliever === "ics-formoterol" && combination && !formoterol;
    const airOnly = ["none", "saba-only"].includes(d.controller) && d.reliever === "ics-formoterol";
    let track = null, step = null, description = "Current treatment category / intensity is not fully documented";
    if (airOnly) { track = 1; step = "1-2"; description = "GINA Track 1 Step 1-2, as-needed ICS-formoterol without maintenance controller"; }
    else if (formoterol && d.reliever === "ics-formoterol" && !incompatible) {
      track = 1; step = d.icsDose === "low" ? "3" : d.icsDose === "medium" ? "4" : null;
      description = `GINA Track 1${step ? ` Step ${step}` : ""}, ${d.icsDose === "unknown" ? "dose not documented" : `${d.icsDose}-dose`} ${d.controller === "triple" ? "ICS-LABA-LAMA maintenance inhaler with a separate ICS-formoterol reliever (not triple-inhaler MART)" : "ICS-formoterol maintenance and reliever treatment"}`;
    } else if (d.controller === "ics") {
      track = ["saba", "ics-saba"].includes(d.reliever) ? 2 : null; step = track && d.icsDose === "low" ? "2" : null; description = `${track ? `GINA Track 2${step ? ` Step ${step}` : ""}, ` : ""}${d.icsDose === "unknown" ? "dose not documented" : `${d.icsDose}-dose`} maintenance ICS`;
    } else if (combination) {
      track = ["saba", "ics-saba"].includes(d.reliever) ? 2 : null;
      step = d.icsDose === "low" ? "3" : d.icsDose === "medium" ? "4" : null;
      description = `${track ? `GINA Track ${track}${step ? ` Step ${step}` : ""}, ` : ""}${d.icsDose === "unknown" ? "dose not documented" : `${d.icsDose}-dose`} ICS-LABA${d.controller === "triple" ? "-LAMA" : ""}`;
    } else if (d.controller === "saba-only") description = "SABA-only treatment without ICS protection";
    else if (d.controller === "none") description = "No maintenance controller documented";
    const step5 = combination && d.icsDose === "high" && (d.lamaAddon === true || d.controller === "triple" || d.maintenanceOcs === true || !["none", "unknown"].includes(d.currentBiologic));
    if (step5) { step = "5"; description = `${track ? `GINA Track ${track} ` : "GINA "}Step 5, high-dose ICS-LABA with add-on treatment`; }
    return { maintenance, effectivePhase, combination, formoterol, incompatible, airOnly, track, step, step5, description, relieverName: { "ics-formoterol": "ICS-formoterol", "ics-saba": "albuterol-budesonide", saba: "SABA", none: "no reliever", unknown: "reliever not documented" }[d.reliever] };
  }

  function classifySevereAsthmaState(input, control = classifyControl(input), risk = classifyExacerbationRisk(input)) {
    const d = normalizeState(input), treatment = getTreatmentContext(d);
    const highIntensity = treatment.combination && d.icsDose === "high";
    const optimized = d.optimizedTherapy === true && d.adherence === "adequate" && d.technique === "correct" && d.accessBarrier === false;
    const burden = control.poor || risk.frequent || d.persistentExacerbations === true || d.maintenanceOcs === true;
    const established = highIntensity && optimized && burden;
    return { highIntensity, optimized, burden, established, previouslyEstablished: d.severeAsthmaEstablished === true,
      label: established ? "Severe asthma supported after high-dose treatment optimization" : d.severeAsthmaEstablished === true ? "Previously established severe asthma; current treatment context requires review" : "Severe asthma not established from the available treatment and optimization history" };
  }

  function getDupilumabEvidenceFlag(input) {
    const d = normalizeState(input), values = [d.eosinophils, d.historicalEosinophils].filter(value => value !== null);
    return { above1500: values.some(value => value > 1500), markedEosinophilia: values.some(value => value >= 1500), caution: values.some(value => value > 1500) ? "GINA advises against routine dupilumab selection with current or historical eosinophils above 1500 cells/uL because evidence is limited; evaluate the cause first. This is an evidence caution, not an FDA contraindication." : null };
  }

  function getOmalizumabFeasibility(input) {
    const d = normalizeState(input), dose = catalog.getOmalizumabDose(d.totalIge, d.weightKg);
    return { feasible: dose !== null && d.perennialSensitization === true && d.igePretreatment === true, dose,
      status: d.totalIge === null || d.weightKg === null ? "Complete the pretreatment IgE / weight dosing-table assessment before prescribing." : !dose ? "No dose is specified for this IgE / weight combination in the U.S. adult asthma table." : d.igePretreatment !== true ? "Confirm that total IgE was measured before omalizumab treatment; treatment-elevated IgE must not determine the dose." : d.perennialSensitization !== true ? "Confirm perennial aeroallergen sensitization before prescribing." : `${dose.doseMg} mg subcutaneously every ${dose.intervalWeeks} weeks under the adult asthma dosing table.` };
  }

  function getBiologicCandidates(input, findings) {
    const d = normalizeState(input), f = findings || { diagnosis: assessDiagnosis(d), control: classifyControl(d), risk: classifyExacerbationRisk(d), severe: classifySevereAsthmaState(d) };
    const tx = getTreatmentContext(d), highOrMedium = tx.combination && ["medium", "high"].includes(d.icsDose);
    if (!f.diagnosis.supported || !(highOrMedium || f.severe.previouslyEstablished) || !(f.control.poor || f.risk.frequent || d.persistentExacerbations === true || d.maintenanceOcs === true)) return [];
    const common = [];
    if (d.age === null) common.push("Verify adult age and indication-specific eligibility");
    if (d.currentBiologic === "unknown") common.push("Clarify current biologic treatment before planning initiation or a switch");
    if (!f.diagnosis.confirmed) common.push("Review objective diagnostic evidence");
    if (!f.severe.highIntensity) common.push("Reassess after an appropriate high-dose ICS-LABA trial");
    if (!f.severe.optimized) common.push("Document technique, adherence, access, and optimization over 3-6 months");
    if (d.pregnant === true) common.push("Review pregnancy-specific benefits, risks, and limited safety data before a new biologic");
    if (!f.risk.complete) common.push("Complete the annual exacerbation history");
    if (!f.risk.frequent && d.maintenanceOcs !== true) common.push("Verify product-specific exacerbation / severe-asthma eligibility and payer criteria");
    const candidates = [], future = !f.severe.established;
    const add = (id, reason, additional = []) => { const prerequisites = [...common, ...additional]; candidates.push({ id, name: catalog.MEDICATIONS[id].name, reason, prerequisites, ready: prerequisites.length === 0, future }); };
    const eosSignal = d.eosinophils !== null && d.eosinophils >= 150 || d.historicalEosinophils !== null && d.historicalEosinophils >= 300;
    if (d.allergenDriven === true || d.perennialSensitization === true) {
      const feasible = getOmalizumabFeasibility(d), extra = [];
      if (d.perennialSensitization !== true) extra.push("Obtain skin prick testing or serum specific IgE to confirm perennial aeroallergen sensitization");
      if (!feasible.dose) extra.push(feasible.status);
      if (d.igePretreatment !== true && feasible.dose) extra.push("Confirm that the IgE value is pretreatment, not measured during omalizumab treatment");
      add("omalizumab", "Allergic asthma phenotype; requires sensitization and a valid pretreatment IgE / weight table dose", extra);
    }
    if (eosSignal) {
      add("mepolizumab", `Eosinophilic phenotype${d.egpa === "confirmed" ? "; confirmed EGPA may favor an agent with an EGPA indication, using indication-specific dosing" : d.nasalPolyps === true ? "; an option with a U.S. nasal-polyposis indication" : ""}`);
      add("benralizumab", `Eosinophilic phenotype; every-8-week asthma maintenance after loading${d.egpa === "confirmed" ? "; confirmed EGPA requires its separate dosing schedule" : ""}`);
      add("depemokimab", "Eosinophilic phenotype; twice-yearly healthcare-professional-administered asthma treatment", d.historicalEosinophils !== null && d.eosinophils === null ? ["Confirm qualifying historical eosinophils were measured within the past 12 months"] : []);
    }
    if (d.eosinophils !== null && d.eosinophils >= 400) add("reslizumab", "Adult eosinophilic asthma; weight-based IV therapy when an infusion approach is suitable");
    const dup = getDupilumabEvidenceFlag(d);
    if ((eosSignal || d.feno >= 25 || d.maintenanceOcs === true) && !dup.above1500 && !["suspected", "confirmed"].includes(d.egpa)) add("dupilumab", `Type 2 / OCS-dependent asthma${d.feno >= 25 ? "; elevated FeNO" : ""}${d.nasalPolyps === true ? "; nasal polyposis" : ""}${d.atopicDermatitis === true ? "; atopic dermatitis" : ""}`);
    if (f.risk.anyExacerbation === true || d.persistentExacerbations === true || d.maintenanceOcs === true) add("tezepelumab", `Severe asthma option without a required Type 2 biomarker threshold${d.nasalPolyps === true ? "; also has a U.S. nasal-polyposis indication" : ""}`);
    return candidates;
  }

  function assessAcutePresentation(input) {
    const d = normalizeState(input), active = ["active", "recent"].includes(d.acutePresentation), triggers = [];
    if (d.urgentRedFlags === true) triggers.push("urgent red-flag features");
    if (d.acuteCyanosis === true || ["drowsy", "confused"].includes(d.acuteMentalStatus)) triggers.push("life-threatening clinical features");
    if (d.spo2 !== null && d.spo2 < 92 || d.postTreatmentSpo2 !== null && d.postTreatmentSpo2 < 92) triggers.push("SpO2 below 92%");
    if (d.respiratoryRate > 30 || d.postTreatmentRespiratoryRate > 30) triggers.push("respiratory rate above 30/min");
    if (active) {
      if (d.acuteSpeech === "unable" || d.acuteCannotDrink === true || d.acuteUnableToLieDown === true) triggers.push("unable to speak, drink, or lie down");
      if (d.acuteAirEntry === "silent") triggers.push("silent chest");
      if (d.acuteLungFunctionPercent !== null && d.acuteLungFunctionPercent < 50 || d.postTreatmentLungFunctionPercent !== null && d.postTreatmentLungFunctionPercent < 50) triggers.push("PEF / FEV1 below 50% of reference");
      if (d.acuteResponse === "worsening" || d.acuteResponse === "unchanged") triggers.push(d.acuteResponse === "worsening" ? "deterioration after treatment" : "no improvement after initial treatment");
    }
    const emergency = triggers.length > 0, lifeThreatening = d.acuteCyanosis === true || ["drowsy", "confused"].includes(d.acuteMentalStatus);
    const complete = active && ["acuteSpeech", "acuteMentalStatus", "acuteRespiratoryEffort", "acuteAccessoryMuscles", "acuteAirEntry", "acuteWheeze", "acuteLungFunctionType", "acuteLungFunctionReference"].every(key => d[key] !== "unknown") && ["acuteCanLieDown", "acuteCannotDrink", "acuteUnableToLieDown", "acuteCyanosis", "urgentRedFlags"].every(key => d[key] !== null) && d.spo2 !== null && d.respiratoryRate !== null && d.roomAir === true && d.acuteLungFunctionPercent !== null;
    const mild = complete && !emergency && d.acuteSpeech === "sentences" && d.acuteCanLieDown === true && d.acuteMentalStatus === "normal" && d.acuteRespiratoryEffort === "normal-mild" && d.respiratoryRate <= 20 && d.acuteAccessoryMuscles === "none-mild" && d.acuteAirEntry === "normal" && d.acuteWheeze === "none-mild" && d.spo2 >= 94 && d.acuteLungFunctionPercent > 70;
    const moderateFeature = d.acuteSpeech === "phrases" || d.acuteCanLieDown === false || d.acuteMentalStatus === "agitated" || d.acuteRespiratoryEffort === "increased" || d.respiratoryRate > 20 || d.acuteAccessoryMuscles === "marked" || d.acuteAirEntry === "reduced" || d.acuteWheeze === "expiratory" || d.spo2 !== null && d.spo2 < 94 || d.acuteLungFunctionPercent !== null && d.acuteLungFunctionPercent <= 70;
    const classification = emergency ? lifeThreatening ? "life-threatening features" : "severe features / inadequate response" : !active ? "no active exacerbation assessed" : mild ? "mild" : moderateFeature || complete ? "moderate" : "severity incompletely assessed";
    // These data support reassessment, not an automatic disposition decision.
    const dischargeCriteriaDocumented = active && complete && !emergency && d.acuteResponse === "improving" && d.postTreatmentMildFeatures === true && d.postTreatmentSpo2 >= 92 && d.postTreatmentRoomAir === true && d.postTreatmentRespiratoryRate !== null && d.postTreatmentRespiratoryRate <= 20 && d.postTreatmentLungFunctionPercent > 70 && d.observationMinutes >= 60 && d.homeSupport === true;
    return { active, emergency, lifeThreatening, complete, mild, moderateFeature, classification, triggers, dischargeCriteriaDocumented,
      summary: emergency ? `Urgent escalation: ${triggers.join("; ")}. Use the most severe documented feature.` : active ? `Acute exacerbation: ${classification}${complete ? "." : "; assessment is incomplete and outpatient safety / discharge readiness cannot be established."}` : "No active exacerbation was characterized." };
  }

  function pickInitialTreatment(input) {
    const d = normalizeState(input);
    if (d.symptomDays === "unknown" || d.nightWaking === "unknown") return null;
    const reduced = d.fev1Predicted !== null && d.fev1Predicted < 80, higherRisk = d.recentExacerbation === true || d.ocsExacerbations > 0 || d.hospitalExacerbations > 0 || d.priorIcu === true;
    if ((d.symptomDays === "daily" || d.nightWaking === "weekly-plus") && (reduced || higherRisk)) return "smartMedium";
    if (["four-six", "daily"].includes(d.symptomDays) || d.nightWaking === "weekly-plus" || reduced || higherRisk) return "smartLow";
    return "air";
  }

  function buildRecommendation(input, selection = {}) {
    const d = normalizeState(input), quality = assessDataQuality(d), diagnosis = assessDiagnosis(d), control = classifyControl(d), risk = classifyExacerbationRisk(d), treatment = getTreatmentContext(d), acute = assessAcutePresentation(d);
    const severe = classifySevereAsthmaState(d, control, risk), findings = { data: d, diagnosis, control, risk, treatment, severe, acute, quality, selectedBiologicId: null, proposedMedicationId: null };
    const result = { findings, summary: [], actions: [], medications: [], biologicCandidates: [], cautions: [...quality.warnings], rationale: [], sources: [], emergency: acute.emergency, invalid: quality.errors.length > 0 };
    const sourceIds = new Set(["gina"]), medIds = new Set();
    const action = (id, text, kind = "management", meds = [], sources = ["gina"]) => {
      if (result.actions.some(item => item.id === id)) return;
      result.actions.push({ id, text, kind, medicationIds: meds, sourceIds: sources });
      meds.forEach(id => medIds.add(id)); sources.forEach(id => sourceIds.add(id));
    };
    const finish = () => {
      result.medications = [...medIds].map(id => catalog.MEDICATIONS[id]).filter(Boolean);
      result.medications.forEach(med => med.sourceIds.forEach(id => sourceIds.add(id)));
      result.sources = [...sourceIds].map(id => catalog.SOURCES[id]).filter(Boolean);
      return result;
    };
    if (treatment.effectivePhase !== d.managementPhase) result.cautions.push("Initial mode was entered with existing maintenance treatment; follow-up management logic was used.");
    if (result.invalid) {
      result.cautions.unshift(...quality.errors);
      result.summary.push("Correct the measurement / data-quality errors before generating a clinical note.");
      if (acute.emergency) { result.summary.push(acute.summary); action("urgent", "Arrange urgent emergency evaluation now; do not delay escalation to correct the form.", "urgent"); }
      return finish();
    }
    result.summary.push(diagnosis.summary, treatment.description + `; reliever: ${treatment.relieverName}.`, control.summary, risk.summary);
    if (d.age === null) result.cautions.push("Age is not documented. Verify adult eligibility and age-dependent preventive care before prescribing.");
    if (treatment.incompatible) result.cautions.push("ICS-formoterol should not be used as a reliever with a controller containing a different LABA or an unidentified LABA. Resolve the combination before prescribing; use a compatible SABA / ICS-SABA reliever or change the entire controller regimen.");
    if (d.controller === "ics-formoterol" && d.icsDose === "high") result.cautions.push("Verify product-specific high-dose ICS exposure. Standard budesonide-formoterol 160/4.5 mcg, 2 inhalations twice daily is medium-dose MART, not high-dose ICS; do not exceed MART limits to establish higher treatment intensity.");
    if (d.controller === "ics" && d.reliever === "ics-formoterol") result.cautions.push("Maintenance ICS alone with a separate ICS-formoterol reliever is not a standard SMART regimen. Review the full inhaler strategy rather than labeling it maintenance-and-reliever therapy.");
    if (d.urgentRedFlags === null) result.cautions.push("Urgent red-flag symptoms have not been assessed; do not assume their absence.");
    if (acute.emergency) {
      result.summary.unshift(acute.summary);
      action("urgent", "Arrange immediate emergency transfer / acute-care escalation. Severe or life-threatening findings or deterioration take precedence over routine outpatient management.", "urgent");
      if (!acute.active) {
        action("urgent-assess", "Urgently assess the abnormal observations and cause of hypoxemia / respiratory distress. Monitor vital signs, oxygenation, and mental status; provide oxygen as clinically appropriate. Do not assume an asthma exacerbation or pursue routine treatment reduction; do not delay urgent assessment.", "urgent");
        return finish();
      }
      action("acute-saba", "While arranging transfer, give albuterol 90 mcg/actuation, 6-10 puffs by spacer (one puff at a time), or 5 mg by nebulizer; repeat every 20-30 minutes as needed while monitoring. Add ipratropium 17 mcg/actuation, 4 puffs; acute asthma use is off-label in the U.S. Do not delay transfer.", "acute");
      action("acute-oxygen", "Provide controlled oxygen when needed, targeting SpO2 92-95%; monitor vital signs and mental status.", "acute");
      action("acute-ocs", d.maintenanceOcs === true ? "Provide systemic corticosteroid treatment with an individualized total prednisone-equivalent dose accounting for the maintenance dose; avoid a duplicate prescription and do not abruptly stop chronic OCS." : "If oral treatment is feasible, give prednisone/prednisolone 40-50 mg daily for 5-7 days; arrange acute-care administration if oral treatment is not feasible.", "acute");
      if (d.pregnant === true) action("acute-pregnancy", "Coordinate obstetric care and urgently correct hypoxemia; pregnancy is not a reason to withhold necessary acute asthma treatment.", "acute");
      return finish();
    }
    if (d.controller === "triple") medIds.add("triple");
    if (d.reliever === "ics-saba") medIds.add("airsupra");
    if (treatment.airOnly) medIds.add("air");
    if (acute.active) {
      result.summary.unshift(acute.summary);
      if (!acute.complete) action("acute-assess", "Complete urgent clinical severity assessment, including speech, mental status, respiratory effort, air entry, room-air SpO2, respiratory rate, and PEF / FEV1 with its reference. Missing measurements do not establish outpatient safety.", "acute");
      if (acute.mild && d.reliever === "ics-formoterol" && !treatment.incompatible && d.controller !== "triple") action("acute-relief", "For a mild exacerbation, use budesonide-formoterol 160/4.5 mcg, 2 inhalations; repeat once after 30-60 minutes if needed, counting all maintenance / reliever inhalations toward the 12-inhalation daily limit. Alternatively, albuterol 90 mcg, 4 puffs by spacer. AIR / SMART use is guideline-supported but off-label under U.S. labeling.", "acute", ["air"]);
      else action("acute-relief", acute.mild ? "For a mild exacerbation, give albuterol 90 mcg/actuation, 4 puffs by spacer; repeat once after 30-60 minutes if needed." : "For moderate features, give albuterol 90 mcg/actuation, 4-6 puffs by spacer, or 2.5 mg by nebulizer; up to 3 treatments every 20-30 minutes in the first hour. Consider ipratropium 17 mcg/actuation, 4 puffs, up to 3 initial treatments (off-label acute asthma use). Complete severity assessment concurrently.", "acute");
      if (!acute.mild && (acute.moderateFeature || acute.complete)) action("acute-ocs", d.maintenanceOcs === true ? "Consider an individualized short-course increase in systemic corticosteroid therapy, accounting for the existing prednisone-equivalent dose and adrenal suppression risk; do not duplicate or abruptly stop maintenance OCS." : "For a moderate exacerbation, prescribe prednisone/prednisolone 40-50 mg daily for 5-7 days when clinically appropriate. A taper is usually unnecessary for a course under 2 weeks in a patient not taking chronic OCS.", "acute");
      if (acute.mild) action("acute-ocs-mild", "A corticosteroid burst is not routinely required for a promptly responding mild episode; consider it for rapid worsening, incomplete response, or a history of sudden severe exacerbations.", "acute");
      action("acute-reassess", "Reassess within the first hour or sooner if deteriorating; repeat symptoms, speech, respiratory effort, SpO2, and lung function. Escalate to acute care for severe features, deterioration, or failure to improve. Do not infer response from treatment recommendations.", "acute");
      action("acute-disposition", acute.dischargeCriteriaDocumented ? "Documented reassessment supports considering outpatient disposition, subject to clinical judgment: sustained improvement, only mild features, acceptable room-air oxygenation, lung function above 70%, home support, and 1-2 hours of observation after the last bronchodilator dose. Continue monitoring and document the actual disposition." : "Outpatient disposition / discharge readiness is not established. Confirm sustained improvement for 1-2 hours after the last bronchodilator, only mild features, SpO2 at least 92% on room air, lung function above 70%, and adequate home support before considering discharge.", "acute");
      action("acute-followup", "After stabilization, ensure ICS-containing maintenance / reliever treatment, provide a written action plan and urgent return precautions, and arrange follow-up within 2-7 days. Review triggers, adherence, and treatment response.", "followup");
      if (d.pregnant === true) action("acute-pregnancy", "Treat indicated exacerbation therapy promptly in pregnancy; prioritize adequate oxygenation and coordinate obstetric assessment as appropriate.", "acute");
      // Chronic escalation and biologic initiation are deferred until the acute episode is stabilized.
      action("postacute-controller", "After acute stabilization, reassess controller intensity. Prefer an appropriate ICS-formoterol maintenance-and-reliever regimen when suitable; change the full regimen rather than adding a second LABA. Do not use a maintenance triple inhaler as a rescue inhaler.", "management");
      return finish();
    }
    if (!diagnosis.confirmed) action("diagnostic-confirmation", diagnosis.established ? "Review prior spirometry / challenge evidence. If objective evidence remains unavailable, arrange appropriately timed repeat spirometry, serial PEF, or bronchoprovocation without automatically stopping effective ICS therapy." : "Confirm variable expiratory airflow limitation with pre/post-bronchodilator spirometry, serial PEF variability, or suitable bronchoprovocation. If clinically necessary, start ICS-containing treatment provisionally and document the plan for objective confirmation.", "testing");
    if (d.icsSideEffects === true) action("steroid-effects", "Review documented steroid adverse effects, dose and device, mouth rinsing / spacer technique, cumulative OCS exposure, and relevant drug interactions. Use the lowest effective ICS dose without withdrawing ICS protection.", "management");
    if (diagnosis.bd.available) result.rationale.push(diagnosis.bd.summary);
    if (d.clinicalIcsResponse === true && !d.icsObjectiveResponse && !d.dxIcsObjective) result.rationale.push("Subjective symptom improvement after ICS is clinically useful but does not substitute for objective airflow variability.");
    if (treatment.incompatible) action("resolve-reliever", "Resolve the controller / reliever LABA mismatch before further treatment escalation. Use a compatible SABA or albuterol-budesonide reliever, or convert the entire controller to a suitable ICS-formoterol regimen.", "management", ["airsupra"]);
    const modifiable = d.adherence === "suboptimal" || d.technique === "incorrect" || d.accessBarrier === true;
    const prerequisitesIncomplete = treatment.maintenance && (d.adherence === "unknown" || d.technique === "unknown" || d.accessBarrier === null);
    const poor = control.poor || risk.frequent || d.persistentExacerbations === true;
    if (treatment.effectivePhase === "initial") {
      const proposed = pickInitialTreatment(d);
      if (proposed) {
        findings.proposedMedicationId = proposed;
        action("start-controller", `Consider ${proposed === "air" ? "as-needed low-dose budesonide-formoterol (GINA Track 1 Steps 1-2)" : proposed === "smartLow" ? "low-dose budesonide-formoterol SMART (GINA Track 1 Step 3)" : "medium-dose budesonide-formoterol SMART (GINA Track 1 Step 4)"}, incorporating symptom burden, lung function, and exacerbation history. Confirm the exact product and shared treatment choice.`, "management", [proposed]);
      } else action("complete-initial", "Document daytime symptom frequency and night waking before assigning an initial treatment step; missing symptom history does not support a low-intensity recommendation.", "testing");
      action("track2-alternative", "If Track 1 is unavailable, unsuitable, or not preferred, use an appropriately dosed daily ICS / ICS-LABA controller with a compatible reliever; albuterol-budesonide is a practical adult U.S. reliever option. Do not use SABA-only treatment for confirmed asthma.", "alternative", ["airsupra"]);
      if (d.fev1Predicted !== null && d.fev1Predicted < 80) result.rationale.push("FEV1 below 80% predicted is used as a pragmatic signal of reduced lung function when selecting initial treatment intensity; it is not a stand-alone asthma diagnostic threshold.");
    } else if (poor && !treatment.incompatible) {
      if (modifiable || prerequisitesIncomplete) action("optimize", "Before routine escalation, review and correct inhaler technique, adherence, affordability / access, smoke and irritant exposure, obesity, rhinosinusitis, symptomatic GERD, OSA, inducible laryngeal obstruction, and medication adverse effects. Reassess after optimization; urgent clinical needs still take precedence.", "management");
      if (!modifiable) {
        let proposed = null;
        if (treatment.airOnly || d.controller === "ics" && d.icsDose === "low") proposed = "smartLow";
        else if (treatment.combination && d.icsDose === "low") proposed = "smartMedium";
        if (proposed) {
          findings.proposedMedicationId = proposed;
          action("stepup", `${prerequisitesIncomplete ? "Once technique, adherence, and access are verified, consider" : "Consider"} ${proposed === "smartLow" ? "low-dose" : "medium-dose"} budesonide-formoterol SMART for persistent inadequate control. When changing from another ICS-LABA, replace the controller rather than adding a second LABA. A suitable effective Track 2 regimen may be retained / adjusted when clinically preferred.`, "management", [proposed]);
        } else if (treatment.combination && ["medium", "high"].includes(d.icsDose)) {
          action("step5-review", d.icsDose === "medium" ? "For persistent inadequate control on medium-dose ICS-LABA / MART, consider a limited, monitored trial of higher-dose ICS-LABA or an appropriate add-on after optimization. Do not exceed the product / MART daily ceiling; plan subsequent phenotype-directed decisions rather than indefinite inhaled-dose escalation." : "Reassess persistent inadequate control despite high-dose ICS-LABA, including objective diagnosis and treatment optimization; review phenotype-directed add-on therapy and cumulative steroid exposure.", "management", d.icsDose === "medium" ? ["highDose"] : []);
          if (d.lamaAddon !== true && d.controller !== "triple") action("lama", "Consider adding tiotropium when appropriate; LAMA provides modest lung-function / exacerbation benefit and is not a reliever. Verify existing LAMA exposure first.", "management", ["tiotropium"]);
        } else action("clarify-regimen", "Clarify the maintenance controller, ICS dose intensity, and reliever before assigning an escalation step. Treating severe symptoms does not need to wait for form completion.", "testing");
      }
    } else if (control.complete && control.classification === "well controlled") {
      action("continue", "Continue the effective ICS-containing regimen while reviewing adherence, technique, future exacerbation risk, adverse effects, and treatment preferences. Do not change an effective Track 2 regimen solely to change tracks.");
      const eligible = risk.complete && !risk.anyExacerbation && d.recentExacerbation === false && d.stableMonths >= 3 && d.lungFunctionStable === true && d.pregnant === false && d.respiratoryInfection === false && d.travelling === false && d.maintenanceOcs === false;
      if (eligible && treatment.maintenance && !treatment.incompatible && d.icsDose !== "unknown") {
        const smart = d.controller === "ics-formoterol";
        const regimen = smart && treatment.track === 1 && treatment.step === "4" ? "If using budesonide-formoterol, reduce medium-dose SMART to 160/4.5 mcg, 1 inhalation twice daily plus 1 as needed (maximum 12 total inhalations/day)." : smart && treatment.track === 1 && treatment.step === "3" ? "If using budesonide-formoterol, consider 160/4.5 mcg, 1 maintenance inhalation once daily plus 1 as needed (maximum 12 total inhalations/day). Reassess control and future risk before a later reduction to as-needed-only ICS-formoterol." : "Reduce the maintenance ICS dose by about 25-50% using an available product-specific regimen; retain ICS protection, review the ongoing need for add-ons, and provide a compatible reliever.";
        action("stepdown", `With control sustained for at least 3 months and stable lung function, consider a supervised step-down: ${regimen} Record baseline symptoms / lung function, provide a written return-to-prior-treatment plan, and reassess in 4-8 weeks. Do not completely withdraw ICS.`, "management", smart && treatment.track === 1 && treatment.step === "4" ? ["smartLow"] : []);
        if (d.priorIcu === true || risk.elevated) result.cautions.push("Prior life-threatening asthma or another future-risk factor warrants particularly close supervision if reducing treatment despite current symptom stability.");
      } else action("stepdown-conditional", "Consider step-down only after sustained control for at least 3 months, stable lung function, and review of recent exacerbations, pregnancy, infection, travel, steroid exposure, and prior life-threatening events. Continue current ICS protection until these conditions are established.", "monitoring");
      if (!["unknown", "none"].includes(d.currentBiologic)) action("stable-biologic", "For a good biologic response, review systemic steroid / add-on burden before reducing inhaled therapy. Taper chronic OCS cautiously with adrenal-risk assessment; do not automatically stop the biologic or withdraw ICS.", "management");
    } else {
      action("complete-control", "Complete symptom-control and exacerbation-risk assessment before concluding that current therapy is sufficient or stepping down. Maintain appropriate ICS protection while completing the assessment.", "testing");
    }
    if (!findings.proposedMedicationId && (d.controller === "saba-only" || d.controller === "none" && d.reliever === "saba")) action("ics-protection", "For confirmed asthma, replace SABA-only treatment with an ICS-containing strategy; select intensity using symptom burden, lung function, and exacerbation history.");
    result.biologicCandidates = getBiologicCandidates(d, findings);
    const phenotypeNeeded = poor && treatment.combination && ["medium", "high"].includes(d.icsDose);
    if (phenotypeNeeded) {
      sourceIds.add("severe");
      const phenotypeAvailable = d.eosinophils !== null || d.historicalEosinophils !== null || d.feno !== null || d.perennialSensitization === true;
      if (!phenotypeAvailable) action("phenotype-testing", "Prioritize blood eosinophils, FeNO, total IgE, and allergic phenotype testing now so subsequent Step 5 add-on decisions can be made efficiently if control remains inadequate on optimized high-dose ICS-LABA.", "testing");
      else if (!severe.established) action("future-biologic", `If control remains inadequate after optimized high-dose ICS-LABA, consider phenotype-matched biologic therapy at follow-up${result.biologicCandidates.length ? `; current data support reviewing ${result.biologicCandidates.map(item => item.name.split(" (")[0]).join(", ")}` : "; expand targeted testing to clarify suitable options"}. Current findings do not by themselves establish immediate severe-asthma eligibility.`, "management");
      else action("biologic-review", "The phenotype and optimized high-dose treatment context support considering a suitable biologic. Review individual eligibility, dosing, comorbidities, route / interval, patient preference, and payer requirements; document the selected treatment before ordering.", "management");
      if (severe.established && d.eosinophils !== null && d.eosinophils < 150 && d.feno !== null && d.feno < 25 && d.perennialSensitization === false) action("azithromycin-review", "For persistent symptoms despite optimized high-dose ICS-LABA, consider a monitored long-term azithromycin trial when appropriate, after mycobacterial screening, ECG/QTc, hearing and drug-interaction review, and discussion of antimicrobial resistance. This is not routine antibiotic treatment for exacerbations.", "management", ["azithromycin"], ["severe"]);
      if (d.egpa === "suspected") action("egpa-workup", "Evaluate suspected EGPA before attributing eosinophilia and systemic features solely to asthma or selecting a biologic. Suspected disease is not a confirmed comorbidity indication.", "testing");
      if (d.egpa === "confirmed") action("egpa-care", "Coordinate treatment of confirmed EGPA using its indication-specific regimen; asthma dosing must not be substituted for EGPA dosing.", "management");
      const dup = getDupilumabEvidenceFlag(d); if (dup.caution) result.cautions.push(dup.caution);
      if (d.allergenDriven === true && d.perennialSensitization !== true) result.cautions.push("Allergen-driven symptoms are documented without objective sensitization confirmation; obtain skin prick testing or serum specific IgE testing before considering omalizumab.");
      const selected = result.biologicCandidates.find(item => item.id === selection.selectedBiologicId);
      if (selected) {
        findings.selectedBiologicId = selected.id;
        const existing = !["none", "unknown"].includes(d.currentBiologic);
        action("selected-biologic", existing ? `Clinician-selected option: ${selected.name}. Review response to ${d.currentBiologic}${d.biologicMonths === null ? "" : ` after ${d.biologicMonths} months`}, eligibility, and a coordinated single-biologic strategy before any change; do not combine biologics routinely.` : selected.ready ? `Plan to initiate clinician-selected ${selected.name} after shared decision-making, authorization, and product safety review.` : `Consider clinician-selected ${selected.name} after completing prerequisites: ${selected.prerequisites.join("; ")}. Do not initiate solely from this provisional match.`, "management", [selected.id], ["severe"]);
        action("biologic-monitor", selected.id === "depemokimab" ? "Review clinical response to depemokimab over about 6 months, including control, exacerbations, lung function, and steroid exposure; its long dosing interval requires an appropriate assessment window." : "Review biologic response after about 4 months using symptoms, exacerbations, lung function, and steroid burden; extend the trial to 6-12 months if benefit remains uncertain before declaring failure.", "monitoring", [], ["severe"]);
      }
    }
    if (!acute.active) action("routine-followup", poor || treatment.effectivePhase === "initial" ? "Arrange follow-up in about 4-6 weeks after treatment initiation / adjustment, sooner for deterioration; reassess symptoms, exacerbations, adherence, technique, adverse effects, and lung function as appropriate." : "Arrange routine follow-up in about 3 months; use an earlier 4-8-week review after step-down or another treatment change.", "followup");
    action("technique-counsel", "Review inhaler technique with demonstration / teach-back, adherence, access, and spacer use where appropriate.", "counseling");
    action("action-plan", "Provide or update a written asthma action plan describing usual treatment, early worsening treatment, reliever limits, and when to return to the prior regimen or seek urgent care. Seek emergency care for severe breathlessness, inability to speak, cyanosis, altered mental status, or poor response to rescue treatment.", "counseling");
    action("nonpharmacologic", `Discuss exposure reduction and regular activity as tolerated; address relevant obesity, rhinosinusitis, symptomatic reflux, OSA, and other contributors${d.smoking === "current" ? "; offer smoking cessation counseling and pharmacotherapy" : ""}.`, "counseling");
    const vaccine = (key, text, eligible = true, sources = ["cdc"]) => {
      if (!eligible || d[key] === "complete") return;
      action(`vaccine-${key}`, `${d[key] === "unknown" ? "Review vaccination records; if due, " : "If not already administered, "}${text}`, "prevention", [], sources);
    };
    if (!diagnosis.supported) action("vaccine-diagnostic", "Asthma is not yet confirmed. Base preventive vaccination decisions on current local protocol and the CDC schedule, including age and other qualifying conditions, rather than assuming an asthma-specific indication.", "prevention", [], ["cdc"]);
    vaccine("flu", "offer current-season influenza vaccination per local / CDC guidance.");
    vaccine("covid", "discuss current COVID-19 vaccination recommendations and individual decision-making under the current CDC schedule.");
    vaccine("pneumococcal", "use the current CDC pneumococcal schedule based on age, chronic lung disease, and prior vaccine products / intervals.", d.age !== null && (d.age >= 50 || d.age >= 19 && diagnosis.supported), ["cdc", "pneumococcal"]);
    vaccine("rsv", "consider a single RSV vaccine dose (not an annual dose) according to current age / risk guidance and prior RSV vaccination.", d.age !== null && (d.age >= 75 || d.age >= 50 && diagnosis.supported), ["cdc", "rsv"]);
    vaccine("zoster", "complete the 2-dose recombinant zoster series as indicated.", d.age !== null && d.age >= 50);
    vaccine("tdap", "review the primary tetanus series, at least one Tdap dose, 10-year Td / Tdap boosters, and pregnancy-specific Tdap timing.");
    result.rationale.push("Symptoms and future exacerbation risk are assessed separately. Unknown answers are not negative findings.", "GINA treatment tracks are guideline pathways; U.S. labeling and pragmatic alternatives are stated separately. No free-text medication entry changes dosing or classification.");
    return finish();
  }

  return { createEmptyState, normalizeState, assessDataQuality, getBronchodilatorAssessment, assessDiagnosis, classifyControl, classifyExacerbationRisk, getTreatmentContext, classifySevereAsthmaState, assessAcutePresentation, getDupilumabEvidenceFlag, getOmalizumabFeasibility, getBiologicCandidates, pickInitialTreatment, buildRecommendation, MEDICATIONS: catalog.MEDICATIONS, SOURCES: catalog.SOURCES };
});
