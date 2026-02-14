import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyMobileToken } from "@/lib/mobile-auth";

const MAX_IMAGE_SIZE = 10_000_000; // ~7.5MB decoded image

const extractSchema = z.object({
  image: z
    .string()
    .min(100, "Image data too short")
    .max(MAX_IMAGE_SIZE, "Image data too large"),
});

// Article number patterns for supported retailers
const ARTICLE_PATTERNS = [
  // IKEA: 3 groups of 3 digits separated by dots or spaces (e.g., 702.758.14)
  /\b(\d{3})[.\s](\d{3})[.\s](\d{2,3})\b/g,
  // Generic: 8-12 digit numbers (UPC, EAN, SKU)
  /\b(\d{8,13})\b/g,
  // Amazon ASIN: B followed by 9 alphanumeric chars
  /\b(B[0-9A-Z]{9})\b/g,
  // Home Depot: 6-9 digit model numbers
  /\b(\d{6,9})\b/g,
];

function extractArticleNumbers(text: string): string[] {
  const found = new Set<string>();

  for (const pattern of ARTICLE_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = regex.exec(text)) !== null) {
      // For IKEA pattern, reconstruct the article number
      if (match[2] && match[3]) {
        found.add(`${match[1]}.${match[2]}.${match[3]}`);
      } else {
        found.add(match[1] ?? match[0]);
      }
    }
  }

  return Array.from(found);
}

export async function POST(request: NextRequest) {
  // Require authentication to prevent API quota abuse
  const user = await verifyMobileToken(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { image } = extractSchema.parse(body);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OCR service not configured" },
        { status: 503 }
      );
    }

    // Send to Gemini Flash for OCR
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are an OCR assistant for a product guide app. Extract ALL text visible in this image, focusing on:
1. Product names and model numbers
2. Article numbers (especially IKEA format like 702.758.14)
3. Barcodes or SKU numbers
4. Brand names

Return the extracted text as-is, preserving numbers and formatting. After the raw text, add a section "IDENTIFIED_NUMBERS:" listing any product/article numbers you found, one per line.`,
                },
                {
                  inlineData: {
                    mimeType: "image/jpeg",
                    data: image,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini OCR error:", errorText);
      return NextResponse.json(
        { error: "OCR extraction failed" },
        { status: 502 }
      );
    }

    const data = await response.json();
    const rawText =
      data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    // Extract article numbers from the OCR result
    const articleNumbers = extractArticleNumbers(rawText);

    // Also check the IDENTIFIED_NUMBERS section from Gemini
    const identifiedSection = rawText.split("IDENTIFIED_NUMBERS:")[1];
    if (identifiedSection) {
      const lines = identifiedSection.split("\n").filter((l: string) => l.trim());
      for (const line of lines) {
        const cleaned = line.replace(/^[\s\-*]+/, "").trim();
        if (cleaned && !articleNumbers.includes(cleaned)) {
          articleNumbers.push(cleaned);
        }
      }
    }

    // Clean raw text for display (remove the IDENTIFIED_NUMBERS section)
    const displayText = rawText.split("IDENTIFIED_NUMBERS:")[0].trim();

    return NextResponse.json({
      articleNumbers,
      rawText: displayText,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid image data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("OCR extract error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
