const test = require("node:test");
const assert = require("node:assert/strict");
const L = require("./logic.js");
const N = require("./notes.js");
const W = require("./workflow.js");
const C = require("./medications.js");
const base = {
  age: 65,
  encounter: "routine",
  managementPhase: "followup",
  redFlags: false,
  diagnosisContext: "established",
  historicalObstruction: true,
  currentRegimen: "laba-lama",
  reliever: "albuterol",
  addonContext: "none",
  asthma: "no",
  catScore: 14,
  moderateExac: 0,
  severeExac: 0,
  smokingStatus: "former",
};
const build = (changes = {}, selections = {}) =>
  L.buildRecommendation({ ...base, ...changes }, selections);
const group = (r, id) => r.groups.find((g) => g.id === id);
const opt = (r, id, value) => group(r, id)?.options.find((o) => o.id === value);
const text = (r) => r.actions.map((a) => a.text).join("\n");

test("explicit unknowns and blank numbers remain unknown; only routine barriers default absent", () => {
  const d = L.createEmptyState();
  assert.equal(d.encounter, "routine");
  assert.equal(d.redFlags, null);
  assert.equal(d.moderateExac, null);
  assert.equal(d.currentBiologic, "unknown");
  assert.equal(d.adherenceConcern, false);
  assert.equal(L.normalizeState({ age: "" }).age, null);
  assert.equal(
    L.normalizeState({ addonContext: "none" }).maintenanceOcs,
    false,
  );
});
test("a general no-add-ons answer cannot erase a known positive systemic-steroid exposure", () => {
  assert.equal(
    L.normalizeState({ addonContext: "none", maintenanceOcs: true })
      .maintenanceOcs,
    true,
  );
  assert.equal(
    L.normalizeState({ addonContext: "none", currentBiologic: "dupilumab" })
      .currentBiologic,
    "dupilumab",
  );
});
for (const [input, result] of [
  [65, 0.65],
  [0.699, 0.699],
  [0.7, 0.7],
  [70, 0.7],
  [250, null],
  ["", null],
])
  test("FEV1/FVC exact threshold " + input, () =>
    assert.equal(L.normalizeFev1FvcHeuristic(input), result),
  );
for (const [m, s, high, expected] of [
  [1, 0, true, "E"],
  [null, 1, true, "E"],
  [1, null, true, "E"],
  [0, null, null, null],
  [null, 0, null, null],
  [0, 0, false, "B"],
  [null, null, null, null],
]) {
  test("exacerbation history " + JSON.stringify([m, s]), () => {
    const r = build({ moderateExac: m, severeExac: s });
    assert.equal(r.findings.risk.high, high);
    assert.equal(r.group, expected);
    if (m === null || s === null) assert.equal(r.findings.risk.total, null);
  });
}
test("either symptom instrument suffices; no instrument does not establish low symptoms", () => {
  assert.equal(
    L.assignGoldGroup({
      catScore: 9,
      mmrcScore: null,
      moderateExac: 0,
      severeExac: 0,
    }),
    "A",
  );
  assert.equal(
    L.assignGoldGroup({
      catScore: null,
      mmrcScore: 2,
      moderateExac: 0,
      severeExac: 0,
    }),
    "B",
  );
  assert.equal(
    L.assignGoldGroup({
      catScore: null,
      mmrcScore: null,
      moderateExac: 0,
      severeExac: 0,
    }),
    null,
  );
  assert.equal(
    L.assignGoldGroup(
      L.classifySymptoms(base),
      L.classifyExacerbationRisk(base),
    ),
    "B",
  );
});
test("established diagnosis does not require repeat spirometry at every encounter", () => {
  const r = build({ historicalObstruction: null });
  assert.equal(r.findings.diagnosis.supported, true);
  assert.equal(r.findings.diagnosis.objective, false);
  assert.match(text(r), /Retrieve prior/);
  assert.equal(
    build({ diagnosisContext: "suspected", historicalObstruction: null })
      .findings.diagnosis.supported,
    false,
  );
});
test("current normal ratio and historical obstruction are reconciled, not erased", () => {
  const r = build({ fev1fvc: 0.72 });
  assert.equal(r.findings.diagnosis.supported, true);
  assert.ok(r.cautions.some((t) => /does not show/.test(t)));
});
test("existing maintenance activates follow-up; assumption never copied into SOAP", () => {
  const r = build({ managementPhase: "initial" });
  assert.equal(r.findings.therapy.phase, "followup");
  assert.match(r.cautions.join(" "), /follow-up management logic/);
  assert.doesNotMatch(N.buildNoteText(r), /logic was used|Initial mode/);
});
test("initial Group B offers dual therapy; Group E high eosinophils offers triple", () => {
  assert.ok(
    opt(
      build({ currentRegimen: "naive", managementPhase: "initial" }),
      "controller",
      "dual",
    ),
  );
  assert.ok(
    opt(
      build({
        currentRegimen: "naive",
        managementPhase: "initial",
        moderateExac: 1,
        eosinophils: 300,
      }),
      "controller",
      "triple",
    ),
  );
});
test("follow-up uses dyspnea and exacerbation pathways simultaneously", () => {
  const r = build({
    currentRegimen: "lama",
    persistentDyspnea: true,
    moderateExac: 1,
  });
  assert.ok(opt(r, "controller", "dual"));
  assert.ok(
    opt(build({ moderateExac: 1, eosinophils: 100 }), "controller", "triple"),
  );
  assert.equal(
    opt(build({ moderateExac: 1, eosinophils: 99 }), "controller", "triple"),
    undefined,
  );
});
test("barriers block routine escalation without erasing positive risk", () => {
  const r = build(
    { adherenceConcern: true, moderateExac: 1, eosinophils: 300 },
    { controller: "triple" },
  );
  assert.equal(r.group, "E");
  assert.ok(opt(r, "controller", "triple").blockers.length);
  assert.equal(r.selections.controller, undefined);
});
for (const asthma of ["unknown", "suspected", "confirmed"])
  test("non-ICS change is blocked when asthma is " + asthma, () => {
    const r = build({
      currentRegimen: "lama",
      persistentDyspnea: true,
      asthma,
    });
    assert.ok(opt(r, "controller", "dual").blockers.length);
  });
