/**
 * Búsqueda automática de noticias, boletines y medios sobre el Observatorio.
 * DESTACADAS: avisos propios del Observatorio (siempre al inicio de la lista).
 */
window.OBS_NOTICIAS = {
  UCCUYO_API: "https://noticias.uccuyo.edu.ar/wp-json/wp/v2/posts",
  BUSQUEDAS: [
    "observatorio inteligencia artificial",
    "observatorio de ia",
    "oia uccuyo",
    "boletin observatorio ia"
  ],
  PER_PAGE: 20,
  /** Medios que no deben aparecer en la sección Noticias. */
  MEDIOS_EXCLUIDOS: ["diario de cuyo", "diariodecuyo.com"],
  DESTACADAS: [
    {
      id: "obs-webinar-evaluar-2026-08-13",
      fuente: "Observatorio de IA",
      medio: "Informe",
      titulo: "2° Webinar EvaluAR: 110 inscriptos de 21 instituciones",
      excerpt:
        "El 13 de agosto se realizó el 2° webinar sobre EvaluAR. Informe de padrón: 107 personas únicas, 21 instituciones y 9 provincias. UCCuyo y universidades de AMBA, litoral y Cuyo.",
      link: "docs/informes/informe-webinar-evaluar-13agosto-2026.pdf",
      fecha: "2026-08-13",
      origen: "observatorio"
    },
    {
      id: "obs-jornadas-ia-2026-10-06",
      fuente: "Observatorio de IA",
      medio: "Evento",
      titulo: "Próximas Jornadas de IA: 6 de octubre de 2026",
      excerpt:
        "1° Jornadas internas de Inteligencia Artificial de la UCCuyo. Encuentro virtual el 6 de octubre a las 15:00 h. Inscripción abierta para asistentes y expositores.",
      link: "#jornadas-ia",
      fecha: "2026-10-06",
      origen: "observatorio"
    }
  ]
};
