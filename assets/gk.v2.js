/* GetKeepsake for Business · motion, calm version. Content fades in softly once as it comes into view.
   No parallax, no spinning, no moving buttons, no scroll bar, no hiding nav. Nothing moves for reduced-motion users. */
(function () {
  const root = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const show = () => root.classList.remove("gkm");
  const ready = fn => document.readyState === "loading" ? addEventListener("DOMContentLoaded", fn) : fn();
  ready(() => {
    const nav = document.querySelector("[data-gk-nav]");
    if (nav) addEventListener("scroll", () => nav.classList.toggle("gk-sh", scrollY > 10), { passive: true });
    if (reduce || !("IntersectionObserver" in window)) { show(); return; }
    // hero: one gentle fade-up, all together
    const hero = document.querySelectorAll("[data-gk-h1],[data-gk-in],[data-gk-rise],[data-gk-pop]");
    hero.forEach(e => e.classList.add("gk-f")); show();
    requestAnimationFrame(() => requestAnimationFrame(() => hero.forEach(e => e.classList.add("gk-v"))));
    // the rest: fade in once when it scrolls into view (anything already on screen just shows)
    // (also anything you scrolled past quickly, so nothing is ever left invisible)
    let wait = [...document.querySelectorAll("[data-gk-h2],[data-gk-st]")].filter(e => e.getBoundingClientRect().top >= innerHeight);
    wait.forEach(e => e.classList.add("gk-f"));
    let tick = 0;
    const check = () => { tick = 0; const lim = innerHeight * .94; wait = wait.filter(e => { if (e.getBoundingClientRect().top < lim) { e.classList.add("gk-v"); return false; } return true; }); if (!wait.length) removeEventListener("scroll", onS); };
    const onS = () => { if (!tick) tick = requestAnimationFrame(check); };
    addEventListener("scroll", onS, { passive: true }); addEventListener("resize", onS);
  });
})();
