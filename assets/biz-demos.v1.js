/* Sample business pages for the /shops landing page and the studio's "Try an example". Needs biz.v2.js first. */
window.KSBizDemos = (function () {
  const B = KSBiz.blank, d = "/assets/demo/";
  const hrs = (o, c, sunOff) => ({ d: Array.from({ length: 7 }, (_, i) => [o, c, !!sunOff && i === 6]) });
  return {
    cafe: Object.assign(B("cafe"), {
      t: "Brew & Bloom", area: "C-Scheme, Jaipur", tag: "Slow coffee, warm bakes and a garden corner made for long conversations.",
      cover: d + "cafe.webp", phone: "9876543210", ig: "brewandbloom", review: "https://g.page/r/example/review", addr: "12 Prithviraj Rd, C-Scheme, Jaipur",
      hours: hrs("09:00", "22:30"), offer: { on: true, label: "Today's offer", title: "Buy 1 Get 1 on Cold Brews", text: "Weekdays 3–6 pm. Show this page at the counter.", till: "31 Oct" },
      ft: { on: true, label: "New drink", title: "Coconut Iced Latte", text: "Double espresso, coconut milk and a little palm jaggery over ice.", p: "260", was: "320", img: "" },
      menu: [
        { n: "Iced coffee", items: [{ n: "Spanish Latte", p: "240", d: "Espresso, condensed milk, cinnamon", b: true }, { n: "Vietnamese Cold Brew", p: "260", d: "18-hour steep over ice" }, { n: "Iced Americano", p: "180", d: "Espresso + chilled water" }, { n: "Caramel Frappé", p: "280", d: "Blended, whipped cream" }] },
        { n: "Hot coffee", items: [{ n: "Cappuccino", p: "190", d: "Espresso + silky foam" }, { n: "Flat White", p: "210", d: "Thin layer of milk foam", b: true }] },
        { n: "Bakes", items: [{ n: "Almond Croissant", p: "220", b: true }, { n: "Blueberry Cheesecake", p: "280" }] }
      ],
      gal: [d + "records.webp", d + "gallery.webp"], upi: { id: "brewandbloom@okaxis", name: "Brew & Bloom" }
    }),
    florist: Object.assign(B("florist"), {
      t: "Petal & Fern", area: "Bandra West, Mumbai", tag: "Hand-tied bouquets and indoor plants, delivered across Mumbai the same day.",
      cover: d + "flowers.webp", phone: "9820012345", ig: "petalandfern", review: "https://g.page/r/example/review", addr: "4 Hill Road, Bandra West, Mumbai",
      hours: hrs("08:00", "21:00"), offer: { on: true, label: "This week", title: "Free delivery over ₹999", text: "", till: "Sunday" },
      ft: { on: true, label: "Bouquet of the week", title: "Golden Hour", text: "Sunflowers, white lisianthus and eucalyptus, wrapped in kraft paper.", p: "1,450", was: "1,800", img: d + "sunflower.webp" },
      menu: [
        { n: "Bouquets", items: [{ n: "Sunflower Joy", p: "899", i: d + "sunflower.webp", b: true }, { n: "Garden Mix", p: "1,250", i: d + "flowers.webp" }, { n: "Evening Meadow", p: "1,100", i: d + "lawn.webp" }] },
        { n: "Plants", items: [{ n: "Monstera Deliciosa", p: "650" }, { n: "Snake Plant", p: "450" }] }
      ],
      gal: [d + "lawn.webp", d + "gallery.webp", d + "sunflower.webp"], upi: { id: "petalfern@okicici", name: "Petal & Fern" }
    }),
    photo: Object.assign(B("photo"), {
      t: "Frame Riot Studio", area: "Indiranagar, Bengaluru", tag: "Pre-weddings, weddings and couple shoots that feel like you.",
      cover: d + "temple.webp", phone: "9900011223", ig: "frameriot", review: "https://g.page/r/example/review", addr: "100 Feet Rd, Indiranagar, Bengaluru",
      hours: hrs("10:00", "20:00", true),
      menu: [
        { n: "Pre-wedding", items: [{ n: "City story · 4 hours", p: "18,000", d: "2 locations, 40 edited photos, 1 reel", b: true }, { n: "Full day · 2 cities", p: "35,000", d: "4 locations, 80 photos, 2 reels" }] },
        { n: "Weddings", items: [{ n: "One day", p: "60,000", d: "2 photographers, 400 photos, film" }, { n: "Three days", p: "1,50,000", d: "Haldi to reception, album included" }] },
        { n: "Couple shoots", items: [{ n: "Golden hour · 90 min", p: "7,500", d: "One location, 25 photos" }, { n: "Rainy day special", p: "9,000", d: "Umbrellas on us" }] }
      ],
      gal: [d + "rain.webp", d + "night.webp", d + "street.webp", d + "car.webp", d + "hands.webp"], upi: null
    }),
    clinic: Object.assign(B("clinic"), {
      t: "Dr. Mehta's Family Clinic", area: "Vaishali Nagar, Jaipur", tag: "General physician · 20 years of caring for Jaipur's families.",
      phone: "9414012345", ig: "drmehtaclinic", review: "https://g.page/r/example/review", addr: "B-21 Vaishali Nagar, Jaipur",
      stats: [{ v: "20+", l: "Years of practice" }, { v: "15k+", l: "Patients treated" }, { v: "4.9★", l: "Google rating" }, { v: "6 days", l: "Open every week" }],
      hours: hrs("09:30", "20:30", true),
      menu: [{ n: "Consultations", items: [{ n: "General consultation", p: "500" }, { n: "Follow-up (within 7 days)", p: "Free" }, { n: "Home visit", p: "1,200", d: "Within 5 km" }] }, { n: "Tests", items: [{ n: "Blood sugar", p: "80" }, { n: "ECG", p: "350" }] }],
      upi: { id: "drmehta@oksbi", name: "Dr. Mehta" }
    })
  };
})();
