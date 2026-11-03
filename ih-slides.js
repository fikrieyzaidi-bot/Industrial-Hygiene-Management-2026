/* Noise & CHRA — client results presentation (.pptx), same look as the CEM deck (PptxGenJS) */
(function(){
const NAVY="1F3864",TEAL="2F5673",INK="1D2A35",MUTE="64748B",LINE="D8E0E7",RED="C0392B",AMB="B7791F",GRN="2E8B57",BG="F4F7FA",PUR="6B3FA0";
const b64=buf=>{let s="",u=new Uint8Array(buf);for(let i=0;i<u.length;i+=0x8000)s+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000));return btoa(s)};
const durl=p=>`data:${p.type||"image/jpeg"};base64,${b64(p.data)}`;
const clip=(s,n)=>{s=String(s||"").replace(/\s+/g," ").trim();return s.length>n?s.slice(0,n-1).replace(/\s+\S*$/,"")+"…":s};
const sentences=t=>String(t||"").split(/\n+/).flatMap(l=>l.split(/(?<=\.)\s+(?=[A-Z])/)).map(x=>x.replace(/^[-•\d.)\s]+/,"").trim()).filter(x=>x.length>12);
const W=13.33,H=7.5;
const TH=t=>({text:t,options:{bold:true,color:"FFFFFF",fill:{color:TEAL}}});
async function deck(I,kind,footer){
  if(!window.PptxGenJS){toast("Presentation library not loaded – check your internet connection.");return null}
  const pres=new PptxGenJS();pres.layout="LAYOUT_WIDE";pres.company=I.consName||"";
  const logo=await getLogo(I);
  pres.defineSlideMaster({title:"BODY",background:{color:"FFFFFF"},objects:[{rect:{x:0,y:0,w:W,h:0.9,fill:{color:NAVY}}},{rect:{x:0,y:H-0.4,w:W,h:0.4,fill:{color:BG}}},
    {text:{text:footer,options:{x:0.4,y:H-0.38,w:9,h:0.34,fontSize:9,color:MUTE,fontFace:"Arial"}}}],slideNumber:{x:W-1.0,y:H-0.38,w:0.6,h:0.34,fontSize:9,color:MUTE,fontFace:"Arial"}});
  const D={pres,logo,
    S(title){const s=pres.addSlide({masterName:"BODY"});s.addText(title,{x:0.4,y:0.12,w:W-2.4,h:0.66,fontSize:24,bold:true,color:"FFFFFF",fontFace:"Arial"});
      if(logo)s.addImage({data:durl(logo),x:W-1.75,y:0.13,w:1.4,h:0.64,sizing:{type:"contain",w:1.4,h:0.64}});return s},
    bullets(s,items,o={}){s.addText(items.map(t=>({text:t,options:{bullet:{indent:18},breakLine:true}})),{x:o.x??0.6,y:o.y??1.2,w:o.w??W-1.2,h:o.h??5.6,fontSize:o.fs??17,color:INK,fontFace:"Arial",valign:"top",paraSpaceAfter:8})},
    table(s,rows,o){s.addTable(rows,{x:0.4,y:1.15,w:W-0.8,fontSize:12,fontFace:"Arial",color:INK,border:{type:"solid",color:LINE,pt:0.75},valign:"middle",autoPage:false,...o})},
    boxes(s,items,y=1.2){const n=items.length,w=(W-1.2-(n-1)*0.2)/n;items.forEach(([l,v,c],i)=>{const x=0.6+i*(w+0.2);s.addShape(pres.ShapeType.roundRect,{x,y,w,h:1.3,fill:{color:BG},line:{color:c,width:1.5},rectRadius:0.08});
      s.addText([{text:String(v),options:{fontSize:30,bold:true,color:c,breakLine:true}},{text:l,options:{fontSize:12,color:MUTE}}],{x,y,w,h:1.3,align:"center",valign:"middle",fontFace:"Arial"})})},
    cover(title,sub,rows){const s=pres.addSlide();s.background={color:"FFFFFF"};s.addShape(pres.ShapeType.rect,{x:0,y:0,w:4.3,h:H,fill:{color:NAVY}});
      if(logo)s.addImage({data:durl(logo),x:0.5,y:0.6,w:3.3,h:1.5,sizing:{type:"contain",w:3.3,h:1.5}});
      s.addText([{text:(I.consName||"").toUpperCase(),options:{bold:true,breakLine:true}},{text:[I.consAddr,I.consTel,I.consEmail].filter(Boolean).join("\n"),options:{fontSize:10}}],{x:0.4,y:4.6,w:3.5,h:2.4,fontSize:12,color:"FFFFFF",fontFace:"Arial",valign:"bottom"});
      s.addText(title,{x:4.8,y:1.1,w:8,h:0.6,fontSize:16,bold:true,color:TEAL,fontFace:"Arial",charSpacing:2});
      s.addText(sub,{x:4.8,y:1.7,w:8,h:1.0,fontSize:40,bold:true,color:INK,fontFace:"Arial"});
      s.addText(I.client||"Client",{x:4.8,y:2.9,w:8,h:0.9,fontSize:22,bold:true,color:INK,fontFace:"Arial",valign:"top"});
      s.addText([I.locName&&I.locName!==I.client?I.locName:"",String(I.address||"").replace(/\n/g," ")].filter(Boolean).join("\n"),{x:4.8,y:3.8,w:8,h:0.9,fontSize:13,color:MUTE,fontFace:"Arial",valign:"top"});
      s.addTable(rows.map(([k,v])=>[{text:k,options:{bold:true}},v||"–"]),{x:4.8,y:4.9,w:7.6,colW:[2.2,5.4],fontSize:13,fontFace:"Arial",color:INK,border:{type:"none"},valign:"top"})},
    agenda(items){const s=D.S("Agenda");items.forEach((t,i)=>{const y=1.2+i*(items.length>8?0.6:0.68);s.addShape(pres.ShapeType.ellipse,{x:0.8,y,w:0.48,h:0.48,fill:{color:i%2?TEAL:NAVY}});
      s.addText(String(i+1),{x:0.8,y,w:0.48,h:0.48,fontSize:13,bold:true,color:"FFFFFF",align:"center",valign:"middle",fontFace:"Arial"});s.addText(t,{x:1.5,y,w:10,h:0.48,fontSize:19,color:INK,fontFace:"Arial",valign:"middle"})})},
    async photos(s,ids,x,y,w,h,max=3){for(let i=0;i<Math.min(ids.length,max);i++){const p=await fileDB.get("photo:"+ids[i]).catch(()=>null);if(p)s.addImage({data:durl(p),x,y:y+i*(h+0.1),w,h,sizing:{type:"contain",w,h}})}},
    thanks(){const s=pres.addSlide();s.background={color:NAVY};s.addText("Thank you",{x:0,y:2.0,w:W,h:1.1,fontSize:44,bold:true,color:"FFFFFF",align:"center",fontFace:"Arial"});
      s.addText("Questions & Answers",{x:0,y:3.1,w:W,h:0.7,fontSize:24,color:"CFE0EE",align:"center",fontFace:"Arial"});
      s.addText([I.assessor,I.consName,[I.consTel,I.consEmail].filter(Boolean).join("  |  ")].filter(Boolean).join("\n"),{x:0,y:4.4,w:W,h:1.4,fontSize:14,color:"FFFFFF",align:"center",fontFace:"Arial"});
      if(logo)s.addImage({data:durl(logo),x:W/2-1,y:6.0,w:2,h:0.9,sizing:{type:"contain",w:2,h:0.9}})},
    async save(name){await pres.writeFile({fileName:name.replace(/[\\/:*?"<>|]/g,"")});toast("Presentation downloaded")}};
  return D}

/* ================= NOISE ================= */
window.buildNoiseDeck=async function(){const I=st.info,a=analyse();toast("Building presentation…",3000);
 try{const D=await deck(I,"noise",`${clip(I.client,60)}  |  ${I.type||""} Noise Risk Assessment  |  ${I.reportNo||""}`);if(!D)return;const {pres}=D;
  const zc=z=>z==="Purple"?PUR:z==="Red"?RED:z==="Yellow"?AMB:GRN,pc=r=>r.nel||r.emx||r.epk?RED:r.excessive?AMB:GRN;
  D.cover(`${(I.type||"").toUpperCase()} NOISE RISK ASSESSMENT`,"Results Briefing",[["Monitoring date",I.dates],["Report no.",I.reportNo],["Presented by",`${I.assessor||"–"}${I.assessorReg?` (${I.assessorReg})`:""}\nNoise Risk Assessor`]]);
  D.agenda(["Introduction & scope","Noise exposure limits","Methodology & instruments","Area noise results","Personal noise exposure results","Key findings & existing controls","Recommendations & Hearing Conservation Programme","Summary","Questions & answers"]);
  let s=D.S("Introduction");D.bullets(s,[`${I.type||""} Noise Risk Assessment at ${I.client||"the client"} – ${I.workplace||"workplace"}, carried out on ${I.dates||"–"}.`,
    "Required under Regulation 4, Occupational Safety and Health (Noise Exposure) Regulations 2019, by a DOSH-registered Noise Risk Assessor.",
    "Objectives: identify noise sources and levels, evaluate personal noise exposure of each Similar Exposure Group (SEG), and recommend control measures.",
    `Scope: ${a.A.length} area noise sources measured and mapped; ${a.n} employees monitored over the full shift, representing ${st.seg.length} SEGs (${st.seg.reduce((x,g)=>x+(num(g.n)||0),0)} workers).`,
    `Assessor: ${I.assessor||"–"}${I.assessorReg?` (${I.assessorReg})`:""}.`]);
  s=D.S("Noise Exposure Limits (Regulation 6)");
  D.table(s,[[TH("Parameter"),TH("Limit"),TH("Meaning")],["Excessive noise","LEX,8h > 82 dB(A) or dose > 50%","Hearing conservation training & audiometric testing required"],["Daily Noise Exposure Limit (NEL)","LEX,8h > 85 dB(A) / dose 100%","Noise control programme; PHP mandatory"],["Maximum SPL","> 115 dB(A) at any time","Must not be exceeded"],["Peak SPL","> 140 dB(C)","Must not be exceeded"]],{colW:[3.3,3.6,5.63],fontSize:14});
  [["≤ 82 dB(A)","White",GRN],["82–85 dB(A)","Yellow",AMB],["85–115 dB(A)","Red",RED],["> 115 dB(A) / 140 dB(C)","Purple",PUR]].forEach(([l,z,c],i)=>{const x=0.6+i*3.1;s.addShape(pres.ShapeType.roundRect,{x,y:4.6,w:2.9,h:1.2,fill:{color:BG},line:{color:c,width:2},rectRadius:0.08});
    s.addText([{text:z+" zone",options:{bold:true,color:c,fontSize:16,breakLine:true}},{text:l,options:{fontSize:12,color:MUTE}}],{x,y:4.6,w:2.9,h:1.2,align:"center",valign:"middle",fontFace:"Arial"})});
  s=D.S("Methodology & Instruments");
  D.bullets(s,["Area noise: sound level meter at 1 m from source, ≥ 3 readings (Min, Max, L(average)); energy average used for colour zoning.","Personal noise: dosimeter on the shoulder, full shift; 3 dB exchange rate, A-weighting, C-peak, 80 dB(A) threshold.","Instruments field-calibrated before and after (±0.5 dB); IEC 61672-1 / IEC 61252 / IEC 60942."],{w:5.6,fs:15});
  const E=st.inst.slice(0,4);for(let i=0;i<E.length;i++){const e=E[i],x=6.6+(i%2)*3.3,y=1.2+Math.floor(i/2)*2.9;s.addShape(pres.ShapeType.roundRect,{x,y,w:3.1,h:2.7,fill:{color:BG},line:{color:LINE},rectRadius:0.08});
    const ph=(e.photos||[])[0]?await fileDB.get("photo:"+e.photos[0]).catch(()=>null):null;if(ph)s.addImage({data:durl(ph),x:x+0.15,y:y+0.12,w:2.8,h:1.6,sizing:{type:"contain",w:2.8,h:1.6}});
    s.addText([{text:e.inst||"Instrument",options:{bold:true,breakLine:true}},{text:clip(`${e.mfr||""} ${e.model||""} · S/N ${e.id||"–"} · Cal. ${e.cal||"–"}`,90),options:{fontSize:9,color:MUTE}}],{x:x+0.1,y:y+1.75,w:2.9,h:0.9,fontSize:11,color:INK,fontFace:"Arial",valign:"top"})}
  if(st.inst.length>4)s.addText(`+ ${st.inst.length-4} more instruments in Table 3 of the report.`,{x:6.6,y:6.65,w:6,h:0.3,fontSize:10,color:MUTE,fontFace:"Arial",italic:true});
  if(a.A.length){s=D.S("Area Noise Results");const A=[...a.A].filter(x=>x.avgN!=null).sort((x,y)=>y.avgN-x.avgN).slice(0,14);
    s.addChart(pres.ChartType.bar,[{name:"Avg dB(A)",labels:A.map(x=>clip(x.src.replace(/\s*\(.*\)/,""),38)),values:A.map(x=>+f1(x.avgN))}],{x:0.4,y:1.1,w:8.6,h:5.8,barDir:"bar",chartColors:A.map(x=>zc(x.z)),
      valAxisMinVal:50,valAxisMaxVal:Math.max(120,Math.ceil(A[0].avgN/10)*10),catAxisLabelFontSize:9,valAxisLabelFontSize:10,showValue:true,dataLabelFontSize:9,dataLabelFormatCode:"0.0",catAxisOrientation:"maxMin",valGridLine:{color:"E6EBF0",size:0.5}});
    s.addShape(pres.ShapeType.roundRect,{x:9.3,y:1.2,w:3.6,h:1.4,fill:{color:BG},line:{color:RED,width:1.5},rectRadius:0.08});s.addText([{text:String(a.aRed.length),options:{fontSize:32,bold:true,color:RED,breakLine:true}},{text:"sources > 85 dB(A) (Red zone)",options:{fontSize:12,color:MUTE}}],{x:9.3,y:1.2,w:3.6,h:1.4,align:"center",valign:"middle",fontFace:"Arial"});
    s.addText([{text:`${a.aExc.length} of ${a.A.length} sources > 82 dB(A)`,options:{bold:true,breakLine:true}},{text:`${a.aRed.length} in Red zone${a.aPur.length?`, ${a.aPur.length} Purple`:""}`,options:{breakLine:true}},{text:"Red/Purple zones → Hearing Protection Zone signs",options:{color:MUTE,fontSize:12}}],{x:9.3,y:2.8,w:3.6,h:2,fontSize:15,color:INK,fontFace:"Arial",valign:"top"})}
  s=D.S("Personal Noise Exposure Results");const yn=b=>b?{text:"YES",options:{bold:true,color:RED}}:"no";
  D.table(s,[[TH("SEG"),TH("Employee"),TH("LEX,8h dB(A)"),TH("Dose %"),TH("Max dB(A)"),TH("Peak dB(C)"),TH(">82"),TH(">85"),TH(">115"),TH(">140")],...a.P.slice(0,12).map(p=>[clip(segShort(p.seg),24),clip(p.name,24),{text:f1(p.r.lex),options:{bold:true,color:pc(p.r)}},f1(p.r.dose),f1(p.r.mx),f1(p.r.pk),yn(p.r.e82),yn(p.r.nel),yn(p.r.emx),yn(p.r.epk)])],{colW:[2.6,2.8,1.4,1.0,1.1,1.1,0.62,0.62,0.62,0.65],fontSize:a.P.length>9?11:12});
  if(a.P.length){s=D.S("Daily Noise Exposure (LEX,8h) by Employee");
    s.addChart(pres.ChartType.bar,[{name:"LEX,8h",labels:a.P.map(p=>clip(`${segShort(p.seg)} – ${p.name}`,26)),values:a.P.map(p=>+f1(p.r.lex))}],{x:0.5,y:1.1,w:W-1,h:5.6,barDir:"col",chartColors:a.P.map(p=>pc(p.r)),
      valAxisMinVal:60,valAxisMaxVal:95,catAxisLabelFontSize:9,catAxisLabelRotate:-30,valAxisLabelFontSize:10,showValue:true,dataLabelFontSize:10,dataLabelFormatCode:"0.0",valGridLine:{color:"E6EBF0",size:0.5}});
    s.addText("NEL = 85 dB(A)  ·  Excessive noise = 82 dB(A)   ■ above NEL/Max/Peak   ■ excessive   ■ below 82 dB(A)",{x:0.6,y:6.65,w:10,h:0.3,fontSize:10,color:MUTE,fontFace:"Arial"})}
  s=D.S("Key Findings");D.boxes(s,[["> 82 dB(A)",a.c82,AMB],["> NEL 85 dB(A)",a.cnel,RED],["> Max 115 dB(A)",a.cmx,RED],["> Peak 140 dB(C)",a.cpk,PUR]]);
  const S2=segRows(a);D.bullets(s,[...S2.filter(x=>x.lim.length).map(x=>clip(`${x.g.seg}: LEX,8h ${f1(x.w.r.lex)} dB(A), Max ${f1(x.w.r.mx)}, Peak ${f1(x.w.r.pk)} – above ${listTxt(x.lim.map(l=>l.replace(/^the /,"").replace(/ \(.*\)/,"")))}${x.srcs.length?`; main sources: ${x.srcs.join(", ").toLowerCase()}`:""}`,170)),
    ...(S2.filter(x=>!x.lim.length).length?[`Below all limits: ${S2.filter(x=>!x.lim.length).map(x=>x.g.seg).join(", ")}.`]:[])],{y:2.8,h:3.9,fs:14});
  s=D.S("Existing Controls & PHP Adequacy");const col=(x,t,items)=>{s.addShape(pres.ShapeType.roundRect,{x,y:1.2,w:3.95,h:5.4,fill:{color:BG},line:{color:LINE},rectRadius:0.08});
    s.addText(t,{x:x+0.2,y:1.3,w:3.6,h:0.5,fontSize:16,bold:true,color:TEAL,fontFace:"Arial"});s.addText((items.length?items:["None observed"]).map(v=>({text:clip(v,120),options:{bullet:{indent:14},breakLine:true}})),{x:x+0.2,y:1.85,w:3.6,h:4.6,fontSize:13,color:INK,fontFace:"Arial",valign:"top",paraSpaceAfter:6})};
  const nrr=num(I.phpNrr),ins=a.P.filter(p=>p.r.lexA!=null&&!p.r.phpOk);
  col(0.5,"Engineering",st.ctl.eng);col(4.65,"Administrative / signs",[...st.ctl.adm,...st.ctl.warn]);
  col(8.8,"Hearing protection",[...st.php.map(p=>`Issued: ${p.model} (NRR ${p.nrr})${/n\/?a|unbrand/i.test(p.nrr+p.model)?" – attenuation not verifiable":""}`),nrr!=null?`Recommended: ${I.phpModel} (NRR ${nrr} dB, derated ${f1((nrr-7)/2)} dB)`:"",nrr!=null?(ins.length?`Not sufficient for ${ins.map(p=>p.name).join(", ")} – use double protection`:`With recommended PHP all workers below NEL (LEX ${f1(Math.min(...a.P.map(p=>p.r.lexA)))}–${f1(Math.max(...a.P.map(p=>p.r.lexA)))} dB(A))`):"","PHP must be SIRIM-DOSH approved"].filter(Boolean));
  s=D.S("Recommendations");const rp=(st.textPhotos||{}).rec||[],rs=sentences(textOf("rec",a)).slice(0,6).map(x=>clip(x,180));D.bullets(s,rs,{w:rp.length?8.2:W-1.2,fs:15});await D.photos(s,rp,9.1,1.2,3.8,1.75);
  s=D.S("Hearing Conservation Programme");const ex=a.sexc;
  D.table(s,[[TH("Element"),TH("Requirement"),TH("Applies to")],["Noise control","Engineering control at source; exposure time per Table 14",a.snel.join(", ")||"–"],["Personal Hearing Protector",`${I.phpModel||"Approved PHP"} (NRR ${I.phpNrr||"–"} dB), SIRIM-DOSH approved, worn in HPZ`,ex.join(", ")||"–"],["Hearing conservation training","Annually (Reg. 13)",ex.join(", ")||"–"],["Audiometric testing","Annually; baseline within 3 months (Reg. 15)",ex.join(", ")||"–"],["Hearing Protection Zone","Signs at Red / Purple zones (Reg. 11)",`${a.aRed.length} area source(s)`],["Review","NRA review within 5 years or upon change (Reg. 4(5))","Whole workplace"]],{colW:[3.2,5.6,3.73],fontSize:13});
  s=D.S("Summary");const st2=S2.map(x=>({n:x.g.seg,t:x.ps.some(p=>p.r.nel||p.r.emx||p.r.epk)?"over":x.ps.some(p=>p.r.excessive)?"exc":"ok",v:f1(x.w.r.lex)}));
  st2.slice(0,9).forEach((x,i)=>{const y=1.15+i*0.58,c=x.t==="over"?RED:x.t==="exc"?AMB:GRN;s.addShape(pres.ShapeType.roundRect,{x:0.6,y,w:7.6,h:0.5,fill:{color:x.t==="over"?"F9E0DD":x.t==="exc"?"FDF1D8":"E3F4EA"},line:{color:c},rectRadius:0.05});
    s.addText([{text:x.n,options:{bold:true}},{text:`  ${x.v} dB(A) – ${x.t==="over"?"above NEL / Max / Peak":x.t==="exc"?"excessive noise (> 82 dB(A))":"below limits"}`}],{x:0.75,y,w:7.4,h:0.5,fontSize:13,color:INK,fontFace:"Arial",valign:"middle"})});
  D.bullets(s,["Implement the Hearing Conservation Programme for SEGs above 82 dB(A).","Prioritise engineering control of pneumatic tools and other dominant sources.","Issue SIRIM-DOSH approved PHP and enforce use in Hearing Protection Zones.","Review the NRA within 5 years or upon any change."],{x:8.5,y:1.15,w:4.4,h:5.4,fs:14});
  D.thanks();await D.save(`NRA Results Briefing - ${I.client||"report"}.pptx`)}
 catch(e){console.error(e);toast("Could not build the presentation: "+(e.message||e),6000)}};

/* ================= CHRA ================= */
window.buildChraDeck=async function(){const I=st.info,a=analyse(),T=a.T;toast("Building presentation…",3000);
 try{const D=await deck(I,"chra",`${clip(I.client,60)}  |  Chemical Health Risk Assessment  |  ${I.reportNo||""}`);if(!D)return;const {pres}=D;
  D.cover("CHEMICAL HEALTH RISK ASSESSMENT (CHRA)","Results Briefing",[["Assessment date",I.assessDate],["Report no.",I.reportNo],["Presented by",`${I.assessor||"–"}${I.assessorReg?` (${I.assessorReg})`:""}\nCHRA Assessor`]]);
  D.agenda(["Introduction & scope","CHRA methodology","Work units assessed","Hazard identification","Risk assessment results","Key findings & adequacy of controls","Recommendations & action priority","Exposure monitoring & medical surveillance","Summary","Questions & answers"]);
  let s=D.S("Introduction");D.bullets(s,[`${(I.nth||"").replace(/^./,c=>c.toUpperCase())} CHRA for ${I.client||"the client"}, assessed on ${I.assessDate||"–"}.`,
    "Required under Part IV, OSH (Use and Standards of Exposure of Chemicals Hazardous to Health) Regulations 2000 (USECHH), using the DOSH CHRA Manual 3rd Edition (2018).",
    "Objectives: identify chemical hazards, evaluate exposure by inhalation, skin and ingestion, assess adequacy of controls, conclude risk and recommend action.",
    `Scope: ${st.wus.length} work units and ${T.nchem} chemicals (including mixtures, chemicals released and scheduled wastes).`,
    `Assessor: ${I.assessor||"–"}${I.assessorReg?` (${I.assessorReg})`:""}${I.assistant?`, assisted by ${I.assistant}`:""}.`]);
  s=D.S("CHRA Methodology");const steps=[["1","Hazard rating (HR 1–5)","From GHS classification on the SDS"],["2","Exposure rating (ER)","FDR = (FR+DR)/2 ; ER = (FDR+MR)/2"],["3","Risk rating","RR = HR × ER : Low 1–4 · Moderate 5–12 · High 15–25"],["4","Dermal risk","Hazard property × extent × duration (H / M / L)"],["5","Adequacy of controls","Technical, organisational, emergency response"],["6","Action priority","AP1 high & inadequate · AP2 inadequate · AP3 adequate"]];
  steps.forEach(([n,t,d],i)=>{const x=0.6+(i%3)*4.1,y=1.3+Math.floor(i/3)*2.7;s.addShape(pres.ShapeType.roundRect,{x,y,w:3.9,h:2.4,fill:{color:BG},line:{color:LINE},rectRadius:0.08});
    s.addText(n,{x:x+0.2,y:y+0.2,w:0.6,h:0.6,fontSize:20,bold:true,color:"FFFFFF",align:"center",valign:"middle",fill:{color:i%2?TEAL:NAVY}});
    s.addText([{text:t,options:{bold:true,fontSize:16,breakLine:true}},{text:d,options:{fontSize:13,color:MUTE}}],{x:x+0.2,y:y+0.95,w:3.5,h:1.35,color:INK,fontFace:"Arial",valign:"top"})});
  s=D.S("Work Units Assessed");D.table(s,[[TH("No."),TH("Work unit"),TH("Work area"),TH("Workers (M/F)"),TH("Chemicals")],...a.W.map(({w,s:S},i)=>[i+1,w.name,clip(w.area,40),`${w.male||"–"} / ${w.female||"0"}`,S.nchem])],{colW:[0.8,4,4.2,1.8,1.73],fontSize:14});
  s=D.S("Hazard Identification");const hz=sentences(textOf("hazard",a)).slice(1,6).map(x=>clip(x,200));D.bullets(s,hz.length?hz:["See Section 4.1 of the report."],{fs:15});
  s=D.S("Risk Assessment Results");const c=(v,col)=>v?{text:String(v),options:{bold:true,color:col}}:String(v);
  D.table(s,[[TH("Work unit"),TH("Inh. High"),TH("Inh. Mod."),TH("Inh. Low"),TH("Derm. High"),TH("Derm. Mod."),TH("Derm. Low"),TH("Ingestion"),TH("AP1"),TH("AP2"),TH("AP3")],
    ...a.W.map(({w,s:S})=>[clip(w.name,28),c(S.inhH,RED),c(S.inhM,AMB),S.inhL,c(S.derH,RED),c(S.derM,AMB),S.derL,S.ing,c(S.ap1,RED),c(S.ap2,AMB),S.ap3]),
    [{text:"TOTAL",options:{bold:true}},T.inhH,T.inhM,T.inhL,T.derH,T.derM,T.derL,T.ing,T.ap1,T.ap2,T.ap3].map(x=>typeof x==="object"?x:{text:String(x),options:{bold:true}})],{colW:[3.2,0.95,0.95,0.95,1.0,1.0,1.0,1.0,0.8,0.8,0.88],fontSize:12});
  s=D.S("Risk Profile by Work Unit");const L=a.W.map(({w})=>clip(w.name,22));
  s.addChart(pres.ChartType.bar,[{name:"High",labels:L,values:a.W.map(({s:S})=>S.inhH+S.derH)},{name:"Moderate",labels:L,values:a.W.map(({s:S})=>S.inhM+S.derM)},{name:"Low",labels:L,values:a.W.map(({s:S})=>S.inhL+S.derL)}],
    {x:0.5,y:1.1,w:W-1,h:5.7,barDir:"bar",barGrouping:"stacked",chartColors:[RED,AMB,GRN],showLegend:true,legendPos:"b",catAxisLabelFontSize:11,valAxisLabelFontSize:10,catAxisOrientation:"maxMin",valGridLine:{color:"E6EBF0",size:0.5},valAxisTitle:"Number of exposure ratings (inhalation + dermal)",showValAxisTitle:true});
  s=D.S("Key Findings");D.boxes(s,[["High inhalation risk",T.inhH,RED],["High dermal risk",T.derH,RED],["Action Priority 1",T.ap1,RED],["Action Priority 2",T.ap2,AMB]]);
  const kf=sentences(textOf("risk",a)).slice(1,6).map(x=>clip(x,190));D.bullets(s,kf,{y:2.8,h:3.9,fs:14});
  s=D.S("Adequacy of Control Measures");const blk=(x,t,k)=>{s.addShape(pres.ShapeType.roundRect,{x,y:1.2,w:3.95,h:5.4,fill:{color:BG},line:{color:LINE},rectRadius:0.08});
    s.addText(t,{x:x+0.2,y:1.3,w:3.6,h:0.5,fontSize:16,bold:true,color:TEAL,fontFace:"Arial"});const L2=sentences(textOf(k,a)).slice(1,5).map(v=>clip(v,240));
    s.addText((L2.length?L2:["No issues recorded"]).map(v=>({text:v,options:{bullet:{indent:14},breakLine:true}})),{x:x+0.2,y:1.85,w:3.6,h:4.6,fontSize:11,color:INK,fontFace:"Arial",valign:"top",paraSpaceAfter:6})};
  blk(0.5,"Technical controls","tc");blk(4.65,"Organisational controls","oc");blk(8.8,"Emergency response","erp");
  s=D.S("Recommendations & Action Priority");const rp=(st.textPhotos||{}).rec||[],ap=[];a.W.filter(x=>!x.s.summaryOnly).forEach(({w,s:S})=>w.tc.forEach((t,i)=>{if(S.AP[i]===1||S.AP[i]===2)ap.push(`AP${S.AP[i]} – ${clip(String(t.chem).split("\n")[0],40)} (${w.name}): ${clip(String(t.rec).split("\n").filter(l=>!/continue|maintain/i.test(l)).map(l=>l.replace(/^\d+\)\s*/,"")).join("; "),110)}`)}));
  ap.sort();D.bullets(s,[...ap.slice(0,6),"All work units: safe handling procedures, PPE programme, SHOC training, updated chemical register & SDS, Reg. 29 warning signs."],{w:rp.length?8.2:W-1.2,fs:12});await D.photos(s,rp,9.1,1.2,3.8,1.75);
  s=D.S("Exposure Monitoring & Medical Surveillance");D.bullets(s,[...sentences(textOf("em",a)).slice(1,3),...sentences(textOf("ms",a)).slice(1,3)].map(x=>clip(x,220)),{fs:16});
  s=D.S("Summary");const hi=a.W.filter(x=>x.s.inhH||x.s.derH).map(x=>x.w.name);
  a.W.slice(0,9).forEach(({w,s:S},i)=>{const y=1.15+i*0.58,h=S.inhH||S.derH,col=h?RED:S.ap2?AMB:GRN;s.addShape(pres.ShapeType.roundRect,{x:0.6,y,w:7.6,h:0.5,fill:{color:h?"F9E0DD":S.ap2?"FDF1D8":"E3F4EA"},line:{color:col},rectRadius:0.05});
    s.addText([{text:w.name,options:{bold:true}},{text:`  – ${h?"SIGNIFICANT risk (high)":S.ap2?"moderate risk, controls to improve":"controls adequate"}`}],{x:0.75,y,w:7.4,h:0.5,fontSize:13,color:INK,fontFace:"Arial",valign:"middle"})});
  D.bullets(s,[`Risk is significant for ${hi.length} of ${st.wus.length} work units.`,`${T.ap1} AP1 and ${T.ap2} AP2 actions to be implemented within 1 month (USECHH Reg. 12).`,"Keep the report for 30 years.",`Reassess by ${I.nextReassess||"5 years"} or upon change.`],{x:8.5,y:1.15,w:4.4,h:5.4,fs:14});
  D.thanks();await D.save(`CHRA Results Briefing - ${I.client||"report"}.pptx`)}
 catch(e){console.error(e);toast("Could not build the presentation: "+(e.message||e),6000)}};
})();
