import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { frozenModel } from './model.mjs';
import { predictFavorableOutcome } from './predict.mjs';
import { bandFor, formatProbability } from './presentation.mjs';

// The bundled cases are hypothetical R-generated cases, never patient records.
// An optional path runs the same checks against the full frozen R fixture bank.
const fixture = JSON.parse(readFileSync(process.argv[2] || new URL('./fixtures.json', import.meta.url), 'utf8'));
assert.equal(fixture.hypothetical_inputs, true);
assert.equal(fixture.source_model_sha256, '38cccb14a81e40793f4e18f21a8eeba8e05903aeb1285af5565d385b3e9de2a5');
if (fixture.model) assert.deepEqual(frozenModel, fixture.model);
assert.equal(frozenModel.variables.length, 10);
assert.equal(frozenModel.approved_for_clinical_use, false);
assert.ok(!frozenModel.variables.includes('ph_pre'));
assert.ok(!frozenModel.variables.includes('bystander_cpr'));
assert.ok(!frozenModel.variables.includes('witnessed_arrest'));
let maxError = 0;
for (const row of fixture.rows) {
  const result = predictFavorableOutcome(frozenModel, row.inputs);
  maxError = Math.max(maxError, Math.abs(result.probability - row.expected));
  assert.ok(Math.abs(result.probability - row.expected) < 1e-12);
  assert.equal(result.ageTopcoded, row.inputs.age >= 80);
}
const example = {...fixture.rows[0].inputs};
for (const variable of frozenModel.variables) {
  for (const value of [undefined, null, '', NaN, Infinity, '0'])
    assert.throws(() => predictFavorableOutcome(frozenModel, {...example, [variable]: value}));
  const absent = {...example}; delete absent[variable];
  assert.throws(() => predictFavorableOutcome(frozenModel, absent));
}
for (const [variable, value] of [['age',17], ['age',121], ['shocks',-1], ['shocks',.5], ['shocks',101],
  ['cpr_minutes',-1], ['cpr_minutes',351], ['cannulation_rhythm',4], ['pulse',2]])
  assert.throws(() => predictFavorableOutcome(frozenModel, {...example, [variable]: value}));
for (const age of [80, 90, 120]) assert.equal(
  predictFavorableOutcome(frozenModel, {...example, age}).probability,
  predictFavorableOutcome(frozenModel, {...example, age: 80}).probability);
assert.equal(predictFavorableOutcome(frozenModel, {...example, ph_pre:6.8, bystander_cpr:1, y:1}).probability,
  predictFavorableOutcome(frozenModel, example).probability);
for (const [p, band] of [[0,'red'], [.049999,'red'], [.05,'yellow'], [.199999,'yellow'], [.2,'green'], [1,'green']])
  assert.equal(bandFor(p).band, band);
assert.equal(formatProbability(.04999), '<5.0%');
assert.equal(formatProbability(.05), '5.0%');
assert.equal(formatProbability(.19999), '<20.0%');
assert.equal(formatProbability(.2), '20.0%');
assert.equal(formatProbability(.00001), '<0.1%');
assert.equal(formatProbability(.99999), '>99.9%');

