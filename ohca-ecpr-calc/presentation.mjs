// Presentation only. Bands never alter the continuous model probability.
export function bandFor(probability) {
  if (!Number.isFinite(probability) || probability < 0 || probability > 1)
    throw new Error('Invalid probability');
  if (probability < 0.05) return {band: 'red', label: 'Probability band: below 5%'};
  if (probability < 0.20) return {band: 'yellow', label: 'Probability band: 5% to below 20%'};
  return {band: 'green', label: 'Probability band: 20% or greater'};
}

export function formatProbability(probability) {
  bandFor(probability); // Validate without rounding before band assignment.
  if (probability > 0 && probability < 0.001) return '<0.1%';
  if (probability < 1 && probability > 0.999) return '>99.9%';
  const displayed = (100 * probability).toFixed(1);
  // Avoid showing a rounded number in a different descriptive band.
  if (probability < 0.05 && displayed === '5.0') return '<5.0%';
  if (probability < 0.20 && displayed === '20.0') return '<20.0%';
  return displayed + '%';
}
