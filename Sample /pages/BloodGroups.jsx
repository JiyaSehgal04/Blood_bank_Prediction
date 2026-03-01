import { StatusBadge } from "../components/StatusBadge.jsx";
import { T } from "../theme.js";
import { ALL_GROUPS } from "../data.js";

function stOf(wbc) {
  return wbc === 0 ? "critical" : wbc <= 3 ? "critical" : wbc <= 5 ? "warning" : "sufficient";
}
function bgColor(bg) {
  return bg?.includes("Neg") ? T.purpleL : T.crimson;
}

export function BloodGroupsPage({ grouped }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 14 }}>
      {ALL_GROUPS.map((bg) => {
        const d = grouped[bg] || { u: 0, v: 0, c: {} };
        const wbc = d.c["WB/PRC"]?.u || 0,
          ffp = d.c["FFP"]?.u || 0,
          plt = d.c["PLT"]?.u || 0;
        const st = stOf(wbc);
        const maxU = Math.max(wbc, ffp, plt, 10);
        const stC = { critical: "rgba(220,38,38,0.25)", warning: "rgba(217,119,6,0.25)", sufficient: T.border }[st];
        return (
          <div
            key={bg}
            style={{
              background: T.card,
              border: `1px solid ${stC}`,
              borderRadius: 10,
              padding: 18,
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.06)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div>
                <div style={{ fontFamily: T.font, fontSize: 24, fontWeight: 700, color: bgColor(bg), lineHeight: 1 }}>{bg}</div>
                <div style={{ fontSize: 10, color: T.text3, marginTop: 4, fontFamily: T.mono }}>
                  {d.u} units · {Math.round(d.v).toLocaleString()} ml
                </div>
              </div>
              <StatusBadge s={st} />
            </div>
            {[
              ["WB/PRC", wbc, T.crimson],
              ["FFP", ffp, T.blueL],
              ["PLT", plt, T.goldL],
            ].map(([lbl, val, col]) => (
              <div key={lbl} style={{ marginBottom: 9 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 9, color: T.text3, fontFamily: T.mono }}>{lbl}</span>
                  <span style={{ fontSize: 11, fontFamily: T.mono, color: val <= 3 ? "#DC2626" : T.text2 }}>{val} units</span>
                </div>
                <div style={{ height: 4, background: "rgba(0,0,0,0.06)", borderRadius: 2 }}>
                  <div
                    style={{
                      height: "100%",
                      borderRadius: 2,
                      background: val <= 3 ? T.crimson : val <= 5 ? T.goldL : col,
                      width: `${Math.min((val / maxU) * 100, 100)}%`,
                      transition: "width 0.8s ease",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
