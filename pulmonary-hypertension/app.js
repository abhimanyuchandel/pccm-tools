if (!Object.values) {
  Object.values = function values(obj) {
    return Object.keys(obj).map(function mapKey(key) {
      return obj[key];
    });
  };
}

if (!Array.prototype.includes) {
  Array.prototype.includes = function includes(searchElement, fromIndex) {
    const start = fromIndex || 0;
    return this.indexOf(searchElement, start) !== -1;
  };
}

if (!String.prototype.includes) {
  String.prototype.includes = function includes(searchString, position) {
    const start = position || 0;
    return this.indexOf(searchString, start) !== -1;
  };
}

if (typeof Element !== "undefined" && !Element.prototype.matches) {
  Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;
}

if (typeof Element !== "undefined" && !Element.prototype.closest) {
  Element.prototype.closest = function closest(selector) {
    let node = this;
    while (node) {
      if (node.matches && node.matches(selector)) {
        return node;
      }
      node = node.parentElement;
    }
    return null;
  };
}

var DRUGS = {
  bosentan: {
    id: "bosentan",
    name: "Bosentan (Tracleer)",
    classId: "era",
    route: "PO",
    startDose: "62.5 mg twice daily for 4 weeks",
    goalDose: "125 mg twice daily (adults >=40 kg)",
    monitoring: "Baseline + monthly LFTs; hemoglobin periodically; pregnancy testing/prevention program.",
    interactions: "Contraindicated with cyclosporine A and glyburide; induces CYP3A/CYP2C9, lowering sildenafil, tadalafil, and warfarin exposure; hormonal contraception may be unreliable.",
    renal: "No major label-based start dose adjustment in common use; monitor clinically.",
    hepatic: "Hepatotoxic risk; avoid start in meaningful hepatic dysfunction and monitor closely.",
    pregnancy: "Contraindicated in pregnancy."
  },
  ambrisentan: {
    id: "ambrisentan",
    name: "Ambrisentan (Letairis)",
    classId: "era",
    route: "PO",
    startDose: "5 mg once daily",
    goalDose: "Increase to 10 mg once daily after ~4 weeks if tolerated",
    monitoring: "Pregnancy testing/prevention, edema, hemoglobin, clinical right-heart status.",
    interactions: "Check interaction list before use in multidrug regimens.",
    renal: "Use clinically with routine renal surveillance.",
    hepatic: "Not recommended in moderate or severe hepatic impairment.",
    pregnancy: "Contraindicated in pregnancy."
  },
  macitentan: {
    id: "macitentan",
    name: "Macitentan (Opsumit)",
    classId: "era",
    route: "PO",
    startDose: "10 mg once daily",
    goalDose: "Fixed dose (no titration)",
    monitoring: "Baseline hemoglobin and liver enzymes; repeat as clinically indicated.",
    interactions: "Review CYP interactions during combination therapy.",
    renal: "No routine initiation change in mild-moderate renal impairment.",
    hepatic: "Assess liver function before and during therapy as indicated.",
    pregnancy: "Contraindicated in pregnancy."
  },
  sildenafil: {
    id: "sildenafil",
    name: "Sildenafil (Revatio)",
    classId: "pde5i",
    route: "PO (IV available if PO not feasible)",
    startDose: "20 mg three times daily",
    goalDose: "Commonly 20 mg three times daily; labeling allows titration up to 80 mg three times daily",
    monitoring: "Blood pressure, hypotension symptoms, vision/hearing adverse effects.",
    interactions: "Contraindicated with nitrates and riociguat; bosentan substantially lowers sildenafil exposure and adding sildenafil to bosentan does not improve exercise capacity per label; caution with strong CYP3A modulators.",
    renal: "Typical outpatient starts usually unchanged, adjust by clinical context.",
    hepatic: "Assess hepatic status and interaction burden.",
    pregnancy: "No ERA-like boxed teratogenic warning, but pregnancy in PAH requires specialist management."
  },
  tadalafil: {
    id: "tadalafil",
    name: "Tadalafil (Adcirca)",
    classId: "pde5i",
    route: "PO",
    startDose: "40 mg once daily",
    goalDose: "Fixed maximum 40 mg once daily",
    monitoring: "Blood pressure, renal function, interaction review (especially CYP3A/ritonavir context).",
    interactions: "Contraindicated with nitrates; avoid riociguat coadministration; bosentan lowers tadalafil exposure.",
    renal: "Start lower in mild-moderate renal impairment; avoid in severe impairment.",
    hepatic: "Lower start often used in mild-moderate hepatic impairment; avoid severe impairment.",
    pregnancy: "Use only with specialist oversight in pregnancy contexts."
  },
  riociguat: {
    id: "riociguat",
    name: "Riociguat (Adempas)",
    classId: "sgc",
    route: "PO",
    startDose: "1 mg three times daily (or 0.5 mg three times daily if hypotension risk)",
    goalDose: "Increase by 0.5 mg three times daily no sooner than every 2 weeks to max 2.5 mg three times daily",
    monitoring: "BP during titration (about every 2 weeks), pregnancy testing/prevention, smoking status.",
    interactions: "Contraindicated with PDE5 inhibitors and nitrates/NO donors; follow washout rules.",
    renal: "Monitor renal function and hypotension risk during uptitration.",
    hepatic: "Use cautiously with hepatic dysfunction.",
    pregnancy: "Contraindicated in pregnancy."
  },
  epoprostenol_iv: {
    id: "epoprostenol_iv",
    name: "Epoprostenol IV (Flolan or Veletri)",
    classId: "parenteral_prostacyclin",
    route: "Continuous IV infusion",
    startDose: "2 ng/kg/min",
    goalDose: "Increase in small increments (typically every >=15 min during monitored initiation), then individualize",
    monitoring: "Close hemodynamic monitoring at start, pump/line integrity, infection prevention, backup infusion planning.",
    interactions: "Major operational risk is abrupt interruption leading to rapid deterioration.",
    renal: "Dose is individualized by response and tolerance.",
    hepatic: "No fixed hepatic titration algorithm; adjust clinically.",
    pregnancy: "Used in specialized settings when clinically required."
  },
  treprostinil_sciv: {
    id: "treprostinil_sciv",
    name: "Treprostinil infusion (Remodulin SC/IV)",
    classId: "parenteral_prostacyclin",
    route: "Continuous SC preferred, IV alternative",
    startDose: "1.25 ng/kg/min (0.625 ng/kg/min if not tolerated)",
    goalDose: "Titrate weekly or faster in monitored settings to highest tolerated effective dose",
    monitoring: "BP, prostacyclin adverse effects, SC site pain, line/pump safety, infection risk for IV.",
    interactions: "Avoid abrupt discontinuation; review CYP2C8 interaction burden.",
    renal: "Titrate to tolerance with routine renal surveillance.",
    hepatic: "Start lower and titrate cautiously with hepatic impairment.",
    pregnancy: "Specialist-directed use in pregnancy settings when indicated."
  },
  treprostinil_inhaled: {
    id: "treprostinil_inhaled",
    name: "Treprostinil inhaled solution (Tyvaso)",
    classId: "inhaled_oral_prostacyclin",
    route: "Inhaled nebulized",
    startDose: "3 breaths (18 mcg) four times daily",
    goalDose: "Increase by 3 breaths/session every 1-2 weeks toward 9-12 breaths four times daily",
    monitoring: "Hypotension, bleeding risk, bronchospasm risk, inhalation technique and device maintenance.",
    interactions: "No single absolute co-drug ban like riociguat/PDE5i, but additive hypotension and bleeding risk apply.",
    renal: "No typical dose gate based only on renal function.",
    hepatic: "Monitor tolerability in hepatic dysfunction.",
    pregnancy: "Specialist-guided risk-benefit decisions required."
  },
  treprostinil_dpi: {
    id: "treprostinil_dpi",
    name: "Treprostinil inhaled powder (Tyvaso DPI)",
    classId: "inhaled_oral_prostacyclin",
    route: "Inhaled dry powder",
    startDose: "16 mcg cartridge four times daily",
    goalDose: "Increase by 16 mcg/session every 1-2 weeks; common target 48-64 mcg/session",
    monitoring: "As for inhaled prostacyclin: BP, bleeding, bronchospasm, correct device use.",
    interactions: "Caution with additive hypotension/bleeding regimens.",
    renal: "No standard severe renal prohibition in source summary.",
    hepatic: "Monitor tolerability by clinical response.",
    pregnancy: "Specialist-guided risk-benefit decisions required."
  },
  treprostinil_oral: {
    id: "treprostinil_oral",
    name: "Treprostinil oral ER (Orenitram)",
    classId: "inhaled_oral_prostacyclin",
    route: "PO",
    startDose: "0.125 mg three times daily or 0.25 mg twice daily with food",
    goalDose: "Increase no more often than every 3-4 days; goal is highest tolerated dose (label max daily 120 mg)",
    monitoring: "GI tolerance, blood pressure, bleeding risk, signs of clinical worsening if interrupted.",
    interactions: "Strong CYP2C8 inhibitors require dose modification; avoid abrupt withdrawal.",
    renal: "Use clinical judgment with renal dysfunction.",
    hepatic: "Avoid in moderate impairment and contraindicated in severe impairment.",
    pregnancy: "Use under specialist oversight only."
  },
  iloprost: {
    id: "iloprost",
    name: "Iloprost inhaled (Ventavis)",
    classId: "inhaled_oral_prostacyclin",
    route: "Inhaled",
    startDose: "2.5 mcg first dose, then 5 mcg if tolerated",
    goalDose: "6-9 inhalations/day while awake (at least 2 hours apart)",
    monitoring: "BP, syncope, bronchospasm risk, device reliability and backup plan.",
    interactions: "Avoid excessive additive hypotension with other vasodilators.",
    renal: "No central renal start threshold in source summary.",
    hepatic: "Monitor tolerability.",
    pregnancy: "Specialist-guided risk-benefit decisions required."
  },
  selexipag: {
    id: "selexipag",
    name: "Selexipag (Uptravi)",
    classId: "ip_receptor",
    route: "PO",
    startDose: "200 mcg twice daily",
    goalDose: "Increase by 200 mcg twice daily at roughly weekly intervals to highest tolerated dose (up to 1600 mcg twice daily)",
    monitoring: "BP and prostacyclin-type adverse effects (headache, jaw pain, diarrhea).",
    interactions: "Strong CYP2C8 inhibitors (for example gemfibrozil) contraindicated; clopidogrel often requires once-daily dosing.",
    renal: "Use clinical tolerance-based titration.",
    hepatic: "Child-Pugh B often requires once-daily regimen; avoid severe impairment.",
    pregnancy: "Pregnancy safety data are limited; specialist oversight required."
  },
  sotatercept: {
    id: "sotatercept",
    name: "Sotatercept (Winrevair)",
    classId: "activin",
    route: "SC every 3 weeks",
    startDose: "0.3 mg/kg every 3 weeks",
    goalDose: "Increase to 0.7 mg/kg every 3 weeks after confirming acceptable hemoglobin and platelet response",
    monitoring: "Hemoglobin and platelets before each dose for first 5 doses (or longer if unstable), then periodic checks.",
    interactions: "Dose holds/modifications needed for excessive hemoglobin rise or platelet drop.",
    renal: "No simple renal-only algorithm in source summary; monitor full clinical context.",
    hepatic: "No single hepatic start rule in source summary; individualize.",
    pregnancy: "Specialist pregnancy counseling required."
  },
  warfarin_cteph: {
    id: "warfarin_cteph",
    name: "Warfarin (CTEPH lifelong anticoagulation option)",
    classId: "anticoagulation",
    route: "PO",
    startDose: "Individualized loading/maintenance per INR protocol",
    goalDose: "Maintain therapeutic anticoagulation indefinitely",
    monitoring: "INR, bleeding risk, peri-procedural planning, interaction surveillance.",
    interactions: "Large interaction burden with diet and medications; bosentan can lower warfarin exposure, so INR surveillance should be tightened when bosentan is started or changed.",
    renal: "Can be used in severe renal disease with INR monitoring.",
    hepatic: "Liver disease complicates coagulation management; individualize.",
    pregnancy: "Pregnancy management differs and requires specialist obstetric/cardiopulmonary plan."
  },
  apixaban_cteph: {
    id: "apixaban_cteph",
    name: "Apixaban (CTEPH DOAC option)",
    classId: "anticoagulation",
    route: "PO",
    startDose: "10 mg twice daily for 7 days, then 5 mg twice daily",
    goalDose: "Continue 5 mg twice daily for treatment; 2.5 mg twice daily after >=6 months is a label option for recurrent VTE reduction, but long-term CTEPH intensity should be specialist-directed",
    monitoring: "Bleeding, renal/hepatic function, peri-procedural timing, adherence.",
    interactions: "Strong dual CYP3A4 and P-gp inhibitors/inducers can substantially alter exposure.",
    renal: "No standard VTE-treatment dose reduction based only on renal function, but data are limited in advanced renal failure/dialysis; use specialist judgment.",
    hepatic: "Avoid in severe hepatic impairment; use caution in milder liver disease with bleeding risk.",
    pregnancy: "Avoid in pregnancy unless specialist-directed."
  },
  rivaroxaban_cteph: {
    id: "rivaroxaban_cteph",
    name: "Rivaroxaban (CTEPH DOAC option)",
    classId: "anticoagulation",
    route: "PO",
    startDose: "15 mg twice daily with food for 21 days, then 20 mg once daily with food",
    goalDose: "Continue 20 mg once daily with food for treatment; 10 mg once daily after >=6 months is a label option for recurrent VTE reduction, but long-term CTEPH intensity should be specialist-directed",
    monitoring: "Bleeding, renal/hepatic function, peri-procedural timing, adherence, and food adherence for 15 mg/20 mg dosing.",
    interactions: "Strong combined CYP3A4 and P-gp inhibitors/inducers can substantially alter exposure.",
    renal: "Avoid if CrCl <15 mL/min; use added caution as renal function worsens.",
    hepatic: "Avoid in moderate or severe hepatic impairment associated with coagulopathy.",
    pregnancy: "Avoid in pregnancy unless specialist-directed."
  },
  ccb_vasoreactive: {
    id: "ccb_vasoreactive",
    name: "High-dose CCB pathway (vasoreactivity responders)",
    classId: "ccb",
    route: "PO",
    startDose: "Agent-specific (for example nifedipine, amlodipine, or diltiazem)",
    goalDose: "Dose to sustained response and tolerance with specialist follow-up",
    monitoring: "Symptoms, BP, edema, and repeat hemodynamics to confirm durable response.",
    interactions: "Do not continue as sole strategy unless long-term responder criteria are met.",
    renal: "Agent-specific.",
    hepatic: "Agent-specific.",
    pregnancy: "Specialist-guided pregnancy management required."
  }
};

var CLASS_LABELS = {
  era: "Endothelin receptor antagonist (ERA)",
  pde5i: "PDE5 inhibitor",
  sgc: "sGC stimulator",
  parenteral_prostacyclin: "Parenteral prostacyclin pathway",
  inhaled_oral_prostacyclin: "Inhaled or oral prostacyclin pathway",
  ip_receptor: "IP receptor agonist",
  activin: "Activin signaling inhibitor",
  anticoagulation: "Anticoagulation",
  ccb: "Calcium channel blocker pathway"
};

var CLINICAL_POLICY = {
  guidelineVersion: "FDA label through 2025-12 + ESC/ERS-aligned risk workflow + WSPH context",
  lastUpdated: "April 12, 2026",
  sotaterceptPlacementMode: "early_add_on",
  riskModelDefaults: {
    initial: "reveal20_initial",
    follow_up: "compera20_followup"
  }
};

var IMPORTANT_CITATIONS = [
  {
    id: "escers_2022",
    label: "2022 ESC/ERS Guidelines for the diagnosis and treatment of pulmonary hypertension",
    href: "https://academic.oup.com/eurheartj/article/43/38/3618/6673929"
  },
  {
    id: "wsph_2024_definition",
    label: "2024 WSPH definition, classification and diagnosis of pulmonary hypertension",
    href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11533989/"
  },
  {
    id: "wsph_2024_treatment",
    label: "2024 WSPH treatment algorithm for pulmonary arterial hypertension",
    href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11525349/"
  },
  {
    id: "ala_pha_2024",
    label: "2024 ALA/PHA panel consensus: Reimagining the ESC/ERS 2022 Diagnostic and Treatment Guidelines",
    href: "https://www.lung.org/getmedia/b613ee8b-c808-4646-9608-459499185602/PH-Guidelines_Nov2024.pdf"
  },
  {
    id: "sotatercept_fda_2025",
    label: "Sotatercept / Winrevair FDA label (2025 update)",
    href: "https://www.accessdata.fda.gov/drugsatfda_docs/label/2025/761363s008lbl.pdf"
  },
  {
    id: "sildenafil_label",
    label: "Sildenafil / Revatio prescribing information (DailyMed)",
    href: "https://dailymed.nlm.nih.gov/dailymed/fda/fdaDrugXsl.cfm?setid=3bb9363e-b28d-4019-8aae-539233dca214"
  },
  {
    id: "bosentan_label",
    label: "Bosentan prescribing information (DailyMed)",
    href: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=8444da17-6c31-492b-8842-93740f083d9d"
  },
  {
    id: "chest_2019",
    label: "2019 CHEST guideline update for therapy of pulmonary arterial hypertension in adults",
    href: "https://www.sciencedirect.com/science/article/pii/S0012369219300029"
  },
  {
    id: "apixaban_label",
    label: "Apixaban / Eliquis prescribing information (DailyMed)",
    href: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=fec050b0-4f50-4f27-aec0-6f58ed6f7d44"
  },
  {
    id: "rivaroxaban_label",
    label: "Rivaroxaban / Xarelto prescribing information (DailyMed)",
    href: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=10db92f9-2300-4a80-836b-673e1ae91610"
  },
  {
    id: "nejm_apixaban_rivaroxaban_vte_2026",
    label: "2026 NEJM trial: apixaban vs rivaroxaban for acute venous thromboembolism",
    href: "https://www.nejm.org/doi/full/10.1056/NEJMoa2510703"
  },
  {
    id: "increase_nejm_2021",
    label: "2021 NEJM INCREASE trial: inhaled treprostinil in PH-ILD",
    href: "https://pubmed.ncbi.nlm.nih.gov/33440084/"
  }
];

var IMPORTANT_CITATIONS_BY_ID = IMPORTANT_CITATIONS.reduce(function buildCitationLookup(lookup, citation) {
  lookup[citation.id] = citation;
  return lookup;
}, {});

