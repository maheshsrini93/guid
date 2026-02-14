# Phase 6 Critic Review

**Reviewer:** Critic Agent
**Date:** 2026-02-14
**Scope:** All mobile app files (`mobile/src/`), new backend routes (`src/app/api/`), Prisma schema additions, configuration files

---

## Summary

- **Total issues:** 19 (3 blocking, 9 important, 7 suggestions)
- **Overall assessment:** **GO_WITH_FIXES** -- the 3 blocking issues must be resolved before shipping. The mobile app is well-structured with strong patterns (theme system, offline storage, sync engine, proper SecureStore usage), but a few issues could cause crashes, security exposure, or data loss in production.

---

## BLOCKING Issues

**[B1] `/src/app/api/guides/progress/route.ts` (line 24): Guide progress stored in server-process-level `Map` -- data loss on every deployment**

The guide progress endpoint stores user progress in an in-memory `Map`:
```typescript
const progressStore = new Map<string, Record<string, number>>();
```
This means:
1. All progress is lost on every server restart, deployment, or cold start (common on Vercel)
2. In multi-instance environments, users get inconsistent progress depending on which instance handles their request
3. The extensive comment block (lines 12-23) acknowledges this is a placeholder but ships it anyway

**Fix:** Store progress in the database. Add a `guide_progress` JSON column on `SavedProduct` or create a dedicated `GuideProgress` table with `(userId, articleNumber, currentStep)`. This is a 10-minute migration.

---

**[B2] `/src/app/api/iap/verify/route.ts` (lines 38-49): IAP receipt verification is completely stubbed -- grants premium access to any caller**

The verify endpoint accepts any receipt string and immediately grants premium subscription:
```typescript
await prisma.user.update({
  where: { id: user.userId },
  data: {
    subscriptionTier: "premium",
    subscriptionSource: platform,
    subscriptionEndsAt: productId.includes("annual")
      ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  },
});
```
While the TODO comment acknowledges this, this is a **security vulnerability** if the app ships to production -- any authenticated user can call this endpoint with a fake receipt to get free premium access. The `productId.includes("annual")` check is also fragile (any string containing "annual" triggers a year-long subscription).

**Fix:** Either (a) implement actual Apple/Google receipt validation before granting access, or (b) add an environment guard that returns 503 in production when real validation is not configured, preventing exploitation.

---

**[B3] `/src/app/api/ocr/extract/route.ts`: No authentication or rate limiting -- exposes Gemini API quota to abuse**

The OCR endpoint accepts base64 images and forwards them to the Gemini API, but has no:
- Authentication check (`verifyMobileToken` is not called)
- Rate limiting
- Image size validation (only checks `min: 100` characters, but no max -- a user could send a massive base64 payload)

Any anonymous user can call this endpoint repeatedly, consuming Gemini API quota and potentially running up significant costs.

**Fix:** Add `verifyMobileToken` auth check, add `rateLimit` with a reasonable limit (e.g., 10 requests per minute per user), and add a maximum size check on the `image` field (e.g., `z.string().max(10_000_000)` for ~7.5MB images).

---

## IMPORTANT Issues

**[I1] `mobile/src/app/(tabs)/index.tsx` (line 52-53) + `mobile/src/services/products.ts` (lines 81-108): Home screen fetches from non-existent `/api/products` listing endpoint**

The home screen calls `getPopularProducts()` and `getProducts({ sort: 'newest', limit: '10' })`, which make requests to `/api/products?sort=rating-desc&limit=10` and `/api/products?sort=newest&limit=10`. However, no `/api/products` listing route exists in the backend -- only `/api/products/[articleNumber]` (single product), `/api/products/save`, and `/api/products/saved`. The home screen will silently fail and show empty sections.

**Fix:** Create an `/api/products/route.ts` with a `GET` handler that accepts `sort`, `limit`, and filter query params, or reuse the existing `/api/search/route.ts` endpoint.

