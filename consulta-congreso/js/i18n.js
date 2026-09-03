/**
 * i18n ES/EN — selector, localStorage y aplicación a [data-i18n].
 * Diccionario: window.I18N_DICT[key] = { es, en }
 */
(function () {
  var STORAGE_KEY = "consulta_congreso_lang";
  var dict = window.I18N_DICT || {};
  var lang = "es";

  function normalizeLang(code) {
    code = String(code || "").toLowerCase();
    if (code.indexOf("en") === 0) return "en";
    return "es";
  }

  function detectLang() {
    try {
      var params = new URLSearchParams(window.location.search || "");
      var q = String(params.get("lang") || "").toLowerCase();
      if (q === "es" || q === "en") return q;
    } catch (_e0) {}
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "es" || saved === "en") return saved;
    } catch (_e) {}
    var nav = (navigator.language || navigator.userLanguage || "es").toLowerCase();
    return normalizeLang(nav);
  }

  function t(key, vars) {
    var entry = dict[key];
    var text =
      entry && entry[lang] != null
        ? entry[lang]
        : entry && entry.es != null
          ? entry.es
          : key;
    if (vars && typeof vars === "object") {
      Object.keys(vars).forEach(function (k) {
        text = String(text).split("{" + k + "}").join(String(vars[k]));
      });
    }
    return text;
  }

  function setAttrTranslation(el) {
    var raw = el.getAttribute("data-i18n-attr");
    if (!raw) return;
    raw.split(",").forEach(function (pair) {
      var parts = pair.split(":").map(function (s) {
        return s.trim();
      });
      if (parts.length < 2) return;
      el.setAttribute(parts[0], t(parts[1]));
    });
  }

  function apply() {
    document.documentElement.lang = lang === "en" ? "en" : "es-AR";

    if (dict["meta.title"]) {
      document.title = t("meta.title");
    }
    var metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && dict["meta.description"]) {
      metaDesc.setAttribute("content", t("meta.description"));
    }

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (!key) return;
      if (el.hasAttribute("data-i18n-html")) {
        el.innerHTML = t(key);
      } else {
        el.textContent = t(key);
      }
    });

    document.querySelectorAll("[data-i18n-attr]").forEach(setAttrTranslation);

    document.querySelectorAll("[data-lang]").forEach(function (btn) {
      var active = btn.getAttribute("data-lang") === lang;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });

    try {
      window.dispatchEvent(
        new CustomEvent("oia:langchange", { detail: { lang: lang } })
      );
    } catch (_e2) {}
  }

  function setLang(next) {
    lang = normalizeLang(next);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (_e) {}
    apply();
  }

  function ensureSwitcher() {
    if (document.getElementById("lang-switcher")) return;
    var header = document.querySelector(".header-inner");
    if (!header) return;
    var wrap = document.createElement("div");
    wrap.id = "lang-switcher";
    wrap.className = "lang-switcher";
    wrap.setAttribute("role", "group");
    wrap.setAttribute("aria-label", t("a11y.langSwitcher"));
    wrap.innerHTML =
      '<button type="button" class="lang-switcher__btn" data-lang="es" aria-pressed="false" title="Español">' +
      '<span class="lang-switcher__flag" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 11" focusable="false"><rect width="16" height="11" fill="#74ACDF"/><rect y="3.67" width="16" height="3.66" fill="#fff"/><circle cx="8" cy="5.5" r="1.4" fill="#F6B40E"/></svg></span>' +
      '<span class="lang-switcher__code">ES</span></button>' +
      '<button type="button" class="lang-switcher__btn" data-lang="en" aria-pressed="false" title="English">' +
      '<span class="lang-switcher__flag" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30" focusable="false"><rect width="60" height="30" fill="#012169"/><path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" stroke-width="6"/><path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" stroke-width="4"/><path d="M30,0 V30 M0,15 H60" stroke="#fff" stroke-width="10"/><path d="M30,0 V30 M0,15 H60" stroke="#C8102E" stroke-width="6"/></svg></span>' +
      '<span class="lang-switcher__code">EN</span></button>';
    header.appendChild(wrap);
    wrap.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-lang]");
      if (!btn) return;
      setLang(btn.getAttribute("data-lang"));
    });
  }

  window.I18N = {
    t: t,
    getLang: function () {
      return lang;
    },
    setLang: setLang,
    apply: apply
  };

  lang = detectLang();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      ensureSwitcher();
      apply();
    });
  } else {
    ensureSwitcher();
    apply();
  }
})();
