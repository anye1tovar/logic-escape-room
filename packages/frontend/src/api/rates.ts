export type ApiRate = {
  id?: number | string;
  day_type?: string;
  day_label?: string;
  day_range?: string;
  players?: number;
  price_per_person?: number;
  currency?: string;
};

export async function fetchRates(dayType?: string) {
  const base = import.meta.env.VITE_API_BASE_URL || "";
  const query = dayType ? `?dayType=${encodeURIComponent(dayType)}` : "";
  const res = await fetch(`${base}/api/rates${query}`);
  if (!res.ok) throw new Error("Failed to fetch rates");
  return res.json();
}
