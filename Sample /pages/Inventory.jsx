import { Chip } from "../components/Chip.jsx";
import { StatusBadge } from "../components/StatusBadge.jsx";
import { T } from "../theme.js";
import { ALL_GROUPS } from "../data.js";
import { daysTo } from "../data.js";

const card = { background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden", marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" };
const row = (cols) => ({ display: "grid", gridTemplateColumns: cols, alignItems: "center", padding: "10px 18px", borderBottom: `1px solid ${T.border}`, fontSize: 12, gap: 8 });
const th = { fontSize: 9, color: T.text3, fontFamily: T.mono, textTransform: "uppercase", letterSpacing: "0.08em", cursor: "pointer", userSelect: "none" };
const inp = { background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 7, padding: "7px 11px", color: T.text, fontSize: 12, fontFamily: T.sans, outline: "none" };
const sel = { ...inp, cursor: "pointer" };
const btn = (active, accent = T.crimson) => ({
  padding: "6px 14px",
  borderRadius: 5,
  border: `1px solid ${active ? accent : T.border}`,
  background: active ? `${accent}18` : "transparent",
  color: active ? accent : T.text3,
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

export function InventoryPage({ filtInv, invSlice, PER_PAGE, pg, invPages, search, fBg, fComp, sortK, sortAsc, setSearch, setFBg, setFComp, setPg, setSortK, setSortAsc }) {
  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <input
          style={inp}
          placeholder="Search…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPg(1);
          }}
        />
        <select
          style={sel}
          value={fBg}
          onChange={(e) => {
            setFBg(e.target.value);
            setPg(1);
          }}
        >
          <option value="All">All Blood Groups</option>
          {ALL_GROUPS.map((bg) => (
            <option key={bg}>{bg}</option>
          ))}
        </select>
        <select
          style={sel}
          value={fComp}
          onChange={(e) => {
            setFComp(e.target.value);
            setPg(1);
          }}
        >
          <option value="All">All Components</option>
          {["WB/PRC", "FFP", "PLT"].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <span style={{ marginLeft: "auto", fontSize: 11, color: T.text3, fontFamily: T.mono }}>{filtInv.length} RECORDS</span>
      </div>
      <div style={card}>
        <div style={{ ...row("50px 90px 80px 100px 90px 100px 70px 80px"), background: T.bg }}>
          {[
            ["sno", "S.No"],
            ["unit", "Unit No"],
            ["comp", "Component"],
            ["bg", "Blood Group"],
            ["col", "Collection"],
            ["expiry", "Expiry"],
            ["qty", "Qty (ml)"],
            ["", "Status"],
          ].map(([k, h]) => (
            <span
              key={h}
              style={th}
              onClick={() => {
                if (k) {
                  setSortK(k);
                  setSortAsc(sortK === k ? !sortAsc : true);
                }
              }}
            >
              {h}
              {sortK === k ? (sortAsc ? " ↑" : " ↓") : ""}
            </span>
          ))}
        </div>
        {invSlice.map((r, i) => {
          const d = daysTo(r.expiry);
          return (
            <div
              key={i}
              style={row("50px 90px 80px 100px 90px 100px 70px 80px")}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.02)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span style={{ fontFamily: T.mono, fontSize: 10, color: T.text4 }}>{r.sno}</span>
              <span style={{ fontFamily: T.mono, fontSize: 9, color: T.text3 }}>{r.unit}</span>
              <Chip color={compColor(r.comp)}>{r.comp}</Chip>
              <span style={{ fontFamily: T.font, fontWeight: 700, fontSize: 13, color: bgColor(r.bg) }}>{r.bg}</span>
              <span style={{ fontSize: 10, color: T.text3, fontFamily: T.mono }}>{r.col}</span>
              <span style={{ fontFamily: T.mono, fontSize: 10, color: d <= 7 ? "#DC2626" : d <= 30 ? "#D97706" : T.text3 }}>
                {r.expiry}
                {d <= 30 && d >= 0 ? <span style={{ fontSize: 8, opacity: 0.7, marginLeft: 3 }}>{d}d</span> : null}
              </span>
              <span style={{ fontFamily: T.mono, fontSize: 10 }}>{r.qty || "—"}</span>
              <StatusBadge s={d <= 0 ? "expired" : d <= 7 ? "critical" : d <= 30 ? "warning" : "sufficient"} />
            </div>
          );
        })}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 18px", borderTop: `1px solid ${T.border}`, fontSize: 10, color: T.text3, fontFamily: T.mono }}>
          <span>
            {(pg - 1) * PER_PAGE + 1}–{Math.min(pg * PER_PAGE, filtInv.length)} of {filtInv.length}
          </span>
          <div style={{ display: "flex", gap: 3 }}>
            {Array.from({ length: invPages }, (_, i) => i + 1)
              .slice(Math.max(0, pg - 3), Math.min(invPages, pg + 2))
              .map((p) => (
                <button key={p} onClick={() => setPg(p)} style={{ ...btn(p === pg), padding: "3px 9px", fontSize: 10 }}>
                  {p}
                </button>
              ))}
          </div>
        </div>
      </div>
    </>
  );
}
