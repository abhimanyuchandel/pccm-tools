const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const L = require("./logic.js");
const N = require("./notes.js");

const routine = (patch = {}) => ({ ...L.createEmptyState(), age: 45, managementPhase: "followup", diagnosisContext: "established", dxChallenge: true,
  controller: "ics-formoterol", reliever: "ics-formoterol", icsDose: "medium", labaType: "formoterol", symptomDays: "none", nightWaking: "none",
  activityLimitation: false, ocsExacerbations: 0, hospitalExacerbations: 0, treatmentReviewed: true, pregnant: false, ...patch });
const poor = patch => routine({ symptomDays: "daily", nightWaking: "weekly-plus", activityLimitation: true, ocsExacerbations: 2, eosinophils: 450, optimizedTherapy: true, ...patch });
const build = (data, planSelections = {}, other = {}) => L.buildRecommendation(data, { ...other, planSelections });
const text = rec => N.buildNoteText(rec.findings.data, rec);
const group = (rec, id) => rec.plan.groups.find(item => item.id === id);

test("only five nonprescriptive current-treatment shortcuts remain", () => {
  assert.deepEqual(Object.keys(L.TREATMENT_PRESETS), ["none", "saba", "air", "smartLow", "smartMedium"]);
  const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
  assert.equal((html.match(/data-treatment-preset=/g) || []).length, 5);
  assert.doesNotMatch(html, /high-dose ICS-LABA shortcut|data-treatment-preset="highDose"/i);
  assert.match(fs.readFileSync(path.join(__dirname, "input-schema.js"), "utf8"), /\["high", "High dose"\]/);
});
test("a retired risk review flag cannot fill in negative findings", () => {
  const d = L.normalizeState({ riskReviewed: true });
  assert.equal(Object.hasOwn(d, "riskReviewed"), false);
  for (const key of ["activityLimitation", "recentExacerbation", "priorIcu", "pregnant", "respiratoryInfection", "travelling"]) assert.equal(d[key], null, key);
  assert.equal(L.normalizeState({ riskReviewed: true, priorIcu: true }).priorIcu, true);
});
test("medium MART is Step 4 alone and Step 5 with add-ons without high-dose relabeling", () => {
  assert.equal(L.getTreatmentContext(routine()).step, "4");
  for (const patch of [{ lamaAddon: true }, { currentBiologic: "benralizumab" }, { maintenanceOcs: true }]) {
    const tx = L.getTreatmentContext(routine(patch));
    assert.equal(tx.step, "5"); assert.match(tx.description, /medium-dose ICS-formoterol MART/);
    assert.doesNotMatch(tx.description, /high-dose/);
  }
});
test("longitudinal severe-asthma evidence supports optimized medium MART biologic review", () => {
  const rec = build(poor({ severeAsthmaEstablished: true }), { controller: "continue", lama: "defer" }, { selectedBiologicId: "benralizumab" });
  assert.equal(rec.findings.severe.highIntensity, false);
  assert.equal(rec.findings.severe.established, true);
  assert.equal(rec.biologicCandidates.find(item => item.id === "benralizumab").ready, true);
  assert.doesNotMatch(rec.biologicCandidates[0].prerequisites.join(" "), /high-dose.*trial/);
  assert.match(text(rec), /Severe asthma had been established by a prior longitudinal assessment/);
  assert.match(text(rec), /Benralizumab.*has been recommended/);
  assert.doesNotMatch(text(rec), /500\/50|a high corticosteroid dose supported/);
});
test("history alone does not bypass current optimization or biologic prerequisites", () => {
  for (const patch of [{ severeAsthmaEstablished: null }, { optimizedTherapy: null }, { technique: "incorrect" }, { adherence: "suboptimal" }, { accessBarrier: true }]) {
    const rec = build(poor({ severeAsthmaEstablished: true, ...patch }), {}, { selectedBiologicId: "benralizumab" });
    assert.ok(rec.biologicCandidates.every(item => !item.ready));
    assert.doesNotMatch(text(rec), /Benralizumab.*has been recommended/);
  }
});
test("a historical severe diagnosis does not make a low-dose foundation ready for new biologics", () => {
  const rec = build(poor({ icsDose: "low", severeAsthmaEstablished: true }), {}, { selectedBiologicId: "benralizumab" });
  assert.equal(rec.biologicCandidates.find(item => item.id === "benralizumab").ready, false);
  assert.match(text(rec), /Verify an appropriate current medium- or high-dose ICS-LABA foundation/);
  assert.doesNotMatch(text(rec), /Benralizumab.*has been recommended|30 mg SC every/);
});
test("unknown risks produce targeted confirmations, not reassuring note statements", () => {
  const rec = build(routine({ activityLimitation: null, stableMonths: 4, lungFunctionStable: true }));
  for (const key of ["activityLimitation", "recentExacerbation", "priorIcu", "respiratoryInfection", "travelling"]) assert.ok(rec.plan.confirmations.some(item => item.key === key), key);
  assert.doesNotMatch(text(rec), /No prior ICU|no activity limitation|well controlled/);
  assert.equal(group(rec, "controller").options.some(item => item.id === "stepdown"), false);
});
test("LAMA selection needs known absence and never duplicates a triple inhaler", () => {
  const unknown = build(poor({ treatmentReviewed: false }), { lama: "add" });
  assert.equal(group(unknown, "lama").selected, null);
  assert.ok(unknown.plan.confirmations.some(item => item.key === "lamaAddon"));
  for (const patch of [{ lamaAddon: true }, { controller: "triple" }]) assert.equal(group(build(poor(patch)), "lama"), undefined);
  const selected = build(poor(), { controller: "continue", lama: "add" });
  assert.match(text(selected), /Add tiotropium Respimat.*1.25 mcg.*2 inhalations once daily/s);
  assert.doesNotMatch(text(selected), /500\/50|A tiotropium add-on was considered/);
});
test("unreviewed optimization cannot become a definite add-on prescription", () => {
  const rec = build(poor({ treatmentReviewed: false, lamaAddon: false }), { lama: "add" });
  assert.equal(group(rec, "lama").selected, null);
  assert.ok(group(rec, "lama").options.find(item => item.id === "add").blockers.some(item => /technique, adherence, and access/.test(item)));
  assert.doesNotMatch(text(rec), /Add tiotropium Respimat/);
});
test("documented optimization concerns retain priority over routine step-down", () => {
  const stable = routine({ stableMonths: 4, lungFunctionStable: true, recentExacerbation: false, priorIcu: false, respiratoryInfection: false, travelling: false });
  for (const patch of [{ adherence: "suboptimal" }, { technique: "incorrect" }, { accessBarrier: true }]) {
    const rec = build({ ...stable, ...patch }, { controller: "stepdown" });
    assert.equal(rec.plan.selections.controller, null);
    assert.doesNotMatch(text(rec), /Reduce the maintenance ICS regimen/);
  }
});
test("controller and reliever choice removes competing dosing from the note and display", () => {
  const data = routine({ managementPhase: "initial", controller: "none", reliever: "saba", sabaFrequency: "none", symptomDays: "one-two" });
  const unresolved = build(data);
  assert.match(text(unresolved), /Controller and reliever plan: \*\*\*/);
  assert.doesNotMatch(text(unresolved), /Start AIR|160\/4.5/);
  const selected = build(data, { controller: "air" });
  assert.match(text(selected), /Start AIR-only.*160\/4.5.*1 inhalation as needed/s);
  assert.doesNotMatch(text(selected), /Controller and reliever plan:|Airsupra|500\/50/);
  assert.deepEqual(selected.medications.map(item => item.id), ["air"]);
});
test("Track 2 choice requires a compatible reliever choice, not an inferred prescription", () => {
  const data = routine({ icsDose: "low", symptomDays: "daily", activityLimitation: true });
  const pending = build(data, { controller: "track2" });
  assert.match(text(pending), /medium-dose maintenance ICS-LABA/);
  assert.match(text(pending), /Compatible reliever and dosing: \*\*\*/);
  const selected = build(data, { controller: "track2", reliever: "airsupra" });
  assert.match(text(selected), /Albuterol-budesonide|albuterol-budesonide/);
  assert.doesNotMatch(text(selected), /Change to Medium-dose SMART|Budesonide-formoterol 160/);
});
test("step-down is explicit and has matching dosing and follow-up", () => {
  const data = routine({ stableMonths: 4, lungFunctionStable: true, recentExacerbation: false, priorIcu: false, respiratoryInfection: false, travelling: false });
  const rec = build(data, { controller: "stepdown" });
  assert.match(text(rec), /1 inhalation twice daily/);
  assert.match(text(rec), /Follow up in 4-8 weeks/);
  assert.doesNotMatch(text(rec), /Continue the current ICS-containing controller|about 3 months/);
  assert.equal(group(build({ ...data, pregnant: true }, { controller: "stepdown" }), "controller").selected, null);
});
test("regeneration rejects a previously valid choice that is now incompatible", () => {
  const rec = build(routine({ controller: "ics-laba", labaType: "non-formoterol" }), { controller: "continue", lama: "add" });
  assert.equal(rec.plan.selections.controller, null);
  assert.equal(rec.plan.selections.lama, undefined);
  assert.ok(rec.cautions.some(item => /previous controller strategy/.test(item)));
  assert.doesNotMatch(text(rec), /Continue the current ICS-containing controller/);
});
test("acute and urgent findings suppress elective selections and placeholders", () => {
  for (const patch of [{ spo2: 85 }, { acutePresentation: "active" }]) {
    const rec = build(poor(patch), { controller: "highDose", lama: "add" }, { selectedBiologicId: "benralizumab" });
    assert.deepEqual(rec.plan.groups, []);
    assert.doesNotMatch(text(rec), /Controller and reliever plan|500\/50|Add tiotropium|Benralizumab/);
  }
});
test("seizure history is collected once and used for each drug's distinct safety rule", () => {
  const rec = build(routine({ smoking: "current", smokingSafetyReviewed: true, smokingSeizure: true, smokingRenal: "normal" }));
  assert.ok(rec.smokingSupport.options.find(item => item.id === "bupropion").blockers.length);
  assert.ok(rec.smokingSupport.options.find(item => item.id === "varenicline").prerequisites.some(item => /seizure/.test(item)));
  assert.equal(rec.smokingSupport.options.find(item => item.id === "varenicline").blockers.length, 0);
});
test("shared selected actions produce identical display and note instructions", () => {
  const rec = build(poor(), { controller: "continue", lama: "add" });
  for (const action of rec.actions.filter(item => item.selectedPlan)) assert.ok(text(rec).includes(action.text));
  assert.deepEqual(build(poor(), { controller: "continue", lama: "add" }), rec);
});
