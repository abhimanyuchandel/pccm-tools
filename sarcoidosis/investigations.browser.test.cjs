// Synthetic investigation histories only. Nothing is sent to a clinical service.
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const base = process.env.SARCOIDOSIS_TEST_URL || "http://127.0.0.1:8766/sarcoidosis/";
async function main() {
  const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || "chrome" });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 1000 }, permissions: ["clipboard-read", "clipboard-write"] });
    const page = await context.newPage(), errors = [], posts = [], external = [];
    page.on("pageerror", e => errors.push(e.message)); page.on("request", r => { if (r.method() !== "GET") posts.push(r.url()); if (!r.url().startsWith(new URL(base).origin)) external.push(r.url()); });
    await page.goto(base); await page.waitForSelector("#step-title:not(:empty)");
    async function go(id) {
      await page.getByRole("button", { name: "Course", exact: true }).click();
      for (let i = 0; i < 90; i++) { if (await page.locator("#encounter").getAttribute("data-step") === id) return; if (!await page.locator("#next-btn").isVisible()) break; await page.locator("#next-btn").click(); }
      throw new Error("Could not reach " + id);
    }
    const button = name => page.getByRole("button", { name, exact: true });
    async function setStudy(kind, values) {
      const report = ["echo", "ct"].includes(kind);
      await button({ pft: "Add PFT", walk: "Add 6MWT", echo: "Add echo report", ct: "Add CT report" }[kind]).click();
      if (report && Object.keys(values).some(k => !["date", "impression"].includes(k))) await page.locator(".study-optional > summary").click();
      for (const [key, value] of Object.entries(values)) {
        const input = page.locator(`#study-edit-${kind}-${key}`);
        if (await input.evaluate(n => n.tagName) === "SELECT") await input.selectOption(value);
        else await input.fill(String(value));
      }
      await button(report ? "Save report" : "Save result").click(); assert.equal(await page.locator(".study-editor").count(), 0);
    }
    async function importText(kind, text) {
      await button("Paste previous table").click(); await page.locator("#study-paste-" + kind).fill(text); await button("Review pasted table").click();
    }
    async function generate() {
      await page.locator("#review-btn").click(); const b = page.locator("#generate-btn"); await b.scrollIntoViewIfNeeded(); await b.focus();
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))); const y = await page.evaluate(() => scrollY); await page.keyboard.press("Enter");
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))); assert.ok(Math.abs(await page.evaluate(() => scrollY) - y) <= 1); assert.ok(await b.evaluate(n => n.classList.contains("success")));
    }
    const note = () => page.locator("#note-output").inputValue();
    const bounds = async () => { for (const width of [320, 390, 768, 1280]) { await page.setViewportSize({ width, height: 1000 }); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "Overflow at " + width); } };
    await go("available-data");
    for (const key of ["includePft", "includeWalk", "includeEcho", "includeCt"]) await page.locator("#field-" + key).check();
    await go("pft");
    await setStudy("pft", { date: "2025-10", fvcL: 3.2, fvc: 80, fev1L: 2.6, fev1: 78, dlco: 70, context: "pre", role: "comparison" });
    await setStudy("pft", { date: "2026-10-16", fvcL: 3.1, fvc: 78, fev1L: 2.5, fev1: 76, dlco: 64, context: "pre", role: "current" });
    assert.match(await page.locator(".study-table").textContent(), /3.1 L \/ 78% pred/);
    await bounds(); await page.locator("#encounter").screenshot({ path: "/tmp/sarcoidosis-pft-tables-desktop.png" });
    await page.setViewportSize({ width: 390, height: 900 }); await page.locator("#encounter").screenshot({ path: "/tmp/sarcoidosis-pft-tables-mobile.png" });
    await button("Copy table").click();
    await page.waitForFunction(() => document.querySelector(".study-copy-status").textContent.includes("Table copied"));
    const pftText = await page.evaluate(() => navigator.clipboard.readText()); assert.match(pftText, /FVC \(L\)/); assert.match(pftText, /Comparison/);
    const clipHtml = await page.evaluate(async () => { const items = await navigator.clipboard.read(); return await (await items[0].getType("text/html")).text(); }); assert.match(clipHtml, /<table/);
    await importText("pft", pftText); await bounds(); await button("Apply reviewed results").click(); assert.match(await page.locator(".study-copy-status").textContent(), /0 results added; 2 exact duplicates skipped/);
    await go("walk");
    await importText("walk", "Date\tDistance (ft)\tResting SpO2 (%)\tNadir SpO2 (%)\tOxygen conditions\tOxygen flow (L/min)\n2025-10\t1000\t94\t89\tSupplemental oxygen\t2\n2026-10-16\t1100\t93\t88\tSupplemental oxygen\t2");
    assert.match(await page.locator(".study-import").textContent(), /converted to meters/); await button("Apply reviewed results").click();
    assert.equal(await page.locator("#urgent-alert").isVisible(), false);
    await page.locator(".study-row-controls > summary").click();
    await page.getByRole("combobox", { name: "6MWT 2026-10-16 encounter role", exact: true }).focus();
    await page.getByRole("combobox", { name: "6MWT 2026-10-16 encounter role", exact: true }).selectOption("current");
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute("aria-label")), "6MWT 2026-10-16 encounter role");
    await page.getByRole("combobox", { name: "6MWT 2025-10 encounter role", exact: true }).selectOption("comparison");
    await go("echo");
    await button("Add echo report").click();
    assert.equal(await page.locator(".study-optional").evaluate(n => n.open), false);
    assert.equal(await page.locator("#study-edit-echo-lvef").isVisible(), false);
    assert.equal(await page.locator("#study-edit-echo-impression").getAttribute("maxlength"), null);
    await page.locator("#study-edit-echo-date").fill("09/01/2025");
    const echoConclusion = "1. Left ventricular systolic function is preserved.\n2. No estimate of RVSP was available.";
    await page.evaluate(text => navigator.clipboard.writeText(text), echoConclusion); await page.locator("#study-edit-echo-impression").focus(); await page.keyboard.press("ControlOrMeta+V");
    assert.equal(await page.locator("#study-edit-echo-impression").inputValue(), echoConclusion);
    await bounds(); await page.locator("#encounter").screenshot({ path: "/tmp/sarcoidosis-echo-report-desktop.png" });
    await page.setViewportSize({ width: 390, height: 900 }); await page.locator(".report-editor").screenshot({ path: "/tmp/sarcoidosis-echo-report-mobile.png" });
    await button("Save report").click(); assert.equal(await page.locator(".study-table thead th").count(), 2);
    assert.match(await page.locator(".study-table").textContent(), /2025-09-01/); assert.ok((await page.locator(".study-table").textContent()).includes(echoConclusion));
    await page.locator(".study-row-controls > summary").click(); await page.locator(".study-row-control").first().getByRole("button", { name: "Edit", exact: true }).click();
    assert.equal(await page.locator("#study-edit-echo-impression").inputValue(), echoConclusion); assert.equal(await page.locator(".study-optional").evaluate(n => n.open), false);
    await button("Save report").click(); assert.equal(await page.locator(".study-table tbody tr").count(), 1);
    await setStudy("echo", { date: "2026-09", lvef: "55-60", rvsp: "<35", rv: "Normal reported RV size and function", impression: "Technically limited study. PASP not estimated.", role: "current" });
    await go("ct");
    const html = '<table><tr><th>Date</th><th>Modality</th><th>Reported findings</th><th>Reported impression</th></tr><tr><td>2025-10</td><td>HRCT</td><td>Upper-lobe fibrosis<img src="https://example.invalid/pasted-report-image"></td><td>Stable compared with prior &lt;uncertain&gt;<script>window.badPaste = true</script></td></tr></table>';
    await button("Import previous table").click();
    await page.locator("#study-paste-ct").evaluate((area, html) => { const data = new DataTransfer(); data.setData("text/html", html); data.setData("text/plain", "Previous CT table"); area.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true })); }, html);
    assert.equal(await page.locator(".study-import .study-table tbody tr").count(), 1);
    await button("Apply reviewed results").click(); assert.equal(await page.evaluate(() => window.badPaste), undefined);
    await setStudy("ct", { date: "2026-03-01", impression: "1. Stable upper-lobe predominant fibrotic changes.\n2. No new consolidation." });
    await setStudy("ct", { date: "2026-10", modality: "hrct", findings: "Upper-lobe fibrosis with traction bronchiectasis", impression: 'Unchanged, with <uncertain> activity.\nClinical correlation recommended.', comparison: "Compared with 2025-10", role: "current" });
    await bounds(); await generate();
    for (const name of ["Pulmonary function history", "Six-minute walk history", "Echocardiography history", "Chest CT / HRCT history"]) assert.match(await note(), new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(await note(), /55-60/); assert.match(await note(), /335.28/); assert.match(await note(), /FVC change: -2 percentage points/); assert.match(await note(), /<uncertain>/);
    assert.ok((await note()).includes(echoConclusion)); assert.match(await note(), /2025-09-01/); assert.match(await note(), /2026-03-01/);
    assert.equal(await page.locator("#note-tables table").count(), 4);
    await button("Copy note").click(); await page.waitForFunction(() => document.getElementById("copy-status").textContent.includes("Clinical draft copied")); assert.equal(await page.evaluate(() => navigator.clipboard.readText()), await note());
    const noteHtml = await page.evaluate(async () => { const items = await navigator.clipboard.read(); return await (await items[0].getType("text/html")).text(); });
    assert.equal((noteHtml.match(/<table /g) || []).length, 4); assert.match(noteHtml, /&lt;uncertain&gt;/); assert.doesNotMatch(noteHtml, /<script/);
    await bounds(); await page.locator(".note-card").screenshot({ path: "/tmp/sarcoidosis-investigations-note-desktop.png" });
    await page.setViewportSize({ width: 390, height: 900 }); await page.locator("#note-tables").screenshot({ path: "/tmp/sarcoidosis-investigations-note-mobile.png" });
    await go("pft");
    await button("Add PFT").click(); await page.locator("#study-edit-pft-fvc").fill("75"); await go("followup"); await page.locator("#generate-btn").click();
    assert.equal(await page.locator("#copy-note-btn").isDisabled(), true); assert.match(await page.locator("#step-content").textContent(), /unfinished/);
    await go("pft"); assert.equal(await page.locator("#study-edit-pft-fvc").inputValue(), "75"); await button("Cancel edit").click();
    await importText("pft", "Date\tFVC\n2026\t76"); assert.equal(await button("Apply reviewed results").isDisabled(), true);
    await page.getByRole("combobox", { name: "Import column 2", exact: true }).focus(); await page.getByRole("combobox", { name: "Import column 2", exact: true }).selectOption("fvc"); assert.equal(await button("Apply reviewed results").isDisabled(), false);
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute("aria-label")), "Import column 2");
    await page.locator("#study-paste-pft").fill("Date\tFVC (% predicted)\n2026\t65"); assert.equal(await button("Apply reviewed results").count(), 0, "Editing source must discard the old preview");
    await button("Review pasted table").click(); assert.match(await page.locator(".study-import .study-table").textContent(), /65% pred/); await button("Cancel import").click();
    assert.equal(await page.locator(".study-table tbody tr").count(), 2);
    await generate();
    // A plain-text clipboard restriction must still allow copying the draft.
    await page.evaluate(() => { navigator.clipboard.write = async () => { throw new Error("Rich format unavailable"); }; });
    await button("Copy note").click(); await page.waitForFunction(() => document.getElementById("copy-status").textContent.includes("Clinical draft copied")); assert.equal(await page.evaluate(() => navigator.clipboard.readText()), await note());
    await page.evaluate(() => { navigator.clipboard.writeText = async () => { throw new Error("Clipboard denied"); }; });
    await button("Copy note").click(); await page.waitForFunction(() => document.getElementById("copy-status").textContent.includes("manual copying")); assert.match(await page.locator("#copy-status").textContent(), /manual copying/);
    await go("pft"); await page.locator(".study-row-controls > summary").click();
    await page.locator(".study-row-control").first().getByRole("button", { name: "Remove", exact: true }).click();
    await generate(); assert.doesNotMatch(await note(), /FVC change:/); assert.equal(await page.locator("#note-tables .note-study").first().locator("tbody tr").count(), 1);
    assert.deepEqual(posts, []); assert.deepEqual(external, []); assert.deepEqual(errors, []);
    assert.deepEqual(await page.evaluate(() => [Object.keys(localStorage), Object.keys(sessionStorage)]), [[], []]);
    await page.reload(); await go("available-data"); await page.locator("#field-includePft").check(); await go("pft"); assert.equal(await page.locator(".study-table").count(), 0);
    console.log("Investigation browser checks passed: serial editing, text/HTML import, unit mapping, deduplication, selected comparisons, retained drafts, rich/text/manual clipboard, SOAP tables, stale safeguards, no persistence/transmission, and 320/390/768/1280 layouts.");
  } finally { await browser.close(); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
