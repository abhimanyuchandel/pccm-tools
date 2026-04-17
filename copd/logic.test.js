const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  normalizeFev1FvcHeuristic,
  classifySymptoms,
  classifyExacerbationRisk,
  assignGoldGroup,
  isRoflumilastCandidate,
  isLungCancerScreenEligible,
  getLungCancerScreeningFootnote
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

test("adds the NCCN screening footnote when lung cancer screening is recommended", () => {
  const footnote = getLungCancerScreeningFootnote({
    age: 60,
    smokingStatus: "former",
    packYears: 30,
    yearsSinceQuit: 20
  });

  assert.match(footnote, /National Comprehensive Cancer Network/i);
  assert.match(footnote, /2026 revision/i);
});

test("nccn lung cancer screening eligibility has no years-since-quit cutoff or upper age limit", () => {
  assert.equal(
    isLungCancerScreenEligible({
      age: 82,
      smokingStatus: "former",
      packYears: 25,
      yearsSinceQuit: 20
    }),
    true
  );

  assert.equal(
    isLungCancerScreenEligible({
      age: 49,
      smokingStatus: "former",
      packYears: 25,
      yearsSinceQuit: 20
    }),
    false
  );
});

test("copd app includes endemic-area exposure field and biologic parasite precaution text", () => {
  const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
  const app = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");

  assert.ok(html.includes('id="endemic-area-exposure"'));
  assert.ok(html.includes("Patient has lived or resided in an endemic area for parasitic infection"));
  assert.ok(app.includes("If eosinophils >300 cells/uL and there is epidemiologic helminth risk, screen for and treat parasitic infection before biologic therapy."));
});

test("copd symptom calculators auto-apply totals without dedicated apply buttons", () => {
  const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
  const app = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");

  assert.ok(!html.includes('id="calc-cat-btn"'));
  assert.ok(!html.includes('id="apply-mmrc-btn"'));
  assert.ok(app.includes('applyCalculatorValue("cat-score", state.total, "cat")'));
  assert.ok(app.includes('applyCalculatorValue("mmrc-score", selected, "mmrc")'));
});
