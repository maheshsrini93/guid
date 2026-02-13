export interface GuideStep {
  id: string;
  stepNumber: number;
  title: string;
  instruction: string;
  tip: string | null;
  imageUrl: string | null;
  warning?: string | null;
  info?: string | null;
}

export interface GuideData {
  title: string;
  description: string | null;
  difficulty: string;
  timeMinutes: number | null;
  tools: string | null;
  aiGenerated?: boolean;
  communityContributed?: boolean;
  contributorName?: string | null;
  steps: GuideStep[];
}

export interface ProductInfo {
  articleNumber: string;
  productName: string;
  imageUrl?: string | null;
  price?: number | null;
  dimension?: string | null;
  dimensionLabel?: string | null;
}
