/**
 * Contador global de programas de cátedra cargados en SACAU Aula.
 * Incrementa al armar un programa (elegir cátedra o cargar ficha JSON).
 */
(function (global) {
  "use strict";

  const STORAGE_TOTAL = "sacau_aula_programas_cargados_total";
  const STORAGE_LOCAL = "sacau_aula_programas_cargados_local";
  const DEBOUNCE_MS = 45 * 1000;

  let lastShown = null;

  function cfg() {
    return global.SACAU_USAGE || {};
  }

  function baseUrl() {
    const u = cfg().APPS_SCRIPT_URL && String(cfg().APPS_SCRIPT_URL).trim();
    return u || "";
  }

  function fmt(n) {
    const x = Number(n);
    if (!Number.isFinite(x)) return "—";
    try {
      return x.toLocaleString("es-AR");
    } catch (_) {
      return String(x);
    }
  }

  function readCache() {
    try {
      const n = parseInt(localStorage.getItem(STORAGE_TOTAL) || "0", 10);
      return Number.isFinite(n) && n >= 0 ? n : 0;
    } catch (_) {
      return 0;
    }
  }

  function writeCache(n) {
    try {
      localStorage.setItem(STORAGE_TOTAL, String(Math.max(0, Number(n) || 0)));
    } catch (_) {
      /* ignore */
    }
  }

  function bumpLocal() {
    try {
      const n = parseInt(localStorage.getItem(STORAGE_LOCAL) || "0", 10) || 0;
      localStorage.setItem(STORAGE_LOCAL, String(n + 1));
      return n + 1;
    } catch (_) {
      return 0;
    }
  }

  function paint(total, opts = {}) {
    const el = document.getElementById("sacauAulaUsageCount");
    const wrap = document.getElementById("sacauAulaUsage");
    if (!el) return;
    if (total == null || !Number.isFinite(Number(total))) return;
    lastShown = Number(total);
    el.textContent = fmt(lastShown);
    if (wrap) {
      wrap.hidden = false;
      wrap.dataset.source = opts.source || wrap.dataset.source || "cache";
      const hint = document.getElementById("sacauAulaUsageHint");
      if (hint) {
        hint.textContent =
          opts.source === "local"
            ? "en este navegador (el contador global se sincroniza al publicar Apps Script)"
            : "en total";
      }
    }
  }

  function fetchJson(url) {
    return fetch(url, { method: "GET", credentials: "omit", cache: "no-store" }).then((r) => {
      if (!r.ok) throw new Error("http " + r.status);
      return r.json();
    });
  }

  function fetchJsonp(url) {
    return new Promise((resolve, reject) => {
      const name = "_sacauAulaUsageCb" + Date.now() + Math.floor(Math.random() * 1e5);
      let done = false;
      const qs = url.indexOf("?") >= 0 ? "&" : "?";
      const script = document.createElement("script");
      global[name] = function (data) {
        if (done) return;
        done = true;
        try {
          delete global[name];
        } catch (_) {
          global[name] = undefined;
        }
        if (script.parentNode) script.parentNode.removeChild(script);
        resolve(data);
      };
      script.async = true;
      script.src = url + qs + "callback=" + encodeURIComponent(name);
      script.onerror = function () {
        if (done) return;
        done = true;
        try {
          delete global[name];
        } catch (_) {
          global[name] = undefined;
        }
        if (script.parentNode) script.parentNode.removeChild(script);
        reject(new Error("jsonp"));
      };
      document.body.appendChild(script);
      window.setTimeout(function () {
        if (!done) script.onerror();
      }, 20000);
    });
  }

  function callAction(action) {
    const base = baseUrl();
    if (!base) return Promise.reject(new Error("no_url"));
    const url =
      base +
      (base.indexOf("?") >= 0 ? "&" : "?") +
      "action=" +
      encodeURIComponent(action) +
      "&_=" +
      Date.now();
    return fetchJson(url).catch(function () {
      return fetchJsonp(url);
    });
  }

  function applyRemote(data, source) {
    if (!data || !data.ok || data.programas_cargados == null) {
      throw new Error("bad_payload");
    }
    const n = Number(data.programas_cargados);
    writeCache(n);
    paint(n, { source: source || "remote" });
    return n;
  }

  function refresh() {
    paint(readCache(), { source: "cache" });
    return callAction("sacau_aula_stats")
      .then(function (data) {
        return applyRemote(data, "remote");
      })
      .catch(function () {
        const cached = readCache();
        if (cached > 0) paint(cached, { source: "cache" });
        return cached;
      });
  }

  function debounceKey(meta) {
    const name = (meta && meta.name) || "";
    const extra = (meta && meta.extra) || "";
    return "sacau_aula_hit:" + name + ":" + extra;
  }

  function shouldCount(meta) {
    try {
      const key = debounceKey(meta);
      const prev = parseInt(sessionStorage.getItem(key) || "0", 10) || 0;
      const now = Date.now();
      if (prev && now - prev < DEBOUNCE_MS) return false;
      sessionStorage.setItem(key, String(now));
      return true;
    } catch (_) {
      return true;
    }
  }

  /**
   * Registrar un programa de cátedra cargado con éxito.
   * @param {{name?: string, extra?: string}} meta
   */
  function recordProgramaLoad(meta) {
    if (!shouldCount(meta || {})) {
      return Promise.resolve(lastShown != null ? lastShown : readCache());
    }
    bumpLocal();
    return callAction("sacau_aula_programa")
      .then(function (data) {
        return applyRemote(data, "remote");
      })
      .catch(function () {
        const next = Math.max(readCache(), lastShown || 0) + 1;
        writeCache(next);
        paint(next, { source: "local" });
        return next;
      });
  }

  function init() {
    paint(readCache(), { source: "cache" });
    refresh();
  }

  global.SacauAulaUsage = {
    init,
    refresh,
    recordProgramaLoad,
    paint,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window);
