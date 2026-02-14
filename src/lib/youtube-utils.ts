/**
 * YouTube URL parsing utilities.
 * Shared between client components and server actions.
 */

const YOUTUBE_VIDEO_PATTERNS = [
  /youtube\.com\/watch\?v=([\w-]{11})/,
  /youtu\.be\/([\w-]{11})/,
  /youtube\.com\/embed\/([\w-]{11})/,
  /youtube\.com\/shorts\/([\w-]{11})/,
];

export function extractVideoId(url: string): string | null {
  for (const pattern of YOUTUBE_VIDEO_PATTERNS) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}
