import { useState, useEffect } from "react";
import { T } from "../theme.js";

export function Kpi({ label, value, sub, accent = T.crimson, icon }) {
  const [n, setN] = useState(0);
  const num = parseFloat(String(value).replace(/[^0-9.]/g, "")) || 0;
  const sfx = String(value).replace(/[0-9.]/g, "");

  useEffect(() => {
    let cur = 0;
    const step = num / 45;
    const t = setInterval(() => {
      cur = Math.min(cur + step, num);
      setN(cur);
      if (cur >= num) clearInterval(t);
    }, 16);
    return () => clearInterval(t);
  }, [num]);

  return (
    <div
      style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 10,
        padding: "18px 20px",
        position: "relative",
        overflow: "hidden",
        cursor: "default",
        transition: "border-color 0.2s, transform 0.2s, box-shadow 0.2s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = accent;
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.06)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = T.border;
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div style={{ position: "absolute", left: 0, top: 0, width: 3, height: "100%", background: accent, borderRadius: "2px 0 0 2px" }} />
      <div style={{ fontSize: 9, color: T.text3, fontFamily: T.mono, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontFamily: T.font, fontSize: 28, fontWeight: 700, color: accent, lineHeight: 1 }}>
        {sfx ? `${num === n ? num.toFixed(1) : n.toFixed(1)}${sfx}` : `${Math.round(n).toLocaleString()}`}
      </div>
      <div style={{ fontSize: 10, color: T.text3, marginTop: 5, fontFamily: T.sans }}>{sub}</div>
      {icon && (
        <div style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 26, opacity: 0.12 }}>
          {icon}
        </div>
      )}
    </div>
  );
}
