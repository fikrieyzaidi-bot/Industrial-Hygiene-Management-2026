/* CEM Calculator — expert report text, report model, PDF + Word output */
const list=a=>a.length<=1?(a[0]||""):a.slice(0,-1).join(", ")+" and "+a[a.length-1];
const pctTxt=p=>p==null?"–":p<0.1?"<0.1%":(p<1?p.toFixed(1):Math.round(p))+"%";
const noDot=s=>String(s||"").replace(/\.+$/,"");
const pctG=g=>g.pct==null?"–":(g.lt?"<":"")+pctTxt(g.pct);
const lc=s=>String(s||"").replace(/^[A-Z](?=[a-z])/,c=>c.toLowerCase());
function hazType(name){const s=(name+" "+((DB[param(name).db]||{}).en||"")).toLowerCase();
  if(/silica|quartz|cristobalite|tridymite/.test(s))return"silica";
  if(/isocyanate|\bmdi\b|\btdi\b|\bhdi\b/.test(s))return"isocyanate";
  if(/fume|welding|lead|cadmium|chromium|manganese|nickel|copper|zinc|iron|alumin|cobalt|arsenic|mercury|\btin\b|antimony|beryllium|metal/.test(s))return"fume";
  if(/dust|particulate|pnoc|cement|talc|kaolin|wood|grain|carbonate|gypsum|titanium|graphite|coal|fibre|asbestos/.test(s))return"dust";
  if(/ammonia|hydrogen sulfide|sulfur dioxide|nitrogen dioxide|nitric oxide|carbon monoxide|carbon dioxide|chlorine|ozone|phosgene|cyanide|hydrogen chloride|hydrogen fluoride/.test(s))return"gas";
  if(/acid|hydroxide/.test(s))return"acid";
  return"solvent"}
const limOf=g=>`${g.basis} of ${g.lim??"–"} mg/m³`;
const rangeTxt=x=>x.done.length>1?(x.lo.basis===x.worst.basis?`ranged from ${twaTxt(x.lo)} to ${twaTxt(x.worst)} mg/m³ (${pctG(x.lo)}–${pctG(x.worst)} of the ${limOf(x.worst)})`
  :`ranged from ${twaTxt(x.lo)} mg/m³ (${pctG(x.lo)} of the ${limOf(x.lo)}) to ${twaTxt(x.worst)} mg/m³ (${pctG(x.worst)} of the ${limOf(x.worst)})`):`was ${twaTxt(x.worst)} mg/m³ (${pctG(x.worst)} of the ${limOf(x.worst)})`;
const shortNote=a=>a.shortG.length?`${a.shortG.length===a.G.filter(g=>g.complete).length?"All samples were":`Samples for ${list(a.shortG.map(g=>`${g.worker} (${g.point}) – ${g.param}, ${f(g.sumT,0)} min`))} were`} collected over less than 60 minutes; these results are therefore reported as short-term exposure (average concentration over the sampling time) and compared with the Maximum Exposure Limit (MEL = 3 × PEL) of USECHH 2000 instead of the 8-hour TWA PEL.`:"";
/* when short-duration (<60 min) samples are present, refer to the MEL / applicable limit instead of the PEL in generic wording */
function limWords(s,a){if(a.L==="PEL")return s;const L=a.L;
  return s.replace(/Permissible Exposure Limit \(PEL\)/g,L==="MEL"?"Maximum Exposure Limit (MEL)":"applicable exposure limit (PEL, or MEL for samples under 60 minutes)")
    .replace(/(half \(50%\) of|half of|10% of|exceeded|exceed|below|above|of) the (applicable )?PEL\b(?! of [\d<–-])/g,`$1 the ${L}`)
    .replace(/times the PEL/g,`times the ${L}`)}
const CAT={over:"exceeded the PEL",half:"exceeded half (50%) of the PEL",ten:"exceeded 10% of the PEL",low:"below 10% of the PEL"};
function analyse(){
  const I=st.info,C=st.ctl,G=groups().filter(g=>g.point!=="Blank"),client=I.client||"the client";
  G.forEach(g=>{g.cat=g.pct==null?null:g.lt?"nd":g.pct>=100?"over":g.pct>=50?"half":g.pct>=10?"ten":"low";g.ratio=g.pct==null?null:g.pct/100;g.task=(st.points[g.point]||{}).area||"";g.desc=(st.points[g.point]||{}).desc||""});
  const params=[...new Set(G.map(g=>g.param))],pts=[...new Set(G.map(g=>g.point))],n=pts.length;
  const P=params.map(p=>{const gs=G.filter(g=>g.param===p),done=gs.filter(g=>g.twa!=null),pp=param(p);
    const k=g=>g.pct!=null?g.pct:g.twa; // rank by % of the applicable limit (PEL, or MEL for short samples)
    const worst=done.reduce((a,b)=>!a||k(b)>k(a)?b:a,null),lo=done.reduce((a,b)=>!a||k(b)<k(a)?b:a,null);
    const cats=done.map(g=>g.cat),top=["over","half","ten","low","nd"].find(c=>cats.includes(c))||null;
    return{p,gs,done,pel:num(pp.pel),worst,lo,top,haz:hazType(p),skin:!!pp.skin,s2:!!pp.s2,maxRatio:worst&&worst.ratio}});
  const rpe=RPE[C.rpe||""]||RPE[""],apf=rpe[1],need=Math.max(0,...P.map(x=>x.maxRatio||0));
  const worstCat=["over","half","ten","low","nd"].find(c=>P.some(x=>x.top===c))||null;
  const ndHigh=G.filter(g=>g.cat==="nd"&&g.pct>=10);
  const wl=g=>`Worker ${g.point} (${g.worker}${g.task?", "+g.task:""}) for ${g.param} (${twaTxt(g)} mg/m³, ${pctG(g)} of ${g.basis}${g.short?`, sampled ${f(g.sumT,0)} min`:""})`;
  const shortG=G.filter(g=>g.short&&g.complete),L=!shortG.length?"PEL":shortG.length===G.filter(g=>g.complete).length?"MEL":"applicable limit";
  return{var:st.textVar||{},ndHigh,shortG,L,I,C,G,P,client,params,n,wN:n+" worker"+(n===1?"":"s"),area:(I.area||"workplace").toLowerCase(),rpe,apf,need,worstCat,wl,
    over:G.filter(g=>g.cat==="over"),half:G.filter(g=>g.cat==="half"),ten:G.filter(g=>g.cat==="ten"),low:G.filter(g=>g.cat==="low"),
    pelList:params.map(p=>`${p} (${param(p).pel??"–"} mg/m³)`),eng:[...C.eng,...(C.engOther?[C.engOther]:[])],adm:[...C.adm,...(C.admOther?[C.admOther]:[])]}}
function freqLine(a){if(a.over.length)return"Repeat personal exposure monitoring within six (6) months, after the improved controls are in place, to confirm that exposure has been reduced below the PEL.";
  if(a.half.length)return"Repeat personal exposure monitoring at intervals not exceeding twelve (12) months, since results were above half of the PEL.";
  if(a.ten.length||a.ndHigh.length)return"Collect a further six (6) personal exposure samples for the parameters above 10% of the PEL to complete the compliance assessment, in line with the Guidelines on Monitoring of Airborne Chemical Hazardous to Health 2022.";
  return"Further monitoring should follow the CHRA assessor's recommendation; continue to review exposure whenever the process, materials or controls change."}
function engAdvice(h){return{
  silica:"Control respirable crystalline silica at source: keep water sprays/misting working at crushers, screens and conveyor transfer points, enclose transfer points and fit local exhaust ventilation (LEV) with a dust collector, and provide operator cabins with filtered air where practicable. Prohibit dry sweeping and the use of compressed air for cleaning; use wet methods or an H-class (HEPA) vacuum.",
  dust:"Reduce dust generation at source with water sprays or misting at crushing, screening and transfer points, enclose dusty transfer points, and connect them to LEV with a dust collector. Use wet cleaning or vacuum instead of dry sweeping.",
  fume:"Provide on-tool or local fume extraction (LEV) positioned as close as possible to the fume source, and maintain good general ventilation in the work area.",
  solvent:"Provide LEV at mixing, spraying, dispensing and cleaning points (for example a spray booth or slot hood), keep solvent containers closed when not in use, reduce the quantity held at the workstation, and evaluate substitution with lower-volatility or less hazardous products.",
  gas:"Improve containment at the source and ventilation in the work area, and install fixed gas detection with alarms where the gas can accumulate.",
  isocyanate:"Carry out isocyanate spraying only inside an enclosed, ventilated spray booth with LEV, and restrict access to the area during and after spraying.",
  acid:"Provide LEV or fume extraction over tanks and baths, keep tanks covered when not in use, and maintain good general ventilation."}[h]}
function rpeAdvice(h){return{silica:"a half-face respirator with P3 particulate filters (or at least a P2 / N95 respirator where exposure is well below the PEL)",dust:"a P2 (N95) particulate respirator",fume:"a P2/P3 particulate respirator suited to metal fume",
  solvent:"a half-face respirator with organic vapour (type A) cartridges and a documented cartridge change-out schedule",gas:"a respirator with a cartridge rated for the specific gas, or supplied air where concentrations may be high",
  isocyanate:"supplied-air respiratory protection during spraying",acid:"a respirator with an acid-gas (type E) or combination cartridge"}[h]}

/* Professional judgement helpers (written as a Certified Professional Industrial Hygienist would reason) */
const pick=(a,k,arr)=>arr[((a.var&&a.var[k])||0)%arr.length];
const who=g=>`${g.worker} (${g.point}${g.task?", "+g.task:""})`;
function cpih(a){ // extra professional considerations, computed once per analysis
  const G=a.G.filter(g=>g.complete);
  G.forEach(g=>{g.eq8=g.short&&g.twa!=null?g.twa*g.sumT/480:null;g.eq8pct=g.eq8!=null&&g.pel?g.eq8/g.pel*100:null});
  const lowCov=st.divTotal?[]:G.filter(g=>!g.short&&g.sumT<360); // under 75% of the shift sampled
  const mix=[];[...new Set(G.map(g=>g.point))].forEach(pt=>{const sol=G.filter(g=>g.point===pt&&!g.short&&g.pct!=null&&!g.lt&&["solvent"].includes(hazType(g.param)));
    if(sol.length>=2)mix.push({pt,g:sol[0],gs:sol,em:sol.reduce((s,g)=>s+g.pct/100,0)})});
  const mixOver=mix.filter(m=>m.em>=1),mixHalf=mix.filter(m=>m.em>=0.5&&m.em<1);
  const rpf=a.need; // required protection factor = highest exposure / limit
  return{lowCov,mix,mixOver,mixHalf,rpf}}
const mixTxt=m=>`${m.g.worker} (${m.pt}): ${m.gs.map(g=>`${g.param} ${pctTxt(g.pct)}`).join(" + ")} = ${m.em.toFixed(2)}`;

