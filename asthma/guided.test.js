const test = require("node:test");
const assert = require("node:assert/strict");
const L = require("./logic.js"), N = require("./notes.js"), I = require("./inhalers.js"), W = require("./workflow.js");
const base = patch => ({ ...L.createEmptyState(), age: 45, managementPhase: "followup", diagnosisContext: "established", typicalSymptoms: true, dxChallenge: true, controller: "ics-formoterol", icsDose: "medium", reliever: "ics-formoterol", symptomDays: "none", nightWaking: "none", activityLimitation: false, ocsExacerbations: 0, hospitalExacerbations: 0, urgentRedFlags: false, lamaAddon: false, maintenanceOcs: false, pregnant: false, ...patch });
const product = (preset, patch = {}) => base({ treatmentEntry: "product", currentControllerProduct: I.PRESETS[preset].productId, currentControllerPreset: preset, currentRelieverProduct: "albuterol", sabaFrequency: "none", ...patch });
const build = (d, planSelections = {}) => L.buildRecommendation(d, { planSelections });
const note = rec => N.buildNoteText(rec.findings.data, rec);
const steps = (d, opts = {}) => W.steps(L.normalizeState(d), build(d), { inhalers: I, ...opts });
const poor = patch => base({ symptomDays: "daily", nightWaking: "weekly-plus", activityLimitation: true, ocsExacerbations: 2, ...patch });

