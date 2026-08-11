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

  const MODE_COPY_KEYS = {
    horario: { title: "step.horario.dayTitle", help: "step.horario.dayHelp" },
    tema: { title: "step.tema.title", help: "step.tema.help" },
    tipo: { title: "step.tipo.title", help: "step.tipo.help" },
    disertante: { title: "step.disertante.title", help: "step.disertante.help" },
    aula: { title: "step.aula.title", help: "step.aula.help" },
    ahora: { title: "step.ahora.title", help: "step.ahora.help" },
  };

  const EJE_NAME_KEYS = {
    "eje-1": "eje.1.name",
    "eje-2": "eje.2.name",
    "eje-3": "eje.3.name",
  };

  const state = {
    data: null,
    mode: "horario",
    day: null,
    letter: "Todas",
    personQuery: "",
    selection: null,
    showResults: false,
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

  function sessionsForSelection() {
    const { mode, selection, data } = state;
    if (!selection) return [];
    const all = data.sesiones.filter((s) => s.tipo !== "receso" || mode === "horario");

    switch (mode) {
      case "horario":
        return all.filter((s) => s.dia === selection.day && s.inicio === selection.inicio);
      case "tema":
        return all.filter((s) => s.ejeId === selection && s.tipo !== "receso");
      case "tipo":
        return all.filter((s) => s.tipo === selection);
      case "disertante":
        return all.filter(
          (s) =>
            (s.disertantes || []).includes(selection) || (s.moderadores || []).includes(selection)
        );
      case "aula":
        return all.filter((s) => s.sala === selection && s.tipo !== "receso");
      case "ahora":
        return selection.sessions || [];
      default:
        return [];
    }
  }

  function renderSession(session, query = "") {
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

    return `
      <article class="session${isReceso ? " is-receso" : ""}" data-sala="${escapeHtml(session.sala || "")}">
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
    const byDay = groupByDay(sessions);
    return byDay
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
    });

    if (mode === "ahora") {
      showAhora();
      return;
    }

    els.results.hidden = true;
    els.stepPanel.hidden = false;
    renderStep();
  }

  function showResults(title) {
    const sessions = sessionsForSelection();
    const query = state.mode === "disertante" ? state.selection : "";
    state.showResults = true;
    els.stepPanel.hidden = true;
    els.results.hidden = false;
    els.resultsTitle.textContent = title;
    els.resultsBody.innerHTML = renderSessionsList(sessions, query || "");
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

  function renderStep() {
    const copy = MODE_COPY_KEYS[state.mode];
    els.stepTitle.textContent = t(copy.title);
    els.stepHelp.textContent = t(copy.help);
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
    if (!state.day) {
      els.stepTitle.textContent = t("step.horario.dayTitle");
      els.stepHelp.textContent = t("step.horario.dayHelp");
      els.optionGrid.innerHTML = state.data.meta.fechas
        .map((dia, i) => {
          const eje = state.data.ejes.find((e) => e.dia === dia);
          return optionButton({
            value: dia,
            title: dayShort(dia),
            subtitle: eje
              ? `${t(`eje.${i + 1}.label`)}: ${ejeName(eje.id, eje.nombre)}`
              : "",
            count: state.data.sesiones.filter((s) => s.dia === dia && s.tipo !== "receso").length,
          });
        })
        .join("");
      return;
    }

    els.stepTitle.textContent = t("step.horario.slotTitle");
    els.stepHelp.textContent = dayLong(state.day);
    const slots = groupBySlot(
      state.data.sesiones.filter((s) => s.dia === state.day && s.tipo !== "receso")
    );
    els.optionGrid.innerHTML =
      optionButton({
        value: "__back_days__",
        title: t("back.days"),
        subtitle: t("back.days.sub"),
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

  function renderTemaStep() {
    els.optionGrid.innerHTML = state.data.ejes
      .map((eje, i) =>
        optionButton({
          value: eje.id,
          title: t(`eje.${i + 1}.label`),
          subtitle: `${dayShort(eje.dia)} · ${ejeName(eje.id, eje.nombre)}`,
          count: state.data.sesiones.filter((s) => s.ejeId === eje.id && s.tipo !== "receso")
            .length,
        })
      )
      .join("");
  }

  function renderTipoStep() {
    const tipos = [...new Set(state.data.sesiones.map((s) => s.tipo))].filter((x) => x !== "receso");
    const order = ["bienvenida", "conferencia", "plenaria", "mesa", "conversatorio", "acto"];
    tipos.sort((a, b) => order.indexOf(a) - order.indexOf(b));
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
    const salas = state.data.meta.salas;
    els.optionGrid.innerHTML = salas
      .map((sala) =>
        optionButton({
          value: sala,
          title: sala,
          subtitle: sala === "Aula Magna" ? t("room.magna.sub") : t("room.consejo.sub"),
          count: state.data.sesiones.filter((s) => s.sala === sala && s.tipo !== "receso").length,
        })
      )
      .join("");
  }

  function renderDisertanteStep() {
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
      if (!state.day) {
        state.day = value;
        renderStep();
        return;
      }
      state.selection = { day: state.day, inicio: value };
      showResults(`${dayShort(state.day)} · ${value}`);
      return;
    }

    if (mode === "tema") {
      state.selection = value;
      const eje = state.data.ejes.find((e) => e.id === value);
      showResults(
        eje ? t("results.axis", { name: ejeName(eje.id, eje.nombre) }) : t("results.topic")
      );
      return;
    }

    if (mode === "tipo") {
      state.selection = value;
      showResults(tipoLabel(value));
      return;
    }

    if (mode === "aula") {
      state.selection = value;
      showResults(value);
      return;
    }

    if (mode === "disertante") {
      state.selection = value;
      showResults(value);
    }
  }

  function refreshForLang() {
    if (!state.data) return;
    if (state.mode === "ahora" || state.showResults) {
      if (state.mode === "ahora") {
        showAhora();
      } else if (state.selection != null) {
        // Re-run last selection label/results
        if (state.mode === "horario" && state.selection.day) {
          showResults(`${dayShort(state.selection.day)} · ${state.selection.inicio}`);
        } else if (state.mode === "tema") {
          const eje = state.data.ejes.find((e) => e.id === state.selection);
          showResults(
            eje ? t("results.axis", { name: ejeName(eje.id, eje.nombre) }) : t("results.topic")
          );
        } else if (state.mode === "tipo") {
          showResults(tipoLabel(state.selection));
        } else if (state.mode === "aula" || state.mode === "disertante") {
          showResults(state.selection);
        }
      }
      return;
    }
    renderStep();
  }

  function bindEvents() {
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

    els.backBtn.addEventListener("click", () => {
      state.showResults = false;
      state.selection = null;
      if (state.mode === "ahora") {
        setMode("horario");
        return;
      }
      els.results.hidden = true;
      els.stepPanel.hidden = false;
      renderStep();
    });

    let timer;
    els.personFilter.addEventListener("input", () => {
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
    try {
      const res = await fetch("data/programa.json", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      state.data = await res.json();
      bindEvents();
      setMode("horario");
    } catch (err) {
      els.optionGrid.innerHTML = `<p class="empty">${escapeHtml(t("results.loadError"))}</p>`;
      console.error(err);
    }
  }

  init();
})();
