#!/usr/bin/env node
/**
 * Captura pantallas reales del convertidor y arma assets/sacau-cre-demo-45s.mp4 (~45 s).
 * Uso: node scripts/capture_sacau_demo_video.mjs
 */
import { spawn } from "node:child_process";
import { mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "assets", "sacau-demo-frames");
const OUT_MP4 = path.join(ROOT, "assets", "sacau-cre-demo-45s.mp4");
const PORT = 8765;
const CHROME =
  process.env.CHROME_PATH ||
  "/usr/bin/google-chrome" ||
  "/usr/local/bin/google-chrome";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function startServer() {
  const child = spawn("python3", ["-m", "http.server", String(PORT), "--bind", "127.0.0.1"], {
    cwd: ROOT,
    stdio: "ignore",
  });
  return child;
}

async function shot(page, name, opts = {}) {
  const file = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({
    path: file,
    fullPage: false,
    type: "png",
    ...opts,
  });
  return file;
}

async function main() {
  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });

  const server = startServer();
  await sleep(600);

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1440,900"],
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
  });

  try {
    const page = await browser.newPage();
    const url =
      `http://127.0.0.1:${PORT}/sacau/convertidor.html` +
      `?acceso=observatorio-demo&ejemplo=psicologia&v=demo`;
    await page.goto(url, { waitUntil: "networkidle2", timeout: 120000 });
    await page.waitForSelector("#tablaAsig tbody tr", { timeout: 60000 });
    await page.waitForFunction(
      () => document.querySelectorAll("#tablaAsig tbody tr:not(.empty-row)").length >= 20,
      { timeout: 60000 }
    );
    await sleep(800);

    // 1) Cabecera + pasos + descarga
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(300);
    await shot(page, "01-inicio");

    // 2) Tipologías / resumen / tabla
    const decide = await page.$("#app-decidir");
    if (decide) {
      await decide.scrollIntoViewIfNeeded();
      await sleep(400);
    }
    await shot(page, "02-tabla");

    // 3) Más filas de la tabla
    await page.evaluate(() => {
      const wrap = document.querySelector("#tablaAsig")?.closest(".table-wrap");
      if (wrap) wrap.scrollTop = 280;
      const panel = document.querySelector("#app-decidir");
      if (panel) panel.scrollIntoView({ block: "center" });
    });
    await sleep(400);
    await shot(page, "03-tabla-detalle");

    // 4) Métricas + Por año / Por área
    const results = await page.$("#app-resultado");
    if (results) {
      await results.scrollIntoViewIfNeeded();
      await sleep(400);
    }
    await shot(page, "04-totales");

    // 5) Cumplimiento SACAU
    await page.evaluate(() => {
      const h = [...document.querySelectorAll("#app-resultado h2")].find((el) =>
        /Cumplimiento SACAU/i.test(el.textContent || "")
      );
      h?.scrollIntoView({ block: "start" });
    });
    await sleep(400);
    await shot(page, "05-cumplimiento");

    // 6) Anexo 911
    const anexo = await page.$("#app-anexo-911");
    if (anexo) {
      await anexo.scrollIntoViewIfNeeded();
      await sleep(400);
    }
    await shot(page, "06-anexo");
  } finally {
    await browser.close();
    server.kill("SIGTERM");
  }

  // Armar video ~45 s (6 pantallas × 7.5 s)
  const listPath = path.join(OUT_DIR, "list.txt");
  const frames = [
    "01-inicio",
    "02-tabla",
    "03-tabla-detalle",
    "04-totales",
    "05-cumplimiento",
    "06-anexo",
  ];
  const duration = 7.5;
  let list = "";
  for (const name of frames) {
    const f = path.join(OUT_DIR, `${name}.png`);
    list += `file '${f}'\n`;
    list += `duration ${duration}\n`;
  }
  list += `file '${path.join(OUT_DIR, "06-anexo.png")}'\n`;
  await writeFile(listPath, list, "utf8");

  await new Promise((resolve, reject) => {
    const ff = spawn(
      "ffmpeg",
      [
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        listPath,
        "-vf",
        "fps=30,scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,format=yuv420p",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        OUT_MP4,
      ],
      { stdio: "inherit" }
    );
    ff.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg ${code}`))));
  });

  console.log("OK", OUT_MP4);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
