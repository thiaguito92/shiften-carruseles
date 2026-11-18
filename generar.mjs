// Genera las placas de los carruseles de Instagram de Shiften.
// Uso: node generar.mjs [id-del-carrusel]
//      node generar.mjs --archivo entrada.json
// Salida: salida/<id>/NN.jpg (1080x1350), vista-previa.jpg y copy.txt

import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import sharp from "sharp";

const run = promisify(execFile);
const AQUI = dirname(fileURLToPath(import.meta.url));
const ANCHO = 1080;
const ALTO = 1350;
const WHATSAPP = "11 3888-8358";
const USUARIO = "@shiften.ai";

const NAVEGADORES = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);

const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// El punto final de los títulos lleva el color de la marca, como en el logo.
const titulo = (s) => {
  const t = esc(s).replaceAll("\n", "<br>");
  return t.endsWith(".") ? `${t.slice(0, -1)}<span class="punto">.</span>` : t;
};

const css = `
*{box-sizing:border-box;margin:0;padding:0}
:root{--paper:#f2efe8;--paper2:#e7e2d6;--ink:#15140f;--graphite:#5e5b52;--mist:#a39f94;--line:#d8d3c6;--signal:#ff5a1f}
html,body{width:${ANCHO}px;height:${ALTO}px;overflow:hidden}
body{font-family:"Hanken Grotesk",sans-serif;-webkit-font-smoothing:antialiased}
.placa{width:${ANCHO}px;height:${ALTO}px;padding:72px 80px 68px;display:flex;flex-direction:column;background:var(--bg);color:var(--fg)}
.paper{--bg:var(--paper);--fg:var(--ink);--suave:var(--graphite);--linea:var(--line);--punto:var(--signal)}
.ink{--bg:var(--ink);--fg:var(--paper);--suave:#b9b5aa;--linea:#3a3831;--punto:var(--signal)}
.signal{--bg:var(--signal);--fg:var(--ink);--suave:var(--ink);--linea:rgba(21,20,15,.3);--punto:var(--ink)}
.top,.pie{display:flex;justify-content:space-between;align-items:center;font-size:28px;color:var(--suave)}
.marca{font-family:"Schibsted Grotesk",sans-serif;font-weight:600;font-size:40px;letter-spacing:-.04em;color:var(--fg)}
.punto{color:var(--punto)}
.medio{flex:1;display:flex;flex-direction:column;justify-content:center;min-height:0}
.abajo{justify-content:flex-end;padding-bottom:64px}
h1,h2{font-family:"Schibsted Grotesk",sans-serif;font-weight:600;letter-spacing:-.045em;line-height:.98;text-wrap:balance}
h1{font-size:124px}
h2{font-size:100px}
h2.chico{font-size:78px;line-height:1.02}
.cuerpo{font-size:46px;line-height:1.3;margin-top:52px;max-width:860px;color:var(--suave);text-wrap:pretty}
.signal .cuerpo{font-weight:500}
.bajada{font-size:44px;line-height:1.25;margin-top:48px;color:var(--suave);max-width:800px}
.seccion{display:flex;align-items:center;gap:16px;font-size:26px;font-weight:600;letter-spacing:.13em;text-transform:uppercase;color:var(--suave);margin-bottom:36px}
.seccion i{width:16px;height:16px;background:var(--signal);display:block}
.items{margin-top:60px;border-top:2px solid var(--linea)}
.item{display:grid;grid-template-columns:230px 1fr;gap:28px;align-items:baseline;padding:36px 0;border-bottom:2px solid var(--linea)}
.item b{font-size:32px;font-weight:600;color:var(--suave)}
.item span{font-size:44px;line-height:1.2;font-weight:500;letter-spacing:-.01em}
.item.num{grid-template-columns:90px 1fr}
.chat{display:flex;flex-direction:column;gap:20px;margin-top:56px}
.msg{max-width:760px;padding:26px 34px;font-size:40px;line-height:1.2;border-radius:30px}
.msg.cliente{align-self:flex-start;background:var(--paper2);border-bottom-left-radius:6px}
.msg.vos{align-self:flex-end;background:var(--ink);color:var(--paper);border-bottom-right-radius:6px}
.pedido{margin-top:56px;background:var(--ink);color:var(--paper);border-radius:26px;padding:44px 48px 22px}
.pedido header{display:flex;justify-content:space-between;align-items:center;font-size:30px;color:#b9b5aa;margin-bottom:18px}
.pedido header b{font-family:"Schibsted Grotesk",sans-serif;font-size:42px;letter-spacing:-.03em;color:var(--paper)}
.fila{display:flex;justify-content:space-between;gap:30px;padding:24px 0;border-top:2px solid #3a3831;font-size:38px}
.fila span:first-child{color:#b9b5aa}
.fila span:last-child{font-weight:600}
svg{display:block;width:100%;margin-bottom:64px}
.whatsapp{display:inline-flex;align-self:flex-start;align-items:center;gap:20px;background:var(--signal);color:var(--ink);padding:28px 40px;border-radius:999px;font-size:42px;font-weight:600;margin-top:60px}
`;