const TEXTS=[
 ["exec","1.0 Executive summary",a=>{const x=cpih(a),I=a.I;
   const ranges=a.P.filter(p=>p.done.length).map(p=>`${p.p} ${rangeTxt(p)}`);
   const open=pick(a,"exec",[
     `Chemical Exposure Monitoring (CEM) was conducted at ${a.client}${I.dates?` on ${I.dates}`:""} by a registered Industrial Hygiene Technician (IHT-1), as recommended in the Chemical Health Risk Assessment (CHRA)${I.chraNo?` (Report No.: ${I.chraNo})`:""} and in accordance with the Occupational Safety and Health (Use and Standards of Exposure of Chemical Hazardous to Health) Regulations 2000 (USECHH 2000).`,
     `This report presents the findings of the Chemical Exposure Monitoring (CEM) carried out at ${a.client}${I.dates?` on ${I.dates}`:""}. The monitoring was performed by a registered Industrial Hygiene Technician (IHT-1) to fulfil the recommendation of the Chemical Health Risk Assessment (CHRA)${I.chraNo?` (Report No.: ${I.chraNo})`:""} and the monitoring requirement under Regulation 26 of USECHH 2000.`,
     `At the request of ${a.client}, personal exposure monitoring was undertaken${I.dates?` on ${I.dates}`:""} to quantify the inhalation exposure of workers to chemicals hazardous to health and to determine compliance with USECHH 2000. The work was carried out by a registered Industrial Hygiene Technician (IHT-1) following the recommendation of the Chemical Health Risk Assessment (CHRA)${I.chraNo?` (Report No.: ${I.chraNo})`:""}.`]);
   const scope=`The assessment covered ${a.wN} exposed to ${list(a.params)}${a.C.activities?` during ${lc(a.C.activities.replace(/\.$/,""))}`:` during normal working activities at the ${a.area}`}. Personal air samples were collected in the workers’ breathing zone ${a.L==="MEL"?"for less than 60 minutes, so the results were evaluated against the Maximum Exposure Limit (MEL = 3 × PEL) of USECHH 2000.":`and evaluated against the 8-hour Time-Weighted Average (TWA) PEL in Schedule I of USECHH 2000.${a.shortG.length?" "+shortNote(a):""}`}`;
   const res=ranges.length?`The ${a.L==="MEL"?"short-term":a.L==="PEL"?"8-hour TWA":"measured"} exposure for ${ranges.join("; ")}.`:"";
   let judge;
   if(a.over.length)judge=`In my professional judgement, the exposure of ${list(a.over.map(a.wl))} is not acceptable: it exceeded the Permissible Exposure Limit (PEL), so the existing control measures do not adequately protect these workers. The employer must act immediately to reduce exposure, verify the effectiveness of the controls and repeat the monitoring.`;
   else if(a.half.length)judge=`All results were below the PEL, so the employer is in compliance on the day of monitoring. However, ${list(a.half.map(a.wl))} exceeded half (50%) of the PEL. Given normal day-to-day variability in exposure, there is a realistic probability that the PEL is exceeded on other days, so the existing controls should be strengthened rather than simply maintained.`;
   else if(a.ten.length)judge=`All results were below the PEL. However, ${list(a.ten.map(a.wl))} exceeded 10% of the PEL, which means compliance cannot yet be concluded with confidence from a single round of sampling. A further six (6) personal samples are needed for a statistical compliance decision, in accordance with the Guidelines on Monitoring of Airborne Chemical Hazardous to Health 2022.`;
   else if(a.ndHigh.length)judge=`All results were below the PEL. Some results were below the laboratory detection limit, but because the detection limit itself corresponds to more than 10% of the PEL, low exposure cannot be confirmed; a larger air volume is needed at the next monitoring.`;
   else judge=`All results were below 10% of the applicable PEL. Exposure is considered well controlled under the conditions observed, and the existing control measures are judged adequate.`;
   const extra=[];
   if(x.mixOver.length)extra.push(`Because the solvents measured act on the same target organ (central nervous system), their combined (additive) effect was also assessed: the mixture exceeded unity for ${list(x.mixOver.map(mixTxt))}, which must be treated as an over-exposure even though each chemical alone was below its PEL.`);
   else if(x.mixHalf.length)extra.push(`The combined (additive) effect of the solvents measured was above half of unity for ${list(x.mixHalf.map(mixTxt))}, which supports strengthening the controls.`);
   const sh=a.shortG.filter(g=>g.eq8!=null);if(sh.length)extra.push(`Short-term results only show compliance with the MEL; they do not by themselves demonstrate compliance with the 8-hour PEL.`);
   const s2=a.P.filter(p=>p.s2).map(p=>p.p);
   const keys=[a.over.length||a.half.length||x.mixOver.length?"improve engineering controls at the source, following the hierarchy of controls":"maintain the existing controls and their maintenance programme",
     a.need>=1||((a.over.length||a.half.length)&&(a.C.rpeUse!=="consistent"||a.C.fit!=="yes"))?"ensure suitable respiratory protection is worn consistently, with fit testing, as an interim measure":"continue proper use of PPE",
     s2.length?`arrange medical surveillance for workers exposed to ${list(s2)}`:"",freqLine(a).split(",")[0].toLowerCase(),"update the CHRA with these findings"].filter(Boolean);
   return [open,scope,res,[judge,...extra].join(" "),`The key recommendations are to ${list(keys)}. Details are given in Sections 6.0 and 7.0.`].filter(Boolean).join("\n")}],
 ["intro","2.0 Introduction",a=>pick(a,"intro",[
   `${a.I.consName||"The consultant"} has been appointed to conduct a chemical exposure monitoring program at ${a.client}, which is located at ${a.I.locAddr||"the client's premises"}. This report presents the details of personnel exposure monitoring in order to comply with the USECHH Regulations 2000.`,
   `${a.client}, located at ${a.I.locAddr||"the client's premises"}, appointed ${a.I.consName||"the consultant"} to carry out chemical exposure monitoring of its workers. The purpose is to measure personal exposure to the chemicals identified in the CHRA, compare it with the limits in USECHH 2000, and advise on the adequacy of the existing controls.`])],
 ["seg","4.3 Selection of worker from Similar Exposure Group (SEG)",a=>pick(a,"seg",[
   `Workers selected were those nearest to the source, with the highest duration and frequency of exposure, whose work practice exposed them directly to the chemicals, taking available control measures into account.`,
   `Following a worst-case approach, the workers selected from each Similar Exposure Group (SEG) were those expected to have the highest exposure: closest to the emission source, with the longest and most frequent exposure, and with direct handling of the chemicals, after considering the controls in place.`])+(a.G.some(g=>g.task)?" The workers monitored were: "+list([...new Set(a.G.map(g=>`${g.worker} (${g.point})${g.task?" – "+g.task:""}${g.desc?" ("+lc(noDot(g.desc))+")":""}`))])+".":"")],
 ["just","4.4 Justification on monitoring duration and number of samples",a=>{const x=cpih(a);
   return `Results are compared with the 8-hour Time Weighted Average limit (PEL-TWA) stated in Schedule I of USECHH 2000: ${list(a.pelList)}. `+pick(a,"just",[
   `Monitoring used a full-period consecutive samples strategy over the work shift, with the personal sampling pump positioned in the worker’s breathing zone.`,
   `A full-period, consecutive-sample strategy was used so that the samples together represent the worker’s exposure over the shift, with the sampler fixed in the breathing zone (within 30 cm of the nose and mouth).`])+
   (x.lowCov.length?` For ${list(x.lowCov.map(g=>`${g.point} – ${g.param} (${f(g.sumT,0)} min)`))}, less than 75% of the 8-hour shift was sampled; the TWA assumes no exposure during the unsampled period, so these results may underestimate the true 8-hour exposure.`:"")+
   (a.shortG.length?" "+shortNote(a):"")}],
 ["d1","6.1 Chemical Exposure Monitoring Results",a=>{const x=cpih(a);
   const out=[pick(a,"d1",[
     `CEM was conducted to assess the personal exposure of ${a.wN} to ${list(a.params)} during normal work activities at ${a.client}. The results are discussed by parameter below, using the following action levels: above the PEL (immediate action), above 50% of the PEL (controls to be improved and monitoring at least every 12 months), above 10% of the PEL (additional sampling under the 2022 Guidelines) and below 10% of the PEL (exposure well controlled).`,
     `The personal exposure results for ${a.wN} at ${a.client} are interpreted below for each chemical. Each result is placed in one of four action bands: above the PEL (over-exposure, immediate action), 50–100% of the PEL (significant exposure, controls to be improved), 10–50% of the PEL (further sampling needed to confirm compliance) and below 10% of the PEL (well controlled).`])];
   a.P.forEach(p=>{if(!p.done.length){out.push(`${p.p}: results are incomplete because field data is missing, so no conclusion can be drawn yet.`);return}
     const lt=p.done.filter(g=>g.lt);
     let s=`${p.p} (PEL ${p.pel} mg/m³${param(p.p).ppm?`, ${param(p.p).ppm} ppm`:""}${p.done.some(g=>g.short)?`; MEL ${mel(param(p.p)).mg} mg/m³`:""}): exposure ${rangeTxt(p)}`+(p.done.length>1?`, with the highest exposure recorded for ${who(p.worst)}.`:".");
     const byCat=c=>p.done.filter(g=>g.cat===c).map(g=>g.point);
     if(p.top==="over")s+=` The result for ${list(byCat("over"))} exceeded the limit, so the existing controls do not adequately protect the worker${byCat("over").length>1?"s":""} and immediate action is required.`;
     else if(p.top==="half")s+=` Results for ${list(byCat("half"))} were above half of the limit. This is significant exposure: with typical day-to-day variation, exceedance on other days cannot be ruled out, so controls should be strengthened.`;
     else if(p.top==="ten")s+=` Results for ${list(byCat("ten"))} were above 10% of the limit; a further six (6) samples are recommended to reach a statistical compliance decision.`;
     else if(p.top==="low")s+=` All quantified results were below 10% of the limit, indicating good control.`;
     p.done.filter(g=>g.short&&g.eq8!=null).forEach(g=>{s+=` ${g.point} was sampled for only ${f(g.sumT,0)} minutes, so the result is a short-term exposure compared with the MEL (3 × PEL). If no further exposure occurred during the rest of the shift, the equivalent 8-hour TWA would be ${(g.lt?"<":"")+f(g.eq8,3)} mg/m³ (${(g.lt?"<":"")+pctTxt(g.eq8pct)} of the 8-hour PEL); full-shift sampling is needed to confirm the 8-hour exposure.`});
     if(lt.length){const ndG=p.done.filter(g=>g.cat==="nd");s+=` ${ndG.length?`For ${list(ndG.map(g=>g.point))} the laboratory result${ndG.length>1?"s were":" was"} below the detection limit (“<”), so the reported value is an upper bound and the actual exposure is lower.`:"Some individual samples were below the detection limit; the detection limit was used in the calculation, so these results are conservative."}`;
       const hi=ndG.filter(g=>g.pct>=10);if(hi.length)s+=` Because this upper bound (${pctTxt(hi[0].pct)} of the limit) is above 10% of the limit, the result cannot confirm low exposure. A longer sampling time or higher flow rate (larger air volume) is recommended next time to lower the detection limit.`}
     if(p.skin)s+=` ${p.p} carries a skin notation in Schedule I, so skin absorption may add to the total dose; airborne results alone may underestimate the body burden, and skin protection is essential.`;
     if(p.s2)s+=` ${p.p} is listed in Schedule II of USECHH 2000, so medical surveillance is required for workers whose exposure is significant.`;
     out.push(s)});
   if(x.mix.length)out.push(`Combined exposure: ${list(a.params.filter(n=>hazType(n)==="solvent"))} have similar toxic effects (central nervous system depression and irritation), so their effects are treated as additive. Using the mixture formula (C1/L1 + C2/L2 + … ≤ 1), the combined exposure index was ${list(x.mix.map(mixTxt))}. ${x.mixOver.length?"An index of 1 or more means the mixture exceeds its limit, even though the individual chemicals did not.":x.mixHalf.length?"An index above 0.5 indicates significant combined exposure.":"All indices were below 0.5, so the combined exposure is acceptable."}`);
   return out.join("\n")}],
 ["d2","6.2 Factors Contributing Towards the Results and Adequacy of Existing Control Measures",a=>{
   const C=a.C,x=cpih(a),out=[];
   const vap=a.P.some(p=>["solvent","gas","isocyanate","acid"].includes(p.haz)),partOnly=["ffp","hfp"].includes(C.rpe);
   out.push(pick(a,"d2",[`The results were influenced by the nature of the work activities${C.activities?` (${lc(C.activities.replace(/\.$/,""))})`:""}, the duration and frequency of exposure, work practices and the working environment.`,
     `Several factors determine the exposure levels measured: the type of work${C.activities?` (${lc(C.activities.replace(/\.$/,""))})`:""}, how long and how often workers are near the source, their individual work practices, and the general ventilation of the work area.`])+(C.obs?" Site observations during monitoring: "+lc(noDot(C.obs))+".":""));
   out.push(a.eng.length?`Engineering controls in place: ${list(a.eng.map(lc))}.`:`No engineering controls were recorded at the monitored work areas, so exposure is controlled mainly by administrative measures and PPE, which are the least reliable levels of the hierarchy of controls.`);
   if(a.adm.length)out.push(`Administrative controls in place: ${list(a.adm.map(lc))}.`);
   if(C.rpe){let r=`Respiratory protection: ${lc(a.rpe[0])}`+(a.apf>1?`, assigned protection factor ${a.apf}`:"")+`${C.rpeUse==="consistent"?", worn consistently":C.rpeUse==="partial"?", but not worn consistently":C.rpeUse==="no"?", but not worn during the work":""}${C.fit==="yes"?", with fit testing done":C.fit==="no"?", without fit testing":""}.`;
     if(a.need>=1){r+=` The required protection factor (highest exposure ÷ limit) is ${a.need.toFixed(1)}. `+(a.apf&&a.apf>a.need&&C.rpeUse==="consistent"&&C.fit==="yes"?`The RPE in use provides adequate protection on paper, provided it is used properly, but it must be treated as a temporary measure until engineering controls are improved.`
       :`The current RPE ${a.apf&&a.apf>a.need?"could give enough protection on paper, but its effectiveness cannot be relied on":"does not give enough protection"} ${C.rpeUse!=="consistent"?"because it is not worn consistently":C.fit!=="yes"?"because no fit test has been done":"for this exposure level"}.`)}
     else if(!(vap&&partOnly)&&(a.half.length||a.ndHigh.length||a.ten.length)&&(C.rpeUse!=="consistent"||C.fit!=="yes"))r+=` Although exposure was below the PEL, ${a.half.length?"it exceeded half of the PEL, so ":""}RPE should be worn consistently and fit tested as an additional safeguard while engineering controls are improved.`;
     out.push(r)}
   else out.push("The type of respiratory protection used was not recorded, so its contribution to protecting the workers cannot be assessed.");

   if(C.ppe.length)out.push(`Other PPE in use: ${list(C.ppe.map(lc))}.`);
   if(vap&&partOnly)out.push(`Important: the respirator in use (${lc(a.rpe[0])}) is a particulate filter and gives no protection against ${list(a.P.filter(p=>["solvent","gas","isocyanate","acid"].includes(p.haz)).map(p=>p.p))} vapour or gas, so it should not be counted as a control for these chemicals.`);
   const skinP=a.P.filter(p=>p.skin);if(skinP.length&&C.ppe.some(q=>/cotton|fabric|cloth|knit/i.test(q)))out.push(`The gloves recorded (${list(C.ppe.filter(q=>/glove/i.test(q)).map(lc))}) are not chemical-resistant; cotton or fabric gloves absorb solvents and can increase skin contact with ${list(skinP.map(p=>p.p))}. Gloves of a material rated for these chemicals (for example nitrile or Viton, as stated in the safety data sheet) should be used.`);
   const gaps=[];a.P.forEach(p=>{if(p.top&&p.top!=="low"){if((p.haz==="dust"||p.haz==="silica")&&!a.eng.some(e=>/wet|water|spray|lev|exhaust|collector|enclos/i.test(e)))gaps.push(`no dust suppression or extraction was recorded for ${p.p}`);
     if((p.haz==="solvent"||p.haz==="fume"||p.haz==="isocyanate")&&!a.eng.some(e=>/lev|exhaust|extraction|booth|enclos/i.test(e)))gaps.push(`no local exhaust ventilation was recorded for ${p.p}`)}
     if(p.skin&&!a.C.ppe.some(q=>/glove/i.test(q)))gaps.push(`no chemical-resistant gloves were recorded although ${p.p} has a skin notation`)});
   let verdict;
   if(a.worstCat==="over"||x.mixOver.length)verdict="Overall, the existing control measures are not adequate: at least one worker was exposed above the limit.";
   else if(a.worstCat==="half")verdict="Overall, the existing control measures keep exposure below the PEL but are only partially adequate, as exposure exceeded half of the PEL.";
   else if(a.worstCat==="ten")verdict="Overall, the existing control measures are generally adequate, as all exposures were below half of the PEL; they should be maintained and verified through the additional sampling.";
   else if(a.worstCat==="low"||a.worstCat==="nd")verdict="Overall, the existing control measures are adequate and effective under the conditions observed, and should be maintained.";
   else verdict="The adequacy of the existing controls will be assessed once all results are complete.";
   out.push(verdict+(gaps.length?` Gaps noted: ${list(gaps)}.`:""));
   out.push("These conclusions apply to the conditions on the day of monitoring. If production rate, materials, work methods or ventilation differ on other days, exposure may also differ, and the employer should confirm that the monitoring day was representative of normal operation.");
   return out.join("\n")}],
 ["d3","6.3 Justification on Sampling Strategy",a=>{const x=cpih(a),tt=a.G.filter(g=>g.complete).map(g=>g.sumT),mn=Math.min(...tt),mx=Math.max(...tt);
   return pick(a,"d3",[`Personal air sampling was conducted on ${a.wN} considered representative of the work activities with potential exposure. Personal sampling in the breathing zone represents the actual inhalation exposure during normal work.`,
     `The sampling strategy targeted ${a.wN} selected as the highest-exposed members of their Similar Exposure Groups, so the results represent a reasonable worst case for each group. Breathing-zone sampling measures what the worker actually inhales, rather than the general air in the area.`])+
   (tt.length?` Total sampling time per worker ranged from ${f(mn,0)} to ${f(mx,0)} minutes${mx>=360?`; the full-shift samples (6 hours or more) are sufficient to assess the 8-hour TWA`:""}.`:"")+
   (x.lowCov.length?` Sampling covered less than 75% of the shift for ${list(x.lowCov.map(g=>g.point))}; future monitoring should cover as much of the shift as practicable.`:"")+
   (a.shortG.length?" "+shortNote(a):"")+
   ` Monitoring on a single day gives a snapshot of exposure; to judge long-term compliance with confidence, results should be supported by repeat monitoring as recommended in Section 7.0.`}],
 ["r1","7.1 Action to Be Taken",a=>{const x=cpih(a);
   const B=[],need=a.P.filter(p=>p.top&&p.top!=="low"&&p.top!=="nd"),fam=h=>({silica:"part",dust:"part",fume:"part"}[h]||h),rank={silica:3,fume:2,dust:1};
   const hz=[];(need.length?need:a.P).forEach(p=>{const i=hz.findIndex(h=>fam(h)===fam(p.haz));if(i<0)hz.push(p.haz);else if((rank[p.haz]||0)>(rank[hz[i]]||0))hz[i]=p.haz});
   const hzAll=[];a.P.forEach(p=>{const i=hzAll.findIndex(h=>fam(h)===fam(p.haz));if(i<0)hzAll.push(p.haz);else if((rank[p.haz]||0)>(rank[hzAll[i]]||0))hzAll[i]=p.haz});
   if(a.over.length||x.mixOver.length)B.push(`Immediate action: reduce the exposure of ${list([...new Set([...a.over.map(g=>`${g.worker} (${g.point})`),...x.mixOver.map(m=>`${m.g.worker} (${m.pt})`)])])} below the limit. Until engineering improvements are complete, enforce suitable respiratory protection in the affected area.`);
   if(need.some(p=>p.haz==="solvent")&&(a.over.length||a.half.length||x.mixOver.length))B.push("Elimination / substitution: review whether the solvent-based products can be replaced with water-based, high-solids or lower-toxicity alternatives, which is the most effective control under the hierarchy of controls.");
   if(need.length)hz.forEach(h=>B.push(`Engineering control: ${engAdvice(h)}`));
   else B.push("Maintain the existing engineering controls in good working condition and keep them in use during all work activities.");
   if(a.eng.some(e=>/lev|exhaust|collector|booth/i.test(e))||need.some(p=>p.haz!=="gas"))B.push("Ensure all local exhaust ventilation is maintained, and examined and tested by a competent person at intervals not exceeding 12 months, with records kept.");
   B.push(`Administrative control: ${[a.over.length||a.half.length?"limit the time each worker spends at the highest-exposure tasks through job rotation":"",
     "keep the safe work procedures up to date and make sure they are followed","maintain good housekeeping by wet cleaning or vacuuming rather than dry sweeping",
     "give workers information, instruction and training on the chemical hazards, the monitoring results and the correct use of controls and PPE (USECHH 2000, Part VII, Regulation 22)"].filter(Boolean).join("; ")}.`);
   (need.length?hz:hzAll.slice(0,1)).forEach(h=>{const ok=a.C.rpe&&a.apf&&a.apf>a.need&&a.C.rpeUse==="consistent"&&a.C.fit==="yes";
     B.push(`Respiratory protection: ${ok?"continue the current RPE programme, ":""}provide ${rpeAdvice(h)} for the affected workers${a.need>=1?` (required protection factor at least ${Math.ceil(a.need)})`:""}${a.need>=1||a.C.fit!=="yes"?", with fit testing for each wearer":""}, plus training, a cleaning and storage routine, and supervision to ensure it is worn throughout the exposure.`)});
   a.P.filter(p=>p.skin).forEach(p=>B.push(`Skin protection: ${p.p} can be absorbed through the skin. Provide suitable chemical-resistant gloves and protective clothing, and enforce washing before eating, drinking or smoking.`));
   const s2=a.P.filter(p=>p.s2);if(s2.length)B.push(`Health surveillance: ${list(s2.map(p=>p.p))} ${s2.length>1?"are":"is"} listed in Schedule II of USECHH 2000. Arrange medical surveillance by a registered Occupational Health Doctor (OHD) for exposed workers under Regulation 27${s2.some(p=>p.haz==="silica")?", including chest X-ray and lung function (spirometry) for workers exposed to crystalline silica":""}, and keep the records.`);
   if(a.shortG.length)B.push(`Short-duration samples: repeat the monitoring for ${list(a.shortG.map(g=>`${g.point} (${g.param})`))} over the full shift, so the 8-hour TWA can be compared with the PEL; if the task genuinely lasts less than an hour per day, document the task duration and frequency to support the short-term assessment.`);
   if(x.lowCov.length)B.push(`Sampling coverage: at the next monitoring, sample at least 75% of the shift for ${list(x.lowCov.map(g=>g.point))}.`);
   B.push(`Further monitoring: ${freqLine(a)}`);
   B.push("Communicate these results to the workers and to the CHRA assessor, so that the CHRA can be reviewed and the exposure rating updated with the findings of this monitoring.");
   return B.map(b=>"• "+b).join("\n")}],
 ["concl","8.0 Conclusion",a=>{const x=cpih(a);
   const s=a.over.length||x.mixOver.length?`The monitoring results showed that ${list([...a.over.map(a.wl),...x.mixOver.map(m=>`the combined solvent exposure of ${m.g.worker} (${m.pt}, index ${m.em.toFixed(2)})`)])} exceeded the limit stipulated in USECHH Regulations 2000. The existing control measures are not adequate for these exposures and must be improved without delay, followed by repeat monitoring to confirm that exposure is below the limit.`
     :a.half.length?`The monitoring results showed that all concentrations were below the PEL stipulated in Schedule I of the USECHH Regulations 2000, but ${list(a.half.map(a.wl))} exceeded half of the PEL. The existing controls should be strengthened and exposure monitored at least every twelve (12) months.`
     :`The monitoring results showed that the concentrations of ${list(a.params.map(p=>p.toLowerCase()))} during monitoring were below the PEL stipulated in Schedule I of the USECHH Regulations 2000, indicating that the existing control measures were generally adequate in controlling workers’ exposure during the monitoring period.`+(a.ten.length?" However, selected results were above 10% of the applicable PEL. Therefore, six (6) additional personal exposure samples are recommended in accordance with the applicable DOSH guidelines to further assess the workers’ exposure profile and confirm compliance.":"");
   return s+(a.shortG.length?" Results from samples shorter than 60 minutes were assessed against the MEL and should be confirmed by full-shift sampling.":"")+`\nRecommendations as described in Section 7.0 were made in order to comply with the USECHH Regulations 2000. The objectives of the exposure monitoring conducted at ${a.client} have been fulfilled.`}]];
