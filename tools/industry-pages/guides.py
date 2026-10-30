# Answer pages for search and AI answers (GEO): Hinglish guides and the Jaipur page.
# Run: python3 tools/industry-pages/guides.py   (writes /hi/*.html and /shops/jaipur.html)
import json, html, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from gen import nav, footer, P, ORDER, UPDATED, REPO
esc = lambda s: html.escape(s, quote=True)
WA = "https://wa.me/918302791217"
PRICES = [("Start", "₹1,000 one-time", ["Page with its own link and QR", "Menu or price list with photos", "WhatsApp orders and UPI, 0% commission", "Loyalty card and Google review button", "Printed QR board delivered"]),
          ("Keepsake Pro", "₹299 a month or ₹2,999 a year", ["Online store with checkout", "Unlimited GST bills with CA reports", "Table QRs, day-end report", "Win-back offers, add sale"])]

G = {
"hi/dukaan-ki-website": dict(lang="hi-Latn", title="Dukaan ki Website Sirf ₹1,000 Mein: Menu, QR, WhatsApp Order | GetKeepsake",
  desc="Apni dukaan ki website aur QR sirf ₹1,000 ek baar mein banayein. Menu, WhatsApp order, UPI, Google review aur loyalty card, bina app ke. Koi monthly fees nahi.",
  kicker="Hindi mein guide", h1="Dukaan ki website, sirf ₹1,000 mein", hi="अपनी दुकान की वेबसाइट और QR, एक बार ₹1,000",
  lead="Customer aapki dukaan Google aur Instagram pe dhundhte hain. Ek simple page jo phone pe khule, jismein menu ho, WhatsApp pe order ho aur UPI se payment, wahi kaafi hai. GetKeepsake pe yeh page 5 minute mein banta hai, ek baar ₹1,000 mein.",
  points=[("Kya milega", ["Aapki dukaan ka apna link aur QR code", "Menu ya rate list, photos ke saath", "WhatsApp pe order aur UPI payment, 0% commission", "Google review button aur offer of the day", "Loyalty card: har visit pe ek stamp, poora hone pe gift", "Printed QR board, aapki dukaan tak delivered"])],
  steps=[("Details bharein", "Dukaan ka naam, WhatsApp number aur menu ki photo. Items aur price apne aap bhar jaate hain."), ("Design chunein", "Apne business ke hisaab se layout aur rang chunein. Page turant dikhne lagta hai."), ("₹1,000 dekar live karein", "Page live ho jaata hai aur printed QR board aapki dukaan pe aata hai.")],
  faq=[("Dukaan ki website banane mein kitna kharcha hai?", "GetKeepsake pe ₹1,000 ek baar. Isme page, link, QR, loyalty card aur printed QR board shaamil hai. Koi monthly fees nahi aur orders pe koi commission nahi."),
       ("Kya customer ko app download karna padega?", "Nahi. Customer phone ke camera se QR scan karta hai aur aapka page browser mein khul jaata hai."),
       ("Kya main baad mein price aur menu badal sakta hoon?", "Haan, kabhi bhi, apne phone se. QR wahi rehta hai."),
       ("WhatsApp pe order kaise aata hai?", "Customer menu mein + dabata hai aur WhatsApp pe order total ke saath aapko aa jaata hai. Payment UPI se seedha aapke bank mein."),
       ("Kya GST bill bhi bana sakte hain?", "Haan, Keepsake Pro ke saath (₹299 mahina ya ₹2,999 saal). GST bill phone pe banake WhatsApp pe bhejein, aur CA ke liye report download karein. Pehle 10 bill free hain."),
       ("Kya kisi bhi business ke liye chalega?", "Haan: café, restaurant, kirana, boutique, salon, gym, clinic, bakery, mithai, hardware, coaching aur bahut kuch.")]),
"hi/qr-menu-kaise-banaye": dict(lang="hi-Latn", title="QR Menu Kaise Banayein: 5 Minute Mein, Bina App Ke | GetKeepsake",
  desc="Apne café ya restaurant ka QR code menu 5 minute mein banayein. Photo wala menu, WhatsApp order, UPI aur loyalty card. ₹1,000 ek baar, koi commission nahi.",
  kicker="Hindi mein guide", h1="QR menu kaise banayein", hi="QR मेन्यू कैसे बनाएँ, 5 मिनट में",
  lead="QR menu ek page hai jo table pe rakhe QR ko scan karte hi customer ke phone pe khul jaata hai. Printed menu ki tarah baar baar chhapwana nahi padta: price badla, turant update.",
  points=[("Printed menu vs QR menu", ["Printed menu: price badle toh dobara chhapwao", "QR menu: phone se price badlo, QR wahi rahe", "QR menu mein photos, veg mark aur bestseller tag", "Customer seedha WhatsApp pe order bhej sakta hai", "UPI Pay button se payment, bina cash ke"])],
  steps=[("Menu ki photo upload karein", "Apne printed menu ki photo daalein. Items aur price apne aap bhar jaate hain, aap check kar lein."), ("Photos aur design jodein", "Bestseller dishes ki photos lagayein aur layout chunein."), ("WhatsApp aur UPI jodein", "Apna WhatsApp number aur UPI ID daalein, taaki order aur payment seedha aapko mile."), ("Live karein", "₹1,000 ek baar dekar page live karein. Printed QR board aapko deliver hota hai."), ("Har table pe QR lagayein", "Wahi QR har table pe print karein. Keepsake Pro mein har table ka alag QR bhi milta hai.")],
  faq=[("QR menu banane ka kharcha kitna hai?", "GetKeepsake pe ₹1,000 ek baar. Koi monthly fees nahi, orders pe koi commission nahi. Loyalty card aur printed QR board shaamil hai."),
       ("Kya customer ko app chahiye?", "Nahi. Phone ka camera kaafi hai."),
       ("Menu ka price kaise badlein?", "Apne dashboard mein login karke price badlein aur Save dabayein. Table ka QR wahi rehta hai."),
       ("Kya table se order aa sakta hai?", "Haan, Keepsake Pro ke table QR se order table number ke saath aapke dashboard pe aata hai."),
       ("Kya veg aur non-veg mark dikha sakte hain?", "Haan. Pro ke online store mein har dish pe veg ya non-veg mark, size aur add-ons bhi laga sakte hain.")]),
"hi/whatsapp-gst-bill": dict(lang="hi-Latn", title="WhatsApp Pe GST Bill Kaise Bhejein: Phone Se, CA Report Ke Saath | GetKeepsake",
  desc="Phone se GST bill banayein aur WhatsApp pe bhejein. CGST, SGST, IGST apne aap, HSN, UPI QR, aur CA ke liye GSTR-1 Excel report. Keepsake Pro mein, pehle 10 bill free.",
  kicker="Hindi mein guide", h1="WhatsApp pe GST bill kaise bhejein", hi="फ़ोन से GST बिल बनाकर WhatsApp पर भेजें",
  lead="Chhoti dukaan ke liye alag billing software aur printer zaroori nahi. GetKeepsake Pro mein aap phone se GST bill banate hain, customer ko WhatsApp pe bhejte hain, aur mahine ke end mein CA ko ek link dete hain.",
  points=[("Bill mein kya hota hai", ["Aapka GSTIN, invoice number aur date", "Item, HSN code, quantity aur rate", "CGST + SGST ya IGST, apne aap", "Amount in words aur round-off", "Customer ke liye UPI se pay karne ka QR"]), ("CA ko kya milta hai", ["Har mahine ka sales register", "GSTR-1 ke sections (B2B, B2CS, HSN) Excel mein", "GSTR-3B summary", "Ek read-only link, login ki zaroorat nahi"])],
  steps=[("Settings mein GSTIN daalein", "Ek baar GSTIN, business ka naam aur invoice prefix bharein."), ("Naya bill banayein", "Items chunein ya likhein. HSN aur GST rate yaad rehte hain."), ("WhatsApp pe bhejein", "Ek tap mein bill customer ke WhatsApp pe, UPI QR ke saath."), ("Mahine ke end mein CA ko link dein", "CA Excel aur CSV report seedha download kar leta hai.")],
  faq=[("Kya yeh free hai?", "Har GetKeepsake page pe pehle 10 GST bill free hain. Uske baad Keepsake Pro: ₹299 mahina ya ₹2,999 saal, jismein online store bhi shaamil hai."),
       ("Kya B2B bill (customer ke GSTIN ke saath) ban sakta hai?", "Haan. Customer ka GSTIN daalein, state apne aap aa jaati hai aur IGST ya CGST+SGST sahi lagta hai."),
       ("Kya jewellery ka 3% GST bhi hai?", "Haan. 0%, 3%, 5%, 18% aur 40% sab rates hain."),
       ("Kya purchase bill aur e-way bill bhi banta hai?", "Abhi nahi. Yeh sales ke GST bill aur CA ke liye sales reports ke liye hai."),
       ("CA ko report kaise milegi?", "Dashboard se CA ke liye ek link share karein. Woh har mahine ka Excel aur CSV download kar sakta hai.")]),
"shops/jaipur": dict(lang="en-IN", city="Jaipur", title="Website, QR Menu & Loyalty Card for Shops in Jaipur | GetKeepsake",
  desc="A mobile page, QR menu and loyalty card for cafés, restaurants, boutiques, salons and kirana stores in Jaipur. WhatsApp orders, UPI, printed QR board delivered. ₹1,000 one-time.",
  kicker="Now in Jaipur", h1="For shops in Jaipur", hi="जयपुर की दुकानों के लिए, एक QR में सब कुछ",
  lead="From cafés in C-Scheme to boutiques on MI Road and kirana stores in Vaishali Nagar, Jaipur's shops get found on phones first. GetKeepsake gives your shop a mobile page behind one QR: your menu or price list, orders on WhatsApp, UPI, Google reviews and a loyalty card.",
  points=[("What your Jaipur shop gets", ["Your own page link and QR code", "Menu or price list with photos, in English or Hindi", "Orders on WhatsApp and UPI payments, 0% commission", "Google review button and offer of the day", "Loyalty card for your regulars", "A printed QR board delivered to your shop"]), ("Popular with", ["Cafés and restaurants", "Boutiques, sarees and jewellery", "Salons and barbers", "Kirana and general stores", "Bakeries and sweet shops", "Gyms, clinics and coaching"])],
  steps=[("Make your page", "Add your shop's details and menu in about 5 minutes, or message us on WhatsApp for help."), ("Pay ₹1,000 once", "Your page goes live with its own link and QR."), ("Get your QR board", "We courier the printed board to your shop in Jaipur.")],
  faq=[("How much does a website for a shop in Jaipur cost?", "₹1,000 once with GetKeepsake: your page, link, QR, loyalty card and a printed QR board. No monthly fee and no commission. Keepsake Pro (online store and GST bills) is ₹299 a month or ₹2,999 a year, if you want it."),
       ("Can someone help me set it up?", "Yes. Message us on WhatsApp at +91 83027 91217 and we'll help you set up your page."),
       ("Do you deliver the QR board in Jaipur?", "Yes. The printed 3.5 × 5 inch QR board is couriered to your shop, anywhere in India."),
       ("Can my page be in Hindi?", "Yes. Write your shop name, menu and offers in Hindi, English or both."),
       ("Which businesses in Jaipur can use it?", "Cafés, restaurants, boutiques, salons, kirana stores, bakeries, sweet shops, gyms, clinics, coaching centres and more.")]),
}

