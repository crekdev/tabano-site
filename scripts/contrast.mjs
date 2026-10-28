// Contraste WCAG 2.x de los pares de color usados en main.css. Uso: node scripts/contrast.mjs
const lum = (h) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const C = { paper: '#f6f3ec', paper2: '#ece7da', paper3: '#fffdf7', ink: '#121210', ink2: '#3a3933', muted: '#5c5a50', line: '#d6cfbe', field: '#6f6c60', accent: '#f2b705', forest: '#15302b', onDark: '#f6f3ec', onDarkMuted: '#c9c3b1', ok: '#1d6b3b', err: '#b42318', focus: '#0b57d0', white: '#ffffff', footMuted: '#b9b3a1', footText: '#d9d4c4' };
// [descripción, primer plano, fondo, mínimo]  (4.5 texto normal · 3 texto grande y componentes de interfaz)
const pares = [
  ['Texto principal sobre papel', C.ink, C.paper, 4.5],
  ['Texto principal sobre papel 2', C.ink, C.paper2, 4.5],
  ['Texto secundario (ink-2) sobre papel', C.ink2, C.paper, 4.5],
  ['Texto atenuado (muted) sobre papel', C.muted, C.paper, 4.5],
  ['Texto atenuado sobre papel 2', C.muted, C.paper2, 4.5],
  ['Texto atenuado sobre papel 3', C.muted, C.paper3, 4.5],
  ['Texto sobre botón acento', C.ink, C.accent, 4.5],
  ['Texto claro sobre botón primario', C.paper, C.ink, 4.5],
  ['Texto claro sobre bosque', C.onDark, C.forest, 4.5],
  ['Texto atenuado claro sobre bosque', C.onDarkMuted, C.forest, 4.5],
  ['Botón acento sobre bosque', C.accent, C.forest, 3],
  ['Pie: texto sobre tinta', C.footText, C.ink, 4.5],
  ['Pie: texto atenuado sobre tinta', C.footMuted, C.ink, 4.5],
  ['Pie: acento sobre tinta', C.accent, C.ink, 4.5],
  ['Error sobre blanco', C.err, C.white, 4.5],
  ['Error sobre papel 3 (tarjeta)', C.err, C.paper3, 4.5],
  ['Éxito sobre papel', C.ok, C.paper, 4.5],
  ['Borde de campo (field) sobre blanco', C.field, C.white, 3],
  ['Borde de campo sobre papel 3', C.field, C.paper3, 3],
  ['Foco (focus) sobre papel', C.focus, C.paper, 3],
  ['Foco (acento) sobre bosque', C.accent, C.forest, 3],
  ['Foco (acento) sobre tinta', C.accent, C.ink, 3],
  ['Recuadro pendiente: texto', '#3d2d00', '#fff6d6', 4.5],
  ['Alerta de formulario: texto', '#7a1710', '#fdecea', 4.5],
  ['Enlace subrayado/acento sobre papel (ink)', C.ink, C.paper, 4.5],
];
let fallos = 0;
for (const [nombre, fg, bg, min] of pares) {
  const r = ratio(fg, bg);
  const ok = r >= min;
  if (!ok) fallos++;
  console.log(`${ok ? 'OK   ' : 'FALLA'} ${r.toFixed(2).padStart(5)}:1 (mín ${min}) ${nombre}`);
}
console.log(fallos ? `\n${fallos} par(es) bajo el mínimo` : '\nTodos los pares cumplen');
process.exit(fallos ? 1 : 0);
