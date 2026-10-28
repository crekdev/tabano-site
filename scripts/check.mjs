// Verificación del sitio generado: node build.mjs && node scripts/check.mjs
// Errores (rojo) hacen fallar el proceso; avisos (amarillo) son recomendaciones o pendientes de lanzamiento.
// No reemplaza una auditoría real (Lighthouse, lector de pantalla, prueba de envío en Netlify): ver CHECKLIST.md (local).
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const { SITE } = await import(pathToFileURL(join(root, 'src/config.mjs')).href);
const errores = [];
const avisos = [];
const err = (m) => errores.push(m);
const aviso = (m) => avisos.push(m);

function* archivos(dir) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) yield* archivos(p);
    else yield p;
  }
}
const htmls = [...archivos(dist)].filter((f) => f.endsWith('.html'));
const relDe = (f) => f.replace(dist, '');
const urlDe = (f) => relDe(f).replace(/index\.html$/, '');
const sinScripts = (h) => h.replace(/<script[\s\S]*?<\/script>/g, '');

const RUTAS = ['/', '/servicios/', '/desarrollo-web/', '/google-ads/', '/meta-ads/', '/growth-marketing/', '/agencia/', '/casos-de-exito/', '/recursos/', '/contacto/', '/gracias/', '/privacidad/', '/404.html'];
for (const r of RUTAS) {
  const f = r.endsWith('.html') ? join(dist, r) : join(dist, r, 'index.html');
  if (!existsSync(f)) err(`ruta obligatoria ausente: ${r}`);
}

// ids por página, para validar anclas
const paginas = new Map();
for (const f of htmls) {
  const h = readFileSync(f, 'utf8');
  paginas.set(urlDe(f), { f, h, ids: new Set([...h.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])) });
}

function existeUrl(u) {
  const limpia = u.split('#')[0].split('?')[0];
  if (!limpia) return true;
  const p = join(dist, limpia);
  if (limpia.endsWith('/')) return existsSync(join(p, 'index.html'));
  return existsSync(p) || existsSync(p + '.html') || existsSync(join(p, 'index.html'));
}

const titulos = new Map();
const descripciones = new Map();
let bloquesJsonLd = 0;
let enlaces = 0;

