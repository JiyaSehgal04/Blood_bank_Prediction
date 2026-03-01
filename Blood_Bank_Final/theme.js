// ═══════════════════════════════════════════════════════════════
// DESIGN TOKENS — Light Formal Theme
// SRM Blood Bank Management System
// ═══════════════════════════════════════════════════════════════

export const T = {
  // Backgrounds
  bg:        "#F4F6F9",       // page background
  bg2:       "#FFFFFF",       // sidebar / panel
  card:      "#FFFFFF",       // card surface
  cardHover: "#F8FAFC",

  // Borders
  border:      "rgba(0,0,0,0.08)",
  borderFocus: "#2563EB",
  borderHover: "#DC2626",

  // Brand / Accent
  crimson:     "#C8102E",     // SRM red
  crimsonD:    "#9B0D22",
  crimsonL:    "#F9E5E9",
  crimsonGlow: "rgba(200,16,46,0.08)",

  gold:    "#B45309",
  goldL:   "#D97706",
  goldLL:  "#F59E0B",
  goldBg:  "#FFFBEB",

  blue:    "#1D4ED8",
  blueL:   "#2563EB",
  blueLL:  "#3B82F6",
  blueBg:  "#EFF6FF",

  green:   "#047857",
  greenL:  "#059669",
  greenBg: "#ECFDF5",

  purple:  "#6D28D9",
  purpleL: "#7C3AED",
  purpleBg:"#F5F3FF",

  // Text
  text:    "#111827",
  text2:   "#374151",
  text3:   "#6B7280",
  text4:   "#9CA3AF",
  textInv: "#FFFFFF",

  // Typography
  font: "'Playfair Display','Georgia',serif",
  mono: "'JetBrains Mono','Courier New',monospace",
  sans: "'Inter','Segoe UI',sans-serif",

  // Shadows
  shadow:   "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)",
  shadowMd: "0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06)",
  shadowLg: "0 10px 15px rgba(0,0,0,0.07), 0 4px 6px rgba(0,0,0,0.05)",
};

export const CHART_COLORS = [
  T.crimson, T.blueL, T.greenL, T.goldL,
  T.purpleL, "#0891B2", "#BE185D", "#065F46"
];

export const TT = {
  contentStyle: {
    background: "#FFFFFF",
    border: `1px solid ${T.border}`,
    borderRadius: 8,
    fontSize: 11,
    color: T.text2,
    fontFamily: T.mono,
    boxShadow: T.shadowMd,
  },
  labelStyle: { color: T.text3 },
  cursor: { fill: "rgba(0,0,0,0.03)" },
};
