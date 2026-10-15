// Development-only browser regression runner. Uses synthetic patients only.
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const baseUrl = process.env.ASTHMA_TEST_URL || "http://127.0.0.1:8766/asthma/";
const state = { age: 45, gender: "female", managementPhase: "followup", diagnosisContext: "established", typicalSymptoms: true, dxChallenge: true, controller: "ics-formoterol", icsDose: "medium", reliever: "ics-formoterol", symptomDays: "none", nightWaking: "none", activityLimitation: false, ocsExacerbations: 0, hospitalExacerbations: 0, urgentRedFlags: false, acutePresentation: "none", lamaAddon: false, maintenanceOcs: false, pregnant: false };

async function setInputs(page, values) {
  // Populate retained controls to exercise complete clinical scenarios independently of navigation.
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
      if (definition.type === "exception" && next === false) field.dataset.explicitNo = "true";
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
  const load = async () => { await page.goto(baseUrl); await page.waitForSelector("#step-heading:not(:empty)"); };
  const stepId = () => page.locator("#guided-encounter").getAttribute("data-step-id");
  const go = async id => {
    if (await stepId() === id) return;
    await page.getByRole("button", { name: "Encounter", exact: true }).click();
    for (let count = 0; count < 60; count++) {
      if (await stepId() === id) return;
      if (!await page.locator("#next-step-btn").isVisible()) break;
      await page.locator("#next-step-btn").click();
    }
    throw new Error(`Step ${id} is not applicable; stopped at ${await stepId()}`);
  };
  const text = () => page.locator("#note-output").inputValue();
  const generate = async (selector = "#generate-btn", success = true) => {
    const button = page.locator(selector);
    await button.scrollIntoViewIfNeeded(); await button.focus();
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const position = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
    await page.keyboard.press("Enter");
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const after = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
    assert.ok(Math.abs(after.y - position.y) <= 1, `generation moved viewport: ${JSON.stringify({ position, after })}`);
    assert.equal(await button.evaluate(node => document.activeElement === node), true);
    assert.equal(await button.evaluate(node => node.classList.contains("is-current")), success);
    assert.equal(await button.locator(".generation-check").evaluate(node => getComputedStyle(node).opacity), success ? "1" : "0");
  };
  const capture = async name => {
    if (process.env.ASTHMA_SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.ASTHMA_SCREENSHOT_DIR}/asthma-${name}.png`, fullPage: true });
  };
  const checkWidth = async width => {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), true, `overflow at ${width}`);
    const overlaps = await page.locator("#step-fields").evaluate(node => {
      const boxes = Array.from(node.children).filter(n => n.getClientRects().length).map(n => n.getBoundingClientRect());
      return boxes.some((box, index) => boxes.slice(index + 1).some(other => Math.min(box.right, other.right) > Math.max(box.left, other.left) + 1 && Math.min(box.bottom, other.bottom) > Math.max(box.top, other.top) + 1));
    });
    assert.equal(overlaps, false, `input overlap at ${width}`);
  };

  try {
    await load();
    assert.equal(await stepId(), "context");
    assert.equal(await page.locator('input[type="text"], textarea:not([readonly])').count(), 0);
    assert.equal(await page.locator("#step-fields .clinical-field").count(), 5);
    assert.equal(await page.locator('[name="acutePresentation"][value="none"]').isChecked(), true);
    assert.equal(await page.locator('[name="urgentRedFlags"][value="no"]').isChecked(), true);
    assert.equal(await page.locator("#respiratory-rate").isVisible(), false);
    await page.locator("#age").fill("45");
    await page.locator("#gender").selectOption("female");
    assert.equal(await stepId(), "context", "answers must not auto-advance");
    for (const width of [320, 390, 768, 1280]) { await checkWidth(width); if ([390, 1280].includes(width)) await capture(`guided-context-${width}`); }
    await page.locator("#next-step-btn").focus(); await page.keyboard.press("Enter");
    assert.equal(await stepId(), "treatment");
    assert.equal(await page.locator("#step-heading").evaluate(n => n === document.activeElement), true);
    assert.equal(await page.locator("[data-treatment-preset]").count(), 5);
    for (const [id, controller, reliever] of [["none", "none", "none"], ["saba", "saba-only", "saba"], ["air", "none", "ics-formoterol"], ["smartLow", "ics-formoterol", "ics-formoterol"], ["smartMedium", "ics-formoterol", "ics-formoterol"]]) {
      await page.locator(`[data-treatment-preset="${id}"]`).click();
      assert.equal(await page.locator("#controller").inputValue(), controller);
      assert.equal(await page.locator("#reliever").inputValue(), reliever);
      assert.equal(await page.locator(`[data-treatment-preset="${id}"]`).getAttribute("aria-pressed"), "true");
    }
    await page.locator("#air-smart-reference > summary").click();
    assert.equal(await page.locator("#air-smart-reference .disclosure-label").textContent(), "Reference");
    assert.equal(await page.locator(".regimen-table tbody tr").count(), 3);
    await page.locator('[name="treatmentEntry"][value="product"]').check();
    assert.equal(await stepId(), "treatment");
    await page.locator("#next-step-btn").click();
    await page.locator("#current-controller-product").selectOption("wixela");
    assert.equal(await page.locator("#current-controller-preset option").count(), 4);
    assert.equal(await page.locator("#current-controller-preset").inputValue(), "unknown");
    assert.equal(await page.locator('[name="icsDose"][value="unknown"]').isChecked(), true);
    await page.locator("#current-controller-preset").selectOption("wixela-250-50");
    assert.equal(await page.locator('[name="icsDose"][value="medium"]').isChecked(), true);
    assert.equal(await stepId(), "current-product");
    await page.locator("#next-step-btn").click();
    await page.locator("#current-reliever-product").selectOption("albuterol");
    assert.equal(await page.locator("#reliever").inputValue(), "saba");
    await page.locator("#previous-step-btn").click();
    assert.equal(await page.locator("#current-controller-preset").inputValue(), "wixela-250-50");
    await page.locator("#current-product-reference > summary").click();
    assert.match(await page.locator("#current-product-reference").textContent(), /1 inhalation twice daily/);
    for (const width of [320, 390, 768, 1280]) { await checkWidth(width); if ([390, 1280].includes(width)) await capture(`product-${width}`); }

    await go("diagnosis");
    await page.locator('[name="diagnosisContext"][value="established"]').check();
    await page.locator('[name="typicalSymptoms"][value="yes"]').check();
    await page.locator("#show-testing-inputs").check();
    await go("pre-spirometry");
    await page.locator("#fev1-pre").fill("2"); await page.locator("#fvc-pre").fill("3");
    await page.locator("#next-step-btn").click(); await page.locator("#fev1-post").fill("2.3");
    await page.locator("#washout-reference > summary").click();
    assert.match(await page.locator("#washout-reference").textContent(), /montelukast can be continued/);
    await go("diagnosis"); await page.locator("#show-testing-inputs").uncheck();
    assert.equal(await page.locator("#fev1-pre").inputValue(), "2");
    await go("symptoms"); await page.locator("#set-symptoms-negative-btn").click();
    await go("reliever-use"); await page.locator('[name="sabaFrequency"][value="none"]').check();
    await go("exacerbations"); await page.locator("#set-exac-zero-btn").click();
    await page.locator("#review-answers-btn").click();
    assert.equal(await stepId(), "review");
    assert.match(await page.locator(".answer-review").textContent(), /Wixela Inhub|wixela/);
    await generate();
    assert.match(await text(), /This 45-year-old woman/);
    assert.match(await text(), /Current controller and rescue medications are: Wixela Inhub 250\/50/);
    assert.match(await text(), /GINA adult bronchodilator criterion was met/);
    assert.match(await text(), /was well controlled/);
    assert.doesNotMatch(await text(), /Examination: normal|Vaccines administered|The patient denied/);
    await page.locator('[name="plan-controller"][value="continue"]').check();
    assert.match(await text(), /Continue Wixela Inhub 250\/50/);
    await page.locator('[name="plan-controllerProduct"]').selectOption("advair-hfa-115-21");
    assert.match((await text()).split("\nPlan\n")[1], /Use Advair HFA 115\/21 mcg: 2 inhalations twice daily/);
    assert.match((await text()).split("\n\nObjective")[0], /Current controller and rescue medications are: Wixela Inhub/);
    await page.locator("#copy-note-btn").click();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), await text());
    await page.getByRole("button", { name: "Edit current inhaled controller", exact: true }).click();
    await page.locator("#current-controller-preset").selectOption("wixela-500-50");
    assert.equal(await page.locator("#copy-note-btn").isDisabled(), true);
    assert.equal(await text(), "");
    await generate();
    assert.match(await text(), /Current controller and rescue medications are: Wixela Inhub 500\/50/);
    await page.locator("#current-controller-product").selectOption("breo");
    assert.equal(await page.locator("#current-controller-preset").inputValue(), "unknown");
    assert.equal(await page.locator('[name="icsDose"][value="unknown"]').isChecked(), true);
    await page.locator("#current-controller-preset").selectOption("breo-200");
    assert.equal(await page.locator('[name="icsDose"][value="high"]').isChecked(), true);

    await load(); await setInputs(page, { ...state, activityLimitation: null }); await generate();
    assert.match(await text(), /could not be fully classified/);
    await page.locator('#assessment-summary a[href="#activity-limitation-unknown"]').click();
    assert.equal(await stepId(), "symptoms");
    assert.equal(await page.evaluate(() => document.activeElement.id), "activity-limitation-unknown");
    await page.locator('[name="activityLimitation"][value="no"]').check(); await generate();
    assert.match(await text(), /was well controlled/);
    await setInputs(page, { priorIcu: true, eosinophils: 450 });
    await go("treatment"); await page.locator('[data-treatment-preset="saba"]').click();
    assert.equal(await page.locator("#prior-icu").isChecked(), true);
    assert.equal(await page.locator("#eosinophils").inputValue(), "450");
    assert.equal(await page.locator("#ocs-exacerbations").inputValue(), "0");

    await load(); await setInputs(page, { ...state, controller: "ics", reliever: "saba", icsDose: "low", symptomDays: "daily", nightWaking: "weekly-plus", activityLimitation: true, sabaFrequency: "more-two" }); await generate();
    await page.locator('[name="plan-controller"][value="track2"]').check();
    await page.locator('[name="plan-controllerProduct"]').selectOption("wixela-100-50");
    await page.locator('[name="plan-relieverProduct"]').selectOption("airsupra");
    let plan = (await text()).split("\nPlan\n")[1];
    assert.match(plan, /Wixela Inhub 100\/50 mcg: 1 inhalation twice daily/); assert.match(plan, /Airsupra 90\/80/);
    assert.doesNotMatch(plan, /Breo|Advair|Breyna|Symbicort|Controller product, strength/);
    assert.equal(await page.locator("#controller").inputValue(), "ics", "planned medication must not replace current treatment history");
    await page.locator('[name="plan-controller"][value="smartLow"]').check();
    assert.match(await page.locator("#caution-list").textContent(), /previous.*choice/i);
    await page.locator('[name="plan-controllerProduct"]').selectOption("breyna-smart-low");
    plan = (await text()).split("\nPlan\n")[1]; assert.match(plan, /Breyna 160\/4.5.*1 inhalation twice daily plus 1 as needed/s);
    assert.doesNotMatch(plan, /Wixela|Airsupra|Use.*albuterol/);
    assert.equal(await page.locator('[name="plan-relieverProduct"]').count(), 0);

    await load(); await setInputs(page, { ...state, symptomDays: "daily", nightWaking: "weekly-plus", activityLimitation: true, ocsExacerbations: 2, eosinophils: 450, feno: 45 }); await generate();
    await page.locator('[name="plan-controller"][value="triple"]').check();
    await page.locator('[name="plan-controllerProduct"]').selectOption("breztri-asthma");
    await page.locator('[name="plan-relieverProduct"]').selectOption("ventolin");
    assert.match(await text(), /Breztri.*160\/18\/4.8 mcg: 2 inhalations twice daily/);
    assert.doesNotMatch((await text()).split("\nPlan\n")[1], /Add tiotropium/);
    await page.locator('[name="plan-controller"][value="continue-biologic"]').check();
    await page.locator('[name="biologic-selection"][value="benralizumab"]').check();
    assert.match(await text(), /Benralizumab.*has been recommended/);
    await page.locator("#biologic-more-summary").click();
    await page.locator('[name="biologic-selection"][value="reslizumab"]').check();
    assert.equal(await page.locator("#biologic-dosing").isVisible(), true);
    await page.locator("#weight-kg").fill("72.5");
    assert.equal(await page.locator("#copy-note-btn").isDisabled(), true);
    await generate("#biologic-dosing button");
    await page.locator('[name="plan-controller"][value="continue-biologic"]').check();
    assert.match(await text(), /217.5 mg IV every 4 weeks/);
    await setInputs(page, { allergenDriven: true, perennialSensitization: true }); await generate();
    await page.locator('[name="biologic-selection"][value="omalizumab"]').check();
    await setInputs(page, { weightKg: 50, totalIge: 100, igePretreatment: true }); await generate("#biologic-dosing button");
    await page.locator('[name="plan-controller"][value="continue-biologic"]').check();
    assert.match(await text(), /150 mg SC every 4 weeks/);
    await setInputs(page, { totalIge: 700, weightKg: 100 }); await generate("#biologic-dosing button");
    assert.match(await text(), /No dose is specified for this IgE \/ weight combination/);

    await load(); await setInputs(page, { ...state, stableMonths: 4, lungFunctionStable: true, recentExacerbation: false, priorIcu: false, respiratoryInfection: false, travelling: false }); await generate();
    await page.locator('[name="plan-controller"][value="stepdown"]').check();
    await page.locator('[name="plan-controllerProduct"]').selectOption("symbicort-smart-low");
    assert.match(await text(), /Reduce to Symbicort 160\/4.5.*1 inhalation twice daily/s);
    assert.match(await text(), /Follow up in 4-8 weeks/);
    await setInputs(page, { recentExacerbation: true }); await generate();
    assert.equal(await page.locator('[name="plan-controller"][value="stepdown"]').count(), 0);
    assert.doesNotMatch((await text()).split("\nPlan\n")[1], /Reduce to Symbicort/);

    await load(); await setInputs(page, { ...state, acutePresentation: "recent" }); await generate();
    assert.match(await text(), /resolved exacerbation/);
    assert.equal(await page.locator("#respiratory-rate").isVisible(), false);
    await setInputs(page, { acutePresentation: "active" });
    await go("acute-observations");
    assert.equal(await page.locator("#respiratory-rate").isVisible(), true);
    assert.equal(await page.locator("#post-treatment-spo2").isVisible(), false);
    await generate(); assert.match(await text(), /assessment remained incomplete/);
    assert.match(await text(), /discharge readiness was not established/);
    await go("acute-reassessment"); await page.locator("#acute-reassessment-available").check();
    await page.locator("#next-step-btn").click();
    assert.equal(await page.locator("#post-treatment-spo2").isVisible(), true);
    await setInputs(page, { spo2: 85, respiratoryRate: 32 }); await generate();
    assert.equal(await page.locator("#emergency-output").isVisible(), true);
    assert.match(await text(), /Immediate emergency assessment \/ transfer was recommended/);
    assert.doesNotMatch(await text(), /No urgent red-flag|Preventive care/);
    await setInputs(page, { acutePresentation: "none" }); await generate();
    assert.equal(await page.locator("#urgent-input-alert").isVisible(), true);
    assert.match(await text(), /Immediate emergency assessment/);
    await setInputs(page, { ocsExacerbations: -1 }); await generate("#generate-btn", false);
    assert.equal(await page.locator("#copy-note-btn").isDisabled(), true); assert.equal(await text(), "");
    assert.match(await page.locator("#recommendation-status").textContent(), /Do not delay care/);

    await load(); await setInputs(page, { ...state, smoking: "current", smokingSafetyReviewed: true, smokingCigarettesPerDay: 20, smokingFirstCigarette: "within30", smokingRenal: "normal", age: 68, pneumococcal: "due", rsv: "due", zoster: "due", tdap: "due" }); await generate();
    await page.locator('[name="smoking-selection"][value="varenicline"]').check();
    assert.match(await text(), /Start Varenicline/);
    await page.locator('[name="smoking-selection"][value="combinationNrt"]').check();
    assert.match(await text(), /21 mg patch daily/); assert.match(await text(), /gum 4 mg/);
    assert.match(await text(), /PCV20 \(Prevnar 20\)/); assert.match(await text(), /1 dose Arexvy, Abrysvo, or mResvia/);
    assert.doesNotMatch(await text(), /(?:was|were) (?:administered|vaccinated)/);
    await go("vaccines"); await page.locator("#vaccine-reference > summary").click();
    assert.equal(await page.locator(".vaccine-table tbody tr").count(), 4);
    for (const width of [320, 390, 768, 1280]) { await checkWidth(width); await generate(); if ([390, 1280].includes(width)) await capture(`vaccines-and-plan-${width}`); }
    await page.locator("#copy-note-btn").click(); assert.equal(await page.evaluate(() => navigator.clipboard.readText()), await text());
    await setInputs(page, { smokingBupropionContra: true }); await generate();
    assert.equal(await page.locator('[name="smoking-selection"][value="bupropion"]').isDisabled(), true);
    await setInputs(page, { smoking: "former" }); await generate();
    assert.equal(await page.locator("#smoking-card").isVisible(), false);
    await setInputs(page, { eosinophils: 8000 }); await generate();
    assert.match(await text(), /8000 cells\/uL/); assert.match(await page.locator("#caution-list").textContent(), /Unusual value/);
    await load();
    assert.equal(await page.locator("#age").inputValue(), "");
    assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0);
    assert.deepEqual(errors, []);
    console.log("Asthma guided browser checks passed: navigation, products, SOAP, clinical safeguards, clipboard, and 320/390/768/1280 layouts.");
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
