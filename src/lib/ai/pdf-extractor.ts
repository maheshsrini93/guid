import type { ExtractedPdfPage, PdfExtractionResult } from "./types";
import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const execFileAsync = promisify(execFile);

/**
 * Default scale factor for rendering PDF pages to images.
 * pdftoppm uses DPI: 72 DPI = 1x, 144 DPI = 2x, 300 DPI ≈ 4.2x.
 */
const DEFAULT_DPI = 200; // ~2.8x — good balance of quality and size

/**
 * Fetch a PDF from a URL and save to a temp file.
 * Returns the temp file path (caller must clean up).
 */
async function fetchPdfToTempFile(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch PDF from ${url}: ${response.status} ${response.statusText}`
    );
  }
  const arrayBuffer = await response.arrayBuffer();
  const tempDir = os.tmpdir();
  const tempPath = path.join(tempDir, `guid-pdf-${Date.now()}.pdf`);
  fs.writeFileSync(tempPath, Buffer.from(arrayBuffer));
  return tempPath;
}

/**
 * Extract all pages from a PDF as PNG images using pdftoppm (poppler).
 *
 * @param pdfUrl - URL of the PDF to extract pages from
 * @param dpi - Render DPI (default 200 for high quality vision analysis)
 * @returns Array of extracted pages with image buffers
 */
export async function extractPdfPages(
  pdfUrl: string,
  dpi: number = DEFAULT_DPI
): Promise<PdfExtractionResult> {
  const tempPdf = await fetchPdfToTempFile(pdfUrl);
  const tempOutPrefix = path.join(os.tmpdir(), `guid-page-${Date.now()}`);

  try {
    // Use pdftoppm to render all pages as PNG
    await execFileAsync("pdftoppm", [
      "-png",
      "-r",
      String(dpi),
      tempPdf,
      tempOutPrefix,
    ]);

    // pdftoppm creates files like: prefix-01.png, prefix-02.png, etc.
    const dir = path.dirname(tempOutPrefix);
    const prefix = path.basename(tempOutPrefix);
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.startsWith(prefix) && f.endsWith(".png"))
      .sort();

    const pages: ExtractedPdfPage[] = [];
    for (let i = 0; i < files.length; i++) {
      const filePath = path.join(dir, files[i]);
      const imageBuffer = fs.readFileSync(filePath);

      // Get image dimensions from PNG header (bytes 16-23)
      const width = imageBuffer.readUInt32BE(16);
      const height = imageBuffer.readUInt32BE(20);

      pages.push({
        pageNumber: i + 1,
        imageBuffer,
        width,
        height,
        mimeType: "image/png",
      });

      // Clean up page file
      fs.unlinkSync(filePath);
    }

    return {
      pages,
      totalPages: pages.length,
      pdfUrl,
    };
  } finally {
    // Clean up temp PDF
    if (fs.existsSync(tempPdf)) fs.unlinkSync(tempPdf);
  }
}

/**
 * Extract a single page from a PDF as a PNG image.
 * Useful for testing or processing one page at a time.
 */
export async function extractSinglePage(
  pdfUrl: string,
  pageNumber: number,
  dpi: number = DEFAULT_DPI
): Promise<ExtractedPdfPage> {
  const tempPdf = await fetchPdfToTempFile(pdfUrl);
  const tempOutPrefix = path.join(os.tmpdir(), `guid-page-${Date.now()}`);

  try {
    // pdftoppm -f N -l N renders only page N
    await execFileAsync("pdftoppm", [
      "-png",
      "-r",
      String(dpi),
      "-f",
      String(pageNumber),
      "-l",
      String(pageNumber),
      tempPdf,
      tempOutPrefix,
    ]);

    // Find the output file
    const dir = path.dirname(tempOutPrefix);
    const prefix = path.basename(tempOutPrefix);
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.startsWith(prefix) && f.endsWith(".png"));

    if (files.length === 0) {
      throw new Error(
        `pdftoppm produced no output for page ${pageNumber}. PDF may have fewer pages.`
      );
    }

    const filePath = path.join(dir, files[0]);
    const imageBuffer = fs.readFileSync(filePath);

    // Get image dimensions from PNG header
    const width = imageBuffer.readUInt32BE(16);
    const height = imageBuffer.readUInt32BE(20);

    fs.unlinkSync(filePath);

    return {
      pageNumber,
      imageBuffer,
      width,
      height,
      mimeType: "image/png",
    };
  } finally {
    if (fs.existsSync(tempPdf)) fs.unlinkSync(tempPdf);
  }
}

/**
 * Get the page count of a PDF without rendering any pages.
 * Uses pdfinfo (part of poppler) for speed.
 */
export async function getPdfPageCount(pdfUrl: string): Promise<number> {
  const tempPdf = await fetchPdfToTempFile(pdfUrl);

  try {
    const { stdout } = await execFileAsync("pdfinfo", [tempPdf]);
    const match = stdout.match(/Pages:\s+(\d+)/);
    if (!match) {
      throw new Error("Could not extract page count from pdfinfo output");
    }
    return parseInt(match[1], 10);
  } finally {
    if (fs.existsSync(tempPdf)) fs.unlinkSync(tempPdf);
  }
}
