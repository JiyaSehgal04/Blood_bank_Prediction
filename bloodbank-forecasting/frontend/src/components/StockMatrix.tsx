type Row = { blood_group: string; component: string; usable_ml: number };

function fmt(x: number) {
  if (!isFinite(x)) return "0";
  return Math.round(x).toLocaleString();
}

export default function StockMatrix({ rows }: { rows: Row[] }) {
  const bloodGroups = Array.from(new Set(rows.map((r) => r.blood_group))).sort();
  const components = Array.from(new Set(rows.map((r) => r.component))).sort();

  const map = new Map<string, number>();
  for (const r of rows) map.set(`${r.blood_group}__${r.component}`, r.usable_ml);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm overflow-auto">
      <div className="font-semibold mb-3">Usable Stock Matrix (ml)</div>
      <table className="min-w-[700px] w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500">
            <th className="py-2 pr-4">Blood Group</th>
            {components.map((c) => (
              <th key={c} className="py-2 pr-4">
                {c}
              </th>
            ))}
            <th className="py-2 pr-4">Total</th>
          </tr>
        </thead>
        <tbody>
          {bloodGroups.map((bg) => {
            let total = 0;
            return (
              <tr key={bg} className="border-t border-slate-100">
                <td className="py-3 pr-4 font-medium">{bg}</td>
                {components.map((c) => {
                  const v = map.get(`${bg}__${c}`) || 0;
                  total += v;
                  return (
                    <td key={c} className="py-3 pr-4">
                      {fmt(v)}
                    </td>
                  );
                })}
                <td className="py-3 pr-4 font-semibold">{fmt(total)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}