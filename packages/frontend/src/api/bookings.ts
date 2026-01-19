type ApiError = Error & { status?: number };

function getAdminToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("adminToken");
}

export async function createBooking(payload: Record<string, unknown>) {
  const token = getAdminToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(
    `${import.meta.env.VITE_API_BASE_URL || ""}/api/bookings`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || "Failed to create booking");
  }
  return res.json();
}

export type BookingStatusResponse = {
  consultCode: string;
  status: string | null;
  roomId?: number | string | null;
  roomName?: string | null;
  date?: string | null;
  time?: string | null;
};

export async function fetchBookingStatus(
  consultCode: string
): Promise<BookingStatusResponse> {
  const base = import.meta.env.VITE_API_BASE_URL || "";
  const res = await fetch(
    `${base}/api/bookings/consult/${encodeURIComponent(consultCode)}`
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    const error = new Error(
      err.error || "Failed to fetch booking status"
    ) as ApiError;
    error.status = res.status;
    throw error;
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
