const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const L = require("./logic.js");
const M = require("./medications.js");
const N = require("./notes.js");

const base = (patch = {}) => ({ ...L.createEmptyState(), age: 45, managementPhase: "followup", diagnosisContext: "established", typicalSymptoms: true, dxChallenge: true,
  controller: "ics-formoterol", icsDose: "medium", reliever: "ics-formoterol", currentBiologic: "none", symptomDays: "none", nightWaking: "none", activityLimitation: false,
  ocsExacerbations: 0, hospitalExacerbations: 0, recentExacerbation: false, priorIcu: false, urgentRedFlags: false, acutePresentation: "none",
  adherence: "adequate", technique: "correct", accessBarrier: false, ...patch });
const poor = (patch = {}) => base({ symptomDays: "daily", nightWaking: "weekly-plus", activityLimitation: true, ...patch });
const severe = (patch = {}) => poor({ icsDose: "high", optimizedTherapy: true, ocsExacerbations: 2, eosinophils: 450, feno: 45, ...patch });
const acute = (patch = {}) => base({ acutePresentation: "active", acuteSpeech: "sentences", acuteCanLieDown: true, acuteUnableToLieDown: false, acuteCannotDrink: false, acuteCyanosis: false,
  acuteMentalStatus: "normal", acuteRespiratoryEffort: "normal-mild", acuteAccessoryMuscles: "none-mild", acuteAirEntry: "normal", acuteWheeze: "none-mild", roomAir: true,
  spo2: 96, respiratoryRate: 20, acuteLungFunctionPercent: 80, acuteLungFunctionType: "pef", acuteLungFunctionReference: "personal-best", ...patch });
const ids = rec => rec.actions.map(item => item.id);
const note = (data, selectedBiologicId) => N.buildNoteText(data, L.buildRecommendation(data, { selectedBiologicId }));

