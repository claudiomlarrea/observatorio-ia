/**
 * UI Convertidor SACAU — carga Word/PDF y exportación CRE
 */
(async function () {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const errEl = $("#error");
  const infoEl = $("#info");
  const decideEl = $("#app-decidir");
  const resultEl = $("#app-resultado");
  const progressEl = $("#progress");
  const progressLabel = $("#progressLabel");
  const progressBar = $("#progressBar");

  let currentStep = 1;

  function showError(msg) {
    errEl.hidden = !msg;
    errEl.textContent = msg || "";
  }

  function showInfo(msg) {
    infoEl.hidden = !msg;
    infoEl.textContent = msg || "";
  }

  function showProgress(payload) {
    if (!payload) {
      progressEl.hidden = true;
      return;
    }
    progressEl.hidden = false;
    progressLabel.textContent = payload.message || "Procesando…";
    let pct = 0;
    if (payload.total && payload.current) pct = (payload.current / payload.total) * 100;
    else if (payload.progress != null) pct = payload.progress * 100;
    else if (payload.phase === "done" || payload.phase === "known") pct = 100;
    else if (payload.phase === "ocr") pct = 5;
    progressBar.style.width = `${Math.max(3, Math.min(100, pct))}%`;
  }

  function hasMaterias() {
    return Boolean(plan && plan.asignaturas && plan.asignaturas.length);
  }

  function updateExportState() {
    const ready = hasMaterias();
    ["btnDocx", "btnPdf", "btnCsv"].forEach((id) => {
      const btn = document.getElementById(id);
      if (btn) btn.disabled = !ready;
    });
    const hint = $("#exportHint");
    if (hint) {
      hint.textContent = ready
        ? "Podés descargar el plan en créditos en cualquier momento."
        : "Las descargas se habilitan cuando haya materias cargadas.";
    }
    const bar = $("#exportBar");
    if (bar) bar.classList.toggle("is-ready", ready);
  }

  function setStep(n, opts = {}) {
    currentStep = Number(n) || 1;
    document.querySelectorAll(".step").forEach((el) => {
      const s = Number(el.dataset.step);
      el.classList.toggle("active", s === currentStep);
      el.classList.toggle("done", hasMaterias() && s < currentStep);
      el.setAttribute("aria-current", s === currentStep ? "step" : "false");
    });
    // Los tres apartados quedan siempre visibles; el paso solo desplaza la vista.
    for (let i = 1; i <= 3; i++) {
      const panel = document.getElementById(`panel-${i}`);
      if (panel) {
        panel.hidden = false;
        panel.classList.toggle("is-current", i === currentStep);
      }
    }
    if (opts.scroll !== false) {
      const target = document.getElementById(`panel-${currentStep}`);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  async function loadJson(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`No se pudo cargar ${path} (${res.status})`);
    return res.json();
  }

  let tipologiasMap = {};
  let normasUccuyo = {};
  let knownCatalog = null;
  let plan = null;

  function tipologiasFromRaw(raw) {
    const map = {};
    for (const t of raw.tipologias || []) map[t.id] = t;
    return map;
  }

  function optionsFromUi() {
    return {
      valor_cre_default: Number($("#valorCre").value || 25),
      redondeo_cre: Number($("#redondeo").value),
      tipologias: tipologiasMap,
    };
  }

  function ensureDuracion(p) {
    if (!p.asignaturas.length) {
      p.duracion_anios = 0;
      return p;
    }
    p.duracion_anios = Math.max(...p.asignaturas.map((a) => Number(a.anio || 1)));
    return p;
  }

  function readAsignaturasFromTable() {
    const rows = [...document.querySelectorAll("#tablaAsig tbody tr")];
    return rows
      .map((tr) => {
        const g = (name) => {
          const el = tr.querySelector(`[data-f="${name}"]`);
          return el ? el.value : "";
        };
        const numOrNull = (v) => (v === "" || v == null ? null : Number(v));
        return {
          codigo: g("codigo"),
          nombre: g("nombre"),
          anio: Number(g("anio") || 1),
          area: g("area"),
          regimen: g("regimen"),
          tipologia: g("tipologia"),
          horas_teoricas: Number(g("horas_teoricas") || 0),
          horas_practicas: Number(g("horas_practicas") || 0),
          horas_autonomas_override: numOrNull(g("horas_autonomas_override")),
          valor_cre_override: numOrNull(g("valor_cre_override")),
          horas_estimadas: g("horas_estimadas") === "1",
          notas: g("notas"),
        };
      })
      .filter((a) => (a.nombre || "").trim());
  }

  function tipologiaOptions(selected) {
    return Object.keys(tipologiasMap)
      .map((id) => `<option value="${id}" ${id === selected ? "selected" : ""}>${id}</option>`)
      .join("");
  }

  const AREA_LABELS = {
    FB: "Formación Básica",
    FP: "Formación Profesional",
    FGC: "Formación General Complementaria",
    FCI: "Formación Complementaria Institucional",
    OTRA: "Otra / sin clasificar",
  };

  function areaOptions(selected) {
    return Object.keys(AREA_LABELS)
      .map(
        (a) =>
          `<option value="${a}" ${a === selected ? "selected" : ""}>${a} — ${AREA_LABELS[a]}</option>`
      )
      .join("");
  }

  function syncPlanFromUi() {
    if (!plan) return null;
    const table = document.querySelector("#tablaAsig tbody");
    if (!table) return ensureDuracion(plan);
    plan.asignaturas = readAsignaturasFromTable();
    return ensureDuracion(plan);
  }

  function currentConversion(opts = {}) {
    if (!opts.skipSync) syncPlanFromUi();
    if (!plan) return null;
    ensureDuracion(plan);
    const conv = SacauEngine.convertPlan(plan, optionsFromUi());
    const val = SacauEngine.validatePlan(conv, normasUccuyo, null);
    window.__lastConv = conv;
    window.__lastVal = val;
    return { conv, val };
  }

  function bindEditorHandlers(root) {
    root.querySelectorAll(".tip-ratio, .tip-fijas").forEach((el) => {
      el.addEventListener("change", () => {
        const id = el.getAttribute("data-tip");
        if (!tipologiasMap[id]) return;
        syncPlanFromUi();
        if (el.classList.contains("tip-ratio")) tipologiasMap[id].ratio_autonomo = Number(el.value || 0);
        else tipologiasMap[id].autonomas_fijas = Number(el.value || 0);
        render({ skipSync: true });
      });
    });
    root.querySelectorAll(".btn-del").forEach((btn) => {
      btn.addEventListener("click", () => {
        btn.closest("tr")?.remove();
        render({ skipSync: false });
      });
    });
  }

  function render(opts = {}) {
    const result = currentConversion(opts);
    if (!result) return;
    const { conv, val } = result;
    const t = conv.totales;
    const byAnio = SacauEngine.groupBy(conv.items, (i) => i.asignatura.anio);
    const byArea = SacauEngine.groupBy(conv.items, (i) => i.asignatura.area || "—");

    const anioRows = Object.keys(byAnio)
      .sort((a, b) => Number(a) - Number(b))
      .map((anio) => {
        const tot = SacauEngine.computeTotales(byAnio[anio], 1);
        return `<tr><td>${anio}</td><td>${tot.horas_interaccion.toFixed(0)}</td><td>${tot.horas_autonomas.toFixed(0)}</td><td>${tot.cre.toFixed(1)}</td></tr>`;
      })
      .join("");

    const areaRows = Object.keys(byArea)
      .sort()
      .map((area) => {
        const tot = SacauEngine.computeTotales(byArea[area]);
        return `<tr><td>${area}</td><td>${tot.horas_interaccion.toFixed(0)}</td><td>${tot.horas_practicas.toFixed(0)}</td><td>${tot.cre.toFixed(1)}</td></tr>`;
      })
      .join("");

    const checkLis = val.checks
      .map(
        (c) =>
          `<li class="${c.nivel}">${c.nivel === "ok" ? "✅" : c.nivel === "warning" ? "⚠️" : "❌"} ${c.mensaje}</li>`
      )
      .join("");

    const tipRows = Object.values(tipologiasMap)
      .map(
        (tip) => `<tr>
          <td>${tip.id}</td>
          <td>${tip.nombre || ""}</td>
          <td><input class="narrow tip-ratio" data-tip="${tip.id}" type="number" step="0.05" min="0" value="${tip.ratio_autonomo}" /></td>
          <td><input class="narrow tip-fijas" data-tip="${tip.id}" type="number" step="1" min="0" value="${tip.autonomas_fijas || 0}" /></td>
        </tr>`
      )
      .join("");

    const asigRows =
      conv.items
        .map((item) => {
          const a = item.asignatura;
          const ovA = a.horas_autonomas_override == null ? "" : a.horas_autonomas_override;
          const ovC = a.valor_cre_override == null ? "" : a.valor_cre_override;
          return `<tr>
          <td><input data-f="codigo" value="${a.codigo || ""}" class="narrow" /></td>
          <td><input data-f="nombre" value="${String(a.nombre || "").replace(/"/g, "&quot;")}" style="min-width:14rem" /></td>
          <td><input data-f="anio" type="number" class="narrow" min="1" value="${a.anio}" /></td>
          <td><select data-f="area">${areaOptions(a.area)}</select></td>
          <td><select data-f="regimen"><option value="A" ${a.regimen === "A" ? "selected" : ""}>A — Anual</option><option value="S" ${a.regimen !== "A" ? "selected" : ""}>S — Semestral</option></select></td>
          <td><select data-f="tipologia">${tipologiaOptions(a.tipologia)}</select></td>
          <td><input data-f="horas_teoricas" type="number" class="narrow" min="0" value="${a.horas_teoricas}" /></td>
          <td><input data-f="horas_practicas" type="number" class="narrow" min="0" value="${a.horas_practicas}" /></td>
          <td><input data-f="horas_autonomas_override" type="number" class="narrow" min="0" value="${ovA}" placeholder="auto" /></td>
          <td><input data-f="valor_cre_override" type="number" class="narrow" min="25" max="30" value="${ovC}" placeholder="25" /></td>
          <td>${item.horas_interaccion.toFixed(0)}</td>
          <td>${item.horas_autonomas.toFixed(0)}</td>
          <td><strong>${item.cre.toFixed(1)}</strong></td>
          <td>
            <button type="button" class="btn-secondary btn-del" title="Quitar esta asignatura">Quitar</button>
            <input type="hidden" data-f="horas_estimadas" value="${a.horas_estimadas ? "1" : "0"}" />
            <input type="hidden" data-f="notas" value="${String(a.notas || "").replace(/"/g, "&quot;")}" />
          </td>
        </tr>`;
        })
        .join("") ||
      `<tr class="empty-row"><td colspan="14">Sin asignaturas todavía. Cargá un archivo arriba o usá «Agregar asignatura».</td></tr>`;

    const resumenNota =
      plan.metadata?.advertencia ||
      (hasMaterias()
        ? "Revisá tipología, horas y overrides. Las descargas están arriba en cualquier momento."
        : "Todavía no hay asignaturas. Subí un archivo arriba o usá «Agregar asignatura».");

    decideEl.classList.remove("loading");
    decideEl.innerHTML = `
      <div class="grid-2">
        <section class="panel">
          <div class="panel-head">
            <h2>Cómo estimar el trabajo autónomo</h2>
            <a
              class="btn-secondary btn-sm"
              href="docs/instructivo_trabajo_autonomo.pdf"
              target="_blank"
              rel="noopener"
              title="Abrir instructivo PDF sobre tipologías y ratios"
            >Instructivo PDF</a>
          </div>
          <div class="table-wrap" style="max-height:14rem">
            <table>
              <thead><tr><th>Tipo</th><th>Descripción</th><th>Ratio</th><th>Horas fijas</th></tr></thead>
              <tbody>${tipRows}</tbody>
            </table>
          </div>
          <p class="note">Horas autónomas ≈ horas de clase × ratio + horas fijas. Podés corregir asignatura por asignatura en la tabla.</p>
        </section>
        <section class="panel">
          <h2>Resumen rápido</h2>
          <p class="note" style="margin:0 0 0.5rem"><strong>${plan.asignaturas.length}</strong> materias · Interacción <strong>${t.horas_interaccion.toFixed(0)} h</strong> · CRE estimado <strong>${t.cre.toFixed(1)}</strong></p>
          <p class="note">${resumenNota}</p>
        </section>
      </div>
      <section class="panel">
        <h2>${plan.nombre || "Asignaturas del plan"}</h2>
        <p class="note legend-areas" title="Áreas de formación del plan de estudios">
          <strong>Área:</strong>
          <span><abbr title="Formación Básica">FB</abbr> Formación Básica</span>
          <span><abbr title="Formación Profesional">FP</abbr> Formación Profesional</span>
          <span><abbr title="Formación General Complementaria">FGC</abbr> Formación General Complementaria</span>
          <span><abbr title="Formación Complementaria Institucional">FCI</abbr> Formación Complementaria Institucional</span>
          <span><abbr title="Otra">OTRA</abbr> sin clasificar</span>
          · <strong>Rég.:</strong> <abbr title="Semestral">S</abbr> Semestral · <abbr title="Anual">A</abbr> Anual
        </p>
        <div class="table-wrap">
          <table id="tablaAsig">
            <thead>
              <tr>
                <th>Cód.</th><th>Asignatura</th><th>Año</th><th title="Área de formación">Área</th><th title="Régimen">Rég.</th><th>Tipo</th>
                <th>Teó.</th><th>Prác.</th><th>Aut. manual</th><th>CRE h</th>
                <th>Inter.</th><th>Aut.</th><th>CRE</th><th></th>
              </tr>
            </thead>
            <tbody>${asigRows}</tbody>
          </table>
        </div>
      </section>
    `;
    bindEditorHandlers(decideEl);

    resultEl.classList.remove("loading");
    resultEl.innerHTML = `
      <div class="metrics">
        <div class="metric"><div class="label">Interacción</div><div class="value">${t.horas_interaccion.toLocaleString("es-AR", { maximumFractionDigits: 0 })} h</div></div>
        <div class="metric"><div class="label">Autónomas</div><div class="value">${t.horas_autonomas.toLocaleString("es-AR", { maximumFractionDigits: 0 })} h</div></div>
        <div class="metric"><div class="label">Totales estudiante</div><div class="value">${t.horas_totales.toLocaleString("es-AR", { maximumFractionDigits: 0 })} h</div></div>
        <div class="metric"><div class="label">CRE totales</div><div class="value">${t.cre.toFixed(1)}</div></div>
        <div class="metric"><div class="label">CRE / año</div><div class="value">${Number.isFinite(t.cre_promedio_anual) ? t.cre_promedio_anual.toFixed(1) : "—"}</div></div>
      </div>
      <div class="grid-2">
        <section class="panel">
          <h2>Cumplimiento SACAU</h2>
          <ul class="checks">${checkLis || '<li class="warning">⚠️ Cargá un plan para evaluar el cumplimiento.</li>'}</ul>
        </section>
        <section class="panel">
          <h2>Por año</h2>
          <div class="table-wrap" style="max-height:14rem">
            <table>
              <thead><tr><th>Año</th><th>Interacción</th><th>Autónomas</th><th>CRE</th></tr></thead>
              <tbody>${anioRows || '<tr><td colspan="4">Sin datos</td></tr>'}</tbody>
            </table>
          </div>
          <h2 style="margin-top:1rem">Por área</h2>
          <div class="table-wrap" style="max-height:14rem">
            <table>
              <thead><tr><th>Área</th><th>Interacción</th><th>Prácticas</th><th>CRE</th></tr></thead>
              <tbody>${areaRows || '<tr><td colspan="4">Sin datos</td></tr>'}</tbody>
            </table>
          </div>
        </section>
      </div>
      <footer class="site">
        Marco: Res. 788-CS-2026 (CRE UCCuyo) · RESOL-2025-556 (SACAU).
        Las descargas Word / PDF / CSV están siempre arriba.
      </footer>
    `;
    updateExportState();
  }

  function usePlan(next, message, step = 2, opts = {}) {
    plan = ensureDuracion(next);
    showError("");
    showInfo(message || "");
    render({ skipSync: true });
    updateExportState();
    setStep(step, opts);
  }

  function requireMaterias(actionLabel) {
    if (hasMaterias()) return true;
    showError(`No hay materias para ${actionLabel}. Cargá un plan o agregá materias.`);
    setStep(1);
    return false;
  }

  async function onFile(file) {
    if (!file) return;
    showError("");
    showInfo(`Leyendo «${file.name}»…`);
    showProgress({ phase: "start", message: `Analizando «${file.name}»…`, current: 0, total: 1 });
    try {
      const loaded = await SacauParser.loadPlanFromFile(file, {
        knownCatalog,
        onProgress: showProgress,
        maxOcrPages: 40,
      });
      const n = (loaded.asignaturas || []).length;
      if (!n) {
        throw new Error(
          `No se pudieron leer materias de «${file.name}». Probá un CSV con columnas nombre, horas_teoricas, horas_practicas.`
        );
      }
      usePlan(
        loaded,
        `Se cargaron ${n} materias desde «${file.name}». Revisá tipologías y horas; después pasá a «Ver créditos y descargar».`,
        2
      );
    } catch (e) {
      console.error(e);
      showInfo("");
      showError(e.message || String(e));
      setStep(1);
    } finally {
      showProgress(null);
    }
  }

  function addRow() {
    syncPlanFromUi();
    const n = plan.asignaturas.length + 1;
    plan.asignaturas.push({
      codigo: String(n).padStart(2, "0"),
      nombre: "Nueva asignatura",
      anio: plan.duracion_anios || 1,
      area: "OTRA",
      regimen: "S",
      tipologia: "teorica",
      horas_teoricas: 0,
      horas_practicas: 0,
      horas_autonomas_override: null,
      valor_cre_override: null,
      horas_estimadas: false,
      notas: "",
    });
    render({ skipSync: true });
    setStep(2);
  }

  async function onExportDocx() {
    if (!requireMaterias("descargar Word")) return;
    const result = currentConversion();
    if (!result) return;
    try {
      const blob = await SacauExport.exportDocx(result.conv, result.val);
      SacauExport.downloadBlob(blob, `${plan.id || "plan"}_CRE.docx`);
    } catch (e) {
      showError(e.message || String(e));
    }
  }

  function onExportPdf() {
    if (!requireMaterias("descargar PDF")) return;
    const result = currentConversion();
    if (!result) return;
    try {
      const blob = SacauExport.exportPdf(result.conv, result.val);
      SacauExport.downloadBlob(blob, `${plan.id || "plan"}_CRE.pdf`);
    } catch (e) {
      showError(e.message || String(e));
    }
  }

  function onExportCsv() {
    if (!requireMaterias("descargar CSV")) return;
    const result = currentConversion();
    if (!result) return;
    const blob = new Blob([SacauEngine.toCsv(result.conv)], { type: "text/csv;charset=utf-8" });
    SacauExport.downloadBlob(blob, `${plan.id || "plan"}_CRE.csv`);
  }

  try {
    const [tipsRaw, uccuyo, conocidos] = await Promise.all([
      loadJson("data/tipologias.json"),
      loadJson("data/normas_uccuyo.json"),
      loadJson("data/planes_reconocidos.json"),
    ]);
    tipologiasMap = tipologiasFromRaw(tipsRaw);
    normasUccuyo = uccuyo;
    knownCatalog = conocidos;
    $("#valorCre").value = uccuyo.cre_default || 25;

    document.querySelectorAll(".step").forEach((btn) => {
      btn.addEventListener("click", () => {
        const n = Number(btn.dataset.step);
        showError("");
        if (n === 3) render({ skipSync: false });
        if (n === 1 && hasMaterias()) {
          showInfo(
            `Tenés ${plan.asignaturas.length} materias cargadas. Subí otro archivo para reemplazarlas o seguí editando abajo.`
          );
        }
        setStep(n);
      });
    });

    $("#filePlan").addEventListener("change", (ev) => {
      const f = ev.target.files && ev.target.files[0];
      onFile(f);
      ev.target.value = "";
    });
    $("#btnClearPlan").addEventListener("click", () => {
      usePlan(
        SacauParser.emptyPlan(),
        "Plan borrado. Los apartados quedan en blanco listos para un archivo nuevo.",
        1
      );
    });
    const btnBack = $("#btnBackToLoad");
    if (btnBack) {
      btnBack.addEventListener("click", () => {
        showError("");
        showInfo("Subí un archivo arriba. El plan actual se mantiene hasta que cargues uno nuevo.");
        setStep(1);
      });
    }
    $("#btnAddRow").addEventListener("click", addRow);
    $("#btnRecalc").addEventListener("click", () => {
      render({ skipSync: false });
      setStep(3);
      showInfo(
        hasMaterias()
          ? "Créditos actualizados. Podés descargar Word, PDF o CSV arriba."
          : "Todavía no hay materias: cargá un archivo o agregá filas."
      );
    });
    $("#valorCre").addEventListener("change", () => render({ skipSync: false }));
    $("#redondeo").addEventListener("change", () => render({ skipSync: false }));
    $("#btnDocx").addEventListener("click", onExportDocx);
    $("#btnPdf").addEventListener("click", onExportPdf);
    $("#btnCsv").addEventListener("click", onExportCsv);

    usePlan(
      SacauParser.emptyPlan(),
      "Elegí el archivo del plan. Abajo ya ves tipologías, tabla y totales en blanco.",
      1,
      { scroll: false }
    );
  } catch (e) {
    console.error(e);
    showError(e.message || String(e));
    decideEl.textContent = "No se pudo iniciar el convertidor.";
    resultEl.textContent = "";
  }
})();
