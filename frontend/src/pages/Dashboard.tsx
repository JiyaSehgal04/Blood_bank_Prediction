import { useEffect, useRef, useState } from "react";
import api from "../lib/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
  ReferenceLine,
  LabelList,
} from "recharts";

interface Stats {
  inventory: {
    total: number;
    by_group: Record<string, number>;
    by_component: Record<string, number>;
    expiring_soon: number;
  };
  donors: { total: number; eligible: number };
  allocations: { total_today: number; total_all_time: number };
  wastage: { total_expired: number; today: number };
  alerts: { active: number; critical: number };
  uploads: { total_batches: number; total_records: number };
}

const BLOOD_COLORS: Record<string, string> = {
  "O Pos": "#006d30",
  "A Pos": "#008040",
  "B Pos": "#4de082",
  "AB Pos": "#92f5a4",
  "O Neg": "#1b1c15",
  "A Neg": "#585756",
  "B Neg": "#6f7a6e",
  "AB Neg": "#becabc",
};

const BLOOD_GROUP_ORDER = [
  "O Pos",
  "B Pos",
  "A Pos",
  "AB Pos",
  "O Neg",
  "A Neg",
  "B Neg",
  "AB Neg",
];
const DASHBOARD_CACHE_KEY = "blood_bank_dashboard_stats_cache";
const DASHBOARD_CACHE_TIME_KEY = "blood_bank_dashboard_stats_updated_at";
const DASHBOARD_CHART_ANIMATION_MS = 1000;

const STOCK_STATUS = {
  critical: { label: "Critical", color: "#ba1a1a" },
  low: { label: "Low", color: "#b25c00" },
  watch: { label: "Watch", color: "#008040" },
  healthy: { label: "Healthy", color: "#006d30" },
};

interface GroupDatum {
  name: string;
  units: number;
  share: number;
  status: keyof typeof STOCK_STATUS;
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  accent = false,
}: {
  icon: string;
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`p-6 border rounded ${accent ? "bg-[#1b1c15] border-transparent" : "soft-green-panel border-[#becabc]/30"}`}
    >
      <div className="flex items-center justify-between mb-4">
        <span
          className={`text-[10px] font-medium uppercase tracking-[0.2em] ${accent ? "text-white/50" : "text-[#3f493f]"}`}
        >
          {label}
        </span>
        <span
          className={`material-symbols-outlined ${accent ? "text-[#79db8d]" : "text-[#006d30]"}`}
        >
          {icon}
        </span>
      </div>
      <div
        className={`mono-data text-3xl font-bold ${accent ? "text-white" : "text-[#1b1c15]"}`}
      >
        {value}
      </div>
      {sub && (
        <div
          className={`text-xs mt-1 ${accent ? "text-white/40" : "text-[#6f7a6e]"}`}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

function getStockStatus(
  units: number,
  averageUnits: number,
): GroupDatum["status"] {
  if (units === 0) return "critical";
  if (units < 3) return "low";
  if (averageUnits > 0 && units < averageUnits * 0.65) return "watch";
  return "healthy";
}

function InventoryTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: GroupDatum }>;
}) {
  if (!active || !payload?.length) return null;

  const item = payload[0].payload;
  const status = STOCK_STATUS[item.status];

  return (
    <div className="rounded bg-[#1b1c15] px-3 py-2 shadow-xl">
      <div className="flex items-center gap-2">
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: status.color }}
        />
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">
          {item.name}
        </span>
      </div>
      <div className="mt-1 mono-data text-xl font-bold text-white">
        {item.units} units
      </div>
      <div className="text-[11px] text-white/55">
        {item.share.toFixed(1)}% of stock · {status.label}
      </div>
    </div>
  );
}

