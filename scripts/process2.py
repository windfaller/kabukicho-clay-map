import json,math,zlib,base64,os
E=json.load(open('osm.json'))['elements']
N={e['id']:(e['lat'],e['lon']) for e in E if e['type']=='node' and 'lat' in e}
LAT0,LON0=35.6945,139.7025
S,W,Nn,Ea=35.6917,139.6988,35.6973,139.7062
KX=111320*math.cos(math.radians(LAT0)); KZ=110574
def P(ll): return ((ll[1]-LON0)*KX, -(ll[0]-LAT0)*KZ)
def inb(ll): return S<=ll[0]<=Nn and W<=ll[1]<=Ea
def rdp(pts,eps):
  if len(pts)<3: return pts
  a,b=pts[0],pts[-1]; dx,dy=b[0]-a[0],b[1]-a[1]; L=math.hypot(dx,dy)
  i,dm=0,0
  for k in range(1,len(pts)-1):
    p=pts[k]; d=abs(dy*(p[0]-a[0])-dx*(p[1]-a[1]))/L if L>1e-6 else math.hypot(p[0]-a[0],p[1]-a[1])
    if d>dm: i,dm=k,d
  if dm>eps: return rdp(pts[:i+1],eps)[:-1]+rdp(pts[i:],eps)
  return [a,b]
q=lambda v: int(round(v*10))  # decimetres
def h32(n): n=(n*2654435761)&0xffffffff; n^=n>>15; return n/4294967296
names=[];nmap={}
def nm(t):
  n=t.get('name')
  if not n: return 0
  rec=[n,t.get('name:en',''),t.get('name:ja','') if t.get('name:ja','')!=n else '',(t.get('name:zh-Hant') or t.get('name:zh-TW') or t.get('name:zh') or '')]
  k=tuple(rec)
  if k not in nmap: nmap[k]=len(names)+1; names.append(rec)
  return nmap[k]
# extra geometry (shrine grounds, Golden Gai)
extra={}
if os.path.exists('extra_geom.json'):
  try:
    for e in json.load(open('extra_geom.json'))['elements']:
      if e['type']=='way': extra['shrine']=[P((g['lat'],g['lon'])) for g in e['geometry']]
      else:
        outer=[m for m in e['members'] if m.get('role')=='outer' and m.get('geometry')]
        pts=[]; 
        for m in outer: pts+= [P((g['lat'],g['lon'])) for g in m['geometry']]
        extra['gg']=pts
  except Exception as ex: print('extra fail',ex)
def inpoly(x,z,poly):
  c=False; j=len(poly)-1
  for i in range(len(poly)):
    xi,zi=poly[i]; xj,zj=poly[j]
    if (zi>z)!=(zj>z) and x<(xj-xi)*(z-zi)/(zj-zi)+xi: c=not c
    j=i
  return c
LM={852000385:3,170267549:4,137626283:5}
nodeIdx={};nodes=[]
def ni(i):
  if i not in nodeIdx: nodeIdx[i]=len(nodes); nodes.append(tuple(q(v) for v in P(N[i])))
  return nodeIdx[i]
RC={'primary':0,'secondary':0,'secondary_link':1,'tertiary':1,'unclassified':1,'residential':2,'living_street':2,'service':2,'pedestrian':3,'footway':4,'path':4,'steps':4}
B=[];R=[];RL=[];G=[];stats={'height_tag':0,'levels_tag':0,'fallback':0,'goldengai_override':0}
seenB=set()
for e in E:
  if e['type']!='way': continue
  t=e.get('tags',{}); nd=[i for i in e['nodes'] if i in N]
  if 'building' in t and len(nd)>=4:
    ll=[N[i] for i in nd]; c=(sum(a for a,b in ll)/len(ll),sum(b for a,b in ll)/len(ll))
    if not inb(c): continue
    pts=rdp([P(x) for x in ll[:-1]]+[P(ll[0])],.5)[:-1]
    key=tuple((round(x),round(z)) for x,z in pts)
    if len(pts)<3 or key in seenB: continue
    seenB.add(key)
    try: h=float(t['height'].split()[0]); stats['height_tag']+=1
    except Exception:
      try: h=float(t['building:levels'])*3.3+1; stats['levels_tag']+=1
      except Exception: h=(2+int(h32(e['id'])*7))*3.3+1; stats['fallback']+=1
    kind=LM.get(e['id'],0)
    if t.get('building') in('shrine','temple') or t.get('amenity')=='place_of_worship': kind=2
    cx,cz=P(c)
    if kind==0 and 'gg' in extra and inpoly(cx,cz,extra['gg']): kind=7; h=6.6+h32(e['id']+1)*1.6; stats['goldengai_override']+=1
    B.append((q(h),kind,nm(t) if kind in(3,4,5) else 0,[(q(x),q(z)) for x,z in pts]))
  elif t.get('highway') in RC:
    segs=[];cur=[]
    for i in nd:
      if inb(N[i]): cur.append(ni(i))
      else:
        if len(cur)>1: segs.append(cur)
        cur=[]
    if len(cur)>1: segs.append(cur)
    keepname=t['highway'] not in('footway','steps','service','path') or t.get('name','').find('通り')>=0 or t.get('name','').find('街')>=0
    for s in segs: R.append((RC[t['highway']],nm(t) if keepname else 0,s))
  elif t.get('railway')=='rail':
    pts=[P(N[i]) for i in nd if inb(N[i])]
    if len(pts)>1: RL.append((1,[(q(x),q(z)) for x,z in rdp(pts,.5)]))
  elif t.get('leisure') in('park','playground') or t.get('landuse')=='grass' or (t.get('highway')=='pedestrian' and t.get('area')=='yes'):
    ll=[N[i] for i in nd]
    if not ll or not any(inb(x) for x in ll): continue
    G.append((0 if t.get('leisure') or t.get('landuse') else 1,nm(t),[(q(x),q(z)) for x,z in rdp([P(x) for x in ll],.5)]))
