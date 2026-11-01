/* CEM Calculator — app logic (state, calculations, chemicals, CoA reading, appendices) */
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const KEY="ihcc_cem2";
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
function toast(m,ms=2800){const t=$("#toast");t.textContent=m;t.classList.add("show");clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove("show"),ms)}
function busy(on,msg){$("#busy").classList.toggle("show",!!on);if(msg)$("#busyMsg").textContent=msg}
const PDFJS="https://cdn.jsdelivr.net/npm/pdfjs-dist@6.2.108/legacy/build/";
const TESS="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
const APPX=[["A","CERTIFICATE OF COMPETENCY"],["B","FORM A"],["C","PROCESS FLOWCHART"],["D","METHOD USED"],["E","CALIBRATION CERTIFICATE"],["F","DATA AND CALCULATION FORM"],["G","CERTIFICATE OF ANALYSIS"],["H","PLAN LAYOUT"]];
const DEF_INFO={htPos:"Industrial Hygiene Executive (HT1)",hours:"Normal, 08:00 am – 5:00 pm; break 12:00 pm – 1:00 pm",area:"Plant",
  consName:"Environmental Science (M) Sdn. Bhd.",consAddr:"No.9, Persiaran Industri, Sri Damansara, 52200 Kuala Lumpur, Malaysia.",consTel:"Tel : 03 - 6273 6013 Fax : 03 - 6275 9325",consEmail:"E-mail: general@esm.com.my"};
const ENG=["Local exhaust ventilation (LEV) at source","General / dilution ventilation","Enclosure or isolation of the source","Wet method / water spray dust suppression","Dust collector / bag filter","Automation / remote or cabin operation"];
const ADM=["Safe work procedure (SOP) in place","Job rotation / limited exposure time","Housekeeping by vacuum or wet cleaning","Chemical hazard training given","Warning signage at exposure area","Restricted access to exposure area","LEV examined and tested within the last 12 months"];
const PPE=["Chemical-resistant gloves","Safety goggles / face shield","Coverall","Safety boots"];
const RPE={"":["— not recorded —",null],none:["No respirator",1],ffp:["Disposable respirator (N95 / P2)",10],hfp:["Half-face respirator with particulate filter (P2/P3)",10],hfv:["Half-face respirator with organic vapour cartridge",10],hfc:["Half-face respirator with combination cartridge",10],ffr:["Full-face respirator",50],papr:["Powered air-purifying respirator (PAPR)",25],sar:["Supplied-air respirator",1000]};

/* ---------------- USECHH Schedule I database ---------------- */
const DB=(window.USECHH||[]).map((e,i)=>({...e,i}));
const nnum=v=>{const n=parseFloat(String(v??"").replace(",","."));return isFinite(n)?n:null};
const normN=s=>String(s||"").toLowerCase().replace(/^\*+/,"").replace(/[-–—]\s*\(kulit\)|\(kulit\)/g,"").replace(/\((respirable|inhalable|total)\)/g," $1 ").replace(/particulates?|fraction|[()*,.;:]/g," ").replace(/\s+/g," ").trim();
DB.forEach(e=>{e.keys=[e.n,e.en,...(e.al||[])].filter(Boolean).map(normN);e.casL=(e.cas||"").split(";").map(c=>c.trim()).filter(Boolean)});
function dbFind(name){const n=normN(name);if(!n)return null;
  if(/^\d{2,7}-\d{2}-\d$/.test(n))return DB.find(e=>e.casL.includes(n))||null;
  return DB.find(e=>e.keys.includes(n))||DB.find(e=>e.keys.some(k=>k===n||k.startsWith(n+" ")))||DB.find(e=>e.en&&normN(e.en).includes(n))||null}
const MEDIA={"0500":"Filter (Tared 37-mm, 5-µm PVC filter)","0600":"Cyclone + Filter (Higgins-Dewell [HD] + Tared 5-µm PVC filter)","7602":"Cyclone + Filter (Higgins-Dewell [HD] + Tared 5-µm PVC filter)","7500":"Cyclone + Filter (Higgins-Dewell [HD] + Tared 5-µm PVC filter)",
  "1501":"Charcoal sorbent tube (100 mg/50 mg)","1003":"Charcoal sorbent tube (100 mg/50 mg)","1005":"Charcoal sorbent tube (100 mg/50 mg)","1500":"Charcoal sorbent tube (100 mg/50 mg)","1300":"Charcoal sorbent tube (100 mg/50 mg)","1400":"Charcoal sorbent tube (100 mg/50 mg)","1401":"Charcoal sorbent tube (100 mg/50 mg)","1450":"Charcoal sorbent tube (100 mg/50 mg)","1457":"Charcoal sorbent tube (100 mg/50 mg)","1022":"Charcoal sorbent tube (100 mg/50 mg)","1550":"Charcoal sorbent tube (100 mg/50 mg)",
  "2016":"DNPH-coated silica gel cartridge","7300":"MCE membrane filter, 0.8 µm, 37-mm","6009":"Hopcalite sorbent tube (200 mg)","7400":"MCE membrane filter, 0.8 µm, 25-mm with conductive cowl"};
function fromDb(e,displayName){
  const mg=nnum(e.mg),ppm=nnum(e.ppm);let pel=mg,conv=false;
  if(pel==null&&ppm!=null&&e.mw){pel=+(ppm*e.mw/24.45).toFixed(2);conv=true}
  const code=((e.niosh||"").match(/\d{4}/)||[""])[0];
  const lim=[ppm!=null?ppm+" ppm":"",mg!=null?mg+" mg/m³":"",conv?`≈ ${pel} mg/m³ (converted, MW ${e.mw})`:""].filter(Boolean).join(" / ")||"no numeric limit (—)";
  const ceil=(nnum(e.cppm)!=null||nnum(e.cmg)!=null)?` · Ceiling: ${[nnum(e.cppm)!=null?e.cppm+" ppm":"",nnum(e.cmg)!=null?e.cmg+" mg/m³":""].filter(Boolean).join(" / ")}`:"";
  return{name:displayName||e.en||e.n.replace(/-\s*\(kulit\)/,"").trim(),cas:e.cas||"",method:e.niosh||"",media:MEDIA[code]||"",pel:pel??"",ppm:ppm??"",ceil:ceil.replace(" · ",""),
    ceilPpm:nnum(e.cppm)??"",ceilMg:nnum(e.cmg)??"",pg:e.pg,conv,
    skin:!!e.skin,s2:!!e.s2,mw:e.mw||"",db:e.i,src:`USECHH 2000 Sch. I — ${e.n}: ${lim}${ceil}${e.skin?" · skin":""}${e.s2?" · Sch. II medical surveillance":""}${e.unit?" · unit "+e.unit:""}${e.chk?" · ⚠ "+e.chk:""}`,
    ceilOnly:pel==null&&nnum(e.cmg)!=null,unit:e.unit||""}}
const v_=x=>x===""||x==null?"–":x;
function srcLine(p){if(p.db==null)return"";const e=DB[p.db]||{};const pg=e.pg!=null?` (p. ${e.pg+1})`:"";
  let s=`✓ USECHH 2000 Schedule I${pg}: TWA ${v_(nnum(e.ppm))} ppm / ${v_(nnum(e.mg))} mg/m³`;
  if(nnum(e.cppm)!=null||nnum(e.cmg)!=null)s+=` · Ceiling ${v_(nnum(e.cppm))} ppm / ${v_(nnum(e.cmg))} mg/m³`;
  s+=` · [${e.cas||"no CAS"}]`;if(nnum(e.mg)==null&&nnum(e.ppm)!=null&&e.mw)s+=` · ≈ ${(nnum(e.ppm)*e.mw/24.45).toFixed(2)} mg/m³ at 25 °C (MW ${e.mw})`;
  if(e.skin)s+=" · skin";if(e.s2)s+=" · Sch. II medical surveillance";if(e.chk)s+=" · ⚠ verify";return s}
/* MEL = 3 × PEL (as defined by the user per USECHH 2000) */
const mel=p=>{const a=num(p.pel),b=num(p.ppm);return{mg:a!=null?+(a*3).toPrecision(6):null,ppm:b!=null?+(b*3).toPrecision(6):null}};
const melText=p=>{const m=mel(p);return m.mg==null&&m.ppm==null?"–":`${m.ppm!=null?m.ppm+" ppm":"– ppm"} / ${m.mg!=null?m.mg+" mg/m³":"– mg/m³"}`};
function defaultParams(){const P=[];const add=(q,n,media)=>{const e=dbFind(q);if(e){const p=fromDb(e,n);if(media)p.media=media;P.push(p)}};
  add("respirable dust","Respirable Dust","Cyclone + Filter (Higgins-Dewell [HD] + Tared 5-µm PVC filter)");
  add("inhalable dust","Inhalable Particulate Dust","Filter (Tared 37-mm, 5-µm PVC filter)");
  add("silica quartz","Silica Quartz (Respirable)","Cyclone + Filter (Higgins-Dewell [HD] + Tared 5-µm PVC filter)");
  P.forEach(p=>{if(p.name==="Respirable Dust")p.method="NIOSH 0600 (Issue 3: 15 January 1998)";if(p.name==="Inhalable Particulate Dust")p.method="NIOSH 0500 (Issue 2: 15 August 1994)";if(p.name.startsWith("Silica"))p.method="NIOSH 7602 (Issue 4: 25 July 2017)"});
  return P}

