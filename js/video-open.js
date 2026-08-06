(function () {
  function openVideo(url) {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function bind(el) {
    var url = el.getAttribute("data-video-open");
    if (!url) return;

    el.addEventListener("dblclick", function (e) {
      e.preventDefault();
      openVideo(url);
    });
  }

  function init() {
    document.querySelectorAll("video[data-video-open]").forEach(bind);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
