/* IH-4 shared helpers for report modules (Noise / CHRA): state, editable tables, Excel, Word & print output */
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const num=v=>{if(v===""||v==null)return null;const n=parseFloat(String(v).replace(",","."));return isFinite(n)?n:null};
const f1=v=>v==null||!isFinite(v)?"–":(Math.round(v*10)/10).toFixed(1);
const listTxt=a=>a.length<=1?(a[0]||""):a.slice(0,-1).join(", ")+" and "+a[a.length-1];
const WORDS=["zero","one","two","three","four","five","six","seven","eight","nine","ten","eleven","twelve","thirteen","fourteen","fifteen","sixteen","seventeen","eighteen","nineteen","twenty"];
const nW=n=>`${(WORDS[n]||String(n)).replace(/^./,c=>c.toUpperCase())} (${n})`;
const nw=n=>`${WORDS[n]||String(n)} (${n})`;
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
      if(c.calc)return`<td class="${c.n?"n":""}">${c.calc(r,i)}</td>`;
      const v=esc(r[c.k]??"");const st=c.w?` style="min-width:${c.w}px"`:"";
      if(c.type==="select")return`<td><select data-r="${i}" data-k="${c.k}"${st}>${c.opts.map(o=>`<option${String(o)===String(r[c.k]??"")?" selected":""}>${esc(o)}</option>`).join("")}</select></td>`;
      if(c.type==="area")return`<td><textarea data-r="${i}" data-k="${c.k}"${st}>${v}</textarea></td>`;
      return`<td><input data-r="${i}" data-k="${c.k}" value="${v}"${c.type==="num"?' inputmode="decimal" style="min-width:64px;max-width:90px"':st}></td>`}).join("")}
      <td class="noP"><button class="sm" data-del="${i}" title="Delete row">✕</button></td></tr>`).join("")}</table></div>
      <div class="row noP" style="margin-top:6px"><button class="sm" data-add>+ Add row</button></div>`;
    el.querySelectorAll("[data-k]").forEach(inp=>{const h=()=>{rows[+inp.dataset.r][inp.dataset.k]=inp.value;onChange&&onChange(false)};inp.oninput=h;inp.onchange=()=>{h();opt.redrawOnChange&&draw()}});
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
    if(b.t==="cover"){b.lines.forEach(l=>out.push(P(l.x,{size:l.size||24,bold:l.bold,center:true,after:l.after??160})))}
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
        return new D.TableCell({children:cellP(c,{size:sz,bold:isHead||(b.t==="kv"&&ci===0),color:isHead?"FFFFFF":undefined}),
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
async function downloadWord(B,meta,name){const doc=wordFromBlocks(B,meta);if(!doc)return;const blob=await docx.Packer.toBlob(doc);download(blob,name);toast("Word report downloaded")}

/* ---------- Report block model → printable HTML (Save as PDF from the browser) ---------- */
function previewBlocks(B,meta){
  const h=[];for(const b of B){
    if(b.t==="cover")h.push(`<div class="cover">${b.lines.map(l=>`<div style="font-size:${(l.size||24)/2+2}px;${l.bold?"font-weight:700;":""}margin-bottom:${(l.after??160)/16}px">${esc(l.x).replace(/\n/g,"<br>")}</div>`).join("")}</div>`);
    else if(b.t==="h1")h.push(`<h1>${esc(b.x)}</h1>`);else if(b.t==="h2")h.push(`<h2>${esc(b.x)}</h2>`);else if(b.t==="h3")h.push(`<h3>${esc(b.x)}</h3>`);
    else if(b.t==="p")h.push(`<p style="${b.i?"font-style:italic;":""}${b.bold?"font-weight:700":""}">${esc(b.x).replace(/\n/g,"<br>")}</p>`);
    else if(b.t==="ul")h.push(`<ul>${b.items.map(i=>`<li>${esc(i)}</li>`).join("")}</ul>`);
    else if(b.t==="pb")h.push(`<div class="pb"></div>`);else if(b.t==="toc")h.push(`<p><i>Table of contents is generated in the Word file.</i></p>`);
    else if(b.t==="kv")h.push(`<table class="kv">${b.rows.map(r=>`<tr><th>${esc(r[0])}</th><td>${esc(r[1]).replace(/\n/g,"<br>")}</td></tr>`).join("")}</table>`);
    else if(b.t==="table")h.push(`${b.cap?`<div class="cap">${esc(b.cap)}</div>`:""}<table class="${b.small?"sm":""}"><thead><tr>${b.head.map(x=>`<th>${esc(x).replace(/\n/g,"<br>")}</th>`).join("")}</tr></thead>${b.rows.map((r,ri)=>`<tr>${r.map((c,ci)=>{const f=(b.fill&&b.fill[ri+","+ci])||(b.rowFill&&b.rowFill[ri]);return`<td${f?` style="background:#${f}"`:""}>${esc(c).replace(/\n/g,"<br>")}</td>`}).join("")}</tr>`).join("")}</table>`)}
  const w=window.open("","_blank");if(!w){toast("Allow pop-ups to open the preview");return}
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(meta.title)}</title><style>
  body{font:11pt Arial,sans-serif;max-width:900px;margin:20px auto;color:#111}h1{font-size:15pt;color:#1F3864;margin-top:26px;border-bottom:2px solid #1F3864}h2{font-size:12.5pt;color:#1F3864}h3{font-size:11pt}
  table{border-collapse:collapse;width:100%;margin:6px 0 14px;font-size:9pt}td,th{border:1px solid #888;padding:4px;vertical-align:top}thead th{background:#1F3864;color:#fff}table.sm{font-size:8pt}
  table.kv th{background:#DEEAF6;text-align:left;width:32%}.cap{font-weight:700;font-size:9.5pt;margin-top:8px}.cover{text-align:center;padding:60px 0 40px;page-break-after:always}.pb{page-break-after:always}
  .bar{position:sticky;top:0;background:#fff;padding:8px 0;border-bottom:1px solid #ccc}@media print{.bar{display:none}}</style></head><body>
  <div class="bar"><button onclick="print()">🖨 Print / Save as PDF</button> <span style="color:#666;font-size:9pt">${esc(meta.footer)}</span></div>${h.join("")}</body></html>`);w.document.close()}
