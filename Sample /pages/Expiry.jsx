import { Chip } from "../components/Chip.jsx";
import { StatusBadge } from "../components/StatusBadge.jsx";
import { T } from "../theme.js";

const row = (cols) => ({ display: "grid", gridTemplateColumns: cols, alignItems: "center", padding: "10px 18px", borderBottom: `1px solid ${T.border}`, fontSize: 12, gap: 8 });
const th = { fontSize: 9, color: T.text3, fontFamily: T.mono, textTransform: "uppercase", letterSpacing: "0.08em" };
const card = { background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden", marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" };
const btn = (active) => ({
  padding: "6px 14px",
  borderRadius: 5,
  border: `1px solid ${active ? T.crimson : T.border}`,
  background: active ? T.crimsonGlow : "transparent",
  color: active ? T.crimson : T.text3,
  cursor: "pointer",
  fontSize: 11,
  fontFamily: T.mono,
});

function compColor(c) {
  return { WB: T.crimson, FF: T.blue, PL: T.gold }[c?.substring(0, 2)] || T.text3;
}
function bgColor(bg) {
  return bg?.includes("Neg") ? T.purpleL : T.crimson;
}

export function ExpiryPage({ expiryRows, expWin, setExpWin }) {
  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 10, color: T.text3, fontFamily: T.mono }}>WINDOW:</span>
        {[7, 14, 30, 60, 365].map((d) => (
          <button key={d} onClick={() => setExpWin(d)} style={btn(expWin === d)}>
            {d}d
          </button>
        ))}
        <span style={{ marginLeft: "auto", fontSize: 10, color: T.text3, fontFamily: T.mono }}>{expiryRows.length} UNITS</span>
      </div>
      <div style={card}>
        <div style={{ ...row("70px 100px 80px 110px 70px 100px 80px"), background: T.bg }}>
          {["Days Left", "Blood Group", "Component", "Unit No", "Qty", "Expiry Date", "Priority"].map((h) => (
            <span key={h} style={th}>
              {h}
            </span>
          ))}
        </div>
        {expiryRows.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: T.text3, fontFamily: T.mono, fontSize: 12 }}>No units expiring within {expWin} days</div>
        ) : (
          expiryRows.map((r, i) => {
            const uc = r.days <= 7 ? "#DC2626" : r.days <= 14 ? "#D97706" : T.text3;
            return (
              <div
                key={i}
                style={row("70px 100px 80px 110px 70px 100px 80px")}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.02)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div>
                  <span style={{ fontFamily: T.font, fontSize: 22, fontWeight: 700, color: uc, lineHeight: 1 }}>{r.days}</span>
                  <span style={{ fontSize: 8, color: T.text3, marginLeft: 3, fontFamily: T.mono }}>days</span>
                </div>
                <span style={{ fontFamily: T.font, fontWeight: 700, fontSize: 13, color: bgColor(r.bg) }}>{r.bg}</span>
                <Chip color={compColor(r.comp)}>{r.comp}</Chip>
                <span style={{ fontFamily: T.mono, fontSize: 9, color: T.text3 }}>{r.unit}</span>
                <span style={{ fontFamily: T.mono, fontSize: 10 }}>{r.qty || "—"}</span>
                <span style={{ fontFamily: T.mono, fontSize: 10, color: uc }}>{r.expiry}</span>
                <StatusBadge s={r.days <= 7 ? "critical" : r.days <= 14 ? "warning" : "sufficient"} />
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
