// Generador del sitio tabano.cl (sin dependencias). Uso: node build.mjs
// Lee src/data, src/content y src/templates; escribe el sitio estático en dist/.

import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SITE, NAV, OPCIONES_SERVICIO, OPCIONES_PRESUPUESTO } from './src/config.mjs';
import { createEngine } from './src/lib/template.mjs';
import { esc, fechaLarga, jsonLdTag, recortar, inline, minutosLectura } from './src/lib/utils.mjs';
import { separarFrontMatter, renderMarkdown, textoPlano } from './src/lib/markdown.mjs';
import * as schema from './src/lib/schema.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const DIST = join(ROOT, 'dist');
const leer = (f) => JSON.parse(readFileSync(join(ROOT, 'src/data', f), 'utf8'));
const fallo = (msg) => {
  console.error('Error: ' + msg);
  process.exit(1);
};

// ---------- datos ----------
const serviciosRaw = readdirSync(join(ROOT, 'src/data/servicios'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(ROOT, 'src/data/servicios', f), 'utf8')))
  .sort((a, b) => a.orden - b.orden);
const metodologia = leer('metodologia.json');
const principios = leer('principios.json');
const problemas = leer('problemas.json');
const faqsHome = leer('faqs.json');
const casos = leer('casos.json');
const textos = leer('paginas.json');
const equipo = leer('equipo.json');

// ---------- salida base ----------
rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });
cpSync(join(ROOT, 'public'), DIST, { recursive: true });

const hash = createHash('md5');
for (const f of ['assets/css/main.css', 'assets/js/main.js']) hash.update(readFileSync(join(ROOT, 'public', f)));
const assetV = hash.digest('hex').slice(0, 8);

const engine = createEngine([join(ROOT, 'src/templates'), join(ROOT, 'src/partials')]);

// ---------- utilidades de vista ----------
const pend = (titulo, texto) =>
  SITE.mostrarPendientes
    ? `<aside class="pendiente"><strong>Pendiente de completar: ${esc(titulo)}</strong><p>${esc(texto)}</p></aside>`
    : '';
const faqsVista = (lista) => lista.map((f) => ({ q: f.q, a: inline(f.a) }));
const INICIO = { name: 'Inicio', url: '/' };
const migasDe = (items) => items.map((it, i) => ({ ...it, last: i === items.length - 1 }));

// ---------- servicios ----------
const servicios = serviciosRaw.map((s) => ({
  slug: s.slug,
  url: s.url,
  nombre: s.nombre,
  grafico: s.grafico,
  problema: s.problema,
  resumen: s.resumen,
}));
const servicioPorSlug = Object.fromEntries(servicios.map((s) => [s.slug, s]));

// ---------- artículos ----------
const dirRecursos = join(ROOT, 'src/content/recursos');
const articulos = readdirSync(dirRecursos)
  .filter((f) => f.endsWith('.md'))
  .map((f) => {
    const { meta, body } = separarFrontMatter(readFileSync(join(dirRecursos, f), 'utf8'));
    for (const k of ['titulo', 'titleTag', 'description', 'slug', 'fecha', 'actualizado', 'categoria', 'servicio', 'resumen']) {
      if (!meta[k]) fallo(`${f}: falta "${k}" en el front matter`);
    }
    if (meta.slug !== f.replace(/\.md$/, '')) fallo(`${f}: el slug "${meta.slug}" no coincide con el nombre del archivo`);
    if (!servicioPorSlug[meta.servicio]) fallo(`${f}: servicio "${meta.servicio}" no existe`);
    const { html, toc } = renderMarkdown(body);
    return {
      ...meta,
      url: `/recursos/${meta.slug}/`,
      html,
      toc,
      minutos: minutosLectura(textoPlano(body)),
      fechaTexto: fechaLarga(meta.fecha),
      actualizadoTexto: fechaLarga(meta.actualizado),
      resumenCorto: recortar(meta.resumen, 150),
    };
  })
  .sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : a.titulo.localeCompare(b.titulo, 'es')));
const articuloPorSlug = Object.fromEntries(articulos.map((a) => [a.slug, a]));

