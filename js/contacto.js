(function () {
  var form = document.querySelector("#contacto form.simple-form");
  if (!form) return;

  var statusEl = document.getElementById("contact-form-status");
  var submitBtn = form.querySelector('button[type="submit"]');
  var config = window.OBS_PUBLICACIONES || {};
  var endpoint = config.APPS_SCRIPT_URL;
  var iframeName = "obs-contact-frame";
  var submitPending = false;

  function setStatus(kind, message) {
    if (!statusEl) return;
    statusEl.hidden = false;
    statusEl.className = "form-status form-status--" + kind;
    statusEl.textContent = message;
  }

  function mailtoFallback() {
    var nombre = (form.nombre && form.nombre.value) || "";
    var apellido = (form.apellido && form.apellido.value) || "";
    var email = (form.email && form.email.value) || "";
    var telefono = (form.telefono && form.telefono.value) || "";
    var mensaje = (form.mensaje && form.mensaje.value) || "";
    var subject = encodeURIComponent("[Observatorio IA] Consulta desde la web");
    var body = encodeURIComponent(
      [
        "Nombre: " + nombre + " " + apellido,
        "Email: " + email,
        "Teléfono: " + (telefono || "(no indicado)"),
        "",
        mensaje
      ].join("\n")
    );
    window.location.href =
      "mailto:observatorioia@uccuyo.edu.ar?subject=" + subject + "&body=" + body;
  }

  function ensureHidden(name, value) {
    var input = form.querySelector('input[name="' + name + '"]');
    if (!input) {
      input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      form.appendChild(input);
    }
    input.value = value;
  }

  function ensureIframe() {
    var frame = document.getElementById(iframeName);
    if (frame) return frame;
    frame = document.createElement("iframe");
    frame.id = iframeName;
    frame.name = iframeName;
    frame.title = "Envío de consulta";
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText =
      "position:absolute;width:0;height:0;border:0;visibility:hidden";
    document.body.appendChild(frame);
    return frame;
  }

  function resetSubmitUi() {
    submitPending = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Enviar";
    }
  }

  window.addEventListener("message", function (ev) {
    if (!submitPending) return;
    if (!ev.data || ev.data.obsContact == null) return;
    var fromGoogle =
      typeof ev.origin === "string" &&
      (ev.origin.indexOf("https://script.google.com") === 0 ||
        ev.origin.indexOf("https://script.googleusercontent.com") === 0);
    if (!fromGoogle) return;

    resetSubmitUi();
    if (String(ev.data.obsContact) === "1") {
      form.reset();
      setStatus(
        "ok",
        "Gracias. Recibimos tu mensaje y te responderemos a la brevedad."
      );
    } else {
      setStatus(
        "error",
        "No pudimos enviar el mensaje. Probá «Escribir por correo» o intentá en unos minutos."
      );
    }
  });

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();

    if (!form.reportValidity()) return;

    if (!endpoint) {
      mailtoFallback();
      return;
    }

    ensureIframe();
    form.method = "POST";
    form.action = endpoint;
    form.target = iframeName;
    ensureHidden("action", "contact");
    ensureHidden("_iframe", "1");

    submitPending = true;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Enviando…";
    }
    setStatus("pending", "Enviando tu mensaje…");

    form.submit();

    window.setTimeout(function () {
      if (!submitPending) return;
      resetSubmitUi();
      setStatus(
        "error",
        "El envío tardó demasiado. Si no llega el correo a observatorioia@uccuyo.edu.ar, usá «Escribir por correo»."
      );
    }, 25000);
  });

  var mailBtn = document.getElementById("contact-mailto-btn");
  if (mailBtn) {
    mailBtn.addEventListener("click", function (ev) {
      ev.preventDefault();
      if (!form.reportValidity()) return;
      mailtoFallback();
    });
  }
})();
