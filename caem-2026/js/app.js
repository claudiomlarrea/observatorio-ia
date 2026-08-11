(() => {
  const t = (key, vars) => (window.I18N && window.I18N.t ? window.I18N.t(key, vars) : key);

  const TIPO_KEYS = {
    bienvenida: "tipo.bienvenida",
    conferencia: "tipo.conferencia",
    plenaria: "tipo.plenaria",
    mesa: "tipo.mesa",
    conversatorio: "tipo.conversatorio",
    acto: "tipo.acto",
    receso: "tipo.receso",
  };

  const EJE_NAME_KEYS = {
    "eje-1": "eje.1.name",
    "eje-2": "eje.2.name",
    "eje-3": "eje.3.name",
  };

  const emptyFilters = () => ({
    day: null,
    inicio: null,
    fin: null,
    ejeId: null,
    tipo: null,
    persona: null,
    sala: null,
    ahora: false,
  });

  const state = {
    data: null,
    mode: "horario",
    pickingDay: true,
    letter: "Todas",
    personQuery: "",
    filters: emptyFilters(),
    eventsBound: false,
  };

  const els = {
    botonera: document.getElementById("botonera"),
    activeFilters: document.getElementById("active-filters"),
    chipRow: document.getElementById("chip-row"),
    clearFilters: document.getElementById("clear-filters"),
    stepPanel: document.getElementById("step-panel"),
    stepTitle: document.getElementById("step-title"),
    stepHelp: document.getElementById("step-help"),
    stepTools: document.getElementById("step-tools"),
    personFilter: document.getElementById("person-filter"),
    optionGrid: document.getElementById("option-grid"),
    results: document.getElementById("results"),
    resultsTitle: document.getElementById("results-title"),
    resultsBody: document.getElementById("results-body"),
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

  function ejeName(ejeId, fallback) {
    return t(EJE_NAME_KEYS[ejeId] || fallback || ejeId);
  }

  function sessionCountLabel(n) {
    return n === 1 ? t("count.session", { n }) : t("count.sessions", { n });
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
    if (sala === "Aula Magna") return "magna";
    if (sala === "Salón de Consejo") return "consejo";
    return "";
  }

  function hasAnyFilter() {
    const f = state.filters;
    return Boolean(
      f.day || f.inicio || f.ejeId || f.tipo || f.persona || f.sala || f.ahora
    );
  }

  function modeHasFilter(mode) {
    const f = state.filters;
    if (mode === "horario") return Boolean(f.day || f.inicio);
    if (mode === "tema") return Boolean(f.ejeId);
    if (mode === "tipo") return Boolean(f.tipo);
    if (mode === "disertante") return Boolean(f.persona);
    if (mode === "aula") return Boolean(f.sala);
    if (mode === "ahora") return Boolean(f.ahora);
    return false;
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
      for (const role of ["disertantes", "moderadores"]) {
        for (const name of s[role] || []) {
          if (!name || /autoridades|invitados especiales|estudiantes de facultades/i.test(name)) {
            continue;
          }
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

  function ahoraSessionsBase() {
    const { date, minutes } = argentinaNow();
    const congressDays = state.data.meta.fechas;

    if (congressDays.includes(date)) {
      const today = state.data.sesiones.filter((s) => s.dia === date && s.tipo !== "receso");
      const ongoing = today.filter(
        (s) => toMinutes(s.inicio) <= minutes && minutes < toMinutes(s.fin)
      );
      if (ongoing.length) return { labelKey: "now.ongoing", sessions: ongoing };
      const upcoming = today
        .filter((s) => toMinutes(s.inicio) > minutes)
        .sort((a, b) => toMinutes(a.inicio) - toMinutes(b.inicio));
      if (upcoming.length) {
        const start = upcoming[0].inicio;
        return {
          labelKey: "now.next",
          sessions: upcoming.filter((s) => s.inicio === start),
        };
      }
      return { labelKey: "now.end", sessions: [] };
    }

    const firstDay = congressDays[0];
    const daySessions = state.data.sesiones
      .filter((s) => s.dia === firstDay && s.tipo !== "receso")
      .sort((a, b) => toMinutes(a.inicio) - toMinutes(b.inicio));
    if (!daySessions.length) return { labelKey: "now.opening", sessions: [] };
    const start = daySessions[0].inicio;
    return {
      labelKey: "now.opening",
      sessions: daySessions.filter((s) => s.inicio === start),
    };
  }

  function filteredSessions() {
    const f = state.filters;
    if (!hasAnyFilter()) return [];

    let list = state.data.sesiones.filter((s) => s.tipo !== "receso");

    if (f.ahora) {
      const base = ahoraSessionsBase().sessions;
      const ids = new Set(base.map((s) => s.id));
      list = list.filter((s) => ids.has(s.id));
    }
    if (f.day) list = list.filter((s) => s.dia === f.day);
    if (f.inicio) list = list.filter((s) => s.inicio === f.inicio);
    if (f.ejeId) list = list.filter((s) => s.ejeId === f.ejeId);
    if (f.tipo) list = list.filter((s) => s.tipo === f.tipo);
    if (f.sala) list = list.filter((s) => s.sala === f.sala);
    if (f.persona) {
      list = list.filter(
        (s) =>
          (s.disertantes || []).includes(f.persona) || (s.moderadores || []).includes(f.persona)
      );
    }
    return list;
  }

  /** Options for the current picker are narrowed by the other active filters. */
  function sessionsForPickerContext(excludeMode) {
    const saved = { ...state.filters };
    if (excludeMode === "horario") {
      state.filters.day = null;
      state.filters.inicio = null;
      state.filters.fin = null;
      state.filters.ahora = false;
    } else if (excludeMode === "tema") state.filters.ejeId = null;
    else if (excludeMode === "tipo") state.filters.tipo = null;
    else if (excludeMode === "disertante") state.filters.persona = null;
    else if (excludeMode === "aula") state.filters.sala = null;
    else if (excludeMode === "ahora") state.filters.ahora = false;

    const hadOther = hasAnyFilter();
    let list = hadOther
      ? filteredSessions()
      : state.data.sesiones.filter((s) => s.tipo !== "receso");
    state.filters = saved;
    return list;
  }

  function renderSession(session, query = "") {
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

    return `
      <article class="session" data-sala="${escapeHtml(session.sala || "")}">
        <div class="session-meta">
          <span class="badge badge-time">${escapeHtml(session.inicio)} – ${escapeHtml(session.fin)}</span>
          ${salaBadge}
          <span class="badge">${escapeHtml(tipo)}</span>
        </div>
        <h3 class="session-title">${highlight(session.titulo, query)}</h3>
        ${people.length ? `<ul class="session-people">${people.join("")}</ul>` : ""}
      </article>
    `;
  }

  function renderSessionsList(sessions, query = "") {
    if (!sessions.length) {
      return `<p class="empty">${escapeHtml(t("results.empty"))}</p>`;
    }
    return groupByDay(sessions)
      .map(({ dia, items }) => {
        const slots = groupBySlot(items);
        return `
          <div>
            <h3 class="day-label">${escapeHtml(dayLong(dia))}</h3>
            ${slots
              .map((slot) => {
                const parallel = slot.items.length > 1;
                return `
                  <section class="slot">
                    <h4 class="slot-time">${escapeHtml(slot.inicio)} <span>– ${escapeHtml(slot.fin)}</span></h4>
                    <div class="slot-grid${parallel ? " is-parallel" : ""}">
                      ${slot.items.map((s) => renderSession(s, query)).join("")}
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

  function chips() {
    const f = state.filters;
    const items = [];
    if (f.ahora) items.push({ key: "ahora", label: t("mode.ahora") });
    if (f.day && f.inicio) {
      items.push({
        key: "horario",
        label: `${dayShort(f.day)} · ${f.inicio}${f.fin ? `–${f.fin}` : ""}`,
      });
    } else if (f.day) {
      items.push({ key: "horario", label: dayShort(f.day) });
    }
    if (f.sala) items.push({ key: "aula", label: f.sala });
    if (f.ejeId) {
      const eje = state.data.ejes.find((e) => e.id === f.ejeId);
      items.push({
        key: "tema",
        label: eje ? ejeName(eje.id, eje.nombre) : f.ejeId,
      });
    }
    if (f.tipo) items.push({ key: "tipo", label: tipoLabel(f.tipo) });
    if (f.persona) items.push({ key: "disertante", label: f.persona });
    return items;
  }

  function renderChips() {
    const list = chips();
    if (!list.length) {
      els.activeFilters.hidden = true;
      els.chipRow.innerHTML = "";
      return;
    }
    els.activeFilters.hidden = false;
    els.chipRow.innerHTML = list
      .map(
        (chip) => `
      <button type="button" class="filter-chip" data-remove="${escapeHtml(chip.key)}" title="${escapeHtml(
          t("filters.remove")
        )}">
        <span>${escapeHtml(chip.label)}</span>
        <span class="filter-chip-x" aria-hidden="true">×</span>
      </button>`
      )
      .join("");
  }

  function updateModeButtons() {
    els.botonera.querySelectorAll(".mode-btn").forEach((btn) => {
      const mode = btn.dataset.mode;
      btn.classList.toggle("is-active", mode === state.mode);
      btn.classList.toggle("has-filter", modeHasFilter(mode));
    });
  }

  function renderResults() {
    if (!hasAnyFilter()) {
      els.results.hidden = true;
      els.resultsBody.innerHTML = "";
      return;
    }
    const sessions = filteredSessions();
    const query = state.filters.persona || "";
    els.results.hidden = false;
    els.resultsTitle.textContent = `${t("results.title")} · ${sessionCountLabel(sessions.length)}`;
    els.resultsBody.innerHTML = renderSessionsList(sessions, query);
  }

  function clearFilterKey(key) {
    if (key === "horario") {
      state.filters.day = null;
      state.filters.inicio = null;
      state.filters.fin = null;
    } else if (key === "aula") state.filters.sala = null;
    else if (key === "tema") state.filters.ejeId = null;
    else if (key === "tipo") state.filters.tipo = null;
    else if (key === "disertante") state.filters.persona = null;
    else if (key === "ahora") state.filters.ahora = false;
  }

  function setMode(mode) {
    state.mode = mode;
    state.letter = "Todas";
    state.personQuery = "";
    if (els.personFilter) els.personFilter.value = "";

    if (mode === "ahora") {
      state.filters.ahora = true;
      // Ahora replaces explicit horario to avoid contradiction
      state.filters.day = null;
      state.filters.inicio = null;
      state.filters.fin = null;
      state.pickingDay = true;
      updateModeButtons();
      renderChips();
      renderResults();
      els.stepPanel.hidden = true;
      return;
    }

    if (mode === "horario") {
      state.filters.ahora = false;
      state.pickingDay = !state.filters.day;
    }

    els.stepPanel.hidden = false;
    updateModeButtons();
    renderChips();
    renderResults();
    renderStep();
  }

  function renderStep() {
    els.stepTools.hidden = state.mode !== "disertante";
    els.optionGrid.classList.toggle(
      "is-compact",
      ["tipo", "aula", "horario"].includes(state.mode)
    );

    if (state.mode === "horario") renderHorarioStep();
    else if (state.mode === "tema") renderTemaStep();
    else if (state.mode === "tipo") renderTipoStep();
    else if (state.mode === "disertante") renderDisertanteStep();
    else if (state.mode === "aula") renderAulaStep();
  }

  function renderHorarioStep() {
    const ctx = sessionsForPickerContext("horario");

    if (state.pickingDay || !state.filters.day) {
      els.stepTitle.textContent = t("step.horario.dayTitle");
      els.stepHelp.textContent = hasAnyFilter()
        ? t("step.horario.dayHelpCombine")
        : t("step.horario.dayHelp");

      const days = state.data.meta.fechas.filter((dia) => ctx.some((s) => s.dia === dia));
      const sourceDays = days.length ? days : state.data.meta.fechas;

      els.optionGrid.innerHTML = sourceDays
        .map((dia, i) => {
          const eje = state.data.ejes.find((e) => e.dia === dia);
          const count = ctx.filter((s) => s.dia === dia).length;
          return optionButton({
            value: dia,
            title: dayShort(dia),
            subtitle: eje ? `${t(`eje.${i + 1}.label`)}: ${ejeName(eje.id, eje.nombre)}` : "",
            count,
            selected: state.filters.day === dia && !state.filters.inicio,
          });
        })
        .join("");
      return;
    }

    els.stepTitle.textContent = t("step.horario.slotTitle");
    els.stepHelp.textContent = dayLong(state.filters.day);
    const daySessions = ctx.filter((s) => s.dia === state.filters.day);
    const slots = groupBySlot(daySessions);

    els.optionGrid.innerHTML =
      optionButton({
        value: "__back_days__",
        title: t("back.days"),
        subtitle: t("back.days.sub"),
      }) +
      optionButton({
        value: "__whole_day__",
        title: t("step.horario.wholeDay"),
        subtitle: t("step.horario.wholeDayHelp"),
        count: daySessions.length,
        selected: Boolean(state.filters.day && !state.filters.inicio),
      }) +
      slots
        .map((slot) => {
          const salas = [...new Set(slot.items.map((s) => s.sala).filter(Boolean))].join(" · ");
          return optionButton({
            value: `${slot.inicio}|${slot.fin}`,
            title: `${slot.inicio} – ${slot.fin}`,
            subtitle: salas,
            count: slot.items.length,
            selected: state.filters.inicio === slot.inicio,
          });
        })
        .join("");
  }

  function renderTemaStep() {
    els.stepTitle.textContent = t("step.tema.title");
    els.stepHelp.textContent = t("step.tema.help");
    const ctx = sessionsForPickerContext("tema");
    els.optionGrid.innerHTML = state.data.ejes
      .map((eje, i) =>
        optionButton({
          value: eje.id,
          title: t(`eje.${i + 1}.label`),
          subtitle: `${dayShort(eje.dia)} · ${ejeName(eje.id, eje.nombre)}`,
          count: ctx.filter((s) => s.ejeId === eje.id).length,
          selected: state.filters.ejeId === eje.id,
        })
      )
      .join("");
  }

  function renderTipoStep() {
    els.stepTitle.textContent = t("step.tipo.title");
    els.stepHelp.textContent = t("step.tipo.help");
    const ctx = sessionsForPickerContext("tipo");
    const tipos = [...new Set(ctx.map((s) => s.tipo))];
    const order = ["bienvenida", "conferencia", "plenaria", "mesa", "conversatorio", "acto"];
    tipos.sort((a, b) => order.indexOf(a) - order.indexOf(b));
    const list = tipos.length
      ? tipos
      : [...new Set(state.data.sesiones.map((s) => s.tipo))].filter((x) => x !== "receso");
    els.optionGrid.innerHTML = list
      .map((tipo) =>
        optionButton({
          value: tipo,
          title: tipoLabel(tipo),
          count: ctx.filter((s) => s.tipo === tipo).length,
          selected: state.filters.tipo === tipo,
        })
      )
      .join("");
  }

  function renderAulaStep() {
    els.stepTitle.textContent = t("step.aula.title");
    els.stepHelp.textContent = t("step.aula.help");
    const ctx = sessionsForPickerContext("aula");
    els.optionGrid.innerHTML = state.data.meta.salas
      .map((sala) =>
        optionButton({
          value: sala,
          title: sala,
          subtitle: sala === "Aula Magna" ? t("room.magna.sub") : t("room.consejo.sub"),
          count: ctx.filter((s) => s.sala === sala).length,
          selected: state.filters.sala === sala,
        })
      )
      .join("");
  }

  function renderDisertanteStep() {
    els.stepTitle.textContent = t("step.disertante.title");
    els.stepHelp.textContent = t("step.disertante.help");
    const ctx = sessionsForPickerContext("disertante");
    const namesInCtx = new Set();
    ctx.forEach((s) => {
      (s.disertantes || []).forEach((n) => namesInCtx.add(n));
      (s.moderadores || []).forEach((n) => namesInCtx.add(n));
    });

    let people = collectPeople();
    if (hasAnyFilter() || namesInCtx.size) {
      // When other filters exist, only people still present in the narrowed set
      const narrowed = sessionsForPickerContext("disertante");
      if (hasAnyFilter()) {
        const allowed = new Set();
        narrowed.forEach((s) => {
          (s.disertantes || []).forEach((n) => allowed.add(n));
          (s.moderadores || []).forEach((n) => allowed.add(n));
        });
        people = people.filter((p) => allowed.has(p.name));
      }
    }

    if (state.personQuery) {
      const q = normalize(state.personQuery);
      people = people.filter((p) => normalize(p.name).includes(q));
    } else if (state.letter !== "Todas") {
      people = people.filter((p) =>
        normalize(personLastName(p.name)).startsWith(normalize(state.letter))
      );
    }

    const allForLetters = people.length
      ? people
      : collectPeople().filter((p) => namesInCtx.has(p.name));
    const letters = [
      "Todas",
      ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").filter((L) =>
        allForLetters.some((p) => normalize(personLastName(p.name)).startsWith(normalize(L)))
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
                selected: state.filters.persona === p.name,
              })
            )
            .join("")
        : `<p class="empty">${escapeHtml(t("results.emptyPeople"))}</p>`);
  }

  function onOptionClick(value) {
    const { mode } = state;

    if (mode === "horario") {
      if (value === "__back_days__") {
        state.pickingDay = true;
        state.filters.inicio = null;
        state.filters.fin = null;
        renderStep();
        renderChips();
        renderResults();
        return;
      }
      if (value === "__whole_day__") {
        state.filters.inicio = null;
        state.filters.fin = null;
        state.filters.ahora = false;
        updateAll();
        return;
      }
      if (state.pickingDay || !state.filters.day) {
        state.filters.day = value;
        state.filters.inicio = null;
        state.filters.fin = null;
        state.filters.ahora = false;
        state.pickingDay = false;
        updateModeButtons();
        renderChips();
        renderResults();
        renderStep();
        return;
      }
      const [inicio, fin] = value.split("|");
      state.filters.inicio = inicio;
      state.filters.fin = fin;
      state.filters.ahora = false;
      updateAll();
      return;
    }

    if (mode === "tema") {
      state.filters.ejeId = value;
      // Align day with eje if horario day not set
      const eje = state.data.ejes.find((e) => e.id === value);
      if (eje && !state.filters.day && !state.filters.ahora) {
        // don't force day — tema alone is fine
      }
      updateAll();
      return;
    }

    if (mode === "tipo") {
      state.filters.tipo = value;
      updateAll();
      return;
    }

    if (mode === "aula") {
      state.filters.sala = value;
      updateAll();
      return;
    }

    if (mode === "disertante") {
      state.filters.persona = value;
      updateAll();
    }
  }

  function updateAll() {
    updateModeButtons();
    renderChips();
    renderResults();
    // Keep step open so user can refine or switch via botonera
    if (state.mode !== "ahora") {
      els.stepPanel.hidden = false;
      renderStep();
    }
  }

  function refreshForLang() {
    if (!state.data) return;
    updateModeButtons();
    renderChips();
    renderResults();
    if (state.mode !== "ahora") renderStep();
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
        els.personFilter.value = "";
        renderDisertanteStep();
        return;
      }
      const opt = e.target.closest("[data-value]");
      if (!opt) return;
      onOptionClick(opt.dataset.value);
    });

    els.chipRow?.addEventListener("click", (e) => {
      const chip = e.target.closest("[data-remove]");
      if (!chip) return;
      clearFilterKey(chip.dataset.remove);
      if (chip.dataset.remove === "horario") state.pickingDay = true;
      updateAll();
      if (!hasAnyFilter() && state.mode === "ahora") setMode("horario");
    });

    els.clearFilters?.addEventListener("click", () => {
      state.filters = emptyFilters();
      state.pickingDay = true;
      setMode(state.mode === "ahora" ? "horario" : state.mode);
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
      const basePath = window.location.pathname.endsWith("/")
        ? window.location.pathname
        : `${window.location.pathname.replace(/\/?$/, "")}/`;
      const url = new URL(`data/programa.json?v=2`, `${window.location.origin}${basePath}`);
      let res;
      try {
        res = await fetch(url.href, { cache: "no-store" });
      } catch (_net) {
        // fallback relative
        res = await fetch("data/programa.json?v=2", { cache: "no-store" });
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      state.data = await res.json();
      if (!state.data?.sesiones?.length) throw new Error("empty program");
      bindEvents();
      setMode("horario");
    } catch (err) {
      console.error(err);
      showLoadError(err && err.message ? err.message : String(err));
    }
  }

  init();
})();
