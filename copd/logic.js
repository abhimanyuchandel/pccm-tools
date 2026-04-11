(function (root, factory) {
  const logic = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = logic;
  }

  if (root) {
    root.copdLogic = logic;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const DEFAULT_NO_RISK_ISSUE = "No additional high-risk data issues were detected from the entered fields.";

  function getCatImpact(score) {
    if (score === null) {
      return null;
    }
    if (score <= 9) {
      return "low impact";
    }
    if (score <= 20) {
      return "medium impact";
    }
    if (score <= 30) {
      return "high impact";
    }
    return "very high impact";
  }

  function normalizeFev1FvcHeuristic(value) {
    if (!Number.isFinite(value)) {
      return null;
    }
    if (value > 1 && value <= 100) {
      return value / 100;
    }
    if (value >= 0 && value <= 1.2) {
      return value;
    }
    return null;
  }

  function describeFev1FvcEntry(value) {
    if (!Number.isFinite(value)) {
      return { ratio: null, entryMode: null };
    }
    if (value > 1 && value <= 100) {
      return { ratio: value / 100, entryMode: "percent" };
    }
    if (value >= 0 && value <= 1.2) {
      return { ratio: value, entryMode: "ratio" };
    }
    return { ratio: null, entryMode: "invalid" };
  }

  function classifySymptoms(data) {
    const hasCat = data.catScore !== null;
    const hasMmrc = data.mmrcScore !== null;
    const highByCat = hasCat && data.catScore >= 10;
    const highByMmrc = hasMmrc && data.mmrcScore >= 2;

    if (!hasCat && !hasMmrc) {
      return {
        high: null,
        summary: "Symptom burden cannot be fully classified because CAT/CAAT and mMRC are both missing.",
        noteLine: "Symptom scoring is incomplete because both CAT/CAAT and mMRC are missing."
      };
    }

    const catText = hasCat
      ? `CAT ${data.catScore}/40 (${getCatImpact(data.catScore)}; higher CAT scores correlate with worse symptom burden).`
      : "CAT/CAAT not entered.";
    const mmrcText = hasMmrc
      ? `mMRC ${data.mmrcScore}/4.`
      : "mMRC not entered.";
    const high = highByCat || highByMmrc;

    return {
      high,
      summary: `${catText} ${mmrcText} ${high ? "Overall symptom burden is higher." : "Overall symptom burden is lower based on available scores."}`,
      noteLine: `${catText} ${mmrcText}`
    };
  }

  function classifyExacerbationRisk(data) {
    const hasModerate = data.moderateExac !== null;
    const hasSevere = data.severeExac !== null;

    if (!hasModerate && !hasSevere) {
      return {
        high: null,
        missing: "both",
        summary: "Exacerbation history cannot be classified because moderate and severe exacerbation counts were not entered.",
        noteLine: "Exacerbation history is missing (moderate and severe counts not entered).",
        total: null
      };
    }

    const moderateExac = hasModerate ? data.moderateExac : 0;
    const severeExac = hasSevere ? data.severeExac : 0;
    const total = moderateExac + severeExac;
    const high = total >= 1;
    const partialMissing = !hasModerate || !hasSevere;
    const missingLabel = !hasModerate ? "moderate" : "severe";
    const noteModerate = hasModerate ? moderateExac : "not entered";
    const noteSevere = hasSevere ? severeExac : "not entered";
    let summary = high
      ? "Exacerbation-priority profile: at least one moderate or severe exacerbation in the previous year."
      : "No recorded moderate or severe exacerbation in the previous year.";

    if (partialMissing) {
      summary += ` ${missingLabel[0].toUpperCase() + missingLabel.slice(1)} exacerbation count was not entered and was provisionally treated as 0.`;
    }

    return {
      high,
      missing: partialMissing ? missingLabel : null,
      summary,
      noteLine: `${noteModerate} moderate and ${noteSevere} severe exacerbations in the previous 12 months.`,
      total
    };
  }

  function assignGoldGroup(symptoms, exacRisk) {
    if (exacRisk.high === null) {
      return "A/B/E (exacerbation history required to classify)";
    }
    if (exacRisk.high) {
      return "E";
    }
    if (symptoms.high === null) {
      return "A/B (symptom score required to distinguish)";
    }
    return symptoms.high ? "B" : "A";
  }

  function isRoflumilastCandidate(data) {
    if (data.fev1Predicted === null || data.fev1Predicted >= 50 || !data.chronicBronchitis) {
      return false;
    }

    const exacRisk = classifyExacerbationRisk(data);
    return exacRisk.total !== null && exacRisk.total >= 1;
  }

  function isLungCancerScreenEligible(data) {
    return (
      data.age !== null &&
      data.age >= 50 &&
      data.age <= 80 &&
      (data.smokingStatus === "current" || data.smokingStatus === "former") &&
      data.packYears !== null &&
      data.packYears >= 20
    );
  }

  function getLungCancerScreeningCaveat(data) {
    if (
      isLungCancerScreenEligible(data) &&
      data.smokingStatus === "former" &&
      data.yearsSinceQuit !== null &&
      data.yearsSinceQuit > 15
    ) {
      return "Eligible under American Cancer Society criteria; USPSTF-based coverage workflows may differ if smoking cessation was more than 15 years ago, so confirm payer criteria.";
    }

    return null;
  }

  return {
    DEFAULT_NO_RISK_ISSUE,
    describeFev1FvcEntry,
    normalizeFev1FvcHeuristic,
    classifySymptoms,
    classifyExacerbationRisk,
    assignGoldGroup,
    isRoflumilastCandidate,
    isLungCancerScreenEligible,
    getLungCancerScreeningCaveat
  };
});
