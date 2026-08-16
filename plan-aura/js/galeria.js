(function () {
  var CFG = window.IDA_GALERIA || {};
  var albums = CFG.albums || [];
  var root = document.getElementById("galeria-albums");
  if (!root || !albums.length) return;

  var lightbox = null;
  var lightboxImg = null;
  var lightboxVideo = null;
  var currentList = [];
  var currentIndex = 0;
  var openIds = {};

  function tt(key, fallback) {
    if (window.I18N && typeof window.I18N.t === "function") {
      var v = window.I18N.t(key);
      if (v && v !== key) return v;
    }
    return fallback;
  }

  function albumTitle(album) {
    if (album.titleKey) return tt(album.titleKey, album.title || "");
    return album.title || "";
  }

  function albumDescription(album) {
    if (album.descriptionKey) return tt(album.descriptionKey, album.description || "");
    return album.description || "";
  }

  function photoAlt(photo) {
    if (photo && photo.altKey) return tt(photo.altKey, photo.alt || "");
    return (photo && photo.alt) || "";
  }

  function isVideo(item) {
    return item && (item.type === "video" || /\.mp4($|\?)/i.test(item.src || ""));
  }

  function ensureLightbox() {
    if (lightbox) {
      lightbox.setAttribute("aria-label", tt("sec.galeria.lightbox.label", "Vista ampliada"));
      var closeBtn = lightbox.querySelector(".gallery-lightbox-close");
      var prevBtn = lightbox.querySelector(".gallery-lightbox-prev");
      var nextBtn = lightbox.querySelector(".gallery-lightbox-next");
      if (closeBtn) closeBtn.setAttribute("aria-label", tt("sec.galeria.lightbox.close", "Cerrar"));
      if (prevBtn) prevBtn.setAttribute("aria-label", tt("sec.galeria.lightbox.prev", "Anterior"));
      if (nextBtn) nextBtn.setAttribute("aria-label", tt("sec.galeria.lightbox.next", "Siguiente"));
      return;
    }
    lightbox = document.createElement("div");
    lightbox.className = "gallery-lightbox";
    lightbox.hidden = true;
    lightbox.setAttribute("role", "dialog");
    lightbox.setAttribute("aria-modal", "true");
    lightbox.setAttribute("aria-label", tt("sec.galeria.lightbox.label", "Vista ampliada"));
    lightbox.innerHTML =
      '<button type="button" class="gallery-lightbox-close" aria-label="' +
      tt("sec.galeria.lightbox.close", "Cerrar") +
      '">×</button>' +
      '<button type="button" class="gallery-lightbox-nav gallery-lightbox-prev" aria-label="' +
      tt("sec.galeria.lightbox.prev", "Anterior") +
      '">‹</button>' +
      '<img class="gallery-lightbox-img" alt="" />' +
      '<video class="gallery-lightbox-video" controls playsinline></video>' +
      '<button type="button" class="gallery-lightbox-nav gallery-lightbox-next" aria-label="' +
      tt("sec.galeria.lightbox.next", "Siguiente") +
      '">›</button>';
    document.body.appendChild(lightbox);
    lightboxImg = lightbox.querySelector(".gallery-lightbox-img");
    lightboxVideo = lightbox.querySelector(".gallery-lightbox-video");

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

  function stopVideo() {
    if (!lightboxVideo) return;
    lightboxVideo.pause();
    lightboxVideo.removeAttribute("src");
    lightboxVideo.load();
    lightboxVideo.hidden = true;
  }

  function showAt(index) {
    if (!currentList.length) return;
    currentIndex = (index + currentList.length) % currentList.length;
    ensureLightbox();
    var item = currentList[currentIndex];
    stopVideo();
    if (isVideo(item)) {
      lightboxImg.hidden = true;
      lightboxImg.removeAttribute("src");
      lightboxVideo.hidden = false;
      if (item.poster) lightboxVideo.setAttribute("poster", item.poster);
      else lightboxVideo.removeAttribute("poster");
      lightboxVideo.src = item.src;
      lightboxVideo.play().catch(function () {});
    } else {
      lightboxImg.hidden = false;
      lightboxImg.src = item.src;
      lightboxImg.alt = photoAlt(item);
    }
    lightbox.hidden = false;
    document.body.classList.add("gallery-lightbox-open");
  }

  function closeLightbox() {
    if (!lightbox) return;
    stopVideo();
    lightbox.hidden = true;
    lightboxImg.hidden = false;
    lightboxImg.removeAttribute("src");
    lightboxImg.alt = "";
    document.body.classList.remove("gallery-lightbox-open");
  }

  function fillGrid(grid, photos) {
    grid.innerHTML = "";
    photos.forEach(function (photo, i) {
      var item = document.createElement("button");
      item.type = "button";
      item.className = "gallery-item" + (isVideo(photo) ? " gallery-item--video" : "");
      item.setAttribute("role", "listitem");
      var viewKey = isVideo(photo) ? "sec.galeria.viewVideo" : "sec.galeria.viewPhoto";
      var viewFallback = isVideo(photo) ? "Ver video" : "Ver foto";
      item.setAttribute(
        "aria-label",
        photoAlt(photo) ||
          tt(viewKey, viewFallback) +
            " " +
            (i + 1) +
            tt("sec.galeria.of", " de ") +
            photos.length
      );

      var img = document.createElement("img");
      img.src = isVideo(photo) ? photo.poster || photo.src : photo.src;
      img.alt = photoAlt(photo);
      img.loading = "lazy";
      img.decoding = "async";
      item.appendChild(img);

      if (isVideo(photo)) {
        var badge = document.createElement("span");
        badge.className = "gallery-video-badge";
        badge.setAttribute("aria-hidden", "true");
        badge.textContent = tt("sec.galeria.videoBadge", "▶ Video");
        item.appendChild(badge);
      }

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

  function metaText(photos) {
    var videos = photos.filter(isVideo).length;
    var images = photos.length - videos;
    var metaParts = [];
    if (images) {
      metaParts.push(
        images +
          (images === 1
            ? tt("sec.galeria.imageSingular", " imagen")
            : tt("sec.galeria.imagePlural", " imágenes"))
      );
    }
    if (videos) {
      metaParts.push(
        videos +
          (videos === 1
            ? tt("sec.galeria.videoSingular", " video")
            : tt("sec.galeria.videoPlural", " videos"))
      );
    }
    return metaParts.join(" · ");
  }

  function renderAlbum(album, openByDefault) {
    var photos = album.photos || [];
    var panelId = "galeria-panel-" + album.id;
    var titleId = "galeria-" + album.id;

    var article = document.createElement("article");
    article.className = "gallery-event" + (openByDefault ? " is-open" : "");
    article.dataset.albumId = album.id;

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
    toggle.querySelector(".gallery-toggle-title").textContent = albumTitle(album);
    toggle.querySelector(".gallery-toggle-meta").textContent = metaText(photos);

    var panel = document.createElement("div");
    panel.className = "gallery-panel";
    panel.id = panelId;
    panel.hidden = !openByDefault;

    if (albumDescription(album)) {
      var desc = document.createElement("p");
      desc.className = "gallery-panel-desc";
      desc.textContent = albumDescription(album);
      panel.appendChild(desc);
    }

    var grid = document.createElement("div");
    grid.className = "gallery-grid";
    grid.setAttribute("role", "list");
    panel.appendChild(grid);

    toggle.addEventListener("click", function () {
      var open = !article.classList.contains("is-open");
      setOpen(article, toggle, panel, open);
      openIds[album.id] = open;
      if (open) fillGrid(grid, photos);
    });

    article.appendChild(toggle);
    article.appendChild(panel);
    root.appendChild(article);

    if (openByDefault) {
      openIds[album.id] = true;
      fillGrid(grid, photos);
    }
  }

  function renderAll() {
    var previouslyOpen = {};
    Object.keys(openIds).forEach(function (id) {
      previouslyOpen[id] = openIds[id];
    });
    root.innerHTML = "";
    albums.forEach(function (album, i) {
      var open =
        previouslyOpen[album.id] != null ? !!previouslyOpen[album.id] : i === 0;
      renderAlbum(album, open);
    });
    ensureLightbox();
  }

  renderAll();
  document.addEventListener("oia:langchange", renderAll);
})();
