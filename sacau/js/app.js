/**
 * UI Convertidor SACAU — carga Word/PDF y exportación CRE
 */
(async function () {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const errEl = $("#error");
  const infoEl = $("#info");
  const appEl = $("#app");

  function showError(msg) {
    errEl.hidden = !msg;
    errEl.textContent = msg || "";
  }

  function showInfo(msg) {
    infoEl.hidden = !msg;
    infoEl.textContent = msg || "";
  }

  function setStep(n) {
    document.querySelectorAll(".step").forEach((el) => {
      el.classList.toggle("active", Number(el.dataset.step) === n);
    });
  }

  async function loadJson(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`No se pudo cargar ${path} (${res.status})`);
    return res.json();
  }

  let tipologiasMap = {};
  let normasUccuyo = {};
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
    return rows.map((tr) => {
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
    }).filter((a) => (a.nombre || "").trim());
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
    plan.asignaturas = readAsignaturasFromTable();
    return ensureDuracion(plan);
  }

  function currentConversion() {
    const p = syncPlanFromUi();
    if (!p) return null;
    const conv = SacauEngine.convertPlan(p, optionsFromUi());
    const val = SacauEngine.validatePlan(conv, normasUccuyo, null);
    window.__lastConv = conv;
    window.__lastVal = val;
    return { conv, val };
  }

  function render() {
    const result = currentConversion();
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
            <button type="button" class="btn-secondary btn-del" title="Eliminar">×</button>
            <input type="hidden" data-f="horas_estimadas" value="${a.horas_estimadas ? "1" : "0"}" />
            <input type="hidden" data-f="notas" value="${String(a.notas || "").replace(/"/g, "&quot;")}" />
          </td>
        </tr>`;
      })
      .join("");

    appEl.classList.remove("loading");
    appEl.innerHTML = `
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
          <h2>Coeficientes de trabajo autónomo</h2>
          <div class="table-wrap" style="max-height:14rem">
            <table>
              <thead><tr><th>Id</th><th>Nombre</th><th>Ratio</th><th>Fijas</th></tr></thead>
              <tbody>${tipRows}</tbody>
            </table>
          </div>
          <p class="note">Autónomas ≈ interacción × ratio + fijas, salvo override por materia. Ajustá según el criterio de la carrera.</p>
        </section>
      </div>

      <div class="grid-2">
        <section class="panel">
          <h2>Por año</h2>
          <div class="table-wrap" style="max-height:12rem">
            <table>
              <thead><tr><th>Año</th><th>Interacción</th><th>Autónomas</th><th>CRE</th></tr></thead>
              <tbody>${anioRows || '<tr><td colspan="4">Sin datos</td></tr>'}</tbody>
            </table>
          </div>
        </section>
        <section class="panel">
          <h2>Por área</h2>
          <div class="table-wrap" style="max-height:12rem">
            <table>
              <thead><tr><th>Área</th><th>Interacción</th><th>Prácticas</th><th>CRE</th></tr></thead>
              <tbody>${areaRows || '<tr><td colspan="4">Sin datos</td></tr>'}</tbody>
            </table>
          </div>
        </section>
      </div>

      <section class="panel">
        <h2>${plan.nombre || "Plan de estudios"}</h2>
        <p class="note">${plan.metadata?.advertencia || "Editá tipología, horas autónomas y valor CRE por asignatura según tus criterios curriculares."}</p>
        <div class="table-wrap">
          <table id="tablaAsig">
            <thead>
              <tr>
                <th>Cód.</th><th>Asignatura</th><th>Año</th><th>Área</th><th>Rég.</th><th>Tipo</th>
                <th>Teó.</th><th>Prác.</th><th>Aut. ov.</th><th>CRE ov.</th>
                <th>Inter.</th><th>Aut.</th><th>CRE</th><th></th>
              </tr>
            </thead>
            <tbody>${asigRows}</tbody>
          </table>
        </div>
      </section>

      <footer class="site">
        Marco: Res. 788-CS-2026 (CRE UCCuyo) · RESOL-2025-556 (SACAU).
        Los PDF escaneados pueden requerir carga manual o CSV.
      </footer>
    `;

    appEl.querySelectorAll(".tip-ratio, .tip-fijas").forEach((el) => {
      el.addEventListener("change", () => {
        const id = el.getAttribute("data-tip");
        if (!tipologiasMap[id]) return;
        if (el.classList.contains("tip-ratio")) tipologiasMap[id].ratio_autonomo = Number(el.value || 0);
        else tipologiasMap[id].autonomas_fijas = Number(el.value || 0);
        setStep(2);
        render();
      });
    });

    appEl.querySelectorAll(".btn-del").forEach((btn) => {
      btn.addEventListener("click", () => {
        btn.closest("tr")?.remove();
        setStep(2);
        render();
      });
    });
  }

  function usePlan(next, message, step = 2) {
    plan = ensureDuracion(next);
    showError("");
    showInfo(message || "");
    setStep(step);
    render();
  }

  async function onFile(file) {
    if (!file) return;
    showError("");
    showInfo("Leyendo archivo…");
    setStep(1);
    try {
      const loaded = await SacauParser.loadPlanFromFile(file);
      const n = loaded.asignaturas.length;
      usePlan(
        loaded,
        n
          ? `Se detectaron ${n} asignaturas en «${file.name}». Revisá tipologías, años y horas; luego descargá Word o PDF.`
          : `No se detectaron filas automáticamente en «${file.name}». Usá «+ Asignatura» o cargá un CSV con columnas nombre, horas_teoricas, horas_practicas.`
      );
    } catch (e) {
      console.error(e);
      showInfo("");
      showError(e.message || String(e));
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
    setStep(2);
    render();
  }

  async function onExportDocx() {
    const result = currentConversion();
    if (!result) return;
    try {
      const blob = await SacauExport.exportDocx(result.conv, result.val);
      SacauExport.downloadBlob(blob, `${plan.id || "plan"}_CRE.docx`);
      setStep(3);
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
      setStep(3);
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
    const [tipsRaw, uccuyo] = await Promise.all([
      loadJson("data/tipologias.json"),
      loadJson("data/normas_uccuyo.json"),
    ]);
    tipologiasMap = tipologiasFromRaw(tipsRaw);
    normasUccuyo = uccuyo;
    $("#valorCre").value = uccuyo.cre_default || 25;

    $("#filePlan").addEventListener("change", (ev) => {
      const f = ev.target.files && ev.target.files[0];
      onFile(f);
    });
    $("#btnBlank").addEventListener("click", () => {
      $("#filePlan").value = "";
      usePlan(
        SacauParser.emptyPlan(),
        "Plan en blanco: cargá un archivo o agregá asignaturas a mano.",
        1
      );
    });
    $("#btnAddRow").addEventListener("click", addRow);
    $("#btnRecalc").addEventListener("click", () => {
      setStep(2);
      render();
      setStep(3);
    });
    $("#valorCre").addEventListener("change", render);
    $("#redondeo").addEventListener("change", render);
    $("#btnDocx").addEventListener("click", onExportDocx);
    $("#btnPdf").addEventListener("click", onExportPdf);
    $("#btnCsv").addEventListener("click", onExportCsv);

    usePlan(
      SacauParser.emptyPlan(),
      "Cargá un Word (.docx) o PDF con tu plan en horas para comenzar.",
      1
    );
  } catch (e) {
    console.error(e);
    showError(e.message || String(e));
    appEl.textContent = "No se pudo iniciar el convertidor.";
  }
})();
