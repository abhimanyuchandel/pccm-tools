const test = require("node:test");
const assert = require("node:assert/strict");
const L = require("./logic.js");
const N = require("./notes.js");
const M = require("./medications.js");
const W = require("./workflow.js");

// Synthetic encounters only. Expectations and clinical sources are recorded in SCENARIO_AUDIT.md.
const base = patch => ({ ...L.createEmptyState(), age: 65, gender: "female", encounter: "routine", managementPhase: "followup", redFlags: false,
  diagnosisContext: "established", historicalObstruction: true, currentRegimen: "laba-lama", reliever: "albuterol", addonContext: "none",
  asthma: "no", catScore: 14, mmrcScore: 2, moderateExac: 0, severeExac: 0, persistentDyspnea: false, smokingStatus: "former", ...patch });
const bio = patch => base({ currentRegimen: "triple", moderateExac: 2, eosinophils: 320, chronicBronchitis: true,
  biologicReview: true, helminthReview: "no-concern", ...patch });
const acute = patch => base({ encounter: "active", acuteProgression: "stable", acuteMentalStatus: "baseline", respiratoryRate: 20,
  heartRate: 90, acuteSpo2: 94, acuteOxygen: "roomair", acuteDyspnea: true, acuteSputumVolume: false, acutePurulence: false,
  mimicConcern: false, outpatientAppropriate: true, outpatientSupport: true, ...patch });
const group = (r, id) => r.groups.find(g => g.id === id);
const option = (r, id, value) => group(r, id)?.options.find(o => o.id === value);
const allowed = (r, id, value) => Boolean(option(r, id, value) && !option(r, id, value).blockers.length);
let generatedEncounters = 0;
const generate = (d, selection = {}) => {
  generatedEncounters++;
  const r = L.buildRecommendation(d, selection), text = N.buildNoteText(r);
  assert.equal(r.invalid, false);
  assert.match(text, /^Subjective\n[\s\S]+\n\nObjective\n[\s\S]+\n\nAssessment\n[\s\S]+\n\nPlan\n/);
  assert.doesNotMatch(text, /\b(?:undefined|NaN|Infinity)\b|Examination: normal|vaccines were administered|counseling was completed|consent was obtained/i);
  for (const a of r.actions) assert.ok(text.includes(a.text), `The copied note lost the shared action ${a.id}`);
  for (const id of r.medications) assert.ok(M.MEDICATIONS[id]);
  return { r, text, plan: text.split("\n\nPlan\n")[1], ids: r.actions.map(a => a.id) };
};

