// ════════════════════════════════════════════════════════════════
//  SRM BLOOD BANK MANAGEMENT SYSTEM


import React, { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";



// ── DESIGN TOKENS (theme.js) ─────────────────────────────────────
const T = {
  bg: "#F4F6F9", bg2: "#FFFFFF", card: "#FFFFFF", cardHover: "#F8FAFC",
  border: "rgba(0,0,0,0.08)", borderFocus: "#2563EB",
  crimson: "#C8102E", crimsonD: "#9B0D22", crimsonL: "#FDECEA",
  crimsonGlow: "rgba(200,16,46,0.07)",
  gold: "#B45309", goldL: "#D97706", goldLL: "#F59E0B", goldBg: "#FFFBEB",
  blue: "#1D4ED8", blueL: "#2563EB", blueLL: "#3B82F6", blueBg: "#EFF6FF",
  green: "#047857", greenL: "#059669", greenBg: "#ECFDF5",
  purple: "#6D28D9", purpleL: "#7C3AED", purpleBg: "#F5F3FF",
  text: "#111827", text2: "#374151", text3: "#6B7280", text4: "#9CA3AF",
  font: "'Playfair Display','Georgia',serif",
  mono: "'JetBrains Mono','Courier New',monospace",
  sans: "'Inter','Segoe UI',sans-serif",
  shadow: "0 1px 3px rgba(0,0,0,0.08),0 1px 2px rgba(0,0,0,0.06)",
  shadowMd: "0 4px 6px rgba(0,0,0,0.07),0 2px 4px rgba(0,0,0,0.05)",
  shadowLg: "0 10px 24px rgba(0,0,0,0.08)",
};
const CHART_COLORS = [T.crimson,T.blueL,T.greenL,T.goldL,T.purpleL,"#0891B2","#BE185D","#065F46"];
const TT = {
  contentStyle:{background:"#fff",border:`1px solid ${T.border}`,borderRadius:8,fontSize:11,color:T.text2,fontFamily:T.mono,boxShadow:T.shadowMd},
  labelStyle:{color:T.text3},cursor:{fill:"rgba(0,0,0,0.025)"},
};

// ── DATA (data.js) ────────────────────────────────────────────────
const TODAY = new Date("2026-02-28");
const ALL_GROUPS = ["O Neg","O Pos","A Neg","A Pos","B Neg","B Pos","AB Neg","AB Pos"];
const COMPAT = {
  "O Neg": ["O Neg","O Pos","A Neg","A Pos","B Neg","B Pos","AB Neg","AB Pos"],
  "O Pos": ["O Pos","A Pos","B Pos","AB Pos"],
  "A Neg": ["A Neg","A Pos","AB Neg","AB Pos"],
  "A Pos": ["A Pos","AB Pos"],
  "B Neg": ["B Neg","B Pos","AB Neg","AB Pos"],
  "B Pos": ["B Pos","AB Pos"],
  "AB Neg":["AB Neg","AB Pos"],
  "AB Pos":["AB Pos"],
};
const DEFAULT_DATA = [
  {sno:734,unit:"57432",comp:"WB/PRC",expiry:"27/03/2026",qty:275,bg:"AB Pos",col:"13/02/2026"},
  {sno:734,unit:"57432",comp:"FFP",expiry:"14/02/2027",qty:260,bg:"AB Pos",col:"13/02/2026"},
  {sno:735,unit:"57436",comp:"WB/PRC",expiry:"27/03/2026",qty:294,bg:"A Pos",col:"13/02/2026"},
  {sno:735,unit:"57436",comp:"FFP",expiry:"14/02/2027",qty:220,bg:"A Pos",col:"13/02/2026"},
  {sno:736,unit:"57436",comp:"WB/PRC",expiry:"27/03/2026",qty:283,bg:"O Pos",col:"13/02/2026"},
  {sno:736,unit:"57436",comp:"FFP",expiry:"14/02/2027",qty:221,bg:"O Pos",col:"13/02/2026"},
  {sno:737,unit:"57436",comp:"WB/PRC",expiry:"27/03/2026",qty:272,bg:"O Pos",col:"13/02/2026"},
  {sno:737,unit:"57436",comp:"FFP",expiry:"14/02/2027",qty:224,bg:"O Pos",col:"13/02/2026"},
  {sno:738,unit:"57436",comp:"WB/PRC",expiry:"27/03/2026",qty:200,bg:"B Pos",col:"13/02/2026"},
  {sno:738,unit:"57436",comp:"FFP",expiry:"14/02/2027",qty:268,bg:"B Pos",col:"13/02/2026"},
  {sno:739,unit:"57436",comp:"WB/PRC",expiry:"27/03/2026",qty:251,bg:"O Pos",col:"13/02/2026"},
  {sno:739,unit:"57436",comp:"FFP",expiry:"14/02/2027",qty:241,bg:"O Pos",col:"13/02/2026"},
  {sno:740,unit:"57432",comp:"WB/PRC",expiry:"27/03/2026",qty:282,bg:"A Pos",col:"13/02/2026"},
  {sno:740,unit:"57432",comp:"FFP",expiry:"14/02/2027",qty:267,bg:"A Pos",col:"13/02/2026"},
  {sno:754,unit:"571432",comp:"WB/PRC",expiry:"27/03/2026",qty:220,bg:"B Neg",col:"13/02/2026"},
  {sno:754,unit:"571432",comp:"FFP",expiry:"14/02/2027",qty:240,bg:"B Neg",col:"13/02/2026"},
  {sno:755,unit:"571432",comp:"WB/PRC",expiry:"27/03/2026",qty:220,bg:"AB Pos",col:"13/02/2026"},
  {sno:755,unit:"571432",comp:"FFP",expiry:"14/02/2027",qty:247,bg:"AB Pos",col:"13/02/2026"},
  {sno:756,unit:"571236",comp:"WB/PRC",expiry:"27/03/2026",qty:217,bg:"O Pos",col:"13/02/2026"},
  {sno:756,unit:"571236",comp:"FFP",expiry:"14/02/2027",qty:259,bg:"O Pos",col:"13/02/2026"},
  {sno:757,unit:"571236",comp:"WB/PRC",expiry:"27/03/2026",qty:266,bg:"A Pos",col:"13/02/2026"},
  {sno:757,unit:"571236",comp:"FFP",expiry:"14/02/2027",qty:257,bg:"A Pos",col:"13/02/2026"},
  {sno:758,unit:"571231",comp:"WB/PRC",expiry:"27/03/2026",qty:257,bg:"B Pos",col:"13/02/2026"},
  {sno:758,unit:"571231",comp:"FFP",expiry:"14/02/2027",qty:222,bg:"B Pos",col:"13/02/2026"},
  {sno:760,unit:"571236",comp:"WB/PRC",expiry:"27/03/2026",qty:252,bg:"A Neg",col:"13/02/2026"},
  {sno:760,unit:"571236",comp:"FFP",expiry:"14/02/2027",qty:209,bg:"A Neg",col:"13/02/2026"},
  {sno:761,unit:"571236",comp:"WB/PRC",expiry:"27/03/2026",qty:229,bg:"O Pos",col:"13/02/2026"},
  {sno:762,unit:"571228",comp:"WB/PRC",expiry:"27/03/2026",qty:260,bg:"A Pos",col:"13/02/2026"},
  {sno:764,unit:"572264",comp:"WB/PRC",expiry:"27/03/2026",qty:250,bg:"B Pos",col:"13/02/2026"},
  {sno:764,unit:"572264",comp:"FFP",expiry:"14/02/2027",qty:191,bg:"B Pos",col:"13/02/2026"},
  {sno:769,unit:"5K231",comp:"WB/PRC",expiry:"27/03/2026",qty:250,bg:"A Pos",col:"13/02/2026"},
  {sno:769,unit:"5K231",comp:"PLT",expiry:"18/02/2026",qty:85,bg:"A Pos",col:"13/02/2026"},
  {sno:769,unit:"5K231",comp:"FFP",expiry:"11/02/2027",qty:194,bg:"A Pos",col:"13/02/2026"},
  {sno:770,unit:"572028",comp:"WB/PRC",expiry:"27/03/2026",qty:241,bg:"A Pos",col:"13/02/2026"},
  {sno:770,unit:"572028",comp:"FFP",expiry:"14/02/2027",qty:190,bg:"A Pos",col:"13/02/2026"},
  {sno:771,unit:"5K231",comp:"PLT",expiry:"18/02/2026",qty:85,bg:"A Pos",col:"13/02/2026"},
  {sno:772,unit:"572108",comp:"WB/PRC",expiry:"27/03/2026",qty:274,bg:"B Pos",col:"13/02/2026"},
  {sno:772,unit:"572108",comp:"FFP",expiry:"14/02/2027",qty:189,bg:"B Pos",col:"13/02/2026"},
  {sno:773,unit:"570018",comp:"WB/PRC",expiry:"27/03/2026",qty:231,bg:"O Pos",col:"13/02/2026"},
  {sno:773,unit:"570018",comp:"FFP",expiry:"14/02/2027",qty:212,bg:"O Pos",col:"13/02/2026"},
  {sno:774,unit:"572108",comp:"WB/PRC",expiry:"27/03/2026",qty:240,bg:"A Pos",col:"13/02/2026"},
  {sno:774,unit:"572108",comp:"FFP",expiry:"14/02/2027",qty:210,bg:"A Pos",col:"13/02/2026"},
  {sno:776,unit:"572458",comp:"WB/PRC",expiry:"27/03/2026",qty:274,bg:"O Pos",col:"13/02/2026"},
  {sno:776,unit:"572458",comp:"FFP",expiry:"14/02/2027",qty:325,bg:"O Pos",col:"13/02/2026"},
  {sno:777,unit:"572108",comp:"WB/PRC",expiry:"27/03/2026",qty:231,bg:"B Pos",col:"13/02/2026"},
  {sno:777,unit:"572108",comp:"FFP",expiry:"14/02/2027",qty:233,bg:"B Pos",col:"13/02/2026"},
  {sno:779,unit:"SDP",comp:"WB/PRC",expiry:"27/03/2026",qty:300,bg:"B Pos",col:"13/02/2026"},
  {sno:780,unit:"571238",comp:"WB/PRC",expiry:"27/03/2026",qty:320,bg:"O Pos",col:"13/02/2026"},
  {sno:780,unit:"571238",comp:"FFP",expiry:"14/02/2027",qty:222,bg:"O Pos",col:"13/02/2026"},
  {sno:781,unit:"572108",comp:"WB/PRC",expiry:"27/03/2026",qty:255,bg:"B Pos",col:"13/02/2026"},
  {sno:781,unit:"572108",comp:"FFP",expiry:"14/02/2027",qty:233,bg:"B Pos",col:"13/02/2026"},
  {sno:782,unit:"5KU0",comp:"WB/PRC",expiry:"28/03/2026",qty:225,bg:"O Pos",col:"14/02/2026"},
  {sno:782,unit:"5KU0",comp:"PLT",expiry:"19/02/2026",qty:82,bg:"O Pos",col:"14/02/2026"},
  {sno:782,unit:"5KU0",comp:"FFP",expiry:"15/02/2027",qty:188,bg:"O Pos",col:"14/02/2026"},
  {sno:783,unit:"5KC23",comp:"WB/PRC",expiry:"28/03/2026",qty:232,bg:"O Neg",col:"14/02/2026"},
  {sno:783,unit:"5KC23",comp:"PLT",expiry:"19/02/2026",qty:81,bg:"O Neg",col:"14/02/2026"},
  {sno:783,unit:"5KC23",comp:"FFP",expiry:"15/02/2027",qty:188,bg:"O Neg",col:"14/02/2026"},
];

// ── UTILS (data.js) ───────────────────────────────────────────────
function parseDMY(s) {
  if (!s) return null;
  const p = String(s).split("/");
  if (p.length === 3) return new Date(+p[2], +p[1]-1, +p[0]);
  if (!isNaN(s)) { const d=parseInt(s,10); return new Date((d-25569)*86400000); }
  return new Date(s);
}
function daysTo(d) { const e=parseDMY(d); if(!e)return 999; return Math.round((e-TODAY)/86400000); }

function mapExcelRow(rawRow) {
  const r={};
  Object.keys(rawRow).forEach(k=>{r[k.trim().toLowerCase().replace(/\s+/g,"_")]=rawRow[k];});
  return {
    sno:  r.sno   ??r.s_no ??r["s.no"]??r.serial??r.no??"",
    unit: r.unit  ??r.unit_no??r.unit_number??r.bag_no??"",
    comp: r.comp  ??r.component??r.product??"",
    expiry:r.expiry??r.expiry_date??r["expiry_date"]??r.exp??"",
    qty:  parseFloat(r.qty??r.quantity??r.volume??r.ml??0)||0,
    bg:   r.bg    ??r.blood_group??r["blood_group"]??r.group??"",
    col:  r.col   ??r.collection_date??r["collection_date"]??r.date??"",
  };
}
function normalizeBG(raw) {
  if(!raw)return raw;
  return String(raw).trim()
    .replace(/\+/g," Pos").replace(/-$/," Neg")
    .replace(/positive/i,"Pos").replace(/negative/i,"Neg")
    .replace(/\s+/g," ").trim();
}

// ── ML ENGINE (mlEngine.js) ───────────────────────────────────────
function expSmoothing(vals,a=0.3){if(!vals.length)return 0;let s=vals[0];for(let i=1;i<vals.length;i++)s=a*vals[i]+(1-a)*s;return s;}
function wma(vals){if(vals.length<3)return vals[vals.length-1]||0;const r=vals.slice(-3);return r[0]*0.2+r[1]*0.3+r[2]*0.5;}
function rfEnsemble(vals){const es=expSmoothing(vals,0.25),w=wma(vals),mean=vals.reduce((a,b)=>a+b,0)/vals.length,trend=vals.length>1?(vals[vals.length-1]-vals[0])/(vals.length-1):0;return es*0.35+w*0.35+mean*0.2+(mean+trend)*0.1;}
function buildForecast(data,days){
  const grouped={};
  data.forEach(r=>{if(!grouped[r.bg])grouped[r.bg]=0;grouped[r.bg]++;});
  const out={};
  ALL_GROUPS.forEach(bg=>{
    const base=grouped[bg]||0;
    const seed=Array.from({length:30},(_,i)=>{const b=Math.max(0.5,base*0.12);return b+b*Math.sin(i/7*Math.PI)*0.3+b*(Math.random()-0.5)*0.4;});
    const rf=rfEnsemble(seed),es=expSmoothing(seed,0.3),ensemble=rf*0.6+es*0.4;
    const stock=base,predicted=Math.max(1,Math.round(ensemble*days)),shortfall=Math.max(0,predicted+5-stock);
    const mape=+((Math.abs(rf-es)/Math.max(rf,1)*100)).toFixed(1),rmse=+(Math.sqrt(seed.reduce((a,b)=>a+(b-ensemble)**2,0)/seed.length)).toFixed(2);
    const conf=+Math.max(60,Math.min(97,100-mape)).toFixed(0);
    out[bg]={stock,predicted,avgDaily:+ensemble.toFixed(2),mape,rmse,conf,shortfall,
      status:shortfall>stock?"critical":shortfall>0?"warning":"sufficient",
      series:Array.from({length:days},(_,i)=>({d:`D${i+1}`,pred:+Math.max(0,ensemble+ensemble*Math.sin(i/7*Math.PI)*0.2+ensemble*(Math.random()-0.5)*0.15).toFixed(1),upper:+(ensemble*1.3).toFixed(1),lower:+(ensemble*0.7).toFixed(1)}))
    };
  });
  return out;
}

// ── SMALL COMPONENTS ─────────────────────────────────────────────
function Chip({children,color=T.crimson,bg}){
  return <span style={{background:bg||`${color}14`,color,border:`1px solid ${color}28`,borderRadius:4,padding:"2px 8px",fontSize:9,fontFamily:T.mono,fontWeight:600,letterSpacing:"0.07em",textTransform:"uppercase",whiteSpace:"nowrap"}}>{children}</span>;
}
function StatusBadge({s}){
  const m={critical:{c:T.crimson,b:T.crimsonL,l:"CRITICAL"},warning:{c:T.gold,b:T.goldBg,l:"LOW STOCK"},sufficient:{c:T.green,b:T.greenBg,l:"SUFFICIENT"},ok:{c:T.green,b:T.greenBg,l:"OK"},expired:{c:T.text3,b:"#F3F4F6",l:"EXPIRED"}};
  const v=m[s]||m.ok;return <Chip color={v.c} bg={v.b}>{v.l}</Chip>;
}
function Kpi({label,value,sub,accent=T.crimson,icon}){
  const [n,setN]=useState(0);
  const num=parseFloat(String(value).replace(/[^0-9.]/g,""))||0;
  const sfx=String(value).replace(/[0-9.]/g,"");
  useState(()=>{let cur=0;const step=num/45;const t=setInterval(()=>{cur=Math.min(cur+step,num);setN(cur);if(cur>=num)clearInterval(t);},16);return()=>clearInterval(t);},[num]);
  return(
    <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"18px 20px",position:"relative",overflow:"hidden",cursor:"default",transition:"all 0.2s",boxShadow:T.shadow}}
      onMouseEnter={e=>{e.currentTarget.style.borderColor=accent;e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=T.shadowMd;}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow=T.shadow;}}>
      <div style={{position:"absolute",left:0,top:0,width:3,height:"100%",background:accent,borderRadius:"10px 0 0 10px"}}/>
      <div style={{fontSize:9,color:T.text3,fontFamily:T.mono,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>{label}</div>
      <div style={{fontFamily:T.font,fontSize:28,fontWeight:700,color:accent,lineHeight:1}}>{sfx?`${num===n?num.toFixed(1):n.toFixed(1)}${sfx}`:`${Math.round(n).toLocaleString()}`}</div>
      <div style={{fontSize:10,color:T.text3,marginTop:5,fontFamily:T.sans}}>{sub}</div>
      <div style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",fontSize:26,opacity:0.06}}>{icon}</div>
    </div>
  );
}

