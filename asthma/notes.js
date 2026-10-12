(function (root, factory) {
  const logic = typeof module !== "undefined" && module.exports ? require("./logic.js") : root.asthmaLogic;
  const notes = factory(logic);
  if (typeof module !== "undefined" && module.exports) module.exports = notes;
  if (root) root.asthmaNotes = notes;
})(typeof globalThis !== "undefined" ? globalThis : this, function (logic) {
  "use strict";

  const unique = lines => [...new Set(lines.filter(Boolean))];
  const days = { none: "no daytime symptoms", "one-two": "daytime symptoms 1-2 days/week", three: "daytime symptoms 3 days/week", "four-six": "daytime symptoms 4-6 days/week", daily: "daily daytime symptoms" };
  const nights = { none: "no nocturnal waking", "less-weekly": "nocturnal waking less than weekly", "weekly-plus": "nocturnal waking at least weekly" };

  function subjective(d, f) {
    const lines = [], symptoms = [days[d.symptomDays], nights[d.nightWaking], d.activityLimitation === true ? "activity limitation due to asthma" : d.activityLimitation === false ? "no activity limitation due to asthma" : null].filter(Boolean);
    if (symptoms.length) lines.push(`During the preceding 4 weeks, the patient had ${symptoms.join("; ")}.`);
    if (f.control.sabaApplicable && d.sabaFrequency !== "unknown") lines.push({ none: "No symptomatic SABA use was reported.", "one-two": "Symptomatic SABA use was reported 1-2 times/week.", "more-two": "Symptomatic SABA use was reported more than twice/week." }[d.sabaFrequency] + " Pre-exercise use was excluded.");
    if (!f.control.sabaApplicable && d.airUsesPerWeek !== null) lines.push(`ICS-containing reliever use was reported ${d.airUsesPerWeek} times/week.`);
    if (d.urgentRedFlags === false && !f.acute.emergency) lines.push("No urgent red-flag symptoms were reported.");
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
    if (d.smoking !== "unknown") lines.push({ never: "The smoking history was negative.", former: "The patient was a former smoker.", current: "The patient was currently smoking." }[d.smoking]);
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
    const patient = d.age === null ? "The adult patient" : `The ${d.age}-year-old patient`;
    const diagnosis = f.diagnosis.confirmed ? `with asthma supported by ${f.diagnosis.evidence.join(" and ")}` : f.diagnosis.established ? "with an established clinical asthma diagnosis, for which original objective evidence remained to be verified" : "with suspected asthma requiring objective confirmation";
    const parts = [`${patient} ${diagnosis} was evaluated for ${f.acute.active ? "an active exacerbation" : f.acute.recentResolved ? "follow-up after a resolved exacerbation" : f.treatment.effectivePhase === "followup" ? "follow-up management" : "initial management"}.`];
    if (f.acute.emergency) parts.push(`Urgent findings included ${f.acute.triggers.join("; ")}; these took priority over routine planning.`);
    else if (f.acute.active) parts.push(`The acute presentation was ${f.acute.classification}${f.acute.complete ? "." : "; the assessment was incomplete and outpatient safety could not be established."}`);
    if (d.controller === "unknown") parts.push("The current maintenance regimen remained incompletely documented.");
    else if (["none", "saba-only"].includes(d.controller) && d.reliever !== "ics-formoterol") {
      parts.push(d.reliever === "none" ? "No maintenance ICS-containing controller or reliever was documented." : d.reliever === "unknown" ? "No maintenance ICS-containing controller was documented; reliever therapy remained unverified." : `No maintenance ICS-containing controller was documented; the reliever was ${f.treatment.relieverName}.`);
    } else parts.push(`At the encounter, treatment corresponded to ${f.treatment.description}; the reliever was ${f.treatment.relieverName}.`);
    if (!["none", "unknown"].includes(d.currentBiologic)) parts.push(`The current biologic was ${logic.MEDICATIONS[d.currentBiologic].name}${d.biologicMonths === null ? "" : `, used for ${d.biologicMonths} months`}.`);
    if (d.maintenanceOcs === true) parts.push(`Maintenance systemic corticosteroid use was documented${d.maintenanceOcsDose === null ? "" : ` at prednisone-equivalent ${d.maintenanceOcsDose} mg/day`}.`);
    parts.push(f.control.classification === "not fully assessed" ? "Symptom control could not be fully classified from the available history." : `GINA symptom control was ${f.control.classification}${f.control.complete ? "" : ", with remaining history incomplete"}.`);
    if (f.risk.factors.length) parts.push(`Future-risk considerations included ${f.risk.factors.join("; ")}.`);
    const phenotype = [];
    if (d.eosinophils >= 150 || d.historicalEosinophils >= 300) phenotype.push("eosinophilic inflammation");
    if (d.feno >= 25) phenotype.push("elevated FeNO");
    if (d.perennialSensitization === true) phenotype.push("confirmed perennial allergic sensitization");
    if (d.nasalPolyps === true) phenotype.push("nasal polyposis");
    if (d.atopicDermatitis === true) phenotype.push("atopic dermatitis");
    if (phenotype.length) parts.push(`Relevant phenotype / comorbidities included ${phenotype.join(", ")}.`);
    if (d.egpa === "suspected") parts.push("EGPA was suspected but had not been established.");
    if (d.egpa === "confirmed") parts.push("Confirmed EGPA required coordinated indication-specific treatment.");
    if (f.severe.established) parts.push("Persistent burden despite documented optimized high-dose ICS-LABA supported a severe-asthma assessment.");
    if (f.proposedMedicationId) parts.push(`The recommended treatment change was ${logic.MEDICATIONS[f.proposedMedicationId].name}.`);
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
    "diagnostic-confirmation": (d, f) => f.diagnosis.established ? "Review of historical objective evidence and, when appropriate, repeat spirometry, serial PEF, or bronchoprovocation was recommended without automatically withdrawing effective ICS treatment." : "Objective confirmation with pre/post-bronchodilator spirometry, serial PEF, or suitable bronchoprovocation was recommended. Clinically necessary ICS-containing treatment could be started provisionally with a plan for confirmation.",
    "steroid-effects": () => "Review of steroid adverse effects, dose/device, spacer and mouth-rinsing technique, cumulative OCS exposure, and relevant interactions was recommended, with the lowest effective ICS dose retained.",
    "resolve-reliever": () => "Resolution of the controller/reliever LABA mismatch was recommended before escalation, using a compatible SABA or albuterol-budesonide reliever or changing the entire controller to a suitable ICS-formoterol regimen.",
    "start-controller": (d, f) => `Recommended ${f.proposedMedicationId === "air" ? "as-needed low-dose budesonide-formoterol (GINA Track 1 Steps 1-2)" : f.proposedMedicationId === "smartLow" ? "low-dose budesonide-formoterol SMART (GINA Track 1 Step 3)" : "medium-dose budesonide-formoterol SMART (GINA Track 1 Step 4)"}, with confirmation of the product and shared treatment choice.`,
    "complete-initial": () => "Documentation of symptom frequency and night waking was recommended before assigning an initial treatment step; missing history did not establish suitability for low-intensity treatment.",
    optimize: () => "Review and correction of technique, adherence, access, smoke/irritant exposure, obesity, rhinosinusitis, symptomatic GERD, OSA, inducible laryngeal obstruction, and medication adverse effects were recommended before routine escalation, followed by reassessment.",
    stepup: (d, f) => `A step-up to ${f.proposedMedicationId === "smartLow" ? "low-dose" : "medium-dose"} budesonide-formoterol SMART was considered after verification of technique, adherence, and access. A suitable effective Track 2 regimen could instead be retained/adjusted; a controller change would replace, not duplicate, LABA treatment.`,
    "step5-review": d => d.icsDose === "medium" ? "A limited monitored trial of higher-dose ICS-LABA or an appropriate add-on was considered after optimization, with subsequent phenotype-directed decisions rather than indefinite inhaled-dose escalation. Product/MART ceilings were to be respected." : "Review of persistent inadequate control despite high-dose ICS-LABA was recommended, including objective diagnosis, optimization, phenotype-directed add-on options, and steroid burden.",
    lama: () => "A tiotropium add-on was considered, conditional on verification of existing LAMA exposure, with modest lung-function/exacerbation benefit and no rescue activity.",
    "clarify-regimen": () => "Verification of the controller, ICS dose intensity, and reliever was recommended before assigning an escalation step.",
    continue: () => "Recommended continuation of the effective ICS-containing regimen, with review of future risk, adverse effects, technique, adherence, and preferences. An effective Track 2 regimen would not be changed solely to change tracks.",
    stepdown: (d, f) => `A supervised step-down was considered after at least 3 months of control and stable lung function. ${d.controller === "ics-formoterol" && f.treatment.track === 1 && f.treatment.step === "4" ? "For budesonide-formoterol, the proposed reduction was 160/4.5 mcg, 1 inhalation twice daily plus 1 as needed, maximum 12 total inhalations/day." : d.controller === "ics-formoterol" && f.treatment.track === 1 && f.treatment.step === "3" ? "For budesonide-formoterol, the proposed reduction was 160/4.5 mcg, 1 maintenance inhalation once daily plus 1 as needed, maximum 12 total inhalations/day; further reduction to AIR alone would follow reassessment." : "A product-specific maintenance ICS reduction of about 25-50% was considered while retaining ICS protection and a compatible reliever."} Baseline assessment, a written return-to-prior-treatment plan, and reassessment in 4-8 weeks were recommended. Complete ICS withdrawal was not recommended.`,
    "stepdown-conditional": () => "Step-down was deferred until sustained control for at least 3 months, stable lung function, and review of exacerbations, pregnancy, infection, travel, steroid exposure, and prior life-threatening asthma; current ICS protection was to be retained.",
    "stable-biologic": () => "For a good biologic response, review of OCS/add-on burden before inhaled-treatment reduction was recommended, with cautious OCS tapering and adrenal-risk assessment. Automatic biologic cessation or ICS withdrawal was not recommended.",
    "complete-control": () => "Completion of symptom-control and exacerbation-risk assessment was recommended before declaring treatment sufficient or stepping down, with appropriate ICS protection retained meanwhile.",
    "ics-protection": () => "An ICS-containing strategy was recommended rather than SABA-only treatment for confirmed asthma, with intensity guided by symptoms, lung function, and exacerbation history.",
    "phenotype-testing": () => "Blood eosinophils, FeNO, and clinically relevant allergic phenotype testing were recommended for future Step 5 decisions; pretreatment total IgE would be obtained when considering omalizumab dosing.",
    "future-biologic": () => "Phenotype-matched biologic therapy would be considered at follow-up if control remained inadequate despite optimized high-dose ICS-LABA, after verification of eligibility and necessary testing.",
    "biologic-review": () => "Consideration of a suitable phenotype-matched biologic was recommended, with review of eligibility, comorbidities, dosing, route/interval, preferences, and coverage before ordering.",
    "azithromycin-review": () => "A monitored long-term azithromycin trial was considered when appropriate after mycobacterial screening, ECG/QTc, hearing and interaction review, and discussion of resistance; it was not recommended as routine exacerbation antibiotic treatment.",
    "egpa-workup": () => "Evaluation for suspected EGPA was recommended before attributing eosinophilia/systemic features to asthma or using a confirmed-disease indication.",
    "egpa-care": () => "Coordinated indication-specific treatment of confirmed EGPA was recommended rather than substitution of asthma-only dosing.",
    "selected-biologic": (d, f, rec) => {
      const candidate = rec.biologicCandidates.find(item => item.id === f.selectedBiologicId);
      if (!["none", "unknown"].includes(d.currentBiologic)) return `Review of response to ${logic.MEDICATIONS[d.currentBiologic].name}${d.biologicMonths === null ? "" : ` after ${d.biologicMonths} months`} was recommended before any change. ${candidate.name} was considered within a coordinated single-biologic strategy; routine combination of biologics was not recommended.`;
      return candidate.ready ? `Planned initiation of ${candidate.name} after shared decision-making, authorization, and product safety review.` : `Considered ${candidate.name}, conditional on: ${candidate.prerequisites.join("; ")}. Initiation would await completion of these prerequisites.`;
    },
    "biologic-monitor": (d, f) => f.selectedBiologicId === "depemokimab" ? "Clinical response review over at least 6 months was recommended for depemokimab." : "Planned response assessment after about 4 months using symptoms, exacerbations, lung function, and steroid burden; an uncertain response could warrant a longer 6-12-month trial.",
    "routine-followup": (d, f) => f.acute.recentResolved ? "Follow-up was to be individualized to recovery and control after the resolved episode; an initial post-exacerbation review within 2-7 days was recommended if not already completed, with earlier review for incomplete recovery or deterioration." : f.control.poor || f.risk.frequent || d.persistentExacerbations === true || f.treatment.effectivePhase === "initial" ? "Planned follow-up in about 4-6 weeks after initiation/adjustment, sooner for deterioration, with reassessment of control, exacerbations, technique, adherence, adverse effects, and appropriate lung function." : "Planned routine follow-up in about 3 months, or earlier at 4-8 weeks after step-down or another treatment change.",
    "technique-counsel": () => "Recommended inhaler-technique review with demonstration/teach-back, adherence/access review, and spacer use as appropriate.",
    "action-plan": () => "Recommended provision or update of a written asthma action plan covering usual therapy, worsening symptoms, reliever limits, return to the prior regimen, and urgent care. Emergency precautions included severe breathlessness, inability to speak, cyanosis, altered mental status, or poor rescue response.",
    nonpharmacologic: d => `Recommended exposure reduction, regular activity as tolerated, and care of relevant obesity, rhinosinusitis, symptomatic reflux, OSA, and other contributors${d.smoking === "current" ? ", with smoking-cessation counseling and pharmacotherapy recommended for consideration" : ""}.`,
    "vaccine-diagnostic": () => "Preventive vaccination review was recommended using local protocol and CDC age/condition guidance, without assuming an asthma-specific indication while diagnosis remained unconfirmed."
  };

  function vaccinePlan(id, d) {
    const key = id.slice("vaccine-".length);
    const plans = {
      flu: "current-season influenza vaccination",
      covid: "current COVID-19 vaccination guidance and individual decision-making",
      pneumococcal: "pneumococcal vaccination according to age, qualifying disease, and previous products/intervals",
      rsv: "a single eligible RSV vaccine dose, not annual vaccination or an automatic repeat",
      zoster: "the indicated 2-dose recombinant zoster series",
      tdap: "the tetanus primary series, at least one Tdap dose, subsequent boosters, and pregnancy-specific timing"
    };
    return `Recommended ${d[key] === "unknown" ? "record review and, if indicated, " : "confirmation of prior doses before "}${plans[key]}.`;
  }

  function medicationSchedule(med, d, f) {
    if (med.id === "omalizumab") {
      const check = logic.getOmalizumabFeasibility(d);
      return check.feasible ? `The adult asthma-table dose was ${check.dose.doseMg} mg SC every ${check.dose.intervalWeeks} weeks based on confirmed pretreatment IgE and verified weight; product safety review and anaphylaxis precautions were recommended.` : "A definitive omalizumab dose was deferred pending a supported pretreatment IgE/weight table assessment and confirmed sensitization.";
    }
    if (med.id === "reslizumab") return d.weightKg === null ? "Reslizumab's labelled schedule was 3 mg/kg IV every 4 weeks over 20-50 minutes; a patient-specific dose was deferred until weight verification, with anaphylaxis precautions and post-infusion observation recommended." : `The calculated reslizumab dose was ${Number((d.weightKg * 3).toFixed(3))} mg IV every 4 weeks (3 mg/kg at verified weight ${d.weightKg} kg), over 20-50 minutes, pending final prescription review; anaphylaxis precautions and post-infusion observation were recommended.`;
    if (med.id === "mepolizumab" && d.egpa === "confirmed") return "For confirmed EGPA, coordinated mepolizumab 300 mg SC every 4 weeks was considered under the EGPA indication, not the asthma-only 100 mg schedule.";
    if (med.id === "benralizumab" && d.egpa === "confirmed") return "For confirmed EGPA, coordinated benralizumab 30 mg SC every 4 weeks was considered under the EGPA indication, not the asthma maintenance interval of every 8 weeks.";
    if (med.id === "dupilumab") return d.maintenanceOcs === true || d.atopicDermatitis === true || d.nasalPolyps === true ? "The proposed dupilumab schedule was 600 mg SC loading followed by 300 mg SC every 2 weeks for documented OCS dependence or qualifying comorbidity, pending eligibility and safety review." : "The proposed dupilumab asthma schedule was 400 mg SC loading followed by 200 mg SC every 2 weeks, pending eligibility/safety review and verification of concurrent indications.";
    return med.noteSchedule;
  }

  function plan(d, rec) {
    const f = rec.findings, groups = new Map(), medicationIds = new Set();
    const append = (heading, text) => { if (!groups.has(heading)) groups.set(heading, []); groups.get(heading).push(text); };
    rec.actions.filter(action => action.kind !== "alternative").forEach(action => {
      const template = ACTION_NOTES[action.id];
      const text = template ? template(d, f, rec) : action.id.startsWith("vaccine-") ? vaccinePlan(action.id, d) : null;
      if (!text) throw new Error(`Missing clinical documentation template: ${action.id}`);
      const heading = action.kind === "prevention" ? "Preventive care" : action.kind === "counseling" ? "Counseling and asthma action plan" : action.kind === "testing" ? "Testing" : ["followup", "monitoring"].includes(action.kind) ? "Monitoring and follow-up" : rec.emergency ? "Urgent management" : "Medication / management";
      append(heading, text);
      action.medicationIds.forEach(id => {
        if (id === f.proposedMedicationId || id === f.selectedBiologicId || ["tiotropium", "highDose", "azithromycin"].includes(id)) medicationIds.add(id);
      });
    });
    for (const id of medicationIds) {
      const med = logic.MEDICATIONS[id], schedule = medicationSchedule(med, d, f);
      if (schedule) append(rec.emergency ? "Urgent management" : "Medication / management", `${id === f.selectedBiologicId ? "Considered biologic schedule" : id === "highDose" ? "If pursuing a monitored higher-ICS trial" : "Regimen details"}: ${schedule}`);
    }
    const cautions = [];
    if (f.treatment.incompatible) cautions.push("Resolution of the controller/reliever LABA mismatch was recommended; duplicate incompatible LABA treatment was to be avoided.");
    if (logic.getDupilumabEvidenceFlag(d).above1500 && !f.acute.emergency) cautions.push("Evaluation was recommended before routine dupilumab selection with current/historical eosinophils above 1500 cells/uL; this was a guideline evidence caution, not an FDA contraindication.");
    if (d.eosinophils >= 1500 || d.historicalEosinophils >= 1500) cautions.push("Evaluation of marked eosinophilia for EGPA, hypereosinophilic disease, and other causes was recommended rather than attribution to asthma alone.");
    if (d.endemicExposure === true && (d.eosinophils >= 300 || d.historicalEosinophils >= 300)) cautions.push("Parasite evaluation before systemic corticosteroids/biologics was recommended when epidemiologically indicated.");
    cautions.forEach(text => append("Clinical cautions", text));
    const order = ["Urgent management", "Medication / management", "Testing", "Counseling and asthma action plan", "Preventive care", "Monitoring and follow-up", "Clinical cautions"].filter(key => groups.has(key));
    return order.map((heading, index) => `${index + 1}. ${heading}\n${unique(groups.get(heading)).map(text => `- ${text}`).join("\n")}`).join("\n\n");
  }

  function buildNoteText(input, recommendation) {
    const d = logic.normalizeState(input), rec = recommendation || logic.buildRecommendation(d);
    if (rec.invalid) return "";
    return `Subjective\n${subjective(d, rec.findings)}\n\nObjective\n${objective(d, rec.findings)}\n\nAssessment\n${assessment(d, rec.findings)}\n\nPlan\n${plan(d, rec)}`;
  }
  return { buildNoteText, ACTION_NOTES };
});
