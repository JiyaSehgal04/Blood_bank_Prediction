/**
 * Light theme for SRM Blood Bank UI
 */
export const T = {
  bg: "#F8FAFC",
  bg2: "#FFFFFF",
  card: "#FFFFFF",
  border: "rgba(0,0,0,0.08)",
  borderHover: "rgba(185,28,28,0.4)",
  crimson: "#DC2626",
  crimsonD: "#991B1B",
  crimsonGlow: "rgba(220,38,38,0.08)",
  gold: "#D97706",
  goldL: "#F59E0B",
  goldLL: "#FCD34D",
  blue: "#2563EB",
  blueL: "#3B82F6",
  blueGlow: "rgba(37,99,235,0.08)",
  green: "#059669",
  greenL: "#10B981",
  purple: "#7C3AED",
  purpleL: "#A78BFA",
  text: "#0F172A",
  text2: "#334155",
  text3: "#64748B",
  text4: "#94A3B8",
  font: "'Crimson Pro', 'Georgia', serif",
  mono: "'JetBrains Mono', 'Courier New', monospace",
  sans: "'DM Sans', 'Segoe UI', sans-serif",
};

export const CHART_COLORS = [
  T.crimson,
  "#2563EB",
  "#059669",
  "#D97706",
  "#7C3AED",
  "#0891B2",
  "#BE185D",
  "#065F46",
];

export const tooltipStyle = {
  contentStyle: {
    background: T.card,
    border: `1px solid ${T.border}`,
    borderRadius: 8,
    fontSize: 11,
    color: T.text2,
    fontFamily: T.mono,
  },
  labelStyle: { color: T.text3 },
  cursor: { fill: "rgba(0,0,0,0.04)" },
};
