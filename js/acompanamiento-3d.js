/**
 * Escena 3D de Acompañamiento: parallax + clic lleva a la tarjeta.
 */
(function () {
  var root = document.getElementById("acompanamiento-scene");
  if (!root) return;

  var stage = root.querySelector("[data-scene-stage]");
  var panels = root.querySelectorAll(".acompanamiento-scene__panel[data-target]");
  var cards = document.querySelectorAll(".acompanamiento-card[id^='acomp-']");
  var clearTimer = 0;

  function highlightCard(id) {
    var target = document.getElementById(id);
    if (!target) return;

    for (var i = 0; i < cards.length; i++) {
      cards[i].classList.remove("is-spotlight");
    }
    for (var j = 0; j < panels.length; j++) {
      panels[j].classList.toggle(
        "is-active",
        panels[j].getAttribute("data-target") === id
      );
    }

    target.classList.add("is-spotlight");
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    try {
      target.focus({ preventScroll: true });
    } catch (_e) {
      target.focus();
    }

    if (clearTimer) window.clearTimeout(clearTimer);
    clearTimer = window.setTimeout(function () {
      target.classList.remove("is-spotlight");
    }, 2600);
  }

  for (var p = 0; p < panels.length; p++) {
    panels[p].addEventListener("click", function (e) {
      var id = e.currentTarget.getAttribute("data-target");
      if (id) highlightCard(id);
    });
  }

  var reduce =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || !stage) return;

  var baseRx = -18;
  var baseRy = 12;
  var targetRx = baseRx;
  var targetRy = baseRy;
  var curRx = baseRx;
  var curRy = baseRy;
  var raf = 0;
  var active = false;

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function paint() {
    curRx += (targetRx - curRx) * 0.12;
    curRy += (targetRy - curRy) * 0.12;
    stage.style.setProperty("--scene-rx", curRx.toFixed(2) + "deg");
    stage.style.setProperty("--scene-ry", curRy.toFixed(2) + "deg");
    if (
      Math.abs(targetRx - curRx) > 0.05 ||
      Math.abs(targetRy - curRy) > 0.05
    ) {
      raf = requestAnimationFrame(paint);
    } else {
      raf = 0;
    }
  }

  function kick() {
    if (!raf) raf = requestAnimationFrame(paint);
  }

  function onMove(clientX, clientY) {
    var rect = root.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    var nx = (clientX - rect.left) / rect.width - 0.5;
    var ny = (clientY - rect.top) / rect.height - 0.5;
    targetRx = clamp(baseRx + ny * -14, -28, -6);
    targetRy = clamp(baseRy + nx * 18, -8, 28);
    kick();
  }

  root.addEventListener(
    "pointerenter",
    function () {
      active = true;
    },
    { passive: true }
  );

  root.addEventListener(
    "pointermove",
    function (e) {
      if (!active && e.pointerType === "touch") return;
      onMove(e.clientX, e.clientY);
    },
    { passive: true }
  );

  root.addEventListener(
    "pointerleave",
    function () {
      active = false;
      targetRx = baseRx;
      targetRy = baseRy;
      kick();
    },
    { passive: true }
  );
})();
