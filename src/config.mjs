// Configuración global de tabano.cl. Todo lo que cambia entre entornos o falta por confirmar vive aquí.
// Lo que quede VACÍO no se muestra ni se publica en JSON-LD.

export const SITE = {
  name: 'Tabano',
  url: 'https://tabano.cl',
  locale: 'es-CL',
  tagline: 'Marketing digital, desarrollo web y growth para empresas',
  descripcion:
    'Agencia de marketing digital que combina desarrollo web, campañas en Google Ads y Meta Ads, y growth marketing para ayudar a las empresas a captar y convertir clientes.',
  // Fecha de última revisión del contenido institucional (se usa en el sitemap).
  actualizado: '2026-10-28',

  // Analítica: Google Tag Manager centralizado. Vacío = no se carga nada y no se muestra el banner de consentimiento.
  // GA4 se configura dentro de GTM (ver README).
  gtmId: 'GTM-MHXDNRK',
  // Código de verificación de Google Search Console (etiqueta meta). Vacío = no se incluye.
  googleVerification: '',

  ogImage: '/assets/img/og-tabano.png',

  // Responsable legal del sitio (aparece en la política de privacidad y en JSON-LD como legalName).
  empresa: {
    razonSocial: 'Servicios Tábano Limitada',
    rut: '76.396.999-1', // confirmado por el titular el 28-10-2026
  },

  // Datos de contacto reales.
  contacto: {
    email: 'info@tabano.cl',
    // Formato internacional, sin espacios. whatsapp: true muestra además un enlace a WhatsApp.
    telefonos: [
      { numero: '+56973951304', whatsapp: true },
      { numero: '+56967065858', whatsapp: true },
    ],
    direccion: "Av. Alameda Libertador Bernardo O'Higgins 1302, Depto 70",
    ciudad: 'Santiago',
  },
  // Redes sociales: solo URLs reales. Vacío = no se muestra.
  redes: { linkedin: '', instagram: '', facebook: '', x: '', youtube: '' },

  // true = muestra recuadros "Pendiente de completar" donde falta información del negocio.
  // Poner false antes del lanzamiento (el check.mjs avisa si queda alguno visible).
  mostrarPendientes: false,
};

export const NAV = [
  { name: 'Servicios', url: '/servicios/' },
  { name: 'Recursos', url: '/recursos/' },
  { name: 'Agencia', url: '/agencia/' },
  { name: 'Contacto', url: '/contacto/' },
];

export const OPCIONES_SERVICIO = ['Desarrollo web', 'Google Ads', 'Meta Ads', 'Growth marketing', 'Otro'];

// Rangos para que la persona indique su presupuesto mensual orientativo (es un campo opcional del formulario).
export const OPCIONES_PRESUPUESTO = [
  'Aún no lo he definido',
  'Menos de $500.000 CLP',
  '$500.000 a $1.500.000 CLP',
  '$1.500.000 a $5.000.000 CLP',
  'Más de $5.000.000 CLP',
];
