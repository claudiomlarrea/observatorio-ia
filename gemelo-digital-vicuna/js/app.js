import { simular, etiquetaEstacion, formatearNumero } from "./model.js";
import { enriquecer, compararRadar, parsearCSVHistorico } from "./extensions.js";
import { PRESETS } from "./presets.js";
import {
  dibujarRadar,
  renderMapaSVG,
  renderTimeline,
  renderODS,
  renderExtendidas,
} from "./viz.js";
import { exportarInforme, TOUR_PASOS } from "./report.js";

const $ = (sel) => document.querySelector(sel);

let escenarioActual = "jachal";
let etapaActual = 1;
let tourIdx = 0;

function renderFlujo(data) {
  const box = $("#flujo-diagrama");
  const { caudales, vicuna, jachalProyectado } = data;
  const esc = data.escenario;

  let html = '<div class="flujo-grid">';

  if (esc === "pacifico") {
    html += `
      <div class="flujo-nodo flujo-nodo--mar">🌊 Pacífico<br><strong>${formatearNumero(vicuna.caudalM3s, 1)} m³/s</strong><br>${vicuna.salinidadEntrada} g/l</div>
      <div class="flujo-flecha">→ desalinizar → bombear 4.200 m →</div>
      <div class="flujo-nodo flujo-nodo--mina">⛏ Vicuña<br><strong>${formatearNumero(vicuna.caudalM3s, 1)} m³/s</strong></div>
      <div class="flujo-nodo flujo-nodo--rio flujo-nodo--muted">Río Jáchal<br><em>sin cambio</em><br>${data.jachalActual.salinidad} g/l · B ${data.jachalActual.boro} mg/l</div>
    `;
  } else if (esc === "jachal") {
    html += `
      <div class="flujo-nodo flujo-nodo--rio">Río Blanco ${formatearNumero(caudales.blanco, 1)} m³/s</div>
      <div class="flujo-nodo flujo-nodo--rio">Río La Palca ${formatearNumero(caudales.palca, 1)} m³/s</div>
      <div class="flujo-flecha">↓ ósmosis inversa (Etapa 1 + 2)</div>
      <div class="flujo-nodo flujo-nodo--planta">Planta RO<br><strong>${formatearNumero(vicuna.caudalDesalTotalM3s, 1)} m³/s</strong></div>
      <div class="flujo-flecha">→ mina ${formatearNumero(vicuna.caudalM3s, 1)} m³/s · cuenca ${formatearNumero(jachalProyectado.caudalMejoradoM3s ?? 0, 1)} m³/s →</div>
      <div class="flujo-nodo flujo-nodo--mina">⛏ Vicuña<br><strong>${formatearNumero(vicuna.caudalM3s, 2)} m³/s</strong></div>
      <div class="flujo-nodo flujo-nodo--rio flujo-nodo--ok">Jáchal mejorado<br><strong>${formatearNumero(jachalProyectado.salinidad, 2)} g/l</strong><br>B ${formatearNumero(jachalProyectado.boro, 2)} mg/l<br><span class="flujo-sub">${formatearNumero(jachalProyectado.caudalMejoradoM3s ?? 0, 2)} m³/s a la cuenca</span></div>
    `;
  } else {
    html += `
      <div class="flujo-nodo flujo-nodo--mar">Pacífico 60%</div>
      <div class="flujo-nodo flujo-nodo--rio">Jáchal 40%</div>
      <div class="flujo-flecha">↓ integración ↓</div>
      <div class="flujo-nodo flujo-nodo--mina">⛏ Vicuña ${formatearNumero(vicuna.caudalM3s, 1)} m³/s</div>
      <div class="flujo-nodo flujo-nodo--rio flujo-nodo--ok">Jáchal parcial<br>${formatearNumero(jachalProyectado.salinidad, 2)} g/l</div>
    `;
  }

  html += "</div>";
  box.innerHTML = html;
  box.querySelectorAll(".flujo-nodo").forEach((n) => {
    n.classList.add("flujo-nodo--live", "is-updated");
    n.addEventListener("animationend", () => n.classList.remove("is-updated"), { once: true });
  });
}