for (const [url, { h, ids }] of paginas) {
  const rel = url;
  const plano = sinScripts(h);

  // ids únicos
  const todos = [...h.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const dup = todos.filter((x, i) => todos.indexOf(x) !== i);
  if (dup.length) err(`${rel}: ids duplicados ${[...new Set(dup)].join(', ')}`);

  // documento
  if (!/^<!DOCTYPE html>/i.test(h)) err(`${rel}: sin doctype`);
  if (!/<html lang="es-CL"/.test(h)) err(`${rel}: falta lang="es-CL"`);
  if (!/<meta name="viewport"/.test(h)) err(`${rel}: sin viewport`);
  if (!/<meta charset="utf-8">/i.test(h)) err(`${rel}: sin charset`);
  if ((plano.match(/<main[\s>]/g) || []).length !== 1) err(`${rel}: debe haber un único <main>`);
  if (!/class="skip"/.test(h)) err(`${rel}: sin enlace "saltar al contenido"`);

  // title / description / canonical / robots / OG
  const t = (h.match(/<title>([^<]*)<\/title>/) || [])[1];
  const d = (h.match(/<meta name="description" content="([^"]*)"/) || [])[1];
  if (!t || t.length < 10) err(`${rel}: sin title`);
  else {
    if (t.length > 70) aviso(`${rel}: title largo (${t.length} caracteres)`);
    if (titulos.has(t)) err(`${rel}: title duplicado con ${titulos.get(t)}`);
    titulos.set(t, rel);
  }
  if (!d || d.length < 50) err(`${rel}: description corta o ausente`);
  else {
    if (d.length > 165) aviso(`${rel}: description larga (${d.length} caracteres)`);
    if (d.length < 110) aviso(`${rel}: description corta (${d.length} caracteres)`);
    if (descripciones.has(d)) err(`${rel}: description duplicada con ${descripciones.get(d)}`);
    descripciones.set(d, rel);
  }
  const canon = (h.match(/<link rel="canonical" href="([^"]*)"/) || [])[1];
  if (!canon) err(`${rel}: sin canonical`);
  else if (canon !== SITE.url + url) err(`${rel}: canonical inesperado ${canon}`);
  const robots = (h.match(/<meta name="robots" content="([^"]*)"/) || [])[1] || '';
  const noIndexable = url === '/gracias/' || url === '/404.html';
  if (noIndexable && !/noindex/.test(robots)) err(`${rel}: debe tener noindex`);
  if (!noIndexable && /noindex/.test(robots)) err(`${rel}: no debería tener noindex`);
  for (const p of ['og:title', 'og:description', 'og:url', 'og:image', 'og:type']) {
    if (!new RegExp(`<meta property="${p}" content="[^"]+"`).test(h)) err(`${rel}: falta ${p}`);
  }

  // encabezados
  const hs = [...plano.matchAll(/<h([1-6])[\s>]/g)].map((m) => +m[1]);
  if (hs.filter((n) => n === 1).length !== 1) err(`${rel}: debe tener exactamente un h1`);
  for (let i = 1; i < hs.length; i++) if (hs[i] - hs[i - 1] > 1) { err(`${rel}: salto de encabezados h${hs[i - 1]} → h${hs[i]}`); break; }

  // migas
  if (!['/', '/404.html', '/gracias/'].includes(url) && !/aria-label="Migas de pan"/.test(h)) err(`${rel}: sin migas de pan`);

  // JSON-LD
  for (const m of h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    bloquesJsonLd++;
    let obj;
    try { obj = JSON.parse(m[1]); } catch (e) { err(`${rel}: JSON-LD inválido (${e.message})`); continue; }
    const tipo = obj['@type'];
    if (['FAQPage', 'AggregateRating', 'Review', 'Product', 'LocalBusiness'].includes(tipo)) err(`${rel}: JSON-LD con tipo no permitido (${tipo})`);
    if (tipo === 'Organization') {
      const c = SITE.contacto;
      if (!c.email && obj.email) err(`${rel}: Organization publica email vacío`);
      if (obj.email && obj.email !== c.email) err(`${rel}: Organization.email no coincide con la configuración`);
      if (c.telefonos.length && !obj.telephone) err(`${rel}: Organization sin teléfono pese a estar configurado`);
      if (!Object.values(SITE.redes).some(Boolean) && obj.sameAs) err(`${rel}: Organization publica sameAs sin redes`);
    }
  }
  if (!noIndexable && url !== '/' && !/"@type":"BreadcrumbList"/.test(h)) err(`${rel}: sin BreadcrumbList`);

  // enlaces internos y anclas
  for (const m of h.matchAll(/(?:href|src)="([^"]*)"/g)) {
    const u = m[1];
    if (/^(https?:|mailto:|tel:|data:|javascript:)/.test(u) || u.startsWith('//')) continue;
    enlaces++;
    if (u.startsWith('#')) {
      if (u.length > 1 && !ids.has(u.slice(1))) err(`${rel}: ancla rota ${u}`);
      continue;
    }
    if (!u.startsWith('/')) { err(`${rel}: enlace relativo ${u}`); continue; }
    if (!existeUrl(u)) { err(`${rel}: enlace roto ${u}`); continue; }
    const [ruta, ancla] = u.split('#');
    if (ancla) {
      const dest = paginas.get(ruta.split('?')[0]);
      if (dest && !dest.ids.has(ancla)) err(`${rel}: ancla ${u} no existe en destino`);
    }
  }
  for (const m of h.matchAll(/<a\b[^>]*href="(https?:\/\/[^"]+)"[^>]*>/g)) {
    if (!/rel="[^"]*noopener/.test(m[0])) aviso(`${rel}: enlace externo sin rel="noopener" (${m[1]})`);
  }
  if (/>\s*(haz clic aquí|clic aquí|aquí|leer más)\s*</i.test(plano)) aviso(`${rel}: texto de enlace poco descriptivo`);

  // imágenes y tablas
  for (const m of h.matchAll(/<img\b[^>]*>/g)) if (!/\salt="/.test(m[0])) err(`${rel}: <img> sin alt`);
  for (const m of plano.matchAll(/<table[\s\S]*?<\/table>/g)) if (!/<th scope="col"/.test(m[0])) err(`${rel}: tabla sin <th scope="col">`);

  // restos de plantilla y valores rotos
  if (/\{\{|\}\}/.test(plano)) err(`${rel}: quedan llaves de plantilla sin resolver`);
  if (/undefined|\[object Object\]|NaN/.test(plano)) err(`${rel}: aparece "undefined", "NaN" o [object Object]`);

  // balance de etiquetas principales
  for (const tag of ['div', 'section', 'article', 'ul', 'ol', 'li', 'details', 'form', 'table', 'main', 'header', 'footer', 'nav', 'p', 'a', 'button', 'select', 'svg']) {
    const a = (plano.match(new RegExp(`<${tag}[\\s>]`, 'g')) || []).length;
    const c = (plano.match(new RegExp(`</${tag}>`, 'g')) || []).length;
    if (a !== c) err(`${rel}: <${tag}> abiertas ${a} / cerradas ${c}`);
  }

  // pendientes visibles
  const pend = (plano.match(/class="pendiente"/g) || []).length;
  if (pend) aviso(`${rel}: ${pend} recuadro(s) "Pendiente de completar" visible(s)`);
}

