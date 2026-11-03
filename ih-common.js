/* IH-4 shared helpers for report modules (Noise / CHRA): state, editable tables, Excel, Word & print output */
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const num=v=>{if(v===""||v==null)return null;const n=parseFloat(String(v).replace(",","."));return isFinite(n)?n:null};
const f1=v=>v==null||!isFinite(v)?"–":(Math.round(v*10)/10).toFixed(1);
const listTxt=a=>a.length<=1?(a[0]||""):a.slice(0,-1).join(", ")+" and "+a[a.length-1];
const WORDS=["zero","one","two","three","four","five","six","seven","eight","nine","ten","eleven","twelve","thirteen","fourteen","fifteen","sixteen","seventeen","eighteen","nineteen","twenty"];
const nW=n=>WORDS[n]?`${WORDS[n].replace(/^./,c=>c.toUpperCase())} (${n})`:String(n);
const nw=n=>WORDS[n]?`${WORDS[n]} (${n})`:String(n);
function toast(m,ms=2800){let t=$("#toast");if(!t){t=document.createElement("div");t.id="toast";t.className="toast";document.body.appendChild(t)}t.textContent=m;t.classList.add("show");clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove("show"),ms)}
const Store={load(k,d){try{const v=JSON.parse(localStorage.getItem(k));return v||structuredClone(d)}catch(e){return structuredClone(d)}},
  save(k,v){clearTimeout(this["_"+k]);this["_"+k]=setTimeout(()=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){toast("Browser storage full – download a backup (JSON).")}},250)}};
function download(blob,name){const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500)}
function backupJson(st,name){download(new Blob([JSON.stringify(st,null,1)],{type:"application/json"}),name)}
function readJsonFile(file){return file.text().then(t=>JSON.parse(t))}

/* Bind simple fields: <input data-f="path.to.key"> */
function bindFields(root,obj,onChange){root.querySelectorAll("[data-f]").forEach(el=>{const k=el.dataset.f;el.value=obj[k]??"";
  el.oninput=()=>{obj[k]=el.value;onChange&&onChange(k)}})}

/* Editable table. cols:[{k,h,type:'text'|'num'|'area'|'select',opts,calc:(row)=>html,w}] */
function editTable(el,cols,rows,onChange,opt={}){
  const draw=()=>{el.innerHTML=`<div class="ts"><table><tr>${opt.idx!==false?"<th>#</th>":""}${cols.map(c=>`<th>${esc(c.h)}</th>`).join("")}<th class="noP"></th></tr>${rows.map((r,i)=>`<tr>${opt.idx!==false?`<td>${i+1}</td>`:""}${cols.map(c=>{
      if(c.calc)return`<td class="${c.n?"n":""}" data-cr="${i}" data-cc="${cols.indexOf(c)}">${c.calc(r,i)}</td>`;
      const v=esc(r[c.k]??"");const st=c.w?` style="min-width:${c.w}px"`:"";
      if(c.type==="select")return`<td><select data-r="${i}" data-k="${c.k}"${st}>${c.opts.map(o=>`<option${String(o)===String(r[c.k]??"")?" selected":""}>${esc(o)}</option>`).join("")}</select></td>`;
      if(c.type==="area")return`<td><textarea data-r="${i}" data-k="${c.k}"${st}>${v}</textarea></td>`;
      return`<td><input data-r="${i}" data-k="${c.k}" value="${v}"${c.type==="num"?' inputmode="decimal" style="min-width:64px;max-width:90px"':st}></td>`}).join("")}
      <td class="noP"><button class="sm" data-del="${i}" title="Delete row">✕</button></td></tr>`).join("")}</table></div>
      <div class="row noP" style="margin-top:6px"><button class="sm" data-add>+ Add row</button></div>`;
    el.querySelectorAll("[data-k]").forEach(inp=>{const h=()=>{const ri=+inp.dataset.r;rows[ri][inp.dataset.k]=inp.value;el.querySelectorAll(`[data-cr="${ri}"]`).forEach(td=>td.innerHTML=cols[+td.dataset.cc].calc(rows[ri],ri));onChange&&onChange(false)};inp.oninput=h;inp.onchange=()=>{h();opt.redrawOnChange&&draw()}});
    el.querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>{rows.splice(+b.dataset.del,1);draw();onChange&&onChange(true)});
    el.querySelector("[data-add]").onclick=()=>{rows.push(opt.blank?opt.blank():{});draw();onChange&&onChange(true)}};
  draw();return{redraw:draw}}

/* ---------- Excel (SheetJS) ---------- */
async function readWorkbook(file){const buf=await file.arrayBuffer();return XLSX.read(buf,{type:"array",cellDates:true})}
const sheetAOA=ws=>XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:""});
const cellTxt=v=>v instanceof Date?v.toLocaleDateString("en-GB"):String(v??"").trim();

