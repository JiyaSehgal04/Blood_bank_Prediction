import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { T, CHART_COLORS, tooltipStyle } from "../theme.js";

export function ComponentPieChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={190}>
      <PieChart>
        <Pie
          data={data}
          dataKey="units"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={78}
          innerRadius={36}
          paddingAngle={4}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          labelLine={{ stroke: T.text4, strokeWidth: 0.5 }}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip {...tooltipStyle} />
      </PieChart>
    </ResponsiveContainer>
  );
}
