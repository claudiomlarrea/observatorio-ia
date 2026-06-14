import { formatearNumero } from "./model.js";
import { ETAPAS_VICUNA } from "./presets.js";

const RADAR_EJES = [
  { key: "costo", label: "Costo favorable" },
  { key: "energia", label: "Eficiencia energética" },
  { key: "mejoraJachal", label: "Mejora del Jáchal" },
  { key: "licenciaSocial", label: "Licencia social" },
  { key: "haRegables", label: "Has regables" },
  { key: "riesgoLogistico", label: "Resiliencia logística" },
  { key: "autonomiaLocal", label: "Autonomía local" },
];

export function dibujarRadar(canvas, pacScores, jachScores) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) * 0.34;
  const n = RADAR_EJES.length;

  ctx.clearRect(0, 0, w, h);

  ctx.strokeStyle = "#ddd5d8";
  ctx.fillStyle = "#5c4f54";
  ctx.font = "11px Source Sans 3, sans-serif";

  for (let ring = 1; ring <= 4; ring++) {
    ctx.beginPath();
    const rr = (r * ring) / 4;
    for (let i = 0; i <= n; i++) {
      const ang = (Math.PI * 2 * i) / n - Math.PI / 2;
      const x = cx + rr * Math.cos(ang);
      const y = cy + rr * Math.sin(ang);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  RADAR_EJES.forEach((eje, i) => {
    const ang = (Math.PI * 2 * i) / n - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + r * Math.cos(ang), cy + r * Math.sin(ang));
    ctx.stroke();
    const lx = cx + (r + 22) * Math.cos(ang);
    const ly = cy + (r + 22) * Math.sin(ang);
    ctx.textAlign = Math.abs(Math.cos(ang)) < 0.2 ? "center" : Math.cos(ang) > 0 ? "left" : "right";
    ctx.fillText(eje.label, lx, ly + 4);
  });

  function poligono(scores, color, fill) {
    ctx.beginPath();
    RADAR_EJES.forEach((eje, i) => {
      const val = (scores[eje.key] ?? 0) / 100;
      const ang = (Math.PI * 2 * i) / n - Math.PI / 2;
      const x = cx + r * val * Math.cos(ang);
      const y = cy + r * val * Math.sin(ang);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  poligono(pacScores, "#1565a8", "rgba(21,101,168,0.15)");
  poligono(jachScores, "#0d6e4f", "rgba(13,110,79,0.2)");
}

export function renderMapaSVG(container, data) {
  const { caudales, escenario, jachalProyectado, vicuna } = data;
  const qBlanco = caudales.blanco;
  const qPalca = caudales.palca;
  const qJachal = caudales.jachal;
  const qDesal = vicuna.caudalDesalTotalM3s ?? vicuna.caudalM3s ?? 1.2;
  const salColor = jachalProyectado.mejora ? "#0d6e4f" : "#c45c00";
  const sw = (q) => Math.max(2, Math.min(10, q * 1.8));

  const showPacific = escenario === "pacifico" || escenario === "hibrido";

  container.innerHTML = `
<svg viewBox="0 0 520 320" class="mapa-cuenca" role="img" aria-label="Mapa esquemático de la cuenca">
  <defs>
    <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L6,3 L0,6 Z" fill="#7a1532"/>
    </marker>
  </defs>
  <rect width="520" height="320" fill="#e8f4fc" rx="8"/>
  <text x="16" y="24" class="mapa-titulo">Cuenca Jáchal · San Juan</text>
  ${showPacific ? `
  <text x="16" y="44" fill="#1565a8" font-size="11">🌊 Pacífico (Chile)</text>
  <path d="M 40 70 Q 120 50 200 100" stroke="#1565a8" stroke-width="${sw(escenario === 'pacifico' ? qDesal : qDesal * 0.6)}" fill="none" marker-end="url(#arrow)"/>
  ` : ""}
  <circle cx="120" cy="140" r="28" fill="#e8f5f0" stroke="#0d6e4f" stroke-width="2"/>
  <text x="120" y="136" text-anchor="middle" font-size="10" font-weight="600">Blanco</text>
  <text x="120" y="150" text-anchor="middle" font-size="9">${formatearNumero(qBlanco, 1)} m³/s</text>
  <circle cx="120" cy="220" r="28" fill="#e8f5f0" stroke="#0d6e4f" stroke-width="2"/>
  <text x="120" y="216" text-anchor="middle" font-size="10" font-weight="600">La Palca</text>
  <text x="120" y="230" text-anchor="middle" font-size="9">${formatearNumero(qPalca, 1)} m³/s</text>
  <path d="M 148 140 L 220 170" stroke="#0d6e4f" stroke-width="${sw(qBlanco)}" fill="none"/>
  <path d="M 148 220 L 220 190" stroke="#0d6e4f" stroke-width="${sw(qPalca)}" fill="none"/>
  <rect x="230" y="150" width="70" height="50" rx="6" fill="#fff8f0" stroke="#c45c00" stroke-width="2"/>
  <text x="265" y="172" text-anchor="middle" font-size="10" font-weight="600">Planta RO</text>
  <text x="265" y="186" text-anchor="middle" font-size="9">${formatearNumero(qDesal, 1)} m³/s</text>
  <path d="M 300 175 L 360 175" stroke="#7a1532" stroke-width="${sw(vicuna.caudalM3s)}" fill="none" marker-end="url(#arrow)"/>
  <rect x="365" y="148" width="72" height="54" rx="6" fill="#fdf0f3" stroke="#7a1532" stroke-width="2"/>
  <text x="401" y="172" text-anchor="middle" font-size="10" font-weight="600">⛏ Vicuña</text>
  <text x="401" y="188" text-anchor="middle" font-size="9">${formatearNumero(vicuna.caudalM3s, 2)} m³/s</text>
  <path d="M 265 200 L 265 250 L 180 270" stroke="${salColor}" stroke-width="${sw(jachalProyectado.caudalMejoradoM3s ?? qJachal * 0.4)}" fill="none"/>
  <ellipse cx="180" cy="285" rx="55" ry="22" fill="#e8f5f0" stroke="${salColor}" stroke-width="2"/>
  <text x="180" y="282" text-anchor="middle" font-size="10" font-weight="600">Río Jáchal</text>
  <text x="180" y="296" text-anchor="middle" font-size="9">${formatearNumero(jachalProyectado.salinidad ?? 2.5, 2)} g/l</text>
  <text x="400" y="300" font-size="10" fill="#5c4f54">Grosor ≈ caudal</text>
</svg>`;
}

export function renderTimeline(container, etapaId, onChange) {
  container.innerHTML = ETAPAS_VICUNA.map(
    (e) => `
    <button type="button" class="timeline-item ${e.id === etapaId ? "active" : ""}" data-etapa="${e.id}">
      <span class="timeline-anio">${e.anio}</span>
      <span class="timeline-label">${e.label}</span>
      <span class="timeline-meta">${e.demandaM3s} m³/s mina</span>
    </button>`,
  ).join("");

  container.querySelectorAll(".timeline-item").forEach((btn) => {
    btn.addEventListener("click", () => onChange(parseInt(btn.dataset.etapa, 10)));
  });
}

export function renderODS(container, ods) {
  container.innerHTML = `
    <div class="ods-grid">
      <div class="ods-card"><span class="ods-num">${ods.ods6}</span><span class="ods-lbl">ODS 6 · Agua</span></div>
      <div class="ods-card"><span class="ods-num">${ods.ods3}</span><span class="ods-lbl">ODS 3 · Salud</span></div>
      <div class="ods-card"><span class="ods-num">${ods.ods8}</span><span class="ods-lbl">ODS 8 · Economía</span></div>
      <div class="ods-card ods-card--highlight"><span class="ods-num">${ods.licenciaSocial}</span><span class="ods-lbl">Licencia social</span></div>
    </div>
    <ul class="ods-list">
      <li>Población beneficiada (est.): <strong>${formatearNumero(ods.poblacionBeneficiada, 0)}</strong> hab.</li>
      <li>Empleo agroindustrial adicional: <strong>+${formatearNumero(ods.empleoAgroindustrial, 0)}</strong> puestos</li>
    </ul>`;
}

export function renderExtendidas(container, ext) {
  container.innerHTML = `
    <div class="ext-grid">
      <div class="ext-item">
        <div class="ext-label">LCOW (25 años)</div>
        <div class="ext-value">USD ${formatearNumero(ext.lcow, 2)}/m³</div>
        <div class="ext-sub">Costo nivelado del agua</div>
      </div>
      <div class="ext-item">
        <div class="ext-label">Rechazo / brina</div>
        <div class="ext-value">${formatearNumero(ext.brina.toneladasSalDia, 0)} t/día</div>
        <div class="ext-sub">${formatearNumero(ext.brina.caudalRechazoM3s, 2)} m³/s · ${formatearNumero(ext.brina.salinidadRechazoGL, 1)} g/l</div>
      </div>
      <div class="ext-item">
        <div class="ext-label">Solar San Juan</div>
        <div class="ext-value">${formatearNumero(ext.solar.solarMWp, 1)} MWp</div>
        <div class="ext-sub">${formatearNumero(ext.solar.coberturaSolarPct, 0)}% demanda · −${formatearNumero(ext.solar.ahorroCO2tAnio, 0)} t CO₂/año</div>
      </div>
      <div class="ext-item">
        <div class="ext-label">Etapa Vicuña</div>
        <div class="ext-value">${ext.etapa.anio}</div>
        <div class="ext-sub">${ext.etapa.label} · ${ext.demandaEtapaM3s} m³/s</div>
      </div>
    </div>`;
}