/* ---------------- state ---------------- */
const CUR="ihcc_cem_current",lkey=id=>KEY+":"+id;
const newId=()=>(crypto.randomUUID?crypto.randomUUID():"r-"+Date.now().toString(36)+Math.random().toString(36).slice(2,10));
const COMP_KEYS=["consName","consAddr","consTel","consEmail","logoName"];
function companyDefault(){try{return JSON.parse(localStorage.getItem("ihcc_company"))||{}}catch(e){return{}}}
function saveCompanyDefault(){const c={};COMP_KEYS.forEach(k=>c[k]=st.info[k]||"");try{localStorage.setItem("ihcc_company",JSON.stringify(c))}catch(e){}if(typeof onCompanyChange==="function")onCompanyChange(c)}
function freshState(){return{env:{Tc:25,Pc:760,T:25,P:760},reportId:newId(),jobId:null,info:{...DEF_INFO,...companyDefault()},params:defaultParams(),points:{},rows:[],divTotal:false,text:{},att:{},ctl:{eng:[],adm:[],ppe:[]},up:{},meta:{}}}
function load(){try{const id=localStorage.getItem(CUR);if(id){const d=JSON.parse(localStorage.getItem(lkey(id)));if(d)return d}
  const old=JSON.parse(localStorage.getItem(KEY));if(old){old.reportId=old.reportId||newId();return old}}catch(e){}return null}
function normState(){st.info={...DEF_INFO,...st.info};st.ctl={eng:[],adm:[],ppe:[],...st.ctl};st.up=st.up||{};st.meta=st.meta||{};st.att=st.att||{};st.text=st.text||{};st.points=st.points||{};st.rows=st.rows||[];if(!st.params||!st.params.length)st.params=defaultParams();
  const old=st.rows.find(r=>r.Tc!=null&&r.Tc!=="");if(old)st.env={Tc:old.Tc,Pc:old.Pc??760,T:old.T??old.Tc,P:old.P??760};else if(!st.env)st.env={Tc:25,Pc:760,T:25,P:760};
  st.rows.forEach(r=>{delete r.Tc;delete r.Pc;delete r.T;delete r.P});
  Object.values(st.points).forEach(p=>{if(p.task&&!p.area)p.area=p.task;delete p.task});
  st.params.forEach(p=>{if(p.db!=null&&DB[p.db]){const e=DB[p.db];if(p.ceilPpm===undefined){p.ceilPpm=nnum(e.cppm)??"";p.ceilMg=nnum(e.cmg)??""}if(p.ppm===undefined||p.ppm==="")p.ppm=nnum(e.ppm)??""}})}
const st=Object.assign(freshState(),load()||{});normState();
let saveT;function save(){clearTimeout(saveT);saveT=setTimeout(()=>{try{localStorage.setItem(lkey(st.reportId),JSON.stringify(st));localStorage.setItem(CUR,st.reportId)}catch(e){}
  if(typeof onLocalSave==="function")onLocalSave()},200)}
function replaceState(d){Object.keys(st).forEach(k=>delete st[k]);Object.assign(st,freshState(),d||{});normState();ensureEquip();save()}
const idb={db:null,
  open(){return this.db?Promise.resolve(this.db):new Promise((res,rej)=>{const r=indexedDB.open("ihcc_cem_files",1);r.onupgradeneeded=()=>r.result.createObjectStore("f");r.onsuccess=()=>res(this.db=r.result);r.onerror=()=>rej(r.error)})},
  async put(k,v){const db=await this.open();return new Promise((res,rej)=>{const t=db.transaction("f","readwrite");t.objectStore("f").put(v,k);t.oncomplete=res;t.onerror=()=>rej(t.error)})},
  async get(k){const db=await this.open();return new Promise((res,rej)=>{const r=db.transaction("f").objectStore("f").get(k);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})},
  async del(k){const db=await this.open();return new Promise(res=>{const t=db.transaction("f","readwrite");t.objectStore("f").delete(k);t.oncomplete=res})}};

/* ---------------- equipment (Table 4) ---------------- */
const EQ_TPL="• Model:\n• Serial Number:\n• Date of Calibration:\n• Recalibration Date:";
const EQ_DEF=[["Personal Air Sampling Pump",EQ_TPL],["Calibrator",EQ_TPL],["Collection Media","• Cyclone + Filter\n(Higgins-Dewell [HD] + tared 5-µm PVC membrane)\n• Filter\n(37-mm, 5-µm PVC membrane)"],["Environmental Factor Unit (Anemometer)",EQ_TPL]];
function ensureEquip(){if(!Array.isArray(st.equip)){const old=(st.info.equipment||"").split("\n").map(l=>l.trim()).filter(Boolean);
  st.equip=old.length?old.map(l=>({id:uid(),name:l,details:"",photos:[]})):EQ_DEF.map(([n,d])=>({id:uid(),name:n,details:d,photos:[]}))}}
ensureEquip();
async function shrinkImage(file,max=900){const bmp=await createImageBitmap(file),k=Math.min(1,max/Math.max(bmp.width,bmp.height)),c=document.createElement("canvas");
  c.width=Math.round(bmp.width*k);c.height=Math.round(bmp.height*k);const g=c.getContext("2d");g.fillStyle="#fff";g.fillRect(0,0,c.width,c.height);g.drawImage(bmp,0,0,c.width,c.height);
  const blob=await new Promise(r=>c.toBlob(r,"image/jpeg",.86));return{type:"image/jpeg",data:await blob.arrayBuffer(),w:c.width,h:c.height}}
const thumbURL={};async function photoURL(id){if(thumbURL[id])return thumbURL[id];const p=await idb.get("photo:"+id);if(!p)return"";return thumbURL[id]=URL.createObjectURL(new Blob([p.data],{type:p.type}))}
function renderEquip(){
  $("#equip").innerHTML=st.equip.map((e,i)=>`<div class="eq"><label>Equipment / item</label><input data-eq="${i}" data-k="name" value="${esc(e.name)}">
   <label style="margin-top:8px">Details (one line each: model, serial no., calibration dates…)</label><textarea data-eq="${i}" data-k="details">${esc(e.details)}</textarea>
   <div class="ph">${e.photos.map(pid=>`<div class="t"><img data-pid="${pid}" alt=""><button class="noP" data-phdel="${i}:${pid}" title="Remove photo">✕</button></div>`).join("")}
   <label class="add noP">+ Add photo<input type="file" accept="image/*" multiple data-phadd="${i}"></label></div>
   <div class="row noP" style="margin-top:10px"><button class="sm" data-eqdel="${i}">Delete item</button>${i>0?`<button class="sm" data-equp="${i}">↑ Move up</button>`:""}</div></div>`).join("")||'<p class="muted" style="font-size:13px">No equipment listed.</p>';
  $$("[data-eq]").forEach(el=>el.oninput=()=>{st.equip[+el.dataset.eq][el.dataset.k]=el.value;save()});
  $$("[data-pid]").forEach(async img=>{img.src=await photoURL(img.dataset.pid)});
  $$("[data-phadd]").forEach(inp=>inp.onchange=async()=>{const e=st.equip[+inp.dataset.phadd];busy(true,"Adding photo…");
    try{for(const fl of inp.files){const p=await shrinkImage(fl),id=uid();await idb.put("photo:"+id,p);e.photos.push(id)}}catch(err){toast("Could not read that image")}finally{busy(false)}save();renderEquip()});
  $$("[data-phdel]").forEach(b=>b.onclick=async()=>{const [i,pid]=b.dataset.phdel.split(":"),e=st.equip[+i];e.photos=e.photos.filter(x=>x!==pid);await idb.del("photo:"+pid);save();renderEquip()});
  $$("[data-eqdel]").forEach(b=>b.onclick=()=>{const e=st.equip[+b.dataset.eqdel];if((e.name||e.details||e.photos.length)&&!confirm(`Delete "${e.name||"this item"}"?`))return;st.equip.splice(+b.dataset.eqdel,1);save();renderEquip()});
  $$("[data-equp]").forEach(b=>b.onclick=()=>{const i=+b.dataset.equp;[st.equip[i-1],st.equip[i]]=[st.equip[i],st.equip[i-1]];save();renderEquip()});
}
$("#bEqAdd").onclick=()=>{st.equip.push({id:uid(),name:"",details:EQ_TPL,photos:[]});save();renderEquip();const ins=$$("[data-eq][data-k=name]");ins[ins.length-1].focus()};
$("#bEqReset").onclick=()=>{if(!confirm("Replace the equipment list with the default 4 items? Photos on removed items will be deleted."))return;
  st.equip.forEach(e=>e.photos.forEach(p=>idb.del("photo:"+p)));st.equip=EQ_DEF.map(([n,d])=>({id:uid(),name:n,details:d,photos:[]}));save();renderEquip()};

