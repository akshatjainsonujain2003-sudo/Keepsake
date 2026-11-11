/* Keepsake designed website templates (Wildflower, Red Letter, Mixtape, Wedding invitation).
   - KSKit.DEMO[tpl]   : the example content a new website starts with
   - KSKit.FIELDS[tpl] : what the builder lets customers edit
   - KSKit.boot(tpl, render): runs a template with the customer's data (or the demo),
     and re-renders live when the builder sends new data.
   Customer text is only ever set with textContent. Links are checked before use.
   Files in /assets are cached for a year: rename (v5…) when changing. */
(function () {
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const D = n => "/assets/demo/" + n + ".webp", W = n => "/assets/wildflower/" + n + ".webp";
  const P = {
    sunflower: D("sunflower"), lawn: D("lawn"), street: D("street"), gallery: D("gallery"), temple: D("temple"),
    flowers: D("flowers"), hands: D("hands"), selfie: D("selfie"), cafe: D("cafe"), rain: D("rain"),
    car: D("car"), records: D("records"), night: D("night"),
    lakedance: W("lakedance"), lotus: W("lotus"), twirl: W("twirl")
  };
  const DEMO = {
    wildflower: {
      v: 2, tpl: "wildflower", a: "Meera", b: "Aarav", tagline: "Five years, and counting",
      date: "2021-03-12T18:30", place: "a tiny café in Udaipur", note: "us, obviously",
      photos: { hero: P.sunflower, hero2: P.lakedance, calendar: P.cafe, cover: P.flowers, someday: P.street, oval: "", end: P.twirl },
      calnote: "the day you sat across from me", firstDate: "two coffees, gone cold",
      quote: "Somewhere between the first coffee and the last train home, you became my favourite place.",
      song: { url: "", title: "Slow Mornings", cap: "Press play. It's the one from our first drive." },
      countdown: true,
      words: "my person, home, still you, us, every day, always, my favourite, you",
      story: [
        { title: "The beginning", text: "A borrowed table at a crowded café, two coffees going cold, and a conversation neither of us wanted to end.", when: "March 2021", photo: P.gallery },
        { title: "The first trip", text: "Windows down, the wrong turn twice, and the moment we knew we travelled well together.", when: "August 2022", photo: P.car },
        { title: "Our little home", text: "Two keys, one wobbly table, and a balcony just big enough for both of us and too many plants.", when: "December 2024", photo: P.lotus },
        { title: "Still choosing you", text: "Every ordinary evening, every small win, every quiet Sunday. This is the chapter we're writing now.", when: "Today", photo: P.lakedance }
      ],
      momentsIntro: "The glances, the detours, the days we didn't want to end.",
      moments: [
        { photo: P.twirl, cap: "One more spin" }, { photo: P.street, cap: "Walking home the long way" },
        { photo: P.rain, cap: "One umbrella, two people" }, { photo: P.flowers, cap: "Running through the flowers" },
        { photo: P.lawn, cap: "Golden hour, your hand in mine" }
      ],
      love: ["The way you hum when you cook.", "How you always save me the last bite.", "Your terrible jokes. Every single one.", "That you remember my coffee order.", "How safe I feel when you hold my hand.", "You, on a lazy Sunday morning."],
      letterTitle: "Open when you miss me", greeting: "My love,",
      letter: "You make ordinary days feel like a holiday. You remember the small things, you laugh at my worst jokes, and you make every room feel like home.\n\nThank you for five years of choosing me, on the easy days and the hard ones. I'd choose you again, every single time.",
      sign: "Yours, Aarav",
      showSomeday: true, somedayTitle: "Someday, with you",
      someday: [
        { text: "See the northern lights", done: false }, { text: "Learn to make your mum's biryani", done: true },
        { text: "A road trip with no plan", done: true }, { text: "Dance in the rain (on purpose)", done: false },
        { text: "Grow old and annoying together", done: false }
      ]
    },
    candlelit: {
      v: 2, tpl: "candlelit", a: "Meera", b: "Aarav", recipient: "Meera", tagline: "two hearts, one story",
      date: "2021-03-12T18:30", place: "Udaipur", cue: "a letter is waiting for you",
      photos: { hero: P.lawn, storyA: P.cafe, storyB: P.gallery, tv: P.rain, cover: P.flowers, end: P.sunflower },
      greeting: "Dear you,",
      letter: "Five years ago a crowded café gave me the best seat in the house: the one across from you. Since then you've turned rainy days into stories and ordinary evenings into the parts of life I want to keep.\n\nThis page holds a few of them, so you can open it whenever you miss me, and remember that I'd choose you again, every single time.",
      sign: "Always yours, Aarav",
      reasonsTitle: "reasons I love you",
      reasons: ["The way you say my name when you're sleepy.", "You laugh with your whole face.", "You make chai exactly right, every time.", "You believe in me louder than I do.", "Home is wherever you leave your shoes."],
      reasonsEnd: "and a thousand more",
      words: "only you, my love, home, every day, my person, always",
      filmCaption: "you and me, always",
      storyKicker: "chapter one, and every one since",
      story: "Once upon a time, two people reached for the last free table at the same café. Neither of us gave it up, so we shared it, and talked until they stacked the chairs.\n\nThen came the wrong turn, the right umbrella, a hundred late-night drives and more inside jokes than anyone should be allowed. Somehow, it still feels like the beginning.",
      showTv: true,
      reruns: [
        { title: "The wrong turn", note: "Twice. Same day. We still don't talk about it." },
        { title: "The great biryani disaster", note: "The smoke alarm was on your side." },
        { title: "Sunday, 2 a.m.", note: "Maggi on the balcony and the whole city asleep." },
        { title: "You, singing in the car", note: "Every word wrong. Every time perfect." }
      ],
      momentsIntro: "The glances, journeys and quiet little nights that made us, us.",
      moments: [{ photo: P.hands, cap: "your hand" }, { photo: P.car, cap: "wrong turn" }, { photo: P.flowers, cap: "the flower field" }, { photo: P.temple, cap: "temple mornings" }],
      openWhen: [
        { when: "you miss me", msg: "Close your eyes. I'm thinking of you right now, I promise." },
        { when: "you can't sleep", msg: "Count every time I said I love you today. Then add one more." },
        { when: "you need a smile", msg: "Remember the wrong turn? I still laugh about it." },
        { when: "we've had a fight", msg: "I'm already sorry. Let's get chai and start over." }
      ],
      song: { url: "", title: "Slow Mornings", note: "the one from our first drive" }
    },
    mixtape: {
      v: 1, tpl: "mixtape", a: "Meera", b: "Aarav", tagline: "my favourite person",
      date: "2021-03-12T18:30", place: "a tiny café in Udaipur",
      photos: { hero: P.street, hero2: P.selfie, first: P.cafe, cover: P.records, end: P.night },
      words: "my person, 2am talks, home, always you, inside jokes, us",
      firstDate: "two coffees, gone cold", firstNote: "you ordered for me. you got it wrong. i didn't mind one bit.",
      countdown: true,
      filmIntro: "every frame, a little bit of us.",
      moments: [
        { photo: P.twirl, cap: "one more spin" }, { photo: P.car, cap: "the wrong turn" }, { photo: P.rain, cap: "one umbrella" }, { photo: P.hands, cap: "your hand" },
        { photo: P.night, cap: "city lights" }, { photo: P.selfie, cap: "too close, always" }, { photo: P.lawn, cap: "golden hour" }, { photo: P.flowers, cap: "the flower field" }
      ],
      song: { url: "", title: "I think of you in every song", note: "they all belong to you" },
      tracks: ["the one from our first drive", "the one you always sing wrong", "our kitchen dance song", "3am, windows down", "the one that made you cry"],
      love: ["the way you steal my hoodies", "how you laugh at your own jokes first", "your sleepy voice on calls", "that you remember how i take my chai", "the way you hold my hand in crowds", "you, just you"],
      sorry: "i'm sorry. you matter more than being right. let's get chai and start over?",
      openWhen: [
        { when: "you miss me", msg: "close your eyes. i'm thinking of you right now, promise." },
        { when: "you can't sleep", msg: "call me. i don't care what time it is." },
        { when: "you need a laugh", msg: "remember the wrong turn? twice. same day." }
      ],
      greeting: "hey you,",
      letter: "I don't say it enough, so here it is, written down where you can find it whenever you want: you are my favourite person. My favourite voice, my favourite hand to hold, my favourite place to come home to.\n\nThank you for every 2am talk, every bad joke and every ordinary day you made feel like something worth keeping. I'd choose you again, every single time.",
      sign: "yours, always · Aarav"
    }
    ,
    // Wedding invitation: one link the couple sends to every guest. Events with venue and map, RSVP on WhatsApp, countdown.
    wedding: {
      v: 1, tpl: "wedding", a: "Ananya", b: "Rohan",
      invite: "Together with their families", tagline: "invite you to celebrate their wedding",
      date: "2026-12-12T19:00", city: "Jaipur", hashtag: "#AnanyaWedsRohan",
      blessing: "With the blessings of", familyA: "Smt. Sunita & Shri Rajesh Sharma", familyB: "Smt. Kavita & Shri Anil Mehta",
      photos: { hero: P.lawn, couple: P.hands, end: P.temple },
      note: "We would love to have you with us as we begin our new life together.",
      countdown: true,
      events: [
        { name: "Haldi", when: "2026-12-10T10:00", venue: "Sharma Residence, C-Scheme, Jaipur", map: "", dress: "Wear yellow" },
        { name: "Mehendi", when: "2026-12-10T16:00", venue: "Sharma Residence, C-Scheme, Jaipur", map: "", dress: "Greens and florals" },
        { name: "Sangeet", when: "2026-12-11T19:00", venue: "The Courtyard, Tonk Road, Jaipur", map: "", dress: "Indo-western" },
        { name: "Wedding", when: "2026-12-12T19:00", venue: "Rambagh Lawns, Bhawani Singh Road, Jaipur", map: "", dress: "Traditional" },
        { name: "Reception", when: "2026-12-13T20:00", venue: "Rambagh Lawns, Bhawani Singh Road, Jaipur", map: "", dress: "Formal" }
      ],
      showStory: true, storyTitle: "How it began",
      story: "We met at a friend's wedding in Udaipur, arguing over the last gulab jamun. Three years, two cities and countless chai later, we are having a wedding of our own.",
      momentsTitle: "A few of our favourite days",
      moments: [{ photo: P.sunflower, cap: "The proposal" }, { photo: P.car, cap: "Our first road trip" }, { photo: P.flowers, cap: "Roka day" }, { photo: P.selfie, cap: "Us" }],
      showRsvp: true, rsvpTitle: "Will you join us?", rsvpBy: "Kindly reply by 1 December",
      contacts: [{ name: "Priya (bride's side)", phone: "" }, { name: "Karan (groom's side)", phone: "" }],
      showInfo: true, infoTitle: "Good to know",
      info: ["Nearest airport and railway station: Jaipur, 20 minutes from the venue.", "Rooms are held for outstation guests. Tell us your dates when you RSVP.", "The pheras begin at 11 pm. Dinner is served from 8 pm."],
      closing: "With love,", sign: "Ananya & Rohan"
    }
  };

  // What the builder shows. type: text | area | date | photo | toggle | list(of) | strings
  const PHOTO_LIST = (key, label, max, extra) => ({ key, label, type: "list", max, add: "Add a photo", of: [{ key: "photo", label: "Photo", type: "photo" }, { key: "cap", label: "Caption", type: "text", max: 60 }].concat(extra || []) });
  const FIELDS = {
    wildflower: [
      { group: "The two of you", fields: [
        { key: "a", label: "First name", type: "text", max: 30 }, { key: "b", label: "Second name", type: "text", max: 30 },
        { key: "tagline", label: "Line above your names", type: "text", max: 60 },
        { key: "date", label: "The day it all began (first date, anniversary…)", type: "date" },
        { key: "place", label: "Where it began", type: "text", max: 60 },
        { key: "note", label: "Handwritten note by the photos", type: "text", max: 30 },
        { key: "photos.hero", label: "Main photo", type: "photo" }, { key: "photos.hero2", label: "Polaroid photo", type: "photo" } ] },
      { group: "The day we met & our song", fields: [
        { key: "photos.calendar", label: "Photo beside the calendar", type: "photo" },
        { key: "firstDate", label: "On the ticket: what you did that day", type: "text", max: 40 },
        { key: "calnote", label: "Handwritten line under the calendar", type: "text", max: 50 },
        { key: "photos.oval", label: "Picture in the gold oval (a painted pond shows if empty)", type: "photo" },
        { key: "quote", label: "Quote", type: "area", max: 220 },
        { key: "song.url", label: "Spotify song link", type: "text", max: 300, placeholder: "https://open.spotify.com/track/…" },
        { key: "song.title", label: "Song name", type: "text", max: 50 },
        { key: "song.cap", label: "Line under the player", type: "text", max: 90 },
        { key: "photos.cover", label: "Album cover photo", type: "photo" },
        { key: "countdown", label: "Show how long you've been together", type: "toggle" },
        { key: "words", label: "Scrolling words (separate with commas)", type: "text", max: 160 } ] },
      { group: "Our story", fields: [
        { key: "story", label: "Chapters", type: "list", max: 6, add: "Add a chapter", of: [
          { key: "title", label: "Title", type: "text", max: 40 }, { key: "text", label: "What happened", type: "area", max: 300 },
          { key: "when", label: "When", type: "text", max: 30 }, { key: "photo", label: "Photo", type: "photo" } ] } ] },
      { group: "Little moments", fields: [
        { key: "momentsIntro", label: "Intro line", type: "text", max: 120 },
        PHOTO_LIST("moments", "Photos", 10) ] },
      { group: "Things I love about you", fields: [
        { key: "love", label: "Sticky notes", type: "strings", max: 9, item: "Something you love about them", add: "Add a note", itemMax: 90 } ] },
      { group: "The letter", fields: [
        { key: "letterTitle", label: "Heading", type: "text", max: 50 },
        { key: "greeting", label: "Greeting", type: "text", max: 40 },
        { key: "letter", label: "Your letter (leave a blank line between paragraphs)", type: "area", max: 2000 },
        { key: "sign", label: "Signed", type: "text", max: 40 },
        { key: "photos.end", label: "Photo in the closing gold oval", type: "photo" } ] },
      { group: "Our someday list", fields: [
        { key: "showSomeday", label: "Show this section", type: "toggle" },
        { key: "somedayTitle", label: "Heading", type: "text", max: 40 },
        { key: "someday", label: "Things to do together", type: "list", max: 10, add: "Add a dream", of: [{ key: "text", label: "Something to do together", type: "text", max: 60 }, { key: "done", label: "We've done this", type: "toggle" }] },
        { key: "photos.someday", label: "Photo beside the list", type: "photo" } ] }
    ],
    candlelit: [
      { group: "The two of you", fields: [
        { key: "recipient", label: "Who is it for? (written above the envelope)", type: "text", max: 30 },
        { key: "a", label: "First name", type: "text", max: 30 }, { key: "b", label: "Second name", type: "text", max: 30 },
        { key: "tagline", label: "Line above your names", type: "text", max: 60 },
        { key: "date", label: "The day it all began (first date, anniversary…)", type: "date" },
        { key: "photos.hero", label: "Main photo (under your names)", type: "photo" } ] },
      { group: "The letter", fields: [
        { key: "greeting", label: "Greeting", type: "text", max: 40 },
        { key: "letter", label: "Your letter (leave a blank line between paragraphs)", type: "area", max: 2000 },
        { key: "sign", label: "Signed", type: "text", max: 40 } ] },
      { group: "Reasons I love you", fields: [
        { key: "reasonsTitle", label: "Heading", type: "text", max: 40 },
        { key: "reasons", label: "Reasons", type: "strings", max: 8, item: "Reason", add: "Add a reason", itemMax: 90 },
        { key: "reasonsEnd", label: "Closing line", type: "text", max: 40 },
        { key: "filmCaption", label: "Big line written three times across the page", type: "text", max: 40 },
        { key: "words", label: "Scrolling words (separate with commas)", type: "text", max: 160 } ] },
      { group: "Our story", fields: [
        { key: "storyKicker", label: "Line above the heading", type: "text", max: 60 },
        { key: "story", label: "Your story (leave a blank line between paragraphs)", type: "area", max: 1500 },
        { key: "photos.storyA", label: "Postage-stamp photo", type: "photo" }, { key: "photos.storyB", label: "Polaroid photo", type: "photo" } ] },
      { group: "Our favourite reruns (optional)", fields: [
        { key: "showTv", label: "Show this section", type: "toggle" },
        { key: "photos.tv", label: "Photo above the tickets", type: "photo" },
        { key: "reruns", label: "Memories you replay", type: "list", max: 8, add: "Add an episode", of: [{ key: "title", label: "Episode title", type: "text", max: 40 }, { key: "note", label: "One line about it", type: "text", max: 90 }] } ] },
      { group: "Moments so far", fields: [
        { key: "momentsIntro", label: "Intro line", type: "text", max: 140 },
        PHOTO_LIST("moments", "Photos on playing cards", 8) ] },
      { group: "Open when…", fields: [
        { key: "openWhen", label: "Envelopes", type: "list", max: 8, add: "Add an envelope", of: [{ key: "when", label: "Open when…", type: "text", max: 30 }, { key: "msg", label: "Note inside", type: "area", max: 200 }] } ] },
      { group: "Song & ending", fields: [
        { key: "song.url", label: "Spotify song link", type: "text", max: 300, placeholder: "https://open.spotify.com/track/…" },
        { key: "song.title", label: "Song name", type: "text", max: 50 },
        { key: "song.note", label: "Note about it", type: "text", max: 60 },
        { key: "photos.cover", label: "Album cover photo", type: "photo" },
        { key: "photos.end", label: "Closing stamp photo", type: "photo" } ] }
    ],
    mixtape: [
      { group: "The two of you", fields: [
        { key: "a", label: "First name", type: "text", max: 30 }, { key: "b", label: "Second name", type: "text", max: 30 },
        { key: "tagline", label: "On the tag (e.g. my favourite person)", type: "text", max: 40 },
        { key: "date", label: "The day it all began (first date, anniversary…)", type: "date" },
        { key: "place", label: "Where it began", type: "text", max: 60 },
        { key: "photos.hero", label: "Main photo (in the gingham frame)", type: "photo" },
        { key: "photos.hero2", label: "Photo that comes out of the camera", type: "photo" } ] },
      { group: "Where it started", fields: [
        { key: "photos.first", label: "First-date photo", type: "photo" },
        { key: "firstDate", label: "On the ticket: what you did", type: "text", max: 40 },
        { key: "firstNote", label: "Handwritten line", type: "text", max: 140 },
        { key: "words", label: "Words on the red band (separate with commas)", type: "text", max: 160 },
        { key: "countdown", label: "Show how many days you've been together", type: "toggle" } ] },
      { group: "Our film", fields: [
        { key: "filmIntro", label: "Intro line", type: "text", max: 90 },
        PHOTO_LIST("moments", "Photos on the film strips (4 per strip)", 8) ] },
      { group: "Mixtape", fields: [
        { key: "song.url", label: "Spotify song or playlist link", type: "text", max: 300, placeholder: "https://open.spotify.com/track/…" },
        { key: "song.title", label: "Written on the cassette", type: "text", max: 50 },
        { key: "song.note", label: "Second line on the cassette", type: "text", max: 50 },
        { key: "photos.cover", label: "Photo in the middle of the record", type: "photo" },
        { key: "tracks", label: "Tracklist", type: "strings", max: 8, item: "Song", add: "Add a song", itemMax: 60 } ] },
      { group: "Things I love about you", fields: [
        { key: "love", label: "Pinned notes", type: "strings", max: 9, item: "Something you love about them", add: "Add a note", itemMax: 90 } ] },
      { group: "For the hard days", fields: [
        { key: "sorry", label: "Shown when they mend the broken heart", type: "area", max: 300 },
        { key: "openWhen", label: "Open when…", type: "list", max: 6, add: "Add a note", of: [{ key: "when", label: "Open when…", type: "text", max: 30 }, { key: "msg", label: "Note inside", type: "area", max: 200 }] } ] },
      { group: "The letter", fields: [
        { key: "greeting", label: "Greeting", type: "text", max: 40 },
        { key: "letter", label: "Your letter (leave a blank line between paragraphs)", type: "area", max: 2000 },
        { key: "sign", label: "Signed", type: "text", max: 40 },
        { key: "photos.end", label: "Closing photo", type: "photo" } ] }
    ]
    ,
    wedding: [
      { group: "The couple", fields: [
        { key: "a", label: "Bride's or first name", type: "text", max: 30 }, { key: "b", label: "Groom's or second name", type: "text", max: 30 },
        { key: "invite", label: "Line above the names", type: "text", max: 60 },
        { key: "tagline", label: "Line below the names", type: "text", max: 80 },
        { key: "date", label: "Wedding date and time", type: "date" },
        { key: "city", label: "City", type: "text", max: 40 },
        { key: "hashtag", label: "Wedding hashtag (optional)", type: "text", max: 40 },
        { key: "photos.hero", label: "Main photo of the couple", type: "photo" },
        { key: "countdown", label: "Show the countdown to the wedding", type: "toggle" } ] },
      { group: "Families", fields: [
        { key: "blessing", label: "Line above the family names", type: "text", max: 60 },
        { key: "familyA", label: "Bride's parents", type: "text", max: 90 },
        { key: "familyB", label: "Groom's parents", type: "text", max: 90 },
        { key: "note", label: "A short note to your guests", type: "area", max: 300 },
        { key: "photos.couple", label: "Photo beside the note", type: "photo" } ] },
      { group: "Events", fields: [
        { key: "events", label: "Functions (Haldi, Mehendi, Sangeet, Wedding…)", type: "list", max: 8, add: "Add a function", of: [
          { key: "name", label: "Function", type: "text", max: 40 }, { key: "when", label: "Date and time", type: "date" },
          { key: "venue", label: "Venue and address", type: "text", max: 120 },
          { key: "map", label: "Google Maps link (optional)", type: "text", max: 300, placeholder: "https://maps.app.goo.gl/…" },
          { key: "dress", label: "Dress code (optional)", type: "text", max: 50 } ] } ] },
      { group: "Your story & photos", fields: [
        { key: "showStory", label: "Show this section", type: "toggle" },
        { key: "storyTitle", label: "Heading", type: "text", max: 40 },
        { key: "story", label: "Your story (leave a blank line between paragraphs)", type: "area", max: 900 },
        { key: "momentsTitle", label: "Heading above the photos", type: "text", max: 50 },
        PHOTO_LIST("moments", "Photos", 8) ] },
      { group: "RSVP on WhatsApp", fields: [
        { key: "showRsvp", label: "Show this section", type: "toggle" },
        { key: "rsvpTitle", label: "Heading", type: "text", max: 40 },
        { key: "rsvpBy", label: "Reply-by line", type: "text", max: 60 },
        { key: "contacts", label: "Who should guests reply to?", type: "list", max: 4, add: "Add a person", of: [
          { key: "name", label: "Name (and side)", type: "text", max: 40 }, { key: "phone", label: "WhatsApp number (10 digits)", type: "text", max: 15, placeholder: "98290 12345" } ] } ] },
      { group: "Good to know & closing", fields: [
        { key: "showInfo", label: "Show travel and stay notes", type: "toggle" },
        { key: "infoTitle", label: "Heading", type: "text", max: 40 },
        { key: "info", label: "Notes for guests", type: "strings", max: 6, item: "Note", add: "Add a note", itemMax: 160 },
        { key: "closing", label: "Closing line", type: "text", max: 40 },
        { key: "sign", label: "Signed", type: "text", max: 60 },
        { key: "photos.end", label: "Closing photo", type: "photo" } ] }
    ]
  };
  const NAMES = { wildflower: "Wildflower", candlelit: "Red Letter", mixtape: "Mixtape", wedding: "Wedding invitation" };
  const HINTS = { wildflower: "A pressed-flower scrapbook of your story", candlelit: "A wine-red love letter: stamps, playing cards and a heart round your date", mixtape: "Gingham, film strips and a mixtape for your favourite person", wedding: "One link for every guest: all the functions, maps, RSVP on WhatsApp and a countdown" };

  // ---------- helpers ----------
  const str = (v, n) => String(v == null ? "" : v).slice(0, n || 4000);
  function img(u) {
    u = String(u || "").trim();
    if (/^\/api\/img\?id=[a-z0-9]{6,16}$/i.test(u) || /^\/assets\/[\w\/-]+\.(webp|png|jpe?g)$/i.test(u) || /^https:\/\/[^\s"'<>()]+$/i.test(u)) return u;
    return "";
  }
  function link(u) { u = String(u || "").trim(); return /^https:\/\/[^\s"'<>]+$/i.test(u) ? u : ""; }
  function spotify(u) {
    const m = /^https:\/\/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(track|album|playlist|episode)\/([A-Za-z0-9]{10,40})/.exec(String(u || "").trim());
    return m ? { src: `https://open.spotify.com/embed/${m[1]}/${m[2]}?theme=0`, h: m[1] === "track" ? 152 : 352 } : null;
  }
  function date(v) { const d = new Date(String(v || "")); return isNaN(d) ? new Date("2021-03-12T18:30") : d; }
  // time since the date (or until it, if it's still ahead)
  function since(d, now) {
    let s = Math.floor(((now || Date.now()) - d) / 1000); const ahead = s < 0; s = Math.abs(s);
    const days = Math.floor(s / 86400); s %= 86400;
    return { ahead, days, hours: Math.floor(s / 3600), minutes: Math.floor(s % 3600 / 60), seconds: s % 60 };
  }
  // A 10-digit Indian mobile (with or without +91) as wa.me digits; "" if it isn't one.
  const waNum = v => { const d = String(v || "").replace(/\D/g, "").replace(/^0+/, ""); const n = d.length === 12 && d.startsWith("91") ? d.slice(2) : d; return /^[6-9]\d{9}$/.test(n) ? "91" + n : ""; };
  const roman = n => ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"][n] || String(n + 1);
  const paras = t => str(t, 6000).split(/\n\s*\n/).map(x => x.trim()).filter(Boolean);
  const words = t => str(t, 300).split(",").map(x => x.trim()).filter(Boolean).slice(0, 14);
  const fmt = {
    long: d => `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
    dots: d => `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`,
    monthYear: d => `${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
    month: d => MONTHS[d.getMonth()]
  };
  function setText(root, sel, v) { root.querySelectorAll(sel).forEach(e => e.textContent = str(v, 4000)); }
  function setImg(el, u) { const s = img(u); if (!el) return; if (s) { el.src = s; el.hidden = false; el.closest(".pic,.pf,figure")?.classList.remove("empty"); } else { el.removeAttribute("src"); el.closest(".pic,.pf,figure")?.classList.add("empty"); } }
  function get(o, path) { return path.split(".").reduce((a, k) => (a == null ? a : a[k]), o); }
  function set(o, path, v) { const ks = path.split("."); let c = o; ks.slice(0, -1).forEach(k => { if (typeof c[k] !== "object" || c[k] == null) c[k] = {}; c = c[k]; }); c[ks[ks.length - 1]] = v; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  // fill any fields missing from older saves with the demo's values
  function withDefaults(tpl, d) {
    const base = clone(DEMO[tpl]);
    const merge = (a, b) => { Object.keys(b || {}).forEach(k => { if (b[k] && typeof b[k] === "object" && !Array.isArray(b[k]) && a[k] && typeof a[k] === "object") merge(a[k], b[k]); else if (b[k] !== undefined) a[k] = b[k]; }); return a; };
    return merge(base, d || {});
  }

  // Run a template: customer data (from /s/:id), else the demo. Live-update from the builder.
  function boot(tpl, render) {
    const preview = /[?&]preview=1/.test(location.search);
    document.documentElement.classList.toggle("ks-preview", preview);
    const first = window.KS_DATA ? withDefaults(tpl, window.KS_DATA) : clone(DEMO[tpl]);
    render(first, true);
    if (window.KS_META && window.KS_META.ownerPreview) {
      const b = document.createElement("div");
      b.style.cssText = "position:sticky;top:0;z-index:200;background:#d6b06a;color:#2a0409;padding:10px 14px;text-align:center;font:600 14px/1.4 system-ui,sans-serif";
      b.append("Preview: only you can see this until it’s activated. ");
      const a = document.createElement("a"); a.href = "/builder?edit=" + encodeURIComponent(window.KS_META.id) + "#publish"; a.textContent = "Activate it"; a.style.color = "#2a0409"; b.append(a);
      document.body.prepend(b);
    }
    // Anyone can report a public keepsake page.
    if (window.KS_META && window.KS_META.id && !preview && !window.KS_META.ownerPreview) {
      const cr = document.querySelector(".credit");
      if (cr) { const r = document.createElement("a"); r.href = "/contact?report=" + encodeURIComponent(window.KS_META.id); r.textContent = "Report"; r.rel = "nofollow"; cr.append(" · ", r); }
    }
    if (preview) window.addEventListener("message", e => {
      if (e.origin !== location.origin || !e.data || e.data.type !== "ks-preview") return;
      render(withDefaults(tpl, e.data.data), false);
    });
  }

  window.KSKit = { DEMO, FIELDS, NAMES, HINTS, PHOTOS: P, img, link, spotify, date, roman, paras, words, fmt, since, str, waNum, setText, setImg, get, set, clone, withDefaults, boot };
})();