test("routine guided workflow exposes no acute measurements or unnecessary tests", () => {
  const routine = steps(base());
  const fields = routine.flatMap(s => s.fields);
  assert.ok(!fields.includes("respiratoryRate") && !fields.includes("spo2"));
  assert.ok(!fields.includes("weightKg") && !fields.includes("fev1Pre"));
  assert.equal(routine.at(-1).id, "review");
  assert.ok(routine.every(s => s.fields.length <= 6));
  assert.ok(steps(base(), { testing: true }).some(s => s.fields.includes("fev1Pre")));
  assert.ok(steps(base({ diagnosisContext: "suspected" })).some(s => s.id === "pre-spirometry"));
});
test("conditional smoking, phenotype, stability and acute screens follow available findings", () => {
  assert.ok(steps(base({ smoking: "current" })).some(s => s.id === "cessation-safety"));
  assert.ok(!steps(base({ smoking: "former" })).some(s => s.id === "cessation-safety"));
  assert.ok(steps(base(), { phenotype: true }).some(s => s.id === "allergic"));
  assert.ok(steps(base()).some(s => s.id === "stability"));
  const active = base({ acutePresentation: "active" });
  assert.ok(steps(active).some(s => s.id === "acute-observations"));
  assert.ok(!steps(active).some(s => s.id === "acute-response"));
  assert.ok(steps({ ...active, acuteReassessmentAvailable: true }).some(s => s.id === "acute-response"));
  assert.ok(!steps(base({ acutePresentation: "recent" })).some(s => s.id === "acute-observations"));
  assert.ok(steps(base({ spo2: 85, roomAir: true })).some(s => s.id === "acute-observations"));
});
test("navigation reconciles a disappearing conditional step to a previous applicable step", () => {
  const old = steps(base(), { testing: true });
  const next = steps(base());
  assert.equal(W.reconcileStep(old, next, "pre-spirometry"), "diagnostic-history");
  assert.equal(W.reconcileStep(old, next, "context"), "context");
});
test("every preset has verified product metadata, a source, and an explicit role", () => {
  for (const p of Object.values(I.PRESETS)) {
    assert.ok(I.PRODUCTS[p.productId]);
    assert.match(I.PRODUCTS[p.productId].source.url, /^https:\/\/dailymed/);
    assert.match(I.prescription(p), new RegExp(p.strength.replace(/\//g, "\\/")));
    assert.ok(["maintenance", "air", "smartLow", "smartMedium", "smartOnce"].includes(p.role));
  }
  assert.equal(Object.values(I.PRODUCTS).some(p => ["laba", "laba-lama"].includes(p.category)), false);
});
test("brand choice alone cannot establish SMART or a verified ICS dose", () => {
  const d = L.normalizeState(product("symbicort-smart-medium", { currentControllerPreset: "unknown", reliever: "saba" }));
  assert.equal(d.controller, "ics-formoterol"); assert.equal(d.icsDose, "unknown"); assert.equal(d.reliever, "saba");
  assert.notEqual(L.getTreatmentContext(d).track, 1);
});
test("AIR and maintenance schedules classify separately and SMART remains medium at Step 4-5", () => {
  for (const brand of ["symbicort", "breyna"]) {
    assert.equal(L.getTreatmentContext(product(`${brand}-air`)).airOnly, true);
    assert.equal(L.getTreatmentContext(product(`${brand}-smart-low`)).step, "3");
    assert.equal(L.getTreatmentContext(product(`${brand}-smart-medium`)).step, "4");
    assert.equal(L.getTreatmentContext(product(`${brand}-160-bid`)).track, 2);
    assert.equal(L.normalizeState(product(`${brand}-smart-medium`)).icsDose, "medium");
  }
});
test("exact product/device metadata classifies ICS without invented medium tiers", () => {
  for (const [id, expected] of [["advair-diskus-100-50", "low"], ["wixela-250-50", "medium"], ["advair-hfa-230-21", "high"], ["breo-100", "low"], ["breo-200", "high"], ["qvar-160", "medium"], ["arnuity-200", "high"], ["pulmicort-360", "medium"], ["fluticasone-hfa-110", "medium"], ["trelegy-100", "low"], ["breztri-asthma", "medium"]]) assert.equal(L.normalizeState(product(id)).icsDose, expected, id);
  const uncertain = L.normalizeState(product("dulera-100", { icsDose: "unknown" }));
  assert.equal(uncertain.icsDose, "unknown");
  assert.equal(Object.values(I.PRESETS).some(p => ["breo", "arnuity"].includes(p.productId) && p.intensity === "medium"), false);
  assert.equal(I.PRESETS["spiriva-asthma"].strength, "1.25");
});
test("mismatched preset and product cannot supply another product's intensity or dosing", () => {
  const d = L.normalizeState(product("breo-200", { currentControllerProduct: "advair-diskus" }));
  assert.equal(d.icsDose, "unknown");
  assert.doesNotMatch(I.currentDescriptions(d).join(), /Breo|200\/25/);
});
test("Dulera and non-formoterol maintenance products cannot silently become SMART", () => {
  for (const id of ["dulera-100", "breo-100", "advair-diskus-250-50", "symbicort-80-bid"]) {
    const d = product(id, { currentRelieverProduct: "air-symbicort", icsDose: "medium" });
    assert.equal(L.getTreatmentContext(d).incompatible, true, id);
    assert.equal(build(d, { controller: "continue" }).plan.selections.controller, null);
  }
});
test("class entry ignores stale product history without discarding other findings", () => {
  const d = L.normalizeState(product("breo-200", { treatmentEntry: "class", controller: "ics-formoterol", icsDose: "low", reliever: "ics-formoterol", eosinophils: 400 }));
  assert.equal(d.icsDose, "low"); assert.equal(d.eosinophils, 400);
  assert.deepEqual(I.currentDescriptions(d), []);
});
test("age and gender enter readable Subjective; proposed prescriptions are never current medications", () => {
  const d = product("wixela-250-50", { gender: "female" });
  const rec = build(d, { controller: "continue" });
  const text = note(rec), subjective = text.split("\n\nObjective")[0];
  assert.match(subjective, /This 45-year-old woman was seen for asthma follow-up/);
  assert.match(subjective, /Current controller and rescue medications are: Wixela Inhub 250\/50/);
  assert.match(subjective, /Generic albuterol HFA 90/);
  assert.match(text.split("\nPlan\n")[1], /Continue Wixela Inhub 250\/50/);
  assert.match(note(build(base({ age: null, gender: "unknown" }))), /This patient was seen/);
});
test("selected Track 2 prescriptions replace placeholders and do not copy unselected brands", () => {
  const d = poor({ controller: "ics", icsDose: "low", reliever: "saba", sabaFrequency: "more-two" });
  const rec = build(d, { controller: "track2", controllerProduct: "wixela-100-50", relieverProduct: "airsupra" });
  const plan = note(rec).split("\nPlan\n")[1];
  assert.match(plan, /Wixela Inhub 100\/50 mcg: 1 inhalation twice daily/);
  assert.match(plan, /Airsupra 90\/80 mcg: 2 inhalations as needed/);
  assert.doesNotMatch(plan, /Controller product, strength|Reliever product, strength|Advair|Breo|Symbicort|Breyna/);
  assert.equal(rec.medications.filter(m => m.id === "inhaler-wixela-100-50").length, 1);
  assert.ok(rec.sources.some(s => s.url === I.PRODUCTS.wixela.source.url));
});
test("high-dose product is a selected prescription, not a hardcoded Advair assumption", () => {
  const rec = build(poor(), { controller: "highDose", controllerProduct: "breo-200", relieverProduct: "xopenex", lama: "defer" });
  const plan = note(rec).split("\nPlan\n")[1];
  assert.match(plan, /Breo Ellipta 200\/25 mcg: 1 inhalation once daily/);
  assert.match(plan, /Xopenex HFA.*45 mcg: 2 inhalations every 4-6 hours/);
  assert.doesNotMatch(plan, /Advair|500\/50|SMART.*160\/4.5/);
  assert.match(note(build(poor(), { controller: "highDose" })), /Controller product, strength, and schedule: \*\*\*/);
});
test("continuation permits a same-intensity formulary choice without changing current treatment history", () => {
  const d = product("wixela-250-50");
  const rec = build(d, { controller: "continue", controllerProduct: "advair-hfa-115-21" });
  const text = note(rec), subjective = text.split("\n\nObjective")[0], plan = text.split("\nPlan\n")[1];
  assert.match(subjective, /Current controller and rescue medications are: Wixela Inhub/);
  assert.match(plan, /Use Advair HFA 115\/21 mcg: 2 inhalations twice daily/);
  assert.match(plan, /Continue Generic albuterol HFA/);
  assert.doesNotMatch(plan, /Use Wixela|500\/50|Start.*SMART/);
  assert.equal(build(d, { controller: "continue", controllerProduct: "breo-200" }).plan.selections.controllerProduct, null);
});
test("a new strategy invalidates incompatible product and reliever choices", () => {
  const rec = build(poor(), { controller: "highDose", controllerProduct: "symbicort-smart-medium", relieverProduct: "air-symbicort" });
  assert.equal(rec.plan.selections.controllerProduct, null);
  assert.equal(rec.plan.selections.relieverProduct, null);
  assert.doesNotMatch(note(rec).split("\nPlan\n")[1], /Use Symbicort|Use.*ICS.formoterol.*reliever/);
});
test("formulary triple choices replace controller and separate LAMA rather than duplicating", () => {
  const rec = build(poor(), { controller: "triple", controllerProduct: "breztri-asthma", relieverProduct: "ventolin", lama: "add" });
  const text = note(rec).split("\nPlan\n")[1];
  assert.match(text, /Breztri.*160\/18\/4.8 mcg: 2 inhalations twice daily/);
  assert.match(text, /Stop the replaced ICS-LABA and any separate LAMA/);
  assert.doesNotMatch(text, /Add tiotropium|Continue.*SMART|160\/9\/4.8/);
  assert.equal(rec.plan.groups.some(g => g.id === "lama"), false);
});
test("product-specific step-down preserves ICS and uses a 25-50 percent reduction", () => {
  const d = product("wixela-500-50", { stableMonths: 4, lungFunctionStable: true, recentExacerbation: false, priorIcu: false, respiratoryInfection: false, travelling: false });
  const rec = build(d, { controller: "stepdown", controllerProduct: "wixela-250-50" });
  assert.equal(rec.plan.selections.controllerProduct, "wixela-250-50");
  assert.match(note(rec), /Reduce to Wixela Inhub 250\/50/);
  assert.match(note(rec), /Follow up in 4-8 weeks/);
  assert.equal(build(d, { controller: "stepdown", controllerProduct: "wixela-100-50" }).plan.selections.controllerProduct, null);
});
test("drug administration is device specific and maintenance triples never become relievers", () => {
  assert.match(I.PRODUCTS.qvar.administration, /do not shake, prime, or use a spacer/i);
  assert.match(I.prescription(I.PRESETS["wixela-250-50"]), /do not attach a spacer/i);
  assert.match(I.PRODUCTS.spiriva.administration, /1.25/);
  const separateAir = I.relieverPrescription(I.RELIEVERS["air-symbicort"], { controller: "triple" });
  assert.match(separateAir, /Combined daily limit and instructions: \*\*\*/);
  assert.doesNotMatch(separateAir, /Maximum 12 total/);
  assert.match(I.PRODUCTS.trelegy.administration, /not ICS-formoterol/);
});
test("known duplicate LAMA exposure blocks automatic continuation and urgent findings override prescriptions", () => {
  const duplicate = product("trelegy-200", { lamaAddon: true });
  const rec = build(duplicate, { controller: "continue" });
  assert.equal(rec.plan.selections.controller, null);
  assert.match(rec.cautions.join(" "), /avoid duplicate exposure/);
  const urgent = build(product("breo-200", { spo2: 85, roomAir: true }), { controller: "continue", controllerProduct: "breo-200" });
  assert.equal(urgent.emergency, true); assert.equal(urgent.plan.groups.length, 0);
  assert.doesNotMatch(note(urgent), /Continue Breo|Use Breo/);
});