// ---------- formulario Netlify ----------
const contacto = paginas.get('/contacto/')?.h || '';
const formTag = (contacto.match(/<form\b[^>]*name="contact"[^>]*>/) || [])[0] || '';
if (!formTag) err('contacto: no existe <form name="contact">');
for (const [nombre, re] of [
  ['method="POST"', /method="POST"/],
  ['action="/gracias/"', /action="\/gracias\/"/],
  ['data-netlify="true"', /data-netlify="true"/],
  ['data-netlify-honeypot="bot-field"', /data-netlify-honeypot="bot-field"/],
]) if (!re.test(formTag)) err(`formulario: falta ${nombre}`);
if (!/<input type="hidden" name="form-name" value="contact">/.test(contacto)) err('formulario: falta input oculto form-name=contact');
if (!/name="bot-field"/.test(contacto)) err('formulario: falta campo honeypot bot-field');
const form = (contacto.match(/<form[\s\S]*?<\/form>/) || [''])[0];
for (const campo of ['nombre', 'email', 'empresa', 'sitio_web', 'servicio', 'presupuesto', 'mensaje', 'consentimiento']) {
  if (!new RegExp(`name="${campo}"`).test(form)) err(`formulario: falta el campo ${campo}`);
}
for (const id of ['f-nombre', 'f-email', 'f-sitio', 'f-servicio', 'f-mensaje', 'f-consentimiento', 'f-empresa', 'f-presupuesto']) {
  if (!new RegExp(`<label for="${id}"`).test(form)) err(`formulario: el campo ${id} no tiene <label for>`);
}
for (const m of form.matchAll(/aria-describedby="([^"]+)"/g)) {
  for (const id of m[1].split(/\s+/)) if (!new RegExp(`id="${id}"`).test(form)) err(`formulario: aria-describedby apunta a #${id} inexistente`);
}
for (const o of ['Desarrollo web', 'Google Ads', 'Meta Ads', 'Growth marketing', 'Otro']) {
  if (!form.includes(`<option value="${o}">`)) err(`formulario: falta la opción de servicio "${o}"`);
}
if (/<form\b[^>]*name="contact"/.test(paginas.get('/gracias/')?.h || '')) err('gracias: no debe contener el formulario');

