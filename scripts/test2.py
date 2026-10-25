import sys,io
from playwright.sync_api import sync_playwright
from PIL import Image, ImageChops
import numpy as np
f=sys.argv[1]
with sync_playwright() as p:
  b=p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
  for spec in sys.argv[2:]:
    name,w,h,q,*acts=spec.split('|')
    ctx=b.new_context(viewport={'width':int(w),'height':int(h)},reduced_motion='reduce' if 'rm' in acts else 'no-preference'); pg=ctx.new_page(); errs=[]
    pg.on('console',lambda m: m.type in('error','warning') and errs.append(m.type+': '+m.text)); pg.on('pageerror',lambda e: errs.append('pageerror: '+str(e)))
    pg.goto(f'http://localhost:8767/{f}?test=1{q}')
    try: pg.wait_for_function('window.__kb&&__kb.ready',timeout=120000)
    except Exception: errs.append('NOT READY '+pg.inner_text('body')[:600])
    extra=''
    for a in acts:
      if a.startswith('click='): pg.click(a[6:]); pg.wait_for_timeout(900)
      if a.startswith('sel='): pg.evaluate(f'__kb.select(__kb.poi({a[4:]!r}));__kb.fin()'); pg.wait_for_timeout(3000)
      if a.startswith('route='): x,y=a[6:].split(','); extra+=' ROUTE: '+pg.evaluate(f'__kb.route(__kb.poi({x!r}),__kb.poi({y!r}))'); pg.wait_for_timeout(3000)
      if a.startswith('view='): pg.evaluate(f'__kb.view({a[5:]})'); pg.wait_for_timeout(3500)
      if a=='gclick': x,y=pg.evaluate('__kb.gxy()'); pg.mouse.click(x,y); pg.wait_for_timeout(1500); pg.evaluate('__kb.fin()'); pg.wait_for_timeout(2500)
      if a.startswith('js='): pg.evaluate(a[3:]); pg.wait_for_timeout(1500)
      if a.startswith('key='): pg.keyboard.press(a[4:]); pg.wait_for_timeout(2500)
    pg.wait_for_timeout(2500)
    if 'stab' in acts:
      ims=[]
      for k in range(3): ims.append(np.asarray(Image.open(io.BytesIO(pg.screenshot(timeout=120000))).convert('L')).astype(int)); pg.wait_for_timeout(700)
      for k in range(2):
        d=np.abs(ims[k+1]-ims[k]); extra+=f' diff{k}: mean={d.mean():.4f} px>8={(d>8).mean()*100:.3f}% max={d.max()}'
    pg.screenshot(path=f'shots/{name}.png',timeout=120000)
    info=pg.evaluate('window.__kb?{dc:__kb.dc(),b:__kb.stats.buildings,pois:__kb.stats.pois}:null')
    print(name,info,extra,pg.evaluate('__kb.cam()'),'ERRORS:',errs,flush=True); ctx.close()
  b.close()
