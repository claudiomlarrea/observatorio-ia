(function () {
  var header = document.querySelector(".site-header");
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector("#site-nav");

  function cerrarMenu() {
    if (!nav || !toggle) return;
    nav.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
  }

  function irInicio() {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    if (window.location.hash !== "#inicio") {
      history.pushState(null, "", "#inicio");
    }
  }

  function updateHeader() {
    if (!header) return;
    header.classList.toggle("is-solid", window.scrollY > 24);
  }

  document.querySelectorAll('a[href="#inicio"]').forEach(function (link) {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      irInicio();
      cerrarMenu();
    });
  });

  window.addEventListener("scroll", updateHeader, { passive: true });
  updateHeader();

  if (!toggle || !nav) return;

  toggle.addEventListener("click", function () {
    var open = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });

  nav.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () {
      cerrarMenu();
    });
  });

  document.addEventListener("click", function (e) {
    if (!header.contains(e.target)) cerrarMenu();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") cerrarMenu();
  });
})();
