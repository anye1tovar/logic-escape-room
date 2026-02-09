import { getFromCache, saveToCache } from "../utils/apiCache";

export async function fetchRooms() {
  const cached = getFromCache("rooms");
  if (cached) return cached;

  const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ""}/api/rooms`);
  if (!res.ok) throw new Error("Failed to fetch rooms");

  const data = await res.json();
  saveToCache("rooms", data);
  return data;
}
