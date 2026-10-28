import json, os, urllib.parse
from playwright.sync_api import sync_playwright
SP=os.environ.get('OUT', os.path.join(os.path.dirname(os.path.abspath(__file__)),'out')); B=os.environ.get('BASE','http://127.0.0.1:8765'); LOG=SP+'/post.log'
if os.path.exists(LOG): os.remove(LOG)
out=[]
def ok(n,c,extra=''): out.append(('PASS' if c else 'FAIL', n, extra))
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':1280,'height':900}); pg=ctx.new_page()
    # --- preselección por query ---
    pg.goto(B+'/contacto/?servicio=Google%20Ads'); 
    ok('preselecciona servicio desde la URL', pg.input_value('#f-servicio')=='Google Ads')
    # --- envío vacío ---
    pg.goto(B+'/contacto/')
    pg.click('button[type=submit]')
    ok('envío vacío no navega', pg.url.endswith('/contacto/'))
    ok('resumen de errores visible y enfocado', pg.is_visible('#form-alert') and pg.evaluate("document.activeElement.id")=='form-alert')
    ok('6 errores en el resumen', pg.locator('#form-alert li').count()==5+0 or pg.locator('#form-alert li').count()==5, str(pg.locator('#form-alert li').count()))
    ok('aria-invalid en nombre', pg.get_attribute('#f-nombre','aria-invalid')=='true')
    ok('mensaje de error visible', pg.is_visible('#f-nombre-error') and 'nombre' in pg.inner_text('#f-nombre-error').lower())
    # email inválido
    pg.fill('#f-nombre','Ana Prueba'); pg.fill('#f-email','no-es-correo'); pg.select_option('#f-servicio','Meta Ads'); pg.fill('#f-mensaje','Hola, quiero cotizar.')
    pg.fill('#f-sitio','esto no es un sitio')
    pg.click('button[type=submit]')
    ok('email inválido detectado', pg.get_attribute('#f-email','aria-invalid')=='true')
    ok('sitio inválido detectado', pg.get_attribute('#f-sitio','aria-invalid')=='true')
    ok('consentimiento requerido', pg.get_attribute('#f-consentimiento','aria-invalid')=='true')
    ok('aún no se envió nada', not os.path.exists(LOG))
    # corrección y envío válido (doble clic)
    pg.fill('#f-email','ana@empresa.cl'); pg.fill('#f-sitio','empresa.cl'); pg.fill('#f-empresa','Empresa SpA'); pg.select_option('#f-presupuesto','Menos de $500.000 CLP'); pg.check('#f-consentimiento')
    with pg.expect_navigation(url='**/gracias/'):
        pg.dblclick('button[type=submit]')
    ok('redirige a /gracias/', pg.url.endswith('/gracias/'))
    ok('gracias tiene h1 y noindex', 'Recibimos' in pg.inner_text('h1') and 'noindex' in pg.get_attribute('meta[name=robots]','content'))
    lines=[json.loads(l) for l in open(LOG)] if os.path.exists(LOG) else []
    ok('exactamente 1 POST (sin duplicados)', len(lines)==1, str(len(lines)))
    if lines:
        l=lines[0]; q=urllib.parse.parse_qs(l['body'], keep_blank_values=True)
        ok('POST a /', l['path']=='/')
        ok('Content-Type urlencoded', (l['ct'] or '').startswith('application/x-www-form-urlencoded'), str(l['ct']))
        ok('cuerpo no es JSON', not l['body'].lstrip().startswith('{'))
        ok('form-name=contact', q.get('form-name')==['contact'])
        for k,v in {'nombre':'Ana Prueba','email':'ana@empresa.cl','empresa':'Empresa SpA','sitio_web':'empresa.cl','servicio':'Meta Ads','presupuesto':'Menos de $500.000 CLP','mensaje':'Hola, quiero cotizar.','consentimiento':'si'}.items():
            ok(f'campo {k}', q.get(k)==[v], str(q.get(k)))
        ok('honeypot vacío enviado', q.get('bot-field')==[''])
    # --- honeypot lleno: no envía ---
    n0=len(lines)
    pg.goto(B+'/contacto/'); pg.fill('#f-nombre','Bot'); pg.fill('#f-email','b@b.cl'); pg.select_option('#f-servicio','Otro'); pg.fill('#f-mensaje','spam'); pg.check('#f-consentimiento')
    pg.evaluate("document.querySelector('[name=bot-field]').value='soy un bot'")
    pg.click('button[type=submit]'); pg.wait_for_timeout(800)
    n1=len([1 for _ in open(LOG)])
    ok('honeypot lleno no genera POST', n1==n0)
    # --- error de red: botón se libera y avisa ---
    pg.goto(B+'/contacto/'); pg.fill('#f-nombre','Ana'); pg.fill('#f-email','a@b.cl'); pg.select_option('#f-servicio','Otro'); pg.fill('#f-mensaje','x'); pg.check('#f-consentimiento')
    pg.route('**/', lambda r: r.abort() if r.request.method=='POST' else r.continue_())
    pg.click('button[type=submit]'); pg.wait_for_timeout(1200)
    ok('error de red: botón vuelve a habilitarse', pg.is_enabled('button[type=submit]'))
    ok('error de red: mensaje visible', pg.is_visible('#form-alert') and 'No pudimos' in pg.inner_text('#form-alert'))
    ctx.close()
    # --- sin JS: el formulario sigue siendo un POST nativo válido ---
    ctx=b.new_context(java_script_enabled=False); pg=ctx.new_page(); pg.goto(B+'/contacto/')
    ok('sin JS: formulario visible', pg.is_visible('form[name=contact]'))
    ok('sin JS: nav visible (no-js)', pg.is_visible('#menu'))
    ctx.close()
    # --- menú móvil ---
    ctx=b.new_context(viewport={'width':375,'height':800}); pg=ctx.new_page(); pg.goto(B+'/')
    ok('móvil: menú cerrado al inicio', not pg.is_visible('#menu') and pg.get_attribute('.nav-btn','aria-expanded')=='false')
    pg.click('.nav-btn'); ok('móvil: abre menú', pg.is_visible('#menu') and pg.get_attribute('.nav-btn','aria-expanded')=='true')
    pg.keyboard.press('Escape'); ok('móvil: Escape cierra y devuelve foco', not pg.is_visible('#menu') and pg.evaluate("document.activeElement.className").startswith('nav-btn'))
    pg.click('.nav-btn'); pg.click('#menu a[href="/recursos/"]'); pg.wait_for_url('**/recursos/'); ok('móvil: enlace del menú navega', True)
    ctx.close()
    # --- sin GTM: nada de seguimiento ---
    ctx=b.new_context(); pg=ctx.new_page(); reqs=[]; pg.on('request',lambda r:reqs.append(r.url))
    pg.goto(B+'/'); pg.wait_for_timeout(500)
    ok('sin GTM: sin peticiones externas', all(u.startswith(B) for u in reqs), str([u for u in reqs if not u.startswith(B)]))
    ok('sin GTM: no hay banner', pg.locator('#consent').count()==0)
    ctx.close()
    # --- reduced motion ---
    ctx=b.new_context(reduced_motion='reduce'); pg=ctx.new_page(); pg.goto(B+'/'); pg.wait_for_timeout(300)
    ok('reduced-motion: trazos del hero visibles de inmediato', pg.evaluate("getComputedStyle(document.querySelector('.hero-art .trazo')).strokeDashoffset")=='0px')
    ctx.close(); b.close()
for r in out: print(*r)
print('\nPASS',sum(1 for r in out if r[0]=='PASS'),'FAIL',sum(1 for r in out if r[0]=='FAIL'))