test("defaults contain unknown findings and no fabricated negatives", () => {
  const data = L.createEmptyState();
  assert.equal(data.urgentRedFlags, null); assert.equal(data.activityLimitation, null); assert.equal(data.ocsExacerbations, null);
  assert.equal(L.classifyControl(data).classification, "not fully assessed");
  assert.doesNotMatch(note(data), /No urgent|Never smoked|No exacerbations requiring|Examination: normal/i);
});
test("normalization preserves explicit zero / false but not blank numeric values", () => {
  const data = L.normalizeState({ ocsExacerbations: "0", activityLimitation: "no", eosinophils: "", feno: "  " });
  assert.equal(data.ocsExacerbations, 0); assert.equal(data.activityLimitation, false); assert.equal(data.eosinophils, null); assert.equal(data.feno, null);
});
test("schema and pure state have identical keys", () => {
  const context = { window: {} }; vm.runInNewContext(fs.readFileSync(path.join(__dirname, "input-schema.js"), "utf8"), context);
  assert.deepEqual(Object.keys(context.window.asthmaInputSchema).sort(), Object.keys(L.createEmptyState()).sort());
});
test("GINA adult exact 12% / 200 mL threshold is inclusive", () => {
  assert.equal(L.getBronchodilatorAssessment({ fev1Pre: 2, fev1Post: 2.24 }).positive, true);
  assert.equal(L.getBronchodilatorAssessment({ fev1Pre: 1.5, fev1Post: 1.7 }).positive, true);
  assert.equal(L.getBronchodilatorAssessment({ fev1Pre: 1.5, fev1Post: 1.699 }).positive, false);
  assert.equal(L.getBronchodilatorAssessment({ fev1Pre: 2, fev1Post: 2.239 }).positive, false);
});
test("FVC also supports the adult diagnostic bronchodilator criterion", () => {
  assert.equal(L.getBronchodilatorAssessment({ fvcPre: 2, fvcPost: 2.3 }).positive, true);
});
test("ATS >10% of predicted remains separate from the GINA criterion", () => {
  const exact = L.getBronchodilatorAssessment({ fev1Pre: 1, fev1Post: 1.2, fev1Predicted: 50 });
  assert.equal(exact.positive, true); assert.equal(exact.atsErsPositive, false);
  const atsOnly = L.getBronchodilatorAssessment({ fev1Pre: 1, fev1Post: 1.15, fev1Predicted: 80 });
  assert.equal(atsOnly.positive, false); assert.equal(atsOnly.atsErsPositive, true);
  assert.equal(L.assessDiagnosis({ typicalSymptoms: true, fev1Pre: 1, fev1Post: 1.15, fev1Predicted: 80 }).confirmed, false);
});
test("established asthma is not invalidated by an unavailable original report", () => {
  const dx = L.assessDiagnosis({ diagnosisContext: "established" });
  assert.equal(dx.supported, true); assert.equal(dx.confirmed, false);
  assert.match(dx.summary, /without automatically invalidating/);
});
test("subjective ICS improvement alone does not confirm asthma", () => {
  assert.equal(L.assessDiagnosis({ typicalSymptoms: true, clinicalIcsResponse: true }).objective, false);
  assert.equal(L.assessDiagnosis({ typicalSymptoms: true, icsObjectiveResponse: true }).confirmed, true);
});
test("PEF variability is positive above, not at, 10%; historical evidence is recognized", () => {
  assert.equal(L.assessDiagnosis({ typicalSymptoms: true, pefVariability: 10 }).confirmed, false);
  assert.equal(L.assessDiagnosis({ typicalSymptoms: true, pefVariability: 10.01 }).confirmed, true);
  for (const key of ["dxBd", "dxIcsObjective", "dxChallenge", "dxPef"]) assert.equal(L.assessDiagnosis({ typicalSymptoms: true, [key]: true }).confirmed, true);
});
test("missing control answers cannot establish good control", () => {
  assert.equal(L.classifyControl(base({ activityLimitation: null })).classification, "not fully assessed");
  assert.equal(L.classifyControl(base({ reliever: "unknown" })).classification, "not fully assessed");
});
test("three positive documented control items remain uncontrolled despite missing history", () => {
  const control = L.classifyControl(poor({ reliever: "saba", sabaFrequency: "unknown" }));
  assert.equal(control.classification, "uncontrolled"); assert.equal(control.complete, false);
});
test("SABA frequency applies only to SABA relief and ICS-reliever use is not counted", () => {
  assert.equal(L.classifyControl(base({ sabaFrequency: "more-two", airUsesPerWeek: 10 })).classification, "well controlled");
  assert.equal(L.classifyControl(base({ reliever: "ics-saba", sabaFrequency: "more-two" })).classification, "well controlled");
  assert.equal(L.classifyControl(base({ reliever: "saba", sabaFrequency: "more-two" })).classification, "partly controlled");
  assert.equal(L.classifyControl(base({ reliever: "saba", sabaFrequency: "unknown" })).classification, "not fully assessed");
});
test("positive exacerbation risk survives incomplete other history without double counting", () => {
  const risk = L.classifyExacerbationRisk(base({ ocsExacerbations: 2, hospitalExacerbations: null }));
  assert.equal(risk.anyExacerbation, true); assert.equal(risk.frequent, true); assert.equal(risk.complete, false);
  assert.equal(L.classifyExacerbationRisk(base({ ocsExacerbations: null, hospitalExacerbations: 0 })).anyExacerbation, null);
  assert.equal(L.classifyExacerbationRisk(base()).anyExacerbation, false);
});
test("control and future risk remain distinct in a symptomatically stable high-risk encounter", () => {
  const rec = L.buildRecommendation(base({ priorIcu: true }));
  assert.equal(rec.findings.control.classification, "well controlled"); assert.equal(rec.findings.risk.elevated, true);
  assert.match(rec.findings.risk.summary, /life-threatening/);
});
test("initial categories are nonoverlapping and lung function / risk affects intensity", () => {
  assert.equal(L.pickInitialTreatment(base({ symptomDays: "three", nightWaking: "none" })), "air");
  assert.equal(L.pickInitialTreatment(base({ symptomDays: "four-six", nightWaking: "none" })), "smartLow");
  assert.equal(L.pickInitialTreatment(base({ symptomDays: "daily", fev1Predicted: 65 })), "smartMedium");
  assert.equal(L.pickInitialTreatment(base({ symptomDays: "daily", ocsExacerbations: 1 })), "smartMedium");
  assert.equal(L.pickInitialTreatment(base({ symptomDays: "unknown" })), null);
});
test("maintenance in initial mode activates follow-up with assumption only in Safety Checks", () => {
  const data = poor({ managementPhase: "initial" }); const rec = L.buildRecommendation(data);
  assert.equal(rec.findings.treatment.effectivePhase, "followup");
  assert.ok(rec.cautions.some(text => /Initial mode/.test(text)));
  assert.doesNotMatch(N.buildNoteText(data, rec), /Initial mode|follow-up management logic was used/);
});
test("assessment reports actual current regimen separately from proposed treatment", () => {
  const data = base({ managementPhase: "initial", controller: "none", reliever: "saba", symptomDays: "one-two", sabaFrequency: "one-two", currentMedicationText: "Albuterol 90 mcg as needed" });
  const text = note(data).split("Assessment\n")[1].split("\n\nPlan")[0];
  assert.match(text, /No maintenance controller documented/); assert.match(text, /Proposed treatment change/);
  assert.doesNotMatch(text, /Current therapy: GINA Track 1 Step 1-2/);
});
test("stable effective Track 2 is preserved", () => {
  const rec = L.buildRecommendation(base({ controller: "ics-laba", labaType: "non-formoterol", reliever: "ics-saba" }));
  assert.ok(ids(rec).includes("continue")); assert.equal(rec.findings.proposedMedicationId, null);
});
test("non-formoterol LABA cannot be paired with ICS-formoterol relief", () => {
  const rec = L.buildRecommendation(poor({ controller: "ics-laba", labaType: "non-formoterol" }));
  assert.equal(rec.findings.treatment.incompatible, true); assert.ok(ids(rec).includes("resolve-reliever"));
  assert.equal(rec.findings.proposedMedicationId, null);
});
test("a separate AIR reliever with formoterol triple is not a LABA mismatch", () => {
  assert.equal(L.getTreatmentContext(base({ controller: "triple", labaType: "formoterol" })).incompatible, false);
});
test("triple maintenance is not labeled MART and does not inherit a second 12-puff allowance", () => {
  const data = acute({ controller: "triple", labaType: "formoterol" });
  const rec = L.buildRecommendation(data);
  assert.match(rec.findings.treatment.description, /not triple-inhaler MART/);
  assert.doesNotMatch(rec.actions.find(item => item.id === "acute-relief").text, /12-inhalation/);
  const stable = base({ controller: "triple", labaType: "formoterol", stableMonths: 3, lungFunctionStable: true, pregnant: false, respiratoryInfection: false, travelling: false, maintenanceOcs: false });
  assert.doesNotMatch(L.buildRecommendation(stable).actions.find(item => item.id === "stepdown").text, /reduce medium-dose SMART/i);
});
test("modifiable barriers take priority over routine escalation", () => {
  const rec = L.buildRecommendation(poor({ icsDose: "low", adherence: "suboptimal" }));
  assert.ok(ids(rec).includes("optimize")); assert.equal(rec.findings.proposedMedicationId, null);
});
test("Step 4 phenotype plans are future considerations, not immediate severe-asthma initiation", () => {
  const data = poor({ eosinophils: 450, feno: 45, ocsExacerbations: 2 }); const rec = L.buildRecommendation(data, { selectedBiologicId: "benralizumab" });
  assert.ok(rec.biologicCandidates.some(item => item.id === "benralizumab"));
  assert.ok(rec.biologicCandidates.every(item => item.future));
  assert.ok(ids(rec).includes("future-biologic")); assert.doesNotMatch(note(data, "benralizumab"), /Plan to initiate/);
  assert.doesNotMatch(note(data), /Refer promptly|specialist assessment|does not yet point clearly/);
});
test("missing phenotype testing has one prioritized recommendation", () => {
  const rec = L.buildRecommendation(poor());
  assert.equal(rec.actions.filter(item => item.id === "phenotype-testing").length, 1);
  assert.doesNotMatch(note(poor()), /Biomarkers not documented/);
});
test("triple therapy and high dose without optimization do not assert severe asthma", () => {
  assert.equal(L.classifySevereAsthmaState(poor({ controller: "triple", icsDose: "medium" })).established, false);
  assert.equal(L.classifySevereAsthmaState(poor({ icsDose: "high" })).established, false);
  assert.equal(L.classifySevereAsthmaState(severe()).established, true);
});
test("biologics are matched to phenotype, not ranked as a single universally superior agent", () => {
  const rec = L.buildRecommendation(severe());
  for (const id of ["mepolizumab", "benralizumab", "depemokimab", "reslizumab", "dupilumab", "tezepelumab"]) assert.ok(rec.biologicCandidates.some(item => item.id === id), id);
  assert.ok(rec.biologicCandidates.every(item => item.ready));
  assert.doesNotMatch(note(severe()), /Plan to initiate|Preferred biologic|Additional biologic option|Biologic consideration:/);
});
test("biologic selection drives only the selected medication in the SOAP plan", () => {
  const text = note(severe(), "benralizumab");
  assert.match(text, /Plan to initiate.*Benralizumab/); assert.match(text, /30 mg SC every 4 weeks for 3 doses, then every 8 weeks/);
  for (const name of ["Reslizumab", "Mepolizumab", "Tezepelumab", "Dupilumab", "Depemokimab"]) assert.doesNotMatch(text, new RegExp(name));
});
test("chosen dupilumab schedule reflects documented OCS dependence / comorbidity", () => {
  assert.match(note(severe(), "dupilumab"), /400 mg SC loading dose followed by 200 mg SC every 2 weeks/);
  assert.match(note(severe({ maintenanceOcs: true }), "dupilumab"), /600 mg SC loading dose, followed by 300 mg SC every 2 weeks/);
});
test("an unsupported selection does not silently initiate a biologic", () => {
  const rec = L.buildRecommendation(severe({ eosinophils: 0, feno: 5 }), { selectedBiologicId: "benralizumab" });
  assert.equal(rec.findings.selectedBiologicId, null); assert.doesNotMatch(N.buildNoteText(severe({ eosinophils: 0, feno: 5 }), rec), /Plan to initiate/);
});
test("existing biologic is assessed before switch and no automatic dual therapy", () => {
  const text = note(severe({ currentBiologic: "mepolizumab", biologicMonths: 2 }), "benralizumab");
  assert.match(text, /Review response to mepolizumab after 2 months/); assert.match(text, /do not combine biologics routinely/); assert.doesNotMatch(text, /Plan to initiate/);
});
test("unknown current biologic context prevents a definite new initiation plan", () => {
  const data = severe({ currentBiologic: "unknown" });
  assert.ok(L.buildRecommendation(data).biologicCandidates.every(item => !item.ready));
  assert.doesNotMatch(note(data, "benralizumab"), /Plan to initiate/);
});
test("dupilumab caution is strictly above 1500, including historical values", () => {
  for (const value of [1499, 1500]) {
    assert.equal(L.getDupilumabEvidenceFlag({ eosinophils: value }).above1500, false);
    assert.ok(L.buildRecommendation(severe({ eosinophils: value })).biologicCandidates.some(item => item.id === "dupilumab"));
  }
  assert.equal(L.getDupilumabEvidenceFlag({ eosinophils: 1501 }).above1500, true);
  assert.ok(!L.buildRecommendation(severe({ historicalEosinophils: 1501 })).biologicCandidates.some(item => item.id === "dupilumab"));
});
test("suspected EGPA is not confirmed disease or a dupilumab match", () => {
  const data = severe({ egpa: "suspected" }); const rec = L.buildRecommendation(data);
  assert.ok(ids(rec).includes("egpa-workup")); assert.ok(!rec.biologicCandidates.some(item => item.id === "dupilumab"));
  assert.match(note(data), /EGPA is suspected.*not established/); assert.doesNotMatch(note(data), /Confirmed EGPA/);
});
test("confirmed EGPA uses indication-specific dosing in the chosen-agent note", () => {
  const data = severe({ egpa: "confirmed" });
  const mepo = note(data, "mepolizumab"), benra = note(data, "benralizumab");
  assert.match(mepo, /mepolizumab 300 mg SC every 4 weeks/);
  assert.doesNotMatch(mepo, /mepolizumab 100 mg SC every 4 weeks/);
  assert.match(benra, /benralizumab 30 mg SC every 4 weeks under the EGPA indication/);
  assert.doesNotMatch(benra, /then every 8 weeks/);
});
test("a new biologic in pregnancy stays conditional on individual benefit / risk review", () => {
  const data = severe({ pregnant: true });
  assert.ok(L.buildRecommendation(data).biologicCandidates.every(item => !item.ready));
  assert.doesNotMatch(note(data, "benralizumab"), /Plan to initiate/);
});
test("omalizumab adult table covers every supported and unsupported cell", () => {
  const expected = [["150/4", "150/4", "150/4", "300/4"], ["300/4", "300/4", "300/4", "225/2"], ["300/4", "225/2", "225/2", "300/2"], ["225/2", "225/2", "300/2", null], ["300/2", "300/2", "375/2", null], ["300/2", "375/2", null, null], ["375/2", null, null, null]];
  [100, 200, 300, 400, 500, 600, 700].forEach((ige, row) => [60, 70, 90, 150].forEach((weight, column) => {
    const dose = M.getOmalizumabDose(ige, weight);
    assert.equal(dose ? `${dose.doseMg}/${dose.intervalWeeks}` : null, expected[row][column]);
  }));
  assert.deepEqual(M.getOmalizumabDose(30, 30), { doseMg: 150, intervalWeeks: 4 });
  assert.equal(M.getOmalizumabDose(29.99, 50), null); assert.equal(M.getOmalizumabDose(700.01, 50), null); assert.equal(M.getOmalizumabDose(300, 150.01), null);
  assert.deepEqual(M.getOmalizumabDose(100.01, 90.01), { doseMg: 225, intervalWeeks: 2 });
  assert.equal(M.getOmalizumabDose(600.01, 60.01), null);
});
test("omalizumab requires sensitization and dose-table feasibility", () => {
  const data = severe({ allergenDriven: true, totalIge: 500, weightKg: 100, perennialSensitization: true });
  const candidate = L.buildRecommendation(data).biologicCandidates.find(item => item.id === "omalizumab");
  assert.equal(candidate.ready, false); assert.match(candidate.prerequisites.join(" "), /No dose is specified/);
  assert.equal(L.getOmalizumabFeasibility({ totalIge: 100, weightKg: 50, perennialSensitization: false }).feasible, false);
  assert.doesNotMatch(L.buildRecommendation(severe({ allergenDriven: true })).cautions.join(" "), /Weight is missing/);
});
test("omalizumab dosing cannot use IgE of undocumented timing or during treatment", () => {
  const data = severe({ allergenDriven: true, perennialSensitization: true, totalIge: 100, weightKg: 50 });
  assert.equal(L.getOmalizumabFeasibility(data).feasible, false);
  assert.ok(!L.buildRecommendation(data).biologicCandidates.find(item => item.id === "omalizumab").ready);
  assert.doesNotMatch(note(data, "omalizumab"), /150 mg subcutaneously every/);
  const confirmed = { ...data, igePretreatment: true };
  assert.equal(L.getOmalizumabFeasibility(confirmed).feasible, true);
  assert.match(note(confirmed, "omalizumab"), /150 mg subcutaneously every 4 weeks/);
});
test("an acute severe finding prevents contradictory red-flag denial in the note", () => {
  const text = note(acute({ acuteCyanosis: true, urgentRedFlags: false }));
  assert.match(text, /cyanosis present/); assert.doesNotMatch(text, /No urgent red-flag symptoms/);
});
test("uncontrolled but incomplete history is not mislabeled as control determined by missing data", () => {
  const text = note(poor({ reliever: "saba", sabaFrequency: "unknown" }));
  assert.match(text, /symptom control is uncontrolled.*remaining symptom/);
  assert.doesNotMatch(text, /uncontrolled because the assessment is incomplete/);
});
test("raised biomarkers and inadequate ICS are visible independent future-risk findings", () => {
  const rec = L.buildRecommendation(base({ controller: "saba-only", reliever: "saba", sabaFrequency: "none", eosinophils: 300, feno: 50, technique: "incorrect" }));
  assert.equal(rec.findings.control.classification, "well controlled");
  assert.match(rec.findings.risk.summary, /incorrect inhaler technique.*absence of ICS protection.*raised blood eosinophils.*high FeNO/);
});
test("U.S. regimen references have correct limits and off-label SMART status", () => {
  assert.equal(M.MEDICATIONS.smartMedium.offLabel, true); assert.match(M.MEDICATIONS.smartMedium.detail, /medium-dose MART, not high-dose MART/);
  assert.match(M.MEDICATIONS.airsupra.detail, /Maximum 6 doses, or 12 inhalations/);
  assert.match(M.MEDICATIONS.tiotropium.detail, /1.25 mcg/); assert.match(M.MEDICATIONS.tiotropium.detail, /2.5 mcg\/day/);
  assert.match(M.MEDICATIONS.depemokimab.detail, /100 mg SC once every 6 months/);
  assert.match(M.MEDICATIONS.omalizumab.detail, /interchangeable biosimilar/);
});
test("step-down requires duration, stable lung function, and explicit contraindication review", () => {
  const stable = base({ stableMonths: 3, lungFunctionStable: true, pregnant: false, respiratoryInfection: false, travelling: false, maintenanceOcs: false });
  assert.ok(ids(L.buildRecommendation(stable)).includes("stepdown"));
  for (const patch of [{ stableMonths: 2.99 }, { lungFunctionStable: null }, { pregnant: true }, { pregnant: null }, { respiratoryInfection: true }, { recentExacerbation: true }, { maintenanceOcs: true }, { hospitalExacerbations: null }]) assert.ok(!ids(L.buildRecommendation({ ...stable, ...patch })).includes("stepdown"), JSON.stringify(patch));
  const text = note(stable); assert.match(text, /1 inhalation twice daily/); assert.match(text, /Do not completely withdraw ICS/); assert.match(text, /return-to-prior-treatment/);
});
test("life-threatening history remains visible in a step-down discussion", () => {
  const rec = L.buildRecommendation(base({ stableMonths: 4, lungFunctionStable: true, pregnant: false, respiratoryInfection: false, travelling: false, maintenanceOcs: false, priorIcu: true }));
  assert.ok(rec.cautions.some(text => /close supervision/.test(text)));
});
test("acute mild assessment requires all documented mild features", () => {
  assert.equal(L.assessAcutePresentation(acute()).classification, "mild");
  const incomplete = L.assessAcutePresentation(acute({ roomAir: null })); assert.equal(incomplete.complete, false); assert.equal(incomplete.mild, false); assert.match(incomplete.summary, /cannot be established/);
});
test("acute physiologic boundaries use the most severe feature", () => {
  for (const [patch, severity] of [[{ spo2: 94 }, "mild"], [{ spo2: 92 }, "moderate"], [{ spo2: 91.99 }, "severe features / inadequate response"], [{ acuteLungFunctionPercent: 70 }, "moderate"], [{ acuteLungFunctionPercent: 50 }, "moderate"], [{ acuteLungFunctionPercent: 49.99 }, "severe features / inadequate response"], [{ respiratoryRate: 30 }, "moderate"], [{ respiratoryRate: 30.01 }, "severe features / inadequate response"]]) assert.equal(L.assessAcutePresentation(acute(patch)).classification, severity, JSON.stringify(patch));
});
test("one severe finding dominates otherwise reassuring conflicting observations", () => {
  for (const patch of [{ acuteSpeech: "unable" }, { acuteCannotDrink: true }, { acuteUnableToLieDown: true }, { acuteAirEntry: "silent" }, { acuteCyanosis: true }, { acuteMentalStatus: "confused" }]) assert.equal(L.assessAcutePresentation(acute(patch)).emergency, true);
  assert.equal(L.assessAcutePresentation(acute({ acuteCanLieDown: false })).classification, "moderate");
});
test("urgent red flags override even without acute mode and suppress routine plans", () => {
  const rec = L.buildRecommendation(severe({ urgentRedFlags: true }));
  assert.equal(rec.emergency, true); assert.equal(rec.biologicCandidates.length, 0);
  assert.ok(rec.actions.every(item => ["urgent", "acute"].includes(item.kind))); assert.ok(!ids(rec).includes("continue"));
});
test("deterioration or nonresponse requires escalation, never routine follow-up reassurance", () => {
  for (const acuteResponse of ["unchanged", "worsening"]) {
    const rec = L.buildRecommendation(acute({ acuteResponse })); assert.equal(rec.emergency, true); assert.ok(!ids(rec).includes("acute-followup"));
  }
});
test("mild therapy and moderate corticosteroid dosing differ", () => {
  const mild = L.buildRecommendation(acute()); assert.ok(ids(mild).includes("acute-ocs-mild")); assert.ok(!ids(mild).includes("acute-ocs"));
  const moderate = L.buildRecommendation(acute({ spo2: 93 })); assert.match(moderate.actions.find(item => item.id === "acute-ocs").text, /40-50 mg daily for 5-7 days/);
  assert.match(moderate.actions.find(item => item.id === "acute-relief").text, /4-6 puffs/);
});
test("acute incomplete assessment does not infer treatment response or safe discharge", () => {
  const text = note({ ...L.createEmptyState(), age: 45, acutePresentation: "active" });
  assert.match(text, /assessment is incomplete/); assert.match(text, /discharge readiness is not established/);
  assert.doesNotMatch(text, /Patient improved|safe for discharge|Treatment already given:|Documented reassessment:/);
});
test("actual reassessment is distinct from recommendations and needs sustained improvement", () => {
  const data = acute({ acuteTreatmentGiven: "Albuterol 4 puffs at 10:00", acuteResponse: "improving", postTreatmentMildFeatures: true, postTreatmentSpo2: 96, postTreatmentRoomAir: true, postTreatmentRespiratoryRate: 18, postTreatmentLungFunctionPercent: 85, observationMinutes: 60, homeSupport: true });
  assert.equal(L.assessAcutePresentation(data).dischargeCriteriaDocumented, true);
  assert.match(note(data), /Treatment already given: Albuterol 4 puffs at 10:00/); assert.match(note(data), /Documented reassessment: clinical response improving/);
  assert.equal(L.assessAcutePresentation({ ...data, observationMinutes: 59 }).dischargeCriteriaDocumented, false);
  assert.equal(L.assessAcutePresentation({ ...data, homeSupport: null }).dischargeCriteriaDocumented, false);
  assert.equal(L.assessAcutePresentation({ ...data, postTreatmentRoomAir: null }).dischargeCriteriaDocumented, false);
  assert.equal(L.assessAcutePresentation({ ...data, postTreatmentRoomAir: false }).dischargeCriteriaDocumented, false);
  assert.equal(L.assessAcutePresentation({ ...data, acuteSpeech: "unknown" }).dischargeCriteriaDocumented, false);
  assert.equal(L.assessAcutePresentation({ ...data, postTreatmentRespiratoryRate: null }).dischargeCriteriaDocumented, false);
});
test("dangerous objective vitals override the acute toggle and stable-treatment step-down", () => {
  const data = base({ stableMonths: 4, lungFunctionStable: true, pregnant: false, respiratoryInfection: false, travelling: false, maintenanceOcs: false, spo2: 85, roomAir: true });
  const rec = L.buildRecommendation(data);
  assert.equal(rec.emergency, true); assert.ok(!ids(rec).includes("stepdown"));
  assert.ok(rec.actions.every(item => item.kind === "urgent"));
  assert.doesNotMatch(note(data), /give prednisone|reduce medium-dose/i);
  assert.equal(L.buildRecommendation(base({ respiratoryRate: 31 })).emergency, true);
});
test("higher-ICS trial note retains conditional actionable dosing and reliever restrictions", () => {
  const text = note(poor({ eosinophils: 450 }));
  assert.match(text, /If pursuing a monitored higher-ICS trial/); assert.match(text, /500\/50 mcg, 1 inhalation twice daily/);
  assert.match(text, /Do not use ICS-formoterol as reliever with salmeterol/);
  assert.doesNotMatch(text, /Plan to initiate.*biologic/);
});
test("acute pregnancy / chronic OCS considerations do not duplicate routine bursts", () => {
  const rec = L.buildRecommendation(acute({ spo2: 93, pregnant: true, maintenanceOcs: true, maintenanceOcsDose: 10 }));
  assert.ok(ids(rec).includes("acute-pregnancy")); assert.match(rec.actions.find(item => item.id === "acute-ocs").text, /accounting for the existing/);
  assert.doesNotMatch(rec.actions.find(item => item.id === "acute-ocs").text, /prescribe prednisone.*40-50/);
});
test("unknown vaccine history is not a statement of incomplete vaccination or completed care", () => {
  const text = note(base()); assert.match(text, /If due after reviewing records/);
  assert.doesNotMatch(text, /Vaccines administered|Counseled patient|Vaccination incomplete|vaccination was completed/);
});
test("known vaccine history is recorded without claiming administration during the encounter", () => {
  const text = note(base({ flu: "complete", pneumococcal: "due" }));
  assert.match(text, /influenza current \/ complete; pneumococcal due \/ incomplete/);
  assert.doesNotMatch(text, /influenza vaccine administered/);
});
test("age thresholds and prior RSV vaccination are respected", () => {
  assert.ok(!ids(L.buildRecommendation(base({ age: 49 }))).includes("vaccine-rsv"));
  assert.ok(ids(L.buildRecommendation(base({ age: 50 }))).includes("vaccine-rsv"));
  assert.ok(!ids(L.buildRecommendation(base({ age: 75, rsv: "complete" }))).includes("vaccine-rsv"));
  assert.ok(!ids(L.buildRecommendation(base({ age: 18 }))).includes("vaccine-pneumococcal"));
  assert.ok(ids(L.buildRecommendation(base({ age: 19 }))).includes("vaccine-pneumococcal"));
});
test("unconfirmed asthma directs prevention to CDC / local criteria", () => {
  const data = base({ diagnosisContext: "suspected", dxChallenge: false, typicalSymptoms: null, age: 30 });
  const rec = L.buildRecommendation(data); assert.ok(ids(rec).includes("vaccine-diagnostic")); assert.ok(!ids(rec).includes("vaccine-pneumococcal"));
});
test("SOAP note has full headings, factual optional text, and a comprehensive prospective plan", () => {
  const text = note(base({ hpi: "Cough improved since last visit", exam: "Mild end-expiratory wheeze", heartRate: 80, eosinophils: 200, counselingDocumented: "Reviewed spacer technique" }));
  for (const heading of ["Subjective", "Objective", "Assessment", "Plan"]) assert.match(text, new RegExp(`(?:^|\\n)${heading}\\n`));
  assert.match(text, /HR 80 bpm/); assert.match(text, /Mild end-expiratory wheeze/); assert.match(text, /Counseling documented as performed: Reviewed spacer technique/);
  assert.match(text, /asthma action plan/); assert.match(text, /Preventive care/); assert.match(text, /Monitoring and follow-up/);
  assert.doesNotMatch(text, /not entered|selected|guidance card|rationale trace|normal examination|Denies chest pain/i);
});
test("unsafe numeric combinations block copying but preserve urgent escalation", () => {
  for (const patch of [{ age: 17 }, { ocsExacerbations: 1.5 }, { spo2: 101 }, { fev1Pre: 3, fvcPre: 2 }, { systolicBp: 70, diastolicBp: 80 }, { weightKg: 0 }]) {
    const data = base(patch), rec = L.buildRecommendation(data); assert.equal(rec.invalid, true); assert.equal(N.buildNoteText(data, rec), "");
  }
  const rec = L.buildRecommendation(acute({ spo2: 85, ocsExacerbations: -1 })); assert.equal(rec.emergency, true); assert.ok(ids(rec).includes("urgent"));
});
test("valid marked biomarkers remain usable rather than being silently discarded", () => {
  const rec = L.buildRecommendation(severe({ eosinophils: 8000, totalIge: 10000 }));
  assert.equal(rec.invalid, false); assert.equal(rec.findings.data.eosinophils, 8000); assert.ok(rec.cautions.some(text => /Marked eosinophilia/.test(text)));
});
test("same inputs and selection produce deterministic results and note text", () => {
  const data = severe({ currentMedicationText: "Advair 500/50 one inhalation twice daily" });
  assert.deepEqual(L.buildRecommendation(data), L.buildRecommendation(data));
  assert.equal(note(data, "benralizumab"), note(data, "benralizumab"));
});
test("each referenced source and medication resolves in the catalog", () => {
  for (const data of [base(), poor(), severe(), acute(), acute({ spo2: 85 }), base({ managementPhase: "initial", controller: "none" })]) {
    const rec = L.buildRecommendation(data, { selectedBiologicId: "benralizumab" });
    for (const action of rec.actions) { action.sourceIds.forEach(id => assert.ok(M.SOURCES[id], id)); action.medicationIds.forEach(id => assert.ok(M.MEDICATIONS[id], id)); }
    rec.sources.forEach(source => assert.match(source.url, /^https:\/\//));
  }
});
