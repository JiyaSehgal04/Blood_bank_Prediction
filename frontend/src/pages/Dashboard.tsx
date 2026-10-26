import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { DATA_CACHE_INVALIDATED_EVENT } from "../lib/sessionCache";
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

interface ExpiryBucket {
  label: string;
  units: number;
}

interface Stats {
  inventory: {
    total: number;
    by_group: Record<string, number>;
    by_component: Record<string, number>;
    expiring_soon: number;
    total_volume_ml?: number;
    by_group_component?: Record<string, Record<string, number>>;
    expiry_buckets?: ExpiryBucket[];
  };
  donors: { total: number; eligible: number };
  allocations: {
    total_today: number;
    total_all_time: number;
    total_requested?: number;
    total_fulfilled?: number;
    fulfillment_rate?: number;
    by_status?: Record<string, number>;
  };
  wastage: { total_expired: number; today: number };
  alerts: { active: number; critical: number };
  uploads: { total_batches: number; total_records: number };
}

interface AlertRow {
  id: string;
  alert_type: string;
  blood_group?: string | null;
  component?: string | null;
  severity: string;
  message?: string | null;
  created_at: string;
}

interface AllocationRow {
  id: string;
  blood_group?: string | null;
  component?: string | null;
  units_requested?: number | null;
  units_fulfilled?: number | null;
  priority?: string | null;
  status?: string | null;
  created_at: string;
}

