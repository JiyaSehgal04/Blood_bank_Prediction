import { useCallback, useEffect, useRef, useState } from "react";
import api from "../lib/api";
import {
  DATA_CACHE_INVALIDATED_EVENT,
  readCache,
  writeCache,
} from "../lib/sessionCache";
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Bar,
  LabelList,
  CartesianGrid,
} from "recharts";

interface Prediction {
  blood_group: string;
  component: string;
  predicted_demand: number;
  confidence_low: number;
  confidence_high: number;
  model_used: string;
  prediction_date: string;
}

interface ReplenishItem {
  blood_group: string;
  component: string;
  current_stock: number;
  est_demand_7d: number | null;
  expiring_in_7d: number;
  recommended_order: number;
  urgency: string;
  model_used: string;
  basis?: "forecast" | "minimum_stock";
}

interface ComponentStatus {
  status: "ok" | "insufficient_data";
  reason: string;
  units: number;
  active_days: number;
  window_days: number;
  last_demand_date: string | null;
}

const PREDICTIONS_CACHE_KEY = "blood_bank_predictions_cache";
const REPLENISHMENT_CACHE_KEY = "blood_bank_replenishment_cache";
const SUMMARY_CACHE_PREFIX = "blood_bank_summary_cache:";
const SLOW_REFRESH_EVERY = 10; // replenishment + AI summary refresh every 10th 30s tick (5 min)

interface CachedSummary {
  text: string;
  at: number;
}

function timeAgoLabel(at: number): string {
  const mins = Math.max(0, Math.round((Date.now() - at) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  return `${Math.round(mins / 60)} h ago`;
}
const BLOOD_GROUP_LONG: Record<string, string> = {
  "O+": "O Positive",
  "O−": "O Negative",
  "A+": "A Positive",
  "A−": "A Negative",
  "B+": "B Positive",
  "B−": "B Negative",
  "AB+": "AB Positive",
  "AB−": "AB Negative",
};

interface ChartPoint {
  name: string;
  demand: number;
  low: number;
  high: number;
  range: [number, number];
}

function ForecastTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartPoint }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="min-w-[200px] rounded-md border-2 border-[#13294b] bg-white px-4 py-3 shadow-xl">
      <div className="flex items-baseline justify-between gap-4 border-b border-[#13294b]/20 pb-2">
        <span className="font-headline text-xl font-extrabold text-[#0b1b36]">{d.name}</span>
        <span className="text-[12px] font-semibold text-[#4b5468]">{BLOOD_GROUP_LONG[d.name] ?? ""}</span>
      </div>
      <div className="mt-2 space-y-1.5 text-[14px]">
        <div className="flex items-center justify-between gap-6">
          <span className="flex items-center gap-2 font-semibold text-[#2a3246]">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#13294b]" />
            Predicted demand
          </span>
          <span className="mono-data text-base font-bold text-[#0b1b36]">{d.demand.toFixed(1)}</span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="flex items-center gap-2 font-semibold text-[#2a3246]">
            <span className="h-0.5 w-2.5 bg-[#4f73b3]" />
            Likely range
          </span>
          <span className="mono-data font-bold text-[#13294b]">
            {d.low.toFixed(1)} – {d.high.toFixed(1)}
          </span>
        </div>
      </div>
    </div>
  );
}

const MIN_CHART_LOADING_MS = 650;

const BLOOD_GROUP_SHORT: Record<string, string> = {
  "O Pos": "O+",
  "O Neg": "O−",
  "A Pos": "A+",
  "A Neg": "A−",
  "B Pos": "B+",
  "B Neg": "B−",
  "AB Pos": "AB+",
  "AB Neg": "AB−",
};

