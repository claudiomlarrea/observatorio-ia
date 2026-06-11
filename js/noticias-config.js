/**
 * Búsqueda automática de noticias, boletines y medios sobre el Observatorio.
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
  MEDIOS_EXCLUIDOS: ["diario de cuyo", "diariodecuyo.com"]
};
