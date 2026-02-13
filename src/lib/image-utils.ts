/**
 * Validates that a URL is an absolute http(s) URL safe for next/image.
 *
 * Some product images in the database have relative paths (e.g. "images-us/foo.jpg")
 * instead of absolute URLs. next/image requires either a leading "/" or a full URL.
 */
export function isValidImageUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