const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
assert.doesNotMatch(html, /witnessed_arrest|Other perfusing|developed and validated|src="\/script.js"/);
assert.match(html, /datetime="2026-09-21"/);
assert.match(html, /This calculator was developed using data from adult patients supported with extracorporeal/);
assert.doesNotMatch(html, /ageHelp|Age entry guidance|The model uses 10 clinical inputs and was developed|Missing neurologic outcomes among 264 survivors/);
const ids = [...html.matchAll(/\bid="([^"]*)"/g)].map(m => m[1]);
assert.equal(new Set(ids).size, ids.length);
const fields = {};
const nodes = Object.fromEntries(ids.map(id => [id, {
  hidden: true, textContent:'', dataset:{}, attrs:{}, disabled:true,
  removeAttribute(name){delete this.attrs[name];}, setAttribute(name,v){this.attrs[name]=v;},
  focus(){this.focused=true;}
}]));
for (const m of html.matchAll(/<input\b([^>]+)>|<select\b([^>]+)>([\s\S]*?)<\/select>/g)) {
  const attrs = m[1] || m[2], body = m[3] || '';
  const attr = name => new RegExp(`\\b${name}="([^"]*)"`).exec(attrs)?.[1];
  const name = attr('name'); if (!name) continue;
  assert.ok(/\brequired\b/.test(attrs));
  const options = m[2] ? [...body.matchAll(/<option value="([^"]*)"/g)].map(o => o[1]) : null;
  const field = nodes[attr('id')];
  Object.assign(field, {value:'', checkValidity(){
    if (!this.value.trim()) return false;
    if (options) return options.includes(this.value);
    const n = Number(this.value);
    return Number.isFinite(n) && n >= Number(attr('min')) && n <= Number(attr('max')) &&
      (attr('step') !== '1' || Number.isInteger(n));
  }});
  fields[name] = field;
}
assert.deepEqual(Object.keys(fields).sort(), [...frozenModel.variables].sort());
const events = {}, windowEvents = {};
nodes.calculator.elements = {namedItem: name => fields[name]};
nodes.calculator.addEventListener = (event, handler) => {events[event] = handler;};
const sandbox = vm.createContext({
  frozenModel, predictFavorableOutcome, bandFor, formatProbability,
  document: {getElementById: id => nodes[id], querySelectorAll: () => []},
  window: {addEventListener: (event, handler) => {windowEvents[event] = handler;}},
  location: {hostname:'localhost'}, console
});
const app = readFileSync(new URL('./app.mjs', import.meta.url), 'utf8');
assert.doesNotMatch(app, /\b(fetch|localStorage|sessionStorage|XMLHttpRequest|WebSocket|gtag)\b/);
new vm.Script(app.replace(/^import .+;\n/gm, ''), {filename:'app.mjs'}).runInContext(sandbox);
assert.equal(nodes.calcBtn.disabled, true);
const fill = inputs => Object.entries(inputs).forEach(([key, value]) => fields[key].value = String(value));
const submit = () => events.submit({preventDefault(){}});
for (const row of fixture.rows) {
  fill(row.inputs); events.input();
  assert.equal(nodes.calcBtn.disabled, false);
  submit();
  assert.equal(nodes.riskOut.textContent, formatProbability(row.expected));
  assert.equal(nodes.resultCard.dataset.band, bandFor(row.expected).band);
  assert.equal(nodes.ageNote.hidden, row.inputs.age < 80);
  fields.age.value = '50'; events.input();
  assert.equal(nodes.riskOut.textContent, '—');
  assert.equal(nodes.resultCard.dataset.band, 'none');
}
for (const name of frozenModel.variables) {
  fill(example); fields[name].value = ''; events.change(); submit();
  assert.equal(nodes.calcBtn.disabled, true);
  assert.equal(nodes.formError.hidden, false);
  assert.equal(nodes.riskOut.textContent, '—');
}
for (const [name,value] of [['age','17'],['age','121'],['shocks','0.5'],['shocks','101'],['cpr_minutes','351'],['pulse','2'],['cannulation_rhythm','4']]) {
  fill(example); fields[name].value = value; events.input(); submit();
  assert.equal(nodes.calcBtn.disabled, true);
  assert.equal(nodes.formError.hidden, false);
}
fill(example); events.input(); submit(); events.reset();
assert.equal(nodes.calcBtn.disabled, true);
assert.equal(nodes.riskOut.textContent, '—');
fill(example); events.input(); submit(); windowEvents.pageshow();
assert.equal(nodes.riskOut.textContent, '—');
console.log(JSON.stringify({passed:true, hypotheticalCases:fixture.rows.length, maxAbsoluteError:maxError,
  numericInputGuards:true, allTenFieldsRequired:true, staleResultClearing:true, resetAndHistory:true,
  ageTopcoding:true, probabilityBandBoundaries:true, exactRequestedWording:true, lastUpdated:'2026-09-21'}));
