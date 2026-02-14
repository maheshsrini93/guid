import { apiClient } from "../lib/api-client";

interface ProductImage {
  id: number;
  url: string;
  alt_text: string | null;
}

interface ProductDetail {
  id: number;
  articleNumber: string;
  name: string | null;
  type: string | null;
  description: string | null;
  priceCurrency: string | null;
  priceCurrent: number | null;
  priceOriginal: number | null;
  color: string | null;
  assemblyRequired: boolean | null;
  avgRating: number | null;
  reviewCount: number | null;
  categoryPath: string | null;
  materials: string | null;
  dimensions: {
    width: string | null;
    height: string | null;
    depth: string | null;
    length: string | null;
    weight: string | null;
  };
  images: ProductImage[];
  guide: {
    id: string;
    title: string;
    difficulty: string;
    timeMinutes: number | null;
    tools: string | null;
    published: boolean;
    steps: {
      id: string;
      stepNumber: number;
      title: string;
      instruction: string;
      imageUrl: string | null;
      tip: string | null;
      warning: string | null;
    }[];
  } | null;
  retailer: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
  } | null;
  sourceUrl: string | null;
}

interface ProductListItem {
  id: number;
  articleNumber: string;
  name: string | null;
  type: string | null;
  priceCurrency: string | null;
  priceCurrent: number | null;
  avgRating: number | null;
  assemblyRequired: boolean | null;
  guideStatus: string;
  imageUrl: string | null;
}

interface SavedProductItem {
  id: string;
  savedAt: string;
  product: ProductListItem;
}

interface SaveResponse {
  saved: boolean;
}

export function getProducts(filters?: Record<string, string>) {
  const params = filters ? "?" + new URLSearchParams(filters).toString() : "";
  return apiClient.get<{ products: ProductListItem[]; total: number }>(
    `/api/products${params}`
  );
}

export function getProduct(articleNumber: string) {
  return apiClient.get<ProductDetail>(`/api/products/${articleNumber}`);
}

export function saveProduct(articleNumber: string) {
  return apiClient.post<SaveResponse>("/api/products/save", { articleNumber });
}

export function unsaveProduct(articleNumber: string) {
  return apiClient.post<SaveResponse>("/api/products/save", { articleNumber });
}

export function getSavedProducts() {
  return apiClient.get<SavedProductItem[]>("/api/products/saved");
}

export function getPopularProducts() {
  return apiClient.get<{ products: ProductListItem[] }>(
    "/api/products?sort=rating-desc&limit=10"
  );
}
