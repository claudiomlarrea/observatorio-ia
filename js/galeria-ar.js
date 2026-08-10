/**
 * Proyección AR ligera para la galería: cámara trasera + imagen anclable.
 * Sin QR. Funciona en HTTPS (GitHub Pages) desde el celular/tablet.
 */
(function () {
  var root = null;
  var video = null;
  var plane = null;
  var hint = null;
  var stream = null;
  var pinned = false;
  var scale = 1;
  var posX = 0.5;
  var posY = 0.5;
  var pointers = {};
  var gesture = null;

  function ensureUi() {
    if (root) return;

    root = document.createElement("div");
    root.className = "gallery-ar";
    root.hidden = true;
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", "Proyectar imagen en el espacio");
    root.innerHTML =
      '<video class="gallery-ar-video" playsinline muted autoplay></video>' +
      '<div class="gallery-ar-stage">' +
      '  <img class="gallery-ar-plane" alt="" draggable="false" />' +
      "</div>" +
      '<div class="gallery-ar-ui">' +
      '  <p class="gallery-ar-hint"></p>' +
      '  <div class="gallery-ar-actions">' +
      '    <button type="button" class="gallery-ar-btn" data-ar-action="smaller" aria-label="Reducir">−</button>' +
      '    <button type="button" class="gallery-ar-btn gallery-ar-btn--primary" data-ar-action="pin">Fijar</button>' +
      '    <button type="button" class="gallery-ar-btn" data-ar-action="bigger" aria-label="Ampliar">+</button>' +
      '    <button type="button" class="gallery-ar-btn" data-ar-action="close">Cerrar</button>' +
      "  </div>" +
      "</div>";

    document.body.appendChild(root);
    video = root.querySelector(".gallery-ar-video");
    plane = root.querySelector(".gallery-ar-plane");
    hint = root.querySelector(".gallery-ar-hint");

    root.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-ar-action]");
      if (!btn) return;
      var action = btn.getAttribute("data-ar-action");
      if (action === "close") close();
      else if (action === "bigger") setScale(scale * 1.15);
      else if (action === "smaller") setScale(scale / 1.15);
      else if (action === "pin") togglePin();
    });

    var stage = root.querySelector(".gallery-ar-stage");
    stage.addEventListener("pointerdown", onPointerDown);
    stage.addEventListener("pointermove", onPointerMove);
    stage.addEventListener("pointerup", onPointerUp);
    stage.addEventListener("pointercancel", onPointerUp);
    stage.addEventListener(
      "wheel",
      function (e) {
        e.preventDefault();
        setScale(scale * (e.deltaY < 0 ? 1.08 : 1 / 1.08));
      },
      { passive: false }
    );

    document.addEventListener("keydown", function (e) {
      if (!root || root.hidden) return;
      if (e.key === "Escape") close();
    });
  }

  function setHint(text) {
    if (hint) hint.textContent = text;
  }

  function setScale(next) {
    scale = Math.max(0.35, Math.min(2.8, next));
    applyTransform();
  }

  function applyTransform() {
    if (!plane) return;
    plane.style.transform =
      "translate(-50%, -50%) translate(" +
      posX * 100 +
      "vw, " +
      posY * 100 +
      "vh) scale(" +
      scale +
      ")";
  }

  function updatePinButton() {
    var btn = root && root.querySelector('[data-ar-action="pin"]');
    if (!btn) return;
    btn.textContent = pinned ? "Mover" : "Fijar";
    plane.classList.toggle("is-pinned", pinned);
    setHint(
      pinned
        ? "Imagen fijada. Mové el dispositivo para mirarla en el entorno."
        : "Arrastrá la imagen, ajustá el tamaño y tocá Fijar."
    );
  }

  function togglePin() {
    pinned = !pinned;
    pointers = {};
    gesture = null;
    updatePinButton();
  }

  function activePointers() {
    return Object.keys(pointers).map(function (id) {
      return pointers[id];
    });
  }

  function distance(a, b) {
    var dx = a.x - b.x;
    var dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function onPointerDown(e) {
    if (pinned) return;
    if (e.target.closest && e.target.closest(".gallery-ar-ui")) return;
    e.preventDefault();
    stageCapture(e);
    pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
    var pts = activePointers();
    if (pts.length === 1) {
      gesture = {
        mode: "drag",
        originX: posX,
        originY: posY,
        startX: e.clientX,
        startY: e.clientY,
      };
    } else if (pts.length >= 2) {
      gesture = {
        mode: "pinch",
        startDist: distance(pts[0], pts[1]),
        startScale: scale,
      };
    }
  }

  function stageCapture(e) {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {
      /* ignore */
    }
  }

  function onPointerMove(e) {
    if (pinned || !pointers[e.pointerId]) return;
    pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
    var pts = activePointers();
    if (!gesture) return;

    if (gesture.mode === "pinch" && pts.length >= 2) {
      var dist = distance(pts[0], pts[1]);
      if (gesture.startDist > 0) {
        setScale(gesture.startScale * (dist / gesture.startDist));
      }
      return;
    }

    if (gesture.mode === "drag" && pts.length === 1) {
      var dx = (e.clientX - gesture.startX) / window.innerWidth;
      var dy = (e.clientY - gesture.startY) / window.innerHeight;
      posX = Math.max(0.08, Math.min(0.92, gesture.originX + dx));
      posY = Math.max(0.12, Math.min(0.82, gesture.originY + dy));
      applyTransform();
    }
  }

  function onPointerUp(e) {
    delete pointers[e.pointerId];
    var pts = activePointers();
    if (pts.length === 0) {
      gesture = null;
      return;
    }
    if (pts.length === 1) {
      gesture = {
        mode: "drag",
        originX: posX,
        originY: posY,
        startX: pts[0].x,
        startY: pts[0].y,
      };
    }
  }

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach(function (t) {
        t.stop();
      });
      stream = null;
    }
    if (video) {
      video.srcObject = null;
    }
  }

  function close() {
    if (!root) return;
    root.hidden = true;
    document.body.classList.remove("gallery-ar-open");
    stopCamera();
    pinned = false;
    pointers = {};
    gesture = null;
  }

  function open(imageUrl) {
    if (!imageUrl) return;
    if (!window.isSecureContext) {
      window.alert(
        "La proyección necesita HTTPS (o localhost). Abrí el sitio publicado desde el celular."
      );
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      window.alert(
        "Este dispositivo o navegador no permite usar la cámara desde la web."
      );
      return;
    }

    ensureUi();
    plane.src = imageUrl;
    plane.referrerPolicy = "no-referrer";
    scale = 1;
    posX = 0.5;
    posY = 0.42;
    pinned = false;
    pointers = {};
    gesture = null;
    applyTransform();
    updatePinButton();
    setHint("Pedimos acceso a la cámara…");

    root.hidden = false;
    document.body.classList.add("gallery-ar-open");

    navigator.mediaDevices
      .getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })
      .then(function (mediaStream) {
        stream = mediaStream;
        video.srcObject = stream;
        return video.play();
      })
      .then(function () {
        updatePinButton();
      })
      .catch(function () {
        close();
        window.alert(
          "No se pudo abrir la cámara. Revisá los permisos del navegador e intentá de nuevo."
        );
      });
  }

  window.OBS_GALERIA_AR = {
    open: open,
    close: close,
  };
})();
