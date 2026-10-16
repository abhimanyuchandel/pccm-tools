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
  assert.equal(r.invalid, false); I.kinds.forEach(k => assert.ok(note.includes(I.plainTable(k, r.data.studies))));
  assert.equal((html.match(/<table /g) || []).length, 4); assert.doesNotMatch(note, /Current FVC:|6MWT distance:/); assert.match(note, /FVC change: -2 percentage points/);
  for (const action of r.actions) assert.ok(note.includes(action.text));
  assert.equal((note.match(/Interval history: \*\*\*/g) || []).length, 1);
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
  for (const id of ["walk", "echo", "ct"]) assert.ok(stages.some(s => s.id === id && s.study === id));
  assert.match(N.buildNoteText(r), /Pulmonary function history/);
});
test("oversized or non-tabular pastes are rejected", () => {
  assert.throws(() => I.parseGrid("a".repeat(100001)), /100,000/);
  assert.throws(() => I.parseGrid("Clinical report without a table"), /copied table/);
  assert.throws(() => I.parseGrid("Date\tDistance (m)\n" + "2026\t300\n".repeat(101)), /100 results/);
});
