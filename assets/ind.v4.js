/* Business-type pages: live example inside the phone (loads when near the screen), sized to its frame. */
(function () {
  const DOC = d => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=375"><style>html,body{margin:0}body{padding-top:36px}</style>
<script src="/assets/biz.v15.js"><\/script><script src="/assets/biz-demos.v5.js"><\/script></head><body><main id="b"></main><script>
var D=${JSON.stringify(d)};var d=D.demo&&KSBizDemos[D.demo]?JSON.parse(JSON.stringify(KSBizDemos[D.demo])):Object.assign(KSBiz.blank(D.cat||""),KSBizDemos[D.base||"clinic"]||{},D.data||{});
var b=document.getElementById("b");KSBiz.render(b,d,{preview:true});document.body.style.background=getComputedStyle(b).getPropertyValue("--bg");if(D.y)setTimeout(function(){scrollTo(0,(document.body.scrollHeight-innerHeight)*D.y)},400);<\/script></body></html>`;
  const fit = f => { const s = f.parentNode; f.style.transform = "scale(" + (s.clientWidth / 375) + ")"; f.style.height = Math.ceil(s.clientHeight * 375 / s.clientWidth) + "px"; };
  const load = f => { if (f.dataset.ld) return; f.dataset.ld = "1"; let o = {}; try { o = JSON.parse(f.dataset.live); } catch (e) {} f.srcdoc = DOC(o); };
  const frames = [...document.querySelectorAll("iframe[data-live]")];
  frames.forEach(fit); addEventListener("resize", () => frames.forEach(fit));
  let io = null; try { io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { load(e.target); io.unobserve(e.target); } }), { rootMargin: "400px" }); } catch (e) {}
  frames.forEach(f => io ? io.observe(f) : load(f));
  // close the Businesses menu when clicking elsewhere
  document.addEventListener("click", e => document.querySelectorAll(".nv details[open]").forEach(d => { if (!d.contains(e.target)) d.open = false; }));
})();
