import os
import json, sys, time, re, os
from playwright.sync_api import sync_playwright
SP = os.environ.get('OUT', os.path.join(os.path.dirname(os.path.abspath(__file__)),'out')); BASE=os.environ.get('BASE','http://127.0.0.1:8765'); LOG=SP+'/post.log'
PAGES=['/','/servicios/','/desarrollo-web/','/google-ads/','/meta-ads/','/growth-marketing/','/agencia/','/casos-de-exito/','/recursos/','/recursos/como-elegir-agencia-marketing-digital-chile/','/recursos/cuanto-cuesta-sitio-web-empresarial/','/recursos/google-ads-para-empresas-cuando-conviene-invertir/','/contacto/','/gracias/','/privacidad/','/no-existe/']
res={'overflow':[], 'console':[], 'fails':[]}
with sync_playwright() as p:
    b = p.chromium.launch()
    for w,h,name in [(375,812,'movil'),(768,1024,'tablet'),(1280,800,'escritorio')]:
        ctx = b.new_context(viewport={'width':w,'height':h}); pg = ctx.new_page()
        pg.on('console', lambda m: res['console'].append((name,m.type,m.text)) if m.type in ('error','warning') else None)
        pg.on('pageerror', lambda e: res['console'].append((name,'pageerror',str(e))))
        pg.on('requestfailed', lambda r: res['console'].append((name,'requestfailed',r.url)))
        for u in PAGES:
            pg.goto(BASE+u, wait_until='networkidle')
            sw = pg.evaluate('document.documentElement.scrollWidth'); cw = pg.evaluate('document.documentElement.clientWidth')
            if sw>cw: 
                culprit = pg.evaluate("""()=>{const w=document.documentElement.clientWidth;return [...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>w+1).slice(0,4).map(e=>e.tagName+'.'+e.className)}""")
                res['overflow'].append((name,u,sw,cw,culprit))
        if name!='tablet':
            for u,fn in [('/','home'),('/desarrollo-web/','servicio'),('/contacto/','contacto'),('/recursos/cuanto-cuesta-sitio-web-empresarial/','articulo')]:
                pg.goto(BASE+u, wait_until='networkidle'); pg.wait_for_timeout(2500)
                pg.screenshot(path=f'{SP}/shots/{fn}-{name}.png', full_page=True)
        ctx.close()
    b.close()
print(json.dumps(res, ensure_ascii=False, indent=1))
