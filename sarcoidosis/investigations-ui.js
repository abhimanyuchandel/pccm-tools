(function () {
  "use strict";
  const I = window.sarcoidosisInvestigations;
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };
  const button = (text, fn, cls = "secondary") => { const b = el("button", cls, text); b.type = "button"; b.addEventListener("click", fn); return b; };
  async function copy(text, html) {
    if (window.ClipboardItem && navigator.clipboard?.write) {
      try { await navigator.clipboard.write([new ClipboardItem({ "text/plain": new Blob([text], { type: "text/plain" }), "text/html": new Blob([html], { type: "text/html" }) })]); return; } catch { /* Text-only copying remains available when rich clipboard access is restricted. */ }
    }
    await navigator.clipboard.writeText(text);
  }
  function renderTable(kind, bundle) {
    const model = I.table(kind, bundle), table = el("table", "study-table"); table.setAttribute("role", "table");
    table.append(el("caption", "sr-only", I.definitions[kind].title + " history, newest first"));
    const thead = el("thead"), heading = el("tr"), tbody = el("tbody");
    thead.setAttribute("role", "rowgroup"); tbody.setAttribute("role", "rowgroup"); heading.setAttribute("role", "row");
    model.headers.forEach(h => { const th = el("th", "", h); th.scope = "col"; th.setAttribute("role", "columnheader"); heading.append(th); }); thead.append(heading);
    model.rows.forEach(row => { const tr = el("tr"); tr.setAttribute("role", "row"); row.forEach((v, i) => {
      const cell = el(i ? "td" : "th"); cell.setAttribute("role", i ? "cell" : "rowheader"); if (!i) cell.scope = "row";
      const label = el("span", "study-mobile-label", model.headers[i]); label.setAttribute("aria-hidden", "true"); cell.append(label, el("span", "study-value", v)); tr.append(cell);
    }); tbody.append(tr); }); table.append(thead, tbody); return table;
  }
  function gridFromHtml(html) {
    if (html.length > 300000) throw new Error("Paste one table only, with at most 100 results.");
    // Template contents stay inert: pasted images, frames and scripts are never attached or fetched.
    const template = document.createElement("template"); template.innerHTML = html;
    const tables = template.content.querySelectorAll("table");
    if (tables.length !== 1) throw new Error("Copy a single table, without nested tables, or paste as plain text.");
    const rows = [...tables[0].rows];
    if (rows.length > 101) throw new Error("Import at most 100 results at a time.");
    if (rows.some(row => row.cells.length > 40)) throw new Error("Import at most 40 columns at a time.");
    return rows.map(row => [...row.cells].map(cell => {
      if (cell.colSpan > 1 || cell.rowSpan > 1) throw new Error("Merged cells need to be unmerged in the source table, or pasted as a simple text table.");
      const clone = cell.cloneNode(true); clone.querySelectorAll("script,style").forEach(n => n.remove()); clone.querySelectorAll("br").forEach(n => n.replaceWith("\n")); return clone.textContent.trim();
    })).filter(row => row.some(Boolean));
  }
  function create({ getBundle, update, invalidate }) {
    const drafts = {}, imports = {};
    const pending = () => I.kinds.filter(k => drafts[k] || imports[k]);
    function mount(kind) {
      const def = I.definitions[kind], root = el("section", "study-manager"); root.dataset.study = kind;
      let controlsOpen = false;
      const rerender = () => {
        const active = document.activeElement, id = active?.id, name = active?.getAttribute("aria-label");
        controlsOpen = root.querySelector(".study-row-controls")?.open ?? controlsOpen;
        root.replaceChildren(); draw();
        const restored = id ? [...root.querySelectorAll("[id]")].find(n => n.id === id) : name ? [...root.querySelectorAll("[aria-label]")].find(n => n.getAttribute("aria-label") === name) : null;
        const error = [...root.querySelectorAll(".study-errors")].find(n => n.children.length);
        if (error) error.tabIndex = -1;
        (restored || error || root.querySelector("button:not(:disabled)"))?.focus({ preventScroll: true });
      };
      function commit(bundle) { update(bundle); rerender(); }
      function draw() {
        const bundle = getBundle(), rows = I.order(bundle.records[kind]);
        root.append(el("p", "hint", def.hint));
        const tools = el("div", "study-toolbar");
        tools.append(button("Add " + def.singular, () => { drafts[kind] = { row: { date: "", role: "history" }, errors: [] }; invalidate(); rerender(); root.querySelector(".study-editor input")?.focus({ preventScroll: true }); }),
          button("Paste previous table", () => { imports[kind] = { raw: "", grid: null, map: [], headings: true, replace: false, roles: false }; invalidate(); rerender(); root.querySelector(".study-paste")?.focus({ preventScroll: true }); }));
        if (drafts[kind] || imports[kind]) tools.querySelectorAll("button").forEach(b => { b.disabled = true; });
        const status = el("p", "study-copy-status hint"); status.setAttribute("role", "status");
        const b = button("Copy table", async () => {
          try { await copy(I.plainTable(kind, getBundle()), I.htmlTable(kind, getBundle())); status.textContent = "Table copied with dates and units. Paste into your note or import it at the next encounter."; }
          catch { const area = el("textarea", "study-paste"); area.value = I.plainTable(kind, getBundle()); area.readOnly = true; area.setAttribute("aria-label", "Table for manual copying"); status.replaceChildren(el("span", "", "Clipboard unavailable. Select and copy this table:"), area); area.focus(); area.select(); }
        }); b.disabled = !rows.length; tools.append(b); root.append(tools, status);
        if (rows.length) {
          root.append(renderTable(kind, bundle));
          const errors = I.validate(bundle).filter(e => e.text.startsWith(def.title + ":"));
          if (errors.length) { const box = el("div", "study-errors"); box.setAttribute("role", "alert"); errors.forEach(e => box.append(el("p", "", e.text))); root.append(box); }
          const edits = el("details", "study-row-controls"); edits.open = controlsOpen; edits.append(el("summary", "", "Assign current / comparison tests, edit or remove results"));
          rows.forEach(row => {
            const item = el("div", "study-row-control"), select = el("select");
            const id = "study-role-" + kind + "-" + row.id, label = el("label", "", row.date || "Undated result"); label.htmlFor = id;
            select.id = id; select.setAttribute("aria-label", def.singular + " " + (row.date || "undated") + " encounter role");
            [["history", "Historical only"], ["current", "Current for this encounter"], ["comparison", "Comparison test"]].forEach(([v, t]) => { const o = el("option", "", t); o.value = v; select.append(o); });
            select.value = I.roleFor(bundle, kind, row).toLowerCase();
            select.addEventListener("change", () => {
              const next = I.normalize(getBundle());
              for (const role of ["current", "comparison"]) if (next.selections[kind][role] === row.id) next.selections[kind][role] = null;
              if (select.value !== "history") next.selections[kind][select.value] = row.id;
              commit(next);
            });
            const edit = button("Edit", () => { drafts[kind] = { row: { ...row, role: I.roleFor(bundle, kind, row).toLowerCase() }, errors: [] }; invalidate(); rerender(); root.querySelector(".study-editor input")?.focus({ preventScroll: true }); }, "quiet"); edit.disabled = Boolean(drafts[kind] || imports[kind]);
            item.append(label, select, edit,
              button("Remove", () => {
                const next = I.normalize(getBundle()); next.records[kind] = next.records[kind].filter(r => r.id !== row.id);
                for (const role of ["current", "comparison"]) if (next.selections[kind][role] === row.id) next.selections[kind][role] = null;
              if (drafts[kind]?.row.id === row.id) delete drafts[kind];
              commit(next);
              }, "quiet study-remove")); edits.append(item);
          }); root.append(edits);
          const hasCurrent = Boolean(I.selected(bundle, kind, "current"));
          root.append(el("p", "hint", hasCurrent ? "Current / Comparison identifies the tests reviewed at this encounter. Only assigned PFT and walk values inform the existing clinical rules; echo and CT remain report text. All rows are included in copied tables." : "No current test assigned. Results remain historical until you choose an encounter role. All rows can still be copied."));
        } else root.append(el("p", "study-empty", "No results added. Add a result or paste a previous table; unavailable values can remain blank."));
        if (drafts[kind]) drawEditor();
        if (imports[kind]) drawImport();
      }
      function drawEditor() {
        const draft = drafts[kind], form = el("div", "study-editor"), fields = el("div", "study-editor-grid");
        form.append(el("h3", "", (draft.row.id ? "Edit " : "Add ") + def.singular));
        def.fields.forEach(f => {
          const box = el("div", "study-edit-field"), label = el("label", "field-label", f.label), id = "study-edit-" + kind + "-" + f.key;
          label.htmlFor = id; let input;
          if (f.type === "choice" || f.type === "role") {
            input = el("select"); const options = f.type === "role" ? [["history", "Historical only"], ["current", "Current for this encounter"], ["comparison", "Comparison test"]] : f.options;
            options.forEach(([v, t]) => { const o = el("option", "", t); o.value = v; input.append(o); }); input.value = draft.row[f.key] || (f.type === "role" ? "history" : "unknown");
          } else {
            input = el(["notes", "findings", "impression", "comparison", "rv"].includes(f.key) ? "textarea" : "input");
            if (input.tagName === "INPUT") { input.type = f.type === "number" ? "number" : "text"; if (f.type === "number") { input.min = f.min; input.max = f.max; input.step = "any"; input.inputMode = "decimal"; } }
            else box.classList.add("study-wide");
            if (f.type === "date") input.placeholder = "YYYY-MM-DD, YYYY-MM, or YYYY";
            if (f.range) input.placeholder = f.key === "lvef" ? "e.g. 55-60" : "e.g. <35";
            input.value = draft.row[f.key] ?? ""; input.maxLength = 3000;
          }
          input.id = id; input.autocomplete = "off";
          input.addEventListener("input", () => { draft.row[f.key] = f.type === "number" ? input.value === "" ? null : input.valueAsNumber : input.value; invalidate(); });
          box.append(label, input); fields.append(box);
        });
        form.append(fields);
        const errors = el("div", "study-errors"); errors.setAttribute("role", "alert"); draft.errors.forEach(t => errors.append(el("p", "", t))); form.append(errors);
        const actions = el("div", "study-toolbar"); actions.append(button("Save result", () => {
          const row = { ...draft.row }, parsed = I.parseDate(row.date); draft.errors = [];
          if (parsed === null) draft.errors.push("Use a valid date (YYYY-MM-DD, YYYY-MM, YYYY, or U.S. MM/DD/YYYY), or leave blank."); else row.date = parsed;
          const next = I.normalize(getBundle());
          row.id ||= `${kind}-${Date.now()}`;
          const i = next.records[kind].findIndex(r => r.id === row.id);
          if (i < 0) next.records[kind].push(row); else next.records[kind][i] = row;
          for (const role of ["current", "comparison"]) if (next.selections[kind][role] === row.id) next.selections[kind][role] = null;
          if (["current", "comparison"].includes(row.role)) next.selections[kind][row.role] = row.id;
          const normalized = I.normalize(next);
          draft.errors.push(...I.validate(normalized).map(e => e.text));
          if (next.records[kind].length > 100) draft.errors.push("Keep at most 100 results per investigation.");
          if (!def.fields.some(f => !["date", "role"].includes(f.key) && row[f.key] != null && row[f.key] !== "" && row[f.key] !== "unknown")) draft.errors.push("Enter at least one measurement or report finding.");
          if (draft.errors.length) { rerender(); return; }
          delete drafts[kind]; commit(normalized);
        }, "primary"), button("Cancel edit", () => { delete drafts[kind]; rerender(); }, "quiet")); form.append(actions); root.append(form);
      }
      function drawImport() {
        const imp = imports[kind], panel = el("div", "study-import");
        panel.append(el("h3", "", "Import " + def.title.toLowerCase() + " history"), el("p", "hint", "Paste one previous table, review its columns and units, then apply. Tabs, CSV, Markdown and simple copied HTML tables are supported. Data stay in this page's memory."));
        const label = el("label", "field-label", "Previous table"), area = el("textarea", "study-paste"); area.id = "study-paste-" + kind; label.htmlFor = area.id; area.value = imp.raw; area.maxLength = 100000;
        area.addEventListener("input", () => {
          const reviewed = Boolean(imp.grid), caret = area.selectionStart;
          imp.raw = area.value; imp.grid = null; imp.message = ""; invalidate();
          if (reviewed) { rerender(); const next = root.querySelector(".study-paste"); next.focus({ preventScroll: true }); next.setSelectionRange(caret, caret); }
        });
        const read = grid => {
          try { imp.grid = I.transpose(grid); imp.map = I.mapping(kind, imp.grid[0]); imp.headings = true; imp.message = ""; }
          catch (e) { imp.message = e.message; imp.grid = null; }
          rerender();
        };
        area.addEventListener("paste", e => {
          const html = e.clipboardData?.getData("text/html"), plain = e.clipboardData?.getData("text/plain");
          if (html && /<table[\s>]/i.test(html)) { e.preventDefault(); imp.raw = plain || "Copied HTML table"; invalidate(); try { read(gridFromHtml(html)); } catch (error) { imp.message = error.message; imp.grid = null; rerender(); } }
        });
        panel.append(label, area, button("Review pasted table", () => { imp.raw = area.value; try { read(I.parseGrid(imp.raw)); } catch (e) { imp.message = e.message; imp.grid = null; rerender(); } }));
        if (imp.message) panel.append(el("p", "alert warning", imp.message));
        if (imp.grid) {
          const check = (text, checked, fn) => { const label = el("label", "concern-option"), input = el("input"); input.type = "checkbox"; input.checked = checked; input.addEventListener("change", () => { fn(input.checked); rerender(); }); label.append(input, el("span", "", text)); return label; };
          panel.append(check("First row contains column headings", imp.headings, v => { imp.headings = v; if (!v) imp.map = imp.map.map(() => ""); }));
          const maps = el("div", "study-mapping");
          imp.grid[0].forEach((h, j) => {
            const label = el("label", "study-map-label"), title = el("span", "", imp.headings ? h || `Column ${j + 1}` : `Column ${j + 1}`), select = el("select");
            select.setAttribute("aria-label", "Import column " + (j + 1));
            const options = [["", "Do not import"], ...def.fields.map(f => [f.key, f.label]), ...(kind === "walk" ? [["distanceFt", "Distance (feet; convert to m)"]] : []), ...(kind === "pft" ? [["ratioPct", "FEV1/FVC (%; convert to ratio)"], ...Object.entries(I.combined).map(([key, [, , label]]) => [key, label + " in one cell"])] : [])];
            options.forEach(([v, text]) => { const o = el("option", "", text); o.value = v; select.append(o); }); select.value = imp.map[j]; select.addEventListener("change", () => { imp.map[j] = select.value; rerender(); });
            label.append(title, el("small", "hint", "Example: " + (imp.grid[imp.headings ? 1 : 0]?.[j] || "blank")), select); maps.append(label);
          }); panel.append(el("h4", "", "Confirm column meanings and units"), maps);
          if (kind === "pft") panel.append(el("p", "hint", "For combined PFT cells such as 3.1 (78%), map that column to the matching L and % predicted option. Absolute DLCO requires its own mL/min/mmHg option. Other units or formats need separate columns."));
          const parsed = I.importRows(kind, imp.grid, imp.map, imp.headings);
          panel.append(el("h4", "", `Preview: ${parsed.records.length} result${parsed.records.length === 1 ? "" : "s"}`));
          const preview = I.empty(); preview.records[kind] = parsed.records;
          for (const role of ["current", "comparison"]) {
            const marked = parsed.records.filter(r => r.role === role);
            if (marked.length) panel.append(el("p", "hint", `Source table marks ${marked.length} ${role} result${marked.length === 1 ? "" : "s"}. Imported roles are optional; existing assignments are retained when adding.`));
            if (imp.roles && marked.length > 1) parsed.errors.push(`More than one source result is marked ${role}. Leave imported roles unchecked and assign them after import.`);
            if (imp.roles && marked.length === 1) preview.selections[kind][role] = marked[0].id;
          }
          if (!parsed.errors.length) panel.append(renderTable(kind, I.normalize(preview)));
          parsed.notices.forEach(t => panel.append(el("p", "hint", t)));
          const errors = el("div", "study-errors"); errors.setAttribute("role", "alert"); parsed.errors.forEach(t => errors.append(el("p", "", t))); panel.append(errors);
          panel.append(check("Use current/comparison roles from the imported table where no role is already assigned", imp.roles, v => { imp.roles = v; }), check("Replace this investigation history instead of adding to it", imp.replace, v => { imp.replace = v; }));
          panel.append(el("p", "hint", "Default: add results, skip exact duplicates, and keep same-date results with different content. No date, missing value, or clinical interpretation is guessed. U.S. slash dates use month/day/year. Use year or year-month if that is all the source documents."));
          const apply = button("Apply reviewed results", () => {
            try {
              const merged = I.merge(getBundle(), kind, parsed.records.map(r => ({ ...r, role: imp.roles ? r.role : "history" })), imp.replace);
              const errors = I.validate(merged.bundle); if (errors.length) throw new Error(errors.map(e => e.text).join(" "));
              delete imports[kind]; commit(merged.bundle);
              root.querySelector(".study-copy-status").textContent = `${merged.added} results added; ${merged.duplicates} exact duplicates skipped. Review encounter roles before generating.`;
            } catch (e) { imp.message = e.message; rerender(); }
          }, "primary"); apply.disabled = parsed.errors.length > 0; panel.append(apply);
        }
        panel.append(button("Cancel import", () => { delete imports[kind]; rerender(); }, "quiet")); root.append(panel);
      }
      draw(); return root;
    }
    return { mount, pending, reset() { I.kinds.forEach(k => { delete drafts[k]; delete imports[k]; }); } };
  }
  window.sarcoidosisTables = { create, renderTable, copy, gridFromHtml };
})();
