/**
 * Mesa de ayuda del Observatorio de IA: respuestas fijas del portal.
 * Prioridad: Jornadas de IA (flujo e instructivos) y Aplicaciones IA.
 * Sin API: funciona en GitHub Pages.
 */
(function () {
  var MAIL = "observatorioia@uccuyo.edu.ar";
  var SITE = "https://claudiomlarrea.github.io/observatorio-ia/";
  var FORM_ASISTENTES =
    "https://docs.google.com/forms/d/e/1FAIpQLSc1GgR1PuBtnud5xlOGQSYUGeSYPmk1OjhHpefMSnm5XuUnvg/viewform?usp=sharing&ouid=102865527515262890038";
  var FORM_EXPOSITORES =
    "https://docs.google.com/forms/d/e/1FAIpQLSdwoONOXU-N-r26LRvrYWBOA4SfKQjaJ4BDXTcJoD48whT7Tw/viewform?usp=sharing&ouid=102865527515262890038";
  var DRIVE_ARTICULO =
    "https://drive.google.com/drive/folders/1oEx8kOI1x4Hx2LppKv35DTIB6S48LXLa";
  var DRIVE_PPT =
    "https://drive.google.com/drive/folders/10Ma7p_Lo3tObfE0N_nXEgwqZogqQzXQE";
  var INST_GENERAL = "docs/instructivos/instructivo-jornadas-ia-2026.pdf?v=5";
  var INST_ARTICULO =
    "docs/instructivos/instructivo-carga-resumen-jornadas-ia-2026.pdf?v=3";
  var INST_PPT =
    "docs/instructivos/instructivo-carga-presentacion-jornadas-ia-2026.pdf?v=2";
  var PLANTILLA_ARTICULO =
    "docs/plantillas/plantilla-resumen-jornadas-ia-2026.docx?v=2";
  var PLANTILLA_PPT =
    "docs/plantillas/plantilla-presentacion-jornadas-ia-2026.pptx?v=2";
  var CATALOGO = "jornadas-catalogo.html?tipo=articulos&v=13";
  var CARGAS = "jornadas-cargas.html?v=9";
  var AGENDA = "jornadas-ia-2026/";
  var AGENDA_INSTALAR = "jornadas-ia-2026/instalar.html";
  var SEMILLERO_FORM = "https://forms.gle/KEYoyYmZbxXZ5XWBA";

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
    asistente: {
      keywords: [
        "asistente",
        "asistentes",
        "solo asistir",
        "inscribirme como asistente",
        "formulario para asistentes",
        "como asistente"
      ],
      extra: ["oyente", "participar sin exponer"]
    },
    expositor: {
      keywords: [
        "expositor",
        "expositores",
        "expositora",
        "exponer",
        "ponencia",
        "inscribirme como expositor",
        "formulario para expositores"
      ],
      extra: ["presentar", "disertar"]
    },
    articulo: {
      keywords: [
        "articulo",
        "articulos",
        "cargar articulo",
        "subir articulo",
        "resumen",
        "plantilla word",
        "2000 palabras",
        "cuadernos"
      ],
      extra: ["docx", "drive articulo"]
    },
    ppt: {
      keywords: [
        "ppt",
        "pptx",
        "powerpoint",
        "presentacion",
        "cargar ppt",
        "subir ppt",
        "diapositivas",
        "cargar presentacion"
      ],
      extra: ["10 minutos", "6 diapositivas"]
    },
    catalogo: {
      keywords: [
        "catalogo",
        "catalogos",
        "listado de articulos",
        "estado articulo",
        "estado powerpoint",
        "cargas"
      ],
      extra: ["pdf articulos", "seguimiento"]
    },
    agenda: {
      keywords: [
        "agenda",
        "agenda de consulta",
        "horario de las jornadas",
        "programa del dia",
        "app de la agenda",
        "agregar app al celular"
      ],
      extra: ["jornadas-ia-2026", "instalar"]
    },
    jornadas: {
      keywords: [
        "jornada",
        "jornadas",
        "jornadas de ia",
        "flujo de carga",
        "instructivo",
        "instructivos",
        "como me inscribo",
        "inscripcion jornadas",
        "inscribirme a las jornadas"
      ],
      extra: ["6 de octubre", "evento", "flujo"]
    },
    herramientas: {
      keywords: [
        "aplicaciones",
        "aplicaciones ia",
        "herramientas",
        "apps",
        "plataformas",
        "sacau",
        "lumen",
        "mdeia",
        "evaluar",
        "encuesta clara",
        "senal segura"
      ],
      extra: ["software", "desarrollos"]
    },
    semillero: {
      keywords: ["semillero", "sia-uccuyo", "sia uccuyo"],
      extra: ["mentoria"]
    },
    contacto: {
      keywords: ["contacto", "mail", "correo", "escribir", "telefono", "consultar"],
      extra: ["observatorioia", "uccuyo"]
    }
  };

  function htmlAsistente() {
    if (lang() === "en") {
      return (
        "<p><strong>Register as attendee</strong></p>" +
        "<ol>" +
        "<li>Go to <a href=\"#jornadas-ia\">Jornadas de IA</a> → step 1.</li>" +
        "<li>Open the <a href=\"" +
        FORM_ASISTENTES +
        "\" target=\"_blank\" rel=\"noopener noreferrer\">attendee form</a>.</li>" +
        "<li>Deadline: <strong>28 September</strong>. Event: 6 Oct 2026, 15:00, virtual.</li>" +
        "</ol>" +
        "<p>Guide: <a href=\"" +
        INST_GENERAL +
        "\" target=\"_blank\" rel=\"noopener noreferrer\">general instructivo (PDF)</a>.</p>"
      );
    }
    return (
      "<p><strong>Inscribirse como asistente</strong></p>" +
      "<ol>" +
      "<li>Entrá a <a href=\"#jornadas-ia\">Jornadas de IA</a> → paso 1.</li>" +
      "<li>Completá el <a href=\"" +
      FORM_ASISTENTES +
      "\" target=\"_blank\" rel=\"noopener noreferrer\">formulario para asistentes</a>.</li>" +
      "<li>Cierre: <strong>28 de septiembre</strong>. Evento: 6 de octubre 2026, 15:00 h, virtual.</li>" +
      "</ol>" +
      "<p>Guía: <a href=\"" +
      INST_GENERAL +
      "\" target=\"_blank\" rel=\"noopener noreferrer\">instructivo general (PDF)</a>.</p>"
    );
  }

  function htmlExpositor() {
    if (lang() === "en") {
      return (
        "<p><strong>Register as presenter</strong></p>" +
        "<ol>" +
        "<li>Complete the <a href=\"" +
        FORM_EXPOSITORES +
        "\" target=\"_blank\" rel=\"noopener noreferrer\">presenter form</a> (include talk title).</li>" +
        "<li>Upload the <strong>scientific article</strong> (step 2) and the <strong>PowerPoint</strong> (step 3).</li>" +
        "<li>Article + PPT deadline: <strong>16 September</strong>.</li>" +
        "</ol>" +
        "<p>Start at <a href=\"#jornadas-ia\">Jornadas de IA</a>. Guide: <a href=\"" +
        INST_GENERAL +
        "\" target=\"_blank\" rel=\"noopener noreferrer\">PDF</a>.</p>"
      );
    }
    return (
      "<p><strong>Inscribirse como expositor/a</strong></p>" +
      "<ol>" +
      "<li>Completá el <a href=\"" +
      FORM_EXPOSITORES +
      "\" target=\"_blank\" rel=\"noopener noreferrer\">formulario para expositores</a> (incluí el título de la ponencia).</li>" +
      "<li>Después cargá el <strong>artículo científico</strong> (paso 2) y el <strong>PowerPoint</strong> (paso 3).</li>" +
      "<li>Cierre artículo + PPT: <strong>16 de septiembre</strong>.</li>" +
      "</ol>" +
      "<p>Todo está en <a href=\"#jornadas-ia\">Jornadas de IA</a>. Guía: <a href=\"" +
      INST_GENERAL +
      "\" target=\"_blank\" rel=\"noopener noreferrer\">instructivo general (PDF)</a>.</p>"
    );
  }

  function htmlArticulo() {
    if (lang() === "en") {
      return (
        "<p><strong>Upload the scientific article</strong> (presenters only)</p>" +
        "<ol>" +
        "<li>Download the <a href=\"" +
        PLANTILLA_ARTICULO +
        "\" download>Word template</a>.</li>" +
        "<li>Write ~<strong>2,000 words</strong> (Revista Cuadernos). Suggested name: <code>Area_Universidad_Apellido_Titulo.docx</code>.</li>" +
        "<li>In Drive: <em>New → File upload</em> into the <a href=\"" +
        DRIVE_ARTICULO +
        "\" target=\"_blank\" rel=\"noopener noreferrer\">articles folder</a>.</li>" +
        "</ol>" +
        "<p><a href=\"" +
        INST_ARTICULO +
        "\" target=\"_blank\" rel=\"noopener noreferrer\">Upload instructivo (PDF)</a> · section <a href=\"#jornadas-ia\">Jornadas</a>.</p>"
      );
    }
    return (
      "<p><strong>Cargar el artículo científico</strong> (solo expositores)</p>" +
      "<ol>" +
      "<li>Descargá la <a href=\"" +
      PLANTILLA_ARTICULO +
      "\" download>plantilla Word</a>.</li>" +
      "<li>Redactá el artículo de ~<strong>2.000 palabras</strong> (Revista Cuadernos). Nombre sugerido: <code>Area_Universidad_Apellido_Titulo.docx</code>.</li>" +
      "<li>En Drive: <em>Nuevo → Subir archivo</em> en la <a href=\"" +
      DRIVE_ARTICULO +
      "\" target=\"_blank\" rel=\"noopener noreferrer\">carpeta de artículos</a>.</li>" +
      "</ol>" +
      "<p><a href=\"" +
      INST_ARTICULO +
      "\" target=\"_blank\" rel=\"noopener noreferrer\">Instructivo de carga (PDF)</a> · sección <a href=\"#jornadas-ia\">Jornadas</a>.</p>"
    );
  }

  function htmlPpt() {
    if (lang() === "en") {
      return (
        "<p><strong>Upload the PowerPoint</strong> (presenters only)</p>" +
        "<ol>" +
        "<li>Download the <a href=\"" +
        PLANTILLA_PPT +
        "\" download>6-slide template</a>.</li>" +
        "<li>Max <strong>6 slides</strong>, talk up to <strong>10 minutes</strong>. Suggested name: <code>Area_Universidad_Apellido_TituloCorto.pptx</code>.</li>" +
        "<li>Upload (.ppt/.pptx) via <em>New → File upload</em> to the <a href=\"" +
        DRIVE_PPT +
        "\" target=\"_blank\" rel=\"noopener noreferrer\">PPT folder</a>.</li>" +
        "</ol>" +
        "<p><a href=\"" +
        INST_PPT +
        "\" target=\"_blank\" rel=\"noopener noreferrer\">Upload instructivo (PDF)</a>.</p>"
      );
    }
    return (
      "<p><strong>Cargar la presentación PowerPoint</strong> (solo expositores)</p>" +
      "<ol>" +
      "<li>Descargá la <a href=\"" +
      PLANTILLA_PPT +
      "\" download>plantilla de 6 diapositivas</a>.</li>" +
      "<li>Máximo <strong>6 diapositivas</strong>; exposición de hasta <strong>10 minutos</strong>. Nombre sugerido: <code>Area_Universidad_Apellido_TituloCorto.pptx</code>.</li>" +
      "<li>Subí el .ppt/.pptx con <em>Nuevo → Subir archivo</em> en la <a href=\"" +
      DRIVE_PPT +
      "\" target=\"_blank\" rel=\"noopener noreferrer\">carpeta de presentaciones</a>.</li>" +
      "</ol>" +
      "<p><a href=\"" +
      INST_PPT +
      "\" target=\"_blank\" rel=\"noopener noreferrer\">Instructivo de carga (PDF)</a>.</p>"
    );
  }

  function htmlCatalogo() {
    if (lang() === "en") {
      return (
        "<p><strong>Article catalogue</strong></p>" +
        "<ul>" +
        "<li><a href=\"" +
        CATALOGO +
        "\" target=\"_blank\" rel=\"noopener noreferrer\">Open catalogue (PDF)</a> — same order as the programme.</li>" +
        "<li><a href=\"" +
        CARGAS +
        "\" target=\"_blank\" rel=\"noopener noreferrer\">Article ↔ PowerPoint status</a> — upload tracking.</li>" +
        "</ul>" +
        "<p>Both links are under <a href=\"#jornadas-catalogos\">Catálogo de artículos</a> in <a href=\"#jornadas-ia\">Jornadas</a>.</p>"
      );
    }
    return (
      "<p><strong>Catálogo de artículos</strong></p>" +
      "<ul>" +
      "<li><a href=\"" +
      CATALOGO +
      "\" target=\"_blank\" rel=\"noopener noreferrer\">Abrir catálogo (PDF)</a> — mismo orden que el programa.</li>" +
      "<li><a href=\"" +
      CARGAS +
      "\" target=\"_blank\" rel=\"noopener noreferrer\">Estado artículo ↔ PowerPoint</a> — seguimiento de cargas.</li>" +
      "</ul>" +
      "<p>Los dos enlaces están en <a href=\"#jornadas-catalogos\">Catálogo de artículos</a> dentro de <a href=\"#jornadas-ia\">Jornadas de IA</a>.</p>"
    );
  }

  function htmlAgenda() {
    if (lang() === "en") {
      return (
        "<p><strong>Consultation agenda</strong></p>" +
        "<ul>" +
        "<li><a href=\"" +
        AGENDA +
        "\" target=\"_blank\" rel=\"noopener noreferrer\">Open agenda</a> — times, talks, articles, PPT, area and presenters.</li>" +
        "<li>Build your own day agenda and <a href=\"" +
        AGENDA_INSTALAR +
        "\" target=\"_blank\" rel=\"noopener noreferrer\">add the app to your phone</a>.</li>" +
        "</ul>" +
        "<p>On the site: <a href=\"#jornadas-agenda\">Agenda de consulta</a>.</p>"
      );
    }
    return (
      "<p><strong>Agenda de consulta</strong></p>" +
      "<ul>" +
      "<li><a href=\"" +
      AGENDA +
      "\" target=\"_blank\" rel=\"noopener noreferrer\">Abrir agenda</a> — horarios, ponencias, artículos, PPT, área y expositores.</li>" +
      "<li>Podés armar tu agenda del día y <a href=\"" +
      AGENDA_INSTALAR +
      "\" target=\"_blank\" rel=\"noopener noreferrer\">agregar la app al celular</a>.</li>" +
      "</ul>" +
      "<p>En el sitio: <a href=\"#jornadas-agenda\">Agenda de consulta</a>.</p>"
    );
  }

  function htmlJornadas() {
    if (lang() === "en") {
      return (
        "<p><strong>AI Conference flow (6 Oct 2026)</strong></p>" +
        "<ol>" +
        "<li><strong>Register</strong> as <em>attendee</em> or <em>presenter</em> (step 1).</li>" +
        "<li>Presenters: upload <strong>article</strong> (step 2) and <strong>PPT</strong> (step 3) by 16 Sep.</li>" +
        "<li>Use the <strong>catalogue</strong> and the <strong>agenda</strong> to follow talks.</li>" +
        "</ol>" +
        "<p>Ask me: attendee, presenter, article, PPT, catalogue or agenda. Section: <a href=\"#jornadas-ia\">Jornadas de IA</a>.</p>"
      );
    }
    return (
      "<p><strong>Flujo de las Jornadas de IA (6 oct. 2026)</strong></p>" +
      "<ol>" +
      "<li><strong>Inscripción</strong> como <em>asistente</em> o <em>expositor/a</em> (paso 1).</li>" +
      "<li>Si exponés: cargá <strong>artículo</strong> (paso 2) y <strong>PPT</strong> (paso 3) hasta el 16 de septiembre.</li>" +
      "<li>Consultá el <strong>catálogo</strong> y la <strong>agenda</strong> para seguir las ponencias.</li>" +
      "</ol>" +
      "<p>Preguntame por: asistente, expositor, artículo, PPT, catálogo o agenda. Sección: <a href=\"#jornadas-ia\">Jornadas de IA</a>.</p>"
    );
  }

  function htmlHerramientas() {
    if (lang() === "en") {
      return (
        "<p><strong>AI applications</strong> built by the Observatory are listed under <a href=\"#herramientas\">Aplicaciones IA</a>: Encuesta Clara, EvaluAR, MDeIA, SACAU, Señal Segura, FCV calendar, LUMEN, and more. Open each card for access or its instructivo PDF.</p>"
      );
    }
    return (
      "<p>Las <strong>Aplicaciones IA</strong> del Observatorio están en <a href=\"#herramientas\">Aplicaciones IA</a>: Encuesta Clara, EvaluAR, MDeIA, SACAU, Señal Segura, calendario FCV, LUMEN y más. Entrá a cada tarjeta para abrir la herramienta o su instructivo PDF.</p>"
    );
  }

  function htmlSemillero() {
    if (lang() === "en") {
      return (
        "<p><strong>SIA-UCCuyo Semillero</strong> — <a href=\"#semillero-ia\">section</a> and <a href=\"" +
        SEMILLERO_FORM +
        "\" target=\"_blank\" rel=\"noopener noreferrer\">registration form</a>.</p>"
      );
    }
    return (
      "<p><strong>Semillero SIA-UCCuyo</strong> — ver <a href=\"#semillero-ia\">Semillero de IA</a> y el <a href=\"" +
      SEMILLERO_FORM +
      "\" target=\"_blank\" rel=\"noopener noreferrer\">formulario de inscripción</a>.</p>"
    );
  }

  function htmlContacto() {
    if (lang() === "en") {
      return (
        "<p><strong>Contact:</strong> <a href=\"mailto:" +
        MAIL +
        "\">" +
        MAIL +
        "</a> · <a href=\"tel:+542644292300\">0264-4292300</a>. More in <a href=\"#contacto\">Contacto</a>.</p>"
      );
    }
    return (
      "<p><strong>Contacto:</strong> <a href=\"mailto:" +
      MAIL +
      "\">" +
      MAIL +
      "</a> · <a href=\"tel:+542644292300\">0264-4292300</a>. Más en <a href=\"#contacto\">Contacto</a>.</p>"
    );
  }

  function htmlFallback() {
    if (lang() === "en") {
      return (
        "<p>I can help most with <strong>Jornadas de IA</strong> (attendee/presenter, article, PPT, catalogue, agenda) and <strong>AI apps</strong>. If it is not on <a href=\"" +
        SITE +
        "\">this site</a>, write to <a href=\"mailto:" +
        MAIL +
        "\">" +
        MAIL +
        "</a>.</p>"
      );
    }
    return (
      "<p>Puedo ayudarte sobre todo con las <strong>Jornadas de IA</strong> (asistente/expositor, artículo, PPT, catálogo, agenda) y las <strong>Aplicaciones IA</strong>. Si no está en <a href=\"" +
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
        "<p>This is the <strong>Help desk</strong>. Most users ask about <strong>Jornadas de IA</strong> (registration, uploads, catalogue, agenda) and <strong>AI applications</strong>.</p>"
      );
    }
    return (
      "<p>Soy la <strong>Mesa de ayuda</strong>. Lo más consultado: <strong>Jornadas de IA</strong> (inscripción, cargas, catálogo, agenda) y <strong>Aplicaciones IA</strong>.</p>"
    );
  }

  var LABELS = {
    asistente: "bot.q.asistente",
    expositor: "bot.q.expositor",
    articulo: "bot.q.articulo",
    ppt: "bot.q.ppt",
    catalogo: "bot.q.catalogo",
    agenda: "bot.q.agenda",
    jornadas: "bot.q.jornadas",
    herramientas: "bot.q.herramientas",
    semillero: "bot.q.semillero",
    contacto: "bot.q.contacto"
  };

  var LABEL_FALLBACK = {
    asistente: "Inscribirme como asistente",
    expositor: "Inscribirme como expositor",
    articulo: "Cargar artículo científico",
    ppt: "Cargar PowerPoint",
    catalogo: "Usar el catálogo",
    agenda: "Usar la agenda",
    jornadas: "Flujo de las Jornadas",
    herramientas: "Aplicaciones IA",
    semillero: "Semillero de IA",
    contacto: "Contacto"
  };

  function renderFor(id) {
    if (id === "asistente") return htmlAsistente();
    if (id === "expositor") return htmlExpositor();
    if (id === "articulo") return htmlArticulo();
    if (id === "ppt") return htmlPpt();
    if (id === "catalogo") return htmlCatalogo();
    if (id === "agenda") return htmlAgenda();
    if (id === "jornadas") return htmlJornadas();
    if (id === "herramientas") return htmlHerramientas();
    if (id === "semillero") return htmlSemillero();
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
        '<button type="button" data-mesa-q="jornadas">' +
        t("bot.q.jornadas", LABEL_FALLBACK.jornadas) +
        "</button>" +
        '<button type="button" data-mesa-q="asistente">' +
        t("bot.q.asistente", LABEL_FALLBACK.asistente) +
        "</button>" +
        '<button type="button" data-mesa-q="expositor">' +
        t("bot.q.expositor", LABEL_FALLBACK.expositor) +
        "</button>" +
        '<button type="button" data-mesa-q="articulo">' +
        t("bot.q.articulo", LABEL_FALLBACK.articulo) +
        "</button>" +
        '<button type="button" data-mesa-q="ppt">' +
        t("bot.q.ppt", LABEL_FALLBACK.ppt) +
        "</button>" +
        '<button type="button" data-mesa-q="catalogo">' +
        t("bot.q.catalogo", LABEL_FALLBACK.catalogo) +
        "</button>" +
        '<button type="button" data-mesa-q="agenda">' +
        t("bot.q.agenda", LABEL_FALLBACK.agenda) +
        "</button>" +
        '<button type="button" data-mesa-q="herramientas">' +
        t("bot.q.herramientas", LABEL_FALLBACK.herramientas) +
        "</button>";
    }

    function ask(text, idHint) {
      var q = String(text || "").trim();
      var id = idHint || matchId(q);
      if (!q && !id) return;
      var label = q;
      if (!label) {
        label = t(LABELS[id] || "", LABEL_FALLBACK[id] || id);
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
