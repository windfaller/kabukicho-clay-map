import json,math
E=json.load(open('osm.json'))['elements']
N={e['id']:(e['lat'],e['lon']) for e in E if e['type']=='node' and 'lat' in e}
LAT0,LON0=35.6945,139.7025
S,W,Nn,Ea=35.6917,139.6988,35.6973,139.7062
def P(ll): lat,lon=ll; return ((lon-LON0)*111320*math.cos(math.radians(LAT0)), -(lat-LAT0)*110574)
def inb(ll): return S<=ll[0]<=Nn and W<=ll[1]<=Ea
def rdp(pts,eps):
  if len(pts)<3: return pts
  a,b=pts[0],pts[-1]; dx,dy=b[0]-a[0],b[1]-a[1]; L=math.hypot(dx,dy) or 1e-9
  i,dm=0,0
  for k in range(1,len(pts)-1):
    p=pts[k]; d=abs(dy*(p[0]-a[0])-dx*(p[1]-a[1]))/L if L>1e-6 else math.hypot(p[0]-a[0],p[1]-a[1])
    if d>dm: i,dm=k,d
  if dm>eps: return rdp(pts[:i+1],eps)[:-1]+rdp(pts[i:],eps)
  return [a,b]
def m(v): return round(v,1)
def h32(n):
  n=(n*2654435761)&0xffffffff; n^=n>>15; return n/4294967296
B=[];R=[];RL=[];G=[];POI=[];names=[]
def nm(t):
  n=t.get('name');
  if not n: return -1
  names.append([n,t.get('name:en','')]); return len(names)-1
nodeIdx={};nodes=[]
def ni(i):
  if i not in nodeIdx: nodeIdx[i]=len(nodes); x,z=P(N[i]); nodes.append([m(x),m(z)])
  return nodeIdx[i]
RC={'primary':0,'secondary':0,'secondary_link':1,'tertiary':1,'unclassified':1,'residential':2,'living_street':2,'service':2,'pedestrian':3,'footway':4,'path':4,'steps':4}
stats={'h_tag':0,'lv_tag':0,'h_fallback':0}
for e in E:
  if e['type']!='way': continue
  t=e.get('tags',{}); nd=[i for i in e['nodes'] if i in N]
  if 'building' in t and len(nd)>=4:
    ll=[N[i] for i in nd]; c=(sum(a for a,b in ll)/len(ll),sum(b for a,b in ll)/len(ll))
    if not inb(c): continue
    pts=rdp([P(x) for x in ll[:-1]]+[P(ll[0])],.5)[:-1]
    if len(pts)<3: continue
    try: h=float(t['height'].split()[0]); stats['h_tag']+=1
    except: 
      try: h=float(t['building:levels'])*3.3+1; stats['lv_tag']+=1
      except: h=round((2+int(h32(e['id'])*7))*3.3+1,1); stats['h_fallback']+=1
    kind={'shrine':2,'temple':2}.get(t.get('building'),0)
    if t.get('amenity') in('place_of_worship',): kind=2
    B.append([round(h,1),kind,nm(t),[c for p in pts for c in (m(p[0]),m(p[1]))]])
  elif t.get('highway') in RC:
    segs=[];cur=[]
    for i in nd:
      if inb(N[i]): cur.append(ni(i))
      else:
        if len(cur)>1: segs.append(cur)
        cur=[]
    if len(cur)>1: segs.append(cur)
    for s in segs: R.append([RC[t['highway']],nm(t) if t['highway'] not in('footway','steps','service') or 'name' in t and RC[t['highway']]<4 else -1,s])
  elif 'railway' in t and t['railway'] in('rail','platform') or t.get('public_transport')=='platform':
    pts=[P(N[i]) for i in nd if inb(N[i])]
    if len(pts)>1: RL.append([1 if t.get('railway')=='rail' else 2,[c for p in rdp(pts,.5) for c in (m(p[0]),m(p[1]))]])
  elif t.get('leisure') in('park','playground') or t.get('landuse') in('grass',) or t.get('area:highway') or t.get('place')=='square' or (t.get('highway')=='pedestrian' and t.get('area')=='yes'):
    ll=[N[i] for i in nd]; 
    if not ll or not any(inb(x) for x in ll): continue
    pts=rdp([P(x) for x in ll],.5)
    G.append([0 if t.get('leisure') or t.get('landuse') else 1,nm(t),[c for p in pts for c in (m(p[0]),m(p[1]))]])
trees=[]
for e in E:
  if e['type']=='node' and 'lat' in e and e.get('tags',{}).get('natural')=='tree' and inb(N[e['id']]):
    x,z=P(N[e['id']]); trees.append([m(x),m(z)])
json.dump({'nodes':nodes,'b':B,'r':R,'rl':RL,'g':G,'names':names,'trees':trees,'stats':stats},open('osm_data.json','w'),ensure_ascii=False,separators=(',',':'))
print(len(B),len(R),len(nodes),len(RL),len(G),len(trees),stats, len(open('osm_data.json').read().encode()))
# POI candidates
for e in E:
  t=e.get('tags',{})
  if e['type']=='node' and 'name' in t and inb(N[e['id']]) and (t.get('amenity') in('theatre','cinema','police','hospital','place_of_worship') or t.get('tourism') or t.get('railway')=='station' or t.get('shop')=='department_store'):
    print(e['id'],t['name'],t.get('name:en',''),[m(v) for v in P(N[e['id']])],t.get('amenity') or t.get('tourism') or t.get('railway') or t.get('shop'))
