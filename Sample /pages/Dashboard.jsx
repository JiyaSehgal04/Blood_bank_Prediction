import { Kpi } from "../components/Kpi.jsx";
import { Chip } from "../components/Chip.jsx";
import { StatusBadge } from "../components/StatusBadge.jsx";
import { UnitsByBloodGroupBarChart } from "../charts/UnitsByBloodGroupBarChart.jsx";
import { ComponentPieChart } from "../charts/ComponentPieChart.jsx";
import { VolumeDistributionBarChart } from "../charts/VolumeDistributionBarChart.jsx";
import { T } from "../theme.js";
import { ALL_GROUPS } from "../data.js";

const card = { background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden", marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" };
const cardHead = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: `1px solid ${T.border}`, background: T.bg };
const cardTitle = { fontFamily: T.font, fontSize: 14, fontWeight: 700, color: T.text };
const row = (cols) => ({ display: "grid", gridTemplateColumns: cols, alignItems: "center", padding: "10px 18px", borderBottom: `1px solid ${T.border}`, fontSize: 12, transition: "background 0.1s", gap: 8 });
const th = { fontSize: 9, color: T.text3, fontFamily: T.mono, textTransform: "uppercase", letterSpacing: "0.08em" };

function bgColor(bg) {
  return bg?.includes("Neg") ? T.purpleL : T.crimson;
}
function stOf(wbc) {
  return wbc === 0 ? "critical" : wbc <= 3 ? "critical" : wbc <= 5 ? "warning" : "sufficient";
}

export function Dashboard({ data, totalVol, expiringSoon, grouped, alerts, distData, compData }) {
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 12, marginBottom: 18 }}>
        <Kpi label="Total Units" value={data.length} sub="All components" icon="🗃" accent={T.crimson} />
        <Kpi label="Total Volume" value={(totalVol / 1000).toFixed(1) + "L"} sub="In current stock" icon="💧" accent={T.blueL} />
        <Kpi label="Expiring ≤30d" value={expiringSoon} sub="Priority dispatch" icon="⚠" accent={T.goldL} />
        <Kpi label="Blood Groups" value={Object.keys(grouped).length} sub="Types in stock" icon="🩸" accent={T.greenL} />
        <Kpi label="Critical Alerts" value={alerts.filter((a) => a.t === "critical").length} sub="Immediate action" icon="🚨" accent="#EF4444" />
        <Kpi label="ML Confidence" value="87%" sub="Avg forecast accuracy" icon="🤖" accent={T.purpleL} />
      </div>

      {alerts.slice(0, 4).map((a, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "9px 14px",
            borderRadius: 7,
            marginBottom: 7,
            border: "1px solid",
            background: a.t === "critical" ? T.crimsonGlow : a.t === "expiry" ? "rgba(124,58,237,0.08)" : "rgba(217,119,6,0.08)",
            borderColor: a.t === "critical" ? `${T.crimson}50` : a.t === "expiry" ? "rgba(124,58,237,0.35)" : "rgba(217,119,6,0.35)",
            color: a.t === "critical" ? "#DC2626" : a.t === "expiry" ? "#7C3AED" : "#D97706",
            fontSize: 12,
          }}
        >
          <span style={{ fontFamily: T.mono, fontSize: 13 }}>{a.t === "critical" ? "⊗" : a.t === "expiry" ? "◷" : "△"}</span>
          <span style={{ flex: 1 }}>{a.msg}</span>
          <Chip color={a.t === "critical" ? "#DC2626" : a.t === "expiry" ? "#7C3AED" : "#D97706"}>{a.bg}</Chip>
        </div>
      ))}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <div style={card}>
          <div style={cardHead}>
            <span style={cardTitle}>Units by Blood Group</span>
            <Chip color={T.greenL}>LIVE</Chip>
          </div>
          <div style={{ padding: "14px 6px" }}>
            <UnitsByBloodGroupBarChart data={distData} />
          </div>
        </div>
        <div style={card}>
          <div style={cardHead}>
            <span style={cardTitle}>Component Breakdown</span>
          </div>
          <div style={{ padding: "14px 6px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ComponentPieChart data={compData} />
          </div>
        </div>
      </div>

      <div style={card}>
        <div style={cardHead}>
          <span style={cardTitle}>Volume Distribution — Blood Group × Component (ml)</span>
        </div>
        <div style={{ padding: "14px 6px" }}>
          <VolumeDistributionBarChart data={distData} />
        </div>
      </div>

      <div style={card}>
        <div style={cardHead}>
          <span style={cardTitle}>Inventory Summary</span>
        </div>
        <div style={{ ...row("1.2fr 1fr 1fr 1fr 1.2fr 1fr"), background: T.bg }}>
          {["Blood Group", "WB/PRC", "FFP", "PLT", "Volume (ml)", "Status"].map((h) => (
            <span key={h} style={th}>
              {h}
            </span>
          ))}
        </div>
        {ALL_GROUPS.map((bg) => {
          const d = grouped[bg] || { u: 0, v: 0, c: {} };
          const wbc = d.c["WB/PRC"]?.u || 0,
            ffp = d.c["FFP"]?.u || 0,
            plt = d.c["PLT"]?.u || 0;
          return (
            <div
              key={bg}
              style={row("1.2fr 1fr 1fr 1fr 1.2fr 1fr")}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.02)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span style={{ fontFamily: T.font, fontWeight: 700, fontSize: 14, color: bgColor(bg) }}>{bg}</span>
              <span style={{ fontFamily: T.mono, fontSize: 11, color: wbc <= 3 ? "#DC2626" : T.text2 }}>{wbc}</span>
              <span style={{ fontFamily: T.mono, fontSize: 11 }}>{ffp}</span>
              <span style={{ fontFamily: T.mono, fontSize: 11, color: plt > 0 ? T.goldLL : T.text3 }}>{plt || "—"}</span>
              <span style={{ fontFamily: T.mono, fontSize: 11, color: T.text3 }}>{Math.round(d.v).toLocaleString()}</span>
              <StatusBadge s={stOf(wbc)} />
            </div>
          );
        })}
      </div>
    </>
  );
}
