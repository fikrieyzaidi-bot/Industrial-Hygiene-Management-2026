/* Noise Risk Assessment (NRA) report generator — OSH (Noise Exposure) Regulations 2019 / ICOP 2019 */
const KEY="ihcc_noise1";
const LIM={exc:82,nel:85,max:115,peak:140};
const BLANK={info:{type:"Initial",workplace:"workplace",phpNrr:"24",phpModel:"",workDays:"Monday - Friday",workHours:"8:00 am – 5:00 pm",breaks:"Lunch Break 1.00 pm – 2.00 pm",exposureType:"Continuous & Intermittent",nature:"Routine"},
  inst:[],seg:[],area:[],src:[],ctl:{eng:[],adm:[],warn:[]},php:[],personal:[],text:{}};
let st=Store.load(KEY,BLANK);
const save=()=>Store.save(KEY,st);

/* ---------- calculations ---------- */
function hrs(d){const m=String(d||"").match(/(\d+):(\d{1,2})(?::(\d{1,2}))?/);if(!m)return num(d);return +m[1]+(+m[2])/60+(+(m[3]||0))/3600}
const zone=l=>l==null?"":l>115?"Purple":l>85?"Red":l>82?"Yellow":"White";
const ZFILL={Purple:"D9B3FF",Red:"FF9999",Yellow:"FFF2A8",White:"FFFFFF"};
const yn=b=>b?"YES":"NO";
function calcP(p){const te=hrs(p.dur),leq=num(p.leq),mx=num(p.max),pk=num(p.peak);
  const lex=num(p.lexOverride)??(leq!=null&&te?leq+10*Math.log10(te/8):null);
  const dose=leq!=null&&te?100*(te/8)*Math.pow(10,(leq-85)/10):null;
  const nrr=num(st.info.phpNrr),eff=nrr!=null?(nrr-7)/2:null;
  const r={te,leq,lex,dose,mx,pk,e82:lex>LIM.exc,nel:lex>LIM.nel,emx:mx>LIM.max,epk:pk>LIM.peak};
  r.excessive=r.e82||dose>50||r.emx||r.epk;
  r.lexA=eff!=null&&lex!=null?lex-eff:null;r.mxA=eff!=null&&mx!=null?mx-eff:null;r.pkA=nrr!=null&&pk!=null?pk-nrr/2:null;
  r.tNo=lex!=null?Math.min(8,8/Math.pow(2,(lex-85)/3)):null;r.tPhp=r.lexA!=null?Math.min(8,8/Math.pow(2,(r.lexA-85)/3)):null;
  r.phpOk=r.lexA!=null&&r.lexA<=LIM.nel&&r.mxA<=LIM.max&&r.pkA<=LIM.peak;return r}
const hm=h=>{if(h==null)return"–";if(h>=8)return"8 hours";const H=Math.floor(h),M=Math.round((h-H)*60);return`${H} hour${H!==1?"s":""} ${M} minute${M!==1?"s":""}`};
const segShort=s=>String(s||"").replace(/^.*?[-–]\s*/,"");
function segOf(p){const s=String(p.seg||"").toLowerCase();return st.seg.find(g=>g.key&&s.includes(String(g.key).toLowerCase()))||st.seg.find(g=>s.includes(String(g.seg||"").toLowerCase()))||null}
function analyse(){
  const P=st.personal.map(p=>({...p,r:calcP(p)})),cnt=f=>P.filter(p=>f(p.r)).length;
  const segNames=f=>[...new Set(P.filter(p=>f(p.r)).map(p=>segShort(p.seg)))];
  const A=st.area.map(a=>({...a,avgN:num(a.avg),z:zone(num(a.avg))}));
  return{P,A,n:P.length,c82:cnt(r=>r.e82),cnel:cnt(r=>r.nel),cmx:cnt(r=>r.emx),cpk:cnt(r=>r.epk),cexc:cnt(r=>r.excessive),
    s82:segNames(r=>r.e82),snel:segNames(r=>r.nel),smx:segNames(r=>r.emx),spk:segNames(r=>r.epk),sexc:segNames(r=>r.excessive),
    aExc:A.filter(a=>a.avgN>82),aRed:A.filter(a=>a.avgN>85),aPur:A.filter(a=>a.avgN>115),dates:[...new Set(P.map(p=>p.date))]}}

