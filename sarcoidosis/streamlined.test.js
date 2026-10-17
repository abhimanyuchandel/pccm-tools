"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const L = require("./logic.js"), W = require("./workflow.js"), N = require("./notes.js"), C = require("./medications.js");
const base = { reviewApproach: "overall", diagnosisSummary: "records", warningReview: "none", currentPred: false, currentDmard: "none", currentTnf: "none", trajectory: "stable", activity: "inactive", strategy: "observe" };
function evaluate(values = {}) {
  const r = L.buildRecommendation({ ...base, ...values }), note = N.buildNoteText(r);
  if (!r.invalid) {
    for (const action of r.actions) { assert.ok(note.includes(action.text)); assert.ok(action.sources.every(s => C.SOURCES[s])); }
    assert.doesNotMatch(note, /undefined|NaN|Infinity|normal physical examination|vaccines? (?:was|were) administered|counseling was completed/);
    assert.ok(["Subjective", "Objective", "Assessment", "Plan"].every(s => note.includes(s + "\n")));
  }
  return { r, note };
}
function drug(id, changes = {}) {
  const c = C.DRUGS[id];
  return { ...base, activity: id === "hydroxychloroquine" ? "inactive" : "active", indication: "qol", strategy: id === "prednisone" ? "prednisone" : id === "methotrexate" ? "methotrexate" : ["infliximab", "adalimumab"].includes(id) ? "biologic" : "alternative", targetDmard: id, targetTnf: id, dmardDose: c.defaultDose, dmardTarget: c.target ?? c.defaultDose, titrationWeeks: 4, mtxRoute: "oral", predDose: 20, predWeeks: 4, tnfDose: c.defaultDose, tnfInterval: id === "infliximab" ? 6 : 1, tnfPhase: "initiation", weight: id === "infliximab" || id === "hydroxychloroquine" ? 80 : null, supportingIndication: id === "hydroxychloroquine" ? true : null, initiationTiming: "now", prescriptionReviewed: true, ...changes };
}
test("all encounters have exactly five steps; stable visits have at most fifteen routine question groups", () => {
  for (const values of [base, { ...base, currentPred: true, currentPredDose: 10, strategy: "continue" }, ...Object.keys(C.DRUGS).map(id => drug(id)), { ...base, currentPred: true, strategy: "taper" }]) {
    const { r } = evaluate(values), steps = W.steps(r.data, r);
    assert.deepEqual(steps.map(s => s.id), ["context", "interval", "management", "prevention", "followup"]);
    assert.ok(steps.every(s => new Set(s.fields).size === s.fields.length));
    if (["observe", "continue"].includes(values.strategy)) {
      const count = steps.flatMap(s => s.sections).filter(s => !s.optional).reduce((n, s) => n + (s.symptoms || s.actions || s.decision ? 1 : s.fields.length), 0);
      assert.ok(count <= 15, "Routine question groups: " + count);
    }
  }
});
test("negative warning review does not invent negatives for other history or erase a known urgent finding", () => {
  const { r, note } = evaluate(); assert.ok(L.urgentKeys.every(k => r.data[k] === false));
  assert.equal(r.data.infection, null); assert.equal(r.data.dyspnea, null); assert.doesNotMatch(note, /denied dyspnea|no prior taper-associated/);
  const urgent = evaluate({ urgentVisual: true, warningReview: "none", strategy: "methotrexate" }); assert.equal(urgent.r.emergency, true); assert.doesNotMatch(urgent.note, /Start Methotrexate/);
  assert.ok(L.urgentKeys.every(k => L.buildRecommendation({ reviewApproach: "overall" }).data[k] === null));
});
test("routine observation and continuation do not require a full safety or care-gap questionnaire", () => {
  assert.match(evaluate().note, /Observe without systemic/);
  const { r, note } = evaluate({ currentPred: true, currentPredDose: 10, activity: "controlled", strategy: "continue", prescriptionReviewed: true });
  assert.ok(r.actions.some(a => a.id === "strategy")); assert.match(note, /Continue.*10 mg\/day/);
  assert.doesNotMatch(note, /PJP-prevention risk review and plan|Steroid adverse-effect and bone-protection plan|Review available screening records/);
  assert.equal((note.match(/\*\*\*/g) || []).length, 3);
});
for (const id of Object.keys(C.DRUGS)) test(`${id}: one overall review supports a specified schedule without fabricating individual safety findings`, () => {
  const { r, note } = evaluate(drug(id)); assert.deepEqual(r.prescription.blockers, []); assert.ok(r.actions.some(a => a.id === "prescription"));
  assert.equal(r.data.cbcSafe, null); assert.equal(r.data.liverSafe, null); assert.equal(r.data.renalFunction, null); assert.equal(r.data.reproductive, "unknown");
  assert.doesNotMatch(note, /CBC (?:was )?normal|negative hepatitis|pregnancy test (?:was )?negative/);
});
for (const id of Object.keys(C.DRUGS)) test(`${id}: after-baseline timing keeps the regimen and gives a definite evaluation plan`, () => {
  const { r, note } = evaluate(drug(id, { initiationTiming: "after-tests" }));
  assert.deepEqual(r.prescription.blockers, []); assert.equal(r.prescription.afterTests, true);
  assert.match(r.actions.find(a => a.id === "prescription").text, /^After the required baseline evaluation is acceptable/);
  assert.ok(note.includes(C.DRUGS[id].baseline));
  if (id === "prednisone") assert.match(note, /prednisone 20 mg orally each morning for 4 weeks/);
  else assert.ok(note.toLowerCase().includes(r.prescription.schedule.split(".")[0].toLowerCase()));
});
test("confirmation and initiation timing remain explicit choices", () => {
  for (const values of [{ prescriptionReviewed: null }, { prescriptionReviewed: false }, { initiationTiming: "unknown" }]) {
    const { r } = evaluate(drug("methotrexate", values)); assert.ok(!r.actions.some(a => a.id === "prescription")); assert.ok(r.prescription.blockers.length);
    assert.ok(r.prescription.blockers.length <= 2, "Optional safety questions must not turn into a prerequisite list");
  }
  const { note } = evaluate({ strategy: "continue", currentDmard: "methotrexate" }); assert.doesNotMatch(note, /Continue the reconciled current systemic regimen/);
});
test("known conflicts cannot be overridden by the overall confirmation or after-baseline timing", () => {
  const cases = [["methotrexate", { tmpSmx: true }], ["methotrexate", { renalFunction: 45 }], ["methotrexate", { reproductive: "pregnant" }], ["methotrexate", { cbcSafe: false }], ["methotrexate", { infection: true }], ["azathioprine", { xanthine: true }], ["azathioprine", { thiopurine: "reduced" }], ["leflunomide", { liverSafe: false }], ["mycophenolate", { interactions: false }], ["hydroxychloroquine", { hcqCardiacSafe: false }], ["infliximab", { tb: "concern" }], ["infliximab", { refractory: false }], ["adalimumab", { heartFailure: true }], ["adalimumab", { demyelination: true }]];
  for (const [id, flags] of cases) for (const initiationTiming of ["now", "after-tests"]) {
    const { r } = evaluate(drug(id, { ...flags, initiationTiming })); assert.ok(r.prescription.blockers.length, id); assert.ok(!r.actions.some(a => a.id === "prescription"));
  }
});
test("missing or invalid numeric prescribing data remain unresolved, including weight-dependent doses", () => {
  for (const [id, changes] of [["methotrexate", { dmardDose: null }], ["methotrexate", { dmardTarget: 30 }], ["methotrexate", { mtxRoute: "unknown" }], ["infliximab", { weight: null }], ["hydroxychloroquine", { weight: null }], ["azathioprine", { dmardDose: 51 }]]) {
    const { r } = evaluate(drug(id, changes)); assert.ok(r.invalid || r.prescription.blockers.length); assert.ok(!r.actions.some(a => a.id === "prescription"));
  }
});
test("adding methotrexate to prednisone keeps both selected plans and does not demand repeated safety answers", () => {
  for (const initiationTiming of ["now", "after-tests"]) {
    const { r, note } = evaluate(drug("methotrexate", { currentPred: true, currentPredDose: 10, backgroundPred: "continue", activity: "controlled", indication: "steroid", initiationTiming }));
    assert.deepEqual(r.prescription.blockers, []); assert.match(note, /Methotrexate 15 mg orally once weekly, never daily/); assert.match(note, /to 25 mg/); assert.match(note, /folic acid 1 mg/); assert.match(note, /corticosteroid at 10 mg\/day/);
  }
});
test("a confirmed nonzero taper can omit exact exposure duration but never assumes adrenal recovery", () => {
  const taper = { currentPred: true, currentPredDose: 20, strategy: "taper", activity: "controlled", prescriptionReviewed: true, taperDose1: 15, taperWeeks1: 4, taperDose2: 10, taperWeeks2: 4 };
  assert.match(evaluate(taper).note, /Reduce.*15 mg orally/);
  for (const change of [{ taperDose2: 0 }, { adrenalReview: false }, { prescriptionReviewed: null }, { taperDose2: 25 }]) assert.ok(evaluate({ ...taper, ...change }).r.taper.blockers.length);
});
test("selected care actions, not unknown screening records, drive the copied prevention plan", () => {
  const untouched = evaluate(); assert.ok(untouched.r.guidance.some(a => a.id === "records")); assert.doesNotMatch(untouched.note, /Review available screening records|Arrange a baseline ECG/);
  const { r, note } = evaluate({ careLabs: true, careEcg: true, careEye: true, careVaccines: true, carePft: true, careRehab: true });
  for (const id of ["care-labs", "ecgScreen", "eyeScreen", "vaccines", "care-pft", "care-rehab"]) assert.ok(r.actions.some(a => a.id === id));
  assert.match(note, /Obtain serum calcium/); assert.match(note, /Review immunization records/); assert.doesNotMatch(note, /PCV20 was administered/);
  assert.equal(r.actions.at(-1).id, "return");
});
test("incompatible care selections disappear without discarding clinical findings", () => {
  const { r } = evaluate({ careBone: true, carePjp: true, careAdvanced: true, careCardiac: true, fvc: 75 });
  assert.equal(r.data.careBone, false); assert.equal(r.data.carePjp, false); assert.equal(r.data.careAdvanced, false); assert.equal(r.data.careCardiac, false); assert.equal(r.data.fvc, 75);
});
test("simple diagnostic entry does not fabricate biopsy details or force repeat biopsy", () => {
  const { note } = evaluate({ diagnosisSummary: "biopsy" }); assert.match(note, /prior tissue confirmation/); assert.doesNotMatch(note, /demonstrated nonnecrotizing granulomas|sampling method\/site \*\*\*|repeat biopsy/);
  const uncertain = evaluate(drug("methotrexate", { diagnosisSummary: "uncertain" })); assert.ok(!uncertain.r.actions.some(a => a.id === "prescription"));
});
