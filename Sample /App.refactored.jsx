import { useState, useMemo } from "react";
import { T } from "./theme.js";
import { RAW, ALL_GROUPS, COMPAT, daysTo } from "./data.js";
import { buildForecast } from "./mlEngine.js";
import { Chip } from "./components/Chip.jsx";
import { TechModal } from "./components/TechModal.jsx";
import { Dashboard } from "./pages/Dashboard.jsx";
import { AlertsPage } from "./pages/Alerts.jsx";
import { InventoryPage } from "./pages/Inventory.jsx";
import { BloodGroupsPage } from "./pages/BloodGroups.jsx";
import { ExpiryPage } from "./pages/Expiry.jsx";
import { ForecastPage } from "./pages/Forecast.jsx";
import { AnalyticsPage } from "./pages/Analytics.jsx";
import { CompatibilityPage } from "./pages/Compatibility.jsx";

const PER_PAGE = 14;
const navItems = [
  { id: "dashboard", ic: "⬡", label: "Dashboard" },
  { id: "alerts", ic: "◉", label: "Alerts", badge: (alerts) => alerts.length },
  { id: "inventory", ic: "≡", label: "All Records" },
  { id: "bloodgroups", ic: "◎", label: "By Blood Group" },
  { id: "expiry", ic: "◷", label: "Expiry Tracker" },
  { id: "forecast", ic: "∿", label: "ML Forecast" },
  { id: "analytics", ic: "◈", label: "Analytics" },
  { id: "compat", ic: "⊕", label: "Compatibility" },
];
const navSections = [
  { label: "OVERVIEW", ids: ["dashboard", "alerts"] },
  { label: "INVENTORY", ids: ["inventory", "bloodgroups", "expiry"] },
  { label: "INTELLIGENCE", ids: ["forecast", "analytics", "compat"] },
];

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

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [data] = useState(RAW);
  const [forecastDays, setForecastDays] = useState(14);
  const [selBg, setSelBg] = useState("A Pos");
  const [search, setSearch] = useState("");
  const [fBg, setFBg] = useState("All");
  const [fComp, setFComp] = useState("All");
  const [expWin, setExpWin] = useState(30);
  const [showTech, setShowTech] = useState(false);
  const [compatPt, setCompatPt] = useState("A Pos");
  const [compatComp, setCompatComp] = useState("WB/PRC");
  const [sortK, setSortK] = useState("sno");
  const [sortAsc, setSortAsc] = useState(true);
  const [pg, setPg] = useState(1);

  const grouped = useMemo(() => {
    const m = {};
    data.forEach((r) => {
      if (!m[r.bg]) m[r.bg] = { u: 0, v: 0, c: {} };
      m[r.bg].u++;
      m[r.bg].v += r.qty || 0;
      if (!m[r.bg].c[r.comp]) m[r.bg].c[r.comp] = { u: 0, v: 0 };
      m[r.bg].c[r.comp].u++;
      m[r.bg].c[r.comp].v += r.qty || 0;
    });
    return m;
  }, [data]);

  const forecast = useMemo(() => buildForecast(data, forecastDays), [data, forecastDays]);

  const alerts = useMemo(() => {
    const a = [];
    ALL_GROUPS.forEach((bg) => {
      const wbc = grouped[bg]?.c["WB/PRC"]?.u || 0;
      if (wbc === 0) a.push({ t: "critical", msg: `No WB/PRC stock for ${bg}`, bg });
      else if (wbc <= 3) a.push({ t: "critical", msg: `Critical: ${bg} WB/PRC — ${wbc} unit${wbc > 1 ? "s" : ""} only`, bg });
      else if (wbc <= 5) a.push({ t: "warning", msg: `Low stock: ${bg} WB/PRC — ${wbc} units below safety threshold`, bg });
    });
    data.forEach((r) => {
      const d = daysTo(r.expiry);
      if (d >= 0 && d <= 7) a.push({ t: "expiry", msg: `Expiry: ${r.bg} ${r.comp} Unit ${r.unit} — ${d} day${d !== 1 ? "s" : ""} remaining`, bg: r.bg });
    });
    return a;
  }, [grouped, data]);

  const totalVol = useMemo(() => data.reduce((s, r) => s + (r.qty || 0), 0), [data]);
  const expiringSoon = useMemo(() => data.filter((r) => { const d = daysTo(r.expiry); return d >= 0 && d <= 30; }).length, [data]);

  const distData = useMemo(() => ALL_GROUPS.map((bg) => ({ name: bg, units: grouped[bg]?.u || 0, vol: Math.round(grouped[bg]?.v || 0) })), [grouped]);
  const compData = useMemo(() => {
    const m = {};
    data.forEach((r) => {
      if (!m[r.comp]) m[r.comp] = { u: 0, v: 0 };
      m[r.comp].u++;
      m[r.comp].v += r.qty || 0;
    });
    return Object.entries(m).map(([name, v]) => ({ name, units: v.u, vol: Math.round(v.v) }));
  }, [data]);

  const filtInv = useMemo(() => {
    let d = data;
    if (fBg !== "All") d = d.filter((r) => r.bg === fBg);
    if (fComp !== "All") d = d.filter((r) => r.comp === fComp);
    if (search) d = d.filter((r) => Object.values(r).some((v) => String(v).toLowerCase().includes(search.toLowerCase())));
    return [...d].sort((a, b) => {
      const va = String(a[sortK] ?? "");
      const vb = String(b[sortK] ?? "");
      return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    });
  }, [data, fBg, fComp, search, sortK, sortAsc]);

  const invSlice = filtInv.slice((pg - 1) * PER_PAGE, pg * PER_PAGE);
  const invPages = Math.ceil(filtInv.length / PER_PAGE);

  const expiryRows = useMemo(
    () =>
      data
        .map((r) => ({ ...r, days: daysTo(r.expiry) }))
        .filter((r) => r.days >= 0 && r.days <= expWin)
        .sort((a, b) => a.days - b.days),
    [data, expWin]
  );

  const compatRes = useMemo(() => {
    const donors = Object.entries(COMPAT)
      .filter(([, r]) => r.includes(compatPt))
      .map(([d]) => d);
    const m = {};
    data
      .filter((r) => donors.includes(r.bg) && r.comp === compatComp)
      .forEach((r) => {
        if (!m[r.bg]) m[r.bg] = { u: 0, v: 0 };
        m[r.bg].u++;
        m[r.bg].v += r.qty || 0;
      });
    return Object.entries(m)
      .map(([bg, v]) => ({ bg, u: v.u, v: Math.round(v.v) }))
      .sort((a, b) => b.u - a.u);
  }, [compatPt, compatComp, data]);

  const currentLabel = navItems.find((n) => n.id === page)?.label || "Dashboard";
  const badgeCount = page === "alerts" ? alerts.length : 0;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: T.bg, color: T.text, fontFamily: T.sans }}>
      {showTech && <TechModal onClose={() => setShowTech(false)} />}

      <aside
        style={{
          width: 224,
          flexShrink: 0,
          background: T.bg2,
          borderRight: `1px solid ${T.border}`,
          display: "flex",
          flexDirection: "column",
          position: "sticky",
          top: 0,
          height: "100vh",
          overflowY: "auto",
          boxShadow: "1px 0 0 0 rgba(0,0,0,0.04)",
        }}
      >
        <div style={{ padding: "22px 18px 18px", borderBottom: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 7,
                background: `linear-gradient(135deg,${T.crimson},${T.crimsonD})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
                boxShadow: `0 2px 8px ${T.crimson}40`,
                flexShrink: 0,
              }}
            >
              🩸
            </div>
            <div>
              <div style={{ fontFamily: T.font, fontSize: 14, fontWeight: 700, lineHeight: 1.1, color: T.text }}>SRM Blood Bank</div>
              <div style={{ fontSize: 9, color: T.text3, letterSpacing: "0.1em", marginTop: 2, fontFamily: T.mono }}>MANAGEMENT SYSTEM</div>
            </div>
          </div>
          <div style={{ fontSize: 9, color: T.text3, fontFamily: T.mono, lineHeight: 1.5 }}>SRM Institute of Science & Technology · Kattankulathur</div>
          <div style={{ marginTop: 10, background: "rgba(5,150,105,0.1)", border: "1px solid rgba(5,150,105,0.25)", borderRadius: 5, padding: "5px 9px", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: T.greenL, display: "inline-block" }} />
            <span style={{ fontSize: 9, color: T.greenL, fontFamily: T.mono, letterSpacing: "0.07em" }}>SYSTEM OPERATIONAL</span>
          </div>
        </div>

        <nav style={{ padding: "10px 0", flex: 1 }}>
          {navSections.map(({ label, ids }) => (
            <div key={label} style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 8.5, color: T.text4, fontFamily: T.mono, textTransform: "uppercase", letterSpacing: "0.14em", padding: "8px 18px 4px" }}>{label}</div>
              {navItems
                .filter((n) => ids.includes(n.id))
                .map((n) => {
                  const isActive = page === n.id;
                  const badge = typeof n.badge === "function" ? n.badge(alerts) : n.badge;
                  return (
                    <div
                      key={n.id}
                      onClick={() => setPage(n.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 9,
                        padding: "9px 14px",
                        margin: "1px 10px",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontSize: 12.5,
                        color: isActive ? T.text : T.text3,
                        background: isActive ? T.crimsonGlow : "transparent",
                        border: `1px solid ${isActive ? "rgba(220,38,38,0.25)" : "transparent"}`,
                        transition: "all 0.15s",
                        fontWeight: isActive ? 500 : 400,
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.color = T.text2;
                          e.currentTarget.style.background = "rgba(0,0,0,0.03)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.color = T.text3;
                          e.currentTarget.style.background = "transparent";
                        }
                      }}
                    >
                      <span style={{ fontSize: 12, fontFamily: T.mono, color: isActive ? T.crimson : T.text4, width: 16, textAlign: "center" }}>{n.ic}</span>
                      <span style={{ flex: 1 }}>{n.label}</span>
                      {badge > 0 && <Chip color="#DC2626">{badge}</Chip>}
                    </div>
                  );
                })}
            </div>
          ))}
        </nav>

        <div style={{ padding: "14px 16px", borderTop: `1px solid ${T.border}` }}>
          <button onClick={() => setShowTech(true)} style={{ ...btn(false), width: "100%", textAlign: "center", padding: "8px 12px", fontSize: 10 }}>
            ⟨/⟩ VIEW TECH STACK
          </button>
          <div style={{ fontSize: 9, color: T.text4, textAlign: "center", marginTop: 10, fontFamily: T.mono, lineHeight: 1.5 }}>
            v2.1 · {data.length} records
            <br />
            <span style={{ color: "rgba(220,38,38,0.6)" }}>Dept. of Biomedical Engineering</span>
          </div>
        </div>
      </aside>

      <main style={{ flex: 1, overflow: "auto", minWidth: 0 }}>
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 50,
            background: "rgba(248,250,252,0.95)",
            backdropFilter: "blur(14px)",
            borderBottom: `1px solid ${T.border}`,
            padding: "12px 28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontFamily: T.font, fontSize: 18, fontWeight: 700, color: T.text }}>{currentLabel}</div>
            <div style={{ fontSize: 10, color: T.text3, marginTop: 1, fontFamily: T.mono }}>
              SRM BLOOD BANK · {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }).toUpperCase()}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {alerts.filter((a) => a.t === "critical").length > 0 && (
              <div
                style={{
                  background: T.crimsonGlow,
                  border: `1px solid ${T.crimson}50`,
                  borderRadius: 6,
                  padding: "5px 12px",
                  fontSize: 11,
                  color: T.crimson,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontFamily: T.mono,
                }}
              >
                ⊗ {alerts.filter((a) => a.t === "critical").length} Critical
              </div>
            )}
            <button onClick={() => setPage("forecast")} style={{ ...btn(false, T.blueL), fontSize: 10 }}>ML FORECAST</button>
            <button onClick={() => setShowTech(true)} style={{ ...btn(false), fontSize: 10 }}>TECH STACK</button>
          </div>
        </div>

        <div style={{ padding: 26 }}>
          {page === "dashboard" && (
            <Dashboard
              data={data}
              totalVol={totalVol}
              expiringSoon={expiringSoon}
              grouped={grouped}
              alerts={alerts}
              distData={distData}
              compData={compData}
            />
          )}
          {page === "alerts" && <AlertsPage alerts={alerts} />}
          {page === "inventory" && (
            <InventoryPage
              filtInv={filtInv}
              invSlice={invSlice}
              PER_PAGE={PER_PAGE}
              pg={pg}
              invPages={invPages}
              search={search}
              fBg={fBg}
              fComp={fComp}
              sortK={sortK}
              sortAsc={sortAsc}
              setSearch={setSearch}
              setFBg={setFBg}
              setFComp={setFComp}
              setPg={setPg}
              setSortK={setSortK}
              setSortAsc={setSortAsc}
            />
          )}
          {page === "bloodgroups" && <BloodGroupsPage grouped={grouped} />}
          {page === "expiry" && <ExpiryPage expiryRows={expiryRows} expWin={expWin} setExpWin={setExpWin} />}
          {page === "forecast" && (
            <ForecastPage
              forecast={forecast}
              forecastDays={forecastDays}
              setForecastDays={setForecastDays}
              selBg={selBg}
              setSelBg={setSelBg}
            />
          )}
          {page === "analytics" && <AnalyticsPage data={data} distData={distData} compData={compData} forecast={forecast} />}
          {page === "compat" && (
            <CompatibilityPage
              grouped={grouped}
              compatPt={compatPt}
              setCompatPt={setCompatPt}
              compatComp={compatComp}
              setCompatComp={setCompatComp}
              compatRes={compatRes}
            />
          )}
        </div>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=DM+Sans:wght@300;400;500&family=JetBrains+Mono:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0 }
        body { background: #F8FAFC }
        ::-webkit-scrollbar { width: 6px; height: 6px }
        ::-webkit-scrollbar-track { background: #F1F5F9 }
        ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 3px }
        select option { background: #fff; color: #0F172A }
        input::placeholder { color: #94A3B8 }
        input:focus, select:focus { border-color: #DC2626 !important; outline: none }
      `}</style>
    </div>
  );
}
