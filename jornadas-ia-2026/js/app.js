(() => {
  const t = (key, vars) => (window.I18N && window.I18N.t ? window.I18N.t(key, vars) : key);

  const TIPO_KEYS = {
    apertura: "tipo.apertura",
    indicaciones: "tipo.indicaciones",
    ponencia: "tipo.ponencia",
    cierre: "tipo.cierre",
    receso: "tipo.receso",
  };

  const MODE_COPY_KEYS = {
    horario: { title: "step.horario.dayTitle", help: "step.horario.dayHelp" },
    area: { title: "step.area.title", help: "step.area.help" },
    expositor: { title: "step.expositor.title", help: "step.expositor.help" },
    agenda: { title: "step.agenda.title", help: "step.agenda.help" },
    ahora: { title: "step.ahora.title", help: "step.ahora.help" },
  };

  const AGENDA_KEY = "jornadas_ia_2026_agenda";
  const AGENDA_NOTIFIED_KEY = "jornadas_ia_2026_agenda_notified";
  const AGENDA_REMINDERS_KEY = "jornadas_ia_2026_agenda_reminders";
  const REMINDER_LEAD_MIN = 10;
  const PROGRAM_STORE_KEY = "jornadas_ia_2026_programa";
  const PROGRAM_VERSION_KEY = "jornadas_ia_2026_programa_version";
  const PROGRAM_VERSION = "4";

  const state = {
    data: null,
    mode: "horario",
    day: null,
    letter: "Todas",
    personQuery: "",
    selection: null,
    showResults: false,
    eventsBound: false,
    reminderTimer: null,
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
  };

  function dayShort(dia) {
    return t(`day.${dia}.short`);
  }

  function dayLong(dia) {
    return t(`day.${dia}.long`);
  }

  function tipoLabel(tipo) {
    return t(TIPO_KEYS[tipo] || tipo);
  }

  function sessionCountLabel(n) {
    return n === 1 ? t("count.session", { n }) : t("count.sessions", { n });
  }

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
    let added = false;
    if (idx >= 0) {
      ids.splice(idx, 1);
      saveNotifiedIds(loadNotifiedIds().filter((x) => x !== id));
    } else {
      ids.push(id);
      added = true;
    }
    saveAgendaIds(ids);
    if (added && remindersEnabled()) {
      ensureNotificationPermission().then((p) => {
        if (p === "granted") checkAgendaReminders();
      });
    }
    return ids.includes(id);
  }

  function clearAgenda() {
    saveAgendaIds([]);
    saveNotifiedIds([]);
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

  function padClock(hhmm) {
    const m = String(hhmm || "00:00").match(/^(\d{1,2}):(\d{2})/);
    if (!m) return "00:00";
    return `${String(m[1]).padStart(2, "0")}:${m[2]}`;
  }

  function sessionDate(session, which = "inicio") {
    const clock = padClock(session[which] || session.inicio);
    return new Date(`${session.dia}T${clock}:00-03:00`);
  }

  function remindersEnabled() {
    try {
      return localStorage.getItem(AGENDA_REMINDERS_KEY) === "1";
    } catch (_e) {
      return false;
    }
  }

  function setRemindersEnabled(on) {
    try {
      localStorage.setItem(AGENDA_REMINDERS_KEY, on ? "1" : "0");
    } catch (_e) {}
  }

  function loadNotifiedIds() {
    try {
      const raw = localStorage.getItem(AGENDA_NOTIFIED_KEY);
      const ids = raw ? JSON.parse(raw) : [];
      return Array.isArray(ids) ? ids.filter((id) => typeof id === "string") : [];
    } catch (_e) {
      return [];
    }
  }

  function saveNotifiedIds(ids) {
    try {
      localStorage.setItem(AGENDA_NOTIFIED_KEY, JSON.stringify(ids));
    } catch (_e) {}
  }

  function markNotified(id) {
    const ids = loadNotifiedIds();
    if (!ids.includes(id)) {
      ids.push(id);
      saveNotifiedIds(ids);
    }
  }

  function clearNotifiedForMissing(validIds) {
    const keep = new Set(validIds);
    saveNotifiedIds(loadNotifiedIds().filter((id) => keep.has(id)));
  }

  async function ensureNotificationPermission() {
    if (!("Notification" in window)) return "unsupported";
    if (Notification.permission === "granted") return "granted";
    if (Notification.permission === "denied") return "denied";
    try {
      return await Notification.requestPermission();
    } catch (_e) {
      return Notification.permission;
    }
  }

  async function showAgendaNotification(session) {
    const title = t("reminders.notifyTitle");
    const sala = session.sala ? ` · ${session.sala}` : "";
    const body = t("reminders.notifyBody", {
      time: session.inicio,
      title: session.titulo,
      sala,
    });
    const opts = {
      body,
      tag: `jornadas-ia-agenda-${session.id}`,
      renotify: true,
      icon: "assets/icon-192.png",
      badge: "assets/icon-192.png",
      data: { sessionId: session.id },
    };
    try {
      if (navigator.serviceWorker) {
        const reg = await navigator.serviceWorker.ready;
        if (reg?.showNotification) {
          await reg.showNotification(title, opts);
          return;
        }
      }
    } catch (_e) {}
    try {
      new Notification(title, opts);
    } catch (_e) {}
  }

  async function checkAgendaReminders() {
    if (!remindersEnabled() || !state.data) return;
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const now = Date.now();
    const notified = new Set(loadNotifiedIds());
    const sessions = agendaSessions();
    clearNotifiedForMissing(sessions.map((s) => s.id));
    for (const session of sessions) {
      if (!session?.id || notified.has(session.id)) continue;
      const start = sessionDate(session, "inicio").getTime();
      if (Number.isNaN(start)) continue;
      const leadMs = REMINDER_LEAD_MIN * 60 * 1000;
      if (now >= start - leadMs && now < start) {
        await showAgendaNotification(session);
        markNotified(session.id);
      }
      if (now >= start) markNotified(session.id);
    }
  }

  function startReminderWatcher() {
    if (state.reminderTimer) return;
    checkAgendaReminders();
    state.reminderTimer = window.setInterval(checkAgendaReminders, 30000);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") checkAgendaReminders();
    });
  }

  function icsEscape(text) {
    return String(text || "")
      .replace(/\\/g, "\\\\")
      .replace(/\n/g, "\\n")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;");
  }

  function icsStamp(date) {
    const y = date.getUTCFullYear();
    const mo = String(date.getUTCMonth() + 1).padStart(2, "0");
    const d = String(date.getUTCDate()).padStart(2, "0");
    const h = String(date.getUTCHours()).padStart(2, "0");
    const mi = String(date.getUTCMinutes()).padStart(2, "0");
    const s = String(date.getUTCSeconds()).padStart(2, "0");
    return `${y}${mo}${d}T${h}${mi}${s}Z`;
  }

  function icsLocal(session, which) {
    const clock = padClock(session[which] || session.inicio).replace(":", "");
    const day = String(session.dia || "").replace(/-/g, "");
    return `${day}T${clock}00`;
  }

  function buildIcs(sessions) {
    const eventTitle = state.data?.meta?.titulo || "Jornadas IA 2026";
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Observatorio IA UCCuyo//Jornadas IA 2026//ES",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
    ];
    const stamp = icsStamp(new Date());
    for (const session of sessions) {
      if (!session?.dia || !session?.inicio) continue;
      const uid = `${session.id || icsLocal(session, "inicio")}@jornadas-ia-2026-uccuyo`;
      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${uid}`);
      lines.push(`DTSTAMP:${stamp}`);
      lines.push(`DTSTART;TZID=America/Argentina/Buenos_Aires:${icsLocal(session, "inicio")}`);
      lines.push(`DTEND;TZID=America/Argentina/Buenos_Aires:${icsLocal(session, "fin")}`);
      lines.push(`SUMMARY:${icsEscape(session.titulo || eventTitle)}`);
      if (session.sala) lines.push(`LOCATION:${icsEscape(session.sala)}`);
      const descParts = [eventTitle];
      if (session.disertantes?.length) descParts.push(session.disertantes.join("; "));
      lines.push(`DESCRIPTION:${icsEscape(descParts.join(" — "))}`);
      lines.push("BEGIN:VALARM");
      lines.push(`TRIGGER:-PT${REMINDER_LEAD_MIN}M`);
      lines.push("ACTION:DISPLAY");
      lines.push(`DESCRIPTION:${icsEscape(t("reminders.alarmText", { title: session.titulo || "" }))}`);
      lines.push("END:VALARM");
      lines.push("END:VEVENT");
    }
    lines.push("END:VCALENDAR");
    return `${lines.join("\r\n")}\r\n`;
  }

  function downloadIcs(sessions, filename) {
    const blob = new Blob([buildIcs(sessions)], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "agenda-jornadas-ia-2026.ics";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function googleCalendarUrl(session) {
    const start = sessionDate(session, "inicio");
    const end = sessionDate(session, "fin");
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";
    const dates = `${icsStamp(start).replace(/Z$/, "")}Z/${icsStamp(end).replace(/Z$/, "")}Z`;
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: session.titulo || "",
      dates,
      details: (session.disertantes || []).join("; "),
      location: session.sala || "",
      ctz: "America/Argentina/Buenos_Aires",
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }

  async function enableAgendaReminders() {
    const permission = await ensureNotificationPermission();
    if (permission !== "granted") {
      setRemindersEnabled(false);
      return permission;
    }
    setRemindersEnabled(true);
    startReminderWatcher();
    await checkAgendaReminders();
    return "granted";
  }

  function normalize(text) {
    return String(text || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function highlight(text, query) {
    const safe = escapeHtml(text);
    if (!query) return safe;
    const nQuery = normalize(query).trim();
    if (!nQuery) return safe;
    const nText = normalize(text);
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
      const nCh = normalize(text[oi]);
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
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
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

  function salaClass(sala) {
    if (sala === "Plenario") return "plenario";
    return "";
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
    const cleaned = full.replace(/\([^)]*\)/g, "").trim();
    const parts = cleaned.split(/\s+/).filter(Boolean);
    const withoutTitle = parts.filter(
      (p) =>
        !/^(dr\.?|dra\.?|lic\.?|mg\.?|mgtr\.?|mgter\.?|ing\.?|téc\.?|bioq\.?|periodista)$/i.test(p)
    );
    return withoutTitle[withoutTitle.length - 1] || cleaned;
  }

  function collectPeople() {
    const set = new Map();
    for (const s of state.data.sesiones) {
      // Solo ponencias: no listar Rectora, Director, "Observatorio de IA", etc.
      if (s.tipo !== "ponencia") continue;
      for (const role of ["disertantes", "moderadores"]) {
        for (const name of s[role] || []) {
          if (!name) continue;
          if (esNombreInstitucional_(name)) continue;
          if (!set.has(name)) set.set(name, { name, roles: new Set(), count: 0 });
          set
            .get(name)
            .roles.add(role === "disertantes" ? t("role.speakerOne") : t("role.moderatorOne"));
          set.get(name).count += 1;
        }
      }
    }
    return [...set.values()].sort((a, b) =>
      normalize(personLastName(a.name)).localeCompare(normalize(personLastName(b.name)), "es")
    );
  }

  function esNombreInstitucional_(name) {
    const n = normalize(String(name || ""));
    if (!n) return true;
    if (n.includes("observatorio")) return true;
    if (n.includes("universidad")) return true;
    if (n.includes("facultad")) return true;
    if (n.includes("coordinacion") || n.includes("coordinación")) return true;
    return false;
  }

  function collectAreas() {
    const map = new Map();
    for (const s of state.data.sesiones) {
      if (!s.area) continue;
      if (!map.has(s.area)) map.set(s.area, 0);
      map.set(s.area, map.get(s.area) + 1);
    }
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], "es"))
      .map(([area, count]) => ({ area, count }));
  }

  function sessionsForSelection() {
    const { mode, selection, data } = state;
    if (!selection) return [];
    const all = data.sesiones;

    switch (mode) {
      case "horario":
        if (selection.wholeDay) {
          return all.filter((s) => s.dia === selection.day && s.tipo !== "receso");
        }
        return all.filter((s) => s.dia === selection.day && s.inicio === selection.inicio);
      case "ponencias":
        return all.filter((s) => s.tipo === "ponencia");
      case "articulos":
        return all.filter((s) => s.articuloOk === true);
      case "powerpoint":
        return all.filter((s) => s.pptOk === true);
      case "area":
        return all.filter((s) => s.area === selection && s.tipo !== "receso");
      case "expositor":
        return all.filter(
          (s) =>
            (s.disertantes || []).includes(selection) || (s.moderadores || []).includes(selection)
        );
      case "agenda":
        return agendaSessions();
      case "ahora":
        return selection.sessions || [];
      default:
        return [];
    }
  }

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
      ? `<span class="badge badge-sala ${salaClass(session.sala)}">${highlight(session.sala, query)}</span>`
      : "";
    const articuloBadge = session.articuloOk
      ? `<span class="badge badge-articulo">${escapeHtml(t("badge.articulo"))}</span>`
      : "";
    const pptBadge = session.pptOk
      ? `<span class="badge badge-ppt">${escapeHtml(t("badge.ppt"))}</span>`
      : "";
    const provisionalBadge =
      session.confirmado === false
        ? `<span class="badge badge-provisional">${escapeHtml(t("badge.provisional"))}</span>`
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
    const calBtn =
      saved && session.id
        ? `<div class="session-cal-actions">
            <button type="button" class="cal-ics-btn" data-ics-id="${escapeHtml(session.id)}">${escapeHtml(
              t("reminders.addCalendar")
            )}</button>
            <a class="cal-google-btn" href="${escapeHtml(googleCalendarUrl(session))}" target="_blank" rel="noopener noreferrer">${escapeHtml(
              t("reminders.googleCalendar")
            )}</a>
          </div>`
        : "";
    const conflictClass = options.conflictIds?.has(session.id) ? " is-conflict" : "";

    return `
      <article class="session${isReceso ? " is-receso" : ""}${conflictClass}${saved ? " is-in-agenda" : ""}" data-sala="${escapeHtml(
        session.sala || ""
      )}" data-session-id="${escapeHtml(session.id || "")}">
        <div class="session-meta">
          <span class="badge badge-time">${escapeHtml(session.inicio)} – ${escapeHtml(session.fin)}</span>
          ${salaBadge}
          <span class="badge">${escapeHtml(tipo)}</span>
          ${articuloBadge}
          ${pptBadge}
          ${provisionalBadge}
        </div>
        <h3 class="session-title">${highlight(session.titulo, query)}</h3>
        ${people.length ? `<ul class="session-people">${people.join("")}</ul>` : ""}
        ${agendaBtn}
        ${calBtn}
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
                      ${slot.items
                        .map((s) => renderSession(s, query, { conflictIds: conflicts }))
                        .join("")}
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
        ${
          typeof count === "number"
            ? `<span class="count">${escapeHtml(sessionCountLabel(count))}</span>`
            : ""
        }
      </button>
    `;
  }

  function setMode(mode) {
    state.mode = mode;
    state.selection = null;
    state.showResults = false;
    state.day = null;
    state.letter = "Todas";
    state.personQuery = "";
    if (els.personFilter) els.personFilter.value = "";

    els.botonera.querySelectorAll(".mode-btn").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.mode === mode);
      btn.classList.remove("has-filter");
    });

    if (mode === "ahora") {
      showAhora();
      return;
    }

    if (mode === "agenda") {
      showAgenda();
      return;
    }

    if (mode === "ponencias") {
      state.selection = "ponencias";
      showDirectList(t("step.ponencias.title"), "results.empty");
      return;
    }

    if (mode === "articulos") {
      state.selection = "articulos";
      showDirectList(t("step.articulos.title"), "results.empty.articulos");
      return;
    }

    if (mode === "powerpoint") {
      state.selection = "powerpoint";
      showDirectList(t("step.powerpoint.title"), "results.empty");
      return;
    }

    els.results.hidden = true;
    els.stepPanel.hidden = false;
    renderStep();
  }

  function showDirectList(title, emptyKey) {
    const sessions = sessionsForSelection();
    state.showResults = true;
    els.stepPanel.hidden = true;
    els.results.hidden = false;
    els.resultsTitle.textContent = title;
    els.resultsBody.innerHTML = renderSessionsList(sessions, "", { emptyKey });
    els.results.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function showResults(title) {
    const sessions = sessionsForSelection();
    const query = state.mode === "expositor" ? state.selection : "";
    state.showResults = true;
    els.stepPanel.hidden = true;
    els.results.hidden = false;
    els.resultsTitle.textContent = title;
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
      html += `<p class="agenda-summary">${escapeHtml(
        t("agenda.summary", { n: sessions.length })
      )}</p>`;
      if (conflicts.size) {
        html += `<p class="agenda-conflict-banner" role="status">${escapeHtml(
          t("agenda.conflict")
        )}</p>`;
      }
      html += renderSessionsList(sessions, "", { conflictIds: conflicts });
      const remindersOn =
        remindersEnabled() &&
        typeof Notification !== "undefined" &&
        Notification.permission === "granted";
      html += `<div class="agenda-actions">
        <button type="button" class="agenda-reminders${remindersOn ? " is-on" : ""}" id="agenda-reminders">
          ${escapeHtml(remindersOn ? t("reminders.enabled") : t("reminders.enable"))}
        </button>
        <button type="button" class="agenda-ics" id="agenda-ics">
          ${escapeHtml(t("reminders.downloadIcs"))}
        </button>
        <button type="button" class="agenda-clear" id="agenda-clear" data-i18n="agenda.clear">
          ${escapeHtml(t("agenda.clear"))}
        </button>
      </div>
      <p class="agenda-reminders-hint">${escapeHtml(t("reminders.hint"))}</p>`;
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
    const copy = MODE_COPY_KEYS[state.mode];
    if (!copy) return;
    els.stepTitle.textContent = t(copy.title);
    els.stepHelp.textContent = t(copy.help);
    els.stepTools.hidden = state.mode !== "expositor";
    els.optionGrid.classList.toggle("is-compact", ["horario", "area"].includes(state.mode));

    if (state.mode === "horario") renderHorarioStep();
    else if (state.mode === "area") renderAreaStep();
    else if (state.mode === "expositor") renderExpositorStep();
  }

  function renderHorarioStep() {
    const fechas = state.data.meta.fechas || [];

    if (fechas.length === 1) {
      const dia = fechas[0];
      const daySessions = state.data.sesiones.filter((s) => s.dia === dia && s.tipo !== "receso");
      const slots = groupBySlot(daySessions);
      els.stepTitle.textContent = t("step.horario.slotTitle");
      els.stepHelp.textContent = dayLong(dia);
      state.day = dia;
      els.optionGrid.innerHTML =
        optionButton({
          value: "__all_day__",
          title: t("horario.allDay"),
          subtitle: t("horario.allDayHelp"),
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
      return;
    }

    if (!state.day) {
      els.stepTitle.textContent = t("step.horario.dayTitle");
      els.stepHelp.textContent = t("step.horario.dayHelp");
      els.optionGrid.innerHTML = fechas
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
      optionButton({
        value: "__back_days__",
        title: t("back.days"),
        subtitle: t("back.days.sub"),
      }) +
      optionButton({
        value: "__all_day__",
        title: t("horario.allDay"),
        subtitle: t("horario.allDayHelp"),
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

  function renderAreaStep() {
    const areas = collectAreas();
    els.optionGrid.innerHTML = areas.length
      ? areas
          .map(({ area, count }) => optionButton({ value: area, title: area, count }))
          .join("")
      : `<p class="empty">${escapeHtml(t("results.emptyAreas"))}</p>`;
  }

  function renderExpositorStep() {
    let people = collectPeople();
    if (state.personQuery) {
      const q = normalize(state.personQuery);
      people = people.filter((p) => normalize(p.name).includes(q));
    } else if (state.letter !== "Todas") {
      people = people.filter((p) =>
        normalize(personLastName(p.name)).startsWith(normalize(state.letter))
      );
    }

    const allPeople = collectPeople();
    const letters = [
      "Todas",
      ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").filter((L) =>
        allPeople.some((p) => normalize(personLastName(p.name)).startsWith(normalize(L)))
      ),
    ];

    const alpha = `
      <div class="alpha-row" role="group" aria-label="${escapeHtml(t("a11y.alphaFilter"))}">
        ${letters
          .map(
            (L) => `
          <button type="button" class="alpha-btn${L === "Todas" ? " alpha-btn-all" : ""}${
              state.letter === L ? " is-active" : ""
            }" data-letter="${L}">
            ${L === "Todas" ? escapeHtml(t("alpha.all")) : L}
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

  function onOptionClick(value) {
    const { mode } = state;

    if (mode === "horario") {
      if (value === "__back_days__") {
        state.day = null;
        renderStep();
        return;
      }
      if (value === "__all_day__") {
        state.selection = { day: state.day, wholeDay: true };
        showResults(dayShort(state.day));
        return;
      }
      if (!state.day) {
        state.day = value;
        renderStep();
        return;
      }
      state.selection = { day: state.day, inicio: value };
      showResults(`${dayShort(state.day)} · ${value}`);
      return;
    }

    if (mode === "area") {
      state.selection = value;
      showResults(value);
      return;
    }

    if (mode === "expositor") {
      state.selection = value;
      showResults(value);
    }
  }

  function refreshForLang() {
    if (!state.data) return;
    if (state.mode === "ahora" || state.mode === "agenda" || state.showResults) {
      if (state.mode === "ahora") {
        showAhora();
      } else if (state.mode === "agenda") {
        showAgenda();
      } else if (state.mode === "ponencias") {
        showDirectList(t("step.ponencias.title"), "results.empty");
      } else if (state.mode === "articulos") {
        showDirectList(t("step.articulos.title"), "results.empty.articulos");
      } else if (state.mode === "powerpoint") {
        showDirectList(t("step.powerpoint.title"), "results.empty");
      } else if (state.selection != null) {
        if (state.mode === "horario" && state.selection.day) {
          if (state.selection.wholeDay) {
            showResults(dayShort(state.selection.day));
          } else {
            showResults(`${dayShort(state.selection.day)} · ${state.selection.inicio}`);
          }
        } else if (state.mode === "area" || state.mode === "expositor") {
          showResults(state.selection);
        }
      }
      return;
    }
    renderStep();
  }

  function bindEvents() {
    if (state.eventsBound) return;
    state.eventsBound = true;

    els.botonera.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-mode]");
      if (!btn) return;
      setMode(btn.dataset.mode);
    });

    els.optionGrid.addEventListener("click", (e) => {
      const letterBtn = e.target.closest("[data-letter]");
      if (letterBtn) {
        state.letter = letterBtn.dataset.letter;
        state.personQuery = "";
        if (els.personFilter) els.personFilter.value = "";
        renderExpositorStep();
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
      const remindBtn = e.target.closest("#agenda-reminders");
      if (remindBtn) {
        enableAgendaReminders().then((status) => {
          if (status === "granted") showAgenda();
          else if (status === "denied") window.alert(t("reminders.denied"));
          else if (status === "unsupported") window.alert(t("reminders.unsupported"));
          else showAgenda();
        });
        return;
      }
      const icsAll = e.target.closest("#agenda-ics");
      if (icsAll) {
        downloadIcs(agendaSessions(), "agenda-jornadas-ia-2026.ics");
        return;
      }
      const icsOne = e.target.closest("[data-ics-id]");
      if (icsOne) {
        const sid = icsOne.dataset.icsId;
        const session = (state.data?.sesiones || []).find((s) => s.id === sid);
        if (session) downloadIcs([session], `jornadas-ia-${sid}.ics`);
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
        refreshForLang();
      }
    });

    els.backBtn?.addEventListener("click", () => {
      state.showResults = false;
      state.selection = null;
      if (["ahora", "agenda", "ponencias", "articulos", "powerpoint"].includes(state.mode)) {
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
        renderExpositorStep();
      }, 150);
    });

    window.addEventListener("oia:langchange", refreshForLang);
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

    const persistProgram = (data) => {
      try {
        localStorage.setItem(PROGRAM_STORE_KEY, JSON.stringify(data));
        localStorage.setItem(PROGRAM_VERSION_KEY, PROGRAM_VERSION);
      } catch (_e) {}
    };

    const readStoredProgram = () => {
      try {
        const storedVer = localStorage.getItem(PROGRAM_VERSION_KEY) || "";
        if (storedVer !== PROGRAM_VERSION) {
          localStorage.removeItem(PROGRAM_STORE_KEY);
          localStorage.removeItem(PROGRAM_VERSION_KEY);
          return null;
        }
        const raw = localStorage.getItem(PROGRAM_STORE_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (!data?.sesiones?.length) return null;
        return data;
      } catch (_e) {
        return null;
      }
    };

    const fetchProgram = async () => {
      const basePath = window.location.pathname.endsWith("/")
        ? window.location.pathname
        : `${window.location.pathname.replace(/\/?$/, "")}/`;
      const candidates = [
        new URL(`data/programa.json?v=${PROGRAM_VERSION}`, `${window.location.origin}${basePath}`)
          .href,
        `data/programa.json?v=${PROGRAM_VERSION}`,
        "data/programa.json",
      ];
      let lastErr = null;
      for (const url of candidates) {
        try {
          const res = await fetch(url, { cache: "no-store" });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          if (!data?.sesiones?.length) throw new Error("empty program");
          return data;
        } catch (err) {
          lastErr = err;
        }
      }
      throw lastErr || new Error("program fetch failed");
    };

    try {
      let data = null;
      let fromStore = false;
      try {
        data = await fetchProgram();
        persistProgram(data);
      } catch (err) {
        data = readStoredProgram();
        fromStore = Boolean(data);
        if (!data) throw err;
        console.warn("Using stored program offline", err);
      }
      state.data = data;
      bindEvents();
      updateAgendaBadge();
      if (remindersEnabled()) startReminderWatcher();
      setMode("horario");
      if (fromStore || !navigator.onLine) {
        const banner = document.getElementById("offline-banner");
        if (banner) {
          banner.hidden = false;
          if (window.I18N && window.I18N.apply) window.I18N.apply();
        }
      }
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("sw.js").catch(() => {});
      }
    } catch (err) {
      console.error(err);
      showLoadError(err && err.message ? err.message : String(err));
    }
  }

  init();
})();
