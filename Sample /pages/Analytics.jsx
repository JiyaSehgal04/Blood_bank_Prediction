import { HorizontalUnitsBarChart } from "../charts/HorizontalUnitsBarChart.jsx";
import { VolumeByComponentPieChart } from "../charts/VolumeByComponentPieChart.jsx";
import { ExpiryRiskBucketsChart } from "../charts/ExpiryRiskBucketsChart.jsx";
import { MlConfidenceMapeChart } from "../charts/MlConfidenceMapeChart.jsx";
import { T } from "../theme.js";
import { ALL_GROUPS } from "../data.js";
import { daysTo } from "../data.js";

const card = { background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden", marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" };
const cardHead = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: `1px solid ${T.border}`, background: T.bg };
const cardTitle = { fontFamily: T.font, fontSize: 14, fontWeight: 700, color: T.text };

export function AnalyticsPage({ data, distData, compData, forecast }) {
  const expiryBuckets = [
    { n: "0–7 days", v: data.filter((r) => { const d = daysTo(r.expiry); return d >= 0 && d <= 7; }).length, c: T.crimson },
    { n: "8–14d", v: data.filter((r) => { const d = daysTo(r.expiry); return d > 7 && d <= 14; }).length, c: T.goldL },
    { n: "15–30d", v: data.filter((r) => { const d = daysTo(r.expiry); return d > 14 && d <= 30; }).length, c: T.goldLL },
    { n: "31–60d", v: data.filter((r) => { const d = daysTo(r.expiry); return d > 30 && d <= 60; }).length, c: T.blueL },
    { n: "60+ days", v: data.filter((r) => { const d = daysTo(r.expiry); return d > 60; }).length, c: T.greenL },
  ];
  const confMapeData = ALL_GROUPS.map((bg) => ({ name: bg, conf: +forecast[bg]?.conf || 0, mape: +forecast[bg]?.mape || 0 }));

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <div style={card}>
          <div style={cardHead}>
            <span style={cardTitle}>Units per Blood Group</span>
          </div>
          <div style={{ padding: "12px 4px" }}>
            <HorizontalUnitsBarChart data={distData} />
          </div>
        </div>
        <div style={card}>
          <div style={cardHead}>
            <span style={cardTitle}>Volume by Component (ml)</span>
          </div>
          <div style={{ padding: "12px 4px", display: "flex", justifyContent: "center" }}>
            <VolumeByComponentPieChart data={compData} />
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={card}>
          <div style={cardHead}>
            <span style={cardTitle}>Expiry Risk Buckets</span>
          </div>
          <div style={{ padding: "12px 4px" }}>
            <ExpiryRiskBucketsChart data={expiryBuckets} />
          </div>
        </div>
        <div style={card}>
          <div style={cardHead}>
            <span style={cardTitle}>ML Confidence vs MAPE</span>
          </div>
          <div style={{ padding: "12px 4px" }}>
            <MlConfidenceMapeChart data={confMapeData} />
          </div>
        </div>
      </div>
    </>
  );
}
