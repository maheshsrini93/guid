# Changelog — Guid Project Docs

All notable changes to the project documentation (`docs/`) are logged here. Newest entries first.

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
