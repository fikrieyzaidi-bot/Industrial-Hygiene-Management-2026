/* Chemical Health Risk Assessment (CHRA) report generator — USECHH Regulations 2000 / DOSH CHRA Manual 3rd Ed. (2018) */
const KEY="ihcc_chra1";
const BLANK={info:{nth:"first",consName:"",nextReassess:""},wus:[],prev:[],text:{},att:{}};
let st=Store.load(KEY,BLANK);if(!st.info.consName)applyCompanyDefault(st.info);st.att=st.att||{};const save=()=>Store.save(KEY,st);
const chraAppx=()=>[...st.wus.map((w,i)=>["1"+String.fromCharCode(65+i),`FORMS A TO D: ${String(w.name).toUpperCase()}`]),["2","TABLES EXCERPT FROM CHRA MANUAL 3RD EDITION"],["3","LAYOUT OF WORK AREA"],["4","CERTIFICATE OF COMPETENT PERSON"]];
const newWU=n=>({name:n||"New work unit",area:"",male:"",female:"",date:"",hours:"",health:"",healthRep:"",suscept:"",abnormal:"",mixed:"",ingestion:"",other:"",chems:[],inh:[],derm:[],tc:[],oc:[],erp:[],em:{existing:"",rec:""},ms:{existing:"",rec:""},specific:[]});

