(function (root, factory) {
  const api = typeof module !== "undefined" && module.exports ? factory(require("./medications.js"), require("./investigations.js")) : factory(root.sarcoidosisMedications, root.sarcoidosisInvestigations);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.sarcoidosisNotes = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (C, I) {
  "use strict";
  const known = n => typeof n === "number" && Number.isFinite(n);
  const round = n => Number(n.toFixed(1));
  function buildNoteText(r, options = {}) {
    if (r.invalid) return "";
    const d = r.data, f = r.findings, s = [], o = [], a = [], plan = [];
    const person = { male: "man", female: "woman", nonbinary: "nonbinary patient" }[d.gender] || "patient";
    s.push(`${known(d.age) ? `This ${d.age}-year-old` : "The"} ${person} was seen for ${d.context === "worsening" ? "worsening symptoms in the setting of sarcoidosis" : d.context === "treatment" ? "sarcoidosis treatment response and safety review" : "sarcoidosis follow-up"}.`, "Interval history: ***.");
    const symptoms = [["dyspnea", "dyspnea"], ["cough", "cough"], ["fatigue", "fatigue"], ["limitation", "activity limitation"]];
    const positive = symptoms.filter(([k]) => d[k] === true).map(([, text]) => text);
    const negative = symptoms.filter(([k]) => d[k] === false).map(([, text]) => text);
    if (positive.length) s.push("The patient reported " + positive.join(", ") + ".");
    if (negative.length) s.push("The patient denied " + negative.join(", ") + ".");
    if (d.trajectory !== "unknown") s.push("The interval course was " + { stable: "stable", improved: "improved", worse: "worsening" }[d.trajectory] + ".");
    if (d.qol === "important") s.push("Disease-related symptom burden was unacceptable to the patient.");
    if (d.qol === "none") s.push("The patient described the disease-related quality-of-life burden as acceptable.");
    if (d.relapse === true) s.push("Worsening during a prior steroid taper was reported.");
    if (d.relapse === false) s.push("No prior taper-associated worsening was reported.");
    if (d.response !== "unknown") s.push("Response to current treatment was " + { improved: "improved", stable: "stable with maintained benefit", inadequate: "inadequate", toxic: "limited by adverse effects" }[d.response] + ".");
    if (known(d.treatmentMonths)) s.push(`Current steroid-sparing/biologic treatment duration was ${d.treatmentMonths} months.`);
    s.push(`Current sarcoidosis medications are: ${f.currentTreatment}. Additional medication details: ***.`);
    if (d.smoking !== "unknown") s.push({ never: "The patient reported never smoking tobacco.", former: "The patient previously smoked tobacco.", current: "The patient currently smokes tobacco." }[d.smoking]);
    if (["established", "new"].includes(d.diagnosis)) o.push(`${d.diagnosis === "new" ? "Newly established" : "Previously established"} sarcoidosis diagnosis${d.diagnosisDate ? " dated " + d.diagnosisDate : ""}.`);
    if (d.diagnosticBasis === "records") o.push("The original diagnostic reports were unavailable for review.");
    if (d.diagnosticBasis === "biopsy") {
      const method = { ebus: "EBUS-guided lymph-node sampling", bronchoscopy: "bronchoscopic lung/endobronchial biopsy", surgical: "surgical lung/lymph-node biopsy", skin: "skin biopsy", other: "other sampling method/site ***" }[d.biopsyMethod] || "sampling method/site ***";
      o.push(`Diagnostic tissue evidence was obtained by ${method}${d.pathology === "granulomas" ? " and demonstrated nonnecrotizing granulomas" : d.pathology === "other" ? " with other/atypical findings requiring reconciliation" : " with pathology details ***"}.`);
    }
    if (d.diagnosticBasis === "clinical") o.push("A clinical diagnosis without biopsy was documented" + (d.clinicalPattern !== "unknown" ? " in the setting of " + { lofgren: "Lofgren syndrome", heerfordt: "Heerfordt syndrome", lupus: "lupus pernio with compatible systemic assessment", other: "an established clinical presentation ***" }[d.clinicalPattern] : "") + ".");
    if (d.compatible === true) o.push("A compatible clinical/radiographic presentation was documented.");
    if (d.mimics === true) o.push("Relevant diagnostic mimics had been evaluated.");
    if (!d.studies) {
      ["fvc", "fev1", "dlco"].forEach(k => { if (known(d[k])) o.push(`Current ${k.toUpperCase()}: ${d[k]}% predicted${d.pftDate ? " (" + d.pftDate + ")" : ""}.`); });
      ["Fvc", "Fev1", "Dlco"].forEach(k => { if (known(d["prior" + k])) o.push(`Prior ${k.toUpperCase()}: ${d["prior" + k]}% predicted${d.priorPftDate ? " (" + d.priorPftDate + ")" : ""}.`); });
    }
    f.changes.forEach(c => o.push(`${c.label} change: ${c.points >= 0 ? "+" : ""}${round(c.points)} percentage points, ${c.relative >= 0 ? "+" : ""}${round(c.relative)}% relative change.`));
    if (d.imaging !== "unknown") o.push("Available thoracic imaging showed " + { normal: "no current abnormality", nodes: "predominant hilar/mediastinal adenopathy", parenchymal: "parenchymal inflammatory-appearing disease", fibrotic: "predominantly fibrotic disease", mixed: "mixed fibrosis and possible activity" }[d.imaging] + ".");
    if (d.imagingTrend !== "unknown") o.push("Imaging trajectory was " + { stable: "stable", improved: "improving", worse: "worsening" }[d.imagingTrend] + ".");
    if (d.stage !== "unknown") o.push("Chest radiograph stage: " + d.stage + ".");
    if (known(d.calcium)) o.push(`Serum calcium: ${d.calcium} mg/dL.`);
    if (known(d.renalFunction)) o.push(`eGFR: ${d.renalFunction} mL/min/1.73 m2.`);
    if (known(d.weight)) o.push(`Verified actual body weight: ${d.weight} kg.`);
    if (known(d.spo2)) o.push(`Resting SpO2: ${d.spo2}%${d.oxygenConditions === "roomair" ? " on room air" : d.oxygenConditions === "oxygen" ? " on supplemental oxygen" : " (oxygen conditions not documented)"}.`);
    if (!d.studies && known(d.walkDistance)) o.push(`6MWT distance: ${d.walkDistance} m.`);
    if (!d.studies && known(d.walkSpo2)) o.push(`Exertional nadir SpO2: ${d.walkSpo2}%.`);
    const organs = { cardiac: "cardiac", ocular: "ocular", neuro: "neurologic", renal: "renal/calcium-related", hepatic: "hepatic", skin: "cutaneous", joints: "musculoskeletal" };
    const established = Object.keys(organs).filter(k => d[k] === "confirmed").map(k => organs[k]);
    const suspected = Object.keys(organs).filter(k => d[k] === "suspected").map(k => organs[k]);
    if (established.length) o.push("Established extrapulmonary involvement: " + established.join(", ") + ".");
    if (suspected.length) o.push("New suspected involvement: " + suspected.join(", ") + ".");
    o.push("Examination: ***.");
    a.push(`${known(d.age) ? `This ${d.age} year old patient` : "The patient"} ${f.diagnosisSupported ? "has an established diagnosis of sarcoidosis" : "has a working sarcoidosis diagnosis that requires clarification"}.`);
    if (d.diagnosticBasis === "biopsy" && d.pathology === "granulomas" && d.compatible === true) a.push("The diagnosis was supported by a compatible presentation and tissue showing nonnecrotizing granulomas.");
    a.push({ inactive: "There is no evidence of clinically important active pulmonary inflammation on the documented assessment.", active: "The current assessment supports clinically important inflammatory pulmonary disease.", fibrotic: "Pulmonary disease appears predominantly fixed or fibrotic.", mixed: "Fibrotic pulmonary disease coexists with suspected inflammatory activity.", uncertain: "Pulmonary disease activity remains uncertain and requires evaluation for competing causes.", unknown: "Pulmonary disease activity has not yet been characterized." }[d.activity]);
    if (positive.length) a.push("The reported symptom burden includes " + positive.join(" and ") + ".");
    if (d.indication === "none") a.push("No current systemic treatment indication was identified.");
    else if (["organ", "both"].includes(d.indication)) a.push("The treatment assessment identified risk of organ dysfunction or progressive pulmonary disease.");
    else if (d.indication === "qol") a.push("Disease related quality of life impairment supports considering treatment after review of competing causes.");
    if (d.currentPred === true || f.currentAny) a.push("Current systemic treatment consists of " + f.currentTreatment + ".");
    if (established.length) a.push("Documented extrapulmonary involvement includes " + established.join(" and ") + ".");
    if (suspected.length) a.push("Additional organ involvement requires targeted assessment.");
    if (d.toxicity === true || d.infection === true) a.push("The documented infection or medication toxicity concern takes priority over routine treatment escalation.");
    if (r.emergency) a.push("Urgent findings require prompt assessment before routine outpatient planning.");
    r.actions.forEach((action, i) => plan.push(`${i + 1}. ${action.text}`));
    if (!r.emergency) r.placeholders.forEach(text => plan.push(`${plan.length + 1}. ${text}`));
    const tables = d.studies ? I.kinds.filter(k => d.studies.records[k].length).map(k => I.definitions[k].title + " history\n" + (options.tables === "tsv" ? I.plainTable(k, d.studies) : I.noteTableText(k, d.studies))).join("\n\n") : "";
    return ["Subjective", s.join("\n\n"), "Objective", [tables, o.map(t => "- " + t).join("\n")].filter(Boolean).join("\n\n"), "Assessment", a.join(" "), "Plan", plan.join("\n\n")].join("\n\n");
  }
  function buildNoteHtml(r) {
    let text = buildNoteText(r, { tables: "tsv" });
    if (!text) return "";
    const replacements = [];
    if (r.data.studies) I.kinds.filter(k => r.data.studies.records[k].length).forEach(kind => {
      const token = `\u0000TABLE${replacements.length}\u0000`;
      text = text.replace(I.definitions[kind].title + " history\n" + I.plainTable(kind, r.data.studies), token);
      replacements.push({ token, html: I.htmlTable(kind, r.data.studies, true) });
    });
    let html = I.escape(text).replace(/^(Subjective|Objective|Assessment|Plan)$/gm, '<h3 style="font:bold 16px/1.4 Arial,sans-serif;margin:16px 0 4px;color:#172d43">$1</h3>').replace(/\n/g, "<br>");
    replacements.forEach(({ token, html: table }) => { html = html.replace(token, () => table); });
    html = html.replace(/(?:<br>)+(?=<(?:h3|table)\b)/g, "").replace(/(<\/(?:h3|table)>)(?:<br>)+/g, "$1");
    return `<div style="font:14px/1.5 Arial,sans-serif">${html}</div>`;
  }
  return { buildNoteText, buildNoteHtml };
});
