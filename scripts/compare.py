import sys
from PIL import Image, ImageDraw, ImageFont
out, day, night = sys.argv[1:4]
F = ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc', 22) if __import__('os').path.exists('/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc') else ImageFont.load_default()
refs = [('ref/y3.jpg','GAME: Yakuza 3 – Tenkaichi-dori gate'),('ref/y5n.png','GAME: Yakuza 5 – Tenkaichi St (night)'),('ref/Kabukicho_Ic.jpg','PHOTO: real gate, neon off 2021 (Asanagi)')]
ours = [(day,'OURS: gate view, day'),(night,'OURS: gate view, night')]
def tile(p, cap, W=480, H=360):
  im = Image.open(p).convert('RGB')
  if p.startswith('shots'): im = im.crop((262, 60, 762, 452))
  s = max(W/im.width, H/im.height); im = im.resize((int(im.width*s)+1, int(im.height*s)+1))
  l = (im.width-W)//2; t = (im.height-H)//2 if im.height < im.width*1.2 else int((im.height-H)*.15); im = im.crop((l, t, l+W, t+H))
  d = ImageDraw.Draw(im); d.rectangle((0, H-32, W, H), fill=(0,0,0)); d.text((8, H-30), cap, font=F, fill=(255,255,255)); return im
C = Image.new('RGB', (480*3+20, 360*2+10), (240,232,220))
for k,(p,c) in enumerate(refs): C.paste(tile(p,c), ((k%2)*490, (k//2)*370))
for k,(p,c) in enumerate(ours): C.paste(tile(p,c,460,360), (980, k*370))
C.save(out, quality=85); print(C.size)
