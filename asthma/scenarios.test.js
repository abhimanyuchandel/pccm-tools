const test = require("node:test");
const assert = require("node:assert/strict");
const L = require("./logic.js");
const N = require("./notes.js");
const I = require("./inhalers.js");

// Synthetic encounters, not patient records. Clinical expectations are described in SCENARIO_AUDIT.md.
const base = patch => ({ ...L.createEmptyState(), age: 45, managementPhase: "followup", diagnosisContext: "established", typicalSymptoms: true, dxChallenge: true,
  controller: "ics-formoterol", icsDose: "medium", reliever: "ics-formoterol", symptomDays: "none", nightWaking: "none", activityLimitation: false,
  ocsExacerbations: 0, hospitalExacerbations: 0, pregnant: false, recentExacerbation: false, priorIcu: false, lamaAddon: false, maintenanceOcs: false, ...patch });
const poor = patch => base({ symptomDays: "daily", nightWaking: "weekly-plus", activityLimitation: true, ...patch });
const stable = patch => base({ stableMonths: 4, lungFunctionStable: true, respiratoryInfection: false, travelling: false, ...patch });
const product = (presetId, patch) => base({ treatmentEntry: "product", icsDose: "unknown", currentControllerProduct: I.PRESETS[presetId].productId, currentControllerPreset: presetId, currentRelieverProduct: "albuterol", ...patch });
const acute = patch => base({ acutePresentation: "active", acuteSpeech: "sentences", acuteMentalStatus: "normal", acuteCanLieDown: true,
  acuteCannotDrink: false, acuteUnableToLieDown: false, acuteCyanosis: false, acuteRespiratoryEffort: "normal-mild", acuteAccessoryMuscles: "none-mild",
  acuteAirEntry: "normal", acuteWheeze: "none-mild", spo2: 96, roomAir: true, respiratoryRate: 20,
  acuteLungFunctionPercent: 80, acuteLungFunctionType: "pef", acuteLungFunctionReference: "personal-best", ...patch });
const generate = (data, selection = {}) => {
  const rec = L.buildRecommendation(data, selection);
  const text = N.buildNoteText(data, rec);
  assert.equal(rec.invalid, false);
  assert.match(text, /^Subjective\n[\s\S]+\n\nObjective\n[\s\S]+\n\nAssessment\n[\s\S]+\n\nPlan\n/);
  assert.doesNotMatch(text, /\b(?:undefined|NaN|Infinity)\b|Examination: normal|Vaccines administered|Counseling completed|patient denied/i);
  assert.match(text, /Additional interval history: \*\*\*/);
  assert.match(text, /Examination: \*\*\*/);
  return { rec, text, plan: text.split("\nPlan\n")[1], actions: rec.actions.map(action => action.id) };
};
const option = (rec, id) => rec.plan.groups.find(group => group.id === "controller")?.options.find(item => item.id === id);

