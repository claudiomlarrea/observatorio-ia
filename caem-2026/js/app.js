(() => {
  const TIPO_LABEL = {
    bienvenida: "Bienvenida",
    conferencia: "Conferencia",
    plenaria: "Plenaria",
    mesa: "Mesa redonda",
    conversatorio: "Conversatorio",
    acto: "Acto",
    receso: "Receso",
  };

  const DAY_LABELS = {
    "2026-09-16": { short: "Mié 16", long: "Miércoles 16" },
    "2026-09-17": { short: "Jue 17", long: "Jueves 17" },
    "2026-09-18": { short: "Vie 18", long: "Viernes 18" },
  };

  const state = {
    data: null,
    day: "2026-09-16",
    sala: "todas",
    query: "",
  };

  const els = {
    dayTabs: document.getElementById("day-tabs"),
    ejeBanner: document.getElementById("eje-banner"),
    program: document.getElementById("program"),
    search: document.getElementById("search-input"),
    searchHint: document.getElementById("search-hint"),
    nowBlock: document.getElementById("now-block"),
    nowLabel: document.getElementById("now-label"),
    nowContent: document.getElementById("now-content"),
    salaChips: document.querySelectorAll(".sala-chip"),
  };

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
    // Map index from normalized to original is approximate when accents differ;
    // rebuild by scanning original chars.
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
      const ch = text[oi];
      const nCh = normalize(ch);
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

  function sessionMatches(session, query, sala) {
    if (sala !== "todas") {
      if (session.tipo === "receso") return true;
      if (session.sala !== sala) return false;
    }
    if (!query) return true;
    const haystack = normalize(
      [
        session.titulo,
        session.sala,
        TIPO_LABEL[session.tipo] || session.tipo,
        ...(session.disertantes || []),
        ...(session.moderadores || []),
      ].join(" ")
    );
    return haystack.includes(normalize(query));
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

  function salaClass(sala) {
    if (sala === "Aula Magna") return "magna";
    if (sala === "Salón de Consejo") return "consejo";
    return "";
  }

  function renderSession(session, query) {
    const isReceso = session.tipo === "receso";
    const tipo = TIPO_LABEL[session.tipo] || session.tipo;
    const people = [];
    if (session.disertantes?.length) {
      people.push(
        `<li><strong>Disertantes:</strong> ${session.disertantes
          .map((p) => highlight(p, query))
          .join("; ")}</li>`
      );
    }
    if (session.moderadores?.length) {
      people.push(
        `<li><strong>Moderación:</strong> ${session.moderadores
          .map((p) => highlight(p, query))
          .join("; ")}</li>`
      );
    }

    const salaBadge = session.sala
      ? `<span class="badge badge-sala ${salaClass(session.sala)}">${highlight(
          session.sala,
          query
        )}</span>`
      : "";

    return `
      <article class="session${isReceso ? " is-receso" : ""}" data-sala="${escapeHtml(
      session.sala || ""
    )}" data-id="${escapeHtml(session.id)}">
        <div class="session-meta">
          ${salaBadge}
          <span class="badge">${escapeHtml(tipo)}</span>
        </div>
        <h3 class="session-title">${highlight(session.titulo, query)}</h3>
        ${people.length ? `<ul class="session-people">${people.join("")}</ul>` : ""}
      </article>
    `;
  }

  function renderProgram() {
    const { data, day, sala, query } = state;
    if (!data) return;

    const eje = data.ejes.find((e) => e.dia === day);
    if (eje && !query) {
      els.ejeBanner.innerHTML = `<strong>Eje del día:</strong> ${escapeHtml(eje.nombre)}`;
      els.ejeBanner.hidden = false;
    } else if (query) {
      els.ejeBanner.innerHTML = `<strong>Resultados</strong> para “${escapeHtml(query)}”`;
      els.ejeBanner.hidden = false;
    } else {
      els.ejeBanner.hidden = true;
    }

    let sessions = data.sesiones.filter((s) => sessionMatches(s, query, sala));
    if (!query) {
      sessions = sessions.filter((s) => s.dia === day);
    }

    if (!sessions.length) {
      els.program.innerHTML = `<p class="empty">No hay sesiones que coincidan con la búsqueda.</p>`;
      els.searchHint.hidden = false;
      els.searchHint.textContent = "Probá con un apellido, una sala o una palabra del título.";
      return;
    }

    els.searchHint.hidden = true;

    // When searching across days, group by day then slot
    if (query) {
      const byDay = new Map();
      for (const s of sessions) {
        if (!byDay.has(s.dia)) byDay.set(s.dia, []);
        byDay.get(s.dia).push(s);
      }
      const days = [...byDay.keys()].sort();
      els.program.innerHTML = days
        .map((d) => {
          const label = DAY_LABELS[d]?.long || d;
          const slots = groupBySlot(byDay.get(d));
          return `
            <div class="day-group">
              <h2 class="slot-time" style="margin-top:1rem">${escapeHtml(label)}</h2>
              ${slots.map((slot) => renderSlot(slot, query)).join("")}
            </div>
          `;
        })
        .join("");
      return;
    }

    const slots = groupBySlot(sessions);
    els.program.innerHTML = slots.map((slot) => renderSlot(slot, query)).join("");
  }

  function renderSlot(slot, query) {
    const parallel = slot.items.filter((s) => s.tipo !== "receso").length > 1;
    return `
      <section class="slot">
        <h2 class="slot-time">${escapeHtml(slot.inicio)} <span>– ${escapeHtml(slot.fin)}</span></h2>
        <div class="slot-grid${parallel ? " is-parallel" : ""}">
          ${slot.items.map((s) => renderSession(s, query)).join("")}
        </div>
      </section>
    `;
  }

  function renderDayTabs() {
    const { data, day } = state;
    els.dayTabs.innerHTML = data.meta.fechas
      .map((fecha, i) => {
        const label = DAY_LABELS[fecha] || { short: fecha, long: fecha };
        const active = fecha === day ? " is-active" : "";
        return `
          <button
            type="button"
            class="day-tab${active}"
            role="tab"
            aria-selected="${fecha === day}"
            data-day="${fecha}"
          >
            ${escapeHtml(label.short)}
            <small>Eje ${i + 1}</small>
          </button>
        `;
      })
      .join("");
  }

  function argentinaNow() {
    // Use America/Argentina/Buenos_Aires for congress local time
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
    const date = `${parts.year}-${parts.month}-${parts.day}`;
    const minutes = Number(parts.hour) * 60 + Number(parts.minute);
    return { date, minutes };
  }

  function renderNow() {
    const { data } = state;
    if (!data) return;

    const { date, minutes } = argentinaNow();
    const congressDays = data.meta.fechas;
    const isCongressDay = congressDays.includes(date);

    let label = "Próximo";
    let sessions = [];

    if (isCongressDay) {
      const today = data.sesiones.filter(
        (s) => s.dia === date && s.tipo !== "receso"
      );
      const ongoing = today.filter(
        (s) => toMinutes(s.inicio) <= minutes && minutes < toMinutes(s.fin)
      );
      if (ongoing.length) {
        label = "Ahora";
        sessions = ongoing;
      } else {
        const upcoming = today
          .filter((s) => toMinutes(s.inicio) > minutes)
          .sort((a, b) => toMinutes(a.inicio) - toMinutes(b.inicio));
        if (upcoming.length) {
          const t = upcoming[0].inicio;
          sessions = upcoming.filter((s) => s.inicio === t);
          label = "Próximo";
        }
      }
    } else {
      // Outside congress dates: preview first slot of day 1
      const firstDay = congressDays[0];
      const daySessions = data.sesiones
        .filter((s) => s.dia === firstDay && s.tipo !== "receso")
        .sort((a, b) => toMinutes(a.inicio) - toMinutes(b.inicio));
      if (daySessions.length) {
        const t = daySessions[0].inicio;
        sessions = daySessions.filter((s) => s.inicio === t);
        label = "Apertura del congreso";
      }
    }

    if (!sessions.length) {
      els.nowBlock.hidden = true;
      return;
    }

    els.nowLabel.textContent = label;
    els.nowContent.innerHTML = `
      <p class="slot-time" style="margin:0 0 0.5rem">${escapeHtml(sessions[0].inicio)} <span>– ${escapeHtml(
      sessions[0].fin
    )}</span></p>
      <div class="slot-grid${sessions.length > 1 ? " is-parallel" : ""}">
        ${sessions.map((s) => renderSession(s, "")).join("")}
      </div>
    `;
    els.nowBlock.hidden = false;
  }

  function setDay(day) {
    state.day = day;
    renderDayTabs();
    renderProgram();
  }

  function debounce(fn, ms) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  function bindEvents() {
    els.dayTabs.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-day]");
      if (!btn) return;
      state.query = "";
      els.search.value = "";
      setDay(btn.dataset.day);
    });

    els.salaChips.forEach((chip) => {
      chip.addEventListener("click", () => {
        els.salaChips.forEach((c) => c.classList.remove("is-active"));
        chip.classList.add("is-active");
        state.sala = chip.dataset.sala;
        renderProgram();
      });
    });

    const onSearch = debounce(() => {
      state.query = els.search.value.trim();
      renderProgram();
    }, 180);

    els.search.addEventListener("input", onSearch);
  }

  async function init() {
    try {
      const res = await fetch("data/programa.json", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      state.data = await res.json();

      const { date } = argentinaNow();
      if (state.data.meta.fechas.includes(date)) {
        state.day = date;
      } else {
        state.day = state.data.meta.fechas[0];
      }

      renderDayTabs();
      renderNow();
      renderProgram();
      bindEvents();
    } catch (err) {
      els.program.innerHTML = `<p class="empty">No se pudo cargar el programa. Revisá la conexión e intentá de nuevo.</p>`;
      console.error(err);
    }
  }

  init();
})();
