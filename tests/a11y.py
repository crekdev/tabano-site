import os
import json
from playwright.sync_api import sync_playwright
B=os.environ.get('BASE','http://127.0.0.1:8765')
PAGES=['/','/servicios/','/desarrollo-web/','/google-ads/','/meta-ads/','/growth-marketing/','/agencia/','/casos-de-exito/','/recursos/','/recursos/cuanto-cuesta-sitio-web-empresarial/','/contacto/','/gracias/','/privacidad/','/404.html']
JS = r"""
() => {
  const res = {sinNombre:[], pequenos:[], contraste:[], sinFoco:[]};
  const vis = e => { const r=e.getBoundingClientRect(), s=getComputedStyle(e); return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'&&!e.closest('[hidden],.hp,.sr-only,.skip'); };
  const nombre = e => (e.getAttribute('aria-label') || (e.getAttribute('aria-labelledby')? [...e.getAttribute('aria-labelledby').split(' ')].map(i=>document.getElementById(i)?.textContent).join(' '):'') || (e.id && document.querySelector(`label[for="${e.id}"]`)?.textContent) || e.closest('label')?.textContent || e.textContent || e.querySelector('img[alt]')?.getAttribute('alt') || e.getAttribute('title') || '').trim();
  document.querySelectorAll('a[href],button,input:not([type=hidden]),select,textarea,summary').forEach(e=>{
    if(!vis(e)) return;
    if(!nombre(e)) res.sinNombre.push(e.outerHTML.slice(0,100));
    const r=e.getBoundingClientRect();
    const enLinea = e.tagName==='A' && getComputedStyle(e).display==='inline' && e.closest('p,li,.prose,td,th,.lead,label');
    if(!enLinea && (r.width<24||r.height<24) && e.type!=='checkbox') res.pequenos.push(e.outerHTML.slice(0,80)+` ${Math.round(r.width)}x${Math.round(r.height)}`);
  });
  const rgb = s => { const m=s.match(/[\d.]+/g).map(Number); return {r:m[0],g:m[1],b:m[2],a:m[3]===undefined?1:m[3]}; };
  const lin = v => { v/=255; return v<=0.03928? v/12.92 : ((v+0.055)/1.055)**2.4; };
  const L = c => 0.2126*lin(c.r)+0.7152*lin(c.g)+0.0722*lin(c.b);
  const mezcla = (f,b) => ({r:f.r*f.a+b.r*(1-f.a),g:f.g*f.a+b.g*(1-f.a),b:f.b*f.a+b.b*(1-f.a),a:1});
  const fondo = e => { let pila=[]; for(let n=e;n;n=n.parentElement){ const c=rgb(getComputedStyle(n).backgroundColor); if(c.a>0) {pila.push(c); if(c.a===1) break;} } let base={r:255,g:255,b:255,a:1}; for(let i=pila.length-1;i>=0;i--) base=mezcla(pila[i],base); return base; };
  const vistos=new Set();
  const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  while(w.nextNode()){ const t=w.currentNode; if(!t.textContent.trim()) continue; const e=t.parentElement; if(!e||vistos.has(e)||!vis(e)||e.closest('svg,script,style')) continue; vistos.add(e);
    const s=getComputedStyle(e); if(s.backgroundImage!=='none' && s.backgroundImage.includes('gradient')) continue; // marcador del hero (texto sobre tinta, ya medido)
    const f=mezcla(rgb(s.color), fondo(e)); const b=fondo(e); const l1=L(f),l2=L(b); const ratio=(Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);
    const px=parseFloat(s.fontSize), bold=parseInt(s.fontWeight)>=700; const grande = px>=24 || (px>=18.66&&bold); const min=grande?3:4.5;
    if(ratio<min) res.contraste.push(`${e.tagName}.${e.className} "${t.textContent.trim().slice(0,30)}" ${ratio.toFixed(2)} (mín ${min})`); }
  return res;
}
"""
tot={'sinNombre':0,'pequenos':0,'contraste':0,'sinFoco':0}
with sync_playwright() as p:
    b=p.chromium.launch()
    for w,name in [(1280,'escritorio'),(375,'móvil')]:
        pg=b.new_page(viewport={'width':w,'height':900})
        for u in PAGES:
            pg.goto(B+u, wait_until='networkidle'); pg.wait_for_timeout(1800)
            r=pg.evaluate(JS)
            for k in ('sinNombre','pequenos','contraste'):
                if r[k]: print(f'[{name}] {u} {k}:', r[k][:5]); tot[k]+=len(r[k])
        # foco visible: tabular por la página de contacto
        pg.goto(B+'/contacto/', wait_until='networkidle'); sin=[]
        for i in range(40):
            pg.keyboard.press('Tab')
            info=pg.evaluate("()=>{const e=document.activeElement;if(!e||e===document.body)return null;const s=getComputedStyle(e);return {t:e.tagName+'#'+e.id+'.'+e.className, o:s.outlineStyle, w:parseFloat(s.outlineWidth), sh:s.boxShadow}}")
            if info and (info['o']=='none' or info['w']<2) and info['sh']=='none': sin.append(info['t'])
        if sin: print(f'[{name}] foco no visible en:', sin); tot['sinFoco']+=len(sin)
        pg.close()
    b.close()
print('\nTOTAL', tot)
