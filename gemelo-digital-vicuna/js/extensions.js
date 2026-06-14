import { simular, formatearNumero, FRACCION_MINERA_INFORME } from "./model.js";
import { ETAPAS_VICUNA } from "./presets.js";

const POBLACION_ZONA = 42000;

export function calcularLCOW(capexMUSD, opexAnualMUSD, qM3s, anos = 25, tasa = 0.08) {
  const m3Anual = qM3s * 86400 * 365;
  if (m3Anual <= 0) return 0;
  const capex = capexMUSD * 1e6;
  const opex = opexAnualMUSD * 1e6;
  const factorAnualidad = (tasa * Math.pow(1 + tasa, anos)) / (Math.pow(1 + tasa, anos) - 1);
  const capexAnual = capex * factorAnualidad;
  return (capexAnual + opex) / m3Anual;
}

export function calcularBrina(qDesalM3s, salEntradaGL, recuperacion = 0.75) {
  const qRechazo = qDesalM3s * (1 - recuperacion);
  const salRechazo = salEntradaGL / recuperacion;
  const tonDia = qRechazo * 86400 * salRechazo / 1000;
  return {
    caudalRechazoM3s: qRechazo,
    salinidadRechazoGL: salRechazo,
    toneladasSalDia: tonDia,
    recuperacionPct: recuperacion * 100,
  };
}

/** Factor de planta solar San Juan ~2.400 kWh/kWp·año */
export function calcularSolar(kwhM3, qM3s, fraccionSolar = 0.45) {
  const mwContinuo = (qM3s * 86400 * kwhM3) / 1e6 / 24;
  const mwSolar = mwContinuo * fraccionSolar;
  const mwp = (mwSolar * 1e6) / 2400 / 1000;
  return {
    demandaMW: mwContinuo,
    solarMWp: mwp,
    coberturaSolarPct: fraccionSolar * 100,
    ahorroCO2tAnio: mwSolar * 8760 * 0.45,
  };
}

export function calcularODS(data) {
  const jp = data.jachalProyectado;
  const mejora = jp.mejora;
  const boro = jp.boro ?? data.jachalActual.boro;
  const ha = jp.haRegablesPotencial ?? 3500;
  const cultivos = data.comparacion.cultivosDespues;

  const ods6 =
    (boro <= 0.5 ? 45 : boro <= 1 ? 25 : 10) +
    (mejora ? 30 : 0) +
    Math.min(25, (ha / 12000) * 25);

  const ods3 = (boro <= 0.5 ? 50 : 20) + (mejora ? 35 : 5);
  const ods8 =
    Math.min(40, cultivos * 4) +
    (mejora ? Math.min(35, ((ha - 3500) / 5500) * 35) : 0) +
    15;

  const licenciaSocial = Math.round((ods6 + ods3 + ods8) / 3);
  const empleoEstimado = mejora ? Math.round((ha - 3500) / 15) : 0;

  return {
    ods3: Math.min(100, Math.round(ods3)),
    ods6: Math.min(100, Math.round(ods6)),
    ods8: Math.min(100, Math.round(ods8)),
    licenciaSocial,
    poblacionBeneficiada: mejora ? Math.round(POBLACION_ZONA * (boro <= 1 ? 0.85 : 0.55)) : 0,
    empleoAgroindustrial: empleoEstimado,
  };
}

function normInv(val, min, max) {
  if (max <= min) return 50;
  const t = (val - min) / (max - min);
  return Math.max(0, Math.min(100, (1 - t) * 100));
}

function norm(val, min, max) {
  if (max <= min) return 50;
  return Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
}

export function scoresRadar(data) {
  const jp = data.jachalProyectado;
  const costo = data.costos.costoTotalM3USD;
  const kwh = data.energia.kwhM3;
  const ods = calcularODS(data);

  return {
    costo: normInv(costo, 1.2, 2.2),
    energia: normInv(kwh, 1.2, 4.5),
    mejoraJachal: jp.mejora ? norm(jp.reduccionSalPct ?? 0, 0, 50) : 0,
    licenciaSocial: ods.licenciaSocial,
    haRegables: norm(jp.haRegablesPotencial ?? 3500, 3500, 9000),
    riesgoLogistico:
      data.escenario === "pacifico" ? 25 : data.escenario === "hibrido" ? 55 : 78,
    autonomiaLocal:
      data.escenario === "pacifico" ? 20 : data.escenario === "hibrido" ? 60 : 90,
  };
}

export function compararRadar(factor, fraccion, etapaId) {
  const etapa = ETAPAS_VICUNA.find((e) => e.id === etapaId) ?? ETAPAS_VICUNA[0];
  const fracAjust = Math.min(FRACCION_MINERA_INFORME, fraccion);
  const pac = simular("pacifico", factor, fracAjust);
  const jach = simular("jachal", factor, fracAjust);
  return {
    pacifico: scoresRadar(pac),
    jachal: scoresRadar(jach),
    etapa,
  };
}

export function enriquecer(data, etapaId = 1) {
  const etapa = ETAPAS_VICUNA.find((e) => e.id === etapaId) ?? ETAPAS_VICUNA[0];
  const qDesal = data.vicuna.caudalDesalTotalM3s ?? data.vicuna.caudalM3s ?? 1.2;
  const salEntrada = data.escenario === "pacifico" ? 35 : 3.5;

  return {
    lcow: calcularLCOW(data.costos.capexMUSD, data.costos.opexAnualMUSD, qDesal),
    brina: calcularBrina(qDesal, salEntrada),
    solar: calcularSolar(data.energia.kwhM3, qDesal),
    ods: calcularODS(data),
    radar: scoresRadar(data),
    etapa,
    demandaEtapaM3s: etapa.demandaM3s,
  };
}

export function parsearCSVHistorico(texto) {
  const lineas = texto.trim().split(/\r?\n/).slice(1);
  const caudales = lineas
    .map((l) => {
      const p = l.split(/[,;]/);
      return parseFloat(p[p.length - 1]);
    })
    .filter((n) => !Number.isNaN(n));
  if (!caudales.length) return null;
  const prom = caudales.reduce((a, b) => a + b, 0) / caudales.length;
  return { promedio: prom, factor: Math.max(0.5, Math.min(1.2, prom / 9)), muestras: caudales.length };
}

export { formatearNumero };
