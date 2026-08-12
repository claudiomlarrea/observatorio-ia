/**
 * OCR de PDF escaneados (Tesseract.js) + reconstrucción de texto por página.
 */
(function (global) {
  "use strict";

  function setProgress(cb, payload) {
    if (typeof cb === "function") cb(payload);
  }

  async function renderPageToCanvas(page, scale) {
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    await page.render({ canvasContext: ctx, viewport }).promise;
    // Preprocess: boost contrast for stamps/tables
    try {
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        const v = g < 150 ? 0 : 255;
        d[i] = d[i + 1] = d[i + 2] = v;
      }
      ctx.putImageData(img, 0, 0);
    } catch (_) {
      /* ignore */
    }
    return canvas;
  }

  async function createWorker(logger) {
    if (!global.Tesseract) throw new Error("Tesseract.js no está disponible");
    const worker = await global.Tesseract.createWorker("spa", 1, {
      logger,
    });
    await worker.setParameters({
      tessedit_pageseg_mode: global.Tesseract.PSM
        ? global.Tesseract.PSM.SINGLE_BLOCK
        : "6",
      preserve_interword_spaces: "1",
    });
    return worker;
  }

  /**
   * Une palabras OCR en filas por coordenada Y.
   */
  function wordsToLines(words, yTol = 12) {
    const usable = (words || [])
      .filter((w) => (w.text || "").trim() && (w.confidence == null || w.confidence > 35))
      .map((w) => {
        const b = w.bbox || {};
        return {
          text: String(w.text).trim(),
          x0: b.x0 ?? 0,
          y0: b.y0 ?? 0,
          x1: b.x1 ?? 0,
          y1: b.y1 ?? 0,
          yc: ((b.y0 ?? 0) + (b.y1 ?? 0)) / 2,
        };
      })
      .sort((a, b) => a.yc - b.yc || a.x0 - b.x0);

    const lines = [];
    for (const w of usable) {
      if (!lines.length || Math.abs(lines[lines.length - 1].yc - w.yc) > yTol) {
        lines.push({ yc: w.yc, words: [w] });
      } else {
        const line = lines[lines.length - 1];
        line.words.push(w);
        line.yc = line.words.reduce((s, x) => s + x.yc, 0) / line.words.length;
      }
    }
    return lines.map((line) => {
      line.words.sort((a, b) => a.x0 - b.x0);
      return line.words.map((w) => w.text).join(" ");
    });
  }

  async function ocrPdfArrayBuffer(arrayBuffer, options = {}) {
    const onProgress = options.onProgress;
    if (!global.pdfjsLib) throw new Error("PDF.js no está disponible");

    const pdf = await global.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const maxPages = Math.min(pdf.numPages, options.maxPages || 40);
    const scale = options.scale || 1.8;

    setProgress(onProgress, {
      phase: "ocr",
      message: `PDF escaneado detectado (${pdf.numPages} páginas). Iniciando OCR…`,
      current: 0,
      total: maxPages,
    });

    const worker = await createWorker((m) => {
      if (m.status === "recognizing text" && m.progress != null) {
        setProgress(onProgress, {
          phase: "ocr-page",
          message: `OCR en curso… ${Math.round(m.progress * 100)}%`,
          progress: m.progress,
        });
      }
    });

    const pageTexts = [];
    try {
      for (let i = 1; i <= maxPages; i++) {
        setProgress(onProgress, {
          phase: "ocr",
          message: `Leyendo página ${i} de ${maxPages} (OCR)…`,
          current: i,
          total: maxPages,
        });
        const page = await pdf.getPage(i);
        const canvas = await renderPageToCanvas(page, scale);
        const result = await worker.recognize(canvas);
        const lineText = wordsToLines(result.data.words || []).join("\n");
        const fallback = result.data.text || "";
        pageTexts.push(`===== PÁGINA ${i} =====\n${lineText || fallback}`);
      }
    } finally {
      await worker.terminate();
    }

    setProgress(onProgress, {
      phase: "done",
      message: "OCR finalizado. Interpretando plan…",
      current: maxPages,
      total: maxPages,
    });

    return {
      text: pageTexts.join("\n"),
      pages: maxPages,
      totalPages: pdf.numPages,
    };
  }

  /**
   * ¿El PDF parece escaneado? (casi sin texto extraíble)
   */
  async function pdfNeedsOcr(arrayBuffer, samplePages = 3) {
    if (!global.pdfjsLib) return true;
    const pdf = await global.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let chars = 0;
    const n = Math.min(pdf.numPages, samplePages);
    for (let i = 1; i <= n; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      chars += content.items.map((it) => it.str || "").join("").trim().length;
    }
    return chars < 80;
  }

  global.SacauOcr = {
    ocrPdfArrayBuffer,
    pdfNeedsOcr,
    wordsToLines,
  };
})(window);
