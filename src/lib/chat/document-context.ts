import { prisma } from "@/lib/prisma";

/**
 * A chunk of text extracted from a product document, with metadata
 * indicating its source document and position for RAG retrieval.
 */
export interface DocumentChunk {
  documentId: number;
  documentType: string;
  sourceUrl: string;
  pageNumber: number;
  content: string;
  charCount: number;
}

/**
 * Result of extracting context from all of a product's documents.
 */
export interface DocumentContextResult {
  productId: number;
  chunks: DocumentChunk[];
  totalChunks: number;
  totalCharacters: number;
  documentsProcessed: number;
  documentsFailed: number;
  errors: string[];
}

const MAX_CHUNK_CHARS = 2000;
const OVERLAP_CHARS = 200;

/**
 * Extract text from a PDF at the given URL using pdfjs-dist.
 * Returns an array of { pageNumber, text } objects.
 */
async function extractTextFromPdf(
  url: string
): Promise<{ pageNumber: number; text: string }[]> {
  // Dynamic import for ESM-only pdfjs-dist v5
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);

  const loadingTask = pdfjsLib.getDocument({ data, useSystemFonts: true });
  const pdf = await loadingTask.promise;

  const pages: { pageNumber: number; text: string }[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();

    // textContent.items contains text items with str and transform info.
    // Concatenate with spaces, using newlines between vertically separated items.
    let lastY: number | null = null;
    const parts: string[] = [];

    for (const item of textContent.items) {
      if (!("str" in item) || !item.str) continue;
      const y = "transform" in item ? (item.transform as number[])[5] : null;

      if (lastY !== null && y !== null && Math.abs(y - lastY) > 5) {
        parts.push("\n");
      } else if (parts.length > 0) {
        parts.push(" ");
      }

      parts.push(item.str);
      if (y !== null) lastY = y;
    }

    const text = parts.join("").trim();
    if (text.length > 0) {
      pages.push({ pageNumber: i, text });
    }
  }

  return pages;
}

/**
 * Split a long text string into overlapping chunks.
 * Attempts to break at sentence or paragraph boundaries.
 */
function splitIntoChunks(text: string, maxChars: number, overlap: number): string[] {
  if (text.length <= maxChars) {
    return [text];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + maxChars, text.length);

    // If not at the end, try to break at a sentence or paragraph boundary
    if (end < text.length) {
      const slice = text.slice(start, end);
      // Look for the last paragraph break, period+space, or newline
      const lastParagraph = slice.lastIndexOf("\n\n");
      const lastSentence = slice.lastIndexOf(". ");
      const lastNewline = slice.lastIndexOf("\n");

      const breakPoint = Math.max(lastParagraph, lastSentence, lastNewline);
      if (breakPoint > maxChars * 0.3) {
        // Only use the break point if it's not too early in the chunk
        end = start + breakPoint + 1;
      }
    }

    chunks.push(text.slice(start, end).trim());

    // Move start forward, minus overlap for context continuity
    start = end - overlap;
    if (start >= text.length) break;
  }

  return chunks.filter((c) => c.length > 0);
}

/**
 * Extract text chunks from all documents belonging to a product.
 * Used to build RAG context for the troubleshooting chat.
 *
 * @param productId - The product's database ID
 * @returns Structured chunks ready for context injection into chat prompts
 */
export async function extractDocumentContext(
  productId: number
): Promise<DocumentContextResult> {
  const documents = await prisma.productDocument.findMany({
    where: { product_id: productId },
    select: {
      id: true,
      document_type: true,
      source_url: true,
    },
  });

  const result: DocumentContextResult = {
    productId,
    chunks: [],
    totalChunks: 0,
    totalCharacters: 0,
    documentsProcessed: 0,
    documentsFailed: 0,
    errors: [],
  };

  for (const doc of documents) {
    try {
      // Only process PDF documents (source_url ending in .pdf or containing pdf)
      if (!doc.source_url.toLowerCase().includes("pdf")) {
        continue;
      }

      const pages = await extractTextFromPdf(doc.source_url);

      for (const page of pages) {
        const chunks = splitIntoChunks(page.text, MAX_CHUNK_CHARS, OVERLAP_CHARS);

        for (const chunkText of chunks) {
          result.chunks.push({
            documentId: doc.id,
            documentType: doc.document_type,
            sourceUrl: doc.source_url,
            pageNumber: page.pageNumber,
            content: chunkText,
            charCount: chunkText.length,
          });
        }
      }

      result.documentsProcessed++;
    } catch (error) {
      result.documentsFailed++;
      result.errors.push(
        `Document ${doc.id} (${doc.document_type}): ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  result.totalChunks = result.chunks.length;
  result.totalCharacters = result.chunks.reduce((sum, c) => sum + c.charCount, 0);

  return result;
}

/**
 * Extract document context and format it as a single text block
 * suitable for injection into a chat system prompt.
 *
 * Groups chunks by document type (assembly, care, etc.) with headers.
 * Truncates to maxTotalChars to fit within model context limits.
 */
export async function getFormattedDocumentContext(
  productId: number,
  maxTotalChars: number = 15000
): Promise<string> {
  const result = await extractDocumentContext(productId);

  if (result.chunks.length === 0) {
    return "";
  }

  // Group chunks by document type
  const grouped = new Map<string, DocumentChunk[]>();
  for (const chunk of result.chunks) {
    const existing = grouped.get(chunk.documentType) || [];
    existing.push(chunk);
    grouped.set(chunk.documentType, existing);
  }

  const sections: string[] = [];
  let currentChars = 0;

  // Prioritize document types: assembly first, then care, then others
  const typeOrder = ["assembly", "care"];
  const sortedTypes = [...grouped.keys()].sort((a, b) => {
    const aIdx = typeOrder.indexOf(a);
    const bIdx = typeOrder.indexOf(b);
    if (aIdx === -1 && bIdx === -1) return a.localeCompare(b);
    if (aIdx === -1) return 1;
    if (bIdx === -1) return -1;
    return aIdx - bIdx;
  });

  for (const docType of sortedTypes) {
    const chunks = grouped.get(docType)!;
    const header = `--- ${docType.toUpperCase()} DOCUMENT ---`;
    const headerLen = header.length + 2; // +2 for newlines

    if (currentChars + headerLen >= maxTotalChars) break;

    sections.push(header);
    currentChars += headerLen;

    for (const chunk of chunks) {
      const entry = `[Page ${chunk.pageNumber}]\n${chunk.content}`;
      if (currentChars + entry.length + 2 > maxTotalChars) break;
      sections.push(entry);
      currentChars += entry.length + 2;
    }
  }

  return sections.join("\n\n");
}
