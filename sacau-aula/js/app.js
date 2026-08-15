/**
 * UI SACAU Aula — ficha, presupuesto, actividades, RA y descarga.
 */
(function () {
  "use strict";

  const E = window.SacauAulaEngine;
  const C = window.SacauAulaCatalog;
  const X = window.SacauAulaExport;

  const $ = (sel) => document.querySelector(sel);
  const errEl = $("#error");
  const infoEl = $("#info");

  let ficha = E.emptyFicha();
  let plan = null;
  let suppressSave = false;

  function showError(msg) {
    errEl.hidden = !msg;
    errEl.textContent = msg || "";
  }

  function showInfo(msg) {
    infoEl.hidden = !msg;
    infoEl.textContent = msg || "";
  }

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function fmt1(n) {
    return Number(n || 0).toLocaleString("es-AR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
  }

  function fmt0(n) {
    return Number(n || 0).toLocaleString("es-AR", { maximumFractionDigits: 0 });
  }

  function persist() {
    if (suppressSave) return;
    ficha._meta = ficha._meta || {};
    ficha._meta.editado = true;
    E.saveFicha(ficha);
  }

  function readFichaFromForm() {
    const a = ficha.asignatura;
    document.querySelectorAll("[data-f]").forEach((el) => {
      const k = el.getAttribute("data-f");
      if (el.type === "number") a[k] = E.num(el.value);
      else a[k] = el.value;
    });
    document.querySelectorAll("[data-meta]").forEach((el) => {
      const k = el.getAttribute("data-meta");
      if (k === "semanas") ficha.semanas = E.num(el.value, ficha.semanas);
      else ficha[k] = el.value;
    });
    const ta = $("#contratoIa");
    if (ta) ficha.contrato_ia = ta.value;
    E.syncHoras(ficha);
  }

  function fillForm() {
    suppressSave = true;
    const a = ficha.asignatura;
    const set = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.value = v == null ? "" : v;
    };
    set("fNombre", a.nombre);
    set("fCodigo", a.codigo);
    set("fCarrera", ficha.carrera);
    set("fInstitucion", ficha.institucion);
    set("fUnidad", ficha.unidad_academica);
    set("fDocente", ficha.docente);
    set("fCiclo", ficha.ciclo);
    set("fAnio", a.anio);
    set("fRegimen", a.regimen || "S");
    set("fTipologia", a.tipologia || "teorica");
    set("fTeo", a.horas_teoricas);
    set("fPrac", a.horas_practicas);
    set("fAuto", a.horas_autonomas);
    set("fValorCre", a.valor_cre);
    set("fSemanas", ficha.semanas);
    const contrato = $("#contratoIa");
    if (contrato) contrato.value = ficha.contrato_ia || "";
    const notas = $("#notasCatedra");
    if (notas) notas.value = ficha.notas || "";
    suppressSave = false;
  }

  function renderPicker() {
    const wrap = $("#planPicker");
    const sel = $("#pickAsig");
    const hint = $("#planPickerHint");
    if (!plan || !plan.items || !plan.items.length) {
      wrap.classList.remove("is-open");
      return;
    }
    wrap.classList.add("is-open");
    const currentNombre = ficha.asignatura && ficha.asignatura.nombre;
    sel.innerHTML = plan.items
      .map((item, i) => {
        const label = `${item.codigo ? item.codigo + " · " : ""}${item.nombre || "Asignatura"} (${fmt0(item.cre)} CRE)`;
        const selected = item.nombre === currentNombre ? " selected" : "";
        return `<option value="${i}"${selected}>${esc(label)}</option>`;
      })
      .join("");
    hint.textContent = `${plan.items.length} materias desde ${plan.carrera || "el convertidor SACAU CRE"}. Elegí una para armar el programa.`;
  }

  function renderMetrics() {
    const b = E.budget(ficha);
    const ipPct = b.total ? (b.ip / b.total) * 100 : 50;
    const taPct = b.total ? (b.ta / b.total) * 100 : 50;
    $("#metrics").innerHTML = `
      <div class="metric"><div class="label">CRE</div><div class="value">${fmt0(b.cre)}</div><span class="hint">${fmt0(b.valor)} h por crédito</span></div>
      <div class="metric"><div class="label">Interacción</div><div class="value">${fmt0(b.ip)} h</div><span class="hint">${fmt1(b.hSemanaIp)} h/semana</span></div>
      <div class="metric"><div class="label">Autónomo</div><div class="value">${fmt0(b.ta)} h</div><span class="hint">${fmt1(b.hSemanaTa)} h/semana</span></div>
      <div class="metric"><div class="label">Total estudiante</div><div class="value">${fmt0(b.total)} h</div><span class="hint">${b.semanas} semanas</span></div>
      <div class="metric"><div class="label">Esfuerzo semanal</div><div class="value">${fmt1(b.hSemana)} h</div><span class="hint">${fmt1(b.pctCarga)} % de ${b.denom} CRE</span></div>
    `;
    $("#weekVisual").innerHTML = `
      <div class="week-bar" role="img" aria-label="Distribución semanal interacción y autónomo">
        <span class="ip" style="width:${ipPct}%"></span>
        <span class="ta" style="width:${taPct}%"></span>
      </div>
      <p class="week-legend">
        <span><i class="ip"></i> Interacción pedagógica (${fmt1(b.hSemanaIp)} h/sem)</span>
        <span><i class="ta"></i> Trabajo autónomo (${fmt1(b.hSemanaTa)} h/sem)</span>
      </p>
    `;
  }

  function raOptions(selected) {
    const ras = ficha.ra || [];
    const opts = [`<option value="">—</option>`];
    ras.forEach((r, i) => {
      const label = String(r.texto || `RA ${i + 1}`).slice(0, 48);
      opts.push(
        `<option value="${esc(r.id)}" ${r.id === selected ? "selected" : ""}>RA${i + 1}. ${esc(label)}</option>`
      );
    });
    return opts.join("");
  }

  function renderActividades() {
    const tb = $("#tablaAct tbody");
    const acts = ficha.actividades || [];
    if (!acts.length) {
      tb.innerHTML = `<tr class="empty-row"><td colspan="6">Sin actividades. Usá «Generar propuesta» o agregá filas.</td></tr>`;
      return;
    }
    tb.innerHTML = acts
      .map((act, i) => {
        const ia = act.ia || "amarillo";
        const showRedesign = ia !== "verde" && act.rediseño;
        return `<tr class="ia-${ia}" data-act="${i}">
          <td>
            <select data-af="tipo">
              <option value="ip" ${act.tipo === "ip" ? "selected" : ""}>IP · clase</option>
              <option value="ta" ${act.tipo === "ta" ? "selected" : ""}>TA · autónomo</option>
            </select>
          </td>
          <td>
            <input type="text" data-af="nombre" value="${esc(act.nombre)}" />
            <p class="act-desc">${esc(act.descripcion || "")}</p>
            ${
              showRedesign
                ? `<div class="redesign-box"><strong>Rediseño para que el CRE sea real</strong>${esc(
                    act.rediseño
                  )}<br /><button type="button" class="btn-primary btn-tiny btn-redesign">Aplicar rediseño</button></div>`
                : ""
            }
          </td>
          <td><input type="number" class="narrow" min="0" data-af="horas" value="${E.num(act.horas)}" /></td>
          <td>
            <select data-af="ia">
              <option value="rojo" ${ia === "rojo" ? "selected" : ""}>Rojo · IA resuelve</option>
              <option value="amarillo" ${ia === "amarillo" ? "selected" : ""}>Amarillo · IA asiste</option>
              <option value="verde" ${ia === "verde" ? "selected" : ""}>Verde · evidencia situada</option>
            </select>
            <span class="ia-pill ${ia}">${esc(E.iaLabel(ia))}</span>
          </td>
          <td><select data-af="ra_id">${raOptions(act.ra_id)}</select></td>
          <td><button type="button" class="btn-secondary btn-tiny btn-del-act">Quitar</button></td>
        </tr>`;
      })
      .join("");
  }

  function renderRa() {
    const tb = $("#tablaRa tbody");
    const ras = ficha.ra || [];
    if (!ras.length) {
      tb.innerHTML = `<tr class="empty-row"><td colspan="4">Sin resultados de aprendizaje. Usá «Proponer RA» o agregá uno.</td></tr>`;
      return;
    }
    tb.innerHTML = ras
      .map(
        (r, i) => `<tr data-ra="${i}">
        <td><textarea data-rf="texto" rows="3">${esc(r.texto)}</textarea></td>
        <td><textarea data-rf="evidencia" rows="3">${esc(r.evidencia)}</textarea></td>
        <td><textarea data-rf="criterio" rows="3">${esc(r.criterio)}</textarea></td>
        <td><button type="button" class="btn-secondary btn-tiny btn-del-ra">Quitar</button></td>
      </tr>`
      )
      .join("");
  }

  function renderDiag() {
    const d = E.diagnose(ficha);
    const { score } = d;
    $("#scoreLine").innerHTML = `Coherencia: <strong>${score.ok}</strong> en orden · <strong>${score.warning}</strong> a revisar · <strong>${score.error}</strong> críticos`;
    $("#checks").innerHTML = d.checks
      .map((c) => `<li class="${c.nivel}">${esc(c.mensaje)}</li>`)
      .join("");
    return d;
  }

  function render() {
    fillForm();
    renderPicker();
    renderMetrics();
    renderActividades();
    renderRa();
    renderDiag();
    persist();
  }

  function loadFromItem(item, meta) {
    ficha = E.fichaFromSeedItem(item, meta || plan || {});
    C.seedActivities(ficha);
    showInfo(`Programa armado para «${ficha.asignatura.nombre}». Revisá horas, semáforo y RA antes de descargar.`);
    render();
  }

  function onPickAsig() {
    if (!plan) return;
    const i = Number($("#pickAsig").value);
    const item = plan.items[i];
    if (!item) return;
    if (ficha._meta && ficha._meta.editado && (ficha.actividades || []).length) {
      const ok = window.confirm(
        "Hay un programa en edición. ¿Reemplazarlo por la asignatura elegida del plan?"
      );
      if (!ok) {
        renderPicker();
        return;
      }
    }
    loadFromItem(item, plan);
  }

  function addAct(tipo) {
    readFichaFromForm();
    ficha.actividades = ficha.actividades || [];
    const nombre = tipo === "ip" ? "Nueva instancia de interacción" : "Nueva actividad autónoma";
    ficha.actividades.push({
      id: E.uid(tipo),
      tipo,
      nombre,
      horas: 0,
      descripcion: "",
      ia: E.classifyIa(nombre, "", tipo),
      rediseño: C.suggestRedesign(nombre, ""),
      ra_id: (ficha.ra[0] && ficha.ra[0].id) || "",
      semanas: "",
    });
    render();
  }

  function syncActRow(tr) {
    const i = Number(tr.getAttribute("data-act"));
    const act = ficha.actividades[i];
    if (!act) return;
    tr.querySelectorAll("[data-af]").forEach((el) => {
      const k = el.getAttribute("data-af");
      act[k] = el.type === "number" ? E.num(el.value) : el.value;
    });
  }

  async function onExport(kind) {
    readFichaFromForm();
    if (!String(ficha.asignatura.nombre || "").trim()) {
      showError("Poné el nombre de la asignatura antes de descargar.");
      return;
    }
    showError("");
    const diag = E.diagnose(ficha);
    const base = E.slug(ficha);
    try {
      if (kind === "docx") {
        const blob = await X.exportDocx(ficha, diag);
        X.downloadBlob(blob, `${base}_SACAU-Aula.docx`);
      } else if (kind === "pdf") {
        const blob = X.exportPdf(ficha, diag);
        X.downloadBlob(blob, `${base}_SACAU-Aula.pdf`);
      } else {
        X.downloadBlob(X.exportJson(ficha), `${base}_SACAU-Aula.json`);
      }
      showInfo("Descarga lista.");
    } catch (e) {
      showError(e.message || String(e));
    }
  }

  function bootFromBridge() {
    const { plan: incoming } = E.consumeBridge();
    if (incoming && incoming.items && incoming.items.length) {
      plan = incoming;
      let idx = incoming.selected;
      if (idx == null || idx === "") {
        idx = incoming.items.length === 1 ? 0 : NaN;
      } else {
        idx = Number(idx);
      }
      if (Number.isFinite(idx) && incoming.items[idx]) {
        loadFromItem(incoming.items[idx], incoming);
        return true;
      }
      showInfo("Elegí la asignatura del plan convertido para armar el programa.");
      ficha = E.emptyFicha({
        institucion: incoming.institucion,
        carrera: incoming.carrera,
      });
      render();
      return true;
    }
    return false;
  }

  $("#fichaFields").addEventListener("input", () => {
    if (suppressSave) return;
    readFichaFromForm();
    renderMetrics();
    renderDiag();
    persist();
  });
  $("#fichaFields").addEventListener("change", () => {
    if (suppressSave) return;
    const prevReg = ficha.asignatura.regimen;
    readFichaFromForm();
    if (ficha.asignatura.regimen !== prevReg) {
      ficha.semanas = E.semanasFor(ficha.asignatura.regimen);
    }
    render();
  });

  $("#tablaAct").addEventListener("input", (ev) => {
    const tr = ev.target.closest("tr[data-act]");
    if (!tr) return;
    syncActRow(tr);
    renderDiag();
    persist();
  });
  $("#tablaAct").addEventListener("change", (ev) => {
    const tr = ev.target.closest("tr[data-act]");
    if (!tr) return;
    syncActRow(tr);
    const af = ev.target.getAttribute("data-af");
    if (af === "nombre" || af === "tipo" || af === "ia") {
      const i = Number(tr.getAttribute("data-act"));
      const act = ficha.actividades[i];
      if (act && (af === "nombre" || af === "tipo")) {
        act.ia = E.classifyIa(act.nombre, act.descripcion, act.tipo);
        act.rediseño = C.suggestRedesign(act.nombre, act.descripcion);
      }
      renderActividades();
      renderDiag();
    } else {
      renderDiag();
    }
    persist();
  });
  $("#tablaAct").addEventListener("click", (ev) => {
    const tr = ev.target.closest("tr[data-act]");
    if (!tr) return;
    const i = Number(tr.getAttribute("data-act"));
    if (ev.target.closest(".btn-del-act")) {
      ficha.actividades.splice(i, 1);
      render();
      return;
    }
    if (ev.target.closest(".btn-redesign")) {
      C.applyRedesign(ficha.actividades[i]);
      showInfo("Rediseño aplicado: la actividad pasó a evidencia situada (verde).");
      render();
    }
  });

  $("#tablaRa").addEventListener("input", (ev) => {
    const tr = ev.target.closest("tr[data-ra]");
    if (!tr) return;
    const i = Number(tr.getAttribute("data-ra"));
    const r = ficha.ra[i];
    if (!r) return;
    const k = ev.target.getAttribute("data-rf");
    if (k) r[k] = ev.target.value;
    persist();
  });
  $("#tablaRa").addEventListener("click", (ev) => {
    if (!ev.target.closest(".btn-del-ra")) return;
    const tr = ev.target.closest("tr[data-ra]");
    if (!tr) return;
    ficha.ra.splice(Number(tr.getAttribute("data-ra")), 1);
    render();
  });

  $("#contratoIa").addEventListener("input", () => {
    ficha.contrato_ia = $("#contratoIa").value;
    persist();
    renderDiag();
  });
  $("#notasCatedra").addEventListener("input", () => {
    ficha.notas = $("#notasCatedra").value;
    persist();
  });

  $("#btnGenerarAct").addEventListener("click", () => {
    readFichaFromForm();
    if ((ficha.actividades || []).length && ficha._meta.editado) {
      const ok = window.confirm("Esto reemplaza las actividades actuales por una propuesta según la tipología. ¿Continuar?");
      if (!ok) return;
    }
    if (!(ficha.ra || []).length) ficha.ra = C.raTemplates(ficha.asignatura);
    C.seedActivities(ficha);
    showInfo("Propuesta generada según la tipología. Ajustala: es un borrador de cátedra, no un dictamen.");
    render();
  });
  $("#btnAddIp").addEventListener("click", () => addAct("ip"));
  $("#btnAddTa").addEventListener("click", () => addAct("ta"));
  $("#btnReconciliar").addEventListener("click", () => {
    readFichaFromForm();
    E.reconcileAutonomo(ficha);
    showInfo("La última actividad autónoma absorbió la diferencia con el presupuesto CRE.");
    render();
  });
  $("#btnAddRa").addEventListener("click", () => {
    ficha.ra = ficha.ra || [];
    ficha.ra.push({
      id: E.uid("ra"),
      texto: "",
      evidencia: "",
      criterio: "",
    });
    render();
  });
  $("#btnSeedRa").addEventListener("click", () => {
    if ((ficha.ra || []).some((r) => String(r.texto || "").trim())) {
      const ok = window.confirm("Esto reemplaza los RA actuales por una plantilla. ¿Continuar?");
      if (!ok) return;
    }
    ficha.ra = C.raTemplates(ficha.asignatura);
    render();
  });
  $("#btnContrato").addEventListener("click", () => {
    readFichaFromForm();
    ficha.contrato_ia = E.buildContrato(ficha);
    showInfo("Cláusula generada a partir de las actividades y el semáforo. Editála con la voz de la cátedra.");
    render();
  });
  $("#btnEjemplo").addEventListener("click", () => {
    ficha = C.exampleFicha();
    showInfo("Ejemplo cargado: Metodología de la investigación (5 CRE, semestral). Usalo como modelo.");
    render();
  });
  $("#btnBlanco").addEventListener("click", () => {
    ficha = E.emptyFicha({
      asignatura: {
        tipologia: "teorica",
        regimen: "S",
        horas_teoricas: 64,
        horas_practicas: 0,
        horas_autonomas: 61,
        valor_cre: 25,
      },
    });
    E.syncHoras(ficha);
    showInfo("Ficha en blanco con un presupuesto de 5 CRE (125 h). Completá el nombre y generá la propuesta.");
    render();
  });
  $("#fileJson").addEventListener("change", (ev) => {
    const file = ev.target.files && ev.target.files[0];
    ev.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result || ""));
        if (!data.asignatura) throw new Error("El JSON no es una ficha SACAU Aula.");
        ficha = E.emptyFicha(data);
        E.syncHoras(ficha);
        showInfo(`Ficha cargada desde «${file.name}».`);
        render();
      } catch (e) {
        showError(e.message || String(e));
      }
    };
    reader.readAsText(file);
  });
  $("#pickAsig").addEventListener("change", onPickAsig);
  $("#btnDocx").addEventListener("click", () => onExport("docx"));
  $("#btnPdf").addEventListener("click", () => onExport("pdf"));
  $("#btnJson").addEventListener("click", () => onExport("json"));

  if (!bootFromBridge()) {
    const saved = E.loadFicha();
    const savedPlan = E.readJson(E.PLAN_KEY);
    if (savedPlan && savedPlan.items) plan = savedPlan;
    if (saved && saved.asignatura && (saved.asignatura.nombre || (saved.actividades || []).length)) {
      ficha = saved;
      showInfo("Se restauró el último programa de este navegador.");
      render();
    } else {
      ficha = C.exampleFicha();
      showInfo("Empezá con el ejemplo, con una materia del convertidor o en blanco.");
      render();
    }
  }
})();
