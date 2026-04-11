const test = require("node:test");
const assert = require("node:assert/strict");

const {
  normalizeFev1FvcHeuristic,
  classifySymptoms,
  classifyExacerbationRisk,
  assignGoldGroup,
  isRoflumilastCandidate,
  getLungCancerScreeningCaveat
} = require("./logic.js");

test("normalizes FEV1/FVC percent-style entry without rounding across threshold", () => {
  assert.equal(normalizeFev1FvcHeuristic(65), 0.65);
  assert.equal(normalizeFev1FvcHeuristic(25), 0.25);
  assert.equal(normalizeFev1FvcHeuristic(0.699), 0.699);
  assert.equal(normalizeFev1FvcHeuristic(250), null);
});

test("assigns GOLD Group E for a single moderate exacerbation", () => {
  const data = { catScore: 8, mmrcScore: 1, moderateExac: 1, severeExac: 0 };
  const symptoms = classifySymptoms(data);
  const exacRisk = classifyExacerbationRisk(data);

  assert.equal(symptoms.high, false);
  assert.equal(exacRisk.high, true);
  assert.equal(assignGoldGroup(symptoms, exacRisk), "E");
});

test("assigns GOLD Group B with high symptoms and zero exacerbations", () => {
  const data = { catScore: 12, mmrcScore: 1, moderateExac: 0, severeExac: 0 };
  const symptoms = classifySymptoms(data);
  const exacRisk = classifyExacerbationRisk(data);

  assert.equal(symptoms.high, true);
  assert.equal(exacRisk.high, false);
  assert.equal(assignGoldGroup(symptoms, exacRisk), "B");
});

test("blocks definite GOLD grouping when exacerbation history is missing", () => {
  const data = { catScore: 12, mmrcScore: 2, moderateExac: null, severeExac: null };
  const symptoms = classifySymptoms(data);
  const exacRisk = classifyExacerbationRisk(data);

  assert.equal(exacRisk.high, null);
  assert.match(assignGoldGroup(symptoms, exacRisk), /exacerbation history required/i);
});

test("aligns roflumilast candidacy with chronic bronchitis, low FEV1, and any exacerbation history", () => {
  assert.equal(
    isRoflumilastCandidate({
      fev1Predicted: 45,
      chronicBronchitis: true,
      moderateExac: 1,
      severeExac: 0
    }),
    true
  );

  assert.equal(
    isRoflumilastCandidate({
      fev1Predicted: 60,
      chronicBronchitis: true,
      moderateExac: 1,
      severeExac: 0
    }),
    false
  );

  assert.equal(
    isRoflumilastCandidate({
      fev1Predicted: 45,
      chronicBronchitis: false,
      moderateExac: 1,
      severeExac: 0
    }),
    false
  );
});

test("adds the ACS versus USPSTF caveat when years since quit is greater than 15", () => {
  const caveat = getLungCancerScreeningCaveat({
    age: 60,
    smokingStatus: "former",
    packYears: 30,
    yearsSinceQuit: 20
  });

  assert.match(caveat, /USPSTF-based coverage workflows may differ/i);
});
