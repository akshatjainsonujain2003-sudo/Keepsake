import sys,json
sys.path.insert(0,'/tmp/claude-0/-home-claude/63283da9-24db-5aa1-b085-28b02d00fa0b/scratchpad/vid')
sys.path.insert(0,'/home/claude/keepsake/tools/industry-pages')
from fontroute import install
from data import P, ORDER
from playwright.sync_api import sync_playwright
DOC='''<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=375">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;1,9..144,400&family=Inter:wght@400;500;600;700&display=swap">
<style>html,body{margin:0}body{padding-top:40px}</style><script src="/assets/biz.v6.js"></script><script src="/assets/biz-demos.v5.js"></script></head><body><main id="b"></main></body></html>'''
open('/home/claude/keepsake/__cap.html','w').write(DOC)
with sync_playwright() as p:
    b=p.chromium.launch(); c=b.new_context(viewport={'width':375,'height':780},device_scale_factor=2); install(c)
    c.add_init_script("(()=>{const R=Date;const t=new R();const want=R.UTC(t.getUTCFullYear(),t.getUTCMonth(),t.getUTCDate(),5,30);const off=want-R.now();class D extends R{constructor(...a){super(...(a.length?a:[R.now()+off]))}static now(){return R.now()+off}};window.Date=D})()")
    for k in ORDER:
        D=P[k]['live']; pg=c.new_page(); pg.goto('http://localhost:4520/__cap.html'); pg.wait_for_timeout(400)
        pg.evaluate(f"""(()=>{{var D={json.dumps(D)};var d=D.demo&&KSBizDemos[D.demo]?JSON.parse(JSON.stringify(KSBizDemos[D.demo])):Object.assign(KSBiz.blank(D.cat||""),KSBizDemos[D.base||"clinic"]||{{}},D.data||{{}});
          var b=document.getElementById("b");KSBiz.render(b,d,{{preview:true}});document.body.style.background=getComputedStyle(b).getPropertyValue("--bg");}})()""")
        pg.wait_for_timeout(1200)
        for y in range(0,6000,600): pg.evaluate(f"scrollTo(0,{y})"); pg.wait_for_timeout(120)
        pg.evaluate("scrollTo(0,0)"); pg.wait_for_timeout(1200)
        pg.screenshot(path=f'mv/{k}-page.png',full_page=True)
        print(k, pg.evaluate("document.body.scrollHeight"), pg.evaluate("getComputedStyle(document.body).backgroundColor"))
import os; os.remove('/home/claude/keepsake/__cap.html')