function urgencyStyle(u: string) {
  switch (u) {
    case "HIGH":
      return {
        badge: "bg-[#e8a099] text-[#4a0005]",
        bar: "bg-[#7a0909]",
        label: "CRITICAL",
      };
    case "MEDIUM":
      return {
        badge: "bg-[#ececef] text-[#2a3246]",
        bar: "bg-[#585756]",
        label: "STABLE",
      };
    default:
      return {
        badge: "bg-[#cdeedb] text-[#0d4a22] ring-1 ring-[#1e7a3e]/40",
        bar: "bg-[#1e7a3e]",
        label: "OPTIMAL",
      };
  }
}

function isCanceledError(e: unknown) {
  return (
    typeof e === "object" &&
    e !== null &&
    "name" in e &&
    e.name === "CanceledError"
  );
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export default function Predictions() {
  const [predictions, setPredictions] = useState<Prediction[]>(() =>
    readCache<Prediction[]>(PREDICTIONS_CACHE_KEY, []),
  );
  const [replenishment, setReplenishment] = useState<ReplenishItem[]>(() =>
    readCache<ReplenishItem[]>(REPLENISHMENT_CACHE_KEY, []),
  );
  const [loading, setLoading] = useState(
    () => readCache<Prediction[]>(PREDICTIONS_CACHE_KEY, []).length === 0,
  );
  const [dataStatus, setDataStatus] = useState<Record<string, ComponentStatus>>({});
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState("");
  const [activeComponent, setActiveComponent] = useState("WB/PRC");
  useEffect(() => {
    activeComponentRef.current = activeComponent;
  }, [activeComponent]);
  const [summaryByComponent, setSummaryByComponent] = useState<Record<string, CachedSummary>>(() => {
    const seeded: Record<string, CachedSummary> = {};
    for (const c of ["WB/PRC", "FFP", "PLT"]) {
      const hit = readCache<CachedSummary | null>(`${SUMMARY_CACHE_PREFIX}${c}`, null);
      if (hit?.text) seeded[c] = hit;
    }
    return seeded;
  });
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const tickRef = useRef(0);
  const activeComponentRef = useRef("WB/PRC");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchReplenishment = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await api.get("/replenishment", { signal });
      if (signal?.aborted) return;
      const next = res.data.replenishment ?? [];
      setReplenishment(next);
      writeCache(REPLENISHMENT_CACHE_KEY, next);
    } catch (e: unknown) {
      if (!isCanceledError(e)) console.error(e);
    }
  }, []);

  const fetchData = useCallback(
    async (signal?: AbortSignal, blocking = true) => {
      const startedAt = Date.now();
      if (blocking) setLoading(true);
      // The replenishment plan is slow to build; never make the page wait for it.
      if (blocking || tickRef.current % SLOW_REFRESH_EVERY === 0) void fetchReplenishment(signal);
      try {
        const predsRes = await api.get("/predictions", { signal });
        if (signal?.aborted) return;
        const nextPredictions = predsRes.data.predictions ?? [];
        setPredictions(nextPredictions);
        setDataStatus(predsRes.data.data_status ?? {});
        writeCache(PREDICTIONS_CACHE_KEY, nextPredictions);
      } catch (e: unknown) {
        if (!isCanceledError(e)) console.error(e);
      } finally {
        if (blocking) {
          const remaining = MIN_CHART_LOADING_MS - (Date.now() - startedAt);
          if (remaining > 0) await wait(remaining);
          if (!signal?.aborted) setLoading(false);
        }
      }
    },
    [fetchReplenishment],
  );

  const fetchSummary = useCallback(
    async (component: string, signal?: AbortSignal) => {
      const hasCached = !!readCache<CachedSummary | null>(`${SUMMARY_CACHE_PREFIX}${component}`, null)?.text;
      if (!hasCached) setSummaryLoading(true); // otherwise refresh quietly behind the cached text
      setSummaryError("");
      try {
        const r = await api.get("/predictions/summary", {
          params: { component },
          signal,
        });
        const text: string = r.data.summary ?? "";
        if (text) {
          const entry = { text, at: Date.now() };
          writeCache(`${SUMMARY_CACHE_PREFIX}${component}`, entry);
          setSummaryByComponent((prev) => ({ ...prev, [component]: entry }));
        }
      } catch (e: unknown) {
        if (!isCanceledError(e) && !hasCached) setSummaryError("AI summary unavailable");
      } finally {
        setSummaryLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal, true);
    return () => controller.abort();
  }, [fetchData]);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      tickRef.current += 1;
      fetchData(undefined, false);
      if (tickRef.current % SLOW_REFRESH_EVERY === 0) fetchSummary(activeComponentRef.current);
    }, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData, fetchSummary]);

  useEffect(() => {
    const handleInvalidation = () => {
      setPredictions([]);
      setReplenishment([]);
      fetchData(undefined, true);
      fetchSummary(activeComponent);
    };
    window.addEventListener(DATA_CACHE_INVALIDATED_EVENT, handleInvalidation);
    return () =>
      window.removeEventListener(
        DATA_CACHE_INVALIDATED_EVENT,
        handleInvalidation,
      );
  }, [activeComponent, fetchData, fetchSummary]);

  useEffect(() => {
    const controller = new AbortController();
    fetchSummary(activeComponent, controller.signal);
    return () => controller.abort();
  }, [activeComponent, fetchSummary]);

  const handleRunPredictions = async () => {
    setRunning(true);
    setLoading(true);
    setRunError("");
    try {
      await api.post("/predictions/run");
      await Promise.all([
        fetchData(undefined, true),
        fetchSummary(activeComponent),
      ]);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setRunError(e?.response?.data?.error ?? "Failed to run predictions");
      setLoading(false);
    } finally {
      setRunning(false);
    }
  };

  const latestPredictions = (() => {
    const byGroup = new Map<string, Prediction>();
    predictions
      .filter((p) => p.component === activeComponent)
      .forEach((p) => {
        const current = byGroup.get(p.blood_group);
        if (!current || p.prediction_date > current.prediction_date) {
          byGroup.set(p.blood_group, p);
        }
      });
    return [...byGroup.values()];
  })();

  const chartData = latestPredictions.map((p) => ({
    name: BLOOD_GROUP_SHORT[p.blood_group] ?? p.blood_group,
    demand: p.predicted_demand,
    low: p.confidence_low,
    high: p.confidence_high,
    range: [p.confidence_low, p.confidence_high] as [number, number],
  })) as ChartPoint[];

  const groupCards = (() => {
    const repMap: Record<string, ReplenishItem> = {};
    replenishment
      .filter((r) => r.component === activeComponent)
      .forEach((r) => {
        repMap[r.blood_group] = r;
      });

    return latestPredictions.map((p) => {
      const rep = repMap[p.blood_group];
      const demand7d = rep?.est_demand_7d ?? 0;
      const coverageDays =
        rep && demand7d > 0
          ? ((rep.current_stock / demand7d) * 7).toFixed(1)
          : null;
      const coveragePct =
        rep && demand7d > 0
          ? Math.min(100, (rep.current_stock / demand7d) * 100)
          : 0;
      return { ...p, rep, coverageDays, coveragePct };
    });
  })();

  const summaryEntry = summaryByComponent[activeComponent];
  const summary = summaryEntry?.text ?? "";

  const totalDemand = latestPredictions.reduce(
    (s, p) => s + p.predicted_demand,
    0,
  );
  const models = [...new Set(predictions.map((p) => p.model_used))].join(", ");

  return (
    <div className="green-stroke-bg space-y-10">
      {/* ── Editorial header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="max-w-2xl">
          <nav className="flex items-center gap-2 text-[#2a3246] text-[11px] font-mono uppercase tracking-[0.3em] mb-4">
            <span>Analytics</span>
            <span className="material-symbols-outlined text-[11px]">
              chevron_right
            </span>
            <span className="text-[#13294b] font-semibold">Predictions</span>
          </nav>
          <h1 className="font-headline text-5xl font-extrabold tracking-tighter text-[#1b1c15] leading-tight mb-3">
            7-Day Demand <br />
            <span className="text-[#13294b]">Forecast Intelligence</span>
          </h1>
          <p className="text-[#2a3246] text-sm leading-relaxed max-w-lg">
            Algorithmic projection of blood component requirements based on
            historical utilisation and current inventory velocity.
          </p>
        </div>

        <div className="flex flex-col items-start md:items-end gap-4">
          <div className="flex bg-[#fafafb] p-1 rounded">
            {["WB/PRC", "FFP", "PLT"].map((c) => (
              <button
                key={c}
                onClick={() => setActiveComponent(c)}
                className={`px-4 py-1.5 text-xs font-mono font-bold uppercase tracking-wider rounded transition-colors ${
                  activeComponent === c
                    ? "bg-white shadow-sm text-[#1b1c15]"
                    : "text-[#2a3246] hover:text-[#1b1c15]"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <button
            onClick={handleRunPredictions}
            disabled={running}
            className="flex items-center gap-2 bg-[#13294b] text-white px-4 py-2 text-xs font-bold font-mono uppercase tracking-wider rounded hover:opacity-90 disabled:opacity-50 transition-all"
          >
            <span className="material-symbols-outlined text-[14px]">
              model_training
            </span>
            {running ? "Running…" : "Run Predictions"}
          </button>

          {runError && (
            <div className="text-[11px] font-mono text-[#7a0909] max-w-xs text-right">
              {runError}
            </div>
          )}

          <div className="flex items-center gap-4 text-[11px] font-mono text-[#2a3246] uppercase">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[#13294b]" />
              Predicted demand
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[#c5d5ee] border border-[#7f9fd3]" />
              Likely range (low–high)
            </span>
          </div>
        </div>
      </div>

      {/* ── AI Insights: first thing on the page ── */}
      <section
        aria-live="polite"
        className="relative overflow-hidden rounded-lg bg-gradient-to-r from-[#0b1b36] via-[#13294b] to-[#1f3d73] text-white shadow-md"
      >
        <span
          className="material-symbols-outlined pointer-events-none absolute -right-4 -top-6 text-white/10"
          style={{ fontSize: 150, fontVariationSettings: "'FILL' 1" }}
        >
          auto_awesome
        </span>
        <div className="relative flex flex-col gap-3 p-6 md:flex-row md:items-start md:gap-6">
          <div className="flex shrink-0 items-center gap-3 md:w-56 md:flex-col md:items-start">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#13294b]">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
            </span>
            <div>
              <div className="text-[12px] font-mono font-bold uppercase tracking-[0.25em] text-[#9db7e0]">AI Insights</div>
              <div className="text-sm font-semibold text-white/90">{activeComponent} · today</div>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            {summary ? (
              <p className="text-[17px] leading-relaxed text-white">{summary}</p>
            ) : summaryLoading ? (
              <div className="space-y-2.5 py-1" role="status" aria-label="Generating AI insights">
                <div className="h-3.5 w-full rounded bg-white/20 animate-pulse" />
                <div className="h-3.5 w-11/12 rounded bg-white/20 animate-pulse" />
                <div className="h-3.5 w-8/12 rounded bg-white/20 animate-pulse" />
              </div>
            ) : summaryError ? (
              <div className="flex items-center gap-4">
                <p className="text-[#ffb4ac] text-sm font-mono">{summaryError}</p>
                <button
                  onClick={() => fetchSummary(activeComponent)}
                  className="rounded border border-white/60 px-3 py-1 text-[11px] font-mono font-bold uppercase tracking-widest text-white hover:bg-white/10"
                >
                  Retry
                </button>
              </div>
            ) : (
              <p className="text-white/80 text-sm">No insights available yet.</p>
            )}
            {summary && (
              <div className="mt-3 flex items-center gap-4 text-[12px] font-mono text-white/75">
                <span>{summaryEntry ? `Updated ${timeAgoLabel(summaryEntry.at)}` : ""}</span>
                <button
                  onClick={() => fetchSummary(activeComponent)}
                  className="inline-flex items-center gap-1 font-bold text-white hover:underline"
                >
                  <span className="material-symbols-outlined text-[16px]">refresh</span>
                  Refresh
                </button>
                <span className="ml-auto hidden sm:inline">AI-generated · check against live stock</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Forecast paused: explain why and what to do ── */}
      {!loading && latestPredictions.length === 0 && (
        <section
          role="status"
          className="rounded-lg border-2 border-[#b25c00] bg-[#ffe9cc] p-6 text-[#4a2a00]"
        >
          <div className="flex items-start gap-4">
            <span className="material-symbols-outlined shrink-0 text-[#b25c00]" style={{ fontSize: 32 }}>
              pause_circle
            </span>
            <div className="min-w-0">
              <h2 className="font-headline text-xl font-extrabold">
                Forecast paused for {activeComponent}
              </h2>
              <p className="mt-1 text-[15px] font-medium leading-relaxed">
                {dataStatus[activeComponent]?.reason ||
                  "Not enough issued units have been recorded yet to forecast demand reliably."}
              </p>
              {dataStatus[activeComponent] && (
                <p className="mt-2 text-[13px] font-semibold">
                  Recorded in the last {dataStatus[activeComponent].window_days} days:{" "}
                  {dataStatus[activeComponent].units} units on {dataStatus[activeComponent].active_days} days
                  {dataStatus[activeComponent].last_demand_date
                    ? ` · last demand ${dataStatus[activeComponent].last_demand_date}`
                    : ""}
                </p>
              )}
              <p className="mt-3 text-[14px] leading-relaxed">
                <b>To enable forecasts:</b> record every unit that is issued or transfused (use the Allocation
                page, or upload the issue register). Forecasting switches on automatically once enough history
                exists. Until then, the order list below uses a simple minimum-stock rule and says so.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ── Full-width forecast chart ── */}
      <section className="soft-green-panel rounded border border-[#13294b]/20 overflow-hidden">
        <div className="p-8 pb-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#2a3246] mb-1">
                System Aggregate — {activeComponent}
              </p>
              <div className="flex items-baseline gap-3">
                <span className="mono-data text-4xl font-bold text-[#1b1c15]">
                  {loading ? "—" : totalDemand.toFixed(1)}
                </span>
                <span className="text-[#13294b] font-mono text-sm">
                  predicted units
                </span>
              </div>
            </div>
            <div className="text-[11px] font-mono text-[#4b5468] uppercase tracking-widest">
              Auto-updated on upload
            </div>
          </div>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center text-[#4b5468] text-sm mono-data animate-pulse px-8 pb-8">
            Loading predictions…
          </div>
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart
              data={chartData}
              margin={{ top: 24, right: 32, left: 4, bottom: 8 }}
            >
              <defs>
                <linearGradient id="demandBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2a4f94" />
                  <stop offset="100%" stopColor="#13294b" />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#13294b22" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 14, fontWeight: 700, fontFamily: "JetBrains Mono", fill: "#0b1b36" }}
                axisLine={{ stroke: "#13294b55" }}
                tickLine={false}
              />
              <XAxis xAxisId="demand" dataKey="name" hide />
              <YAxis
                tick={{ fontSize: 12, fontFamily: "JetBrains Mono", fill: "#2a3246" }}
                axisLine={false}
                tickLine={false}
                width={44}
                label={{
                  value: "Predicted units",
                  angle: -90,
                  position: "insideLeft",
                  offset: 8,
                  style: { fontSize: 12, fontWeight: 600, fill: "#4b5468", textAnchor: "middle" },
                }}
              />
              <Tooltip cursor={{ fill: "#13294b10" }} content={<ForecastTooltip />} />
              {/* Likely range: a wide, light band behind the demand bar */}
              <Bar
                dataKey="range"
                name="Likely range"
                fill="#9db7e0"
                fillOpacity={0.45}
                stroke="#4f73b3"
                strokeWidth={1}
                strokeDasharray="3 3"
                barSize={46}
                radius={8}
                isAnimationActive={false}
              />
              {/* Predicted demand: narrower navy bar, drawn on its own axis so it overlaps the band */}
              <Bar
                xAxisId="demand"
                dataKey="demand"
                name="Predicted demand"
                fill="url(#demandBar)"
                barSize={30}
                radius={[5, 5, 0, 0]}
                isAnimationActive={false}
              >
                <LabelList
                  dataKey="demand"
                  position="insideBottom"
                  offset={10}
                  formatter={(v: unknown) => Number(v).toFixed(1)}
                  style={{ fill: "#ffffff", fontSize: 13, fontWeight: 800, fontFamily: "JetBrains Mono" }}
                />
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-[#4b5468] text-sm px-8 pb-8">
            Nothing to chart — see the notice above
          </div>
        )}
      </section>

      {/* ── Blood group coverage cards ── */}
      <div className="grid grid-cols-1 gap-6">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#2a3246] mb-3">
            Coverage by Blood Group — {activeComponent}
          </p>
          <div className="pr-1 space-y-0">
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2">
              {groupCards.map((card) => {
                const { badge, bar, label } = urgencyStyle(
                  card.rep?.urgency ?? "LOW",
                );
                const pct = card.coveragePct;
                return (
                  <div
                    key={`${card.component}-${card.blood_group}-${card.prediction_date}`}
                    className="soft-green-panel p-3 rounded border border-[#13294b]/20 hover:border-[#13294b]/30 transition-all flex flex-col"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-headline text-xl font-extrabold text-[#1b1c15] tracking-tighter">
                        {BLOOD_GROUP_SHORT[card.blood_group] ??
                          card.blood_group}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[11px] font-bold uppercase ${badge}`}
                      >
                        {label}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="mono-data text-base font-bold text-[#1b1c15]">
                        {card.predicted_demand.toFixed(1)}
                      </span>
                      <span className="text-[11px] text-[#4b5468]">units</span>
                    </div>
                    {card.coverageDays !== null && (
                      <>
                        <div className="w-full h-1 bg-[#becabc]/20 rounded-full overflow-hidden">
                          <div
                            className={`${bar} h-full rounded-full`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-[11px] font-mono text-[#4b5468] mt-0.5">
                          {card.coverageDays}d
                        </p>
                      </>
                    )}
                    {card.rep && (
                      <div className="flex justify-between mt-1.5 pt-1.5 border-t border-[#13294b]/20">
                        <span className="text-[11px] font-mono text-[#4b5468]">
                          Stk{" "}
                          <b className="text-[#1b1c15]">
                            {card.rep.current_stock}
                          </b>
                        </span>
                        <span
                          className={`text-[11px] font-mono ${card.rep.expiring_in_7d > 0 ? "text-[#7a0909]" : "text-[#13294b]"}`}
                        >
                          Exp <b>{card.rep.expiring_in_7d}</b>
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
              {groupCards.length === 0 && (
                <div className="col-span-full py-8 text-center text-[#4b5468] text-sm">
                  No data for {activeComponent}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom: replenishment table + model card ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 soft-green-panel rounded border border-[#13294b]/20 overflow-hidden">
          <div className="px-6 py-4 bg-[#13294b] flex items-center justify-between">
            <h3 className="font-headline text-lg font-bold text-white">
              Replenishment Recommendations
            </h3>
            <span className="mono-data text-xs font-semibold text-white/85">
              {
                replenishment.filter((r) => r.component === activeComponent)
                  .length
              }{" "}
              items
            </span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#1f3d73]">
                {[
                  "Group",
                  "Stock",
                  "7d Demand",
                  "Expiring",
                  "Order",
                  "Priority",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left text-[11px] font-mono font-bold uppercase tracking-wider text-white"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {replenishment
                .filter((r) => r.component === activeComponent)
                .map((r, i) => {
                  const { badge, label } = urgencyStyle(r.urgency);
                  return (
                    <tr
                      key={`${r.component}-${r.blood_group}-${i}`}
                      className={`border-b border-[#13294b]/20 ${i % 2 === 0 ? "bg-white" : "bg-[#e9eff8]"}`}
                    >
                      <td className="px-4 py-2.5 font-bold text-[#1b1c15] mono-data text-sm">
                        {BLOOD_GROUP_SHORT[r.blood_group] ?? r.blood_group}
                      </td>
                      <td className="px-4 py-2.5 mono-data text-xs">
                        {r.current_stock}
                      </td>
                      <td className="px-4 py-2.5 mono-data text-xs">
                        {r.est_demand_7d ?? "—"}
                      </td>
                      <td
                        className={`px-4 py-2.5 mono-data text-xs ${r.expiring_in_7d > 0 ? "text-[#7a0909] font-bold" : ""}`}
                      >
                        {r.expiring_in_7d}
                      </td>
                      <td className="px-4 py-2.5 mono-data text-xs font-bold text-[#13294b]">
                        {r.recommended_order}
                        {r.basis === "minimum_stock" && (
                          <span
                            title="No forecast available: ordered to reach the minimum stock level"
                            className="ml-2 rounded bg-[#e5e5e9] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#2a3246]"
                          >
                            min stock
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${badge}`}
                        >
                          {label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              {replenishment.filter((r) => r.component === activeComponent)
                .length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-[#4b5468] text-sm"
                  >
                    No replenishment data for {activeComponent}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Model info card */}
        <div className="bg-[#0b1b36] p-8 rounded relative overflow-hidden group">
          <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-all" />
          <h3 className="font-headline text-lg font-bold mb-1 relative z-10 text-white">
            Model Intelligence
          </h3>
          <p className="text-[11px] font-mono uppercase tracking-widest text-white/80 mb-8 relative z-10">
            Active Ensemble
          </p>

          <div className="relative z-10 space-y-5">
            <div>
              <p className="text-[11px] font-mono uppercase tracking-widest text-white/80 mb-1">
                Algorithms
              </p>
              <p className="mono-data text-sm font-bold uppercase text-[#9db7e0]">
                {models || "—"}
              </p>
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-mono uppercase mb-1.5 text-white/70">
                <span>Prediction Coverage</span>
                <span>{predictions.length} records</span>
              </div>
              <div className="w-full h-1 bg-white/20 rounded-full">
                <div
                  className="h-full bg-[#9db7e0] rounded-full"
                  style={{ width: predictions.length > 0 ? "95%" : "0%" }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-mono uppercase mb-1.5 text-white/70">
                <span>Components Modelled</span>
                <span>
                  {[...new Set(predictions.map((p) => p.component))].length} / 3
                </span>
              </div>
              <div className="w-full h-1 bg-white/20 rounded-full">
                <div
                  className="h-full bg-[#9db7e0] rounded-full"
                  style={{
                    width: `${([...new Set(predictions.map((p) => p.component))].length / 3) * 100}%`,
                  }}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-white/10">
              <p className="text-[11px] font-mono uppercase text-white/80 mb-1">
                Last Prediction Date
              </p>
              <p className="mono-data text-sm text-white">
                {predictions[0]?.prediction_date ?? "—"}
              </p>
            </div>
          </div>

          <div className="mt-8 text-[11px] font-mono text-white/60 uppercase tracking-widest relative z-10">
            Models retrain automatically after each upload
          </div>
        </div>
      </div>
    </div>
  );
}
