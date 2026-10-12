// Development-only browser regression runner. Start a static server before running.
const assert = require("node:assert/strict");
const { chromium } = require("playwright");

const baseUrl = process.env.ASTHMA_TEST_URL || "http://127.0.0.1:8766/asthma/";
const state = {
  age: 45, managementPhase: "followup", diagnosisContext: "established", typicalSymptoms: true, dxChallenge: true,
  controller: "ics-formoterol", icsDose: "medium", reliever: "ics-formoterol", currentBiologic: "none", symptomDays: "none", nightWaking: "none", activityLimitation: false,
  ocsExacerbations: 0, hospitalExacerbations: 0, recentExacerbation: false, priorIcu: false, urgentRedFlags: false, acutePresentation: "none",
  adherence: "adequate", technique: "correct", accessBarrier: false
};

async function setInputs(page, values) {
  // Tests may fill collapsed optional sections; dispatch normal input/change events.
  await page.evaluate((values) => {
    const form = document.getElementById("asthma-form");
    for (const [key, value] of Object.entries(values)) {
      const field = form.elements.namedItem(key);
      if (!field) throw new Error(`No field ${key}`);
      if (field.type === "checkbox") field.checked = value;
      else field.value = field.tagName === "SELECT" && typeof value === "boolean" ? value ? "yes" : "no" : String(value);
      field.dispatchEvent(new Event("input", { bubbles: true }));
      field.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }, values);
}

async function main() {
  const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) });
  const context = await browser.newContext({ reducedMotion: "reduce", permissions: ["clipboard-read", "clipboard-write"] });
  const page = await context.newPage(), errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*googletagmanager.com/**", route => route.abort());
  await page.route("**/*google-analytics.com/**", route => route.abort());
  const load = async () => { await page.goto(baseUrl); await page.waitForSelector("#age"); };
  const generate = async () => { await page.locator("#generate-btn").click(); };
  const text = async () => page.locator("#note-output").inputValue();
  try {
    await load(); await generate();
    assert.match(await text(), /not fully assessed/);
    assert.doesNotMatch(await text(), /No urgent red-flag|Examination: normal|No exacerbations requiring/);

    await setInputs(page, state); await generate();
    assert.match(await text(), /Subjective\n/); assert.match(await text(), /Current therapy: GINA Track 1 Step 4/);
    await page.locator("#copy-note-btn").click();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), await text());
    await setInputs(page, { symptomDays: "daily" });
    assert.equal(await page.locator("#copy-note-btn").isDisabled(), true);
    assert.equal(await text(), "");
    await generate(); assert.equal(await page.locator("#copy-note-btn").isDisabled(), false);

    await setInputs(page, { symptomDays: "daily", nightWaking: "weekly-plus", activityLimitation: true, ocsExacerbations: 2, eosinophils: 450, feno: 45 });
    await generate(); assert.match(await text(), /If control remains inadequate despite optimized high-dose/);
    await page.locator('[name="biologic-selection"][value="benralizumab"]').check();
    assert.doesNotMatch(await text(), /Plan to initiate/);
    await setInputs(page, { icsDose: "high", optimizedTherapy: true }); await generate();
    await page.locator('[name="biologic-selection"][value="benralizumab"]').check();
    assert.match(await text(), /Plan to initiate.*Benralizumab/);
    assert.doesNotMatch(await text(), /Preferred biologic|Additional biologic option|Depemokimab|Reslizumab/);
    const selection = page.locator('[name="biologic-selection"][value="benralizumab"]');
    await selection.focus(); await page.keyboard.press("ArrowLeft");
    assert.equal(await selection.isChecked(), false);

    await setInputs(page, { hpi: '<img src=x onerror="window.INJECTED=true"> synthetic history', exam: "Mild wheeze documented" });
    await generate(); assert.equal(await page.evaluate(() => window.INJECTED), undefined);
    assert.match(await text(), /<img src=x/); assert.equal(await page.locator("#assessment-summary img").count(), 0);

    for (const width of [320, 390, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => document.querySelectorAll("details").forEach(item => { item.open = true; }));
      const sizing = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
      assert.ok(sizing.scroll <= sizing.client + 1, `horizontal overflow at ${width}: ${JSON.stringify(sizing)}`);
    }

    await load();
    assert.equal(await page.locator("#age").inputValue(), "");
    assert.equal(await page.locator("#exam").inputValue(), "");
    assert.equal(await page.evaluate(() => localStorage.length), 0);
    await setInputs(page, { ...state, acutePresentation: "active", spo2: 85, respiratoryRate: 32 }); await generate();
    assert.equal(await page.locator("#emergency-output").isVisible(), true);
    assert.match(await text(), /immediate emergency transfer/);
    assert.doesNotMatch(await text(), /Continue the effective|Preventive care|Plan to initiate/);

    await setInputs(page, { ocsExacerbations: -1 }); await generate();
    assert.equal(await page.locator("#emergency-output").isVisible(), true);
    assert.equal(await page.locator("#copy-note-btn").isDisabled(), true);
    assert.equal(await text(), "");
    assert.match(await page.locator("#recommendation-status").textContent(), /Do not delay care/);

    await load(); await setInputs(page, { ...state, eosinophils: 8000 }); await generate();
    assert.match(await text(), /8000 cells\/uL/); assert.match(await page.locator("#caution-list").textContent(), /Unusual value/);
    assert.deepEqual(errors, []);
    console.log("Browser scenarios passed: clinical integration, clipboard, stale output, biologic selection, safe text, urgent priority, memory-only data, and widths 320/390/768/1280.");
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