CSS = """<style>
.gh{background:var(--bg);color:var(--ink);padding:70px 0 10px}.gh .w{display:block}.gh h1{max-width:900px}
.gh .ki{display:inline-block;font:600 13px 'JetBrains Mono',monospace;letter-spacing:.08em;color:var(--ac2,#1F1BF2);margin-bottom:16px}
.gh h1{font:800 clamp(40px,7vw,76px)/1 'Inter Tight',sans-serif;letter-spacing:-.04em;margin:0}
.gh .hi{font:700 22px 'Mukta',sans-serif;margin:18px 0 0;opacity:.8}
.gh .ld{font:400 19px/1.6 Inter,sans-serif;margin:22px 0 0;max-width:720px;opacity:.85}
.gh .ct{display:flex;gap:10px;flex-wrap:wrap;margin-top:26px}
.gl{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px}
.gl .bx{padding:26px 26px 18px;border-radius:24px;background:var(--pa);border:1px solid var(--ln)}
.gl .bx h3{margin:0 0 12px;font:700 22px 'Inter Tight',sans-serif}.gl .bx ul{margin:0;padding-left:20px;font:400 16px/1.7 Inter,sans-serif}
.gp{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px}
.gp .bx{padding:28px;border-radius:24px;border:1px solid var(--ln);background:var(--pa)}.gp .bx b{display:block;font:700 15px Inter}.gp .bx strong{display:block;font:800 30px 'Inter Tight';margin:6px 0 12px;letter-spacing:-.02em}
.gp .bx ul{margin:0;padding-left:20px;font:400 15.5px/1.7 Inter}.upd{font:500 13px Inter;opacity:.6;margin-top:18px}
</style>"""

