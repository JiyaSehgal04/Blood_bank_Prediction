type AlertRow = {
  date: string;
  type: string;
  blood_group?: string | null;
  component?: string | null;
  severity: string;
  message: string;
  shortfall_ml?: number | null;
};

export default function AlertsTable({ rows }: { rows: AlertRow[] }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
      <div className="font-semibold mb-3">Alerts</div>
      <div className="overflow-auto">
        <table className="min-w-[900px] w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="py-2 pr-4">Date</th>
              <th className="py-2 pr-4">Type</th>
              <th className="py-2 pr-4">Blood Group</th>
              <th className="py-2 pr-4">Component</th>
              <th className="py-2 pr-4">Severity</th>
              <th className="py-2 pr-4">Shortfall (ml)</th>
              <th className="py-2 pr-4">Message</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={idx} className="border-t border-slate-100">
                <td className="py-3 pr-4">{r.date}</td>
                <td className="py-3 pr-4">{r.type}</td>
                <td className="py-3 pr-4">{r.blood_group || "-"}</td>
                <td className="py-3 pr-4">{r.component || "-"}</td>
                <td className="py-3 pr-4 font-medium">{r.severity}</td>
                <td className="py-3 pr-4">
                  {r.shortfall_ml != null ? Math.round(r.shortfall_ml).toLocaleString() : "-"}
                </td>
                <td className="py-3 pr-4">{r.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}