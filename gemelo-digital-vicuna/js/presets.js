/** Escenarios predefinidos para demo en vivo */
export const PRESETS = [
  {
    id: "normal",
    label: "Ciclo normal (informe IdelAgua)",
    escenario: "jachal",
    factor: 1,
    minera: 24,
    etapa: 1,
  },
  {
    id: "sequia2030",
    label: "Sequía extrema 2030",
    escenario: "jachal",
    factor: 0.5,
    minera: 24,
    etapa: 1,
  },
  {
    id: "avenida",
    label: "Avenida post El Niño",
    escenario: "jachal",
    factor: 1.2,
    minera: 24,
    etapa: 1,
  },
  {
    id: "equilibrio",
    label: "50 % mina · 50 % cuenca",
    escenario: "jachal",
    factor: 1,
    minera: 50,
    etapa: 1,
  },
  {
    id: "pacifico-fid",
    label: "Pacífico (propuesta Vicuña)",
    escenario: "pacifico",
    factor: 1,
    minera: 24,
    etapa: 1,
  },
  {
    id: "etapa3",
    label: "Vicuña Etapa 3 — mayor demanda",
    escenario: "jachal",
    factor: 1,
    minera: 40,
    etapa: 3,
  },
  {
    id: "hibrido-riesgo",
    label: "Híbrido — diversificar riesgo",
    escenario: "hibrido",
    factor: 0.85,
    minera: 30,
    etapa: 2,
  },
];

export const ETAPAS_VICUNA = [
  { id: 1, anio: 2030, label: "Etapa 1 — Josemaría", demandaM3s: 1.2, capexMUSD: 7100 },
  { id: 2, anio: 2035, label: "Etapa 2 — Filo óxidos", demandaM3s: 1.8, capexMUSD: 3900 },
  { id: 3, anio: 2042, label: "Etapa 3 — Filo sulfuros", demandaM3s: 2.8, capexMUSD: 7100 },
];
