/**
 * JHVT — Modelo del gemelo hídrico Jáchal–Vicuña
 * Basado en: Instituto del Agua UCCuyo — Propuesta desalinización Río Blanco / La Palca
 * Prof. Luis F. Jiménez
 */

/** @typedef {'pacifico' | 'jachal' | 'hibrido'} EscenarioId */

const CULTIVOS = [
  { nombre: "Olivo", boroMax: 0.5, salMax: 5.7 },
  { nombre: "Pistacho", boroMax: 0.5, salMax: 7.8 },
  { nombre: "Vid", boroMax: 0.5, salMax: 3.0 },
  { nombre: "Tomate", boroMax: 0.75, salMax: 3.0 },
  { nombre: "Almendro", boroMax: 0.5, salMax: 4.0 },
  { nombre: "Cebolla", boroMax: 1.0, salMax: 1.8 },
  { nombre: "Ajo", boroMax: 0.75, salMax: 2.5 },
  { nombre: "Alfalfa", boroMax: 1.7, salMax: 2.5 },
  { nombre: "Trigo", boroMax: 1.5, salMax: 7.0 },
  { nombre: "Membrillo (actual)", boroMax: 4.0, salMax: 4.0 },
];

const BASE = {
  caudalBlanco: 3,
  caudalPalca: 6,
  caudalJachal: 9,
  salBlanco: 3.5,
  salPalca: 2.5,
  boroBlanco: 3.9,
  boroPalca: 2.0,
  salJachalActual: 2.5,
  boroJachalActual: 3.5,
  palcaSinDesalinizar: 4,
  permeadoSal: 0.5,
  permeadoBoro: 0.5,
  caudalPacifico: 1.2,
  salPacifico: 35,
  costoBoroM3: 0.9,
  costoDesalM3: 0.64,
  capexJachalMUSD: 518.4,
  capexPacificoMUSD: 650,
  costoBombeoPacificoM3: 0.85,
  costoDesalPacificoM3: 0.55,
  demandaMineraM3s: 1.2,
  energiaKwhM3: 1.5,
  energiaPrecioUSD: 0.1,
};

/**
 * @param {number} factor — 0.5 sequía … 1.0 normal … 1.2 avenida
 */
function caudalesHidrologicos(factor) {
  const f = Math.max(0.4, Math.min(1.3, factor));
  return {
    blanco: BASE.caudalBlanco * f,
    palca: BASE.caudalPalca * f,
    jachal: BASE.caudalJachal * f,
  };
}

function mezclaSalinidad(qDesal, salPermeado, qPalcaResto, salPalca, qTotal) {
  if (qTotal <= 0) return 0;
  return (qDesal * salPermeado + qPalcaResto * salPalca) / qTotal;
}

function cultivosAptos(boroMgL, salGL) {
  const salDS = salGL / 0.64;
  return CULTIVOS.filter((c) => boroMgL <= c.boroMax && salDS <= c.salMax);
}

/** Referencia informe IdelAgua: 5 m³/s, 24 % minera */
const REF = {
  qDesal: 5,
  fraccionMinera: 0.24,
  capexJachalMUSD: 518.4,
  costoJachalM3: 1.54,
  energiaJachalKwh: 1.5,
  capexPacificoMUSD: 650,
  costoPacificoM3: 1.4,
  energiaPacificoKwh: 4.2,
};

/**
 * CAPEX y USD/m³ reaccionan al caudal desalinizable y al % destinado a Vicuña.
 * Calibrado para coincidir con el informe en caudal 5 m³/s y ~24 % minera.
 */
function costosDinamicosJachal(qDesal, fraccionMinera) {
  const q = Math.max(qDesal, 0.8);
  const ratioQ = q / REF.qDesal;
  const deltaMinera = fraccionMinera - REF.fraccionMinera;

  const capexMUSD =
    REF.capexJachalMUSD * Math.pow(ratioQ, 0.78) * (1 + deltaMinera * 0.22);

  const costoTotalM3USD =
    REF.costoJachalM3 *
    Math.pow(1 / ratioQ, 0.38) *
    (1 + deltaMinera * 0.35);

  const kwhM3 =
    REF.energiaJachalKwh *
    Math.pow(1 / ratioQ, 0.22) *
    (1 + deltaMinera * 0.2);

  const m3Dia = q * 86400;
  const opexAnualMUSD = (m3Dia * costoTotalM3USD * 365) / 1e6;

  return { capexMUSD, costoTotalM3USD, opexM3USD: costoTotalM3USD, opexAnualMUSD, kwhM3 };
}

