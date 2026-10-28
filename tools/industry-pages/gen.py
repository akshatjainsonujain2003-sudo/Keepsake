import json, html, re, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from data import P, ORDER
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
CHIPS = {"cafe": ["Cafés", "Restaurants", "Bakeries", "Cloud kitchens", "Juice bars"], "salon": ["Salons", "Beauty parlours", "Spas", "Barbers", "Bridal makeup"], "gym": ["Gyms", "Yoga studios", "CrossFit", "Dance classes", "Martial arts"],
 "real-estate": ["Property dealers", "Builders", "Rentals & PG", "Plots & land", "Interiors"], "general-store": ["Kirana", "General stores", "Dairy", "Hardware", "Mobile shops"],
 "boutique": ["Boutiques", "Sarees & ethnic", "Menswear", "Kids wear", "Jewellery"], "pharmacy": ["Pharmacies", "Chemists", "Medical stores", "Surgical", "Ayurveda"], "clinic": ["Clinics", "Dentists", "Physiotherapy", "Diagnostic labs", "Eye clinics"]}
TAB = {"cafe": "Menu", "salon": "Services", "gym": "Plans", "real-estate": "Properties", "general-store": "Products", "boutique": "Collection", "pharmacy": "Products", "clinic": "Services"}
COVER = {"cafe": "cafe-interior.webp", "salon": "salon-cover.webp", "gym": "gym-cover.webp", "real-estate": "re-villa.webp", "general-store": "kirana-cover.webp", "boutique": "bq-store1.webp", "pharmacy": "clinic-micro.webp", "clinic": "clinic-cover.webp"}
esc = lambda s: html.escape(s, quote=True)
strip = lambda s: re.sub("<[^>]+>", "", s)

def nav():
    items = "".join(f'<a href="/shops/{k}">{P[k]["label"]}<small>₹1,000</small></a>' for k in ORDER)
    return f'''<header class="nv gk-nav" data-gk-nav><div class="w">
  <a class="lg" href="/" aria-label="GetKeepsake for business, home"><svg class="vf" viewBox="0 0 48 48" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"><path d="M5 15V9a4 4 0 0 1 4-4h6"/><path d="M33 5h6a4 4 0 0 1 4 4v6"/><path d="M43 33v6a4 4 0 0 1-4 4h-6"/><path d="M15 43H9a4 4 0 0 1-4-4v-6"/></g><rect x="11" y="22" width="26" height="4" rx="2" fill="#D4FF3F"/></svg>GetKeepsake<span>[ for business ]</span></a>
  <nav><details><summary>Businesses</summary><div class="dd">{items}</div></details><a href="/shops#pricing">Pricing</a><a href="/shops#faq">FAQ</a><a class="b p" href="/shops/studio">Create your page</a></nav>
</div></header>'''

def footer():
    col = lambda ks: "".join(f'<a href="/shops/{k}">{P[k]["label"]}</a>' for k in ks)
    return f'''<footer class="ft"><div class="w">
  <div><a class="lg" href="/" aria-label="GetKeepsake for business, home"><svg class="vf" viewBox="0 0 48 48" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"><path d="M5 15V9a4 4 0 0 1 4-4h6"/><path d="M33 5h6a4 4 0 0 1 4 4v6"/><path d="M43 33v6a4 4 0 0 1-4 4h-6"/><path d="M15 43H9a4 4 0 0 1-4-4v-6"/></g><rect x="11" y="22" width="26" height="4" rx="2" fill="#D4FF3F"/></svg>GetKeepsake<span>[ for business ]</span></a><p style="margin:0;max-width:360px">A page for your shop behind one QR: menu, offers, WhatsApp orders, UPI, Google reviews and a loyalty card. ₹1,000 once, no monthly fees.</p>
  <p style="margin:14px 0 0">WhatsApp <a style="display:inline;color:#fff" href="https://wa.me/916377547759">+91 63775 47759</a> · <a style="display:inline;color:#fff" href="https://instagram.com/getkeepsake.business" rel="noopener">@getkeepsake.business</a></p></div>
  <div><b>Businesses</b>{col(ORDER[:4])}</div>
  <div><b>&nbsp;</b>{col(ORDER[4:])}<a href="/contact" style="margin-top:12px">Contact</a><a href="/terms">Terms</a><a href="/privacy">Privacy</a></div>
</div></footer>'''

