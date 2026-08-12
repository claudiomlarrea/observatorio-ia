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

  function setStep(n) {
    currentStep = Number(n) || 1;
    document.querySelectorAll(".step").forEach((el) => {
      const s = Number(el.dataset.step);
      el.classList.toggle("active", s === currentStep);
      el.classList.toggle("done", Boolean(plan && plan.asignaturas && plan.asignaturas.length) && s < currentStep);
      el.setAttribute("aria-current", s === currentStep ? "step" : "false");
    });
    for (let i = 1; i <= 3; i++) {
      const panel = document.getElementById(`panel-${i}`);
      if (panel) panel.hidden = i !== currentStep;
    }
    const target = document.getElementById(`panel-${currentStep}`);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
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

  function areaOptions(selected) {
    return ["FB", "FP", "FGC", "FCI", "OTRA"]
      .map((a) => `<option value="${a}" ${a === selected ? "selected" : ""}>${a}</option>`)
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

    const asigRows = conv.items
      .map((item) => {
        const a = item.asignatura;
        const ovA = a.horas_autonomas_override == null ? "" : a.horas_autonomas_override;
        const ovC = a.valor_cre_override == null ? "" : a.valor_cre_override;
        return `<tr>
          <td><input data-f="codigo" value="${a.codigo || ""}" class="narrow" /></td>
          <td><input data-f="nombre" value="${String(a.nombre || "").replace(/"/g, "&quot;")}" style="min-width:14rem" /></td>
          <td><input data-f="anio" type="number" class="narrow" min="1" value="${a.anio}" /></td>
          <td><select data-f="area">${areaOptions(a.area)}</select></td>
          <td><select data-f="regimen"><option ${a.regimen === "A" ? "selected" : ""}>A</option><option ${a.regimen !== "A" ? "selected" : ""}>S</option></select></td>
          <td><select data-f="tipologia">${tipologiaOptions(a.tipologia)}</select></td>
          <td><input data-f="horas_teoricas" type="number" class="narrow" min="0" value="${a.horas_teoricas}" /></td>
          <td><input data-f="horas_practicas" type="number" class="narrow" min="0" value="${a.horas_practicas}" /></td>
          <td><input data-f="horas_autonomas_override" type="number" class="narrow" min="0" value="${ovA}" placeholder="auto" /></td>
          <td><input data-f="valor_cre_override" type="number" class="narrow" min="25" max="30" value="${ovC}" placeholder="25" /></td>
          <td>${item.horas_interaccion.toFixed(0)}</td>
          <td>${item.horas_autonomas.toFixed(0)}</td>
          <td><strong>${item.cre.toFixed(1)}</strong></td>
          <td>
            <button type="button" class="btn-secondary btn-del" title="Quitar esta materia">Quitar</button>
            <input type="hidden" data-f="horas_estimadas" value="${a.horas_estimadas ? "1" : "0"}" />
            <input type="hidden" data-f="notas" value="${String(a.notas || "").replace(/"/g, "&quot;")}" />
          </td>
        </tr>`;
      })
      .join("");

    decideEl.classList.remove("loading");
    decideEl.innerHTML = `
      <div class="grid-2">
        <section class="panel">
          <h2>Cómo estimar el trabajo autónomo</h2>
          <div class="table-wrap" style="max-height:14rem">
            <table>
              <thead><tr><th>Tipo</th><th>Descripción</th><th>Ratio</th><th>Horas fijas</th></tr></thead>
              <tbody>${tipRows}</tbody>
            </table>
          </div>
          <p class="note">Horas autónomas ≈ horas de clase × ratio + horas fijas. Podés corregir materia por materia en la tabla.</p>
        </section>
        <section class="panel">
          <h2>Resumen rápido</h2>
          <p class="note" style="margin:0 0 0.5rem"><strong>${plan.asignaturas.length}</strong> materias · Interacción <strong>${t.horas_interaccion.toFixed(0)} h</strong> · CRE estimado <strong>${t.cre.toFixed(1)}</strong></p>
          <p class="note">${plan.metadata?.advertencia || "Revisá tipología, horas y overrides. Después andá al paso 3 para descargar."}</p>
        </section>
      </div>
      <section class="panel">
        <h2>${plan.nombre || "Materias del plan"}</h2>
        <div class="table-wrap">
          <table id="tablaAsig">
            <thead>
              <tr>
                <th>Cód.</th><th>Materia</th><th>Año</th><th>Área</th><th>Rég.</th><th>Tipo</th>
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
        <div class="metric"><div class="label">CRE / año</div><div class="value">${t.cre_promedio_anual.toFixed(1)}</div></div>
      </div>
      <div class="grid-2">
        <section class="panel">
          <h2>Cumplimiento SACAU</h2>
          <ul class="checks">${checkLis}</ul>
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
        Hacé clic en «1. Cargar plan» si querés subir otro archivo.
      </footer>
    `;
  }

  function usePlan(next, message, step = 2) {
    plan = ensureDuracion(next);
    showError("");
    showInfo(message || "");
    render({ skipSync: true });
    setStep(step);
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
      nombre: "Nueva materia",
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
        // Siempre se puede volver al paso 1 (cargar otro archivo).
        if (n === 1) {
          showError("");
          if (plan && plan.asignaturas && plan.asignaturas.length) {
            showInfo(
              `Tenés ${plan.asignaturas.length} materias cargadas. Subí otro archivo para reemplazarlas, o volvé al paso 2 para seguir editando.`
            );
          }
          setStep(1);
          return;
        }
        if (!plan || !plan.asignaturas.length) {
          showError("Primero cargá un plan en el paso 1 (Word, PDF o CSV).");
          setStep(1);
          return;
        }
        if (n === 3) render({ skipSync: false });
        setStep(n);
        showError("");
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
        "Plan borrado. Subí un archivo nuevo o agregá materias a mano en el paso 2.",
        1
      );
    });
    const btnBack = $("#btnBackToLoad");
    if (btnBack) {
      btnBack.addEventListener("click", () => {
        showError("");
        showInfo("Podés subir otro archivo. El plan actual se mantiene hasta que cargues uno nuevo.");
        setStep(1);
      });
    }
    $("#btnAddRow").addEventListener("click", addRow);
    $("#btnRecalc").addEventListener("click", () => {
      if (!plan || !plan.asignaturas.length) {
        showError("No hay materias para calcular. Cargá un plan o agregá materias.");
        setStep(1);
        return;
      }
      render({ skipSync: false });
      setStep(3);
      showInfo("Créditos actualizados con tus ajustes.");
    });
    $("#valorCre").addEventListener("change", () => render({ skipSync: false }));
    $("#redondeo").addEventListener("change", () => render({ skipSync: false }));
    $("#btnDocx").addEventListener("click", onExportDocx);
    $("#btnPdf").addEventListener("click", onExportPdf);
    $("#btnCsv").addEventListener("click", onExportCsv);

    usePlan(
      SacauParser.emptyPlan(),
      "Paso 1: elegí el archivo de tu plan de estudios (Word, PDF o CSV).",
      1
    );
  } catch (e) {
    console.error(e);
    showError(e.message || String(e));
    decideEl.textContent = "No se pudo iniciar el convertidor.";
    resultEl.textContent = "";
  }
})();
