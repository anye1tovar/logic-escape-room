type ApiError = Error & { status?: number };

function getAdminToken() {
  return localStorage.getItem("adminToken") || "";
}

export async function adminRequest<T>(
  path: string,
  options?: { method?: string; body?: unknown }
): Promise<T> {
  const base = import.meta.env.VITE_API_BASE_URL || "";
  const res = await fetch(`${base}${path}`, {
    method: options?.method || "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getAdminToken()}`,
    },
    body: options?.body != null ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    const error = new Error(err.error || "Request failed") as ApiError;
    error.status = res.status;
    throw error;
  }

  return res.json();
}