for (const [key, val] of [
  ["asthma", "confirmed"],
  ["asthma", "unknown"],
  ["eosinophils", 300],
  ["eosinophils", null],
  ["historicalEosinophils", 300],
  ["moderateExac", 1],
  ["severeExac", null],
]) {
  test("ICS withdrawal safeguard " + key + "=" + val, () => {
    const r = build(
      {
        currentRegimen: "triple",
        icsSideEffects: true,
        eosinophils: 100,
        ...{ [key]: val },
      },
      { controller: "withdraw" },
    );
    assert.ok(opt(r, "controller", "withdraw").blockers.length);
    assert.equal(r.selections.controller, undefined);
  });
}
test("selected ICS withdrawal and product retain withdrawal monitoring and no duplicate controller", () => {
  const r = build(
    { currentRegimen: "triple", icsSideEffects: true, eosinophils: 100 },
    { controller: "withdraw", product: "anoro" },
  );
  assert.equal(r.selections.product, "anoro");
  assert.match(text(r), /Withdraw the previous ICS/);
  assert.match(text(r), /62.5\/25/);
  assert.equal(
    r.actions.filter((a) => a.id === "selected-controller").length,
    0,
  );
});
test("controller changes invalidate an incompatible product; note contains only the selected product", () => {
  const r = build(
    { moderateExac: 1, eosinophils: 300 },
    { controller: "triple", product: "anoro" },
  );
  assert.equal(r.selections.product, undefined);
  const good = build(
    { moderateExac: 1, eosinophils: 300 },
    { controller: "triple", product: "trelegy" },
  );
  const note = N.buildNoteText(good);
  assert.match(note, /100\/62.5\/25/);
  assert.doesNotMatch(note, /Breztri|160\/9\/4.8|200\/62.5/);
});
test("COPD product catalog uses COPD doses, not asthma SMART or biologic loading doses", () => {
  assert.match(C.MEDICATIONS.spiriva.dose, /2.5 mcg.*2 inhalations/);
  assert.match(
    C.MEDICATIONS.breztri.dose,
    /160\/9\/4.8.*2 inhalations twice daily/,
  );
  assert.match(C.MEDICATIONS.mepolizumab.dose, /100 mg.*4 weeks/);
  assert.match(C.MEDICATIONS.dupilumab.dose, /300 mg.*2 weeks/);
  assert.doesNotMatch(C.MEDICATIONS.dupilumab.dose, /600|loading/);
});
const controllerPresets = {
  lama: ["spiriva", "handihaler", "incruse", "yupelri"],
  laba: ["striverdi", "brovana", "perforomist"],
  "laba-lama": ["anoro", "stiolto", "bevespi"],
  "ics-laba": ["symbicort", "breo", "advair", "wixela"],
  triple: ["trelegy", "breztri", "separateTriple"],
};
for (const [category, ids] of Object.entries(controllerPresets)) {
  test(
    category +
      " has relevant formulary examples when continuing the current treatment class",
    () => {
      const r = build({ currentRegimen: category }, { controller: "continue" });
      assert.deepEqual(
        group(r, "product")
          .options.map((o) => o.id)
          .sort(),
        [...ids].sort(),
      );
    },
  );
  for (const id of ids)
    test(
      "selected controller preset " +
        id +
        " agrees with its class, dose and note",
      () => {
        const r = build(
          { currentRegimen: category },
          { controller: "continue", product: id },
        );
        assert.equal(r.selections.product, id);
        assert.equal(C.MEDICATIONS[id].category, category);
        const n = N.buildNoteText(r);
        assert.ok(n.includes(C.MEDICATIONS[id].dose));
        for (const source of C.getMedicationSources(id))
          assert.ok(
            r.sources.includes(source) &&
              C.SOURCES[source]?.url.startsWith("https://"),
          );
        for (const other of ids.filter((other) => other !== id)) {
          if (C.MEDICATIONS[other].dose !== C.MEDICATIONS[id].dose)
            assert.ok(!n.includes(C.MEDICATIONS[other].dose));
        }
        assert.equal(
          r.actions.some((a) => a.id === "selected-controller"),
          false,
        );
      },
    );
}
test("new U.S. controller doses retain product/device-specific COPD strengths", () => {
  assert.match(
    C.MEDICATIONS.stiolto.dose,
    /2.5\/2.5.*2 inhalations once daily/,
  );
  assert.match(C.MEDICATIONS.bevespi.dose, /9\/4.8.*2 inhalations twice daily/);
  assert.match(
    C.MEDICATIONS.handihaler.dose,
    /ONE capsule once daily.*two inhalations/,
  );
  assert.match(C.MEDICATIONS.incruse.dose, /62.5.*1 inhalation once daily/);
  assert.match(C.MEDICATIONS.yupelri.dose, /175 mcg\/3 mL.*once daily/);
  assert.match(C.MEDICATIONS.brovana.dose, /15 mcg\/2 mL.*twice daily/);
  assert.match(C.MEDICATIONS.perforomist.dose, /20 mcg\/2 mL.*12 hours/);
  assert.match(C.MEDICATIONS.breo.dose, /100\/25.*1 inhalation once daily/);
  assert.doesNotMatch(C.MEDICATIONS.breo.dose, /200\/25/);
  for (const id of ["advair", "wixela"])
    assert.match(C.MEDICATIONS[id].dose, /250\/50.*1 inhalation twice daily/);
});
test("separate-inhaler triple is one complete regimen with both component sources and no competing triple", () => {
  const r = build(
    { moderateExac: 1, eosinophils: 300 },
    { controller: "triple", product: "separateTriple" },
  );
  assert.equal(r.selections.product, "separateTriple");
  const n = N.buildNoteText(r);
  assert.match(
    n,
    /160\/4.5.*2 inhalations twice daily, PLUS tiotropium Respimat 2.5 mcg.*2 inhalations once daily/,
  );
  assert.ok(r.sources.includes("symbicort") && r.sources.includes("spiriva"));
  assert.doesNotMatch(n, /100\/62.5\/25|160\/9\/4.8/);
});
test("continuation product presets still require adult prescribing context and device suitability", () => {
  for (const changes of [
    { age: null },
    { deviceConcern: true },
    { diagnosisContext: "suspected", historicalObstruction: null },
  ]) {
    assert.equal(
      build(changes, { controller: "continue", product: "stiolto" }).selections
        .product,
      undefined,
    );
  }
  // An access concern can be addressed by selecting a covered alternative within the same class.
  assert.equal(
    build(
      { accessConcern: true },
      { controller: "continue", product: "stiolto" },
    ).selections.product,
    "stiolto",
  );
  assert.equal(
    build(
      { currentRegimen: "triple" },
      { controller: "continue", product: "stiolto" },
    ).selections.product,
    undefined,
  );
});
for (const [gender, wording] of [
  ["male", "man"],
  ["female", "woman"],
  ["nonbinary", "nonbinary patient"],
])
  test(
    "Subjective records age and " +
      gender +
      " without changing clinical decisions",
    () => {
      const r = build({ gender }),
        neutral = build();
      const subjective = N.buildNoteText(r).split("\n\nObjective")[0];
      assert.match(subjective, new RegExp("65-year-old " + wording));
      assert.match(
        subjective,
        /Current controller and rescue medications are: \*\*\*\./,
      );
      assert.doesNotMatch(
        subjective,
        /Current medication names, strengths and schedule/,
      );
      assert.deepEqual(r.actions, neutral.actions);
      assert.deepEqual(r.findings, neutral.findings);
      assert.ok(subjective.includes("\n\nInterval history: ***.\n\n"));
    },
  );
