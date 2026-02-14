# Tasks — Guid (guid.how)

Auto-derived from master-plan.md, implementation-plan.md, design-guidelines.md, and user-journeys.md.

## How to Read This File

| Column | Description |
|--------|-------------|
| **ID** | Unique identifier: `P{phase}.{section}.{seq}` (e.g., `P1.2.4`) |
| **Status** | `done` = completed, `todo` = ready to work, `blocked` = has unmet dependencies |
| **Task** | Task title/name |
| **Description** | Full description of what needs to be done |
| **Depends** | Comma-separated IDs of tasks that must complete first. `—` if none |
| **Blocks** | Comma-separated IDs of tasks waiting on this one. `—` if none |

**Finding available work:** Filter for `todo` status — these tasks have all dependencies met and are ready to pick up. Tasks with `blocked` status cannot start until all items in their `Depends` column are `done`.

---

## Phase 1: AI Guide Generation

### 1.0 Open Issues (Blockers)

| ID | Status | Task | Description | Depends | Blocks |
|----|--------|------|-------------|---------|--------|
| P1.0.1 | blocked | Provide instruction writing guidelines | Product owner must provide detailed requirements for how AI-generated text instructions should be written: vocabulary level, sentence structure, terminology standards, part/tool references, measurement formatting, safety warnings, and accessibility for non-native English speakers. These guidelines drive all prompt engineering. | — | P1.3.6 |
| P1.0.2 | blocked | Provide illustration creation guidelines | Product owner must provide detailed requirements for how AI-generated isometric illustrations should look: level of detail, annotation style, color usage, motion/direction indicators, part highlighting, label placement, and consistency standards. These guidelines drive all illustration prompts. | — | P1.3.7 |

### 1.1 AI Infrastructure Setup

| ID | Status | Task | Description | Depends | Blocks |
|----|--------|------|-------------|---------|--------|
| P1.1.1 | done | Choose primary & secondary vision models + run benchmark | All-Gemini strategy validated. 20-page benchmark complete (5 manuals x 4 archetypes): Flash avg conf=0.82, Pro avg conf=0.92, Flash 14x cheaper. Escalation triggers tuned (arrows >=5, conf <0.7, JSON failure). Env vars and abstraction layer updated to Gemini 2.5 Flash/Pro. | — | P1.2.1, P1.2.2, P1.2.3 |
| P1.1.2 | done | Set up AI provider accounts | Gemini API + OpenAI API keys, rate limit config, cost tracking | — | P1.2.1, P1.2.2, P1.2.3 |
| P1.1.3 | done | Build PDF extraction pipeline | Extract individual pages from assembly PDFs as images using `pdf-lib` or `pdfjs-dist` | — | P1.2.1 |
| P1.1.4 | done | Create AI abstraction layer | Provider-agnostic interface for vision analysis (swap primary/secondary models easily) | — | P1.2.1, P1.2.2, P1.2.3 |
| P1.1.5 | done | Design structured output schema | Define the JSON structure for AI-generated guide data (steps, tools, parts, warnings, confidence scores) | — | P1.2.1, P1.2.2, P1.2.3 |

### 1.2 AI Generation Pipeline

| ID | Status | Task | Description | Depends | Blocks |
|----|--------|------|-------------|---------|--------|
| P1.2.1 | done | Build single-product generation endpoint | Server action: takes a product ID -> fetches PDF -> runs vision analysis -> returns structured guide data | P1.1.1, P1.1.2, P1.1.3, P1.1.4, P1.1.5 | P1.2.4, P1.2.6 |
| P1.2.2 | done | Implement step extraction logic | AI prompt that analyzes each PDF page and extracts: step number, instruction text, tools needed, parts referenced, warnings, screw directions | P1.1.1, P1.1.2, P1.1.4, P1.1.5 | P1.2.4 |
| P1.2.3 | done | Add confidence scoring | Each step gets a confidence score based on model certainty; flag low-confidence steps | P1.1.1, P1.1.2, P1.1.4, P1.1.5 | P1.2.4, P1.2.8 |
| P1.2.4 | done | Refactor step extraction to raw visual facts | Refactor `STEP_EXTRACTION_PROMPT` in `generate-guide.ts` to focus on raw visual extraction only: parts shown, actions depicted, spatial relationships, arrow directions, fastener types, annotations. Output factual structured JSON per page, not narrative prose. This prepares the pipeline for the continuity refinement pass. | P1.2.1, P1.2.2, P1.2.3 | P1.2.5 |
| P1.2.5 | done | Implement continuity refinement pass | After per-page visual extraction, add a second LLM pass (Flash text-only, no vision) that takes the full ordered sequence of extracted steps and generates human-readable instruction text with proper continuity. The pass must: (1) write each step's instruction with awareness of all prior steps, (2) detect and merge steps split across PDF pages, (3) add transition language between major assembly phases, (4) resolve forward/backward references ("Use the same Allen key from Step 2"), (5) maintain consistent part terminology throughout, and (6) reiterate safety warnings when relevant actions repeat. See implementation-plan.md "Step Continuity" section for full architecture rationale. | P1.2.4 | P1.2.8, P1.3.1 |
| P1.2.6 | done | Build illustration generation | Integrate Nano Banana (`gemini-2.5-flash-image`) for simple steps and Nano Banana Pro (`gemini-3-pro-image-preview`) for complex steps. Auto-classify step complexity based on part count and spatial relationships. | P1.2.1 | P1.2.7 |
| P1.2.7 | done | Implement illustration model routing | Cost-efficiency logic: route simple steps (single part, straightforward action) to Nano Banana (cheaper/faster), complex steps (exploded views, multi-part, fine annotations) to Nano Banana Pro (higher fidelity, ~$0.134/image) | P1.2.6 | P1.3.1 |
| P1.2.8 | done | Create quality check automation | Verify: step count matches PDF pages, all parts referenced, logical step sequence, no missing tools | P1.2.3, P1.2.5 | P1.3.1 |

### 1.3 Pilot & Refinement

| ID | Status | Task | Description | Depends | Blocks |
|----|--------|------|-------------|---------|--------|
| P1.3.1 | done | Select pilot products | Pick one product from each category: bookshelf, desk, bed frame, wardrobe, storage unit | P1.2.5, P1.2.7, P1.2.8 | P1.3.2 |
| P1.3.2 | done | Generate pilot guides | Run generation pipeline on all pilot products | P1.3.1 | P1.3.3, P1.3.6, P1.3.7 |
| P1.3.3 | done | Build review UI in Studio | Side-by-side view: original PDF (left) vs AI-generated guide (right), per step | P1.3.2 | P1.3.4, P1.7.2 |
| P1.3.4 | done | Add inline editing on review screen | Admin can edit instruction text, flag illustrations for regeneration, add notes | P1.3.3 | P1.3.5 |
| P1.3.5 | done | Implement feedback loop | Store reviewer corrections and notes; use them to refine prompts | P1.3.4 | P1.3.8 |
| P1.3.6 | todo | Integrate instruction writing guidelines | Apply the product owner's instruction writing requirements to the text generation prompts. Ensure output meets vocabulary, structure, and accessibility standards for non-native English speakers. | P1.0.1, P1.3.2 | P1.3.8 |
| P1.3.7 | todo | Integrate illustration guidelines | Apply the product owner's illustration creation requirements to the Nano Banana / Nano Banana Pro image generation prompts. Ensure output meets style, annotation, and consistency standards. | P1.0.2, P1.3.2 | P1.3.8 |
| P1.3.8 | todo | Iterate on prompts | Based on pilot review feedback, improve extraction accuracy for problem areas (cam locks, part orientation, screw direction) | P1.3.5, P1.3.6, P1.3.7 | P1.3.9 |
| P1.3.9 | done | Define quality gate | Set minimum confidence threshold and review pass rate required before batch processing | P1.3.8 | P1.4.1 |

