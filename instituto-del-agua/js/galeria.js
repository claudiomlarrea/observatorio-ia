(function () {
  var CFG = window.IDA_GALERIA || {};
  var albums = CFG.albums || [];
  var root = document.getElementById("galeria-albums");
  if (!root || !albums.length) return;

  var lightbox = null;
  var lightboxImg = null;
  var currentList = [];
  var currentIndex = 0;

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
    var photo = currentList[currentIndex];
    lightboxImg.src = photo.src;
    lightboxImg.alt = photo.alt || "";
    lightbox.hidden = false;
    document.body.classList.add("gallery-lightbox-open");
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.hidden = true;
    lightboxImg.removeAttribute("src");
    lightboxImg.alt = "";
    document.body.classList.remove("gallery-lightbox-open");
  }

  function fillGrid(grid, photos) {
    if (grid.dataset.filled === "1") return;
    photos.forEach(function (photo, i) {
      var item = document.createElement("button");
      item.type = "button";
      item.className = "gallery-item";
      item.setAttribute("role", "listitem");
      item.setAttribute(
        "aria-label",
        photo.alt || "Ver foto " + (i + 1) + " de " + photos.length
      );

      var img = document.createElement("img");
      img.src = photo.src;
      img.alt = photo.alt || "";
      img.loading = "lazy";
      img.decoding = "async";
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

  function renderAlbum(album, openByDefault) {
    var photos = album.photos || [];
    var panelId = "galeria-panel-" + album.id;
    var titleId = "galeria-" + album.id;

    var article = document.createElement("article");
    article.className = "gallery-event" + (openByDefault ? " is-open" : "");

    var toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "gallery-toggle";
    toggle.id = titleId;
    toggle.setAttribute("aria-controls", panelId);
    toggle.setAttribute("aria-expanded", openByDefault ? "true" : "false");
    toggle.innerHTML =
      '<span class="gallery-toggle-text">' +
      '<span class="gallery-toggle-title"></span>' +
      '<span class="gallery-toggle-meta"></span>' +
      "</span>" +
      '<span class="gallery-toggle-chevron" aria-hidden="true"></span>';
    toggle.querySelector(".gallery-toggle-title").textContent = album.title;
    toggle.querySelector(".gallery-toggle-meta").textContent =
      photos.length + (photos.length === 1 ? " imagen" : " imágenes");

    var panel = document.createElement("div");
    panel.className = "gallery-panel";
    panel.id = panelId;
    panel.hidden = !openByDefault;

    if (album.description) {
      var desc = document.createElement("p");
      desc.className = "gallery-panel-desc";
      desc.textContent = album.description;
      panel.appendChild(desc);
    }

    var grid = document.createElement("div");
    grid.className = "gallery-grid";
    grid.setAttribute("role", "list");
    panel.appendChild(grid);

    toggle.addEventListener("click", function () {
      var open = !article.classList.contains("is-open");
      setOpen(article, toggle, panel, open);
      if (open) fillGrid(grid, photos);
    });

    article.appendChild(toggle);
    article.appendChild(panel);
    root.appendChild(article);

    if (openByDefault) fillGrid(grid, photos);
  }

  albums.forEach(function (album, i) {
    renderAlbum(album, i === 0);
  });
})();