/* ---------------- calculations ---------------- */
const num=v=>{if(v===""||v==null)return null;const n=+String(v).replace(",",".");return isFinite(n)?n:null};
function massOf(m){const s=String(m??"").trim();if(!s)return{v:null};
  if(/^(nd|n\.d\.?|bdl|not detected)$/i.test(s))return{v:null,nd:true};
  const lt=/^</.test(s),v=num(s.replace(/^<\s*/,""));return{v,lt}}
const param=name=>st.params.find(p=>p.name===name)||{name,pel:null,method:"",media:""};
const worker=pt=>(st.points[pt]&&st.points[pt].name)||pt||"—";
function calc(r){const E=st.env||{},fc=num(r.fc),t=num(r.t),Pc=num(E.Pc),Tc=num(E.Tc),P=num(E.P),T=num(E.T),M=massOf(r.mass);
  if([fc,t,Pc,Tc,P,T].some(x=>x==null)||P<=0)return{M};
  const TK=T+273,TcK=Tc+273,Vm=fc*t*Math.sqrt((Pc*TK)/(P*TcK)),Vs=Vm*(P/760)*(298/TK),Ci=M.v==null||Vs<=0?null:M.v/Vs;
  return{TK,TcK,Vm,Vs,Ci,M,lt:M.lt}}
const ptSort=(a,b)=>String(a).localeCompare(String(b),undefined,{numeric:true});
function groups(){
  const g=new Map();
  st.rows.forEach(r=>{const k=(r.param||"—")+"||"+(r.point||"—");if(!g.has(k))g.set(k,{param:r.param||"—",point:r.point||"—",rows:[]});g.get(k).rows.push({r,c:calc(r)})});
  const order=st.params.map(p=>p.name);
  return [...g.values()].sort((a,b)=>((order.indexOf(a.param)+1||99)-(order.indexOf(b.param)+1||99))||ptSort(a.point,b.point)).map(G=>{
    const ok=G.rows.filter(x=>x.c.Ci!=null),complete=ok.length===G.rows.length&&ok.length>0;
    const sumT=G.rows.reduce((a,x)=>a+(num(x.r.t)||0),0),sumCt=ok.reduce((a,x)=>a+x.c.Ci*num(x.r.t),0);
    // USECHH 2000: a sample taken over less than 60 minutes is a short-term result, compared with the MEL (3 × PEL)
    const short=sumT>0&&sumT<60;
    const div=short?sumT:st.divTotal?sumT:480,twa=complete&&div>0?sumCt/div:null,lt=complete&&G.rows.every(x=>x.c.lt);
    const pel=num(param(G.param).pel),lim=short?mel(param(G.param)).mg:pel,basis=short?"MEL":"PEL",pct=twa!=null&&lim?twa/lim*100:null;
    return{...G,worker:worker(G.point),sumT,sumCt,div,twa,lt,pel,lim,basis,short,pct,complete}});
}
const f=(v,d=3)=>v==null||!isFinite(v)?"–":(+v).toFixed(d);
const twaTxt=g=>g.twa==null?"–":(g.lt?"<":"")+f(g.twa,3);
const cls=p=>p==null?"":p>=100?"over":p>=50?"warn":"safe";
const remark=g=>{const b=g.basis||"PEL",sh=g.short?" (short-term, vs MEL)":"";return g.pct==null?"–":(g.lt?"Below detection limit":g.pct>=100?"Exceeds "+b:g.pct>=50?"Above 50% "+b:g.pct>=10?"Above 10% "+b:"Below 10% "+b)+sh};
const twaLbl=g=>g.short?"C (short-term, < 60 min)":"TWA₈";
const limCell=g=>g.lim==null?null:g.short?`${g.lim} (MEL)`:String(g.lim);

/* ---------------- UI: info + controls ---------------- */
let compT;
function renderInfo(){$$("[data-i]").forEach(el=>{el.value=st.info[el.dataset.i]||"";el.oninput=()=>{st.info[el.dataset.i]=el.value;save();renderTexts(true);
  if(COMP_KEYS.includes(el.dataset.i)){clearTimeout(compT);compT=setTimeout(saveCompanyDefault,800)}}});renderLogo()}
let logoURL=null;
async function renderLogo(){const box=$("#logoPrev");if(!box)return;const lg=st.info.logoName?await idb.get("logo").catch(()=>null):null;
  if(logoURL){URL.revokeObjectURL(logoURL);logoURL=null}
  if(lg){logoURL=URL.createObjectURL(new Blob([lg.data],{type:lg.type}));box.innerHTML=`<img src="${logoURL}" alt="Company logo">`;$("#logoDel").style.display=""}
  else{box.innerHTML='<span class="muted" style="font-size:12px;text-align:center">No logo</span>';$("#logoDel").style.display="none"}
  $("#logoName").textContent=lg?st.info.logoName:""}
$("#logoIn").onchange=async e=>{const fl=e.target.files[0];e.target.value="";if(!fl)return;
  if(!/png|jpe?g/i.test(fl.type))return toast("Please use a PNG or JPG image for the logo.");
  let data=await fl.arrayBuffer(),type=fl.type;
  try{const bmp=await createImageBitmap(fl);if(Math.max(bmp.width,bmp.height)>600){const k=600/Math.max(bmp.width,bmp.height),c=document.createElement("canvas");c.width=Math.round(bmp.width*k);c.height=Math.round(bmp.height*k);c.getContext("2d").drawImage(bmp,0,0,c.width,c.height);
    const b=await new Promise(r=>c.toBlob(r,"image/png"));data=await b.arrayBuffer();type="image/png"}}catch(err){}
  await idb.put("logo",{name:fl.name,type,data});st.info.logoName=fl.name;if(st.up)delete st.up.logo;save();saveCompanyDefault();renderLogo();toast("Logo saved. It will appear on the cover page.")};
$("#logoDel").onclick=async()=>{await idb.del("logo");st.info.logoName="";save();saveCompanyDefault();renderLogo();toast("Logo removed")};
function renderControls(){const C=st.ctl;
  const box=(id,list,key)=>{$(id).innerHTML=list.map((t,i)=>`<label class="chk"><input type="checkbox" data-ck="${key}" value="${esc(t)}" ${C[key].includes(t)?"checked":""}>${esc(t)}</label>`).join("")};
  box("#cEng",ENG,"eng");box("#cAdm",ADM,"adm");box("#cPpe",PPE,"ppe");
  $("#cRpe").innerHTML=Object.entries(RPE).map(([k,[l]])=>`<option value="${k}">${l}</option>`).join("");
  $$("[data-ck]").forEach(el=>el.onchange=()=>{const a=C[el.dataset.ck];if(el.checked){if(!a.includes(el.value))a.push(el.value)}else a.splice(a.indexOf(el.value),1);save();renderTexts(true)});
  $$("[data-c]").forEach(el=>{el.value=C[el.dataset.c]||"";el[el.tagName==="SELECT"?"onchange":"oninput"]=()=>{C[el.dataset.c]=el.value;save();renderTexts(true)}})}

/* ---------------- UI: chemicals ---------------- */
const optLabel=e=>`${e.en||e.n}${e.en?" — "+e.n:""}${e.cas?" ["+e.cas+"]":""}`;
function fillChemList(){$("#chemList").innerHTML=DB.map(e=>`<option value="${esc(optLabel(e))}">`).join("")}
const byLabel=v=>DB.find(e=>optLabel(e)===v);
$("#chemSearch").onchange=e=>{const d=byLabel(e.target.value)||dbFind(e.target.value);if(!d){toast("Not found in Schedule I. Pick from the list, or type the CAS number.");return}
  const p=fromDb(d);if(st.params.some(x=>x.name===p.name)){toast(p.name+" is already in the list");e.target.value="";return}
  st.params.push(p);e.target.value="";save();renderAll();toast(`${p.name} added. PEL ${p.pel||"–"} mg/m³${p.method?", "+p.method:""}`)};