function recorrido({ caidos = [], final }) {
  const total = 7;
  const x = (i) => 50 + i * (820 / (total - 1));
  const puntos = Array.from({ length: total }, (_, i) => {
    const cayo = caidos.includes(i);
    const color = cayo ? "#a39f94" : final ? "#ff5a1f" : "#15140f";
    const y = cayo ? 214 : 50;
    const palo = cayo
      ? `<line x1="${x(i)}" y1="82" x2="${x(i)}" y2="190" stroke="#a39f94" stroke-width="3" stroke-dasharray="3 11" stroke-linecap="round"/>`
      : "";
    return `${palo}<rect x="${x(i) - 24}" y="${y}" width="48" height="48" rx="17" fill="${color}"/>`;
  }).join("");
  return `<svg viewBox="0 0 920 280" aria-hidden="true"><line x1="24" y1="74" x2="896" y2="74" stroke="#d8d3c6" stroke-width="3"/>${puntos}</svg>`;
}

function contenido(s, categoria) {
  switch (s.tipo) {
    case "portada":
      return `<div class="medio abajo">${categoria ? `<div class="seccion"><i></i>${esc(categoria)}</div>` : ""}<h1>${titulo(s.titulo)}</h1><p class="bajada">${esc(s.bajada)}</p></div>`;
    case "texto":
      return `<div class="medio"><h2>${titulo(s.titulo)}</h2><p class="cuerpo">${esc(s.cuerpo)}</p></div>`;
    case "lista": {
      const num = s.items.every((i) => /^\d+$/.test(i.etiqueta));
      const filas = s.items
        .map((i) => `<div class="item${num ? " num" : ""}"><b>${esc(i.etiqueta)}</b><span>${esc(i.texto)}</span></div>`)
        .join("");
      return `<div class="medio"><h2 class="chico">${titulo(s.titulo)}</h2><div class="items">${filas}</div></div>`;
    }
    case "chat": {
      const m = s.mensajes.map((x) => `<div class="msg ${x.de === "vos" ? "vos" : "cliente"}">${esc(x.texto)}</div>`).join("");
      return `<div class="medio"><h2 class="chico">${titulo(s.titulo)}</h2><div class="chat">${m}</div></div>`;
    }
    case "pedido": {
      const f = s.filas.map(([a, b]) => `<div class="fila"><span>${esc(a)}</span><span>${esc(b)}</span></div>`).join("");
      return `<div class="medio"><h2 class="chico">${titulo(s.titulo)}</h2><div class="pedido"><header><b>Nuevo pedido</b><span>${esc(s.etiqueta)}</span></header>${f}</div></div>`;
    }
    case "recorrido":
      return `<div class="medio">${recorrido(s)}<div class="seccion"><i></i>${esc(s.paso)}</div><h2>${titulo(s.titulo)}</h2><p class="cuerpo">${esc(s.cuerpo)}</p></div>`;
    case "cta":
      return `<div class="medio"><h2>${titulo(s.titulo)}</h2><p class="cuerpo">${esc(s.cuerpo)}</p><div class="whatsapp">${esc(s.accion ?? `WhatsApp ${WHATSAPP}`)}</div></div>`;
    default:
      throw new Error(`Tipo de placa desconocido: ${s.tipo}`);
  }
}

