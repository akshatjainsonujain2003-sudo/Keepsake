// Admin analytics for GetKeepsake for Gifts (love-story websites + memory cards).
const db = require("./_db");
const DAY=864e5, IST=5.5*36e5;
const dayKey=t=>new Date(t+IST).toISOString().slice(0,10);
const startOfDay=t=>{const d=new Date(t+IST);d.setUTCHours(0,0,0,0);return d.getTime()-IST;};
async function mget(keys){const out=[];for(let i=0;i<keys.length;i+=200)out.push(...await db.cmd("MGET",...keys.slice(i,i+200)));return out.map(v=>{try{return v?JSON.parse(v):null;}catch(e){return null;}});}
async function scan(pattern,cap=5000){let cur="0",keys=[];do{const r=await db.cmd("SCAN",cur,"MATCH",pattern,"COUNT",500);cur=String(r[0]);keys.push(...r[1]);}while(cur!=="0"&&keys.length<cap);return [...new Set(keys)];}
const isGift=o=>!!o&&(o.kind==="site"||o.kind==="card");
async function orders(limit=4000){const ids=await db.cmd("ZRANGE","orders-paid",0,limit-1,"REV"),os=await mget(ids.map(id=>"order:"+id));return ids.map((id,i)=>os[i]&&{id,...os[i]}).filter(isGift);}
async function summary(){
 const os=await orders(),now=Date.now(),today=startOfDay(now),since=from=>os.filter(o=>(+o.paidAt||0)>=from),rev=rows=>rows.reduce((n,o)=>n+(+o.amount||0),0);
 const days=Array.from({length:30},(_,i)=>{const t=today-(29-i)*DAY;return{d:dayKey(t),v:0,n:0};}),ix=Object.fromEntries(days.map((d,i)=>[d.d,i]));
 for(const o of os){const i=ix[dayKey(+o.paidAt||0)];if(i!==undefined){days[i].v+=+o.amount||0;days[i].n++;}}
 const mix={site:{n:0,rev:0},card:{n:0,rev:0}};for(const o of os){mix[o.kind].n++;mix[o.kind].rev+=+o.amount||0;}
 const referred=os.filter(o=>o.ref),owners=new Set(os.map(o=>o.owner).filter(Boolean));
 return{today:{n:since(today).length,rev:rev(since(today))},week:{n:since(today-6*DAY).length,rev:rev(since(today-6*DAY))},month:{n:since(today-29*DAY).length,rev:rev(since(today-29*DAY))},all:{n:os.length,rev:rev(os),limited:os.length>=4000},mix,days,customers:owners.size,referral:{n:referred.length,rev:rev(referred)},unattributed:{n:os.length-referred.length,rev:rev(os.filter(o=>!o.ref))},recent:os.slice(0,8)};
}
async function pages(){
 const keys=(await scan("customer-memory:*")).filter(k=>/^customer-memory:[a-z0-9]{8,16}$/i.test(k)),ms=await mget(keys),keep=keys.map((k,i)=>ms[i]&&(ms[i].kind==="site"||ms[i].kind==="card"));
 const ids=keys.filter((k,i)=>keep[i]).map(k=>k.slice(16)),rows=ms.filter((m,i)=>keep[i]),views=await db.cmd("MGET",...(ids.length?ids.map(id=>"customer-memory-views:"+id):["-"]));
 const owners=[...new Set(rows.map(m=>m.owner).filter(Boolean))],us=await mget(owners.map(id=>"customer:"+id)),U=Object.fromEntries(owners.map((id,i)=>[id,us[i]||{}]));
 return ids.map((id,i)=>{const m=rows[i],u=U[m.owner]||{};return{id,kind:m.kind,title:m.title||"Untitled keepsake",owner_id:m.owner||"",owner:{name:u.name||m.ownerName||"",email:u.email||"",phone:u.phone||""},created:+m.created||0,updated:+m.updated||+m.created||0,views:+views[i]||0,live:m.paid!==false,plan:m.plan||"",url:(m.kind==="site"?"/s/":"/m/")+id};}).sort((a,b)=>b.updated-a.updated);
}
async function people(){
 const keys=(await scan("customer:*")).filter(k=>/^customer:[a-f0-9]{16,128}$/.test(k)),us=await mget(keys),[os,ps]=await Promise.all([orders(),pages()]),spend={},count={};
 for(const o of os){if(o.owner){spend[o.owner]=(spend[o.owner]||0)+(+o.amount||0);count[o.owner]=(count[o.owner]||0)+1;}}
 return keys.map((k,i)=>{const u=us[i];if(!u)return null;const id=k.slice(9),mine=ps.filter(p=>p.owner_id===id);if(!mine.length&&!spend[id])return null;return{id,name:u.name||"",email:u.email||"",phone:u.phone||"",created:+u.created||0,spent:spend[id]||0,orders:count[id]||0,pages:mine.length,live:mine.filter(p=>p.live).length};}).filter(Boolean).sort((a,b)=>b.created-a.created);
}
module.exports={summary,orders,pages,people};