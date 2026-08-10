(function () {
  var CFG = window.OBS_GALERIA || {};
  var albums = CFG.albums || [];
  var root = document.getElementById("galeria-albums");
  if (!root || !albums.length) return;

  var lightbox = null;
  var lightboxImg = null;
  var currentList = [];
  var currentIndex = 0;

  function thumbUrl(id, size) {
    return (
      "https://lh3.googleusercontent.com/d/" +
      encodeURIComponent(id) +
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

  albums.forEach(function (album) {
    root.appendChild(renderAlbum(album));
  });
})();
