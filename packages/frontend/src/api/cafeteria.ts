import { fetchJsonWithRetry } from "../utils/apiRequest";

export type CafeteriaProduct = {
  name: string;
  price: number;
  description?: string | null;
  available?: boolean;
  category?: string | null;
  image?: string | null;
};

export async function fetchCafeteriaProducts(): Promise<CafeteriaProduct[]> {
  return fetchJsonWithRetry(
    `${import.meta.env.VITE_API_BASE_URL || ""}/api/cafeteria/products`
  );
}
