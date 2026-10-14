(function () {
  "use strict";

  const form = document.getElementById("asthma-form");
  const schema = window.asthmaInputSchema;
  const results = document.getElementById("results");
  const copyButton = document.getElementById("copy-note-btn");
  const noteOutput = document.getElementById("note-output");
  const status = document.getElementById("recommendation-status");
  const copyStatus = document.getElementById("copy-note-status");
  let snapshot = null;
  let recommendation = null;
  let selectedBiologicId = null;
  let selectedSmokingPlanId = null;
  let planSelections = {};
  let inputWarnings = [];
  let stale = false;
  let copying = false;
  let revision = 0;
  let routineRedFlagsDefaulted = true;
  const controlLabels = {
    symptomDays: "daytime symptoms", nightWaking: "night waking", activityLimitation: "activity limitation",
    sabaFrequency: "SABA use for symptoms", reliever: "current reliever"
  };

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function fieldId(key) {
    return key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
  }

  function createField(key) {
    const definition = schema[key];
    if (!definition) throw new Error(`Unknown form field: ${key}`);
    const id = fieldId(key);
    if (definition.type === "boolean" || definition.compact) {
      const group = element("fieldset", "clinical-field choice-field");
      group.append(element("legend", "field-label", definition.label));
      const choices = element("div", `choice-options${definition.quickChoices ? " quick-choices" : ""}`);
      const options = definition.type === "boolean" ? [["unknown", "Not assessed"], ["yes", "Yes"], ["no", "No"]] : definition.options.map(([value, title]) => [value, value === "unknown" ? "Not assessed" : title]);
      options.forEach(([value, title]) => {
        const label = element("label", "choice-option");
        const input = element("input");
        input.type = "radio"; input.name = key; input.value = value; input.id = `${id}-${value}`;
        input.setAttribute("form", "asthma-form");
        input.checked = value === (definition.defaultValue || "unknown");
        label.append(input, element("span", "", title));
        choices.append(label);
      });
      group.append(choices);
      if (definition.hint) {
        const hint = element("p", "hint", definition.hint); hint.id = `${id}-help`;
        group.setAttribute("aria-describedby", hint.id); group.append(hint);
      }
      return group;
    }
    const checkbox = ["history", "exception", "confirmation", "review"].includes(definition.type);
    const wrapper = checkbox ? element("div", "clinical-field checkbox-field") : null;
    const label = element("label", checkbox ? "checkbox-row" : "clinical-field");
    label.htmlFor = id;
    const title = element("span", "field-label", definition.label);
    let input;
    if (definition.type === "enum") {
      input = element("select");
      const options = definition.options;
      options.forEach(([value, text]) => {
        const option = element("option", "", text);
        option.value = value;
        input.append(option);
      });
      input.value = definition.defaultValue || "unknown";
    } else {
      input = element("input");
      input.type = checkbox ? "checkbox" : definition.type;
      if (definition.type === "number") {
        input.min = definition.min;
        if (definition.max !== undefined) input.max = definition.max;
        input.step = definition.step;
        input.inputMode = definition.integer ? "numeric" : "decimal";
      }
    }
    input.id = id;
    input.name = key;
    input.setAttribute("form", "asthma-form");
    if (checkbox) label.append(input, title);
    else label.append(title, input);
    if (wrapper) wrapper.append(label);
    const describedBy = [];
    if (definition.hint) {
      const hint = element("span", "hint", definition.hint);
      hint.id = `${id}-help`;
      describedBy.push(hint.id);
      (wrapper || label).append(hint);
    }
    if (definition.type === "number") {
      const feedback = element("span", "field-feedback hidden");
      feedback.id = `${id}-feedback`;
      describedBy.push(feedback.id);
      label.append(feedback);
    }
    if (describedBy.length) input.setAttribute("aria-describedby", describedBy.join(" "));
    return wrapper || label;
  }

  function buildForm() {
    const rendered = new Set();
    document.querySelectorAll("[data-fields]").forEach((container) => {
      const fields = container.dataset.fields.trim().split(/\s+/);
      fields.forEach((key) => {
        if (rendered.has(key)) throw new Error(`Duplicate form field: ${key}`);
        rendered.add(key);
        container.append(createField(key));
      });
    });
    const omitted = Object.keys(schema).filter((key) => !rendered.has(key));
    if (omitted.length) throw new Error(`Missing form fields: ${omitted.join(", ")}`);
  }

  function control(key) {
    return document.querySelector(`[name="${key}"]`);
  }

  function value(key) {
    const field = control(key), definition = schema[key];
    if (["history", "confirmation", "review"].includes(definition.type)) return field.checked ? true : definition.type === "review" ? false : null;
    if (definition.type === "exception") return field.checked ? definition.checkedValue : field.dataset.explicitNo === "true" ? false : ["adherence", "technique"].includes(key) ? "unknown" : null;
    return form.elements.namedItem(key).value;
  }

  function setValue(key, next) {
    const field = control(key);
    if (field.type === "checkbox") {
      field.checked = next === true || next === schema[key].checkedValue;
      if (next === false && schema[key].type === "exception") field.dataset.explicitNo = "true";
      else delete field.dataset.explicitNo;
    } else form.elements.namedItem(key).value = typeof next === "boolean" ? next ? "yes" : "no" : next;
  }

  function retainedField(key) {
    return ["weightKg", "totalIge", "igePretreatment", "respiratoryRate", "spo2", "roomAir", "observationMinutes", "homeSupport"].includes(key) || key.startsWith("acute") || key.startsWith("postTreatment");
  }

  function rawClinicalState() {
    const data = window.asthmaLogic.createEmptyState();
    Object.entries(schema).forEach(([key, definition]) => {
      const raw = value(key);
      data[key] = definition.type === "number" ? raw.trim() === "" ? null : Number(raw) : raw;
    });
    return data;
  }

  function show(id, visible) {
    document.getElementById(id).classList.toggle("hidden", !visible);
  }

  function updateConditionalFields() {
    const controller = value("controller");
    const reliever = value("reliever");
    show("ics-dose-fields", ["ics", "ics-formoterol", "ics-laba", "triple"].includes(controller));
    show("laba-type-fields", ["ics-laba", "triple"].includes(controller));
    show("biologic-duration-fields", !["unknown", "none"].includes(value("currentBiologic")));
    show("ocs-dose-fields", value("maintenanceOcs") === true);
    show("saba-control-fields", reliever === "saba");
    show("air-use-fields", ["ics-formoterol", "ics-saba"].includes(reliever));
    const acute = value("acutePresentation") === "active";
    const retainedUrgency = !acute && window.asthmaLogic.assessAcutePresentation(rawClinicalState()).emergency;
    show("acute-fields", acute || retainedUrgency);
    show("acute-retained-warning", retainedUrgency);
    show("acute-reassessment-fields", value("acuteReassessmentAvailable") === true);
    show("biologic-dosing", ["omalizumab", "reslizumab"].includes(selectedBiologicId));
    show("omalizumab-dosing-fields", selectedBiologicId === "omalizumab");
    show("smoking-fields", value("smoking") === "current");
    Object.keys(schema).filter((key) => schema[key].type === "number").forEach(validateNumber);
  }

  function validateNumber(key) {
    const field = control(key);
    const definition = schema[key];
    const feedback = document.getElementById(`${field.id}-feedback`);
    const raw = field.value.trim();
    let error = "";
    let warning = "";
    let parsed = raw === "" ? null : Number(raw);
    const inactive = Boolean(field.closest(".hidden")) && !retainedField(key);
    if (inactive) parsed = null;
    else if (field.validity.badInput || (raw !== "" && !Number.isFinite(parsed))) {
      error = "Enter a valid numeric value or leave blank if unavailable.";
    } else if (parsed !== null) {
      if (definition.integer && !Number.isInteger(parsed)) error = "Enter a whole number.";
      else if (parsed < definition.min) error = `Enter a value of ${definition.min} or greater.`;
      else if (definition.max !== undefined && parsed > definition.max) error = `Enter a value no greater than ${definition.max}.`;
      else if ((definition.usualMin !== undefined && parsed < definition.usualMin) ||
        (definition.usualMax !== undefined && parsed > definition.usualMax)) {
        warning = "Unusual value: verify the number and units. This value will be retained.";
      } else if ((definition.concernLow !== undefined && parsed < definition.concernLow) ||
        (definition.concernHigh !== undefined && parsed >= definition.concernHigh)) {
        warning = "Clinically concerning value: review in context. This value will be retained.";
      }
    }
    field.setCustomValidity(error);
    field.classList.toggle("numeric-alert", Boolean(error));
    field.classList.toggle("numeric-warning", Boolean(warning));
    field.closest("label").classList.toggle("numeric-alert-label", Boolean(error));
    if (error) field.setAttribute("aria-invalid", "true");
    else field.removeAttribute("aria-invalid");
    feedback.textContent = error || warning;
    feedback.className = `field-feedback${error ? " feedback-error" : warning ? " feedback-warning" : " hidden"}`;
    return {
      value: error ? null : parsed,
      error: error ? `${definition.label}: ${error}` : null,
      warning: warning ? `${definition.label}: ${warning}` : null,
      field
    };
  }

  function emptyFieldValue(definition) {
    if (definition.type === "enum") return definition.defaultValue || "unknown";
    return null;
  }

  function readInputState() {
    const data = window.asthmaLogic.createEmptyState();
    const errors = [];
    const warnings = [];
    Object.entries(schema).forEach(([key, definition]) => {
      const field = control(key);
      if (definition.type === "number") {
        const result = validateNumber(key);
        data[key] = result.value;
        if (result.error) errors.push({ text: result.error, field });
        if (result.warning) warnings.push(result.warning);
      } else if (field.closest(".hidden") && !retainedField(key)) {
        data[key] = emptyFieldValue(definition);
      } else if (definition.type === "boolean") {
        data[key] = value(key) === "yes" ? true : value(key) === "no" ? false : null;
      } else if (["history", "exception", "confirmation", "review"].includes(definition.type)) {
        data[key] = value(key);
      } else if (definition.type === "enum") {
        const valid = definition.options.some(([option]) => option === value(key));
        data[key] = valid ? value(key) : emptyFieldValue(definition);
        if (!valid) errors.push({ text: `${definition.label}: choose an available option.`, field });
      } else {
        data[key] = field.value.trim();
      }
    });
    if (data.controller === "ics-formoterol") data.labaType = "formoterol";
    return { data, errors, warnings };
  }

  function updateInputSummaries() {
    const state = window.asthmaLogic.normalizeState(rawClinicalState());
    const assessment = window.asthmaLogic.classifyControl(state);
    Object.keys(schema).filter(key => schema[key].type === "exception").forEach(key => {
      const wrapper = control(key).closest(".clinical-field");
      let badge = wrapper.querySelector(".confirmed-finding");
      if (!badge) { badge = element("span", "hint confirmed-finding"); wrapper.append(badge); }
      badge.textContent = value(key) === false ? "Individually documented as absent." : "";
      badge.classList.toggle("hidden", value(key) !== false);
    });
    document.querySelectorAll("[data-treatment-preset]").forEach(button => {
      const id = button.dataset.treatmentPreset, preset = window.asthmaLogic.TREATMENT_PRESETS[id];
      const controllerMatches = state.controller === preset.controller || ["air", "saba"].includes(id) && ["none", "saba-only"].includes(state.controller);
      const selected = controllerMatches && state.reliever === preset.reliever && (preset.icsDose === "unknown" || state.icsDose === preset.icsDose);
      button.setAttribute("aria-pressed", String(selected));
    });
    document.getElementById("control-input-summary").textContent = `${assessment.answered} of ${assessment.total} applicable symptom inputs documented. ${assessment.complete
      ? "Symptom-control history complete. Exacerbation risk is assessed separately."
      : `To complete the assessment, review: ${assessment.missingFields.map(key => controlLabels[key]).join(", ")}.`}`;
    const evidence = ["dxBd", "dxIcsObjective", "dxChallenge", "dxPef"].filter((key) => control(key).checked).length;
    document.getElementById("diagnostic-input-summary").textContent = evidence
      ? `${evidence} historical evidence item${evidence === 1 ? "" : "s"} documented. New testing can be entered during initial or follow-up care.`
      : "Diagnostic findings will be interpreted with the documented history when recommendations are generated.";
  }

  function markStale() {
    revision += 1;
    clearGenerationConfirmation();
    if (!snapshot) return;
    if (!stale) {
      stale = true;
      results.classList.add("is-stale");
      document.getElementById("results-status").textContent = "Inputs changed. These results reflect the previous assessment; regenerate before copying or selecting a treatment plan.";
      status.textContent = "Inputs changed. Generate again to update recommendations and the SOAP note.";
      copyStatus.textContent = "Copy is unavailable until recommendations are regenerated.";
    }
    copyButton.disabled = true;
    show("note-jump-link", false);
    document.getElementById("biologic-options").disabled = true;
    document.getElementById("smoking-options").disabled = true;
    document.querySelectorAll("[data-plan-group]").forEach(group => { group.disabled = true; });
    noteOutput.value = "";
    noteOutput.placeholder = "Clinical inputs have changed. Regenerate recommendations to create an updated SOAP note before copying.";
  }

  function openAndFocus(field) {
    let parent = field.parentElement;
    while (parent) {
      if (parent.tagName === "DETAILS") parent.open = true;
      if (parent.classList.contains("hidden")) parent.classList.remove("hidden");
      parent = parent.parentElement;
    }
    field.focus();
  }

  function showErrors(errors, urgent = false, moveFocus = true) {
    const box = document.getElementById("form-errors");
    box.replaceChildren();
    box.append(element("p", "", urgent
      ? "Urgent care takes priority. Do not delay escalation to correct these form entries:"
      : "Review the following entries before generating recommendations:"));
    const list = element("ul");
    errors.forEach(({ text, field }) => {
      const item = element("li");
      if (field) {
        const link = element("a", "", text);
        link.href = `#${field.id}`;
        link.addEventListener("click", (event) => {
          event.preventDefault();
          openAndFocus(field);
        });
        item.append(link);
      } else item.textContent = text;
      list.append(item);
    });
    box.append(list);
    box.classList.remove("hidden");
    status.textContent = urgent
      ? "Urgent escalation is recommended despite the form errors. The clinical note remains unavailable."
      : "Recommendations were not generated. Review the entries listed above.";
    if (moveFocus && !urgent && errors[0].field) openAndFocus(errors[0].field);
  }

  function renderList(id, items) {
    const list = document.getElementById(id);
    list.replaceChildren();
    items.forEach((item) => list.append(element("li", "", item)));
  }

  function safeSourceLink(source) {
    try {
      const url = new URL(source.url, window.location.href);
      if (!["https:", "http:"].includes(url.protocol)) return null;
      const link = element("a", "", source.title);
      link.href = url.href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      return link;
    } catch {
      return null;
    }
  }

  function renderActions(actions) {
    const container = document.getElementById("management-steps");
    const groups = [
      ["urgent", ["urgent"], "Urgent assessment"],
      ["acute", ["acute"], "Acute exacerbation management"],
      ["management", ["management", "alternative"], "Medication management"],
      ["testing", ["testing"], "Testing and reassessment"],
      ["smoking", ["smoking"], "Smoking cessation"],
      ["monitoring", ["monitoring", "followup"], "Monitoring and follow-up"]
    ];
    const supportedKinds = [...groups.flatMap(([, kinds]) => kinds), "counseling", "prevention"];
    if (actions.some((action) => !supportedKinds.includes(action.kind))) {
      throw new Error("A recommendation category could not be displayed. Refresh the page and regenerate before using the note.");
    }
    container.replaceChildren();
    let number = 1;
    groups.forEach(([id, kinds, title]) => {
      const items = actions.filter((action) => kinds.includes(action.kind));
      if (!items.length) return;
      const section = element("section", `action-group action-group-${id}`);
      section.append(element("h3", "result-subtitle", title));
      const list = element("ol");
      list.start = number;
      items.forEach((action) => list.append(element("li", "", action.text)));
      number += items.length;
      section.append(list);
      container.append(section);
    });
    if (!container.children.length) container.append(element("p", "", "Additional clinical information is needed to generate management steps."));
  }

  function candidates(rec) {
    const seen = new Set();
    return rec.biologicCandidates.filter((candidate) => {
      if (typeof candidate.id !== "string" || !candidate.id || seen.has(candidate.id)) return false;
      seen.add(candidate.id);
      return true;
    });
  }

  function biologicOption(candidate) {
    const label = element("label", "biologic-option");
    const input = element("input");
    input.type = "radio";
    input.name = "biologic-selection";
    input.value = candidate ? candidate.id : "";
    input.checked = candidate ? selectedBiologicId === candidate.id : selectedBiologicId === null;
    const body = element("span", "biologic-option-body");
    body.append(element("strong", "", candidate ? candidate.name : "No agent selected"));
    if (!candidate) body.append(element("span", "hint", "Leave the agent decision as *** in the note, or select an option below."));
    else {
      body.append(element("span", "hint", candidate.reason));
      const timing = candidate.ready ? "Initiation supported by the selected clinical plan" : candidate.eligibleForReview ? "Phenotype match: review eligibility at Encounter Treatment Plan" : "Assessment, safety, or dosing prerequisites remain";
      body.append(element("span", "option-status", timing));
      if (candidate.prerequisites.length) {
        const list = element("ul", "prerequisite-list");
        candidate.prerequisites.forEach((text) => list.append(element("li", "", text)));
        body.append(list);
      }
    }
    label.append(input, body);
    const choice = element("div", "biologic-choice");
    choice.append(label);
    const medication = candidate && window.asthmaLogic.MEDICATIONS[candidate.id];
    if (medication?.detail) {
      const comparison = element("details", "clinical-drawer biologic-reference");
      comparison.append(element("summary", "", "Benefits, limitations, and typical prescribing criteria"));
      const content = element("div", "drawer-body biologic-comparison");
      for (const [title, text] of [["Potential advantages", candidate.benefits], ["Limitations and cautions", candidate.limitations], ["Typical criteria", candidate.typicalCriteria], ["This patient's fit", candidate.criteriaFit]]) {
        const paragraph = element("p");
        paragraph.append(element("strong", "", `${title}: `), document.createTextNode(text));
        content.append(paragraph);
      }
      comparison.append(content); choice.append(comparison);
      // Keep the disclosure outside the label so reviewing dosing cannot select an agent.
      const reference = element("details", "clinical-drawer biologic-reference");
      reference.append(element("summary", "", "U.S. dosing and prescribing reference"));
      const detail = element("div", "drawer-body");
      if (medication.offLabel) detail.append(element("span", "off-label-tag", "Off-label use"));
      detail.append(element("p", "", medication.detail));
      const sources = element("ul", "source-list");
      medication.sourceIds.forEach((id) => {
        const source = window.asthmaLogic.SOURCES[id];
        const link = source && safeSourceLink(source);
        if (link) {
          const item = element("li");
          item.append(link);
          sources.append(item);
        }
      });
      if (sources.children.length) detail.append(sources);
      reference.append(detail);
      choice.append(reference);
    }
    return choice;
  }

  function renderBiologics(rec) {
    const options = candidates(rec);
    show("biologic-guidance-card", options.length > 0);
    const primary = document.getElementById("biologic-primary-options");
    const additional = document.getElementById("biologic-additional-options");
    primary.replaceChildren();
    additional.replaceChildren();
    primary.append(biologicOption(null));
    const main = options.filter(candidate => !["omalizumab", "reslizumab"].includes(candidate.id));
    const more = [...main.slice(3), ...options.filter(candidate => ["omalizumab", "reslizumab"].includes(candidate.id))];
    main.slice(0, 3).forEach((candidate) => primary.append(biologicOption(candidate)));
    more.forEach((candidate) => additional.append(biologicOption(candidate)));
    show("biologic-more-options", more.length > 0);
    document.getElementById("biologic-more-summary").textContent = `Additional Biologic Options (${more.length})`;
    if (more.some((candidate) => candidate.id === selectedBiologicId)) document.getElementById("biologic-more-options").open = true;
    document.getElementById("biologic-options").disabled = stale || rec.invalid === true;
  }

  function renderRecommendation(rec, note) {
    const summary = document.getElementById("assessment-summary");
    summary.replaceChildren();
    rec.summary.forEach((text) => summary.append(element("p", "", text)));
    if (rec.findings.control.missingFields.length) {
      const missing = element("p", "input-summary");
      missing.append(document.createTextNode("Remaining symptom-control assessment: "));
      rec.findings.control.missingFields.forEach((key, index) => {
        if (index) missing.append(document.createTextNode(", "));
        const field = control(key), link = element("a", "", controlLabels[key]);
        link.href = `#${field.id}`;
        link.addEventListener("click", event => { event.preventDefault(); openAndFocus(field); });
        missing.append(link);
      });
      missing.append(document.createTextNode(". Choose an explicit answer if assessed; missing information is not assumed negative."));
      summary.append(missing);
    }
    renderActions(rec.actions);
    const medications = document.getElementById("medication-list");
    medications.replaceChildren();
    rec.medications.forEach((medication) => {
      const item = element("li");
      item.append(element("strong", "medication-name", medication.name));
      if (medication.offLabel) item.append(element("span", "off-label-tag", "Off-label use"));
      item.append(element("p", "", medication.detail));
      medications.append(item);
    });
    show("medication-card", rec.medications.length > 0);
    const prevention = rec.actions.filter((action) => action.kind === "prevention").map((action) => action.text);
    const counseling = rec.actions.filter((action) => action.kind === "counseling").map((action) => action.text);
    const cautions = [...new Set([...rec.cautions, ...inputWarnings])];
    renderList("prevention-list", prevention);
    renderList("nonpharm-list", counseling);
    renderList("caution-list", cautions);
    renderList("rationale-list", rec.rationale);
    show("prevention-card", prevention.length > 0);
    show("nonpharm-card", counseling.length > 0);
    show("caution-card", cautions.length > 0);
    const sources = document.getElementById("source-list");
    sources.replaceChildren();
    rec.sources.forEach((source) => {
      const item = element("li");
      const link = safeSourceLink(source);
      if (link) item.append(link);
      else item.textContent = source.title;
      sources.append(item);
    });
    show("rationale-card", rec.rationale.length > 0 || rec.sources.length > 0);
    show("emergency-output", rec.emergency === true);
    document.getElementById("emergency-output").textContent = rec.emergency
      ? rec.invalid
        ? "Urgent evaluation / transfer takes priority. Do not delay care to correct form entries. The SOAP note is unavailable until the data-quality errors are corrected."
        : "Urgent assessment or higher-level care is recommended. Review the clinical safety and acute management steps before routine outpatient planning."
      : "";
    renderBiologics(rec);
    show("biologic-plan-review", rec.biologicCandidates.length > 0 && !rec.emergency && !rec.findings.acute.active);
    renderSmoking(rec);
    renderPlan(rec);
    updateConditionalFields();
    noteOutput.value = note;
    noteOutput.placeholder = rec.invalid ? "Correct the data-quality errors and regenerate recommendations to create a SOAP note." : "";
    results.classList.remove("hidden", "is-stale");
    document.getElementById("results-status").textContent = rec.invalid
      ? "Data-quality errors need correction. Review Safety Checks and regenerate before using the recommendations or copying a note."
      : "Recommendations and note reflect the documented inputs.";
    copyButton.disabled = stale || copying || rec.invalid === true || !note;
    show("note-jump-link", !stale && !rec.invalid && Boolean(note));
  }

  function renderSmoking(rec) {
    const support = rec.smokingSupport, container = document.getElementById("smoking-options");
    show("smoking-card", support.options.length > 0);
    container.replaceChildren();
    container.disabled = stale || rec.invalid === true;
    const choice = (option) => {
      const label = element("label", "biologic-option");
      const radio = element("input");
      radio.type = "radio"; radio.name = "smoking-selection"; radio.value = option?.id || "";
      radio.checked = radio.value === (selectedSmokingPlanId || "");
      radio.disabled = Boolean(option?.blockers.length);
      const body = element("span", "biologic-option-body");
      body.append(element("strong", "", option ? option.name : "No medication plan selected yet"));
      if (option) {
        body.append(element("span", "hint", option.benefits));
        body.append(element("span", "option-status", option.blockers.length ? "Not selectable with a documented contraindication" : option.ready ? "Available findings support this plan, subject to final prescribing review" : "Conditional option with safety or dosing review still needed"));
        const pending = [...option.blockers, ...option.prerequisites];
        if (pending.length) { const list = element("ul", "prerequisite-list"); pending.forEach(text => list.append(element("li", "", text))); body.append(list); }
      } else body.append(element("span", "hint", "The note recommends cessation support and reserves *** for the treatment choice."));
      label.append(radio, body);
      const wrapper = element("div", "biologic-choice"); wrapper.append(label);
      if (option) {
        const details = element("details", "clinical-drawer biologic-reference");
        details.append(element("summary", "", "Evidence, cautions, and treatment course"));
        const content = element("div", "drawer-body");
        for (const [title, text] of [["Evidence", option.evidence], ["Clinical selection", option.cautions], ["Course", option.schedule]]) {
          if (!text) continue;
          const paragraph = element("p"); paragraph.append(element("strong", "", `${title}: `), document.createTextNode(text)); content.append(paragraph);
        }
        const links = element("div", "reference-links");
        option.sourceIds.forEach(id => { const link = safeSourceLink(window.asthmaLogic.SOURCES[id]); if (link) links.append(link); });
        content.append(links); details.append(content); wrapper.append(details);
      }
      return wrapper;
    };
    container.append(choice(null)); support.options.forEach(option => container.append(choice(option)));
  }

  function assertClinicalModules() {
    if (typeof window.asthmaLogic?.createEmptyState !== "function" || typeof window.asthmaLogic?.buildRecommendation !== "function" ||
      typeof window.asthmaNotes?.buildNoteText !== "function") {
      throw new Error("The clinical recommendation or note module is unavailable. Refresh the page and try again.");
    }
  }

  function renderPlan(rec) {
    const plan = rec.plan, container = document.getElementById("plan-options");
    container.replaceChildren();
    show("plan-card", plan.groups.length > 0 || plan.confirmations.length > 0);
    plan.groups.forEach(group => {
      const fieldset = element("fieldset", "plan-choice-group");
      fieldset.dataset.planGroup = group.id;
      fieldset.disabled = stale || rec.invalid;
      fieldset.append(element("legend", "result-subtitle", group.title));
      const choices = element("div", "plan-choice-grid");
      [{ id: "", label: "Complete in EMR (***)", blockers: [] }, ...group.options].forEach(option => {
        const label = element("label", "biologic-option plan-option");
        const radio = element("input");
        radio.type = "radio"; radio.name = `plan-${group.id}`; radio.value = option.id;
        radio.checked = option.id === (group.selected?.id || "");
        radio.disabled = option.blockers.length > 0;
        const body = element("span", "biologic-option-body");
        body.append(element("strong", "", option.label));
        if (option.blockers.length) body.append(element("span", "hint", option.blockers.join(". ")));
        label.append(radio, body); choices.append(label);
      });
      fieldset.append(choices); container.append(fieldset);
    });
    const confirmations = document.getElementById("plan-confirmation-fields");
    const panel = document.getElementById("plan-confirmations");
    const displayedConfirmations = [...plan.confirmations];
    // Keep reviewed answers and the regeneration button in an open drawer, including after completion.
    if (panel.open && !panel.classList.contains("hidden") && !rec.invalid && !rec.emergency && !rec.findings.acute.active) {
      confirmations.querySelectorAll("[data-confirm-field]").forEach(input => {
        const key = input.dataset.confirmField;
        if (!displayedConfirmations.some(item => item.key === key)) displayedConfirmations.push({ key, label: input.closest("fieldset").querySelector("legend").textContent });
      });
    }
    confirmations.replaceChildren();
    show("plan-confirmations", displayedConfirmations.length > 0);
    displayedConfirmations.forEach(({ key, label }) => {
      const group = element("fieldset", "clinical-field choice-field");
      group.append(element("legend", "field-label", label));
      const choices = element("div", "choice-options");
      [["unknown", "Not assessed"], ["yes", "Present"], ["no", "Absent"]].forEach(([value, title]) => {
        const label = element("label", "choice-option"), input = element("input");
        input.type = "radio"; input.name = `confirm-${key}`; input.value = value;
        const finding = rec.findings.data[key];
        input.dataset.confirmField = key; input.checked = value === (finding === true ? "yes" : finding === false ? "no" : "unknown");
        label.append(input, element("span", "", title)); choices.append(label);
      });
      group.append(choices); confirmations.append(group);
    });
  }

  function buildForSnapshot(data, selected, smokingPlan = selectedSmokingPlanId) {
    let rec = window.asthmaLogic.buildRecommendation(data, { selectedBiologicId: selected, selectedSmokingPlanId: smokingPlan, planSelections });
    if (rec.invalid === true) return { rec, selected: null, smokingPlan: null, note: "" };
    if (selected && !candidates(rec).some((candidate) => candidate.id === selected)) {
      selected = null;
      rec = window.asthmaLogic.buildRecommendation(data, { selectedBiologicId: null, selectedSmokingPlanId: smokingPlan, planSelections });
    }
    if (smokingPlan && !rec.smokingSupport.selected) {
      smokingPlan = null;
      rec = window.asthmaLogic.buildRecommendation(data, { selectedBiologicId: selected, selectedSmokingPlanId: null, planSelections });
    }
    if (rec.invalid === true) return { rec, selected: null, smokingPlan: null, note: "" };
    const note = window.asthmaNotes.buildNoteText(data, rec);
    if (typeof note !== "string" || !note.trim()) throw new Error("The clinical note could not be generated. Review the inputs and try again.");
    return { rec, selected, smokingPlan, note, planSelections: rec.plan.selections };
  }

  function clearGenerationConfirmation() {
    document.querySelectorAll("[data-generation-button]").forEach(button => {
      button.classList.remove("is-current");
      button.querySelector(".generation-confirmation").classList.add("hidden");
    });
  }

  function publishRecommendation(data, output, warnings, submitter, regenerating) {
    snapshot = data;
    recommendation = output.rec;
    selectedBiologicId = output.selected;
    selectedSmokingPlanId = output.smokingPlan || null;
    planSelections = output.planSelections || {};
    inputWarnings = warnings;
    stale = false;
    revision += 1;
    renderRecommendation(recommendation, output.note);
    copyStatus.textContent = recommendation.invalid
      ? "SOAP note unavailable until data-quality errors are corrected and recommendations regenerated."
      : "SOAP note ready. Review the documented assessment and plan before copying.";
    status.textContent = recommendation.invalid
      ? recommendation.emergency
        ? "Urgent escalation is recommended. Do not delay care for form correction; the SOAP note remains unavailable."
        : "Data-quality errors were identified. Review Safety Checks, correct the inputs, and generate again."
      : regenerating ? "Recommendations and SOAP note regenerated. Results are current." : "Recommendations and SOAP note generated below. Results are current.";
    if (!recommendation.invalid && submitter?.matches("[data-generation-button]")) {
      submitter.classList.add("is-current");
      submitter.querySelector(".generation-confirmation").classList.remove("hidden");
    }
  }

  function generate(event) {
    event.preventDefault();
    const submitter = event.submitter || document.getElementById("generate-btn");
    const regenerating = snapshot !== null;
    const position = { left: window.scrollX, top: window.scrollY, behavior: "instant" };
    clearGenerationConfirmation();
    document.getElementById("form-errors").classList.add("hidden");
    try {
      assertClinicalModules();
      updateConditionalFields();
      const input = readInputState();
      if (input.errors.length) {
        markStale();
        // Invalid fields are null; retain usable observations for urgent safety assessment.
        const assessed = window.asthmaLogic.buildRecommendation(input.data, { selectedBiologicId: null });
        if (assessed.emergency) {
          const rec = { ...assessed, invalid: true, cautions: [...input.errors.map((error) => error.text), ...assessed.cautions] };
          showErrors(input.errors, true, false);
          publishRecommendation(Object.freeze({ ...input.data }), { rec, selected: null, note: "" }, input.warnings, submitter, regenerating);
          return;
        }
        showErrors(input.errors, false, false);
        return;
      }
      const data = Object.freeze({ ...input.data });
      const output = buildForSnapshot(data, selectedBiologicId);
      publishRecommendation(data, output, input.warnings, submitter, regenerating);
    } catch (error) {
      markStale();
      showErrors([{ text: error.message || "Recommendations could not be generated. Please try again." }], false, false);
    } finally {
      // Rendering may change layout; generation must not navigate away from the clinician's position.
      const focusTarget = submitter.getClientRects().length ? submitter : document.getElementById("generate-btn");
      focusTarget.focus({ preventScroll: true });
      window.scrollTo(position);
    }
  }

  function chooseBiologic(event) {
    if (event.target.name !== "biologic-selection") return;
    if (!snapshot || stale || recommendation.invalid === true) return;
    const selected = event.target.value || null;
    if (selected && !candidates(recommendation).some((candidate) => candidate.id === selected)) {
      status.textContent = "Choose an agent from the currently displayed options.";
      renderBiologics(recommendation);
      return;
    }
    try {
      const restoreFocus = document.activeElement === event.target;
      const output = buildForSnapshot(snapshot, selected);
      selectedBiologicId = output.selected;
      selectedSmokingPlanId = output.smokingPlan;
      planSelections = output.planSelections;
      recommendation = output.rec;
      revision += 1;
      renderRecommendation(recommendation, output.note);
      if (restoreFocus) {
        const selectedOption = Array.from(document.getElementById("biologic-options").querySelectorAll("input"))
          .find((input) => input.value === (selectedBiologicId || ""));
        selectedOption?.focus({ preventScroll: true });
      }
      const name = candidates(recommendation).find((candidate) => candidate.id === selectedBiologicId)?.name;
      copyStatus.textContent = name ? `SOAP note updated for discussion of ${name}.` : "SOAP note updated without a specific biologic selection.";
    } catch (error) {
      renderBiologics(recommendation);
      copyStatus.textContent = "The note could not be updated. Regenerate recommendations before copying.";
      markStale();
      status.textContent = error.message || "The biologic selection could not be applied.";
    }
  }

  function chooseSmokingPlan(event) {
    if (event.target.name !== "smoking-selection" || !snapshot || stale || recommendation.invalid) return;
    const selected = event.target.value || null;
    if (selected && !recommendation.smokingSupport.options.some(option => option.id === selected && !option.blockers.length)) return;
    try {
      const output = buildForSnapshot(snapshot, selectedBiologicId, selected);
      selectedBiologicId = output.selected; selectedSmokingPlanId = output.smokingPlan;
      planSelections = output.planSelections;
      recommendation = output.rec; revision += 1;
      renderRecommendation(recommendation, output.note);
      Array.from(document.getElementById("smoking-options").querySelectorAll("input")).find(input => input.value === (selectedSmokingPlanId || ""))?.focus({ preventScroll: true });
      copyStatus.textContent = "SOAP note updated with the selected smoking-cessation plan.";
    } catch (error) { markStale(); status.textContent = error.message || "Regenerate recommendations before selecting a cessation plan."; }
  }

  function copyFallback() {
    const previousFocus = document.activeElement;
    noteOutput.focus();
    noteOutput.select();
    let copied = false;
    try { copied = document.execCommand("copy") === true; } catch { /* Manual selection remains available. */ }
    if (copied && previousFocus?.focus) previousFocus.focus({ preventScroll: true });
    return copied;
  }

  function choosePlan(event) {
    const group = event.target.closest("[data-plan-group]");
    if (!group || !snapshot || stale || recommendation.invalid) return;
    const previous = planSelections;
    planSelections = { ...planSelections, [group.dataset.planGroup]: event.target.value || null };
    try {
      const output = buildForSnapshot(snapshot, selectedBiologicId);
      planSelections = output.planSelections; recommendation = output.rec; revision += 1;
      const name = event.target.name, value = event.target.value;
      renderRecommendation(recommendation, output.note);
      const revealBiologic = group.dataset.planGroup === "controller" && planSelections.controller === "continue-biologic";
      if (revealBiologic) {
        const heading = document.querySelector("#biologic-guidance-card h2");
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
        heading.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
      }
      if (!revealBiologic) Array.from(document.getElementById("plan-options").querySelectorAll("input")).find(input => input.name === name && input.value === value)?.focus({ preventScroll: true });
      copyStatus.textContent = "SOAP note updated with the selected encounter plan.";
    } catch (error) { planSelections = previous; markStale(); status.textContent = error.message || "Regenerate before choosing a treatment plan."; }
  }

  async function copyNote() {
    if (!snapshot || stale || recommendation.invalid === true || copying || !noteOutput.value) return;
    copying = true;
    copyButton.disabled = true;
    const copiedRevision = revision;
    let copied = false;
    try {
      if (window.isSecureContext && typeof navigator.clipboard?.writeText === "function") {
        try {
          await navigator.clipboard.writeText(noteOutput.value);
          copied = true;
        } catch { copied = copyFallback(); }
      } else copied = copyFallback();
      copyStatus.textContent = copied
        ? copiedRevision === revision ? "SOAP note copied." : "The previously generated note was copied. Review the updated assessment before copying again."
        : "Copy could not be confirmed. The note is selected; use your device's Copy command.";
    } finally {
      copying = false;
      copyButton.disabled = stale || recommendation.invalid === true || !noteOutput.value;
    }
  }

  form.addEventListener("submit", generate);

  try {
    if (!schema) throw new Error("The input form could not be loaded. Refresh the page and try again.");
    buildForm();
    updateConditionalFields();
    updateInputSummaries();
    const onInput = (event) => {
      if (!event.target.name || !schema[event.target.name]) return;
      delete event.target.dataset.explicitNo;
      if (event.target.name === "urgentRedFlags") routineRedFlagsDefaulted = false;
      if (event.target.name === "acutePresentation") {
        const context = value("acutePresentation");
        if (context !== "none" && routineRedFlagsDefaulted) {
          setValue("urgentRedFlags", "unknown");
          routineRedFlagsDefaulted = false;
        }
        const defaults = window.asthmaLogic.getRoutineVisitDefaults(rawClinicalState());
        if (defaults.urgentRedFlags === false) {
          setValue("urgentRedFlags", false);
          routineRedFlagsDefaulted = true;
        }
        if (context === "recent") setValue("recentExacerbation", true);
      }
      markStale();
      updateConditionalFields();
      if (event.target.name === "diagnosisContext" && value("diagnosisContext") === "suspected") document.getElementById("testing-details").open = true;
      updateInputSummaries();
    };
    // Dosing controls are associated with the form but sit beside the biologic selection.
    document.querySelector(".app-shell").addEventListener("input", onInput);
    document.querySelector(".app-shell").addEventListener("change", onInput);
    document.getElementById("set-symptoms-negative-btn").addEventListener("click", () => {
      setValue("symptomDays", "none");
      setValue("nightWaking", "none");
      setValue("activityLimitation", false);
      if (value("reliever") === "saba") setValue("sabaFrequency", "none");
      markStale();
      updateInputSummaries();
      if (!stale) status.textContent = "No current symptoms documented using the shortcut. Other findings remain as entered.";
    });
    document.getElementById("set-exac-zero-btn").addEventListener("click", () => {
      control("ocsExacerbations").value = "0";
      control("hospitalExacerbations").value = "0";
      validateNumber("ocsExacerbations");
      validateNumber("hospitalExacerbations");
      markStale();
      if (!stale) status.textContent = "Both 12-month exacerbation counts documented as zero. Other risk findings remain as entered.";
    });
    document.getElementById("biologic-options").addEventListener("change", chooseBiologic);
    document.getElementById("smoking-options").addEventListener("change", chooseSmokingPlan);
    document.getElementById("plan-options").addEventListener("change", choosePlan);
    document.getElementById("plan-confirmation-fields").addEventListener("change", event => {
      const key = event.target.dataset.confirmField;
      if (!key) return;
      setValue(key, event.target.value === "yes" ? true : event.target.value === "no" ? false : null);
      markStale(); updateConditionalFields(); updateInputSummaries();
    });
    document.querySelectorAll("[data-treatment-preset]").forEach(button => button.addEventListener("click", () => {
      const preset = window.asthmaLogic.TREATMENT_PRESETS[button.dataset.treatmentPreset];
      const changed = Object.entries(preset).some(([key, next]) => value(key) !== next);
      Object.entries(preset).forEach(([key, next]) => setValue(key, next));
      if (changed) markStale();
      updateConditionalFields(); updateInputSummaries();
      if (!stale) status.textContent = `${button.querySelector(".preset-label").textContent} recorded as current treatment. Other clinical findings were preserved.`;
    }));
    document.querySelectorAll(".workflow-nav a").forEach(link => link.addEventListener("click", event => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const target = document.getElementById(link.hash.slice(1));
      if (!target) return;
      if (target.tagName === "DETAILS") target.open = true;
      target.tabIndex = -1;
      target.focus({ preventScroll: true });
    }));
    copyButton.addEventListener("click", copyNote);
  } catch (error) {
    document.getElementById("generate-btn").disabled = true;
    showErrors([{ text: error.message || "The form could not be initialized." }]);
  }
})();
