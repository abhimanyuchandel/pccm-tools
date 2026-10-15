(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.copdNotes = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const known = (n) => n !== null && n !== undefined && Number.isFinite(n);
  function buildSubjective(d, f) {
    const gender =
      { male: "man", female: "woman", nonbinary: "nonbinary patient" }[
        d.gender
      ] || "patient";
    const person = known(d.age)
      ? "This " + d.age + "-year-old " + gender
      : "The " + gender;
    const reason =
      d.encounter === "active"
        ? "an acute respiratory exacerbation"
        : d.encounter === "recovery"
          ? "follow-up after a respiratory exacerbation"
          : f.therapy.phase === "followup"
            ? "COPD follow-up"
            : "COPD evaluation and treatment review";
    const paragraphs = [
      person + " was seen for " + reason + ".",
      "Interval history: ***.",
    ];
    if (d.encounter === "active")
      paragraphs.push("Acute symptom history and treatment already used: ***.");
    const symptoms = [];
    if (d.persistentDyspnea !== null)
      symptoms.push(
        d.persistentDyspnea
          ? "The patient reported persistent dyspnea or activity limitation on current treatment."
          : "The patient did not report persistent dyspnea or activity limitation on current treatment.",
      );
    if (d.encounter === "active") {
      [
        ["acuteDyspnea", "Increased dyspnea"],
        ["acuteSputumVolume", "Increased sputum volume"],
        ["acutePurulence", "Sputum purulence"],
      ].forEach(([key, label]) => {
        if (d[key] !== null)
          symptoms.push(
            label + (d[key] ? " was reported." : " was not reported."),
          );
      });
    }
    if (symptoms.length) paragraphs.push(symptoms.join(" "));
    const events = [];
    if (known(d.moderateExac))
      events.push(
        (d.moderateExac === 0 ? "no" : d.moderateExac) +
          " exacerbation" +
          (d.moderateExac === 1 ? "" : "s") +
          " treated with systemic steroids and/or antibiotics without hospitalization",
      );
    if (known(d.severeExac))
      events.push(
        (d.severeExac === 0 ? "no" : d.severeExac) +
          " exacerbation-related hospitalization" +
          (d.severeExac === 1 ? "" : "s"),
      );
    if (events.length)
      paragraphs.push(
        "In the past 12 months, the patient reported " +
          events.join(" and ") +
          ".",
      );
    const smoking = {
      current: "The patient currently smokes cigarettes.",
      former: "The patient previously smoked cigarettes.",
      never: "The patient reported never smoking cigarettes.",
    };
    if (d.smokingStatus === "never" && known(d.packYears) && d.packYears > 0) {
      paragraphs.push(
        "The patient reported never smoking, but a cigarette exposure of " +
          d.packYears +
          " pack-years was also documented. Reconcile the tobacco history.",
      );
    } else {
      const tobacco = [];
      if (smoking[d.smokingStatus]) tobacco.push(smoking[d.smokingStatus]);
      if (known(d.packYears))
        tobacco.push("Cumulative exposure was " + d.packYears + " pack-years.");
      if (d.smokingStatus === "former" && known(d.yearsSinceQuit))
        tobacco.push(
          d.yearsSinceQuit === 0
            ? "The patient quit within the past year."
            : "The patient quit " + d.yearsSinceQuit + " years ago.",
        );
      if (tobacco.length) paragraphs.push(tobacco.join(" "));
    }
    paragraphs.push("Current controller and rescue medications are: ***.");
    return paragraphs;
  }
  function buildNoteText(r) {
    if (r.invalid) return "";
    const d = r.data,
      f = r.findings,
      s = buildSubjective(d, f),
      o = [],
      a = [];
    if (f.diagnosis.ratio !== null)
      o.push(
        "Post-bronchodilator FEV1/FVC: " +
          Number(f.diagnosis.ratio.toFixed(4)) +
          ".",
      );
    if (known(d.fev1Predicted))
      o.push("Post-bronchodilator FEV1: " + d.fev1Predicted + "% predicted.");
    if (d.historicalObstruction === true)
      o.push(
        "Historical post-bronchodilator airflow obstruction was documented.",
      );
    if (known(d.catScore)) o.push("CAT/CAAT: " + d.catScore + "/40.");
    if (known(d.mmrcScore)) o.push("mMRC: " + d.mmrcScore + "/4.");
    if (known(d.eosinophils))
      o.push("Blood eosinophils: " + d.eosinophils + " cells/µL.");
    if (known(d.historicalEosinophils))
      o.push(
        "Historical peak eosinophils: " +
          d.historicalEosinophils +
          " cells/µL.",
      );
    if (known(d.restingSpo2))
      o.push(
        "Stable resting SpO2: " +
          d.restingSpo2 +
          "%" +
          (d.oxygenConditions === "roomair"
            ? " on room air."
            : d.oxygenConditions === "oxygen"
              ? " on supplemental oxygen."
              : " with oxygen conditions not documented."),
      );
    if (d.abgAvailable === true) {
      if (known(d.pao2)) o.push("Stable arterial PaO2: " + d.pao2 + " mmHg.");
      if (known(d.paco2))
        o.push("Stable arterial PaCO2: " + d.paco2 + " mmHg.");
    }
    [
      ["rv", "RV", "% predicted"],
      ["tlc", "TLC", "% predicted"],
      ["dlco", "DLCO", "% predicted"],
      ["walkDistance", "Six-minute walk distance", "m"],
      ["bmi", "BMI", "kg/m²"],
    ].forEach(([key, name, unit]) => {
      if (known(d[key])) o.push(name + ": " + d[key] + " " + unit + ".");
    });
    if (f.advanced.bode !== null)
      o.push("BODE index: " + f.advanced.bode + "/10.");
    if (d.encounter === "active") {
      [
        ["respiratoryRate", "Respiratory rate", "/min"],
        ["heartRate", "Heart rate", "/min"],
        ["systolicBp", "Systolic BP", " mmHg"],
        ["acuteSpo2", "Initial SpO2", "%"],
        ["postSpo2", "Reassessment SpO2", "%"],
        ["acutePh", "Arterial pH", ""],
        ["acutePaco2", "Acute arterial PaCO2", " mmHg"],
      ].forEach(([key, name, unit]) => {
        if (known(d[key])) o.push(name + ": " + d[key] + unit + ".");
      });
      const conditions = {
        roomair: "room air",
        baseline: "baseline supplemental oxygen",
        increased: "increased supplemental oxygen",
      };
      if (conditions[d.acuteOxygen])
        o.push("Initial oxygen conditions: " + conditions[d.acuteOxygen] + ".");
      if (d.acuteReassessed === true && d.acuteResponse !== "unknown")
        o.push(
          "Documented treatment response: " +
            { improved: "improved", unchanged: "unchanged", worse: "worsened" }[
              d.acuteResponse
            ] +
            ".",
        );
      o.push("Treatment actually administered and reassessment details: ***.");
    }
    o.push("Examination: ***.");
    a.push(
      (known(d.age)
        ? "This " + d.age + " year old patient has "
        : "The patient has ") +
        f.diagnosis.label +
        ".",
    );
    if (f.diagnosis.grade !== null)
      a.push(
        "Available spirometry corresponded to GOLD airflow obstruction grade " +
          f.diagnosis.grade +
          ".",
      );
    if (f.therapy.maintenance)
      a.push(
        "Current maintenance treatment consisted of " + f.therapy.label + ".",
      );
    else if (d.currentRegimen === "naive")
      a.push("The patient was not receiving maintenance inhaler treatment.");
    if (f.symptoms.high !== null)
      a.push(
        "The documented symptom assessment indicated " + f.symptoms.label + ".",
      );
    if (f.risk.high === true)
      a.push(
        "A recent exacerbation history increased future exacerbation risk.",
      );
    else if (f.risk.high === false)
      a.push(
        "No treated exacerbations or exacerbation related hospitalizations were reported over the past year.",
      );
    else
      a.push(
        "Exacerbation risk remained incompletely characterized by the available history.",
      );
    if (r.group && f.therapy.phase === "initial")
      a.push(
        "The initial treatment profile corresponded to GOLD Group " +
          r.group +
          ".",
      );
    if (d.asthma === "confirmed")
      a.push(
        "Coexisting asthma supported retention of an ICS containing regimen.",
      );
    if (d.asthma === "suspected")
      a.push(
        "Possible coexisting asthma required clarification and an ICS containing treatment strategy.",
      );
    if (d.chronicBronchitis === true)
      a.push("A chronic bronchitis phenotype was documented.");
    if (d.eosinophils !== null && d.eosinophils >= 300)
      a.push(
        "Blood eosinophilia supported consideration of an eosinophil directed exacerbation prevention strategy in the appropriate treatment context.",
      );
    if (d.encounter === "active")
      a.push(
        "An active respiratory exacerbation required assessment of severity, alternative causes and the appropriate care setting.",
      );
    if (r.emergency)
      a.push(
        "Known urgent findings took priority over routine COPD treatment planning.",
      );
    const actions = r.actions
      .filter((x) => x.kind !== "rationale")
      .map((x) => ({ ...x }));
    // Group shared actions without changing their clinical meaning or copying alternatives.
    if (!r.emergency)
      r.groups
        .filter((g) => !g.selected && g.placeholder)
        .forEach((g) =>
          actions.push({
            text: g.placeholder,
            kind: g.id === "pneumococcalPlan" ? "prevention" : g.id,
          }),
        );
    const categories = [
      ["Urgent care", ["urgent"]],
      [
        "Acute treatment and reassessment",
        ["acute", "acuteBronchodilator", "acuteSteroid", "acuteAntibiotic"],
      ],
      [
        "Maintenance and rescue treatment",
        ["controller", "product", "rescue", "management"],
      ],
      ["Additional maintenance treatment", ["addon"]],
      ["Diagnostic assessment", ["testing"]],
      ["Tobacco cessation", ["cessation"]],
      ["Prevention and screening", ["prevention", "screening"]],
      ["Rehabilitation and other referrals", ["rehabilitation", "referral"]],
      ["Oxygen and ventilation", ["oxygen", "ventilation"]],
      [
        "Lung volume reduction and transplant evaluation",
        ["lvr", "transplant", "advanced"],
      ],
      [
        "Other care and action plan",
        ["comorbidity", "supportive", "counseling"],
      ],
      ["Follow-up", ["followup"]],
    ];
    const plan = categories
      .map(([title, kinds]) => ({
        title,
        items: actions.filter((x) => kinds.includes(x.kind)),
      }))
      .filter((section) => section.items.length);
    return (
      "Subjective\n" +
      s.join("\n\n") +
      "\n\nObjective\n" +
      o.map((x) => "- " + x).join("\n") +
      "\n\nAssessment\n" +
      a.join(" ") +
      "\n\nPlan\n" +
      plan
        .map(
          (section, i) =>
            i +
            1 +
            ". " +
            section.title +
            "\n" +
            section.items.map((x) => "- " + x.text).join("\n"),
        )
        .join("\n")
    );
  }
  return { buildNoteText };
});