const dd=s=>String(s).replace(/(^|[^.])\.\.(?!\.)/g,"$1.");
const textOf=k=>{const t=TEXTS.find(x=>x[0]===k);if(st.text[k]!=null)return st.text[k];const a=analyse();return dd(limWords(t[2](a),a))};
function renderTexts(softly){
  if(softly){TEXTS.forEach(([k])=>{const el=$(`[data-tx="${k}"]`);if(el&&st.text[k]==null&&document.activeElement!==el)el.value=textOf(k)});return}
  $("#texts").innerHTML=TEXTS.map(([k,t])=>`<div class="tx"><div class="row"><label style="margin:0;font-weight:600;color:var(--ink)">${t}</label><button class="sm noP" data-txr="${k}">Rewrite</button></div><textarea data-tx="${k}"></textarea>${k==="r1"?'<div class="ph" id="recPh"></div>':""}</div>`).join("");renderRecPhotos();
  TEXTS.forEach(([k])=>{const el=$(`[data-tx="${k}"]`);el.value=textOf(k);el.style.height=Math.min(420,Math.max(110,el.value.length/4))+"px";el.oninput=()=>{st.text[k]=el.value;save()}});
  $$("[data-txr]").forEach(b=>b.onclick=()=>{const k=b.dataset.txr,el=$(`[data-tx="${k}"]`),before=el.value;
    st.textVar=st.textVar||{};st.textVar[k]=(st.textVar[k]||0)+1;delete st.text[k];save();el.value=textOf(k);
    el.style.transition="background .6s";el.style.background="#fff6d6";setTimeout(()=>el.style.background="",900);
    toast(el.value===before?"Already up to date with your latest results":"Rewritten from your latest results (new wording)")});
}
/* pictures under 7.1 Action to Be Taken (e.g. example controls) */
function renderRecPhotos(){const el=$("#recPh");if(!el)return;st.recPhotos=st.recPhotos||[];
  el.innerHTML=st.recPhotos.map(pid=>`<div class="t"><img data-rpid="${pid}" alt=""><button class="noP" data-rpdel="${pid}" title="Remove picture">✕</button></div>`).join("")+`<label class="add noP">+ Add picture<input type="file" accept="image/*" multiple id="recPhIn"></label><span class="muted noP" style="font-size:12px">Pictures appear below the recommendations in the report.</span>`;
  el.querySelectorAll("[data-rpid]").forEach(async img=>{img.src=await photoURL(img.dataset.rpid)});
  $("#recPhIn").onchange=async e=>{try{for(const fl of e.target.files){const p=await shrinkImage(fl,1200),id=uid();await idb.put("photo:"+id,p);st.recPhotos.push(id)}}catch(err){toast("Could not read that image")}save();renderRecPhotos()};
  el.querySelectorAll("[data-rpdel]").forEach(b=>b.onclick=async()=>{st.recPhotos=st.recPhotos.filter(x=>x!==b.dataset.rpdel);await idb.del("photo:"+b.dataset.rpdel);save();renderRecPhotos()})}
