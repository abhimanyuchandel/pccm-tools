// Browser smoke checks for public ODDS discovery and publication changes.
// All prediction requests in this test use synthetic inputs and a mocked response.
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const base = process.env.ODDS_SITE_TEST_URL || "http://127.0.0.1:8766";
const doi = "https://doi.org/10.1093/ajrccm/aamag552";
(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) });
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage(), errors = [], requests = [];
  page.setDefaultNavigationTimeout(90000);
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*googletagmanager.com/**", route => route.abort());
  await page.route("**/*google-analytics.com/**", route => route.abort());
  await page.route("**/ODDS/api/joint-odds-prediction", async route => {
    requests.push(route.request().postDataJSON());
    await route.fulfill({ json: { ok: true, predictions: { 1: 0.8, 2: 0.65, 3: 0.5 } } });
  });
  try {
    await page.goto(base);
    const link = page.locator('section[aria-label="Interstitial lung disease tools"] a[href="/ODDS/"]');
    assert.equal(await link.count(), 1);
    await link.click();
    await page.waitForLoadState("load");
    await page.locator("#entryRows input").first().waitFor();
    assert.equal(await page.locator('meta[name="robots"]').getAttribute("content"), "index, follow");
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), "https://pccmtools.org/ODDS/");
    await page.locator("#aboutTitle").click();
    assert.equal(await page.locator(`a[href="${doi}"]`).count(), 1);
    assert.match(await page.locator(".citation-list").textContent(), /Abhimanyu Chandel, Stephanie Morgan, Junad M Chowdhury/);
    assert.doesNotMatch(await page.locator(".odds-copyright-notice").textContent(), /being considered|Version of Record/);
    const evidence = page.getByRole("link", { name: "Evidence and model validation", exact: true });
    assert.equal((await evidence.getAttribute("rel") || "").includes("nofollow"), false);
    for (const width of [320, 390, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), true, `calculator overflow at ${width}`);
    }
    await page.locator("#exampleButton").click();
    await page.waitForFunction(() => /80(?:\.0)?%/.test(document.querySelector("#currentEstimate").textContent));
    assert.ok(requests.some(body => body.rows.length === 3 && body.rows.every(row => Number.isFinite(row.oddsScore))));
    assert.match(await page.locator("#currentEstimate").textContent(), /80\.0%|80%/);
    await evidence.click();
    await page.waitForLoadState("load");
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator('meta[name="robots"]').getAttribute("content"), "index, follow");
    assert.equal(await page.locator(`.manuscript-citation a[href="${doi}"]`).count(), 1);
    assert.equal(await page.locator("table").count(), 9);
    assert.equal(await page.locator("img").count(), 14);
    for (const width of [320, 390, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), true, `evidence overflow at ${width}`);
      if (width === 390) {
        const toc = page.locator(".toc-toggle"); await toc.focus(); await page.keyboard.press("Enter");
        assert.equal(await toc.getAttribute("aria-expanded"), "true");
        await page.keyboard.press("Escape"); assert.equal(await toc.getAttribute("aria-expanded"), "false");
      }
      if (process.env.ODDS_SCREENSHOT_DIR && [390, 1280].includes(width)) {
        await page.locator(".manuscript-citation").screenshot({ path: `${process.env.ODDS_SCREENSHOT_DIR}/odds-citation-${width}.png` });
      }
    }
    await page.getByRole("link", { name: "Joint-model summary", exact: true }).first().click();
    await page.waitForLoadState("load");
    assert.match(await page.locator('meta[name="robots"]').getAttribute("content"), /noindex/);
    assert.equal(await page.getByRole("link", { name: "Longitudinal application", exact: true }).count(), 2);
    assert.doesNotMatch(await page.locator(".publication-copyright").textContent(), /being considered|Version of Record/);
    await page.getByRole("link", { name: "Longitudinal application", exact: true }).first().click();
    assert.match(page.url(), /\/ODDS\/evidence\/$/);
    for (const file of ["comprehensive", "joint"]) {
      const response = await context.request.get(`${base}/ODDS/evidence/downloads/${file}.pdf`);
      assert.equal(response.status(), 200); assert.match(response.headers()["content-type"], /pdf/);
      assert.equal((await response.body()).subarray(0, 5).toString(), "%PDF-");
    }
    const sitemap = await context.request.get(`${base}/sitemap.xml`);
    assert.equal(sitemap.status(), 200); assert.match(await sitemap.text(), /https:\/\/pccmtools.org\/ODDS\/evidence\//);
    assert.deepEqual(errors, []);
    console.log("ODDS publication browser checks passed: home link, citations, discovery metadata, PDFs, navigation, responsive layouts, and unchanged calculator with synthetic API responses.");
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
