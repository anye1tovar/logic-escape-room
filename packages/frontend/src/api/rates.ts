export type ApiRate = {
  id?: number | string;
  day_type?: string;
  day_label?: string;
  day_range?: string;
  players?: number;
  price_per_person?: number;
  currency?: string;
};

import { getFromCache, saveToCache } from "../utils/apiCache";

export async function fetchRates(dayType?: string) {
  const cacheKey = `rates_${dayType || "all"}`;
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  const base = import.meta.env.VITE_API_BASE_URL || "";
  const query = dayType ? `?dayType=${encodeURIComponent(dayType)}` : "";
  const res = await fetch(`${base}/api/rates${query}`);
  if (!res.ok) throw new Error("Failed to fetch rates");

  const data = await res.json();
  saveToCache(cacheKey, data);
  return data;
}
