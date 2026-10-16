(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.sarcoidosisInvestigations = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const number = (key, label, min, max, aliases = []) => ({ key, label, min, max, aliases, type: "number" });
  const text = (key, label, aliases = []) => ({ key, label, aliases, type: "text" });
  const date = { key: "date", label: "Date", type: "date", aliases: ["test date", "study date", "visit date"] };
  const role = { key: "role", label: "Encounter role", type: "role", aliases: ["role", "status"] };
  const notes = text("notes", "Notes", ["comments", "comment"]);
  const definitions = {
    pft: { title: "Pulmonary function", singular: "PFT", fields: [date, role,
      number("fvcL", "FVC (L)", .01, 12, ["fvc l", "fvc liters"]), number("fvc", "FVC (% predicted)", 1, 200, ["fvc %", "fvc % pred", "fvc percent predicted"]),
      number("fev1L", "FEV1 (L)", .01, 12, ["fev1 l", "fev1 liters"]), number("fev1", "FEV1 (% predicted)", 1, 200, ["fev1 %", "fev1 % pred", "fev1 percent predicted"]),
      number("ratio", "FEV1/FVC (ratio)", .01, 1, ["fev1/fvc", "fev1 fvc ratio"]),
      number("tlcL", "TLC (L)", .01, 20, ["tlc l"]), number("tlc", "TLC (% predicted)", 1, 250, ["tlc %", "tlc % pred"]),
      number("dlcoAbs", "DLCO (mL/min/mmHg)", .01, 100, ["dlco ml/min/mmhg"]), number("dlco", "DLCO (% predicted)", 1, 200, ["dlco %", "dlco % pred", "dlco percent predicted"]),
      { key: "context", label: "Bronchodilator context", type: "choice", options: [["unknown", "Not documented"], ["pre", "Pre-BD"], ["post", "Post-BD"]], aliases: ["context", "pre/post bd", "bd"] }, notes],
      hint: "Enter available values only. Select the current and comparison tests for this encounter; other rows remain historical. Compare like-for-like methods and bronchodilator conditions." },
    walk: { title: "Six-minute walk", singular: "6MWT", fields: [date, role,
      number("distance", "Distance (m)", 0, 1500, ["6mwt distance m", "walk distance m", "6mwd m"]),
      number("rest", "Resting SpO2 (%)", 40, 100, ["rest spo2 %", "baseline spo2 %", "resting spo2"]),
      number("nadir", "Nadir SpO2 (%)", 40, 100, ["lowest spo2 %", "walk spo2 %", "nadir spo2", "minimum spo2 %"]),
      { key: "oxygen", label: "Oxygen conditions", type: "choice", options: [["unknown", "Not documented"], ["roomair", "Room air"], ["oxygen", "Supplemental oxygen"]], aliases: ["oxygen", "o2 conditions"] },
      number("flow", "Oxygen flow (L/min)", 0, 60, ["o2 l/min", "oxygen l/min", "flow l/min"]), text("device", "Oxygen device"), notes],
      hint: "Document oxygen conditions for each test. Differences in oxygen, device, protocol or effort can limit comparison. Historical measurements do not establish today's resting oxygenation." },
    echo: { title: "Echocardiography", singular: "Echo", entry: "report", primaryFields: ["date", "impression"], fields: [date, role,
      { ...text("lvef", "LVEF (%)", ["ef %", "ejection fraction %", "lvef"]), range: [0, 100] },
      { ...text("rvsp", "RVSP (mmHg)", ["rvsp mmhg"]), range: [0, 200] },
      { ...text("pasp", "PASP (mmHg)", ["pasp mmhg"]), range: [0, 200] },
      number("trv", "TR velocity (m/s)", 0, 8, ["trv m/s", "tr velocity m/s"]),
      text("rv", "RV size / function", ["rv size/function", "rv findings"]), text("impression", "Report conclusion / impression", ["impression", "conclusion", "reported impression", "report conclusion", "echo findings"]), notes],
      hint: "Enter the study date and paste the echo report's conclusion or impression. Repeat for prior studies. Measurements are optional; no measurements or diagnoses are inferred from the text." },
    ct: { title: "Chest CT / HRCT", singular: "CT", entry: "report", primaryFields: ["date", "impression"], fields: [date, role,
      { key: "modality", label: "Modality", type: "choice", options: [["unknown", "Not documented"], ["ct", "Chest CT"], ["hrct", "HRCT"], ["ctpa", "CTPA"], ["other", "Other CT"]], aliases: ["study", "exam"] },
      text("findings", "Reported findings", ["findings", "ct findings"]), text("impression", "Report conclusion / impression", ["impression", "conclusion", "reported impression", "report conclusion"]),
      text("comparison", "Reported interval comparison", ["interval comparison", "comparison", "interval change"]), notes],
      hint: "Enter the study date and paste the CT report's conclusion or impression. Repeat for prior studies. Your clinical imaging/activity assessment remains separate from the report text." },
  };
  const kinds = Object.keys(definitions);
  const combined = { fvcCombined: ["fvcL", "fvc", "FVC (L and % predicted)"], fev1Combined: ["fev1L", "fev1", "FEV1 (L and % predicted)"], tlcCombined: ["tlcL", "tlc", "TLC (L and % predicted)"], dlcoCombined: ["dlcoAbs", "dlco", "DLCO (mL/min/mmHg and % predicted)"] };
  const escape = value => String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const clean = value => String(value ?? "").replace(/\r\n?/g, "\n").trim();
  const missing = value => /^(?:|[-\u2013\u2014]|n\/?a|nd|unknown|not (?:documented|available|assessed)|unable to estimate)$/i.test(clean(value));
  const header = value => clean(value).toLowerCase().replace(/\u2081/g, "1").replace(/\u2082/g, "2").replace(/[()]/g, " ").replace(/[%]/g, " % ").replace(/[_\s]+/g, " ").trim();
  function parseDate(value) {
    const s = clean(value);
    if (missing(s)) return "";
    let date = s;
    const us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (us) date = `${us[3]}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
    if (!/^\d{4}(?:-\d{2}(?:-\d{2})?)?$/.test(date)) return null;
    const [year, month = "01", day = "01"] = date.split("-");
    if (+year < 1900 || +year > 2200) return null;
    const full = `${year}-${month}-${day}`;
    return Number.isFinite(Date.parse(full)) && new Date(full).toISOString().slice(0, 10) === full ? date : null;
  }
  function empty() { return { records: Object.fromEntries(kinds.map(k => [k, []])), selections: Object.fromEntries(kinds.map(k => [k, { current: null, comparison: null }])) }; }
  function normalize(input) {
    const out = empty();
    if (!input) return out;
    kinds.forEach(kind => {
      const ids = new Set();
      out.records[kind] = (Array.isArray(input.records?.[kind]) ? input.records[kind] : []).slice(0, 100).map((row, i) => {
        let id = clean(row.id) || `${kind}-${i}`;
        if (ids.has(id)) id = `${id}-${i}`;
        ids.add(id);
        const next = { id };
        definitions[kind].fields.filter(f => f.type !== "role").forEach(f => {
          const v = row[f.key];
          next[f.key] = f.type === "number" ? v === "" || v == null ? null : Number(v) : clean(v);
          if (f.type === "choice" && !f.options.some(([id]) => id === next[f.key])) next[f.key] = "unknown";
        });
        return next;
      });
      for (const role of ["current", "comparison"]) {
        const id = input.selections?.[kind]?.[role];
        out.selections[kind][role] = ids.has(id) ? id : null;
      }
    });
    return out;
  }
  function selected(bundle, kind, role) { return bundle?.records?.[kind]?.find(r => r.id === bundle.selections?.[kind]?.[role]); }
  function validate(bundle) {
    const errors = [];
    kinds.forEach(kind => {
      const rows = bundle.records[kind], selection = bundle.selections[kind];
      if (selection.current && selection.current === selection.comparison) errors.push({ key: "studies", text: `${definitions[kind].title}: choose different current and comparison tests.` });
      const now = selected(bundle, kind, "current"), prior = selected(bundle, kind, "comparison");
      if (now?.date && prior?.date && prior.date > now.date && !prior.date.startsWith(now.date) && !now.date.startsWith(prior.date)) errors.push({ key: "studies", text: `${definitions[kind].title}: the comparison test follows the current test.` });
      rows.forEach((row, i) => {
        definitions[kind].fields.forEach(f => {
          const value = row[f.key]; let problem = "";
          if (f.type === "date" && parseDate(value) === null) problem = "use YYYY-MM-DD, YYYY-MM, YYYY, or U.S. MM/DD/YYYY";
          if (f.type === "number" && value !== null && (!Number.isFinite(value) || value < f.min || value > f.max)) problem = `verify ${f.min}-${f.max} or leave blank`;
          if (f.range && value && !missing(value)) {
            const v = clean(value).replace(/%$/, "").replace(/[\u2013\u2014]/g, "-");
            const match = v.match(/^[<>\u2264\u2265]?\s*(\d+(?:\.\d+)?)(?:\s*-\s*(\d+(?:\.\d+)?))?$/);
            if (!match || +match[1] < f.range[0] || +match[1] > f.range[1] || match[2] && (+match[2] > f.range[1] || +match[2] < +match[1])) problem = "enter a reported number/range (for example 55-60 or <35), or place narrative in the impression";
          }
          const textLimit = f.key === "impression" ? 10000 : 3000;
          if (typeof value === "string" && value.length > textLimit) problem = `limit this field to ${textLimit.toLocaleString("en-US")} characters; no report text was truncated`;
          if (problem) errors.push({ key: "studies", text: `${definitions[kind].singular} row ${i + 1}, ${f.label}: ${problem}.` });
        });
        if (kind === "walk" && row.oxygen === "roomair" && row.flow > 0) errors.push({ key: "studies", text: `6MWT row ${i + 1}: room air conflicts with a positive supplemental oxygen flow.` });
      });
    });
    return errors;
  }
  // Only explicitly assigned tests feed existing clinical rules; historical resting SpO2 never becomes today's observation.
  function project(d) {
    if (!d.studies) return d;
    const now = selected(d.studies, "pft", "current"), prior = selected(d.studies, "pft", "comparison"), walk = selected(d.studies, "walk", "current");
    for (const key of ["fvc", "fev1", "dlco"]) { d[key] = now?.[key] ?? null; d["prior" + key[0].toUpperCase() + key.slice(1)] = prior?.[key] ?? null; }
    d.pftDate = now?.date || ""; d.priorPftDate = prior?.date || "";
    d.walkDistance = walk?.distance ?? null; d.walkSpo2 = walk?.nadir ?? null;
    return d;
  }
  function order(rows) { return [...rows].sort((a, b) => b.date.localeCompare(a.date)); }
  function roleFor(bundle, kind, row) { return bundle.selections[kind].current === row.id ? "Current" : bundle.selections[kind].comparison === row.id ? "Comparison" : "History"; }
  const value = v => v === null || v === undefined || v === "" || v === "unknown" ? "Not documented" : String(v);
  function displayField(f, v) { return f.type === "choice" ? f.options.find(([id]) => id === v)?.[1] || "Not documented" : value(v); }
  function rawTable(kind, bundle, compact = true) {
    const rows = order(bundle.records[kind]), fields = definitions[kind].fields;
    if (!compact) {
      const used = fields.filter(f => ["date", "role"].includes(f.key) || rows.some(r => r[f.key] !== null && r[f.key] !== undefined && r[f.key] !== "" && r[f.key] !== "unknown"));
      return { headers: used.map(f => f.label), rows: rows.map(r => used.map(f => f.type === "role" ? roleFor(bundle, kind, r) : displayField(f, r[f.key]))) };
    }
    const pair = (r, abs, pct, unit) => [r[abs] != null ? `${r[abs]} ${unit}` : "", r[pct] != null ? `${r[pct]}% pred` : ""].filter(Boolean).join(" / ") || "Not documented";
    const leading = r => [r.date || "Not documented", roleFor(bundle, kind, r)];
    if (kind === "pft") return { headers: ["Date", "Encounter role", "FVC", "FEV1", "FEV1/FVC", "TLC", "DLCO", "Context / notes"], rows: rows.map(r => [...leading(r), pair(r, "fvcL", "fvc", "L"), pair(r, "fev1L", "fev1", "L"), value(r.ratio), pair(r, "tlcL", "tlc", "L"), pair(r, "dlcoAbs", "dlco", "mL/min/mmHg"), [displayField(fields.find(f => f.key === "context"), r.context), r.notes].filter(Boolean).join(". ")]) };
    if (kind === "walk") return { headers: ["Date", "Encounter role", "Distance", "Rest / nadir SpO2", "Oxygen conditions", "Notes"], rows: rows.map(r => [...leading(r), r.distance != null ? `${r.distance} m` : "Not documented", r.rest == null && r.nadir == null ? "Not documented" : `${r.rest != null ? r.rest + "%" : "Not documented"} / ${r.nadir != null ? r.nadir + "%" : "Not documented"}`, [displayField(fields.find(f => f.key === "oxygen"), r.oxygen), r.flow != null ? `${r.flow} L/min` : "", r.device].filter(Boolean).join("; "), value(r.notes)]) };
    if (kind === "echo") return { headers: ["Date", "Encounter role", "LVEF", "RVSP / PASP", "RV / TR velocity", "Conclusion / impression / notes"], rows: rows.map(r => [...leading(r), r.lvef && !missing(r.lvef) ? `${r.lvef.replace(/%$/, "")}%` : "Not documented", r.rvsp || r.pasp ? [`RVSP ${value(r.rvsp)}`, `PASP ${value(r.pasp)}`].join("; ") + " mmHg" : "Not documented", [r.rv, r.trv != null ? `TRV ${r.trv} m/s` : ""].filter(Boolean).join("; ") || "Not documented", [r.impression, r.notes].filter(Boolean).join("\n") || "Not documented"]) };
    return { headers: ["Date", "Encounter role", "Modality", "Reported findings", "Conclusion / impression", "Reported interval comparison / notes"], rows: rows.map(r => [...leading(r), displayField(fields.find(f => f.key === "modality"), r.modality), value(r.findings), value(r.impression), [r.comparison, r.notes].filter(Boolean).join("\n") || "Not documented"]) };
  }
  function table(kind, bundle, compact = true) {
    const t = rawTable(kind, bundle, compact);
    const columns = t.headers.map((h, i) => i).filter(i => {
      if (!compact) return true;
      if (definitions[kind].entry === "report" && i === 1) return t.rows.some(row => row[1] !== "History");
      return i < 2 || t.rows.some(row => row[i] !== "Not documented");
    });
    return { headers: columns.map(i => t.headers[i]), rows: t.rows.map(row => columns.map(i => row[i])) };
  }
  const quote = s => /[\t\n\r"]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  function plainTable(kind, bundle) { const t = table(kind, bundle, false); return [t.headers, ...t.rows].map(row => row.map(v => quote(String(v))).join("\t")).join("\n"); }
  function htmlTable(kind, bundle) {
    const t = table(kind, bundle, false), cell = (tag, s) => `<${tag} style="border:1px solid #cbd5df;padding:7px;text-align:left;vertical-align:top;white-space:pre-wrap">${escape(s)}</${tag}>`;
    return `<table style="border-collapse:collapse;font:12px Arial,sans-serif;width:100%"><caption style="text-align:left;font-weight:bold;padding:8px 0">${escape(definitions[kind].title)}</caption><thead><tr>${t.headers.map(s => cell("th", s)).join("")}</tr></thead><tbody>${t.rows.map(row => `<tr>${row.map(s => cell("td", s)).join("")}</tr>`).join("")}</tbody></table>`;
  }
  function delimited(text, delimiter) {
    const rows = []; let row = [], cell = "", quoted = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '"' && (quoted || cell === "")) { if (quoted && text[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
      else if (!quoted && (c === delimiter || c === "\n")) { row.push(cell.trim()); cell = ""; if (c === "\n") { rows.push(row); row = []; } }
      else cell += c;
    }
    if (quoted) throw new Error("A quoted cell is unfinished. Copy the complete table and try again.");
    row.push(cell.trim()); rows.push(row);
    return rows.filter(r => r.some(v => v !== ""));
  }
  function parseGrid(source) {
    if (source.length > 100000) throw new Error("Paste a single table of up to 100,000 characters.");
    const s = String(source).replace(/\r\n?/g, "\n").replace(/^(?:[ \t]*\n)+|(?:\n[ \t]*)+$/g, ""); if (!s.trim()) throw new Error("Paste a previous table first.");
    let rows;
    if (s.includes("\t")) rows = delimited(s, "\t");
    else if (s.split("\n").some(line => /^\s*\|?.*\|.*\|/.test(line))) rows = s.split("\n").filter(Boolean).map(line => line.replace(/^\s*\||\|\s*$/g, "").split("|").map(clean)).filter(r => !r.every(v => /^:?-{3,}:?$/.test(v)));
    else if (s.includes(",")) rows = delimited(s, ",");
    else rows = s.split("\n").filter(Boolean).map(line => line.trim().split(/ {2,}/));
    if (rows.length > 101 || rows.some(r => r.length > 40)) throw new Error("Import at most 100 results and 40 columns at a time.");
    if (rows[0].length < 2) throw new Error("Use a copied table (tabs, CSV or Markdown), not a free-text report. Add a report manually if needed.");
    return rows;
  }
  function transpose(grid) {
    if (grid[0].length < 2 || !grid[0].slice(1).every(v => parseDate(v))) return grid;
    return [["Date", ...grid.slice(1).map(r => r[0])], ...grid[0].slice(1).map((d, i) => [d, ...grid.slice(1).map(r => r[i + 1] || "")])];
  }
  function mapping(kind, headers) {
    return headers.map(h => {
      const key = header(h), f = definitions[kind].fields.find(f => [f.label, ...f.aliases || []].some(a => header(a) === key));
      if (f) return f.key;
      if (kind === "pft") {
        const match = Object.entries(combined).find(([, [, pct]]) => {
          const name = pct.toLowerCase(), unit = name === "dlco" ? "ml/min/mmhg" : "l";
          return [`${name} ${unit} / % predicted`, `${name} ${unit}, % predicted`, `${name} ${unit} and % predicted`].includes(key);
        });
        if (match) return match[0];
      }
      if (kind === "walk" && /^(?:distance|walk distance|6mwt distance|6mwd) (?:ft|feet)$/.test(key)) return "distanceFt";
      if (kind === "pft" && /^(?:fev1\/fvc|fev1 fvc) %$/.test(key)) return "ratioPct";
      return "";
    });
  }
  function importRows(kind, grid, map, hasHeaders = true) {
    const records = [], errors = [], notices = [];
    const used = map.filter(Boolean), canonical = k => k === "distanceFt" ? "distance" : k === "ratioPct" ? "ratio" : k;
    const destinations = used.flatMap(k => combined[k] ? combined[k].slice(0, 2) : canonical(k));
    if (new Set(destinations).size !== destinations.length) errors.push("Map each destination field only once.");
    if (!used.some(k => !["date", "role"].includes(k))) errors.push("Map at least one measurement or report field; ambiguous units are not assumed.");
    const source = hasHeaders ? grid.slice(1) : grid;
    if (!source.length) errors.push("No result rows were found below the headings.");
    source.forEach((cells, i) => {
      const row = { id: "import-" + i, date: "", role: "history" };
      if (cells.length !== grid[0].length) errors.push(`Row ${i + 1}: the column count differs from the headings. Check delimiters and quoted report text.`);
      map.forEach((key, j) => {
        if (!key) return;
        if (kind === "pft" && combined[key]) {
          const [abs, pct, label] = combined[key], raw = clean(cells[j]);
          if (missing(raw)) { row[abs] = null; row[pct] = null; return; }
          const match = raw.match(/^(\d+(?:\.\d+)?)\s*(?:L|mL\/min\/mmHg)?\s*(?:\(\s*|\/\s*)(\d+(?:\.\d+)?)\s*%\s*(?:pred(?:icted)?)?\s*\)?$/i);
          const wrongUnit = pct === "dlco" ? /\d\s*L\b/i.test(raw) : /mL\/min\/mmHg/i.test(raw);
          if (!match || wrongUnit) errors.push(`Row ${i + 1}, ${label}: use an absolute value followed by percent predicted, for example 3.1 (78%). Split other formats into separate columns; values were not guessed.`);
          else { row[abs] = Number(match[1]); row[pct] = Number(match[2]); }
          return;
        }
        const raw = clean(cells[j]), dest = canonical(key), f = definitions[kind].fields.find(f => f.key === dest);
        if (!f) { errors.push("Unknown destination column."); return; }
        if (missing(raw)) { row[dest] = f.type === "number" ? null : f.type === "choice" ? "unknown" : ""; return; }
        if (f.type === "date") {
          row.date = parseDate(raw);
          if (row.date === null) errors.push(`Row ${i + 1}, date: use YYYY-MM-DD, YYYY-MM, YYYY, or U.S. MM/DD/YYYY. No date was guessed.`);
        } else if (f.type === "number") {
          const unit = key === "distanceFt" ? /\s*(?:ft|feet)$/i : key === "ratioPct" || ["rest", "nadir", "fvc", "fev1", "tlc", "dlco"].includes(dest) ? /\s*%\s*(?:pred(?:icted)?)?$/i : dest.endsWith("L") ? /\s*L$/i : dest === "distance" ? /\s*m$/i : dest === "flow" ? /\s*L\/min$/i : dest === "trv" ? /\s*m\/s$/i : dest === "dlcoAbs" ? /\s*mL\/min\/mmHg$/i : /$^/;
          const stripped = raw.replace(unit, "").trim();
          const n = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(stripped) ? Number(stripped) : NaN;
          row[dest] = key === "distanceFt" ? Number((n * .3048).toFixed(2)) : key === "ratioPct" ? n / 100 : n;
          if (key === "distanceFt") notices.push("Distances explicitly mapped as feet were converted to meters (1 ft = 0.3048 m).");
          if (key === "ratioPct") notices.push("FEV1/FVC explicitly mapped as percent was converted to a ratio.");
        } else if (f.type === "role") {
          const v = raw.toLowerCase(); row.role = ["current", "comparison", "history", "historical"].includes(v) ? v === "historical" ? "history" : v : "history";
          if (row.role === "history" && !["history", "historical"].includes(v)) notices.push("Unrecognized encounter roles were left as history; choose roles after import.");
        } else if (f.type === "choice") {
          const options = f.options.find(([id, label]) => header(raw) === header(id) || header(raw) === header(label));
          const aliases = { "room air": "roomair", ra: "roomair", "pre bronchodilator": "pre", "post bronchodilator": "post", "pre-bd": "pre", "post-bd": "post", ct: "ct" };
          row[dest] = options?.[0] || aliases[raw.toLowerCase()] || "unknown";
          if (row[dest] === "unknown" && raw.toLowerCase() !== "unknown") errors.push(`Row ${i + 1}, ${f.label}: select a recognized value or map this column to Notes instead.`);
        } else row[dest] = raw;
      });
      if (definitions[kind].fields.every(f => ["date", "role"].includes(f.key) || row[f.key] == null || row[f.key] === "" || row[f.key] === "unknown")) errors.push(`Row ${i + 1}: no measurement or report content was recognized.`);
      records.push(row);
    });
    const bundle = empty(); bundle.records[kind] = records;
    errors.push(...validate(normalize(bundle)).map(e => e.text));
    if (map.some(k => !k)) notices.push("Unmapped columns will not be imported. Review their content before applying.");
    if (!map.includes("date")) notices.push("No date column is mapped. These results will be undated.");
    return { records, errors: [...new Set(errors)], notices: [...new Set(notices)] };
  }
  const signature = (kind, row) => JSON.stringify(definitions[kind].fields.filter(f => f.type !== "role").map(f => row[f.key] ?? (f.type === "number" ? null : f.type === "choice" ? "unknown" : "")));
  function merge(bundle, kind, incoming, replace = false) {
    const next = normalize(bundle), rows = replace ? [] : next.records[kind];
    if (replace) next.selections[kind] = { current: null, comparison: null };
    const seen = new Map(rows.map(r => [signature(kind, r), r.id]));
    let added = 0, duplicates = 0;
    incoming.forEach(row => {
      const sig = signature(kind, row); let id = seen.get(sig);
      if (id) duplicates++;
      else { id = `${kind}-${Date.now()}-${added}`; while (rows.some(r => r.id === id)) id += "x"; rows.push({ ...row, id }); seen.set(sig, id); added++; }
      // Existing encounter selections win. Imported roles are visible in review and fill only vacant slots.
      if (["current", "comparison"].includes(row.role) && !next.selections[kind][row.role] && !Object.values(next.selections[kind]).includes(id)) next.selections[kind][row.role] = id;
    });
    if (rows.length > 100) throw new Error("Keep at most 100 results per investigation. Nothing was applied.");
    next.records[kind] = rows;
    return { bundle: normalize(next), added, duplicates };
  }
  return { definitions, kinds, combined, empty, normalize, validate, selected, project, order, roleFor, table, plainTable, htmlTable, escape, parseDate, parseGrid, transpose, mapping, importRows, merge };
});
