/* CEM — client results presentation (.pptx), built from the report loaded in the CEM page.
   Standard briefing structure: Cover · Agenda · Introduction · Limits & legal basis · Methodology & equipment ·
   Results table · Results chart · Key findings · Existing controls · Recommendations · Summary · Q&A */
(function(){
const NAVY="1F3864",TEAL="2F5673",INK="1D2A35",MUTE="64748B",LINE="D8E0E7",RED="C0392B",AMB="B7791F",GRN="2E8B57",BG="F4F7FA";
const b64=buf=>{let s="",u=new Uint8Array(buf);for(let i=0;i<u.length;i+=0x8000)s+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000));return btoa(s)};
const durl=p=>`data:${p.type||"image/jpeg"};base64,${b64(p.data)}`;
const clip=(s,n)=>{s=String(s||"").replace(/\s+/g," ").trim();return s.length>n?s.slice(0,n-1).replace(/\s+\S*$/,"")+"…":s};
const sentences=t=>String(t||"").split(/\n+/).flatMap(l=>l.split(/(?<=\.)\s+(?=[A-Z])/)).map(x=>x.replace(/^[-•\d.)\s]+/,"").trim()).filter(x=>x.length>12);
const stat=g=>g.cat==="over"?["Above limit",RED]:g.cat==="half"?["50–99%",AMB]:g.cat==="nd"?["Below detection",GRN]:["Below 50%",GRN];

