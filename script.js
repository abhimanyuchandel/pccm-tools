const COEF = {
  "(Intercept)": -5.383018751,
  initial_rhythmShockable: 1.331142227,
  "cannulation_rhythm_collapsedVF / VT": 0.964489324,
  cannulation_rhythm_collapsedPEA: 0.850376484,
  signs_of_life_pre_eclsYes: 0.893726888,
  multiple_cpaYes: -0.814344632,
  witnessed_arrestYes: 0.793585768,
  rosc_before_cannulationYes: 0.782731907,
  "la_out_of_hospitalPublic / Healthcare–EMS": 0.751246857,
  number_of_shocks: 0.037690096,
  total_cpr_time: -0.008363885
};

const THRESH = {
  redMax: 0.05,
  yellowMax: 0.2
};

const el = (id) => document.getElementById(id);

const inputs = [
  "la_out_of_hospital",
  "witnessed_arrest",
  "initial_rhythm",
  "number_of_shocks",
  "rosc_before_cannulation",
  "multiple_cpa",
  "signs_of_life_pre_ecls",
  "total_cpr_time",
  "cannulation_rhythm_collapsed"
];

function sigmoid(z) {
  if (z >= 0) {
    const ez = Math.exp(-z);
    return 1 / (1 + ez);
  }
  const ez = Math.exp(z);
  return ez / (1 + ez);
}

function fmtPct(p) {
  return (100 * p).toFixed(1) + "%";
}

function allComplete() {
  return inputs.every((id) => {
    const v = el(id).value;
    return v !== "" && v !== null && v !== undefined;
  });
}

function buildDesign() {
  const x = {};

  x["number_of_shocks"] = Number(el("number_of_shocks").value);
  x["total_cpr_time"] = Number(el("total_cpr_time").value);

  if (el("la_out_of_hospital").value === "Public / Healthcare–EMS")
    x["la_out_of_hospitalPublic / Healthcare–EMS"] = 1;

  if (el("witnessed_arrest").value === "Yes") x["witnessed_arrestYes"] = 1;

  if (el("initial_rhythm").value === "Shockable")
    x["initial_rhythmShockable"] = 1;

  if (el("rosc_before_cannulation").value === "Yes")
    x["rosc_before_cannulationYes"] = 1;

  if (el("multiple_cpa").value === "Yes") x["multiple_cpaYes"] = 1;

  if (el("signs_of_life_pre_ecls").value === "Yes")
    x["signs_of_life_pre_eclsYes"] = 1;

  const cr = el("cannulation_rhythm_collapsed").value;
  if (cr === "PEA") x["cannulation_rhythm_collapsedPEA"] = 1;
  if (cr === "VF / VT") x["cannulation_rhythm_collapsedVF / VT"] = 1;

  return x;
}

function scoreProbability() {
  const x = buildDesign();
  let eta = COEF["(Intercept)"] ?? 0;

  for (const [k, b] of Object.entries(COEF)) {
    if (k === "(Intercept)") continue;
    const v = x[k] ?? 0;
    eta += b * v;
  }
  return sigmoid(eta);
}

function bandFor(p) {
  if (p < THRESH.redMax)
    return { band: "red", label: "Anticipated poor prognosis" };
  if (p < THRESH.yellowMax)
    return { band: "yellow", label: "Intermediate prognosis" };
  return { band: "green", label: "More favorable prognosis" };
}

function setResult(p) {
  const { band, label } = bandFor(p);
  const card = el("resultCard");
  card.dataset.band = band;

  el("bandPill").textContent = label;
  el("riskOut").textContent = fmtPct(p);
  el("noteOut").textContent =
    "Predicted probability of survival to hospital discharge with a favorable CPC (CPC 1–2)";
}

function resetResult() {
  el("resultCard").dataset.band = "none";
  el("bandPill").textContent = "Enter all fields to calculate";
  el("riskOut").textContent = "—";
  el("noteOut").textContent =
    "Predicted probability of survival to hospital discharge with a favorable CPC (CPC 1–2)";
}

function updateButtonState() {
  el("calcBtn").disabled = !allComplete();
  if (!allComplete()) resetResult();
}

document.querySelectorAll(".helpBtn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = document.getElementById(btn.dataset.help);
    target.hidden = !target.hidden;
  });
});

inputs.forEach((id) => el(id).addEventListener("input", updateButtonState));
inputs.forEach((id) => el(id).addEventListener("change", updateButtonState));
updateButtonState();

el("calcBtn").addEventListener("click", () => {
  if (!allComplete()) return;

  const shocks = Number(el("number_of_shocks").value);
  const cpr = Number(el("total_cpr_time").value);

  if (![shocks, cpr].every(Number.isFinite)) return;
  if ([shocks, cpr].some((v) => v < 0)) return;

  const p = scoreProbability();
  setResult(p);
});

el("resetBtn").addEventListener("click", () => {
  [
    "la_out_of_hospital",
    "witnessed_arrest",
    "initial_rhythm",
    "rosc_before_cannulation",
    "multiple_cpa",
    "signs_of_life_pre_ecls",
    "cannulation_rhythm_collapsed"
  ].forEach((id) => (el(id).selectedIndex = 0));

  ["number_of_shocks", "total_cpr_time"].forEach((id) => (el(id).value = ""));
  document.querySelectorAll(".helpText").forEach((d) => (d.hidden = true));

  resetResult();
  updateButtonState();
});