### 1.4 Batch Processing

| ID | Status | Task | Description | Depends | Blocks |
|----|--------|------|-------------|---------|--------|
| P1.4.1 | done | Build job queue system | Database model: `AIGenerationJob` (queued/processing/review/approved/failed) | P1.3.9 | P1.4.2, P1.4.3, P1.4.5, P1.7.1 |
| P1.4.2 | done | Create batch processing dashboard | Studio page: queue overview, progress tracking, completion rates, failure reasons | P1.4.1 | — |
| P1.4.3 | done | Implement queue worker | Background process: picks jobs from queue, runs generation, respects rate limits, handles failures | P1.4.1 | P1.4.4, P1.5.1 |
| P1.4.4 | done | Add auto-publish for high-confidence guides | Guides above confidence threshold auto-publish; below threshold -> review queue | P1.4.3 | P1.5.4 |
| P1.4.5 | done | Build monitoring dashboard | Real-time stats: jobs completed, average confidence, failure rate, estimated completion time | P1.4.1 | — |

### 1.5 Monthly Catalog Sync & Auto-Generation

| ID | Status | Task | Description | Depends | Blocks |
|----|--------|------|-------------|---------|--------|
| P1.5.1 | done | Build monthly catalog sync | Vercel Cron or Inngest function that runs once per month (e.g., 1st of each month) per retailer. Performs a full catalog diff against the existing Product table to detect all new products. Also triggerable manually from Studio. | P1.4.3 | P1.5.2, P1.5.6, P1.5.7, P1.5.8, P1.5.11, P1.5.21 |
| P1.5.2 | done | Implement catalog diff logic | Each retailer adapter implements `detectNewProducts()` that compares the retailer's current catalog against the DB and returns products not yet present. Uses sitemaps, RSS feeds, or full category scraping. | P1.5.1 | P1.5.3 |
| P1.5.3 | done | Add new product auto-detection | When sync inserts a new product, check for assembly PDF in ProductDocuments. If PDF exists, auto-create `AIGenerationJob` with `priority: high` and `triggeredBy: auto_sync`. | P1.5.2, P1.5.5, P1.5.7 | P1.5.9 |
| P1.5.4 | done | Implement auto-publish rules | After pilot quality baselines are set: guides >= 90% confidence auto-publish immediately; 70-89% auto-publish with "AI-Generated" badge and flagged for review; < 70% enter review queue only. Thresholds configurable in `AIGenerationConfig`. | P1.4.4 | — |
| P1.5.5 | done | Add guideStatus field to Product | Enum: none/queued/generating/in_review/published/no_source_material. Track pipeline state per product. (Completed as part of P1.6.3 — Extend Product model.) | — | P1.5.3, P1.5.13, P1.5.20, P2.0.1 |
| P1.5.6 | done | Add firstDetectedAt/lastScrapedAt/isNew fields | Track when product was first found, last scraped, and whether it's new (< 30 days since detection). | P1.5.1 | P1.5.10, P1.5.12 |
| P1.5.7 | done | Add priority/triggeredBy to AIGenerationJob | Priority: high/normal/low. TriggeredBy: manual/auto_sync/batch. New products from monthly sync get high priority. (Completed as part of P1.6.1 — AIGenerationJob model already includes these fields.) | P1.5.1 | P1.5.3 |
| P1.5.8 | done | Handle assembly PDF updates | During monthly sync, detect when a product's assembly PDF has changed (hash comparison). Auto-queue regeneration job. Version the old guide. | P1.5.1 | — |
| P1.5.9 | done | Handle product delisting | During monthly sync, detect products no longer in retailer catalog. Mark as `discontinued: true`. Keep guides live. Show "This product has been discontinued" notice on product page. | P1.5.3 | — |
| P1.5.10 | done | Build catalog sync dashboard in Studio | New dashboard section: last sync date per retailer, new products this month, pending generation, auto-published count, review queue depth, time-to-guide distribution, failed scrapes, sync history log. | P1.5.6 | P1.7.4 |
| P1.5.11 | done | Add scraper error handling & retry | Failed scrapes retry with exponential backoff within the sync run. Persistent failures send webhook alert (Slack/email). Individual product failures don't block the batch. | P1.5.1 | — |
| P1.5.12 | done | Add "New" badge to product cards | Show "New" pill badge on products where `isNew: true` (first 30 days after detection). Amber pill, subtle pulse on first view. | P1.5.6 | — |
| P1.5.13 | done | Add "Guide in Progress" state | Product detail page shows "Guide being generated — check back shortly" with progress indicator when `guideStatus` is queued/generating. | P1.5.5 | — |
| P1.5.14 | done | Build "Submit a New Guide" CTA | For products with `guideStatus: no_source_material`, show a prominent CTA card on the product detail page inviting users to contribute assembly knowledge. Do NOT show "Guide Coming Soon" — without source material, guides depend on community input. | — | P1.5.15 |
| P1.5.15 | done | Build guide submission form | `/products/[articleNumber]/submit-guide` page: text instructions input, photo upload (drag-and-drop + camera on mobile, stored in Supabase Storage), video link fields, external resource link fields, optional tool list, estimated time, and difficulty rating. At least one content type required. | P1.5.14 | P1.5.16 |
| P1.5.16 | done | Add GuideSubmission model | id, productId, userId, status (pending/approved/rejected/needs_info/processing), textContent, photos (JSON), videoLinks (JSON), externalLinks (JSON), toolsList, estimatedTime, difficulty, reviewedBy, reviewNotes, reviewedAt, timestamps. Run `npx prisma db push`. | P1.5.15 | P1.5.17, P1.5.18, P1.5.19, P1.5.20 |
| P1.5.17 | done | Build submission review queue in Studio | `/studio/submissions` page: list all pending submissions with product name, submitter, content preview, timestamp. Admin can approve, reject, or request more info. Approved submissions become source material for AI-enhanced guide generation. | P1.5.16 | P1.5.18 |
| P1.5.18 | done | Build "Generate from submission" action | Server action that takes an approved GuideSubmission, feeds user text/photos into the AI pipeline to structure into a proper guide with formatted steps. Admin can edit before publishing. | P1.5.16, P1.5.17 | P1.5.19 |
| P1.5.19 | done | Add "Community Contributed" badge | Purple outline pill badge shown on guides created from user submissions. Include attribution to the original submitter. | P1.5.18 | — |
| P1.5.20 | done | Add submission_received to guideStatus | Update Product guideStatus to include `submission_received` for products where a user has submitted guide content. | P1.5.16 | — |
| P1.5.21 | done | Add post-sync admin notification | After each monthly sync completes, send summary email/webhook: new products detected, guides queued, auto-published count, items in review queue, any scraper failures. | P1.5.1 | — |
| P1.5.22 | done | Add manual single-product scrape | Studio action: admin can trigger a scrape + AI generation for a specific product URL without waiting for the next monthly sync (handles "user needs this product now" requests). | — | — |

### 1.6 Database Changes