function costosDinamicosPacifico(fraccionMinera, factorHidrologico) {
  const q = BASE.demandaMineraM3s * (0.92 + factorHidrologico * 0.08);
  const deltaMinera = fraccionMinera - REF.fraccionMinera;
  const ratioQ = q / BASE.demandaMineraM3s;

  const capexMUSD =
    REF.capexPacificoMUSD * Math.pow(ratioQ, 0.65) * (1 + deltaMinera * 0.15);

  const costoBase = BASE.costoDesalPacificoM3 + BASE.costoBombeoPacificoM3;
  const costoTotalM3USD = costoBase * (1 + deltaMinera * 0.12);

  const kwhM3 = REF.energiaPacificoKwh * (1 + deltaMinera * 0.08);
  const m3Dia = q * 86400;
  const opexAnualMUSD = (m3Dia * costoTotalM3USD * 365) / 1e6;

  return { capexMUSD, costoTotalM3USD, opexM3USD: costoTotalM3USD, opexAnualMUSD, kwhM3, caudalM3s: q };
}

function costosDinamicosHibrido(qDesal, fraccionMinera, factorHidrologico) {
  const jach = costosDinamicosJachal(qDesal * 0.7, fraccionMinera);
  const pac = costosDinamicosPacifico(fraccionMinera, factorHidrologico);
  const pesoJach = 0.45;
  const pesoPac = 0.55;

  return {
    capexMUSD: jach.capexMUSD * pesoJach + pac.capexMUSD * pesoPac,
    costoTotalM3USD:
      jach.costoTotalM3USD * pesoJach + pac.costoTotalM3USD * pesoPac,
    opexM3USD: jach.costoTotalM3USD * pesoJach + pac.costoTotalM3USD * pesoPac,
    opexAnualMUSD: jach.opexAnualMUSD * pesoJach + pac.opexAnualMUSD * pesoPac,
    kwhM3: jach.kwhM3 * pesoJach + pac.kwhM3 * pesoPac,
  };
}

/**
 * @param {EscenarioId} escenario
 * @param {number} factorHidrologico
 * @param {number} fraccionMinera — 0–1 del agua tratada para Vicuña
 */
