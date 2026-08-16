/**
 * Normaliza y valida un evento de congreso/jornada/reunión.
 */
window.CC_NORMALIZE = (() => {
  const KNOWN_TIPOS = new Set([
    "bienvenida",
    "conferencia",
    "plenaria",
    "mesa",
    "conversatorio",
    "taller",
    "poster",
    "simposio",
    "curso",
    "exposicion",
    "acto",
    "receso",
  ]);

  /** Tipos que generan botón atajo en la botonera si hay al menos 1 sesión */
  const ATAJO_TIPOS = [
    { tipo: "taller", icon: "Ta", className: "mode-btn-talleres", labelKey: "mode.talleres" },
    { tipo: "poster", icon: "Po", className: "mode-btn-posters", labelKey: "mode.posters" },
    { tipo: "simposio", icon: "Si", className: "mode-btn-simposio", labelKey: "mode.simposio" },
    { tipo: "curso", icon: "Cu", className: "mode-btn-curso", labelKey: "mode.curso" },
    { tipo: "exposicion", icon: "Ex", className: "mode-btn-exposicion", labelKey: "mode.exposicion" },
  ];

  function padTime(t) {
    const m = String(t || "").trim().match(/^(\d{1,2}):(\d{2})/);
    if (!m) return String(t || "");
    return `${String(m[1]).padStart(2, "0")}:${m[2]}`;
  }

  function slug(text) {
    return String(text || "item")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48);
  }

  function normalize(raw) {
    if (!raw || typeof raw !== "object") throw new Error("JSON inválido");
    const metaIn = raw.meta || {};
    const sesionesIn = Array.isArray(raw.sesiones) ? raw.sesiones : [];
    if (!sesionesIn.length) throw new Error("El evento no tiene sesiones");

    const sesiones = sesionesIn.map((s, i) => {
      const dia = String(s.dia || "").slice(0, 10);
      const inicio = padTime(s.inicio);
      const fin = padTime(s.fin);
      const tipo = String(s.tipo || "conferencia").toLowerCase();
      const titulo = String(s.titulo || `Sesión ${i + 1}`).trim();
      const id =
        String(s.id || "").trim() ||
        `${tipo}-${dia}-${inicio}-${slug(s.sala || "sala")}-${slug(titulo)}-${i}`;
      return {
        id,
        dia,
        inicio,
        fin,
        sala: String(s.sala || "").trim(),
        tipo: KNOWN_TIPOS.has(tipo) ? tipo : tipo || "conferencia",
        titulo,
        disertantes: Array.isArray(s.disertantes) ? s.disertantes.filter(Boolean) : [],
        moderadores: Array.isArray(s.moderadores) ? s.moderadores.filter(Boolean) : [],
        ejeId: s.ejeId || "",
        tallerNumero: s.tallerNumero || null,
        posterNumero: s.posterNumero || null,
      };
    });

    const fechas =
      Array.isArray(metaIn.fechas) && metaIn.fechas.length
        ? metaIn.fechas.map(String)
        : [...new Set(sesiones.map((s) => s.dia))].sort();

    let salas =
      Array.isArray(metaIn.salas) && metaIn.salas.length
        ? metaIn.salas.map(String)
        : [...new Set(sesiones.map((s) => s.sala).filter(Boolean))];

    const ejes = Array.isArray(raw.ejes)
      ? raw.ejes.map((e, i) => ({
          id: e.id || `eje-${i + 1}`,
          dia: e.dia || fechas[i] || fechas[0],
          nombre: e.nombre || `Eje ${i + 1}`,
        }))
      : [];

    const descargas = Array.isArray(metaIn.descargas)
      ? metaIn.descargas.map((d, i) => ({
          id: String(d.id || `pdf-${i + 1}`),
          label: String(d.label || "Descargar PDF"),
          labelEn: String(d.labelEn || d.label || "Download PDF"),
          href: String(d.href || ""),
        }))
      : [];

    const counts = {};
    for (const s of sesiones) {
      if (s.tipo === "receso") continue;
      counts[s.tipo] = (counts[s.tipo] || 0) + 1;
    }

    const atajos = ATAJO_TIPOS.filter((a) => (counts[a.tipo] || 0) > 0).map((a) => ({
      ...a,
      count: counts[a.tipo],
    }));

    return {
      meta: {
        titulo: metaIn.titulo || "Consulta Académica",
        subtitulo: metaIn.subtitulo || "",
        fechas,
        sede: metaIn.sede || "",
        salas,
        organizador: metaIn.organizador || "Observatorio de IA · UCCuyo",
        sitioOficial: metaIn.sitioOficial || "https://observatorio-ia.uccuyo.edu.ar/",
        fuente: metaIn.fuente || "",
        descargas,
      },
      ejes,
      sesiones,
      _derived: { counts, atajos, hasEjes: ejes.length > 0, hasSalas: salas.length > 0 },
    };
  }

  return { normalize, ATAJO_TIPOS, KNOWN_TIPOS };
})();
