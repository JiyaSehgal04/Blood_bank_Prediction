import { Chip } from "./Chip.jsx";

const STATUS_MAP = {
  critical: { c: "#DC2626", b: "rgba(220,38,38,0.12)", label: "CRITICAL" },
  warning: { c: "#D97706", b: "rgba(217,119,6,0.12)", label: "LOW STOCK" },
  sufficient: { c: "#059669", b: "rgba(5,150,105,0.12)", label: "SUFFICIENT" },
  ok: { c: "#059669", b: "rgba(5,150,105,0.12)", label: "OK" },
  expired: { c: "#64748B", b: "rgba(100,116,139,0.12)", label: "EXPIRED" },
};

export function StatusBadge({ s }) {
  const v = STATUS_MAP[s] || STATUS_MAP.ok;
  return (
    <Chip color={v.c} bg={v.b}>
      {v.label}
    </Chip>
  );
}
