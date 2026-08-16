/**
 * Persistencia local del evento cargado (IndexedDB + localStorage fallback).
 */
window.CC_STORE = (() => {
  const DB_NAME = "consulta-congreso";
  const DB_VER = 1;
  const STORE = "evento";
  const LS_KEY = "consulta_congreso_evento_v1";
  const LS_PDF_PREFIX = "consulta_congreso_pdf_";

  function openDb() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error("no-idb"));
        return;
      }
      const req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error("idb-open"));
    });
  }

  async function idbGet(key) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  }

  async function idbSet(key, value) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function idbDel(key) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function saveEvento(evento) {
    try {
      await idbSet("current", evento);
    } catch (_e) {
      localStorage.setItem(LS_KEY, JSON.stringify(evento));
    }
  }

  async function loadEvento() {
    try {
      const fromIdb = await idbGet("current");
      if (fromIdb) return fromIdb;
    } catch (_e) {}
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_e) {
      return null;
    }
  }

  async function clearEvento() {
    try {
      await idbDel("current");
    } catch (_e) {}
    try {
      localStorage.removeItem(LS_KEY);
    } catch (_e) {}
  }

  async function savePdfBlob(id, blob, filename) {
    const record = { id, filename, blob, type: blob.type || "application/pdf" };
    try {
      await idbSet(`pdf:${id}`, record);
    } catch (_e) {
      const buf = await blob.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let bin = "";
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
      }
      const b64 = btoa(bin);
      localStorage.setItem(
        LS_PDF_PREFIX + id,
        JSON.stringify({ filename, type: record.type, b64 })
      );
    }
  }

  async function loadPdfRecord(id) {
    try {
      const rec = await idbGet(`pdf:${id}`);
      if (rec?.blob) return rec;
    } catch (_e) {}
    try {
      const raw = localStorage.getItem(LS_PDF_PREFIX + id);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const bin = Uint8Array.from(atob(parsed.b64), (c) => c.charCodeAt(0));
      return {
        id,
        filename: parsed.filename,
        type: parsed.type,
        blob: new Blob([bin], { type: parsed.type }),
      };
    } catch (_e) {
      return null;
    }
  }

  async function pdfObjectUrl(id) {
    const rec = await loadPdfRecord(id);
    if (!rec?.blob) return "";
    return URL.createObjectURL(rec.blob);
  }

  return { saveEvento, loadEvento, clearEvento, savePdfBlob, loadPdfRecord, pdfObjectUrl };
})();
