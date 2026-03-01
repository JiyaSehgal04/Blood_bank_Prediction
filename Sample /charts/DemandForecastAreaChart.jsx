import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { T, tooltipStyle } from "../theme.js";

export function DemandForecastAreaChart({ data }) {
  if (!data || !data.length) return null;
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 4, right: 14, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="fgLight" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={T.blueL} stopOpacity={0.35} />
            <stop offset="95%" stopColor={T.blueL} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="ugLight" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={T.crimson} stopOpacity={0.15} />
            <stop offset="95%" stopColor={T.crimson} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
        <XAxis dataKey="d" tick={{ fill: T.text3, fontSize: 8, fontFamily: T.mono }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: T.text3, fontSize: 8 }} axisLine={false} tickLine={false} />
        <Tooltip {...tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 9, fontFamily: T.mono, color: T.text3 }} />
        <Area type="monotone" dataKey="upper" name="Upper CI" stroke={T.crimson} strokeWidth={1} strokeDasharray="4 2" fill="url(#ugLight)" dot={false} />
        <Area type="monotone" dataKey="pred" name="Forecast" stroke={T.blueL} strokeWidth={2} fill="url(#fgLight)" dot={false} />
        <Area type="monotone" dataKey="lower" name="Lower CI" stroke={T.blueL} strokeWidth={1} strokeDasharray="4 2" fill="none" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