function html(s, i, total, c) {
  const fondo = s.fondo ?? (s.tipo === "portada" || s.tipo === "cta" ? "ink" : "paper");
  const pie = i === 0 ? "Deslizá →" : i === total - 1 ? "Guardalo para después" : "→";
  const firma = i === 1 && c.fuente ? c.fuente : USUARIO;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600&family=Schibsted+Grotesk:wght@500;600;700&display=block" rel="stylesheet">
<style>${css}</style></head><body><main class="placa ${fondo}">
<div class="top"><span class="marca">Shiften<span class="punto">.</span></span><span>${i + 1}/${total}</span></div>
${contenido(s, c.categoria)}
<div class="pie"><span>${esc(firma)}</span><span>${pie}</span></div>
</main></body></html>`;
}

async function capturar(navegador, perfil, origen, destino) {
  await run(navegador, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    ...(process.env.CI ? ["--no-sandbox"] : []),
    "--force-device-scale-factor=1",
    `--user-data-dir=${perfil}`,
    `--window-size=${ANCHO},${ALTO}`,
    "--virtual-time-budget=6000",
    `--screenshot=${destino}`,
    pathToFileURL(origen).href,
  ], { timeout: 60000 });
}

// Junta las placas en una imagen para revisarlas de un vistazo.
async function vistaPrevia(lista, destino) {
  const w = 432;
  const h = 540;
  const g = 16;
  const columnas = Math.max(...lista.map((c) => c.slides.length));
  const piezas = [];
  for (const [fila, c] of lista.entries()) {
    for (let i = 0; i < c.slides.length; i++) {
      const n = String(i + 1).padStart(2, "0");
      piezas.push({
        input: await sharp(join(AQUI, "salida", c.id, `${n}.jpg`)).resize(w, h).toBuffer(),
        left: g + i * (w + g),
        top: g + fila * (h + g),
      });
    }
  }
  await sharp({
    create: { width: g + columnas * (w + g), height: g + lista.length * (h + g), channels: 3, background: "#8a877e" },
  })
    .composite(piezas)
    .jpeg({ quality: 88 })
    .toFile(destino);
}

const navegador = NAVEGADORES.find((p) => existsSync(p));
if (!navegador) throw new Error("No encontré Chrome o Edge. Definí CHROME_PATH.");

const args = process.argv.slice(2);
const posArchivo = args.indexOf("--archivo");
const archivo = posArchivo >= 0 ? args[posArchivo + 1] : null;
const filtro = archivo ? null : args[0];
const datos = JSON.parse(await readFile(archivo ?? join(AQUI, "carruseles.json"), "utf8"));
const carruseles = (Array.isArray(datos) ? datos : [datos]).filter((c) => !filtro || c.id === filtro);
if (!carruseles.length) throw new Error(`No existe el carrusel ${filtro}`);
for (const c of carruseles) {
  if (!/^[a-z0-9-]+$/.test(c.id)) throw new Error(`Id inválido: ${c.id}`);
}

const temp = await mkdtemp(join(tmpdir(), "shiften-carrusel-"));
try {
  for (const c of carruseles) {
    const dir = join(AQUI, "salida", c.id);
    await rm(dir, { recursive: true, force: true });
    await mkdir(dir, { recursive: true });
    for (const [i, s] of c.slides.entries()) {
      const n = String(i + 1).padStart(2, "0");
      const origen = join(temp, `${c.id}-${n}.html`);
      const png = join(temp, `${c.id}-${n}.png`);
      await writeFile(origen, html(s, i, c.slides.length, c));
      await capturar(navegador, join(temp, "perfil"), origen, png);
      const { width, height } = await sharp(png).metadata();
      if (width !== ANCHO || height !== ALTO) throw new Error(`${c.id}/${n}: salió de ${width}x${height}`);
      // Instagram solo acepta JPEG al publicar por API.
      await sharp(png).flatten({ background: "#ffffff" }).toColorspace("srgb").jpeg({ quality: 92, chromaSubsampling: "4:4:4" }).toFile(join(dir, `${n}.jpg`));
    }
    await writeFile(join(dir, "copy.txt"), `${c.copy}\n`);
    await vistaPrevia([c], join(dir, "vista-previa.jpg"));
    console.log(`${c.id}: ${c.slides.length} placas`);
  }
  if (!filtro && !archivo) await vistaPrevia(carruseles, join(AQUI, "salida", "vista-previa.jpg"));
} finally {
  await rm(temp, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 }).catch(() => {});
}
