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
  adherence: "adequate", technique: "correct", accessBarrier: false, pregnant: false, ...patch });
const poor = (patch = {}) => base({ symptomDays: "daily", nightWaking: "weekly-plus", activityLimitation: true, ...patch });
const severe = (patch = {}) => poor({ controller: "ics-laba", labaType: "non-formoterol", reliever: "ics-saba", icsDose: "high", ocsExacerbations: 2, eosinophils: 450, feno: 45, weightKg: 75, ...patch });
const initiation = { controller: "continue-biologic" };
const acute = (patch = {}) => base({ acutePresentation: "active", acuteSpeech: "sentences", acuteCanLieDown: true, acuteUnableToLieDown: false, acuteCannotDrink: false, acuteCyanosis: false,
  acuteMentalStatus: "normal", acuteRespiratoryEffort: "normal-mild", acuteAccessoryMuscles: "none-mild", acuteAirEntry: "normal", acuteWheeze: "none-mild", roomAir: true,
  spo2: 96, respiratoryRate: 20, acuteLungFunctionPercent: 80, acuteLungFunctionType: "pef", acuteLungFunctionReference: "personal-best", ...patch });
const ids = rec => rec.actions.map(item => item.id);
const note = (data, selectedBiologicId, planSelections) => N.buildNoteText(data, L.buildRecommendation(data, { selectedBiologicId, planSelections }));

