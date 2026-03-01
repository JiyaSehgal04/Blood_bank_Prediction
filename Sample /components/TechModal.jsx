import { T } from "../theme.js";

const LAYERS = [
  { icon: "⚛️", layer: "Framework", name: "React 18", desc: "Hooks-based SPA — useState, useEffect, useMemo, event-driven rendering" },
  { icon: "📊", layer: "Visualisation", name: "Recharts 2", desc: "AreaChart, BarChart, LineChart, PieChart, RadarChart, RadialBar" },
  { icon: "🔵", layer: "ML — Baseline", name: "Exponential Smoothing", desc: "α=0.3 single-pass smoothing for short-term demand trend estimation" },
  { icon: "🌲", layer: "ML — Ensemble", name: "Simulated Random Forest", desc: "WMA (35%) + ES (35%) + Mean (20%) + Trend (10%) weighted ensemble" },
  { icon: "📐", layer: "ML — Evaluation", name: "MAPE + RMSE", desc: "Mean Absolute Percentage Error & Root Mean Squared Error per group" },
  { icon: "📋", layer: "Data I/O", name: "SheetJS (xlsx)", desc: "Client-side .xlsx parsing, zero server dependency, CSV export" },
  { icon: "🗂", layer: "Inventory Logic", name: "FIFO + Priority Queue", desc: "Expiry-ordered unit allocation with compatibility chain traversal" },
  { icon: "🚨", layer: "Alert Engine", name: "Threshold + Forecast Rules", desc: "Proactive alerts when predicted demand exceeds stock + safety buffer" },
  { icon: "🩸", layer: "Compatibility", name: "ABO/Rh Matrix", desc: "Complete 8×8 donor-recipient compatibility with inventory lookup" },
  { icon: "🎨", layer: "Styling", name: "CSS-in-JS", desc: "Inline design system with tokens, micro-interactions, and transitions" },
  { icon: "⏰", layer: "Scheduling (Backend)", name: "APScheduler", desc: "Flask cron-based re-forecast every 6 hours (production integration)" },
  { icon: "💾", layer: "Storage", name: "Excel + In-Memory", desc: ".xlsx → React state → computed analytics → export back to Excel" },
];

export function TechModal({ onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(8px)",
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: T.bg2,
          border: `1px solid ${T.border}`,
          borderRadius: 14,
          width: "min(740px, 92vw)",
          maxHeight: "82vh",
          overflowY: "auto",
          padding: 32,
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <div style={{ fontFamily: T.font, fontSize: 22, fontWeight: 700, color: T.text }}>Technology Stack</div>
            <div style={{ fontSize: 11, color: T.text3, marginTop: 3, fontFamily: T.mono }}>
              SRM BLOOD BANK MANAGEMENT SYSTEM · ARCHITECTURE OVERVIEW
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: `1px solid ${T.border}`,
              color: T.text3,
              borderRadius: 6,
              padding: "6px 12px",
              cursor: "pointer",
              fontSize: 12,
              fontFamily: T.mono,
            }}
          >
            ✕ CLOSE
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {LAYERS.map((l, i) => (
            <div
              key={i}
              style={{
                background: T.card,
                border: `1px solid ${T.border}`,
                borderRadius: 8,
                padding: 14,
                display: "flex",
                gap: 12,
              }}
            >
              <span style={{ fontSize: 20, flexShrink: 0, marginTop: 2 }}>{l.icon}</span>
              <div>
                <div style={{ fontSize: 9, color: T.text3, fontFamily: T.mono, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>
                  {l.layer}
                </div>
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
