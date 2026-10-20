/* Business-type pages: hero video respects reduced motion; Businesses menu closes on outside click. */
(function () {
  const v = document.querySelector(".hv");
  if (v) {
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    const set = () => { if (mq.matches) { v.pause(); v.removeAttribute("autoplay"); } else v.play().catch(() => {}); };
    set(); mq.addEventListener && mq.addEventListener("change", set);
    // pause while off screen to save battery
    try { new IntersectionObserver(es => { if (mq.matches) return; es[0].isIntersecting ? v.play().catch(() => {}) : v.pause(); }).observe(v); } catch (e) {}
  }
  document.addEventListener("click", e => document.querySelectorAll(".nv details[open]").forEach(d => { if (!d.contains(e.target)) d.open = false; }));
})();
