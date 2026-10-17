const test = require("node:test");
const assert = require("node:assert/strict");
const I = require("./investigations.js");
const L = require("./logic.js");
const N = require("./notes.js");
const W = require("./workflow.js");
const fixtures = {
  pft: [{ id: "a", date: "2026-10-16", fvcL: 3.1, fvc: 78, fev1L: 2.4, fev1: 76, ratio: .77, tlcL: 4.8, tlc: 80, dlcoAbs: 15.3, dlco: 64, context: "pre", notes: "Hemoglobin corrected" }, { id: "b", date: "2025-10", fvc: 80, dlco: 70, context: "pre" }],
  walk: [{ id: "a", date: "2026-10-16", distance: 350, rest: 94, nadir: 88, oxygen: "oxygen", flow: 2, device: "Continuous-flow nasal cannula", notes: "Stopped once" }, { id: "b", date: "2025", distance: 0, rest: 93, nadir: null, oxygen: "unknown", flow: null }],
  echo: [{ id: "a", date: "2026-10", lvef: "55-60", rvsp: "<35", pasp: "", trv: 2.3, rv: "Normal reported size", impression: 'No change.\nTrace TR, "unable to estimate PASP"', notes: "As reported" }, { id: "b", date: "2025", lvef: "60", impression: "Technically limited" }],
  ct: [{ id: "a", date: "2026-10-16", modality: "hrct", findings: "Fibrosis, traction bronchiectasis", impression: 'Stable compared with prior.\nNo "new" nodules.', comparison: "Compared with 2025-10", notes: "Report summary only" }, { id: "b", date: "2025-10", modality: "ct", findings: "Reticulation" }],
};
function bundle(kind, rows = fixtures[kind]) {
  const b = I.empty(); b.records[kind] = rows; b.selections[kind] = { current: rows[0]?.id || null, comparison: rows[1]?.id || null }; return I.normalize(b);
}
function imported(kind, text) { const g = I.transpose(I.parseGrid(text)); return I.importRows(kind, g, I.mapping(kind, g[0])); }

