(function () {
  var CFG = window.OBS_GALERIA || {};
  var localAlbums = CFG.albums || [];
  var root = document.getElementById("galeria-albums");
  if (!root) return;

  var lightbox = null;
  var lightboxImg = null;
  var currentList = [];
  var currentIndex = 0;

  function tt(key, fallback) {
    if (window.I18N && typeof window.I18N.t === "function") {
      var v = window.I18N.t(key);
      if (v && v !== key) return v;
    }
    return fallback;
  }

  function esc(s) {
    var d = document.createElement("div");
    d.textContent = s == null ? "" : String(s);
    return d.innerHTML;
  }

  function appsUrl() {
    var fromGal = CFG.APPS_SCRIPT_URL && String(CFG.APPS_SCRIPT_URL).trim();
    if (fromGal) return fromGal;
    var pub = window.OBS_PUBLICACIONES || {};
    return (pub.APPS_SCRIPT_URL && String(pub.APPS_SCRIPT_URL).trim()) || "";
  }

  function adminUrl() {
    var base = appsUrl();
    if (!base) return "";
    return base + (base.indexOf("?") >= 0 ? "&" : "?") + "action=galeria_admin";
  }

  function dibujarIngresoEquipo() {
    var box = document.getElementById("galeria-team-entry");
    if (!box) return;
    var url = adminUrl();
    if (!url) {
      box.innerHTML = "";
      return;
    }
    box.innerHTML =
      '<p class="pub-intro" style="margin-top:0">' +
      '<a class="btn btn-ghost" href="' +
      esc(url) +
      '" target="_blank" rel="noopener noreferrer">' +
      tt("dyn.galeria.teamEntry", "Ingreso equipo · Cargar álbum") +
      "</a> " +
      "<small>" +
      tt("dyn.galeria.teamHint", "(iniciá sesión en Google con un correo autorizado)") +
      "</small></p>";
  }

  function isLocalOrHttp(photo) {
    var s = String(photo || "");
    return (
      /^(https?:\/\/|\/|\.\/|assets\/)/i.test(s) ||
      /\.(jpe?g|png|webp|gif)(\?|#|$)/i.test(s)
    );
  }

  function thumbUrl(photo, size) {
    if (isLocalOrHttp(photo)) return String(photo);
    return (
      "https://lh3.googleusercontent.com/d/" +
      encodeURIComponent(String(photo)) +
      "=w" +
      (size || 640)
    );
  }

  function ensureLightbox() {
    if (lightbox) return;
    lightbox = document.createElement("div");
    lightbox.className = "gallery-lightbox";
    lightbox.hidden = true;
    lightbox.setAttribute("role", "dialog");
    lightbox.setAttribute("aria-modal", "true");
    lightbox.setAttribute("aria-label", "Vista ampliada de la foto");
    lightbox.innerHTML =
      '<button type="button" class="gallery-lightbox-close" aria-label="Cerrar">×</button>' +
      '<button type="button" class="gallery-lightbox-nav gallery-lightbox-prev" aria-label="Foto anterior">‹</button>' +
      '<img class="gallery-lightbox-img" alt="" />' +
      '<button type="button" class="gallery-lightbox-nav gallery-lightbox-next" aria-label="Foto siguiente">›</button>';
    document.body.appendChild(lightbox);
    lightboxImg = lightbox.querySelector(".gallery-lightbox-img");

    lightbox.querySelector(".gallery-lightbox-close").addEventListener("click", closeLightbox);
    lightbox.querySelector(".gallery-lightbox-prev").addEventListener("click", function (e) {
      e.stopPropagation();
      showAt(currentIndex - 1);
    });
    lightbox.querySelector(".gallery-lightbox-next").addEventListener("click", function (e) {
      e.stopPropagation();
      showAt(currentIndex + 1);
    });
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox) closeLightbox();
    });
    document.addEventListener("keydown", function (e) {
      if (lightbox.hidden) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") showAt(currentIndex - 1);
      if (e.key === "ArrowRight") showAt(currentIndex + 1);
    });
  }

  function showAt(index) {
    if (!currentList.length) return;
    currentIndex = (index + currentList.length) % currentList.length;
    ensureLightbox();
    lightboxImg.src = thumbUrl(currentList[currentIndex], 1600);
    lightbox.hidden = false;
    document.body.classList.add("gallery-lightbox-open");
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.hidden = true;
    lightboxImg.removeAttribute("src");
    document.body.classList.remove("gallery-lightbox-open");
  }

  function fillGrid(grid, photos) {
    if (grid.dataset.filled === "1") return;
    photos.forEach(function (id, i) {
      var item = document.createElement("button");
      item.type = "button";
      item.className = "gallery-item";
      item.setAttribute("role", "listitem");
      item.setAttribute(
        "aria-label",
        "Ver foto " + (i + 1) + " de " + photos.length
      );

      var img = document.createElement("img");
      img.src = thumbUrl(id, 480);
      img.alt = "";
      img.loading = "lazy";
      img.decoding = "async";
      img.referrerPolicy = "no-referrer";
      item.appendChild(img);

      item.addEventListener("click", function () {
        currentList = photos;
        showAt(i);
      });

      grid.appendChild(item);
    });
    grid.dataset.filled = "1";
  }

  function setOpen(article, toggle, panel, open) {
    article.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    panel.hidden = !open;
  }

  function renderAlbum(album) {
    var photos = album.photos || [];
    var panelId = "galeria-panel-" + album.id;
    var titleId = "galeria-" + album.id;

    var article = document.createElement("article");
    article.className = "gallery-event";

    var toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "gallery-toggle";
    toggle.id = titleId;
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", panelId);

    var titleWrap = document.createElement("span");
    titleWrap.className = "gallery-toggle-text";

    var title = document.createElement("span");
    title.className = "gallery-toggle-title";
    title.textContent = album.title || "";
    titleWrap.appendChild(title);

    if (photos.length) {
      var meta = document.createElement("span");
      meta.className = "gallery-toggle-meta";
      meta.textContent = photos.length + " fotos";
      titleWrap.appendChild(meta);
    }

    var chevron = document.createElement("span");
    chevron.className = "gallery-toggle-chevron";
    chevron.setAttribute("aria-hidden", "true");

    toggle.appendChild(titleWrap);
    toggle.appendChild(chevron);

    var panel = document.createElement("div");
    panel.className = "gallery-panel";
    panel.id = panelId;
    panel.hidden = true;
    panel.setAttribute("role", "region");
    panel.setAttribute("aria-labelledby", titleId);

    if (album.description) {
      var p = document.createElement("p");
      p.className = "gallery-panel-desc";
      p.textContent = album.description;
      panel.appendChild(p);
    }

    var scroll = document.createElement("div");
    scroll.className = "gallery-scroll";

    var grid = document.createElement("div");
    grid.className = "gallery-grid";
    grid.setAttribute("role", "list");
    scroll.appendChild(grid);
    panel.appendChild(scroll);

    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") !== "true";
      if (open) fillGrid(grid, photos);
      setOpen(article, toggle, panel, open);
    });

    article.appendChild(toggle);
    article.appendChild(panel);
    return article;
  }

  function mergeAlbums(remote) {
    var seen = {};
    var out = [];
    (remote || []).forEach(function (a) {
      if (!a || !a.id) return;
      seen[a.id] = true;
      out.push(a);
    });
    localAlbums.forEach(function (a) {
      if (!a || !a.id || seen[a.id]) return;
      out.push(a);
    });
    return out;
  }

  function renderAll(list) {
    root.innerHTML = "";
    if (!list.length) {
      root.innerHTML =
        '<p class="visitas-empty">' +
        tt(
          "dyn.galeria.empty",
          "Todavía no hay álbumes publicados. El equipo puede cargar eventos desde el ingreso autorizado."
        ) +
        "</p>";
      return;
    }
    list.forEach(function (album) {
      root.appendChild(renderAlbum(album));
    });
  }

  function fetchJson(url) {
    return fetch(url, { method: "GET" }).then(function (r) {
      if (!r.ok) throw new Error("network");
      return r.json();
    });
  }

  function fetchJsonp(url) {
    return new Promise(function (resolve, reject) {
      var name = "_obsGalCb_" + Math.floor(Math.random() * 1e9);
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

  function cargarRemotos() {
    var base = appsUrl();
    if (!base) {
      renderAll(localAlbums.slice());
      return;
    }
    var url =
      base +
      (base.indexOf("?") >= 0 ? "&" : "?") +
      "action=galeria&_=" +
      Date.now();
    fetchJson(url)
      .then(function (data) {
        if (!data || !data.ok || !Array.isArray(data.albums)) throw new Error("format");
        renderAll(mergeAlbums(data.albums));
      })
      .catch(function () {
        return fetchJsonp(url).then(
          function (data) {
            if (!data || !data.ok || !Array.isArray(data.albums)) throw new Error("format");
            renderAll(mergeAlbums(data.albums));
          },
          function () {
            renderAll(localAlbums.slice());
          }
        );
      });
  }

  dibujarIngresoEquipo();
  renderAll(localAlbums.slice());
  cargarRemotos();

  document.addEventListener("oia:langchange", function () {
    dibujarIngresoEquipo();
  });
})();
