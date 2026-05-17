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

  function checkSentFromQuery() {
    var params = new URLSearchParams(window.location.search);
    if (params.get("enviado") === "1") {
      setStatus(
        "ok",
        "Gracias. Recibimos tu mensaje y te responderemos a la brevedad."
      );
      cleanQueryParam("enviado");
    } else if (params.get("enviado") === "0") {
      setStatus(
        "error",
        "La página no pudo confirmar el envío. Si el mensaje ya llegó a observatorioia@uccuyo.edu.ar, podés ignorar este aviso. Si no llegó, usá «Escribir por correo» o intentá de nuevo."
      );
      cleanQueryParam("enviado");
    }
  }

  function cleanQueryParam(name) {
    if (!window.history.replaceState) return;
    var params = new URLSearchParams(window.location.search);
    params.delete(name);
    var qs = params.toString();
    var url =
      window.location.pathname +
      window.location.hash +
      (qs ? "?" + qs : "");
    window.history.replaceState({}, "", url);
  }

  checkSentFromQuery();

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();

    if (!form.reportValidity()) return;

    if (!endpoint) {
      mailtoFallback();
      return;
    }

    var payload = {
      action: "contact",
      nombre: form.nombre.value.trim(),
      apellido: form.apellido.value.trim(),
      email: form.email.value.trim(),
      telefono: form.telefono.value.trim(),
      mensaje: form.mensaje.value.trim(),
      _gotcha: form._gotcha ? form._gotcha.value : ""
    };

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Enviando…";
    }
    setStatus("pending", "Enviando tu mensaje…");

    fetch(endpoint, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        if (data && data.ok) {
          form.reset();
          setStatus(
            "ok",
            "Gracias. Recibimos tu mensaje y te responderemos a la brevedad."
          );
          return;
        }
        throw new Error((data && data.error) || "send_failed");
      })
      .catch(function () {
        setStatus(
          "error",
          "No pudimos confirmar el envío desde la web. Si no llega el correo a observatorioia@uccuyo.edu.ar en unos minutos, usá «Escribir por correo»."
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