test("Subjective omits undocumented demographics and does not convert missing exacerbations into negatives", () => {
  const subjective = N.buildNoteText(
    build({
      age: null,
      gender: "unknown",
      moderateExac: 1,
      severeExac: null,
      smokingStatus: "unknown",
    }),
  ).split("\n\nObjective")[0];
  assert.doesNotMatch(
    subjective,
    /year-old|woman|\bman\b|no exacerbation-related hospitalization|never smok/,
  );
  assert.match(subjective, /1 exacerbation treated/);
});
test("Subjective reflects encounter context and keeps planned medication out of current medication history", () => {
  for (const [encounter, reason] of [
    ["routine", "COPD follow-up"],
    ["active", "an acute respiratory exacerbation"],
    ["recovery", "follow-up after a respiratory exacerbation"],
  ]) {
    assert.ok(
      N.buildNoteText(build({ encounter, gender: "female" }))
        .split("\n\nObjective")[0]
        .includes(reason),
    );
  }
  const r = build({}, { controller: "continue", product: "stiolto" });
  assert.ok(
    !N.buildNoteText(r)
      .split("\n\nObjective")[0]
      .includes(C.MEDICATIONS.stiolto.dose),
  );
  assert.equal(L.createEmptyState().gender, "unknown");
  assert.ok(
    W.steps(r.data, r)
      .find((s) => s.id === "context")
      .fields.includes("gender"),
  );
});
test("roflumilast requires low FEV1, chronic bronchitis, events and appropriate maintenance context", () => {
  assert.equal(
    L.isRoflumilastCandidate({
      fev1Predicted: 49,
      chronicBronchitis: true,
      moderateExac: 1,
    }),
    true,
  );
  assert.equal(
    L.isRoflumilastCandidate({
      fev1Predicted: 50,
      chronicBronchitis: true,
      moderateExac: 1,
    }),
    false,
  );
  assert.equal(
    build({
      currentRegimen: "lama",
      fev1Predicted: 40,
      chronicBronchitis: true,
      moderateExac: 1,
    }).addonCandidates.some((c) => c.id === "roflumilast"),
    false,
  );
  const r = build(
    {
      fev1Predicted: 40,
      chronicBronchitis: true,
      moderateExac: 1,
      roflumilastSafety: true,
      roflumilastLiver: false,
      roflumilastWeightConcern: false,
    },
    { addon: "roflumilast" },
  );
  assert.equal(r.selections.addon, "roflumilast");
  assert.equal(
    build(
      {
        fev1Predicted: 40,
        chronicBronchitis: true,
        moderateExac: 1,
        roflumilastLiver: true,
      },
      { addon: "roflumilast" },
    ).selections.addon,
    undefined,
  );
});
const bio = {
  currentRegimen: "triple",
  moderateExac: 2,
  eosinophils: 300,
  chronicBronchitis: true,
  biologicReview: true,
  helminthReview: "no-concern",
};
test("biologics remain provisional until optimization and agent-specific prerequisites are verified", () => {
  const provisional = build(
    { ...bio, biologicReview: null },
    { addon: "dupilumab" },
  );
  assert.ok(provisional.addonCandidates.some((c) => c.id === "dupilumab"));
  assert.equal(provisional.selections.addon, undefined);
  assert.equal(
    build(bio, { controller: "continue", addon: "dupilumab" }).selections.addon,
    "dupilumab",
  );
  assert.equal(
    build({ ...bio, moderateExac: 1 }, { addon: "dupilumab" }).selections.addon,
    undefined,
  );
});
test("mepolizumab evidence profile is not copied from dupilumab or a universal payer threshold", () => {
  const r = build({ ...bio, eosinophils: 150, chronicBronchitis: false });
  assert.ok(opt(r, "addon", "mepolizumab"));
  assert.equal(opt(r, "addon", "dupilumab"), undefined);
  assert.match(
    r.addonCandidates.find((c) => c.id === "mepolizumab").why,
    /does not impose a universal/,
  );
});
test("helminth risk, current biologic exposure and positive safety concerns block definitive biologic initiation", () => {
  for (const x of [
    { helminthReview: "unknown" },
    { helminthReview: "pending" },
    { addonContext: "yes", currentBiologic: "mepolizumab" },
    { adherenceConcern: true },
  ]) {
    assert.equal(
      build({ ...bio, ...x }, { addon: "dupilumab" }).selections.addon,
      undefined,
    );
  }
  assert.equal(
    build({ ...bio, helminthReview: "addressed" }, { addon: "dupilumab" })
      .selections.addon,
    "dupilumab",
  );
});
test("ensifentrine and azithromycin use relevant contexts without duplicate current treatment", () => {
  assert.ok(opt(build({ persistentDyspnea: true }), "addon", "ensifentrine"));
  assert.equal(
    opt(
      build({ moderateExac: 1, smokingStatus: "current" }),
      "addon",
      "azithromycin",
    ),
    undefined,
  );
  assert.ok(opt(build({ moderateExac: 1 }), "addon", "azithromycin"));
  assert.equal(
    build(
      {
        persistentDyspnea: true,
        addonContext: "yes",
        currentEnsifentrine: true,
        ensifentrineSafety: true,
        ensifentrineDevice: true,
      },
      { addon: "ensifentrine" },
    ).selections.addon,
    undefined,
  );
});
test("drug-specific checks do not require an unrelated medication's safety review", () => {
  const rof = build(
    {
      fev1Predicted: 40,
      chronicBronchitis: true,
      moderateExac: 1,
      roflumilastLiver: false,
      roflumilastWeightConcern: false,
      roflumilastSafety: true,
    },
    { addon: "roflumilast" },
  );
  assert.equal(rof.selections.addon, "roflumilast");
  assert.equal(rof.data.azithromycinQtSafety, null);
  const az = build(
    {
      moderateExac: 1,
      azithromycinQtSafety: true,
      azithromycinHearingLiverSafety: true,
      azithromycinInfectionReview: true,
    },
    { addon: "azithromycin" },
  );
  assert.equal(az.selections.addon, "azithromycin");
  const ens = build(
    {
      persistentDyspnea: true,
      ensifentrineSafety: true,
      ensifentrineDevice: true,
    },
    { addon: "ensifentrine" },
  );
  assert.equal(ens.selections.addon, "ensifentrine");
  assert.equal(ens.data.roflumilastSafety, null);
});
for (const [drug, findings, required] of [
  [
    "roflumilast",
    {
      fev1Predicted: 40,
      chronicBronchitis: true,
      moderateExac: 1,
      roflumilastLiver: false,
      roflumilastWeightConcern: false,
      roflumilastSafety: true,
    },
    ["roflumilastLiver", "roflumilastWeightConcern", "roflumilastSafety"],
  ],
  [
    "azithromycin",
    {
      moderateExac: 1,
      azithromycinQtSafety: true,
      azithromycinHearingLiverSafety: true,
      azithromycinInfectionReview: true,
    },
    [
      "azithromycinQtSafety",
      "azithromycinHearingLiverSafety",
      "azithromycinInfectionReview",
    ],
  ],
  [
    "ensifentrine",
    {
      persistentDyspnea: true,
      ensifentrineSafety: true,
      ensifentrineDevice: true,
    },
    ["ensifentrineSafety", "ensifentrineDevice"],
  ],
]) {
  for (const key of required)
    test(
      drug + " selection invalidates when " + key + " is not assessed",
      () => {
        const r = build({ ...findings, [key]: null }, { addon: drug });
        assert.equal(r.selections.addon, undefined);
        assert.ok(opt(r, "addon", drug).blockers.length);
        assert.doesNotMatch(
          N.buildNoteText(r),
          new RegExp("Start " + C.MEDICATIONS[drug].dose.split(" ")[0]),
        );
      },
    );
}
test("medication review follows tobacco history and remains specific to available candidates", () => {
  const d = L.normalizeState({ ...base, moderateExac: 1 }),
    r = L.buildRecommendation(d),
    steps = W.steps(d, r);
  assert.equal(
    steps.some((s) => s.id === "addon-safety"),
    false,
  );
  assert.ok(
    steps.findIndex((s) => s.id === "azithromycin-safety") >
      steps.findIndex((s) => s.id === "smoking"),
  );
  assert.deepEqual(steps.find((s) => s.id === "azithromycin-safety").fields, [
    "azithromycinQtSafety",
    "azithromycinHearingLiverSafety",
    "azithromycinInfectionReview",
  ]);
  assert.equal(
    steps.some((s) => s.id === "ensifentrine-safety"),
    false,
  );
  const b = L.normalizeState({ ...base, ...bio }),
    bioSteps = W.steps(b, L.buildRecommendation(b));
  assert.deepEqual(bioSteps.find((s) => s.id === "biologic-safety").fields, [
    "biologicReview",
    "helminthReview",
  ]);
});
test("mMRC is the first symptom input; vaccine reference is a concise six-vaccine table", () => {
  const d = L.normalizeState(base),
    steps = W.steps(d, L.buildRecommendation(d));
  assert.equal(steps.find((s) => s.id === "symptoms").fields[0], "mmrcScore");
  assert.equal(C.REFERENCES.vaccines.table.rows.length, 6);
  assert.ok(C.REFERENCES.vaccines.table.rows.every((row) => row.length === 3));
  assert.match(
    steps.find((s) => s.id === "advanced-screen").title,
    /Lung volume reduction and transplant/,
  );
});
for (const [age, pack, expect] of [
  [49, 30, false],
  [50, 20, true],
  [85, 20, true],
  [70, 19, false],
])
  test("NCCN age/exposure " + age + "/" + pack, () =>
    assert.equal(
      L.isLungCancerScreenEligible({
        age,
        packYears: pack,
        yearsSinceQuit: 40,
      }),
      expect,
    ),
  );