async function buildDeck(){
  if(!window.PptxGenJS)return toast("Presentation library not loaded – check your internet connection.");
  const a=analyse(),I=st.info,G=a.G.filter(g=>g.complete),client=I.client||"Client";
  if(!G.length&&!confirm("No completed results yet. Create the presentation with the information entered so far?"))return;
  busy(true,"Building presentation…");
  try{
  const pres=new PptxGenJS();pres.layout="LAYOUT_WIDE";pres.title=`CEM results – ${client}`;pres.company=I.consName||"";
  const W=13.33,H=7.5,logo=I.logoName?await idb.get("logo").catch(()=>null):null;
  pres.defineSlideMaster({title:"BODY",background:{color:"FFFFFF"},objects:[
    {rect:{x:0,y:0,w:W,h:0.9,fill:{color:NAVY}}},
    {rect:{x:0,y:H-0.4,w:W,h:0.4,fill:{color:BG}}},
    {text:{text:`${clip(client,70)}  |  Chemical Exposure Monitoring  |  ${I.reportNo||""}`,options:{x:0.4,y:H-0.38,w:9,h:0.34,fontSize:9,color:MUTE,fontFace:"Arial"}}}],
    slideNumber:{x:W-1.0,y:H-0.38,w:0.6,h:0.34,fontSize:9,color:MUTE,fontFace:"Arial"}});
  const S=title=>{const s=pres.addSlide({masterName:"BODY"});s.addText(title,{x:0.4,y:0.12,w:W-2.4,h:0.66,fontSize:24,bold:true,color:"FFFFFF",fontFace:"Arial"});
    if(logo)s.addImage({data:durl(logo),x:W-1.75,y:0.13,w:1.4,h:0.64,sizing:{type:"contain",w:1.4,h:0.64}});return s};
  const bullets=(s,items,o={})=>s.addText(items.map(t=>({text:t,options:{bullet:{indent:18},breakLine:true}})),{x:o.x??0.6,y:o.y??1.2,w:o.w??W-1.2,h:o.h??5.6,fontSize:o.fs??18,color:INK,fontFace:"Arial",valign:"top",paraSpaceAfter:8});

  /* 1. Cover */
  let s=pres.addSlide();s.background={color:"FFFFFF"};
  s.addShape(pres.ShapeType.rect,{x:0,y:0,w:4.3,h:H,fill:{color:NAVY}});
  if(logo)s.addImage({data:durl(logo),x:0.5,y:0.6,w:3.3,h:1.5,sizing:{type:"contain",w:3.3,h:1.5}});
  s.addText([{text:(I.consName||"").toUpperCase(),options:{bold:true,breakLine:true}},{text:[I.consAddr,I.consTel,I.consEmail].filter(Boolean).join("\n"),options:{fontSize:10}}],{x:0.4,y:4.6,w:3.5,h:2.4,fontSize:12,color:"FFFFFF",fontFace:"Arial",valign:"bottom"});
  s.addText("CHEMICAL EXPOSURE MONITORING",{x:4.8,y:1.1,w:8,h:0.6,fontSize:16,bold:true,color:TEAL,fontFace:"Arial",charSpacing:2});
  s.addText("Results Briefing",{x:4.8,y:1.7,w:8,h:1.0,fontSize:40,bold:true,color:INK,fontFace:"Arial"});
  s.addText(client,{x:4.8,y:2.9,w:8,h:0.9,fontSize:22,bold:true,color:INK,fontFace:"Arial",valign:"top"});
  s.addText([I.locName&&I.locName!==I.client?I.locName:"",I.locAddr].filter(Boolean).join("\n"),{x:4.8,y:3.8,w:8,h:0.9,fontSize:13,color:MUTE,fontFace:"Arial",valign:"top"});
  s.addTable([[{text:"Monitoring date",options:{bold:true}},I.dates||"–"],[{text:"Report no.",options:{bold:true}},I.reportNo||"–"],[{text:"Presented by",options:{bold:true}},`${I.htName||"–"}${I.htReg?` (${I.htReg})`:""}${I.htPos?`\n${I.htPos}`:""}`]],
    {x:4.8,y:4.9,w:7.6,colW:[2.2,5.4],fontSize:13,fontFace:"Arial",color:INK,border:{type:"none"},valign:"top"});

  /* 2. Agenda */
  s=S("Agenda");const ag=["Introduction & objectives","Legal requirement & exposure limits","Methodology & equipment used","Monitoring results","Key findings & existing controls","Recommendations","Summary","Questions & answers"];
  ag.forEach((t,i)=>{const y=1.25+i*0.68;s.addShape(pres.ShapeType.ellipse,{x:0.8,y,w:0.5,h:0.5,fill:{color:i%2?TEAL:NAVY}});s.addText(String(i+1),{x:0.8,y,w:0.5,h:0.5,fontSize:14,bold:true,color:"FFFFFF",align:"center",valign:"middle",fontFace:"Arial"});
    s.addText(t,{x:1.55,y,w:9,h:0.5,fontSize:20,color:INK,fontFace:"Arial",valign:"middle"})});

  /* 3. Introduction */
  s=S("Introduction");
  bullets(s,[`Personal chemical exposure monitoring (CEM) was carried out at ${client}${I.area?` – ${I.area}`:""} on ${I.dates||"the monitoring date"}.`,
    `Required under the OSH (Use and Standards of Exposure of Chemicals Hazardous to Health) Regulations 2000 (USECHH), Regulations 26–27, following the CHRA${I.chraNo?` (report ${I.chraNo})`:""}.`,
    `Objective: measure the 8-hour time-weighted average (TWA) exposure of workers and compare it with the Permissible Exposure Limit (PEL), USECHH Schedule I.`,
    `Scope: ${a.wN} monitored for ${listP(a.params)}${I.exposed?`, representing ${I.exposed} exposed workers`:""}.`,
    `Monitoring carried out by ${I.htName||"a DOSH-registered Hygiene Technician"}${I.htReg?` (${I.htReg})`:""}.`]);

  /* 4. Limits */
  s=S("Legal Requirement & Exposure Limits");
  const pr=[["Chemical / parameter","CAS no.","PEL (8-h TWA)","Sampling method","Media"].map(t=>({text:t,options:{bold:true,color:"FFFFFF",fill:{color:TEAL}}}))];
  a.params.forEach(p=>{const q=param(p);pr.push([p,q.cas||"–",q.pel!==""&&q.pel!=null?`${q.pel} mg/m³`:"–",q.method||"–",q.media||"–"])});
  s.addTable(pr,{x:0.5,y:1.2,w:W-1,colW:[3.4,1.6,1.8,2.6,2.93],fontSize:13,fontFace:"Arial",color:INK,border:{type:"solid",color:LINE,pt:0.75},valign:"middle"});
  s.addText("A result above the PEL is non-compliant. A result at or above 50% of the PEL requires improved controls and repeat monitoring (DOSH Guidelines on Chemical Exposure Monitoring 2022). Samples shorter than 60 minutes are compared with the Maximum Exposure Limit (MEL = 3 × PEL).",
    {x:0.5,y:5.6,w:W-1,h:1.1,fontSize:12,color:MUTE,fontFace:"Arial",italic:true,valign:"top"});

  /* 5. Methodology & equipment */
  s=S("Methodology & Equipment Used");
  bullets(s,["Personal air sampling in the worker's breathing zone over the work shift.","Pumps calibrated before and after sampling; results corrected to 25 °C and 760 mmHg.","Samples analysed by an accredited laboratory (Certificate of Analysis, Appendix G).","TWA₈ = Σ(Cᵢ × tᵢ) / 480 min, compared with the PEL."],{w:5.6,fs:15});
  const E=(st.equip||[]).filter(e=>e.name||e.details||(e.photos||[]).length).slice(0,4);
  for(let i=0;i<E.length;i++){const e=E[i],x=6.6+(i%2)*3.3,y=1.2+Math.floor(i/2)*2.9;
    s.addShape(pres.ShapeType.roundRect,{x,y,w:3.1,h:2.7,fill:{color:BG},line:{color:LINE},rectRadius:0.08});
    const ph=(e.photos||[])[0]?await idb.get("photo:"+e.photos[0]).catch(()=>null):null;
    if(ph)s.addImage({data:durl(ph),x:x+0.15,y:y+0.12,w:2.8,h:1.6,sizing:{type:"contain",w:2.8,h:1.6}});
    s.addText([{text:e.name||"Equipment",options:{bold:true,breakLine:true}},{text:clip((e.details||"").replace(/•/g,"").replace(/\n+/g,"; "),90),options:{fontSize:9,color:MUTE}}],{x:x+0.1,y:y+1.75,w:2.9,h:0.9,fontSize:11,color:INK,fontFace:"Arial",valign:"top"})}

  /* 6. Results table */
  s=S("Monitoring Results");
  const rr=[["Point","Worker / task","Chemical","TWA (mg/m³)","Limit","% of limit","Status"].map(t=>({text:t,options:{bold:true,color:"FFFFFF",fill:{color:TEAL}}}))];
  G.slice(0,12).forEach(g=>{const [t,c]=stat(g);rr.push([g.point,clip(`${g.worker||""}${g.task?` – ${g.task}`:""}`,40),g.param,twaTxt(g),`${g.basis} ${g.lim??"–"}`,pctG(g),{text:t,options:{color:c,bold:true}}])});
  s.addTable(rr,{x:0.4,y:1.15,w:W-0.8,colW:[0.9,3.4,2.4,1.5,1.4,1.4,1.53],fontSize:G.length>8?11:13,fontFace:"Arial",color:INK,border:{type:"solid",color:LINE,pt:0.75},valign:"middle",autoPage:false});
  if(G.length>12)s.addText(`+ ${G.length-12} more results in the full report (Table 6).`,{x:0.4,y:6.65,w:8,h:0.3,fontSize:11,color:MUTE,fontFace:"Arial",italic:true});

  /* 7. Results chart */
  if(G.some(g=>g.pct!=null)){s=S("Results Compared with the Limit");
    const C=G.filter(g=>g.pct!=null).slice(0,14),labels=C.map(g=>`${g.point} ${clip(g.param,14)}`),vals=C.map(g=>+g.pct.toFixed(1));
    s.addChart(pres.ChartType.bar,[{name:"% of limit",labels,values:vals}],{x:0.5,y:1.1,w:W-1,h:5.6,barDir:"col",chartColors:C.map(g=>g.cat==="over"?RED:g.cat==="half"?AMB:GRN),
      valAxisMaxVal:Math.max(110,Math.ceil(Math.max(...vals)/10)*10+10),valAxisTitle:"% of limit",showValAxisTitle:true,valAxisLabelFontSize:11,catAxisLabelFontSize:11,
      showValue:true,dataLabelFontSize:10,dataLabelFormatCode:'0.0"%"',catGridLine:{style:"none"},valGridLine:{color:"E6EBF0",size:0.5}});
    s.addText("■ Above limit   ■ 50–99%   ■ Below 50%",{x:0.6,y:6.65,w:6,h:0.3,fontSize:10,color:MUTE,fontFace:"Arial"})}

  /* 8. Key findings */
  s=S("Key Findings");
  const kp=[];a.P.forEach(x=>{if(!x.worst)return;const w=x.worst;kp.push(`${x.p}: highest ${twaTxt(w)} mg/m³ (${pctG(w)} of ${w.basis}) at ${w.point}${w.worker?` – ${w.worker}`:""}; ${x.top==="over"?"ABOVE the limit":x.top==="half"?"50–99% of the limit":x.top==="nd"?"below detection limit":"below 50% of the limit"}.`)});
  const cnt=[["Above limit",a.over.length,RED],["50–99%",a.half.length,AMB],["10–49%",a.ten.length,GRN],["Below 10% / ND",a.low.length+G.filter(g=>g.cat==="nd").length,GRN]];
  cnt.forEach(([l,n,c],i)=>{const x=0.6+i*3.1;s.addShape(pres.ShapeType.roundRect,{x,y:1.2,w:2.9,h:1.3,fill:{color:BG},line:{color:c,width:1.5},rectRadius:0.08});
    s.addText([{text:String(n),options:{fontSize:32,bold:true,color:c,breakLine:true}},{text:l,options:{fontSize:12,color:MUTE}}],{x,y:1.2,w:2.9,h:1.3,align:"center",valign:"middle",fontFace:"Arial"})});
  bullets(s,kp.length?kp:["Results are not yet complete."],{y:2.8,h:3.9,fs:16});

  /* 9. Existing controls */
  s=S("Existing Control Measures");
  const col=(x,t,items)=>{s.addShape(pres.ShapeType.roundRect,{x,y:1.2,w:3.95,h:5.4,fill:{color:BG},line:{color:LINE},rectRadius:0.08});
    s.addText(t,{x:x+0.2,y:1.3,w:3.6,h:0.5,fontSize:16,bold:true,color:TEAL,fontFace:"Arial"});
    s.addText((items.length?items:["None recorded"]).map(v=>({text:clip(v,110),options:{bullet:{indent:14},breakLine:true}})),{x:x+0.2,y:1.85,w:3.6,h:4.6,fontSize:13,color:INK,fontFace:"Arial",valign:"top",paraSpaceAfter:6})};
  col(0.5,"Engineering",a.eng);col(4.65,"Administrative",a.adm);
  col(8.8,"PPE / RPE",[a.C.rpe?`${a.rpe[0]}${a.apf>1?` (APF ${a.apf})`:""}${a.C.rpeUse==="consistent"?", worn consistently":a.C.rpeUse==="partial"?", not worn consistently":a.C.rpeUse==="no"?", not worn":""}`:"",a.C.fit==="yes"?"Fit test done":a.C.fit==="no"?"No fit test":"",...(a.C.ppe||[])].filter(Boolean));

  /* 10. Recommendations */
  s=S("Recommendations");const rp=(st.recPhotos||[]).slice(0,3),rs=sentences(textOf("r1")).slice(0,7).map(x=>clip(x,170));
  bullets(s,rs.length?rs:["Maintain existing controls and review with the CHRA assessor."],{w:rp.length?8.2:W-1.2,fs:rs.length>5?13:15});
  for(let i=0;i<rp.length;i++){const p=await idb.get("photo:"+rp[i]).catch(()=>null);if(p)s.addImage({data:durl(p),x:9.1,y:1.2+i*1.85,w:3.8,h:1.75,sizing:{type:"contain",w:3.8,h:1.75}})}

  /* 11. Summary */
  s=S("Summary");
  const sm=a.P.filter(x=>x.worst).map(x=>({p:x.p,ok:x.top!=="over",t:x.top}));
  sm.forEach((x,i)=>{const y=1.2+i*0.75;if(i>5)return;s.addShape(pres.ShapeType.roundRect,{x:0.6,y,w:W-1.2,h:0.62,fill:{color:x.ok?(x.t==="half"?"FDF1D8":"E3F4EA"):"F9E0DD"},line:{color:x.ok?(x.t==="half"?AMB:GRN):RED},rectRadius:0.06});
    s.addText([{text:x.p,options:{bold:true}},{text:`  —  ${x.t==="over"?"NON-COMPLIANT: exposure above the limit":x.t==="half"?"Compliant, but at 50–99% of the limit":"Compliant: below 50% of the limit"}`}],{x:0.8,y,w:W-1.6,h:0.62,fontSize:15,color:INK,fontFace:"Arial",valign:"middle"})});
  const nx=a.over.length?"Repeat monitoring within 6 months after controls are improved.":a.half.length?"Repeat monitoring within 12 months.":"Maintain controls; next monitoring as recommended by the CHRA.";
  bullets(s,[nx,`Report ${I.reportNo||""} with full results, calculations and appendices has been submitted for your records (keep for 30 years, USECHH Reg. 26).`],{y:1.3+Math.min(sm.length,6)*0.75+0.2,h:2.2,fs:15});

  /* 12. Q&A */
  s=pres.addSlide();s.background={color:NAVY};
  s.addText("Thank you",{x:0,y:2.0,w:W,h:1.1,fontSize:44,bold:true,color:"FFFFFF",align:"center",fontFace:"Arial"});
  s.addText("Questions & Answers",{x:0,y:3.1,w:W,h:0.7,fontSize:24,color:"CFE0EE",align:"center",fontFace:"Arial"});
  s.addText([I.htName,I.consName,[I.consTel,I.consEmail].filter(Boolean).join("  |  ")].filter(Boolean).join("\n"),{x:0,y:4.4,w:W,h:1.4,fontSize:14,color:"FFFFFF",align:"center",fontFace:"Arial"});
  if(logo)s.addImage({data:durl(logo),x:W/2-1,y:6.0,w:2,h:0.9,sizing:{type:"contain",w:2,h:0.9}});

  await pres.writeFile({fileName:`CEM Results Briefing - ${client}.pptx`.replace(/[\\/:*?"<>|]/g,"")});toast("Presentation downloaded")}
  catch(e){console.error(e);toast("Could not build the presentation: "+(e.message||e),6000)}finally{busy(false)}}
const listP=a=>a.length<=1?(a[0]||"the selected chemicals"):a.slice(0,-1).join(", ")+" and "+a[a.length-1];
const b=document.getElementById("bPpt");if(b)b.onclick=buildDeck;
window.buildCemDeck=buildDeck;
})();
