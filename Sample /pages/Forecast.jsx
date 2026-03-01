import { StatusBadge } from "../components/StatusBadge.jsx";
import { Chip } from "../components/Chip.jsx";
import { DemandForecastAreaChart } from "../charts/DemandForecastAreaChart.jsx";
import { T } from "../theme.js";
import { ALL_GROUPS } from "../data.js";

const card = { background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden", marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" };
const cardHead = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: `1px solid ${T.border}`, background: T.bg };
const cardTitle = { fontFamily: T.font, fontSize: 14, fontWeight: 700, color: T.text };
const row = (cols) => ({ display: "grid", gridTemplateColumns: cols, alignItems: "center", padding: "10px 18px", borderBottom: `1px solid ${T.border}`, fontSize: 12, gap: 8 });
const th = { fontSize: 9, color: T.text3, fontFamily: T.mono, textTransform: "uppercase", letterSpacing: "0.08em" };
const btn = (active, accent = T.blueL) => ({
  padding: "6px 14px",
  borderRadius: 5,
  border: `1px solid ${active ? accent : T.border}`,
  background: active ? T.blueGlow : "transparent",
  color: active ? accent : T.text3,
  cursor: "pointer",
  fontSize: 11,
  fontFamily: T.mono,
});
const sel = { background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 7, padding: "7px 11px", color: T.text, fontSize: 12, fontFamily: T.sans, cursor: "pointer" };

function bgColor(bg) {
  return bg?.includes("Neg") ? T.purpleL : T.crimson;
}

export function ForecastPage({ forecast, forecastDays, setForecastDays, selBg, setSelBg }) {
  const f = forecast[selBg];
  return (
    <>
      <div
        style={{
          background: T.blueGlow,
          border: "1px solid rgba(37,99,235,0.25)",
          borderRadius: 8,
          padding: "13px 16px",
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span style={{ fontSize: 20 }}>🤖</span>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: T.blueL, marginBottom: 1, fontFamily: T.mono }}>ML FORECAST ENGINE — ACTIVE</div>
          <div style={{ fontSize: 10, color: T.text3 }}>Ensemble Model: Random Forest 60% + Exponential Smoothing 40% · MAPE & RMSE per blood group</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 10, color: T.text3, fontFamily: T.mono }}>HORIZON:</span>
        {[7, 14, 30].map((d) => (
          <button key={d} onClick={() => setForecastDays(d)} style={btn(forecastDays === d, T.blueL)}>
            {d}-DAY
          </button>
        ))}
        <span style={{ fontSize: 10, color: T.text3, fontFamily: T.mono, marginLeft: 12 }}>DETAIL VIEW:</span>
        <select style={sel} value={selBg} onChange={(e) => setSelBg(e.target.value)}>
          {ALL_GROUPS.map((bg) => (
            <option key={bg}>{bg}</option>
          ))}
        </select>
      </div>

      {f && (
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14, marginBottom: 14 }}>
          <div style={card}>
            <div style={cardHead}>
              <span style={cardTitle}>Demand Forecast — {selBg}</span>
              <Chip color={T.blueL} bg="rgba(37,99,235,0.1)">ENSEMBLE MODEL</Chip>
            </div>
            <div style={{ padding: "12px 4px" }}>
              <DemandForecastAreaChart data={f.series} />
            </div>
          </div>
          <div style={card}>
            <div style={cardHead}>
              <span style={cardTitle}>Model Metrics</span>
            </div>
            <div style={{ padding: 16 }}>
              {[
                ["Current Stock", `${f.stock} units`, "#059669"],
                [`${forecastDays}d Forecast`, `${f.predicted} units`, T.blueL],
                ["Avg Daily Demand", `${f.avgDaily} units/day`, T.goldLL],
                ["MAPE", `${f.mape}%`, T.text2],
                ["RMSE", `${f.rmse}`, T.text2],
                ["Confidence", `${f.conf}%`, T.purpleL],
                ["Shortfall", f.shortfall > 0 ? `+${f.shortfall} needed` : "None", f.shortfall > 0 ? "#DC2626" : "#059669"],
              ].map(([l, v, c]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${T.border}` }}>
                  <span style={{ fontSize: 10, color: T.text3, fontFamily: T.mono }}>{l}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: c, fontFamily: T.mono }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={card}>
        <div style={cardHead}>
          <span style={cardTitle}>All Blood Groups — {forecastDays}-Day Forecast</span>
          <span style={{ fontSize: 10, color: T.text3, fontFamily: T.mono }}>RF + ES ENSEMBLE</span>
        </div>
        <div style={{ ...row("1fr 1fr 1.5fr 0.8fr 0.8fr 0.8fr 1fr"), background: T.bg }}>
          {["Blood Group", "Current Stock", "Predicted Demand", "Avg/Day", "MAPE", "Confidence", "Status"].map((h) => (
            <span key={h} style={th}>
              {h}
            </span>
          ))}
        </div>
        {ALL_GROUPS.map((bg) => {
          const fr = forecast[bg];
          if (!fr) return null;
          const max = Math.max(fr.stock, fr.predicted, 1);
          return (
            <div
              key={bg}
              style={row("1fr 1fr 1.5fr 0.8fr 0.8fr 0.8fr 1fr")}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.02)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span
                style={{
                  fontFamily: T.font,
                  fontWeight: 700,
                  fontSize: 13,
                  color: bgColor(bg),
                  cursor: "pointer",
                  textDecoration: "underline",
                  textDecorationColor: "rgba(220,38,38,0.3)",
                }}
                onClick={() => setSelBg(bg)}
              >
                {bg}
              </span>
              <span style={{ fontFamily: T.mono, fontSize: 11, color: "#059669" }}>{fr.stock}</span>
              <div>
                <div style={{ fontSize: 10, fontFamily: T.mono, marginBottom: 3, color: fr.shortfall > 0 ? "#DC2626" : T.blueL }}>
                  {fr.predicted}
                  {fr.shortfall > 0 ? <span style={{ color: "#D97706", marginLeft: 5, fontSize: 9 }}>⚠+{fr.shortfall}</span> : null}
                </div>
                <div style={{ height: 2.5, background: "rgba(0,0,0,0.06)", borderRadius: 2 }}>
                  <div style={{ height: "100%", borderRadius: 2, background: fr.shortfall > 0 ? T.crimson : T.blueL, width: `${Math.min((fr.predicted / max) * 100, 100)}%` }} />
                </div>
              </div>
              <span style={{ fontFamily: T.mono, fontSize: 10, color: T.goldLL }}>{fr.avgDaily}</span>
              <span style={{ fontFamily: T.mono, fontSize: 10, color: T.text3 }}>{fr.mape}%</span>
              <span style={{ fontFamily: T.mono, fontSize: 10, color: T.purpleL }}>{fr.conf}%</span>
              <StatusBadge s={fr.status} />
            </div>
          );
        })}
      </div>
    </>
  );
}
