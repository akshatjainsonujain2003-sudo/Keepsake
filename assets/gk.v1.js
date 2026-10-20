/* GetKeepsake for Business · motion. One signature moment (headlines rise out of a mask, the script word writes itself),
   everything else quiet. Transform/opacity only; nothing runs for people who prefer reduced motion. */
(function () {
  const root = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const show = () => root.classList.remove("gkm");
  setTimeout(show, 2500); // never leave the headline hidden if the library fails to load
  const ready = fn => document.readyState === "loading" ? addEventListener("DOMContentLoaded", fn) : fn();
  ready(() => {
    // nav: hide on scroll down, show on scroll up
    const nav = document.querySelector("[data-gk-nav]");
    if (nav) { let last = scrollY; addEventListener("scroll", () => { const y = scrollY; nav.classList.toggle("gk-sh", y > 10); if (!reduce) nav.classList.toggle("gk-hide", y > last && y > 160 && !nav.querySelector("details[open]")); last = y; }, { passive: true }); }
    if (reduce || !window.gsap || !window.ScrollTrigger) { show(); return; }
    gsap.registerPlugin(ScrollTrigger); root.classList.add("gk-on");
    const E = "power3.out";
    // progress bar
    const bar = document.createElement("div"); bar.className = "gk-pg"; document.body.appendChild(bar);
    gsap.to(bar, { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: .3 } });
    // split a headline into masked lines at its <br>s
    const split = h => { const parts = h.innerHTML.split(/<br\s*\/?>/i); h.innerHTML = parts.map(p => `<span class="gk-ln"><span class="gk-li">${p}</span></span>`).join(""); return h.querySelectorAll(".gk-li"); };
    const wipe = el => gsap.fromTo(el, { clipPath: "inset(-20% 100% -40% 0)" }, { clipPath: "inset(-20% 0% -40% 0)", duration: 1.1, ease: "power2.inOut" });
    // hero
    const h1 = document.querySelector("[data-gk-h1]");
    const tl = gsap.timeline({ defaults: { ease: E } });
    if (h1) {
      const lines = split(h1); const sc = h1.querySelector(".s"); if (sc) gsap.set(sc, { clipPath: "inset(-20% 100% -40% 0)" });
      tl.from(lines, { yPercent: 115, duration: 1.15, stagger: .14, delay: .1 });
      if (sc) tl.add(wipe(sc), "-=.45");
      const dot = h1.querySelector(".o"); if (dot) tl.from(dot, { scale: 0, transformOrigin: "50% 80%", duration: .5, ease: "back.out(3)" }, "-=.9");
    }
    const intro = gsap.utils.toArray("[data-gk-in]");
    if (intro.length) tl.from(intro, { y: 22, opacity: 0, duration: .8, stagger: .07 }, h1 ? "-=1.2" : 0);
    const rise = gsap.utils.toArray("[data-gk-rise]");
    if (rise.length) tl.from(rise, { y: 160, opacity: 0, duration: 1.4, stagger: { each: .14, from: "center" }, ease: "power3.out" }, h1 ? .2 : 0);
    const pop = gsap.utils.toArray("[data-gk-pop]");
    if (pop.length) tl.from(pop, { scale: .6, y: 20, opacity: 0, duration: .7, stagger: .25, ease: "back.out(2)" }, h1 ? 1.2 : .6);
    show(); // every hero element now has its starting state set, so it can be revealed without a flash
    // hero phones drift apart a little as you scroll away (desktop)
    ScrollTrigger.matchMedia({ "(min-width: 981px)": () => {
      gsap.utils.toArray("[data-gk-par]").forEach(el => gsap.to(el, { yPercent: +el.dataset.gkPar || -8, ease: "none", scrollTrigger: { trigger: el.closest("section") || el, start: "top top", end: "bottom top", scrub: .6 } }));
    } });
    // section headings: lines rise, the script word writes itself
    gsap.utils.toArray("[data-gk-h2]").forEach(h => {
      const em = h.querySelector("em"); const lines = split(h); const em2 = h.querySelector("em") || em;
      if (em2) gsap.set(em2, { display: "inline-block", clipPath: "inset(-20% 100% -40% 0)" });
      const t = gsap.timeline({ scrollTrigger: { trigger: h, start: "top 85%", once: true } });
      t.from(lines, { yPercent: 110, duration: 1, stagger: .1, ease: E });
      if (em2) t.add(wipe(em2), "-=.5");
    });
    // groups of cards / rows: gentle staggered rise
    ScrollTrigger.batch("[data-gk-st]", { start: "top 88%", once: true, onEnter: b => { b.forEach(e => e.classList.add("gk-anim")); gsap.from(b, { y: 34, opacity: 0, duration: .8, stagger: .08, ease: E, overwrite: true, clearProps: "transform,opacity", onComplete: () => b.forEach(e => e.classList.remove("gk-anim")) }); } });
    // prices count up
    gsap.utils.toArray("[data-gk-count]").forEach(el => ScrollTrigger.create({ trigger: el, start: "top 85%", once: true, onEnter: () => {
      const n = parseInt(el.textContent.replace(/\D/g, ""), 10); if (!n) return; const o = { v: 0 }; // read the price when it comes into view, after the live price has loaded
      gsap.to(o, { v: n, duration: 1.4, ease: "power3.out", onUpdate: () => el.textContent = Math.round(o.v).toLocaleString("en-IN") }); } }));
    // stickers slap on
    gsap.utils.toArray("[data-gk-stk]").forEach(el => gsap.from(el, { scale: 0, rotate: -90, duration: .9, ease: "back.out(2.2)", scrollTrigger: { trigger: el, start: "top 85%", once: true } }));
    // loyalty stamps fill one by one
    gsap.utils.toArray("[data-gk-stamps]").forEach(g => gsap.from(g.querySelectorAll("i"), { scale: 0, duration: .45, stagger: .07, ease: "back.out(2.5)", scrollTrigger: { trigger: g, start: "top 80%", once: true } }));
    // magnetic primary buttons (desktop, pointer only)
    if (matchMedia("(hover: hover) and (pointer: fine)").matches) document.querySelectorAll("[data-gk-mag]").forEach(b => {
      b.classList.add("gk-mag"); const xTo = gsap.quickTo(b, "x", { duration: .4, ease: "power3" }), yTo = gsap.quickTo(b, "y", { duration: .4, ease: "power3" });
      b.addEventListener("pointermove", e => { const r = b.getBoundingClientRect(); xTo((e.clientX - r.left - r.width / 2) * .25); yTo((e.clientY - r.top - r.height / 2) * .35); });
      b.addEventListener("pointerleave", () => { xTo(0); yTo(0); });
    });
    addEventListener("load", () => ScrollTrigger.refresh());
  });
})();
