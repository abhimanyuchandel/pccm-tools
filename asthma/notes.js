(function (root, factory) {
  const logic = typeof module !== "undefined" && module.exports ? require("./logic.js") : root.asthmaLogic;
  const notes = factory(logic);
  if (typeof module !== "undefined" && module.exports) module.exports = notes;
  if (root) root.asthmaNotes = notes;
})(typeof globalThis !== "undefined" ? globalThis : this, function (logic) {
  "use strict";

  const symptomDays = { none: "No daytime asthma symptoms", "one-two": "Daytime symptoms 1-2 days/week", three: "Daytime symptoms 3 days/week", "four-six": "Daytime symptoms 4-6 days/week", daily: "Daily daytime symptoms" };
  const nightWaking = { none: "no nocturnal waking due to asthma", "less-weekly": "nocturnal waking less than weekly", "weekly-plus": "nocturnal waking at least weekly" };
  const unique = lines => [...new Set(lines.filter(Boolean))];
  const sentence = text => /[.!?]$/.test(text.trim()) ? text.trim() : `${text.trim()}.`;

  function exacerbationHistory(d) {
    const parts = [];
    if (d.ocsExacerbations !== null) parts.push(`${d.ocsExacerbations} exacerbation${d.ocsExacerbations === 1 ? "" : "s"} requiring oral corticosteroids`);
    if (d.hospitalExacerbations !== null) parts.push(`${d.hospitalExacerbations} asthma hospitalization${d.hospitalExacerbations === 1 ? "" : "s"}`);
    return parts.length ? `In the past 12 months: ${parts.join("; ")}.` : "";
  }

  function buildSubjective(d, f) {
    const history = [];
    if (d.hpi) history.push(sentence(d.hpi));
    const symptoms = [symptomDays[d.symptomDays], nightWaking[d.nightWaking], d.activityLimitation === true ? "activity limitation due to asthma" : d.activityLimitation === false ? "no activity limitation due to asthma" : null].filter(Boolean);
    if (symptoms.length) history.push(`Over the last 4 weeks: ${symptoms.join("; ")}.`);
    if (f.control.sabaApplicable && d.sabaFrequency !== "unknown") history.push({ none: "No SABA use for symptoms reported.", "one-two": "SABA use for symptoms 1-2 times/week.", "more-two": "SABA use for symptoms more than twice/week." }[d.sabaFrequency] + " Pre-exercise use excluded.");
    if (!f.control.sabaApplicable && d.airUsesPerWeek !== null) history.push(`ICS-containing reliever use: ${d.airUsesPerWeek} times/week.`);
    if (d.urgentRedFlags === false && !f.acute.emergency) history.push("No urgent red-flag symptoms reported.");
    if (d.urgentRedFlags === true) history.push("Urgent red-flag symptoms reported.");
    history.push(exacerbationHistory(d));
    if (d.recentExacerbation === true) history.push("Recent asthma exacerbation reported.");
    if (d.recentExacerbation === false) history.push("No recent asthma exacerbation reported.");
    if (d.priorIcu === true) history.push("History of ICU admission, intubation, or life-threatening asthma.");
    if (d.priorIcu === false) history.push("No prior ICU admission, intubation, or life-threatening asthma reported.");
    if (d.currentMedicationText) history.push(`Current asthma therapy: ${sentence(d.currentMedicationText)}`);
    if (d.adherence !== "unknown") history.push(`Controller adherence ${d.adherence === "adequate" ? "reported as adequate" : "suboptimal"}.`);
    if (d.accessBarrier === true) history.push("Medication access / affordability barrier reported.");
    if (d.stableMonths !== null) history.push(`Reported duration of stable symptom control: ${d.stableMonths} months.`);
    if (d.smoking !== "unknown") history.push({ never: "Never smoked.", former: "Former smoker.", current: "Currently smoking." }[d.smoking]);
    if (d.exposureText) history.push(`Relevant exposures / triggers: ${sentence(d.exposureText)}`);
    if (d.allergenDriven === true) history.push("Symptoms associated with allergen exposure.");
    if (d.pregnant === true) history.push("Pregnant.");
    const vaccineNames = { flu: "influenza", covid: "COVID-19", pneumococcal: "pneumococcal", rsv: "RSV", zoster: "zoster", tdap: "Tdap / Td" };
    const vaccineHistory = Object.entries(vaccineNames).filter(([key]) => d[key] !== "unknown").map(([key, name]) => `${name} ${d[key] === "complete" ? "current / complete" : "due / incomplete"}`);
    if (vaccineHistory.length) history.push(`Documented vaccination status: ${vaccineHistory.join("; ")}.`);
    if (d.acuteHistory && f.acute.active) history.push(`Acute interval history: ${sentence(d.acuteHistory)}`);
    if (d.acuteTreatmentGiven && f.acute.active) history.push(`Treatment already given: ${sentence(d.acuteTreatmentGiven)}`);
    return unique(history).join(" ") || "Presenting history is not documented.";
  }

  function buildObjective(d, f) {
    const lines = [], vitals = [];
    if (d.heartRate !== null) vitals.push(`HR ${d.heartRate} bpm`);
    if (d.respiratoryRate !== null) vitals.push(`RR ${d.respiratoryRate}/min`);
    if (d.spo2 !== null) vitals.push(`SpO2 ${d.spo2}%${d.roomAir === true ? " on room air" : d.roomAir === false ? " (not a room-air measurement)" : ""}`);
    if (d.systolicBp !== null && d.diastolicBp !== null) vitals.push(`BP ${d.systolicBp}/${d.diastolicBp} mmHg`);
    else if (d.systolicBp !== null) vitals.push(`SBP ${d.systolicBp} mmHg`);
    else if (d.diastolicBp !== null) vitals.push(`DBP ${d.diastolicBp} mmHg`);
    if (d.temperature !== null) vitals.push(`Temperature ${d.temperature} degrees C`);
    if (d.weightKg !== null) vitals.push(`Weight ${d.weightKg} kg`);
    if (vitals.length) lines.push(`Vitals / anthropometrics: ${vitals.join("; ")}.`);
    if (d.exam) lines.push(`Examination: ${sentence(d.exam)}`);
    const pre = [], post = [];
    if (d.fev1Pre !== null) pre.push(`FEV1 ${d.fev1Pre} L`);
    if (d.fev1Predicted !== null) pre.push(`FEV1 ${d.fev1Predicted}% predicted`);
    if (d.fvcPre !== null) pre.push(`FVC ${d.fvcPre} L`);
    if (d.fvcPredicted !== null) pre.push(`FVC ${d.fvcPredicted}% predicted`);
    if (d.fev1Post !== null) post.push(`FEV1 ${d.fev1Post} L`);
    if (d.fvcPost !== null) post.push(`FVC ${d.fvcPost} L`);
    if (pre.length) lines.push(`Pre-bronchodilator spirometry: ${pre.join("; ")}.`);
    if (post.length) lines.push(`Post-bronchodilator spirometry: ${post.join("; ")}.`);
    if (f.diagnosis.bd.available) lines.push(f.diagnosis.bd.summary);
    if (["positive", "negative", "not-done"].includes(d.bronchoprovocation)) lines.push({ positive: "Bronchoprovocation testing positive.", negative: "Bronchoprovocation testing negative.", "not-done": "Bronchoprovocation testing not performed." }[d.bronchoprovocation]);
    if (d.pefVariability !== null) lines.push(`Average diurnal PEF variability: ${d.pefVariability}%.`);
    if (d.icsObjectiveResponse === true) lines.push("Objective airflow improvement after ICS documented.");
    const historical = [];
    if (d.dxBd) historical.push("bronchodilator responsiveness");
    if (d.dxChallenge) historical.push("positive bronchoprovocation");
    if (d.dxIcsObjective) historical.push("objective airflow improvement after ICS");
    if (d.dxPef) historical.push("excessive PEF variability");
    if (historical.length) lines.push(`Historical diagnostic evidence: ${historical.join("; ")}.`);
    const biomarkers = [];
    if (d.eosinophils !== null) biomarkers.push(`blood eosinophils ${d.eosinophils} cells/uL`);
    if (d.historicalEosinophils !== null) biomarkers.push(`historical eosinophils ${d.historicalEosinophils} cells/uL`);
    if (d.feno !== null) biomarkers.push(`FeNO ${d.feno} ppb`);
    if (d.totalIge !== null) biomarkers.push(`total IgE ${d.totalIge} IU/mL`);
    if (d.perennialSensitization === true) biomarkers.push("perennial aeroallergen sensitization confirmed");
    if (d.perennialSensitization === false) biomarkers.push("perennial aeroallergen sensitization not confirmed");
    if (biomarkers.length) lines.push(`Phenotype testing: ${biomarkers.join("; ")}.`);
    if (d.technique !== "unknown") lines.push(`Inhaler technique ${d.technique === "correct" ? "assessed as correct" : "incorrect / inconsistent"}.`);
    if (f.acute.active) {
      const acute = [];
      if (d.acuteSpeech !== "unknown") acute.push(`speech: ${{ sentences: "full sentences", phrases: "phrases", unable: "unable to speak normally" }[d.acuteSpeech]}`);
      if (d.acuteMentalStatus !== "unknown") acute.push(`mental status: ${d.acuteMentalStatus}`);
      if (d.acuteAirEntry !== "unknown") acute.push(`air entry: ${d.acuteAirEntry === "silent" ? "silent chest" : d.acuteAirEntry}`);
      if (d.acuteAccessoryMuscles !== "unknown") acute.push(`accessory muscle use: ${d.acuteAccessoryMuscles === "marked" ? "marked" : "none / mild"}`);
      if (d.acuteCyanosis === true) acute.push("cyanosis present");
      if (d.acuteCyanosis === false) acute.push("no cyanosis observed");
      if (d.acuteCannotDrink === true) acute.push("unable to drink");
      if (d.acuteUnableToLieDown === true) acute.push("unable to lie down");
      if (acute.length) lines.push(`Acute assessment: ${acute.join("; ")}.`);
      const reference = d.acuteLungFunctionReference === "personal-best" ? "personal best" : d.acuteLungFunctionReference === "predicted" ? "predicted" : "reference not documented";
      const measurement = d.acuteLungFunctionType === "unknown" ? "PEF / FEV1" : d.acuteLungFunctionType.toUpperCase();
      if (d.acuteLungFunctionPercent !== null) lines.push(`${measurement}: ${d.acuteLungFunctionPercent}% (${reference}).`);
      const response = [];
      if (d.acuteResponse !== "unknown") response.push(`clinical response ${d.acuteResponse}`);
      if (d.postTreatmentSpo2 !== null) response.push(`SpO2 ${d.postTreatmentSpo2}%${d.postTreatmentRoomAir === true ? " on room air" : d.postTreatmentRoomAir === false ? " (not a room-air measurement)" : " (oxygen conditions not documented)"}`);
      if (d.postTreatmentRespiratoryRate !== null) response.push(`RR ${d.postTreatmentRespiratoryRate}/min`);
      if (d.postTreatmentLungFunctionPercent !== null) response.push(`${measurement} ${d.postTreatmentLungFunctionPercent}% (${reference})`);
      if (d.postTreatmentMildFeatures === true) response.push("only mild clinical features remain");
      if (d.observationMinutes !== null) response.push(`observation after last bronchodilator ${d.observationMinutes} minutes`);
      if (response.length) lines.push(`Documented reassessment: ${response.join("; ")}.`);
    }
    return lines.length ? lines.map(line => `- ${line}`).join("\n") : "Objective measurements and examination are not documented.";
  }

  function buildAssessment(d, f) {
    const patient = d.age === null ? "Adult patient" : `${d.age}-year-old patient`;
    let diagnosis = f.diagnosis.confirmed ? `with asthma supported by ${f.diagnosis.evidence.join(" and ")}` : f.diagnosis.established ? "with an established clinical diagnosis of asthma; original objective diagnostic evidence is not documented here" : "with suspected asthma requiring objective confirmation";
    const paragraphs = [`${patient} ${diagnosis}, presenting for ${f.acute.active ? "an acute exacerbation / reassessment" : f.treatment.effectivePhase === "followup" ? "follow-up" : "initial management"}.`];
    if (f.acute.active || f.acute.emergency) paragraphs.push(f.acute.summary);
    paragraphs.push(`Current therapy: ${f.treatment.description}${d.currentMedicationText ? ` (${d.currentMedicationText.replace(/[.!?]+$/, "")})` : ""}; reliever ${f.treatment.relieverName}.`);
    if (!["none", "unknown"].includes(d.currentBiologic)) paragraphs.push(`Current biologic: ${logic.MEDICATIONS[d.currentBiologic].name}${d.biologicMonths === null ? "" : ` for ${d.biologicMonths} months`}.`);
    if (d.maintenanceOcs === true) paragraphs.push(`Maintenance systemic corticosteroids${d.maintenanceOcsDose === null ? "" : ` at prednisone-equivalent ${d.maintenanceOcsDose} mg/day`} are documented.`);
    paragraphs.push(`GINA symptom control is ${f.control.classification}${f.control.complete ? "" : " (remaining symptom / reliever history is incomplete)"}.`);
    if (f.risk.complete && !f.risk.anyExacerbation) paragraphs.push("No exacerbations requiring oral corticosteroids or hospitalization are documented in the past year.");
    else if (f.risk.anyExacerbation) paragraphs.push("A systemic-steroid-treated or hospitalized exacerbation is documented in the past year.");
    if (f.risk.elevated) paragraphs.push(`Future-risk considerations include ${f.risk.factors.join("; ")}.`);
    const phenotype = [];
    if (d.eosinophils !== null && d.eosinophils >= 150 || d.historicalEosinophils !== null && d.historicalEosinophils >= 300) phenotype.push("eosinophilic inflammation");
    if (d.feno >= 25) phenotype.push("elevated FeNO");
    if (d.perennialSensitization === true) phenotype.push("confirmed perennial allergic sensitization");
    if (d.nasalPolyps === true) phenotype.push("nasal polyposis");
    if (d.atopicDermatitis === true) phenotype.push("atopic dermatitis");
    if (phenotype.length) paragraphs.push(`Relevant phenotype / comorbidities: ${phenotype.join(", ")}.`);
    if (d.egpa === "suspected") paragraphs.push("EGPA is suspected and requires evaluation; it is not established.");
    if (d.egpa === "confirmed") paragraphs.push("Confirmed EGPA warrants coordinated indication-specific treatment.");
    if (f.severe.established) paragraphs.push("Persistent inadequate control / steroid burden despite documented optimized high-dose ICS-LABA supports severe asthma assessment.");
    if (f.proposedMedicationId) paragraphs.push(`Proposed treatment change: ${logic.MEDICATIONS[f.proposedMedicationId].name}; this is distinct from the current regimen.`);
    if (d.clinicianContext) paragraphs.push(sentence(d.clinicianContext));
    return paragraphs.join(" ");
  }

  function buildPlan(d, rec) {
    const f = rec.findings, groups = [], actions = rec.actions.filter(item => item.kind !== "alternative");
    const addGroup = (heading, items) => { if (items.length) groups.push({ heading, items: unique(items) }); };
    const management = [], testing = [], counseling = [], prevention = [], followup = [], cautions = [];
    actions.forEach(item => {
      let text = item.text;
      if (item.id === "future-biologic") text = "If control remains inadequate despite optimized high-dose ICS-LABA, consider phenotype-matched biologic therapy at follow-up after verifying eligibility and completing any necessary testing.";
      if (item.id === "selected-biologic") text = text.replace("Clinician-selected option:", "Biologic option for review:").replace("clinician-selected ", "");
      if (item.kind === "prevention") prevention.push(text);
      else if (item.kind === "counseling") counseling.push(text);
      else if (item.kind === "testing") testing.push(text);
      else if (item.kind === "followup" || item.kind === "monitoring") followup.push(text);
      else management.push(text);
    });
    // Only actionable regimen references and the clinician's chosen biologic belong in the note.
    rec.medications.forEach(med => {
      const selectedBiologic = f.selectedBiologicId === med.id;
      const regimen = f.proposedMedicationId === med.id || med.id === "tiotropium" || med.id === "highDose" && rec.actions.some(item => item.id === "step5-review") || f.acute.active && med.id === "air";
      if (selectedBiologic || regimen) {
        let detail = med.noteDetail || med.detail;
        if (med.id === "highDose") detail = detail.replace("If a monitored higher-ICS trial is selected", "If pursuing a monitored higher-ICS trial");
        if (med.id === "dupilumab") detail = d.maintenanceOcs === true || d.atopicDermatitis === true || d.nasalPolyps === true ? "If proceeding after eligibility / safety review: dupilumab 600 mg SC loading dose, followed by 300 mg SC every 2 weeks for asthma with the documented OCS dependence / qualifying Type 2 comorbidity. Review eosinophilia / EGPA risk; supervise steroid reduction." : "If proceeding after eligibility / safety review: proposed asthma schedule is dupilumab 400 mg SC loading dose followed by 200 mg SC every 2 weeks. Verify concurrent indications and the final prescription; review eosinophilia / EGPA risk and supervise steroid reduction.";
        if (d.egpa === "confirmed" && med.id === "mepolizumab") detail = "For coexisting confirmed EGPA, review coordinated mepolizumab 300 mg SC every 4 weeks under the EGPA indication; the asthma-only 100 mg schedule must not be substituted for EGPA dosing. Confirm the treatment indication and joint management plan before ordering.";
        if (d.egpa === "confirmed" && med.id === "benralizumab") detail = "For coexisting confirmed EGPA, review coordinated benralizumab 30 mg SC every 4 weeks under the EGPA indication; do not substitute the asthma maintenance interval of every 8 weeks. Confirm the treatment indication and joint management plan before ordering.";
        if (med.id === "omalizumab") {
          const feasibility = logic.getOmalizumabFeasibility(d), dose = feasibility.feasible ? feasibility.dose : null;
          detail = dose ? `Omalizumab: ${dose.doseMg} mg subcutaneously every ${dose.intervalWeeks} weeks based on pretreatment IgE and weight under the adult asthma table. Confirm perennial aeroallergen sensitization and product safety requirements.` : "Omalizumab dose cannot be specified until a valid pretreatment IgE / weight table assessment and sensitization confirmation are complete.";
        }
        management.push(`${selectedBiologic ? "Medication details for the considered biologic" : "Medication details"}: ${detail}`);
      }
    });
    if (f.treatment.incompatible) cautions.push("Resolve the controller / reliever LABA mismatch; do not layer an ICS-formoterol reliever onto a controller containing a different LABA.");
    if (logic.getDupilumabEvidenceFlag(d).above1500 && !f.acute.emergency) cautions.push("Current or historical eosinophils above 1500 cells/uL require evaluation before routine dupilumab selection; this is a guideline evidence caution, not an FDA contraindication.");
    if (d.eosinophils >= 1500 || d.historicalEosinophils >= 1500) cautions.push("Evaluate marked eosinophilia for EGPA, hypereosinophilic disease, and other causes before attributing it to asthma alone.");
    if (d.endemicExposure === true && (d.eosinophils >= 300 || d.historicalEosinophils >= 300)) cautions.push("Consider parasite evaluation before systemic corticosteroids / biologic treatment when epidemiologically indicated.");
    if (d.counselingDocumented) counseling.push(`Counseling documented as performed: ${sentence(d.counselingDocumented)}`);
    addGroup(rec.emergency ? "Urgent management" : "Medication / management", management);
    if (prevention.some(text => text.startsWith("Review vaccination records; if due, "))) {
      for (let i = 0; i < prevention.length; i++) if (prevention[i].startsWith("Review vaccination records; if due, ")) prevention[i] = prevention[i].replace("Review vaccination records; if due, ", "If due after reviewing records, ");
    }
    addGroup("Testing", testing); addGroup("Counseling and asthma action plan", counseling); addGroup("Preventive care", prevention); addGroup("Monitoring and follow-up", followup); addGroup("Clinical cautions", cautions);
    return groups.map((group, index) => `${index + 1}. ${group.heading}\n${group.items.map(text => `- ${text}`).join("\n")}`).join("\n\n");
  }

  function buildNoteText(input, recommendation) {
    const d = logic.normalizeState(input), rec = recommendation || logic.buildRecommendation(d);
    if (rec.invalid) return "";
    return `Subjective\n${buildSubjective(d, rec.findings)}\n\nObjective\n${buildObjective(d, rec.findings)}\n\nAssessment\n${buildAssessment(d, rec.findings)}\n\nPlan\n${buildPlan(d, rec)}`;
  }
  return { buildNoteText };
});
