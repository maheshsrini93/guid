export type {
  RetailerAdapter,
  RetailerInfo,
  NewProduct,
  ScrapedProduct,
  ScrapedDocument,
  ScrapedImage,
  RateLimitConfig,
  NormalizedProduct,
} from "./types";
export { IkeaAdapter } from "./ikea-adapter";
export { WayfairAdapter } from "./wayfair-adapter";
export { HomeDepotAdapter } from "./homedepot-adapter";
export { AmazonAdapter } from "./amazon-adapter";
export { TargetAdapter } from "./target-adapter";
export { getAdapter, getActiveAdapters, registerAdapter } from "./registry";
export { normalizeProduct, parsePrice, normalizeDimension, normalizeCategoryPath, convertCurrency, convertCurrencyAsync, mapCategory } from "./normalizer";
export { validateAdapter } from "./validation";
export type { AdapterValidationReport, ProductValidationResult, ValidationConfig } from "./validation";
