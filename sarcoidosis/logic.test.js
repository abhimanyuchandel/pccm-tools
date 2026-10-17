"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const L = require("./logic.js"), N = require("./notes.js"), W = require("./workflow.js"), C = require("./medications.js");
const baseline = {
  age: 45, gender: "female", diagnosis: "established", diagnosticBasis: "biopsy", biopsyMethod: "ebus", pathology: "granulomas", compatible: true, mimics: true,
  currentPred: false, currentDmard: "none", currentTnf: "none", activity: "inactive", indication: "none", trajectory: "stable", qol: "none",
  urgentResp: false, urgentCardiac: false, urgentNeuro: false, urgentVisual: false, urgentCalcium: false,
  dyspnea: false, cough: false, fatigue: false, limitation: false,
  infection: false, toxicity: false, eyeScreen: "current", ecgScreen: "current", cbcScreen: "current", calciumScreen: "current", renalScreen: "current", alpScreen: "current",
  cardiac: "none", ocular: "none", neuro: "none", renal: "none", hepatic: "none", skin: "none", joints: "none", strategy: "observe",
};
const safe = {
  activity: "active", indication: "qol", infection: false, toxicity: false, interactions: true, prescriptionReviewed: true, exposure: "none", cbcSafe: true, liverSafe: true,
  renalReviewed: true, renalFunction: 90, reproductive: "cleared", hepatitis: "clear", tb: "clear", tmpSmx: false, xanthine: false, thiopurine: "normal",
  heartFailure: false, demyelination: false, weight: 80, eyePlan: true, hcqCardiacSafe: true, supportingIndication: true, refractory: true, tnfPhase: "initiation",
};
let notes = 0;
function evaluate(values) {
  const r = L.buildRecommendation(values), note = N.buildNoteText(r);
  if (!r.invalid) {
    notes++;
    for (const section of ["Subjective", "Objective", "Assessment", "Plan"]) assert.ok(note.includes(section + "\n"));
    assert.doesNotMatch(note, /\b(?:undefined|NaN|Infinity)\b|vaccines? (?:were |was )?administered|counseling was completed|normal physical examination/i);
    for (const action of r.actions) { assert.ok(note.includes(action.text), "Shared action missing from note: " + action.id); for (const s of action.sources) assert.ok(C.SOURCES[s], "Missing reference " + s); }
  }
  return { r, note };
}
const run = values => evaluate({ ...baseline, ...values });
function drug(id, values = {}) {
  const c = C.DRUGS[id];
  return {
    ...baseline, ...safe,
    strategy: id === "prednisone" ? "prednisone" : id === "methotrexate" ? "methotrexate" : ["infliximab", "adalimumab"].includes(id) ? "biologic" : "alternative",
    targetDmard: id, targetTnf: id, predDose: 20, predWeeks: 4, dmardDose: c.defaultDose, dmardTarget: c.target ?? c.defaultDose, titrationWeeks: id === "methotrexate" ? 4 : 2,
    mtxRoute: "oral", tnfDose: c.defaultDose, tnfInterval: id === "infliximab" ? 6 : 1, ...values,
  };
}
test("empty encounter retains unknowns and makes no reassuring or definitive treatment claims", () => {
  const { r, note } = evaluate({});
  assert.equal(r.data.infection, null); assert.equal(r.data.currentPred, null); assert.equal(r.data.currentDmard, "unknown");
  assert.ok(r.placeholders.length); assert.doesNotMatch(note, /denied|well controlled|screening was normal|Start prednisone/); assert.match(note, /Examination: \*\*\*/);
});
test("stable untreated disease supports observation without an automatic steroid prescription", () => {
  const { r, note } = run({}); assert.ok(r.actions.some(a => a.id === "strategy")); assert.match(note, /Observe without systemic/); assert.doesNotMatch(note, /Start prednisone|methotrexate/i);
});
test("accepted historical clinical or unavailable-record diagnosis does not trigger repeat biopsy", () => {
  for (const diagnosticBasis of ["records", "clinical"]) {
    const { r, note } = run({ diagnosticBasis, clinicalPattern: "lofgren" }); assert.equal(r.findings.diagnosisSupported, true); assert.ok(!r.actions.some(a => a.id === "diagnosis-review")); assert.doesNotMatch(note, /obtain a repeat biopsy/i);
  }
});
test("uncertain diagnosis and known contradictory diagnostic evidence require reassessment", () => {
  for (const v of [{ diagnosis: "uncertain" }, { compatible: false }, { mimics: false }, { pathology: "other" }]) { const { r } = run(v); assert.ok(r.actions.some(a => a.id === "diagnosis-review")); }
  const { r } = evaluate(drug("methotrexate", { diagnosis: "uncertain" })); assert.ok(r.prescription.blockers.length); assert.ok(!r.actions.some(a => a.id === "prescription"));
});
for (const id of Object.keys(C.DRUGS)) test(`${id}: selected reviewed regimen produces matched dosing, monitoring and SOAP`, () => {
  const { r, note } = evaluate(drug(id)); assert.equal(r.invalid, false); assert.deepEqual(r.prescription.blockers, []); assert.ok(r.actions.some(a => a.id === "prescription")); assert.ok(note.toLowerCase().includes(C.DRUGS[id].name.split(" (")[0].toLowerCase())); assert.ok(r.actions.some(a => a.id === "drug-monitoring"));
});
test("methotrexate is weekly, includes folate and is not automatically a pulmonary emergency treatment", () => {
  const { note } = evaluate(drug("methotrexate")); assert.match(note, /15 mg orally once weekly, never daily/); assert.match(note, /folic acid 1 mg orally daily/);
  const urgent = evaluate(drug("methotrexate", { urgentCardiac: true })); assert.equal(urgent.r.prescription, null); assert.doesNotMatch(urgent.note, /Start Methotrexate/);
});
test("prednisone bridge preserves both selected prescriptions without inventing a taper", () => {
  const { r, note } = evaluate(drug("methotrexate", { strategy: "bridge" })); assert.deepEqual(r.prescription.blockers, []); assert.match(note, /Start prednisone 20 mg/); assert.match(note, /Start Methotrexate 15 mg/); assert.doesNotMatch(note, /Reduce prednisone to/);
});
test("adding methotrexate to prednisone retains the selected dose, route, folate and steroid plan in SOAP", () => {
  const current = { currentPred: true, currentSteroid: "prednisone", currentPredDose: 10, predMonths: 8, backgroundPred: "continue", activity: "controlled", indication: "steroid" };
  for (const mtxRoute of ["oral", "sc"]) {
    const { r, note } = evaluate(drug("methotrexate", { ...current, mtxRoute }));
    assert.deepEqual(r.prescription.blockers, []);
    assert.match(note, new RegExp("Start Methotrexate 15 mg " + (mtxRoute === "oral" ? "orally" : "subcutaneously") + " once weekly, never daily"));
    assert.match(note, /to 25 mg once weekly/); assert.match(note, /folic acid 1 mg orally daily/);
    assert.match(note, /Continue the reconciled systemic corticosteroid at 10 mg\/day/);
    assert.match(note, /controlled by the current treatment/); assert.doesNotMatch(note, /Start prednisone 20 mg/);
    const stages = W.steps(r.data, r).map(s => s.id);
    assert.ok(stages.indexOf("steroid-background") < stages.indexOf("prescription"));
  }
  const { note } = evaluate(drug("methotrexate", { ...current, backgroundPred: "taper", taperDose1: 7.5, taperWeeks1: 4, taperDose2: 5, taperWeeks2: 4, adrenalReview: true }));
  assert.match(note, /Start Methotrexate 15 mg/); assert.match(note, /Reduce prednisone to 7.5 mg/);
});
test("steroid-sparing indication cannot turn inactive disease or steroid exposure alone into a prescription", () => {
  for (const v of [{ currentPred: false }, { currentPredDose: null }, { currentPredDose: 0 }, { activity: "inactive" }, { activity: "fibrotic" }]) {
    const { r } = evaluate(drug("methotrexate", { currentPred: true, currentPredDose: 10, activity: "controlled", indication: "steroid", ...v }));
    assert.ok(r.prescription.blockers.length); assert.ok(!r.actions.some(a => a.id === "prescription"));
  }
  const { r } = evaluate(drug("infliximab", { currentPred: true, currentPredDose: 10, activity: "controlled", indication: "steroid" }));
  assert.ok(r.prescription.blockers.length, "Steroid dependence alone cannot justify TNF treatment");
});
test("unconfirmed prescriptions retain a conditional schedule and specific outstanding actions, not a start instruction", () => {
  for (const id of Object.keys(C.DRUGS)) {
    const { r, note } = evaluate(drug(id, { prescriptionReviewed: null }));
    assert.ok(!r.actions.some(a => a.id === "prescription"));
    assert.ok(r.prescription.schedule); assert.match(note, /Proposed schedule for review only, not yet cleared for initiation/);
    assert.ok(note.includes(r.prescription.schedule)); assert.match(note, /Confirm the selected prescription/);
    assert.ok(r.prescription.issues.some(i => i.keys.includes("prescriptionReviewed")));
    assert.doesNotMatch(r.prescription.schedule, /^(Start|Adjust)|null|undefined|NaN/);
  }
});
test("incomplete schedules never produce a dose preview or guessed patient-specific prescription", () => {
  for (const [id, change] of [["methotrexate", { dmardDose: null }], ["methotrexate", { mtxRoute: "unknown" }], ["methotrexate", { titrationWeeks: null }], ["azathioprine", { dmardTarget: 133 }], ["prednisone", { predWeeks: null }], ["infliximab", { weight: null }], ["adalimumab", { tnfInterval: 3 }]]) {
    const { r, note } = evaluate(drug(id, change));
    assert.equal(r.prescription.schedule, ""); assert.ok(r.prescription.issues.some(i => i.type === "schedule"));
    assert.ok(!r.actions.some(a => a.id === "pending-schedule" || a.id === "prescription")); assert.doesNotMatch(note, /null mg|undefined mg/);
  }
});
test("known safety concerns do not copy a proposed dosing instruction into a pending plan", () => {
  for (const [id, change] of [["methotrexate", { tmpSmx: true }], ["methotrexate", { renalFunction: 45 }], ["methotrexate", { reproductive: "pregnant" }], ["azathioprine", { xanthine: true }], ["leflunomide", { liverSafe: false }], ["infliximab", { heartFailure: true }], ["adalimumab", { demyelination: true }], ["hydroxychloroquine", { hcqCardiacSafe: false }]]) {
    const { r, note } = evaluate(drug(id, change));
    assert.ok(r.prescription.issues.some(i => i.type === "concern"));
    assert.ok(!r.actions.some(a => a.id === "prescription" || a.id === "pending-schedule"));
    assert.match(note, /Proposed regimen remains pending/); assert.ok(note.includes(C.DRUGS[id].name));
  }
});
test("outstanding prescription issues map to reachable fields and every medication has practical safety reminders", () => {
  const S = require("./input-schema.js");
  for (const id of Object.keys(C.DRUGS)) {
    const d = { ...drug(id), prescriptionReviewed: null, infection: null, exposure: "unknown", cbcSafe: null, renalReviewed: null, reproductive: "unknown" };
    const { r } = evaluate(d), keys = new Set(W.steps(r.data, r).flatMap(s => s.fields));
    for (const issue of r.prescription.issues) { assert.ok(issue.keys.length); assert.ok(issue.keys.every(k => S[k])); assert.ok(issue.keys.some(k => keys.has(k))); }
    assert.equal(C.DRUGS[id].safety.length, 2); assert.ok(C.DRUGS[id].safety.every(([title, text]) => title && text.length > 30));
  }
});
test("an unchosen alternative or TNF agent produces an editable pending plan without crashing", () => {
  for (const strategy of ["alternative", "biologic"]) {
    const { r, note } = run({ ...safe, strategy });
    assert.ok(r.prescription.blockers.includes("Select the medication.")); assert.match(note, /selected medication plan/);
    assert.equal(r.prescription.schedule, ""); assert.ok(!r.actions.some(a => a.id === "prescription"));
    assert.ok(W.steps(r.data, r).some(s => s.fields.includes(r.prescription.issues[0].keys[0])));
  }
});
test("missing or failed prerequisites yield a testing plan, not an invented prescription", () => {
  for (const id of Object.keys(C.DRUGS)) for (const flag of ["prescriptionReviewed", "interactions", "infection", "toxicity", "exposure", "reproductive"]) {
    const values = drug(id, { [flag]: ["infection", "toxicity"].includes(flag) ? true : ["exposure", "reproductive"].includes(flag) ? "unknown" : null });
    const { r, note } = evaluate(values); assert.ok(r.prescription.blockers.length, id + ":" + flag); assert.ok(!r.actions.some(a => a.id === "prescription")); assert.match(note, /Proposed regimen remains pending/);
  }
});
test("unassessed warning symptoms do not safety-clear a definitive outpatient prescription", () => {
  for (const key of L.urgentKeys) { const { r } = evaluate(drug("methotrexate", { [key]: null })); assert.ok(r.prescription.blockers.some(t => t.includes("warning-symptom"))); assert.ok(!r.actions.some(a => a.id === "prescription")); }
});
test("methotrexate renal, interaction, dose-delivery and reproductive boundaries", () => {
  for (const egfr of [0, 29.9, 30, 59.9, null]) { const { r } = evaluate(drug("methotrexate", { renalFunction: egfr })); assert.ok(r.prescription.blockers.some(t => t.includes("eGFR"))); }
  for (const egfr of [60, 90]) { const { r } = evaluate(drug("methotrexate", { renalFunction: egfr })); assert.deepEqual(r.prescription.blockers, []); }
  for (const v of [{ tmpSmx: true }, { tmpSmx: null }, { reproductive: "pregnant" }, { reproductive: "lactating" }, { dmardDose: 11 }, { dmardTarget: 26 }]) { const { r } = evaluate(drug("methotrexate", v)); assert.ok(r.prescription.blockers.length); }
});
test("daily current methotrexate is a blocking medication-error warning", () => {
  for (const currentDmardFrequency of ["daily", "bid"]) { const { r, note } = run({ currentDmard: "methotrexate", currentDmardDose: 15, currentDmardFrequency }); assert.ok(r.invalid); assert.equal(note, ""); assert.match(r.errors[0].text, /once weekly, never daily/); }
});
test("current drug units, routes and HCQ weight safety do not silently clear an erroneous regimen", () => {
  assert.equal(run({ currentTnf: "infliximab", currentTnfDose: 400 }).r.invalid, true);
  assert.equal(run({ currentDmard: "mycophenolate", currentDmardRoute: "sc" }).r.invalid, true);
  const tooHigh = run({ strategy: "continue", currentDmard: "hydroxychloroquine", currentDmardDose: 400, weight: 50 }); assert.ok(!tooHigh.r.actions.some(a => a.id === "strategy"));
  const excessive = run({ strategy: "continue", currentDmard: "azathioprine", currentDmardDose: 300 }); assert.ok(!excessive.r.actions.some(a => a.id === "strategy"));
  const doubled = run({ strategy: "continue", currentDmard: "hydroxychloroquine", currentDmardDose: 400, currentDmardFrequency: "bid", weight: 80 }); assert.ok(!doubled.r.actions.some(a => a.id === "strategy"));
  const divided = run({ strategy: "continue", currentDmard: "hydroxychloroquine", currentDmardDose: 200, currentDmardFrequency: "bid", weight: 80 }); assert.ok(divided.r.actions.some(a => a.id === "strategy"));
});
test("azathioprine pharmacogenetic and xanthine-oxidase precautions are explicit", () => {
  for (const thiopurine of ["unknown", "reduced", "deficient"]) assert.ok(evaluate(drug("azathioprine", { thiopurine })).r.prescription.blockers.length);
  for (const xanthine of [true, null]) assert.ok(evaluate(drug("azathioprine", { xanthine })).r.prescription.blockers.length);
});
test("alternative doses stay within supported deliverable schedules", () => {
  for (const [id, vals] of [["leflunomide", { dmardDose: 15 }], ["leflunomide", { dmardTarget: 30 }], ["leflunomide", { tb: "concern" }], ["mycophenolate", { dmardDose: 333 }], ["mycophenolate", { dmardTarget: 1750 }]]) { const r = evaluate(drug(id, vals)).r; assert.ok(r.invalid || r.prescription.blockers.length); assert.ok(!r.actions.some(a => a.id === "prescription")); }
});
test("HCQ weight boundary, retinal safety and nonpulmonary role", () => {
  for (const weight of [39.9, null]) assert.ok(evaluate(drug("hydroxychloroquine", { weight })).r.prescription.blockers.length);
  assert.deepEqual(evaluate(drug("hydroxychloroquine", { weight: 40 })).r.prescription.blockers, []);
  assert.deepEqual(evaluate(drug("hydroxychloroquine", { weight: 80, dmardDose: 400, dmardTarget: 400 })).r.prescription.blockers, []);
  for (const v of [{ weight: 79.9, dmardDose: 400, dmardTarget: 400 }, { eyePlan: null }, { hcqCardiacSafe: false }, { supportingIndication: false }, { indication: "organ", activity: "active" }]) assert.ok(evaluate(drug("hydroxychloroquine", v)).r.prescription.blockers.length);
});
test("TNF initiation versus maintenance and weight-derived infusion amounts", () => {
  const { r, note } = evaluate(drug("infliximab")); assert.deepEqual(r.prescription.blockers, []); assert.match(note, /400 mg before pharmacy/); assert.match(note, /weeks 0, 2 and 6, then every 6 weeks/);
  const maintenance = evaluate(drug("infliximab", { currentTnf: "infliximab", tnfPhase: "maintenance" })); assert.deepEqual(maintenance.r.prescription.blockers, []); assert.doesNotMatch(maintenance.note, /weeks 0, 2 and 6/);
  assert.ok(evaluate(drug("infliximab", { currentTnf: "infliximab", tnfPhase: "initiation" })).r.prescription.blockers.length);
  assert.ok(evaluate(drug("adalimumab", { tnfPhase: "maintenance" })).r.prescription.blockers.length);
});
test("TNF cannot bypass known or missing infection, refractory or major precaution review", () => {
  for (const id of ["infliximab", "adalimumab"]) for (const value of [{ tb: "unknown" }, { tb: "concern" }, { hepatitis: "concern" }, { refractory: null }, { heartFailure: true }, { heartFailure: null }, { demyelination: true }]) assert.ok(evaluate(drug(id, value)).r.prescription.blockers.length);
  assert.ok(evaluate(drug("infliximab", { tnfDose: 10 })).r.prescription.blockers.length);
  assert.ok(evaluate(drug("infliximab", { tnfInterval: 2 })).r.prescription.blockers.length);
  assert.ok(evaluate(drug("infliximab", { weight: null })).r.prescription.blockers.length);
  const excessive = evaluate(drug("adalimumab", { tnfDose: 80 })).r; assert.ok(excessive.invalid); assert.ok(!excessive.actions.some(a => a.id === "prescription"));
});
test("TNF switch stops old agent; DMARD replacement does not silently duplicate antimetabolites", () => {
  assert.ok(evaluate(drug("adalimumab", { currentTnf: "infliximab", tnfSwitch: null })).r.prescription.blockers.length);
  const switched = evaluate(drug("adalimumab", { currentTnf: "infliximab", tnfSwitch: true })); assert.deepEqual(switched.r.prescription.blockers, []); assert.match(switched.note, /do not overlap TNF/);
  assert.ok(evaluate(drug("leflunomide", { currentDmard: "methotrexate", transition: "retain" })).r.prescription.blockers.length);
  const replaced = evaluate(drug("leflunomide", { currentDmard: "methotrexate", transition: "replace" })); assert.deepEqual(replaced.r.prescription.blockers, []); assert.match(replaced.note, /Stop Methotrexate/);
  const combination = evaluate(drug("infliximab", { currentDmard: "methotrexate", transition: "retain", currentDmardDose: 15, currentDmardFrequency: "weekly", currentDmardRoute: "oral" })); assert.deepEqual(combination.r.prescription.blockers, []); assert.match(combination.note, /Retain the reconciled conventional background regimen/);
});
test("adding prednisone or a conventional agent records the selected background treatment plan", () => {
  const onMtx = { currentDmard: "methotrexate", currentDmardDose: 15, currentDmardRoute: "oral", currentDmardFrequency: "weekly" };
  assert.ok(evaluate(drug("prednisone", onMtx)).r.prescription.blockers.length);
  const retain = evaluate(drug("prednisone", { ...onMtx, transition: "retain" })); assert.deepEqual(retain.r.prescription.blockers, []); assert.match(retain.note, /Retain the reconciled conventional background regimen/); assert.ok(retain.r.actions.some(a => a.id === "background-monitoring"));
  const stop = evaluate(drug("prednisone", { ...onMtx, transition: "replace" })); assert.match(stop.note, /Stop the prior conventional agent/);
  assert.ok(evaluate(drug("methotrexate", { currentTnf: "infliximab" })).r.prescription.blockers.length);
  const combo = evaluate(drug("methotrexate", { currentTnf: "infliximab", backgroundTnf: "retain" })); assert.deepEqual(combo.r.prescription.blockers, []); assert.match(combo.note, /Retain the reconciled TNF inhibitor/); assert.ok(combo.r.actions.some(a => a.id === "background-tnf-monitoring"));
});
test("continuation distinguishes unknown doses from known unsafe continuation", () => {
  const { note } = run({ strategy: "continue", currentDmard: "methotrexate", currentDmardDose: null, currentDmardFrequency: "weekly", currentDmardRoute: "oral" }); assert.match(note, /dose \*\*\*/); assert.match(note, /Continue the reconciled/); assert.doesNotMatch(note, /Start Methotrexate/);
  for (const v of [{ infection: true }, { toxicity: true }, { tmpSmx: true }, { renalFunction: 29 }, { reproductive: "pregnant" }, { cbcSafe: false }]) {
    const { note } = run({ strategy: "continue", currentDmard: "methotrexate", ...v }); assert.doesNotMatch(note, /Continue the reconciled current/); assert.match(note, /resolve safety concerns/);
  }
  const steroid = run({ currentPred: true, currentSteroid: "prednisolone", currentPredDose: 20, strategy: "continue" }).note; assert.match(steroid, /Current systemic treatment consists of prednisolone 20 mg\/day/); assert.doesNotMatch(steroid, /mg or day/);
});
test("prednisone reduction is staged, conditional on actual exposure and never automatically to zero", () => {
  const taper = { currentPred: true, currentSteroid: "prednisone", currentPredDose: 20, predMonths: 6, strategy: "taper", adrenalReview: true, taperDose1: 15, taperWeeks1: 4, taperDose2: 10, taperWeeks2: 4 };
  const { r, note } = run(taper); assert.deepEqual(r.taper.blockers, []); assert.match(note, /15 mg orally each morning for 4 weeks, then 10 mg/); assert.match(note, /do not proceed automatically/);
  for (const v of [{ currentPredDose: null }, { predMonths: null }, { adrenalReview: null }, { taperDose2: 0 }, { taperDose2: 25 }, { taperWeeks2: null }]) assert.ok(run({ ...taper, ...v }).r.taper.blockers.length);
  assert.ok(run({ ...taper, predMonths: 0.25, taperDose2: 0 }).r.taper.blockers.length, "The planned taper itself extends steroid exposure");
  assert.match(run({ ...taper, currentSteroid: "prednisolone" }).note, /Reduce prednisolone to/);
});
test("PFT changes are correctly distinguished and never independently initiate therapy", () => {
  const { r, note } = run({ fvc: 70, priorFvc: 80, dlco: 50, priorDlco: 60, fev1: 65, priorFev1: 70 }); assert.equal(r.findings.changes[0].points, -10); assert.equal(r.findings.changes[0].relative, -12.5); assert.match(note, /-10 percentage points, -12.5% relative/); assert.doesNotMatch(note, /Start prednisone/);
  for (const key of ["fvc", "dlco", "priorFvc", "fev1"]) assert.equal(run({ [key]: 0 }).r.invalid, true);
});
test("invalid and conflicting dates, age and numeric values cannot become a clinical note", () => {
  for (const v of [{ age: 17 }, { age: 45.5 }, { fvc: NaN }, { diagnosisDate: "2026-02-30" }, { pftDate: "2026-01-01", priorPftDate: "2026-02-01" }]) assert.equal(run(v).note, "");
  assert.equal(run({ strategy: "observe", tnfDose: 999, dmardDose: -1, taperWeeks1: -1 }).r.invalid, false, "Inactive proposed schedules do not contaminate an unrelated plan");
});
test("urgent findings override every routine treatment strategy and persist independent of context", () => {
  for (const key of [...L.urgentKeys, "calcium", "spo2"]) for (const context of ["routine", "worsening", "treatment"]) for (const strategy of ["observe", "continue", "prednisone", "bridge", "biologic", "taper"]) {
    const { r, note } = evaluate(drug("methotrexate", { context, strategy, [key]: key === "calcium" ? 14 : key === "spo2" ? 87 : true })); assert.equal(r.emergency, true); assert.ok(r.actions.every(a => ["urgent", "safety", "testing"].includes(a.kind))); assert.ok(!r.actions.some(a => a.kind === "prescription")); assert.doesNotMatch(note, /Follow up in (?:3|4|6)|Arrange the documented due vaccines/);
  }
});
test("severe calcium and oxygen observations remain in the urgent note", () => {
  assert.match(run({ calcium: 14 }).note, /Serum calcium: 14 mg\/dL/); assert.match(run({ spo2: 87, oxygenConditions: "oxygen" }).note, /87% on supplemental oxygen/);
});
test("baseline screening differs from annual surveillance and symptom-driven assessment", () => {
  const current = run({}); assert.ok(!current.r.actions.some(a => a.kind === "screening"));
  const due = run({ eyeScreen: "due", ecgScreen: "due", calciumScreen: "due" }); assert.match(due.note, /baseline ophthalmic examination/); assert.match(due.note, /baseline ECG/); assert.match(due.note, /annual sarcoidosis surveillance/); assert.doesNotMatch(due.note, /annual eye|annual ECG|routine PET/i);
  const abnormal = run({ ecgScreen: "abnormal", cardiac: "suspected" }); assert.match(abnormal.note, /abnormal baseline ECG/); assert.match(abnormal.note, /targeted cardiac/);
});
test("organ prompts preserve known and suspected disease without inventing a new diagnosis", () => {
  for (const key of L.organKeys) { const { note } = run({ [key]: "suspected" }); assert.match(note, /New suspected involvement/); assert.doesNotMatch(note, /Established extrapulmonary involvement/); }
});
test("conflicting evidence and new high-risk organ concerns cannot silently clear pulmonary prescribing", () => {
  for (const v of [{ compatible: false }, { pathology: "other" }, { cardiac: "suspected" }, { neuro: "suspected" }, { ocular: "suspected" }]) assert.ok(evaluate(drug("prednisone", v)).r.prescription.blockers.length);
  assert.deepEqual(evaluate(drug("prednisone", { cardiac: "suspected", organSafety: true })).r.prescription.blockers, []);
});
test("fibrotic/PH branches offer evaluation/referral rather than automatic immunosuppression or PAH drugs", () => {
  for (const values of [{ activity: "fibrotic" }, { phConcern: true }, { dlco: 35 }, { oxygen: "rest" }, { walkSpo2: 88 }]) {
    const { r, note } = run({ ...values, advancedPlan: "workup" }); assert.equal(r.findings.advanced, true); assert.match(note, /RHC/); assert.doesNotMatch(note, /Start sildenafil|Start nintedanib/);
  }
  assert.match(run({ activity: "fibrotic", advancedPlan: "refer" }).note, /does not establish transplant listing/);
});
test("prevention distinguishes unknown, due, selected and deferred care without inventing administration", () => {
  const unknown = run({ vaccinePlan: "review" }); assert.match(unknown.note, /after eligibility and prior-dose review/);
  const due = run({ age: 50, flu: "due", zoster: "due", vaccinePlan: "give", vaccineReviewed: true }); assert.match(due.note, /Influenza, Zoster/); assert.doesNotMatch(due.note, /PCV20.*administered|vaccinated today/i);
  assert.match(run({ vaccinePlan: "defer" }).note, /Reason and reassessment timing: \*\*\*/);
  assert.match(run({ smoking: "current", cessation: "support" }).note, /1-800-QUIT-NOW/);
});
test("vaccine age/risk and prior products constrain the selected ordering plan", () => {
  const v = { vaccinePlan: "give", vaccineReviewed: true, pneumococcal: "due", rsv: "due", zoster: "due", pneumococcalHistory: "none", pneumococcalProduct: "pcv20" };
  const young = run({ ...v, age: 30 }); assert.ok(!young.r.actions.some(a => a.id === "vaccines")); assert.match(young.note, /Review eligibility/);
  const risk = run({ ...v, age: 30, chronicLungRisk: true }); assert.match(risk.note, /one dose of PCV20/); assert.match(risk.note, /Review eligibility.*RSV, Zoster/);
  const treated = run({ ...v, age: 30, currentPred: true, currentPredDose: 20, strategy: "continue", vaccineImmune: true }); assert.match(treated.note, /Pneumococcal, Zoster/); assert.match(treated.note, /Review eligibility.*RSV/);
  const lowDose = run({ ...v, age: 30, currentPred: true, currentPredDose: 5, strategy: "continue", vaccineImmune: null }); assert.ok(!lowDose.r.actions.some(a => a.id === "vaccines"));
  const prior = run({ ...v, age: 75, pneumococcalHistory: "pcv20-21" }); assert.ok(!prior.r.actions.some(a => a.id === "pneumococcal-product")); assert.match(prior.note, /Review eligibility and prior-dose history for Pneumococcal/);
  assert.match(run({ ...v, age: 50, pneumococcalProduct: "pcv15" }).note, /PCV15 followed ordinarily one year later by PPSV23/);
});
test("steroid protection is calcium-aware and PJP is not automatically prescribed", () => {
  const { note } = run({ currentPred: true, currentPredDose: 20, strategy: "continue", bonePlan: "review", pjp: "review" }); assert.match(note, /25-OH and 1,25-OH2/); assert.match(note, /avoid automatic TMP-SMX/); assert.doesNotMatch(note, /Start calcium|Start TMP-SMX/);
});
test("workflow only requests relevant prescribing and advanced detail, retaining raw answers", () => {
  const d = L.normalize(baseline), r = L.buildRecommendation(d), ids = W.steps(d, r).map(s => s.id); assert.ok(!ids.includes("lab-safety")); assert.ok(!ids.includes("prescription")); assert.ok(!ids.includes("pft"));
  const advanced = L.normalize(drug("infliximab", { includePft: true })), ar = L.buildRecommendation(advanced), stages = W.steps(advanced, ar); assert.ok(stages.some(s => s.fields.includes("weight"))); assert.ok(stages.some(s => s.id === "tnf-safety")); assert.ok(stages.some(s => s.id === "pft"));
  const mtx = L.normalize(drug("methotrexate")); assert.ok(!W.steps(mtx, L.buildRecommendation(mtx)).some(s => s.fields.includes("weight")));
  const changed = L.normalize({ ...advanced, strategy: "observe", includePft: false, fvc: 65, urgentVisual: true }); assert.equal(changed.fvc, 65); assert.equal(L.buildRecommendation(changed).emergency, true);
});
test("branch reconciliation returns to a preceding applicable step", () => {
  const before = [{ id: "a" }, { id: "b" }, { id: "c" }], after = [{ id: "a" }, { id: "c" }]; assert.equal(W.reconcileStep("b", after, before), "a"); assert.equal(W.reconcileStep("c", after, before), "c");
});
test("all conditional screens use defined fields and references without duplicate step identities", () => {
  for (const values of [baseline, ...Object.keys(C.DRUGS).map(id => drug(id)), { ...baseline, currentPred: true, strategy: "taper" }, { ...baseline, currentDmard: "hydroxychloroquine", strategy: "continue" }, { ...baseline, vaccinePlan: "give", pneumococcal: "due" }]) {
    const r = L.buildRecommendation(values), steps = W.steps(r.data, r); assert.equal(new Set(steps.map(s => s.id)).size, steps.length);
    for (const stage of steps) { stage.fields.forEach(key => assert.ok(require("./input-schema.js")[key], key)); if (stage.reference) assert.ok(C.REFERENCES[stage.reference]); if (stage.drug) assert.ok(C.DRUGS[stage.drug]); }
  }
});
test("broad activity, indication and medication-safety matrix never prescribes against unresolved prerequisites", () => {
  for (const id of Object.keys(C.DRUGS)) for (const activity of ["inactive", "active", "fibrotic", "mixed", "uncertain", "unknown"]) for (const indication of ["none", "qol", "organ", "unknown"]) for (const prescriptionReviewed of [true, false, null]) {
    const { r } = evaluate(drug(id, { activity, indication, prescriptionReviewed }));
    if (prescriptionReviewed !== true) assert.ok(!r.actions.some(a => a.id === "prescription"));
    if (r.prescription.blockers.length) assert.ok(!r.actions.some(a => a.id === "prescription"));
  }
});
test.after(() => console.log("Sarcoidosis synthetic SOAP notes checked: " + notes));