/* ---------- QA checks (CIH review) ---------- */
function qa(a){const I=st.info,out=[];
  if(!a.n)out.push(["err","No personal monitoring results entered."]);
  a.P.forEach(p=>{const r=p.r;if(r.te&&r.te<6)out.push(["warn",`${p.name}: sampling duration ${p.dur} is under 6 hours. Confirm it covers the full shift (Reg. 4 / ICOP: representative full-shift sampling).`]);
    if(!r.leq)out.push(["err",`${p.name}: LeqTe missing.`]);
    if(p.dosi&&st.inst.length&&!st.inst.some(i=>String(i.id).trim()===String(p.dosi).trim()))out.push(["warn",`${p.name}: dosimeter ${p.dosi} is not listed in the instrument table (Table 3).`])});
  st.seg.forEach(g=>{const n=a.P.filter(p=>segOf(p)===g).length;if(num(g.sampled)!=null&&n!==num(g.sampled))out.push(["warn",`SEG ${g.seg}: ${g.sampled} sampled in Table 5 but ${n} personal result(s) entered.`])});
  a.P.filter(p=>!segOf(p)).forEach(p=>out.push(["warn",`${p.name}: SEG "${p.seg}" does not match any SEG keyword in the SEG table.`]));
  st.inst.forEach(i=>{const m=String(i.cal||"").match(/(\d{2})\.(\d{2})\.(\d{4})\s*[–-]\s*(\d{2})\.(\d{2})\.(\d{4})/);if(!m)return;const to=new Date(+m[6],+m[5]-1,+m[4]);
    a.dates.forEach(d=>{const q=String(d).match(/(\d{2})[\/.](\d{2})[\/.](\d{4})/);if(q&&new Date(+q[3],+q[2]-1,+q[1])>to)out.push(["err",`${i.inst} ${i.id}: calibration expired (${i.cal}) before monitoring date ${d}.`])})});
  if(num(I.phpNrr)==null)out.push(["warn","Recommended PHP NRR not entered; attenuation (Table 12/14) cannot be calculated."]);
  a.P.filter(p=>p.r.lexA!=null&&!p.r.phpOk).forEach(p=>out.push(["err",`${p.name}: recommended PHP (NRR ${I.phpNrr}) is NOT sufficient (LEX ${f1(p.r.lexA)} / Max ${f1(p.r.mxA)} / Peak ${f1(p.r.pkA)} after attenuation). Consider double protection or a higher-NRR PHP.`]));
  if(a.aExc.length&&!a.P.some(p=>p.r.excessive))out.push(["warn","Area levels exceed 82 dB(A) but no personal exposure is excessive — check that the noisy tasks were captured in the personal sampling."]);
  return out}

/* ---------- auto text (editable) ---------- */
const plural=(n,s,p)=>n===1?s:p;
function resultsText(a){const W=st.info.workplace||"workplace";
  let s=`${nW(a.n)} employees were selected to represent similar exposure groups for Personal Noise Exposure Monitoring. `;
  s+=a.c82?`The results indicated that ${nw(a.c82)} of the monitored personnel ${plural(a.c82,"was","were")} exposed to noise levels exceeding the Excessive Noise Level of 82 dB(A)`:`None of the monitored personnel were exposed to a daily noise exposure level exceeding the Excessive Noise Level of 82 dB(A)`;
  s+=a.cnel?`, of which ${nw(a.cnel)} ${plural(a.cnel,"was","were")} exposed to noise levels exceeding the Daily Noise Exposure Limit of 85 dB(A). `:a.c82?", however none exceeded the Daily Noise Exposure Limit of 85 dB(A). ":". ";
  s+=a.cmx?`Meanwhile, ${nw(a.cmx)} of the monitored personnel ${plural(a.cmx,"was","were")} exposed to noise levels exceeding the Maximum Sound Pressure Level of 115 dB(A)`:`No personnel exceeded the Maximum Sound Pressure Level of 115 dB(A)`;
  s+=a.cpk?` and ${nw(a.cpk)} ${plural(a.cpk,"personnel","personnel")} exceeded the Peak Sound Pressure Level of 140 dB(C).`:` and no personnel exceeded the Peak Sound Pressure Level of 140 dB(C).`;
  return s}
