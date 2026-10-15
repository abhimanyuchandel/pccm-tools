(function (root, factory) {
  "use strict";

  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.asthmaMedications = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const REVIEW_DATE = "October 15, 2026";

  const SOURCES = {
    gina: {
      id: "gina",
      title: "GINA 2026 Strategy Report",
      url: "https://ginasthma.org/2026-gina-strategy-report/"
    },
    severe: {
      id: "severe",
      title: "GINA 2026 Difficult-to-Treat and Severe Asthma Guide",
      url: "https://ginasthma.org/2026-gina-severe-asthma-guide/"
    },
    nhlbi: {
      id: "nhlbi",
      title: "NHLBI 2020 Focused Updates: Asthma Management Clinician's Guide",
      url: "https://www.nhlbi.nih.gov/resources/clinician-guide-2020-focused-updates-asthma-management-guidelines"
    },
    symbicort: {
      id: "symbicort",
      title: "Symbicort (budesonide-formoterol): U.S. Prescribing Information",
      url: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=fafa4cf1-99c2-43d5-73ad-51f256de3be0"
    },
    advair: {
      id: "advair",
      title: "Advair Diskus (fluticasone propionate-salmeterol): U.S. Prescribing Information",
      url: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=4eeb5f6a-593f-4a9e-9692-adefa2caf8fc"
    },
    airsupra: {
      id: "airsupra",
      title: "Airsupra (albuterol-budesonide): U.S. Prescribing Information",
      url: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=e60aa9f9-5139-44df-b886-ebddc3c7eb13"
    },
    spiriva: {
      id: "spiriva",
      title: "Spiriva Respimat (tiotropium): U.S. Prescribing Information",
      url: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=7b656b14-fcaa-2741-f6f0-e0be48971c02"
    },
    trelegy: {
      id: "trelegy",
      title: "Trelegy Ellipta: U.S. Prescribing Information",
      url: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=b5a81d5a-4648-4c7a-951d-33c014a63c7e"
    },
    breztri: {
      id: "breztri",
      title: "Breztri Aerosphere: U.S. Prescribing Information (Asthma and COPD)",
      url: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=715433dc-cb2b-43ea-b6df-c5b4177adc6c"
    },
    omalizumab: {
      id: "omalizumab",
      title: "Xolair (omalizumab): U.S. Prescribing Information, Adult Asthma Table 1",
      url: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=7f6a2191-adfb-48b9-9bfa-0d9920479f0d"
    },
    omlyclo: {
      id: "omlyclo",
      title: "Omlyclo (omalizumab-igec): U.S. Prescribing Information",
      url: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=a2075490-d8e7-4c23-8b2e-8f2cd5a67948"
    },
    mepolizumab: {
      id: "mepolizumab",
      title: "Nucala (mepolizumab): U.S. Prescribing Information",
      url: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=fefb887c-e4ac-431e-8893-e9d1a5a63fea"
    },
    benralizumab: {
      id: "benralizumab",
      title: "Fasenra (benralizumab): U.S. Prescribing Information",
      url: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=da6aca1a-19ed-44a4-abb7-696c7d58b784"
    },
    reslizumab: {
      id: "reslizumab",
      title: "Cinqair (reslizumab): U.S. Prescribing Information",
      url: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=053b9158-2a5b-48b9-bf47-5fa78a35ec33"
    },
    dupilumab: {
      id: "dupilumab",
      title: "Dupixent (dupilumab): U.S. Prescribing Information",
      url: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=595f437d-2729-40bb-9c62-c8ece1f82780"
    },
    tezepelumab: {
      id: "tezepelumab",
      title: "Tezspire (tezepelumab-ekko): U.S. Prescribing Information",
      url: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=60f0aa03-ad25-4d48-80ce-7fcfa76f325f"
    },
    depemokimab: {
      id: "depemokimab",
      title: "Exdensur (depemokimab-ulaa): U.S. Prescribing Information",
      url: "https://dailymed.nlm.nih.gov/dailymed/fda/fdaDrugXsl.cfm?setid=30332b20-2ac0-42ad-a775-d3ca7f5fe29f"
    },
    cdc: {
      id: "cdc",
      title: "CDC Adult Immunization Schedule Notes",
      url: "https://www.cdc.gov/vaccines/hcp/imz-schedules/adult-notes.html"
    },
    atsTobacco: { id: "atsTobacco", title: "ATS Tobacco-Dependence Pharmacotherapy Guideline", url: "https://doi.org/10.1164/rccm.202005-1982ST" },
    whoTobacco: { id: "whoTobacco", title: "WHO 2024 Tobacco Cessation Guideline", url: "https://www.ncbi.nlm.nih.gov/books/NBK604665/" },
    uspstfTobacco: { id: "uspstfTobacco", title: "USPSTF Tobacco Cessation and Pregnancy Guidance", url: "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/tobacco-use-in-adults-and-pregnant-women-counseling-and-interventions" },
    varenicline: { id: "varenicline", title: "Varenicline U.S. Prescribing Information", url: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=16a03b5e-03e0-4b0b-92a4-aaf0669906f7" },
    bupropionSmoking: { id: "bupropionSmoking", title: "Bupropion SR Smoking-Cessation Prescribing Information", url: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=a591e33a-52f0-41c8-a00b-4a1afcc3dc4c" },
    nicotinePatch: { id: "nicotinePatch", title: "CDC Nicotine Patch Dosing and Precautions", url: "https://www.cdc.gov/tobacco/campaign/tips/quit-smoking/quit-smoking-medications/how-to-use-quit-smoking-medicines/how-to-use-a-nicotine-patch.html" },
    nicotineGum: { id: "nicotineGum", title: "CDC Nicotine Gum Dosing and Precautions", url: "https://www.cdc.gov/tobacco/campaign/tips/quit-smoking/quit-smoking-medications/how-to-use-quit-smoking-medicines/how-to-use-nicotine-gum.html" },
    influenza: {
      id: "influenza",
      title: "CDC Seasonal Influenza Vaccine Guidance",
      url: "https://www.cdc.gov/flu/hcp/acip/"
    },
    covidVaccine: {
      id: "covidVaccine",
      title: "CDC 2026-2027 Adult COVID-19 Vaccination Guidance",
      url: "https://www.cdc.gov/covid/hcp/vaccine-considerations/routine-guidance.html"
    },
    zoster: {
      id: "zoster",
      title: "CDC Shingles Vaccine Recommendations",
      url: "https://www.cdc.gov/shingles/hcp/vaccine-considerations/index.html"
    },
    rsv: {
      id: "rsv",
      title: "CDC RSV Vaccine Guidance for Adults",
      url: "https://www.cdc.gov/rsv/hcp/vaccine-clinical-guidance/adults.html"
    },
    pneumococcal: {
      id: "pneumococcal",
      title: "CDC Pneumococcal Vaccine Recommendations",
      url: "https://www.cdc.gov/pneumococcal/hcp/vaccine-recommendations/index.html"
    }
  };

  const MEDICATIONS = {
    air: {
      id: "air",
      name: "As-needed budesonide-formoterol (Symbicort / Breyna)",
      detail: "GINA Track 1 Steps 1-2: budesonide-formoterol 160/4.5 mcg, 1 inhalation as needed for symptoms or before exercise; another inhalation may be taken after a few minutes if needed. For AIR-only treatment, maximum 12 total inhalations in 24 hours; seek medical care if more are needed or symptoms worsen. Reliever-only use is guideline-supported but off-label in the U.S. The U.S. label approves maintenance use and does not approve acute relief. The 80/4.5 mcg strength is not GINA's recommended adult AIR formulation. Use a spacer with the pMDI. Do not combine with a controller containing a non-formoterol LABA. With a formoterol-containing triple controller, GINA permits a separate ICS-formoterol reliever as described in the triple-therapy reference; confirm total formoterol exposure across both inhalers rather than adding this AIR-only ceiling to scheduled triple therapy. This does not make the triple inhaler a reliever.",
      noteDetail: "Budesonide-formoterol 160/4.5 mcg: 1 inhalation as needed for symptoms or before exercise; for AIR-only treatment, maximum 12 inhalations/day. With a formoterol-containing triple controller, confirm the combined formoterol limit separately. Seek care for worsening symptoms or need beyond the applicable limit. Guideline-supported reliever use is off-label in the U.S.",
      offLabel: true,
      sourceIds: ["gina", "symbicort"]
    },
    smartLow: {
      id: "smartLow",
      name: "Low-dose budesonide-formoterol SMART / MART",
      detail: "GINA Track 1 Step 3: budesonide-formoterol 160/4.5 mcg, 1 inhalation twice daily plus 1 inhalation as needed for symptoms or before exercise. Maximum 12 inhalations in 24 hours, including scheduled and reliever doses; seek care if more are needed or symptoms worsen. SMART is supported by GINA and NHLBI but reliever use is off-label under U.S. labeling; the labeled adult maintenance schedule is 2 inhalations twice daily. Use a spacer with the pMDI. Do not add another LABA or routinely prescribe a second reliever for this regimen. Ensure adequate inhaler supply for maintenance and relief.",
      noteDetail: "Budesonide-formoterol 160/4.5 mcg: 1 inhalation twice daily and 1 as needed for symptoms or before exercise; maximum 12 total inhalations/day. Use a spacer and seek care for worsening symptoms or need beyond this limit. U.S. SMART use is off-label.",
      offLabel: true,
      sourceIds: ["gina", "nhlbi", "symbicort"]
    },
    smartMedium: {
      id: "smartMedium",
      name: "Medium-dose budesonide-formoterol SMART / MART",
      detail: "GINA Track 1 Steps 4-5: budesonide-formoterol 160/4.5 mcg, 2 inhalations twice daily plus 1 inhalation as needed for symptoms or before exercise. Maximum 12 inhalations in 24 hours, including all scheduled and reliever doses; seek care if more are needed or symptoms worsen. The scheduled dose matches the U.S. labeled maximum maintenance dose, but additional reliever use is guideline-supported and off-label. This is medium-dose MART, not high-dose MART; do not automatically increase scheduled doses beyond this regimen. Use a spacer, avoid duplicate LABA therapy, and ensure adequate inhaler supply.",
      noteDetail: "Budesonide-formoterol 160/4.5 mcg: 2 inhalations twice daily and 1 as needed for symptoms or before exercise; maximum 12 total inhalations/day. Use a spacer and seek care for worsening symptoms or need beyond this limit. U.S. reliever use is off-label.",
      offLabel: true,
      sourceIds: ["gina", "nhlbi", "symbicort"]
    },
    highDose: {
      id: "highDose",
      name: "Monitored high-dose ICS-LABA trial (Advair Diskus 500/50)",
      detail: "A U.S. asthma-labeled higher-ICS option is fluticasone propionate/salmeterol (Advair Diskus or equivalent approved generic) 500/50 mcg, 1 inhalation twice daily approximately 12 hours apart; maximum 1 inhalation twice daily. This provides fluticasone propionate 1000 mcg/day, a high ICS dose. Consider only a monitored 3-6-month trial when control remains inadequate despite medium-dose therapy after reviewing diagnosis, adherence, technique, access, and contributory factors; additional benefit may be limited and steroid toxicity increases. If chosen after SMART or another ICS-LABA, replace the previous controller rather than adding a second LABA. Provide an independent compatible reliever: albuterol 90 mcg, usually 2 inhalations every 4-6 hours as needed, or Airsupra 90/80 mcg, 2 inhalations as needed (maximum 6 doses / 12 inhalations in 24 hours). Do not pair salmeterol with an ICS-formoterol reliever. Advair is not a rescue inhaler or MART. Medium-dose SMART remains medium-dose treatment, not this high-dose option. Rinse mouth after Advair; avoid Diskus with severe milk-protein allergy. Monitor control, lung function, local/systemic steroid effects, and return to the lowest effective ICS dose if there is no meaningful benefit.",
      noteDetail: "If a monitored higher-ICS trial is selected, replace the prior ICS-LABA with fluticasone propionate/salmeterol 500/50 mcg, 1 inhalation twice daily (maximum 2/day), with a separate albuterol or Airsupra reliever. Do not use ICS-formoterol as reliever with salmeterol. Rinse mouth, monitor benefit and steroid adverse effects, and reassess the need for high-dose treatment over 3-6 months.",
      offLabel: false,
      sourceIds: ["gina", "severe", "advair", "airsupra"]
    },
    airsupra: {
      id: "airsupra",
      name: "Albuterol-budesonide (Airsupra)",
      detail: "For adults aged 18 years or older: 2 inhalations of albuterol/budesonide 90/80 mcg as needed (180/160 mcg per dose), including prevention of bronchoconstriction. Maximum 6 doses, or 12 inhalations, in 24 hours. An FDA-approved anti-inflammatory reliever option for Track 2; continue the indicated maintenance controller. It is not a scheduled maintenance inhaler or a MART regimen. Seek care for worsening symptoms, inadequate relief, or need beyond the daily limit. Do not routinely pair it with an ICS-formoterol reliever, and do not substitute repeated Airsupra doses for a supervised acute-exacerbation albuterol protocol.",
      noteDetail: "Albuterol-budesonide 90/80 mcg: 2 inhalations as needed; maximum 6 doses (12 inhalations)/day. Continue the maintenance controller and seek care for inadequate relief or worsening symptoms.",
      offLabel: false,
      sourceIds: ["gina", "airsupra"]
    },
    tiotropium: {
      id: "tiotropium",
      name: "Tiotropium (Spiriva Respimat)",
      detail: "Asthma add-on: 2 inhalations of the 1.25 mcg/actuation Respimat once daily, total 2.5 mcg/day. Do not use the COPD schedule of 2 inhalations of 2.5 mcg/actuation or substitute HandiHaler asthma dosing. May modestly improve lung function and reduce exacerbations after ICS-LABA optimization; it is not a rescue inhaler. Avoid duplication with the LAMA in a triple inhaler. Review narrow-angle glaucoma, urinary retention, and anticholinergic effects, especially with renal impairment. Maximum benefit may take 4-8 weeks.",
      noteDetail: "Tiotropium Respimat 1.25 mcg/actuation: 2 inhalations once daily (2.5 mcg/day) as an add-on; avoid duplicate LAMA therapy. Not for acute relief.",
      offLabel: false,
      sourceIds: ["gina", "spiriva"]
    },
    triple: {
      id: "triple",
      name: "Asthma-labeled ICS-LABA-LAMA maintenance inhaler",
      detail: "Options for persistent poor control despite optimized ICS-LABA: Trelegy Ellipta 100/62.5/25 or 200/62.5/25 mcg, 1 inhalation once daily (adult asthma; maximum 200/62.5/25 once daily); or Breztri Aerosphere 160/18/4.8 mcg, 2 inhalations twice daily (asthma age 12 years or older). Breztri 160/9/4.8 is the COPD formulation, not the labeled asthma formulation. These triple inhalers are maintenance treatment: never take extra triple-inhaler puffs for symptoms or prescribe the triple inhaler itself as MART. With non-formoterol LABA triple therapy such as Trelegy, use a separate albuterol-budesonide or albuterol reliever; do not use ICS-formoterol as reliever. With a formoterol-containing triple controller such as Breztri, GINA permits a separate ICS-formoterol, ICS-SABA, or SABA reliever. A separate budesonide-formoterol reliever is off-label in the U.S.; this guideline option differs from U.S. product labeling, so confirm the complete dosing plan, total formoterol exposure, and inhaler instructions. Do not copy the single-inhaler SMART 12-puff allowance on top of scheduled Breztri without accounting for controller formoterol. Avoid otherwise duplicating LABA/LAMA therapy. Triple therapy alone does not establish high-dose ICS or severe asthma. Rinse mouth after scheduled doses; review glaucoma and urinary-retention risk.",
      noteDetail: "Use the selected asthma-labeled triple inhaler at its maintenance dose; never use extra triple-inhaler puffs for relief or triple-inhaler MART. Provide albuterol/Airsupra with a non-formoterol LABA. With a formoterol-containing triple controller, a separate ICS-formoterol reliever is a GINA option but off-label in the U.S.; verify total formoterol exposure and the complete dosing plan.",
      offLabel: false,
      sourceIds: ["gina", "trelegy", "breztri", "symbicort", "airsupra"]
    },
    azithromycin: {
      id: "azithromycin",
      name: "Add-on azithromycin",
      detail: "Off-label specialist-directed option for adults with persistent symptomatic asthma despite optimized high-dose ICS-LABA: a studied regimen is 500 mg orally 3 times weekly. Before initiation, assess sputum for nontuberculous mycobacteria, obtain ECG/QTc, review QT-prolonging drugs and hearing impairment, and discuss gastrointestinal effects and antimicrobial resistance. Repeat ECG after 1 month. GINA suggests a trial of at least 6 months because benefit was not evident by 3 months. This is selected long-term add-on treatment, not routine antibiotic therapy for an asthma exacerbation.",
      noteDetail: "If selected, azithromycin 500 mg orally 3 times weekly after mycobacterial screening, ECG/QTc and medication/hearing review; repeat ECG at 1 month and assess response over at least 6 months. Discuss resistance and adverse effects. Off-label asthma use.",
      offLabel: true,
      sourceIds: ["gina", "severe"]
    },
    omalizumab: {
      id: "omalizumab",
      name: "Omalizumab (Xolair / Omlyclo biosimilar)",
      detail: "Anti-IgE add-on for moderate-to-severe persistent allergic asthma with positive skin testing or specific IgE to a perennial aeroallergen and inadequate control on ICS. Omlyclo (omalizumab-igec) is an FDA-designated interchangeable biosimilar with the same asthma dosing table. Adult/adolescent dosing must use pretreatment total IgE (IU/mL), weight (kg), and an actual supported Table 1 cell; the IgE 30-700 and weight 30-150 ranges alone are insufficient. Adult supported doses are 150-375 mg SC every 2 or 4 weeks. Do not use treatment-elevated IgE or substitute food-allergy/CRSwNP dosing tables. Re-test IgE after interruption of at least 1 year. Boxed anaphylaxis warning: initiate in a healthcare setting with appropriate observation; assess suitability before self-administration. Confirm current control, treatment optimization, and payer criteria; biologics are not acute rescue treatment.",
      noteDetail: "If selected, omalizumab (Xolair or Omlyclo) SC every 2 or 4 weeks at the supported adult asthma-table dose based on pretreatment IgE and weight. Confirm perennial aeroallergen sensitization and dosing eligibility; initiate with anaphylaxis precautions and observation.",
      offLabel: false,
      sourceIds: ["severe", "omalizumab", "omlyclo"]
    },
    mepolizumab: {
      id: "mepolizumab",
      name: "Mepolizumab (Nucala)",
      detail: "Anti-IL5 add-on for severe eosinophilic asthma: adults receive 100 mg SC every 4 weeks, without a loading dose. Higher blood eosinophils and exacerbation history support phenotype fit; numeric biomarker/exacerbation eligibility depends on clinical context and payer criteria. The adult CRSwNP and eosinophilic COPD doses are also 100 mg every 4 weeks, but confirmed EGPA or qualifying HES uses 300 mg every 4 weeks; suspected EGPA is not an established indication. Treat pre-existing helminth infection, review hypersensitivity and herpes-zoster risk, and consider indicated zoster vaccination. Continue ICS-containing therapy and taper OCS only under supervision; not for acute relief.",
      noteDetail: "If selected for severe eosinophilic asthma, mepolizumab 100 mg SC every 4 weeks. Confirm eligibility and review response after about 4 months; continue ICS-containing therapy and supervise any OCS reduction.",
      offLabel: false,
      sourceIds: ["severe", "mepolizumab"]
    },
    benralizumab: {
      id: "benralizumab",
      name: "Benralizumab (Fasenra)",
      detail: "Anti-IL5 receptor add-on for severe eosinophilic asthma: adults receive 30 mg SC every 4 weeks for the first 3 doses, then every 8 weeks. May fit an eosinophilic/exacerbation-prone or OCS-dependent phenotype; the less frequent maintenance interval may be useful but does not establish superiority over other eligible agents. Confirm treatment optimization and payer criteria. For confirmed adult EGPA or qualifying HES, the dose remains 30 mg every 4 weeks, not every 8 weeks; investigate suspected disease before applying those regimens. Review hypersensitivity and helminth infection. Continue ICS-containing therapy and supervise OCS tapering; not for acute relief.",
      noteDetail: "If selected for severe eosinophilic asthma, benralizumab 30 mg SC every 4 weeks for 3 doses, then every 8 weeks. Confirm eligibility and review response after about 4 months; continue ICS-containing therapy and supervise any OCS reduction.",
      offLabel: false,
      sourceIds: ["severe", "benralizumab"]
    },
    reslizumab: {
      id: "reslizumab",
      name: "Reslizumab (Cinqair)",
      detail: "Anti-IL5 add-on for adults aged 18 years or older with severe eosinophilic asthma: 3 mg/kg IV every 4 weeks, infused over 20-50 minutes; no loading dose or IV bolus. May be considered when an IV, weight-based option is appropriate. Pivotal exacerbation trials required eosinophils at least 400 cells/mcL; this trial threshold is not a universal FDA numerical eligibility rule. Confirm local coverage criteria. Boxed anaphylaxis warning requires administration and post-infusion observation by staff prepared to treat anaphylaxis. Review helminth infection and the malignancy warning. It is not approved for EGPA, HES, other eosinophilic conditions, or acute asthma relief.",
      noteDetail: "If selected for severe eosinophilic asthma, reslizumab 3 mg/kg IV every 4 weeks over 20-50 minutes, with anaphylaxis precautions and post-infusion observation. Confirm eligibility and review response after about 4 months.",
      offLabel: false,
      sourceIds: ["severe", "reslizumab"]
    },
    dupilumab: {
      id: "dupilumab",
      name: "Dupilumab (Dupixent)",
      detail: "Anti-IL4 receptor add-on for moderate-to-severe eosinophilic or OCS-dependent asthma: adults receive a 400 mg SC loading dose followed by 200 mg every 2 weeks, or 600 mg loading followed by 300 mg every 2 weeks. Use the 600/300 regimen for OCS-dependent asthma or concomitant moderate-to-severe atopic dermatitis, CRSwNP, or allergic fungal rhinosinusitis with a history of sino-nasal surgery. Elevated FeNO/eosinophils and relevant comorbidities can support selection; do not automatically apply the asthma schedule to other indications (adult EoE at weight at least 40 kg uses 300 mg weekly). GINA's detailed guidance advises against baseline/historic eosinophils >1500 cells/mcL because evidence is limited; this is not an FDA absolute contraindication. Separately investigate hypereosinophilia at or above 1500. Assess suspected EGPA/eosinophilic pneumonia and consider withholding treatment. Review eye symptoms, hypersensitivity and helminth infection; avoid abrupt steroid withdrawal. Not for acute relief.",
      noteDetail: "If selected, dupilumab 400 mg SC loading then 200 mg every 2 weeks, or 600 mg loading then 300 mg every 2 weeks; use 600/300 for OCS-dependent asthma or qualifying AD/CRSwNP/AFRS. Review eosinophilia/EGPA risk and supervise steroid reduction.",
      offLabel: false,
      sourceIds: ["severe", "dupilumab"]
    },
    tezepelumab: {
      id: "tezepelumab",
      name: "Tezepelumab (Tezspire)",
      detail: "Anti-TSLP add-on for severe asthma: 210 mg SC every 4 weeks, without a loading dose. The U.S. asthma indication does not require an allergic or eosinophilic phenotype; it may be an option when Type 2 markers are low or other agents do not fit. Higher eosinophils/FeNO generally predict greater response, and clinical optimization and payer requirements still apply. Also approved for inadequately controlled CRSwNP at the same 210 mg every 4 weeks dose. Do not promise OCS-sparing benefit for every phenotype. Review hypersensitivity and helminth infection; avoid live attenuated vaccines and abrupt steroid withdrawal. The prefilled pen may permit trained self-administration when appropriate. Not for acute relief.",
      noteDetail: "If selected for severe asthma, tezepelumab 210 mg SC every 4 weeks. Confirm eligibility, review response after about 4 months, and continue ICS-containing therapy with supervised steroid reduction when appropriate.",
      offLabel: false,
      sourceIds: ["severe", "tezepelumab"]
    },
    depemokimab: {
      id: "depemokimab",
      name: "Depemokimab (Exdensur)",
      detail: "Long-acting anti-IL5 add-on for severe eosinophilic asthma, age 12 years or older: 100 mg SC once every 6 months, without a loading dose, administered by a healthcare provider. May suit an eligible eosinophilic phenotype when the dosing interval is important; do not assume superiority or automatically switch a patient responding to another biologic. GINA suggests an initial response trial of at least 6 months. The current U.S. label does not include CRSwNP, EGPA, or HES. Review hypersensitivity, helminth infection and pregnancy considerations, including potentially prolonged fetal/infant exposure. Continue ICS-containing treatment and supervise any OCS reduction; not for acute relief.",
      noteDetail: "If selected for severe eosinophilic asthma, depemokimab 100 mg SC every 6 months, administered by a healthcare provider. Confirm eligibility and assess initial response after at least 6 months; continue ICS-containing therapy and supervise any OCS reduction.",
      offLabel: false,
      sourceIds: ["severe", "depemokimab"]
    }
  };

  const BIOLOGIC_CONSIDERATIONS = {
    omalizumab: {
      typicalCriteria: "Allergic asthma with confirmed perennial sensitization, inadequate control on ICS-containing treatment, and a supported pretreatment IgE/weight dosing-table cell. Severe-asthma treatment review and local coverage criteria apply.",
      benefits: "Established allergic-asthma option with an interchangeable biosimilar. May also address qualifying nasal polyposis or IgE-mediated food allergy using their own indication-specific dosing.",
      limitations: "Every 2 or 4 weeks with weight/IgE-dependent dosing. Boxed anaphylaxis warning and initial observation requirements. Allergic symptoms alone do not establish sensitization or a valid dose."
    },
    mepolizumab: {
      typicalCriteria: "Severe eosinophilic asthma with exacerbations despite optimized therapy. Common eligibility thresholds include eosinophils at least 150 currently or 300 historically, but payer and product requirements vary.",
      benefits: "Eosinophilic exacerbation reduction and OCS-sparing evidence. May suit confirmed EGPA, qualifying HES, or nasal polyposis with indication-specific dosing. Self-administration may be suitable.",
      limitations: "Every 4 weeks. Review hypersensitivity, helminth infection, and herpes-zoster risk. The asthma dose must not be substituted for an EGPA or HES regimen."
    },
    benralizumab: {
      typicalCriteria: "Severe eosinophilic asthma with exacerbations or steroid dependence despite optimized therapy. Eosinophil thresholds vary by payer; larger counts and exacerbation burden generally favor response.",
      benefits: "OCS-sparing evidence and every 8 week asthma maintenance after the first 3 monthly doses. Confirmed EGPA may favor an agent with that indication, using its separate schedule.",
      limitations: "Initial loading visits and continued ICS treatment are required. EGPA uses every 4 week dosing, not the asthma maintenance interval. Review hypersensitivity and helminth infection; less frequent dosing does not establish superior efficacy."
    },
    depemokimab: {
      typicalCriteria: "Severe eosinophilic asthma despite optimized therapy. Trials used eosinophils at least 150 currently or 300 in the prior year plus exacerbation history; these are trial signals, not universal insurer rules.",
      benefits: "Healthcare-professional-administered 100 mg SC every 6 months may reduce visit and dosing burden for a suitable eosinophilic phenotype.",
      limitations: "Administration requires a healthcare professional and initial response assessment takes at least 6 months. Pregnancy data are limited. The current U.S. label does not include EGPA, HES, or nasal polyposis."
    },
    reslizumab: {
      typicalCriteria: "Adult severe eosinophilic asthma despite optimized therapy. Exacerbation trials generally used eosinophils at least 400. Verify weight for 3 mg/kg dosing and local coverage criteria.",
      benefits: "Weight-based IV dosing may suit an eligible patient who prefers or requires supervised infusion treatment.",
      limitations: "Monthly infusion, verified weight, and post-infusion observation. Boxed anaphylaxis warning and malignancy warning. No U.S. EGPA indication."
    },
    dupilumab: {
      typicalCriteria: "Moderate-to-severe eosinophilic or OCS-dependent asthma. Common phenotype signals include eosinophils at least 150 or FeNO at least 25. GINA cautions against routine selection above 1500 eosinophils; evaluate suspected EGPA first.",
      benefits: "OCS-sparing evidence. Elevated FeNO, qualifying atopic dermatitis, or nasal polyposis may favor this option. Self-administration may be suitable.",
      limitations: "Every 2 week injections. Review eye symptoms, transient eosinophilia, eosinophilic complications, and helminth infection. Not an EGPA treatment choice; use indication-specific dosing for comorbid conditions."
    },
    tezepelumab: {
      typicalCriteria: "Severe asthma with exacerbations despite optimized treatment. No minimum Type 2 biomarker threshold is required by the U.S. asthma indication; payer criteria still apply.",
      benefits: "An option when eosinophils or FeNO are low or other phenotype-matched agents are unsuitable. Also has a U.S. nasal-polyposis indication. Higher Type 2 markers generally predict larger asthma benefits.",
      limitations: "Every 4 weeks. Do not promise OCS-sparing benefit for every phenotype. Review hypersensitivity, helminth infection, live-vaccine precautions, and supervised steroid reduction."
    }
  };

  // Concise schedules shared by the retrospective note and the full prescribing references.
  const NOTE_SCHEDULES = {
    air: "Budesonide-formoterol 160/4.5 mcg, 1 inhalation as needed for symptoms or before exercise; maximum 12 total inhalations/day. Guideline-supported AIR use is off-label in the U.S.",
    smartLow: "Budesonide-formoterol 160/4.5 mcg, 1 inhalation twice daily plus 1 as needed; maximum 12 total maintenance/reliever inhalations/day. U.S. SMART use is off-label.",
    smartMedium: "Budesonide-formoterol 160/4.5 mcg, 2 inhalations twice daily plus 1 as needed; maximum 12 total maintenance/reliever inhalations/day. U.S. reliever use is off-label.",
    highDose: "Fluticasone propionate/salmeterol 500/50 mcg, 1 inhalation twice daily, maximum 2/day, with a separate albuterol or albuterol-budesonide reliever; not ICS-formoterol relief with salmeterol. A higher-ICS trial would be monitored over 3-6 months and reduced if there were no meaningful benefit.",
    airsupra: "Albuterol-budesonide 90/80 mcg, 2 inhalations as needed; maximum 6 doses or 12 inhalations/day, with the indicated maintenance controller.",
    tiotropium: "Tiotropium Respimat 1.25 mcg/actuation, 2 inhalations once daily (2.5 mcg/day), without duplicate LAMA treatment; not for acute relief.",
    azithromycin: "A studied off-label regimen was azithromycin 500 mg orally 3 times weekly, after mycobacterial screening, ECG/QTc and medication/hearing review; repeat ECG at 1 month and response assessment over at least 6 months were recommended.",
    omalizumab: "Omalizumab dosing would follow the supported adult asthma-table cell using pretreatment IgE and verified weight, with perennial aeroallergen sensitization and anaphylaxis precautions confirmed before prescribing.",
    mepolizumab: "Mepolizumab 100 mg SC every 4 weeks for severe eosinophilic asthma, with continued ICS-containing therapy and supervised OCS reduction when appropriate.",
    benralizumab: "Benralizumab 30 mg SC every 4 weeks for the first 3 doses, then every 8 weeks for severe eosinophilic asthma.",
    reslizumab: "Reslizumab 3 mg/kg IV every 4 weeks over 20-50 minutes, with anaphylaxis precautions and post-infusion observation.",
    dupilumab: "Dupilumab 400 mg SC loading dose followed by 200 mg every 2 weeks, or 600 mg loading followed by 300 mg every 2 weeks for qualifying OCS dependence or comorbidity.",
    tezepelumab: "Tezepelumab 210 mg SC every 4 weeks, with continued ICS-containing therapy and supervised steroid reduction when appropriate.",
    depemokimab: "Depemokimab 100 mg SC every 6 months, administered by a healthcare professional, with initial response assessment after at least 6 months."
  };
  Object.entries(NOTE_SCHEDULES).forEach(([id, schedule]) => { MEDICATIONS[id].noteSchedule = schedule; });

  // U.S. asthma Table 1 (age >=12): intervals are cell-specific, including within a row.
  // IgE upper bounds: 100, 200, 300, 400, 500, 600, 700 IU/mL.
  // Weight upper bounds: 60, 70, 90, 150 kg. Null cells have no recommended dose.
  const OMALIZUMAB_TABLE = [
    [[150, 4], [150, 4], [150, 4], [300, 4]],
    [[300, 4], [300, 4], [300, 4], [225, 2]],
    [[300, 4], [225, 2], [225, 2], [300, 2]],
    [[225, 2], [225, 2], [300, 2], null],
    [[300, 2], [300, 2], [375, 2], null],
    [[300, 2], [375, 2], null, null],
    [[375, 2], null, null, null]
  ];

  function getOmalizumabDose(ige, weight) {
    // Accept decimal form strings, including exponents; reject hex and coercible objects.
    const numericInput = (value) => (
      typeof value === "number" || (typeof value === "string"
        && /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim()))
    );
    if (!numericInput(ige) || !numericInput(weight)) return null;

    const totalIge = Number(ige);
    const weightKg = Number(weight);
    if (!Number.isFinite(totalIge) || !Number.isFinite(weightKg)
      || totalIge < 30 || totalIge > 700 || weightKg < 30 || weightKg > 150) return null;

    const row = [100, 200, 300, 400, 500, 600, 700].findIndex((upper) => totalIge <= upper);
    const column = [60, 70, 90, 150].findIndex((upper) => weightKg <= upper);
    const cell = OMALIZUMAB_TABLE[row][column];
    return cell ? { doseMg: cell[0], intervalWeeks: cell[1] } : null;
  }

  return { REVIEW_DATE, SOURCES, MEDICATIONS, BIOLOGIC_CONSIDERATIONS, getOmalizumabDose };
});
