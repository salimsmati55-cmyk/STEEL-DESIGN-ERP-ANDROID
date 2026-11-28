import { WorkshopRepository } from "./repository.js";

const $ = (s, root=document) => root.querySelector(s);
let activeDraft = null;
let currentCanvas = null;
const uid = () => "ATT-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2,7);

function renderGrid(ctx, w, h) {
  ctx.fillStyle = "#fff"; ctx.fillRect(0,0,w,h);
  for (let x=0;x<=w;x+=10) { ctx.beginPath(); ctx.strokeStyle=x%50===0?"#cbd5e1":"#edf1f5"; ctx.lineWidth=x%50===0?1.2:.6; ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke(); }
  for (let y=0;y<=h;y+=10) { ctx.beginPath(); ctx.strokeStyle=y%50===0?"#cbd5e1":"#edf1f5"; ctx.lineWidth=y%50===0?1.2:.6; ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }
}
function paint(canvas, strokes) {
  const ctx=canvas.getContext("2d"); renderGrid(ctx,canvas.width,canvas.height);
  for (const stroke of strokes) { if(!stroke.points.length)continue; ctx.beginPath();ctx.strokeStyle=stroke.color||"#172f52";ctx.lineWidth=stroke.width||3;ctx.lineCap="round";ctx.lineJoin="round";stroke.points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke(); }
}
function attachKroki(form) {
  if (form.dataset.krokiReady) return;
  form.dataset.krokiReady="1";
  const host=document.createElement("section"); host.className="kroki-panel";
  host.innerHTML=`
    <div class="kroki-heading"><b>الكروكي والرسم الهندسي</b><span>رسم صغير قابل للتكبير</span></div>
    <div class="kroki-tools">
      <button type="button" data-k="undo">تراجع</button><button type="button" data-k="clear">مسح</button>
      <button type="button" data-k="zoomout">−</button><button type="button" data-k="zoomin">+</button>
      <button type="button" data-k="expand">تكبير</button>
      <button type="button" data-k="camera">تصوير النموذج</button>
    </div>
    <div class="kroki-canvas-wrap"><canvas class="kroki-canvas" width="1000" height="560" aria-label="مساحة رسم الكروكي"></canvas></div>
    <div class="kroki-hint">ارسم بإصبعك أو قلم S Pen. الخلفية مليمترية ويمكنك التكبير عند الحاجة.</div>
    <input class="kroki-camera" type="file" accept="image/*" capture="environment" hidden>
    <div class="kroki-photos"></div>`;
  const notes=form.querySelector('[name="notes"]')?.closest(".field");
  if(notes) notes.insertAdjacentElement("afterend",host); else form.prepend(host);
  const canvas=$(".kroki-canvas",host),ctx=canvas.getContext("2d");
  let strokes=[], active=null, zoom=1, photos=[];
  paint(canvas,strokes); currentCanvas=canvas;
  const point=e=>{const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height};};
  canvas.addEventListener("pointerdown",e=>{e.preventDefault();canvas.setPointerCapture(e.pointerId);active={points:[point(e)],color:"#172f52",width:4};strokes.push(active);paint(canvas,strokes);});
  canvas.addEventListener("pointermove",e=>{if(!active)return;active.points.push(point(e));paint(canvas,strokes);});
  const stop=()=>{active=null;};canvas.addEventListener("pointerup",stop);canvas.addEventListener("pointercancel",stop);
  const photoInput=$(".kroki-camera",host);
  function showPhotos(){const area=$(".kroki-photos",host);area.innerHTML=photos.map((p,i)=>'<div class="kroki-photo"><img alt="صورة النموذج '+(i+1)+'" src="'+p+'"><button type="button" data-remove-photo="'+i+'">×</button></div>').join("");area.querySelectorAll("[data-remove-photo]").forEach(b=>b.onclick=()=>{photos.splice(Number(b.dataset.removePhoto),1);showPhotos();});}
  photoInput.addEventListener("change",async()=>{for(const file of [...photoInput.files||[]]){if(!file.type.startsWith("image/"))continue;const data=await new Promise(resolve=>{const fr=new FileReader();fr.onload=()=>resolve(fr.result);fr.readAsDataURL(file);});photos.push(await compressImage(data));}showPhotos();photoInput.value="";});
  host.querySelectorAll("[data-k]").forEach(b=>b.addEventListener("click",()=>{
    const action=b.dataset.k;
    if(action==="undo"){strokes.pop();paint(canvas,strokes);}
    if(action==="clear"){strokes=[];paint(canvas,strokes);}
    if(action==="zoomin"||action==="zoomout"){zoom=Math.max(.75,Math.min(2.5,zoom+(action==="zoomin"?.25:-.25)));canvas.style.transform="scale("+zoom+")";canvas.style.transformOrigin="top center";}
    if(action==="expand"){host.classList.toggle("kroki-expanded");b.textContent=host.classList.contains("kroki-expanded")?"تصغير":"تكبير";}
    if(action==="camera")photoInput.click();
  }));
  form.addEventListener("submit",()=>{
    const drawing=strokes.length?canvas.toDataURL("image/png"):"";
    activeDraft={drawing,photos:[...photos],createdAt:new Date().toISOString()};
  },true);
}
function compressImage(dataUrl,maxSide=1500,quality=.78){
  return new Promise(resolve=>{const img=new Image();img.onload=()=>{const scale=Math.min(1,maxSide/Math.max(img.width,img.height));const c=document.createElement("canvas");c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);c.getContext("2d").drawImage(img,0,0,c.width,c.height);resolve(c.toDataURL("image/jpeg",quality));};img.onerror=()=>resolve(dataUrl);img.src=dataUrl;});
}

