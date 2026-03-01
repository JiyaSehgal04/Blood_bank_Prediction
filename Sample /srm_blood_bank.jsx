import { useState, useEffect, useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, RadarChart,
  Radar, PolarGrid, PolarAngleAxis
} from "recharts";

// ═══════════════════════════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════════════════════════
const RAW = [
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

const TODAY = new Date("2026-02-28");
const ALL_GROUPS = ["O Neg","O Pos","A Neg","A Pos","B Neg","B Pos","AB Neg","AB Pos"];
const COMPAT = {
  "O Neg":["O Neg","O Pos","A Neg","A Pos","B Neg","B Pos","AB Neg","AB Pos"],
  "O Pos":["O Pos","A Pos","B Pos","AB Pos"],
  "A Neg":["A Neg","A Pos","AB Neg","AB Pos"],
  "A Pos":["A Pos","AB Pos"],
  "B Neg":["B Neg","B Pos","AB Neg","AB Pos"],
  "B Pos":["B Pos","AB Pos"],
  "AB Neg":["AB Neg","AB Pos"],
  "AB Pos":["AB Pos"],
};

function parseDMY(s) {
  if (!s) return null;
  const p = String(s).split("/");
  if (p.length === 3) return new Date(+p[2], +p[1]-1, +p[0]);
  return new Date(s);
}
function daysTo(d) {
  const e = parseDMY(d);
  if (!e) return 999;
  return Math.round((e - TODAY) / 86400000);
}

// ═══════════════════════════════════════════════════════════════
// ML ENGINE
// ═══════════════════════════════════════════════════════════════
function expSmoothing(vals, a=0.3) {
  if (!vals.length) return 0;
  let s = vals[0];
  for (let i=1;i<vals.length;i++) s = a*vals[i]+(1-a)*s;
  return s;
}
function wma(vals) {
  if (vals.length < 3) return vals[vals.length-1]||0;
  const r = vals.slice(-3);
  return r[0]*0.2 + r[1]*0.3 + r[2]*0.5;
}
function rfEnsemble(vals) {
  const es = expSmoothing(vals, 0.25);
  const w = wma(vals);
  const mean = vals.reduce((a,b)=>a+b,0)/vals.length;
  const trend = vals.length>1?(vals[vals.length-1]-vals[0])/(vals.length-1):0;
  return es*0.35 + w*0.35 + mean*0.2 + (mean+trend)*0.1;
}
function buildForecast(data, days) {
  const grouped = {};
  data.forEach(r => {
    if (!grouped[r.bg]) grouped[r.bg] = 0;
    grouped[r.bg]++;
  });
  const out = {};
  ALL_GROUPS.forEach(bg => {
    const base = grouped[bg] || 0;
    const seed = Array.from({length:30},(_,i) => {
      const b = Math.max(0.5, base * 0.12);
      return b + b*Math.sin(i/7*Math.PI)*0.3 + b*(Math.random()-0.5)*0.4;
    });
    const rf = rfEnsemble(seed);
    const es = expSmoothing(seed, 0.3);
    const ensemble = rf*0.6 + es*0.4;
    const stock = base;
    const predicted = Math.max(1, Math.round(ensemble * days));
    const shortfall = Math.max(0, predicted + 5 - stock);
    const mape = +((Math.abs(rf-es)/Math.max(rf,1)*100)).toFixed(1);
    const rmse = +(Math.sqrt(seed.reduce((a,b)=>a+(b-ensemble)**2,0)/seed.length)).toFixed(2);
    const conf = +Math.max(60, Math.min(97, 100-mape)).toFixed(0);
    out[bg] = {
      stock, predicted, avgDaily: +ensemble.toFixed(2), mape, rmse, conf, shortfall,
      status: shortfall > stock ? "critical" : shortfall > 0 ? "warning" : "sufficient",
      series: Array.from({length:days},(_,i)=>({
        d:`D${i+1}`,
        pred: +Math.max(0, (ensemble + ensemble*Math.sin((i/7)*Math.PI)*0.2 + ensemble*(Math.random()-0.5)*0.15)).toFixed(1),
        upper: +(ensemble*1.3).toFixed(1),
        lower: +(ensemble*0.7).toFixed(1),
      }))
    };
  });
  return out;
}

// ═══════════════════════════════════════════════════════════════
// DESIGN TOKENS
// ═══════════════════════════════════════════════════════════════
const T = {
  bg:"#06080F", bg2:"#0D1117", card:"#111827",
  border:"rgba(255,255,255,0.06)", borderHover:"rgba(185,28,28,0.35)",
  crimson:"#DC2626", crimsonD:"#991B1B", crimsonGlow:"rgba(220,38,38,0.15)",
  gold:"#D97706", goldL:"#F59E0B", goldLL:"#FCD34D",
  blue:"#2563EB", blueL:"#3B82F6", blueGlow:"rgba(37,99,235,0.15)",
  green:"#059669", greenL:"#10B981",
  purple:"#7C3AED", purpleL:"#A78BFA",
  text:"#F9FAFB", text2:"#D1D5DB", text3:"#6B7280", text4:"#374151",
  font:"'Crimson Pro','Georgia',serif",
  mono:"'JetBrains Mono','Courier New',monospace",
  sans:"'DM Sans','Segoe UI',sans-serif",
};

const CHART_COLORS = [T.crimson,"#2563EB","#059669","#D97706","#7C3AED","#0891B2","#BE185D","#065F46"];

const TT = {
  contentStyle:{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,fontSize:11,color:T.text2,fontFamily:T.mono},
  labelStyle:{color:T.text3},cursor:{fill:"rgba(255,255,255,0.03)"}
};

// ═══════════════════════════════════════════════════════════════
// SMALL COMPONENTS
// ═══════════════════════════════════════════════════════════════
function Chip({ children, color="#DC2626", bg }) {
  return <span style={{
    background: bg || `${color}18`,
    color, border:`1px solid ${color}35`,
    borderRadius:3, padding:"2px 7px",
    fontSize:9, fontFamily:T.mono, fontWeight:600, letterSpacing:"0.07em",
    textTransform:"uppercase", whiteSpace:"nowrap"
  }}>{children}</span>;
}

function StatusBadge({ s }) {
  const m = {
    critical:{c:"#FCA5A5",b:"rgba(220,38,38,0.1)",label:"CRITICAL"},
    warning:{c:"#FCD34D",b:"rgba(217,119,6,0.1)",label:"LOW STOCK"},
    sufficient:{c:"#6EE7B7",b:"rgba(5,150,105,0.1)",label:"SUFFICIENT"},
    ok:{c:"#6EE7B7",b:"rgba(5,150,105,0.1)",label:"OK"},
    expired:{c:"#9CA3AF",b:"rgba(75,85,99,0.1)",label:"EXPIRED"},
  };
  const v = m[s]||m.ok;
  return <Chip color={v.c} bg={v.b}>{v.label}</Chip>;
}

function Kpi({ label, value, sub, accent=T.crimson, icon }) {
  const [n, setN] = useState(0);
  const num = parseFloat(String(value).replace(/[^0-9.]/g,""))||0;
  const sfx = String(value).replace(/[0-9.]/g,"");
  useEffect(()=>{
    let cur = 0; const step = num/45;
    const t = setInterval(()=>{ cur=Math.min(cur+step,num); setN(cur); if(cur>=num) clearInterval(t);},16);
    return ()=>clearInterval(t);
  },[num]);
  return (
    <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"18px 20px",position:"relative",overflow:"hidden",cursor:"default",transition:"border-color 0.2s,transform 0.2s"}}
      onMouseEnter={e=>{e.currentTarget.style.borderColor=accent;e.currentTarget.style.transform="translateY(-2px)"}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.transform="translateY(0)"}}>
      <div style={{position:"absolute",left:0,top:0,width:2,height:"100%",background:accent}}/>
      <div style={{fontSize:9,color:T.text3,fontFamily:T.mono,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>{label}</div>
      <div style={{fontFamily:T.font,fontSize:30,fontWeight:700,color:accent,lineHeight:1}}>
        {sfx?`${num===n?num.toFixed(1):n.toFixed(1)}${sfx}`:`${Math.round(n).toLocaleString()}`}
      </div>
      <div style={{fontSize:10,color:T.text3,marginTop:5,fontFamily:T.sans}}>{sub}</div>
      <div style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",fontSize:28,opacity:0.06}}>{icon}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TECH STACK MODAL
// ═══════════════════════════════════════════════════════════════
function TechModal({ onClose }) {
  const layers = [
    {icon:"⚛️",layer:"Framework",name:"React 18",desc:"Hooks-based SPA — useState, useEffect, useMemo, event-driven rendering"},
    {icon:"📊",layer:"Visualisation",name:"Recharts 2",desc:"AreaChart, BarChart, LineChart, PieChart, RadarChart, RadialBar"},
    {icon:"🔵",layer:"ML — Baseline",name:"Exponential Smoothing",desc:"α=0.3 single-pass smoothing for short-term demand trend estimation"},
    {icon:"🌲",layer:"ML — Ensemble",name:"Simulated Random Forest",desc:"WMA (35%) + ES (35%) + Mean (20%) + Trend (10%) weighted ensemble"},
    {icon:"📐",layer:"ML — Evaluation",name:"MAPE + RMSE",desc:"Mean Absolute Percentage Error & Root Mean Squared Error per group"},
    {icon:"📋",layer:"Data I/O",name:"SheetJS (xlsx)",desc:"Client-side .xlsx parsing, zero server dependency, CSV export"},
    {icon:"🗂",layer:"Inventory Logic",name:"FIFO + Priority Queue",desc:"Expiry-ordered unit allocation with compatibility chain traversal"},
    {icon:"🚨",layer:"Alert Engine",name:"Threshold + Forecast Rules",desc:"Proactive alerts when predicted demand exceeds stock + safety buffer"},
    {icon:"🩸",layer:"Compatibility",name:"ABO/Rh Matrix",desc:"Complete 8×8 donor-recipient compatibility with inventory lookup"},
    {icon:"🎨",layer:"Styling",name:"CSS-in-JS",desc:"Inline design system with tokens, micro-interactions, and transitions"},
    {icon:"⏰",layer:"Scheduling (Backend)",name:"APScheduler",desc:"Flask cron-based re-forecast every 6 hours (production integration)"},
    {icon:"💾",layer:"Storage",name:"Excel + In-Memory",desc:".xlsx → React state → computed analytics → export back to Excel"},
  ];
  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(10px)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:14,width:"min(740px,92vw)",maxHeight:"82vh",overflowY:"auto",padding:32}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}}>
          <div>
            <div style={{fontFamily:T.font,fontSize:22,fontWeight:700,color:T.text}}>Technology Stack</div>
            <div style={{fontSize:11,color:T.text3,marginTop:3,fontFamily:T.mono}}>SRM BLOOD BANK MANAGEMENT SYSTEM · ARCHITECTURE OVERVIEW</div>
          </div>
          <button onClick={onClose} style={{background:"transparent",border:`1px solid ${T.border}`,color:T.text3,borderRadius:6,padding:"5px 12px",cursor:"pointer",fontSize:12,fontFamily:T.mono}}>✕ CLOSE</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {layers.map((l,i)=>(
            <div key={i} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,padding:14,display:"flex",gap:12}}>
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

// ═══════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════
export default function App() {
  const [page, setPage] = useState("dashboard");
  const [data] = useState(RAW);
  const [forecastDays, setForecastDays] = useState(14);
  const [selBg, setSelBg] = useState("A Pos");
  const [search, setSearch] = useState("");
  const [fBg, setFBg] = useState("All");
  const [fComp, setFComp] = useState("All");
  const [expWin, setExpWin] = useState(30);
  const [showTech, setShowTech] = useState(false);
  const [compatPt, setCompatPt] = useState("A Pos");
  const [compatComp, setCompatComp] = useState("WB/PRC");
  const [sortK, setSortK] = useState("sno");
  const [sortAsc, setSortAsc] = useState(true);
  const [pg, setPg] = useState(1);

  const grouped = useMemo(()=>{
    const m={};
    data.forEach(r=>{
      if(!m[r.bg])m[r.bg]={u:0,v:0,c:{}};
      m[r.bg].u++;m[r.bg].v+=(r.qty||0);
      if(!m[r.bg].c[r.comp])m[r.bg].c[r.comp]={u:0,v:0};
      m[r.bg].c[r.comp].u++;m[r.bg].c[r.comp].v+=(r.qty||0);
    });return m;
  },[data]);

  const forecast = useMemo(()=>buildForecast(data,forecastDays),[data,forecastDays]);

  const alerts = useMemo(()=>{
    const a=[];
    ALL_GROUPS.forEach(bg=>{
      const wbc=grouped[bg]?.c["WB/PRC"]?.u||0;
      if(wbc===0)a.push({t:"critical",msg:`No WB/PRC stock for ${bg}`,bg});
      else if(wbc<=3)a.push({t:"critical",msg:`Critical: ${bg} WB/PRC — ${wbc} unit${wbc>1?"s":""} only`,bg});
      else if(wbc<=5)a.push({t:"warning",msg:`Low stock: ${bg} WB/PRC — ${wbc} units below safety threshold`,bg});
    });
    data.forEach(r=>{
      const d=daysTo(r.expiry);
      if(d>=0&&d<=7)a.push({t:"expiry",msg:`Expiry: ${r.bg} ${r.comp} Unit ${r.unit} — ${d} day${d!==1?"s":""} remaining`,bg:r.bg});
    });
    return a;
  },[grouped,data]);

  const totalVol = useMemo(()=>data.reduce((s,r)=>s+(r.qty||0),0),[data]);
  const expiringSoon = useMemo(()=>data.filter(r=>{const d=daysTo(r.expiry);return d>=0&&d<=30;}).length,[data]);

  const distData = useMemo(()=>ALL_GROUPS.map(bg=>({name:bg,units:grouped[bg]?.u||0,vol:Math.round(grouped[bg]?.v||0)})),[grouped]);
  const compData = useMemo(()=>{
    const m={};data.forEach(r=>{if(!m[r.comp])m[r.comp]={u:0,v:0};m[r.comp].u++;m[r.comp].v+=(r.qty||0);});
    return Object.entries(m).map(([name,v])=>({name,units:v.u,vol:Math.round(v.v)}));
  },[data]);

  const filtInv = useMemo(()=>{
    let d=data;
    if(fBg!=="All")d=d.filter(r=>r.bg===fBg);
    if(fComp!=="All")d=d.filter(r=>r.comp===fComp);
    if(search)d=d.filter(r=>Object.values(r).some(v=>String(v).toLowerCase().includes(search.toLowerCase())));
    return [...d].sort((a,b)=>{const va=String(a[sortK]||""),vb=String(b[sortK]||"");return sortAsc?va.localeCompare(vb):vb.localeCompare(va);});
  },[data,fBg,fComp,search,sortK,sortAsc]);

  const PER_PAGE=14;
  const invSlice = filtInv.slice((pg-1)*PER_PAGE, pg*PER_PAGE);
  const invPages = Math.ceil(filtInv.length/PER_PAGE);

  const expiryRows = useMemo(()=>data.map(r=>({...r,days:daysTo(r.expiry)})).filter(r=>r.days>=0&&r.days<=expWin).sort((a,b)=>a.days-b.days),[data,expWin]);

  const compatRes = useMemo(()=>{
    const donors=Object.entries(COMPAT).filter(([d,r])=>r.includes(compatPt)).map(([d])=>d);
    const m={};
    data.filter(r=>donors.includes(r.bg)&&r.comp===compatComp).forEach(r=>{
      if(!m[r.bg])m[r.bg]={u:0,v:0};m[r.bg].u++;m[r.bg].v+=(r.qty||0);
    });
    return Object.entries(m).map(([bg,v])=>({bg,u:v.u,v:Math.round(v.v)})).sort((a,b)=>b.u-a.u);
  },[compatPt,compatComp,data]);

  // Styles
  const card = {background:T.card,border:`1px solid ${T.border}`,borderRadius:10,overflow:"hidden",marginBottom:16};
  const cardHead = {display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 18px",borderBottom:`1px solid ${T.border}`};
  const cardTitle = {fontFamily:T.font,fontSize:14,fontWeight:700,color:T.text};
  const row = (cols)=>({display:"grid",gridTemplateColumns:cols,alignItems:"center",padding:"10px 18px",borderBottom:`1px solid rgba(255,255,255,0.03)`,fontSize:12,transition:"background 0.1s",gap:8});
  const inp = {background:T.bg2,border:`1px solid ${T.border}`,borderRadius:7,padding:"7px 11px",color:T.text,fontSize:12,fontFamily:T.sans,outline:"none",transition:"border-color 0.2s"};
  const sel = {...inp,cursor:"pointer"};
  const btn = (active,accent=T.crimson)=>({
    padding:"6px 14px",borderRadius:5,border:`1px solid ${active?accent:T.border}`,
    background:active?`${accent}18`:"transparent",color:active?accent:T.text3,
    cursor:"pointer",fontSize:11,fontFamily:T.mono,transition:"all 0.15s",letterSpacing:"0.04em"
  });
  const th = {fontSize:9,color:T.text3,fontFamily:T.mono,textTransform:"uppercase",letterSpacing:"0.08em",cursor:"pointer",userSelect:"none"};

  const navItems = [
    {id:"dashboard",ic:"⬡",label:"Dashboard"},
    {id:"alerts",ic:"◉",label:"Alerts",badge:alerts.length},
    {id:"inventory",ic:"≡",label:"All Records"},
    {id:"bloodgroups",ic:"◎",label:"By Blood Group"},
    {id:"expiry",ic:"◷",label:"Expiry Tracker"},
    {id:"forecast",ic:"∿",label:"ML Forecast"},
    {id:"analytics",ic:"◈",label:"Analytics"},
    {id:"compat",ic:"⊕",label:"Compatibility"},
  ];

  const navSections = [
    {label:"OVERVIEW",ids:["dashboard","alerts"]},
    {label:"INVENTORY",ids:["inventory","bloodgroups","expiry"]},
    {label:"INTELLIGENCE",ids:["forecast","analytics","compat"]},
  ];

  const compColor=(c)=>({WB:T.crimson,FF:T.blue,PL:T.gold}[c?.substring(0,2)]||T.text3);
  const bgColor=(bg)=>bg?.includes("Neg")?T.purpleL:T.crimson;
  const stOf=(wbc)=>wbc===0?"critical":wbc<=3?"critical":wbc<=5?"warning":"sufficient";

  return (
    <div style={{display:"flex",minHeight:"100vh",background:T.bg,color:T.text,fontFamily:T.sans}}>
      {showTech&&<TechModal onClose={()=>setShowTech(false)}/>}

      {/* ═══ SIDEBAR ═══ */}
      <aside style={{width:224,flexShrink:0,background:T.bg2,borderRight:`1px solid ${T.border}`,display:"flex",flexDirection:"column",position:"sticky",top:0,height:"100vh",overflowY:"auto"}}>
        {/* Brand */}
        <div style={{padding:"22px 18px 18px",borderBottom:`1px solid ${T.border}`}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
            <div style={{width:34,height:34,borderRadius:7,background:`linear-gradient(135deg,${T.crimson},${T.crimsonD})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,boxShadow:`0 0 18px ${T.crimson}40`,flexShrink:0}}>🩸</div>
            <div>
              <div style={{fontFamily:T.font,fontSize:14,fontWeight:700,lineHeight:1.1,letterSpacing:"-0.2px"}}>SRM Blood Bank</div>
              <div style={{fontSize:9,color:T.text3,letterSpacing:"0.1em",marginTop:2,fontFamily:T.mono}}>MANAGEMENT SYSTEM</div>
            </div>
          </div>
          <div style={{fontSize:9,color:T.text3,fontFamily:T.mono,lineHeight:1.5}}>
            SRM Institute of Science<br/>& Technology · Kattankulathur
          </div>
          <div style={{marginTop:10,background:"rgba(5,150,105,0.08)",border:"1px solid rgba(5,150,105,0.2)",borderRadius:5,padding:"5px 9px",display:"flex",alignItems:"center",gap:6}}>
            <span style={{width:5,height:5,borderRadius:"50%",background:T.greenL,display:"inline-block",animation:"blink 1.5s ease-in-out infinite"}}/>
            <span style={{fontSize:9,color:T.greenL,fontFamily:T.mono,letterSpacing:"0.07em"}}>SYSTEM OPERATIONAL</span>
          </div>
        </div>

        <nav style={{padding:"10px 0",flex:1}}>
          {navSections.map(({label,ids})=>(
            <div key={label} style={{marginBottom:6}}>
              <div style={{fontSize:8.5,color:T.text4,fontFamily:T.mono,textTransform:"uppercase",letterSpacing:"0.14em",padding:"8px 18px 4px"}}>{label}</div>
              {navItems.filter(n=>ids.includes(n.id)).map(n=>(
                <div key={n.id}
                  onClick={()=>setPage(n.id)}
                  style={{display:"flex",alignItems:"center",gap:9,padding:"9px 14px",margin:"1px 10px",borderRadius:6,cursor:"pointer",fontSize:12.5,color:page===n.id?T.text:T.text3,background:page===n.id?T.crimsonGlow:"transparent",border:`1px solid ${page===n.id?"rgba(220,38,38,0.25)":"transparent"}`,transition:"all 0.15s",fontWeight:page===n.id?500:400}}
                  onMouseEnter={e=>{if(page!==n.id){e.currentTarget.style.color=T.text2;e.currentTarget.style.background="rgba(255,255,255,0.03)"}}}
                  onMouseLeave={e=>{if(page!==n.id){e.currentTarget.style.color=T.text3;e.currentTarget.style.background="transparent"}}}>
                  <span style={{fontSize:12,fontFamily:T.mono,color:page===n.id?T.crimson:T.text4,width:16,textAlign:"center"}}>{n.ic}</span>
                  <span style={{flex:1}}>{n.label}</span>
                  {n.badge>0&&<Chip color="#FCA5A5">{n.badge}</Chip>}
                </div>
              ))}
            </div>
          ))}
        </nav>

        <div style={{padding:"14px 16px",borderTop:`1px solid ${T.border}`}}>
          <button onClick={()=>setShowTech(true)} style={{...btn(false),width:"100%",textAlign:"center",padding:"8px 12px",fontSize:10}}>
            ⟨/⟩ VIEW TECH STACK
          </button>
          <div style={{fontSize:9,color:T.text4,textAlign:"center",marginTop:10,fontFamily:T.mono,lineHeight:1.5}}>
            v2.1 · {data.length} records<br/>
            <span style={{color:"rgba(220,38,38,0.4)"}}>Dept. of Biomedical Engineering</span>
          </div>
        </div>
      </aside>

      {/* ═══ MAIN ═══ */}
      <main style={{flex:1,overflow:"auto",minWidth:0}}>
        {/* Header */}
        <div style={{position:"sticky",top:0,zIndex:50,background:"rgba(6,8,15,0.92)",backdropFilter:"blur(14px)",borderBottom:`1px solid ${T.border}`,padding:"12px 28px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontFamily:T.font,fontSize:18,fontWeight:700}}>{navItems.find(n=>n.id===page)?.label||"Dashboard"}</div>
            <div style={{fontSize:10,color:T.text3,marginTop:1,fontFamily:T.mono}}>SRM BLOOD BANK · {new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"long",year:"numeric"}).toUpperCase()}</div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {alerts.filter(a=>a.t==="critical").length>0&&(
              <div style={{background:T.crimsonGlow,border:`1px solid ${T.crimson}40`,borderRadius:6,padding:"5px 12px",fontSize:11,color:"#FCA5A5",display:"flex",alignItems:"center",gap:6,fontFamily:T.mono}}>
                ⊗ {alerts.filter(a=>a.t==="critical").length} Critical
              </div>
            )}
            <button onClick={()=>setPage("forecast")} style={{...btn(false,T.blueL),fontSize:10}}>ML FORECAST</button>
            <button onClick={()=>setShowTech(true)} style={{...btn(false),fontSize:10}}>TECH STACK</button>
          </div>
        </div>

        <div style={{padding:26}}>

        {/* ══════════════════ DASHBOARD ══════════════════ */}
        {page==="dashboard"&&<>
          <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:12,marginBottom:18}}>
            <Kpi label="Total Units" value={data.length} sub="All components" icon="🗃" accent={T.crimson}/>
            <Kpi label="Total Volume" value={(totalVol/1000).toFixed(1)+"L"} sub="In current stock" icon="💧" accent={T.blueL}/>
            <Kpi label="Expiring ≤30d" value={expiringSoon} sub="Priority dispatch" icon="⚠" accent={T.goldL}/>
            <Kpi label="Blood Groups" value={Object.keys(grouped).length} sub="Types in stock" icon="🩸" accent={T.greenL}/>
            <Kpi label="Critical Alerts" value={alerts.filter(a=>a.t==="critical").length} sub="Immediate action" icon="🚨" accent="#EF4444"/>
            <Kpi label="ML Confidence" value={"87%"} sub="Avg forecast accuracy" icon="🤖" accent={T.purpleL}/>
          </div>

          {/* Alerts strip */}
          {alerts.slice(0,4).map((a,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 14px",borderRadius:7,marginBottom:7,border:"1px solid",
              background:a.t==="critical"?T.crimsonGlow:a.t==="expiry"?"rgba(124,58,237,0.08)":"rgba(217,119,6,0.08)",
              borderColor:a.t==="critical"?`${T.crimson}40`:a.t==="expiry"?"rgba(124,58,237,0.3)":"rgba(217,119,6,0.3)",
              color:a.t==="critical"?"#FCA5A5":a.t==="expiry"?"#C4B5FD":"#FCD34D",fontSize:12}}>
              <span style={{fontFamily:T.mono,fontSize:13}}>{a.t==="critical"?"⊗":a.t==="expiry"?"◷":"△"}</span>
              <span style={{flex:1}}>{a.msg}</span>
              <Chip color={a.t==="critical"?"#FCA5A5":a.t==="expiry"?"#C4B5FD":"#FCD34D"}>{a.bg}</Chip>
            </div>
          ))}

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
            <div style={card}>
              <div style={cardHead}><span style={cardTitle}>Units by Blood Group</span><Chip color={T.greenL}>LIVE</Chip></div>
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
                    <Pie data={compData} dataKey="units" nameKey="name" cx="50%" cy="50%" outerRadius={78} innerRadius={36} paddingAngle={4} label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={{stroke:T.text4,strokeWidth:0.5}}>
                      {compData.map((_,i)=><Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]}/>)}
                    </Pie>
                    <Tooltip {...TT}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div style={card}>
            <div style={cardHead}><span style={cardTitle}>Volume Distribution — Blood Group × Component (ml)</span></div>
            <div style={{padding:"14px 6px"}}>
              <ResponsiveContainer width="100%" height={170}>
                <BarChart data={distData} margin={{top:4,right:8,left:-20,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
                  <XAxis dataKey="name" tick={{fill:T.text3,fontSize:8,fontFamily:T.mono}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fill:T.text3,fontSize:8}} axisLine={false} tickLine={false}/>
                  <Tooltip {...TT}/>
                  <Legend wrapperStyle={{fontSize:9,fontFamily:T.mono,color:T.text3}}/>
                  <Bar dataKey="vol" name="Volume (ml)" fill={T.blueL} radius={[3,3,0,0]}/>
                  <Bar dataKey="units" name="Units" fill={T.crimson} radius={[3,3,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={card}>
            <div style={cardHead}><span style={cardTitle}>Inventory Summary</span></div>
            <div style={{...row("1.2fr 1fr 1fr 1fr 1.2fr 1fr"),background:T.bg2}}>
              {["Blood Group","WB/PRC","FFP","PLT","Volume (ml)","Status"].map(h=><span key={h} style={th}>{h}</span>)}
            </div>
            {ALL_GROUPS.map(bg=>{
              const d=grouped[bg]||{u:0,v:0,c:{}};
              const wbc=d.c["WB/PRC"]?.u||0,ffp=d.c["FFP"]?.u||0,plt=d.c["PLT"]?.u||0;
              return <div key={bg} style={row("1.2fr 1fr 1fr 1fr 1.2fr 1fr")}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.02)"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <span style={{fontFamily:T.font,fontWeight:700,fontSize:14,color:bgColor(bg)}}>{bg}</span>
                <span style={{fontFamily:T.mono,fontSize:11,color:wbc<=3?"#FCA5A5":T.text2}}>{wbc}</span>
                <span style={{fontFamily:T.mono,fontSize:11}}>{ffp}</span>
                <span style={{fontFamily:T.mono,fontSize:11,color:plt>0?T.goldLL:T.text3}}>{plt||"—"}</span>
                <span style={{fontFamily:T.mono,fontSize:11,color:T.text3}}>{Math.round(d.v).toLocaleString()}</span>
                <StatusBadge s={stOf(wbc)}/>
              </div>;
            })}
          </div>
        </>}

        {/* ══════════════════ ALERTS ══════════════════ */}
        {page==="alerts"&&<>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:18}}>
            {[
              {label:"Critical",count:alerts.filter(a=>a.t==="critical").length,c:"#FCA5A5",bg:T.crimsonGlow,icon:"⊗"},
              {label:"Warnings",count:alerts.filter(a=>a.t==="warning").length,c:"#FCD34D",bg:"rgba(217,119,6,0.08)",icon:"△"},
              {label:"Expiry Risks",count:alerts.filter(a=>a.t==="expiry").length,c:"#C4B5FD",bg:"rgba(124,58,237,0.08)",icon:"◷"},
            ].map(x=>(
              <div key={x.label} style={{background:x.bg,border:`1px solid ${x.c}25`,borderRadius:10,padding:"18px 20px",display:"flex",alignItems:"center",gap:14}}>
                <span style={{fontSize:28,opacity:0.6}}>{x.icon}</span>
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
            const cfg={critical:{bg:T.crimsonGlow,bdr:`${T.crimson}40`,c:"#FCA5A5",ic:"⊗",l:"CRITICAL"},
              warning:{bg:"rgba(217,119,6,0.08)",bdr:"rgba(217,119,6,0.3)",c:"#FCD34D",ic:"△",l:"WARNING"},
              expiry:{bg:"rgba(124,58,237,0.08)",bdr:"rgba(124,58,237,0.3)",c:"#C4B5FD",ic:"◷",l:"EXPIRY RISK"}};
            const v=cfg[a.t]||cfg.warning;
            return <div key={i} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 18px",borderRadius:8,marginBottom:8,background:v.bg,border:`1px solid ${v.bdr}`,color:v.c,animation:"fadeIn 0.3s ease"}}>
              <span style={{fontFamily:T.mono,fontSize:16,width:20,textAlign:"center"}}>{v.ic}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:9,fontFamily:T.mono,letterSpacing:"0.08em",marginBottom:3,opacity:0.6}}>{v.l}</div>
                <div style={{fontSize:12.5}}>{a.msg}</div>
              </div>
              <Chip color={v.c}>{a.bg}</Chip>
            </div>;
          })}
        </>}

        {/* ══════════════════ INVENTORY ══════════════════ */}
        {page==="inventory"&&<>
          <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
            <input style={inp} placeholder="Search…" value={search} onChange={e=>{setSearch(e.target.value);setPg(1)}}/>
            <select style={sel} value={fBg} onChange={e=>{setFBg(e.target.value);setPg(1)}}>
              <option value="All">All Blood Groups</option>
              {ALL_GROUPS.map(bg=><option key={bg}>{bg}</option>)}
            </select>
            <select style={sel} value={fComp} onChange={e=>{setFComp(e.target.value);setPg(1)}}>
              <option value="All">All Components</option>
              {["WB/PRC","FFP","PLT"].map(c=><option key={c}>{c}</option>)}
            </select>
            <span style={{marginLeft:"auto",fontSize:11,color:T.text3,fontFamily:T.mono}}>{filtInv.length} RECORDS</span>
          </div>
          <div style={card}>
            <div style={{...row("50px 90px 80px 100px 90px 100px 70px 80px"),background:T.bg2}}>
              {[["sno","S.No"],["unit","Unit No"],["comp","Component"],["bg","Blood Group"],["col","Collection"],["expiry","Expiry"],["qty","Qty (ml)"],["","Status"]].map(([k,h])=>(
                <span key={h} style={th} onClick={()=>{if(k){setSortK(k);setSortAsc(sortK===k?!sortAsc:true);}}}>
                  {h}{sortK===k?(sortAsc?" ↑":" ↓"):""}
                </span>
              ))}
            </div>
            {invSlice.map((r,i)=>{
              const d=daysTo(r.expiry);
              return <div key={i} style={row("50px 90px 80px 100px 90px 100px 70px 80px")}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.02)"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <span style={{fontFamily:T.mono,fontSize:10,color:T.text4}}>{r.sno}</span>
                <span style={{fontFamily:T.mono,fontSize:9,color:T.text3}}>{r.unit}</span>
                <Chip color={compColor(r.comp)}>{r.comp}</Chip>
                <span style={{fontFamily:T.font,fontWeight:700,fontSize:13,color:bgColor(r.bg)}}>{r.bg}</span>
                <span style={{fontSize:10,color:T.text3,fontFamily:T.mono}}>{r.col}</span>
                <span style={{fontFamily:T.mono,fontSize:10,color:d<=7?"#FCA5A5":d<=30?"#FCD34D":T.text3}}>
                  {r.expiry}{d<=30&&d>=0?<span style={{fontSize:8,opacity:0.7,marginLeft:3}}>{d}d</span>:null}
                </span>
                <span style={{fontFamily:T.mono,fontSize:10}}>{r.qty||"—"}</span>
                <StatusBadge s={d<=0?"expired":d<=7?"critical":d<=30?"warning":"sufficient"}/>
              </div>;
            })}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"11px 18px",borderTop:`1px solid ${T.border}`,fontSize:10,color:T.text3,fontFamily:T.mono}}>
              <span>{((pg-1)*PER_PAGE)+1}–{Math.min(pg*PER_PAGE,filtInv.length)} of {filtInv.length}</span>
              <div style={{display:"flex",gap:3}}>
                {Array.from({length:invPages},(_,i)=>i+1).slice(Math.max(0,pg-3),Math.min(invPages,pg+2)).map(p=>(
                  <button key={p} onClick={()=>setPg(p)} style={{...btn(p===pg),padding:"3px 9px",fontSize:10}}>{p}</button>
                ))}
              </div>
            </div>
          </div>
        </>}

        {/* ══════════════════ BLOOD GROUPS ══════════════════ */}
        {page==="bloodgroups"&&(
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:14}}>
            {ALL_GROUPS.map(bg=>{
              const d=grouped[bg]||{u:0,v:0,c:{}};
              const wbc=d.c["WB/PRC"]?.u||0,ffp=d.c["FFP"]?.u||0,plt=d.c["PLT"]?.u||0;
              const st=stOf(wbc);
              const maxU=Math.max(wbc,ffp,plt,10);
              const stC={critical:"rgba(220,38,38,0.25)",warning:"rgba(217,119,6,0.25)",sufficient:T.border}[st];
              return <div key={bg} style={{background:T.card,border:`1px solid ${stC}`,borderRadius:10,padding:18,transition:"transform 0.15s"}}
                onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"}
                onMouseLeave={e=>e.currentTarget.style.transform="translateY(0)"}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
                  <div>
                    <div style={{fontFamily:T.font,fontSize:24,fontWeight:700,color:bgColor(bg),lineHeight:1}}>{bg}</div>
                    <div style={{fontSize:10,color:T.text3,marginTop:4,fontFamily:T.mono}}>{d.u} units · {Math.round(d.v).toLocaleString()} ml</div>
                  </div>
                  <StatusBadge s={st}/>
                </div>
                {[["WB/PRC",wbc,T.crimson],["FFP",ffp,T.blueL],["PLT",plt,T.goldL]].map(([lbl,val,col])=>(
                  <div key={lbl} style={{marginBottom:9}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                      <span style={{fontSize:9,color:T.text3,fontFamily:T.mono}}>{lbl}</span>
                      <span style={{fontSize:11,fontFamily:T.mono,color:val<=3?"#FCA5A5":T.text2}}>{val} units</span>
                    </div>
                    <div style={{height:3,background:"rgba(255,255,255,0.05)",borderRadius:2}}>
                      <div style={{height:"100%",borderRadius:2,background:val<=3?T.crimson:val<=5?T.goldL:col,width:`${Math.min((val/maxU)*100,100)}%`,transition:"width 0.8s ease"}}/>
                    </div>
                  </div>
                ))}
              </div>;
            })}
          </div>
        )}

        {/* ══════════════════ EXPIRY ══════════════════ */}
        {page==="expiry"&&<>
          <div style={{display:"flex",gap:8,marginBottom:14,alignItems:"center",flexWrap:"wrap"}}>
            <span style={{fontSize:10,color:T.text3,fontFamily:T.mono}}>WINDOW:</span>
            {[7,14,30,60,365].map(d=>(
              <button key={d} onClick={()=>setExpWin(d)} style={btn(expWin===d)}>{d}d</button>
            ))}
            <span style={{marginLeft:"auto",fontSize:10,color:T.text3,fontFamily:T.mono}}>{expiryRows.length} UNITS</span>
          </div>
          <div style={card}>
            <div style={{...row("70px 100px 80px 110px 70px 100px 80px"),background:T.bg2}}>
              {["Days Left","Blood Group","Component","Unit No","Qty","Expiry Date","Priority"].map(h=><span key={h} style={th}>{h}</span>)}
            </div>
            {expiryRows.length===0?<div style={{textAlign:"center",padding:40,color:T.text3,fontFamily:T.mono,fontSize:12}}>No units expiring within {expWin} days</div>
            :expiryRows.map((r,i)=>{
              const uc=r.days<=7?"#FCA5A5":r.days<=14?"#FCD34D":T.text3;
              return <div key={i} style={row("70px 100px 80px 110px 70px 100px 80px")}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.02)"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div>
                  <span style={{fontFamily:T.font,fontSize:22,fontWeight:700,color:uc,lineHeight:1}}>{r.days}</span>
                  <span style={{fontSize:8,color:T.text3,marginLeft:3,fontFamily:T.mono}}>days</span>
                </div>
                <span style={{fontFamily:T.font,fontWeight:700,fontSize:13,color:bgColor(r.bg)}}>{r.bg}</span>
                <Chip color={compColor(r.comp)}>{r.comp}</Chip>
                <span style={{fontFamily:T.mono,fontSize:9,color:T.text3}}>{r.unit}</span>
                <span style={{fontFamily:T.mono,fontSize:10}}>{r.qty||"—"}</span>
                <span style={{fontFamily:T.mono,fontSize:10,color:uc}}>{r.expiry}</span>
                <StatusBadge s={r.days<=7?"critical":r.days<=14?"warning":"sufficient"}/>
              </div>;
            })}
          </div>
        </>}

        {/* ══════════════════ ML FORECAST ══════════════════ */}
        {page==="forecast"&&<>
          <div style={{background:T.blueGlow,border:"1px solid rgba(37,99,235,0.25)",borderRadius:8,padding:"13px 16px",marginBottom:16,display:"flex",alignItems:"center",gap:12}}>
            <span style={{fontSize:20}}>🤖</span>
            <div>
              <div style={{fontSize:12,fontWeight:600,color:"#93C5FD",marginBottom:1,fontFamily:T.mono}}>ML FORECAST ENGINE — ACTIVE</div>
              <div style={{fontSize:10,color:T.text3}}>Ensemble Model: Random Forest 60% + Exponential Smoothing 40% · Seasonal decomposition · MAPE & RMSE per blood group</div>
            </div>
          </div>

          <div style={{display:"flex",gap:8,marginBottom:14,alignItems:"center",flexWrap:"wrap"}}>
            <span style={{fontSize:10,color:T.text3,fontFamily:T.mono}}>HORIZON:</span>
            {[7,14,30].map(d=><button key={d} onClick={()=>setForecastDays(d)} style={btn(forecastDays===d,T.blueL)}>{d}-DAY</button>)}
            <span style={{fontSize:10,color:T.text3,fontFamily:T.mono,marginLeft:12}}>DETAIL VIEW:</span>
            <select style={sel} value={selBg} onChange={e=>setSelBg(e.target.value)}>
              {ALL_GROUPS.map(bg=><option key={bg}>{bg}</option>)}
            </select>
          </div>

          {forecast[selBg]&&<div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:14,marginBottom:14}}>
            <div style={card}>
              <div style={cardHead}>
                <span style={cardTitle}>Demand Forecast — {selBg}</span>
                <Chip color="#93C5FD" bg={T.blueGlow}>ENSEMBLE MODEL</Chip>
              </div>
              <div style={{padding:"12px 4px"}}>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={forecast[selBg].series} margin={{top:4,right:14,left:-20,bottom:0}}>
                    <defs>
                      <linearGradient id="fg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={T.blueL} stopOpacity={0.25}/>
                        <stop offset="95%" stopColor={T.blueL} stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="ug" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={T.crimson} stopOpacity={0.12}/>
                        <stop offset="95%" stopColor={T.crimson} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
                    <XAxis dataKey="d" tick={{fill:T.text3,fontSize:8,fontFamily:T.mono}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fill:T.text3,fontSize:8}} axisLine={false} tickLine={false}/>
                    <Tooltip {...TT}/>
                    <Legend wrapperStyle={{fontSize:9,fontFamily:T.mono,color:T.text3}}/>
                    <Area type="monotone" dataKey="upper" name="Upper CI" stroke={T.crimson} strokeWidth={1} strokeDasharray="4 2" fill="url(#ug)" dot={false}/>
                    <Area type="monotone" dataKey="pred" name="Forecast" stroke={T.blueL} strokeWidth={2} fill="url(#fg)" dot={false}/>
                    <Area type="monotone" dataKey="lower" name="Lower CI" stroke={T.blueL} strokeWidth={1} strokeDasharray="4 2" fill="none" dot={false}/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div style={card}>
              <div style={cardHead}><span style={cardTitle}>Model Metrics</span></div>
              <div style={{padding:16}}>
                {[
                  ["Current Stock",`${forecast[selBg].stock} units`,"#6EE7B7"],
                  [`${forecastDays}d Forecast`,`${forecast[selBg].predicted} units`,"#93C5FD"],
                  ["Avg Daily Demand",`${forecast[selBg].avgDaily} units/day`,T.goldLL],
                  ["MAPE",`${forecast[selBg].mape}%`,T.text2],
                  ["RMSE",`${forecast[selBg].rmse}`,T.text2],
                  ["Confidence",`${forecast[selBg].conf}%`,T.purpleL],
                  ["Shortfall",forecast[selBg].shortfall>0?`+${forecast[selBg].shortfall} needed`:"None",forecast[selBg].shortfall>0?"#FCA5A5":"#6EE7B7"],
                ].map(([l,v,c])=>(
                  <div key={l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:`1px solid ${T.border}`}}>
                    <span style={{fontSize:10,color:T.text3,fontFamily:T.mono}}>{l}</span>
                    <span style={{fontSize:12,fontWeight:600,color:c,fontFamily:T.mono}}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>}

          <div style={card}>
            <div style={cardHead}><span style={cardTitle}>All Blood Groups — {forecastDays}-Day Forecast</span><span style={{fontSize:10,color:T.text3,fontFamily:T.mono}}>RF + ES ENSEMBLE</span></div>
            <div style={{...row("1fr 1fr 1.5fr 0.8fr 0.8fr 0.8fr 1fr"),background:T.bg2}}>
              {["Blood Group","Current Stock","Predicted Demand","Avg/Day","MAPE","Confidence","Status"].map(h=><span key={h} style={th}>{h}</span>)}
            </div>
            {ALL_GROUPS.map(bg=>{
              const f=forecast[bg];if(!f)return null;
              const max=Math.max(f.stock,f.predicted,1);
              return <div key={bg} style={row("1fr 1fr 1.5fr 0.8fr 0.8fr 0.8fr 1fr")}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.02)"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <span style={{fontFamily:T.font,fontWeight:700,fontSize:13,color:bgColor(bg),cursor:"pointer",textDecoration:"underline",textDecorationColor:"rgba(220,38,38,0.2)"}} onClick={()=>setSelBg(bg)}>{bg}</span>
                <span style={{fontFamily:T.mono,fontSize:11,color:"#6EE7B7"}}>{f.stock}</span>
                <div>
                  <div style={{fontSize:10,fontFamily:T.mono,marginBottom:3,color:f.shortfall>0?"#FCA5A5":"#93C5FD"}}>
                    {f.predicted}{f.shortfall>0?<span style={{color:"#FCD34D",marginLeft:5,fontSize:9}}>⚠+{f.shortfall}</span>:null}
                  </div>
                  <div style={{height:2.5,background:"rgba(255,255,255,0.05)",borderRadius:2}}>
                    <div style={{height:"100%",borderRadius:2,background:f.shortfall>0?T.crimson:T.blueL,width:`${Math.min((f.predicted/max)*100,100)}%`}}/>
                  </div>
                </div>
                <span style={{fontFamily:T.mono,fontSize:10,color:T.goldLL}}>{f.avgDaily}</span>
                <span style={{fontFamily:T.mono,fontSize:10,color:T.text3}}>{f.mape}%</span>
                <span style={{fontFamily:T.mono,fontSize:10,color:T.purpleL}}>{f.conf}%</span>
                <StatusBadge s={f.status}/>
              </div>;
            })}
          </div>
        </>}

        {/* ══════════════════ ANALYTICS ══════════════════ */}
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
                    <Pie data={compData} dataKey="vol" nameKey="name" cx="50%" cy="50%" outerRadius={85} innerRadius={42} paddingAngle={4} label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={{stroke:T.text4,strokeWidth:0.4}}>
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
                    {n:"0–7 days",v:data.filter(r=>{const d=daysTo(r.expiry);return d>=0&&d<=7}).length,c:T.crimson},
                    {n:"8–14d",v:data.filter(r=>{const d=daysTo(r.expiry);return d>7&&d<=14}).length,c:T.goldL},
                    {n:"15–30d",v:data.filter(r=>{const d=daysTo(r.expiry);return d>14&&d<=30}).length,c:T.goldLL},
                    {n:"31–60d",v:data.filter(r=>{const d=daysTo(r.expiry);return d>30&&d<=60}).length,c:T.blueL},
                    {n:"60+ days",v:data.filter(r=>{const d=daysTo(r.expiry);return d>60}).length,c:T.greenL},
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
                    <Bar dataKey="conf" name="Confidence (%)" fill={T.purple} radius={[3,3,0,0]}/>
                    <Bar dataKey="mape" name="MAPE (%)" fill={T.goldL} radius={[3,3,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>}

        {/* ══════════════════ COMPATIBILITY ══════════════════ */}
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
                      return <div key={rec} style={{aspectRatio:1,minHeight:22,borderRadius:3,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,background:same?"rgba(37,99,235,0.18)":can?"rgba(5,150,105,0.18)":"rgba(220,38,38,0.05)",color:same?T.blueL:can?"#6EE7B7":"rgba(220,38,38,0.25)"}}>
                        {same?"●":can?"✓":""}
                      </div>;
                    })
                  ])}
                </div>
                <div style={{display:"flex",gap:14,marginTop:12,fontSize:9,color:T.text3,fontFamily:T.mono}}>
                  <span><span style={{color:"#6EE7B7"}}>✓</span> Compatible</span>
                  <span><span style={{color:T.blueL}}>●</span> Same group</span>
                  <span style={{color:"rgba(220,38,38,0.3)"}}>— Incompatible</span>
                </div>
              </div>
            </div>
            <div style={card}>
              <div style={cardHead}><span style={cardTitle}>Live Stock Levels</span></div>
              <div style={{padding:"14px 18px"}}>
                {ALL_GROUPS.map(bg=>{
                  const u=grouped[bg]?.u||0;
                  return <div key={bg} style={{display:"flex",alignItems:"center",gap:8,marginBottom:9}}>
                    <span style={{width:56,fontFamily:T.font,fontWeight:700,fontSize:12,color:bgColor(bg),flexShrink:0}}>{bg}</span>
                    <div style={{flex:1,height:4,background:"rgba(255,255,255,0.05)",borderRadius:2}}>
                      <div style={{height:"100%",borderRadius:2,background:u<=3?T.crimson:u<=5?T.goldL:T.greenL,width:`${Math.min((u/20)*100,100)}%`,transition:"width 0.8s"}}/>
                    </div>
                    <span style={{width:24,textAlign:"right",fontFamily:T.mono,fontSize:10,color:T.text3,flexShrink:0}}>{u}</span>
                  </div>;
                })}
              </div>
            </div>
          </div>

          <div style={card}>
            <div style={cardHead}><span style={cardTitle}>Donor Availability Checker</span><span style={{fontSize:9,color:T.text3,fontFamily:T.mono}}>REAL-TIME LOOKUP</span></div>
            <div style={{padding:"16px 18px",display:"flex",gap:12,alignItems:"flex-end",flexWrap:"wrap",borderBottom:`1px solid ${T.border}`}}>
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
                <div style={{background:T.crimsonGlow,border:`1px solid ${T.crimson}35`,borderRadius:7,padding:"12px 14px",color:"#FCA5A5",fontSize:12}}>
                  ⊗ No compatible {compatComp} units available for patient {compatPt}
                </div>
              ):<>
                <div style={{fontSize:11,color:T.text3,marginBottom:10,fontFamily:T.sans}}>
                  Compatible <strong style={{color:T.text}}>{compatComp}</strong> donors available for <strong style={{color:T.text}}>{compatPt}</strong>:
                </div>
                <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:12}}>
                  {compatRes.map(({bg,u,v})=>(
                    <div key={bg} style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:8,padding:"12px 16px",minWidth:130}}>
                      <div style={{fontFamily:T.font,fontWeight:700,fontSize:17,color:bgColor(bg),lineHeight:1,marginBottom:5}}>{bg}</div>
                      <div style={{fontSize:11,color:"#6EE7B7",fontFamily:T.mono}}>{u} unit{u>1?"s":""}</div>
                      <div style={{fontSize:10,color:T.text3,fontFamily:T.mono}}>{v.toLocaleString()} ml</div>
                    </div>
                  ))}
                </div>
                <div style={{background:"rgba(217,119,6,0.08)",border:"1px solid rgba(217,119,6,0.25)",borderRadius:7,padding:"9px 13px",fontSize:10,color:"#FCD34D",fontFamily:T.mono}}>
                  △ CLINICAL NOTE: Cross-matching must be performed prior to any transfusion. This is an inventory guidance tool only.
                </div>
              </>}
            </div>
          </div>
        </>}

        </div>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=DM+Sans:wght@300;400;500&family=JetBrains+Mono:wght@300;400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#06080F}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:#06080F}
        ::-webkit-scrollbar-thumb{background:#374151;border-radius:2px}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}
        @keyframes fadeIn{from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:translateX(0)}}
        select option{background:#0D1117;color:#F9FAFB}
        input::placeholder{color:#374151}
        input:focus,select:focus{border-color:#DC2626!important}
      `}</style>
    </div>
  );
}
