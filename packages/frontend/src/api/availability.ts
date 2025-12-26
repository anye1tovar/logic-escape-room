export type RoomAvailability = {
  roomId: string;
  available: string[];
  unavailable: string[];
};

export type AvailabilityResponse = {
  date: string;
  timeSlots?: string[];
  rooms: RoomAvailability[];
};

export async function fetchAvailability(date: string): Promise<AvailabilityResponse> {
  const base = import.meta.env.VITE_API_BASE_URL || "";
  const url = new URL(`${base}/api/bookings/availability`, window.location.origin);
  url.searchParams.set("date", date);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to fetch availability");
  return res.json();
}

