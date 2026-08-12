import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const code = fs.readFileSync(path.join(root, "js/parser.js"), "utf8");
const ctx = {
  window: {},
  console,
  Math,
  Number,
  String,
  Object,
  Array,
  RegExp,
  Date,
  JSON,
  parseInt,
  isFinite: Number.isFinite,
};
ctx.global = ctx.window;
ctx.DOMParser = class {
  parseFromString() {
    return { body: { textContent: "" }, querySelectorAll: () => [] };
  }
};
vm.runInNewContext(code, ctx);
const P = ctx.window.SacauParser;

const fcm = P.parsePlanFromText(
  fs.readFileSync(path.join(root, "tests/fixtures/medicina_fcm_horas.txt"), "utf8"),
  {}
);
if (fcm.asignaturas.length < 55) throw new Error(`FCM: expected >=55, got ${fcm.asignaturas.length}`);
if (!fcm.asignaturas.every((a) => a.horas_teoricas + a.horas_practicas > 0)) {
  throw new Error("FCM: all subjects should have hours");
}
const pfo = fcm.asignaturas.find((a) => /pr[aá]ctica final/i.test(a.nombre));
if (!pfo || pfo.anio !== 6 || pfo.horas_teoricas !== 1400) {
  throw new Error("FCM: PFO year 6 / 1400h missing");
}

const uba = P.parsePlanFromText(
  fs.readFileSync(path.join(root, "tests/fixtures/medicina_correlativas.txt"), "utf8"),
  {}
);
if (uba.asignaturas.length < 20) throw new Error(`UBA-like: expected >=20 names, got ${uba.asignaturas.length}`);
if (!uba.asignaturas.some((a) => /anatom/i.test(a.nombre))) throw new Error("UBA-like: Anatomía missing");

console.log("ok", { fcm: fcm.asignaturas.length, uba: uba.asignaturas.length });
