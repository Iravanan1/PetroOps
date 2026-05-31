import{au as z,aF as m,aw as be,aD as e,j as F,i as _,N as ge,o as fe,A as Z,D as L,r as U,n as ve,a4 as ye,$ as w,a2 as we,ag as je,ao as Ne,a0 as ke}from"./index-D6h_OsvF.js";import{D as u,L as C,C as q}from"./LocalBackupManager-BtyUHMMe.js";import{P as Ce}from"./package-C15mVI0S.js";import{C as $e}from"./cloud-upload-LDAxnvsZ.js";import{P as ee}from"./printer-Bsq5wwjJ.js";import{T as Se}from"./terminal-DuzsDH2G.js";import{a as Ae,C as De}from"./chevron-up-ylh2pbQj.js";/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Me=[["path",{d:"M12 8V4H8",key:"hb8ula"}],["rect",{width:"16",height:"12",x:"4",y:"8",rx:"2",key:"enze0r"}],["path",{d:"M2 14h2",key:"vft8re"}],["path",{d:"M20 14h2",key:"4cs60a"}],["path",{d:"M15 13v2",key:"1xurst"}],["path",{d:"M9 13v2",key:"rq6x2g"}]],Le=z("bot",Me);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Te=[["path",{d:"m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2",key:"usdka0"}]],Re=z("folder-open",Te);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Pe=[["path",{d:"M12 2v10",key:"mnfbl"}],["path",{d:"M18.4 6.6a9 9 0 1 1-12.77.04",key:"obofu9"}]],te=z("power",Pe),Ee="http://127.0.0.1:11434",Ue="http://127.0.0.1:1234",Be="http://localhost:3001",Oe="qwen2.5:7b",B=3e3,H="pumpai_ai_cache_",Fe=50;function _e(r){var o;const t=`${r.prompt}|${r.model}|${(o=r.imageBase64)==null?void 0:o.slice(0,100)}`;let s=2166136261;for(let a=0;a<t.length;a++)s^=t.charCodeAt(a),s=Math.imul(s,16777619);return`${H}${(s>>>0).toString(16)}`}function Ie(r){try{const t=sessionStorage.getItem(r);if(!t)return null;const{text:s,ts:o}=JSON.parse(t);return Date.now()-o>30*6e4?(sessionStorage.removeItem(r),null):s}catch{return null}}function ze(r,t){try{const s=Object.keys(sessionStorage).filter(o=>o.startsWith(H));s.length>=Fe&&sessionStorage.removeItem(s[0]),sessionStorage.setItem(r,JSON.stringify({text:t,ts:Date.now()}))}catch{}}const j=class j{static configure(t){t.ollamaUrl&&(this.ollamaUrl=t.ollamaUrl),t.lmStudioUrl&&(this.lmStudioUrl=t.lmStudioUrl),t.backendUrl&&(this.backendUrl=t.backendUrl),t.defaultModel&&(this.defaultModel=t.defaultModel)}static async probeAllEndpoints(){return this.probeInProgress?Array.from(this.lastProbeResults.values()):(this.probeInProgress=!0,(await Promise.allSettled([this.probeOllama(),this.probeLMStudio(),this.probeBackend()])).forEach(s=>{s.status==="fulfilled"&&this.lastProbeResults.set(s.value.type,s.value)}),this.probeInProgress=!1,Array.from(this.lastProbeResults.values()))}static async probeOllama(){const t=Date.now();try{const s=await fetch(`${this.ollamaUrl}/api/tags`,{signal:AbortSignal.timeout(B)});if(!s.ok)throw new Error("Bad status");const a=((await s.json()).models||[]).map(n=>n.name);return{type:"ollama",url:this.ollamaUrl,available:!0,modelName:a[0]||this.defaultModel,latencyMs:Date.now()-t}}catch{return{type:"ollama",url:this.ollamaUrl,available:!1}}}static async probeLMStudio(){var s,o;const t=Date.now();try{const a=await fetch(`${this.lmStudioUrl}/v1/models`,{signal:AbortSignal.timeout(B)});if(!a.ok)throw new Error("Bad status");const i=((o=(s=(await a.json()).data)==null?void 0:s[0])==null?void 0:o.id)||"lm-studio-model";return{type:"lm_studio",url:this.lmStudioUrl,available:!0,modelName:i,latencyMs:Date.now()-t}}catch{return{type:"lm_studio",url:this.lmStudioUrl,available:!1}}}static async probeBackend(){const t=Date.now();try{if(!(await fetch(`${this.backendUrl}/api/health`,{signal:AbortSignal.timeout(B)})).ok)throw new Error("Bad status");return{type:"backend",url:this.backendUrl,available:!0,latencyMs:Date.now()-t}}catch{return{type:"backend",url:this.backendUrl,available:!1}}}static async complete(t){const s=_e(t),o=Ie(s);if(o)return{text:o,model:"cached",endpointUsed:"none",latencyMs:0,cached:!0};const a=[()=>this.callOllama(t),()=>this.callLMStudio(t),()=>this.callBackend(t)];for(const n of a)try{const i=await n();if(i.text)return ze(s,i.text),i}catch(i){console.warn("[LocalAIOfflineProxy] Endpoint failed, trying next:",i)}return{text:"",model:"none",endpointUsed:"none",latencyMs:0,cached:!1,error:"All AI endpoints unavailable. Check Ollama or network connection."}}static async callOllama(t){const s=Date.now(),o=t.model||this.defaultModel,a={model:o,prompt:t.prompt,stream:!1,options:{num_predict:t.maxTokens||1024,temperature:t.temperature??.1}};t.systemPrompt&&(a.system=t.systemPrompt),t.imageBase64&&(a.images=[t.imageBase64]);const n=await fetch(`${this.ollamaUrl}/api/generate`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(a),signal:AbortSignal.timeout(6e4)});if(!n.ok)throw new Error(`Ollama HTTP ${n.status}`);return{text:(await n.json()).response||"",model:`ollama/${o}`,endpointUsed:"ollama",latencyMs:Date.now()-s,cached:!1}}static async callLMStudio(t){var b,d,p;const s=Date.now(),o=[];t.systemPrompt&&o.push({role:"system",content:t.systemPrompt});const a=t.imageBase64?[{type:"text",text:t.prompt},{type:"image_url",image_url:{url:`data:image/jpeg;base64,${t.imageBase64}`}}]:t.prompt;o.push({role:"user",content:a});const n=await fetch(`${this.lmStudioUrl}/v1/chat/completions`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:o,max_tokens:t.maxTokens||1024,temperature:t.temperature??.1,stream:!1}),signal:AbortSignal.timeout(6e4)});if(!n.ok)throw new Error(`LM Studio HTTP ${n.status}`);const i=await n.json();return{text:((p=(d=(b=i.choices)==null?void 0:b[0])==null?void 0:d.message)==null?void 0:p.content)||"",model:i.model||"lm-studio",endpointUsed:"lm_studio",latencyMs:Date.now()-s,cached:!1}}static async callBackend(t){const s=Date.now(),o=await fetch(`${this.backendUrl}/api/v1/ai/complete`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt:t.prompt,systemPrompt:t.systemPrompt,model:t.model,maxTokens:t.maxTokens,temperature:t.temperature,imageBase64:t.imageBase64,context:t.context}),signal:AbortSignal.timeout(45e3)});if(!o.ok)throw new Error(`Backend API HTTP ${o.status}`);const a=await o.json();return{text:a.text||a.result||"",model:a.model||"backend",endpointUsed:"backend",latencyMs:Date.now()-s,cached:!1}}static getLastProbeResults(){return Array.from(this.lastProbeResults.values())}static getBestAvailableEndpoint(){var o;return((o=this.getLastProbeResults().filter(a=>a.available).sort((a,n)=>(a.latencyMs||9999)-(n.latencyMs||9999))[0])==null?void 0:o.type)||"none"}static clearCache(){Object.keys(sessionStorage).filter(t=>t.startsWith(H)).forEach(t=>sessionStorage.removeItem(t)),console.log("[LocalAIOfflineProxy] AI response cache cleared.")}};j.ollamaUrl=Ee,j.lmStudioUrl=Ue,j.backendUrl=Be,j.defaultModel=Oe,j.lastProbeResults=new Map,j.probeInProgress=!1;let I=j;const c=r=>`₹${Math.abs(r).toLocaleString("en-IN",{minimumFractionDigits:2})}`,se=r=>`${r.toFixed(2)}L`,K=class K{static buildThermalHTML(t,s=80){const o=s,a=s===58,n=t.nozzles.map(d=>{const p=Math.max(0,d.closing-d.opening-d.testing),S=p*d.rate;return`
        <tr>
          <td>${d.label} (${d.fuel})</td>
          <td class="r">${se(p)}</td>
          <td class="r">${c(S)}</td>
        </tr>`}).join(""),i=t.nozzles.reduce((d,p)=>{const S=Math.max(0,p.closing-p.opening-p.testing);return d+S*p.rate},0),b=t.printedAt||new Date().toLocaleString("en-IN");return`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Shift Closing Receipt</title>
<style>
  @page { size: ${o}mm auto; margin: 2mm 2mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: ${a?"9px":"11px"};
    width: ${o-4}mm;
    color: #000;
  }
  .center { text-align: center; }
  .bold   { font-weight: bold; }
  .hr     { border-top: 1px dashed #000; margin: 3px 0; }
  .row    { display: flex; justify-content: space-between; padding: 1px 0; }
  .r      { text-align: right; }
  table   { width: 100%; border-collapse: collapse; font-size: ${a?"8px":"10px"}; }
  th      { border-bottom: 1px solid #000; padding: 2px 3px; text-align: left; font-size: ${a?"8px":"9px"}; }
  td      { padding: 2px 3px; }
  .status-locked { color: #000; font-weight: bold; }
  .status-draft  { text-decoration: underline; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>

<div class="center bold">${t.stationName||this.STATION_NAME}</div>
<div class="center">Shift Closing Receipt</div>
<div class="center">${t.shiftDate} — ${t.shiftLabel}</div>
<div class="hr"></div>

<div class="row"><span>Operator</span><span>${t.operatorName}</span></div>
<div class="row"><span>Status</span>
  <span class="${t.isLocked?"status-locked":"status-draft"}">
    ${t.isLocked?"✓ LOCKED":"⚠ DRAFT"}
  </span>
</div>
<div class="hr"></div>

<div class="bold" style="margin:2px 0">Nozzle Register</div>
<table>
  <thead>
    <tr>
      <th>Nozzle</th>
      <th class="r">Net (L)</th>
      <th class="r">Value</th>
    </tr>
  </thead>
  <tbody>${n}</tbody>
  <tfoot>
    <tr>
      <td class="bold">TOTAL</td>
      <td class="r bold">${se(t.nozzles.reduce((d,p)=>d+Math.max(0,p.closing-p.opening-p.testing),0))}</td>
      <td class="r bold">${c(i)}</td>
    </tr>
  </tfoot>
</table>
<div class="hr"></div>

<div class="bold" style="margin:2px 0">Cash Summary</div>
<div class="row"><span>Opening Float</span>  <span>${c(t.openingCash)}</span></div>
<div class="row"><span>UPI Collections</span><span>${c(t.upiCollected)}</span></div>
<div class="row"><span>Card Collections</span><span>${c(t.cardCollected)}</span></div>
<div class="row"><span>Expenses Paid</span>  <span>- ${c(t.expenses)}</span></div>
<div class="row"><span>Credit Extended</span><span>- ${c(t.creditSales)}</span></div>
<div class="row"><span>Credit Recovered</span><span>${c(t.creditRecovery)}</span></div>
<div class="hr"></div>
<div class="row bold"><span>Till Counted</span><span>${c(t.totalCashCounted)}</span></div>
<div class="row ${Math.abs(t.cashShortage)>0?"bold":""}">
  <span>${t.cashShortage>0?"SHORT ⚠":t.cashShortage<0?"OVER ⚠":"BALANCED ✓"}</span>
  <span>${t.cashShortage!==0?(t.cashShortage>0?"-":"+")+c(Math.abs(t.cashShortage)):"₹0.00"}</span>
</div>
<div class="hr"></div>

${t.supervisorName?`<div class="row"><span>Supervisor</span><span>${t.supervisorName}</span></div>`:""}
<div class="center" style="margin-top:4px; font-size:8px;">Printed: ${b}</div>
<div class="center" style="font-size:8px;">PumpAI ERP — pumpai.in</div>
<br/>
</body>
</html>`}static buildA4ReportHTML(t){const s=t.nozzles.reduce((n,i)=>{const b=Math.max(0,i.closing-i.opening-i.testing);return n+b*i.rate},0),o=t.nozzles.map(n=>{const i=Math.max(0,n.closing-n.opening-n.testing);return`<tr>
        <td>${n.label}</td>
        <td>${n.fuel}</td>
        <td>${n.opening.toFixed(2)}</td>
        <td>${n.closing.toFixed(2)}</td>
        <td>${n.testing.toFixed(2)}</td>
        <td>${i.toFixed(2)}</td>
        <td>${c(n.rate)}</td>
        <td>${c(i*n.rate)}</td>
      </tr>`}).join(""),a=t.printedAt||new Date().toLocaleString("en-IN");return`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>${t.stationName} — Shift Closing — ${t.shiftDate}</title>
<style>
  @page { size: A4; margin: 20mm 15mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #111; }
  h1 { font-size: 18px; font-weight: bold; }
  h2 { font-size: 14px; font-weight: bold; margin: 14px 0 6px; border-bottom: 1px solid #333; padding-bottom: 3px; }
  .header { text-align: center; border-bottom: 2px solid #111; padding-bottom: 8px; margin-bottom: 16px; }
  .meta { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 11px; }
  .meta span { color: #555; }
  .badge-locked { color: #16a34a; font-weight: bold; }
  .badge-draft  { color: #dc2626; font-weight: bold; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
  .card { border: 1px solid #ddd; border-radius: 4px; padding: 10px 12px; }
  .card-title { font-size: 10px; text-transform: uppercase; color: #666; margin-bottom: 4px; }
  .card-value { font-size: 15px; font-weight: bold; }
  .card-value.neg { color: #dc2626; }
  .card-value.pos { color: #16a34a; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 16px; }
  th { background: #111; color: #fff; padding: 5px 8px; text-align: left; }
  td { padding: 4px 8px; border-bottom: 1px solid #eee; }
  tr:nth-child(even) td { background: #f9f9f9; }
  .totals-row td { font-weight: bold; border-top: 2px solid #111; background: #f3f4f6 !important; }
  .row { display: flex; justify-content: space-between; padding: 3px 0; }
  .label { color: #555; }
  .value { font-weight: bold; }
  .footer { margin-top: 20px; font-size: 9px; color: #888; text-align: center; border-top: 1px dashed #bbb; padding-top: 6px; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>

<div class="header">
  <h1>${t.stationName||this.STATION_NAME}</h1>
  <p>${t.shiftLabel} — ${t.shiftDate}</p>
  <p>Operator: <strong>${t.operatorName}</strong> &nbsp;|&nbsp;
     Status: <span class="${t.isLocked?"badge-locked":"badge-draft"}">${t.isLocked?"✓ LOCKED & IMMUTABLE":"⚠ DRAFT — NOT LOCKED"}</span>
  </p>
</div>

<div class="meta">
  <span>Report generated: ${a}</span>
  ${t.supervisorName?`<span>Authorized by: <strong>${t.supervisorName}</strong></span>`:""}
</div>

<div class="grid">
  <div class="card"><div class="card-title">Opening Float</div><div class="card-value">${c(t.openingCash)}</div></div>
  <div class="card"><div class="card-title">Fuel Revenue (Computed)</div><div class="card-value">${c(s)}</div></div>
  <div class="card"><div class="card-title">Digital Collections</div><div class="card-value">${c(t.upiCollected+t.cardCollected)}</div></div>
  <div class="card"><div class="card-title">Cash Till Counted</div><div class="card-value">${c(t.totalCashCounted)}</div></div>
  <div class="card"><div class="card-title">Expenses</div><div class="card-value neg">- ${c(t.expenses)}</div></div>
  <div class="card">
    <div class="card-title">Cash ${t.cashShortage>0?"Shortage":t.cashShortage<0?"Overage":"Balance"}</div>
    <div class="card-value ${t.cashShortage!==0?"neg":"pos"}">${t.cashShortage===0?"✓ BALANCED":(t.cashShortage>0?"- ":"+ ")+c(Math.abs(t.cashShortage))}</div>
  </div>
</div>

<h2>Nozzle Register</h2>
<table>
  <thead>
    <tr><th>Nozzle</th><th>Fuel</th><th>Opening</th><th>Closing</th><th>Testing</th><th>Net (L)</th><th>Rate/L</th><th>Revenue</th></tr>
  </thead>
  <tbody>${o}</tbody>
  <tfoot>
    <tr class="totals-row">
      <td colspan="5">TOTALS</td>
      <td>${t.nozzles.reduce((n,i)=>n+Math.max(0,i.closing-i.opening-i.testing),0).toFixed(2)}L</td>
      <td>—</td>
      <td>${c(s)}</td>
    </tr>
  </tfoot>
</table>

<h2>Payment Breakdown</h2>
<div class="row"><span class="label">UPI Collected</span>      <span class="value">${c(t.upiCollected)}</span></div>
<div class="row"><span class="label">Card Settled</span>       <span class="value">${c(t.cardCollected)}</span></div>
<div class="row"><span class="label">Credit Extended (Udhari)</span><span class="value">- ${c(t.creditSales)}</span></div>
<div class="row"><span class="label">Udhari Recovered</span>   <span class="value">${c(t.creditRecovery)}</span></div>
<div class="row"><span class="label">Expenses Paid</span>      <span class="value">- ${c(t.expenses)}</span></div>

<div class="footer">
  This is a system-generated document from PumpAI ERP. Verify with physical records before filing.
  &nbsp;|&nbsp; PumpAI v1.0 &nbsp;|&nbsp; ${a}
</div>

</body>
</html>`}static printThermal(t,s={paperWidth:80,silent:!0}){const o=s.paperWidth==="A4"?80:s.paperWidth,a=this.buildThermalHTML(t,o);u.print(a,{silent:s.silent,thermalMode:!0,thermalWidth:o,deviceName:s.deviceName})}static printA4(t,s={paperWidth:"A4",silent:!1}){const o=this.buildA4ReportHTML(t);u.print(o,{silent:s.silent,thermalMode:!1,deviceName:s.deviceName})}static async exportA4PDF(t){const s=this.buildA4ReportHTML(t),o=`shift_closing_${t.shiftDate}_${t.shiftLabel.replace(/\s+/g,"_")}.pdf`;return(await u.exportPDF(s,o)).success}};K.STATION_NAME="POTALIYA PETROLEUM";let A=K;const He=r=>r.toLocaleString("en-IN");function T({ok:r,label:t}){return e.jsxs("span",{className:`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium
      ${r?"bg-emerald-500/15 text-emerald-400 border border-emerald-500/30":"bg-red-500/15 text-red-400 border border-red-500/30"}`,children:[r?e.jsx(F,{className:"w-3 h-3"}):e.jsx(_,{className:"w-3 h-3"}),t]})}function h({icon:r,label:t,value:s,sub:o,accent:a="blue"}){const n={blue:"from-blue-500/20 to-blue-600/5 border-blue-500/30 text-blue-400",green:"from-emerald-500/20 to-emerald-600/5 border-emerald-500/30 text-emerald-400",amber:"from-amber-500/20 to-amber-600/5 border-amber-500/30 text-amber-400",purple:"from-purple-500/20 to-purple-600/5 border-purple-500/30 text-purple-400",slate:"from-slate-500/20 to-slate-600/5 border-slate-500/30 text-slate-400"};return e.jsxs("div",{className:`relative bg-gradient-to-br ${n[a]} border rounded-xl p-4 overflow-hidden`,children:[e.jsxs("div",{className:"flex items-start justify-between mb-2",children:[e.jsx(r,{className:`w-4 h-4 ${n[a].split(" ").pop()}`}),e.jsx("span",{className:"text-[10px] text-slate-500 font-mono uppercase tracking-wider",children:t})]}),e.jsx("div",{className:"text-xl font-bold text-slate-100 leading-tight",children:s}),o&&e.jsx("div",{className:"text-xs text-slate-500 mt-0.5",children:o})]})}function N({icon:r,title:t,badge:s}){return e.jsxs("div",{className:"flex items-center gap-3 mb-4",children:[e.jsx("div",{className:"p-2 rounded-lg bg-slate-800/60 border border-slate-700/50",children:e.jsx(r,{className:"w-4 h-4 text-blue-400"})}),e.jsx("h2",{className:"text-sm font-semibold text-slate-200 uppercase tracking-widest",children:t}),s&&e.jsx("span",{className:"text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 font-mono",children:s})]})}function $(){return e.jsx("div",{className:"border-t border-slate-800/60 my-6"})}const O={stationName:"DEMO PETROL PUMP",shiftLabel:"Morning Shift",shiftDate:new Date().toLocaleDateString("en-IN"),operatorName:"Test Operator",openingCash:5e3,expenses:350,upiCollected:12400,cardCollected:3200,creditSales:1500,creditRecovery:800,totalCashCounted:18650,cashShortage:0,isLocked:!1,supervisorName:"Manager",nozzles:[{label:"N1",fuel:"HSD",opening:1200.5,closing:1350.8,testing:2.5,rate:92.3},{label:"N2",fuel:"MS",opening:850.2,closing:975.6,testing:1,rate:104.5}]};function Xe(){var Y,Q,X;const[r,t]=m.useState(null),[s,o]=m.useState(null),[a,n]=m.useState(null),[i,b]=m.useState([]),[d,p]=m.useState([]),[S,V]=m.useState(""),[ae,W]=m.useState(""),[J,le]=m.useState("startup"),[v,y]=m.useState(null),[D,G]=m.useState(null),[R,re]=m.useState(!1),x=u.isElectron(),g=(l,f=!0)=>{G({msg:l,ok:f}),setTimeout(()=>G(null),3500)},M=m.useCallback(async()=>{try{const[l,f,k]=await Promise.all([u.getHardwareStatus(),u.getSystemInfo(),be()]);t(l),o(f),n(k),b(C.getRegistry().slice(0,20))}catch(l){console.warn("[DesktopControlCenter] Load error:",l)}},[]),P=m.useCallback(async()=>{if(!x)return;const[l,f]=await Promise.all([u.getCrashLog(),u.getStartupLog()]);V(l),W(f)},[x]),E=m.useCallback(async()=>{const l=await I.probeAllEndpoints();p(l)},[]);m.useEffect(()=>{M(),E(),P();const l=setInterval(M,3e4);return()=>clearInterval(l)},[M,E,P]);const oe=async()=>{y("backup");const l=await C.runManualBackup();y(null),l?(g("Backup exported successfully"),b(C.getRegistry().slice(0,20))):g("Backup cancelled or failed",!1)},ne=async()=>{y("autobackup");const l=await C.runAutoBackup();y(null),l?(g("Auto-backup completed"),b(C.getRegistry().slice(0,20))):g("Auto-backup failed",!1)},ie=async()=>{y("restore");const l=await C.restoreFromFile();y(null),l.success?g(`Restored ${He(l.recordsLoaded)} records`):g(l.error||"Restore failed",!1)},ce=l=>{if(l==="a4")A.printA4(O,{paperWidth:"A4",silent:!1});else{const f=l==="thermal58"?58:80;A.printThermal(O,{paperWidth:f,silent:!1})}g(`Print job sent (${l==="a4"?"A4":l==="thermal58"?"58mm":"80mm"})`)},de=async()=>{y("pdf");const l=await A.exportA4PDF(O);y(null),g(l?"PDF exported":"PDF export cancelled",l)},pe=async()=>{window.confirm("Restart PumpAI desktop now?")&&await u.relaunch()},me=()=>{u.checkForUpdates(),g("Checking for updates…")},ue=async()=>{await u.clearLogs(),V(""),W(""),g("Logs cleared")},xe=async()=>{s!=null&&s.dataDir&&await u.openPath(s.dataDir)},he=(r==null?void 0:r.uptime)!=null?`${Math.floor(r.uptime/3600)}h ${Math.floor(r.uptime%3600/60)}m`:"—";return e.jsxs("div",{className:"min-h-screen bg-[#07090f] text-slate-200 p-6 pb-20 max-w-5xl mx-auto space-y-8",children:[D&&e.jsxs("div",{className:`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border shadow-2xl text-sm font-medium
          transition-all duration-300 animate-fade-in
          ${D.ok?"bg-emerald-900/90 border-emerald-500/40 text-emerald-200":"bg-red-900/90 border-red-500/40 text-red-200"}`,children:[D.ok?e.jsx(F,{className:"w-4 h-4"}):e.jsx(_,{className:"w-4 h-4"}),D.msg]}),e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsxs("div",{children:[e.jsx("h1",{className:"text-2xl font-bold bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent",children:"Desktop Control Center"}),e.jsx("p",{className:"text-xs text-slate-500 mt-1",children:"Offline resilience, backup safety, and hardware management"})]}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(T,{ok:x,label:x?"Electron Desktop":"Browser Mode"}),(r==null?void 0:r.backendRunning)!=null&&e.jsx(T,{ok:r.backendRunning,label:r.backendRunning?"Backend Running":"Backend Offline"})]})]}),e.jsxs("div",{children:[e.jsx(N,{icon:ge,title:"System Vitals",badge:s==null?void 0:s.version}),e.jsxs("div",{className:"grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3",children:[e.jsx(h,{icon:fe,label:"Platform",value:(r==null?void 0:r.platform)||"—",sub:r==null?void 0:r.arch,accent:"blue"}),e.jsx(h,{icon:Z,label:"CPU",value:r?`${r.cpuCores}c`:"—",sub:(Y=r==null?void 0:r.cpuModel)==null?void 0:Y.slice(0,28),accent:"purple"}),e.jsx(h,{icon:L,label:"Memory",value:r?`${r.usedMemPct}%`:"—",sub:`${r==null?void 0:r.freeMemGB}GB free`,accent:r&&r.usedMemPct>80?"amber":"green"}),e.jsx(h,{icon:U,label:"Disk Free",value:(r==null?void 0:r.diskFreeGB)!=null?`${r.diskFreeGB}MB`:"—",sub:"userData partition",accent:"slate"}),e.jsx(h,{icon:ve,label:"Uptime",value:he,sub:"since last restart",accent:"blue"}),e.jsx(h,{icon:ye,label:"Node.js",value:(s==null?void 0:s.nodeVersion)||"—",sub:`Electron ${(s==null?void 0:s.electronVersion)||"—"}`,accent:"slate"}),e.jsx(h,{icon:Ce,label:"Hostname",value:((Q=s==null?void 0:s.hostname)==null?void 0:Q.slice(0,14))||"—",sub:"local machine",accent:"purple"}),e.jsx(h,{icon:L,label:"Data Directory",value:"userData",sub:"click to open",accent:"blue"})]}),x&&(s==null?void 0:s.dataDir)&&e.jsxs("button",{onClick:xe,className:"mt-3 flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 transition-colors border border-blue-500/30 px-3 py-1.5 rounded-lg bg-blue-500/5 hover:bg-blue-500/10",children:[e.jsx(Re,{className:"w-3.5 h-3.5"}),"Open data directory: ",e.jsx("span",{className:"font-mono truncate max-w-xs",children:s.dataDir})]})]}),e.jsx($,{}),e.jsxs("div",{children:[e.jsx(N,{icon:L,title:"Local Database",badge:"IndexedDB"}),e.jsxs("div",{className:"grid grid-cols-2 sm:grid-cols-4 gap-3",children:[e.jsx(h,{icon:Z,label:"Shifts",value:(a==null?void 0:a.shiftCount)??"—",sub:"stored locally",accent:"green"}),e.jsx(h,{icon:L,label:"Ledger Entries",value:(a==null?void 0:a.ledgerCount)??"—",sub:"financial records",accent:"blue"}),e.jsx(h,{icon:w,label:"Pending Queue",value:(a==null?void 0:a.queueCount)??"—",sub:"awaiting sync",accent:(a==null?void 0:a.queueCount)>0?"amber":"green"}),e.jsx(h,{icon:F,label:"DB Health",value:a!=null&&a.healthy?"Healthy":"Error",sub:a?`${a.storeNames.length} stores`:"",accent:a!=null&&a.healthy?"green":"amber"})]}),((X=a==null?void 0:a.storeNames)==null?void 0:X.length)>0&&e.jsx("div",{className:"mt-3 flex flex-wrap gap-2",children:a.storeNames.map(l=>e.jsx("span",{className:"text-[10px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 font-mono",children:l},l))})]}),e.jsx($,{}),e.jsxs("div",{children:[e.jsx(N,{icon:U,title:"Backup Manager"}),e.jsxs("div",{className:"grid sm:grid-cols-2 gap-4 mb-4",children:[e.jsxs("div",{className:"bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3",children:[e.jsx("p",{className:"text-xs text-slate-400 font-medium uppercase tracking-wider",children:"Export"}),e.jsxs("div",{className:"flex flex-col gap-2",children:[e.jsxs("button",{onClick:ne,disabled:v==="autobackup",className:"flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-300 hover:bg-blue-500/20 transition disabled:opacity-50",children:[v==="autobackup"?e.jsx(w,{className:"w-4 h-4 animate-spin"}):e.jsx(we,{className:"w-4 h-4"}),"Run Auto-Backup Now"]}),e.jsxs("button",{onClick:oe,disabled:v==="backup",className:"flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 transition disabled:opacity-50",children:[v==="backup"?e.jsx(w,{className:"w-4 h-4 animate-spin"}):e.jsx(q,{className:"w-4 h-4"}),x?"Export to File (Dialog)":"Download Backup File"]})]})]}),e.jsxs("div",{className:"bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3",children:[e.jsx("p",{className:"text-xs text-slate-400 font-medium uppercase tracking-wider",children:"Restore"}),e.jsxs("button",{onClick:ie,disabled:v==="restore",className:"flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 transition disabled:opacity-50 w-full",children:[v==="restore"?e.jsx(w,{className:"w-4 h-4 animate-spin"}):e.jsx($e,{className:"w-4 h-4"}),x?"Restore from File (Dialog)":"Restore from File"]}),e.jsx("p",{className:"text-[11px] text-slate-500",children:"Restores shifts, ledger, and snapshots from a .pabk backup file. Pending queue will NOT be restored to avoid double-posting."})]})]}),i.length>0&&e.jsxs("div",{className:"bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden",children:[e.jsxs("div",{className:"px-4 py-2.5 border-b border-slate-800 text-xs text-slate-400 font-medium uppercase tracking-wider",children:["Recent Backups (",i.length,")"]}),e.jsx("div",{className:"divide-y divide-slate-800/60 max-h-48 overflow-y-auto",children:i.map(l=>e.jsxs("div",{className:"flex items-center justify-between px-4 py-2 text-xs hover:bg-slate-800/30 transition",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(U,{className:`w-3.5 h-3.5 ${l.type==="auto"?"text-blue-400":"text-emerald-400"}`}),e.jsx("span",{className:"text-slate-300 font-mono",children:l.backupId}),e.jsx("span",{className:"text-slate-500",children:l.type})]}),e.jsxs("div",{className:"flex items-center gap-3 text-slate-500",children:[e.jsxs("span",{children:[Math.round(l.sizeBytes/1024),"KB"]}),e.jsx("span",{children:new Date(l.timestamp).toLocaleString("en-IN",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}),e.jsx(T,{ok:l.source==="electron",label:l.source})]})]},l.backupId))})]}),i.length===0&&e.jsx("div",{className:"text-center py-6 text-slate-500 text-sm border border-slate-800 rounded-xl",children:"No backup records yet. Run an auto-backup or manual export to start."})]}),e.jsx($,{}),e.jsxs("div",{children:[e.jsx(N,{icon:ee,title:"Printer Control"}),e.jsxs("div",{className:"grid sm:grid-cols-2 gap-4",children:[e.jsxs("div",{className:"bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3",children:[e.jsx("p",{className:"text-xs text-slate-400 font-medium uppercase tracking-wider",children:"Test Print"}),e.jsx("div",{className:"flex flex-col gap-2",children:[{label:"80mm Thermal (Standard)",mode:"thermal80",color:"blue"},{label:"58mm Thermal (Compact)",mode:"thermal58",color:"purple"},{label:"A4 Accountant Report",mode:"a4",color:"slate"}].map(({label:l,mode:f,color:k})=>e.jsxs("button",{onClick:()=>ce(f),className:`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition text-left
                    bg-${k}-500/10 border-${k}-500/30 text-${k}-300 hover:bg-${k}-500/20`,children:[e.jsx(ee,{className:"w-4 h-4"}),l]},f))})]}),e.jsxs("div",{className:"bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3",children:[e.jsx("p",{className:"text-xs text-slate-400 font-medium uppercase tracking-wider",children:"PDF Export"}),e.jsxs("button",{onClick:de,disabled:v==="pdf",className:"flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500/20 transition disabled:opacity-50 w-full",children:[v==="pdf"?e.jsx(w,{className:"w-4 h-4 animate-spin"}):e.jsx(q,{className:"w-4 h-4"}),"Export Shift Report as PDF"]}),e.jsx("p",{className:"text-[11px] text-slate-500",children:x?"Opens a save-file dialog to export an A4 PDF closing sheet.":'Triggers browser print dialog. Use "Save as PDF" option.'})]})]})]}),e.jsx($,{}),e.jsxs("div",{children:[e.jsx(N,{icon:Le,title:"AI Endpoint Status"}),e.jsxs("div",{className:"grid sm:grid-cols-3 gap-4 mb-4",children:[d.length===0&&e.jsx("div",{className:"col-span-3 text-center py-6 text-slate-500 text-sm border border-slate-800 rounded-xl",children:"Probing AI endpoints…"}),d.map(l=>e.jsxs("div",{className:`border rounded-xl p-4 space-y-2
              ${l.available?"border-emerald-500/30 bg-emerald-500/5":"border-slate-700 bg-slate-900/40"}`,children:[e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsx("span",{className:"text-sm font-medium text-slate-200 capitalize",children:l.type.replace("_"," ")}),e.jsx(T,{ok:l.available,label:l.available?"Online":"Offline"})]}),e.jsx("p",{className:"text-[10px] font-mono text-slate-500 truncate",children:l.url}),l.modelName&&e.jsxs("p",{className:"text-[11px] text-slate-400",children:["Model: ",l.modelName]}),l.latencyMs&&e.jsxs("p",{className:"text-[11px] text-emerald-400",children:[l.latencyMs,"ms latency"]})]},l.type))]}),e.jsxs("button",{onClick:E,className:"flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 border border-blue-500/30 px-3 py-1.5 rounded-lg bg-blue-500/5 hover:bg-blue-500/10 transition",children:[e.jsx(w,{className:"w-3.5 h-3.5"}),"Re-probe all endpoints"]})]}),e.jsx($,{}),x&&e.jsxs("div",{children:[e.jsxs("div",{className:"flex items-center justify-between mb-4",children:[e.jsx(N,{icon:Se,title:"System Logs"}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsxs("button",{onClick:()=>re(l=>!l),className:"text-xs text-slate-400 flex items-center gap-1 hover:text-slate-200 transition",children:[R?e.jsx(Ae,{className:"w-3 h-3"}):e.jsx(De,{className:"w-3 h-3"}),R?"Collapse":"Expand"]}),e.jsxs("button",{onClick:P,className:"text-xs text-blue-400 flex items-center gap-1 hover:text-blue-300 transition",children:[e.jsx(w,{className:"w-3 h-3"}),"Refresh"]}),e.jsxs("button",{onClick:ue,className:"text-xs text-red-400 flex items-center gap-1 hover:text-red-300 transition",children:[e.jsx(je,{className:"w-3 h-3"}),"Clear"]})]})]}),e.jsx("div",{className:"flex gap-2 mb-3",children:["startup","crash"].map(l=>e.jsxs("button",{onClick:()=>le(l),className:`text-xs px-3 py-1.5 rounded-lg border transition capitalize
                  ${J===l?"bg-blue-500/20 border-blue-500/40 text-blue-300":"border-slate-700 text-slate-400 hover:text-slate-200"}`,children:[l," log"]},l))}),e.jsx("pre",{className:`bg-[#040608] border border-slate-800 rounded-xl p-4 text-[10px] font-mono text-slate-400 overflow-auto leading-relaxed whitespace-pre-wrap transition-all
              ${R?"max-h-[600px]":"max-h-48"}`,children:(J==="startup"?ae:S)||"(empty)"})]}),x&&e.jsx($,{}),e.jsxs("div",{children:[e.jsx(N,{icon:te,title:"App Lifecycle"}),e.jsxs("div",{className:"flex flex-wrap gap-3",children:[e.jsxs("button",{onClick:me,className:"flex items-center gap-2 px-4 py-2 text-sm rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 transition",children:[e.jsx(Ne,{className:"w-4 h-4"}),"Check for Updates"]}),x&&e.jsxs(e.Fragment,{children:[e.jsxs("button",{onClick:pe,className:"flex items-center gap-2 px-4 py-2 text-sm rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 transition",children:[e.jsx(ke,{className:"w-4 h-4"}),"Relaunch App"]}),e.jsxs("button",{onClick:async()=>{window.confirm("Close PumpAI?")&&await u.quit()},className:"flex items-center gap-2 px-4 py-2 text-sm rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20 transition",children:[e.jsx(te,{className:"w-4 h-4"}),"Quit Application"]})]}),e.jsxs("button",{onClick:M,className:"flex items-center gap-2 px-4 py-2 text-sm rounded-xl border border-slate-700 bg-slate-800/40 text-slate-300 hover:bg-slate-800 transition",children:[e.jsx(w,{className:"w-4 h-4"}),"Refresh Panel"]})]}),!x&&e.jsxs("div",{className:"mt-4 flex items-start gap-3 p-4 bg-amber-900/20 border border-amber-500/30 rounded-xl",children:[e.jsx(_,{className:"w-4 h-4 text-amber-400 mt-0.5 shrink-0"}),e.jsxs("div",{className:"text-xs text-amber-200/80 space-y-1",children:[e.jsx("p",{className:"font-medium",children:"Running in browser mode"}),e.jsx("p",{children:"Some features (file system backup, native printing, app lifecycle, crash logs) require the Electron desktop app."}),e.jsxs("p",{children:["Run ",e.jsx("code",{className:"font-mono bg-amber-900/40 px-1 py-0.5 rounded",children:"npm run electron"})," to launch the desktop version."]})]})]})]})]})}export{Xe as default};