const scenarios = [
  ["initial low burden and no exacerbations offers bronchodilator monotherapy", () => {
    const { r } = generate(base({ currentRegimen: "naive", managementPhase: "initial", catScore: 9, mmrcScore: 1 }));
    assert.equal(r.group, "A"); assert.ok(allowed(r, "controller", "lama")); assert.ok(allowed(r, "controller", "laba"));
    assert.equal(option(r, "controller", "triple"), undefined);
  }],
  ["initial symptomatic COPD offers dual bronchodilation without routine ICS", () => {
    const { r, plan } = generate(base({ currentRegimen: "naive", managementPhase: "initial" }), { controller: "dual", product: "stiolto", rescue: "albuterol" });
    assert.equal(r.group, "B"); assert.match(plan, /Tiotropium\/olodaterol.*2 inhalations once daily/);
    assert.doesNotMatch(plan, /fluticasone|Budesonide|SMART/);
  }],
  ["one moderate event is initial Group E in GOLD 2026, even with low symptoms", () => {
    const { r } = generate(base({ currentRegimen: "naive", managementPhase: "initial", catScore: 5, mmrcScore: 0, moderateExac: 1, eosinophils: 300 }));
    assert.equal(r.group, "E"); assert.ok(allowed(r, "controller", "triple"));
  }],
  ["zero plus an unknown count cannot establish initial Group A or B", () => {
    const { r, text } = generate(base({ currentRegimen: "naive", managementPhase: "initial", severeExac: null }));
    assert.equal(r.group, null); assert.doesNotMatch(text, /No treated exacerbations/);
  }],
  ["maintenance treatment overrides initial mode without copying the interface assumption", () => {
    const { r, text } = generate(base({ managementPhase: "initial" }));
    assert.equal(r.findings.therapy.phase, "followup");
    assert.ok(r.cautions.some(s => /follow-up management logic/.test(s)));
    assert.doesNotMatch(text, /follow-up management logic/);
  }],
  ["known obstruction is not inferred from a rounded ratio of 0.70", () => {
    const { r, text } = generate(base({ diagnosisContext: "suspected", historicalObstruction: null, fev1fvc: 70 }));
    assert.equal(r.findings.diagnosis.supported, false); assert.match(text, /diagnostic clarification/);
    assert.equal(allowed(r, "controller", "dual"), false);
  }],
  ["an established diagnosis with unavailable original spirometry prompts reconciliation", () => {
    const { r, ids } = generate(base({ historicalObstruction: null }));
    assert.equal(r.findings.diagnosis.supported, true); assert.ok(ids.includes("diagnostic"));
  }],
  ["nonobstructive current spirometry does not acquire an obstruction grade from low FEV1 alone", () => {
    const { r, ids, text } = generate(base({ fev1fvc: 0.75, fev1Predicted: 45 }));
    assert.equal(r.findings.diagnosis.supported, true); assert.equal(r.findings.diagnosis.grade, null);
    assert.ok(ids.includes("discordant-spirometry")); assert.doesNotMatch(text, /corresponded to GOLD airflow obstruction grade/);
    assert.equal(generate(base({ fev1fvc: 0.69, fev1Predicted: 45 })).r.findings.diagnosis.grade, 3);
  }],
  ["unknown existing maintenance agents do not permit a new overlapping prescription", () => {
    for (const currentRegimen of ["unknown", "other"]) {
      const { r, plan } = generate(base({ currentRegimen }), { controller: "dual", product: "stiolto" });
      assert.notEqual(r.selections.controller, "dual"); assert.notEqual(r.selections.product, "stiolto");
      assert.doesNotMatch(plan, /Use Tiotropium\/olodaterol/);
    }
  }],
  ["exacerbations on monotherapy with eosinophils 300 offer triple treatment", () => {
    for (const currentRegimen of ["lama", "laba"]) {
      const { r } = generate(base({ currentRegimen, moderateExac: 1, eosinophils: 300 }));
      assert.ok(allowed(r, "controller", "triple"), currentRegimen);
    }
  }],
  ["exacerbations on monotherapy below 300 retain the dual-bronchodilator route", () => {
    const { r } = generate(base({ currentRegimen: "lama", moderateExac: 1, eosinophils: 299 }));
    assert.ok(allowed(r, "controller", "dual")); assert.equal(option(r, "controller", "triple"), undefined);
  }],
  ["ICS/LABA exacerbations below 100 favor LABA/LAMA when asthma is absent", () => {
    const { r, plan } = generate(base({ currentRegimen: "ics-laba", moderateExac: 1, eosinophils: 99 }), { controller: "dual", product: "stiolto" });
    assert.equal(r.selections.controller, "dual"); assert.match(plan, /Tiotropium\/olodaterol/);
    assert.equal(allowed(r, "controller", "triple"), false);
  }],
  ["ICS/LABA exacerbations at 100 offer triple treatment", () => {
    const { r } = generate(base({ currentRegimen: "ics-laba", moderateExac: 1, eosinophils: 100 }));
    assert.ok(allowed(r, "controller", "triple"));
  }],
  ["unknown eosinophils on ICS/LABA do not automatically justify triple escalation", () => {
    const { r, plan } = generate(base({ currentRegimen: "ics-laba", moderateExac: 1, eosinophils: null }), { controller: "triple", product: "trelegy" });
    assert.notEqual(r.selections.controller, "triple"); assert.doesNotMatch(plan, /Use Fluticasone/);
    assert.ok(r.actions.some(a => /eosinophil/i.test(a.text) && a.kind === "testing"));
  }],
  ["known coexisting asthma retains ICS despite low current eosinophils", () => {
    const { r } = generate(base({ currentRegimen: "ics-laba", moderateExac: 1, eosinophils: 50, asthma: "confirmed" }), { controller: "dual" });
    assert.notEqual(r.selections.controller, "dual"); assert.ok(allowed(r, "controller", "triple"));
  }],
  ["historically high eosinophils require review before a low-current-count ICS removal", () => {
    const { r } = generate(base({ currentRegimen: "ics-laba", moderateExac: 1, eosinophils: 50, historicalEosinophils: 400 }), { controller: "dual" });
    assert.notEqual(r.selections.controller, "dual"); assert.ok(r.actions.some(a => /eosinophil/i.test(a.text)));
  }],
  ["persistent symptoms with prior ICS benefit can retain ICS and add a LAMA", () => {
    const { r } = generate(base({ currentRegimen: "ics-laba", persistentDyspnea: true, priorIcsBenefit: true, eosinophils: 180 }));
    assert.ok(allowed(r, "controller", "triple"));
    assert.equal(allowed(r, "controller", "dual"), false);
  }],
  ["persistent symptoms without prior ICS benefit can switch to dual bronchodilation", () => {
    const { r } = generate(base({ currentRegimen: "ics-laba", persistentDyspnea: true, priorIcsBenefit: false, eosinophils: 80 }));
    assert.ok(allowed(r, "controller", "dual"));
  }],
  ["unassessed prior ICS benefit is not documented as absent", () => {
    const { r, text } = generate(base({ currentRegimen: "ics-laba", persistentDyspnea: true, priorIcsBenefit: null }));
    assert.equal(allowed(r, "controller", "dual"), false);
    assert.doesNotMatch(text, /ICS provided no benefit/);
  }],
  ["effective stable ICS/LABA is not automatically switched to triple or stripped of ICS", () => {
    const { r, plan } = generate(base({ currentRegimen: "ics-laba", catScore: 7, mmrcScore: 1 }), { controller: "continue", product: "breo" });
    assert.equal(r.selections.controller, "continue"); assert.match(plan, /100\/25/);
    assert.equal(option(r, "controller", "triple"), undefined);
  }],
  ["technique and device concerns stop routine escalation but retain known exacerbation risk", () => {
    const { r } = generate(base({ moderateExac: 1, eosinophils: 300, deviceConcern: true }), { controller: "triple", product: "trelegy" });
    assert.equal(r.findings.risk.high, true); assert.notEqual(r.selections.controller, "triple");
    assert.equal(r.selections.product, undefined);
  }],
  ["pneumonia with low eosinophils can support selected monitored ICS withdrawal", () => {
    const { r, plan } = generate(base({ currentRegimen: "triple", recurrentPneumonia: true, eosinophils: 80 }), { controller: "withdraw", product: "anoro" });
    assert.equal(r.selections.controller, "withdraw"); assert.match(plan, /Withdraw the previous ICS/); assert.match(plan, /Monitor|monitor/);
  }],
  ["ICS withdrawal does not bypass asthma or high-eosinophil safeguards", () => {
    for (const patch of [{ asthma: "confirmed" }, { eosinophils: 300 }, { historicalEosinophils: 300 }, { severeExac: null }]) {
      const { r } = generate(base({ currentRegimen: "triple", recurrentPneumonia: true, eosinophils: 80, ...patch }), { controller: "withdraw" });
      assert.notEqual(r.selections.controller, "withdraw");
    }
  }],
  ["new LAMA treatment does not automatically continue routine ipratropium rescue", () => {
    const { r, plan } = generate(base({ currentRegimen: "laba", reliever: "duoneb", persistentDyspnea: true }), { controller: "dual", product: "stiolto", rescue: "continue" });
    assert.equal(r.selections.controller, "dual"); assert.notEqual(r.selections.rescue, "continue");
    assert.doesNotMatch(plan, /Continue the current short-acting rescue/);
    const unchanged = generate(base({ reliever: "duoneb" }), { controller: "clarify", rescue: "continue" });
    assert.notEqual(unchanged.r.selections.rescue, "continue");
  }],
  ["a newly selected add-on receives early efficacy and adverse-effect review", () => {
    const { r, plan } = generate(base({ persistentDyspnea: true, ensifentrineSafety: true, ensifentrineDevice: true }), { controller: "continue", addon: "ensifentrine" });
    assert.equal(r.selections.addon, "ensifentrine"); assert.match(plan, /4-6 weeks/); assert.doesNotMatch(plan, /3-6 months/);
  }],
  ["roflumilast requires the low-FEV1 bronchitic exacerbation profile and its own safety review", () => {
    const d = base({ fev1Predicted: 49, chronicBronchitis: true, moderateExac: 1, roflumilastLiver: false, roflumilastWeightConcern: false, roflumilastSafety: true });
    const { r, plan } = generate(d, { addon: "roflumilast" });
    assert.equal(r.selections.addon, "roflumilast"); assert.match(plan, /500 mcg/);
    assert.equal(option(generate({ ...d, fev1Predicted: 50 }).r, "addon", "roflumilast"), undefined);
  }],
  ["roflumilast liver or weight concerns prevent a default prescription", () => {
    for (const patch of [{ roflumilastLiver: true }, { roflumilastWeightConcern: true }, { roflumilastSafety: null }]) {
      const { r } = generate(base({ fev1Predicted: 40, chronicBronchitis: true, moderateExac: 1, roflumilastLiver: false, roflumilastWeightConcern: false, roflumilastSafety: true, ...patch }), { addon: "roflumilast" });
      assert.notEqual(r.selections.addon, "roflumilast");
    }
  }],
  ["maintenance macrolide is not a default option for current smokers", () => {
    const { r } = generate(base({ moderateExac: 1, smokingStatus: "current" }));
    assert.equal(option(r, "addon", "azithromycin"), undefined);
  }],
  ["an unassessed QT or infection review prevents a definite maintenance azithromycin plan", () => {
    const { r } = generate(base({ moderateExac: 1, azithromycinQtSafety: null, azithromycinHearingLiverSafety: true, azithromycinInfectionReview: true }), { addon: "azithromycin" });
    assert.notEqual(r.selections.addon, "azithromycin");
  }],
  ["reviewed eosinophilic bronchitic COPD permits the COPD dupilumab dose without asthma loading", () => {
    const { r, plan } = generate(bio({}), { controller: "continue", addon: "dupilumab" });
    assert.equal(r.selections.addon, "dupilumab"); assert.match(plan, /300 mg.*every 2 weeks/);
    assert.doesNotMatch(plan, /600 mg|loading dose/);
  }],
  ["lower-eosinophil mepolizumab review is not mislabeled as the higher-threshold GOLD trial profile", () => {
    const { r, plan } = generate(bio({ eosinophils: 150, chronicBronchitis: false }), { addon: "mepolizumab" });
    assert.equal(option(r, "addon", "dupilumab"), undefined); assert.match(plan, /100 mg.*every 4 weeks/);
    assert.match(r.addonCandidates.find(c => c.id === "mepolizumab").why, /MATINEE.*METREX/);
  }],
  ["unknown or pending helminth review prevents automatic biologic initiation", () => {
    for (const helminthReview of ["unknown", "pending"]) {
      const { r, plan } = generate(bio({ helminthReview }), { addon: "dupilumab" });
      assert.notEqual(r.selections.addon, "dupilumab"); assert.doesNotMatch(plan, /Start Dupilumab/);
    }
  }],
  ["an existing biologic cannot be duplicated by a new selected agent", () => {
    const { r, plan } = generate(bio({ currentBiologic: "mepolizumab", addonContext: "yes" }), { addon: "dupilumab" });
    assert.notEqual(r.selections.addon, "dupilumab"); assert.doesNotMatch(plan, /Start Dupilumab/);
  }],
  ["one moderate exacerbation alone does not satisfy recurrent-event biologic review", () => {
    const { r } = generate(bio({ moderateExac: 1 }));
    assert.equal(option(r, "addon", "dupilumab"), undefined);
  }],
  ["a current smoker can select renal-adjusted varenicline", () => {
    const { plan } = generate(base({ smokingStatus: "current", cessationSafety: true, renalStatus: "severe" }), { cessation: "varenicline" });
    assert.match(plan, /at most 0.5 mg twice daily/); assert.doesNotMatch(plan, /then 1 mg twice daily/);
  }],
  ["bupropion contraindication keeps the note from prescribing bupropion", () => {
    const { r, plan } = generate(base({ smokingStatus: "current", cessationSafety: true, renalStatus: "normal", bupropionContra: true }), { cessation: "bupropion" });
    assert.notEqual(r.selections.cessation, "bupropion"); assert.doesNotMatch(plan, /Start bupropion/);
  }],
  ["unknown dependence data cannot supply a guessed nicotine-replacement dose", () => {
    const { r, plan } = generate(base({ smokingStatus: "current", cessationSafety: true }), { cessation: "nrt" });
    assert.notEqual(r.selections.cessation, "nrt"); assert.doesNotMatch(plan, /Start nicotine patch/);
  }],
  ["one-time AAT testing remains available regardless of smoking history", () => {
    const { ids, plan } = generate(base({ smokingStatus: "never", aatdStatus: "not-done" }));
    assert.ok(ids.includes("aat")); assert.match(plan, /alpha-1 antitrypsin.*S\/Z genotyping/);
  }],
  ["known AAT deficiency prompts family and liver review, not automatic augmentation", () => {
    const { plan } = generate(base({ aatdStatus: "known-aatd" }));
    assert.match(plan, /family-testing and liver-care/); assert.doesNotMatch(plan, /Start.*augmentation/);
  }],
  ["screening retains NCCN age/exposure eligibility despite remote quitting", () => {
    const { ids, plan } = generate(base({ age: 85, packYears: 20, yearsSinceQuit: 35, screeningContext: "screening", curativeBenefit: true, ldctStatus: "due" }));
    assert.ok(ids.includes("ldct")); assert.match(plan, /annual screening low-dose/); assert.doesNotMatch(plan, /Screening reference:/);
  }],
  ["concerning cancer symptoms use a diagnostic rather than screening pathway", () => {
    const { ids } = generate(base({ packYears: 40, screeningContext: "symptoms", curativeBenefit: true, ldctStatus: "due" }));
    assert.ok(ids.includes("lung-diagnostic")); assert.equal(ids.includes("ldct"), false);
  }],
  ["screening stops without curative-treatment benefit and never substitutes for nodule surveillance", () => {
    const { ids } = generate(base({ packYears: 40, screeningContext: "screening", curativeBenefit: false, ldctStatus: "due" }));
    assert.ok(ids.includes("ldct-stop"));
    assert.ok(generate(base({ screeningContext: "surveillance" })).ids.includes("lung-surveillance"));
  }],
  ["unknown vaccines prompt record reconciliation rather than administration or invented gaps", () => {
    const { plan } = generate(base({})); assert.match(plan, /Reconcile vaccination records/);
    assert.doesNotMatch(plan, /vaccination completed|was vaccinated|vaccines administered/i);
  }],
  ["due pneumococcal vaccine copies only the selected product and respects completed RSV", () => {
    const { r, plan, ids } = generate(base({ pneumococcalStatus: "due", rsvStatus: "complete" }), { pneumococcalPlan: "pcv20" });
    assert.equal(r.selections.pneumococcalPlan, "pcv20"); assert.match(plan, /Recommend PCV20/);
    assert.doesNotMatch(plan, /Recommend PCV21|Recommend PCV15/); assert.equal(ids.includes("vaccine-rsv"), false);
  }],
  ["rehabilitation can use an appropriate remote program", () => {
    const { plan } = generate(base({ rehabPreference: "remote" })); assert.match(plan, /Refer to an appropriate remote pulmonary rehabilitation/);
  }],
  ["stable severe resting hypoxemia opens LTOT assessment, not a guessed flow prescription", () => {
    const { ids, plan } = generate(base({ restingSpo2: 88, oxygenConditions: "roomair" }));
    assert.ok(ids.includes("ltot")); assert.doesNotMatch(plan, /Start oxygen.*[1-9].*L\/min/);
  }],
  ["oxygen conditions distinguish stable resting, exertional, and moderate desaturation", () => {
    assert.equal(generate(base({ restingSpo2: 88, oxygenConditions: "oxygen" })).ids.includes("ltot"), false);
    assert.equal(generate(base({ restingSpo2: 90, oxygenConditions: "roomair" })).ids.includes("ltot"), false);
    const { ids } = generate(base({ exertionalSpo2: 87, exertionalRoomAir: true, restingSpo2: 95 }));
    assert.ok(ids.includes("ambulatory-o2")); assert.equal(ids.includes("ltot"), false);
  }],
  ["home NIV review uses stable arterial hypercapnia and preserves post-acute timing", () => {
    const { plan } = generate(base({ abgAvailable: true, paco2: 55, hypercapniaContext: "acute" }));
    assert.match(plan, /Reassess arterial hypercapnia 2-4 weeks/); assert.doesNotMatch(plan, /Start home NIV/);
    assert.equal(generate(base({ abgAvailable: false, paco2: 55 })).ids.includes("niv"), false);
  }],
  ["complete BODE referral signal is not lost when FEV1 and symptom screens are less extreme", () => {
    const { r } = generate(base({ fev1Predicted: 55, mmrcScore: 2, bmi: 20, walkDistance: 120, advancedInterest: "screen" }), { transplant: "discuss" });
    assert.equal(r.findings.advanced.bode, 6); assert.ok(group(r, "transplant")); assert.equal(r.selections.transplant, "discuss");
  }],
  ["stable arterial respiratory-failure signals open advanced review despite FEV1 above 50", () => {
    const { r } = generate(base({ fev1Predicted: 60, abgAvailable: true, abgRoomAir: true, pao2: 55, paco2: 55, hypercapniaContext: "stable" }));
    assert.ok(group(r, "transplant"));
  }],
  ["incomplete BODE components never produce a fabricated score", () => {
    const { r, text } = generate(base({ fev1Predicted: 30, mmrcScore: 3, bmi: 20, walkDistance: null }));
    assert.equal(r.findings.advanced.bode, null); assert.doesNotMatch(text, /BODE index:/);
  }],
  ["collateral ventilation limits valve choice but does not automatically exclude surgery", () => {
    const { r } = generate(base({ emphysema: true, rv: 180, collateralVentilation: "present" }), { lvr: "valve" });
    assert.notEqual(r.selections.lvr, "valve"); assert.ok(allowed(r, "lvr", "surgery"));
  }],
  ["parallel volume-reduction and transplant review does not declare eligibility", () => {
    const { r, plan } = generate(base({ emphysema: true, rv: 180, fev1Predicted: 24, progression: true }), { lvr: "refer", transplant: "refer" });
    assert.equal(r.selections.lvr, "refer"); assert.equal(r.selections.transplant, "refer");
    assert.match(plan, /does not establish listing eligibility/); assert.match(plan, /not a declaration of procedural eligibility/);
  }],
  ["active purulent exacerbation supports selected short-course therapy after outpatient safety review", () => {
    const { r, plan } = generate(acute({ acutePurulence: true, antibioticSafety: true, resistantOrganisms: false, bronchiectasis: false }), { acuteBronchodilator: "mdi", acuteSteroid: "burst", acuteAntibiotic: "doxy" });
    assert.equal(r.selections.acuteAntibiotic, "doxy"); assert.match(plan, /40 mg orally daily for 5 days/);
    assert.match(plan, /100 mg orally twice daily for 5 days/); assert.match(plan, /24-72 hours/);
    assert.doesNotMatch(plan, /Discharged home|Improved after treatment/);
  }],
  ["nonpurulent exacerbation does not routinely acquire antibiotics", () => {
    const { ids, plan } = generate(acute({ acutePurulence: false })); assert.ok(ids.includes("no-abx")); assert.doesNotMatch(plan, /Start doxycycline/);
  }],
  ["severe or unknown renal function prevents the fixed 875 mg amoxicillin-clavulanate dose", () => {
    for (const renalStatus of ["unknown", "severe", "dialysis"]) {
      const { r, plan } = generate(acute({ acutePurulence: true, antibioticSafety: true, resistantOrganisms: false, bronchiectasis: false, renalStatus }), { acuteAntibiotic: "amox" });
      assert.notEqual(r.selections.acuteAntibiotic, "amox"); assert.doesNotMatch(plan, /Start amoxicillin\/clavulanate 875/);
      assert.ok(allowed(r, "acuteAntibiotic", "culture"));
    }
  }],
  ["verified renal suitability permits the selected amoxicillin-clavulanate course", () => {
    const { r, plan } = generate(acute({ acutePurulence: true, antibioticSafety: true, resistantOrganisms: false, bronchiectasis: false, renalStatus: "normal" }), { acuteAntibiotic: "amox" });
    assert.equal(r.selections.acuteAntibiotic, "amox"); assert.match(plan, /875\/125 mg.*for 5 days/);
  }],
  ["maintenance OCS prevents a duplicate default prednisone burst", () => {
    const { r } = generate(acute({ maintenanceOcs: true, addonContext: "yes" }), { acuteSteroid: "burst" });
    assert.notEqual(r.selections.acuteSteroid, "burst"); assert.ok(allowed(r, "acuteSteroid", "individual"));
  }],
  ["missing acute observations block outpatient prescriptions and discharge reassurance", () => {
    const { r, plan } = generate(acute({ acuteSpo2: null }), { acuteSteroid: "burst" });
    assert.equal(r.findings.acute.outpatient, false); assert.notEqual(r.selections.acuteSteroid, "burst");
    assert.match(plan, /Missing observations.*do not establish/);
  }],
  ["known urgent observations remain in the note even after switching encounter context", () => {
    const { r, text } = generate(base({ respiratoryRate: 32 })); assert.equal(r.emergency, true);
    assert.match(text, /Respiratory rate: 32\/min/);
  }],
  ["recovery encounter uses recovery follow-up, not an active steroid or antibiotic course", () => {
    const { r, plan } = generate(base({ encounter: "recovery" }));
    assert.equal(group(r, "acuteSteroid"), undefined); assert.match(plan, /1-4 weeks/);
    assert.doesNotMatch(plan, /Start prednisone|Start doxycycline/);
  }]
];
for (const [name, run] of scenarios) test(`COPD encounter: ${name}`, run);