function renderMetricas(data, ext) {
  const { costos, energia, jachalActual, jachalProyectado, comparacion } = data;
  const pulseIds = [
    "metric-capex", "metric-opex", "metric-opex-anual", "metric-energia",
    "metric-lcow", "metric-sal-despues", "metric-mejora-sal", "metric-boro-despues",
    "metric-mejora-boro", "metric-cultivos-despues", "metric-ha",
  ];

  $("#metric-capex").textContent = `USD ${formatearNumero(costos.capexMUSD, 0)} M`;
  $("#metric-opex").textContent = `USD ${formatearNumero(costos.costoTotalM3USD, 2)}/m³`;
  $("#metric-opex-anual").textContent = `USD ${formatearNumero(costos.opexAnualMUSD, 1)} M/año`;
  $("#metric-energia").textContent = `${formatearNumero(energia.kwhM3, 1)} kWh/m³`;
  $("#metric-lcow").textContent = `USD ${formatearNumero(ext.lcow, 2)}/m³`;

  $("#metric-sal-antes").textContent = `${formatearNumero(jachalActual.salinidad, 1)} g/l`;
  const salDesp = jachalProyectado.salinidad ?? jachalActual.salinidad;
  $("#metric-sal-despues").textContent = `${formatearNumero(salDesp, 2)} g/l`;
  $("#metric-boro-antes").textContent = `${formatearNumero(jachalActual.boro, 1)} mg/l`;
  const boroDesp = jachalProyectado.boro ?? jachalActual.boro;
  $("#metric-boro-despues").textContent = `${formatearNumero(boroDesp, 2)} mg/l`;

  const deltaSal = jachalProyectado.reduccionSalPct;
  const deltaBoro = jachalProyectado.reduccionBoroPct;
  $("#metric-mejora-sal").textContent = deltaSal ? `−${formatearNumero(deltaSal, 0)}%` : "—";
  $("#metric-mejora-boro").textContent = deltaBoro ? `−${formatearNumero(deltaBoro, 0)}%` : "—";

  $("#metric-cultivos-antes").textContent = comparacion.cultivosAntes;
  $("#metric-cultivos-despues").textContent = comparacion.cultivosDespues;
  $("#metric-ha").textContent = jachalProyectado.haRegablesPotencial
    ? formatearNumero(jachalProyectado.haRegablesPotencial, 0)
    : "3.500";

  $("#metric-fuente").textContent = data.vicuna.fuente;
  $("#metric-energia-nota").textContent = energia.nota;

  pulseIds.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove("metric-pulse");
    void el.offsetWidth;
    el.classList.add("metric-pulse");
  });
}

function renderCultivos(data) {
  const lista = $("#lista-cultivos");
  const aptos = data.jachalProyectado.cultivos ?? data.jachalActual.cultivos;
  const nombres = new Set(aptos.map((c) => c.nombre));
  lista.innerHTML = CULTIVOS_REF.map((c) => {
    const ok = nombres.has(c.nombre);
    return `<li class="${ok ? "cultivo-ok" : "cultivo-no"}">${ok ? "✓" : "○"} ${c.nombre}</li>`;
  }).join("");
}

const CULTIVOS_REF = [
  { nombre: "Olivo" }, { nombre: "Pistacho" }, { nombre: "Vid" }, { nombre: "Tomate" },
  { nombre: "Almendro" }, { nombre: "Cebolla" }, { nombre: "Ajo" }, { nombre: "Alfalfa" },
  { nombre: "Trigo" }, { nombre: "Membrillo (actual)" },
];

function renderAlertas(data) {
  $("#lista-alertas").innerHTML = data.alertas.map((a) => `<li>${a}</li>`).join("");
}

function renderComparativa(factor, fraccion) {
  const tbody = $("#tabla-comparativa tbody");
  tbody.innerHTML = ["pacifico", "jachal", "hibrido"]
    .map((e) => {
      const d = simular(e, factor, fraccion);
      const ext = enriquecer(d, etapaActual);
      const jp = d.jachalProyectado;
      return `<tr>
        <td>${etiquetaEscenario(e)}</td>
        <td>${formatearNumero(d.costos.costoTotalM3USD, 2)}</td>
        <td>${formatearNumero(ext.lcow, 2)}</td>
        <td>${formatearNumero(d.costos.capexMUSD, 0)}</td>
        <td>${formatearNumero(jp.salinidad ?? d.jachalActual.salinidad, 2)}</td>
        <td>${ext.ods.licenciaSocial}</td>
        <td>${formatearNumero(d.energia.kwhM3, 1)}</td>
      </tr>`;
    })
    .join("");
}

function etiquetaEscenario(e) {
  return { pacifico: "Pacífico", jachal: "Cuenca Jáchal", hibrido: "Híbrido" }[e];
}

function renderPresets() {
  const box = $("#preset-buttons");
  box.innerHTML = PRESETS.map(
    (p) => `<button type="button" class="btn-preset" data-preset="${p.id}">${p.label}</button>`,
  ).join("");
  box.querySelectorAll(".btn-preset").forEach((btn) => {
    btn.addEventListener("click", () => {
      const p = PRESETS.find((x) => x.id === btn.dataset.preset);
      if (!p) return;
      escenarioActual = p.escenario;
      etapaActual = p.etapa;
      $("#slider-hidrologia").value = String(p.factor);
      $("#slider-minera").value = String(p.minera);
      actualizar();
    });
  });
}

