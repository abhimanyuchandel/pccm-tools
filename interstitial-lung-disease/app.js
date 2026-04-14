(function () {
  const STORAGE_KEY = "ild-mdd-support-v1";
  const form = document.getElementById("ildForm");
  const runAssessmentButton = document.getElementById("runAssessment");
  const copyNoteButton = document.getElementById("copyNote");
  const copyExternalAiSummaryButton = document.getElementById("copyExternalAiSummary");
  const resetCaseButton = document.getElementById("resetCase");
  const noteOutput = document.getElementById("noteOutput");
  const openEvidencePromptOutput = document.getElementById("openEvidencePrompt");
  const primaryDiagnosis = document.getElementById("primaryDiagnosis");
  const completenessScore = document.getElementById("completenessScore");
  const completenessBar = document.querySelector("#completenessBar span");
  const missingItems = document.getElementById("missingItems");
  const nextSteps = document.getElementById("nextSteps");
  const overlayList = document.getElementById("overlayList");
  const differentialList = document.getElementById("differentialList");
  const derivedUipCategory = document.getElementById("derivedUipCategory");
  const derivedUipExplanation = document.getElementById("derivedUipExplanation");
  const derivedHpCategory = document.getElementById("derivedHpCategory");
  const derivedHpExplanation = document.getElementById("derivedHpExplanation");
  const exampleButtons = document.querySelectorAll("[data-example]");
  const PRINTABLE_DIFFERENTIAL_THRESHOLD = 0.05;
  const NUMERIC_FIELD_CONFIG = {
    age: { min: 18, max: 120, integer: true },
    packYears: { min: 0, max: 200 },
    anaTiter: { min: 0, max: 10240, integer: true },
    balLymphocytes: { min: 0, max: 100, integer: true },
    fvcDecline: { min: 0, max: 100 },
    dlcoDecline: { min: 0, max: 100 },
  };
  const defaultGeneticExample = {
    familyPf: "no",
    trgTestingResult: "not_tested",
    trgGene: "",
    srgTestingResult: "not_tested",
    srgGene: "",
    telomereLengthCategory: "not_tested",
    shortTelomereFeatures: "no",
    geneticNotes: "",
  };
  const defaultPathologyUnsampledExample = {
    pathologySampleType: "not_sampled",
    pathologyThoracicReview: "unknown",
    pathologyMddCorrelation: "unknown",
    pathologyPattern: "unknown",
    nonnecrotizingGranulomas: "unknown",
    airwayCenteredFibrosis: "unknown",
    minorLymphocyticBronchiolitis: "unknown",
    rareGiantCells: "unknown",
    fibroblastFoci: "unknown",
    organizingPneumoniaBodies: "unknown",
    lymphoidFollicles: "unknown",
    bhlAdenopathy: "no",
    perilymphaticNodules: "no",
    sarcoidExtrapulmonary: "no",
    granulomatousAlternativeExcluded: "not_applicable",
    pathologyNotes: "No biopsy or granulomatous tissue evaluation documented.",
  };

  const exampleCases = {
    ipf: {
      caseLabel: "Case A: UIP / IPF pattern",
      age: "72",
      sex: "male",
      knownCtd: "none",
      smokingStatus: "former",
      packYears: "25",
      symptomDuration: "chronic",
      coughPattern: "dry",
      dyspneaScale: "3",
      weightLoss: "no",
      fever: "no",
      ...defaultGeneticExample,
      birdExposure: "no",
      moldExposure: "no",
      waterDamage: "no",
      humidifierExposure: "no",
      hotTubExposure: "no",
      farmExposure: "no",
      smokeDustExposure: "no",
      metalExposure: "no",
      silicaExposure: "no",
      asbestosExposure: "no",
      woodExposure: "no",
      isocyanateExposure: "no",
      amiodarone: "no",
      nitrofurantoin: "no",
      methotrexate: "no",
      bleomycin: "no",
      radiation: "no",
      otherDrugConcern: "no",
      raynaud: "no",
      sicca: "no",
      reflux: "no",
      dysphagia: "no",
      inflammatoryArthritis: "no",
      skinThickening: "no",
      mechanicHands: "no",
      muscleWeakness: "no",
      rash: "no",
      mouthUlcers: "no",
      hematuria: "no",
      digitalUlcers: "no",
      anaTiter: "0",
      anaPattern: "negative",
      rfFlag: "normal",
      antiCcp: "negative",
      scl70: "negative",
      ssa: "negative",
      ssb: "negative",
      jo1: "negative",
      myositisPanel: "negative",
      mpoAnca: "negative",
      pr3Anca: "negative",
      ckElevated: "no",
      ferritinElevated: "no",
      esrCrpElevated: "no",
      c3c4Low: "no",
      ...defaultPathologyUnsampledExample,
      pathologyNotes: "No biopsy performed; no thoracic granulomatous signal is described.",
      uipCategory: "uip",
      hpCategory: "not_hp",
      honeycombing: "yes",
      tractionBronchiectasis: "yes",
      ggoExtent: "mild",
      consolidationExtent: "none",
      distribution: "lower_subpleural",
      airTrapping: "no",
      centrilobularNodules: "no",
      cysts: "no",
      emphysema: "no",
      subpleuralSparing: "no",
      fibrosisExtent: "40plus",
      fvcDecline: "7",
      dlcoDecline: "11",
      symptomProgression: "yes",
      radiologyProgression: "yes",
      oxygenNeed: "exertional",
      sixMwtDesat: "yes",
      narrative:
        "Chronic progressive fibrotic ILD with UIP pattern, basal honeycombing, and no convincing exposure, CTD, or drug trigger identified.",
    },
    ssc: {
      caseLabel: "Case B: systemic sclerosis phenotype",
      age: "52",
      sex: "female",
      knownCtd: "ssc",
      smokingStatus: "never",
      packYears: "0",
      symptomDuration: "chronic",
      coughPattern: "dry",
      dyspneaScale: "3",
      weightLoss: "no",
      fever: "no",
      ...defaultGeneticExample,
      birdExposure: "no",
      moldExposure: "no",
      waterDamage: "no",
      humidifierExposure: "no",
      hotTubExposure: "no",
      farmExposure: "no",
      smokeDustExposure: "no",
      metalExposure: "no",
      silicaExposure: "no",
      asbestosExposure: "no",
      woodExposure: "no",
      isocyanateExposure: "no",
      amiodarone: "no",
      nitrofurantoin: "no",
      methotrexate: "no",
      bleomycin: "no",
      radiation: "no",
      otherDrugConcern: "no",
      raynaud: "yes",
      sicca: "no",
      reflux: "yes",
      dysphagia: "yes",
      inflammatoryArthritis: "no",
      skinThickening: "yes",
      mechanicHands: "no",
      muscleWeakness: "no",
      rash: "no",
      mouthUlcers: "no",
      hematuria: "no",
      digitalUlcers: "yes",
      anaTiter: "640",
      anaPattern: "nucleolar",
      rfFlag: "normal",
      antiCcp: "negative",
      scl70: "positive",
      ssa: "negative",
      ssb: "negative",
      jo1: "negative",
      myositisPanel: "negative",
      mpoAnca: "negative",
      pr3Anca: "negative",
      ckElevated: "no",
      ferritinElevated: "no",
      esrCrpElevated: "yes",
      c3c4Low: "no",
      ...defaultPathologyUnsampledExample,
      pathologyNotes: "No biopsy performed; granulomatous disease is not suggested from available data.",
      uipCategory: "indeterminate_uip",
      hpCategory: "not_hp",
      honeycombing: "no",
      tractionBronchiectasis: "yes",
      ggoExtent: "moderate",
      consolidationExtent: "none",
      distribution: "lower_subpleural",
      airTrapping: "no",
      centrilobularNodules: "no",
      cysts: "no",
      emphysema: "no",
      subpleuralSparing: "yes",
      fibrosisExtent: "20_39",
      fvcDecline: "4",
      dlcoDecline: "8",
      symptomProgression: "yes",
      radiologyProgression: "no",
      oxygenNeed: "none",
      sixMwtDesat: "no",
      narrative:
        "Known systemic sclerosis with Raynaud phenomenon, reflux, nucleolar ANA, anti-Scl-70 positivity, and fibrotic NSIP-leaning HRCT morphology.",
    },
    hp: {
      caseLabel: "Case C: fibrotic hypersensitivity pneumonitis",
      age: "60",
      sex: "male",
      knownCtd: "none",
      smokingStatus: "never",
      packYears: "0",
      symptomDuration: "chronic",
      coughPattern: "dry",
      dyspneaScale: "3",
      weightLoss: "no",
      fever: "no",
      ...defaultGeneticExample,
      birdExposure: "yes",
      moldExposure: "no",
      waterDamage: "no",
      humidifierExposure: "no",
      hotTubExposure: "no",
      farmExposure: "no",
      smokeDustExposure: "no",
      metalExposure: "no",
      silicaExposure: "no",
      asbestosExposure: "no",
      woodExposure: "no",
      isocyanateExposure: "no",
      exposureNotes: "Indoor parrots for 10 years with direct cage cleaning.",
      amiodarone: "no",
      nitrofurantoin: "no",
      methotrexate: "no",
      bleomycin: "no",
      radiation: "no",
      otherDrugConcern: "no",
      raynaud: "no",
      sicca: "no",
      reflux: "no",
      dysphagia: "no",
      inflammatoryArthritis: "no",
      skinThickening: "no",
      mechanicHands: "no",
      muscleWeakness: "no",
      rash: "no",
      mouthUlcers: "no",
      hematuria: "no",
      digitalUlcers: "no",
      anaTiter: "0",
      anaPattern: "negative",
      rfFlag: "normal",
      antiCcp: "negative",
      scl70: "negative",
      ssa: "negative",
      ssb: "negative",
      jo1: "negative",
      myositisPanel: "negative",
      mpoAnca: "negative",
      pr3Anca: "negative",
      ckElevated: "no",
      ferritinElevated: "no",
      esrCrpElevated: "no",
      c3c4Low: "no",
      balLymphocytes: "35",
      pathologySampleType: "cryobiopsy",
      pathologyThoracicReview: "yes",
      pathologyMddCorrelation: "yes",
      pathologyPattern: "hp_like",
      pathologyNotes:
        "Transbronchial cryobiopsy showed airway-centered fibrosis with minor lymphocytic bronchiolitis and poorly formed nonnecrotizing granulomas; no better alternate pathology explanation was identified.",
      nonnecrotizingGranulomas: "no",
      airwayCenteredFibrosis: "yes",
      minorLymphocyticBronchiolitis: "yes",
      rareGiantCells: "yes",
      fibroblastFoci: "no",
      organizingPneumoniaBodies: "no",
      lymphoidFollicles: "no",
      bhlAdenopathy: "no",
      perilymphaticNodules: "no",
      sarcoidExtrapulmonary: "no",
      granulomatousAlternativeExcluded: "yes",
      uipCategory: "indeterminate_uip",
      hpCategory: "typical_hp",
      honeycombing: "yes",
      tractionBronchiectasis: "yes",
      ggoExtent: "mild",
      consolidationExtent: "none",
      distribution: "upper_mid",
      airTrapping: "yes",
      centrilobularNodules: "yes",
      cysts: "no",
      emphysema: "no",
      subpleuralSparing: "no",
      fibrosisExtent: "20_39",
      fvcDecline: "5",
      dlcoDecline: "9",
      symptomProgression: "yes",
      radiologyProgression: "yes",
      oxygenNeed: "exertional",
      sixMwtDesat: "yes",
      mddQuestion: "Given exposure history, typical fibrotic HP-pattern HRCT, BAL lymphocytosis, and HP-compatible biopsy features, is additional tissue sampling necessary?",
      narrative:
        "Bird exposure with fibrotic typical HP pattern, BAL lymphocytosis, and biopsy features supportive of fibrotic hypersensitivity pneumonitis.",
    },
    myositis: {
      caseLabel: "Case D: antisynthetase phenotype",
      age: "46",
      sex: "female",
      knownCtd: "iim",
      smokingStatus: "never",
      packYears: "0",
      symptomDuration: "subacute",
      coughPattern: "dry",
      dyspneaScale: "3",
      weightLoss: "yes",
      fever: "no",
      ...defaultGeneticExample,
      birdExposure: "no",
      moldExposure: "no",
      waterDamage: "no",
      humidifierExposure: "no",
      hotTubExposure: "no",
      farmExposure: "no",
      smokeDustExposure: "no",
      metalExposure: "no",
      silicaExposure: "no",
      asbestosExposure: "no",
      woodExposure: "no",
      isocyanateExposure: "no",
      amiodarone: "no",
      nitrofurantoin: "no",
      methotrexate: "no",
      bleomycin: "no",
      radiation: "no",
      otherDrugConcern: "no",
      raynaud: "no",
      sicca: "no",
      reflux: "no",
      dysphagia: "no",
      inflammatoryArthritis: "yes",
      skinThickening: "no",
      mechanicHands: "yes",
      muscleWeakness: "yes",
      rash: "yes",
      mouthUlcers: "no",
      hematuria: "no",
      digitalUlcers: "no",
      anaTiter: "0",
      anaPattern: "negative",
      rfFlag: "normal",
      antiCcp: "negative",
      scl70: "negative",
      ssa: "negative",
      ssb: "negative",
      jo1: "positive",
      myositisPanel: "positive",
      mpoAnca: "negative",
      pr3Anca: "negative",
      ckElevated: "yes",
      ferritinElevated: "yes",
      esrCrpElevated: "yes",
      c3c4Low: "no",
      ...defaultPathologyUnsampledExample,
      pathologyNotes: "No biopsy performed; granulomatous disease is not suggested from current data.",
      uipCategory: "alternative",
      hpCategory: "not_hp",
      honeycombing: "no",
      tractionBronchiectasis: "yes",
      ggoExtent: "moderate",
      consolidationExtent: "moderate",
      distribution: "peribronchovascular",
      airTrapping: "no",
      centrilobularNodules: "no",
      cysts: "no",
      emphysema: "no",
      subpleuralSparing: "yes",
      fibrosisExtent: "10_19",
      fvcDecline: "6",
      dlcoDecline: "12",
      symptomProgression: "yes",
      radiologyProgression: "yes",
      oxygenNeed: "exertional",
      sixMwtDesat: "yes",
      narrative:
        "Mechanic hands, muscle weakness, mild CK elevation, ANA negative, anti-Jo-1 positive, and NSIP/organizing pneumonia overlap pattern.",
    },
    ra: {
      caseLabel: "Case E: seropositive RA-ILD",
      age: "68",
      sex: "male",
      knownCtd: "ra",
      smokingStatus: "former",
      packYears: "20",
      symptomDuration: "chronic",
      coughPattern: "dry",
      dyspneaScale: "3",
      weightLoss: "no",
      fever: "no",
      ...defaultGeneticExample,
      birdExposure: "no",
      moldExposure: "no",
      waterDamage: "no",
      humidifierExposure: "no",
      hotTubExposure: "no",
      farmExposure: "no",
      smokeDustExposure: "no",
      metalExposure: "no",
      silicaExposure: "no",
      asbestosExposure: "no",
      woodExposure: "no",
      isocyanateExposure: "no",
      amiodarone: "no",
      nitrofurantoin: "no",
      methotrexate: "no",
      bleomycin: "no",
      radiation: "no",
      otherDrugConcern: "no",
      raynaud: "no",
      sicca: "no",
      reflux: "no",
      dysphagia: "no",
      inflammatoryArthritis: "yes",
      skinThickening: "no",
      mechanicHands: "no",
      muscleWeakness: "no",
      rash: "no",
      mouthUlcers: "no",
      hematuria: "no",
      digitalUlcers: "no",
      anaTiter: "0",
      anaPattern: "negative",
      rfFlag: "high",
      antiCcp: "positive",
      scl70: "negative",
      ssa: "negative",
      ssb: "negative",
      jo1: "negative",
      myositisPanel: "negative",
      mpoAnca: "negative",
      pr3Anca: "negative",
      ckElevated: "no",
      ferritinElevated: "no",
      esrCrpElevated: "yes",
      c3c4Low: "no",
      ...defaultPathologyUnsampledExample,
      pathologyNotes: "No biopsy performed; no granulomatous pattern is described.",
      uipCategory: "probable_uip",
      hpCategory: "not_hp",
      honeycombing: "yes",
      tractionBronchiectasis: "yes",
      ggoExtent: "mild",
      consolidationExtent: "none",
      distribution: "lower_subpleural",
      airTrapping: "no",
      centrilobularNodules: "no",
      cysts: "no",
      emphysema: "no",
      subpleuralSparing: "no",
      fibrosisExtent: "20_39",
      fvcDecline: "6",
      dlcoDecline: "10",
      symptomProgression: "yes",
      radiologyProgression: "yes",
      oxygenNeed: "exertional",
      sixMwtDesat: "yes",
      narrative:
        "Seropositive rheumatoid arthritis with chronic fibrotic ILD, probable UIP pattern, and no stronger exposure or drug explanation identified.",
    },
    sarcoid: {
      caseLabel: "Case F: pulmonary sarcoidosis",
      age: "44",
      sex: "female",
      knownCtd: "none",
      smokingStatus: "never",
      packYears: "0",
      symptomDuration: "subacute",
      coughPattern: "dry",
      dyspneaScale: "2",
      weightLoss: "no",
      fever: "no",
      ...defaultGeneticExample,
      birdExposure: "no",
      moldExposure: "no",
      waterDamage: "no",
      humidifierExposure: "no",
      hotTubExposure: "no",
      farmExposure: "no",
      smokeDustExposure: "no",
      metalExposure: "no",
      silicaExposure: "no",
      asbestosExposure: "no",
      woodExposure: "no",
      isocyanateExposure: "no",
      amiodarone: "no",
      nitrofurantoin: "no",
      methotrexate: "no",
      bleomycin: "no",
      radiation: "no",
      otherDrugConcern: "no",
      raynaud: "no",
      sicca: "no",
      reflux: "no",
      dysphagia: "no",
      inflammatoryArthritis: "no",
      skinThickening: "no",
      mechanicHands: "no",
      muscleWeakness: "no",
      rash: "no",
      mouthUlcers: "no",
      hematuria: "no",
      digitalUlcers: "no",
      anaTiter: "0",
      anaPattern: "negative",
      rfFlag: "normal",
      antiCcp: "negative",
      scl70: "negative",
      ssa: "negative",
      ssb: "negative",
      jo1: "negative",
      myositisPanel: "negative",
      mpoAnca: "negative",
      pr3Anca: "negative",
      ckElevated: "no",
      ferritinElevated: "no",
      esrCrpElevated: "yes",
      c3c4Low: "no",
      pathologySampleType: "lymph_node",
      pathologyThoracicReview: "yes",
      pathologyMddCorrelation: "yes",
      pathologyPattern: "sarcoid_like",
      nonnecrotizingGranulomas: "yes",
      airwayCenteredFibrosis: "no",
      minorLymphocyticBronchiolitis: "no",
      rareGiantCells: "no",
      fibroblastFoci: "no",
      organizingPneumoniaBodies: "no",
      lymphoidFollicles: "no",
      bhlAdenopathy: "yes",
      perilymphaticNodules: "yes",
      sarcoidExtrapulmonary: "yes",
      granulomatousAlternativeExcluded: "yes",
      pathologyNotes:
        "EBUS-guided mediastinal node sampling demonstrated non-necrotizing granulomas; fungal and mycobacterial studies were unrevealing.",
      labNotes: "Baseline calcium and creatinine pending; ophthalmology review requested for possible ocular involvement.",
      uipCategory: "alternative",
      hpCategory: "not_hp",
      honeycombing: "no",
      tractionBronchiectasis: "no",
      ggoExtent: "mild",
      consolidationExtent: "none",
      distribution: "upper_mid",
      airTrapping: "no",
      centrilobularNodules: "no",
      cysts: "no",
      emphysema: "no",
      subpleuralSparing: "no",
      fibrosisExtent: "under10",
      fvcDecline: "0",
      dlcoDecline: "0",
      symptomProgression: "no",
      radiologyProgression: "no",
      oxygenNeed: "none",
      sixMwtDesat: "no",
      mddQuestion: "Is the current dataset sufficient to close the diagnosis as pulmonary sarcoidosis and proceed with organ staging?",
      narrative:
        "Dry cough with upper-lung nodularity, bilateral hilar and mediastinal adenopathy, biopsy-proven non-necrotizing granulomas, and extrapulmonary sarcoid-compatible features.",
    },
    familial_pf: {
      caseLabel: "Case G: familial pulmonary fibrosis with TRG variant",
      age: "56",
      sex: "male",
      knownCtd: "none",
      smokingStatus: "former",
      packYears: "12",
      symptomDuration: "chronic",
      coughPattern: "dry",
      dyspneaScale: "3",
      weightLoss: "no",
      fever: "no",
      familyPf: "yes",
      trgTestingResult: "pathogenic",
      trgGene: "tert",
      srgTestingResult: "negative",
      srgGene: "",
      telomereLengthCategory: "lt1",
      shortTelomereFeatures: "yes",
      geneticNotes:
        "Two first-degree relatives had fibrotic ILD; prior genetics review classified a pathogenic TERT variant. Counseling and cascade testing are being discussed.",
      birdExposure: "no",
      moldExposure: "no",
      waterDamage: "no",
      humidifierExposure: "no",
      hotTubExposure: "no",
      farmExposure: "no",
      smokeDustExposure: "no",
      metalExposure: "no",
      silicaExposure: "no",
      asbestosExposure: "no",
      woodExposure: "no",
      isocyanateExposure: "no",
      amiodarone: "no",
      nitrofurantoin: "no",
      methotrexate: "no",
      bleomycin: "no",
      radiation: "no",
      otherDrugConcern: "no",
      raynaud: "no",
      sicca: "no",
      reflux: "no",
      dysphagia: "no",
      inflammatoryArthritis: "no",
      skinThickening: "no",
      mechanicHands: "no",
      muscleWeakness: "no",
      rash: "no",
      mouthUlcers: "no",
      hematuria: "no",
      digitalUlcers: "no",
      anaTiter: "0",
      anaPattern: "negative",
      rfFlag: "normal",
      antiCcp: "negative",
      scl70: "negative",
      ssa: "negative",
      ssb: "negative",
      jo1: "negative",
      myositisPanel: "negative",
      mpoAnca: "negative",
      pr3Anca: "negative",
      ckElevated: "no",
      ferritinElevated: "no",
      esrCrpElevated: "no",
      c3c4Low: "no",
      ...defaultPathologyUnsampledExample,
      pathologyNotes: "No biopsy performed because the multidisciplinary discussion considered the pathogenic TERT result and HRCT phenotype sufficient to guide management.",
      uipCategory: "probable_uip",
      hpCategory: "not_hp",
      honeycombing: "no",
      tractionBronchiectasis: "yes",
      ggoExtent: "mild",
      consolidationExtent: "none",
      distribution: "lower_subpleural",
      airTrapping: "no",
      centrilobularNodules: "no",
      cysts: "no",
      emphysema: "no",
      subpleuralSparing: "no",
      fibrosisExtent: "20_39",
      fvcDecline: "8",
      dlcoDecline: "12",
      symptomProgression: "yes",
      radiologyProgression: "yes",
      oxygenNeed: "exertional",
      sixMwtDesat: "yes",
      mddQuestion: "Should this be framed as familial pulmonary fibrosis with pathogenic TERT variant and probable UIP phenotype, and should biopsy be deferred?",
      narrative:
        "Progressive fibrotic ILD in a patient with family history of pulmonary fibrosis, pathogenic TERT variant, very short telomeres, and short telomere syndrome features.",
    },
  };

  const homeExposureFields = [
    "birdExposure",
    "moldExposure",
    "waterDamage",
    "humidifierExposure",
    "hotTubExposure",
  ];
  const occupationalExposureFields = [
    "farmExposure",
    "smokeDustExposure",
    "metalExposure",
    "silicaExposure",
    "asbestosExposure",
    "woodExposure",
    "isocyanateExposure",
  ];
  const medicationFields = [
    "amiodarone",
    "nitrofurantoin",
    "methotrexate",
    "bleomycin",
    "radiation",
    "otherDrugConcern",
  ];
  const ctdScreenFields = [
    "raynaud",
    "sicca",
    "reflux",
    "dysphagia",
    "inflammatoryArthritis",
    "skinThickening",
    "mechanicHands",
    "muscleWeakness",
    "rash",
    "mouthUlcers",
    "hematuria",
    "digitalUlcers",
  ];
  const hpPathologyFields = ["airwayCenteredFibrosis", "minorLymphocyticBronchiolitis", "rareGiantCells"];
  const sarcoidPresentationFields = ["bhlAdenopathy", "perilymphaticNodules", "sarcoidExtrapulmonary"];
  const defaultNegativeFields = [...homeExposureFields, ...occupationalExposureFields, ...medicationFields, ...ctdScreenFields];
  const defaultBaselineFieldValues = {
    familyPf: "no",
    trgTestingResult: "not_tested",
    srgTestingResult: "not_tested",
    telomereLengthCategory: "not_tested",
    shortTelomereFeatures: "no",
    honeycombing: "no",
    tractionBronchiectasis: "no",
    ggoExtent: "none",
    consolidationExtent: "none",
    distribution: "unknown",
    airTrapping: "no",
    centrilobularNodules: "no",
    bhlAdenopathy: "no",
    perilymphaticNodules: "no",
    cysts: "no",
    emphysema: "no",
    subpleuralSparing: "no",
    fibrosisExtent: "under10",
    pathologySampleType: "not_sampled",
    pathologyThoracicReview: "unknown",
    pathologyMddCorrelation: "unknown",
    pathologyPattern: "unknown",
    nonnecrotizingGranulomas: "unknown",
    airwayCenteredFibrosis: "unknown",
    minorLymphocyticBronchiolitis: "unknown",
    rareGiantCells: "unknown",
    fibroblastFoci: "unknown",
    organizingPneumoniaBodies: "unknown",
    lymphoidFollicles: "unknown",
    sarcoidExtrapulmonary: "no",
    granulomatousAlternativeExcluded: "not_applicable",
  };

  const labelMap = {
    birdExposure: "bird or feather exposure",
    moldExposure: "mold exposure",
    waterDamage: "water damage",
    humidifierExposure: "humidifier exposure",
    hotTubExposure: "hot tub or sauna exposure",
    farmExposure: "farming or organic dust exposure",
    smokeDustExposure: "heavy smoke or dust exposure",
    metalExposure: "metal exposure",
    silicaExposure: "silica exposure",
    asbestosExposure: "asbestos exposure",
    woodExposure: "wood or organic dust exposure",
    isocyanateExposure: "paint or isocyanate exposure",
    amiodarone: "amiodarone",
    nitrofurantoin: "nitrofurantoin",
    methotrexate: "methotrexate",
    bleomycin: "bleomycin or cytotoxic therapy",
    radiation: "cyclophosphamide or radiation",
    otherDrugConcern: "other pneumotoxic drug concern",
    raynaud: "Raynaud phenomenon",
    sicca: "sicca symptoms",
    reflux: "reflux",
    dysphagia: "dysphagia",
    inflammatoryArthritis: "inflammatory arthritis",
    skinThickening: "skin thickening",
    mechanicHands: "mechanic hands",
    muscleWeakness: "proximal muscle weakness",
    rash: "CTD-compatible rash",
    mouthUlcers: "mouth ulcers",
    hematuria: "hematuria",
    digitalUlcers: "digital ulcers",
    pathologySampleType: "pathology material",
    pathologyPattern: "dominant histopathologic impression",
    airwayCenteredFibrosis: "airway-centered fibrosis",
    minorLymphocyticBronchiolitis: "minor lymphocytic bronchiolitis",
    rareGiantCells: "poorly formed nonnecrotizing granulomas",
    fibroblastFoci: "fibroblast foci",
    organizingPneumoniaBodies: "organizing pneumonia / Masson bodies",
    lymphoidFollicles: "lymphoid follicles or plasma cell-rich infiltrate",
    bhlAdenopathy: "bilateral hilar or mediastinal adenopathy",
    perilymphaticNodules: "perilymphatic nodules",
    sarcoidExtrapulmonary: "extrapulmonary sarcoid-compatible features",
  };
  const uipCategoryLabelMap = {
    uip: "UIP",
    probable_uip: "Probable UIP",
    indeterminate_uip: "Indeterminate for UIP",
    alternative: "Alternative diagnosis pattern",
    unknown: "Awaiting more descriptors",
  };
  const hpCategoryLabelMap = {
    typical_hp: "Typical HP",
    compatible_hp: "Compatible with HP",
    indeterminate_hp: "Indeterminate for HP",
    not_hp: "Not suggestive of HP",
    unknown: "Awaiting more descriptors",
  };
  const trgGeneLabelMap = {
    tert: "TERT",
    terc: "TERC",
    rtel1: "RTEL1",
    parn: "PARN",
    dkc1: "DKC1",
    naf1: "NAF1",
    zcchc8: "ZCCHC8",
    other: "other TRG",
    unknown: "unknown TRG",
  };
  const srgGeneLabelMap = {
    sftpc: "SFTPC",
    sftpa1: "SFTPA1",
    sftpa2: "SFTPA2",
    abca3: "ABCA3",
    nkx2_1: "NKX2-1",
    other: "other SRG",
    unknown: "unknown SRG",
  };
  const telomereLengthLabelMap = {
    lt1: "<1st percentile",
    p1_10: "1st-10th percentile",
    p10_50: "10th-50th percentile",
    gt50: ">50th percentile",
    not_tested: "not tested",
    unknown: "unknown",
  };
  const pathologySampleTypeLabelMap = {
    not_sampled: "not sampled / no tissue available",
    transbronchial: "transbronchial biopsy",
    cryobiopsy: "transbronchial cryobiopsy",
    surgical: "surgical lung biopsy",
    lymph_node: "lymph node sampling",
    extrapulmonary: "extrapulmonary tissue biopsy",
    multiple: "multiple specimens reviewed",
    unknown: "unknown",
  };
  const pathologyPatternLabelMap = {
    uip_like: "UIP-like fibrosis",
    fibrotic_nsip_like: "fibrotic NSIP-like",
    cellular_nsip_like: "cellular NSIP-like",
    op_like: "organizing pneumonia",
    hp_like: "bronchiolocentric / HP-like",
    sarcoid_like: "sarcoid-like granulomatous pattern",
    lip_like: "lymphoid / LIP-like",
    dad_like: "acute lung injury / DAD-like",
    unclassifiable: "unclassifiable / mixed pattern",
    unknown: "unknown / not assigned",
  };
  const pathologyWorkflowLabelMap = {
    yes: "documented",
    no: "not documented",
    unknown: "unknown",
  };
  const distributionLabelMap = {
    lower_subpleural: "lower-lung subpleural",
    upper_mid: "upper or mid-lung predominant",
    peribronchovascular: "peribronchovascular",
    diffuse: "diffuse or mixed",
    unknown: "unknown",
  };
  const fibrosisExtentLabelMap = {
    under10: "<10%",
    "10_19": "10-19%",
    "20_39": "20-39%",
    "40plus": "40% or more",
    unknown: "unknown",
  };
  const symptomTempoLabelMap = {
    acute: "acute (<1 month)",
    subacute: "subacute (1-3 months)",
    chronic: "chronic (>3 months)",
    unknown: "unknown",
  };
  const coughPatternLabelMap = {
    dry: "predominantly dry",
    productive: "productive",
    none: "minimal or absent",
    unknown: "unknown",
  };
  const hrctExtentLabelMap = {
    none: "none",
    mild: "mild",
    moderate: "moderate",
    marked: "marked",
    unknown: "unknown",
  };
  const oxygenNeedLabelMap = {
    none: "none",
    exertional: "exertional only",
    continuous: "continuous or high-flow",
    unknown: "unknown",
  };

  function yes(value) {
    return value === "yes";
  }

  function positive(value) {
    return value === "positive" || value === "high";
  }

  function no(value) {
    return value === "no" || value === "negative" || value === "normal";
  }

  function unknown(value) {
    return value === "" || value === "unknown";
  }

  function parseNumber(value) {
    if (value === "" || value == null) {
      return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function readNumericField(fieldName) {
    const field = form.elements.namedItem(fieldName);
    if (!field) {
      return { value: null, invalid: false };
    }

    const raw = field.value.trim();
    if (raw === "") {
      return { value: null, invalid: false };
    }

    const value = Number(raw);
    if (!Number.isFinite(value)) {
      return { value: null, invalid: true };
    }

    const config = NUMERIC_FIELD_CONFIG[fieldName] || {};
    if (config.integer && !Number.isInteger(value)) {
      return { value: null, invalid: true };
    }
    if (config.min !== undefined && value < config.min) {
      return { value: null, invalid: true };
    }
    if (config.max !== undefined && value > config.max) {
      return { value: null, invalid: true };
    }

    return { value, invalid: false };
  }

  function setNumericFieldAlertState(fieldName, isInvalid) {
    const field = form.elements.namedItem(fieldName);
    if (!field) {
      return;
    }

    field.classList.toggle("numeric-alert", isInvalid);

    const label = field.closest("label");
    if (label) {
      label.classList.toggle("numeric-alert-label", isInvalid);
    }

    if (isInvalid) {
      field.setAttribute("aria-invalid", "true");
    } else {
      field.removeAttribute("aria-invalid");
    }
  }

  function refreshNumericFieldAlerts() {
    Object.keys(NUMERIC_FIELD_CONFIG).forEach((fieldName) => {
      const parsed = readNumericField(fieldName);
      setNumericFieldAlertState(fieldName, parsed.invalid);
    });
  }

  function anyKnown(data, fields) {
    return fields.some((field) => !unknown(data[field]));
  }

  function countYes(data, fields) {
    return fields.filter((field) => yes(data[field])).length;
  }

  function collectPositiveLabels(data, fields) {
    return fields.filter((field) => yes(data[field])).map((field) => labelMap[field]);
  }

  function applyDefaultNegatives() {
    defaultNegativeFields.forEach((fieldName) => {
      const field = form.elements.namedItem(fieldName);
      if (field && field.value === "") {
        field.value = "no";
      }
    });
  }

  function applyBaselineDefaults(force = false) {
    Object.entries(defaultBaselineFieldValues).forEach(([fieldName, defaultValue]) => {
      const field = form.elements.namedItem(fieldName);
      if (field && (force || field.value === "")) {
        field.value = defaultValue;
      }
    });
  }

  function pushUnique(list, value) {
    if (value && !list.includes(value)) {
      list.push(value);
    }
  }

  function softmax(scores, temperature) {
    const safeTemperature = temperature || 1;
    const scaled = scores.map((score) => score / safeTemperature);
    const max = Math.max(...scaled);
    const exps = scaled.map((value) => Math.exp(value - max));
    const sum = exps.reduce((total, value) => total + value, 0);
    return exps.map((value) => value / sum);
  }

  function formatCategoryLabel(value, labelMapForCategory) {
    return labelMapForCategory[value] || "Awaiting more descriptors";
  }

  function formatPresence(value) {
    if (yes(value)) return "present";
    if (no(value)) return "absent";
    if (value === "not_applicable") return "not applicable";
    if (unknown(value)) return "unknown";
    return "not entered";
  }

  function formatMappedValue(value, labelMapForValue, fallback = "not entered") {
    if (value === "" || value == null) {
      return fallback;
    }
    return labelMapForValue[value] || value;
  }

  function buildPhenotypeDescriptor(primary) {
    return (
      {
        ipf: "UIP-family phenotype",
        hp: primary.label.toLowerCase().includes("fibrotic") ? "fibrotic HP phenotype" : "HP phenotype",
        ssc_ild: "systemic sclerosis-associated ILD phenotype",
        ra_ild: "rheumatoid arthritis-associated ILD phenotype",
        myositis_ild: "myositis-associated ILD phenotype",
        sjogren_lip: "Sjögren/LIP-spectrum phenotype",
        sarcoidosis: "sarcoidosis phenotype",
        ipaf: "autoimmune-featured ILD phenotype",
        anca_ild: "ANCA-associated ILD phenotype",
        drug_ild: "drug-related ILD phenotype",
        op: "organizing pneumonia phenotype",
        smoking_ild: "smoking-related ILD phenotype",
        idiopathic_nsip: "NSIP phenotype",
        unclassifiable: "unclassifiable fibrotic ILD phenotype",
      }[primary.key] || primary.label
    );
  }

  function buildGeneticDiagnosisDescriptor(data, signals) {
    if (signals.trgPathogenic) {
      return `${yes(data.familyPf) ? "Familial pulmonary fibrosis" : "Genetically mediated fibrotic ILD"} with pathogenic ${signals.trgGeneLabel} telomere-related variant`;
    }
    if (signals.srgPathogenic) {
      return `${yes(data.familyPf) ? "Familial pulmonary fibrosis" : "Genetically mediated fibrotic ILD"} with pathogenic ${signals.srgGeneLabel} surfactant-related variant`;
    }
    if (yes(data.familyPf) && signals.telomereShort && signals.fibroticSignals) {
      return "Familial pulmonary fibrosis with short telomere syndrome context";
    }
    if (yes(data.familyPf) && signals.fibroticSignals) {
      return "Familial pulmonary fibrosis context";
    }
    return "";
  }

  function buildPrimaryOutputLabel(primary, data, signals) {
    const geneticDescriptor = buildGeneticDiagnosisDescriptor(data, signals);
    if (!geneticDescriptor) {
      return primary.label;
    }
    return `${geneticDescriptor}, ${buildPhenotypeDescriptor(primary)}`;
  }

  function pathologySampled(data) {
    return !["", "not_sampled", "unknown"].includes(data.pathologySampleType);
  }

  function buildPathologyProcessLine(data) {
    if (!pathologySampled(data)) {
      return "Pathology process: no tissue sampling is documented from the current case inputs.";
    }

    const processBits = [
      `specimen: ${formatMappedValue(data.pathologySampleType, pathologySampleTypeLabelMap, "not entered")}`,
      `thoracic pathology review: ${formatMappedValue(data.pathologyThoracicReview, pathologyWorkflowLabelMap, "not entered")}`,
      `MDD clinicoradiologic correlation: ${formatMappedValue(data.pathologyMddCorrelation, pathologyWorkflowLabelMap, "not entered")}`,
    ];

    if (!unknown(data.pathologyPattern)) {
      processBits.push(`dominant impression: ${formatMappedValue(data.pathologyPattern, pathologyPatternLabelMap)}`);
    }

    return `Pathology process: ${processBits.join("; ")}.`;
  }

  function buildPathologyFindingBits(data, signals) {
    const pathologyBits = [];
    if (!unknown(data.pathologyPattern)) {
      pathologyBits.push(`dominant pattern ${formatMappedValue(data.pathologyPattern, pathologyPatternLabelMap)}`);
    }
    if (yes(data.nonnecrotizingGranulomas)) pathologyBits.push("well-formed non-necrotizing granulomas present");
    if (signals.hpPathologyLabels.length) pathologyBits.push(`HP-compatible features including ${signals.hpPathologyLabels.join(", ")}`);
    if (yes(data.fibroblastFoci)) pathologyBits.push("fibroblast foci present");
    if (yes(data.organizingPneumoniaBodies)) pathologyBits.push("organizing pneumonia / Masson bodies present");
    if (yes(data.lymphoidFollicles)) pathologyBits.push("lymphoid follicles or plasma cell-rich infiltrate present");
    if (yes(data.sarcoidExtrapulmonary)) pathologyBits.push("extrapulmonary sarcoid-compatible features");
    return pathologyBits;
  }

  function buildCaseSummaryLines(data, signals, expectedBehavior) {
    const knownCtdLabel =
      {
        ssc: "systemic sclerosis",
        ra: "rheumatoid arthritis",
        iim: "idiopathic inflammatory myopathy",
        sjogren: "Sjögren disease",
        mctd: "mixed connective tissue disease",
        sle: "systemic lupus erythematosus",
        other: "other connective tissue disease",
      }[data.knownCtd] || null;

    const summaryLines = [];
    const smokingLabel =
      {
        never: "never-smoker",
        former: "former smoker",
        current: "current smoker",
        unknown: "smoking history unknown",
      }[data.smokingStatus] || null;
    const symptomBits = [
      signals.age !== null ? `${signals.age}-year-old ${data.sex || "patient"}` : "Patient",
      smokingLabel ? `${smokingLabel}${signals.packYears ? ` (${signals.packYears} pack-years)` : ""}` : null,
      data.symptomDuration ? `${formatMappedValue(data.symptomDuration, symptomTempoLabelMap, "tempo not entered")} symptom tempo` : null,
      data.coughPattern ? `${formatMappedValue(data.coughPattern, coughPatternLabelMap, "cough pattern not entered")} cough` : null,
      data.dyspneaScale ? `dyspnea burden around mMRC ${data.dyspneaScale}` : null,
    ].filter(Boolean);
    summaryLines.push(`Context: ${symptomBits.join(", ")}.`);
    summaryLines.push(
      signals.exposureLabels.length
        ? `Exposure history: positive for ${signals.exposureLabels.join(", ")}.`
        : "Exposure history: no convincing domestic or occupational antigen or toxic exposure identified from the completed structured screen."
    );
    const geneticBits = [];
    if (yes(data.familyPf)) geneticBits.push("family history of pulmonary fibrosis/ILD present");
    else if (no(data.familyPf)) geneticBits.push("no family history of pulmonary fibrosis/ILD entered");
    if (signals.trgPathogenic) geneticBits.push(`TRG testing shows pathogenic/likely pathogenic ${signals.trgGeneLabel} variant`);
    else if (signals.trgVus) geneticBits.push(`TRG testing shows ${signals.trgGeneLabel} variant of uncertain significance`);
    else if (data.trgTestingResult === "negative") geneticBits.push("TRG testing negative");
    else if (data.trgTestingResult === "not_tested") geneticBits.push("TRG testing not performed");
    if (signals.srgPathogenic) geneticBits.push(`SRG testing shows pathogenic/likely pathogenic ${signals.srgGeneLabel} variant`);
    else if (signals.srgVus) geneticBits.push(`SRG testing shows ${signals.srgGeneLabel} variant of uncertain significance`);
    else if (data.srgTestingResult === "negative") geneticBits.push("SRG testing negative");
    else if (data.srgTestingResult === "not_tested") geneticBits.push("SRG testing not performed");
    if (signals.telomereVeryShort) geneticBits.push("age-adjusted leukocyte telomere length <1st percentile");
    else if (signals.telomereShort) geneticBits.push(`age-adjusted leukocyte telomere length ${formatMappedValue(data.telomereLengthCategory, telomereLengthLabelMap)}`);
    else if (["p10_50", "gt50"].includes(data.telomereLengthCategory)) {
      geneticBits.push(`age-adjusted leukocyte telomere length ${formatMappedValue(data.telomereLengthCategory, telomereLengthLabelMap)}`);
    }
    if (yes(data.shortTelomereFeatures)) geneticBits.push("short telomere syndrome features present");
    summaryLines.push(
      geneticBits.length
        ? `Genetic context: ${geneticBits.join(", ")}.`
        : "Genetic context: familial/genetic fibrosis assessment not documented from current structured inputs."
    );
    if (signals.geneticEtiologyLikely || yes(data.familyPf) || signals.telomereShort) {
      summaryLines.push(
        `Genetic classification modifier: ${buildGeneticDiagnosisDescriptor(data, signals) || "familial or genetically mediated fibrosis context"} should be considered in the final MDD formulation.`
      );
    }
    summaryLines.push(
      signals.medicationLabels.length
        ? `Medication and toxin history: concern for ${signals.medicationLabels.join(", ")}.`
        : "Medication and toxin history: no clear pneumotoxic medication or toxin signal documented."
    );

    const autoimmuneBits = [];
    if (knownCtdLabel) autoimmuneBits.push(`known ${knownCtdLabel}`);
    if (signals.ctdFeatureLabels.length) autoimmuneBits.push(`clinical features including ${signals.ctdFeatureLabels.slice(0, 4).join(", ")}`);
    if (signals.anaMeaningful) autoimmuneBits.push(`ANA significance (${data.anaPattern}${signals.anaTiter ? ` 1:${signals.anaTiter}` : ""})`);
    if (positive(data.rfFlag)) autoimmuneBits.push("RF at least 2x ULN");
    if (positive(data.antiCcp)) autoimmuneBits.push("anti-CCP positive");
    if (positive(data.scl70)) autoimmuneBits.push("anti-Scl-70 positive");
    if (positive(data.ssa)) autoimmuneBits.push("SSA positive");
    if (positive(data.ssb)) autoimmuneBits.push("SSB positive");
    if (positive(data.jo1)) autoimmuneBits.push("anti-Jo-1 positive");
    if (positive(data.myositisPanel)) autoimmuneBits.push("extended myositis panel positive");
    if (yes(data.ckElevated)) autoimmuneBits.push("CK and/or aldolase elevated");
    if (yes(data.ferritinElevated)) autoimmuneBits.push("ferritin elevated");
    if (yes(data.esrCrpElevated)) autoimmuneBits.push("ESR/CRP elevated");
    if (yes(data.c3c4Low)) autoimmuneBits.push("low complement");
    if (positive(data.mpoAnca)) autoimmuneBits.push("MPO-ANCA positive");
    if (positive(data.pr3Anca)) autoimmuneBits.push("PR3-ANCA positive");
    summaryLines.push(
      autoimmuneBits.length
        ? `Autoimmune context: ${autoimmuneBits.join(", ")}${signals.iimFerritinRisk ? "; in an IIM phenotype elevated ferritin is associated with poorer prognosis" : ""}.`
        : "Autoimmune context: no strong CTD or autoimmune serologic signal identified from current inputs."
    );

    summaryLines.push(buildPathologyProcessLine(data));
    const pathologyBits = buildPathologyFindingBits(data, signals);
    summaryLines.push(
      pathologyBits.length
        ? `Pathology findings: ${pathologyBits.join(", ")}.`
        : pathologySampled(data)
          ? "Pathology findings: no high-yield structured pattern features were entered from the available tissue review."
          : "Pathology findings: no tissue-derived features are available from the current intake."
    );

    const imagingBits = [
      `app-derived UIP-family category: ${formatCategoryLabel(data.uipCategory, uipCategoryLabelMap)}`,
      `app-derived HP-family category: ${formatCategoryLabel(data.hpCategory, hpCategoryLabelMap)}`,
      `honeycombing: ${formatPresence(data.honeycombing)}`,
      `traction bronchiectasis: ${formatPresence(data.tractionBronchiectasis)}`,
      `dominant distribution: ${formatMappedValue(data.distribution, distributionLabelMap)}`,
      `fibrosis extent: ${formatMappedValue(data.fibrosisExtent, fibrosisExtentLabelMap)}`,
    ];
    if (yes(data.airTrapping)) imagingBits.push("air trapping / mosaic attenuation: present");
    if (yes(data.centrilobularNodules)) imagingBits.push("centrilobular nodules: present");
    if (yes(data.bhlAdenopathy)) imagingBits.push("bilateral hilar and/or mediastinal adenopathy: present");
    if (yes(data.perilymphaticNodules)) imagingBits.push("perilymphatic nodules: present");
    if (yes(data.cysts)) imagingBits.push("thin-walled cysts: present");
    if (signals.balLymphocytes !== null) imagingBits.push(`BAL lymphocytes: ${signals.balLymphocytes}%`);
    summaryLines.push(`Imaging and adjunct data: ${imagingBits.join("; ")}.`);

    summaryLines.push(
      signals.ppfOverlay
        ? "Progression: at least two progression domains are present over about 12 months, so a PPF-style overlay is flagged."
        : "Progression: a PPF-style overlay is not firmly established from the entered symptom, physiology, and radiology fields."
    );
    if (yes(data.granulomatousAlternativeExcluded)) {
      summaryLines.push("MDD context: alternative granulomatous causes have been documented as reasonably excluded.");
    }
    summaryLines.push(`Expected disease behavior: ${expectedBehavior}`);
    if (data.mddQuestion) {
      summaryLines.push(`MDD question: ${data.mddQuestion}`);
    }
    if (data.labNotes) {
      summaryLines.push(`Additional laboratory context: ${data.labNotes}`);
    }
    if (data.geneticNotes) {
      summaryLines.push(`Genetic notes: ${data.geneticNotes}`);
    }
    if (data.pathologyNotes) {
      summaryLines.push(`Pathology notes: ${data.pathologyNotes}`);
    }
    if (data.narrative) {
      summaryLines.push(`Additional context: ${data.narrative}`);
    }

    return summaryLines;
  }

  function buildExternalAiSummaryLines(data, signals) {
    const knownCtdLabel =
      {
        ssc: "systemic sclerosis",
        ra: "rheumatoid arthritis",
        iim: "idiopathic inflammatory myopathy",
        sjogren: "Sjögren disease",
        mctd: "mixed connective tissue disease",
        sle: "systemic lupus erythematosus",
        other: "other connective tissue disease",
      }[data.knownCtd] || null;

    const summaryLines = [];
    const smokingLabel =
      {
        never: "never-smoker",
        former: "former smoker",
        current: "current smoker",
        unknown: "smoking history unknown",
      }[data.smokingStatus] || null;
    const symptomBits = [
      signals.age !== null ? `${signals.age}-year-old ${data.sex || "patient"}` : "Patient",
      smokingLabel ? `${smokingLabel}${signals.packYears ? ` (${signals.packYears} pack-years)` : ""}` : null,
      data.symptomDuration ? `${formatMappedValue(data.symptomDuration, symptomTempoLabelMap, "tempo not entered")} symptom tempo` : null,
      data.coughPattern ? `${formatMappedValue(data.coughPattern, coughPatternLabelMap, "cough pattern not entered")} cough` : null,
      data.dyspneaScale ? `dyspnea burden around mMRC ${data.dyspneaScale}` : null,
      !unknown(data.weightLoss) ? `weight loss: ${formatPresence(data.weightLoss)}` : null,
      !unknown(data.fever) ? `systemic inflammatory symptoms: ${formatPresence(data.fever)}` : null,
    ].filter(Boolean);
    summaryLines.push(`Context: ${symptomBits.join(", ")}.`);

    summaryLines.push(
      signals.exposureLabels.length
        ? `Exposure history: positive for ${signals.exposureLabels.join(", ")}.`
        : "Exposure history: no convincing domestic or occupational antigen or toxic exposure identified from the completed structured screen."
    );
    if (data.exposureNotes) {
      summaryLines.push(`Exposure notes: ${data.exposureNotes}`);
    }

    const geneticBits = [];
    if (yes(data.familyPf)) geneticBits.push("family history of pulmonary fibrosis/ILD present");
    else if (no(data.familyPf)) geneticBits.push("no family history of pulmonary fibrosis/ILD entered");
    if (signals.trgPathogenic) geneticBits.push(`TRG testing shows pathogenic/likely pathogenic ${signals.trgGeneLabel} variant`);
    else if (signals.trgVus) geneticBits.push(`TRG testing shows ${signals.trgGeneLabel} variant of uncertain significance`);
    else if (data.trgTestingResult === "negative") geneticBits.push("TRG testing negative");
    else if (data.trgTestingResult === "not_tested") geneticBits.push("TRG testing not performed");
    if (signals.srgPathogenic) geneticBits.push(`SRG testing shows pathogenic/likely pathogenic ${signals.srgGeneLabel} variant`);
    else if (signals.srgVus) geneticBits.push(`SRG testing shows ${signals.srgGeneLabel} variant of uncertain significance`);
    else if (data.srgTestingResult === "negative") geneticBits.push("SRG testing negative");
    else if (data.srgTestingResult === "not_tested") geneticBits.push("SRG testing not performed");
    if (signals.telomereVeryShort) geneticBits.push("age-adjusted leukocyte telomere length <1st percentile");
    else if (signals.telomereShort) geneticBits.push(`age-adjusted leukocyte telomere length ${formatMappedValue(data.telomereLengthCategory, telomereLengthLabelMap)}`);
    else if (["p10_50", "gt50"].includes(data.telomereLengthCategory)) {
      geneticBits.push(`age-adjusted leukocyte telomere length ${formatMappedValue(data.telomereLengthCategory, telomereLengthLabelMap)}`);
    } else if (data.telomereLengthCategory === "not_tested") {
      geneticBits.push("age-adjusted leukocyte telomere length not tested");
    }
    if (yes(data.shortTelomereFeatures)) geneticBits.push("short telomere syndrome features present");
    else if (no(data.shortTelomereFeatures)) geneticBits.push("short telomere syndrome features not identified");
    summaryLines.push(
      geneticBits.length
        ? `Familial and genetic context: ${geneticBits.join(", ")}.`
        : "Familial and genetic context: no genetic data entered."
    );

    summaryLines.push(
      signals.medicationLabels.length
        ? `Medication and toxin history: concern for ${signals.medicationLabels.join(", ")}.`
        : "Medication and toxin history: no clear pneumotoxic medication or toxin signal documented."
    );
    if (data.medicationNotes) {
      summaryLines.push(`Medication and toxin notes: ${data.medicationNotes}`);
    }

    const autoimmuneBits = [];
    if (knownCtdLabel) autoimmuneBits.push(`known ${knownCtdLabel}`);
    if (signals.ctdFeatureLabels.length) autoimmuneBits.push(`clinical features including ${signals.ctdFeatureLabels.slice(0, 6).join(", ")}`);
    if (signals.anaMeaningful) autoimmuneBits.push(`ANA significance (${data.anaPattern}${signals.anaTiter ? ` 1:${signals.anaTiter}` : ""})`);
    if (positive(data.rfFlag)) autoimmuneBits.push("RF at least 2x ULN");
    if (positive(data.antiCcp)) autoimmuneBits.push("anti-CCP positive");
    if (positive(data.scl70)) autoimmuneBits.push("anti-Scl-70 positive");
    if (positive(data.ssa)) autoimmuneBits.push("SSA positive");
    if (positive(data.ssb)) autoimmuneBits.push("SSB positive");
    if (positive(data.jo1)) autoimmuneBits.push("anti-Jo-1 positive");
    if (positive(data.myositisPanel)) autoimmuneBits.push("extended myositis panel positive");
    if (yes(data.ckElevated)) autoimmuneBits.push("CK and/or aldolase elevated");
    if (yes(data.ferritinElevated)) autoimmuneBits.push("ferritin elevated");
    if (yes(data.esrCrpElevated)) autoimmuneBits.push("ESR/CRP elevated");
    if (yes(data.c3c4Low)) autoimmuneBits.push("low complement");
    if (positive(data.mpoAnca)) autoimmuneBits.push("MPO-ANCA positive");
    if (positive(data.pr3Anca)) autoimmuneBits.push("PR3-ANCA positive");
    summaryLines.push(
      autoimmuneBits.length
        ? `Autoimmune and laboratory context: ${autoimmuneBits.join(", ")}.`
        : "Autoimmune and laboratory context: no strong CTD or autoimmune serologic signal identified from current inputs."
    );

    const imagingBits = [
      `honeycombing: ${formatPresence(data.honeycombing)}`,
      `traction bronchiectasis: ${formatPresence(data.tractionBronchiectasis)}`,
      `ground-glass opacity extent: ${formatMappedValue(data.ggoExtent, hrctExtentLabelMap)}`,
      `consolidation extent: ${formatMappedValue(data.consolidationExtent, hrctExtentLabelMap)}`,
      `dominant distribution: ${formatMappedValue(data.distribution, distributionLabelMap)}`,
      `air trapping / mosaic attenuation: ${formatPresence(data.airTrapping)}`,
      `centrilobular nodules: ${formatPresence(data.centrilobularNodules)}`,
      `bilateral hilar and/or mediastinal adenopathy: ${formatPresence(data.bhlAdenopathy)}`,
      `perilymphatic nodules / sarcoid-type nodularity: ${formatPresence(data.perilymphaticNodules)}`,
      `thin-walled cysts: ${formatPresence(data.cysts)}`,
      `emphysema: ${formatPresence(data.emphysema)}`,
      `subpleural sparing: ${formatPresence(data.subpleuralSparing)}`,
      `fibrosis extent: ${formatMappedValue(data.fibrosisExtent, fibrosisExtentLabelMap)}`,
    ];
    if (signals.balLymphocytes !== null) imagingBits.push(`BAL lymphocytes: ${signals.balLymphocytes}%`);
    summaryLines.push(`HRCT and adjunct data: ${imagingBits.join("; ")}.`);

    summaryLines.push(buildPathologyProcessLine(data));
    const pathologyBits = [
      `well-formed non-necrotizing granulomas: ${formatPresence(data.nonnecrotizingGranulomas)}`,
      `airway-centered fibrosis: ${formatPresence(data.airwayCenteredFibrosis)}`,
      `minor lymphocytic bronchiolitis: ${formatPresence(data.minorLymphocyticBronchiolitis)}`,
      `poorly formed non-necrotizing granulomas: ${formatPresence(data.rareGiantCells)}`,
      `fibroblast foci: ${formatPresence(data.fibroblastFoci)}`,
      `organizing pneumonia / Masson bodies: ${formatPresence(data.organizingPneumoniaBodies)}`,
      `lymphoid follicles or plasma cell-rich infiltrate: ${formatPresence(data.lymphoidFollicles)}`,
      `extrapulmonary sarcoid-compatible features: ${formatPresence(data.sarcoidExtrapulmonary)}`,
      `alternative granulomatous causes reasonably excluded: ${formatPresence(data.granulomatousAlternativeExcluded)}`,
    ];
    if (!unknown(data.pathologyPattern)) {
      pathologyBits.unshift(`dominant histopathologic impression: ${formatMappedValue(data.pathologyPattern, pathologyPatternLabelMap)}`);
    }
    summaryLines.push(`Pathology findings: ${pathologyBits.join("; ")}.`);

    const progressionBits = [];
    const fvcDecline = parseNumber(data.fvcDecline);
    const dlcoDecline = parseNumber(data.dlcoDecline);
    if (fvcDecline !== null) progressionBits.push(`FVC decline over about 12 months: ${fvcDecline}% predicted`);
    if (dlcoDecline !== null) progressionBits.push(`DLCO decline over about 12 months: ${dlcoDecline}% predicted`);
    if (!unknown(data.symptomProgression)) progressionBits.push(`symptom progression within a year: ${formatPresence(data.symptomProgression)}`);
    if (!unknown(data.radiologyProgression)) progressionBits.push(`radiographic progression within a year: ${formatPresence(data.radiologyProgression)}`);
    if (!unknown(data.oxygenNeed)) progressionBits.push(`oxygen requirement: ${formatMappedValue(data.oxygenNeed, oxygenNeedLabelMap)}`);
    if (!unknown(data.sixMwtDesat)) progressionBits.push(`6MWT or exertional desaturation concern: ${formatPresence(data.sixMwtDesat)}`);
    summaryLines.push(
      progressionBits.length
        ? `Progression and severity context: ${progressionBits.join("; ")}.`
        : "Progression and severity context: no progression or baseline severity data entered."
    );

    if (data.mddQuestion) {
      summaryLines.push(`Primary MDD question: ${data.mddQuestion}`);
    }
    if (data.labNotes) {
      summaryLines.push(`Additional laboratory context: ${data.labNotes}`);
    }
    if (data.geneticNotes) {
      summaryLines.push(`Genetic notes: ${data.geneticNotes}`);
    }
    if (data.pathologyNotes) {
      summaryLines.push(`Pathology notes: ${data.pathologyNotes}`);
    }
    if (data.narrative) {
      summaryLines.push(`Additional narrative context: ${data.narrative}`);
    }

    return summaryLines;
  }

  function collectFormData() {
    const data = {};
    const fields = new FormData(form);
    for (const [key, value] of fields.entries()) {
      data[key] = typeof value === "string" ? value.trim() : value;
    }

    Object.keys(NUMERIC_FIELD_CONFIG).forEach((fieldName) => {
      const parsed = readNumericField(fieldName);
      setNumericFieldAlertState(fieldName, parsed.invalid);
      if (parsed.invalid) {
        data[fieldName] = "";
      }
    });

    return data;
  }

  function deriveUipCategory(data) {
    const keyDescriptorsKnown = ["distribution", "honeycombing", "tractionBronchiectasis", "ggoExtent", "consolidationExtent"].every(
      (field) => !unknown(data[field])
    );
    if (!keyDescriptorsKnown) {
      return {
        value: "unknown",
        explanation: "Enter distribution, fibrosis, and competing HRCT features to derive a UIP-family category.",
      };
    }

    const lowerSubpleural = data.distribution === "lower_subpleural";
    const alternativeFeatures = [
      data.distribution === "upper_mid",
      data.distribution === "peribronchovascular",
      yes(data.centrilobularNodules),
      yes(data.airTrapping),
      yes(data.cysts),
      yes(data.subpleuralSparing),
      yes(data.bhlAdenopathy),
      yes(data.perilymphaticNodules),
      ["moderate", "marked"].includes(data.consolidationExtent),
      data.ggoExtent === "marked" || (data.ggoExtent === "moderate" && !yes(data.honeycombing) && !yes(data.tractionBronchiectasis)),
    ].filter(Boolean);
    const fibrosisPresent =
      yes(data.honeycombing) ||
      yes(data.tractionBronchiectasis) ||
      ["10_19", "20_39", "40plus"].includes(data.fibrosisExtent);

    if (lowerSubpleural && yes(data.honeycombing) && alternativeFeatures.length === 0) {
      return {
        value: "uip",
        explanation: "Lower-lung subpleural fibrosis with honeycombing and no competing alternative-pattern features entered.",
      };
    }

    if (lowerSubpleural && yes(data.tractionBronchiectasis) && !yes(data.honeycombing) && alternativeFeatures.length === 0) {
      return {
        value: "probable_uip",
        explanation: "Lower-lung subpleural fibrotic pattern with traction bronchiectasis but without honeycombing or conflicting alternative-pattern features.",
      };
    }

    if (alternativeFeatures.length > 0) {
      return {
        value: "alternative",
        explanation: "Upper or peribronchovascular distribution, nodules, air-trapping, cysts, sarcoid-type features, or marked GGO/consolidation point away from a UIP-family HRCT label.",
      };
    }

    if (fibrosisPresent) {
      return {
        value: "indeterminate_uip",
        explanation: "Fibrotic HRCT abnormalities are present, but the entered descriptors do not cleanly meet UIP or probable UIP.",
      };
    }

    return {
      value: "unknown",
      explanation: "Current descriptors do not yet support a confident UIP-family category.",
    };
  }

  function deriveHpCategory(data, derivedUipCategoryValue) {
    const keyDescriptorsKnown = ["distribution", "airTrapping", "centrilobularNodules", "ggoExtent", "consolidationExtent"].every(
      (field) => !unknown(data[field])
    );
    if (!keyDescriptorsKnown) {
      return {
        value: "unknown",
        explanation: "Enter air-trapping, nodules, distribution, and fibrosis-related descriptors to derive an HP-family category.",
      };
    }

    const smallAirwayFeatures = yes(data.airTrapping) || yes(data.centrilobularNodules);
    const inflammatoryInfiltration =
      ["mild", "moderate", "marked"].includes(data.ggoExtent) ||
      ["mild", "moderate", "marked"].includes(data.consolidationExtent);
    const fibrosisPresent =
      yes(data.honeycombing) ||
      yes(data.tractionBronchiectasis) ||
      ["10_19", "20_39", "40plus"].includes(data.fibrosisExtent);
    const upperOrDiffuse = ["upper_mid", "diffuse"].includes(data.distribution);
    const compatibleDistribution = ["upper_mid", "diffuse", "peribronchovascular"].includes(data.distribution);
    const sarcoidLikeImaging = yes(data.bhlAdenopathy) || yes(data.perilymphaticNodules);

    if (fibrosisPresent) {
      if (smallAirwayFeatures && upperOrDiffuse && !sarcoidLikeImaging) {
        return {
          value: "typical_hp",
          explanation: "Fibrotic abnormalities plus air-trapping or centrilobular nodules in an upper or diffuse distribution fit a typical fibrotic HP pattern from the entered descriptors.",
        };
      }
      if (smallAirwayFeatures && !sarcoidLikeImaging) {
        return {
          value: "compatible_hp",
          explanation: "Fibrosis is present with additional small-airway features, which keeps fibrotic HP compatible even if the pattern is not classic.",
        };
      }
      if (!sarcoidLikeImaging && ["uip", "probable_uip", "indeterminate_uip", "alternative"].includes(derivedUipCategoryValue)) {
        return {
          value: "indeterminate_hp",
          explanation: "Fibrosis is present but the entered descriptors do not show enough small-airway support to classify the HRCT pattern as typical or compatible HP.",
        };
      }
      return {
        value: "not_hp",
        explanation: "The entered fibrotic descriptors do not currently provide meaningful HRCT support for HP.",
      };
    }

    if (smallAirwayFeatures && inflammatoryInfiltration && data.distribution === "diffuse" && !sarcoidLikeImaging) {
      return {
        value: "typical_hp",
        explanation: "Diffuse nonfibrotic infiltrative change plus small-airway features fits a typical nonfibrotic HP pattern from the entered descriptors.",
      };
    }

    if (!sarcoidLikeImaging && ((smallAirwayFeatures && compatibleDistribution) || (yes(data.cysts) && compatibleDistribution))) {
      return {
        value: "compatible_hp",
        explanation: "Nonfibrotic HRCT features are compatible with HP, but the entered pattern is not specific enough to call typical HP.",
      };
    }

    if (smallAirwayFeatures || inflammatoryInfiltration || yes(data.cysts)) {
      return {
        value: "indeterminate_hp",
        explanation: "Some HP-relevant descriptors are present, but the overall HRCT pattern remains indeterminate for HP from the current inputs.",
      };
    }

    return {
      value: "not_hp",
      explanation: "The entered HRCT descriptors are not suggestive of HP.",
    };
  }

  function deriveImagingCategories(data) {
    const uip = deriveUipCategory(data);
    const hp = deriveHpCategory(data, uip.value);
    return { uip, hp };
  }

  function syncDerivedImagingCategories(data) {
    const sourceData = data || collectFormData();
    const derived = deriveImagingCategories(sourceData);
    const uipField = form.elements.namedItem("uipCategory");
    const hpField = form.elements.namedItem("hpCategory");

    if (uipField) {
      uipField.value = derived.uip.value;
    }
    if (hpField) {
      hpField.value = derived.hp.value;
    }
    if (derivedUipCategory) {
      derivedUipCategory.textContent = formatCategoryLabel(derived.uip.value, uipCategoryLabelMap);
    }
    if (derivedUipExplanation) {
      derivedUipExplanation.textContent = derived.uip.explanation;
    }
    if (derivedHpCategory) {
      derivedHpCategory.textContent = formatCategoryLabel(derived.hp.value, hpCategoryLabelMap);
    }
    if (derivedHpExplanation) {
      derivedHpExplanation.textContent = derived.hp.explanation;
    }

    return derived;
  }

  function getFormData() {
    const data = collectFormData();
    const derived = deriveImagingCategories(data);
    data.uipCategory = derived.uip.value;
    data.hpCategory = derived.hp.value;
    return data;
  }

  function resetFormToDefaults() {
    form.reset();
    applyDefaultNegatives();
    applyBaselineDefaults(true);
    syncDerivedImagingCategories();
    refreshNumericFieldAlerts();
  }

  function fillForm(values) {
    resetFormToDefaults();
    const elements = Array.from(form.elements).filter((element) => element.name);
    for (const element of elements) {
      element.value = values[element.name] || "";
    }
    applyDefaultNegatives();
    applyBaselineDefaults();
    syncDerivedImagingCategories();
    refreshNumericFieldAlerts();
  }

  function clearPersistedState() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn("Unable to clear saved ILD state.", error);
    }
  }

  function clearRenderedState() {
    primaryDiagnosis.innerHTML = "<h2>Awaiting structured assessment</h2><p>Complete the form or load a sample case, then run the ILD assessment to generate a working diagnosis and MDD-ready summary.</p>";
    completenessScore.textContent = "0%";
    completenessBar.style.width = "0%";
    missingItems.innerHTML = "";
    nextSteps.innerHTML = "";
    overlayList.innerHTML = "";
    differentialList.innerHTML = "";
    noteOutput.value = "";
    openEvidencePromptOutput.value = "";
  }

  function calculateCompleteness(data) {
    const serologyComplete =
      !unknown(data.anaPattern) ||
      parseNumber(data.anaTiter) !== null ||
      ["antiCcp", "scl70", "ssa", "ssb", "jo1", "myositisPanel", "mpoAnca", "pr3Anca"].some(
        (field) => !unknown(data[field])
      );

    const imagingComplete =
      !unknown(data.uipCategory) &&
      !unknown(data.hpCategory) &&
      anyKnown(data, [
        "honeycombing",
        "tractionBronchiectasis",
        "ggoExtent",
        "consolidationExtent",
        "distribution",
        "airTrapping",
        "centrilobularNodules",
      ]);

    const groups = [
      {
        label: "Age and baseline demographics",
        complete: parseNumber(data.age) !== null && !unknown(data.sex),
      },
      {
        label: "Smoking history",
        complete:
          !unknown(data.smokingStatus) &&
          (data.smokingStatus === "never" || parseNumber(data.packYears) !== null),
      },
      {
        label: "Core domestic exposure screen",
        complete: anyKnown(data, homeExposureFields),
      },
      {
        label: "Core occupational exposure screen",
        complete: anyKnown(data, occupationalExposureFields),
      },
      {
        label: "Medication and toxin screen",
        complete: anyKnown(data, medicationFields),
      },
      {
        label: "CTD symptom screen",
        complete: anyKnown(data, ctdScreenFields),
      },
      {
        label: "Core autoimmune serologies",
        complete: serologyComplete,
      },
      {
        label: "Structured HRCT pattern entry",
        complete: imagingComplete,
      },
    ];

    const completeCount = groups.filter((group) => group.complete).length;
    return {
      score: Math.round((completeCount / groups.length) * 100),
      missing: groups.filter((group) => !group.complete).map((group) => group.label),
    };
  }

  function deriveSignals(data) {
    const age = parseNumber(data.age);
    const packYears = parseNumber(data.packYears) || 0;
    const anaTiter = parseNumber(data.anaTiter) || 0;
    const balLymphocytes = parseNumber(data.balLymphocytes);
    const fvcDecline = parseNumber(data.fvcDecline) || 0;
    const dlcoDecline = parseNumber(data.dlcoDecline) || 0;
    const hpExposureLabels = collectPositiveLabels(data, [
      "birdExposure",
      "moldExposure",
      "waterDamage",
      "humidifierExposure",
      "hotTubExposure",
      "farmExposure",
      "woodExposure",
    ]);
    const exposureLabels = collectPositiveLabels(data, [...homeExposureFields, ...occupationalExposureFields]);
    const medicationLabels = collectPositiveLabels(data, medicationFields);
    const ctdFeatureLabels = collectPositiveLabels(data, ctdScreenFields);
    const hpPathologyLabels = collectPositiveLabels(data, hpPathologyFields);
    const sarcoidPresentationLabels = collectPositiveLabels(data, sarcoidPresentationFields);
    const fibroticSignals =
      yes(data.honeycombing) ||
      yes(data.tractionBronchiectasis) ||
      ["20_39", "40plus"].includes(data.fibrosisExtent);
    const inflammatoryImaging =
      ["moderate", "marked"].includes(data.ggoExtent) || ["moderate", "marked"].includes(data.consolidationExtent);
    const anaMeaningful =
      (["nucleolar", "centromere"].includes(data.anaPattern) && data.anaPattern !== "negative") ||
      (anaTiter >= 320 && ["speckled", "homogeneous", "diffuse"].includes(data.anaPattern));
    const serologyCount = [
      positive(data.antiCcp),
      positive(data.scl70),
      positive(data.ssa),
      positive(data.ssb),
      positive(data.jo1),
      positive(data.myositisPanel),
      positive(data.mpoAnca),
      positive(data.pr3Anca),
      anaMeaningful,
      positive(data.rfFlag),
    ].filter(Boolean).length;
    const ctdClinicalCount = ctdFeatureLabels.length;
    const knownSpecificCtd = !["", "unknown", "none"].includes(data.knownCtd);
    const ctdStrong = knownSpecificCtd || serologyCount >= 2 || (ctdClinicalCount >= 2 && (anaMeaningful || serologyCount >= 1));
    const drugSignal = medicationLabels.length > 0;
    const hpExposureLikely = hpExposureLabels.length > 0;
    const pathologyAvailable = pathologySampled(data);
    const pathologyWorkflowReviewed = yes(data.pathologyThoracicReview) || yes(data.pathologyMddCorrelation);
    const hpPatternPathology = data.pathologyPattern === "hp_like";
    const uipPatternPathology = data.pathologyPattern === "uip_like";
    const nsipPatternPathology = ["fibrotic_nsip_like", "cellular_nsip_like"].includes(data.pathologyPattern);
    const opPatternPathology = data.pathologyPattern === "op_like";
    const sarcoidPatternPathology = data.pathologyPattern === "sarcoid_like";
    const lymphoidPatternPathology = data.pathologyPattern === "lip_like";
    const hpPathologySupport = hpPathologyLabels.length > 0 || hpPatternPathology;
    const trgPathogenic = data.trgTestingResult === "pathogenic";
    const trgVus = data.trgTestingResult === "vus";
    const srgPathogenic = data.srgTestingResult === "pathogenic";
    const srgVus = data.srgTestingResult === "vus";
    const telomereVeryShort = data.telomereLengthCategory === "lt1";
    const telomereShort = ["lt1", "p1_10"].includes(data.telomereLengthCategory);
    const geneticEvaluationDocumented =
      !unknown(data.familyPf) ||
      !unknown(data.trgTestingResult) ||
      !unknown(data.srgTestingResult) ||
      !unknown(data.telomereLengthCategory) ||
      !unknown(data.shortTelomereFeatures);
    const geneticEtiologyLikely = trgPathogenic || srgPathogenic;
    const hereditaryFibrosisContext =
      yes(data.familyPf) || geneticEtiologyLikely || telomereShort || yes(data.shortTelomereFeatures);
    const telomereSyndromeContext = trgPathogenic || telomereShort || yes(data.shortTelomereFeatures);
    const trgGeneLabel = formatMappedValue(data.trgGene, trgGeneLabelMap, "TRG");
    const srgGeneLabel = formatMappedValue(data.srgGene, srgGeneLabelMap, "SRG");
    const lungCancerSurveillanceGene = srgPathogenic && ["sftpa1", "sftpa2"].includes(data.srgGene);
    const sarcoidCompatiblePresentation =
      sarcoidPresentationLabels.length > 0 ||
      (data.distribution === "upper_mid" && (yes(data.bhlAdenopathy) || yes(data.nonnecrotizingGranulomas)));
    const iimFerritinRisk =
      yes(data.ferritinElevated) &&
      (data.knownCtd === "iim" || positive(data.myositisPanel) || positive(data.jo1) || yes(data.mechanicHands));
    const ppfCriteriaCount = [
      yes(data.symptomProgression),
      yes(data.radiologyProgression),
      fvcDecline >= 5 || dlcoDecline >= 10,
    ].filter(Boolean).length;

    return {
      age,
      packYears,
      anaTiter,
      balLymphocytes,
      fvcDecline,
      dlcoDecline,
      exposureLabels,
      hpExposureLabels,
      hpPathologyLabels,
      sarcoidPresentationLabels,
      medicationLabels,
      ctdFeatureLabels,
      pathologyAvailable,
      pathologyWorkflowReviewed,
      hpPatternPathology,
      uipPatternPathology,
      nsipPatternPathology,
      opPatternPathology,
      sarcoidPatternPathology,
      lymphoidPatternPathology,
      fibroticSignals,
      inflammatoryImaging,
      anaMeaningful,
      serologyCount,
      ctdClinicalCount,
      ctdStrong,
      knownSpecificCtd,
      drugSignal,
      hpExposureLikely,
      hpPathologySupport,
      trgPathogenic,
      trgVus,
      srgPathogenic,
      srgVus,
      telomereVeryShort,
      telomereShort,
      geneticEvaluationDocumented,
      geneticEtiologyLikely,
      hereditaryFibrosisContext,
      telomereSyndromeContext,
      trgGeneLabel,
      srgGeneLabel,
      lungCancerSurveillanceGene,
      sarcoidCompatiblePresentation,
      iimFerritinRisk,
      ppfCriteriaCount,
      ppfOverlay: ppfCriteriaCount >= 2,
    };
  }

  function makeCandidate(key, label) {
    let score = 0;
    const reasons = [];

    function add(condition, points, reason) {
      if (condition) {
        score += points;
        reasons.push({ points, reason });
      }
    }

    function subtract(condition, points) {
      if (condition) {
        score -= points;
      }
    }

    return {
      add,
      subtract,
      done(extra) {
        return {
          key,
          label,
          score,
          reasons: reasons
            .sort((a, b) => b.points - a.points)
            .slice(0, 4)
            .map((item) => item.reason),
          ...extra,
        };
      },
    };
  }

  // Transparent rule-plus-score engine so clinicians can inspect why a branch rose or fell.
  function buildCandidates(data, signals, completeness) {
    const causeExclusionStructured =
      anyKnown(data, homeExposureFields) &&
      anyKnown(data, occupationalExposureFields) &&
      anyKnown(data, medicationFields) &&
      anyKnown(data, ctdScreenFields) &&
      (!unknown(data.anaPattern) || signals.serologyCount > 0 || signals.anaTiter > 0);
    const noKnownCause =
      causeExclusionStructured && !signals.hpExposureLikely && !signals.drugSignal && !signals.ctdStrong;
    const upperMidPattern = data.distribution === "upper_mid";
    const lowerSubpleuralPattern = data.distribution === "lower_subpleural";
    const opMorphology =
      ["moderate", "marked"].includes(data.consolidationExtent) ||
      (data.consolidationExtent === "mild" && data.ggoExtent === "moderate");
    const nsipMorphology =
      yes(data.subpleuralSparing) || (["moderate", "marked"].includes(data.ggoExtent) && yes(data.tractionBronchiectasis));
    const smokingHeavy = signals.packYears >= 20 || (signals.packYears > 10 && data.smokingStatus === "current");
    const allExposureScreenNegative = [...homeExposureFields, ...occupationalExposureFields].every((field) =>
      no(data[field])
    );

    const hp = makeCandidate(
      "hp",
      signals.fibroticSignals ? "Fibrotic hypersensitivity pneumonitis" : "Hypersensitivity pneumonitis"
    );
    hp.add(signals.hpExposureLikely, 4.5, `Exposure signal present: ${signals.hpExposureLabels.join(", ")}.`);
    hp.add(data.hpCategory === "typical_hp", 5.5, "HRCT category is typical for hypersensitivity pneumonitis.");
    hp.add(data.hpCategory === "compatible_hp", 3.5, "HRCT category is compatible with hypersensitivity pneumonitis.");
    hp.add(yes(data.airTrapping), 2, "Air trapping / mosaic attenuation supports a small-airway HP phenotype.");
    hp.add(yes(data.centrilobularNodules), 1.5, "Centrilobular nodules reinforce the HP branch.");
    hp.add(signals.hpPatternPathology, 2.6, "Dominant histopathologic impression is bronchiolocentric / HP-like.");
    hp.add(
      signals.hpPathologyLabels.length > 0,
      3.3,
      `Pathology features compatible with HP are present: ${signals.hpPathologyLabels.join(", ")}.`
    );
    hp.add(
      signals.hpExposureLikely && (yes(data.airTrapping) || signals.hpPathologySupport),
      2.4,
      "Exposure history plus small-airway HRCT findings or HP-compatible pathology aligns with current HP diagnostic framing."
    );
    hp.add(signals.balLymphocytes !== null && signals.balLymphocytes >= 30, 4, `BAL lymphocytosis (${signals.balLymphocytes}%) is strongly supportive.`);
    hp.subtract(signals.ctdStrong, 1.8);
    hp.subtract(signals.drugSignal, 1.2);
    hp.subtract(allExposureScreenNegative, 1.4);
    const hpHighConfidence =
      signals.hpExposureLikely &&
      (signals.hpPathologySupport ||
        (data.hpCategory === "typical_hp" &&
          (yes(data.airTrapping) ||
            yes(data.centrilobularNodules) ||
            (signals.balLymphocytes !== null && signals.balLymphocytes >= 30))));
    if (hpHighConfidence) {
      hp.add(
        true,
        4,
        signals.hpPathologySupport
          ? "Exposure history plus HP-compatible biopsy findings strongly support hypersensitivity pneumonitis."
          : "Exposure history plus typical HP imaging and small-airway support strongly favor hypersensitivity pneumonitis."
      );
    }

    const ipf = makeCandidate("ipf", "Idiopathic pulmonary fibrosis (IPF)");
    ipf.add(noKnownCause, 3.6, "No convincing exposure, CTD, or drug driver is documented from the completed screen.");
    ipf.add(data.uipCategory === "uip", 5.5, "HRCT is categorized as UIP.");
    ipf.add(data.uipCategory === "probable_uip", 3.8, "HRCT is categorized as probable UIP.");
    ipf.add(signals.uipPatternPathology, 2.8, "Dominant histopathologic impression is UIP-like.");
    ipf.add(yes(data.honeycombing), 2.2, "Honeycombing strengthens a UIP-family diagnosis.");
    ipf.add(yes(data.tractionBronchiectasis), 1.4, "Traction bronchiectasis supports fibrotic UIP-family disease.");
    ipf.add(yes(data.fibroblastFoci), 2.2, "Fibroblast foci support a UIP-family fibrotic process.");
    ipf.add(signals.age !== null && signals.age >= 60, 1.6, "Older age raises pre-test probability for IPF.");
    ipf.add(data.sex === "male", 0.4, "Male sex modestly increases IPF pre-test probability.");
    ipf.add(data.smokingStatus === "former" || data.smokingStatus === "current", 0.5, "Smoking history is compatible with IPF risk.");
    ipf.add(
      signals.geneticEtiologyLikely && noKnownCause,
      2.2,
      "Pathogenic TRG/SRG findings raise concern for a familial or genetically mediated fibrotic ILD with UIP-family phenotype."
    );
    ipf.add(yes(data.familyPf) && noKnownCause, 1.2, "Family history of pulmonary fibrosis raises concern for familial pulmonary fibrosis.");
    ipf.subtract(signals.hpExposureLikely, 3.4);
    ipf.subtract(signals.ctdStrong, 4.2);
    ipf.subtract(signals.drugSignal, 3.1);
    ipf.subtract(!causeExclusionStructured, 2.4);
    ipf.subtract(data.hpCategory === "typical_hp" || data.hpCategory === "compatible_hp", 1.8);
    ipf.subtract(opMorphology, 1.4);
    ipf.subtract(yes(data.cysts), 1.3);
    const ipfHighConfidence = noKnownCause && data.uipCategory === "uip" && completeness.score >= 70;
    if (ipfHighConfidence) {
      ipf.add(true, 2.5, "Idiopathic fibrotic ILD with UIP-family HRCT pattern is favored after exclusion of known causes.");
    }

    const ssc = makeCandidate("ssc_ild", "CTD-ILD, systemic sclerosis phenotype");
    ssc.add(data.knownCtd === "ssc", 4.2, "Known systemic sclerosis is already documented.");
    ssc.add(yes(data.raynaud), 2.2, "Raynaud phenomenon supports a scleroderma-spectrum phenotype.");
    ssc.add(yes(data.skinThickening), 3.2, "Skin thickening / sclerodactyly is a high-value systemic sclerosis signal.");
    ssc.add(yes(data.reflux) || yes(data.dysphagia), 1.2, "Esophageal involvement fits systemic sclerosis-associated ILD.");
    ssc.add(positive(data.scl70), 3.1, "Anti-Scl-70 positivity strongly supports systemic sclerosis-associated ILD.");
    ssc.add(["nucleolar", "centromere"].includes(data.anaPattern), 2.3, "ANA pattern is strongly CTD-signalling.");
    ssc.add(nsipMorphology, 1.4, "NSIP-leaning HRCT morphology is compatible with CTD-ILD.");
    ssc.add(signals.nsipPatternPathology, 1.2, "NSIP-like pathology is compatible with systemic sclerosis-associated ILD.");
    ssc.add(yes(data.lymphoidFollicles), 0.8, "Lymphoid follicles or plasma cell-rich infiltrate can support CTD-ILD.");
    ssc.subtract(signals.hpExposureLikely, 1.6);

    const ra = makeCandidate("ra_ild", "CTD-ILD, rheumatoid arthritis phenotype");
    ra.add(data.knownCtd === "ra", 4, "Known rheumatoid arthritis is documented.");
    ra.add(yes(data.inflammatoryArthritis), 2.5, "Inflammatory arthritis is present.");
    ra.add(positive(data.rfFlag), 2.2, "Rheumatoid factor is significantly elevated.");
    ra.add(positive(data.antiCcp), 2.5, "Anti-CCP positivity supports RA-associated ILD.");
    ra.add(data.uipCategory === "uip" || data.uipCategory === "probable_uip", 1.4, "UIP-family HRCT pattern is common in RA-ILD.");
    ra.add(signals.uipPatternPathology, 1.2, "UIP-like pathology is compatible with RA-ILD.");
    ra.add(yes(data.lymphoidFollicles), 0.8, "Lymphoid follicles or plasma cell-rich infiltrate can support CTD-associated ILD.");
    ra.add(signals.age !== null && signals.age >= 60, 0.8, "Older age fits RA-ILD risk framing.");

    const myositis = makeCandidate("myositis_ild", "CTD-ILD, antisynthetase or myositis phenotype");
    myositis.add(data.knownCtd === "iim", 4, "Known idiopathic inflammatory myopathy is documented.");
    myositis.add(yes(data.mechanicHands), 3, "Mechanic hands are a high-yield antisynthetase clue.");
    myositis.add(yes(data.muscleWeakness), 2.3, "Proximal muscle weakness supports myositis-spectrum disease.");
    myositis.add(positive(data.jo1), 4.2, "Anti-Jo-1 positivity strongly supports antisynthetase syndrome.");
    myositis.add(positive(data.myositisPanel), 3, "A positive myositis panel raises confidence in myositis-associated ILD.");
    myositis.add(yes(data.ckElevated), 1.6, "CK and/or aldolase elevation supports muscle involvement.");
    myositis.add(signals.iimFerritinRisk, 1.8, "Ferritin elevation in an IIM phenotype is a higher-risk feature and supports urgent myositis-spectrum evaluation.");
    myositis.add(opMorphology || nsipMorphology, 1.5, "NSIP / organizing pneumonia overlap morphology fits myositis-associated ILD.");
    myositis.add(signals.nsipPatternPathology || signals.opPatternPathology, 1.5, "NSIP-like or organizing-pneumonia-like pathology is compatible with myositis-associated ILD.");
    myositis.add(yes(data.organizingPneumoniaBodies), 1.2, "Organizing pneumonia / Masson bodies support an inflammatory overlap phenotype.");
    myositis.subtract(signals.hpExposureLikely, 1.5);

    const sjogren = makeCandidate("sjogren_lip", "CTD-ILD, Sjögren or LIP-spectrum phenotype");
    sjogren.add(data.knownCtd === "sjogren", 4, "Known Sjögren disease is documented.");
    sjogren.add(yes(data.sicca), 2.5, "Sicca symptoms raise concern for Sjögren-associated disease.");
    sjogren.add(positive(data.ssa), 2.6, "SSA positivity supports Sjögren-spectrum disease.");
    sjogren.add(positive(data.ssb), 1.8, "SSB positivity supports Sjögren-spectrum disease.");
    sjogren.add(yes(data.cysts), 2.3, "Cysts on HRCT support a LIP-spectrum differential.");
    sjogren.add(["mild", "moderate", "marked"].includes(data.ggoExtent), 1, "Ground-glass opacity is compatible with LIP-spectrum disease.");
    sjogren.add(
      signals.lymphoidPatternPathology || yes(data.lymphoidFollicles),
      2.6,
      "Lymphoid-pattern pathology or lymphoid follicles support a Sjögren/LIP-spectrum differential."
    );

    const sarcoid = makeCandidate("sarcoidosis", "Sarcoidosis");
    sarcoid.add(yes(data.nonnecrotizingGranulomas), 5.2, "Well-formed non-necrotizing granulomas are documented.");
    sarcoid.add(signals.sarcoidPatternPathology, 2.8, "Dominant histopathologic impression is sarcoid-like.");
    sarcoid.add(
      yes(data.bhlAdenopathy),
      3.3,
      "Bilateral hilar and/or mediastinal adenopathy supports a sarcoid-pattern thoracic presentation."
    );
    sarcoid.add(yes(data.perilymphaticNodules), 3, "Perilymphatic nodularity is compatible with pulmonary sarcoidosis.");
    sarcoid.add(yes(data.sarcoidExtrapulmonary), 2.6, "Extrapulmonary sarcoid-compatible features support multisystem disease.");
    sarcoid.add(
      yes(data.granulomatousAlternativeExcluded),
      3.8,
      "Alternative granulomatous causes are documented as reasonably excluded."
    );
    sarcoid.add(upperMidPattern, 0.8, "Upper or mid-lung predominance can fit pulmonary sarcoidosis.");
    sarcoid.subtract(signals.hpExposureLikely, 2.2);
    sarcoid.subtract(signals.hpPathologySupport, 1.2);
    sarcoid.subtract(data.hpCategory === "typical_hp", 2.4);
    sarcoid.subtract(data.uipCategory === "uip" || data.uipCategory === "probable_uip", 1.8);
    sarcoid.subtract(signals.drugSignal, 0.9);
    const sarcoidHighConfidence =
      signals.sarcoidCompatiblePresentation &&
      yes(data.nonnecrotizingGranulomas) &&
      yes(data.granulomatousAlternativeExcluded);
    if (sarcoidHighConfidence) {
      sarcoid.add(
        true,
        4.2,
        "Compatible presentation, non-necrotizing granulomatous inflammation, and exclusion of alternative causes all align with sarcoidosis."
      );
    }

    const ipaf = makeCandidate("ipaf", "Autoimmune-featured ILD / IPAF");
    ipaf.add(signals.ctdClinicalCount >= 2, 2.4, "Multiple autoimmune clinical features are present.");
    ipaf.add(signals.anaMeaningful, 2.5, "ANA pattern or titer meets an IPAF-style autoimmune signal threshold.");
    ipaf.add(signals.serologyCount >= 1, 2, "Autoimmune serology signal is present.");
    ipaf.add(nsipMorphology || opMorphology, 1.2, "Morphology is compatible with autoimmune-featured ILD.");
    ipaf.add(yes(data.lymphoidFollicles), 1, "Lymphoid follicles or plasma cell-rich infiltrate can support an autoimmune-featured ILD discussion.");
    ipaf.add(data.knownCtd === "unknown" || data.knownCtd === "", 0.4, "Formal rheumatologic classification is not fully established in the intake.");
    ipaf.subtract(signals.hpExposureLikely, 1.3);

    const anca = makeCandidate("anca_ild", "ANCA-associated vasculitis-risk ILD");
    anca.add(positive(data.mpoAnca), 4.4, "MPO-ANCA positivity is a major vasculitis-risk signal.");
    anca.add(positive(data.pr3Anca), 3.8, "PR3-ANCA positivity is a vasculitis-risk signal.");
    anca.add(yes(data.hematuria), 2.3, "Hematuria raises concern for systemic vasculitis involvement.");
    anca.add(yes(data.fever) || yes(data.weightLoss), 1.1, "Constitutional symptoms increase concern for systemic inflammatory disease.");
    anca.add(data.uipCategory === "uip" || data.uipCategory === "probable_uip", 1.4, "UIP-family fibrosis can coexist with ANCA-associated disease.");

    const drug = makeCandidate("drug_ild", "Drug-induced interstitial lung disease");
    drug.add(signals.drugSignal, 3.2, `Potential pneumotoxic medication signal: ${signals.medicationLabels.join(", ")}.`);
    drug.add(opMorphology, 1.8, "Consolidation / OP-like morphology can fit drug-related ILD.");
    drug.add(["moderate", "marked"].includes(data.ggoExtent), 1, "Ground-glass opacity can fit drug-related lung injury.");
    drug.add(data.symptomDuration === "subacute" || data.symptomDuration === "acute", 0.8, "A more acute or subacute tempo can fit drug-induced ILD.");

    const op = makeCandidate("op", "Organizing pneumonia spectrum");
    op.add(opMorphology, 3.1, "Consolidation-predominant morphology raises an organizing pneumonia differential.");
    op.add(data.symptomDuration === "acute" || data.symptomDuration === "subacute", 1.4, "Acute or subacute tempo supports an OP-spectrum process.");
    op.add(yes(data.fever) || yes(data.weightLoss), 0.8, "Systemic symptoms can accompany secondary OP.");
    op.add(["peribronchovascular", "diffuse"].includes(data.distribution), 0.8, "Distribution can be compatible with OP.");
    op.add(
      signals.opPatternPathology || yes(data.organizingPneumoniaBodies),
      2.8,
      "Pathology showing organizing pneumonia / Masson bodies supports an organizing pneumonia spectrum diagnosis."
    );

    const smokingRelated = makeCandidate("smoking_ild", "Smoking-related interstitial lung disease");
    smokingRelated.add(smokingHeavy, 3, "Smoking burden is high enough to support smoking-related ILD.");
    smokingRelated.add(yes(data.emphysema), 1.6, "Emphysema reinforces a smoking-related process.");
    smokingRelated.add(yes(data.centrilobularNodules), 1.4, "Centrilobular nodules can fit RB-ILD.");
    smokingRelated.add(["mild", "moderate"].includes(data.ggoExtent), 1, "Ground-glass opacity can fit DIP or RB-ILD.");
    smokingRelated.subtract(signals.ctdStrong, 1.5);

    const idiopathicNsip = makeCandidate("idiopathic_nsip", "Idiopathic NSIP");
    idiopathicNsip.add(noKnownCause, 2.2, "No convincing exposure, CTD, or drug trigger is evident.");
    idiopathicNsip.add(nsipMorphology, 3.2, "Subpleural sparing / GGO plus traction bronchiectasis supports an NSIP pattern.");
    idiopathicNsip.add(signals.nsipPatternPathology, 2.4, "Dominant histopathologic impression is NSIP-like.");
    idiopathicNsip.add(data.uipCategory === "indeterminate_uip" || data.uipCategory === "alternative", 0.8, "Non-UIP HRCT pattern leaves NSIP on the table.");
    idiopathicNsip.subtract(signals.ctdStrong, 3);
    idiopathicNsip.subtract(signals.hpExposureLikely, 2.2);
    idiopathicNsip.subtract(signals.drugSignal, 2);

    const unclassifiable = makeCandidate("unclassifiable", "Unclassifiable ILD / broad differential");
    unclassifiable.add(completeness.score < 70, 3.4, "Structured data are incomplete enough to limit narrow classification.");
    unclassifiable.add(!causeExclusionStructured, 1.8, "Known-cause exclusion screens are not yet complete enough to safely narrow the differential.");
    unclassifiable.add(!hpHighConfidence && !ipfHighConfidence && completeness.score < 85, 1.5, "No hard-gated high-confidence branch is met from the current intake.");
    unclassifiable.add(signals.ctdStrong && signals.hpExposureLikely, 0.8, "Competing etiologic signals increase the need for MDD synthesis.");
    unclassifiable.add(signals.geneticEtiologyLikely && !noKnownCause, 0.8, "Pathogenic genetic findings can coexist with multiple fibrotic ILD phenotypes and may not fit a single conventional silo.");
    unclassifiable.add(data.narrative.length > 0, 0.2, "Narrative context exists but the structured answer remains mixed.");

    return [
      hp.done({ hardGate: hpHighConfidence, certaintyHint: hpHighConfidence ? "high" : "moderate" }),
      ipf.done({ hardGate: ipfHighConfidence, certaintyHint: ipfHighConfidence ? "high" : "moderate" }),
      ssc.done({ certaintyHint: "moderate" }),
      ra.done({ certaintyHint: "moderate" }),
      myositis.done({ certaintyHint: "moderate" }),
      sjogren.done({ certaintyHint: "moderate" }),
      sarcoid.done({ hardGate: sarcoidHighConfidence, certaintyHint: sarcoidHighConfidence ? "high" : "moderate" }),
      ipaf.done({ certaintyHint: "moderate" }),
      anca.done({ certaintyHint: "moderate" }),
      drug.done({ certaintyHint: "low" }),
      op.done({ certaintyHint: "low" }),
      smokingRelated.done({ certaintyHint: "low" }),
      idiopathicNsip.done({ certaintyHint: "low" }),
      unclassifiable.done({ certaintyHint: "low" }),
    ];
  }

  function finalizeProbabilities(candidates) {
    const probabilities = softmax(
      candidates.map((candidate) => Math.max(candidate.score, -1.5)),
      2.3
    );
    return candidates
      .map((candidate, index) => ({
        ...candidate,
        probability: probabilities[index],
      }))
      .sort((a, b) => b.probability - a.probability);
  }

  function determineCertainty(primary, completeness, signals) {
    if (primary.hardGate) {
      return "High";
    }
    if (completeness.score < 60) {
      return "Low";
    }
    if (signals.geneticEtiologyLikely && signals.fibroticSignals && primary.probability >= 0.35) {
      return "Moderate";
    }
    if (primary.probability >= 0.55 && primary.reasons.length >= 3) {
      return "Moderate";
    }
    if (signals.ctdStrong && primary.key.includes("ild")) {
      return "Moderate";
    }
    return primary.probability >= 0.4 ? "Moderate" : "Low";
  }

  function buildOverlays(primary, completeness, signals) {
    const overlays = [];
    if (primary.hardGate && primary.key === "hp") {
      overlays.push({ label: "Criteria-aligned HP branch favored", warn: false });
    }
    if (primary.hardGate && primary.key === "ipf") {
      overlays.push({ label: "UIP-family idiopathic branch favored", warn: false });
    }
    if (primary.hardGate && primary.key === "sarcoidosis") {
      overlays.push({ label: "Sarcoidosis criteria-aligned branch favored", warn: false });
    }
    if (signals.hpPathologySupport) {
      overlays.push({ label: "HP-compatible pathology features", warn: false });
    }
    if (signals.hereditaryFibrosisContext) {
      overlays.push({ label: "Familial or genetic fibrosis context", warn: false });
    }
    if (signals.trgPathogenic) {
      overlays.push({ label: `Pathogenic TRG variant (${signals.trgGeneLabel})`, warn: true });
    }
    if (signals.srgPathogenic) {
      overlays.push({ label: `Pathogenic SRG variant (${signals.srgGeneLabel})`, warn: true });
    }
    if (signals.telomereVeryShort) {
      overlays.push({ label: "Very short telomere length", warn: true });
    }
    if (signals.ctdStrong) {
      overlays.push({ label: "Autoimmune signal present", warn: false });
    }
    if (signals.drugSignal) {
      overlays.push({ label: "Drug or toxin signal", warn: true });
    }
    if (signals.ppfOverlay) {
      overlays.push({ label: "Possible PPF overlay", warn: true });
    }
    if (signals.iimFerritinRisk) {
      overlays.push({ label: "Elevated ferritin: higher-risk IIM signal", warn: true });
    }
    if (completeness.score < 70) {
      overlays.push({ label: "Incomplete structured data", warn: true });
    }
    if (!primary.hardGate) {
      overlays.push({ label: "MDD recommended", warn: false });
    }
    return overlays;
  }

  function buildNextSteps(data, completeness, primary, differentials, signals) {
    const steps = [];
    const plausibleDifferentials = differentials.filter(
      (candidate) => candidate.probability >= PRINTABLE_DIFFERENTIAL_THRESHOLD
    );
    const hasPhysiologyContext =
      parseNumber(data.fvcDecline) !== null ||
      parseNumber(data.dlcoDecline) !== null ||
      !unknown(data.oxygenNeed) ||
      !unknown(data.sixMwtDesat);
    const hasHrctSeverityContext = ["fibrosisExtent", "distribution", "honeycombing", "tractionBronchiectasis"].every(
      (field) => !unknown(data[field])
    );
    const geneticTestingMissingDespiteRisk =
      (yes(data.familyPf) || yes(data.shortTelomereFeatures) || signals.telomereVeryShort) &&
      !signals.trgPathogenic &&
      !signals.srgPathogenic &&
      ["", "not_tested", "unknown"].includes(data.trgTestingResult) &&
      ["", "not_tested", "unknown"].includes(data.srgTestingResult);

    completeness.missing.forEach((item) => {
      pushUnique(steps, `Complete missing required input group: ${item}.`);
    });

    if (geneticTestingMissingDespiteRisk) {
      pushUnique(
        steps,
        "Given the familial or short-telomere signal, consider genetics referral/counseling and TRG/SRG testing rather than treating this as purely sporadic disease."
      );
    }

    if ((data.hpCategory === "typical_hp" || data.hpCategory === "compatible_hp") && !signals.hpExposureLikely) {
      pushUnique(steps, "Re-open the antigen history, especially birds, mold, water damage, humidifier, hot tub, and hobby exposures.");
    }

    if (
      (data.hpCategory === "typical_hp" || data.hpCategory === "compatible_hp") &&
      signals.balLymphocytes === null &&
      !primary.hardGate
    ) {
      pushUnique(steps, "Consider BAL lymphocyte differential if the HP branch remains clinically plausible and the result would change management.");
    }

    if ((primary.key === "ipf" || plausibleDifferentials.some((item) => item.key === "ipf")) && !anyKnown(data, ["anaPattern", "antiCcp", "scl70", "ssa", "ssb", "jo1", "mpoAnca", "pr3Anca"])) {
      pushUnique(steps, "Complete baseline CTD serologies before locking in an idiopathic label.");
    }

    if (signals.hpPathologySupport && !signals.hpExposureLikely) {
      pushUnique(
        steps,
        "HP-compatible biopsy features are present; revisit the exposure history and correlate with small-airway HRCT findings before assigning an idiopathic label."
      );
    }

    if (signals.pathologyAvailable && !yes(data.pathologyThoracicReview)) {
      pushUnique(
        steps,
        "If tissue is available, consider thoracic pathology rereview before closing the diagnosis, especially if the differential still includes UIP, HP, CTD-ILD, or sarcoidosis."
      );
    }

    if (signals.pathologyAvailable && !yes(data.pathologyMddCorrelation)) {
      pushUnique(
        steps,
        "Explicitly correlate the pathology with HRCT and exposure/autoimmune context at MDD rather than relying on the histology label alone."
      );
    }

    if (signals.ctdStrong && !["ssc_ild", "ra_ild", "myositis_ild", "sjogren_lip"].includes(primary.key)) {
      pushUnique(steps, "Request rheumatology review to refine whether this represents defined CTD-ILD versus IPAF.");
    }

    if (primary.key === "myositis_ild") {
      pushUnique(steps, "Expand the myositis antibody review and coordinate rheumatology input before immunosuppression decisions.");
    }

    if (signals.iimFerritinRisk) {
      pushUnique(steps, "Ferritin is elevated in an IIM-leaning case; treat this as a higher-risk signal and prioritize expedited subspecialty assessment.");
    }

    if (signals.geneticEtiologyLikely) {
      pushUnique(
        steps,
        "Document the pathogenic genetic finding explicitly in the final diagnosis because it may reframe the case as familial or genetically mediated fibrotic ILD."
      );
      if (!signals.pathologyAvailable) {
        pushUnique(
          steps,
          "Reconsider the need for surgical lung biopsy if histology is unlikely to change management, because the genetic diagnosis itself may be more actionable than subtype histopathology."
        );
      }
    }

    if (signals.telomereSyndromeContext) {
      pushUnique(
        steps,
        "Short-telomere context should prompt surveillance for cytopenias, bone marrow dysfunction, liver disease, and transplant-related immunosuppression considerations."
      );
      pushUnique(
        steps,
        "Use the telomere context in monitoring and transplant planning, with a lower threshold for early antifibrotic and transplant discussion in aggressive fibrotic disease."
      );
    }

    if (signals.lungCancerSurveillanceGene) {
      pushUnique(
        steps,
        "Pathogenic SFTPA1/2 findings should prompt discussion of lung cancer surveillance in addition to ILD management."
      );
    }

    if (signals.geneticEtiologyLikely || yes(data.familyPf)) {
      pushUnique(
        steps,
        "Offer or confirm genetic counseling and family screening/cascade testing so relatives can be assessed in an organized way."
      );
    }

    if (primary.key === "anca_ild") {
      pushUnique(steps, "Obtain or review urinalysis, creatinine, and vasculitis-directed evaluation because ANCA-positive ILD can precede overt systemic disease.");
    }

    if ((primary.key === "sarcoidosis" || plausibleDifferentials.some((item) => item.key === "sarcoidosis")) && !yes(data.granulomatousAlternativeExcluded)) {
      pushUnique(
        steps,
        "If sarcoidosis remains under discussion, explicitly exclude alternative granulomatous causes, especially infection and exposure-related mimics, before closing the case."
      );
    }

    if (primary.key === "sarcoidosis" && !signals.pathologyAvailable && !yes(data.nonnecrotizingGranulomas) && yes(data.bhlAdenopathy)) {
      pushUnique(
        steps,
        "If tissue confirmation is still needed, discuss EBUS-guided hilar or mediastinal node sampling as a lower-burden first approach."
      );
    }

    if (primary.key === "sarcoidosis") {
      pushUnique(
        steps,
        "Stage extrapulmonary involvement and baseline sarcoidosis screening, including calcium, CBC, creatinine, alkaline phosphatase, cardiac sarcoidosis screening, and eye assessment as clinically appropriate."
      );
    }

    if (signals.drugSignal) {
      pushUnique(steps, "Reconstruct medication timing and exposure chronology before attributing disease to medication toxicity.");
    }

    if (primary.key === "ipf") {
      pushUnique(steps, "Route to multidisciplinary discussion for confirmation and align next management steps with local antifibrotic and transplant workflows.");
    }

    if (["ssc_ild", "ra_ild", "myositis_ild", "sjogren_lip", "ipaf"].includes(primary.key)) {
      if (!(hasPhysiologyContext && hasHrctSeverityContext)) {
        pushUnique(steps, "Stage baseline severity with PFTs and HRCT extent, then align specialty co-management around the likely autoimmune phenotype.");
      }
    }

    if (signals.ppfOverlay) {
      pushUnique(steps, "Progression overlay is present; expedite repeat objective assessment and management discussion rather than treating progression as a new diagnosis.");
    }

    if (primary.key === "unclassifiable" || determineCertainty(primary, completeness, signals) === "Low") {
      pushUnique(steps, "Present the case at formal MDD for integrated radiology-pathology-clinical synthesis.");
      if (!signals.pathologyAvailable) {
        pushUnique(
          steps,
          "Consider cryobiopsy or surgical biopsy only if the result is likely to change management and procedure risk is acceptable."
        );
      }
    }

    if (primary.key === "hp" && primary.hardGate) {
      pushUnique(
        steps,
        signals.pathologyAvailable
          ? "Focus on exposure remediation, pathology-radiology-clinical correlation, and MDD management planning."
          : "Biopsy is not required for diagnostic confidence if the identified antigen source is credible; focus on exposure remediation and MDD management planning."
      );
    }

    return steps.slice(0, 7);
  }

  function describeExpectedBehavior(data, primary, signals) {
    const autoimmuneKeys = ["ssc_ild", "ra_ild", "myositis_ild", "sjogren_lip", "ipaf"];

    if (primary.key === "sarcoidosis") {
      return signals.fibroticSignals
        ? "Granulomatous disease with established pulmonary fibrosis; monitor lung trajectory while staging extrapulmonary involvement."
        : "Granulomatous inflammatory phenotype; clinical course depends on thoracic burden, extrapulmonary organ involvement, and treatment response.";
    }
    if (primary.key === "hp") {
      return signals.fibroticSignals
        ? "Fibrotic antigen-driven phenotype; exposure remediation and serial objective reassessment are central."
        : "Inflammatory antigen-driven phenotype; disease behavior may change meaningfully with exposure removal.";
    }
    if (primary.key === "ipf") {
      return signals.ppfOverlay
        ? "UIP-family progressive fibrotic phenotype from the entered data."
        : "UIP-family fibrotic phenotype without a fully confirmed progression overlay from current inputs.";
    }
    if (signals.ppfOverlay && signals.fibroticSignals) {
      return "Fibrotic phenotype with objective progression concern over the last year.";
    }
    if (autoimmuneKeys.includes(primary.key) && signals.inflammatoryImaging && !signals.fibroticSignals) {
      return "Autoimmune inflammatory-predominant phenotype; serial physiology and treatment response may be especially informative.";
    }
    if (autoimmuneKeys.includes(primary.key)) {
      return "Autoimmune-associated ILD phenotype with mixed inflammatory and fibrotic risk; follow serial physiology and HRCT behavior.";
    }
    if (signals.fibroticSignals) {
      return "Fibrotic phenotype without a fully confirmed progression overlay from the entered data.";
    }
    if (primary.key === "op" || signals.inflammatoryImaging) {
      return "Inflammatory or mixed inflammatory-fibrotic phenotype; interval response to treatment and repeat imaging may be clarifying.";
    }
    if (primary.key === "smoking_ild") {
      return "Smoking-related phenotype; trajectory depends on ongoing exposure and the dominant parenchymal pattern.";
    }
    return "Behavior remains uncertain from the current intake and should be clarified with serial physiology, imaging, and MDD synthesis.";
  }

  function buildOpenEvidencePrompt(data, signals) {
    const summaryLines = buildExternalAiSummaryLines(data, signals);
    const promptLines = [
      "You are assisting an interstitial lung disease multidisciplinary discussion for pulmonologists.",
      "Using the structured case below, provide a clinically nuanced MDD-style response.",
      "Please address:",
      "1. The leading diagnosis and ranked differential diagnosis.",
      "2. The level of diagnostic confidence and which features most strongly support or weaken each leading possibility.",
      "3. Whether the case best fits IPF, HP, CTD-ILD, IPAF, sarcoidosis, smoking-related ILD, organizing pneumonia, NSIP, unclassifiable ILD, or another interstitial lung disease framework.",
      "4. Additional diagnostic testing, subspecialty review, or pathology/radiology correlation that could meaningfully change the diagnosis.",
      "5. Management considerations appropriate for multidisciplinary discussion, including exposure remediation, immunomodulatory versus antifibrotic considerations, transplant timing, oxygen/rehabilitation needs, and monitoring.",
      "6. Any important disagreements, caveats, or missing data that should be explicitly discussed at MDD.",
      "Do not invent facts that are not present in the case summary.",
      "",
      "Structured case summary",
      ...summaryLines.map((line) => `- ${line}`),
    ];

    return promptLines.join("\n");
  }

  function buildNote(data, completeness, primary, differentials, steps, certainty, signals) {
    const summaryLines = buildCaseSummaryLines(data, signals, describeExpectedBehavior(data, primary, signals));
    const printableDifferentials = differentials.filter(
      (item) => item.probability >= PRINTABLE_DIFFERENTIAL_THRESHOLD
    );
    const rankedDiagnoses = [primary, ...printableDifferentials].slice(0, 5);
    const primaryOutputLabel = buildPrimaryOutputLabel(primary, data, signals);
    const diffLines = rankedDiagnoses
      .map(
        (item, index) =>
          `${index + 1}. ${index === 0 ? primaryOutputLabel : item.label} (${Math.round(item.probability * 100)}%; ${index === 0 ? `${certainty.toLowerCase()} certainty` : "competing differential"})${item.reasons.length ? ` - ${item.reasons.join(" ")}` : ""}`
      )
      .join("\n");
    const noteLines = [
      `Assessment`,
      `Structured ILD review completed with exposure screening, medication history, CTD symptom screen, CTD serologies, HRCT review, and pathology examination (if available).`,
      `Leading working diagnosis: ${primaryOutputLabel} with ${certainty.toLowerCase()} diagnostic certainty (${Math.round(
        primary.probability * 100
      )}% within-tool relative probability).`,
      ``,
      `Case summary`,
      summaryLines.map((line) => `- ${line}`).join("\n"),
      ``,
      `Ranked differential diagnosis`,
      diffLines,
      ``,
      `Recommended next steps`,
      steps.map((item) => `- ${item}`).join("\n"),
      ``,
      `Data completeness`,
      `${completeness.score}% complete. ${completeness.missing.length ? `Missing groups: ${completeness.missing.join("; ")}.` : "No required group is currently missing."}`,
    ];
    return noteLines.join("\n");
  }

  function analyzeCase(data) {
    const completeness = calculateCompleteness(data);
    const signals = deriveSignals(data);
    const candidates = finalizeProbabilities(buildCandidates(data, signals, completeness));
    const primary = candidates[0];
    const certainty = determineCertainty(primary, completeness, signals);
    const differentials = candidates.filter((candidate) => candidate.key !== primary.key).slice(0, 5);
    const overlays = buildOverlays(primary, completeness, signals);
    const steps = buildNextSteps(data, completeness, primary, differentials, signals);
    const note = buildNote(data, completeness, primary, differentials, steps, certainty, signals);
    const openEvidencePrompt = buildOpenEvidencePrompt(data, signals);

    return {
      completeness,
      signals,
      primary: { ...primary, certainty, outputLabel: buildPrimaryOutputLabel(primary, data, signals) },
      differentials,
      overlays,
      steps,
      note,
      openEvidencePrompt,
    };
  }

  function renderAssessment(result) {
    const { completeness, primary, differentials, overlays, steps } = result;
    const printableDifferentials = differentials.filter(
      (item) => item.probability >= PRINTABLE_DIFFERENTIAL_THRESHOLD
    );
    const rankedDiagnoses = [primary, ...printableDifferentials].slice(0, 5);

    primaryDiagnosis.innerHTML = `
      <h2>${primary.outputLabel || primary.label}</h2>
      <div class="dx-meta">
        <span class="pill">${Math.round(primary.probability * 100)}% estimated probability</span>
        <span class="pill secondary">${primary.certainty} diagnostic certainty</span>
      </div>
      <p>${primary.reasons.join(" ") || "No rationale text was generated."}</p>
    `;

    completenessScore.textContent = `${completeness.score}%`;
    completenessBar.style.width = `${completeness.score}%`;
    missingItems.innerHTML = completeness.missing.length
      ? completeness.missing.map((item) => `<li>${item}</li>`).join("")
      : "<li>No required input group is currently missing.</li>";

    nextSteps.innerHTML = steps.length
      ? steps.map((item) => `<li>${item}</li>`).join("")
      : "<li>No additional high-yield step identified from the current data.</li>";

    overlayList.innerHTML = overlays
      .map((overlay) => `<span class="tag${overlay.warn ? " warn" : ""}">${overlay.label}</span>`)
      .join("");

    differentialList.innerHTML = rankedDiagnoses
      .map(
        (item, index) => `
          <article class="dx-card">
            <strong>#${index + 1} ${index === 0 ? primary.outputLabel || item.label : item.label}</strong>
            <div class="dx-meta">
              <span class="pill">${Math.round(item.probability * 100)}%</span>
              ${index === 0 ? `<span class="pill secondary">${primary.certainty} certainty</span>` : ""}
            </div>
            <p>${item.reasons.join(" ") || "Competing diagnosis remains plausible but is less strongly supported."}</p>
          </article>
        `
      )
      .join("");

    noteOutput.value = result.note;
    openEvidencePromptOutput.value = result.openEvidencePrompt;
  }

  function runAssessment() {
    const data = getFormData();
    const result = analyzeCase(data);
    renderAssessment(result);
  }

  runAssessmentButton.addEventListener("click", runAssessment);

  async function copyOutputText(output, button, defaultLabel) {
    if (!output.value.trim()) {
      return;
    }
    try {
      await navigator.clipboard.writeText(output.value);
      button.textContent = "Copied";
      window.setTimeout(() => {
        button.textContent = defaultLabel;
      }, 1200);
    } catch (error) {
      output.focus();
      output.select();
    }
  }

  copyNoteButton.addEventListener("click", async () => {
    await copyOutputText(noteOutput, copyNoteButton, "Copy MDD note");
  });

  copyExternalAiSummaryButton.addEventListener("click", async () => {
    await copyOutputText(openEvidencePromptOutput, copyExternalAiSummaryButton, "Copy case summary");
  });

  resetCaseButton.addEventListener("click", () => {
    clearPersistedState();
    resetFormToDefaults();
    clearRenderedState();
  });

  exampleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const example = exampleCases[button.dataset.example];
      if (!example) {
        return;
      }
      fillForm(example);
      runAssessment();
    });
  });

  form.addEventListener("input", () => {
    syncDerivedImagingCategories();
    refreshNumericFieldAlerts();
  });
  form.addEventListener("change", () => {
    syncDerivedImagingCategories();
    refreshNumericFieldAlerts();
  });

  clearPersistedState();
  resetFormToDefaults();
  clearRenderedState();
})();
