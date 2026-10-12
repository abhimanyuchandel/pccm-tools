(function (root) {
  "use strict";

  const unknown = ["unknown", "Not assessed / not documented"];
  const number = (label, options = {}) => ({ type: "number", label, min: 0, step: "any", ...options });
  const choice = (label, options, extra = {}) => ({ type: "enum", label, options: [unknown, ...options], ...extra });
  const yesNo = (label, hint = "") => ({ type: "boolean", label, hint });
  const history = (label) => ({ type: "history", label });
  const exception = (label, checkedValue = true, hint = "") => ({ type: "exception", label, checkedValue, hint });
  const confirmation = (label, hint = "") => ({ type: "confirmation", label, hint });
  const reviewed = () => ({ type: "review", label: "Reviewed this group; unchecked items are absent or without concern." });
  const vaccine = (label, hint = "") => choice(label, [["due", "Due / incomplete"], ["complete", "Current / complete"]], { hint, compact: true });

  // Presentation metadata only; clinical classification belongs to asthmaLogic.
  root.asthmaInputSchema = {
    managementPhase: {
      type: "enum", label: "Encounter phase", defaultValue: "initial", compact: true,
      options: [["initial", "Initial asthma management"], ["followup", "Follow-up asthma management"]]
    },
    age: number("Age (years)", { min: 18, max: 120, step: 1, integer: true }),
    controller: choice("Current controller category", [
      ["none", "No maintenance controller"], ["saba-only", "SABA-only regimen"],
      ["ics", "Maintenance ICS alone"], ["ics-formoterol", "Maintenance ICS-formoterol"],
      ["ics-laba", "Other maintenance ICS-LABA"], ["triple", "ICS-LABA-LAMA triple inhaler"]
    ], { hint: "Controller = scheduled maintenance treatment. For AIR-only, select no maintenance controller plus ICS-formoterol relief, or use the AIR-only shortcut." }),
    icsDose: choice("Current ICS dose intensity", [["low", "Low dose"], ["medium", "Medium dose"], ["high", "High dose"]], {
      hint: "ICS = inhaled corticosteroid. Use the verified scheduled daily dose, not symptom burden or extra reliever use. See the maintenance examples below; medium-dose SMART is not high-dose ICS.", compact: true
    }),
    labaType: choice("LABA in the controller", [["formoterol", "Formoterol"], ["non-formoterol", "Other LABA"]], { hint: "LABA = long-acting beta2-agonist. Salmeterol and vilanterol are not formoterol and should not be paired with ICS-formoterol relief." }),
    reliever: choice("Current reliever", [
      ["ics-formoterol", "ICS-formoterol (AIR / SMART)"], ["ics-saba", "Albuterol-budesonide (Airsupra)"],
      ["saba", "SABA (e.g., albuterol)"], ["none", "No reliever"]
    ], { hint: "Reliever = the inhaler used as needed for symptoms. SMART uses the same ICS-formoterol inhaler for maintenance and relief." }),
    treatmentReviewed: reviewed(),
    riskReviewed: reviewed(),
    phenotypeReviewed: reviewed(),
    lamaAddon: exception("Separate LAMA add-on", true, "Long-acting muscarinic antagonist, such as tiotropium. Do not count the LAMA already included in a triple inhaler as a separate add-on."),
    currentBiologic: choice("Current biologic", [
      ["none", "None"], ["omalizumab", "Omalizumab"], ["mepolizumab", "Mepolizumab"],
      ["benralizumab", "Benralizumab"], ["reslizumab", "Reslizumab"], ["dupilumab", "Dupilumab"],
      ["tezepelumab", "Tezepelumab"], ["depemokimab", "Depemokimab"]
    ]),
    biologicMonths: number("Time on current biologic (months)", { usualMax: 120 }),
    maintenanceOcs: exception("Maintenance oral corticosteroids"),
    maintenanceOcsDose: number("Maintenance prednisone-equivalent dose (mg/day)", { usualMax: 100 }),
    adherence: exception("Controller adherence concern", "suboptimal"),
    technique: exception("Inhaler technique concern", "incorrect"),
    accessBarrier: exception("Medication access or affordability barrier"),
    optimizedTherapy: confirmation("Optimization over 3-6 months confirmed", "Confirm that technique, adherence, medication access, exposures, and contributing conditions have been addressed over this interval, not simply reviewed today."),
    severeAsthmaEstablished: confirmation("Previously established severe asthma"),
    icsSideEffects: exception("Significant ICS adverse effects / steroid toxicity concerns"),
    diagnosisContext: choice("Asthma diagnosis context", [["established", "Established diagnosis"], ["suspected", "Suspected / being evaluated"]], { compact: true }),
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
    clinicalIcsResponse: yesNo("Symptomatic improvement with ICS", "Clinical improvement alone is not objective diagnostic evidence; record spirometry or PEF improvement separately when documented."),
    bronchodilatorHeld: yesNo("Bronchodilators withheld prior to spirometry"),
    symptomDays: choice("Daytime symptoms (last 4 weeks)", [
      ["none", "None"], ["one-two", "1-2 days/week"], ["three", "3 days/week"],
      ["four-six", "4-6 days/week"], ["daily", "Every day"]
    ], { compact: true, quickChoices: true }),
    nightWaking: choice("Night waking due to asthma (last 4 weeks)", [
      ["none", "None"], ["less-weekly", "Less than once/week"], ["weekly-plus", "Once/week or more"]
    ], { compact: true, quickChoices: true }),
    activityLimitation: exception("Activity limitation due to asthma (last 4 weeks)"),
    sabaFrequency: choice("SABA use for symptoms (last 4 weeks)", [
      ["none", "None"], ["one-two", "1-2 times/week"], ["more-two", "More than twice/week"]
    ], { hint: "Exclude use before exercise. This control question applies to a SABA reliever.", compact: true, quickChoices: true }),
    airUsesPerWeek: number("ICS-containing reliever use (times/week)", { usualMax: 100, hint: "As-needed use only; exclude scheduled maintenance doses. Frequent use warrants clinical review but is not counted as the SABA-frequency control item." }),
    sabaCanisters: number("SABA canisters dispensed (past 12 months)", { step: 1, integer: true, usualMax: 24 }),
    ocsExacerbations: number("Exacerbations requiring oral corticosteroids", { step: 1, integer: true, usualMax: 20, hint: "Past 12 months. Enter 0 if none." }),
    hospitalExacerbations: number("Exacerbations requiring hospitalization", { step: 1, integer: true, usualMax: 20, hint: "Past 12 months. Enter 0 if none." }),
    recentExacerbation: exception("Recent asthma exacerbation"),
    priorIcu: exception("Prior ICU admission, intubation, or life-threatening asthma"),
    persistentExacerbations: exception("Persistent exacerbations despite current treatment"),
    stableMonths: number("Duration of stable symptom control (months)", { usualMax: 240 }),
    lungFunctionStable: yesNo("Lung function is stable", "Confirm from available serial spirometry or other objective follow-up, not symptom control alone."),
    pregnant: exception("Pregnant"),
    respiratoryInfection: exception("Current respiratory infection"),
    travelling: exception("Upcoming travel / limited access to follow-up"),
    eosinophils: number("Blood eosinophils (cells/uL)", { usualMax: 5000 }),
    historicalEosinophils: number("Historical blood eosinophils (cells/uL)", { usualMax: 5000, hint: "Optional prior value, particularly before corticosteroid treatment." }),
    feno: number("FeNO (ppb)", { usualMax: 300, hint: "Fractional exhaled nitric oxide. Corticosteroid treatment can lower FeNO and blood eosinophils; consider available pretreatment values." }),
    totalIge: number("Pretreatment total IgE (IU/mL)", { usualMax: 5000 }),
    igePretreatment: yesNo("Total IgE measured before omalizumab treatment", "The asthma dosing table requires pretreatment IgE; values during omalizumab treatment must not determine the dose."),
    weightKg: number("Verified weight (kg)", { min: 0.1, step: 0.1, usualMin: 20, usualMax: 300 }),
    allergenDriven: exception("Allergen-driven asthma symptoms"),
    perennialSensitization: yesNo("Perennial aeroallergen sensitization confirmed", "Skin prick testing or serum specific IgE."),
    nasalPolyps: exception("Chronic rhinosinusitis with nasal polyps"),
    atopicDermatitis: exception("Moderate / severe atopic dermatitis"),
    egpa: choice("EGPA status", [["no", "Not present"], ["suspected", "Suspected"], ["confirmed", "Confirmed"]], { hint: "Eosinophilic granulomatosis with polyangiitis. Select confirmed only for an established diagnosis; eosinophilia alone is not confirmation." }),
    endemicExposure: exception("Residence / exposure in a parasite-endemic area"),
    smoking: choice("Smoking status", [["never", "Never"], ["former", "Former"], ["current", "Current"]]),
    pneumococcal: vaccine("Pneumococcal vaccine status"),
    rsv: vaccine("RSV vaccine status"),
    zoster: vaccine("Recombinant zoster vaccine status"),
    tdap: vaccine("Tdap / Td primary series and booster status", "Review primary series, at least one Tdap dose, and subsequent boosters."),
    flu: vaccine("Current-season influenza vaccine status"),
    covid: vaccine("COVID-19 vaccine status"),
    respiratoryRate: number("Respiratory rate (breaths/min)", { usualMin: 6, usualMax: 60, concernLow: 8, concernHigh: 25 }),
    spo2: number("SpO2 (%)", { max: 100, usualMin: 50, concernLow: 92 }),
    acutePresentation: choice("Exacerbation context", [["none", "Routine visit"], ["active", "Active exacerbation"], ["recent", "Resolved exacerbation follow-up"]], { hint: "Active = an ongoing attack requiring severity assessment. Resolved follow-up = recovery and maintenance review, not an acute discharge assessment.", compact: true, quickChoices: true }),
    acuteReassessmentAvailable: confirmation("Post-treatment reassessment data available", "Check only when actual post-treatment observations are available. This is not required to generate initial guidance."),
    urgentRedFlags: yesNo("Urgent red-flag features today", "Severe distress, cyanosis, altered mental status, silent chest, or unstable oxygenation."),
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
    acuteLungFunctionPercent: number("Acute PEF / FEV1 (% of reference)", { usualMax: 150, hint: "Enter the measured value as a percentage of personal best or predicted (for example, 60). Specify the measurement and reference below." }),
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
