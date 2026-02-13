import { prisma } from "@/lib/prisma";

/**
 * Intent classification result for the first user message in a chat.
 */
export interface IntentResult {
  /** Detected intent type */
  intent: "assembly" | "troubleshooting" | "unknown";
  /** Confidence: "high" if keyword match, "medium" if pattern-based */
  confidence: "high" | "medium" | "low";
  /** If assembly intent and guide exists, the guide redirect info */
  guideRedirect: {
    articleNumber: string;
    productName: string | null;
    guideExists: boolean;
  } | null;
}

// Keywords that strongly indicate assembly help intent
const ASSEMBLY_KEYWORDS = [
  "assemble",
  "assembly",
  "put together",
  "build",
  "building",
  "set up",
  "setup",
  "instructions",
  "step by step",
  "step-by-step",
  "how to build",
  "how to assemble",
  "how do i build",
  "how do i assemble",
  "construction",
  "install",
  "installation",
  "mounting",
  "attach",
  "manual",
];

// Keywords that strongly indicate troubleshooting intent
const TROUBLESHOOTING_KEYWORDS = [
  "broken",
  "broke",
  "wobbl",
  "unstable",
  "squeek",
  "squeak",
  "stuck",
  "won't close",
  "won't open",
  "doesn't close",
  "doesn't open",
  "missing part",
  "missing screw",
  "damaged",
  "cracked",
  "loose",
  "fell apart",
  "falling apart",
  "doesn't fit",
  "not working",
  "replacement",
  "repair",
  "fix",
  "wrong part",
];

/**
 * Detect whether a user's first message indicates assembly help
 * (redirect to guide) or troubleshooting (stay in chat).
 *
 * Uses fast client-safe keyword matching. For the first message only —
 * subsequent messages are handled by the conversational AI.
 */
export function classifyIntent(message: string): {
  intent: "assembly" | "troubleshooting" | "unknown";
  confidence: "high" | "medium" | "low";
} {
  const lower = message.toLowerCase();

  const assemblyScore = ASSEMBLY_KEYWORDS.filter((kw) =>
    lower.includes(kw)
  ).length;
  const troubleshootScore = TROUBLESHOOTING_KEYWORDS.filter((kw) =>
    lower.includes(kw)
  ).length;

  if (assemblyScore > 0 && troubleshootScore === 0) {
    return {
      intent: "assembly",
      confidence: assemblyScore >= 2 ? "high" : "medium",
    };
  }

  if (troubleshootScore > 0 && assemblyScore === 0) {
    return {
      intent: "troubleshooting",
      confidence: troubleshootScore >= 2 ? "high" : "medium",
    };
  }

  if (assemblyScore > troubleshootScore) {
    return { intent: "assembly", confidence: "medium" };
  }

  if (troubleshootScore > assemblyScore) {
    return { intent: "troubleshooting", confidence: "medium" };
  }

  return { intent: "unknown", confidence: "low" };
}

/**
 * Full intent detection with guide lookup.
 *
 * For assembly intent, checks if a published guide exists and returns
 * redirect info. Used server-side in the chat API.
 */
export async function detectIntent(
  message: string,
  productId?: number
): Promise<IntentResult> {
  const { intent, confidence } = classifyIntent(message);

  // Only look up guide redirect for assembly intent with a known product
  if (intent === "assembly" && productId) {
    try {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: {
          article_number: true,
          product_name: true,
          guide_status: true,
        },
      });

      if (product && product.guide_status === "published") {
        return {
          intent,
          confidence,
          guideRedirect: {
            articleNumber: product.article_number,
            productName: product.product_name,
            guideExists: true,
          },
        };
      }

      if (product) {
        return {
          intent,
          confidence,
          guideRedirect: {
            articleNumber: product.article_number,
            productName: product.product_name,
            guideExists: false,
          },
        };
      }
    } catch (error) {
      console.error("Intent detection DB lookup failed:", error instanceof Error ? error.message : String(error));
      // Graceful degradation: return intent without guide redirect
    }
  }

  return { intent, confidence, guideRedirect: null };
}