test("controller/eosinophil/event/asthma matrix respects the distinct treatment pathways", () => {
  for (const currentRegimen of ["lama", "laba", "laba-lama", "ics-laba", "triple"]) {
    for (const eosinophils of [null, 99, 100, 299, 300]) {
      for (const [moderateExac, severeExac] of [[null, 0], [0, 0], [1, 0], [null, 1]]) {
        for (const asthma of ["no", "confirmed"]) {
          const { r } = generate(base({ currentRegimen, eosinophils, moderateExac, severeExac, asthma }));
          if (asthma === "confirmed") assert.equal(allowed(r, "controller", "dual"), false);
          if (moderateExac === null && severeExac === 0) assert.equal(r.findings.risk.high, null);
          if ((moderateExac === 1 || severeExac === 1) && asthma === "no") {
            const triple = ["lama", "laba"].includes(currentRegimen) ? eosinophils !== null && eosinophils >= 300
              : ["laba-lama", "ics-laba"].includes(currentRegimen) ? eosinophils !== null && eosinophils >= 100 : false;
            assert.equal(allowed(r, "controller", "triple"), triple, JSON.stringify({ currentRegimen, eosinophils, moderateExac }));
          }
        }
      }
    }
  }
});

test("biologic phenotype and prerequisite matrix never initiates from a biomarker alone", () => {
  for (const moderateExac of [0, 1, 2]) for (const eosinophils of [null, 149, 150, 299, 300])
    for (const historicalEosinophils of [null, 300]) for (const chronicBronchitis of [false, true])
      for (const biologicReview of [false, true]) for (const helminthReview of ["pending", "no-concern"]) {
        const d = bio({ moderateExac, eosinophils, historicalEosinophils, chronicBronchitis, biologicReview, helminthReview });
        for (const addon of ["dupilumab", "mepolizumab"]) {
          const { r, plan } = generate(d, { controller: "continue", addon });
          const phenotype = addon === "dupilumab" ? eosinophils !== null && eosinophils >= 300 && chronicBronchitis
            : eosinophils !== null && eosinophils >= 150 || historicalEosinophils !== null && historicalEosinophils >= 300;
          const ready = moderateExac >= 2 && phenotype && biologicReview && helminthReview === "no-concern";
          assert.equal(r.selections.addon === addon, ready, JSON.stringify({ addon, moderateExac, eosinophils, historicalEosinophils, chronicBronchitis, biologicReview, helminthReview }));
          if (ready) {
            assert.match(plan, addon === "dupilumab" ? /300 mg.*every 2 weeks/ : /100 mg.*every 4 weeks/);
            assert.doesNotMatch(plan, /600 mg|loading dose/);
          } else assert.doesNotMatch(plan, /Start Dupilumab|Start Mepolizumab/);
        }
      }
});