function actualizar() {
  const factor = parseFloat($("#slider-hidrologia").value);
  const pctMinera = parseInt($("#slider-minera").value, 10);
  const fraccion = pctMinera / 100;

  const sliderHid = $("#slider-hidrologia");
  sliderHid.setAttribute("aria-valuenow", String(factor));
  sliderHid.setAttribute("aria-valuetext", `${etiquetaEstacion(factor)} — factor ${formatearNumero(factor, 2)}`);

  const data = simular(escenarioActual, factor, fraccion);
  const ext = enriquecer(data, etapaActual);
  const radarCmp = compararRadar(factor, fraccion, etapaActual);
  const { blanco, palca, jachal } = data.caudales;

  $("#label-hidrologia").textContent = `${etiquetaEstacion(factor)} · factor ${formatearNumero(factor, 2)}`;
  $("#label-hidrologia-detalle").textContent =
    `Caudales: Blanco ${formatearNumero(blanco, 2)} · La Palca ${formatearNumero(palca, 2)} · Jáchal ${formatearNumero(jachal, 2)} m³/s`;

  const qDesalRef = data.vicuna.caudalDesalTotalM3s ?? data.vicuna.caudalM3s ?? 1.2;
  const qVicuna = data.vicuna.caudalM3s;
  $("#label-minera").textContent = `${pctMinera}% (~${formatearNumero(qVicuna, 2)} m³/s Vicuña)`;
  $("#label-minera-detalle").textContent =
    `Desalinización ${formatearNumero(qDesalRef, 2)} m³/s · ${formatearNumero(qDesalRef - qVicuna, 2)} m³/s a cuenca`;

  renderMapaSVG($("#mapa-cuenca"), data);
  renderFlujo(data);
  renderMetricas(data, ext);
  renderExtendidas($("#panel-extendidas"), ext);
  renderODS($("#ods-panel"), ext.ods);
  renderCultivos(data);
  renderAlertas(data);
  renderComparativa(factor, fraccion);
  renderTimeline($("#timeline-vicuna"), etapaActual, (id) => {
    etapaActual = id;
    actualizar();
  });

  const canvas = $("#radar-canvas");
  dibujarRadar(canvas, radarCmp.pacifico, radarCmp.jachal);

  document.querySelectorAll(".tab-escenario").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.escenario === escenarioActual);
  });

  window.__jhvtExport = () => exportarInforme(data, ext, radarCmp);
}

document.querySelectorAll(".tab-escenario").forEach((btn) => {
  btn.addEventListener("click", () => {
    escenarioActual = btn.dataset.escenario;
    actualizar();
  });
});

$("#slider-hidrologia").addEventListener("input", actualizar);
$("#slider-minera").addEventListener("input", actualizar);

$("#btn-exportar").addEventListener("click", () => window.__jhvtExport?.());

$("#btn-tour").addEventListener("click", () => {
  tourIdx = 0;
  $("#tour-overlay").hidden = false;
  mostrarPasoTour();
});

$("#tour-next").addEventListener("click", () => {
  tourIdx += 1;
  if (tourIdx >= TOUR_PASOS.length) {
    $("#tour-overlay").hidden = true;
    return;
  }
  mostrarPasoTour();
});

$("#tour-close").addEventListener("click", () => {
  $("#tour-overlay").hidden = true;
});

function mostrarPasoTour() {
  const paso = TOUR_PASOS[tourIdx];
  $("#tour-text").textContent = paso.text;
  $("#tour-step").textContent = `Paso ${tourIdx + 1} de ${TOUR_PASOS.length}`;
  const target = document.querySelector(paso.sel);
  document.querySelectorAll(".tour-highlight").forEach((el) => el.classList.remove("tour-highlight"));
  if (target) {
    target.classList.add("tour-highlight");
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

$("#csv-upload").addEventListener("change", async (ev) => {
  const file = ev.target.files?.[0];
  if (!file) return;
  const text = await file.text();
  const parsed = parsearCSVHistorico(text);
  if (!parsed) {
    $("#csv-status").textContent = "CSV no válido.";
    return;
  }
  $("#slider-hidrologia").value = String(parsed.factor.toFixed(2));
  $("#csv-status").textContent =
    `Datos cargados: ${parsed.muestras} registros · promedio ${formatearNumero(parsed.promedio, 2)} m³/s → factor ${formatearNumero(parsed.factor, 2)}`;
  actualizar();
});

$("#btn-csv-ejemplo").addEventListener("click", async () => {
  const res = await fetch("data/caudales-ejemplo.csv");
  const text = await res.text();
  const parsed = parsearCSVHistorico(text);
  if (parsed) {
    $("#slider-hidrologia").value = String(parsed.factor.toFixed(2));
    $("#csv-status").textContent =
      `Ejemplo histórico: promedio ${formatearNumero(parsed.promedio, 2)} m³/s (${parsed.muestras} meses)`;
    actualizar();
  }
});

renderPresets();
actualizar();
