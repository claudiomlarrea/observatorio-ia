(() => {
  const t = (key, vars) => (window.I18N && window.I18N.t ? window.I18N.t(key, vars) : key);
  let draft = null;
  let pdfFile = null;
  const excelSources = [];

  const els = {
    status: document.getElementById("load-status"),
    jsonFile: document.getElementById("json-file"),
    excelFile: document.getElementById("excel-file"),
    excelList: document.getElementById("excel-list"),
    preview: document.getElementById("json-preview"),
    btnExample: document.getElementById("btn-example"),
    btnExcelSamples: document.getElementById("btn-excel-samples"),
    pdfId: document.getElementById("pdf-id"),
    pdfCustom: document.getElementById("pdf-id-custom"),
    pdfFile: document.getElementById("pdf-file"),
    btnSavePdf: document.getElementById("btn-save-pdf"),
    pdfList: document.getElementById("pdf-list"),
    btnApply: document.getElementById("btn-apply"),
    btnClear: document.getElementById("btn-clear"),
  };

  function setStatus(key, vars) {
    els.status.setAttribute("data-i18n", key);
    els.status.textContent = t(key, vars);
  }

  function showPreview(raw) {
    const normalized = window.CC_NORMALIZE.normalize(raw);
    draft = raw;
    els.preview.hidden = false;
    const warn =
      Array.isArray(raw._importWarnings) && raw._importWarnings.length
        ? `\n⚠ ${raw._importWarnings.join(" · ")}`
        : "";
    els.preview.textContent = `${normalized.meta.titulo}\n${normalized.sesiones.length} sesiones · tipos: ${Object.keys(
      normalized._derived.counts
    ).join(", ")}\natajos: ${normalized._derived.atajos.map((a) => a.tipo).join(", ") || "—"}${warn}`;
    setStatus("loader.statusOk", { n: normalized.sesiones.length });
    refreshPdfOptions(normalized);
    renderExcelList();
  }

  function renderExcelList() {
    if (!els.excelList) return;
    if (!excelSources.length) {
      els.excelList.innerHTML = "";
      return;
    }
    els.excelList.innerHTML = excelSources
      .map(
        (s) =>
          `<li><strong>${escapeHtml(s.name)}</strong> · ${s.count} sesiones${
            s.eje ? ` · ${escapeHtml(s.eje)}` : ""
          }</li>`
      )
      .join("");
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function refreshPdfOptions(normalized) {
    const ids = (normalized?.meta?.descargas || []).map((d) => d.id);
    const base = ["programa", "talleres", "posters", ...ids];
    const uniq = [...new Set(base.filter(Boolean))];
    els.pdfId.innerHTML =
      uniq.map((id) => `<option value="${id}">${id}</option>`).join("") +
      `<option value="otro">otro…</option>`;
  }

  async function refreshPdfList() {
    const ids = ["programa", "talleres", "posters"];
    if (draft?.meta?.descargas) {
      for (const d of draft.meta.descargas) if (d.id) ids.push(d.id);
    }
    const uniq = [...new Set(ids)];
    const lines = [];
    for (const id of uniq) {
      const rec = await window.CC_STORE.loadPdfRecord(id);
      if (rec) lines.push(`<li><strong>${id}</strong> · ${rec.filename || "PDF"}</li>`);
    }
    els.pdfList.innerHTML = lines.join("") || "<li>—</li>";
  }

  async function loadExample() {
    const res = await fetch("data/evento.ejemplo.json?v=1", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    excelSources.length = 0;
    showPreview(await res.json());
  }

  async function importExcelFiles(files) {
    if (!files?.length) return;
    if (!window.CC_EXCEL) throw new Error("Módulo Excel no disponible");
    const opts = window.CC_EXCEL.optsFromDraft(draft);
    const imports = [];
    for (const file of files) {
      const imp = await window.CC_EXCEL.readFile(file, opts);
      imports.push(imp);
      excelSources.push({
        name: file.name,
        count: imp.sessions.length,
        eje: imp.eje?.nombre || "",
      });
    }
    const event = window.CC_EXCEL.buildEventFromImports(imports, draft);
    showPreview(event);
  }

  async function importExcelSamples() {
    if (!window.CC_EXCEL) throw new Error("Módulo Excel no disponible");
    const opts = window.CC_EXCEL.optsFromDraft(draft);
    const urls = [
      "assets/samples/CH_Trabajos_Ciencias_Humanas.xlsx",
      "assets/samples/CS_Trabajos_Ciencias_Sociales.xlsx",
    ];
    const imports = [];
    for (const url of urls) {
      const imp = await window.CC_EXCEL.readUrl(url, opts);
      imports.push(imp);
      excelSources.push({
        name: url.split("/").pop(),
        count: imp.sessions.length,
        eje: imp.eje?.nombre || "",
      });
    }
    const event = window.CC_EXCEL.buildEventFromImports(imports, draft);
    showPreview(event);
  }

  els.excelFile?.addEventListener("change", async () => {
    const files = [...(els.excelFile.files || [])];
    els.excelFile.value = "";
    if (!files.length) return;
    try {
      await importExcelFiles(files);
    } catch (err) {
      setStatus("loader.error", { msg: err.message || String(err) });
    }
  });

  els.btnExcelSamples?.addEventListener("click", () => {
    importExcelSamples().catch((err) => setStatus("loader.error", { msg: err.message || String(err) }));
  });

  els.jsonFile?.addEventListener("change", async () => {
    const file = els.jsonFile.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const raw = JSON.parse(text);
      excelSources.length = 0;
      showPreview(raw);
    } catch (err) {
      setStatus("loader.error", { msg: err.message || String(err) });
      draft = null;
    }
  });

  els.btnExample?.addEventListener("click", () => {
    loadExample().catch((err) => setStatus("loader.error", { msg: err.message || String(err) }));
  });

  document.getElementById("btn-radu")?.addEventListener("click", () => {
    fetch("data/evento.radu-larioja-2026.json?v=1", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((raw) => {
        excelSources.length = 0;
        showPreview(raw);
      })
      .catch((err) => setStatus("loader.error", { msg: err.message || String(err) }));
  });

  els.pdfId?.addEventListener("change", () => {
    els.pdfCustom.hidden = els.pdfId.value !== "otro";
  });

  els.pdfFile?.addEventListener("change", () => {
    pdfFile = els.pdfFile.files?.[0] || null;
  });

  els.btnSavePdf?.addEventListener("click", async () => {
    const id =
      els.pdfId.value === "otro"
        ? (els.pdfCustom.value || "").trim()
        : els.pdfId.value;
    if (!id || !pdfFile) {
      setStatus("loader.error", { msg: "faltan id o PDF" });
      return;
    }
    await window.CC_STORE.savePdfBlob(id, pdfFile, pdfFile.name);
    if (draft) {
      draft.meta = draft.meta || {};
      draft.meta.descargas = Array.isArray(draft.meta.descargas) ? draft.meta.descargas : [];
      const existing = draft.meta.descargas.find((d) => d.id === id);
      if (existing) {
        existing.href = existing.href || "";
      } else {
        draft.meta.descargas.push({
          id,
          label: `Descargar ${id} (PDF)`,
          labelEn: `Download ${id} (PDF)`,
          href: "",
        });
      }
    }
    pdfFile = null;
    els.pdfFile.value = "";
    await refreshPdfList();
  });

  els.btnApply?.addEventListener("click", async () => {
    if (!draft) {
      setStatus("loader.statusEmpty");
      return;
    }
    try {
      window.CC_NORMALIZE.normalize(draft);
      const toSave = { ...draft };
      delete toSave._importWarnings;
      await window.CC_STORE.saveEvento(toSave);
      window.location.href = "./";
    } catch (err) {
      setStatus("loader.error", { msg: err.message || String(err) });
    }
  });

  els.btnClear?.addEventListener("click", async () => {
    await window.CC_STORE.clearEvento();
    try {
      localStorage.removeItem("consulta_congreso_app_backup");
    } catch (_e) {}
    draft = null;
    excelSources.length = 0;
    els.preview.hidden = true;
    renderExcelList();
    setStatus("loader.statusCleared");
    await refreshPdfList();
  });

  (async () => {
    const current = await window.CC_STORE.loadEvento();
    if (current) {
      try {
        showPreview(current);
      } catch (_e) {}
    }
    await refreshPdfList();
  })();
})();
