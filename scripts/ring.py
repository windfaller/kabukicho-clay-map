# v17: far ring around the detailed core (OSM ODbL, Overpass 2026-10-25) -> assets/ring.bin
import json,math,struct,random
LAT0,LON0=35.6945,139.7025; KX=111320*math.cos(math.radians(LAT0)); KZ=110574
BX,BZ=372,345
def P(g): return ((g['lon']-LON0)*KX, -(g['lat']-LAT0)*KZ)
def rdp(pts,eps):
  if len(pts)<3: return pts
  a,b=pts[0],pts[-1]; dx,dy=b[0]-a[0],b[1]-a[1]; L=math.hypot(dx,dy) or 1e-9
  i,dm=0,0
  for k in range(1,len(pts)-1):
    d=abs(dy*(pts[k][0]-a[0])-dx*(pts[k][1]-a[1]))/L
    if d>dm: i,dm=k,d
  return rdp(pts[:i+1],eps)[:-1]+rdp(pts[i:],eps) if dm>eps else [a,b]
E=json.load(open('/workspace/ring_osm.json'))['elements']
inC=lambda x,z: abs(x)<BX-2 and abs(z)<BZ-2
B=[];R=[];RL=[];PK=[]
RC={'motorway':0,'trunk':0,'primary':0,'motorway_link':1,'trunk_link':1,'primary_link':1,'secondary':1,'tertiary':2,'residential':3,'unclassified':3,'living_street':3,'pedestrian':4,'service':4}
for e in E:
  t=e.get('tags',{}); g=e.get('geometry')
  if not g: continue
  p=[P(q) for q in g]
  if 'building' in t:
    p=p[:-1] if p[0]==p[-1] else p
    if len(p)<3: continue
    cx=sum(q[0] for q in p)/len(p); cz=sum(q[1] for q in p)/len(p)
    if inC(cx,cz): continue
    a=abs(sum(p[i][0]*p[i-1][1]-p[i-1][0]*p[i][1] for i in range(len(p))))/2
    if a<45: continue
    p=p if len(p)<=6 else rdp(p,1.2)
    if len(p)<3: continue
    try: lv=float(t.get('building:levels','').split(';')[0])
    except: lv=0
    h=float(t['height'].split()[0]) if t.get('height','').replace('.','',1).isdigit() else (lv*3.3 if lv else (3+ min(a,2500)**.5*.35)*random.uniform(.8,1.4))
    B.append((min(h,240),p))
  elif 'highway' in t:
    c=RC.get(t['highway'])
    if c is None or (c==4 and t['highway']=='service'): continue
    p=rdp(p,1.5)
    if all(inC(*q) for q in p): continue
    R.append((c,p))
  elif t.get('railway')=='rail': RL.append(rdp(p,2))
  elif t.get('leisure')=='park': PK.append(rdp(p,2))
q=lambda v: max(-32767,min(32767,round(v*2)))  # 0.5 m units, delta-coded per polyline
def enc(p):
  o=b'';px=pz=0
  for x,z in p: X,Z=q(x),q(z); o+=struct.pack('<hh',X-px,Z-pz); px,pz=X,Z
  return o
out=bytearray(struct.pack('<4I',len(B),len(R),len(RL),len(PK)))
for h,p in B: out+=struct.pack('<HH',round(h*10),len(p))+enc(p)
for c,p in R: out+=struct.pack('<HH',c,len(p))+enc(p)
for p in RL+PK: out+=struct.pack('<H',len(p))+enc(p)
open('assets/ring.bin','wb').write(out); print(len(B),len(R),len(RL),len(PK),len(out))
