from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
import subprocess, json, shutil
from PIL import Image,ImageDraw,ImageFont
BASE=Path(__file__).resolve().parents[1]
FONT=Path('/usr/share/fonts/truetype/noto/NotoSansMono-Regular.ttf')
f=TTFont(FONT); gs=f.getGlyphSet(); cm=f.getBestCmap()
assert f['post'].isFixedPitch == 1
assert f['hmtx'].metrics[cm[ord('A')]][0] == f['hmtx'].metrics[cm[ord('a')]][0] == 600
BG='#FAFAFA';GRAY='#737482';BLUE='#4D6BFE'

def paths(size,x,y,stroke=0):
    out=[]
    for i,c in enumerate('Aa'):
        pen=SVGPathPen(gs);t=TransformPen(pen,(size/1000,0,0,-size/1000,x+i*size*.6,y)); gs[cm[ord(c)]].draw(t)
        out.append(f'<path d="{pen.getCommands()}"/>')
    return f'<g fill="{GRAY}"'+(f' stroke="{GRAY}" stroke-width="{stroke}" stroke-linejoin="round"' if stroke else '')+'>'+''.join(out)+'</g>'

def svg(name,viewbox,sz,x,y,cx,cy,cw,ch,glow=1,stroke=0):
    # Explicit paths eliminate all dependencies on web fonts or locally installed fonts.
    s=f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {viewbox} {viewbox}" width="{viewbox}" height="{viewbox}" role="img" aria-labelledby="title desc">
<title id="title">Aa monospace caret icon</title>
<desc id="desc">Gray capital A and lowercase a, with a glowing blue insertion caret on an off-white background. Noto Sans Mono Regular glyph outlines.</desc>
<defs><filter id="wideGlow" x="-500%" y="-70%" width="1100%" height="240%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="{viewbox*.075}"/></filter><filter id="closeGlow" x="-200%" y="-25%" width="500%" height="150%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="{viewbox*.025}"/></filter></defs>
<rect width="{viewbox}" height="{viewbox}" fill="{BG}"/>
<rect x="{cx}" y="{cy}" width="{cw}" height="{ch}" rx="{cw/2}" fill="{BLUE}" opacity="{.22*glow}" filter="url(#wideGlow)"/>
<rect x="{cx}" y="{cy}" width="{cw}" height="{ch}" rx="{cw/2}" fill="{BLUE}" opacity="{.23*glow}" filter="url(#closeGlow)"/>
{paths(sz,x,y,stroke)}
<rect x="{cx}" y="{cy}" width="{cw}" height="{ch}" rx="{cw/2}" fill="{BLUE}"/>
</svg>'''
    p=BASE/'icons'/name;p.write_text(s);return p

# Master proportions: balanced spacing and original soft glow.
master=svg('icon.svg',128,48,41.7,81.8,28,34,5.8,60)
# Small sizes deliberately fill more of the canvas with a slightly heavier outline.
f16=svg('favicon.svg',16,10.2,3.3,11.7,1,3,1,10,.36,.17)
f32=svg('favicon-32.svg',32,18.2,8.5,22.7,3.8,5.5,1.65,21,.65,.13)

def render(src,size,name):
    out=BASE/'icons'/name
    subprocess.run(['inkscape',str(src),'--export-type=png',f'--export-filename={out}',f'--export-width={size}',f'--export-height={size}'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    return out

for n in [128,180,192,256,512,1024]:render(master,n,f'icon-{n}.png')
for n in [16,32,48,64]:render(f16 if n==16 else f32,n,f'favicon-{n}.png')
# Preserve per-size artwork rather than letting an ICO encoder scale one large image.
import io,struct
blobs=[]
for size in [16,32,48,64]:
    blobs.append((size,(BASE/'icons'/f'favicon-{size}.png').read_bytes()))
header=struct.pack('<HHH',0,1,len(blobs));offset=6+16*len(blobs);entries=b'';payload=b''
for size,b in blobs:
    entries+=struct.pack('<BBBBHHII',size,size,0,0,1,32,len(b),offset);payload+=b;offset+=len(b)
(BASE/'icons'/'favicon.ico').write_bytes(header+entries+payload)
# A readable developer sample, no automatic deployment.
(BASE/'icons'/'head-snippet.html').write_text('''<!-- Copy the matching icon files to the website root. -->
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/icon-180.png">
''')
shutil.copy('/usr/share/doc/fonts-noto-core/copyright',BASE/'licenses'/'Noto-Debian-copyright.txt')
# Package only document glyph outlines, not a modified font binary.
meta={'font':'Noto Sans Mono Regular','version':f['name'].getDebugName(5),'license':'SIL Open Font License 1.1','isFixedPitch':f['post'].isFixedPitch,'unitsPerEm':1000,'glyphAdvanceWidths':{'A':600,'a':600},'glyphOutlineRendering':True,'colors':{'background':BG,'text':GRAY,'caret':BLUE},'sizes':[16,32,48,64,128,180,192,256,512,1024]}
(BASE/'source'/'font-verification.json').write_text(json.dumps(meta,indent=2))

# Preview with pixel-accurate small-size renderings and nearest-neighbor enlargements.
im=Image.new('RGB',(1200,900),'#FFFFFF');d=ImageDraw.Draw(im)
ui=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',22)
small=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',17)
title=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',34)
d.text((58,40),'Aa / Monospace icon',font=title,fill='#252831');d.text((60,90),'Noto Sans Mono Regular · real outlined glyphs',font=ui,fill='#737482')
a=Image.open(BASE/'icons'/'icon-512.png').convert('RGB');im.paste(a.resize((400,400),Image.Resampling.LANCZOS),(60,150))
d.text((60,570),'Master icon',font=ui,fill='#252831');d.text((60,610),'Near-white · gray type · blue caret',font=small,fill='#737482')
d.text((550,160),'Size-optimized favicons',font=ui,fill='#252831')
for n,x in [(16,570),(32,825)]:
    icon=Image.open(BASE/'icons'/f'favicon-{n}.png').convert('RGB')
    im.paste(icon,(x,220));d.text((x,270),f'{n} × {n} · actual pixels',font=small,fill='#737482')
    im.paste(icon.resize((192,192),Image.Resampling.NEAREST),(x,320));d.text((x,535),'Pixel enlargement',font=small,fill='#737482')
d.line((60,688,1140,688),fill='#E7E8EB',width=1)
d.text((60,724),'Browser-tab scale',font=ui,fill='#252831')
for xx,dark in [(60,False),(590,True)]:
    y=774; col='#25262A' if dark else '#F2F3F5';tc='#F0F0F0' if dark else '#373A41'
    d.rounded_rectangle((xx,y,xx+490,y+70),radius=14,fill=col)
    im.paste(Image.open(BASE/'icons'/'favicon-16.png').convert('RGB'),(xx+24,y+27))
    d.text((xx+55,y+22),'Your site',font=ui,fill=tc)
im.save(BASE/'previews'/'Aa-monospace-preview.png')
# Native icon preview is also delivered separately, without annotations.
print(BASE)