| ID | Status | Task | Description | Depends | Blocks |
|----|--------|------|-------------|---------|--------|
| P1.6.1 | done | Add AIGenerationJob model | id, productId, status, modelPrimary, modelSecondary, inputPdfUrl, rawOutput, confidenceScore, qualityFlags, reviewedBy, reviewNotes, priority (high/normal/low), triggeredBy (manual/auto_sync/batch), timestamps | — | P1.2.1 |
| P1.6.2 | done | Add AIGenerationConfig model | id, name, version, promptTemplate, modelConfig, isActive, autoPublishThresholds (JSON: confidence cutoffs for auto/review/hold) | — | P1.7.3 |
| P1.6.3 | done | Extend Product model | Add guideStatus (enum), firstDetectedAt, lastScrapedAt, isNew (boolean), discontinued (boolean) fields | — | P1.5.5 |
| P1.6.4 | done | Run migration | `npx prisma db push` after schema changes | P1.6.1, P1.6.2, P1.6.3 | — |

### 1.7 New Studio Routes

| ID | Status | Task | Description | Depends | Blocks |
|----|--------|------|-------------|---------|--------|
| P1.7.1 | done | /studio/ai-generate dashboard | AI generation dashboard: start jobs, view queue, batch controls | P1.4.1 | — |
| P1.7.2 | done | /studio/ai-generate/[jobId] review | Single job review: side-by-side PDF vs guide, edit, approve/reject | P1.3.3 | — |
| P1.7.3 | done | /studio/ai-config management | Prompt template management, model configuration, version history | P1.6.2 | — |
| P1.7.4 | done | /studio/catalog-sync dashboard | Monthly catalog sync dashboard: last sync dates, new products per cycle, time-to-guide metrics, scraper health, sync history log, manual sync trigger | P1.5.10 | — |

---

## Phase 2: Polish Current Experience

### 2.0 Guide-First UX Architecture

| ID | Status | Task | Description | Depends | Blocks |
|----|--------|------|-------------|---------|--------|
| P2.0.1 | done | Guide-first routing on /products/[articleNumber] | When a product has a published guide (`guideStatus: published`), render the guide viewer as the primary view instead of the product detail page. When no published guide exists (queued, generating, in_review, no_source_material, none), fall back to the current product detail page. Use the Product model's `guideStatus` field for routing decisions. | — | P2.0.2, P2.0.3, P2.0.6, P2.0.7, P2.2.1 |
| P2.0.2 | done | Create /products/[articleNumber]/details route | Move the current product detail page (images, specs, ratings, documents, metadata, assembly PDF download) to this sub-route. This page is always accessible regardless of guide status. Linked from the guide viewer's Product Info Card. | P2.0.1 | P2.4.1 |
| P2.0.3 | done | Build Product Info Card for guide viewer | Compact card below the sticky illustration panel in the guide viewer's right column. Shows: product thumbnail (48px), product name, article number (JetBrains Mono), price, one key dimension, and a "View details ->" link to `/products/[articleNumber]/details`. Entire card clickable. On mobile, replaced by a small info icon in the guide header. | P2.0.1 | — |
| P2.0.4 | done | Add guide availability status badges | Product cards in search results and browse grid show guide status: green `Check` badge ("Guide Available") for published guides, amber `Loader2` badge ("Guide In Progress") for queued/generating, no badge for products without guides. Badge positioned top-right of card image area. | — | — |
| P2.0.5 | done | Update homepage hero to guide-centric messaging | Change homepage hero text to "Find step-by-step instructions for any product" or similar guide-centric copy. Emphasize finding guides and work instructions over browsing a product catalog. Keep "Browse Products" as the navigation label. | — | — |
| P2.0.6 | done | Update SEO meta tags for guide-first landing | When a guide exists, `/products/[articleNumber]` meta tags should be optimized for guide content: title "How to Assemble [Product] — Step-by-Step Guide | Guid", description focusing on the guide's step count, tools, and difficulty. When no guide exists, keep current product-focused meta tags. | P2.0.1 | — |
| P2.0.7 | done | Update internal navigation links | Audit all internal links that point to `/products/[articleNumber]` to ensure they work correctly with the new guide-first routing. Update breadcrumbs on the guide view and details page. | P2.0.1 | — |

### 2.1 Design System Update

| ID | Status | Task | Description | Depends | Blocks |
|----|--------|------|-------------|---------|--------|
| P2.1.1 | done | Migrate fonts to IBM Plex Sans + JetBrains Mono | Replace Geist Sans/Mono with IBM Plex Sans (primary) and JetBrains Mono (technical) via `next/font/google`. Update Tailwind fontFamily config. Update all components that reference font-family. | — | P2.1.4, P2.2.1 |
| P2.1.2 | done | Update color palette | Replace default neutral theme with amber/orange brand colors per design-guidelines.md. Add all tokens including `--background`, `--foreground`, `--card`, `--card-foreground`, `--border`, `--input`, `--ring`. Include hex fallbacks for older browsers. | — | P2.1.3, P2.1.5, P2.2.1 |
| P2.1.3 | done | Update CSS variables for light + dark mode | Set full oklch token mapping in globals.css for both `:root` and `.dark` classes. All 17 tokens must have both light and dark values per design-guidelines.md. | P2.1.2 | P2.1.6 |
| P2.1.4 | done | Audit typography | Ensure all pages follow the type scale (H1-H4, Body, Caption, Mono). Guide instructions use Body size with 1.7 line-height, max-width 72ch. Part numbers and measurements use JetBrains Mono. Apply fluid type scale with `clamp()` for headings. | P2.1.1 | — |
| P2.1.5 | done | Update button styles | Amber primary, warm gray secondary, per design guidelines. Add all interactive states (hover, active, focus-visible, disabled, loading). Add button sizes (sm, default, lg). Ensure 44px minimum touch targets. | P2.1.2 | — |
| P2.1.6 | done | Add dark mode toggle | Implement theme switcher with full warm dark palette per design-guidelines.md. Deep warm charcoal background, amber remains vibrant. | P2.1.3 | — |
| P2.1.7 | done | Add z-index, shadow, border-radius scales | Define CSS custom properties for the z-index scale (base through chat), shadow scale (sm through xl), and border-radius scale per design-guidelines.md. | — | — |
| P2.1.8 | done | Add accessibility foundations | Add skip links ("Skip to main content"), visible focus rings on all interactive elements, `prefers-reduced-motion` CSS override, `aria-label` on all icon-only buttons. Verify all color token pairings meet WCAG AA 4.5:1 contrast minimum. | — | — |

### 2.2 Guide Viewer UX — Three-Column Docs Layout