$("#bRegen").onclick=()=>{st.textVar=st.textVar||{};TEXTS.forEach(([k])=>st.textVar[k]=(st.textVar[k]||0)+1);st.text={};save();renderTexts();toast("All sections rewritten from your latest results")};

/* ---------------- report model (shared by PDF and Word) ---------------- */
function model(){
  const I=st.info,client=I.client||"Client",a=analyse(),GR=a.G,params=a.params,B=[];
  const T=(cap,txt,head,rows,w,o={})=>{B.push({t:"cap",b:cap,x:txt});B.push({t:"table",head,rows,w,...o})};
  B.push({t:"cover"});B.push({t:"toc"});
  B.push({t:"h1",x:"1.0 EXECUTIVE SUMMARY",page:1});B.push({t:"p",x:textOf("exec")});
  B.push({t:"h1",x:"2.0 INTRODUCTION",page:1});B.push({t:"p",x:textOf("intro")});
  T("Table 1:","Particulars of facility and working hours",["Item","Details"],[["Name of Facility",I.locName||client],["Work Areas/Unit",I.area||"-"],["Working Hours",I.hours||"-"]],[.28,.72]);
  B.push({t:"p",x:"The monitoring was undertaken by a DOSH registered Hygiene Technician 1 (HT1) (refer to Appendix A)."});
  T("Table 2:","Particulars of registered Hygiene Technician 1",["Name","JKKP Registration No."],[[I.htName||"-",I.htReg||"-"]],[.5,.5]);
  B.push({t:"h1",x:"3.0 OBJECTIVES",page:1});B.push({t:"p",x:"The objectives of this chemical exposure monitoring are:\n(a) To measure concentration of chemicals hazardous to health at the identified work area.\n(b) To measure workers’ exposure levels to these chemicals at the identified work area.\n(c) To compare results of monitoring with the Permissible Exposure Limit stipulated under Schedule I of the USECHH Regulations 2000.\n(d) To recommend action to be taken based on the results of this monitoring in order to comply with the USECHH Regulations 2000.",tight:1});
  B.push({t:"h1",x:"4.0 METHODOLOGY",page:1});B.push({t:"h2",x:"4.1 Method Used"});
  T("Table 3:","List of chemical, method, sampling media and analytical technique",["Chemical","Method","Sampling Media","PEL TWA8","MEL (3 × PEL)"],params.map(p=>{const q=param(p);return[p,q.method||"-",q.media||"-",[q.ppm!==""&&q.ppm!=null?q.ppm+" ppm":"",q.pel!==""&&q.pel!=null?q.pel+" mg/m³":""].filter(Boolean).join(" / ")||"-",melText(q)]}),[.18,.22,.28,.16,.16]);
  B.push({t:"h2",x:"4.2 Equipment Used"});B.push({t:"cap",b:"Table 4:",x:"List and details of equipment and sampling media"});B.push({t:"equip"});
  B.push({t:"h2",x:"4.3 Selection of worker from Similar Exposure Group (SEG)"});B.push({t:"p",x:textOf("seg")});
  B.push({t:"h2",x:"4.4 Justification on monitoring duration and number of samples"});B.push({t:"p",x:textOf("just")});
  B.push({t:"h1",x:"5.0 RESULTS & FINDINGS",page:1});B.push({t:"h2",x:"5.1 Monitoring Area Information"});
  const nPts=new Set(GR.map(g=>g.point)).size;
  T("Table 5:","List of work area and number of workers monitored",["Area","Chemical","Work specification","Exposed / monitored"],[[I.area||"-",params.join(", "),I.workSpec||"",`${I.exposed||nPts} / ${nPts}`]],[.14,.5,.18,.18]);
  B.push({t:"h2",x:"5.2 Monitoring Result"});
  T("Table 6:",`Summary of result analysis — ${I.area||"Workplace"}`,["Name (Sample No)","Parameter","Sampling Duration","Exposure Level (mg/m³)",GR.some(g=>g.short)?"PEL 8-hr TWA / MEL mg/m³ (ppm)":"PEL 8-hr TWA mg/m³ (ppm)",GR.some(g=>g.short)?"% of limit":"% PEL","Remarks"],
    GR.map(g=>[`${g.worker} (${g.point})`,g.param,`${f(g.sumT,0)} min`,twaTxt(g),g.short?`${g.lim??"-"}${mel(param(g.param)).ppm!=null?` (${mel(param(g.param)).ppm} ppm)`:""} MEL`:String(g.pel??"-")+(param(g.param).ppm?` (${param(g.param).ppm} ppm)`:""),g.pct==null?"-":pctG(g),remark(g)]),[.17,.2,.11,.13,.12,.09,.18],{bold:3});
  B.push({t:"p",x:"Results are expressed as 8-hour time weighted average airborne concentration"+(GR.some(g=>g.short)?", except samples with a total duration under 60 minutes, which are expressed as the average concentration over the sampling time and compared with the MEL":"")+". “<” = below the minimum detectable limit of the analysis. ND = not detectable. PEL = Permissible Exposure Limit, Schedule I, USECHH Regulations 2000."+(GR.some(g=>g.short)?" MEL = Maximum Exposure Limit = 3 × PEL (USECHH 2000).":""),s:9.5});
  B.push({t:"h1",x:"6.0 DISCUSSION",page:1});
  [["d1","6.1 Chemical Exposure Monitoring Results"],["d2","6.2 Factors Contributing Towards the Results and Adequacy of Existing Control Measures"],["d3","6.3 Justification on Sampling Strategy"]].forEach(([k,t])=>{B.push({t:"h2",x:t});B.push({t:"p",x:textOf(k)})});
  B.push({t:"h1",x:"7.0 RECOMMENDATION",page:1});B.push({t:"p",x:"The following points should be considered to comply with the Occupational Safety and Health Act (OSHA) 1994 and USECHH Regulations 2000."});
  B.push({t:"h2",x:"7.1 Action to Be Taken"});B.push({t:"p",x:textOf("r1"),tight:1});if((st.recPhotos||[]).length)B.push({t:"photos",ids:st.recPhotos});
  B.push({t:"h2",x:"7.2 Record Keeping"});B.push({t:"p",x:"Under Regulation 26(4), records of monitoring shall be kept for at least 30 years where representative of personal exposure, and at least 5 years in any other case (e.g. area monitoring)."});
  B.push({t:"h2",x:"7.3 Regulations Compliance"});B.push({t:"p",x:"The employer should keep exposure to chemical hazards at the lowest practicable level and below the permissible exposure limits."});
  B.push({t:"h2",x:"7.4 Necessity of further monitoring"});B.push({t:"table",head:["Exposure Result","Frequency of monitoring"],rows:[["Above the permissible exposure limit","Not more than six (6) months"],["Above half of the eight-hour TWA but below the eight-hour TWA","Not more than twelve (12) months"]],w:[.6,.4]});
  B.push({t:"p",x:"Based on this monitoring: "+limWords(freqLine(a),a)});
  B.push({t:"h2",x:"7.5 Necessity to review the control measures according to the regulations"});
  B.push({t:"p",x:"1. If any of the initial three (3) samples exceed the PEL, the employer must review and improve existing control measures before proceeding with additional monitoring.\n2. If the compliance test fails after statistical analysis, the employer must immediately review engineering controls, work practices, administrative controls and PPE, and implement improvements.",tight:1});
  B.push({t:"h2",x:"7.6 Frequency of Monitoring"});B.push({t:"p",x:"The management is advised to communicate the CEM results to the CHRA assessor to determine the necessity for further monitoring. Air monitoring may be discontinued if at least two consecutive measurements taken at least seven days apart show exposures below half of the eight-hour TWA, the maximum exposure limit/STEL, or the ceiling limit."});
  B.push({t:"h1",x:"8.0 CONCLUSION",page:1});B.push({t:"p",x:textOf("concl")});B.push({t:"prep"});
  APPX.forEach(([L,Tt])=>{
    if(L!=="F"){B.push({t:"appx",L,T:Tt});return}
    B.push({t:"h1",x:"APPENDIX F: DATA AND CALCULATION FORM",page:1});
    GR.forEach(g=>{B.push({t:"rich",parts:[[client,1],[` — Point: ${g.point} — Parameter: ${g.param} — ${g.worker}`,0]],keep:1});
      B.push({t:"table",head:["Sample","Period (hrs)","fc (L/min)","t (min)","Tc (K)","Pc","T (K)","P","M (µg)","Vm (L)","Vs (L)","Ci (mg/m³)"],
        rows:g.rows.map(({r,c})=>[r.sample||"-",r.period||"-",f(num(r.fc),4),f(num(r.t),0),f(c.TcK,1),String(st.env.Pc??""),f(c.TK,1),String(st.env.P??""),String(r.mass||"-"),f(c.Vm,1),f(c.Vs,1),c.Ci==null?"-":(c.lt?"<":"")+f(c.Ci,3)]),
        w:[.075,.105,.08,.065,.075,.06,.075,.06,.08,.08,.08,.165],s:8,after:2});
      B.push({t:"mono",x:"Vm = fc × t × √(Pc×T / P×Tc); Vs = Vm × (P/760) × (298/T); Ci = M / Vs"});
      B.push({t:"twa",x:g.complete?`${g.short?"C (short-term)":"TWA₈"} = [${g.rows.map(({r,c})=>`(${f(c.Ci,3)} × ${f(num(r.t),0)})`).join(" + ")}] / ${f(g.div,0)} = `:"TWA₈ = incomplete field data",b:g.complete?`${twaTxt(g)} mg/m³`:""});
      if(g.short&&g.complete)B.push({t:"p",x:`Sampling duration ${f(g.sumT,0)} min (< 60 min): result compared with MEL = 3 × PEL = ${g.lim??"–"} mg/m³ (${pctG(g)} of MEL).`,s:9})});
  });
  return B}

/* ---------------- PDF renderer (pdf-lib) ---------------- */
const clean=s=>String(s??"").replace(/μ/g,"µ").replace(/√/g,"sqrt").replace(/₈/g,"8").replace(/≤/g,"<=").replace(/≥/g,">=").replace(/Σ/g,"Sum ").replace(/≈/g,"~").replace(/[‐-‒]/g,"-").replace(/[^\n\x20-\xFF€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]/g,"");
async function toPng(fl){const bmp=await createImageBitmap(new Blob([fl.data],{type:fl.type}));const c=document.createElement("canvas");c.width=bmp.width;c.height=bmp.height;c.getContext("2d").drawImage(bmp,0,0);
  return{data:new Uint8Array(await (await new Promise(r=>c.toBlob(r,"image/png"))).arrayBuffer()),w:bmp.width,h:bmp.height}}
