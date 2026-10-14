(function () {
  "use strict";
  const L = window.copdLogic,
    W = window.copdWorkflow,
    N = window.copdNotes,
    S = window.copdSchema,
    C = window.copdMedications;
  const $ = (id) => document.getElementById(id);
  const mmrcDescriptions = [
    "Breathless only with strenuous exercise.",
    "Short of breath when hurrying on level ground or walking up a slight hill.",
    "Walks slower than peers because of breathlessness, or stops for breath at own pace on level ground.",
    "Stops for breath after about 100 m or a few minutes on level ground.",
    "Too breathless to leave home, or breathless when dressing or undressing.",
  ];
  const el = (tag, className, text) => {
    const n = document.createElement(tag);
    if (className) n.className = className;
    if (text !== undefined) n.textContent = text;
    return n;
  };
  let state = L.createEmptyState(),
    selections = {},
    recommendation = L.buildRecommendation(state),
    stageId = "context",
    stages = W.steps(state, recommendation),
    generated = false,
    stale = true;
  const calculator = {
    values: Array(8).fill(""),
    catOwned: false,
  };
  const answered = (k, value) =>
    S[k].type === "number"
      ? value !== null
      : S[k].boolean
        ? value !== null
        : S[k].type === "concern"
          ? value
          : value !== "unknown";
  const display = (k, v) =>
    v === null || v === "unknown"
      ? "Not assessed / not available"
      : S[k].boolean || S[k].type === "concern"
        ? v
          ? "Yes"
          : "No"
        : S[k].type === "number"
          ? k === "mmrcScore"
            ? v + "/4 · " + mmrcDescriptions[v]
            : String(v)
          : S[k].options.find(([id]) => id === v)?.[1] || String(v);
  const keepViewport = (fn) => {
    const x = scrollX,
      y = scrollY;
    fn();
    window.scrollTo({ left: x, top: y, behavior: "instant" });
  };
  function updateEngine() {
    recommendation = L.buildRecommendation(state, selections);
    selections = { ...recommendation.selections };
    stages = W.steps(state, recommendation);
    stageId = W.reconcileStep(stageId, stages);
    renderUrgent();
  }
  function invalidate() {
    stale = true;
    $("copy-note-btn").disabled = true;
    $("note-output").value = "";
    $("copy-status").textContent = generated
      ? "Inputs changed. Regenerate before copying."
      : "";
    $("output-status").textContent = generated ? "Regeneration required" : "";
    $("note-output").closest("article").classList.add("stale");
    const b = $("generate-btn");
    if (b) {
      b.classList.remove("success");
      b.textContent = "Regenerate recommendations";
    }
  }
  function change(key, value) {
    state[key] = value;
    if (key === "addonContext" && value === "none") {
      [
        "currentRoflumilast",
        "currentAzithromycin",
        "currentEnsifentrine",
        "maintenanceOcs",
      ].forEach((k) => {
        state[k] = false;
      });
      state.currentBiologic = "none";
    }
    if (
      key === "maintenanceOcs" &&
      value === true &&
      state.addonContext === "none"
    )
      state.addonContext = "yes";
    if (key === "catScore") calculator.catOwned = false;
    invalidate();
    updateEngine();
    renderProgress();
    renderFieldWarnings();
  }
  function renderUrgent() {
    const banner = $("urgent-alert");
    banner.hidden = !recommendation.emergency;
    banner.textContent = recommendation.emergency
      ? recommendation.actions.find((a) => a.kind === "urgent").text +
        " Previously entered urgent findings remain active even if the encounter context changes."
      : "";
  }
  function reference(key) {
    const ref = C.REFERENCES[key];
    if (!ref) return null;
    const details = el("details", "reference");
    details.append(el("summary", "", "Reference · " + ref.title));
    if (ref.table) {
      const table = el("table", "reference-table");
      table.setAttribute("role", "table");
      const caption = el("caption", "sr-only", ref.title),
        head = el("thead"),
        body = el("tbody"),
        headerRow = el("tr");
      head.setAttribute("role", "rowgroup");
      body.setAttribute("role", "rowgroup");
      headerRow.setAttribute("role", "row");
      ref.table.headers.forEach((text) => {
        const th = el("th", "", text);
        th.scope = "col";
        th.setAttribute("role", "columnheader");
        headerRow.append(th);
      });
      head.append(headerRow);
      ref.table.rows.forEach((row) => {
        const tr = el("tr");
        tr.setAttribute("role", "row");
        row.forEach((text, i) => {
          const cell = el(i === 0 ? "th" : "td");
          cell.setAttribute("role", i === 0 ? "rowheader" : "cell");
          if (i === 0) {
            cell.scope = "row";
            cell.textContent = text;
          } else {
            const label = el(
              "span",
              "mobile-table-label",
              ref.table.headers[i],
            );
            label.setAttribute("aria-hidden", "true");
            cell.append(label, el("span", "", text));
          }
          tr.append(cell);
        });
        body.append(tr);
      });
      table.append(caption, head, body);
      details.append(table);
    }
    if (ref.text) details.append(el("p", "", ref.text));
    const links = el("div", "reference-links");
    ref.sources.forEach((id) => {
      const src = C.SOURCES[id];
      if (!src) return;
      const a = el("a", "", src.title);
      a.href = src.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      links.append(a);
    });
    details.append(links);
    return details;
  }
  function field(key) {
    const f = S[key],
      outer = el("div", "field");
    outer.dataset.field = key;
    const id = "field-" + key,
      hintId = id + "-hint",
      feedbackId = id + "-feedback";
    if (key === "mmrcScore") outer.append(mmrcField(hintId));
    else if (f.type === "concern") {
      const label = el("label", "concern-option"),
        input = el("input");
      input.type = "checkbox";
      input.id = id;
      input.checked = state[key];
      input.addEventListener("change", () => change(key, input.checked));
      label.append(input, el("span", "", f.label));
      outer.append(label);
    } else if (f.type === "number") {
      const label = el("label", "field-label", f.label);
      label.htmlFor = id;
      const input = el("input");
      input.type = "number";
      input.id = id;
      input.min = f.min;
      input.max = f.max;
      input.step = f.integer ? "1" : "any";
      input.inputMode = f.integer ? "numeric" : "decimal";
      input.autocomplete = "off";
      input.value = state[key] ?? "";
      input.setAttribute("aria-describedby", hintId + " " + feedbackId);
      input.addEventListener("input", () =>
        change(key, input.value === "" ? null : input.valueAsNumber),
      );
      outer.append(label, input);
    } else if (f.options.length <= 5) {
      const set = el("fieldset");
      set.append(el("legend", "", f.label));
      const choices = el("div", "choice-grid");
      f.options.forEach(([value, text]) => {
        const label = el("label", "choice-option"),
          input = el("input");
        input.type = "radio";
        input.name = key;
        input.id = id + "-" + value;
        input.value = value;
        input.checked = f.boolean
          ? (value === "unknown" && state[key] === null) ||
            (value === "yes" && state[key] === true) ||
            (value === "no" && state[key] === false)
          : state[key] === value;
        input.setAttribute("aria-describedby", hintId);
        input.addEventListener("change", () =>
          change(
            key,
            f.boolean
              ? value === "yes"
                ? true
                : value === "no"
                  ? false
                  : null
              : value,
          ),
        );
        label.append(input, el("span", "", text));
        choices.append(label);
      });
      set.append(choices);
      outer.append(set);
    } else {
      const label = el("label", "field-label", f.label);
      label.htmlFor = id;
      const select = el("select");
      select.id = id;
      select.setAttribute("aria-describedby", hintId);
      f.options.forEach(([value, text]) => {
        const option = el("option", "", text);
        option.value = value;
        select.append(option);
      });
      select.value = state[key];
      select.addEventListener("change", () => change(key, select.value));
      outer.append(label, select);
    }
    const hint = el(
      "p",
      "hint",
      f.hint || (f.type === "number" ? "Leave blank if unavailable." : ""),
    );
    hint.id = hintId;
    if (!hint.textContent) hint.classList.add("sr-only");
    const feedback = el("p");
    feedback.id = feedbackId;
    feedback.setAttribute("aria-live", "polite");
    outer.append(hint, feedback);
    return outer;
  }
  function renderFieldWarnings() {
    document.querySelectorAll("[data-field]").forEach((node) => {
      const key = node.dataset.field,
        error = recommendation.errors.find((e) => e.key === key),
        warning = recommendation.warnings.find((e) => e.key === key);
      const input = node.querySelector("input[type=number]"),
        feedback = node.querySelector('[id$="-feedback"]');
      if (!feedback) return;
      feedback.textContent = error?.text || warning?.text || "";
      feedback.className = error ? "field-error" : "field-warning";
      if (input) {
        input.classList.toggle("number-error", !!error);
        input.classList.toggle("number-warning", !!warning);
        input.setAttribute("aria-invalid", error ? "true" : "false");
      }
    });
  }
  function renderProgress() {
    const index = stages.findIndex((s) => s.id === stageId),
      stage = stages[index];
    $("chapter-label").textContent =
      stage.chapter +
      (stage.optional ? " · available data" : " · patient inputs");
    $("step-count").textContent =
      index + 1 + " / " + stages.length + " applicable steps";
    $("progress").max = stages.length;
    $("progress").value = index + 1;
    $("back-btn").disabled = index === 0;
    $("next-btn").hidden = !!stage.review;
    $("review-btn").hidden = !!stage.review;
    const nav = $("chapter-nav");
    nav.replaceChildren();
    [...new Set(stages.map((s) => s.chapter))].forEach((chapter) => {
      const b = el(
        "button",
        "chapter-link" + (chapter === stage.chapter ? " active" : ""),
      );
      b.type = "button";
      if (chapter === stage.chapter) b.setAttribute("aria-current", "step");
      b.append(el("span", "chapter-dot"), el("span", "", chapter));
      b.addEventListener("click", () =>
        navigate(stages.find((s) => s.chapter === chapter).id),
      );
      nav.append(b);
    });
  }
  function navigate(id) {
    stageId = id;
    renderStep();
    $("step-title").focus({ preventScroll: true });
    $("encounter").scrollIntoView({ block: "start", behavior: "instant" });
  }
  function renderStep() {
    const stage = stages.find((s) => s.id === stageId);
    renderProgress();
    $("step-title").textContent = stage.title;
    $("step-hint").hidden = !stage.hint;
    $("step-hint").textContent = stage.hint || "";
    const host = $("step-content");
    host.replaceChildren();
    stage.fields.forEach((key) => host.append(field(key)));
    if (stage.zero) {
      const b = el(
        "button",
        "secondary",
        "Confirm no treated exacerbations or hospitalizations",
      );
      b.type = "button";
      b.addEventListener("click", () => {
        state.moderateExac = state.severeExac = 0;
        invalidate();
        updateEngine();
        renderStep();
      });
      host.append(b);
    }
    if (stage.calculators) host.append(catCalculator());
    if (stage.reference) host.append(reference(stage.reference));
    if (stage.plans) {
      host.append(
        el(
          "p",
          "review-help",
          "Choose one controller strategy and compatible additional plans. Blocked prescriptions show the outstanding safety review. Unresolved decisions remain *** in the clinical draft.",
        ),
      );
      renderPlanChoices(host, "step");
    }
    if (stage.review) renderReview(host);
    renderFieldWarnings();
  }
  function renderReview(host) {
    host.append(
      el(
        "p",
        "review-help",
        "Review available answers or edit a section. Unknown entries remain unknown; you may generate a draft without completing every optional assessment.",
      ),
    );
    const quality = [...recommendation.errors, ...recommendation.warnings];
    if (quality.length) {
      const box = el(
        "div",
        "alert " + (recommendation.invalid ? "danger" : "warning"),
      );
      quality.forEach((q) => box.append(el("p", "", q.text)));
      host.append(box);
    }
    const grid = el("div", "summary-grid");
    stages
      .filter((s) => s.fields.length)
      .forEach((stage) => {
        const card = el("section", "review-section"),
          header = el("div", "review-heading");
        header.append(el("h3", "", stage.title));
        const edit = el("button", "quiet", "Edit");
        edit.type = "button";
        edit.setAttribute("aria-label", "Edit " + stage.title);
        edit.addEventListener("click", () => navigate(stage.id));
        header.append(edit);
        const list = el("dl", "answer-list");
        stage.fields.forEach((k) => {
          const row = el("div");
          row.append(
            el("dt", "", S[k].label),
            el("dd", "", display(k, state[k])),
          );
          list.append(row);
        });
        card.append(header, list);
        grid.append(card);
      });
    const plans = el("section", "review-section");
    plans.append(el("h3", "", "Encounter plan selections"));
    recommendation.groups.forEach((g) =>
      plans.append(
        el(
          "p",
          "hint",
          g.title +
            ": " +
            (g.options.find((o) => o.id === g.selected)?.label || "***"),
        ),
      ),
    );
    const editPlans = el("button", "quiet", "Edit encounter plan");
    editPlans.type = "button";
    editPlans.addEventListener("click", () =>
      navigate(stages.find((s) => s.plans).id),
    );
    plans.append(editPlans);
    grid.append(plans);
    host.append(grid);
    const wrap = el("div", "generate-wrap"),
      button = el(
        "button",
        "primary",
        generated && !stale
          ? "✓ Recommendations regenerated"
          : generated
            ? "Regenerate recommendations"
            : "Generate recommendations and SOAP note",
      );
    button.id = "generate-btn";
    button.type = "button";
    if (generated && !stale) button.classList.add("success");
    button.addEventListener("click", () => keepViewport(generate));
    wrap.append(
      button,
      el(
        "p",
        "hint",
        "Clinical recommendations and the editable draft will appear below. Inputs are not stored.",
      ),
    );
    host.append(wrap);
  }
  function renderPlanChoices(host, prefix) {
    if (recommendation.emergency) {
      host.append(
        el(
          "div",
          "alert danger",
          "Urgent care takes precedence. Routine prescribing and referral selections are not available.",
        ),
      );
      return;
    }
    if (recommendation.invalid) {
      host.append(
        el(
          "div",
          "alert warning",
          "Correct invalid numeric entries to see applicable treatment choices.",
        ),
      );
      return;
    }
    const choices = el("div", "plan-choices");
    recommendation.groups.forEach((g) => {
      const set = el("fieldset", "plan-group");
      set.append(el("legend", "", g.title));
      const options = el("div", "plan-options");
      const all = [
        {
          id: "",
          label: "Not decided / complete in EMR",
          text: g.placeholder || "No product preset selected.",
          blockers: [],
        },
        ...g.options,
      ];
      all.forEach((o) => {
        const label = el("label", "plan-option"),
          input = el("input"),
          body = el("span");
        input.type = "radio";
        input.name = prefix + "-plan-" + g.id;
        input.value = o.id;
        input.id = prefix + "-plan-" + g.id + "-" + (o.id || "unknown");
        input.checked = g.selected === o.id;
        input.disabled = o.blockers.length > 0;
        body.append(el("strong", "", o.label));
        if (o.text) body.append(el("p", "", o.text));
        if (o.blockers.length)
          body.append(el("p", "blocked", "Needed: " + o.blockers.join(" ")));
        input.addEventListener("change", () =>
          keepViewport(() => {
            selections[g.id] = o.id;
            updateEngine();
            if (generated && !stale) {
              renderResults();
              $("copy-status").textContent =
                "Clinical draft updated from the selected plan.";
            }
            if (stages.find((s) => s.id === stageId)?.plans) renderStep();
            document.getElementById(input.id)?.focus({ preventScroll: true });
          }),
        );
        label.append(input, body);
        options.append(label);
      });
      set.append(options);
      choices.append(set);
    });
    host.append(choices);
    if (recommendation.addonCandidates.length) {
      const info = el("details", "reference");
      info.append(
        el(
          "summary",
          "",
          "Reference · Add-on rationale and prescribing prerequisites",
        ),
      );
      recommendation.addonCandidates.forEach((c) => {
        const med = C.MEDICATIONS[c.id],
          card = el("div", "med-card");
        card.append(
          el("h3", "", med.name),
          el("p", "", c.why),
          el("p", "", med.detail),
        );
        if (c.blockers.length)
          card.append(
            el("p", "blocked", "Outstanding: " + c.blockers.join(" ")),
          );
        const a = el("a", "", "U.S. prescribing reference");
        a.href = C.SOURCES[med.source].url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        card.append(a);
        info.append(card);
      });
      host.append(info);
    }
  }
  function generate() {
    updateEngine();
    generated = true;
    stale = recommendation.invalid;
    $("results").hidden = false;
    renderResults();
    const b = $("generate-btn");
    if (b) {
      b.textContent = stale
        ? "Correct inputs and regenerate"
        : "✓ Recommendations regenerated";
      b.classList.toggle("success", !stale);
    }
    $("output-status").textContent = stale
      ? "Numeric corrections required"
      : "✓ Up to date";
  }
  function renderResults() {
    const r = recommendation,
      host = $("results-content");
    host.replaceChildren();
    if (r.invalid) {
      const box = el("div", "alert danger");
      r.errors.forEach((q) => box.append(el("p", "", q.text)));
      host.append(box);
    }
    const card = el("article", "result-card");
    card.append(el("h3", "", "Assessment summary"));
    const findings = el("div", "finding-grid");
    [
      ["Diagnosis", r.findings.diagnosis.label],
      ["Symptoms", r.findings.symptoms.label],
      [
        "Exacerbation risk",
        r.findings.risk.high === true
          ? "Recent event documented"
          : r.findings.risk.high === false
            ? "No events confirmed"
            : "History incomplete",
      ],
      [
        "Treatment pathway",
        r.findings.therapy.phase === "followup"
          ? "Follow-up"
          : r.findings.therapy.phase === "initial"
            ? "Initial"
            : "Not specified",
      ],
      ["Initial GOLD profile", r.group || "Not classified"],
      [
        "Procedures and transplant",
        r.findings.advanced.bode === null
          ? "BODE not calculated without complete components"
          : "BODE " + r.findings.advanced.bode + "/10",
      ],
    ].forEach(([name, text]) => {
      const item = el("div", "finding");
      item.append(el("strong", "", name), el("span", "", text));
      findings.append(item);
    });
    card.append(findings);
    host.append(card);
    const management = el("article", "result-card");
    management.append(el("h3", "", "Recommended management steps"));
    const list = el("ol");
    r.actions
      .filter((a) => !["prevention", "screening", "cessation"].includes(a.kind))
      .forEach((a) => list.append(el("li", "", a.text)));
    management.append(list);
    host.append(management);
    const grouped = [
      ["Tobacco cessation", ["cessation"]],
      ["Preventive care and screening", ["prevention", "screening"]],
    ];
    grouped.forEach(([title, kinds]) => {
      const actions = r.actions.filter((a) => kinds.includes(a.kind));
      if (!actions.length) return;
      const section = el("article", "result-card");
      section.append(el("h3", "", title));
      const ul = el("ul");
      actions.forEach((a) => ul.append(el("li", "", a.text)));
      section.append(ul);
      if (
        kinds.includes("screening") &&
        actions.some((a) => a.kind === "screening")
      )
        section.append(el("p", "hint", r.preventionFootnote));
      host.append(section);
    });
    const selectionCard = el("article", "result-card");
    selectionCard.append(
      el("h3", "", "Encounter treatment plan"),
      el(
        "p",
        "hint",
        "Selections below update the clinical draft while the generated findings remain current.",
      ),
    );
    renderPlanChoices(selectionCard, "result");
    host.append(selectionCard);
    if (r.medications.length) {
      const medicationCard = el("article", "result-card");
      medicationCard.append(el("h3", "", "Selected medication details"));
      r.medications.forEach((id) => {
        const m = C.MEDICATIONS[id],
          block = el("div", "med-card");
        block.append(
          el("h3", "", m.name),
          el("p", "", m.dose),
          el("p", "", m.detail),
        );
        medicationCard.append(block);
      });
      host.append(medicationCard);
    }
    if (r.cautions.length || r.warnings.length) {
      const caution = el("article", "result-card");
      caution.append(el("h3", "", "Safety checks"));
      const ul = el("ul");
      [...r.cautions, ...r.warnings.map((w) => w.text)].forEach((t) =>
        ul.append(el("li", "", t)),
      );
      caution.append(ul);
      host.append(caution);
    }
    const refs = el("details", "reference");
    refs.append(el("summary", "", "Clinical references and rationale"));
    [...new Set(r.references)].forEach((key) => {
      const ref = reference(key);
      if (ref) refs.append(ref);
    });
    const sources = el("div", "reference-links");
    r.sources.forEach((id) => {
      const src = C.SOURCES[id];
      if (!src) return;
      const a = el("a", "", src.title);
      a.href = src.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      sources.append(a);
    });
    refs.append(sources);
    host.append(refs);
    $("note-output").value = stale ? "" : N.buildNoteText(r);
    $("copy-note-btn").disabled = stale || !N.buildNoteText(r);
    $("note-output").closest("article").classList.toggle("stale", stale);
  }
  function catCalculator() {
    const details = el("details", "calculator");
    details.append(el("summary", "", "Optional CAT / CAAT item-score entry"));
    details.append(
      el(
        "p",
        "hint",
        "Use the validated questionnaire and its item-specific anchors. Completing all eight item scores updates the total automatically. This score-entry aid does not replace the official questionnaire.",
      ),
    );
    const a = el("a", "hint", "Open the official questionnaire");
    a.href = C.SOURCES.cat.url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    details.append(a);
    const anchors = [
      ["Cough", "0: never cough · 5: cough all the time"],
      ["Phlegm", "0: no phlegm · 5: chest full of phlegm"],
      ["Chest tightness", "0: not tight · 5: very tight"],
      [
        "Breathlessness on hills or stairs",
        "0: not breathless · 5: very breathless",
      ],
      ["Activity at home", "0: not limited · 5: very limited"],
      ["Confidence leaving home", "0: confident · 5: not confident"],
      ["Sleep", "0: sound sleep · 5: sleep disrupted by lung condition"],
      ["Energy", "0: lots of energy · 5: no energy"],
    ];
    const rows = el("div", "calc-items");
    anchors.forEach(([name, anchor], i) => {
      const row = el("div", "calc-row"),
        label = el("label", "", name);
      label.htmlFor = "cat-item-" + i;
      label.append(el("small", "", anchor));
      const select = el("select");
      select.id = "cat-item-" + i;
      ["", "0", "1", "2", "3", "4", "5"].forEach((v) => {
        const option = el("option", "", v === "" ? "—" : v);
        option.value = v;
        select.append(option);
      });
      select.value = calculator.values[i];
      select.addEventListener("change", () => {
        calculator.values[i] = select.value;
        if (calculator.values.every((v) => v !== "")) {
          state.catScore = calculator.values.reduce((sum, v) => sum + +v, 0);
          calculator.catOwned = true;
        } else if (calculator.catOwned) {
          state.catScore = null;
          calculator.catOwned = false;
        }
        const input = $("field-catScore");
        if (input) input.value = state.catScore ?? "";
        invalidate();
        updateEngine();
        renderProgress();
        renderFieldWarnings();
      });
      row.append(label, select);
      rows.append(row);
    });
    details.append(rows);
    return details;
  }
  function mmrcField(hintId) {
    const set = el("fieldset");
    set.append(el("legend", "", S.mmrcScore.label));
    const list = el("div", "mmrc-list");
    [
      { value: null, text: "Not assessed" },
      ...mmrcDescriptions.map((text, value) => ({
        value,
        text: value + " · " + text,
      })),
    ].forEach(({ value, text }) => {
      const label = el("label", "choice-option"),
        input = el("input");
      input.type = "radio";
      input.name = "mmrcScore";
      input.id = "mmrc-item-" + (value === null ? "unknown" : value);
      input.value = value === null ? "unknown" : value;
      input.checked = state.mmrcScore === value;
      input.setAttribute("aria-describedby", hintId);
      input.addEventListener("change", () => {
        change("mmrcScore", value);
      });
      label.append(input, el("span", "", text));
      list.append(label);
    });
    set.append(list);
    return set;
  }
  $("back-btn").addEventListener("click", () => {
    const i = stages.findIndex((s) => s.id === stageId);
    if (i > 0) navigate(stages[i - 1].id);
  });
  $("next-btn").addEventListener("click", () => {
    const i = stages.findIndex((s) => s.id === stageId);
    if (i < stages.length - 1) navigate(stages[i + 1].id);
  });
  $("review-btn").addEventListener("click", () => navigate("review"));
  $("reset-btn").addEventListener("click", () => {
    if (
      !window.confirm("Clear this encounter and its generated clinical draft?")
    )
      return;
    state = L.createEmptyState();
    selections = {};
    calculator.values.fill("");
    calculator.catOwned = false;
    generated = false;
    stale = true;
    stageId = "context";
    $("results").hidden = true;
    $("note-output").value = "";
    $("copy-status").textContent = "";
    updateEngine();
    renderStep();
  });
  $("copy-note-btn").addEventListener("click", async () => {
    if (stale || recommendation.invalid) return;
    const note = N.buildNoteText(recommendation);
    try {
      await navigator.clipboard.writeText(note);
      $("copy-status").textContent =
        "Clinical draft copied. Complete *** placeholders and verify before signing.";
    } catch {
      $("note-output").focus({ preventScroll: true });
      $("note-output").select();
      $("copy-status").textContent =
        "Clipboard access was unavailable. The note is selected for manual copying.";
    }
  });
  updateEngine();
  renderStep();
})();
