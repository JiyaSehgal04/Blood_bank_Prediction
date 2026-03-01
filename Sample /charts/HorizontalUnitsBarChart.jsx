import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { T, tooltipStyle } from "../theme.js";

export function HorizontalUnitsBarChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={210}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, left: 20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
        <XAxis type="number" tick={{ fill: T.text3, fontSize: 8 }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" tick={{ fill: T.text2, fontSize: 9, fontFamily: T.mono }} axisLine={false} tickLine={false} width={52} />
        <Tooltip {...tooltipStyle} />
        <Bar dataKey="units" fill={T.crimson} radius={[0, 3, 3, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
