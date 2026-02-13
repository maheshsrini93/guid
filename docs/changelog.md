# Changelog — Guid Project Docs

All notable changes to the project documentation (`docs/`) are logged here. Newest entries first.

## Overview

| # | Date | Change | Phase | Docs Affected |
|---|------|--------|-------|---------------|
| 112 | 2026-02-13 | Phase 3 critic review fixes (round 2): dark mode, a11y, error handling, security hardening across P3.4 smart features and P3.5 tiering code | 3 | escalation-card.tsx, maintenance-prompt.tsx, guide-suggestion.tsx, upgrade-prompt.tsx, intent-detection.ts, route.ts, escalate/route.ts, tasks |
| 111 | 2026-02-13 | P3.5.3: Build upgrade prompt modal — created `src/components/chat/upgrade-prompt.tsx` modal component with Sparkles icon header, 4 value props (unlimited chats, priority AI, photo diagnosis, advanced troubleshooting), "View Plans" link to `/pricing` placeholder, "Maybe later" dismiss; backdrop click to close, `aria-modal`, `aria-labelledby`; integrated into `chat-panel.tsx` with `limitReached` prop + `upgradePromptDismissed` state; wired `limitReached` from `use-chat.ts` through `product-chat-widget.tsx` and `chat-page-client.tsx`; also fixed pre-existing build error: replaced `ssr: false` with `loading: () => null` in `products/[articleNumber]/page.tsx` (Turbopack Server Component constraint) | 3 | src/components/chat/upgrade-prompt.tsx, src/components/chat/chat-panel.tsx, src/components/chat/product-chat-widget.tsx, src/app/chat/chat-page-client.tsx, src/app/products/[articleNumber]/page.tsx, tasks |
| 110 | 2026-02-13 | P3.5.2: Track chat usage per billing period — added Chat Usage card to `/profile` page with progress bar (sessions used/limit, color-coded red at limit, aria-label); added aggregate chat stats to `/studio` dashboard (total sessions, monthly sessions, total messages); reuses `getChatUsage()` from chat-limits.ts for profile; Prisma count queries for studio | 3 | src/app/profile/page.tsx, src/app/studio/page.tsx, tasks |
| 109 | 2026-02-13 | P3.5.1: Free tier chat limit — created `src/lib/chat/chat-limits.ts` with `FREE_TIER_MONTHLY_LIMIT = 3`, `getChatUsage()` counting ChatSessions per calendar month by userId, `canUserStartChat()` helper; created `src/app/api/chat/usage/route.ts` GET endpoint returning `ChatUsageResult`; enforced limit in `/api/chat/route.ts` before session creation (returns 403 with `code: "LIMIT_REACHED"` when exhausted, anonymous users exempt); created `src/components/chat/use-chat-usage.ts` hook for client-side usage fetching; added `limitReached` state to `use-chat.ts` (detects `LIMIT_REACHED` error code); added `chatsRemaining` prop to `chat-header.tsx` with badge (shows "X left" or "Limit reached"); wired usage into `chat-panel.tsx` via `useChatUsage` hook | 3 | src/lib/chat/chat-limits.ts, src/app/api/chat/usage/route.ts, src/app/api/chat/route.ts, src/components/chat/use-chat.ts, src/components/chat/use-chat-usage.ts, src/components/chat/chat-header.tsx, src/components/chat/chat-panel.tsx, tasks |
| 108 | 2026-02-13 | P3.4.4: Maintenance reminders — created `src/lib/maintenance-reminders.ts` with localStorage-based reminder storage (future Phase 4 migration to DB + push); `MaintenanceReminder` type with productId, intervalDays, nextDueAt, maintenanceType; CRUD helpers: `getReminders()`, `saveReminder()`, `removeReminder()`, `hasReminder()`, `getDueReminders()`; preset intervals (30/90/180/365 days); created `src/components/chat/maintenance-prompt.tsx` component with interval chip selector, save/dismiss buttons, saved confirmation state; integrated into `chat-panel.tsx` after escalation card (shown when product known + 4+ messages, dismissible) | 3 | src/lib/maintenance-reminders.ts, src/components/chat/maintenance-prompt.tsx, src/components/chat/chat-panel.tsx, tasks |
| 107 | 2026-02-13 | P3.4.3: Escalation flow — created `src/lib/chat/escalation-summary.ts` with `buildEscalationSummary()` function; extracts problem description from first 1-2 user messages, parses numbered troubleshooting steps from assistant messages, detects photo attachments, formats as structured support request with product info, problem, steps tried, and photo note; created `src/app/api/chat/escalate/route.ts` POST endpoint with session ownership verification and Zod validation; created `src/components/chat/escalation-card.tsx` client component with three states (trigger button, loading, summary ready) offering copy-to-clipboard and mailto: email draft; collapsible `<details>` preview of formatted text; integrated into `chat-panel.tsx` (shown after 4+ messages when sessionId available); wired `sessionId` through `product-chat-widget.tsx` and `chat-page-client.tsx` | 3 | src/lib/chat/escalation-summary.ts, src/app/api/chat/escalate/route.ts, src/components/chat/escalation-card.tsx, src/components/chat/chat-panel.tsx, src/components/chat/product-chat-widget.tsx, src/app/chat/chat-page-client.tsx, src/components/chat/index.ts, tasks |
| 106 | 2026-02-13 | P3.4.1: Part identification from photos — created `src/lib/chat/part-identification.ts` with `buildPartIdentificationContext()` function; injects "Part Identification Mode" instructions into system prompt when image is attached; includes common furniture hardware reference (cam locks, dowels, bolts, hinges, shelf pins, etc.); extracts product-specific part references from assembly guide steps via regex matching; enhanced `system-prompt.ts` with `hasImage` option that conditionally loads part ID context; updated `/api/chat/route.ts` to pass `hasImage: !!imageBase64` to prompt builder; also enhanced `message-bubble.tsx` with lightweight markdown renderer (`renderSimpleMarkdown`) for assistant messages — handles **bold**, bullet lists, numbered lists, and paragraph breaks using `useMemo` for performance | 3 | src/lib/chat/part-identification.ts, src/lib/chat/system-prompt.ts, src/app/api/chat/route.ts, src/components/chat/message-bubble.tsx, tasks |
| 105 | 2026-02-13 | P3.4.2: Intent detection — created `src/lib/chat/intent-detection.ts` with `detectIntent()` function; hybrid keyword-based classification distinguishing assembly intent (assemble, build, put together, setup, instructions, steps) from troubleshooting intent (broke, wobble, stuck, loose, fix, repair, noise, crack); looks up published guides for the product via Prisma; emits `intent` SSE event from `/api/chat/route.ts` on first message when assembly intent detected with existing guide; client-side: added `guideRedirect` state and `case "intent"` handler in `use-chat.ts`; created `guide-suggestion.tsx` banner component with "View Guide" link and "Continue chatting" dismiss; wired into `chat-panel.tsx` and `product-chat-widget.tsx`; also wired into standalone `/chat` page (`chat-page-client.tsx`) | 3 | src/lib/chat/intent-detection.ts, src/app/api/chat/route.ts, src/components/chat/use-chat.ts, src/components/chat/guide-suggestion.tsx, src/components/chat/chat-panel.tsx, src/components/chat/product-chat-widget.tsx, src/app/chat/chat-page-client.tsx, src/components/chat/index.ts, tasks |
| 104 | 2026-02-13 | Critic review fixes for chat backend — B1 BLOCKING: moved Gemini API key from URL query string `?key=` to `x-goog-api-key` request header (prevents key leaking in server/proxy/CDN logs); B2 BLOCKING: added session ownership verification — when continuing a chat session, verify `existing.userId` matches requesting user, return 403 if mismatch (prevents session hijacking, allows anonymous null-to-null sessions); B3 BLOCKING: replaced corrupted truncated base64 `imageUrl` with `image:{mimeType}` marker string (valid, lightweight, records image presence without storing garbage data); S1: moved chat rate limit config `{ limit: 20, windowMs: 60_000 }` to centralized `RATE_LIMITS.chat` in `rate-limit.ts`; S3: removed unnecessary `as const` on `"asc"` orderBy in `product-context.ts`; I1 was already fixed (system prompt + `systemInstruction` integrated in earlier edit) | 3 | src/app/api/chat/route.ts, src/lib/rate-limit.ts, src/lib/chat/product-context.ts |
| 103 | 2026-02-13 | P3.3.5 + P3.3.6: /chat page and product page chat widget — P3.3.5: created `src/app/chat/page.tsx` (server component, SEO metadata) and `chat-page-client.tsx` (full-page useChat + ChatPanel, intake starts at product phase). P3.3.6: created `src/components/chat/product-chat-widget.tsx` (floating GreetingBubble + ChatPanel overlay, product context pre-loaded so intake skips product phase, fixed side panel on desktop sm:w-96, bottom sheet 85vh on mobile, backdrop overlay on mobile); integrated into `products/[articleNumber]/page.tsx` via dynamic import (`ssr: false`) on both guide-first and fallback detail branches; product context passed as ChatProductContext with productId, articleNumber, productName, imageUrl | 3 | app/chat/page.tsx, app/chat/chat-page-client.tsx, components/chat/product-chat-widget.tsx, components/chat/index.ts, products/[articleNumber]/page.tsx, tasks |
| 102 | 2026-02-13 | P3.3.5: Build /chat standalone page — created `src/app/chat/page.tsx` (server component with SEO metadata: title "Troubleshooting Chat", OG tags) and `chat-page-client.tsx` (client component using useChat hook, centered max-w-2xl layout with full-height ChatPanel, guided intake starts immediately with product identification phase) | 3 | app/chat/page.tsx, app/chat/chat-page-client.tsx, tasks |
| 101 | 2026-02-13 | P3.3.1 + P3.3.2 + P3.3.3 + P3.3.4 + P3.3.7 + P3.3.8: Chat UI component system — created 13 files in `src/components/chat/`: types.ts (ChatMessage, ChatSessionData, ChatProductContext, IntakePhase/DiagnosticAnswers types, PROBLEM_CATEGORIES/TIMING_OPTIONS constants); message-bubble.tsx (user right-aligned primary bg, assistant left-aligned secondary bg, Guid avatar, image attachment, timestamp); chat-input.tsx (auto-resizing textarea, Enter to send, Shift+Enter for newline, camera attach button, disabled state); typing-indicator.tsx (three pulsing dots with chat-dot keyframe, motion-safe animation, aria-label); greeting-bubble.tsx (floating z-chat bubble with 3s delay, localStorage dismissal, chat-bubble-enter animation, contextual product greeting); intake-chips.tsx (pill buttons for structured selection, 44px touch targets, hover border-primary); diagnostic-intake.tsx (4-phase state machine: product search -> category chips -> timing chips -> optional photo, numbered steps); image-preview.tsx (thumbnail with remove button); chat-header.tsx (Guid avatar, product context badge, minimize/close buttons); message-list.tsx (scrollable log with auto-scroll-to-bottom, scroll-top detection for history loading, avatar grouping); chat-panel.tsx (orchestrator composing header+intake+messages+image-preview+input, internal/external message state, intake-to-message conversion, base64 image encoding); use-chat.ts (SSE streaming hook parsing session/delta/done/error events from /api/chat, abort controller, optimistic user messages); index.ts (barrel exports). Added chat-dot and chat-bubble-enter keyframes to globals.css. All components use semantic design tokens, dark mode compatible, 44px touch targets, aria-labels, cursor-pointer, prefers-reduced-motion respected. | 3 | components/chat/*, globals.css, tasks |
| 100 | 2026-02-13 | P3.2.4: System prompt template — created `src/lib/chat/system-prompt.ts` with `buildSystemPrompt()` function; defines Guid's troubleshooting assistant persona (warm, patient, step-by-step), behavioral guardrails (no medical/legal advice, safety warnings, escalation to manufacturer), formatting rules (markdown, under 300 words, bold for part names), photo analysis instructions; dynamically injects product context from `assembleProductContext()` when productId is provided, or prompts product identification when omitted; integrated into `/api/chat/route.ts` via Gemini's `systemInstruction` field; also passes user name for personalization | 3 | src/lib/chat/system-prompt.ts, src/app/api/chat/route.ts, tasks |
| 99 | 2026-02-13 | P3.2.2: Product identification from chat — created `src/lib/chat/product-identifier.ts` with `identifyProduct()` function; 4-strategy identification pipeline: (1) article number regex extraction (xxx.xxx.xx, 8-digit, S-prefix), (2) IKEA URL parsing, (3) uppercase IKEA product name matching (KALLAX, MALM, BILLY), (4) fuzzy text search with common word filtering; returns `ProductIdentification` with identified flag, matched product, identification method, and candidate list for ambiguous matches; exported types: `ProductIdentification` | 3 | src/lib/chat/product-identifier.ts, tasks |
| 98 | 2026-02-13 | P3.2.1: Product context assembler — created `src/lib/chat/product-context.ts` with `assembleProductContext()` function; compiles product metadata (name, article number, type, category, color), dimensions, materials, care instructions, important notes, key facts, assembly guide steps (if published), highlighted reviews (for common issues), and document text chunks (via `getFormattedDocumentContext()` from document-context.ts) into a structured text block; truncates document context to 10k chars; returns `ProductContext` with contextText string ready for system prompt injection | 3 | src/lib/chat/product-context.ts, tasks |
| 97 | 2026-02-13 | P3.1.4: Streaming chat API endpoint — created `src/app/api/chat/route.ts` with POST handler that streams Gemini responses as SSE events; uses Gemini 2.5 Flash for text chat, Gemini 2.5 Pro for image analysis; creates/reuses ChatSession records, persists user and assistant messages in ChatMessage table; SSE event types: `session` (provides sessionId), `delta` (text chunks), `done` (with messageId), `error`; rate limited (20 msg/min per user/IP); conversation history loaded from DB and sent as multi-turn context to Gemini; supports optional `imageBase64`/`imageMimeType` for photo diagnosis; zod validation on request body; partial response saved on stream interruption | 3 | src/app/api/chat/route.ts, tasks |
| 96 | 2026-02-13 | P3.1.5: Choose conversational AI model — decided all-Gemini strategy (Flash primary + Pro escalation) for Phase 3 chat, matching existing pipeline pattern; updated implementation-plan.md "AI Model" section with model names, streaming endpoint details, vision support, cost rationale | 3 | docs/implementation-plan.md, docs/tasks.md |
| 95 | 2026-02-13 | P3.2.3: Document context extraction — created `src/lib/chat/document-context.ts` with `extractDocumentContext()` and `getFormattedDocumentContext()` functions for RAG context; uses `pdfjs-dist` v5 (dynamic ESM import via `pdfjs-dist/legacy/build/pdf.mjs`) to extract text from ProductDocument PDFs; text chunking with 2000-char max and 200-char overlap, breaking at sentence/paragraph boundaries; groups chunks by document type (assembly prioritized first, then care); `getFormattedDocumentContext()` formats chunks with document type headers and page numbers, truncates to configurable max chars (default 15k) for system prompt injection; exported types: `DocumentChunk`, `DocumentContextResult` | 3 | src/lib/chat/document-context.ts, tasks |
| 94 | 2026-02-13 | P2.3.6 + P2.3.7: Barcode/QR scanner and photo-to-text OCR — installed `html5-qrcode` and `tesseract.js`; created `src/components/barcode-scanner.tsx` (client component with camera feature detection, html5-qrcode dynamic import, bottom Sheet scanner UI, camera permission error handling, auto-hide when no camera); created `src/components/ocr-capture.tsx` (client component with camera capture, tesseract.js OCR in web worker, article number regex extraction, captured image preview, processing status); integrated both into `src/components/search-input.tsx` (ScanLine + Camera buttons next to search input, handleBarcodeScan + handleOcrResult callbacks that populate search and navigate); extended `trackSearchDiscovery` in `src/lib/search-tracking.ts` to accept "barcode" and "ocr" methods; all UI follows design guidelines (44px touch targets, aria-labels, semantic tokens, motion-safe:animate-spin, cursor-pointer, dark mode compatible) | 2.3 | components/barcode-scanner.tsx, components/ocr-capture.tsx, components/search-input.tsx, lib/search-tracking.ts, package.json, tasks |
| 93 | 2026-02-13 | P3.1.1 + P3.1.2 + P3.1.3: Phase 3 chat models and migration — added `ChatSession` model (chat_sessions table with userId, productId, status, resolution, timestamps, indexes on userId/productId/status) and `ChatMessage` model (chat_messages table with sessionId, role, content, imageUrl, index on sessionId) to prisma/schema.prisma; added `chatSessions ChatSession[]` reverse relations on User and Product models; ChatSession uses `onDelete: SetNull` for user/product FKs (preserve chat history if user/product deleted), ChatMessage uses `onDelete: Cascade` (delete messages when session deleted); ran `npx prisma db push` and `npx prisma generate` successfully | 3 | prisma/schema.prisma, tasks |
| 92 | 2026-02-13 | Critic review fixes: added zod validation (`submissionIdSchema` + `reviewNotesSchema`) to all 4 admin submission actions; added FK relation `AIGenerationJob.submissionId → GuideSubmission` with `onDelete: SetNull` and reverse `aiGenerationJobs` relation; wrapped `submitGuideSubmission` and `generateFromSubmission` in `$transaction`; passed `communityContributed`/`contributorName` props from product page to GuideViewer via `guideSubmissions` query; conditional difficulty badge rendering (guard null); `motion-safe:animate-pulse` on dynamic imports; `cursor-pointer` on all 8 Studio nav links; try/catch + error banners on all admin action callbacks in `submission-actions.tsx` | 1.5 | prisma/schema.prisma, lib/actions/submissions.ts, studio/submissions/submission-actions.tsx, products/[articleNumber]/page.tsx, guide-viewer/guide-viewer.tsx, studio/layout.tsx, tasks |
| 91 | 2026-02-13 | P1.5.19: "Community Contributed" badge + submission_received banner — added `communityContributed` and `contributorName` optional props to `GuideData` type in guide-viewer/types.ts; added purple outline badge with Users icon in all three guide viewer layouts (mobile, tablet, desktop) with "Contributed by {name}" attribution text; added purple `submission_received` banner to both product page (fallback branch) and details page alongside existing amber/blue status banners; all colors use explicit dark: variants (purple-800/purple-950 borders, purple-200/purple-400 text); badge renders conditionally when `communityContributed=true` — schema fields on AssemblyGuide model still needed from backend-agent | 1.5 | guide-viewer/types.ts, guide-viewer/guide-viewer.tsx, products/[articleNumber]/page.tsx, products/[articleNumber]/details/page.tsx, tasks |
| 90 | 2026-02-13 | P1.5.18: Build "Generate from submission" action — added `generateFromSubmission(submissionId)` to `src/lib/actions/submissions.ts`; validates submission is approved, updates status to "processing", creates `AIGenerationJob` with `submissionId` field set and submission content as `rawOutput` (source, textContent, photos, videoLinks, externalLinks, toolsList, estimatedTime, difficulty), updates product `guide_status` to "queued"; already wired to "Generate Guide" button in Studio submission review queue | 1.5 | lib/actions/submissions.ts, tasks |
| 89 | 2026-02-13 | P1.5.15: Build guide submission form — created `/products/[articleNumber]/submit-guide/page.tsx` (server component, auth-gated with redirect to login, fetches product by articleNumber, breadcrumb navigation, SEO metadata) and `submit-guide-form.tsx` (client component with dynamic field arrays for video/external links, textarea for text instructions, tools/time/difficulty inputs, all inputs with Label elements for WCAG, semantic tokens); created `submitGuideSubmission` server action in `src/lib/actions/submissions.ts` with zod validation, duplicate submission check, product guide_status update to `submission_received`; also added `generateFromSubmission` action for Task #6 (P1.5.18); installed shadcn/ui Textarea component | 1.5 | products/[articleNumber]/submit-guide/page.tsx, products/[articleNumber]/submit-guide/submit-guide-form.tsx, lib/actions/submissions.ts, components/ui/textarea.tsx, tasks |
| 88 | 2026-02-13 | P1.5.17: Submission review queue in Studio — created `/studio/submissions/page.tsx` with stats row (pending/approved/rejected counts), URL-based status filter tabs, submission cards with product link, submitter info, content preview (text/photos/videos/tools indicators), review notes display; created `submission-actions.tsx` client component with Approve/Reject/Request Info buttons for pending submissions, "Generate Guide" button (calls `generateFromSubmission`) for approved, "Re-approve" for rejected/needs_info; created `src/lib/actions/submissions.ts` with `approveSubmission`, `rejectSubmission`, `requestMoreInfo`, `reApproveSubmission` server actions; added "Submissions" nav link to Studio sidebar; all colors use opacity-based tokens for dark mode compatibility | 1.5 | studio/submissions/page.tsx, studio/submissions/submission-actions.tsx, lib/actions/submissions.ts, studio/layout.tsx, tasks |
| 87 | 2026-02-13 | P1.5.20: Add `submission_received` to guideStatus — updated Product model's `guide_status` field comment in prisma/schema.prisma to include `submission_received` as a valid status value (none/queued/generating/in_review/published/no_source_material/submission_received); this status will be set by the submission server action when a user submits guide content for a product | 1.5 | prisma/schema.prisma, tasks |
| 86 | 2026-02-13 | P1.5.14: "Submit a New Guide" CTA — added dashed-border CTA card to product page (fallback branch) and details page; shows for `no_source_material`/`none`/null guide_status on non-discontinued products; logged-in users see "Submit a Guide" link to `/submit-guide`, anonymous users see "Sign in to contribute" link to `/login`; imported PenLine icon from lucide-react, added Button import to details page | 1.5 | products/[articleNumber]/page.tsx, products/[articleNumber]/details/page.tsx, tasks |
| 85 | 2026-02-13 | P1.5.16: Add GuideSubmission model — added `GuideSubmission` model to prisma/schema.prisma (guide_submissions table with productId, userId, status, textContent, photos/videoLinks/externalLinks JSON fields, toolsList, estimatedTime, difficulty, review fields, timestamps, indexes on productId/userId/status); added `guideSubmissions` relation to Product and User models; added `submissionId String?` to AIGenerationJob for tracking jobs triggered from submissions; ran `npx prisma db push` and `npx prisma generate` | 1.5 | prisma/schema.prisma, tasks |
| 84 | 2026-02-13 | P1.5.10 + P1.7.4: Catalog sync dashboard — created `/studio/catalog-sync/page.tsx` with summary cards (last sync, new products this month, total products, guide coverage %), sync history table (10 recent logs with new/updated/delisted/queued/pdf-updates/errors/duration/trigger columns), "Run Sync Now" client button (`run-sync-button.tsx`) that calls `/api/cron/catalog-sync`; added "Catalog Sync" nav link to Studio sidebar after "AI Config" | 1.5, 1.7 | studio/catalog-sync/page.tsx, studio/catalog-sync/run-sync-button.tsx, studio/layout.tsx, tasks |
| 83 | 2026-02-13 | P1.5.21: Post-sync admin notification — added `CatalogSyncLog` model to schema.prisma (catalog_sync_logs table with retailer, newProducts, updatedProducts, delistedProducts, jobsQueued, pdfUpdates, errors, errorDetails JSON, duration, triggeredBy); ran `npx prisma generate`; created `src/lib/actions/sync-log.ts` with `getRecentSyncLogs()` and `getSyncSummary()` server actions; `runCatalogSync()` already saves sync log entry after completion | 1.5 | prisma/schema.prisma, lib/actions/sync-log.ts, tasks |
| 82 | 2026-02-13 | P1.5.11: Scraper error handling and retry — `withRetry()` utility with exponential backoff (3 attempts, 1s/2s/4s delays), wraps all sync operations, individual failures logged but don't block batch, error count in sync summary | 1.5 | lib/catalog-sync.ts, tasks |
| 81 | 2026-02-13 | P1.5.9: Product delisting handling — `handleDelistedProducts()` compares DB products against completed scrape_urls catalog, marks missing products as `discontinued: true`, keeps guides live; added discontinued notice banner to product page (both guide-first fallback and details page) with AlertTriangle icon and muted semantic tokens | 1.5 | lib/catalog-sync.ts, products/[articleNumber]/page.tsx, products/[articleNumber]/details/page.tsx, tasks |
| 80 | 2026-02-13 | P1.5.8: Assembly PDF update detection — `detectPdfUpdates()` compares current assembly document source_url against last approved job's inputPdfUrl, queues new AI generation job with normal priority and auto_sync trigger when URL changes | 1.5 | lib/catalog-sync.ts, tasks |
| 79 | 2026-02-13 | P1.5.3: Auto-detection for new products — `autoQueueNewProducts()` creates AIGenerationJob with `priority: high`, `triggeredBy: auto_sync` for new products with assembly docs; sets `guide_status: queued`, `is_new: true`, `first_detected_at`; marks products without docs as `no_source_material` | 1.5 | lib/catalog-sync.ts, tasks |
| 78 | 2026-02-13 | P1.5.1 + P1.5.2 + P1.5.6: Monthly catalog sync endpoint and diff logic — created `src/lib/catalog-sync.ts` with `runCatalogSync()` pipeline (detect new products, auto-queue generation, detect PDF updates, handle delisted products, update timestamps, reset stale is_new flags, save sync log); `detectNewProducts()` cross-references scrape_urls with products table; created `/api/cron/catalog-sync` route with dual auth (admin session OR CRON_SECRET); added cron config to vercel.json (1st of month at 3 AM UTC) | 1.5 | lib/catalog-sync.ts, api/cron/catalog-sync/route.ts, vercel.json, tasks |
| 77 | 2026-02-13 | P2.3.8: Search analytics dashboard — added SearchEvent Prisma model (search_events table with eventType/query/method/resultCount/clickedId/sessionId indexes); created POST /api/analytics/search for fire-and-forget event recording (no auth, input validation); created GET /api/analytics/search for aggregated analytics (dual auth: admin session OR CRON_SECRET); updated search-tracking.ts with sendSearchEvent() and getOrCreateSessionId() to persist events alongside Vercel Analytics; built /studio/analytics/search dashboard page with summary metrics (total searches, unique queries, CTR, zero-result rate), popular queries table, zero-result content gaps table, 14-day volume bar chart, discovery method breakdown; added "Search Analytics" nav link to Studio sidebar | 2.3 | prisma/schema.prisma, api/analytics/search/route.ts, lib/search-tracking.ts, studio/analytics/search/page.tsx, studio/layout.tsx, tasks |
| 76 | 2026-02-13 | P1.5.22: Manual single-product scrape action — created `src/lib/actions/catalog-sync.ts` with `manualProductScrape()` server action (validates admin, looks up product by article_number, updates last_scraped_at if exists, creates scrape_urls entry if not); added "Scrape" button to SingleEnqueueSearch for products without assembly PDFs | 1.5 | lib/actions/catalog-sync.ts, studio/ai-generate/single-enqueue.tsx, tasks |
| 75 | 2026-02-13 | P1.5.12: "New" badge on product cards — amber pill badge (`bg-amber-500`) at `top-2 left-2` on product grid cards (both image and no-image branches) and related products carousel; added `is_new` to Prisma select in products page and details page related query; added `isNew` to RelatedProduct interface; added `new=true` URL filter param to product-filters.ts with Prisma `is_new: true` where clause; added "New Products" checkbox to desktop/mobile filter sidebar; added "New products" active filter badge | 1.5 | products/page.tsx, products/[articleNumber]/details/page.tsx, components/product-detail-tabs.tsx, lib/product-filters.ts, components/product-filters.tsx, components/active-filters.tsx, tasks |
| 74 | 2026-02-13 | P0.4.7: Added `autoPublished Boolean @default(false)` field to AIGenerationJob schema, set it in auto-publish.ts auto_publish branch, replaced fragile `reviewNotes.contains("Auto-published")` queries in monitoring page with `autoPublished: true/false`; ran `npx prisma generate` | 0 | prisma/schema.prisma, lib/auto-publish.ts, studio/ai-generate/monitoring/page.tsx, tasks |
| 73 | 2026-02-13 | P0.4.4: Added `MAX_ITERATIONS = 500` loop guard to `ProcessAllButton` in queue-controls.tsx to prevent infinite loops on unexpected API responses | 0 | studio/ai-generate/queue-controls.tsx, tasks |
| 72 | 2026-02-13 | P0.4.1: Fixed dark mode hardcoded colors across 9 Studio files — replaced `bg-red-50` with `bg-destructive/10`, `text-red-600/700/800` with `text-destructive`, `bg-green-50` with `bg-green-500/10 dark:bg-green-500/20`, `text-green-600/700/800` with `text-green-600 dark:text-green-400`, `bg-amber-50` with `bg-amber-500/10 dark:bg-amber-500/20`, `text-amber-600/700` with `text-amber-600 dark:text-amber-400`, `bg-gray-50` with `bg-muted`, `border-red-200/300` with `border-destructive/30`, `border-green-200` with `border-green-500/30`, confidence color ternaries updated with dark variants, bar chart `bg-red-400` paired with `dark:bg-red-500` | 0 | studio/ai-generate/page.tsx, studio/ai-generate/monitoring/page.tsx, studio/ai-generate/batch-enqueue.tsx, studio/ai-generate/single-enqueue.tsx, studio/ai-generate/feedback/page.tsx, studio/ai-generate/[jobId]/step-review-card.tsx, studio/ai-config/config-actions.tsx, studio/ai-config/config-form.tsx, components/product-detail-tabs.tsx, tasks |
| 71 | 2026-02-13 | P0.4.3: Wrapped fail path in `/api/queue/process/route.ts` with `prisma.$transaction()` — job status update and product guide_status reset are now atomic, matching the cron route pattern | 0 | api/queue/process/route.ts, tasks |
| 70 | 2026-02-13 | P0.4.2: Fixed dual auth on queue/cron API routes — both `/api/queue/process` (POST + GET) and `/api/cron/process-queue` (GET) now accept admin session OR CRON_SECRET Bearer token; previously allowed unauthenticated access when CRON_SECRET was unset | 0 | api/queue/process/route.ts, api/cron/process-queue/route.ts, tasks |
| 69 | 2026-02-13 | P0.4.5: Focus trap in gallery lightbox — added `dialogRef`, `inert` attribute on `<main>` when lightbox opens (removed on close), Tab key focus wrapping at dialog boundaries, `autoFocus` on close button for immediate keyboard access | 0 | components/gallery-lightbox.tsx, tasks |
| 68 | 2026-02-13 | P0.4.6: Replaced `animate-spin` with `motion-safe:animate-spin` in pull-to-refresh RefreshCw icon and product-detail-tabs Loader2 badge to respect `prefers-reduced-motion` | 0 | components/pull-to-refresh.tsx, components/product-detail-tabs.tsx, tasks |
| 67 | 2026-02-13 | P0.4.8: Added sr-only `<Label>` elements to login and register form inputs (email, password, name) for WCAG form accessibility; replaced `text-red-500` error styling with `text-destructive` semantic token for dark mode compatibility | 0 | login/page.tsx, register/page.tsx, tasks |
| 66 | 2026-02-13 | Added review backlog section (P0.4.1–P0.4.8) to tasks.md: 3 IMPORTANT items (dark mode colors, queue API auth, transaction safety) + 5 SUGGESTION items (loop guard, focus trap, reduced motion, heuristic coupling, form labels) flagged by Critic agent during team session | 0 | tasks |
| 65 | 2026-02-13 | P1.5.13: "Guide in Progress" state banners — amber "guide being generated" banner with spinner for queued/generating status, blue "guide under review" banner with dot indicator for in_review status; added to both guide-first product page (fallback branch) and explicit details page; added guide_status to details page Prisma query; contextual copy differentiates queued vs actively generating | 1.5 | products/[articleNumber]/page.tsx, products/[articleNumber]/details/page.tsx, tasks |
| 64 | 2026-02-13 | P1.5.4: Three-tier auto-publish rules — updated autoPublishOrRoute() with three distinct tiers: (1) auto_publish >= 90% confidence creates guide and marks approved, (2) review 70-89% creates guide with aiGenerated=true badge and publishes immediately but keeps job in review for admin verification, (3) hold < 70% no guide created, routed to manual review; added aiGenerated field to AssemblyGuide schema; extracted upsertGuide() helper; added "AI-Generated" badge (blue outline) to guide viewer in desktop, tablet, and mobile layouts; updated Prisma query to select aiGenerated field | 1.5 | prisma/schema.prisma, lib/auto-publish.ts, guide-viewer/types.ts, guide-viewer/guide-viewer.tsx, products/[articleNumber]/page.tsx, tasks |
| 63 | 2026-02-13 | P1.7.1: AI generate dashboard enhancements — single product search+enqueue component (search by name/article number, shows guide status and assembly doc availability, one-click generate), product search API endpoint (/api/queue/product-search), priority and source filters (high/normal/low, manual/batch/auto_sync) as URL-based tab rows alongside status filter, composite where clause for multi-filter support | 1.7 | studio/ai-generate/single-enqueue.tsx, api/queue/product-search/route.ts, studio/ai-generate/page.tsx, tasks |
| 62 | 2026-02-13 | P1.4.5: Dedicated monitoring dashboard — /studio/ai-generate/monitoring with 6 key metric cards (today/week/total completions, success rate, avg confidence, guide coverage), processing performance (avg/P50/P95 times), queue health (depth, priority breakdown, estimated wait time), 14-day throughput chart, model usage with per-model confidence, auto-publish vs review pipeline split, source breakdown, cost estimates; linked from ai-generate page header | 1.4 | studio/ai-generate/monitoring/page.tsx, studio/ai-generate/page.tsx, tasks |
| 61 | 2026-02-13 | P1.4.5 + P1.7.1: Batch processing dashboard & monitoring — batch analytics section with completion rate bar, avg processing time, 7-day throughput chart (stacked completed/failed per day), trigger source breakdown (manual/batch/auto_sync), top failure reasons list; "Process All" button with live progress and stop control; fixed broken queue-actions.ts import (was referencing deleted @/lib/queue); added Source column to jobs table; fixed cron route type error; fixed batch-enqueue discriminated union handling | 1.4, 1.7 | studio/ai-generate/page.tsx, studio/ai-generate/queue-controls.tsx, studio/ai-generate/batch-enqueue.tsx, actions/queue-actions.ts, api/cron/process-queue/route.ts, tasks |
| 60 | 2026-02-13 | P2.4.4: Related products carousel — RelatedProductsCarousel component with horizontal scroll, snap-to-card, hidden scrollbar, left/right chevron buttons (desktop), responsive card widths (1.5 mobile peek / 2 tablet / 3 md / 4 desktop), guide availability badges (green "Guide" / amber "Soon"), ImageWithFallback for lazy loading, ResizeObserver for scroll state; Prisma query fetches 8 same-category products by rating; replaced "Related Products" tab placeholder | 2.4 | components/product-detail-tabs.tsx, products/[articleNumber]/details/page.tsx, tasks |
| 59 | 2026-02-13 | P1.4.4: Auto-publish for high-confidence guides — autoPublishOrRoute() function loads active AIGenerationConfig thresholds, runs quality checks via classifyQualityGate (auto_publish >= 90%, review 70-89%, hold < 70%), auto-publishes by creating/updating AssemblyGuide + Steps and marking product "published", routes lower-confidence guides to review queue; integrated into cron process-queue worker | 1.4 | lib/auto-publish.ts, api/cron/process-queue/route.ts, tasks |
| 58 | 2026-02-13 | P2.7.5: Bottom sheet patterns — MobileSortSheet component (side="bottom" Sheet with check indicators, 44px touch targets), MobileFilterSheet converted from side="left" to side="bottom" with max-h-[85vh] and rounded-t-xl, sort Select hidden on mobile with MobileSortSheet shown instead | 2.7 | components/mobile-sort-sheet.tsx, components/mobile-filter-sheet.tsx, products/page.tsx, tasks |
| 57 | 2026-02-13 | P2.4.3: Spec table on product details — SpecTable component with alternating row backgrounds (bg-muted/50), scope="row" headers, JetBrains Mono on measurements, sr-only captions; three grouped tables (Specifications, Product Dimensions, Package Dimensions) consolidating article number, color, designer, materials, assembly required, and all dimensions; replaced previous grid-based dimension layout in Overview tab | 2.4 | components/product-detail-tabs.tsx, products/[articleNumber]/details/page.tsx, tasks |
| 56 | 2026-02-13 | P2.7.4: Touch targets audit — min-h-[44px] on header nav links/sign-out, filter checkbox rows, active filter badges (mobile), search autocomplete/recent items, select items, pagination buttons (mobile), input fields (h-11 mobile/h-9 desktop), select triggers (mobile), login/register text links | 2.7 | header-nav.tsx, product-filters.tsx, active-filters.tsx, search-input.tsx, ui/select.tsx, ui/input.tsx, products/page.tsx, login/page.tsx, register/page.tsx, tasks |
| 55 | 2026-02-13 | P2.4.2: Image gallery lightbox — GalleryLightbox component with keyboard navigation (Escape close, ArrowLeft/Right), touch swipe (50px threshold), prev/next buttons, image counter in mono font, backdrop blur overlay; updated ProductImageGallery to open lightbox on main image click with cursor-pointer and focus-visible ring | 2.4 | components/gallery-lightbox.tsx, components/product-image-gallery.tsx, tasks |
| 54 | 2026-02-13 | P1.4.3: Queue worker — Vercel Cron endpoint (/api/cron/process-queue) running every 5 min, processes up to 3 jobs per run with concurrency cap (max 2), Gemini rate limiter integration, priority-ordered job claiming, updated vercel.json with cron schedule | 1.4 | api/cron/process-queue/route.ts, vercel.json, tasks |
| 53 | 2026-02-13 | P1.4.2: Batch processing dashboard — queue stats (5 cards), process-next/cancel/retry buttons, batch enqueue with priority and size controls, eligible products API endpoint, fixed process route schema alignment, priority column in jobs table | 1.4 | queue.ts, actions/queue-actions.ts, api/queue/process/route.ts, api/queue/eligible/route.ts, studio/ai-generate/page.tsx, studio/ai-generate/batch-enqueue.tsx, tasks |
| 52 | 2026-02-13 | P2.4.1: Tabbed product detail page — installed shadcn/ui Tabs, created ProductDetailTabs client component with 3 tabs (Overview, Documents, Related Products), line variant with sticky tab bar, rewrote details/page.tsx to hero (images + product header) above tabs with content below, mono font on dimensions, document count badges, empty states for docs and related products | 2.4 | components/product-detail-tabs.tsx, components/ui/tabs.tsx, products/[articleNumber]/details/page.tsx, tasks |
| 51 | 2026-02-13 | P2.7.6: Pull-to-refresh component — reusable PullToRefresh wrapper with touch gesture detection, pull threshold (80px), resistance easing, animated RefreshCw indicator, router.refresh() integration, overscroll-behavior:contain to prevent browser default | 2.7 | components/pull-to-refresh.tsx, tasks |
| 50 | 2026-02-13 | P2.2.14: Add step bookmarking across guides — useStepBookmarks hook (localStorage), BookmarkButton component (filled/unfilled Bookmark icon on step headers), BookmarkedStepsList client component (grouped by guide, with remove/clear actions), integrated into StepSection, MobileStepCard, and GuideViewer, added to profile page | 2.2 | guide-viewer/use-step-bookmarks.ts, guide-viewer/bookmark-button.tsx, guide-viewer/step-section.tsx, guide-viewer/mobile-step-card.tsx, guide-viewer/guide-viewer.tsx, guide-viewer/index.ts, bookmarked-steps-list.tsx, profile/page.tsx, products/[articleNumber]/page.tsx, tasks |
| 49 | 2026-02-13 | P0.3.3: Search pattern tracking — search-tracking.ts utility (4 event types: search_query, search_autocomplete, search_zero_results, search_discovery), integrated into SearchInput component with per-interaction tracking for queries, autocomplete clicks, discovery methods (text/article_number/url/recent) | 0 | lib/search-tracking.ts, search-input.tsx, tasks |
| 48 | 2026-02-13 | P1.4.1: Build job queue system — enqueue (single + batch), status transitions with validation (queued->processing->review->approved/failed + failed->queued re-queue), cancel/re-queue, priority ordering (high>normal>low), comprehensive queue stats, filtered+paginated job listing | 1.4 | actions/job-queue.ts, tasks |
| 47 | 2026-02-13 | P0.3.2: Guide engagement tracking — guide-tracking.ts utility (6 event types: guide_view, guide_step_view, guide_step_time, guide_complete, guide_drop_off, guide_rating) and use-guide-tracking.ts React hook with automatic lifecycle tracking via Vercel Analytics custom events | 0 | lib/guide-tracking.ts, lib/use-guide-tracking.ts, tasks |
| 46 | 2026-02-13 | P2.2.13: Add progress saving for signed-in users — useGuideProgress hook (localStorage keyed by userId+guideId, debounced saves), ResumeBanner component ("Welcome back! Continue from Step X?"), integrated into GuideViewer for all layouts (mobile/tablet/desktop), page passes guideId and userId props | 2.2 | guide-viewer/use-guide-progress.ts, guide-viewer/resume-banner.tsx, guide-viewer/guide-viewer.tsx, guide-viewer/index.ts, products/[articleNumber]/page.tsx, tasks |
| 45 | 2026-02-13 | P1.7.3: Build /studio/ai-config management page — CRUD for AIGenerationConfig, model params, prompt templates, auto-publish thresholds, activate/deactivate toggle, version bumping | 1.7 | actions/ai-config.ts, studio/ai-config/page.tsx, studio/ai-config/config-form.tsx, studio/ai-config/config-actions.tsx, studio/ai-config/new-config-button.tsx, studio/layout.tsx, tasks |
| 44 | 2026-02-13 | P2.5.4: Optimize filter query builder — reordered WHERE clauses (equality/boolean first, range second, EXISTS third, ILIKE last), combined min/max price into single condition, added article-number detection to bypass 4-way ILIKE for numeric queries | 2.5 | product-filters.ts, tasks |
| 43 | 2026-02-13 | P0.1.2: Preview deployments — added git and github config to vercel.json for auto-alias, auto-cancellation, and PR comment integration | 0 | vercel.json, tasks |
| 42 | 2026-02-13 | P0.1.1: Vercel deployment setup — vercel.json with security headers and region config, postinstall script for Prisma generation, env var documentation | 0 | vercel.json, package.json, .env.example, tasks |
| 41 | 2026-02-13 | P1.3.5: Implement reviewer feedback loop — ReviewerCorrection model, correction categories, before/after diff tracking, feedback insights dashboard | 1.3 | prisma/schema.prisma, ai/types.ts, actions/ai-generation.ts, step-review-card.tsx, studio/ai-generate/feedback/page.tsx, studio/ai-generate/page.tsx, tasks |
| 40 | 2026-02-12 | P2.5.5-P2.5.6 + P2.6.6 + P2.7.2-P2.7.3: ISR (revalidate 1h list / 24h detail), Cache-Control on search API, heading hierarchy audit (h1 on login/register/guide-first), search dropdown max-height for mobile | 2.5, 2.6, 2.7 | products/page.tsx, products/[articleNumber]/page.tsx, details/page.tsx, api/search/route.ts, login/page.tsx, register/page.tsx, search-input.tsx, tasks |
| 39 | 2026-02-12 | P2.5.1-P2.5.3 + P2.7.1: Performance optimization — replaced include with select on all Prisma queries, dynamic imports for GuideViewer/AssemblyGuideViewer, image loading prop on ImageWithFallback, lazy thumbnails, responsive fixes (flex-wrap on stats/search, table overflow, studio min-width) | 2.5, 2.7 | products/[articleNumber]/page.tsx, details/page.tsx, products/page.tsx, studio/products/page.tsx, studio/guides/page.tsx, profile/page.tsx, image-with-fallback.tsx, product-image-gallery.tsx, page.tsx, tasks |
| 38 | 2026-02-12 | P1.3.3 + P1.3.4 + P1.7.2: Studio Review UI — job list, side-by-side review, inline editing, approve/reject | 1.3, 1.7 | studio/ai-generate/page.tsx, studio/ai-generate/[jobId]/, actions/ai-generation.ts, studio/layout.tsx, tasks |
| 37 | 2026-02-12 | P2.0.4 + P2.0.5: Guide availability badges on product cards (green/amber), homepage hero update with guide-centric messaging and search bar | 2.0 | products/page.tsx, page.tsx, tasks |
| 36 | 2026-02-12 | Search improvements, performance, and analytics: autocomplete API, article number/URL detection, recent searches, lazy loading, skeleton states, Vercel Analytics | 2.3, 2.5, 0.3 | api/search/route.ts, search-input.tsx, product-card-skeleton.tsx, product-detail-skeleton.tsx, loading.tsx files, layout.tsx, products/page.tsx, tasks |
| 35 | 2026-02-12 | P1.3.9: Added QualityGateThresholds interface and classifyQualityGate() function to quality-checker.ts (auto_publish/review/hold routing) | P1 | ai/quality-checker.ts, ai/index.ts, tasks |
| 34 | 2026-02-12 | P1.3.2: Created scripts/generate-pilots.ts for batch pilot guide generation with full result logging | P1 | scripts/generate-pilots.ts, tasks |
| 33 | 2026-02-12 | P1.3.1: Created pilot-products.ts with category-based product selection and scripts/select-pilots.ts runner script | P1 | ai/pilot-products.ts, scripts/select-pilots.ts, tasks |
| 32 | 2026-02-12 | P1.2.8 enhancement: Enhanced quality-checker.ts with 3 new checks (illustration coverage, confidence distribution, part sequence validation) and added 3 new QualityFlagCode values to types.ts | P1 | ai/quality-checker.ts, ai/types.ts, tasks |
| 31 | 2026-02-12 | Guide viewer: three-column layout, scrollspy, illustrations, callouts, mobile cards, swipe, lightbox, keyboard nav, completion | 2.2 | guide-viewer/*, products/[articleNumber]/page.tsx, tasks |
| 30 | 2026-02-12 | Infrastructure, security, and SEO: CI/CD, Sentry, rate limiting, Zod validation, JSON-LD, sitemap, OG/Twitter, canonical URLs | 0, 2.6 | ci.yml, sentry configs, next.config.ts, rate-limit.ts, actions/*, register route, json-ld.tsx, sitemap.ts, robots.ts, layout.tsx, product pages, tasks |
| 29 | 2026-02-12 | Select pilot products for AI guide generation | 1.3 | ai/pilot-products.ts, ai/index.ts, tasks |
| 28 | 2026-02-12 | Design system foundation: fonts, colors, dark mode, buttons, typography, accessibility | 2.1 | globals.css, layout.tsx, button.tsx, header-nav.tsx, theme-provider.tsx, theme-toggle.tsx, tasks |
| 27 | 2026-02-12 | Implement guide-first routing, details route, Product Info Card, SEO meta tags, nav link audit | 2.0 | products/[articleNumber]/page.tsx, products/[articleNumber]/details/page.tsx, product-info-card.tsx, tasks |
| 26 | 2026-02-12 | Create quality check automation module | 1.2 | ai/quality-checker.ts, ai/generate-guide.ts, ai/index.ts, tasks |
| 25 | 2026-02-12 | Implement illustration model routing in pipeline | 1.2 | ai/generate-guide.ts, tasks |
| 24 | 2026-02-12 | Build illustration generation module | 1.2 | ai/illustration-generator.ts, ai/index.ts, tasks |
| 23 | 2026-02-12 | Implement continuity refinement pass (Pass 2) | 1.2 | ai/generate-guide.ts, tasks |
| 22 | 2026-02-12 | Refactor step extraction to raw visual facts (Pass 1) | 1.2 | ai/types.ts, ai/generate-guide.ts, tasks |
| 21 | 2026-02-12 | Restructure tasks.md with unique IDs, dependencies, and table format | — | tasks |
| 20 | 2026-02-12 | Two-pass pipeline architecture for step continuity | 1.2 | implementation-plan, tasks |
| 19 | 2026-02-12 | Single-product generation endpoint, step extraction, confidence scoring | 1.2 | ai/generate-guide.ts, actions/ai-generation.ts, tasks |
| 18 | 2026-02-12 | 20-page Gemini 2.5 benchmark complete + env migration to all-Gemini | 1.1 | benchmark script, .env, vision-provider, implementation-plan, tasks |
| 17 | 2026-02-12 | Vision model strategy overhaul: all-Gemini, Flash-first + Pro-on-fail | 1.1 | implementation-plan, tasks, CLAUDE.md |
| 16 | 2026-02-12 | Choose primary vision model (Gemini 2.0 Flash vs GPT-4o benchmark) | 1.1 | .env, pdf-extractor, benchmark script, tasks |
| 15 | 2026-02-12 | Set up AI provider accounts, rate limiter, cost tracker | 1.1 | .env, rate-limiter, cost-tracker, ai/index, tasks |
| 14 | 2026-02-12 | Guide-first UX architecture: navigation paradigm shift | 2.0 | master-plan, implementation-plan, design-guidelines, user-journeys, tasks, CLAUDE.md |
| 13 | 2026-02-12 | Add UI/UX Pro Max workflow to CLAUDE.md | — | CLAUDE.md, design-guidelines |
| 12 | 2026-02-12 | Sync #7: Design guidelines rewrite, three-column guide viewer, font migration | 2.1–2.2 | design-guidelines, implementation-plan, user-journeys, tasks, CLAUDE.md |
| 11 | 2026-02-12 | Sync #6: Community submissions, Phase 2 elaboration, YouTube creators, Phase 5 | 1.5, 4, 5 | implementation-plan, master-plan, design-guidelines, user-journeys, tasks, CLAUDE.md |
| 10 | 2026-02-12 | Create AI abstraction layer (vision provider interface) | 1.1 | ai/vision-provider, ai/index, tasks |
| 9 | 2026-02-12 | Build PDF extraction pipeline (pdfjs-dist + node-canvas) | 1.1 | ai/pdf-extractor, tasks |
| 8 | 2026-02-12 | Design structured output schema (TypeScript types) | 1.1 | ai/types, tasks |
| 7 | 2026-02-12 | Database changes for AI generation pipeline | 1.6 | prisma/schema, tasks |
| 6 | 2026-02-11 | Sync #5: Monthly catalog sync (frequency change from hours to monthly) | 1.5 | implementation-plan, master-plan, user-journeys, design-guidelines, tasks |
| 5 | 2026-02-11 | Sync #4: Continuous catalog sync & auto-generation pipeline | 1.5 | implementation-plan, master-plan, design-guidelines, user-journeys, tasks |
| 4 | 2026-02-11 | Sync #3: Design guidelines + Nano Banana models + chat UI + changelog | — | design-guidelines, changelog |
| 3 | 2026-02-11 | Sync #2: Nano Banana models + Phase 1 blockers + proactive chatbot + mobile apps | 1–6 | implementation-plan, master-plan, user-journeys, tasks |
| 2 | 2026-02-11 | Sync #1: AI troubleshooting assistant + target users + key scenarios | 3 | master-plan, implementation-plan, user-journeys, tasks |
| 1 | 2026-02-11 | Initial creation — all 5 project docs via guided Q&A | — | master-plan, implementation-plan, design-guidelines, user-journeys, tasks |

---

## 2026-02-13 — Reviewer Feedback Loop (P1.3.5)

**Summary:** Implemented a full feedback loop for the AI guide review process. Reviewer corrections are now tracked with before/after diffs, categorized by error type, and surfaced on a dedicated feedback insights dashboard. This data enables systematic prompt refinement by identifying the most common types of AI errors.

### Tasks Completed

| ID | Task |
|----|------|
| P1.3.5 | Implement feedback loop — store reviewer corrections and notes; use them to refine prompts |

### Database Changes

#### `ReviewerCorrection` model (new)
- `id`, `jobId`, `stepNumber`, `field` (title/instruction), `originalValue`, `correctedValue`, `category`, `reviewerNotes`, `reviewedBy`, `createdAt`
- Relation: belongs to `AIGenerationJob`
- Indexes on `jobId` and `category` for efficient aggregation queries

### Files Changed

#### `prisma/schema.prisma`
- Added `ReviewerCorrection` model with relation to `AIGenerationJob`
- Added `corrections` relation on `AIGenerationJob`

#### `src/lib/ai/types.ts`
- Added `CorrectionCategory` type with 10 categories: incorrect_part_name, unclear_instruction, missing_safety_warning, wrong_direction, missing_step_detail, incorrect_order, wrong_tool, terminology_inconsistency, grammar_style, other
- Added `CORRECTION_CATEGORIES` constant array with human-readable labels

#### `src/lib/actions/ai-generation.ts`
- Updated `updateJobStep` to accept `correctionCategory` and `correctionNotes`, capture before/after diffs in `ReviewerCorrection` records using a Prisma transaction
- Added `getJobCorrections(jobId)` — query corrections for a specific job
- Added `getFeedbackSummary()` — aggregate stats: total corrections, by-category counts, by-field counts, jobs corrected count, and 20 most recent corrections with product context

#### `src/app/studio/ai-generate/[jobId]/step-review-card.tsx`
- Added correction category dropdown (visible in edit mode) with all 10 categories
- Added optional notes input for explaining the correction
- Shows success message with correction count after save

### Files Created

#### `src/app/studio/ai-generate/feedback/page.tsx`
- Summary stats: total corrections, jobs corrected, title vs instruction split
- Horizontal bar chart showing correction frequency by category
- Recent corrections list with side-by-side original (red) vs corrected (green) diff display, product context, and reviewer notes

#### `src/app/studio/ai-generate/page.tsx`
- Added "Reviewer Feedback" button linking to the insights dashboard

---

## 2026-02-12 — Studio Review UI for AI-Generated Guides (P1.3.3, P1.3.4, P1.7.2)

**Summary:** Built the full Studio review workflow for AI-generated guides: a job list page with status filters, a side-by-side review screen showing original PDF vs generated steps, inline step editing, and approve/reject actions that create AssemblyGuide records.

### Tasks Completed

| ID | Task |
|----|------|
| P1.7.2 | `/studio/ai-generate` — job list page with status filters |
| P1.3.3 | `/studio/ai-generate/[jobId]` — side-by-side review screen |
| P1.3.4 | Inline editing on review screen + approve/reject actions |

### Files Created

#### `src/app/studio/ai-generate/page.tsx`
- Job list with status filter tabs (All, Needs Review, Queued, Processing, Approved, Failed) with counts
- Table showing product name, article number, status badge, confidence score (color-coded), model, creation date
- Pagination support
- Review/View action links

#### `src/app/studio/ai-generate/[jobId]/page.tsx`
- Side-by-side layout: embedded PDF viewer (iframe) on left, generated steps on right
- Stats overview: confidence, step count, model, quality flag count
- Quality flags display with severity coloring (error/warning/info)
- Guide metadata (title, description, difficulty, time, tools)

#### `src/app/studio/ai-generate/[jobId]/review-actions.tsx`
- Client component with Approve & Publish and Reject buttons
- Reject flow with textarea for notes
- Uses `useTransition` for non-blocking server action calls
- Redirects to job list after action

#### `src/app/studio/ai-generate/[jobId]/step-review-card.tsx`
- Client component for each step with inline editing
- Shows: step number, title, instruction, confidence, complexity, callouts, parts, tools, source PDF page
- Edit mode: editable title input and instruction textarea
- Saves edits to `rawOutput` JSON via server action

### Files Changed

#### `src/lib/actions/ai-generation.ts`
- **Added:** `approveGenerationJob(jobId)` — creates AssemblyGuide + AssemblySteps from rawOutput, updates job status to approved, sets product guide_status to "published"
- **Added:** `rejectGenerationJob(jobId, notes)` — sets job status to failed with review notes, resets product guide_status to "none"
- **Added:** `updateJobStep(jobId, stepNumber, updates)` — updates a step's title/instruction in the rawOutput JSON

#### `src/app/studio/layout.tsx`
- **Added:** "AI Generate" link in Studio sidebar navigation

### `docs/tasks.md`
- **Marked done:** P1.3.3, P1.3.4, P1.7.2

---

## 2026-02-12 — Guide Badges & Homepage Hero (P2.0.4, P2.0.5)

**Summary:** Added guide availability status badges to product cards in the browse grid, and updated the homepage hero with guide-centric messaging, a prominent search bar, and product/guide count stats.

### P2.0.4 — Guide Availability Status Badges
- **Modified:** `src/app/products/page.tsx` — Added `guide_status` and `assemblyGuide` to the Prisma query (optimized to `select`). Product cards now show:
  - **Green badge** ("Guide" with Check icon) — for products with `guide_status: "published"` or a published `assemblyGuide`
  - **Amber badge** ("Coming Soon" with spinning Loader2 icon) — for products with `guide_status: "queued"` or `"generating"` that don't yet have a published guide
  - **No badge** — for products without guide activity
- Badge positioned absolute top-right of image area, `rounded-full`, `px-2 py-0.5`, white text on colored background
- Added dark mode background tokens (`dark:bg-muted`) for image containers

### P2.0.5 — Homepage Hero Update
- **Modified:** `src/app/page.tsx` — Converted to async server component. Updated hero:
  - **Heading:** "Find step-by-step instructions for any product" (guide-centric)
  - **Subheading:** "Assembly guides, setup walkthroughs, and troubleshooting help — all in one place."
  - **Search bar:** Prominent `SearchInput` component centered below the heading
  - **Stats row:** Product count (Package icon), published guide count (BookOpen icon, hidden if zero), "Free to use" (Wrench icon)
  - **CTA buttons:** Kept "Browse Guides" (primary) + "Get Started" (outline)
- Added `getStats()` function querying `prisma.product.count()` and `prisma.assemblyGuide.count({ where: { published: true } })`

---

## 2026-02-12 — Search Improvements, Performance, and Analytics (Waves 4-6)

**Summary:** Implemented search autocomplete with article number detection, URL paste detection, and recent searches. Added performance optimizations: eager/lazy image loading, skeleton loading states for product grid and detail pages. Installed Vercel Analytics for page view and performance tracking.

### Wave 4: Search Improvements

#### P2.3.1 — Search Autocomplete
- **Created:** `src/app/api/search/route.ts` — GET `/api/search?q=<query>` returns top 5 matching products with thumbnail, name, article number, price. Rate limited (60/min per IP).
- **Rebuilt:** `src/components/search-input.tsx` — full autocomplete UI with debounced (300ms) API calls, dropdown results with product thumbnails, click-to-navigate, abort controller for stale requests, ARIA combobox attributes.

#### P2.3.2 — Article Number Detection
- **Added:** Numbers-only input (e.g., "702.758.14") triggers exact `article_number` match in the API, returned as `detectedType: "article_number"` with banner in dropdown.

#### P2.3.3 — URL Paste Detection
- **Added:** URLs containing "ikea.com" or "http" trigger article number extraction via regex patterns (xxx.xxx.xx, 8-digit, S-prefix). API returns `detectedType: "url"` with extracted article number banner.

#### P2.3.4 — Recent Searches
- **Added:** localStorage-based recent searches (last 5). Shown on input focus when empty. Click to re-search. Persists across sessions.

#### P2.3.5 — Zero-Result Handling
- **Added:** "No products found for '[query]'" message in autocomplete dropdown when API returns empty results.

### Wave 5: Performance

#### P2.5.1 + P2.5.2 — Image Loading Optimization
- **Updated:** `src/app/products/page.tsx` — first 4 product card images load eagerly with `priority`, remaining load lazily with `loading="lazy"`. All already had responsive `sizes` props.

#### P2.5.7 — Skeleton Loading States
- **Created:** `src/components/product-card-skeleton.tsx` — `ProductCardSkeleton` (single card) and `ProductGridSkeleton` (grid of N cards) with shimmer animation.
- **Created:** `src/components/product-detail-skeleton.tsx` — `ProductDetailSkeleton` with image gallery, breadcrumb, and detail placeholders.
- **Created:** `src/app/products/loading.tsx` — Next.js loading boundary using `ProductGridSkeleton` + sidebar skeleton.
- **Created:** `src/app/products/[articleNumber]/loading.tsx` — Next.js loading boundary using `ProductDetailSkeleton`.

### Wave 6: Analytics

#### P0.3.1 — Vercel Analytics
- **Installed:** `@vercel/analytics`
- **Updated:** `src/app/layout.tsx` — added `<Analytics />` component. Auto-tracks page views and Web Vitals on Vercel deployment.

### `docs/tasks.md`
- **Marked done:** P2.3.1, P2.3.2, P2.3.3, P2.3.4, P2.3.5, P2.5.1, P2.5.2, P2.5.7, P0.3.1

---

## 2026-02-12 — Guide Viewer UX (P2.2.1–P2.2.12, P2.2.15)

**Summary:** Built the complete guide viewer UX — Guid's core feature. Implements the three-column docs-style layout on desktop, two-column on tablet, and step-by-step card navigation on mobile. Includes scrollspy TOC, sticky illustration panel with lightbox zoom, tip/warning/info callouts, progress bar, swipe navigation, mobile TOC bottom sheet, completion screen with rating, and full keyboard navigation.

### New files created in `src/components/guide-viewer/`

| File | Component | Task |
|------|-----------|------|
| `types.ts` | `GuideStep`, `GuideData`, `ProductInfo` types | — |
| `guide-viewer.tsx` | `GuideViewer` — main orchestrator with responsive layouts, scrollspy, keyboard/swipe handling | P2.2.1, P2.2.2, P2.2.8, P2.2.10, P2.2.15 |
| `toc-sidebar.tsx` | `TocSidebar` — scrollspy-driven TOC with step states and progress bar | P2.2.2 |
| `illustration-panel.tsx` | `IllustrationPanel` — sticky panel with fallback to previous illustration, zoom hint | P2.2.3 |
| `lightbox.tsx` | `Lightbox` — full-screen image overlay with Escape-to-close and backdrop click | P2.2.4 |
| `step-section.tsx` | `StepSection` — individual step rendering with number badge, title, instruction, callouts | P2.2.5 |
| `step-callout.tsx` | `StepCallout` — tip (yellow/Lightbulb), warning (red/AlertTriangle), info (blue/Info) | P2.2.6 |
| `progress-bar.tsx` | `ProgressBar` — thin amber bar with smooth width animation | P2.2.7 |
| `mobile-step-card.tsx` | `MobileStepCard` — one-step-per-screen card with illustration, nav buttons, progress | P2.2.9 |
| `mobile-toc-sheet.tsx` | `MobileTocSheet` — floating List button + bottom Sheet with step list | P2.2.11 |
| `completion-screen.tsx` | `CompletionScreen` — "Guide Complete" with 5-star rating and share buttons | P2.2.12 |
| `index.ts` | Barrel exports for all components and types | — |

### Layout breakpoints

- **Desktop (>= 1024px):** Three columns — TOC sidebar (220px, sticky) | instructions (flex, all steps on scrollable page) | illustration panel (380px, sticky) + ProductInfoCard below
- **Tablet (640–1024px):** Two columns — instructions (60%) | sticky illustration (40%). TOC via floating button + Sheet slide-in from left
- **Mobile (< 640px):** Step-by-step cards with swipe navigation. Floating TOC button + bottom sheet. Full-height layout

### Key features

- **Scrollspy** via Intersection Observer tracks which step is in view; auto-marks prior steps as completed
- **Keyboard navigation** — Arrow keys for step nav, Home/End for first/last, works on both desktop and mobile
- **Swipe navigation** — Touch swipe left/right with 50px threshold, horizontal-dominant detection, haptic feedback via `navigator.vibrate`
- **Lightbox** — Escape to close, click-outside to close, body scroll lock while open
- **Illustration fallback** — When current step has no illustration, persists the most recent step's image
- **`sidebarExtra` prop** — Allows parent to inject content (e.g. ProductInfoCard) into the sticky right column

### Files changed

- **`src/app/products/[articleNumber]/page.tsx`** — Replaced `AssemblyGuideViewer` with `GuideViewer` in the guide-first rendering path. ProductInfoCard now passed via `sidebarExtra` prop.

### Tasks not done (require database changes)

- **P2.2.13** (progress saving) — needs database model for saving scroll position per user per guide
- **P2.2.14** (step bookmarking) — needs database model for bookmarked steps

### `docs/tasks.md`

- **Marked done:** P2.2.1, P2.2.2, P2.2.3, P2.2.4, P2.2.5, P2.2.6, P2.2.7, P2.2.8, P2.2.9, P2.2.10, P2.2.11, P2.2.12, P2.2.15

---

## 2026-02-12 — Infrastructure, Security & SEO: CI/CD, Sentry, Rate Limiting, Validation, Structured Data, Sitemap, Meta Tags

**Summary:** Completed Waves 1-3 of the Polish agent's work: infrastructure setup (CI/CD with GitHub Actions, Sentry error tracking), full security audit and hardening (auth flow review, AI API key audit, rate limiting on auth endpoints, Zod validation on all server actions and API routes), and comprehensive SEO implementation (JSON-LD structured data, dynamic sitemap, robots.txt, Open Graph, Twitter Cards, canonical URLs, unique per-page meta).

### Wave 1: Infrastructure

#### P0.1.4 — CI/CD (GitHub Actions)
- **Created:** `.github/workflows/ci.yml` — runs on push/PR to main: checkout, Node 20 setup with npm cache, `npm ci`, `npx prisma generate`, `npm run build`. Mock env vars for build-time (DATABASE_URL, NEXTAUTH_SECRET).

#### P0.1.3 — Sentry Error Tracking
- **Installed:** `@sentry/nextjs`
- **Created:** `sentry.client.config.ts` — client-side Sentry with replay integration, sample rates (0.1 session, 1.0 error)
- **Created:** `sentry.server.config.ts` — server-side Sentry with trace sampling
- **Created:** `sentry.edge.config.ts` — edge runtime Sentry
- **Created:** `instrumentation.ts` — Next.js instrumentation hook for server/edge Sentry init + `captureRequestError`
- **Updated:** `next.config.ts` — wrapped with `withSentryConfig` (source map upload, Vercel monitors)
- **Updated:** `.env.example` — added `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`

### Wave 2: Security

#### P0.2.4 — AI API Key Audit
- **Verified:** All AI files (`src/lib/ai/*`) are server-side only — no `"use client"` directives
- **Verified:** API keys only accessed via `process.env` (never hardcoded, never imported in client components)
- **Verified:** `.env.example` contains placeholder values only
- **Verified:** `next.config.ts` doesn't expose secrets via `env` config

#### P0.2.1 — Auth Flow Audit
- **Verified:** JWT sessions with bcrypt password hashing (cost 12)
- **Verified:** Proper admin role check in `src/app/studio/layout.tsx` (redirect on non-admin)
- **Verified:** NextAuth v5 handles CSRF protection automatically
- **Verified:** `signIn` page configured as `/login`

#### P0.2.2 — Rate Limiting
- **Created:** `src/lib/rate-limit.ts` — in-memory sliding window rate limiter with auto-cleanup
  - Pre-configured limits: auth (10/min), register (3/min), general API (60/min), AI generation (5/min)
  - `getClientIp()` helper supporting x-forwarded-for, x-real-ip headers
  - Returns rate limit headers (Retry-After, X-RateLimit-Limit, X-RateLimit-Remaining)
- **Updated:** `src/app/api/auth/register/route.ts` — applied 3/min rate limit per IP, added JSON parse error handling

#### P0.2.3 — Input Validation (Zod)
- **Installed:** `zod`
- **Updated:** `src/lib/actions/guides.ts` — added Zod schemas for all 6 server actions (createGuide, updateGuide, deleteGuide, addStep, updateStep, deleteStep). Validates types, string lengths, enums, URLs.
- **Updated:** `src/lib/actions/saved-products.ts` — added productId validation
- **Updated:** `src/lib/actions/ai-generation.ts` — added schemas for productId, jobId, list options with enum validation for status
- **Updated:** `src/app/api/auth/register/route.ts` — enhanced validation: email regex + length, password length range (6-128), name sanitization (trim + max 100), email normalization (lowercase + trim)

### Wave 3: SEO

#### P2.6.1 — JSON-LD Structured Data
- **Created:** `src/components/json-ld.tsx` — reusable components:
  - `OrganizationJsonLd` — homepage schema
  - `BreadcrumbJsonLd` — breadcrumb schema for navigation
  - `ProductJsonLd` — product schema with name, SKU, brand, offers, aggregate rating
  - `HowToJsonLd` — guide schema with steps, tools, totalTime (ISO 8601 duration)
- **Updated:** `src/app/page.tsx` — added Organization + Breadcrumb JSON-LD
- **Updated:** `src/app/products/[articleNumber]/page.tsx` — added Product + HowTo + Breadcrumb JSON-LD (guide and fallback views)
- **Updated:** `src/app/products/[articleNumber]/details/page.tsx` — added Product + Breadcrumb JSON-LD

#### P2.6.2 — Dynamic Sitemap & Robots.txt
- **Created:** `src/app/sitemap.ts` — auto-generated sitemap with static pages (home, products, login, register) + all product pages (up to 5000). Products with published guides get higher priority (0.8 vs 0.6) and weekly change frequency.
- **Created:** `src/app/robots.ts` — allows product pages, blocks studio/api/auth pages. References sitemap.xml.

#### P2.6.3 + P2.6.4 — Open Graph & Twitter Card Meta Tags
- **Updated:** `src/app/layout.tsx` — root metadata with `metadataBase`, OG defaults (website type, siteName), Twitter defaults (summary_large_image)
- **Updated:** Product page `generateMetadata` — per-product OG (title, description, image, url) and Twitter cards. Guide-first pages get article type, fallback gets website type.
- **Updated:** Details page `generateMetadata` — same pattern with product images for OG
- **Updated:** Products list page — added static OG and Twitter metadata

#### P2.6.5 — Canonical URLs
- **Updated:** Root layout metadata with `alternates.canonical`
- **Updated:** All page-level `generateMetadata` functions to include `alternates.canonical` with full URL

#### P2.6.7 — Unique Meta Per Page
- **Products list:** "Browse Products" title + search description
- **Product page (guide):** "How to Assemble [Name] — Step-by-Step Guide" + step count, difficulty, time, tools
- **Product page (no guide):** "[Name]" + description or type
- **Details page:** "[Name] — Product Details" + description or type

### `docs/tasks.md`
- **Marked done:** P0.1.3, P0.1.4, P0.2.1, P0.2.2, P0.2.3, P0.2.4, P2.6.1, P2.6.2, P2.6.3, P2.6.4, P2.6.5, P2.6.7

---

## 2026-02-12 — Select Pilot Products for AI Guide Generation

**Summary:** Selected 5 pilot products from the database — one from each required category — for the AI guide generation pilot. All products have assembly PDFs, high ratings (4.6–5.0), and represent diverse assembly complexities. Created `src/lib/ai/pilot-products.ts` as the authoritative reference for pilot product IDs.

### Selected Products

| Category | Product | ID | Article # | Rating | Selection Rationale |
|----------|---------|-----|-----------|--------|---------------------|
| Bookshelf | KALLAX Shelf unit | 7647 | 80275887 | 4.7 | Iconic IKEA product, cam locks + wooden dowels — tests fastener extraction |
| Desk | MICKE Desk | 5889 | 20244747 | 4.6 | Multiple sub-assemblies (drawer, cable management) — tests step merging |
| Bed frame | IDANÄS Bed frame with storage | 8184 | 10459677 | 5.0 | Complex assembly (slats, drawers, headboard) — tests exploded views |
| Wardrobe | KLEPPSTAD Open wardrobe | 7448 | 80441764 | 4.8 | Spatial orientation and vertical assembly sequences |
| Storage unit | NORDLI 6-drawer dresser | 5410 | 10622070 | 5.0 | 6 identical drawers — tests repetitive step patterns and terminology consistency |

### Files Created

#### `src/lib/ai/pilot-products.ts`
- **Added:** `PilotProduct` interface (id, articleNumber, name, category, rating, rationale)
- **Added:** `PILOT_PRODUCTS` array with all 5 selected products and selection rationale
- **Added:** `getPilotProductIds()` helper for batch processing

#### `src/lib/ai/index.ts`
- **Added:** Barrel exports for `PILOT_PRODUCTS`, `getPilotProductIds`, and `PilotProduct` type

### `docs/tasks.md`
- **Marked done:** P1.3.1 (Select pilot products)

---

## 2026-02-12 — Design System Foundation (P2.1.1–P2.1.8)

**Summary:** Implemented all 8 tasks in the Phase 2.1 Design System Update. This establishes the full visual identity for Guid: amber/orange brand colors, IBM Plex Sans + JetBrains Mono fonts, complete light/dark mode token mapping, z-index/shadow scales, accessibility foundations, updated button component, fluid typography, and a dark mode toggle in the header.

### P2.1.1 — Migrate fonts to IBM Plex Sans + JetBrains Mono
- **`src/app/layout.tsx`** — Replaced `Geist` and `Geist_Mono` imports with `IBM_Plex_Sans` (weights 400, 500, 600, 700) and `JetBrains_Mono` (weights 400, 500, 700) from `next/font/google`. Added `display: "swap"` for better loading performance. Updated CSS variable names from `--font-geist-sans`/`--font-geist-mono` to `--font-ibm-plex-sans`/`--font-jetbrains-mono`.
- **`src/app/globals.css`** — Updated `@theme inline` block to reference new variable names for `--font-sans` and `--font-mono`.

### P2.1.2 — Update color palette to amber/orange brand tokens
- **`src/app/globals.css`** `:root` — Replaced all 17 neutral gray oklch tokens with warm amber/orange brand tokens from design-guidelines.md. Key changes: `--primary` from dark gray to amber `oklch(0.75 0.18 55)`, `--background` to warm off-white `oklch(0.99 0.002 55)`, `--accent` to warm highlight `oklch(0.85 0.15 65)`, `--ring` to amber for focus states. Updated sidebar tokens to match warm palette.

### P2.1.3 — CSS variables for light + dark mode
- **`src/app/globals.css`** `.dark` — Replaced cold neutral dark tokens with warm charcoal tones per design-guidelines.md. `--background` is now `oklch(0.16 0.01 55)` (warm dark), `--primary` stays vibrant amber in dark mode, `--border` and `--input` use warm dark tones `oklch(0.30 0.01 55)`.

### P2.1.7 — z-index, shadow, border-radius scales
- **`src/app/globals.css`** `:root` — Added z-index scale as CSS custom properties (`--z-base` through `--z-chat`, values 0–70). Added shadow scale (`--shadow-sm` through `--shadow-xl` using oklch). Border radius scale was already present via `--radius` and computed `--radius-sm` through `--radius-4xl`.

### P2.1.8 — Accessibility foundations
- **`src/app/globals.css`** — Added `:focus-visible` base style (2px solid amber ring with 2px offset). Added `prefers-reduced-motion: reduce` media query that disables all animations, transitions, and smooth scrolling. Added `scroll-behavior: smooth` on html for TOC navigation. Added `.skip-link` class that's visually hidden until focused.
- **`src/app/layout.tsx`** — Added skip link (`<a href="#main-content" class="skip-link">Skip to main content</a>`) as first focusable element. Wrapped `{children}` in `<main id="main-content">` for skip link target.

### P2.1.5 — Update button styles
- **`src/components/ui/button.tsx`** — Updated base styles: added `cursor-pointer`, `transition-colors duration-200 ease-out`, `disabled:cursor-not-allowed`, proper `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`. Updated default variant to use amber primary with `font-semibold`, `hover:brightness-105`, `active:brightness-95`. Updated sizes: default `h-10` (40px), lg `h-12` (48px), icon `size-10`/`size-12` for 44px+ touch targets.

### P2.1.4 — Typography audit
- **`src/app/globals.css`** — Added fluid type scale using `clamp()` for h1–h4 in `@layer base`. Added body line-height 1.7 for readability. Added `.prose-guide` utility class (max-width 72ch, 1.7 line-height) for guide instruction content. Added `.text-body-sm` (14px/1.5) and `.text-caption` (12px/1.4/medium) utility classes.

### P2.1.6 — Dark mode toggle
- **Installed:** `next-themes` package
- **`src/components/theme-provider.tsx`** (new) — Client component wrapping `next-themes` `ThemeProvider`.
- **`src/components/theme-toggle.tsx`** (new) — Client component with Sun/Moon Lucide icons. Uses `useTheme()` hook, handles SSR with mounted check. Proper `aria-label` describing the action.
- **`src/app/layout.tsx`** — Wrapped body content in `<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>`. Added `suppressHydrationWarning` on `<html>`.
- **`src/components/header-nav.tsx`** — Added `<ThemeToggle />` to the right side of the nav. Updated header to be sticky with `z-[var(--z-header)]`, `bg-background/95`, and `backdrop-blur-sm`. Updated all nav links with `cursor-pointer`, `transition-colors duration-200 ease-out`, and `hover:text-primary`.

### `docs/tasks.md`
- **Marked done:** P2.1.1, P2.1.2, P2.1.3, P2.1.4, P2.1.5, P2.1.6, P2.1.7, P2.1.8

---

## 2026-02-12 — Guide-First Routing, Details Route, Product Info Card, SEO Meta Tags, Navigation Audit

**Summary:** Implemented 5 tasks from Phase 2.0 (Guide-First UX Architecture): guide-first routing on the product page, a dedicated product details route, a Product Info Card component for the guide viewer sidebar, guide-aware SEO meta tags via `generateMetadata`, and an internal navigation link audit with updated breadcrumbs.

### Tasks Completed

| ID | Task |
|----|------|
| P2.0.1 | Guide-first routing on `/products/[articleNumber]` |
| P2.0.2 | Create `/products/[articleNumber]/details` route |
| P2.0.3 | Build Product Info Card for guide viewer |
| P2.0.6 | Update SEO meta tags for guide-first landing |
| P2.0.7 | Update internal navigation links |

### Files Created

#### `src/app/products/[articleNumber]/details/page.tsx`
- Full product detail page moved here from the main product route
- Shows all product info: images, specs, ratings, documents, dimensions, materials, care instructions
- Always accessible regardless of guide status
- Breadcrumbs: Products > [Product Name] > Details
- Has its own `generateMetadata` for product-focused SEO
- Links back to main product route via breadcrumb

#### `src/components/product-info-card.tsx`
- Compact card for the guide viewer sidebar
- Shows: 48px product thumbnail, product name, article number (monospace), price, one key dimension
- "View details" link to `/products/[articleNumber]/details`
- Entire card is a clickable `<Link>` with hover state

### Files Changed

#### `src/app/products/[articleNumber]/page.tsx`
- **Added:** `generateMetadata` function (P2.0.6) — when `guide_status === "published"` and guide is published, returns guide-focused meta: title "How to Assemble [Product] — Step-by-Step Guide | Guid", description with step count, difficulty, time, and tools. Otherwise returns product-focused meta.
- **Added:** Guide-first routing logic (P2.0.1) — checks `product.guide_status === "published"` AND `product.assemblyGuide?.published === true`. When true, renders `AssemblyGuideViewer` as the primary view with `ProductInfoCard` in a sidebar. When false, falls back to the full product detail page.
- **Added:** Breadcrumbs on both guide view and fallback view: Products > [Product Name]
- **Added:** `ProductInfoCard` import and rendering in guide-first sidebar

### Navigation Link Audit (P2.0.7)

Audited all internal links pointing to `/products/[articleNumber]`:
- `src/app/products/page.tsx:123` — product grid cards. No change needed; guide-first routing handles these correctly.
- `src/app/profile/page.tsx:76,96` — saved product links. No change needed; works with guide-first routing.
- `src/app/studio/products/page.tsx:111` — studio catalog. No change needed; admins can navigate from guide view to details via breadcrumb.
- Breadcrumbs updated on both guide view and details page with consistent navigation paths.

### `docs/tasks.md`
- **Marked done:** P2.0.1, P2.0.2, P2.0.3, P2.0.6, P2.0.7

---

## 2026-02-12 — Create Quality Check Automation Module

**Summary:** Extracted and expanded the inline quality checks from `generate-guide.ts` into a dedicated, comprehensive quality checker module. The module runs 9 distinct checks and returns structured results including a quality gate pass/fail decision.

### Files Created

#### `src/lib/ai/quality-checker.ts`
- **Added:** `QualityCheckConfig` — configurable thresholds (minStepConfidence: 0.7, minOverallConfidence: 0.6, maxExpectedSteps: 50, minExpectedSteps: 2).
- **Added:** `QualityCheckResult` — structured result with flags array, overall confidence, quality gate boolean, and summary counts (errors/warnings/info).
- **Added:** 9 quality check functions:
  1. `checkLowConfidenceSteps` — flags steps below confidence threshold; error severity for < 0.5, warning for < 0.7
  2. `checkStepCountVsPdfPages` — compares extracted step count against PDF page count with reasonable tolerance
  3. `checkStepSequence` — verifies sequential step numbering after renumbering
  4. `checkPartReferences` — flags if > 80% of parts only appear in one step in large guides (may indicate incomplete part tracking)
  5. `checkToolCoverage` — flags guides with no tools identified; flags steps with screw/bolt/cam lock fasteners but no tools
  6. `checkInstructionQuality` — flags empty or very short (< 20 chars) instructions
  7. `checkDuplicateSteps` — detects steps with identical instruction text
  8. `checkSafetyWarnings` — flags large guides with heavy-lift annotations but no warning callouts
  9. `checkOrientationCoverage` — flags complex steps missing orientation data
- **Added:** `runQualityChecks(steps, pdfPageCount, config?)` — orchestrates all 9 checks and returns aggregate result.

### Files Changed

#### `src/lib/ai/generate-guide.ts`
- **Replaced:** Inline quality checks (section 8-9) with a call to `runQualityChecks()`. Reduced ~50 lines of inline checks to a single function call that returns the same `qualityFlags` array and `overallConfidence` score.
- **Added:** Import of `runQualityChecks` from `quality-checker`.

#### `src/lib/ai/index.ts`
- **Added:** Barrel exports for `runQualityChecks`, `QualityCheckConfig`, and `QualityCheckResult`.

### `docs/tasks.md`
- **Marked done:** P1.2.8 (Create quality check automation)

---

## 2026-02-12 — Implement Illustration Model Routing in Pipeline

**Summary:** Integrated the illustration generation module into the main `generateGuideForProduct()` pipeline with cost-efficiency routing. Each step's complexity is re-classified using the enhanced 7-criteria scoring system before illustration generation. Simple steps route to Nano Banana (cheaper/faster), complex steps to Nano Banana Pro (higher fidelity). Added pipeline options `skipIllustrations` and `illustrationDryRun` for testing and text-only generation.

### Changes

#### `src/lib/ai/generate-guide.ts`
- **Added:** Import of `generateIllustrationsForGuide` and `classifyComplexityForIllustration` from illustration-generator.
- **Added:** `skipIllustrations` and `illustrationDryRun` options to `GenerateGuideOptions`.
- **Added:** Step 9.5 in the pipeline (after quality checks, before building final guide):
  1. Re-classifies each step's complexity using the enhanced illustration-specific classifier
  2. Runs batch illustration generation for all steps (unless `skipIllustrations` is set)
  3. Attaches `illustrationPrompt` to each step
  4. Logs illustration failures as quality flags on the guide
- **Integration:** Illustration generation respects existing rate limits (Gemini provider limiter) and cost tracking (via shared `CostTracker`).

### `docs/tasks.md`
- **Marked done:** P1.2.7 (Implement illustration model routing)

---

## 2026-02-12 — Build Illustration Generation Module

**Summary:** Created the illustration generation module that integrates Gemini's Nano Banana (`gemini-2.5-flash-image`) and Nano Banana Pro (`gemini-3-pro-image-preview`) models to generate isometric technical assembly illustrations for each guide step. Includes enhanced step complexity classification, automatic model routing, detailed prompt building from raw visual extraction data, and batch generation with error handling.

### Files Created

#### `src/lib/ai/illustration-generator.ts`
- **Added:** `classifyComplexityForIllustration(step)` — Enhanced complexity classification using 7 weighted criteria from raw extraction data: part count + quantity (0-3), action count (0-2), spatial details (0-2), fastener variety (0-2), arrow count (0-2), rotation/hinge actions (0-2). Score ≥ 5 → "complex", otherwise "simple".
- **Added:** `selectIllustrationModel(complexity)` — Routes simple steps to `ILLUSTRATION_MODEL_SIMPLE` env var (default: `gemini-2.5-flash-image`) and complex steps to `ILLUSTRATION_MODEL_COMPLEX` (default: `gemini-3-pro-image-preview`).
- **Added:** `buildIllustrationPrompt(step, productName)` — Builds detailed illustration prompts from step data: isometric technical style preamble, product/step context, parts visible, tools in use, spatial orientation, alignment notes, actions depicted, directional arrows, fastener details, and complexity-specific guidance (exploded view for complex, simple angle for simple).
- **Added:** `callGeminiImageGeneration(prompt, model, apiKey)` — Calls the Gemini `generateContent` API with `responseModalities: ["IMAGE", "TEXT"]` to generate images. Extracts the image `inlineData` part from the response, returns Buffer + mimeType.
- **Added:** `generateStepIllustration(step, productName, costTracker, options)` — Generates a single illustration: classifies complexity, selects model, builds prompt, calls API, tracks cost. Supports `dryRun` mode (prompt only, no API call) and `modelOverride`.
- **Added:** `generateIllustrationsForGuide(steps, productName, costTracker, options)` — Batch generation for all steps in a guide. Processes sequentially for rate limit compliance. Skips step 0 (parts overview). Continues on individual failures, collecting results and errors separately.

### Files Changed

#### `src/lib/ai/index.ts`
- **Added:** Barrel exports for all public functions and types from `illustration-generator.ts`.

### `docs/tasks.md`
- **Marked done:** P1.2.6 (Build illustration generation)

---

## 2026-02-12 — Implement Continuity Refinement Pass (Pass 2)

**Summary:** Implemented the second LLM pass in the two-pass AI guide generation pipeline. After Pass 1 extracts raw visual facts from each PDF page independently, Pass 2 takes the **complete ordered sequence** of steps and rewrites the instructions as flowing, context-aware narrative text. This pass uses Gemini Flash in text-only mode (no vision, no image input) — much cheaper than vision calls — and sees the entire guide at once, enabling global optimizations that per-page extraction cannot achieve.

### What Pass 2 Does

1. **Flowing instructions** — Each step's instruction is written with awareness of all prior steps: "Using the frame you assembled in Steps 1-3, now attach the shelf pins..."
2. **Step merging** — Detects and merges steps split across PDF pages into single coherent steps, combining parts, tools, and callouts from the originals
3. **Transition language** — Adds transition notes at major assembly phase boundaries: "With the frame assembled, you'll now install the shelving."
4. **Cross-step references** — Resolves forward/backward references: "Use the same Allen key from Step 2", "these are the same cam locks used in Step 5"
5. **Consistent terminology** — Ensures the same part is called the same name throughout (not "cam lock" in step 3 and "round metal fastener" in step 12)
6. **Safety reiteration** — Re-warns when dangerous actions repeat in later steps

### Changes

#### `src/lib/ai/generate-guide.ts`
- **Added:** `TextCompletionResponse` interface and `callGeminiText()` function — text-only Gemini API call (no image input) for Pass 2. Reads API key and model from env vars (same as primary vision provider).
- **Added:** `CONTINUITY_REFINEMENT_PROMPT` — detailed prompt instructing the text model to rewrite raw visual extractions into flowing assembly instructions. Includes writing style rules (active voice, imperative mood, specific part refs, quantities, directions), merging detection, and JSON output format.
- **Added:** `RefinedStep` and `ContinuityRefinementResult` interfaces — output schema for the refinement pass (originalStepNumbers, title, instruction, transitionNote).
- **Added:** `parseRefinementJson()` — JSON parser with markdown fence stripping and validation for the refinement output.
- **Added:** `deduplicateParts()` and `deduplicateTools()` helpers — used when merging steps to combine part/tool lists without duplicates.
- **Added:** `runContinuityRefinement()` — orchestrates the Pass 2 call: serializes all raw step data, builds the prompt, calls Gemini text API, parses response, tracks costs. Gracefully falls back to factual instructions if parsing fails.
- **Updated:** `generateGuideForProduct()` — added section 7.5 between step assembly and quality checks. Runs the continuity refinement pass, applies refined instructions back to steps (handling both single-step updates and merged steps), includes any steps missed by the refinement pass, and renumbers the final step sequence.
- **Changed:** `assemblySteps` declaration from `const` to `let` to allow reassignment after refinement.

### Cost Impact

Pass 2 is text-only (no vision) — for a 20-step guide, the input is ~2K tokens of structured JSON + ~800 tokens of prompt. At Flash pricing ($0.15/1M input, $0.60/1M output), this costs ~$0.001 per guide — negligible compared to the ~$0.01-0.15 for 20 vision calls in Pass 1.

### `docs/tasks.md`
- **Marked done:** P1.2.5 (Implement continuity refinement pass)

---

## 2026-02-12 — Refactor Step Extraction to Raw Visual Facts (Pass 1)

**Summary:** Refactored the AI vision extraction prompt and pipeline to focus on raw visual observation instead of narrative instruction writing. The prompt now asks the vision model to describe what it *sees* on each PDF page (parts, actions, spatial relationships, arrows, fasteners, annotations) rather than writing how-to instructions. This separates visual extraction (Pass 1) from instruction generation (Pass 2, next task P1.2.5), enabling the continuity refinement pass to write flowing, context-aware instructions with full sequence visibility.

### Problem Solved
The previous prompt asked the vision model to both extract visual data AND write narrative instructions in a single pass per page. This produced isolated, per-page instructions with no awareness of prior or subsequent steps — no cross-step references, inconsistent terminology, and no transition language.

### Changes

#### `src/lib/ai/types.ts`
- **Added:** `VisualAction` interface — describes an action depicted (actionType, subject, target, direction)
- **Added:** `FastenerDetail` interface — fastener type, partId, rotation direction, notes
- **Added:** `ArrowAnnotation` interface — arrow direction, label, indicatesMotion flag
- **Added:** `RawStepExtraction` interface — complete per-step raw visual data (rawDescription, partsShown, toolsShown, actions, spatialDetails, arrows, fasteners, annotations, warnings, complexity, confidence)
- **Added:** `RawPageExtraction` interface — full page output with steps array and pageIndicators
- **Updated:** `GeneratedStep` — added `rawExtraction?: RawStepExtraction` field (carries raw data for Pass 2 to consume)

#### `src/lib/ai/generate-guide.ts`
- **Rewritten:** `STEP_EXTRACTION_PROMPT` — now instructs the vision model to "report WHAT is shown, not explain HOW to do it." Outputs structured JSON with rawDescription, partsShown, toolsShown, actions, spatialDetails, arrows, fasteners, annotations, warnings per step. Includes a detailed example JSON response.
- **Changed:** `PageAnalysisResult` — now aliased to `RawPageExtraction` from types.ts
- **Updated:** `parseAnalysisJson()` — normalizes raw extraction fields with defaults, handles backward compatibility with old field names (instruction→rawDescription, parts→partsShown, tools→toolsShown)
- **Added:** `deriveStepTitle()` — generates step titles from the primary action in raw extraction
- **Added:** `buildFactualInstruction()` — builds a factual placeholder instruction from raw visual data (rawDescription + actions + fasteners + spatial details). This placeholder will be replaced by Pass 2.
- **Added:** `deriveCallouts()` — converts raw warnings and fastener notes into typed callout objects
- **Added:** `deriveScrewDirection()` — infers screw direction from fastener rotation data and arrow annotations
- **Updated:** Step assembly (section 7) — now converts `RawStepExtraction` to `GeneratedStep` using the helper functions, attaching the raw extraction data for Pass 2 consumption

### `docs/tasks.md`
- **Marked done:** P1.2.4 (Refactor step extraction to raw visual facts)

---

## 2026-02-12 — Restructure tasks.md with Unique IDs & Dependencies

**Summary:** Migrated all ~160 tasks from checkbox list format to structured markdown tables with unique IDs (`P{phase}.{section}.{seq}`), explicit dependency tracking (`Depends`/`Blocks` columns), and status values (`done`/`todo`/`blocked`). This enables multiple agents to safely pick up parallel work by checking dependency readiness.

### Format Change
- **Before:** Checkbox lists (`- [ ] **Task name** — description`)
- **After:** Markdown tables with 6 columns: ID, Status, Task, Description, Depends, Blocks

### Key Details
- All 228 tasks preserved with correct status (13 done, 2 blocked, 213 todo)
- P1.5.5 (Add guideStatus field) marked as `done` since it was completed as part of P1.6.3
- Dependencies mapped bidirectionally — every `Depends` entry has a matching `Blocks` entry
- Added legend at top explaining the ID scheme, status values, and how to find available work
- No tasks were added or removed — this is a pure format migration with dependency enrichment

### `docs/tasks.md`
- **Complete rewrite** — checkbox format to table format with IDs and dependencies

---

## 2026-02-12 — Step Continuity: Two-Pass Pipeline Architecture for Instruction Generation

**Summary:** Identified a continuity gap in the AI guide generation pipeline — the current implementation analyzes each PDF page independently and writes instruction text per page, with no awareness of previous steps. Assembly instructions are inherently sequential (each step builds on the last), so this produces instructions that read as isolated page descriptions instead of a flowing narrative. Added a two-pass architecture: Pass 1 (vision, per page) extracts raw visual facts, Pass 2 (text-only, full sequence) rewrites instructions with continuity. Added two new tasks for the refactoring.

### Problem
The `STEP_EXTRACTION_PROMPT` in `generate-guide.ts` asks the vision model to both extract visual data AND write final instruction text for each page independently. This means:
- Step 14 can't reference "the side panels you attached in Step 3"
- Steps split across two PDF pages get duplicated instead of merged
- Part terminology may drift (e.g., "cam lock" in step 3, "round metal fastener" in step 12)
- No transition language between major assembly phases

### Solution: Two-Pass Extraction + Instruction Generation
- **Pass 1 (current, to be refactored):** Per-page visual extraction focuses on raw facts only — parts, actions, spatial relationships, arrows, fasteners. No narrative prose.
- **Pass 2 (new):** A continuity-aware instruction generation pass (Flash text-only) takes the full ordered step sequence and writes flowing instructions with cross-step references, consistent terminology, transition language, and merged split steps.

### Why two passes (not sequential context passing)
- Vision models perform best on focused, image-only prompts
- No error propagation between pages
- Much cheaper (text-only call for Pass 2)
- Full-sequence visibility enables global optimizations
- Per-page extraction remains parallelizable for future optimization

### `docs/implementation-plan.md`
- **Updated:** Pipeline diagram — added "Step sequence assembly" and "Continuity refinement pass" stages between visual extraction and rule checks
- **Added:** "Step Continuity: Two-Pass Extraction + Instruction Generation" section — full architecture description with rationale for two-pass over sequential context, implementation details, and cost analysis
- **Updated:** Model routing policy table — renamed "Visual extraction" to "Per-page visual extraction", replaced "Instruction generation + variants" row with "Continuity refinement + instruction generation" row describing the full-sequence text-only pass

### `docs/tasks.md`
- **Added:** "Refactor step extraction prompt to extract raw visual facts only" task in section 1.2 — refactor `STEP_EXTRACTION_PROMPT` to output factual structured JSON, not narrative prose
- **Added:** "Implement continuity refinement pass" task in section 1.2 — build the second LLM pass with 6 specific continuity requirements (flowing instructions, split-step merging, transition language, cross-step references, consistent terminology, safety reiteration)

---

## 2026-02-12 — Phase 1.2: Single-Product Generation Endpoint + Step Extraction + Confidence Scoring

**Summary:** Built the core AI guide generation pipeline — a server action that takes a product ID, finds its assembly PDF, extracts all pages, runs vision analysis on each page (Flash-first with Pro escalation), and returns a fully structured `GeneratedGuide` with steps, tools, parts, confidence scores, and quality flags. Covers three tasks from section 1.2.

### Files Created
- **`src/lib/ai/generate-guide.ts`** — Core generation orchestration:
  - `generateGuideForProduct(productId)` — full pipeline: product lookup → PDF fetch → page extraction → per-page vision analysis → step assembly → quality checks → job record updates
  - Step extraction prompt — structured JSON prompt that extracts: step numbers, titles, instructions, parts, tools, callouts, screw directions, complexity classification, and per-step confidence scores
  - Flash-first escalation logic — analyzes page indicators (arrow count ≥5, hinge/rotation, fastener ambiguity, confidence <0.7, JSON parse failure) and escalates to Pro when triggered
  - JSON parsing with fallback — handles markdown fences, extra text, and malformed responses
  - Quality flag automation — checks for low confidence steps, sequence gaps, missing steps, missing tools
  - Auto-estimates difficulty (easy/medium/hard) and time based on step count and complexity ratio
  - Creates and updates `AIGenerationJob` records, updates product `guide_status`
  - Integrates existing `CostTracker` and `RateLimiter` throughout the pipeline

- **`src/lib/actions/ai-generation.ts`** — Server actions (admin-only):
  - `generateGuideAction(productId)` — validates product, checks for duplicate jobs, runs generation pipeline
  - `getGenerationJobStatus(jobId)` — check job progress
  - `listGenerationJobs(options)` — list recent jobs with optional status filter

### Files Changed
- **`src/lib/ai/index.ts`** — Added barrel exports for `generateGuideForProduct` and `GenerateGuideOptions`

### `docs/tasks.md`
- **Marked complete:** "Build single-product generation endpoint" in section 1.2
- **Marked complete:** "Implement step extraction logic" in section 1.2
- **Marked complete:** "Add confidence scoring" in section 1.2

---

## 2026-02-12 — Phase 1.1: 20-Page Gemini 2.5 Benchmark Complete + Env Migration

**Summary:** Built and ran 20-page benchmark comparing Gemini 2.5 Flash vs Gemini 2.5 Pro across 5 IKEA manuals (MALM bed frame, HEMNES drawer unit, HELMER cabinet, MICKE desk, BILLY shelf) × 4 archetypes. Both models achieved 100% success rate. Flash is 14x cheaper ($0.0005 vs $0.0076/page) with 0.82 avg confidence; Pro at 0.92. Tuned escalation triggers based on results. Updated all env vars and abstraction layer to Gemini 2.5.

### Benchmark Results
- **Flash**: 20/20 success, 15.2s avg latency, $0.0005/page avg, 0.82 confidence, 17/20 JSON parse
- **Pro**: 20/20 success, 22.2s avg latency, $0.0076/page avg, 0.92 confidence, 19/20 JSON parse
- **By archetype**: Flash handles parts legends perfectly (0.99). Pro significantly better on multi-panel (0.78→0.97) and simple steps (0.78→0.96). Both struggle on tricky mechanisms (0.75 vs 0.78).
- **Escalation tuning**: Arrow threshold raised from ≥3 to ≥5 (most IKEA pages have 3-4 arrows normally). Added JSON parse failure as trigger. Target escalation rate: ~25-35%.
- **Cost projection**: Full catalog (56,000 pages) — Flash-only: ~$30, Pro-only: ~$423, Hybrid (25% Pro): ~$127.

### Files Changed
- **`scripts/benchmark-vision.ts`** — Rewritten: now compares Gemini 2.5 Flash vs Pro (was 2.0 Flash vs GPT-4o). 5 products × 4 archetypes = 20 pages. Added escalation trigger analysis, scoring rubric template, cost projections, per-archetype breakdown. Tuned arrow threshold to ≥5.
- **`.env`** — Updated: `AI_PRIMARY_MODEL="gemini-2.5-flash"`, `AI_SECONDARY_PROVIDER="gemini"`, `AI_SECONDARY_MODEL="gemini-2.5-pro"` (was gemini-2.0-flash + openai/gpt-4o)
- **`.env.example`** — Updated: all-Gemini strategy with Flash default + Pro escalation. OpenAI key now optional/commented.
- **`src/lib/ai/vision-provider.ts`** — Updated: default fallback model from "gemini-2.0-flash" to "gemini-2.5-flash"
- **`benchmark-report-gemini25-2026-02-12.txt`** (new) — Full 20-page benchmark report

### `docs/implementation-plan.md`
- **Updated:** Escalation triggers — added tuned thresholds (arrows ≥5, JSON failure trigger), documented benchmark findings
- **Replaced:** "20-page benchmark (planned)" section with completed results table, archetype breakdown, cost projection

### `docs/tasks.md`
- **Marked complete:** "Choose primary & secondary vision models + run benchmark" in section 1.1

---

## 2026-02-12 — Vision Model Strategy Overhaul: All-Gemini, Flash-First + Pro-on-Fail

**Summary:** Dropped OpenAI GPT-4o entirely. Upgraded from Gemini 2.0 Flash to Gemini 2.5 generation. New strategy: Gemini 2.5 Flash as the default (cost-efficient bulk processor) with Gemini 2.5 Pro as the escalation target (highest accuracy for complex/ambiguous pages). Added detailed routing policy, escalation triggers, and a 20-page benchmark plan.

### Rationale
- OpenAI models are expensive relative to Gemini for this use case
- Gemini 2.5 Flash is the safer "cheap but not dumb" workhorse for IKEA's micro-visual language (tiny arrows, Torx nuance)
- Gemini 2.5 Pro provides best-in-class accuracy for the hard pages (hinges, drawer slides, cam locks, mirrored steps)
- Flash-first routing keeps Pro usage to ~10–25% of pages, optimizing cost without sacrificing accuracy

### `docs/implementation-plan.md`
- **Replaced:** Multi-Model Strategy table — Primary: Gemini 2.0 Flash → **Gemini 2.5 Pro**. Secondary: GPT-4o → **Gemini 2.5 Flash**.
- **Added:** Model routing policy table — 5 pipeline stages showing which model handles what (Flash default for panel detection, step segmentation, rule checks, instruction generation; Pro for escalations only)
- **Added:** Escalation triggers list — 5 specific conditions that cause Flash→Pro escalation (multiple arrows, hinge alignment, fastener ambiguity, low confidence, rule-checker disagreement)
- **Added:** 20-page benchmark plan — 5 manuals × 4 archetypes (parts legend, simple step, multi-panel rotation, tricky mechanism), scoring rubric (0–10 per page, 0–200 total)
- **Added:** 2 new vision model selection criteria (fastener ambiguity, hinge/rotation interpretation)
- **Updated:** Pipeline diagram — now shows Flash/Pro routing at each stage instead of generic "vision model analysis"
- **Removed:** OpenAI API from API Integrations section
- **Updated:** Infrastructure AI APIs — removed OpenAI reference, added specific Gemini model names
- **Updated:** Model decision history — documents the evolution from Gemini 2.0 Flash + GPT-4o to all-Gemini 2.5

### `docs/tasks.md`
- **Unmarked:** Task 1.1 "Choose primary vision model" — changed from `[x]` back to `[ ]`
- **Renamed & expanded:** Task to "Choose primary & secondary vision models + run benchmark" — describes new all-Gemini strategy and remaining work (build 20-page benchmark, validate models, tune triggers, update env vars and AI abstraction layer)

### `CLAUDE.md`
- **Updated:** AI Pipeline multi-model strategy — replaced Gemini 2.0 Flash + GPT-4o with Gemini 2.5 Pro + Gemini 2.5 Flash, added routing description
- **Removed:** OpenAI API from API integrations line

---

## 2026-02-12 — Phase 1.1: Choose Primary Vision Model (Benchmark Complete)

### Benchmark Results
- **Tested:** Gemini 2.0 Flash vs GPT-4o on 10 diverse IKEA assembly PDF pages (BILLY bookshelf, MICKE desk, MALM bed frame, KOMPLEMENT wardrobe insert, KALLAX shelf, HEMNES dresser, NORDEN dining table, LACK coffee table, BRIMNES cabinet, BRIMNES nightstand)
- **Winner (Primary):** Gemini 2.0 Flash — 12x cheaper ($0.0045 vs $0.0545 total), 2x faster (4.0s vs 8.2s avg latency), comparable quality, better at extracting specific part numbers
- **Secondary:** GPT-4o — slightly better at spatial orientation descriptions, used as fallback/validation for low-confidence results
- **Decision:** `AI_PRIMARY_PROVIDER=gemini`, `AI_PRIMARY_MODEL=gemini-2.0-flash`, `AI_SECONDARY_PROVIDER=openai`, `AI_SECONDARY_MODEL=gpt-4o`

### Critical Bug Fix: PDF Extraction
- **Fixed:** `src/lib/ai/pdf-extractor.ts` — pdfjs-dist v5.4.624 + node-canvas was silently producing blank white PNG images. Rewrote to use poppler's `pdftoppm` command-line tool. Now produces correct 187KB+ images with full assembly diagram content.
- **Dependency:** Requires `poppler` system package (`brew install poppler` on macOS)
- **API change:** `scale` parameter replaced with `dpi` parameter (default 200 DPI)

### Files Changed
- **`.env`** — Uncommented and set vision model config: `AI_PRIMARY_PROVIDER="gemini"`, `AI_PRIMARY_MODEL="gemini-2.0-flash"`, `AI_SECONDARY_PROVIDER="openai"`, `AI_SECONDARY_MODEL="gpt-4o"`
- **`.env.example`** — Updated vision model section from TBD to decided values with benchmark summary
- **`src/lib/ai/pdf-extractor.ts`** — Rewritten from pdfjs-dist to poppler (`pdftoppm`/`pdfinfo`). Added `getPdfPageCount()` function.
- **`scripts/benchmark-vision.ts`** (new) — Benchmark script: selects 10 diverse products by category, extracts page 6 from each PDF, runs both models with identical structured analysis prompt, generates comparison report
- **`benchmark-report-2026-02-12.txt`** — Generated benchmark results file

### `docs/tasks.md`
- **Marked complete:** "Choose primary vision model" in section 1.1

---

## 2026-02-12 — Phase 1.1: Set Up AI Provider Accounts

### `.env` / `.env.example`
- **Added:** `GEMINI_API_KEY` — required for illustration generation (Nano Banana models) and potentially vision analysis
- **Added:** `ILLUSTRATION_MODEL_SIMPLE="gemini-2.5-flash-image"` — Nano Banana for simple step illustrations
- **Added:** `ILLUSTRATION_MODEL_COMPLEX="gemini-3-pro-image-preview"` — Nano Banana Pro for complex step illustrations
- **Added:** `OPENAI_API_KEY` — commented out, optional until vision model benchmark determines if OpenAI is needed
- **Added:** Vision model config vars (`AI_PRIMARY_PROVIDER`, `AI_PRIMARY_MODEL`, `AI_SECONDARY_PROVIDER`, `AI_SECONDARY_MODEL`) — commented out as TBD pending benchmark
- **Created:** `.env.example` documenting all env vars with descriptions, requirement status, and links to API key pages

### `src/lib/ai/rate-limiter.ts` (new)
- **Created:** Sliding-window rate limiter for AI API providers
- **Implemented:** `RateLimiter` class with `acquire()` (wait-then-record), `canProceed()`, `waitTime()`, `available()` methods
- **Added:** Default rate limits per provider (Gemini: 15 RPM free tier, OpenAI: 30 RPM safe default)
- **Added:** `getRateLimiter(provider)` registry — singleton limiter per provider across the app

### `src/lib/ai/cost-tracker.ts` (new)
- **Created:** Cost estimation and cumulative tracking for AI API usage
- **Added:** `MODEL_PRICING` lookup table — per-1M-token pricing for Gemini (2.0 Flash, 2.5 Flash/Pro, Nano Banana models) and OpenAI (GPT-4o, 4o-mini, 4.1 family)
- **Implemented:** `calculateCost(model, inputTokens, outputTokens)` — single-call cost estimation
- **Implemented:** `CostTracker` class — per-job cumulative tracker with `record()`, `totalCostUsd`, `summary()` (model breakdown for storing in AIGenerationJob)

### `src/lib/ai/index.ts`
- **Updated:** Barrel exports to include `RateLimiter`, `getRateLimiter`, `DEFAULT_RATE_LIMITS`, `CostTracker`, `calculateCost`, `MODEL_PRICING` and their types

### `docs/tasks.md`
- **Marked complete:** "Set up AI provider accounts" in section 1.1

---

## 2026-02-12 — Guide-First UX Architecture: Application-Wide Navigation Paradigm Shift

**Summary:** The entire application shifts from product-centric to guide-centric navigation. When a user clicks on a product, they land directly on the step-by-step work instructions (if a guide exists) instead of the product detail page. Product metadata is secondary, accessible via a "View Details" link. Products without guides fall back to the traditional product detail page.

### `docs/master-plan.md`
- **Added:** "Core UX Principle: Guide-First Navigation" section after the vision one-liner. Defines the guide-first flow (Search → Product card with guide status → Work instructions → [optional] View details), fallback behavior, and how this principle shapes SEO, product cards, and homepage messaging.

### `docs/implementation-plan.md`
- **Added:** "Guide-First Navigation Architecture" section between Current State and Phase 1. Includes:
  - Routing logic table: `/products/[articleNumber]` behavior per guide status (published → guide viewer, queued/generating → product page fallback, no source → product page with Submit CTA)
  - New route: `/products/[articleNumber]/details` for full product detail page
  - Product Info Card spec for the guide viewer right column (thumbnail, name, article number, price, "View details →" link)
  - Product card guide availability status indicators (green/amber/none)
  - Homepage & navigation messaging: "Find step-by-step instructions for any product"
  - SEO landing behavior: guide-first for search engine visitors
- **Updated:** Phase 2 Product Detail Layout section — clarified it now applies to `/products/[articleNumber]/details`, removed "Assembly Guide" tab (guide is now the primary view at parent route)
- **Updated:** New Routes table — added `/products/[articleNumber]/details`

### `docs/design-guidelines.md`
- **Updated:** Product cards spec — added guide availability status badge (green "Guide Available" with `Check` icon for published, amber "Guide In Progress" with `Loader2` for queued/generating, no badge for no guide). Badge positioned top-right of card image, `rounded-full`.
- **Added:** Product Info Card component spec within the Guide Viewer section — compact card below the sticky illustration panel. Horizontal layout: 48px product thumbnail, name, article number (JetBrains Mono), price, key dimension, "View details →" link. Clickable, hover states. On mobile: replaced by small info icon in guide header.

### `docs/user-journeys.md`
- **Rewrote:** Journey 1 (Find & Follow a Guide) steps 2-3b — removed "PRODUCT PAGE" step and "START GUIDE" step. New flow: search results show "Guide Available" badge on product cards → clicking takes user directly to guide page (desktop: three-column layout with Product Info Card in right column; mobile: step cards with info icon in header). No intermediate product page.
- **Rewrote:** Journey 3 (Quick Lookup — Pro Installer) steps 1-2b — Sam clicks MALM result and lands directly on guide (no "click Assembly Guide" step). Product card shows "Guide Available" badge.
- **Rewrote:** Journey 4 (First-Time Visitor) steps 1-2 — "LAND ON PRODUCT PAGE (via SEO)" → "LAND ON GUIDE (via SEO)". User sees work instructions immediately from Google. Product Info Card provides context. "VALUE REALIZATION" updated: user is already in the guide from landing.
- **Updated:** Journey 1 edge cases — added routing fallback language (no guide → falls back to product page).
- **Updated:** SEO Landing Experience table — all entries now reflect guide-first landing behavior.

### `docs/tasks.md`
- **Added:** New section "2.0 Guide-First UX Architecture" with 7 tasks:
  1. Implement guide-first routing on `/products/[articleNumber]`
  2. Create `/products/[articleNumber]/details` route
  3. Build Product Info Card for guide viewer right column
  4. Add guide availability status badges to product cards
  5. Update homepage hero to guide-centric messaging
  6. Update SEO meta tags for guide-first landing
  7. Update internal navigation links
- **Updated:** Section 2.4 header clarified as applying to `/products/[articleNumber]/details`. Removed "Assembly Guide" tab from tabbed sections task (guide is primary view at parent route).

### `CLAUDE.md`
- **Updated:** Routes table — `/` description now "guide-centric", `/products` notes guide availability status on cards, `/products/[articleNumber]` updated to "Guide-first: shows guide viewer if published guide exists, falls back to product detail page otherwise", added new `/products/[articleNumber]/details` route.

---

## 2026-02-12 — Add UI/UX Pro Max Workflow to CLAUDE.md

### `CLAUDE.md`
- **Added:** New "UI/UX Development Workflow" section — mandates use of UI/UX Pro Max skill for all UI/UX work (new features, edits, reviews). Includes 4-step workflow: (1) read design guidelines, (2) run `--design-system` check, (3) run domain-specific searches, (4) pre-delivery checklist. Includes 15-item checklist covering accessibility, contrast, touch targets, responsive, dark mode, design tokens, and typography. Includes "when to use" table for different scenarios.

### `docs/design-guidelines.md`
- **Added:** Cross-reference note at top pointing to CLAUDE.md for the UI/UX development workflow and pre-delivery checklist.

---

## 2026-02-12 — Sync #7: Design Guidelines Rewrite (UI/UX Pro Max Review), Three-Column Guide Viewer, Font Migration

### `docs/design-guidelines.md` (full rewrite)
- **Added:** New top-level "Accessibility" section — contrast ratios (WCAG AA 4.5:1), keyboard navigation, screen reader support, skip links, color independence, touch targets (44px min), reduced motion (`prefers-reduced-motion`).
- **Changed:** Font stack from Geist Sans / Geist Mono to **IBM Plex Sans** (primary sans) + **JetBrains Mono** (technical mono). IBM Plex chosen for technical documentation clarity; JetBrains Mono for precise character differentiation on part numbers.
- **Changed:** Color system — added 7 new tokens (`--background`, `--foreground`, `--card`, `--card-foreground`, `--border`, `--input`, `--ring`), hex fallbacks for all oklch values, contrast ratio notes for all text-on-background pairings. Fixed `--muted-foreground` from L=0.55 to L=0.50 to meet 4.5:1 AA minimum.
- **Added:** Complete dark mode token mapping — all 17 tokens with oklch values and hex fallbacks (was only 4 bullet points). Added dark mode considerations for illustrations, shadows, and images.
- **Changed:** Semantic colors — added required icon pairing for each color (never color-only). Added "Upcoming step" and "Success" semantic colors.
- **Changed:** Typography — added fluid type scale with `clamp()` for mobile, max-width column (72ch) for body text, emphasis guidelines, minimum 12px rule. Added `font-display: swap` and Tailwind config snippet.
- **Added:** Z-index scale (8 layers from base=0 to chat=70), shadow scale (sm through xl), border-radius scale (sm through full).
- **Rewrote:** Guide Viewer section — replaced paginated step-by-step viewer with **three-column docs-style layout**: TOC sidebar (left, sticky, scrollspy via Intersection Observer), work instructions (center, all steps on one scrollable page), illustration panel (right, sticky, crossfade swap). Detailed specs for desktop (≥1024px), tablet (640-1024px, two-column + sheet TOC), and mobile (<640px, step-by-step cards with swipe). Added callout specs (Tip/Warning/Info), completion experience, and progress saving.
- **Added:** Button sizes (sm, default, lg) and full interactive state matrix (hover, active, focus-visible, disabled, loading).
- **Unified:** Badge system — merged "Product Freshness & Status Badges" into a single "Badges (Unified System)" section with icon requirements for accessibility.
- **Added:** New component specs: Forms (expanded beyond Studio to all contexts), Toasts & Notifications, Modals & Dialogs, Empty States.
- **Expanded:** Responsive breakpoints — added detailed layout changes per breakpoint, mobile-first CSS principle, responsive image guidance.
- **Expanded:** Animation & Motion — added timing/easing table, `prefers-reduced-motion` CSS override snippet, easing direction rules, `transform`/`opacity`-only animation rule, skeleton-over-spinner guidance.
- **Added:** Iconography accessibility rules (`aria-label`, `aria-hidden`), no-emoji rule, additional icon sizes (32px, 48px).
- **Added:** Interactive State Patterns summary table — all states (default, hover, active, focus-visible, disabled, loading, error, empty, skeleton) with visual treatment.

### `docs/implementation-plan.md`
- **Rewrote:** Phase 2 Guide Viewer UX section — replaced paginated viewer description with three-column docs layout architecture (scrollspy, sticky illustration, mobile cards). Added keyboard navigation and dark mode illustration handling.
- **Updated:** Mobile guide viewer description — card-based step-by-step with swipe navigation, floating TOC button, bottom sheet.

### `docs/user-journeys.md`
- **Rewrote:** Journey 1 steps 4-6 — split into desktop (three-column scrollspy layout) and mobile (card-based swipe) paths. Updated step descriptions to reflect scrollable page with auto-updating TOC and sticky illustration panel.
- **Rewrote:** Journey 3 step 2 — split into desktop (click TOC sidebar to jump) and mobile (floating TOC button → bottom sheet → tap step) paths.

### `docs/tasks.md`
- **Rewrote:** Section 2.1 Design System Update — added font migration task (IBM Plex Sans + JetBrains Mono), expanded color palette task to include all 17 tokens + hex fallbacks, added z-index/shadow/border-radius scale task, added accessibility foundations task. 5 tasks → 8 tasks.
- **Rewrote:** Section 2.2 Guide Viewer UX — replaced 10 paginated-viewer tasks with 15 three-column layout tasks: desktop three-column build, scrollspy implementation, sticky illustration panel, click-to-zoom lightbox, step instruction rendering, callouts, progress bar, tablet two-column layout, mobile step-by-step cards, mobile swipe navigation, mobile TOC bottom sheet, completion screen, progress saving, step bookmarking, keyboard navigation.
- **Updated:** Section 2.7 Mobile guide viewer task — references mobile layout built in 2.2, focuses on responsive audit.

### `CLAUDE.md`
- **Added:** Font stack reference (IBM Plex Sans + JetBrains Mono via `next/font/google`) under Architecture.

---

## 2026-02-12 — Sync #6: Community Guide Submissions, Phase 2 Elaboration, YouTube Creator Videos, Phase 5 Expansion

### `docs/implementation-plan.md`
- **Changed:** Phase 1, New Product Detection step 3 — replaced "Guide Coming Soon" with **"Submit a New Guide"** button for products without assembly PDFs. Without source material, Guid cannot create guides; instead, users contribute assembly knowledge.
- **Added:** "Community Guide Submissions" section under Phase 1 — full user submission flow (text, photos, video links, external resources), admin review pipeline, AI-enhanced guide creation from submissions, `GuideSubmission` database model, new routes (`/products/[articleNumber]/submit-guide`, `/studio/submissions`).
- **Updated:** `guideStatus` enum — added `submission_received` value.
- **Rewritten:** Phase 2 (Polish Current Experience) — expanded from 3 brief bullet-list sections to 7 detailed subsections: UX Improvements (responsive design, loading states, search/discovery, product detail layout, guide viewer UX), Performance (image optimization, query profiling, ISR, edge caching), SEO (structured data, sitemap, meta tags, canonical URLs, heading hierarchy), and Mobile Optimization.
- **Changed:** Phase 4 premium features — removed "Video guides (embedded or generated)" and replaced with **YouTube Creator Video Integration**: creator self-submission portal, video display on product pages, creator attribution, helpfulness voting, monetization strategy (traffic exchange, future revenue share). Added `VideoSubmission` and `CreatorProfile` database models, new routes (`/creators/register`, `/creators/[id]`, `/creators/submit`, `/studio/videos`).
- **Rewritten:** Phase 5 (Multi-Retailer Expansion) — expanded from 8 bullet points to comprehensive coverage: Retailer Adapter Architecture (interface spec, adapter registry), Retailer Priority & Rollout Order (IKEA→Wayfair→Home Depot→Amazon→Target with rationale), Retailer-Specific Challenges, Product Deduplication & Matching (exact, fuzzy, manual), Unified Product Schema (normalization rules per retailer), URL Detection & Routing, Affiliate Revenue, Platform Changes, new `Retailer` database model.

### `docs/master-plan.md`
- **Updated:** Business model — added Layer 1.5: Creator & Affiliate Revenue (YouTube video integration, affiliate links, community guide submissions).
- **Updated:** Priority 2 (Multi-Retailer) — added product deduplication and affiliate link scenarios.
- **Updated:** Priority 4 (Community + AI Hybrid) — added community guide submission and YouTube creator scenarios.

### `docs/design-guidelines.md`
- **Changed:** "Guide Coming Soon" badge → "Guide in Progress" badge (for guideStatus queued/generating/in_review only).
- **Added:** "Community Contributed" badge — purple outline pill for guides created from user submissions.
- **Updated:** Guide status dot — added purple for `submission_received`.
- **Added:** "Submit a New Guide CTA" component spec — centered card with icon, heading, body text, amber CTA button.
- **Added:** "Video Guide Cards" component spec — YouTube embed, creator attribution strip, helpfulness voting, multi-video layout.

### `docs/user-journeys.md`
- **Updated:** Journey 1 edge case "No guide exists" — split into two cases: "has PDF" (generating) and "no PDF" (Submit a New Guide CTA).
- **Added:** Journey 4B: Submit a New Guide — full happy path for community guide contribution (discover gap → submit content → admin review → AI-enhanced creation → publish with "Community Contributed" badge), edge cases.
- **Updated:** Journey 2 edge case — "No assembly PDF" now references Submit a New Guide instead of Notify Me.
- **Updated:** Journey 2B edge case — same update for monthly sync products without PDFs.
- **Updated:** Journey 6 — video guide reference changed to YouTube creator video guide.
- **Updated:** Error states — split "Guide not available" into "generating" and "no source" cases, updated recovery actions.

### `docs/tasks.md`
- **Renamed:** "Add Guide Coming Soon state" → "Add Guide in Progress state" in section 1.5.
- **Added:** 8 new tasks in section 1.5 — "Submit a New Guide" CTA, guide submission form, `GuideSubmission` model, submission review queue, "Generate from submission" action, "Community Contributed" badge, `submission_received` guideStatus.
- **Rewritten:** Phase 2 — expanded from 4 subsections (23 tasks) to 7 subsections (~40 tasks): 2.1 Design System, 2.2 Guide Viewer UX (added progress saving, step bookmarking), 2.3 Search & Discovery (added recent searches, zero-result handling, search analytics), 2.4 Product Detail Layout (new section: tabs, lightbox, spec table, related products), 2.5 Performance (detailed query profiling, edge caching, ISR), 2.6 SEO (detailed structured data, sitemap, meta), 2.7 Mobile Optimization (detailed responsive audit, bottom sheets, pull-to-refresh).
- **Replaced:** Phase 4.2 "Premium Features" (4 tasks including video guides) → Phase 4.2 "YouTube Creator Video Integration" (8 tasks: CreatorProfile model, VideoSubmission model, creator registration, video submission form, video review queue, video display, creator profile page, helpfulness voting). Renumbered 4.3 → 4.4.
- **Rewritten:** Phase 5 — expanded from 2 subsections (10 tasks) to 6 subsections (~25 tasks): 5.1 Retailer Adapter Framework (9 tasks: interface design, IKEA refactor, Retailer model, adapter registry, 4 retailer adapters, validation pipeline), 5.2 Product Deduplication & Matching (5 tasks), 5.3 Data Normalization (3 tasks), 5.4 URL Detection & Routing (2 tasks), 5.5 Platform Changes (6 tasks), 5.6 Affiliate Revenue Setup (4 tasks).

### `CLAUDE.md`
- **Added:** Planned routes for guide submissions (`/studio/submissions`, `/products/[articleNumber]/submit-guide`).
- **Added:** Planned routes for creator portal (`/creators/register`, `/creators/[id]`, `/creators/submit`, `/studio/videos`).
- **Added:** Planned database tables for Phase 1 (`GuideSubmission`), Phase 4 (`CreatorProfile`, `VideoSubmission`), Phase 5 (`Retailer`, Product extensions for dedup).

---

## 2026-02-12 — Phase 1.1: Create AI Abstraction Layer

### `src/lib/ai/vision-provider.ts` (new)
- **Created:** Provider-agnostic `VisionProvider` interface with `analyzeImage()` method
- **Implemented:** `GeminiVisionProvider` — direct REST API calls to Gemini `generateContent` endpoint
- **Implemented:** `OpenAIVisionProvider` — direct REST API calls to OpenAI chat completions with vision
- **Created:** `createVisionProvider(config)` factory function for instantiating providers
- **Created:** `createVisionProvidersFromEnv()` — reads primary/secondary provider config from env vars (AI_PRIMARY_PROVIDER, AI_PRIMARY_MODEL, AI_PRIMARY_API_KEY, etc.)

### `src/lib/ai/index.ts` (new)
- **Created:** Barrel export for the ai module (types, pdf-extractor, vision-provider)

### `docs/tasks.md`
- **Marked complete:** "Create AI abstraction layer" in section 1.1

---

## 2026-02-12 — Phase 1.1: Build PDF Extraction Pipeline

### Dependencies
- **Installed:** `pdfjs-dist` (v5.4.624) and `canvas` (node-canvas) for server-side PDF rendering

### `src/lib/ai/pdf-extractor.ts` (new)
- **Created:** PDF page extraction utility with three functions:
  - `extractPdfPages(pdfUrl, scale)` — fetches a PDF from URL, renders all pages to PNG buffers at 2x scale
  - `extractSinglePage(pdfUrl, pageNumber, scale)` — extracts a single page (for testing/incremental processing)
  - `getPdfPageCount(pdfUrl)` — returns page count without rendering (for progress tracking)
- **Implementation:** Uses `pdfjs-dist/legacy/build/pdf.mjs` with custom `NodeCanvasFactory` for server-side canvas rendering
- **Output:** Returns `PdfExtractionResult` / `ExtractedPdfPage` types from the structured output schema

### `docs/tasks.md`
- **Marked complete:** "Build PDF extraction pipeline" in section 1.1

---

## 2026-02-12 — Phase 1.1: Design Structured Output Schema

### `src/lib/ai/types.ts` (new)
- **Created:** Complete TypeScript type system for the AI generation pipeline
- **Types:** `GeneratedGuide`, `GeneratedStep`, `PartReference`, `ToolReference`, `StepCallout`, `QualityFlag`, `GenerationMetadata`
- **PDF types:** `ExtractedPdfPage`, `PdfExtractionResult`
- **AI provider types:** `VisionAnalysisRequest`, `VisionAnalysisResponse`, `AIProvider`, `AIProviderConfig`
- **Enums:** `StepComplexity` (simple/complex for illustration routing), `RotationDirection`, `QualityFlagCode` (8 codes)

### `docs/tasks.md`
- **Marked complete:** "Design structured output schema" in section 1.1

---

## 2026-02-12 — Phase 1.6: Database Changes for AI Generation Pipeline

### `prisma/schema.prisma`
- **Added:** `JobStatus` enum (queued/processing/review/approved/failed)
- **Added:** `JobPriority` enum (high/normal/low)
- **Added:** `JobTrigger` enum (manual/auto_sync/batch)
- **Added:** `AIGenerationJob` model — tracks AI guide generation jobs with status, confidence scoring, model references, priority, triggeredBy, and review fields. Maps to `ai_generation_jobs` table. Indexed on productId, status, and priority.
- **Added:** `AIGenerationConfig` model — prompt templates, model configuration, auto-publish thresholds (JSON). Maps to `ai_generation_configs` table. Only one active config at a time via `isActive` flag.
- **Extended:** `Product` model with 5 new fields: `guide_status` (String, default "none"), `first_detected_at` (DateTime?), `last_scraped_at` (DateTime?), `is_new` (Boolean), `discontinued` (Boolean). Added `aiGenerationJobs` relation.
- **Pushed:** Schema changes to Supabase via `npx prisma db push`. Prisma client regenerated.

### `docs/tasks.md`
- **Marked complete:** All 4 tasks in section 1.6 (Database Changes)

---

## 2026-02-11 — Sync #5: Monthly Catalog Sync (Frequency Change)

### `docs/implementation-plan.md`
- **Updated:** Catalog sync frequency from every 4-6 hours to **once per month** per retailer
- **Rewritten:** Architecture diagram, scheduler section, and detection method for monthly full-catalog diff
- **Updated:** SLA targets — detection ≥ 98% per cycle, guides within 72h of sync, coverage within 1 week
- **Updated:** Dashboard metrics — now shows "last sync date," "new products this month," and "sync history" instead of hourly/daily metrics
- **Updated:** `isNew` badge duration from 7 days to 30 days
- **Updated:** Product metadata updates happen during monthly sync (was "real-time")
- **Updated:** Infrastructure section — "monthly catalog sync" replaces "every 4-6 hours"

### `docs/master-plan.md`
- **Updated:** Priority 1 catalog sync scenarios — replaced "within hours" and "same-day" language with monthly cadence
- **Updated:** Success metrics — "Catalog freshness (time-to-guide) < 24h" replaced with "Catalog sync coverage per monthly cycle ≥ 98%" and "New product guide rate within 1 week of sync ≥ 95%"

### `docs/user-journeys.md`
- **Rewritten:** Journey 2B renamed from "Continuous Catalog Sync" to "Monthly Catalog Sync"
- **Updated:** Automated flow — monthly batch cycle replaces hourly scanning
- **Updated:** Admin routine — post-sync review replaces daily monitoring
- **Updated:** User experience — realistic edge case where product listed between syncs isn't yet on Guid (user clicks "Notify me")
- **Added:** Edge case — "Request this product" for urgent needs between sync cycles

### `docs/design-guidelines.md`
- **Updated:** "New" badge duration from 7 days to 30 days
- **Updated:** Time-to-guide color coding — green < 3 days, amber 3-7 days, red > 7 days (was hours-based)

### `docs/tasks.md`
- **Renamed:** Section 1.5 from "Continuous Catalog Sync" to "Monthly Catalog Sync & Auto-Generation"
- **Updated:** All 14 tasks — monthly frequency, full catalog diff, 30-day badge, post-sync notifications, sync history
- **Added:** New task — "manual single-product scrape" for handling user requests between sync cycles
- **Renamed:** Studio route from `/studio/freshness` to `/studio/catalog-sync`

---

## 2026-02-11 — Sync #4: Continuous Catalog Sync & Auto-Generation Pipeline

### `docs/implementation-plan.md`
- **Added:** "Continuous Catalog Sync & Auto-Generation" section to Phase 1 — architecture diagram, scheduled scanner, new product detection & auto-queue, auto-publish confidence thresholds (≥90% auto, 70-89% badge, <70% review), freshness SLA targets, monitoring dashboard spec
- **Added:** New database fields on Product (`guideStatus`, `firstDetectedAt`, `lastScrapedAt`, `isNew`) and AIGenerationJob (`priority`, `triggeredBy`)
- **Added:** Handling for product updates, PDF changes, delistings, and new variants
- **Updated:** Infrastructure section — added scheduled scraping to background jobs

### `docs/master-plan.md`
- **Updated:** Priority 1 description to include "catalog stays permanently fresh"
- **Added:** 2 new key scenarios — "Always-fresh catalog" and "Zero-lag for new purchases"
- **Added:** 2 new success metrics — "Catalog freshness (time-to-guide)" and "New product coverage"

### `docs/design-guidelines.md`
- **Added:** "Product Freshness & Status Badges" section — 4 user-facing badges (New, AI-Generated, Guide Coming Soon, Verified) with styles
- **Added:** Studio-specific status indicators — guide status dots and time-to-guide color coding

### `docs/user-journeys.md`
- **Added:** Journey 2B: Continuous Catalog Sync — automated flow (scan → scrape → queue → generate → auto-publish), admin oversight (daily monitoring), user experience (same-day availability), edge cases
- **Updated:** Journey 2 edge case for "no assembly PDF" to reference auto-sync

### `docs/tasks.md`
- **Added:** Section 1.5 — 14 new tasks for catalog scanner, incremental scraping, auto-detection, auto-publish rules, new DB fields, PDF update detection, product delisting, freshness dashboard, error handling, "New" badge, "Guide Coming Soon" state, admin digest
- **Updated:** Section 1.6 (Database Changes) — added priority/triggeredBy to AIGenerationJob, autoPublishThresholds to AIGenerationConfig, new Product fields
- **Renumbered:** 1.6 → 1.7 (New Studio Routes), added `/studio/freshness` route

---

## 2026-02-11 — Sync #3: Design Guidelines + Nano Banana + Chat UI + Changelog

### `docs/design-guidelines.md`
- **Added:** Generation Models section under AI-Generated Illustrations — specifies Nano Banana (`gemini-2.5-flash-image`) for simple steps and Nano Banana Pro (`gemini-3-pro-image-preview`) for complex steps, with pricing, resolution options, and routing logic
- **Added:** Prompt Consistency section — shared style preamble, reference images for style anchoring, visual consistency checks between models
- **Updated:** Style: Isometric Technical section now specifies that consistency must hold across both Nano Banana models, with resolution guidance (2K minimum, 4K for fine detail)
- **Added:** AI Troubleshooting Chat component section — proactive bubble, guided intake chips, message bubbles (user/assistant), image attachments, typing indicator, step-by-step repair cards, part identification cards, escalation cards
- **Added:** Step complexity indicator to annotation standards table

### `docs/changelog.md`
- **Created:** This file. All future doc updates will be logged here.

---

## 2026-02-11 — Sync #2: Nano Banana Models + Phase 1 Blockers + Proactive Chatbot + Mobile Apps

### `docs/implementation-plan.md`
- **Fixed:** Illustration model names — replaced "Google Gemini (Imagen/Nano)" with correct Nano Banana (`gemini-2.5-flash-image`) and Nano Banana Pro (`gemini-3-pro-image-preview`) models
- **Added:** Cost-efficiency routing logic for illustration generation (auto-classify step complexity)
- **Added:** Phase 1 open issue (BLOCKER) — instruction writing guidelines and illustration creation guidelines must be provided by product owner before prompt fine-tuning
- **Added:** Proactive chatbot greeting and guided diagnostic intake flow to Phase 3
- **Added:** Phase 6: Native Mobile Apps (React Native/Expo, after customer validation, camera-first features)
- **Updated:** Pipeline reference from "Gemini" to "Nano Banana / Nano Banana Pro"

### `docs/master-plan.md`
- **Added:** Priority 5: Native Mobile Apps with 4 key scenarios
- **Added:** App installs and camera usage rate to success metrics

### `docs/user-journeys.md`
- **Rewrote:** Journey 5 steps 2-3 to include proactive prompt and guided diagnostic intake (structured starter questions)
- **Updated:** Alternative entry points to include proactive prompt variations (product page + homepage)

### `docs/tasks.md`
- **Added:** Phase 1 section 1.0 — 2 blocker tasks for instruction writing and illustration creation guidelines
- **Updated:** Illustration generation task to reference Nano Banana / Nano Banana Pro with model IDs and routing
- **Added:** 2 tasks in 1.3 for integrating writing and illustration guidelines into prompts
- **Added:** Proactive greeting and guided diagnostic intake tasks to Phase 3
- **Added:** Phase 6 — 16 new tasks for React Native setup, camera features, app screens, offline/push, app store deployment

---

## 2026-02-11 — Sync #1: AI Troubleshooting Assistant + Target Users + Key Scenarios

### `docs/master-plan.md`
- **Added:** "Post-purchase helplessness" pain point
- **Updated:** One-liner to include "even years after you bought it"
- **Added:** P2: Product Owners (Troubleshooters) as a new primary persona
- **Updated:** Pro Installers to include repair/troubleshooting callbacks
- **Added:** Mindset one-liners to each primary persona
- **Added:** Priority 3: AI Troubleshooting Assistant (shifted Community to Priority 4) with key scenarios
- **Added:** Key scenarios to Priority 1 (AI-Generated Guides), Priority 2 (Multi-Retailer Expansion), and Priority 4 (Community + AI Hybrid)
- **Added:** Troubleshooting Arc to emotional outcomes
- **Added:** AI assistant to premium tier features
- **Added:** Chatbot resolution rate and return visits to success metrics

### `docs/implementation-plan.md`
- **Added:** Phase 3: AI Troubleshooting Assistant (RAG pipeline, chat streaming, photo diagnosis, ChatSession/ChatMessage models, tiering)
- **Renumbered:** Premium → Phase 4, Multi-retailer → Phase 5

### `docs/user-journeys.md`
- **Added:** P2: Dana — Product Owner (Troubleshooter) persona
- **Updated:** Sam (Pro Installer) to include repair callbacks
- **Added:** Journey 5: Troubleshooting with AI Assistant (Dana's KALLAX fix story, alternative entry points, edge cases)
- **Added:** Troubleshooting chat to authentication touchpoints
- **Renumbered:** Subscription Upgrade → Journey 6

### `docs/tasks.md`
- **Added:** Phase 3: AI Troubleshooting Assistant — 17 tasks across chat infrastructure, product context/RAG, chat UI, smart features, and tiering
- **Renumbered:** Premium → Phase 4 (4.1-4.3), Multi-retailer → Phase 5 (5.1-5.2)

---

## 2026-02-11 — Initial Creation

### All 5 docs created from scratch via guided Q&A:
- `docs/master-plan.md` — Vision, problem, 4 personas, product categories, emotional outcome, roadmap (4 priorities), freemium + B2B business model, success metrics
- `docs/implementation-plan.md` — Current state, Phase 1 (AI guide generation with pilot-first approach), Phase 2 (Polish UX/SEO/performance), Phase 3 (Premium/Stripe), Phase 4 (Multi-retailer), infrastructure/DevOps
- `docs/design-guidelines.md` — Technical-bold style, amber/orange palette, Geist fonts, type scale, spacing, components (buttons, cards, guide viewer, forms, nav), isometric illustration style, responsive breakpoints, animation, iconography
- `docs/user-journeys.md` — 5 personas, 5 journeys (find & follow guide, AI generation pipeline, pro quick lookup, first-time onboarding, subscription upgrade), cross-journey patterns
- `docs/tasks.md` — 70+ tasks across 4 phases + ongoing/cross-cutting
