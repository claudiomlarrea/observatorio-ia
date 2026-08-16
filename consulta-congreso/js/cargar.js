(() => {
  const t = (key, vars) => (window.I18N && window.I18N.t ? window.I18N.t(key, vars) : key);
  let draft = null;
  let pdfFile = null;

  const els = {
    status: document.getElementById("load-status"),
    jsonFile: document.getElementById("json-file"),
    preview: document.getElementById("json-preview"),
    btnExample: document.getElementById("btn-example"),
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
    els.preview.textContent = `${normalized.meta.titulo}\n${normalized.sesiones.length} sesiones · tipos: ${Object.keys(
      normalized._derived.counts
    ).join(", ")}\natajos: ${normalized._derived.atajos.map((a) => a.tipo).join(", ") || "—"}`;
    setStatus("loader.statusOk", { n: normalized.sesiones.length });
    refreshPdfOptions(normalized);
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
    showPreview(await res.json());
  }

  els.jsonFile?.addEventListener("change", async () => {
    const file = els.jsonFile.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const raw = JSON.parse(text);
      showPreview(raw);
    } catch (err) {
      setStatus("loader.error", { msg: err.message || String(err) });
      draft = null;
    }
  });

  els.btnExample?.addEventListener("click", () => {
    loadExample().catch((err) => setStatus("loader.error", { msg: err.message || String(err) }));
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
      await window.CC_STORE.saveEvento(draft);
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
    els.preview.hidden = true;
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
