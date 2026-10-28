/* Tabano · JavaScript del sitio (sin dependencias, mínimo).
   1) Menú móvil accesible  2) Analítica: eventos y consentimiento  3) Formulario de contacto
   Nada de seguimiento se activa sin consentimiento: si no hay GTM configurado, no se carga nada. */
(function () {
  'use strict';

  var body = document.body;
  var gtmId = body.getAttribute('data-gtm') || '';
  var dataLayer = (window.dataLayer = window.dataLayer || []);
  function gtag() { dataLayer.push(arguments); }

  /* ---------- 1) Menú móvil ---------- */
  var btn = document.querySelector('.nav-btn');
  var menu = document.getElementById('menu');
  function cerrarMenu(devolverFoco) {
    if (!btn || !menu) return;
    menu.removeAttribute('data-open');
    btn.setAttribute('aria-expanded', 'false');
    if (devolverFoco) btn.focus();
  }
  if (btn && menu) {
    btn.addEventListener('click', function () {
      var abierto = menu.hasAttribute('data-open');
      if (abierto) cerrarMenu(false);
      else { menu.setAttribute('data-open', ''); btn.setAttribute('aria-expanded', 'true'); }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.hasAttribute('data-open')) cerrarMenu(true);
    });
    menu.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('a')) cerrarMenu(false);
    });
  }

  /* ---------- 2) Analítica y consentimiento ---------- */
  var CLAVE = 'tabano_consent';
  function leerConsentimiento() {
    try { return window.localStorage.getItem(CLAVE); } catch (e) { return null; }
  }
  function guardarConsentimiento(v) {
    try { window.localStorage.setItem(CLAVE, v); } catch (e) { /* almacenamiento no disponible */ }
  }
  // Sin GTM no hay seguimiento. Con GTM, solo se envían eventos tras aceptar.
  function puedeMedir() { return !!gtmId && leerConsentimiento() === 'granted'; }

  function track(evento, params) {
    if (!puedeMedir()) return;
    var data = { event: evento };
    for (var k in params) if (Object.prototype.hasOwnProperty.call(params, k)) data[k] = params[k];
    dataLayer.push(data);
  }

  function cargarGTM() {
    if (!gtmId || window.__gtmCargado) return;
    window.__gtmCargado = true;
    dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(gtmId);
    document.head.appendChild(s);
  }

  function aplicarConsentimiento(valor) {
    var v = valor === 'granted' ? 'granted' : 'denied';
    gtag('consent', 'update', { ad_storage: v, analytics_storage: v, ad_user_data: v, ad_personalization: v });
    if (v === 'granted') cargarGTM();
  }

  var banner = document.getElementById('consent');
  if (gtmId) {
    // Consent Mode v2: todo denegado por defecto.
    gtag('consent', 'default', { ad_storage: 'denied', analytics_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', wait_for_update: 500 });
    var previo = leerConsentimiento();
    if (previo === 'granted' || previo === 'denied') aplicarConsentimiento(previo);
    else if (banner) banner.hidden = false;

    document.addEventListener('click', function (e) {
      var el = e.target.closest ? e.target.closest('[data-consent]') : null;
      if (!el) return;
      var valor = el.getAttribute('data-consent');
      guardarConsentimiento(valor);
      aplicarConsentimiento(valor);
      if (banner) banner.hidden = true;
    });
    var reabrir = document.querySelector('[data-consent-open]');
    if (reabrir && banner) reabrir.addEventListener('click', function () { banner.hidden = false; var b = banner.querySelector('button'); if (b) b.focus(); });
  }

  // click_contact: enlaces mailto/tel/WhatsApp y botones marcados data-track="contact".
  // click_service_cta: botones y tarjetas marcados data-track="service_cta".
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a,button') : null;
    if (!a) return;
    var href = a.getAttribute('href') || '';
    var tipo = a.getAttribute('data-track');
    if (/^(mailto:|tel:)/i.test(href) || /(wa\.me|api\.whatsapp\.com)/i.test(href) || tipo === 'contact') {
      track('click_contact', {
        canal: /^mailto:/i.test(href) ? 'email' : /^tel:/i.test(href) ? 'telefono' : /whatsapp|wa\.me/i.test(href) ? 'whatsapp' : 'formulario',
        ubicacion: a.getAttribute('data-location') || ''
      });
    } else if (tipo === 'service_cta') {
      track('click_service_cta', { servicio: a.getAttribute('data-service') || '', ubicacion: a.getAttribute('data-location') || '' });
    }
  });

  /* ---------- 3) Formulario de contacto ---------- */
  var form = document.querySelector('form[name="contact"]');
  if (form) {
    form.noValidate = true; // sin JS funciona la validación nativa; con JS usamos mensajes accesibles
    var enviando = false;
    var iniciado = false;
    // Preselecciona el servicio si llega en la URL (por ejemplo /contacto/?servicio=Google%20Ads).
    try {
      var pre = new URLSearchParams(window.location.search).get('servicio');
      var sel = document.getElementById('f-servicio');
      if (pre && sel) {
        for (var i = 0; i < sel.options.length; i++) if (sel.options[i].value === pre) { sel.value = pre; break; }
      }
    } catch (e) { /* sin URLSearchParams */ }
    var alerta = document.getElementById('form-alert');
    var estado = document.getElementById('form-status');
    var boton = form.querySelector('button[type="submit"]');
    var textoBoton = boton ? boton.querySelector('.btn-text') : null;
    var textoOriginal = textoBoton ? textoBoton.textContent : '';

    var campos = [
      { id: 'f-nombre', req: true, msg: 'Escribe tu nombre.' },
      { id: 'f-email', req: true, msg: 'Escribe tu correo electrónico.', tipo: 'email', msgTipo: 'Revisa el correo: debe tener un formato como nombre@empresa.cl.' },
      { id: 'f-sitio', req: false, tipo: 'sitio', msgTipo: 'Escribe la dirección de tu sitio, por ejemplo tuempresa.cl.' },
      { id: 'f-servicio', req: true, msg: 'Elige el servicio que te interesa.' },
      { id: 'f-mensaje', req: true, msg: 'Cuéntanos brevemente qué necesitas.' },
      { id: 'f-consentimiento', req: true, check: true, msg: 'Debes aceptar el tratamiento de tus datos para poder responderte.' }
    ];

    var esEmail = function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); };
    var esSitio = function (v) { return /^(https?:\/\/)?[^\s\/]+\.[^\s\/.]{2,}(\/\S*)?$/i.test(v); };

    function error(id, msg) {
      var el = document.getElementById(id);
      var err = document.getElementById(id + '-error');
      if (!el || !err) return;
      if (msg) {
        el.setAttribute('aria-invalid', 'true');
        err.textContent = msg;
        err.hidden = false;
      } else {
        el.removeAttribute('aria-invalid');
        err.textContent = '';
        err.hidden = true;
      }
    }

    function validarCampo(c) {
      var el = document.getElementById(c.id);
      if (!el) return null;
      var v = c.check ? (el.checked ? 'ok' : '') : (el.value || '').trim();
      if (c.req && !v) return c.msg;
      if (v && c.tipo === 'email' && !esEmail(v)) return c.msgTipo;
      if (v && c.tipo === 'sitio' && !esSitio(v)) return c.msgTipo;
      return null;
    }

    function validar() {
      var errores = [];
      campos.forEach(function (c) {
        var m = validarCampo(c);
        error(c.id, m);
        if (m) errores.push({ id: c.id, msg: m });
      });
      if (alerta) {
        if (errores.length) {
          alerta.innerHTML = '<p>Revisa estos campos antes de enviar:</p><ul>' + errores.map(function (e) {
            return '<li><a href="#' + e.id + '">' + e.msg + '</a></li>';
          }).join('') + '</ul>';
          alerta.hidden = false;
          alerta.focus();
        } else {
          alerta.hidden = true;
          alerta.innerHTML = '';
        }
      }
      return errores;
    }

    campos.forEach(function (c) {
      var el = document.getElementById(c.id);
      if (!el) return;
      el.addEventListener('blur', function () { if (el.value || c.check) error(c.id, validarCampo(c)); });
      el.addEventListener('input', function () { if (el.getAttribute('aria-invalid') === 'true') error(c.id, validarCampo(c)); });
      el.addEventListener('change', function () { if (el.getAttribute('aria-invalid') === 'true') error(c.id, validarCampo(c)); });
    });

    // form_start: primera interacción con el formulario (una vez por visita a la página).
    form.addEventListener('focusin', function () {
      if (iniciado) return;
      iniciado = true;
      track('form_start', { formulario: 'contact' });
    });

    function liberar(mensaje, esError) {
      enviando = false;
      if (boton) { boton.disabled = false; boton.removeAttribute('aria-busy'); }
      if (textoBoton) textoBoton.textContent = textoOriginal;
      if (estado) { estado.textContent = mensaje || ''; estado.className = 'form-status' + (esError ? '' : ' ok'); }
    }

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (enviando) return; // prevención de envíos duplicados
      var errores = validar();
      if (errores.length) return;

      // Honeypot: si un bot lo completó, simulamos éxito sin enviar.
      var trampa = form.querySelector('[name="bot-field"]');
      if (trampa && trampa.value) { window.location.assign('/gracias/'); return; }

      enviando = true;
      if (boton) { boton.disabled = true; boton.setAttribute('aria-busy', 'true'); }
      if (textoBoton) textoBoton.textContent = 'Enviando…';
      if (estado) { estado.textContent = 'Enviando tu solicitud…'; estado.className = 'form-status'; }

      // form_submit = intento de envío válido (no es una conversión).
      track('form_submit', { formulario: 'contact', servicio: (document.getElementById('f-servicio') || {}).value || '' });

      // Netlify Forms por AJAX: cuerpo application/x-www-form-urlencoded (no JSON).
      var datos = new URLSearchParams(new FormData(form)).toString();
      var controlador = typeof AbortController !== 'undefined' ? new AbortController() : null;
      var corte = controlador ? setTimeout(function () { controlador.abort(); }, 20000) : null;

      fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: datos,
        signal: controlador ? controlador.signal : undefined
      })
        .then(function (r) {
          if (corte) clearTimeout(corte);
          if (!r.ok) throw new Error('HTTP ' + r.status);
          // El generate_lead se envía en /gracias/ (una sola vez), tras confirmar el envío.
          try { window.sessionStorage.setItem('tabano_lead', 'pendiente'); } catch (e) { /* sin sessionStorage */ }
          window.location.assign('/gracias/');
        })
        .catch(function () {
          if (corte) clearTimeout(corte);
          liberar('No pudimos enviar tu solicitud. Revisa tu conexión e inténtalo de nuevo.', true);
          if (alerta) {
            alerta.innerHTML = '<p>No pudimos enviar tu solicitud. Revisa tu conexión e inténtalo de nuevo.</p>';
            alerta.hidden = false;
            alerta.focus();
          }
        });
    });
  }

  /* ---------- 4) Confirmación: generate_lead (una sola vez) ---------- */
  if (document.querySelector('[data-pagina="gracias"]')) {
    var marca = null;
    try { marca = window.sessionStorage.getItem('tabano_lead'); } catch (e) { /* ignorar */ }
    if (marca === 'pendiente') {
      try { window.sessionStorage.setItem('tabano_lead', 'enviado'); } catch (e) { /* ignorar */ }
      track('generate_lead', { formulario: 'contact' });
    }
  }
})();