const scenarios = [
  ["initial infrequent symptoms support AIR with an actionable selected prescription", () => {
    const result = generate(base({ managementPhase: "initial", controller: "none", reliever: "none", icsDose: "unknown", symptomDays: "one-two" }), { planSelections: { controller: "air", controllerProduct: "breyna-air" } });
    assert.match(result.plan, /Breyna 160\/4.5.*1 inhalation as needed/);
    assert.doesNotMatch(result.plan, /maintenance ICS-LABA|Wixela/);
  }],
  ["initial most-day symptoms with preserved lung function support low-dose SMART", () => {
    const { rec } = generate(base({ managementPhase: "initial", controller: "none", reliever: "none", icsDose: "unknown", symptomDays: "four-six", fev1Predicted: 95 }));
    assert.ok(option(rec, "smartLow"));
  }],
  ["initial daily symptoms and reduced lung function support medium-dose SMART", () => {
    const { rec } = generate(poor({ managementPhase: "initial", controller: "none", reliever: "none", fev1Predicted: 65 }));
    assert.ok(option(rec, "smartMedium"));
  }],
  ["suspected asthma with negative testing remains unconfirmed", () => {
    const { text, actions } = generate(base({ diagnosisContext: "suspected", dxChallenge: false, bronchoprovocation: "negative", clinicalIcsResponse: true }));
    assert.match(text, /Asthma was suspected and required objective confirmation/);
    assert.ok(actions.includes("diagnostic-confirmation"));
  }],
  ["established asthma without the original report does not trigger ICS withdrawal", () => {
    const { text, rec } = generate(base({ dxChallenge: false }));
    assert.equal(rec.findings.diagnosis.supported, true);
    assert.match(text, /retain effective ICS treatment/);
  }],
  ["follow-up SABA-only with minimal symptoms offers an ICS-containing start, not imaginary continuation", () => {
    const { rec, actions, text } = generate(base({ controller: "saba-only", reliever: "saba", sabaFrequency: "none", icsDose: "unknown" }));
    assert.ok(option(rec, "air"));
    assert.equal(actions.includes("continue"), false);
    assert.equal(actions.includes("stepdown-conditional"), false);
    assert.doesNotMatch(text, /continuation of the effective ICS-containing regimen/);
  }],
  ["follow-up untreated daily symptoms has a selectable controller-start pathway", () => {
    const { rec, actions, plan } = generate(poor({ controller: "none", reliever: "none", icsDose: "unknown" }), { planSelections: { controller: "smartLow", controllerProduct: "symbicort-smart-low" } });
    assert.equal(rec.plan.selections.controller, "smartLow");
    assert.equal(actions.includes("clarify-regimen"), false);
    assert.match(plan, /Symbicort 160\/4.5.*1 inhalation twice daily plus 1 as needed/);
  }],
  ["follow-up SABA-only with incomplete symptoms does not guess low-intensity treatment", () => {
    const { rec, text, actions } = generate(base({ controller: "saba-only", reliever: "saba", symptomDays: "unknown", nightWaking: "unknown", activityLimitation: null, sabaFrequency: "unknown" }));
    assert.equal(rec.findings.control.complete, false);
    assert.equal(actions.includes("continue"), false);
    assert.match(text, /could not be fully classified/);
    assert.ok(actions.includes("complete-initial") || actions.includes("complete-control"));
  }],
  ["uncontrolled medium-dose ICS monotherapy offers a combination-controller pathway", () => {
    const { rec, actions } = generate(poor({ controller: "ics", icsDose: "medium", reliever: "saba", sabaFrequency: "more-two" }));
    assert.ok(option(rec, "smartMedium"));
    assert.equal(actions.includes("clarify-regimen"), false);
  }],
  ["uncontrolled high-dose ICS monotherapy retains a clinician-selected combination prescription", () => {
    const d = poor({ controller: "ics", icsDose: "high", reliever: "saba", sabaFrequency: "more-two" });
    const { rec, plan } = generate(d, { planSelections: { controller: "track2", controllerProduct: "wixela-250-50", relieverProduct: "airsupra" } });
    assert.equal(rec.plan.selections.controller, "track2");
    assert.match(plan, /Wixela Inhub 250\/50/);
    assert.match(plan, /Replace the prior ICS controller/);
    assert.doesNotMatch(N.buildNoteText(d, rec).split("\n\nAssessment\n")[1].split("\n\nPlan\n")[0], /planned regimen is budesonide.*SMART/);
  }],
  ["poor control on as-needed Airsupra alone offers maintenance therapy rather than regimen clarification", () => {
    const { rec, actions } = generate(poor({ controller: "none", reliever: "ics-saba", icsDose: "unknown" }));
    assert.ok(option(rec, "smartLow"));
    assert.equal(actions.includes("clarify-regimen"), false);
  }],
  ["effective Track 2 remains available without an obligatory SMART conversion", () => {
    const { plan, text } = generate(product("breo-100", { currentRelieverProduct: "xopenex", sabaFrequency: "one-two" }), { planSelections: { controller: "continue" } });
    assert.match(plan, /Continue Breo Ellipta 100\/25/);
    assert.match(plan, /Xopenex HFA/);
    assert.doesNotMatch(plan, /Start.*SMART|Change to.*SMART/);
    assert.match(text, /GINA Track 2 Step 3/);
  }],
  ["incorrect technique prevents a routine step-up prescription", () => {
    const { rec, actions } = generate(poor({ controller: "ics", icsDose: "low", reliever: "saba", sabaFrequency: "more-two", technique: "incorrect" }), { planSelections: { controller: "smartLow" } });
    assert.ok(actions.includes("optimize"));
    assert.notEqual(rec.plan.selections.controller, "smartLow");
  }],
  ["controlled symptoms do not conceal two steroid-requiring exacerbations", () => {
    const { rec, actions, text } = generate(base({ ocsExacerbations: 2, stableMonths: 4, lungFunctionStable: true }));
    assert.equal(rec.findings.control.classification, "well controlled");
    assert.equal(rec.findings.risk.frequent, true);
    assert.ok(actions.includes("step5-review"));
    assert.equal(actions.includes("stepdown"), false);
    assert.match(text, /2 exacerbations requiring oral corticosteroids/);
  }],
  ["positive hospitalization remains actionable with missing steroid-burst history", () => {
    const { rec, text } = generate(base({ ocsExacerbations: null, hospitalExacerbations: 1 }));
    assert.equal(rec.findings.risk.frequent, true);
    assert.equal(rec.findings.risk.complete, false);
    assert.match(text, /1 asthma hospitalization/);
    assert.doesNotMatch(text, /No exacerbations requiring/);
  }],
  ["supported SMART step-down has matched dosing and earlier review", () => {
    const { plan } = generate(stable({}), { planSelections: { controller: "stepdown", controllerProduct: "breyna-smart-low" } });
    assert.match(plan, /Breyna.*1 inhalation twice daily plus 1 as needed/);
    assert.match(plan, /4-8 weeks/);
    assert.doesNotMatch(plan, /Follow up in about 3 months/);
  }],
  ["pregnancy defers elective step-down despite sustained control", () => {
    const { rec } = generate(stable({ pregnant: true }), { planSelections: { controller: "stepdown" } });
    assert.notEqual(rec.plan.selections.controller, "stepdown");
  }],
  ["missing exacerbation history prevents elective step-down", () => {
    const { rec } = generate(stable({ ocsExacerbations: null }), { planSelections: { controller: "stepdown" } });
    assert.notEqual(rec.plan.selections.controller, "stepdown");
  }],
  ["unverified high-dose SMART cannot silently become a step-down prescription", () => {
    const { rec, actions } = generate(stable({ icsDose: "high" }), { planSelections: { controller: "stepdown", controllerProduct: "symbicort-smart-once" } });
    assert.equal(actions.includes("stepdown"), false);
    assert.notEqual(rec.plan.selections.controller, "stepdown");
    assert.equal(rec.medications.some(m => m.id === "inhaler-symbicort-smart-once"), false);
  }],
  ["unsupported ICS-only plus formoterol relief cannot acquire a generic step-down prescription", () => {
    const { rec } = generate(stable({ controller: "ics", icsDose: "medium", reliever: "ics-formoterol" }), { planSelections: { controller: "stepdown" } });
    assert.notEqual(rec.plan.selections.controller, "stepdown");
    assert.ok(rec.actions.some(a => a.id === "clarify-regimen"));
  }],
  ["medium SMART plus phenotype does not automatically assert immediate biologic initiation", () => {
    const { rec, plan } = generate(poor({ eosinophils: 450, feno: 45, ocsExacerbations: 2 }), { selectedBiologicId: "benralizumab" });
    assert.ok(rec.biologicCandidates.some(c => c.id === "benralizumab"));
    assert.ok(rec.biologicCandidates.every(c => !c.ready));
    assert.doesNotMatch(plan, /Benralizumab.*has been recommended|Biologic regimen:/);
  }],
  ["reviewed severe eosinophilic asthma permits continuing MART with the selected biologic", () => {
    const { rec, plan } = generate(poor({ eosinophils: 450, feno: 45, ocsExacerbations: 2 }), { selectedBiologicId: "benralizumab", planSelections: { controller: "continue-biologic" } });
    assert.equal(rec.plan.selections.controller, "continue-biologic");
    assert.match(plan, /Benralizumab.*has been recommended/);
    assert.match(plan, /30 mg SC every 4 weeks for the first 3 doses, then every 8 weeks/);
    assert.doesNotMatch(plan, /Biologic regimen:.*(?:Mepolizumab|Dupilumab|Reslizumab)/);
  }],
  ["low documented Type 2 biomarkers retain an appropriate tezepelumab review", () => {
    const { rec } = generate(poor({ controller: "ics-laba", labaType: "non-formoterol", reliever: "ics-saba", icsDose: "high", eosinophils: 50, feno: 10, ocsExacerbations: 2, perennialSensitization: false }));
    assert.deepEqual(rec.biologicCandidates.map(c => c.id), ["tezepelumab"]);
  }],
  ["OCS-dependent asthma retains dupilumab with low current eosinophils", () => {
    const { plan } = generate(poor({ ocsExacerbations: 2, maintenanceOcs: true, maintenanceOcsDose: 10, eosinophils: 50, feno: 10 }), { selectedBiologicId: "dupilumab", planSelections: { controller: "continue-biologic" } });
    assert.match(plan, /600 mg SC loading followed by 300 mg SC every 2 weeks/);
  }],
  ["suspected EGPA prevents an asthma-only biologic initiation assumption", () => {
    const { rec, actions } = generate(poor({ egpa: "suspected", eosinophils: 1800, ocsExacerbations: 2 }), { selectedBiologicId: "mepolizumab", planSelections: { controller: "continue-biologic" } });
    assert.notEqual(rec.plan.selections.controller, "continue-biologic");
    assert.ok(actions.includes("egpa-workup"));
    assert.equal(rec.biologicCandidates.some(c => c.id === "dupilumab"), false);
  }],
  ["existing biologic treatment produces response review rather than dual-biologic dosing", () => {
    const { plan } = generate(poor({ currentBiologic: "mepolizumab", biologicMonths: 2, eosinophils: 450, ocsExacerbations: 2 }), { selectedBiologicId: "benralizumab", planSelections: { controller: "assess-biologic" } });
    assert.match(plan, /Assess response to Mepolizumab/);
    assert.doesNotMatch(plan, /Biologic regimen:|30 mg SC every/);
  }],
  ["missing omalizumab weight cannot produce a definitive dose", () => {
    const { rec, plan } = generate(poor({ ocsExacerbations: 2, allergenDriven: true, perennialSensitization: true, totalIge: 100, igePretreatment: true }), { selectedBiologicId: "omalizumab", planSelections: { controller: "continue-biologic" } });
    assert.ok(rec.biologicCandidates.some(c => c.id === "omalizumab"));
    assert.notEqual(rec.plan.selections.controller, "continue-biologic");
    assert.doesNotMatch(plan, /Biologic regimen:|Omalizumab \d+ mg/);
  }],
  ["verified allergic phenotype and dosing inputs support selected omalizumab", () => {
    const { rec, plan } = generate(poor({ ocsExacerbations: 2, allergenDriven: true, perennialSensitization: true, totalIge: 100, weightKg: 75, igePretreatment: true }), { selectedBiologicId: "omalizumab", planSelections: { controller: "continue-biologic" } });
    assert.equal(rec.plan.selections.controller, "continue-biologic");
    assert.match(plan, /Omalizumab 150 mg SC every 4 weeks/);
  }],
  ["renal impairment leads to reduced varenicline dosing", () => {
    const { plan } = generate(base({ smoking: "current", smokingSafetyReviewed: true, smokingRenal: "severe" }), { selectedSmokingPlanId: "varenicline" });
    assert.match(plan, /maximum of 0.5 mg twice daily/);
    assert.doesNotMatch(plan, /then 1 mg twice daily/);
  }],
  ["seizure history blocks bupropion rather than copying an unsafe prescription", () => {
    const { rec, plan } = generate(base({ smoking: "current", smokingSafetyReviewed: true, smokingSeizure: true, smokingRenal: "normal" }), { selectedSmokingPlanId: "bupropion" });
    assert.equal(rec.smokingSupport.selected, null);
    assert.doesNotMatch(plan, /Start Bupropion|150 mg twice daily/);
  }],
  ["pregnancy favors selected behavioral cessation support without an invented completed discussion", () => {
    const { plan } = generate(base({ smoking: "current", pregnant: true }), { selectedSmokingPlanId: "behavioral" });
    assert.match(plan, /Use behavioral support without medication for now/);
    assert.doesNotMatch(plan, /Start Varenicline|Start Bupropion|Counseling was provided/);
  }],
  ["young adult asthma pneumococcal gap is specific but RSV is not routinely inferred", () => {
    const { plan, actions } = generate(base({ age: 25, pneumococcal: "due" }));
    assert.match(plan, /PCV20.*PCV21.*PCV15/);
    assert.equal(actions.includes("vaccine-rsv"), false);
  }],
  ["eligible older adult receives a one-time RSV reminder and completed vaccines are not repeated", () => {
    const { plan, actions } = generate(base({ age: 65, rsv: "due", pneumococcal: "complete", zoster: "complete" }));
    assert.match(plan, /1 dose Arexvy, Abrysvo, or mResvia/);
    assert.match(plan, /not an annual vaccine/);
    assert.equal(actions.includes("vaccine-pneumococcal"), false);
  }],
  ["maternal RSV review is distinct from routine adult RSV products", () => {
    const { plan } = generate(base({ age: 30, pregnant: true, rsv: "due" }));
    assert.match(plan, /Abrysvo at 32 weeks/);
    assert.match(plan, /Do not substitute Arexvy or mResvia/);
  }],
  ["mild active exacerbation retains reassessment without claiming medication administration", () => {
    const { rec, plan, text } = generate(acute({}));
    assert.equal(rec.findings.acute.classification, "mild");
    assert.match(plan, /2 inhalations.*30-60 minutes/);
    assert.match(plan, /2-7 days/);
    assert.match(text, /Treatment administered, dose, and timing: \*\*\*/);
    assert.doesNotMatch(text, /The patient improved|Discharged home/);
  }],
  ["moderate active exacerbation includes a short corticosteroid course and first-hour reassessment", () => {
    const { rec, plan } = generate(acute({ respiratoryRate: 25, acuteSpeech: "phrases", acuteLungFunctionPercent: 60 }));
    assert.equal(rec.findings.acute.classification, "moderate");
    assert.match(plan, /40-50 mg daily for 5-7 days/);
    assert.match(plan, /Reassessment within the first hour/);
  }],
  ["missing active measurements cannot establish mild severity or outpatient safety", () => {
    const { rec, plan } = generate(acute({ spo2: null, respiratoryRate: null, acuteLungFunctionPercent: null }));
    assert.equal(rec.findings.acute.complete, false);
    assert.equal(rec.findings.acute.mild, false);
    assert.equal(rec.findings.acute.dischargeCriteriaDocumented, false);
    assert.match(plan, /Missing measurements did not establish outpatient safety/);
  }],
  ["severe hypoxemia overrides biologic and routine controller prescriptions", () => {
    const { rec, plan } = generate(acute({ spo2: 85, eosinophils: 450, ocsExacerbations: 2 }), { selectedBiologicId: "benralizumab", planSelections: { controller: "continue-biologic", lama: "add" } });
    assert.equal(rec.emergency, true);
    assert.equal(rec.plan.groups.length, 0);
    assert.match(plan, /Immediate emergency assessment/);
    assert.doesNotMatch(plan, /Biologic regimen:|Add tiotropium|Controller and reliever plan: \*\*\*/);
  }],
  ["resolved exacerbation uses routine recovery review, not an active-treatment or discharge pathway", () => {
    const { actions, plan } = generate(base({ acutePresentation: "recent" }));
    assert.equal(actions.includes("acute-relief"), false);
    assert.match(plan, /recovery review within 2-7 days/i);
    assert.doesNotMatch(plan, /discharge readiness|40-50 mg daily/);
  }]
];
for (const [name, run] of scenarios) test(`Encounter: ${name}`, run);

