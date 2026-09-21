// Complete-entry equation adapter. No coefficients are bundled here.
// A verified, frozen model export is required; this is not clinical validation.
const binary = ['location', 'multiple_arrests', 'initial_rhythm', 'rosc', 'signs_of_life', 'pulse'];
const required = ['age', 'location', 'multiple_arrests', 'initial_rhythm', 'shocks',
  'cpr_minutes', 'rosc', 'signs_of_life', 'pulse', 'cannulation_rhythm'];
const terms = ['age_linear_10y', 'age_nonlinear', 'location_1', 'multiple_arrests_1',
  'initial_rhythm_1', 'log1p_shocks', 'cpr_linear_10min', 'cpr_nonlinear', 'rosc_1',
  'signs_of_life_1', 'pulse_1', 'cannulation_rhythm_1', 'cannulation_rhythm_2',
  'cannulation_rhythm_3'];

function spline(x, knots) {
  if (!Array.isArray(knots) || knots.length !== 3 || !knots.every(Number.isFinite) ||
      !(knots[0] < knots[1] && knots[1] < knots[2])) throw new Error('Invalid model spline knots');
  const [a,b,c] = knots;
  const cube = z => Math.max(0,z)**3;
  return (cube(x-a)-cube(x-b)*(c-a)/(c-b)+cube(x-c)*(b-a)/(c-b))/(c-a)**2;
}

export function predictFavorableOutcome(model, inputs) {
  if (!model || !Number.isFinite(model.intercept) || !model.coefficients ||
      Object.keys(model.coefficients).length !== terms.length ||
      !terms.every(t => Number.isFinite(model.coefficients[t]))) throw new Error('A complete frozen model is required');
  for (const name of required) {
    if (!Object.hasOwn(inputs,name) || typeof inputs[name] !== 'number' ||
        !Number.isFinite(inputs[name])) throw new Error(`Complete numeric entry required: ${name}`);
  }
  for (const name of binary) if (![0,1].includes(inputs[name])) throw new Error(`Invalid category: ${name}`);
  if (![0,1,2,3].includes(inputs.cannulation_rhythm)) throw new Error('Invalid cannulation rhythm');
  if (inputs.age < 18 || inputs.age > 120) throw new Error('Age is outside the adult input range');
  if (!Number.isInteger(inputs.shocks) || inputs.shocks < 0 || inputs.shocks > 100)
    throw new Error('Shock count must be an integer from 0 to 100');
  if (inputs.cpr_minutes < 0 || inputs.cpr_minutes > 350) throw new Error('CPR duration is outside the input range');
  if (model.age_topcode !== 80) throw new Error('Unsupported age top-coding specification');
  const age = Math.min(inputs.age,80);
  const x = {
    age_linear_10y: (age-50)/10,
    age_nonlinear: spline(age,model.age_knots)/10,
    location_1: inputs.location,
    multiple_arrests_1: inputs.multiple_arrests,
    initial_rhythm_1: inputs.initial_rhythm,
    log1p_shocks: Math.log1p(inputs.shocks),
    cpr_linear_10min: (inputs.cpr_minutes-60)/10,
    cpr_nonlinear: spline(inputs.cpr_minutes,model.cpr_knots)/10,
    rosc_1: inputs.rosc,
    signs_of_life_1: inputs.signs_of_life,
    pulse_1: inputs.pulse,
    cannulation_rhythm_1: Number(inputs.cannulation_rhythm===1),
    cannulation_rhythm_2: Number(inputs.cannulation_rhythm===2),
    cannulation_rhythm_3: Number(inputs.cannulation_rhythm===3),
  };
  const lp = model.intercept + terms.reduce((sum,t) => sum + x[t]*model.coefficients[t],0);
  const probability = lp >= 0 ? 1/(1+Math.exp(-lp)) : Math.exp(lp)/(1+Math.exp(lp));
  return {probability, ageTopcoded: inputs.age >= 80};
}
