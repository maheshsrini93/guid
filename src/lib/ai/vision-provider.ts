import type {
  AIProvider,
  AIProviderConfig,
  VisionAnalysisRequest,
  VisionAnalysisResponse,
} from "./types";

/**
 * Provider-agnostic interface for vision model analysis.
 * Implementations wrap specific AI provider SDKs (Gemini, OpenAI).
 */
export interface VisionProvider {
  readonly provider: AIProvider;
  readonly model: string;

  /**
   * Send an image + prompt to the vision model and get a text response.
   */
  analyzeImage(request: VisionAnalysisRequest): Promise<VisionAnalysisResponse>;
}

// ─── Gemini Vision Provider ───

class GeminiVisionProvider implements VisionProvider {
  readonly provider: AIProvider = "gemini";
  readonly model: string;
  private apiKey: string;
  private temperature: number;
  private maxTokens: number;

  constructor(config: AIProviderConfig) {
    this.model = config.model;
    this.apiKey = config.apiKey;
    this.temperature = config.temperature ?? 0.2;
    this.maxTokens = config.maxTokens ?? 4096;
  }

  async analyzeImage(
    request: VisionAnalysisRequest
  ): Promise<VisionAnalysisResponse> {
    const base64Image = request.image.toString("base64");

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType: request.mimeType,
                    data: base64Image,
                  },
                },
                { text: request.prompt },
              ],
            },
          ],
          generationConfig: {
            temperature: this.temperature,
            maxOutputTokens: request.maxTokens ?? this.maxTokens,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${error}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];

    if (!candidate?.content?.parts?.[0]?.text) {
      throw new Error("Gemini returned no content");
    }

    return {
      content: candidate.content.parts[0].text,
      model: this.model,
      usage: {
        inputTokens: data.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
      },
    };
  }
}

// ─── OpenAI Vision Provider ───

class OpenAIVisionProvider implements VisionProvider {
  readonly provider: AIProvider = "openai";
  readonly model: string;
  private apiKey: string;
  private temperature: number;
  private maxTokens: number;

  constructor(config: AIProviderConfig) {
    this.model = config.model;
    this.apiKey = config.apiKey;
    this.temperature = config.temperature ?? 0.2;
    this.maxTokens = config.maxTokens ?? 4096;
  }

  async analyzeImage(
    request: VisionAnalysisRequest
  ): Promise<VisionAnalysisResponse> {
    const base64Image = request.image.toString("base64");

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          temperature: this.temperature,
          max_tokens: request.maxTokens ?? this.maxTokens,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${request.mimeType};base64,${base64Image}`,
                  },
                },
                { type: "text", text: request.prompt },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${error}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    if (!choice?.message?.content) {
      throw new Error("OpenAI returned no content");
    }

    return {
      content: choice.message.content,
      model: this.model,
      usage: {
        inputTokens: data.usage?.prompt_tokens ?? 0,
        outputTokens: data.usage?.completion_tokens ?? 0,
      },
    };
  }
}

// ─── Factory ───

/**
 * Create a VisionProvider instance from a configuration object.
 */
export function createVisionProvider(config: AIProviderConfig): VisionProvider {
  switch (config.provider) {
    case "gemini":
      return new GeminiVisionProvider(config);
    case "openai":
      return new OpenAIVisionProvider(config);
    default:
      throw new Error(`Unknown AI provider: ${config.provider}`);
  }
}

/**
 * Create primary and optional secondary vision providers from env vars.
 * Reads from:
 *   - AI_PRIMARY_PROVIDER (gemini | openai)
 *   - AI_PRIMARY_MODEL
 *   - AI_PRIMARY_API_KEY (or GEMINI_API_KEY / OPENAI_API_KEY)
 *   - AI_SECONDARY_PROVIDER (optional)
 *   - AI_SECONDARY_MODEL (optional)
 *   - AI_SECONDARY_API_KEY (optional)
 */
export function createVisionProvidersFromEnv(): {
  primary: VisionProvider;
  secondary?: VisionProvider;
} {
  const primaryProvider = (process.env.AI_PRIMARY_PROVIDER ?? "gemini") as AIProvider;
  const primaryModel = process.env.AI_PRIMARY_MODEL ?? "gemini-2.0-flash";
  const primaryApiKey =
    process.env.AI_PRIMARY_API_KEY ??
    (primaryProvider === "gemini"
      ? process.env.GEMINI_API_KEY
      : process.env.OPENAI_API_KEY);

  if (!primaryApiKey) {
    throw new Error(
      `Missing API key for primary AI provider (${primaryProvider}). ` +
        `Set AI_PRIMARY_API_KEY or ${primaryProvider === "gemini" ? "GEMINI_API_KEY" : "OPENAI_API_KEY"}`
    );
  }

  const primary = createVisionProvider({
    provider: primaryProvider,
    model: primaryModel,
    apiKey: primaryApiKey,
  });

  const secondaryProvider = process.env.AI_SECONDARY_PROVIDER as AIProvider | undefined;
  let secondary: VisionProvider | undefined;

  if (secondaryProvider) {
    const secondaryModel = process.env.AI_SECONDARY_MODEL ?? "";
    const secondaryApiKey =
      process.env.AI_SECONDARY_API_KEY ??
      (secondaryProvider === "gemini"
        ? process.env.GEMINI_API_KEY
        : process.env.OPENAI_API_KEY);

    if (secondaryApiKey && secondaryModel) {
      secondary = createVisionProvider({
        provider: secondaryProvider,
        model: secondaryModel,
        apiKey: secondaryApiKey,
      });
    }
  }

  return { primary, secondary };
}