| ID | Status | Task | Description | Depends | Blocks |
|----|--------|------|-------------|---------|--------|
| P2.2.1 | done | Build three-column desktop layout | Implement the three-column guide viewer for >= 1024px: TOC sidebar (220px, sticky), work instructions (flex-grow, all steps on one scrollable page), illustration panel (380px, sticky). Max container width 1440px. Each step is a `<section>` with `aria-labelledby`. | P2.0.1, P2.1.1, P2.1.2 | P2.2.2, P2.2.3, P2.2.5, P2.2.7, P2.2.8, P2.2.9 |
| P2.2.2 | done | Implement scrollspy for TOC | Use Intersection Observer to track which step the user is currently viewing. Highlight the corresponding TOC item with amber left border, `--primary` text, font-weight 600. Completed steps show muted text + checkmark. Upcoming steps show normal weight. | P2.2.1 | P2.2.12, P2.2.13, P2.2.14, P2.2.15 |
| P2.2.3 | done | Build sticky illustration panel | Right panel fixed to viewport (`position: sticky`, `top: header-height + 1rem`). Displays illustration for the current step (via scrollspy). Crossfade transition (200ms ease-out) when swapping. If current step has no illustration, persist previous step's illustration. | P2.2.1 | P2.2.4 |
| P2.2.4 | done | Add click-to-zoom lightbox | Clicking an illustration opens a full-screen lightbox overlay (`z-modal`). Pinch-to-zoom on touch, scroll-wheel zoom on desktop. Close with Escape key or click-outside. | P2.2.3 | — |
| P2.2.5 | done | Build step instruction rendering | Render all steps on a single page with step headers (number in JetBrains Mono amber circle + title in H3), Body text at 1.7 line-height, max-width 72ch, `gap-12` between steps, `scroll-margin-top` for correct scrollspy landing. | P2.2.1 | P2.2.6 |
| P2.2.6 | done | Add tip/warning/info callouts | Styled callout boxes: Tip (yellow bg, Lightbulb icon), Warning (red bg, AlertTriangle icon), Info (blue bg, Info icon). Left border 3px colored, `rounded-lg`, `p-4`. | P2.2.5 | — |
| P2.2.7 | done | Add progress bar | Thin amber bar at top of guide page showing % of steps scrolled past. Smooth width animation (300ms ease-out). Amber fill, muted track. | P2.2.1 | — |
| P2.2.8 | done | Build tablet two-column layout | For 640-1024px: instructions (~60% width) + sticky illustration (~40%). TOC accessible via floating button that opens a Sheet (slide-in from left). | P2.2.1 | — |
| P2.2.9 | done | Build mobile step-by-step cards | For < 640px: one step per screen as a full-width card. Layout: progress bar (top), illustration (full-width 4:3), step header, instruction text, callouts, navigation buttons ("Previous" outline + "Next Step" primary, 48px height). | P2.2.1 | P2.2.10, P2.2.11, P2.7.2 |
| P2.2.10 | done | Add mobile swipe navigation | Swipe left for next step, swipe right for previous. 200ms slide transition with fade. Haptic feedback via `navigator.vibrate` if supported. | P2.2.9 | — |
| P2.2.11 | done | Add mobile TOC bottom sheet | Floating button (bottom-right, `List` icon) opens bottom sheet listing all steps with completion states. Tap any step to jump directly. | P2.2.9 | — |
| P2.2.12 | done | Add completion screen | At end of guide: "Guide Complete" heading, total steps, rating prompt (5-star, 48px touch targets), social share buttons (ghost style), sign-up CTA for anonymous users. Subtle checkmark animation (respects `prefers-reduced-motion`). | P2.2.2 | — |
| P2.2.13 | done | Add progress saving | For signed-in users, auto-save current scroll position / step number. On return: banner with "Welcome back! Continue from Step 14?" with "Resume" (primary) and "Start Over" (ghost) buttons. | P2.2.2 | — |
| P2.2.14 | done | Add step bookmarking | Save specific steps across different guides for quick reference. Useful for pro installers who bookmark tricky steps across products. | P2.2.2 | — |
| P2.2.15 | done | Add keyboard navigation | Arrow keys (left/right) for step navigation on desktop. Home/End jump to first/last step. Proper focus management and `aria-current="step"` on active TOC item. | P2.2.2 | — |

### 2.3 Search & Discovery

| ID | Status | Task | Description | Depends | Blocks |
|----|--------|------|-------------|---------|--------|
| P2.3.1 | done | Add search autocomplete | As user types (debounced 300ms), show top 5 matching products below search bar with thumbnail, name, article number. Click to navigate directly. | — | — |
| P2.3.2 | done | Add article number detection | If search input is numbers-only (e.g., "702.758.14"), prioritize exact `article_number` match as top result. | — | — |
| P2.3.3 | done | Add URL paste detection | If search input contains "http" or "ikea.com", extract article number from URL, redirect to product page. Show toast: "Detected IKEA product link — redirecting..." | — | — |
| P2.3.4 | done | Add recent searches | Show user's last 5 searches when search input is focused. localStorage for anonymous users, database for signed-in users. | — | — |
| P2.3.5 | done | Add zero-result handling | When no products match: "No products found for '[query]'" with suggestions: similar products (fuzzy match), category browsing links, "Request this product" link. | — | — |
| P2.3.6 | done | Add barcode/QR scanner | Camera button in search bar, scan barcode -> extract article number -> search (mobile only, requires camera permission) | — | — |
| P2.3.7 | done | Add photo-to-text OCR | Camera button: photograph product label -> OCR extracts name/number -> search | — | — |
| P2.3.8 | done | Add search analytics | Track popular queries, zero-result queries, click-through rates. Identify content gaps for catalog expansion. | — | — |

### 2.4 Product Detail Layout (/products/[articleNumber]/details)

| ID | Status | Task | Description | Depends | Blocks |
|----|--------|------|-------------|---------|--------|
| P2.4.1 | done | Add tabbed sections | Reorganize the product detail page (now at `/products/[articleNumber]/details`) into tabs: Overview (images, specs) | Documents (PDFs, manuals) | Related Products. The "Assembly Guide" tab is no longer needed here since the guide is the primary view at `/products/[articleNumber]`. Sticky tab bar on scroll. | P2.0.2 | P2.4.2, P2.4.3, P2.4.4 |
| P2.4.2 | done | Add image gallery lightbox | Click any product image to open full-screen lightbox with zoom (scroll wheel desktop, pinch mobile) and swipe between images. | P2.4.1 | — |
| P2.4.3 | done | Add spec table | Clean key-value table for product specifications: dimensions, weight, materials, color, article number. Mono font for measurements. | P2.4.1 | — |
| P2.4.4 | done | Add related products carousel | Horizontal scrollable row of related products at bottom (same category, similar price range). | P2.4.1 | — |

### 2.5 Performance

| ID | Status | Task | Description | Depends | Blocks |
|----|--------|------|-------------|---------|--------|
| P2.5.1 | done | Optimize image loading | Configure `next/image` with responsive `sizes` prop, serve 320w/640w/960w/1280w srcset. Blur-up placeholders for perceived performance. | — | — |
| P2.5.2 | done | Add lazy loading | All below-the-fold images use `loading="lazy"`. Only first 4 product cards and primary product image load eagerly. | — | — |
| P2.5.3 | done | Profile and optimize database queries | Enable Prisma query logging, identify slow queries (target: all product list queries under 200ms). Add composite indexes for `(category, current_price)`, `(category, average_rating)`, `(product_type, guide_status)`. | — | — |
| P2.5.4 | done | Optimize filter query builder | Review `product-filters.ts` for N+1 queries, unnecessary JOINs, suboptimal WHERE clause ordering. Ensure most selective filter applied first. | — | — |
| P2.5.5 | done | Implement ISR | Incremental Static Regeneration for product detail pages (`revalidate: 86400`). Pre-generate top 100 most-viewed product pages at build time. | — | — |
| P2.5.6 | done | Add edge caching | Cache product list API responses (`s-maxage=3600, stale-while-revalidate=86400`). Cache completed assembly guide data aggressively. | — | — |
| P2.5.7 | done | Add skeleton loading states | Skeleton screens with shimmer animation on product grid (card-shaped placeholders), product detail (image + text blocks), guide viewer (progress bar + instruction), and search results. | — | — |

### 2.6 SEO