export function simular(escenario, factorHidrologico = 1, fraccionMinera = 0.24) {
  const caudales = caudalesHidrologicos(factorHidrologico);
  const qBlanco = caudales.blanco;
  const qPalca = caudales.palca;
  const qJachal = caudales.jachal;
  const qPalcaParcial = Math.min(BASE.palcaSinDesalinizar * (qPalca / BASE.caudalPalca), qPalca * 0.67);
  const qDesalJachal = qBlanco + Math.max(0, qPalca - qPalcaParcial);

  const resultado = {
    escenario,
    factorHidrologico,
    caudales: { blanco: qBlanco, palca: qPalca, jachal: qJachal },
    jachalActual: {
      salinidad: BASE.salJachalActual,
      boro: BASE.boroJachalActual,
      cultivos: cultivosAptos(BASE.boroJachalActual, BASE.salJachalActual),
    },
    vicuna: {},
    jachalProyectado: {},
    costos: {},
    energia: {},
    alertas: [],
  };

  if (escenario === "pacifico") {
    const costos = costosDinamicosPacifico(fraccionMinera, factorHidrologico);
    const qMinera = costos.caudalM3s;
    resultado.vicuna = {
      fuente: "Océano Pacífico (Chile)",
      caudalM3s: qMinera,
      salinidadEntrada: BASE.salPacifico,
      salinidadSalida: BASE.permeadoSal,
      boro: BASE.permeadoBoro,
      bombeoAltitudM: 4200,
    };
    resultado.jachalProyectado = {
      salinidad: BASE.salJachalActual,
      boro: BASE.boroJachalActual,
      mejora: false,
      cultivos: cultivosAptos(BASE.boroJachalActual, BASE.salJachalActual),
      haRegablesPotencial: 3500,
    };
    resultado.costos = costos;
    resultado.energia = {
      kwhM3: costos.kwhM3,
      mwEstimado: 42,
      nota: "Bombeo a 4.200 m + desalinización marina",
    };
    resultado.alertas.push(
      "Sin mejora de calidad del río Jáchal",
      "Dependencia logística binacional (Chile)",
      "Alto consumo energético por bombeo en altura",
    );
  }

  if (escenario === "jachal") {
    const salBase = mezclaSalinidad(
      qDesalJachal,
      BASE.permeadoSal,
      qPalcaParcial,
      BASE.salPalca,
      qJachal,
    );
    const salFinal = salBase + (1 - factorHidrologico) * 0.35;
    // Resultado objetivo del informe IdelAgua: mezcla ~1,4 g/l y ~0,5 mg/l B
    const boroBase = 0.5;
    const boroFinal =
      boroBase + (1 - factorHidrologico) * 0.25 + (qDesalJachal < 4 ? 0.15 : 0);
    const qMinera = Math.min(BASE.demandaMineraM3s, qDesalJachal * fraccionMinera);
    const qMejoraCuenca = qDesalJachal - qMinera;
    const costos = costosDinamicosJachal(qDesalJachal, fraccionMinera);

    resultado.vicuna = {
      fuente: "Cuenca Blanco – La Palca (San Juan)",
      caudalM3s: qMinera,
      caudalDesalTotalM3s: qDesalJachal,
      salinidadEntrada: BASE.salBlanco,
      salinidadSalida: BASE.permeadoSal,
      boro: BASE.permeadoBoro,
      bombeoAltitudM: 1200,
    };
    resultado.jachalProyectado = {
      salinidad: salFinal,
      boro: boroFinal,
      mejora: true,
      reduccionSalPct: ((BASE.salJachalActual - salFinal) / BASE.salJachalActual) * 100,
      reduccionBoroPct: ((BASE.boroJachalActual - boroFinal) / BASE.boroJachalActual) * 100,
      cultivos: cultivosAptos(boroFinal, salFinal),
      haRegablesPotencial: salFinal <= 1.5 ? 9000 : 5500,
      caudalMejoradoM3s: qMejoraCuenca,
    };
    resultado.costos = costos;
    resultado.energia = {
      kwhM3: costos.kwhM3,
      mwEstimado: (qDesalJachal * 86400 * costos.kwhM3 * BASE.energiaPrecioUSD) / 1e6 * 50,
      nota: "Ósmosis inversa — menor salinidad de entrada vs. océano",
    };
    resultado.alertas.push(
      "Mejora significativa del agua del Jáchal",
      "Impacto positivo en licencia social (Iglesia, Jáchal, Huaco)",
      "Requiere acuerdo de gobernanza hídrica provincial",
    );
    if (factorHidrologico < 0.7) {
      resultado.alertas.push("⚠ Sequía: caudales reducidos — revisar caudal ecológico");
    }
  }

  if (escenario === "hibrido") {
    const qPac = BASE.demandaMineraM3s * 0.6;
    const qJach = BASE.demandaMineraM3s * 0.4;
    const salFinal = mezclaSalinidad(
      qDesalJachal * 0.7,
      BASE.permeadoSal,
      qPalcaParcial + qBlanco * 0.3,
      BASE.salPalca,
      qJachal,
    );
    const boroFinal =
      (qDesalJachal * 0.7 * BASE.permeadoBoro +
        (qPalcaParcial + qBlanco * 0.3) * BASE.boroPalca) /
      qJachal;
    const costos = costosDinamicosHibrido(qDesalJachal, fraccionMinera, factorHidrologico);

    resultado.vicuna = {
      fuente: "Híbrido: 60% Pacífico + 40% cuenca Jáchal",
      caudalM3s: BASE.demandaMineraM3s,
      caudalPacificoM3s: qPac,
      caudalJachalM3s: qJach,
      salinidadSalida: BASE.permeadoSal,
      boro: BASE.permeadoBoro,
    };
    resultado.jachalProyectado = {
      salinidad: salFinal,
      boro: boroFinal,
      mejora: true,
      reduccionSalPct: ((BASE.salJachalActual - salFinal) / BASE.salJachalActual) * 100,
      reduccionBoroPct: ((BASE.boroJachalActual - boroFinal) / BASE.boroJachalActual) * 100,
      cultivos: cultivosAptos(boroFinal, salFinal),
      haRegablesPotencial: 6500,
    };
    resultado.costos = costos;
    resultado.energia = {
      kwhM3: costos.kwhM3,
      mwEstimado: 30,
      nota: "Combinación: menor bombeo total que solo Pacífico",
    };
    resultado.alertas.push(
      "Diversificación de riesgo de suministro",
      "Mejora parcial del Jáchal",
      "Mayor complejidad de gobernanza (AR + CL + provincia)",
    );
  }

  resultado.comparacion = {
    cultivosAntes: resultado.jachalActual.cultivos.length,
    cultivosDespues: resultado.jachalProyectado.cultivos?.length ?? resultado.jachalActual.cultivos.length,
  };

  return resultado;
}

export function etiquetaEstacion(factor) {
  if (factor < 0.75) return "Sequía / bajo caudal";
  if (factor > 1.05) return "Avenida / alto caudal";
  return "Ciclo hidrológico normal";
}

export function formatearNumero(n, dec = 1) {
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  }).format(n);
}