const TEXTS=[
 ["exec","Executive summary – results",a=>resultsText(a)+" Results for personal noise exposure monitoring are summarized in Table 8 whilst the monitoring data are attached in Appendix D and Appendix E."],
 ["area","7.1 Area noise discussion",a=>{const W=st.info.workplace||"workplace";if(!a.A.length)return"No area noise monitoring was carried out.";
   const hi=[...a.A].sort((x,y)=>(y.avgN||0)-(x.avgN||0))[0];
   if(!a.aExc.length)return`Table 7 presents the measured noise levels at the ${W} whilst the noise mapping is presented in Appendix C. Results showed that noise levels in the ${W} did not exceed the Excessive Noise level of 82 dB(A); the highest level was ${f1(hi.avgN)} dB(A) at ${hi.src}.`;
   return`Table 7 presents the measured noise levels at the ${W} whilst the noise mapping is presented in Appendix C. ${nW(a.aExc.length)} of ${a.A.length} measured noise sources exceeded the Excessive Noise level of 82 dB(A), of which ${nw(a.aRed.length)} exceeded 85 dB(A) and are classified as Red Zone${a.aPur.length?` and ${nw(a.aPur.length)} exceeded 115 dB(A) (Purple Zone)`:""}. The highest level recorded was ${f1(hi.avgN)} dB(A) at ${hi.src}. These areas shall be demarcated as Hearing Protection Zones with warning signs posted, and the dominant noise sources are discussed in Table 9.`}],
 ["pers","7.2 Personal noise discussion",a=>resultsText(a)+(a.snel.length?` The SEGs exceeding the Noise Exposure Limit are ${listTxt(a.snel)}.`:"")+` Workers were generally exposed to the noise sources listed in Table 9; the frequency of use depended on the workers' job assignments for the day.`],
 ["concl","9.0 Conclusion",a=>{const I=st.info;return`The ${I.type||""} Noise Risk Assessment for ${I.client||"the client"} at their ${I.workplace||"workplace"} was carried out on ${I.dates||"–"}. ${resultsText(a)} `+
   (a.sexc.length?`Based on the findings, the management shall implement the Hearing Conservation Programme for the ${listTxt(a.sexc)} SEG${a.sexc.length>1?"s":""}, including noise control measures, provision of SIRIM-DOSH approved Personal Hearing Protectors (${I.phpModel||"–"}, NRR ${I.phpNrr||"–"} dB), annual hearing conservation training and audiometric testing, and demarcation of Hearing Protection Zones. `:`No SEG was exposed to excessive noise; existing controls should be maintained. `)+
   `Noise risk assessment shall be reviewed within five (5) years, or earlier when there is any change in process, equipment, work practice or control measures, or when audiometric testing indicates hearing impairment (Regulation 4(5)).`}],
];
const textOf=(k,a)=>st.text[k]??TEXTS.find(t=>t[0]===k)[2](a);

