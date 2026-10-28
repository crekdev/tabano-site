import { esc } from './template.mjs';

export { esc };

export const slugify = (s) =>
  String(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' y ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const fechaLarga = (iso) =>
  new Intl.DateTimeFormat('es-CL', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(iso + 'T12:00:00Z'));

export const recortar = (s, max = 158) => {
  const t = String(s).replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const corte = t.slice(0, max - 1);
  return corte.slice(0, corte.lastIndexOf(' ')) + '…';
};

// JSON-LD seguro para incrustar en HTML.
export const jsonLdTag = (obj) =>
  `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;

// Formato en línea mínimo para textos de datos: escapa HTML y admite [texto](/ruta/), **negrita** y *cursiva*.
export function inline(s) {
  let t = esc(s);
  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, txt, url) => {
    const ext = /^https?:\/\//.test(url);
    return `<a href="${url}"${ext ? ' rel="noopener"' : ''}>${txt}</a>`;
  });
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/(^|[\s(])\*([^*\s][^*]*?)\*(?=[\s).,;:]|$)/g, '$1<em>$2</em>');
  return t;
}

export const minutosLectura = (texto) => Math.max(1, Math.round(texto.split(/\s+/).filter(Boolean).length / 200));
