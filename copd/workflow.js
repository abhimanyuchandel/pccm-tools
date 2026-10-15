(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.copdWorkflow = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  function steps(d, r) {
    const out = [];
    const add = (
      id,
      chapter,
      title,
      fields = [],
      reference = null,
      extra = {},
    ) => out.push({ id, chapter, title, fields, reference, ...extra });
    add("context", "Context", "Start with the encounter", [
      "encounter",
      "managementPhase",
      "age",
      "gender",
      "redFlags",
    ]);
    add(
      "treatment",
      "Treatment",
      "What is the patient taking?",
      ["currentRegimen", "reliever", "addonContext"],
      "inhalers",
    );
    if (d.addonContext === "yes") {
      add("current-addons", "Treatment", "Current maintenance add-ons", [
        "currentEnsifentrine",
        "currentRoflumilast",
        "currentAzithromycin",
      ]);
      add(
        "current-biologic",
        "Treatment",
        "Biologic and systemic-steroid exposure",
        ["currentBiologic", "maintenanceOcs"],
      );
    }
    if (d.encounter === "active") {
      add(
        "acute-history",
        "Acute care",
        "What changed during this episode?",
        [
          "acuteDyspnea",
          "acuteSputumVolume",
          "acutePurulence",
          "acuteProgression",
        ],
        "acute",
      );
      add("acute-observations", "Acute care", "Initial observations", [
        "respiratoryRate",
        "heartRate",
        "systolicBp",
        "acuteDyspneaScore",
      ]);
      add(
        "acute-oxygen",
        "Acute care",
        "Oxygenation and immediate safety",
        ["acuteSpo2", "acuteOxygen", "acuteMentalStatus", "mimicConcern"],
        "acute",
      );
      add(
        "acute-tests",
        "Acute care",
        "Available tests and treatment context",
        ["acuteCrp", "acutePh", "acutePaco2", "maintenanceOcs"],
        "acute",
        { optional: true },
      );
      add(
        "acute-setting",
        "Acute care",
        "Choose the appropriate setting of care",
        ["outpatientSupport", "outpatientAppropriate", "acuteReassessed"],
        "acute",
      );
      if (d.acuteReassessed === true)
        add(
          "acute-response",
          "Acute care",
          "Actual reassessment findings",
          ["acuteResponse", "postSpo2"],
          "acute",
        );
      if (d.acutePurulence === true || d.mimicConcern === true)
        add(
          "acute-infection",
          "Acute care",
          "Antibiotic safety and infection context",
          ["antibioticSafety", "resistantOrganisms", "bronchiectasis"],
          "acute",
        );
      add(
        "acute-plans",
        "Plan",
        "Select the acute encounter plan",
        [],
        "acute",
        { plans: true },
      );
    } else {
      add(
        "diagnosis",
        "Diagnosis",
        "Diagnostic evidence",
        ["diagnosisContext", "historicalObstruction", "asthma"],
        "diagnosis",
      );
      add(
        "spirometry",
        "Diagnosis",
        "Available stable-state spirometry",
        ["fev1fvc", "fev1Predicted"],
        "diagnosis",
        { optional: true },
      );
      add(
        "symptoms",
        "Symptoms",
        "Symptoms and activity",
        ["mmrcScore", "catScore", "persistentDyspnea"],
        null,
        { calculators: true },
      );
      add(
        "exacerbations",
        "Symptoms",
        "Exacerbations in the last 12 months",
        ["moderateExac", "severeExac"],
        "exacerbations",
        { zero: true },
      );
      add(
        "barriers",
        "Treatment",
        "Treatment barriers and adverse effects",
        [
          "adherenceConcern",
          "techniqueConcern",
          "accessConcern",
          "deviceConcern",
          "icsSideEffects",
          "recurrentPneumonia",
        ],
        "inhalers",
        {
          hint: "Check routine barriers that are present. Unchecked barrier boxes are treated as absent. Pneumonia history remains an explicit question.",
        },
      );
      if (
        r.findings.risk.high === true ||
        r.findings.therapy.hasIcs ||
        d.asthma !== "no"
      )
        add(
          "phenotype",
          "Treatment",
          "ICS benefit and exacerbation phenotype",
          ["eosinophils", "historicalEosinophils", "chronicBronchitis"],
          "inhalers",
        );
      add(
        "smoking",
        "Prevention",
        "Tobacco and cigarette exposure",
        ["smokingStatus", "packYears"],
        "screening",
      );
      if (d.smokingStatus === "former")
        add(
          "former-smoking",
          "Prevention",
          "Smoking history",
          ["yearsSinceQuit"],
          "screening",
          { optional: true },
        );
      if (d.smokingStatus === "current") {
        add("quit-context", "Prevention", "Tailor tobacco treatment", [
          "quitReadiness",
          "cigarettesPerDay",
          "firstCigarette",
        ]);
        add(
          "quit-safety",
          "Prevention",
          "Cessation prescribing review",
          ["cessationSafety", "renalStatus", "bupropionContra"],
          null,
          {
            hint: "Varenicline or combination nicotine replacement with behavioral support are effective options. Bupropion is an alternative. Stable psychiatric illness alone does not preclude pharmacotherapy.",
          },
        );
      }
      add(
        "care-gaps",
        "Prevention",
        "One-time testing and rehabilitation",
        ["aatdStatus", "rehabStatus"],
        "aat",
      );
      if (["not-done", "completed", "declined"].includes(d.rehabStatus))
        add(
          "rehab-plan",
          "Prevention",
          "Rehabilitation and activity plan",
          ["rehabPreference"],
          null,
          {
            hint: "ATS recommends pulmonary rehabilitation for stable COPD and after hospitalization. An appropriate remote program can address access barriers.",
          },
        );
      add(
        "cancer-context",
        "Prevention",
        "Screening or diagnostic evaluation?",
        ["screeningContext"],
        "screening",
      );
      if (
        d.screeningContext === "screening" &&
        d.age >= 50 &&
        d.packYears >= 20
      )
        add(
          "cancer-screen",
          "Prevention",
          "Lung cancer screening review",
          ["curativeBenefit", "ldctStatus"],
          "screening",
        );
      add(
        "vaccines-1",
        "Prevention",
        "Respiratory vaccinations",
        ["pneumococcalStatus", "rsvStatus", "fluStatus"],
        "vaccines",
      );
      add(
        "vaccines-2",
        "Prevention",
        "Other adult vaccinations",
        ["covidStatus", "zosterStatus", "tdapStatus"],
        "vaccines",
      );
      add(
        "oxygen-screen",
        "Support",
        "Oxygen and ventilation review",
        ["currentOxygen", "currentNiv", "restingSpo2", "oxygenConditions"],
        "oxygen",
      );
      add(
        "gas-screen",
        "Support",
        "Any additional gas-exchange information?",
        ["gasExchangeReview"],
        "oxygen",
        { optional: true },
      );
      if (
        d.currentOxygen === true ||
        d.currentNiv === true ||
        d.gasExchangeReview === true ||
        (d.restingSpo2 !== null && d.restingSpo2 <= 92) ||
        d.advancedInterest === "detail"
      ) {
        add(
          "oxygen-details",
          "Support",
          "Available oxygen and exercise data",
          ["oxygenFlow", "exertionalSpo2", "exertionalRoomAir", "abgAvailable"],
          "oxygen",
          { optional: true },
        );
      }
      if (d.abgAvailable === true) {
        add(
          "gas-exchange",
          "Support",
          "Stable arterial gas exchange",
          ["pao2", "paco2", "abgRoomAir", "hypoxemiaComplication"],
          "oxygen",
        );
        if ((d.paco2 !== null && d.paco2 > 45) || d.currentNiv === true)
          add(
            "ventilation",
            "Support",
            "Persistent hypercapnia and sleep apnea",
            ["hypercapniaContext", "osaStatus"],
            "oxygen",
          );
      }
      add(
        "other-care",
        "Support",
        "Other clinically relevant concerns",
        [
          "bronchiectasis",
          "weightLoss",
          "cardiovascularConcern",
          "moodConcern",
          "osteoporosisConcern",
          "supportiveNeeds",
        ],
        null,
        {
          hint: "Check concerns to address. These prompts do not establish a new diagnosis.",
        },
      );
      add(
        "advanced-screen",
        "Procedures & transplant",
        "Lung volume reduction and transplant referral",
        ["emphysema", "progression", "advancedInterest"],
        "advanced",
      );
      if (d.advancedInterest === "detail") {
        add(
          "advanced-pft",
          "Procedures & transplant",
          "Emphysema: CT and lung-function workup",
          ["ctDistribution", "rv", "tlc", "dlco"],
          "advanced",
          { optional: true },
        );
        add(
          "advanced-exercise",
          "Procedures & transplant",
          "Exercise capacity and procedural risk",
          [
            "bmi",
            "walkDistance",
            "collateralVentilation",
            "pulmonaryHypertension",
          ],
          "advanced",
          { optional: true },
        );
        add(
          "advanced-context",
          "Procedures & transplant",
          "Procedure and transplant considerations",
          ["proceduralContra"],
          "advanced",
          { optional: true },
        );
      }
      if (r.addonCandidates.some((c) => c.id === "roflumilast"))
        add(
          "roflumilast-safety",
          "Medication review",
          "Roflumilast: prescribing checks",
          ["roflumilastLiver", "roflumilastWeightConcern", "roflumilastSafety"],
          "roflumilastReview",
          {
            hint: "An option for exacerbations with chronic bronchitis and FEV1 below 50%. Complete these checks only if considering roflumilast; otherwise leave them not assessed. This does not select a prescription.",
          },
        );
      if (r.addonCandidates.some((c) => c.id === "azithromycin"))
        add(
          "azithromycin-safety",
          "Medication review",
          "Maintenance azithromycin: prescribing checks",
          [
            "azithromycinQtSafety",
            "azithromycinHearingLiverSafety",
            "azithromycinInfectionReview",
          ],
          "azithromycinReview",
          {
            hint: "A monitored, off-label option for exacerbation prevention, particularly in non-current smokers. Complete only if considering maintenance azithromycin; this is not the acute-antibiotic pathway.",
          },
        );
      if (r.addonCandidates.some((c) => c.id === "ensifentrine"))
        add(
          "ensifentrine-safety",
          "Medication review",
          "Ensifentrine: prescribing checks",
          ["ensifentrineSafety", "ensifentrineDevice"],
          "ensifentrineReview",
          {
            hint: "A nebulized maintenance option for persistent symptoms despite long-acting bronchodilation. Complete only if considering ensifentrine; otherwise leave these checks not assessed.",
          },
        );
      if (
        r.addonCandidates.some((c) =>
          ["dupilumab", "mepolizumab"].includes(c.id),
        )
      )
        add(
          "biologic-safety",
          "Medication review",
          "Biologic treatment: eligibility and safety",
          ["biologicReview", "helminthReview"],
          "inhalers",
        );
      add(
        "plans",
        "Plan",
        "Select the encounter treatment plan",
        [],
        "inhalers",
        { plans: true },
      );
    }
    add(
      "review",
      "Review",
      "Review and generate the clinical draft",
      [],
      null,
      { review: true },
    );
    return out;
  }
  function reconcileStep(previous, next) {
    if (next.some((s) => s.id === previous)) return previous;
    return next[0].id;
  }
  return { steps, reconcileStep };
});