var INPUT_PLAUSIBILITY_RULES = {
  mPAP: { label: "mPAP", min: 0, max: 120, unit: "mmHg" },
  PAWP: { label: "PAWP", min: 0, max: 40, unit: "mmHg" },
  PVR: { label: "PVR", min: 0, max: 25, unit: "WU" },
  walkDistance: { label: "6MWD", min: 0, max: 1000, unit: "m" },
  bnp: { label: "BNP", min: 0, max: 10000, unit: "pg/mL" },
  ntProbnp: { label: "NT-proBNP", min: 0, max: 70000, unit: "pg/mL" },
  systolicBp: { label: "Systolic BP", min: 40, max: 300, unit: "mmHg" },
  platelets: { label: "Platelets", min: 0, max: 1000, unit: "x10^3/uL" },
  heartRate: { label: "Heart rate", min: 20, max: 240, unit: "bpm" },
  egfr: { label: "eGFR", min: 0, max: 200, unit: "mL/min/1.73m2" },
  dlcoPercentPred: { label: "DLCO", min: 0, max: 150, unit: "% predicted" },
  mrap: { label: "mRAP", min: 0, max: 40, unit: "mmHg" }
};

var RISK_STRATA_CONFIG = {
  reveal20_initial: [
    { tier: "low", title: "Low", note: "Initial low-risk profile.", meta: "REVEAL <=6" },
    { tier: "intermediate", title: "Intermediate", note: "Needs close treatment planning and reassessment.", meta: "REVEAL 7-8" },
    { tier: "high", title: "High", note: "Aggressive therapy and transplant-oriented planning.", meta: "REVEAL >=9" }
  ],
  escers_simplified_initial: [
    { tier: "low", title: "Low", note: "Initial low-risk estimate.", meta: "Mean <=1.5" },
    { tier: "intermediate", title: "Intermediate", note: "Escalation often needed if low risk is not reached.", meta: "Mean 1.6-2.5" },
    { tier: "high", title: "High", note: "High-risk estimate requiring urgent intensification.", meta: "Mean >2.5" }
  ],
  reveal_lite2_followup: [
    { tier: "low", title: "Low", note: "Goal state at follow-up.", meta: "REVEAL Lite 2 <=5" },
    { tier: "intermediate", title: "Intermediate", note: "Low risk not yet achieved.", meta: "REVEAL Lite 2 6-7" },
    { tier: "high", title: "High", note: "Urgent escalation and referral planning.", meta: "REVEAL Lite 2 >=8" }
  ],
  compera20_followup: [
    { tier: "low", title: "Low", note: "Goal state at follow-up.", meta: "Mean <=1.5" },
    { tier: "intermediate_low", title: "Intermediate-Low", note: "Escalation usually needed if low risk is not reached.", meta: "Mean 1.6-2.5" },
    { tier: "intermediate_high", title: "Intermediate-High", note: "Higher-intensity escalation and referral planning.", meta: "Mean 2.6-3.5" },
    { tier: "high", title: "High", note: "Urgent aggressive therapy / transplant-oriented care.", meta: "Mean >3.5" }
  ],
  french_noninvasive_followup: [
    { tier: "low", title: "Low", note: "All 3 low-risk criteria met.", meta: "3 of 3 criteria" },
    { tier: "intermediate", title: "Intermediate", note: "Low risk not yet secured.", meta: "2 of 3 criteria" },
    { tier: "high", title: "High", note: "Substantial residual risk.", meta: "0-1 of 3 criteria" }
  ]
};

var FOLLOW_UP_REGIMEN_DRUG_IDS = [
  "ambrisentan",
  "bosentan",
  "ccb_vasoreactive",
  "epoprostenol_iv",
  "iloprost",
  "macitentan",
  "riociguat",
  "selexipag",
  "sildenafil",
  "sotatercept",
  "tadalafil",
  "treprostinil_dpi",
  "treprostinil_inhaled",
  "treprostinil_oral",
  "treprostinil_sciv"
];

function getDrugsByClass(classId) {
  return Object.values(DRUGS).filter((drug) => drug.classId === classId);
}

