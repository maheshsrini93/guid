import type { Router } from "expo-router";

interface DeepLinkResult {
  route: string;
  params: Record<string, string>;
}

/**
 * Parse an incoming deep link URL and map it to an app route.
 *
 * Supports:
 * - Universal links: https://guid.how/products/12345
 * - Custom scheme: guid://products/12345
 * - Guide sub-routes: /products/12345/guide, /products/12345/chat
 * - Chat route: /chat
 */
export function parseDeepLink(url: string): DeepLinkResult | null {
  try {
    // Normalize: strip the custom scheme or https host
    let path: string;

    if (url.startsWith("guid://")) {
      path = url.replace("guid://", "/");
    } else {
      const parsed = new URL(url);
      if (parsed.hostname !== "guid.how") return null;
      path = parsed.pathname;
    }

    // Remove trailing slash
    path = path.replace(/\/$/, "") || "/";

    // /products/[articleNumber]/guide
    const guideMatch = path.match(/^\/products\/([^/]+)\/guide$/);
    if (guideMatch) {
      return {
        route: `/products/${guideMatch[1]}/guide`,
        params: { articleNumber: guideMatch[1] },
      };
    }

    // /products/[articleNumber]/chat
    const productChatMatch = path.match(/^\/products\/([^/]+)\/chat$/);
    if (productChatMatch) {
      return {
        route: `/products/${productChatMatch[1]}/chat`,
        params: { articleNumber: productChatMatch[1] },
      };
    }

    // /products/[articleNumber]
    const productMatch = path.match(/^\/products\/([^/]+)$/);
    if (productMatch) {
      return {
        route: `/products/${productMatch[1]}`,
        params: { articleNumber: productMatch[1] },
      };
    }

    // /chat
    if (path === "/chat") {
      return { route: "/(tabs)/chat", params: {} };
    }

    // /pricing → subscription modal
    if (path === "/pricing") {
      return { route: "/subscription", params: {} };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Parse a deep link URL and navigate to the appropriate screen.
 * Returns true if navigation occurred, false otherwise.
 */
export function handleDeepLink(url: string, router: Router): boolean {
  const result = parseDeepLink(url);
  if (!result) return false;

  router.push(result.route as never);
  return true;
}