async function buildPdf(B){
  const {PDFDocument,StandardFonts,rgb}=PDFLib,pdf=await PDFDocument.create();
  const R=await pdf.embedFont(StandardFonts.Helvetica),BD=await pdf.embedFont(StandardFonts.HelveticaBold);
  const PW=595.28,PH=841.89,ML=56,MR=56,CW=PW-ML-MR,TOP=PH-78,BOT=70;
  const INK=rgb(.1,.12,.15),GREY=rgb(.42,.45,.5),NAVY=rgb(.15,.25,.43),GREEN=rgb(.2,.6,.35),HEAD=rgb(.91,.93,.95),LINE=rgb(.35,.38,.42);
  const I=st.info,client=I.client||"Client",gen=new Set(),attPages=new Set();let page,y;
  const newPage=()=>{page=pdf.addPage([PW,PH]);gen.add(page);y=TOP;return page};
  const tw=(t,f,s)=>f.widthOfTextAtSize(clean(t),s);
  const wrap=(t,f,s,w)=>{const out=[];clean(t).split("\n").forEach(par=>{const words=par.split(/ +/);let line="";words.forEach(wd=>{const test=line?line+" "+wd:wd;if(tw(test,f,s)>w&&line){out.push(line);line=wd}else line=test});out.push(line)});return out};
  const ensure=h=>{if(y-h<BOT)newPage()};
  const txt=(t,x,yy,f=R,s=10,c=INK)=>page.drawText(clean(t),{x,y:yy,font:f,size:s,color:c});
  const cx=(t,f,s,yy,c=INK,from=ML,to=PW-MR)=>txt(t,from+((to-from)-tw(t,f,s))/2,yy,f,s,c);
  function para(t,{s=10.5,lh=15,f=R,gap=7}={}){clean(t).split("\n").filter(p=>p.trim()).forEach(p=>{const bullet=/^• /.test(p),ind=bullet?12:0,body=bullet?p.slice(2):p,w=CW-ind;
      const lines=wrap(body,f,s,w);lines.forEach((ln,i)=>{ensure(lh);if(bullet&&i===0)txt("•",ML,y-s,f,s);const last=i===lines.length-1,words=ln.split(" "),x=ML+ind;
        if(!last&&words.length>1){const free=w-words.reduce((a,wd)=>a+tw(wd,f,s),0),sp=free/(words.length-1);let xx=x;words.forEach(wd=>{txt(wd,xx,y-s,f,s);xx+=tw(wd,f,s)+sp})}else txt(ln,x,y-s,f,s);y-=lh});y-=gap})}
  function table(head,body,fr,{s=9,pad=4.5,bold=-1,after=10}={}){
    const ws=fr.map(v=>v*CW),lh=s+3;
    const row=(cells,isHead)=>{const lines=cells.map((c,i)=>wrap(c,isHead||i===bold?BD:R,s,ws[i]-2*pad));return{lines,h:Math.max(...lines.map(l=>l.length))*lh+2*pad-3}};
    const draw=(cells,isHead)=>{const r=row(cells,isHead);if(y-r.h<BOT){newPage();if(!isHead)draw(head,true)}
      let x=ML;r.lines.forEach((ls,i)=>{page.drawRectangle({x,y:y-r.h,width:ws[i],height:r.h,borderColor:LINE,borderWidth:.6,color:isHead?HEAD:undefined});
        ls.forEach((l,j)=>txt(l,x+pad,y-pad-s+1-j*lh,isHead||i===bold?BD:R,s,isHead?rgb(.3,.35,.42):INK));x+=ws[i]});y-=r.h};
    draw(head,true);body.forEach(b=>draw(b));y-=after}
  const toc=[];let tocPage,tocPos={};
  for(let bi=0;bi<B.length;bi++){const b=B[bi];
    if(b.t==="cover"){newPage();y=PH-60;
      const lg=st.info.logoName?await idb.get("logo").catch(()=>null):null;
      if(lg){try{const im=/png/i.test(lg.type)?await pdf.embedPng(lg.data):await pdf.embedJpg(lg.data);const d=im.scaleToFit(150,72);page.drawImage(im,{x:(PW-d.width)/2,y:y-d.height,width:d.width,height:d.height});y-=d.height+20}catch(e){}}
      else y-=16;
      wrap((I.consName||"").toUpperCase(),BD,15,CW-40).forEach(l=>{cx(l,BD,15,y);y-=18});y-=2;
      [I.consAddr,I.consTel,I.consEmail].filter(Boolean).forEach(t=>wrap(t,R,8.5,CW-80).forEach(l=>{cx(l,R,8.5,y,GREY);y-=12}));
      y=Math.min(PH-235,y-24);page.drawLine({start:{x:ML,y},end:{x:PW-MR,y},thickness:1.2,color:GREEN});y-=40;
      ["PERSONAL","CHEMICAL EXPOSURE MONITORING","REPORT"].forEach(l=>{cx(l,BD,17,y,NAVY);y-=22});
      cx(`(REF. NO.: ${I.reportNo||"-"})`,BD,10,y,NAVY);y-=26;page.drawLine({start:{x:ML,y},end:{x:PW-MR,y},thickness:1.2,color:GREEN});y-=60;
      wrap(client.toUpperCase(),BD,12.5,CW-60).forEach(l=>{cx(l,BD,12.5,y);y-=17});if(I.clientDosh){cx(`(DOSH NO.: ${I.clientDosh})`,BD,10.5,y);y-=16}
      const ln=(I.locName||"").trim();if(ln&&ln.toLowerCase()!==client.trim().toLowerCase()){y-=14;wrap(ln.toUpperCase(),BD,11.5,CW-60).forEach(l=>{cx(l,BD,11.5,y);y-=16})}
      if(I.locAddr){y-=10;wrap(I.locAddr.toUpperCase(),BD,10.5,CW-90).forEach(l=>{cx(l,BD,10.5,y);y-=15})}
      y-=50;[["HYGIENE TECHNICIAN NAME",I.htName],["DOSH REG. NO.",I.htReg],["DOSH REPORT NO.",I.doshReportNo],["ESM REPORT NO.",I.reportNo],["MONITORING DATE",I.dates]].forEach(([k,v])=>{txt(k,ML+30,y,BD,9.5);txt(": "+String(v||"-").toUpperCase(),ML+230,y,BD,9.5);y-=19});continue}
    if(b.t==="toc"){newPage();tocPage=page;txt("TABLE OF CONTENTS",ML,y-15,BD,15);y-=34;
      B.filter(x=>x.t==="h1"||x.t==="appx").forEach((x,i)=>{const label=x.t==="appx"?`APPENDIX ${x.L}: ${x.T}`:x.x;txt(label,ML,y-10.5,R,10.5);tocPos[label]=y-10.5;y-=19});continue}
    if(b.t==="h1"){if(b.page)newPage();else ensure(40);toc.push({label:b.x,page});txt(b.x,ML,y-15,BD,15);y-=34;continue}
    if(b.t==="h2"){ensure(36);wrap(b.x,BD,11.5,CW).forEach(l=>{txt(l,ML,y-11.5,BD,11.5);y-=16});y-=5;continue}
    if(b.t==="p"){para(b.x,{s:b.s||10.5,lh:b.s?13.5:15,gap:b.tight?5:7});continue}
    if(b.t==="cap"){ensure(60);let x=ML;txt(b.b+" ",x,y-10.5,BD,10.5);x+=tw(b.b+" ",BD,10.5);txt(b.x,x,y-10.5,R,10.5);y-=18;continue}
    if(b.t==="table"){table(b.head,b.rows,b.w,{s:b.s||9,bold:b.bold??-1,after:b.after??10});continue}
    if(b.t==="photos"){const ims=[];for(const pid of b.ids){const p=await idb.get("photo:"+pid);if(p){try{ims.push(await pdf.embedJpg(p.data))}catch(e){try{ims.push(await pdf.embedPng(p.data))}catch(e2){}}}}
      const tw=160,th=120,gap=10,per=Math.max(1,Math.floor((CW+gap)/(tw+gap)));
      for(let i=0;i<ims.length;i+=per){ensure(th+gap);ims.slice(i,i+per).forEach((im,j)=>{const d=im.scaleToFit(tw,th);page.drawImage(im,{x:ML+j*(tw+gap)+(tw-d.width)/2,y:y-th+(th-d.height)/2,width:d.width,height:d.height})});y-=th+gap}continue}
    if(b.t==="equip"){const E=st.equip.filter(e=>e.name||e.details||e.photos.length);
      const fr=[.06,.24,.38,.32],ws=fr.map(v=>v*CW),pad=5,s=9,lh=12,gap=5;
      const head=["No.","Equipment / item","Details","Photo"],drawHead=()=>{let x=ML;const h=s+2*pad+2;head.forEach((c,i)=>{page.drawRectangle({x,y:y-h,width:ws[i],height:h,borderColor:LINE,borderWidth:.6,color:HEAD});txt(c,x+pad,y-pad-s+1,BD,s,rgb(.3,.35,.42));x+=ws[i]});y-=h};
      if(!E.length){table(["Equipment / media"],[["-"]],[1]);continue}
      ensure(60);drawHead();
      for(let k=0;k<E.length;k++){const e=E[k];const nl=wrap(e.name||"-",BD,s,ws[1]-2*pad),dl=wrap(e.details||"-",R,s,ws[2]-2*pad);
        const ims=[];for(const pid of e.photos){const p=await idb.get("photo:"+pid);if(p){try{ims.push(await pdf.embedJpg(p.data))}catch(err){try{ims.push(await pdf.embedPng(p.data))}catch(e2){}}}}
        const tile=ims.length>1?68:86,perRow=Math.max(1,Math.floor((ws[3]-2*pad+gap)/(tile+gap))),prow=Math.ceil(ims.length/perRow),ph=ims.length?prow*tile+(prow-1)*gap:0;
        const h=Math.max(nl.length*lh,dl.length*lh,ph)+2*pad;
        if(y-h<BOT){newPage();drawHead()}
        let x=ML;[String(k+1),null,null,null].forEach((c,i)=>{page.drawRectangle({x,y:y-h,width:ws[i],height:h,borderColor:LINE,borderWidth:.6});x+=ws[i]});
        txt(String(k+1),ML+pad,y-pad-s+1,R,s);nl.forEach((l,j)=>txt(l,ML+ws[0]+pad,y-pad-s+1-j*lh,BD,s));dl.forEach((l,j)=>txt(l,ML+ws[0]+ws[1]+pad,y-pad-s+1-j*lh,R,s));
        ims.forEach((im,j)=>{const d=im.scaleToFit(tile,tile),cx=ML+ws[0]+ws[1]+ws[2]+pad+(j%perRow)*(tile+gap),cy=y-pad-Math.floor(j/perRow)*(tile+gap);
          page.drawImage(im,{x:cx+(tile-d.width)/2,y:cy-tile+(tile-d.height)/2,width:d.width,height:d.height})});
        y-=h}
      y-=10;continue}
    if(b.t==="rich"){ensure(b.keep?110:18);let x=ML;b.parts.forEach(([t,bo])=>{txt(t,x,y-10,bo?BD:R,10);x+=tw(t,bo?BD:R,10)});y-=17;continue}
    if(b.t==="mono"){ensure(14);txt(b.x,ML,y-9.5,R,9.5);y-=14;continue}
    if(b.t==="twa"){const ls=wrap(b.x,R,9.5,CW-80);ls.forEach((l,i)=>{ensure(14);txt(l,ML,y-9.5,R,9.5);if(i===ls.length-1&&b.b)txt(b.b,ML+tw(l,R,9.5)+2,y-9.5,BD,9.5);y-=14});y-=12;continue}
    if(b.t==="prep"){y-=24;ensure(80);txt("Prepared by,",ML,y-10.5,BD,10.5);y-=26;[["Name",I.htName],["Position",I.htPos],["Registration No.",I.htReg]].forEach(([k,v])=>{txt(`${k} : ${v||"-"}`,ML,y-10.5,R,10.5);y-=17});continue}
    if(b.t==="appx"){newPage();const label=`APPENDIX ${b.L}: ${b.T}`;toc.push({label,page});cx(label,BD,16,PH/2+10);
      const fs=st.att[b.L]||[];if(!fs.length)cx("(No document attached)",R,10,PH/2-14,GREY);
      for(const meta of fs){const fl=await idb.get("file:"+meta.id);if(!fl)continue;
        try{if(/pdf/i.test(fl.type)||/\.pdf$/i.test(fl.name)){const src=await PDFDocument.load(fl.data,{ignoreEncryption:true});(await pdf.copyPages(src,src.getPageIndices())).forEach(p=>pdf.addPage(p))}
          else{let im;if(/png/i.test(fl.type))im=await pdf.embedPng(fl.data);else if(/jpe?g/i.test(fl.type))im=await pdf.embedJpg(fl.data);else im=await pdf.embedPng((await toPng(fl)).data);
            newPage();attPages.add(page);const d=im.scaleToFit(CW,TOP-BOT-10);page.drawImage(im,{x:ML+(CW-d.width)/2,y:TOP-d.height,width:d.width,height:d.height})}}
        catch(e){console.error(e);newPage();txt(`Could not attach ${meta.name}: ${e.message}`,ML,TOP-20,R,10,rgb(.75,.2,.15))}}
      continue}
  }
  // page numbers count only the report's own pages; attached documents are not numbered or counted
  const all=pdf.getPages(),repPages=all.filter(p=>gen.has(p)&&!attPages.has(p)),N=repPages.length,hdr=`Chemical Exposure Monitoring at ${client} — Report No.: ${I.reportNo||"-"}`;
  const disc=dd(`This report shall not be reproduced, distributed or copied without prior written consent of ${I.consName||"the consultant"}.`);
  let hs=8;const fitW=()=>tw(hdr,R,hs)+tw(I.dates||"",R,hs)+14;while(fitW()>CW&&hs>6.3)hs-=0.1;const dW=tw(I.dates||"",R,hs);
  let hT=hdr;while(hT.length>10&&tw(hT,R,hs)>CW-dW-14)hT=hT.slice(0,-2);if(hT!==hdr)hT=hT.trim()+"…";
  repPages.forEach((p,i)=>{page=p;txt(hT,ML,PH-40,R,hs,GREY);txt(I.dates||"",PW-MR-dW,PH-40,R,hs,GREY);
    txt(disc,ML,36,R,6.8,GREY);const pn=`Page ${i+1} of ${N}`;txt(pn,PW-MR-tw(pn,R,8.5),36,R,8.5,GREY)});
  page=tocPage;toc.forEach(t=>{if(tocPos[t.label]==null)return;const n=String(repPages.indexOf(t.page)+1);txt(n,PW-MR-tw(n,R,10.5),tocPos[t.label],R,10.5)});
  return pdf.save()}

