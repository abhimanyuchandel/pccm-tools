(function (root, factory) {
  const smoking = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = smoking;
  if (root) root.asthmaSmoking = smoking;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const OPTIONS = {
    varenicline: {
      name: "Varenicline",
      evidence: "ATS favors varenicline over a single nicotine patch or bupropion, including in adults with stable psychiatric conditions. It improves sustained quit rates; a clear advantage over combination NRT has not been established.",
      benefits: "Effective first choice when oral treatment is acceptable. A flexible or gradual quit approach can help patients not ready for abrupt cessation.",
      cautions: "Nausea and vivid dreams are common. Review mood changes, seizure history, alcohol effects, prior hypersensitivity, and renal function. Psychiatric history alone is not a contraindication.",
      sourceIds: ["atsTobacco", "whoTobacco", "varenicline"]
    },
    combinationNrt: {
      name: "Combination nicotine replacement",
      evidence: "A nicotine patch plus short acting gum or lozenge improves sustained quit rates compared with a single NRT product. Combine treatment with behavioral support.",
      benefits: "Over-the-counter access and adjustable craving relief. May suit patients who prefer to avoid a prescription tablet.",
      cautions: "Review recent MI, unstable angina, serious arrhythmia, pregnancy, and breastfeeding. Patch dermatitis or gum intolerance may change the formulation. Avoid inhaled nicotine products that can irritate asthma.",
      sourceIds: ["whoTobacco", "nicotinePatch", "nicotineGum"]
    },
    bupropion: {
      name: "Bupropion SR",
      evidence: "Bupropion improves quit rates compared with placebo, but is generally less effective than varenicline or combination NRT.",
      benefits: "A nonnicotine alternative that may suit selected patients with depressive symptoms or concern about early weight gain. Coordinate depression treatment rather than duplicating existing bupropion.",
      cautions: "Do not use with seizure disorder, current or prior anorexia/bulimia, abrupt alcohol/sedative/antiepileptic withdrawal, another bupropion product, an MAOI within 14 days, or prior hypersensitivity. Review blood pressure, bipolar/mania risk, interactions, and renal/hepatic impairment.",
      sourceIds: ["atsTobacco", "whoTobacco", "bupropionSmoking"]
    },
    behavioral: {
      name: "Behavioral support without medication for now",
      evidence: "Offer counseling and a quitline referral to all current smokers. Medication plus behavioral support usually offers the best chance of quitting, but medication need not be imposed when declined or unsuitable.",
      benefits: "First approach during pregnancy. Also appropriate when medication is declined while readiness and barriers are revisited.",
      cautions: "Do not interpret this choice as counseling already completed or as a refusal. Document the actual discussion in the EMR.",
      sourceIds: ["whoTobacco", "uspstfTobacco"]
    }
  };

  function buildSupport(d, selectedId) {
    if (d.smoking !== "current") return { options: [], selected: null };
    const options = Object.entries(OPTIONS).map(([id, reference]) => {
      const prerequisites = [], blockers = [];
      if (id !== "behavioral") {
        if (d.age === null) prerequisites.push("Verify adult age before pharmacotherapy");
        if (!d.smokingSafetyReviewed) prerequisites.push("Complete the medication-specific contraindication, interaction, and prior-reaction review");
        if (d.pregnant !== false) prerequisites.push(d.pregnant === true ? "Use behavioral support first in pregnancy; any medication requires individualized obstetric review" : "Confirm pregnancy status before pharmacotherapy");
        if (d.smokingBreastfeeding !== false) prerequisites.push("Review breastfeeding status and the medication-specific plan");
      }
      let schedule = "";
      if (id === "varenicline") {
        if (d.smokingVareniclineReaction === true) blockers.push("A prior serious varenicline reaction is documented");
        if (d.smokingRenal === "unknown") prerequisites.push("Confirm renal function before finalizing the varenicline dose");
        if (d.smokingSeizure === true) prerequisites.push("Review seizure risk before varenicline treatment");
        schedule = d.smokingRenal === "severe" ? "With verified creatinine clearance below 30 mL/min, start 0.5 mg orally daily and titrate only as tolerated to a maximum of 0.5 mg twice daily." : d.smokingRenal === "dialysis" ? "With verified hemodialysis, use no more than 0.5 mg orally daily if tolerated." : "The standard schedule is 0.5 mg orally daily on days 1 to 3, 0.5 mg twice daily on days 4 to 7, then 1 mg twice daily from day 8. Confirm renal function before using this schedule.";
        schedule += " Start 1 week before the quit date, or choose a quit date on days 8 to 35. Treat for 12 weeks and consider another 12 weeks for successful quitters or a supported gradual quit attempt. Take after food with water.";
      } else if (id === "combinationNrt") {
        if (d.smokingCigarettesPerDay === null || d.smokingCigarettesPerDay === 0) prerequisites.push("Confirm daily cigarette use to choose the initial patch strength");
        if (d.smokingFirstCigarette === "unknown") prerequisites.push("Confirm time to the first morning cigarette to choose gum strength");
        if (d.smokingCvdConcern === true) prerequisites.push("Individualize NRT with recent MI, unstable angina, or serious arrhythmia");
        const patch = d.smokingCigarettesPerDay > 10 ? "21 mg patch daily for 6 weeks, then 14 mg daily for 2 weeks, then 7 mg daily for 2 weeks" : d.smokingCigarettesPerDay > 0 ? "14 mg patch daily for 6 weeks, then 7 mg daily for 2 weeks" : "a daily nicotine patch with strength based on cigarette consumption";
        const gum = d.smokingFirstCigarette === "within30" ? "4 mg" : d.smokingFirstCigarette === "after30" ? "2 mg" : "2 or 4 mg based on time to the first morning cigarette";
        schedule = `Use ${patch}, plus nicotine gum ${gum} for breakthrough cravings using chew-and-park technique. Do not exceed 24 pieces of gum per day; avoid food and acidic drinks for 15 minutes before and during use. Taper over about 8 to 12 weeks, adjusting to cravings and response; longer treatment may be appropriate.`;
      } else if (id === "bupropion") {
        if (d.smokingBupropionContra === true || d.smokingSeizure === true) blockers.push("A bupropion contraindication or seizure disorder is documented");
        if (d.smokingRenal !== "normal" || d.smokingHepaticConcern !== false) prerequisites.push("Verify renal/hepatic function and whether a lower dose or dosing frequency is required");
        if (d.smokingPsychiatric === true) prerequisites.push("Coordinate mood treatment and review bipolar/mania risk and interacting medicines");
        schedule = "For verified suitable renal/hepatic function, the standard cessation schedule is bupropion SR 150 mg orally daily for 3 days, then 150 mg twice daily at least 8 hours apart. Start while still smoking, with a quit date in the second week. Treat for 7 to 12 weeks; reassess if not abstinent and individualize longer treatment after successful quitting. Maximum 300 mg/day for cessation. Monitor blood pressure, sleep, mood, and adverse effects.";
      }
      return { id, ...reference, prerequisites, blockers, schedule, ready: blockers.length === 0 && prerequisites.length === 0 };
    });
    return { options, selected: options.find(option => option.id === selectedId && !option.blockers.length) || null };
  }

  function planText(support) {
    const option = support.selected;
    const core = "Smoking cessation has been recommended. Planned discussion of a quit date or gradual quit approach, triggers, medication access, and behavioral support, with referral to 1-800-QUIT-NOW when acceptable. Follow-up within 1 to 2 weeks of the quit attempt was recommended to review smoking, cravings, adverse effects, and adherence.";
    if (!option) return core + " The preferred medication plan remained to be chosen after shared decision making and safety review.";
    if (option.id === "behavioral") return core + " Behavioral support without medication was recommended for now, with readiness and pharmacotherapy options to be revisited.";
    if (!option.ready) return core + ` ${option.name} was considered. A definitive prescription and dose were deferred pending medication-specific safety and dosing review.`;
    return core + ` ${option.name} has been recommended, subject to final prescribing review. Proposed course: ${option.schedule}`;
  }

  return { buildSupport, planText };
});
