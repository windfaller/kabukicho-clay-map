import json
d=json.load(open('osm_data.json')); d.pop('stats',None)
data={'meta':{'source':'OpenStreetMap via Overpass API','license':'ODbL','bbox':[35.6917,139.6988,35.6973,139.7062],'origin':[35.6945,139.7025]},'osm':d,'pois':json.load(open('pois.json'))}
s=json.dumps(data,ensure_ascii=False,separators=(',',':')).replace('</','<\\/')
t=open('template.html').read().replace('__DATA__',s).replace('__CODE__',open('app.js').read())
open('kabukicho.html','w').write(t); print(len(t.encode()))