test("inhaler matrix preserves product-specific history and blocks incompatible LABAs", () => {
  let encounters = 0;
  for (const p of Object.values(I.PRESETS).filter(p => p.role === "maintenance" && p.category !== "lama")) {
    for (const rescue of ["albuterol", "airsupra", "air-symbicort"]) {
      const { rec, text, plan } = generate(product(p.id, { currentRelieverProduct: rescue, sabaFrequency: "one-two" }), { planSelections: { controller: "continue" } });
      assert.match(text.split("\n\nObjective")[0], new RegExp(p.strength.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      const unsupported = rescue === "air-symbicort" && (p.labaType === "non-formoterol" || p.productId === "dulera" || p.strength === "80/4.5" || p.category === "ics");
      if (unsupported || p.intensity === "unknown") assert.notEqual(rec.plan.selections.controller, "continue", p.id + "/" + rescue);
      else {
        assert.equal(rec.plan.selections.controller, "continue", p.id + "/" + rescue);
        assert.match(plan, new RegExp(I.PRODUCTS[p.productId].name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      }
      encounters++;
    }
  }
  assert.ok(encounters >= 90);
});

test("symptom and exacerbation matrix never invents control or negative history", () => {
  let encounters = 0;
  for (const symptomDays of ["unknown", "none", "one-two", "daily"]) {
    for (const nightWaking of ["unknown", "none", "weekly-plus"]) {
      for (const activityLimitation of [null, false, true]) {
        for (const ocsExacerbations of [null, 0, 2]) {
          const { rec, text, actions } = generate(base({ symptomDays, nightWaking, activityLimitation, ocsExacerbations }));
          const incomplete = symptomDays === "unknown" || nightWaking === "unknown" || activityLimitation === null;
          if (incomplete) assert.notEqual(rec.findings.control.classification, "well controlled");
          if (ocsExacerbations === null) assert.doesNotMatch(text, /No exacerbations requiring oral corticosteroids/);
          if (ocsExacerbations === 2) {
            assert.equal(rec.findings.risk.frequent, true);
            assert.ok(actions.includes("step5-review"));
            assert.equal(actions.includes("stepdown"), false);
          }
          encounters++;
        }
      }
    }
  }
  assert.equal(encounters, 108);
});

test("urgent findings retain priority across routine, active, and resolved encounter contexts", () => {
  const urgent = [{ spo2: 85 }, { respiratoryRate: 35 }, { acuteAirEntry: "silent" }, { acuteSpeech: "unable" }, { acuteCyanosis: true },
    { acuteMentalStatus: "confused" }, { acuteCannotDrink: true }, { acuteUnableToLieDown: true }, { acuteLungFunctionPercent: 40 },
    { acuteResponse: "worsening" }, { postTreatmentSpo2: 85 }, { postTreatmentLungFunctionPercent: 40 }];
  for (const acutePresentation of ["none", "active", "recent"]) {
    for (const finding of urgent) {
      const { rec, plan, text } = generate(acute({ ...finding, acutePresentation, stableMonths: 6, lungFunctionStable: true, eosinophils: 450 }), {
        selectedBiologicId: "benralizumab", planSelections: { controller: "stepdown", controllerProduct: "symbicort-smart-low", lama: "add" }
      });
      assert.equal(rec.emergency, true, JSON.stringify({ acutePresentation, finding }));
      assert.equal(rec.plan.groups.length, 0);
      assert.match(plan, /Immediate emergency assessment/);
      assert.doesNotMatch(plan, /Reduce to|Biologic regimen:|Add tiotropium|Follow up in about 3 months/);
      assert.doesNotMatch(text, /No urgent red-flag features were documented/);
    }
  }
});
