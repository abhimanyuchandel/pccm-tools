(function (root, factory) {
  const catalog = typeof module !== "undefined" && module.exports ? require("./medications.js") : root.asthmaMedications;
  const inhalers = typeof module !== "undefined" && module.exports ? require("./inhalers.js") : root.asthmaInhalers;
  const plans = factory(catalog, inhalers);
  if (typeof module !== "undefined" && module.exports) module.exports = plans;
  if (root) root.asthmaPlans = plans;
})(typeof globalThis !== "undefined" ? globalThis : this, function (catalog, inhalers) {
  "use strict";

  const CONTROLLER_ACTIONS = ["start-controller", "stepup", "step5-review", "continue", "stepdown", "stepdown-conditional", "track2-alternative", "ics-protection", "resolve-reliever"];
  const CONFIRMATION_LABELS = {
    recentExacerbation: "Recent asthma exacerbation",
    priorIcu: "Prior ICU admission or life-threatening asthma", pregnant: "Pregnant",
    respiratoryInfection: "Current respiratory infection", travelling: "Upcoming travel or limited follow-up access",
    maintenanceOcs: "Maintenance oral corticosteroids",
    lamaAddon: "Already using a separate LAMA add-on"
  };

  function buildPlan(rec, selection) {
    const f = rec.findings, d = f.data, tx = f.treatment;
    const plan = { groups: [], confirmations: [], selections: {}, rejected: [], controllerActionIds: CONTROLLER_ACTIONS };
    if (rec.invalid || rec.emergency || f.acute.active) return plan;
    const has = id => rec.actions.some(action => action.id === id);
    const optimizedNow = d.adherence === "adequate" && d.technique === "correct" && d.accessBarrier === false;
    const option = (id, label, text, medicationIds = [], blockers = []) => ({ id, label, text, medicationIds, blockers });
    const choose = (id, title, placeholder, options) => {
      const requested = selection[id] || null;
      const selected = options.find(item => item.id === requested && !item.blockers.length) || null;
      if (requested && !selected) plan.rejected.push(`The previous ${title.toLowerCase()} choice is no longer supported. Select a plan based on the current findings.`);
      plan.selections[id] = selected?.id || null;
      const group = { id, title, placeholder, options, selected };
      plan.groups.push(group);
      return group;
    };
    const confirm = key => {
      if (d[key] === null && !plan.confirmations.some(item => item.key === key)) plan.confirmations.push({ key, label: CONFIRMATION_LABELS[key] });
    };
    if (d.smoking === "current" || rec.biologicCandidates.length) confirm("pregnant");

    const options = [];
    if (tx.maintenance && ["ics", "ics-formoterol", "ics-laba", "triple"].includes(d.controller)) {
      const blockers = tx.incompatible || d.controller === "ics" && d.reliever === "ics-formoterol" ? ["Resolve the unsupported controller and reliever combination first"] : d.controller === "triple" && d.lamaAddon === true ? ["Resolve duplicate LAMA exposure before continuing the regimen"] : d.icsDose === "unknown" || f.severe.unverifiedHighSmart ? ["Verify the current product and supported ICS dose intensity"] : ["unknown", "none"].includes(d.reliever) ? ["Document a compatible reliever"] : [];
      options.push(option("continue", "Continue current inhaled regimen", "Continue the current ICS-containing controller and compatible reliever at the documented doses.", [], blockers));
    }
    const proposed = f.proposedMedicationId;
    const optimizationReviewRequired = Boolean(proposed && tx.effectivePhase === "followup" && !optimizedNow);
    if (proposed) {
      const names = { air: "AIR-only", smartLow: "Low-dose SMART", smartMedium: "Medium-dose SMART" };
      const blockers = [];
      if (d.age === null) blockers.push("Verify adult age");
      if (optimizationReviewRequired) blockers.push("Review and address inhaler technique, adherence, and access before selecting a routine step-up");
      options.push(option(proposed, `${tx.effectivePhase === "initial" ? "Start" : "Change to"} ${names[proposed]}`, `${tx.effectivePhase === "initial" ? "Start" : "Change to"} ${names[proposed]}. ${catalog.MEDICATIONS[proposed].noteSchedule}${tx.combination ? " Stop the replaced ICS-LABA controller rather than adding a second LABA." : d.controller === "ics" ? " Replace the previous maintenance ICS inhaler with this regimen." : ""}`, [proposed], blockers));
      const intensity = proposed === "smartMedium" ? "medium" : "low";
      const category = proposed === "air" ? "ICS" : "ICS-LABA";
      const instruction = tx.effectivePhase === "initial" || !tx.maintenance ? "Start" : "Change to";
      options.push(option("track2", `Use ${intensity}-dose maintenance ${category} with a separate reliever`, `${instruction} ${intensity}-dose maintenance ${category}. Controller product, strength, and schedule: ***.${tx.combination ? " Replace the previous ICS-LABA controller; do not add a second LABA." : d.controller === "ics" ? " Replace the previous maintenance ICS inhaler with this regimen." : ""}`, [], blockers));
    }
    if (has("resolve-reliever")) {
      options.push(option("compatible-reliever", "Retain controller and replace incompatible reliever", "Continue the documented ICS-containing controller. Replace ICS-formoterol relief with the selected compatible reliever; do not duplicate LABAs."));
    }
    if (has("step5-review") && d.icsDose === "medium" && optimizedNow && !tx.incompatible) {
      options.push(option("highDose", "Choose a monitored high-dose ICS-LABA trial", "Change to a monitored high-dose ICS-LABA trial. Controller product, strength, and schedule: ***. Stop the previous combination controller and use the selected compatible reliever. Reassess benefit and steroid adverse effects after a limited 3-6-month trial; reduce to the lowest effective dose if there is no meaningful benefit.", [], d.age === null ? ["Verify adult age"] : []));
    }
    if (has("lama") && optimizedNow && !tx.incompatible) options.push(option("triple", "Replace the controller with an asthma-labeled triple inhaler", "Replace the current ICS-LABA with a selected asthma-labeled ICS-LABA-LAMA maintenance inhaler. Controller product, strength, and schedule: ***. Stop the replaced combination inhaler and any separate LAMA; provide a compatible independent reliever. The triple inhaler is not a rescue inhaler.", [], d.age === null ? ["Verify adult age"] : []));
    if (has("stepdown")) {
      const smart = d.controller === "ics-formoterol" && tx.track === 1;
      const schedule = smart && tx.step === "4" ? catalog.MEDICATIONS.smartLow.noteSchedule : smart && tx.step === "3" ? "Budesonide-formoterol 160/4.5 mcg, 1 scheduled inhalation once daily plus 1 as needed, maximum 12 total inhalations/day. U.S. SMART reliever use is off-label." : "Reduce maintenance ICS by 25-50% using the selected product. Reduced controller product, strength, and schedule: ***. Retain a compatible reliever.";
      options.push(option("stepdown", "Proceed with supervised step-down", `Reduce the maintenance ICS regimen. ${schedule} Record baseline control and lung function, provide instructions to resume the previous regimen if control worsens, and reassess in 4-8 weeks. Do not withdraw ICS completely.${d.priorIcu === true ? " Use particularly close supervision because of prior life-threatening asthma." : ""}`, smart && tx.step === "4" ? ["smartLow"] : []));
    } else if (d.stableMonths >= 3 && tx.maintenance && !tx.step5) {
      for (const key of ["recentExacerbation", "priorIcu", "pregnant", "respiratoryInfection", "travelling", "maintenanceOcs"]) confirm(key);
    }
    if (has("optimize") || has("clarify-regimen") || has("complete-control") || has("complete-initial")) {
      options.push(option("assessment", "Complete assessment and optimization before changing treatment", "Complete the documented treatment, symptom-control, and risk assessment. Address technique, adherence, access, exposures, and relevant comorbid contributors before choosing a routine treatment change. Retain appropriate ICS protection while completing this review."));
    }
    if (rec.biologicCandidates.length) {
      const current = options.find(item => item.id === "continue");
      const existing = !["none", "unknown"].includes(d.currentBiologic);
      if (current && !current.blockers.length) {
        const chosen = rec.biologicCandidates.find(item => item.id === f.selectedBiologicId);
        const eligible = chosen ? chosen.eligibleForReview : rec.biologicCandidates.some(item => item.eligibleForReview);
        const blockers = eligible ? [] : ["Complete the listed phenotype, safety, and dosing prerequisites before initiation"];
        if (!existing) options.splice(options.findIndex(item => item.id === "continue") + 1, 0, option("continue-biologic", "Continue current inhaled regimen and initiate a phenotype-matched biologic", "Continue the current ICS-containing controller and compatible reliever at the documented doses.", [], blockers));
        options.push(option("assess-biologic", existing ? "Continue inhaled regimen and review current biologic response" : "Continue inhaled regimen and complete biologic assessment", existing ? "Continue the current ICS-containing inhaled regimen. Assess response to the current biologic and review phenotype, treatment history, and a coordinated single-agent strategy before any switch." : "Continue the current ICS-containing inhaled regimen. Complete severe-asthma treatment-history review and outstanding phenotype, medication safety, and dosing assessments before choosing biologic initiation."));
      }
    }
    if (options.length) {
      const group = choose("controller", "Controller strategy", "Controller and reliever plan: ***", options);
      group.optimizationReviewRequired = optimizationReviewRequired;
      const strategy = group.selected?.id;
      const recordedPreset = inhalers.getPreset(d.currentControllerPreset);
      const currentPreset = d.treatmentEntry === "product" && recordedPreset?.productId === d.currentControllerProduct ? recordedPreset : null;
      if (["continue", "continue-biologic", "assess-biologic", "compatible-reliever"].includes(strategy) && d.treatmentEntry === "product" && currentPreset?.productId === d.currentControllerProduct) {
        group.selected = { ...group.selected, text: group.selected.text.replace("Continue the current ICS-containing controller and compatible reliever at the documented doses.", `Continue ${inhalers.prescription(currentPreset)}`).replace("Continue the documented ICS-containing controller.", `Continue ${inhalers.prescription(currentPreset)}`), inhalerMedications: [inhalers.toMedication(currentPreset)] };
        const rescue = inhalers.RELIEVERS[d.currentRelieverProduct];
        if (strategy !== "compatible-reliever" && currentPreset.role === "maintenance" && rescue && !selection.relieverProduct && !tx.incompatible) {
          group.selected.text += ` Continue ${inhalers.relieverPrescription(rescue, d)}`;
          group.selected.inhalerMedications.push(inhalers.relieverMedication(rescue, d));
        }
      }
      let eligible = [];
      if (["air", "smartLow", "smartMedium"].includes(strategy)) eligible = Object.values(inhalers.PRESETS).filter(p => p.role === strategy);
      else if (strategy === "track2") eligible = Object.values(inhalers.PRESETS).filter(p => p.role === "maintenance" && p.category === (proposed === "air" ? "ics" : "ics-laba") && p.intensity === (proposed === "smartMedium" ? "medium" : "low"));
      else if (strategy === "highDose") eligible = Object.values(inhalers.PRESETS).filter(p => p.role === "maintenance" && p.category === "ics-laba" && p.intensity === "high");
      else if (strategy === "triple") eligible = Object.values(inhalers.PRESETS).filter(p => p.category === "triple" && (d.icsDose === "high" ? p.intensity === "high" : ["medium", "high"].includes(p.intensity)));
      else if (["continue", "continue-biologic", "assess-biologic"].includes(strategy)) {
        if (d.controller === "ics-formoterol" && tx.track === 1) eligible = Object.values(inhalers.PRESETS).filter(p => p.role === (d.icsDose === "medium" ? "smartMedium" : currentPreset?.role === "smartOnce" ? "smartOnce" : "smartLow"));
        else eligible = Object.values(inhalers.PRESETS).filter(p => p.role === "maintenance" && p.category === (d.controller === "ics-formoterol" ? "ics-formoterol" : d.controller) && p.intensity === d.icsDose && (d.reliever !== "ics-formoterol" || p.labaType === "formoterol"));
      }
      else if (strategy === "stepdown") {
        if (d.controller === "ics-formoterol" && tx.track === 1) eligible = Object.values(inhalers.PRESETS).filter(p => p.role === (d.icsDose === "medium" ? "smartLow" : "smartOnce"));
        else if (d.treatmentEntry === "product" && currentPreset?.productId === d.currentControllerProduct && currentPreset.dailyIcs > 0) eligible = inhalers.presetsFor(currentPreset.productId).filter(p => p.role === "maintenance" && p.dailyIcs > 0 && p.dailyIcs / currentPreset.dailyIcs >= 0.5 && p.dailyIcs / currentPreset.dailyIcs <= 0.75);
      }
      if (eligible.length) {
        const products = choose("controllerProduct", "Controller prescription", "Controller product, strength, and schedule: ***", eligible.map(p => ({ ...option(p.id, inhalers.label(p), `${strategy === "stepdown" ? "Reduce to" : tx.effectivePhase === "initial" ? "Start" : "Use"} ${inhalers.prescription(p)}`), inhalerMedications: [inhalers.toMedication(p)] })));
        products.optional = ["continue", "continue-biologic", "assess-biologic"].includes(strategy);
        if (products.selected) {
          const sameProduct = products.selected.id === currentPreset?.id && d.treatmentEntry === "product";
          const caution = strategy === "stepdown" ? " Record baseline control and lung function, retain ICS protection, provide return-to-prior-treatment instructions, and reassess in 4-8 weeks." : strategy === "triple" ? " Stop the replaced ICS-LABA and any separate LAMA. Use a separate compatible reliever; never take extra triple-inhaler puffs for relief." : sameProduct ? " Continue this documented regimen without duplicate inhalers." : tx.combination ? " Stop the replaced ICS-LABA or triple controller; do not duplicate LABA/LAMA therapy." : d.controller === "ics" ? " Replace the prior ICS controller." : "";
          const trial = strategy === "highDose" ? " Use a monitored 3-6-month trial, reassess benefit and steroid adverse effects, and reduce to the lowest effective dose if there is no meaningful benefit." : "";
          const rescue = inhalers.RELIEVERS[d.currentRelieverProduct];
          const continuationRelief = products.optional && rescue && !selection.relieverProduct && ["saba", "ics-saba"].includes(d.reliever) ? ` Continue ${inhalers.relieverPrescription(rescue, d)}` : "";
          const biologicReview = strategy === "assess-biologic" ? " Review response to any current biologic and complete outstanding severe-asthma, phenotype, safety, and dosing review before initiating or switching biologic treatment." : "";
          group.selected = { ...group.selected, text: `${products.selected.text}${caution}${trial}${continuationRelief}${biologicReview}`, medicationIds: [], inhalerMedications: [...products.selected.inhalerMedications, ...(continuationRelief ? [inhalers.relieverMedication(rescue, d)] : [])] };
          products.selected = { ...products.selected, documentationOnly: true };
        }
      }
      if (["track2", "compatible-reliever", "highDose"].includes(group.selected?.id)) {
        choose("reliever", "Compatible reliever", "Compatible reliever and dosing: ***", [
          option("saba", "Continue or prescribe the documented SABA", "Use the documented SABA as needed for symptoms. Reliever product, strength, and schedule: ***. Retain the selected ICS-containing controller."),
          option("airsupra", "Albuterol-budesonide (Airsupra)", `Use albuterol-budesonide as the reliever. ${catalog.MEDICATIONS.airsupra.noteSchedule}`, ["airsupra"])
        ]);
      }
      const separateReliever = ["continue", "continue-biologic", "assess-biologic", "stepdown"].includes(strategy) && ["saba", "ics-saba"].includes(d.reliever) || ["track2", "compatible-reliever", "highDose", "triple"].includes(strategy);
      if (separateReliever) {
        const allowed = Object.values(inhalers.RELIEVERS).filter(r => ["saba", "ics-saba"].includes(r.category));
        const rescue = choose("relieverProduct", "Reliever prescription", "Reliever product, strength, and schedule: ***", allowed.map(r => ({ ...option(r.id, `${r.name} ${r.strength} mcg`, `Use ${inhalers.relieverPrescription(r, d)}`), inhalerMedications: [inhalers.relieverMedication(r, d)] })));
        rescue.optional = !["track2", "compatible-reliever", "highDose", "triple"].includes(strategy);
        const oldReliever = plan.groups.find(g => g.id === "reliever");
        if (rescue.selected && oldReliever) oldReliever.selected = { ...rescue.selected, documentationOnly: true };
      }
    }
    if (has("lama") && plan.selections.controller !== "triple") {
      confirm("lamaAddon");
      const lamaBlockers = [];
      if (d.lamaAddon !== false) lamaBlockers.push("Confirm no existing LAMA exposure before adding tiotropium");
      if (!optimizedNow) lamaBlockers.push("Review technique, adherence, and access before adding treatment");
      if (d.age === null) lamaBlockers.push("Verify adult age");
      choose("lama", "LAMA add-on", "LAMA add-on decision: ***", [
        option("defer", "Do not add LAMA at this visit", "Continue without a new LAMA add-on at this visit."),
        option("add", "Add tiotropium Respimat", `Add tiotropium Respimat. ${catalog.MEDICATIONS.tiotropium.noteSchedule}`, ["tiotropium"], lamaBlockers)
      ]);
    }
    Object.entries(selection).forEach(([id, value]) => {
      if (value && !plan.groups.some(group => group.id === id)) plan.rejected.push(`The previous ${id} choice no longer applies to this encounter and was cleared.`);
    });
    return plan;
  }

  function applyPlan(rec, selection = {}) {
    const plan = buildPlan(rec, selection.planSelections || {});
    rec.plan = plan;
    rec.cautions.push(...plan.rejected);
    for (const group of plan.groups) {
      if (!group.selected) continue;
      if (group.selected.documentationOnly) continue;
      const replace = group.id === "controller" ? CONTROLLER_ACTIONS : group.id === "lama" ? ["lama"] : [];
      rec.actions = rec.actions.filter(action => !replace.includes(action.id));
      rec.actions.push({ id: `chosen-${group.id}`, text: group.selected.text, noteText: group.selected.text, kind: "management", medicationIds: group.selected.medicationIds, sourceIds: ["gina"], selectedPlan: true });
    }
    if (["continue-biologic", "assess-biologic"].includes(plan.selections.controller)) {
      rec.actions = rec.actions.filter(action => !["biologic-review", "future-biologic"].includes(action.id));
      if (plan.selections.controller === "continue-biologic" && !rec.findings.selectedBiologicId) {
        rec.actions.find(action => action.id === "chosen-controller").text += " Add phenotype-matched biologic therapy after product safety and authorization requirements are completed. Biologic agent and dosing: ***.";
        rec.actions.find(action => action.id === "chosen-controller").noteText = rec.actions.find(action => action.id === "chosen-controller").text;
      }
    }
    if (plan.selections.controller === "continue-biologic") rec.actions = rec.actions.filter(action => action.id !== "azithromycin-review" && (action.id !== "lama" || plan.selections.lama));
    if (plan.selections.controller === "triple") rec.actions = rec.actions.filter(action => action.id !== "lama");
    if (plan.selections.controller === "stepdown") {
      const followup = rec.actions.find(action => action.id === "routine-followup");
      if (followup) followup.text = "Follow up in 4-8 weeks to reassess control, lung function, and response to step-down. Resume the previous regimen and contact the clinic if control worsens.";
    }
    const selectedPrescription = plan.groups.find(g => g.id === "controllerProduct")?.selected;
    if (selectedPrescription) rec.actions.forEach(action => { action.medicationIds = action.medicationIds.filter(id => !["air", "smartLow", "smartMedium", "highDose"].includes(id)); });
    if (plan.groups.some(group => group.id === "controller") && !plan.selections.controller) rec.findings.proposedMedicationId = null;
    else if (plan.selections.controller && catalog.MEDICATIONS[plan.selections.controller]) rec.findings.proposedMedicationId = plan.selections.controller;
  }

  return { buildPlan, applyPlan };
});
