import { prisma } from "@/lib/prisma";
import { getFormattedDocumentContext } from "./document-context";

/**
 * Compiled product context block for chat system prompt injection.
 * Contains everything the AI needs to know about a product.
 */
export interface ProductContext {
  productId: number;
  articleNumber: string;
  contextText: string;
  hasGuide: boolean;
  hasDocuments: boolean;
}

/**
 * Given a product ID, compile all available product information into
 * a structured context block for the troubleshooting assistant.
 *
 * Includes: metadata, dimensions, materials, care instructions,
 * assembly guide steps (if published), document text chunks, and reviews.
 */
export async function assembleProductContext(
  productId: number
): Promise<ProductContext | null> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      article_number: true,
      product_name: true,
      product_type: true,
      description: true,
      color: true,
      materials: true,
      care_instructions: true,
      important_notes: true,
      good_to_know: true,
      assembly_required: true,
      product_width: true,
      product_height: true,
      product_depth: true,
      product_length: true,
      product_weight: true,
      key_facts: true,
      highlighted_reviews: true,
      category_path: true,
      source_retailer: true,
      discontinued: true,
      assemblyGuide: {
        select: {
          title: true,
          difficulty: true,
          timeMinutes: true,
          tools: true,
          published: true,
          steps: {
            orderBy: { stepNumber: "asc" },
            select: {
              stepNumber: true,
              title: true,
              instruction: true,
              tip: true,
            },
          },
        },
      },
      documents: {
        select: { id: true, document_type: true },
      },
    },
  });

  if (!product) return null;

  const sections: string[] = [];

  // Product identity
  sections.push("=== PRODUCT INFORMATION ===");
  sections.push(`Name: ${product.product_name ?? "Unknown"}`);
  sections.push(`Article Number: ${product.article_number}`);
  if (product.product_type) sections.push(`Type: ${product.product_type}`);
  if (product.category_path) sections.push(`Category: ${product.category_path}`);
  if (product.color) sections.push(`Color: ${product.color}`);
  if (product.source_retailer) sections.push(`Retailer: ${product.source_retailer}`);
  if (product.discontinued) sections.push("STATUS: This product has been DISCONTINUED.");

  // Description
  if (product.description) {
    sections.push(`\nDescription: ${product.description}`);
  }

  // Dimensions
  const dims = [
    product.product_width && `Width: ${product.product_width}`,
    product.product_height && `Height: ${product.product_height}`,
    product.product_depth && `Depth: ${product.product_depth}`,
    product.product_length && `Length: ${product.product_length}`,
    product.product_weight && `Weight: ${product.product_weight}`,
  ].filter(Boolean);
  if (dims.length > 0) {
    sections.push(`\n--- Dimensions ---\n${dims.join("\n")}`);
  }

  // Materials and care
  if (product.materials) {
    sections.push(`\n--- Materials ---\n${product.materials}`);
  }
  if (product.care_instructions) {
    sections.push(`\n--- Care Instructions ---\n${product.care_instructions}`);
  }
  if (product.important_notes) {
    sections.push(`\n--- Important Notes ---\n${product.important_notes}`);
  }
  if (product.good_to_know) {
    sections.push(`\n--- Good to Know ---\n${product.good_to_know}`);
  }

  // Key facts (JSON)
  if (product.key_facts) {
    try {
      const facts = JSON.parse(JSON.stringify(product.key_facts));
      if (Array.isArray(facts) && facts.length > 0) {
        sections.push(`\n--- Key Facts ---\n${facts.join("\n")}`);
      }
    } catch {
      // Skip malformed key_facts
    }
  }

  // Assembly guide steps
  const guide = product.assemblyGuide;
  const hasGuide = !!guide?.published && guide.steps.length > 0;

  if (hasGuide) {
    sections.push("\n=== ASSEMBLY GUIDE ===");
    sections.push(`Title: ${guide.title}`);
    if (guide.difficulty) sections.push(`Difficulty: ${guide.difficulty}`);
    if (guide.timeMinutes) sections.push(`Estimated Time: ${guide.timeMinutes} minutes`);
    if (guide.tools) sections.push(`Tools Needed: ${guide.tools}`);
    sections.push("");

    for (const step of guide.steps) {
      sections.push(`Step ${step.stepNumber}: ${step.title}`);
      sections.push(step.instruction);
      if (step.tip) sections.push(`TIP: ${step.tip}`);
      sections.push("");
    }
  } else if (product.assembly_required) {
    sections.push("\n--- Assembly ---");
    sections.push("This product requires assembly. No detailed guide is available yet.");
  }

  // Highlighted reviews (for common issues)
  if (product.highlighted_reviews) {
    try {
      const reviews = JSON.parse(JSON.stringify(product.highlighted_reviews));
      if (Array.isArray(reviews) && reviews.length > 0) {
        sections.push("\n=== CUSTOMER REVIEWS (for common issues) ===");
        for (const review of reviews.slice(0, 5)) {
          const title = review.title || review.heading || "";
          const text = review.text || review.body || review.content || "";
          const rating = review.rating || review.score || "";
          if (text) {
            sections.push(`[${rating}/5] ${title ? title + ": " : ""}${text}`);
          }
        }
      }
    } catch {
      // Skip malformed reviews
    }
  }

  // Document text context (RAG chunks)
  const hasDocuments = product.documents.length > 0;
  if (hasDocuments) {
    const docContext = await getFormattedDocumentContext(productId, 10000);
    if (docContext) {
      sections.push(`\n=== PRODUCT DOCUMENTS ===\n${docContext}`);
    }
  }

  return {
    productId: product.id,
    articleNumber: product.article_number,
    contextText: sections.join("\n"),
    hasGuide,
    hasDocuments,
  };
}