test("screening requires asymptomatic context and curative benefit, separate from diagnosis/surveillance", () => {
  const due = {
    age: 80,
    packYears: 30,
    yearsSinceQuit: 30,
    screeningContext: "screening",
    curativeBenefit: true,
    ldctStatus: "due",
  };
  assert.match(text(build(due)), /Arrange annual screening/);
  assert.doesNotMatch(
    N.buildNoteText(build(due)),
    /Screening reference|NCCN.*2026 revision/,
  );
  assert.match(
    text(build({ ...due, curativeBenefit: false })),
    /Do not initiate or continue/,
  );
  assert.doesNotMatch(
    text(build({ ...due, screeningContext: "symptoms" })),
    /Arrange annual screening/,
  );
  assert.match(
    text(build({ ...due, screeningContext: "surveillance" })),
    /individualized.*surveillance/,
  );
});
test("AAT status produces testing or family/liver review, never automatic augmentation", () => {
  assert.match(text(build({ aatdStatus: "not-done" })), /S\/Z genotyping/);
  assert.match(
    text(build({ aatdStatus: "known-aatd" })),
    /family-testing and liver-care/,
  );
  assert.doesNotMatch(
    text(build({ aatdStatus: "known-aatd" })),
    /Start augmentation/,
  );
});
test("vaccines distinguish due, unknown, completed, contraindicated and age eligibility", () => {
  assert.ok(
    opt(build({ pneumococcalStatus: "due" }), "pneumococcalPlan", "pcv20"),
  );
  assert.match(
    text(build({ pneumococcalStatus: "due" }, { pneumococcalPlan: "pcv20" })),
    /Recommend PCV20/,
  );
  assert.match(text(build({ rsvStatus: "due" })), /one RSV vaccine dose/);
  assert.doesNotMatch(
    text(build({ age: 49, rsvStatus: "due" })),
    /Recommend one RSV/,
  );
  assert.match(
    text(build({ rsvStatus: "contraindicated" })),
    /precaution\/contraindication/,
  );
  assert.doesNotMatch(
    text(build({ rsvStatus: "complete" })),
    /Recommend one RSV/,
  );
  assert.match(text(build()), /Reconcile vaccination records/);
  assert.doesNotMatch(
    N.buildNoteText(build({ pneumococcalStatus: "due" })),
    /was administered|vaccination completed/,
  );
});
test("rehabilitation supports selected remote programs and recovery follow-up", () => {
  assert.match(
    text(build({ rehabPreference: "remote" })),
    /Refer to an appropriate remote/,
  );
  assert.match(text(build({ encounter: "recovery" })), /1-4 weeks/);
});
test("stable oxygen thresholds require measurement conditions and never invent flow prescription", () => {
  assert.doesNotMatch(
    text(build({ restingSpo2: 87 })),
    /formal long-term oxygen/,
  );
  assert.match(
    text(build({ restingSpo2: 88, oxygenConditions: "roomair" })),
    /formal long-term oxygen/,
  );
  assert.doesNotMatch(
    text(build({ restingSpo2: 91, oxygenConditions: "roomair" })),
    /formal long-term oxygen/,
  );
  assert.match(
    text(
      build({
        restingSpo2: 89,
        oxygenConditions: "roomair",
        hypoxemiaComplication: true,
      }),
    ),
    /formal long-term oxygen/,
  );
  assert.match(
    text(build({ exertionalSpo2: 86, exertionalRoomAir: null })),
    /Clarify oxygen conditions during/,
  );
});
test("marked routine hypoxemia triggers urgent review instead of only routine oxygen planning", () => {
  for (const input of [{ restingSpo2: 85 }, { abgAvailable: true, pao2: 40 }]) {
    const r = build(input);
    assert.equal(r.emergency, true);
    assert.equal(r.groups.length, 0);
    assert.match(text(r), /urgent emergency-level/);
  }
});
test("home NIV requires stable arterial assessment and appropriate timing, not a venous value", () => {
  assert.doesNotMatch(text(build({ paco2: 55 })), /nocturnal NIV/);
  assert.match(
    text(
      build({ abgAvailable: true, paco2: 55, hypercapniaContext: "stable" }),
    ),
    /nocturnal NIV/,
  );
  assert.match(
    text(build({ abgAvailable: true, paco2: 55, hypercapniaContext: "acute" })),
    /2-4 weeks/,
  );
});
test("BODE requires all components and uses standard boundaries", () => {
  assert.equal(
    L.calculateBode({
      bmi: 21,
      fev1Predicted: 35,
      mmrcScore: 4,
      walkDistance: 149,
    }),
    10,
  );
  assert.equal(
    L.calculateBode({
      bmi: 22,
      fev1Predicted: 65,
      mmrcScore: 1,
      walkDistance: 350,
    }),
    0,
  );
  assert.equal(
    L.calculateBode({
      bmi: 21,
      fev1Predicted: 35,
      mmrcScore: null,
      walkDistance: 149,
    }),
    null,
  );
  assert.equal(
    L.calculateBode({
      bmi: 21,
      fev1Predicted: 35,
      mmrcScore: 5,
      walkDistance: 149,
    }),
    null,
  );
});
test("valve and surgical pathways remain distinct; high-risk profile is not universal valve exclusion", () => {
  const r = build({
    emphysema: true,
    persistentDyspnea: true,
    rv: 200,
    collateralVentilation: "present",
    fev1Predicted: 20,
    dlco: 20,
    ctDistribution: "homogeneous",
  });
  assert.ok(opt(r, "lvr", "valve").blockers.length);
  assert.equal(opt(r, "lvr", "surgery").blockers.length, 0);
  assert.ok(r.cautions.some((t) => /not a universal valve exclusion/.test(t)));
});
test("advanced workup identifies referral opportunities, never automatic eligibility or listing", () => {
  const r = build(
    { emphysema: true, progression: true, fev1Predicted: 24 },
    { lvr: "refer", transplant: "refer" },
  );
  assert.equal(r.findings.advanced.bode, null);
  assert.equal(r.selections.transplant, "refer");
  assert.equal(r.selections.lvr, "refer");
  assert.match(text(r), /does not establish listing eligibility/);
  assert.equal(
    group(
      build({ emphysema: true, progression: true, advancedInterest: "defer" }),
      "lvr",
    ),
    undefined,
  );
});
test("cessation doses depend on prerequisites; selected therapy replaces alternatives in SOAP", () => {
  const smoking = {
    smokingStatus: "current",
    cessationSafety: true,
    renalStatus: "normal",
    cigarettesPerDay: 20,
    firstCigarette: "within30",
    bupropionContra: false,
  };
  const note = N.buildNoteText(build(smoking, { cessation: "nrt" }));
  assert.match(note, /21 mg daily plus 4 mg/);
  assert.doesNotMatch(note, /Start varenicline|Start bupropion/);
  assert.match(
    text(
      build(
        { ...smoking, renalStatus: "severe" },
        { cessation: "varenicline" },
      ),
    ),
    /at most 0.5 mg twice daily/,
  );
  assert.equal(
    build({ ...smoking, bupropionContra: true }, { cessation: "bupropion" })
      .selections.cessation,
    undefined,
  );
  assert.equal(
    build({ ...smoking, renalStatus: "unknown" }, { cessation: "varenicline" })
      .selections.cessation,
    undefined,
  );
});
const acute = {
  encounter: "active",
  acuteDyspnea: true,
  acuteSputumVolume: true,
  acutePurulence: true,
  acuteProgression: "stable",
  respiratoryRate: 20,
  heartRate: 90,
  acuteSpo2: 93,
  acuteOxygen: "roomair",
  acuteMentalStatus: "baseline",
  mimicConcern: false,
  outpatientSupport: true,
  outpatientAppropriate: true,
  maintenanceOcs: false,
  antibioticSafety: true,
  resistantOrganisms: false,
  bronchiectasis: false,
};
test("incomplete acute assessment allows guidance but not safety clearance or routine prescriptions", () => {
  const r = build({ encounter: "active" }, { acuteSteroid: "burst" });
  assert.equal(r.findings.acute.outpatient, false);
  assert.equal(r.selections.acuteSteroid, undefined);
  assert.match(text(r), /Missing observations/);
  assert.doesNotMatch(
    N.buildNoteText(r),
    /safe for discharge|mild exacerbation/,
  );
});
test("outpatient acute selected treatments share exact actions and do not invent administration", () => {
  const r = build(acute, {
    acuteBronchodilator: "mdi",
    acuteSteroid: "burst",
    acuteAntibiotic: "doxy",
  });
  assert.equal(r.findings.acute.outpatient, true);
  assert.equal(r.selections.acuteSteroid, "burst");
  const n = N.buildNoteText(r);
  assert.match(n, /prednisone 40 mg orally daily for 5 days/);
  assert.match(n, /doxycycline 100 mg/);
  assert.match(n, /Treatment actually administered.*\*\*\*/);
  assert.doesNotMatch(
    n,
    /received prednisone|improved after|safe for discharge/,
  );
});
for (const urgent of [
  { redFlags: true },
  { acuteSpo2: 85 },
  { respiratoryRate: 30 },
  { heartRate: 130 },
  { systolicBp: 89 },
  { acuteMentalStatus: "altered" },
  { acuteProgression: "worsening" },
  { acuteResponse: "worse" },
  { acutePh: 7.34, acutePaco2: 50 },
]) {
  test(
    "known urgent finding overrides routine plans " + JSON.stringify(urgent),
    () => {
      const r = build(
        { ...acute, ...urgent },
        { controller: "continue", acuteSteroid: "burst" },
      );
      assert.equal(r.emergency, true);
      assert.equal(r.groups.length, 0);
      assert.match(text(r), /urgent emergency-level/);
      assert.doesNotMatch(text(r), /Start prednisone/);
      assert.equal(
        build({ ...acute, ...urgent, encounter: "routine" }).emergency,
        true,
      );
    },
  );
}
test("Rome features are explicit and missing values do not establish mild severity", () => {
  assert.equal(
    build({
      ...acute,
      respiratoryRate: 24,
      heartRate: 95,
      acuteDyspneaScore: 5,
    }).findings.acute.romeCount,
    3,
  );
  assert.doesNotMatch(
    build({ encounter: "active" }).findings.acute.label,
    /mild/,
  );
});
test("acute improvement does not imply discharge readiness; OCS and antibiotic cautions persist", () => {
  const r = build(
    {
      ...acute,
      acuteReassessed: true,
      acuteResponse: "improved",
      maintenanceOcs: true,
      addonContext: "yes",
    },
    { acuteSteroid: "burst" },
  );
  assert.equal(r.selections.acuteSteroid, undefined);
  assert.match(text(r), /Do not infer discharge readiness/);
  assert.equal(
    build({ ...acute, acutePurulence: false }, { acuteAntibiotic: "doxy" })
      .selections.acuteAntibiotic,
    undefined,
  );
});
test("invalid numeric entries block the note without hiding known urgent findings", () => {
  const r = build({ ...acute, acuteSpo2: 120, redFlags: true });
  assert.equal(r.invalid, true);
  assert.equal(r.emergency, true);
  assert.equal(N.buildNoteText(r), "");
});
test("SOAP includes placeholders and only actual available findings with direct selected actions", () => {
  const r = build({}, { controller: "continue", rescue: "albuterol" }),
    n = N.buildNoteText(r);
  for (const h of ["Subjective", "Objective", "Assessment", "Plan"])
    assert.ok(n.includes(h));
  assert.equal((n.match(/Examination: \*\*\*/g) || []).length, 1);
  assert.doesNotMatch(
    n,
    /normal examination|denies|not entered|selected|Rationale|Safety Checks|NCCN|Not assessed/i,
  );
  assert.match(n, /Continue the current LABA\/LAMA/);
  assert.match(n, /albuterol 90 mcg/);
});
test("workflow branches without clearing useful measurements or hiding urgent findings", () => {
  const d = L.normalizeState({ ...base, fev1Predicted: 40 }),
    r = L.buildRecommendation(d);
  const routine = W.steps(d, r);
  assert.ok(!routine.some((s) => s.id === "acute-observations"));
  const activeData = L.normalizeState({ ...d, encounter: "active" }),
    activeSteps = W.steps(activeData, L.buildRecommendation(activeData));
  assert.ok(activeSteps.some((s) => s.id === "acute-observations"));
  assert.ok(!activeSteps.some((s) => s.id === "acute-response"));
  assert.equal(activeData.fev1Predicted, 40);
  assert.ok(
    W.steps(
      { ...activeData, acuteReassessed: true },
      L.buildRecommendation(activeData),
    ).some((s) => s.id === "acute-response"),
  );
  assert.ok(
    !W.steps({ ...d, encounter: "recovery" }, r).some(
      (s) => s.id === "acute-observations",
    ),
  );
  assert.equal(W.reconcileStep("removed", routine), "context");
});
test("advanced data are optional and screen-level until explicitly requested", () => {
  const d = L.normalizeState(base),
    r = build();
  assert.ok(!W.steps(d, r).some((s) => s.id === "advanced-pft"));
  assert.ok(
    W.steps({ ...d, advancedInterest: "detail" }, r).some(
      (s) => s.id === "advanced-pft",
    ),
  );
});
