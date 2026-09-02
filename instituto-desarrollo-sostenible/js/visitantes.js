(function () {
  var CFG = window.SEC_VISITANTES || {};
  var PUB = window.SEC_PUBLICACIONES || window.OBS_PUBLICACIONES || {};
  var root = document.getElementById("visitantes-widget");
  if (!root) return;

  var base = PUB.APPS_SCRIPT_URL && String(PUB.APPS_SCRIPT_URL).trim();
  var site = CFG.SITE && String(CFG.SITE).trim();
  if (!base || !site) return;

  var lastCount = null;

  function tt(key, fallback) {
    if (window.I18N && typeof window.I18N.t === "function") {
      var v = window.I18N.t(key);
      if (v && v !== key) return v;
    }
    return fallback;
  }

  function fmt(n) {
    var x = Number(n);
    if (!isFinite(x)) return "—";
    var loc =
      window.I18N && window.I18N.getLang && window.I18N.getLang() === "en"
        ? "en-US"
        : "es-AR";
    try {
      return x.toLocaleString(loc);
    } catch (e) {
      return String(x);
    }
  }

  function pintar(data) {
    if (!data || !data.ok || data.ids == null || Array.isArray(data.items)) return;
    lastCount = data.ids;
    root.hidden = false;
    root.innerHTML =
      '<a href="#visitas">' +
      tt("dyn.visitas.widget", "Visitas al Instituto:") +
      " <strong>" +
      fmt(data.ids) +
      "</strong></a>";
  }

  window.addEventListener("oia:langchange", function () {
    if (lastCount == null) return;
    pintar({ ok: true, ids: lastCount });
  });

  function fetchJson(url) {
    return fetch(url, { method: "GET" }).then(function (r) {
      if (!r.ok) throw new Error("network");
      return r.json();
    });
  }

  function fetchJsonp(url) {
    return new Promise(function (resolve, reject) {
      var name = "_visCb_" + Math.floor(Math.random() * 1e9);
      var done = false;
      var qs = url.indexOf("?") >= 0 ? "&" : "?";
      var script = document.createElement("script");
      window[name] = function (data) {
        if (done) return;
        done = true;
        delete window[name];
        if (script.parentNode) script.parentNode.removeChild(script);
        resolve(data);
      };
      script.async = true;
      script.src = url + qs + "callback=" + encodeURIComponent(name);
      script.onerror = function () {
        if (done) return;
        done = true;
        delete window[name];
        if (script.parentNode) script.parentNode.removeChild(script);
        reject(new Error("jsonp"));
      };
      document.body.appendChild(script);
      window.setTimeout(function () {
        if (done) return;
        script.onerror();
      }, 20000);
    });
  }

  var url =
    base +
    (base.indexOf("?") >= 0 ? "&" : "?") +
    "action=visit&site=" +
    encodeURIComponent(site) +
    "&_=" +
    Date.now();

  fetchJson(url).then(pintar, function () {
    fetchJsonp(url).then(pintar, function () {});
  });
})();
