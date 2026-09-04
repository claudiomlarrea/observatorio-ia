(function () {
  var header = document.querySelector(".site-header");
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector("#site-nav");
  var baseTitle = "Observatorio de Inteligencia Artificial | Universidad Católica de Cuyo";
  var aliases = {
    contenido: "inicio",
    "publicaciones-global-ia": "publicaciones"
  };
  var pageTitles = {
    inicio: baseTitle,
    observatorio: "El Observatorio · Observatorio de IA",
    equipo: "Equipo · Observatorio de IA",
    numeros: "El observatorio en números · Observatorio de IA",
    impacto: "Impacto · Observatorio de IA",
    visitas: "Visitas al Observatorio · Observatorio de IA",
    acompanamiento: "Acompañamiento · Observatorio de IA",
    "jornadas-ia": "Jornadas de IA · Observatorio de IA",
    webinars: "Webinars · Observatorio de IA",
    "semillero-ia": "Semillero de IA · Observatorio de IA",
    actividades: "Actividades · Observatorio de IA",
    herramientas: "Aplicaciones IA · Observatorio de IA",
    publicaciones: "Biblioteca de IA · Observatorio de IA",
    datos: "Datos del Observatorio · Observatorio de IA",
    encuestas: "Encuestas · Observatorio de IA",
    informes: "Informes · Observatorio de IA",
    noticias: "Noticias · Observatorio de IA",
    galeria: "Galería de Imágenes · Observatorio de IA",
    contacto: "Contacto · Observatorio de IA"
  };

  var dismissHover = function () {};

  function pageTitle(id) {
    return pageTitles[id] || baseTitle;
  }

  function pageIdFromHash(hash) {
    var id = String(hash || "").replace(/^#/, "");
    if (!id) return "inicio";
    id = aliases[id] || id;
    if (document.querySelector('.page-panel[data-page="' + id + '"]')) return id;
    var el = document.getElementById(id);
    if (el) {
      var panel = el.closest(".page-panel");
      if (panel && panel.getAttribute("data-page")) return panel.getAttribute("data-page");
    }
    return "inicio";
  }

  function showPage(hash, push) {
    var raw = String(hash || "").replace(/^#/, "") || "inicio";
    var id = pageIdFromHash(hash);
    var panel = document.querySelector('.page-panel[data-page="' + id + '"]');
    if (!panel) return;
    document.querySelectorAll(".page-panel.is-active").forEach(function (el) {
      el.classList.remove("is-active");
    });
    panel.classList.add("is-active");
    var shownHash = "#" + raw;
    var target = document.getElementById(raw);
    if (target && panel.contains(target) && raw !== "inicio") {
      window.scrollTo(0, 0);
      requestAnimationFrame(function () {
        target.scrollIntoView({ block: "start" });
      });
    } else {
      window.scrollTo(0, 0);
    }
    document.title = pageTitle(id);
    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
      var href = link.getAttribute("href") || "";
      if (href === "#contenido") {
        link.removeAttribute("aria-current");
        return;
      }
      if (href === shownHash || href === "#" + id || (id === "inicio" && href === "#inicio")) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
    if (push) {
      if (location.hash !== shownHash) {
        history.pushState({ page: id }, "", shownHash);
      }
    }
    document.dispatchEvent(new CustomEvent("oia:page", { detail: id }));
  }

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
    dismissHover();
    if (nav) nav.classList.remove("is-open");
    if (toggle) toggle.setAttribute("aria-expanded", "false");
    cerrarSubmenus();
    if (document.activeElement && document.activeElement.blur) {
      document.activeElement.blur();
    }
  }

  document.addEventListener("click", function (e) {
    var link = e.target.closest && e.target.closest('a[href^="#"]');
    if (!link) return;
    var href = link.getAttribute("href") || "";
    if (href === "#" || href === "#contenido") return;
    if (link.getAttribute("target") === "_blank") return;
    e.preventDefault();
    showPage(href, true);
    cerrarMenu();
  });

  window.addEventListener("popstate", function () {
    showPage(location.hash || "#inicio", false);
  });

  window.addEventListener("hashchange", function () {
    showPage(location.hash || "#inicio", false);
  });

  window.addEventListener("oia:langchange", function () {
    showPage(location.hash || "#inicio", false);
  });

  showPage(location.hash || "#inicio", false);

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

  (function () {
    var desktopHover = window.matchMedia("(hover: hover) and (pointer: fine)");
    var closeTimer = null;
    var activeItem = null;

    function setOpen(item, open) {
      if (!item) return;
      item.classList.toggle("is-open", open);
      var btn = item.querySelector(".nav-submenu-toggle");
      if (btn) btn.setAttribute("aria-expanded", open ? "true" : "false");
    }

    function openItem(item) {
      if (closeTimer) {
        clearTimeout(closeTimer);
        closeTimer = null;
      }
      if (activeItem && activeItem !== item) setOpen(activeItem, false);
      activeItem = item;
      setOpen(item, true);
    }

    function scheduleClose(item) {
      if (closeTimer) clearTimeout(closeTimer);
      closeTimer = setTimeout(function () {
        if (activeItem === item) {
          setOpen(item, false);
          activeItem = null;
        }
        closeTimer = null;
      }, 320);
    }

    nav.querySelectorAll(".has-submenu").forEach(function (item) {
      item.addEventListener("mouseenter", function () {
        if (!desktopHover.matches) return;
        openItem(item);
      });
      item.addEventListener("mouseleave", function () {
        if (!desktopHover.matches) return;
        scheduleClose(item);
      });
    });

    dismissHover = function () {
      if (closeTimer) {
        clearTimeout(closeTimer);
        closeTimer = null;
      }
      if (activeItem) {
        setOpen(activeItem, false);
        activeItem = null;
      }
    };
  })();

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