const BLOOD_COLORS: Record<string, string> = {
  "O Pos": "#13294b",
  "A Pos": "#1f3d73",
  "B Pos": "#4f73b3",
  "AB Pos": "#7f9fd3",
  "O Neg": "#0b1b36",
  "A Neg": "#2a3246",
  "B Neg": "#4b5468",
  "AB Neg": "#8a93a8",
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
const REFRESH_SECONDS = 30;

const STOCK_STATUS = {
  critical: { label: "Critical", color: "#7a0909" },
  low: { label: "Low", color: "#b25c00" },
  watch: { label: "Watch", color: "#4f73b3" },
  healthy: { label: "Healthy", color: "#13294b" },
};

const SEVERITY_STYLE: Record<string, { dot: string; pill: string }> = {
  CRITICAL: { dot: "#7a0909", pill: "bg-[#e8a099] text-[#4a0005]" },
  HIGH: { dot: "#b25c00", pill: "bg-[#ffe9cc] text-[#7a3f00]" },
  MEDIUM: { dot: "#1f3d73", pill: "bg-[#dbe6f7] text-[#13294b]" },
  LOW: { dot: "#4b5468", pill: "bg-[#e5e5e9] text-[#2a3246]" },
};

const EXPIRY_COLORS = ["#7a0909", "#8f2a07", "#b25c00", "#4f73b3", "#1f3d73", "#13294b"];

const PANEL = "soft-green-panel border border-[#13294b]/50 rounded p-6 overflow-hidden";
const LABEL = "text-[11px] font-bold uppercase tracking-[0.18em] text-[#2a3246]";

interface GroupDatum {
  name: string;
  units: number;
  share: number;
  status: keyof typeof STOCK_STATUS;
}

function CardHeader({
  title,
  tag,
  action,
}: {
  title: string;
  tag?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="-mx-6 -mt-6 mb-5 flex items-center justify-between gap-4 bg-[#13294b] px-6 py-3.5 text-white">
      <h3 className="font-headline text-lg font-bold">{title}</h3>
      {action ??
        (tag && (
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-white/80">
            {tag}
          </span>
        ))}
    </div>
  );
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
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
      className={`p-5 border rounded ${accent ? "bg-[#0b1b36] border-transparent" : "soft-green-panel border-[#13294b]/50"}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span
          className={`text-[11px] font-bold uppercase tracking-[0.16em] ${accent ? "text-white/80" : "text-[#2a3246]"}`}
        >
          {label}
        </span>
        <span
          className={`material-symbols-outlined ${accent ? "text-[#9db7e0]" : "text-[#13294b]"}`}
        >
          {icon}
        </span>
      </div>
      <div
        className={`mono-data text-3xl font-bold ${accent ? "text-white" : "text-[#0b1b36]"}`}
      >
        {value}
      </div>
      {sub && (
        <div
          className={`text-[13px] font-medium mt-1 ${accent ? "text-white/80" : "text-[#4b5468]"}`}
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
    <div className="rounded bg-[#0b1b36] px-3 py-2 shadow-xl">
      <div className="flex items-center gap-2">
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: status.color }}
        />
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/80">
          {item.name}
        </span>
      </div>
      <div className="mt-1 mono-data text-xl font-bold text-white">
        {item.units} units
      </div>
      <div className="text-[12px] text-white/80">
        {item.share.toFixed(1)}% of stock · {status.label}
      </div>
    </div>
  );
}

function StockMatrix({
  matrix,
}: {
  matrix: Record<string, Record<string, number>>;
}) {
  const components = Array.from(
    new Set(Object.values(matrix).flatMap((row) => Object.keys(row))),
  ).sort();
  const groups = BLOOD_GROUP_ORDER;
  const colTotals = components.map((c) =>
    groups.reduce((sum, g) => sum + (matrix[g]?.[c] ?? 0), 0),
  );
  const max = Math.max(1, ...groups.flatMap((g) => components.map((c) => matrix[g]?.[c] ?? 0)));

  const cellStyle = (n: number) => {
    if (n === 0) return { background: "#e8a099", color: "#4a0005" };
    if (n < 3) return { background: "#ffe9cc", color: "#7a3f00" };
    const t = n / max;
    return {
      background: `rgba(19, 41, 75, ${0.1 + 0.8 * t})`,
      color: t > 0.45 ? "#ffffff" : "#0b1b36",
    };
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-1.5 text-center">
        <thead>
          <tr>
            <th className={`${LABEL} text-left pb-1`}>Group</th>
            {components.map((c) => (
              <th key={c} className={`${LABEL} pb-1`}>
                {c}
              </th>
            ))}
            <th className={`${LABEL} pb-1`}>Total</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => {
            const rowTotal = components.reduce((sum, c) => sum + (matrix[g]?.[c] ?? 0), 0);
            return (
              <tr key={g}>
                <td className="mono-data text-left text-[13px] font-bold text-[#0b1b36] pr-2 whitespace-nowrap">
                  {g}
                </td>
                {components.map((c) => {
                  const n = matrix[g]?.[c] ?? 0;
                  return (
                    <td
                      key={c}
                      style={cellStyle(n)}
                      className="mono-data rounded text-[14px] font-bold py-2.5"
                      title={`${g} · ${c}: ${n} units`}
                    >
                      {n}
                    </td>
                  );
                })}
                <td className="mono-data text-[14px] font-bold text-[#0b1b36] bg-[#f1f1f3] rounded py-2.5">
                  {rowTotal}
                </td>
              </tr>
            );
          })}
          <tr>
            <td className={`${LABEL} text-left pt-1`}>Total</td>
            {colTotals.map((t, i) => (
              <td key={components[i]} className="mono-data text-[14px] font-bold text-[#0b1b36] pt-1">
                {t}
              </td>
            ))}
            <td className="mono-data text-[14px] font-bold text-[#0b1b36] pt-1">
              {colTotals.reduce((a, b) => a + b, 0)}
            </td>
          </tr>
        </tbody>
      </table>
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
  const [recentAlerts, setRecentAlerts] = useState<AlertRow[]>([]);
  const [recentAllocations, setRecentAllocations] = useState<AllocationRow[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [attentionOpen, setAttentionOpen] = useState(false);
  const [fetchedAt, setFetchedAt] = useState(() => Date.now());

  // Close the attention panel with Escape.
  useEffect(() => {
    if (!attentionOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setAttentionOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [attentionOpen]);

  // One-second ticker for the live clock and the refresh countdown.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const fetchStats = () => {
    api
      .get("/dashboard/stats")
      .then((r) => {
        setStats(r.data);
        writeCache(DASHBOARD_CACHE_KEY, r.data);
        setError("");
        setFetchedAt(Date.now());
      })
      .catch((e) =>
        setError(e?.response?.data?.error ?? "Failed to load dashboard"),
      )
      .finally(() => setLoading(false));

    // Activity feeds are best-effort: the dashboard still works without them.
    Promise.all([
      api.get("/alerts", { params: { resolved: "false", severity: "CRITICAL", limit: 4 } }),
      api.get("/alerts", { params: { resolved: "false", severity: "HIGH", limit: 2 } }),
    ])
      .then(([critical, high]) => {
        const urgent = [...(critical.data?.alerts ?? []), ...(high.data?.alerts ?? [])];
        if (urgent.length) {
          setRecentAlerts(urgent);
          return undefined;
        }
        return api
          .get("/alerts", { params: { resolved: "false", limit: 5 } })
          .then((r) => setRecentAlerts(r.data?.alerts ?? []));
      })
      .catch(() => undefined);
    api
      .get("/allocations", { params: { limit: 6 } })
      .then((r) => setRecentAllocations(r.data?.allocations ?? []))
      .catch(() => undefined);
  };

  useEffect(() => {
    fetchStats();
    intervalRef.current = setInterval(fetchStats, REFRESH_SECONDS * 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    const handleInvalidation = () => {
      setStats(null);
      setLoading(true);
      fetchStats();
    };
    window.addEventListener(DATA_CACHE_INVALIDATED_EVENT, handleInvalidation);
    return () =>
      window.removeEventListener(DATA_CACHE_INVALIDATED_EVENT, handleInvalidation);
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="mono-data text-[#4b5468] text-sm animate-pulse">
          Loading system data...
        </div>
      </div>
    );

  if (error && !stats)
    return (
      <div className="bg-[#e8a099] border border-[#7a0909]/20 rounded p-6 text-[#4a0005]">
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

  const donors = stats?.donors ?? { total: 0, eligible: 0 };
  const eligiblePct = donors.total ? Math.round((donors.eligible / donors.total) * 100) : 0;
  const volumeL = stats?.inventory.total_volume_ml
    ? Math.round(stats.inventory.total_volume_ml / 1000).toLocaleString()
    : null;
  const alloc = stats?.allocations;
  const fulfilment = alloc?.fulfillment_rate;
  const buckets = stats?.inventory.expiry_buckets ?? [];
  const pastDue = buckets.find((b) => b.label === "Past due")?.units ?? 0;
  const matrix = stats?.inventory.by_group_component;
  const statusCounts = alloc?.by_status ?? {};
  const statusTotal = Object.values(statusCounts).reduce((a, b) => a + b, 0);
  const elapsedSeconds = Math.max(0, Math.floor((now - fetchedAt) / 1000));
  const nextRefreshIn = Math.max(0, REFRESH_SECONDS - elapsedSeconds);
  const unmetAllocations = statusCounts.unmet ?? 0;
  const attention: { tone: "red" | "amber"; icon: string; text: string; action: string; href: string }[] = [];
  if (pastDue > 0)
    attention.push({ tone: "red", icon: "event_busy", text: `${pastDue.toLocaleString()} units are past their expiry date`, action: "Review inventory", href: "/inventory" });
  if ((stats?.alerts.critical ?? 0) > 0)
    attention.push({ tone: "red", icon: "warning", text: `${(stats?.alerts.critical ?? 0).toLocaleString()} critical alerts are unresolved`, action: "Open alerts", href: "/alerts" });
  if (criticalGroups > 0)
    attention.push({ tone: "red", icon: "bloodtype", text: `${criticalGroups} blood group${criticalGroups > 1 ? "s are" : " is"} low or out of stock`, action: "See stock", href: "/inventory" });
  if (unmetAllocations > 0)
    attention.push({ tone: "amber", icon: "assignment_late", text: `${unmetAllocations} allocation requests could not be met`, action: "Open allocation", href: "/allocate" });
  if ((stats?.inventory.expiring_soon ?? 0) > 0)
    attention.push({ tone: "amber", icon: "schedule", text: `${stats?.inventory.expiring_soon} units expire within 7 days`, action: "Review inventory", href: "/inventory" });
  attention.splice(4);
  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="green-stroke-bg space-y-8">
      {/* Header banner */}
      <div className="rounded-lg bg-gradient-to-r from-[#0b1b36] via-[#13294b] to-[#1f3d73] text-white px-7 py-6 shadow-md flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[12px] font-bold font-mono text-[#9db7e0] uppercase tracking-[0.25em] mb-1">
            System Overview
          </div>
          <h1 className="font-headline text-3xl font-extrabold tracking-tight">Dashboard</h1>
          <div className="text-[14px] font-medium text-white/85 mt-1">{todayLabel}</div>
        </div>
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => setAttentionOpen(true)}
            aria-haspopup="dialog"
            aria-label={`Needs attention, ${attention.length} item${attention.length === 1 ? "" : "s"}`}
            className="relative flex items-center gap-2 rounded-md bg-white px-4 py-2.5 text-[14px] font-extrabold text-[#0b1b36] hover:bg-[#dbe6f7] transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>notifications_active</span>
            Needs attention
            {attention.length > 0 && (
              <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-[#7a0909] text-white text-[12px] font-bold flex items-center justify-center">
                {attention.length}
              </span>
            )}
          </button>
        <div className="text-right">
          <div className="mono-data text-2xl font-bold tabular-nums" aria-label="Current time">
            {new Date(now).toLocaleTimeString()}
          </div>
          <div className="mt-2 ml-auto h-1.5 w-52 rounded-full bg-white/20 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#9db7e0]"
              style={{
                width: `${(Math.min(elapsedSeconds, REFRESH_SECONDS) / REFRESH_SECONDS) * 100}%`,
                transition: "width 1s linear",
              }}
            />
          </div>
          <div className="text-[12px] font-medium text-white/80 mt-1">
            {nextRefreshIn > 0 ? `Next refresh in ${nextRefreshIn}s` : "Refreshing…"}
          </div>
          {error && stats && (
            <div className="text-[12px] font-mono font-bold text-[#ffb4ac]">
              Poll failed — showing cached data
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Needs attention: slide-in panel on the right */}
      {attentionOpen && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Needs attention">
          <button
            type="button"
            aria-label="Close panel"
            onClick={() => setAttentionOpen(false)}
            className="absolute inset-0 bg-[#0b1b36]/40"
          />
          <aside className="relative h-full w-full max-w-md bg-white shadow-2xl flex flex-col attention-panel-in">
            <div className="flex items-center justify-between bg-[#13294b] px-6 py-4 text-white">
              <div>
                <h2 className="font-headline text-lg font-bold">Needs attention</h2>
                <div className="text-[12px] text-white/80">
                  {attention.length > 0 ? `${attention.length} item${attention.length === 1 ? "" : "s"} to review` : "Nothing urgent"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAttentionOpen(false)}
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/15"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {attention.length > 0 ? (
                attention.map((item) => (
                  <Link
                    key={item.text}
                    to={item.href}
                    onClick={() => setAttentionOpen(false)}
                    className={`group flex items-start gap-3 rounded border-2 p-4 transition-shadow hover:shadow-lg ${
                      item.tone === "red" ? "bg-[#f2bdb7] border-[#7a0909]/60" : "bg-[#ffe9cc] border-[#b25c00]/60"
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined shrink-0 ${item.tone === "red" ? "text-[#7a0909]" : "text-[#b25c00]"}`}
                      style={{ fontSize: 28 }}
                    >
                      {item.icon}
                    </span>
                    <div>
                      <div className={`text-[14px] font-bold leading-snug ${item.tone === "red" ? "text-[#4a0005]" : "text-[#6b3a00]"}`}>
                        {item.text}
                      </div>
                      <div className="text-[12px] font-bold text-[#13294b] mt-1 group-hover:underline">
                        {item.action} →
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="flex items-center gap-3 rounded border-2 border-[#13294b]/40 bg-[#eef3fb] p-4 text-[14px] font-semibold text-[#13294b]">
                  <span className="material-symbols-outlined">check_circle</span>
                  All clear — nothing needs immediate attention.
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-4">
        <KpiCard
          icon="inventory_2"
          label="Available Units"
          value={stats?.inventory.total ?? 0}
          sub={`${stats?.inventory.expiring_soon ?? 0} expiring in 7 days${pastDue ? ` · ${pastDue.toLocaleString()} past due` : ""}`}
          accent
        />
        <KpiCard
          icon="water_drop"
          label="Blood Volume"
          value={volumeL ? `${volumeL} L` : "—"}
          sub={`${Object.keys(stats?.inventory.by_component ?? {}).length} components in stock`}
        />
        <KpiCard
          icon="verified_user"
          label="Donors"
          value={donors.total}
          sub={`${donors.eligible} eligible${donors.total ? ` (${eligiblePct}%)` : ""}`}
        />
        <KpiCard
          icon="hub"
          label="Allocations Today"
          value={alloc?.total_today ?? 0}
          sub={`${alloc?.total_all_time ?? 0} all-time`}
        />
        <KpiCard
          icon="task_alt"
          label="Fulfilment Rate"
          value={fulfilment !== undefined ? `${fulfilment}%` : "—"}
          sub={
            alloc?.total_requested !== undefined
              ? `${alloc.total_fulfilled ?? 0} of ${alloc.total_requested} units`
              : "units fulfilled"
          }
        />
        <KpiCard
          icon="delete_sweep"
          label="Wastage Logged"
          value={stats?.wastage.total_expired ?? 0}
          sub="expired units on record"
        />
      </div>

      {/* Row A: stock chart + alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`lg:col-span-2 ${PANEL}`}>
          <CardHeader title="Blood Group Stock Balance" tag="Inventory risk" />
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className=" text-[13px] font-medium text-[#4b5468]">
                Sorted from lowest to highest stock. Red and amber groups need
                replenishment first.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-right">
              <div className="rounded bg-[#f1f1f3] px-3 py-2">
                <div className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#2a3246]">
                  Avg/group
                </div>
                <div className="mono-data text-lg font-bold text-[#0b1b36]">
                  {averageUnits.toFixed(1)}
                </div>
              </div>
              <div
                className={`rounded px-3 py-2 ${criticalGroups > 0 ? "bg-[#e8a099]" : "bg-[#eef3fb]"}`}
              >
                <div className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#2a3246]">
                  Risk groups
                </div>
                <div
                  className={`mono-data text-lg font-bold ${criticalGroups > 0 ? "text-[#4a0005]" : "text-[#13294b]"}`}
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
                  margin={{ top: 28, right: 40, bottom: 8, left: 4 }}
                >
                  <CartesianGrid
                    stroke="#cdcdd3"
                    strokeDasharray="3 3"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{
                      fontSize: 12,
                      fontFamily: "JetBrains Mono",
                      fill: "#2a3246",
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={64}
                    tick={{
                      fontSize: 12,
                      fontWeight: 600,
                      fontFamily: "JetBrains Mono",
                      fill: "#0b1b36",
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  {averageUnits > 0 && (
                    <ReferenceLine
                      x={averageUnits}
                      stroke="#0b1b36"
                      strokeDasharray="4 4"
                      label={{
                        value: "avg",
                        position: "top",
                        fill: "#2a3246",
                        fontSize: 12,
                        fontFamily: "JetBrains Mono",
                      }}
                    />
                  )}
                  <Tooltip
                    cursor={{ fill: "#f1f1f3" }}
                    content={<InventoryTooltip />}
                  />
                  <Bar
                    dataKey="units"
                    radius={[0, 8, 8, 0]}
                    isAnimationActive={false}
                  >
                    {groupData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={
                          entry.status === "healthy"
                            ? (BLOOD_COLORS[entry.name] ?? "#13294b")
                            : STOCK_STATUS[entry.status].color
                        }
                      />
                    ))}
                    <LabelList
                      dataKey="units"
                      position="right"
                      className="mono-data"
                      fill="#0b1b36"
                      fontSize={13}
                      fontWeight={700}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 flex flex-wrap gap-4 border-t border-[#13294b]/30 pt-4">
                {Object.entries(STOCK_STATUS).map(([key, item]) => (
                  <div
                    key={key}
                    className="flex items-center gap-2 text-[12px] font-semibold text-[#2a3246]"
                  >
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-mono uppercase tracking-[0.12em]">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-56 flex items-center justify-center text-[#4b5468] text-sm">
              No inventory data — run initial load or upload a file
            </div>
          )}
        </div>

        {/* Alerts */}
        <div
          className={`p-6 border rounded ${
            (stats?.alerts.critical ?? 0) > 0
              ? "bg-[#f2bdb7] border-[#7a0909]/30"
              : PANEL
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span
                className={`material-symbols-outlined ${(stats?.alerts.critical ?? 0) > 0 ? "text-[#7a0909]" : "text-[#13294b]"}`}
              >
                {(stats?.alerts.critical ?? 0) > 0 ? "warning" : "check_circle"}
              </span>
              <h3 className="font-headline text-lg font-bold text-[#0b1b36]">
                Most Urgent Alerts
              </h3>
            </div>
            <Link to="/alerts" className="text-[12px] font-bold text-[#13294b] hover:underline">
              View all
            </Link>
          </div>
          <div className="flex items-end gap-4 mb-4">
            <div className="mono-data text-4xl font-bold text-[#0b1b36]">
              {stats?.alerts.active ?? 0}
            </div>
            <div className="text-[13px] font-semibold text-[#4a0005] pb-1">
              {stats?.alerts.critical ?? 0} critical
            </div>
          </div>
          {recentAlerts.length > 0 ? (
            <ul className="divide-y divide-[#13294b]/15">
              {recentAlerts.map((a) => {
                const style = SEVERITY_STYLE[a.severity] ?? SEVERITY_STYLE.LOW;
                return (
                  <li key={a.id} className="py-2.5 flex gap-3">
                    <span className="mt-1.5 h-2.5 w-2.5 rounded-full shrink-0" style={{ background: style.dot }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${style.pill}`}>
                          {a.severity}
                        </span>
                        <span className="mono-data text-[12px] font-bold text-[#0b1b36]">
                          {[a.blood_group, a.component].filter(Boolean).join(" · ")}
                        </span>
                        <span className="text-[12px] text-[#4b5468] ml-auto">{timeAgo(a.created_at)}</span>
                      </div>
                      <div className="text-[13px] font-medium text-[#2a3246] leading-snug mt-0.5 line-clamp-2">
                        {a.message || a.alert_type.replace(/_/g, " ")}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="text-[13px] font-medium text-[#4b5468]">No unresolved alerts.</div>
          )}
        </div>
      </div>

      {/* Row B: stock matrix + expiry outlook */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`lg:col-span-2 ${PANEL}`}>
          <CardHeader title="Units by Blood Group and Component" tag="Stock matrix" />
          <div className="mb-4">
            <p className="text-[13px] font-medium text-[#4b5468]">
              Darker means more stock. Red cells are out of stock and amber cells have fewer than 3 units.
            </p>
          </div>
          {matrix && Object.keys(matrix).length > 0 ? (
            <>
              <StockMatrix matrix={matrix} />
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[#13294b]/20 pt-3 text-[12px] font-semibold text-[#2a3246]">
                <span className="flex items-center gap-2"><span className="h-3.5 w-3.5 rounded bg-[#e8a099] border border-[#7a0909]/40" />Out of stock</span>
                <span className="flex items-center gap-2"><span className="h-3.5 w-3.5 rounded bg-[#ffe9cc] border border-[#b25c00]/40" />Under 3 units</span>
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-16 rounded bg-gradient-to-r from-[rgba(19,41,75,0.15)] to-[rgba(19,41,75,0.9)]" />
                  Fewer → more units
                </span>
              </div>
            </>
          ) : (
            <div className="text-[13px] font-medium text-[#4b5468]">
              Stock matrix appears once the updated API is running.
            </div>
          )}
        </div>

        <div className={PANEL}>
          <CardHeader title="Days Until Expiry" tag="Expiry outlook" />
          <div className="mb-4">
            <p className="text-[13px] font-medium text-[#4b5468]">
              Available units grouped by shelf life left.
            </p>
          </div>
          {buckets.length > 0 ? (
            <div className="space-y-3">
              {buckets.map((b, i) => {
                const maxUnits = Math.max(1, ...buckets.map((x) => x.units));
                return (
                  <div key={b.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[13px] font-semibold text-[#2a3246]">{b.label}</span>
                      <span className="mono-data text-[14px] font-bold text-[#0b1b36]">{b.units}</span>
                    </div>
                    <div className="h-2.5 bg-[#e5e5e9] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(b.units / maxUnits) * 100}%`, background: EXPIRY_COLORS[i] }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-[13px] font-medium text-[#4b5468]">
              Expiry outlook appears once the updated API is running.
            </div>
          )}
          {pastDue > 0 && (
            <div className="mt-5 rounded border-2 border-[#7a0909]/50 bg-[#f2bdb7] p-3 text-[13px] font-semibold text-[#4a0005] leading-snug">
              {pastDue.toLocaleString()} units are marked available but are past their expiry date. Check them in{" "}
              <Link to="/inventory" className="underline font-bold">Inventory</Link> and discard or correct the records.
            </div>
          )}
        </div>
      </div>

      {/* Row C: recent allocations + side panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`lg:col-span-2 ${PANEL}`}>
          <CardHeader
            title="Recent Allocations"
            action={
              <Link to="/allocate" className="text-[12px] font-bold text-white hover:underline">
                Open allocation →
              </Link>
            }
          />
          {recentAllocations.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[#1f3d73]">
                    {["When", "Group", "Component", "Units", "Priority", "Status"].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentAllocations.map((r, i) => {
                    const status = (r.status ?? "").toLowerCase();
                    const statusStyle =
                      status === "fulfilled"
                        ? "bg-[#cdeedb] text-[#0d4a22] ring-1 ring-[#1e7a3e]/40"
                        : status === "partial"
                          ? "bg-[#ffe9cc] text-[#7a3f00]"
                          : "bg-[#e8a099] text-[#4a0005]";
                    return (
                      <tr key={r.id} className={`border-b border-[#13294b]/15 last:border-b-0 ${i % 2 === 0 ? "bg-white" : "bg-[#e9eff8]"}`}>
                        <td className="px-3 py-3 text-[13px] font-medium text-[#2a3246] whitespace-nowrap">
                          {timeAgo(r.created_at)}
                        </td>
                        <td className="px-3 py-3 mono-data text-[13px] font-bold text-[#0b1b36]">{r.blood_group ?? "—"}</td>
                        <td className="px-3 py-3 mono-data text-[13px] text-[#2a3246]">{r.component ?? "—"}</td>
                        <td className="px-3 py-3 mono-data text-[13px] font-bold text-[#0b1b36]">
                          {r.units_fulfilled ?? 0}/{r.units_requested ?? 0}
                        </td>
                        <td className="px-3 py-3 text-[13px] font-semibold capitalize text-[#2a3246]">{r.priority ?? "—"}</td>
                        <td className="px-3 py-3">
                          <span className={`text-[11px] font-bold uppercase px-2.5 py-1 rounded ${statusStyle}`}>
                            {r.status ?? "—"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-[13px] font-medium text-[#4b5468]">No allocations recorded yet.</div>
          )}
        </div>

        <div className="space-y-6">
          {/* Allocation outcomes */}
          <div className={PANEL}>
            <CardHeader title="Allocation Outcomes" />
            {statusTotal > 0 ? (
              <>
                <div className="flex h-3 rounded-full overflow-hidden mb-4">
                  {[
                    ["fulfilled", "#1e7a3e"],
                    ["partial", "#b25c00"],
                    ["unmet", "#7a0909"],
                  ].map(([k, color]) =>
                    statusCounts[k] ? (
                      <div key={k} style={{ width: `${(statusCounts[k] / statusTotal) * 100}%`, background: color }} />
                    ) : null,
                  )}
                </div>
                <div className="space-y-2">
                  {[
                    ["fulfilled", "#1e7a3e", "Fulfilled"],
                    ["partial", "#b25c00", "Partial"],
                    ["unmet", "#7a0909", "Unmet"],
                  ].map(([k, color, label]) => (
                    <div key={k} className="flex items-center justify-between text-[13px]">
                      <span className="flex items-center gap-2 font-semibold text-[#2a3246]">
                        <span className="h-3 w-3 rounded-full" style={{ background: color }} />
                        {label}
                      </span>
                      <span className="mono-data font-bold text-[#0b1b36]">
                        {statusCounts[k] ?? 0}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-[13px] font-medium text-[#4b5468]">No outcome data yet.</div>
            )}
          </div>

          {/* Components breakdown */}
          <div className={PANEL}>
            <CardHeader title="By Component" />
            {stats && Object.keys(stats.inventory.by_component).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(stats.inventory.by_component).map(([comp, count]) => (
                  <div key={comp}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[13px] font-semibold font-mono text-[#2a3246]">{comp}</span>
                      <span className="mono-data text-sm font-bold text-[#0b1b36]">{count}</span>
                    </div>
                    <div className="h-2 bg-[#e5e5e9] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#13294b] rounded-full"
                        style={{ width: `${Math.min(100, (count / (stats.inventory.total || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[13px] font-medium text-[#4b5468]">No data</div>
            )}
          </div>

          {/* Data ingestion */}
          <div className={PANEL}>
            <CardHeader title="Data Ingestion" />
            <div className="space-y-2.5">
              {[
                ["Upload batches", stats?.uploads.total_batches ?? 0],
                ["Records loaded", stats?.uploads.total_records ?? 0],
              ].map(([label, val]) => (
                <div key={label as string} className="flex justify-between items-center text-[13px]">
                  <span className="font-semibold text-[#2a3246]">{label}</span>
                  <span className="mono-data font-bold text-[#0b1b36]">{(val as number).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
