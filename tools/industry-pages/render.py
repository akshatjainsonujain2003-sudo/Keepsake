import sys,os,subprocess,html,shutil
sys.path.insert(0,'/tmp/claude-0/-home-claude/63283da9-24db-5aa1-b085-28b02d00fa0b/scratchpad/vid')
from fontroute import install
from playwright.sync_api import sync_playwright
from PIL import Image
D=os.path.abspath('mv')
S={"cafe":("Brew & Bloom","New order","2 × Cold Brew · ₹440","Loyalty card","7 of 10 coffees",10,7,"#C8102E,#4A0E14"),
"salon":("Ivy Salon & Spa","New booking","Hair spa · Sat 4 pm","Loyalty card","4 of 5 visits",5,4,"#108A60,#0B2E24"),
"gym":("Iron Republic","Free-trial request","Rohit · Tomorrow 7 am","Loyalty card","8 of 10 sessions",10,8,"#F59E0B,#C2410C"),
"real-estate":("Shree Ram Properties","New enquiry","3 BHK, Vaishali Nagar","Site visit booked","Sunday · 11 am",0,0,"#0E6A8C,#0A2238"),
"general-store":("Sharma General Store","New order","Atta 10 kg + Dal · ₹580","Paid by UPI","₹580 · straight to your bank",0,0,"#F59E0B,#C2410C"),
"boutique":("Maison Noor","New enquiry","Zari Suit · size M","New order","Bridal Lehenga · ₹45,000",0,0,"#6D2E9E,#1E0F33"),
"pharmacy":("Shiv Medicos","New order","Medicine list · 4 items","Open now","Till 11 pm tonight",0,0,"#108A60,#0B2E24"),
"clinic":("Dr. Mehta's Family Clinic","New appointment","Tomorrow · 6:30 pm","Open now","OPD till 8 pm",0,0,"#0E6A8C,#0A2238")}
FPS=30; T=12.0
keys=sys.argv[1:] or list(S)
tpl=open(f'{D}/scene.html').read()
with sync_playwright() as p:
    b=p.chromium.launch(); c=b.new_context(viewport={'width':900,'height':1000}); install(c)
    for k in keys:
        shop,c1t,c1s,c2t,c2s,n,have,bg=S[k]
        ih=Image.open(f'{D}/{k}-page.png').height
        h=tpl
        for a,v in {"__SHOP__":html.escape(shop),"__IMG__":f"{k}-page.png","__C1T__":html.escape(c1t),"__C1S__":html.escape(c1s),"__C2T__":html.escape(c2t),"__C2S__":html.escape(c2s),"__C2A__":html.escape(c2s.replace(str(have)+" of",str(have+1)+" of",1) if n else c2s),"__N__":str(n),"__HAVE__":str(have),"__IMGH__":str(ih)}.items(): h=h.replace(a,v)
        h=h.replace("background:linear-gradient(170deg,#C8102E,#4A0E14)",f"background:linear-gradient(170deg,{bg})")
        open(f'{D}/scene-{k}.html','w').write(h)
        pg=c.new_page(); pg.goto(f'file://{D}/scene-{k}.html'); pg.wait_for_timeout(1500); pg.evaluate("document.fonts.ready")
        bgc=pg.evaluate("getComputedStyle(document.body).backgroundColor")
        fr=f'{D}/fr-{k}'; shutil.rmtree(fr,ignore_errors=True); os.makedirs(fr)
        for i in range(int(T*FPS)):
            pg.evaluate(f"render({i/FPS})"); pg.screenshot(path=f'{fr}/{i:04d}.jpg',type='jpeg',quality=92)
        pg.evaluate("render(3.0)"); pg.screenshot(path=f'{D}/{k}-poster.jpg',type='jpeg',quality=82)
        out='/home/claude/keepsake/assets/hero'; os.makedirs(out,exist_ok=True)
        subprocess.run(['ffmpeg','-y','-loglevel','error','-framerate',str(FPS),'-i',f'{fr}/%04d.jpg','-c:v','libx264','-pix_fmt','yuv420p','-crf','27','-preset','slow','-movflags','+faststart','-vf','scale=720:800',f'{out}/{k}.mp4'],check=True)
        subprocess.run(['ffmpeg','-y','-loglevel','error','-framerate',str(FPS),'-i',f'{fr}/%04d.jpg','-c:v','libvpx-vp9','-b:v','0','-crf','40','-row-mt','1','-vf','scale=720:800',f'{out}/{k}.webm'],check=True)
        Image.open(f'{D}/{k}-poster.jpg').resize((720,800)).save(f'{out}/{k}.jpg',quality=80)
        print(k,'mp4',os.path.getsize(f'{out}/{k}.mp4')//1024,'KB webm',os.path.getsize(f'{out}/{k}.webm')//1024,'KB')
