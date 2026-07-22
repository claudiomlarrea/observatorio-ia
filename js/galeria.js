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

  function renderAlbum(album) {
    var article = document.createElement("article");
    article.className = "gallery-event card";
    article.setAttribute("aria-labelledby", "galeria-" + album.id);

    var h3 = document.createElement("h3");
    h3.id = "galeria-" + album.id;
    h3.textContent = album.title || "";
    article.appendChild(h3);

    if (album.description) {
      var p = document.createElement("p");
      p.textContent = album.description;
      article.appendChild(p);
    }

    var grid = document.createElement("div");
    grid.className = "gallery-grid";
    grid.setAttribute("role", "list");

    var photos = album.photos || [];
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
      img.src = thumbUrl(id, 640);
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

    article.appendChild(grid);
    return article;
  }

  albums.forEach(function (album) {
    root.appendChild(renderAlbum(album));
  });
})();