/* ---------------- Word renderer (docx) ---------------- */
async function pdfPagesAsPng(bytes,scale=1.6){const lib=await getPdfjs(),doc=await lib.getDocument({data:new Uint8Array(bytes.slice(0))}).promise,out=[];
  for(let i=1;i<=doc.numPages;i++){const pg=await doc.getPage(i),vp=pg.getViewport({scale}),cv=document.createElement("canvas");cv.width=vp.width;cv.height=vp.height;
    await pg.render({canvasContext:cv.getContext("2d"),viewport:vp}).promise;out.push({data:new Uint8Array(await (await new Promise(r=>cv.toBlob(r,"image/png"))).arrayBuffer()),w:cv.width,h:cv.height})}
  return out}
async function buildDocx(B){
  const D=window.docx,I=st.info,client=I.client||"Client",kids=[];let brk=false;
  const AL=D.AlignmentType,W=D.WidthType.PERCENTAGE,SZ=21;
  const run=(text,o={})=>new D.TextRun({text:String(text??""),size:o.size||SZ,bold:!!o.bold,color:o.color});
  const P=(children,o={})=>{const p=new D.Paragraph({children,alignment:o.align,spacing:"line" in o?{after:o.after??120,before:o.before}:{after:o.after??120,line:300,before:o.before},heading:o.heading,pageBreakBefore:brk||!!o.pb,keepNext:o.keepNext});brk=false;return p};
  const fit=(w,h,maxW=600,maxH=820)=>{const k=Math.min(maxW/w,maxH/h,1);return{width:Math.round(w*k),height:Math.round(h*k)}};
  const img=(d,type)=>new D.ImageRun({type,data:d.data,transformation:fit(d.w,d.h)});
  const table=(head,rows,w,o={})=>{if(brk){kids.push(new D.Paragraph({children:[new D.PageBreak()]}));brk=false}
    kids.push(new D.Table({width:{size:100,type:W},rows:[head,...rows].map((cells,ri)=>new D.TableRow({tableHeader:ri===0,cantSplit:true,children:cells.map((c,ci)=>new D.TableCell({width:{size:Math.round(w[ci]*100),type:W},
      shading:ri===0?{fill:"E8ECF1",type:D.ShadingType.CLEAR,color:"auto"}:undefined,margins:{top:50,bottom:50,left:80,right:80},
      children:[new D.Paragraph({spacing:{after:0},children:[run(c,{size:o.s?o.s*2:18,bold:ri===0||ci===o.bold,color:ri===0?"4A5563":undefined})]})]}))}))}));
    kids.push(new D.Paragraph({spacing:{after:o.after===2?40:160},children:[]}))};
  for(const b of B){
    if(b.t==="cover"){const lg=st.info.logoName?await idb.get("logo").catch(()=>null):null;
      if(lg){try{const bmp=await createImageBitmap(new Blob([lg.data],{type:lg.type}));kids.push(P([new D.ImageRun({type:/png/i.test(lg.type)?"png":"jpg",data:new Uint8Array(lg.data),transformation:fit(bmp.width,bmp.height,200,96)})],{align:AL.CENTER,line:null,after:200}))}catch(e){}}
      kids.push(P([run((I.consName||"").toUpperCase(),{bold:true,size:30})],{align:AL.CENTER,after:60}));
      [I.consAddr,I.consTel,I.consEmail].filter(Boolean).forEach(l=>kids.push(P([run(l,{size:17,color:"6B7280"})],{align:AL.CENTER,after:0})));
      kids.push(P([],{before:1200,after:400}));
      ["PERSONAL","CHEMICAL EXPOSURE MONITORING","REPORT"].forEach(l=>kids.push(P([run(l,{bold:true,size:34,color:"26406E"})],{align:AL.CENTER,after:60})));
      kids.push(P([run(`(REF. NO.: ${I.reportNo||"-"})`,{bold:true,size:20,color:"26406E"})],{align:AL.CENTER,after:900}));
      kids.push(P([run(client.toUpperCase(),{bold:true,size:24})],{align:AL.CENTER,after:40}));if(I.clientDosh)kids.push(P([run(`(DOSH NO.: ${I.clientDosh})`,{bold:true,size:21})],{align:AL.CENTER}));
      const ln=(I.locName||"").trim();if(ln&&ln.toLowerCase()!==client.trim().toLowerCase())kids.push(P([run(ln.toUpperCase(),{bold:true,size:23})],{align:AL.CENTER,before:300,after:40}));
      kids.push(new D.Paragraph({alignment:AL.CENTER,spacing:{before:240,after:900},indent:{left:900,right:900},children:[run((I.locAddr||"").toUpperCase(),{bold:true,size:21})]}));
      [["HYGIENE TECHNICIAN NAME",I.htName],["DOSH REG. NO.",I.htReg],["DOSH REPORT NO.",I.doshReportNo],["ESM REPORT NO.",I.reportNo],["MONITORING DATE",I.dates]].forEach(([k,v])=>
        kids.push(new D.Paragraph({tabStops:[{type:D.TabStopType.LEFT,position:4200}],spacing:{after:80},indent:{left:600},children:[run(k,{bold:true,size:19}),run("\t: "+String(v||"-").toUpperCase(),{bold:true,size:19})]})));
      brk=true;continue}
    if(b.t==="toc"){kids.push(P([run("TABLE OF CONTENTS",{bold:true,size:30})],{after:240}));
      B.filter(x=>x.t==="h1"||x.t==="appx").forEach(x=>kids.push(P([run(x.t==="appx"?`APPENDIX ${x.L}: ${x.T}`:x.x)],{after:110})));brk=true;continue}
    if(b.t==="h1"){if(b.page)brk=true;kids.push(P([run(b.x,{bold:true,size:30,color:"1D2A35"})],{heading:D.HeadingLevel.HEADING_1,after:240}));continue}
    if(b.t==="h2"){kids.push(P([run(b.x,{bold:true,size:23})],{heading:D.HeadingLevel.HEADING_2,before:120,after:100,keepNext:true}));continue}
    if(b.t==="p"){b.x.split("\n").filter(s=>s.trim()).forEach(s=>{const bl=/^• /.test(s);kids.push(bl?new D.Paragraph({children:[run(s.slice(2),{size:b.s?b.s*2:SZ})],bullet:{level:0},alignment:AL.JUSTIFIED,spacing:{after:100,line:300},pageBreakBefore:brk}):P([run(s,{size:b.s?b.s*2:SZ})],{align:AL.JUSTIFIED,after:b.tight?80:140}));brk=false});continue}
    if(b.t==="cap"){kids.push(P([run(b.b+" ",{bold:true}),run(b.x)],{after:80,keepNext:true}));continue}
    if(b.t==="table"){table(b.head,b.rows,b.w,{s:b.s,bold:b.bold,after:b.after});continue}
    if(b.t==="photos"){const runs=[];for(const pid of b.ids){const p=await idb.get("photo:"+pid);if(p){const k2=Math.min(200/p.w,150/p.h,1);runs.push(new D.ImageRun({type:/png/i.test(p.type)?"png":"jpg",data:new Uint8Array(p.data),transformation:{width:Math.round(p.w*k2),height:Math.round(p.h*k2)}}),new D.TextRun({text:"  "}))}}
      if(runs.length)kids.push(new D.Paragraph({spacing:{after:160},children:runs}));continue}
    if(b.t==="equip"){const E=st.equip.filter(e=>e.name||e.details||e.photos.length);
      if(!E.length){table(["Equipment / media"],[["-"]],[1]);continue}
      if(brk){kids.push(new D.Paragraph({children:[new D.PageBreak()]}));brk=false}
      const w=[6,24,38,32],cell=(children,i,head)=>new D.TableCell({width:{size:w[i],type:W},shading:head?{fill:"E8ECF1",type:D.ShadingType.CLEAR,color:"auto"}:undefined,margins:{top:60,bottom:60,left:80,right:80},children});
      const rows=[new D.TableRow({tableHeader:true,children:["No.","Equipment / item","Details","Photo"].map((h,i)=>cell([new D.Paragraph({spacing:{after:0},children:[run(h,{bold:true,size:18,color:"4A5563"})]})],i,true))})];
      for(let k=0;k<E.length;k++){const e=E[k],imgs=[];
        for(const pid of e.photos){const p=await idb.get("photo:"+pid);if(p){const k2=Math.min(86/p.w,86/p.h,1);imgs.push(new D.ImageRun({type:/png/i.test(p.type)?"png":"jpg",data:new Uint8Array(p.data),transformation:{width:Math.round(p.w*k2),height:Math.round(p.h*k2)}}),new D.TextRun({text:" "}))}}
        rows.push(new D.TableRow({cantSplit:true,children:[cell([new D.Paragraph({spacing:{after:0},children:[run(k+1,{size:18})]})],0),
          cell([new D.Paragraph({spacing:{after:0},children:[run(e.name||"-",{size:18,bold:true})]})],1),
          cell((e.details||"-").split("\n").map(l=>new D.Paragraph({spacing:{after:0},children:[run(l,{size:18})]})),2),
          cell([new D.Paragraph({spacing:{after:0},children:imgs.length?imgs:[run("",{size:18})]})],3)]}))}
      kids.push(new D.Table({width:{size:100,type:W},rows}));kids.push(new D.Paragraph({spacing:{after:160},children:[]}));continue}
    if(b.t==="rich"){kids.push(P(b.parts.map(([t,bo])=>run(t,{bold:!!bo,size:20})),{after:80,keepNext:true,before:120}));continue}
    if(b.t==="mono"){kids.push(P([run(b.x,{size:18})],{after:20}));continue}
    if(b.t==="twa"){kids.push(P([run(b.x,{size:18}),run(b.b,{size:18,bold:true})],{after:200}));continue}
    if(b.t==="prep"){kids.push(P([run("Prepared by,",{bold:true})],{before:400}));[["Name",I.htName],["Position",I.htPos],["Registration No.",I.htReg]].forEach(([k,v])=>kids.push(P([run(`${k} : ${v||"-"}`)],{after:60})));continue}
    if(b.t==="appx"){brk=true;kids.push(P([run(`APPENDIX ${b.L}: ${b.T}`,{bold:true,size:30})],{heading:D.HeadingLevel.HEADING_1,align:AL.CENTER,before:3600,after:200}));
      const fs=st.att[b.L]||[];if(!fs.length)kids.push(P([run("(No document attached)",{color:"6B7280"})],{align:AL.CENTER}));
      for(const meta of fs){const fl=await idb.get("file:"+meta.id);if(!fl)continue;
        try{let imgs;if(/pdf/i.test(fl.type)||/\.pdf$/i.test(fl.name)){busy(true,`Adding ${meta.name} to the Word file…`);imgs=(await pdfPagesAsPng(fl.data)).map(d=>[d,"png"])}
          else if(/png|jpe?g/i.test(fl.type)){const bmp=await createImageBitmap(new Blob([fl.data],{type:fl.type}));imgs=[[{data:new Uint8Array(fl.data),w:bmp.width,h:bmp.height},/png/i.test(fl.type)?"png":"jpg"]]}
          else imgs=[[await toPng(fl),"png"]];
          imgs.forEach(([d,t])=>{brk=true;kids.push(P([img(d,t)],{align:AL.CENTER,after:0,line:null}))})}
        catch(e){console.error(e);kids.push(P([run(`Could not attach ${meta.name}: ${e.message}`,{color:"C0392B"})]))}}
      continue}
  }
  const hdr=`Chemical Exposure Monitoring at ${client} — Report No.: ${I.reportNo||"-"}`,disc=dd(`This report shall not be reproduced, distributed or copied without prior written consent of ${I.consName||"the consultant"}.`);
  const doc=new D.Document({creator:I.htName||"IH Control",title:`CEM Report ${I.reportNo||""}`,
    styles:{default:{document:{run:{font:"Arial",size:SZ}}},paragraphStyles:[{id:"Heading1",name:"Heading 1",basedOn:"Normal",next:"Normal",run:{font:"Arial",size:30,bold:true,color:"1D2A35"}},{id:"Heading2",name:"Heading 2",basedOn:"Normal",next:"Normal",run:{font:"Arial",size:23,bold:true,color:"1D2A35"}}]},
    numbering:undefined,
    sections:[{properties:{titlePage:true,page:{size:{width:11906,height:16838},margin:{top:1300,bottom:1200,left:1134,right:1134,header:560,footer:560}}},
      headers:{default:new D.Header({children:[new D.Paragraph({tabStops:[{type:D.TabStopType.RIGHT,position:9638}],children:[run(hdr,{size:12,color:"6B7280"}),run("\t"+(I.dates||""),{size:12,color:"6B7280"})]})]}),first:new D.Header({children:[new D.Paragraph({children:[]})]})},
      footers:{default:new D.Footer({children:[new D.Paragraph({tabStops:[{type:D.TabStopType.RIGHT,position:9638}],children:[run(disc,{size:12,color:"6B7280"}),new D.TextRun({children:["\tPage ",D.PageNumber.CURRENT," of ",D.PageNumber.TOTAL_PAGES],size:16,color:"6B7280"})]})]}),first:new D.Footer({children:[new D.Paragraph({children:[]})]})},
      children:kids}]});
  return D.Packer.toBlob(doc)}

