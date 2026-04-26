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
  AreaChart,
  Area,
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
  est_demand_7d: number;
  expiring_in_7d: number;
  recommended_order: number;
  urgency: string;
  model_used: string;
}

const PREDICTIONS_CACHE_KEY = "blood_bank_predictions_cache";
const REPLENISHMENT_CACHE_KEY = "blood_bank_replenishment_cache";
const MIN_CHART_LOADING_MS = 650;
const CHART_ANIMATION_MS = 1100;

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
        badge: "bg-[#ffdad6] text-[#93000a]",
        bar: "bg-[#ba1a1a]",
        label: "CRITICAL",
      };
    case "MEDIUM":
      return {
        badge: "bg-[#efeee3] text-[#3f493f]",
        bar: "bg-[#585756]",
        label: "STABLE",
      };
    default:
      return {
        badge: "bg-[#92f5a4]/30 text-[#005323]",
        bar: "bg-[#006d30]",
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
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState("");
  const [activeComponent, setActiveComponent] = useState("WB/PRC");
  const [summary, setSummary] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(
    async (signal?: AbortSignal) => {
      const showBlockingLoader = predictions.length === 0;
      const startedAt = Date.now();
      if (showBlockingLoader) setLoading(true);
      try {
        const p = await api.get("/predictions", { signal });
        const nextPredictions = p.data.predictions ?? [];
        if (!showBlockingLoader) {
          const remaining = CHART_ANIMATION_MS - (Date.now() - startedAt);
          if (remaining > 0) await wait(remaining);
        }
        if (signal?.aborted) return;
        setPredictions(nextPredictions);
        writeCache(PREDICTIONS_CACHE_KEY, nextPredictions);
      } catch (e: unknown) {
        if (!isCanceledError(e)) console.error(e);
      } finally {
        if (showBlockingLoader) {
          const remaining = MIN_CHART_LOADING_MS - (Date.now() - startedAt);
          if (remaining > 0) await wait(remaining);
          if (!signal?.aborted) setLoading(false);
        }
      }

      try {
        const r = await api.get("/replenishment", { signal });
        const nextReplenishment = r.data.replenishment ?? [];
        setReplenishment(nextReplenishment);
        writeCache(REPLENISHMENT_CACHE_KEY, nextReplenishment);
      } catch (e: unknown) {
        if (!isCanceledError(e)) console.error(e);
      }
    },
    [predictions.length],
  );

  const refreshData = useCallback(
    async (signal?: AbortSignal, blocking = true) => {
      const startedAt = Date.now();
      if (blocking) setLoading(true);
      try {
        const p = await api.get("/predictions", { signal });
        const nextPredictions = p.data.predictions ?? [];
        if (signal?.aborted) return;
        setPredictions(nextPredictions);
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

      try {
        const r = await api.get("/replenishment", { signal });
        const nextReplenishment = r.data.replenishment ?? [];
        if (signal?.aborted) return;
        setReplenishment(nextReplenishment);
        writeCache(REPLENISHMENT_CACHE_KEY, nextReplenishment);
      } catch (e: unknown) {
        if (!isCanceledError(e)) console.error(e);
      }
    },
    [],
  );

  const fetchSummary = useCallback(
    async (component: string, signal?: AbortSignal) => {
      setSummaryLoading(true);
      setSummaryError("");
      try {
        const r = await api.get("/predictions/summary", {
          params: { component },
          signal,
        });
        setSummary(r.data.summary ?? "");
      } catch (e: unknown) {
        if (!isCanceledError(e)) setSummaryError("AI summary unavailable");
      } finally {
        setSummaryLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal);
    return () => controller.abort();
  }, [loadData]);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      refreshData(undefined, false);
    }, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refreshData]);

  useEffect(() => {
    const handleInvalidation = () => {
      setPredictions([]);
      setReplenishment([]);
      setLoading(true);
      refreshData(undefined, true);
      fetchSummary(activeComponent);
    };
    window.addEventListener(DATA_CACHE_INVALIDATED_EVENT, handleInvalidation);
    return () =>
      window.removeEventListener(
        DATA_CACHE_INVALIDATED_EVENT,
        handleInvalidation,
      );
  }, [activeComponent, fetchSummary, refreshData]);

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
        refreshData(undefined, true),
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
  }));

  const groupCards = (() => {
    const repMap: Record<string, ReplenishItem> = {};
    replenishment
      .filter((r) => r.component === activeComponent)
      .forEach((r) => {
        repMap[r.blood_group] = r;
      });

    return latestPredictions.map((p) => {
      const rep = repMap[p.blood_group];
      const coverageDays =
        rep && rep.est_demand_7d > 0
          ? ((rep.current_stock / rep.est_demand_7d) * 7).toFixed(1)
          : null;
      const coveragePct =
        rep && rep.est_demand_7d > 0
          ? Math.min(100, (rep.current_stock / rep.est_demand_7d) * 100)
          : 0;
      return { ...p, rep, coverageDays, coveragePct };
    });
  })();

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
          <nav className="flex items-center gap-2 text-[#3f493f] text-[10px] font-mono uppercase tracking-[0.3em] mb-4">
            <span>Analytics</span>
            <span className="material-symbols-outlined text-[10px]">
              chevron_right
            </span>
            <span className="text-[#006d30] font-semibold">Predictions</span>
          </nav>
          <h1 className="font-headline text-5xl font-extrabold tracking-tighter text-[#1b1c15] leading-tight mb-3">
            7-Day Demand <br />
            <span className="text-[#006d30]">Forecast Intelligence</span>
          </h1>
          <p className="text-[#3f493f] text-sm leading-relaxed max-w-lg">
            Algorithmic projection of blood component requirements based on
            historical utilisation and current inventory velocity.
          </p>
        </div>

        <div className="flex flex-col items-start md:items-end gap-4">
          <div className="flex bg-[#f5f4e8] p-1 rounded">
            {["WB/PRC", "FFP", "PLT"].map((c) => (
              <button
                key={c}
                onClick={() => setActiveComponent(c)}
                className={`px-4 py-1.5 text-xs font-mono font-bold uppercase tracking-wider rounded transition-colors ${
                  activeComponent === c
                    ? "bg-white shadow-sm text-[#1b1c15]"
                    : "text-[#3f493f] hover:text-[#1b1c15]"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <button
            onClick={handleRunPredictions}
            disabled={running}
            className="flex items-center gap-2 bg-[#006d30] text-white px-4 py-2 text-xs font-bold font-mono uppercase tracking-wider rounded hover:opacity-90 disabled:opacity-50 transition-all"
          >
            <span className="material-symbols-outlined text-[14px]">
              model_training
            </span>
            {running ? "Running…" : "Run Predictions"}
          </button>

          {runError && (
            <div className="text-[10px] font-mono text-[#ba1a1a] max-w-xs text-right">
              {runError}
            </div>
          )}

          <div className="flex items-center gap-4 text-[10px] font-mono text-[#3f493f] uppercase">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#006d30]" />
              Predicted Demand
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#becabc]" />
              Confidence Band
            </span>
          </div>
        </div>
      </div>

      {/* ── Full-width forecast chart ── */}
      <section className="soft-green-panel rounded border border-[#becabc]/20 overflow-hidden">
        <div className="p-8 pb-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#3f493f] mb-1">
                System Aggregate — {activeComponent}
              </p>
              <div className="flex items-baseline gap-3">
                <span className="mono-data text-4xl font-bold text-[#1b1c15]">
                  {loading ? "—" : totalDemand.toFixed(1)}
                </span>
                <span className="text-[#006d30] font-mono text-sm">
                  predicted units
                </span>
              </div>
            </div>
            <div className="text-[10px] font-mono text-[#6f7a6e] uppercase tracking-widest">
              Auto-updated on upload
            </div>
          </div>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center text-[#6f7a6e] text-sm mono-data animate-pulse px-8 pb-8">
            Loading predictions…
          </div>
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 40, left: 0, bottom: 20 }}
            >
              <defs>
                <linearGradient id="demandFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#006d30" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#006d30" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="highFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#92f5a4" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#92f5a4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#becabc22" />
              <XAxis
                dataKey="name"
                tick={{
                  fontSize: 10,
                  fontFamily: "JetBrains Mono",
                  fill: "#3f493f",
                }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{
                  fontSize: 10,
                  fontFamily: "JetBrains Mono",
                  fill: "#3f493f",
                }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "#1b1c15",
                  border: "none",
                  borderRadius: 4,
                  fontSize: 11,
                  fontFamily: "JetBrains Mono",
                  color: "#fff",
                }}
              />
              <Area
                type="monotone"
                dataKey="high"
                stroke="#92f5a4"
                fill="url(#highFill)"
                strokeWidth={1}
                name="Conf. High"
                animationDuration={CHART_ANIMATION_MS}
                animationEasing="ease-out"
              />
              <Area
                type="monotone"
                dataKey="demand"
                stroke="#006d30"
                fill="url(#demandFill)"
                strokeWidth={2.5}
                name="Demand"
                animationDuration={CHART_ANIMATION_MS}
                animationEasing="ease-out"
              />
              <Area
                type="monotone"
                dataKey="low"
                stroke="#4de082"
                fill="none"
                strokeWidth={1}
                strokeDasharray="4 4"
                name="Conf. Low"
                animationDuration={CHART_ANIMATION_MS}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-[#6f7a6e] text-sm px-8 pb-8">
            No predictions yet — upload data to generate
          </div>
        )}
      </section>

      {/* ── Blood group cards + AI Summary ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: compact scrollable blood group cards */}
        <div className="lg:col-span-2">
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#3f493f] mb-3">
            Coverage by Blood Group — {activeComponent}
          </p>
          <div className="max-h-72 overflow-y-auto pr-1 space-y-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {groupCards.map((card) => {
                const { badge, bar, label } = urgencyStyle(
                  card.rep?.urgency ?? "LOW",
                );
                const pct = card.coveragePct;
                return (
                  <div
                    key={`${card.component}-${card.blood_group}-${card.prediction_date}`}
                    className="soft-green-panel p-3 rounded border border-[#becabc]/10 hover:border-[#006d30]/30 transition-all flex flex-col"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-headline text-xl font-extrabold text-[#1b1c15] tracking-tighter">
                        {BLOOD_GROUP_SHORT[card.blood_group] ??
                          card.blood_group}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${badge}`}
                      >
                        {label}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="mono-data text-base font-bold text-[#1b1c15]">
                        {card.predicted_demand.toFixed(1)}
                      </span>
                      <span className="text-[9px] text-[#6f7a6e]">units</span>
                    </div>
                    {card.coverageDays !== null && (
                      <>
                        <div className="w-full h-1 bg-[#becabc]/20 rounded-full overflow-hidden">
                          <div
                            className={`${bar} h-full rounded-full`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-[9px] font-mono text-[#6f7a6e] mt-0.5">
                          {card.coverageDays}d
                        </p>
                      </>
                    )}
                    {card.rep && (
                      <div className="flex justify-between mt-1.5 pt-1.5 border-t border-[#becabc]/20">
                        <span className="text-[9px] font-mono text-[#6f7a6e]">
                          Stk{" "}
                          <b className="text-[#1b1c15]">
                            {card.rep.current_stock}
                          </b>
                        </span>
                        <span
                          className={`text-[9px] font-mono ${card.rep.expiring_in_7d > 0 ? "text-[#ba1a1a]" : "text-[#006d30]"}`}
                        >
                          Exp <b>{card.rep.expiring_in_7d}</b>
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
              {groupCards.length === 0 && (
                <div className="col-span-4 py-8 text-center text-[#6f7a6e] text-sm">
                  No data for {activeComponent}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: AI Summary */}
        <div className="bg-[#1b1c15] rounded p-5 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#79db8d]">
              AI Summary · {activeComponent}
            </span>
            <span className="material-symbols-outlined text-[#79db8d] text-[16px]">
              auto_awesome
            </span>
          </div>
          <div className="flex-1">
            {summaryLoading ? (
              <p className="text-white/40 text-xs animate-pulse font-mono">
                Generating summary…
              </p>
            ) : summaryError ? (
              <p className="text-[#ffdad6] text-xs font-mono">{summaryError}</p>
            ) : summary ? (
              <p className="text-white/80 text-sm leading-relaxed">{summary}</p>
            ) : (
              <p className="text-white/40 text-xs font-mono">
                No summary available.
              </p>
            )}
          </div>
          <p className="text-[9px] font-mono text-white/20 uppercase tracking-widest mt-4">
            Groq / llama-3.3-70b
          </p>
        </div>
      </div>

      {/* ── Bottom: replenishment table + model card ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 soft-green-panel rounded border border-[#becabc]/20 overflow-hidden">
          <div className="px-6 py-4 border-b border-[#becabc]/15 flex items-center justify-between">
            <h3 className="font-headline font-bold text-[#1b1c15]">
              Replenishment Recommendations
            </h3>
            <span className="mono-data text-xs text-[#6f7a6e]">
              {
                replenishment.filter((r) => r.component === activeComponent)
                  .length
              }{" "}
              items
            </span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#f5f4e8]">
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
                    className="px-4 py-2 text-left text-[10px] font-mono uppercase tracking-wider text-[#3f493f]"
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
                      className={`border-b border-[#becabc]/10 ${i % 2 === 0 ? "bg-white" : "bg-[#fbfaee]"}`}
                    >
                      <td className="px-4 py-2.5 font-bold text-[#1b1c15] mono-data text-sm">
                        {BLOOD_GROUP_SHORT[r.blood_group] ?? r.blood_group}
                      </td>
                      <td className="px-4 py-2.5 mono-data text-xs">
                        {r.current_stock}
                      </td>
                      <td className="px-4 py-2.5 mono-data text-xs">
                        {r.est_demand_7d}
                      </td>
                      <td
                        className={`px-4 py-2.5 mono-data text-xs ${r.expiring_in_7d > 0 ? "text-[#ba1a1a] font-bold" : ""}`}
                      >
                        {r.expiring_in_7d}
                      </td>
                      <td className="px-4 py-2.5 mono-data text-xs font-bold text-[#006d30]">
                        {r.recommended_order}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${badge}`}
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
                    className="px-4 py-8 text-center text-[#6f7a6e] text-sm"
                  >
                    No replenishment data for {activeComponent}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Model info card */}
        <div className="bg-[#1b1c15] p-8 rounded relative overflow-hidden group">
          <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-all" />
          <h3 className="font-headline text-lg font-bold mb-1 relative z-10 text-white">
            Model Intelligence
          </h3>
          <p className="text-[10px] font-mono uppercase tracking-widest text-white/50 mb-8 relative z-10">
            Active Ensemble
          </p>

          <div className="relative z-10 space-y-5">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-widest text-white/50 mb-1">
                Algorithms
              </p>
              <p className="mono-data text-sm font-bold uppercase text-[#79db8d]">
                {models || "—"}
              </p>
            </div>

            <div>
              <div className="flex justify-between text-[10px] font-mono uppercase mb-1.5 text-white/70">
                <span>Prediction Coverage</span>
                <span>{predictions.length} records</span>
              </div>
              <div className="w-full h-1 bg-white/20 rounded-full">
                <div
                  className="h-full bg-[#79db8d] rounded-full"
                  style={{ width: predictions.length > 0 ? "95%" : "0%" }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[10px] font-mono uppercase mb-1.5 text-white/70">
                <span>Components Modelled</span>
                <span>
                  {[...new Set(predictions.map((p) => p.component))].length} / 3
                </span>
              </div>
              <div className="w-full h-1 bg-white/20 rounded-full">
                <div
                  className="h-full bg-[#79db8d] rounded-full"
                  style={{
                    width: `${([...new Set(predictions.map((p) => p.component))].length / 3) * 100}%`,
                  }}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-white/10">
              <p className="text-[10px] font-mono uppercase text-white/40 mb-1">
                Last Prediction Date
              </p>
              <p className="mono-data text-sm text-white">
                {predictions[0]?.prediction_date ?? "—"}
              </p>
            </div>
          </div>

          <div className="mt-8 text-[10px] font-mono text-white/30 uppercase tracking-widest relative z-10">
            Models retrain automatically after each upload
          </div>
        </div>
      </div>
    </div>
  );
}