function renderParams(){
  $("#tPar").innerHTML=`<tr><th>Chemical / parameter</th><th>Method</th><th>Sampling media</th><th>PEL TWA8 (mg/m³)</th><th>PEL TWA8 (ppm)</th><th>MEL = 3 × PEL</th><th>Ceiling (ppm)</th><th>Ceiling (mg/m³)</th><th>Source</th><th class="noP"></th></tr>`+
   st.params.map((p,i)=>`<tr><td><input data-p="${i}" data-k="name" list="chemList" value="${esc(p.name)}" style="min-width:200px"></td><td><input data-p="${i}" data-k="method" value="${esc(p.method)}" style="min-width:220px"></td>
   <td><input data-p="${i}" data-k="media" value="${esc(p.media)}" style="min-width:240px"></td><td><input data-p="${i}" data-k="pel" type="number" step="any" value="${esc(p.pel)}" style="width:90px;${p.pel===""||p.pel==null?"border-color:var(--over)":""}"></td>
   <td><input data-p="${i}" data-k="ppm" type="number" step="any" value="${esc(p.ppm)}" placeholder="–" style="width:80px"></td><td class="n" style="white-space:nowrap">${esc(melText(p))}</td><td><input data-p="${i}" data-k="ceilPpm" type="number" step="any" value="${esc(p.ceilPpm)}" placeholder="–" style="width:80px"></td><td><input data-p="${i}" data-k="ceilMg" type="number" step="any" value="${esc(p.ceilMg)}" placeholder="–" style="width:80px"></td>
   <td class="src">${p.db!=null?`<span style="color:var(--safe)">${esc(srcLine(p))}</span>${p.edited?' <span class="pill p-warn">edited</span>':""}`:'<span class="muted">entered manually</span>'}</td><td class="noP"><button class="sm" data-pdel="${i}">✕</button></td></tr>`).join("");
  $$("[data-p]").forEach(el=>el.onchange=()=>{const i=+el.dataset.p,p=st.params[i],old=p.name,k=el.dataset.k;
    if(k==="name"){const d=byLabel(el.value);if(d){const np=fromDb(d);np.name=np.name;Object.assign(p,np);toast(`PEL and method filled from Schedule I: ${p.pel||"–"} mg/m³`)}else p.name=el.value;
      st.rows.forEach(r=>{if(r.param===old)r.param=p.name})}
    else{p[k]=el.value;if(["pel","ppm","ceilPpm","ceilMg"].includes(k)&&p.db!=null)p.edited=true}
    save();renderAll()});
  $$("[data-pdel]").forEach(b=>b.onclick=()=>{st.params.splice(+b.dataset.pdel,1);save();renderAll()});
}
function renderPoints(){st.rows.forEach(r=>{const p=r.point;if(p&&!st.points[p])st.points[p]={name:/blank/i.test(p)?"Field blank":"Worker "+(p.match(/\d+/)||[p])[0],area:"",desc:""}})}
function ciCell(r){const c=calc(r);return c.Ci==null?(c.M.nd?"ND":"–"):(c.lt?"<":"")+f(c.Ci,3)}
const gkey=r=>(r.point||"")+"||"+(r.param||"");
function groupOrder(){const o=[];st.rows.forEach(r=>{const k=gkey(r);if(!o.includes(k))o.push(k)});return o}
function pelText(p){const a=[];if(p.pel!==""&&p.pel!=null)a.push(`${p.pel} mg/m³`);if(p.ppm!==""&&p.ppm!=null)a.push(`${p.ppm} ppm`);return(a.join(" · ")||"–")+` · MEL ${melText(p)}`}
function renderEnv(){$$("[data-env]").forEach(el=>{el.value=st.env[el.dataset.env]??"";el.oninput=()=>{st.env[el.dataset.env]=el.value;save();$$("[data-ci]").forEach(td=>td.textContent=ciCell(st.rows[+td.dataset.ci]));renderOut();renderTexts(true)}})}
function renderRows(){renderPoints();renderEnv();
  const G=groupOrder(),box=$("#groups");
  const pOpts=n=>st.params.map(p=>`<option ${p.name===n?"selected":""}>${esc(p.name)}</option>`).join("")+(n&&!st.params.some(p=>p.name===n)?`<option selected>${esc(n)}</option>`:"")+(n?"":`<option value="" selected>— choose —</option>`);
  if(!G.length){box.innerHTML='<p class="muted" style="font-size:13px">No samples yet. Upload a CoA above, or click “+ Add worker / parameter”.</p>';return}
  const res=Object.fromEntries(groups().map(g=>[g.point+"||"+g.param,g]));
  box.innerHTML=G.map((k,gi)=>{const idx=st.rows.map((r,i)=>gkey(r)===k?i:-1).filter(i=>i>=0),r0=st.rows[idx[0]],pt=st.points[r0.point]||{},p=param(r0.param),g=res[(r0.point||"—")+"||"+(r0.param||"—")];
    return `<div class="grp" data-g="${gi}">
     <div class="gf">
      <div><label>Worker name</label><input data-gp="${gi}" data-k="name" value="${esc(pt.name||"")}" ${r0.point?"":"disabled"}></div>
      <div><label>Point (P1…)</label><input data-gr="${gi}" data-k="point" value="${esc(r0.point)}"></div>
      <div><label>Area / job</label><input data-gp="${gi}" data-k="area" value="${esc(pt.area||"")}" placeholder="e.g. Maintenance worker" ${r0.point?"":"disabled"}></div>
      <div><label>Work description</label><input data-gp="${gi}" data-k="desc" value="${esc(pt.desc||"")}" placeholder="e.g. Apply grease at conveyor belt" ${r0.point?"":"disabled"}></div>
      <div><label>Parameter</label><select data-gr="${gi}" data-k="param">${pOpts(r0.param)}</select></div>
      <div><label>PEL TWA8 (mg/m³)</label><input data-gq="${gi}" data-k="pel" type="number" step="any" value="${esc(p.pel??"")}" ${st.params.includes(p)?"":"disabled"}></div>
      <div><label>PEL TWA8 (ppm)</label><input data-gq="${gi}" data-k="ppm" type="number" step="any" value="${esc(p.ppm??"")}" placeholder="–" ${st.params.includes(p)?"":"disabled"}></div>
      <div><label>MEL = 3 × PEL</label><input value="${esc(melText(p))}" disabled></div>
      <div><label>Calibrated flow fc (L/min)</label><input data-gfc="${gi}" inputmode="decimal" value="${esc(r0.fc??"")}"></div>
     </div>
     ${p.db!=null?`<div class="srcok">${esc(srcLine(p))}${p.edited?" · values edited":""}</div>`:`<div class="srcman">${r0.param?"PEL entered manually (not from Schedule I).":"Choose a parameter."}</div>`}
     <div class="ts"><table><tr><th>Sample No.</th><th>Period (e.g. 0830-1130)</th><th>Duration (min)</th><th>Mass (µg)</th><th>ND</th><th>Ci (mg/m³)</th><th class="noP"></th></tr>
      ${idx.map(i=>{const r=st.rows[i],nd=/^</.test(String(r.mass||""));return`<tr><td><input data-r="${i}" data-k="sample" value="${esc(r.sample)}"></td><td><input data-r="${i}" data-k="period" value="${esc(r.period)}"></td>
       <td><input data-r="${i}" data-k="t" inputmode="decimal" value="${esc(r.t)}" style="min-width:70px"></td><td><input data-r="${i}" data-k="mass" inputmode="decimal" value="${esc(String(r.mass??"").replace(/^<\s*/,""))}" style="min-width:80px"></td>
       <td><input type="checkbox" data-nd="${i}" ${nd?"checked":""} title="Below detection limit (result shown as “<”)"></td><td class="n" data-ci="${i}">${ciCell(r)}</td><td class="noP"><button class="sm" data-del="${i}" title="Delete row">✕</button></td></tr>`}).join("")}</table></div>
     <div class="res">${g&&g.twa!=null?`${twaLbl(g)} <b>${twaTxt(g)} mg/m³</b> · ${g.pct==null?"set PEL":`<span class="pill p-${g.lt?"safe":cls(g.pct)}">${g.lt?"<":""}${f(g.pct,1)}% ${g.basis}${g.short?` (MEL = 3 × PEL = ${g.lim} mg/m³)`:""} · ${remark(g)}</span>`}`:'<span class="muted">TWA₈ appears when flow, duration and mass are filled in.</span>'}</div>
     <details class="noP"><summary>Paste from lab CoA</summary><p class="muted" style="font-size:12px;margin:6px 0">One sample per line: sample no. and mass (µg), e.g. <code>MCE546 0.52</code> or <code>MCE547 &lt;0.05</code>. Copy straight from the CoA or Excel.</p>
      <textarea data-paste="${gi}"></textarea><button class="sm" data-pasteok="${gi}" style="margin-top:6px">Fill samples</button></details>
     <div class="row noP" style="margin-top:10px"><button data-addrow="${gi}">+ Sample row</button><button data-delg="${gi}">Delete group</button></div>
     <p class="muted" style="font-size:12px;margin:8px 0 0">For results below the detection limit: enter the lab LOD as the mass, then tick ND (result shown as “&lt;”).</p></div>`}).join("");
  const rowsOf=gi=>st.rows.map((r,i)=>gkey(r)===G[gi]?i:-1).filter(i=>i>=0);
  const soft=()=>{save();renderOut();renderTexts(true);$$("[data-ci]").forEach(td=>td.textContent=ciCell(st.rows[+td.dataset.ci]))};
  $$("[data-gp]").forEach(el=>el.onchange=()=>{const r0=st.rows[rowsOf(+el.dataset.gp)[0]];st.points[r0.point]=st.points[r0.point]||{};st.points[r0.point][el.dataset.k]=el.value;save();renderAll()});
  $$("[data-gr]").forEach(el=>el.onchange=()=>{const v=el.dataset.k==="point"?el.value.trim().toUpperCase():el.value;const old=st.rows[rowsOf(+el.dataset.gr)[0]];
    if(el.dataset.k==="point"&&v&&!st.points[v]&&st.points[old.point])st.points[v]={...st.points[old.point]};rowsOf(+el.dataset.gr).forEach(i=>st.rows[i][el.dataset.k]=v);save();renderAll()});
  $$("[data-gq]").forEach(el=>el.onchange=()=>{const p=param(st.rows[rowsOf(+el.dataset.gq)[0]].param);p[el.dataset.k]=el.value;if(p.db!=null)p.edited=true;save();renderAll()});
  $$("[data-gfc]").forEach(el=>el.oninput=()=>{rowsOf(+el.dataset.gfc).forEach(i=>st.rows[i].fc=el.value);soft()});
  $$("[data-r]").forEach(el=>el.oninput=()=>{const r=st.rows[+el.dataset.r];let v=el.value;if(el.dataset.k==="mass"){v=v.replace(/^<\s*/,"");if(/^</.test(String(r.mass||""))&&v)v="<"+v}r[el.dataset.k]=v;soft()});
  $$("[data-r]").forEach(el=>el.onchange=()=>renderRows());
  $$("[data-nd]").forEach(el=>el.onchange=()=>{const r=st.rows[+el.dataset.nd],m=String(r.mass||"").replace(/^<\s*/,"");r.mass=el.checked?(m?"<"+m:"<"):m;save();renderAll()});
  $$("[data-del]").forEach(b=>b.onclick=()=>{st.rows.splice(+b.dataset.del,1);save();renderAll()});
  $$("[data-addrow]").forEach(b=>b.onclick=()=>{const ix=rowsOf(+b.dataset.addrow),l=st.rows[ix[ix.length-1]];st.rows.splice(ix[ix.length-1]+1,0,{point:l.point,param:l.param,sample:"",period:"",fc:l.fc,t:"",mass:""});save();renderAll()});
  $$("[data-delg]").forEach(b=>b.onclick=()=>{const ix=rowsOf(+b.dataset.delg);if(ix.some(i=>st.rows[i].mass||st.rows[i].sample)&&!confirm("Delete this worker/parameter group and its samples?"))return;st.rows=st.rows.filter((r,i)=>!ix.includes(i));save();renderAll()});
  $$("[data-pasteok]").forEach(b=>b.onclick=()=>{const gi=+b.dataset.pasteok,txt=$(`[data-paste="${gi}"]`).value,ix=rowsOf(gi),l=st.rows[ix[ix.length-1]];let n=0;
    txt.split(/\n/).map(x=>x.trim()).filter(Boolean).forEach(line=>{const m=line.match(/^(.+?)[\s,;\t]+(<\s*)?(\d+(?:[.,]\d+)?|ND)\s*$/i);if(!m)return;const id=m[1].trim(),mass=/nd/i.test(m[3])?"ND":(m[2]?"<":"")+m[3].replace(",",".");
      const ex=st.rows.find(r=>gkey(r)===G[gi]&&r.sample.replace(/\s+/g,"").toUpperCase()===id.replace(/\s+/g,"").toUpperCase());
      if(ex)ex.mass=mass;else{const empty=st.rows.find(r=>gkey(r)===G[gi]&&!r.sample);if(empty){empty.sample=id;empty.mass=mass}else st.rows.splice(st.rows.indexOf(l)+1+n,0,{point:l.point,param:l.param,sample:id,period:"",fc:l.fc,t:"",mass})}n++});
    save();renderAll();toast(n+" sample"+(n===1?"":"s")+" filled")});
}
$("#bAdd").onclick=()=>{const used=st.rows.map(r=>+(String(r.point).match(/^P(\d+)$/i)||[0,0])[1]),n=Math.max(0,...used)+1,l=st.rows[st.rows.length-1]||{};
  st.rows.push({point:"P"+n,param:"",sample:"",period:"",fc:l.fc||"",t:"",mass:""});save();renderAll();const g=$$(".grp");g[g.length-1].scrollIntoView({behavior:"smooth",block:"center"})};