/* ---------------- downloads ---------------- */
function download(blob,name){const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},4000)}
const baseName=()=>`CEM-Report-${(st.info.reportNo||"draft").replace(/[^\w\-]+/g,"_")}`;
async function makeReport(kind,open){$("#mDl").classList.remove("show");
  if(kind==="pdf"&&!window.PDFLib)return toast("PDF library didn't load. Check your internet connection.");
  if(kind==="docx"&&!window.docx)return toast("Word library didn't load. Check your internet connection.");
  busy(true,kind==="pdf"?"Building PDF report…":"Building Word report…");
  try{const B=model();
    if(kind==="pdf"){const bytes=await buildPdf(B),blob=new Blob([bytes],{type:"application/pdf"});window.__lastReport={kind,bytes};if(open){const w=window.open(URL.createObjectURL(blob),"_blank");if(!w)download(blob,baseName()+".pdf")}else download(blob,baseName()+".pdf")}
    else{const blob=await buildDocx(B);window.__lastReport={kind,blob};download(blob,baseName()+".docx")}
    toast(kind==="pdf"?"PDF report ready":"Word report ready")}
  catch(e){console.error(e);toast("Could not build the report: "+e.message,6000)}finally{busy(false)}}
$("#bDl").onclick=()=>$("#mDl").classList.add("show");
$("#dlPdf").onclick=()=>makeReport("pdf",$("#dlPreview").checked);$("#dlDoc").onclick=()=>makeReport("docx");
$("#bPrint").onclick=()=>window.print();
$("#bXls").onclick=()=>{if(!window.XLSX)return toast("Excel library didn't load");const wb=XLSX.utils.book_new(),G=groups();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(Object.entries(st.info).filter(([k])=>k!=="logoName").map(([k,v])=>({Field:k,Value:v}))),"Report info");
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(st.rows.map(r=>{const c=calc(r);return{Point:r.point,Worker:worker(r.point),Parameter:r.param,"Sample ID":r.sample,"Period (hrs)":r.period,"fc (L/min)":r.fc,"t (min)":r.t,"Tc (°C)":st.env.Tc,"Pc (mmHg)":st.env.Pc,"T (°C)":st.env.T,"P (mmHg)":st.env.P,"Mass (µg)":r.mass,"Vm (L)":c.Vm&&+c.Vm.toFixed(2),"Vs (L)":c.Vs&&+c.Vs.toFixed(2),"Ci (mg/m³)":c.Ci&&+c.Ci.toFixed(4)}})),"Calculation");
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(G.map(g=>({Worker:g.worker,Point:g.point,Parameter:g.param,"Duration (min)":g.sumT,"Result (mg/m³)":twaTxt(g),"Basis":g.short?"Short-term (<60 min) vs MEL":"8-hr TWA vs PEL","PEL (mg/m³)":g.pel,"Limit used (mg/m³)":g.lim,"% of limit":g.pct&&+g.pct.toFixed(1),Remarks:remark(g)}))),"Summary");
  XLSX.writeFile(wb,`CEM-${st.info.reportNo||"report"}.xlsx`)};

/* ---------------- save to dashboard (IH job register) ---------------- */
const isoD=d=>{const z=new Date(d.getTime()-d.getTimezoneOffset()*6e4);return z.toISOString().slice(0,10)};
const addM=(s,m)=>{const d=new Date((s||isoD(new Date()))+"T00:00:00");d.setMonth(d.getMonth()+m);return isoD(d)};
const slug=s=>String(s||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,40);
function dashJobs(){
  const a=analyse(),I=st.info,date=$("#svDate").value||isoD(new Date()),status=$("#svStatus").value,pic=$("#svPic").value||I.htName||"";
  const base="cem-"+(slug(I.reportNo)||slug(I.client)||st.reportId.slice(0,8));
  const P=a.P.filter(x=>x.worst).sort((p,q)=>(q.worst.pct||0)-(p.worst.pct||0));
  return P.map((x,ix)=>{
    const w=x.worst,cat=["dust","silica"].includes(x.haz)?"Dust / particulates":"Chemicals (VOC / hazardous)";
    const top=w.cat==="nd"?"nd":x.top,recur=top==="over"?6:top==="half"?12:0;
    const pts=x.done.map(g=>`${g.point} ${twaTxt(g)}`).join(", ");
    const next=top==="over"?"Reduce exposure below PEL; improve controls; repeat CEM within 6 months":top==="half"?"Improve controls; repeat CEM within 12 months":top==="ten"?"Collect 6 additional samples (DOSH Guidelines 2022)":top==="nd"?"Below detection limit; use larger air volume next monitoring":"Maintain controls; review with CHRA assessor";
    const jid=st.jobId&&ix===0?st.jobId:`${base}-${slug(x.p)}`;
    return{id:jid,reportId:st.reportId,title:`CEM – ${x.p} (${I.area||"workplace"})`,reportNo:I.reportNo||"",location:I.locName||I.client||"",category:cat,pic,
      priority:top==="over"?"Critical":top==="half"?"High":"Normal",status,requestDate:$("#svReq").value||date,deadline:date,
      result:+w.twa.toFixed(3),unit:"mg/m³",nab:w.lim??x.pel,recur,nextAction:next.replace("below PEL","below "+w.basis),
      notes:`From CEM Calculator. Highest: ${w.worker} (${w.point}) ${twaTxt(w)} mg/m³ = ${pctG(w)} of ${w.basis}${w.short?` (short-term, ${f(w.sumT,0)} min; MEL = 3 × PEL)`:""}.${w.lt?" Result below detection limit (upper bound).":""} All points: ${pts}. Client: ${I.client||"-"}.`,
      checklist:status==="Completed"?{sampling:true,lab:true,draft:true,review:true}:{sampling:true,lab:true,draft:status==="Reporting"},
      seriesId:jid,cycle:1,controls:[],completedAt:status==="Completed"?date:null,source:"cem",_top:top,_pct:w.pct,_lt:w.lt}})}
function renderSavePreview(){if(!$("#svPrev"))return;
  if(!$("#svDate").value)$("#svDate").value=isoD(new Date());if(!$("#svPic").value)$("#svPic").value=st.info.htName||"";
  const J=dashJobs();
  $("#svPrev").innerHTML=J.length?`<tr><th>Dashboard job</th><th>Location</th><th>Highest result (mg/m³)</th><th>Limit (PEL/MEL)</th><th>% of limit</th><th>Priority</th><th>Next monitoring</th><th>Next action</th></tr>`+J.map(j=>`<tr><td>${esc(j.title)}</td><td>${esc(j.location)||'<span class="pill p-over">set Location name</span>'}</td><td class="n">${j._lt?"<":""}${j.result}</td><td class="n">${j.nab??"–"}</td><td class="n">${j._lt?"<":""}${j._pct==null?"–":j._pct.toFixed(1)}</td><td><span class="pill ${j.priority==="Critical"?"p-over":j.priority==="High"?"p-warn":""}">${j.priority}</span></td><td>${j.recur?`${j.recur} months (${addM($("#svDate").value,j.recur)})`:"as per CHRA"}</td><td style="white-space:normal;font-size:12px;min-width:220px">${esc(j.nextAction)}</td></tr>`).join("")
    :`<tr><td class="muted">Complete the sample and field data first. Jobs are created for chemicals with a calculated TWA.</td></tr>`}
["#svStatus","#svDate","#svPic","#svReq"].forEach(s=>$(s)&&($(s).onchange=renderSavePreview));
$("#bSave").onclick=async()=>{
  const sb=window.__sb,role=window.__role;
  if(!sb)return toast("Log in from the dashboard first, then reopen this page to save.",5000);
  if(role!=="admin"&&role!=="editor")return toast("Your account is view-only. Ask an admin for editor access to save jobs.",5000);
  const J=dashJobs();if(!J.length)return toast("Nothing to save yet. Complete the sample and field data first.");
  if(!st.info.reportNo&&!confirm("This report has no Report No. Save anyway? (Report No. keeps re-saves from creating duplicates.)"))return;
  busy(true,"Saving to dashboard…");
  try{const {data:ex,error:e1}=await sb.from("ih_jobs").select("id,data");if(e1)throw e1;
    const byId=Object.fromEntries((ex||[]).map(r=>[r.id,r.data]));let maxNo=Math.max(0,...(ex||[]).map(r=>+(r.data&&r.data.no)||0));
    const up=[];
    J.forEach(j=>{const {_top,_pct,_lt,...job}=j,old=byId[job.id];job.no=old&&old.no?old.no:++maxNo;if(old&&old.controls&&old.controls.length)job.controls=old.controls;if(old&&old.requestDate&&!$("#svReq").value)job.requestDate=old.requestDate;
      up.push({id:job.id,data:job});
      if(job.status==="Completed"&&job.recur>0){const nid=job.id+"-c2",o2=byId[nid];
        up.push({id:nid,data:{...job,id:nid,no:o2&&o2.no?o2.no:++maxNo,status:o2?o2.status:"Waiting",requestDate:addM(job.deadline,job.recur-1),deadline:addM(job.deadline,job.recur),result:o2?o2.result:"",
          cycle:2,checklist:o2?o2.checklist:{},controls:[],completedAt:null,reportNo:"",nextAction:"Schedule repeat CEM sampling",notes:`Repeat monitoring due after report ${job.reportNo||""}.`}})}});
    const {error:e2}=await sb.from("ih_jobs").upsert(up);if(e2)throw e2;
    st.savedAt=new Date().toISOString();st.dashJobs=up.map(u=>u.id);if(!st.jobId)st.jobId=J[0].id,st.jobTitle=J[0].title;save();await cloudSave();showLink();
    $("#svMsg").innerHTML=`Saved ${up.length} job${up.length>1?"s":""} at ${new Date().toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}. <a href="index.html">Open dashboard →</a>`;
    toast("Saved to dashboard")}
  catch(e){console.error(e);toast("Could not save: "+(e.message||e),6000)}finally{busy(false)}};