def H1(d):
    first = strip(d["h1"].split("<br>")[0]).rstrip(",")
    return f'{esc(first)}<span class="o">.</span><br>One scan <span class="s">away</span>'
def H1S(d):
    n = len(strip(d["h1"].split("<br>")[0]).rstrip(",")) + 1
    px = min(74, int(560 / n / 0.68))
    return f'--hs:{px}px;--hv:{round(px / 13.66, 2)}vw'
def HI(h):
    a, _, b = h.rpartition(", ")
    return f'{esc(a)}, <span>{esc(b)}</span>' if a else esc(h)
def EM(h):
    t = strip(h.replace("<br>", " ")).rstrip(".")
    a, _, last = t.rpartition(" ")
    return f'{esc(a)} <em>{esc(last)}</em>'

def page(slug):
    d = P[slug]; url = f"https://getkeepsake.in/shops/{slug}"
    studio = f"/shops/studio?type={d['type']}"
    live_link = f"/shops/studio?ex={d['ex']}" if d["ex"] else studio
    fa, fc = d["fa"], d["fc"]
    stamps = "".join(f'<i class="{"" if i >= fa[2] else ""}" style="background:{"var(--haldi)" if i < fa[2] else "none"};{"box-shadow:inset 0 0 0 1.5px #CDBFB2" if i >= fa[2] else ""}"></i>' for i in range(5)) if fa[2] else ""
    fl_a = f'<div class="fl a" data-gk-pop><b>{esc(fa[0])}</b>{esc(fa[1])}{"<div class=st>" + "".join("<i" + ("" if i < round(fa[2] / 2) else " class=o") + "></i>" for i in range(5)) + "</div>" if fa[2] else ""}</div>'
    fl_c = f'<div class="fl c" data-gk-pop><b>{esc(fc[0])}</b>{esc(fc[1])}</div>'
    feat = "".join(f'<div class="r" data-gk-st><b>{esc(n)}</b><i></i><em class="{"x" if t != "Included" else ""}">{esc(t)}</em><small>{esc(s)}</small></div>' for n, s, t in d["feat"])
    ly = ""
    if d["ly"]:
        h, p, bl, shop, reward, n, have = d["ly"]
        cells = "".join(f'<i class="{"on" if i < have else ("gf" if i == n - 1 else "")}">{"★" if i == n - 1 else i + 1}</i>' for i in range(n))
        cols = 5 if n >= 5 else n
        ly = f'''<section class="ly gk-grain" id="loyalty"><div class="w">
  <div><h2 data-gk-h2>{EM(h)}</h2><p>{esc(p)}</p><ul>{"".join(f"<li><span>{b}</span></li>" for b in bl)}</ul><div class="pr">Loyalty card included with your ₹1,000 page.</div></div>
  <div class="cd" role="img" aria-label="Sample loyalty card: {have} of {n} visits"><div class="t"><b>{esc(shop)}</b><span>Loyalty card</span></div>
   <div class="g" data-gk-stamps style="grid-template-columns:repeat({cols},1fr)">{cells}</div>
   <div class="f"><span><b>{have} of {n}</b> visits</span><span>{n - have} more for a <b>{esc(reward)}</b></span></div><div class="bar"><u style="width:{round(have * 100 / n)}%"></u></div></div>
</div></section>'''
    steps = "".join(f"<div data-gk-st><b>{esc(a)}</b><p>{esc(b)}</p></div>" for a, b in d["steps"])
    faq = "".join(f"<details data-gk-st><summary>{esc(q)}</summary><p>{esc(a)}</p></details>" for q, a in d["faq"])
    others = "".join(f'<a data-gk-st href="/shops/{k}"><span class="im" style="background-image:url(/assets/demo/biz/{COVER[k]})"></span><span class="tx"><b>{P[k]["short"]}</b><small>{P[k]["label"]}</small></span></a>' for k in ORDER if k != slug)
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "WebPage", "@id": url + "#page", "url": url, "name": d["title"], "description": d["desc"], "inLanguage": "en-IN", "isPartOf": {"@type": "WebSite", "name": "GetKeepsake", "url": "https://getkeepsake.in/"}},
        {"@type": "Service", "name": f"GetKeepsake for {d['label']}", "serviceType": "Mobile business page with QR code", "description": d["desc"], "areaServed": {"@type": "Country", "name": "India"},
         "provider": {"@type": "Organization", "name": "GetKeepsake", "url": "https://getkeepsake.in/", "telephone": "+91-63775-47759"},
         "offers": [{"@type": "Offer", "name": "Business page", "price": "1000", "priceCurrency": "INR", "url": "https://getkeepsake.in" + studio}]},
        {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in d["faq"]]},
        {"@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "GetKeepsake for business", "item": "https://getkeepsake.in/shops"}, {"@type": "ListItem", "position": 2, "name": d["label"], "item": url}]}]}
    live = esc(json.dumps(d["live"], ensure_ascii=False))
    side = lambda y: esc(json.dumps(dict(d["live"], y=y), ensure_ascii=False))
    return f'''<!doctype html>
<html lang="en-IN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{esc(d["title"])}</title>
<meta name="description" content="{esc(d["desc"])}">
<link rel="canonical" href="{url}">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta property="og:type" content="website"><meta property="og:site_name" content="GetKeepsake"><meta property="og:locale" content="en_IN"><meta property="og:url" content="{url}">
<meta property="og:title" content="{esc(strip(d["h1"]))} · GetKeepsake for business"><meta property="og:description" content="{esc(d["desc"])}">
<meta property="og:image" content="https://getkeepsake.in/assets/brand/og.jpg"><meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#1F1BF2">
<link rel="icon" href="/assets/brand/favicon.ico" sizes="any"><link rel="icon" type="image/svg+xml" href="/assets/brand/favicon.svg"><link rel="icon" type="image/png" sizes="192x192" href="/assets/brand/icon-192.png"><link rel="apple-touch-icon" href="/assets/brand/icon-180.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&family=Mukta:wght@600;700&display=swap">
<link rel="stylesheet" href="/assets/ind.v5.css"><link rel="stylesheet" href="/assets/gk.v2.css">
<script>document.documentElement.classList.add("gkm")</script>
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False).replace("</", "<\\/")}</script>
</head>
<body>
{nav()}
<main>
<section class="hr"><div class="w">
  <div class="tx">
    <div class="gkb" data-gk-in>GetKeepsake<span>for business</span><i>NOW IN JAIPUR</i></div>
    <span data-gk-in class="ki">{esc(d["kicker"])}</span>
    <h1 data-gk-h1 style="{H1S(d)}">{H1(d)}</h1>
    <p data-gk-in class="hi" lang="hi">{HI(d["hi"])}</p>
    <p data-gk-in class="sub">{esc(d["sub"])}</p>
    <div data-gk-in class="ct"><a class="b p" data-gk-mag href="{studio}">{esc(d["cta"])} · ₹1,000</a><a class="b s" href="{live_link}">See a live {esc(d["word"])} page</a></div>
    <div data-gk-in class="ch">{"".join(f"<span>{esc(c)}</span>" for c in CHIPS[slug])}</div>
    <div data-gk-in class="tr"><span>No app needed</span><span>Ready in 5 minutes</span><span>No monthly fees</span></div>
  </div>
  <div class="ar">
    <div class="ph l" data-gk-rise data-gk-par="-14"><div class="sc"><iframe data-live="{side(0.32)}" title="" aria-hidden="true" tabindex="-1" loading="lazy"></iframe></div></div>
    <div class="ph r" data-gk-rise data-gk-par="-6"><div class="sc"><iframe data-live="{side(0.58)}" title="" aria-hidden="true" tabindex="-1" loading="lazy"></iframe></div></div>
    <div class="ph c" data-gk-rise data-gk-par="-10"><div class="sc"><iframe data-live="{live}" title="A live example {esc(d["word"])} page" loading="lazy"></iframe></div></div>
    {fl_a}{fl_c}
  </div>
</div></section>

<section class="se" id="features"><div class="w">
  <div class="sh"><h2 data-gk-h2>Everything customers need <em>in one scan</em></h2><p>One page with your own link and QR. You change it from your phone whenever you like.</p></div>
  <div class="pl"><h3>Your page includes</h3>{feat}</div>
</div></section>
{ly}
<section class="se" id="how"><div class="w">
  <div class="sh"><h2 data-gk-h2>Live in three <em>steps</em></h2><p>No designer, no app, no website builder.</p></div>
  <div class="sp">{steps}</div>
</div></section>

<section class="se" id="pricing"><div class="w">
  <div class="sh"><h2 data-gk-h2>One price. <em>forever</em> yours.</h2><p>No monthly fees and no commission on orders or payments.</p></div>
  <div class="pc">
    <div class="m" data-gk-st><div class="stk" data-gk-stk>No monthly fees</div><div class="k">{esc(d["word"])} page</div><div class="a">₹<span data-gk-count>1,000</span><small>one-time</small></div><p>Your {esc(d["word"])} page with its own link and QR, unlimited edits and weekly stats on who scanned.</p><a class="b" href="{studio}">{esc(d["cta"])}</a></div>
    <div class="ad" data-gk-st>
      <div class="r"><b>Business page</b><i></i><em>₹1,000</em><small>Link, QR, menu or price list, offers, WhatsApp, UPI, reviews</small></div>
      <div class="r"><b>Loyalty card</b><i></i><em>Included</em><small>Stamp card for regulars, staff PIN and member list</small></div>
      <div class="r"><b>Printed QR, delivered</b><i></i><em>Included</em><small>3.5 × 5 inch counter board in your colour, anywhere in India</small></div>
    </div>
  </div>
</div></section>

<section class="se" id="faq"><div class="w">
  <div class="sh"><h2 data-gk-h2>Good to <em>know</em></h2></div>
  <div class="fq">{faq}</div>
</div></section>

<section class="se"><div class="w">
  <div class="sh"><h2 data-gk-h2>Made for every <em>business</em></h2></div>
  <div class="ob">{others}</div>
</div></section>

<section class="cl" style="margin-top:0"><div class="w">
  <h2 data-gk-h2>Make your {esc(d["word"])} <em>unmissable</em></h2>
  <p lang="hi">आज ही अपना पेज बनाएँ</p>
  <div class="ct"><a class="b p" href="{studio}">{esc(d["cta"])} · ₹1,000</a><a class="b s" href="https://wa.me/916377547759?text={esc("Hi, I'd like a GetKeepsake page for my " + d["word"])}">Ask on WhatsApp</a></div>
</div></section>
</main>
{footer()}
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js" defer></script><script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js" defer></script>
<script src="/assets/ind.v2.js" defer></script><script src="/assets/gk.v1.js" defer></script>
<script src="/assets/ks-pixel.v1.js" defer></script>
</body>
</html>
'''

if __name__ == "__main__":
    only = sys.argv[1:] or ORDER
    for k in only:
        open(f"{REPO}/shops/{k}.html", "w").write(page(k))
    print("wrote", only)