// ---------- equipo y autores ----------
for (const p of equipo) for (const k of ['slug', 'nombre', 'rol', 'bio', 'bioCorta', 'foto', 'fotoAlt']) if (!p[k]) fallo(`equipo.json: ${p.slug || '?'} sin "${k}"`);
const autorPorServicio = {};
for (const p of equipo) for (const s of p.servicios) autorPorServicio[s] = p;
for (const a of articulos) if (!autorPorServicio[a.servicio]) fallo(`${a.slug}: no hay autor para el servicio "${a.servicio}" (ver src/data/equipo.json)`);

// ---------- objeto site (disponible en todas las plantillas) ----------
const c = SITE.contacto;
// +56973951304 → +56 9 7395 1304
const formatoTel = (t) => t.replace(/^\+56(\d)(\d{4})(\d{4})$/, '+56 $1 $2 $3');
const NOMBRES_REDES = { linkedin: 'LinkedIn', instagram: 'Instagram', facebook: 'Facebook', x: 'X', youtube: 'YouTube' };
const urlsServicios = new Set(['/servicios/', ...servicios.map((s) => s.url)]);
const siteBase = {
  name: SITE.name,
  url: SITE.url,
  descripcion: SITE.descripcion,
  gtmId: SITE.gtmId,
  googleVerification: SITE.googleVerification,
  assetV,
  anio: new Date().getFullYear(),
  actualizado: fechaLarga(SITE.actualizado),
  contacto: { ...c, telefonos: c.telefonos.map((t) => ({ href: t.numero, display: formatoTel(t.numero), wa: t.whatsapp ? t.numero.replace('+', '') : '' })) },
  tieneContacto: !!(c.email || c.telefonos.length || c.direccion),
  redes: Object.entries(SITE.redes)
    .filter(([, url]) => url)
    .map(([k, url]) => ({ name: NOMBRES_REDES[k] || k, url })),
  servicios,
};
const navPara = (url) =>
  NAV.filter((n) => n.url !== '/contacto/').map((n) => ({
    ...n,
    actual: n.url === '/servicios/' ? urlsServicios.has(url) : url === n.url || url.startsWith(n.url),
  }));

// ---------- páginas ----------
const paginas = [];
const addPagina = (p) => paginas.push({ robots: 'index,follow,max-image-preview:large', ogType: 'website', ...p });
const org = schema.organizacion();

// Inicio
{
  addPagina({
    url: '/',
    template: 'home',
    title: 'Tabano | Marketing digital y desarrollo web para empresas en Chile',
    description:
      'Agencia de marketing digital: desarrollo web, Google Ads, Meta Ads y growth marketing para empresas en Chile. Estrategia, ejecución y medición en un mismo equipo.',
    data: {
      problemas,
      servicios,
      metodologia,
      principios,
      recientes: articulos.slice(0, 3),
      faqs: faqsVista(faqsHome),
      ubicacion: 'home',
      pendienteConfianza: pend('prueba social', 'Logos de clientes, testimonios, certificaciones o alianzas: agregar solo cuando existan y estén autorizados por escrito.'),
      cta: { titulo: 'Conversemos sobre tu proyecto', texto: 'Cuéntanos tu objetivo y tu situación actual. Te respondemos con una propuesta de diagnóstico y los siguientes pasos.', href: '/contacto/' },
    },
    jsonld: [org, schema.sitioWeb()],
  });
}

// Servicios (índice)
{
  const migas = [INICIO, { name: 'Servicios', url: '/servicios/' }];
  addPagina({
    url: '/servicios/',
    template: 'servicios',
    title: 'Servicios de marketing digital y desarrollo web | Tabano',
    description:
      'Desarrollo web, Google Ads, Meta Ads y growth marketing para empresas. Compara los servicios de Tabano y elige por dónde empezar según tu situación.',
    data: {
      h1: textos.servicios.h1,
      lead: inline(textos.servicios.lead),
      servicios,
      ubicacion: 'servicios',
      guia: textos.servicios.guia.map((g) => ({ situacion: inline(g.situacion), servicio: inline(g.servicio), motivo: inline(g.motivo) })),
      conexion: textos.servicios.conexion.map(inline),
      migas: migasDe(migas),
      cta: { titulo: '¿No sabes por dónde empezar?', texto: 'El diagnóstico inicial sirve para ordenar prioridades antes de comprometer presupuesto.', href: '/contacto/' },
    },
    jsonld: [
      org,
      schema.migas(migas),
      schema.coleccion({
        url: '/servicios/',
        nombre: 'Servicios de Tabano',
        descripcion: 'Desarrollo web, Google Ads, Meta Ads y growth marketing.',
        items: servicios.map((s) => ({ url: s.url, name: s.nombre })),
      }),
    ],
  });
}

