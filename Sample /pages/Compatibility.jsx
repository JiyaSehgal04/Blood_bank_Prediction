import { T } from "../theme.js";
import { ALL_GROUPS, COMPAT } from "../data.js";

const card = { background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden", marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" };
const cardHead = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: `1px solid ${T.border}`, background: T.bg };
const cardTitle = { fontFamily: T.font, fontSize: 14, fontWeight: 700, color: T.text };
const sel = { background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 7, padding: "7px 11px", color: T.text, fontSize: 12, fontFamily: T.sans, cursor: "pointer" };

function bgColor(bg) {
  return bg?.includes("Neg") ? T.purpleL : T.crimson;
}

export function CompatibilityPage({ grouped, compatPt, setCompatPt, compatComp, setCompatComp, compatRes }) {
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 14, marginBottom: 14 }}>
        <div style={card}>
          <div style={cardHead}>
            <span style={cardTitle}>ABO/Rh Compatibility Matrix</span>
            <span style={{ fontSize: 9, color: T.text3, fontFamily: T.mono }}>DONOR → RECIPIENT</span>
          </div>
          <div style={{ padding: 18, overflowX: "auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: `70px ${"1fr ".repeat(8)}`, gap: 3, minWidth: 500 }}>
              <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 4, fontSize: 8, color: T.text3, fontFamily: T.mono }}>D ↓ R →</div>
              {ALL_GROUPS.map((bg) => (
                <div key={bg} style={{ textAlign: "center", fontSize: 8, color: T.text3, fontFamily: T.mono, lineHeight: 1.2, padding: "0 1px" }}>
                  {bg}
                </div>
              ))}
              {ALL_GROUPS.map((donor) => [
                <div key={donor} style={{ fontSize: 8.5, color: T.text2, fontFamily: T.mono, display: "flex", alignItems: "center" }}>
                  {donor}
                </div>,
                ...ALL_GROUPS.map((rec) => {
                  const can = (COMPAT[donor] || []).includes(rec);
                  const same = donor === rec;
                  return (
                    <div
                      key={rec}
                      style={{
                        aspectRatio: 1,
                        minHeight: 22,
                        borderRadius: 3,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                        fontWeight: 700,
                        background: same ? "rgba(37,99,235,0.15)" : can ? "rgba(5,150,105,0.15)" : "rgba(220,38,38,0.06)",
                        color: same ? T.blueL : can ? "#059669" : "rgba(220,38,38,0.4)",
                      }}
                    >
                      {same ? "●" : can ? "✓" : ""}
                    </div>
                  );
                }),
              ])}
            </div>
            <div style={{ display: "flex", gap: 14, marginTop: 12, fontSize: 9, color: T.text3, fontFamily: T.mono }}>
              <span><span style={{ color: "#059669" }}>✓</span> Compatible</span>
              <span><span style={{ color: T.blueL }}>●</span> Same group</span>
              <span style={{ color: "rgba(220,38,38,0.5)" }}>— Incompatible</span>
            </div>
          </div>
        </div>
        <div style={card}>
          <div style={cardHead}>
            <span style={cardTitle}>Live Stock Levels</span>
          </div>
          <div style={{ padding: "14px 18px" }}>
            {ALL_GROUPS.map((bg) => {
              const u = grouped[bg]?.u || 0;
              return (
                <div key={bg} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}>
                  <span style={{ width: 56, fontFamily: T.font, fontWeight: 700, fontSize: 12, color: bgColor(bg), flexShrink: 0 }}>{bg}</span>
                  <div style={{ flex: 1, height: 4, background: "rgba(0,0,0,0.06)", borderRadius: 2 }}>
                    <div
                      style={{
                        height: "100%",
                        borderRadius: 2,
                        background: u <= 3 ? T.crimson : u <= 5 ? T.goldL : T.greenL,
                        width: `${Math.min((u / 20) * 100, 100)}%`,
                        transition: "width 0.8s",
                      }}
                    />
                  </div>
                  <span style={{ width: 24, textAlign: "right", fontFamily: T.mono, fontSize: 10, color: T.text3, flexShrink: 0 }}>{u}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={card}>
        <div style={cardHead}>
          <span style={cardTitle}>Donor Availability Checker</span>
          <span style={{ fontSize: 9, color: T.text3, fontFamily: T.mono }}>REAL-TIME LOOKUP</span>
        </div>
        <div style={{ padding: "16px 18px", display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap", borderBottom: `1px solid ${T.border}` }}>
          <div>
            <div style={{ fontSize: 9, color: T.text3, fontFamily: T.mono, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.08em" }}>Patient Blood Group</div>
            <select style={sel} value={compatPt} onChange={(e) => setCompatPt(e.target.value)}>
              {ALL_GROUPS.map((bg) => (
                <option key={bg}>{bg}</option>
              ))}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 9, color: T.text3, fontFamily: T.mono, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.08em" }}>Component Required</div>
            <select style={sel} value={compatComp} onChange={(e) => setCompatComp(e.target.value)}>
              {["WB/PRC", "FFP", "PLT"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ padding: "16px 18px" }}>
          {compatRes.length === 0 ? (
            <div style={{ background: T.crimsonGlow, border: `1px solid ${T.crimson}50`, borderRadius: 7, padding: "12px 14px", color: "#DC2626", fontSize: 12 }}>
              ⊗ No compatible {compatComp} units available for patient {compatPt}
            </div>
          ) : (
            <>
              <div style={{ fontSize: 11, color: T.text3, marginBottom: 10, fontFamily: T.sans }}>
                Compatible <strong style={{ color: T.text }}>{compatComp}</strong> donors available for <strong style={{ color: T.text }}>{compatPt}</strong>:
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                {compatRes.map(({ bg, u, v }) => (
                  <div key={bg} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "12px 16px", minWidth: 130 }}>
                    <div style={{ fontFamily: T.font, fontWeight: 700, fontSize: 17, color: bgColor(bg), lineHeight: 1, marginBottom: 5 }}>{bg}</div>
                    <div style={{ fontSize: 11, color: "#059669", fontFamily: T.mono }}>{u} unit{u > 1 ? "s" : ""}</div>
                    <div style={{ fontSize: 10, color: T.text3, fontFamily: T.mono }}>{v.toLocaleString()} ml</div>
                  </div>
                ))}
              </div>
              <div style={{ background: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.25)", borderRadius: 7, padding: "9px 13px", fontSize: 10, color: "#D97706", fontFamily: T.mono }}>
                △ CLINICAL NOTE: Cross-matching must be performed prior to any transfusion. This is an inventory guidance tool only.
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
