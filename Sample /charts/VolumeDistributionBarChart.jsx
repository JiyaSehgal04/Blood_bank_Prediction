import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { T, tooltipStyle } from "../theme.js";

export function VolumeDistributionBarChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={170}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
        <XAxis dataKey="name" tick={{ fill: T.text3, fontSize: 8, fontFamily: T.mono }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: T.text3, fontSize: 8 }} axisLine={false} tickLine={false} />
        <Tooltip {...tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 9, fontFamily: T.mono, color: T.text3 }} />
        <Bar dataKey="vol" name="Volume (ml)" fill={T.blueL} radius={[3, 3, 0, 0]} />
        <Bar dataKey="units" name="Units" fill={T.crimson} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
