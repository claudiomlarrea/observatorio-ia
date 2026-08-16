/**
 * Consulta Congreso — Observatorio de IA
 * Lógica genérica de la app: carga el evento (store → fetch → normalize),
 * arma la botonera según los datos disponibles y resuelve cada modo de búsqueda.
 */
(() => {
  const t = (key, vars) => (window.I18N && window.I18N.t ? window.I18N.t(key, vars) : key);

  const TIPO_KEYS = {
    bienvenida: "tipo.bienvenida",
    conferencia: "tipo.conferencia",
    plenaria: "tipo.plenaria",
    mesa: "tipo.mesa",
    conversatorio: "tipo.conversatorio",
    taller: "tipo.taller",
    poster: "tipo.poster",
    simposio: "tipo.simposio",
    curso: "tipo.curso",
    exposicion: "tipo.exposicion",
    acto: "tipo.acto",
    receso: "tipo.receso",
  };

  const TIPO_ORDER = [
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
  ];

  const MODE_COPY_KEYS = {
    horario: { title: "step.horario.dayTitle", help: "step.horario.dayHelp" },
    tema: { title: "step.tema.title", help: "step.tema.help" },
    tipo: { title: "step.tipo.title", help: "step.tipo.help" },
    disertante: { title: "step.disertante.title", help: "step.disertante.help" },
    aula: { title: "step.aula.title", help: "step.aula.help" },
    agenda: { title: "step.agenda.title", help: "step.agenda.help" },
    ahora: { title: "step.ahora.title", help: "step.ahora.help" },
  };

  const AGENDA_KEY = "consulta_congreso_agenda";
  const PROGRAM_STORE_KEY = "consulta_congreso_app_backup";
  const DATA_VERSION = "1";
  const DATA_URL = "data/evento.ejemplo.json";
  const COMPACT_GRID_MODES = ["horario", "tipo", "aula", "atajo"];

  const state = {
    data: null,
    mode: "horario",
    atajoTipo: null,
    day: null,
    letter: "Todas",
    personQuery: "",
    selection: null,
    showResults: false,
    eventsBound: false,
  };

  const els = {
    botonera: document.getElementById("botonera"),
    stepPanel: document.getElementById("step-panel"),
    stepTitle: document.getElementById("step-title"),
    stepHelp: document.getElementById("step-help"),
    stepTools: document.getElementById("step-tools"),
    personFilter: document.getElementById("person-filter"),
    optionGrid: document.getElementById("option-grid"),
    results: document.getElementById("results"),
    resultsTitle: document.getElementById("results-title"),
    resultsBody: document.getElementById("results-body"),
    backBtn: document.getElementById("back-btn"),
    downloadLinks: document.getElementById("download-links"),
    brandTitle: document.getElementById("brand-title"),
    brandSub: document.getElementById("brand-sub"),
    brandDates: document.getElementById("brand-dates"),
    brandKicker: document.getElementById("brand-kicker"),
    offlineBanner: document.getElementById("offline-banner"),
  };

  // ---------------------------------------------------------------------
  // Utilidades generales
  // ---------------------------------------------------------------------

  function escapeHtml(text) {
    return String(text ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function foldText(text) {
    return String(text || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function highlight(text, query) {
    const safe = escapeHtml(text);
    if (!query) return safe;
    const nQuery = foldText(query).trim();
    if (!nQuery) return safe;
    const nText = foldText(text);
    const idx = nText.indexOf(nQuery);
    if (idx < 0) return safe;
    let oi = 0;
    let ni = 0;
    let start = -1;
    let end = -1;
    while (oi < text.length && ni <= nText.length) {
      if (ni === idx) start = oi;
      if (ni === idx + nQuery.length) {
        end = oi;
        break;
      }
      const nCh = foldText(text[oi]);
      oi += 1;
      ni += nCh.length;
    }
    if (ni === idx + nQuery.length && end < 0) end = oi;
    if (start < 0 || end < 0) return safe;
    return (
      escapeHtml(text.slice(0, start)) +
      `<mark class="highlight">${escapeHtml(text.slice(start, end))}</mark>` +
      escapeHtml(text.slice(end))
    );
  }

  function toMinutes(hhmm) {
    const [h, m] = String(hhmm || "0:0").split(":").map(Number);
    return h * 60 + m;
  }

  function localeForLang() {
    const lang = window.I18N && window.I18N.getLang ? window.I18N.getLang() : "es";
    return lang === "en" ? "en-US" : "es-AR";
  }

  function toDate(iso) {
    return new Date(`${iso}T00:00:00`);
  }

  function capitalize(text) {
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
  }

  function dayShort(iso) {
    try {
      const fmt = new Intl.DateTimeFormat(localeForLang(), {
        weekday: "short",
        day: "2-digit",
        month: "short",
      });
      return capitalize(fmt.format(toDate(iso)));
    } catch (_e) {
      return String(iso);
    }
  }

  function dayLong(iso) {
    try {
      const fmt = new Intl.DateTimeFormat(localeForLang(), {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      return capitalize(fmt.format(toDate(iso)));
    } catch (_e) {
      return String(iso);
    }
  }

  function tipoLabel(tipo) {
    return t(TIPO_KEYS[tipo] || tipo);
  }

  function sessionCountLabel(n) {
    return n === 1 ? t("count.session", { n }) : t("count.sessions", { n });
  }

  function argentinaNow() {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Argentina/Buenos_Aires",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]));
    return {
      date: `${parts.year}-${parts.month}-${parts.day}`,
      minutes: Number(parts.hour) * 60 + Number(parts.minute),
    };
  }

  function groupBySlot(sessions) {
    const map = new Map();
    for (const s of sessions) {
      const key = `${s.inicio}|${s.fin}`;
      if (!map.has(key)) map.set(key, { inicio: s.inicio, fin: s.fin, items: [] });
      map.get(key).items.push(s);
    }
    return [...map.values()].sort((a, b) => toMinutes(a.inicio) - toMinutes(b.inicio));
  }

  function groupByDay(sessions) {
    const map = new Map();
    for (const s of sessions) {
      if (!map.has(s.dia)) map.set(s.dia, []);
      map.get(s.dia).push(s);
    }
    return [...map.keys()].sort().map((dia) => ({ dia, items: map.get(dia) }));
  }

  function personLastName(full) {
    const cleaned = String(full || "").replace(/\([^)]*\)/g, "").trim();
    const parts = cleaned.split(/\s+/).filter(Boolean);
    const withoutTitle = parts.filter(
      (p) => !/^(dr\.?|dra\.?|lic\.?|mg\.?|mgtr\.?|mgter\.?|ing\.?|téc\.?|prof\.?)$/i.test(p)
    );
    return withoutTitle[withoutTitle.length - 1] || cleaned;
  }

  function collectPeople() {
    const map = new Map();
    for (const s of state.data.sesiones) {
      for (const role of ["disertantes", "moderadores"]) {
        for (const name of s[role] || []) {
          if (!name) continue;
          if (!map.has(name)) map.set(name, { name, roles: new Set(), count: 0 });
          map
            .get(name)
            .roles.add(role === "disertantes" ? t("role.speakerOne") : t("role.moderatorOne"));
          map.get(name).count += 1;
        }
      }
    }
    return [...map.values()].sort((a, b) =>
      foldText(personLastName(a.name)).localeCompare(foldText(personLastName(b.name)), "es")
    );
  }

  // ---------------------------------------------------------------------
  // Agenda personal (localStorage)
  // ---------------------------------------------------------------------

  function loadAgendaIds() {
    try {
      const raw = localStorage.getItem(AGENDA_KEY);
      const ids = raw ? JSON.parse(raw) : [];
      return Array.isArray(ids) ? ids.filter((id) => typeof id === "string") : [];
    } catch (_e) {
      return [];
    }
  }

  function saveAgendaIds(ids) {
    try {
      localStorage.setItem(AGENDA_KEY, JSON.stringify(ids));
    } catch (_e) {}
    updateAgendaBadge();
  }

  function isInAgenda(id) {
    return loadAgendaIds().includes(id);
  }

  function toggleAgenda(id) {
    if (!id) return false;
    const ids = loadAgendaIds();
    const idx = ids.indexOf(id);
    if (idx >= 0) ids.splice(idx, 1);
    else ids.push(id);
    saveAgendaIds(ids);
    return ids.includes(id);
  }

  function clearAgenda() {
    saveAgendaIds([]);
  }

  function updateAgendaBadge() {
    const badge = document.getElementById("agenda-count");
    if (!badge) return;
    const n = loadAgendaIds().length;
    badge.textContent = String(n);
    badge.hidden = n === 0;
  }

  function agendaSessions() {
    const ids = new Set(loadAgendaIds());
    return (state.data?.sesiones || [])
      .filter((s) => ids.has(s.id))
      .sort(
        (a, b) =>
          a.dia.localeCompare(b.dia) ||
          toMinutes(a.inicio) - toMinutes(b.inicio) ||
          String(a.titulo).localeCompare(String(b.titulo), "es")
      );
  }

  function sessionsOverlap(a, b) {
    if (!a || !b || a.dia !== b.dia || a.id === b.id) return false;
    return toMinutes(a.inicio) < toMinutes(b.fin) && toMinutes(b.inicio) < toMinutes(a.fin);
  }

  function conflictIds(sessions) {
    const conflicts = new Set();
    for (let i = 0; i < sessions.length; i += 1) {
      for (let j = i + 1; j < sessions.length; j += 1) {
        if (sessionsOverlap(sessions[i], sessions[j])) {
          conflicts.add(sessions[i].id);
          conflicts.add(sessions[j].id);
        }
      }
    }
    return conflicts;
  }

  // ---------------------------------------------------------------------
  // Branding + descargas
  // ---------------------------------------------------------------------

  function formatBrandDates(meta) {
    const fechas = Array.isArray(meta.fechas) ? meta.fechas : [];
    const parts = [];
    if (fechas.length) parts.push(fechas.map((d) => dayShort(d)).join(" · "));
    if (meta.sede) parts.push(meta.sede);
    return parts.join(" — ");
  }

  function renderDownloadLinks(descargas) {
    if (!els.downloadLinks) return;
    const lang = window.I18N && window.I18N.getLang ? window.I18N.getLang() : "es";
    const items = (Array.isArray(descargas) ? descargas : []).filter((d) => d && d.href);
    els.downloadLinks.innerHTML = items
      .map((d) => {
        const label = (lang === "en" ? d.labelEn : d.label) || d.label || "";
        return `<a class="pdf-download" href="${escapeHtml(d.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(
          label
        )}</a>`;
      })
      .join("");
  }

  async function resolveDescargas(meta) {
    const list = Array.isArray(meta.descargas) ? meta.descargas : [];
    const out = [];
    for (const d of list) {
      let href = d.href || "";
      if (!href && window.CC_STORE?.pdfObjectUrl) {
        try {
          href = await window.CC_STORE.pdfObjectUrl(d.id);
        } catch (_e) {}
      }
      out.push({ ...d, href });
    }
    return out;
  }

  async function applyBranding(data) {
    const meta = data.meta || {};
    if (els.brandKicker && meta.organizador) els.brandKicker.textContent = meta.organizador;
    if (els.brandTitle && meta.titulo) els.brandTitle.textContent = meta.titulo;
    if (els.brandSub && meta.subtitulo) els.brandSub.textContent = meta.subtitulo;
    if (els.brandDates) els.brandDates.textContent = formatBrandDates(meta);
    const descargas = await resolveDescargas(meta);
    meta.descargas = descargas;
    renderDownloadLinks(descargas);
    const footerSource = document.getElementById("footer-source");
    if (footerSource) footerSource.textContent = meta.fuente || "";
  }

  // ---------------------------------------------------------------------
  // Botonera dinámica
  // ---------------------------------------------------------------------

  function modeButtonHtml({ mode, icon, labelKey, extraClass, active }) {
    return `
      <button
        type="button"
        class="mode-btn${extraClass ? ` ${extraClass}` : ""}${active ? " is-active" : ""}"
        data-mode="${escapeHtml(mode)}"
      >
        <span class="mode-icon" aria-hidden="true">${escapeHtml(icon)}</span>
        <span data-i18n="${escapeHtml(labelKey)}">${escapeHtml(t(labelKey))}</span>
      </button>
    `;
  }

  function agendaButtonHtml() {
    return `
      <button type="button" class="mode-btn mode-btn-agenda" data-mode="agenda">
        <span class="mode-icon" aria-hidden="true">Ag</span>
        <span data-i18n="mode.agenda">${escapeHtml(t("mode.agenda"))}</span>
        <span class="mode-count" id="agenda-count" hidden>0</span>
      </button>
    `;
  }

  function atajoButtonHtml(atajo) {
    return `
      <button
        type="button"
        class="mode-btn ${escapeHtml(atajo.className || "")}"
        data-mode="atajo"
        data-tipo="${escapeHtml(atajo.tipo)}"
      >
        <span class="mode-icon" aria-hidden="true">${escapeHtml(atajo.icon || "")}</span>
        <span data-i18n="${escapeHtml(atajo.labelKey)}">${escapeHtml(t(atajo.labelKey))}</span>
      </button>
    `;
  }

  function renderBotonera(data) {
    if (!els.botonera) return;
    const derived = data._derived || {};
    const buttons = [];

    buttons.push(
      modeButtonHtml({ mode: "horario", icon: "Ho", labelKey: "mode.horario", active: true })
    );
    buttons.push(modeButtonHtml({ mode: "tipo", icon: "Tp", labelKey: "mode.tipo" }));
    buttons.push(modeButtonHtml({ mode: "disertante", icon: "Di", labelKey: "mode.disertante" }));

    if (derived.hasEjes) {
      buttons.push(modeButtonHtml({ mode: "tema", icon: "Te", labelKey: "mode.tema" }));
    }
    if (derived.hasSalas) {
      buttons.push(modeButtonHtml({ mode: "aula", icon: "Au", labelKey: "mode.aula" }));
    }

    for (const atajo of derived.atajos || []) {
      buttons.push(atajoButtonHtml(atajo));
    }

    buttons.push(agendaButtonHtml());
    buttons.push(
      modeButtonHtml({ mode: "ahora", icon: "Ah", labelKey: "mode.ahora", extraClass: "mode-btn-now" })
    );

    els.botonera.innerHTML = buttons.join("");
    updateAgendaBadge();
  }

  // ---------------------------------------------------------------------
  // Render de sesiones y opciones
  // ---------------------------------------------------------------------

  function renderSession(session, query = "", options = {}) {
    const isReceso = session.tipo === "receso";
    const tipo = tipoLabel(session.tipo);
    const people = [];
    if (session.disertantes?.length) {
      people.push(
        `<li><strong>${escapeHtml(t("role.speaker"))}:</strong> ${session.disertantes
          .map((p) => highlight(p, query))
          .join("; ")}</li>`
      );
    }
    if (session.moderadores?.length) {
      people.push(
        `<li><strong>${escapeHtml(t("role.moderator"))}:</strong> ${session.moderadores
          .map((p) => highlight(p, query))
          .join("; ")}</li>`
      );
    }
    const salaBadge = session.sala
      ? `<span class="badge badge-sala">${highlight(session.sala, query)}</span>`
      : "";
    const tallerBadge = session.tallerNumero
      ? `<span class="badge badge-taller">${escapeHtml(t("taller.number", { n: session.tallerNumero }))}</span>`
      : "";
    const posterBadge = session.posterNumero
      ? `<span class="badge badge-poster">${escapeHtml(t("poster.number", { n: session.posterNumero }))}</span>`
      : "";
    const saved = isInAgenda(session.id);
    const agendaBtn =
      !isReceso && session.id
        ? `<button
            type="button"
            class="agenda-toggle${saved ? " is-saved" : ""}"
            data-agenda-id="${escapeHtml(session.id)}"
            aria-pressed="${saved ? "true" : "false"}"
          >${escapeHtml(saved ? t("agenda.saved") : t("agenda.add"))}</button>`
        : "";
    const conflictClass = options.conflictIds?.has(session.id) ? " is-conflict" : "";

    return `
      <article class="session${isReceso ? " is-receso" : ""}${conflictClass}${
      saved ? " is-in-agenda" : ""
    }" data-sala="${escapeHtml(session.sala || "")}" data-session-id="${escapeHtml(session.id || "")}">
        <div class="session-meta">
          <span class="badge badge-time">${escapeHtml(session.inicio)} – ${escapeHtml(session.fin)}</span>
          ${salaBadge}
          ${tallerBadge}
          ${posterBadge}
          <span class="badge">${escapeHtml(tipo)}</span>
        </div>
        <h3 class="session-title">${highlight(session.titulo, query)}</h3>
        ${people.length ? `<ul class="session-people">${people.join("")}</ul>` : ""}
        ${agendaBtn}
      </article>
    `;
  }

  function renderSessionsList(sessions, query = "", options = {}) {
    if (!sessions.length) {
      return `<p class="empty">${escapeHtml(t(options.emptyKey || "results.empty"))}</p>`;
    }
    const conflicts = options.conflictIds || conflictIds(sessions);
    return groupByDay(sessions)
      .map(({ dia, items }) => {
        const slots = groupBySlot(items);
        return `
          <div>
            <h3 class="day-label">${escapeHtml(dayLong(dia))}</h3>
            ${slots
              .map((slot) => {
                const parallel = slot.items.filter((s) => s.tipo !== "receso").length > 1;
                return `
                  <section class="slot">
                    <h4 class="slot-time">${escapeHtml(slot.inicio)} <span>– ${escapeHtml(slot.fin)}</span></h4>
                    <div class="slot-grid${parallel ? " is-parallel" : ""}">
                      ${slot.items.map((s) => renderSession(s, query, { conflictIds: conflicts })).join("")}
                    </div>
                  </section>
                `;
              })
              .join("")}
          </div>
        `;
      })
      .join("");
  }

  function optionButton({ value, title, subtitle, count, selected }) {
    return `
      <button
        type="button"
        class="option-btn${selected ? " is-selected" : ""}"
        role="option"
        data-value="${escapeHtml(value)}"
        aria-selected="${selected ? "true" : "false"}"
      >
        <strong>${escapeHtml(title)}</strong>
        ${subtitle ? `<span>${escapeHtml(subtitle)}</span>` : ""}
        ${typeof count === "number" ? `<span class="count">${escapeHtml(sessionCountLabel(count))}</span>` : ""}
      </button>
    `;
  }

  // ---------------------------------------------------------------------
  // Selección de sesiones según el modo activo
  // ---------------------------------------------------------------------

  function atajoSessions(tipo) {
    return (state.data?.sesiones || []).filter((s) => s.tipo === tipo);
  }

  function sessionsForSelection() {
    const { mode, selection, data } = state;
    if (!selection || !data) return [];
    const all = data.sesiones.filter((s) => s.tipo !== "receso" || mode === "horario");

    switch (mode) {
      case "horario":
        return all.filter((s) => s.dia === selection.day && s.inicio === selection.inicio);
      case "tema":
        return all.filter((s) => s.ejeId === selection);
      case "tipo":
        return all.filter((s) => s.tipo === selection);
      case "disertante":
        return all.filter(
          (s) =>
            (s.disertantes || []).includes(selection) || (s.moderadores || []).includes(selection)
        );
      case "aula":
        return all.filter((s) => s.sala === selection);
      case "atajo": {
        const tipoSessions = atajoSessions(state.atajoTipo);
        if (selection.allDays) return tipoSessions;
        if (selection.wholeDay) return tipoSessions.filter((s) => s.dia === selection.day);
        return tipoSessions.filter((s) => s.dia === selection.day && s.inicio === selection.inicio);
      }
      case "agenda":
        return agendaSessions();
      case "ahora":
        return selection.sessions || [];
      default:
        return [];
    }
  }

  function resultsTitle() {
    const { mode, selection, data } = state;
    switch (mode) {
      case "horario":
        return `${dayShort(selection.day)} · ${selection.inicio}`;
      case "tema": {
        const eje = data.ejes.find((e) => e.id === selection);
        return eje ? t("results.axis", { name: eje.nombre }) : t("results.topic");
      }
      case "tipo":
        return tipoLabel(selection);
      case "aula":
      case "disertante":
        return selection;
      case "atajo": {
        const label = tipoLabel(state.atajoTipo);
        if (selection.allDays) return label;
        if (selection.wholeDay) return `${dayShort(selection.day)} · ${label}`;
        return `${dayShort(selection.day)} · ${selection.inicio}`;
      }
      default:
        return t("results.title");
    }
  }

  // ---------------------------------------------------------------------
  // Vistas principales
  // ---------------------------------------------------------------------

  function setMode(mode, opts = {}) {
    state.mode = mode;
    state.atajoTipo = mode === "atajo" ? opts.tipo || null : null;
    state.selection = null;
    state.showResults = false;
    state.day = null;
    state.letter = "Todas";
    state.personQuery = "";
    if (els.personFilter) els.personFilter.value = "";

    els.botonera?.querySelectorAll(".mode-btn").forEach((btn) => {
      const isThis =
        btn.dataset.mode === "atajo"
          ? mode === "atajo" && btn.dataset.tipo === state.atajoTipo
          : btn.dataset.mode === mode;
      btn.classList.toggle("is-active", isThis);
    });

    if (mode === "ahora") {
      showAhora();
      return;
    }
    if (mode === "agenda") {
      showAgenda();
      return;
    }

    els.results.hidden = true;
    els.stepPanel.hidden = false;
    renderStep();
  }

  function showResults() {
    const sessions = sessionsForSelection();
    const query = state.mode === "disertante" ? state.selection : "";
    state.showResults = true;
    els.stepPanel.hidden = true;
    els.results.hidden = false;
    els.resultsTitle.textContent = resultsTitle();
    els.resultsBody.innerHTML = renderSessionsList(sessions, query || "");
    els.results.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function showAgenda() {
    const sessions = agendaSessions();
    const conflicts = conflictIds(sessions);
    state.selection = { agenda: true };
    state.showResults = true;
    els.stepPanel.hidden = true;
    els.results.hidden = false;
    els.resultsTitle.textContent = t("agenda.title");

    let html = "";
    if (sessions.length) {
      html += `<p class="agenda-summary">${escapeHtml(t("agenda.summary", { n: sessions.length }))}</p>`;
      if (conflicts.size) {
        html += `<p class="agenda-conflict-banner" role="status">${escapeHtml(t("agenda.conflict"))}</p>`;
      }
      html += renderSessionsList(sessions, "", { conflictIds: conflicts });
      html += `<div class="agenda-actions">
        <button type="button" class="agenda-clear" id="agenda-clear">
          ${escapeHtml(t("agenda.clear"))}
        </button>
      </div>`;
    } else {
      html = `<p class="empty">${escapeHtml(t("agenda.empty"))}</p>
        <p class="agenda-empty-hint">${escapeHtml(t("agenda.emptyHint"))}</p>`;
    }

    els.resultsBody.innerHTML = html;
    els.results.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function showAhora() {
    const { date, minutes } = argentinaNow();
    const congressDays = state.data.meta.fechas;
    let label = t("now.next");
    let sessions = [];

    if (congressDays.includes(date)) {
      const today = state.data.sesiones.filter((s) => s.dia === date && s.tipo !== "receso");
      const ongoing = today.filter(
        (s) => toMinutes(s.inicio) <= minutes && minutes < toMinutes(s.fin)
      );
      if (ongoing.length) {
        label = t("now.ongoing");
        sessions = ongoing;
      } else {
        const upcoming = today
          .filter((s) => toMinutes(s.inicio) > minutes)
          .sort((a, b) => toMinutes(a.inicio) - toMinutes(b.inicio));
        if (upcoming.length) {
          const slotStart = upcoming[0].inicio;
          sessions = upcoming.filter((s) => s.inicio === slotStart);
          label = t("now.next");
        } else {
          label = t("now.end");
        }
      }
    } else {
      const firstDay = congressDays[0];
      const daySessions = state.data.sesiones
        .filter((s) => s.dia === firstDay && s.tipo !== "receso")
        .sort((a, b) => toMinutes(a.inicio) - toMinutes(b.inicio));
      if (daySessions.length) {
        const slotStart = daySessions[0].inicio;
        sessions = daySessions.filter((s) => s.inicio === slotStart);
        label = t("now.opening");
      }
    }

    state.selection = { sessions };
    els.stepPanel.hidden = true;
    els.results.hidden = false;
    state.showResults = true;
    els.resultsTitle.textContent = label;
    els.resultsBody.innerHTML = sessions.length
      ? renderSessionsList(sessions)
      : `<p class="empty">${escapeHtml(t("now.empty"))}</p>`;
  }

  function renderStep() {
    if (state.mode === "atajo") {
      renderAtajoStep();
      return;
    }

    const copy = MODE_COPY_KEYS[state.mode];
    els.stepTitle.textContent = t(copy.title);
    els.stepHelp.textContent = t(copy.help);
    els.stepTools.hidden = state.mode !== "disertante";
    els.optionGrid.classList.toggle("is-compact", COMPACT_GRID_MODES.includes(state.mode));

    if (state.mode === "horario") renderHorarioStep();
    else if (state.mode === "tema") renderTemaStep();
    else if (state.mode === "tipo") renderTipoStep();
    else if (state.mode === "disertante") renderDisertanteStep();
    else if (state.mode === "aula") renderAulaStep();
  }

  function renderHorarioStep() {
    if (!state.day) {
      els.stepTitle.textContent = t("step.horario.dayTitle");
      els.stepHelp.textContent = t("step.horario.dayHelp");
      els.optionGrid.innerHTML = state.data.meta.fechas
        .map((dia) =>
          optionButton({
            value: dia,
            title: dayShort(dia),
            count: state.data.sesiones.filter((s) => s.dia === dia && s.tipo !== "receso").length,
          })
        )
        .join("");
      return;
    }

    els.stepTitle.textContent = t("step.horario.slotTitle");
    els.stepHelp.textContent = dayLong(state.day);
    const daySessions = state.data.sesiones.filter(
      (s) => s.dia === state.day && s.tipo !== "receso"
    );
    const slots = groupBySlot(daySessions);
    els.optionGrid.innerHTML =
      optionButton({ value: "__back_days__", title: t("back.days"), subtitle: t("back.days.sub") }) +
      slots
        .map((slot) => {
          const salas = [...new Set(slot.items.map((s) => s.sala).filter(Boolean))].join(" · ");
          return optionButton({
            value: slot.inicio,
            title: `${slot.inicio} – ${slot.fin}`,
            subtitle: salas,
            count: slot.items.length,
          });
        })
        .join("");
  }

  function renderTemaStep() {
    els.optionGrid.innerHTML = state.data.ejes
      .map((eje) =>
        optionButton({
          value: eje.id,
          title: eje.nombre,
          subtitle: dayShort(eje.dia),
          count: state.data.sesiones.filter((s) => s.ejeId === eje.id && s.tipo !== "receso").length,
        })
      )
      .join("");
  }

  function renderTipoStep() {
    const tipos = [...new Set(state.data.sesiones.map((s) => s.tipo))].filter((x) => x !== "receso");
    tipos.sort((a, b) => {
      const ia = TIPO_ORDER.indexOf(a);
      const ib = TIPO_ORDER.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
    els.optionGrid.innerHTML = tipos
      .map((tipo) =>
        optionButton({
          value: tipo,
          title: tipoLabel(tipo),
          count: state.data.sesiones.filter((s) => s.tipo === tipo).length,
        })
      )
      .join("");
  }

  function renderAulaStep() {
    els.optionGrid.innerHTML = state.data.meta.salas
      .map((sala) =>
        optionButton({
          value: sala,
          title: sala,
          count: state.data.sesiones.filter((s) => s.sala === sala && s.tipo !== "receso").length,
        })
      )
      .join("");
  }

  function renderDisertanteStep() {
    const allPeople = collectPeople();
    let people = allPeople;
    if (state.personQuery) {
      const q = foldText(state.personQuery);
      people = people.filter((p) => foldText(p.name).includes(q));
    } else if (state.letter !== "Todas") {
      people = people.filter((p) => foldText(personLastName(p.name)).startsWith(foldText(state.letter)));
    }

    const letters = [
      "Todas",
      ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        .split("")
        .filter((L) => allPeople.some((p) => foldText(personLastName(p.name)).startsWith(foldText(L)))),
    ];

    const alpha = `
      <div class="alpha-row" role="group" aria-label="${escapeHtml(t("a11y.alphaFilter"))}">
        ${letters
          .map(
            (L) => `
          <button type="button" class="alpha-btn${L === "Todas" ? " alpha-btn-all" : ""}${
              state.letter === L ? " is-active" : ""
            }" data-letter="${escapeHtml(L)}">
            ${L === "Todas" ? escapeHtml(t("alpha.all")) : escapeHtml(L)}
          </button>`
          )
          .join("")}
      </div>
    `;

    els.optionGrid.innerHTML =
      alpha +
      (people.length
        ? people
            .map((p) =>
              optionButton({
                value: p.name,
                title: p.name,
                subtitle: [...p.roles].join(" · "),
                count: p.count,
              })
            )
            .join("")
        : `<p class="empty">${escapeHtml(t("results.emptyPeople"))}</p>`);
  }

  function renderAtajoStep() {
    const tipo = state.atajoTipo;
    const label = tipoLabel(tipo);
    const sessions = atajoSessions(tipo);
    els.stepTools.hidden = true;
    els.optionGrid.classList.add("is-compact");

    if (!state.day) {
      els.stepTitle.textContent = t("step.atajo.dayTitle", { tipo: label });
      els.stepHelp.textContent = t("step.atajo.dayHelp", { tipo: label });
      const days = state.data.meta.fechas.filter((dia) => sessions.some((s) => s.dia === dia));
      els.optionGrid.innerHTML =
        optionButton({
          value: "__all_days__",
          title: t("atajo.allDays", { tipo: label }),
          subtitle: t("atajo.allDaysHelp"),
          count: sessions.length,
        }) +
        days
          .map((dia) =>
            optionButton({
              value: dia,
              title: dayShort(dia),
              subtitle: t("atajo.daySub", { tipo: label }),
              count: sessions.filter((s) => s.dia === dia).length,
            })
          )
          .join("");
      return;
    }

    els.stepTitle.textContent = t("step.atajo.slotTitle", { tipo: label });
    els.stepHelp.textContent = dayLong(state.day);
    const daySessions = sessions.filter((s) => s.dia === state.day);
    const slots = groupBySlot(daySessions);
    els.optionGrid.innerHTML =
      optionButton({ value: "__back_days__", title: t("back.days"), subtitle: t("back.days.sub") }) +
      optionButton({
        value: "__all_day__",
        title: t("atajo.allDay"),
        subtitle: t("atajo.allDayHelp"),
        count: daySessions.length,
      }) +
      slots
        .map((slot) => {
          const salas = [...new Set(slot.items.map((s) => s.sala).filter(Boolean))].join(" · ");
          return optionButton({
            value: slot.inicio,
            title: `${slot.inicio} – ${slot.fin}`,
            subtitle: salas,
            count: slot.items.length,
          });
        })
        .join("");
  }

  function onOptionClick(value) {
    const { mode } = state;

    if (mode === "horario") {
      if (value === "__back_days__") {
        state.day = null;
        renderStep();
        return;
      }
      if (!state.day) {
        state.day = value;
        renderStep();
        return;
      }
      state.selection = { day: state.day, inicio: value };
      showResults();
      return;
    }

    if (mode === "tema") {
      state.selection = value;
      showResults();
      return;
    }

    if (mode === "tipo") {
      state.selection = value;
      showResults();
      return;
    }

    if (mode === "aula") {
      state.selection = value;
      showResults();
      return;
    }

    if (mode === "disertante") {
      state.selection = value;
      showResults();
      return;
    }

    if (mode === "atajo") {
      if (value === "__all_days__") {
        state.selection = { allDays: true };
        showResults();
        return;
      }
      if (value === "__back_days__") {
        state.day = null;
        renderStep();
        return;
      }
      if (!state.day) {
        state.day = value;
        renderStep();
        return;
      }
      if (value === "__all_day__") {
        state.selection = { day: state.day, wholeDay: true };
        showResults();
        return;
      }
      state.selection = { day: state.day, inicio: value };
      showResults();
    }
  }

  function refreshForLang() {
    if (!state.data) return;
    renderBotonera(state.data);
    renderDownloadLinks(state.data.meta.descargas);
    if (els.brandDates) els.brandDates.textContent = formatBrandDates(state.data.meta);

    if (state.mode === "ahora") {
      showAhora();
      return;
    }
    if (state.mode === "agenda") {
      showAgenda();
      return;
    }
    if (state.showResults && state.selection != null) {
      showResults();
      return;
    }
    renderStep();
  }

  // ---------------------------------------------------------------------
  // Eventos
  // ---------------------------------------------------------------------

  function bindEvents() {
    if (state.eventsBound) return;
    state.eventsBound = true;

    els.botonera?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-mode]");
      if (!btn) return;
      if (btn.dataset.mode === "atajo") {
        setMode("atajo", { tipo: btn.dataset.tipo });
      } else {
        setMode(btn.dataset.mode);
      }
    });

    els.optionGrid.addEventListener("click", (e) => {
      const letterBtn = e.target.closest("[data-letter]");
      if (letterBtn) {
        state.letter = letterBtn.dataset.letter;
        state.personQuery = "";
        if (els.personFilter) els.personFilter.value = "";
        renderDisertanteStep();
        return;
      }
      const opt = e.target.closest("[data-value]");
      if (!opt) return;
      onOptionClick(opt.dataset.value);
    });

    els.resultsBody?.addEventListener("click", (e) => {
      const clearBtn = e.target.closest("#agenda-clear");
      if (clearBtn) {
        clearAgenda();
        showAgenda();
        return;
      }
      const toggle = e.target.closest("[data-agenda-id]");
      if (!toggle) return;
      const id = toggle.dataset.agendaId;
      toggleAgenda(id);
      if (state.mode === "agenda") {
        showAgenda();
        return;
      }
      if (state.mode === "ahora") {
        showAhora();
        return;
      }
      if (state.showResults && state.selection != null) {
        showResults();
      }
    });

    els.backBtn?.addEventListener("click", () => {
      state.showResults = false;
      state.selection = null;
      if (state.mode === "ahora" || state.mode === "agenda") {
        setMode("horario");
        return;
      }
      els.results.hidden = true;
      els.stepPanel.hidden = false;
      renderStep();
    });

    let timer;
    els.personFilter?.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        state.personQuery = els.personFilter.value.trim();
        state.letter = "Todas";
        renderDisertanteStep();
      }, 150);
    });

    window.addEventListener("oia:langchange", refreshForLang);
  }

  // ---------------------------------------------------------------------
  // Carga de datos: CC_STORE → fetch → normalize
  // ---------------------------------------------------------------------

  async function fetchEventoFile() {
    const basePath = window.location.pathname.endsWith("/")
      ? window.location.pathname
      : window.location.pathname.replace(/\/[^/]*$/, "/");
    const candidates = [
      new URL(`${DATA_URL}?v=${DATA_VERSION}`, `${window.location.origin}${basePath}`).href,
      `${DATA_URL}?v=${DATA_VERSION}`,
      DATA_URL,
    ];
    let lastErr = null;
    for (const url of candidates) {
      try {
        const res = await fetch(url, { cache: "default" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const raw = await res.json();
        if (!raw || !Array.isArray(raw.sesiones) || !raw.sesiones.length) {
          throw new Error("empty evento");
        }
        return raw;
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr || new Error("evento fetch failed");
  }

  function readProgramBackup() {
    try {
      const raw = localStorage.getItem(PROGRAM_STORE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.sesiones) || !parsed.sesiones.length) return null;
      return parsed;
    } catch (_e) {
      return null;
    }
  }

  function persistProgramBackup(raw) {
    try {
      localStorage.setItem(PROGRAM_STORE_KEY, JSON.stringify(raw));
    } catch (_e) {}
  }

  async function loadEventoRaw() {
    try {
      const fromStore =
        window.CC_STORE && window.CC_STORE.loadEvento ? await window.CC_STORE.loadEvento() : null;
      if (fromStore && Array.isArray(fromStore.sesiones) && fromStore.sesiones.length) {
        return { raw: fromStore, fromCache: true, userLoaded: true };
      }
    } catch (_e) {}

    try {
      const raw = await fetchEventoFile();
      persistProgramBackup(raw);
      // No guardar el ejemplo en CC_STORE: solo los eventos cargados por el usuario.
      return { raw, fromCache: false, userLoaded: false };
    } catch (fetchErr) {
      const backup = readProgramBackup();
      if (backup) {
        console.warn("Consulta Congreso: usando copia local sin conexión.", fetchErr);
        return { raw: backup, fromCache: true, userLoaded: false };
      }
      throw fetchErr;
    }
  }

  async function init() {
    const showLoadError = (detail) => {
      const msg = escapeHtml(t("results.loadError"));
      const extra = detail ? `<br><small>${escapeHtml(detail)}</small>` : "";
      els.optionGrid.innerHTML = `
        <p class="empty">${msg}${extra}</p>
        <button type="button" class="option-btn" id="retry-load">
          <strong>${escapeHtml(t("results.retry"))}</strong>
        </button>`;
      const retry = document.getElementById("retry-load");
      if (retry) retry.addEventListener("click", () => init());
    };

    try {
      const { raw, fromCache } = await loadEventoRaw();
      const data = window.CC_NORMALIZE.normalize(raw);
      state.data = data;
      await applyBranding(data);
      renderBotonera(data);
      bindEvents();
      updateAgendaBadge();
      setMode("horario");
      if (fromCache || !navigator.onLine) {
        const banner = document.getElementById("offline-banner");
        if (banner) {
          banner.hidden = false;
          document.body.classList.add("is-offline");
          if (window.I18N && window.I18N.apply) window.I18N.apply();
        }
      }
    } catch (err) {
      console.error(err);
      showLoadError(err && err.message ? err.message : String(err));
    }
  }

  init();
})();