/* ---------- CHRA Manual 3rd Ed. calculations ---------- */
const noDot=x=>String(x||"").replace(/\.+\s*$/,"");
const ceilH=x=>Math.ceil(x-1e-9);
function inhCalc(r){const fr=num(r.fr),dr=num(r.dr),mr=num(r.mr),hr=num(r.hr);
  const fdr=fr!=null&&dr!=null?ceilH((fr+dr)/2):num(r.fdr);           // FDR = (FR + DR)/2, rounded up
  const er=fdr!=null&&mr!=null?ceilH((fdr+mr)/2):num(r.er);            // ER = (FDR + MR)/2, rounded up
  const rr=hr!=null&&er!=null?hr*er:null;                               // RR = HR × ER
  const lvl=rr==null?"ND":rr>=15?"High":rr>=5?"Moderate":"Low";
  const formRR=num(String(r.rr||"").split(/\s|\(/)[0]);
  return{fdr,er,rr,lvl,mismatch:formRR!=null&&rr!=null&&formRR!==rr,formRR}}
const DLVL=x=>/^H/i.test(x)?"High":/^M/i.test(x)?"Moderate":/^L/i.test(x)?"Low":"ND";
function apCalc(t,riskLvl){const ad=String(t.overall||"").toUpperCase();if(num(t.ap)!=null)return num(t.ap);
  if(ad==="Y")return 3;if(riskLvl==="High")return 1;if(riskLvl==="ND")return null;return 2}
function wuStats(w){
  if(w.summary&&!w.inh.length&&!w.derm.length){const s=w.summary;return{...s,nchem:num(s.nchem)||0,summaryOnly:true,hr:{},routes:{inh:s.inhH+s.inhM+s.inhL>0,der:s.derH+s.derM+s.derL>0,ing:s.ing>0}}}
  const I=w.inh.map(inhCalc),D=w.derm.map(d=>DLVL(d.risk));
  const c=(arr,v)=>arr.filter(x=>x===v).length;
  const lv=chem=>{const i=w.inh.findIndex(x=>x.chem===chem),d=w.derm.find(x=>x.chem===chem);const L=[i>=0?I[i].lvl:null,d?DLVL(d.risk):null];return L.includes("High")?"High":L.includes("Moderate")?"Moderate":L.includes("Low")?"Low":"ND"};
  const AP=w.tc.map(t=>apCalc(t,lv(t.chem)));const hr={};w.chems.forEach(x=>{const h=num(x.hr);if(h)hr[h]=(hr[h]||0)+1});
  return{nchem:w.chems.length,inhH:c(I.map(x=>x.lvl),"High"),inhM:c(I.map(x=>x.lvl),"Moderate"),inhL:c(I.map(x=>x.lvl),"Low"),
    derH:c(D,"High"),derM:c(D,"Moderate"),derL:c(D,"Low"),ing:w.chems.filter(x=>/^y/i.test(x.ingest)).length,
    ap1:AP.filter(x=>x===1).length,ap2:AP.filter(x=>x===2).length,ap3:AP.filter(x=>x===3).length,hr,I,AP,
    routes:{inh:w.inh.length>0,der:w.derm.length>0,ing:w.chems.some(x=>/^y/i.test(x.ingest))}}}
function analyse(){const W=st.wus.map(w=>({w,s:wuStats(w)}));const tot=k=>W.reduce((a,x)=>a+(num(x.s[k])||0),0);
  return{W,T:Object.fromEntries(["nchem","inhH","inhM","inhL","derH","derM","derL","ing","ap1","ap2","ap3"].map(k=>[k,tot(k)])),
    mixtures:st.wus.reduce((a,w)=>a+w.chems.filter(c=>/mix|dilut/i.test(c.name+" "+c.ingr)).length,0),released:st.wus.reduce((a,w)=>a+w.chems.filter(c=>c.released).length,0)}}

/* ---------- QA ---------- */
function qa(a){const out=[];
  a.W.forEach(({w,s})=>{if(s.summaryOnly){out.push(["warn",`${w.name}: summary counts only — import its Forms A–D workbook to include the detailed tables.`]);return}
    w.inh.forEach((r,i)=>{const c=s.I[i];if(c.mismatch)out.push(["err",`${w.name} – ${r.chem.split("\n")[0]}: RR on form = ${c.formRR}, recalculated HR×ER = ${c.rr} (FDR ${c.fdr}, ER ${c.er}).`]);
      if(num(r.hr)==null)out.push(["warn",`${w.name} – ${r.chem.split("\n")[0]}: HR not determined (NA) — risk cannot be concluded; justify or reclassify.`])});
    w.derm.forEach(d=>{if(DLVL(d.risk)==="ND")out.push(["warn",`${w.name} – ${d.chem.split("\n")[0]}: dermal level of risk not entered (H1/H2/M1/M2/L per CHRA Manual).`])});
    w.chems.filter(c=>/^y/i.test(c.dermal)).forEach(c=>{if(!w.derm.some(d=>d.chem===c.name))out.push(["warn",`${w.name} – ${c.name}: dermal = Y in Form B but no dermal assessment row in Form C2.`])});
    w.chems.forEach(c=>{const m=String(c.src).match(/\((?:\d{1,2}\/)?(?:\d{1,2}\/)?(\d{4})\)/);if(m&&+m[1]<new Date().getFullYear()-5)out.push(["note",`${w.name} – ${c.name}: SDS dated ${m[1]} is older than 5 years (USECHH Reg. 24/25).`])});
    if(s.inhH||s.derH)if(!/necessary|required|recommend/i.test(w.em.rec+w.ms.rec))out.push(["warn",`${w.name}: high risk found — confirm exposure monitoring / medical surveillance decision in Form D4.`])});
  return out}

/* ---------- auto text ---------- */
const TEXTS=[
 ["exec","Executive summary – introduction",a=>{const I=st.info;return`This is the ${I.nth} Chemical Health Risk Assessment (CHRA) for ${I.client} at its workplace located at ${noDot(I.address)}. The assessment was carried out by ${I.assessor}${I.assistant?`, assisted by ${I.assistant}`:""}${I.others?` and ${I.others}`:""} on ${I.assessDate} to identify hazards from chemicals hazardous to health (CHTH), evaluate worker exposure and the adequacy of existing control measures, recommend improvements and ensure compliance with the Occupational Safety and Health (Use and Standards of Exposure of Chemicals Hazardous to Health) Regulations 2000.\n${nW(st.wus.length)} work units were assessed covering ${a.T.nchem} chemicals. The number of chemicals and the risk conclusion for inhalation and dermal exposure, and the possibility of ingestion, are summarised below.`}],
 ["risk","4.3 Risk determination – discussion",a=>`Overall, ${a.T.inhH} chemical exposure(s) were concluded as high inhalation risk, ${a.T.inhM} as moderate and ${a.T.inhL} as low. For dermal exposure, ${a.T.derH} were high, ${a.T.derM} moderate and ${a.T.derL} low, while ingestion was considered possible for ${a.T.ing} chemical(s).`+
   (a.T.inhH||a.T.derH?` High risk was identified at the ${listTxt(a.W.filter(x=>x.s.inhH||x.s.derH).map(x=>x.w.name))} work unit(s), where existing controls are inadequate and require priority action.`:" No high-risk exposure was identified.")],
 ["concl","6.0 Conclusion",a=>{const I=st.info;const hi=a.W.filter(x=>x.s.inhH||x.s.derH).map(x=>x.w.name);
   return`The CHRA conducted at ${I.client} on ${I.assessDate} assessed ${a.T.nchem} chemicals across ${nw(st.wus.length)} work units. `+(hi.length?`The risk to health is concluded as SIGNIFICANT for the ${listTxt(hi)} work unit(s), and the employer shall implement the recommended control measures (${a.T.ap1} Action Priority 1 and ${a.T.ap2} Action Priority 2 items) within the stipulated timeframe. `:`The risk to health is concluded as not significant provided existing controls are maintained, with ${a.T.ap2} Action Priority 2 item(s) to improve. `)+
   `The employer shall take action within one (1) month of receiving this report (USECHH Reg. 12). This report shall be kept for at least 30 years. Reassessment shall be carried out by ${I.nextReassess||"within five (5) years"}, or earlier if there is a significant change in the work, new chemicals or control measures, adverse health effects are reported, or exposure monitoring results exceed the PEL (USECHH Reg. 10; CHRA Manual Section 4.6).`}],
];
const textOf=(k,a)=>st.text[k]??TEXTS.find(t=>t[0]===k)[2](a);

/* ---------- report model (mirrors the ESM CHRA final report structure) ---------- */
function model(){const I=st.info,a=analyse(),B=[],T=(cap,head,rows,o={})=>B.push({t:"table",cap,head,rows,...o});
  const det=a.W.filter(x=>!x.s.summaryOnly);
  B.push({t:"cover2",c:{consName:I.consName,consAddr:I.consAddr,consTel:I.consTel,consEmail:I.consEmail,
    titles:["CHEMICAL HEALTH RISK","ASSESSMENT (CHRA)","REPORT"],ref:I.reportNo,client:I.client,clientDosh:I.doshNo,locName:I.locName,locAddr:I.address,
    rows:[["CHRA ASSESSOR NAME",I.assessor],["DOSH REG. NO.",I.assessorReg],["CHRA ASSISTANT NAME",I.assistant?I.assistant:null],["DOSH REG. NO. (ASSISTANT)",I.assistant?I.assistantReg:null],
      ["DOSH REPORT NO.",I.doshReportNo],["ESM REPORT NO.",I.reportNo],["ASSESSMENT DATE",I.assessDate],["DATE OF SUBMISSION",I.submitDate]]}});
  B.push({t:"h1",x:"CHRA NOTIFICATION FORM (FORM A)"},{t:"kv",rows:[["Date",I.briefDate||""],["Company",I.client],["Address",I.address],["Contact person",I.contact||""]]},
    {t:"p",x:`Ref: CHEMICAL HEALTH RISK ASSESSMENT REPORT\nThis is to certify that CHRA for the above premise has been conducted and explained to the management / safety and health committee members on ${I.briefDate||"________"}.\n2. In compliance with USECHH Regulations 2000, Regulation 12, the assessor shall furnish the employer with the report of the assessment within one (1) month of the completion of the assessment.\n3. The employer has been informed to take action to control exposure of workers to chemicals hazardous to health as indicated in the CHRA report within one (1) month after receiving the report.`},
    {t:"kv",rows:[["Assessor",`${I.assessor} (${I.assessorReg})${I.assistant?`\n${I.assistant} (${I.assistantReg})`:""}`],["Date of assessment",I.assessDate],["Date of report completion",I.submitDate],["Report ref. no.",I.doshReportNo]]},
    {t:"p",x:"ENDORSEMENT BY EMPLOYER: I hereby declare that I have received the CHRA Report and have been briefed by the above-mentioned assessor.\nName: ____________________   Designation: ____________________   Date: __________   Signature: __________"});
  B.push({t:"pb"},{t:"h1",x:"EXECUTIVE SUMMARY"},...textOf("exec",a).split("\n").map(x=>({t:"p",x})));
  const sumRows=a.W.map(({w,s},i)=>[i+1,w.name,s.inhH,s.inhM,s.inhL,s.derH,s.derM,s.derL,s.ing]);
  T("Summary of risk conclusion per work unit",["No.","Work Unit","Inh. High","Inh. Moderate","Inh. Low","Derm. High","Derm. Moderate","Derm. Low","Ingestion"],[...sumRows,["","Total",a.T.inhH,a.T.inhM,a.T.inhL,a.T.derH,a.T.derM,a.T.derL,a.T.ing]],{small:true});
  const keyRec=[];det.forEach(({w,s})=>w.tc.forEach((t,i)=>{if(s.AP[i]===1||s.AP[i]===2)keyRec.push([String(t.rec).split("\n").filter(l=>!/^\d+\)\s*(continue|maintain)/i.test(l)).map(l=>l.replace(/^\d+\)\s*/,"")).join("\n")||t.rec,s.AP[i],w.name])}));
  const dedup=[];keyRec.forEach(r=>{const d=dedup.find(x=>x[0]===r[0]);if(d){if(!d[2].includes(r[2]))d[2]+=" & "+r[2];d[1]=Math.min(d[1],r[1])}else dedup.push([...r])});
  dedup.sort((x,y)=>x[1]-y[1]);
  T("The employer is mainly recommended to:",["No.","Recommendation","Action Priority","Work Unit"],[...dedup.slice(0,15).map((r,i)=>[i+1,r[0],r[1],r[2]]),
    [dedup.length+1,"Develop and communicate safe work procedures on safe handling of chemicals; review when there is significant change in the work task.","NA","All work units"],
    [dedup.length+2,"PPE programme: select DOSH-approved PPE, record issuance, establish cartridge/glove replacement schedule.","NA","All work units"],
    [dedup.length+3,"Training: conduct safe handling of chemicals training and retrain at least once every 2 years (USECHH Reg. 22).","NA","All work units"],
    [dedup.length+4,"Update the chemical register and ensure current SDS (≤ 5 years) in BM & English are accessible (USECHH Reg. 5, 24, 25).","NA","All work units"]],{small:true,w:[6,64,12,18]});
  B.push({t:"p",x:`This report shall be kept and made available for a period of 30 years. Reassessment to be carried out in ${I.nextReassess||"5 years"} unless the conditions stated in the conclusion, USECHH Regulation 10 or Section 4.6 of the CHRA Manual 3rd Edition apply.`});
  B.push({t:"pb"},{t:"toc"},{t:"pb"});
  /* 1.0 */
  B.push({t:"h1",x:"1.0 INTRODUCTION"},{t:"h2",x:"1.1 Company and Work Site"},{t:"p",x:I.background||""},
    {t:"p",x:`As part of the commitment to fulfil Part IV of the USECHH Regulations 2000, the CHRA was carried out at ${I.clientShort||I.client} on ${I.assessDate}. This is the ${I.nth} assessment and was conducted in accordance with A Manual of Recommended Practice on Assessment of the Health Risks Arising from the Use of Chemicals Hazardous to Health at the Workplace (First Reprint 2018) – 3rd Edition, DOSH.`},
    {t:"h2",x:"1.2 Objectives and Scope of Assessment"},{t:"ul",items:["To identify the hazards posed by chemical substances produced, processed, handled, stored, transported, disposed or treated within the workplace;","To evaluate the degree of exposure of employees (inhalation, skin absorption or ingestion);","To evaluate the adequacy of existing control measures;","To conclude on the significance of the health risk posed by the chemical hazards; and","To recommend further appropriate control measures to prevent or reduce risks."]},
    {t:"p",x:`This assessment covers ${a.T.nchem} chemicals according to the chemical register provided, across ${nw(st.wus.length)} work units: ${listTxt(st.wus.map(w=>w.name))}. The site assessment was conducted by ${I.assessor} (${I.assessorReg})${I.assistant?`, assisted by ${I.assistant} (${I.assistantReg})`:""}${I.others?` and ${I.others}`:""}. Information was provided by ${I.pic||"the person-in-charge"}.`});
  B.push({t:"h2",x:"1.3 Summary of Previous Assessment"});
  if(I.prevDate){B.push({t:"p",x:`The previous assessment was conducted on ${I.prevDate} by ${I.prevAssessor||"a DOSH registered assessor"}, covering ${I.prevTotal||"–"} CHTH.`});
    T("Table 1.2 Summary of previous assessment recommendations and site observation",["No.","Recommendation / Action to be taken","AP","Work Unit","Site observation (current)"],st.prev.map((p,i)=>[i+1,p.rec,p.ap,p.wu,p.obs]),{small:true})}
  else B.push({t:"p",x:"This is the first CHRA conducted for the workplace; no previous assessment is available."});
  /* 2.0 */
  B.push({t:"h1",x:"2.0 PROCESS AND WORK UNIT DESCRIPTION"},{t:"h2",x:"2.1 Process Flow"},...String(I.process||"").split("\n").filter(Boolean).map(x=>({t:"p",x})),
    {t:"h2",x:"2.2 Work Unit Description"},{t:"p",x:`Workers were assessed in work units (similar exposure groups) performing similar tasks with similar potential for exposure to the same CHTH. A total of ${nw(st.wus.length)} work units were determined and assessed (Table 2.1).`});
  T("Table 2.1 Details of work unit",["No.","Work Unit","Work Area","No. of Workers (M/F)","Description of work"],st.wus.map((w,i)=>[i+1,w.name,w.area,`${w.male||"–"} / ${w.female||"0"}`,w.other||"Refer Appendix 1 (Form A)"]),{small:true,w:[5,18,17,12,48]});
  /* 3.0 */
  B.push({t:"h1",x:"3.0 ASSESSMENT METHODOLOGY"},{t:"p",x:"The assessment followed the CHRA Manual 3rd Edition (2018) steps:"},{t:"ul",items:["Step 1 – Gather information on the workplace, processes, work units and chemicals (chemical register, SDS, labels).","Step 2 – Divide the work process into work units.","Step 3 – Identify chemicals and their hazard rating (HR 1–5) based on GHS classification (CLASS Regulations 2013) per Table 3 of the Manual.","Step 4 – Assess inhalation exposure: Frequency Rating (FR) and Duration Rating (DR) give FDR = (FR+DR)/2; Magnitude Rating (MR) from degree of release and degree inhaled; Exposure Rating ER = (FDR+MR)/2 (rounded up).","Step 5 – Risk Rating RR = HR × ER: Low (1–4), Moderate (5–12), High (15–25). Dermal risk is determined from hazardous properties, extent and duration of skin contact (H1/H2 high, M1/M2 moderate, L low).","Step 6 – Evaluate adequacy of existing technical controls, organisational controls and emergency response preparedness.","Step 7 – Conclude risk and recommend action with Action Priority (AP1–AP3), exposure monitoring, medical surveillance and specific actions.","Step 8 – Record the assessment (Forms A–D, Appendix 1)."]});
  /* 4.0 */
  B.push({t:"h1",x:"4.0 ASSESSMENT FINDINGS & DISCUSSION"},{t:"h2",x:"4.1 Identification and Degree of Hazard"});
  T("Table 4.1 Summary of number of chemicals assessed for each work unit",["No.","Work Unit","Chemicals used","Chemicals released","Total assessed"],[...a.W.map(({w,s},i)=>[i+1,w.name,s.summaryOnly?"–":w.chems.filter(c=>!c.released).length,s.summaryOnly?"–":w.chems.filter(c=>c.released).length,s.nchem]),["","TOTAL","","",a.T.nchem]]);
  T("Table 4.2 Summary of Hazard Rating (inhalation) for each work unit",["No.","Work Unit","HR5","HR4","HR3","HR2","HR1"],det.map(({w,s},i)=>[i+1,w.name,...[5,4,3,2,1].map(h=>s.hr[h]||0)]));
  const sig=[];det.forEach(({w})=>w.chems.filter(c=>num(c.hr)>=4).forEach(c=>sig.push([w.name,c.name,c.hclass,c.hr])));
  T("Table 4.3 Chemicals posing significant adverse health effects via inhalation (HR ≥ 4)",["Work Unit","Chemical","Hazard classification","HR"],sig.length?sig:[["–","None","",""]],{small:true});
  const dsig=[];det.forEach(({w})=>w.derm.filter(d=>/sensiti|corros|acute|absorp/i.test(d.prop)).forEach(d=>dsig.push([w.name,d.chem,d.prop])));
  T("Table 4.5 Chemicals posing significant adverse health effects via dermal",["Work Unit","Chemical","Hazardous property"],dsig.length?dsig:[["–","None",""]],{small:true});
  B.push({t:"h2",x:"4.2 Exposure Assessment"});
  T("Table 4.6 Possible routes of exposure in each work unit",["No.","Work Unit","Inhalation","Dermal","Ingestion"],a.W.map(({w,s},i)=>[i+1,w.name,s.routes.inh?"✔":"–",s.routes.der?"✔":"–",s.routes.ing?"✔":"–"]));
  det.forEach(({w,s})=>{if(!w.inh.length)return;const fill={};s.I.forEach((c,i)=>{if(c.lvl==="High")fill[i+",9"]="FF9999";else if(c.lvl==="Moderate")fill[i+",9"]="FFF2A8"});
    T(`Inhalation exposure assessment – ${w.name} (Form C1)`,["Job / task","Chemical","FR","DR","FDR","MR","ER","HR","RR","Risk"],w.inh.map((r,i)=>[r.task,r.chem,r.fr,r.dr,s.I[i].fdr,r.mr,s.I[i].er,r.hr,s.I[i].rr??"ND",s.I[i].lvl]),{small:true,fill})});
  det.forEach(({w})=>{if(!w.derm.length)return;T(`Dermal exposure assessment – ${w.name} (Form C2)`,["Job / task","Chemical","Hazardous property","Extent","Duration","Risk"],w.derm.map(d=>[d.task,d.chem,d.prop,d.extent,d.dur,d.risk||"–"]),{small:true})});
  B.push({t:"h2",x:"4.3 Risk Determination"});
  T("Table 4.7 Summary of level of risk for each work unit",["No.","Work Unit","Inh. High","Inh. Moderate","Inh. Low","Derm. High","Derm. Moderate","Derm. Low"],[...a.W.map(({w,s},i)=>[i+1,w.name,s.inhH,s.inhM,s.inhL,s.derH,s.derM,s.derL]),["","Total",a.T.inhH,a.T.inhM,a.T.inhL,a.T.derH,a.T.derM,a.T.derL]]);
  B.push({t:"p",x:textOf("risk",a)},{t:"h2",x:"4.4 Adequacy of Control Measures"},{t:"h3",x:"4.4.1 Adequacy of Technical Controls"});
  det.forEach(({w})=>{if(!w.tc.length)return;T(`Table 4.8 Technical controls – ${w.name}`,["Job / task","Chemical","Route (risk)","Isolation / enclosure","Engineering control & ventilation","PPE","Overall adequate?"],w.tc.map(t=>[t.task,t.chem,t.roe,`${t.iso} (${t.isoA})`,`${t.eng} (${t.engA})`,`${t.ppe} (${t.ppeA})`,t.overall]),{small:true})});
  B.push({t:"h3",x:"4.4.2 Adequacy of Organisational Controls"});
  det.forEach(({w})=>{const r=w.oc.filter(o=>!o.head);if(r.length)T(`Table 4.9 Organisational controls – ${w.name}`,["Existing organisational control","Adequate?"],r.map(o=>[o.existing,o.adequacy]),{small:true,w:[85,15]})});
  B.push({t:"h3",x:"4.4.3 Adequacy of Emergency Response Preparedness"});
  const erp=det.find(x=>x.w.erp.length);if(erp)T("Table 4.10 Summary of adequacy of existing emergency response preparedness",["Emergency response preparedness","Adequate?"],erp.w.erp.filter(o=>!o.head).map(o=>[o.existing,o.adequacy]),{small:true,w:[85,15]});
  /* 5.0 */
  B.push({t:"h1",x:"5.0 RECOMMENDATIONS ON ACTION TO BE TAKEN"});
  T("Table 5.1 Action priority determination (CHRA Manual Table 18)",["Level of Risk","Adequacy of Control","Action Priority"],[["High","Inadequate","1"],["Moderate / Low","Inadequate","2"],["High / Moderate / Low","Adequate","3"],["HR or ER could not be determined","–","–"]]);
  T("Table 5.2 Summary of action priority",["No.","Work Unit","AP1","AP2","AP3"],[...a.W.map(({w,s},i)=>[i+1,w.name,s.ap1,s.ap2,s.ap3]),["","TOTAL",a.T.ap1,a.T.ap2,a.T.ap3]]);
  B.push({t:"h2",x:"5.1 Actions To Be Taken on Technical Controls"});
  det.forEach(({w,s})=>{if(!w.tc.length)return;T(`Table 5.3 Actions on technical controls – ${w.name}`,["Job / task","Chemical","Recommendation","AP"],w.tc.map((t,i)=>[t.task,t.chem,t.rec,s.AP[i]??"–"]),{small:true,w:[22,22,48,8]})});
  B.push({t:"h2",x:"5.2 Actions To Be Taken on Organisational Controls"});
  const ocRec=[];det.forEach(({w})=>w.oc.forEach(o=>{if(o.rec&&!ocRec.some(x=>x[0]===o.rec))ocRec.push([o.rec,w.name]);else if(o.rec){const x=ocRec.find(x=>x[0]===o.rec);if(!x[1].includes(w.name))x[1]+=", "+w.name}}));
  T("Table 5.4 Actions to be taken on organisational controls",["Recommendation","Work Unit"],ocRec,{small:true,w:[75,25]});
  B.push({t:"h2",x:"5.3 Actions To Be Taken on Emergency Response Preparedness"});
  const erRec=[];det.forEach(({w})=>w.erp.forEach(o=>{if(o.rec&&!erRec.includes(o.rec))erRec.push(o.rec)}));B.push({t:"p",x:erRec.join("\n")||"Maintain existing emergency response arrangements."});
  B.push({t:"h2",x:"5.4 Actions To Be Taken on Exposure Monitoring"});
  T("Table 5.7 Recommendation on chemical exposure monitoring",["Work Unit","Existing programme","Recommendation"],det.map(({w})=>[w.name,w.em.existing,w.em.rec]),{small:true});
  B.push({t:"h2",x:"5.5 Actions To Be Taken on Medical Surveillance"});
  T("Table 5.8 Summary of necessity for medical surveillance programme",["Work Unit","Existing programme","Recommendation"],det.map(({w})=>[w.name,w.ms.existing,w.ms.rec]),{small:true});
  B.push({t:"h2",x:"5.6 Specific Actions To Be Taken"});
  const sp=[];det.forEach(({w})=>w.specific.forEach(x=>sp.push([w.name,x.chem,x.rec])));
  T("Table 5.9 List of chemicals that require specific action",["Work Unit","Chemical","Recommendation"],sp.length?sp:[["–","None","Not applicable"]],{small:true});
  B.push({t:"h1",x:"6.0 CONCLUSION"},{t:"p",x:textOf("concl",a)});
  B.push({t:"h1",x:"APPENDICES"},{t:"ul",items:chraAppx().map(([L,T])=>`Appendix ${L}: ${T}`)});
  chraAppx().forEach(([L,T])=>B.push({t:"appx",L,T,files:st.att[L]||[]}));
  return B}
