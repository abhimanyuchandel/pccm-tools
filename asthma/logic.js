(function (root, factory) {
  const logic = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = logic;
  }

  if (root) {
    root.asthmaLogic = logic;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const DEFAULT_NO_WARNING = "No major data-quality or safety warning was detected.";

  function formatSignedNumber(value, decimals) {
    if (!Number.isFinite(value)) {
      return "n/a";
    }

    return `${value > 0 ? "+" : ""}${value.toFixed(decimals)}`;
  }

  function getBronchodilatorAssessment(data) {
    const fev1Available = data.fev1Pre !== null && data.fev1Post !== null && data.fev1Pre > 0;
    const fvcAvailable = data.fvcPre !== null && data.fvcPost !== null && data.fvcPre > 0;

    const fev1DeltaL = fev1Available ? data.fev1Post - data.fev1Pre : null;
    const fev1DeltaMl = fev1Available ? fev1DeltaL * 1000 : null;
    const fev1Percent = fev1Available ? (fev1DeltaL / data.fev1Pre) * 100 : null;
    const fev1PredictedDeltaPercent = fev1Available && data.fev1Predicted !== null && data.fev1Predicted > 0
      ? (fev1DeltaL / (data.fev1Pre / (data.fev1Predicted / 100))) * 100
      : null;

    const fvcDeltaL = fvcAvailable ? data.fvcPost - data.fvcPre : null;
    const fvcDeltaMl = fvcAvailable ? fvcDeltaL * 1000 : null;
    const fvcPercent = fvcAvailable ? (fvcDeltaL / data.fvcPre) * 100 : null;
    const fvcPredictedDeltaPercent = fvcAvailable && data.fvcPredicted !== null && data.fvcPredicted > 0
      ? (fvcDeltaL / (data.fvcPre / (data.fvcPredicted / 100))) * 100
      : null;

    const fev1Positive = fev1Available && fev1Percent >= 12 && fev1DeltaMl >= 200;
    const fvcPositive = fvcAvailable && fvcPercent >= 12 && fvcDeltaMl >= 200;
    const fev1AtsErsPositive = fev1Available && fev1PredictedDeltaPercent !== null && fev1PredictedDeltaPercent > 10;
    const fvcAtsErsPositive = fvcAvailable && fvcPredictedDeltaPercent !== null && fvcPredictedDeltaPercent > 10;
    const fev1HighConfidence = fev1Available && fev1Percent >= 15 && fev1DeltaMl >= 400;
    const fvcHighConfidence = fvcAvailable && fvcPercent >= 15 && fvcDeltaMl >= 400;

    const positive = fev1Positive || fvcPositive || fev1AtsErsPositive || fvcAtsErsPositive;
    const highConfidence = fev1HighConfidence || fvcHighConfidence;

    let summary = "Bronchodilator responsiveness cannot be assessed because paired pre/post spirometry values are incomplete.";
    if (fev1Available || fvcAvailable) {
      const parts = [];
      if (fev1Available) {
        parts.push(`FEV1 change ${formatSignedNumber(fev1DeltaMl, 0)} mL (${formatSignedNumber(fev1Percent, 1)}%)`);
        if (fev1PredictedDeltaPercent !== null) {
          parts.push(`FEV1 change ${formatSignedNumber(fev1PredictedDeltaPercent, 1)}% of predicted`);
        }
      }
      if (fvcAvailable) {
        parts.push(`FVC change ${formatSignedNumber(fvcDeltaMl, 0)} mL (${formatSignedNumber(fvcPercent, 1)}%)`);
        if (fvcPredictedDeltaPercent !== null) {
          parts.push(`FVC change ${formatSignedNumber(fvcPredictedDeltaPercent, 1)}% of predicted`);
        }
      }
      summary = parts.join("; ");
      if (positive) {
        if (highConfidence) {
          summary += ". This meets bronchodilator responsiveness criteria with higher-confidence change.";
        } else if (fev1AtsErsPositive || fvcAtsErsPositive) {
          summary += ". This meets bronchodilator responsiveness criteria, including the ATS/ERS >10% of predicted definition.";
        } else {
          summary += ". This meets bronchodilator responsiveness criteria.";
        }
      } else {
        summary += ". This does not meet bronchodilator responsiveness criteria from the entered data.";
      }
    }

    return {
      available: fev1Available || fvcAvailable,
      positive,
      highConfidence,
      fev1DeltaMl,
      fev1Percent,
      fev1PredictedDeltaPercent,
      fvcDeltaMl,
      fvcPercent,
      fvcPredictedDeltaPercent,
      fev1AtsErsPositive,
      fvcAtsErsPositive,
      summary
    };
  }

  function classifyControl(data) {
    const count = [
      data.daytimeGt2,
      data.nightWaking4w,
      data.relieverGt2,
      data.activityLimitation
    ].filter(Boolean).length;

    let classification = "well controlled";
    if (count >= 3) {
      classification = "uncontrolled";
    } else if (count >= 1) {
      classification = "partly controlled";
    }

    let summary = `GINA symptom control is ${classification} based on ${count}/4 positive control items.`;
    if (classification === "well controlled") {
      summary += " No recent control item was triggered.";
    } else if (classification === "partly controlled") {
      summary += " One or two control items are positive.";
    } else {
      summary += " Three or four control items are positive.";
    }

    return {
      count,
      classification,
      summary,
      noteLine: `${count}/4 GINA symptom-control items positive.`
    };
  }

  function classifyExacerbationRisk(data) {
    if (data.moderateExac === null || data.severeExac === null) {
      return {
        anyExacerbation: null,
        frequentExacerbation: null,
        summary: "Exacerbation history was not fully entered, so future-risk cannot be classified confidently.",
        noteLine: "Exacerbation counts not documented completely in tool inputs."
      };
    }

    const anyExacerbation = data.moderateExac + data.severeExac >= 1;
    const frequentExacerbation = data.moderateExac >= 2 || data.severeExac >= 1;
    const summary = frequentExacerbation
      ? "Frequent exacerbation-risk profile: at least 2 oral steroid-treated exacerbations or at least 1 hospitalization in the last year."
      : anyExacerbation
        ? "At least one exacerbation occurred in the last year, which raises future-risk concern."
        : "No exacerbation was recorded in the last year.";

    return {
      anyExacerbation,
      frequentExacerbation,
      summary,
      noteLine: `${data.moderateExac} oral steroid-treated and ${data.severeExac} hospitalization-level exacerbations in the last 12 months.`
    };
  }

  function isHighDoseEquivalentRegimen(data) {
    return ["high-dose-ics-laba", "triple-therapy", "biologic-other"].includes(data.currentRegimen) ||
      data.maintenanceOcs;
  }

  function classifySevereAsthmaState(data, control, exacRisk) {
    const mediumOrHigherRegimen = [
      "mart-medium",
      "ics-laba-saba",
      "high-dose-ics-laba",
      "triple-therapy",
      "biologic-other"
    ].includes(data.currentRegimen) || data.maintenanceOcs;
    const ongoingBurden = control.classification !== "well controlled" ||
      exacRisk.frequentExacerbation === true ||
      data.persistentExacerbations;
    const type2High = (data.eosinophils !== null && data.eosinophils >= 150) ||
      (data.feno !== null && data.feno >= 20) ||
      data.allergenDriven;

    if (!mediumOrHigherRegimen || !ongoingBurden) {
      return {
        state: "not-triggered",
        type2High,
        summary: "Severe-asthma pathway not triggered by the current regimen and burden profile."
      };
    }

    if (data.poorTechnique || data.poorAdherence) {
      return {
        state: "difficult-to-treat-possible",
        type2High,
        summary: "Difficult-to-treat asthma is more likely than true severe asthma because inhaler technique or adherence problems are still present."
      };
    }

    if (!isHighDoseEquivalentRegimen(data)) {
      return {
        state: "difficult-to-treat-possible",
        type2High,
        summary: "Severe asthma evaluation is indicated, but the formal severe-asthma definition is not yet met because treatment has not clearly reached optimized high-dose ICS-LABA or equivalent intensity."
      };
    }

    return {
      state: "severe-definition-met",
      type2High,
      summary: type2High
        ? "Severe asthma criteria are likely met and Type 2-high markers are present."
        : "Severe asthma criteria are likely met, but elevated Type 2 markers are not clearly documented from the entered data."
    };
  }

  function pickInitialTrack1Step(data) {
    const lowLungFunction = data.fev1Predicted !== null && data.fev1Predicted < 80;

    if (data.acuteExacerbationToday) {
      return {
        trackStep: "GINA Track 1 Step 4",
        regimen: "mart-medium",
        reason: "An acute exacerbation today supports starting medium-dose MART after urgent stabilization and close follow-up.",
        needsMoreData: false
      };
    }

    if (data.symptomDaysCategory === "not-entered" && data.nightWakingCategory === "not-entered") {
      return {
        trackStep: "Initial step selection incomplete",
        regimen: null,
        reason: "Enter daytime symptom frequency and night-waking frequency to map the initial regimen more precisely to GINA Table 3.",
        needsMoreData: true
      };
    }

    if (data.symptomDaysCategory === "daily" && (lowLungFunction || data.smokingStatus === "current")) {
      return {
        trackStep: "GINA Track 1 Step 4",
        regimen: "mart-medium",
        reason: "Daily symptoms plus low lung function or current smoking favor a medium-dose MART starting point.",
        needsMoreData: false
      };
    }

    if (
      data.symptomDaysCategory === "daily" ||
      data.symptomDaysCategory === "most-days" ||
      data.nightWakingCategory === "weekly-or-more" ||
      lowLungFunction
    ) {
      return {
        trackStep: "GINA Track 1 Step 3",
        regimen: "mart-low",
        reason: "Most-days symptoms, weekly night waking, or low lung function favor low-dose MART as the starting point.",
        needsMoreData: false
      };
    }

    return {
      trackStep: "GINA Track 1 Step 1-2",
      regimen: "air-only",
      reason: "Infrequent or 3-5 day/week symptoms without low lung function fit as-needed low-dose ICS-formoterol.",
      needsMoreData: false
    };
  }

  function getDupilumabEvidenceFlag(eosinophils) {
    return eosinophils !== null && eosinophils >= 1500;
  }

  function getOmalizumabFeasibility(data) {
    const plausibleIge = data.totalIge !== null && data.totalIge > 0;
    const hasWeight = data.weightKg !== null && data.weightKg > 0;
    const sensitizationConfirmed = !!data.sensitizationConfirmed;
    const allergenDriven = !!data.allergenDriven;

    return {
      allergenDriven,
      sensitizationConfirmed,
      plausibleIge,
      hasWeight,
      eligibleForConsideration: allergenDriven && sensitizationConfirmed && plausibleIge,
      fullyAssessable: allergenDriven && sensitizationConfirmed && plausibleIge && hasWeight
    };
  }

  function getMepolizumabDetail(options = {}) {
    if (options.egpa) {
      return "Mepolizumab may still be appropriate, but EGPA dosing differs from severe-asthma dosing. Confirm indication-specific labeling and local policy before prescribing; EGPA dosing is often 300 mg subcutaneously every 4 weeks.";
    }

    return "Mepolizumab option for severe eosinophilic asthma: 100 mg subcutaneously every 4 weeks in adults. Common adverse effects include headache and injection-site reactions.";
  }

  function getBenralizumabDetail(options = {}) {
    if (options.egpa) {
      return "Benralizumab may still be appropriate, but EGPA dosing differs from severe-asthma dosing. Confirm indication-specific labeling and local policy before prescribing; EGPA dosing is often 30 mg subcutaneously every 4 weeks.";
    }

    return "Benralizumab option for severe eosinophilic asthma: 30 mg subcutaneously every 4 weeks for the first 3 doses, then every 8 weeks. Common adverse effects include injection-site reactions; anaphylaxis is rare.";
  }

  return {
    DEFAULT_NO_WARNING,
    getBronchodilatorAssessment,
    classifyControl,
    classifyExacerbationRisk,
    isHighDoseEquivalentRegimen,
    classifySevereAsthmaState,
    pickInitialTrack1Step,
    getDupilumabEvidenceFlag,
    getOmalizumabFeasibility,
    getMepolizumabDetail,
    getBenralizumabDetail
  };
});
