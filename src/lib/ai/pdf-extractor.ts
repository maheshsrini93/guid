import type { ExtractedPdfPage, PdfExtractionResult } from "./types";

// pdfjs-dist and canvas are dynamically imported to avoid issues
// with Next.js bundling (they're server-only, native dependencies)

interface CanvasAndContext {
  canvas: import("canvas").Canvas;
  context: import("canvas").CanvasRenderingContext2D;
}

class NodeCanvasFactory {
  private Canvas: typeof import("canvas");

  constructor(Canvas: typeof import("canvas")) {
    this.Canvas = Canvas;
  }

  create(width: number, height: number): CanvasAndContext {
    const canvas = this.Canvas.createCanvas(width, height);
    const context = canvas.getContext("2d");
    return { canvas, context };
  }

  reset(canvasAndContext: CanvasAndContext, width: number, height: number) {
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }

  destroy(canvasAndContext: CanvasAndContext) {
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
  }
}

/** Default scale factor for rendering PDF pages to images (2x for good quality) */
const DEFAULT_SCALE = 2;

/**
 * Fetch a PDF from a URL and return it as a Uint8Array.
 */
async function fetchPdf(url: string): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch PDF from ${url}: ${response.status} ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

/**
 * Extract all pages from a PDF as PNG images.
 *
 * @param pdfUrl - URL of the PDF to extract pages from
 * @param scale - Render scale factor (default 2x for high quality vision analysis)
 * @returns Array of extracted pages with image buffers
 */
export async function extractPdfPages(
  pdfUrl: string,
  scale: number = DEFAULT_SCALE
): Promise<PdfExtractionResult> {
  // Dynamic imports for server-only dependencies
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const Canvas = await import("canvas");

  const canvasFactory = new NodeCanvasFactory(Canvas);

  // Fetch and load the PDF
  const pdfData = await fetchPdf(pdfUrl);
  const loadingTask = pdfjsLib.getDocument({
    data: pdfData,
    useSystemFonts: true,
  });
  const pdfDocument = await loadingTask.promise;
  const totalPages = pdfDocument.numPages;

  const pages: ExtractedPdfPage[] = [];

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page = await pdfDocument.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    const canvasAndContext = canvasFactory.create(
      Math.floor(viewport.width),
      Math.floor(viewport.height)
    );

    // canvasFactory is a valid runtime option but missing from pdfjs-dist types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (page.render as any)({
      canvasContext: canvasAndContext.context,
      viewport,
      canvasFactory,
    }).promise;

    const pngBuffer = canvasAndContext.canvas.toBuffer("image/png");

    pages.push({
      pageNumber: pageNum,
      imageBuffer: pngBuffer,
      width: Math.floor(viewport.width),
      height: Math.floor(viewport.height),
      mimeType: "image/png",
    });

    canvasFactory.destroy(canvasAndContext);
  }

  await pdfDocument.destroy();

  return {
    pages,
    totalPages,
    pdfUrl,
  };
}

/**
 * Extract a single page from a PDF as a PNG image.
 * Useful for testing or processing one page at a time.
 */
export async function extractSinglePage(
  pdfUrl: string,
  pageNumber: number,
  scale: number = DEFAULT_SCALE
): Promise<ExtractedPdfPage> {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const Canvas = await import("canvas");

  const canvasFactory = new NodeCanvasFactory(Canvas);

  const pdfData = await fetchPdf(pdfUrl);
  const loadingTask = pdfjsLib.getDocument({
    data: pdfData,
    useSystemFonts: true,
  });
  const pdfDocument = await loadingTask.promise;

  if (pageNumber < 1 || pageNumber > pdfDocument.numPages) {
    await pdfDocument.destroy();
    throw new Error(
      `Page ${pageNumber} out of range (PDF has ${pdfDocument.numPages} pages)`
    );
  }

  const page = await pdfDocument.getPage(pageNumber);
  const viewport = page.getViewport({ scale });

  const canvasAndContext = canvasFactory.create(
    Math.floor(viewport.width),
    Math.floor(viewport.height)
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (page.render as any)({
    canvasContext: canvasAndContext.context,
    viewport,
    canvasFactory,
  }).promise;

  const pngBuffer = canvasAndContext.canvas.toBuffer("image/png");

  const result: ExtractedPdfPage = {
    pageNumber,
    imageBuffer: pngBuffer,
    width: Math.floor(viewport.width),
    height: Math.floor(viewport.height),
    mimeType: "image/png",
  };

  canvasFactory.destroy(canvasAndContext);
  await pdfDocument.destroy();

  return result;
}

/**
 * Get the page count of a PDF without extracting any pages.
 * Useful for progress tracking and validation.
 */
export async function getPdfPageCount(pdfUrl: string): Promise<number> {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const pdfData = await fetchPdf(pdfUrl);
  const loadingTask = pdfjsLib.getDocument({ data: pdfData });
  const pdfDocument = await loadingTask.promise;
  const count = pdfDocument.numPages;
  await pdfDocument.destroy();
  return count;
}