const META=()=>({title:`CHRA Report – ${st.info.client}`,header:`CHRA ${String(st.info.assessDate||"").slice(-4)} ${st.info.client||""}`,footer:`* This report shall not be reproduced, distributed or copied without prior written consent of ${st.info.consName||"the assessor"}.`});

/* ---------- Excel import: 'FORMS A TO D' workbook (CHRA Manual layout) ---------- */
async function importForms(file){const wb=await readWorkbook(file);const S=n=>wb.Sheets[n];if(!S("Form A")||!S("Form C1")){toast(`${file.name}: not a Forms A–D workbook`);return null}
  const g=(ws,a)=>{const c=ws&&ws[a];return c?cellTxt(c.v):""};
  const rows=(ws,start,cols,key)=>{const out=[];if(!ws)return out;const R=XLSX.utils.decode_range(ws["!ref"]).e.r+1;
    for(let r=start;r<=R;r++){const rec={};for(const[k,c]of Object.entries(cols))rec[k]=g(ws,c+r);if(!rec[key]){if(out.length)break;continue}out.push(rec)}return out};
  const A=S("Form A"),w=newWU(g(A,"D4"));Object.assign(w,{date:g(A,"H4"),area:g(A,"D5"),male:g(A,"I5"),female:g(A,"K5"),hours:g(A,"D6"),health:g(A,"B8"),healthRep:g(A,"B10"),suscept:g(A,"B12"),abnormal:g(A,"E8"),mixed:g(A,"E10"),ingestion:g(A,"E12"),other:g(A,"B14")});
  const bc={name:"C",ingr:"D",form:"E",hclass:"F",hcode:"G",src:"H",hr:"I",dermal:"J",ingest:"K"};
  w.chems=[...rows(S("Form B1"),7,bc,"name").map(r=>({...r,released:false})),...rows(S("Form B2"),7,bc,"name").filter(r=>r.name.toUpperCase()!=="NA").map(r=>({...r,released:true}))];
  w.inh=rows(S("Form C1"),7,{task:"B",chem:"C",fr:"D",dr:"E",fdr:"F",pel:"G",rel:"H",inhaled:"I",mr:"J",er:"K",hr:"L",rr:"M"},"chem").map(r=>({...r,rr:r.rr.split("\n")[0]}));
  w.derm=rows(S("Form C2"),8,{task:"B",chem:"C",prop:"D",extent:"E",st:"F",lt:"G",risk:"H"},"chem").map(r=>({task:r.task,chem:r.chem,prop:r.prop,extent:r.extent,dur:r.st&&!r.lt?"Short":"Long",risk:r.risk.split("\n")[0]}));
  w.tc=rows(S("Form D1"),9,{task:"B",chem:"C",roe:"D",iso:"E",isoA:"F",eng:"G",engA:"H",ppe:"I",ppeA:"J",overall:"K",rec:"L",ap:"M"},"chem");
  const kv3=ws=>{const out=[];if(!ws)return out;const R=XLSX.utils.decode_range(ws["!ref"]).e.r+1;for(let r=7;r<=R;r++){const b=g(ws,"B"+r),c=g(ws,"C"+r),d=g(ws,"D"+r);if(!b&&!d)continue;out.push({existing:b,adequacy:c,rec:d,head:!c&&!d})}return out};
  w.oc=kv3(S("Form D2"));w.erp=kv3(S("Form D3"));const D4=S("Form D4");if(D4){w.em={existing:g(D4,"B7"),rec:g(D4,"C7")};w.ms={existing:g(D4,"B8"),rec:g(D4,"C8")}}
  w.specific=rows(S("Form D5"),8,{chem:"B",rec:"C"},"chem").filter(x=>x.chem.toLowerCase()!=="none");
  const i=st.wus.findIndex(x=>x.name.toLowerCase()===w.name.toLowerCase());if(i>=0)st.wus[i]=w;else st.wus.push(w);return w}

