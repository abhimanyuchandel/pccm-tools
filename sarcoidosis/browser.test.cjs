// Synthetic encounters only. No real patient data or clinical service.
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const base = process.env.SARCOIDOSIS_TEST_URL || "http://127.0.0.1:8766/sarcoidosis/";
async function main() {
  const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || "chrome" });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce", permissions: ["clipboard-read", "clipboard-write"] });
    const page = await context.newPage(), errors = [], posts = [];
    page.on("pageerror", e => errors.push(e.message)); page.on("request", r => { if (r.method() !== "GET") posts.push(r.url()); });
    const load = async () => { await page.goto(base); await page.waitForSelector("#step-title:not(:empty)"); };
    const stage = () => page.locator("#encounter").getAttribute("data-step");
    const note = () => page.locator("#note-output").inputValue();
    const chapters = { context: "Visit", interval: "Assessment", management: "Management", prevention: "Care", followup: "Review" };
    const go = async id => { await page.getByRole("button", { name: chapters[id], exact: true }).click(); assert.equal(await stage(), id); };
    async function set(key, value) {
      const f = await page.evaluate(k => window.sarcoidosisSchema[k], key);
      const simple = page.locator("#field-" + key);
      const input = await simple.count() ? simple : page.locator(`#field-${key}-${f.boolean ? value === null ? "unknown" : value ? "yes" : "no" : value}`);
      await input.evaluate(n => { for (let p = n.parentElement; p; p = p.parentElement) if (p.tagName === "DETAILS") p.open = true; });
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
      const type = await input.getAttribute("type"), tag = await input.evaluate(n => n.tagName);
      if (tag === "SELECT") await input.selectOption(value);
      else if (type === "checkbox") await input.setChecked(value === true);
      else if (type === "radio") await input.check();
      else await input.fill(value === null ? "" : String(value));
    }
    async function generate() {
      await go("followup"); const b = page.locator("#generate-btn"); await b.scrollIntoViewIfNeeded(); await b.focus();
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))); const y = await page.evaluate(() => scrollY);
      await page.keyboard.press("Enter"); await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
      assert.ok(Math.abs(await page.evaluate(() => scrollY) - y) <= 1, "Generation moved the viewport");
      assert.ok(await b.evaluate(n => document.activeElement === n && n.classList.contains("success")), errors.join("\n") || await page.locator("#results-content").textContent());
    }
    async function width(w) { await page.setViewportSize({ width: w, height: 900 }); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "Overflow at " + w); }
    async function snapshot(treated = false) {
      await go("context"); await set("diagnosisSummary", "records"); await set("warningReview", "none");
      if (treated) { await set("currentPred", true); await set("currentPredDose", 10); await set("currentDmard", "none"); await set("currentTnf", "none"); }
      else await page.getByRole("button", { name: "No systemic treatment", exact: true }).click();
      await go("interval"); await set("trajectory", "stable"); await set("activity", treated ? "controlled" : "inactive");
    }
    await load(); assert.equal(await stage(), "context"); assert.equal(await page.locator("#chapter-nav button").count(), 5); assert.match(await page.locator("#step-count").textContent(), /of 5/);
    assert.equal(await page.locator('textarea:not([readonly]),input[type="text"]').count(), 0);
    await set("diagnosisSummary", "records"); assert.equal(await stage(), "context", "Must not auto-advance");
    await page.locator("#next-btn").focus(); await page.keyboard.press("Enter"); assert.equal(await stage(), "interval"); assert.ok(await page.locator("#step-title").evaluate(n => n === document.activeElement));
    await snapshot();
    await go("context"); for (const w of [320, 390, 768, 1280]) { await width(w); if ([390, 1280].includes(w)) await page.locator("#encounter").screenshot({ path: `/tmp/sarcoidosis-five-step-visit-${w}.png` }); }
    await go("interval"); assert.equal(await page.locator("#field-dyspnea").isChecked(), false);
    await go("management"); await page.locator("#plan-observe").check(); await generate();
    assert.match(await note(), /Observe without systemic/); assert.doesNotMatch(await note(), /denied dyspnea|PJP-prevention risk review and plan/);
    assert.equal((await note()).match(/\*\*\*/g).length, 3);
    await page.locator("#copy-note-btn").click(); await page.waitForFunction(() => document.getElementById("copy-status").textContent.includes("Clinical draft copied")); assert.equal(await page.evaluate(() => navigator.clipboard.readText()), await note());
    await go("interval"); await set("cough", true); assert.equal(await page.locator("#copy-note-btn").isDisabled(), true); assert.equal(await note(), "");
    await generate(); assert.match(await note(), /reported cough/); assert.doesNotMatch(await note(), /denied dyspnea/);
    await go("interval"); await page.getByRole("button", { name: "Reviewed: none of these symptoms", exact: true }).click(); await generate(); assert.match(await note(), /denied dyspnea, cough, fatigue, activity limitation/);
    await page.locator("#reset-btn").click(); await snapshot(true); await go("management"); await page.locator("#plan-methotrexate").check();
    await set("indication", "steroid"); await set("backgroundPred", "continue"); await page.locator("#use-preset-btn").click(); await set("initiationTiming", "now");
    assert.match(await page.locator('[data-section="prescribing-reminders"]').textContent(), /CBC|TMP-SMX/);
    assert.equal(await page.locator("#field-cbcSafe-unknown").isVisible(), false, "Detailed safety inputs should remain collapsed");
    for (const w of [320, 390, 768, 1280]) { await width(w); if ([390, 1280].includes(w)) await page.locator("#encounter").screenshot({ path: `/tmp/sarcoidosis-five-step-management-${w}.png` }); }
    await go("followup"); assert.equal(await page.locator("#field-prescriptionReviewed").count(), 1); await set("prescriptionReviewed", true); await generate();
    assert.match(await note(), /Start Methotrexate 15 mg orally once weekly, never daily/); assert.match(await note(), /to 25 mg/); assert.match(await note(), /folic acid 1 mg/); assert.match(await note(), /corticosteroid at 10 mg\/day/);
    assert.doesNotMatch(await note(), /CBC was normal|negative hepatitis|pregnancy test was negative/);
    await go("management"); await set("dmardDose", 12.5); assert.equal(await page.locator("#field-dmardDose").evaluate(n => n === document.activeElement), true);
    assert.match(await page.locator('[data-section="prescription"] [data-plan-summary]').textContent(), /12.5 mg orally once weekly/);
    await set("initiationTiming", "after-tests"); await go("followup"); assert.equal(await page.locator("#field-prescriptionReviewed").isChecked(), false);
    await set("prescriptionReviewed", true); await generate(); assert.match(await note(), /After the required baseline evaluation is acceptable/); assert.match(await note(), /12.5 mg orally once weekly/); assert.match(await note(), /Obtain or review CBC/);
    await go("management"); await set("tmpSmx", true); await go("followup"); await set("prescriptionReviewed", true); await generate();
    assert.match(await note(), /Resolve TMP-SMX/); assert.doesNotMatch(await note(), /Start Methotrexate|Proposed schedule for review only/);
    await page.locator('#step-content button[data-review-field="tmpSmx"]').click(); assert.equal(await stage(), "management"); assert.equal(await page.locator("#field-tmpSmx-yes").isVisible(), true);
    await set("tmpSmx", false); await set("renalFunction", 45); await go("followup"); await set("prescriptionReviewed", true); await generate(); assert.doesNotMatch(await note(), /Start Methotrexate/); assert.match(await note(), /eGFR at least 60/);
    await page.locator("#reset-btn").click(); await snapshot(true); await go("management"); await page.locator("#plan-taper").check();
    for (const [k, v] of Object.entries({ taperDose1: 7.5, taperWeeks1: 4, taperDose2: 5, taperWeeks2: 4 })) await set(k, v);
    await go("followup"); await set("prescriptionReviewed", true); await generate(); assert.match(await note(), /Reduce.*7.5 mg orally/); assert.doesNotMatch(await note(), /adrenal recovery (?:was|is) confirmed/);
    await page.locator("#reset-btn").click(); await snapshot(); await go("interval"); await set("activity", "active"); await go("management"); await set("strategy", "biologic"); await set("targetTnf", "infliximab"); await set("indication", "organ"); await set("tnfPhase", "initiation"); await page.locator("#use-preset-btn").click(); await set("initiationTiming", "after-tests");
    await go("followup"); await set("prescriptionReviewed", true); await generate(); assert.doesNotMatch(await note(), /Start infliximab/); assert.match(await note(), /verified actual weight/);
    await go("management"); await set("weight", 80); await go("followup"); await set("prescriptionReviewed", true); await generate(); assert.match(await note(), /400 mg before pharmacy/); assert.match(await note(), /weeks 0, 2 and 6/);
    await go("prevention"); await set("careLabs", true); await set("careVaccines", true); await set("careRehab", true); await page.locator("#reference-vaccines > summary").click(); assert.equal(await page.locator("#reference-vaccines .reference-table tbody tr").count(), 7);
    for (const w of [320, 390, 768, 1280]) await width(w);
    await go("followup"); await set("prescriptionReviewed", true); await generate(); assert.match(await note(), /Obtain serum calcium/); assert.match(await note(), /Review immunization records/); assert.match(await note(), /Refer to pulmonary rehabilitation/);
    await go("context"); await set("warningReview", "concern"); await set("urgentVisual", true); await set("warningReview", "none"); assert.equal(await page.locator("#urgent-alert").isVisible(), true); await generate(); assert.match(await note(), /same-day urgent ophthalmic/); assert.doesNotMatch(await note(), /Start infliximab|Arrange.*vaccines/);
    assert.deepEqual(await page.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage) })), { local: [], session: [] });
    await load(); assert.equal(await page.locator("#field-diagnosisSummary").inputValue(), "unknown"); assert.equal(await page.locator("#urgent-alert").isVisible(), false);
    assert.deepEqual(posts, []); assert.deepEqual(errors, []);
    console.log("Five-step browser checks passed: concise routine visits, selected management and schedules, one overall review, conditional initiation, known-risk safeguards, care selections, SOAP/clipboard/staleness, keyboard, viewport stability and 320/390/768/1280 layouts.");
  } finally { await browser.close(); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
