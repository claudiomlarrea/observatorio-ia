(function () {
  var form = document.querySelector("#contacto form.simple-form");
  if (!form) return;

  var statusEl = document.getElementById("contact-form-status");
  var submitBtn = form.querySelector('button[type="submit"]');
  var config = window.OBS_PUBLICACIONES || {};
  var endpoint = config.APPS_SCRIPT_URL;

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

  function buildPayload() {
    return {
      action: "contact",
      _iframe: "1",
      nombre: form.nombre.value.trim(),
      apellido: form.apellido.value.trim(),
      email: form.email.value.trim(),
      telefono: form.telefono.value.trim(),
      mensaje: form.mensaje.value.trim(),
      _gotcha: form._gotcha ? form._gotcha.value : ""
    };
  }

  function sendViaFormPost(payload) {
    return new Promise(function (resolve, reject) {
      var iframeName = "obs-contact-send-frame";
      var frame = document.getElementById(iframeName);
      if (!frame) {
        frame = document.createElement("iframe");
        frame.id = iframeName;
        frame.name = iframeName;
        frame.title = "Envío de consulta";
        frame.setAttribute("aria-hidden", "true");
        frame.style.cssText =
          "position:absolute;width:0;height:0;border:0;visibility:hidden";
        document.body.appendChild(frame);
      }

      var temp = document.createElement("form");
      temp.method = "POST";
      temp.action = endpoint;
      temp.target = iframeName;
      temp.style.display = "none";

      Object.keys(payload).forEach(function (key) {
        var input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = payload[key] == null ? "" : String(payload[key]);
        temp.appendChild(input);
      });

      var done = false;
      function finish(ok) {
        if (done) return;
        done = true;
        window.removeEventListener("message", onMessage);
        if (temp.parentNode) temp.parentNode.removeChild(temp);
        if (ok) resolve();
        else reject(new Error("send_failed"));
      }

      function onMessage(ev) {
        if (!ev.data || ev.data.obsContact == null) return;
        if (String(ev.data.obsContact) === "1") finish(true);
        else finish(false);
      }

      window.addEventListener("message", onMessage);
      document.body.appendChild(temp);
      temp.submit();

      window.setTimeout(function () {
        finish(false);
      }, 20000);
    });
  }

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();

    if (!form.reportValidity()) return;

    if (!endpoint) {
      mailtoFallback();
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Enviando…";
    }
    setStatus("pending", "Enviando tu mensaje…");

    sendViaFormPost(buildPayload())
      .then(function () {
        form.reset();
        setStatus(
          "ok",
          "Gracias. Recibimos tu mensaje y te responderemos al correo que indicaste."
        );
      })
      .catch(function () {
        setStatus(
          "error",
          "No pudimos enviar el mensaje desde la web. Usá el botón «Escribir por correo» (abre tu correo con el texto listo) o escribinos a observatorioia@uccuyo.edu.ar."
        );
      })
      .finally(function () {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Enviar";
        }
      });
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