/* ---------- dashboard job: one per CHRA report ---------- */
function dashJobs(o){const I=st.info,a=analyse(),T=a.T,hi=T.inhH+T.derH;
  if(!st.wus.length)return[];
  return[baseJob({id:`chra-${slugId(I.reportNo||I.client)}`,title:`CHRA – ${I.clientShort||I.client||"workplace"} (${st.wus.length} work units)`,reportNo:I.reportNo||"",location:I.locName||I.client||"",
    category:"Chemicals (VOC / hazardous)",pic:o.pic,priority:T.ap1||hi?"Critical":T.ap2?"High":"Normal",status:o.status,requestDate:o.req||o.date,deadline:o.date,result:"",unit:"",nab:"",recur:0,
    nextAction:`Implement ${T.ap1} AP1 and ${T.ap2} AP2 actions within 1 month (USECHH Reg. 12); reassess by ${I.nextReassess||"5 years"}`,
    notes:`From CHRA report. ${T.nchem} chemicals; inhalation H/M/L ${T.inhH}/${T.inhM}/${T.inhL}; dermal H/M/L ${T.derH}/${T.derM}/${T.derL}; AP1/AP2/AP3 ${T.ap1}/${T.ap2}/${T.ap3}. Client: ${I.client||"-"}.`})]}
