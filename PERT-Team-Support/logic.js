(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.pertLogic = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const PHI_SCRUB_PATTERNS = [
    { label: "MRN/long numeric identifier", regex: /\b\d{6,}\b/g },
    { label: "MRN label/value", regex: /\b(?:mrn|medical record number|patient id)\s*[:#=-]?\s*[A-Z0-9-]{4,}\b/gi },
    { label: "DOB/date", regex: /\b(?:\d{1,2}[\/-]\d{1,2}[\/-](?:\d{2}|\d{4})|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2}(?:,\s*\d{2,4})?)\b/gi },
    { label: "phone number", regex: /\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/g },
    { label: "email", regex: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi },
    { label: "SSN", regex: /\b\d{3}-\d{2}-\d{4}\b/g },
    { label: "street address", regex: /\b\d{1,5}\s+[A-Za-z0-9'.-]+(?:\s+[A-Za-z0-9'.-]+){0,4}\s(?:street|st|avenue|ave|road|rd|lane|ln|drive|dr|boulevard|blvd|court|ct|way|parkway|pkwy)\b/gi },
    { label: "name cue", regex: /\b(?:name is|patient name is|mr\.?|mrs\.?|ms\.?|miss|dr\.?)\s+[A-Za-z]+(?:\s+[A-Za-z]+)?\b/gi },
    { label: "name field", regex: /\b(?:name|patient name|pt name)\s*[:=-]\s*[A-Za-z]+(?:\s+[A-Za-z]+){0,2}\b/gi }
  ];

  const CLOT_LOCATION_LABELS = {
    unknown: "Unknown / not yet defined",
    subsegmental_only: "Subsegmental only",
    segmental_only: "Segmental only",
    lobar_or_more_proximal: "Lobar or more proximal",
    main_or_saddle: "Main PA or saddle"
  };

  function normalizeWhitespace(text) {
    return (text || "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim();
  }

  function scrubPotentialIdentifiers(text) {
    let cleaned = text || "";
    const findings = [];
    PHI_SCRUB_PATTERNS.forEach((pattern) => {
      cleaned = cleaned.replace(pattern.regex, () => {
        findings.push(pattern.label);
        return "****";
      });
    });
    cleaned = normalizeWhitespace(cleaned);
    return {
      cleaned,
      findings: Array.from(new Set(findings))
    };
  }

  function clotLocationLabel(value) {
    return CLOT_LOCATION_LABELS[value] || value || "Unknown";
  }

  function isSubsegmentalOnly(value) {
    return value === "subsegmental_only";
  }

  function isSegmentalOnly(value) {
    return value === "segmental_only";
  }

  function hasLobarOrMoreProximalClot(value) {
    return value === "lobar_or_more_proximal" || value === "main_or_saddle";
  }

  function hasCatheterAccessibleClotBurden(value) {
    return hasLobarOrMoreProximalClot(value);
  }

  function deriveScoreSbp(data) {
    if (data.scoreMode === "calc-spesi" && data.calcSpesiSbp !== null) return data.calcSpesiSbp;
    if (data.scoreMode === "calc-pesi" && data.calcPesiSbp !== null) return data.calcPesiSbp;
    if (data.scoreMode === "calc-bova" && data.calcBovaSbp !== null) return data.calcBovaSbp;
    return null;
  }

  function classify(data) {
    const hasScore = data.pesi !== null || data.spesi !== null || data.hestia !== null;
    const lowByPesi = data.pesi !== null && data.pesi <= 85;
    const lowBySpesi = data.spesi !== null && data.spesi === 0;
    const lowByHestia = data.hestia !== null && data.hestia === 0;
    const lowSeverity = lowByPesi || lowBySpesi || lowByHestia;

    const elevatedByPesi = data.pesi !== null && data.pesi > 85;
    const elevatedBySpesi = data.spesi !== null && data.spesi >= 1;
    const elevatedByHestia = data.hestia !== null && data.hestia >= 1;
    const elevatedSeverity = elevatedByPesi || elevatedBySpesi || elevatedByHestia;

    const rvPositive = data.rvDysfunction === "yes";
    const troponinPositive = data.troponin === "yes";
    const bnpPositive = data.bnp === "yes";
    const biomarkerPositive = troponinPositive || bnpPositive;

    const hypoperfusionMarkers =
      data.aki ||
      data.oliguria ||
      data.mentalStatus ||
      data.lowCardiacIndex ||
      data.shockScore ||
      (data.lactate !== null && data.lactate > 2) ||
      (data.map !== null && data.map < 60);

    const respiratoryFailure = ["niv", "imv"].includes(data.oxygenSupport);
    const needsAnySupplementalO2 = data.oxygenSupport !== "room-air";
    const dRespiratoryModifier = ["o2-high", "hfnc"].includes(data.oxygenSupport);
    const eRespiratoryModifier = ["niv", "imv"].includes(data.oxygenSupport);
    const lowOxygenSaturation = data.oxygenSat !== null && data.oxygenSat < 90;

    const normotensiveShock = hypoperfusionMarkers && !data.persistentHypotension && !data.cardiacArrest;

    let base = "BC-pending";
    if ((data.symptomatic === "no" && data.incidental) || (data.symptomatic === "no" && data.confirmedPe === "confirmed")) {
      base = isSubsegmentalOnly(data.clotLocation) ? "A1" : "A2";
    } else if (data.cardiacArrest || data.persistentHypotension || data.vasopressors === "2plus") {
      base = (data.cardiacArrest || data.vasopressors === "2plus" || respiratoryFailure) ? "E2" : "E1";
    } else if (normotensiveShock || (data.transientHypotension && hypoperfusionMarkers)) {
      base = "D2";
    } else if (data.transientHypotension) {
      base = "D1";
    } else if (elevatedSeverity) {
      if (rvPositive && biomarkerPositive) {
        base = "C3";
      } else if (rvPositive || biomarkerPositive) {
        base = "C2";
      } else {
        base = "C1";
      }
    } else if (lowSeverity) {
      base = isSubsegmentalOnly(data.clotLocation) ? "B1" : "B2";
    }

    let significantResp = false;
    if (base.charAt(0) === "C") {
      significantResp = lowOxygenSaturation || (data.rr !== null && data.rr >= 30) || needsAnySupplementalO2;
    } else if (base.charAt(0) === "D") {
      significantResp = dRespiratoryModifier;
    } else if (base.charAt(0) === "E") {
      significantResp = eRespiratoryModifier;
    }

    const category = base === "BC-pending" ? "B/C pending" : base + (significantResp ? "R" : "");
    const family = base === "BC-pending" ? "U" : base.charAt(0);
    return {
      category,
      base,
      family,
      hasScore,
      lowSeverity,
      elevatedSeverity,
      rvPositive,
      biomarkerPositive,
      hypoperfusionMarkers,
      significantResp,
      respiratoryFailure,
      pendingSeverityScore: base === "BC-pending"
    };
  }

  function hiPeithoAssessment(data, cls) {
    const scoreSbp = deriveScoreSbp(data);
    const hrCriterion = data.scoreHr !== null && data.scoreHr >= 100;
    const sbpCriterion = (scoreSbp !== null && scoreSbp <= 110) || data.transientHypotension;
    const rrCriterion = data.rr !== null && data.rr > 20;
    const hypoxemiaCriterion =
      (data.oxygenSat !== null && data.oxygenSat < 90) ||
      ["o2-high", "hfnc", "niv", "imv"].includes(data.oxygenSupport);
    const confirmedDiagnosis = data.confirmedPe === "confirmed";
    const noThrombolysisContraindication = !data.highBleedingRisk && !data.contraThrombolysis;
    const metLabels = [];
    if (hrCriterion) metLabels.push("HR >=100 bpm");
    if (sbpCriterion) metLabels.push("SBP <=110 mm Hg");
    if (rrCriterion) metLabels.push("RR >20/min");
    if (hypoxemiaCriterion) metLabels.push("resting hypoxemia/high oxygen support");

    const eligibleCategory = cls.base === "C3";
    const proximalClotBurden = hasLobarOrMoreProximalClot(data.clotLocation);
    const nonShockProfile = !data.persistentHypotension && !data.cardiacArrest && data.vasopressors === "0";

    return {
      confirmedDiagnosis,
      noThrombolysisContraindication,
      eligibleCategory,
      proximalClotBurden,
      nonShockProfile,
      featureCount: metLabels.length,
      metLabels,
      absoluteEligible:
        confirmedDiagnosis &&
        eligibleCategory &&
        proximalClotBurden &&
        nonShockProfile &&
        metLabels.length >= 2 &&
        noThrombolysisContraindication,
      relativeEligible:
        confirmedDiagnosis &&
        eligibleCategory &&
        proximalClotBurden &&
        nonShockProfile &&
        metLabels.length >= 2
    };
  }

  return {
    PHI_SCRUB_PATTERNS,
    CLOT_LOCATION_LABELS,
    normalizeWhitespace,
    scrubPotentialIdentifiers,
    clotLocationLabel,
    isSubsegmentalOnly,
    isSegmentalOnly,
    hasLobarOrMoreProximalClot,
    hasCatheterAccessibleClotBurden,
    deriveScoreSbp,
    classify,
    hiPeithoAssessment
  };
});
