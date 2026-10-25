# first-load bytes / time-to-first-render (throttled) / draw calls / memory
import sys,json,time
from playwright.sync_api import sync_playwright
url=sys.argv[1]; url=url if 'test=1' in url else url+('&' if '?' in url else '?')+'test=1'; thr='--fast' not in sys.argv
with sync_playwright() as p:
  b=p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--enable-precise-memory-info'])
  ctx=b.new_context(viewport={'width':1280,'height':800}); pg=ctx.new_page(); cdp=ctx.new_cdp_session(pg)
  cdp.send('Network.enable'); cdp.send('Network.setCacheDisabled',{'cacheDisabled':True})
  if thr: cdp.send('Network.emulateNetworkConditions',{'offline':False,'latency':40,'downloadThroughput':10e6/8,'uploadThroughput':5e6/8})
  R={}; cdp.on('Network.loadingFinished',lambda e: R.__setitem__(e['requestId'],e['encodedDataLength']))
  U={}; cdp.on('Network.responseReceived',lambda e: U.__setitem__(e['requestId'],e['response']['url']))
  t0=time.time(); pg.goto(url,wait_until='commit')
  pg.wait_for_function('window.__kb&&__kb.dc()>0',timeout=300000,polling=50); ttfr=time.time()-t0
  first=sum(R.values()); firstU=dict(R)
  pg.wait_for_function('window.__kb&&__kb.ready',timeout=300000); tready=time.time()-t0; pg.wait_for_timeout(3000)
  m=pg.evaluate('({dc:__kb.dc(),mem:performance.memory.usedJSHeapSize,gl:__kb.glmem?__kb.glmem():null})')
  tot=sum(R.values())
  big=sorted(((v,U.get(k,'?').split('/')[-1][:40]) for k,v in R.items()),reverse=True)[:8]
  print(json.dumps({'throttle_10Mbps':thr,'bytes_at_first_render':first,'ttfr_s':round(ttfr,2),'ready_s':round(tready,2),'bytes_total_idle':tot,'map_drawcalls':m['dc'],'js_heap_MB':round(m['mem']/1e6,1),'gl':m['gl'],'largest':big}))
  b.close()
