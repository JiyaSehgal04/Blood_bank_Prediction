// ═══════════════════════════════════════════════════════════════
// UI Components — SRM Blood Bank Management System
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { T } from "../styles/theme.js";

// ── Chip ─────────────────────────────────────────────────────────
export function Chip({ children, color = T.crimson, bg }) {
  return (
    <span style={{
      background: bg || `${color}14`,
      color,
      border: `1px solid ${color}30`,
      borderRadius: 4,
      padding: "2px 8px",
      fontSize: 9,
      fontFamily: T.mono,
      fontWeight: 600,
      letterSpacing: "0.07em",
      textTransform: "uppercase",
      whiteSpace: "nowrap",
    }}>{children}</span>
  );
}

// ── StatusBadge ──────────────────────────────────────────────────
export function StatusBadge({ s }) {
  const m = {
    critical:  { c: T.crimson,  b: T.crimsonL,  label: "CRITICAL"  },
    warning:   { c: T.gold,     b: T.goldBg,    label: "LOW STOCK" },
    sufficient:{ c: T.green,    b: T.greenBg,   label: "SUFFICIENT"},
    ok:        { c: T.green,    b: T.greenBg,   label: "OK"        },
    expired:   { c: T.text3,    b: "#F3F4F6",   label: "EXPIRED"   },
  };
  const v = m[s] || m.ok;
  return <Chip color={v.c} bg={v.b}>{v.label}</Chip>;
}

// ── KPI Card ─────────────────────────────────────────────────────
export function Kpi({ label, value, sub, accent = T.crimson, icon }) {
  const [n, setN] = useState(0);
  const num = parseFloat(String(value).replace(/[^0-9.]/g, "")) || 0;
  const sfx = String(value).replace(/[0-9.]/g, "");

  useEffect(() => {
    let cur = 0;
    const step = num / 45;
    const t = setInterval(() => {
      cur = Math.min(cur + step, num);
      setN(cur);
      if (cur >= num) clearInterval(t);
    }, 16);
    return () => clearInterval(t);
  }, [num]);

  return (
    <div
      style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 10,
        padding: "18px 20px",
        position: "relative",
        overflow: "hidden",
        cursor: "default",
        transition: "border-color 0.2s, transform 0.2s, box-shadow 0.2s",
        boxShadow: T.shadow,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = accent;
        e.currentTarget.style.transform   = "translateY(-2px)";
        e.currentTarget.style.boxShadow   = T.shadowMd;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = T.border;
        e.currentTarget.style.transform   = "translateY(0)";
        e.currentTarget.style.boxShadow   = T.shadow;
      }}
    >
      <div style={{ position: "absolute", left: 0, top: 0, width: 3, height: "100%", background: accent, borderRadius: "10px 0 0 10px" }} />
      <div style={{ fontSize: 9, color: T.text3, fontFamily: T.mono, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: T.font, fontSize: 28, fontWeight: 700, color: accent, lineHeight: 1 }}>
        {sfx
          ? `${num === n ? num.toFixed(1) : n.toFixed(1)}${sfx}`
          : `${Math.round(n).toLocaleString()}`}
      </div>
      <div style={{ fontSize: 10, color: T.text3, marginTop: 5, fontFamily: T.sans }}>{sub}</div>
      <div style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 26, opacity: 0.07 }}>{icon}</div>
    </div>
  );
}

// ── Tech Stack Modal ─────────────────────────────────────────────
export function TechModal({ onClose }) {
  const layers = [
    { icon: "⚛️", layer: "Framework",       name: "React 18",              desc: "Hooks-based SPA — useState, useEffect, useMemo, event-driven rendering" },
    { icon: "📊", layer: "Visualisation",   name: "Recharts 2",            desc: "AreaChart, BarChart, LineChart, PieChart, RadarChart, RadialBar" },
    { icon: "🔵", layer: "ML — Baseline",   name: "Exponential Smoothing", desc: "α=0.3 single-pass smoothing for short-term demand trend estimation" },
    { icon: "🌲", layer: "ML — Ensemble",   name: "Simulated RF Ensemble", desc: "WMA (35%) + ES (35%) + Mean (20%) + Trend (10%) weighted ensemble" },
    { icon: "📐", layer: "ML — Evaluation", name: "MAPE + RMSE",           desc: "Mean Absolute Percentage Error & Root Mean Squared Error per blood group" },
    { icon: "📋", layer: "Data I/O",        name: "SheetJS (xlsx)",        desc: "Client-side .xlsx/.xls/.csv parsing, zero server dependency, CSV export" },
    { icon: "🗂", layer: "Inventory Logic", name: "FIFO + Priority Queue", desc: "Expiry-ordered unit allocation with compatibility chain traversal" },
    { icon: "🚨", layer: "Alert Engine",    name: "Threshold + Forecast",  desc: "Proactive alerts when predicted demand exceeds stock + safety buffer" },
    { icon: "🩸", layer: "Compatibility",   name: "ABO/Rh Matrix",         desc: "Complete 8×8 donor-recipient compatibility with live inventory lookup" },
    { icon: "🎨", layer: "Styling",         name: "CSS-in-JS",             desc: "Inline design system with tokens, micro-interactions, light formal theme" },
    { icon: "⏰", layer: "Scheduling",      name: "APScheduler",           desc: "Flask cron-based re-forecast every 6 hours (production integration)" },
    { icon: "💾", layer: "Storage",         name: "Excel + In-Memory",     desc: ".xlsx → React state → computed analytics → export back to Excel" },
  ];

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 14, width: "min(760px,92vw)", maxHeight: "84vh", overflowY: "auto", padding: 32, boxShadow: T.shadowLg }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <div style={{ fontFamily: T.font, fontSize: 22, fontWeight: 700, color: T.text }}>Technology Stack</div>
            <div style={{ fontSize: 11, color: T.text3, marginTop: 3, fontFamily: T.mono }}>SRM BLOOD BANK MANAGEMENT SYSTEM · ARCHITECTURE OVERVIEW</div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: `1px solid ${T.border}`, color: T.text3, borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontFamily: T.mono }}>
            ✕ CLOSE
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {layers.map((l, i) => (
            <div key={i} style={{ background: "#F8FAFC", border: `1px solid ${T.border}`, borderRadius: 8, padding: 14, display: "flex", gap: 12 }}>
              <span style={{ fontSize: 20, flexShrink: 0, marginTop: 2 }}>{l.icon}</span>
              <div>
                <div style={{ fontSize: 9, color: T.text3, fontFamily: T.mono, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>{l.layer}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text, fontFamily: T.font, marginBottom: 3 }}>{l.name}</div>
                <div style={{ fontSize: 11, color: T.text3, lineHeight: 1.4, fontFamily: T.sans }}>{l.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
