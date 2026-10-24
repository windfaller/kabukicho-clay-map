import sys
from playwright.sync_api import sync_playwright
f=sys.argv[1]
with sync_playwright() as p:
  b=p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
  for spec in sys.argv[2:]:
    name,w,h,q,*acts=spec.split('|')
    ctx=b.new_context(viewport={'width':int(w),'height':int(h)},reduced_motion='reduce' if 'rm' in acts else 'no-preference'); pg=ctx.new_page(); errs=[]
    pg.on('console',lambda m: m.type in('error','warning') and errs.append(m.type+': '+m.text)); pg.on('pageerror',lambda e: errs.append('pageerror: '+str(e)))
    pg.goto(f'http://localhost:8767/{f}?test=1{q}')
    try: pg.wait_for_function('window.__kb&&__kb.ready',timeout=120000)
    except Exception: errs.append('NOT READY '+pg.inner_text('body')[:400])
    for a in acts:
      if a.startswith('click='): pg.click(a[6:]); pg.wait_for_timeout(800)
      if a.startswith('sel='): pg.evaluate(f'__kb.select({a[4:]})'); pg.wait_for_timeout(2500)
    pg.wait_for_timeout(2500); pg.screenshot(path=f'shots/{name}.png',timeout=120000)
    info=pg.evaluate('window.__kb?{dc:__kb.dc(),...__kb.stats}:null')
    print(name,info,'ERRORS:',errs); ctx.close()
  b.close()