function readCache<T>(key: string, fallback: T): T {
  try {
    const cached = sessionStorage.getItem(key);
    return cached ? (JSON.parse(cached) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeCache<T>(key: string, value: T) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Cache is a convenience only; ignore quota or private-mode failures.
  }
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(() =>
    readCache<Stats | null>(DASHBOARD_CACHE_KEY, null),
  );
  const [loading, setLoading] = useState(
    () => readCache<Stats | null>(DASHBOARD_CACHE_KEY, null) === null,
  );
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<string>(() =>
    readCache<string>(DASHBOARD_CACHE_TIME_KEY, ""),
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStats = () => {
    api
      .get("/dashboard/stats")
      .then((r) => {
        const updatedAt = new Date().toLocaleTimeString();
        setStats(r.data);
        writeCache(DASHBOARD_CACHE_KEY, r.data);
        writeCache(DASHBOARD_CACHE_TIME_KEY, updatedAt);
        setError("");
        setLastUpdated(updatedAt);
      })
      .catch((e) =>
        setError(e?.response?.data?.error ?? "Failed to load dashboard"),
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStats();
    intervalRef.current = setInterval(fetchStats, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="mono-data text-[#6f7a6e] text-sm animate-pulse">
          Loading system data...
        </div>
      </div>
    );

  if (error && !stats)
    return (
      <div className="bg-[#ffdad6] border border-[#ba1a1a]/20 rounded p-6 text-[#93000a]">
        <span className="material-symbols-outlined mr-2">error</span>
        {error} — make sure the Flask API is running on port 5001.
      </div>
    );

  const totalInventory = stats?.inventory.total ?? 0;
  const averageUnits = totalInventory / BLOOD_GROUP_ORDER.length;
  const groupData: GroupDatum[] = stats
    ? BLOOD_GROUP_ORDER.map((name) => {
        const units = stats.inventory.by_group[name] ?? 0;
        return {
          name,
          units,
          share: totalInventory ? (units / totalInventory) * 100 : 0,
          status: getStockStatus(units, averageUnits),
        };
      }).sort((a, b) => a.units - b.units)
    : [];
  const criticalGroups = groupData.filter(
    (g) => g.status === "critical" || g.status === "low",
  ).length;

  return (
    <div className="green-stroke-bg space-y-8">
      {/* Header */}
      <div>
        <div className="text-[10px] font-mono text-[#006d30] uppercase tracking-[0.3em] mb-1">
          System Overview
        </div>
        <h1 className="font-headline text-3xl font-extrabold text-[#1b1c15] tracking-tight">
          Dashboard
        </h1>
        {lastUpdated && (
          <div className="text-[10px] font-mono text-[#6f7a6e] mt-1">
            Last updated {lastUpdated}
          </div>
        )}
        {error && stats && (
          <div className="text-[10px] font-mono text-[#ba1a1a] mt-1">
            Poll failed — showing cached data
          </div>
        )}
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon="inventory_2"
          label="Available Units"
          value={stats?.inventory.total ?? 0}
          sub={`${stats?.inventory.expiring_soon ?? 0} expiring in 7d`}
          accent
        />
        <KpiCard
          icon="verified_user"
          label="Donors"
          value={stats?.donors.total ?? 0}
          sub={`${stats?.donors.eligible ?? 0} eligible`}
        />
        <KpiCard
          icon="hub"
          label="Allocations Today"
          value={stats?.allocations.total_today ?? 0}
          sub={`${stats?.allocations.total_all_time ?? 0} all-time`}
        />
        <KpiCard
          icon="delete_sweep"
          label="Expired Units"
          value={stats?.wastage.total_expired ?? 0}
          sub="logged wastage"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar chart */}
        <div className="lg:col-span-2 soft-green-panel border border-[#becabc]/30 rounded p-6">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-[10px] font-mono text-[#006d30] uppercase tracking-[0.2em] mb-1">
                Inventory Risk
              </div>
              <h3 className="font-headline text-lg font-bold text-[#1b1c15]">
                Blood Group Stock Balance
              </h3>
              <p className="mt-1 text-xs text-[#6f7a6e]">
                Sorted from lowest to highest stock. Red and amber groups need
                replenishment first.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-right">
              <div className="rounded bg-[#f5f4e8] px-3 py-2">
                <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#6f7a6e]">
                  Avg/group
                </div>
                <div className="mono-data text-lg font-bold text-[#1b1c15]">
                  {averageUnits.toFixed(1)}
                </div>
              </div>
              <div
                className={`rounded px-3 py-2 ${criticalGroups > 0 ? "bg-[#ffdad6]" : "bg-[#e3f8df]"}`}
              >
                <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#6f7a6e]">
                  Risk groups
                </div>
                <div
                  className={`mono-data text-lg font-bold ${criticalGroups > 0 ? "text-[#93000a]" : "text-[#006d30]"}`}
                >
                  {criticalGroups}
                </div>
              </div>
            </div>
          </div>
          {groupData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart
                  data={groupData}
                  layout="vertical"
                  barSize={18}
                  margin={{ top: 8, right: 36, bottom: 8, left: 4 }}
                >
                  <CartesianGrid
                    stroke="#e4e3d7"
                    strokeDasharray="3 3"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{
                      fontSize: 10,
                      fontFamily: "JetBrains Mono",
                      fill: "#6f7a6e",
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={56}
                    tick={{
                      fontSize: 10,
                      fontFamily: "JetBrains Mono",
                      fill: "#3f493f",
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  {averageUnits > 0 && (
                    <ReferenceLine
                      x={averageUnits}
                      stroke="#1b1c15"
                      strokeDasharray="4 4"
                      label={{
                        value: "avg",
                        position: "top",
                        fill: "#6f7a6e",
                        fontSize: 10,
                        fontFamily: "JetBrains Mono",
                      }}
                    />
                  )}
                  <Tooltip
                    cursor={{ fill: "#f5f4e8" }}
                    content={<InventoryTooltip />}
                  />
                  <Bar
                    dataKey="units"
                    radius={[0, 8, 8, 0]}
                    animationDuration={DASHBOARD_CHART_ANIMATION_MS}
                    animationEasing="ease-out"
                  >
                    {groupData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={
                          entry.status === "healthy"
                            ? (BLOOD_COLORS[entry.name] ?? "#006d30")
                            : STOCK_STATUS[entry.status].color
                        }
                      />
                    ))}
                    <LabelList
                      dataKey="units"
                      position="right"
                      className="mono-data"
                      fill="#1b1c15"
                      fontSize={11}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 flex flex-wrap gap-3 border-t border-[#becabc]/30 pt-4">
                {Object.entries(STOCK_STATUS).map(([key, item]) => (
                  <div
                    key={key}
                    className="flex items-center gap-2 text-[11px] text-[#3f493f]"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-mono uppercase tracking-[0.14em]">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-56 flex items-center justify-center text-[#6f7a6e] text-sm">
              No inventory data — run initial load or upload a file
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Alerts card */}
          <div
            className={`p-6 border rounded ${
              (stats?.alerts.critical ?? 0) > 0
                ? "bg-[#ffdad6] border-[#ba1a1a]/10"
                : "soft-green-panel border-[#becabc]/30"
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <span
                className={`material-symbols-outlined ${(stats?.alerts.critical ?? 0) > 0 ? "text-[#ba1a1a]" : "text-[#006d30]"}`}
              >
                {(stats?.alerts.critical ?? 0) > 0 ? "warning" : "check_circle"}
              </span>
              <h3 className="font-headline font-bold text-[#1b1c15]">
                Active Alerts
              </h3>
            </div>
            <div className="mono-data text-4xl font-bold text-[#1b1c15] mb-1">
              {stats?.alerts.active ?? 0}
            </div>
            <div className="text-xs text-[#3f493f]">
              {stats?.alerts.critical ?? 0} critical
            </div>
          </div>

          {/* Components breakdown */}
          <div className="soft-green-panel border border-[#becabc]/30 rounded p-6">
            <h3 className="font-headline font-bold text-[#1b1c15] mb-4">
              By Component
            </h3>
            {stats && Object.keys(stats.inventory.by_component).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(stats.inventory.by_component).map(
                  ([comp, count]) => (
                    <div key={comp}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-mono text-[#3f493f]">
                          {comp}
                        </span>
                        <span className="mono-data text-sm font-bold text-[#1b1c15]">
                          {count}
                        </span>
                      </div>
                      <div className="h-1.5 bg-[#f5f4e8] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#006d30] rounded-full"
                          style={{
                            width: `${Math.min(100, (count / (stats.inventory.total || 1)) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ),
                )}
              </div>
            ) : (
              <div className="text-xs text-[#6f7a6e]">No data</div>
            )}
          </div>

          {/* Data ingestion */}
          <div className="soft-green-panel border border-[#becabc]/30 rounded p-6">
            <h3 className="font-headline font-bold text-[#1b1c15] mb-3">
              Data Ingestion
            </h3>
            <div className="space-y-2">
              {[
                ["Upload Batches", stats?.uploads.total_batches ?? 0],
                ["Records Loaded", stats?.uploads.total_records ?? 0],
              ].map(([label, val]) => (
                <div
                  key={label as string}
                  className="flex justify-between items-center text-xs"
                >
                  <span className="text-[#3f493f]">{label}</span>
                  <span className="mono-data font-bold text-[#1b1c15]">
                    {val}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