const originalCommit=WorkshopRepository.prototype.commitCommand;
WorkshopRepository.prototype.commitCommand=async function(command={}){
  if(activeDraft && command.writes?.some(x=>x.store==="jobs")){
    const writes=[...command.writes], jobWrite=writes.find(x=>x.store==="jobs"), job=structuredClone(jobWrite.record);
    const ids=[];
    const add=(type,data,index)=>{if(!data)return;const id=uid();ids.push(id);writes.push({store:"attachments",record:{id,ownerId:job.id,jobId:job.id,itemId:job.items[index]?.id??null,type,dataUrl:data,name:type==="sketch"?"KROKI":"صورة النموذج",createdAt:activeDraft.createdAt}});};
    job.items.forEach((item,index)=>{if(index===0){if(activeDraft.drawing){add("sketch",activeDraft.drawing,index);}for(const p of activeDraft.photos)add("photo",p,index);}});
    job.attachmentIds=[...(job.attachmentIds||[]),...ids];
    job.items.forEach(item=>{item.sketchAttachmentIds=[...(item.sketchAttachmentIds||[]),...ids];});
    jobWrite.record=job;command={...command,writes};
    window.__V10_LAST_ATTACHMENT_IDS=ids;
  }
  const result=await originalCommit.call(this,command);
  if(command.writes?.some(x=>x.store==="jobs"))activeDraft=null;
  return result;
};

const observer=new MutationObserver(()=>{
  const form=$("#jobForm");if(form)attachKroki(form);
});
observer.observe(document.body,{childList:true,subtree:true});


async function readJobAttachments(jobId){
  const db=await WorkshopRepository.open();
  try{return await db.list("attachments",{index:"by-owner",query:IDBKeyRange.only(jobId),limit:100});}
  finally{db.close();}
}
const detailObserver=new MutationObserver(async()=>{
  const title=$("#modalTitle"),body=$("#modalBody");
  if(!title||!body||!title.textContent.startsWith("ملف العمل "))return;
  const jobId=title.textContent.replace("ملف العمل ","").trim();
  if(!jobId||body.querySelector("[data-v10-attachments]"))return;
  try{
    const rows=await readJobAttachments(jobId);if(!rows.length)return;
    const section=document.createElement("section");section.className="panel";section.dataset.v10Attachments="1";
    section.innerHTML="<h3>الكروكي وصور النموذج</h3><div class='v10-attachment-grid'>"+rows.map(a=>"<figure><img alt='"+(a.type==="sketch"?"الكروكي":"صورة النموذج")+"' src='"+a.dataUrl+"'><figcaption>"+(a.type==="sketch"?"الكروكي":"صورة النموذج")+"</figcaption></figure>").join("")+"</div>";
    body.append(section);
  }catch(error){console.warn("V10 attachments preview unavailable",error);}
});
detailObserver.observe($("#modalBody"),{childList:true,subtree:true});
document.addEventListener("click",async event=>{
  const button=event.target.closest("#printOF");if(!button)return;
  const title=$("#modalTitle"),jobId=title?.textContent.replace("ملف العمل ","").trim();
  if(!jobId)return;
  const rows=await readJobAttachments(jobId);
  if(!rows.length)return;
  event.preventDefault();event.stopImmediatePropagation();
  const db=await WorkshopRepository.open();
  let job;try{job=await db.get("jobs",jobId);}finally{db.close();}
  if(!job)return;
  const win=window.open("","_blank");if(!win){alert("اسمح بفتح نافذة الطباعة.");return;}
  const labels={laser:"قص ليزر",shear:"قص مقص",bending:"ثني",assembly:"تجميع",finishing:"تشطيب",custom:"خدمة خاصة"};
  const items=job.items.map(item=>"<section><h3>"+item.description+"</h3><p>المادة: "+(item.material||"—")+" · السماكة: "+(item.thicknessMm??"—")+" mm · الأبعاد: "+(item.dimensionsMm||"—")+" · الكمية: "+item.quantity+"</p><p>العمليات: "+item.operations.map(op=>labels[op.code]||op.code).join(" ← ")+"</p></section>").join("");
  const attachments=rows.map(a=>"<h3>"+(a.type==="sketch"?"الكروكي الهندسي":"صورة النموذج")+"</h3><img src='"+a.dataUrl+"'>").join("");
  win.document.write("<html lang='ar' dir='rtl'><meta charset='utf-8'><title>أمر تصنيع OF</title><style>body{font-family:Tahoma;padding:22px;color:#182536}h1{text-align:center;font-size:22px}section{border:1px solid #ddd;padding:12px;margin:12px 0}img{max-width:100%;max-height:65vh;object-fit:contain;display:block;margin:12px auto;border:1px solid #ddd}p{line-height:1.8}</style><h1>STEEL DESIGN ERP · أمر تصنيع OF</h1><p>المرجع: "+job.id+" · الزبون: "+job.customerName+"</p><p>تاريخ التسليم: "+(job.dueAt||"—")+"</p>"+items+"<p>ملاحظات: "+(job.notes||"—")+"</p><h2>الكروكي وصور النموذج</h2>"+attachments+"<script>window.onload=()=>window.print()<\\/script></html>");
  win.document.close();
},true);
