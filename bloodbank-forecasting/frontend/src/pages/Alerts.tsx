import { useEffect, useState } from "react";
import { getAlerts } from "../api/client";
import AlertsTable from "../components/AlertsTable";
import { KpiCards } from "../components/KpiCards";

export interface AlertRow {
  date: string;
  type: string;
  blood_group: string | null;
  component: string | null;
  severity: string;
  message: string;
  shortfall_ml: number | null;
}

export default function AlertsPage() {
  const [rows, setRows] = useState<AlertRow[]>([]);

  useEffect(() => {
    (async () => {
      const a = await getAlerts();
      setRows(a);
    })().catch(() => {});
  }, []);

  const lowStock = rows.filter((r) => r.type === "LOW_STOCK").length;
  const expiry = rows.filter((r) => r.type === "EXPIRY_RISK").length;

  return (
    <div className="space-y-4">
      <KpiCards
        items={[
          { label: "Low Stock Alerts", value: String(lowStock), hint: "Based on next 7 days prediction vs usable stock" },
          { label: "Expiry Risk Alerts", value: String(expiry), hint: "Usable units expiring within 7 days" },
          { label: "Mode", value: "Proxy Demand", hint: "Will switch to issued/usage when available" },
        ]}
      />

      <AlertsTable rows={rows} />
    </div>
  );
}