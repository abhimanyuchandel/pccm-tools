(function (root, factory) {
  const logic = typeof module !== "undefined" && module.exports ? require("./logic.js") : root.asthmaLogic;
  const notes = factory(logic);
  if (typeof module !== "undefined" && module.exports) module.exports = notes;
  if (root) root.asthmaNotes = notes;
})(typeof globalThis !== "undefined" ? globalThis : this, function (logic) {
  "use strict";

  const unique = lines => [...new Set(lines.filter(Boolean))];
  const proseList = values => values.length < 2 ? values.join("") : values.length === 2 ? values.join(" and ") : `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
  const days = { none: "no daytime symptoms", "one-two": "daytime symptoms 1-2 days/week", three: "daytime symptoms 3 days/week", "four-six": "daytime symptoms 4-6 days/week", daily: "daily daytime symptoms" };
  const nights = { none: "no nocturnal waking", "less-weekly": "nocturnal waking less than weekly", "weekly-plus": "nocturnal waking at least weekly" };

  function subjective(d, f) {
    const lines = [], symptoms = [days[d.symptomDays], nights[d.nightWaking], d.activityLimitation === true ? "activity limitation due to asthma" : d.activityLimitation === false ? "no activity limitation due to asthma" : null].filter(Boolean);
    if (symptoms.length) lines.push(`During the preceding 4 weeks, the patient had ${symptoms.join("; ")}.`);
    if (f.control.sabaApplicable && d.sabaFrequency !== "unknown") lines.push({ none: "No symptomatic SABA use was reported.", "one-two": "Symptomatic SABA use was reported 1-2 times/week.", "more-two": "Symptomatic SABA use was reported more than twice/week." }[d.sabaFrequency] + " Pre-exercise use was excluded.");
    if (!f.control.sabaApplicable && d.airUsesPerWeek !== null) lines.push(`ICS-containing reliever use was reported ${d.airUsesPerWeek} times/week.`);
    if (d.urgentRedFlags === false && !f.acute.emergency) lines.push("No urgent red-flag features were documented.");
    if (d.urgentRedFlags === true) lines.push("Urgent red-flag symptoms were reported.");
    if (f.risk.complete && !f.risk.anyExacerbation) lines.push("No exacerbations requiring oral corticosteroids or hospitalization were reported in the preceding 12 months.");
    else {
      const counts = [];
      if (d.ocsExacerbations !== null) counts.push(`${d.ocsExacerbations} exacerbation${d.ocsExacerbations === 1 ? "" : "s"} requiring oral corticosteroids`);
      if (d.hospitalExacerbations !== null) counts.push(`${d.hospitalExacerbations} asthma hospitalization${d.hospitalExacerbations === 1 ? "" : "s"}`);
      if (counts.length) lines.push(`The preceding 12-month history included ${counts.join("; ")}.`);
    }
    if (d.recentExacerbation === true) lines.push(f.acute.recentResolved ? "The patient was seen after a recent resolved exacerbation." : "A recent exacerbation was reported.");
    if (d.priorIcu === true) lines.push("The history included ICU admission, intubation, or life-threatening asthma.");
    if (d.priorIcu === false) lines.push("No prior ICU admission, intubation, or life-threatening asthma was reported.");
    if (d.adherence !== "unknown") lines.push(d.adherence === "adequate" ? "No controller-adherence concern was identified." : "Suboptimal controller adherence was identified.");
    if (d.accessBarrier === true) lines.push("A medication access / affordability barrier was identified.");
    if (d.stableMonths !== null) lines.push(`Stable symptom control had been maintained for ${d.stableMonths} months.`);
    if (d.smoking !== "unknown") lines.push({ never: "The smoking history was negative.", former: "The patient was a former smoker.", current: d.smokingCigarettesPerDay > 0 ? `The patient reported smoking ${d.smokingCigarettesPerDay} cigarettes daily.` : "The patient was currently smoking." }[d.smoking]);
    if (d.allergenDriven === true) lines.push("Symptoms were associated with allergen exposure.");
    if (d.pregnant === true) lines.push("Pregnancy was documented.");
    const vaccines = { flu: "influenza", covid: "COVID-19", pneumococcal: "pneumococcal", rsv: "RSV", zoster: "zoster", tdap: "Tdap / Td" };
    const history = Object.entries(vaccines).filter(([key]) => d[key] !== "unknown").map(([key, name]) => `${name} ${d[key] === "complete" ? "current / complete" : "due / incomplete"}`);
    if (history.length) lines.push(`Recorded vaccination status was: ${history.join("; ")}.`);
    let text = `Additional interval history: ***\nCurrent medications, strengths, and schedule: ***`;
    if (lines.length) text += `\n${unique(lines).join(" ")}`;
    if (f.acute.active) text += "\nAcute symptom progression: ***\nTreatment administered, dose, and timing: ***";
    return text;
  }

  function objective(d, f) {
    const lines = [];
    if (f.acute.active || f.acute.emergency) {
      if (d.respiratoryRate !== null) lines.push(`Respiratory rate: ${d.respiratoryRate}/min.`);
      if (d.spo2 !== null) lines.push(`SpO2: ${d.spo2}%${d.roomAir === true ? " on room air" : d.roomAir === false ? " (not a room-air measurement)" : " (oxygen conditions not documented)"}.`);
    }
    if (["omalizumab", "reslizumab"].includes(f.selectedBiologicId) && d.weightKg !== null) lines.push(`Verified weight: ${d.weightKg} kg.`);
    const pre = [], post = [];
    if (d.fev1Pre !== null) pre.push(`FEV1 ${d.fev1Pre} L`);
    if (d.fvcPre !== null) pre.push(`FVC ${d.fvcPre} L`);
    if (d.fev1Predicted !== null) pre.push(`FEV1 ${d.fev1Predicted}% predicted`);
    if (d.fvcPredicted !== null) pre.push(`FVC ${d.fvcPredicted}% predicted`);
    if (d.fev1Post !== null) post.push(`FEV1 ${d.fev1Post} L`);
    if (d.fvcPost !== null) post.push(`FVC ${d.fvcPost} L`);
    if (pre.length) lines.push(`Pre-bronchodilator spirometry: ${pre.join("; ")}.`);
    if (post.length) lines.push(`Post-bronchodilator spirometry: ${post.join("; ")}.`);
    const bd = f.diagnosis.bd;
    if (bd.available) {
      const changes = [];
      if (bd.fev1DeltaMl !== null) changes.push(`FEV1 changed by ${bd.fev1DeltaMl.toFixed(0)} mL (${bd.fev1Percent.toFixed(1)}% from baseline)`);
      if (bd.fvcDeltaMl !== null) changes.push(`FVC changed by ${bd.fvcDeltaMl.toFixed(0)} mL (${bd.fvcPercent.toFixed(1)}% from baseline)`);
      lines.push(`${changes.join("; ")}. The GINA adult bronchodilator criterion was ${bd.positive ? "met" : "not met"}.`);
      if (bd.fev1PredictedDeltaPercent !== null || bd.fvcPredictedDeltaPercent !== null) lines.push(`The separate ATS/ERS greater-than-10%-of-predicted responsiveness criterion was ${bd.atsErsPositive ? "met" : "not met"}.`);
    }
    if (d.bronchoprovocation !== "unknown") lines.push({ positive: "Bronchoprovocation testing was positive.", negative: "Bronchoprovocation testing was negative.", "not-done": "Bronchoprovocation testing had not been performed." }[d.bronchoprovocation]);
    if (d.pefVariability !== null) lines.push(`Average diurnal PEF variability was ${d.pefVariability}%.`);
    if (d.icsObjectiveResponse === true) lines.push("Objective airflow improvement after ICS had been documented.");
    const evidence = [];
    if (d.dxBd) evidence.push("bronchodilator responsiveness");
    if (d.dxIcsObjective) evidence.push("objective airflow improvement after ICS");
    if (d.dxChallenge) evidence.push("positive bronchoprovocation");
    if (d.dxPef) evidence.push("excessive PEF variability");
    if (evidence.length) lines.push(`Historical diagnostic evidence included ${evidence.join("; ")}.`);
    const markers = [];
    if (d.eosinophils !== null) markers.push(`blood eosinophils ${d.eosinophils} cells/uL`);
    if (d.historicalEosinophils !== null) markers.push(`historical blood eosinophils ${d.historicalEosinophils} cells/uL`);
    if (d.feno !== null) markers.push(`FeNO ${d.feno} ppb`);
    if (f.selectedBiologicId === "omalizumab" && d.totalIge !== null) markers.push(`${d.igePretreatment === true ? "pretreatment " : ""}total IgE ${d.totalIge} IU/mL`);
    if (markers.length) lines.push(`Available biomarkers were ${markers.join("; ")}.`);
    if (d.perennialSensitization === true) lines.push("Perennial aeroallergen sensitization had been confirmed.");
    if (d.perennialSensitization === false) lines.push("Perennial aeroallergen sensitization had not been confirmed.");
    if (d.technique === "incorrect") lines.push("An inhaler-technique concern was identified.");
    if (d.technique === "correct") lines.push("No inhaler-technique concern was identified.");
    if (f.acute.active || f.acute.emergency) {
      const features = [];
      if (d.acuteSpeech !== "unknown") features.push(`speech: ${{ sentences: "full sentences", phrases: "phrases", unable: "unable to speak normally" }[d.acuteSpeech]}`);
      if (d.acuteMentalStatus !== "unknown") features.push(`mental status: ${d.acuteMentalStatus}`);
      if (d.acuteAirEntry !== "unknown") features.push(`air entry: ${d.acuteAirEntry === "silent" ? "silent chest" : d.acuteAirEntry}`);
      if (d.acuteCyanosis === true) features.push("cyanosis present");
      if (d.acuteCannotDrink === true) features.push("unable to drink");
      if (d.acuteUnableToLieDown === true) features.push("unable to lie down");
      if (features.length) lines.push(`Recorded acute findings were ${features.join("; ")}.`);
      const reference = d.acuteLungFunctionReference === "personal-best" ? "personal best" : d.acuteLungFunctionReference === "predicted" ? "predicted" : "reference not documented";
      const measure = d.acuteLungFunctionType === "unknown" ? "PEF / FEV1" : d.acuteLungFunctionType.toUpperCase();
      if (d.acuteLungFunctionPercent !== null) lines.push(`${measure} was ${d.acuteLungFunctionPercent}% (${reference}).`);
      if (f.acute.reassessmentAvailable) {
        const repeat = [];
        if (d.acuteResponse !== "unknown") repeat.push(`clinical response ${d.acuteResponse}`);
        if (d.postTreatmentSpo2 !== null) repeat.push(`SpO2 ${d.postTreatmentSpo2}%${d.postTreatmentRoomAir === true ? " on room air" : " (room-air measurement not confirmed)"}`);
        if (d.postTreatmentRespiratoryRate !== null) repeat.push(`RR ${d.postTreatmentRespiratoryRate}/min`);
        if (d.postTreatmentLungFunctionPercent !== null) repeat.push(`${measure} ${d.postTreatmentLungFunctionPercent}% (${reference})`);
        if (d.observationMinutes !== null) repeat.push(`observation after the last bronchodilator ${d.observationMinutes} minutes`);
        if (repeat.length) lines.push(`Documented reassessment showed ${repeat.join("; ")}.`);
      }
    }
    return "Examination: ***" + (lines.length ? "\n" + lines.map(line => `- ${line}`).join("\n") : "");
  }

  function assessment(d, f) {
    const patient = d.age === null ? "The adult patient" : `A ${d.age} year old patient`;
    const diagnosis = f.diagnosis.confirmed ? `Asthma was supported by ${proseList(f.diagnosis.evidence)}.` : f.diagnosis.established ? "An established clinical asthma diagnosis was documented, with original objective evidence still to be verified." : "Asthma was suspected and required objective confirmation.";
    const reason = f.acute.active ? "an active exacerbation" : f.acute.recentResolved ? "follow up after a resolved exacerbation" : f.treatment.effectivePhase === "followup" ? "ongoing asthma management" : "initial asthma management";
    const parts = [`${patient} was evaluated for ${reason}.`, diagnosis];
    if (f.acute.emergency) {
      const triggers = f.acute.triggers.map(text => text === "life-threatening clinical features" ? "life threatening clinical features" : text);
      parts.push(`Urgent findings included ${proseList(triggers)}. These findings took priority over routine planning.`);
    } else if (f.acute.active) {
      parts.push(f.acute.mild ? "The documented acute presentation was mild." : f.acute.classification === "moderate" ? "The documented acute presentation included moderate features." : "The acute severity assessment remained incomplete.");
      if (!f.acute.complete) parts.push("Outpatient safety could not be established from the available observations.");
    }
    if (d.controller === "unknown") parts.push("The current maintenance regimen remained incompletely documented.");
    else if (["none", "saba-only"].includes(d.controller) && d.reliever !== "ics-formoterol") {
      parts.push("No maintenance controller containing an inhaled corticosteroid was documented.");
      if (d.reliever === "none") parts.push("No reliever was documented.");
    } else {
      const step = f.treatment.step === "1-2" ? "Steps 1 and 2" : f.treatment.step ? `Step ${f.treatment.step}` : "a treatment intensity requiring review";
      if (f.treatment.track) parts.push(f.treatment.step ? `Current treatment corresponded to GINA Track ${f.treatment.track} ${step}.` : `The reliever strategy corresponded to GINA Track ${f.treatment.track}. The exact treatment step required verification of the regimen.`);
      const dose = d.icsDose === "unknown" || f.severe.unverifiedHighSmart ? "an unverified corticosteroid dose" : `a ${d.icsDose} corticosteroid dose`;
      const regimen = f.treatment.airOnly ? "as needed inhaled corticosteroid and formoterol without scheduled maintenance" : d.controller === "ics" ? `maintenance inhaled corticosteroid alone at ${dose}` : d.controller === "triple" ? `maintenance inhaled corticosteroid, LABA, and LAMA therapy at ${dose}` : d.controller === "ics-formoterol" ? `maintenance inhaled corticosteroid and formoterol at ${dose}` : `maintenance inhaled corticosteroid and LABA therapy at ${dose}`;
      parts.push(`The current regimen consisted of ${regimen}.`);
    }
    const reliever = { "ics-formoterol": "an inhaled corticosteroid and formoterol combination", "ics-saba": "albuterol and budesonide", saba: "a short acting beta agonist", unknown: "not yet verified" }[d.reliever];
    if (reliever) parts.push(`The reliever was ${reliever}.`);
    if (d.lamaAddon === true && d.controller !== "triple") parts.push("A separate LAMA was included in the current maintenance regimen.");
    if (!["none", "unknown"].includes(d.currentBiologic)) parts.push(`The current biologic was ${logic.MEDICATIONS[d.currentBiologic].name}${d.biologicMonths === null ? "" : `, used for ${d.biologicMonths} months`}.`);
    if (d.maintenanceOcs === true) parts.push(`Maintenance systemic corticosteroid use was documented${d.maintenanceOcsDose === null ? "" : ` at a prednisone equivalent dose of ${d.maintenanceOcsDose} mg/day`}.`);
    parts.push(f.control.classification === "not fully assessed" ? "Symptom control could not be fully classified from the available history." : `GINA symptom control was ${f.control.classification}${f.control.complete ? "" : ", with remaining history incomplete"}.`);
    if (f.risk.factors.length) parts.push(`Future exacerbation risk was increased by ${proseList(f.risk.factors.map(text => text === "prior ICU admission or life-threatening asthma" ? "prior ICU admission or a life threatening asthma episode" : text))}.`);
    const phenotype = [];
    if (d.eosinophils >= 150 || d.historicalEosinophils >= 300) phenotype.push("eosinophilic inflammation");
    if (d.feno >= 25) phenotype.push("elevated FeNO");
    if (d.perennialSensitization === true) phenotype.push("confirmed perennial allergic sensitization");
    if (d.nasalPolyps === true) phenotype.push("nasal polyposis");
    if (d.atopicDermatitis === true) phenotype.push("atopic dermatitis");
    if (phenotype.length) parts.push(`The relevant phenotype and comorbidities included ${proseList(phenotype)}.`);
    if (d.egpa === "suspected") parts.push("EGPA was suspected but had not been established.");
    if (d.egpa === "confirmed") parts.push("Confirmed EGPA required coordinated treatment for that indication.");
    if (f.severe.established) parts.push("Severe asthma and the prior optimized treatment course were reviewed in selecting add on biologic therapy for persistent inadequate control.");
    const proposed = { air: "as needed budesonide and formoterol", smartLow: "budesonide and formoterol SMART at a low maintenance corticosteroid dose", smartMedium: "budesonide and formoterol SMART at a medium maintenance corticosteroid dose" }[f.proposedMedicationId];
    if (proposed) parts.push(`The planned regimen is ${proposed}.`);
    return parts.join(" ");
  }

  // Documentation templates follow action IDs and structured findings, not string tense substitution.
  const ACTION_NOTES = {
    urgent: () => "Immediate emergency assessment / transfer was recommended. Urgent care took priority over routine outpatient planning or form completion.",
    "urgent-assess": () => "Urgent evaluation of the abnormal observations and cause of hypoxemia / respiratory distress was recommended, with monitoring and oxygen as appropriate; an asthma exacerbation was not assumed from abnormal vitals alone.",
    "acute-saba": () => "While arranging transfer, recommended albuterol 90 mcg/actuation, 6-10 puffs by spacer or 5 mg by nebulizer, repeated every 20-30 minutes as needed with monitoring; ipratropium 17 mcg/actuation, 4 puffs, was considered as an adjunct (off-label acute asthma use). Treatment was not to delay transfer.",
    "acute-oxygen": () => "Controlled oxygen was recommended when needed, targeting SpO2 92-95%, with monitoring of vital signs and mental status.",
    "acute-ocs": (d) => d.maintenanceOcs === true ? "An individualized short-course systemic corticosteroid increase was considered, accounting for the existing prednisone-equivalent dose and adrenal suppression risk; duplicate prescribing and abrupt withdrawal were to be avoided." : "Prednisone/prednisolone 40-50 mg daily for 5-7 days was recommended when clinically appropriate and oral treatment was feasible. A taper would usually be unnecessary for a course under 2 weeks in a patient not taking chronic OCS.",
    "acute-pregnancy": () => "Prompt indicated exacerbation treatment and adequate oxygenation were recommended in pregnancy, with obstetric coordination as appropriate.",
    "acute-assess": () => "Completion of severity assessment was recommended, including speech, mental status, respiratory effort, air entry, RR, room-air oxygenation, and PEF/FEV1 with its reference. Missing measurements did not establish outpatient safety.",
    "acute-relief": (d, f) => f.acute.mild && d.reliever === "ics-formoterol" && !f.treatment.incompatible && d.controller !== "triple" ? "For the mild episode, recommended budesonide-formoterol 160/4.5 mcg, 2 inhalations, with one repeat after 30-60 minutes if needed and a maximum of 12 total maintenance/reliever inhalations in 24 hours; alternatively, albuterol 90 mcg, 4 puffs by spacer. U.S. AIR/SMART use was off-label." : f.acute.mild ? "For the mild episode, recommended albuterol 90 mcg/actuation, 4 puffs by spacer, with one repeat after 30-60 minutes if needed." : "For moderate features, recommended albuterol 90 mcg/actuation, 4-6 puffs by spacer, or 2.5 mg by nebulizer, up to 3 treatments every 20-30 minutes in the first hour while completing severity assessment. Ipratropium 17 mcg/actuation, 4 puffs, up to 3 initial treatments, was an optional off-label adjunct.",
    "acute-ocs-mild": () => "A corticosteroid burst was not routinely recommended for a promptly responding mild episode; it would be considered for rapid worsening, incomplete response, or a history of sudden severe attacks.",
    "acute-reassess": () => "Reassessment within the first hour, or sooner for deterioration, was recommended using symptoms, speech, respiratory effort, oxygenation, and lung function. Acute-care escalation was recommended for severe findings, deterioration, or failure to improve.",
    "acute-disposition": (d, f) => f.acute.dischargeCriteriaDocumented ? "Documented reassessment supported consideration of outpatient disposition, subject to clinical judgment rather than automatic clearance. Continued stability, room-air oxygenation, lung function above 70%, home support, and 1-2 hours after the last bronchodilator were to be verified; actual disposition remained to be documented." : "Outpatient disposition / discharge readiness was not established. Verification of sustained improvement for 1-2 hours after the last bronchodilator, only mild features, SpO2 at least 92% on room air, lung function above 70%, and home support was recommended before considering discharge.",
    "acute-followup": () => "After stabilization, an ICS-containing regimen, written action plan, urgent return precautions, and follow-up within 2-7 days were recommended, with review of triggers, adherence, and response.",
    "postacute-controller": () => "After acute stabilization, reassessment of controller intensity and an appropriate ICS-formoterol maintenance-and-reliever strategy were recommended when suitable; a complete regimen change, not duplicate LABA treatment, would be used. A maintenance triple inhaler would not be used for rescue.",
    "postacute-smoking": () => "After stabilization, smoking-cessation counseling, medication suitability review, and quitline support were recommended. A definitive cessation medication plan was deferred until the acute episode had been addressed.",
    "diagnostic-confirmation": (d, f) => f.diagnosis.established ? "Retrieve historical objective diagnostic evidence. Arrange appropriately timed repeat spirometry, serial PEF, or bronchoprovocation if confirmation remains needed; retain effective ICS treatment while evaluating." : "Confirm variable airflow limitation with pre/post-bronchodilator spirometry, serial PEF, or appropriate bronchoprovocation. Document confirmation after any clinically necessary provisional ICS treatment.",
    "steroid-effects": () => "Review of steroid adverse effects, dose/device, spacer and mouth-rinsing technique, cumulative OCS exposure, and relevant interactions was recommended, with the lowest effective ICS dose retained.",
    "resolve-reliever": () => "Resolution of the controller/reliever LABA mismatch was recommended before escalation, using a compatible SABA or albuterol-budesonide reliever or changing the entire controller to a suitable ICS-formoterol regimen.",
    "start-controller": (d, f) => `Recommended ${f.proposedMedicationId === "air" ? "as-needed low-dose budesonide-formoterol (GINA Track 1 Steps 1-2)" : f.proposedMedicationId === "smartLow" ? "low-dose budesonide-formoterol SMART (GINA Track 1 Step 3)" : "medium-dose budesonide-formoterol SMART (GINA Track 1 Step 4)"}, with confirmation of the product and shared treatment choice.`,
    "complete-initial": () => "Documentation of symptom frequency and night waking was recommended before assigning an initial treatment step; missing history did not establish suitability for low-intensity treatment.",
    optimize: () => "Correct documented technique, adherence, or access concerns. Address relevant smoke/irritant exposure, obesity, rhinosinusitis, symptomatic GERD, OSA, inducible laryngeal obstruction, and medication adverse effects before routine escalation. Reassess response after optimization.",
    stepup: () => "Controller and reliever plan: ***.",
    "step5-review": d => d.icsDose === "medium" ? "A limited monitored trial of higher-dose ICS-LABA or an appropriate add-on was considered after optimization, with subsequent phenotype-directed decisions rather than indefinite inhaled-dose escalation. Product/MART ceilings were to be respected." : "Review of persistent inadequate control despite high-dose ICS-LABA was recommended, including objective diagnosis, optimization, phenotype-directed add-on options, and steroid burden.",
    lama: () => "A tiotropium add-on was considered, conditional on verification of existing LAMA exposure, with modest lung-function/exacerbation benefit and no rescue activity.",
    "clarify-regimen": () => "Verification of the controller, ICS dose intensity, and reliever was recommended before assigning an escalation step.",
    continue: () => "Recommended continuation of the effective ICS-containing regimen, with review of future risk, adverse effects, technique, adherence, and preferences. An effective Track 2 regimen would not be changed solely to change tracks.",
    stepdown: (d, f) => `A supervised step-down was considered after at least 3 months of control and stable lung function. ${d.controller === "ics-formoterol" && f.treatment.track === 1 && f.treatment.step === "4" ? "For budesonide-formoterol, the proposed reduction was 160/4.5 mcg, 1 inhalation twice daily plus 1 as needed, maximum 12 total inhalations/day." : d.controller === "ics-formoterol" && f.treatment.track === 1 && f.treatment.step === "3" ? "For budesonide-formoterol, the proposed reduction was 160/4.5 mcg, 1 maintenance inhalation once daily plus 1 as needed, maximum 12 total inhalations/day; further reduction to AIR alone would follow reassessment." : "A product-specific maintenance ICS reduction of about 25-50% was considered while retaining ICS protection and a compatible reliever."} Baseline assessment, a written return-to-prior-treatment plan, and reassessment in 4-8 weeks were recommended. Complete ICS withdrawal was not recommended.`,
    "stepdown-conditional": () => "Step-down was deferred until sustained control for at least 3 months, stable lung function, and review of exacerbations, pregnancy, infection, travel, steroid exposure, and prior life-threatening asthma; current ICS protection was to be retained.",
    "stable-biologic": () => "Review OCS and add-on burden before reducing inhaled therapy following a good biologic response. Taper chronic OCS cautiously with adrenal-risk assessment. Do not automatically stop the biologic or withdraw ICS.",
    "complete-control": () => "Complete symptom-control and exacerbation-risk assessment before assigning good control or reducing treatment. Retain appropriate ICS protection.",
    "ics-protection": () => "An ICS-containing strategy was recommended rather than SABA-only treatment for confirmed asthma, with intensity guided by symptoms, lung function, and exacerbation history.",
    "phenotype-testing": () => "Obtain blood eosinophils, FeNO, and clinically relevant allergic phenotype testing for Step 5 treatment planning. Obtain pretreatment total IgE if omalizumab is being pursued.",
    "future-biologic": () => "Review severe-asthma diagnosis, the optimized treatment history, phenotype, and agent-specific eligibility before biologic initiation. Biologic assessment and treatment decision: ***.",
    "biologic-review": (d, f, rec) => !["none", "unknown"].includes(d.currentBiologic) ? "Assess the current biologic response before changing to another agent. Continue a single-biologic strategy. Biologic continuation or switch plan: ***." : rec.biologicCandidates.some(item => item.ready) ? "Add phenotype-matched biologic therapy for established severe asthma. Biologic agent and initiation plan: ***." : "Complete the outstanding severe-asthma eligibility, phenotype, and medication safety assessment before prescribing a biologic. Agent and initiation plan: ***.",
    "azithromycin-review": () => "Complete mycobacterial screening, ECG/QTc, hearing and interaction review, and resistance-risk discussion before any long-term azithromycin prescription. Additional nonbiologic treatment decision: ***. Do not use antibiotics routinely for asthma exacerbations.",
    "egpa-workup": () => "Evaluate suspected EGPA and relevant organ involvement before attributing systemic features to asthma or using a confirmed EGPA treatment indication.",
    "egpa-care": () => "Coordinate treatment of confirmed EGPA using its indication-specific regimen rather than asthma-only dosing.",
    "biologic-monitor": (d, f, rec) => {
      const ready = rec.biologicCandidates.find(item => item.id === f.selectedBiologicId)?.ready;
      const interval = f.selectedBiologicId === "depemokimab" ? "at least 6 months" : "about 4 months";
      return `${ready ? "Assess response" : "If treatment is subsequently initiated, assess response"} after ${interval} using symptoms, exacerbations, lung function, and steroid burden.${f.selectedBiologicId === "depemokimab" ? "" : " Extend an uncertain response assessment to 6-12 months when clinically appropriate."}`;
    },
    "routine-followup": (d, f, rec) => f.acute.recentResolved ? "Arrange recovery review within 2-7 days of the exacerbation if not already completed, and sooner for incomplete recovery or deterioration." : rec.plan?.selections.controller === "stepdown" ? "Follow up in 4-8 weeks to reassess control, lung function, and response to step-down. Resume the previous regimen and contact the clinic if control worsens." : f.control.poor || f.risk.frequent || d.persistentExacerbations === true || f.treatment.effectivePhase === "initial" ? "Follow up in 4-6 weeks after treatment initiation or adjustment, sooner for deterioration. Reassess symptoms, exacerbations, technique, adherence, adverse effects, and lung function." : "Follow up in about 3 months, sooner for worsening control.",
    "technique-counsel": () => "Review inhaler technique using demonstration and teach-back, medication adherence and access, and spacer use where appropriate.",
    "action-plan": () => "Provide or update the written asthma action plan with usual treatment, worsening-symptom instructions, reliever limits, and urgent-care precautions. Seek urgent care for severe breathlessness, inability to speak, cyanosis, altered mental status, or poor rescue response.",
    nonpharmacologic: () => "Reduce relevant exposures, encourage regular activity as tolerated, and address documented obesity, rhinosinusitis, symptomatic reflux, OSA, and other contributors.",
    "smoking-cessation": (d, f, rec) => logic.smokingPlanText(rec.smokingSupport),
    "vaccine-diagnostic": () => "Preventive vaccination review was recommended using local protocol and CDC age/condition guidance, without assuming an asthma-specific indication while diagnosis remained unconfirmed."
  };

  function vaccinePlan(action) {
    const guidance = action.vaccineGuidance;
    return guidance ? `Arrange ${guidance.target}. ${guidance.details}` : null;
  }

  function medicationSchedule(med, d, f) {
    if (med.id === "omalizumab") {
      const check = logic.getOmalizumabFeasibility(d);
      return check.feasible ? `Omalizumab ${check.dose.doseMg} mg SC every ${check.dose.intervalWeeks} weeks, based on confirmed pretreatment IgE and verified weight. Follow product-specific anaphylaxis precautions.` : "Complete the pretreatment IgE/weight table assessment and sensitization confirmation before finalizing the omalizumab dose.";
    }
    if (med.id === "reslizumab") return `Reslizumab ${Number((d.weightKg * 3).toFixed(3))} mg IV every 4 weeks (3 mg/kg at verified weight ${d.weightKg} kg), infused over 20-50 minutes. Follow anaphylaxis precautions and post-infusion observation requirements.`;
    if (med.id === "mepolizumab" && d.egpa === "confirmed") return "Coordinate mepolizumab 300 mg SC every 4 weeks under the confirmed EGPA indication, not the asthma-only 100 mg schedule.";
    if (med.id === "benralizumab" && d.egpa === "confirmed") return "Coordinate benralizumab 30 mg SC every 4 weeks under the confirmed EGPA indication, not the asthma maintenance interval of every 8 weeks.";
    if (med.id === "dupilumab") return d.maintenanceOcs === true || d.atopicDermatitis === true || d.nasalPolyps === true ? "The proposed dupilumab schedule was 600 mg SC loading followed by 300 mg SC every 2 weeks for documented OCS dependence or qualifying comorbidity, pending eligibility and safety review." : "The proposed dupilumab asthma schedule was 400 mg SC loading followed by 200 mg SC every 2 weeks, pending eligibility/safety review and verification of concurrent indications.";
    return med.noteSchedule;
  }

  function plan(d, rec) {
    const f = rec.findings, groups = new Map(), medicationIds = new Set();
    const append = (heading, text) => { if (!groups.has(heading)) groups.set(heading, []); groups.get(heading).push(text); };
    for (const group of rec.plan?.groups || []) {
      if (group.id === "lama" && rec.plan.selections.controller === "continue-biologic" && !group.selected) continue;
      if (!group.selected) append("Medication / management", group.placeholder + ".");
    }
    rec.actions.filter(action => action.kind !== "alternative").forEach(action => {
      if (rec.plan?.groups.some(group => group.id === "controller") && rec.plan.controllerActionIds.includes(action.id)) return;
      if (rec.plan?.groups.some(group => group.id === "lama") && action.id === "lama") return;
      if (["biologic-review", "future-biologic"].includes(action.id) && f.selectedBiologicId) return;
      const template = ACTION_NOTES[action.id];
      const text = action.noteText || (template ? template(d, f, rec) : action.id.startsWith("vaccine-") ? vaccinePlan(action) : null);
      if (!text) throw new Error(`Missing clinical documentation template: ${action.id}`);
      const heading = action.kind === "smoking" ? "Smoking cessation" : action.kind === "prevention" ? "Preventive care" : action.kind === "counseling" ? "Counseling and asthma action plan" : action.kind === "testing" ? "Testing" : ["followup", "monitoring"].includes(action.kind) ? "Monitoring and follow-up" : rec.emergency ? "Urgent management" : "Medication / management";
      append(heading, text);
      action.medicationIds.forEach(id => {
        if (id === f.selectedBiologicId && rec.biologicCandidates.find(candidate => candidate.id === id)?.ready && ["none", "unknown"].includes(d.currentBiologic)) medicationIds.add(id);
      });
    });
    for (const id of medicationIds) {
      const med = logic.MEDICATIONS[id], schedule = medicationSchedule(med, d, f);
      if (schedule) append(rec.emergency ? "Urgent management" : "Medication / management", `Biologic regimen: ${schedule}`);
    }
    const cautions = [];
    if (f.treatment.incompatible) cautions.push("Resolution of the controller/reliever LABA mismatch was recommended; duplicate incompatible LABA treatment was to be avoided.");
    if (logic.getDupilumabEvidenceFlag(d).above1500 && !f.acute.emergency) cautions.push("Evaluation was recommended before routine dupilumab selection with current/historical eosinophils above 1500 cells/uL; this was a guideline evidence caution, not an FDA contraindication.");
    if (d.eosinophils >= 1500 || d.historicalEosinophils >= 1500) cautions.push("Evaluation of marked eosinophilia for EGPA, hypereosinophilic disease, and other causes was recommended rather than attribution to asthma alone.");
    if (d.endemicExposure === true && (d.eosinophils >= 300 || d.historicalEosinophils >= 300)) cautions.push("Parasite evaluation before systemic corticosteroids/biologics was recommended when epidemiologically indicated.");
    cautions.forEach(text => append("Clinical cautions", text));
    const order = ["Urgent management", "Medication / management", "Testing", "Smoking cessation", "Counseling and asthma action plan", "Preventive care", "Monitoring and follow-up", "Clinical cautions"].filter(key => groups.has(key));
    return order.map((heading, index) => `${index + 1}. ${heading}\n${unique(groups.get(heading)).map(text => `- ${text}`).join("\n")}`).join("\n\n");
  }

  function buildNoteText(input, recommendation) {
    const d = logic.normalizeState(input), rec = recommendation || logic.buildRecommendation(d);
    if (rec.invalid) return "";
    return `Subjective\n${subjective(d, rec.findings)}\n\nObjective\n${objective(d, rec.findings)}\n\nAssessment\n${assessment(d, rec.findings)}\n\nPlan\n${plan(d, rec)}`;
  }
  return { buildNoteText, ACTION_NOTES };
});
