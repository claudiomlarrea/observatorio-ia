/**
 * UI Convertidor SACAU (estático / GitHub Pages)
 */
(async function () {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const errEl = $("#error");
  const appEl = $("#app");

  function showError(msg) {
    errEl.hidden = false;
    errEl.textContent = msg;
  }

  async function loadJson(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`No se pudo cargar ${path} (${res.status})`);
    return res.json();
  }

  let tipologiasMap = {};
  let normasUccuyo = {};
  let normasPsico = {};
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
    });
  }

  function tipologiaOptions(selected) {
    return Object.keys(tipologiasMap)
      .map(
        (id) =>
          `<option value="${id}" ${id === selected ? "selected" : ""}>${id}</option>`
      )
      .join("");
  }

  function areaOptions(selected) {
    return ["FB", "FP", "FGC", "FCI", "OTRA"]
      .map((a) => `<option value="${a}" ${a === selected ? "selected" : ""}>${a}</option>`)
      .join("");
  }

  function render(planConv, validation) {
    const t = planConv.totales;
    const byAnio = SacauEngine.groupBy(planConv.items, (i) => i.asignatura.anio);
    const byArea = SacauEngine.groupBy(planConv.items, (i) => i.asignatura.area || "—");

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

    const checkLis = validation.checks
      .map((c) => `<li class="${c.nivel}">${c.nivel === "ok" ? "✅" : c.nivel === "warning" ? "⚠️" : "❌"} ${c.mensaje}</li>`)
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

    const asigRows = planConv.items
      .map((item) => {
        const a = item.asignatura;
        const ovA =
          a.horas_autonomas_override == null ? "" : a.horas_autonomas_override;
        const ovC = a.valor_cre_override == null ? "" : a.valor_cre_override;
        return `<tr>
          <td><input data-f="codigo" value="${a.codigo || ""}" class="narrow" /></td>
          <td><input data-f="nombre" value="${String(a.nombre || "").replace(/"/g, "&quot;")}" style="min-width:14rem" /></td>
          <td><input data-f="anio" type="number" class="narrow" value="${a.anio}" /></td>
          <td><select data-f="area">${areaOptions(a.area)}</select></td>
          <td><select data-f="regimen"><option ${a.regimen === "A" ? "selected" : ""}>A</option><option ${a.regimen === "S" ? "selected" : ""}>S</option></select></td>
          <td><select data-f="tipologia">${tipologiaOptions(a.tipologia)}</select></td>
          <td><input data-f="horas_teoricas" type="number" class="narrow" value="${a.horas_teoricas}" /></td>
          <td><input data-f="horas_practicas" type="number" class="narrow" value="${a.horas_practicas}" /></td>
          <td><input data-f="horas_autonomas_override" type="number" class="narrow" value="${ovA}" placeholder="auto" /></td>
          <td><input data-f="valor_cre_override" type="number" class="narrow" min="25" max="30" value="${ovC}" placeholder="25" /></td>
          <td>${item.horas_interaccion.toFixed(0)}</td>
          <td>${item.horas_autonomas.toFixed(0)}</td>
          <td><strong>${item.cre.toFixed(1)}</strong></td>
          <td><input type="hidden" data-f="horas_estimadas" value="${a.horas_estimadas ? "1" : "0"}" />
              <input type="hidden" data-f="notas" value="${String(a.notas || "").replace(/"/g, "&quot;")}" />
              ${a.horas_estimadas ? "≈" : ""}</td>
        </tr>`;
      })
      .join("");

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
          <h2>Cumplimiento normativo</h2>
          <ul class="checks">${checkLis}</ul>
        </section>
        <section class="panel">
          <h2>Coeficientes autónomos</h2>
          <div class="table-wrap" style="max-height:14rem">
            <table>
              <thead><tr><th>Id</th><th>Nombre</th><th>Ratio</th><th>Fijas</th></tr></thead>
              <tbody>${tipRows}</tbody>
            </table>
          </div>
          <p class="note">Autónomas ≈ interacción × ratio + fijas (salvo override por materia).</p>
        </section>
      </div>

      <div class="grid-2">
        <section class="panel">
          <h2>Por año</h2>
          <div class="table-wrap" style="max-height:12rem">
            <table>
              <thead><tr><th>Año</th><th>Interacción</th><th>Autónomas</th><th>CRE</th></tr></thead>
              <tbody>${anioRows}</tbody>
            </table>
          </div>
        </section>
        <section class="panel">
          <h2>Por área</h2>
          <div class="table-wrap" style="max-height:12rem">
            <table>
              <thead><tr><th>Área</th><th>Interacción</th><th>Prácticas</th><th>CRE</th></tr></thead>
              <tbody>${areaRows}</tbody>
            </table>
          </div>
        </section>
      </div>

      <section class="panel">
        <h2>${plan.nombre || "Plan de estudios"}</h2>
        <p class="note">${plan.normativa || ""} ${plan.metadata && plan.metadata.nota ? "· " + plan.metadata.nota : ""}</p>
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
        Res. 788-CS-2026 (CRE UCCuyo) · RESOL-2025-556 (SACAU) ·
        También disponible como app Streamlit: <code>streamlit run sacau/app.py</code>
      </footer>
    `;

    // tipología listeners
    appEl.querySelectorAll(".tip-ratio, .tip-fijas").forEach((el) => {
      el.addEventListener("change", () => {
        const id = el.getAttribute("data-tip");
        if (!tipologiasMap[id]) return;
        if (el.classList.contains("tip-ratio")) {
          tipologiasMap[id].ratio_autonomo = Number(el.value || 0);
        } else {
          tipologiasMap[id].autonomas_fijas = Number(el.value || 0);
        }
        recalcular();
      });
    });
  }

  function recalcular() {
    if (!plan) return;
    plan.asignaturas = readAsignaturasFromTable();
    const validar = $("#validarPsico").checked;
    const planRun = {
      ...plan,
      carrera_clave: validar ? "psicologia" : "",
    };
    const conv = SacauEngine.convertPlan(planRun, optionsFromUi());
    const val = SacauEngine.validatePlan(
      conv,
      normasUccuyo,
      validar ? normasPsico : null
    );
    window.__lastConv = conv;
    render(conv, val);
  }

  function downloadCsv() {
    const conv = window.__lastConv;
    if (!conv) return;
    const blob = new Blob([SacauEngine.toCsv(conv)], {
      type: "text/csv;charset=utf-8",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${plan.id || "plan"}_cre.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  try {
    const [tipsRaw, uccuyo, psico, psicoPlan] = await Promise.all([
      loadJson("data/tipologias.json"),
      loadJson("data/normas_uccuyo.json"),
      loadJson("data/normas_psicologia.json"),
      loadJson("data/psicologia_1098.json"),
    ]);
    tipologiasMap = tipologiasFromRaw(tipsRaw);
    normasUccuyo = uccuyo;
    normasPsico = psico;
    plan = psicoPlan;

    $("#valorCre").value = uccuyo.cre_default || 25;
    $("#btnRecalc").addEventListener("click", recalcular);
    $("#btnCsv").addEventListener("click", downloadCsv);
    $("#valorCre").addEventListener("change", recalcular);
    $("#redondeo").addEventListener("change", recalcular);
    $("#validarPsico").addEventListener("change", recalcular);

    // Primera render: sin leer tabla (aún no existe)
    const conv = SacauEngine.convertPlan(plan, optionsFromUi());
    const val = SacauEngine.validatePlan(conv, normasUccuyo, normasPsico);
    window.__lastConv = conv;
    render(conv, val);
  } catch (e) {
    console.error(e);
    showError(e.message || String(e));
    appEl.textContent = "No se pudo iniciar el convertidor.";
  }
})();
