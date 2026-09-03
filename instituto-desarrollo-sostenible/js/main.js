(function () {
  var header = document.querySelector(".site-header");
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector("#site-nav");
  var baseTitle = "Instituto de Desarrollo Sostenible | Universidad Católica de Cuyo";
  var aliases = {
    normativa: "instituto",
    fundador: "instituto",
    numeros: "inicio",
    contenido: "inicio",
    biblioteca: "publicaciones",
    "publicaciones-global": "publicaciones",
    "biblioteca-global": "publicaciones",
    "publicaciones-ds-mundo": "publicaciones"
  };
  var pageTitles = {
    inicio: baseTitle,
    actividades: "Actividades · Instituto de Desarrollo Sostenible",
    instituto: "El Instituto · Instituto de Desarrollo Sostenible",
    equipo: "Equipo · Instituto de Desarrollo Sostenible",
    gestion: "Gestión · Instituto de Desarrollo Sostenible",
    investigacion: "Investigación · Instituto de Desarrollo Sostenible",
    publicaciones: "Biblioteca del IDS · Instituto de Desarrollo Sostenible",
    docencia: "Docencia · Instituto de Desarrollo Sostenible",
    extension: "Extensión · Instituto de Desarrollo Sostenible",
    ods: "Observatorio de ODS · Instituto de Desarrollo Sostenible",
    consultoria: "Consultoría · Instituto de Desarrollo Sostenible",
    vinculacion: "Vinculación · Instituto de Desarrollo Sostenible",
    hitos: "Hitos y galería · Instituto de Desarrollo Sostenible",
    visitas: "Visitas al Instituto · Instituto de Desarrollo Sostenible",
    contacto: "Contacto · Instituto de Desarrollo Sostenible"
  };

  var dismissHover = function () {};

  function pageTitle(id) {
    var key = "page." + id;
    if (window.I18N && typeof window.I18N.t === "function") {
      var v = window.I18N.t(key);
      if (v && v !== key) return v;
    }
    return pageTitles[id] || baseTitle;
  }

  function pageIdFromHash(hash) {
    var id = String(hash || "").replace(/^#/, "");
    if (!id) return "inicio";
    id = aliases[id] || id;
    if (document.querySelector('.page-panel[data-page="' + id + '"]')) return id;
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
    if (header) header.classList.toggle("is-solid", id !== "inicio");
    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
      var href = link.getAttribute("href") || "";
      if (href === "#contenido") {
        link.removeAttribute("aria-current");
        return;
      }
      if (href === shownHash || (shownHash === "#inicio" && href === "#inicio")) {
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
    document.dispatchEvent(new CustomEvent("ids:page", { detail: id }));
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

  function updateHeader() {
    if (!header) return;
    var onHome = pageIdFromHash(location.hash) === "inicio";
    header.classList.toggle("is-solid", !onHome || window.scrollY > 24);
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

  window.addEventListener("scroll", updateHeader, { passive: true });

  window.addEventListener("oia:langchange", function () {
    showPage(location.hash || "#inicio", false);
  });

  showPage(location.hash || "#inicio", false);
  updateHeader();

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
