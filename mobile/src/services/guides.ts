import { apiClient } from "../lib/api-client";

interface GuideStep {
  id: string;
  stepNumber: number;
  title: string;
  instruction: string;
  imageUrl: string | null;
  tip: string | null;
  warning: string | null;
}

interface Guide {
  id: string;
  title: string;
  difficulty: string;
  timeMinutes: number | null;
  tools: string | null;
  published: boolean;
  steps: GuideStep[];
}

interface ProgressResponse {
  articleNumber: string;
  currentStep: number;
}

export function getGuide(articleNumber: string) {
  // Guide data is included in the product detail response
  return apiClient.get<{ guide: Guide | null }>(
    `/api/products/${articleNumber}`
  );
}

export function saveProgress(articleNumber: string, step: number) {
  return apiClient.post<{ success: boolean }>("/api/guides/progress", {
    articleNumber,
    currentStep: step,
  });
}

export function getProgress(articleNumber: string) {
  return apiClient.get<ProgressResponse>(
    `/api/guides/progress?articleNumber=${encodeURIComponent(articleNumber)}`
  );
}
