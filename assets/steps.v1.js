/* "Three steps" scroll story on /shops: the pinned phone shows the step that is in view. Desktop only (CSS hides it on phones). */
(() => {
  const s = document.querySelector(".stor"); if (!s) return;
  const items = [...s.querySelectorAll(".stp-i")];
  const set = i => { s.dataset.a = i; items.forEach((e, k) => e.classList.toggle("on", k === i)); };
  set(0);
  if (!("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver(es => { es.forEach(e => { if (e.isIntersecting) set(items.indexOf(e.target)); }); }, { rootMargin: "-45% 0px -45% 0px" });
  items.forEach(e => io.observe(e));
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  items.forEach(e => e.addEventListener("click", () => e.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "center" })));
})();