function toNumber(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function toNullableBoolean(value) {
  if (value === "yes") {
    return true;
  }
  if (value === "no") {
    return false;
  }
  return null;
}

function parseInput(formData) {
  const mPAP = toNumber(formData.get("mPAP"));
  const pawp = toNumber(formData.get("PAWP"));
  const pvr = toNumber(formData.get("PVR"));

  return {
    assessmentStage: formData.get("assessmentStage"),
    riskModel: formData.get("riskModel"),
    sotaterceptPlacementMode: formData.get("sotaterceptPlacementMode") || CLINICAL_POLICY.sotaterceptPlacementMode,
    whoGroup: formData.get("whoGroup"),
    mPAP,
    PAWP: pawp,
    PVR: pvr,
    whoFc: formData.get("whoFc"),
    walkDistance: toNumber(formData.get("walkDistance")),
    bnp: toNumber(formData.get("bnp")),
    ntProbnp: toNumber(formData.get("ntProbnp")),
    systolicBp: toNumber(formData.get("systolicBp")),
    systolicBpCategory: formData.get("systolicBpCategory"),
    heartRate: toNumber(formData.get("heartRate")),
    heartRateCategory: formData.get("heartRateCategory"),
    maleOver60: formData.get("maleOver60") === "yes",
    egfr: toNumber(formData.get("egfr")),
    pahSubgroup: formData.get("pahSubgroup"),
    dlcoPercentPred: toNumber(formData.get("dlcoPercentPred")),
    mrap: toNumber(formData.get("mrap")),
    platelets: toNumber(formData.get("platelets")),
    walkDistanceCategory: formData.get("walkDistanceCategory"),
    bnpCategory: formData.get("bnpCategory"),
    ntProbnpCategory: formData.get("ntProbnpCategory"),
    currentRegimenDrugIds: formData.getAll("currentRegimenDrugIds").filter((id) => id && DRUGS[id]),
    ctephOperability: formData.get("ctephOperability"),
    ctephPersistentAfterPte: formData.get("ctephPersistentAfterPte"),
    ctephBpaEligible: formData.get("ctephBpaEligible"),
    ctephPvrGreaterThan4: formData.get("ctephPvrGreaterThan4"),
    recentHospitalization: toNullableBoolean(formData.get("recentHospitalization")),
    pericardialEffusion: toNullableBoolean(formData.get("pericardialEffusion")),
    cardiopulmonaryComorbidities: formData.get("cardiopulmonaryComorbidities") === "on",
    vasoreactivityEligible: formData.get("vasoreactivityEligible") === "on",
    vasoreactivityPositive: formData.get("vasoreactivityPositive") === "on",
    ildAssociated: formData.get("ildAssociated") === "on",
    severeIldPh: formData.get("severeIldPh") === "on",
    rightHeartFailureSigns: formData.get("rightHeartFailureSigns") === "on",
    volumeOverload: formData.get("volumeOverload") === "on" || (pawp !== null && pawp > 15),
    pregnantOrTrying: formData.get("pregnantOrTrying") === "on",
    onNitrates: formData.get("onNitrates") === "on",
    strongCyp2c8Inhibitor: formData.get("strongCyp2c8Inhibitor") === "on",
    onClopidogrel: formData.get("onClopidogrel") === "on",
    hepaticImpairment: formData.get("hepaticImpairment"),
    renalStatus: formData.get("renalStatus")
  };
}

function classifyHemodynamics(input) {
  if (input.mPAP === null || input.PAWP === null || input.PVR === null) {
    return {
      hasPH: false,
      profile: "Insufficient hemodynamic data",
      detail: "mPAP, PAWP, and PVR are required for classification."
    };
  }

  const hasPH = input.mPAP > 20;
  if (!hasPH) {
    return {
      hasPH: false,
      profile: "No hemodynamic PH",
      detail: "mPAP <=20 mmHg does not meet current hemodynamic PH definition."
    };
  }

  if (input.PAWP <= 15 && input.PVR > 2) {
    return {
      hasPH: true,
      profile: "Pre-capillary PH phenotype",
      detail: "mPAP >20, PAWP <=15, and PVR >2 WU."
    };
  }

  if (input.PAWP > 15 && input.PVR <= 2) {
    return {
      hasPH: true,
      profile: "Isolated post-capillary PH phenotype",
      detail: "mPAP >20, PAWP >15, and PVR <=2 WU."
    };
  }

  if (input.PAWP > 15 && input.PVR > 2) {
    return {
      hasPH: true,
      profile: "Combined post/pre-capillary PH phenotype",
      detail: "mPAP >20, PAWP >15, and PVR >2 WU."
    };
  }

  return {
    hasPH: true,
    profile: "Unclassified elevated mPAP pattern",
    detail: "mPAP >20 with PAWP <=15 and PVR <=2 WU."
  };
}

function scoreFromThresholds(value, thresholds) {
  if (value === null || value === undefined) {
    return null;
  }
  for (const rule of thresholds) {
    if (rule.check(value)) {
      return rule.score;
    }
  }
  return null;
}

function getBiomarkerScore3Strata(input) {
  const bnpScore = scoreFromThresholds(input.bnp, [
    { check: (v) => v < 50, score: 1 },
    { check: (v) => v <= 800, score: 2 },
    { check: (v) => v > 800, score: 3 }
  ]);

  const ntScore = scoreFromThresholds(input.ntProbnp, [
    { check: (v) => v < 300, score: 1 },
    { check: (v) => v <= 1100, score: 2 },
    { check: (v) => v > 1100, score: 3 }
  ]);

  if (bnpScore === null && ntScore === null) {
    return null;
  }
  if (bnpScore === null) {
    return ntScore;
  }
  if (ntScore === null) {
    return bnpScore;
  }
  return Math.max(bnpScore, ntScore);
}

function getBiomarkerScore4Strata(input) {
  const bnpScore = scoreFromThresholds(input.bnp, [
    { check: (v) => v < 50, score: 1 },
    { check: (v) => v <= 199, score: 2 },
    { check: (v) => v <= 800, score: 3 },
    { check: (v) => v > 800, score: 4 }
  ]);

  const ntScore = scoreFromThresholds(input.ntProbnp, [
    { check: (v) => v < 300, score: 1 },
    { check: (v) => v <= 649, score: 2 },
    { check: (v) => v <= 1100, score: 3 },
    { check: (v) => v > 1100, score: 4 }
  ]);

  if (bnpScore === null && ntScore === null) {
    return null;
  }
  if (bnpScore === null) {
    return ntScore;
  }
  if (ntScore === null) {
    return bnpScore;
  }
  return Math.max(bnpScore, ntScore);
}

function getRenalInsufficiencyFlag(input) {
  if (input.egfr !== null) {
    return input.egfr < 60;
  }
  if (input.renalStatus === "moderate" || input.renalStatus === "severe") {
    return true;
  }
  if (input.renalStatus === "normal") {
    return false;
  }
  return null;
}

function getRenalStatusFromEgfr(egfr) {
  if (egfr === null || egfr === undefined) {
    return null;
  }
  if (egfr >= 60) {
    return "normal";
  }
  if (egfr >= 30) {
    return "moderate";
  }
  return "severe";
}

function hasRenalImpairment(input) {
  if (!input) {
    return false;
  }
  if (input.egfr !== null) {
    return input.egfr < 60;
  }
  return input.renalStatus === "moderate" || input.renalStatus === "severe";
}

function hasHepaticImpairment(input) {
  if (!input) {
    return false;
  }
  return !!input.hepaticImpairment && input.hepaticImpairment !== "none";
}

function buildMedicationImpairmentFlagHtml(input) {
  const messages = [];
  if (hasRenalImpairment(input)) {
    messages.push("Renal impairment entered: review renal considerations for suggested medications.");
  }
  if (hasHepaticImpairment(input)) {
    messages.push("Hepatic impairment entered: review hepatic considerations for suggested medications.");
  }
  if (!messages.length) {
    return "";
  }
  return `<div class="alert-card impairment-context"><strong>Medication context:</strong> ${escapeHtml(messages.join(" "))}</div>`;
}

function getInputPlausibilityWarnings(input) {
  return Object.keys(INPUT_PLAUSIBILITY_RULES).reduce(function collectWarnings(warnings, fieldName) {
    const rule = INPUT_PLAUSIBILITY_RULES[fieldName];
    const value = input[fieldName];

    if (value === null || value === undefined || value === "") {
      return warnings;
    }

    if (value < rule.min || value > rule.max) {
      warnings.push({
        name: fieldName,
        label: rule.label,
        value,
        message: `${rule.label} ${value} ${rule.unit} is outside the app's expected physiologic/clinical entry range (${rule.min}-${rule.max} ${rule.unit}). Confirm the entry.`
      });
    }
    return warnings;
  }, []);
}

function buildInputPlausibilityMessage(warnings) {
  if (!warnings || !warnings.length) {
    return "";
  }
  return `Check unusual values: ${warnings.map((warning) => warning.message).join(" ")}`;
}

function getRevealBiomarkerPoints(input) {
  const points = [];

  if (input.bnp !== null) {
    if (input.bnp < 50) {
      points.push(-2);
    } else if (input.bnp <= 199) {
      points.push(0);
    } else if (input.bnp <= 799) {
      points.push(1);
    } else {
      points.push(2);
    }
  }

  if (input.ntProbnp !== null) {
    if (input.ntProbnp < 300) {
      points.push(-2);
    } else if (input.ntProbnp <= 1099) {
      points.push(0);
    } else {
      points.push(2);
    }
  }

  if (!points.length) {
    return null;
  }

  return Math.max.apply(null, points);
}

function classifyThreeStrataRiskFromMean(meanScore) {
  if (meanScore === null) {
    return "unknown";
  }
  if (meanScore <= 1.5) {
    return "low";
  }
  if (meanScore <= 2.5) {
    return "intermediate";
  }
  return "high";
}

function getAllowedRiskModels(input) {
  if (input.whoGroup !== "1") {
    return [];
  }
  if (input.assessmentStage === "initial") {
    return ["reveal20_initial", "escers_simplified_initial"];
  }
  return ["reveal_lite2_followup", "compera20_followup", "french_noninvasive_followup"];
}

function getDefaultRiskModel(input) {
  if (input.assessmentStage === "initial") {
    return CLINICAL_POLICY.riskModelDefaults.initial;
  }
  return CLINICAL_POLICY.riskModelDefaults.follow_up;
}

function classifyComperaFollowRiskFromMean(meanScore) {
  if (meanScore === null) {
    return "unknown";
  }
  if (meanScore <= 1.5) {
    return "low";
  }
  if (meanScore <= 2.5) {
    return "intermediate_low";
  }
  if (meanScore <= 3.5) {
    return "intermediate_high";
  }
  return "high";
}

function getWhoFcScore4(whoFc) {
  if (whoFc === "I" || whoFc === "II") return 1;
  if (whoFc === "III") return 3;
  if (whoFc === "IV") return 4;
  return null;
}

function calculateMeanScore(scoreMap) {
  const values = Object.values(scoreMap).filter((value) => value !== null);
  if (!values.length) {
    return { mean: null, used: 0 };
  }
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return { mean, used: values.length };
}

function toCell(value) {
  return value === null || value === undefined ? "--" : value;
}

function computeEscErsSimplifiedInitial(input) {
  const componentScores = {
    whoFc: scoreFromThresholds(input.whoFc, [
      { check: (v) => v === "I" || v === "II", score: 1 },
      { check: (v) => v === "III", score: 2 },
      { check: (v) => v === "IV", score: 3 }
    ]),
    sixMwd: scoreFromThresholds(input.walkDistance, [
      { check: (v) => v > 440, score: 1 },
      { check: (v) => v >= 165, score: 2 },
      { check: (v) => v < 165, score: 3 }
    ]),
    biomarker: getBiomarkerScore3Strata(input)
  };

  const meanScore = calculateMeanScore(componentScores);
  const label = classifyThreeStrataRiskFromMean(meanScore.mean);

  return {
    modelId: "escers_simplified_initial",
    modelName: "ESC/ERS Simplified 3-Variable Baseline",
    label,
    pathwayLabel: label,
    score: meanScore.mean,
    variablesUsed: meanScore.used,
    limitedData: meanScore.used < 2,
    riskTable: {
      columns: [
        "Model",
        "Risk Tier",
        "Mean Score",
        "Variables Used",
        "WHO-FC",
        "6MWD",
        "BNP/NT-proBNP"
      ],
      rows: [[
        "ESC/ERS Simplified",
        label,
        meanScore.mean === null ? "--" : Math.round(meanScore.mean),
        `${meanScore.used}/3`,
        toCell(componentScores.whoFc),
        toCell(componentScores.sixMwd),
        toCell(componentScores.biomarker)
      ]]
    }
  };
}

function computeReveal20Initial(input) {
  let score = 6;
  let variablesUsed = 0;
  const componentPoints = {
    pahSubgroup: null,
    ageSex: null,
    renal: null,
    whoFc: null,
    systolicBp: null,
    heartRate: null,
    hospitalization: null,
    sixMwd: null,
    biomarker: null,
    pericardialEffusion: null,
    dlco: null,
    mrap: null,
    pvr: null
  };

  const addVariable = (points) => {
    score += points;
    variablesUsed += 1;
  };

  if (input.whoGroup === "1" && input.pahSubgroup) {
    const subgroupPoints = {
      ctd: 1,
      heritable: 2,
      poph: 3,
      other: 0
    };
    const subgroupPoint = Object.prototype.hasOwnProperty.call(subgroupPoints, input.pahSubgroup)
      ? subgroupPoints[input.pahSubgroup]
      : 0;
    componentPoints.pahSubgroup = subgroupPoint;
    addVariable(subgroupPoint);
  }

  componentPoints.ageSex = input.maleOver60 ? 2 : 0;
  addVariable(componentPoints.ageSex);

  const renalInsufficiency = getRenalInsufficiencyFlag(input);
  if (renalInsufficiency !== null) {
    componentPoints.renal = renalInsufficiency ? 1 : 0;
    addVariable(componentPoints.renal);
  }

  if (input.whoFc) {
    const fcPoints = {
      I: -1,
      II: 0,
      III: 1,
      IV: 2
    };
    const fcPoint = Object.prototype.hasOwnProperty.call(fcPoints, input.whoFc)
      ? fcPoints[input.whoFc]
      : 0;
    componentPoints.whoFc = fcPoint;
    addVariable(fcPoint);
  }

  if (input.systolicBp !== null) {
    componentPoints.systolicBp = input.systolicBp < 110 ? 1 : 0;
    addVariable(componentPoints.systolicBp);
  }

  if (input.heartRate !== null) {
    componentPoints.heartRate = input.heartRate > 96 ? 1 : 0;
    addVariable(componentPoints.heartRate);
  }

  if (input.recentHospitalization !== null) {
    componentPoints.hospitalization = input.recentHospitalization ? 1 : 0;
    addVariable(componentPoints.hospitalization);
  }

  if (input.walkDistance !== null) {
    let walkPoints = 0;
    if (input.walkDistance >= 440) {
      walkPoints = -2;
    } else if (input.walkDistance >= 320) {
      walkPoints = -1;
    } else if (input.walkDistance < 165) {
      walkPoints = 1;
    }
    componentPoints.sixMwd = walkPoints;
    addVariable(walkPoints);
  }

  const biomarkerPoints = getRevealBiomarkerPoints(input);
  if (biomarkerPoints !== null) {
    componentPoints.biomarker = biomarkerPoints;
    addVariable(biomarkerPoints);
  }

  if (input.pericardialEffusion !== null) {
    componentPoints.pericardialEffusion = input.pericardialEffusion ? 1 : 0;
    addVariable(componentPoints.pericardialEffusion);
  }

  if (input.dlcoPercentPred !== null) {
    componentPoints.dlco = input.dlcoPercentPred < 40 ? 1 : 0;
    addVariable(componentPoints.dlco);
  }

  if (input.mrap !== null) {
    componentPoints.mrap = input.mrap > 20 ? 1 : 0;
    addVariable(componentPoints.mrap);
  }

  if (input.PVR !== null) {
    componentPoints.pvr = input.PVR < 5 ? -1 : 0;
    addVariable(componentPoints.pvr);
  }

  let label = "high";
  if (score <= 6) {
    label = "low";
  } else if (score <= 8) {
    label = "intermediate";
  }

  return {
    modelId: "reveal20_initial",
    modelName: "REVEAL 2.0",
    label,
    pathwayLabel: label,
    score,
    variablesUsed,
    limitedData: variablesUsed < 7,
    riskTable: {
      columns: [
        "Model",
        "Risk Tier",
        "Total Score",
        "Variables Used",
        "PAH Subgroup pts",
        "Age/Sex pts",
        "Renal pts",
        "WHO-FC pts",
        "SBP pts",
        "HR pts",
        "Hosp pts",
        "6MWD pts",
        "Biomarker pts",
        "Pericardial pts",
        "DLCO pts",
        "mRAP pts",
        "PVR pts"
      ],
      rows: [[
        "REVEAL 2.0",
        label,
        score,
        variablesUsed,
        toCell(componentPoints.pahSubgroup),
        toCell(componentPoints.ageSex),
        toCell(componentPoints.renal),
        toCell(componentPoints.whoFc),
        toCell(componentPoints.systolicBp),
        toCell(componentPoints.heartRate),
        toCell(componentPoints.hospitalization),
        toCell(componentPoints.sixMwd),
        toCell(componentPoints.biomarker),
        toCell(componentPoints.pericardialEffusion),
        toCell(componentPoints.dlco),
        toCell(componentPoints.mrap),
        toCell(componentPoints.pvr)
      ]]
    }
  };
}

function computeRevealLite2Followup(input) {
  let score = 6;
  let variablesUsed = 0;
  const componentPoints = {
    whoFc: null,
    systolicBp: null,
    heartRate: null,
    sixMwd: null,
    biomarker: null,
    renal: null
  };

  const addVariable = (points) => {
    score += points;
    variablesUsed += 1;
  };

  if (input.whoFc) {
    const fcPoints = {
      I: -1,
      II: 0,
      III: 1,
      IV: 2
    };
    const fcPoint = Object.prototype.hasOwnProperty.call(fcPoints, input.whoFc)
      ? fcPoints[input.whoFc]
      : null;
    if (fcPoint !== null) {
      componentPoints.whoFc = fcPoint;
      addVariable(fcPoint);
    }
  }

  if (input.systolicBp !== null) {
    componentPoints.systolicBp = input.systolicBp < 110 ? 1 : 0;
    addVariable(componentPoints.systolicBp);
  }

  if (input.heartRate !== null) {
    componentPoints.heartRate = input.heartRate > 96 ? 1 : 0;
    addVariable(componentPoints.heartRate);
  }

  if (input.walkDistance !== null) {
    let walkPoints = 0;
    if (input.walkDistance >= 440) {
      walkPoints = -2;
    } else if (input.walkDistance >= 320) {
      walkPoints = -1;
    } else if (input.walkDistance < 165) {
      walkPoints = 1;
    }
    componentPoints.sixMwd = walkPoints;
    addVariable(walkPoints);
  }

  const biomarkerPoints = getRevealBiomarkerPoints(input);
  if (biomarkerPoints !== null) {
    componentPoints.biomarker = biomarkerPoints;
    addVariable(biomarkerPoints);
  }

  const renalInsufficiency = getRenalInsufficiencyFlag(input);
  if (renalInsufficiency !== null) {
    componentPoints.renal = renalInsufficiency ? 1 : 0;
    addVariable(componentPoints.renal);
  }

  let label = "high";
  if (variablesUsed === 0) {
    label = "unknown";
  } else if (score <= 5) {
    label = "low";
  } else if (score <= 7) {
    label = "intermediate";
  }

  return {
    modelId: "reveal_lite2_followup",
    modelName: "REVEAL Lite 2",
    label,
    pathwayLabel: label === "intermediate" ? "intermediate_low" : label,
    score: variablesUsed ? score : null,
    variablesUsed,
    limitedData: variablesUsed < 4,
    riskTable: {
      columns: [
        "Model",
        "Risk Tier",
        "Total Score",
        "Variables Used",
        "WHO-FC pts",
        "SBP pts",
        "HR pts",
        "6MWD pts",
        "Biomarker pts",
        "Renal pts"
      ],
      rows: [[
        "REVEAL Lite 2",
        label,
        variablesUsed ? score : "--",
        `${variablesUsed}/6`,
        toCell(componentPoints.whoFc),
        toCell(componentPoints.systolicBp),
        toCell(componentPoints.heartRate),
        toCell(componentPoints.sixMwd),
        toCell(componentPoints.biomarker),
        toCell(componentPoints.renal)
      ]]
    }
  };
}

function computeCompera20Followup(input) {
  const componentScores = {
    whoFc: getWhoFcScore4(input.whoFc),
    sixMwd: scoreFromThresholds(input.walkDistance, [
      { check: (v) => v > 440, score: 1 },
      { check: (v) => v >= 320, score: 2 },
      { check: (v) => v >= 165, score: 3 },
      { check: (v) => v < 165, score: 4 }
    ]),
    biomarker: getBiomarkerScore4Strata(input)
  };

  const meanScore = calculateMeanScore(componentScores);
  const label = classifyComperaFollowRiskFromMean(meanScore.mean);

  return {
    modelId: "compera20_followup",
    modelName: "COMPERA 2.0 4-Risk Strata",
    label,
    pathwayLabel: label,
    score: meanScore.mean,
    variablesUsed: meanScore.used,
    limitedData: meanScore.used < 2,
    riskTable: {
      columns: [
        "Model",
        "Risk Tier",
        "Overall Score",
        "Variables Used",
        "WHO-FC Score",
        "6MWD Score",
        "BNP/NT-proBNP Score"
      ],
      rows: [[
        "COMPERA 2.0",
        label,
        meanScore.mean === null ? "--" : Math.round(meanScore.mean),
        `${meanScore.used}/3`,
        toCell(componentScores.whoFc),
        toCell(componentScores.sixMwd),
        toCell(componentScores.biomarker)
      ]]
    }
  };
}

function computeFrenchNoninvasiveFollowup(input) {
  const criteria = {
    whoFcLow: input.whoFc ? (input.whoFc === "I" || input.whoFc === "II") : null,
    sixMwdLow: input.walkDistance !== null ? input.walkDistance > 440 : null,
    biomarkerLow: (input.bnp !== null || input.ntProbnp !== null)
      ? ((input.bnp !== null && input.bnp < 50) || (input.ntProbnp !== null && input.ntProbnp < 300))
      : null
  };

  const available = Object.values(criteria).filter((value) => value !== null).length;
  const met = Object.values(criteria).filter((value) => value === true).length;
  let label = "unknown";
  if (available > 0) {
    if (met === 3) {
      label = "low";
    } else if (met === 2) {
      label = "intermediate";
    } else {
      label = "high";
    }
  }

  return {
    modelId: "french_noninvasive_followup",
    modelName: "French Noninvasive Criteria",
    label,
    pathwayLabel: label === "intermediate" ? "intermediate_low" : label,
    score: available > 0 ? met : null,
    variablesUsed: available,
    limitedData: available < 3,
    riskTable: {
      columns: [
        "Model",
        "Risk Tier",
        "Low-Risk Criteria Met",
        "Criteria Available",
        "WHO-FC I/II",
        "6MWD >440",
        "BNP<50 or NT-proBNP<300"
      ],
      rows: [[
        "French Noninvasive",
        label,
        available > 0 ? met : "--",
        `${available}/3`,
        criteria.whoFcLow === null ? "--" : (criteria.whoFcLow ? "Yes" : "No"),
        criteria.sixMwdLow === null ? "--" : (criteria.sixMwdLow ? "Yes" : "No"),
        criteria.biomarkerLow === null ? "--" : (criteria.biomarkerLow ? "Yes" : "No")
      ]]
    }
  };
}

function getRiskModelRequirements(modelId) {
  if (modelId === "reveal20_initial") {
    return { minimumForInterpretation: 7, totalVariables: 13 };
  }
  if (modelId === "escers_simplified_initial") {
    return { minimumForInterpretation: 2, totalVariables: 3 };
  }
  if (modelId === "reveal_lite2_followup") {
    return { minimumForInterpretation: 4, totalVariables: 6 };
  }
  if (modelId === "compera20_followup") {
    return { minimumForInterpretation: 2, totalVariables: 3 };
  }
  if (modelId === "french_noninvasive_followup") {
    return { minimumForInterpretation: 3, totalVariables: 3 };
  }
  return { minimumForInterpretation: 0, totalVariables: 0 };
}

function computeRisk(input) {
  const allowedModels = getAllowedRiskModels(input);
  if (!allowedModels.length) {
    return {
      modelId: null,
      modelName: null,
      label: "unknown",
      pathwayLabel: input.assessmentStage === "initial" ? "intermediate" : "intermediate_low",
      score: null,
      variablesUsed: 0,
      limitedData: false,
      riskTable: null
    };
  }

  const selectedModel = allowedModels.includes(input.riskModel)
    ? input.riskModel
    : getDefaultRiskModel(input);

  if (selectedModel === "escers_simplified_initial") {
    return computeEscErsSimplifiedInitial(input);
  }
  if (selectedModel === "reveal20_initial") {
    return computeReveal20Initial(input);
  }
  if (selectedModel === "reveal_lite2_followup") {
    return computeRevealLite2Followup(input);
  }
  if (selectedModel === "french_noninvasive_followup") {
    return computeFrenchNoninvasiveFollowup(input);
  }
  return computeCompera20Followup(input);
}

function sortDrugIdsAlphabetically(drugIds) {
  return drugIds.slice().sort((a, b) => {
    const nameA = DRUGS[a] && DRUGS[a].name ? DRUGS[a].name : a;
    const nameB = DRUGS[b] && DRUGS[b].name ? DRUGS[b].name : b;
    return nameA.localeCompare(nameB);
  });
}

function mergeDrugIds(primaryDrugIds, additionalDrugIds) {
  const seen = {};
  const merged = [];
  [primaryDrugIds || [], additionalDrugIds || []].forEach((drugIds) => {
    drugIds.forEach((drugId) => {
      if (!DRUGS[drugId] || seen[drugId]) {
        return;
      }
      seen[drugId] = true;
      merged.push(drugId);
    });
  });
  return sortDrugIdsAlphabetically(merged);
}

function buildSelectionTarget(id, label, note, drugIds, min, max) {
  return { id, label, note, drugIds: sortDrugIdsAlphabetically(drugIds), min, max };
}

function pushSelectionTarget(decision, id, label, note, drugIds, min, max) {
  const availableDrugIds = sortDrugIdsAlphabetically(drugIds.filter((drugId) => !!DRUGS[drugId]));
  if (!availableDrugIds.length) {
    return;
  }
  decision.selectionTargets.push(
    buildSelectionTarget(
      id,
      label,
      note,
      availableDrugIds,
      Math.min(min, availableDrugIds.length),
      Math.min(max, availableDrugIds.length)
    )
  );
}

function formatRiskLabel(label) {
  return label
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function normalizeTextForComparison(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function uniqueTextList(values) {
  const seen = {};
  return (values || []).filter((value) => {
    const key = normalizeTextForComparison(value);
    if (!key || seen[key]) {
      return false;
    }
    seen[key] = true;
    return true;
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function addActionUnique(decision, action) {
  if (!decision.actions.includes(action)) {
    decision.actions.push(action);
  }
}

function addMonitoringUnique(decision, item) {
  if (!decision.monitoringSafety.includes(item)) {
    decision.monitoringSafety.push(item);
  }
}

function addCitationIdUnique(citationIds, citationId) {
  if (!citationId || !IMPORTANT_CITATIONS_BY_ID[citationId]) {
    return;
  }
  if (!citationIds.includes(citationId)) {
    citationIds.push(citationId);
  }
}

function getDrugSourceLabel(drugId, currentRegimenDrugIds, selectedDrugIds) {
  const inCurrentRegimen = !!currentRegimenDrugIds && currentRegimenDrugIds.includes(drugId);
  const inSelectedDrugs = !!selectedDrugIds && selectedDrugIds.includes(drugId);

  if (inCurrentRegimen && inSelectedDrugs) {
    return "current regimen and new selection";
  }
  if (inCurrentRegimen) {
    return "current regimen";
  }
  if (inSelectedDrugs) {
    return "new selection";
  }
  return "active regimen";
}

function setPrimaryRecommendation(decision, message) {
  decision.primaryRecommendation = message;
}

function dedupeSelectionTargets(targets) {
  const seen = {};
  return (targets || []).filter((target) => {
    const key = [
      normalizeTextForComparison(target.label),
      (target.drugIds || []).join("|"),
      target.min,
      target.max
    ].join("::");
    if (seen[key]) {
      return false;
    }
    seen[key] = true;
    return true;
  });
}

function getCondensedActionText(primaryRecommendation, action) {
  if (!primaryRecommendation || !action || action.indexOf(":") === -1 || primaryRecommendation.indexOf(":") === -1) {
    return action;
  }

  const primaryPrefix = primaryRecommendation.split(":")[0];
  const actionPrefix = action.split(":")[0];
  if (normalizeTextForComparison(primaryPrefix) !== normalizeTextForComparison(actionPrefix)) {
    return action;
  }

  const remainder = action.slice(action.indexOf(":") + 1).trim();
  if (!remainder) {
    return action;
  }

  return remainder.charAt(0).toUpperCase() + remainder.slice(1);
}

function getDisplayActions(decision) {
  const primaryKey = normalizeTextForComparison(decision.primaryRecommendation);
  const condensed = (decision.actions || [])
    .map((action) => getCondensedActionText(decision.primaryRecommendation, action))
    .filter((action) => normalizeTextForComparison(action) !== primaryKey);
  return uniqueTextList(condensed);
}

function normalizeDecisionOutput(decision) {
  decision.summary = uniqueTextList(decision.summary);
  decision.alerts = uniqueTextList(decision.alerts);
  decision.actions = uniqueTextList(decision.actions);
  decision.monitoringSafety = uniqueTextList(decision.monitoringSafety);
  decision.eligibilityChecks = uniqueTextList(decision.eligibilityChecks);
  decision.rationale = uniqueTextList(decision.rationale);
  decision.selectionTargets = dedupeSelectionTargets(decision.selectionTargets);
  return decision;
}

function getPde5ContraindicationReason(input) {
  const reasons = [];

  if (input.onNitrates) {
    reasons.push("current nitrates/NO donor therapy");
  }

  if (input.systolicBp !== null && input.systolicBp < 90) {
    reasons.push("systolic BP <90 mmHg");
  }

  if (!reasons.length) {
    return "";
  }

  if (reasons.length === 1) {
    return reasons[0];
  }

  return `${reasons.slice(0, -1).join(", ")} and ${reasons[reasons.length - 1]}`;
}

function applyContextToSelectionTargets(decision, input) {
  const filteredTargets = [];
  const pde5ContraindicationReason = getPde5ContraindicationReason(input);
  let pde5RemovedByContraindication = false;

  (decision.selectionTargets || []).forEach((target) => {
    const originalDrugIds = (target.drugIds || []).filter((drugId) => !!DRUGS[drugId]);
    let allowedDrugIds = originalDrugIds.slice();
    const hadPde5Option = originalDrugIds.some((drugId) => DRUGS[drugId].classId === "pde5i");

    if (input.pregnantOrTrying) {
      allowedDrugIds = allowedDrugIds.filter((drugId) => !["era", "sgc", "ip_receptor"].includes(DRUGS[drugId].classId));
    }

    if (input.onNitrates) {
      allowedDrugIds = allowedDrugIds.filter((drugId) => {
        const classId = DRUGS[drugId].classId;
        return classId !== "pde5i" && classId !== "sgc";
      });
    }

    if (input.systolicBp !== null && input.systolicBp < 90) {
      allowedDrugIds = allowedDrugIds.filter((drugId) => DRUGS[drugId].classId !== "pde5i");
    }

    const pde5RemovedForTarget = hadPde5Option
      && !allowedDrugIds.some((drugId) => DRUGS[drugId].classId === "pde5i");

    if (pde5RemovedForTarget && pde5ContraindicationReason) {
      pde5RemovedByContraindication = true;
    }

    if (!allowedDrugIds.length) {
      return;
    }

    const hasEraOption = allowedDrugIds.some((drugId) => DRUGS[drugId].classId === "era");
    let note = target.note;

    if (pde5RemovedForTarget && hasEraOption && pde5ContraindicationReason) {
      const eraOnlyNote = `PDE-5 initiation is contraindicated because of ${pde5ContraindicationReason}; consider starting with an ERA only.`;
      note = note ? `${note} ${eraOnlyNote}` : eraOnlyNote;
    }

    filteredTargets.push({
      id: target.id,
      label: target.label,
      note,
      drugIds: sortDrugIdsAlphabetically(allowedDrugIds),
      min: Math.min(target.min, allowedDrugIds.length),
      max: Math.min(target.max, allowedDrugIds.length)
    });
  });

  if (
    pde5RemovedByContraindication
    && filteredTargets.some((target) => (target.drugIds || []).some((drugId) => DRUGS[drugId].classId === "era"))
  ) {
    decision.alerts.push(`The patient would otherwise qualify for a PDE-5 inhibitor, but PDE-5 initiation is contraindicated because of ${pde5ContraindicationReason}; consider starting with an ERA only.`);
  }

  decision.selectionTargets = filteredTargets;
  return decision;
}

function getActivePolicy(input) {
  return {
    guidelineVersion: CLINICAL_POLICY.guidelineVersion,
    lastUpdated: CLINICAL_POLICY.lastUpdated,
    sotaterceptPlacementMode: input.sotaterceptPlacementMode || CLINICAL_POLICY.sotaterceptPlacementMode
  };
}

function renderAppMetadata() {
  const updatedEl = document.getElementById("app-last-updated");

  if (updatedEl) {
    updatedEl.textContent = CLINICAL_POLICY.lastUpdated;
  }
}

function getCurrentRegimenState(input) {
  const drugIds = sortDrugIdsAlphabetically((input.currentRegimenDrugIds || []).filter((drugId) => !!DRUGS[drugId]));
  const classCounts = countByClass(drugIds);
  const classIds = Object.keys(classCounts);

  return {
    drugIds,
    names: drugIds.map((drugId) => DRUGS[drugId].name),
    classCounts,
    isEmpty: drugIds.length === 0,
    hasDrug(drugId) {
      return drugIds.includes(drugId);
    },
    hasClass(classId) {
      return classIds.includes(classId);
    },
    hasEra: classIds.includes("era"),
    hasPde5: classIds.includes("pde5i"),
    hasSgc: classIds.includes("sgc"),
    hasParenteral: classIds.includes("parenteral_prostacyclin"),
    hasInhaledOrOralProstacyclin: classIds.includes("inhaled_oral_prostacyclin"),
    hasIpReceptor: classIds.includes("ip_receptor"),
    hasAnyProstacyclinPathway: classIds.includes("parenteral_prostacyclin") || classIds.includes("inhaled_oral_prostacyclin") || classIds.includes("ip_receptor"),
    hasActivin: classIds.includes("activin")
  };
}

function evaluateSotaterceptEligibility(input) {
  let plateletStatus = "pending";
  let plateletMessage = "Enter a baseline platelet count before recommending sotatercept.";
  let eligible = false;

  if (input.platelets !== null) {
    if (input.platelets >= 50) {
      plateletStatus = "pass";
      plateletMessage = `Platelets ${Math.round(input.platelets)} x10^3/uL: eligible by label threshold (>=50).`;
      eligible = true;
    } else {
      plateletStatus = "fail";
      plateletMessage = `Platelets ${Math.round(input.platelets)} x10^3/uL: do not initiate sotatercept below 50 x10^3/uL.`;
      eligible = false;
    }
  }

  return {
    eligible,
    plateletStatus,
    plateletMessage,
    pregnancyMessage: input.pregnantOrTrying
      ? "Pregnancy context: specialist counseling is required before any sotatercept decision."
      : "Pregnancy context not flagged.",
    monitoringMessage: "Monitoring reminder: check hemoglobin and platelets before each of the first 5 doses (or longer if unstable), then periodically.",
    indicationMessage: "Label reminder: adult WHO Group 1 PAH indication includes exercise capacity, WHO functional class, and clinical worsening risk reduction."
  };
}

function shouldSuggestSotatercept(policy, input, pathwayRiskLabel) {
  if (input.whoGroup !== "1") {
    return false;
  }

  if (policy.sotaterceptPlacementMode === "conservative") {
    return input.assessmentStage === "initial"
      ? pathwayRiskLabel === "high"
      : pathwayRiskLabel === "intermediate_high" || pathwayRiskLabel === "high";
  }

  if (input.assessmentStage === "follow_up") {
    return pathwayRiskLabel !== "low" && pathwayRiskLabel !== "unknown";
  }
  return pathwayRiskLabel === "high";
}

function maybeAddSotaterceptOption(decision, input, pathwayRiskLabel, currentRegimen) {
  const policy = decision.policy;
  const eligibility = decision.sotaterceptEligibility;
  if (currentRegimen && currentRegimen.hasDrug("sotatercept")) {
    addMonitoringUnique(decision, "Current regimen already includes sotatercept: continue CBC monitoring and assess net clinical response before layering additional changes.");
    return;
  }
  if (!shouldSuggestSotatercept(policy, input, pathwayRiskLabel)) {
    return;
  }

  decision.eligibilityChecks.push(eligibility.plateletMessage);
  decision.eligibilityChecks.push(eligibility.pregnancyMessage);
  decision.eligibilityChecks.push(eligibility.monitoringMessage);
  decision.eligibilityChecks.push(eligibility.indicationMessage);

  if (eligibility.eligible) {
    addActionUnique(decision, "Consider adding sotatercept (Winrevair) if low-risk status has not been achieved.");
  } else {
    addActionUnique(decision, "Sotatercept may be considered after eligibility is confirmed, especially a qualifying platelet count.");
  }

  decision.selectionTargets.push(
    buildSelectionTarget(
      `sotatercept_${input.assessmentStage}`,
      "Optional sotatercept add-on",
      eligibility.eligible
        ? "Suggested by the active policy mode; confirm ongoing CBC monitoring."
        : "Suggested by the active policy mode, but eligibility is incomplete or failed. Check platelet threshold and counseling needs before use.",
      ["sotatercept"],
      0,
      1
    )
  );
}

function appendDiuresisRecommendation(decision, input, hemo) {
  const postCapillaryContext =
    hemo.profile.includes("post-capillary") || hemo.profile.includes("Combined post/pre-capillary");
  const hasCongestionSignals = input.volumeOverload || input.rightHeartFailureSigns;

  if (hasCongestionSignals) {
    addActionUnique(
      decision,
      "Recommend decongestion/diuresis for volume overload (typically loop-diuretic based), with daily weights, intake/output review, and symptom reassessment."
    );
    addMonitoringUnique(
      decision,
      "Monitor renal function and electrolytes (especially sodium and potassium) after diuretic initiation or dose adjustment."
    );
    if (input.whoGroup === "2" || postCapillaryContext) {
      addActionUnique(
        decision,
        "In post-capillary or PH-LHD physiology, prioritize decongestion as a core management step."
      );
    }
    return;
  }

  if (input.whoGroup === "2" || postCapillaryContext) {
    addMonitoringUnique(
      decision,
      "Assess for clinical congestion at each encounter and initiate/adjust diuresis when volume overload is present."
    );
  }
}

function appendTransplantReferralRecommendation(decision, input, riskResult, pathwayRiskLabel) {
  if (input.whoGroup !== "1") {
    return;
  }

  const selectedScore = riskResult.score;
  const selectedModel = riskResult.modelId;
  const modelSpecificHighSignal =
    (selectedModel === "reveal20_initial" && selectedScore !== null && selectedScore >= 8) ||
    (selectedModel === "reveal_lite2_followup" && selectedScore !== null && selectedScore >= 8) ||
    (selectedModel === "french_noninvasive_followup" && selectedScore !== null && selectedScore <= 1);

  const needsReferral =
    modelSpecificHighSignal ||
    pathwayRiskLabel === "intermediate_high" ||
    pathwayRiskLabel === "high";

  const needsListingDiscussion =
    (selectedModel === "reveal20_initial" && selectedScore !== null && selectedScore >= 10) ||
    pathwayRiskLabel === "high";

  if (needsReferral && needsListingDiscussion) {
    addActionUnique(
      decision,
      "Recommend referral to a lung transplant center for formal evaluation; if high risk persists despite optimized therapy, discuss transplant listing candidacy with that center."
    );
    return;
  }

  if (needsReferral) {
    addActionUnique(decision, "Recommend referral to a lung transplant center for formal evaluation and early advanced-therapy planning.");
  }
}

function getCtephOperabilityLabel(value) {
  const labels = {
    not_assessed: "not yet assessed",
    operable: "operable",
    non_operable: "non-operable"
  };
  return labels[value] || "not yet assessed";
}

function getCtephPersistentAfterPteLabel(value) {
  const labels = {
    not_applicable: "not applicable / PTE not yet performed",
    none_after_pte: "no residual PH after PTE",
    persistent_recurrent: "persistent or recurrent PH after PTE"
  };
  return labels[value] || "not applicable / PTE not yet performed";
}

function getCtephBpaEligibleLabel(value) {
  const labels = {
    not_assessed: "not yet assessed",
    yes: "yes",
    no: "no"
  };
  return labels[value] || "not yet assessed";
}

function buildDecision(input) {
  const hemo = classifyHemodynamics(input);
  const risk = computeRisk(input);
  const showPahRiskScores = input.whoGroup === "1";
  const policy = getActivePolicy(input);
  const selectedModel = risk.modelId || input.riskModel || getDefaultRiskModel(input);
  const riskRequirements = getRiskModelRequirements(selectedModel);
  const currentRegimen = input.assessmentStage === "follow_up" && input.whoGroup === "1"
    ? getCurrentRegimenState(input)
    : null;

  const decision = {
    hemo,
    risk,
    policy,
    currentRegimenDrugIds: currentRegimen ? currentRegimen.drugIds : [],
    summary: [],
    riskTable: null,
    transparencyTable: null,
    primaryRecommendation: "",
    alerts: [],
    actions: [],
    monitoringSafety: [],
    eligibilityChecks: [],
    rationale: [],
    selectionTargets: [],
    sotaterceptEligibility: showPahRiskScores ? evaluateSotaterceptEligibility(input) : null
  };

  decision.summary.push(`${hemo.profile}: ${hemo.detail}`);

  if (showPahRiskScores) {
    decision.riskTable = {
      columns: ["Model", "Risk Tier", "Total Score"],
      rows: [[
        risk.modelName || "--",
        formatRiskLabel(risk.label || "unknown"),
        risk.score === null || risk.score === undefined ? "--" : Math.round(risk.score)
      ]]
    };
    decision.transparencyTable = risk.riskTable;
    if (risk.label === "unknown" && riskRequirements.totalVariables) {
      decision.alerts.push(`Risk tier unavailable: enter at least ${riskRequirements.minimumForInterpretation} of ${riskRequirements.totalVariables} variables for the selected model.`);
    } else if (risk.limitedData) {
      decision.alerts.push("Selected risk model is based on limited variables. Interpret cautiously.");
    }
    if (currentRegimen) {
      if (currentRegimen.isEmpty) {
        decision.summary.push("Current regimen: not entered.");
      } else {
        decision.summary.push(`Current regimen: ${currentRegimen.names.join(", ")}.`);
      }
      if (currentRegimen.hasPde5 && currentRegimen.hasSgc) {
        decision.alerts.push("Current regimen includes both a PDE5 inhibitor and riociguat. Verify that these are not being used together because the combination is contraindicated.");
      }
    }
  } else {
    decision.summary.push(`WHO Group ${input.whoGroup} pathway selected.`);
  }

  if (!hemo.hasPH) {
    setPrimaryRecommendation(decision, "Do not initiate PH-targeted therapy based on the currently entered hemodynamics.");
    decision.actions.push("Do not initiate PH-targeted therapy based on current hemodynamics alone.");
    decision.actions.push("Reassess diagnosis and repeat workup if clinical suspicion remains high.");
    decision.rationale.push("Current definitions require mPAP >20 mmHg to meet hemodynamic PH criteria.");
    return decision;
  }

  if (hemo.profile === "Isolated post-capillary PH phenotype") {
    decision.riskTable = null;
    decision.transparencyTable = null;
    decision.eligibilityChecks = [];
    setPrimaryRecommendation(decision, "Isolated post-capillary PH physiology: do not use PAH-directed therapy; focus on decongestion/diuresis and management of the post-capillary/left-heart phenotype.");
    decision.alerts.push("Isolated post-capillary PH phenotype entered: PAH-directed therapies should not be administered on this hemodynamic profile.");
    addActionUnique(decision, "Prioritize decongestion/diuresis and reassess volume status, filling pressures, and the left-heart disease phenotype.");
    appendDiuresisRecommendation(decision, input, hemo);
    decision.rationale.push("ESC/ERS guidance does not recommend PAH drugs for isolated post-capillary PH/PH-LHD physiology; management should focus on congestion relief and the underlying post-capillary driver.");
    return decision;
  }

  appendDiuresisRecommendation(decision, input, hemo);

  if (input.onNitrates) {
    decision.alerts.push("Nitrates/NO donor therapy is active: avoid PDE5 inhibitors and riociguat combinations.");
  }

  if (input.pregnantOrTrying) {
    decision.alerts.push("Pregnancy context detected: avoid teratogenic pathways (notably ERAs and riociguat) and co-manage with expert PH center.");
  }

  if (input.vasoreactivityPositive && !input.vasoreactivityEligible) {
    decision.alerts.push("Positive vasoreactivity was selected without an eligible IPAH/HPAH/drug-associated PAH phenotype. Confirm that vasoreactivity testing is appropriate before using the CCB branch.");
  }

  if (input.severeIldPh && !input.ildAssociated) {
    decision.alerts.push("Severe ILD-PH modifier is set without ILD-associated PH; this flag is applied only within the ILD branch.");
  }

  if (input.whoGroup === "2") {
    setPrimaryRecommendation(decision, "Treat the left-heart disease phenotype first and avoid routine PAH-targeted therapy in Group 2 PH.");
    decision.alerts.push("Group 2 PH-LHD guardrail: routine PAH-targeted therapy is not recommended.");
    decision.actions.push("Prioritize optimization of left-heart disease and volume/hemodynamic management.");
    decision.actions.push("Refer to a PH center when diagnosis is uncertain or there is severe pre-capillary component/RV dysfunction.");
    decision.rationale.push("PH-LHD guidance emphasizes treating underlying left-heart disease and avoiding routine PAH-drug use in Group 2 PH.");
    return decision;
  }

  if (input.whoGroup === "3") {
    setPrimaryRecommendation(decision, "Optimize lung disease, oxygenation, and supportive care first; reserve targeted therapy for selected PH-ILD pathways.");
    decision.actions.push("Optimize underlying lung disease, oxygenation, and supportive care first.");
    decision.actions.push("Suggest enrollment in pulmonary rehabilitation when clinically feasible.");
    decision.alerts.push("Group 3 guardrail: endothelin receptor antagonists and riociguat are not recommended because they may worsen gas exchange and are not standard therapy for Group 3 PH.");
    if (input.ildAssociated) {
      const meetsTreprostinilPhIldThreshold = input.mPAP !== null && input.mPAP >= 25 && input.PVR !== null && input.PVR > 3;
      if (meetsTreprostinilPhIldThreshold) {
        decision.actions.push("PH-ILD branch: inhaled treprostinil can be considered with specialist oversight when the hemodynamic phenotype matches the studied PH-ILD population.");
        decision.selectionTargets.push(
          buildSelectionTarget(
            "ild_targeted",
            "Optional targeted therapy for ILD-PH",
            "Select one inhaled prostacyclin option if pursuing targeted therapy.",
            ["treprostinil_inhaled", "treprostinil_dpi"],
            0,
            1
          )
        );
      } else {
        decision.alerts.push("PH-ILD treprostinil gate not met: in this build, inhaled treprostinil is only surfaced when mPAP is >=25 mmHg and PVR is >3 WU, matching the studied PH-ILD treatment population.");
      }
      if (input.severeIldPh) {
        decision.actions.push("Severe ILD-PH branch: PDE5 inhibitor may be considered in PH-center directed care.");
        decision.selectionTargets.push(
          buildSelectionTarget(
            "ild_pde5_optional",
            "Optional PDE5 inhibitor in severe ILD-PH",
            "Consider only in severe phenotype and PH-center supervision.",
            ["sildenafil", "tadalafil"],
            0,
            1
          )
        );
      }
    } else {
      decision.alerts.push("Most PAH-targeted drugs are not recommended in non-severe Group 3 PH.");
    }
    decision.rationale.push("Group 3 management starts with lung disease optimization, oxygen/supportive care, and pulmonary rehabilitation; inhaled treprostinil is selectively surfaced here only for ILD-associated PH when mPAP is >=25 mmHg and PVR is >3 WU, consistent with the studied PH-ILD population.");
    return decision;
  }

  if (input.whoGroup === "4") {
    const operability = input.ctephOperability || "not_assessed";
    const persistentAfterPte = input.ctephPersistentAfterPte || "not_applicable";
    const bpaEligible = input.ctephBpaEligible || "not_assessed";
    const pvrGreaterThan4 = input.ctephPvrGreaterThan4 || "not_assessed";

    decision.summary.push(`CTEPH operability: ${getCtephOperabilityLabel(operability)}.`);
    if (operability === "operable") {
      decision.summary.push(`Post-PTE status: ${getCtephPersistentAfterPteLabel(persistentAfterPte)}.`);
    }
    if (operability === "non_operable" || persistentAfterPte === "persistent_recurrent") {
      decision.summary.push(`BPA eligibility: ${getCtephBpaEligibleLabel(bpaEligible)}.`);
      if (bpaEligible === "yes") {
        decision.summary.push(`PVR >4 WU before BPA sequencing: ${pvrGreaterThan4 === "yes" ? "yes" : (pvrGreaterThan4 === "no" ? "no" : "not yet entered")}.`);
      }
    }

    setPrimaryRecommendation(decision, "CTEPH pathway: lifelong anticoagulation plus expert-center operability and BPA assessment guides next treatment steps.");
    addActionUnique(decision, "Initiate/continue lifelong therapeutic anticoagulation unless contraindicated.");
    addActionUnique(decision, "Ensure expert CTEPH team review for operability (PTE/PEA) and BPA candidacy.");

    decision.selectionTargets.push(
      buildSelectionTarget(
        "cteph_anticoag",
        "CTEPH anticoagulation strategy",
        "Select one anticoagulation pathway. If choosing a DOAC, choose either apixaban or rivaroxaban, not both. Apixaban may be preferred in many circumstances because acute-VTE data suggest less bleeding than rivaroxaban; that preference is extrapolated to CTEPH rather than proven in a CTEPH-specific trial.",
        ["warfarin_cteph", "apixaban_cteph", "rivaroxaban_cteph"],
        1,
        1
      )
    );
    decision.rationale.push("If a DOAC is chosen for CTEPH, apixaban may be preferred over rivaroxaban in many cases because acute-VTE randomized data suggest lower bleeding risk; this is an extrapolation and not CTEPH-specific randomized evidence.");

    if (operability === "not_assessed") {
      setPrimaryRecommendation(decision, "CTEPH pathway: determine operability at an expert center before choosing PTE, BPA, or riociguat.");
      addActionUnique(decision, "Complete multidisciplinary operability determination first; medical therapy should not replace expert procedural assessment.");
    } else if (operability === "operable" && persistentAfterPte !== "persistent_recurrent") {
      if (persistentAfterPte === "none_after_pte") {
        setPrimaryRecommendation(decision, "Post-PTE without residual PH: continue anticoagulation and structured surveillance.");
        addActionUnique(decision, "Continue follow-up after PTE with reassessment in about 3-6 months; repeat hemodynamic review if clinically indicated.");
        addActionUnique(decision, "No routine riociguat escalation is suggested when there is no residual PH after PTE.");
      } else {
        setPrimaryRecommendation(decision, "Operable CTEPH: refer for PTE/PEA evaluation as the preferred disease-modifying strategy.");
        addActionUnique(decision, "Proceed with expert-center surgical evaluation for PTE/PEA.");
        addActionUnique(decision, "Reassess for residual or recurrent PH after PTE because that determines later BPA or riociguat decisions.");
      }
    } else {
      setPrimaryRecommendation(decision, "Non-operable CTEPH or persistent/recurrent PH after PTE: anticoagulation plus BPA eligibility review should direct BPA versus riociguat sequencing.");
      if (bpaEligible === "yes") {
        if (pvrGreaterThan4 === "yes") {
          addActionUnique(decision, "BPA eligible with PVR >4 WU: consider medical therapy with riociguat before staged BPA, then reassess.");
          decision.selectionTargets.push(
            buildSelectionTarget(
              "cteph_riociguat_optional",
              "Riociguat before/alongside BPA pathway",
              "Use when the multidisciplinary CTEPH team favors medical therapy/riociguat before BPA, especially when PVR remains >4 WU.",
              ["riociguat"],
              0,
              1
            )
          );
        } else if (pvrGreaterThan4 === "no") {
          addActionUnique(decision, "BPA eligible with PVR not >4 WU: proceed with BPA planning at the expert center.");
        } else {
          addActionUnique(decision, "BPA eligible: clarify whether PVR remains >4 WU because this affects whether medical therapy/riociguat should precede BPA.");
        }
      } else if (bpaEligible === "no") {
        addActionUnique(decision, "Not BPA eligible: consider riociguat for inoperable or persistent/recurrent symptomatic CTEPH.");
        decision.selectionTargets.push(
          buildSelectionTarget(
            "cteph_riociguat_optional",
            "Riociguat option",
            "Riociguat is the main medication option when disease is inoperable or persistent/recurrent after PTE and BPA is not pursued.",
            ["riociguat"],
            0,
            1
          )
        );
      } else {
        addActionUnique(decision, "Clarify BPA eligibility with the multidisciplinary CTEPH team; if not a BPA candidate, consider riociguat.");
        decision.selectionTargets.push(
          buildSelectionTarget(
            "cteph_riociguat_optional",
            "Optional riociguat pathway",
            "Use only after or alongside expert-center assessment for BPA candidacy.",
            ["riociguat"],
            0,
            1
          )
        );
      }
    }

    decision.rationale.push("The ALA/PHA guidance-to-guidelines CTEPH algorithm prioritizes expert-center operability review, then BPA candidacy, with riociguat used for non-operable disease or persistent/recurrent PH after PTE when appropriate.");
    return decision;
  }

  if (input.whoGroup === "5") {
    setPrimaryRecommendation(decision, "Focus management on the underlying multifactorial cause and use PH-center input for individualized therapy decisions.");
    decision.actions.push("Focus treatment on the underlying multifactorial/associated disorder.");
    decision.actions.push("Use PH-center consultation for individualized decisions on targeted therapy.");
    decision.rationale.push("Group 5 has heterogeneous mechanisms and no broadly standardized PAH-targeted algorithm.");
    return decision;
  }

  if (input.whoGroup !== "1") {
    decision.alerts.push("Unknown WHO group selection; unable to map therapy path safely.");
    return decision;
  }

  if (risk.label === "unknown") {
    setPrimaryRecommendation(decision, "Risk tier unavailable: obtain the missing risk variables before making escalation decisions.");
    addActionUnique(
      decision,
      `Complete at least ${riskRequirements.minimumForInterpretation} of ${riskRequirements.totalVariables} variables for ${risk.modelName || "the selected model"} before using risk-tier-driven escalation.`
    );
    addActionUnique(decision, "Obtain missing labs, walk distance, hemodynamics, or clinical variables at the next assessment.");
    decision.rationale.push("The review recommended avoiding overtreatment when risk stratification is incomplete.");
    return decision;
  }

  const pathwayRiskLabel =
    risk.pathwayLabel !== "unknown"
      ? risk.pathwayLabel
      : (input.assessmentStage === "initial" ? "intermediate" : "intermediate_low");

  if (risk.pathwayLabel === "unknown") {
    decision.alerts.push("Using conservative fallback risk tier because score inputs are incomplete.");
  }

  setPrimaryRecommendation(decision, "Group 1 PAH pathway active: use a treat-to-low-risk strategy with escalation when low risk is not achieved.");
  addMonitoringUnique(decision, "Repeat risk assessment about 3-6 months after therapy initiation or escalation, including WHO-FC, exercise capacity, biomarkers, and treatment tolerance.");

  if (input.pregnantOrTrying) {
    setPrimaryRecommendation(decision, "Pregnancy in Group 1 PAH: urgently co-manage with an expert PH center and maternal-fetal medicine; avoid ERA, riociguat, and selexipag, and use pregnancy-compatible therapy selection.");
    if (currentRegimen && (currentRegimen.hasEra || currentRegimen.hasSgc || currentRegimen.hasIpReceptor)) {
      addActionUnique(decision, "Current regimen includes a pregnancy-restricted medication (ERA, riociguat, and/or selexipag). Transition off those agents with expert PH-obstetric guidance.");
    } else {
      addActionUnique(decision, "Do not initiate ERA, riociguat, or selexipag during pregnancy.");
    }
    addActionUnique(decision, "Use pregnancy-compatible PAH therapy selection under expert supervision, commonly PDE5 inhibitor and/or prostacyclin-based therapy depending on severity.");
    if (pathwayRiskLabel === "high" || pathwayRiskLabel === "intermediate_high" || input.rightHeartFailureSigns) {
      pushSelectionTarget(
        decision,
        "pregnancy_parenteral_prostacyclin",
        "Pregnancy-compatible parenteral prostacyclin option",
        "Select one parenteral prostacyclin strategy if a prostacyclin-centered pregnancy regimen is needed.",
        ["epoprostenol_iv", "treprostinil_sciv"],
        0,
        1
      );
    }
    pushSelectionTarget(
      decision,
      "pregnancy_pde5",
      "Pregnancy-compatible PDE5 inhibitor option",
      "Select a PDE5 inhibitor only with expert pregnancy oversight.",
      ["sildenafil", "tadalafil"],
      0,
      1
    );
    pushSelectionTarget(
      decision,
      "pregnancy_inhaled_prostacyclin",
      "Pregnancy-compatible inhaled prostacyclin option",
      "Consider inhaled prostacyclin support when clinically appropriate under expert supervision.",
      ["iloprost", "treprostinil_inhaled"],
      0,
      1
    );
    if (input.vasoreactivityEligible && input.vasoreactivityPositive) {
      pushSelectionTarget(
        decision,
        "pregnancy_ccb",
        "Optional vasoreactivity-responder CCB pathway",
        "Use only when formal vasoreactivity testing was positive at an experienced PH center.",
        ["ccb_vasoreactive"],
        0,
        1
      );
    }
    decision.rationale.push("The executive summary and contemporary guidance emphasize urgent expert pregnancy management and avoidance of ERA, riociguat, and selexipag in pregnancy.");
    appendTransplantReferralRecommendation(decision, input, risk, pathwayRiskLabel);
    return decision;
  }

  if (input.vasoreactivityEligible && input.vasoreactivityPositive) {
    setPrimaryRecommendation(decision, "Positive vasoreactivity branch: consider a high-dose calcium-channel-blocker strategy with strict reassessment.");
    decision.actions.push("Positive vasoreactivity branch: consider high-dose CCB strategy with strict reassessment.");
    decision.selectionTargets.push(
      buildSelectionTarget(
        "vasoreactive_ccb",
        "Initial vasoreactivity-responder therapy",
        "Select a CCB pathway if pursuing responder strategy.",
        ["ccb_vasoreactive"],
        1,
        1
      )
    );
    decision.rationale.push("Continue CCB-only strategy only if durable responder criteria remain satisfied on follow-up.");
  }

  if (input.cardiopulmonaryComorbidities) {
    setPrimaryRecommendation(decision, "Comorbidity-heavy PAH phenotype: favor cautious oral monotherapy with individualized escalation.");
    decision.actions.push("Comorbidity-heavy PAH phenotype: start with cautious oral monotherapy and individualize escalation.");
    decision.selectionTargets.push(
      buildSelectionTarget(
        "comorbidity_monotherapy",
        "Initial monotherapy choice",
        "Pick one ERA or one PDE5 inhibitor for cautious start.",
        ["bosentan", "ambrisentan", "macitentan", "sildenafil", "tadalafil"],
        1,
        1
      )
    );
    decision.rationale.push("Evidence is weaker in comorbidity-heavy phenotypes; monotherapy-first pathway is often preferred.");
    appendTransplantReferralRecommendation(decision, input, risk, pathwayRiskLabel);
    return decision;
  }

  if (input.assessmentStage === "initial") {
    if (pathwayRiskLabel === "high") {
      setPrimaryRecommendation(decision, "High initial-risk PAH: use upfront combination therapy including parenteral prostacyclin, an ERA, and a PDE5 inhibitor.");
      decision.actions.push("High baseline risk: use upfront combination including parenteral prostacyclin + ERA + PDE5 inhibitor.");
      decision.selectionTargets.push(
        buildSelectionTarget("initial_era", "ERA selection", "Select one ERA.", ["bosentan", "ambrisentan", "macitentan"], 1, 1),
        buildSelectionTarget("initial_pde5", "PDE5 inhibitor selection", "Select one PDE5 inhibitor.", ["sildenafil", "tadalafil"], 1, 1),
        buildSelectionTarget(
          "initial_parenteral",
          "Parenteral prostacyclin selection",
          "Select one continuous infusion strategy.",
          ["epoprostenol_iv", "treprostinil_sciv"],
          1,
          1
        )
      );
      maybeAddSotaterceptOption(decision, input, pathwayRiskLabel, currentRegimen);
    } else {
      setPrimaryRecommendation(decision, "Low/intermediate initial-risk PAH: start foundational oral dual therapy with an ERA plus a PDE5 inhibitor.");
      decision.actions.push("Low/intermediate baseline risk: start foundational oral dual therapy (ERA + PDE5 inhibitor).");
      decision.selectionTargets.push(
        buildSelectionTarget("initial_era", "ERA selection", "Select one ERA.", ["bosentan", "ambrisentan", "macitentan"], 1, 1),
        buildSelectionTarget("initial_pde5", "PDE5 inhibitor selection", "Select one PDE5 inhibitor.", ["sildenafil", "tadalafil"], 1, 1)
      );
    }
    decision.rationale.push("Initial PAH regimen intensity is risk-stratified with dual oral therapy for low/intermediate risk and parenteral-inclusive strategy for high risk.");
    appendTransplantReferralRecommendation(decision, input, risk, pathwayRiskLabel);
    return decision;
  }

  if (pathwayRiskLabel === "low") {
    setPrimaryRecommendation(decision, "Low follow-up risk achieved: continue the current regimen and maintain low-risk status.");
    if (currentRegimen && !currentRegimen.isEmpty) {
      decision.actions.push(`Low follow-up risk achieved: continue the current regimen (${currentRegimen.names.join(", ")}) and reassess every 3-6 months.`);
    } else {
      decision.actions.push("Low follow-up risk achieved: continue current regimen and reassess every 3-6 months.");
      decision.actions.push("Enter the current regimen if you want maintenance guidance to reflect the therapies already in place.");
    }
    decision.rationale.push("Therapeutic goal is maintenance of low-risk status.");
    appendTransplantReferralRecommendation(decision, input, risk, pathwayRiskLabel);
    return decision;
  }

  if (pathwayRiskLabel === "intermediate_low" || pathwayRiskLabel === "intermediate") {
    if (currentRegimen && !currentRegimen.isEmpty) {
      const hasFoundationalDualPathway = currentRegimen.hasEra && (currentRegimen.hasPde5 || currentRegimen.hasSgc);
      if (!hasFoundationalDualPathway) {
        setPrimaryRecommendation(decision, "Intermediate follow-up risk with incomplete foundational therapy: complete dual-pathway therapy first, then reassess promptly.");
        decision.actions.push("Current regimen suggests foundational therapy is incomplete for follow-up escalation.");
        if (!currentRegimen.hasEra) {
          pushSelectionTarget(
            decision,
            "followup_missing_era",
            "ERA add-on",
            "Select one ERA to complete foundational therapy.",
            ["ambrisentan", "bosentan", "macitentan"],
            1,
            1
          );
        }
        if (!currentRegimen.hasPde5 && !currentRegimen.hasSgc) {
          pushSelectionTarget(
            decision,
            "followup_missing_no_pathway",
            "Nitric oxide pathway add-on",
            "Select one nitric oxide pathway agent to complete foundational therapy.",
            ["sildenafil", "tadalafil"],
            1,
            1
          );
        }
        decision.rationale.push("Entered therapy history suggests the patient is not yet on the usual ERA-based dual-pathway foundation, so completion of foundational therapy is the first escalation step.");
        appendTransplantReferralRecommendation(decision, input, risk, pathwayRiskLabel);
        return decision;
      }

      if (!currentRegimen.hasAnyProstacyclinPathway) {
        setPrimaryRecommendation(decision, "Intermediate follow-up risk despite dual-pathway therapy: add a prostacyclin-pathway agent and reassess soon because low risk has not been reached.");
        decision.actions.push(`Current regimen already includes foundational therapy (${currentRegimen.names.join(", ")}).`);
        decision.actions.push("Add a prostacyclin-pathway therapy rather than re-selecting therapies already in the regimen.");
        pushSelectionTarget(
          decision,
          "followup_addon_prostacyclin",
          "Prostacyclin-pathway add-on",
          "Select one prostacyclin-pathway add-on if escalating beyond the current regimen.",
          ["iloprost", "selexipag", "treprostinil_dpi", "treprostinil_inhaled", "treprostinil_oral"],
          0,
          1
        );
        if (currentRegimen.hasPde5 && !currentRegimen.hasSgc) {
          pushSelectionTarget(
            decision,
            "followup_switch_riociguat",
            "Optional PDE5 to riociguat switch",
            "Select riociguat only as a true switch strategy with PDE5 discontinuation and washout.",
            ["riociguat"],
            0,
            1
          );
        }
        maybeAddSotaterceptOption(decision, input, pathwayRiskLabel, currentRegimen);
        decision.rationale.push("Residual intermediate risk on dual-pathway therapy generally prompts addition of a prostacyclin-pathway agent or selected strategy switch.");
        appendTransplantReferralRecommendation(decision, input, risk, pathwayRiskLabel);
        return decision;
      }

      if (!currentRegimen.hasParenteral) {
        setPrimaryRecommendation(decision, "Intermediate follow-up risk despite advanced oral/inhaled therapy: consider parenteral prostacyclin escalation and reassess promptly.");
        decision.actions.push(`Current regimen already includes advanced pathway therapy (${currentRegimen.names.join(", ")}).`);
        decision.actions.push("Because low risk is still not achieved, consider escalation from non-parenteral therapy to a parenteral prostacyclin-centered strategy.");
        pushSelectionTarget(
          decision,
          "followup_optional_parenteral",
          "Parenteral prostacyclin escalation",
          "Select one continuous infusion strategy if escalating beyond current non-parenteral therapy.",
          ["epoprostenol_iv", "treprostinil_sciv"],
          0,
          1
        );
        maybeAddSotaterceptOption(decision, input, pathwayRiskLabel, currentRegimen);
        decision.rationale.push("Persistently intermediate risk despite oral or inhaled prostacyclin-pathway therapy should trigger consideration of parenteral escalation.");
        appendTransplantReferralRecommendation(decision, input, risk, pathwayRiskLabel);
        return decision;
      }

      setPrimaryRecommendation(decision, "Intermediate follow-up risk despite parenteral therapy: optimize infusion dosing and confirm adherence/support systems.");
      decision.actions.push(`Current regimen already includes parenteral therapy (${currentRegimen.names.join(", ")}).`);
      decision.actions.push("Optimize current parenteral prostacyclin dosing and review pump/line adherence before adding further complexity.");
      if (!currentRegimen.hasEra) {
        pushSelectionTarget(
          decision,
          "followup_missing_era_with_parenteral",
          "ERA add-on",
          "Select one ERA if it is not already part of the current regimen.",
          ["ambrisentan", "bosentan", "macitentan"],
          1,
          1
        );
      }
      if (!currentRegimen.hasPde5 && !currentRegimen.hasSgc) {
        pushSelectionTarget(
          decision,
          "followup_missing_no_pathway_with_parenteral",
          "Nitric oxide pathway add-on",
          "Select one nitric oxide pathway therapy if it is not already part of the regimen.",
          ["sildenafil", "tadalafil"],
          1,
          1
        );
      }
      maybeAddSotaterceptOption(decision, input, pathwayRiskLabel, currentRegimen);
      decision.rationale.push("Intermediate risk despite parenteral therapy suggests the need for parenteral optimization and early advanced-therapy planning rather than re-offering the same classes.");
      appendTransplantReferralRecommendation(decision, input, risk, pathwayRiskLabel);
      return decision;
    }

    setPrimaryRecommendation(decision, "Intermediate follow-up risk: escalate add-on therapy and reassess soon because low-risk status has not yet been reached.");
    decision.actions.push("Intermediate-low follow-up risk: escalate add-on therapy and reassess within 3-6 months.");
    decision.actions.push("Enter the current regimen to tailor escalation options to therapies already in place.");
    decision.actions.push("Options include adding selexipag/prostacyclin pathway agent and/or considering PDE5 inhibitor to riociguat switch.");
    pushSelectionTarget(
      decision,
      "followup_addon_prostacyclin",
      "Optional prostacyclin pathway add-on",
      "Select one add-on pathway agent if escalating.",
      ["selexipag", "treprostinil_oral", "treprostinil_inhaled", "treprostinil_dpi", "iloprost"],
      0,
      1
    );
    pushSelectionTarget(
      decision,
      "followup_switch_riociguat",
      "Optional PDE5 to riociguat switch",
      "Select riociguat only as a switch strategy (not combined with PDE5 inhibitor).",
      ["riociguat"],
      0,
      1
    );
    maybeAddSotaterceptOption(decision, input, pathwayRiskLabel, currentRegimen);
    decision.rationale.push("Intermediate-low risk after foundational therapy should trigger additional pathway therapy or strategic switch.");
    appendTransplantReferralRecommendation(decision, input, risk, pathwayRiskLabel);
    return decision;
  }

  if (currentRegimen && !currentRegimen.isEmpty) {
    if (!currentRegimen.hasParenteral) {
      setPrimaryRecommendation(decision, "Intermediate-high/high follow-up risk without parenteral therapy: escalate urgently to a parenteral-prostacyclin-centered regimen.");
      decision.actions.push(`Current regimen before escalation: ${currentRegimen.names.join(", ")}.`);
      decision.actions.push("Urgently add parenteral prostacyclin because the current regimen has not achieved low-risk status.");
      if (!currentRegimen.hasEra) {
        pushSelectionTarget(decision, "highrisk_era", "ERA add-on", "Ensure one ERA is part of the escalated regimen.", ["bosentan", "ambrisentan", "macitentan"], 1, 1);
      }
      if (!currentRegimen.hasPde5 && !currentRegimen.hasSgc) {
        pushSelectionTarget(decision, "highrisk_pde5", "Nitric oxide pathway add-on", "Ensure one nitric oxide pathway therapy is part of the escalated regimen.", ["sildenafil", "tadalafil"], 1, 1);
      }
      pushSelectionTarget(
        decision,
        "highrisk_parenteral",
        "Parenteral prostacyclin selection",
        "Select one continuous infusion strategy for urgent escalation.",
        ["epoprostenol_iv", "treprostinil_sciv"],
        1,
        1
      );
    } else {
      setPrimaryRecommendation(decision, "Intermediate-high/high follow-up risk despite parenteral therapy: optimize infusion intensity and add any missing pathway therapy.");
      decision.actions.push(`Current regimen already includes parenteral therapy (${currentRegimen.names.join(", ")}).`);
      decision.actions.push("Escalate beyond the current regimen by optimizing parenteral dosing and closing any missing pathway gaps.");
      if (!currentRegimen.hasEra) {
        pushSelectionTarget(decision, "highrisk_era", "ERA add-on", "Ensure one ERA is part of the regimen.", ["bosentan", "ambrisentan", "macitentan"], 1, 1);
      }
      if (!currentRegimen.hasPde5 && !currentRegimen.hasSgc) {
        pushSelectionTarget(decision, "highrisk_pde5", "Nitric oxide pathway add-on", "Ensure one nitric oxide pathway therapy is part of the regimen.", ["sildenafil", "tadalafil"], 1, 1);
      }
    }
  } else {
    setPrimaryRecommendation(decision, "Intermediate-high/high follow-up risk: escalate to a parenteral-prostacyclin-centered regimen.");
    decision.actions.push("Intermediate-high/high follow-up risk: escalate to parenteral prostacyclin-centered regimen.");
    decision.actions.push("Enter the current regimen to tailor high-risk escalation to therapies already in place.");
    pushSelectionTarget(decision, "highrisk_era", "ERA selection", "Ensure one ERA is in the regimen.", ["bosentan", "ambrisentan", "macitentan"], 1, 1);
    pushSelectionTarget(decision, "highrisk_pde5", "PDE5 inhibitor selection", "Ensure one PDE5 inhibitor is in the regimen.", ["sildenafil", "tadalafil"], 1, 1);
    pushSelectionTarget(
      decision,
      "highrisk_parenteral",
      "Parenteral prostacyclin selection",
      "Select one continuous infusion strategy.",
      ["epoprostenol_iv", "treprostinil_sciv"],
      1,
      1
    );
  }
  maybeAddSotaterceptOption(decision, input, pathwayRiskLabel, currentRegimen);
  decision.rationale.push("Failure to achieve low risk at higher strata should trigger aggressive escalation and advanced therapy referral.");
  appendTransplantReferralRecommendation(decision, input, risk, pathwayRiskLabel);
  return decision;
}

function countByClass(selectedDrugIds) {
  const counts = {};
  selectedDrugIds.forEach((id) => {
    const drug = DRUGS[id];
    if (!drug) return;
    counts[drug.classId] = (counts[drug.classId] || 0) + 1;
  });
  return counts;
}

function validateSelection(decision, input, selectedDrugIds, currentRegimenDrugIds, newSelectedDrugIds) {
  const issues = [];
  const cautions = [];
  const citationIds = [];

  for (const target of decision.selectionTargets) {
    const selectedForTarget = target.drugIds.filter((id) => selectedDrugIds.includes(id));
    if (selectedForTarget.length < target.min) {
      issues.push(`Requirement not met for "${target.label}": select at least ${target.min}.`);
    }
    if (selectedForTarget.length > target.max) {
      issues.push(`Too many selections for "${target.label}": select no more than ${target.max}.`);
    }
  }

  const selectedClasses = new Set(
    selectedDrugIds
      .map((id) => {
        const drug = DRUGS[id];
        return drug ? drug.classId : null;
      })
      .filter(Boolean)
  );

  const hasRiociguat = selectedDrugIds.includes("riociguat");
  const hasPde5 = selectedClasses.has("pde5i");
  const hasBosentan = selectedDrugIds.includes("bosentan");
  const hasSildenafil = selectedDrugIds.includes("sildenafil");
  const hasTadalafil = selectedDrugIds.includes("tadalafil");
  const hasWarfarin = selectedDrugIds.includes("warfarin_cteph");

  if (hasRiociguat && hasPde5) {
    issues.push("Contraindicated combination: riociguat must not be combined with a PDE5 inhibitor.");
  }

  if (input.onNitrates && (hasRiociguat || hasPde5)) {
    issues.push("Contraindicated context: nitrates/NO donors with PDE5 inhibitors or riociguat can cause severe hypotension.");
  }

  const hasEra = selectedClasses.has("era");
  const hasIpReceptor = selectedClasses.has("ip_receptor");
  if (input.pregnantOrTrying && (hasEra || hasRiociguat || hasIpReceptor)) {
    issues.push("Pregnancy guardrail: avoid ERAs, riociguat, and selexipag in pregnancy/trying-to-conceive context.");
  }

  if (input.strongCyp2c8Inhibitor && selectedDrugIds.includes("selexipag")) {
    issues.push("Contraindicated interaction: selexipag with strong CYP2C8 inhibitor (for example gemfibrozil).");
  }

  if (input.onClopidogrel && selectedDrugIds.includes("selexipag")) {
    cautions.push("Interaction caution: clopidogrel with selexipag often requires once-daily dosing adjustment.");
  }

  if (selectedDrugIds.includes("sotatercept") && input.platelets === null) {
    issues.push("Sotatercept initiation rule: enter a baseline platelet count before selecting sotatercept.");
  }

  if (selectedDrugIds.includes("sotatercept") && input.platelets !== null && input.platelets < 50) {
    issues.push("Sotatercept initiation rule: do not start if platelets are below 50 x10^3/uL (50,000/mm3).");
  }

  if (selectedDrugIds.includes("sotatercept") && input.pregnantOrTrying) {
    cautions.push("Sotatercept pregnancy context: specialist counseling and risk-benefit review are required.");
  }

  if (selectedDrugIds.includes("riociguat") && input.systolicBp !== null && input.systolicBp < 95) {
    issues.push("Riociguat initiation caution: low systolic BP (<95 mmHg) increases hypotension risk.");
  }

  if (hasPde5 && input.systolicBp !== null && input.systolicBp < 90) {
    issues.push("PDE5 inhibitor initiation caution: avoid starting PDE5 inhibitor therapy when systolic BP is <90 mmHg.");
  }

  if (selectedDrugIds.includes("treprostinil_oral") && input.hepaticImpairment === "severe") {
    issues.push("Oral treprostinil: severe hepatic impairment is a contraindication.");
  }

  if (selectedDrugIds.includes("ambrisentan") && (input.hepaticImpairment === "moderate" || input.hepaticImpairment === "severe")) {
    cautions.push("Ambrisentan is generally not recommended in moderate or severe hepatic impairment.");
  }

  const severeRenalContext = input.renalStatus === "severe" || (input.egfr !== null && input.egfr < 30);
  if (selectedDrugIds.includes("tadalafil") && severeRenalContext) {
    issues.push("Tadalafil: avoid in severe renal impairment.");
  }

  if (hasBosentan && hasSildenafil) {
    cautions.push("Bosentan-sildenafil interaction: bosentan lowers sildenafil exposure and sildenafil increases bosentan exposure; this combination is usually tolerated and does not require routine dose adjustment, but is not recommended by current clinical practice guidelines.");
    addCitationIdUnique(citationIds, "bosentan_label");
    addCitationIdUnique(citationIds, "sildenafil_label");
    addCitationIdUnique(citationIds, "escers_2022");
    addCitationIdUnique(citationIds, "chest_2019");
  }

  if (hasBosentan && hasTadalafil) {
    cautions.push("Bosentan-tadalafil interaction: bosentan lowers tadalafil exposure; verify that this is the intended ERA/PDE5i pairing and reassess response closely after initiation or escalation.");
    addCitationIdUnique(citationIds, "bosentan_label");
    addCitationIdUnique(citationIds, "escers_2022");
  }

  if (hasBosentan && hasWarfarin) {
    cautions.push("Bosentan-warfarin interaction: bosentan can lower warfarin exposure; check INR more closely after bosentan initiation, discontinuation, or dose change.");
    addCitationIdUnique(citationIds, "bosentan_label");
    addCitationIdUnique(citationIds, "escers_2022");
  }

  const classCounts = countByClass(selectedDrugIds);
  for (const [classId, count] of Object.entries(classCounts)) {
    if (count > 1 && ["era", "pde5i", "sgc", "ip_receptor"].includes(classId)) {
      cautions.push(`Multiple agents selected from ${CLASS_LABELS[classId]} class; verify intended strategy.`);
    }
  }

  return { issues, cautions, citationIds };
}

function getRiskToneClass(label) {
  if (label === "low") return "tone-low";
  if (label === "intermediate_low" || label === "intermediate") return "tone-intermediate";
  if (label === "intermediate_high" || label === "high") return "tone-high";
  return "tone-neutral";
}

function getRiskTileColorClass(tier) {
  if (tier === "low") return "risk-low";
  if (tier === "intermediate_low" || tier === "intermediate") return "risk-intermediate-low";
  if (tier === "intermediate_high") return "risk-intermediate-high";
  if (tier === "high") return "risk-high";
  return "";
}

function getSelectedRiskModelFromUi() {
  const select = document.getElementById("risk-model");
  return select ? select.value : null;
}

function renderRiskStrataTiles(modelId) {
  const grid = document.getElementById("risk-strata-grid");
  if (!grid) {
    return;
  }

  const selectedModel = modelId || getSelectedRiskModelFromUi();
  const tiles = selectedModel && RISK_STRATA_CONFIG[selectedModel]
    ? RISK_STRATA_CONFIG[selectedModel]
    : [];

  grid.innerHTML = tiles
    .map((tile) => `
      <div class="risk-strata-tile ${getRiskTileColorClass(tile.tier)}" data-risk-tier="${escapeHtml(tile.tier)}" data-risk-model="${escapeHtml(selectedModel || "")}">
        <strong>${escapeHtml(tile.title)}</strong>
        <small>${escapeHtml(tile.note)}</small>
        ${tile.meta ? `<span class="risk-strata-meta">${escapeHtml(tile.meta)}</span>` : ""}
      </div>
    `)
    .join("");
}

function updateRiskStrataHighlight(label, modelId) {
  renderRiskStrataTiles(modelId);
  const tiles = Array.prototype.slice.call(document.querySelectorAll(".risk-strata-tile"));
  tiles.forEach((tile) => {
    if (label && tile.getAttribute("data-risk-tier") === label) {
      tile.classList.add("is-active");
    } else {
      tile.classList.remove("is-active");
    }
  });
}

function getLiveRiskPreview(input) {
  const modelId = input.riskModel || getDefaultRiskModel(input);
  if (input.whoGroup !== "1") {
    return { label: null, modelId };
  }

  const risk = computeRisk(input);
  const resolvedModelId = risk.modelId || modelId;
  const requirements = getRiskModelRequirements(resolvedModelId);
  const hasSufficientData =
    risk.label !== "unknown"
    && risk.variablesUsed >= requirements.minimumForInterpretation;

  return {
    label: hasSufficientData ? risk.label : null,
    modelId: resolvedModelId
  };
}

function setResultsPanelState(hasResults, collapsed) {
  const resultsPanel = document.getElementById("results-panel");
  const toggleBtn = document.getElementById("toggle-results-btn");
  if (!resultsPanel || !toggleBtn) {
    return;
  }

  const panelHasResults = !!hasResults;
  const panelCollapsed = panelHasResults ? !!collapsed : false;
  resultsPanel.setAttribute("data-has-results", panelHasResults ? "1" : "0");
  resultsPanel.setAttribute("data-collapsed", panelCollapsed ? "1" : "0");
  toggleBtn.textContent = panelCollapsed ? "Expand" : "Collapse";
  toggleBtn.setAttribute("aria-expanded", panelCollapsed ? "false" : "true");
}

function clearDecisionOutput() {
  const summaryEl = document.getElementById("decision-summary");
  const sectionIds = [
    "primary-recommendation",
    "alerts",
    "action-items",
    "monitoring-items",
    "eligibility-checks",
    "risk-transparency",
    "recommendation-rationale",
    "copyable-summary",
    "medication-selector",
    "regimen-validation",
    "medication-details"
  ];

  if (summaryEl) {
    summaryEl.classList.add("muted");
    summaryEl.textContent = "No analysis yet.";
  }

  sectionIds.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.innerHTML = "";
    }
  });

  updateRiskStrataHighlight(null, getSelectedRiskModelFromUi());
  setResultsPanelState(false, false);
  window.__CURRENT_INPUT = null;
}

function bindResultsPanelControls() {
  if (window.__PH_RESULTS_CONTROLS_BOUND) {
    return;
  }
  window.__PH_RESULTS_CONTROLS_BOUND = true;

  const toggleBtn = document.getElementById("toggle-results-btn");
  const resetBtn = document.getElementById("reset-results-btn");
  const resultsPanel = document.getElementById("results-panel");

  if (toggleBtn && resultsPanel) {
    toggleBtn.addEventListener("click", () => {
      const hasResults = resultsPanel.getAttribute("data-has-results") === "1";
      if (!hasResults) {
        return;
      }
      const currentlyCollapsed = resultsPanel.getAttribute("data-collapsed") === "1";
      setResultsPanelState(true, !currentlyCollapsed);
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", clearDecisionOutput);
  }
}

function buildRegimenSummaryHtml(currentRegimenDrugIds) {
  if (!currentRegimenDrugIds || !currentRegimenDrugIds.length) {
    return "";
  }

  const regimenNames = currentRegimenDrugIds
    .map((drugId) => DRUGS[drugId])
    .filter(Boolean)
    .map((drug) => drug.name);

  if (!regimenNames.length) {
    return "";
  }

  return `
    <div class="ok-card">
      <strong>Current Follow-up Regimen</strong>
      <p>${escapeHtml(regimenNames.join(", "))}</p>
      <p class="muted">These medications will be included in regimen validation and medication details.</p>
    </div>
  `;
}

function buildValidationHtml(validation, currentRegimenDrugIds, selectedDrugIds) {
  const hasCurrentRegimen = !!(currentRegimenDrugIds && currentRegimenDrugIds.length);
  const hasSelectedDrugs = !!(selectedDrugIds && selectedDrugIds.length);
  let contextNote = "";

  if (hasCurrentRegimen && hasSelectedDrugs) {
    contextNote = "Validation includes the current follow-up regimen plus newly selected medications.";
  } else if (hasCurrentRegimen) {
    contextNote = "Validation includes the current follow-up regimen.";
  } else if (hasSelectedDrugs) {
    contextNote = "Validation includes the selected medications.";
  }

  const validationCards = [];
  if (validation.issues.length) {
    validationCards.push.apply(
      validationCards,
      validation.issues.map((issue) => `<div class="alert-card"><strong>Contraindication/Hard Stop:</strong> ${escapeHtml(issue)}</div>`)
    );
  }
  if (validation.cautions.length) {
    validationCards.push.apply(
      validationCards,
      validation.cautions.map((caution) => `<div class="alert-card"><strong>Caution:</strong> ${escapeHtml(caution)}</div>`)
    );
  }
  if (!validation.issues.length && !validation.cautions.length) {
    validationCards.push("<div class=\"ok-card\">No high-risk conflicts detected from the active regimen and entered patient context.</div>");
  }

  return `
    <strong>Regimen Validation</strong>
    ${contextNote ? `<p class="muted">${escapeHtml(contextNote)}</p>` : ""}
    ${validationCards.join("")}
    ${buildSelectedCitationLinksHtml(validation.citationIds, validation.citationIds && validation.citationIds.length ? "Interaction citations" : "")}
  `;
}

function buildMedicationDetailsHtml(drugIds, currentRegimenDrugIds, selectedDrugIds, input) {
  if (!drugIds || !drugIds.length) {
    return "<strong>Medication Details</strong><p>No medications selected.</p>";
  }

  const currentRegimenLookup = {};
  const selectedLookup = {};
  (currentRegimenDrugIds || []).forEach((drugId) => {
    currentRegimenLookup[drugId] = true;
  });
  (selectedDrugIds || []).forEach((drugId) => {
    selectedLookup[drugId] = true;
  });

  const hasCurrentRegimen = !!(currentRegimenDrugIds && currentRegimenDrugIds.length);
  const hasSelectedDrugs = !!(selectedDrugIds && selectedDrugIds.length);
  let contextNote = "";

  if (hasCurrentRegimen && hasSelectedDrugs) {
    contextNote = "Medication details include the current follow-up regimen plus newly selected medications.";
  } else if (hasCurrentRegimen) {
    contextNote = "Medication details reflect the current follow-up regimen.";
  }

  const renalFlag = hasRenalImpairment(input);
  const hepaticFlag = hasHepaticImpairment(input);
  const impairmentNote = buildMedicationImpairmentFlagHtml(input);

  return `
    <strong>Medication Details</strong>
    ${contextNote ? `<p class="muted">${escapeHtml(contextNote)}</p>` : ""}
    ${impairmentNote}
    ${drugIds
      .map((drugId) => {
        const d = DRUGS[drugId];
        if (!d) {
          return "";
        }

        let sourceLabel = "Included in regimen";
        if (currentRegimenLookup[drugId] && selectedLookup[drugId]) {
          sourceLabel = "Current regimen + new selection";
        } else if (currentRegimenLookup[drugId]) {
          sourceLabel = "Current regimen";
        } else if (selectedLookup[drugId]) {
          sourceLabel = "New selection";
        }

        return `
          <article class="drug-card">
            <h4>${escapeHtml(d.name)}</h4>
            <p class="detail-row"><strong>Status:</strong> ${escapeHtml(sourceLabel)}</p>
            <p class="detail-row"><strong>Class:</strong> ${escapeHtml(CLASS_LABELS[d.classId])}</p>
            <p class="detail-row"><strong>Route:</strong> ${escapeHtml(d.route)}</p>
            <p class="detail-row"><strong>Start dose:</strong> ${escapeHtml(d.startDose)}</p>
            <p class="detail-row"><strong>Goal/titration:</strong> ${escapeHtml(d.goalDose)}</p>
            <p class="detail-row"><strong>Monitoring:</strong> ${escapeHtml(d.monitoring)}</p>
            <p class="detail-row"><strong>Key interactions:</strong> ${escapeHtml(d.interactions)}</p>
            <p class="detail-row ${renalFlag ? "detail-row-flagged" : ""}"><strong>Renal considerations:</strong> ${escapeHtml(d.renal)}</p>
            <p class="detail-row ${hepaticFlag ? "detail-row-flagged" : ""}"><strong>Hepatic considerations:</strong> ${escapeHtml(d.hepatic)}</p>
            <p class="detail-row"><strong>Pregnancy considerations:</strong> ${escapeHtml(d.pregnancy)}</p>
          </article>
        `;
      })
      .join("")}
  `;
}

function buildTableHtml(table, title) {
  if (!table || !table.columns || !table.rows || !table.rows.length) {
    return "";
  }

  const headerHtml = table.columns.map((column) => `<th scope="col">${escapeHtml(column)}</th>`).join("");
  const bodyHtml = table.rows.map((row) => `
      <tr>
        ${row.map((cell, index) => `<td data-label="${escapeHtml(table.columns[index] || "")}">${escapeHtml(cell)}</td>`).join("")}
      </tr>
    `).join("");

  return `
    ${title ? `<strong>${escapeHtml(title)}</strong>` : ""}
    <div class="risk-table-wrap">
      <table class="risk-table">
        <thead>
          <tr>${headerHtml}</tr>
        </thead>
        <tbody>
          ${bodyHtml}
        </tbody>
      </table>
    </div>
  `;
}

function buildKeyValueTableHtml(rows, title) {
  if (!rows || !rows.length) {
    return "";
  }

  return `
    ${title ? `<strong>${escapeHtml(title)}</strong>` : ""}
    <div class="score-table-wrap">
      <table class="score-table">
        <tbody>
          ${rows.map((row) => `
            <tr>
              <th scope="row">${escapeHtml(row.label)}</th>
              <td>${escapeHtml(row.value)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function buildSelectedCitationLinksHtml(citationIds, title) {
  if (!citationIds || !citationIds.length) {
    return "";
  }

  const uniqueCitationIds = citationIds.filter(function keepUnique(citationId, index) {
    return citationIds.indexOf(citationId) === index && IMPORTANT_CITATIONS_BY_ID[citationId];
  });

  if (!uniqueCitationIds.length) {
    return "";
  }

  return `
    ${title ? `<strong>${escapeHtml(title)}</strong>` : ""}
    <ul class="citation-list">
      ${uniqueCitationIds.map((citationId) => {
        const citation = IMPORTANT_CITATIONS_BY_ID[citationId];
        return `<li><a href="${escapeHtml(citation.href)}" target="_blank" rel="noreferrer">${escapeHtml(citation.label)}</a></li>`;
      }).join("")}
    </ul>
  `;
}

function getAssessmentStageLabel(assessmentStage) {
  return assessmentStage === "follow_up" ? "Follow-up escalation decision" : "Initial therapy decision";
}

function getWhoGroupLabel(whoGroup) {
  const labels = {
    "1": "Group 1 (PAH)",
    "2": "Group 2 (PH-LHD)",
    "3": "Group 3 (lung disease/hypoxia)",
    "4": "Group 4 (CTEPH/CTEPD)",
    "5": "Group 5 (multifactorial/other)"
  };
  return labels[whoGroup] || `Group ${whoGroup || "--"}`;
}

function getActiveModifierLabels(input) {
  const labels = [];
  if (input.cardiopulmonaryComorbidities) labels.push("major cardiopulmonary comorbidity phenotype");
  if (input.vasoreactivityEligible) labels.push("vasoreactivity testing indicated phenotype");
  if (input.vasoreactivityPositive) labels.push("positive vasoreactivity test");
  if (input.ildAssociated) labels.push("PH associated with ILD phenotype");
  if (input.severeIldPh) labels.push("severe ILD-PH phenotype");
  if (input.rightHeartFailureSigns) labels.push("signs of right-heart failure");
  if (input.volumeOverload) labels.push("clinical volume overload / congestion");
  if (input.pregnantOrTrying) labels.push("pregnant or trying to conceive");
  if (input.onNitrates) labels.push("current nitrates or NO donor therapy");
  if (input.strongCyp2c8Inhibitor) labels.push("strong CYP2C8 inhibitor");
  if (input.onClopidogrel) labels.push("on clopidogrel");
  return labels;
}

function buildMedicationPlanText(decision, currentRegimenDrugIds, selectedDrugIds) {
  const lines = [];
  const combinedDrugIds = mergeDrugIds(currentRegimenDrugIds || [], selectedDrugIds || []);
  const displayActions = getDisplayActions(decision);

  if (combinedDrugIds.length) {
    const combinedNames = combinedDrugIds.map((drugId) => DRUGS[drugId]).filter(Boolean).map((drug) => drug.name);
    if (selectedDrugIds && selectedDrugIds.length) {
      lines.push(`Validated regimen: ${combinedNames.join(", ")}.`);
    } else if (currentRegimenDrugIds && currentRegimenDrugIds.length) {
      lines.push(`Current regimen: ${combinedNames.join(", ")}.`);
    }
  }

  if (decision.primaryRecommendation) {
    lines.push(decision.primaryRecommendation);
  }

  displayActions.slice(0, 3).forEach((action) => {
    lines.push(action);
  });

  if (!selectedDrugIds.length && decision.selectionTargets.length) {
    lines.push("Medication options remain unvalidated; select and validate a regimen to generate medication-specific initiation steps.");
  }

  return lines;
}

function buildMedicationSelectionReference(selectedDrugIds) {
  const names = sortDrugIdsAlphabetically(selectedDrugIds || [])
    .map((drugId) => DRUGS[drugId])
    .filter(Boolean)
    .map((drug) => drug.name);

  if (!names.length) {
    return "";
  }

  return names.join(", ");
}

function buildMedicationInitiationNextSteps(selectedDrugIds) {
  const steps = [];
  const sortedDrugIds = sortDrugIdsAlphabetically(selectedDrugIds || []);

  if (!sortedDrugIds.length) {
    return steps;
  }

  const selectedNames = buildMedicationSelectionReference(sortedDrugIds);
  if (selectedNames) {
    steps.push(`Selected medications for initiation/escalation: ${selectedNames}.`);
  }

  sortedDrugIds.forEach((drugId) => {
    const drug = DRUGS[drugId];
    if (!drug) {
      return;
    }
    steps.push(`Initiate ${drug.name} via ${drug.route} at ${drug.startDose}; goal/titration ${drug.goalDose}.`);
  });

  steps.push("Confirm baseline contraindication, interaction, pregnancy, renal, and hepatic review before starting the selected regimen.");
  steps.push("Arrange early follow-up to assess tolerance, confirm titration progress, and complete medication-specific monitoring.");

  return steps;
}

function buildRiskSnapshotLines(decision, input) {
  const lines = [];

  if (input.whoFc) {
    lines.push(`WHO functional class: ${input.whoFc}`);
  }
  if (input.walkDistance !== null) {
    lines.push(`6MWD: ${Math.round(input.walkDistance)} m`);
  }
  if (input.bnp !== null) {
    lines.push(`BNP: ${Math.round(input.bnp)} pg/mL`);
  }
  if (input.ntProbnp !== null) {
    lines.push(`NT-proBNP: ${Math.round(input.ntProbnp)} ng/L`);
  }

  if (decision.risk && decision.risk.modelName) {
    lines.push(`Risk model: ${decision.risk.modelName}`);
    lines.push(`Risk tier: ${formatRiskLabel(decision.risk.label || "unknown")}`);
    lines.push(`Total score: ${decision.risk.score === null || decision.risk.score === undefined ? "--" : Math.round(decision.risk.score)}`);
  }

  return lines;
}

function buildCopyableSummaryText(decision, input, selectedDrugIds) {
  const lines = [];
  const currentRegimenDrugIds = decision.currentRegimenDrugIds || [];
  const modifiers = getActiveModifierLabels(input);
  const riskSnapshotLines = buildRiskSnapshotLines(decision, input);
  const medicationPlanLines = buildMedicationPlanText(decision, currentRegimenDrugIds, selectedDrugIds || []);
  const initiationSteps = buildMedicationInitiationNextSteps(selectedDrugIds || []);
  const currentRegimenNames = currentRegimenDrugIds
    .map((drugId) => DRUGS[drugId])
    .filter(Boolean)
    .map((drug) => drug.name);

  lines.push("Pulmonary Hypertension Management Note");
  lines.push("");
  lines.push("Clinical Context:");
  lines.push(`- Assessment: ${getAssessmentStageLabel(input.assessmentStage)}`);
  lines.push(`- WHO clinical group: ${getWhoGroupLabel(input.whoGroup)}`);
  lines.push(`- Hemodynamics: ${decision.hemo.profile}. ${decision.hemo.detail}`);

  if (currentRegimenNames.length) {
    lines.push(`- Current regimen: ${currentRegimenNames.join(", ")}`);
  }

  if (modifiers.length) {
    lines.push(`- Key modifiers: ${modifiers.join("; ")}`);
  }

  if (riskSnapshotLines.length) {
    lines.push("");
    lines.push("Risk:");
    riskSnapshotLines.forEach((line) => {
      lines.push(`- ${line}`);
    });
  }

  lines.push("");
  lines.push("Assessment:");
  lines.push(`- ${decision.primaryRecommendation || "Clinical decision support output generated from entered data."}`);

  if (decision.alerts.length) {
    decision.alerts.slice(0, 3).forEach((alert) => {
      lines.push(`- Guardrail: ${alert}`);
    });
  }

  lines.push("");
  lines.push("Plan:");
  if (medicationPlanLines.length) {
    medicationPlanLines.forEach((line, index) => {
      lines.push(`${index + 1}. ${line}`);
    });
  } else {
    lines.push("1. No medication change recommended based on the currently entered data.");
  }

  if (initiationSteps.length) {
    lines.push("");
    lines.push("Medication Initiation Next Steps:");
    initiationSteps.forEach((step, index) => {
      lines.push(`${index + 1}. ${step}`);
    });
  }

  if (decision.monitoringSafety.length) {
    lines.push("");
    lines.push("Monitoring / Safety:");
    decision.monitoringSafety.slice(0, 4).forEach((item) => {
      lines.push(`- ${item}`);
    });
  }

  return lines.join("\n");
}

function renderCopyableSummary(summaryEl, decision, input, selectedDrugIds) {
  if (!summaryEl) {
    return;
  }

  const summaryText = buildCopyableSummaryText(decision, input, selectedDrugIds || []);
  const rowCount = Math.max(10, Math.min(24, summaryText.split("\n").length + 1));

  summaryEl.innerHTML = `
    <strong>Copyable Case Summary</strong>
    <p class="copy-summary-note">Use this note-style plain-text summary for documentation, messaging, or handoff.</p>
    <div class="copy-summary-actions">
      <button type="button" class="secondary-btn" id="copy-case-summary-btn">Copy Summary</button>
      <span class="copy-summary-status" id="copy-case-summary-status" aria-live="polite"></span>
    </div>
    <textarea id="copy-case-summary-text" class="copy-summary-text" rows="${rowCount}" readonly spellcheck="false">${escapeHtml(summaryText)}</textarea>
  `;

  const copyButton = document.getElementById("copy-case-summary-btn");
  const copyText = document.getElementById("copy-case-summary-text");
  const copyStatus = document.getElementById("copy-case-summary-status");

  if (!copyButton || !copyText) {
    return;
  }

  copyButton.addEventListener("click", () => {
    const onSuccess = () => {
      if (copyStatus) {
        copyStatus.textContent = "Copied.";
      }
    };

    const onFailure = () => {
      if (copyStatus) {
        copyStatus.textContent = "Select and copy manually.";
      }
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(copyText.value).then(onSuccess).catch(onFailure);
      return;
    }

    try {
      copyText.focus();
      copyText.select();
      const copied = document.execCommand("copy");
      if (copied) {
        onSuccess();
      } else {
        onFailure();
      }
    } catch (error) {
      onFailure();
    }
  });
}

function renderDecision(decision) {
  const summaryEl = document.getElementById("decision-summary");
  const primaryEl = document.getElementById("primary-recommendation");
  const alertsEl = document.getElementById("alerts");
  const actionsEl = document.getElementById("action-items");
  const monitoringEl = document.getElementById("monitoring-items");
  const eligibilityEl = document.getElementById("eligibility-checks");
  const transparencyEl = document.getElementById("risk-transparency");
  const rationaleEl = document.getElementById("recommendation-rationale");
  const copySummaryEl = document.getElementById("copyable-summary");
  const selectorEl = document.getElementById("medication-selector");
  const validationEl = document.getElementById("regimen-validation");
  const detailsEl = document.getElementById("medication-details");
  const currentRegimenDrugIds = decision.currentRegimenDrugIds || [];
  const displayActions = getDisplayActions(decision);
  const riskToneClass = getRiskToneClass(decision.risk.pathwayLabel || decision.risk.label);
  const riskTableHtml = decision.riskTable
    ? buildKeyValueTableHtml([
      { label: "Model", value: decision.risk.modelName || "--" },
      { label: "Risk Tier", value: formatRiskLabel(decision.risk.label || "unknown") },
      { label: "Total Score", value: decision.risk.score === null || decision.risk.score === undefined ? "--" : Math.round(decision.risk.score) }
    ])
    : "";
  const transparencyTableHtml = buildTableHtml(decision.transparencyTable);

  updateRiskStrataHighlight(decision.risk.label, decision.risk.modelId || getSelectedRiskModelFromUi());
  setResultsPanelState(true, false);

  summaryEl.classList.remove("muted");
  summaryEl.innerHTML = `
    <div class="ok-card">
      <strong>Summary</strong>
      <ul>${decision.summary.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>
      ${riskTableHtml}
    </div>
  `;

  primaryEl.innerHTML = decision.primaryRecommendation
    ? `
      <div class="primary-reco-card ${riskToneClass}">
        <div class="primary-reco-topline">
          <strong>Primary Recommendation</strong>
          <span class="risk-badge ${riskToneClass}">${escapeHtml(formatRiskLabel(decision.risk.label || "unknown"))}</span>
        </div>
        <p>${escapeHtml(decision.primaryRecommendation)}</p>
      </div>
    `
    : "";

  if (decision.alerts.length) {
    alertsEl.innerHTML = decision.alerts
      .map((alert) => `<div class="alert-card"><strong>Guardrail:</strong> ${escapeHtml(alert)}</div>`)
      .join("");
  } else {
    alertsEl.innerHTML = `<div class="ok-card">No immediate high-risk guardrails triggered from entered inputs.</div>`;
  }

  actionsEl.innerHTML = `
    <strong>Escalation Options / Next Actions</strong>
    ${displayActions.length ? `<ol>${displayActions.map((action) => `<li>${escapeHtml(action)}</li>`).join("")}</ol>` : "<p>No additional escalation options listed.</p>"}
  `;

  monitoringEl.innerHTML = decision.monitoringSafety.length
    ? `<strong>Monitoring / Safety</strong><ul>${decision.monitoringSafety.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
    : "";

  eligibilityEl.innerHTML = decision.eligibilityChecks.length
    ? `<strong>Eligibility Checks</strong><ul>${decision.eligibilityChecks.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
    : "";

  transparencyEl.innerHTML = transparencyTableHtml
    ? `
      <details class="output-drawer">
        <summary>Risk Tool Transparency</summary>
        ${transparencyTableHtml}
      </details>
    `
    : "";

  rationaleEl.innerHTML = decision.rationale.length
    ? `<strong>Rationale</strong><ul>${decision.rationale.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
    : "";
  renderCopyableSummary(copySummaryEl, decision, window.__CURRENT_INPUT, []);

  validationEl.innerHTML = "";
  detailsEl.innerHTML = "";

  if (!decision.selectionTargets.length) {
    selectorEl.innerHTML = `
      <strong>Medication Selection</strong>
      <p>No additional medication selection required in this branch.</p>
      ${buildMedicationImpairmentFlagHtml(window.__CURRENT_INPUT)}
      ${buildRegimenSummaryHtml(currentRegimenDrugIds)}
    `;
    if (currentRegimenDrugIds.length) {
    const input = window.__CURRENT_INPUT;
    const validation = validateSelection(decision, input, currentRegimenDrugIds, currentRegimenDrugIds, []);
      validationEl.innerHTML = buildValidationHtml(validation, currentRegimenDrugIds, []);
      detailsEl.innerHTML = buildMedicationDetailsHtml(currentRegimenDrugIds, currentRegimenDrugIds, [], input);
      renderCopyableSummary(copySummaryEl, decision, input, []);
    }
    return;
  }

  selectorEl.innerHTML = `
    <strong>Medication Selection</strong>
    <p>Select preferred medications where options exist, then validate the regimen.</p>
    ${buildMedicationImpairmentFlagHtml(window.__CURRENT_INPUT)}
    ${buildRegimenSummaryHtml(currentRegimenDrugIds)}
    <form id="med-select-form">
      <div class="reco-grid">
        ${decision.selectionTargets
          .map((target) => {
            const isSingleSelect = target.max === 1;
            return `
              <div class="selector-group">
                <h4>${escapeHtml(target.label)}</h4>
                <small>${escapeHtml(target.note)} (${target.min === 0 ? "optional" : `required minimum ${target.min}`})</small>
                ${target.drugIds
                  .map((drugId) => {
                    const drug = DRUGS[drugId];
                    if (!drug) return "";
                    return `
                      <label class="selector-option">
                        <input type="${isSingleSelect ? "radio" : "checkbox"}" name="target_${target.id}" value="${drug.id}" />
                        <span class="selector-option-copy">
                          ${escapeHtml(drug.name)}
                        </span>
                      </label>
                    `;
                  })
                  .join("")}
              </div>
            `;
          })
          .join("")}
      </div>
      <button class="validate-btn" type="submit">${currentRegimenDrugIds.length ? "Validate Combined Regimen and Show Drug Details" : "Validate Regimen and Show Drug Details"}</button>
    </form>
  `;

  document.getElementById("med-select-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const checkedInputs = Array.prototype.slice.call(form.querySelectorAll("input:checked"));
    const selectedDrugIds = sortDrugIdsAlphabetically(checkedInputs.map((el) => el.value));
    const combinedDrugIds = mergeDrugIds(currentRegimenDrugIds, selectedDrugIds);
    const input = window.__CURRENT_INPUT;
    const validation = validateSelection(decision, input, combinedDrugIds, currentRegimenDrugIds, selectedDrugIds);

    validationEl.innerHTML = buildValidationHtml(validation, currentRegimenDrugIds, selectedDrugIds);
    detailsEl.innerHTML = buildMedicationDetailsHtml(combinedDrugIds, currentRegimenDrugIds, selectedDrugIds, input);
    renderCopyableSummary(copySummaryEl, decision, input, selectedDrugIds);
  });
}

function clearFormMessage(formMessage) {
  if (!formMessage) {
    return;
  }
  formMessage.classList.remove("show");
  formMessage.textContent = "";
  formMessage.removeAttribute("data-message-type");
}

function showFormMessage(formMessage, message, messageType) {
  if (!formMessage) {
    return;
  }
  formMessage.classList.add("show");
  formMessage.textContent = message;
  formMessage.setAttribute("data-message-type", messageType || "general");
  if (typeof formMessage.scrollIntoView === "function") {
    formMessage.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

function handlePatientFormSubmit(form, formMessage) {
  const input = parseInput(new FormData(form));
  const plausibilityWarnings = getInputPlausibilityWarnings(input);
  clearFormMessage(formMessage);
  window.__CURRENT_INPUT = input;
  const decision = normalizeDecisionOutput(applyContextToSelectionTargets(buildDecision(input), input));
  renderDecision(decision);
  if (plausibilityWarnings.length) {
    showFormMessage(formMessage, buildInputPlausibilityMessage(plausibilityWarnings), "plausibility");
  }
}

function bindGlobalFormHandlers() {
  if (window.__PH_GLOBAL_FORM_HANDLERS_BOUND) {
    return;
  }
  window.__PH_GLOBAL_FORM_HANDLERS_BOUND = true;

  document.addEventListener("invalid", (event) => {
    const target = event.target;
    if (!target || !target.form || target.form.id !== "patient-form") {
      return;
    }
    const formMessage = document.getElementById("form-message");
    showFormMessage(formMessage, "Please complete required fields before generating recommendations.");
  }, true);

  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (!form || form.id !== "patient-form") {
      return;
    }
    event.preventDefault();
    const formMessage = document.getElementById("form-message");
    try {
      handlePatientFormSubmit(form, formMessage);
    } catch (error) {
      showFormMessage(
        formMessage,
        `Unable to generate recommendation: ${error instanceof Error ? error.message : "Unexpected error"}`
      );
      console.error(error);
    }
  }, true);
}

function init() {
  const form = document.getElementById("patient-form");
  const formMessage = document.getElementById("form-message");
  const assessmentStageSelect = document.querySelector("select[name='assessmentStage']");
  const whoGroupSelect = document.querySelector("select[name='whoGroup']");
  const pawpInput = document.querySelector("input[name='PAWP']");
  const egfrInput = document.querySelector("input[name='egfr']");
  const renalStatusSelect = document.querySelector("select[name='renalStatus']");
  const volumeOverloadCheckbox = document.querySelector("input[name='volumeOverload']");
  const riskScoreInputs = document.getElementById("risk-score-inputs");
  const clinicalPolicyLayer = document.getElementById("clinical-policy-layer");
  const currentRegimenFieldset = document.getElementById("current-regimen-fieldset");
  const ctephWorkflowFieldset = document.getElementById("cteph-workflow-fieldset");
  const currentRegimenOptions = document.getElementById("current-regimen-options");
  const riskModelSelect = document.getElementById("risk-model");
  const advancedRiskDetails = document.getElementById("advanced-risk-details");
  const riskModelFields = Array.prototype.slice.call(document.querySelectorAll(".risk-model-field, .quick-risk-field"));
  const advancedRiskFields = Array.prototype.slice.call(document.querySelectorAll(".advanced-risk-field"));
  const quickFillButtons = Array.prototype.slice.call(document.querySelectorAll(".segment-btn"));

  if (!form) {
    return false;
  }

  if (form.dataset.phBound === "1") {
    return true;
  }
  form.dataset.phBound = "1";

  const riskModelOptionsByStage = {
    initial: [
      { value: "reveal20_initial", label: "REVEAL 2.0" },
      { value: "escers_simplified_initial", label: "ESC/ERS Simplified 3-Variable Baseline" }
    ],
    follow_up: [
      { value: "reveal_lite2_followup", label: "REVEAL Lite 2" },
      { value: "compera20_followup", label: "COMPERA 2.0 4-Risk Strata" },
      { value: "french_noninvasive_followup", label: "French Noninvasive Criteria" }
    ]
  };

  const setRiskModelOptions = () => {
    if (!assessmentStageSelect || !riskModelSelect) {
      return;
    }
    const stage = assessmentStageSelect.value === "initial" ? "initial" : "follow_up";
    const options = riskModelOptionsByStage[stage];
    const current = riskModelSelect.value;
    riskModelSelect.innerHTML = options
      .map((option) => `<option value="${option.value}">${option.label}</option>`)
      .join("");
    const hasCurrent = options.some((option) => option.value === current);
    if (hasCurrent) {
      riskModelSelect.value = current;
    }
  };

  const setFieldsetVisibility = (fieldset, show) => {
    if (!fieldset) {
      return;
    }
    if (show) {
      fieldset.classList.remove("is-hidden");
    } else {
      fieldset.classList.add("is-hidden");
    }
    const controls = fieldset.querySelectorAll("input, select, textarea, button");
    for (let i = 0; i < controls.length; i += 1) {
      controls[i].disabled = !show;
    }
  };

  const renderCurrentRegimenOptions = () => {
    if (!currentRegimenOptions) {
      return;
    }
    currentRegimenOptions.innerHTML = sortDrugIdsAlphabetically(FOLLOW_UP_REGIMEN_DRUG_IDS)
      .map((drugId) => {
        const drug = DRUGS[drugId];
        if (!drug) {
          return "";
        }
        return `
          <label class="modifier-item">
            <input type="checkbox" name="currentRegimenDrugIds" value="${escapeHtml(drug.id)}" />
            <span>
              <strong>${escapeHtml(drug.name)}</strong>
              <small>${escapeHtml(CLASS_LABELS[drug.classId])}</small>
            </span>
          </label>
        `;
      })
      .join("");
  };

  const updateRiskModelFieldVisibility = () => {
    if (!riskModelSelect) {
      return;
    }
    const selectedModel = riskModelSelect.value;
    riskModelFields.forEach((field) => {
      const models = (field.getAttribute("data-models") || "").split(",").map((entry) => entry.trim());
      const showField = models.includes(selectedModel);
      if (showField) {
        field.classList.remove("is-hidden");
      } else {
        field.classList.add("is-hidden");
      }
      const controls = field.querySelectorAll("input, select, textarea, button");
      for (let i = 0; i < controls.length; i += 1) {
        controls[i].disabled = !showField;
      }
    });
    renderRiskStrataTiles(selectedModel);
    if (advancedRiskDetails) {
      const hasVisibleAdvancedFields = advancedRiskFields.some((field) => !field.classList.contains("is-hidden"));
      if (hasVisibleAdvancedFields) {
        advancedRiskDetails.classList.remove("is-hidden");
      } else {
        advancedRiskDetails.classList.add("is-hidden");
        advancedRiskDetails.open = false;
      }
    }
  };

  const updateRiskInputsVisibility = () => {
    if (!whoGroupSelect || !riskScoreInputs || !riskModelSelect) {
      return;
    }
    const showGroup1 = whoGroupSelect.value === "1";
    const showGroup4 = whoGroupSelect.value === "4";
    const showFollowupRegimen = showGroup1 && assessmentStageSelect && assessmentStageSelect.value === "follow_up";
    if (showGroup1) {
      riskScoreInputs.classList.remove("is-hidden");
      setRiskModelOptions();
      riskModelSelect.disabled = false;
      updateRiskModelFieldVisibility();
    } else {
      riskScoreInputs.classList.add("is-hidden");
      const controls = riskScoreInputs.querySelectorAll("input, select, textarea, button");
      for (let i = 0; i < controls.length; i += 1) {
        controls[i].disabled = true;
      }
    }
    setFieldsetVisibility(clinicalPolicyLayer, showGroup1);
    setFieldsetVisibility(currentRegimenFieldset, showFollowupRegimen);
    setFieldsetVisibility(ctephWorkflowFieldset, showGroup4);
  };

  const syncRenalStatusFromEgfr = () => {
    if (!egfrInput || !renalStatusSelect) {
      return;
    }
    const egfr = toNumber(egfrInput.value);
    const mappedStatus = getRenalStatusFromEgfr(egfr);
    if (!mappedStatus) {
      return;
    }
    renalStatusSelect.value = mappedStatus;
  };

  const syncVolumeOverloadFromPawp = () => {
    if (!pawpInput || !volumeOverloadCheckbox) {
      return;
    }
    const pawp = toNumber(pawpInput.value);
    if (pawp !== null && pawp > 15) {
      volumeOverloadCheckbox.checked = true;
      volumeOverloadCheckbox.dataset.autoByPawp = "1";
      return;
    }
    if (volumeOverloadCheckbox.dataset.autoByPawp === "1") {
      volumeOverloadCheckbox.checked = false;
      volumeOverloadCheckbox.removeAttribute("data-auto-by-pawp");
    }
  };

  const getQuickCategoryFromValue = (targetName, value) => {
    if (value === null || value === undefined) {
      return "";
    }
    if (targetName === "heartRate") {
      return value > 96 ? "gt96" : "lte96";
    }
    if (targetName === "systolicBp") {
      return value < 110 ? "lt110" : "gte110";
    }
    if (targetName === "walkDistance") {
      if (value > 440) return "gt440";
      if (value >= 320) return "320to440";
      if (value >= 165) return "165to319";
      return "lt165";
    }
    if (targetName === "bnp") {
      if (value < 50) return "lt50";
      if (value <= 199) return "50to199";
      if (value <= 799) return "200to799";
      return "gte800";
    }
    if (targetName === "ntProbnp") {
      if (value < 300) return "lt300";
      if (value <= 649) return "300to649";
      if (value <= 1100) return "650to1100";
      return "gt1100";
    }
    if (targetName === "egfr") {
      if (value >= 60) return "gte60";
      if (value >= 30) return "30to59";
      return "lt30";
    }
    if (targetName === "dlcoPercentPred") {
      return value < 40 ? "lt40" : "gte40";
    }
    if (targetName === "mrap") {
      return value > 20 ? "gt20" : "lte20";
    }
    if (targetName === "PVR") {
      return value < 5 ? "lt5" : "gte5";
    }
    return "";
  };

  const getQuickButtonTarget = (button) => {
    if (!button) {
      return "";
    }
    const parentGroup = button.closest(".segment-group");
    if (parentGroup && parentGroup.getAttribute("data-target")) {
      return parentGroup.getAttribute("data-target");
    }
    return button.getAttribute("data-quick-fill-target")
      || button.getAttribute("data-fill-target")
      || button.getAttribute("data-select-target")
      || "";
  };

  const getQuickCategoryFromState = (targetName) => {
    if (targetName === "whoFc") {
      const selectEl = document.querySelector(`[name='${targetName}']`);
      return selectEl ? selectEl.value : "";
    }

    if (["pahSubgroup", "maleOver60", "recentHospitalization", "pericardialEffusion"].includes(targetName)) {
      const hiddenEl = document.querySelector(`[name='${targetName}']`);
      if (!hiddenEl) {
        return "";
      }
      return hiddenEl.value || "";
    }

    const inputEl = document.querySelector(`[name='${targetName}']`);
    const numericValue = inputEl ? toNumber(inputEl.value) : null;
    return numericValue === null ? "" : getQuickCategoryFromValue(targetName, numericValue);
  };

  const syncQuickFillButtonsForTarget = (targetName) => {
    const hiddenCategoryEl = document.querySelector(`[name='${targetName}Category']`);
    const activeCategory = getQuickCategoryFromState(targetName);
    if (hiddenCategoryEl) {
      hiddenCategoryEl.value = activeCategory;
    }
    quickFillButtons.forEach((button) => {
      if (getQuickButtonTarget(button) !== targetName) {
        return;
      }
      if (button.getAttribute("data-category-value") === activeCategory) {
        button.classList.add("is-active");
      } else {
        button.classList.remove("is-active");
      }
    });
  };

  const applyInputPlausibilityFlags = (warnings) => {
    const flaggedLookup = (warnings || []).reduce(function buildLookup(lookup, warning) {
      lookup[warning.name] = true;
      return lookup;
    }, {});

    Object.keys(INPUT_PLAUSIBILITY_RULES).forEach((fieldName) => {
      const inputEl = form.querySelector(`[name='${fieldName}']`);
      if (!inputEl) {
        return;
      }
      if (flaggedLookup[fieldName]) {
        inputEl.classList.add("input-range-flag");
      } else {
        inputEl.classList.remove("input-range-flag");
      }
    });
  };

  const updateInputPlausibilityFeedback = (showMessage) => {
    const warnings = getInputPlausibilityWarnings(parseInput(new FormData(form)));
    applyInputPlausibilityFlags(warnings);

    if (showMessage && warnings.length) {
      showFormMessage(formMessage, buildInputPlausibilityMessage(warnings), "plausibility");
      return warnings;
    }

    if ((!warnings.length || !showMessage) && formMessage && formMessage.getAttribute("data-message-type") === "plausibility") {
      clearFormMessage(formMessage);
    }
    return warnings;
  };

  const bindQuickFillButtons = () => {
    quickFillButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const targetName = getQuickButtonTarget(button);
        const currentCategory = targetName ? getQuickCategoryFromState(targetName) : "";
        const clickedCategory = button.getAttribute("data-category-value") || "";
        const fillTargetName = button.getAttribute("data-fill-target") || button.getAttribute("data-quick-fill-target");
        const inputEl = fillTargetName ? document.querySelector(`[name='${fillTargetName}']`) : null;
        const selectTargetName = button.getAttribute("data-select-target");
        const selectEl = selectTargetName ? document.querySelector(`[name='${selectTargetName}']`) : null;
        const hiddenCategoryName = button.getAttribute("data-category-target");
        const hiddenCategoryEl = hiddenCategoryName ? document.querySelector(`[name='${hiddenCategoryName}']`) : null;

        if (clickedCategory && clickedCategory === currentCategory) {
          if (inputEl) {
            inputEl.value = "";
          }
          if (selectEl) {
            selectEl.value = "";
          }
          if (hiddenCategoryEl) {
            hiddenCategoryEl.value = "";
          }
        } else {
          if (inputEl) {
            inputEl.value = button.getAttribute("data-fill-value") || "";
          }
          if (selectEl) {
            selectEl.value = button.getAttribute("data-select-value") || "";
          }
          if (hiddenCategoryEl) {
            hiddenCategoryEl.value = clickedCategory;
          }
        }

        if (fillTargetName === "egfr") {
          syncRenalStatusFromEgfr();
        }
        if (targetName) {
          syncQuickFillButtonsForTarget(targetName);
        }
        updateInputPlausibilityFeedback(false);
        const preview = getLiveRiskPreview(parseInput(new FormData(form)));
        updateRiskStrataHighlight(preview.label, preview.modelId);
      });
    });

    const quickTargetBindings = {
      whoFc: ["whoFc"],
      pahSubgroup: ["pahSubgroup"],
      maleOver60: ["maleOver60"],
      egfr: ["egfr"],
      heartRate: ["heartRate"],
      systolicBp: ["systolicBp"],
      recentHospitalization: ["recentHospitalization"],
      walkDistance: ["walkDistance"],
      bnp: ["bnp"],
      ntProbnp: ["ntProbnp"],
      pericardialEffusion: ["pericardialEffusion"],
      dlcoPercentPred: ["dlcoPercentPred"],
      mrap: ["mrap"],
      PVR: ["PVR"]
    };

    Object.keys(quickTargetBindings).forEach((targetName) => {
      quickTargetBindings[targetName].forEach((sourceName) => {
        const sourceEl = document.querySelector(`[name='${sourceName}']`);
        if (!sourceEl) {
          return;
        }
        sourceEl.addEventListener("input", () => syncQuickFillButtonsForTarget(targetName));
        sourceEl.addEventListener("change", () => syncQuickFillButtonsForTarget(targetName));
      });
      syncQuickFillButtonsForTarget(targetName);
    });
  };

  const updateLiveRiskPreview = () => {
    const preview = getLiveRiskPreview(parseInput(new FormData(form)));
    updateRiskStrataHighlight(preview.label, preview.modelId);
  };

  renderCurrentRegimenOptions();
  updateRiskInputsVisibility();
  setResultsPanelState(false, false);
  syncRenalStatusFromEgfr();
  syncVolumeOverloadFromPawp();
  bindQuickFillButtons();
  bindResultsPanelControls();
  updateInputPlausibilityFeedback(false);
  updateLiveRiskPreview();
  if (whoGroupSelect) {
    whoGroupSelect.addEventListener("change", () => {
      updateRiskInputsVisibility();
      updateLiveRiskPreview();
    });
  }
  if (assessmentStageSelect) {
    assessmentStageSelect.addEventListener("change", () => {
      updateRiskInputsVisibility();
      updateLiveRiskPreview();
    });
  }
  if (riskModelSelect) {
    riskModelSelect.addEventListener("change", () => {
      updateRiskModelFieldVisibility();
      updateLiveRiskPreview();
    });
  }
  if (egfrInput) {
    egfrInput.addEventListener("input", syncRenalStatusFromEgfr);
    egfrInput.addEventListener("change", syncRenalStatusFromEgfr);
  }
  if (pawpInput) {
    pawpInput.addEventListener("input", syncVolumeOverloadFromPawp);
    pawpInput.addEventListener("change", syncVolumeOverloadFromPawp);
  }
  if (volumeOverloadCheckbox) {
    volumeOverloadCheckbox.addEventListener("change", syncVolumeOverloadFromPawp);
  }
  form.addEventListener("input", () => {
    updateInputPlausibilityFeedback(false);
    updateLiveRiskPreview();
  });
  form.addEventListener("change", () => {
    updateInputPlausibilityFeedback(false);
    updateLiveRiskPreview();
  });

  return true;
}

function bootApp(attempt) {
  const currentAttempt = typeof attempt === "number" ? attempt : 0;
  bindGlobalFormHandlers();
  renderAppMetadata();
  const form = document.getElementById("patient-form");
  if (window.__PH_APP_READY && form && form.dataset.phBound === "1") {
    return;
  }
  const initialized = init();
  if (initialized) {
    window.__PH_APP_READY = true;
    return;
  }
  if (currentAttempt < 200) {
    window.setTimeout(() => bootApp(currentAttempt + 1), 50);
    return;
  }
  const formMessage = document.getElementById("form-message");
  if (formMessage) {
    formMessage.classList.add("show");
    formMessage.textContent = "App initialization failed in this environment. Please reload the page or try an updated browser.";
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootApp);
} else {
  bootApp();
}
