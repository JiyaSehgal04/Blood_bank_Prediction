import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { T, tooltipStyle } from "../theme.js";

export function UnitsByBloodGroupBarChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={190}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
        <XAxis dataKey="name" tick={{ fill: T.text3, fontSize: 8, fontFamily: T.mono }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: T.text3, fontSize: 8 }} axisLine={false} tickLine={false} />
        <Tooltip {...tooltipStyle} />
        <Bar dataKey="units" fill={T.crimson} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
