from PIL import Image, ImageFilter
import json
F=Image.open('../ref/imagine_gate_front.png').convert('RGB'); k=1152/819
S=Image.open('../ref/imagine_signs.png').convert('RGB')
crops={'gate':(239,180,596,288),'izakaya':(16,45,82,222),'hotel':(114,163,163,283),'snack':(2,254,68,342),'yakiniku':(74,263,119,361),
'karaoke':(737,60,798,272),'pachinko':(671,181,719,345),'bar':(675,357,732,430),'game':(734,387,818,446),
's1':(70,400,115,432),'s2':(130,393,165,421),'f1':(250,355,272,410),'f2':(303,382,325,430),'f3':(475,401,495,447),'f4':(537,365,555,420)}
ims={n:F.crop(tuple(round(v*k) for v in b)) for n,b in crops.items()}
for i in range(8):
  x=round((18+125.3*i)*1.25); ims['v%d'%i]=S.crop((x,round(115*1.25),x+round(115*1.25),round(458*1.25)))
A=Image.new('RGB',(2048,1024),(40,30,45)); rects={}
x=y=0; rowh=0
order=['gate']+[n for n in ims if n!='gate']
for n in order:
  im=ims[n]; w,h=im.size
  th=318 if n=='gate' else (300 if h>w else 160)
  if n=='gate': tw=1024
  else: tw=round(w*th/h)
  im=im.resize((tw,th),Image.LANCZOS)
  if x+tw>2048: x=0; y+=rowh+4; rowh=0
  A.paste(im,(x,y)); rects[n]=[x/2048,1-(y+th)/1024,(x+tw)/2048,1-y/1024, tw/th]; x+=tw+4; rowh=max(rowh,th)
print(y+rowh); A.save('atlas.png'); A.save('atlas.webp',quality=82); json.dump(rects,open('rects.json','w'))
