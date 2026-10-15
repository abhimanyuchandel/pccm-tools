(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.asthmaInhalers = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const REVIEW_DATE = "October 15, 2026";
  const dailyMed = id => `https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${id}`;
  const PRODUCTS = {};
  const PRESETS = {};
  const add = (id, name, category, labaType, device, source, administration) => {
    PRODUCTS[id] = { id, name, category, labaType, device, source: { id, title: `${name}: U.S. prescribing information`, url: dailyMed(source) }, administration };
  };
  const mdi = "Shake before use and follow the product-specific priming and cleaning instructions.";
  const dpi = "Use a deep, forceful inhalation. Avoid this lactose-containing DPI with severe milk-protein allergy.";
  add("symbicort", "Symbicort", "ics-formoterol", "formoterol", "pMDI", "fafa4cf1-99c2-43d5-73ad-51f256de3be0", mdi);
  add("breyna", "Breyna", "ics-formoterol", "formoterol", "pMDI", "dc529fc4-bddb-4673-8202-dc401f86166f", mdi);
  add("advair-diskus", "Advair Diskus", "ics-laba", "non-formoterol", "DPI", "4eeb5f6a-593f-4a9e-9692-adefa2caf8fc", dpi);
  add("wixela", "Wixela Inhub", "ics-laba", "non-formoterol", "DPI", "3beef422-8a07-4a45-9ba6-414511e4b7e2", dpi);
  add("advair-hfa", "Advair HFA", "ics-laba", "non-formoterol", "pMDI", "dfaca6f9-3277-47b2-319d-1377917cb54c", mdi);
  add("breo", "Breo Ellipta", "ics-laba", "non-formoterol", "DPI", "96428df1-ea05-431a-98d3-1ec2c4b63878", dpi);
  add("dulera", "Dulera", "ics-laba", "formoterol", "pMDI", "8f399784-f257-4f31-b3dc-368bf2a1864d", `${mdi} These presets are maintenance-only, not AIR/SMART. Confirm product-specific ICS intensity separately when not classified.`);
  add("qvar", "Qvar RediHaler", "ics", "unknown", "breath-actuated MDI", "2814cf81-392e-4dd4-9816-ae7e6e5ec84f", "Breath-actuated: do not shake, prime, or use a spacer.");
  add("arnuity", "Arnuity Ellipta", "ics", "unknown", "DPI", "50f193ee-1691-486d-9370-a664df63695c", dpi);
  add("pulmicort", "Pulmicort Flexhaler", "ics", "unknown", "DPI", "10f2ae5b-a6fb-4804-9111-0cd067c2b1b2", dpi);
  add("fluticasone-hfa", "Generic fluticasone propionate HFA", "ics", "unknown", "pMDI", "99249b31-bf0a-464f-8335-845279350dbe", mdi);
  add("trelegy", "Trelegy Ellipta", "triple", "non-formoterol", "DPI", "b5a81d5a-4648-4c7a-951d-33c014a63c7e", `${dpi} Maintenance only. Use a separate albuterol or Airsupra reliever, not ICS-formoterol. Do not add another LABA or LAMA.`);
  add("breztri", "Breztri Aerosphere (asthma formulation)", "triple", "formoterol", "pMDI", "715433dc-cb2b-43ea-b6df-c5b4177adc6c", `${mdi} The asthma strength is 160/18/4.8 mcg, not the COPD 160/9/4.8 strength. Maintenance only; never take extra triple-inhaler puffs for relief. Do not add another LABA or LAMA.`);
  add("spiriva", "Spiriva Respimat (asthma dose)", "lama", "unknown", "soft mist", "7b656b14-fcaa-2741-f6f0-e0be48971c02", "Use the 1.25 mcg/actuation device for asthma, not the COPD 2.5 mcg device or HandiHaler. Review glaucoma, urinary retention, and duplicate LAMA exposure. Not a reliever.");

  function preset(productId, suffix, strength, schedule, intensity, dailyIcs, role = "maintenance", extra = {}) {
    const product = PRODUCTS[productId], id = `${productId}-${suffix}`;
    PRESETS[id] = { id, productId, strength, schedule, intensity, dailyIcs, role, category: product.category, labaType: product.labaType, offLabel: false, ...extra };
  }
  for (const id of ["symbicort", "breyna"]) {
    preset(id, "80-bid", "80/4.5", "2 inhalations twice daily", "low", 400);
    preset(id, "160-bid", "160/4.5", "2 inhalations twice daily", "medium", 800);
    preset(id, "air", "160/4.5", "1 inhalation as needed for symptoms or before exercise", "unknown", 0, "air", { offLabel: true });
    preset(id, "smart-low", "160/4.5", "1 inhalation twice daily plus 1 as needed for symptoms or before exercise", "low", 400, "smartLow", { offLabel: true });
    preset(id, "smart-medium", "160/4.5", "2 inhalations twice daily plus 1 as needed for symptoms or before exercise", "medium", 800, "smartMedium", { offLabel: true });
    preset(id, "smart-once", "160/4.5", "1 inhalation once daily plus 1 as needed for symptoms or before exercise", "low", 200, "smartOnce", { offLabel: true });
  }
  for (const id of ["advair-diskus", "wixela"]) {
    for (const [strength, intensity, dose] of [["100/50", "low", 200], ["250/50", "medium", 500], ["500/50", "high", 1000]]) preset(id, strength.replace("/", "-"), strength, "1 inhalation twice daily", intensity, dose);
  }
  for (const [strength, intensity, dose] of [["45/21", "low", 200], ["115/21", "medium", 500], ["230/21", "high", 1000]]) preset("advair-hfa", strength.replace("/", "-"), strength, "2 inhalations twice daily", intensity, dose);
  preset("breo", "100", "100/25", "1 inhalation once daily", "low", 100);
  preset("breo", "200", "200/25", "1 inhalation once daily", "high", 200);
  // GINA's mometasone pMDI row does not distinguish low from medium reliably for this U.S. formulation.
  preset("dulera", "100", "100/5", "2 inhalations twice daily", "unknown", null);
  preset("dulera", "200", "200/5", "2 inhalations twice daily", "unknown", null);
  for (const [suffix, strength, schedule, intensity, dose] of [["40", "40", "1 inhalation twice daily", "low", 100], ["80", "80", "1 inhalation twice daily", "low", 200], ["160", "80", "2 inhalations twice daily", "medium", 400], ["320", "80", "4 inhalations twice daily", "high", 800]]) preset("qvar", suffix, strength, schedule, intensity, dose);
  preset("arnuity", "100", "100", "1 inhalation once daily", "low", 100);
  preset("arnuity", "200", "200", "1 inhalation once daily", "high", 200);
  for (const [suffix, strength, puffs, intensity, dose] of [["180", "180", 1, "low", 400], ["360", "180", 2, "medium", 800], ["720", "180", 4, "high", 1600]]) preset("pulmicort", suffix, strength, `${puffs} inhalation${puffs === 1 ? "" : "s"} twice daily`, intensity, dose);
  for (const [strength, intensity, dose] of [["44", "low", 200], ["110", "medium", 500], ["220", "high", 1000]]) preset("fluticasone-hfa", strength, strength, "2 inhalations twice daily", intensity, dose);
  preset("trelegy", "100", "100/62.5/25", "1 inhalation once daily", "low", 100);
  preset("trelegy", "200", "200/62.5/25", "1 inhalation once daily", "high", 200);
  preset("breztri", "asthma", "160/18/4.8", "2 inhalations twice daily", "medium", 800);
  preset("spiriva", "asthma", "1.25", "2 inhalations once daily", "unknown", 0);

  const RELIEVERS = {
    albuterol: { id: "albuterol", name: "Generic albuterol HFA", strength: "90", category: "saba", schedule: "2 inhalations every 4-6 hours as needed for symptoms", source: "6dc143e7-6bab-42c8-b3e9-9d604d202e73", administration: "Review pMDI technique and spacer use. Worsening symptoms or inadequate relief require reassessment." },
    ventolin: { id: "ventolin", name: "Ventolin HFA", strength: "90", category: "saba", schedule: "2 inhalations every 4-6 hours as needed for symptoms", source: "6dc143e7-6bab-42c8-b3e9-9d604d202e73", administration: "Review pMDI technique and spacer use. Worsening symptoms or inadequate relief require reassessment." },
    xopenex: { id: "xopenex", name: "Xopenex HFA / generic levalbuterol HFA", strength: "45", category: "saba", schedule: "2 inhalations every 4-6 hours as needed for symptoms", source: "70a35706-d7a8-4a48-98c6-1cab1c42fe8d", administration: "Review pMDI technique. More frequent or larger doses are not routinely recommended; reassess worsening symptoms." },
    airsupra: { id: "airsupra", name: "Airsupra", strength: "90/80", category: "ics-saba", schedule: "2 inhalations as needed for symptoms; maximum 6 doses (12 inhalations) in 24 hours", source: "e60aa9f9-5139-44df-b886-ebddc3c7eb13", administration: "Not a scheduled controller. Rinse and spit after use when possible. Seek care for inadequate relief or worsening symptoms." },
    "air-symbicort": { id: "air-symbicort", name: "Symbicort", strength: "160/4.5", category: "ics-formoterol", schedule: "1 inhalation as needed for symptoms or before exercise", source: "fafa4cf1-99c2-43d5-73ad-51f256de3be0", offLabel: true },
    "air-breyna": { id: "air-breyna", name: "Breyna", strength: "160/4.5", category: "ics-formoterol", schedule: "1 inhalation as needed for symptoms or before exercise", source: "dc529fc4-bddb-4673-8202-dc401f86166f", offLabel: true }
  };
  const getPreset = id => PRESETS[id] || null;
  const SOURCES = Object.fromEntries([...Object.values(PRODUCTS).map(p => [p.source.id, p.source]), ...Object.values(RELIEVERS).map(r => [r.id, { id: r.id, title: `${r.name}: U.S. prescribing information`, url: dailyMed(r.source) }])]);
  const presetsFor = id => Object.values(PRESETS).filter(p => p.productId === id);
  const label = p => `${PRODUCTS[p.productId].name} ${p.strength} mcg: ${p.schedule}`;
  const presetOptions = id => presetsFor(id).map(p => [p.id, `${p.strength} mcg: ${p.schedule}${p.offLabel ? " (guideline-supported, off-label)" : ""}`]);
  function prescription(p) {
    const product = PRODUCTS[p.productId];
    const device = p.productId === "spiriva" ? " Use the asthma 1.25 mcg/actuation device, for a total of 2.5 mcg/day. Do not duplicate LAMA therapy." : p.productId === "qvar" ? " Do not use a spacer with RediHaler. Rinse and spit after use." : product.device === "DPI" ? " Do not attach a spacer. Rinse and spit after use." : " Review technique and spacer use. Rinse and spit after scheduled doses.";
    return `${label(p)}.${p.role !== "maintenance" ? " Maximum 12 total inhalations in 24 hours, counting scheduled and as-needed use. Seek care for worsening symptoms or need beyond this limit. U.S. AIR/SMART use is off-label." : " Maintenance only, not for acute relief."}${device}`;
  }
  function relieverPrescription(r, current = {}) {
    if (!r) return null;
    if (r.category === "ics-formoterol") {
      if (current.controller === "triple") return `${r.name} ${r.strength} mcg: ${r.schedule}. Separate ICS-formoterol relief with a formoterol-containing triple controller is off-label in the U.S. Verify the combined formoterol exposure and individualized daily limit before prescribing. Combined daily limit and instructions: ***. Do not use the triple inhaler itself for relief.`;
      return `${r.name} ${r.strength} mcg: ${r.schedule}. Maximum 12 total budesonide-formoterol inhalations/day across maintenance and reliever use. U.S. AIR/SMART use is off-label. Seek care for worsening symptoms or inadequate relief.`;
    }
    return `${r.name} ${r.strength} mcg: ${r.schedule}. ${r.administration}`;
  }
  function resolveCurrent(input) {
    const d = { ...input };
    if (d.treatmentEntry !== "product") return d;
    const product = PRODUCTS[d.currentControllerProduct];
    const p = getPreset(d.currentControllerPreset);
    if (d.currentControllerProduct === "none") Object.assign(d, { controller: "none", icsDose: "unknown", labaType: "unknown" });
    else if (!product || product.category === "lama") Object.assign(d, { controller: "unknown", icsDose: "unknown", labaType: "unknown" });
    else {
      Object.assign(d, { controller: product.category, labaType: product.labaType, icsDose: "unknown" });
      if (p && p.productId === product.id) {
        d.icsDose = p.intensity === "unknown" && ["low", "medium", "high"].includes(input.icsDose) ? input.icsDose : p.intensity;
        if (p.role === "air") Object.assign(d, { controller: "none", reliever: "ics-formoterol" });
        if (["smartLow", "smartMedium", "smartOnce"].includes(p.role)) d.reliever = "ics-formoterol";
      }
    }
    if (!p || p.productId !== product?.id || p.role === "maintenance") {
      if (d.currentRelieverProduct === "none") d.reliever = "none";
      else d.reliever = RELIEVERS[d.currentRelieverProduct]?.category || input.reliever || "unknown";
    }
    return d;
  }
  function currentDescriptions(d) {
    if (d.treatmentEntry !== "product") return [];
    const p = getPreset(d.currentControllerPreset), product = PRODUCTS[d.currentControllerProduct];
    const out = [];
    if (p && p.productId === product?.id) out.push(`${label(p)}${p.offLabel ? " (guideline-supported off-label AIR/SMART use)" : ""}`);
    else if (product) out.push(`${product.name}, strength and schedule ***`);
    const r = RELIEVERS[d.currentRelieverProduct];
    if ((!p || p.role === "maintenance") && r) out.push(`${r.name} ${r.strength} mcg: ${r.schedule}`);
    return out;
  }
  function toMedication(p) {
    const product = PRODUCTS[p.productId];
    return { id: `inhaler-${p.id}`, name: label(p), detail: `${prescription(p)} ${product.administration}`, noteSchedule: prescription(p), offLabel: p.offLabel, sourceIds: [product.id], source: product.source };
  }
  function relieverMedication(r, d) {
    return { id: `reliever-${r.id}`, name: `${r.name} ${r.strength} mcg`, detail: relieverPrescription(r, d), offLabel: !!r.offLabel, sourceIds: [r.id], source: { id: r.id, title: `${r.name}: U.S. prescribing information`, url: dailyMed(r.source) } };
  }
  return { REVIEW_DATE, PRODUCTS, PRESETS, RELIEVERS, SOURCES, getPreset, presetsFor, presetOptions, label, prescription, relieverPrescription, resolveCurrent, currentDescriptions, toMedication, relieverMedication };
});
