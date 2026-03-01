// ═══════════════════════════════════════════════════════════════
// Sidebar.jsx — Navigation Sidebar
// ═══════════════════════════════════════════════════════════════

import { T } from "../styles/theme.js";
import { Chip } from "./UIComponents.jsx";

const NAV_ITEMS = [
  { id: "dashboard",   ic: "⬡", label: "Dashboard"     },
  { id: "upload",      ic: "↑", label: "Upload Data"    },
  { id: "alerts",      ic: "◉", label: "Alerts"         },
  { id: "inventory",   ic: "≡", label: "All Records"    },
  { id: "bloodgroups", ic: "◎", label: "By Blood Group" },
  { id: "expiry",      ic: "◷", label: "Expiry Tracker" },
  { id: "forecast",    ic: "∿", label: "ML Forecast"    },
  { id: "analytics",   ic: "◈", label: "Analytics"      },
  { id: "compat",      ic: "⊕", label: "Compatibility"  },
];

const NAV_SECTIONS = [
  { label: "OVERVIEW",      ids: ["dashboard", "upload", "alerts"]       },
  { label: "INVENTORY",     ids: ["inventory", "bloodgroups", "expiry"]  },
  { label: "INTELLIGENCE",  ids: ["forecast", "analytics", "compat"]     },
];

export default function Sidebar({ page, setPage, setShowTech, alertCount, recordCount }) {
  return (
    <aside style={{
      width: 230,
      flexShrink: 0,
      background: T.bg2,
      borderRight: `1px solid ${T.border}`,
      display: "flex",
      flexDirection: "column",
      position: "sticky",
      top: 0,
      height: "100vh",
      overflowY: "auto",
      boxShadow: "1px 0 0 rgba(0,0,0,0.05)",
    }}>
      {/* Brand */}
      <div style={{ padding: "20px 18px 16px", borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: `linear-gradient(135deg, ${T.crimson}, ${T.crimsonD})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 17,
            boxShadow: `0 2px 10px ${T.crimson}30`,
            flexShrink: 0,
          }}>🩸</div>
          <div>
            <div style={{ fontFamily: T.font, fontSize: 14, fontWeight: 700, color: T.text, lineHeight: 1.1 }}>SRM Blood Bank</div>
            <div style={{ fontSize: 9, color: T.text3, letterSpacing: "0.1em", marginTop: 2, fontFamily: T.mono }}>MANAGEMENT SYSTEM</div>
          </div>
        </div>
        <div style={{ fontSize: 9, color: T.text3, fontFamily: T.mono, lineHeight: 1.5 }}>
          SRM Institute of Science<br />& Technology · Kattankulathur
        </div>
        <div style={{
          marginTop: 10,
          background: T.greenBg,
          border: `1px solid ${T.green}25`,
          borderRadius: 5,
          padding: "5px 9px",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: T.greenL, display: "inline-block", animation: "blink 1.5s ease-in-out infinite" }} />
          <span style={{ fontSize: 9, color: T.green, fontFamily: T.mono, letterSpacing: "0.07em" }}>SYSTEM OPERATIONAL</span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: "8px 0", flex: 1 }}>
        {NAV_SECTIONS.map(({ label, ids }) => (
          <div key={label} style={{ marginBottom: 4 }}>
            <div style={{
              fontSize: 8.5, color: T.text4, fontFamily: T.mono,
              textTransform: "uppercase", letterSpacing: "0.14em",
              padding: "8px 18px 4px",
            }}>{label}</div>

            {NAV_ITEMS.filter(n => ids.includes(n.id)).map(n => {
              const active = page === n.id;
              const badge  = n.id === "alerts" ? alertCount : 0;
              return (
                <div
                  key={n.id}
                  onClick={() => setPage(n.id)}
                  className="nav-item"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    padding: "8px 14px",
                    margin: "1px 8px",
                    borderRadius: 7,
                    cursor: "pointer",
                    fontSize: 12.5,
                    color: active ? T.text : T.text2,
                    background: active ? T.crimsonL : "transparent",
                    border: `1px solid ${active ? T.crimson + "30" : "transparent"}`,
                    transition: "all 0.12s",
                    fontWeight: active ? 500 : 400,
                  }}
                >
                  <span style={{ fontSize: 11, fontFamily: T.mono, color: active ? T.crimson : T.text3, width: 16, textAlign: "center" }}>{n.ic}</span>
                  <span style={{ flex: 1 }}>{n.label}</span>
                  {badge > 0 && <Chip color={T.crimson}>{badge}</Chip>}
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: "12px 14px", borderTop: `1px solid ${T.border}` }}>
        <button
          onClick={() => setShowTech(true)}
          style={{
            width: "100%",
            textAlign: "center",
            padding: "7px 12px",
            fontSize: 10,
            background: "transparent",
            border: `1px solid ${T.border}`,
            borderRadius: 6,
            color: T.text3,
            cursor: "pointer",
            fontFamily: T.mono,
            letterSpacing: "0.04em",
            transition: "all 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = T.blueL; e.currentTarget.style.color = T.blueL; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.text3; }}
        >
          ⟨/⟩ VIEW TECH STACK
        </button>
        <div style={{ fontSize: 9, color: T.text4, textAlign: "center", marginTop: 10, fontFamily: T.mono, lineHeight: 1.5 }}>
          v2.2 · {recordCount} records<br />
          <span style={{ color: T.crimson + "60" }}>Dept. of Biomedical Engineering</span>
        </div>
      </div>
    </aside>
  );
}
