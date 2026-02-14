import { apiClient } from "../lib/api-client";

interface OcrResult {
  articleNumbers: string[];
  rawText: string;
}

export function extractFromImage(base64: string) {
  return apiClient.post<OcrResult>("/api/ocr/extract", { image: base64 });
}
