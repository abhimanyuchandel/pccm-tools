(function (root, factory) {
  const api = factory(
    typeof module !== "undefined" && module.exports
      ? require("./input-schema.js")
      : root.copdSchema,
    typeof module !== "undefined" && module.exports
      ? require("./medications.js")
      : root.copdMedications,
  );
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.copdLogic = api;
})(
  typeof globalThis !== "undefined" ? globalThis : this,
  function (schema, catalog) {
    "use strict";
    const known = (n) =>
      n !== null && n !== undefined && n !== "" && Number.isFinite(Number(n));
    const labels = {
      naive: "no maintenance inhaler",
      lama: "LAMA monotherapy",
      laba: "LABA monotherapy",
      "laba-lama": "LABA/LAMA",
      "ics-laba": "ICS/LABA",
      triple: "ICS/LABA/LAMA",
      other: "an incompletely characterized regimen",
      unknown: "an undocumented regimen",
    };
    function createEmptyState() {
      return Object.fromEntries(
        Object.entries(schema).map(([key, f]) => [
          key,
          f.type === "number" || f.boolean
            ? null
            : (f.defaultValue ?? "unknown"),
        ]),
      );
    }
    function normalizeState(input = {}) {
      const d = createEmptyState();
      Object.entries(schema).forEach(([key, f]) => {
        const value = input[key];
        if (f.type === "number")
          d[key] =
            value === "" || value === undefined || value === null
              ? null
              : Number(value);
        else if (f.boolean)
          d[key] =
            value === true || value === "yes"
              ? true
              : value === false || value === "no"
                ? false
                : null;
        else if (f.type === "concern") d[key] = value === true;
        else if (f.options.some(([v]) => v === value)) d[key] = value;
      });
      if (d.addonContext === "none") {
        [
          "currentRoflumilast",
          "currentAzithromycin",
          "currentEnsifentrine",
          "maintenanceOcs",
        ].forEach((k) => {
          if (d[k] === null) d[k] = false;
        });
        if (d.currentBiologic === "unknown") d.currentBiologic = "none";
      }
      return d;
    }
    function quality(d) {
      const errors = [],
        warnings = [];
      Object.entries(schema).forEach(([key, f]) => {
        const n = d[key];
        if (f.type !== "number" || n === null) return;
        if (
          !Number.isFinite(n) ||
          n < f.min ||
          n > f.max ||
          (f.integer && !Number.isInteger(n))
        )
          errors.push({
            key,
            text:
              f.label +
              ": enter a valid value within " +
              f.min +
              "-" +
              f.max +
              (f.integer ? " (whole numbers)." : "."),
          });
        else if (
          (f.warningLow !== undefined && n < f.warningLow) ||
          (f.warningHigh !== undefined && n > f.warningHigh)
        )
          warnings.push({
            key,
            text:
              f.label +
              ": clinically unusual or concerning; verify the value and assess in context.",
          });
      });
      return { errors, warnings };
    }
    function normalizeFev1FvcHeuristic(value) {
      if (!known(value) || Number(value) < 0 || Number(value) > 100)
        return null;
      return Number(value) > 1 ? Number(value) / 100 : Number(value);
    }
    function describeFev1FvcEntry(value) {
      const normalized = normalizeFev1FvcHeuristic(value);
      return {
        normalized,
        ratio: normalized,
        valid: normalized !== null,
        interpretedAsPercent: known(value) && Number(value) > 1,
      };
    }
    function classifySymptoms(cat, mmrc) {
      if (cat && typeof cat === "object") {
        mmrc = cat.mmrcScore;
        cat = cat.catScore;
      }
      const high = (known(cat) && +cat >= 10) || (known(mmrc) && +mmrc >= 2);
      return {
        high: high ? true : known(cat) || known(mmrc) ? false : null,
        label: high
          ? "higher symptom burden"
          : known(cat) || known(mmrc)
            ? "lower symptom burden"
            : "symptom burden not classified",
      };
    }
    function classifyExacerbationRisk(moderate, severe) {
      if (moderate && typeof moderate === "object") {
        severe = moderate.severeExac;
        moderate = moderate.moderateExac;
      }
      const m = known(moderate) ? +moderate : null,
        s = known(severe) ? +severe : null;
      const complete = m !== null && s !== null;
      return {
        high: m >= 1 || s >= 1 ? true : complete ? false : null,
        complete,
        total: complete ? m + s : null,
        recurrent: m >= 2 || s >= 1,
        moderate: m,
        severe: s,
      };
    }
    function assignGoldGroup(cat, mmrc, moderate, severe) {
      if (cat && typeof cat === "object" && "high" in cat)
        return mmrc.high === true
          ? "E"
          : mmrc.high === false && cat.high !== null
            ? cat.high
              ? "B"
              : "A"
            : null;
      if (cat && typeof cat === "object") {
        const d = cat;
        return assignGoldGroup(
          d.catScore,
          d.mmrcScore,
          d.moderateExac,
          d.severeExac,
        );
      }
      const risk = classifyExacerbationRisk(moderate, severe),
        symptoms = classifySymptoms(cat, mmrc);
      return risk.high === true
        ? "E"
        : risk.high === false && symptoms.high !== null
          ? symptoms.high
            ? "B"
            : "A"
          : null;
    }
    function isRoflumilastCandidate(d) {
      return (
        known(d.fev1Predicted) &&
        d.fev1Predicted < 50 &&
        (d.chronicBronchitis === true || d.chronicBronchitis === "yes") &&
        classifyExacerbationRisk(d).high === true
      );
    }
    function isLungCancerScreenEligible(d, packYears) {
      const age = typeof d === "object" ? d.age : d,
        packs = typeof d === "object" ? d.packYears : packYears;
      return known(age) && +age >= 50 && known(packs) && +packs >= 20;
    }
    function getLungCancerScreeningFootnote() {
      return "Screening reference: National Comprehensive Cancer Network (NCCN) Clinical Practice Guidelines in Oncology, Lung Cancer Screening (2026 revision). Eligibility and insurance coverage may differ.";
    }
    function diagnose(d) {
      const ratio = normalizeFev1FvcHeuristic(d.fev1fvc),
        objective =
          (ratio !== null && ratio < 0.7) || d.historicalObstruction === true;
      const supported = objective || d.diagnosisContext === "established";
      const grade =
        supported && known(d.fev1Predicted)
          ? d.fev1Predicted >= 80
            ? 1
            : d.fev1Predicted >= 50
              ? 2
              : d.fev1Predicted >= 30
                ? 3
                : 4
          : null;
      return {
        ratio,
        objective,
        supported,
        grade,
        label: objective
          ? "COPD with documented post-bronchodilator obstruction"
          : d.diagnosisContext === "established"
            ? "previously established COPD with the original objective evidence to be reconciled"
            : "suspected COPD requiring diagnostic clarification",
      };
    }
    function assessAcute(d) {
      const urgentReasons = [];
      if (d.redFlags === true) urgentReasons.push("urgent warning features");
      if (["distress", "altered"].includes(d.acuteMentalStatus))
        urgentReasons.push("respiratory distress or altered mental status");
      if (d.acuteProgression === "worsening" || d.acuteResponse === "worse")
        urgentReasons.push("clinical deterioration");
      if (
        (known(d.acuteSpo2) && d.acuteSpo2 <= 85) ||
        (known(d.postSpo2) && d.postSpo2 <= 85) ||
        (known(d.restingSpo2) && d.restingSpo2 <= 85) ||
        (d.abgAvailable === true && known(d.pao2) && d.pao2 <= 40)
      )
        urgentReasons.push("marked hypoxemia");
      if (
        known(d.respiratoryRate) &&
        (d.respiratoryRate >= 30 || d.respiratoryRate < 8)
      )
        urgentReasons.push("markedly abnormal respiratory rate");
      if (
        (known(d.heartRate) && (d.heartRate >= 130 || d.heartRate < 40)) ||
        (known(d.systolicBp) && d.systolicBp < 90)
      )
        urgentReasons.push("possible circulatory instability");
      if (
        known(d.acutePh) &&
        d.acutePh < 7.35 &&
        known(d.acutePaco2) &&
        d.acutePaco2 > 45
      )
        urgentReasons.push("hypercapnic respiratory acidosis");
      const active = d.encounter === "active";
      const complete =
        d.redFlags === false &&
        known(d.respiratoryRate) &&
        known(d.heartRate) &&
        known(d.acuteSpo2) &&
        d.acuteOxygen !== "unknown" &&
        d.acuteMentalStatus === "baseline" &&
        d.acuteProgression !== "unknown" &&
        d.mimicConcern === false;
      const romeCount = [
        known(d.acuteDyspneaScore) && d.acuteDyspneaScore >= 5,
        known(d.respiratoryRate) && d.respiratoryRate >= 24,
        known(d.heartRate) && d.heartRate >= 95,
        known(d.acuteSpo2) && d.acuteSpo2 < 92,
        known(d.acuteCrp) && d.acuteCrp >= 10,
      ].filter(Boolean).length;
      return {
        active,
        emergency: urgentReasons.length > 0,
        urgentReasons,
        complete,
        romeCount,
        label: urgentReasons.length
          ? "urgent evaluation required"
          : romeCount >= 3
            ? "multiple moderate-severity features"
            : "severity requires clinical assessment",
        outpatient:
          active &&
          !urgentReasons.length &&
          complete &&
          d.outpatientAppropriate === true &&
          d.outpatientSupport === true,
        antibiotics:
          d.acutePurulence === true &&
          (d.acuteDyspnea === true || d.acuteSputumVolume === true),
      };
    }
    function calculateBode(d) {
      if (![d.bmi, d.fev1Predicted, d.mmrcScore, d.walkDistance].every(known))
        return null;
      if (
        d.bmi <= 0 ||
        d.fev1Predicted <= 0 ||
        d.mmrcScore < 0 ||
        d.mmrcScore > 4 ||
        !Number.isInteger(d.mmrcScore) ||
        d.walkDistance < 0
      )
        return null;
      return (
        (d.bmi > 21 ? 0 : 1) +
        (d.fev1Predicted >= 65
          ? 0
          : d.fev1Predicted >= 50
            ? 1
            : d.fev1Predicted >= 36
              ? 2
              : 3) +
        (d.mmrcScore <= 1 ? 0 : d.mmrcScore - 1) +
        (d.walkDistance >= 350
          ? 0
          : d.walkDistance >= 250
            ? 1
            : d.walkDistance >= 150
              ? 2
              : 3)
      );
    }
    function advanced(d, risk) {
      const bode = calculateBode(d);
      const trigger =
        d.emphysema === true ||
        d.progression === true ||
        (known(d.fev1Predicted) && d.fev1Predicted < 50) ||
        d.mmrcScore >= 3 ||
        d.catScore >= 20 ||
        risk.recurrent ||
        d.currentOxygen === true ||
        d.currentNiv === true ||
        d.pulmonaryHypertension === true ||
        d.advancedInterest === "detail";
      const hyperinflation =
        (known(d.rv) && d.rv >= 150) || (known(d.tlc) && d.tlc > 100);
      return {
        trigger,
        bode,
        lvr:
          d.emphysema === true &&
          (hyperinflation ||
            d.progression === true ||
            d.persistentDyspnea === true),
        surgicalRisk:
          known(d.fev1Predicted) &&
          d.fev1Predicted <= 20 &&
          ((known(d.dlco) && d.dlco <= 20) ||
            d.ctDistribution === "homogeneous"),
        transplant:
          (bode !== null && bode >= 5) ||
          (known(d.fev1Predicted) && d.fev1Predicted < 25) ||
          (d.abgAvailable === true &&
            ((known(d.paco2) && d.paco2 > 50) ||
              (d.abgRoomAir === true && known(d.pao2) && d.pao2 < 60))) ||
          d.pulmonaryHypertension === true ||
          (d.progression === true && risk.recurrent),
      };
    }
    function buildRecommendation(input, requested = {}) {
      const d = normalizeState(input),
        q = quality(d),
        diagnosis = diagnose(d),
        symptoms = classifySymptoms(d),
        risk = classifyExacerbationRisk(d),
        acute = assessAcute(d);
      const maintenance = [
        "lama",
        "laba",
        "laba-lama",
        "ics-laba",
        "triple",
      ].includes(d.currentRegimen);
      const therapy = {
        maintenance,
        phase: maintenance ? "followup" : d.managementPhase,
        hasIcs: ["ics-laba", "triple"].includes(d.currentRegimen),
        optimized: ![
          "adherenceConcern",
          "techniqueConcern",
          "accessConcern",
          "deviceConcern",
        ].some((k) => d[k]),
        label: labels[d.currentRegimen],
      };
      const adv = advanced(d, risk);
      const r = {
        data: d,
        findings: { diagnosis, symptoms, risk, acute, therapy, advanced: adv },
        group: assignGoldGroup(d),
        actions: [],
        groups: [],
        selections: {},
        medications: [],
        cautions: [],
        errors: q.errors,
        warnings: q.warnings,
        invalid: q.errors.length > 0,
        emergency: acute.emergency,
        sources: [],
        references: [],
        addonCandidates: [],
        preventionFootnote: getLungCancerScreeningFootnote(),
      };
      const action = (id, text, kind = "management", sources = ["gold"]) => {
        if (!r.actions.some((a) => a.id === id))
          r.actions.push({ id, text, kind, sources });
      };
      const option = (id, label, text, blockers = [], medicationId = null) => ({
        id,
        label,
        text,
        blockers: blockers.filter(Boolean),
        medicationId,
      });
      const group = (
        id,
        title,
        options,
        placeholder = "Encounter plan: ***",
      ) => {
        const chosen = options.find(
          (o) => o.id === requested[id] && !o.blockers.length,
        );
        r.groups.push({
          id,
          title,
          options,
          selected: chosen?.id || "",
          placeholder,
          hint:
            id === "product"
              ? "Examples, not a ranking. Choose by local formulary, cost and device suitability. Selecting a product writes its prescription into the plan; it does not document prior use."
              : "",
        });
        if (chosen) {
          r.selections[id] = chosen.id;
          action(
            "selected-" + id,
            chosen.text,
            id === "pneumococcalPlan" ? "prevention" : id,
            chosen.medicationId
              ? catalog.getMedicationSources(chosen.medicationId)
              : id === "cessation"
                ? [
                    "tobacco",
                    ...(chosen.id === "varenicline" ? ["varenicline"] : []),
                  ]
                : id === "pneumococcalPlan"
                  ? ["pneumo"]
                  : id === "transplant"
                    ? ["transplant"]
                    : id === "lvr"
                      ? ["lvr", "valves"]
                      : ["gold"],
          );
          if (chosen.medicationId) r.medications.push(chosen.medicationId);
        } else if (requested[id])
          r.cautions.push(
            "A previous " +
              title.toLowerCase() +
              " selection no longer fits the findings or safety review and was cleared.",
          );
        return chosen;
      };
      if (maintenance && d.managementPhase === "initial")
        r.cautions.push(
          "Existing maintenance therapy was documented, so follow-up management logic was used.",
        );
      if (
        d.addonContext === "none" &&
        (d.maintenanceOcs === true ||
          d.currentRoflumilast === true ||
          d.currentAzithromycin === true ||
          d.currentEnsifentrine === true ||
          !["unknown", "none"].includes(d.currentBiologic))
      )
        r.cautions.push(
          "A specific maintenance add-on was documented despite the general 'none' answer. The known medication exposure was retained; reconcile the treatment history.",
        );
      if (d.currentRegimen === "other")
        r.cautions.push(
          "Reconcile the actual maintenance agents before changing therapy or adding overlapping bronchodilators.",
        );
      if (
        diagnosis.ratio !== null &&
        diagnosis.ratio >= 0.7 &&
        diagnosis.supported
      )
        r.cautions.push(
          "Current spirometry does not show fixed-ratio obstruction. Reconcile timing, quality, historical evidence and alternative diagnoses.",
        );
      if (!risk.complete)
        r.cautions.push(
          "Exacerbation history is incomplete. Known positive events remain actionable; missing counts were not treated as zero.",
        );
      if (q.errors.length)
        r.cautions.push(
          "Correct invalid numeric entries before generating or copying the clinical note.",
        );
      if (acute.emergency) {
        action(
          "urgent",
          "Arrange urgent emergency-level assessment for " +
            acute.urgentReasons.join(", ") +
            ". Do not delay for routine inhaler changes or completion of this tool. Assess oxygenation, ventilation, circulation and alternative diagnoses.",
          "urgent",
        );
      } else if (!r.invalid) {
        if (acute.active) acutePlan();
        else {
          maintenancePlan();
          carePlan();
          oxygenPlan();
          advancedPlan();
          cessationPlan();
        }
      }
      const groupIds = new Set(r.groups.map((g) => g.id));
      Object.keys(requested).forEach((id) => {
        if (requested[id] && !groupIds.has(id))
          r.cautions.push(
            "An earlier plan selection was removed because that pathway is no longer applicable.",
          );
      });
      r.sources = [
        ...new Set(
          r.actions
            .flatMap((a) => a.sources)
            .concat(
              r.medications.flatMap((k) => catalog.getMedicationSources(k)),
            ),
        ),
      ];
      return r;

      function acutePlan() {
        r.references.push("acute");
        action(
          "acute-assess",
          "Assess exacerbation severity and mimics, including pneumonia, heart failure, pulmonary embolism and arrhythmia. Review oxygen requirements and treatment already used. Titrate oxygen in monitored acute care toward 88-92% when appropriate and obtain blood gases for suspected ventilatory failure.",
          "acute",
        );
        if (!acute.outpatient)
          action(
            "acute-incomplete",
            "Complete the acute safety assessment and decide the appropriate setting of care. Missing observations or improvement alone do not establish outpatient or discharge safety.",
            "acute",
          );
        const block = [
          !acute.outpatient &&
            "Complete acute observations, support assessment and clinician confirmation of outpatient suitability.",
          !known(d.age) && "Confirm adult age.",
        ];
        group(
          "acuteBronchodilator",
          "Acute bronchodilator plan",
          [
            option(
              "mdi",
              "Albuterol MDI",
              "Use albuterol 90 mcg per actuation, 2 inhalations every 4-6 hours as needed with a spacer. Reassess response and escalate care for inadequate relief.",
              block,
            ),
            option(
              "neb",
              "Albuterol nebulizer",
              "Use nebulized albuterol 2.5 mg every 4-6 hours as needed. Reassess response and avoid duplicate rescue dosing.",
              block,
            ),
            option(
              "duoneb",
              "Albuterol/ipratropium nebulizer",
              "Use nebulized albuterol 2.5 mg/ipratropium 0.5 mg every 6 hours for the short acute course. Review cumulative antimuscarinic exposure and reassess.",
              block,
            ),
            option(
              "review",
              "Assess in monitored setting",
              "Arrange monitored assessment and individualize acute bronchodilator treatment.",
            ),
          ],
          "Acute bronchodilator and treatment setting: ***.",
        );
        group(
          "acuteSteroid",
          "Systemic corticosteroid plan",
          [
            option(
              "burst",
              "Prednisone 40 mg for 5 days",
              "Start prednisone 40 mg orally daily for 5 days. Review glucose, infection risk and recent steroid exposure.",
              [
                ...block,
                d.maintenanceOcs !== false &&
                  "Clarify maintenance systemic-steroid exposure first.",
              ],
            ),
            option(
              "individual",
              "Individualized steroid regimen",
              "Use an individualized systemic-steroid regimen of *** after reviewing baseline oral-steroid exposure, cumulative dose and adrenal risk.",
              block,
            ),
            option(
              "none",
              "No systemic steroid course",
              "Do not add systemic corticosteroids for this episode based on the clinical assessment.",
            ),
            option(
              "defer",
              "Assess before selecting steroids",
              "Complete assessment before selecting a systemic-steroid course.",
            ),
          ],
          "Systemic corticosteroid decision: ***.",
        );
        if (
          acute.antibiotics ||
          d.acutePurulence === null ||
          d.mimicConcern === true
        ) {
          const ab = [
            ...block,
            !acute.antibiotics &&
              "Document the bacterial exacerbation indication or evaluate a separate infection.",
            d.antibioticSafety !== true &&
              "Confirm antibiotic allergy, pregnancy, renal and interaction review.",
            d.resistantOrganisms !== false && "Review resistant-organism risk.",
            d.bronchiectasis !== false &&
              "Clarify bronchiectasis / recurrent-infection context.",
          ];
          group(
            "acuteAntibiotic",
            "Antibiotic plan",
            [
              option(
                "doxy",
                "Doxycycline",
                "Start doxycycline 100 mg orally twice daily for 5 days for the documented purulent COPD exacerbation, following local susceptibility guidance.",
                ab,
              ),
              option(
                "amox",
                "Amoxicillin/clavulanate",
                "Start amoxicillin/clavulanate 875/125 mg orally twice daily for 5 days after verifying renal suitability and local guidance.",
                ab,
              ),
              option(
                "culture",
                "Individualized / culture-directed",
                "Obtain relevant cultures and select antibiotic *** based on infection context, prior organisms, allergies, renal function and local guidance.",
              ),
              option(
                "none",
                "No antibiotic",
                "Do not prescribe an antibiotic for the current COPD exacerbation based on the clinical assessment.",
              ),
            ],
            "Antibiotic decision: ***.",
          );
        } else
          action(
            "no-abx",
            "Do not routinely prescribe antibiotics without a bacterial indication. Reassess if purulence, pneumonia or other infection features develop.",
            "acute",
          );
        if (d.acuteReassessed === true)
          action(
            "reassessment",
            "Use the documented reassessment together with vital signs, oxygen needs, function and home support to decide disposition. Do not infer discharge readiness from symptom improvement alone.",
            "acute",
          );
        action(
          "acute-followup",
          "Arrange early reassessment, typically within 24-72 hours for an outpatient episode, sooner for inadequate response. Seek urgent care for worsening breathlessness, confusion, chest pain, cyanosis or increasing oxygen needs. Review maintenance and preventive care during recovery, with follow-up within 1-4 weeks and again by 3 months as appropriate.",
          "followup",
        );
      }
      function maintenancePlan() {
        r.references.push("diagnosis", "exacerbations", "inhalers");
        if (!diagnosis.objective)
          action(
            "diagnostic",
            diagnosis.supported
              ? "Retrieve prior post-bronchodilator spirometry and reconcile the established COPD diagnosis. Repeat testing when evidence is unavailable or the clinical picture is discordant."
              : "Obtain post-bronchodilator spirometry in the appropriate stable clinical context and evaluate alternative diagnoses before confirming COPD.",
            "testing",
          );
        if (
          diagnosis.ratio !== null &&
          diagnosis.ratio >= 0.6 &&
          diagnosis.ratio <= 0.8
        )
          action(
            "repeat-spirometry",
            "Consider repeat post-bronchodilator spirometry to confirm a borderline ratio, taking quality, age and the clinical context into account.",
            "testing",
          );
        if (!therapy.optimized)
          action(
            "optimization",
            "Address the documented inhaler technique, adherence, device or access barriers before interpreting treatment failure. Recheck the actual inhalers and avoid duplicate LABA/LAMA therapy.",
            "management",
          );
        const base = [
          !diagnosis.supported && "Clarify COPD diagnosis.",
          !known(d.age) && "Confirm adult age.",
          !therapy.optimized &&
            "Address treatment barriers before routine escalation.",
        ];
        const asthma = d.asthma === "confirmed" || d.asthma === "suspected";
        const o = [];
        if (therapy.maintenance)
          o.push(
            option(
              "continue",
              "Continue current maintenance regimen",
              "Continue the current " + therapy.label + " regimen.",
              asthma && !therapy.hasIcs
                ? [
                    "An ICS-containing strategy is needed for coexisting asthma.",
                  ]
                : [],
            ),
          );
        const dual = () =>
          o.push(
            option(
              "dual",
              "Use LABA/LAMA",
              "Start or change to LABA/LAMA maintenance therapy. Prescription details: ***. Replace overlapping long-acting bronchodilators.",
              [
                ...base,
                d.asthma !== "no" &&
                  "Clarify coexisting asthma before choosing a non-ICS strategy.",
              ],
            ),
          );
        const triple = () =>
          o.push(
            option(
              "triple",
              "Use ICS/LABA/LAMA",
              "Start or change to ICS/LABA/LAMA maintenance therapy. Prescription details: ***. Replace overlapping maintenance inhalers and review pneumonia risk.",
              base,
            ),
          );
        if (!therapy.maintenance && r.group === "A") {
          o.push(
            option(
              "lama",
              "Use a LAMA",
              "Start LAMA maintenance therapy. Prescription details: ***.",
              [...base, d.asthma !== "no" && "Clarify coexisting asthma."],
            ),
          );
          o.push(
            option(
              "laba",
              "Use a LABA",
              "Start LABA maintenance therapy. Prescription details: ***.",
              [...base, d.asthma !== "no" && "Clarify coexisting asthma."],
            ),
          );
        }
        if (
          (!therapy.maintenance && ["B", "E"].includes(r.group)) ||
          (["lama", "laba"].includes(d.currentRegimen) &&
            (symptoms.high === true ||
              d.persistentDyspnea === true ||
              risk.high === true))
        )
          dual();
        if (
          (!therapy.maintenance &&
            r.group === "E" &&
            d.eosinophils !== null &&
            d.eosinophils >= 300) ||
          (d.currentRegimen === "laba-lama" &&
            risk.high &&
            d.eosinophils !== null &&
            d.eosinophils >= 100) ||
          (d.currentRegimen === "ics-laba" && risk.high)
        )
          triple();
        if (asthma && !therapy.hasIcs) {
          o.push(
            option(
              "ics-laba",
              "Use an ICS-containing asthma/COPD regimen",
              "Start an ICS-containing asthma/COPD maintenance regimen. Prescription details: ***. Manage the asthma component according to asthma guidance.",
              base,
            ),
          );
          if (d.currentRegimen === "laba-lama") triple();
        }
        if (
          d.currentRegimen === "ics-laba" &&
          d.persistentDyspnea === true &&
          risk.high === false &&
          d.asthma === "no"
        )
          dual();
        if (
          therapy.hasIcs &&
          (d.recurrentPneumonia === true || d.icsSideEffects)
        ) {
          o.push(
            option(
              "withdraw",
              "Withdraw ICS with monitoring; use LABA/LAMA",
              "Withdraw ICS because of the documented adverse-effect/pneumonia concern and use LABA/LAMA. Prescription details: ***. Monitor closely for exacerbations and reinstate ICS if clinically required.",
              [
                ...base,
                d.asthma !== "no" && "Do not withdraw ICS needed for asthma.",
                (d.eosinophils === null ||
                  d.eosinophils >= 300 ||
                  (d.historicalEosinophils !== null &&
                    d.historicalEosinophils >= 300)) &&
                  "Clarify eosinophils and the increased withdrawal risk at 300 or more.",
                risk.high !== false &&
                  "Reconcile exacerbation risk before ICS withdrawal.",
              ],
            ),
          );
        }
        o.push(
          option(
            "clarify",
            "Clarify before changing treatment",
            "Reconcile diagnosis, current therapy, symptom burden and exacerbation history before choosing a controller change.",
          ),
        );
        const selected = group(
          "controller",
          "Controller strategy",
          [...new Map(o.map((x) => [x.id, x])).values()],
          "Controller strategy and prescription: ***.",
        );
        const category =
          selected?.id === "continue"
            ? d.currentRegimen
            : selected?.id === "dual" || selected?.id === "withdraw"
              ? "laba-lama"
              : selected?.id;
        if (
          ["lama", "laba", "laba-lama", "triple", "ics-laba"].includes(category)
        ) {
          const products = Object.entries(catalog.MEDICATIONS)
            .filter(([, m]) => m.category === category)
            .map(([id, m]) =>
              option(
                id,
                m.name,
                "Use " + m.dose + " Replace overlapping maintenance inhalers.",
                [
                  !known(d.age) &&
                    "Confirm adult age before selecting a prescription.",
                  !diagnosis.supported &&
                    "Reconcile the COPD diagnostic context.",
                  d.deviceConcern &&
                    "Confirm the selected device is suitable after reviewing the device concern.",
                ],
                id,
              ),
            );
          const product = group(
            "product",
            "Optional U.S. controller prescription",
            products,
            "",
          );
          if (product) {
            r.actions = r.actions.filter((a) => a.id !== "selected-controller");
            if (selected.id === "withdraw")
              action(
                "withdraw-monitor",
                "Withdraw the previous ICS-containing regimen for the documented adverse effect and monitor closely for exacerbations. Reintroduce ICS if clinically required.",
                "controller",
              );
          }
        }
        group(
          "rescue",
          "Rescue prescription",
          [
            option(
              "continue",
              "Continue documented rescue prescription",
              "Continue the current short-acting rescue prescription.",
              !["albuterol", "duoneb", "other"].includes(d.reliever)
                ? [
                    "Clarify the current rescue prescription before continuing it.",
                  ]
                : [],
            ),
            option(
              "albuterol",
              "Albuterol MDI",
              "Use albuterol 90 mcg per actuation, 2 inhalations every 4-6 hours as needed for wheeze or breathlessness. Review spacer technique.",
              [!known(d.age) && "Confirm adult age."],
            ),
            option(
              "neb",
              "Albuterol nebulizer",
              "Use nebulized albuterol 2.5 mg every 4-6 hours as needed for wheeze or breathlessness. Avoid duplicate rescue dosing.",
              [!known(d.age) && "Confirm adult age."],
            ),
          ],
          "Rescue prescription: ***.",
        );
        if (
          d.reliever === "duoneb" &&
          ["lama", "laba-lama", "triple"].includes(d.currentRegimen)
        )
          r.cautions.push(
            "Review routine ipratropium with maintenance LAMA therapy to avoid unnecessary antimuscarinic duplication.",
          );
        addOnPlan();
        if (d.maintenanceOcs === true)
          action(
            "ocs",
            "Review the indication and cumulative harms of maintenance systemic corticosteroids. Do not stop abruptly when adrenal suppression is possible; individualize any taper.",
            "management",
          );
        action(
          "core",
          "Review inhaler technique and access, encourage feasible physical activity and exposure reduction, and provide or update a COPD action plan. Seek urgent care for severe/worsening breathlessness, chest pain, confusion, cyanosis or increasing oxygen needs.",
          "counseling",
        );
        action(
          "followup",
          d.encounter === "recovery"
            ? "Follow up within 1-4 weeks after the exacerbation and reassess recovery, oxygen needs and prevention by 3 months."
            : (selected && !["continue", "clarify"].includes(selected.id)) ||
                risk.high === true
              ? "Follow up in about 4-6 weeks to reassess symptoms, exacerbations, adherence and adverse effects, sooner for deterioration."
              : "Follow up in about 3-6 months, sooner for worsening symptoms or an exacerbation.",
          "followup",
        );
      }
      function addOnPlan() {
        const candidates = [],
          base = [
            !known(d.age) && "Confirm adult age.",
            !diagnosis.supported && "Confirm the COPD diagnostic context.",
            !therapy.optimized && "Address treatment barriers.",
          ];
        const add = (id, why, blockers) => {
          if (["roflumilast", "azithromycin", "ensifentrine"].includes(id))
            r.references.push(id + "Review");
          r.addonCandidates.push({
            id,
            why,
            blockers: blockers.filter(Boolean),
          });
          candidates.push(
            option(
              id,
              catalog.MEDICATIONS[id].name,
              "Start " + catalog.MEDICATIONS[id].dose,
              blockers,
              id,
            ),
          );
        };
        if (
          ["laba-lama", "triple"].includes(d.currentRegimen) &&
          d.persistentDyspnea === true
        )
          add(
            "ensifentrine",
            "Persistent symptoms despite long-acting bronchodilation. Nebulized delivery can be useful; review burden, psychiatric history and limited direct evidence on top of triple therapy.",
            [
              ...base,
              d.currentEnsifentrine !== false &&
                "Clarify existing ensifentrine exposure.",
              d.ensifentrineSafety !== true &&
                "Complete ensifentrine hypersensitivity and psychiatric-risk review.",
              d.ensifentrineDevice !== true &&
                "Confirm access and ability to use the twice-daily jet-nebulizer treatment.",
            ],
          );
        if (
          isRoflumilastCandidate(d) &&
          ["laba-lama", "triple"].includes(d.currentRegimen)
        )
          add(
            "roflumilast",
            "FEV1 below 50%, chronic bronchitis and exacerbations. Stronger rationale after hospitalization; weight loss, gastrointestinal and mood adverse effects can limit use.",
            [
              ...base,
              d.currentRoflumilast !== false &&
                "Clarify existing roflumilast exposure.",
              d.roflumilastLiver !== false &&
                "Exclude moderate/severe hepatic impairment.",
              d.roflumilastWeightConcern !== false &&
                "Review low weight or unexplained weight loss before roflumilast.",
              d.roflumilastSafety !== true &&
                "Complete roflumilast mood, interaction and monitoring review.",
            ],
          );
        if (
          risk.high === true &&
          ["laba-lama", "triple"].includes(d.currentRegimen) &&
          ["former", "never"].includes(d.smokingStatus)
        )
          add(
            "azithromycin",
            "Recurrent exacerbation prevention, particularly in non-current smokers. Off-label; assess QT, interactions, hearing, liver function, resistance and NTM. Long-term evidence beyond one year is limited.",
            [
              ...base,
              d.currentAzithromycin !== false &&
                "Clarify existing macrolide exposure.",
              d.azithromycinQtSafety !== true &&
                "Review ECG/QTc, arrhythmia risk and interacting medications.",
              d.azithromycinHearingLiverSafety !== true &&
                "Review hearing/balance, liver tests and macrolide allergy.",
              d.azithromycinInfectionReview !== true &&
                "Review microbiology, NTM assessment when indicated, and resistance risk.",
            ],
          );
        if (d.currentRegimen === "triple" && risk.recurrent) {
          const bio = [
            ...base,
            d.biologicReview !== true &&
              "Confirm persistent disease despite optimized triple therapy, phenotype, safety and local access criteria.",
            d.currentBiologic !== "none" &&
              "Reconcile current biologic; do not duplicate agents.",
            !["no-concern", "addressed"].includes(d.helminthReview) &&
              "Complete the parasitic-infection risk review and indicated evaluation/treatment.",
          ];
          if (
            d.eosinophils !== null &&
            d.eosinophils >= 300 &&
            d.chronicBronchitis === true
          )
            add(
              "dupilumab",
              "Eosinophils at least 300, chronic bronchitis and recurrent exacerbations on triple therapy fit the GOLD/trial profile. FDA's eosinophilic-phenotype indication and payer requirements are not identical. Consider injection burden, eosinophilic conditions and hypersensitivity.",
              bio,
            );
          if (
            (d.eosinophils !== null && d.eosinophils >= 150) ||
            (d.historicalEosinophils !== null && d.historicalEosinophils >= 300)
          )
            add(
              "mepolizumab",
              "Eosinophilic COPD with exacerbations despite triple therapy. Higher-eosinophil GOLD/MATINEE criteria and the broader METREX profile differ. The FDA indication does not impose a universal numeric threshold. Monthly dosing; review hypersensitivity, helminths and zoster.",
              bio,
            );
        }
        if (candidates.length)
          group(
            "addon",
            "Additional maintenance treatment",
            [
              ...candidates,
              option(
                "none",
                "No new add-on",
                "Do not add a new non-inhaler maintenance agent at this encounter.",
              ),
              option(
                "review",
                "Complete prerequisite review",
                "Complete phenotype, treatment-optimization and agent-specific safety review before selecting an additional maintenance agent.",
              ),
            ],
            "Additional maintenance treatment decision: ***.",
          );
      }
      function carePlan() {
        r.references.push("aat", "vaccines", "screening");
        if (d.aatdStatus === "not-done")
          action(
            "aat",
            "Obtain one-time alpha-1 antitrypsin deficiency testing with serum level and at least S/Z genotyping, with phenotype/confirmatory testing as appropriate.",
            "testing",
            ["aat"],
          );
        if (["unknown", "pending"].includes(d.aatdStatus))
          action(
            "aat-review",
            "Reconcile prior alpha-1 antitrypsin testing and complete diagnostic testing if not already adequately assessed.",
            "testing",
            ["aat"],
          );
        if (d.aatdStatus === "known-aatd")
          action(
            "aat-known",
            "Review AAT genotype/phenotype and arrange appropriate specialist, family-testing and liver-care assessment. Assess augmentation indications separately; do not infer eligibility from the diagnosis alone.",
            "referral",
            ["aat"],
          );
        if (["center", "remote"].includes(d.rehabPreference))
          action(
            "rehab",
            "Refer to " +
              (d.rehabPreference === "remote"
                ? "an appropriate remote"
                : "a center-based") +
              " pulmonary rehabilitation program, with assessment of exercise safety and access.",
            "referral",
            ["rehab"],
          );
        else if (
          d.rehabPreference === "maintain" ||
          d.rehabStatus === "current"
        )
          action(
            "rehab",
            "Continue pulmonary rehabilitation or a suitable maintenance exercise program.",
            "rehabilitation",
            ["rehab"],
          );
        else if (d.rehabPreference === "defer" || d.rehabStatus === "declined")
          action(
            "rehab",
            "Revisit pulmonary rehabilitation goals and practical barriers at follow-up.",
            "rehabilitation",
            ["rehab"],
          );
        else
          action(
            "rehab",
            "Review pulmonary rehabilitation access and offer an appropriate center-based or remote program, prioritizing referral after hospitalization.",
            "rehabilitation",
            ["rehab"],
          );
        if (d.screeningContext === "symptoms")
          action(
            "lung-diagnostic",
            "Evaluate concerning symptoms through diagnostic chest imaging and the appropriate clinical pathway rather than screening LDCT.",
            "screening",
            ["nccn"],
          );
        else if (d.screeningContext === "surveillance")
          action(
            "lung-surveillance",
            "Continue individualized lung cancer or pulmonary nodule surveillance rather than substituting a screening schedule.",
            "screening",
            ["nccn"],
          );
        else if (d.smokingStatus === "never" && d.packYears > 0)
          action(
            "ldct-conflict",
            "Reconcile the conflicting never-smoking history and positive cigarette pack-years before selecting a screening plan.",
            "screening",
            ["nccn"],
          );
        else if (
          isLungCancerScreenEligible(d) &&
          d.smokingStatus !== "unknown"
        ) {
          if (d.curativeBenefit === false)
            action(
              "ldct-stop",
              "Do not initiate or continue screening LDCT when the patient cannot or would not benefit from curative-intent treatment. Address diagnostic concerns separately.",
              "screening",
              ["nccn"],
            );
          else if (
            d.screeningContext !== "screening" ||
            d.curativeBenefit !== true
          )
            action(
              "ldct-review",
              "Confirm asymptomatic screening context, willingness and ability to benefit from curative-intent treatment, and current LDCT status. Review screening benefits, harms, preferences and coverage before ordering.",
              "screening",
              ["nccn"],
            );
          else if (d.ldctStatus === "due")
            action(
              "ldct",
              "Arrange annual screening low-dose chest CT with shared benefit/harms review and confirmation of curative-treatment benefit, preferences and coverage.",
              "screening",
              ["nccn"],
            );
          else if (d.ldctStatus === "current")
            action(
              "ldct-current",
              "Continue the established lung cancer screening program while curative-intent treatment remains appropriate.",
              "screening",
              ["nccn"],
            );
          else if (d.ldctStatus === "declined")
            action(
              "ldct-decline",
              "Revisit lung cancer screening preferences at a future encounter.",
              "screening",
              ["nccn"],
            );
          else
            action(
              "ldct-status",
              "Reconcile lung cancer screening status and arrange annual LDCT if due after shared decision-making.",
              "screening",
              ["nccn"],
            );
        } else if (
          !known(d.age) ||
          d.smokingStatus === "unknown" ||
          (["former", "current"].includes(d.smokingStatus) &&
            !known(d.packYears))
        )
          action(
            "ldct-history",
            "Clarify age and cigarette exposure to assess lung cancer screening eligibility.",
            "screening",
            ["nccn"],
          );
        const unknownVaccines = [];
        ["pneumococcal", "rsv", "zoster", "tdap", "flu", "covid"].forEach(
          (v) => {
            const status = d[v + "Status"],
              names = {
                pneumococcal: "pneumococcal",
                rsv: "RSV",
                zoster: "Shingrix",
                tdap: "Tdap/Td",
                flu: "influenza",
                covid: "COVID-19",
              };
            if (status === "unknown") {
              unknownVaccines.push(names[v]);
              return;
            }
            if (status === "contraindicated") {
              action(
                "vaccine-" + v,
                "Review the documented " +
                  names[v] +
                  " vaccine precaution/contraindication and individualize the plan.",
                "prevention",
                ["cdc"],
              );
              return;
            }
            if (status !== "due") return;
            if (
              v === "pneumococcal" &&
              known(d.age) &&
              (d.age >= 50 || (d.age >= 19 && diagnosis.supported))
            ) {
              group(
                "pneumococcalPlan",
                "Pneumococcal vaccination plan",
                [
                  option(
                    "pcv20",
                    "PCV20",
                    "Recommend PCV20 after confirming the prior pneumococcal history and applicable CDC interval. No PPSV23 is needed after this product.",
                  ),
                  option(
                    "pcv21",
                    "PCV21",
                    "Recommend PCV21 after confirming the prior pneumococcal history and applicable CDC interval. No PPSV23 is needed after this product.",
                  ),
                  option(
                    "pcv15",
                    "PCV15 followed by PPSV23",
                    "Recommend PCV15 followed ordinarily one year later by PPSV23, after confirming prior doses and whether a special-risk interval applies.",
                  ),
                  option(
                    "records",
                    "Reconcile records before choosing",
                    "Reconcile prior pneumococcal doses before choosing the indicated product and interval.",
                  ),
                ],
                "Pneumococcal vaccine product and interval: ***.",
              );
              return;
            }
            let text;
            if (v === "pneumococcal")
              text =
                known(d.age) &&
                (d.age >= 50 || (d.age >= 19 && diagnosis.supported))
                  ? "Recommend pneumococcal vaccination after reconciling prior doses: PCV20 or PCV21 alone, or PCV15 followed ordinarily one year later by PPSV23. Adapt to prior doses and special risks."
                  : "Review pneumococcal eligibility and prior doses against the current CDC schedule before selecting a vaccine.";
            if (v === "rsv")
              text =
                known(d.age) &&
                (d.age >= 75 || (d.age >= 50 && diagnosis.supported))
                  ? "Recommend one RSV vaccine dose if not previously received. It is not an annual vaccine; no routine repeat dose is currently recommended."
                  : "Review current age/risk-based RSV eligibility and prior vaccination before recommending a dose.";
            if (v === "zoster")
              text =
                d.age >= 50
                  ? "Recommend Shingrix, two doses usually 2-6 months apart, after confirming prior doses and contraindications."
                  : "Assess whether qualifying immunocompromise supports Shingrix before age 50; do not infer this from COPD alone.";
            if (v === "tdap")
              text =
                "Reconcile Tdap and the primary tetanus series. Give Tdap if indicated, then Td or Tdap every 10 years, with catch-up, pregnancy and wound-care exceptions.";
            if (v === "flu")
              text =
                "Recommend the current-season influenza vaccine. Prefer an age-appropriate high-dose, adjuvanted or recombinant product at age 65 or older when available.";
            if (v === "covid")
              text =
                "Recommend the current COVID-19 vaccine schedule after reviewing age, immune status, prior doses and current CDC guidance.";
            action("vaccine-" + v, text, "prevention", ["cdc"]);
          },
        );
        if (unknownVaccines.length)
          action(
            "vaccine-records",
            "Reconcile vaccination records for " +
              unknownVaccines.join(", ") +
              " and update indicated vaccines using the current adult schedule.",
            "prevention",
            ["cdc"],
          );
        if (d.bronchiectasis === true)
          action(
            "bronchiectasis",
            "Review bronchiectasis and recurrent-infection management, airway clearance and sputum microbiology where indicated.",
            "comorbidity",
          );
        [
          [
            "weightLoss",
            "Evaluate weight loss and nutritional needs; consider dietitian referral.",
          ],
          [
            "moodConcern",
            "Assess mood symptoms and arrange appropriate support or treatment.",
          ],
          [
            "cardiovascularConcern",
            "Evaluate relevant cardiovascular contributors to breathlessness and coordinate risk management.",
          ],
          [
            "osteoporosisConcern",
            "Review fracture risk, steroid exposure and indicated bone-health assessment.",
          ],
        ].forEach(([key, text]) => {
          if (d[key]) action(key, text, "comorbidity");
        });
        if (d.supportiveNeeds === true)
          action(
            "supportive",
            "Offer symptom-focused supportive/palliative care and discuss patient goals alongside disease-directed treatment.",
            "supportive",
          );
      }
      function oxygenPlan() {
        r.references.push("oxygen");
        const ra = d.oxygenConditions === "roomair",
          abg = d.abgAvailable === true && d.abgRoomAir === true;
        const severe =
          (ra && known(d.restingSpo2) && d.restingSpo2 <= 88) ||
          (abg && known(d.pao2) && d.pao2 <= 55);
        const borderline =
          d.hypoxemiaComplication === true &&
          ((ra && d.restingSpo2 === 89) ||
            (abg && known(d.pao2) && d.pao2 >= 56 && d.pao2 <= 59));
        if (severe || borderline)
          action(
            "ltot",
            "Arrange formal long-term oxygen assessment for documented stable resting hypoxemia. Confirm chronicity, qualifying conditions and the individualized flow/duration prescription; do not infer a prescription from a single measurement.",
            "oxygen",
            ["oxygen"],
          );
        else if (known(d.restingSpo2) && d.restingSpo2 <= 92)
          action(
            "o2-review",
            "Review resting oxygenation with known oxygen conditions and obtain confirmatory assessment/ABG when appropriate. Moderate desaturation alone does not establish an LTOT indication.",
            "oxygen",
            ["oxygen"],
          );
        if (known(d.exertionalSpo2) && d.exertionalSpo2 <= 88)
          action(
            "ambulatory-o2",
            d.exertionalRoomAir === true
              ? "Arrange a separate exertional oxygen assessment and shared review of ambulatory oxygen benefit, burden and an individualized prescription."
              : "Clarify oxygen conditions during the exercise measurement before assessing ambulatory oxygen requirements.",
            "oxygen",
            ["oxygen"],
          );
        if (d.currentOxygen === true)
          action(
            "oxygen-safety",
            "Review the actual oxygen prescription, equipment and fire safety, especially tobacco exposure. Reassess ongoing needs after an exacerbation.",
            "oxygen",
            ["oxygen"],
          );
        if (d.abgAvailable === true && known(d.paco2) && d.paco2 > 45)
          action(
            "niv",
            ["stable", "recovery"].includes(d.hypercapniaContext)
              ? "Review persistent stable arterial hypercapnia for nocturnal NIV assessment. Assess sleep apnea and optimize overlap management before selecting the ventilation plan."
              : "Reassess arterial hypercapnia 2-4 weeks after resolution of acute respiratory failure before deciding on chronic home NIV; assess OSA.",
            "ventilation",
            ["niv"],
          );
        if (d.currentNiv === true)
          action(
            "niv-current",
            "Review home NIV adherence, settings, interface, gas exchange and sleep-disordered breathing with the treating ventilation team.",
            "ventilation",
            ["niv"],
          );
      }
      function advancedPlan() {
        if (!adv.trigger || d.advancedInterest === "defer") return;
        r.references.push("advanced");
        if (adv.lvr) {
          group(
            "lvr",
            "Lung volume reduction plan",
            [
              option(
                "refer",
                "Refer to emphysema multidisciplinary team",
                "Refer for multidisciplinary emphysema/volume-reduction assessment after optimization and rehabilitation. Request separate bronchoscopic-valve and surgical opinions as appropriate; this is not a declaration of procedural eligibility.",
              ),
              option(
                "valve",
                "Request bronchoscopic-valve assessment",
                "Refer for bronchoscopic lung-volume-reduction assessment. Review CT target, fissure integrity/collateral ventilation, hyperinflation, exercise, gas exchange and device-specific contraindications after optimization and rehabilitation.",
                [
                  d.collateralVentilation === "present" &&
                    "Known collateral ventilation limits valve suitability; select multidisciplinary or surgical review instead.",
                ],
              ),
              option(
                "surgery",
                "Request surgical volume-reduction assessment",
                "Refer for a separate LVRS surgical assessment of emphysema distribution, exercise capacity, gas exchange, operative risk and rehabilitation. A referral is not confirmation of operative eligibility.",
              ),
              option(
                "workup",
                "Complete emphysema workup first",
                "Obtain or review CT emphysema distribution, full lung volumes, DLCO, exercise performance, gas exchange and rehabilitation status before selecting a volume-reduction pathway.",
              ),
              option(
                "defer",
                "Defer procedural workup",
                "Defer volume-reduction workup according to current goals and revisit if appropriate.",
              ),
            ],
            "Volume-reduction referral/workup decision: ***.",
          );
          if (d.collateralVentilation === "present")
            r.cautions.push(
              "Collateral ventilation limits valve suitability but does not by itself exclude surgical volume reduction.",
            );
          if (adv.surgicalRisk)
            r.cautions.push(
              "The NETT high-risk surgical profile is present. This requires expert surgical review and is not a universal valve exclusion.",
            );
          if (d.aatdStatus === "known-aatd")
            r.cautions.push(
              "Known AAT deficiency requires specialist review; LVRS is not routinely recommended for AAT-related COPD.",
            );
          if (d.proceduralContra === true)
            r.cautions.push(
              "A procedural comorbidity/contraindication concern was documented. Referral may still clarify options; eligibility requires center review.",
            );
          if (d.smokingStatus === "current" || d.smokingStatus === "unknown")
            r.cautions.push(
              "Clarify tobacco/nicotine exposure and cessation requirements before procedural readiness is established.",
            );
        }
        if (adv.transplant)
          group(
            "transplant",
            "Transplant assessment plan",
            [
              option(
                "refer",
                "Refer for transplant assessment",
                "Refer for lung-transplant assessment based on advanced COPD/progression and the available prognostic findings. Center review will address trajectory, goals, age/frailty, tobacco exposure and comorbidities. Referral does not establish listing eligibility; evaluation may proceed alongside volume-reduction review.",
              ),
              option(
                "discuss",
                "Discuss and complete referral workup",
                "Review transplant goals and complete missing prognostic/workup information before a center referral. Do not infer listing eligibility from BODE or FEV1 alone.",
              ),
              option(
                "defer",
                "Defer transplant evaluation",
                "Defer transplant evaluation according to current preferences and reassess goals as disease evolves.",
              ),
            ],
            "Transplant referral discussion/decision: ***.",
          );
        if (!adv.lvr && !adv.transplant)
          action(
            "advanced-review",
            "Review lung volume reduction and transplant referral options if substantial limitation persists. Review available CT, lung volumes, DLCO, exercise and gas-exchange data. Incomplete screening does not establish procedural or transplant eligibility.",
            "advanced",
            ["lvr", "transplant"],
          );
      }
      function cessationPlan() {
        if (d.smokingStatus === "unknown") {
          action(
            "smoking-history",
            "Document current tobacco/nicotine exposure and offer cessation treatment when applicable.",
            "cessation",
            ["tobacco"],
          );
          return;
        }
        if (d.smokingStatus !== "current") return;
        const safety =
          d.cessationSafety !== true
            ? [
                "Confirm selected medication safety, interactions and relevant comorbidities.",
              ]
            : [];
        const renal = ["normal", "impaired", "severe", "dialysis"].includes(
          d.renalStatus,
        );
        const varDose =
          d.renalStatus === "severe"
            ? "0.5 mg orally daily, titrating if tolerated to at most 0.5 mg twice daily"
            : d.renalStatus === "dialysis"
              ? "at most 0.5 mg orally daily if tolerated"
              : "0.5 mg orally daily on days 1-3, 0.5 mg twice daily on days 4-7, then 1 mg twice daily";
        group(
          "cessation",
          "Tobacco cessation plan",
          [
            option(
              "varenicline",
              "Varenicline + behavioral support",
              "Start varenicline " +
                varDose +
                " for an initial 12-week course. Set a quit date or gradual-quit plan and arrange behavioral support. Review nausea, sleep effects and mood changes.",
              [...safety, !renal && "Clarify renal function."],
            ),
            option(
              "nrt",
              "Nicotine patch + gum/lozenge",
              "Start nicotine patch " +
                (d.cigarettesPerDay > 10 ? "21" : "14") +
                " mg daily plus " +
                (d.firstCigarette === "within30" ? "4" : "2") +
                " mg nicotine gum or lozenge every 1-2 hours as needed for cravings (maximum 24 gum pieces or 20 lozenges per day). Review product technique and a step-down course, generally over 8-12 weeks, with behavioral support.",
              [
                ...safety,
                (!known(d.cigarettesPerDay) || d.cigarettesPerDay <= 0) &&
                  "Document current positive daily cigarette consumption or individualize intermittent-use dosing.",
                d.firstCigarette === "unknown" &&
                  "Document time to first cigarette.",
              ],
            ),
            option(
              "bupropion",
              "Bupropion SR + behavioral support",
              "Start bupropion SR 150 mg orally daily for 3 days, then 150 mg twice daily at least 8 hours apart (maximum 300 mg/day), beginning 1-2 weeks before the quit date. Plan 7-12 weeks and behavioral support.",
              [
                ...safety,
                d.bupropionContra !== false &&
                  "Exclude bupropion contraindications.",
                d.renalStatus !== "normal" &&
                  "Individualize dosing for renal/hepatic impairment.",
              ],
            ),
            option(
              "behavioral",
              "Behavioral support / defer medication",
              "Offer structured tobacco-dependence counseling and quitline support (1-800-QUIT-NOW). Establish a quit or reduction goal and revisit pharmacotherapy.",
            ),
          ],
          "Tobacco cessation treatment: ***.",
        );
        action(
          "cessation-followup",
          "Arrange tobacco-treatment follow-up within about 2-4 weeks to assess progress, adherence and adverse effects.",
          "cessation",
          ["tobacco"],
        );
      }
    }
    return {
      DEFAULT_NO_RISK_ISSUE: false,
      createEmptyState,
      normalizeState,
      quality,
      normalizeFev1FvcHeuristic,
      describeFev1FvcEntry,
      classifySymptoms,
      classifyExacerbationRisk,
      assignGoldGroup,
      isRoflumilastCandidate,
      isLungCancerScreenEligible,
      getLungCancerScreeningFootnote,
      calculateBode,
      assessAcute,
      buildRecommendation,
      regimenLabels: labels,
    };
  },
);
