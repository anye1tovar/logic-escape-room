type ApiError = Error & { status?: number };

export type LoginResponse = {
  user: { id: number; email: string; name: string | null; role: string };
  token: string;
};

export async function login(payload: {
  email: string;
  password: string;
}): Promise<LoginResponse> {
  const base = import.meta.env.VITE_API_BASE_URL || "";
  const res = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    const error = new Error(err.error || "Login failed") as ApiError;
    error.status = res.status;
    throw error;
  }

  return res.json();
}

