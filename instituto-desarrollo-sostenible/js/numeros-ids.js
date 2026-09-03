/**
 * Completa «El IDS en números» contando lo que ya está en el sitio.
 */
(function () {
  var ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };

  function biblioBy(cat) {
    var items = ((window.IDS_BIBLIOTECA || {}).items || []);
    return items.filter(function (it) {
      return it.categoria === cat;
    }).length;
  }

  function factNumber(name) {
    var el = document.querySelector("[data-ids-fact='" + name + "']");
    if (!el) return 0;
    var raw = el.getAttribute("data-ids-value") || el.textContent || "";
    var n = parseInt(String(raw).replace(/[^\d]/g, ""), 10);
    if (n) return n;
    var roman = String(el.textContent || "").match(/\b(X|IX|IV|V?I{1,3})\b/);
    if (roman && ROMAN[roman[1]]) return ROMAN[roman[1]];
    var ordinal = String(el.textContent || "").match(/\b(\d+)\s*(?:st|nd|rd|th)\b/i);
    if (ordinal) return parseInt(ordinal[1], 10);
    return 0;
  }

  function sumAdds(name) {
    var total = 0;
    var found = 0;
    document.querySelectorAll("[data-ids-add='" + name + "']").forEach(function (el) {
      var n = parseInt(String(el.textContent || "").replace(/[^\d]/g, ""), 10);
      if (!n) return;
      total += n;
      found += 1;
    });
    return { total: total, found: found };
  }

  function fmt(n, plus) {
    if (!n) return "—";
    return plus ? n + "+" : String(n);
  }

  function pintar() {
    var root = document.getElementById("ids-numeros");
    if (!root) return;

    var books = biblioBy("libros");
    var pubs = biblioBy("articulos") + biblioBy("capitulos");
    var congress = biblioBy("reuniones");
    var researchers = document.querySelectorAll("#equipo article.card").length;
    var networks = document.querySelectorAll("#vinculacion .check-list li").length;
    var projects =
      document.querySelectorAll("#investigacion tbody tr").length +
      document.querySelectorAll("#investigacion [data-ids-item='project']").length;
    var trained = sumAdds("trained");
    var trainedRows = document.querySelectorAll("#docencia tbody tr").length;
    var reviewers = factNumber("reviewers");
    var theses = factNumber("theses");
    var editions = factNumber("editions");

    var values = {
      pubs: fmt(pubs),
      books: fmt(books),
      congress: fmt(congress),
      projects: fmt(projects),
      trained: fmt(trained.total, trainedRows > trained.found),
      researchers: fmt(researchers),
      reviewers: fmt(reviewers),
      theses: fmt(theses),
      networks: fmt(networks),
      editions: fmt(editions)
    };

    root.querySelectorAll("[data-stat]").forEach(function (el) {
      var key = el.getAttribute("data-stat");
      var b = el.querySelector("b");
      if (b && values[key] != null) b.textContent = values[key];
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", pintar);
  } else {
    pintar();
  }
  window.addEventListener("oia:langchange", pintar);
})();
