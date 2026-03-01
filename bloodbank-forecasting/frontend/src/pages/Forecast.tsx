import { useEffect, useMemo, useState } from "react";
import { getInventorySummary, getForecastNext7 } from "../api/client";
import ForecastChart from "../components/ForecastChart";

type InvRow = { blood_group: string; component: string; usable_ml: number };
type ForecastRow = { target_date: string; predicted_ml: number; model: string };

export default function ForecastPage() {
  const [inventory, setInventory] = useState<InvRow[]>([]);
  const [bg, setBg] = useState<string>("");
  const [component, setComponent] = useState<string>("");
  const [mode, setMode] = useState<"bg" | "bg_comp">("bg_comp");
  const [data, setData] = useState<Array<{ target_date: string; predicted_ml: number }>>([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      const inv = (await getInventorySummary()) as InvRow[];
      setInventory(inv);
      const bgs = Array.from(new Set(inv.map((r: InvRow) => r.blood_group))).sort();
      const comps = Array.from(new Set(inv.map((r: InvRow) => r.component))).sort();
      setBg(bgs.length > 0 ? bgs[0] : "A+");
      setComponent(comps.length > 0 ? comps[0] : "WB/PRC");
    })().catch(() => {});
  }, []);

  const bloodGroups = useMemo(
    () => Array.from(new Set(inventory.map((r) => r.blood_group))).sort(),
    [inventory]
  );
  const components = useMemo(
    () => Array.from(new Set(inventory.map((r) => r.component))).sort(),
    [inventory]
  );

  async function load() {
    setMsg("");
    try {
      const resp =
        mode === "bg"
          ? await getForecastNext7(bg)
          : await getForecastNext7(bg, component);

      if (!Array.isArray(resp) || resp.length === 0) {
        setMsg(
          "No forecast data for this selection. Make sure you have uploaded inventory and run the forecast today on the Inventory tab."
        );
        setData([]);
        return;
      }

      setData(
        (resp as ForecastRow[]).map((r) => ({
          target_date: r.target_date,
          predicted_ml: Number(r.predicted_ml || 0),
        }))
      );
    } catch {
      setMsg("No forecast found. Go to Inventory tab and click 'Run Forecast'.");
      setData([]);
    }
  }

  useEffect(() => {
    if (!bg) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bg, component, mode]);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <div className="font-semibold">Forecast Controls</div>
            <div className="text-xs text-slate-500 mt-1">
              Choose forecast view: Blood Group-only or Blood Group + Component.
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
              value={mode}
              onChange={(e) => setMode(e.target.value as "bg" | "bg_comp")}
            >
              <option value="bg_comp">Blood Group + Component</option>
              <option value="bg">Blood Group Only</option>
            </select>

            <select
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
              value={bg}
              onChange={(e) => setBg(e.target.value)}
            >
              {bloodGroups.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>

            <select
              disabled={mode === "bg"}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm disabled:opacity-50"
              value={component}
              onChange={(e) => setComponent(e.target.value)}
            >
              {components.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>

            <button
              className="px-3 py-2 rounded-xl bg-slate-900 text-white text-sm"
              onClick={load}
            >
              Refresh
            </button>
          </div>
        </div>
        {msg && <div className="text-sm text-slate-700 mt-3">{msg}</div>}
      </div>

      <ForecastChart data={data} />

      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm overflow-auto">
        <div className="font-semibold mb-3">7-Day Forecast Table (ml)</div>
        <table className="min-w-[500px] w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="py-2 pr-4">Date</th>
              <th className="py-2 pr-4">Predicted (ml)</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <tr key={r.target_date} className="border-t border-slate-100">
                <td className="py-3 pr-4">{r.target_date}</td>
                <td className="py-3 pr-4 font-medium">
                  {Math.round(r.predicted_ml).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}