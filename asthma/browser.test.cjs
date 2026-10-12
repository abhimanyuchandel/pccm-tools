// Development-only browser regression runner. Start a static server before running.
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const baseUrl = process.env.ASTHMA_TEST_URL || "http://127.0.0.1:8766/asthma/";
const state = {
  age: 45, managementPhase: "followup", diagnosisContext: "established", typicalSymptoms: true, dxChallenge: true,
  controller: "ics-formoterol", icsDose: "medium", reliever: "ics-formoterol", symptomDays: "none", nightWaking: "none",
  ocsExacerbations: 0, hospitalExacerbations: 0, urgentRedFlags: false, acutePresentation: "none",
  treatmentReviewed: true, riskReviewed: true
};

async function setInputs(page, values) {
  // Fill even collapsed controls, using the same events and radio/checkbox semantics as the UI.
  await page.evaluate(values => {
    const form = document.getElementById("asthma-form");
    for (const [key, next] of Object.entries(values)) {
      const group = form.elements.namedItem(key), definition = window.asthmaInputSchema[key];
      if (!group || !definition) throw new Error(`No field ${key}`);
      let field = group;
      if (group instanceof RadioNodeList) {
        const value = next === null ? "unknown" : typeof next === "boolean" ? next ? "yes" : "no" : next;
        field = Array.from(group).find(input => input.value === value);
        if (!field) throw new Error(`No option ${key}: ${value}`);
        field.checked = true;
      } else if (field.type === "checkbox") field.checked = next === true || next === definition.checkedValue;
      else field.value = next === null ? "" : String(next);
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
  const openDetails = async () => page.evaluate(() => document.querySelectorAll("details").forEach(item => { item.open = true; }));
  const capture = async (locator, name) => {
    if (process.env.ASTHMA_SCREENSHOT_DIR) await locator.screenshot({ path: `${process.env.ASTHMA_SCREENSHOT_DIR}/asthma-${name}.png` });
  };
  try {
    await load();
    await page.setViewportSize({ width: 1280, height: 900 });
    await capture(page.locator("#asthma-form > section").first(), "routine-desktop");
    assert.equal(await page.locator('input[type="text"], textarea:not([readonly])').count(), 0);
    assert.equal(await page.locator('#heart-rate, #systolic-bp, #temperature, #hpi, #exam').count(), 0);
    assert.equal(await page.locator("#acute-fields").isVisible(), false);
    assert.equal(await page.locator("#biologic-dosing").isVisible(), false);
    assert.equal(await page.locator("#air-smart-reference").evaluate(node => node.open), false);
    assert.equal(await page.locator("#ics-dose-fields").isVisible(), false);
    await generate();
    assert.match(await text(), /could not be fully classified/);
    assert.doesNotMatch(await text(), /No urgent red-flag|Examination: normal|No exacerbations requiring/);

    await setInputs(page, state); await generate();
    assert.match(await text(), /GINA Track 1 Step 4/); assert.match(await text(), /was well controlled/);
    assert.equal((await text()).match(/\*\*\*/g).length, 3);
    const priorNote = await text();
    await page.locator("#air-smart-reference > summary").click();
    await page.locator("#ics-dose-reference > summary").click();
    assert.equal(await page.locator(".regimen-table tbody tr").count(), 3);
    assert.equal(await page.locator(".ics-example-table tbody tr").count(), 3);
    assert.match(await page.locator("#air-smart-reference").textContent(), /single maintenance and reliever therapy/);
    assert.match(await page.locator("#air-smart-reference").textContent(), /12 total inhalations in 24 hours/);
    assert.match(await page.locator("#ics-dose-reference").textContent(), /Examples are not dose-equivalent substitutions/);
    assert.equal(await text(), priorNote); assert.equal(await page.locator("#copy-note-btn").isDisabled(), false);
    await page.locator("#copy-note-btn").click();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), await text());
    await setInputs(page, { riskReviewed: false, treatmentReviewed: false });
    assert.equal(await page.locator("#copy-note-btn").isDisabled(), true); assert.equal(await text(), "");
    await generate();
    assert.match(await text(), /could not be fully classified/);
    assert.doesNotMatch(await text(), /No prior ICU|No controller-adherence concern|No inhaler-technique concern/);
    await openDetails();
    await page.locator("#set-symptoms-negative-btn").click(); await generate();
    assert.match(await text(), /was well controlled/);
    await setInputs(page, { priorIcu: true, riskReviewed: true, treatmentReviewed: true }); await generate();
    assert.match(await text(), /history included ICU/);
    await setInputs(page, { riskReviewed: false }); await generate(); assert.match(await text(), /history included ICU/);
    await page.locator('[data-treatment-preset="smartLow"]').click();
    assert.equal(await page.locator("#prior-icu").isChecked(), true);
    assert.equal(await page.locator('[name="icsDose"][value="low"]').isChecked(), true);
    assert.equal(await page.locator("#controller").inputValue(), "ics-formoterol");
    await page.locator('[data-treatment-preset="air"]').click();
    assert.equal(await page.locator("#controller").inputValue(), "none");
    assert.equal(await page.locator("#reliever").inputValue(), "ics-formoterol");

    await load(); await setInputs(page, { ...state, symptomDays: "daily", nightWaking: "weekly-plus", activityLimitation: true,
      ocsExacerbations: 2, eosinophils: 450, feno: 45 }); await generate();
    assert.match(await text(), /would be considered at follow-up if control remained inadequate/);
    await page.locator('[name="biologic-selection"][value="benralizumab"]').check();
    assert.doesNotMatch(await text(), /Planned initiation/);
    assert.equal(await page.locator("#biologic-dosing").isVisible(), false);
    await setInputs(page, { icsDose: "high", optimizedTherapy: true }); await generate();
    assert.match(await text(), /Planned initiation of Benralizumab/);
    assert.doesNotMatch(await text(), /Preferred biologic|Additional biologic option|Depemokimab|Reslizumab/);
    const selection = page.locator('[name="biologic-selection"][value="benralizumab"]');
    await selection.focus(); await page.keyboard.press("ArrowLeft"); assert.equal(await selection.isChecked(), false);

    await page.locator("#biologic-more-summary").click();
    await page.locator('[name="biologic-selection"][value="reslizumab"]').check();
    assert.equal(await page.locator("#biologic-dosing").isVisible(), true);
    assert.equal(await page.locator("#omalizumab-dosing-fields").isVisible(), false);
    assert.match(await text(), /patient-specific dose was deferred/);
    await page.locator("#weight-kg").fill("72.5");
    assert.equal(await page.locator("#copy-note-btn").isDisabled(), true);
    assert.equal(await page.locator('[name="biologic-selection"][value="reslizumab"]').isDisabled(), true);
    assert.equal(await page.locator("#weight-kg").isEnabled(), true);
    assert.equal(await text(), "");
    await page.locator("#biologic-dosing button").click();
    assert.match(await text(), /217.5 mg IV every 4 weeks/);
    await setInputs(page, { allergenDriven: true, perennialSensitization: true }); await generate();
    await page.locator('[name="biologic-selection"][value="omalizumab"]').check();
    assert.equal(await page.locator("#omalizumab-dosing-fields").isVisible(), true);
    assert.doesNotMatch(await text(), /adult asthma-table dose was/);
    await setInputs(page, { weightKg: 50, totalIge: 100, igePretreatment: true });
    assert.equal(await page.locator("#copy-note-btn").isDisabled(), true);
    await generate(); assert.match(await text(), /150 mg SC every 4 weeks/);
    await setInputs(page, { totalIge: 700, weightKg: 100 }); await generate();
    assert.match(await text(), /definitive omalizumab dose was deferred/);
    assert.doesNotMatch(await text(), /adult asthma-table dose was/);

    await openDetails();
    for (const width of [320, 390, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      const sizing = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
      assert.ok(sizing.scroll <= sizing.client + 1, `horizontal overflow at ${width}: ${JSON.stringify(sizing)}`);
      const rows = await page.locator(".vaccine-table tbody tr").count(); assert.equal(rows, 4);
      for (const table of [".vaccine-table", ".regimen-table", ".ics-example-table"]) {
        assert.equal(await page.locator(table).getByRole("rowheader").count(), table === ".vaccine-table" ? 4 : 3);
        if (width < 600) assert.equal(await page.locator(`${table} tbody tr`).first().evaluate(node => getComputedStyle(node).display), "block");
      }
      if ([390, 1280].includes(width)) {
        await capture(page.locator(".vaccine-reference"), `vaccines-${width}`);
        await capture(page.locator("#biologic-guidance-card"), `biologics-${width}`);
        await capture(page.locator("#air-smart-reference"), `air-smart-${width}`);
        await capture(page.locator("#ics-dose-reference"), `ics-examples-${width}`);
      }
    }
    assert.doesNotMatch(await text(), /Capvaxive|Arexvy|Shingrix|CDC adult schedule|Examples are not dose-equivalent|single maintenance and reliever therapy/);

    await load();
    await page.setViewportSize({ width: 390, height: 900 });
    await capture(page.locator("#asthma-form > section").first(), "routine-mobile");
    assert.equal(await page.locator("#age").inputValue(), "");
    assert.equal(await page.evaluate(() => localStorage.length), 0);
    await setInputs(page, { ...state, acutePresentation: "recent" }); await generate();
    assert.equal(await page.locator("#acute-fields").isVisible(), false);
    assert.match(await text(), /resolved exacerbation/); assert.doesNotMatch(await text(), /discharge readiness/);
    await setInputs(page, { acutePresentation: "active" });
    assert.equal(await page.locator("#acute-fields").isVisible(), true);
    assert.equal(await page.locator("#acute-reassessment-fields").isVisible(), false);
    await generate(); assert.match(await text(), /assessment was incomplete/); assert.match(await text(), /discharge readiness was not established/);
    await setInputs(page, { acuteReassessmentAvailable: true });
    assert.equal(await page.locator("#acute-reassessment-fields").isVisible(), true);
    await setInputs(page, { spo2: 85, respiratoryRate: 32 }); await generate();
    assert.equal(await page.locator("#emergency-output").isVisible(), true);
    assert.match(await text(), /Immediate emergency assessment \/ transfer was recommended/);
    assert.doesNotMatch(await text(), /Preventive care|Planned initiation/);
    await setInputs(page, { acutePresentation: "none" }); await generate();
    assert.equal(await page.locator("#emergency-output").isVisible(), true);
    assert.equal(await page.locator("#acute-retained-warning").isVisible(), true);
    await setInputs(page, { ocsExacerbations: -1 }); await generate();
    assert.equal(await page.locator("#emergency-output").isVisible(), true);
    assert.equal(await page.locator("#copy-note-btn").isDisabled(), true); assert.equal(await text(), "");
    assert.match(await page.locator("#recommendation-status").textContent(), /Do not delay care/);

    await load(); await setInputs(page, { ...state, eosinophils: 8000 }); await generate();
    assert.match(await text(), /8000 cells\/uL/); assert.match(await page.locator("#caution-list").textContent(), /Unusual value/);
    assert.deepEqual(errors, []);
    console.log("Browser scenarios passed: treatment references, unchanged notes on disclosure, reviewed groups, shortcuts, SOAP placeholders, conditional inputs, dosing/stale safeguards, clipboard, keyboard, memory-only data, and widths 320/390/768/1280.");
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
