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
      medio: "Evento",
      titulo: "Próximo webinar de IA: EvaluAR — jueves 13 de agosto",
      excerpt:
        "Primer webinar del Observatorio. Presentamos EvaluAR (examen en papel · corrección digital). Jueves 13 de agosto de 2026, 19:00–20:00 hs, virtual por Google Meet. Inscripción gratuita.",
      link: "#webinars",
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
