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
