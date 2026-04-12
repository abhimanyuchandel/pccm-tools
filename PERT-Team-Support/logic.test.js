const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  scrubPotentialIdentifiers,
  deriveScoreSbp,
  classify,
  hiPeithoAssessment
} = require("./logic.js");

function makeBaseData(overrides = {}) {
  return {
    pesi: null,
    spesi: 1,
    bova: null,
    patientAge: 64,
    scoreSbp: null,
    systolicBp: 120,
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

test("deriveScoreSbp uses the unified score SBP field and falls back to patient-context SBP", () => {
  assert.equal(deriveScoreSbp({ scoreSbp: 106, systolicBp: 118 }), 106);
  assert.equal(deriveScoreSbp({ scoreSbp: null, systolicBp: 118 }), 118);
  assert.equal(deriveScoreSbp({ scoreSbp: null, systolicBp: null }), null);
});

test("classification keeps D respiratory modifier on high-flow oxygen but not E unless NIV or IMV is used", () => {
  const dData = makeBaseData({
    pesi: null,
    spesi: null,
    transientHypotension: true,
    oxygenSupport: "o2-high"
  });
  const dCls = classify(dData);
  assert.equal(dCls.category, "D1R");

  const eData = makeBaseData({
    pesi: null,
    spesi: null,
    persistentHypotension: true,
    oxygenSupport: "o2-high"
  });
  const eCls = classify(eData);
  assert.equal(eCls.category, "E1");

  const eRespData = makeBaseData({
    pesi: null,
    spesi: null,
    persistentHypotension: true,
    oxygenSupport: "niv"
  });
  const eRespCls = classify(eRespData);
  assert.equal(eRespCls.category, "E2R");
});

test("HI-PEITHO logic uses inclusive thresholds and requires C3, positive troponin, proximal clot burden, and trial-age eligibility", () => {
  const eligibleData = makeBaseData({
    scoreHr: 100,
    systolicBp: 110,
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
      systolicBp: 110,
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
      systolicBp: 110,
      rr: 24
    })
  );
  assert.equal(bnpOnlyClass.base, "C3");
  const bnpOnly = hiPeithoAssessment(
    makeBaseData({
      troponin: "no",
      bnp: "yes",
      scoreHr: 100,
      systolicBp: 110,
      rr: 24
    }),
    bnpOnlyClass
  );
  assert.equal(bnpOnly.relativeEligible, false);

  const ageOutsideTrial = hiPeithoAssessment(
    makeBaseData({
      patientAge: 81,
      scoreHr: 100,
      systolicBp: 110,
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
      systolicBp: 110,
      rr: 24
    }),
    eligibleCls
  );
  assert.equal(ageMissing.relativeEligible, true);
  assert.equal(ageMissing.recommendationEligible, true);
  assert.equal(ageMissing.absoluteEligible, false);
  assert.ok(ageMissing.trialMismatchNotes.includes("patient age is not entered"));

  const scoreFieldEligible = hiPeithoAssessment(
    makeBaseData({
      patientAge: null,
      scoreSbp: 108,
      systolicBp: null,
      scoreHr: 100,
      rr: 24
    }),
    eligibleCls
  );
  assert.equal(scoreFieldEligible.recommendationEligible, true);
  assert.ok(scoreFieldEligible.metLabels.includes("SBP <=110 mm Hg"));

  const shockPhysiology = hiPeithoAssessment(
    makeBaseData({
      persistentHypotension: true,
      scoreHr: 100,
      systolicBp: 110,
      rr: 24
    }),
    { ...eligibleCls, base: "E1", family: "E" }
  );
  assert.equal(shockPhysiology.absoluteEligible, false);
});

test("HI-PEITHO candidate output can also apply to qualifying D1 and D2 non-shock profiles", () => {
  const d1Data = makeBaseData({
    transientHypotension: true,
    patientAge: 66,
    scoreHr: 105,
    systolicBp: 108,
    rr: 24,
    oxygenSat: 92
  });
  const d1Cls = classify(d1Data);
  assert.equal(d1Cls.base, "D1");
  const d1HiPeitho = hiPeithoAssessment(d1Data, d1Cls);
  assert.equal(d1HiPeitho.recommendationEligible, true);
  assert.equal(d1HiPeitho.absoluteEligible, true);

  const d2Data = makeBaseData({
    shockScore: true,
    patientAge: 58,
    scoreHr: 112,
    systolicBp: 108,
    rr: 24,
    oxygenSat: 89
  });
  const d2Cls = classify(d2Data);
  assert.equal(d2Cls.base, "D2");
  const d2HiPeitho = hiPeithoAssessment(d2Data, d2Cls);
  assert.equal(d2HiPeitho.recommendationEligible, true);
  assert.equal(d2HiPeitho.absoluteEligible, true);
});

test("Bova stage III no longer leaves symptomatic stable PE stuck in B/C pending", () => {
  const data = makeBaseData({
    pesi: null,
    spesi: null,
    bova: 5,
    patientAge: null,
    systolicBp: 100,
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
  assert.ok(html.includes("<h2>Key Comorbidities</h2>"));
  assert.ok(html.includes("<label for=\"patient-sex\">Gender</label>"));
  assert.ok(html.includes("Clinical severity scores will auto-calculate when sufficient data are entered."));
  assert.ok(html.includes("Advanced therapy: this patient's profile may match the phenotype evaluated in the HI-PEITHO study."));
  assert.ok(html.includes("off-trial extrapolation"));
  assert.ok(html.includes("HI-PEITHO enrolled adults aged 18-80 years"));
  assert.ok(html.includes("does not by itself establish a low-risk outpatient threshold"));
  assert.ok(html.includes('recommendations.push("[Operational] Because there is a history of HIT, use a non-heparin anticoagulant rather than UFH or LMWH for initial treatment.");'));
  assert.ok(html.includes("Advanced therapy: systemic thrombolysis and CDL are not suitable (contraindicated); prioritize consideration of MT or surgical thrombectomy, though these too may be contraindicated."));
  assert.ok(html.includes("Advanced therapy: if reperfusion is required, systemic thrombolysis and CDL are not suitable (contraindicated); prioritize consideration of MT or surgical thrombectomy based on clinical trajectory and local expertise."));
  assert.ok(html.includes("Anticoagulation: history of HIT is present. Avoid UFH and LMWH. In this stable confirmed PE profile, apixaban or rivaroxaban at usual VTE treatment doses are reasonable options."));
  assert.ok(html.includes("History of HIT anticoagulation in a stable confirmed PE profile: apixaban 10 mg PO twice daily for 7 days, then 5 mg PO twice daily; alternative rivaroxaban 15 mg PO twice daily for 21 days, then 20 mg PO daily with food."));
  assert.ok(html.includes("anticoagulation may not be suitable, but if pursued, short-acting reversible agents may be preferred"));
  assert.ok(html.includes("active bleeding is present; do not administer anticoagulation. If acute PE cannot be treated with anticoagulation, retrievable IVC filter placement can be useful to reduce the short-term incidence of recurrent PE."));
  assert.ok(html.includes("Disposition: although this profile might otherwise be considered for outpatient or early-discharge care, the presence of an absolute contraindication to thrombolysis may indicate higher hemorrhagic risk; consider observation or hospital admission."));
  assert.ok(html.includes("Disposition: although this profile might otherwise be considered for outpatient or early-discharge care, the presence of a relative bleeding risk consideration may indicate higher hemorrhagic risk; consider observation or hospital admission."));
  assert.ok(html.includes('if (cls.base === "C3" && !hiPeitho.recommendationEligible)'));
  assert.ok(html.includes('if (data.relativeBleedingRisk && !data.contraThrombolysis && reperfusionRelevantCategory)'));
  assert.ok(html.includes("Last updated April 12, 2026."));
  assert.ok(html.includes("history of HIT"));
  assert.ok(!html.includes("Advanced therapy (HI-PEITHO)"));
  assert.ok(!html.includes("HI-PEITHO phenotype features present"));
  assert.ok(!html.includes("HI-PEITHO catheter-directed thrombolysis option"));
  assert.ok(!html.includes("If a HI-PEITHO-style catheter-directed lysis strategy or any off-trial reduced-dose systemic alteplase strategy is used"));
  assert.ok(!html.includes("do not use LMWH in this tool pathway"));
  assert.ok(!html.includes("UFH 80 units/kg IV bolus, then 18 units/kg/hour infusion and bridge to warfarin."));
  assert.ok(!html.includes('actions.push(`[Operational] ${absoluteThrombolysisContraAnticoagulationText(bleeding.absolute)}`);'));
  assert.ok(!html.includes("If systemic thrombolysis is contraindicated, prioritize MT or surgical pathways based on fastest local capability."));
  assert.ok(!html.includes('if (data.highBleedingRisk && !data.contraThrombolysis && reperfusionRelevantCategory)'));
  assert.ok(!html.includes('recommendations.push(`[COR 2a] ${absoluteThrombolysisContraAnticoagulationText(bleeding.absolute)}`);'));
  assert.ok(!html.includes("<h2>Clinical Severity Score</h2>"));
  assert.ok(!html.includes("Hestia positive items"));
  assert.ok(!html.includes("manual score systolic BP"));
  assert.ok(!html.includes("score-mode"));
  assert.ok(!html.includes('actions.push("[Operational] Because there is a history of HIT'));
});
