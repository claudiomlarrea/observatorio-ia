/**
 * Mesa de ayuda del Observatorio de IA: respuestas fijas del portal.
 * Sin API: funciona en GitHub Pages.
 */
(function () {
  var MAIL = "observatorioia@uccuyo.edu.ar";
  var SITE = "https://claudiomlarrea.github.io/observatorio-ia/";
  var SEMILLERO_FORM = "https://forms.gle/KEYoyYmZbxXZ5XWBA";
  var SEMILLERO_PORTAL = "https://jose2026-market.github.io/sia-uccuyo/";

  function t(key, fallback) {
    if (window.I18N && typeof window.I18N.t === "function") return window.I18N.t(key);
    return fallback || key;
  }

  function lang() {
    return window.I18N && window.I18N.getLang ? window.I18N.getLang() : "es";
  }

  function normalize(text) {
    return String(text || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .replace(/[¿?¡!.,;:()]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  var ANSWERS = {
    observatorio: {
      keywords: [
        "que es el observatorio",
        "que es observatorio",
        "mision",
        "vision",
        "para que sirve"
      ],
      extra: ["observatorio", "identidad"]
    },
    semillero: {
      keywords: [
        "semillero",
        "sia",
        "inscribirme",
        "inscripcion",
        "inscribir",
        "formacion estudiantes"
      ],
      extra: ["estudiantes", "mentoria"]
    },
    herramientas: {
      keywords: [
        "aplicaciones",
        "herramientas",
        "apps",
        "plataformas",
        "sacau",
        "lumen",
        "mdeia"
      ],
      extra: ["ia", "software"]
    },
    acompanamiento: {
      keywords: [
        "acompanamiento",
        "asesoria",
        "asesoramiento",
        "colaboracion",
        "programa a medida"
      ],
      extra: ["institucion", "plan estrategico"]
    },
    encuestas: {
      keywords: ["encuesta", "encuestas", "informe", "informes", "relevamiento"],
      extra: ["estudiantes", "docentes", "pdf"]
    },
    jornadas: {
      keywords: ["jornada", "jornadas", "congreso", "webinar", "webinars"],
      extra: ["evento", "actividad"]
    },
    contacto: {
      keywords: ["contacto", "mail", "correo", "escribir", "telefono", "consultar"],
      extra: ["observatorioia", "uccuyo"]
    }
  };

  function htmlObservatorio() {
    if (lang() === "en") {
      return (
        "<p>The <strong>UCCuyo AI Observatory</strong> promotes analysis, training, research and institutional outreach on artificial intelligence. Start at <a href=\"#observatorio\">El Observatorio</a> (mission and vision).</p>"
      );
    }
    return (
      "<p>El <strong>Observatorio de IA de la UCCuyo</strong> promueve el análisis, la formación, la investigación y la vinculación institucional en torno a la inteligencia artificial. Empezá por <a href=\"#observatorio\">El Observatorio</a> (misión y visión).</p>"
    );
  }

  function htmlSemillero() {
    if (lang() === "en") {
      return (
        "<p><strong>SIA-UCCuyo Semillero</strong> — open call for undergrad and graduate students (all programs). No prior coding or AI experience required.</p>" +
        "<ol>" +
        "<li>Read the section <a href=\"#semillero-ia\">Semillero de IA</a>.</li>" +
        "<li>Sign up via the <a href=\"" +
        SEMILLERO_FORM +
        "\" target=\"_blank\" rel=\"noopener noreferrer\">registration form</a>.</li>" +
        "<li>Optional portal: <a href=\"" +
        SEMILLERO_PORTAL +
        "\" target=\"_blank\" rel=\"noopener noreferrer\">sia-uccuyo</a>.</li>" +
        "</ol>"
      );
    }
    return (
      "<p><strong>Semillero SIA-UCCuyo</strong> — convocatoria abierta para estudiantes de pregrado, grado y posgrado (todas las carreras). No se requieren conocimientos previos de programación ni de IA.</p>" +
      "<ol>" +
      "<li>Revisá la sección <a href=\"#semillero-ia\">Semillero de IA</a>.</li>" +
      "<li>Inscribite en el <a href=\"" +
      SEMILLERO_FORM +
      "\" target=\"_blank\" rel=\"noopener noreferrer\">formulario</a>.</li>" +
      "<li>Portal opcional: <a href=\"" +
      SEMILLERO_PORTAL +
      "\" target=\"_blank\" rel=\"noopener noreferrer\">sia-uccuyo</a>.</li>" +
      "</ol>"
    );
  }

  function htmlHerramientas() {
    if (lang() === "en") {
      return (
        "<p>Under <a href=\"#herramientas\">Aplicaciones IA</a> you will find platforms developed by the Observatory (surveys, academic tools, SACAU, LUMEN, and more). Each card has its own access or demo request.</p>"
      );
    }
    return (
      "<p>En <a href=\"#herramientas\">Aplicaciones IA</a> están las plataformas desarrolladas por el Observatorio (encuestas, herramientas académicas, SACAU, LUMEN y más). Cada tarjeta tiene su acceso o pedido de demostración.</p>"
    );
  }

  function htmlAcompanamiento() {
    if (lang() === "en") {
      return (
        "<p>We offer institutional <a href=\"#acompanamiento\">acompañamiento</a>: diagnostics, strategic planning support and tailored programs. Write to <a href=\"mailto:" +
        MAIL +
        "?subject=%5BObservatorio%20IA%5D%20Consulta%20por%20acompanamiento\">" +
        MAIL +
        "</a>.</p>"
      );
    }
    return (
      "<p>Ofrecemos <a href=\"#acompanamiento\">acompañamiento</a> institucional: diagnósticos, planes estratégicos y programas a medida. Escribí a <a href=\"mailto:" +
      MAIL +
      "?subject=%5BObservatorio%20IA%5D%20Consulta%20por%20acompanamiento\">" +
      MAIL +
      "</a>.</p>"
    );
  }

  function htmlEncuestas() {
    if (lang() === "en") {
      return (
        "<p>See published survey results in <a href=\"#encuestas\">Encuestas</a> and PDFs in <a href=\"#informes\">Informes</a> (e.g. the 2026 student AI survey).</p>"
      );
    }
    return (
      "<p>Los resultados publicados están en <a href=\"#encuestas\">Encuestas</a> y los PDF en <a href=\"#informes\">Informes</a> (por ejemplo, la encuesta a estudiantes 2026 sobre uso de IA).</p>"
    );
  }

  function htmlJornadas() {
    if (lang() === "en") {
      return (
        "<p>Check <a href=\"#jornadas-ia\">Jornadas de IA</a>, <a href=\"#webinars\">Webinars</a> and <a href=\"#actividades\">Actividades</a> for open calls, agendas and materials.</p>"
      );
    }
    return (
      "<p>Revisá <a href=\"#jornadas-ia\">Jornadas de IA</a>, <a href=\"#webinars\">Webinars</a> y <a href=\"#actividades\">Actividades</a> para convocatorias, agendas y materiales.</p>"
    );
  }

  function htmlContacto() {
    if (lang() === "en") {
      return (
        "<p><strong>Institutional contact:</strong> <a href=\"mailto:" +
        MAIL +
        "\">" +
        MAIL +
        "</a> · phone <a href=\"tel:+542644292300\">0264-4292300</a>. More in <a href=\"#contacto\">Contacto</a>.</p>"
      );
    }
    return (
      "<p><strong>Contacto institucional:</strong> <a href=\"mailto:" +
      MAIL +
      "\">" +
      MAIL +
      "</a> · teléfono <a href=\"tel:+542644292300\">0264-4292300</a>. Más en <a href=\"#contacto\">Contacto</a>.</p>"
    );
  }

  function htmlFallback() {
    if (lang() === "en") {
      return (
        "<p>I can help with the Observatory, Semillero, apps, surveys, acompañamiento or contact. If it is not on <a href=\"" +
        SITE +
        "\">this site</a>, write to <a href=\"mailto:" +
        MAIL +
        "\">" +
        MAIL +
        "</a>.</p>"
      );
    }
    return (
      "<p>Puedo ayudarte con el Observatorio, el Semillero, aplicaciones, encuestas, acompañamiento o contacto. Si no está en <a href=\"" +
      SITE +
      "\">este sitio</a>, escribí a <a href=\"mailto:" +
      MAIL +
      "\">" +
      MAIL +
      "</a>.</p>"
    );
  }

  function htmlGreeting() {
    if (lang() === "en") {
      return (
        "<p>This is the <strong>Help desk</strong> of the UCCuyo AI Observatory. Ask about Semillero, apps, surveys or how to contact us.</p>"
      );
    }
    return (
      "<p>Soy la <strong>Mesa de ayuda</strong> del Observatorio de IA de la UCCuyo. Preguntá por el Semillero, aplicaciones, encuestas o cómo contactarnos.</p>"
    );
  }

  function renderFor(id) {
    if (id === "observatorio") return htmlObservatorio();
    if (id === "semillero") return htmlSemillero();
    if (id === "herramientas") return htmlHerramientas();
    if (id === "acompanamiento") return htmlAcompanamiento();
    if (id === "encuestas") return htmlEncuestas();
    if (id === "jornadas") return htmlJornadas();
    if (id === "contacto") return htmlContacto();
    return htmlFallback();
  }

  function matchId(query) {
    var q = normalize(query);
    if (!q) return null;
    var best = null;
    var bestScore = 0;
    Object.keys(ANSWERS).forEach(function (id) {
      var entry = ANSWERS[id];
      var score = 0;
      entry.keywords.forEach(function (kw) {
        if (q.indexOf(normalize(kw)) !== -1) score += 4;
      });
      (entry.extra || []).forEach(function (kw) {
        if (q.indexOf(normalize(kw)) !== -1) score += 1;
      });
      if (score > bestScore) {
        bestScore = score;
        best = id;
      }
    });
    if (!best || bestScore < 2) return null;
    return best;
  }

  function appendMessage(log, role, htmlOrText, asHtml) {
    var div = document.createElement("div");
    div.className = "mesa-ayuda-msg mesa-ayuda-msg--" + role;
    if (asHtml) div.innerHTML = htmlOrText;
    else div.textContent = htmlOrText;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
  }

  function init() {
    var panel = document.getElementById("mesa-ayuda-panel");
    var toggle = document.getElementById("mesa-ayuda-toggle");
    var closeBtn = document.getElementById("mesa-ayuda-close");
    var log = document.getElementById("mesa-ayuda-log");
    var form = document.getElementById("mesa-ayuda-form");
    var input = document.getElementById("mesa-ayuda-input");
    var quick = document.getElementById("mesa-ayuda-quick");
    if (!panel || !toggle || !log || !form || !input) return;

    var greeted = false;

    function greet() {
      if (greeted) return;
      greeted = true;
      appendMessage(log, "bot", htmlGreeting(), true);
    }

    function setOpen(open) {
      if (open) {
        panel.removeAttribute("hidden");
        toggle.setAttribute("aria-expanded", "true");
        document.body.classList.add("mesa-ayuda-open");
        greet();
        window.setTimeout(function () {
          input.focus();
        }, 50);
      } else {
        panel.setAttribute("hidden", "");
        toggle.setAttribute("aria-expanded", "false");
        document.body.classList.remove("mesa-ayuda-open");
      }
    }

    function paintQuick() {
      if (!quick) return;
      quick.innerHTML =
        '<button type="button" data-mesa-q="semillero">' +
        t("bot.q.semillero", "Semillero de IA") +
        "</button>" +
        '<button type="button" data-mesa-q="herramientas">' +
        t("bot.q.herramientas", "Aplicaciones IA") +
        "</button>" +
        '<button type="button" data-mesa-q="contacto">' +
        t("bot.q.contacto", "Contacto") +
        "</button>";
    }

    function ask(text, idHint) {
      var q = String(text || "").trim();
      var id = idHint || matchId(q);
      if (!q && !id) return;
      var label = q;
      if (!label) {
        if (id === "herramientas") label = t("bot.q.herramientas", "Aplicaciones IA");
        else if (id === "contacto") label = t("bot.q.contacto", "Contacto");
        else if (id === "observatorio") label = t("bot.q.observatorio", "Qué es el Observatorio");
        else label = t("bot.q.semillero", "Semillero de IA");
      }
      setOpen(true);
      appendMessage(log, "user", label, false);
      var html = renderFor(id);
      window.setTimeout(function () {
        appendMessage(log, "bot", html, true);
      }, 180);
    }

    paintQuick();

    toggle.addEventListener("click", function () {
      setOpen(panel.hasAttribute("hidden"));
    });
    if (closeBtn) {
      closeBtn.addEventListener("click", function () {
        setOpen(false);
      });
    }

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var q = input.value;
      input.value = "";
      ask(q);
    });

    document.addEventListener("click", function (ev) {
      var btn = ev.target.closest("[data-mesa-q]");
      if (!btn) return;
      ev.preventDefault();
      ask("", btn.getAttribute("data-mesa-q"));
    });

    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape" && !panel.hasAttribute("hidden")) setOpen(false);
    });

    window.addEventListener("oia:langchange", function () {
      paintQuick();
    });

    if (location.hash === "#mesa-ayuda") setOpen(true);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