if 'shrine' in extra: G.append((2,0,[(q(x),q(z)) for x,z in rdp(extra['shrine'],.5)]))
if 'gg' in extra: G.append((3,0,[(q(x),q(z)) for x,z in rdp(extra['gg'],.5)]))
trees=[(q(x),q(z)) for x,z in (P(N[e['id']]) for e in E if e['type']=='node' and e.get('tags',{}).get('natural')=='tree' and inb(N[e['id']]))]
# ---- varint stream
out=bytearray()
def w(v):
  v=(v<<1)^(v>>63) if v<0 else v<<1
  while True:
    b=v&127; v>>=7
    if v: out.append(b|128)
    else: out.append(b); break
def pts(ps):
  w(len(ps)); px,pz=ps[0]; w(px); w(pz)
  for x,z in ps[1:]: w(x-px); w(z-pz); px,pz=x,z
w(len(nodes)); px=pz=0
for x,z in nodes: w(x-px); w(z-pz); px,pz=x,z
w(len(B))
for h,k,n,p in B: w(h); w(k); w(n); pts(p)
w(len(R))
for c,n,s in R:
  w(c); w(n); w(len(s)); prev=0
  for i in s: w(i-prev); prev=i
w(len(RL))
for t,p in RL: w(t); pts(p)
w(len(G))
for t,n,p in G: w(t); w(n); pts(p)
pts(trees) if trees else w(0)
raw=bytes(out); co=zlib.compressobj(9,zlib.DEFLATED,-15); comp=co.compress(raw)+co.flush()
b64=base64.b64encode(comp).decode()
# POIs
want=json.load(open('poi_spec.json'))
XE=json.load(open('extra_geom.json'))['elements'] if os.path.exists('extra_geom.json') else []
def find(typ,oid):
  for e in E+XE:
    if e['type']==typ and e['id']==oid: return e
pois=[]
for spec in want:
  typ,oid=spec['id'].split('/'); oid=int(oid); e=find(typ,oid)
  if e is None and 'xy' not in spec: print('MISS',spec); continue
  t=e.get('tags',{}) if e else spec.get('tags',{})
  if 'xy' in spec: x,z=spec['xy']
  elif e.get('geometry') or e.get('members'):
    gs=e.get('geometry') or [g for m in e['members'] if m.get('role')=='outer' for g in m.get('geometry',[])]
    ps=[P((g['lat'],g['lon'])) for g in gs]; x=sum(p[0] for p in ps)/len(ps); z=sum(p[1] for p in ps)/len(ps)
  elif typ=='node': x,z=P(N[oid])
  else:
    ps=[P(N[i]) for i in e['nodes'] if i in N and inb(N[i])]; x=sum(p[0] for p in ps)/len(ps); z=sum(p[1] for p in ps)/len(ps)
  keep={k:v for k,v in t.items() if k in('amenity','tourism','building','highway','leisure','railway','shop','height','building:levels','operator','religion','landuse','cuisine','brand','alt_name','start_date')}
  pois.append({'id':spec['id'],'k':spec['k'],'nm':[t.get('name',spec.get('name','')),t.get('name:en',''),t.get('name:ja',''),(t.get('name:zh-Hant') or t.get('name:zh-TW') or t.get('name:zh') or '')],'x':round(x,1),'z':round(z,1),'t':keep})
ich=[e for e in E if e['type']=='way' and e.get('tags',{}).get('name')=='歌舞伎町一番街通り']
ends=[N[i] for e in ich for i in (e['nodes'][0],e['nodes'][-1])]
g=max(ends,key=lambda l:-l[0])
cr=[e for e in E if e['type']=='way' and e.get('tags',{}).get('name')=='セントラルロード']
g2=min([N[i] for e in cr for i in (e['nodes'][0],e['nodes'][-1])],key=lambda l:l[0])
meta={'src':'OpenStreetMap contributors (ODbL), Overpass API, fetched 2026-10-24','bbox':[S,W,Nn,Ea],'origin':[LAT0,LON0],'gate':[round(v,1) for v in P(g)],'gate2':[round(v,1) for v in P(g2)],'stats':dict(stats,buildings=len(B),roads=len(R),nodes=len(nodes),rail=len(RL),areas=len(G),trees=len(trees),names=len(names),raw_bytes=len(raw),deflate_bytes=len(comp),b64_chars=len(b64))}
from i18n_names import fill
names=[fill(r) for r in names]
for p in pois: p['nm']=fill(p['nm'])
miss=[r[0] for r in names if '-' in r[4]]+[p['nm'][0] for p in pois if '-' in p['nm'][4]]
print('untranslated:',miss)
json.dump({'meta':meta,'names':names,'pois':pois,'bin':b64},open('data2.json','w'),ensure_ascii=False,separators=(',',':'))
print(meta['stats'],'extra:',list(extra))
