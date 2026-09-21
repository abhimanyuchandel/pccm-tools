// Frozen pH-free model, without bystander CPR. No patient-level data.
// Analysis: 8e4a47a1cab49b719a9f50fa35fb5033010e2dc118b1d3dd97a6f135ec1f16b0
// Source equation SHA-256: 38cccb14a81e40793f4e18f21a8eeba8e05903aeb1285af5565d385b3e9de2a5
export const frozenModel = {
  "intercept": -3.9009089190660604,
  "coefficients": {
    "age_linear_10y": 0.013657106514999769,
    "age_nonlinear": -0.19672032178560256,
    "location_1": 0.65538301134772858,
    "multiple_arrests_1": -0.19646209491662575,
    "initial_rhythm_1": 0.58573098974435422,
    "log1p_shocks": 0.12860342050559312,
    "cpr_linear_10min": -0.089280027493928951,
    "cpr_nonlinear": 0.066981596351637626,
    "rosc_1": 0.51127984440705854,
    "signs_of_life_1": 0.88698222519880177,
    "pulse_1": 0.26360105532892592,
    "cannulation_rhythm_1": 0.68121866161836919,
    "cannulation_rhythm_2": 1.2322813175009359,
    "cannulation_rhythm_3": 0.75100846159204748
  },
  "lambda": 0.0046415888336127824,
  "age_knots": [34, 55.399999999999999, 69.200000000000003],
  "cpr_knots": [30, 57, 90],
  "age_topcode": 80,
  "variables": ["age", "location", "multiple_arrests", "initial_rhythm", "shocks", "cpr_minutes", "rosc", "signs_of_life", "pulse", "cannulation_rhythm"],
  "factor_levels": {
    "location": ["Home / other", "Public / healthcare-EMS"],
    "multiple_arrests": ["No", "Yes"],
    "initial_rhythm": ["Non-shockable", "Shockable"],
    "rosc": ["No", "Yes"],
    "signs_of_life": ["No", "Yes"],
    "pulse": ["No", "Yes"],
    "cannulation_rhythm": ["Asystole", "PEA", "VF / VT", "Other organized rhythm"]
  },
  "required_complete_entry": true,
  "output": "continuous probability",
  "approved_for_clinical_use": false,
  "derivation": "Full-cohort ridge after nested center-held-out evaluation"
};