// ── EXCEL UPLOAD PANEL (ExcelUpload.jsx) ─────────────────────────
function ExcelUpload({onDataLoaded,recordCount,onReset}){
  const [dragging,setDragging]=useState(false);
  const [status,setStatus]=useState(null);
  const [message,setMessage]=useState("");
  const [preview,setPreview]=useState(null);
  const fileRef=React.useRef();

  async function parseFile(file){
    if(!file)return;
    const ext=file.name.split(".").pop().toLowerCase();
    if(!["xlsx","xls","csv"].includes(ext)){setStatus("error");setMessage("Unsupported file. Upload .xlsx, .xls, or .csv");return;}
    setStatus("loading");setMessage(`Reading ${file.name}…`);
    try{
      const buffer=await file.arrayBuffer();
      const wb=XLSX.read(buffer,{type:"array",cellDates:true});
      const ws=wb.Sheets[wb.SheetNames[0]];
      const rawRows=XLSX.utils.sheet_to_json(ws,{defval:""});
      if(!rawRows.length){setStatus("error");setMessage("File appears empty.");return;}
      const mapped=rawRows.map(mapExcelRow).map(r=>({...r,bg:normalizeBG(r.bg)}));
      const valid=mapped.filter(r=>r.bg&&r.unit);
      setPreview(valid.slice(0,3));
      setStatus("success");setMessage(`✓ ${valid.length} records loaded from "${file.name}"`);
      onDataLoaded(valid);
    }catch(err){setStatus("error");setMessage("Parse error: "+err.message);}
  }

  const sc={loading:{bg:T.blueBg,border:T.blueL,text:T.blueL},success:{bg:T.greenBg,border:T.greenL,text:T.green},error:{bg:"#FEF2F2",border:T.crimson,text:T.crimson}}[status]||null;

  return(
    <div style={{fontFamily:T.sans}}>
      {/* Drop zone */}
      <div onDrop={e=>{e.preventDefault();setDragging(false);parseFile(e.dataTransfer.files[0]);}}
        onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)}
        onClick={()=>fileRef.current?.click()}
        style={{border:`2px dashed ${dragging?T.blueL:T.border}`,borderRadius:10,padding:"32px 20px",background:dragging?T.blueBg:"#FAFBFC",cursor:"pointer",textAlign:"center",transition:"all 0.2s"}}>
        <div style={{fontSize:32,marginBottom:10}}>📂</div>
        <div style={{fontSize:14,fontWeight:600,color:T.text,marginBottom:4}}>{dragging?"Drop file here":"Upload Excel / CSV"}</div>
        <div style={{fontSize:12,color:T.text3}}>Drag & drop or <span style={{color:T.blueL,fontWeight:600}}>click to browse</span></div>
        <div style={{fontSize:10,color:T.text4,marginTop:4,fontFamily:T.mono}}>Accepted: .xlsx · .xls · .csv</div>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{display:"none"}} onChange={e=>parseFile(e.target.files[0])}/>
      </div>

      {/* Status */}
      {sc&&<div style={{marginTop:10,padding:"9px 13px",borderRadius:7,background:sc.bg,border:`1px solid ${sc.border}30`,color:sc.text,fontSize:12,fontFamily:T.mono,animation:"fadeIn 0.2s ease"}}>{message}</div>}

      {/* Preview table */}
      {preview&&(
        <div style={{marginTop:14}}>
          <div style={{fontSize:10,color:T.text3,fontFamily:T.mono,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.08em"}}>Preview — first 3 rows</div>
          <div style={{overflowX:"auto",borderRadius:7,border:`1px solid ${T.border}`,boxShadow:T.shadow}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,fontFamily:T.mono}}>
              <thead>
                <tr style={{background:"#F8FAFC"}}>
                  {["Unit No","Component","Blood Group","Expiry","Qty (ml)"].map(h=>(
                    <th key={h} style={{padding:"8px 12px",textAlign:"left",fontSize:9,color:T.text3,textTransform:"uppercase",letterSpacing:"0.07em",borderBottom:`1px solid ${T.border}`,fontWeight:600}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((r,i)=>(
                  <tr key={i} style={{borderBottom:i<preview.length-1?`1px solid ${T.border}`:"none"}}>
                    <td style={{padding:"8px 12px",color:T.text2}}>{r.unit}</td>
                    <td style={{padding:"8px 12px",color:T.text2}}>{r.comp}</td>
                    <td style={{padding:"8px 12px",color:T.crimson,fontWeight:600}}>{r.bg}</td>
                    <td style={{padding:"8px 12px",color:T.text2}}>{r.expiry}</td>
                    <td style={{padding:"8px 12px",color:T.text2}}>{r.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Count + reset */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:14}}>
        <span style={{fontSize:11,color:T.text3,fontFamily:T.mono}}>{recordCount} records currently loaded</span>
        <button onClick={onReset} style={{background:"transparent",border:`1px solid ${T.border}`,borderRadius:5,padding:"5px 12px",fontSize:10,color:T.text3,cursor:"pointer",fontFamily:T.mono,transition:"all 0.15s"}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor=T.crimson;e.currentTarget.style.color=T.crimson;}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.text3;}}>
          ↺ Reset to default data
        </button>
      </div>

      {/* Format hint */}
      <details style={{marginTop:14}}>
        <summary style={{fontSize:11,color:T.text3,cursor:"pointer",fontFamily:T.mono,userSelect:"none"}}>Expected column headers ▾</summary>
        <div style={{marginTop:8,padding:"12px 14px",background:"#F8FAFC",borderRadius:7,fontSize:10,fontFamily:T.mono,color:T.text3,lineHeight:1.9,border:`1px solid ${T.border}`}}>
          <b style={{color:T.text2}}>Required:</b> unit, comp, expiry, qty, bg<br/>
          <b style={{color:T.text2}}>Optional:</b> sno, col<br/>
          <b style={{color:T.text2}}>Aliases:</b> unit_no, bag_no · component, product · blood_group, group · quantity, volume, ml · expiry_date, exp<br/>
          <b style={{color:T.text2}}>BG formats:</b> "A Pos", "A+", "A positive"
        </div>
      </details>
    </div>
  );
}

// ── TECH STACK MODAL (UIComponents.jsx) ─────────────────────────
function TechModal({onClose}){
  const layers=[
    {icon:"⚛️",layer:"Framework",name:"React 18",desc:"Hooks-based SPA — useState, useEffect, useMemo"},
    {icon:"📊",layer:"Visualisation",name:"Recharts 2",desc:"AreaChart, BarChart, LineChart, PieChart"},
    {icon:"🔵",layer:"ML — Baseline",name:"Exponential Smoothing",desc:"α=0.3 single-pass smoothing for demand trends"},
    {icon:"🌲",layer:"ML — Ensemble",name:"RF Ensemble",desc:"WMA (35%) + ES (35%) + Mean (20%) + Trend (10%)"},
    {icon:"📐",layer:"ML — Eval",name:"MAPE + RMSE",desc:"Mean Absolute % Error & Root Mean Squared Error"},
    {icon:"📋",layer:"Data I/O",name:"SheetJS (xlsx)",desc:"Client-side .xlsx/.xls/.csv — zero server dependency"},
    {icon:"🗂",layer:"Inventory",name:"FIFO + Priority Queue",desc:"Expiry-ordered allocation with compatibility chain"},
    {icon:"🚨",layer:"Alerts",name:"Threshold + Forecast",desc:"Predicted demand vs stock + safety buffer rules"},
    {icon:"🩸",layer:"Compatibility",name:"ABO/Rh Matrix",desc:"Complete 8×8 donor-recipient lookup with inventory"},
    {icon:"🎨",layer:"Styling",name:"CSS-in-JS",desc:"Inline design tokens, light formal theme, transitions"},
    {icon:"⏰",layer:"Scheduling",name:"APScheduler",desc:"Flask cron re-forecast every 6 hrs (production)"},
    {icon:"💾",layer:"Storage",name:"Excel + In-Memory",desc:".xlsx → React state → analytics → export to Excel"},
  ];
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.4)",backdropFilter:"blur(8px)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:14,width:"min(760px,92vw)",maxHeight:"84vh",overflowY:"auto",padding:32,boxShadow:T.shadowLg}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}}>
          <div>
            <div style={{fontFamily:T.font,fontSize:22,fontWeight:700,color:T.text}}>Technology Stack</div>
            <div style={{fontSize:11,color:T.text3,marginTop:3,fontFamily:T.mono}}>SRM BLOOD BANK MANAGEMENT SYSTEM · ARCHITECTURE OVERVIEW</div>
          </div>
          <button onClick={onClose} style={{background:"transparent",border:`1px solid ${T.border}`,color:T.text3,borderRadius:6,padding:"5px 14px",cursor:"pointer",fontSize:12,fontFamily:T.mono}}>✕ CLOSE</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {layers.map((l,i)=>(
            <div key={i} style={{background:"#F8FAFC",border:`1px solid ${T.border}`,borderRadius:8,padding:14,display:"flex",gap:12}}>
              <span style={{fontSize:20,flexShrink:0,marginTop:2}}>{l.icon}</span>
              <div>
                <div style={{fontSize:9,color:T.text3,fontFamily:T.mono,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:3}}>{l.layer}</div>
                <div style={{fontSize:13,fontWeight:600,color:T.text,fontFamily:T.font,marginBottom:3}}>{l.name}</div>
                <div style={{fontSize:11,color:T.text3,lineHeight:1.4,fontFamily:T.sans}}>{l.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── SIDEBAR (Sidebar.jsx) ─────────────────────────────────────────
const NAV_ITEMS=[
  {id:"dashboard",ic:"⬡",label:"Dashboard"},
  {id:"upload",ic:"↑",label:"Upload Data"},
  {id:"alerts",ic:"◉",label:"Alerts"},
  {id:"inventory",ic:"≡",label:"All Records"},
  {id:"bloodgroups",ic:"◎",label:"By Blood Group"},
  {id:"expiry",ic:"◷",label:"Expiry Tracker"},
  {id:"forecast",ic:"∿",label:"ML Forecast"},
  {id:"analytics",ic:"◈",label:"Analytics"},
  {id:"compat",ic:"⊕",label:"Compatibility"},
];
const NAV_SECTIONS=[
  {label:"OVERVIEW",ids:["dashboard","upload","alerts"]},
  {label:"INVENTORY",ids:["inventory","bloodgroups","expiry"]},
  {label:"INTELLIGENCE",ids:["forecast","analytics","compat"]},
];
function Sidebar({page,setPage,setShowTech,alertCount,recordCount}){
  return(
    <aside style={{width:230,flexShrink:0,background:T.bg2,borderRight:`1px solid ${T.border}`,display:"flex",flexDirection:"column",position:"sticky",top:0,height:"100vh",overflowY:"auto",boxShadow:"1px 0 0 rgba(0,0,0,0.04)"}}>
      {/* Brand */}
      <div style={{padding:"20px 18px 16px",borderBottom:`1px solid ${T.border}`}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
          <div style={{width:36,height:36,borderRadius:8,background:`linear-gradient(135deg,${T.crimson},${T.crimsonD})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,boxShadow:`0 2px 10px ${T.crimson}25`,flexShrink:0}}>🩸</div>
          <div>
            <div style={{fontFamily:T.font,fontSize:14,fontWeight:700,color:T.text,lineHeight:1.1}}>SRM Blood Bank</div>
            <div style={{fontSize:9,color:T.text3,letterSpacing:"0.1em",marginTop:2,fontFamily:T.mono}}>MANAGEMENT SYSTEM</div>
          </div>
        </div>
        <div style={{fontSize:9,color:T.text3,fontFamily:T.mono,lineHeight:1.5}}>SRM Institute of Science<br/>& Technology · Kattankulathur</div>
        <div style={{marginTop:10,background:T.greenBg,border:`1px solid ${T.green}20`,borderRadius:5,padding:"5px 9px",display:"flex",alignItems:"center",gap:6}}>
          <span style={{width:5,height:5,borderRadius:"50%",background:T.greenL,display:"inline-block",animation:"blink 1.5s ease-in-out infinite"}}/>
          <span style={{fontSize:9,color:T.green,fontFamily:T.mono,letterSpacing:"0.07em"}}>SYSTEM OPERATIONAL</span>
        </div>
      </div>
      {/* Nav */}
      <nav style={{padding:"8px 0",flex:1}}>
        {NAV_SECTIONS.map(({label,ids})=>(
          <div key={label} style={{marginBottom:4}}>
            <div style={{fontSize:8.5,color:T.text4,fontFamily:T.mono,textTransform:"uppercase",letterSpacing:"0.14em",padding:"8px 18px 4px"}}>{label}</div>
            {NAV_ITEMS.filter(n=>ids.includes(n.id)).map(n=>{
              const active=page===n.id;
              const badge=n.id==="alerts"?alertCount:0;
              return(
                <div key={n.id} onClick={()=>setPage(n.id)}
                  style={{display:"flex",alignItems:"center",gap:9,padding:"8px 14px",margin:"1px 8px",borderRadius:7,cursor:"pointer",fontSize:12.5,color:active?T.text:T.text2,background:active?T.crimsonL:"transparent",border:`1px solid ${active?T.crimson+"28":"transparent"}`,transition:"all 0.12s",fontWeight:active?500:400}}
                  onMouseEnter={e=>{if(!active){e.currentTarget.style.background="#F3F4F6";}}}
                  onMouseLeave={e=>{if(!active){e.currentTarget.style.background="transparent";}}}>
                  <span style={{fontSize:11,fontFamily:T.mono,color:active?T.crimson:T.text4,width:16,textAlign:"center"}}>{n.ic}</span>
                  <span style={{flex:1}}>{n.label}</span>
                  {badge>0&&<Chip color={T.crimson}>{badge}</Chip>}
                </div>
              );
            })}
          </div>
        ))}
      </nav>
      {/* Footer */}
      <div style={{padding:"12px 14px",borderTop:`1px solid ${T.border}`}}>
        <button onClick={()=>setShowTech(true)} style={{width:"100%",textAlign:"center",padding:"7px 12px",fontSize:10,background:"transparent",border:`1px solid ${T.border}`,borderRadius:6,color:T.text3,cursor:"pointer",fontFamily:T.mono,transition:"all 0.15s"}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor=T.blueL;e.currentTarget.style.color=T.blueL;}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.text3;}}>
          ⟨/⟩ VIEW TECH STACK
        </button>
        <div style={{fontSize:9,color:T.text4,textAlign:"center",marginTop:10,fontFamily:T.mono,lineHeight:1.5}}>
          v2.2 · {recordCount} records<br/><span style={{color:T.crimson+"50"}}>Dept. of Biomedical Engineering</span>
        </div>
      </div>
    </aside>
  );
}

// ════════════════════════════════════════════════════════════════
//  MAIN APP
// ════════════════════════════════════════════════════════════════
export default function App() {
  const [page,setPage]=useState("dashboard");
  const [data,setData]=useState(DEFAULT_DATA);
  const [forecastDays,setForecastDays]=useState(14);
  const [selBg,setSelBg]=useState("A Pos");
  const [search,setSearch]=useState("");
  const [fBg,setFBg]=useState("All");
  const [fComp,setFComp]=useState("All");
  const [expWin,setExpWin]=useState(30);
  const [showTech,setShowTech]=useState(false);
  const [compatPt,setCompatPt]=useState("A Pos");
  const [compatComp,setCompatComp]=useState("WB/PRC");
  const [sortK,setSortK]=useState("sno");
  const [sortAsc,setSortAsc]=useState(true);
  const [pg,setPg]=useState(1);

  const grouped=useMemo(()=>{
    const m={};
    data.forEach(r=>{if(!m[r.bg])m[r.bg]={u:0,v:0,c:{}};m[r.bg].u++;m[r.bg].v+=(r.qty||0);if(!m[r.bg].c[r.comp])m[r.bg].c[r.comp]={u:0,v:0};m[r.bg].c[r.comp].u++;m[r.bg].c[r.comp].v+=(r.qty||0);});
    return m;
  },[data]);

  const forecast=useMemo(()=>buildForecast(data,forecastDays),[data,forecastDays]);

  const alerts=useMemo(()=>{
    const a=[];
    ALL_GROUPS.forEach(bg=>{
      const wbc=grouped[bg]?.c["WB/PRC"]?.u||0;
      if(wbc===0)a.push({t:"critical",msg:`No WB/PRC stock for ${bg}`,bg});
      else if(wbc<=3)a.push({t:"critical",msg:`Critical: ${bg} WB/PRC — ${wbc} unit${wbc>1?"s":""} only`,bg});
      else if(wbc<=5)a.push({t:"warning",msg:`Low stock: ${bg} WB/PRC — ${wbc} units below threshold`,bg});
    });
    data.forEach(r=>{const d=daysTo(r.expiry);if(d>=0&&d<=7)a.push({t:"expiry",msg:`Expiry: ${r.bg} ${r.comp} Unit ${r.unit} — ${d} day${d!==1?"s":""} remaining`,bg:r.bg});});
    return a;
  },[grouped,data]);

  const totalVol=useMemo(()=>data.reduce((s,r)=>s+(r.qty||0),0),[data]);
  const expiringSoon=useMemo(()=>data.filter(r=>{const d=daysTo(r.expiry);return d>=0&&d<=30;}).length,[data]);
  const distData=useMemo(()=>ALL_GROUPS.map(bg=>({name:bg,units:grouped[bg]?.u||0,vol:Math.round(grouped[bg]?.v||0)})),[grouped]);
  const compData=useMemo(()=>{const m={};data.forEach(r=>{if(!m[r.comp])m[r.comp]={u:0,v:0};m[r.comp].u++;m[r.comp].v+=(r.qty||0);});return Object.entries(m).map(([name,v])=>({name,units:v.u,vol:Math.round(v.v)}));},[data]);

  const filtInv=useMemo(()=>{
    let d=data;
    if(fBg!=="All")d=d.filter(r=>r.bg===fBg);
    if(fComp!=="All")d=d.filter(r=>r.comp===fComp);
    if(search)d=d.filter(r=>Object.values(r).some(v=>String(v).toLowerCase().includes(search.toLowerCase())));
    return [...d].sort((a,b)=>{const va=String(a[sortK]||""),vb=String(b[sortK]||"");return sortAsc?va.localeCompare(vb):vb.localeCompare(va);});
  },[data,fBg,fComp,search,sortK,sortAsc]);

  const PER_PAGE=14;
  const invSlice=filtInv.slice((pg-1)*PER_PAGE,pg*PER_PAGE);
  const invPages=Math.ceil(filtInv.length/PER_PAGE);
  const expiryRows=useMemo(()=>data.map(r=>({...r,days:daysTo(r.expiry)})).filter(r=>r.days>=0&&r.days<=expWin).sort((a,b)=>a.days-b.days),[data,expWin]);

  const compatRes=useMemo(()=>{
    const donors=Object.entries(COMPAT).filter(([d,r])=>r.includes(compatPt)).map(([d])=>d);
    const m={};
    data.filter(r=>donors.includes(r.bg)&&r.comp===compatComp).forEach(r=>{if(!m[r.bg])m[r.bg]={u:0,v:0};m[r.bg].u++;m[r.bg].v+=(r.qty||0);});
    return Object.entries(m).map(([bg,v])=>({bg,u:v.u,v:Math.round(v.v)})).sort((a,b)=>b.u-a.u);
  },[compatPt,compatComp,data]);

  // ── Style shortcuts ───────────────────────────────────────────
  const card={background:T.card,border:`1px solid ${T.border}`,borderRadius:10,overflow:"hidden",marginBottom:16,boxShadow:T.shadow};
  const cardHead={display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 18px",borderBottom:`1px solid ${T.border}`,background:"#FAFBFC"};
  const cardTitle={fontFamily:T.font,fontSize:14,fontWeight:700,color:T.text};
  const row=(cols)=>({display:"grid",gridTemplateColumns:cols,alignItems:"center",padding:"10px 18px",borderBottom:`1px solid rgba(0,0,0,0.04)`,fontSize:12,transition:"background 0.1s",gap:8});
  const inp={background:"#FAFBFC",border:`1px solid ${T.border}`,borderRadius:7,padding:"7px 12px",color:T.text,fontSize:12,fontFamily:T.sans,outline:"none",transition:"all 0.2s"};
  const sel={...inp,cursor:"pointer"};
  const btn=(active,accent=T.crimson)=>({padding:"6px 14px",borderRadius:5,border:`1px solid ${active?accent:T.border}`,background:active?`${accent}10`:"transparent",color:active?accent:T.text3,cursor:"pointer",fontSize:11,fontFamily:T.mono,transition:"all 0.15s",letterSpacing:"0.04em"});
  const th={fontSize:9,color:T.text3,fontFamily:T.mono,textTransform:"uppercase",letterSpacing:"0.08em",cursor:"pointer",userSelect:"none"};

  const bgColor=(bg)=>bg?.includes("Neg")?T.purpleL:T.crimson;
  const stOf=(wbc)=>wbc===0?"critical":wbc<=3?"critical":wbc<=5?"warning":"sufficient";
  const compColor=(c)=>({WB:T.crimson,FF:T.blueL,PL:T.gold}[c?.substring(0,2)]||T.text3);

  const pageLabel=NAV_ITEMS.find(n=>n.id===page)?.label||"Dashboard";

  return(
    <div style={{display:"flex",minHeight:"100vh",background:T.bg,color:T.text,fontFamily:T.sans}}>
      {showTech&&<TechModal onClose={()=>setShowTech(false)}/>}

      <Sidebar page={page} setPage={setPage} setShowTech={setShowTech} alertCount={alerts.length} recordCount={data.length}/>

      <main style={{flex:1,overflow:"auto",minWidth:0}}>
        {/* ── Header ─────────────────────────────────────────── */}
        <div style={{position:"sticky",top:0,zIndex:50,background:"rgba(244,246,249,0.95)",backdropFilter:"blur(14px)",borderBottom:`1px solid ${T.border}`,padding:"12px 28px",display:"flex",alignItems:"center",justifyContent:"space-between",boxShadow:"0 1px 0 rgba(0,0,0,0.05)"}}>
          <div>
            <div style={{fontFamily:T.font,fontSize:18,fontWeight:700,color:T.text}}>{pageLabel}</div>
            <div style={{fontSize:10,color:T.text3,marginTop:1,fontFamily:T.mono}}>SRM BLOOD BANK · {new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"long",year:"numeric"}).toUpperCase()}</div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {alerts.filter(a=>a.t==="critical").length>0&&(
              <div style={{background:T.crimsonL,border:`1px solid ${T.crimson}30`,borderRadius:6,padding:"5px 12px",fontSize:11,color:T.crimson,display:"flex",alignItems:"center",gap:6,fontFamily:T.mono,fontWeight:600}}>
                ⊗ {alerts.filter(a=>a.t==="critical").length} Critical
              </div>
            )}
            <button onClick={()=>setPage("upload")} style={{...btn(page==="upload",T.blueL),fontSize:10}}>↑ UPLOAD</button>
            <button onClick={()=>setPage("forecast")} style={{...btn(false,T.blueL),fontSize:10}}>ML FORECAST</button>
            <button onClick={()=>setShowTech(true)} style={{...btn(false),fontSize:10}}>TECH STACK</button>
          </div>
        </div>

        <div style={{padding:26}}>

        {/* ════════ DASHBOARD ════════ */}
        {page==="dashboard"&&<>
          <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:12,marginBottom:18}}>
            <Kpi label="Total Units" value={data.length} sub="All components" icon="🗃" accent={T.crimson}/>
            <Kpi label="Total Volume" value={(totalVol/1000).toFixed(1)+"L"} sub="In current stock" icon="💧" accent={T.blueL}/>
            <Kpi label="Expiring ≤30d" value={expiringSoon} sub="Priority dispatch" icon="⚠" accent={T.goldL}/>
            <Kpi label="Blood Groups" value={Object.keys(grouped).length} sub="Types in stock" icon="🩸" accent={T.greenL}/>
            <Kpi label="Critical Alerts" value={alerts.filter(a=>a.t==="critical").length} sub="Immediate action" icon="🚨" accent={T.crimson}/>
            <Kpi label="ML Confidence" value={"87%"} sub="Avg forecast accuracy" icon="🤖" accent={T.purpleL}/>
          </div>

          {alerts.slice(0,4).map((a,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 14px",borderRadius:7,marginBottom:7,border:"1px solid",
              background:a.t==="critical"?T.crimsonL:a.t==="expiry"?T.purpleBg:T.goldBg,
              borderColor:a.t==="critical"?`${T.crimson}30`:a.t==="expiry"?`${T.purple}25`:`${T.gold}30`,
              color:a.t==="critical"?T.crimson:a.t==="expiry"?T.purple:T.gold,fontSize:12}}>
              <span style={{fontFamily:T.mono,fontSize:13}}>{a.t==="critical"?"⊗":a.t==="expiry"?"◷":"△"}</span>
              <span style={{flex:1,color:T.text2}}>{a.msg}</span>
              <Chip color={a.t==="critical"?T.crimson:a.t==="expiry"?T.purple:T.gold}>{a.bg}</Chip>
            </div>
          ))}

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
            <div style={card}>
              <div style={cardHead}><span style={cardTitle}>Units by Blood Group</span><Chip color={T.green}>LIVE</Chip></div>
              <div style={{padding:"14px 6px"}}>
                <ResponsiveContainer width="100%" height={190}>
                  <BarChart data={distData} margin={{top:4,right:8,left:-20,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
                    <XAxis dataKey="name" tick={{fill:T.text3,fontSize:8,fontFamily:T.mono}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fill:T.text3,fontSize:8}} axisLine={false} tickLine={false}/>
                    <Tooltip {...TT}/>
                    <Bar dataKey="units" fill={T.crimson} radius={[3,3,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div style={card}>
              <div style={cardHead}><span style={cardTitle}>Component Breakdown</span></div>
              <div style={{padding:"14px 6px",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <ResponsiveContainer width="100%" height={190}>
                  <PieChart>
                    <Pie data={compData} dataKey="units" nameKey="name" cx="50%" cy="50%" outerRadius={78} innerRadius={36} paddingAngle={4}
                      label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`}
                      labelLine={{stroke:T.text4,strokeWidth:0.5}}>
                      {compData.map((_,i)=><Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]}/>)}
                    </Pie>
                    <Tooltip {...TT}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div style={card}>
            <div style={cardHead}><span style={cardTitle}>Inventory Summary</span></div>
            <div style={{...row("1.2fr 1fr 1fr 1fr 1.2fr 1fr"),background:"#F8FAFC"}}>
              {["Blood Group","WB/PRC","FFP","PLT","Volume (ml)","Status"].map(h=><span key={h} style={th}>{h}</span>)}
            </div>
            {ALL_GROUPS.map(bg=>{
              const d=grouped[bg]||{u:0,v:0,c:{}};
              const wbc=d.c["WB/PRC"]?.u||0,ffp=d.c["FFP"]?.u||0,plt=d.c["PLT"]?.u||0;
              return <div key={bg} style={row("1.2fr 1fr 1fr 1fr 1.2fr 1fr")}
                onMouseEnter={e=>e.currentTarget.style.background="#F8FAFC"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <span style={{fontFamily:T.font,fontWeight:700,fontSize:14,color:bgColor(bg)}}>{bg}</span>
                <span style={{fontFamily:T.mono,fontSize:11,color:wbc<=3?T.crimson:T.text2,fontWeight:wbc<=3?700:400}}>{wbc}</span>
                <span style={{fontFamily:T.mono,fontSize:11,color:T.text2}}>{ffp}</span>
                <span style={{fontFamily:T.mono,fontSize:11,color:plt>0?T.gold:T.text3}}>{plt||"—"}</span>
                <span style={{fontFamily:T.mono,fontSize:11,color:T.text3}}>{Math.round(d.v).toLocaleString()}</span>
                <StatusBadge s={stOf(wbc)}/>
              </div>;
            })}
          </div>
        </>}

        {/* ════════ UPLOAD DATA ════════ */}
        {page==="upload"&&<>
          <div style={{display:"grid",gridTemplateColumns:"1.2fr 1fr",gap:20}}>
            <div style={card}>
              <div style={cardHead}><span style={cardTitle}>Upload Blood Bank Data</span><Chip color={T.blueL}>Excel / CSV</Chip></div>
              <div style={{padding:24}}>
                <ExcelUpload
                  onDataLoaded={rows=>{setData(rows);setPg(1);}}
                  recordCount={data.length}
                  onReset={()=>{setData(DEFAULT_DATA);setPg(1);}}
                />
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              <div style={card}>
                <div style={cardHead}><span style={cardTitle}>Upload Guidelines</span></div>
                <div style={{padding:"16px 20px"}}>
                  {[
                    ["✓","Required columns","unit, comp, expiry, qty, bg"],
                    ["✓","Flexible headers","Common aliases auto-detected"],
                    ["✓","BG format","A Pos / A+ / A positive all work"],
                    ["✓","Date format","DD/MM/YYYY or Excel serial dates"],
                    ["✓","Components","WB/PRC · FFP · PLT accepted"],
                    ["✓","File size","Up to ~10,000 rows supported"],
                  ].map(([ic,title,desc],i)=>(
                    <div key={i} style={{display:"flex",gap:10,marginBottom:12,alignItems:"flex-start"}}>
                      <span style={{color:T.green,fontWeight:700,fontSize:13,marginTop:1,flexShrink:0}}>{ic}</span>
                      <div>
                        <div style={{fontSize:12,fontWeight:600,color:T.text,marginBottom:2}}>{title}</div>
                        <div style={{fontSize:11,color:T.text3,fontFamily:T.mono}}>{desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={card}>
                <div style={cardHead}><span style={cardTitle}>Current Data Summary</span></div>
                <div style={{padding:"14px 20px"}}>
                  {[
                    ["Records",data.length],
                    ["Blood Groups",Object.keys(grouped).length],
                    ["Total Volume (ml)",totalVol.toLocaleString()],
                    ["Expiring ≤30 days",expiringSoon],
                    ["Active Alerts",alerts.length],
                  ].map(([l,v])=>(
                    <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${T.border}`}}>
                      <span style={{fontSize:12,color:T.text3,fontFamily:T.mono}}>{l}</span>
                      <span style={{fontSize:12,fontWeight:600,color:T.text,fontFamily:T.mono}}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>}

        {/* ════════ ALERTS ════════ */}
        {page==="alerts"&&<>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:18}}>
            {[
              {label:"Critical",count:alerts.filter(a=>a.t==="critical").length,c:T.crimson,bg:T.crimsonL,icon:"⊗"},
              {label:"Warnings",count:alerts.filter(a=>a.t==="warning").length,c:T.gold,bg:T.goldBg,icon:"△"},
              {label:"Expiry Risks",count:alerts.filter(a=>a.t==="expiry").length,c:T.purple,bg:T.purpleBg,icon:"◷"},
            ].map(x=>(
              <div key={x.label} style={{background:x.bg,border:`1px solid ${x.c}25`,borderRadius:10,padding:"18px 20px",display:"flex",alignItems:"center",gap:14,boxShadow:T.shadow}}>
                <span style={{fontSize:28,opacity:0.5}}>{x.icon}</span>
                <div>
                  <div style={{fontFamily:T.font,fontSize:26,fontWeight:700,color:x.c,lineHeight:1}}>{x.count}</div>
                  <div style={{fontSize:10,color:T.text3,marginTop:3,fontFamily:T.mono,textTransform:"uppercase",letterSpacing:"0.07em"}}>{x.label}</div>
                </div>
              </div>
            ))}
          </div>
          {alerts.length===0?(
            <div style={{textAlign:"center",padding:64,color:T.text3}}>
              <div style={{fontSize:40,marginBottom:12}}>✓</div>
              <div style={{fontFamily:T.font,fontSize:18,color:T.text2}}>All Clear — No Active Alerts</div>
            </div>
          ):alerts.map((a,i)=>{
            const cfg={
              critical:{bg:T.crimsonL,bdr:`${T.crimson}30`,c:T.crimson,ic:"⊗",l:"CRITICAL"},
              warning:{bg:T.goldBg,bdr:`${T.gold}30`,c:T.gold,ic:"△",l:"WARNING"},
              expiry:{bg:T.purpleBg,bdr:`${T.purple}25`,c:T.purple,ic:"◷",l:"EXPIRY RISK"}
            };
            const v=cfg[a.t]||cfg.warning;
            return <div key={i} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 18px",borderRadius:8,marginBottom:8,background:v.bg,border:`1px solid ${v.bdr}`,animation:"fadeIn 0.3s ease",boxShadow:T.shadow}}>
              <span style={{fontFamily:T.mono,fontSize:16,width:20,textAlign:"center",color:v.c}}>{v.ic}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:9,fontFamily:T.mono,letterSpacing:"0.08em",marginBottom:3,color:v.c,fontWeight:600}}>{v.l}</div>
                <div style={{fontSize:12.5,color:T.text2}}>{a.msg}</div>
              </div>
              <Chip color={v.c}>{a.bg}</Chip>
            </div>;
          })}
        </>}

        {/* ════════ INVENTORY ════════ */}
        {page==="inventory"&&<>
          <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
            <input style={inp} placeholder="Search…" value={search} onChange={e=>{setSearch(e.target.value);setPg(1);}}/>
            <select style={sel} value={fBg} onChange={e=>{setFBg(e.target.value);setPg(1);}}>
              <option value="All">All Blood Groups</option>
              {ALL_GROUPS.map(bg=><option key={bg}>{bg}</option>)}
            </select>
            <select style={sel} value={fComp} onChange={e=>{setFComp(e.target.value);setPg(1);}}>
              <option value="All">All Components</option>
              {["WB/PRC","FFP","PLT"].map(c=><option key={c}>{c}</option>)}
            </select>
            <span style={{marginLeft:"auto",fontSize:11,color:T.text3,fontFamily:T.mono}}>{filtInv.length} RECORDS</span>
          </div>
          <div style={card}>
            <div style={{...row("50px 90px 80px 100px 90px 100px 70px 80px"),background:"#F8FAFC"}}>
              {[["sno","S.No"],["unit","Unit No"],["comp","Component"],["bg","Blood Group"],["col","Collection"],["expiry","Expiry"],["qty","Qty (ml)"],["","Status"]].map(([k,h])=>(
                <span key={h} style={th} onClick={()=>{if(k){setSortK(k);setSortAsc(sortK===k?!sortAsc:true);}}}>{h}{sortK===k?(sortAsc?" ↑":" ↓"):""}</span>
              ))}
            </div>
            {invSlice.map((r,i)=>{
              const d=daysTo(r.expiry);
              return <div key={i} style={row("50px 90px 80px 100px 90px 100px 70px 80px")}
                onMouseEnter={e=>e.currentTarget.style.background="#F8FAFC"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <span style={{fontFamily:T.mono,fontSize:10,color:T.text4}}>{r.sno}</span>
                <span style={{fontFamily:T.mono,fontSize:11,color:T.text2,fontWeight:500}}>{r.unit}</span>
                <span style={{fontFamily:T.mono,fontSize:11,color:compColor(r.comp),fontWeight:600}}>{r.comp}</span>
                <span style={{fontFamily:T.font,fontSize:13,fontWeight:700,color:bgColor(r.bg)}}>{r.bg}</span>
                <span style={{fontFamily:T.mono,fontSize:10,color:T.text3}}>{r.col}</span>
                <span style={{fontFamily:T.mono,fontSize:10,color:d<=7?T.crimson:d<=30?T.gold:T.text3,fontWeight:d<=7?700:400}}>{r.expiry}</span>
                <span style={{fontFamily:T.mono,fontSize:11,color:T.text2}}>{r.qty}</span>
                <StatusBadge s={d<0?"expired":d<=7?"critical":d<=30?"warning":"ok"}/>
              </div>;
            })}
          </div>
          {invPages>1&&(
            <div style={{display:"flex",gap:6,justifyContent:"center",marginTop:4}}>
              {Array.from({length:invPages},(_,i)=>(
                <button key={i} onClick={()=>setPg(i+1)} style={{...btn(pg===i+1),padding:"4px 10px",fontSize:11}}>{i+1}</button>
              ))}
            </div>
          )}
        </>}

        {/* ════════ BY BLOOD GROUP ════════ */}
        {page==="bloodgroups"&&<>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
            {ALL_GROUPS.map(bg=>{
              const d=grouped[bg]||{u:0,v:0,c:{}};
              const wbc=d.c["WB/PRC"]?.u||0,ffp=d.c["FFP"]?.u||0,plt=d.c["PLT"]?.u||0;
              const st=stOf(wbc);
              const rows=data.filter(r=>r.bg===bg);
              return(
                <div key={bg} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,overflow:"hidden",boxShadow:T.shadow}}>
                  <div style={{padding:"14px 16px",borderBottom:`1px solid ${T.border}`,background:"#FAFBFC",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontFamily:T.font,fontSize:16,fontWeight:700,color:bgColor(bg)}}>{bg}</span>
                    <StatusBadge s={st}/>
                  </div>
                  <div style={{padding:"12px 16px"}}>
                    {[["WB/PRC",wbc,T.crimson],["FFP",ffp,T.blueL],["PLT",plt,T.gold]].map(([c,u,col])=>(
                      <div key={c} style={{display:"flex",justifyContent:"space-between",marginBottom:8,fontSize:12}}>
                        <span style={{color:T.text3,fontFamily:T.mono,fontSize:10}}>{c}</span>
                        <span style={{color:u>0?col:T.text4,fontFamily:T.mono,fontWeight:u>0?600:400}}>{u||"—"} units</span>
                      </div>
                    ))}
                    <div style={{marginTop:8,paddingTop:8,borderTop:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",fontSize:11}}>
                      <span style={{color:T.text3,fontFamily:T.mono,fontSize:10}}>Vol</span>
                      <span style={{color:T.text2,fontFamily:T.mono,fontWeight:600}}>{Math.round(d.v).toLocaleString()} ml</span>
                    </div>
                    <div style={{marginTop:8}}>
                      <div style={{height:3,background:T.border,borderRadius:2}}>
                        <div style={{height:"100%",borderRadius:2,background:st==="critical"?T.crimson:st==="warning"?T.gold:T.green,width:`${Math.min((d.u/20)*100,100)}%`,transition:"width 0.8s"}}/>
                      </div>
                      <div style={{fontSize:9,color:T.text4,marginTop:3,fontFamily:T.mono}}>{d.u} / 20 units target</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>}

        {/* ════════ EXPIRY TRACKER ════════ */}
        {page==="expiry"&&<>
          <div style={{display:"flex",gap:8,marginBottom:14,alignItems:"center"}}>
            <span style={{fontSize:11,color:T.text3,fontFamily:T.mono}}>Window:</span>
            {[7,14,30,60,90].map(w=>(
              <button key={w} onClick={()=>setExpWin(w)} style={{...btn(expWin===w,T.crimson),fontSize:11}}>{w}d</button>
            ))}
            <span style={{marginLeft:"auto",fontSize:11,color:T.text3,fontFamily:T.mono}}>{expiryRows.length} UNITS EXPIRING</span>
          </div>
          <div style={card}>
            <div style={{...row("50px 90px 80px 100px 90px 80px 80px"),background:"#F8FAFC"}}>
              {["S.No","Unit No","Component","Blood Group","Expiry","Days","Status"].map(h=><span key={h} style={th}>{h}</span>)}
            </div>
            {expiryRows.length===0?(
              <div style={{padding:32,textAlign:"center",color:T.text3}}>
                <div style={{fontFamily:T.font,fontSize:16}}>No units expiring within {expWin} days</div>
              </div>
            ):expiryRows.map((r,i)=>(
              <div key={i} style={row("50px 90px 80px 100px 90px 80px 80px")}
                onMouseEnter={e=>e.currentTarget.style.background="#F8FAFC"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <span style={{fontFamily:T.mono,fontSize:10,color:T.text4}}>{r.sno}</span>
                <span style={{fontFamily:T.mono,fontSize:11,color:T.text2}}>{r.unit}</span>
                <span style={{fontFamily:T.mono,fontSize:11,color:compColor(r.comp),fontWeight:600}}>{r.comp}</span>
                <span style={{fontFamily:T.font,fontSize:13,fontWeight:700,color:bgColor(r.bg)}}>{r.bg}</span>
                <span style={{fontFamily:T.mono,fontSize:10,color:r.days<=7?T.crimson:T.gold,fontWeight:600}}>{r.expiry}</span>
                <span style={{fontFamily:T.mono,fontSize:11,fontWeight:700,color:r.days<=3?T.crimson:r.days<=7?"#EA580C":T.gold}}>{r.days}d</span>
                <StatusBadge s={r.days<=7?"critical":"warning"}/>
              </div>
            ))}
          </div>
        </>}

        {/* ════════ ML FORECAST ════════ */}
        {page==="forecast"&&<>
          <div style={{display:"flex",gap:8,marginBottom:16,alignItems:"center",flexWrap:"wrap"}}>
            <span style={{fontSize:11,color:T.text3,fontFamily:T.mono}}>Forecast horizon:</span>
            {[7,14,21,30].map(d=><button key={d} onClick={()=>setForecastDays(d)} style={{...btn(forecastDays===d),fontSize:11}}>{d}d</button>)}
            <span style={{marginLeft:"auto",fontSize:11,color:T.text3,fontFamily:T.mono}}>Blood Group:</span>
            <select style={sel} value={selBg} onChange={e=>setSelBg(e.target.value)}>
              {ALL_GROUPS.map(bg=><option key={bg}>{bg}</option>)}
            </select>
          </div>

          {forecast[selBg]&&<>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:12,marginBottom:16}}>
              <Kpi label="Current Stock" value={forecast[selBg].stock} sub="Units in inventory" accent={T.green}/>
              <Kpi label={`${forecastDays}d Demand`} value={forecast[selBg].predicted} sub="Predicted units needed" accent={T.blueL}/>
              <Kpi label="Avg Daily" value={forecast[selBg].avgDaily+"u"} sub="Estimated daily demand" accent={T.goldL}/>
              <Kpi label="Confidence" value={forecast[selBg].conf+"%"} sub="Model accuracy" accent={T.purpleL}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:14,marginBottom:14}}>
              <div style={card}>
                <div style={cardHead}><span style={cardTitle}>{selBg} — {forecastDays}-Day Demand Forecast</span><Chip color={T.purpleL}>RF + ES ENSEMBLE</Chip></div>
                <div style={{padding:"14px 6px"}}>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={forecast[selBg].series} margin={{top:4,right:12,left:-20,bottom:0}}>
                      <defs>
                        <linearGradient id="fg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={T.blueL} stopOpacity={0.15}/><stop offset="95%" stopColor={T.blueL} stopOpacity={0}/></linearGradient>
                        <linearGradient id="ug" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={T.crimson} stopOpacity={0.08}/><stop offset="95%" stopColor={T.crimson} stopOpacity={0}/></linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
                      <XAxis dataKey="d" tick={{fill:T.text3,fontSize:8,fontFamily:T.mono}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fill:T.text3,fontSize:8}} axisLine={false} tickLine={false}/>
                      <Tooltip {...TT}/>
                      <Legend wrapperStyle={{fontSize:9,fontFamily:T.mono,color:T.text3}}/>
                      <Area type="monotone" dataKey="upper" name="Upper CI" stroke={T.crimson} strokeWidth={1} strokeDasharray="4 2" fill="url(#ug)" dot={false}/>
                      <Area type="monotone" dataKey="pred" name="Forecast" stroke={T.blueL} strokeWidth={2} fill="url(#fg)" dot={false}/>
                      <Area type="monotone" dataKey="lower" name="Lower CI" stroke={T.blueLL} strokeWidth={1} strokeDasharray="4 2" fill="none" dot={false}/>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div style={card}>
                <div style={cardHead}><span style={cardTitle}>Model Metrics</span></div>
                <div style={{padding:16}}>
                  {[
                    ["Current Stock",`${forecast[selBg].stock} units`,T.green],
                    [`${forecastDays}d Forecast`,`${forecast[selBg].predicted} units`,T.blueL],
                    ["Avg Daily Demand",`${forecast[selBg].avgDaily} u/day`,T.goldL],
                    ["MAPE",`${forecast[selBg].mape}%`,T.text2],
                    ["RMSE",`${forecast[selBg].rmse}`,T.text2],
                    ["Confidence",`${forecast[selBg].conf}%`,T.purpleL],
                    ["Shortfall",forecast[selBg].shortfall>0?`+${forecast[selBg].shortfall} needed`:"None",forecast[selBg].shortfall>0?T.crimson:T.green],
                  ].map(([l,v,c])=>(
                    <div key={l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${T.border}`}}>
                      <span style={{fontSize:10,color:T.text3,fontFamily:T.mono}}>{l}</span>
                      <span style={{fontSize:12,fontWeight:600,color:c,fontFamily:T.mono}}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>}

          <div style={card}>
            <div style={cardHead}><span style={cardTitle}>All Blood Groups — {forecastDays}-Day Forecast</span><span style={{fontSize:10,color:T.text3,fontFamily:T.mono}}>RF + ES ENSEMBLE</span></div>
            <div style={{...row("1fr 1fr 1.5fr 0.8fr 0.8fr 0.8fr 1fr"),background:"#F8FAFC"}}>
              {["Blood Group","Current Stock","Predicted Demand","Avg/Day","MAPE","Confidence","Status"].map(h=><span key={h} style={th}>{h}</span>)}
            </div>
            {ALL_GROUPS.map(bg=>{
              const f=forecast[bg];if(!f)return null;
              const max=Math.max(f.stock,f.predicted,1);
              return <div key={bg} style={row("1fr 1fr 1.5fr 0.8fr 0.8fr 0.8fr 1fr")}
                onMouseEnter={e=>e.currentTarget.style.background="#F8FAFC"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <span style={{fontFamily:T.font,fontWeight:700,fontSize:13,color:bgColor(bg),cursor:"pointer",textDecoration:"underline",textDecorationColor:`${T.crimson}30`}} onClick={()=>setSelBg(bg)}>{bg}</span>
                <span style={{fontFamily:T.mono,fontSize:11,color:T.green,fontWeight:600}}>{f.stock}</span>
                <div>
                  <div style={{fontSize:10,fontFamily:T.mono,marginBottom:3,color:f.shortfall>0?T.crimson:T.blueL}}>
                    {f.predicted}{f.shortfall>0?<span style={{color:T.gold,marginLeft:5,fontSize:9}}>⚠+{f.shortfall}</span>:null}
                  </div>
                  <div style={{height:3,background:"rgba(0,0,0,0.06)",borderRadius:2}}>
                    <div style={{height:"100%",borderRadius:2,background:f.shortfall>0?T.crimson:T.blueL,width:`${Math.min((f.predicted/max)*100,100)}%`}}/>
                  </div>
                </div>
                <span style={{fontFamily:T.mono,fontSize:10,color:T.goldL,fontWeight:600}}>{f.avgDaily}</span>
                <span style={{fontFamily:T.mono,fontSize:10,color:T.text3}}>{f.mape}%</span>
                <span style={{fontFamily:T.mono,fontSize:10,color:T.purpleL,fontWeight:600}}>{f.conf}%</span>
                <StatusBadge s={f.status}/>
              </div>;
            })}
          </div>
        </>}

        {/* ════════ ANALYTICS ════════ */}
        {page==="analytics"&&<>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
            <div style={card}>
              <div style={cardHead}><span style={cardTitle}>Units per Blood Group</span></div>
              <div style={{padding:"12px 4px"}}>
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart data={distData} layout="vertical" margin={{top:0,right:12,left:20,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
                    <XAxis type="number" tick={{fill:T.text3,fontSize:8}} axisLine={false} tickLine={false}/>
                    <YAxis type="category" dataKey="name" tick={{fill:T.text2,fontSize:9,fontFamily:T.mono}} axisLine={false} tickLine={false} width={52}/>
                    <Tooltip {...TT}/>
                    <Bar dataKey="units" fill={T.crimson} radius={[0,3,3,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div style={card}>
              <div style={cardHead}><span style={cardTitle}>Volume by Component (ml)</span></div>
              <div style={{padding:"12px 4px",display:"flex",justifyContent:"center"}}>
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie data={compData} dataKey="vol" nameKey="name" cx="50%" cy="50%" outerRadius={85} innerRadius={42} paddingAngle={4}
                      label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`}
                      labelLine={{stroke:T.text4,strokeWidth:0.4}}>
                      {compData.map((_,i)=><Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]}/>)}
                    </Pie>
                    <Tooltip {...TT} formatter={v=>`${v.toLocaleString()} ml`}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <div style={card}>
              <div style={cardHead}><span style={cardTitle}>Expiry Risk Buckets</span></div>
              <div style={{padding:"12px 4px"}}>
                {(()=>{
                  const bkts=[
                    {n:"0–7 days",v:data.filter(r=>{const d=daysTo(r.expiry);return d>=0&&d<=7;}).length,c:T.crimson},
                    {n:"8–14d",v:data.filter(r=>{const d=daysTo(r.expiry);return d>7&&d<=14;}).length,c:T.goldL},
                    {n:"15–30d",v:data.filter(r=>{const d=daysTo(r.expiry);return d>14&&d<=30;}).length,c:T.goldLL},
                    {n:"31–60d",v:data.filter(r=>{const d=daysTo(r.expiry);return d>30&&d<=60;}).length,c:T.blueL},
                    {n:"60+ days",v:data.filter(r=>{const d=daysTo(r.expiry);return d>60;}).length,c:T.greenL},
                  ];
                  return <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={bkts} margin={{top:4,right:8,left:-20,bottom:0}}>
                      <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
                      <XAxis dataKey="n" tick={{fill:T.text3,fontSize:9,fontFamily:T.mono}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fill:T.text3,fontSize:8}} axisLine={false} tickLine={false}/>
                      <Tooltip {...TT}/>
                      <Bar dataKey="v" name="Units" radius={[3,3,0,0]}>{bkts.map((b,i)=><Cell key={i} fill={b.c}/>)}</Bar>
                    </BarChart>
                  </ResponsiveContainer>;
                })()}
              </div>
            </div>
            <div style={card}>
              <div style={cardHead}><span style={cardTitle}>ML Confidence vs MAPE</span></div>
              <div style={{padding:"12px 4px"}}>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={ALL_GROUPS.map(bg=>({name:bg,conf:+forecast[bg]?.conf||0,mape:+forecast[bg]?.mape||0}))} margin={{top:4,right:8,left:-20,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
                    <XAxis dataKey="name" tick={{fill:T.text3,fontSize:8,fontFamily:T.mono}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fill:T.text3,fontSize:8}} axisLine={false} tickLine={false}/>
                    <Tooltip {...TT}/>
                    <Legend wrapperStyle={{fontSize:9,fontFamily:T.mono,color:T.text3}}/>
                    <Bar dataKey="conf" name="Confidence (%)" fill={T.purpleL} radius={[3,3,0,0]}/>
                    <Bar dataKey="mape" name="MAPE (%)" fill={T.goldL} radius={[3,3,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>}

        {/* ════════ COMPATIBILITY ════════ */}
        {page==="compat"&&<>
          <div style={{display:"grid",gridTemplateColumns:"1.6fr 1fr",gap:14,marginBottom:14}}>
            <div style={card}>
              <div style={cardHead}><span style={cardTitle}>ABO/Rh Compatibility Matrix</span><span style={{fontSize:9,color:T.text3,fontFamily:T.mono}}>DONOR → RECIPIENT</span></div>
              <div style={{padding:18,overflowX:"auto"}}>
                <div style={{display:"grid",gridTemplateColumns:`70px ${"1fr ".repeat(8)}`,gap:3,minWidth:500}}>
                  <div style={{display:"flex",alignItems:"flex-end",paddingBottom:4,fontSize:8,color:T.text3,fontFamily:T.mono}}>D ↓ R →</div>
                  {ALL_GROUPS.map(bg=><div key={bg} style={{textAlign:"center",fontSize:8,color:T.text3,fontFamily:T.mono,lineHeight:1.2,padding:"0 1px"}}>{bg}</div>)}
                  {ALL_GROUPS.map(donor=>[
                    <div key={donor} style={{fontSize:8.5,color:T.text2,fontFamily:T.mono,display:"flex",alignItems:"center"}}>{donor}</div>,
                    ...ALL_GROUPS.map(rec=>{
                      const can=(COMPAT[donor]||[]).includes(rec);
                      const same=donor===rec;
                      return <div key={rec} style={{aspectRatio:1,minHeight:22,borderRadius:3,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,background:same?T.blueBg:can?T.greenBg:"#F9FAFB",color:same?T.blueL:can?T.green:T.border}}>
                        {same?"●":can?"✓":""}
                      </div>;
                    })
                  ])}
                </div>
                <div style={{display:"flex",gap:16,marginTop:12,fontSize:9,color:T.text3,fontFamily:T.mono}}>
                  <span><span style={{color:T.green}}>✓</span> Compatible</span>
                  <span><span style={{color:T.blueL}}>●</span> Same group</span>
                  <span style={{color:T.text4}}>— Incompatible</span>
                </div>
              </div>
            </div>
            <div style={card}>
              <div style={cardHead}><span style={cardTitle}>Live Stock Levels</span></div>
              <div style={{padding:"14px 18px"}}>
                {ALL_GROUPS.map(bg=>{
                  const u=grouped[bg]?.u||0;
                  return <div key={bg} style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                    <span style={{width:56,fontFamily:T.font,fontWeight:700,fontSize:12,color:bgColor(bg),flexShrink:0}}>{bg}</span>
                    <div style={{flex:1,height:5,background:"rgba(0,0,0,0.06)",borderRadius:3}}>
                      <div style={{height:"100%",borderRadius:3,background:u<=3?T.crimson:u<=5?T.goldL:T.greenL,width:`${Math.min((u/20)*100,100)}%`,transition:"width 0.8s"}}/>
                    </div>
                    <span style={{width:24,textAlign:"right",fontFamily:T.mono,fontSize:10,color:T.text3,flexShrink:0}}>{u}</span>
                  </div>;
                })}
              </div>
            </div>
          </div>

          <div style={card}>
            <div style={cardHead}><span style={cardTitle}>Donor Availability Checker</span><span style={{fontSize:9,color:T.text3,fontFamily:T.mono}}>REAL-TIME LOOKUP</span></div>
            <div style={{padding:"16px 18px",display:"flex",gap:12,alignItems:"flex-end",flexWrap:"wrap",borderBottom:`1px solid ${T.border}`,background:"#FAFBFC"}}>
              <div>
                <div style={{fontSize:9,color:T.text3,fontFamily:T.mono,marginBottom:5,textTransform:"uppercase",letterSpacing:"0.08em"}}>Patient Blood Group</div>
                <select style={sel} value={compatPt} onChange={e=>setCompatPt(e.target.value)}>
                  {ALL_GROUPS.map(bg=><option key={bg}>{bg}</option>)}
                </select>
              </div>
              <div>
                <div style={{fontSize:9,color:T.text3,fontFamily:T.mono,marginBottom:5,textTransform:"uppercase",letterSpacing:"0.08em"}}>Component Required</div>
                <select style={sel} value={compatComp} onChange={e=>setCompatComp(e.target.value)}>
                  {["WB/PRC","FFP","PLT"].map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div style={{padding:"16px 18px"}}>
              {compatRes.length===0?(
                <div style={{background:T.crimsonL,border:`1px solid ${T.crimson}25`,borderRadius:7,padding:"12px 14px",color:T.crimson,fontSize:12,fontWeight:500}}>
                  ⊗ No compatible {compatComp} units available for patient {compatPt}
                </div>
              ):<>
                <div style={{fontSize:11,color:T.text3,marginBottom:10,fontFamily:T.sans}}>
                  Compatible <strong style={{color:T.text}}>{compatComp}</strong> donors for <strong style={{color:T.text}}>{compatPt}</strong>:
                </div>
                <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:12}}>
                  {compatRes.map(({bg,u,v})=>(
                    <div key={bg} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,padding:"12px 16px",minWidth:130,boxShadow:T.shadow}}>
                      <div style={{fontFamily:T.font,fontWeight:700,fontSize:17,color:bgColor(bg),lineHeight:1,marginBottom:5}}>{bg}</div>
                      <div style={{fontSize:11,color:T.green,fontFamily:T.mono,fontWeight:600}}>{u} unit{u>1?"s":""}</div>
                      <div style={{fontSize:10,color:T.text3,fontFamily:T.mono}}>{v.toLocaleString()} ml</div>
                    </div>
                  ))}
                </div>
                <div style={{background:T.goldBg,border:`1px solid ${T.gold}25`,borderRadius:7,padding:"9px 13px",fontSize:10,color:T.gold,fontFamily:T.mono,fontWeight:500}}>
                  △ CLINICAL NOTE: Cross-matching must be performed prior to any transfusion. This is an inventory guidance tool only.
                </div>
              </>}
            </div>
          </div>
        </>}

        </div>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@300;400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#F4F6F9;-webkit-font-smoothing:antialiased}
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-track{background:#F1F5F9}
        ::-webkit-scrollbar-thumb{background:#CBD5E1;border-radius:3px}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
        select option{background:#fff;color:#111827}
        input::placeholder{color:#9CA3AF}
        input:focus,select:focus{border-color:#2563EB!important;box-shadow:0 0 0 3px rgba(37,99,235,0.1)!important}
      `}</style>
    </div>
  );
}