/* ---------- Report block model → Word (.docx) ---------- */
/* blocks: cover | h1 | h2 | h3 | p | ul | kv | table | pb | toc */
function wordFromBlocks(B,meta){
  const D=window.docx;if(!D){toast("Word library not loaded – check internet connection.");return null}
  const FONT="Arial",NAVY="1F3864";
  const run=(t,o={})=>new D.TextRun({text:String(t??""),font:FONT,size:o.size||20,bold:o.bold,italics:o.i,color:o.color});
  const P=(t,o={})=>new D.Paragraph({children:String(t??"").split("\n").flatMap((ln,i)=>i?[new D.TextRun({break:1}),run(ln,o)]:[run(ln,o)]),alignment:o.center?D.AlignmentType.CENTER:o.justify?D.AlignmentType.JUSTIFIED:undefined,spacing:{after:o.after??100},heading:o.heading});
  const cellP=(t,o)=>String(t??"").split("\n").map(ln=>new D.Paragraph({children:[run(ln,o)],spacing:{after:0}}));
  const out=[];
  for(const b of B){
    if(b.t==="cover2"){out.push(...coverWord(D,b.c,meta.logo,run))}
    else if(b.t==="photos"){const runs=[];(b.ids||[]).forEach(id=>{const x=meta.media&&meta.media.photos[id];if(!x)return;const k=Math.min(200/x.w,150/x.h,1);runs.push(new D.ImageRun({type:/png/i.test(x.type)?"png":"jpg",data:new Uint8Array(x.data),transformation:{width:Math.round(x.w*k),height:Math.round(x.h*k)}}),new D.TextRun({text:"  "}))});if(runs.length)out.push(new D.Paragraph({spacing:{after:160},children:runs}))}
    else if(b.t==="appx"){out.push(new D.Paragraph({children:[new D.PageBreak()]}),new D.Paragraph({heading:D.HeadingLevel.HEADING_1,alignment:D.AlignmentType.CENTER,spacing:{before:3600,after:200},children:[run(`APPENDIX ${b.L}: ${b.T}`,{size:30,bold:true,color:NAVY})]}));
      const ims=(meta.media&&meta.media.appx[b.L])||[];if(!ims.length)out.push(P("(No document attached)",{center:true,color:"6B7280"}));
      ims.forEach(x=>{if(x.err){out.push(P(x.err,{color:"C0392B"}));return}const s=Math.min(600/x.w,860/x.h,1);
        out.push(new D.Paragraph({children:[new D.PageBreak()]}),new D.Paragraph({alignment:D.AlignmentType.CENTER,children:[new D.ImageRun({type:/png/i.test(x.type)?"png":"jpg",data:new Uint8Array(x.data),transformation:{width:Math.round(x.w*s),height:Math.round(x.h*s)}})]}))})}
    else if(b.t==="cover"){b.lines.forEach(l=>out.push(P(l.x,{size:l.size||24,bold:l.bold,center:true,after:l.after??160})))}
    else if(b.t==="h1")out.push(new D.Paragraph({heading:D.HeadingLevel.HEADING_1,children:[run(b.x,{size:26,bold:true,color:NAVY})],spacing:{before:240,after:120}}));
    else if(b.t==="h2")out.push(new D.Paragraph({heading:D.HeadingLevel.HEADING_2,children:[run(b.x,{size:22,bold:true,color:NAVY})],spacing:{before:160,after:80}}));
    else if(b.t==="h3")out.push(new D.Paragraph({heading:D.HeadingLevel.HEADING_3,children:[run(b.x,{size:20,bold:true})],spacing:{before:120,after:60}}));
    else if(b.t==="p")out.push(P(b.x,{i:b.i,bold:b.bold,justify:true}));
    else if(b.t==="ul")b.items.forEach(it=>out.push(new D.Paragraph({children:[run(it)],bullet:{level:0},spacing:{after:40}})));
    else if(b.t==="pb")out.push(new D.Paragraph({children:[new D.PageBreak()]}));
    else if(b.t==="toc")out.push(new D.TableOfContents("Table of Contents",{hyperlink:true,headingStyleRange:"1-2"}));
    else if(b.t==="kv"||b.t==="table"){
      const head=b.t==="kv"?null:b.head,rows=b.t==="kv"?b.rows:b.rows,sz=b.small?15:17;
      if(b.cap)out.push(P(b.cap,{bold:true,size:18,after:60}));
      const ncol=(head||rows[0]||[]).length||1;
      const mk=(cells,isHead,ri)=>new D.TableRow({tableHeader:isHead,cantSplit:true,children:cells.map((c,ci)=>{
        const fill=isHead?NAVY:(b.t==="kv"&&ci===0?"DEEAF6":(b.fill&&b.fill[ri+","+ci])||(b.rowFill&&b.rowFill[ri])||undefined);
        const pics=!isHead&&b.photoCol===ci&&b.photos&&meta.media?(b.photos[ri]||[]).map(id=>meta.media.photos[id]).filter(Boolean):[];
        return new D.TableCell({children:pics.length?pics.map(x=>{const k=Math.min(110/(x.w||110),80/(x.h||80),1);return new D.Paragraph({spacing:{after:40},children:[new D.ImageRun({type:/png/i.test(x.type)?"png":"jpg",data:new Uint8Array(x.data),transformation:{width:Math.round((x.w||110)*k),height:Math.round((x.h||80)*k)}})]})}):cellP(c,{size:sz,bold:isHead||(b.t==="kv"&&ci===0),color:isHead?"FFFFFF":undefined}),
          shading:fill?{type:D.ShadingType.CLEAR,color:"auto",fill}:undefined,
          width:(b.w||(b.t==="kv"?[32,68]:null))?{size:(b.w||[32,68])[ci],type:D.WidthType.PERCENTAGE}:undefined,margins:{top:40,bottom:40,left:70,right:70}})})});
      const trs=[];if(head)trs.push(mk(head,true));rows.forEach((r,i)=>trs.push(mk(r,false,i)));
      out.push(new D.Table({rows:trs,width:{size:100,type:D.WidthType.PERCENTAGE}}));
      out.push(P("",{after:120}))}
  }
  const hdr=new D.Header({children:[new D.Paragraph({alignment:D.AlignmentType.RIGHT,children:[run(meta.header,{size:16,i:true})]})]});
  const ftr=new D.Footer({children:[new D.Paragraph({alignment:D.AlignmentType.CENTER,children:[run(meta.footer+"   Page ",{size:14}),new D.TextRun({children:[D.PageNumber.CURRENT],size:14,font:FONT})]})]});
  return new D.Document({creator:meta.creator||"IH-4",title:meta.title,features:{updateFields:true},
    sections:[{properties:{page:{margin:{top:1100,bottom:1100,left:1200,right:1200}}},headers:{default:hdr},footers:{default:ftr},children:out}]})}
