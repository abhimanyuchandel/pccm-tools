(function (root, factory) {
  const catalog = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = catalog;
  if (root) root.copdMedications = catalog;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const SOURCES = {
    gold: {
      title: "GOLD 2026 report and pocket guide",
      url: "https://goldcopd.org/2026-gold-report-and-pocket-guide/",
    },
    cdc: {
      title: "CDC adult immunization guidance",
      url: "https://www.cdc.gov/vaccines/hcp/imz-schedules/adult-notes.html",
    },
    rsv: {
      title: "CDC RSV guidance",
      url: "https://www.cdc.gov/rsv/hcp/vaccine-clinical-guidance/adults.html",
    },
    pneumo: {
      title: "CDC pneumococcal guidance",
      url: "https://www.cdc.gov/pneumococcal/hcp/vaccine-recommendations/index.html",
    },
    zoster: {
      title: "CDC Shingrix guidance",
      url: "https://www.cdc.gov/shingles/hcp/vaccine-considerations/index.html",
    },
    covid: {
      title: "CDC current COVID-19 guidance",
      url: "https://www.cdc.gov/covid/hcp/vaccine-considerations/routine-guidance.html",
    },
    aat: {
      title: "Alpha-1 Foundation clinical practice guidance",
      url: "https://journal.copdfoundation.org/jcopdf/id/1115/The-Diagnosis-and-Management-of-Alpha-1-Antitrypsin-Deficiency-in-the-Adult",
    },
    rehab: {
      title: "ATS pulmonary rehabilitation guideline",
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10449064/",
    },
    oxygen: {
      title: "ATS home oxygen guideline",
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC7667898/",
    },
    niv: {
      title: "ATS long-term NIV guideline",
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC7427384/",
    },
    transplant: {
      title: "ISHLT transplant candidate consensus",
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8979471/",
    },
    valves: {
      title: "FDA Zephyr valve approval and labeling",
      url: "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpma/pma.cfm?id=P180002",
    },
    lvr: {
      title: "GOLD 2026: interventional COPD management",
      url: "https://goldcopd.org/2026-gold-report-and-pocket-guide/",
    },
    nccn: {
      title: "NCCN Lung Cancer Screening guidelines",
      url: "https://www.nccn.org/guidelines/guidelines-detail?category=2&id=1441",
    },
    tobacco: {
      title: "ATS tobacco-dependence treatment guideline",
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC7365361/",
    },
    whoTobacco: {
      title: "WHO tobacco cessation treatment guideline",
      url: "https://www.who.int/publications/i/item/9789240096431",
    },
    trelegy: {
      title: "Trelegy U.S. prescribing information",
      url: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=b5a81d5a-4648-4c7a-951d-33c014a63c7e",
    },
    breztri: {
      title: "Breztri U.S. prescribing information",
      url: "https://www.azpicentral.com/breztri/breztri.pdf",
    },
    spiriva: {
      title: "Spiriva Respimat U.S. prescribing information",
      url: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=7b656b14-fcaa-2741-f6f0-e0be48971c02",
    },
    striverdi: {
      title: "Striverdi U.S. prescribing information",
      url: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=5d9a5433-857e-44ea-b3d6-2a400ca0cef5",
    },
    anoro: {
      title: "Umeclidinium/vilanterol U.S. prescribing information",
      url: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=6de414b1-f707-4b98-9e4b-742032ec90af",
    },
    symbicort: {
      title: "Symbicort U.S. prescribing information",
      url: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=fafa4cf1-99c2-43d5-73ad-51f256de3be0",
    },
    mepolizumab: {
      title: "Nucala COPD U.S. prescribing information",
      url: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=fefb887c-e4ac-431e-8893-e9d1a5a63fea",
    },
    dupilumab: {
      title: "Dupixent COPD U.S. prescribing information",
      url: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=595f437d-2729-40bb-9c62-c8ece1f82780",
    },
    roflumilast: {
      title: "Daliresp U.S. prescribing information",
      url: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=c9a1d0a8-581f-4f91-a2b8-f419192d0ebf",
    },
    ensifentrine: {
      title: "Ohtuvayre U.S. prescribing information",
      url: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=e6433c98-41a0-4f99-8f7f-d0e9db6e3f40",
    },
    macrolideSafety: {
      title: "BTS long-term macrolide safety guidance",
      url: "https://www.brit-thoracic.org.uk/clinical-resources/guidelines/long-term-macrolide-use/",
    },
    varenicline: {
      title: "Varenicline U.S. prescribing information",
      url: "https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=2f86bb7b-c6a6-4915-8ba1-17251540971c",
    },
    cat: {
      title: "Validated CAT / CAAT resources",
      url: "https://www.catestonline.org/",
    },
  };
  const MEDICATIONS = {
    spiriva: {
      category: "lama",
      name: "Tiotropium (Spiriva Respimat)",
      dose: "Tiotropium Respimat 2.5 mcg per actuation, 2 inhalations once daily (5 mcg/day).",
      detail:
        "COPD strength differs from the asthma strength. Review glaucoma/urinary retention and technique. Not a rescue inhaler.",
      source: "spiriva",
    },
    striverdi: {
      category: "laba",
      name: "Olodaterol (Striverdi Respimat)",
      dose: "Olodaterol Respimat 2.5 mcg per actuation, 2 inhalations once daily.",
      detail:
        "Do not duplicate LABAs. Asthma requires an ICS-containing regimen. Not for acute relief.",
      source: "striverdi",
    },
    anoro: {
      category: "laba-lama",
      name: "Umeclidinium/vilanterol (Anoro Ellipta)",
      dose: "Umeclidinium/vilanterol 62.5/25 mcg, 1 inhalation once daily.",
      detail:
        "Verify ability to use the dry-powder device and milk-protein allergy. Replace, rather than duplicate, other LABA/LAMA maintenance inhalers.",
      source: "anoro",
    },
    trelegy: {
      category: "triple",
      name: "Fluticasone/umeclidinium/vilanterol (Trelegy Ellipta)",
      dose: "Fluticasone furoate/umeclidinium/vilanterol 100/62.5/25 mcg, 1 inhalation once daily.",
      detail:
        "The 200 mcg fluticasone strength is not the U.S. COPD dose. Rinse mouth, review pneumonia risk, and verify DPI suitability. Replace previous combination maintenance inhalers.",
      source: "trelegy",
    },
    breztri: {
      category: "triple",
      name: "Budesonide/glycopyrrolate/formoterol (Breztri Aerosphere)",
      dose: "Budesonide/glycopyrrolate/formoterol 160/9/4.8 mcg per actuation, 2 inhalations twice daily.",
      detail:
        "Rinse mouth. Verify MDI technique and pneumonia risk. Replace previous combination maintenance inhalers; not for rescue use.",
      source: "breztri",
    },
    symbicort: {
      category: "ics-laba",
      name: "Budesonide/formoterol (Symbicort)",
      dose: "Budesonide/formoterol 160/4.5 mcg per actuation, 2 inhalations twice daily.",
      detail:
        "COPD maintenance dosing, not asthma SMART. Use the separately selected rescue inhaler. Review pneumonia and ICS adverse effects.",
      source: "symbicort",
    },
    ensifentrine: {
      category: "addon",
      name: "Ensifentrine (Ohtuvayre)",
      dose: "Ensifentrine 3 mg/2.5 mL by standard jet nebulizer twice daily, morning and evening.",
      detail:
        "Not a rescue treatment. Review paradoxical bronchospasm, psychiatric effects, nebulizer use, and evidence limitations with background triple therapy.",
      source: "ensifentrine",
    },
    roflumilast: {
      category: "addon",
      name: "Roflumilast",
      dose: "Roflumilast 500 mcg orally once daily. A 250 mcg daily lead-in for 4 weeks may improve tolerability but is not a therapeutic maintenance dose.",
      detail:
        "FEV1 below 50%, chronic bronchitis, and exacerbations support review. Contraindicated in Child-Pugh B/C; monitor weight, GI effects, mood/suicidality and interactions.",
      source: "roflumilast",
    },
    azithromycin: {
      category: "addon",
      name: "Maintenance azithromycin",
      dose: "Azithromycin 500 mg orally three times weekly as an off-label COPD exacerbation-prevention trial, with reassessment of benefit and adverse effects; evidence beyond one year is limited.",
      detail:
        "Preferential evidence in people not currently smoking. Review ECG/QTc, hearing, liver tests, resistance, NTM risk and drug interactions before treatment.",
      source: "gold",
    },
    dupilumab: {
      category: "biologic",
      name: "Dupilumab (Dupixent)",
      dose: "Dupilumab 300 mg subcutaneously every 2 weeks for COPD.",
      detail:
        "Add-on maintenance for inadequately controlled adult eosinophilic COPD, not rescue. There is no asthma-style loading dose for COPD. GOLD/trial evidence particularly supports eosinophils at least 300 with chronic bronchitis and persistent exacerbations on optimized triple therapy. Review hypersensitivity, eosinophilic conditions, helminths and live vaccines. Product label and payer criteria are separate from trial thresholds.",
      source: "dupilumab",
    },
    mepolizumab: {
      category: "biologic",
      name: "Mepolizumab (Nucala)",
      dose: "Mepolizumab 100 mg subcutaneously every 4 weeks for COPD.",
      detail:
        "Add-on maintenance for inadequately controlled adult eosinophilic COPD, not rescue. GOLD's higher-eosinophil pathway and the broader METREX phenotype are not identical; the FDA indication is phenotypic, not a universal numeric cutoff. Chronic bronchitis is not required for all mepolizumab evidence. Review hypersensitivity, zoster and helminths, and verify coverage.",
      source: "mepolizumab",
    },
  };
  const REFERENCES = {
    diagnosis: {
      title: "Diagnosis and airflow obstruction",
      text: "COPD requires the appropriate clinical context and post-bronchodilator obstruction (FEV1/FVC below 0.70). A value in the 0.60-0.80 range may warrant repeat testing. Consider age/LLN and alternatives when results and history disagree. A missing original report does not by itself erase an established diagnosis.",
      sources: ["gold"],
    },
    exacerbations: {
      title: "Exacerbation counts and GOLD grouping",
      text: "Count moderate and hospitalized events separately without double counting. GOLD 2026 uses at least one moderate or severe event for the initial Group E profile. A known positive event remains meaningful if the other count is unavailable; a missing count is never silently zero. Follow-up decisions use actual treatment, dyspnea and exacerbations, not the initial A/B/E label alone.",
      sources: ["gold"],
    },
    inhalers: {
      title: "Selecting a device and an ICS strategy",
      text: "Review the actual inhalers, technique, adherence, access, inspiratory flow and dexterity. Eosinophils estimate ICS exacerbation-prevention benefit, not COPD diagnosis. Coexisting asthma requires an ICS-containing strategy. ICS withdrawal is not a routine asthma-style step-down; weigh pneumonia/adverse effects and higher withdrawal risk with eosinophils at least 300.",
      sources: ["gold"],
    },
    aat: {
      title: "One-time AAT deficiency testing",
      text: "Offer testing to all patients with COPD regardless of age or ethnicity. Symptomatic diagnostic testing should include at least S/Z genotyping with level/phenotype or confirmatory testing as appropriate. AAT can rise with inflammation. Known deficiency warrants phenotype/genotype clarification, family counseling/testing and liver-care review, not automatic augmentation prescribing.",
      sources: ["aat"],
    },
    vaccines: {
      title: "U.S. adult vaccine reference",
      text: "Reconcile prior doses before ordering. Previous vaccination, immunocompromise, pregnancy and wound care can change product choice or timing. Unknown history does not mean a vaccine was completed or is automatically due.",
      table: {
        headers: ["Vaccine", "Who / when", "Product and schedule"],
        rows: [
          [
            "Pneumococcal",
            "Adults 19-49 with COPD; all adults 50+.",
            "PCV20 or PCV21 alone, or PCV15 then PPSV23 (usually 1 year later). Prior doses change the schedule.",
          ],
          [
            "RSV",
            "Adults 50-74 with COPD; all adults 75+.",
            "One dose: Arexvy, Abrysvo or mResvia. Not annual; no routine repeat after a prior dose.",
          ],
          [
            "Zoster",
            "Adults 50+; adults 19+ with qualifying immunocompromise.",
            "Shingrix: 2 doses, usually 2-6 months apart. Selected immunocompromised patients: 1-2 months.",
          ],
          [
            "Tdap / Td",
            "All adults, based on Tdap and primary-series history.",
            "Tdap if indicated, then Td or Tdap every 10 years. Catch-up, pregnancy and wound-care exceptions apply.",
          ],
          [
            "Influenza",
            "Every season.",
            "Age-appropriate influenza vaccine. At age 65+, prefer high-dose, adjuvanted or recombinant when available.",
          ],
          [
            "COVID-19",
            "Review current CDC age- and risk-based guidance.",
            "Current vaccine product and timing depend on prior doses, age and immune status.",
          ],
        ],
      },
      sources: ["cdc", "pneumo", "rsv", "zoster", "covid"],
    },
    roflumilastReview: {
      title: "Roflumilast prescribing and monitoring",
      text: "Contraindicated with Child-Pugh B/C liver impairment. Assess weight loss, mood/suicidality and drug interactions. An optional 250 mcg daily lead-in for 4 weeks may improve tolerability, but 500 mcg daily is the therapeutic dose. Review weight and symptoms after initiation.",
      sources: ["roflumilast", "gold"],
    },
    azithromycinReview: {
      title: "Maintenance azithromycin safety",
      text: "This is off-label exacerbation prevention, not an acute antibiotic course. Review ECG/QTc and interactions, hearing/balance, liver tests, sputum/NTM assessment when indicated, and antimicrobial resistance. Monitor response and adverse effects; evidence beyond one year is limited.",
      sources: ["gold", "macrolideSafety"],
    },
    ensifentrineReview: {
      title: "Ensifentrine delivery and precautions",
      text: "Maintenance dose: 3 mg by standard jet nebulizer with a mouthpiece twice daily. Review serious hypersensitivity and psychiatric risk, including new or worsening depression/suicidality. Confirm equipment access and technique. Do not use it as rescue treatment or mix it with other medicines in the nebulizer.",
      sources: ["ensifentrine"],
    },
    oxygen: {
      title: "Oxygen and home ventilation",
      text: "Stable severe resting room-air hypoxemia supports LTOT evaluation: PaO2 at most 55 or SpO2 at most 88%; borderline values need qualifying complications. Moderate resting desaturation alone does not establish LTOT benefit. Exertional needs require a separate assessment. Do not remove needed oxygen just to enter data. Stable arterial hypercapnia may support NIV review; assess OSA and reassess 2-4 weeks after acute hypercapnic failure rather than automatically initiating chronic NIV during an admission.",
      sources: ["oxygen", "niv"],
    },
    advanced: {
      title: "Volume reduction and transplantation are different evaluations",
      text: "Lung volume reduction needs emphysema morphology and hyperinflation assessment after optimized care and rehabilitation. Valve selection requires device-specific assessment, including little/no collateral ventilation; collateral ventilation does not rule out surgery. FEV1 at most 20% with DLCO at most 20% or homogeneous emphysema signals high surgical risk, not a universal valve exclusion. Transplant referral and listing are different decisions. BODE, progression, exacerbations, hypercapnia, pulmonary hypertension, age, frailty, tobacco/nicotine exposure and goals need center-specific review. Missing workup never establishes eligibility or ineligibility.",
      sources: ["lvr", "valves", "transplant"],
    },
    acute: {
      title: "Outpatient exacerbation assessment",
      text: "Assess severity, trajectory and mimics before outpatient treatment. Short-acting bronchodilators, a short systemic-steroid course when indicated, and selective antibiotics are distinct decisions. Antibiotic benefit is more likely with sputum purulence plus increased dyspnea or volume. Controlled oxygen during acute care commonly targets 88-92%, with blood-gas reassessment when indicated. Missing observations or reported improvement alone do not establish discharge safety.",
      sources: ["gold"],
    },
    screening: {
      title: "NCCN screening versus diagnostic imaging",
      text: "This tool retains the existing NCCN 2026 policy: age at least 50 with at least 20 cigarette pack-years, without a quit-year cutoff or automatic upper-age exclusion. Discuss benefits, harms and preferences and stop screening when curative-intent treatment can no longer benefit the patient. Symptoms or established cancer/nodule surveillance require their own pathway. Medicare/insurer coverage criteria can differ. This is not a nodule-management calculator.",
      sources: ["nccn"],
    },
  };
  return { SOURCES, MEDICATIONS, REFERENCES };
});
