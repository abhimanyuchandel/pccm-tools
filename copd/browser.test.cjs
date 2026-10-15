// Synthetic encounters only. Run against a static local server or the preview.
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const baseUrl = process.env.COPD_TEST_URL || "http://127.0.0.1:8766/copd/";
const routine = {
  encounter: "routine",
  managementPhase: "initial",
  age: 65,
  gender: "female",
  redFlags: false,
  currentRegimen: "laba-lama",
  reliever: "albuterol",
  addonContext: "none",
  diagnosisContext: "established",
  historicalObstruction: true,
  asthma: "no",
  fev1fvc: 0.55,
  fev1Predicted: 45,
  catScore: 18,
  mmrcScore: 3,
  persistentDyspnea: true,
  moderateExac: 1,
  severeExac: 0,
  recurrentPneumonia: false,
  eosinophils: 320,
  chronicBronchitis: true,
  roflumilastSafety: true,
  roflumilastLiver: false,
  roflumilastWeightConcern: false,
  ensifentrineSafety: true,
  ensifentrineDevice: true,
  smokingStatus: "current",
  packYears: 30,
  quitReadiness: "ready",
  cigarettesPerDay: 20,
  firstCigarette: "within30",
  cessationSafety: true,
  renalStatus: "normal",
  bupropionContra: false,
  aatdStatus: "not-done",
  rehabStatus: "not-done",
  rehabPreference: "remote",
  screeningContext: "screening",
  curativeBenefit: true,
  ldctStatus: "due",
  pneumococcalStatus: "due",
  rsvStatus: "due",
  fluStatus: "complete",
  covidStatus: "unknown",
  zosterStatus: "complete",
  tdapStatus: "complete",
  currentOxygen: false,
  currentNiv: false,
  restingSpo2: 94,
  oxygenConditions: "roomair",
  gasExchangeReview: false,
  bronchiectasis: false,
  supportiveNeeds: false,
  emphysema: true,
  progression: false,
  advancedInterest: "screen",
};
async function main() {
  const browser = await chromium.launch({
    headless: true,
    channel: process.env.PLAYWRIGHT_CHANNEL || "chrome",
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      reducedMotion: "reduce",
      permissions: ["clipboard-read", "clipboard-write"],
    });
    const page = await context.newPage(),
      errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/*googletagmanager.com/**", (route) => route.abort());
    await page.route("**/*google-analytics.com/**", (route) => route.abort());
    const load = async () => {
      await page.goto(baseUrl);
      await page.waitForSelector("#field-age");
    };
    const input = async (key, value) => {
      if (key === "mmrcScore") {
        await page
          .locator("#mmrc-item-" + (value === null ? "unknown" : value))
          .check();
        return;
      }
      const direct = page.locator("#field-" + key);
      if (await direct.count()) {
        const tag = await direct.evaluate((n) => n.tagName);
        if (tag === "SELECT") await direct.selectOption(String(value));
        else if ((await direct.getAttribute("type")) === "checkbox")
          await direct.setChecked(value === true);
        else await direct.fill(value === null ? "" : String(value));
      } else
        await page
          .locator(
            "#field-" +
              key +
              "-" +
              (value === null
                ? "unknown"
                : value === true
                  ? "yes"
                  : value === false
                    ? "no"
                    : value),
          )
          .check();
    };
    const walk = async (values) => {
      let count = 0;
      const visited = [];
      while (await page.locator("#next-btn").isVisible()) {
        if (++count > 65) throw new Error("workflow did not reach review");
        const fields = await page
          .locator("#step-content [data-field]")
          .evaluateAll((nodes) => nodes.map((n) => n.dataset.field));
        visited.push({
          title: await page.locator("#step-title").innerText(),
          fields,
        });
        for (const key of fields)
          if (Object.hasOwn(values, key)) await input(key, values[key]);
        await page.locator("#next-btn").click();
      }
      return visited;
    };
    const generate = async () => {
      const b = page.locator("#generate-btn");
      await b.scrollIntoViewIfNeeded();
      await b.focus();
      await page.evaluate(() =>
        document.getElementById("generate-btn").addEventListener(
          "click",
          () => {
            window.submissionY = scrollY;
          },
          { capture: true, once: true },
        ),
      );
      await page.keyboard.press("Enter");
      await page.waitForTimeout(40);
      assert.ok(
        Math.abs(
          (await page.evaluate(() => scrollY)) -
            (await page.evaluate(() => window.submissionY)),
        ) <= 1,
        "generation moved viewport",
      );
      assert.equal(
        await b.evaluate((n) => n === document.activeElement),
        true,
        "generation moved focus",
      );
      assert.match(await b.innerText(), /✓/);
    };
    await load();
    assert.equal(
      await page.locator("#field-encounter-routine").isChecked(),
      true,
    );
    await input("age", 65);
    assert.equal(
      await page.locator("#step-title").innerText(),
      "Start with the encounter",
      "selection auto-advanced",
    );
    await page.screenshot({ path: "/tmp/copd-desktop.png", fullPage: true });
    await walk(routine);
    await generate();
    assert.equal(await page.locator("#copy-note-btn").isEnabled(), true);
    let note = await page.locator("#note-output").inputValue();
    assert.match(note, /Subjective/);
    assert.match(note, /65-year-old woman was seen for COPD follow-up/);
    assert.match(
      note,
      /Current controller and rescue medications are: \*\*\*\./,
    );
    assert.doesNotMatch(
      note,
      /Current medication names, strengths and schedule/,
    );
    await page.locator("#result-plan-controller-continue").check();
    for (const id of ["anoro", "stiolto", "bevespi"])
      assert.equal(
        await page.locator("#result-plan-product-" + id).isEnabled(),
        true,
      );
    await page.locator("#result-plan-product-stiolto").check();
    const stioltoNote = await page.locator("#note-output").inputValue();
    assert.match(
      stioltoNote,
      /Tiotropium\/olodaterol 2.5\/2.5 mcg per actuation, 2 inhalations once daily/,
    );
    assert.doesNotMatch(
      stioltoNote.split("\n\nObjective")[0],
      /Tiotropium\/olodaterol/,
    );
    for (const width of [320, 390, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        "controller choices overflow at " + width,
      );
      if (width === 390)
        await page
          .getByRole("group", {
            name: "Optional U.S. controller prescription",
            exact: true,
          })
          .screenshot({ path: "/tmp/copd-controller-options-390.png" });
    }
    assert.match(note, /Controller strategy.*\*\*\*/);
    assert.match(
      await page.locator("#results-content").innerText(),
      /follow-up management logic was used/,
    );
    await page.locator("#result-plan-controller-triple").check();
    await page.locator("#result-plan-product-separateTriple").check();
    await page.setViewportSize({ width: 390, height: 900 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      "triple choices overflow on mobile",
    );
    await page
      .getByRole("group", {
        name: "Optional U.S. controller prescription",
        exact: true,
      })
      .screenshot({ path: "/tmp/copd-triple-options-390.png" });
    await page.setViewportSize({ width: 1280, height: 900 });
    assert.match(
      await page.locator("#note-output").inputValue(),
      /PLUS tiotropium Respimat 2.5 mcg/,
    );
    await page.locator("#result-plan-product-trelegy").check();
    await page.locator("#result-plan-cessation-varenicline").check();
    await page.locator("#result-plan-rescue-albuterol").check();
    await page.locator("#result-plan-pneumococcalPlan-pcv20").check();
    note = await page.locator("#note-output").inputValue();
    assert.match(note, /100\/62.5\/25/);
    assert.match(note, /Recommend PCV20/);
    assert.doesNotMatch(note, /Recommend PCV21|Recommend PCV15/);
    assert.match(note, /Start varenicline/);
    assert.doesNotMatch(
      note,
      /Start bupropion|Start nicotine patch|Breztri|logic was used|Screening reference/,
    );
    await page.locator("#copy-note-btn").click();
    assert.equal(
      await page.evaluate(() => navigator.clipboard.readText()),
      note,
    );
    await page.getByRole("button", { name: "Context", exact: true }).click();
    await input("age", 66);
    assert.equal(await page.locator("#copy-note-btn").isDisabled(), true);
    assert.equal(await page.locator("#note-output").inputValue(), "");
    await page.locator("#review-btn").click();
    await generate();
    assert.match(
      await page.locator("#note-output").inputValue(),
      /66 year old/,
    );
    await page.getByRole("button", { name: "Context", exact: true }).click();
    await input("gender", "male");
    assert.equal(await page.locator("#copy-note-btn").isDisabled(), true);
    await page.locator("#review-btn").click();
    await generate();
    assert.match(
      await page.locator("#note-output").inputValue(),
      /66-year-old man/,
    );
    // Upstream changes remove incompatible prescriptions and retain useful measurements.
    await page.getByRole("button", { name: "Context", exact: true }).click();
    await input("encounter", "active");
    await walk({
      ...routine,
      encounter: "active",
      acuteDyspnea: true,
      acuteSputumVolume: true,
      acutePurulence: true,
      acuteProgression: "stable",
      respiratoryRate: 20,
      heartRate: 90,
      acuteSpo2: 93,
      acuteOxygen: "roomair",
      acuteMentalStatus: "baseline",
      mimicConcern: false,
      outpatientSupport: true,
      outpatientAppropriate: true,
      acuteReassessed: false,
      antibioticSafety: true,
      resistantOrganisms: false,
      bronchiectasis: false,
    });
    await generate();
    assert.equal(
      await page.locator("#result-plan-acuteSteroid-burst").isEnabled(),
      true,
    );
    await page.locator("#result-plan-acuteSteroid-burst").check();
    assert.match(
      await page.locator("#note-output").inputValue(),
      /40 mg orally daily for 5 days/,
    );
    assert.doesNotMatch(
      await page.locator("#note-output").inputValue(),
      /Start varenicline|100\/62.5\/25/,
    );
    await page.getByRole("button", { name: "Acute care", exact: true }).click();
    await page.locator("#next-btn").click(); // initial observations
    await input("respiratoryRate", 32);
    assert.equal(await page.locator("#urgent-alert").isVisible(), true);
    await page.locator("#review-btn").click();
    await generate();
    assert.match(
      await page.locator("#note-output").inputValue(),
      /urgent emergency-level/,
    );
    assert.doesNotMatch(
      await page.locator("#note-output").inputValue(),
      /Start prednisone/,
    );
    // Each maintenance drug has its own review; biologics ask one parasite-status question.
    await load();
    const reviewStages = await walk({
      ...routine,
      managementPhase: "followup",
      currentRegimen: "triple",
      smokingStatus: "former",
      moderateExac: 2,
      biologicReview: true,
      helminthReview: "no-concern",
      azithromycinQtSafety: true,
      azithromycinHearingLiverSafety: true,
      azithromycinInfectionReview: true,
    });
    assert.deepEqual(
      reviewStages.find(
        (s) => s.title === "Biologic treatment: eligibility and safety",
      ).fields,
      ["biologicReview", "helminthReview"],
    );
    for (const name of [
      "Roflumilast: prescribing checks",
      "Maintenance azithromycin: prescribing checks",
      "Ensifentrine: prescribing checks",
    ]) {
      assert.ok(
        reviewStages.some((s) => s.title === name),
        "missing separate review: " + name,
      );
    }
    assert.ok(
      reviewStages
        .flatMap((s) => s.fields)
        .every(
          (k) =>
            ![
              "addonSafety",
              "endemicAreaExposure",
              "parasiteAssessment",
            ].includes(k),
        ),
    );
    await generate();
    await page.locator("#result-plan-controller-continue").check();
    await page.locator("#result-plan-addon-dupilumab").check();
    assert.match(
      await page.locator("#note-output").inputValue(),
      /Start Dupilumab 300 mg/,
    );
    assert.doesNotMatch(
      await page.locator("#note-output").inputValue(),
      /Start Roflumilast|Start Ensifentrine|Start Azithromycin/,
    );
    await page
      .getByRole("button", { name: "Medication review", exact: true })
      .click();
    for (
      let i = 0;
      i < 4 &&
      (await page.locator("#step-title").innerText()) !==
        "Biologic treatment: eligibility and safety";
      i++
    )
      await page.locator("#next-btn").click();
    await input("helminthReview", "pending");
    assert.equal(await page.locator("#copy-note-btn").isDisabled(), true);
    await page.locator("#review-btn").click();
    await generate();
    assert.equal(
      await page.locator("#result-plan-addon-dupilumab").isDisabled(),
      true,
    );
    assert.doesNotMatch(
      await page.locator("#note-output").inputValue(),
      /Start Dupilumab/,
    );
    // CAT/mMRC auto-application and partial-score/manual-score protection.
    await load();
    await page.getByRole("button", { name: "Symptoms", exact: true }).click();
    await page
      .getByText("Optional CAT / CAAT item-score entry", { exact: true })
      .click();
    for (let i = 0; i < 8; i++)
      await page.locator("#cat-item-" + i).selectOption("2");
    assert.equal(await page.locator("#field-catScore").inputValue(), "16");
    await input("catScore", 23);
    await page.locator("#cat-item-0").selectOption("");
    assert.equal(await page.locator("#field-catScore").inputValue(), "23");
    assert.equal(await page.locator("#mmrc-item-unknown").isChecked(), true);
    assert.equal(await page.locator("#mmrc-item-3").isVisible(), true);
    assert.equal(
      await page.locator("input[type=number][id=field-mmrcScore]").count(),
      0,
    );
    await page.locator("#mmrc-item-3").check();
    assert.equal(await page.locator("#mmrc-item-3").isChecked(), true);
    await page.locator("#next-btn").click();
    await page.locator("#back-btn").click();
    assert.equal(await page.locator("#mmrc-item-3").isChecked(), true);
    assert.equal(await page.locator("#field-catScore").inputValue(), "23");
    await page.locator("#mmrc-item-unknown").check();
    assert.equal(await page.locator("#field-catScore").inputValue(), "23");
    await page.locator("#next-btn").click();
    await page
      .getByRole("button", {
        name: "Confirm no treated exacerbations or hospitalizations",
      })
      .click();
    assert.equal(await page.locator("#field-moderateExac").inputValue(), "0");
    // Numeric warnings do not treat concerning-but-valid observations as invalid.
    await input("severeExac", 13);
    assert.equal(
      await page.locator("#field-severeExac").getAttribute("aria-invalid"),
      "false",
    );
    await input("severeExac", -1);
    assert.equal(
      await page.locator("#field-severeExac").getAttribute("aria-invalid"),
      "true",
    );
    // Additional audited clinical pathways, using the same controls as the clinician.
    await load();
    await walk({ ...routine, currentRegimen: "lama", smokingStatus: "former", moderateExac: 1, eosinophils: 300 });
    await generate();
    assert.equal(await page.locator("#result-plan-controller-triple").isEnabled(), true);
    await page.locator("#result-plan-controller-triple").check();
    await page.locator("#result-plan-product-trelegy").check();
    assert.match(await page.locator("#note-output").inputValue(), /100\/62.5\/25/);

    await load();
    await walk({ ...routine, currentRegimen: "ics-laba", smokingStatus: "former", moderateExac: 1, eosinophils: 99 });
    await generate();
    assert.equal(await page.locator("#result-plan-controller-triple").count(), 0);
    await page.locator("#result-plan-controller-dual").check();
    await page.locator("#result-plan-product-stiolto").check();
    assert.match(await page.locator("#note-output").inputValue(), /Tiotropium\/olodaterol/);
    assert.doesNotMatch(await page.locator("#note-output").inputValue(), /Use Fluticasone|Use Budesonide/);

    await load();
    const priorBenefitStages = await walk({ ...routine, currentRegimen: "ics-laba", smokingStatus: "former", moderateExac: 0, severeExac: 0, eosinophils: 80, priorIcsBenefit: true });
    assert.ok(priorBenefitStages.some(s => s.fields.includes("priorIcsBenefit")));
    await generate();
    assert.equal(await page.locator("#result-plan-controller-dual").isDisabled(), true);
    await page.locator("#result-plan-controller-triple").check();
    assert.match(await page.locator("#note-output").inputValue(), /Prior improvement in symptoms or exacerbations after adding ICS was reported/);
    await page.getByRole("button", { name: "Treatment", exact: true }).click();
    for (let i = 0; i < 8 && !(await page.locator("#field-priorIcsBenefit-no").count()); i++) await page.locator("#next-btn").click();
    for (const width of [320, 390, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) {
        console.log(await page.evaluate(() => Array.from(document.querySelectorAll("body *"))
          .filter(n => n.getBoundingClientRect().right > innerWidth + 1)
          .map(n => ({ tag: n.tagName, id: n.id, className: n.className, width: n.getBoundingClientRect().width, text: n.textContent.slice(0, 100) }))
          .slice(0, 20)));
        await page.screenshot({ path: "/tmp/copd-ics-benefit-overflow.png", fullPage: true });
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "ICS-benefit input overflow at " + width);
      if (width === 320) {
        await page.locator('[data-field="priorIcsBenefit"]').screenshot({ path: "/tmp/copd-ics-benefit-320.png" });
        await page.locator("label:has(#result-plan-product-trelegy)").screenshot({ path: "/tmp/copd-triple-option-320.png" });
      }
    }
    await input("priorIcsBenefit", false);
    assert.equal(await page.locator("#copy-note-btn").isDisabled(), true);
    await page.locator("#review-btn").click(); await generate();
    assert.equal(await page.locator("#result-plan-controller-triple").count(), 0);
    assert.equal(await page.locator("#result-plan-controller-dual").isEnabled(), true);

    await load();
    await walk({ ...routine, currentRegimen: "laba-lama", catScore: 14, mmrcScore: 2, moderateExac: 0, severeExac: 0,
      fev1Predicted: 55, smokingStatus: "former", emphysema: false, progression: false, currentOxygen: false, currentNiv: false,
      advancedInterest: "detail", bmi: 20, walkDistance: 120 });
    await generate();
    assert.equal(await page.locator("#result-plan-transplant-discuss").count(), 1);
    await page.locator("#result-plan-transplant-discuss").check();
    assert.match(await page.locator("#note-output").inputValue(), /BODE index: 6\/10/);
    assert.match(await page.locator("#note-output").inputValue(), /Do not infer listing eligibility/);

    await load();
    await walk({ ...routine, encounter: "active", acuteDyspnea: true, acuteSputumVolume: true, acutePurulence: true,
      acuteProgression: "stable", respiratoryRate: 20, heartRate: 90, acuteSpo2: 93, acuteOxygen: "roomair",
      acuteMentalStatus: "baseline", mimicConcern: false, outpatientSupport: true, outpatientAppropriate: true,
      acuteReassessed: false, antibioticSafety: true, renalStatus: "severe", resistantOrganisms: false, bronchiectasis: false });
    await generate();
    assert.equal(await page.locator("#result-plan-acuteAntibiotic-amox").isDisabled(), true);
    assert.equal(await page.locator("#result-plan-acuteAntibiotic-doxy").isEnabled(), true);
    await page.locator("#result-plan-acuteAntibiotic-doxy").check();
    assert.match(await page.locator("#note-output").inputValue(), /Start doxycycline 100 mg/);
    assert.doesNotMatch(await page.locator("#note-output").inputValue(), /875\/125/);
    await page.locator("#copy-note-btn").click();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), await page.locator("#note-output").inputValue());
    await page.getByRole("button", { name: "Context", exact: true }).click();
    await input("encounter", "routine");
    await page.locator("#review-btn").click();
    await generate();
    assert.doesNotMatch(await page.locator("#note-output").inputValue(), /Start doxycycline|875\/125/);

    // Responsive layouts and keyboard access.
    for (const width of [320, 390, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await load();
      await page.keyboard.press("Tab");
      assert.equal(
        await page.evaluate(() => document.activeElement.className),
        "skip-link",
      );
      await page.keyboard.press("Enter");
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      );
      assert.equal(overflow, false, "horizontal overflow at " + width);
      await page.getByRole("button", { name: "Symptoms", exact: true }).click();
      assert.equal(await page.locator("#mmrc-item-0").isVisible(), true);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      await page
        .getByRole("button", { name: "Prevention", exact: true })
        .click();
      for (
        let i = 0;
        i < 12 &&
        (await page.locator("#step-title").innerText()) !==
          "Respiratory vaccinations";
        i++
      )
        await page.locator("#next-btn").click();
      await page
        .getByText("Reference · U.S. adult vaccine reference", { exact: true })
        .click();
      const table = page.getByRole("table", {
        name: "U.S. adult vaccine reference",
      });
      assert.equal(await table.isVisible(), true);
      assert.equal(await table.getByRole("row").count(), 7);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        "vaccine table overflow at " + width,
      );
      if (width === 390 || width === 1280)
        await page.screenshot({
          path: "/tmp/copd-vaccines-" + width + ".png",
          fullPage: true,
        });
      await page
        .getByRole("button", { name: "Procedures & transplant", exact: true })
        .click();
      assert.equal(
        await page.locator("#step-title").innerText(),
        "Lung volume reduction and transplant referral",
      );
      await page.getByRole("button", { name: "Plan", exact: true }).click();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      if (width === 390)
        await page.screenshot({ path: "/tmp/copd-mobile.png", fullPage: true });
    }
    await page.reload();
    assert.equal(
      await page.locator("#field-age").inputValue(),
      "",
      "encounter data persisted",
    );
    assert.deepEqual(errors, []);
    console.log(
      "COPD browser checks passed: guided branching, audited controller/renal/referral paths, selected plans, clipboard/staleness, regeneration position, acute safety, calculators, keyboard, memory-only state and four viewport widths.",
    );
    await context.close();
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
