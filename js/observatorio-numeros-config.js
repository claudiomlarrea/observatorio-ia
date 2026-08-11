/**
 * Cifras verificables del Observatorio (actualizar cuando cambien).
 * visits/provincias pueden sobreescribirse en runtime desde el mapa.
 */
window.OBS_NUMEROS = {
  items: [
    { id: "sistemas", value: 5, labelEs: "Sistemas desarrollados", labelEn: "Systems developed", href: "#herramientas" },
    { id: "encuestas", value: 2, labelEs: "Encuestas institucionales", labelEn: "Institutional surveys", href: "#encuestas" },
    { id: "publicaciones", value: 19632828, labelEs: "Publicaciones de IA en el mundo", labelEn: "AI publications worldwide", href: "#publicaciones-global-ia", fromOpenAlex: true },
    { id: "jornadas", value: 1, labelEs: "Jornadas de IA", labelEn: "AI conference", href: "#jornadas-ia" },
    { id: "semillero", value: 1, labelEs: "Semillero de IA", labelEn: "AI Seedbed", href: "#semillero-ia" },
    { id: "webinars", value: 1, labelEs: "Webinars", labelEn: "Webinars", href: "#webinars" },
    { id: "visitas", value: null, labelEs: "Visitas con origen", labelEn: "Visits with origin", href: "#visitas", fromVisitas: true },
    { id: "provincias", value: null, labelEs: "Provincias / regiones", labelEn: "Provinces / regions", href: "#visitas", fromRegiones: true },
    { id: "lineas", value: 4, labelEs: "Líneas de acompañamiento", labelEn: "Support lines", href: "#acompanamiento" }
  ],
  editorialEs:
    "Ritmo editorial: al menos un producto al mes (informe, indicador, encuesta o herramienta).",
  editorialEn:
    "Editorial cadence: at least one product per month (report, indicator, survey, or tool)."
};
