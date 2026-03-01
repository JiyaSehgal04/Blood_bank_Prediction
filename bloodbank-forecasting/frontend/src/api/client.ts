const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function uploadInventory(file: File) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API}/ingest/inventory`, { method: "POST", body: fd });
  if (!res.ok) throw new Error("Failed to upload inventory");
  return res.json();
}

export async function runForecast() {
  const res = await fetch(`${API}/forecast/run`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to run forecast");
  return res.json();
}

export async function getInventorySummary() {
  const res = await fetch(`${API}/inventory/summary`);
  if (!res.ok) throw new Error("Failed to fetch inventory summary");
  return res.json();
}

export async function getForecastNext7(blood_group: string, component?: string) {
  const url = new URL(`${API}/forecast/next7`);
  url.searchParams.set("blood_group", blood_group);
  if (component) url.searchParams.set("component", component);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to fetch forecast");
  return res.json();
}

export async function getAlerts() {
  const res = await fetch(`${API}/alerts`);
  if (!res.ok) throw new Error("Failed to fetch alerts");
  return res.json();
}