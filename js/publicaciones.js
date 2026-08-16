(function () {
  var CFG = window.OBS_PUBLICACIONES || {};

  function el(id) {
    return document.getElementById(id);
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

  function adminUrl() {
    if (!CFG.APPS_SCRIPT_URL || !String(CFG.APPS_SCRIPT_URL).trim()) return "";
    var base = String(CFG.APPS_SCRIPT_URL).trim();
    return base + (base.indexOf("?") >= 0 ? "&" : "?") + "action=admin";
  }

  function dibujarIngresoEquipo() {
    var root = el("pub-team-entry");
    if (!root) return;
    var url = adminUrl();
    if (!url) {
      root.innerHTML = "";
      return;
    }
    root.innerHTML =
      "<p class=\"pub-intro\" style=\"margin-top:0\">" +
      "<a class=\"btn btn-ghost\" href=\"" +
      esc(url) +
      "\" target=\"_blank\" rel=\"noopener noreferrer\">" +
      esc(tt("dyn.pub.teamEntry", "Ingreso equipo · Cargar publicaciones")) +
      "</a> " +
      "<small>" +
      esc(tt("dyn.pub.teamHint", "(iniciá sesión en Google con un correo autorizado)")) +
      "</small></p>";
  }

  function esc(s) {
    var d = document.createElement("div");
    d.textContent = s == null ? "" : String(s);
    return d.innerHTML;
  }

  var filtrosDef = [
    { id: "todas", labelKey: "dyn.pub.filter.todas", labelEs: "Ver todas", icono: "✨" },
    { id: "papers", labelKey: "dyn.pub.filter.papers", labelEs: "Papers / artículos", icono: "📄" },
    { id: "documentos", labelKey: "dyn.pub.filter.documentos", labelEs: "Documentos de trabajo", icono: "📝" },
    { id: "revistas", labelKey: "dyn.pub.filter.revistas", labelEs: "Revistas", icono: "📑" },
    { id: "libros", labelKey: "dyn.pub.filter.libros", labelEs: "Libros y capítulos", icono: "📚" },
    { id: "repositorios", labelKey: "dyn.pub.filter.repositorios", labelEs: "Informes técnicos", icono: "🗂️" },
    { id: "protocolos", labelKey: "dyn.pub.filter.protocolos", labelEs: "Protocolos", icono: "📋" },
    { id: "datasets", labelKey: "dyn.pub.filter.datasets", labelEs: "Datasets", icono: "📊" },
    { id: "eventos", labelKey: "dyn.pub.filter.eventos", labelEs: "Reuniones / eventos", icono: "🎓" },
    { id: "diarios", labelKey: "dyn.pub.filter.diarios", labelEs: "Medios / diarios", icono: "📰" }
  ];

  var items = [];
  var filtroActivo = "todas";
  var PAGE_SIZE = 10;
  var visibleLimit = PAGE_SIZE;
  var hasLoaded = false;

  function filtroLabel(f) {
    return tt(f.labelKey, f.labelEs);
  }

  function fetchJson(url) {
    return fetch(url, { method: "GET" }).then(function (r) {
      if (!r.ok) throw new Error("network");
      return r.json();
    });
  }

  function fetchJsonp(url) {
    return new Promise(function (resolve, reject) {
      var name = "_obsPubCb_" + Math.floor(Math.random() * 1e9);
      var done = false;
      var qs = url.indexOf("?") >= 0 ? "&" : "?";
      var script = document.createElement("script");
      window[name] = function (data) {
        if (done) return;
        done = true;
        delete window[name];
        if (script.parentNode) script.parentNode.removeChild(script);
        resolve(data);
      };
      script.async = true;
      script.src = url + qs + "callback=" + encodeURIComponent(name);
      script.onerror = function () {
        if (done) return;
        done = true;
        delete window[name];
        if (script.parentNode) script.parentNode.removeChild(script);
        reject(new Error("jsonp"));
      };
      document.body.appendChild(script);
      window.setTimeout(function () {
        if (done) return;
        script.onerror();
      }, 20000);
    });
  }

  function cargar() {
    var status = el("pub-status");
    var url = CFG.APPS_SCRIPT_URL && CFG.APPS_SCRIPT_URL.trim();
    dibujarIngresoEquipo();

    if (!url) {
      items = localItems();
      if (items.length) {
        hasLoaded = true;
        var cwLocal = el("pub-count-wrap");
        if (cwLocal) cwLocal.hidden = false;
        renderTodo();
        return;
      }
      status.innerHTML =
        "<div class=\"pub-msg pub-msg--hint\">Las publicaciones se mostrarán aquí cuando conectés la aplicación web (Google Apps Script). " +
        "Pasos en el archivo <strong>INSTRUCCIONES.txt</strong>.</div>";
      return;
    }

    status.innerHTML =
      "<div class=\"pub-msg pub-msg--loading\">" +
      esc(tt("dyn.pub.loading", "Cargando publicaciones…")) +
      "</div>";

    var urlLive =
      url +
      (url.indexOf("?") >= 0 ? "&" : "?") +
      "action=public&_=" +
      Date.now();
    fetchJson(urlLive).then(
      function (data) {
        if (!data || !data.ok || !Array.isArray(data.items)) throw new Error("format");
        items = mergeLocal(data.items);
        hasLoaded = true;
        var cw = el("pub-count-wrap");
        if (cw) cw.hidden = false;
        renderTodo();
      },
      function () {
        return fetchJsonp(urlLive).then(
          function (data) {
            if (data && data.ok === false) {
              throw new Error(data.message || data.error || "backend");
            }
            if (!data || !data.ok || !Array.isArray(data.items)) throw new Error("format");
            items = mergeLocal(data.items);
            hasLoaded = true;
            var cw2 = el("pub-count-wrap");
            if (cw2) cw2.hidden = false;
            renderTodo();
          },
          function () {
            items = localItems();
            if (items.length) {
              hasLoaded = true;
              var cw3 = el("pub-count-wrap");
              if (cw3) cw3.hidden = false;
              renderTodo();
              return;
            }
            status.innerHTML =
              "<div class=\"pub-msg pub-msg--error\">" +
              tt(
                "dyn.pub.errorConnect",
                "No se pudo conectar al servicio de publicaciones. Si acabás de republicar Apps Script, usá <strong>Administrar implementaciones → lápiz → Nueva versión</strong> (no crees una implementación nueva) y verificá que exista el archivo <code>EncuestaDocentesWeb</code>. Después recargá con <kbd>⌘⇧R</kbd>."
              ) +
              "</div>";
          }
        );
      }
    );
  }

  function localItems() {
    var list = CFG.LOCAL_ITEMS;
    return Array.isArray(list) ? list.slice() : [];
  }

  function mergeLocal(remote) {
    var local = localItems();
    if (!local.length) return remote.slice();
    var seen = {};
    var out = [];
    function keyOf(it) {
      return String((it && it.titulo) || "")
        .toLowerCase()
        .trim();
    }
    local.forEach(function (it) {
      var k = keyOf(it);
      if (k) seen[k] = true;
      out.push(it);
    });
    remote.forEach(function (it) {
      var k = keyOf(it);
      if (k && seen[k]) return;
      out.push(it);
    });
    return out;
  }

  /** Libros, diarios, revistas e informes técnicos → tarjeta “Publicaciones” en números. */
  var CATS_PUBLICACIONES_NUMERO = {
    libros: true,
    diarios: true,
    revistas: true,
    repositorios: true
  };

  function syncNumerosPublicaciones() {
    if (!window.OBS_NUMEROS_API) return;
    var n = 0;
    items.forEach(function (it) {
      if (CATS_PUBLICACIONES_NUMERO[categoriaItem(it)]) n += 1;
    });
    window.OBS_NUMEROS_API.set("publicaciones-oia", n);
  }

  function actualizarContador(n) {
    var wrap = el("pub-count-wrap");
    var label = el("pub-count-label");
    if (wrap) wrap.hidden = false;
    if (label) {
      var tpl = tt(
        "sec.publicaciones.panel.registradas.count",
        "Mostrando {n} en esta vista (filtradas para el Observatorio)."
      );
      label.innerHTML = tpl
        .split("{n}")
        .join('<strong id="pub-count">' + esc(String(n)) + "</strong>");
      return;
    }
    var count = el("pub-count");
    if (count) count.textContent = String(n);
  }

  function renderTodo() {
    el("pub-status").innerHTML = "";
    dibujarIngresoEquipo();
    dibujarFiltros();
    dibujarGrilla();
    syncNumerosPublicaciones();
  }

  function dibujarFiltros() {
    var root = el("pub-filters");
    if (!root) return;
    root.innerHTML = filtrosDef
      .map(function (f) {
        var sel = filtroActivo === f.id ? " pub-filter--active" : "";
        return (
          "<button type=\"button\" class=\"pub-filter" +
          sel +
          "\" data-filtro=\"" +
          esc(f.id) +
          "\" aria-pressed=\"" +
          (filtroActivo === f.id) +
          "\">" +
          "<span class=\"pub-filter-icon\" aria-hidden=\"true\">" +
          esc(f.icono) +
          "</span> " +
          esc(filtroLabel(f)) +
          "</button>"
        );
      })
      .join("");

    root.querySelectorAll(".pub-filter").forEach(function (btn) {
      btn.addEventListener("click", function () {
        filtroActivo = btn.getAttribute("data-filtro");
        visibleLimit = PAGE_SIZE;
        dibujarFiltros();
        dibujarGrilla();
      });
    });
  }

  function aplicarFiltro(list) {
    if (filtroActivo === "todas") return list;
    return list.filter(function (it) {
      return categoriaItem(it) === filtroActivo;
    });
  }

  function categoriaItem(it) {
    var c = String((it && it.categoria) || "").toLowerCase().trim();
    if (c === "papers" || c === "paper" || c === "articulos" || c === "artículos") return "papers";
    if (c === "documentos" || c === "documento" || c === "dt" || c === "working-paper") return "documentos";
    if (c === "protocolos" || c === "protocolo") return "protocolos";
    if (c === "datasets" || c === "dataset" || c === "datos") return "datasets";
    if (c) return c;

    var t = String((it && it.tipo_origen) || "").toLowerCase().trim();
    var tp = String((it && it.tipo_publicacion) || "").toLowerCase().trim();

    if (t === "paper" || t === "articulo" || t === "artículo" || tp.indexOf("paper") >= 0 || tp.indexOf("artículo") >= 0 || tp.indexOf("articulo") >= 0) {
      return "papers";
    }
    if (t === "documento" || t === "dt" || tp.indexOf("documento de trabajo") >= 0 || tp.indexOf("working paper") >= 0) {
      return "documentos";
    }
    if (t === "protocolo" || tp.indexOf("protocolo") >= 0) return "protocolos";
    if (t === "dataset" || tp.indexOf("dataset") >= 0 || tp.indexOf("datos") >= 0) return "datasets";
    if (t === "revista") return "revistas";
    if (t === "repositorio" || t === "informe" || tp.indexOf("informe") >= 0) return "repositorios";
    if (t === "evento") return "eventos";
    if (t === "diario") return "diarios";
    if (t === "libro" || t.indexOf("capitulo") >= 0 || t.indexOf("capítulo") >= 0) return "libros";
    if (tp.indexOf("libro") >= 0 || tp.indexOf("capitulo") >= 0 || tp.indexOf("capítulo") >= 0) return "libros";
    if (it && it.repositorio) return "repositorios";
    if (it && it.evento) return "eventos";
    if (it && it.revista_o_medio && !(it && it.doi)) return "diarios";
    if (it && it.doi) return "papers";
    return "otros";
  }

  function safeCatClass(c) {
    return String(c || "otros").replace(/[^a-z0-9_-]/gi, "");
  }

  function textoChip(categoria) {
    var keys = {
      papers: ["dyn.pub.chip.papers", "Paper / artículo"],
      documentos: ["dyn.pub.chip.documentos", "Documento de trabajo"],
      revistas: ["dyn.pub.chip.revistas", "Revista"],
      libros: ["dyn.pub.chip.libros", "Libro / capítulo"],
      repositorios: ["dyn.pub.chip.repositorios", "Informe técnico"],
      protocolos: ["dyn.pub.chip.protocolos", "Protocolo"],
      datasets: ["dyn.pub.chip.datasets", "Dataset"],
      eventos: ["dyn.pub.chip.eventos", "Evento científico"],
      diarios: ["dyn.pub.chip.diarios", "Medios"],
      otros: ["dyn.pub.chip.otros", "Publicación"]
    };
    var pair = keys[categoria] || keys.otros;
    return tt(pair[0], pair[1]);
  }

  function doiToUrl(d) {
    var x = String(d).trim();
    if (!x) return "";
    if (/^https?:\/\//i.test(x)) return x;
    return "https://doi.org/" + x.replace(/^doi:\s*/i, "");
  }

  function safeHref(url) {
    var u = String(url || "").trim();
    if (!u) return "#";
    if (/^https?:\/\//i.test(u)) return u;
    if (/^doi:/i.test(u)) return doiToUrl(u);
    if (/^10\.\d+/i.test(u)) return doiToUrl(u);
    // Rutas relativas del sitio (p. ej. assets/flayer-....pdf)
    if (/^[./a-z0-9_-]/i.test(u) && u.indexOf("://") < 0) return u;
    return "#";
  }

  function metaLinea(it, categoria) {
    var partes = [];
    if (it.autores) partes.push(it.autores);
    if (it.revista_o_medio) partes.push(it.revista_o_medio);
    if (it.evento && categoria === "eventos") partes.push(it.evento);
    if (it.lugar) partes.push(it.lugar);
    if (it.editorial) partes.push(it.editorial);
    return partes.join(" · ");
  }

  function enlaceItem(it) {
    var href = "";
    if (it.link) href = safeHref(it.link);
    else if (it.doi) href = doiToUrl(it.doi);
    var label = tt("dyn.pub.openLink", "Abrir enlace");
    if (/doi\.org/i.test(href)) label = tt("dyn.pub.viewDoi", "Ver DOI");
    else if (/\.pdf(\?|#|$)/i.test(href)) label = tt("dyn.pub.viewFlayer", "Ver flayer (PDF)");
    return { href: href, label: label };
  }

  function etiquetaUnidad(it) {
    return String((it && it.unidad) || "").trim();
  }

  function anioPublicacion(it) {
    if (!it) return "";
    var anio = String(it.anio || "").trim();
    if (/^\d{4}$/.test(anio)) return anio;
    var fecha = String(it.fecha || "").trim();
    var src = anio || fecha;
    if (!src) return "";
    var m = src.match(/\b(19|20)\d{2}\b/);
    return m ? m[0] : "";
  }

  function celdaUnidadAnioHTML(it) {
    var unidad = etiquetaUnidad(it);
    var tiempo = anioPublicacion(it);
    var html =
      '<div class="pub-row-when" aria-label="' +
      esc(tt("dyn.pub.ariaUnidad", "Unidad académica y año")) +
      '">';
    if (unidad) {
      html +=
        '<span class="pub-row-unidad" style="display:block;font-size:0.7rem;font-weight:700;color:#5c4f54;line-height:1.25;text-align:right;max-width:12rem;" title="' +
        esc(unidad) +
        '">' +
        esc(unidad) +
        "</span>";
    }
    html += '<span class="pub-row-year">' + esc(tiempo || "—") + "</span></div>";
    return html;
  }

  function filaCompactaHTML(it) {
    var categoria = categoriaItem(it);
    var chip =
      '<span class="pub-chip pub-chip--' +
      safeCatClass(categoria) +
      '">' +
      esc(textoChip(categoria)) +
      "</span>";
    var meta = metaLinea(it, categoria);
    var link = enlaceItem(it);
    var linkHtml =
      link.href && link.href !== "#"
        ? '<a class="pub-btn-link" href="' +
          esc(link.href) +
          '" target="_blank" rel="noopener noreferrer">' +
          esc(link.label) +
          "</a>"
        : '<span class="pub-row-nolink">' + esc(tt("dyn.pub.noLink", "Sin enlace")) + "</span>";

    return (
      '<article class="pub-row pub-row--' +
      safeCatClass(categoria) +
      '">' +
      '<div class="pub-row-type">' +
      chip +
      "</div>" +
      '<div class="pub-row-main">' +
      '<h3 class="pub-row-title">' +
      esc(it.titulo || tt("dyn.pub.noTitle", "Sin título")) +
      "</h3>" +
      (meta ? '<p class="pub-row-meta">' + esc(meta) + "</p>" : "") +
      "</div>" +
      celdaUnidadAnioHTML(it) +
      '<div class="pub-row-link">' +
      linkHtml +
      "</div>" +
      "</article>"
    );
  }

  function dibujarGrilla() {
    var grid = el("pub-grid");
    if (!grid) return;
    var list = aplicarFiltro(items);
    actualizarContador(list.length);

    if (!list.length) {
      var filtro = filtrosDef.filter(function (f) {
        return f.id === filtroActivo;
      })[0];
      var tituloFiltro = filtro ? filtroLabel(filtro) : "esta sección";
      var cuerpo;
      if (!items.length) {
        cuerpo =
          "<p><strong>" +
          esc(tt("dyn.pub.emptySoon", "Próximamente")) +
          "</strong></p>" +
          "<p>" +
          esc(
            tt(
              "dyn.pub.emptyBuilding",
              "Estamos incorporando las publicaciones del Observatorio de Inteligencia Artificial."
            )
          ) +
          "</p>";
      } else if (filtroActivo === "todas") {
        cuerpo = tt(
          "dyn.pub.emptyNone",
          "<p>No hay publicaciones para mostrar en este momento.</p><p>Volvé a consultar pronto.</p>"
        );
      } else {
        cuerpo = tt(
          "dyn.pub.emptyFilter",
          "<p>Todavía no hay publicaciones en <strong>{filter}</strong>.</p><p>Podés ver lo disponible en <strong>Ver todas</strong>.</p>",
          { filter: esc(tituloFiltro) }
        );
      }
      grid.innerHTML = "<div class=\"pub-msg pub-msg--hint\">" + cuerpo + "</div>";
      return;
    }

    var shown = list.slice(0, visibleLimit);
    var restantes = list.length - shown.length;

    var html =
      '<div class="pub-list" role="list">' +
      '<div class="pub-list-head" aria-hidden="true">' +
      "<span>" +
      esc(tt("dyn.pub.col.tipo", "Tipo")) +
      "</span><span>" +
      esc(tt("dyn.pub.col.titulo", "Título")) +
      "</span><span>" +
      esc(tt("dyn.pub.col.unidad", "Unidad · Año")) +
      "</span><span>" +
      esc(tt("dyn.pub.col.enlace", "Enlace")) +
      "</span>" +
      "</div>" +
      shown.map(filaCompactaHTML).join("") +
      "</div>";

    if (restantes > 0) {
      html +=
        '<div class="pub-more-wrap">' +
        '<button type="button" class="pub-more-btn" data-pub-more="1">' +
        esc(tt("dyn.pub.verMas", "Ver más ({n})", { n: restantes })) +
        "</button>" +
        "</div>";
    }

    grid.innerHTML = html;

    var moreBtn = grid.querySelector("[data-pub-more]");
    if (moreBtn) {
      moreBtn.addEventListener("click", function () {
        visibleLimit += PAGE_SIZE;
        dibujarGrilla();
      });
    }
  }

  function onLangChange() {
    dibujarIngresoEquipo();
    if (!hasLoaded && !items.length) {
      var status = el("pub-status");
      if (status && status.querySelector(".pub-msg--loading")) {
        status.innerHTML =
          "<div class=\"pub-msg pub-msg--loading\">" +
          esc(tt("dyn.pub.loading", "Cargando publicaciones…")) +
          "</div>";
      }
      return;
    }
    if (hasLoaded || items.length) {
      dibujarFiltros();
      dibujarGrilla();
    }
  }

  document.addEventListener("oia:langchange", onLangChange);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", cargar);
  } else {
    cargar();
  }
})();
