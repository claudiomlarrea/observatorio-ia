import { formatearNumero } from "./model.js";

export function exportarInforme(data, ext, radarCmp) {
  const fecha = new Date().toLocaleDateString("es-AR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const jp = data.jachalProyectado;
  const esc = { pacifico: "Océano Pacífico", jachal: "Cuenca Jáchal", hibrido: "Híbrido" }[data.escenario];

  const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"/>
<title>Informe JHVT — ${fecha}</title>
<style>
  body{font-family:Georgia,serif;max-width:720px;margin:2rem auto;padding:0 1rem;color:#1f1418;line-height:1.5}
  h1{font-size:1.35rem;color:#7a1532;border-bottom:3px solid #064a38;padding-bottom:.5rem}
  h2{font-size:1rem;color:#064a38;margin-top:1.5rem}
  table{width:100%;border-collapse:collapse;font-size:.9rem;margin:1rem 0}
  th,td{border:1px solid #ccc;padding:.4rem .6rem;text-align:left}
  th{background:#f4f0f1}
  .meta{font-size:.85rem;color:#5c4f54}
  .footer{margin-top:2rem;font-size:.8rem;color:#5c4f54;border-top:1px solid #ddd;padding-top:1rem}
  @media print{body{margin:1cm}}
</style></head><body>
<h1>Gemelo Digital JHVT — Informe ejecutivo</h1>
<p class="meta">Observatorio de IA · UCCuyo · Instituto del Agua · ${fecha}</p>
<h2>Escenario simulado</h2>
<p><strong>${esc}</strong> · Factor hidrológico ${formatearNumero(data.factorHidrologico, 2)} · ${ext.etapa.label}</p>
<h2>Indicadores clave</h2>
<table>
<tr><th>CAPEX</th><td>USD ${formatearNumero(data.costos.capexMUSD, 0)} M</td></tr>
<tr><th>Costo agua</th><td>USD ${formatearNumero(data.costos.costoTotalM3USD, 2)}/m³</td></tr>
<tr><th>LCOW (25 a)</th><td>USD ${formatearNumero(ext.lcow, 2)}/m³</td></tr>
<tr><th>OPEX anual</th><td>USD ${formatearNumero(data.costos.opexAnualMUSD, 1)} M/año</td></tr>
<tr><th>Energía</th><td>${formatearNumero(data.energia.kwhM3, 1)} kWh/m³</td></tr>
<tr><th>Salinidad Jáchal</th><td>${formatearNumero(data.jachalActual.salinidad, 1)} → ${formatearNumero(jp.salinidad ?? data.jachalActual.salinidad, 2)} g/l</td></tr>
<tr><th>Boro</th><td>${formatearNumero(data.jachalActual.boro, 1)} → ${formatearNumero(jp.boro ?? data.jachalActual.boro, 2)} mg/l</td></tr>
<tr><th>Has regables</th><td>${formatearNumero(jp.haRegablesPotencial ?? 3500, 0)} ha</td></tr>
<tr><th>Licencia social</th><td>${ext.ods.licenciaSocial}/100</td></tr>
<tr><th>Brina (rechazo)</th><td>${formatearNumero(ext.brina.toneladasSalDia, 0)} t sal/día</td></tr>
<tr><th>Solar requerido</th><td>${formatearNumero(ext.solar.solarMWp, 1)} MWp</td></tr>
</table>
<h2>Comparativa radar (Pacífico vs Jáchal)</h2>
<table>
<tr><th>Dimensión</th><th>Pacífico</th><th>Jáchal</th></tr>
${Object.keys(radarCmp.pacifico).map((k) => `<tr><td>${k}</td><td>${Math.round(radarCmp.pacifico[k])}</td><td>${Math.round(radarCmp.jachal[k])}</td></tr>`).join("")}
</table>
<h2>Alertas del escenario</h2>
<ul>${data.alertas.map((a) => {
  const col = a.nivel === "rojo" ? "#c41e3a" : a.nivel === "amarillo" ? "#d4a017" : "#0d6e4f";
  const bg = a.nivel === "rojo" ? "#fdf0f2" : a.nivel === "amarillo" ? "#fffbf0" : "#eef8f3";
  const lbl = a.nivel === "rojo" ? "Crítico" : a.nivel === "amarillo" ? "Atención" : "Favorable";
  return `<li style="margin-bottom:8px;padding:8px 10px;border-left:4px solid ${col};background:${bg};list-style:none"><strong style="color:${col}">${lbl}:</strong> ${a.texto}</li>`;
}).join("")}</ul>
<p class="footer">Prototipo demostrativo. No reemplaza estudios de ingeniería ni EIA. Basado en propuesta Instituto del Agua UCCuyo (Prof. Luis F. Jiménez).</p>
<script>window.onload=function(){window.print()}</script>
</body></html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

export const TOUR_PASOS = [
  { sel: ".tabs", text: "Elegí el escenario: Pacífico, cuenca Jáchal o híbrido." },
  { sel: "#preset-buttons", text: "Usá escenarios predefinidos para la reunión con Vicuña." },
  { sel: "#mapa-cuenca", text: "El mapa muestra caudales (grosor de línea) y calidad del Jáchal." },
  { sel: "#flujo-diagrama", text: "Flujo detallado del agua según el escenario activo." },
  { sel: "#tit-metricas", text: "Indicadores del gemelo: costos, calidad, cultivos." },
  { sel: "#radar-canvas", text: "Radar comparativo Pacífico vs Jáchal en 7 dimensiones." },
  { sel: "#ods-panel", text: "Licencia social y ODS cuantificados." },
  { sel: "#btn-exportar", text: "Exportá informe PDF para comité de inversión." },
];
