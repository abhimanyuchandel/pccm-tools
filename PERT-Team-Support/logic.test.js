const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  scrubPotentialIdentifiers,
  classify,
  hiPeithoAssessment
} = require("./logic.js");

function makeBaseData(overrides = {}) {
  return {
    pesi: null,
    spesi: 1,
    hestia: null,
    patientAge: 64,
    rvDysfunction: "yes",
    troponin: "yes",
    bnp: "unknown",
    aki: false,
    oliguria: false,
    mentalStatus: false,
    lowCardiacIndex: false,
    shockScore: false,
    lactate: null,
    map: 75,
    persistentHypotension: false,
    transientHypotension: false,
    cardiacArrest: false,
    vasopressors: "0",
    oxygenSupport: "room-air",
    oxygenSat: 95,
    rr: 18,
    symptomatic: "yes",
    incidental: false,
    confirmedPe: "confirmed",
    clotLocation: "lobar_or_more_proximal",
    scoreMode: "calc-pesi",
    calcPesiSbp: 120,
    calcSpesiSbp: null,
    calcBovaSbp: null,
    scoreHr: 100,
    highBleedingRisk: false,
    contraThrombolysis: false,
    ...overrides
  };
}

test("PHI scrubber preserves common clinical phrases while removing explicit name cues", () => {
  const stable = scrubPotentialIdentifiers("The patient is stable and improving.");
  assert.equal(stable.cleaned, "The patient is stable and improving.");
  assert.deepEqual(stable.findings, []);

  const named = scrubPotentialIdentifiers("Patient name is John Smith. MRN 123456.");
  assert.match(named.cleaned, /\*\*\*\*/);
  assert.ok(named.findings.includes("name cue"));
  assert.ok(named.findings.includes("MRN/long numeric identifier"));
});

test("classification keeps D respiratory modifier on high-flow oxygen but not E unless NIV or IMV is used", () => {
  const dData = makeBaseData({
    spesi: null,
    hestia: null,
    pesi: null,
    transientHypotension: true,
    oxygenSupport: "o2-high"
  });
  const dCls = classify(dData);
  assert.equal(dCls.category, "D1R");

  const eData = makeBaseData({
    spesi: null,
    hestia: null,
    pesi: null,
    persistentHypotension: true,
    oxygenSupport: "o2-high"
  });
  const eCls = classify(eData);
  assert.equal(eCls.category, "E1");

  const eRespData = makeBaseData({
    spesi: null,
    hestia: null,
    pesi: null,
    persistentHypotension: true,
    oxygenSupport: "niv"
  });
  const eRespCls = classify(eRespData);
  assert.equal(eRespCls.category, "E2R");
});

test("HI-PEITHO logic uses inclusive thresholds and requires C3, positive troponin, proximal clot burden, and trial-age eligibility", () => {
  const eligibleData = makeBaseData({
    scoreHr: 100,
    calcPesiSbp: 110,
    rr: 24,
    oxygenSat: 89,
    oxygenSupport: "room-air"
  });
  const eligibleCls = classify(eligibleData);
  assert.equal(eligibleCls.base, "C3");
  const eligible = hiPeithoAssessment(eligibleData, eligibleCls);
  assert.equal(eligible.absoluteEligible, true);
  assert.equal(eligible.recommendationEligible, true);
  assert.ok(eligible.metLabels.includes("HR >=100 bpm"));
  assert.ok(eligible.metLabels.includes("SBP <=110 mm Hg"));
  assert.equal(eligible.trialAgeEligible, true);

  const segmentalOnly = hiPeithoAssessment(
    makeBaseData({
      clotLocation: "segmental_only",
      scoreHr: 100,
      calcPesiSbp: 110,
      rr: 24
    }),
    eligibleCls
  );
  assert.equal(segmentalOnly.absoluteEligible, false);

  const bnpOnlyClass = classify(
    makeBaseData({
      troponin: "no",
      bnp: "yes",
      scoreHr: 100,
      calcPesiSbp: 110,
      rr: 24
    })
  );
  assert.equal(bnpOnlyClass.base, "C3");
  const bnpOnly = hiPeithoAssessment(
    makeBaseData({
      troponin: "no",
      bnp: "yes",
      scoreHr: 100,
      calcPesiSbp: 110,
      rr: 24
    }),
    bnpOnlyClass
  );
  assert.equal(bnpOnly.relativeEligible, false);

  const ageOutsideTrial = hiPeithoAssessment(
    makeBaseData({
      patientAge: 81,
      scoreHr: 100,
      calcPesiSbp: 110,
      rr: 24
    }),
    eligibleCls
  );
  assert.equal(ageOutsideTrial.relativeEligible, true);
  assert.equal(ageOutsideTrial.recommendationEligible, false);
  assert.equal(ageOutsideTrial.absoluteEligible, false);
  assert.ok(ageOutsideTrial.trialMismatchNotes.includes("patient age is outside the HI-PEITHO 18-80 year range"));

  const ageMissing = hiPeithoAssessment(
    makeBaseData({
      patientAge: null,
      scoreHr: 100,
      calcPesiSbp: 110,
      rr: 24
    }),
    eligibleCls
  );
  assert.equal(ageMissing.relativeEligible, true);
  assert.equal(ageMissing.recommendationEligible, true);
  assert.equal(ageMissing.absoluteEligible, false);
  assert.ok(ageMissing.trialMismatchNotes.includes("patient age is not entered"));

  const shockPhysiology = hiPeithoAssessment(
    makeBaseData({
      persistentHypotension: true,
      scoreHr: 100,
      calcPesiSbp: 110,
      rr: 24
    }),
    { ...eligibleCls, base: "E1", family: "E" }
  );
  assert.equal(shockPhysiology.absoluteEligible, false);
});

test("Bova stage III no longer leaves symptomatic stable PE stuck in B/C pending", () => {
  const data = makeBaseData({
    pesi: null,
    spesi: null,
    hestia: null,
    bova: 5,
    patientAge: null,
    calcBovaSbp: 100,
    rr: 24
  });
  const cls = classify(data);
  assert.equal(cls.base, "C3");
  const hiPeitho = hiPeithoAssessment(data, cls);
  assert.equal(hiPeitho.recommendationEligible, true);
  assert.equal(hiPeitho.absoluteEligible, false);
});

test("PERT page no longer exposes the audited contradictory strings", () => {
  const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
  assert.ok(html.includes("const overallRecommendations = [...summaryWithStrength, ...recommendationsWithStrength];"));
  assert.ok(html.includes("reduced 7-day PE-related death, cardiopulmonary collapse, or recurrent PE from 10.3% to 3.7%"));
  assert.ok(html.includes("off-trial extrapolation"));
  assert.ok(html.includes("Confirm age 18-80 before applying the trial data"));
  assert.ok(html.includes("does not by itself establish a low-risk outpatient threshold"));
  assert.ok(!html.includes("do not use LMWH in this tool pathway"));
  assert.ok(!html.includes("UFH 80 units/kg IV bolus, then 18 units/kg/hour infusion and bridge to warfarin."));
});