// Páginas de servicio
for (const s of serviciosRaw) {
  const migas = [INICIO, { name: 'Servicios', url: '/servicios/' }, { name: s.nombre, url: s.url }];
  const secciones = s.secciones.map((sec) => ({
    id: sec.id,
    h2: sec.h2,
    parrafos: (sec.parrafos || []).map(inline),
    items: (sec.items || []).map(inline),
    etapas: sec.etapas ? sec.etapas.map((e) => ({ t: inline(e.t), d: inline(e.d) })) : null,
    tabla: sec.tabla
      ? {
          caption: sec.tabla.caption,
          cabeceras: sec.tabla.cabeceras.map(inline),
          filas: sec.tabla.filas.map((f) => ({ primera: inline(f[0]), resto: f.slice(1).map(inline) })),
        }
      : null,
    nota: sec.nota ? inline(sec.nota) : '',
  }));
  const rel = s.relacionados || {};
  const relRecursos = (rel.recursos || []).map((slug) => {
    const a = articuloPorSlug[slug];
    if (!a) fallo(`${s.slug}: recurso relacionado "${slug}" no existe`);
    return { url: a.url, titulo: a.titulo };
  });
  const relServicios = (rel.servicios || []).map((slug) => {
    if (!servicioPorSlug[slug]) fallo(`${s.slug}: servicio relacionado "${slug}" no existe`);
    return { url: servicioPorSlug[slug].url, nombre: servicioPorSlug[slug].nombre };
  });
  addPagina({
    url: s.url,
    template: 'servicio',
    title: s.title,
    description: recortar(s.description),
    data: {
      kicker: s.kicker,
      grafico: s.grafico,
      h1: s.h1,
      lead: inline(s.lead),
      secciones,
      toc: [...secciones.map((x) => ({ id: x.id, h2: x.h2 })), { id: 'faq-servicio', h2: 'Preguntas frecuentes' }],
      faqs: faqsVista(s.faqs),
      relServicios,
      relRecursos,
      migas: migasDe(migas),
      cta: { ...s.cta, href: `/contacto/?servicio=${encodeURIComponent(s.nombre)}` },
    },
    jsonld: [org, schema.migas(migas), schema.servicio({ url: s.url, nombre: s.nombre, serviceType: s.serviceType, description: recortar(s.description) })],
  });
}

// Agencia
{
  const migas = [INICIO, { name: 'Agencia', url: '/agencia/' }];
  addPagina({
    url: '/agencia/',
    template: 'agencia',
    title: 'Agencia de marketing digital y desarrollo web | Tabano',
    description:
      'Conoce cómo trabaja Tabano: un enfoque que conecta sitio web, campañas y datos, con metodología en cinco pasos y límites claros sobre lo que no prometemos.',
    data: {
      h1: textos.agencia.h1,
      lead: inline(textos.agencia.lead),
      enfoque: textos.agencia.enfoque.map(inline),
      equipo,
      limites: textos.agencia.limites.map(inline),
      principios,
      metodologia,
      migas: migasDe(migas),
      pendienteEquipo: pend('historia de la empresa', 'Año de inicio y trayectoria de Tabano como empresa. No se publica hasta confirmarlo.'),
      pendienteCompromisos: pend('compromisos de trabajo', 'Confirmar que cada punto de esta lista refleja la práctica real de Tabano antes del lanzamiento.'),
      cta: { titulo: '¿Conversamos?', texto: 'Cuéntanos qué necesitas y vemos si podemos ayudarte.', href: '/contacto/' },
    },
    jsonld: [org, ...equipo.map((p) => ({ '@context': 'https://schema.org', ...schema.persona(p) })), schema.migas(migas)],
  });
}

