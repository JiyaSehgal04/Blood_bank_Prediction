import { Chip } from "../components/Chip.jsx";
import { T } from "../theme.js";

const ALERT_CFG = {
  critical: { bg: T.crimsonGlow, bdr: `${T.crimson}50`, c: "#DC2626", ic: "⊗", l: "CRITICAL" },
  warning: { bg: "rgba(217,119,6,0.08)", bdr: "rgba(217,119,6,0.35)", c: "#D97706", ic: "△", l: "WARNING" },
  expiry: { bg: "rgba(124,58,237,0.08)", bdr: "rgba(124,58,237,0.35)", c: "#7C3AED", ic: "◷", l: "EXPIRY RISK" },
};

export function AlertsPage({ alerts }) {
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 18 }}>
        {[
          { label: "Critical", count: alerts.filter((a) => a.t === "critical").length, c: "#DC2626", bg: T.crimsonGlow, icon: "⊗" },
          { label: "Warnings", count: alerts.filter((a) => a.t === "warning").length, c: "#D97706", bg: "rgba(217,119,6,0.08)", icon: "△" },
          { label: "Expiry Risks", count: alerts.filter((a) => a.t === "expiry").length, c: "#7C3AED", bg: "rgba(124,58,237,0.08)", icon: "◷" },
        ].map((x) => (
          <div
            key={x.label}
            style={{
              background: x.bg,
              border: `1px solid ${x.c}40`,
              borderRadius: 10,
              padding: "18px 20px",
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <span style={{ fontSize: 28, opacity: 0.7 }}>{x.icon}</span>
            <div>
              <div style={{ fontFamily: T.font, fontSize: 26, fontWeight: 700, color: x.c, lineHeight: 1 }}>{x.count}</div>
              <div style={{ fontSize: 10, color: T.text3, marginTop: 3, fontFamily: T.mono, textTransform: "uppercase", letterSpacing: "0.07em" }}>{x.label}</div>
            </div>
          </div>
        ))}
      </div>
      {alerts.length === 0 ? (
        <div style={{ textAlign: "center", padding: 64, color: T.text3 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
          <div style={{ fontFamily: T.font, fontSize: 18, color: T.text2 }}>All Clear — No Active Alerts</div>
        </div>
      ) : (
        alerts.map((a, i) => {
          const v = ALERT_CFG[a.t] || ALERT_CFG.warning;
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "14px 18px",
                borderRadius: 8,
                marginBottom: 8,
                background: v.bg,
                border: `1px solid ${v.bdr}`,
                color: v.c,
              }}
            >
              <span style={{ fontFamily: T.mono, fontSize: 16, width: 20, textAlign: "center" }}>{v.ic}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 9, fontFamily: T.mono, letterSpacing: "0.08em", marginBottom: 3, opacity: 0.8 }}>{v.l}</div>
                <div style={{ fontSize: 12.5 }}>{a.msg}</div>
              </div>
              <Chip color={v.c}>{a.bg}</Chip>
            </div>
          );
        })
      )}
    </>
  );
}
