(function () {
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector("#site-nav");

  function cerrarSubmenus(except) {
    if (!nav) return;
    nav.querySelectorAll(".has-submenu.is-open").forEach(function (item) {
      if (except && item === except) return;
      item.classList.remove("is-open");
      var btn = item.querySelector(".nav-submenu-toggle");
      if (btn) btn.setAttribute("aria-expanded", "false");
    });
  }

  function cerrarMenu() {
    if (!nav || !toggle) return;
    nav.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    cerrarSubmenus();
  }

  function irInicio() {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    if (window.location.hash !== "#inicio") {
      history.pushState(null, "", "#inicio");
    }
  }

  document.querySelectorAll('a[href="#inicio"]').forEach(function (link) {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      irInicio();
      cerrarMenu();
    });
  });

  if (!toggle || !nav) return;

  toggle.addEventListener("click", function () {
    var open = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    if (!open) cerrarSubmenus();
  });

  nav.querySelectorAll(".nav-submenu-toggle").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      var item = btn.closest(".has-submenu");
      if (!item) return;
      var willOpen = !item.classList.contains("is-open");
      cerrarSubmenus(willOpen ? item : null);
      item.classList.toggle("is-open", willOpen);
      btn.setAttribute("aria-expanded", willOpen ? "true" : "false");
    });
  });

  /* Desktop: mantener el submenú abierto al pasar el mouse (sin hueco) */
  nav.querySelectorAll(".has-submenu").forEach(function (item) {
    var closeTimer = null;
    var btn = item.querySelector(".nav-submenu-toggle");

    function openItem() {
      if (closeTimer) {
        clearTimeout(closeTimer);
        closeTimer = null;
      }
      cerrarSubmenus(item);
      item.classList.add("is-open");
      if (btn) btn.setAttribute("aria-expanded", "true");
    }

    function scheduleClose() {
      if (closeTimer) clearTimeout(closeTimer);
      closeTimer = setTimeout(function () {
        item.classList.remove("is-open");
        if (btn) btn.setAttribute("aria-expanded", "false");
        closeTimer = null;
      }, 180);
    }

    item.addEventListener("mouseenter", openItem);
    item.addEventListener("mouseleave", scheduleClose);
  });

  nav.querySelectorAll('a:not([href="#inicio"])').forEach(function (link) {
    link.addEventListener("click", function () {
      cerrarMenu();
    });
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") cerrarMenu();
  });

  document.addEventListener("click", function (e) {
    if (!nav.contains(e.target) && !(toggle && toggle.contains(e.target))) {
      cerrarSubmenus();
    }
  });
})();

(function () {
  var root = document.querySelector("[data-semillero-slides]");
  if (!root) return;

  var total = 10;
  var current = 1;
  var img = root.querySelector("[data-slide-img]");
  var status = root.querySelector("[data-slide-status]");
  var dotsWrap = root.querySelector("[data-slide-dots]");
  var prev = root.querySelector("[data-slide-prev]");
  var next = root.querySelector("[data-slide-next]");

  function t(key, vars) {
    if (window.I18N && typeof window.I18N.t === "function") {
      return window.I18N.t(key, vars);
    }
    var dict = window.I18N_DICT || {};
    var lang = document.documentElement.lang === "en" ? "en" : "es";
    var entry = dict[key] || {};
    var text = entry[lang] || entry.es || "";
    if (vars) {
      Object.keys(vars).forEach(function (k) {
        text = String(text).split("{" + k + "}").join(String(vars[k]));
      });
    }
    return text;
  }

  function srcFor(n) {
    var pad = n < 10 ? "0" + n : String(n);
    return "assets/semillero/convocatoria-2026/slide-" + pad + ".jpg";
  }

  function render() {
    img.src = srcFor(current);
    img.alt = t("sec.semillero.slides.alt", { current: current, total: total });
    status.textContent = t("sec.semillero.slides.status", {
      current: current,
      total: total
    });
    if (dotsWrap) {
      Array.prototype.forEach.call(dotsWrap.children, function (dot, i) {
        var active = i + 1 === current;
        dot.classList.toggle("is-active", active);
        dot.setAttribute("aria-selected", active ? "true" : "false");
      });
    }
    if (prev) prev.disabled = current === 1;
    if (next) next.disabled = current === total;
  }

  function go(n) {
    current = Math.max(1, Math.min(total, n));
    render();
  }

  if (dotsWrap) {
    for (var i = 1; i <= total; i++) {
      var dot = document.createElement("button");
      dot.type = "button";
      dot.className = "semillero-slide-dot" + (i === 1 ? " is-active" : "");
      dot.setAttribute("aria-label", String(i));
      dot.setAttribute("role", "tab");
      dot.setAttribute("aria-selected", i === 1 ? "true" : "false");
      dot.addEventListener(
        "click",
        (function (n) {
          return function () {
            go(n);
          };
        })(i)
      );
      dotsWrap.appendChild(dot);
    }
  }

  if (prev) prev.addEventListener("click", function () { go(current - 1); });
  if (next) next.addEventListener("click", function () { go(current + 1); });

  root.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") go(current - 1);
    if (e.key === "ArrowRight") go(current + 1);
  });
  root.tabIndex = 0;

  document.addEventListener("oia:langchange", render);
  render();
})();
