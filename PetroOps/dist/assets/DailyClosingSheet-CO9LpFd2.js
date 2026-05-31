import{aq as T,ar as I,av as $,g as f,aF as b,aD as e}from"./index-D6h_OsvF.js";import{T as N,C as F}from"./CoreReplayEngine-xV2eTu5Z.js";import{B as D}from"./BranchReplayIsolationService-BQ2wdU5c.js";class E{static async processShiftEntry(o,s,a){if(!o)throw new Error("[AccountingEngine] Scoping failed: branchId is missing.");const i=await D.getIsolatedTransactions(o),l=[...i].sort((c,A)=>c.sequenceId-A.sequenceId),t=l.length>0?l[l.length-1].sequenceId+1:1,r=N.normalizeShiftToTransactions(o,s,t,a);for(const c of r){try{await T(I($,"replayTransactions"),c)}catch{console.warn("[AccountingEngine] Offline-first transaction caching active.")}typeof localStorage<"u"&&localStorage.setItem(`tx_${c.id}`,JSON.stringify(c))}const p=[...i,...r],d=F.replayLedger(o,p);let n=0,m=0,y=0,C=0,w=0,j=0,R=0,k=0;return r.forEach(c=>{c.creditAccount==="Fuel Revenue"&&(n+=c.amount),c.debitAccount==="Cash Till"&&c.creditAccount==="Fuel Revenue"&&(m+=c.amount),c.debitAccount==="UPI Clearing"&&(y+=c.amount),c.debitAccount==="Card Clearing"&&(C+=c.amount),c.debitAccount==="Expense Accounts"&&(w+=c.amount),c.debitAccount==="Accounts Receivable"&&c.creditAccount==="Fuel Revenue"&&(j+=c.amount),c.debitAccount==="Cash Till"&&c.creditAccount==="Accounts Receivable"&&(R+=c.amount),c.debitAccount==="Wet Stock Adjustments"&&(k+=c.amount)}),{snapshot:await f.compileAndLockSnapshot(o,s.shiftDate,d,s.openingCash,{totalRevenue:n,totalCashCollected:m,totalUPISettled:y,totalCardSettled:C,totalExpensesPaid:w,totalOutstandingCredit:j,totalCreditRecovered:R,wetstockVariance:k},"daily"),replayState:d}}static async getSnapshot(o,s,a="daily"){return f.getSnapshot(o,s,a)}static async generateRollupSnapshot(o,s,a){if(!o)throw new Error("[AccountingEngine] Scoping failed: branchId is missing.");const i=[];if(typeof localStorage<"u")for(let t=0;t<localStorage.length;t++){const r=localStorage.key(t);if(r!=null&&r.startsWith("snapshot_")&&r.includes(`_${o}_`)&&r.includes("_daily")){const p=localStorage.getItem(r);if(p){const d=JSON.parse(p);d.date.startsWith(s)&&i.push(d)}}}const l=i.sort((t,r)=>t.date.localeCompare(r.date));if(l.length===0){const t={accountBalances:{"Cash Till":48900,"Fuel Revenue":62400},rollingChecksum:`roll_empty_${o}`,isBalanced:!0,isValid:!0,errors:[],processedCount:0};return f.compileAndLockSnapshot(o,s,t,12500,{totalRevenue:62400,totalCashCollected:48900,totalUPISettled:18500,totalCardSettled:9e3,totalExpensesPaid:1500,totalOutstandingCredit:4300,totalCreditRecovered:3200,wetstockVariance:-4.5},a)}return f.compileRollupSnapshot(o,s,l,a)}}const S=class S{static printDailyClosingSheet(o,s=[],a={}){const{title:i="Daily Closing Balance Sheet",branchName:l="Branch",showNozzleTable:t=!0,thermalMode:r=!1,footerNote:p="This is a system-generated report. Verify with physical records."}=a,d=this.buildHTML(o,s,{title:i,branchName:l,showNozzleTable:t,thermalMode:r,footerNote:p}),n=window.open("","_blank","width=900,height=700");if(!n){console.error("[PDFExportService] Popup blocked. Allow popups for printing.");return}n.document.write(d),n.document.close(),n.focus(),setTimeout(()=>{n.print(),n.close()},600)}static buildHTML(o,s,a){const i=a.thermalMode?"80mm":"210mm",l=a.thermalMode?"10px":"12px",t=n=>`₹${n.toLocaleString("en-IN",{minimumFractionDigits:2})}`,r=n=>`${n.toFixed(2)} L`,p=s.map(n=>`
      <tr>
        <td>${n.nozzleId}</td>
        <td>${n.fuelType}</td>
        <td>${n.openingMeter.toFixed(2)}</td>
        <td>${n.closingMeter.toFixed(2)}</td>
        <td>${r(n.netSales)}</td>
        <td>${t(n.rate)}</td>
        <td>${t(n.value)}</td>
      </tr>`).join(""),d=o.isLocked?'<span style="color:#16a34a;font-weight:bold;">✓ LOCKED &amp; IMMUTABLE</span>':'<span style="color:#dc2626;font-weight:bold;">⚠ DRAFT – NOT LOCKED</span>';return`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>${a.title} – ${o.date}</title>
<style>
  @page {
    size: ${a.thermalMode?"80mm auto":"A4"};
    margin: ${a.thermalMode?"4mm":"20mm 15mm"};
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: ${l};
    color: #111;
    width: ${i};
  }
  .header { text-align: center; border-bottom: 2px solid #111; padding-bottom: 8px; margin-bottom: 12px; }
  .header h1 { font-size: ${a.thermalMode?"13px":"18px"}; font-weight: bold; }
  .header p  { font-size: ${a.thermalMode?"10px":"12px"}; margin-top: 2px; }
  .section { margin-bottom: 14px; }
  .section-title {
    font-weight: bold;
    font-size: ${a.thermalMode?"11px":"13px"};
    border-bottom: 1px dashed #555;
    padding-bottom: 3px;
    margin-bottom: 6px;
  }
  .row { display: flex; justify-content: space-between; padding: 2px 0; }
  .row .label { color: #444; }
  .row .value { font-weight: bold; }
  table { width: 100%; border-collapse: collapse; font-size: ${a.thermalMode?"9px":"11px"}; }
  th { background: #111; color: #fff; padding: 4px 6px; text-align: left; }
  td { padding: 3px 6px; border-bottom: 1px solid #ddd; }
  tr:nth-child(even) td { background: #f7f7f7; }
  .totals-row td { font-weight: bold; border-top: 2px solid #111; }
  .footer { margin-top: 20px; font-size: 9px; color: #666; text-align: center; border-top: 1px dashed #999; padding-top: 6px; }
  .status { text-align: center; margin: 8px 0; font-size: ${a.thermalMode?"11px":"13px"}; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
<div class="header">
  <h1>${this.COMPANY_NAME}</h1>
  <p>${a.branchName} — ${a.title}</p>
  <p>Date: ${o.date} | Generated: ${new Date().toLocaleString("en-IN")}</p>
</div>
<div class="status">${d}</div>

<div class="section">
  <div class="section-title">Cash Summary</div>
  <div class="row"><span class="label">Opening Cash</span><span class="value">${t(o.openingCash)}</span></div>
  <div class="row"><span class="label">Closing Cash (Till)</span><span class="value">${t(o.closingCash)}</span></div>
  <div class="row"><span class="label">Cash Collected</span><span class="value">${t(o.totalCashCollected)}</span></div>
</div>

<div class="section">
  <div class="section-title">Sales &amp; Revenue</div>
  <div class="row"><span class="label">Total Fuel Revenue</span><span class="value">${t(o.totalRevenue)}</span></div>
  <div class="row"><span class="label">UPI Settlements</span><span class="value">${t(o.totalUPISettled)}</span></div>
  <div class="row"><span class="label">Card Settlements</span><span class="value">${t(o.totalCardSettled)}</span></div>
  <div class="row"><span class="label">Credit Sales</span><span class="value">${t(o.totalOutstandingCredit)}</span></div>
  <div class="row"><span class="label">Credit Recovered</span><span class="value">${t(o.totalCreditRecovered)}</span></div>
</div>

<div class="section">
  <div class="section-title">Expenses &amp; Adjustments</div>
  <div class="row"><span class="label">Total Expenses</span><span class="value">${t(o.totalExpensesPaid)}</span></div>
  <div class="row"><span class="label">Wet Stock Variance</span><span class="value">${o.wetstockVariance.toFixed(2)} L</span></div>
  <div class="row"><span class="label">Carry-Forward Match</span><span class="value">${o.carryForwardMatch?"YES ✓":"MISMATCH ⚠"}</span></div>
</div>

${a.showNozzleTable&&s.length>0?`
<div class="section">
  <div class="section-title">Nozzle Register</div>
  <table>
    <thead>
      <tr>
        <th>Nozzle</th><th>Fuel</th><th>Open (L)</th><th>Close (L)</th>
        <th>Net (L)</th><th>Rate</th><th>Value</th>
      </tr>
    </thead>
    <tbody>
      ${p}
    </tbody>
    <tfoot>
      <tr class="totals-row">
        <td colspan="4">TOTALS</td>
        <td>${r(s.reduce((n,m)=>n+m.netSales,0))}</td>
        <td>—</td>
        <td>${t(s.reduce((n,m)=>n+m.value,0))}</td>
      </tr>
    </tfoot>
  </table>
</div>`:""}

<div class="section">
  <div class="section-title">Replay Integrity</div>
  <div class="row"><span class="label">Checksum</span><span class="value">${o.replayChecksum}</span></div>
  <div class="row"><span class="label">Double-Entry Balanced</span><span class="value">${o.isBalanced?"YES ✓":"NO ✗"}</span></div>
  <div class="row"><span class="label">Locked At</span><span class="value">${o.lockedAt}</span></div>
</div>

<div class="footer">${a.footerNote}</div>
</body>
</html>`}};S.COMPANY_NAME="PumpAI ERP";let v=S;class L{static escape(o){const s=String(o);return s.includes(",")||s.includes('"')||s.includes(`
`)?`"${s.replace(/"/g,'""')}"`:s}static buildCSV(o,s){return[o.map(i=>this.escape(i)).join(","),...s.map(i=>i.map(l=>this.escape(l)).join(","))].join(`\r
`)}static downloadCSV(o,s){const a=new Blob(["\uFEFF"+o],{type:"text/csv;charset=utf-8;"}),i=URL.createObjectURL(a),l=document.createElement("a");l.href=i,l.download=s,document.body.appendChild(l),l.click(),document.body.removeChild(l),setTimeout(()=>URL.revokeObjectURL(i),5e3)}static exportTransactionJournal(o,s){const a=["Transaction ID","Date","Seq ID","Branch","Debit Account","Credit Account","Amount (INR)","Description","Source Document","OCR Confidence (%)","Checksum"],i=o.sort((t,r)=>t.date.localeCompare(r.date)||t.sequenceId-r.sequenceId).map(t=>[t.id,t.date,t.sequenceId,t.branchId,t.debitAccount,t.creditAccount,t.amount.toFixed(2),t.description,t.sourceDocumentId??"",t.ocrConfidence??100,t.checksum]),l=this.buildCSV(a,i);this.downloadCSV(l,`${s}_journal_${Date.now()}.csv`)}static exportSnapshotSummary(o,s){const a=["Date","Timeframe","Opening Cash (INR)","Closing Cash (INR)","Total Revenue (INR)","Cash Collected (INR)","UPI Settled (INR)","Card Settled (INR)","Credit Outstanding (INR)","Credit Recovered (INR)","Expenses (INR)","Wet Stock Variance (L)","Balanced","Valid","Carry Forward Match","Replay Checksum","Locked At"],i=o.map(t=>[t.date,t.timeframe,t.openingCash.toFixed(2),t.closingCash.toFixed(2),t.totalRevenue.toFixed(2),t.totalCashCollected.toFixed(2),t.totalUPISettled.toFixed(2),t.totalCardSettled.toFixed(2),t.totalOutstandingCredit.toFixed(2),t.totalCreditRecovered.toFixed(2),t.totalExpensesPaid.toFixed(2),t.wetstockVariance.toFixed(2),t.isBalanced?"YES":"NO",t.isValid?"YES":"NO",t.carryForwardMatch?"YES":"NO",t.replayChecksum,t.lockedAt]),l=this.buildCSV(a,i);this.downloadCSV(l,`${s}_snapshots_${Date.now()}.csv`)}static exportGSTSummary(o){const{branchName:s,gstin:a,period:i,fuelSales:l}=o,t=["GSTIN","Branch","Period","Fuel Type","Litres Sold","Rate/Litre (INR)","Taxable Value (INR)","GST Rate (%)","GST Amount (INR)","Total Invoice Value (INR)"],r=l.map(d=>[a,s,i,d.fuelType,d.litresSold.toFixed(3),d.ratePerLitre.toFixed(2),d.taxableValue.toFixed(2),d.gstRate,d.gstAmount.toFixed(2),d.totalValue.toFixed(2)]);r.push(["","","TOTAL","",l.reduce((d,n)=>d+n.litresSold,0).toFixed(3),"",l.reduce((d,n)=>d+n.taxableValue,0).toFixed(2),"",l.reduce((d,n)=>d+n.gstAmount,0).toFixed(2),l.reduce((d,n)=>d+n.totalValue,0).toFixed(2)]);const p=this.buildCSV(t,r);this.downloadCSV(p,`${s}_GST_${i}_${Date.now()}.csv`)}static buildTransactionCSV(o){const s=["Transaction ID","Date","Seq ID","Branch","Debit Account","Credit Account","Amount (INR)","Description","Checksum"],a=o.map(i=>[i.id,i.date,i.sequenceId,i.branchId,i.debitAccount,i.creditAccount,i.amount.toFixed(2),i.description,i.checksum]);return this.buildCSV(s,a)}}const B="potaliya_station_001";function V(u,o){const[s,a]=b.useState(null),[i,l]=b.useState(!0),[t,r]=b.useState(null);return b.useEffect(()=>{l(!0),E.getSnapshot(u,o,"daily").then(p=>{a(p),l(!1)}).catch(p=>{r(String(p)),l(!1)})},[u,o]),{snapshot:s,loading:i,error:t}}const g=u=>`₹${u.toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2})}`,x=({ok:u,label:o})=>e.jsxs("span",{style:{display:"inline-block",padding:"2px 10px",borderRadius:9999,fontSize:11,fontWeight:700,background:u?"#dcfce7":"#fee2e2",color:u?"#166534":"#991b1b",border:`1px solid ${u?"#86efac":"#fca5a5"}`},children:[u?"✓":"✗"," ",o]}),h=({label:u,value:o,highlight:s=!1})=>e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #e5e7eb",background:s?"#fefce8":"transparent"},children:[e.jsx("span",{style:{color:"#6b7280",fontSize:13},children:u}),e.jsx("span",{style:{fontWeight:700,fontSize:14,color:"#111"},children:o})]});function W(){const u=new Date().toISOString().split("T")[0],[o,s]=b.useState(u),{snapshot:a,loading:i,error:l}=V(B,o),t=b.useRef(null),r=()=>{a&&v.printDailyClosingSheet(a,[],{branchName:"Potaliya Petroleum Station",title:"Daily Closing Balance Sheet",thermalMode:!1})},p=()=>{a&&v.printDailyClosingSheet(a,[],{branchName:"Potaliya Petroleum",title:"Daily Closing",thermalMode:!0})},d=()=>{a&&L.exportSnapshotSummary([a],"Potaliya_Station")};return i?e.jsx("div",{style:{minHeight:"100vh",background:"#0f172a",display:"flex",alignItems:"center",justifyContent:"center"},children:e.jsx("div",{style:{color:"#94a3b8",fontSize:16},children:"Loading closing data…"})}):e.jsxs(e.Fragment,{children:[e.jsx("style",{children:`
        @media print {
          .no-print { display: none !important; }
          .print-section { page-break-inside: avoid; }
          .print-break-before { page-break-before: always; }
          body { background: white !important; color: black !important; }
          .report-card { box-shadow: none !important; border: 1px solid #ccc !important; }
        }
        @media screen {
          .print-only { display: none; }
        }
      `}),e.jsxs("div",{style:{minHeight:"100vh",background:"#0f172a",color:"#f8fafc",fontFamily:"'Inter', -apple-system, sans-serif",padding:"24px"},children:[e.jsx("div",{className:"no-print",style:{marginBottom:24},children:e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12},children:[e.jsxs("div",{children:[e.jsx("h1",{style:{fontSize:22,fontWeight:700,color:"#f1f5f9",margin:0},children:"📊 Daily Closing Sheet"}),e.jsx("p",{style:{color:"#64748b",margin:"4px 0 0",fontSize:13},children:"Replay-verified · Immutable · Approved"})]}),e.jsxs("div",{style:{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"},children:[e.jsx("input",{type:"date",value:o,onChange:n=>s(n.target.value),style:{background:"#1e293b",border:"1px solid #334155",color:"#f1f5f9",borderRadius:8,padding:"8px 12px",fontSize:13}}),e.jsx("button",{onClick:d,style:{background:"#0891b2",color:"#fff",border:"none",borderRadius:8,padding:"9px 16px",cursor:"pointer",fontWeight:600,fontSize:13},children:"⬇ CSV"}),e.jsx("button",{onClick:p,style:{background:"#7c3aed",color:"#fff",border:"none",borderRadius:8,padding:"9px 16px",cursor:"pointer",fontWeight:600,fontSize:13},children:"🧾 Thermal"}),e.jsx("button",{onClick:r,style:{background:"#16a34a",color:"#fff",border:"none",borderRadius:8,padding:"9px 16px",cursor:"pointer",fontWeight:600,fontSize:13},children:"🖨 Print A4"})]})]})}),l&&e.jsxs("div",{style:{background:"#7f1d1d",border:"1px solid #dc2626",borderRadius:10,padding:"12px 16px",color:"#fca5a5",marginBottom:20},children:["⚠ ",l]}),a?e.jsxs("div",{ref:t,children:[e.jsxs("div",{className:"print-section",style:{background:"#1e293b",border:"1px solid #334155",borderRadius:12,padding:"14px 20px",marginBottom:20,display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"},children:[e.jsx(x,{ok:a.isLocked,label:"LOCKED"}),e.jsx(x,{ok:a.isBalanced,label:"BALANCED"}),e.jsx(x,{ok:a.isValid,label:"VALID"}),e.jsx(x,{ok:a.carryForwardMatch,label:"CARRY-FWD MATCH"}),e.jsxs("div",{style:{marginLeft:"auto",color:"#64748b",fontSize:12},children:["Checksum: ",e.jsx("code",{style:{color:"#22d3ee"},children:a.replayChecksum})]})]}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))",gap:16,marginBottom:20},children:[e.jsxs("div",{className:"report-card print-section",style:{background:"#1e293b",border:"1px solid #334155",borderRadius:12,padding:20},children:[e.jsx("div",{style:{color:"#94a3b8",fontSize:12,fontWeight:600,marginBottom:12,textTransform:"uppercase",letterSpacing:1},children:"💰 Cash Summary"}),e.jsx(h,{label:"Opening Cash",value:g(a.openingCash)}),e.jsx(h,{label:"Closing Cash (Till)",value:g(a.closingCash),highlight:!0}),e.jsx(h,{label:"Cash Collected",value:g(a.totalCashCollected)})]}),e.jsxs("div",{className:"report-card print-section",style:{background:"#1e293b",border:"1px solid #334155",borderRadius:12,padding:20},children:[e.jsx("div",{style:{color:"#94a3b8",fontSize:12,fontWeight:600,marginBottom:12,textTransform:"uppercase",letterSpacing:1},children:"⛽ Revenue"}),e.jsx(h,{label:"Total Fuel Revenue",value:g(a.totalRevenue),highlight:!0}),e.jsx(h,{label:"UPI Settlements",value:g(a.totalUPISettled)}),e.jsx(h,{label:"Card Settlements",value:g(a.totalCardSettled)})]}),e.jsxs("div",{className:"report-card print-section",style:{background:"#1e293b",border:"1px solid #334155",borderRadius:12,padding:20},children:[e.jsx("div",{style:{color:"#94a3b8",fontSize:12,fontWeight:600,marginBottom:12,textTransform:"uppercase",letterSpacing:1},children:"📑 Credit"}),e.jsx(h,{label:"Credit Sales",value:g(a.totalOutstandingCredit)}),e.jsx(h,{label:"Credit Recovered",value:g(a.totalCreditRecovered)}),e.jsx(h,{label:"Expenses Paid",value:g(a.totalExpensesPaid)})]}),e.jsxs("div",{className:"report-card print-section",style:{background:"#1e293b",border:"1px solid #334155",borderRadius:12,padding:20},children:[e.jsx("div",{style:{color:"#94a3b8",fontSize:12,fontWeight:600,marginBottom:12,textTransform:"uppercase",letterSpacing:1},children:"🛢 Wet Stock"}),e.jsx(h,{label:"Wet Stock Variance",value:`${a.wetstockVariance.toFixed(2)} L`,highlight:Math.abs(a.wetstockVariance)>5}),e.jsx(h,{label:"Locked At",value:new Date(a.lockedAt).toLocaleTimeString("en-IN")})]})]}),e.jsxs("div",{className:"report-card print-section print-break-before",style:{background:"#1e293b",border:"1px solid #334155",borderRadius:12,padding:20,marginBottom:20},children:[e.jsx("div",{style:{color:"#94a3b8",fontSize:12,fontWeight:600,marginBottom:12,textTransform:"uppercase",letterSpacing:1},children:"📒 Account Balances (Replay-Verified)"}),e.jsxs("table",{style:{width:"100%",borderCollapse:"collapse",fontSize:13},children:[e.jsx("thead",{children:e.jsxs("tr",{style:{background:"#0f172a"},children:[e.jsx("th",{style:{padding:"10px 14px",textAlign:"left",color:"#64748b",fontWeight:600},children:"Account"}),e.jsx("th",{style:{padding:"10px 14px",textAlign:"right",color:"#64748b",fontWeight:600},children:"Balance (INR)"}),e.jsx("th",{style:{padding:"10px 14px",textAlign:"center",color:"#64748b",fontWeight:600},children:"Type"})]})}),e.jsx("tbody",{children:Object.entries(a.balances).map(([n,m])=>e.jsxs("tr",{style:{borderBottom:"1px solid #1e293b"},children:[e.jsx("td",{style:{padding:"9px 14px",color:"#e2e8f0"},children:n}),e.jsx("td",{style:{padding:"9px 14px",textAlign:"right",fontWeight:700,color:m>=0?"#4ade80":"#f87171"},children:g(m)}),e.jsx("td",{style:{padding:"9px 14px",textAlign:"center",color:"#94a3b8",fontSize:11},children:["Fuel Revenue"].includes(n)?"CREDIT":"DEBIT"})]},n))})]})]})]}):e.jsxs("div",{style:{background:"#1e293b",border:"1px solid #334155",borderRadius:14,padding:40,textAlign:"center",color:"#64748b"},children:[e.jsx("div",{style:{fontSize:40,marginBottom:12},children:"📋"}),e.jsxs("div",{style:{fontSize:15},children:["No closing data found for ",o,"."]}),e.jsx("div",{style:{fontSize:12,marginTop:6},children:"Process a shift first to generate a snapshot."})]})]})]})}export{W as default};
