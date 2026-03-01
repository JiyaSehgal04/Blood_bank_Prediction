import { useEffect, useMemo, useState } from "react";
import { uploadInventory, getInventorySummary, runForecast } from "../api/client";
import { KpiCards } from "../components/KpiCards";
import StockMatrix from "../components/StockMatrix";

type Row = { blood_group: string; component: string; usable_ml: number };

export default function InventoryPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("");
  const [forecastStatus, setForecastStatus] = useState<string>("");

  async function refresh() {
    const data = await getInventorySummary();
    setRows(data);
  }

  useEffect(() => {
    refresh().catch(() => {});
  }, []);

  const totalUsable = useMemo(
    () => rows.reduce((s, r) => s + (r.usable_ml || 0), 0),
    [rows]
  );

  const distinctBG = useMemo(() => new Set(rows.map((r) => r.blood_group)).size, [rows]);
  const distinctComp = useMemo(() => new Set(rows.map((r) => r.component)).size, [rows]);

  return (
    <div className="space-y-4">
      <KpiCards
        items={[
          { label: "Usable Inventory (ml)", value: Math.round(totalUsable).toLocaleString(), hint: "Filtered for negative tests + non-expired" },
          { label: "Blood Groups", value: String(distinctBG) },
          { label: "Components", value: String(distinctComp) },
        ]}
      />

      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="font-semibold">Load Inventory Dataset</div>
            <div className="text-xs text-slate-500 mt-1">
              Upload your Excel file to ingest inventory and compute proxy demand.
            </div>
          </div>

          <div className="flex gap-2">
            <label className="px-3 py-2 rounded-xl bg-slate-900 text-white text-sm cursor-pointer">
              Upload Excel
              <input
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setBusy(true);
                  setMsg("");
                  try {
                    await uploadInventory(f);
                    await refresh();
                    setMsg("Inventory ingested successfully.");
                  } catch {
                    setMsg("Upload failed. Check backend logs.");
                  } finally {
                    setBusy(false);
                    e.currentTarget.value = "";
                  }
                }}
              />
            </label>

            <button
              disabled={busy}
              className="px-3 py-2 rounded-xl bg-slate-100 text-slate-900 text-sm border border-slate-200 hover:bg-slate-200 disabled:opacity-50"
              onClick={async () => {
                setBusy(true);
                setForecastStatus("");
                try {
                  const out = await runForecast();
                  if (out?.ok) {
                    setForecastStatus("Forecast + alerts generated successfully from proxy demand.");
                  } else {
                    setForecastStatus(
                      out?.reason
                        ? `Forecast run did not complete: ${out.reason}`
                        : "Forecast run did not complete. Check backend logs."
                    );
                  }
                } catch {
                  setForecastStatus("Failed to run forecast. Check backend logs.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Run Forecast
            </button>
          </div>
        </div>

        {msg && <div className="text-sm text-slate-700 mt-3">{msg}</div>}
        {forecastStatus && (
          <div className="text-sm text-slate-300 mt-2 bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2">
            {forecastStatus}
          </div>
        )}
      </div>

      <StockMatrix rows={rows} />
    </div>
  );
}