(() => {
  const t = (key) => (window.I18N && window.I18N.t ? window.I18N.t(key) : key);
  let deferredPrompt = null;

  function ensureInstallUi() {
    if (document.getElementById("install-bar")) return;
    const bar = document.createElement("div");
    bar.id = "install-bar";
    bar.className = "install-bar";
    bar.hidden = true;
    bar.innerHTML = `
      <div class="install-bar-inner">
        <p class="install-bar-text" data-i18n="install.barText">Agregá la app a tu pantalla de inicio</p>
        <div class="install-bar-actions">
          <button type="button" class="install-btn" id="install-btn" data-i18n="install.barCta">Instalar</button>
          <a class="install-help" href="instalar.html" data-i18n="install.howTo">¿Cómo se hace?</a>
          <button type="button" class="install-dismiss" id="install-dismiss" aria-label="Cerrar">×</button>
        </div>
      </div>
    `;
    document.body.appendChild(bar);

    document.getElementById("install-btn").addEventListener("click", async () => {
      if (!deferredPrompt) {
        window.location.href = "instalar.html";
        return;
      }
      deferredPrompt.prompt();
      try {
        await deferredPrompt.userChoice;
      } catch (_e) {}
      deferredPrompt = null;
      bar.hidden = true;
    });

    document.getElementById("install-dismiss").addEventListener("click", () => {
      bar.hidden = true;
      try {
        sessionStorage.setItem("caem_install_dismissed", "1");
      } catch (_e) {}
    });
  }

  function showBar() {
    try {
      if (sessionStorage.getItem("caem_install_dismissed") === "1") return;
    } catch (_e) {}
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if (window.navigator.standalone === true) return;
    const bar = document.getElementById("install-bar");
    if (bar) bar.hidden = false;
    if (window.I18N && window.I18N.apply) window.I18N.apply();
  }

  function registerSW() {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("./sw.js").catch((err) => {
      console.warn("SW register failed", err);
    });
  }

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    ensureInstallUi();
    showBar();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      ensureInstallUi();
      registerSW();
      // iOS / browsers without beforeinstallprompt: still offer help link subtly
      setTimeout(() => {
        if (!deferredPrompt) {
          ensureInstallUi();
          // On iPhone show help bar once
          const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
          if (isIos) showBar();
        }
      }, 1200);
    });
  } else {
    ensureInstallUi();
    registerSW();
  }

  window.CAEM_INSTALL = {
    getPrompt: () => deferredPrompt,
    openGuide: () => {
      window.location.href = "instalar.html";
    }
  };
})();
