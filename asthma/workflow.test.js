const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const L = require("./logic.js");
const N = require("./notes.js");

const routine = (patch = {}) => ({ ...L.createEmptyState(), age: 45, managementPhase: "followup", diagnosisContext: "established", dxChallenge: true,
  controller: "ics-formoterol", reliever: "ics-formoterol", icsDose: "medium", labaType: "formoterol", symptomDays: "none", nightWaking: "none",
  activityLimitation: false, ocsExacerbations: 0, hospitalExacerbations: 0, lamaAddon: false, maintenanceOcs: false, pregnant: false, ...patch });
const poor = patch => routine({ symptomDays: "daily", nightWaking: "weekly-plus", activityLimitation: true, ocsExacerbations: 2, eosinophils: 450, ...patch });
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
test("language cleanup and disclosure types retain clear clinical input and reference structure", () => {
  const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
  const schemaContext = { window: { asthmaInhalers: require("./inhalers.js") } };
  require("node:vm").runInNewContext(fs.readFileSync(path.join(__dirname, "input-schema.js"), "utf8"), schemaContext);
  const schema = schemaContext.window.asthmaInputSchema;
  assert.match(html, /Structured decision support for the typical encounter for an adult patient with asthma\./);
  assert.match(html, /SOAP notes produced from this application will require editing to incorporate patient specific nuance/);
  assert.doesNotMatch(html, /workflow-nav|form-instructions|Contributors|Diagnosis, treatment review, exacerbation care|Other findings and add-ons are preserved|These are not treatment recommendations/);
  assert.match(html, /id="air-smart-reference" class="[^"]*reference-disclosure/);
  assert.match(html, /id="treatment-addons" class="[^"]*input-disclosure/);
  assert.equal(schema.currentBiologic.hint, undefined);
  assert.equal(Object.hasOwn(schema, "treatmentReviewed"), false);
  for (const [key, value] of Object.entries(L.TREATMENT_BARRIER_DEFAULTS)) assert.equal(schema[key].uncheckedValue, value, key);
});
test("unknown maintenance OCS is individually confirmed for a possible step-down", () => {
  const data = routine({ stableMonths: 4, lungFunctionStable: true, maintenanceOcs: null });
  const rec = build(data);
  assert.ok(rec.plan.confirmations.some(item => item.key === "maintenanceOcs"));
  assert.equal(rec.plan.groups.find(item => item.id === "controller").options.some(item => item.id === "stepdown"), false);
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
  const rec = build(poor(), { controller: "continue-biologic", lama: "defer" }, { selectedBiologicId: "benralizumab" });
  assert.equal(rec.findings.severe.highIntensity, false);
  assert.equal(rec.findings.severe.established, true);
  assert.equal(rec.biologicCandidates.find(item => item.id === "benralizumab").ready, true);
  assert.doesNotMatch(rec.biologicCandidates[0].prerequisites.join(" "), /high-dose.*trial/);
  assert.match(text(rec), /Severe asthma and the prior optimized treatment course were reviewed/);
  assert.match(text(rec), /Benralizumab.*has been recommended/);
  assert.doesNotMatch(text(rec), /500\/50|a high corticosteroid dose supported/);
});
test("history alone does not bypass current optimization or biologic prerequisites", () => {
  for (const patch of [{ technique: "unknown", treatmentReviewed: false }, { technique: "incorrect" }, { adherence: "suboptimal" }, { accessBarrier: true }]) {
    const rec = build(poor(patch), { controller: "continue-biologic" }, { selectedBiologicId: "benralizumab" });
    assert.ok(rec.biologicCandidates.every(item => !item.ready));
    assert.doesNotMatch(text(rec), /Benralizumab.*has been recommended/);
  }
});
test("a historical severe diagnosis does not make a low-dose foundation ready for new biologics", () => {
  const rec = build(poor({ icsDose: "low" }), { controller: "continue-biologic" }, { selectedBiologicId: "benralizumab" });
  assert.equal(rec.biologicCandidates.length, 0);
  assert.equal(rec.plan.selections.controller, null);
  assert.doesNotMatch(text(rec), /Benralizumab.*has been recommended|30 mg SC every/);
});
test("unknown risks produce targeted confirmations, not reassuring note statements", () => {
  const rec = build(routine({ activityLimitation: null, stableMonths: 4, lungFunctionStable: true }));
  for (const key of ["recentExacerbation", "priorIcu", "respiratoryInfection", "travelling"]) assert.ok(rec.plan.confirmations.some(item => item.key === key), key);
  assert.deepEqual(rec.findings.control.missingFields, ["activityLimitation"]);
  assert.equal(rec.plan.confirmations.some(item => item.key === "activityLimitation"), false);
  assert.doesNotMatch(text(rec), /No prior ICU|no activity limitation|well controlled/);
  assert.equal(group(rec, "controller").options.some(item => item.id === "stepdown"), false);
});
test("LAMA selection needs known absence and never duplicates a triple inhaler", () => {
  const unknown = build(poor({ lamaAddon: null }), { lama: "add" });
  assert.equal(group(unknown, "lama").selected, null);
  assert.ok(unknown.plan.confirmations.some(item => item.key === "lamaAddon"));
  for (const patch of [{ lamaAddon: true }, { controller: "triple" }]) assert.equal(group(build(poor(patch)), "lama"), undefined);
  const selected = build(poor(), { controller: "continue", lama: "add" });
  assert.match(text(selected), /Add tiotropium Respimat.*1.25 mcg.*2 inhalations once daily/s);
  assert.doesNotMatch(text(selected), /500\/50|A tiotropium add-on was considered/);
});
test("unreviewed optimization cannot become a definite add-on prescription", () => {
  const rec = build(poor({ adherence: "unknown", technique: "unknown", accessBarrier: null, lamaAddon: false }), { lama: "add" });
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
test("AIR-only follow-up always presents a step-up decision instead of copying competing alternatives", () => {
  const data = routine({ controller: "none", icsDose: "unknown", symptomDays: "three", adherence: "unknown", technique: "unknown", accessBarrier: null });
  const rec = build(data);
  const controller = group(rec, "controller");
  assert.equal(controller.optimizationReviewRequired, true);
  for (const id of ["smartLow", "track2"]) assert.ok(controller.options.find(option => option.id === id).blockers.length);
  assert.ok(controller.options.some(option => option.id === "assessment" && !option.blockers.length));
  assert.ok(rec.actions.some(action => action.id === "optimize"));
  assert.match(text(rec), /Controller and reliever plan: \*\*\*/);
  assert.doesNotMatch(text(rec), /A step-up.*was considered|Track 2 regimen could|Start Low-dose SMART|160\/4.5/);
});
test("selected low-dose SMART produces a definitive regimen without the Track 2 alternative", () => {
  const data = routine({ controller: "none", icsDose: "unknown", symptomDays: "three" });
  const rec = build(data, { controller: "smartLow" });
  assert.equal(group(rec, "controller").optimizationReviewRequired, false);
  assert.equal(rec.plan.selections.controller, "smartLow");
  assert.match(text(rec), /Change to Low-dose SMART.*160\/4.5.*1 inhalation twice daily plus 1 as needed/s);
  assert.doesNotMatch(text(rec), /Controller and reliever plan:|Track 2 regimen could|was considered after verification|Airsupra/);
  assert.deepEqual(rec.medications.map(item => item.id), ["smartLow"]);
});
test("selected AIR-only follow-up Track 2 plan documents only the chosen controller and reliever", () => {
  const data = routine({ controller: "none", icsDose: "unknown", symptomDays: "three" });
  const pending = build(data, { controller: "track2" });
  assert.match(text(pending), /Start low-dose maintenance ICS-LABA/);
  assert.match(text(pending), /Compatible reliever and dosing: \*\*\*/);
  assert.doesNotMatch(text(pending), /Start or adjust|Low-dose SMART|Budesonide-formoterol 160/);
  const selected = build(data, { controller: "track2", reliever: "airsupra" });
  assert.match(text(selected), /albuterol-budesonide.*2 inhalations as needed/s);
  assert.doesNotMatch(text(selected), /Controller and reliever plan:|Compatible reliever and dosing:|SMART.*was considered/);
  assert.deepEqual(selected.medications.map(item => item.id), ["airsupra"]);
  assert.equal(data.controller, "none");
  assert.equal(selected.findings.treatment.airOnly, true);
});
test("unreviewed optimization rejects an initiation selection without hiding the decision controls", () => {
  const data = routine({ controller: "none", icsDose: "unknown", symptomDays: "three", adherence: "unknown", technique: "unknown", accessBarrier: null });
  for (const id of ["smartLow", "track2"]) {
    const rec = build(data, { controller: id });
    assert.equal(rec.plan.selections.controller, null);
    assert.ok(group(rec, "controller").options.find(option => option.id === id).blockers.length);
    assert.ok(rec.cautions.some(item => /previous controller strategy/.test(item)));
    assert.match(text(rec), /Controller and reliever plan: \*\*\*/);
    assert.doesNotMatch(text(rec), /Change to Low-dose SMART|Start low-dose maintenance ICS-LABA|A step-up.*was considered/);
  }
});
test("step-up fallback cannot copy an unchosen controller alternative", () => {
  assert.equal(N.ACTION_NOTES.stepup(), "Controller and reliever plan: ***.");
  const data = routine({ controller: "ics", icsDose: "low", reliever: "saba", sabaFrequency: "more-two", symptomDays: "three" });
  const smart = build(data, { controller: "smartLow" });
  assert.match(text(smart), /Replace the previous maintenance ICS inhaler/);
  const track2 = build(data, { controller: "track2", reliever: "saba" });
  assert.match(text(track2), /Change to low-dose maintenance ICS-LABA/);
  assert.match(text(track2), /Reliever product, strength, and schedule: \*\*\*/);
  assert.doesNotMatch(text(track2), /Start or adjust|Budesonide-formoterol 160|SMART.*was considered/);
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

test("the two retired checkboxes are absent from schema and clinical state", () => {
  const d = L.normalizeState({ optimizedTherapy: true, severeAsthmaEstablished: true });
  for (const key of ["optimizedTherapy", "severeAsthmaEstablished"]) assert.equal(Object.hasOwn(d, key), false);
  assert.equal(L.classifySevereAsthmaState(poor()).established, false);
  const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
  const inputSection = html.split('id="treatment-addons"')[1].split('<section class="panel" aria-labelledby="diagnosis-heading"')[0];
  assert.doesNotMatch(inputSection, /optimizedTherapy|severeAsthmaEstablished|severe-asthma-examples/);
});
test("biologic matching alone does not become initiation even with a selected agent", () => {
  const rec = build(poor(), { controller: "continue" }, { selectedBiologicId: "benralizumab" });
  assert.equal(rec.biologicCandidates.find(item => item.id === "benralizumab").eligibleForReview, true);
  assert.equal(rec.biologicCandidates.find(item => item.id === "benralizumab").ready, false);
  assert.match(text(rec), /Reassess Benralizumab/);
  assert.doesNotMatch(text(rec), /Benralizumab.*has been recommended|30 mg SC every/);
});
test("combined plan without an agent reserves a focused placeholder, not a guessed drug", () => {
  const rec = build(poor(), { controller: "continue-biologic" });
  assert.equal(rec.plan.selections.controller, "continue-biologic");
  assert.match(text(rec), /Biologic agent and dosing: \*\*\*/);
  assert.doesNotMatch(text(rec), /LAMA add-on decision:|Benralizumab.*has been recommended|500\/50/);
});
test("combined plan and selected ready agent produce a complete matched medication plan", () => {
  const rec = build(poor(), { controller: "continue-biologic" }, { selectedBiologicId: "benralizumab" });
  assert.match(text(rec), /Continue the current ICS-containing controller/);
  assert.match(text(rec), /Benralizumab.*has been recommended/);
  assert.match(text(rec), /30 mg SC every 4 weeks for the first 3 doses, then every 8 weeks/);
  assert.doesNotMatch(text(rec), /Controller and reliever plan:|LAMA add-on decision:|Encounter Treatment Plan|chosen below|500\/50/);
  assert.deepEqual(rec.medications.map(item => item.id), ["benralizumab"]);
});
test("missing prescribing prerequisites disable initiation and retain an assessment option", () => {
  for (const patch of [{ pregnant: null }, { ocsExacerbations: null }, { dxChallenge: false }, { age: null }]) {
    const rec = build(poor(patch), { controller: "continue-biologic" }, { selectedBiologicId: "benralizumab" });
    assert.equal(rec.plan.selections.controller, "assess-biologic");
    assert.equal(rec.findings.severe.established, false);
    assert.equal(rec.biologicCandidates.find(item => item.id === "benralizumab").ready, false);
    assert.match(text(rec), /Complete severe-asthma treatment-history review/);
    assert.doesNotMatch(text(rec), /Benralizumab.*has been recommended|30 mg SC every/);
  }
});
test("dosing changes downgrade a previously selected initiation plan with an explanation", () => {
  const rec = build(poor({ weightKg: null }), { controller: "continue-biologic" }, { selectedBiologicId: "reslizumab" });
  assert.equal(rec.plan.selections.controller, "assess-biologic");
  assert.ok(rec.cautions.some(item => /initiation was changed to an assessment plan/.test(item)));
  assert.match(text(rec), /Verify weight before finalizing/);
  assert.doesNotMatch(text(rec), /Reslizumab.*has been recommended|\d+ mg IV every/);
});
test("existing biologic treatment leads to response review instead of a second initiation", () => {
  const rec = build(poor({ currentBiologic: "mepolizumab" }), { controller: "continue-biologic" }, { selectedBiologicId: "benralizumab" });
  assert.equal(rec.plan.selections.controller, "assess-biologic");
  assert.equal(group(rec, "controller").options.some(item => item.id === "continue-biologic"), false);
  assert.match(text(rec), /Assess response to Mepolizumab/);
  assert.doesNotMatch(text(rec), /Benralizumab.*has been recommended|30 mg SC every/);
});
test("active and urgent episodes never acquire reviewed biologic eligibility from a stored plan", () => {
  for (const patch of [{ spo2: 85 }, { acutePresentation: "active" }]) {
    const rec = build(poor(patch), { controller: "continue-biologic" }, { selectedBiologicId: "benralizumab" });
    assert.deepEqual(rec.plan.groups, []);
    assert.equal(rec.findings.severe.clinicianReviewed, false);
    assert.doesNotMatch(text(rec), /Benralizumab|add on biologic therapy/);
  }
});
test("known suspected EGPA keeps initiation pending despite clinical plan selection", () => {
  const rec = build(poor({ egpa: "suspected" }), { controller: "continue-biologic" }, { selectedBiologicId: "benralizumab" });
  assert.equal(rec.plan.selections.controller, "assess-biologic");
  assert.match(text(rec), /Complete suspected EGPA and organ-involvement assessment/);
  assert.doesNotMatch(text(rec), /Benralizumab.*has been recommended|30 mg SC every/);
});
test("a chosen biologic plan does not copy an unselected azithromycin alternative", () => {
  const rec = build(poor({ eosinophils: 0, feno: 5, perennialSensitization: false }), { controller: "continue-biologic" }, { selectedBiologicId: "tezepelumab" });
  assert.match(text(rec), /Tezepelumab.*has been recommended/);
  assert.doesNotMatch(text(rec), /azithromycin|Additional nonbiologic treatment decision/i);
});
test("an unselected encounter plan does not imply that a phenotype match must wait for follow-up", () => {
  const rec = build(poor(), {}, { selectedBiologicId: "benralizumab" });
  assert.match(text(rec), /Benralizumab.*matches the documented phenotype/);
  assert.match(text(rec), /Biologic initiation decision: \*\*\*/);
  assert.doesNotMatch(text(rec), /Benralizumab.*has been recommended|Reassess Benralizumab.*at follow-up|30 mg SC every/);
});