---

**[I2] `mobile/src/app/products/[articleNumber].tsx` (line 49): Image field name mismatch between API response and mobile type**

The mobile `ProductDetail` interface expects images as `{ id: number; image_url: string; image_type: string | null }[]`, and templates access `data.images?.[0]?.image_url`. However, the backend API at `/api/products/[articleNumber]/route.ts` (line 14) selects `{ id: true, url: true, alt_text: true }` and returns `images` with the field `url`, not `image_url`. Similarly, `ImageGallery.tsx` (line 104) accesses `item.image_url`.

This means product images will never display -- `image_url` is always `undefined`.

**Fix:** Either (a) update the mobile types and component to use `url` and `alt_text` instead of `image_url` and `image_type`, or (b) remap the fields in the API response to match the mobile contract.

---

**[I3] `mobile/src/components/camera/ScanResult.tsx`, `OcrResult.tsx`, `ChatImagePicker.tsx`: Hardcoded light-mode colors in overlay cards -- broken in dark mode**

These components render bottom sheet cards with hardcoded white backgrounds and dark text colors:
- `ScanResult.tsx` line 111: `backgroundColor: "#ffffff"`, text colors `"#1c1917"`, `"#78716c"`
- `OcrResult.tsx` line 106: `backgroundColor: "#ffffff"`, text colors `"#1c1917"`, `"#78716c"`, `"#44403c"`
- `ChatImagePicker.tsx` line 166: `backgroundColor: "#f5f5f4"`, border `"#e7e5e4"`, text `"#44403c"`

In dark mode, these overlay cards will appear as bright white rectangles against a dark camera background, breaking the visual consistency and potentially causing readability issues.

**Fix:** Use `useTheme()` colors in these components: `colors.card` for backgrounds, `colors.foreground`/`colors.mutedForeground` for text, `colors.border` for borders.

---

**[I4] `mobile/src/app/(tabs)/_layout.tsx` (lines 14-17, 28-31): Tab bar uses hardcoded color constants instead of theme tokens**

The tab layout defines `AMBER_500`, `STONE_400`, `STONE_100`, `STONE_900` as constants and uses them for tab bar styling, plus additional hardcoded values like `"#78716c"`, `"#292524"`, `"#e7e5e4"`, `"#fafaf9"`. It also uses `useColorScheme()` directly instead of the app's `useTheme()` hook. This creates a divergence from the theme system: if the user toggles dark mode via the Settings screen (which updates `ThemeContext`), the tab bar won't update because it reads from `useColorScheme()` (system preference only).

**Fix:** Replace `useColorScheme()` with `useTheme()` and use `colors.primary`, `colors.mutedForeground`, `colors.background`, `colors.border` from the theme context.

---

**[I5] `mobile/src/app/(tabs)/search.tsx`: Search screen is a stub placeholder -- no theme tokens, no search functionality**

The search tab screen renders a static centered title with hardcoded styles and no actual search functionality. It uses RN `Text` directly instead of the themed `Text` component, meaning colors won't adapt to dark mode. Given that the Search tab is one of the 5 primary tabs, this creates a jarring UX gap.

**Fix:** At minimum, use the themed `Text` component and `useTheme()` for colors. Ideally, implement a search input that calls the existing `/api/search` endpoint.

---

**[I6] `mobile/src/lib/auth.ts` (line 52): JWT decoding uses `atob()` which is not available in all React Native runtimes**

The `decodeTokenPayload` function uses `atob()` for base64 decoding:
```typescript
const payload = JSON.parse(atob(parts[1]));
```
While `atob` is available in Hermes (the default RN engine) since recent versions, it may not handle non-ASCII characters correctly in JWT payloads. If a user's email or name contains accented characters, the decode could fail silently or produce garbled data.

**Fix:** Use a proper base64 decode that handles URL-safe base64 (JWTs use base64url encoding, which replaces `+` with `-` and `/` with `_`). Replace with:
```typescript
const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
const payload = JSON.parse(atob(base64));
```

