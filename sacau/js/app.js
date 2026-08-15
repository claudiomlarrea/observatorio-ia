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
  const anexoEl = $("#app-anexo-911");
  const progressEl = $("#progress");
  const progressLabel = $("#progressLabel");
  const progressBar = $("#progressBar");

  let currentStep = 1;
  let tipologiasMap = {};
  let normasUccuyo = {};
  let normasPsicologia = null;
  let knownCatalog = null;
  let plantillas911 = null;
  let plan = null;
  let anexoUiBound = false;

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

  function tipoCarreraActual() {
    const el = $("#tipoCarrera");
    return (el && el.value) || (plan && plan.tipo_carrera) || "grado";
  }

  function syncTipoCarreraFromPlan() {
    const el = $("#tipoCarrera");
    if (!el || !plan) return;
    if (plan.tipo_carrera && el.querySelector(`option[value="${plan.tipo_carrera}"]`)) {
      el.value = plan.tipo_carrera;
      return;
    }
    if (plan.carrera_clave === "psicologia") el.value = "art43";
  }

  function tipologiasFromRaw(raw) {
    const map = {};
    for (const t of raw.tipologias || []) map[t.id] = t;
    return map;
  }

  function ensureAnexo() {
    if (!plan) return null;
    plan.metadata = plan.metadata || {};
    if (!plan.metadata.anexo_911) {
      plan.metadata.anexo_911 = SacauAnexo911.emptyAnexo(plantillas911);
    }
    return plan.metadata.anexo_911;
  }

  function syncAnexoFromUi() {
    if (!plan || !anexoEl) return;
    const anexo = ensureAnexo();
    anexoEl.querySelectorAll("textarea[data-anexo]").forEach((ta) => {
      anexo[ta.getAttribute("data-anexo")] = ta.value;
    });
    anexo._meta = anexo._meta || {};
    anexo._meta.editado_por_usuario = true;
    const incl = $("#incluirAnexo911");
    plan.metadata.incluir_anexo_911 = !incl || incl.checked;
  }

  function renderAnexo() {
    if (!anexoEl || !plantillas911) return;
    const anexo = ensureAnexo();
    const fields = SacauAnexo911.fields(plantillas911);
    anexoEl.innerHTML = fields
      .map(
        (f) => `<div class="anexo-field">
          <label for="anexo-${f.id}">${f.label}</label>
          <span class="ayuda">${f.ayuda || ""}</span>
          <textarea id="anexo-${f.id}" data-anexo="${f.id}" rows="10"></textarea>
        </div>`
      )
      .join("");
    fields.forEach((f) => {
      const ta = anexoEl.querySelector(`#anexo-${f.id}`);
      if (ta) ta.value = anexo[f.id] || "";
    });
    const incl = $("#incluirAnexo911");
    if (incl) incl.checked = plan.metadata.incluir_anexo_911 !== false;
    if (!anexoUiBound) {
      anexoEl.addEventListener("change", () => syncAnexoFromUi());
      anexoEl.addEventListener("input", () => {
        if (plan?.metadata?.anexo_911?._meta) plan.metadata.anexo_911._meta.editado_por_usuario = true;
      });
      anexoUiBound = true;
    }
  }

  function generarAnexo911(force) {
    if (!plan || !plantillas911) {
      showError("Cargá un plan antes de generar el anexo 911.");
      return;
    }
    syncAnexoFromUi();
    const existing = plan.metadata?.anexo_911;
    if (
      !force &&
      existing &&
      existing._meta?.editado_por_usuario &&
      Object.values(existing).some((v) => typeof v === "string" && v.trim())
    ) {
      const ok = window.confirm(
        "El anexo ya tiene texto editado. ¿Regenerar el borrador y reemplazar el contenido actual?"
      );
      if (!ok) return;
    }
    const conv = SacauEngine.convertPlan(plan, optionsFromUi());
    plan.metadata = plan.metadata || {};
    plan.metadata.anexo_911 = SacauAnexo911.buildDraft(
      plantillas911,
      plan,
      conv,
      tipoCarreraActual()
    );
    plan.metadata.incluir_anexo_911 = true;
    renderAnexo();
    showInfo("Borrador del anexo 911 generado. Revisalo y adaptalo a tu carrera.");
  }

  function optionsFromUi() {
    return {
      valor_cre_default: Number($("#valorCre").value || 25),
      // Política fija: CRE enteros; el total = suma de asignaturas.
      redondeo_cre: 1,
      tipologias: tipologiasMap,
    };
  }

  function fmtCre(n) {
    return SacauEngine.formatCre(n, 1);
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

  const TIPOLOGIA_SHORT = {
    teorica: "Teórica",
    taller: "Taller",
    practica_supervisada: "Práctica",
    pps: "PPS",
    tif: "TIF",
    optativa: "Optativa",
  };

  function tipologiaOptions(selected) {
    return Object.keys(tipologiasMap)
      .map((id) => {
        const label = TIPOLOGIA_SHORT[id] || tipologiasMap[id]?.nombre || id;
        return `<option value="${id}" ${id === selected ? "selected" : ""}>${label}</option>`;
      })
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
    if (!opts.skipSync) {
      syncPlanFromUi();
      syncAnexoFromUi();
    }
    if (!plan) return null;
    ensureDuracion(plan);
    plan.tipo_carrera = tipoCarreraActual();
    const conv = SacauEngine.convertPlan(plan, optionsFromUi());
    const val = SacauEngine.validatePlan(
      conv,
      normasUccuyo,
      normasPsicologia,
      plan.tipo_carrera
    );
    window.__lastConv = conv;
    window.__lastVal = val;
    return { conv, val };
  }

  const CRE_AFFECTING_FIELDS = new Set([
    "anio",
    "area",
    "regimen",
    "tipologia",
    "horas_teoricas",
    "horas_practicas",
    "horas_autonomas_override",
    "valor_cre_override",
  ]);

  let autoRecalcTimer = null;
  let decideDelegatesBound = false;
  const CRE_FLASH_MS = 4000;
  /** Flashes activos por clave estable (sobreviven a repaints del DOM). */
  const creFlashActive = new Map();
  let creFlashSweepTimer = null;

  function isTipologiaPractica(tip) {
    const t = String(tip || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    return (
      t === "practica_supervisada" ||
      t === "pps" ||
      t.startsWith("practic") ||
      t.includes("practica")
    );
  }

  function sumCrePracticas(items) {
    return (items || []).reduce((acc, item) => {
      if (isTipologiaPractica(item.asignatura?.tipologia)) {
        return acc + Number(item.cre || 0);
      }
      return acc;
    }, 0);
  }

  function snapshotCreState(conv) {
    if (!conv) return null;
    const byAnio = {};
    const groupedAnio = SacauEngine.groupBy(conv.items, (i) => Number(i.asignatura.anio || 1));
    for (const anio of Object.keys(groupedAnio)) {
      byAnio[anio] = SacauEngine.computeTotales(groupedAnio[anio], 1).cre;
    }
    const byArea = {};
    const groupedArea = SacauEngine.groupBy(conv.items, (i) => String(i.asignatura.area || "—"));
    for (const area of Object.keys(groupedArea)) {
      const items = groupedArea[area];
      byArea[area] = {
        cre: SacauEngine.computeTotales(items).cre,
        crePrac: Math.round(sumCrePracticas(items)),
      };
    }
    return {
      total: Number(conv.totales.cre),
      anual: Number(conv.totales.cre_promedio_anual),
      byAnio,
      byArea,
      rows: conv.items.map((i) => Number(i.cre)),
    };
  }

  function registerCreFlash(key, oldVal, newVal) {
    const prev = Number(oldVal);
    const next = Number(newVal);
    if (!Number.isFinite(prev) || !Number.isFinite(next) || prev === next) return;
    creFlashActive.set(key, {
      dir: next > prev ? "up" : "down",
      until: Date.now() + CRE_FLASH_MS,
    });
  }

  function resolveFlashEl(key) {
    if (key === "metric:total") return document.getElementById("metricCreTotal");
    if (key === "metric:anual") return document.getElementById("metricCreAnual");
    if (key === "resumen") return document.querySelector("#resumenRapido .cre-flash");
    if (key.startsWith("row:")) {
      const i = Number(key.slice(4));
      const rows = document.querySelectorAll("#tablaAsig tbody tr:not(.empty-row)");
      return rows[i]?.querySelector(".cell-cre") || null;
    }
    if (key.startsWith("anio:")) {
      const anio = key.slice(5);
      return document.querySelector(`#tablaPorAnio tr[data-anio="${anio}"] .cre-cell`);
    }
    if (key.startsWith("area-prac:")) {
      const area = key.slice(10);
      return document.querySelectorAll(`#tablaPorArea tr[data-area="${area}"] .cre-cell`)[0] || null;
    }
    if (key.startsWith("area-cre:")) {
      const area = key.slice(9);
      return document.querySelectorAll(`#tablaPorArea tr[data-area="${area}"] .cre-cell`)[1] || null;
    }
    return null;
  }

  function pruneExpiredCreFlashes() {
    const now = Date.now();
    for (const [key, info] of creFlashActive) {
      if (!info || info.until <= now) creFlashActive.delete(key);
    }
  }

  function paintActiveCreFlashes() {
    pruneExpiredCreFlashes();
    const now = Date.now();
    let remainingMs = 0;
    for (const [key, info] of creFlashActive) {
      const el = resolveFlashEl(key);
      if (!el) continue;
      el.classList.remove("cre-delta-up", "cre-delta-down");
      el.classList.add(info.dir === "up" ? "cre-delta-up" : "cre-delta-down");
      remainingMs = Math.max(remainingMs, info.until - now);
    }
    if (creFlashSweepTimer) clearTimeout(creFlashSweepTimer);
    if (remainingMs > 0) {
      creFlashSweepTimer = window.setTimeout(() => {
        creFlashSweepTimer = null;
        // Quitar clases vencidas y reaplicar las que sigan activas.
        document
          .querySelectorAll(".cre-delta-up, .cre-delta-down")
          .forEach((el) => el.classList.remove("cre-delta-up", "cre-delta-down"));
        paintActiveCreFlashes();
      }, remainingMs + 30);
    }
  }

  function registerCreFlashesFromDelta(conv, prev) {
    if (!conv || !prev) return;
    registerCreFlash("metric:total", prev.total, conv.totales.cre);
    registerCreFlash("metric:anual", prev.anual, conv.totales.cre_promedio_anual);
    registerCreFlash("resumen", prev.total, conv.totales.cre);

    conv.items.forEach((item, i) => {
      registerCreFlash(`row:${i}`, prev.rows[i], item.cre);
    });

    const byAnio = SacauEngine.groupBy(conv.items, (i) => Number(i.asignatura.anio || 1));
    for (const anio of Object.keys(byAnio)) {
      const cre = SacauEngine.computeTotales(byAnio[anio], 1).cre;
      registerCreFlash(`anio:${anio}`, prev.byAnio[anio], cre);
    }

    const byArea = SacauEngine.groupBy(conv.items, (i) => String(i.asignatura.area || "—"));
    for (const area of Object.keys(byArea)) {
      const items = byArea[area];
      const cre = SacauEngine.computeTotales(items).cre;
      const crePrac = Math.round(sumCrePracticas(items));
      registerCreFlash(`area-prac:${area}`, prev.byArea[area]?.crePrac, crePrac);
      registerCreFlash(`area-cre:${area}`, prev.byArea[area]?.cre, cre);
    }
  }

  function buildResultsHtml(conv, val) {
    const t = conv.totales;
    const byAnio = SacauEngine.groupBy(conv.items, (i) => Number(i.asignatura.anio || 1));
    const byArea = SacauEngine.groupBy(conv.items, (i) => String(i.asignatura.area || "—"));

    const anioRows = Object.keys(byAnio)
      .sort((a, b) => Number(a) - Number(b))
      .map((anio) => {
        const tot = SacauEngine.computeTotales(byAnio[anio], 1);
        return `<tr data-anio="${anio}"><td>${anio}</td><td>${tot.horas_interaccion.toFixed(0)}</td><td>${tot.horas_autonomas.toFixed(0)}</td><td class="cre-cell">${fmtCre(tot.cre)}</td></tr>`;
      })
      .join("");

    const areaRows = Object.keys(byArea)
      .sort()
      .map((area) => {
        const items = byArea[area];
        const tot = SacauEngine.computeTotales(items);
        const crePrac = Math.round(sumCrePracticas(items));
        return `<tr data-area="${area}"><td>${area}</td><td>${tot.horas_interaccion.toFixed(0)}</td><td class="cre-cell">${fmtCre(crePrac)}</td><td class="cre-cell">${fmtCre(tot.cre)}</td></tr>`;
      })
      .join("");

    const checkLis = val.checks
      .map(
        (c) =>
          `<li class="${c.nivel}">${c.nivel === "ok" ? "✅" : c.nivel === "warning" ? "⚠️" : "❌"} ${c.mensaje}</li>`
      )
      .join("");

    return `
      <div class="metrics" id="metricsCre">
        <div class="metric"><div class="label">Interacción</div><div class="value" id="metricInter">${t.horas_interaccion.toLocaleString("es-AR", { maximumFractionDigits: 0 })} h</div></div>
        <div class="metric"><div class="label">Autónomas</div><div class="value" id="metricAuto">${t.horas_autonomas.toLocaleString("es-AR", { maximumFractionDigits: 0 })} h</div></div>
        <div class="metric"><div class="label">Totales estudiante</div><div class="value" id="metricTot">${t.horas_totales.toLocaleString("es-AR", { maximumFractionDigits: 0 })} h</div></div>
        <div class="metric"><div class="label">CRE totales</div><div class="value" id="metricCreTotal">${fmtCre(t.cre)}</div></div>
        <div class="metric"><div class="label">CRE / año</div><div class="value" id="metricCreAnual">${Number.isFinite(t.cre_promedio_anual) ? fmtCre(t.cre_promedio_anual) : "—"}</div></div>
      </div>
      <div class="grid-2" id="bloquesDesglose">
        <section class="panel" id="panelPorAnio">
          <h2>Por año</h2>
          <div class="table-wrap" style="max-height:16rem">
            <table id="tablaPorAnio">
              <thead><tr><th>Año</th><th>Interacción</th><th>Autónomas</th><th>CRE</th></tr></thead>
              <tbody id="bodyPorAnio">${anioRows || '<tr><td colspan="4">Sin datos</td></tr>'}</tbody>
            </table>
          </div>
        </section>
        <section class="panel" id="panelPorArea">
          <h2>Por área</h2>
          <div class="table-wrap" style="max-height:16rem">
            <table id="tablaPorArea">
              <thead>
                <tr>
                  <th>Área</th>
                  <th>Interacción</th>
                  <th title="Suma de CRE de asignaturas con tipología práctica supervisada o PPS">CRE prácticas</th>
                  <th>CRE</th>
                </tr>
              </thead>
              <tbody id="bodyPorArea">${areaRows || '<tr><td colspan="4">Sin datos</td></tr>'}</tbody>
            </table>
          </div>
          <p class="note" style="margin:0.5rem 0 0">
            <strong>CRE prácticas</strong> = créditos de materias con tipología
            «práctica supervisada» o «PPS» (no las horas de la columna Prác. de la tabla).
          </p>
        </section>
      </div>
      <section class="panel" style="margin-top:1rem">
        <h2>Cumplimiento SACAU</h2>
        <p class="note" style="margin-top:0">
          Umbrales según tipo de carrera «${(normasUccuyo.tipos_carrera || {})[tipoCarreraActual()]?.label || tipoCarreraActual()}».
          ${normasUccuyo.nota_autonomas ? `<br/><span class="muted-sm">${normasUccuyo.nota_autonomas}</span>` : ""}
        </p>
        <ul class="checks">${checkLis || '<li class="warning">⚠️ Cargá un plan para evaluar el cumplimiento.</li>'}</ul>
      </section>
      <footer class="site">
        Marco: Res. 788-CS-2026 (CRE UCCuyo) · Res. 911-CS-2026 · RESOL-2025-556 (SACAU).
        Normativa disponible arriba en «Biblioteca normativa».
        Las descargas Word / PDF / CSV están siempre arriba.
      </footer>
    `;
  }

  function paintResults(conv, val, prevCre) {
    const root = document.getElementById("app-resultado");
    if (!root) return;
    root.classList.remove("loading");
    root.innerHTML = buildResultsHtml(conv, val);
    root.dataset.creTotal = String(conv.totales.cre);
    root.dataset.updatedAt = String(Date.now());
    if (prevCre) registerCreFlashesFromDelta(conv, prevCre);
    paintActiveCreFlashes();
  }

  /** Recalcula CRE y refresca totales sin recrear los inputs de la tabla. */
  function refreshComputedViews() {
    try {
      syncPlanFromUi();
      syncAnexoFromUi();
      if (!plan) return null;
      ensureDuracion(plan);
      plan.tipo_carrera = tipoCarreraActual();
      const prevCre = snapshotCreState(window.__lastConv);
      const conv = SacauEngine.convertPlan(plan, optionsFromUi());
      const val = SacauEngine.validatePlan(
        conv,
        normasUccuyo,
        normasPsicologia,
        plan.tipo_carrera
      );
      window.__lastConv = conv;
      window.__lastVal = val;

      if (prevCre) registerCreFlashesFromDelta(conv, prevCre);

      const rows = [...document.querySelectorAll("#tablaAsig tbody tr:not(.empty-row)")];
      conv.items.forEach((item, i) => {
        const tr = rows[i];
        if (!tr) return;
        const inter = tr.querySelector(".cell-inter");
        const aut = tr.querySelector(".cell-aut");
        const cre = tr.querySelector(".cell-cre");
        if (inter) inter.textContent = item.horas_interaccion.toFixed(0);
        if (aut) aut.textContent = item.horas_autonomas.toFixed(0);
        if (cre) cre.innerHTML = `<strong>${fmtCre(item.cre)}</strong>`;
      });

      const resumen = document.getElementById("resumenRapido");
      if (resumen) {
        const t = conv.totales;
        resumen.innerHTML = `<strong>${plan.asignaturas.length}</strong> materias · Interacción <strong>${t.horas_interaccion.toFixed(0)} h</strong> · CRE estimado <strong class="cre-flash">${fmtCre(t.cre)}</strong>`;
      }

      // Reaplica flashes activos tras regenerar el HTML de resultados.
      paintResults(conv, val, null);

      if (plan.metadata?.anexo_911) {
        plan.metadata.anexo_911 = SacauAnexo911.refreshDespliegue(
          plan.metadata.anexo_911,
          plan,
          conv
        );
        renderAnexo();
      }
      updateExportState();
      return { conv, val };
    } catch (err) {
      console.error("refreshComputedViews", err);
      return null;
    }
  }

  function scheduleAutoRecalc() {
    if (autoRecalcTimer) clearTimeout(autoRecalcTimer);
    autoRecalcTimer = setTimeout(() => {
      autoRecalcTimer = null;
      refreshComputedViews();
    }, 60);
  }

  function bindDecideDelegates() {
    if (decideDelegatesBound) return;
    decideDelegatesBound = true;

    decideEl.addEventListener("input", (ev) => {
      const el = ev.target;
      if (!(el instanceof HTMLElement)) return;
      if (el.matches(".tip-ratio, .tip-fijas")) {
        const id = el.getAttribute("data-tip");
        if (id && tipologiasMap[id]) {
          if (el.classList.contains("tip-ratio")) tipologiasMap[id].ratio_autonomo = Number(el.value || 0);
          else tipologiasMap[id].autonomas_fijas = Number(el.value || 0);
        }
        scheduleAutoRecalc();
        return;
      }
      const field = el.getAttribute("data-f");
      if (field && CRE_AFFECTING_FIELDS.has(field)) scheduleAutoRecalc();
    });

    decideEl.addEventListener("change", (ev) => {
      const el = ev.target;
      if (!(el instanceof HTMLElement)) return;
      if (el.matches(".tip-ratio, .tip-fijas")) {
        const id = el.getAttribute("data-tip");
        if (id && tipologiasMap[id]) {
          if (el.classList.contains("tip-ratio")) tipologiasMap[id].ratio_autonomo = Number(el.value || 0);
          else tipologiasMap[id].autonomas_fijas = Number(el.value || 0);
        }
        scheduleAutoRecalc();
        return;
      }
      const field = el.getAttribute("data-f");
      if (!field) return;
      if (CRE_AFFECTING_FIELDS.has(field)) scheduleAutoRecalc();
      else syncPlanFromUi();
    });

    decideEl.addEventListener("click", (ev) => {
      const btn = ev.target instanceof Element ? ev.target.closest(".btn-del") : null;
      if (!btn || !decideEl.contains(btn)) return;
      btn.closest("tr")?.remove();
      syncPlanFromUi();
      render({ skipSync: true });
    });
  }

  function render(opts = {}) {
    const result = currentConversion(opts);
    if (!result) return;
    const { conv, val } = result;
    const t = conv.totales;

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
          <td class="cell-inter">${item.horas_interaccion.toFixed(0)}</td>
          <td class="cell-aut">${item.horas_autonomas.toFixed(0)}</td>
          <td class="cell-cre"><strong>${fmtCre(item.cre)}</strong></td>
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
        ? "Los créditos se recalculan solos al editar. Las descargas están arriba en cualquier momento."
        : "Todavía no hay asignaturas. Subí un archivo arriba o usá «Agregar asignatura».");

    decideEl.classList.remove("loading");
    decideEl.innerHTML = `
      <div class="grid-2">
        <section class="panel">
          <div class="panel-head">
            <h2>Cómo estimar el trabajo autónomo</h2>
            <a
              class="btn-instructivo btn-sm"
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
          <p id="resumenRapido" class="note" style="margin:0 0 0.5rem"><strong>${plan.asignaturas.length}</strong> materias · Interacción <strong>${t.horas_interaccion.toFixed(0)} h</strong> · CRE estimado <strong class="cre-flash">${fmtCre(t.cre)}</strong></p>
          <p class="note">${resumenNota}</p>
        </section>
      </div>
      <section class="panel panel-asignaturas">
        <div class="panel-head">
          <h2>${plan.nombre || "Asignaturas del plan"}</h2>
        </div>
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
    bindDecideDelegates();

    resultEl.classList.remove("loading");
    paintResults(conv, val);
    updateExportState();
    renderAnexo();
  }

  function usePlan(next, message, step = 2, opts = {}) {
    plan = ensureDuracion(next);
    if (!plan.tipo_carrera) {
      plan.tipo_carrera = plan.carrera_clave === "psicologia" ? "art43" : "grado";
    }
    plan.metadata = plan.metadata || {};
    syncTipoCarreraFromPlan();
    showError("");
    showInfo(message || "");
    render({ skipSync: true });
    // Generar borrador 911 si aún no hay texto
    const anexo = plan.metadata.anexo_911;
    const hasText =
      anexo &&
      SacauAnexo911.FIELD_ORDER.some((id) => String(anexo[id] || "").trim());
    if (!hasText && plantillas911 && hasMaterias()) {
      const conv = SacauEngine.convertPlan(plan, optionsFromUi());
      plan.metadata.anexo_911 = SacauAnexo911.buildDraft(
        plantillas911,
        plan,
        conv,
        tipoCarreraActual()
      );
      plan.metadata.incluir_anexo_911 = true;
    }
    renderAnexo();
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
          `No se pudieron leer materias de «${file.name}». ` +
            "El convertidor acepta planes de cualquier universidad, pero necesita una tabla o listado con horas " +
            "(o al menos nombres de materias). Si el PDF solo trae correlatividades sin carga horaria, " +
            "usá la plantilla CSV o un plan que informe horas por asignatura."
        );
      }
      const sinHoras = loaded.asignaturas.filter(
        (a) => Number(a.horas_teoricas || 0) + Number(a.horas_practicas || 0) <= 0
      ).length;
      let msg = `Se cargaron ${n} materias desde «${file.name}». Revisá tipologías y horas; después pasá a «Ver créditos y descargar».`;
      if (sinHoras === n) {
        msg =
          `Se importaron ${n} materias desde «${file.name}», pero el archivo no informa horas. ` +
          "Completá horas teóricas/prácticas en la tabla (o cargá un CSV) para poder calcular CRE.";
      } else if (sinHoras > 0) {
        msg = `Se cargaron ${n} materias (${sinHoras} sin horas). Completá las faltantes antes de calcular CRE.`;
      }
      usePlan(loaded, msg, 2);
      if (window.SacauUsage && typeof window.SacauUsage.recordPlanLoad === "function") {
        window.SacauUsage.recordPlanLoad({ name: file.name, size: file.size });
      }
    } catch (e) {
      console.error(e);
      showInfo("");
      const raw = e && e.message ? String(e.message) : String(e);
      const msg = /detached ArrayBuffer/i.test(raw)
        ? `No se pudo leer «${file.name}» (error interno del lector PDF). Recargá la página e intentá de nuevo; si sigue, usá la plantilla CSV.`
        : raw;
      showError(msg);
      setStep(1);
    } finally {
      showProgress(null);
    }
  }

  function actualizarCreditos() {
    refreshComputedViews();
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
    syncAnexoFromUi();
    const result = currentConversion();
    if (!result) return;
    try {
      const blob = await SacauExport.exportDocx(result.conv, result.val, {
        anexo911: plan.metadata?.incluir_anexo_911 !== false ? plan.metadata?.anexo_911 : null,
        campos911: plantillas911?.campos,
      });
      SacauExport.downloadBlob(blob, `${plan.id || "plan"}_CRE.docx`);
    } catch (e) {
      showError(e.message || String(e));
    }
  }

  function onExportPdf() {
    if (!requireMaterias("descargar PDF")) return;
    syncAnexoFromUi();
    const result = currentConversion();
    if (!result) return;
    try {
      const blob = SacauExport.exportPdf(result.conv, result.val, {
        anexo911: plan.metadata?.incluir_anexo_911 !== false ? plan.metadata?.anexo_911 : null,
        campos911: plantillas911?.campos,
      });
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
    const [tipsRaw, uccuyo, conocidos, psico, plantillas] = await Promise.all([
      loadJson("data/tipologias.json"),
      loadJson("data/normas_uccuyo.json"),
      loadJson("data/planes_reconocidos.json"),
      loadJson("data/normas_psicologia.json"),
      loadJson("data/anexo_911_plantillas.json"),
    ]);
    tipologiasMap = tipologiasFromRaw(tipsRaw);
    normasUccuyo = uccuyo;
    normasPsicologia = psico;
    knownCatalog = conocidos;
    plantillas911 = plantillas;
    $("#valorCre").value = uccuyo.cre_default || 25;

    const tipoEl = $("#tipoCarrera");
    if (tipoEl && uccuyo.tipos_carrera) {
      tipoEl.innerHTML = Object.entries(uccuyo.tipos_carrera)
        .map(([id, cfg]) => `<option value="${id}">${cfg.label || id}</option>`)
        .join("");
      tipoEl.value = "grado";
      tipoEl.addEventListener("change", () => {
        if (plan) plan.tipo_carrera = tipoEl.value;
        render({ skipSync: false });
        renderAnexo();
      });
    }

    $("#btnGenAnexo911")?.addEventListener("click", () => generarAnexo911(false));
    $("#btnClearAnexo911")?.addEventListener("click", () => {
      if (!plan) return;
      plan.metadata = plan.metadata || {};
      plan.metadata.anexo_911 = SacauAnexo911.emptyAnexo(plantillas911);
      plan.metadata.incluir_anexo_911 = false;
      const incl = $("#incluirAnexo911");
      if (incl) incl.checked = false;
      renderAnexo();
      showInfo("Anexo 911 vaciado.");
    });
    $("#incluirAnexo911")?.addEventListener("change", (ev) => {
      if (!plan) return;
      plan.metadata = plan.metadata || {};
      plan.metadata.incluir_anexo_911 = ev.target.checked;
    });

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
    $("#valorCre").addEventListener("change", () => scheduleAutoRecalc());
    $("#valorCre").addEventListener("input", () => scheduleAutoRecalc());
    $("#btnDocx").addEventListener("click", onExportDocx);
    $("#btnPdf").addEventListener("click", onExportPdf);
    $("#btnCsv").addEventListener("click", onExportCsv);

    usePlan(
      SacauParser.emptyPlan(),
      "Elegí el archivo del plan. Abajo ya ves tipologías, tabla y totales en blanco.",
      1,
      { scroll: false }
    );

    // Ejemplo opcional solo con acceso autorizado (para demos guiadas / video).
    const ejemplo = new URLSearchParams(window.location.search).get("ejemplo");
    if (ejemplo === "psicologia") {
      try {
        const raw = await loadJson("data/psicologia_1098.json");
        usePlan(
          raw,
          "Ejemplo: Licenciatura en Psicología (Res. 1098-CS-2013). Revisá tipologías y totales.",
          2,
          { scroll: false }
        );
        setStep(3, { scroll: false });
        render({ skipSync: true });
      } catch (errEj) {
        console.warn("No se pudo cargar el ejemplo de Psicología", errEj);
      }
    }
  } catch (e) {
    console.error(e);
    showError(e.message || String(e));
    decideEl.textContent = "No se pudo iniciar el convertidor.";
    resultEl.textContent = "";
  }
})();
