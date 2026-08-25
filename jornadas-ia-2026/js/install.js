(() => {
  const t = (key) => (window.I18N && window.I18N.t ? window.I18N.t(key) : key);
  let deferredPrompt = null;
  const isInstallPage = document.body.classList.contains("install-page");

  function isStandalone() {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true
    );
  }

  function isIos() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
  }

  function setStatus(key) {
    const status = document.getElementById("install-cta-status");
    if (!status) return;
    status.setAttribute("data-i18n", key);
    status.textContent = t(key);
  }

  function refreshPageCta() {
    const btn = document.getElementById("install-page-cta");
    if (!btn) return;

    if (isStandalone()) {
      btn.disabled = true;
      btn.textContent = t("install.ctaInstalled");
      btn.setAttribute("data-i18n", "install.ctaInstalled");
      setStatus("install.ctaInstalledHint");
      return;
    }

    btn.disabled = false;
    btn.textContent = t("install.barCta");
    btn.setAttribute("data-i18n", "install.barCta");

    if (deferredPrompt) {
      setStatus("install.ctaHint");
    } else if (isIos()) {
      setStatus("install.ctaIosHint");
    } else {
      setStatus("install.ctaManualHint");
    }
  }

  async function promptInstall() {
    if (isStandalone()) {
      setStatus("install.ctaInstalledHint");
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      try {
        await deferredPrompt.userChoice;
      } catch (_e) {}
      deferredPrompt = null;
      const bar = document.getElementById("install-bar");
      if (bar) bar.hidden = true;
      refreshPageCta();
      return;
    }

    const target = isIos()
      ? document.getElementById("ios")
      : document.getElementById("pasos") || document.getElementById("android");
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      target.classList.add("is-highlight");
      setTimeout(() => target.classList.remove("is-highlight"), 2200);
    }
    setStatus(isIos() ? "install.ctaIosHint" : "install.ctaManualHint");
  }

  function ensureInstallUi() {
    if (isInstallPage) return;
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

    document.getElementById("install-btn").addEventListener("click", () => {
      promptInstall();
    });

    document.getElementById("install-dismiss").addEventListener("click", () => {
      bar.hidden = true;
      try {
        sessionStorage.setItem("jornadas_ia_install_dismissed", "1");
      } catch (_e) {}
    });
  }

  function showBar() {
    if (isInstallPage) return;
    try {
      if (sessionStorage.getItem("jornadas_ia_install_dismissed") === "1") return;
    } catch (_e) {}
    if (isStandalone()) return;
    const bar = document.getElementById("install-bar");
    if (bar) bar.hidden = false;
    if (window.I18N && window.I18N.apply) window.I18N.apply();
  }

  function bindPageCta() {
    const btn = document.getElementById("install-page-cta");
    if (!btn || btn.dataset.bound === "1") return;
    btn.dataset.bound = "1";
    btn.addEventListener("click", () => {
      promptInstall();
    });
    refreshPageCta();
  }

  function registerSW() {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("./sw.js", { updateViaCache: "none" })
      .then((reg) => {
        try {
          reg.update();
        } catch (_e) {}
      })
      .catch((err) => {
        console.warn("SW register failed", err);
      });
  }

  function syncOfflineBanner() {
    const banner = document.getElementById("offline-banner");
    const offline = !navigator.onLine;
    document.body.classList.toggle("is-offline", offline);
    if (banner) {
      banner.hidden = !offline;
      if (offline && window.I18N && window.I18N.apply) window.I18N.apply();
    }
  }

  function bindConnectivity() {
    window.addEventListener("online", syncOfflineBanner);
    window.addEventListener("offline", syncOfflineBanner);
    syncOfflineBanner();
  }

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    ensureInstallUi();
    showBar();
    refreshPageCta();
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    const bar = document.getElementById("install-bar");
    if (bar) bar.hidden = true;
    refreshPageCta();
  });

  function boot() {
    ensureInstallUi();
    bindPageCta();
    bindConnectivity();
    registerSW();
    refreshPageCta();
    setTimeout(() => {
      if (!deferredPrompt && !isInstallPage) {
        ensureInstallUi();
        if (isIos()) showBar();
      }
      refreshPageCta();
      syncOfflineBanner();
    }, 1200);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  window.JORNADAS_IA_INSTALL = {
    getPrompt: () => deferredPrompt,
    promptInstall,
    openGuide: () => {
      window.location.href = "instalar.html";
    },
  };
})();
