// Datos estructurados (JSON-LD). Solo se publica lo que existe y es verificable:
// sin valoraciones, reseñas, premios, precios, autores ni direcciones inventadas.
// No se implementa FAQPage: las preguntas frecuentes están en el HTML visible, pero no se marcan
// con la expectativa de obtener resultados enriquecidos.

import { SITE } from '../config.mjs';

const abs = (path) => SITE.url + path;
const ORG_ID = abs('/#organizacion');

export const organizacion = () => {
  const redes = Object.values(SITE.redes).filter(Boolean);
  const c = SITE.contacto;
  const org = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORG_ID,
    name: SITE.name,
    url: abs('/'),
    logo: abs('/assets/img/logo-tabano.png'),
    description: SITE.descripcion,
    areaServed: { '@type': 'Country', name: 'Chile' },
    knowsAbout: ['Desarrollo web', 'Google Ads', 'Meta Ads', 'Growth marketing', 'Analítica web', 'Optimización de conversiones'],
  };
  if (SITE.empresa.razonSocial) org.legalName = SITE.empresa.razonSocial;
  if (c.email) org.email = c.email;
  if (c.telefonos.length) {
    org.telephone = c.telefonos[0].numero;
    org.contactPoint = c.telefonos.map((t) => ({ '@type': 'ContactPoint', telephone: t.numero, contactType: 'customer service', areaServed: 'CL', availableLanguage: 'es' }));
  }
  if (c.direccion && c.ciudad) {
    org.address = { '@type': 'PostalAddress', streetAddress: c.direccion, addressLocality: c.ciudad, addressCountry: 'CL' };
  }
  if (redes.length) org.sameAs = redes;
  return org;
};

// Persona del equipo. Solo campos entregados por la persona (nombre, descripción, foto, sitio propio).
export const persona = (p) => {
  const o = {
    '@type': 'Person',
    '@id': abs(`/agencia/#${p.slug}`),
    name: p.nombre,
    jobTitle: p.rol,
    description: p.bioCorta,
    image: abs(p.foto),
    url: abs(`/agencia/#${p.slug}`),
    worksFor: { '@id': ORG_ID },
  };
  if (p.url) o.sameAs = [p.url];
  return o;
};

export const sitioWeb = () => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': abs('/#sitio'),
  url: abs('/'),
  name: SITE.name,
  inLanguage: 'es-CL',
  publisher: { '@id': ORG_ID },
});

export const migas = (items) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: it.name,
    item: abs(it.url),
  })),
});

export const servicio = (s) => ({
  '@context': 'https://schema.org',
  '@type': 'Service',
  '@id': abs(s.url) + '#servicio',
  name: s.nombre,
  serviceType: s.serviceType,
  description: s.description,
  url: abs(s.url),
  provider: { '@id': ORG_ID },
  areaServed: { '@type': 'Country', name: 'Chile' },
  inLanguage: 'es-CL',
});

export const articulo = (a) => ({
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  '@id': abs(a.url) + '#articulo',
  headline: a.titulo,
  description: a.description,
  inLanguage: 'es-CL',
  datePublished: a.fecha,
  dateModified: a.actualizado,
  mainEntityOfPage: abs(a.url),
  url: abs(a.url),
  author: a.autor ? { '@id': abs(`/agencia/#${a.autor.slug}`) } : { '@id': ORG_ID },
  publisher: { '@id': ORG_ID },
  image: abs(SITE.ogImage),
});

export const coleccion = ({ url, nombre, descripcion, items }) => ({
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: nombre,
  description: descripcion,
  url: abs(url),
  isPartOf: { '@id': abs('/#sitio') },
  mainEntity: {
    '@type': 'ItemList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, url: abs(it.url), name: it.name })),
  },
});
