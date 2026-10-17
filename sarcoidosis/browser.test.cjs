// Synthetic encounters only; no production patient data or clinical service.
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const baseUrl = process.env.SARCOIDOSIS_TEST_URL || "http://127.0.0.1:8766/sarcoidosis/";
const baseline = {
  context: "routine", age: 45, gender: "female", urgentResp: false, urgentCardiac: false, urgentNeuro: false, urgentVisual: false, urgentCalcium: false,
  diagnosis: "established", diagnosticBasis: "records", compatible: true, mimics: true, currentPred: false, currentDmard: "none", currentTnf: "none",
  dyspnea: false, cough: false, fatigue: false, limitation: false, trajectory: "stable", qol: "none", relapse: false, activity: "inactive", indication: "none", infection: false, alternativeCause: false, phConcern: false,
  cardiac: "none", ocular: "none", neuro: "none", renal: "none", hepatic: "none", skin: "none", joints: "none",
  eyeScreen: "current", ecgScreen: "current", cbcScreen: "current", calciumScreen: "current", renalScreen: "current", alpScreen: "current", strategy: "observe",
  vaccinePlan: "review", rehab: "exercise", smoking: "never", followupWeeks: 16,
};
const mtx = {
  ...baseline, strategy: "methotrexate", activity: "active", indication: "qol", dyspnea: true, fatigue: true, qol: "important", trajectory: "worse", followupWeeks: 4,
  dmardDose: 15, dmardTarget: 25, titrationWeeks: 4, mtxRoute: "oral", toxicity: false, exposure: "none", interactions: true, cbcSafe: true, liverSafe: true,
  renalReviewed: true, renalFunction: 90, hepatitis: "clear", reproductive: "cleared", tmpSmx: false, prescriptionReviewed: true, pjp: "review",
};
async function main() {
  const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || "chrome" });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce", permissions: ["clipboard-read", "clipboard-write"] });
    const page = await context.newPage(), errors = [], clinicalRequests = [];
    page.on("pageerror", e => errors.push(e.message));
    page.on("request", req => { if (req.method() !== "GET") clinicalRequests.push(req.url()); });
    const load = async () => { await page.goto(baseUrl); await page.waitForSelector("#step-title:not(:empty)"); };
    const stage = () => page.locator("#encounter").getAttribute("data-step");
    async function set(key, value) {
      const f = await page.evaluate(k => window.sarcoidosisSchema[k], key);
      if (f.boolean) await page.locator(`#field-${key}-${value === null ? "unknown" : value ? "yes" : "no"}`).check();
      else if (f.type === "checkbox") await page.locator("#field-" + key).setChecked(value);
      else if (await page.locator("#field-" + key).count()) {
        const input = page.locator("#field-" + key);
        if (await input.evaluate(n => n.tagName) === "SELECT") await input.selectOption(value);
        else await input.fill(value === null ? "" : String(value));
      } else await page.locator(`#field-${key}-${value}`).check();
    }
    async function go(id) {
      await page.getByRole("button", { name: "Encounter", exact: true }).click();
      for (let i = 0; i < 90; i++) { if (await stage() === id) return; if (!await page.locator("#next-btn").isVisible()) break; await page.locator("#next-btn").click(); }
      throw new Error("Unavailable step " + id + "; reached " + await stage());
    }
    async function walk(values) {
      await page.getByRole("button", { name: "Encounter", exact: true }).click();
      for (let i = 0; i < 100; i++) {
        const keys = await page.locator(".field[data-field]").evaluateAll(nodes => nodes.map(n => n.dataset.field));
        for (const key of keys) if (Object.hasOwn(values, key)) await set(key, values[key]);
        if (await stage() === "followup") return;
        await page.locator("#next-btn").click();
      }
      throw new Error("Guided encounter did not terminate");
    }
    async function generate(id = "generate-btn") {
      const b = page.locator("#" + id); await b.scrollIntoViewIfNeeded(); await b.focus();
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
      const before = await page.evaluate(() => scrollY); await page.keyboard.press("Enter");
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
      assert.ok(Math.abs(await page.evaluate(() => scrollY) - before) <= 1, "Regeneration changed scroll position");
      assert.ok(await b.evaluate(n => document.activeElement === n));
      assert.ok(await b.evaluate(n => n.classList.contains("success")), await page.locator("#results-content").textContent());
    }
    async function width(w) { await page.setViewportSize({ width: w, height: 900 }); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "Overflow at " + w); }
    const note = () => page.locator("#note-output").inputValue();
    await load();
    assert.equal(await stage(), "context"); assert.equal(await page.locator('input[type="text"],textarea:not([readonly])').count(), 0);
    await set("age", 45); assert.equal(await stage(), "context", "Must not auto-advance");
    await page.locator("#next-btn").focus(); await page.keyboard.press("Enter"); assert.equal(await stage(), "safety");
    assert.ok(await page.locator("#step-title").evaluate(n => n === document.activeElement));
    await page.getByRole("button", { name: "Reviewed: none of these symptoms", exact: true }).click();
    assert.ok(await page.locator("#field-urgentCardiac-no").isChecked());
    for (const w of [320, 390, 768, 1280]) await width(w);
    await page.screenshot({ path: "/tmp/sarcoidosis-safety-desktop.png", fullPage: true });
    await walk(baseline); await generate();
    assert.match(await note(), /Observe without systemic/); assert.doesNotMatch(await note(), /Start prednisone/);
    assert.equal(await page.locator("#copy-note-btn").isDisabled(), false);
    await page.locator("#copy-note-btn").click(); await page.waitForFunction(() => document.getElementById("copy-status").textContent.includes("Clinical draft copied")); assert.equal(await page.evaluate(() => navigator.clipboard.readText()), await note());
    await go("symptoms"); await set("cough", true); assert.equal(await page.locator("#copy-note-btn").isDisabled(), true); assert.equal(await note(), "");
    await go("followup"); await generate(); assert.match(await note(), /reported cough/);
    await page.locator("#reset-btn").click(); await walk(mtx); await generate();
    assert.match(await note(), /Start Methotrexate 15 mg orally once weekly, never daily/); assert.match(await note(), /folic acid 1 mg/); assert.doesNotMatch(await note(), /Start prednisone/);
    await go("prescription"); await page.locator("#use-preset-btn").click(); assert.equal(await page.locator("#field-dmardDose").inputValue(), "15");
    await set("dmardDose", 12.5); await set("dmardTarget", 20); await set("mtxRoute", "sc");
    await go("prescription-confirm"); assert.ok(await page.locator("#field-prescriptionReviewed-unknown").isChecked()); await set("prescriptionReviewed", true);
    await go("followup"); await generate(); assert.match(await note(), /12.5 mg subcutaneously once weekly/); assert.match(await note(), /to 20 mg once weekly/);
    await go("lab-safety"); await set("renalFunction", 29); await go("followup"); await generate();
    assert.match(await note(), /Proposed regimen remains pending/); assert.doesNotMatch(await note(), /Start Methotrexate/); assert.match(await page.locator("#results-content").textContent(), /eGFR at least 60/);
    await go("vaccine-status"); await page.locator("#reference-vaccines > summary").click(); assert.equal(await page.locator(".reference-table tbody tr").count(), 7);
    for (const w of [320, 390, 768, 1280]) { await width(w); if (w === 390) await page.locator("#encounter").screenshot({ path: "/tmp/sarcoidosis-vaccines-mobile.png" }); }
    await page.locator("#reset-btn").click();
    const steroidSparing = { ...mtx, currentPred: true, currentSteroid: "prednisone", currentPredDose: 10, predMonths: 8, activity: "controlled", indication: "steroid", trajectory: "stable", response: "stable", backgroundPred: "continue", dmardDose: null, dmardTarget: null, titrationWeeks: null, mtxRoute: "unknown", cbcSafe: null, prescriptionReviewed: null };
    await walk(steroidSparing); await generate();
    assert.match(await note(), /selected Methotrexate plan/); assert.match(await note(), /Enter starting and target doses/); assert.doesNotMatch(await note(), /Start Methotrexate/);
    await go("prescription");
    assert.match(await page.locator('label[for="field-dmardDose"]').textContent(), /methotrexate dose \(mg once weekly\)/i);
    await page.locator("#use-preset-btn").click();
    assert.match(await page.locator('#step-content [data-plan-summary]').textContent(), /15 mg orally once weekly, never daily/);
    assert.match(await page.locator('#step-content [data-plan-summary]').textContent(), /continue 10 mg\/day/);
    for (const w of [320, 390, 768, 1280]) { await width(w); if (w === 390 || w === 1280) await page.locator("#encounter").screenshot({ path: `/tmp/sarcoidosis-prescription-${w}.png` }); }
    await set("dmardDose", 12.5);
    assert.match(await page.locator('#step-content [data-plan-summary]').textContent(), /12.5 mg orally once weekly/);
    await go("infection-safety"); assert.match(await page.locator(".drug-safety").textContent(), /TMP-SMX|once-weekly/);
    await go("prescription-confirm");
    await page.locator('#step-content button[data-review-field="cbcSafe"]').click();
    assert.equal(await stage(), "lab-safety"); assert.ok(await page.locator("#field-cbcSafe-unknown").evaluate(n => n === document.activeElement));
    await set("cbcSafe", true); await go("followup"); await generate();
    assert.match(await note(), /Proposed schedule for review only/); assert.match(await note(), /12.5 mg orally once weekly/); assert.doesNotMatch(await note(), /Start Methotrexate/);
    await page.locator('#step-content button[data-review-field="prescriptionReviewed"]').click();
    assert.equal(await stage(), "prescription-confirm"); await set("prescriptionReviewed", true);
    assert.match(await page.locator('#step-content [data-plan-summary]').textContent(), /Ready for note/);
    await go("followup"); await generate();
    assert.match(await note(), /Start Methotrexate 12.5 mg orally once weekly, never daily/);
    assert.match(await note(), /to 25 mg once weekly/); assert.match(await note(), /folic acid 1 mg orally daily/); assert.match(await note(), /corticosteroid at 10 mg\/day/);
    await page.locator("#copy-note-btn").click(); await page.waitForFunction(() => document.getElementById("copy-status").textContent.includes("Clinical draft copied")); assert.equal(await page.evaluate(() => navigator.clipboard.readText()), await note());
    await go("mtx-safety"); await set("tmpSmx", true); assert.equal(await page.locator("#copy-note-btn").isDisabled(), true);
    await go("followup"); await generate(); assert.match(await note(), /Resolve TMP-SMX/); assert.doesNotMatch(await note(), /Start Methotrexate|Proposed schedule for review only/);
    await page.locator("#reset-btn").click();
    const tnf = { ...mtx, strategy: "biologic", targetTnf: "infliximab", tnfPhase: "initiation", refractory: true, tnfDose: 5, tnfInterval: 6, tb: "clear", heartFailure: false, demyelination: false, weight: 80 };
    await walk(tnf); await generate(); assert.match(await note(), /400 mg before pharmacy/); assert.match(await note(), /weeks 0, 2 and 6/);
    await go("tnf-safety"); await set("weight", 70); await go("prescription-confirm"); await set("prescriptionReviewed", true); await go("followup"); await generate(); assert.match(await note(), /350 mg before pharmacy/);
    await go("safety"); await set("urgentVisual", true); assert.equal(await page.locator("#urgent-alert").isVisible(), true); await set("urgentCardiac", true);
    await go("context"); await set("context", "routine"); assert.equal(await page.locator("#urgent-alert").isVisible(), true);
    await go("followup"); await generate(); assert.match(await note(), /same-day urgent ophthalmic/); assert.doesNotMatch(await note(), /Start infliximab|Follow up in 4 weeks/);
    await page.locator("#reset-btn").click();
    await walk({ ...baseline, age: 50, vaccinePlan: "give", vaccineReviewed: true, vaccineImmune: false, chronicLungRisk: true, pneumococcal: "due", pneumococcalHistory: "none", pneumococcalProduct: "pcv20" });
    await generate(); assert.match(await note(), /Arrange one dose of PCV20/); assert.doesNotMatch(await note(), /vaccinated today|PCV20 was administered/);
    await page.locator("#reset-btn").click();
    await walk({ ...baseline, currentPred: true, currentSteroid: "prednisone", currentPredDose: 20, predMonths: 6, strategy: "taper", response: "stable", treatmentMonths: 6, toxicity: false, taperDose1: 15, taperWeeks1: 4, taperDose2: 10, taperWeeks2: 4, adrenalReview: true, pjp: "review", bonePlan: "review", reproductive: "na", followupWeeks: 4 });
    await generate(); assert.match(await note(), /Reduce prednisone to 15 mg/); assert.match(await note(), /then 10 mg/);
    for (const w of [320, 390, 768, 1280]) await width(w);
    await page.locator(".note-card").screenshot({ path: "/tmp/sarcoidosis-note-desktop.png" });
    await go("available-data"); await set("includePft", true); await go("pft");
    await page.getByRole("button", { name: "Add PFT", exact: true }).click(); await page.locator("#study-edit-pft-fvc").fill("70"); await page.locator("#study-edit-pft-role").selectOption("current"); await page.getByRole("button", { name: "Save result", exact: true }).click();
    await go("available-data"); await set("includePft", false);
    await go("followup"); await generate(); assert.match(await note(), /Pulmonary function history/); assert.match(await note(), /FVC: 70% pred/); assert.match(await note(), /70/);
    assert.ok(await page.getByText("Pulmonary function history", { exact: true }).count());
    await go("context"); await set("age", 17); await go("followup");
    await page.locator("#generate-btn").click(); assert.equal(await page.locator("#copy-note-btn").isDisabled(), true); assert.equal(await note(), "");
    assert.ok(!await page.locator("#generate-btn").evaluate(n => n.classList.contains("success")));
    assert.deepEqual(await page.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage) })), { local: [], session: [] });
    await load(); await go("context"); assert.equal(await page.locator("#field-age").inputValue(), "");
    assert.deepEqual(clinicalRequests, []); assert.deepEqual(errors, []);
    console.log("Sarcoidosis browser checks passed: guided branches, selected/edited dosing, renal/urgent safeguards, taper, retained answers, SOAP/clipboard/staleness, keyboard, viewport stability and 320/390/768/1280 layouts.");
  } finally { await browser.close(); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