// ---------- datos de contacto, equipo y autores ----------
const todoHtml = [...paginas.values()].map((p) => p.h).join('\n');
if (SITE.contacto.email && !contacto.includes(`mailto:${SITE.contacto.email}`)) err('contacto: no muestra el correo configurado');
for (const t of SITE.contacto.telefonos) {
  if (!contacto.includes(`href="tel:${t.numero}"`)) err(`contacto: falta el teléfono ${t.numero}`);
  if (t.whatsapp && !contacto.includes(`href="https://wa.me/${t.numero.replace('+', '')}"`)) err(`contacto: falta el enlace de WhatsApp de ${t.numero}`);
}
if (SITE.contacto.direccion && !contacto.includes(SITE.contacto.direccion.replace(/'/g, '&#39;'))) err('contacto: falta la dirección');
const agencia = paginas.get('/agencia/')?.h || '';
for (const slug of ['cristobal-sanhueza', 'juan-sanhueza']) {
  if (!new RegExp(`<article class="persona" id="${slug}">`).test(agencia)) err(`agencia: falta la ficha ${slug}`);
  if (!existsSync(join(dist, `assets/img/equipo/${slug}.jpg`))) err(`falta la foto de ${slug}`);
}
for (const [url, { h }] of paginas) {
  if (!url.startsWith('/recursos/') || url === '/recursos/') continue;
  const m = h.match(/<span>Por <a href="\/agencia\/#([a-z-]+)">/);
  if (!m) { err(`${url}: artículo sin firma de autor`); continue; }
  if (!/class="autor-box"/.test(h)) err(`${url}: sin caja de autor`);
  if (!agencia.includes(`id="${m[1]}"`)) err(`${url}: el autor ${m[1]} no existe en /agencia/`);
  if (!h.includes(`"author":{"@id":"${SITE.url}/agencia/#${m[1]}"}`)) err(`${url}: JSON-LD sin autor Person`);
}
const razon = SITE.empresa.razonSocial;
if (razon && !(paginas.get('/privacidad/')?.h || '').includes(razon)) err('privacidad: no menciona al responsable legal');
if (/%%[A-Z_]+%%/.test(todoHtml)) err('quedan marcadores %%…%% sin reemplazar');
if (SITE.gtmId && !/<body data-gtm="GTM-[A-Z0-9]+">/.test(paginas.get('/')?.h || '')) err('inicio: falta data-gtm con el ID configurado');
if (SITE.gtmId && !/id="consent"/.test(paginas.get('/')?.h || '')) err('inicio: GTM configurado pero sin banner de consentimiento');
if (SITE.gtmId && /googletagmanager\.com/.test(todoHtml.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, ''))) err('el HTML no debe cargar GTM directamente (solo tras consentimiento, desde main.js)');

// ---------- JavaScript del formulario ----------
const js = readFileSync(join(dist, 'assets/js/main.js'), 'utf8');
if (!/application\/x-www-form-urlencoded/.test(js)) err('main.js: el envío AJAX no usa application/x-www-form-urlencoded');
if (/application\/json/.test(js) || /JSON\.stringify/.test(js)) err('main.js: el envío no debe usar JSON');
for (const ev of ['form_start', 'form_submit', 'generate_lead', 'click_contact', 'click_service_cta']) {
  if (!js.includes(ev)) err(`main.js: falta el evento ${ev}`);
}
if (!/enviando/.test(js)) err('main.js: sin protección contra envíos duplicados');

// ---------- sitemap y robots ----------
const sm = readFileSync(join(dist, 'sitemap.xml'), 'utf8');
const urlsSm = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
for (const u of urlsSm) {
  if (!u.startsWith(SITE.url)) err(`sitemap: URL fuera del dominio ${u}`);
  if (!existeUrl(u.replace(SITE.url, '') || '/')) err(`sitemap: URL inexistente ${u}`);
}
for (const [url] of paginas) {
  const indexable = url !== '/gracias/' && url !== '/404.html';
  const enSm = urlsSm.includes(SITE.url + url);
  if (indexable && !enSm) err(`sitemap: falta ${url}`);
  if (!indexable && enSm) err(`sitemap: no debe incluir ${url}`);
}
const robots = readFileSync(join(dist, 'robots.txt'), 'utf8');
if (!/Sitemap:\s*https:\/\/tabano\.cl\/sitemap\.xml/.test(robots)) err('robots.txt: falta la línea Sitemap');
if (/Disallow:\s*\/gracias/.test(robots)) err('robots.txt: no debe bloquear /gracias/ (el noindex debe poder leerse)');

// ---------- activos ----------
for (const a of ['assets/css/main.css', 'assets/js/main.js', 'assets/img/favicon-32.png', 'assets/img/logo-tabano.png', 'assets/img/logo-tabano-claro.png', 'assets/img/og-tabano.png', '_headers', 'llms.txt']) {
  if (!existsSync(join(dist, a))) err(`falta ${a} en dist`);
}
const css = readFileSync(join(dist, 'assets/css/main.css'), 'utf8');
if (!/prefers-reduced-motion:\s*reduce/.test(css)) err('main.css: falta prefers-reduced-motion');
if (!/:focus-visible/.test(css)) err('main.css: falta :focus-visible');

// ---------- avisos de lanzamiento ----------
if (SITE.mostrarPendientes) aviso('config: mostrarPendientes=true (poner false antes del lanzamiento)');
if (!SITE.gtmId) aviso('config: gtmId vacío (sin analítica)');
if (!SITE.contacto.email && !SITE.contacto.telefonos.length) aviso('config: sin datos de contacto directos');
if (!SITE.empresa.rut) aviso('config: falta el RUT de la razón social (privacidad)');
else if (!/^\d{1,2}\.\d{3}\.\d{3}-[\dkK]$/.test(SITE.empresa.rut)) aviso(`config: el RUT "${SITE.empresa.rut}" no tiene dígito verificador (formato 76.123.456-7)`);
if (!Object.values(SITE.redes).some(Boolean)) aviso('config: sin redes sociales');
if (!SITE.googleVerification) aviso('config: sin código de verificación de Search Console');

const avisosUnicos = [...new Set(avisos)];
console.log(`Páginas: ${paginas.size} · enlaces internos revisados: ${enlaces} · bloques JSON-LD: ${bloquesJsonLd} · URLs en sitemap: ${urlsSm.length}`);
if (avisosUnicos.length) {
  console.log(`\n${avisosUnicos.length} aviso(s):`);
  for (const a of avisosUnicos) console.log(' · ' + a);
}
if (errores.length) {
  console.log(`\n${errores.length} problema(s):`);
  for (const e of errores) console.log(' - ' + e);
  process.exit(1);
}
console.log('\nVerificación OK');
