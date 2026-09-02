(function () {
  var CFG = window.IDS_GALERIA || {};
  var photos = CFG.photos || [];
  var filters = CFG.filters || [];
  var root = document.getElementById("galeria-ids");
  if (!root || !photos.length) return;

  var current = "todos";
  var visible = photos.slice();
  var index = 0;
  var lightbox = null;
  var lightboxImg = null;
  var lightboxCap = null;

  function esc(s) {
    var d = document.createElement("div");
    d.textContent = s == null ? "" : String(s);
    return d.innerHTML;
  }

  function filtered() {
    if (current === "todos") return photos.slice();
    return photos.filter(function (p) {
      return (p.tags || []).indexOf(current) >= 0;
    });
  }

  function ensureLightbox() {
    if (lightbox) return;
    lightbox = document.createElement("div");
    lightbox.className = "gallery-lightbox";
    lightbox.hidden = true;
    lightbox.setAttribute("role", "dialog");
    lightbox.setAttribute("aria-modal", "true");
    lightbox.setAttribute("aria-label", "Vista ampliada");
    lightbox.innerHTML =
      '<button type="button" class="gallery-lightbox-close" aria-label="Cerrar">×</button>' +
      '<button type="button" class="gallery-lightbox-nav gallery-lightbox-prev" aria-label="Foto anterior">‹</button>' +
      '<figure class="gallery-lightbox-figure">' +
      '<img class="gallery-lightbox-img" alt="" />' +
      "<figcaption></figcaption>" +
      "</figure>" +
      '<button type="button" class="gallery-lightbox-nav gallery-lightbox-next" aria-label="Foto siguiente">›</button>';
    document.body.appendChild(lightbox);
    lightboxImg = lightbox.querySelector(".gallery-lightbox-img");
    lightboxCap = lightbox.querySelector("figcaption");
    lightbox.querySelector(".gallery-lightbox-close").addEventListener("click", closeLb);
    lightbox.querySelector(".gallery-lightbox-prev").addEventListener("click", function () {
      showLb(index - 1);
    });
    lightbox.querySelector(".gallery-lightbox-next").addEventListener("click", function () {
      showLb(index + 1);
    });
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox) closeLb();
    });
    document.addEventListener("keydown", function (e) {
      if (lightbox.hidden) return;
      if (e.key === "Escape") closeLb();
      if (e.key === "ArrowLeft") showLb(index - 1);
      if (e.key === "ArrowRight") showLb(index + 1);
    });
  }

  function showLb(i) {
    ensureLightbox();
    visible = filtered();
    if (!visible.length) return;
    index = (i + visible.length) % visible.length;
    var p = visible[index];
    lightboxImg.src = p.src;
    lightboxImg.alt = p.alt || "";
    lightboxCap.textContent = p.caption || "";
    lightbox.hidden = false;
    document.body.classList.add("gallery-lightbox-open");
  }

  function closeLb() {
    if (!lightbox) return;
    lightbox.hidden = true;
    document.body.classList.remove("gallery-lightbox-open");
  }

  function render() {
    visible = filtered();
    var html = '<div class="gallery-filters" role="tablist" aria-label="Filtrar galería">';
    filters.forEach(function (f) {
      html +=
        '<button type="button" class="gallery-filter' +
        (f.id === current ? " is-active" : "") +
        '" data-filter="' +
        esc(f.id) +
        '" aria-pressed="' +
        (f.id === current ? "true" : "false") +
        '">' +
        esc(f.label) +
        "</button>";
    });
    html += '</div><div class="gallery-grid">';
    visible.forEach(function (p, i) {
      html +=
        '<button type="button" class="gallery-item" data-index="' +
        i +
        '">' +
        '<img src="' +
        esc(p.src) +
        '" alt="' +
        esc(p.alt || "") +
        '" loading="lazy" decoding="async" />' +
        "<span>" +
        esc(p.caption || "") +
        "</span></button>";
    });
    html += "</div>";
    if (!visible.length) {
      html += '<p class="visitas-empty">No hay fotos en esta categoría todavía.</p>';
    }
    root.innerHTML = html;
    root.querySelectorAll("[data-filter]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        current = btn.getAttribute("data-filter") || "todos";
        render();
      });
    });
    root.querySelectorAll(".gallery-item").forEach(function (btn) {
      btn.addEventListener("click", function () {
        showLb(Number(btn.getAttribute("data-index") || 0));
      });
    });
  }

  render();
})();
