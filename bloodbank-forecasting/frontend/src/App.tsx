import { useMemo, useState, type ReactNode } from "react";
import { LayoutDashboard, Boxes, LineChart, Bell } from "lucide-react";
import InventoryPage from "./pages/Inventory";
import ForecastPage from "./pages/Forecast";
import AlertsPage from "./pages/Alerts";

type PageKey = "inventory" | "forecast" | "alerts";

export default function App() {
  const [page, setPage] = useState<PageKey>("inventory");

  const title = useMemo(() => {
    if (page === "inventory") return "Inventory Overview";
    if (page === "forecast") return "7-Day Forecast";
    return "Alerts & Risks";
  }, [page]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.25),_transparent_60%),radial-gradient(circle_at_bottom,_rgba(59,130,246,0.15),_transparent_55%)]" />
      <div className="relative z-10 flex min-h-screen max-w-6xl mx-auto py-6">
        <aside className="w-64 h-full sticky top-6 self-start bg-slate-950/70 border border-slate-800 rounded-3xl shadow-2xl shadow-slate-900/60 backdrop-blur-lg">
          <div className="p-5 border-b border-slate-800">
            <div className="text-lg font-semibold tracking-tight">Blood Bank DSS</div>
            <div className="text-xs text-slate-400 mt-1">
              Inventory + Forecasting + Alerts
            </div>
          </div>

          <nav className="p-3 space-y-2">
            <SidebarItem
              active={page === "inventory"}
              icon={<Boxes size={18} />}
              label="Inventory"
              onClick={() => setPage("inventory")}
            />
            <SidebarItem
              active={page === "forecast"}
              icon={<LineChart size={18} />}
              label="Forecast"
              onClick={() => setPage("forecast")}
            />
            <SidebarItem
              active={page === "alerts"}
              icon={<Bell size={18} />}
              label="Alerts"
              onClick={() => setPage("alerts")}
            />
          </nav>

          <div className="p-4 mt-auto text-xs text-slate-500/80 border-t border-slate-800">
            Proxy demand mode (collection-based) until issued/usage is added.
          </div>
        </aside>

        <main className="flex-1 ml-6">
          <Topbar title={title} />
          <div className="p-6 space-y-4">
            {page === "inventory" && <InventoryPage />}
            {page === "forecast" && <ForecastPage />}
            {page === "alerts" && <AlertsPage />}
          </div>
        </main>
      </div>
    </div>
  );
}

function Topbar({ title }: { title: string }) {
  return (
    <div className="sticky top-0 z-10">
      <div className="flex items-center justify-between px-6 py-4 rounded-3xl border border-slate-800 bg-slate-950/80 shadow-xl shadow-slate-900/40 backdrop-blur-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-2xl bg-slate-900 border border-slate-700">
            <LayoutDashboard size={18} className="text-slate-200" />
          </div>
          <div>
            <div className="font-semibold tracking-tight text-slate-50">{title}</div>
            <div className="text-xs text-slate-400">
              ML-based 7-day forecasting + inventory safety checks
            </div>
          </div>
        </div>
        <div className="text-xs text-slate-400">
          Backend: FastAPI • DB: PostgreSQL • Forecast engine: Holt-Winters
        </div>
      </div>
    </div>
  );
}

function SidebarItem({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm transition-colors",
        active
          ? "bg-slate-100 text-slate-900 shadow-sm"
          : "hover:bg-slate-900/60 text-slate-200",
      ].join(" ")}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}