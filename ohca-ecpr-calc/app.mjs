import { frozenModel } from './model.mjs';
import { predictFavorableOutcome } from './predict.mjs';
import { bandFor, formatProbability } from './presentation.mjs';

const form = document.getElementById('calculator');
const el = id => document.getElementById(id);
const fields = frozenModel.variables.map(name => form.elements.namedItem(name));
const resultLabel = 'Predicted probability of survival to hospital discharge with a favorable CPC (CPC 1–2)';

function readInputs() {
  const values = {};
  for (const name of frozenModel.variables) {
    const field = form.elements.namedItem(name);
    if (!field || field.value.trim() === '' || !field.checkValidity()) {
      const error = new Error('Complete all 10 fields with valid values. Unknown values cannot be entered as zero or “No.”');
      error.field = field;
      throw error;
    }
    values[name] = Number(field.value);
  }
  return values;
}

function clearResult() {
  el('resultCard').dataset.band = 'none';
  el('riskOut').textContent = '—';
  el('noteOut').textContent = resultLabel;
  el('ageNote').hidden = true;
  el('formError').hidden = true;
  el('formError').textContent = '';
  fields.forEach(field => field.removeAttribute('aria-invalid'));
}

function updateButtonState() {
  try {
    predictFavorableOutcome(frozenModel, readInputs());
    el('calcBtn').disabled = false;
  } catch {
    el('calcBtn').disabled = true;
  }
}

// Any edit invalidates the displayed result, even when all fields stay complete.
for (const event of ['input', 'change']) form.addEventListener(event, () => {
  clearResult();
  updateButtonState();
});

form.addEventListener('submit', event => {
  event.preventDefault();
  clearResult();
  try {
    const result = predictFavorableOutcome(frozenModel, readInputs());
    const band = bandFor(result.probability);
    el('resultCard').dataset.band = band.band;
    el('riskOut').textContent = formatProbability(result.probability);
    el('ageNote').hidden = !result.ageTopcoded;
  } catch (error) {
    el('formError').textContent = error.message;
    el('formError').hidden = false;
    if (error.field) {
      error.field.setAttribute('aria-invalid', 'true');
      error.field.focus();
    }
  }
});

form.addEventListener('reset', () => {
  clearResult();
  el('calcBtn').disabled = true;
  document.querySelectorAll('.helpBtn').forEach(button => {
    el(button.dataset.help).hidden = true;
    button.setAttribute('aria-expanded', 'false');
  });
});

document.querySelectorAll('.helpBtn').forEach(button => {
  button.addEventListener('click', () => {
    const text = el(button.dataset.help);
    text.hidden = !text.hidden;
    button.setAttribute('aria-expanded', String(!text.hidden));
  });
});

if (location.hostname.endsWith('.pccmtools.pages.dev') || ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) {
  el('previewNotice').hidden = false;
}
// Do not retain an old prediction when the browser restores a page from history.
window.addEventListener('pageshow', () => { clearResult(); updateButtonState(); });
clearResult();
updateButtonState();