// Casos de éxito
{
  const migas = [INICIO, { name: 'Casos de éxito', url: '/casos-de-exito/' }];
  addPagina({
    url: '/casos-de-exito/',
    template: 'casos-de-exito',
    title: 'Casos de éxito | Tabano',
    description: 'Casos de éxito de Tabano: proyectos reales con contexto, acciones, indicadores y límites de la comparación. Se publican solo con autorización del cliente.',
    data: {
      h1: textos.casos.h1,
      lead: inline(textos.casos.lead),
      casos,
      vacio: textos.casos.vacio.map(inline),
      estructura: textos.casos.estructura.map((e) => ({ t: inline(e.t), d: inline(e.d) })),
      migas: migasDe(migas),
      pendienteCasos: pend('casos reales', 'Agregar casos en src/data/casos.json cuando el cliente los autorice y las cifras puedan respaldarse.'),
      cta: { titulo: '¿Quieres ser nuestro próximo caso?', texto: 'Cuéntanos tu objetivo y definimos juntos cómo medirlo.', href: '/contacto/' },
    },
    jsonld: [org, schema.migas(migas)],
  });
}

// Recursos (índice)
{
  const migas = [INICIO, { name: 'Recursos', url: '/recursos/' }];
  addPagina({
    url: '/recursos/',
    template: 'recursos',
    title: 'Recursos de marketing digital y desarrollo web | Tabano',
    description:
      'Guías prácticas sobre cómo elegir una agencia de marketing digital, cuánto cuesta un sitio web empresarial y cuándo conviene invertir en Google Ads.',
    data: {
      h1: textos.recursos.h1,
      lead: inline(textos.recursos.lead),
      articulos,
      migas: migasDe(migas),
      cta: { titulo: '¿Tienes una duda concreta?', texto: 'Escríbenos y la revisamos con tu caso.', href: '/contacto/' },
    },
    jsonld: [
      org,
      schema.migas(migas),
      schema.coleccion({ url: '/recursos/', nombre: 'Recursos de Tabano', descripcion: 'Guías de marketing digital y desarrollo web.', items: articulos.map((a) => ({ url: a.url, name: a.titulo })) }),
    ],
  });
}

// Artículos
for (const a of articulos) {
  const migas = [INICIO, { name: 'Recursos', url: '/recursos/' }, { name: a.titulo, url: a.url }];
  addPagina({
    url: a.url,
    template: 'articulo',
    ogType: 'article',
    title: a.titleTag,
    description: recortar(a.description),
    data: {
      h1: a.titulo,
      categoria: a.categoria,
      resumen: a.resumen,
      html: a.html,
      toc: a.toc.length >= 3 ? a.toc : [],
      fecha: a.fecha,
      actualizado: a.actualizado,
      fechaTexto: a.fechaTexto,
      actualizadoTexto: a.actualizadoTexto,
      minutos: a.minutos,
      servicioRel: servicioPorSlug[a.servicio],
      autor: autorPorServicio[a.servicio],
      otros: articulos.filter((x) => x.slug !== a.slug).slice(0, 2).map((x) => ({ url: x.url, titulo: x.titulo })),
      migas: migasDe(migas),
      cta: { titulo: '¿Quieres aplicar esto a tu empresa?', texto: 'Cuéntanos tu situación y la revisamos contigo.', href: `/contacto/?servicio=${encodeURIComponent(servicioPorSlug[a.servicio].nombre)}` },
    },
    jsonld: [org, schema.migas(migas), schema.articulo({ url: a.url, titulo: a.titulo, description: recortar(a.description), fecha: a.fecha, actualizado: a.actualizado, autor: autorPorServicio[a.servicio] }), { '@context': 'https://schema.org', ...schema.persona(autorPorServicio[a.servicio]) }],
  });
}

// Contacto
{
  const migas = [INICIO, { name: 'Contacto', url: '/contacto/' }];
  addPagina({
    url: '/contacto/',
    template: 'contacto',
    title: 'Contacto y solicitud de diagnóstico | Tabano',
    description: 'Escríbenos para solicitar un diagnóstico de marketing digital o cotizar desarrollo web, Google Ads, Meta Ads o growth marketing con Tabano.',
    data: {
      h1: textos.contacto.h1,
      lead: inline(textos.contacto.lead),
      pasos: textos.contacto.pasos.map(inline),
      opcionesServicio: OPCIONES_SERVICIO,
      opcionesPresupuesto: OPCIONES_PRESUPUESTO,
      migas: migasDe(migas),
    },
    jsonld: [org, schema.migas(migas)],
  });
}

