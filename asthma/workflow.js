(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.asthmaWorkflow = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  function steps(d, rec, options = {}) {
    const out = [];
    const add = (id, chapter, title, fields, extra = {}) => out.push({ id, chapter, title, fields, ...extra });
    const acute = d.acutePresentation === "active" || rec.findings.acute.emergency;
    add("context", "Encounter", "Start with the encounter", ["managementPhase", "acutePresentation", "age", "gender", "urgentRedFlags"]);
    add("treatment", "Treatment", "What is the patient taking?", ["treatmentEntry"], { shortcuts: true, reference: "air-smart-reference" });
    if (d.treatmentEntry === "product") {
      add("current-product", "Treatment", "Current inhaled controller", ["currentControllerProduct", "currentControllerPreset"], { currentProduct: true });
      const preset = options.inhalers?.getPreset(d.currentControllerPreset);
      if (preset?.role === "maintenance" || !preset || preset.productId !== d.currentControllerProduct) {
        add("current-reliever", "Treatment", "Current reliever", ["currentRelieverProduct", ...(d.currentRelieverProduct === "unknown" ? ["reliever"] : [])], { hint: "Choose a verified product, or record only its category if the exact inhaler is unavailable." });
      }
      if (preset?.intensity === "unknown" && preset.role === "maintenance") add("current-intensity", "Treatment", "Confirm controller ICS intensity", ["icsDose"], { reference: "ics-dose-reference", hint: "This product's dose category is not assigned automatically. Verify the formulation and scheduled daily dose, or leave it unclassified." });
    } else {
      add("current-classes", "Treatment", "Current controller and reliever categories", ["controller", "reliever"]);
      if (["ics", "ics-formoterol", "ics-laba", "triple"].includes(d.controller)) add("current-intensity", "Treatment", "Current scheduled ICS dose", ["icsDose", ...(["ics-laba", "triple"].includes(d.controller) ? ["labaType"] : [])], { reference: "ics-dose-reference" });
    }
    add("additional-treatment", "Treatment", "Additional maintenance treatment", ["lamaAddon", "maintenanceOcs", "currentBiologic"]);
    if (d.maintenanceOcs === true || !["none", "unknown"].includes(d.currentBiologic)) add("additional-duration", "Treatment", "Current add-on exposure", [...(d.maintenanceOcs === true ? ["maintenanceOcsDose"] : []), ...(!["none", "unknown"].includes(d.currentBiologic) ? ["biologicMonths"] : [])]);
    if (acute) {
      add("acute-observations", "Acute care", "Initial respiratory observations", ["respiratoryRate", "spo2", "roomAir", "acuteSpeech"], { hint: "Use the most severe documented feature. Missing observations cannot establish mild severity or safe discharge." });
      add("acute-danger", "Acute care", "Acute safety assessment", ["acuteMentalStatus", "acuteAirEntry", "acuteCyanosis", "acuteCannotDrink", "acuteUnableToLieDown"]);
      add("acute-effort", "Acute care", "Breathing effort and position", ["acuteRespiratoryEffort", "acuteAccessoryMuscles", "acuteWheeze", "acuteCanLieDown"]);
      add("acute-function", "Acute care", "Available acute lung function", ["acuteLungFunctionPercent", "acuteLungFunctionType", "acuteLungFunctionReference"]);
      add("acute-reassessment", "Acute care", "Are actual reassessment findings available?", ["acuteReassessmentAvailable"], { hint: "Leave unchecked if treatment has not yet been reassessed. Guidance can still be generated." });
      if (d.acuteReassessmentAvailable === true) {
        add("acute-response", "Acute care", "Observed response after treatment", ["acuteResponse", "postTreatmentSpo2", "postTreatmentRoomAir", "postTreatmentRespiratoryRate"]);
        add("acute-recovery", "Acute care", "Recovery and follow-up support", ["postTreatmentLungFunctionPercent", "postTreatmentMildFeatures", "observationMinutes", "homeSupport"]);
      }
    }
    add("diagnosis", "Diagnosis", "Diagnostic history", ["diagnosisContext", "typicalSymptoms"], { testingToggle: true, hint: "A documented established diagnosis is not invalidated solely because the original test report is unavailable." });
    if (d.diagnosisContext === "established" || d.diagnosisContext === "suspected" || options.testing) add("diagnostic-history", "Diagnosis", "Previously documented positive testing", ["dxBd", "dxIcsObjective", "dxChallenge", "dxPef"], { hint: "Check verified historical positive results. Unchecked boxes do not mean that testing was negative.", optional: true });
    if (options.testing || d.diagnosisContext === "suspected") {
      add("pre-spirometry", "Diagnosis", "Available pre-bronchodilator spirometry", ["fev1Pre", "fvcPre", "fev1Predicted", "fvcPredicted"], { optional: true });
      add("post-spirometry", "Diagnosis", "Available post-bronchodilator spirometry", ["fev1Post", "fvcPost", "bronchodilatorHeld"], { reference: "washout-reference", optional: true });
      add("other-testing", "Diagnosis", "Other objective diagnostic evidence", ["bronchoprovocation", "pefVariability", "icsObjectiveResponse", "clinicalIcsResponse"], { optional: true });
    }
    if (!acute) {
      add("symptoms", "Symptoms", "Symptoms in the last four weeks", ["symptomDays", "nightWaking", "activityLimitation"], { negativeShortcut: true, controlSummary: true });
      if (d.reliever === "saba") add("reliever-use", "Symptoms", "Reliever use and exposure", ["sabaFrequency", "sabaCanisters"], { controlSummary: true });
      else if (["ics-formoterol", "ics-saba"].includes(d.reliever)) add("reliever-use", "Symptoms", "As-needed inhaler use", ["airUsesPerWeek"], { controlSummary: true, optional: true });
    }
    add("exacerbations", "Risk", "Exacerbations in the past twelve months", ["ocsExacerbations", "hospitalExacerbations"], { zeroShortcut: true });
    add("risk", "Risk", "Additional risk and treatment considerations", ["recentExacerbation", "priorIcu", "persistentExacerbations", "pregnant"], { hint: "Check findings that are present. Unchecked risk and exposure boxes remain undocumented; treatment decisions request individual negative confirmations when needed." });
    add("optimization", "Treatment", "Treatment barriers and adverse effects", ["adherence", "technique", "accessBarrier", "icsSideEffects"], { hint: "Check current concerns. Unchecked routine treatment barriers are assumed absent; this does not confirm a longitudinal optimized-treatment trial." });
    if (!acute && (rec.findings.control.complete && rec.findings.control.classification === "well controlled" || d.stableMonths !== null || options.stability)) {
      add("stability", "Treatment", "Stability and possible treatment reduction", ["stableMonths", "lungFunctionStable", "respiratoryInfection", "travelling"], { optional: true, hint: "A step-down decision also needs review of exacerbations, pregnancy, steroid exposure, and prior life-threatening asthma. ICS protection is retained." });
    }
    add("phenotype-review", "Phenotype", "Available phenotype information", [], { phenotypeToggle: true });
    if (options.phenotype || rec.biologicCandidates.length > 0 || !["none", "unknown"].includes(d.currentBiologic)) {
      add("biomarkers", "Phenotype", "Available Type 2 biomarkers", ["eosinophils", "historicalEosinophils", "feno"], { optional: true });
      add("allergic", "Phenotype", "Allergic phenotype and comorbidities", ["allergenDriven", "perennialSensitization", "nasalPolyps", "atopicDermatitis"], { optional: true });
      add("modifiers", "Phenotype", "Relevant biologic safety and modifiers", ["egpa", "endemicExposure"], { optional: true });
    }
    add("smoking", "Prevention", "Tobacco exposure", ["smoking"]);
    if (d.smoking === "current") {
      add("cessation-dosing", "Prevention", "Tailor smoking-cessation treatment", ["smokingCigarettesPerDay", "smokingFirstCigarette", "smokingRenal"], { optional: true });
      add("cessation-precautions", "Prevention", "Cessation medication precautions", ["smokingBupropionContra", "smokingVareniclineReaction", "smokingSeizure", "smokingPsychiatric"]);
      add("cessation-safety", "Prevention", "Complete cessation safety review", ["smokingCvdConcern", "smokingHepaticConcern", "smokingBreastfeeding", "smokingSafetyReviewed"]);
    }
    add("vaccines", "Prevention", "Vaccination history", ["pneumococcal", "rsv", "zoster", "tdap", "flu", "covid"], { reference: "vaccine-reference", optional: true });
    add("review", "Review", "Review the encounter", [], { review: true });
    return out;
  }
  function reconcileStep(previous, next, currentId) {
    if (next.some(s => s.id === currentId)) return currentId;
    const oldIndex = previous.findIndex(s => s.id === currentId);
    for (let i = oldIndex - 1; i >= 0; i--) if (next.some(s => s.id === previous[i].id)) return previous[i].id;
    return next[0].id;
  }
  return { steps, reconcileStep };
});