$("#bClr").onclick=()=>{if(!st.rows.length||!confirm("Clear all samples?"))return;st.rows=[];save();renderAll();toast("All samples cleared")};
$("#divTotal").onchange=e=>{st.divTotal=e.target.checked;save();renderOut();renderTexts(true)};

/* ---------------- UI: calc + summary ---------------- */
function twaExpr(g){if(!g.complete)return"TWA₈: enter fc, t, temperatures, pressures and mass for every sample.";
  return `${g.short?"C (short-term)":"TWA₈"} = [${g.rows.map(({r,c})=>`(${f(c.Ci,3)} × ${f(num(r.t),0)})`).join(" + ")}] / ${f(g.div,0)} = <b>${twaTxt(g)} mg/m³</b>${g.short?` — sampled ${f(g.sumT,0)} min (< 60 min), so compared with MEL ${g.lim??"–"} mg/m³`:""}`}
function renderOut(){
  const G=groups();$("#divLbl").textContent=st.divTotal?"Σt (total sampling duration)":"480";
  $("#calc").innerHTML=G.length?G.map(g=>`<div style="margin-bottom:14px"><div style="font-size:13px;margin-bottom:4px"><b>${esc(st.info.client||"Client")}</b> — Point: ${esc(g.point)} — Parameter: ${esc(g.param)} — ${esc(g.worker)}</div>
   <div class="ts"><table><tr><th>Sample</th><th>Period (hrs)</th><th>fc (L/min)</th><th>t (min)</th><th>Tc (K)</th><th>Pc</th><th>T (K)</th><th>P</th><th>M (µg)</th><th>Vm (L)</th><th>Vs (L)</th><th>Ci (mg/m³)</th></tr>
   ${g.rows.map(({r,c})=>`<tr><td>${esc(r.sample)||"–"}</td><td>${esc(r.period)||"–"}</td><td class="n">${f(num(r.fc),4)}</td><td class="n">${f(num(r.t),0)}</td><td class="n">${f(c.TcK,1)}</td><td class="n">${esc(r.Pc)}</td><td class="n">${f(c.TK,1)}</td><td class="n">${esc(r.P)}</td><td class="n">${esc(r.mass)||"–"}</td><td class="n">${f(c.Vm,1)}</td><td class="n">${f(c.Vs,1)}</td><td class="n">${c.Ci==null?"–":(c.lt?"<":"")+f(c.Ci,3)}</td></tr>`).join("")}</table></div>
   <div class="muted" style="font-size:12.5px;margin-top:4px">${twaExpr(g)}</div></div>`).join(""):'<p class="muted">–</p>';
  $("#tSum").innerHTML=`<tr><th>Name (Sample No)</th><th>Parameter</th><th>Sampling duration</th><th>Exposure level (mg/m³)</th><th>PEL 8-hr TWA / MEL (mg/m³)</th><th>% of limit</th><th>Remarks</th></tr>`+
   (G.length?G.map(g=>`<tr><td>${esc(g.worker)} (${esc(g.point)})</td><td>${esc(g.param)}</td><td>${f(g.sumT,0)} min</td><td class="n"><b>${twaTxt(g)}</b></td><td class="n">${limCell(g)??'<span class="pill p-over">set PEL</span>'}</td><td class="n">${g.pct==null?"–":(g.lt?"<":"")+f(g.pct,1)}</td><td>${g.pct==null?(g.complete?"–":'<span class="muted">incomplete field data</span>'):`<span class="pill p-${g.lt?"safe":cls(g.pct)}">${remark(g)}</span>`}</td></tr>`).join(""):`<tr><td colspan="7" class="muted">–</td></tr>`);
  renderReadiness();
}

/* ---------------- CoA reading ---------------- */
let pdfjsLib=null;
async function getPdfjs(){if(pdfjsLib)return pdfjsLib;const m=await import(PDFJS+"pdf.min.mjs");m.GlobalWorkerOptions.workerSrc=PDFJS+"pdf.worker.min.mjs";return pdfjsLib=m}
function loadScript(src){return new Promise((res,rej)=>{const s=document.createElement("script");s.src=src;s.onload=res;s.onerror=()=>rej(new Error("Could not load "+src));document.head.appendChild(s)})}
async function ocr(img,scale=1){if(!window.Tesseract)await loadScript(TESS);const {data}=await Tesseract.recognize(img,"eng");
  return (data.words||[]).map(w=>({t:fixOcr(w.text),x:w.bbox.x0/scale,y:(w.bbox.y0+w.bbox.y1)/2/scale,w:(w.bbox.x1-w.bbox.x0)/scale})).filter(w=>w.t&&!/^[|\[\]_—–\-]+$/.test(w.t))}
/* common OCR slips in scanned CoAs: Pl→P1, O→0 inside numbers, stray letters after a value */
function fixOcr(t){t=String(t||"").trim().replace(/^[|\[\]]+|[|\[\]]+$/g,"");
  const pm=t.match(/^P([lI|!SsOoBZz])$/);if(pm)return"P"+({l:1,I:1,"|":1,"!":1,S:5,s:5,O:0,o:0,B:8,Z:2,z:2})[pm[1]];
  if(/^<?\s*[\dOo]+([.,][\dOo]+)?[A-Za-z]?$/.test(t)&&/\d/.test(t))t=t.replace(/[Oo]/g,"0").replace(/[A-Za-z]$/,"");
  return t}
async function pagesFromPdf(bytes){
  const lib=await getPdfjs(),doc=await lib.getDocument({data:new Uint8Array(bytes.slice(0))}).promise,out=[];
  for(let i=1;i<=doc.numPages;i++){const pg=await doc.getPage(i),vp=pg.getViewport({scale:1}),tc=await pg.getTextContent();
    let items=tc.items.filter(it=>it.str&&it.str.trim()).map(it=>({t:it.str.trim(),x:it.transform[4],y:vp.height-it.transform[5],w:it.width})),tol=3;
    if(items.map(i=>i.t).join("").length<30){busy(true,`Reading scanned page ${i} of ${doc.numPages} (OCR)…`);
      const v2=pg.getViewport({scale:3.5}),cv=document.createElement("canvas");cv.width=v2.width;cv.height=v2.height;
      await pg.render({canvasContext:cv.getContext("2d"),viewport:v2}).promise;items=await ocr(cv,3.5);tol=7}
    out.push({items,mode:"nearest",tol})}
  return out}
