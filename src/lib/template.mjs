// Motor de plantillas mínimo y sin dependencias.
//
//   {{ ruta.al.valor }}          valor con HTML escapado
//   {{{ ruta }}}                 valor sin escapar (HTML ya preparado)
//   {{#if ruta}}..{{else}}..{{/if}}      condicional ("!ruta" niega; una lista vacía es falsa)
//   {{#each lista as item}}..{{/each}}   bucle; dentro hay index, number, first y last
//   {{> nombre}}                 incluye src/partials/nombre.html con el mismo contexto

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

const TOKEN =
  /\{\{\{\s*([\s\S]+?)\s*\}\}\}|\{\{\s*(?:(#if|#each)\s+([\s\S]+?)|(\/if|\/each|else)|>\s*([\w\-/]+)|([\s\S]+?))\s*\}\}/g;

function parse(src, name) {
  const root = { type: 'root', children: [] };
  const stack = [root];
  const top = () => stack[stack.length - 1];
  let last = 0;
  let m;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(src))) {
    if (m.index > last) top().children.push({ type: 'text', value: src.slice(last, m.index) });
    last = TOKEN.lastIndex;
    const [, raw, open, expr, close, partial, variable] = m;
    if (raw !== undefined) {
      top().children.push({ type: 'var', path: raw.trim(), raw: true });
    } else if (open === '#if') {
      const node = { type: 'if', expr: expr.trim(), then: [], otherwise: [] };
      node.children = node.then;
      top().children.push(node);
      stack.push(node);
    } else if (open === '#each') {
      const mm = expr.trim().match(/^(.+?)\s+as\s+(\w+)$/);
      const node = { type: 'each', expr: mm ? mm[1].trim() : expr.trim(), alias: mm ? mm[2] : 'item', children: [] };
      top().children.push(node);
      stack.push(node);
    } else if (close === 'else') {
      const t = top();
      if (t.type !== 'if') throw new Error(`{{else}} fuera de un {{#if}} en ${name}`);
      t.children = t.otherwise;
    } else if (close === '/if' || close === '/each') {
      const t = top();
      const esperado = close === '/if' ? 'if' : 'each';
      if (t.type !== esperado) throw new Error(`Cierre ${close} inesperado en ${name}`);
      stack.pop();
    } else if (partial) {
      top().children.push({ type: 'partial', name: partial });
    } else if (variable !== undefined) {
      top().children.push({ type: 'var', path: variable.trim(), raw: false });
    }
  }
  if (last < src.length) top().children.push({ type: 'text', value: src.slice(last) });
  if (stack.length > 1) throw new Error(`Bloque sin cerrar en ${name}`);
  return root;
}

const truthy = (v) => (Array.isArray(v) ? v.length > 0 : !!v);

function lookup(scopes, path) {
  let neg = false;
  if (path.startsWith('!')) {
    neg = true;
    path = path.slice(1).trim();
  }
  const parts = path.split('.');
  let val;
  for (let i = scopes.length - 1; i >= 0; i--) {
    const s = scopes[i];
    if (s != null && Object.prototype.hasOwnProperty.call(s, parts[0])) {
      val = s[parts[0]];
      break;
    }
  }
  for (let i = 1; i < parts.length && val != null; i++) val = val[parts[i]];
  return neg ? !truthy(val) : val;
}

export function createEngine(dirs) {
  const cache = new Map();
  const engine = {
    load(name) {
      if (!cache.has(name)) {
        const file = dirs.map((d) => join(d, `${name}.html`)).find((f) => existsSync(f));
        if (!file) throw new Error(`No existe la plantilla "${name}"`);
        cache.set(name, parse(readFileSync(file, 'utf8'), name));
      }
      return cache.get(name);
    },
    render(name, data) {
      return renderNodes(engine.load(name).children, [data], engine);
    },
  };
  return engine;
}

function renderNodes(nodes, scopes, engine) {
  let out = '';
  for (const n of nodes) {
    switch (n.type) {
      case 'text':
        out += n.value;
        break;
      case 'var': {
        const v = lookup(scopes, n.path);
        out += n.raw ? (v ?? '') : esc(v);
        break;
      }
      case 'partial':
        out += renderNodes(engine.load(n.name).children, scopes, engine);
        break;
      case 'if':
        out += renderNodes(truthy(lookup(scopes, n.expr)) ? n.then : n.otherwise, scopes, engine);
        break;
      case 'each': {
        const list = lookup(scopes, n.expr) || [];
        list.forEach((item, i) => {
          out += renderNodes(
            n.children,
            [...scopes, { [n.alias]: item, index: i, number: i + 1, first: i === 0, last: i === list.length - 1 }],
            engine,
          );
        });
        break;
      }
    }
  }
  return out;
}
