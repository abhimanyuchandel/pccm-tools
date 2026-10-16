(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.sarcoidosisWorkflow = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  function steps(d, r) {
    const out = [];
    const add = (id, chapter, title, fields = [], extra = {}) => out.push({ id, chapter, title, fields, ...extra });
    add("context", "Encounter", "Start with the follow-up", ["context", "age", "gender"]);
    add("safety", "Encounter", "New warning symptoms", ["urgentResp", "urgentCardiac", "urgentNeuro", "urgentVisual", "urgentCalcium"], { negative: true, hint: "Answer from today's history. The negative shortcut applies only to these five reviewed findings." });
    add("diagnosis", "Diagnosis", "How was sarcoidosis diagnosed?", ["diagnosis", "diagnosticBasis", "diagnosisDate"], { reference: "diagnosis" });
    if (d.diagnosticBasis === "biopsy") add("pathology", "Diagnosis", "Available tissue evidence", ["biopsyMethod", "pathology", "compatible", "mimics"], { reference: "diagnosis" });
    else add("diagnostic-context", "Diagnosis", "Clinical diagnostic context", [...(d.diagnosticBasis === "clinical" ? ["clinicalPattern"] : []), "compatible", "mimics"], { reference: "diagnosis" });
    add("current", "Treatment", "Current systemic treatment", ["currentPred", "currentDmard", "currentTnf"], { noTreatment: true });
    if (d.currentPred === true) add("current-steroid", "Treatment", "Current steroid exposure", ["currentSteroid", "currentPredDose", "predMonths"], { reference: "taper" });
    if (!["none", "unknown", "other"].includes(d.currentDmard)) add("current-dmard", "Treatment", "Reconciled conventional prescription", ["currentDmardDose", "currentDmardFrequency", "currentDmardRoute"]);
    if (!["none", "unknown", "other"].includes(d.currentTnf)) add("current-tnf", "Treatment", "Reconciled TNF prescription", ["currentTnfDose", "currentTnfInterval"]);
    if (r.findings.currentAny) add("response", "Treatment", "Response and tolerability", ["treatmentMonths", "response", "adherence", "toxicity"]);
    add("symptoms", "Course", "Interval symptoms and function", ["dyspnea", "cough", "fatigue", "limitation"], { negative: true });
    add("course", "Course", "What has changed?", ["trajectory", "qol", "relapse", "stableMonths"]);
    add("available-data", "Course", "Available investigation histories", ["includePft", "includeWalk", "includeEcho", "includeCt", "oxygen"], { hint: "Add dated results or paste a previous table. Testing is optional; do not repeat studies solely to complete this form. Unchecking a history hides its editor, not its saved results." });
    if (d.includePft) add("pft", "Course", "Pulmonary function over time", [], { study: "pft", reference: "activity" });
    if (d.includeWalk) add("walk", "Course", "Six-minute walk results over time", [], { study: "walk", reference: "advanced" });
    if (d.includeEcho) add("echo", "Course", "Echocardiography over time", [], { study: "echo" });
    if (d.includeCt) add("ct", "Course", "Chest CT / HRCT over time", [], { study: "ct" });
    if (d.includePft || d.includeCt || d.studies?.records.ct.length) add("imaging", "Course", "Clinical imaging interpretation", ["imaging", "imagingTrend", "stage"], { reference: "activity", hint: "Your interpretation is separate from the reported CT text. Imaging alone does not establish active inflammation or a treatment indication." });
    if (d.includePft || d.includeWalk || ["exertion", "rest"].includes(d.oxygen) || d.trajectory === "worse") add("oxygen", "Course", "Today's available resting oxygen observations", ["spo2", "oxygenConditions"], { reference: "advanced", hint: "These are current encounter observations, not historical walk-test measurements. Leave unavailable measurements blank." });
    add("organs", "Screening", "Cardiac, eye and neurologic review", ["cardiac", "ocular", "neuro"], { organNegative: true, reference: "screening" });
    add("systemic", "Screening", "Other organ involvement", ["renal", "hepatic", "skin", "joints"], { organNegative: true });
    if (d.renal === "suspected" || d.renal === "confirmed" || d.urgentCalcium === true) add("calcium-safety", "Screening", "Renal and calcium safety", ["urgentCalcium", "calcium", "renalFunction"]);
    add("screening", "Screening", "Baseline screening records", ["eyeScreen", "ecgScreen", "cbcScreen"], { reference: "screening" });
    add("annual", "Screening", "Baseline and annual surveillance", ["calciumScreen", "renalScreen", "alpScreen"], { reference: "screening" });
    add("activity", "Decisions", "Assess activity and treatment need", ["activity", "indication", "infection", "alternativeCause"], { reference: "activity" });
    if (["cardiac", "ocular", "neuro"].some(k => d[k] === "suspected")) add("organ-safety", "Decisions", "Coordinate a new high-risk organ concern", ["organSafety"], { reference: "screening" });
    add("ph-review", "Decisions", "Disproportionate breathlessness / advanced disease", ["phConcern"], { reference: "advanced" });
    add("strategy", "Decisions", "Select the encounter treatment plan", ["strategy"], { reference: "treatment", decision: true });
    if (d.strategy === "alternative") add("agent", "Prescribing", "Choose a conventional alternative", ["targetDmard", ...(d.targetDmard === "hydroxychloroquine" ? ["supportingIndication"] : [])], { reference: "treatment" });
    if (d.strategy === "biologic") add("biologic", "Prescribing", "Refractory-disease treatment", ["targetTnf", "refractory", "tnfPhase", ...(d.currentTnf !== "none" && d.currentTnf !== "unknown" && d.currentTnf !== d.targetTnf ? ["tnfSwitch"] : [])]);
    const drug = r.activeDrug;
    if (drug && !["unknown", "none"].includes(drug)) {
      if (d.currentDmard !== "none" && d.currentDmard !== "unknown" && d.currentDmard !== drug) add("transition", "Prescribing", "Coordinate existing treatment", ["transition", ...(d.currentTnf !== "none" && ["methotrexate", "azathioprine", "leflunomide", "mycophenolate", "hydroxychloroquine"].includes(drug) ? ["refractory"] : [])]);
      if (!["none", "unknown"].includes(d.currentTnf) && !["infliximab", "adalimumab"].includes(drug)) add("background-tnf", "Prescribing", "Coordinate existing TNF treatment", ["backgroundTnf"]);
      add("prescription", "Prescribing", "Choose and review the schedule", [
        ...(["prednisone", "bridge"].includes(d.strategy) ? ["predDose", "predWeeks"] : []),
        ...(["methotrexate", "azathioprine", "leflunomide", "mycophenolate", "hydroxychloroquine"].includes(drug) ? ["dmardDose", "dmardTarget", ...(drug === "hydroxychloroquine" ? [] : ["titrationWeeks"]), ...(drug === "methotrexate" ? ["mtxRoute"] : [])] : []),
        ...(["infliximab", "adalimumab"].includes(drug) ? ["tnfDose", "tnfInterval"] : []),
      ], { drug, preset: true });
      add("infection-safety", "Prescribing", "Infection and interaction safety", ["infection", "toxicity", "exposure", "interactions"]);
      if (drug !== "prednisone") {
        add("lab-safety", "Prescribing", "Laboratory and organ-function review", ["cbcSafe", "liverSafe", "renalReviewed", ...(drug === "methotrexate" ? ["renalFunction"] : [])]);
        add("hepatitis-safety", "Prescribing", "Viral-hepatitis and reproductive safety", ["hepatitis", "reproductive"]);
      } else add("reproductive", "Prescribing", "Drug-specific reproductive review", ["reproductive"]);
      if (drug === "methotrexate") add("mtx-safety", "Prescribing", "Methotrexate-specific safety", ["tmpSmx"], { drug });
      if (drug === "azathioprine") add("aza-safety", "Prescribing", "Azathioprine-specific safety", ["thiopurine", "xanthine"], { drug });
      if (drug === "leflunomide") add("leflunomide-safety", "Prescribing", "Leflunomide-specific safety", ["tb"], { drug });
      if (drug === "hydroxychloroquine") add("hcq-safety", "Prescribing", "Weight and retinal/cardiac safety", ["weight", "eyePlan", "hcqCardiacSafe"], { drug });
      if (["infliximab", "adalimumab"].includes(drug)) add("tnf-safety", "Prescribing", "TNF-specific safety", ["tb", "heartFailure", "demyelination", ...(drug === "infliximab" ? ["weight"] : [])], { drug });
    }
    if (d.currentPred === true && ["methotrexate", "alternative", "biologic"].includes(d.strategy)) add("steroid-background", "Prescribing", "Plan for existing prednisone", ["backgroundPred"], { reference: "taper" });
    if (d.strategy === "taper" || d.backgroundPred === "taper" && d.currentPred === true && ["methotrexate", "alternative", "biologic"].includes(d.strategy)) {
      add("taper", "Prescribing", "Prednisone taper stages", ["taperDose1", "taperWeeks1", "taperDose2", "taperWeeks2", "taperDose3", "taperWeeks3"], { reference: "taper" });
      add("taper-review", "Prescribing", "Taper safety review", ["predMonths", "adrenalReview"], { reference: "taper", blockers: true });
    }
    // Existing treatment still needs safety review when no new drug is selected.
    if (r.findings.currentAny && !drug) add("current-safety", "Prevention", "Existing treatment safety", ["infection", "toxicity", "reproductive", ...(d.currentDmard === "methotrexate" ? ["tmpSmx", "renalFunction"] : [])]);
    if (d.currentDmard === "hydroxychloroquine" && !drug) add("current-hcq", "Prevention", "Existing hydroxychloroquine surveillance", ["weight", "eyePlan", "hcqCardiacSafe"], { drug: "hydroxychloroquine" });
    if (r.findings.immune) add("prophylaxis", "Prevention", "Infection-risk prevention", ["pjp"], { reference: "protection" });
    if (d.currentPred === true || ["prednisone", "bridge", "taper"].includes(d.strategy)) add("bone", "Prevention", "Steroid adverse-effect prevention", ["bonePlan"], { reference: "protection" });
    add("vaccine-status", "Prevention", "Vaccination history", ["flu", "covid", "pneumococcal", "rsv"], { reference: "vaccines" });
    add("vaccine-plan", "Prevention", "Other vaccines and the selected plan", ["zoster", "tdap", "hepatitisVaccine", "vaccinePlan"], { reference: "vaccines" });
    if (d.vaccinePlan === "give") {
      add("vaccine-eligibility", "Prevention", "Confirm the selected vaccination plan", ["vaccineReviewed", "vaccineImmune", ...(["pneumococcal", "rsv"].some(k => d[k] === "due") ? ["chronicLungRisk"] : [])], { reference: "vaccines" });
      if (d.pneumococcal === "due") add("pneumococcal", "Prevention", "Select a pneumococcal schedule", ["pneumococcalHistory", "pneumococcalProduct"], { reference: "vaccines" });
    }
    add("support", "Prevention", "Function and tobacco exposure", ["rehab", "smoking"]);
    if (d.smoking === "current") add("cessation", "Prevention", "Selected cessation support", ["cessation"]);
    if (r.findings.advanced) add("advanced", "Prevention", "Advanced pulmonary care plan", ["advancedPlan"], { reference: "advanced" });
    if (drug && !["unknown", "none"].includes(drug)) add("prescription-confirm", "Review", "Confirm this selected prescription", ["prescriptionReviewed"], { drug, blockers: true });
    add("followup", "Review", "Follow-up and final review", ["followupWeeks"], { review: true });
    return out;
  }
  function reconcileStep(id, next, previous = []) {
    if (next.some(s => s.id === id)) return id;
    for (let i = previous.findIndex(s => s.id === id) - 1; i >= 0; i--) if (next.some(s => s.id === previous[i].id)) return previous[i].id;
    return next[0].id;
  }
  return { steps, reconcileStep };
});