async function pagesFromSheet(bytes){if(!window.XLSX)throw new Error("Excel reader not loaded");
  const wb=XLSX.read(bytes,{type:"array"});return wb.SheetNames.map(n=>{const rows=XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,defval:"",raw:false});
    const items=[];rows.forEach((r,ri)=>r.forEach((c,ci)=>{const t=String(c).trim();if(t)items.push({t,x:ci*100,y:ri*20,w:50})}));return{items,mode:"down",tol:1}})}
async function pagesFromImage(file){busy(true,"Reading photo (OCR)… this can take a minute");return[{items:await ocr(file),mode:"nearest",tol:8}]}
const RX_ID=/^[A-Z]{1,5}[ \-\/]?\d{1,6}[A-Z]?$/i, RX_VAL=/^(<\s*)?\d+(?:[.,]\d+)?$|^(ND|N\.D\.?|BDL|not detected)$/i, RX_PT=/^(P\s?\d+[A-Z]?|P[lI|]|S\s?\d+|Blank|Field\s*blank|Media\s*blank)$/i;
const RX_SKIPHDR=/result|[µμu]g|mg\s*\/|sample|points?$|^id$|per\s|unit/i;
function buildCells(items,tol){
  const sorted=items.slice().sort((a,b)=>a.y-b.y||a.x-b.x),lines=[];
  sorted.forEach(it=>{const L=lines.find(l=>Math.abs(l.y-it.y)<=tol);if(L)L.items.push(it);else lines.push({y:it.y,items:[it]})});
  const cells=[];lines.forEach(L=>{L.items.sort((a,b)=>a.x-b.x);let cur=null;
    L.items.forEach(it=>{if(cur&&(it.x-(cur.x+cur.w)<(tol>3?7:4)||tol>3&&/^[A-Z]{1,5}$/i.test(cur.t)&&/^\d{1,6}$/.test(it.t)&&it.x-(cur.x+cur.w)<16)){cur.t+=(it.x-(cur.x+cur.w)>0.8?" ":"")+it.t;cur.w=it.x+it.w-cur.x}else{cur={...it,y:L.y};cells.push(cur)}})});
  return{cells,lines,text:lines.map(L=>L.items.map(i=>i.t).join(" ")).join("\n")}}
const unitFactor=u=>/^\s*mg/i.test(u||"")?1000:/^\s*ng/i.test(u||"")?0.001:1;
const normMethod=m=>String(m||"").replace(/^(NIOSH|OSHA|MDHS|USEPA|EPA|ASTM|ISO)\s*-?\s*(\d)/i,(a,b,c)=>b.toUpperCase()+" "+c);
function scaleMass(m,k){if(k===1||/^(nd|n\.d|bdl|not)/i.test(m))return m;const lt=m.startsWith("<"),n=parseFloat(m.replace("<",""))*k;return(lt?"<":"")+String(+n.toPrecision(6))}
/* Layout B: samples across the top as columns, chemicals down the side as rows (e.g. ALS, SGS, Intertek) */
function parseMatrix({items,tol}){
  const {cells,text}=buildCells(items,tol),sameLine=(a,b)=>Math.abs(a.y-b.y)<=tol;
  const hdrs=cells.filter(c=>/^(client\s*)?sample\s*(id|code|no\.?|name|ref(erence)?|description)\s*:?$/i.test(c.t)||/^(client\s*)?sample\s*(id|code)\b/i.test(c.t));
  const rows=[];
  hdrs.forEach(h=>{
    const cols=cells.filter(c=>sameLine(c,h)&&c.x>h.x+h.w&&!/^-+$/.test(c.t)&&c.t.length<=24).map(c=>({id:c.t.replace(/^.*?sample\s*(id|code)\s*:?\s*/i,"").trim(),cx:c.x+c.w/2,x:c.x})).filter(c=>c.id);
    if(!cols.length)return;
    const near=(c,col)=>Math.abs(c.x+c.w/2-col.cx)<55;
    // lab sample numbers & sampling dates directly below the header
    const below=cells.filter(c=>c.y>h.y+tol&&c.y<h.y+90);
    cols.forEach(col=>{const lab=below.find(c=>near(c,col)&&/[A-Z]{2,}\d{3,}-\d{2,4}/.test(c.t));if(lab)col.lab=lab.t.trim();
      const dt=below.find(c=>near(c,col)&&/\d{1,2}[-\/ ][A-Za-z]{3}[-\/ ]\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4}/.test(c.t));if(dt)col.date=dt.t.trim()});
    const nextHdr=hdrs.filter(o=>o.y>h.y+tol).sort((a,b)=>a.y-b.y)[0],stopY=nextHdr?nextHdr.y-tol:Infinity;
    const firstX=Math.min(...cols.map(c=>c.x));
    const lineYs=[...new Set(cells.filter(c=>c.y>h.y+tol&&c.y<stopY).map(c=>c.y))].sort((a,b)=>a-b);
    lineYs.forEach(y=>{const L=cells.filter(c=>Math.abs(c.y-y)<=tol);
      const vals=cols.map(col=>L.find(c=>near(c,col)&&RX_VAL.test(c.t.replace(/\s+/g,""))));
      if(!vals.some(Boolean))return;
      const left=L.filter(c=>c.x+c.w<firstX-10).sort((a,b)=>a.x-b.x);
      const name=left.find(c=>/[A-Za-z]{3,}/.test(c.t)&&!/^(NIOSH|OSHA|MDHS|USEPA|EPA|ASTM|ISO)/i.test(c.t)&&!/^[µμun]?g\s*\//i.test(c.t)&&!/^mg\s*\//i.test(c.t)&&!/^(LOR|LOD|MDL|unit|method)$/i.test(c.t));
      if(!name)return;
      const meth=left.find(c=>/^(NIOSH|OSHA|MDHS|USEPA|EPA|ASTM|ISO)/i.test(c.t)),unit=left.find(c=>/^(µg|μg|ug|mg|ng)\s*\/?/i.test(c.t));
      const lor=left.filter(c=>RX_VAL.test(c.t)).pop();
      vals.forEach((v,i)=>{if(!v)return;const col=cols[i];let m=v.t.replace(/\s+/g,"").replace(",",".");m=scaleMass(m,unitFactor(unit&&unit.t));
        rows.push({point:/blank|^fb\b|^mb\b/i.test(col.id)?"Blank":"",sample:col.id.replace(/\s+/g," ").toUpperCase(),labId:col.lab||"",date:col.date||"",
          param:name.t.replace(/^[\*\^ø~\s]+|[\*\^ø~\s]+$/g,"").trim(),mass:/^(nd|n\.d|bdl|not)/i.test(m)?"ND":m,method:normMethod(meth&&meth.t),unit:unit?unit.t:"",lor:lor?lor.t:""})})});
  });
  return{rows,text}}