---

**[I7] `mobile/src/hooks/useSyncEngine.ts` (line 45): Missing `drain` in dependency array**

The `useEffect` that monitors `isConnected` changes calls `drain()`, but `drain` is not included in the dependency array:
```typescript
useEffect(() => {
  const wasOffline = !wasConnectedRef.current;
  wasConnectedRef.current = isConnected;
  if (isConnected && wasOffline) {
    drain(); // drain not in deps
  }
}, [isConnected]); // missing drain
```
This violates the exhaustive-deps rule and could lead to stale closure issues where `drain` references an outdated `apiClient` or database state.

**Fix:** Add `drain` to the dependency array: `[isConnected, drain]`.

---

**[I8] `mobile/src/lib/mobile-auth.ts` (line 12-13): Hardcoded fallback JWT secrets in server-side code**

```typescript
const JWT_SECRET = process.env.JWT_SECRET ?? "dev-jwt-secret";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? "dev-jwt-refresh-secret";
```
If the environment variables are missing in production (misconfiguration), the app silently falls back to publicly known secrets. Any attacker could forge valid JWTs using `"dev-jwt-secret"`.

**Fix:** Throw an error at startup if `JWT_SECRET` or `JWT_REFRESH_SECRET` is not set when `NODE_ENV === "production"`. For example:
```typescript
const JWT_SECRET = process.env.JWT_SECRET ?? (process.env.NODE_ENV === "production" ? (() => { throw new Error("JWT_SECRET required"); })() : "dev-jwt-secret");
```

---

**[I9] `mobile/src/app/+not-found.tsx`, `mobile/src/app/(tabs)/search.tsx`: Missing dark mode support -- no theme tokens used**

Both screens use raw `Text` from `react-native` with hardcoded colors or no color specification, making text invisible or unreadable in dark mode. The not-found screen has `color: "#f59e0b"` for the link text but no color for the title, so the title inherits the system default (black on light, which is fine, but may be black on dark mode too).

**Fix:** Use the themed `Text` component from `../../components/ui/Text` and `useTheme()` for `backgroundColor`.

---

## SUGGESTIONS

**[S1] `mobile/src/app/products/[articleNumber].tsx` (line 129): Unsafe cast `as unknown as ProductDetail` indicates type mismatch**

The product detail screen casts the API response: `const data = await getProduct(articleNumber) as unknown as ProductDetail;`. This double cast (`as unknown as`) is a code smell suggesting the actual API response type doesn't match `ProductDetail`. Combined with I2 (image field mismatch), this confirms the types are divergent.

**Fix:** Align the `ProductDetail` type in `services/products.ts` with the actual API response shape. Remove the unsafe cast.

---

**[S2] `mobile/src/app/(tabs)/camera.tsx` (line 13): Imports `API_URL` from config but only uses it for direct `fetch` calls**

The camera screen makes raw `fetch` calls to `${API_URL}/api/search` and `${API_URL}/api/ocr/extract` instead of using the `apiClient` from `lib/api-client.ts`. This bypasses the automatic token refresh, timeout handling, and error normalization that `apiClient` provides.

**Fix:** Refactor to use `apiClient.get()` and `apiClient.post()`, or the existing service functions from `services/ocr.ts` and `services/products.ts`.

---

**[S3] `mobile/src/services/auth.ts` (line 41): `getCurrentUser()` calls a non-existent `/api/auth/mobile/me` endpoint**

The auth service exports a `getCurrentUser()` function that calls `/api/auth/mobile/me`, but no such route exists in the backend. This function would always fail with a 404.

**Fix:** Either create the endpoint or remove the dead function.

---

**[S4] `mobile/src/services/subscription.ts`: All three endpoint paths (`/api/subscription/plans`, `/api/subscription/verify-receipt`, `/api/subscription/restore`) are non-existent**

