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
    assert.equal(await page.locator("#current-biologic").inputValue(), "none");
    assert.equal(await page.locator('[name="acutePresentation"][value="none"]').isChecked(), true);
    assert.equal(await page.locator('[name="urgentRedFlags"][value="no"]').isChecked(), true);
    assert.equal(await page.locator('[name="phenotypeReviewed"]').count(), 0);
    for (const key of ["allergenDriven", "nasalPolyps", "atopicDermatitis", "endemicExposure"]) {
      assert.equal(await page.locator(`[name="${key}"][value="unknown"]`).isChecked(), true);
    }
    await setInputs(page, { acutePresentation: "none" });
    assert.equal(await page.locator('[name="urgentRedFlags"][value="no"]').isChecked(), true);
    await setInputs(page, { acutePresentation: "active" });
    assert.equal(await page.locator('[name="urgentRedFlags"][value="unknown"]').isChecked(), true);
    await setInputs(page, { urgentRedFlags: false, acutePresentation: "recent" });
    assert.equal(await page.locator('[name="urgentRedFlags"][value="no"]').isChecked(), true);
    await setInputs(page, { urgentRedFlags: true, acutePresentation: "none" });
    assert.equal(await page.locator('[name="urgentRedFlags"][value="yes"]').isChecked(), true);
    await setInputs(page, { urgentRedFlags: null });
    assert.equal(await page.locator('[name="urgentRedFlags"][value="unknown"]').isChecked(), true);
    await generate(); assert.doesNotMatch(await text(), /No urgent red-flag/);
    await load();
    assert.equal(await page.locator("#air-smart-reference").evaluate(node => node.open), false);
    assert.equal(await page.locator("#ics-dose-fields").isVisible(), false);
    assert.equal(await page.locator("[data-treatment-preset]").count(), 6);
    assert.equal(await page.locator('[data-treatment-preset][aria-pressed="true"]').count(), 0);
    const noneShortcut = page.locator('[data-treatment-preset="none"]');
    await noneShortcut.focus(); await page.keyboard.press("Enter");
    assert.equal(await page.locator("#controller").inputValue(), "none");
    assert.equal(await page.locator("#reliever").inputValue(), "none");
    assert.equal(await noneShortcut.getAttribute("aria-pressed"), "true");
    await page.locator('[data-treatment-preset="saba"]').click();
    assert.equal(await page.locator("#controller").inputValue(), "saba-only");
    assert.equal(await page.locator("#reliever").inputValue(), "saba");
    assert.equal(await page.locator('[name="sabaFrequency"][value="unknown"]').isChecked(), true);
    assert.equal(await page.locator("#ocs-exacerbations").inputValue(), "");
    await page.locator('[data-treatment-preset="highDose"]').click();
    assert.equal(await page.locator("#controller").inputValue(), "ics-laba");
    assert.equal(await page.locator("#reliever").inputValue(), "saba");
    assert.equal(await page.locator('[name="icsDose"][value="high"]').isChecked(), true);
    assert.equal(await page.locator("#laba-type").inputValue(), "non-formoterol");
    await page.locator('[data-treatment-preset="saba"]').click();
    assert.equal(await page.locator('[name="symptomDays"]').count(), 6);
    assert.equal(await page.locator('[name="nightWaking"]').count(), 4);
    assert.equal(await page.locator('[name="acutePresentation"]').count(), 4);
    await page.locator('[name="symptomDays"][value="three"]').check();
    await page.locator('[name="symptomDays"][value="unknown"]').check();
    await generate();
    assert.match(await text(), /could not be fully classified/);
    assert.match(await text(), /No urgent red-flag features were documented/);
    assert.doesNotMatch(await text(), /Examination: normal|No exacerbations requiring/);

    await setInputs(page, state); await generate();
    assert.match(await text(), /GINA Track 1 Step 4/); assert.match(await text(), /was well controlled/);
    assert.equal(await page.locator('[data-treatment-preset="smartMedium"]').getAttribute("aria-pressed"), "true");
    assert.equal((await text()).match(/\*\*\*/g).length, 3);
    const priorNote = await text();
    await page.locator("#air-smart-reference > summary").click();
    await page.locator("#ics-dose-reference > summary").click();
    assert.equal(await page.locator(".regimen-table tbody tr").count(), 3);
    assert.equal(await page.locator(".ics-example-table tbody tr").count(), 3);
    assert.match(await page.locator("#air-smart-reference").textContent(), /single maintenance and reliever therapy/);
    assert.doesNotMatch(await page.locator("#air-smart-reference").textContent(), /Daily limit:|U.S. prescribing:|12 total inhalations/);
    assert.match(await page.locator("#ics-dose-reference").textContent(), /Examples are not dose-equivalent substitutions/);
    assert.equal(await text(), priorNote); assert.equal(await page.locator("#copy-note-btn").isDisabled(), false);
    await page.locator("#treatment-addons > summary").click();
    assert.equal(await page.locator("#optimized-therapy").getAttribute("aria-describedby"), "optimized-therapy-help");
    assert.match(await page.locator("#optimized-therapy-help").textContent(), /adequate treatment trial/);
    assert.equal(await page.locator("#optimized-therapy").evaluate(node => node.closest("label").contains(document.getElementById("optimized-therapy-help"))), false);
    await page.locator("#severe-asthma-examples > summary").click();
    assert.match(await page.locator("#severe-asthma-examples").textContent(), /documented assessment established severe asthma/);
    assert.equal(await text(), priorNote);
    await page.locator('.workflow-nav a[href="#preventive-panel"]').click();
    assert.equal(await page.locator("#preventive-panel").evaluate(node => node.open), true);
    assert.equal(await page.evaluate(() => document.activeElement.id), "preventive-panel");
    await page.locator('.workflow-nav a[href="#phenotype-panel"]').click();
    assert.equal(await page.locator("#phenotype-panel").evaluate(node => node.open), true);
    assert.equal(await text(), priorNote);
    await page.locator("#note-jump-link").click();
    assert.equal(await page.evaluate(() => document.activeElement.id), "note-heading");
    assert.equal(await text(), priorNote);
    await page.locator("#copy-note-btn").click();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), await text());
    await setInputs(page, { riskReviewed: false, treatmentReviewed: false });
    assert.equal(await page.locator("#copy-note-btn").isDisabled(), true); assert.equal(await text(), "");
    assert.equal(await page.locator("#note-jump-link").isVisible(), false);
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
    await generate();
    const unchangedShortcutNote = await text();
    await page.locator('[data-treatment-preset="smartLow"]').click();
    assert.equal(await text(), unchangedShortcutNote);
    assert.equal(await page.locator("#copy-note-btn").isDisabled(), false);
    await capture(page.locator("#asthma-form > section").first(), "selected-regimen-desktop");
    await page.locator('[data-treatment-preset="air"]').click();
    assert.equal(await page.locator("#controller").inputValue(), "none");
    assert.equal(await page.locator("#reliever").inputValue(), "ics-formoterol");
    assert.equal(await page.locator('[data-treatment-preset="air"]').getAttribute("aria-pressed"), "true");
    await page.locator('[data-treatment-preset="none"]').click();
    assert.equal(await page.locator("#prior-icu").isChecked(), true);
    assert.equal(await page.locator("#ocs-exacerbations").inputValue(), "0");
    assert.equal(await page.locator('[name="symptomDays"][value="none"]').isChecked(), true);
    await page.locator('[data-treatment-preset="saba"]').click();
    assert.equal(await page.locator("#prior-icu").isChecked(), true);
    await setInputs(page, { controller: "ics" });
    assert.equal(await page.locator('[data-treatment-preset][aria-pressed="true"]').count(), 0);

    await load(); await setInputs(page, { ...state, symptomDays: "daily", nightWaking: "weekly-plus", activityLimitation: true,
      ocsExacerbations: 2, eosinophils: 450, feno: 45 }); await generate();
    assert.match(await text(), /would be considered at follow-up if control remained inadequate/);
    await page.locator('[name="biologic-selection"][value="benralizumab"]').check();
    assert.doesNotMatch(await text(), /Planned initiation/);
    assert.equal(await page.locator("#biologic-dosing").isVisible(), false);
    await setInputs(page, { controller: "ics-laba", labaType: "non-formoterol", reliever: "ics-saba", icsDose: "high", optimizedTherapy: true }); await generate();
    assert.match(await text(), /Benralizumab.*has been recommended/);
    assert.equal(await page.getByText("Benefits, limitations, and typical prescribing criteria", { exact: true }).count(), 6);
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
      const sizes = await page.locator('.workflow-nav a, [data-treatment-preset], .choice-option, .checkbox-row').evaluateAll(nodes => nodes.filter(node => node.getClientRects().length).map(node => ({ height: node.getBoundingClientRect().height, width: node.getBoundingClientRect().width })));
      assert.ok(sizes.every(size => size.height >= 44 && size.width >= 44), `small tap target at ${width}`);
      const overlaps = await page.locator('#treatment-addons .grid, #phenotype-panel .grid').evaluateAll(grids => grids.flatMap(grid => {
        const boxes = Array.from(grid.children).filter(node => node.getClientRects().length).map(node => node.getBoundingClientRect());
        return boxes.flatMap((box, i) => boxes.slice(i + 1).filter(other => Math.min(box.right, other.right) > Math.max(box.left, other.left) + 1 && Math.min(box.bottom, other.bottom) > Math.max(box.top, other.top) + 1));
      }));
      assert.equal(overlaps.length, 0, `overlapping input fields at ${width}`);
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
        await capture(page.locator(".workflow-nav"), `navigation-${width}`);
        await capture(page.locator('#symptoms-heading').locator('..'), `symptoms-${width}`);
        await capture(page.locator("#treatment-addons"), `add-ons-${width}`);
        await capture(page.locator("#phenotype-panel"), `phenotype-${width}`);
      }
    }
    assert.doesNotMatch(await text(), /Capvaxive|Arexvy|Shingrix|CDC adult schedule|Examples are not dose-equivalent|single maintenance and reliever therapy/);

    await load(); await setInputs(page, { ...state, age: 68, pneumococcal: "due", rsv: "due", zoster: "due", tdap: "due", flu: "due", covid: "due" });
    await generate();
    for (const pattern of [/PCV20 \(Prevnar 20\)/, /1 dose Arexvy, Abrysvo, or mResvia/, /Shingrix: 2 doses/, /Td or Tdap every 10 years/]) {
      assert.match(await text(), pattern);
      assert.match(await page.locator("#prevention-list").textContent(), pattern);
    }
    assert.doesNotMatch(await text(), /(?:was|were) (?:administered|vaccinated)/);
    await setInputs(page, { rsv: "complete", zoster: "complete" });
    assert.equal(await page.locator("#copy-note-btn").isDisabled(), true); await generate();
    const plan = (await text()).split("\nPlan\n")[1];
    assert.doesNotMatch(plan, /Arexvy|Shingrix/);

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
    await generate(); assert.match(await text(), /assessment remained incomplete/); assert.match(await text(), /discharge readiness was not established/);
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
    assert.equal(await page.locator("#note-jump-link").isVisible(), false);
    assert.match(await page.locator("#recommendation-status").textContent(), /Do not delay care/);

    await load(); await setInputs(page, { ...state, eosinophils: 8000 }); await generate();
    assert.match(await text(), /8000 cells\/uL/); assert.match(await page.locator("#caution-list").textContent(), /Unusual value/);

    await load();
    await setInputs(page, { ...state, smoking: "current", smokingSafetyReviewed: true, smokingCigarettesPerDay: 20,
      smokingFirstCigarette: "within30", smokingRenal: "normal", pregnant: false,
      controller: "ics-laba", labaType: "non-formoterol", reliever: "ics-saba", icsDose: "high", optimizedTherapy: true, symptomDays: "daily", nightWaking: "weekly-plus", ocsExacerbations: 2, eosinophils: 450 });
    await generate();
    assert.equal(await page.locator("#smoking-card").isVisible(), true);
    assert.equal(await page.locator("#smoking-fields").evaluate(node => node.classList.contains("hidden")), false);
    assert.match(await page.locator("#management-steps").textContent(), /Smoking cessation has been recommended/);
    const smokingChoice = page.locator('[name="smoking-selection"][value="varenicline"]');
    await smokingChoice.focus(); await page.keyboard.press("Space");
    assert.match(await text(), /Varenicline has been recommended/);
    assert.match(await text(), /1 mg twice daily from day 8/);
    await page.locator('[name="biologic-selection"][value="benralizumab"]').check();
    assert.match(await text(), /Varenicline has been recommended/);
    assert.match(await text(), /Benralizumab.*has been recommended/);
    await page.locator('[name="smoking-selection"][value="combinationNrt"]').check();
    assert.match(await text(), /21 mg patch daily/); assert.match(await text(), /gum 4 mg/);
    assert.doesNotMatch((await text()).split("\nPlan\n")[1], /Varenicline/);
    assert.match(await text(), /Benralizumab.*has been recommended/);
    await page.locator("#copy-note-btn").click();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), await text());
    await setInputs(page, { smokingBupropionContra: true });
    assert.equal(await page.locator("#copy-note-btn").isDisabled(), true);
    assert.equal(await page.locator("#smoking-options").evaluate(node => node.disabled), true);
    await generate();
    assert.equal(await page.locator('[name="smoking-selection"][value="bupropion"]').isDisabled(), true);
    const assessment = (await text()).split("\nAssessment\n")[1].split("\n\nPlan")[0];
    assert.doesNotMatch(assessment, /[;:\-]/);
    await openDetails();
    for (const width of [320, 390, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), true, `cessation overflow at ${width}`);
      if ([390, 1280].includes(width)) {
        await capture(page.locator("#smoking-card"), `smoking-${width}`);
        await capture(page.locator("#smoking-assessment"), `smoking-inputs-${width}`);
        await capture(page.locator("#biologic-guidance-card"), `biologic-comparison-${width}`);
      }
    }
    await setInputs(page, { smoking: "former" }); await generate();
    assert.equal(await page.locator("#smoking-card").isVisible(), false);
    assert.doesNotMatch((await text()).split("\nPlan\n")[1], /Smoking cessation\n|21 mg patch daily/);
    await setInputs(page, { smoking: "current" }); await generate();
    assert.equal(await page.locator('[name="smoking-selection"][value=""]').isChecked(), true);
    assert.deepEqual(errors, []);
    console.log("Browser scenarios passed: routine defaults, safe high-dose shortcut, biologic comparisons and timing, selectable cessation plans and cautions, prose Assessment, clipboard/stale safeguards, and widths 320/390/768/1280.");
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
