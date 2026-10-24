import json,math
exec(open('process.py').read().split('B=[]')[0])
want=[('way','東急歌舞伎町タワー','building'),('way','新宿東宝ビル','building'),('way','歌舞伎町シネシティ広場',None),('way','歌舞伎町一番街通り',None),('way','花道通り',None),('way','新宿ゴールデン街 G1通り',None),('way','大久保公園',None),('way','歌舞伎町弁天堂',None),('way','アパホテル新宿歌舞伎町タワー',None),('way','西武新宿駅前通り',None),('way','歌舞伎町さくら通り',None),('way','あかるい花園一番街',None),('way','ハナミチ東京 歌舞伎町',None),
('node','西武新宿',('railway','station')),('node','新宿警察署歌舞伎町交番',None),('node','都立大久保病院',None),('node','TOHOシネマズ',None),('node','西武新宿ペペ & Brick St.',None),('node','新宿歌舞伎町能舞台',None),('node','歌舞伎町劇場',None),('node','THEATER MILANO-Za',None),('node','Zepp Shinjuku (Tokyo)',None),('node','新宿BLAZE',None),('node','ようこそ歌舞伎町！',None),('node','サムライミュージアム',None),('node','花園神社',None)]
out=[]
for typ,name,req in want:
  cands=[e for e in E if e['type']==typ and e.get('tags',{}).get('name')==name and (not req or (isinstance(req,str) and req in e['tags']) or (isinstance(req,tuple) and e['tags'].get(req[0])==req[1]))]
  if not cands: print('MISS',name); continue
  if typ=='node': e=cands[0]; ll=[N[e['id']]]
  else:
    ll=[N[i] for e in cands for i in e['nodes'] if i in N and inb(N[i])]; e=cands[0]
  if not ll: print('OUT',name); continue
  pts=[P(x) for x in ll]; x=sum(p[0] for p in pts)/len(pts); z=sum(p[1] for p in pts)/len(pts)
  t=e['tags']; keep={k:v for k,v in t.items() if k in('amenity','tourism','building','highway','leisure','railway','shop','height','building:levels','operator','religion','website') }
  out.append({'id':f"{typ}/{e['id']}",'n':name,'en':t.get('name:en',''),'x':round(x,1),'z':round(z,1),'tags':keep})
# gate: south end of Ichibangai
ich=[e for e in E if e['type']=='way' and e.get('tags',{}).get('name')=='歌舞伎町一番街通り']
ends=[N[i] for e in ich for i in (e['nodes'][0],e['nodes'][-1])]
g=max(ends,key=lambda l:-l[0]); out.append({'gate':[round(v,1) for v in P(g)]})
json.dump(out,open('pois.json','w'),ensure_ascii=False)
for o in out: print(o)