async function downloadWord(B,meta,name,info){if(info)meta.logo=await getLogo(info);toast("Preparing Word report…",4000);meta.media=await prepareMedia(B);const doc=wordFromBlocks(B,meta);if(!doc)return;const blob=await docx.Packer.toBlob(doc);download(blob,name);toast("Word report downloaded")}

/* ---------- Report block model → printable HTML (Save as PDF from the browser) ---------- */
async function previewBlocks(B,meta,info){const w=window.open("","_blank");if(!w){toast("Allow pop-ups to open the preview");return}
  const lg=info?await getLogo(info):null,lu=lg?URL.createObjectURL(new Blob([lg.data],{type:lg.type})):"";const M=await prepareMedia(B);
  const h=[];for(const b of B){
    if(b.t==="cover2"){h.push(coverHtml(b.c,lu));continue}
    if(b.t==="photos"){h.push(`<div>${(b.ids||[]).map(id=>M.photos[id]?`<img src="${URL.createObjectURL(new Blob([M.photos[id].data],{type:M.photos[id].type}))}" style="max-width:200px;max-height:150px;margin:0 8px 8px 0">`:"").join("")}</div>`);continue}
    if(b.t==="appx"){h.push(`<div class="pb"></div><h1 style="text-align:center;border:none;margin-top:300px">APPENDIX ${esc(b.L)}: ${esc(b.T)}</h1>`);const ims=M.appx[b.L]||[];if(!ims.length)h.push(`<p style="text-align:center;color:#6B7280">(No document attached)</p>`);
      ims.forEach(x=>h.push(x.err?`<p style="color:#C0392B">${esc(x.err)}</p>`:`<div class="pb"></div><img src="${URL.createObjectURL(new Blob([x.data],{type:x.type}))}" style="max-width:100%">`));continue}
    if(b.t==="table"&&b.photos){h.push(`${b.cap?`<div class="cap">${esc(b.cap)}</div>`:""}<table><thead><tr>${b.head.map(x=>`<th>${esc(x)}</th>`).join("")}</tr></thead>${b.rows.map((r,ri)=>`<tr>${r.map((c,ci)=>`<td>${ci===b.photoCol?(b.photos[ri]||[]).map(id=>M.photos[id]?`<img src="${URL.createObjectURL(new Blob([M.photos[id].data],{type:M.photos[id].type}))}" style="max-width:110px;max-height:80px;display:block;margin:2px 0">`:"").join(""):esc(c).replace(/\n/g,"<br>")}</td>`).join("")}</tr>`).join("")}</table>`);continue}
    if(b.t==="cover")h.push(`<div class="cover">${b.lines.map(l=>`<div style="font-size:${(l.size||24)/2+2}px;${l.bold?"font-weight:700;":""}margin-bottom:${(l.after??160)/16}px">${esc(l.x).replace(/\n/g,"<br>")}</div>`).join("")}</div>`);
    else if(b.t==="h1")h.push(`<h1>${esc(b.x)}</h1>`);else if(b.t==="h2")h.push(`<h2>${esc(b.x)}</h2>`);else if(b.t==="h3")h.push(`<h3>${esc(b.x)}</h3>`);
    else if(b.t==="p")h.push(`<p style="${b.i?"font-style:italic;":""}${b.bold?"font-weight:700":""}">${esc(b.x).replace(/\n/g,"<br>")}</p>`);
    else if(b.t==="ul")h.push(`<ul>${b.items.map(i=>`<li>${esc(i)}</li>`).join("")}</ul>`);
    else if(b.t==="pb")h.push(`<div class="pb"></div>`);else if(b.t==="toc")h.push(`<p><i>Table of contents is generated in the Word file.</i></p>`);
    else if(b.t==="kv")h.push(`<table class="kv">${b.rows.map(r=>`<tr><th>${esc(r[0])}</th><td>${esc(r[1]).replace(/\n/g,"<br>")}</td></tr>`).join("")}</table>`);
    else if(b.t==="table")h.push(`${b.cap?`<div class="cap">${esc(b.cap)}</div>`:""}<table class="${b.small?"sm":""}"><thead><tr>${b.head.map(x=>`<th>${esc(x).replace(/\n/g,"<br>")}</th>`).join("")}</tr></thead>${b.rows.map((r,ri)=>`<tr>${r.map((c,ci)=>{const f=(b.fill&&b.fill[ri+","+ci])||(b.rowFill&&b.rowFill[ri]);return`<td${f?` style="background:#${f}"`:""}>${esc(c).replace(/\n/g,"<br>")}</td>`}).join("")}</tr>`).join("")}</table>`)}
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(meta.title)}</title><style>
  body{font:11pt Arial,sans-serif;max-width:900px;margin:20px auto;color:#111}h1{font-size:15pt;color:#1F3864;margin-top:26px;border-bottom:2px solid #1F3864}h2{font-size:12.5pt;color:#1F3864}h3{font-size:11pt}
  table{border-collapse:collapse;width:100%;margin:6px 0 14px;font-size:9pt}td,th{border:1px solid #888;padding:4px;vertical-align:top}thead th{background:#1F3864;color:#fff}table.sm{font-size:8pt}
  table.kv th{background:#DEEAF6;text-align:left;width:32%}.cap{font-weight:700;font-size:9.5pt;margin-top:8px}.cover{text-align:center;padding:60px 0 40px;page-break-after:always}.pb{page-break-after:always}
  .bar{position:sticky;top:0;background:#fff;padding:8px 0;border-bottom:1px solid #ccc}@media print{.bar{display:none}}</style></head><body>
  <div class="bar"><button onclick="print()">🖨 Print / Save as PDF</button> <span style="color:#666;font-size:9pt">${esc(meta.footer)}</span></div>${h.join("")}</body></html>`);w.document.close()}

/* ---------- Company details & logo (cover page) — shared with the CEM Calculator ---------- */
/* Same storage as CEM: localStorage "ihcc_company" + IndexedDB "ihcc_cem_files" / key "logo" */
const COMP_KEYS=["consName","consAddr","consTel","consEmail","logoName"];
function companyDefault(){try{return JSON.parse(localStorage.getItem("ihcc_company"))||{}}catch(e){return{}}}
function saveCompanyDefault(info){const c={};COMP_KEYS.forEach(k=>c[k]=info[k]||"");try{localStorage.setItem("ihcc_company",JSON.stringify(c))}catch(e){}}
function applyCompanyDefault(info){const d=companyDefault();if(d.consName)COMP_KEYS.forEach(k=>{if(d[k]!=null)info[k]=d[k]});return info}
const logoDB={db:null,
  open(){return this.db?Promise.resolve(this.db):new Promise((res,rej)=>{const r=indexedDB.open("ihcc_cem_files",1);r.onupgradeneeded=()=>r.result.createObjectStore("f");r.onsuccess=()=>res(this.db=r.result);r.onerror=()=>rej(r.error)})},
  async tx(mode,fn){const db=await this.open();return new Promise((res,rej)=>{const t=db.transaction("f",mode),s=t.objectStore("f"),q=fn(s);t.oncomplete=()=>res(q&&q.result);t.onerror=()=>rej(t.error)})},
  get(){return this.tx("readonly",s=>s.get("logo"))},put(v){return this.tx("readwrite",s=>s.put(v,"logo"))},del(){return this.tx("readwrite",s=>s.delete("logo"))}};
async function getLogo(info){if(!info.logoName)return null;try{const lg=await logoDB.get();if(!lg)return null;
  const bmp=await createImageBitmap(new Blob([lg.data],{type:lg.type}));return{...lg,w:bmp.width,h:bmp.height}}catch(e){return null}}
function companyCard(el,info,onChange){
  el.innerHTML=`<h3 style="margin-top:0">Company details (cover page)</h3>
  <div style="display:grid;grid-template-columns:170px 1fr;gap:16px;align-items:start">
   <div style="text-align:center"><div id="logoPrev" style="width:170px;height:120px;border:1.5px dashed var(--line);border-radius:12px;background:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden"><span class="muted" style="font-size:12px">No logo</span></div>
    <div class="noP" style="margin-top:8px;display:flex;flex-direction:column;align-items:center;gap:6px"><label class="filebtn" style="margin:0;color:var(--ink)">Upload logo<input type="file" id="logoIn" accept="image/png,image/jpeg"></label><button class="sm" id="logoDel" style="display:none">Remove</button></div>
    <div id="logoName" class="muted" style="font-size:11px;margin-top:4px;word-break:break-all"></div></div>
   <div class="fg" style="grid-template-columns:repeat(2,minmax(0,1fr))">
    <div class="span-all"><label>Company name</label><input data-c="consName" placeholder="e.g. ES Techventure Sdn. Bhd."></div>
    <div class="span-all"><label>Address</label><input data-c="consAddr"></div>
    <div><label>Tel / fax</label><input data-c="consTel" placeholder="Tel : 03 - … Fax : 03 - …"></div>
    <div><label>E-mail</label><input data-c="consEmail" placeholder="E-mail: …"></div></div></div>
  <p class="muted noP" style="font-size:12px;margin:8px 0 0">Saved as your default (shared with the CEM Calculator). Every new report starts with these company details and logo.</p>`;
  let t;el.querySelectorAll("[data-c]").forEach(i=>{i.value=info[i.dataset.c]||"";i.oninput=()=>{info[i.dataset.c]=i.value;clearTimeout(t);t=setTimeout(()=>saveCompanyDefault(info),600);onChange&&onChange()}});
  const show=async()=>{const box=el.querySelector("#logoPrev"),lg=await getLogo(info);
    if(lg){const u=URL.createObjectURL(new Blob([lg.data],{type:lg.type}));box.innerHTML=`<img src="${u}" style="max-width:160px;max-height:110px;object-fit:contain">`}else box.innerHTML='<span class="muted" style="font-size:12px">No logo</span>';
    el.querySelector("#logoDel").style.display=lg?"":"none";el.querySelector("#logoName").textContent=lg?lg.name:""};
  el.querySelector("#logoIn").onchange=async e=>{const fl=e.target.files[0];if(!fl)return;if(!/png|jpe?g/i.test(fl.type)){toast("Use a PNG or JPG logo");return}
    await logoDB.put({name:fl.name,type:fl.type,data:await fl.arrayBuffer()});info.logoName=fl.name;saveCompanyDefault(info);onChange&&onChange();show();toast("Logo saved. It will appear on the cover page.");e.target.value=""};
  el.querySelector("#logoDel").onclick=async()=>{await logoDB.del().catch(()=>{});info.logoName="";saveCompanyDefault(info);onChange&&onChange();show()};
  show()}

/* Standard cover page (same layout as the CEM report). c={titles:[...], ref, client, clientDosh, locName, locAddr, rows:[[label,value]]} */
function coverWord(D,c,logo,run){const AL=D.AlignmentType,out=[],P=(children,o={})=>new D.Paragraph({alignment:o.left?undefined:AL.CENTER,spacing:{before:o.before||0,after:o.after??0},indent:o.indent,tabStops:o.tabs,children});
  if(logo){const s=Math.min(200/logo.w,96/logo.h,1);out.push(P([new D.ImageRun({type:/png/i.test(logo.type)?"png":"jpg",data:new Uint8Array(logo.data),transformation:{width:Math.round(logo.w*s),height:Math.round(logo.h*s)}})],{after:200}))}
  out.push(P([run((c.consName||"").toUpperCase(),{bold:true,size:30})],{after:60}));
  [c.consAddr,c.consTel,c.consEmail].filter(Boolean).forEach(l=>out.push(P([run(l,{size:17,color:"6B7280"})])));
  out.push(P([],{before:1200,after:400}));
  c.titles.forEach(l=>out.push(P([run(l,{bold:true,size:34,color:"26406E"})],{after:60})));
  out.push(P([run(`(REF. NO.: ${c.ref||"-"})`,{bold:true,size:20,color:"26406E"})],{after:900}));
  out.push(P([run((c.client||"").toUpperCase(),{bold:true,size:24})],{after:40}));
  if(c.clientDosh)out.push(P([run(`(DOSH NO.: ${c.clientDosh})`,{bold:true,size:21})]));
  const ln=(c.locName||"").trim();if(ln&&ln.toLowerCase()!==(c.client||"").trim().toLowerCase())out.push(P([run(ln.toUpperCase(),{bold:true,size:23})],{before:300,after:40}));
  out.push(P([run(String(c.locAddr||"").replace(/\n/g," ").toUpperCase(),{bold:true,size:21})],{before:240,after:900,indent:{left:900,right:900}}));
  c.rows.filter(r=>r[1]!==null).forEach(([k,v])=>out.push(P([run(k,{bold:true,size:19}),run("\t: "+String(v||"-").toUpperCase(),{bold:true,size:19})],{left:true,after:80,indent:{left:600},tabs:[{type:D.TabStopType.LEFT,position:4200}]})));
  out.push(new D.Paragraph({children:[new D.PageBreak()]}));return out}
function coverHtml(c,logoUrl){const e=s=>esc(s).replace(/\n/g," ");
  return`<div class="cover">${logoUrl?`<img src="${logoUrl}" style="max-width:200px;max-height:96px"><br><br>`:""}<div style="font-size:15pt;font-weight:700">${e((c.consName||"").toUpperCase())}</div>
  ${[c.consAddr,c.consTel,c.consEmail].filter(Boolean).map(l=>`<div style="font-size:8.5pt;color:#6B7280">${e(l)}</div>`).join("")}
  <div style="margin:70px 0 50px;color:#26406E;font-weight:700;font-size:17pt;line-height:1.35">${c.titles.map(e).join("<br>")}<div style="font-size:10pt;margin-top:6px">(REF. NO.: ${e(c.ref||"-")})</div></div>
  <div style="font-weight:700;font-size:12pt">${e((c.client||"").toUpperCase())}</div>${c.clientDosh?`<div style="font-weight:700">(DOSH NO.: ${e(c.clientDosh)})</div>`:""}
  ${(c.locName||"").trim()&&c.locName.trim().toLowerCase()!==(c.client||"").trim().toLowerCase()?`<div style="font-weight:700;margin-top:14px">${e(c.locName.toUpperCase())}</div>`:""}
  <div style="font-weight:700;margin:12px 60px 50px">${e(String(c.locAddr||"").toUpperCase())}</div>
  <table style="width:auto;margin:0 auto;font-weight:700;font-size:9.5pt;border:none">${c.rows.filter(r=>r[1]!==null).map(([k,v])=>`<tr><td style="border:none;text-align:left;padding:3px 12px">${e(k)}</td><td style="border:none;text-align:left">: ${e(String(v||"-").toUpperCase())}</td></tr>`).join("")}</table></div>`}

/* ---------- Files & photos (same IndexedDB as CEM: "ihcc_cem_files") ---------- */
const fileDB={get:k=>logoDB.tx("readonly",s=>s.get(k)),put:(k,v)=>logoDB.tx("readwrite",s=>s.put(v,k)),del:k=>logoDB.tx("readwrite",s=>s.delete(k))};
async function shrinkImage(file,max=900){const bmp=await createImageBitmap(file),k=Math.min(1,max/Math.max(bmp.width,bmp.height)),c=document.createElement("canvas");
  c.width=Math.round(bmp.width*k);c.height=Math.round(bmp.height*k);const g=c.getContext("2d");g.fillStyle="#fff";g.fillRect(0,0,c.width,c.height);g.drawImage(bmp,0,0,c.width,c.height);
  const blob=await new Promise(r=>c.toBlob(r,"image/jpeg",.86));return{type:"image/jpeg",data:await blob.arrayBuffer(),w:c.width,h:c.height}}
const _thumb={};async function photoURL(id){if(_thumb[id])return _thumb[id];const p=await fileDB.get("photo:"+id).catch(()=>null);if(!p)return"";return _thumb[id]=URL.createObjectURL(new Blob([p.data],{type:p.type}))}
const PDFJS="https://cdn.jsdelivr.net/npm/pdfjs-dist@6.2.108/legacy/build/";let _pdfjs=null;
async function getPdfjs(){if(_pdfjs)return _pdfjs;const m=await import(PDFJS+"pdf.min.mjs");m.GlobalWorkerOptions.workerSrc=PDFJS+"pdf.worker.min.mjs";return _pdfjs=m}
async function pdfPagesAsPng(bytes,scale=1.6){const lib=await getPdfjs(),doc=await lib.getDocument({data:new Uint8Array(bytes.slice(0))}).promise,out=[];
  for(let i=1;i<=doc.numPages;i++){const pg=await doc.getPage(i),vp=pg.getViewport({scale}),c=document.createElement("canvas");c.width=vp.width;c.height=vp.height;
    const g=c.getContext("2d");g.fillStyle="#fff";g.fillRect(0,0,c.width,c.height);await pg.render({canvasContext:g,viewport:vp}).promise;
    const blob=await new Promise(r=>c.toBlob(r,"image/png"));out.push({type:"image/png",data:await blob.arrayBuffer(),w:c.width,h:c.height})}return out}
async function imgOf(fl){if(/png|jpe?g/i.test(fl.type)){const bmp=await createImageBitmap(new Blob([fl.data],{type:fl.type}));return{type:fl.type,data:fl.data,w:bmp.width,h:bmp.height}}
  const bmp=await createImageBitmap(new Blob([fl.data],{type:fl.type})),c=document.createElement("canvas");c.width=bmp.width;c.height=bmp.height;c.getContext("2d").drawImage(bmp,0,0);
  const blob=await new Promise(r=>c.toBlob(r,"image/png"));return{type:"image/png",data:await blob.arrayBuffer(),w:c.width,h:c.height}}
/* Load equipment photos and appendix files used by a block model (for Word / preview) */
async function prepareMedia(B){const M={photos:{},appx:{}};
  for(const b of B){if(b.t==="photos")b.photos=[b.ids];if(b.photos)for(const ids of b.photos)for(const id of ids||[]){if(M.photos[id])continue;const p=await fileDB.get("photo:"+id).catch(()=>null);if(p)M.photos[id]=p}
    if(b.t==="appx"){const out=[];for(const f of b.files||[]){const fl=await fileDB.get("file:"+f.id).catch(()=>null);if(!fl){out.push({err:`${f.name}: file not found on this device`});continue}
      try{if(/pdf/i.test(fl.type)||/\.pdf$/i.test(fl.name)){toast(`Adding ${f.name}…`,1500);(await pdfPagesAsPng(fl.data)).forEach(x=>out.push(x))}else out.push(await imgOf(fl))}
      catch(e){console.error(e);out.push({err:`Could not attach ${f.name}: ${e.message||e}`})}}M.appx[b.L]=out}}
  return M}
/* Appendix upload cards (CEM section 7 style). list=[[L,title]], att={L:[{id,name,type}]} */
function appendixCards(el,list,att,onChange){const tt=t=>t.toLowerCase().replace(/(^|\s|\()\w/g,c=>c.toUpperCase());
  el.innerHTML=`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:10px">${list.map(([L,T])=>{const fs=att[L]||[];
    return`<div class="card" style="padding:10px 12px"><div class="row" style="justify-content:space-between"><b>Appendix ${L}: ${esc(tt(T))}</b>
    <label class="filebtn noP">+ Add file<input type="file" data-up="${L}" accept=".pdf,image/png,image/jpeg,image/webp" multiple></label></div>
    ${fs.length?`<ul style="margin:6px 0 0;padding-left:18px;font-size:12.5px">${fs.map(x=>`<li>${esc(x.name)} <button class="sm noP" data-rm="${L}:${x.id}">remove</button></li>`).join("")}</ul>`:`<div class="muted" style="font-size:12.5px;margin-top:6px">No file yet</div>`}</div>`}).join("")}</div>`;
  el.querySelectorAll("[data-up]").forEach(inp=>inp.onchange=async()=>{const L=inp.dataset.up;for(const fl of inp.files){const id=uid();await fileDB.put("file:"+id,{name:fl.name,type:fl.type,data:await fl.arrayBuffer()});(att[L]=att[L]||[]).push({id,name:fl.name,type:fl.type})}onChange();appendixCards(el,list,att,onChange);toast("Attached to Appendix "+L)});
  el.querySelectorAll("[data-rm]").forEach(b=>b.onclick=async()=>{const [L,id]=b.dataset.rm.split(":");att[L]=(att[L]||[]).filter(x=>x.id!==id);await fileDB.del("file:"+id).catch(()=>{});onChange();appendixCards(el,list,att,onChange)})}

/* ---------- Dashboard (Supabase) — same login & ih_jobs table as the CEM Calculator ---------- */
async function initCloud(){const C=window.IHCC_CONFIG||{},st=$("#cloudSt"),say=t=>{if(st)st.textContent=t};
  try{if(!window.supabase||!C.SUPABASE_URL||/YOUR-PROJECT/i.test(C.SUPABASE_URL)){say("Offline: saved on this device only");return}
    const sb=window.supabase.createClient(C.SUPABASE_URL.trim().replace(/\/$/,""),String(C.SUPABASE_ANON_KEY||"").trim());const {data:{session}}=await sb.auth.getSession();
    if(!session){say("Not logged in: log in on the dashboard to save jobs");return}
    const {data}=await sb.from("app_users").select("role").eq("email",(session.user.email||"").toLowerCase()).maybeSingle();if(!data){say("Not authorised for the dashboard");return}
    window.__sb=sb;window.__role=data.role;say(data.role==="viewer"?"☁️ View only":"☁️ Connected to dashboard")}catch(e){console.error(e);say("Offline: saved on this device only")}}
const slugId=s=>String(s||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,40)||"x";
const isoD=d=>{const z=new Date(d.getTime()-d.getTimezoneOffset()*6e4);return z.toISOString().slice(0,10)};
const addMo=(s,m)=>{const d=new Date((s||isoD(new Date()))+"T00:00:00");d.setMonth(d.getMonth()+m);return isoD(d)};
/* Section "Complete & save to dashboard": el gets the form; jobsFn(opts) returns job objects */
function dashboardCard(el,jobsFn,info){
  el.innerHTML=`<p class="muted" style="margin:0 0 10px;font-size:13px">Records this report in the IH job register on the dashboard, with the highest result vs limit, the next due date and next action. Saving again updates the same jobs; it doesn't create duplicates.</p>
  <div class="fg"><div><label>Job status</label><select id="svStatus"><option>Completed</option><option>Reporting</option><option>In progress</option></select></div>
   <div><label>Person in charge</label><input id="svPic"></div><div><label>Report date</label><input type="date" id="svDate"></div><div><label>Request date (optional)</label><input type="date" id="svReq"></div></div>
  <div class="ts" style="margin-top:12px"><table id="svPrev"></table></div>
  <div class="row noP" style="margin-top:12px"><button class="pri" id="bSave">✔ Complete &amp; save to dashboard</button><span id="svMsg" class="muted" style="font-size:13px"></span></div>`;
  const opts=()=>({status:$("#svStatus").value,pic:$("#svPic").value,date:$("#svDate").value||isoD(new Date()),req:$("#svReq").value});
  const prev=()=>{if(!$("#svDate").value)$("#svDate").value=isoD(new Date());if(!$("#svPic").value)$("#svPic").value=info.assessor||"";const J=jobsFn(opts());
    $("#svPrev").innerHTML=J.length?`<tr><th>Dashboard job</th><th>Location</th><th>Category</th><th>Result</th><th>Limit</th><th>Priority</th><th>Next action</th></tr>`+J.map(j=>`<tr><td>${esc(j.title)}</td><td>${esc(j.location)||'<span class="pill p-over">set Client / site name</span>'}</td><td>${esc(j.category)}</td><td class="n">${j.result===""?"–":esc(j.result)+" "+esc(j.unit)}</td><td class="n">${j.nab===""?"–":esc(j.nab)}</td><td><span class="pill ${j.priority==="Critical"?"p-over":j.priority==="High"?"p-warn":""}">${j.priority}</span></td><td style="white-space:normal;font-size:12px;min-width:220px">${esc(j.nextAction)}</td></tr>`).join(""):`<tr><td class="muted">Enter the results first.</td></tr>`};
  ["#svStatus","#svPic","#svDate","#svReq"].forEach(s=>$(s).onchange=prev);
  $("#bSave").onclick=async()=>{const sb=window.__sb,role=window.__role;
    if(!sb)return toast("Log in from the dashboard first, then reopen this page to save.",5000);
    if(role!=="admin"&&role!=="editor")return toast("Your account is view-only. Ask an admin for editor access.",5000);
    const J=jobsFn(opts());if(!J.length)return toast("Nothing to save yet.");
    if(!info.reportNo&&!confirm("This report has no Report No. Save anyway? (Report No. keeps re-saves from creating duplicates.)"))return;
    try{const {data:ex,error:e1}=await sb.from("ih_jobs").select("id,data");if(e1)throw e1;const byId=Object.fromEntries((ex||[]).map(r=>[r.id,r.data]));
      let maxNo=Math.max(0,...(ex||[]).map(r=>+(r.data&&r.data.no)||0));
      const up=J.map(j=>{const old=byId[j.id];j.no=old&&old.no?old.no:++maxNo;if(old&&old.controls&&old.controls.length)j.controls=old.controls;if(old&&old.requestDate&&!$("#svReq").value)j.requestDate=old.requestDate;return{id:j.id,data:j}});
      const {error:e2}=await sb.from("ih_jobs").upsert(up);if(e2)throw e2;
      $("#svMsg").innerHTML=`Saved ${up.length} job${up.length>1?"s":""} at ${new Date().toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}. <a href="index.html">Open dashboard →</a>`;toast("Saved to dashboard")}
    catch(e){console.error(e);toast("Could not save: "+(e.message||e),6000)}};
  prev();return{refresh:prev}}
function baseJob(o){return{reportId:null,reportNo:"",location:"",category:"Noise",pic:"",priority:"Normal",status:"Completed",requestDate:"",deadline:"",result:"",unit:"",nab:"",recur:0,nextAction:"",notes:"",
  checklist:{sampling:true,lab:true,draft:true,review:o.status==="Completed"},seriesId:o.id,cycle:1,controls:[],completedAt:o.status==="Completed"?o.deadline:null,...o}}

/* ---------- Download section (CEM section 8 style): readiness + "Download full report…" (PDF / Word) + Excel + Print ---------- */
function downloadSection(el,o){
  el.innerHTML=`<div id="readiness"></div><div class="row noP" style="margin-top:8px"><button class="pri" id="bDl">⬇ Download full report…</button><button id="bXls">Download Excel</button><button id="bPpt">📊 Download presentation (.pptx)</button><button id="bPrint">Print this page</button></div>
  <div class="modal" id="mDl"><div class="box"><h3 style="margin:0">Download full report</h3><p class="muted" style="margin:4px 0 0;font-size:13px">Both include the cover, all sections and your attached appendices.</p>
   <div class="choice"><button id="dlPdf">📕 PDF file<span>Final, ready to send</span></button><button id="dlDoc">📘 Word file (.docx)<span>Editable</span></button></div>
   <p class="muted" style="font-size:12px;margin:0 0 10px">PDF opens a print-ready preview: choose "Save as PDF" as the printer. In Word, attached PDFs are inserted as page images; click Yes when Word asks to update the table of contents.</p>
   <div class="row" style="justify-content:flex-end"><button id="dlCancel">Cancel</button></div></div></div>`;
  const m=$("#mDl");$("#bDl").onclick=()=>m.classList.add("show");$("#dlCancel").onclick=()=>m.classList.remove("show");
  $("#dlDoc").onclick=()=>{m.classList.remove("show");o.word()};$("#dlPdf").onclick=()=>{m.classList.remove("show");o.pdf()};
  $("#bXls").onclick=()=>{if(!window.XLSX)return toast("Excel library not loaded");const wb=XLSX.utils.book_new();o.excel().forEach(([n,rows])=>XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),n.slice(0,31)));XLSX.writeFile(wb,o.xlsName())};
  $("#bPrint").onclick=()=>print();
  $("#bPpt").onclick=()=>o.ppt?o.ppt():toast("Presentation not available");
  const ready=()=>{const miss=o.missing(),na=o.appx().filter(([L])=>!(o.att()[L]||[]).length).map(([L])=>L);
    $("#readiness").innerHTML=(miss.length?`<div class="note">Still missing: ${miss.map(esc).join(" · ")}. You can still download a draft.</div>`:`<div class="ok">Report data is complete.</div>`)+
      (na.length?`<div class="muted" style="font-size:12.5px">No file yet for Appendix ${na.join(", ")}. Those appendices will show “No document attached”.</div>`:"")};
  ready();return{refresh:ready}}

/* ---------- Report text sections (CEM section 6 behaviour) ---------- */
/* TEXTS=[[key,title,(a,v)=>text]]; v = wording variant, bumped by "Rewrite" so the assessor gets fresh phrasing from the same data */
const pick=(v,arr)=>arr[(v||0)%arr.length];
const fixTxt=s=>String(s).replace(/(^|[^.])\.\.(?!\.)/g,"$1.").replace(/\s+([,.;])/g,"$1").replace(/ {2,}/g," ").trim();
function textOfGen(TEXTS,st,k,a){if(st.text[k]!=null)return st.text[k];const t=TEXTS.find(x=>x[0]===k);return t?fixTxt(t[2](a,(st.textVar||{})[k]||0)):""}
function textsUI(el,TEXTS,getSt,getA,save,photoKeys=["rec"]){const st=getSt();st.textPhotos=st.textPhotos||{};
  el.innerHTML=`<p class="muted" style="margin:0 0 10px;font-size:13px">Written from your results, the limits and the existing controls, the way a senior hygiene technician / assessor would. Edit any section; “Rewrite” rebuilds it from the latest data with new wording.</p>`+
   TEXTS.map(([k,t])=>`<div class="tx" style="margin-bottom:12px"><div class="row" style="justify-content:space-between"><label style="margin:0;font-weight:600;color:var(--ink)">${esc(t)}</label><button class="sm noP" data-txr="${k}">Rewrite</button></div><textarea data-tx="${k}"></textarea>${photoKeys.includes(k)?`<div data-tph="${k}" style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:8px"></div>`:""}</div>`).join("")+
   `<button class="noP" id="bRegen">Rewrite all sections from results</button>`;
  const a=getA();TEXTS.forEach(([k])=>{const ta=el.querySelector(`[data-tx="${k}"]`);ta.value=textOfGen(TEXTS,st,k,a);ta.style.height=Math.min(420,Math.max(110,ta.value.length/4))+"px";ta.oninput=()=>{getSt().text[k]=ta.value;save()}});
  el.querySelectorAll("[data-txr]").forEach(b=>b.onclick=()=>{const s=getSt(),k=b.dataset.txr,ta=el.querySelector(`[data-tx="${k}"]`),before=ta.value;
    s.textVar=s.textVar||{};s.textVar[k]=(s.textVar[k]||0)+1;delete s.text[k];save();ta.value=textOfGen(TEXTS,s,k,getA());
    ta.style.transition="background .6s";ta.style.background="#fff6d6";setTimeout(()=>ta.style.background="",900);
    toast(ta.value===before?"Already up to date with your latest results":"Rewritten from your latest results (new wording)")});
  el.querySelectorAll("[data-tph]").forEach(box=>textPhotos(box,box.dataset.tph,getSt,save));
  el.querySelector("#bRegen").onclick=()=>{const s=getSt();s.textVar=s.textVar||{};TEXTS.forEach(([k])=>s.textVar[k]=(s.textVar[k]||0)+1);s.text={};save();textsUI(el,TEXTS,getSt,getA,save);toast("All sections rewritten from your latest results")}}
/* pictures attached under a report text section (e.g. recommendations) */
function textPhotos(box,k,getSt,save){const st=getSt();st.textPhotos=st.textPhotos||{};const L=st.textPhotos[k]=st.textPhotos[k]||[];
  box.innerHTML=L.map(pid=>`<div style="position:relative;width:118px;height:88px;border:1px solid var(--line);border-radius:10px;background:#fff;display:flex;align-items:center;justify-content:center"><img data-tp="${pid}" style="max-width:110px;max-height:80px;object-fit:contain"><button class="sm noP" data-tpdel="${pid}" style="position:absolute;top:-9px;right:-9px;border-radius:50%;padding:0 6px">✕</button></div>`).join("")+
   `<label class="filebtn noP" style="border:1.5px dashed var(--pri);color:var(--pri)">+ Add picture<input type="file" accept="image/*" multiple></label><span class="muted noP" style="font-size:12px">Pictures appear below this section in the report (e.g. example controls).</span>`;
  box.querySelectorAll("[data-tp]").forEach(async img=>{img.src=await photoURL(img.dataset.tp)});
  box.querySelector("input").onchange=async e=>{try{for(const fl of e.target.files){const p=await shrinkImage(fl,1200),id=uid();await fileDB.put("photo:"+id,p);L.push(id)}}catch(err){toast("Could not read that image")}save();textPhotos(box,k,getSt,save)};
  box.querySelectorAll("[data-tpdel]").forEach(b=>b.onclick=()=>{st.textPhotos[k]=L.filter(x=>x!==b.dataset.tpdel);save();textPhotos(box,k,getSt,save)})}
function textsSoft(el,TEXTS,st,a){TEXTS.forEach(([k])=>{const ta=el.querySelector(`[data-tx="${k}"]`);if(ta&&st.text[k]==null&&document.activeElement!==ta)ta.value=textOfGen(TEXTS,st,k,a)})}
