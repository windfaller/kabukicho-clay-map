import json,subprocess,gzip,glob,sys
d=open('data2.json').read().replace('</','<\\/')
npx=glob.glob('/home/box/.npm/_npx/*/node_modules/.bin/esbuild')
code=open('app2.js').read()
if npx and '--nomin' not in sys.argv:
  code=subprocess.run([npx[0],'--minify','--format=esm','--target=es2020','--loader=js'],input=code,capture_output=True,text=True,check=True).stdout
t=open('template2.html').read().replace('__DATA__',d).replace('__CODE__',code)
open('kabukicho.html','w').write(t); b=t.encode(); print('html',len(b),'gzip',len(gzip.compress(b,9)),'data',len(d.encode()),'code',len(code.encode()))
