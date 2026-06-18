(function () {
  "use strict";

  const model = window.IPF_6MWT_MODEL;
  const storageKey = "ipf-6mwt-survival-app-state-v1";
  const horizons = model?.horizonsYears || [1, 2, 3];
  const jointEndpoint = window.ODDS_JOINT_ENDPOINT || "api/joint-odds-prediction";
  let predictionRequestId = 0;

  const state = loadState();

  const els = {
    inputSummary: document.getElementById("inputSummary"),
    predictionSummary: document.getElementById("predictionSummary"),
    entryRows: document.getElementById("entryRows"),
    resultRows: document.getElementById("resultRows"),
    notePreview: document.getElementById("notePreview"),
    noteText: document.getElementById("noteText"),
    importText: document.getElementById("importText"),
    patientLabel: document.getElementById("patientLabel"),
    qualityMessages: document.getElementById("qualityMessages"),
    currentEstimate: document.getElementById("currentEstimate"),
    addRowButton: document.getElementById("addRowButton"),
    clearButton: document.getElementById("clearButton"),
    importButton: document.getElementById("importButton"),
    exampleButton: document.getElementById("exampleButton"),
    copyButton: document.getElementById("copyButton")
  };

  if (!model) {
    showUnavailableState();
    return;
  }

  els.patientLabel.value = state.patientLabel;

  renderEntryRows();
  updateOutputs();

  els.addRowButton.addEventListener("click", () => {
    state.rows.push(blankRow());
    renderEntryRows();
    updateOutputs();
    const lastInput = els.entryRows.querySelector("tr:last-child input");
    if (lastInput) lastInput.focus();
  });

  els.clearButton.addEventListener("click", () => {
    state.rows = [blankRow()];
    state.patientLabel = "";
    els.patientLabel.value = "";
    renderEntryRows();
    updateOutputs();
  });

  els.patientLabel.addEventListener("input", () => {
    state.patientLabel = els.patientLabel.value;
    updateOutputs();
  });

  els.entryRows.addEventListener("input", (event) => {
    const input = event.target.closest("[data-field]");
    if (!input) return;
    const row = state.rows.find((item) => item.id === input.closest("tr").dataset.id);
    if (!row) return;
    row[input.dataset.field] = input.value;
    updateOutputs();
  });

  els.entryRows.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action='delete']");
    if (!button) return;
    const id = button.closest("tr").dataset.id;
    if (state.rows.length === 1) {
      state.rows = [blankRow()];
    } else {
      state.rows = state.rows.filter((row) => row.id !== id);
    }
    renderEntryRows();
    updateOutputs();
  });

  els.importButton.addEventListener("click", () => {
    const imported = parseImportedTable(els.importText.value);
    if (imported.rows.length === 0) {
      showTemporaryMessage("No importable 6MWT rows found.", "error");
      return;
    }
    state.rows = imported.rows;
    if (imported.patientLabel) {
      state.patientLabel = imported.patientLabel;
      els.patientLabel.value = imported.patientLabel;
    }
    renderEntryRows();
    updateOutputs();
    showTemporaryMessage(`Imported ${imported.rows.length} visits.`, "ok");
  });

  els.exampleButton.addEventListener("click", () => {
    state.rows = [
      blankRow({
        date: "2024-02-05",
        distance: "410",
        oxygen: "0",
        restSpo2: "96",
        nadirSpo2: "89",
        borg: "3"
      }),
      blankRow({
        date: "2025-02-03",
        distance: "365",
        oxygen: "2",
        restSpo2: "95",
        nadirSpo2: "84",
        borg: "4"
      }),
      blankRow({
        date: "2026-02-09",
        distance: "320",
        oxygen: "3",
        restSpo2: "94",
        nadirSpo2: "82",
        borg: "5"
      })
    ];
    renderEntryRows();
    updateOutputs();
  });

  els.copyButton.addEventListener("click", async () => {
    const text = els.noteText.value;
    if (!text.trim()) return;
    const html = buildClipboardHtml(els.notePreview.innerHTML);
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([html], { type: "text/html" }),
            "text/plain": new Blob([text], { type: "text/plain" })
          })
        ]);
      } else {
        copyRenderedNoteFallback();
      }
      flash(els.copyButton, "Copied");
    } catch (_error) {
      if (!copyRenderedNoteFallback()) {
        els.noteText.focus();
        els.noteText.select();
        document.execCommand("copy");
      }
      flash(els.copyButton, "Copied");
    }
  });

  function loadState() {
    const fallback = {
      patientLabel: "",
      rows: [blankRow()]
    };
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      if (!saved || !Array.isArray(saved.rows)) return fallback;
      return {
        patientLabel: saved.patientLabel || "",
        rows: saved.rows.length ? saved.rows.map((row) => blankRow(row)) : [blankRow()]
      };
    } catch (_error) {
      return fallback;
    }
  }

  function saveState() {
    localStorage.setItem(storageKey, JSON.stringify(state));
  }

  function blankRow(values = {}) {
    return {
      id: values.id || makeId(),
      date: values.date || "",
      distance: values.distance || "",
      oxygen: values.oxygen || "",
      restSpo2: values.restSpo2 || "",
      nadirSpo2: values.nadirSpo2 || "",
      borg: values.borg || ""
    };
  }

  function makeId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return `row-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function renderEntryRows() {
    els.entryRows.innerHTML = state.rows.map((row, index) => {
      return `
        <tr data-id="${escapeHtml(row.id)}">
          <td data-label="Visit"><span class="visit-badge">${index + 1}</span></td>
          <td data-label="Date"><input data-field="date" type="date" value="${escapeHtml(row.date)}"></td>
          <td data-label="6MWD m"><input data-field="distance" type="number" min="0" step="1" value="${escapeHtml(row.distance)}"></td>
          <td data-label="O2 L/min"><input data-field="oxygen" type="number" min="0" step="0.5" value="${escapeHtml(row.oxygen)}"></td>
          <td data-label="Rest SpO2 %"><input data-field="restSpo2" type="number" min="0" max="100" step="1" value="${escapeHtml(row.restSpo2)}"></td>
          <td data-label="Nadir SpO2 %"><input data-field="nadirSpo2" type="number" min="0" max="100" step="1" value="${escapeHtml(row.nadirSpo2)}"></td>
          <td data-label="Borg"><input data-field="borg" type="number" min="0" step="0.5" value="${escapeHtml(row.borg)}"></td>
          <td class="row-action"><button type="button" class="icon-button" data-action="delete" aria-label="Remove visit">x</button></td>
        </tr>
      `;
    }).join("");
  }

  function updateOutputs() {
    saveState();
    const computed = computePredictions();
    renderOutputs(computed);
    requestJointPredictions(computed);
  }

  function renderOutputs(computed) {
    renderResultRows(computed);
    renderCurrentEstimate(computed);
    renderQualityMessages(computed);
    els.noteText.value = buildNoteText(computed);
    els.notePreview.innerHTML = buildNoteHtml(computed);
    els.inputSummary.textContent = `${computed.rows.length} ${computed.rows.length === 1 ? "visit" : "visits"}`;
    els.predictionSummary.textContent = computed.summary;
  }

  function computePredictions() {
    const rows = prepareRows();
    let oddsCount = 0;
    const outputRows = rows.map((row) => {
      const hasOddsScore = row.oddsScoreNum !== null;
      if (hasOddsScore) oddsCount += 1;

      let phase = "";
      let predictions = {};
      let fallbackPredictions = {};
      let modelLabel = "";
      let error = "";
      let pendingJointModel = false;

      if (!hasOddsScore) {
        error = "Missing ODDS score inputs";
      } else {
        phase = oddsCount <= 1 ? "baseline" : "longitudinal";
        modelLabel = phase === "baseline"
          ? "Baseline ODDS score"
          : "Serial ODDS fallback";
        if (phase === "longitudinal" && row.yearsComputed === null) {
          error = "Missing date";
        } else {
          fallbackPredictions = Object.fromEntries(
            horizons.map((horizon) => [horizon, predictEfs(row, phase, horizon)])
          );
          predictions = fallbackPredictions;
          if (phase === "longitudinal" && canUseJointEndpoint()) {
            pendingJointModel = true;
            predictions = {};
            modelLabel = "Calculating JMbayes2 joint model";
          }
        }
      }

      return {
        ...row,
        oddsCount,
        phase,
        modelLabel,
        jointModel: false,
        pendingJointModel,
        predictionIntervals: {},
        predictions,
        fallbackPredictions,
        error
      };
    });

    return refreshComputedMetadata({
      rows: outputRows,
      latest: null,
      summary: "",
      flags: [],
      backendFlags: []
    });
  }

  function refreshComputedMetadata(computed) {
    computed.latest = [...computed.rows].reverse().find((row) => {
      return row.pendingJointModel || Object.keys(row.predictions).length > 0;
    });
    computed.summary = predictionSummaryFor(computed.rows, computed.latest);
    computed.flags = dedupeFlags([...qualityFlags(computed.rows), ...(computed.backendFlags || [])]);
    return computed;
  }

  function predictionSummaryFor(rows, latest) {
    if (!latest) {
      return rows.length ? "No ODDS score prediction available" : "Add a visit to calculate";
    }
    if (latest.pendingJointModel) {
      return `Calculating joint longitudinal-survival model using trend in ODDS score over the preceding ${latest.oddsCount} ${latest.oddsCount === 1 ? "six-minute walk test" : "six-minute walk tests"}`;
    }

    const basis = latest.jointModel
      ? "Prediction based on joint longitudinal-survival model using trend in ODDS score"
      : "Prediction based on trend in ODDS score";
    return `${basis} over the preceding ${latest.oddsCount} ${latest.oddsCount === 1 ? "six-minute walk test" : "six-minute walk tests"}`;
  }

  function prepareRows() {
    const parsed = state.rows
      .map((row, index) => {
        const dateObj = parseDate(row.date);
        return {
          ...row,
          sourceIndex: index,
          dateObj,
          distanceNum: parseNumber(row.distance),
          oxygenNum: parseNumber(row.oxygen),
          restSpo2Num: parseNumber(row.restSpo2),
          nadirSpo2Num: parseNumber(row.nadirSpo2),
          borgNum: parseNumber(row.borg)
        };
      })
      .filter((row) => !isEmptyRow(row));

    const validDates = parsed.map((row) => row.dateObj).filter(Boolean);
    const baselineDate = validDates.length ? new Date(Math.min(...validDates.map((date) => date.getTime()))) : null;

    return parsed
      .map((row) => {
        let yearsComputed = null;
        if (baselineDate && row.dateObj) {
          yearsComputed = Math.max(0, (row.dateObj.getTime() - baselineDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        }
        const oddsScoreNum = calculateOddsScore(row);
        return {
          ...row,
          yearsComputed,
          oddsScoreNum,
          desaturationNum: row.restSpo2Num !== null && row.nadirSpo2Num !== null
            ? row.restSpo2Num - row.nadirSpo2Num
            : null
        };
      })
      .sort((a, b) => {
        if (a.yearsComputed !== null && b.yearsComputed !== null && a.yearsComputed !== b.yearsComputed) {
          return a.yearsComputed - b.yearsComputed;
        }
        if (a.dateObj && b.dateObj && a.dateObj.getTime() !== b.dateObj.getTime()) {
          return a.dateObj - b.dateObj;
        }
        return a.sourceIndex - b.sourceIndex;
      })
      .map((row, index) => {
        if (row.yearsComputed === null && index === 0) {
          return { ...row, yearsComputed: 0 };
        }
        return row;
      })
      .map((row, index) => ({ ...row, visit: index + 1 }));
  }

  function isEmptyRow(row) {
    return [
      row.date,
      row.distance,
      row.oxygen,
      row.restSpo2,
      row.nadirSpo2,
      row.borg
    ].every((value) => String(value || "").trim() === "");
  }

  function calculateOddsScore(row) {
    const required = [row.distanceNum, row.oxygenNum, row.nadirSpo2Num, row.borgNum];
    if (required.some((value) => value === null)) return null;
    return (
      0.18 * row.oxygenNum -
      0.004 * row.distanceNum -
      0.069 * row.nadirSpo2Num +
      0.07 * row.borgNum
    );
  }

  function predictEfs(row, phase, horizon) {
    const modelKey = modelKeyFor(phase);
    const scaling = model.scaling[phase].oddsRaw;
    const raw = row.oddsScoreNum;
    const z = (raw - scaling.center) / scaling.scale;
    const fitted = model.models[modelKey];
    const riskMultiplier = Math.exp(fitted.beta * z);

    if (phase === "baseline") {
      const h0 = hazardAt(fitted.baselineHazard, horizon);
      return clampProbability(Math.exp(-h0 * riskMultiplier));
    }

    const start = Math.max(0, row.yearsComputed || 0);
    const hStart = hazardAt(fitted.baselineHazard, start);
    const hEnd = hazardAt(fitted.baselineHazard, start + horizon);
    const deltaH = Math.max(0, hEnd - hStart);
    return clampProbability(Math.exp(-deltaH * riskMultiplier));
  }

  function modelKeyFor(phase) {
    return phase === "baseline" ? "baselineOddsRaw" : "longitudinalOddsRaw";
  }

  function requestJointPredictions(computed) {
    const requestId = ++predictionRequestId;
    const serialRows = computed.rows.filter((row) => {
      return row.phase === "longitudinal" && !row.error && row.yearsComputed !== null && row.oddsScoreNum !== null;
    });

    if (serialRows.length === 0) return;

    if (!canUseJointEndpoint()) {
      serialRows.forEach(applyFallbackPrediction);
      computed.backendFlags = [{
        level: "warning",
        message: "JMbayes2 joint-model predictions require the R backend. Static-file mode is showing time-updated Cox fallback estimates for serial visits."
      }];
      renderOutputs(refreshComputedMetadata(computed));
      return;
    }

    Promise.allSettled(serialRows.map((row) => fetchJointPrediction(computed.rows, row)))
      .then((results) => {
        if (requestId !== predictionRequestId) return;

        let successes = 0;
        let failures = 0;
        results.forEach((result, index) => {
          if (result.status !== "fulfilled") {
            applyFallbackPrediction(serialRows[index]);
            failures += 1;
            return;
          }
          const row = serialRows[index];
          if (applyJointPrediction(row, result.value)) {
            successes += 1;
          } else {
            applyFallbackPrediction(row);
            failures += 1;
          }
        });

        computed.backendFlags = jointBackendFlags(successes, failures);
        renderOutputs(refreshComputedMetadata(computed));
      });
  }

  function canUseJointEndpoint() {
    return window.location.protocol === "http:" || window.location.protocol === "https:";
  }

  async function fetchJointPrediction(rows, targetRow) {
    const history = rows
      .filter((row) => row.visit <= targetRow.visit && row.oddsScoreNum !== null && row.yearsComputed !== null)
      .map((row) => ({
        visit: row.visit,
        years: row.yearsComputed,
        oddsScore: row.oddsScoreNum
      }));

    const response = await fetch(jointEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rows: history,
        horizons,
        nSamples: 500,
        seed: 20260617
      })
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload || payload.ok !== true) {
      throw new Error(payload?.error || "JMbayes2 prediction request failed.");
    }
    return payload;
  }

  function applyJointPrediction(row, payload) {
    const nextPredictions = {};
    horizons.forEach((horizon) => {
      const value = Number(payload.predictions?.[horizon] ?? payload.predictions?.[String(horizon)]);
      if (Number.isFinite(value)) {
        nextPredictions[horizon] = clampProbability(value);
      }
    });

    if (Object.keys(nextPredictions).length === 0) return false;

    row.predictions = nextPredictions;
    row.predictionIntervals = payload.intervals || {};
    row.modelLabel = "JMbayes2 joint ODDS model";
    row.jointModel = true;
    row.pendingJointModel = false;
    row.error = "";
    return true;
  }

  function applyFallbackPrediction(row) {
    row.predictions = row.fallbackPredictions || {};
    row.predictionIntervals = {};
    row.modelLabel = "Serial ODDS fallback";
    row.jointModel = false;
    row.pendingJointModel = false;
  }

  function jointBackendFlags(successes, failures) {
    if (successes > 0 && failures === 0) return [];
    if (successes > 0) {
      return [{
        level: "warning",
        message: "Some serial visits could not be updated from the JMbayes2 joint model; fallback estimates remain for those rows."
      }];
    }
    return [{
      level: "warning",
      message: "JMbayes2 joint-model endpoint is unavailable; serial visits are showing time-updated Cox fallback estimates."
    }];
  }

  function hazardAt(baselineHazard, time) {
    if (!Number.isFinite(time) || time <= 0) return 0;
    const times = baselineHazard.time;
    const hazards = baselineHazard.hazard;
    if (!times.length) return 0;
    if (time < times[0]) return 0;
    if (time >= times[times.length - 1]) return hazards[hazards.length - 1];

    let low = 0;
    let high = times.length - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (times[mid] <= time) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return hazards[Math.max(0, high)];
  }

  function renderResultRows(computed) {
    if (computed.rows.length === 0) {
      els.resultRows.innerHTML = `<tr><td colspan="14" class="empty-state">No 6MWT data entered</td></tr>`;
      return;
    }

    els.resultRows.innerHTML = computed.rows.map((row) => {
      return `
        <tr>
          <td>${row.visit}</td>
          <td>${escapeHtml(row.date || "")}</td>
          <td>${formatNumber(row.yearsComputed, 2)}</td>
          <td>${formatNumber(row.distanceNum, 0)}</td>
          <td>${formatNumber(row.oxygenNum, 1)}</td>
          <td>${formatNumber(row.restSpo2Num, 0)}</td>
          <td>${formatNumber(row.nadirSpo2Num, 0)}</td>
          <td>${formatNumber(row.desaturationNum, 0)}</td>
          <td>${formatNumber(row.borgNum, 1)}</td>
          <td>${formatNumber(row.oddsScoreNum, 2)}</td>
          <td>${escapeHtml(row.error || row.modelLabel)}</td>
          <td>${formatPercent(row.predictions[1])}</td>
          <td>${formatPercent(row.predictions[2])}</td>
          <td>${formatPercent(row.predictions[3])}</td>
        </tr>
      `;
    }).join("");
  }

  function renderCurrentEstimate(computed) {
    const values = horizons.map((horizon) => {
      const value = computed.latest?.predictions[horizon];
      return `
        <div>
          <span>${horizon} ${horizon === 1 ? "year" : "years"}</span>
          <strong>${formatPercent(value) || "--"}</strong>
        </div>
      `;
    });
    els.currentEstimate.innerHTML = values.join("");
  }

  function renderQualityMessages(computed) {
    els.qualityMessages.innerHTML = computed.flags.map((flag) => {
      return `<div class="quality-message ${flag.level === "error" ? "error" : ""}">${escapeHtml(flag.message)}</div>`;
    }).join("");
  }

  function qualityFlags(rows) {
    const flags = [];
    if (rows.length === 0) return flags;

    const oddsRows = rows.filter((row) => row.oddsScoreNum !== null);
    if (oddsRows.length === 0) {
      flags.push({ level: "error", message: "No complete ODDS score inputs available for prediction." });
    }

    const missingTimeSerial = oddsRows.filter((row, index) => index > 0 && row.yearsComputed === null);
    if (missingTimeSerial.length > 0) {
      flags.push({ level: "error", message: "Serial predictions need visit dates so years can be calculated from visit 1." });
    }

    const ranges = model.training?.ranges || {};
    const oddsRange = ranges.longitudinalOddsRaw || ranges.baselineOddsRaw;

    rows.forEach((row) => {
      if (row.oddsScoreNum !== null && oddsRange && (row.oddsScoreNum < oddsRange[0] || row.oddsScoreNum > oddsRange[1])) {
        flags.push({
          level: "warning",
          message: `Visit ${row.visit}: ODDS score ${formatNumber(row.oddsScoreNum, 2)} is outside the derivation range (${formatNumber(oddsRange[0], 2)}-${formatNumber(oddsRange[1], 2)}).`
        });
      }
      if (row.restSpo2Num !== null && (row.restSpo2Num < 50 || row.restSpo2Num > 100)) {
        flags.push({ level: "warning", message: `Visit ${row.visit}: resting SpO2 is outside 50-100%.` });
      }
      if (row.nadirSpo2Num !== null && (row.nadirSpo2Num < 50 || row.nadirSpo2Num > 100)) {
        flags.push({ level: "warning", message: `Visit ${row.visit}: nadir SpO2 is outside 50-100%.` });
      }
    });

    const latest = rows[rows.length - 1];
    const lastHorizon = latest?.yearsComputed !== null ? latest.yearsComputed + Math.max(...horizons) : null;
    const maxModelTime = maxHazardTime(model.models[modelKeyFor(oddsRows.length > 1 ? "longitudinal" : "baseline")]);
    if (lastHorizon !== null && lastHorizon > maxModelTime) {
      flags.push({
        level: "warning",
        message: `Latest prediction extends beyond the last model event time (${formatNumber(maxModelTime, 1)} years).`
      });
    }

    return dedupeFlags(flags);
  }

  function maxHazardTime(fitted) {
    const times = fitted.baselineHazard.time;
    return times[times.length - 1] || 0;
  }

  function dedupeFlags(flags) {
    const seen = new Set();
    return flags.filter((flag) => {
      if (seen.has(flag.message)) return false;
      seen.add(flag.message);
      return true;
    });
  }

  function buildNoteData(computed) {
    if (computed.rows.length === 0) return null;
    const latest = computed.latest;
    const headers = [
      "Visit",
      "Date",
      "Years",
      "6MWD m",
      "O2 L/min",
      "Rest SpO2 %",
      "Nadir SpO2 %",
      "Delta SpO2",
      "Borg",
      "ODDS score",
      "EFS 1y",
      "EFS 2y",
      "EFS 3y"
    ];
    const rows = computed.rows.map((row) => [
      String(row.visit),
      row.date || "",
      formatNumber(row.yearsComputed, 2),
      formatNumber(row.distanceNum, 0),
      formatNumber(row.oxygenNum, 1),
      formatNumber(row.restSpo2Num, 0),
      formatNumber(row.nadirSpo2Num, 0),
      formatNumber(row.desaturationNum, 0),
      formatNumber(row.borgNum, 1),
      formatNumber(row.oddsScoreNum, 2),
      formatPercent(row.predictions[1]),
      formatPercent(row.predictions[2]),
      formatPercent(row.predictions[3])
    ]);
    const generated = new Date().toISOString().slice(0, 10);
    const title = `IPF 6MWT / ODDS event-free survival estimates${state.patientLabel ? ` - ${state.patientLabel}` : ""}`;
    const prediction = latest
      ? `${predictionSummaryFor(computed.rows, latest)}.`
      : "Prediction not available because ODDS score inputs are incomplete.";
    const current = latest
      ? `Current predicted event-free survival: 1y ${formatPercent(latest.predictions[1])}, 2y ${formatPercent(latest.predictions[2])}, 3y ${formatPercent(latest.predictions[3])}.`
      : "Current predicted event-free survival: not available.";

    return {
      title,
      endpoint: `Endpoint: death or lung transplantation. Generated: ${generated}.`,
      prediction,
      current,
      headers,
      rows
    };
  }

  function buildNoteText(computed) {
    const note = buildNoteData(computed);
    if (!note) return "";
    return [
      note.title,
      note.endpoint,
      note.prediction,
      note.current,
      "",
      note.headers.join("\t"),
      ...note.rows.map((row) => row.join("\t"))
    ].join("\n");
  }

  function buildNoteHtml(computed) {
    const note = buildNoteData(computed);
    if (!note) return `<div class="empty-state">No 6MWT data entered</div>`;

    const tableStyle = "border-collapse:collapse;border:1px solid #8d9891;font-family:Arial,sans-serif;font-size:10pt;width:100%;";
    const thStyle = "border:1px solid #8d9891;background:#eef2ef;color:#16201c;font-weight:bold;padding:4px 6px;text-align:center;white-space:nowrap;";
    const tdBaseStyle = "border:1px solid #8d9891;color:#16201c;padding:4px 6px;white-space:nowrap;";
    const rowsHtml = note.rows.map((row) => {
      const cells = row.map((value, index) => {
        const align = index === 1 ? "left" : "right";
        return `<td style="${tdBaseStyle}text-align:${align};">${escapeHtml(value)}</td>`;
      }).join("");
      return `<tr>${cells}</tr>`;
    }).join("");
    const headersHtml = note.headers.map((header) => {
      return `<th style="${thStyle}">${escapeHtml(header)}</th>`;
    }).join("");

    return `
      <div class="clinical-note-content">
        <p class="clinical-note-title" style="margin:0 0 4px 0;font-weight:bold;">${escapeHtml(note.title)}</p>
        <p style="margin:0 0 4px 0;">${escapeHtml(note.endpoint)}</p>
        <p style="margin:0 0 4px 0;">${escapeHtml(note.prediction)}</p>
        <p style="margin:0 0 8px 0;">${escapeHtml(note.current)}</p>
        <table style="${tableStyle}">
          <thead><tr>${headersHtml}</tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;
  }

  function buildClipboardHtml(html) {
    return `<!doctype html><html><head><meta charset="utf-8"></head><body>${html}</body></html>`;
  }

  function copyRenderedNoteFallback() {
    if (!els.notePreview || !els.notePreview.textContent.trim()) return false;
    const selection = window.getSelection?.();
    if (!selection || !document.createRange) return false;
    const range = document.createRange();
    range.selectNodeContents(els.notePreview);
    selection.removeAllRanges();
    selection.addRange(range);
    const ok = document.execCommand("copy");
    selection.removeAllRanges();
    return ok;
  }

  function parseImportedTable(text) {
    const result = { rows: [], patientLabel: "" };
    const lines = text.split(/\r\n?|\n/).map((line) => line.trim()).filter(Boolean);
    if (lines.length === 0) return result;

    const titleLine = lines.find((line) => /^IPF 6MWT/i.test(line));
    if (titleLine && titleLine.includes(" - ")) {
      result.patientLabel = titleLine.split(" - ").slice(1).join(" - ").trim();
    }

    const headerIndex = lines.findIndex((line) => {
      const normalized = normalizeHeader(line);
      return normalized.includes("date") && (normalized.includes("6mwd") || normalized.includes("distance"));
    });
    if (headerIndex < 0) return result;

    const delimiter = lines[headerIndex].includes("\t")
      ? "\t"
      : lines[headerIndex].includes("|")
        ? "|"
        : lines[headerIndex].includes(",")
          ? ","
          : "spaces";

    const headers = splitLine(lines[headerIndex], delimiter).map(headerKey);
    const rows = [];
    for (let i = headerIndex + 1; i < lines.length; i += 1) {
      if (/^\|?\s*:?-{3,}/.test(lines[i]) || /^-+(?:\s+-+)+$/.test(lines[i])) continue;
      const cells = splitLine(lines[i], delimiter);
      if (cells.length < 2) continue;
      const record = {};
      headers.forEach((header, index) => {
        record[header] = cells[index] || "";
      });
      const row = rowFromRecord(record);
      if (!isEmptyRow(row)) rows.push(row);
    }
    result.rows = rows;
    return result;
  }

  function rowFromRecord(record) {
    return blankRow({
      date: normalizeDateInput(record.date || record.visitdate || ""),
      distance: cleanNumericString(record.sixmwdm || record.sixmwd || record.distancem || record.distance || ""),
      oxygen: cleanNumericString(record.o2lmin || record.o2 || record.oxygenlmin || record.oxygen || ""),
      restSpo2: cleanNumericString(record.restspo2 || record.restingspo2 || ""),
      nadirSpo2: cleanNumericString(record.nadirspo2 || ""),
      borg: cleanNumericString(record.borg || "")
    });
  }

  function splitLine(line, delimiter) {
    if (delimiter === "|") {
      return line.replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
    }
    if (delimiter === "spaces") {
      return line.trim().split(/\s{2,}/).map((cell) => cell.trim());
    }
    return line.split(delimiter).map((cell) => cell.trim());
  }

  function headerKey(value) {
    const key = normalizeHeader(value);
    const aliases = {
      visit: "visit",
      date: "date",
      visitdate: "date",
      years: "years",
      year: "years",
      yearsfrombaseline: "yearsfrombaseline",
      yearssincebaseline: "yearsfrombaseline",
      "6mwdm": "sixmwdm",
      "6mwd": "sixmwd",
      distancem: "distancem",
      distance: "distance",
      o2lmin: "o2lmin",
      o2: "o2",
      oxygenlmin: "oxygenlmin",
      oxygen: "oxygen",
      rest: "restspo2",
      restspo2: "restspo2",
      restingspo2: "restingspo2",
      nadir: "nadirspo2",
      nadirspo2: "nadirspo2",
      desaturationpp: "desaturation",
      delta: "desaturation",
      borg: "borg",
      oddsraw: "oddsraw",
      oddsscore: "oddsscore",
      odds: "odds"
    };
    return aliases[key] || key;
  }

  function normalizeHeader(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  }

  function cleanNumericString(value) {
    const raw = String(value || "").replace(/%/g, "").trim();
    if (!raw || raw === "--") return "";
    const match = raw.match(/-?\d+(?:\.\d+)?/);
    return match ? match[0] : "";
  }

  function parseDate(value) {
    const raw = String(value || "").trim();
    if (!raw) return null;
    const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) {
      return safeDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
    }
    const slash = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (slash) {
      const year = Number(slash[3].length === 2 ? `20${slash[3]}` : slash[3]);
      return safeDate(year, Number(slash[1]), Number(slash[2]));
    }
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return null;
    return safeDate(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate());
  }

  function safeDate(year, month, day) {
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
    return date;
  }

  function normalizeDateInput(value) {
    const date = parseDate(value);
    if (!date) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function parseNumber(value) {
    if (value === null || value === undefined) return null;
    const raw = String(value).trim();
    if (!raw) return null;
    const number = Number(raw.replace(/,/g, ""));
    return Number.isFinite(number) ? number : null;
  }

  function formatNumber(value, digits) {
    if (value === null || value === undefined || !Number.isFinite(value)) return "";
    return Number(value).toFixed(digits);
  }

  function formatPercent(value) {
    if (value === null || value === undefined || !Number.isFinite(value)) return "";
    const pct = value * 100;
    if (pct > 99.95) return ">99.9%";
    if (pct > 0 && pct < 0.05) return "<0.1%";
    return `${pct.toFixed(1)}%`;
  }

  function clampProbability(value) {
    if (!Number.isFinite(value)) return null;
    return Math.min(1, Math.max(0, value));
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function flash(element, text) {
    const original = element.textContent;
    element.textContent = text;
    element.classList.add("flash");
    setTimeout(() => {
      element.textContent = original;
      element.classList.remove("flash");
    }, 1000);
  }

  function showTemporaryMessage(message, level) {
    const item = document.createElement("div");
    item.className = `quality-message ${level === "error" ? "error" : ""}`;
    item.textContent = message;
    els.qualityMessages.prepend(item);
    setTimeout(() => item.remove(), 3000);
  }

  function showUnavailableState() {
    els.qualityMessages.innerHTML = `<div class="quality-message error">Model parameters could not be loaded.</div>`;
    els.predictionSummary.textContent = "Model unavailable";
  }
})();
