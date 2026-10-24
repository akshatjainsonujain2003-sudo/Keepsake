/* Sample business pages for the /shops landing page and the studio's "See an example". Needs biz.v10.js first. v6: the demos use the newer Pop and Label layouts.
   One demo per business group: food (cafe), fashion (boutique), beauty (salon), services (gym), health (clinic), stores (kirana), real estate (realestate). */
window.KSBizDemos = (function () {
  const B = KSBiz.blank, z = "/assets/demo/biz/";
  const hrs = (o, c, sunOff) => ({ d: Array.from({ length: 7 }, (_, i) => [o, c, !!sunOff && i === 6]) });
  const it = (n, p, d, i, b) => ({ n, p, d: d || "", i: i ? z + i + ".webp" : "", b: !!b });
  const D = {
    cafe: Object.assign(B("cafe"), {
      t: "Brew & Bloom", area: "C-Scheme, Jaipur", tag: "Slow coffee, warm bakes and a corner made for long conversations.",
      loy: { on: true, n: 10, r: "Free coffee", t: "" }, cover: z + "cafe-cover.webp", phone: "9876543210", ig: "brewandbloom", review: "https://g.page/r/example/review", addr: "12 Prithviraj Rd, C-Scheme, Jaipur",
      hours: hrs("09:00", "22:30"), offer: { on: true, label: "Today's offer", title: "Buy 1 Get 1 on Cold Brews", text: "Weekdays 3–6 pm. Show this page at the counter.", till: "31 Oct" },
      ft: { on: true, label: "New drink", title: "Blood Orange Tonic", text: "Fresh blood orange, rosemary and sparkling tonic over ice.", p: "260", was: "320", img: z + "cafe-orange-wide.webp" },
      menu: [
        { n: "Coffee", items: [it("Cappuccino", "190", "Double shot, silky foam", "cafe-cappuccino", 1), it("Iced Americano", "180", "Espresso over ice", "cafe-americano"), it("Café Latte", "210", "Smooth and milky", "cafe-latte")] },
        { n: "Coolers", items: [it("Pink Lemonade", "160", "Lemon, mint, a hint of rose", "cafe-lemonade"), it("Blood Orange Tonic", "260", "Rosemary + tonic", "cafe-orange", 1)] },
        { n: "Bakes", items: [it("Butter Croissant", "180", "Baked fresh every morning", "cafe-croissant", 1), it("Baked Cheesecake", "280", "New York style", "cafe-cheesecake")] }
      ],
      gal: [z + "cafe-interior.webp", z + "cafe-bar.webp"], upi: { id: "brewandbloom@okaxis", name: "Brew & Bloom" }
    }),
    boutique: Object.assign(B("boutique"), {
      t: "Maison Noor", area: "Bapu Bazaar, Jaipur", tag: "Festive ethnic wear, occasion gowns and the little gold things that finish the look.",
      th: "maroon", cover: z + "bq-cover.webp", phone: "9811223344", ig: "maisonnoor", review: "https://g.page/r/example/review", addr: "22 Middle Lane, Khan Market, New Delhi",
      hours: hrs("11:00", "21:00"), offer: { on: true, label: "Festive edit", title: "Flat 20% off kurta sets", text: "This week only, in store and on WhatsApp.", till: "Sunday" },
      ft: { on: true, label: "New arrival", title: "Gulaab Kurta Set", text: "Ivory cotton-silk with hand-embroidered roses and a scalloped dupatta.", p: "3,490", was: "4,200", img: z + "bq-kurta-wide.webp" },
      menu: [
        { n: "Ethnic", items: [it("Gulaab Kurta Set", "3,490", "Embroidered roses, scallop edges", "bq-kurta", 1), it("Zari Suits", "2,800", "Hand-finished, many colours", "bq-suits"), it("Bridal Lehenga", "45,000", "Made to order", "bq-bridal")] },
        { n: "Occasion", items: [it("Satin Slip Gown", "5,900", "Off-shoulder, ivory", "bq-gown", 1)] },
        { n: "Accessories", items: [it("Cherry Charm Bag", "1,890", "Vegan leather", "bq-bag"), it("Gold Bangle Stack", "1,250", "Set of 7, anti-tarnish", "bq-bangles"), it("Tiger-eye Rings", "990", "Set of 6", "bq-rings")] }
      ],
      gal: [z + "bq-store2.webp", z + "bq-store1.webp", z + "bq-bridal-wide.webp"], upi: { id: "maisonnoor@okhdfc", name: "Maison Noor" }
    }),
    salon: Object.assign(B("salon"), {
      t: "Ivy Salon & Spa", area: "Raja Park, Jaipur", tag: "Precision cuts, calming rituals and nails done right, in a space made to unwind.",
      loy: { on: true, n: 5, r: "Free head massage", t: "" }, th: "sage", cover: z + "salon-cover.webp", phone: "9845012345", ig: "ivysalon", review: "https://g.page/r/example/review", addr: "80 Feet Road, Koramangala, Bengaluru",
      hours: hrs("10:00", "20:30"), offer: { on: true, label: "Weekday special", title: "Hair spa + blow-dry at ₹1,299", text: "Monday to Thursday. Book on WhatsApp.", till: "30 Nov" },
      ft: { on: true, label: "Signature ritual", title: "Ivy Hair Spa", text: "A 60-minute scalp massage, deep conditioning and a soft blow-dry.", p: "1,499", was: "1,899", img: z + "salon-wash-wide.webp" },
      menu: [
        { n: "Hair", items: [it("Haircut & Styling", "800", "Consultation, wash, cut and finish", "salon-cut", 1), it("Hair Spa", "1,499", "Scalp massage + deep conditioning", "salon-wash"), it("Global Colour", "3,500", "Ammonia-free")] },
        { n: "Skin", items: [it("Clean-up Facial", "1,200", "For men and women", "salon-facial"), it("Bridal Glow", "6,500", "Three sessions before the big day")] },
        { n: "Nails", items: [it("Gel Manicure", "1,100", "Long-lasting shine", "salon-nails", 1), it("Nail Art", "500", "Per set")] },
        { n: "Products", items: [it("Salon hair care", "650", "Shampoos, masks and serums", "salon-shelf")] }
      ],
      gal: [z + "salon-gold.webp", z + "salon-shelf-wide.webp"], upi: { id: "ivysalon@okicici", name: "Ivy Salon" }
    }),
    gym: Object.assign(B("gym"), {
      t: "Iron Republic", area: "Mansarovar, Jaipur", tag: "Open 5 am to 11 pm. Strength, cardio and coaching that actually gets results.",
      cover: z + "gym-cover.webp", phone: "9930012345", ig: "ironrepublic", review: "https://g.page/r/example/review", addr: "Link Road, Andheri West, Mumbai",
      hours: hrs("05:00", "23:00"), offer: { on: true, label: "Free trial", title: "Your first workout is on us", text: "Walk in any day with this page.", till: "" },
      menu: [
        { n: "Memberships", items: [it("1 month", "2,500", "Full gym access, all days", "gym-tread"), it("3 months", "6,500", "Save ₹1,000", "", 1), it("12 months", "20,000", "Best value + free diet plan")] },
        { n: "Personal training", items: [it("12 sessions", "9,000", "One-on-one with a certified coach", "gym-trainer", 1), it("24 sessions", "16,000", "Plus body-composition check-ins")] },
        { n: "Group classes", items: [it("HIIT · 4 weeks", "3,000", "Mon, Wed, Fri at 7 am and 7 pm", "gym-group"), it("Strength club", "3,500", "Small groups, coached lifts")] }
      ],
      gal: [z + "gym-cable.webp", z + "gym-bright.webp", z + "gym-group-tall.webp"], upi: { id: "ironrepublic@okaxis", name: "Iron Republic" }
    }),
    clinic: Object.assign(B("clinic"), {
      t: "Dr. Mehta's Family Clinic", area: "Vaishali Nagar, Jaipur", tag: "General physician · 20 years of caring for Jaipur's families, with in-house lab tests.",
      cover: z + "clinic-cover.webp", phone: "9414012345", ig: "drmehtaclinic", review: "https://g.page/r/example/review", addr: "B-21 Vaishali Nagar, Jaipur",
      hours: hrs("09:30", "20:30", true),
      stats: [{ v: "20+", l: "Years of practice" }, { v: "15k+", l: "Patients treated" }, { v: "4.9★", l: "Google rating" }, { v: "6 days", l: "Open every week" }],
      menu: [
        { n: "Consultations", items: [it("General consultation", "500", "Adults and children", "clinic-consult"), it("Follow-up within 7 days", "Free"), it("Home visit", "1,200", "Within 5 km")] },
        { n: "Tests", items: [it("Full body check-up", "999", "60+ parameters, report in 24 hours", "clinic-micro", 1), it("Blood sugar", "80"), it("ECG", "350")] },
        { n: "Procedures", items: [it("Day-care procedures", "On request", "Dressings, minor procedures", "clinic-ot-sq")] }
      ],
      gal: [z + "clinic-office.webp", z + "clinic-building.webp", z + "clinic-ot.webp"], upi: { id: "drmehta@oksbi", name: "Dr. Mehta" }
    }),
    kirana: Object.assign(B("grocery"), {
      t: "Sharma General Store", area: "Malviya Nagar, Jaipur", tag: "Daily needs, fresh staples and home delivery in 30 minutes. Order on WhatsApp.",
      cover: z + "kirana-cover.webp", phone: "9829012345", review: "https://g.page/r/example/review", addr: "Shop 4, Main Market, Malviya Nagar, Jaipur",
      hours: hrs("07:00", "22:00"), ord: true,
      stats: [{ v: "500+", l: "Products in stock" }, { v: "30 min", l: "Home delivery" }, { v: "1998", l: "Family-run since" }, { v: "UPI", l: "Pay any way" }],
      offer: { on: true, label: "This week", title: "Free delivery above ₹499", text: "Within 3 km. Send your list on WhatsApp.", till: "Sunday" },
      menu: [
        { n: "Staples", items: [it("Chakki Atta · 10 kg", "420", "Fresh-ground wheat", "", 1), it("Toor Dal · 1 kg", "160", "Unpolished", "kirana-pulses"), it("Basmati Rice · 5 kg", "650"), it("Sugar · 5 kg", "230")] },
        { n: "Oil & ghee", items: [it("Mustard Oil · 1 L", "190", "Kachi ghani"), it("Desi Ghee · 1 L", "620")] },
        { n: "Snacks", items: [it("Namkeen · 400 g", "110", "Bhujia, mixture, chana", "kirana-shelf"), it("Biscuits combo", "99", "Pack of 5")] }
      ],
      gal: [z + "kirana-aisle.webp", z + "kirana-pulses-wide.webp"], upi: { id: "sharmastore@okhdfcbank", name: "Sharma General Store" }
    }),
    realestate: Object.assign(B("realestate"), {
      t: "Shree Ram Properties", area: "Vaishali Nagar, Jaipur", tag: "Flats, villas and plots across Jaipur. Verified listings, honest prices and site visits any day.",
      cover: z + "re-cover.webp", phone: "9829012345", review: "https://g.page/r/example/review", addr: "Vaishali Nagar, Jaipur", ig: "shreeramproperties",
      hours: hrs("10:00", "20:00"),
      stats: [{ v: "250+", l: "Families settled" }, { v: "12 yrs", l: "In Jaipur" }, { v: "JDA", l: "Approved projects" }, { v: "0", l: "Hidden charges" }],
      offer: { on: true, label: "This month", title: "Free site visit with pickup", text: "Book on WhatsApp and we'll pick you up.", till: "30 Nov" },
      menu: [
        { n: "For sale", items: [{ n: "3 BHK Flat, Vaishali Nagar", p: "85 Lakh", d: "1,450 sq ft · 2 parking · East facing · Lift", s: "ready", b: true, i: z + "re-living.webp" }, { n: "4 BHK Villa, Jagatpura", p: "1.6 Cr", d: "2,800 sq ft · Private garden · Gated society", s: "new", b: false, i: z + "re-villa.webp" }, { n: "Plot, Ajmer Road", p: "42 Lakh", d: "200 sq yd · JDA approved · Corner plot", s: "sale", b: false, i: z + "re-plot.webp" }] },
        { n: "For rent", items: [{ n: "2 BHK Flat, Malviya Nagar", p: "18,000/month", d: "1,050 sq ft · Semi-furnished · Family only", s: "rent", b: false, i: z + "re-bedroom.webp" }, { n: "Shop, MI Road", p: "45,000/month", d: "320 sq ft · Main road frontage", s: "rent", b: false, i: z + "re-shop.webp" }] }
      ],
      ft: { on: true, label: "New launch", title: "Skyline Residency, Jagatpura", text: "2 & 3 BHK homes with pool, clubhouse and landscaped gardens. Possession Dec 2027.", p: "62 Lakh onwards", was: "", img: z + "re-society.webp" },
      gal: [z + "re-kitchen.webp", z + "re-society.webp", z + "re-garden.webp", z + "re-living.webp"], upi: { id: "", name: "" }
    })
  };
  // Newer looks for the landing page and the studio's examples.
  const set = (k, lay, th) => { if (D[k]) { D[k].lay = lay; D[k].th = th; } };
  set("cafe", "label", "zest"); set("boutique", "label", "noir"); set("salon", "pop", "bloom"); set("gym", "pop", "riot"); set("kirana", "pop", "fizz");
  return D;
})();
