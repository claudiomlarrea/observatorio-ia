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

/** Referencia informe IdelAgua: 5 m³/s desalinizados, 1,2 m³/s a Vicuña (24 %) */
export const FRACCION_MINERA_INFORME = 0.24;
export const PCT_MINERA_INFORME = 24;

const REF = {
  qDesal: 5,
  fraccionMinera: FRACCION_MINERA_INFORME,
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
    fraccionMinera,
    qDesalJachal,
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
      caudalMejoradoM3s: qDesalJachal * 0.7 * (1 - fraccionMinera),
    };
    resultado.costos = costos;
    resultado.energia = {
      kwhM3: costos.kwhM3,
      mwEstimado: 30,
      nota: "Combinación: menor bombeo total que solo Pacífico",
    };
  }

  resultado.comparacion = {
    cultivosAntes: resultado.jachalActual.cultivos.length,
    cultivosDespues: resultado.jachalProyectado.cultivos?.length ?? resultado.jachalActual.cultivos.length,
  };

  resultado.alertas = generarAlertas(resultado);
  return resultado;
}

/** @typedef {'rojo' | 'amarillo' | 'verde'} NivelAlerta */
/** @typedef {{ nivel: NivelAlerta, texto: string }} Alerta */

/** @param {object} data @param {{ licenciaSocial?: number }} extra */
export function generarAlertas(data, extra = {}) {
  /** @type {Alerta[]} */
  const alertas = [];
  const jp = data.jachalProyectado;
  const ja = data.jachalActual;
  const sal = jp.salinidad ?? ja.salinidad;
  const boro = jp.boro ?? ja.boro;
  const mejora = jp.mejora === true;
  const reduccionSal = jp.reduccionSalPct ?? 0;
  const cultivos = data.comparacion.cultivosDespues;
  const ha = jp.haRegablesPotencial ?? 3500;
  const costo = data.costos.costoTotalM3USD;
  const kwh = data.energia.kwhM3;
  const factor = data.factorHidrologico;
  const frac = data.fraccionMinera ?? 0.24;
  const qCuenca = jp.caudalMejoradoM3s ?? 0;
  const licencia = extra.licenciaSocial;

  function push(nivel, texto) {
    alertas.push({ nivel, texto });
  }

  if (!mejora) {
    push("rojo", `El río Jáchal no mejora: sigue en ${formatearNumero(sal, 1)} g/l y ${formatearNumero(boro, 1)} mg/l de boro.`);
  } else if (sal <= 1.45 && boro <= 0.55) {
    push("verde", `Calidad del Jáchal favorable: ${formatearNumero(sal, 2)} g/l y boro ${formatearNumero(boro, 2)} mg/l (−${formatearNumero(reduccionSal, 0)}% salinidad).`);
  } else if (sal <= 1.65 && boro <= 0.85) {
    push("amarillo", `Mejora moderada del Jáchal (${formatearNumero(sal, 2)} g/l, boro ${formatearNumero(boro, 2)} mg/l); conviene revisar en sequía.`);
  } else {
    push("rojo", `Calidad del Jáchal insuficiente: ${formatearNumero(sal, 2)} g/l, boro ${formatearNumero(boro, 2)} mg/l.`);
  }

  if (mejora && cultivos >= 8) {
    push("verde", `${cultivos} cultivos de alto valor viables vs. ${data.comparacion.cultivosAntes} en situación actual.`);
  } else if (mejora && cultivos >= 4) {
    push("amarillo", `${cultivos} cultivos viables; por debajo del potencial pleno del informe IdelAgua.`);
  } else if (mejora) {
    push("rojo", `Solo ${cultivos} cultivos aptos — la calidad del agua limita la matriz agroindustrial.`);
  }

  if (mejora && ha >= 8000) {
    push("verde", `Has regables potenciales: ~${formatearNumero(ha, 0)} ha (vs. ~3.500 ha actuales).`);
  } else if (mejora && ha >= 5000) {
    push("amarillo", `Has regables estimadas: ~${formatearNumero(ha, 0)} ha — por debajo del máximo del embalse Cuesta del Viento.`);
  } else if (!mejora) {
    push("rojo", "Sin expansión de superficie regada: el Jáchal no mejora para el agro local.");
  }

  if (data.escenario === "jachal" || data.escenario === "hibrido") {
    if (frac >= FRACCION_MINERA_INFORME - 0.005) {
      push(
        "verde",
        `Reparto informe IdelAgua: ${PCT_MINERA_INFORME}% a Vicuña (~1,2 m³/s) y ${formatearNumero(qCuenca, 2)} m³/s a la cuenca.`,
      );
    } else if (frac >= 0.15) {
      push(
        "amarillo",
        `${Math.round(frac * 100)}% a la mina (${formatearNumero(qCuenca, 2)} m³/s al Jáchal) — por debajo de los 1,2 m³/s que Vicuña necesita según el informe.`,
      );
    } else {
      push(
        "rojo",
        `${Math.round(frac * 100)}% a Vicuña — insuficiente para cubrir la demanda minera de 1,2 m³/s del informe.`,
      );
    }
  }

  if (factor < 0.7) {
    push("rojo", `Sequía severa (factor ${formatearNumero(factor, 2)}): caudal ${formatearNumero(data.caudales.jachal, 1)} m³/s — riesgo de caudal ecológico.`);
  } else if (factor < 0.85) {
    push("amarillo", `Bajo caudal (factor ${formatearNumero(factor, 2)}): sube el costo por m³ y baja la calidad del río.`);
  } else if (factor >= 1.05) {
    push("verde", `Avenida (factor ${formatearNumero(factor, 2)}): mejor dilución y menores costos unitarios.`);
  }

  if (costo <= 1.55) {
    push("verde", `Costo del agua competitivo: USD ${formatearNumero(costo, 2)}/m³.`);
  } else if (costo <= 1.9) {
    push("amarillo", `Costo elevado: USD ${formatearNumero(costo, 2)}/m³ — revisar escala de planta y caudal.`);
  } else {
    push("rojo", `Costo alto: USD ${formatearNumero(costo, 2)}/m³ — escenario económicamente tensionado.`);
  }

  if (kwh <= 2.0) {
    push("verde", `Eficiencia energética favorable: ${formatearNumero(kwh, 1)} kWh/m³.`);
  } else if (kwh <= 3.5) {
    push("amarillo", `Consumo energético moderado: ${formatearNumero(kwh, 1)} kWh/m³.`);
  } else {
    push("rojo", `Alto consumo energético: ${formatearNumero(kwh, 1)} kWh/m³ (bombeo Pacífico a 4.200 m).`);
  }

  if (data.escenario === "pacifico") {
    push("rojo", "Dependencia logística binacional (Chile) y sin beneficio hídrico para Iglesia, Jáchal y Huaco.");
    push("amarillo", "Licencia social local limitada: la cuenca del Jáchal no participa del beneficio.");
  } else if (data.escenario === "hibrido") {
    push("amarillo", "Gobernanza compleja: acuerdos Argentina–Chile–provincia y dos fuentes de suministro.");
    push("verde", "Diversificación de riesgo: no depende de una sola fuente.");
  } else {
    push("amarillo", "Requiere acuerdo de gobernanza hídrica provincial (mina, productores, Estado).");
    if (mejora && sal <= 1.5) {
      push("verde", "Impacto positivo en licencia social: mejora agua potable y de riego en Iglesia, Jáchal y Huaco.");
    }
  }

  if (licencia != null) {
    if (licencia >= 70) {
      push("verde", `Licencia social: ${licencia}/100 — fuerte alineación con ODS 3, 6 y 8.`);
    } else if (licencia >= 45) {
      push("amarillo", `Licencia social moderada: ${licencia}/100 — reforzar narrativa comunitaria.`);
    } else {
      push("rojo", `Licencia social baja: ${licencia}/100 — poco favorable para comunidades locales.`);
    }
  }

  const orden = { rojo: 0, amarillo: 1, verde: 2 };
  alertas.sort((a, b) => orden[a.nivel] - orden[b.nivel]);
  return alertas;
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
