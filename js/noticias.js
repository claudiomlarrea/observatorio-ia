(function () {
  var CFG = window.OBS_NOTICIAS || {};
  var PUB_CFG = window.OBS_PUBLICACIONES || {};

  function el(id) {
    return document.getElementById(id);
  }

  function esc(s) {
    var d = document.createElement("div");
    d.textContent = s == null ? "" : String(s);
    return d.innerHTML;
  }

  function stripHtml(html) {
    return String(html || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizar(texto) {
    return String(texto || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  function esRelevante(texto) {
    var t = normalizar(texto);
    if (!t) return false;
    if (t.indexOf("observatorio de inteligencia artificial") >= 0) return true;
    if (t.indexOf("observatorio de ia") >= 0) return true;
    if (t.indexOf("observatorio de i.a") >= 0) return true;
    if (t.indexOf("oia de la uccuyo") >= 0) return true;
    if (t.indexOf("oia uccuyo") >= 0) return true;
    if (t.indexOf("observatorio") >= 0 && t.indexOf("inteligencia artificial") >= 0) return true;
    if (t.indexOf("observatorio") >= 0 && t.indexOf("uccuyo") >= 0 && /\bia\b/.test(t)) return true;
    return false;
  }

  function normalizarUrl(url) {
    return String(url || "")
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "")
      .replace(/\?.*$/, "")
      .trim();
  }

  function parseFecha(raw) {
    if (!raw) return 0;
    var s = String(raw).trim();
    if (/^\d{4}$/.test(s)) return parseInt(s, 10) * 10000;
    var t = Date.parse(s);
    return isNaN(t) ? 0 : t;
  }

  function formatearFecha(raw) {
    var t = parseFecha(raw);
    if (!t) return String(raw || "");
    try {
      return new Intl.DateTimeFormat("es-AR", {
        day: "numeric",
        month: "long",
        year: "numeric"
      }).format(new Date(t));
    } catch (_e) {
      return String(raw || "");
    }
  }

  function fechaIso(raw) {
    var t = parseFecha(raw);
    if (!t) return "";
    try {
      return new Date(t).toISOString().slice(0, 10);
    } catch (_e) {
      return "";
    }
  }

  function fetchJson(url) {
    return fetch(url, { method: "GET" }).then(function (r) {
      if (!r.ok) throw new Error("network");
      return r.json();
    });
  }

  function fetchJsonp(url) {
    return new Promise(function (resolve, reject) {
      var name = "_obsNewsCb_" + Math.floor(Math.random() * 1e9);
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
    });
  }

  function fetchNoticiasApi() {
    var base = PUB_CFG.APPS_SCRIPT_URL;
    if (!base || !String(base).trim()) return Promise.resolve({ items: [] });
    var url = String(base).trim() + (base.indexOf("?") >= 0 ? "&" : "?") + "action=noticias";
    return fetchJson(url).catch(function () {
      return fetchJsonp(url);
    });
  }

  function fetchUccuyoNoticias() {
    var api = CFG.UCCUYO_API || "https://noticias.uccuyo.edu.ar/wp-json/wp/v2/posts";
    var busquedas = CFG.BUSQUEDAS || ["observatorio inteligencia artificial"];
    var perPage = CFG.PER_PAGE || 20;
    var seen = {};
    var out = [];

    return Promise.all(
      busquedas.map(function (q) {
        var url =
          api +
          "?search=" +
          encodeURIComponent(q) +
          "&per_page=" +
          perPage +
          "&_fields=id,date,link,title,excerpt";
        return fetchJson(url).catch(function () {
          return [];
        });
      })
    ).then(function (grupos) {
      grupos.forEach(function (posts) {
        if (!posts || !posts.length) return;
        posts.forEach(function (post) {
          var id = "uccuyo-" + post.id;
          if (seen[id]) return;
          var titulo = stripHtml(post.title && post.title.rendered);
          var excerpt = stripHtml(post.excerpt && post.excerpt.rendered);
          if (!esRelevante(titulo + " " + excerpt)) return;
          seen[id] = true;
          out.push({
            id: id,
            fuente: "Noticias UCCuyo",
            medio: "noticias.uccuyo.edu.ar",
            titulo: titulo,
            link: post.link,
            fecha: post.date,
            excerpt: excerpt,
            origen: "uccuyo_noticias"
          });
        });
      });
      return out;
    });
  }

  function dedupeItems(items) {
    var seen = {};
    var out = [];
    items.forEach(function (it) {
      var key = normalizarUrl(it.link || it.id || "");
      if (!key || seen[key]) return;
      seen[key] = true;
      out.push(it);
    });
    return out;
  }

  function ordenarItems(items) {
    return items.slice().sort(function (a, b) {
      return parseFecha(b.fecha) - parseFecha(a.fecha);
    });
  }

  function linkLabel(item) {
    if (item.origen === "uccuyo_noticias") return "Leer en noticias.uccuyo.edu.ar";
    if (item.origen === "google_news") return "Leer en el medio";
    if (item.origen === "boletin") return "Ver boletín";
    return "Ver nota";
  }

  function chipClass(fuente) {
    var f = normalizar(fuente);
    if (f.indexOf("uccuyo") >= 0) return "news-chip--uccuyo";
    if (f.indexOf("boletin") >= 0) return "news-chip--boletin";
    if (f.indexOf("diario") >= 0) return "news-chip--diario";
    return "news-chip--medio";
  }

  function renderItem(item) {
    var iso = fechaIso(item.fecha);
    var meta =
      (iso ? '<time datetime="' + esc(iso) + '">' + esc(formatearFecha(item.fecha)) + "</time>" : "") +
      ' · <span class="news-chip ' +
      chipClass(item.fuente) +
      '">' +
      esc(item.fuente) +
      "</span>";
    if (item.medio && item.medio !== item.fuente) {
      meta += " · " + esc(item.medio);
    }
    var excerpt = item.excerpt ? '<p class="news-card-excerpt">' + esc(item.excerpt) + "</p>" : "";
    return (
      '<li><article class="news-card">' +
      '<p class="news-card-meta">' +
      meta +
      "</p>" +
      '<h3 class="news-card-title"><a href="' +
      esc(item.link) +
      '" target="_blank" rel="noopener noreferrer">' +
      esc(item.titulo) +
      "</a></h3>" +
      excerpt +
      '<p class="news-card-foot"><a class="news-card-link" href="' +
      esc(item.link) +
      '" target="_blank" rel="noopener noreferrer">' +
      esc(linkLabel(item)) +
      "</a></p>" +
      "</article></li>"
    );
  }

  var todos = [];
  var filtroTexto = "";

  function filtrarItems(items) {
    var q = normalizar(filtroTexto);
    if (!q) return items;
    return items.filter(function (it) {
      var blob = normalizar(
        (it.titulo || "") + " " + (it.excerpt || "") + " " + (it.medio || "") + " " + (it.fuente || "")
      );
      return blob.indexOf(q) >= 0;
    });
  }

  function pintarLista() {
    var lista = el("news-list");
    var count = el("news-count");
    var status = el("news-status");
    if (!lista) return;

    var visibles = filtrarItems(todos);
    if (count) {
      count.textContent = String(visibles.length);
    }
    var countWrap = el("news-count-wrap");
    if (countWrap) countWrap.hidden = !todos.length;

    if (!visibles.length) {
      lista.innerHTML = "";
      if (status) {
        status.className = "news-status news-status--empty";
        status.textContent = filtroTexto
          ? "No hay resultados para esa búsqueda."
          : "No se encontraron noticias por ahora. La búsqueda se actualiza al cargar la página.";
      }
      return;
    }

    if (status) {
      status.className = "news-status news-status--ok";
      status.textContent =
        "Mostrando " +
        visibles.length +
        " resultado" +
        (visibles.length === 1 ? "" : "s") +
        " sobre el Observatorio (noticias UCCuyo, boletines, diarios y medios registrados).";
    }
    lista.innerHTML = visibles.map(renderItem).join("");
  }

  function cargar() {
    var status = el("news-status");
    if (status) {
      status.className = "news-status news-status--loading";
      status.textContent = "Buscando noticias, boletines y menciones en medios…";
    }

    Promise.all([
      fetchUccuyoNoticias(),
      fetchNoticiasApi().then(function (data) {
        return (data && data.items) || [];
      })
    ])
      .then(function (partes) {
        todos = ordenarItems(dedupeItems(partes[0].concat(partes[1])));
        pintarLista();
      })
      .catch(function () {
        if (status) {
          status.className = "news-status news-status--error";
          status.textContent =
            "No se pudieron cargar las noticias. Probá recargar la página en unos minutos.";
        }
      });
  }

  function init() {
    var input = el("news-q");
    if (input) {
      input.addEventListener("input", function () {
        filtroTexto = input.value.trim();
        pintarLista();
      });
    }
    cargar();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