/* ---------- report block model (mirrors the ESTV NRA final report structure) ---------- */
function model(){const I=st.info,a=analyse(),B=[],T=(cap,head,rows,o={})=>B.push({t:"table",cap,head,rows,...o});
  const W=I.workplace||"workplace",title=`${(I.type||"").toUpperCase()} NOISE RISK ASSESSMENT`;
  B.push({t:"cover",lines:[{x:"OCCUPATIONAL SAFETY & HEALTH\n(NOISE EXPOSURE) REGULATIONS, 2019",size:24,bold:true},{x:title,size:32,bold:true},{x:"AT",size:22},{x:(I.client||"").toUpperCase(),size:28,bold:true},{x:(I.month||"").toUpperCase(),size:22,after:500},
    {x:`WORKPLACE DOSH REGISTRATION NO.: ${I.doshNo||"–"}\nMONITORING DATE: ${I.dates||"–"}\nNOISE RISK ASSESSOR: ${(I.assessor||"").toUpperCase()} (${I.assessorReg||"–"})\nREPORT REFERENCE NO.: ${I.reportNo||"–"}`,size:20,after:500},
    {x:`Owner:\n${I.client||""}\n${I.address||""}`,size:18},{x:`Contractor:\n${I.consName||""}\n${I.consAddr||""}\n${I.consTel||""}`,size:18}]});
  B.push({t:"pb"});
  B.push({t:"h1",x:"EXECUTIVE SUMMARY"});
  B.push({t:"kv",rows:[["Introduction",`The Noise Risk Assessment was conducted for ${I.client} on ${I.dates} at their ${W} in compliance with Regulation 4, Occupational Safety and Health (Noise Exposure) Regulations, 2019. The ${W} is located in ${I.location||"–"}.`],
    ["Objectives",`To identify noise levels generated by the equipment, to evaluate and document the personal noise exposure for individual employees in the similar exposure groups within the ${W} on a normal working day, and to recommend suitable control measures.`],
    ["Instrumentation",st.inst.map(i=>`${i.inst} (S/N: ${i.id})`).join(", ")],["Results",textOf("exec",a)],
    ["Area Monitoring – Exceed 82 dB(A)",[...new Set(a.aExc.map(x=>x.src.replace(/^.*?–\s*/,"").replace(/\s*\(.*\)$/,"")))].join("\n")||"None"],
    ["Personal – Exceed Excessive Noise 82 dB(A)",a.s82.join("\n")||"None"],["Personal – Exceed NEL 85 dB(A)",a.snel.join("\n")||"None"],
    ["Personal – Exceed Max SPL 115 dB(A)",a.smx.join("\n")||"None"],["Personal – Exceed Peak SPL 140 dB(C)",a.spk.join("\n")||"None"],
    ["Recommendations",`Engineering control: consider the proposed engineering controls in Table 13 and review feasibility with the Engineering/Maintenance Department.\nAdministrative control: maintain existing practices and conduct regular inspection and preventive maintenance of equipment and tools.\nPHP: issue SIRIM-DOSH approved ${I.phpModel||"PHP"} (NRR ${I.phpNrr||"–"} dB)${a.sexc.length?" to the "+listTxt(a.sexc)+" SEG(s)":""}; PHP must be worn in Hearing Protection Zones.\nHearing conservation training and audiometric testing: annually for ${listTxt(a.sexc)||"– (not required)"}.\nHearing Protection Zone: post 'HEARING PROTECTION ZONE / ZON PERLINDUNGAN PENDENGARAN' signs at areas exceeding the NEL (Red/Purple zones).`]]});
  B.push({t:"pb"},{t:"toc"},{t:"pb"});
  /* 1.0 */
  B.push({t:"h1",x:"1.0 INTRODUCTION"},{t:"h2",x:"1.1 Background"},{t:"p",x:I.background||""},
    {t:"p",x:`${I.consName} has been appointed by ${I.client} to conduct ${I.type} Noise Risk Assessment at their ${W} in compliance with the Occupational Safety and Health (Noise Exposure) Regulations 2019, carried out by a Noise Risk Assessor registered with the Department of Occupational Safety and Health (DOSH) Malaysia. This report presents the details of the assessment conducted on ${I.dates} when the ${W} was operating at normal condition.`},
    {t:"h2",x:"1.2 Particulars of Management"},{t:"kv",rows:[["Name of Installation",I.client],["Location",I.address],["Management Representative",`${I.mgmtRep||""}\n${I.mgmtDesig||""}`]]},
    {t:"h2",x:"1.3 Particulars of Monitoring"},{t:"kv",rows:[["Monitored by",I.consName],["Date of monitoring",I.dates],["Noise Risk Assessor",`${I.assessor}\n${I.assessorReg}`],["Assistant Noise Risk Assessor",I.assistant||"–"]]});
  const areas=[...new Set(st.seg.map(g=>g.area))];
  T("Table 1: Monitoring Details",["Type of Monitoring","Work Activities"],[["Area Noise Monitoring",[...new Set(st.area.map(x=>x.area))].map((x,i)=>`${i+1}) ${x}`).join("\n")],
    ["Personnel Exposure Monitoring",areas.map(ar=>`${ar}\n`+st.seg.filter(g=>g.area===ar).map(g=>`• ${g.seg} (${g.sampled} pax)`).join("\n")).join("\n")+`\nTotal: ${nW(a.n)} personnel`]],{w:[30,70]});
  B.push({t:"h2",x:"1.4 Purpose of monitoring"},{t:"ul",items:[`This report presents the details of the ${I.type} Noise Risk Assessment for determination of noise levels for ${I.client} at their ${W} in compliance with Occupational Safety & Health (Noise Exposure) Regulations, 2019.`,
    `This assessment has been conducted based on the activities carried out on the monitoring days. If there are any changes in the production, process, equipment, control measure or personnel, this report is considered invalid.`,
    `All information regarding the installation, equipment, layout, process flowchart and personnel has been provided by the representative from ${I.client}.`]});
  /* 2.0 */
  B.push({t:"h1",x:"2.0 OBJECTIVES"},{t:"p",x:`2.1 The main objective of this work is to conduct ${I.type} Noise Risk Assessment for ${I.client} at their ${W} in order to comply with Occupational Safety & Health (Noise Exposure) Regulations, 2019.`},
    {t:"p",x:"2.2 Scope of Work:"},{t:"ul",items:["To identify all personnel likely to be exposed to excessive noise and to evaluate personnel exposure to noise during the entire work shift.",
    "To assess personnel noise exposure against the Noise Exposure Limits: Daily Noise Exposure Level 85 dB(A) / Daily Personal Dose 100%; Maximum SPL 115 dB(A) at any time; Peak SPL 140 dB(C).",
    "To identify personnel exposed to hazardous noise who require hearing protection, audiometric testing, information, instruction and training.",
    "To identify personnel who need periodic monitoring and health surveillance, and whether any are at particular risk.",
    `To identify and confirm the sources, levels and types of noise in the ${W}.`,`To map the ${W} into different noise zones.`,
    "To identify noisy areas to be posted with warning signs and define Hearing Protection Zones.",
    "To recommend appropriate actions to reduce the risk to As Low As Reasonably Practicable (ALARP) where results exceed the Noise Exposure Limits."]});
  /* 3.0 */
  B.push({t:"h1",x:"3.0 PROCESS DESCRIPTION"},{t:"p",x:`3.1 The work process for ${I.client} at their ${W} can be best described as below:`},...String(I.process||"").split("\n").filter(Boolean).map(x=>({t:"p",x})),
    {t:"p",x:"Process flowchart: refer Appendix A."},{t:"h2",x:"3.2 Work schedule (Personal Noise Exposure Monitoring)"});
  T("Table 2: Work schedule of the personnel",["No.","Groups","Work Days","Work Shift","Break","Type of exposure","Nature of work"],[["1","All",I.workDays,I.workHours,I.breaks,I.exposureType,I.nature]]);
  /* 4.0 */
  B.push({t:"h1",x:"4.0 INSTRUMENTATION"},{t:"p",x:"Regulation 4(3) of the OSH (Noise Exposure) Regulations 2019 stipulates that the noise risk assessor shall carry out the noise risk assessment using noise measuring equipment which complies with the standards determined by the International Electrotechnical Commission (IEC). The sound level meter meets IEC 61672-1, the noise dosimeter meets IEC 61252 and the acoustic calibrator meets IEC 60942 Class 1."},
    {t:"p",x:"The sound level meter and noise dosimeters were field-calibrated before and after the monitoring; the deviation from the calibration value was within ±0.5 dB, otherwise monitoring is repeated. Calibration details are shown in the computer printout (Appendix E) and calibration certificates in Appendix F."});
  T("Table 3: Details of Instruments Used During the Noise Risk Assessment",["Instrument","Manufacturer","Model","Equipment ID","Calibration Validity Period"],st.inst.map(i=>[i.inst,i.mfr,i.model,i.id,i.cal]));
  /* 5.0 */
  B.push({t:"h1",x:"5.0 METHODOLOGY"},{t:"h2",x:"5.1 Noise Source Monitoring"},{t:"p",x:"Noise source measurements were taken with the sound level meter microphone pointed toward the noise source at about one metre above ground level and about one metre from the source. At least three measurements were taken for each noise source and the average recorded. Measurements were corrected for background noise where the source could be stopped; otherwise the level was taken with the source in operation."},
    {t:"h2",x:"5.2 Noise Mapping"},{t:"p",x:"Noise mapping was carried out using the sound level meter at grid positions throughout the selected areas, and the workplace was demarcated into colour zones representing the degree of noise exposure."});
  T("Table 4: Colour zoning according to noise level",["Sound Pressure Level","Colour Zone"],[["> 140 dB(C) or > 115 dB(A)","Purple"],["> 85 dB(A) to 115 dB(A)","Red"],["> 82 dB(A) to 85 dB(A)","Yellow"],["≤ 82 dB(A)","White / Uncoloured"]],{fill:{"0,1":ZFILL.Purple,"1,1":ZFILL.Red,"2,1":ZFILL.Yellow}});
  B.push({t:"h2",x:"5.3 Personal Noise Exposure Monitoring"},{t:"p",x:"5.3.1 Similar exposure groups (SEGs) were identified after consultation with the company representative. Employees in these SEGs are exposed or likely to be exposed to excessive noise."});
  T("Table 5: Identification of Similar Exposure Groups",["Work Area","Similar Exposure Group (SEG)","No. of Personnel","Sampled Personnel"],[...st.seg.map(g=>[g.area,g.seg,g.n,g.sampled]),["TOTAL","","",String(st.seg.reduce((s,g)=>s+(num(g.sampled)||0),0))]]);
  B.push({t:"p",x:`5.3.2 ${nW(a.n)} employees were selected to represent each SEG, based on: (a) working directly with the noise source; (b) working near or passing through noisy areas; (c) working in noisy areas for long periods.`},
    {t:"p",x:"5.3.3 Sampling duration: monitoring was carried out for the full period of working hours (computer printout in Appendix E)."},
    {t:"p",x:"5.3.4 The dosimeter microphone was clipped on top of the shoulder at least 0.1 m from the entrance of the ear canal on the most exposed side, approximately 0.04 m above the shoulder, and fastened to avoid mechanical influence or covering by clothing. Start/stop times were recorded and workers were observed periodically."},
    {t:"p",x:"5.3.5 Selected employees were briefed on the purpose of monitoring, to work as normal, not to remove, cover, touch or speak into the microphone, and employee data were recorded on the Personal Noise Exposure Data Sheet."});
  T("Table 6: Dosimeter Setting",["Item","Setting"],[["Exchange rate","3 dB"],["Frequency weighting","A"],["Peak weighting","C"],["Response","Slow"],["Threshold level","80 dB(A)"],["Criterion level","85 dB(A)"],["Projection time","8 hours"]]);
  B.push({t:"h2",x:"5.4 Definitions"},{t:"ul",items:["dB(A) – sound pressure level corrected to the A-weighted frequency scale (reference 20 µPa).","dB(C) – sound pressure level corrected to the C-weighted frequency scale (reference 20 µPa).",
    "Excessive Noise – daily noise exposure level exceeding 82 dB(A), or daily personal noise dose exceeding 50%, or maximum SPL exceeding 115 dB(A) at any time, or peak SPL exceeding 140 dB(C).",
    "Daily Noise Exposure Level (LEX,8h) – equivalent continuous sound pressure level normalised to an 8-hour working day: LEX,8h = LAeq,Te + 10 log(Te/8).",
    "Maximum Sound Pressure Level (Lmax) – highest A-weighted sound pressure level that shall not be exceeded at any time.","Peak Sound Pressure Level (Lpeak) – highest C-weighted instantaneous sound pressure level of any impact.",
    "Steady noise – fluctuation < 3 dB; Fluctuating noise – 3 to 10 dB; Impulse/impact noise – sudden loud noise differing greatly from normal levels."]},
    {t:"h2",x:"5.5 Noise Exposure Limits (Regulation 6)"},{t:"kv",rows:[["Daily Noise Exposure Level","> 85 dB(A)"],["Maximum Sound Pressure Level","> 115 dB(A)"],["Peak Sound Pressure Level","> 140 dB(C)"]]});
  /* 6.0 */
  B.push({t:"h1",x:"6.0 RESULTS"},{t:"h2",x:"6.1 Area Noise Exposure Monitoring"},{t:"p",x:`Area noise monitoring was carried out with equipment operating under usual conditions. Noise sources, types and levels measured at the ${W} are tabulated below.`});
  const fill7={};a.A.forEach((x,i)=>{if(ZFILL[x.z]&&x.z!=="White")fill7[i+",6"]=ZFILL[x.z]});
  T(`Table 7: Area Noise Exposure Monitoring Results for ${I.client}`,["No.","Working Area","Job Specification & Task","No. of Personnel","Personnel Monitored","Source of Noise","Noise Level dB(A) range (avg)","Type","Colour Zone"],
    a.A.map((x,i)=>[i+1,x.area,x.task,x.n,x.mon,x.src,`${x.min} – ${x.max}\n(${f1(x.avgN)})`,x.type,x.z]),{small:true,fill:Object.fromEntries(Object.entries(fill7).map(([k,v])=>[k.replace(",6",",8"),v]))});
  B.push({t:"p",i:true,x:"Notes: SCN = Steady Continuous Noise; FCN = Fluctuating Continuous Noise; IMP = Impulse/Impact noise. Noise point locations: Appendix C – Noise Mapping."},
    {t:"h2",x:"6.2 Noise Mapping"},{t:"p",x:`The noise mapping was done based on the ${W} layout and is attached in Appendix C.`},{t:"h2",x:"6.3 Personal Noise Exposure Monitoring"},
    {t:"p",x:"Details of the personnel monitored are listed in Appendix D – Personal Data Sheet and the dosimeter printouts in Appendix E."});
  a.dates.forEach((d,di)=>{const rows=a.P.filter(p=>p.date===d),fill={};
    rows.forEach((p,i)=>{[["e82",9],["nel",10],["emx",11],["epk",12]].forEach(([k,c])=>{if(p.r[k])fill[i+","+c]="FF9999"})});
    T(`Table 8.${di+1}: Summary of Personal Noise Exposure Monitoring for ${I.client} on ${d}`,["SEG","Employee Name","Working Area","Sampling Duration","DoseTe %","LeqTe dB(A)","LEX,8h dB(A)","Max dB(A)","Peak dB(C)","Excessive 82 dB(A)","NEL 85 dB(A)","Max 115 dB(A)","Peak 140 dB(C)"],
      rows.map(p=>[p.seg,p.name,p.area,p.dur,f1(p.r.dose),f1(p.r.leq),f1(p.r.lex),f1(p.r.mx),f1(p.r.pk),yn(p.r.e82),yn(p.r.nel),yn(p.r.emx),yn(p.r.epk)]),{small:true,fill})});
  /* 7.0 */
  B.push({t:"h1",x:"7.0 DISCUSSION"},{t:"p",x:`The ${I.type} Noise Risk Assessment was conducted for ${I.client} at their ${W} covering area and personal noise exposure monitoring. A total of ${nw(a.n)} personnel were monitored on ${I.dates}.`},
    {t:"h2",x:"7.1 Area Noise Exposure Monitoring"},{t:"p",x:textOf("area",a)});
  T("Table 9: Dominant Noise Sources",["Dominant Noise Source","Discussion"],st.src.map(s=>[s.src,s.disc]),{w:[25,75]});
  B.push({t:"h2",x:"7.2 Personal Noise Exposure Monitoring"},{t:"p",x:textOf("pers",a)});
  const ex=b=>b?"Exceeded":"Not exceeded",f10={};a.P.forEach((p,i)=>[["e82",2],["nel",3],["emx",4],["epk",5]].forEach(([k,c])=>{if(p.r[k])f10[i+","+c]="FF9999"}));
  T("Table 10: Summary of Limits Exceedance for Personal Noise Exposure Monitoring (without PHP)",["SEG","Working Area","Excessive 82 dB(A)","LEX,8h 85 dB(A)","Max 115 dB(A)","Peak 140 dB(C)"],a.P.map(p=>[segShort(p.seg),String(p.seg).split(/\s[-–]\s/)[0],ex(p.r.e82),ex(p.r.nel),ex(p.r.emx),ex(p.r.epk)]),{fill:f10});
  B.push({t:"h2",x:"7.3 Existing Control Measures"},{t:"h3",x:"7.3.1 Engineering Control"},st.ctl.eng.length?{t:"ul",items:st.ctl.eng}:{t:"p",x:"No engineering control was observed."},
    {t:"h3",x:"7.3.2 Administrative Control"},st.ctl.adm.length?{t:"ul",items:st.ctl.adm}:{t:"p",x:"No administrative control was observed."},{t:"h3",x:"7.3.3 Personal Hearing Protector"});
  T("Table 11: Type of Personal Hearing Protector (PHP) issued by the Management",["No.","Type","Area","Model","NRR (dB)"],st.php.map((p,i)=>[i+1,p.type,p.area,p.model,p.nrr]));
  const nrr=num(I.phpNrr);
  T(`Table 12: Estimated noise exposure with recommended PHP – ${I.phpModel||"–"} (NRR ${I.phpNrr||"–"} dB)`,["SEG / Employee","LEX,8h dB(A)","Max dB(A)","Peak dB(C)","Effective NRR dB(A)","LEX,8h after PHP","Max after PHP","Peak after PHP","Below NEL?"],
    a.P.map(p=>[`${segShort(p.seg)}\n${p.name}`,f1(p.r.lex),f1(p.r.mx),f1(p.r.pk),nrr!=null?f1((nrr-7)/2):"–",f1(p.r.lexA),f1(p.r.mxA),f1(p.r.pkA),p.r.lexA==null?"–":p.r.phpOk?"Yes":"NO"]),{small:true});
  B.push({t:"p",i:true,x:`*Effective NRR = (NRR – 7) / 2 (OSHA 50% derating) applied to LEX,8h and Max level; Peak level (C-weighted) attenuation uses NRR / 2. For double protection, use the NRR of the higher-rated protector and add 5 dB. Example: ${a.P[0]?`${f1(a.P[0].r.lex)} dB(A) – [(${I.phpNrr} – 7) / 2] = ${f1(a.P[0].r.lexA)} dB(A)`:""}.`},
    {t:"h3",x:"7.3.4 Warning Signs"},st.ctl.warn.length?{t:"ul",items:st.ctl.warn}:{t:"p",x:"No hearing protection warning sign was observed."},
    {t:"p",i:true,x:`It must be noted that this Noise Risk Assessment only reflects the operational conditions for ${I.client} at their ${W} during the period of ${I.dates}.`});
  /* 8.0 */
  B.push({t:"h1",x:"8.0 RECOMMENDATIONS"},{t:"p",x:"Based on the results, the following control measures are recommended as per the Hearing Conservation Programme (HCP) in the Industry Code of Practice for Management of Occupational Noise Exposure 2019, to comply with the OSH (Noise Exposure) Regulations 2019."});
  const segRows=[];st.seg.forEach(g=>{const ps=a.P.filter(p=>segOf(p)===g);if(!ps.length)return;const r=ps.map(p=>p.r),srcs=String(g.srcs||"").split(/[,;]\s*/).filter(Boolean);
    const exc=r.some(x=>x.excessive),nel=r.some(x=>x.nel||x.emx||x.epk);
    const engRec=srcs.map(s=>(st.src.find(x=>x.src.toLowerCase()===s.toLowerCase())||{}).eng).filter(Boolean);
    segRows.push([g.seg,r.map(x=>f1(x.lex)).join("\n"),r.map(x=>f1(x.mx)).join("\n"),r.map(x=>f1(x.pk)).join("\n"),srcs.join("\n")||"–",
      `ENGINEERING: ${nel?(engRec.length?engRec.join(" "):"Investigate engineering noise control at source/path."):"Not required; maintain existing condition of equipment."}\n`+
      `ADMINISTRATIVE: ${st.ctl.adm.length?"Maintain existing administrative controls. ":""}Conduct regular inspection and preventive maintenance of tools and equipment. ${nel?`Daily exposure duration limit with PHP: ${hm(Math.min(...r.map(x=>x.tPhp??8)))} (Table 14).`:""}\n`+
      `PHP: ${exc?`Issue ${I.phpModel} (NRR ${I.phpNrr} dB); ${r.every(x=>x.phpOk)?"single protection is sufficient":"single protection is NOT sufficient – use double protection / higher NRR"}. PHP must be SIRIM-DOSH approved, suitable, maintained and available at all times.`:"Not mandatory; provide on request."}`])});
  T("Table 13: Recommended Control Measures for Personnel Exposed to Noise",["SEG","LEX,8h","Max","Peak","Noise Source","Recommended Control Measures"],segRows,{small:true,w:[13,7,7,7,14,52]});
  T("Table 14: Daily Exposure Duration Limit (T = 8 / 2^((L–85)/3), 3 dB exchange rate)",["SEG / Employee","LEX,8h dB(A)","Duration limit without PHP","LEX,8h with PHP dB(A)","Duration limit with PHP"],a.P.map(p=>[`${segShort(p.seg)} – ${p.name}`,f1(p.r.lex),hm(p.r.tNo),f1(p.r.lexA),hm(p.r.tPhp)]));
  B.push({t:"h2",x:"8.1 Hearing Conservation Programme"},{t:"ul",items:[
    `Hearing conservation training (Regulation 13): required annually for the ${listTxt(a.sexc)||"– (none)"} SEG(s), covering effects of noise, results of the assessment, control measures, correct use and maintenance of PHP, and audiometric testing.`,
    `Audiometric testing (Regulation 15): required annually for the ${listTxt(a.sexc)||"– (none)"} SEG(s); baseline test within 3 months of employment. Appoint a DOSH-approved audiometric testing centre and ensure results are reviewed by a DOSH-registered Occupational Health Doctor.`,
    `Hearing Protection Zone (Regulation 11): demarcate areas exceeding the NEL (Red/Purple zones in Appendix C) with signs bearing "HEARING PROTECTION ZONE" or "ZON PERLINDUNGAN PENDENGARAN".`,
    "Personal Hearing Protector (Regulation 12): effective 1 June 2022 all PHP issued must have SIRIM-DOSH approval; maintain issuance records.",
    `Noise exposure monitoring: ${a.cnel?"repeat personal noise monitoring after control measures are implemented and at least once every 5 years":"review within 5 years or upon any change in process or equipment"}.`,
    "Record keeping: keep the noise risk assessment report, audiometric test records and training records for the period required by the Regulations."]});
  B.push({t:"h1",x:"9.0 CONCLUSION"},{t:"p",x:textOf("concl",a)});
  B.push({t:"h1",x:"10.0 RESOURCES"},{t:"ul",items:["Occupational Safety and Health Act 1994 (Act 514).","Occupational Safety and Health (Noise Exposure) Regulations 2019.","Industry Code of Practice for Management of Occupational Noise Exposure and Hearing Conservation 2019, DOSH Malaysia.","Guidelines on Noise Risk Assessment, DOSH Malaysia.","IEC 61672-1, IEC 61252 and IEC 60942 instrument standards."]});
  B.push({t:"h1",x:"11.0 APPENDICES"},{t:"ul",items:["A. Process Flowchart","B. Site Layout with Equipment and Personnel Monitored","C. Noise Mapping","D. Personal Data Sheet","E. Computer Print Out","F. Calibration Certificate","G. Noise Risk Assessor Certificate","H. Form A (Borang Pengesahan Majikan)","I. Area & Personnel Monitoring Photos"]});
  return B}
