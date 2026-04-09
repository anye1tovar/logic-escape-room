import { getFromCache, saveToCache } from "../utils/apiCache";
import { fetchJsonWithRetry } from "../utils/apiRequest";

export async function fetchRooms() {
  const cached = getFromCache("rooms");
  if (cached) return cached;

  const data = await fetchJsonWithRetry(
    `${import.meta.env.VITE_API_BASE_URL || ""}/api/rooms`
  );
  saveToCache("rooms", data);
  return data;
}