def page(path, d):
    url = "https://getkeepsake.in/" + path
    pts = "".join(f'<div class="bx" data-gk-st><h3>{esc(h)}</h3><ul>{"".join(f"<li>{esc(x)}</li>" for x in xs)}</ul></div>' for h, xs in d["points"])
    steps = "".join(f"<div data-gk-st><b>{esc(a)}</b><p>{esc(b)}</p></div>" for a, b in d["steps"])
    faq = "".join(f"<details data-gk-st><summary>{esc(q)}</summary><p>{esc(a)}</p></details>" for q, a in d["faq"])
    pr = "".join(f'<div class="bx" data-gk-st><b>{esc(n)}</b><strong>{esc(p)}</strong><ul>{"".join(f"<li>{esc(x)}</li>" for x in xs)}</ul></div>' for n, p, xs in PRICES)
    hin = d["lang"] != "en-IN"
    L = (lambda en, hi: hi) if hin else (lambda en, hi: en)
    graph = [{"@type": "WebPage", "@id": url + "#page", "url": url, "name": d["title"], "description": d["desc"], "inLanguage": d["lang"], "dateModified": UPDATED,
              "isPartOf": {"@type": "WebSite", "name": "GetKeepsake", "url": "https://getkeepsake.in/"}, "about": {"@type": "Organization", "name": "GetKeepsake for Business", "url": "https://getkeepsake.in/"}},
             {"@type": "HowTo", "name": d["h1"], "inLanguage": d["lang"], "estimatedCost": {"@type": "MonetaryAmount", "currency": "INR", "value": "1000"}, "totalTime": "PT5M",
              "step": [{"@type": "HowToStep", "position": i + 1, "name": a, "text": b} for i, (a, b) in enumerate(d["steps"])]},
             {"@type": "FAQPage", "inLanguage": d["lang"], "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in d["faq"]]}]
    if d.get("city"):
        graph.append({"@type": "Service", "name": "GetKeepsake for Business in " + d["city"], "serviceType": "Mobile business page with QR code", "areaServed": {"@type": "City", "name": d["city"]},
                      "provider": {"@type": "Organization", "name": "GetKeepsake", "url": "https://getkeepsake.in/", "telephone": "+91-83027-91217"},
                      "offers": [{"@type": "Offer", "name": "Business page", "price": "1000", "priceCurrency": "INR"}, {"@type": "Offer", "name": "Keepsake Pro, yearly", "price": "2999", "priceCurrency": "INR"}]})
    ld = {"@context": "https://schema.org", "@graph": graph}
    alt = ""
    return f'''<!doctype html>
<html lang="{"hi" if hin else "en-IN"}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{esc(d["title"])}</title>
<meta name="description" content="{esc(d["desc"])}">
<link rel="canonical" href="{url}">{alt}
<meta name="robots" content="index,follow,max-image-preview:large">
<meta property="og:type" content="article"><meta property="og:site_name" content="GetKeepsake"><meta property="og:url" content="{url}">
<meta property="og:title" content="{esc(d["h1"])} · GetKeepsake for business"><meta property="og:description" content="{esc(d["desc"])}">
<meta property="og:image" content="https://getkeepsake.in/assets/brand/og.jpg"><meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#1F1BF2"><meta property="article:modified_time" content="{UPDATED}">
<link rel="icon" href="/assets/brand/favicon.ico" sizes="any"><link rel="icon" type="image/svg+xml" href="/assets/brand/favicon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&family=Mukta:wght@600;700&display=swap">
<link rel="stylesheet" href="/assets/ind.v5.css"><link rel="stylesheet" href="/assets/gk.v2.css">{CSS}
<script>document.documentElement.classList.add("gkm")</script>
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False).replace("</", "<\\/")}</script>
</head>
<body>
{nav()}
<main>
<section class="gh"><div class="w">
  <span class="ki">{esc(d["kicker"])}</span>
  <h1>{esc(d["h1"])}</h1>
  <p class="hi" lang="hi">{esc(d["hi"])}</p>
  <p class="ld">{esc(d["lead"])}</p>
  <div class="ct"><a class="b p" href="/shops/studio">{L("Make your page · ₹1,000", "Apna page banayein · ₹1,000")}</a><a class="b s" href="{WA}?text={esc(L("Hi, I'd like a GetKeepsake page for my shop", "Namaste, mujhe apni dukaan ka GetKeepsake page chahiye"))}">{L("Ask on WhatsApp", "WhatsApp pe poochein")}</a></div>
  <p class="upd">{L("Updated", "Updated")} {UPDATED}</p>
</div></section>
<section class="se"><div class="w"><div class="gl">{pts}</div></div></section>
<section class="se" id="how"><div class="w">
  <div class="sh"><h2 data-gk-h2>{L("How it", "Kaise")} <em>{L("works", "banayein")}</em></h2></div>
  <div class="sp">{steps}</div>
</div></section>
<section class="se" id="pricing"><div class="w">
  <div class="sh"><h2 data-gk-h2>{L("What it", "Kitna")} <em>{L("costs", "kharcha")}</em></h2><p>{L("No commission on orders or payments.", "Orders aur payment pe koi commission nahi.")}</p></div>
  <div class="gp">{pr}</div>
</div></section>
<section class="se" id="faq"><div class="w">
  <div class="sh"><h2 data-gk-h2>{L("Good to", "Sawal")} <em>{L("know", "jawab")}</em></h2></div>
  <div class="fq">{faq}</div>
</div></section>
<section class="cl" style="margin-top:96px"><div class="w">
  <h2 data-gk-h2>{L("Make your shop", "Apni dukaan")} <em>{L("unmissable", "online laayein")}</em></h2>
  <p lang="hi">आज ही अपना पेज बनाएँ</p>
  <div class="ct"><a class="b p" href="/shops/studio">{L("Make your page · ₹1,000", "Page banayein · ₹1,000")}</a><a class="b s" href="{WA}">WhatsApp +91 83027 91217</a></div>
</div></section>
</main>
{footer()}
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js" defer></script><script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js" defer></script>
<script src="/assets/gk.v1.js" defer></script><script src="/assets/ks-pixel.v1.js" defer></script>
</body>
</html>
'''

if __name__ == "__main__":
    for path, d in G.items():
        f = os.path.join(REPO, path + ".html"); os.makedirs(os.path.dirname(f), exist_ok=True)
        open(f, "w").write(page(path, d))
    print("wrote", list(G))
