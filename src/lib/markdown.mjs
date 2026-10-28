// Markdown mínimo para los artículos de src/content/recursos/*.md (sin dependencias).
// Soporta: front matter simple (clave: valor), ## y ### (con id), párrafos, listas (- y 1.), citas (>),
// tablas con barras, **negrita**, *cursiva* y [enlaces](url).

import { inline, slugify, esc } from './utils.mjs';

export function separarFrontMatter(src) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: src };
  const meta = {};
  for (const linea of m[1].split(/\r?\n/)) {
    const i = linea.indexOf(':');
    if (i < 1) continue;
    meta[linea.slice(0, i).trim()] = linea.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return { meta, body: m[2] };
}

const esFila = (l) => /^\s*\|.*\|\s*$/.test(l);
const celdas = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());

export function renderMarkdown(body) {
  const lineas = body.replace(/\r/g, '').split('\n');
  const html = [];
  const toc = [];
  const usados = new Set();
  let i = 0;

  const idUnico = (texto) => {
    let id = slugify(texto);
    let n = 2;
    while (usados.has(id)) id = `${slugify(texto)}-${n++}`;
    usados.add(id);
    return id;
  };

  while (i < lineas.length) {
    const l = lineas[i];
    if (!l.trim()) { i++; continue; }

    let m;
    if ((m = l.match(/^(#{2,3})\s+(.+)$/))) {
      const nivel = m[1].length;
      const id = idUnico(m[2]);
      if (nivel === 2) toc.push({ id, h2: m[2] });
      html.push(`<h${nivel} id="${id}">${inline(m[2])}</h${nivel}>`);
      i++;
      continue;
    }

    if (esFila(l) && i + 1 < lineas.length && /^\s*\|[\s:|-]+\|\s*$/.test(lineas[i + 1])) {
      const cab = celdas(l);
      i += 2;
      const filas = [];
      while (i < lineas.length && esFila(lineas[i])) filas.push(celdas(lineas[i++]));
      html.push(
        `<div class="tabla-wrap" tabindex="0" role="region" aria-label="Tabla comparativa"><table><thead><tr>${cab.map((c) => `<th scope="col">${inline(c)}</th>`).join('')}</tr></thead><tbody>${filas
          .map((f) => `<tr>${f.map((c, k) => (k === 0 ? `<th scope="row">${inline(c)}</th>` : `<td>${inline(c)}</td>`)).join('')}</tr>`)
          .join('')}</tbody></table></div>`,
      );
      continue;
    }

    if (/^\s*[-*]\s+/.test(l) || /^\s*\d+\.\s+/.test(l)) {
      const ordenada = /^\s*\d+\.\s+/.test(l);
      const items = [];
      while (i < lineas.length && (ordenada ? /^\s*\d+\.\s+/ : /^\s*[-*]\s+/).test(lineas[i])) {
        items.push(lineas[i].replace(/^\s*(?:[-*]|\d+\.)\s+/, ''));
        i++;
      }
      const tag = ordenada ? 'ol' : 'ul';
      html.push(`<${tag}>${items.map((t) => `<li>${inline(t)}</li>`).join('')}</${tag}>`);
      continue;
    }

    if (/^>\s?/.test(l)) {
      const partes = [];
      while (i < lineas.length && /^>\s?/.test(lineas[i])) partes.push(lineas[i++].replace(/^>\s?/, ''));
      html.push(`<blockquote><p>${inline(partes.join(' '))}</p></blockquote>`);
      continue;
    }

    if (/^---+$/.test(l.trim())) { html.push('<hr>'); i++; continue; }

    const parrafo = [];
    while (
      i < lineas.length &&
      lineas[i].trim() &&
      !/^(#{2,3}\s|>\s?|\s*[-*]\s+|\s*\d+\.\s+|---+$)/.test(lineas[i]) &&
      !esFila(lineas[i])
    ) parrafo.push(lineas[i++].trim());
    html.push(`<p>${inline(parrafo.join(' '))}</p>`);
  }
  return { html: html.join('\n'), toc };
}

export const textoPlano = (body) => body.replace(/[#>*|\-\[\]()]/g, ' ').replace(/\s+/g, ' ');
export { esc };
