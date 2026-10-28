// Genera public/assets/img/og-tabano.png (1200x630) sin dependencias: PNG escrito a mano con zlib.
// Imagen abstracta original (sin texto, para no depender de fuentes). Uso: node scripts/make-og.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const W = 1200, H = 630;
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const hex = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
const PAPEL = hex('#F6F3EC'), TINTA = hex('#121210'), AMBAR = hex('#F2B705'), BOSQUE = hex('#15302B');

const px = new Uint8Array(W * H * 3);
const set = (x, y, c, a = 1) => {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  for (let k = 0; k < 3; k++) px[i + k] = Math.round(px[i + k] * (1 - a) + c[k] * a);
};
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) set(x, y, PAPEL);

// Panel oscuro a la derecha
for (let y = 0; y < H; y++) for (let x = 720; x < W; x++) set(x, y, BOSQUE);

// Anillos concéntricos con suavizado, centrados en el foco
const cx = 930, cy = 315;
const anillo = (r, grosor, color, alfa) => {
  for (let y = cy - r - 4; y <= cy + r + 4; y++) for (let x = cx - r - 4; x <= cx + r + 4; x++) {
    const d = Math.hypot(x - cx, y - cy);
    const cov = Math.max(0, Math.min(1, grosor / 2 + 0.5 - Math.abs(d - r)));
    if (cov > 0) set(x, y, color, cov * alfa);
  }
};
for (const r of [90, 170, 250]) anillo(r, 2, PAPEL, 0.35);

// Líneas convergentes hacia el foco
const linea = (x0, y0, x1, y1, grosor, color, alfa) => {
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
    for (let dy = -grosor; dy <= grosor; dy++) for (let dx = -grosor; dx <= grosor; dx++) {
      const cov = Math.max(0, Math.min(1, grosor + 0.5 - Math.hypot(dx, dy)));
      if (cov > 0) set(Math.round(x) + dx, Math.round(y) + dy, color, cov * alfa);
    }
  }
};
for (const [x, y] of [[760, 40], [1170, 60], [740, 590], [1170, 580], [1190, 315], [730, 315]]) linea(x, y, cx, cy, 1, PAPEL, 0.8);

// Puntos y foco
const disco = (x0, y0, r, color) => {
  for (let y = y0 - r - 1; y <= y0 + r + 1; y++) for (let x = x0 - r - 1; x <= x0 + r + 1; x++) {
    const cov = Math.max(0, Math.min(1, r + 0.5 - Math.hypot(x - x0, y - y0)));
    if (cov > 0) set(x, y, color, cov);
  }
};
for (const [x, y] of [[760, 40], [740, 590], [1170, 580], [730, 315]]) disco(x, y, 8, PAPEL);
for (const [x, y] of [[1170, 60], [1190, 315]]) disco(x, y, 10, AMBAR);
disco(cx, cy, 34, TINTA);
disco(cx, cy, 28, AMBAR);

// Bloque editorial a la izquierda: barra ámbar y trazos de "texto" abstractos
const rect = (x0, y0, w, h, c) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) set(x, y, c); };
rect(70, 120, 90, 14, AMBAR);
rect(70, 190, 560, 38, TINTA);
rect(70, 252, 470, 38, TINTA);
rect(70, 314, 330, 38, TINTA);
rect(70, 400, 520, 12, [214, 207, 190]);
rect(70, 430, 440, 12, [214, 207, 190]);
rect(70, 510, 200, 52, TINTA);
rect(86, 531, 168, 10, PAPEL);

// Codificación PNG
const crcTabla = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTabla[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (tipo, datos) => {
  const t = Buffer.from(tipo, 'ascii');
  const len = Buffer.alloc(4); len.writeUInt32BE(datos.length);
  const sum = Buffer.alloc(4); sum.writeUInt32BE(crc(Buffer.concat([t, datos])));
  return Buffer.concat([len, t, datos, sum]);
};
const raw = Buffer.alloc((W * 3 + 1) * H);
for (let y = 0; y < H; y++) {
  raw[y * (W * 3 + 1)] = 0;
  Buffer.from(px.buffer, y * W * 3, W * 3).copy(raw, y * (W * 3 + 1) + 1);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2;
const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
mkdirSync(join(root, 'public/assets/img'), { recursive: true });
writeFileSync(join(root, 'public/assets/img/og-tabano.png'), png);
console.log(`OK: og-tabano.png (${W}x${H}, ${(png.length / 1024).toFixed(0)} KB)`);
