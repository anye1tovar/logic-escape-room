import { fetchJsonWithRetry } from "../utils/apiRequest";

const PRODUCT_IMAGE_BASE_PATH = "/img/menu/products";
const CATEGORY_IMAGE_BASE_PATH = "/img/menu/categories";

export type CafeteriaProduct = {
  name: string;
  price: number;
  description?: string | null;
  available?: boolean;
  category?: string | null;
  image?: string | null;
  categoryImage?: string | null;
  categorySortOrder?: number | null;
};

function isInlineImageSource(value: string) {
  return /^(data|blob):/i.test(value);
}

function buildPublicMenuImagePath(
  image: string | null | undefined,
  basePath: string
) {
  const value = image?.trim();
  if (!value) return null;
  if (isInlineImageSource(value)) return value;

  const normalized = value
    .replace(/^(https?:)?\/\/[^/]+/i, "")
    .replace(/[?#].*$/, "")
    .replace(/\\/g, "/");
  if (normalized.startsWith(`${basePath}/`)) return normalized;

  const fileName = normalized.split("/").filter(Boolean).pop();
  return fileName ? `${basePath}/${fileName}` : null;
}

function normalizeCafeteriaProductImages(
  product: CafeteriaProduct
): CafeteriaProduct {
  return {
    ...product,
    image: buildPublicMenuImagePath(product.image, PRODUCT_IMAGE_BASE_PATH),
    categoryImage: buildPublicMenuImagePath(
      product.categoryImage,
      CATEGORY_IMAGE_BASE_PATH
    ),
  };
}

export async function fetchCafeteriaProducts(): Promise<CafeteriaProduct[]> {
  const products = await fetchJsonWithRetry<CafeteriaProduct[]>(
    `${import.meta.env.VITE_API_BASE_URL || ""}/api/cafeteria/products`
  );
  return products.map(normalizeCafeteriaProductImages);
}
