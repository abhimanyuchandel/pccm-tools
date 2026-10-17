(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.sarcoidosisWorkflow = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const conventional = ["methotrexate", "azathioprine", "leflunomide", "mycophenolate", "hydroxychloroquine"];
  function steps(d, r) {
    const drug = r.activeDrug, selectedDrug = conventional.includes(drug) || ["prednisone", "infliximab", "adalimumab"].includes(drug);
    const out = [];
    const add = (id, chapter, title, hint, sections, extra = {}) => out.push({ id, chapter, title, hint, sections, fields: sections.flatMap(s => s.fields || []), ...extra });
    const section = (id, title, fields = [], extra = {}) => ({ id, title, fields, ...extra });
    const snapshot = [
      section("diagnostic-summary", "Diagnostic background", ["diagnosisSummary"]),
      section("current-treatment", "Current systemic treatment", ["currentPred", "currentDmard", "currentTnf"], { noTreatment: true }),
      ...(d.currentPred === true ? [section("current-steroid", "Current steroid dose", ["currentPredDose"])] : []),
      section("warning-summary", "New warning symptoms", ["warningReview"]),
      ...(d.warningReview === "concern" || r.emergency ? [section("warning-details", "Which warning symptoms are present?", ["urgentResp", "urgentCardiac", "urgentNeuro", "urgentVisual", "urgentCalcium"], { negative: true })] : []),
      section("visit-details", "Optional: demographics and diagnostic details", ["age", "gender", "context", "diagnosisDate", ...(d.diagnosticBasis === "biopsy" ? ["biopsyMethod", "pathology"] : d.diagnosticBasis === "clinical" ? ["clinicalPattern"] : []), "compatible", "mimics"], { optional: true, reference: "diagnosis" }),
      section("existing-schedules", "Optional: current medication schedules", [...(d.currentPred === true ? ["currentSteroid", "predMonths"] : []), ...(conventional.includes(d.currentDmard) ? ["currentDmardDose", "currentDmardFrequency", "currentDmardRoute"] : []), ...(["infliximab", "adalimumab"].includes(d.currentTnf) ? ["currentTnfDose", "currentTnfInterval"] : [])], { optional: true }),
    ];
    add("context", "Visit", "Visit snapshot", "Start with the diagnosis, current treatment and any new warning symptoms.", snapshot);
    const interval = [
      section("symptoms", "Symptoms since the last visit", ["dyspnea", "cough", "fatigue", "limitation"], { symptoms: true }),
      section("course", "Overall course and disease assessment", ["trajectory", "activity"], { reference: "activity" }),
      section("course-details", "Optional: treatment response and other contributors", ["qol", "response", "relapse", "stableMonths", "treatmentMonths", "adherence", "toxicity", "infection", "alternativeCause", "phConcern"], { optional: true }),
      section("organ-details", "Optional: known or suspected organ involvement", ["cardiac", "ocular", "neuro", "renal", "hepatic", "skin", "joints"], { optional: true, organNegative: true, reference: "screening" }),
      section("study-histories", "Optional: PFT, walk test, echo and CT histories", [], { optional: true, studies: true }),
      section("objective-details", "Optional: imaging interpretation and current oxygen findings", ["imaging", "imagingTrend", "stage", "oxygen", "spo2", "oxygenConditions", "calcium"], { optional: true, reference: "advanced" }),
    ];
    add("interval", "Assessment", "Interval assessment", "Record the findings that matter today. Unchecked symptoms remain undocumented unless you explicitly review them as absent.", interval);
    const management = [section("strategy", "Choose the management plan", ["strategy"], { decision: true })];
    if (selectedDrug) management.push(section("indication", "Main reason for systemic treatment", ["indication", ...(drug === "hydroxychloroquine" ? ["supportingIndication"] : [])]));
    if (d.strategy === "alternative") management.push(section("agent", "Alternative steroid-sparing medication", ["targetDmard"]));
    if (d.strategy === "biologic") management.push(section("agent", "TNF inhibitor and treatment phase", ["targetTnf", ...(selectedDrug ? ["tnfPhase"] : [])]));
    if (selectedDrug) {
      if (d.currentDmard !== "none" && d.currentDmard !== "unknown" && d.currentDmard !== drug) management.push(section("transition", "Existing steroid-sparing medication", ["transition"]));
      if (!["none", "unknown"].includes(d.currentTnf) && !["infliximab", "adalimumab"].includes(drug)) management.push(section("background-tnf", "Existing TNF inhibitor", ["backgroundTnf"]));
      if (["infliximab", "adalimumab"].includes(drug) && !["none", "unknown", drug].includes(d.currentTnf)) management.push(section("tnf-switch", "Avoid TNF overlap", ["tnfSwitch"]));
      if (d.currentPred === true && ["methotrexate", "alternative", "biologic"].includes(d.strategy)) management.push(section("steroid-background", "Existing prednisone / prednisolone plan", ["backgroundPred"]));
      management.push(section("prescription", "Selected medication schedule", [
        ...(["prednisone", "bridge"].includes(d.strategy) ? ["predDose", "predWeeks"] : []),
        ...(conventional.includes(drug) ? ["dmardDose", "dmardTarget", ...(drug === "hydroxychloroquine" ? [] : ["titrationWeeks"]), ...(drug === "methotrexate" ? ["mtxRoute"] : [])] : []),
        ...(["infliximab", "adalimumab"].includes(drug) ? ["tnfDose", "tnfInterval"] : []),
        ...(["hydroxychloroquine", "infliximab"].includes(drug) ? ["weight"] : []), "initiationTiming",
      ], { preset: true, drug, plan: true }));
      management.push(section("prescribing-reminders", "Prescribing considerations", [], { safetyDrug: drug, reference: drug === "prednisone" ? "taper" : undefined }));
    }
    if (d.strategy === "taper" || d.currentPred === true && d.backgroundPred === "taper" && ["methotrexate", "alternative", "biologic"].includes(d.strategy)) management.push(section("taper", "Selected prednisone taper", ["taperDose1", "taperWeeks1", "taperDose2", "taperWeeks2", "taperDose3", "taperWeeks3"], { reference: "taper" }));
    if (selectedDrug || r.findings.currentAny || d.strategy === "taper") management.push(section("safety-details", "Optional: document a specific prescribing concern", [
      "infection", "toxicity", "cbcSafe", "liverSafe", "renalReviewed", "renalFunction", "reproductive", "interactions", "hepatitis", "exposure",
      ...(drug === "methotrexate" || d.currentDmard === "methotrexate" ? ["tmpSmx"] : []),
      ...(drug === "azathioprine" ? ["thiopurine", "xanthine"] : []),
      ...(["infliximab", "adalimumab", "leflunomide"].includes(drug) ? ["tb"] : []),
      ...(["infliximab", "adalimumab"].includes(drug) || !["none", "unknown"].includes(d.currentTnf) ? ["refractory", "heartFailure", "demyelination"] : []),
      ...(drug === "hydroxychloroquine" || d.currentDmard === "hydroxychloroquine" ? [...(drug === "hydroxychloroquine" ? [] : ["supportingIndication"]), "eyePlan", "hcqCardiacSafe"] : []),
      ...(["cardiac", "ocular", "neuro"].some(k => d[k] === "suspected") ? ["organSafety"] : []), "predMonths", "adrenalReview",
    ], { optional: true }));
    add("management", "Management", "Choose the course of management", "Choose the plan for today. Open a reference or dosing details only when needed.", management);
    const care = ["careLabs", "careEye", "careEcg", "careVaccines", "carePft", "careActivity", "careRehab"];
    if (d.currentPred === true || ["prednisone", "bridge", "taper"].includes(d.strategy)) care.push("careBone");
    if (r.findings.immune) care.push("carePjp");
    if (d.trajectory === "worse" || d.activity === "uncertain" || d.fatigue === true) care.push("careContributors");
    if (r.findings.advanced) care.push("careAdvanced", "careOxygen");
    const organActions = { cardiac: "careCardiac", ocular: "careOcular", neuro: "careNeuro", renal: "careRenal", hepatic: "careHepatic", skin: "careSkin", joints: "careJoints" };
    Object.entries(organActions).forEach(([key, action]) => { if (["suspected", "confirmed"].includes(d[key])) care.push(action); });
    const prevention = [section("care-actions", "Select actions to include in the plan", care, { actions: true }),
      ...(d.careAdvanced ? [section("advanced", "Advanced pulmonary care", ["advancedPlan"], { reference: "advanced" })] : []),
      section("screening-details", "Optional: screening and prevention records", ["eyeScreen", "ecgScreen", "cbcScreen", "calciumScreen", "renalScreen", "alpScreen", "bonePlan", "pjp", "smoking", ...(d.smoking === "current" ? ["cessation"] : [])], { optional: true, reference: "screening" }),
      section("vaccine-details", "Optional: vaccination records and specific schedules", ["flu", "covid", "pneumococcal", "rsv", "zoster", "tdap", "hepatitisVaccine", "vaccinePlan", ...(d.vaccinePlan === "give" ? ["vaccineReviewed", "vaccineImmune", "chronicLungRisk", ...(d.pneumococcal === "due" ? ["pneumococcalHistory", "pneumococcalProduct"] : [])] : [])], { optional: true, reference: "vaccines" }),
    ];
    add("prevention", "Care", "Monitoring and prevention", "Choose the actions needed today. Unchecked items are omitted from the note, not documented as completed or unnecessary.", prevention);
    add("followup", "Review", "Review the selected plan and create the note", "Check the plan, set follow-up and generate your editable SOAP draft.", [
      section("followup", "Follow-up", ["followupWeeks"]),
      ...(selectedDrug || r.findings.currentAny || d.strategy === "taper" ? [section("confirmation", "One overall prescribing review", ["prescriptionReviewed"], { confirmation: true })] : []),
    ], { review: true, plan: Boolean(drug), blockers: Boolean(drug) || d.strategy === "taper" });
    return out;
  }
  function reconcileStep(id, next) { return next.some(s => s.id === id) ? id : next[0].id; }
  function choices(d, r) {
    if (r.emergency) return [{ value: "reassess", title: "Prioritize urgent assessment", why: "Document urgent evaluation before routine outpatient treatment." }];
    const out = [];
    const add = (value, title, why) => { if (!out.some(x => x.value === value)) out.push({ value, title, why }); };
    if (d.diagnosis === "uncertain" || d.activity === "uncertain") add("reassess", "Clarify the cause before escalating", "Resolve diagnostic uncertainty, infection, toxicity or other contributors to symptoms.");
    if (r.findings.currentAny) add("continue", "Continue current treatment", "Reasonable when benefit is maintained and there is no unresolved safety concern.");
    else add("observe", "Observe without systemic treatment", "For established disease without important organ threat or unacceptable symptom burden.");
    if (d.currentPred === true) {
      if (["controlled", "inactive"].includes(d.activity) || ["improved", "stable"].includes(d.response)) add("taper", "Reduce prednisone exposure", "Use a response-guided taper, accounting for relapse and adrenal suppression.");
      add("methotrexate", "Add methotrexate / reduce steroid reliance", "A steroid-sparing option when ongoing treatment is needed; plan the existing steroid separately.");
    } else if (["active", "mixed"].includes(d.activity)) {
      add("prednisone", "Start prednisone", "Generally faster symptom control for treatment-requiring pulmonary inflammation.");
      add("methotrexate", "Start methotrexate", "An option for selected pulmonary patients; response is slower and this is not organ-threatening rescue therapy.");
    }
    return out.slice(0, 4);
  }
  return { steps, reconcileStep, choices };
});
