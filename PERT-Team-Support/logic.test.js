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

test("HI-PEITHO logic uses inclusive thresholds and requires C3 plus lobar-or-more-proximal clot burden", () => {
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
  assert.ok(eligible.metLabels.includes("HR >=100 bpm"));
  assert.ok(eligible.metLabels.includes("SBP <=110 mm Hg"));

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

test("PERT page no longer exposes the audited contradictory strings", () => {
  const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
  assert.ok(html.includes("const overallRecommendations = [...summaryWithStrength, ...recommendationsWithStrength];"));
  assert.ok(!html.includes("do not use LMWH in this tool pathway"));
  assert.ok(!html.includes("UFH 80 units/kg IV bolus, then 18 units/kg/hour infusion and bridge to warfarin."));
});
