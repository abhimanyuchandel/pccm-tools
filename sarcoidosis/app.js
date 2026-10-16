(function () {
  "use strict";
  const L = window.sarcoidosisLogic, W = window.sarcoidosisWorkflow, N = window.sarcoidosisNotes, S = window.sarcoidosisSchema, C = window.sarcoidosisMedications, I = window.sarcoidosisInvestigations, T = window.sarcoidosisTables;
  const $ = id => document.getElementById(id);
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };
  let state = { ...L.emptyState(), studies: I.empty() }, recommendation = L.buildRecommendation(state), steps = W.steps(state, recommendation), stepId = "context", generated = false, stale = true, noteRevision = 0;
  const copyButtons = ["copy-note-btn", "copy-note-bottom-btn", "copy-note-text-btn"];
  function copyStatus(text) { $("copy-status").textContent = text; $("copy-status-bottom").textContent = text; }
  const histories = T.create({ getBundle: () => state.studies, invalidate, update(bundle) {
    state = L.normalize({ ...state, studies: bundle, prescriptionReviewed: null });
    invalidate(); recompute(); renderProgress();
  } });
  const doseKeys = ["predDose", "predWeeks", "dmardDose", "dmardTarget", "titrationWeeks", "mtxRoute", "tnfDose", "tnfInterval"];
  const prescriptionKeys = new Set([...doseKeys, "strategy", "targetDmard", "targetTnf", "currentPred", "currentPredDose", "currentDmard", "currentDmardDose", "currentDmardFrequency", "currentTnf", "currentTnfDose", "transition", "backgroundPred", "tnfPhase", "tnfSwitch", "activity", "indication", "mimics", "infection", "toxicity", "adherence", "cbcSafe", "liverSafe", "renalReviewed", "renalFunction", "reproductive", "interactions", "hepatitis", "tb", "exposure", "tmpSmx", "xanthine", "thiopurine", "heartFailure", "demyelination", "weight", "eyePlan", "hcqCardiacSafe", "supportingIndication", "refractory"]);
  function keepViewport(fn) { const x = scrollX, y = scrollY; fn(); window.scrollTo({ left: x, top: y, behavior: "instant" }); }
  function recompute() { const previous = steps; recommendation = L.buildRecommendation(state); steps = W.steps(state, recommendation); stepId = W.reconcileStep(stepId, steps, previous); renderUrgent(); }
  function invalidate() {
    stale = true; noteRevision++; copyButtons.forEach(id => { $(id).disabled = true; }); $("note-output").value = "";
    $("output-status").textContent = generated ? "Inputs changed. Regenerate before copying." : "";
    $("output-status").classList.toggle("needs-review", generated);
    $("results").classList.toggle("stale-output", generated);
    copyStatus(""); $("note-preview").replaceChildren();
    $("regenerate-btn").classList.remove("success"); $("regenerate-btn").textContent = "Regenerate recommendations";
    const b = $("generate-btn"); if (b) { b.classList.remove("success"); b.textContent = "Generate recommendations"; }
    $("note-output").closest("article").classList.add("stale");
  }
  function change(key, value, rerender = true) {
    const oldDrug = L.drugFor(state); state[key] = value;
    if (prescriptionKeys.has(key) || ["currentSteroid", "backgroundTnf", "diagnosis", "compatible", "pathology", "cardiac", "ocular", "neuro", "organSafety"].includes(key)) state.prescriptionReviewed = null;
    if (["strategy", "targetDmard", "targetTnf"].includes(key) && L.drugFor(state) !== oldDrug) doseKeys.forEach(k => { state[k] = S[k].type === "number" ? null : "unknown"; });
    invalidate(); recompute(); renderProgress();
    if (rerender) { const focusId = document.activeElement?.id; keepViewport(() => renderStep(false)); if (focusId) $(focusId)?.focus({ preventScroll: true }); }
    else renderWarnings();
  }
  function display(key, value) {
    const f = S[key];
    if (value === null || value === "unknown" || value === "") return "Not assessed / available";
    if (f.boolean || f.type === "checkbox") return value ? "Yes" : "No";
    return f.options?.find(([id]) => id === value)?.[1] || String(value);
  }
  function renderUrgent() {
    const box = $("urgent-alert"); box.replaceChildren(); box.hidden = !recommendation.emergency;
    if (recommendation.emergency) { box.append(el("strong", "", "Urgent findings take priority")); recommendation.urgent.forEach(t => box.append(el("p", "", t))); }
  }
  function sourceLinks(ids) {
    const links = el("div", "reference-links");
    [...new Set(ids)].forEach(id => { const s = C.SOURCES[id]; if (!s) return; const a = el("a", "", s.title); a.href = s.url; a.target = "_blank"; a.rel = "noopener noreferrer"; links.append(a); });
    return links;
  }
  function reference(id) {
    const r = C.REFERENCES[id]; if (!r) return el("span");
    const d = el("details", "reference"); d.id = "reference-" + id; d.append(el("summary", "", "Reference | " + r.title));
    if (r.table) {
      const table = el("table", "reference-table"); table.setAttribute("role", "table");
      table.append(el("caption", "sr-only", r.title));
      const head = el("thead"), header = el("tr"), body = el("tbody");
      head.setAttribute("role", "rowgroup"); header.setAttribute("role", "row"); body.setAttribute("role", "rowgroup");
      r.table[0].forEach(t => { const cell = el("th", "", t); cell.scope = "col"; header.append(cell); }); head.append(header);
      r.table.slice(1).forEach(row => { const tr = el("tr"); row.forEach((t, i) => { const cell = el(i === 0 ? "th" : "td"); if (!i) { cell.scope = "row"; cell.textContent = t; } else { const label = el("span", "mobile-label", r.table[0][i]); label.setAttribute("aria-hidden", "true"); cell.append(label, el("span", "", t)); } tr.append(cell); }); body.append(tr); });
      table.append(head, body);
      table.querySelectorAll("tr").forEach(n => n.setAttribute("role", "row"));
      table.querySelectorAll("thead th").forEach(n => n.setAttribute("role", "columnheader"));
      table.querySelectorAll("tbody th").forEach(n => n.setAttribute("role", "rowheader"));
      table.querySelectorAll("td").forEach(n => n.setAttribute("role", "cell"));
      d.append(table);
    }
    d.append(el("p", "", r.text), sourceLinks(r.sources)); return d;
  }
  function drugCard(id) {
    const drug = C.DRUGS[id]; if (!drug) return el("span");
    const card = el("aside", "drug-card"); card.append(el("span", "badge", "Prescribing reference"), el("h3", "", drug.name), el("p", "", drug.text));
    if (id !== "prednisone") card.append(el("p", "", "Sarcoidosis dosing is off-label. Verify the selected formulation, product, authorization and local protocol."));
    const detail = el("details"); detail.append(el("summary", "", "Administration and monitoring"), el("p", "", drug.monitoring)); card.append(detail, sourceLinks(drug.sources)); return card;
  }
  function field(key) {
    const f = S[key], box = el("div", "field"), id = "field-" + key, hint = id + "-hint", feedback = id + "-feedback";
    box.dataset.field = key;
    if (f.type === "checkbox") {
      const label = el("label", "concern-option"), input = el("input"); input.type = "checkbox"; input.id = id; input.checked = state[key];
      input.addEventListener("change", () => change(key, input.checked)); label.append(input, el("span", "", f.label)); box.append(label);
    } else if (["number", "date"].includes(f.type)) {
      const label = el("label", "field-label", f.label), input = el("input"); label.htmlFor = id; input.id = id; input.type = f.type;
      if (f.type === "number") { input.min = f.min; input.max = f.max; input.step = f.integer ? "1" : "any"; input.inputMode = f.integer ? "numeric" : "decimal"; }
      input.autocomplete = "off"; input.value = state[key] ?? ""; input.setAttribute("aria-describedby", hint + " " + feedback);
      input.addEventListener("input", () => change(key, f.type === "number" ? input.value === "" ? null : input.valueAsNumber : input.value, false));
      box.append(label, input);
    } else if (f.options.length <= 5) {
      const set = el("fieldset"), choices = el("div", "choice-grid"); set.append(el("legend", "", f.label));
      f.options.forEach(([value, text]) => { const label = el("label", "choice-option"), input = el("input"); input.type = "radio"; input.name = key; input.id = id + "-" + value; input.value = value;
        const v = f.boolean ? value === "yes" ? true : value === "no" ? false : null : value;
        input.checked = state[key] === v; input.setAttribute("aria-describedby", hint); input.addEventListener("change", () => { if (input.checked) change(key, v); }); label.append(input, el("span", "", text)); choices.append(label); });
      set.append(choices); box.append(set);
    } else {
      const label = el("label", "field-label", f.label), input = el("select"); label.htmlFor = id; input.id = id; input.setAttribute("aria-describedby", hint);
      f.options.forEach(([id, text]) => { const option = el("option", "", text); option.value = id; input.append(option); }); input.value = state[key]; input.addEventListener("change", () => change(key, input.value)); box.append(label, input);
    }
    const text = f.hint || (["dmardDose", "dmardTarget"].includes(key) && C.DRUGS[recommendation.activeDrug] ? "Selected drug schedule: " + C.DRUGS[recommendation.activeDrug].unit + "." : "");
    const help = el("p", "hint", text); help.id = hint; box.append(help);
    const error = el("p", "field-feedback"); error.id = feedback; error.setAttribute("aria-live", "polite"); box.append(error); return box;
  }
  function renderWarnings() {
    document.querySelectorAll(".field[data-field]").forEach(box => {
      const key = box.dataset.field, error = recommendation.errors.find(e => e.key === key), warning = recommendation.warnings.find(e => e.key === key), text = box.querySelector(".field-feedback");
      text.textContent = error?.text || warning?.text || ""; text.classList.toggle("error", Boolean(error)); $("field-" + key)?.setAttribute("aria-invalid", error ? "true" : "false");
    });
  }
  function navigate(id) { stepId = id; renderStep(true); }
  function renderProgress() {
    const i = steps.findIndex(s => s.id === stepId), stage = steps[i], nav = $("chapter-nav");
    $("chapter-label").textContent = stage.chapter + " | Patient inputs"; $("step-count").textContent = `${i + 1} of ${steps.length}`;
    $("progress").max = steps.length; $("progress").value = i + 1;
    nav.replaceChildren(); [...new Set(steps.map(s => s.chapter))].forEach(chapter => { const b = el("button", "chapter-link" + (stage.chapter === chapter ? " active" : "")); b.type = "button"; if (stage.chapter === chapter) b.setAttribute("aria-current", "step"); b.append(el("span", "chapter-dot"), el("span", "", chapter)); b.addEventListener("click", () => navigate(steps.find(s => s.chapter === chapter).id)); nav.append(b); });
    $("back-btn").disabled = i === 0; $("next-btn").hidden = i === steps.length - 1;
  }
  function blockersBox() {
    const items = [...(recommendation.prescription?.blockers || []), ...(recommendation.taper?.blockers || [])];
    const box = el("div", items.length ? "alert warning" : "alert");
    box.append(el("strong", "", items.length ? "Before this prescription can be documented" : "Selected schedule checks complete"));
    if (items.length) { const ul = el("ul"); items.forEach(t => ul.append(el("li", "", t))); box.append(ul); }
    else box.append(el("p", "", "Verify that the plan matches the actual encounter before copying. This is not a complete interaction or contraindication database."));
    return box;
  }
  function summary() {
    const outer = el("div", "answer-list"), seen = new Set();
    steps.forEach(stage => {
      const keys = stage.fields.filter(key => !seen.has(key)); keys.forEach(k => seen.add(k));
      if (!keys.length) return;
      const details = el("details", "answer-group"), dl = el("dl"); details.append(el("summary", "", stage.title));
      keys.forEach(key => { const row = el("div", "answer-row"); row.append(el("dt", "", S[key].label), el("dd", "", display(key, state[key]))); dl.append(row); });
      const b = el("button", "quiet", "Edit these answers"); b.type = "button"; b.addEventListener("click", () => navigate(stage.id)); details.append(dl, b); outer.append(details);
    });
    const projected = new Set(["fvc", "fev1", "dlco", "priorFvc", "priorFev1", "priorDlco", "pftDate", "priorPftDate", "walkDistance", "walkSpo2"]);
    const hidden = Object.keys(S).filter(k => !(state.studies && projected.has(k)) && !seen.has(k) && state[k] !== null && state[k] !== "unknown" && state[k] !== "" && state[k] !== false);
    if (hidden.length) { const details = el("details", "answer-group"); details.append(el("summary", "", "Retained additional findings")); hidden.forEach(k => details.append(el("p", "hint", S[k].label + ": " + display(k, state[k])))); outer.append(details); }
    I.kinds.forEach(kind => {
      if (!state.studies.records[kind].length) return;
      const details = el("details", "answer-group"); details.append(el("summary", "", I.definitions[kind].title + " history"), T.renderTable(kind, state.studies));
      const b = el("button", "quiet", "Edit this history"); b.type = "button"; b.addEventListener("click", () => {
        const key = { pft: "includePft", walk: "includeWalk", echo: "includeEcho", ct: "includeCt" }[kind];
        state[key] = true; recompute(); navigate(kind);
      }); details.append(b); outer.append(details);
    });
    if (histories.pending().length) outer.prepend(el("p", "alert warning", "An investigation edit or import is unfinished. Save/apply or cancel it before generating: " + histories.pending().map(k => I.definitions[k].title).join(", ") + "."));
    return outer;
  }
  function usePreset() {
    const id = recommendation.activeDrug, drug = C.DRUGS[id]; if (!drug) return;
    state.prescriptionReviewed = null;
    if (id === "prednisone" || state.strategy === "bridge") { state.predDose = 20; state.predWeeks = 4; }
    if (["methotrexate", "azathioprine", "leflunomide", "mycophenolate", "hydroxychloroquine"].includes(id)) { state.dmardDose = drug.defaultDose; state.dmardTarget = drug.target; state.titrationWeeks = id === "methotrexate" ? 4 : 2; if (id === "methotrexate") state.mtxRoute = "oral"; }
    if (["infliximab", "adalimumab"].includes(id)) { state.tnfDose = drug.defaultDose; state.tnfInterval = id === "infliximab" ? 6 : 1; }
    invalidate(); recompute(); renderStep(false);
  }
  function renderStep(focus) {
    renderProgress(); const stage = steps.find(s => s.id === stepId), content = $("step-content");
    $("encounter").dataset.step = stage.id; $("step-title").textContent = stage.title; $("step-hint").textContent = stage.hint || ""; $("step-hint").hidden = !stage.hint;
    content.replaceChildren();
    if (stage.negative || stage.organNegative) { const b = el("button", "secondary", stage.organNegative ? "Reviewed: no known involvement in this group" : "Reviewed: none of these symptoms"); b.type = "button"; b.addEventListener("click", () => { stage.fields.forEach(k => { state[k] = stage.organNegative ? "none" : false; }); invalidate(); recompute(); renderStep(false); }); content.append(b, el("p", "hint", "Use only after explicitly reviewing each finding.")); }
    if (stage.noTreatment) { const b = el("button", "secondary", "No systemic treatment"); b.type = "button"; b.addEventListener("click", () => { state.currentPred = false; state.currentDmard = "none"; state.currentTnf = "none"; state.prescriptionReviewed = null; invalidate(); recompute(); renderStep(false); }); content.append(b, el("p", "hint", "Confirms no current systemic steroid, conventional agent or TNF inhibitor.")); }
    if (stage.preset) { content.append(drugCard(stage.drug)); const b = el("button", "secondary", "Use common starting schedule"); b.id = "use-preset-btn"; b.type = "button"; b.addEventListener("click", usePreset); content.append(b, el("p", "hint", "An editable reference schedule, not a prescription until you complete the review.")); }
    if (stage.drug && !stage.preset) content.append(drugCard(stage.drug));
    const fields = el("div", "field-grid"); fields.style.marginTop = "22px"; stage.fields.forEach(k => fields.append(field(k))); content.append(fields);
    if (stage.study) content.append(histories.mount(stage.study));
    if (stage.reference) content.append(reference(stage.reference));
    if (stage.decision) { const d = el("details", "reference"); d.append(el("summary", "", "Reference | Compare systemic medication options")); Object.keys(C.DRUGS).forEach(id => d.append(drugCard(id))); content.append(d); }
    if (stage.blockers) content.append(blockersBox());
    if (stage.review) { content.append(summary()); const b = el("button", "primary" + (generated && !stale && !recommendation.invalid ? " success" : ""), generated && !stale ? "Recommendations regenerated" : "Generate recommendations"); b.id = "generate-btn"; b.type = "button"; b.addEventListener("click", generate); content.append(b); }
    renderWarnings(); if (focus) $("step-title").focus({ preventScroll: true });
  }
  function generate() {
    keepViewport(() => {
      if (histories.pending().length) {
        invalidate(); $("output-status").textContent = "Save/apply or cancel the unfinished investigation edit before generating: " + histories.pending().map(k => I.definitions[k].title).join(", ") + ".";
        if (steps.find(s => s.id === stepId)?.review) renderStep(false);
        return;
      }
      recompute(); generated = true; stale = false; $("results").hidden = false;
      const out = $("results-content"); out.replaceChildren();
      if (recommendation.errors.length) { const box = el("article", "alert danger"); box.append(el("h3", "", "Verify the entered values")); recommendation.errors.forEach(e => box.append(el("p", "", e.text))); out.append(box); }
      const assessment = el("article", "result-card"); assessment.append(el("h3", "", "Encounter assessment"), el("p", "", recommendation.findings.activity + "."), el("p", "hint", "Current treatment: " + recommendation.findings.currentTreatment + ".")); out.append(assessment);
      const labels = { urgent: "Urgent assessment", prescription: "Selected prescriptions", management: "Selected treatment strategy", testing: "Necessary evaluation", safety: "Treatment safety", monitoring: "Monitoring", screening: "Screening and surveillance", organ: "Organ-directed review", referral: "Advanced pulmonary care", prevention: "Prevention", supportive: "Function and symptoms", followup: "Follow-up and precautions" };
      Object.entries(labels).forEach(([kind, title]) => { const actions = recommendation.actions.filter(a => a.kind === kind); if (!actions.length) return; const card = el("article", kind === "urgent" ? "alert danger" : "result-card"); card.append(el("h3", "", title)); const list = el("ol"); actions.forEach(a => list.append(el("li", "", a.text))); card.append(list, sourceLinks(actions.flatMap(a => a.sources))); out.append(card); });
      if (recommendation.prescription?.blockers.length || recommendation.taper?.blockers.length) out.append(blockersBox());
      if (recommendation.placeholders.length) { const box = el("article", "result-card"); box.append(el("h3", "", "Decisions to complete")); recommendation.placeholders.forEach(t => box.append(el("p", "", t))); out.append(box); }
      if (recommendation.cautions.length || recommendation.warnings.length) { const box = el("details", "result-card"); box.append(el("summary", "", "Safety checks and interpretation")); [...recommendation.cautions, ...recommendation.warnings.map(w => w.text)].forEach(t => box.append(el("p", "", t))); out.append(box); }
      noteRevision++; copyStatus("");
      $("note-output").value = N.buildNoteText(recommendation); copyButtons.forEach(id => { $(id).disabled = recommendation.invalid; }); $("note-output").closest("article").classList.remove("stale");
      // Only the escaped, internally generated clinical-note HTML is rendered here; never pasted HTML.
      const preview = $("note-preview"); preview.innerHTML = N.buildNoteHtml(recommendation);
      preview.querySelectorAll("table").forEach(table => {
        const wrap = el("div", "note-table-wrap"); wrap.tabIndex = 0; wrap.setAttribute("role", "region"); wrap.setAttribute("aria-label", table.caption.textContent + " comparison table");
        if (table.rows[0].cells.length > 3) table.style.minWidth = table.rows[0].cells.length * 85 + "px";
        table.before(wrap); wrap.append(table);
      });
      $("output-status").textContent = recommendation.invalid ? "Correct invalid entries before copying." : "Recommendations regenerated. Review the clinical draft before use.";
      $("output-status").classList.toggle("needs-review", recommendation.invalid);
      $("results").classList.remove("stale-output");
      for (const id of ["generate-btn", "regenerate-btn"]) { const b = $(id); if (b) { b.classList.toggle("success", !recommendation.invalid); b.textContent = recommendation.invalid ? "Regenerate recommendations" : "Recommendations regenerated"; } }
    });
  }
  $("back-btn").addEventListener("click", () => navigate(steps[Math.max(0, steps.findIndex(s => s.id === stepId) - 1)].id));
  $("next-btn").addEventListener("click", () => navigate(steps[Math.min(steps.length - 1, steps.findIndex(s => s.id === stepId) + 1)].id));
  $("review-btn").addEventListener("click", () => navigate("followup"));
  $("regenerate-btn").addEventListener("click", generate);
  async function copyNote(textOnly = false) {
    if (stale || recommendation.invalid) return;
    const revision = noteRevision, text = $("note-output").value, html = N.buildNoteHtml(recommendation); copyStatus("Copying clinical draft...");
    try {
      const format = textOnly ? (await navigator.clipboard.writeText(text), "text") : await T.copy(text, html);
      copyStatus(revision !== noteRevision ? "An earlier draft was copied. Regenerate and copy the updated note before use." : format === "formatted" ? "Clinical draft copied with formatted tables. Paste normally into your EMR." : "Clinical draft copied as plain text with dated, labelled results.");
    } catch {
      if (revision !== noteRevision) return;
      $("plain-note").open = true; $("note-output").focus(); $("note-output").select(); copyStatus("Clipboard access was unavailable. The clinical draft is selected for manual copying.");
    }
  }
  $("copy-note-btn").addEventListener("click", () => copyNote());
  $("copy-note-bottom-btn").addEventListener("click", () => copyNote());
  $("copy-note-text-btn").addEventListener("click", () => copyNote(true));
  $("reset-btn").addEventListener("click", () => { state = { ...L.emptyState(), studies: I.empty() }; histories.reset(); stepId = "context"; generated = false; invalidate(); recompute(); $("results").hidden = true; renderStep(true); });
  renderStep(false);
})();