const META=()=>({title:`${st.info.type} Noise Risk Assessment – ${st.info.client}`,header:`${st.info.type} Noise Risk Assessment | ${st.info.client} | ${st.info.month||""}`,
  footer:`This report shall not be reproduced, distributed or copied without prior written consent of ${st.info.consName||"the consultant"}.`});

/* ---------- Excel import: 'Datasheet & Calculation' workbooks (Personal Form + Summary sheets) ---------- */
async function importDatasheet(file){const wb=await readWorkbook(file);const sm=wb.Sheets["Summary"],pf=wb.Sheets["Personal Form"];
  if(!sm){toast(`${file.name}: no 'Summary' sheet found`);return 0}
  const S=sheetAOA(sm),hdr=S.findIndex(r=>r.some(c=>/employee name/i.test(cellTxt(c))));if(hdr<0){toast("Summary header not found");return 0}
  const H=S[hdr].map(cellTxt),ci=re=>H.findIndex(h=>re.test(h));
  const cSeg=ci(/^SEG$/i),cName=ci(/employee/i),cArea=ci(/working area/i),cDur=ci(/duration/i);
  let date="",ids={};if(pf){const F=sheetAOA(pf);F.forEach(r=>{const i=r.findIndex(c=>/date of assessment/i.test(cellTxt(c)));if(i>=0&&!date)date=cellTxt(r[i+1]).replace(/\./g,"/")});
    const ph=F.findIndex(r=>r.some(c=>/dosimeter id/i.test(cellTxt(c))));if(ph>=0){const h=F[ph].map(cellTxt),cn=h.findIndex(x=>/^name$/i.test(x)),cd=h.findIndex(x=>/dosimeter/i.test(x));F.slice(ph+1).forEach(r=>{if(cellTxt(r[cn]))ids[cellTxt(r[cn])]=cellTxt(r[cd])})}}
  let n=0;S.slice(hdr+1).forEach(r=>{const nm=cellTxt(r[cName]);if(!nm||nm==="0"||/^\d+(\.\d+)?$/.test(nm))return;const v=k=>{const x=num(r[cDur+k]);return x==null?"":String(Math.round(x*10)/10)};
    // after Duration: Dose, LeqTe, LEX, Max, Peak
    let dur=r[cDur];if(typeof dur==="number")dur=new Date(Math.round(dur*86400)*1000).toISOString().substr(11,8);else if(dur instanceof Date)dur=dur.toTimeString().substr(0,8);
    const rec={date,seg:cellTxt(r[cSeg]),name:nm,area:cellTxt(r[cArea]),dosi:ids[nm]||"",dur:cellTxt(dur),leq:v(2),max:v(4),peak:v(5)};
    const i=st.personal.findIndex(p=>p.name===nm&&p.date===date);if(i>=0)st.personal[i]={...st.personal[i],...rec};else st.personal.push(rec);n++});
  return n}