The subscription service file references endpoints that don't exist. The actual IAP endpoints are at `/api/iap/verify` and `/api/iap/restore`. This service file appears unused (the `UpgradeScreen` component uses `lib/iap.ts` directly with the correct paths), but could cause confusion.

**Fix:** Either update the paths to match the real endpoints or remove this unused service file.

---

**[S5] `mobile/src/lib/sync-engine.ts` (lines 29-31): `save_product` and `unsave_product` actions map to the same endpoint**

Both `save_product` and `unsave_product` action processors call `apiClient.post("/api/products/save")` with the same payload. While the backend toggle behavior (save if not saved, unsave if saved) makes this technically work for immediate calls, in an offline queue scenario, replaying a sequence of `save` then `unsave` for the same product would result in the final state depending on the toggle count parity, which may not match user intent.

**Fix:** Consider adding a `saved: true/false` field to the payload to make the actions idempotent regardless of replay order.

---

**[S6] `public/.well-known/apple-app-site-association` (line 6): Placeholder `TEAMID` in appID**

The Apple App Site Association file contains `"appID": "TEAMID.how.guid.app"` with a literal `TEAMID` placeholder. Universal links will not work on iOS until this is replaced with the actual Apple Developer Team ID.

**Fix:** Replace `TEAMID` with the real Apple Developer Team ID before shipping. Similarly, `assetlinks.json` has `PLACEHOLDER_SHA256` that needs the real certificate fingerprint for Android App Links.

---

**[S7] `mobile/src/components/guide/StepCard.tsx` (line 12): `GestureDetector` from `react-native-gesture-handler` requires `GestureHandlerRootView` wrapper**

The `StepCard` uses `GestureDetector` with `Gesture.Pinch()` for pinch-to-zoom on images. Similarly, `ImageGallery.tsx` uses the same pattern. However, the root layout (`_layout.tsx`) does not wrap the app in `GestureHandlerRootView`. While Expo Router may set this up automatically in newer versions, if it doesn't, gestures will silently fail (no crash, but pinch-to-zoom won't work).

**Fix:** Verify that Expo Router v6 with SDK 54 includes `GestureHandlerRootView` automatically. If not, wrap the root layout in `<GestureHandlerRootView style={{ flex: 1 }}>`.

---

## Positive Observations

1. **Excellent token management:** The auth system properly uses `expo-secure-store` for JWT storage, implements automatic token refresh with schedule-ahead-of-expiry, and the `api-client.ts` transparently handles 401 responses with retry. This is production-quality auth handling.

2. **Well-designed offline architecture:** The SQLite-based offline system (database.ts, offline-storage.ts, sync-engine.ts) is thoughtfully designed with LRU eviction, queue size limits, exponential backoff retries, and proper cleanup. The separation of concerns between database schema, storage operations, and sync orchestration is clean.

3. **Comprehensive theme system:** The `ThemeContext` with persisted preference, full color token set matching the web app, and typed `ColorTokens` interface provides consistent theming across the app. Most components properly use theme tokens.

4. **Solid accessibility:** Nearly every interactive element has `accessibilityRole` and `accessibilityLabel` props. The intake chips use `radiogroup` semantics, the chat uses proper `text` roles for messages, and touch targets consistently meet 44px minimums. This is above-average for a Phase 1 mobile app.

5. **Clean API layer:** The backend routes follow a consistent pattern: Zod validation, proper HTTP status codes, typed error responses. The auth routes include rate limiting. The mobile `api-client.ts` adds timeout support, automatic auth header injection, and clean error normalization.

6. **Proper cleanup patterns:** All `useEffect` hooks that set up subscriptions or timers include proper cleanup functions (notification listeners, refresh timers, cancelled flags on async operations).

7. **Design system parity:** The mobile theme tokens (colors, spacing, typography, shadows) are faithfully ported from the web app's design system, ensuring visual consistency across platforms.
