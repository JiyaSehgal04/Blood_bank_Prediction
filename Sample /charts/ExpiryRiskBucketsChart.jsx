import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { T, tooltipStyle } from "../theme.js";

const BUCKET_COLORS = [T.crimson, T.goldL, T.goldLL, T.blueL, T.greenL];

export function ExpiryRiskBucketsChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
        <XAxis dataKey="n" tick={{ fill: T.text3, fontSize: 9, fontFamily: T.mono }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: T.text3, fontSize: 8 }} axisLine={false} tickLine={false} />
        <Tooltip {...tooltipStyle} />
        <Bar dataKey="v" name="Units" radius={[3, 3, 0, 0]}>
          {data.map((b, i) => (
            <Cell key={i} fill={BUCKET_COLORS[i % BUCKET_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
