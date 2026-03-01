export function KpiCards({
  items,
}: {
  items: Array<{ label: string; value: string; hint?: string }>;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {items.map((k) => (
        <div
          key={k.label}
          className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm"
        >
          <div className="text-xs text-slate-500">{k.label}</div>
          <div className="text-2xl font-semibold mt-1">{k.value}</div>
          {k.hint && <div className="text-xs text-slate-500 mt-2">{k.hint}</div>}
        </div>
      ))}
    </div>
  );
}