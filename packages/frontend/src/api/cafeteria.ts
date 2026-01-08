export type CafeteriaProduct = {
  name: string;
  price: number;
  description?: string | null;
  available?: boolean;
  category?: string | null;
  image?: string | null;
};

export async function fetchCafeteriaProducts(): Promise<CafeteriaProduct[]> {
  const res = await fetch(
    `${import.meta.env.VITE_API_BASE_URL || ""}/api/cafeteria/products`
  );
  if (!res.ok) throw new Error("Failed to fetch cafeteria products");
  return res.json();
}