/* ---------------- online storage (Supabase) ---------------- */
const BUCKET="cem-files";let cloudBusy=false,cloudT=null,cloudAgain=false;
const canEditCloud=()=>!!window.__sb&&(window.__role==="admin"||window.__role==="editor");
function cloudStatus(t,ok){const e=$("#cloudSt");if(e)e.innerHTML=t?`${ok===false?"⚠️":ok?"☁️ ✓":"☁️"} ${esc(t)}`:""}
function fileRefs(){const k=[];Object.values(st.att||{}).forEach(a=>a.forEach(x=>k.push("file:"+x.id)));(st.equip||[]).forEach(e=>e.photos.forEach(p=>k.push("photo:"+p)));if(st.info.logoName)k.push("logo");return k}
const objPath=k=>`${st.reportId}/${k.replace(":","_")}`;
function onLocalSave(){if(!canEditCloud()||cloudBusy&&!cloudAgain){if(cloudBusy)cloudAgain=true;return}
  clearTimeout(cloudT);cloudStatus("Unsaved changes…");cloudT=setTimeout(cloudSave,2500)}
async function cloudSave(){if(!canEditCloud())return false;if(cloudBusy){cloudAgain=true;return}
  cloudBusy=true;cloudAgain=false;const sb=window.__sb;cloudStatus("Saving online…");
  try{for(const k of fileRefs()){if(st.up[k])continue;const f=await idb.get(k);if(!f)continue;
      const {error}=await sb.storage.from(BUCKET).upload(objPath(k),new Blob([f.data],{type:f.type||"application/octet-stream"}),{upsert:true,contentType:f.type||"application/octet-stream"});
      if(error)throw error;st.up[k]=1;st.meta[k]={type:f.type,name:f.name||"",w:f.w||0,h:f.h||0}}
    const {error}=await sb.from("cem_reports").upsert({id:st.reportId,job_id:st.jobId||null,report_no:st.info.reportNo||"",client:st.info.client||"",data:st});
    if(error)throw error;st.cloudAt=new Date().toISOString();try{localStorage.setItem(lkey(st.reportId),JSON.stringify(st))}catch(e){}
    cloudStatus("Saved online "+new Date().toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"}),true);return true}
  catch(e){console.error(e);cloudStatus("Not saved online (kept on this device): "+(e.message||e),false);return false}
  finally{cloudBusy=false;if(cloudAgain){cloudAgain=false;clearTimeout(cloudT);cloudT=setTimeout(cloudSave,1500)}}}
async function pullFiles(){const sb=window.__sb;let n=0;
  for(const k of fileRefs()){if(await idb.get(k))continue;const {data,error}=await sb.storage.from(BUCKET).download(objPath(k));if(error||!data)continue;
    const m=st.meta[k]||{};await idb.put(k,{name:m.name,type:m.type||data.type,w:m.w,h:m.h,data:await data.arrayBuffer()});n++}
  return n}
function rerenderEverything(){$("#divTotal").checked=!!st.divTotal;Object.keys(thumbURL).forEach(k=>delete thumbURL[k]);
  renderInfo();renderEquip();renderControls();renderAll();renderTexts();renderAtt();showLink();
  try{history.replaceState(null,"",location.pathname+"?report="+encodeURIComponent(st.reportId))}catch(e){}}
function showLink(){const b=$("#linkBar");if(!b)return;if(st.jobId){b.style.display="";$("#linkTxt").innerHTML=`Linked to dashboard job <b>${esc(st.jobTitle||st.jobId)}</b>. “Complete &amp; save to dashboard” updates that job.`}else b.style.display="none"}
async function openCloudReport(id){const sb=window.__sb;busy(true,"Opening report…");
  try{const {data,error}=await sb.from("cem_reports").select("id,data,updated_at").eq("id",id).maybeSingle();if(error)throw error;if(!data)throw new Error("Report not found");
    replaceState({...data.data,reportId:data.id});busy(true,"Downloading files…");await pullFiles();rerenderEverything();
    setTimeout(()=>{clearTimeout(cloudT);cloudStatus("Opened · saved online "+new Date(data.updated_at).toLocaleString("en-GB",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}),true)},450)}
  catch(e){toast("Could not open report: "+(e.message||e),5000)}finally{busy(false)}}
async function startFromJob(jobId){const sb=window.__sb;
  const {data:rep}=await sb.from("cem_reports").select("id").eq("job_id",jobId).limit(1);if(rep&&rep.length)return openCloudReport(rep[0].id);
  const {data:job}=await sb.from("ih_jobs").select("id,data").eq("id",jobId).maybeSingle();if(!job)return toast("Job not found");
  if(!canEditCloud())return toast("No report has been started for this job yet.",5000);
  const j=job.data||{};replaceState({jobId:job.id,jobTitle:j.title||"",info:{...DEF_INFO,client:j.location||"",locName:j.location||"",reportNo:j.reportNo||"",htName:j.pic||""},svReq:j.requestDate||""});
  rerenderEverything();if(j.requestDate)$("#svReq").value=j.requestDate;if(j.pic)$("#svPic").value=j.pic;await cloudSave();toast("New CEM report started for this job")}
async function listReports(){const sb=window.__sb;$("#mRep").classList.add("show");$("#repList").innerHTML='<tr><td class="muted">Loading…</td></tr>';
  const {data,error}=await sb.from("cem_reports").select("id,report_no,client,updated_at,updated_by,job_id").order("updated_at",{ascending:false}).limit(300);
  if(error){$("#repList").innerHTML=`<tr><td>${esc(error.message)}</td></tr>`;return}
  const draw=()=>{const q=$("#repQ").value.toLowerCase();const L=(data||[]).filter(x=>!q||(x.report_no+" "+x.client).toLowerCase().includes(q));
    $("#repList").innerHTML=`<tr><th>Report no.</th><th>Client</th><th>Last saved</th><th>By</th><th>Job</th></tr>`+(L.length?L.map(x=>`<tr class="r" data-open="${esc(x.id)}"><td><b>${esc(x.report_no)||"(no number)"}</b>${x.id===st.reportId?' <span class="pill">open</span>':""}</td><td>${esc(x.client)||"–"}</td><td>${x.updated_at?new Date(x.updated_at).toLocaleString("en-GB",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}):"–"}</td><td class="muted">${esc(x.updated_by)||""}</td><td>${x.job_id?"🔗":""}</td></tr>`).join(""):'<tr><td colspan="5" class="muted">No reports saved online yet.</td></tr>');
    $$("[data-open]").forEach(tr=>tr.onclick=async()=>{$("#mRep").classList.remove("show");if(tr.dataset.open===st.reportId)return;if(canEditCloud())await cloudSave();openCloudReport(tr.dataset.open)})};
  $("#repQ").oninput=draw;draw()}
$("#bReports").onclick=()=>window.__sb?listReports():toast("Log in from the dashboard to see online reports.");
$("#bNew").onclick=async()=>{if(st.rows.length&&!confirm("Start a new, empty report? The current report stays saved"+(canEditCloud()?" online.":" on this device.")))return;
  if(canEditCloud())await cloudSave();replaceState({});rerenderEverything();toast("New report started")};

/* clear everything in the current report (company details, report link and dashboard link are kept) */
$("#bWipe").onclick=async()=>{
  if(!confirm("Clear ALL data in this report?\n\nThis removes report info, equipment details and photos, CoA results, samples, controls, written text and appendices.\nCompany details and logo are kept.\n\nThis cannot be undone."))return;
  const keep={reportId:st.reportId,jobId:st.jobId};
  const ids=[];Object.values(st.att||{}).forEach(a=>(a||[]).forEach(x=>ids.push("file:"+x.id)));(st.equip||[]).forEach(e=>(e.photos||[]).forEach(ph=>ids.push("photo:"+(ph.id||ph))));
  for(const k of ids){try{await idb.del(k)}catch(e){}}
  replaceState(keep);rerenderEverything();if(canEditCloud())cloudSave();toast("All data in this report cleared")};

/* company details shared online as the default for new reports */
async function onCompanyChange(c){if(!canEditCloud())return;const sb=window.__sb;
  try{if(c.logoName){const lg=await idb.get("logo");if(lg)await sb.storage.from(BUCKET).upload("company/logo",new Blob([lg.data],{type:lg.type}),{upsert:true,contentType:lg.type})}
    await sb.from("ih_settings").upsert({key:"company",value:{...c,logoType:c.logoName?((await idb.get("logo"))||{}).type:""}})}catch(e){console.warn("company default not saved online",e)}}
async function pullCompanyDefault(){const sb=window.__sb;try{const {data}=await sb.from("ih_settings").select("value").eq("key","company").maybeSingle();if(!data||!data.value)return;
  const c=data.value;try{localStorage.setItem("ihcc_company",JSON.stringify(c))}catch(e){}
  if(c.logoName&&!(await idb.get("logo"))){const {data:blob}=await sb.storage.from(BUCKET).download("company/logo");if(blob)await idb.put("logo",{name:c.logoName,type:c.logoType||blob.type,data:await blob.arrayBuffer()})}
  if(!st.info.consName&&!st.rows.length){COMP_KEYS.forEach(k=>{if(c[k])st.info[k]=c[k]});save();renderInfo()}}catch(e){console.warn(e)}}

/* ---------------- start ---------------- */
function renderAll(){renderParams();renderPoints();renderRows();renderOut();renderTexts(true);renderSavePreview()}
try{document.documentElement.dataset.theme=JSON.parse(localStorage.getItem("ihcc_theme"))||""}catch(e){}
$("#divTotal").checked=!!st.divTotal;
fillChemList();renderInfo();renderEquip();renderControls();renderAll();renderTexts();renderAtt();
(async()=>{const C=window.IHCC_CONFIG||{};const go=()=>location.replace("index.html");
  if(C.TEST_MODE){document.body.style.visibility="visible";cloudStatus("Saved on this device only (test mode)");return}
  try{if(!window.supabase||!C.SUPABASE_URL||C.SUPABASE_URL.includes("YOUR-PROJECT"))return go();
    const sb=window.supabase.createClient(C.SUPABASE_URL,C.SUPABASE_ANON_KEY);const {data:{session}}=await sb.auth.getSession();if(!session)return go();
    const {data}=await sb.from("app_users").select("role").eq("email",(session.user.email||"").toLowerCase()).maybeSingle();if(!data)return go();
    window.__sb=sb;window.__role=data.role;if(data.role==="viewer"){const b=$("#bSave");b.disabled=true;$("#bNew").style.display="none";$("#bWipe").style.display="none";$("#svMsg").textContent="View-only account: saving to the dashboard needs editor access.";cloudStatus("View only")}
    document.body.style.visibility="visible";
    await pullCompanyDefault();
    const q=new URLSearchParams(location.search);
    if(q.get("report"))await openCloudReport(q.get("report"));
    else if(q.get("job"))await startFromJob(q.get("job"));
    else{const {data:cr}=await sb.from("cem_reports").select("updated_at").eq("id",st.reportId).maybeSingle();
      if(cr&&(!st.cloudAt||new Date(cr.updated_at)>new Date(st.cloudAt)+5000))await openCloudReport(st.reportId);
      else if(canEditCloud()&&(st.rows.length||st.info.client))cloudSave();showLink()}
  }catch(e){console.error(e);go()}})();
