(function () {
  var CFG = window.OBS_PUBLICACIONES || {};
  var MAILTO = String(CFG.OPENALEX_MAILTO || "ids@uccuyo.edu.ar").trim();
  var DEFAULT_PAGE_SIZE = Number(CFG.OPENALEX_PAGE_SIZE) || 15;
  var SEARCH_DEBOUNCE_MS = 450;
  var HASH_LOCAL = "#publicaciones";
  var HASH_GLOBAL = "#publicaciones-global";
  var HASH_ALIASES_GLOBAL = {
    "publicaciones-global": true,
    "biblioteca-global": true,
    "publicaciones-ds-mundo": true
  };

  var filtrosDef = [
    { id: "todas", labelKey: "dyn.biblio.filter.todas", icono: "✨" },
    { id: "libros", labelKey: "dyn.biblio.filter.libros", icono: "📚" },
    { id: "capitulos", labelKey: "dyn.biblio.filter.capitulos", icono: "📖" },
    { id: "articulos", labelKey: "dyn.biblio.filter.articulos", icono: "📄" },
    { id: "reuniones", labelKey: "dyn.biblio.filter.reuniones", icono: "🎓" },
    { id: "diarios", labelKey: "dyn.biblio.filter.diarios", icono: "📰" },
    {
      id: "revista",
      labelKey: "dyn.biblio.filter.revista",
      icono: "📕",
      href: "https://revistas.uccuyo.edu.ar/index.php/rids/index"
    }
  ];

  var itemsLocal = ((window.IDS_BIBLIOTECA || {}).items || []).slice();
  var filtroActivo = "todas";

  var items = [];
  var metaTotal = 0;
  var currentPage = 1;
  var totalPages = 1;
  var loaded = false;
  var loading = false;
  var searchQuery = "";
  var searchMode = "auto";
  var searchDebounce = null;
  var pendingPage = null;
  var pendingQuery = null;
  var yearFilter = "all";
  var pageSize = DEFAULT_PAGE_SIZE;
  var sortMode = "date_desc";

  function el(id) {
    return document.getElementById(id);
  }

  function esc(s) {
    var d = document.createElement("div");
    d.textContent = s == null ? "" : String(s);
    return d.innerHTML;
  }

  function tt(key, fallback, vars) {
    if (window.I18N && typeof window.I18N.t === "function") {
      var v = window.I18N.t(key, vars);
      if (v && v !== key) return v;
    }
    var text = fallback == null ? key : fallback;
    if (vars && typeof vars === "object") {
      Object.keys(vars).forEach(function (k) {
        text = String(text).split("{" + k + "}").join(String(vars[k]));
      });
    }
    return text;
  }

  function formatInt(n) {
    var loc =
      window.I18N && window.I18N.getLang && window.I18N.getLang() === "en"
        ? "en-US"
        : "es-AR";
    return Number(n || 0).toLocaleString(loc);
  }

  function hashId() {
    return String(location.hash || "").replace(/^#/, "");
  }

  function esHashGlobal() {
    return !!HASH_ALIASES_GLOBAL[hashId()];
  }

  function doiToUrl(d) {
    var x = String(d || "").trim();
    if (!x) return "";
    if (/^https?:\/\//i.test(x)) return x;
    return "https://doi.org/" + x.replace(/^doi:\s*/i, "");
  }

  function normalizarDoi(q) {
    var s = String(q || "").trim();
    s = s.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "");
    s = s.replace(/^doi:\s*/i, "");
    return s.trim();
  }

  function escapeRegExp(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function highlightText(text) {
    var src = text == null ? "" : String(text);
    var q = searchQuery.trim();
    if (!q) return esc(src);
    var needle = /^10\.\d{3,}/i.test(normalizarDoi(q)) ? normalizarDoi(q) : q;
    if (!needle) return esc(src);
    var re = new RegExp("(" + escapeRegExp(needle) + ")", "ig");
    var isExact = new RegExp("^" + escapeRegExp(needle) + "$", "i");
    return src
      .split(re)
      .map(function (part) {
        return isExact.test(part) ? '<mark class="pub-mark">' + esc(part) + "</mark>" : esc(part);
      })
      .join("");
  }

  function chipClass(cat) {
    if (cat === "libros") return "libros";
    if (cat === "capitulos") return "capitulos";
    if (cat === "articulos") return "papers";
    if (cat === "reuniones") return "eventos";
    if (cat === "diarios") return "diarios";
    return "otros";
  }

  function metaLocal(it) {
    var partes = [];
    if (it.autores) partes.push(it.autores);
    if (it.editorial) partes.push(it.editorial);
    if (it.isbn) partes.push("ISBN " + it.isbn);
    if (it.revista) partes.push(it.revista);
    if (it.evento) partes.push(it.evento);
    if (it.fecha) partes.push(it.fecha);
    if (it.doi) partes.push("DOI: " + it.doi);
    return partes.join(" · ");
  }

  function tipoLocal(it) {
    if (it.categoria === "libros") return tt("dyn.biblio.chip.libro", "Libro");
    if (it.categoria === "capitulos") return tt("dyn.biblio.chip.capitulo", "Capítulo de libro");
    if (it.categoria === "articulos") return tt("dyn.biblio.chip.articulo", "Artículo científico");
    if (it.categoria === "reuniones") return tt("dyn.biblio.chip.reunion", "Reunión científica");
    if (it.categoria === "diarios") return tt("dyn.biblio.chip.diario", "Diario");
    return it.tipo || tt("dyn.biblio.chip.articulo", "Publicación");
  }

  function filaLocalHTML(it) {
    var href = it.link || doiToUrl(it.doi);
    var linkHtml = href
      ? '<a class="pub-btn-link" href="' +
        esc(href) +
        '" target="_blank" rel="noopener noreferrer">' +
        (it.doi ? tt("dyn.biblio.viewDoi", "Ver DOI") : tt("dyn.biblio.openLink", "Abrir enlace")) +
        "</a>"
      : '<span class="pub-row-nolink">' + tt("dyn.biblio.noLink", "Sin enlace") + "</span>";
    return (
      '<article class="pub-row">' +
      '<div class="pub-row-type"><span class="pub-chip pub-chip--' +
      chipClass(it.categoria) +
      '">' +
      esc(tipoLocal(it)) +
      "</span></div>" +
      '<div class="pub-row-main"><h3 class="pub-row-title">' +
      esc(it.titulo || "Sin título") +
      "</h3>" +
      (metaLocal(it) ? '<p class="pub-row-meta">' + esc(metaLocal(it)) + "</p>" : "") +
      "</div>" +
      '<div class="pub-row-when"><span class="pub-row-year">' +
      esc(it.anio || "—") +
      "</span></div>" +
      '<div class="pub-row-link">' +
      linkHtml +
      "</div></article>"
    );
  }

  function dibujarFiltros() {
    var root = el("pub-filters");
    if (!root) return;
    root.innerHTML = filtrosDef
      .map(function (f) {
        var label = esc(tt(f.labelKey, f.id));
        var icon =
          '<span class="pub-filter-icon" aria-hidden="true">' +
          esc(f.icono) +
          "</span> ";
        if (f.href) {
          return (
            '<a class="pub-filter" href="' +
            esc(f.href) +
            '" target="_blank" rel="noopener noreferrer" aria-label="' +
            esc(tt("sec.biblio.revista.aria", "Revista del IDS (se abre en otra pestaña)")) +
            '">' +
            icon +
            label +
            "</a>"
          );
        }
        var sel = filtroActivo === f.id ? " pub-filter--active" : "";
        return (
          '<button type="button" class="pub-filter' +
          sel +
          '" data-filtro="' +
          esc(f.id) +
          '" aria-pressed="' +
          (filtroActivo === f.id) +
          '">' +
          icon +
          label +
          "</button>"
        );
      })
      .join("");
    root.querySelectorAll(".pub-filter[data-filtro]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        filtroActivo = btn.getAttribute("data-filtro");
        dibujarFiltros();
        dibujarLocal();
      });
    });
  }

  function dibujarLocal() {
    var grid = el("pub-grid");
    var wrap = el("pub-count-wrap");
    var count = el("pub-count");
    if (!grid) return;
    var list = itemsLocal.filter(function (it) {
      return filtroActivo === "todas" || it.categoria === filtroActivo;
    });
    if (wrap) wrap.hidden = false;
    if (count) count.textContent = String(list.length);
    if (!list.length) {
      grid.innerHTML =
        '<div class="pub-msg pub-msg--hint">' +
        tt(
          "dyn.biblio.emptyFilter",
          "<p>No hay registros en este filtro.</p><p>Elegí <strong>Ver todas</strong> para ver la producción del Instituto.</p>"
        ) +
        "</div>";
      return;
    }
    grid.innerHTML =
      '<div class="pub-results" role="list">' +
      '<div class="pub-list-head" aria-hidden="true"><span>' +
      tt("dyn.biblio.col.tipo", "Tipo") +
      "</span><span>" +
      tt("dyn.biblio.col.titulo", "Título") +
      "</span><span>" +
      tt("dyn.biblio.col.ano", "Año") +
      "</span><span>" +
      tt("dyn.biblio.col.enlace", "Enlace") +
      "</span></div>" +
      list.map(filaLocalHTML).join("") +
      "</div>";
  }

  function etiquetaModo() {
    if (searchMode === "title") return tt("dyn.biblio.mode.titulo", "título");
    if (searchMode === "author") return tt("dyn.biblio.mode.autor", "autor/a");
    if (searchMode === "doi") return "DOI";
    return tt("dyn.biblio.mode.coincidencias", "coincidencias");
  }

  function etiquetaOrden() {
    if (sortMode === "date_asc") return tt("dyn.biblio.sort.dateAsc", "Fecha ascendente");
    if (sortMode === "relevance") return tt("dyn.biblio.sort.relevance", "Relevancia");
    return tt("dyn.biblio.sort.dateDesc", "Fecha descendente");
  }

  function actualizarContador() {
    var wrap = el("pub-index-count-wrap");
    var label = el("pub-index-count-label");
    if (wrap) wrap.hidden = false;
    if (label) {
      label.innerHTML = tt("dyn.biblio.approx", "{n} trabajos aproximados (referencia OpenAlex, ODS)", {
        n: formatInt(metaTotal)
      });
    }
  }

  function actualizarBotonLimpiar() {
    var clearBtn = el("pub-index-q-clear");
    var input = el("pub-index-q");
    if (!clearBtn) return;
    clearBtn.hidden = !((input && input.value.trim()) || searchQuery.trim());
  }

  function actualizarResumenFiltros() {
    var box = el("pub-index-active");
    if (!box) return;
    var parts = [];
    if (yearFilter !== "all") parts.push(tt("dyn.biblio.year", "Año") + ": " + yearFilter);
    if (searchMode !== "auto") parts.push(tt("dyn.biblio.mode", "Modo") + ": " + etiquetaModo());
    parts.push(tt("dyn.biblio.orden", "Orden") + ": " + etiquetaOrden());
    parts.push(tt("dyn.biblio.pageSize", "Página") + ": " + pageSize);
    if (searchQuery.trim()) parts.push(tt("dyn.biblio.search", "Búsqueda") + ': "' + searchQuery.trim() + '"');
    box.textContent = parts.length
      ? tt("dyn.biblio.filtersActive", "Filtros activos: {parts}", { parts: parts.join(" · ") })
      : "";
  }

  function mensajeCarga() {
    if (searchQuery.trim()) {
      return (
        '<div class="pub-msg pub-msg--loading">' +
        esc(
          tt("dyn.biblio.searching", 'Buscando por {mode}: "{q}"…', {
            mode: etiquetaModo(),
            q: searchQuery.trim()
          })
        ) +
        "</div>"
      );
    }
    return (
      '<div class="pub-msg pub-msg--loading">' +
      esc(tt("dyn.biblio.loading", "Cargando en OpenAlex, Crossref, Semantic Scholar, Europe PMC, OpenAIRE y DOAJ…")) +
      "</div>"
    );
  }

  function filaGlobalHTML(it) {
    var link = it.link || (it.doi ? doiToUrl(it.doi) : "");
    var linkHtml = link
      ? '<a class="pub-btn-link" href="' +
        esc(link) +
        '" target="_blank" rel="noopener noreferrer">' +
        (it.doi ? tt("dyn.biblio.viewDoi", "Ver DOI") : tt("dyn.biblio.openLink", "Abrir enlace")) +
        "</a>"
      : '<span class="pub-row-nolink">' + tt("dyn.biblio.noLink", "Sin enlace") + "</span>";
    var meta = it.autores || "";
    if (it.doi) meta += (meta ? " · " : "") + "DOI: " + it.doi;
    if (it.fuente) meta += (meta ? " · " : "") + it.fuente;
    if (it.oaUrl) meta += (meta ? " · " : "") + tt("dyn.biblio.oa", "Acceso abierto");
    return (
      '<article class="pub-row">' +
      '<div class="pub-row-type"><span class="pub-chip pub-chip--revistas">' +
      esc(it.tipo || tt("dyn.biblio.chip.trabajo", "Trabajo")) +
      "</span></div>" +
      '<div class="pub-row-main"><h3 class="pub-row-title">' +
      highlightText(it.titulo) +
      "</h3>" +
      (meta ? '<p class="pub-row-meta">' + highlightText(meta) + "</p>" : "") +
      "</div>" +
      '<div class="pub-row-when"><span class="pub-row-year">' +
      esc(it.anio || "—") +
      "</span></div>" +
      '<div class="pub-row-link">' +
      linkHtml +
      "</div></article>"
    );
  }

  function dibujarGrillaGlobal() {
    var grid = el("pub-index-grid");
    if (!grid) return;
    if (!items.length) {
      grid.innerHTML = searchQuery.trim()
        ? '<div class="pub-msg pub-msg--hint">' +
          tt("dyn.biblio.emptySearch", "", { mode: esc(etiquetaModo()), q: esc(searchQuery.trim()) }) +
          "</div>"
        : '<div class="pub-msg pub-msg--hint">' +
          tt("dyn.biblio.emptyPage", "<p>No hay registros para mostrar en esta página.</p>") +
          "</div>";
      return;
    }
    var html =
      '<div class="pub-results" role="list">' +
      '<div class="pub-list-head pub-list-head--index" aria-hidden="true"><span>' +
      tt("dyn.biblio.col.tipo", "Tipo") +
      "</span><span>" +
      tt("dyn.biblio.col.titulo", "Título") +
      "</span><span>" +
      tt("dyn.biblio.col.ano", "Año") +
      "</span><span>" +
      tt("dyn.biblio.col.enlace", "Enlace") +
      "</span></div>" +
      items.map(filaGlobalHTML).join("") +
      "</div>";
    if (totalPages > 1) {
      html += '<div class="pub-index-pager">';
      if (currentPage > 1) {
        html +=
          '<button type="button" class="pub-more-btn pub-index-nav" data-pub-index-page="1">' +
          tt("dyn.biblio.first", "« Primera") +
          "</button>" +
          '<button type="button" class="pub-more-btn pub-index-nav" data-pub-index-page="' +
          (currentPage - 1) +
          '">' +
          tt("dyn.biblio.prev", "← Anterior") +
          "</button>";
      }
      html +=
        '<span class="pub-index-page-info">' +
        tt("dyn.biblio.pageOf", "Página {n} de {total} · {count} resultados", {
          n: currentPage,
          total: totalPages,
          count: formatInt(metaTotal)
        }) +
        "</span>";
      if (currentPage < totalPages) {
        html +=
          '<button type="button" class="pub-more-btn pub-index-nav" data-pub-index-page="' +
          (currentPage + 1) +
          '">' +
          tt("dyn.biblio.next", "Siguiente →") +
          "</button>" +
          '<button type="button" class="pub-more-btn pub-index-nav" data-pub-index-page="' +
          totalPages +
          '">' +
          tt("dyn.biblio.last", "Última »") +
          "</button>";
      }
      html += "</div>";
    }
    grid.innerHTML = html;
    grid.querySelectorAll("[data-pub-index-page]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var p = parseInt(btn.getAttribute("data-pub-index-page"), 10);
        if (!p || p < 1) return;
        cargarPagina(p);
      });
    });
  }

  function ejecutarPendiente() {
    if (pendingPage == null) return;
    var p = pendingPage;
    var q = pendingQuery;
    pendingPage = null;
    pendingQuery = null;
    cargarPagina(p, q);
  }

  function cargarPagina(page, query) {
    if (typeof query === "string") searchQuery = query;
    if (loading) {
      pendingPage = page;
      pendingQuery = typeof query === "string" ? query : null;
      return;
    }
    if (!window.PUB_FUENTES_ABIERTAS || !window.PUB_FUENTES_ABIERTAS.buscar) {
      var statusErr = el("pub-index-status");
      if (statusErr) {
        statusErr.innerHTML =
          '<div class="pub-msg pub-msg--error">' +
          tt("dyn.biblio.errorScript", "No se pudo cargar el buscador de fuentes abiertas.") +
          "</div>";
      }
      return;
    }
    loading = true;
    currentPage = page;
    var status = el("pub-index-status");
    if (status) status.innerHTML = mensajeCarga();

    window.PUB_FUENTES_ABIERTAS.buscar({
      scope: "sd-global",
      defaultQuery: "sustainable development",
      mailto: MAILTO,
      appLabel: "Biblioteca IDS UCCuyo",
      page: page,
      pageSize: pageSize,
      searchQuery: searchQuery,
      searchMode: searchMode,
      yearFilter: yearFilter,
      sortMode: sortMode
    })
      .then(function (res) {
        loading = false;
        if (!res || !res.items) throw new Error("format");
        metaTotal = Number(res.metaTotal) || 0;
        currentPage = Number(res.currentPage) || page;
        totalPages = Number(res.totalPages) || Math.max(1, Math.ceil(metaTotal / pageSize));
        items = res.items;
        loaded = true;
        actualizarContador();
        actualizarBotonLimpiar();
        actualizarResumenFiltros();
        if (status) {
          if (res.fuentesFallidas && res.fuentesFallidas.length) {
            status.innerHTML =
              '<div class="pub-msg pub-msg--hint">' +
              tt("dyn.biblio.partial", "Algunas fuentes no respondieron ({sources}). Se muestran resultados de las demás.", {
                sources: esc(res.fuentesFallidas.join(", "))
              }) +
              "</div>";
          } else {
            status.innerHTML = "";
          }
        }
        dibujarGrillaGlobal();
        ejecutarPendiente();
      })
      .catch(function () {
        loading = false;
        if (status) {
          status.innerHTML =
            '<div class="pub-msg pub-msg--error">' +
            tt(
              "dyn.biblio.error",
              "No se pudo cargar el índice desde las fuentes abiertas. Probá de nuevo en unos minutos."
            ) +
            "</div>";
        }
        ejecutarPendiente();
      });
  }

  function programarBusqueda(valor) {
    if (searchDebounce) window.clearTimeout(searchDebounce);
    searchDebounce = window.setTimeout(function () {
      searchDebounce = null;
      cargarPagina(1, valor);
    }, SEARCH_DEBOUNCE_MS);
  }

  function seleccionarModo(modo) {
    searchMode = modo || "auto";
    document.querySelectorAll("[data-pub-index-mode]").forEach(function (btn) {
      var on = btn.getAttribute("data-pub-index-mode") === searchMode;
      btn.classList.toggle("pub-index-mode--active", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function construirOpcionesAnio() {
    var select = el("pub-index-year");
    if (!select) return;
    var currentYear = new Date().getFullYear();
    var opts = [
      '<option value="all">' + esc(tt("dyn.biblio.allYears", "Todos los años")) + "</option>"
    ];
    for (var y = currentYear; y >= 1990; y--) {
      opts.push('<option value="' + y + '">' + y + "</option>");
    }
    select.innerHTML = opts.join("");
    select.value = yearFilter;
  }

  function limpiarBusqueda() {
    var input = el("pub-index-q");
    if (input) input.value = "";
    searchQuery = "";
    actualizarBotonLimpiar();
    actualizarResumenFiltros();
    cargarPagina(1, "");
  }

  function limpiarTodo() {
    var input = el("pub-index-q");
    var yearSelect = el("pub-index-year");
    var sizeSelect = el("pub-index-size");
    var sortSelect = el("pub-index-sort");
    if (input) input.value = "";
    if (yearSelect) yearSelect.value = "all";
    if (sizeSelect) sizeSelect.value = String(DEFAULT_PAGE_SIZE);
    if (sortSelect) sortSelect.value = "date_desc";
    searchQuery = "";
    searchMode = "auto";
    yearFilter = "all";
    pageSize = DEFAULT_PAGE_SIZE;
    sortMode = "date_desc";
    seleccionarModo("auto");
    actualizarBotonLimpiar();
    actualizarResumenFiltros();
    cargarPagina(1, "");
  }

  function initBuscador() {
    var input = el("pub-index-q");
    if (!input) return;
    construirOpcionesAnio();
    var sizeSelect = el("pub-index-size");
    var sortSelect = el("pub-index-sort");
    var yearSelect = el("pub-index-year");
    var clearBtn = el("pub-index-q-clear");
    var clearAllBtn = el("pub-index-clear-all");
    if (sizeSelect) sizeSelect.value = String(pageSize);
    if (sortSelect) sortSelect.value = sortMode;

    document.querySelectorAll("[data-pub-index-mode]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        seleccionarModo(btn.getAttribute("data-pub-index-mode"));
        if (input.value.trim()) {
          if (searchDebounce) window.clearTimeout(searchDebounce);
          cargarPagina(1, input.value);
        }
        actualizarResumenFiltros();
      });
    });

    input.addEventListener("input", function () {
      actualizarBotonLimpiar();
      actualizarResumenFiltros();
      programarBusqueda(input.value);
    });
    input.addEventListener("keydown", function (e) {
      if (e.key !== "Enter") return;
      e.preventDefault();
      if (searchDebounce) window.clearTimeout(searchDebounce);
      cargarPagina(1, input.value);
    });
    if (clearBtn) clearBtn.addEventListener("click", limpiarBusqueda);
    if (clearAllBtn) clearAllBtn.addEventListener("click", limpiarTodo);
    if (yearSelect) {
      yearSelect.addEventListener("change", function () {
        yearFilter = yearSelect.value || "all";
        actualizarResumenFiltros();
        cargarPagina(1);
      });
    }
    if (sizeSelect) {
      sizeSelect.addEventListener("change", function () {
        pageSize = Number(sizeSelect.value) || DEFAULT_PAGE_SIZE;
        actualizarResumenFiltros();
        cargarPagina(1);
      });
    }
    if (sortSelect) {
      sortSelect.addEventListener("change", function () {
        sortMode = sortSelect.value || "date_desc";
        actualizarResumenFiltros();
        cargarPagina(1);
      });
    }
    actualizarResumenFiltros();
  }

  function setHash(hash) {
    if (location.hash === hash) return;
    if (window.history && window.history.replaceState) {
      window.history.replaceState({ page: "publicaciones" }, "", hash);
    } else {
      window.location.hash = hash.replace(/^#/, "");
    }
  }

  function activarTab(tabId, updateHash) {
    var tabs = document.querySelectorAll("[data-pub-tab]");
    var panels = {
      instituto: el("pub-panel-instituto"),
      global: el("pub-panel-global-sd")
    };
    tabs.forEach(function (btn) {
      var on = btn.getAttribute("data-pub-tab") === tabId;
      btn.classList.toggle("pub-tab--active", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
      btn.tabIndex = on ? 0 : -1;
    });
    Object.keys(panels).forEach(function (key) {
      var panel = panels[key];
      if (!panel) return;
      if (key === tabId) panel.removeAttribute("hidden");
      else panel.hidden = true;
    });
    if (tabId === "global" && !loaded && !loading) cargarPagina(1);
    if (updateHash !== false) {
      setHash(tabId === "global" ? HASH_GLOBAL : HASH_LOCAL);
    }
  }

  function syncHashTab() {
    activarTab(esHashGlobal() ? "global" : "instituto", false);
  }

  function initTabs() {
    var tablist = document.querySelector(".ids-biblio .pub-tabs");
    if (!tablist) return;
    dibujarFiltros();
    dibujarLocal();
    initBuscador();
    tablist.querySelectorAll("[data-pub-tab]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        activarTab(btn.getAttribute("data-pub-tab"));
      });
      btn.addEventListener("keydown", function (e) {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
        var tabs = Array.prototype.slice.call(tablist.querySelectorAll("[data-pub-tab]"));
        var i = tabs.indexOf(btn);
        if (i < 0) return;
        e.preventDefault();
        var next = e.key === "ArrowRight" ? tabs[i + 1] : tabs[i - 1];
        if (next) {
          next.focus();
          activarTab(next.getAttribute("data-pub-tab"));
        }
      });
    });
    document.addEventListener("ids:page", function (ev) {
      if (ev.detail !== "publicaciones") return;
      syncHashTab();
    });
    window.addEventListener("hashchange", function () {
      if (hashId() === "publicaciones" || esHashGlobal() || hashId() === "biblioteca") {
        syncHashTab();
      }
    });
    syncHashTab();
    window.addEventListener("oia:langchange", function () {
      dibujarFiltros();
      dibujarLocal();
      construirOpcionesAnio();
      actualizarContador();
      actualizarResumenFiltros();
      if (loaded) dibujarGrillaGlobal();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTabs);
  } else {
    initTabs();
  }
})();