function parsePage({items,mode,tol}){
  const {cells,text}=buildCells(items,tol),sameLine=(a,b)=>Math.abs(a.y-b.y)<=tol;
  let cand=cells.filter(c=>RX_ID.test(c.t)&&!/^(NIOSH|OSHA|MDHS|SAMM|ISO|EPA|PAGE)/i.test(c.t)&&cells.some(v=>sameLine(v,c)&&v.x>c.x+c.w&&RX_VAL.test(v.t)));
  if(!cand.length)return{rows:[],text};
  if(cand.some(c=>!RX_PT.test(c.t)))cand=cand.filter(c=>!RX_PT.test(c.t)); // a "Points" column (P1, P2…) is not the sample ID
  const buckets={};cand.forEach(c=>{const k=Math.round(c.x/12);(buckets[k]=buckets[k]||[]).push(c)});
  let best=[];Object.keys(buckets).forEach(k=>{const grp=[...(buckets[k-1]||[]),...buckets[k],...(buckets[+k+1]||[])];if(grp.length>best.length)best=grp});
  const idX=best.reduce((a,c)=>a+c.x,0)/best.length,ids=cand.filter(c=>Math.abs(c.x-idX)<20).sort((a,b)=>a.y-b.y);
  const vals=[];
  if(tol>3&&ids.length>1){ // scanned page: rows can be slightly skewed, so give each value to the nearest sample ID line
    const gaps=ids.slice(1).map((c,i)=>c.y-ids[i].y).sort((a,b)=>a-b),maxD=Math.max(tol,gaps[Math.floor(gaps.length/2)]*0.65),idR=Math.min(...ids.map(c=>c.x+c.w));
    cells.filter(v=>v.x>idR&&RX_VAL.test(v.t)&&v.y>ids[0].y-maxD&&v.y<ids[ids.length-1].y+maxD).forEach(v=>{
      const id=ids.reduce((b,c)=>Math.abs(c.y-v.y)<Math.abs(b.y-v.y)?c:b);if(Math.abs(id.y-v.y)<=maxD)vals.push({id,v,cx:v.x+v.w/2})});
    // one value per sample per column: keep the closest
    const best={};vals.forEach(o=>{const k=o.id.t+"|"+Math.round(o.cx/40),d=Math.abs(o.v.y-o.id.y);if(!best[k]||d<best[k].d)best[k]={o,d}});
    vals.length=0;Object.values(best).forEach(b=>vals.push(b.o));vals.sort((a,b)=>a.id.y-b.id.y||a.cx-b.cx);
  }else ids.forEach(id=>cells.filter(v=>sameLine(v,id)&&v.x>id.x+id.w&&RX_VAL.test(v.t)).forEach(v=>vals.push({id,v,cx:v.x+v.w/2})));
  const colsX=[];vals.slice().sort((a,b)=>a.cx-b.cx).forEach(o=>{const c=colsX.find(c=>Math.abs(c.cx-o.cx)<35);if(c){c.n++;c.cx+=(o.cx-c.cx)/c.n}else colsX.push({cx:o.cx,n:1})});
  const top=ids[0].y;
  colsX.forEach(col=>{const above=cells.filter(c=>c.y<top-0.5&&c.y>top-160&&Math.abs(c.x+c.w/2-col.cx)<90&&!RX_VAL.test(c.t)&&!RX_ID.test(c.t)&&!RX_SKIPHDR.test(c.t)&&c.t.length>2).sort((a,b)=>b.y-a.y);
    col.param=above.length?above[0].t.replace(/^\*+\s*/,"").trim():""});
  const mg=/\bmg\s*\/\s*sample/i.test(text)&&!/[µμ]g|ug\s*\//i.test(text);
  const methodCell=cells.find(c=>/^(NIOSH|OSHA|MDHS|ISO|EPA)\s*\d/i.test(c.t)),method=methodCell?methodCell.t.replace(/\s*\([^)]*$/,"").trim():"";
  const ptCells=cells.filter(c=>c.x<idX-8&&RX_PT.test(c.t)).sort((a,b)=>a.y-b.y);
  const ptFor=id=>{if(!ptCells.length)return"";if(mode==="down"){let p="";ptCells.forEach(c=>{if(c.y<=id.y+0.5)p=c.t});return p}
    return ptCells.reduce((b,c)=>Math.abs(c.y-id.y)<Math.abs(b.y-id.y)?c:b).t};
  const rows=vals.map(o=>{const col=colsX.find(c=>Math.abs(c.cx-o.cx)<35);let m=o.v.t.replace(",",".").replace(/^<\s*/,"<");
    if(mg&&!/^(nd|n\.d|bdl|not)/i.test(m)){const lt=m.startsWith("<"),n=parseFloat(m.replace("<",""))*1000;m=(lt?"<":"")+String(+n.toFixed(3))}
    const pt=ptFor(o.id).replace(/\s+/g,"");return{point:/blank/i.test(pt)?"Blank":pt.toUpperCase(),sample:o.id.t.replace(/\s+/g," ").toUpperCase(),param:col?col.param:"",mass:/^(nd|n\.d|bdl|not)/i.test(m)?"ND":m,method}});
  return{rows,text}}
const MON={jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};
function dateRange(list){const ds=list.map(s=>{const m=String(s).match(/(\d{1,2})[-\/ ]([A-Za-z]{3})[-\/ ](\d{4})/);return m&&MON[m[2].toLowerCase()]!=null?new Date(+m[3],MON[m[2].toLowerCase()],+m[1]):null}).filter(Boolean).sort((a,b)=>a-b);
  if(!ds.length)return"";const o=n=>n+(n%10===1&&n!==11?"st":n%10===2&&n!==12?"nd":n%10===3&&n!==13?"rd":"th"),M=d=>d.toLocaleDateString("en-GB",{month:"long"});
  const a=ds[0],b=ds[ds.length-1];if(+a===+b)return`${o(a.getDate())} ${M(a)} ${a.getFullYear()}`;
  return a.getMonth()===b.getMonth()&&a.getFullYear()===b.getFullYear()?`${o(a.getDate())} – ${o(b.getDate())} ${M(b)} ${b.getFullYear()}`:`${o(a.getDate())} ${M(a)} – ${o(b.getDate())} ${M(b)} ${b.getFullYear()}`}
function headerInfo(text){const g=re=>{const m=text.match(re);return m?m[1].trim():""};
  return{lab:g(/Laboratory\s*:\s*(.+?(?:Sdn\.?\s*Bhd\.?|Ltd\.?|Inc\.?|Laboratories|Laboratory))/i)||g(/approval from\s+([^\n.]+)/i),reportNo:g(/Registration\s*No\.?\s*:?\s*([A-Z0-9][A-Z0-9\-\/]+)/i)||g(/Work\s*Order\s*:?\s*([A-Z0-9][A-Z0-9\-\/]+)/i)||g(/Report\s*No\.?\s*:?\s*([A-Z0-9][A-Z0-9\-\/]+)/i),dates:g(/Sampling\s*Date\s*:?\s*([^\n]+)/i).replace(/\s{2,}.*$/,"").replace(/(\d)\s+(st|nd|rd|th)\b/g,"$1$2")}}
async function readCoa(file){
  const bytes=await file.arrayBuffer(),ext=(file.name.split(".").pop()||"").toLowerCase();let pages;
  if(ext==="pdf"||file.type==="application/pdf")pages=await pagesFromPdf(bytes);
  else if(["xlsx","xls","csv"].includes(ext))pages=await pagesFromSheet(bytes);
  else if(file.type.startsWith("image/"))pages=await pagesFromImage(file);
  else throw new Error("Unsupported file type");
  let rows=[],text="",layout={row:0,matrix:0};
  pages.forEach(p=>{const a=parsePage(p),b=parseMatrix(p),use=b.rows.length>a.rows.length?b:a;layout[use===b?"matrix":"row"]+=use.rows.length;rows=rows.concat(use.rows);text+=a.text+"\n"});
  const info=headerInfo(text);const dr=dateRange(rows.map(r=>r.date).filter(Boolean));if(dr)info.dates=dr;
  return{rows,info,bytes,layout:layout.matrix>layout.row?"columns":"rows"}}
const normP=s=>String(s||"").toLowerCase().replace(/^\*+/,"").replace(/\((respirable|inhalable|total)\)/g," $1 ").replace(/particulate|fraction|[()*,]/g," ").replace(/\s+/g," ").trim();
function mapParam(name,method){if(!name)return"";const n=normP(name);
  let p=st.params.find(p=>normP(p.name)===n)||st.params.find(p=>{const a=normP(p.name);return a.includes(n)||n.includes(a)})||st.params.find(p=>{const a=normP(p.name).split(" ");return n.split(" ").every(w=>a.includes(w))});
  if(!p&&method){const code=(method.match(/\b(NIOSH|OSHA|MDHS)\s*\d+/i)||[""])[0].toLowerCase();if(code)p=st.params.find(p=>(p.method||"").toLowerCase().includes(code))}
  return p?p.name:null}
$("#coaIn").onchange=e=>{const fl=e.target.files[0];e.target.value="";if(fl)handleCoa(fl)};
const drop=$("#drop");drop.ondragover=e=>{e.preventDefault();drop.classList.add("over")};drop.ondragleave=()=>drop.classList.remove("over");
drop.ondrop=e=>{e.preventDefault();drop.classList.remove("over");const fl=e.dataTransfer.files[0];if(fl)handleCoa(fl)};
let pending=null;
async function handleCoa(fl){busy(true,"Reading CoA…");
  try{const r=await readCoa(fl);busy(false);pending={...r,file:fl};showReview()}catch(err){busy(false);console.error(err);toast("Couldn't read this file: "+err.message,5000)}}