test("all current COPD controller products supply matching selected prescriptions without asthma doses", () => {
  const products = Object.entries(M.MEDICATIONS).filter(([, m]) => ["lama", "laba", "laba-lama", "ics-laba", "triple"].includes(m.category));
  for (const [id, medication] of products) {
    const { r, plan, text } = generate(base({ currentRegimen: medication.category }), { controller: "continue", product: id, rescue: "albuterol" });
    assert.equal(r.selections.product, id); assert.ok(plan.includes(medication.dose));
    assert.doesNotMatch(plan, /SMART|200\/62.5\/25|160\/18\/4.8/);
    const subjective = text.split("\n\nObjective\n")[0]; assert.doesNotMatch(subjective, /Use |Start /);
  }
  assert.ok(products.length >= 15);
});

test("urgent-finding matrix suppresses routine prescriptions in every encounter context", () => {
  const findings = [{ redFlags: true }, { acuteMentalStatus: "altered" }, { acuteSpo2: 85 }, { postSpo2: 85 }, { restingSpo2: 85 },
    { respiratoryRate: 30 }, { heartRate: 130 }, { systolicBp: 89 }, { acuteProgression: "worsening" }, { acuteResponse: "worse" },
    { acutePh: 7.34, acutePaco2: 55 }, { abgAvailable: true, pao2: 40 }];
  for (const encounter of ["routine", "active", "recovery"]) for (const finding of findings) {
    const { r, plan } = generate(acute({ ...finding, encounter }), { controller: "triple", product: "trelegy", addon: "dupilumab", acuteSteroid: "burst", cessation: "varenicline" });
    assert.equal(r.emergency, true); assert.equal(r.groups.length, 0);
    assert.match(plan, /urgent emergency-level/); assert.doesNotMatch(plan, /Start prednisone|Start Dupilumab|Use Fluticasone|Start varenicline/);
  }
});

