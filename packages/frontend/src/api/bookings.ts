export async function fetchBookings() {
  const res = await fetch(
    `${import.meta.env.VITE_API_BASE_URL || ""}/api/bookings`
  );
  if (!res.ok) throw new Error("Failed to fetch bookings");
  return res.json();
}

export async function createBooking(payload: any) {
  const res = await fetch(
    `${import.meta.env.VITE_API_BASE_URL || ""}/api/bookings`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || "Failed to create booking");
  }
  return res.json();
}

export type BookingQuote = {
  date: string;
  dayType: "weekday" | "weekend" | string;
  isHoliday: boolean;
  players: number;
  currency: string;
  pricePerPerson: number;
  total: number;
};

export async function fetchBookingQuote(params: {
  date: string;
  attendees: number;
}): Promise<BookingQuote> {
  const base = import.meta.env.VITE_API_BASE_URL || "";
  const url = new URL(`${base}/api/bookings/quote`, window.location.origin);
  url.searchParams.set("date", params.date);
  url.searchParams.set("attendees", String(params.attendees));

  const res = await fetch(url.toString());
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || "Failed to fetch quote");
  }
  return res.json();
}
