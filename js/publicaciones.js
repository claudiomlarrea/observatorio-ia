(function () {
  var CFG = window.OBS_PUBLICACIONES || {};

  function el(id) {
    return document.getElementById(id);
  }

  function adminUrl() {
    if (CFG.ADMIN_URL && String(CFG.ADMIN_URL).trim()) return String(CFG.ADMIN_URL).trim();
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
      "\" target=\"_blank\" rel=\"noopener noreferrer\">Ingreso equipo · Cargar publicaciones</a> " +
      "<small>(solo miembros autorizados)</small></p>";
  }

  function esc(s) {
    var d = document.createElement("div");
    d.textContent = s == null ? "" : String(s);
    return d.innerHTML;
  }

  var filtrosDef = [
    { id: "todas", label: "Ver todas", icono: "✨" },
    { id: "revistas", label: "Revistas", icono: "📑" },
    { id: "libros", label: "Libros y capítulos", icono: "📚" },
    { id: "repositorios", label: "Informes", icono: "🗂️" },
    { id: "eventos", label: "Reuniones / eventos", icono: "🎓" },
    { id: "diarios", label: "Medios / diarios", icono: "📰" }
  ];

  var items = [];
  var filtroActivo = "todas";

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
      status.innerHTML =
        "<div class=\"pub-msg pub-msg--hint\">Las publicaciones se mostrarán aquí cuando conectés la aplicación web (Google Apps Script). " +
        "Pasos en el archivo <strong>INSTRUCCIONES.txt</strong>.</div>";
      return;
    }

    status.innerHTML = "<div class=\"pub-msg pub-msg--loading\">Cargando publicaciones…</div>";

    fetchJson(url).then(
      function (data) {
        if (!data || !data.ok || !Array.isArray(data.items)) throw new Error("format");
        items = data.items;
        var cw = el("pub-count-wrap");
        if (cw) cw.hidden = false;
        renderTodo();
      },
      function () {
        return fetchJsonp(url).then(
          function (data) {
            if (!data || !data.ok || !Array.isArray(data.items)) throw new Error("format");
            items = data.items;
            var cw2 = el("pub-count-wrap");
            if (cw2) cw2.hidden = false;
            renderTodo();
          },
          function () {
            status.innerHTML =
              "<div class=\"pub-msg pub-msg--error\">No se pudo conectar al servicio de publicaciones. Revisá la URL en " +
              "<code>publicaciones-config.js</code> y volvé a cargar esta página (<kbd>⌘⇧R</kbd>).</div>";
          }
        );
      }
    );
  }

  function renderTodo() {
    el("pub-status").innerHTML = "";
    dibujarFiltros();
    dibujarGrilla();
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
          esc(f.label) +
          "</button>"
        );
      })
      .join("");

    root.querySelectorAll(".pub-filter").forEach(function (btn) {
      btn.addEventListener("click", function () {
        filtroActivo = btn.getAttribute("data-filtro");
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
    if (c) return c;

    var t = String((it && it.tipo_origen) || "").toLowerCase().trim();
    var tp = String((it && it.tipo_publicacion) || "").toLowerCase().trim();

    if (t === "revista") return "revistas";
    if (t === "repositorio") return "repositorios";
    if (t === "evento") return "eventos";
    if (t === "diario") return "diarios";
    if (t === "libro" || t.indexOf("capitulo") >= 0 || t.indexOf("capítulo") >= 0) return "libros";
    if (tp.indexOf("libro") >= 0 || tp.indexOf("capitulo") >= 0 || tp.indexOf("capítulo") >= 0) return "libros";
    if (it && it.repositorio) return "repositorios";
    if (it && it.evento) return "eventos";
    if (it && it.revista_o_medio && !(it && it.doi)) return "diarios";
    return "otros";
  }

  function safeCatClass(c) {
    return String(c || "otros").replace(/[^a-z0-9_-]/gi, "");
  }

  function tarjetaHTML(it, idx) {
    var categoria = categoriaItem(it);
    var badges =
      '<span class="pub-chip pub-chip--' +
      safeCatClass(categoria) +
      '">' +
      esc(textoChip(categoria)) +
      "</span>";

    var bloques = [];

    bloques.push("<h3 class=\"pub-card-title\">" + esc(it.titulo || "Sin título") + "</h3>");

    if (it.autores) bloques.push("<p class=\"pub-meta\"><strong>Autor/es:</strong> " + esc(it.autores) + "</p>");

    if (it.revista_o_medio) {
      var lab = /^diarios$/i.test(categoria || "") ? "Medio" : /^eventos$/i.test(categoria || "") ? "Contexto" : "Revista / medio";
      bloques.push("<p class=\"pub-meta\"><strong>" + lab + ":</strong> " + esc(it.revista_o_medio) + "</p>");
    }

    if (it.editorial || it.isbn) {
      bloques.push(
        "<p class=\"pub-meta\"><strong>Editorial / ISBN:</strong> " +
          esc([it.editorial, it.isbn].filter(Boolean).join(" · ")) +
          "</p>"
      );
    }

    if (it.doi) bloques.push("<p class=\"pub-meta\"><strong>DOI:</strong> " + esc(it.doi) + "</p>");
    if (it.indexacion) bloques.push("<p class=\"pub-meta\"><strong>Indexación:</strong> " + esc(it.indexacion) + "</p>");
    if (it.repositorio) bloques.push("<p class=\"pub-meta\"><strong>Repositorio:</strong> " + esc(it.repositorio) + "</p>");
    if (it.evento)
      bloques.push("<p class=\"pub-meta\"><strong>Evento:</strong> " + esc(it.evento) + "</p>");
    if (it.lugar) bloques.push("<p class=\"pub-meta\"><strong>Lugar:</strong> " + esc(it.lugar) + "</p>");

    var tiempo = "";
    if (it.fecha) tiempo = esc(it.fecha);
    else if (it.anio) tiempo = esc(it.anio);

    var primaryHref = "";
    if (it.link) primaryHref = safeHref(it.link);
    else if (it.doi) primaryHref = doiToUrl(it.doi);
    var btnLabel = /doi\.org/i.test(primaryHref) ? "Ver DOI / artículo" : "Abrir enlace";

    var filaInferior =
      '<div class="pub-card-foot">' +
      (tiempo ? '<span class="pub-tag-año">' + tiempo + "</span>" : "") +
      (primaryHref && primaryHref !== "#"
        ? '<a class="pub-btn-more" href="' +
          esc(primaryHref) +
          "\" target=\"_blank\" rel=\"noopener noreferrer\">" +
          esc(btnLabel) +
          "</a>"
        : "") +
      "</div>";

    if (it.resumen)
      bloques.push("<blockquote class=\"pub-resumen\"><strong>Nota:</strong> " + esc(it.resumen) + "</blockquote>");

    bloques.push(filaInferior);

    return (
      "<article class=\"pub-card\" style=\"--enter-delay:" +
      idx * 0.04 +
      "s\"><div class=\"pub-card-tags\">" +
      badges +
      "</div>" +
      bloques.join("") +
      "</article>"
    );
  }

  function textoChip(categoria) {
    var m = {
      revistas: "Revista",
      libros: "Libro / capítulo",
      repositorios: "Repositorio",
      eventos: "Evento científico",
      diarios: "Medios",
      otros: "Publicación"
    };
    return m[categoria] || m.otros;
  }

  function doiToUrl(d) {
    var x = String(d).trim();
    if (!x) return "";
    if (/^https?:\/\//i.test(x)) return x;
    return "https://doi.org/" + x.replace(/^doi:\s*/i, "");
  }

  function safeHref(url) {
    var u = String(url).trim();
    if (/^https?:\/\//i.test(u)) return u;
    if (/^doi:/i.test(u)) return doiToUrl(u);
    if (/^10\.\d+/i.test(u)) return doiToUrl(u);
    return u || "#";
  }

  function dibujarGrilla() {
    var grid = el("pub-grid");
    if (!grid) return;
    var list = aplicarFiltro(items);
    el("pub-count").textContent = String(list.length);

    if (!list.length) {
      grid.innerHTML =
        "<div class=\"pub-msg\">No hay registros para mostrar en este filtro. En Google Sheets cargá filas con " +
        "'Unidad' = <strong>OIA- Observatorio de Inteligencia Artificial</strong> para que entren aquí.</div>";
      return;
    }

    grid.innerHTML = list.map(tarjetaHTML).join("");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", cargar);
  } else {
    cargar();
  }
})();
