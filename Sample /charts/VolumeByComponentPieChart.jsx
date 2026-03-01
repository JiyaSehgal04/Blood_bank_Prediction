import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { T, CHART_COLORS, tooltipStyle } from "../theme.js";

export function VolumeByComponentPieChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={210}>
      <PieChart>
        <Pie
          data={data}
          dataKey="vol"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={85}
          innerRadius={42}
          paddingAngle={4}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          labelLine={{ stroke: T.text4, strokeWidth: 0.4 }}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip {...tooltipStyle} formatter={(v) => `${v.toLocaleString()} ml`} />
      </PieChart>
    </ResponsiveContainer>
  );
}
