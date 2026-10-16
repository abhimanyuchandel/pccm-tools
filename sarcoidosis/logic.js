(function (root, factory) {
  const api = typeof module !== "undefined" && module.exports
    ? factory(require("./input-schema.js"), require("./medications.js"), require("./investigations.js"))
    : factory(root.sarcoidosisSchema, root.sarcoidosisMedications, root.sarcoidosisInvestigations);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.sarcoidosisLogic = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (S, C, I) {
  "use strict";
  const known = n => typeof n === "number" && Number.isFinite(n);
  const systemic = ["methotrexate", "azathioprine", "leflunomide", "mycophenolate"];
  const immuneStrategies = ["prednisone", "methotrexate", "bridge", "alternative", "biologic"];
  const urgentKeys = ["urgentResp", "urgentCardiac", "urgentNeuro", "urgentVisual", "urgentCalcium"];
  const organKeys = ["cardiac", "ocular", "neuro", "renal", "hepatic", "skin", "joints"];
  const drugFor = d => ["methotrexate", "bridge"].includes(d.strategy) ? "methotrexate" : d.strategy === "alternative" ? d.targetDmard : d.strategy === "biologic" ? d.targetTnf : d.strategy === "prednisone" ? "prednisone" : null;
  const currentDailyDose = d => known(d.currentDmardDose) ? d.currentDmardDose * (d.currentDmardFrequency === "bid" && ["azathioprine", "leflunomide", "hydroxychloroquine"].includes(d.currentDmard) ? 2 : 1) : null;
  function emptyState() {
    return Object.fromEntries(Object.entries(S).map(([key, f]) => [key, f.type === "number" || f.boolean ? null : f.type === "date" ? "" : f.value ?? "unknown"]));
  }
  function normalize(input = {}) {
    const d = emptyState();
    for (const [key, f] of Object.entries(S)) {
      const v = input[key];
      if (v === undefined) continue;
      if (f.type === "number") d[key] = v === "" || v === null ? null : Number.isFinite(Number(v)) ? Number(v) : NaN;
      else if (f.boolean) d[key] = v === true || v === "yes" ? true : v === false || v === "no" ? false : null;
      else if (f.type === "checkbox") d[key] = v === true;
      else if (f.type === "date") d[key] = typeof v === "string" ? v : "";
      else d[key] = f.options.some(([id]) => id === v) ? v : "unknown";
    }
    if (input.studies) { d.studies = I.normalize(input.studies); I.project(d); }
    return d;
  }
  function validate(d) {
    const errors = [], warnings = [];
    const drug = drugFor(d);
    const taperActive = d.strategy === "taper" || d.currentPred === true && d.backgroundPred === "taper" && ["methotrexate", "alternative", "biologic"].includes(d.strategy);
    for (const [key, f] of Object.entries(S)) {
      if (["predDose", "predWeeks"].includes(key) && !["prednisone", "bridge"].includes(d.strategy)) continue;
      if (["dmardDose", "dmardTarget", "titrationWeeks"].includes(key) && ![...systemic, "hydroxychloroquine"].includes(drug)) continue;
      if (["tnfDose", "tnfInterval"].includes(key) && !["infliximab", "adalimumab"].includes(drug)) continue;
      if (key.startsWith("taper") && !taperActive) continue;
      const v = d[key];
      if (f.type === "number" && v !== null) {
        if (!known(v) || v < f.min || v > f.max || f.integer && !Number.isInteger(v)) errors.push({ key, text: `${f.label}: verify the value (${f.min}-${f.max}${f.integer ? ", whole numbers" : ""}) or leave it blank.` });
        else if (f.warnLow !== undefined && v < f.warnLow || f.warnHigh !== undefined && v > f.warnHigh) warnings.push({ key, text: `${f.label}: clinically concerning or unusual; verify and interpret in context. This is not necessarily an entry error.` });
      }
      if (f.type === "date" && v && !(d.studies && ["pftDate", "priorPftDate"].includes(key)) && (!/^\d{4}-\d{2}-\d{2}$/.test(v) || !Number.isFinite(Date.parse(v)) || new Date(v).toISOString().slice(0, 10) !== v)) errors.push({ key, text: `${f.label}: enter a valid date or leave blank.` });
    }
    if (!d.studies && d.pftDate && d.priorPftDate && d.priorPftDate > d.pftDate) errors.push({ key: "priorPftDate", text: "The comparison PFT date must not follow the current PFT date." });
    if (d.studies) {
      errors.push(...I.validate(d.studies));
      const now = I.selected(d.studies, "pft", "current"), prior = I.selected(d.studies, "pft", "comparison");
      if (now && prior && now.context !== "unknown" && prior.context !== "unknown" && now.context !== prior.context) warnings.push({ key: "studies", text: "PFT bronchodilator conditions differ. Numeric changes are not calculated across pre-/post-BD conditions; compare like-for-like tests." });
    }
    if (d.currentDmard === "methotrexate" && ["daily", "bid"].includes(d.currentDmardFrequency)) errors.push({ key: "currentDmardFrequency", text: "Potential methotrexate dosing error: routine sarcoidosis treatment is once weekly, never daily. Verify urgently before further doses." });
    if (C.DRUGS[d.currentDmard] && known(currentDailyDose(d)) && currentDailyDose(d) > C.DRUGS[d.currentDmard].max) warnings.push({ key: "currentDmardDose", text: "The current scheduled dose exceeds this routine drug template. Count both doses of a twice-daily schedule when checking a daily-dose limit. Verify units, formulation and the individualized plan before unchanged continuation." });
    if (d.currentTnf === "infliximab" && known(d.currentTnfDose) && d.currentTnfDose > 10) errors.push({ key: "currentTnfDose", text: "Verify the infliximab dose and units: enter mg/kg, not the total infusion dose in mg." });
    if (C.DRUGS[d.currentDmard] && d.currentDmard !== "methotrexate" && d.currentDmardRoute === "sc") errors.push({ key: "currentDmardRoute", text: "Reconcile this conventional agent's route; the selected routine product is oral, not subcutaneous." });
    return { errors, warnings };
  }
  function changes(d) {
    if (d.studies) {
      const now = I.selected(d.studies, "pft", "current"), prior = I.selected(d.studies, "pft", "comparison");
      if (now && prior && now.context !== "unknown" && prior.context !== "unknown" && now.context !== prior.context) return [];
    }
    return ["Fvc", "Fev1", "Dlco"].flatMap(name => {
      const now = d[name.toLowerCase()], prior = d["prior" + name];
      return known(now) && known(prior) && prior > 0 ? [{ label: name === "Dlco" ? "DLCO" : name.toUpperCase(), points: now - prior, relative: (now - prior) / prior * 100 }] : [];
    });
  }
  function currentTreatment(d) {
    const parts = [];
    if (d.currentPred === true) parts.push(`${["prednisone", "prednisolone"].includes(d.currentSteroid) ? d.currentSteroid : "systemic corticosteroid at prednisone-equivalent"} ${known(d.currentPredDose) ? d.currentPredDose + " mg/day" : "dose ***"}`);
    if (C.DRUGS[d.currentDmard]) {
      const frequency = { weekly: "once weekly", daily: "once daily", bid: "twice daily", other: "schedule ***" }[d.currentDmardFrequency] || "schedule ***";
      const route = { oral: "orally", sc: "subcutaneously" }[d.currentDmardRoute] || "route ***";
      parts.push(`${C.DRUGS[d.currentDmard].name} ${known(d.currentDmardDose) ? d.currentDmardDose + " mg" : "dose ***"} ${route} ${frequency}`);
    } else if (d.currentDmard === "other") parts.push("other conventional treatment ***");
    if (C.DRUGS[d.currentTnf]) parts.push(`${C.DRUGS[d.currentTnf].name} ${known(d.currentTnfDose) ? d.currentTnfDose + (d.currentTnf === "infliximab" ? " mg/kg IV" : " mg subcutaneously") : "dose ***"} every ${known(d.currentTnfInterval) ? d.currentTnfInterval : "***"} weeks`);
    else if (d.currentTnf === "other") parts.push("other biologic treatment ***");
    if (!parts.length && d.currentPred === false && d.currentDmard === "none" && d.currentTnf === "none") return "no systemic sarcoidosis medication";
    return parts.length ? parts.join(", ") : "systemic treatment not fully documented";
  }
  function taperPlan(d) {
    const blockers = [], stages = [];
    if (d.currentPred !== true || !known(d.currentPredDose) || d.currentPredDose <= 0) blockers.push("Verify the actual current prednisone dose before writing a taper.");
    if (!known(d.predMonths)) blockers.push("Review the duration of systemic-steroid exposure.");
    if (d.adrenalReview !== true) blockers.push("Review disease control, relapse risk and the adrenal/withdrawal plan.");
    if (!["inactive", "fibrotic"].includes(d.activity) && d.response !== "improved" && d.response !== "stable") blockers.push("Document sufficient disease control or an individualized toxicity-driven reduction plan before tapering.");
    let last = d.currentPredDose;
    for (let i = 1; i <= 3; i++) {
      const dose = d["taperDose" + i], weeks = d["taperWeeks" + i];
      if (dose === null && weeks === null && i === 3) continue;
      if (!known(dose) || !known(weeks)) { blockers.push(`Complete taper stage ${i} dose and duration.`); continue; }
      if (dose > last || last === 0) blockers.push("Taper stages must not increase the dose or resume dosing after a zero-dose stage.");
      stages.push({ dose, weeks }); last = dose;
    }
    const zeroIndex = stages.findIndex(s => s.dose === 0);
    const exposureBeforeZero = known(d.predMonths) ? d.predMonths * 52 / 12 + stages.slice(0, zeroIndex < 0 ? stages.length : zeroIndex).reduce((total, s) => total + s.weeks, 0) : null;
    if (zeroIndex >= 0 && (exposureBeforeZero === null || exposureBeforeZero >= 3)) blockers.push("This routine taper template does not discontinue prolonged prednisone at zero. Select a nonzero endpoint and complete an individualized adrenal-recovery/cessation plan; count both prior exposure and the planned taper.");
    return { blockers, text: stages.map(s => s.dose === 0 ? `stop the systemic steroid and reassess after ${s.weeks} weeks` : `${s.dose} mg orally each morning for ${s.weeks} week${s.weeks === 1 ? "" : "s"}`).join(", then ") };
  }
  function prescription(d, r) {
    const id = drugFor(d), drug = C.DRUGS[id], blockers = [];
    const need = (test, text) => { if (!test) blockers.push(text); };
    if (!drug) return { id, blockers: ["Select the medication."], text: "" };
    need(urgentKeys.every(key => d[key] === false), "Complete the warning-symptom review before a definitive routine outpatient prescription. Unassessed findings are not negative findings.");
    need(r.findings.diagnosisSupported, "Clarify diagnostic support before starting systemic treatment.");
    need(d.compatible !== false && d.pathology !== "other", "Resolve conflicting clinical/radiographic or pathology evidence before a new systemic prescription.");
    if (["cardiac", "ocular", "neuro"].some(k => d[k] === "suspected")) need(d.organSafety === true, "Assess the new high-risk organ concern and confirm the appropriateness of an outpatient pulmonary treatment plan.");
    need(d.mimics === true, "Review relevant diagnostic mimics before a new immunosuppressive prescription.");
    need(["qol", "organ", "both"].includes(d.indication) || id === "hydroxychloroquine" && d.supportingIndication === true, "Document the clinical treatment indication.");
    need(["active", "mixed"].includes(d.activity) || id === "hydroxychloroquine" && d.supportingIndication === true, "Clarify active treatable disease rather than fixed damage or nonspecific symptoms alone.");
    need(d.currentPred !== null && d.currentDmard !== "unknown" && d.currentDmard !== "other" && d.currentTnf !== "unknown" && d.currentTnf !== "other", "Reconcile existing systemic agents to avoid duplicate treatment.");
    need(d.infection === false, "Evaluate active or unassessed infection before increasing immunosuppression.");
    need(d.toxicity === false, "Resolve possible treatment toxicity before escalation.");
    need(!d.adherence, "Address the documented adherence/access concern before routine escalation.");
    need(d.interactions === true, "Review allergies, interactions and drug-specific precautions.");
    need(d.prescriptionReviewed === true, "Confirm the selected prescription and monitoring plan after reviewing this schedule.");
    need(["none", "cleared"].includes(d.exposure), "Complete exposure-based endemic infection assessment.");
    if (id !== "prednisone") {
      need(d.cbcSafe === true, "Review a current CBC for prescribing safety.");
      need(d.liverSafe === true, "Review liver tests and hepatic risks.");
      need(d.renalReviewed === true, "Review renal function and drug-specific dosing.");
      need(["clear", "managed"].includes(d.hepatitis), "Complete viral-hepatitis assessment and any prevention plan.");
    }
    if (["methotrexate", "leflunomide", "mycophenolate"].includes(id)) need(["na", "cleared"].includes(d.reproductive), "Resolve pregnancy, contraception and lactation safety before this teratogenic drug.");
    else need(["na", "cleared"].includes(d.reproductive), "Complete drug-specific reproductive/lactation review; pregnancy requires an individualized plan, not an assumed contraindication to every option.");
    const newConventional = systemic.includes(id) || id === "hydroxychloroquine";
    if (id === "prednisone" && d.currentDmard !== "none") need(["retain", "replace"].includes(d.transition), "Select whether the existing conventional agent is retained or stopped when adding prednisone.");
    if (!["infliximab", "adalimumab"].includes(id) && d.currentTnf !== "none") need(["retain", "stop"].includes(d.backgroundTnf), "Choose the plan for the existing TNF inhibitor before documenting this regimen change.");
    if (newConventional && d.currentDmard !== "none" && d.currentDmard !== id) need(d.transition === "replace", "Select replacement of the existing conventional agent; this template does not add a second conventional agent.");
    if (newConventional && d.currentTnf !== "none") need(d.refractory === true, "Confirm the intended specialist-reviewed background/TNF combination and treatment history.");
    let text = "";
    if (id === "prednisone" || d.strategy === "bridge") {
      need(known(d.predDose) && d.predDose >= 5 && d.predDose <= 40 && known(d.predWeeks) && d.predWeeks >= 1 && d.predWeeks <= 6, "Enter a prednisone dose and a reassessment period within the routine pulmonary template.");
      text = `${d.currentPred === true ? "Adjust" : "Start"} prednisone ${d.predDose} mg orally each morning for ${d.predWeeks} weeks pending reassessment. Then adjust or taper according to clinical response rather than extending this dose automatically.`;
    }
    if (newConventional) {
      const dose = d.dmardDose, target = d.dmardTarget;
      need(known(dose) && known(target) && dose >= drug.min && target <= drug.max && target >= dose && dose <= drug.max, `Enter starting and target doses within the ${drug.name} template (${drug.min}-${drug.max} ${drug.unit}).`);
      if (target !== dose) need(known(d.titrationWeeks) && d.titrationWeeks >= 2 && d.titrationWeeks <= 8, "Choose the titration interval.");
      if (id === "methotrexate") {
        need(known(d.renalFunction) && d.renalFunction >= 60, "The standard methotrexate template requires verified eGFR at least 60. Lower renal function needs an individualized adjusted regimen, not this preset.");
        need(d.tmpSmx === false, "Resolve TMP-SMX use before methotrexate prescribing.");
        need(["oral", "sc"].includes(d.mtxRoute), "Select the methotrexate route.");
        need(Number.isInteger(dose / 2.5) && Number.isInteger(target / 2.5), "Use a deliverable methotrexate dose in 2.5 mg increments within this template.");
      }
      if (id === "azathioprine") {
        need(d.thiopurine === "normal", "Review TPMT/NUDT15; reduced/poor metabolism requires a different individualized regimen.");
        need(d.xanthine === false, "Resolve allopurinol/febuxostat use before a standard azathioprine prescription.");
        need(Number.isInteger(dose / 25) && Number.isInteger(target / 25), "Use azathioprine doses in 25 mg increments in this template.");
      }
      if (id === "mycophenolate") need(Number.isInteger(dose / 250) && Number.isInteger(target / 250), "Use mycophenolate mofetil doses in 250 mg increments in this template.");
      if (id === "leflunomide") {
        need([10, 20].includes(dose) && [10, 20].includes(target), "Select a 10 or 20 mg leflunomide dose; no loading dose is included.");
        need(["clear", "managed"].includes(d.tb), "Complete TB evaluation before leflunomide.");
      }
      if (id === "hydroxychloroquine") {
        need(d.supportingIndication === true, "Confirm a supported nonpulmonary indication; hydroxychloroquine is not a pulmonary substitute.");
        need(!(["organ", "both"].includes(d.indication) && ["active", "mixed"].includes(d.activity)), "Do not substitute hydroxychloroquine for treatment of significant active pulmonary disease. Select a pulmonary regimen and coordinate the nonpulmonary plan separately.");
        need([200, 400].includes(dose) && dose === target, "Select 200 or 400 mg/day as a fixed hydroxychloroquine schedule within this template.");
        need(known(d.weight) && target <= 5 * d.weight, "Verify actual weight and keep hydroxychloroquine at or below 5 mg/kg/day and 400 mg/day; use an individualized lower regimen if needed.");
        need(d.eyePlan === true && d.hcqCardiacSafe === true, "Confirm retinal surveillance and cardiac/QT/renal safety.");
      }
      const route = id === "methotrexate" && d.mtxRoute === "sc" ? "subcutaneously" : "orally";
      const freq = id === "methotrexate" ? "once weekly, never daily" : id === "mycophenolate" ? "twice daily" : "once daily";
      const step = id === "methotrexate" ? 5 : drug.increment;
      const conventionalText = `${id === d.currentDmard ? "Adjust" : "Start"} ${drug.name} ${dose} mg ${route} ${freq}${target !== dose ? `, increasing by up to ${step} mg per administration every ${d.titrationWeeks} weeks if tolerated and laboratory review permits, to ${target} mg ${freq}` : ""}.`;
      text = [text, conventionalText, id === "methotrexate" ? "Prescribe folic acid 1 mg orally daily." : ""].filter(Boolean).join(" ");
      if (d.currentDmard !== "none" && d.currentDmard !== id) text = `Stop ${C.DRUGS[d.currentDmard]?.name || "the prior conventional agent"} under the reviewed transition/washout plan before replacement. ` + text;
    }
    if (["infliximab", "adalimumab"].includes(id)) {
      need(d.refractory === true, "Confirm refractory active disease or documented conventional-treatment intolerance.");
      need(["clear", "managed"].includes(d.tb), "Complete active/latent TB assessment and management before TNF treatment.");
      need(d.heartFailure === false && d.demyelination === false, "Resolve heart-failure/demyelination or other TNF-specific risks; use individualized expert review when present.");
      need(["initiation", "maintenance"].includes(d.tnfPhase), "Select initiation versus established maintenance.");
      if (d.currentTnf === id) need(d.tnfPhase === "maintenance", "Do not automatically re-induce an established TNF regimen; select maintenance or individualize.");
      else need(d.tnfPhase === "initiation", "A new TNF agent requires an initiation/transition plan.");
      if (d.currentTnf !== "none" && d.currentTnf !== id) need(d.tnfSwitch === true, "Confirm discontinuation and transition timing for the existing TNF inhibitor.");
      if (d.currentDmard !== "none") need(["retain", "replace"].includes(d.transition), "Select whether the conventional background agent is retained or stopped.");
      if (id === "infliximab") {
        need([3, 5].includes(d.tnfDose) && known(d.weight), "Select 3 or 5 mg/kg infliximab and enter verified actual weight.");
        need([4, 6, 8].includes(d.tnfInterval), "Choose a 4, 6 or 8 week infliximab maintenance interval.");
        const amount = known(d.weight) && known(d.tnfDose) ? Number((d.weight * d.tnfDose).toFixed(1)) : "***";
        text = `${d.tnfPhase === "maintenance" ? "Adjust maintenance" : "Start"} infliximab / selected biosimilar ${d.tnfDose} mg/kg IV (${amount} mg before pharmacy verification/rounding) ${d.tnfPhase === "initiation" ? "at weeks 0, 2 and 6, then " : ""}every ${d.tnfInterval} weeks. Verify the actual product, infusion orders and reaction protocol; infuse over at least 2 hours.`;
      } else {
        need(d.tnfDose === 40 && [1, 2].includes(d.tnfInterval), "Select adalimumab 40 mg every 1 or 2 weeks; this template contains no IBD/uveitis loading regimen.");
        text = `${d.tnfPhase === "maintenance" ? "Adjust" : "Start"} adalimumab / selected biosimilar 40 mg subcutaneously every ${d.tnfInterval === 1 ? "week" : "2 weeks"}. Confirm the product, device and injection instruction plan.`;
      }
      if (d.currentTnf !== "none" && d.currentTnf !== id) text = `Stop the current ${C.DRUGS[d.currentTnf]?.name || "TNF inhibitor"} and reconcile transition timing; do not overlap TNF agents. ` + text;
      if (d.currentDmard !== "none") text += d.transition === "retain" ? " Retain the reconciled conventional background regimen with combination-treatment monitoring." : " Stop the conventional background agent under the reviewed transition plan.";
    }
    if (id === "prednisone" && C.DRUGS[d.currentDmard]) text += d.transition === "retain" ? " Retain the reconciled conventional background regimen with continued safety monitoring." : " Stop the prior conventional agent under the reviewed transition plan.";
    if (!["infliximab", "adalimumab"].includes(id) && C.DRUGS[d.currentTnf]) text += d.backgroundTnf === "retain" ? " Retain the reconciled TNF inhibitor under the reviewed combination-treatment plan." : " Stop the current TNF inhibitor under an individualized transition plan. Actual timing: ***.";
    return { id, blockers: [...new Set(blockers)], text, monitoring: drug.monitoring, sources: drug.sources };
  }
  function buildRecommendation(input = {}) {
    const d = normalize(input), quality = validate(d), activeDrug = drugFor(d);
    const r = { data: d, errors: quality.errors, warnings: quality.warnings, actions: [], cautions: [], urgent: [], findings: {}, activeDrug, prescription: null, placeholders: [] };
    const add = (id, text, kind = "management", sources = ["ers"]) => { if (!r.actions.some(a => a.id === id)) r.actions.push({ id, text, kind, sources }); };
    const urgentText = {
      urgentResp: "Arrange emergency assessment for severe respiratory distress or rapidly increasing oxygen requirements. Evaluate infection, PE, cardiac disease and other acute causes; do not assume a sarcoidosis flare.",
      urgentCardiac: "Arrange urgent/emergency cardiac assessment for syncope, unstable rhythm, acute chest pain or suspected high-grade block. Do not defer for routine outpatient sarcoidosis testing.",
      urgentNeuro: "Arrange emergency neurologic assessment for new focal deficit, seizure or altered mental status; do not assume neurosarcoidosis without evaluating alternatives.",
      urgentVisual: "Arrange same-day urgent ophthalmic assessment for acute vision change or painful red eye/photophobia; emergency assessment is appropriate for abrupt visual loss.",
      urgentCalcium: "Arrange urgent assessment of symptomatic hypercalcemia or acute renal deterioration, with appropriate laboratory and cardiac evaluation.",
    };
    urgentKeys.forEach(key => { if (d[key] === true) r.urgent.push(urgentText[key]); });
    if (known(d.calcium) && d.calcium >= 14) r.urgent.push("Arrange urgent same-day assessment of severe hypercalcemia (calcium at least 14 mg/dL), confirming the value and clinical context. Do not manage this as a routine vaccine/taper encounter.");
    if (known(d.spo2) && d.spo2 < 88) r.urgent.push("Promptly reassess the documented severe resting hypoxemia and oxygen conditions. Acute/new or worsening hypoxemia requires urgent/emergency care; chronic established hypoxemia requires timely oxygen review.");
    r.emergency = r.urgent.length > 0;
    r.urgent.forEach((text, i) => add("urgent-" + i, text, "urgent", ["ats"]));
    if (known(d.calcium) && d.calcium >= 14) r.actions.filter(a => a.kind === "urgent").forEach(a => { a.sources = [...a.sources, "hypercalcemia"]; });
    const diagnosisSupported = ["established", "new"].includes(d.diagnosis);
    const currentKnown = d.currentPred !== null && !["unknown", "other"].includes(d.currentDmard) && !["unknown", "other"].includes(d.currentTnf);
    const currentAny = d.currentPred === true || C.DRUGS[d.currentDmard] || C.DRUGS[d.currentTnf];
    const immune = d.currentPred === true || systemic.includes(d.currentDmard) || ["infliximab", "adalimumab"].includes(d.currentTnf) || immuneStrategies.includes(d.strategy) && activeDrug !== "hydroxychloroquine";
    const advanced = d.phConcern === true || d.activity === "fibrotic" || d.activity === "mixed" || ["fibrotic", "mixed"].includes(d.imaging) || known(d.dlco) && d.dlco < 40 || ["exertion", "rest"].includes(d.oxygen) || known(d.walkSpo2) && d.walkSpo2 <= 88;
    r.findings = { diagnosisSupported, currentKnown, currentAny: Boolean(currentAny), currentTreatment: currentTreatment(d), immune, advanced, changes: changes(d), activity: { inactive: "no important inflammatory activity identified", active: "clinically important pulmonary inflammatory activity", fibrotic: "predominantly fixed or fibrotic pulmonary disease", mixed: "fibrotic disease with suspected inflammatory activity", uncertain: "uncertain disease activity requiring reassessment", unknown: "pulmonary disease activity not fully characterized" }[d.activity] };
    if (!diagnosisSupported || d.compatible === false || d.mimics === false || d.pathology === "other") add("diagnosis-review", "Review diagnostic support and context-specific alternative diagnoses before attributing current findings to sarcoidosis. Retrieve relevant records or obtain targeted testing when indicated; repeat biopsy is not automatic.", "testing", ["ats"]);
    if (d.diagnosticBasis === "records") r.cautions.push("Unavailable original records do not by themselves invalidate an established sarcoidosis diagnosis.");
    if (d.infection === true || d.toxicity === true) add("mimic-toxicity", "Evaluate the documented infection/toxicity concern before increasing immunosuppression. Review whether an existing agent should be held or adjusted under an individualized plan; do not stop chronic prednisone abruptly.", "testing", ["pharmacology"]);
    if (d.alternativeCause === true || d.activity === "uncertain" || d.trajectory === "worse" && !["active", "mixed"].includes(d.activity)) add("contributors", "Evaluate alternative contributors to symptoms, including infection, cardiac/PH disease, airway disease, anemia, sleep disorders, deconditioning and medication effects before escalating sarcoidosis therapy.", "testing", ["bts"]);
    if (r.findings.changes.some(c => c.points < 0)) r.cautions.push("PFT changes are shown as percentage points and relative percent change. Confirm comparability and interpret with symptoms/imaging; no decline threshold alone mandates immunosuppression.");
    if (d.relapse === true) r.cautions.push("Previous taper-associated worsening warrants closer review of disease activity, steroid-sparing treatment and adrenal/withdrawal symptoms; it does not automatically prove inflammatory relapse.");
    if (urgentKeys.some(k => d[k] === null)) r.cautions.push("Warning-symptom review is incomplete. Missing answers do not establish that urgent features are absent or that routine outpatient management is safe.");
    if (d.currentDmard === "methotrexate" && d.tmpSmx === true) add("mtx-interaction", "Resolve the methotrexate/TMP-SMX interaction before further prescribing. Review toxicity and choose an individualized alternative when prophylaxis is indicated.", "safety", ["mtx", "pharmacology"]);
    if (d.currentDmard === "hydroxychloroquine" && (!known(d.weight) || d.eyePlan !== true || d.hcqCardiacSafe !== true)) add("current-hcq", "Verify the existing hydroxychloroquine dose against actual weight and review retinal, renal and cardiac/QT safety. Arrange missing toxicity surveillance separately from ocular sarcoidosis assessment.", "monitoring", ["hcq", "aao"]);
    const screenNames = { eyeScreen: "baseline ophthalmic examination", ecgScreen: "baseline ECG", cbcScreen: "baseline CBC and any required medication CBC monitoring", calciumScreen: "serum calcium", renalScreen: "serum creatinine", alpScreen: "alkaline phosphatase" };
    for (const [key, name] of Object.entries(screenNames)) {
      if (d[key] === "due") add(key, `Obtain or arrange ${name}${["calciumScreen", "renalScreen", "alpScreen"].includes(key) ? " for baseline/annual sarcoidosis surveillance" : ""}.`, "screening", ["ats"]);
      else if (d[key] === "abnormal") add(key, `Review the abnormal ${name} and arrange targeted evaluation rather than simply repeating screening.`, "screening", ["ats"]);
    }
    if (Object.keys(screenNames).some(k => d[k] === "unknown")) add("records", "Review available screening records and arrange missing baseline or annual surveillance as indicated.", "screening", ["ats"]);
    const organActions = {
      cardiac: "Arrange targeted cardiac assessment for new symptoms/abnormal ECG and coordinate cardiology review. Consider CMR and/or dedicated FDG-PET according to clinical findings; routine asymptomatic advanced imaging is not automatic.",
      ocular: "Arrange ophthalmology assessment for suspected ocular involvement. New symptoms require diagnostic assessment independent of previous baseline or hydroxychloroquine screening.",
      neuro: "Coordinate neurologic assessment for suspected neurosarcoidosis, including exclusion of alternative causes; this pulmonary workflow does not prescribe neurologic rescue therapy.",
      renal: "Evaluate renal/calcium findings with appropriate serum studies, medication review and renal assessment; assess stones/hypercalciuria when indicated.",
      hepatic: "Evaluate hepatic involvement using the biochemical pattern, symptoms and competing causes; isolated alkaline-phosphatase elevation does not automatically mandate immunosuppression.",
      skin: "Coordinate assessment of symptomatic/disfiguring skin disease and local versus systemic options with the relevant clinician.",
      joints: "Evaluate musculoskeletal symptoms and functional impact, including alternative causes and appropriate rheumatologic care.",
    };
    organKeys.forEach(key => {
      if (d[key] === "suspected") add("organ-" + key, organActions[key], "organ", ["ats", "ers"]);
      if (d[key] === "confirmed") add("organ-" + key, `Review established ${S[key].label.split(" /")[0].toLowerCase()} and coordinate organ-specific monitoring/treatment with the relevant team.`, "organ", ["ers"]);
    });
    if (known(d.calcium) && d.calcium > 10.5 && d.calcium < 14) add("calcium-evaluation", "Confirm and evaluate the elevated calcium in context, including albumin/ionized calcium when appropriate, renal function and supplement use. Assess symptoms and severity before deciding on routine versus urgent care.", "testing", ["ats"]);
    if (advanced) {
      if (d.advancedPlan === "workup") add("advanced", "Evaluate disproportionate dyspnea, gas exchange and possible pulmonary hypertension. Arrange echocardiography/PH review when indicated and confirm hemodynamics with RHC when appropriate; do not assume PAH or automatically prescribe PAH therapy.", "referral", ["ph"]);
      else if (d.advancedPlan === "refer") add("advanced", "Refer for multidisciplinary advanced-ILD/transplant assessment after reviewing trajectory, optimized treatment, patient goals and contraindications. Referral does not establish transplant listing eligibility or an antifibrotic indication.", "referral", ["ers", "ph"]);
      else if (d.advancedPlan === "defer") add("advanced", "Defer advanced-care referral under the selected plan and revisit progression, patient preferences and outstanding workup at follow-up.", "referral", ["ph"]);
      else r.placeholders.push("Advanced pulmonary/PH evaluation and referral plan: ***.");
      if (["exertion", "rest"].includes(d.oxygen) || known(d.walkSpo2) && d.walkSpo2 <= 88) add("oxygen", "Review resting and exertional oxygen requirements using documented conditions and appropriate testing. Do not infer a flow prescription from an isolated saturation.", "monitoring", ["bts"]);
    }
    const knownUnsafe = d.infection === true || d.toxicity === true || d.cbcSafe === false || d.liverSafe === false
      || C.DRUGS[d.currentDmard] && known(currentDailyDose(d)) && currentDailyDose(d) > C.DRUGS[d.currentDmard].max
      || d.currentDmard === "hydroxychloroquine" && known(currentDailyDose(d)) && known(d.weight) && currentDailyDose(d) > 5 * d.weight
      || d.currentDmard === "methotrexate" && (d.tmpSmx === true || known(d.renalFunction) && d.renalFunction < 30)
      || ["methotrexate", "leflunomide", "mycophenolate"].includes(d.currentDmard) && d.reproductive === "pregnant";
    if (knownUnsafe) r.cautions.push("A known infection, toxicity, interaction or contraindication requires individualized treatment review; routine unchanged continuation is not safety-cleared.");
    if (!r.emergency && !r.errors.length) {
      if (d.strategy === "observe") {
        if (!diagnosisSupported || ["organ", "both"].includes(d.indication) || d.indication === "unknown" || !currentKnown || currentAny || ["cardiac", "ocular", "neuro"].some(k => d[k] === "suspected") && d.organSafety !== true) r.placeholders.push("Observation requires clarification of organ risk, diagnosis and current treatment; do not discontinue existing therapy automatically. Selected plan: ***.");
        else add("strategy", "Observe without systemic sarcoidosis treatment at this time. Monitor symptoms, function and pulmonary physiology; reassess if symptoms, organ findings or objective disease worsen.");
      } else if (d.strategy === "continue") {
        if (!currentKnown || !currentAny || knownUnsafe) r.placeholders.push("Reconcile the current regimen and resolve safety concerns before documenting unchanged continuation: ***.");
        else {
          add("strategy", "Continue the reconciled current systemic regimen of " + currentTreatment(d) + ".");
          [d.currentDmard, d.currentTnf].filter(id => C.DRUGS[id]).forEach(id => add("monitor-" + id, C.DRUGS[id].monitoring, "monitoring", C.DRUGS[id].sources));
        }
      } else if (d.strategy === "reassess") add("strategy", "Complete the outstanding disease-activity, diagnostic and treatment-safety evaluation before changing systemic therapy. Do not attribute symptoms to inflammatory sarcoidosis without considering competing causes.");
      else if (immuneStrategies.includes(d.strategy)) {
        r.prescription = prescription(d, r);
        if (r.prescription.blockers.length) {
          add("pending", "Complete the selected prescription's outstanding safety/indication review before initiation or dose escalation. Proposed regimen remains pending.", "testing", r.prescription.sources || ["pharmacology"]);
          if (activeDrug !== "prednisone") add("pretreatment", "Obtain or review pretreatment CBC, renal and liver tests, relevant hepatitis results and drug-specific infection/reproductive screening. Resolve abnormal results, interactions and contraindications before the final prescription.", "testing", r.prescription.sources || ["pharmacology"]);
          r.placeholders.push("Final medication prescription after outstanding review: ***.");
        } else {
          add("prescription", r.prescription.text, "prescription", r.prescription.sources);
          add("drug-monitoring", r.prescription.monitoring, "monitoring", r.prescription.sources);
          if (d.strategy === "bridge") add("pred-monitoring", C.DRUGS.prednisone.monitoring, "monitoring", C.DRUGS.prednisone.sources);
          if (d.transition === "retain" && C.DRUGS[d.currentDmard] && d.currentDmard !== activeDrug) add("background-monitoring", C.DRUGS[d.currentDmard].monitoring, "monitoring", C.DRUGS[d.currentDmard].sources);
          if (d.backgroundTnf === "retain" && C.DRUGS[d.currentTnf] && d.currentTnf !== activeDrug && !["infliximab", "adalimumab"].includes(activeDrug)) add("background-tnf-monitoring", C.DRUGS[d.currentTnf].monitoring, "monitoring", C.DRUGS[d.currentTnf].sources);
        }
      } else if (d.strategy !== "taper") r.placeholders.push("Selected systemic treatment strategy: ***.");
      if (d.strategy === "taper" || d.currentPred === true && d.backgroundPred === "taper" && ["methotrexate", "alternative", "biologic"].includes(d.strategy)) {
        r.taper = taperPlan(d);
        if (r.taper.blockers.length) r.placeholders.push("Complete the individualized prednisone taper and adrenal-safety plan: ***.");
        else add("taper", `Reduce ${d.currentSteroid === "prednisolone" ? "prednisolone" : d.currentSteroid === "prednisone" ? "prednisone" : "the reconciled systemic steroid using prednisone-equivalent doses"} to ${r.taper.text}. Reassess symptoms and disease activity at each stage. Seek review for recurrence, marked fatigue, dizziness, vomiting or other withdrawal/adrenal symptoms; do not proceed automatically through worsening symptoms.`, "prescription", ["endocrine", "bts"]);
      } else if (d.currentPred === true && ["methotrexate", "alternative", "biologic"].includes(d.strategy)) {
        if (d.backgroundPred === "continue" && !knownUnsafe && known(d.currentPredDose)) add("background-pred", `Continue the reconciled systemic corticosteroid at ${d.currentPredDose} mg/day prednisone-equivalent initially while evaluating the selected steroid-sparing plan. Reassess for a response-guided reduction rather than indefinite exposure.`);
        else r.placeholders.push("Plan for the existing prednisone dose and subsequent taper: ***.");
      }
    }
    if (immune && !r.emergency) {
      if (d.pjp === "review") add("pjp", "Assess the need for PJP prophylaxis using steroid dose/duration, combined immunosuppression and other risks. Select the agent, dose and monitoring after renal/allergy/interaction review; avoid automatic TMP-SMX with methotrexate.", "prevention", ["pjp", "pharmacology"]);
      else if (d.pjp === "continue" && d.tmpSmx === true && (d.currentDmard === "methotrexate" || activeDrug === "methotrexate")) add("pjp", "Resolve the TMP-SMX/methotrexate interaction and select an individualized PJP-prevention alternative before documenting continuation. Prescription details: ***.", "prevention", ["pjp", "mtx"]);
      else if (d.pjp === "continue") add("pjp", "Continue the verified existing PJP-prevention prescription after renal, allergy and interaction review. Prescription details: ***.", "prevention", ["pjp"]);
      else if (d.pjp === "not-needed") add("pjp", "No PJP prophylaxis is planned under the reviewed current risk assessment. Reassess with higher steroid exposure, additional immunosuppression or new risk factors.", "prevention", ["pjp"]);
      else r.placeholders.push("PJP-prevention risk review and plan, if indicated: ***.");
    }
    if ((d.currentPred === true || ["prednisone", "bridge", "taper"].includes(d.strategy)) && !r.emergency) {
      if (d.bonePlan === "review") add("bone", "Assess fracture risk and DXA/vertebral evaluation as indicated for glucocorticoid exposure. Review glucose, BP, mood and eye effects. Evaluate calcium metabolism before supplementation; if vitamin-D replacement is contemplated, assess both 25-OH and 1,25-OH2 vitamin D.", "prevention", ["bone", "ats"]);
      else if (d.bonePlan === "current") add("bone", "Continue the established, reviewed bone/steroid-protection plan, with calcium-metabolism and supplementation safety reassessed as needed.", "prevention", ["ats", "bone"]);
      else r.placeholders.push("Steroid adverse-effect and bone-protection plan: ***.");
    }
    if (!r.emergency) {
      const due = ["flu", "covid", "pneumococcal", "rsv", "zoster", "tdap", "hepatitisVaccine"].filter(k => d[k] === "due");
      if (d.vaccinePlan === "give" && due.length && d.vaccineReviewed === true) {
        const risk = d.vaccineImmune === true || d.chronicLungRisk === true;
        const eligible = due.filter(k => k === "pneumococcal" ? known(d.age) && (d.age >= 50 || d.age >= 19 && risk) && d.pneumococcalHistory !== "pcv20-21" : k === "rsv" ? known(d.age) && (d.age >= 75 || d.age >= 50 && risk) : k === "zoster" ? known(d.age) && (d.age >= 50 || d.age >= 19 && d.vaccineImmune === true) : true);
        const needsReview = due.filter(k => !eligible.includes(k));
        if (eligible.length) add("vaccines", `Arrange the reviewed indicated vaccines (${eligible.map(k => S[k].label).join(", ")}) using current CDC product and interval guidance, with immunosuppression precautions.`, "prevention", ["cdc", "immune"]);
        if (needsReview.length) add("vaccine-eligibility", `Review eligibility and prior-dose history for ${needsReview.map(k => S[k].label).join(", ")} before ordering. This encounter does not establish a routine additional dose. Coordinate pregnancy-specific RSV guidance separately when applicable.`, "prevention", ["cdc"]);
        if (eligible.includes("pneumococcal")) {
          if (d.pneumococcalHistory === "none" && ["pcv20", "pcv21"].includes(d.pneumococcalProduct)) add("pneumococcal-product", `Arrange one dose of ${d.pneumococcalProduct.toUpperCase()} under the verified initial pneumococcal plan. No PPSV23 is needed after this schedule.`, "prevention", ["pneumococcal"]);
          else if (d.pneumococcalHistory === "none" && d.pneumococcalProduct === "pcv15") add("pneumococcal-product", "Arrange PCV15 followed ordinarily one year later by PPSV23. An 8-week minimum interval is reserved for selected qualifying immunocompromised patients after review.", "prevention", ["pneumococcal"]);
          else add("pneumococcal-product", "Reconcile prior pneumococcal products and dates and select the CDC history-specific schedule before ordering an additional dose.", "prevention", ["pneumococcal"]);
        }
      }
      else if (["give", "review"].includes(d.vaccinePlan)) add("vaccines", "Review vaccine records and arrange age-, risk- and treatment-appropriate immunizations after eligibility and prior-dose review using current CDC guidance.", "prevention", ["cdc", "immune"]);
      else if (d.vaccinePlan === "defer") add("vaccines", "Defer vaccination under the selected plan. Reason and reassessment timing: ***.", "prevention", ["cdc"]);
      if (d.smoking === "current") {
        if (d.cessation === "support") add("cessation", "Recommend tobacco cessation with behavioral support and 1-800-QUIT-NOW. Arrange follow-up for the quit attempt.", "prevention");
        else if (d.cessation === "medication") add("cessation", "Complete a dedicated cessation prescribing review to choose varenicline, combination nicotine replacement or an appropriate alternative, with contraindication and dosing assessment. Selected prescription: ***.", "prevention");
        else r.placeholders.push("Selected smoking-cessation plan: ***.");
      }
      if (d.rehab === "refer") add("rehab", "Refer to pulmonary rehabilitation for persistent functional limitation and an individualized exercise program.", "supportive", ["bts"]);
      else if (d.rehab === "exercise") add("rehab", "Recommend regular, individualized physical activity, paced to symptoms, oxygen requirements and comorbid conditions.", "supportive", ["bts"]);
      else if (d.rehab === "defer") add("rehab", "Revisit activity and rehabilitation options at follow-up.", "supportive", ["bts"]);
      if (d.fatigue === true) add("fatigue", "Assess fatigue contributors including sleep, anemia, mood, deconditioning and treatment effects. Use activity/rehabilitation and targeted management rather than escalating immunosuppression for fatigue alone.", "supportive", ["ers"]);
      const weeks = d.followupWeeks;
      add("followup", known(weeks) ? `Follow up in ${weeks} weeks, sooner for deterioration or treatment adverse effects. Complete the selected medication laboratory checks sooner when required.` : `Follow up in ${immuneStrategies.includes(d.strategy) || d.strategy === "taper" || d.trajectory === "worse" ? "4-6 weeks" : "3-6 months"}, sooner for deterioration. Individualize timing and complete drug monitoring sooner when indicated.`, "followup", ["bts"]);
      add("return", "Seek urgent assessment for syncope, significant palpitations/chest pain, new neurologic or visual symptoms, severe breathlessness, rapidly increasing oxygen needs or symptoms of serious infection.", "followup", ["ats"]);
    }
    if (r.emergency) {
      r.actions = r.actions.filter(a => a.kind === "urgent" || ["mimic-toxicity", "mtx-interaction"].includes(a.id));
      r.placeholders = []; r.prescription = null; r.taper = null;
    }
    r.invalid = r.errors.length > 0;
    return r;
  }
  return { emptyState, normalize, validate, changes, drugFor, currentTreatment, taperPlan, buildRecommendation, urgentKeys, organKeys };
});