// Privacidad
{
  const { meta, body } = separarFrontMatter(readFileSync(join(ROOT, 'src/content/privacidad.md'), 'utf8'));
  const reemplazos = {
    '%%RAZON_SOCIAL%%': SITE.empresa.razonSocial,
    '%%RUT%%': SITE.empresa.rut ? `, RUT ${SITE.empresa.rut},` : '',
    '%%DOMICILIO%%': [c.direccion, c.ciudad, 'Chile'].filter(Boolean).join(', '),
    '%%EMAIL%%': c.email,
  };
  const cuerpo = Object.entries(reemplazos).reduce((t, [k, v]) => t.split(k).join(v), body);
  const { html } = renderMarkdown(cuerpo);
  const migas = [INICIO, { name: 'Política de privacidad', url: '/privacidad/' }];
  addPagina({
    url: '/privacidad/',
    template: 'privacidad',
    title: 'Política de privacidad | Tabano',
    description: 'Cómo trata Tabano los datos personales que recibe a través del formulario de contacto y de la medición del sitio: finalidad, proveedores, cookies y derechos.',
    data: {
      h1: meta.titulo,
      html,
      migas: migasDe(migas),
      pendientePrivacidad: pend('conservación y revisión legal', 'Falta el plazo de conservación de los datos y confirmar el RUT completo (con dígito verificador). El texto es un borrador y debe revisarlo una persona con formación legal (incluida la Ley N° 21.719) antes del lanzamiento.'),
    },
    jsonld: [org, schema.migas(migas)],
  });
}

// Gracias y 404 (no indexables)
addPagina({
  url: '/gracias/',
  template: 'gracias',
  title: 'Solicitud recibida | Tabano',
  description: 'Recibimos tu solicitud de contacto. Te responderemos al correo que indicaste.',
  robots: 'noindex,follow',
  indexable: false,
  data: {},
  jsonld: [],
});
addPagina({
  url: '/404.html',
  template: '404',
  title: 'Página no encontrada | Tabano',
  description: 'La página que buscas no existe. Vuelve al inicio o revisa los servicios y recursos de Tabano.',
  robots: 'noindex,follow',
  indexable: false,
  data: {},
  jsonld: [],
});

// ---------- render ----------
let escritas = 0;
for (const p of paginas) {
  const site = { ...siteBase, nav: navPara(p.url) };
  const content = engine.render(p.template, { site, ...p.data });
  const canonical = SITE.url + p.url;
  const html = engine.render('layout', {
    site,
    content,
    jsonld: p.jsonld.map(jsonLdTag).join('\n  '),
    seo: { title: p.title, description: p.description, canonical, robots: p.robots, ogType: p.ogType, ogImage: SITE.url + SITE.ogImage },
  });
  const destino = p.url.endsWith('.html') ? join(DIST, p.url) : join(DIST, p.url, 'index.html');
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, html);
  escritas++;
}

// ---------- sitemap.xml y llms.txt ----------
const lastmod = (p) => {
  const a = articulos.find((x) => x.url === p.url);
  return a ? a.actualizado : SITE.actualizado;
};
const indexables = paginas.filter((p) => p.indexable !== false);
const sitemap =
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  indexables.map((p) => `  <url>\n    <loc>${SITE.url}${p.url}</loc>\n    <lastmod>${lastmod(p)}</lastmod>\n  </url>`).join('\n') +
  `\n</urlset>\n`;
writeFileSync(join(DIST, 'sitemap.xml'), sitemap);

const porUrl = Object.fromEntries(paginas.map((p) => [p.url, p]));
const linea = (url, desc) => `- [${porUrl[url].title.split(' | ')[0]}](${SITE.url}${url}): ${desc}`;
const llms = [
  '# Tabano',
  '',
  `> ${SITE.descripcion} Opera en Chile. No publica cifras, casos ni testimonios que no pueda respaldar.`,
  '',
  '## Servicios',
  ...servicios.map((s) => linea(s.url, s.resumen)),
  '',
  '## Recursos',
  ...articulos.map((a) => linea(a.url, a.resumen)),
  '',
  '## Otras páginas',
  linea('/agencia/', 'enfoque de trabajo, metodología y límites.'),
  linea('/casos-de-exito/', 'casos reales, cuando existan y estén autorizados.'),
  linea('/contacto/', 'formulario para solicitar un diagnóstico.'),
  '',
  `Última revisión del contenido institucional: ${SITE.actualizado}.`,
  '',
].join('\n');
writeFileSync(join(DIST, 'llms.txt'), llms);

console.log(`OK: ${escritas} páginas, ${indexables.length} en sitemap, ${articulos.length} artículos, assets v=${assetV}`);
