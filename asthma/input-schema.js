(function (root) {
  "use strict";

  const unknown = ["unknown", "Not assessed / not documented"];
  const number = (label, options = {}) => ({ type: "number", label, min: 0, step: "any", ...options });
  const choice = (label, options, extra = {}) => ({ type: "enum", label, options: [unknown, ...options], ...extra });
  const yesNo = (label, hint = "") => ({ type: "boolean", label, hint });
  const history = (label) => ({ type: "history", label });
  const text = (label, hint = "", rows = 3) => ({ type: "textarea", label, hint, rows });
  const vaccine = (label, hint = "") => choice(label, [["due", "Due / incomplete"], ["complete", "Current / complete"]], { hint });

  // Presentation metadata only; clinical classification belongs to asthmaLogic.
  root.asthmaInputSchema = {
    managementPhase: {
      type: "enum", label: "Encounter phase", defaultValue: "initial",
      options: [["initial", "Initial asthma management"], ["followup", "Follow-up asthma management"]]
    },
    age: number("Age (years)", { min: 18, max: 120, step: 1, integer: true }),
    controller: choice("Current controller category", [
      ["none", "No maintenance controller"], ["saba-only", "SABA-only regimen"],
      ["ics", "Maintenance ICS alone"], ["ics-formoterol", "Maintenance ICS-formoterol"],
      ["ics-laba", "Other maintenance ICS-LABA"], ["triple", "ICS-LABA-LAMA triple inhaler"]
    ], { hint: "For as-needed ICS-formoterol alone, select no maintenance controller and ICS-formoterol as the reliever." }),
    icsDose: choice("Current ICS intensity", [["low", "Low dose"], ["medium", "Medium dose"], ["high", "High dose"]], {
      hint: "Use the product-specific daily ICS dose. A triple inhaler does not by itself establish high-dose therapy."
    }),
    labaType: choice("LABA in the controller", [["formoterol", "Formoterol"], ["non-formoterol", "Other LABA"]]),
    reliever: choice("Current reliever", [
      ["ics-formoterol", "ICS-formoterol (AIR / SMART)"], ["ics-saba", "Albuterol-budesonide (Airsupra)"],
      ["saba", "SABA (e.g., albuterol)"], ["none", "No reliever"]
    ]),
    currentMedicationText: text("Current asthma medications, strengths, and schedule", "Optional documentation. Treatment classification uses the selections above.", 2),
    lamaAddon: yesNo("Separate LAMA add-on"),
    currentBiologic: choice("Current biologic", [
      ["none", "None"], ["omalizumab", "Omalizumab"], ["mepolizumab", "Mepolizumab"],
      ["benralizumab", "Benralizumab"], ["reslizumab", "Reslizumab"], ["dupilumab", "Dupilumab"],
      ["tezepelumab", "Tezepelumab"], ["depemokimab", "Depemokimab"]
    ]),
    biologicMonths: number("Time on current biologic (months)", { usualMax: 120 }),
    maintenanceOcs: yesNo("Maintenance oral corticosteroids"),
    maintenanceOcsDose: number("Maintenance prednisone-equivalent dose (mg/day)", { usualMax: 100 }),
    adherence: choice("Controller adherence", [["adequate", "Adequate"], ["suboptimal", "Suboptimal"]]),
    technique: choice("Inhaler technique", [["correct", "Correct"], ["incorrect", "Incorrect / inconsistent"]]),
    accessBarrier: yesNo("Medication access or affordability barrier"),
    optimizedTherapy: yesNo("Therapy optimization reviewed over 3-6 months", "Technique, adherence, access, exposures, and contributory conditions have been reviewed."),
    severeAsthmaEstablished: yesNo("Severe asthma diagnosis established"),
    icsSideEffects: yesNo("Significant ICS adverse effects / steroid toxicity concerns"),
    diagnosisContext: choice("Asthma diagnosis context", [["established", "Established diagnosis"], ["suspected", "Suspected / being evaluated"]]),
    typicalSymptoms: yesNo("Typical variable respiratory symptoms (diagnostic history)", "Variable wheeze, dyspnea, chest tightness, or cough with relevant triggers."),
    dxBd: history("Historical bronchodilator responsiveness"),
    dxIcsObjective: history("Historical objective improvement with ICS"),
    dxChallenge: history("Historical positive bronchoprovocation"),
    dxPef: history("Historical excessive PEF variability"),
    fev1Pre: number("Pre-BD FEV1 (L)", { step: 0.01, usualMax: 8 }),
    fev1Post: number("Post-BD FEV1 (L)", { step: 0.01, usualMax: 8 }),
    fvcPre: number("Pre-BD FVC (L)", { step: 0.01, usualMax: 10 }),
    fvcPost: number("Post-BD FVC (L)", { step: 0.01, usualMax: 10 }),
    fev1Predicted: number("Pre-BD FEV1 (% predicted)", { usualMax: 180, concernLow: 60 }),
    fvcPredicted: number("Pre-BD FVC (% predicted)", { usualMax: 180 }),
    bronchoprovocation: choice("Bronchoprovocation result", [["not-done", "Not performed"], ["positive", "Positive"], ["negative", "Negative"]]),
    pefVariability: number("Average diurnal PEF variability (%)", { usualMax: 100 }),
    icsObjectiveResponse: yesNo("Objective improvement after ICS documented", "GINA: FEV1 or FVC improvement of at least 12% AND 200 mL after at least 4 weeks of ICS, or PEF improvement of at least 20%, outside a respiratory infection. Document historical evidence when applicable."),
    clinicalIcsResponse: yesNo("Symptomatic improvement with ICS"),
    bronchodilatorHeld: yesNo("Asthma therapies were withheld prior to spirometry"),
    symptomDays: choice("Daytime symptoms (last 4 weeks)", [
      ["none", "None"], ["one-two", "1-2 days/week"], ["three", "3 days/week"],
      ["four-six", "4-6 days/week"], ["daily", "Every day"]
    ]),
    nightWaking: choice("Night waking due to asthma (last 4 weeks)", [
      ["none", "None"], ["less-weekly", "Less than once/week"], ["weekly-plus", "Once/week or more"]
    ]),
    activityLimitation: yesNo("Activity limitation due to asthma (last 4 weeks)"),
    sabaFrequency: choice("SABA use for symptoms (last 4 weeks)", [
      ["none", "None"], ["one-two", "1-2 times/week"], ["more-two", "More than twice/week"]
    ], { hint: "Exclude use before exercise. This control question applies to a SABA reliever." }),
    airUsesPerWeek: number("ICS-containing reliever use (times/week)", { usualMax: 100 }),
    sabaCanisters: number("SABA canisters dispensed (past 12 months)", { step: 1, integer: true, usualMax: 24 }),
    ocsExacerbations: number("Exacerbations requiring oral corticosteroids", { step: 1, integer: true, usualMax: 20, hint: "Past 12 months. Enter 0 if none." }),
    hospitalExacerbations: number("Exacerbations requiring hospitalization", { step: 1, integer: true, usualMax: 20, hint: "Past 12 months. Enter 0 if none." }),
    recentExacerbation: yesNo("Recent asthma exacerbation"),
    priorIcu: yesNo("Prior ICU admission, intubation, or life-threatening asthma"),
    persistentExacerbations: yesNo("Persistent exacerbations despite current treatment"),
    stableMonths: number("Duration of stable symptom control (months)", { usualMax: 240 }),
    lungFunctionStable: yesNo("Lung function is stable"),
    pregnant: yesNo("Pregnant"),
    respiratoryInfection: yesNo("Current respiratory infection"),
    travelling: yesNo("Upcoming travel / limited access to follow-up"),
    eosinophils: number("Blood eosinophils (cells/uL)", { usualMax: 5000 }),
    historicalEosinophils: number("Historical blood eosinophils (cells/uL)", { usualMax: 5000, hint: "Optional prior value, particularly before corticosteroid treatment." }),
    feno: number("FeNO (ppb)", { usualMax: 300 }),
    totalIge: number("Total IgE (IU/mL)", { usualMax: 5000 }),
    igePretreatment: yesNo("Total IgE measured before omalizumab treatment", "The asthma dosing table requires pretreatment IgE; values during omalizumab treatment must not determine the dose."),
    weightKg: number("Weight (kg)", { step: 0.1, usualMin: 20, usualMax: 300 }),
    allergenDriven: yesNo("Allergen-driven asthma symptoms"),
    perennialSensitization: yesNo("Perennial aeroallergen sensitization confirmed", "Skin prick testing or serum specific IgE."),
    nasalPolyps: yesNo("Chronic rhinosinusitis with nasal polyps"),
    atopicDermatitis: yesNo("Moderate / severe atopic dermatitis"),
    egpa: choice("EGPA status", [["no", "Not present"], ["suspected", "Suspected"], ["confirmed", "Confirmed"]]),
    endemicExposure: yesNo("Residence / exposure in a parasite-endemic area"),
    smoking: choice("Smoking status", [["never", "Never"], ["former", "Former"], ["current", "Current"]]),
    exposureText: text("Relevant exposures / triggers", "Optional occupational, environmental, smoke, or allergen history.", 2),
    pneumococcal: vaccine("Pneumococcal vaccine status"),
    rsv: vaccine("RSV vaccine status"),
    zoster: vaccine("Recombinant zoster vaccine status"),
    tdap: vaccine("Tdap / Td primary series and booster status", "Review primary series, at least one Tdap dose, and subsequent boosters."),
    flu: vaccine("Current-season influenza vaccine status"),
    covid: vaccine("COVID-19 vaccine status"),
    hpi: text("Interval history / presenting concerns"),
    exam: text("Relevant examination findings", "Record findings actually assessed; no normal findings are assumed."),
    clinicianContext: text("Additional assessment / clinician context"),
    counselingDocumented: text("Counseling actually performed", "Optional. Enter completed counseling only; recommended counseling remains prospective."),
    heartRate: number("Heart rate (bpm)", { usualMin: 30, usualMax: 220, concernLow: 40, concernHigh: 140 }),
    respiratoryRate: number("Respiratory rate (breaths/min)", { usualMin: 6, usualMax: 60, concernLow: 8, concernHigh: 25 }),
    spo2: number("SpO2 (%)", { max: 100, usualMin: 50, concernLow: 92 }),
    systolicBp: number("Systolic BP (mmHg)", { usualMin: 50, usualMax: 250, concernLow: 90, concernHigh: 200 }),
    diastolicBp: number("Diastolic BP (mmHg)", { usualMin: 20, usualMax: 150 }),
    temperature: number("Temperature (degrees C)", { step: 0.1, usualMin: 30, usualMax: 43 }),
    acutePresentation: choice("Acute presentation", [["none", "No acute exacerbation"], ["active", "Active exacerbation today"], ["recent", "Recent exacerbation / reassessment"]]),
    urgentRedFlags: yesNo("Urgent red-flag features today", "Severe distress, cyanosis, altered mental status, silent chest, or unstable oxygenation."),
    acuteHistory: text("Acute symptom progression", "Onset, progression, and relevant precipitant.", 2),
    acuteTreatmentGiven: text("Acute treatment already given", "Actual medication, dose, timing, and oxygen treatment, if any.", 2),
    acuteSpeech: choice("Speech", [["sentences", "Sentences"], ["phrases", "Phrases"], ["unable", "Unable to speak normally"]]),
    acuteCanLieDown: yesNo("Able to lie down comfortably", "No indicates a preference for sitting. Document inability to lie down separately below."),
    acuteUnableToLieDown: yesNo("Unable to lie down because of respiratory distress"),
    acuteCannotDrink: yesNo("Unable to drink because of respiratory distress"),
    acuteCyanosis: yesNo("Cyanosis present"),
    acuteMentalStatus: choice("Mental status", [["normal", "Normal"], ["agitated", "Agitated"], ["drowsy", "Drowsy"], ["confused", "Confused"]]),
    acuteRespiratoryEffort: choice("Respiratory effort", [["normal-mild", "Normal / mildly increased"], ["increased", "Increased"]]),
    acuteAccessoryMuscles: choice("Accessory muscle use", [["none-mild", "None / mild"], ["marked", "Marked"]]),
    acuteAirEntry: choice("Air entry", [["normal", "Normal"], ["reduced", "Reduced"], ["silent", "Silent chest"]]),
    acuteWheeze: choice("Wheeze", [["none-mild", "None / mild"], ["expiratory", "Expiratory wheeze"]]),
    roomAir: yesNo("SpO2 measured on room air"),
    acuteLungFunctionPercent: number("Acute PEF / FEV1 (% of reference)", { usualMax: 150, hint: "Document the measurement and reference below." }),
    acuteLungFunctionType: choice("Acute lung-function measurement", [["pef", "PEF"], ["fev1", "FEV1"]]),
    acuteLungFunctionReference: choice("Lung-function reference", [["personal-best", "Personal best"], ["predicted", "Predicted"]]),
    acuteResponse: choice("Response after treatment", [["improving", "Improving"], ["unchanged", "Unchanged"], ["worsening", "Worsening"]]),
    postTreatmentSpo2: number("Post-treatment SpO2 (%)", { max: 100, usualMin: 50, concernLow: 92 }),
    postTreatmentRoomAir: yesNo("Post-treatment SpO2 measured on room air"),
    postTreatmentRespiratoryRate: number("Post-treatment respiratory rate (breaths/min)", { usualMin: 6, usualMax: 60, concernHigh: 25 }),
    postTreatmentLungFunctionPercent: number("Post-treatment PEF / FEV1 (% of reference)", { usualMax: 150 }),
    postTreatmentMildFeatures: yesNo("Only mild features remain after treatment"),
    observationMinutes: number("Observation after last bronchodilator (minutes)", { usualMax: 1440 }),
    homeSupport: yesNo("Adequate home support and follow-up access")
  };
})(window);
