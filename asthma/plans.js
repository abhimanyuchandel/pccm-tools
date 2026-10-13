(function (root, factory) {
  const catalog = typeof module !== "undefined" && module.exports ? require("./medications.js") : root.asthmaMedications;
  const plans = factory(catalog);
  if (typeof module !== "undefined" && module.exports) module.exports = plans;
  if (root) root.asthmaPlans = plans;
})(typeof globalThis !== "undefined" ? globalThis : this, function (catalog) {
  "use strict";

  const CONTROLLER_ACTIONS = ["start-controller", "stepup", "step5-review", "continue", "stepdown", "stepdown-conditional", "track2-alternative", "ics-protection", "resolve-reliever"];
  const CONFIRMATION_LABELS = {
    activityLimitation: "Activity limitation due to asthma", recentExacerbation: "Recent asthma exacerbation",
    priorIcu: "Prior ICU admission or life-threatening asthma", pregnant: "Pregnant",
    respiratoryInfection: "Current respiratory infection", travelling: "Upcoming travel or limited follow-up access",
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
    if (d.symptomDays !== "unknown" && d.nightWaking !== "unknown") confirm("activityLimitation");
    if (d.smoking === "current" || rec.biologicCandidates.length) confirm("pregnant");

    const options = [];
    if (tx.maintenance && ["ics", "ics-formoterol", "ics-laba", "triple"].includes(d.controller)) {
      const blockers = tx.incompatible || d.controller === "ics" && d.reliever === "ics-formoterol" ? ["Resolve the unsupported controller and reliever combination first"] : d.icsDose === "unknown" || f.severe.unverifiedHighSmart ? ["Verify the current product and supported ICS dose intensity"] : ["unknown", "none"].includes(d.reliever) ? ["Document a compatible reliever"] : [];
      options.push(option("continue", "Continue current inhaled regimen", "Continue the current ICS-containing controller and compatible reliever at the documented doses.", [], blockers));
    }
    const proposed = f.proposedMedicationId;
    if (proposed && (tx.effectivePhase === "initial" || optimizedNow)) {
      const names = { air: "AIR-only", smartLow: "Low-dose SMART", smartMedium: "Medium-dose SMART" };
      options.push(option(proposed, `${tx.effectivePhase === "initial" ? "Start" : "Change to"} ${names[proposed]}`, `${tx.effectivePhase === "initial" ? "Start" : "Change to"} ${names[proposed]}. ${catalog.MEDICATIONS[proposed].noteSchedule}${tx.combination ? " Stop the replaced ICS-LABA controller rather than adding a second LABA." : ""}`, [proposed], d.age === null ? ["Verify adult age"] : []));
      const intensity = proposed === "smartMedium" ? "medium" : "low";
      const category = proposed === "air" ? "ICS" : "ICS-LABA";
      options.push(option("track2", `Use ${intensity}-dose maintenance ${category} with a separate reliever`, `Start or adjust ${intensity}-dose maintenance ${category}. Controller product, strength, and schedule: ***.`, [], d.age === null ? ["Verify adult age"] : []));
    }
    if (has("resolve-reliever")) {
      options.push(option("compatible-reliever", "Retain controller and replace incompatible reliever", "Continue the documented ICS-containing controller. Replace ICS-formoterol relief with the selected compatible reliever; do not duplicate LABAs."));
    }
    if (has("step5-review") && d.icsDose === "medium" && optimizedNow && !f.severe.previouslyEstablished && !tx.incompatible) {
      options.push(option("highDose", "Choose a monitored high-dose ICS-LABA trial", "Change to fluticasone propionate/salmeterol 500/50 mcg, 1 inhalation twice daily. Stop the previous combination controller and use the selected compatible reliever. Reassess benefit and steroid adverse effects after a limited 3-6-month trial; reduce to the lowest effective dose if there is no meaningful benefit.", ["highDose"], d.age === null ? ["Verify adult age"] : []));
    }
    if (has("stepdown")) {
      const smart = d.controller === "ics-formoterol" && tx.track === 1;
      const schedule = smart && tx.step === "4" ? catalog.MEDICATIONS.smartLow.noteSchedule : smart && tx.step === "3" ? "Budesonide-formoterol 160/4.5 mcg, 1 scheduled inhalation once daily plus 1 as needed, maximum 12 total inhalations/day. U.S. SMART reliever use is off-label." : "Reduce maintenance ICS by 25-50% using the selected product. Reduced controller product, strength, and schedule: ***. Retain a compatible reliever.";
      options.push(option("stepdown", "Proceed with supervised step-down", `Reduce the maintenance ICS regimen. ${schedule} Record baseline control and lung function, provide instructions to resume the previous regimen if control worsens, and reassess in 4-8 weeks. Do not withdraw ICS completely.${d.priorIcu === true ? " Use particularly close supervision because of prior life-threatening asthma." : ""}`, smart && tx.step === "4" ? ["smartLow"] : []));
    } else if (d.stableMonths >= 3 && tx.maintenance && !tx.step5 && !f.severe.previouslyEstablished) {
      for (const key of ["recentExacerbation", "priorIcu", "pregnant", "respiratoryInfection", "travelling"]) confirm(key);
    }
    if (has("optimize") || has("clarify-regimen") || has("complete-control") || has("complete-initial")) {
      options.push(option("assessment", "Complete assessment and optimization before changing treatment", "Complete the documented treatment, symptom-control, and risk assessment. Address technique, adherence, access, exposures, and relevant comorbid contributors before choosing a routine treatment change. Retain appropriate ICS protection while completing this review."));
    }
    if (options.length) {
      const group = choose("controller", "Controller strategy", "Controller and reliever plan: ***", options);
      if (["track2", "compatible-reliever", "highDose"].includes(group.selected?.id)) {
        choose("reliever", "Compatible reliever", "Compatible reliever and dosing: ***", [
          option("saba", "Continue or prescribe the documented SABA", "Use the documented SABA as needed for symptoms. Reliever product, strength, and schedule: ***. Retain the selected ICS-containing controller."),
          option("airsupra", "Albuterol-budesonide (Airsupra)", `Use albuterol-budesonide as the reliever. ${catalog.MEDICATIONS.airsupra.noteSchedule}`, ["airsupra"])
        ]);
      }
    }
    if (has("lama")) {
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
      const replace = group.id === "controller" ? CONTROLLER_ACTIONS : group.id === "lama" ? ["lama"] : [];
      rec.actions = rec.actions.filter(action => !replace.includes(action.id));
      rec.actions.push({ id: `chosen-${group.id}`, text: group.selected.text, noteText: group.selected.text, kind: "management", medicationIds: group.selected.medicationIds, sourceIds: ["gina"], selectedPlan: true });
    }
    if (plan.selections.controller === "stepdown") {
      const followup = rec.actions.find(action => action.id === "routine-followup");
      if (followup) followup.text = "Follow up in 4-8 weeks to reassess control, lung function, and response to step-down. Resume the previous regimen and contact the clinic if control worsens.";
    }
    if (plan.groups.some(group => group.id === "controller") && !plan.selections.controller) rec.findings.proposedMedicationId = null;
    else if (plan.selections.controller && catalog.MEDICATIONS[plan.selections.controller]) rec.findings.proposedMedicationId = plan.selections.controller;
  }

  return { buildPlan, applyPlan };
});
