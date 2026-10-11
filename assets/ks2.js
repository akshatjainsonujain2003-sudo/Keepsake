(()=>{
 const rm=matchMedia("(prefers-reduced-motion: reduce)").matches;

 // mobile menu
 const mb=document.querySelector(".menu-btn"),mn=document.getElementById("menu");
 if(mb&&mn){
  mb.addEventListener("click",()=>{const o=mn.classList.toggle("open");mb.setAttribute("aria-expanded",o)});
  mn.addEventListener("click",e=>{if(e.target.closest("a")){mn.classList.remove("open");mb.setAttribute("aria-expanded","false")}});
 }

 // how it works: tabs that change the phone screen
 const tabs=[...document.querySelectorAll(".stepbtn")],layers=[...document.querySelectorAll(".pscreen .layer")];
 if(tabs.length&&layers.length){
  let cur=0,timer=null;
  const show=(i,still)=>{
   cur=i;
   tabs.forEach((t,j)=>{t.setAttribute("aria-selected",j===i);t.classList.toggle("still",!!still)});
   layers.forEach((l,j)=>l.classList.toggle("on",j===i));
  };
  tabs.forEach((t,i)=>t.addEventListener("click",()=>{clearInterval(timer);show(i,true)}));
  if(!rm)timer=setInterval(()=>show((cur+1)%tabs.length),6000);
 }

 // a design card grows to fill the screen, then the studio opens
 document.addEventListener("click",e=>{
  const a=e.target.closest("a.gcard,a.mcard");
  if(!a||rm||e.metaKey||e.ctrlKey||e.shiftKey||e.button)return;
  const img=a.querySelector("img");if(!img)return;
  e.preventDefault();
  const r=img.getBoundingClientRect(),c=img.cloneNode();
  c.className="grow";c.removeAttribute("loading");
  Object.assign(c.style,{left:r.left+"px",top:r.top+"px",width:r.width+"px",height:r.height+"px",borderRadius:"22px"});
  document.body.appendChild(c);c.getBoundingClientRect();
  Object.assign(c.style,{left:"0",top:"0",width:"100vw",height:"100vh",borderRadius:"0"});
  setTimeout(()=>{location.href=a.href},480);
 });
 addEventListener("pageshow",()=>document.querySelectorAll(".grow").forEach(x=>x.remove()));
})();
