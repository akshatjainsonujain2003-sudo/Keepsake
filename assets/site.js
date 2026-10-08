(()=>{
 const rm=matchMedia("(prefers-reduced-motion: reduce)").matches;
 // 1) sections flow in as you scroll
 if("IntersectionObserver" in window&&!rm){
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target)}}),{threshold:.1});
  document.querySelectorAll("main .card,main h1,main h2,main .lead,main details,main .phone,main .demo,main .row").forEach(el=>{
   el.classList.add("rv");el.style.transitionDelay=Math.min([...el.parentNode.children].indexOf(el),6)*70+"ms";io.observe(el)});
 }
 // 2) a design card grows to fill the screen, then the studio opens
 document.addEventListener("click",e=>{
  const a=e.target.closest("a.card.pic");if(!a||rm||e.metaKey||e.ctrlKey||e.shiftKey||e.button)return;
  const img=a.querySelector("img");if(!img)return;e.preventDefault();
  const r=img.getBoundingClientRect(),c=img.cloneNode();c.className="grow";c.removeAttribute("loading");
  Object.assign(c.style,{left:r.left+"px",top:r.top+"px",width:r.width+"px",height:r.height+"px",borderRadius:"20px"});
  document.body.appendChild(c);c.getBoundingClientRect();
  Object.assign(c.style,{left:"0",top:"0",width:"100vw",height:"100vh",borderRadius:"0"});
  setTimeout(()=>{location.href=a.href},480);
 });
 addEventListener("pageshow",()=>document.querySelectorAll(".grow").forEach(x=>x.remove()));
})();