function showReview(){
  const P=pending,R=P.rows,box=$("#review");box.style.display="block";
  if(!R.length){box.innerHTML=`<div class="note">No sample results were found in <b>${esc(P.file.name)}</b>. If it's a scan, try a clearer photo or the lab's original PDF. You can still attach it as Appendix G and type the masses in yourself.</div>
    <div class="row"><button class="pri" id="rvAttach">Attach as Appendix G only</button><button id="rvCancel">Cancel</button></div>`;
    $("#rvAttach").onclick=async()=>{await attachCoa();box.style.display="none"};$("#rvCancel").onclick=()=>box.style.display="none";return}
  const kk=s=>String(s||"").replace(/\s+/g,"").toUpperCase();
  R.forEach(r=>{if(!r.point){const ex=st.rows.find(x=>x.point&&(kk(x.sample)===kk(r.sample)||(r.labId&&kk(x.sample)===kk(r.labId))));if(ex){r.point=ex.point;r.known=1}}});
  R.forEach(r=>{if(r.include===undefined)r.include=r.point!=="Blank";r.mapped=mapParam(r.param,r.method);if(!r.mapped){const d=dbFind(r.param);r.db=d?d.i:null}});
  const fresh=[...new Set(R.filter(r=>!r.mapped&&r.param).map(r=>r.param))];
  const freshTxt=fresh.map(n=>{const d=DB.find(e=>e.i===(R.find(r=>r.param===n)||{}).db);return d?`<b>${esc(n)}</b> → found in Schedule I (${esc(d.n)}: ${[nnum(d.ppm)!=null?d.ppm+" ppm":"",nnum(d.mg)!=null?d.mg+" mg/m³":""].filter(Boolean).join(" / ")})`:`<b>${esc(n)}</b> → not in Schedule I, so enter the PEL yourself`}).join("<br>");
  const hasLab=R.some(r=>r.labId),noPts=R.some(r=>!r.point);
  box.innerHTML=`<div class="ok">Found <b>${R.length}</b> results in <b>${esc(P.file.name)}</b>${P.info.lab?` from <b>${esc(P.info.lab)}</b>`:""} (${[...new Set(R.map(r=>r.param))].filter(Boolean).length} parameter${[...new Set(R.map(r=>r.param))].length>1?"s":""}, ${P.layout==="columns"?"samples-in-columns layout":"samples-in-rows layout"}). Blanks are unticked. Check the values, then add them.</div>
   ${noPts?`<div class="note">This CoA doesn't say which worker or point each sample belongs to. Type the point (P1, P2…) for each sample, or <button class="sm" id="rvAutoPt">number them P1, P2, … in order</button>. Samples already in your sample table are matched by sample code or lab no., so their points are kept.</div>`:""}
   ${fresh.length?`<div class="note">New parameter${fresh.length>1?"s":""} will be added:<br>${freshTxt}</div>`:""}
   ${(P.info.reportNo||P.info.dates)?`<label class="toggle"><input type="checkbox" id="rvInfo" checked><span>Also fill Report info from the CoA where empty: ${P.info.reportNo?`Report No. <b>${esc(P.info.reportNo)}</b>`:""} ${P.info.dates?` · Monitoring date <b>${esc(P.info.dates)}</b>`:""}</span></label>`:""}
   <div class="ts" style="max-height:420px;margin-top:8px"><table><tr><th>Add</th><th>Point</th><th>Lab parameter</th><th>→ Your parameter</th><th>Sample ID</th>${hasLab?"<th>Lab no.</th>":""}<th>Result (µg/sample)</th><th>Method</th></tr>
   ${R.map((r,i)=>`<tr class="${r.point==="Blank"?"blank":""}"><td><input type="checkbox" data-rv="${i}" data-k="include" ${r.include?"checked":""}></td>
    <td><input data-rv="${i}" data-k="point" value="${esc(r.point)}" style="width:70px"></td><td>${esc(r.param)||"–"}</td>
    <td>${r.mapped?esc(r.mapped):`<span class="pill p-warn">new: ${esc(r.param)||"?"}</span>`}</td>
    <td><input data-rv="${i}" data-k="sample" value="${esc(r.sample)}" style="width:100px"></td>${hasLab?`<td class="muted" style="font-size:12px">${esc(r.labId)}</td>`:""}<td><input data-rv="${i}" data-k="mass" value="${esc(r.mass)}" style="width:90px"></td><td class="muted" style="font-size:12px">${esc(r.method)}</td></tr>`).join("")}</table></div>
   <div class="row" style="margin-top:10px"><button class="pri" id="rvApply">Add to sample data</button><button id="rvCancel">Cancel</button></div>`;
  $$("[data-rv]").forEach(el=>el.onchange=()=>{const r=R[+el.dataset.rv];r[el.dataset.k]=el.type==="checkbox"?el.checked:el.value});
  $("#rvCancel").onclick=()=>{box.style.display="none";pending=null};$("#rvApply").onclick=applyCoa;
  const ap=$("#rvAutoPt");if(ap)ap.onclick=()=>{let n=Math.max(0,...st.rows.concat(R).map(x=>+(String(x.point||"").match(/^P(\d+)$/i)||[0,0])[1]));R.forEach(r=>{if(r.point!=="Blank"&&!r.point)r.point="P"+(++n)});showReview()};
}
async function applyCoa(){
  const P=pending,R=P.rows.filter(r=>r.include);let upd=0,add=0;
  if($("#rvInfo")?.checked){if(!st.info.reportNo&&P.info.reportNo)st.info.reportNo=P.info.reportNo;if(!st.info.dates&&P.info.dates)st.info.dates=P.info.dates}
  const key=s=>String(s||"").replace(/\s+/g,"").toUpperCase();
  R.forEach(r=>{let pn=r.mapped;
    if(!pn){const label=(r.param||"Unknown parameter").replace(/^\*+/,"").trim();pn=label;
      if(!st.params.some(p=>p.name===pn)){const d=r.db!=null?DB.find(e=>e.i===r.db):null;const np=d?fromDb(d,label):{name:label,method:"",media:"",pel:"",src:""};
        if(r.method)np.method=r.method;st.params.push(np)}}
    const lp=param(pn);if(lp&&r.method&&(!lp.method||/^NIOSH \d{4}( \/ \d{4})?$/.test(lp.method)))lp.method=r.method;
    const same=x=>key(x.sample)===key(r.sample)||(r.labId&&key(x.sample)===key(r.labId));
    let row=st.rows.find(x=>same(x)&&x.param===pn)||st.rows.find(x=>same(x)&&(!x.param||!x.mass));
    if(row){row.mass=r.mass;row.param=pn;if(!row.point&&r.point)row.point=r.point;if(r.labId)row.labId=r.labId;upd++}
    else{const prev=[...st.rows].reverse().find(x=>x.param===pn)||{};
      st.rows.push({point:r.point,param:pn,sample:r.sample,labId:r.labId||"",period:"",fc:prev.fc||"",t:"",mass:r.mass});add++}});
  const order=st.params.map(p=>p.name);st.rows.sort((a,b)=>((order.indexOf(a.param)+1||99)-(order.indexOf(b.param)+1||99))||ptSort(a.point,b.point));
  await attachCoa();$("#review").style.display="none";pending=null;save();renderInfo();renderAll();
  toast(`${add} samples added, ${upd} updated. Now enter the field data (period, fc, t, temperatures).`,5000)}
async function attachCoa(){const P=pending;if(!P)return;const id=uid();
  await idb.put("file:"+id,{name:P.file.name,type:P.file.type||"application/pdf",data:P.bytes});
  (st.att.G=st.att.G||[]).push({id,name:P.file.name,type:P.file.type||"application/pdf"});save();renderAtt()}

/* ---------------- appendices ---------------- */
const title=t=>t.toLowerCase().replace(/(^|\s)\w/g,c=>c.toUpperCase());
function renderAtt(){
  $("#att").innerHTML=APPX.map(([L,T])=>{const fs=st.att[L]||[];
    if(L==="F")return `<div class="card"><b>Appendix ${L}: ${title(T)}</b><div class="muted" style="font-size:12.5px;margin-top:6px">Generated automatically from the calculation sheet.</div></div>`;
    return `<div class="card"><div class="row" style="justify-content:space-between"><b>Appendix ${L}: ${title(T)}</b>
    <label class="filebtn noP">+ Add file<input type="file" data-up="${L}" accept=".pdf,image/png,image/jpeg,image/webp" multiple></label></div>
    ${fs.length?`<ul>${fs.map(x=>`<li>${esc(x.name)} <button class="sm noP" data-rm="${L}:${x.id}">remove</button></li>`).join("")}</ul>`:`<div class="muted" style="font-size:12.5px;margin-top:6px">${L==="G"?"Your uploaded CoA is attached here automatically.":"No file yet"}</div>`}</div>`}).join("");
  $$("[data-up]").forEach(inp=>inp.onchange=async()=>{const L=inp.dataset.up;for(const fl of inp.files){const id=uid();await idb.put("file:"+id,{name:fl.name,type:fl.type,data:await fl.arrayBuffer()});(st.att[L]=st.att[L]||[]).push({id,name:fl.name,type:fl.type})}save();renderAtt();toast("Attached to Appendix "+L)});
  $$("[data-rm]").forEach(b=>b.onclick=async()=>{const [L,id]=b.dataset.rm.split(":");st.att[L]=(st.att[L]||[]).filter(x=>x.id!==id);await idb.del("file:"+id);save();renderAtt()});
  renderReadiness();
}
function renderReadiness(){if(typeof renderSavePreview==="function")renderSavePreview();const el=$("#readiness");if(!el)return;const G=groups().filter(g=>g.point!=="Blank"),miss=[];
  if(!st.info.client)miss.push("client name");
  if(!G.length)miss.push("sample data");else if(G.some(g=>!g.complete))miss.push("field data for "+G.filter(g=>!g.complete).length+" point/parameter group(s)");
  const noPel=[...new Set(G.filter(g=>g.pel==null).map(g=>g.param))];if(noPel.length)miss.push("PEL for "+noPel.join(", "));
  if(!st.ctl.eng.length&&!st.ctl.adm.length&&!st.ctl.rpe)miss.push("existing control measures (section 3)");
  const noAtt=APPX.filter(([L])=>L!=="F"&&!(st.att[L]||[]).length).map(([L])=>L);
  el.innerHTML=(miss.length?`<div class="note">Still missing: ${miss.map(esc).join(" · ")}. You can still download a draft.</div>`:`<div class="ok">Report data is complete.</div>`)+
   (noAtt.length?`<div class="muted" style="font-size:12.5px">No file yet for Appendix ${noAtt.join(", ")}. Those appendices will show “No document attached”.</div>`:"")}