for (const kind of I.kinds) {
  test(`${kind}: copied tables round-trip dates, units, ranges, qualifiers, zeros and multiline reports`, () => {
    const b = bundle(kind), result = imported(kind, I.plainTable(kind, b));
    assert.deepEqual(result.errors, []);
    const next = I.merge(I.empty(), kind, result.records).bundle;
    assert.equal(I.plainTable(kind, next), I.plainTable(kind, b));
    assert.match(I.htmlTable(kind, b), /<table/);
    assert.equal(I.table(kind, b).rows.length, 2);
    assert.deepEqual(I.validate(b), []);
  });
}
for (const kind of ["echo", "ct"]) {
  test(`${kind}: date and pasted conclusion alone produce a valid report and concise table`, () => {
    const report = "1. Findings are unchanged.\n2. Clinical correlation is recommended.\n   No additional measurement was reported.";
    const b = I.empty(); b.records[kind] = [{ id: "report", date: "2026-10-16", impression: report }];
    const r = L.buildRecommendation({ studies: b });
    assert.equal(r.invalid, false); assert.equal(r.data.studies.records[kind][0].impression, report);
    assert.equal(I.table(kind, r.data.studies).headers.length, 2);
    assert.deepEqual(I.table(kind, r.data.studies).rows[0], ["2026-10-16", report]);
    assert.ok(N.buildNoteText(r).includes(report)); assert.equal(r.data.phConcern, null); assert.equal(r.data.activity, "unknown");
    if (kind === "echo") { assert.equal(r.data.studies.records.echo[0].lvef, ""); assert.equal(r.data.studies.records.echo[0].trv, null); }
    assert.equal(I.definitions[kind].entry, "report"); assert.deepEqual(I.definitions[kind].primaryFields, ["date", "impression"]);
  });
  test(`${kind}: previous impression column headings still import after the label change`, () => {
    const r = imported(kind, "Date\tReported impression\n2026-10-16\tStable findings"); assert.deepEqual(r.errors, []); assert.equal(r.records[0].impression, "Stable findings");
  });
}
test("long report conclusions remain intact and excessive length is flagged instead of truncated", () => {
  const b = I.empty(); b.records.echo = [{ id: "long", date: "2026", impression: "A".repeat(5000) }];
  assert.deepEqual(I.validate(I.normalize(b)), []); assert.equal(I.normalize(b).records.echo[0].impression.length, 5000);
  b.records.echo[0].impression = "A".repeat(10001); const normalized = I.normalize(b); assert.equal(normalized.records.echo[0].impression.length, 10001); assert.match(I.validate(normalized).map(e => e.text).join(), /10,000.*no report text was truncated/);
});
test("blank numbers remain unknown, including missing walk distance and saturation", () => {
  const r = imported("walk", "Date\tDistance (m)\tNadir SpO2 (%)\tResting SpO2 (%)\n2026-01-01\t\tNot documented\t94\n2025\t0\t90\t93");
  assert.deepEqual(r.errors, []); assert.equal(r.records[0].distance, null); assert.equal(r.records[0].nadir, null); assert.equal(r.records[1].distance, 0);
});
test("dates preserve source precision and reject impossible dates without guessing days", () => {
  for (const [s, expected] of [["2026", "2026"], ["2026-10", "2026-10"], ["10/6/2026", "2026-10-06"], ["2024-02-29", "2024-02-29"], ["", ""], ["Not documented", ""]]) assert.equal(I.parseDate(s), expected);
  for (const s of ["2026-02-29", "2026-13", "2026-04-31", "16/10/2026", "10/16/26", "yesterday"]) assert.equal(I.parseDate(s), null);
});
test("Markdown, quoted CSV, tabs and aligned text are supported without executing content", () => {
  const samples = ["| Date | FVC (% predicted) |\n|---|---|\n|2026-10|80|", 'Date,"FVC (% predicted)"\n2026-10,80', "Date\tFVC (% predicted)\n2026-10\t80", "Date  FVC (% predicted)\n2026-10  80"];
  for (const s of samples) { const r = imported("pft", s); assert.deepEqual(r.errors, []); assert.equal(r.records[0].fvc, 80); }
  assert.throws(() => I.parseGrid('Date,"unfinished'), /unfinished/);
});
test("transposed dated tables import as serial tests rather than assumed row positions", () => {
  const r = imported("pft", "Test\t2025-01\t2026-01\nFVC (% predicted)\t80\t75\nDLCO (% predicted)\t70\t65");
  assert.deepEqual(r.errors, []); assert.equal(r.records[0].date, "2025-01"); assert.equal(r.records[1].dlco, 65);
});
test("ambiguous or absent units require mapping, not inferred conversions", () => {
  assert.deepEqual(I.mapping("pft", ["Date", "FVC", "DLCO"]), ["date", "", ""]);
  assert.deepEqual(I.mapping("walk", ["Date", "Distance"]), ["date", ""]);
  const r = imported("walk", "Date\tDistance\n2026\t300"); assert.ok(r.errors.length); assert.ok(r.notices.some(s => /Unmapped/.test(s)));
  const mapped = I.importRows("walk", [["Date", "Distance"], ["2026", "300"]], ["date", "distance"]); assert.deepEqual(mapped.errors, []); assert.equal(mapped.records[0].distance, 300);
});
test("feet and ratio percent conversions require explicit source labels or mapping", () => {
  const walk = imported("walk", "Date\tDistance (ft)\n2026\t1000 ft"); assert.deepEqual(walk.errors, []); assert.equal(walk.records[0].distance, 304.8); assert.match(walk.notices.join(), /converted/);
  const pft = imported("pft", "Date\tFEV1/FVC (%)\n2026\t77%"); assert.deepEqual(pft.errors, []); assert.equal(pft.records[0].ratio, .77);
  for (const s of ["Date\tDistance (m)\n2026\t1000 ft", "Date\tDistance (m)\n2026\t300 yards"]) assert.ok(imported("walk", s).errors.length);
  assert.ok(imported("pft", "Date\tFVC (% predicted)\n2026\t3 L").errors.length);
});
test("implausible values, duplicate mappings, malformed rows and room-air conflicts cannot be applied", () => {
  for (const s of ["Date\tDistance (m)\n2026\t-1", "Date\tNadir SpO2 (%)\n2026\t105", "Date\tDistance (m)\n2026\t200\textra", "Date\tOxygen conditions\tOxygen flow (L/min)\n2026\tRoom air\t2"]) assert.ok(imported("walk", s).errors.length);
  const r = I.importRows("pft", [["Date", "FVC %", "FVC %"], ["2026", "70", "80"]], ["date", "fvc", "fvc"]); assert.match(r.errors.join(), /only once/);
});
test("headerless tables need deliberate column mapping", () => {
  const r = I.importRows("walk", [["2026", "300"], ["2025", "280"]], ["date", "distance"], false); assert.deepEqual(r.errors, []); assert.equal(r.records.length, 2);
});
for (const [key, [abs, pct]] of Object.entries(I.combined)) {
  test(`${pct}: explicitly mapped combined absolute/percent cells do not need re-entry`, () => {
    const r = I.importRows("pft", [["Date", pct], ["2026", "3.1 (78%)"], ["2025", pct === "dlco" ? "3.2 mL/min/mmHg / 80% pred" : "3.2 L / 80% pred"]], ["date", key]);
    assert.deepEqual(r.errors, []); assert.equal(r.records[0][abs], 3.1); assert.equal(r.records[0][pct], 78); assert.equal(r.records[1][pct], 80);
  });
}
test("combined mapping rejects ambiguous order, incompatible units and overlapping destinations", () => {
  for (const v of ["78% (3.1 L)", "3.1 / 78", "3.1 mL/min/mmHg / 78% pred"]) assert.ok(I.importRows("pft", [["Date", "FVC"], ["2026", v]], ["date", "fvcCombined"]).errors.length);
  assert.ok(I.importRows("pft", [["Date", "FVC", "FVC %"], ["2026", "3.1 (78%)", "80"]], ["date", "fvcCombined", "fvc"]).errors.some(t => /only once/.test(t)));
});
test("trailing empty cells are preserved and remain unknown", () => {
  const r = imported("walk", "Date\tDistance (m)\tNadir SpO2 (%)\n2026\t300\t"); assert.deepEqual(r.errors, []); assert.equal(r.records[0].nadir, null);
});
test("merge adds, deduplicates exact content, preserves same-date conflicts and never mutates source", () => {
  const b = bundle("pft"), before = JSON.stringify(b), r = imported("pft", I.plainTable("pft", b));
  const repeated = I.merge(b, "pft", r.records); assert.equal(repeated.added, 0); assert.equal(repeated.duplicates, 2); assert.equal(JSON.stringify(b), before);
  const changed = I.merge(b, "pft", [{ ...fixtures.pft[0], fvc: 60 }]); assert.equal(changed.added, 1); assert.equal(changed.bundle.records.pft.length, 3); assert.equal(changed.bundle.selections.pft.current, "a");
  const replaced = I.merge(b, "pft", [{ ...fixtures.pft[0], role: "history" }], true); assert.equal(replaced.bundle.records.pft.length, 1); assert.equal(replaced.bundle.selections.pft.current, null);
});
test("import review and validation do not mutate an existing encounter", () => {
  const b = bundle("walk"), before = JSON.stringify(b); imported("walk", "Date\tDistance (m)\n2026\twrong"); I.validate(b); I.table("walk", b); assert.equal(JSON.stringify(b), before);
});
test("no automatically assigned current test; only selected tests project into clinical findings", () => {
  const b = I.empty(); b.records.pft = fixtures.pft; b.records.walk = fixtures.walk;
  const d = L.normalize({ studies: b }); assert.equal(d.fvc, null); assert.equal(d.walkSpo2, null);
  b.selections.pft = { current: "a", comparison: "b" }; b.selections.walk.current = "a";
  const r = L.buildRecommendation({ studies: b }); assert.equal(r.data.fvc, 78); assert.equal(r.data.priorFvc, 80); assert.equal(r.data.walkDistance, 350); assert.equal(r.data.walkSpo2, 88); assert.equal(r.emergency, false);
});
test("historical resting hypoxemia never becomes today's urgent observation", () => {
  const b = bundle("walk", [{ ...fixtures.walk[0], rest: 70, nadir: 65 }]);
  const r = L.buildRecommendation({ studies: b }); assert.equal(r.data.spo2, null); assert.equal(r.emergency, false); assert.equal(r.findings.advanced, true);
  assert.equal(L.buildRecommendation({ studies: b, spo2: 70 }).emergency, true);
});
test("removing or unassigning a current result clears projection without substituting another date", () => {
  const b = bundle("pft"); assert.equal(L.normalize({ studies: b }).fvc, 78);
  b.records.pft = b.records.pft.filter(r => r.id !== "a"); assert.equal(L.normalize({ studies: b, fvc: 78 }).fvc, null);
  b.selections.pft.comparison = null; assert.equal(L.normalize({ studies: b }).priorFvc, null);
});
test("comparison dates and roles must be coherent while partial dates stay imprecise", () => {
  const b = bundle("pft"); b.selections.pft.comparison = "a"; assert.ok(I.validate(b).length);
  b.selections.pft = { current: "b", comparison: "a" }; assert.match(I.validate(b).map(e => e.text).join(), /follows/);
  b.records.pft[0].date = "2025"; assert.deepEqual(I.validate(b), []);
});
test("different bronchodilator contexts do not produce a misleading PFT change", () => {
  const b = bundle("pft"); b.records.pft[0].context = "post";
  const r = L.buildRecommendation({ studies: b }); assert.deepEqual(r.findings.changes, []); assert.match(r.warnings.map(w => w.text).join(), /conditions differ/);
});
test("echo and CT narratives remain reported findings, not inferred clinical diagnoses or prescriptions", () => {
  for (const kind of ["echo", "ct"]) {
    const b = bundle(kind); b.records[kind][0].impression = "Severe pulmonary hypertension; active sarcoidosis suspected";
    const r = L.buildRecommendation({ studies: b }); assert.equal(r.data.phConcern, null); assert.equal(r.data.activity, "unknown"); assert.equal(r.emergency, false); assert.equal(r.findings.advanced, false); assert.equal(r.activeDrug, null);
    assert.match(N.buildNoteText(r), /Severe pulmonary hypertension/);
  }
});
test("reported echo ranges and qualifiers are retained, not replaced by calculated midpoints", () => {
  const r = imported("echo", "Date\tLVEF (%)\tRVSP (mmHg)\n2026\t55-60\t<35"); assert.deepEqual(r.errors, []); assert.equal(r.records[0].lvef, "55-60"); assert.equal(r.records[0].rvsp, "<35");
  assert.ok(imported("echo", "Date\tLVEF (%)\n2026\t60-55").errors.length);
  assert.ok(imported("echo", "Date\tLVEF (%)\n2026\t150").errors.length);
});
test("clinical note includes every table, date and role without duplicating scalar data", () => {
  const b = I.empty(); I.kinds.forEach(k => { b.records[k] = fixtures[k]; b.selections[k] = { current: "a", comparison: "b" }; });
  const r = L.buildRecommendation({ studies: b }), note = N.buildNoteText(r), html = N.buildNoteHtml(r);
  assert.equal(r.invalid, false); I.kinds.forEach(k => assert.ok(note.includes(I.noteTableText(k, r.data.studies))));
  I.kinds.forEach(k => assert.ok(N.buildNoteText(r, { tables: "tsv" }).includes(I.plainTable(k, r.data.studies))));
  assert.equal((html.match(/<table /g) || []).length, 4); assert.doesNotMatch(note, /Current FVC:|6MWT distance:/); assert.match(note, /FVC change: -2 percentage points/);
  for (const action of r.actions) assert.ok(note.includes(action.text));
  assert.equal((note.match(/Interval history: \*\*\*/g) || []).length, 1);
});
test("FEV1/FVC automatically uses matching absolute volumes, not percent-predicted inputs", () => {
  const b = bundle("pft", [{ id: "a", date: "2026-10-16", fvcL: 3.2, fev1L: 2.4, fvc: 80, fev1: 76 }]);
  assert.ok(Math.abs(b.records.pft[0].ratio - .75) < Number.EPSILON); assert.equal(b.records.pft[0].ratioSource, "calculated");
  const onlyPercent = bundle("pft", [{ id: "a", fvc: 80, fev1: 76 }]); assert.equal(onlyPercent.records.pft[0].ratio, null);
  const note = N.buildNoteText(L.buildRecommendation({ studies: b })); assert.match(note, /FEV1\/FVC: 0.75 \(calculated\)/);
});
test("calculated ratios follow volume changes and clear when a prerequisite is removed", () => {
  const b = bundle("pft", [{ id: "a", fvcL: 3.2, fev1L: 2.4 }]); b.records.pft[0].fev1L = 1.6;
  assert.equal(I.normalize(b).records.pft[0].ratio, .5);
  b.records.pft[0].fvcL = null; assert.equal(I.normalize(b).records.pft[0].ratio, null);
});
test("reported ratios and explicit empty reported entries are never overwritten by calculation", () => {
  const b = bundle("pft", [{ id: "a", fvcL: 3.2, fev1L: 2.4, ratio: .76 }, { id: "b", fvcL: 3.2, fev1L: 2.4, ratio: null, ratioSource: "reported" }]);
  assert.equal(b.records.pft[0].ratio, .76); assert.equal(b.records.pft[0].ratioSource, "reported"); assert.equal(b.records.pft[1].ratio, null);
  b.records.pft[0].fev1L = 1.6; assert.equal(I.normalize(b).records.pft[0].ratio, .76);
});
test("invalid volumes never supply a ratio or a falsely valid clinical note", () => {
  for (const values of [{ fvcL: 0, fev1L: 2 }, { fvcL: -3, fev1L: 2 }, { fvcL: 3, fev1L: 4 }, { fvcL: 3, fev1L: NaN }, { fvcL: 90, fev1L: 80 }]) {
    assert.equal(I.calculatedRatio(values), null); const r = L.buildRecommendation({ studies: bundle("pft", [{ id: "a", ...values }]) }); assert.equal(r.invalid, true); assert.equal(N.buildNoteText(r), "");
  }
  assert.equal(I.calculatedRatio({ fvcL: 3, fev1L: 3 }), 1);
});
test("automatic ratio provenance survives copy/import and exact-result deduplication", () => {
  const b = bundle("pft", [{ id: "a", date: "2026", fvcL: 3.1, fev1L: 2.5 }]);
  const r = imported("pft", I.plainTable("pft", b)); assert.deepEqual(r.errors, []); assert.equal(r.records[0].ratioSource, "calculated"); assert.equal(r.records[0].ratio, 2.5 / 3.1);
  const merged = I.merge(b, "pft", r.records); assert.equal(merged.added, 0); assert.equal(merged.duplicates, 1);
  const fromVolumes = imported("pft", "Date\tFVC (L)\tFEV1 (L)\n2026\t3.1\t2.5"); assert.deepEqual(fromVolumes.errors, []); assert.equal(fromVolumes.records[0].ratioSource, "calculated"); assert.equal(I.merge(b, "pft", fromVolumes.records).added, 0);
});
test("importing a historical calculated ratio without source volumes preserves it as reported data", () => {
  const r = imported("pft", "Date\tFEV1/FVC (ratio)\tFEV1/FVC source\n2025\t0.75\tCalculated from volumes");
  assert.deepEqual(r.errors, []); assert.equal(r.records[0].ratio, .75); assert.equal(r.records[0].ratioSource, "reported"); assert.match(r.notices.join(), /retained as reported/);
});
test("formatted notes contain real bordered tables while text fallback needs no tabs or fixed-width font", () => {
  const r = L.buildRecommendation({ studies: bundle("pft") }), html = N.buildNoteHtml(r), plain = N.buildNoteText(r);
  assert.match(html, /<table[^>]*border="1"/); assert.match(html, /<thead><tr><th scope="col"/); assert.match(html, /<tbody><tr><td/); assert.doesNotMatch(html, /<ul|<li/);
  assert.doesNotMatch(plain, /\t/); assert.match(plain, /2026-10-16 \| Encounter role: Current \| FVC: 3.1 L \/ 78% pred/);
  assert.ok(html.includes("3.1 L / 78% pred")); assert.ok(plain.includes("3.1 L / 78% pred"));
});
test("HTML output escapes report text instead of executing it", () => {
  const b = bundle("ct", [{ id: "a", date: "2026", findings: '<img src=x onerror="alert(1)"> & <script>bad()</script>' }]);
  const html = N.buildNoteHtml(L.buildRecommendation({ studies: b })); assert.doesNotMatch(html, /<img|<script/); assert.match(html, /&lt;img/); assert.match(html, /&lt;script/);
});
test("literal dollar replacement markers in reports do not alter HTML note assembly", () => {
  const b = bundle("ct", [{ id: "a", date: "2026", findings: "Literal $& and $' and $` remain report text" }]);
  const html = N.buildNoteHtml(L.buildRecommendation({ studies: b })); assert.match(html, /Literal \$&amp; and \$&#39; and \$` remain report text/); assert.equal((html.match(/<table /g) || []).length, 1);
});
test("invalid histories prevent clinical-note copying rather than disappearing", () => {
  const b = bundle("pft"); b.records.pft[1].fvc = 500;
  const r = L.buildRecommendation({ studies: b }); assert.equal(r.invalid, true); assert.equal(N.buildNoteText(r), ""); assert.equal(N.buildNoteHtml(r), "");
});
test("editing visibility preserves useful histories and known urgent findings", () => {
  const d = L.normalize({ studies: bundle("pft"), includePft: false, includeWalk: true, includeEcho: true, includeCt: true, urgentVisual: true }), r = L.buildRecommendation(d), stages = W.steps(d, r);
  assert.equal(d.fvc, 78); assert.equal(r.emergency, true); assert.ok(!stages.some(s => s.id === "pft"));
  assert.equal(stages.length, 5); assert.ok(stages.find(s => s.id === "interval").sections.some(s => s.optional && s.studies));
  assert.match(N.buildNoteText(r), /Pulmonary function history/);
});
test("oversized or non-tabular pastes are rejected", () => {
  assert.throws(() => I.parseGrid("a".repeat(100001)), /100,000/);
  assert.throws(() => I.parseGrid("Clinical report without a table"), /copied table/);
  assert.throws(() => I.parseGrid("Date\tDistance (m)\n" + "2026\t300\n".repeat(101)), /100 results/);
});