test("routine context defaults do not fabricate other clinical findings", () => {
  const data = L.createEmptyState();
  assert.equal(data.acutePresentation, "none"); assert.equal(data.urgentRedFlags, false); assert.equal(data.activityLimitation, null); assert.equal(data.ocsExacerbations, null);
  assert.equal(data.currentBiologic, "none");
  assert.equal(L.classifyControl(data).classification, "not fully assessed");
  assert.match(note(data), /No urgent red-flag features were documented/);
  assert.doesNotMatch(note(data), /Never smoked|No exacerbations requiring|Examination: normal|denied red.flag/i);
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
test("control assessment identifies each missing applicable field without inferring negatives", () => {
  assert.deepEqual(L.classifyControl(base()).missingFields, []);
  for (const key of ["symptomDays", "nightWaking", "activityLimitation", "reliever"]) {
    const assessment = L.classifyControl(base({ [key]: key === "activityLimitation" ? null : "unknown" }));
    assert.deepEqual(assessment.missingFields, [key]);
    assert.equal(assessment.complete, false);
    assert.equal(assessment.classification, "not fully assessed");
  }
  assert.deepEqual(L.classifyControl(base({ reliever: "none" })).missingFields, []);
  assert.deepEqual(L.classifyControl(base({ reliever: "saba", sabaFrequency: "unknown" })).missingFields, ["sabaFrequency"]);
  assert.deepEqual(L.classifyControl(base({ reliever: "ics-saba", sabaFrequency: "unknown" })).missingFields, []);
  const incomplete = L.classifyControl(poor({ reliever: "saba", sabaFrequency: "unknown" }));
  assert.equal(incomplete.classification, "uncontrolled");
  assert.deepEqual(incomplete.missingFields, ["sabaFrequency"]);
});
test("documented absence of a reliever does not turn answered symptom history into missing data", () => {
  const d = base({ controller: "none", reliever: "none", icsDose: "unknown" });
  const assessment = L.classifyControl(d);
  assert.equal(assessment.complete, true);
  assert.equal(assessment.classification, "well controlled");
  assert.equal(assessment.sabaApplicable, false);
  const rec = L.buildRecommendation(d);
  assert.ok(rec.findings.risk.factors.some(factor => /ICS/.test(factor)));
  assert.ok(rec.actions.some(action => /ICS-containing/.test(action.text)));
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
  const data = base({ managementPhase: "initial", controller: "none", reliever: "saba", symptomDays: "one-two", sabaFrequency: "one-two" });
  const text = note(data, null, { controller: "air" }).split("Assessment\n")[1].split("\n\nPlan")[0];
  assert.match(text, /No maintenance controller containing an inhaled corticosteroid was documented/); assert.match(text, /planned regimen/);
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
  assert.ok(!ids(L.buildRecommendation(stable)).includes("stepdown"));
});
test("modifiable barriers take priority over routine escalation", () => {
  const rec = L.buildRecommendation(poor({ icsDose: "low", adherence: "suboptimal" }));
  assert.ok(ids(rec).includes("optimize")); assert.equal(rec.findings.proposedMedicationId, null);
});
test("Step 4 phenotype plans are future considerations, not immediate severe-asthma initiation", () => {
  const data = poor({ eosinophils: 450, feno: 45, ocsExacerbations: 2 }); const rec = L.buildRecommendation(data, { selectedBiologicId: "benralizumab" });
  assert.ok(rec.biologicCandidates.some(item => item.id === "benralizumab"));
  assert.ok(rec.biologicCandidates.every(item => item.future));
  assert.ok(ids(rec).includes("future-biologic")); assert.doesNotMatch(note(data, "benralizumab"), /Plan to initiate|Planned initiation/);
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
  assert.equal(L.classifySevereAsthmaState(severe()).established, false);
  assert.equal(L.classifySevereAsthmaState(severe(), undefined, undefined, { planSelections: initiation }).established, true);
});
test("biologics are matched to phenotype, not ranked as a single universally superior agent", () => {
  const rec = L.buildRecommendation(severe());
  for (const id of ["mepolizumab", "benralizumab", "depemokimab", "reslizumab", "dupilumab", "tezepelumab"]) assert.ok(rec.biologicCandidates.some(item => item.id === id), id);
  assert.ok(rec.biologicCandidates.every(item => item.eligibleForReview && !item.ready));
  assert.doesNotMatch(note(severe()), /Plan to initiate|Planned initiation|Preferred biologic|Additional biologic option|Biologic consideration:/);
});
test("biologic selection drives only the selected medication in the SOAP plan", () => {
  const text = note(severe(), "benralizumab", initiation);
  assert.match(text, /Benralizumab.*has been recommended for the current severe-asthma presentation/); assert.match(text, /30 mg SC every 4 weeks for the first 3 doses, then every 8 weeks/);
  for (const name of ["Reslizumab", "Mepolizumab", "Tezepelumab", "Dupilumab", "Depemokimab"]) assert.doesNotMatch(text, new RegExp(name));
});
test("chosen dupilumab schedule reflects documented OCS dependence / comorbidity", () => {
  assert.match(note(severe(), "dupilumab", initiation), /400 mg SC loading followed by 200 mg SC every 2 weeks/);
  assert.match(note(severe({ maintenanceOcs: true }), "dupilumab", initiation), /600 mg SC loading followed by 300 mg SC every 2 weeks/);
});
test("an unsupported selection does not silently initiate a biologic", () => {
  const rec = L.buildRecommendation(severe({ eosinophils: 0, feno: 5 }), { selectedBiologicId: "benralizumab" });
  assert.equal(rec.findings.selectedBiologicId, null); assert.doesNotMatch(N.buildNoteText(severe({ eosinophils: 0, feno: 5 }), rec), /Plan to initiate|Planned initiation/);
});
test("existing biologic is assessed before switch and no automatic dual therapy", () => {
  const text = note(severe({ currentBiologic: "mepolizumab", biologicMonths: 2 }), "benralizumab");
  assert.match(text, /Assess response to Mepolizumab \(Nucala\) after 2 months/); assert.match(text, /Do not routinely combine biologics/); assert.doesNotMatch(text, /Initiate after|30 mg SC every/);
});
test("unknown current biologic context prevents a definite new initiation plan", () => {
  const data = severe({ currentBiologic: "unknown" });
  assert.ok(L.buildRecommendation(data).biologicCandidates.every(item => !item.ready));
  assert.doesNotMatch(note(data, "benralizumab"), /Plan to initiate|Planned initiation/);
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
  assert.match(note(data), /EGPA was suspected.*not been established/); assert.doesNotMatch(note(data), /Confirmed EGPA/);
});
test("confirmed EGPA uses indication-specific dosing in the chosen-agent note", () => {
  const data = severe({ egpa: "confirmed" });
  const mepo = note(data, "mepolizumab", initiation), benra = note(data, "benralizumab", initiation);
  assert.match(mepo, /mepolizumab 300 mg SC every 4 weeks/);
  assert.doesNotMatch(mepo, /mepolizumab 100 mg SC every 4 weeks/);
  assert.match(benra, /benralizumab 30 mg SC every 4 weeks under the confirmed EGPA indication/);
  assert.doesNotMatch(benra, /then every 8 weeks/);
});
test("a new biologic in pregnancy stays conditional on individual benefit / risk review", () => {
  const data = severe({ pregnant: true });
  assert.ok(L.buildRecommendation(data).biologicCandidates.every(item => !item.ready));
  assert.doesNotMatch(note(data, "benralizumab"), /Plan to initiate|Planned initiation/);
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
  assert.doesNotMatch(note(data, "omalizumab"), /150 mg (?:SC|subcutaneously) every/);
  const confirmed = { ...data, igePretreatment: true };
  assert.equal(L.getOmalizumabFeasibility(confirmed).feasible, true);
  assert.match(note(confirmed, "omalizumab", initiation), /150 mg SC every 4 weeks/);
});
test("an acute severe finding prevents contradictory red-flag denial in the note", () => {
  const text = note(acute({ acuteCyanosis: true, urgentRedFlags: false }));
  assert.match(text, /cyanosis present/); assert.doesNotMatch(text, /No urgent red-flag symptoms/);
});
test("uncontrolled but incomplete history is not mislabeled as control determined by missing data", () => {
  const text = note(poor({ reliever: "saba", sabaFrequency: "unknown" }));
  assert.match(text, /symptom control was uncontrolled.*remaining history incomplete/);
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
  const text = note(stable, null, { controller: "stepdown" }); assert.match(text, /1 inhalation twice daily/); assert.match(text, /Do not withdraw ICS completely/); assert.match(text, /resume the previous regimen/);
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
  assert.match(text, /assessment remained incomplete/); assert.match(text, /discharge readiness was not established/);
  assert.doesNotMatch(text, /Patient improved|safe for discharge|Treatment already given:|Documented reassessment:/);
});
test("actual reassessment is distinct from recommendations and needs sustained improvement", () => {
  const data = acute({ acuteReassessmentAvailable: true, acuteResponse: "improving", postTreatmentMildFeatures: true, postTreatmentSpo2: 96, postTreatmentRoomAir: true, postTreatmentRespiratoryRate: 18, postTreatmentLungFunctionPercent: 85, observationMinutes: 60, homeSupport: true });
  assert.equal(L.assessAcutePresentation(data).dischargeCriteriaDocumented, true);
  assert.match(note(data), /Treatment administered, dose, and timing: \*\*\*/); assert.match(note(data), /Documented reassessment showed clinical response improving/);
  assert.equal(L.assessAcutePresentation({ ...data, acuteReassessmentAvailable: false }).dischargeCriteriaDocumented, false);
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
test("higher-ICS trial dosing enters the note only after a compatible plan is chosen", () => {
  const data = poor({ eosinophils: 450 });
  assert.doesNotMatch(note(data), /500\/50 mcg|tiotropium Respimat/);
  const text = note(data, null, { controller: "highDose", reliever: "airsupra", lama: "defer" });
  assert.match(text, /500\/50 mcg, 1 inhalation twice daily/);
  assert.match(text, /Stop the previous combination controller/);
  assert.match(text, /albuterol-budesonide/);
  assert.doesNotMatch(text, /(?:Plan to initiate|Planned initiation).*biologic/);
});
test("acute pregnancy / chronic OCS considerations do not duplicate routine bursts", () => {
  const rec = L.buildRecommendation(acute({ spo2: 93, pregnant: true, maintenanceOcs: true, maintenanceOcsDose: 10 }));
  assert.ok(ids(rec).includes("acute-pregnancy")); assert.match(rec.actions.find(item => item.id === "acute-ocs").text, /accounting for the existing/);
  assert.doesNotMatch(rec.actions.find(item => item.id === "acute-ocs").text, /prescribe prednisone.*40-50/);
});
test("unknown vaccine history is not a statement of incomplete vaccination or completed care", () => {
  const text = note(base()); assert.match(text, /Arrange record review and, if indicated/);
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
test("due vaccines produce explicit shared product and schedule plans, never completed care", () => {
  const data = base({ age: 68, flu: "due", covid: "due", pneumococcal: "due", rsv: "due", zoster: "due", tdap: "due" });
  const rec = L.buildRecommendation(data), text = N.buildNoteText(data, rec);
  for (const key of ["flu", "covid", "pneumococcal", "rsv", "zoster", "tdap"]) {
    const item = rec.actions.find(action => action.id === `vaccine-${key}`);
    assert.ok(item.vaccineGuidance);
    assert.ok(text.includes(`Arrange ${item.vaccineGuidance.target}. ${item.vaccineGuidance.details}`));
  }
  for (const pattern of [/Fluzone High-Dose, Flublok, or Fluad/, /PCV20 \(Prevnar 20\)/, /PCV15.*PPSV23.*1 year later/, /1 dose Arexvy, Abrysvo, or mResvia/, /Shingrix: 2 doses, usually 2-6 months apart/, /Td or Tdap every 10 years/, /2 seasonal doses about 6 months apart/]) assert.match(text, pattern);
  assert.doesNotMatch(text, /(?:was|were) (?:administered|vaccinated)|vaccination was completed|Counseled patient/);
});
test("vaccine uncertainty and completed doses do not become definite vaccination orders", () => {
  for (const key of ["flu", "covid", "pneumococcal", "rsv", "zoster", "tdap"]) {
    const unknown = L.getVaccineGuidance(base({ age: 68, [key]: "unknown" }), key);
    assert.match(unknown.target, /record review and, if indicated/);
    assert.equal(L.getVaccineGuidance(base({ age: 68, [key]: "complete" }), key), null);
    assert.ok(!ids(L.buildRecommendation(base({ age: 68, [key]: "complete" }))).includes(`vaccine-${key}`));
  }
  assert.match(L.getVaccineGuidance(base({ age: 68, rsv: "due" }), "rsv").details, /do not repeat after a previous dose/);
  assert.match(L.getVaccineGuidance(base({ age: 68, zoster: "due" }), "zoster").details, /remaining dose without restarting/);
});
test("due vaccination outside documented age or risk criteria requires eligibility reconciliation", () => {
  for (const [key, age, eligibleAge] of [["pneumococcal", 18, 19], ["rsv", 49, 50], ["zoster", 49, 50]]) {
    const guidance = L.getVaccineGuidance(base({ age, [key]: "due" }), key);
    assert.match(guidance.details, /do not establish routine eligibility/);
    assert.doesNotMatch(L.getVaccineGuidance(base({ age: eligibleAge, [key]: "due" }), key).details, /do not establish routine eligibility/);
  }
  const suspected = base({ age: 30, diagnosisContext: "suspected", typicalSymptoms: null, dxChallenge: false, pneumococcal: "due" });
  assert.match(L.getVaccineGuidance(suspected, "pneumococcal").details, /Confirm age at least 50/);
  assert.match(note(suspected), /without assuming an asthma-specific indication/);
});
test("due-vaccine guidance accounts for pregnancy and current seasonal age schedules", () => {
  const data = base({ age: 55, pregnant: true, pneumococcal: "due", zoster: "due", tdap: "due" });
  assert.match(L.getVaccineGuidance(data, "pneumococcal").details, /no routine recommendation.*during pregnancy/);
  assert.match(L.getVaccineGuidance(data, "zoster").details, /deferring Shingrix until after pregnancy/);
  assert.match(L.getVaccineGuidance(data, "tdap").details, /this pregnancy.*27-36 weeks/);
  assert.match(L.getVaccineGuidance(base({ age: 29, pregnant: true, rsv: "due" }), "rsv").details, /Abrysvo at 32 weeks 0 days through 36 weeks 6 days/);
  assert.equal(L.getVaccineGuidance(base({ age: 29, pregnant: true, rsv: "complete" }), "rsv"), null);
  assert.match(L.getVaccineGuidance(base({ age: 64, covid: "due" }), "covid").details, /1 seasonal dose/);
  assert.match(L.getVaccineGuidance(base({ age: 65, covid: "due" }), "covid").details, /2 seasonal doses/);
  assert.doesNotMatch(L.getVaccineGuidance(base({ age: 64, flu: "due" }), "flu").details, /High-Dose/);
  assert.match(L.getVaccineGuidance(base({ age: 65, flu: "due" }), "flu").details, /High-Dose/);
});
test("SOAP note has full headings and explicit unresolved-plan placeholders", () => {
  const text = note(base({ eosinophils: 200 }));
  for (const heading of ["Subjective", "Objective", "Assessment", "Plan"]) assert.match(text, new RegExp(`(?:^|\\n)${heading}\\n`));
  assert.match(text, /Examination: \*\*\*/); assert.match(text, /Available biomarkers were blood eosinophils 200 cells\/uL/);
  assert.equal((text.match(/\*\*\*/g) || []).length, 4);
  assert.match(text, /asthma action plan/); assert.match(text, /Preventive care/); assert.match(text, /Monitoring and follow-up/);
  assert.doesNotMatch(text, /not entered|selected|guidance card|rationale trace|normal examination|Denies chest pain|HR \d|BP \d|Counseling documented as performed/i);
});
test("unsafe numeric combinations block copying but preserve urgent escalation", () => {
  for (const patch of [{ age: 17 }, { ocsExacerbations: 1.5 }, { spo2: 101 }, { fev1Pre: 3, fvcPre: 2 }, { weightKg: 0 }]) {
    const data = base(patch), rec = L.buildRecommendation(data); assert.equal(rec.invalid, true); assert.equal(N.buildNoteText(data, rec), "");
  }
  const rec = L.buildRecommendation(acute({ spo2: 85, ocsExacerbations: -1 })); assert.equal(rec.emergency, true); assert.ok(ids(rec).includes("urgent"));
});
test("valid marked biomarkers remain usable rather than being silently discarded", () => {
  const rec = L.buildRecommendation(severe({ eosinophils: 8000, totalIge: 10000 }));
  assert.equal(rec.invalid, false); assert.equal(rec.findings.data.eosinophils, 8000); assert.ok(rec.cautions.some(text => /Marked eosinophilia/.test(text)));
});
test("same inputs and selection produce deterministic results and note text", () => {
  const data = severe();
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

test("review confirmations centrally resolve only routine exceptions", () => {
  const empty = L.createEmptyState();
  for (const [flag, defaults] of Object.entries(L.REVIEW_DEFAULTS)) {
    const reviewed = L.normalizeState({ ...empty, [flag]: true });
    for (const [key, expected] of Object.entries(defaults)) assert.equal(reviewed[key], expected, key);
    const reversed = L.normalizeState({ ...empty, [flag]: false });
    for (const key of Object.keys(defaults)) assert.equal(reversed[key], empty[key], key);
  }
  const reviewed = L.normalizeState({ treatmentReviewed: true, riskReviewed: true, urgentRedFlags: null });
  for (const key of ["lungFunctionStable", "perennialSensitization", "igePretreatment", "urgentRedFlags", "roomAir", "ocsExacerbations", "hospitalExacerbations", "weightKg", "totalIge"]) assert.equal(reviewed[key], null, key);
  for (const key of ["optimizedTherapy", "severeAsthmaEstablished"]) assert.equal(Object.hasOwn(reviewed, key), false);
  assert.equal(reviewed.dxBd, false); assert.equal(reviewed.typicalSymptoms, null);
  assert.equal(L.classifyControl(reviewed).classification, "not fully assessed");
});
test("positive exceptions and existing biologics persist with or without group confirmation", () => {
  for (const reviewed of [true, false]) {
    const d = L.normalizeState({ treatmentReviewed: reviewed, riskReviewed: reviewed,
      maintenanceOcs: true, accessBarrier: true, adherence: "suboptimal", technique: "incorrect", currentBiologic: "mepolizumab",
      pregnant: true, priorIcu: true, activityLimitation: true, allergenDriven: true, nasalPolyps: true });
    for (const key of ["maintenanceOcs", "accessBarrier", "pregnant", "priorIcu", "activityLimitation", "allergenDriven", "nasalPolyps"]) assert.equal(d[key], true, key);
    assert.equal(d.currentBiologic, "mepolizumab"); assert.equal(d.adherence, "suboptimal"); assert.equal(d.technique, "incorrect");
  }
});
test("group review does not bypass optimization, step-down or diagnostic safeguards", () => {
  const d = severe({ optimizedTherapy: null, weightKg: null, treatmentReviewed: true, riskReviewed: true });
  assert.equal(L.classifySevereAsthmaState(d).established, false);
  assert.ok(L.buildRecommendation(d).biologicCandidates.every(item => !item.ready));
  assert.ok(!ids(L.buildRecommendation(base({ riskReviewed: true, stableMonths: 4, lungFunctionStable: null }))).includes("stepdown"));
  assert.equal(L.assessDiagnosis({ treatmentReviewed: true, typicalSymptoms: true }).confirmed, false);
});
test("current biologic defaults to none but explicit unknown is not replaced by group review", () => {
  assert.equal(L.normalizeState({}).currentBiologic, "none");
  for (const treatmentReviewed of [true, false]) {
    assert.equal(L.normalizeState({ treatmentReviewed, currentBiologic: "unknown" }).currentBiologic, "unknown");
    assert.equal(L.normalizeState({ treatmentReviewed, currentBiologic: "dupilumab" }).currentBiologic, "dupilumab");
  }
  assert.ok(L.getBiologicCandidates(severe({ currentBiologic: "unknown", treatmentReviewed: true })).every(item => !item.ready));
});
test("phenotype findings require individual answers rather than a blanket negative assumption", () => {
  for (const key of ["allergenDriven", "nasalPolyps", "atopicDermatitis", "endemicExposure", "perennialSensitization"]) {
    assert.equal(L.normalizeState({ treatmentReviewed: true, riskReviewed: true, phenotypeReviewed: true })[key], null, key);
    assert.equal(L.normalizeState({ [key]: true })[key], true);
    assert.equal(L.normalizeState({ [key]: false })[key], false);
    assert.equal(L.normalizeState({ [key]: "unknown" })[key], null);
  }
  assert.equal(Object.hasOwn(L.createEmptyState(), "phenotypeReviewed"), false);
});
test("routine-visit default applies only to an unanswered red-flag field without urgent findings", () => {
  assert.deepEqual(L.getRoutineVisitDefaults({ acutePresentation: "none", urgentRedFlags: null }), { urgentRedFlags: false });
  for (const patch of [{ acutePresentation: "active" }, { acutePresentation: "recent" }, { urgentRedFlags: true }, { urgentRedFlags: false }, { spo2: 85 }, { respiratoryRate: 32 }, { acuteAirEntry: "silent" }, { acuteResponse: "worsening" }]) {
    assert.deepEqual(L.getRoutineVisitDefaults({ acutePresentation: "none", ...patch }), {}, JSON.stringify(patch));
  }
  const rec = L.buildRecommendation(base({ urgentRedFlags: false, spo2: 85 }));
  assert.equal(rec.emergency, true);
  assert.doesNotMatch(N.buildNoteText(base({ urgentRedFlags: false, spo2: 85 }), rec), /No urgent red-flag/);
  assert.match(note(base()), /No urgent red-flag features were documented/);
});
test("prior severe-asthma examples remain explanatory and do not establish current eligibility", () => {
  const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
  assert.match(html, /Biologic eligibility: treatment history and clinical review/);
  assert.match(html, /Asthma that worsened when optimized high-dose ICS-LABA was reduced/);
  const data = severe({ optimizedTherapy: null, severeAsthmaEstablished: true });
  assert.equal(L.classifySevereAsthmaState(data).established, false);
  assert.ok(L.buildRecommendation(data).biologicCandidates.every(item => !item.ready));
  assert.doesNotMatch(note(data), /Asthma that worsened when optimized/);
});
test("treatment shortcuts set only controller, intensity, reliever and LABA context", () => {
  for (const [id, preset] of Object.entries(L.TREATMENT_PRESETS)) {
    const raw = severe({ lamaAddon: true, priorIcu: true, currentBiologic: "benralizumab", managementPhase: "initial" });
    const data = { ...raw, ...preset };
    for (const key of Object.keys(raw).filter(key => !Object.hasOwn(preset, key))) assert.equal(data[key], raw[key], `${id}: ${key}`);
    const tx = L.getTreatmentContext(data);
    assert.equal(tx.track, ["none", "saba"].includes(id) ? null : id === "highDose" ? 2 : 1); assert.equal(tx.incompatible, false);
    assert.equal(tx.effectivePhase, "followup");
  }
});

const smoker = (patch = {}) => base({ smoking: "current", smokingSafetyReviewed: true, pregnant: false,
  smokingRenal: "normal", smokingCigarettesPerDay: 20, smokingFirstCigarette: "within30", ...patch });
const smokingNote = (data, selectedSmokingPlanId, selectedBiologicId) => N.buildNoteText(data, L.buildRecommendation(data, { selectedSmokingPlanId, selectedBiologicId }));

test("routine defaults retain explicit unknowns and do not carry an implicit negative into acute assessment", () => {
  assert.equal(L.normalizeState({}).acutePresentation, "none");
  assert.equal(L.normalizeState({}).urgentRedFlags, false);
  assert.equal(L.normalizeState({ urgentRedFlags: null }).urgentRedFlags, null);
  assert.equal(L.normalizeState({ acutePresentation: "active" }).urgentRedFlags, null);
  assert.equal(L.normalizeState({ acutePresentation: "recent" }).urgentRedFlags, null);
  assert.equal(L.buildRecommendation({ spo2: 85 }).emergency, true);
});
test("current smoking creates a dedicated plan with evidence and courses but no automatic agent choice", () => {
  const rec = L.buildRecommendation(smoker());
  assert.ok(ids(rec).includes("smoking-cessation"));
  assert.equal(rec.smokingSupport.selected, null);
  assert.equal(rec.smokingSupport.options.length, 4);
  for (const option of rec.smokingSupport.options) {
    assert.ok(option.evidence && option.benefits && option.cautions);
    option.sourceIds.forEach(id => assert.ok(M.SOURCES[id], id));
  }
  assert.match(smokingNote(smoker()), /Smoking cessation\n- Recommend smoking cessation/);
  assert.doesNotMatch(smokingNote(smoker()).split("\nPlan\n")[1], /Varenicline|Bupropion SR|21 mg patch|0.5 mg orally/);
});
test("only the chosen cessation medication and course enter the SOAP plan", () => {
  for (const [id, expected, absent] of [["varenicline", /Start Varenicline/, /21 mg patch|bupropion SR 150/i], ["combinationNrt", /Start Combination nicotine replacement/, /varenicline|bupropion SR 150/i], ["bupropion", /Start Bupropion SR/, /varenicline|21 mg patch/i], ["behavioral", /Use behavioral support without medication/, /0.5 mg orally|21 mg patch|150 mg orally/]]) {
    const text = smokingNote(smoker(), id).split("\nPlan\n")[1];
    assert.match(text, expected); assert.doesNotMatch(text, absent);
    assert.doesNotMatch(text, /counseling was completed|medication was prescribed|was administered|patient declined/);
  }
});
test("missing cessation safety review permits discussion but not a definite medication plan", () => {
  const rec = L.buildRecommendation(smoker({ smokingSafetyReviewed: false, smokingRenal: "unknown" }), { selectedSmokingPlanId: "varenicline" });
  assert.ok(rec.smokingSupport.selected); assert.equal(rec.smokingSupport.selected.ready, false);
  const text = N.buildNoteText(smoker({ smokingSafetyReviewed: false, smokingRenal: "unknown" }), rec);
  assert.match(text, /Complete the following before prescribing Varenicline/);
  assert.doesNotMatch(text, /Varenicline has been recommended/);
  assert.doesNotMatch(text, /1 mg twice daily from day 8/);
  assert.match(rec.smokingSupport.selected.schedule, /1 mg twice daily from day 8/);
});
test("pregnancy and breastfeeding require individualized medication review", () => {
  for (const patch of [{ pregnant: true }, { pregnant: null }, { smokingBreastfeeding: true }]) {
    const rec = L.buildRecommendation(smoker(patch));
    for (const item of rec.smokingSupport.options.filter(item => item.id !== "behavioral")) assert.equal(item.ready, false);
    assert.equal(rec.smokingSupport.options.find(item => item.id === "behavioral").ready, true);
    assert.doesNotMatch(smokingNote(smoker(patch), "varenicline"), /Varenicline has been recommended/);
  }
});
test("documented bupropion contraindications remain effective independently of group review", () => {
  for (const smokingSafetyReviewed of [true, false]) for (const patch of [{ smokingBupropionContra: true }, { smokingSeizure: true }]) {
    const data = smoker({ smokingSafetyReviewed, ...patch });
    const rec = L.buildRecommendation(data, { selectedSmokingPlanId: "bupropion" });
    assert.equal(rec.smokingSupport.selected, null);
    assert.ok(rec.smokingSupport.options.find(item => item.id === "bupropion").blockers.length);
    assert.doesNotMatch(N.buildNoteText(data, rec), /Bupropion SR has been recommended|bupropion SR 150 mg/);
  }
});
test("a serious varenicline reaction blocks that choice without excluding other options", () => {
  const rec = L.buildRecommendation(smoker({ smokingVareniclineReaction: true }), { selectedSmokingPlanId: "varenicline" });
  assert.equal(rec.smokingSupport.selected, null);
  assert.ok(rec.smokingSupport.options.find(item => item.id === "varenicline").blockers.length);
  assert.equal(rec.smokingSupport.options.find(item => item.id === "combinationNrt").ready, true);
});
test("varenicline uses renal-specific references and bupropion needs organ-function review", () => {
  for (const [smokingRenal, pattern] of [["normal", /1 mg twice daily from day 8/], ["impaired", /1 mg twice daily from day 8/], ["severe", /maximum of 0.5 mg twice daily/], ["dialysis", /no more than 0.5 mg orally daily/]]) {
    const rec = L.buildRecommendation(smoker({ smokingRenal }), { selectedSmokingPlanId: "varenicline" });
    assert.equal(rec.smokingSupport.selected.ready, true);
    assert.match(rec.smokingSupport.selected.schedule, pattern);
    if (["severe", "dialysis"].includes(smokingRenal)) assert.doesNotMatch(rec.smokingSupport.selected.schedule, /1 mg twice daily/);
  }
  assert.equal(L.buildRecommendation(smoker({ smokingRenal: "impaired" }), { selectedSmokingPlanId: "bupropion" }).smokingSupport.selected.ready, false);
  assert.doesNotMatch(smokingNote(smoker({ smokingRenal: "impaired" }), "bupropion"), /bupropion SR 150 mg/);
});
test("combination NRT dosing follows smoking quantity and time to the first cigarette", () => {
  for (const [smokingCigarettesPerDay, patch] of [[10, /14 mg patch daily for 6 weeks/], [11, /21 mg patch daily for 6 weeks/]]) {
    const rec = L.buildRecommendation(smoker({ smokingCigarettesPerDay }), { selectedSmokingPlanId: "combinationNrt" });
    assert.match(rec.smokingSupport.selected.schedule, patch);
    assert.match(rec.smokingSupport.selected.schedule, /gum 4 mg/);
  }
  assert.match(L.buildRecommendation(smoker({ smokingFirstCigarette: "after30" }), { selectedSmokingPlanId: "combinationNrt" }).smokingSupport.selected.schedule, /gum 2 mg/);
  for (const patch of [{ smokingCigarettesPerDay: null }, { smokingFirstCigarette: "unknown" }, { smokingCvdConcern: true }]) assert.equal(L.buildRecommendation(smoker(patch), { selectedSmokingPlanId: "combinationNrt" }).smokingSupport.selected.ready, false);
});
test("stable psychiatric history is not a contraindication; active instability requires review", () => {
  const data = smoker({ smokingPsychiatric: false });
  assert.equal(L.buildRecommendation(data, { selectedSmokingPlanId: "varenicline" }).smokingSupport.selected.ready, true);
  assert.equal(L.buildRecommendation(data, { selectedSmokingPlanId: "bupropion" }).smokingSupport.selected.ready, true);
  for (const selectedSmokingPlanId of ["varenicline", "bupropion"]) assert.equal(L.buildRecommendation(smoker({ smokingPsychiatric: true }), { selectedSmokingPlanId }).smokingSupport.selected.ready, false);
});
test("former smoking and urgent findings suppress the routine cessation pathway", () => {
  for (const patch of [{ smoking: "former" }, { smoking: "never" }, { smoking: "unknown" }, { spo2: 85 }]) {
    const data = smoker(patch), rec = L.buildRecommendation(data, { selectedSmokingPlanId: "varenicline" });
    assert.equal(rec.smokingSupport.selected, null); assert.equal(rec.smokingSupport.options.length, 0);
    assert.ok(!ids(rec).includes("smoking-cessation"));
    assert.doesNotMatch(N.buildNoteText(data, rec).split("\nPlan\n")[1], /Smoking cessation\n|Varenicline/);
  }
});
test("an active nonemergency episode defers cessation prescribing until stabilization", () => {
  const data = acute({ smoking: "current" }), rec = L.buildRecommendation(data, { selectedSmokingPlanId: "varenicline" });
  assert.ok(ids(rec).includes("postacute-smoking")); assert.equal(rec.smokingSupport.selected, null);
  assert.match(N.buildNoteText(data, rec), /definitive cessation medication plan was deferred/);
});
test("SOAP Assessment contains complete prose without colons, semicolons, or hyphens", () => {
  for (const data of [base(), poor({ priorIcu: true }), severe({ maintenanceOcs: true, maintenanceOcsDose: 10, egpa: "confirmed", nasalPolyps: true }), acute({ spo2: 85 }), { ...L.createEmptyState(), age: 45, acutePresentation: "active" }, base({ diagnosisContext: "suspected", dxChallenge: false, typicalSymptoms: null, controller: "unknown", reliever: "unknown" }), base({ controller: "none", reliever: "ics-formoterol" }), base({ currentBiologic: "omalizumab" })]) {
    const text = note(data).split("\nAssessment\n")[1].split("\n\nPlan")[0];
    assert.doesNotMatch(text, /[;:\-]/); assert.match(text, /\.$/);
    assert.doesNotMatch(text, /Current therapy:|Future-risk considerations:/);
  }
});
test("all seven biologic options provide tradeoffs, typical criteria, and patient-specific fit", () => {
  const rec = L.buildRecommendation(severe({ allergenDriven: true, perennialSensitization: true, totalIge: 100, igePretreatment: true }), { planSelections: initiation });
  assert.equal(rec.biologicCandidates.length, 7);
  for (const candidate of rec.biologicCandidates) {
    assert.ok(candidate.benefits && candidate.limitations && candidate.typicalCriteria && candidate.criteriaFit, candidate.id);
    assert.match(candidate.criteriaFit, /support the usual clinical criteria/);
  }
  assert.match(L.buildRecommendation(poor({ eosinophils: 450, ocsExacerbations: 2 })).biologicCandidates[0].criteriaFit, /Select the combined inhaled-regimen plus biologic plan only after reviewing/);
});
test("biologic wording distinguishes a present recommendation from future or provisional eligibility", () => {
  const current = severe(), now = note(current, "benralizumab", initiation);
  assert.match(now, /Benralizumab.*has been recommended for the current severe-asthma presentation/);
  assert.doesNotMatch(now, /Agent choice remained/);
  const future = poor({ eosinophils: 450 }), later = note(future, "benralizumab");
  assert.match(later, /Reassess Benralizumab.*at follow-up if control remains inadequate/);
  assert.match(later, /If treatment is subsequently initiated/);
  assert.doesNotMatch(later, /Benralizumab.*has been recommended/);
  const pending = severe({ diagnosisContext: "established", dxChallenge: false });
  assert.doesNotMatch(note(pending, "benralizumab"), /Benralizumab.*has been recommended/);
});
test("unverified high-dose SMART or an incompatible LABA combination does not establish prescribing readiness", () => {
  for (const patch of [{ controller: "ics-formoterol", reliever: "ics-formoterol", labaType: "formoterol" }, { reliever: "ics-formoterol" }]) {
    const data = severe(patch), rec = L.buildRecommendation(data);
    assert.ok(rec.biologicCandidates.every(item => !item.ready));
    assert.doesNotMatch(note(data, "benralizumab"), /Benralizumab.*has been recommended/);
    if (patch.controller === "ics-formoterol") assert.equal(rec.findings.severe.established, false);
  }
});
test("unknown age keeps cessation pharmacotherapy conditional", () => {
  const data = smoker({ age: null });
  assert.equal(L.buildRecommendation(data, { selectedSmokingPlanId: "varenicline" }).smokingSupport.selected.ready, false);
});
test("high-dose therapy remains manually selectable, with no high-dose shortcut", () => {
  assert.equal(Object.hasOwn(L.TREATMENT_PRESETS, "highDose"), false);
  const data = base({ controller: "ics-laba", icsDose: "high", reliever: "saba", labaType: "non-formoterol" }), context = L.getTreatmentContext(data);
  assert.equal(data.icsDose, "high"); assert.equal(data.controller, "ics-laba"); assert.equal(data.reliever, "saba");
  assert.equal(context.track, 2); assert.equal(context.incompatible, false);
  assert.doesNotMatch(context.description, /SMART|MART/);
});
test("missing drug-specific dosing leaves supported advanced options provisional", () => {
  const data = severe({ weightKg: null, allergenDriven: true, perennialSensitization: true, totalIge: null });
  const rec = L.buildRecommendation(data);
  for (const id of ["omalizumab", "reslizumab"]) {
    const option = rec.biologicCandidates.find(item => item.id === id);
    assert.ok(option); assert.equal(option.ready, false);
    assert.doesNotMatch(note(data, id), /Planned initiation|calculated reslizumab dose|adult asthma-table dose was/);
  }
  assert.match(note(data, "reslizumab"), /Verify weight before finalizing the 3 mg\/kg IV dose/);
  assert.doesNotMatch(note(data, "reslizumab"), /\d+ mg IV every 4 weeks/);
  assert.equal(rec.invalid, false); assert.ok(ids(rec).includes("step5-review"));
  assert.doesNotMatch(note(data), /Verified weight|total IgE/);
});
test("verified reslizumab weight yields exactly the labelled weight-based dose", () => {
  assert.match(note(severe({ weightKg: 72.5 }), "reslizumab", initiation), /217.5 mg IV every 4 weeks \(3 mg\/kg at verified weight 72.5 kg\)/);
  assert.equal(N.buildNoteText(severe({ weightKg: 0 }), L.buildRecommendation(severe({ weightKg: 0 }), { selectedBiologicId: "reslizumab" })), "");
});
test("routine and resolved-exacerbation follow-up do not invoke acute assessment", () => {
  for (const acutePresentation of ["none", "recent"]) {
    const data = base({ acutePresentation }); const rec = L.buildRecommendation(data);
    assert.equal(rec.findings.acute.active, false); assert.equal(rec.findings.acute.dischargeCriteriaDocumented, false);
    assert.ok(!ids(rec).some(id => id.startsWith("acute-")));
    const text = note(data);
    assert.equal((text.match(/\*\*\*/g) || []).length, 4);
    assert.doesNotMatch(text, /Respiratory rate:|SpO2:|discharge readiness|Treatment administered/);
    if (acutePresentation === "recent") {
      assert.equal(rec.findings.data.recentExacerbation, true);
      assert.match(text, /resolved exacerbation/); assert.match(text, /2-7 days.*if not already completed/);
    }
  }
});
test("active encounters add only acute placeholders and optional documented reassessment", () => {
  const text = note(acute());
  assert.equal((text.match(/\*\*\*/g) || []).length, 5);
  assert.doesNotMatch(text, /Documented reassessment showed/);
  const data = acute({ acuteReassessmentAvailable: true, acuteResponse: "improving", postTreatmentSpo2: 97 });
  assert.match(note(data), /Documented reassessment showed clinical response improving; SpO2 97%/);
  assert.equal(L.assessAcutePresentation(data).dischargeCriteriaDocumented, false);
});
test("recorded urgent acute findings survive switching to routine or resolved mode", () => {
  for (const acutePresentation of ["none", "recent"]) for (const patch of [{ acuteAirEntry: "silent" }, { acuteCannotDrink: true }, { acuteSpeech: "unable" }, { acuteLungFunctionPercent: 49 }, { acuteResponse: "worsening" }, { spo2: 85 }]) {
    const rec = L.buildRecommendation(base({ acutePresentation, ...patch }));
    assert.equal(rec.emergency, true, JSON.stringify(patch));
    assert.ok(!ids(rec).includes("continue")); assert.ok(!ids(rec).includes("routine-followup"));
  }
});
test("SOAP templates express actionable plans without inventing completed care", () => {
  const cases = [base(), poor(), severe(), acute(), acute({ spo2: 85 }), base({ acutePresentation: "recent" }),
    base({ managementPhase: "initial", controller: "none", reliever: "saba", sabaFrequency: "none" }),
    base({ stableMonths: 4, lungFunctionStable: true, riskReviewed: true, treatmentReviewed: true })];
  for (const data of cases) {
    const text = note(data);
    assert.doesNotMatch(text, /(?:was|were) (?:administered|vaccinated|counseled|transferred|discharged)|tests were completed|examination was normal|Counseled patient|Will start|not entered|selected|rationale trace/i);
    assert.match(text, /Review|Arrange|Follow up|recommended/);
  }
});

test("clinician-facing treatment references explain the existing regimens without changing clinical state", () => {
  const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
  assert.match(html, /AIR<\/strong> means anti-inflammatory reliever/);
  assert.match(html, /SMART<\/strong> means single maintenance and reliever therapy/);
  assert.match(html, /GINA calls this <strong>MART<\/strong>/);
  const airTable = html.split('id="air-smart-reference"')[1].split("</details>")[0];
  assert.doesNotMatch(airTable, /Daily limit:|U.S. prescribing:|12 total inhalations/);
  assert.match(M.MEDICATIONS.smartMedium.detail, /Maximum 12 inhalations in 24 hours, including all scheduled and reliever doses/);
  assert.match(M.MEDICATIONS.smartMedium.detail, /off-label/);
  assert.match(html, /Medium-dose SMART is not high-dose ICS/);
  for (const [id, dose] of [["smartLow", "1 inhalation twice daily"], ["smartMedium", "2 inhalations twice daily"]]) {
    const context = L.getTreatmentContext({ ...base(), ...L.TREATMENT_PRESETS[id] });
    assert.equal(context.step, id === "smartLow" ? "3" : "4");
    assert.ok(M.MEDICATIONS[id].noteSchedule.includes(dose));
    assert.ok(html.includes(dose));
  }
  assert.match(html, /Examples are not dose-equivalent substitutions/);
  assert.match(html, /Leave intensity as not assessed if the regimen cannot be verified/);
});

test("none and SABA shortcuts record current treatment without treating it as guideline-preferred care", () => {
  for (const id of ["none", "saba"]) {
    const data = { ...base({ managementPhase: "initial", currentBiologic: "none" }), ...L.TREATMENT_PRESETS[id] };
    const rec = L.buildRecommendation(data);
    assert.equal(rec.findings.treatment.maintenance, false);
    assert.equal(rec.findings.treatment.effectivePhase, "initial");
    assert.equal(rec.findings.severe.established, false);
    assert.ok(rec.findings.risk.factors.includes("absence of ICS protection"));
    assert.ok(ids(rec).includes("start-controller"));
    assert.equal(rec.findings.proposedMedicationId, null);
    assert.ok(rec.plan.groups.find(group => group.id === "controller").options.some(option => option.id === "air"));
    assert.equal(rec.findings.control.complete, id === "none");
    assert.equal(data.sabaFrequency, "unknown");
    const text = note(data);
    assert.doesNotMatch(text, /reliever was no reliever|Recommended continuation of.*SABA-only/);
    if (id === "none") assert.match(text, /No maintenance controller containing an inhaled corticosteroid was documented\. No reliever was documented/);
    else assert.match(text, /reliever was a short acting beta agonist/);
  }
});

test("new shortcut options preserve biologics, OCS exposure, urgent findings, and unknown counts", () => {
  const raw = { ...L.createEmptyState(), currentBiologic: "mepolizumab", maintenanceOcs: true, maintenanceOcsDose: 10, priorIcu: true, spo2: 85, acutePresentation: "active" };
  for (const id of ["none", "saba"]) {
    const d = { ...raw, ...L.TREATMENT_PRESETS[id] }, rec = L.buildRecommendation(d);
    assert.equal(d.currentBiologic, "mepolizumab"); assert.equal(d.maintenanceOcsDose, 10); assert.equal(d.priorIcu, true);
    assert.equal(d.ocsExacerbations, null); assert.equal(d.hospitalExacerbations, null);
    assert.equal(rec.emergency, true); assert.ok(ids(rec).includes("urgent"));
    assert.ok(!ids(rec).includes("start-controller"));
  }
});

test("direct-choice questions retain every original value and explicit unknown option", () => {
  const context = { window: {} }; vm.runInNewContext(fs.readFileSync(path.join(__dirname, "input-schema.js"), "utf8"), context);
  for (const [key, values] of Object.entries({ symptomDays: ["unknown", "none", "one-two", "three", "four-six", "daily"], nightWaking: ["unknown", "none", "less-weekly", "weekly-plus"], sabaFrequency: ["unknown", "none", "one-two", "more-two"], acutePresentation: ["unknown", "none", "active", "recent"] })) {
    const field = context.window.asthmaInputSchema[key];
    assert.equal(field.compact, true); assert.equal(field.quickChoices, true);
    assert.deepEqual(Array.from(field.options, option => option[0]), values);
    assert.equal(L.createEmptyState()[key], key === "acutePresentation" ? "none" : "unknown");
  }
});