| ID | Status | Task | Description | Depends | Blocks |
|----|--------|------|-------------|---------|--------|
| P2.6.1 | done | Add JSON-LD structured data | Product schema on product detail pages (name, image, brand, sku, offers). HowTo schema on guide pages (steps, tools, totalTime). BreadcrumbList on all pages. Organization schema on homepage. | — | — |
| P2.6.2 | done | Generate dynamic sitemap | Auto-generated `sitemap.xml` with all product and guide pages. Split into category-based sitemaps with sitemap index for 12,000+ URLs. Reference in `robots.txt`. | — | — |
| P2.6.3 | done | Add Open Graph meta tags | Per-page `og:title`, `og:description`, `og:image` (product's primary image), `og:url`. Enables rich previews on Facebook, LinkedIn. | — | — |
| P2.6.4 | done | Add Twitter Card meta tags | `twitter:card` (summary_large_image), `twitter:title`, `twitter:description`, `twitter:image`. | — | — |
| P2.6.5 | done | Add canonical URLs | Every page declares canonical URL to prevent duplicate content (especially with filter/sort URL params). | — | — |
| P2.6.6 | done | Audit heading hierarchy | Every page has exactly one H1, proper H1->H2->H3 hierarchy, no skipped levels. | — | — |
| P2.6.7 | done | Write unique meta per page | Unique `<title>` and `<meta description>` for every page. Products: "[Product] — Assembly Guide | Guid". Guides: "How to Assemble [Product] — Step-by-Step | Guid". | — | — |

### 2.7 Mobile Optimization

| ID | Status | Task | Description | Depends | Blocks |
|----|--------|------|-------------|---------|--------|
| P2.7.1 | done | Full responsive audit | Test all pages at 375px (iPhone SE), 390px (iPhone 14/15), 768px (iPad), 1024px, 1280px. Fix all layout breakage. | — | — |
| P2.7.2 | done | Mobile guide viewer audit | Verify mobile step-by-step card layout (built in 2.2) works at 375px and 390px. Illustration above text, 48px navigation buttons, swipe working. Bottom sheet TOC accessible. | P2.2.9 | — |
| P2.7.3 | done | Mobile search overlay | Full-screen search experience with recent searches, trending products, keyboard-optimized input. | — | — |
| P2.7.4 | done | Touch targets audit | All interactive elements meet 44px minimum. Increase padding on buttons, links, filter chips. | — | — |
| P2.7.5 | done | Bottom sheet patterns | Use slide-up bottom sheets on mobile for filter menus, sort options, step jump instead of dropdown menus. | — | — |
| P2.7.6 | done | Pull-to-refresh | On product list and guide pages for native-app feel. | — | — |

---

## Phase 3: AI Troubleshooting Assistant

### 3.1 Chat Infrastructure

| ID | Status | Task | Description | Depends | Blocks |
|----|--------|------|-------------|---------|--------|
| P3.1.1 | done | Add ChatSession model | id, userId (optional), productId (optional), status (active/resolved/abandoned), resolution (solved/unsolved/escalated), timestamps | — | P3.1.3 |
| P3.1.2 | done | Add ChatMessage model | id, sessionId, role (user/assistant), content, imageUrl (optional), createdAt | — | P3.1.3 |
| P3.1.3 | done | Run migration | `npx prisma db push` after schema changes | P3.1.1, P3.1.2 | P3.1.4 |
| P3.1.4 | done | Build streaming chat API | `/api/chat` endpoint with Server-Sent Events for streaming AI responses | P3.1.3 | P3.2.1, P3.3.1 |
| P3.1.5 | done | Choose conversational AI model | Decided: All-Gemini strategy. Gemini 2.5 Flash (primary, streaming chat) + Gemini 2.5 Pro (escalation for complex troubleshooting/photo diagnosis). Reuses existing abstraction layer, rate limiter, cost tracker. Streaming via `streamGenerateContent` SSE endpoint. Updated implementation-plan.md. | — | P3.1.4, P3.2.4 |

### 3.2 Product Context & RAG

| ID | Status | Task | Description | Depends | Blocks |
|----|--------|------|-------------|---------|--------|
| P3.2.1 | done | Build product context assembler | Given a product ID, compile: product metadata, assembly guide steps, document summaries, care instructions, materials, key facts into a structured context block | P3.1.4 | P3.2.4 |
| P3.2.2 | done | Implement product identification from chat | Extract product name/article number from user's first message, match to database, confirm with user | P3.1.4 | P3.3.6 |
| P3.2.3 | done | Build document context extraction | Parse and chunk ProductDocument PDFs (parts lists, care guides) for retrieval | — | P3.2.1 |
| P3.2.4 | done | Create system prompt template | Product-specific system prompt with all context, troubleshooting persona, step-by-step guidance style | P3.1.5, P3.2.1 | P3.3.1 |

### 3.3 Chat UI

| ID | Status | Task | Description | Depends | Blocks |
|----|--------|------|-------------|---------|--------|
| P3.3.1 | done | Build chat component | Message bubbles (user/assistant), text input, send button, streaming response display. 13 files: types.ts, message-bubble.tsx, chat-input.tsx, typing-indicator.tsx, greeting-bubble.tsx, intake-chips.tsx, diagnostic-intake.tsx, image-preview.tsx, chat-header.tsx, message-list.tsx, chat-panel.tsx, use-chat.ts, index.ts | P3.1.4, P3.2.4 | P3.3.2, P3.3.3, P3.3.4, P3.3.5, P3.3.6, P3.3.7, P3.3.8, P3.4.2, P3.4.3, P3.4.4, P3.5.1 |
| P3.3.2 | done | Build proactive greeting | Floating chat bubble (z-chat layer) with 3s delay, localStorage dismissal, animated entrance (respects prefers-reduced-motion), contextual product greeting | P3.3.1 | — |
| P3.3.3 | done | Build guided diagnostic intake | 4-phase intake flow: product ID -> problem category chips -> timing chips -> optional photo. State machine pattern with discriminated union IntakePhase type. | P3.3.1 | — |
| P3.3.4 | done | Add image upload to chat | Camera capture, file input, drag-drop via ChatInput. ImagePreview component for thumbnail before send. Base64 encoding for API transmission. | P3.3.1 | P3.4.1 |
| P3.3.5 | done | Build /chat page | Full-page chat at /chat with SEO metadata, ChatPageClient wrapper using useChat hook, centered max-w-2xl layout, guided intake starts immediately | P3.3.1 | — |
| P3.3.6 | done | Build product page chat widget | ProductChatWidget component: FAB with GreetingBubble, fixed side panel (desktop) / bottom sheet (mobile), product context pre-loaded skipping product intake phase, backdrop overlay, dynamic import in product page (both guide-first and fallback branches) | P3.3.1, P3.2.2 | — |
| P3.3.7 | done | Add conversation history | MessageList with scroll-to-top detection for infinite history loading, auto-scroll on new messages | P3.3.1 | — |
| P3.3.8 | done | Add typing indicator | Three pulsing dots with chat-dot keyframe, motion-safe animation, aria-label for screen readers | P3.3.1 | — |

### 3.4 Smart Features

| ID | Status | Task | Description | Depends | Blocks |
|----|--------|------|-------------|---------|--------|
| P3.4.1 | done | Part identification from photos | User uploads photo of a broken/missing part -> AI identifies the part name, number, and where to buy replacements | P3.3.4 | — |
| P3.4.2 | done | Intent detection | Detect if user wants assembly help (redirect to guide) vs troubleshooting (stay in chat) | P3.3.1 | — |
| P3.4.3 | done | Escalation flow | If AI can't resolve: generate a pre-filled issue summary for the user to send to manufacturer support | P3.3.1 | — |
| P3.4.4 | done | Maintenance reminders | After resolving a chat, offer to save the product and set periodic maintenance reminders | P3.3.1 | — |

### 3.5 Tiering & Limits

| ID | Status | Task | Description | Depends | Blocks |
|----|--------|------|-------------|---------|--------|
| P3.5.1 | done | Implement free tier limit | 3 troubleshooting chats per month for free users | P3.3.1 | P3.5.2 |
| P3.5.2 | done | Track chat usage | Count chats per user per billing period | P3.5.1 | P3.5.3 |
| P3.5.3 | done | Build upgrade prompt | When free limit reached, show premium upgrade modal with chat-specific value prop | P3.5.2 | — |

---

## Phase 4: Premium Subscription

### 4.1 Stripe Integration

| ID | Status | Task | Description | Depends | Blocks |
|----|--------|------|-------------|---------|--------|
| P4.1.1 | done | Install Stripe SDK | `npm install stripe @stripe/stripe-js` | — | P4.1.2 |
| P4.1.2 | done | Create Stripe products/prices | Free, Premium ($X/mo), Premium Annual ($Y/yr) | P4.1.1 | P4.1.3 |
| P4.1.3 | done | Build Checkout endpoint | API route that creates Stripe Checkout session | P4.1.2 | P4.1.4, P4.4.2 |
| P4.1.4 | done | Build webhook handler | Handle `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` | P4.1.3 | P4.1.5 |
| P4.1.5 | done | Add subscription field to User | `subscriptionTier` (free/premium), `stripeCustomerId`, `subscriptionEndsAt` | P4.1.4 | P4.1.6, P4.4.3, P4.4.4, P6.5.3 |
| P4.1.6 | done | Build middleware | Check subscription status for premium-gated features | P4.1.5 | P4.3.1, P4.3.2, P4.3.3, P4.4.5 |

### 4.2 YouTube Creator Video Integration

| ID | Status | Task | Description | Depends | Blocks |
|----|--------|------|-------------|---------|--------|
| P4.2.1 | done | Add CreatorProfile model | id, userId, youtubeChannelUrl, youtubeChannelId, channelName, subscriberCount (cached), isVerified, totalVideos, totalHelpfulVotes, timestamps. Run migration. | — | P4.2.3 |
| P4.2.2 | done | Add VideoSubmission model | id, productId, creatorId, youtubeUrl, youtubeVideoId, title, description, language, stepsCovered (JSON), status (pending/approved/rejected), helpfulVotes, unhelpfulVotes, reviewedBy, reviewNotes, timestamps. Run migration. | — | P4.2.4 |
| P4.2.3 | done | Build creator registration flow | `/creators/register` page: sign up as creator, link YouTube channel (URL input + manual verification or OAuth), create CreatorProfile. | P4.2.1 | P4.2.4, P4.2.7 |
| P4.2.4 | done | Build video submission form | `/creators/submit` page: select product (search), paste YouTube URL (auto-extract video ID and thumbnail), add title, description, language. One product can have multiple videos. | P4.2.2, P4.2.3 | P4.2.5 |
| P4.2.5 | done | Build video review queue in Studio | `/studio/videos` page: list pending video submissions with product name, creator info, YouTube thumbnail preview. Admin approve/reject with notes. | P4.2.4 | P4.2.6 |
| P4.2.6 | done | Build video display on product detail | Embedded YouTube player on product page (in "Video Guides" tab). Creator attribution strip: channel name, subscriber count, "Was this helpful?" thumbs up/down. | P4.2.5 | P4.2.8 |
| P4.2.7 | done | Build creator profile page | `/creators/[id]` page: channel info, subscriber count, all submitted and approved videos, total helpfulness score. | P4.2.3 | — |
| P4.2.8 | done | Add helpfulness voting | Thumbs up/down on video cards. Sort videos by helpfulness rating. Track votes per user to prevent abuse. | P4.2.6 | — |

### 4.3 Other Premium Features

| ID | Status | Task | Description | Depends | Blocks |
|----|--------|------|-------------|---------|--------|
| P4.3.1 | done | Offline guide access (PWA) | Service worker caching for saved guides (PWA) | P4.1.6 | — |
| P4.3.2 | done | Ad-free experience | Conditional ad rendering based on subscription | P4.1.6 | — |
| P4.3.3 | done | Priority AI guides | "Request a guide" button: premium users' requests are prioritized in the AI queue | P4.1.6 | — |

### 4.4 Premium UI

| ID | Status | Task | Description | Depends | Blocks |
|----|--------|------|-------------|---------|--------|
| P4.4.1 | done | Build pricing page | `/pricing` with plan comparison table | — | P4.4.2 |
| P4.4.2 | done | Build upgrade flow | "Upgrade" button -> Stripe Checkout -> success redirect | P4.1.3, P4.4.1 | — |
| P4.4.3 | done | Build billing management | `/account/billing` with Stripe Customer Portal link | P4.1.5 | — |
| P4.4.4 | done | Add premium badges | Show premium badge on profile and in navigation | P4.1.5 | — |
| P4.4.5 | done | Add premium gate modals | Tasteful modals when free users hit premium features | P4.1.6 | — |

---

## Phase 5: Multi-Retailer Expansion

### 5.1 Retailer Adapter Framework

| ID | Status | Task | Description | Depends | Blocks |
|----|--------|------|-------------|---------|--------|
| P5.1.1 | done | Design adapter interface | Create a `RetailerAdapter` interface with standard methods: `detectNewProducts()`, `scrapeProduct()`, `scrapeCategory()`, `extractDocuments()`, `extractImages()`, `getRateLimitConfig()`, `getRobotsRules()`. Document the interface contract. | — | P5.1.2, P5.1.5, P5.1.6, P5.1.7, P5.1.8, P5.3.1 |
| P5.1.2 | done | Refactor IKEA scraper into adapter | Extract the existing IKEA scraper logic into an `IkeaAdapter` class that implements `RetailerAdapter`. Validate that monthly sync still works with the adapter pattern. | P5.1.1 | P5.1.4, P5.1.9 |
| P5.1.3 | done | Add Retailer model | id, name, slug, logoUrl, baseUrl, adapterType, isActive, lastSyncAt, nextSyncAt, affiliateConfig (JSON), rateLimitConfig (JSON), timestamps. Run migration. | — | P5.1.4, P5.5.2, P5.5.5 |
| P5.1.4 | done | Build adapter registry | Central registry that maps retailer slugs to adapter implementations. Used by monthly sync to iterate all active retailers. | P5.1.2, P5.1.3 | P5.1.5, P5.1.6, P5.1.7, P5.1.8, P5.4.1, P5.5.1, P5.5.3, P5.5.4 |
| P5.1.5 | done | Build Wayfair adapter | Implement `RetailerAdapter` for Wayfair. Handle: product APIs, variant explosion (normalize to single product per unique assembly), brand extraction from multi-seller listings. | P5.1.1, P5.1.4 | P5.1.9, P5.6.2 |
| P5.1.6 | done | Build Home Depot adapter | Implement `RetailerAdapter` for Home Depot. Handle: multi-tab product pages (main -> specifications -> documents), nested spec extraction via Playwright. | P5.1.1, P5.1.4 | P5.1.9 |
| P5.1.7 | done | Build Amazon adapter | Implement `RetailerAdapter` using Amazon Product Advertising API (PA-API 5.0) instead of scraping. Handle: ASIN extraction, rate limits (1 req/sec), limited assembly PDF availability. | P5.1.1, P5.1.4 | P5.1.9, P5.6.1 |
| P5.1.8 | done | Build Target adapter | Implement `RetailerAdapter` for Target. Handle: SPA rendering via Playwright, DPCI extraction, embedded JSON-LD data extraction. | P5.1.1, P5.1.4 | P5.1.9 |
| P5.1.9 | done | Adapter validation pipeline | For each new adapter: scrape 100 test products -> verify data quality (images load, prices parsed, categories mapped) -> full catalog scrape -> integrate into monthly sync. | P5.1.2, P5.1.5, P5.1.6, P5.1.7, P5.1.8 | — |

### 5.2 Product Deduplication & Matching

| ID | Status | Task | Description | Depends | Blocks |
|----|--------|------|-------------|---------|--------|
| P5.2.1 | done | Add cross-retailer fields to Product | `manufacturerSku` (String?), `upcEan` (String?), `matchGroupId` (String?), `matchConfidence` (Float?). Run migration. | — | P5.2.2, P5.2.3 |
| P5.2.2 | done | Build exact matching | Match products across retailers by manufacturer SKU, UPC/EAN barcode, or article number. Highest confidence level. | P5.2.1 | P5.2.4 |
| P5.2.3 | done | Build fuzzy matching | Match by product name + brand + key dimensions similarity scoring. Threshold: >= 0.85 similarity score. Flag low-confidence matches (< 0.7) for admin review. | P5.2.1 | P5.2.4 |
| P5.2.4 | done | Build admin match management | Studio page: view auto-detected matches, confirm/reject fuzzy matches, manually link products across retailers. | P5.2.2, P5.2.3 | P5.2.5 |
| P5.2.5 | done | Build unified product page | When a product is matched across retailers: single product page with aggregated images, "Available at" section with each retailer's price and buy link, shared assembly guide. | P5.2.4 | P5.5.6 |

### 5.3 Data Normalization

| ID | Status | Task | Description | Depends | Blocks |
|----|--------|------|-------------|---------|--------|
| P5.3.1 | done | Build normalization layer | Each adapter's `scrapeProduct()` returns raw retailer data -> normalization layer maps to Prisma Product fields using retailer-specific rules (field name mapping, currency conversion, category mapping). | P5.1.1 | P5.3.2, P5.3.3 |
| P5.3.2 | done | Currency normalization | All prices stored in USD. Convert at scrape time using cached exchange rate (refresh daily). Store original price and currency for reference. | P5.3.1 | — |
| P5.3.3 | done | Category mapping | Map each retailer's category taxonomy to Guid's unified categories. Maintain a mapping table per retailer, editable in Studio. | P5.3.1 | — |

### 5.4 URL Detection & Routing

| ID | Status | Task | Description | Depends | Blocks |
|----|--------|------|-------------|---------|--------|
| P5.4.1 | done | Build URL detection engine | When user pastes a URL in search: detect retailer from domain, extract product ID using retailer-specific regex patterns (IKEA article number, Amazon ASIN, Wayfair SKU, Home Depot product ID, Target DPCI). | P5.1.4 | P5.4.2 |
| P5.4.2 | done | URL-to-product routing | Detected retailer + product ID -> look up in DB -> if found, redirect to Guid product page -> if not found, offer to queue a scrape. | P5.4.1 | — |

### 5.5 Platform Changes

| ID | Status | Task | Description | Depends | Blocks |
|----|--------|------|-------------|---------|--------|
| P5.5.1 | done | Add retailer filter | Filter products by retailer on `/products`. Show retailer logo pills for quick filtering. | P5.1.4 | — |
| P5.5.2 | done | Add retailer branding | Small retailer logo badge on product cards and detail pages. Non-intrusive, builds user trust. | P5.1.3 | — |
| P5.5.3 | done | Extend image config | Add `remotePatterns` in `next.config.ts` for each new retailer's image CDN domains (Wayfair, Amazon, Home Depot, Target). | P5.1.4 | — |
| P5.5.4 | done | Build retailer landing pages | `/retailers/wayfair`, `/retailers/amazon`, etc. Browse all products from a specific retailer. SEO value for "[Retailer] assembly guides" searches. | P5.1.4 | — |
| P5.5.5 | done | Build retailer management in Studio | Admin page: manage retailer adapters, enable/disable, configure scrape frequency, view health metrics per retailer, trigger manual sync. | P5.1.3 | — |
| P5.5.6 | done | Add price comparison section | On unified product pages with multiple retailers: side-by-side price comparison with direct buy links. | P5.2.5 | — |

### 5.6 Affiliate Revenue Setup

| ID | Status | Task | Description | Depends | Blocks |
|----|--------|------|-------------|---------|--------|
| P5.6.1 | done | Integrate Amazon Associates | Add affiliate tracking parameters to Amazon buy links. Track clicks and conversions. | P5.1.7 | P5.6.3, P5.6.4 |
| P5.6.2 | done | Integrate Wayfair affiliate | Same for Wayfair affiliate program. | P5.1.5 | P5.6.3, P5.6.4 |
| P5.6.3 | done | Add affiliate disclosure | FTC-compliant disclosure on product pages: "As an Amazon Associate, Guid earns from qualifying purchases." | P5.6.1, P5.6.2 | — |
| P5.6.4 | done | Build affiliate analytics | Track clicks, conversions, and revenue per retailer, per product, per user source. Dashboard in Studio. | P5.6.1, P5.6.2 | — |

---

## Phase 6: Native Mobile Apps (iOS & Android)

### 6.1 React Native Setup

| ID | Status | Task | Description | Depends | Blocks |
|----|--------|------|-------------|---------|--------|
| P6.1.1 | done | Initialize Expo project | Create React Native app with Expo, TypeScript, and Expo Router | — | P6.1.2, P6.1.3, P6.1.4, P6.1.5, P6.2.1, P6.2.2, P6.2.3, P6.2.4, P6.4.2, P6.5.4 |
| P6.1.2 | done | Set up design system | Port Guid amber/technical design tokens (colors, typography, spacing) to React Native StyleSheet | P6.1.1 | P6.3.1, P6.3.2, P6.3.3 |
| P6.1.3 | done | Implement auth flow | JWT token storage via Expo SecureStore, login/register screens, shared auth with web backend | P6.1.1 | P6.3.5 |
| P6.1.4 | done | Build navigation structure | Tab navigator (Home, Search, Chat, Profile) + stack navigators for detail screens | P6.1.1 | P6.3.1 |
| P6.1.5 | done | Connect to existing API | Configure API client to call the same Next.js API routes as the web app | P6.1.1 | P6.3.1, P6.4.3 |

### 6.2 Native Camera Features

| ID | Status | Task | Description | Depends | Blocks |
|----|--------|------|-------------|---------|--------|
| P6.2.1 | done | Barcode/QR scanner | Native camera integration for scanning product barcodes and QR codes from box labels | P6.1.1 | P6.3.1 |
| P6.2.2 | done | Photo capture for OCR | Photograph product name/article number from labels -> OCR extraction -> product search | P6.1.1 | P6.3.1 |
| P6.2.3 | done | Photo capture for troubleshooting | In-chat photo capture -> send directly to AI assistant for visual diagnosis | P6.1.1 | P6.3.4 |
| P6.2.4 | done | Product recognition (future) | Photograph the assembled product itself -> AI identifies the product | P6.1.1 | — |

### 6.3 Core App Screens

| ID | Status | Task | Description | Depends | Blocks |
|----|--------|------|-------------|---------|--------|
| P6.3.1 | done | Home screen | Search bar, popular guides, recent products, proactive chat prompt | P6.1.2, P6.1.4, P6.1.5 | P6.5.1, P6.5.2 |
| P6.3.2 | done | Product detail screen | Native version of product page with image gallery, guide launcher, chat button | P6.1.2 | — |
| P6.3.3 | done | Guide viewer screen | Full-screen step-by-step viewer optimized for mobile: swipe navigation, pinch-to-zoom illustrations | P6.1.2 | P6.4.1 |
| P6.3.4 | done | Chat screen | Native chat UI with guided diagnostic intake, image upload from camera roll or live capture | P6.2.3 | — |
| P6.3.5 | done | Profile screen | Saved products, completed guides, chat history, subscription management | P6.1.3 | — |

### 6.4 Offline & Push

| ID | Status | Task | Description | Depends | Blocks |
|----|--------|------|-------------|---------|--------|
| P6.4.1 | done | Offline guide caching | Download guide steps and illustrations for offline use (premium feature) | P6.3.3 | — |
| P6.4.2 | done | Push notification setup | Expo Notifications for maintenance reminders, new guide alerts, chat responses | P6.1.1 | — |
| P6.4.3 | done | Sync engine | Queue offline actions (guide progress, saved products) and sync when back online | P6.1.5 | — |

### 6.5 App Store Deployment

| ID | Status | Task | Description | Depends | Blocks |
|----|--------|------|-------------|---------|--------|
| P6.5.1 | done | Apple App Store submission | App review, screenshots, description, keywords (ASO) | P6.3.1 | — |
| P6.5.2 | done | Google Play Store submission | Same preparation for Android | P6.3.1 | — |
| P6.5.3 | done | In-App Purchase integration | Apple/Google billing for premium subscription (required by store policies) | P4.1.5 | — |
| P6.5.4 | done | Deep linking | `guid.how/products/[id]` opens in app if installed, falls back to web | P6.1.1 | — |

---

## Ongoing / Cross-Cutting

### Infrastructure

| ID | Status | Task | Description | Depends | Blocks |
|----|--------|------|-------------|---------|--------|
| P0.1.1 | done | Set up Vercel deployment | Connect repo, configure environment variables, deploy | — | P0.1.2 |
| P0.1.2 | done | Set up preview deployments | Auto-deploy PRs to preview URLs | P0.1.1 | — |
| P0.1.3 | done | Add error tracking (Sentry) | Sentry integration for runtime error monitoring | — | — |
| P0.1.4 | done | Set up CI (GitHub Actions) | GitHub Actions: lint, type check, build on every PR | — | — |

### Security

| ID | Status | Task | Description | Depends | Blocks |
|----|--------|------|-------------|---------|--------|
| P0.2.1 | done | Audit auth flow | Review NextAuth config for vulnerabilities | — | — |
| P0.2.2 | done | Add rate limiting | Rate limit API routes (auth, search, AI generation) | — | — |
| P0.2.3 | done | Validate all inputs | Server-side validation on all API routes and server actions | — | — |
| P0.2.4 | done | Secure AI API keys | Ensure API keys are only in server-side env, never exposed to client | — | — |

### Analytics

| ID | Status | Task | Description | Depends | Blocks |
|----|--------|------|-------------|---------|--------|
| P0.3.1 | done | Add Vercel Analytics | Page views, performance metrics | — | — |
| P0.3.2 | done | Track guide engagement | Steps viewed, completion rate, time per step, drop-off points | — | — |
| P0.3.3 | done | Track search patterns | What users search for, zero-result queries, discovery method usage | — | — |

### Review Backlog (from 2026-02-13 team session)

Items flagged by the Critic agent during the parallel team session. Should be addressed before starting new feature work.

#### IMPORTANT (fix before next deploy)

| ID | Status | Task | Description | Depends | Blocks |
|----|--------|------|-------------|---------|--------|
| P0.4.1 | done | Fix dark mode hardcoded colors across Studio pages | 10+ files use hardcoded light-mode Tailwind colors (`bg-red-50`, `text-green-600`, `bg-gray-50`) without `dark:` variants. Replace with semantic design tokens (`bg-muted`, `bg-destructive/10`) or add `dark:` variants. Files: `studio/ai-generate/page.tsx`, `studio/ai-generate/monitoring/page.tsx`, `studio/ai-generate/batch-enqueue.tsx`, `studio/ai-generate/single-enqueue.tsx`, `studio/ai-generate/feedback/page.tsx`, `studio/ai-generate/[jobId]/step-review-card.tsx`, `studio/ai-config/config-actions.tsx`, `studio/ai-config/config-form.tsx`, `studio/layout.tsx` | — | — |
| P0.4.2 | done | Fix queue/cron API dual auth pattern | `/api/queue/process` and `/api/cron/process-queue` allow unauthenticated access when `CRON_SECRET` is not set. Both routes need dual auth: accept admin session (for Studio dashboard buttons) OR CRON_SECRET Bearer token (for Vercel Cron). Pattern: `const isAdmin = session?.user?.role === "admin"; const hasCronSecret = cronSecret && authHeader === Bearer ${cronSecret}; if (!isAdmin && !hasCronSecret) return 401`. | — | — |
| P0.4.3 | done | Wrap queue process route fail path in $transaction | In `/api/queue/process/route.ts` (~lines 110-122), the job status update and product `guide_status` update are separate Prisma calls. If the product update fails, the job is marked failed but `guide_status` stays at "generating" forever. Wrap both in `prisma.$transaction()` to match the cron route pattern. | — | — |

#### SUGGESTION (address when convenient)

| ID | Status | Task | Description | Depends | Blocks |
|----|--------|------|-------------|---------|--------|
| P0.4.4 | done | Add loop guard to ProcessAllButton | `ProcessAllButton` in `studio/ai-generate/queue-controls.tsx` has a `while (!stopRef.current)` loop with no max iteration guard. Add `MAX_ITERATIONS = 500` or a timeout to prevent infinite loops on unexpected API responses. | — | — |
| P0.4.5 | done | Add focus trap to gallery lightbox | `src/components/gallery-lightbox.tsx` doesn't trap focus — Tab key can reach elements behind the backdrop. Add focus trapping (e.g., `inert` attribute on background content or a focus-trap library) for proper modal accessibility. | — | — |
| P0.4.6 | done | Replace animate-spin with motion-safe:animate-spin | Tailwind's `animate-spin` does not respect `prefers-reduced-motion`. Replace with `motion-safe:animate-spin` in 2 files: `src/components/pull-to-refresh.tsx` (RefreshCw icon) and `src/components/product-detail-tabs.tsx` (carousel "Coming Soon" Loader2 badge). | — | — |
| P0.4.7 | done | Replace fragile autoPublished heuristic in monitoring | `studio/ai-generate/monitoring/page.tsx` uses `reviewNotes.contains("Auto-published")` to count auto-published vs reviewed guides. This couples to the exact string in `auto-publish.ts`. Consider adding a dedicated `autoPublished: Boolean` field to the AIGenerationJob model, or add a code comment linking these. | — | — |
| P0.4.8 | done | Add label elements to login/register form inputs | `src/app/login/page.tsx` and `src/app/register/page.tsx` use `placeholder` text only — no associated `<label>` or `aria-label` on form inputs. Add proper `<Label htmlFor="...">` elements (can be `sr-only` if visual labels aren't desired) per WCAG form accessibility requirements. | — | — |