test("oxygen boundary and measurement-condition matrix does not invent an LTOT prescription", () => {
  for (const restingSpo2 of [87, 88, 89, 90, 92, 94]) for (const oxygenConditions of ["unknown", "oxygen", "roomair"]) for (const hypoxemiaComplication of [null, false, true]) {
    const { ids, plan } = generate(base({ restingSpo2, oxygenConditions, hypoxemiaComplication }));
    const indicated = oxygenConditions === "roomair" && (restingSpo2 <= 88 || restingSpo2 === 89 && hypoxemiaComplication === true);
    assert.equal(ids.includes("ltot"), indicated);
    assert.doesNotMatch(plan, /oxygen (?:at )?\d+ L\/min/i);
  }
});

test("screening-age/exposure/benefit matrix preserves the NCCN site policy", () => {
  for (const age of [49, 50, 85]) for (const packYears of [19, 20, 40]) for (const curativeBenefit of [null, false, true]) for (const screeningContext of ["screening", "symptoms", "surveillance"]) {
    const { ids } = generate(base({ age, packYears, curativeBenefit, screeningContext, ldctStatus: "due", yearsSinceQuit: 35 }));
    assert.equal(ids.includes("ldct"), age >= 50 && packYears >= 20 && curativeBenefit === true && screeningContext === "screening");
  }
});

test("conditional workflow makes any known transplant-review signal available", () => {
  const d = base({ fev1Predicted: 55, mmrcScore: 2, bmi: 20, walkDistance: 120, advancedInterest: "screen" });
  const r = L.buildRecommendation(d);
  assert.ok(W.steps(r.data, r).some(s => s.fields?.includes("advancedInterest")));
});

test("zero spirometry values do not become a COPD diagnosis or a grade-four clinical note", () => {
  for (const field of ["fev1fvc", "fev1Predicted"]) {
    const r = L.buildRecommendation(base({ [field]: 0 }));
    assert.equal(r.invalid, true); assert.equal(N.buildNoteText(r), "");
    const urgent = L.buildRecommendation(base({ [field]: 0, respiratoryRate: 32 }));
    assert.equal(urgent.emergency, true); assert.ok(urgent.actions.some(a => a.id === "urgent"));
  }
  assert.equal(L.normalizeFev1FvcHeuristic(0), null);
});

test.after(() => console.log(`COPD synthetic SOAP encounters exercised: ${generatedEncounters}.`));
