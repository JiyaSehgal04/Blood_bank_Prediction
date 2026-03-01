import { T } from "../theme.js";

export function Chip({ children, color = T.crimson, bg }) {
  return (
    <span
      style={{
        background: bg || `${color}22`,
        color,
        border: `1px solid ${color}55`,
        borderRadius: 4,
        padding: "2px 7px",
        fontSize: 9,
        fontFamily: T.mono,
        fontWeight: 600,
        letterSpacing: "0.07em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}
