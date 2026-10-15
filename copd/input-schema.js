(function (root, factory) {
  const schema = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = schema;
  if (root) root.copdSchema = schema;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const unknown = ["unknown", "Not assessed"];
  const choice = (label, options, hint = "", defaultValue = "unknown") => ({
    type: "choice",
    label,
    options: [unknown, ...options],
    hint,
    defaultValue,
  });
  const yesNo = (label, hint = "") => ({
    ...choice(
      label,
      [
        ["yes", "Yes"],
        ["no", "No"],
      ],
      hint,
    ),
    boolean: true,
  });
  const num = (label, max, hint = "", extra = {}) => ({
    type: "number",
    label,
    min: 0,
    max,
    hint,
    ...extra,
  });
  const concern = (label) => ({ type: "concern", label, defaultValue: false });
  const vaccine = (label) =>
    choice(label, [
      ["due", "Due / incomplete"],
      ["complete", "Current / complete"],
      ["contraindicated", "Contraindication / precaution"],
    ]);
  const s = {
    encounter: choice(
      "Encounter context",
      [
        ["routine", "Routine visit"],
        ["active", "Active exacerbation"],
        ["recovery", "Recovery after exacerbation"],
      ],
      "",
      "routine",
    ),
    managementPhase: choice("Treatment phase", [
      ["initial", "Initial management"],
      ["followup", "Follow-up management"],
    ]),
    age: num("Age (years)", 120, "Adult patients only.", {
      min: 18,
      integer: true,
    }),
    gender: {
      type: "choice",
      label: "Patient gender",
      options: [
        ["unknown", "Not documented"],
        ["male", "Male"],
        ["female", "Female"],
        ["nonbinary", "Nonbinary"],
      ],
      defaultValue: "unknown",
      preferSelect: true,
      hint: "Optional; used for documentation only.",
    },
    redFlags: yesNo(
      "Urgent warning features present?",
      "Severe distress, confusion/drowsiness, cyanosis, chest pain, syncope, unstable circulation, or rapidly worsening oxygen needs. An unassessed answer does not establish outpatient safety.",
    ),
    currentRegimen: choice("Current maintenance inhaler regimen", [
      ["naive", "None"],
      ["lama", "LAMA alone"],
      ["laba", "LABA alone"],
      ["laba-lama", "LABA + LAMA"],
      ["ics-laba", "ICS + LABA"],
      ["triple", "ICS + LABA + LAMA"],
      ["other", "Other / unclear"],
    ]),
    reliever: choice("Current rescue treatment", [
      ["albuterol", "Albuterol"],
      ["duoneb", "Albuterol + ipratropium"],
      ["other", "Other"],
      ["none", "None"],
    ]),
    addonContext: choice("Maintenance add-ons beyond inhalers", [
      ["none", "None"],
      ["yes", "Taking additional maintenance treatment"],
    ]),
    currentRoflumilast: yesNo("Currently taking roflumilast?"),
    currentAzithromycin: yesNo("Currently taking maintenance azithromycin?"),
    currentEnsifentrine: yesNo("Currently taking ensifentrine?"),
    currentBiologic: choice("Current COPD biologic", [
      ["none", "None"],
      ["dupilumab", "Dupilumab"],
      ["mepolizumab", "Mepolizumab"],
      ["other", "Other / clarify indication"],
    ]),
    maintenanceOcs: yesNo(
      "Taking maintenance oral corticosteroids?",
      "Chronic systemic steroids are not routine stable COPD treatment. Verify indication, cumulative exposure, and adrenal suppression before changing them.",
    ),
    diagnosisContext: choice("COPD diagnostic context", [
      ["established", "Previously established COPD"],
      ["suspected", "Suspected / being evaluated"],
    ]),
    historicalObstruction: yesNo(
      "Historical post-bronchodilator obstruction documented?",
      "A prior diagnostic report may support established COPD without repeating spirometry today.",
    ),
    fev1fvc: num(
      "Post-BD FEV1/FVC",
      100,
      "A ratio such as 0.65 or a percent such as 65 is accepted.",
    ),
    fev1Predicted: num(
      "Post-BD FEV1 (% predicted)",
      200,
      "Available stable-state value; do not obtain a new measurement solely to complete this visit.",
      { warningHigh: 150, warningLow: 30 },
    ),
    asthma: choice(
      "Coexisting asthma",
      [
        ["no", "Not present"],
        ["suspected", "Suspected"],
        ["confirmed", "Confirmed"],
      ],
      "Asthma changes ICS requirements; do not withdraw ICS from a patient who needs it for asthma.",
    ),
    catScore: num(
      "CAT / CAAT score (0-40)",
      40,
      "Enter an existing score or use the optional item-score calculator.",
      { integer: true },
    ),
    mmrcScore: num(
      "mMRC dyspnea score (0-4)",
      4,
      "Select the description that best matches the patient's usual breathlessness. CAT/CAAT may be entered separately; both scores are not required.",
      { integer: true },
    ),
    persistentDyspnea: yesNo(
      "Persistent dyspnea or activity limitation despite current treatment?",
    ),
    moderateExac: num(
      "Moderate exacerbations in the last 12 months",
      50,
      "Episodes treated with systemic steroids and/or antibiotics, without hospitalization. Do not double-count hospitalized episodes.",
      { integer: true, warningHigh: 12 },
    ),
    severeExac: num(
      "Exacerbations requiring hospitalization in the last 12 months",
      50,
      "Enter 0 only if confirmed. A blank value remains unknown.",
      { integer: true, warningHigh: 12 },
    ),
    adherenceConcern: concern("Adherence concern"),
    techniqueConcern: concern("Inhaler-technique concern"),
    accessConcern: concern("Cost / access barrier"),
    deviceConcern: concern(
      "Device, inspiratory-flow, cognition, or dexterity concern",
    ),
    icsSideEffects: concern("Significant ICS adverse effects"),
    recurrentPneumonia: yesNo(
      "Severe or recurrent pneumonia while receiving ICS?",
    ),
    chronicBronchitis: yesNo(
      "Chronic productive cough / chronic bronchitis phenotype?",
      "Clarify duration and exclude other causes. The classic definition is cough/sputum for at least 3 months in each of 2 consecutive years; biologic trials used their own chronic-cough criteria.",
    ),
    eosinophils: num(
      "Blood eosinophils (cells/uL)",
      20000,
      "Use an available stable or pretreatment result when possible; systemic steroids may suppress counts.",
      { warningHigh: 1500 },
    ),
    historicalEosinophils: num(
      "Historical blood eosinophils (cells/uL)",
      20000,
      "Optional prior value, particularly before systemic corticosteroids.",
      { warningHigh: 1500 },
    ),
    biologicReview: yesNo(
      "COPD biologic eligibility and safety reviewed?",
      "Confirm persistent exacerbations despite appropriate optimized inhaled therapy, eosinophilic phenotype, product-specific precautions and coverage. Matching a biomarker alone does not establish eligibility.",
    ),
    helminthReview: choice(
      "Parasitic infection review before biologic treatment",
      [
        ["no-concern", "Reviewed; no relevant exposure or infection concern"],
        [
          "addressed",
          "Relevant risk evaluated; infection treated if indicated",
        ],
        [
          "pending",
          "Possible exposure or infection needs evaluation / treatment",
        ],
      ],
      "Review relevant residence/travel and known or suspected helminth infection. Test or treat when indicated by the history; routine parasite testing is not required for every patient.",
    ),
    roflumilastLiver: yesNo(
      "Moderate or severe hepatic impairment?",
      "Child-Pugh B or C is a contraindication to roflumilast.",
    ),
    roflumilastWeightConcern: yesNo(
      "Underweight or clinically significant unintentional weight loss?",
      "Roflumilast can cause further weight loss. Review baseline weight and arrange monitoring; reassess an unexplained decline before prescribing.",
    ),
    roflumilastSafety: yesNo(
      "Roflumilast mood and interaction review acceptable?",
      "Review depression/suicidality and the risk-benefit balance. Avoid strong enzyme inducers such as rifampin or carbamazepine; CYP3A4 or combined CYP3A4/1A2 inhibitors can increase exposure. Plan weight and mood monitoring.",
    ),
    azithromycinQtSafety: yesNo(
      "Baseline ECG/QTc and interacting medications acceptable for maintenance azithromycin?",
      "Review QT prolongation, arrhythmia risk, electrolyte concerns and other QT-prolonging drugs. Arrange a repeat ECG after initiation as appropriate.",
    ),
    azithromycinHearingLiverSafety: yesNo(
      "Hearing/balance, liver tests and macrolide allergy review acceptable?",
      "Review baseline hearing or balance problems and liver function. Plan adverse-effect and liver-test monitoring during treatment.",
    ),
    azithromycinInfectionReview: yesNo(
      "Respiratory microbiology and resistance risk reviewed?",
      "Review prior cultures and obtain sputum/NTM testing when indicated, especially with bronchiectasis or suspected NTM disease. Do not use macrolide monotherapy for active NTM infection.",
    ),
    ensifentrineSafety: yesNo(
      "Ensifentrine allergy and psychiatric-risk review acceptable?",
      "Exclude prior serious hypersensitivity. Review depression, suicidal thoughts or behavior, and other mood concerns; plan monitoring for new or worsening psychiatric symptoms.",
    ),
    ensifentrineDevice: yesNo(
      "Twice-daily jet-nebulizer treatment feasible?",
      "Requires a standard jet nebulizer with a mouthpiece and air compressor. Confirm access and ability to use it. This is maintenance treatment, not a rescue medication.",
    ),
    smokingStatus: choice("Smoking status", [
      ["current", "Current"],
      ["former", "Former"],
      ["never", "Never"],
    ]),
    packYears: num(
      "Cigarette exposure (pack-years)",
      300,
      "Packs per day multiplied by years smoked. Do not convert vaping into pack-years.",
      { warningHigh: 150 },
    ),
    yearsSinceQuit: num(
      "Years since quitting",
      100,
      "Useful history, not an NCCN screening exclusion.",
    ),
    quitReadiness: choice("Preferred cessation approach", [
      ["ready", "Set a quit date"],
      ["gradual", "Gradual / flexible quit approach"],
      ["notready", "Not ready; revisit support"],
    ]),
    cigarettesPerDay: num(
      "Cigarettes per day",
      200,
      "Used for nicotine patch strength.",
      { warningHigh: 80, integer: true },
    ),
    firstCigarette: choice("First cigarette after waking", [
      ["within30", "Within 30 minutes"],
      ["after30", "After 30 minutes"],
    ]),
    cessationSafety: yesNo(
      "Selected cessation medication's safety reviewed and acceptable?",
      "Review allergies, interactions, pregnancy/breastfeeding where relevant, cardiovascular instability, mood and seizure history, and organ function. Stable psychiatric illness alone is not a contraindication.",
    ),
    renalStatus: choice("Renal function for cessation dosing", [
      ["normal", "No relevant impairment"],
      ["impaired", "Impaired; CrCl at least 30"],
      ["severe", "CrCl below 30 mL/min"],
      ["dialysis", "Hemodialysis"],
    ]),
    bupropionContra: yesNo(
      "Bupropion contraindication present?",
      "Seizure disorder, current/prior anorexia or bulimia, abrupt sedative/alcohol/antiepileptic withdrawal, another bupropion product, MAOI within 14 days, or serious prior reaction.",
    ),
    aatdStatus: choice("One-time AAT deficiency assessment", [
      ["not-done", "Not performed"],
      ["completed", "Completed; no deficiency identified"],
      ["known-aatd", "Known deficiency"],
      ["pending", "Pending / indeterminate"],
    ]),
    rehabStatus: choice("Pulmonary rehabilitation", [
      ["not-done", "Not completed"],
      ["current", "Currently participating"],
      ["completed", "Previously completed"],
      ["declined", "Declined / not feasible"],
    ]),
    rehabPreference: choice("Rehabilitation plan", [
      ["center", "Refer to center-based PR"],
      ["remote", "Refer to an appropriate remote PR program"],
      ["maintain", "Continue program / maintenance exercise"],
      ["defer", "Defer and revisit barriers"],
    ]),
    screeningContext: choice("Lung cancer assessment context", [
      ["screening", "Asymptomatic; screening review"],
      ["symptoms", "Concerning symptoms / diagnostic evaluation"],
      ["surveillance", "Prior lung cancer / nodule surveillance"],
    ]),
    curativeBenefit: yesNo(
      "Could and would the patient pursue curative-intent treatment if cancer were detected?",
      "Assess overall health, competing mortality, preferences, and available curative options, not surgical fitness alone. Screening eligibility is not the same as insurance coverage.",
    ),
    ldctStatus: choice("Screening LDCT status", [
      ["due", "Due / not previously performed"],
      ["current", "Current / being followed by screening program"],
      ["declined", "Declined after discussion"],
    ]),
    pneumococcalStatus: vaccine("Pneumococcal vaccine"),
    rsvStatus: vaccine("RSV vaccine"),
    zosterStatus: vaccine("Shingrix"),
    tdapStatus: vaccine("Tdap / Td primary series and booster"),
    fluStatus: vaccine("Current-season influenza vaccine"),
    covidStatus: vaccine("Current COVID-19 vaccine"),
    restingSpo2: num(
      "Stable resting SpO2 (%)",
      100,
      "Record oxygen conditions. This is not, by itself, an oxygen prescription.",
      { min: 1, warningLow: 88 },
    ),
    oxygenConditions: choice("Conditions for stable resting SpO2", [
      ["roomair", "Room air"],
      ["oxygen", "Supplemental oxygen"],
    ]),
    currentOxygen: yesNo("Currently using supplemental oxygen?"),
    oxygenFlow: num(
      "Current oxygen flow (L/min)",
      30,
      "Available prescription; do not remove needed oxygen to complete this assessment.",
    ),
    exertionalSpo2: num(
      "Lowest documented exertional SpO2 (%)",
      100,
      "From an available assessed exercise test, not an assumed value.",
      { min: 1, warningLow: 88 },
    ),
    exertionalRoomAir: yesNo("Exertional measurement obtained on room air?"),
    abgAvailable: yesNo("Stable arterial blood gas available?"),
    pao2: num(
      "Stable PaO2 (mmHg)",
      600,
      "Use an arterial value with known oxygen conditions.",
    ),
    paco2: num("Stable PaCO2 (mmHg)", 150, "Do not substitute a venous PCO2."),
    abgRoomAir: yesNo("Stable ABG obtained on room air?"),
    hypoxemiaComplication: yesNo(
      "Cor pulmonale / edema, pulmonary hypertension, or secondary polycythemia documented?",
      "Relevant to borderline resting oxygen thresholds; confirm the applicable criterion.",
    ),
    hypercapniaContext: choice("Timing of hypercapnia assessment", [
      ["stable", "Clinically stable, outside an exacerbation"],
      ["recovery", "2-4 weeks after acute hypercapnic respiratory failure"],
      ["acute", "During acute illness / not yet reassessed"],
    ]),
    osaStatus: choice("Sleep-disordered breathing assessment", [
      ["excluded", "OSA assessed; not identified"],
      ["treated", "Known OSA; treatment reviewed"],
      ["suspected", "Suspected / not yet evaluated"],
    ]),
    currentNiv: yesNo("Currently prescribed home NIV?"),
    gasExchangeReview: yesNo(
      "Exertional desaturation, hypercapnia, or other gas-exchange data to review?",
      "Optional deeper assessment. A normal resting saturation does not exclude exertional hypoxemia.",
    ),
    emphysema: yesNo("Emphysema documented on CT?"),
    progression: yesNo(
      "Progressive disease or substantial limitation despite optimized care?",
    ),
    advancedInterest: choice(
      "Lung volume reduction or transplant referral review",
      [
        ["screen", "Brief referral screen"],
        ["detail", "Review available procedure / transplant workup"],
        ["defer", "Defer procedural or transplant evaluation"],
      ],
      "Consider valves or lung volume reduction surgery for selected emphysema, and transplant referral for advanced/progressive COPD. These are referral assessments, not confirmation of eligibility.",
    ),
    ctDistribution: choice("CT emphysema distribution", [
      ["upper", "Upper-lobe predominant"],
      ["heterogeneous", "Other heterogeneous"],
      ["homogeneous", "Homogeneous"],
    ]),
    rv: num(
      "Residual volume (% predicted)",
      600,
      "Hyperinflation assessment; thresholds differ by procedure and program.",
    ),
    tlc: num("Total lung capacity (% predicted)", 300),
    dlco: num("DLCO (% predicted)", 200, "Available stable measurement.", {
      warningLow: 20,
    }),
    collateralVentilation: choice(
      "Collateral ventilation / fissure assessment",
      [
        ["absent", "Little or no collateral ventilation confirmed"],
        ["present", "Collateral ventilation present"],
        ["fissure", "CT fissures assessed; physiology not confirmed"],
      ],
    ),
    bmi: num("BMI (kg/m2)", 100, "For BODE and nutrition assessment.", {
      min: 1,
      warningLow: 18.5,
    }),
    walkDistance: num(
      "Six-minute walk distance (m)",
      1500,
      "Use an actual standardized test. BODE is not calculated from estimated distance.",
    ),
    pulmonaryHypertension: yesNo(
      "Clinically significant pulmonary hypertension documented?",
    ),
    proceduralContra: yesNo(
      "Active infection or major procedural risk requiring specialist review?",
      "Examples include unstable cardiac disease, major frailty, significant bronchiectasis/recurrent infection, or other major comorbidity. These are not interchangeable device contraindications.",
    ),
    acuteDyspnea: yesNo("Dyspnea increased from baseline?"),
    acuteSputumVolume: yesNo("Sputum volume increased?"),
    acutePurulence: yesNo("New sputum purulence?"),
    acuteDyspneaScore: num(
      "Current dyspnea intensity (0-10)",
      10,
      "Optional patient-reported severity, not CAT or mMRC.",
    ),
    acuteProgression: choice("Current trajectory", [
      ["stable", "Not rapidly worsening"],
      ["worsening", "Rapidly worsening / failing initial treatment"],
    ]),
    respiratoryRate: num(
      "Current respiratory rate (/min)",
      100,
      "Active assessment only.",
      { min: 1, warningHigh: 24 },
    ),
    heartRate: num(
      "Current heart rate (/min)",
      250,
      "Active assessment only.",
      { min: 1, warningHigh: 110 },
    ),
    systolicBp: num(
      "Current systolic BP (mmHg)",
      300,
      "Optional if available; hypotension changes urgency.",
      { min: 1, warningLow: 90 },
    ),
    acuteSpo2: num(
      "Current SpO2 (%)",
      100,
      "Interpret against baseline and the actual oxygen setting.",
      { min: 1, warningLow: 88 },
    ),
    acuteOxygen: choice("Oxygen at the acute assessment", [
      ["roomair", "Room air"],
      ["baseline", "Usual prescribed oxygen"],
      ["increased", "Increased requirement"],
    ]),
    acuteMentalStatus: choice("Mental status / work of breathing", [
      ["baseline", "Baseline mentation; no marked respiratory distress"],
      ["distress", "Marked distress / unable to speak normally"],
      ["altered", "Confused or drowsy"],
    ]),
    mimicConcern: yesNo(
      "Pneumonia, heart failure, PE, pneumothorax, or another important alternative suspected?",
    ),
    outpatientAppropriate: yesNo(
      "Outpatient treatment appropriate after clinical severity and differential assessment?",
      "A clinician judgment, not an automatic clearance. Known urgent findings override this selection; missing key bedside observations still need assessment.",
    ),
    acuteCrp: num(
      "Available acute CRP (mg/L)",
      1000,
      "Optional. Do not delay urgent assessment to obtain CRP.",
    ),
    acutePh: num(
      "Available acute arterial pH",
      8,
      "Optional measured ABG, not estimated.",
      { min: 6.5 },
    ),
    acutePaco2: num("Available acute arterial PaCO2 (mmHg)", 150),
    acuteReassessed: yesNo("Actual post-treatment reassessment available?"),
    acuteResponse: choice("Observed treatment response", [
      ["improved", "Improved"],
      ["unchanged", "Unchanged"],
      ["worse", "Worse"],
    ]),
    postSpo2: num("Post-treatment SpO2 (%)", 100, "Actual measurement only.", {
      min: 1,
      warningLow: 88,
    }),
    outpatientSupport: yesNo(
      "Reliable treatment access, home support, and early reassessment available?",
    ),
    antibioticSafety: yesNo(
      "Selected antibiotic safety, allergies, interactions, and organ-function dosing reviewed?",
      "Include pregnancy where relevant, prior antibiotic exposure, QT risk, and prior resistant organisms. Do not use this default pathway for suspected pneumonia, Pseudomonas risk, or a serious alternative diagnosis.",
    ),
    resistantOrganisms: yesNo(
      "Prior resistant organisms / Pseudomonas or recurrent-infection concern?",
    ),
    bronchiectasis: yesNo(
      "Known bronchiectasis or recurrent lower respiratory infections?",
    ),
    weightLoss: concern("Unintentional weight loss / nutritional concern"),
    moodConcern: concern("Mood or anxiety concern"),
    cardiovascularConcern: concern(
      "Cardiovascular symptoms or disease needing review",
    ),
    osteoporosisConcern: concern(
      "Osteoporosis / cumulative systemic steroid concern",
    ),
    supportiveNeeds: yesNo(
      "Refractory symptoms, major functional burden, or care-planning needs?",
      "Supportive/palliative care can accompany disease-directed treatment; this is not an automatic hospice determination.",
    ),
  };
  return s;
});
