# Implementation Plan — Guid (guid.how)

## Current State (What's Built)

### Stack
- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **Database:** Supabase PostgreSQL via Prisma v6
- **Auth:** NextAuth v5 (beta) with credentials provider, JWT sessions
- **Deployment target:** Vercel

### Implemented Features
- Product browsing with search, filters, sort, and pagination (12,961 IKEA products)
- Product detail pages with image gallery, documents, and assembly guide viewer
- User auth (register/login) with saved products
- Admin studio: dashboard, product catalog, guide CRUD with step editor
- Assembly guide viewer with step-by-step progress

### Database
- **Scraper tables (read-only):** Product, ProductImage, ProductDocument, ScrapeUrl
- **App tables:** User, Session, SavedProduct, AssemblyGuide, AssemblyStep

### Key Files
| Path | Purpose |
|------|---------|
| `prisma/schema.prisma` | Database schema |
| `src/lib/prisma.ts` | Prisma singleton |
| `src/lib/auth.ts` | NextAuth config |
| `src/lib/actions/guides.ts` | Guide CRUD server actions |
| `src/lib/product-filters.ts` | Filter query builder |
| `src/components/assembly-guide-viewer.tsx` | Step-by-step guide UI |

---

## Guide-First Navigation Architecture

Guid's UX is **guide-centric**: clicking a product takes the user directly to the step-by-step work instructions, not a product detail page. Product metadata is secondary, accessible from within the guide viewer via a compact Product Info Card.

### Routing Logic

**`/products/[articleNumber]`** — Primary route. Behavior depends on guide availability:

| Guide Status | What the User Sees |
|---|---|
| **Published** | Guide viewer (three-column layout with work instructions as the primary view). Product Info Card in the right column links to full details. |
| **Queued / Generating / In Review** | Product detail page (fallback) with "Guide being generated" status indicator. |
| **No Source Material** | Product detail page (fallback) with "Submit a New Guide" CTA. |
| **Submission Received** | Product detail page (fallback) with submission status. |
| **No guide of any kind** | Product detail page (fallback). |

**`/products/[articleNumber]/details`** — Full product detail page. Always available. Shows all product metadata: images, specs, ratings, documents, assembly PDF download, product description. Linked from the guide viewer's Product Info Card.

### Product Info Card (Guide Viewer — Right Column)

When the guide viewer is shown, a compact Product Info Card sits in the right column below the sticky illustration panel:

- Product thumbnail image (48px, rounded)
- Product name and article number (JetBrains Mono)
- Key specs (2-3 lines: dimensions, price, category)
- Small icon/button: "View all details →" linking to `/products/[articleNumber]/details`

The card gives users just enough product context without leaving the guide. For full details (all images, ratings, documents, metadata), users click through to the details page.

### Product Cards (Search/Browse Results)

Product cards in the search results and browse grid include a **guide availability status indicator**:

| Indicator | Meaning |
|---|---|
| **Green badge ("Guide Available")** | Published guide exists — clicking leads directly to guide |
| **Amber badge ("Guide In Progress")** | Guide being generated — clicking leads to product page (fallback) |
| **No indicator** | No guide — clicking leads to product page |

Clicking any product card navigates to `/products/[articleNumber]`, which routes based on guide availability (see table above).

### Homepage & Navigation

- Homepage hero messaging: **"Find step-by-step instructions for any product"** (guide-centric, not catalog-centric)
- Navigation label: **"Browse Products"** (kept as-is — products are the organizing unit, guides are the primary content)
- Overall app language emphasizes finding guides and work instructions over browsing a product catalog

### SEO Landing

When users arrive via search engines (e.g., "KALLAX assembly instructions"), they land on `/products/[articleNumber]` and see the guide viewer directly (if a guide exists). This is the primary SEO landing experience — no extra click needed to start following instructions.

---

## Phase 1: AI Guide Generation (Next)

### Approach: Pilot-First with Quality Gates

The AI guide system follows a **test-refine-review** loop before scaling:

1. **Pilot selection** — Pick one product from each variety/category (e.g., one bookshelf, one desk, one bed frame, one wardrobe)
2. **AI generation** — Process each pilot product's assembly PDF through the AI pipeline
3. **Quality review** — Human review of generated guides against the original PDF
4. **Refinement** — Tune prompts, model parameters, and post-processing based on review feedback
5. **Quality gate** — Once pilot guides reach the target quality bar, lock the pipeline config
6. **Batch processing** — Queue-based bulk generation for all remaining products using the finalized pipeline

### AI Architecture

#### Multi-Model Strategy

| Role | Model | API Model ID | Purpose |
|------|-------|-------------|---------|
| **Primary vision model** | Gemini 2.5 Pro | `gemini-2.5-pro` | Highest accuracy for diagram interpretation + structured extraction from PDFs. Best at tiny arrows, Torx/fastener nuance, orientation, hinge/drawer-slide alignment. Used for complex/ambiguous pages and escalations from Flash. |
| **Secondary vision model** | Gemini 2.5 Flash | `gemini-2.5-flash` | Cost-efficient bulk processing — panel detection, step segmentation, JSON→human instructions formatting, rule checks, and simple/clean pages. Default model; escalates to Pro when triggers hit. |
| **Illustration generation (complex)** | Nano Banana Pro (Gemini 3 Pro Image) | `gemini-3-pro-image-preview` | High-fidelity isometric technical illustrations for complex assembly steps — advanced reasoning, up to 4K resolution, precise text rendering |
| **Illustration generation (simple)** | Nano Banana (Gemini 2.5 Flash Image) | `gemini-2.5-flash-image` | Faster, cheaper illustrations for simpler steps — optimized for high-volume batch generation |

**Illustration model selection (cost-efficiency approach):**
- **Nano Banana Pro** (`gemini-3-pro-image-preview`) for complex steps: exploded views, multi-part assemblies, steps requiring precise spatial relationships or fine text annotations. ~$0.134/image (1K-2K), ~$0.24/image (4K). 50% discount via Batch API.
- **Nano Banana** (`gemini-2.5-flash-image`) for simple steps: single-part placement, tool usage close-ups, straightforward actions. Faster and cheaper for high-volume generation.
- Complexity is determined during the vision analysis phase — the pipeline auto-classifies each step as simple/complex based on part count, spatial relationships, and annotation requirements.

**Vision model selection criteria:** The primary vision model must excel at:
- Reading fine-grained assembly diagram details (screw direction, clockwise vs. anti-clockwise)
- Identifying part orientation (which side faces up, where holes align)
- Distinguishing between similar-looking hardware (different screw types, dowels, cam locks)
- Understanding spatial relationships in exploded-view diagrams
- Detecting fastener ambiguity (Torx vs Philips, "tight vs loose" indicators)
- Interpreting hinge/drawer-slide alignment, rotation, and mirrored steps

**Model routing policy (Flash-first + Pro-on-fail):**

The pipeline defaults to **Gemini 2.5 Flash** for all pages and escalates to **Gemini 2.5 Pro** only when specific triggers are detected. This keeps Pro usage to ~10–25% of pages while protecting accuracy.

| Pipeline Stage | Model | Purpose |
|----------------|-------|---------|
| PDF ingest + render | — | Render pages at high resolution and crop panels (improves accuracy more than model swapping) |
| Panel detection / step segmentation | Flash | Detect panels, group into steps, extract obvious part IDs/quantities |
| Per-page visual extraction → structured JSON | Flash (default) → Pro (escalation) | Extract raw visual facts per page (parts, actions, spatial relationships). Escalate to Pro when triggers hit (see below) |
| Continuity refinement + instruction generation | Flash (text-only) | Takes the full ordered step sequence, rewrites instructions with narrative flow, consistent terminology, cross-step references, and transition language. See "Step Continuity" section below. |
| Rule checks | Flash | Validate schema + consistency (counts match parts list, step references exist, no "teleporting" parts) |

**Escalation triggers (Flash → Pro) — tuned from 20-page benchmark:**
- Multiple arrows/overlays (≥ 5) in one panel — raised from ≥ 3 after benchmark showed most IKEA pages have 3-4 arrows normally
- Hinge/drawer-slide alignment, rotation, or mirrored steps
- Fastener ambiguity (Torx vs Philips; "tight vs loose" indicator)
- Low confidence (< 0.7) or self-reported uncertainty from Flash
- Flash fails to produce valid JSON output
- Flash ↔ rule-checker disagreement

**20-page benchmark (completed 2026-02-12):**

Tested 5 IKEA manuals (MALM bed frame, HEMNES drawer unit, HELMER cabinet, MICKE desk, BILLY shelf) × 4 archetypes per manual = 20 pages. Both models tested with identical prompts.

| Metric | Flash | Pro |
|--------|-------|-----|
| **Success rate** | 20/20 | 20/20 |
| **Avg latency** | 15.2s | 22.2s (1.5x) |
| **Avg cost/page** | $0.0005 | $0.0076 (14x) |
| **Total cost (20 pages)** | $0.011 | $0.151 |
| **Avg confidence** | 0.82 | 0.92 |
| **JSON parse rate** | 17/20 | 19/20 |

**By archetype:**

| Archetype | Flash conf | Pro conf | Escalation rate |
|-----------|------------|----------|-----------------|
| Parts/Fasteners Legend | 0.99 | 0.98 | 2/5 |
| Simple 1-Action Step | 0.78 | 0.96 | 3/5 |
| Multi-Panel w/ Rotation | 0.78 | 0.97 | 5/5 |
| Tricky Mechanism | 0.75 | 0.78 | 5/5 |

**Key findings:** Flash handles parts legends perfectly (~$0.0003/page). Pro provides meaningful uplift on multi-panel and complex pages (0.78→0.97 confidence). Both struggle equally on genuinely ambiguous mechanism pages. With tuned triggers (arrows ≥ 5), estimated Pro escalation drops from 75% to ~25-35%.

**Cost projection (2,800 products × ~20 pages = 56,000 pages):** Flash-only: ~$30. Pro-only: ~$423. Hybrid (25% Pro): ~$127.

**Model decision history:** Originally benchmarked Gemini 2.0 Flash vs GPT-4o (2026-02-12, 10 IKEA PDFs). Decided to go all-Gemini (dropping OpenAI GPT-4o) and upgrade to Gemini 2.5 generation. Second benchmark (2026-02-12, 20 pages) validated Flash-first + Pro-on-fail with tuned escalation triggers.

#### Pipeline

```
[Assembly PDF]
    → PDF page extraction (render pages at high resolution, crop panels)
    → Panel detection & step segmentation (Flash: detect panels, group into steps)
    → Per-page visual extraction → structured JSON (Flash default, escalate to Pro on triggers)
    → Step sequence assembly (merge all pages into ordered step list)
    → Continuity refinement pass (Flash text-only: rewrite instructions with full sequence context)
    → Rule checks (Flash: validate schema, counts, step references, consistency)
    → Guide assembly (compile into AssemblyGuide + AssemblyStep records)
    → Illustration generation (Nano Banana / Nano Banana Pro creates new diagrams per step)
    → Quality score (automated checks: completeness, sequence logic, part coverage)
    → Human review queue (admin reviews in Studio before publishing)
```

#### Step Continuity: Two-Pass Extraction + Instruction Generation

Assembly instructions are inherently sequential — each step builds on the previous one. A good "Step 14" instruction depends on knowing what was accomplished in steps 1–13. The pipeline uses a **two-pass approach** to ensure this continuity while keeping vision analysis focused and accurate.

**Pass 1: Per-Page Visual Extraction (vision model, per page — current implementation)**

Each PDF page is analyzed independently by the vision model. The prompt focuses on extracting **raw visual facts**: what parts are shown, what actions are depicted, spatial relationships, arrow directions, fastener types, and annotations. This is where the vision model excels — reading fine-grained visual details from a single image without needing narrative context from other pages.

The per-page extraction outputs structured JSON: step numbers, part references (with quantities), tool usage, spatial actions, screw directions, and confidence indicators. This data is factual, not narrative — it describes what's **shown on the page**, not how to explain it to a person.

**Pass 2: Continuity-Aware Instruction Generation (text model, full sequence — to be implemented)**

After all pages are extracted, a second LLM pass takes the **complete ordered sequence** of extracted steps and generates human-readable instructions with proper narrative flow. This pass:

1. **Receives the full step sequence** as a single context — all extracted data from Pass 1, in order
2. **Writes flowing instructions** — Each step's instruction text is written with awareness of what came before: _"Now that you've attached the side panels (Step 3), insert the shelf pins into the pre-drilled holes..."_
3. **Detects and merges split steps** — A step that spans two PDF pages is consolidated into a single coherent step
4. **Adds transition language** — Bridges between major assembly phases: _"With the frame assembled, you'll now add the shelves and back panel"_
5. **Resolves forward/backward references** — _"Use the same Allen key from Step 2"_ or _"These dowels are the ones from the parts overview"_
6. **Maintains consistent terminology** — Ensures the same part is called the same name throughout (not "cam lock" in step 3 and "round metal fastener" in step 12)
7. **Preserves safety context** — If a warning in step 5 relates to an action that repeats in step 18, the warning is reiterated or referenced

**Why two passes instead of sequential context passing (page N gets context from pages 1..N-1)?**

- **Vision models perform best on focused prompts** — Adding prior step text to a vision prompt dilutes attention from the image. Keeping Pass 1 image-only means higher extraction accuracy.
- **No error propagation** — If page 3's extraction has an error, it doesn't cascade into pages 4+. The continuity pass can fix inconsistencies across the whole sequence.
- **Much cheaper** — Pass 2 is text-only (no vision), so it costs a fraction of a vision call. For a 20-page guide, the continuity pass costs ~$0.001 vs ~$0.01 for 20 vision calls.
- **Parallelizable** — Per-page extraction can be parallelized in the future (rate limits permitting). Sequential context passing forces strict serial processing.
- **Full-sequence visibility** — The continuity pass sees the entire guide at once, enabling global optimizations like consistent terminology and cross-step references that sequential passing can't achieve.

**Implementation:** Pass 2 uses Flash (text-only, no image input) with a prompt that receives all extracted step data as structured JSON and outputs rewritten instruction text for each step. For large guides (30+ steps), the full context comfortably fits within Flash's context window. The output replaces the raw `instruction` field from Pass 1 while preserving all other extracted data (parts, tools, confidence, etc.).

#### Quality Control

- **Automated checks:** Step count matches PDF pages, all referenced parts exist, no missing tools, logical sequence
- **Confidence scoring:** Each generated step gets a confidence score; low-confidence steps get flagged for human review
- **A/B comparison:** Show AI guide next to original PDF in Studio for side-by-side review
- **Feedback loop:** Admin corrections feed back into prompt refinement

### New Database Models (Planned)

```
AIGenerationJob
  - id, productId, status (queued/processing/review/approved/failed)
  - modelPrimary, modelSecondary
  - inputPdfUrl, rawOutput (JSON)
  - confidenceScore, qualityFlags
  - reviewedBy, reviewNotes
  - createdAt, completedAt

AIGenerationConfig
  - id, name, version
  - promptTemplate, modelConfig (JSON)
  - isActive (only one active config at a time)
```

### New Routes (Planned)

| Route | Purpose |
|-------|---------|
| `/products/[articleNumber]/details` | Full product detail page (moved from `/products/[articleNumber]` — see Guide-First Navigation Architecture) |
| `/studio/ai-generate` | AI generation dashboard — start jobs, view queue |
| `/studio/ai-generate/[jobId]` | Review a single AI-generated guide vs. original PDF |
| `/studio/ai-config` | Manage prompt templates and model configuration |

### API Integrations

- **Google Gemini API** — Vision analysis (Gemini 2.5 Flash + Pro) + illustration generation (Nano Banana / Nano Banana Pro)
- **PDF processing** — `pdf-lib` or `pdfjs-dist` for page extraction and image conversion

### Continuous Catalog Sync & Auto-Generation

The AI pipeline (above) handles guide generation for known products. This section covers keeping the product catalog **up to date** — a monthly sync checks each retailer's latest product catalog for new additions, scrapes them, runs them through the AI pipeline, and makes guides available to users before the next buying cycle.

**Goal:** Every product in a retailer's current catalog has a guide on Guid. New products added to retailer catalogs are picked up in the next monthly sync and have guides published shortly after.

#### Architecture

```
[Retailer Catalog]
    → Monthly catalog sync (Vercel Cron or Inngest, runs once per month)
    → Full catalog diff (compare retailer's current catalog against DB)
    → New products detected → scrape and insert into Product table, flag as "new"
    → Has assembly PDF? → auto-create AIGenerationJob (status: queued, priority: high)
    → AI pipeline processes all new jobs in batch
    → High-confidence guides → auto-publish
    → Low-confidence guides → enter admin review queue
    → All new product pages + guides live on Guid
```

#### Monthly Catalog Sync

The sync runs **once per month** per retailer, performing a full catalog comparison to detect all new and updated products since the last sync.

| Component | Detail |
|-----------|--------|
| **Trigger** | Vercel Cron job or Inngest scheduled function, once per month (e.g., 1st of each month). Can also be triggered manually from Studio. |
| **Detection method** | Compare retailer's full product catalog against the existing Product table. Use sitemaps, RSS feeds, or API endpoints where available. Fall back to paginated category scraping. Identify all products present in the retailer catalog but absent from the DB. |
| **Scope** | Each retailer adapter implements a `detectNewProducts()` method that returns a list of product URLs/IDs not yet in the database |
| **Rate limiting** | Respectful scraping: honor robots.txt, randomized delays, rotating user agents, max concurrent requests per retailer. Monthly cadence means scraping volume is spread across a single run rather than many small runs. |
| **Error handling** | Failed scrapes retry with exponential backoff. Persistent failures alert via webhook (Slack/email). Individual product failures don't block the batch. |

#### New Product Detection & Auto-Queue

When the scanner inserts a new product into the database:

1. **Check for assembly PDF** — Does the product have a `ProductDocument` with `document_type = 'assembly'`?
2. **Auto-create AI job** — If yes, create an `AIGenerationJob` with `status: queued` and `priority: high` (new products get priority over backfill)
3. **No PDF?** — Mark product as `guide_status: no_source_material`. Product page is still live (with images, specs, documents). Do **not** show "Guide Coming Soon" — without source material, we cannot create a guide ourselves. Instead, show a **"Submit a New Guide"** button that invites users to contribute their own assembly knowledge. See [Community Guide Submissions](#community-guide-submissions) below.
4. **Notification** — Notify admins after each monthly sync completes: summary of new products found, guides queued, and any issues encountered

#### Auto-Publish Rules

After the pilot phase establishes quality baselines, high-confidence guides skip the review queue:

| Confidence Score | Action |
|-----------------|--------|
| **≥ 90%** | Auto-publish immediately. Guide is live on the product page. |
| **70-89%** | Auto-publish with "AI-Generated" badge. Flag for admin review within 48 hours. |
| **< 70%** | Do NOT auto-publish. Enter admin review queue. Product page shows "Guide in review." |

These thresholds are configurable in `AIGenerationConfig`.

#### Freshness SLA Targets

| Metric | Target |
|--------|--------|
| **Sync cadence** | Once per month per retailer (configurable — can increase frequency later if needed) |
| **Detection completeness** | ≥ 98% of new products in retailer catalog detected per sync cycle |
| **AI generation time** | All new product guides generated within 72 hours of sync completing |
| **End-to-end time-to-guide** | New product in retailer catalog → guide live on Guid within one monthly sync cycle + 72 hours |
| **Coverage rate** | ≥ 95% of products with assembly PDFs have a published guide within 1 week of sync |

#### Freshness Monitoring Dashboard (Studio)

A new section in the Studio dashboard showing catalog health:

- **Last sync date** — When each retailer was last synced, and when the next sync is scheduled
- **New products this month** — Count of products detected and ingested in the latest sync
- **Pending guide generation** — Products detected but guide not yet generated
- **Auto-published this cycle** — Guides that passed confidence threshold and went live after the latest sync
- **In review queue** — Low-confidence guides awaiting admin review
- **Time-to-guide distribution** — Histogram showing how long it takes from sync detection → published guide
- **Failed scrapes** — Products that couldn't be scraped, with error details and retry status
- **Sync history** — Log of past sync runs with stats: products found, new products, failures, duration

#### New Database Fields (on existing models)

```
Product (extend existing)
  - guideStatus     Enum (none/queued/generating/in_review/published/no_source_material/submission_received)
  - firstDetectedAt DateTime  (when the scraper first found this product)
  - lastScrapedAt   DateTime  (when this product was last successfully scraped)
  - isNew           Boolean   (true for first 30 days after detection — drives "New" badge)

AIGenerationJob (extend planned model)
  - priority        Enum (high/normal/low)  — new products get "high"
  - triggeredBy     Enum (manual/auto_sync/batch)  — tracks whether job was auto-created
```

#### Handling Product Updates (Not Just New Products)

The sync system also handles changes to existing products:

- **Updated assembly PDF** — If a product's assembly PDF changes (new version), auto-queue a regeneration job
- **Price/availability changes** — Update product metadata during monthly sync
- **Product delisted** — Mark as `discontinued: true` in the database. Keep the guide live (users still own the product and need the guide), but add a "This product has been discontinued" notice.
- **Product variant added** — Detect when a product gets new color/size variants. Create separate product entries if they have different assembly instructions.

### Community Guide Submissions

For products **without an assembly PDF** (either existing products in the database or newly synced products with `guide_status: no_source_material`), users can contribute their own assembly knowledge through a **"Submit a New Guide"** feature. This replaces the previous "Guide Coming Soon" concept — if there's no manufacturer manual, we rely on community input as the seed material.

#### User Submission Flow

```
[Product page without guide]
    → User clicks "Submit a New Guide"
    → Submission form opens (text instructions, photo uploads, video links, external resources)
    → User fills out and submits
    → Submission enters admin review queue (status: pending)
    → Admin reviews for quality and relevance
    → If approved: use submission as source material for AI-enhanced guide generation
    → AI pipeline structures user content into a proper guide (with admin editing)
    → Guide published with "Community Contributed" attribution
```

#### What Users Can Submit

Users can provide **any combination** of the following:

- **Text instructions** — Step-by-step written instructions or freeform assembly notes
- **Photo uploads** — Step photos, part close-ups, diagrams, annotated images (stored in Supabase Storage)
- **Video links** — YouTube URLs or other video platform links showing the assembly process
- **External resource links** — Blog posts, forum threads, or other online guides they've found helpful
- **Metadata** — Tool list, estimated assembly time, difficulty rating

All fields are optional except at least one content type (text, photo, or link) must be provided.

#### Admin Review Pipeline

1. **Submission arrives** — Admin gets notified; submission appears in Studio review queue
2. **Quality check** — Admin reviews for:
   - Relevance: does this match the product?
   - Completeness: enough content to create a usable guide?
   - Accuracy: are the instructions correct? (cross-reference with product specs)
3. **Decision:**
   - **Approve** → Submission becomes source material for AI generation. The AI pipeline takes the user's text/photos and structures them into a formatted guide with proper steps, illustrations, and tool lists. Admin can edit before publishing.
   - **Request more info** → Admin sends feedback to the submitter asking for clarification or additional content.
   - **Reject** → Submission doesn't meet quality bar. Admin provides reason.
4. **Publication** — Guide publishes with "Community Contributed" badge and attribution to the original submitter.

#### New Database Model

```
GuideSubmission
  - id, productId, userId
  - status (pending/approved/rejected/needs_info/processing)
  - textContent (freeform text instructions)
  - photos (JSON array of uploaded image URLs)
  - videoLinks (JSON array of video URLs)
  - externalLinks (JSON array of resource URLs)
  - toolsList (optional), estimatedTime (optional), difficulty (optional)
  - reviewedBy, reviewNotes, reviewedAt
  - createdAt, updatedAt
```

#### New Route

| Route | Purpose |
|-------|---------|
| `/products/[articleNumber]/submit-guide` | Guide submission form — user provides assembly knowledge |
| `/studio/submissions` | Admin review queue for community guide submissions |

#### Applying to Existing Products

This feature also applies to the **~10,000+ existing products** already in the database that don't have assembly PDFs. These product pages will show the "Submit a New Guide" button, enabling the community to fill gaps in guide coverage over time.

### Open Issues & Blockers

> **BLOCKER: Instruction Writing Guidelines & Illustration Style Guide**
>
> Before prompt fine-tuning can begin, the product owner must provide detailed requirements for:
>
> 1. **Instruction writing guidelines** — The rules for how AI-generated text instructions should be written. This includes: vocabulary level, sentence structure, terminology standards, how to reference parts and tools, formatting for measurements and quantities, handling of safety warnings, and accessibility for non-native English speakers. These guidelines are the foundation for prompt engineering.
>
> 2. **Illustration creation guidelines** — The rules for how AI-generated isometric technical illustrations should look. This includes: level of detail, annotation style, color usage, how to show motion/direction, part highlighting conventions, label placement, and consistency standards across all guides.
>
> These two sets of guidelines are **the key to the entire application's quality**. The AI prompts for both instruction generation and illustration generation will be built directly from these requirements. Without them, the pilot phase cannot produce meaningful quality benchmarks.
>
> **Status:** Waiting for product owner input. Remind when Phase 1 development begins.

---

## Phase 2: Polish Current Experience

Phase 2 transforms the functional MVP into a polished, performant product. Every area gets attention — the goal is that a user's first visit feels professional, fast, and delightful.

### UX Improvements

#### Responsive Design & Mobile Optimization
- **Full responsive audit** — Test all pages at 375px (iPhone SE), 390px (iPhone 14/15), 768px (iPad), 1024px (laptop), 1280px (desktop). Fix layout breakage at each breakpoint.
- **Mobile guide viewer** — Card-based step-by-step experience: one step per screen, illustration above instruction text, large touch targets (48px), swipe left/right between steps, floating TOC button opens bottom sheet.
- **Mobile search overlay** — Full-screen search experience on mobile with recent searches, trending products, and keyboard-optimized input.
- **Touch targets** — Audit all interactive elements for 44px minimum touch target. Increase padding on buttons, links, and filter chips that don't meet the threshold.
- **Bottom sheet patterns** — Use bottom sheets (slide-up panels) on mobile for filter menus, sort options, and step jump navigation instead of dropdown menus that don't work well on small screens.
- **Pull-to-refresh** — On product list and guide pages for a native-app feel.

#### Loading States & Skeleton Screens
- **Product grid skeleton** — Card-shaped placeholders with shimmer animation matching the exact layout of real product cards (image area + 3 text lines + price).
- **Product detail skeleton** — Image gallery placeholder, text block placeholders for title/description/specs, button placeholders.
- **Guide viewer skeleton** — Step indicator placeholder (vertical bar with circles), instruction text placeholder, illustration frame placeholder.
- **Search results skeleton** — Show immediately on search input, replace with real results as they load.
- **Progressive image loading** — Blur-up placeholder technique: show a tiny (20px) blurred version of the image while the full image loads, then crossfade.

#### Search & Discovery
- **Search autocomplete** — As the user types (debounced 300ms), show top 5 matching products below the search bar with product thumbnail, name, and article number. Click to navigate directly.
- **Article number detection** — If the search input is numbers-only (e.g., "702.758.14"), prioritize exact `article_number` match and show it as the top result.
- **URL paste detection** — If search input contains "http" or "ikea.com", extract the article number from the URL, redirect to the product page. Show a toast: "Detected IKEA product link — redirecting..."
- **Recent searches** — Show the user's last 5 searches when the search input is focused (stored in localStorage for anonymous users, in the database for signed-in users).
- **Zero-result handling** — When no products match: "No products found for '[query]'" with suggestions: similar products (fuzzy match), category browsing links, and a "Request this product" link.
- **Search analytics** — Track popular queries, zero-result queries, and click-through rates to identify content gaps and inform catalog expansion.

#### Product Detail Layout (`/products/[articleNumber]/details`)

With the guide-first navigation, the product detail page moves to `/products/[articleNumber]/details` and no longer needs an "Assembly Guide" tab (the guide is the primary view at the parent route).

- **Tabbed sections** — Organize the product detail page into tabs: Overview (images, specs, key facts) | Documents (PDFs, manuals) | Related Products.
- **Sticky tab bar** — Tab bar sticks to the top of the viewport on scroll so users can switch sections without scrolling back up.
- **Image gallery lightbox** — Click any product image to open a full-screen lightbox with zoom (scroll wheel on desktop, pinch on mobile) and swipe navigation between images.
- **Spec table** — Clean key-value table for product specifications: dimensions, weight, materials, color, article number. Mono font for measurements.
- **Related products carousel** — Horizontal scrollable row of related products at the bottom of the page (same category, similar price range).

#### Guide Viewer UX — Three-Column Docs Layout

The guide viewer is completely redesigned as a **three-column documentation-style layout** (inspired by sites like Ark UI). Instead of paginated step-by-step cards, all work instructions are on a single scrollable page with synchronized navigation and illustrations.

**Desktop (≥ 1024px):** Three columns — TOC sidebar (left, sticky, scrollspy), work instructions (center, scrollable, all steps), illustration panel (right, sticky, swaps with scroll).
**Tablet (640–1024px):** Two columns — instructions + sticky illustration. TOC accessible via floating button/sheet.
**Mobile (< 640px):** Step-by-step cards — one step per screen with swipe navigation. TOC via bottom sheet.

Key features:
- **Scrollspy TOC** — Left sidebar tracks user's scroll position via Intersection Observer. Current step highlighted, completed steps grayed with checkmark, upcoming steps normal weight.
- **Sticky illustration panel** — Right panel fixed to viewport, illustration crossfades to match the current step. If a step has no illustration, the previous step's illustration persists.
- **Inline callouts** — Tip (yellow/lightbulb), Warning (red/alert), Info (blue/info) callout boxes within instructions.
- **Click-to-zoom** — Illustrations open in a lightbox overlay. Pinch-to-zoom on touch.
- **Completion experience** — At end of guide: rating prompt, social sharing, sign-up CTA. No confetti (subtle checkmark animation, respects `prefers-reduced-motion`).
- **Progress saving** — For signed-in users, automatically save current scroll position / step number. On return: "Welcome back! Continue from Step 14?"
- **Step bookmarking** — Save specific steps across different guides for quick reference (pro installer use case).
- **Dark mode** — Full dark mode support. Illustrations maintain white background with border in dark mode. See design-guidelines.md for full dark mode token mapping.
- **Keyboard navigation** — Arrow keys navigate steps. Home/End jump to first/last. Focus management for accessibility.

### Performance

#### Image Optimization
- **next/image optimization** — All product images served via `next/image` with automatic format negotiation (WebP on supported browsers, AVIF where available). Configured `sizes` prop for responsive image loading.
- **Lazy loading** — All below-the-fold images use native lazy loading via `loading="lazy"`. Only the first 4 product cards and the primary product image load eagerly.
- **Blur-up placeholders** — Generate tiny (20px wide) blurred placeholder images for all product photos. Display during load, crossfade to full image.
- **Responsive srcset** — Serve images at 320w, 640w, 960w, 1280w based on device viewport. Don't send 1280px images to mobile phones.

#### Database Query Optimization
- **Query profiling** — Enable Prisma query logging in development to identify slow queries. Target: all product list queries under 200ms.
- **Composite indexes** — Add indexes for common filter combinations: `(category, current_price)`, `(category, average_rating)`, `(product_type, guide_status)`. These cover 80%+ of filtered product browsing.
- **Filter query builder optimization** — Review `product-filters.ts` for N+1 queries, unnecessary JOINs, and suboptimal WHERE clause ordering. Ensure the most selective filter is applied first.
- **Connection pool tuning** — Review pgbouncer configuration for optimal pool size. Monitor connection usage under load.

#### Static Generation & Caching
- **ISR for product pages** — Incremental Static Regeneration for product detail pages. `revalidate: 86400` (24 hours) for stable products. Products with active guide generation revalidate more frequently.
- **Edge caching for product lists** — Cache product list API responses at the edge using `Cache-Control: s-maxage=3600, stale-while-revalidate=86400`. Product data changes infrequently.
- **Assembly guide caching** — Cache completed assembly guide data aggressively (guides change rarely once published). Use `stale-while-revalidate` for seamless background updates.
- **Static generation for popular products** — Pre-generate the top 100 most-viewed product pages at build time for fastest possible load times.

### SEO

#### Structured Data (JSON-LD)
- **Product schema** — On product detail pages: `name`, `image`, `description`, `brand`, `sku`, `offers` (price, availability, priceCurrency). Enables rich product results in Google.
- **HowTo schema** — On assembly guide pages: `name`, `step` (array with text and image), `tool`, `supply`, `totalTime`, `estimatedCost`. Enables rich how-to results and Google's step-by-step carousel.
- **BreadcrumbList schema** — On all pages with breadcrumbs. Improves search result display.
- **Organization schema** — On homepage: brand name, logo, URL, social profiles.

#### Sitemap & Indexing
- **Dynamic sitemap.xml** — Auto-generated sitemap with all product pages (`/products/[articleNumber]`) and guide pages. Updated on each build or via ISR.
- **Sitemap index** — For large catalogs (12,000+ products), split into category-based sitemaps with a sitemap index file. Keeps individual sitemap files under the 50,000 URL / 50MB limit.
- **robots.txt** — Allow all product and guide pages. Block admin/studio routes. Reference sitemap location.
- **Google Search Console** — Submit sitemap, monitor indexing status, track search performance.

#### Meta Tags & Social Sharing
- **Unique meta per page** — Every page gets a unique `<title>` and `<meta name="description">`. Product pages: "[Product Name] — Assembly Guide & Instructions | Guid". Guide pages: "How to Assemble [Product Name] — Step-by-Step Guide | Guid".
- **Open Graph tags** — `og:title`, `og:description`, `og:image` (product's primary image), `og:url`, `og:type` (product or article). Enables rich previews when shared on Facebook, LinkedIn, etc.
- **Twitter Card tags** — `twitter:card` (summary_large_image), `twitter:title`, `twitter:description`, `twitter:image`. Rich previews on Twitter/X.
- **Canonical URLs** — Every page declares its canonical URL to prevent duplicate content issues (especially important with filter/sort URL parameters).
- **Heading hierarchy** — Audit all pages for proper H1 → H2 → H3 hierarchy. Every page has exactly one H1. No skipped heading levels.

---

## Phase 3: AI Troubleshooting Assistant

### Concept

A conversational AI chatbot embedded on product pages and accessible site-wide. Users describe their problem in plain language — "my KALLAX is wobbling" or "how do I replace the battery in my SYMFONISK" — and the assistant provides product-specific troubleshooting, maintenance, and repair guidance through a back-and-forth conversation.

This transforms Guid from a one-time assembly tool into a **lifetime product companion**.

### Architecture

```
[User message: "My KALLAX shelf is wobbly"]
    → Product identification (extract product name/number from message)
    → Context retrieval (fetch product data, assembly guide, documents from DB)
    → AI chat completion (product context + conversation history + user message)
    → Structured response (diagnosis, steps to fix, part numbers if needed)
```

### Knowledge Sources (RAG)

The assistant draws from multiple sources per product:
- **Guid assembly guide** — Step data, tips, warnings already in the database
- **Manufacturer documents** — PDFs stored in ProductDocument (assembly, care, parts lists)
- **Product metadata** — Materials, dimensions, care instructions, important notes (all in Product model)
- **Common fixes database** (future) — Crowdsourced fixes and tips from the community

### AI Model

- Same multi-model setup as guide generation
- Conversational model (Claude or GPT-4o) for chat, with product context injected via system prompt
- Vision capability: user can send a photo of the problem → AI diagnoses visually

### Key Features

- **Proactive greeting** — When a user opens the app or lands on a product page, the assistant proactively offers help: "Having trouble with your product? I can help you troubleshoot, find replacement parts, or walk you through a fix."
- **Guided diagnostic flow** — On chat open, the assistant starts with structured starter questions to narrow down the problem fast before diving into solutions:
  1. "Which product do you need help with?" (or pre-filled if on a product page)
  2. "What's happening?" (pick from common issues: wobbling, missing part, broken piece, won't close/open, assembly question, other)
  3. "When did this start?" (just happened, gradual, after moving the product, etc.)
  4. "Can you send a photo of the issue?" (optional but helps with diagnosis)
  → These intake questions collect enough context for the AI to provide a targeted, accurate first response instead of generic troubleshooting.
- **Product-aware context** — The assistant knows everything about the specific product before the user says a word
- **Photo diagnosis** — User sends a photo of the issue → AI identifies the problem visually
- **Part identification** — "What screw do I need?" → AI references the parts list and provides the exact part number
- **Step-by-step repair guidance** — Conversational, not just a wall of text. One step at a time, with confirmation.
- **Escalation** — If the assistant can't solve it, suggest contacting the manufacturer with the right info pre-filled

### New Database Models (Planned)

```
ChatSession
  - id, userId (optional for anonymous), productId (optional)
  - status (active/resolved/abandoned)
  - resolution (solved/unsolved/escalated)
  - createdAt, updatedAt

ChatMessage
  - id, sessionId, role (user/assistant)
  - content, imageUrl (optional)
  - createdAt
```

### New Routes

| Route | Purpose |
|-------|---------|
| `/chat` | Standalone chat — user describes product + problem |
| `/products/[articleNumber]/chat` | Product-specific chat — context pre-loaded |
| `/api/chat` | Streaming chat API endpoint |

### Tiering

- **Free tier:** Limited troubleshooting chats (e.g., 3/month) with basic text responses
- **Premium tier:** Unlimited chats, photo diagnosis, priority response, conversation history saved

---

## Phase 4: Premium Subscription

### Stripe Integration
- Stripe Checkout for subscription signup
- Stripe Customer Portal for billing management
- Webhook handler for subscription lifecycle events
- `subscription` field on User model (free/premium/pro)

### Premium Features
- YouTube creator video guides (see below)
- Offline guide access (PWA with service worker caching)
- AR overlay for assembly guidance (future — explore WebXR)
- Ad-free experience
- Priority AI-generated guides for user-requested products
- Advanced search and filtering

### YouTube Creator Video Integration

Rather than generating AI videos (assembly instructions are too complex for current AI video generation), Guid leverages the existing ecosystem of **DIY creators on YouTube** who already produce assembly, setup, and troubleshooting videos.

#### Creator Self-Submission Portal

Creators can register on Guid, link their YouTube channel, and submit their videos for specific products:

1. **Creator registration** — Separate registration flow for creators. Link YouTube channel (verify ownership via OAuth or manual review). Creator profile page shows their channel, subscriber count, and all submitted videos.
2. **Video submission** — Creator selects a product → submits YouTube video URL → provides: title, description, which steps are covered (optional), language. One product can have multiple videos from different creators.
3. **Admin review** — All submissions go through admin review for quality and relevance before appearing on product pages. Review criteria: video matches the product, reasonable quality, no spam/self-promotion beyond the guide itself.
4. **Publication** — Approved videos appear on the product detail page in a "Video Guides" tab alongside the text/illustration guide.

#### Video Display on Product Pages

- **Embedded YouTube player** — Responsive YouTube embed on the product detail page (within the "Video Guides" tab or section).
- **Creator attribution** — Each video shows: creator name, channel thumbnail, subscriber count, video title, upload date.
- **Multiple videos per product** — Different creators may cover the same product with different approaches. Show all approved videos, sorted by user helpfulness ratings.
- **User ratings** — "Was this video helpful?" thumbs up/down per video. Surfaces the most helpful videos first.

#### Monetization Strategy

- **Creators drive traffic to Guid** — Their audience discovers the platform through video descriptions and links.
- **Guid drives traffic to creators** — Users browsing Guid discover creator videos they wouldn't have found otherwise.
- **Future revenue share** — Once Guid has advertising or premium subscriptions, share revenue with creators whose content drives engagement. Creators opt in to the revenue share program.
- **Premium gating (optional, future)** — Video guides could be a premium-only feature, with creators earning a share of subscription revenue based on views.

#### New Database Model

```
VideoSubmission
  - id, productId, creatorId (User with creator role)
  - youtubeUrl, youtubeVideoId
  - title, description, language
  - stepsConvered (optional JSON — which guide steps the video covers)
  - status (pending/approved/rejected)
  - helpfulVotes, unhelpfulVotes
  - reviewedBy, reviewNotes, reviewedAt
  - createdAt, updatedAt

CreatorProfile
  - id, userId
  - youtubeChannelUrl, youtubeChannelId
  - channelName, subscriberCount (cached, refreshed periodically)
  - isVerified (channel ownership confirmed)
  - totalVideos, totalHelpfulVotes
  - createdAt, updatedAt
```

#### New Routes

| Route | Purpose |
|-------|---------|
| `/creators/register` | Creator registration and YouTube channel linking |
| `/creators/[id]` | Creator profile page — channel info, all submitted videos |
| `/creators/submit` | Video submission form — select product, submit YouTube link |
| `/studio/videos` | Admin review queue for video submissions |

### Other Premium Features Routes

| Route | Purpose |
|-------|---------|
| `/pricing` | Pricing page with plan comparison |
| `/subscribe` | Stripe Checkout redirect |
| `/account/billing` | Subscription management |

---

## Phase 5: Multi-Retailer Expansion

Guid starts with IKEA but the vision is **universal product coverage**. Phase 5 builds the infrastructure to ingest products from any retailer, normalize them into a unified schema, and serve guides regardless of where the product was purchased.

### Retailer Adapter Architecture

The scraper framework is abstracted into a **multi-retailer adapter system**. Each retailer gets its own adapter that implements a standard interface, handling the differences in website structure, product schema, and data availability.

#### Adapter Interface

Each retailer adapter implements:

```
RetailerAdapter
  - retailerId: string (e.g., "ikea", "wayfair", "amazon")
  - retailerName: string (display name)
  - baseUrl: string

  // Catalog operations
  - detectNewProducts(): Promise<NewProduct[]>    // Full catalog diff against DB
  - scrapeProduct(url: string): Promise<ProductData>  // Single product scrape
  - scrapeCategory(categoryUrl: string): Promise<ProductUrl[]>  // Category page listing

  // Document operations
  - extractDocuments(productPage: HTML): Promise<ProductDocument[]>  // PDFs, manuals
  - extractImages(productPage: HTML): Promise<ProductImage[]>  // Product images

  // Configuration
  - getRateLimitConfig(): RateLimitConfig  // Delays, max concurrent, etc.
  - getRobotsRules(): RobotsConfig  // Respect robots.txt
```

The monthly catalog sync (Phase 1) already supports the adapter pattern — Phase 5 adds concrete adapters beyond IKEA.

#### Retailer Priority & Rollout Order

| Priority | Retailer | Rationale | Data Availability | Est. Products |
|----------|----------|-----------|-------------------|---------------|
| 1 | **IKEA** | Already built, baseline adapter | Excellent — full catalog, assembly PDFs, structured data | ~13,000 |
| 2 | **Wayfair** | Largest online furniture retailer, high assembly-required rate | Good — product APIs available, PDFs vary by brand | ~100,000+ |
| 3 | **Home Depot** | Strong in outdoor structures, tools, home improvement kits | Good — well-structured product pages, assembly docs common | ~500,000+ |
| 4 | **Amazon** | Massive catalog, covers all product categories | Variable — product data via PA-API, assembly PDFs rare, images good | Millions |
| 5 | **Target** | Growing furniture line, general consumer products | Moderate — good product pages, assembly docs sometimes embedded in listing | ~100,000+ |

**Rollout strategy:** Add one retailer at a time. Each adapter goes through a validation cycle: build adapter → scrape 100 test products → verify data quality → full catalog scrape → integrate into monthly sync.

#### Retailer-Specific Challenges

| Retailer | Challenge | Approach |
|----------|-----------|----------|
| **IKEA** | CDN image URLs with token expiry, Swedish-origin part numbers | Already solved in current scraper |
| **Wayfair** | Multiple sellers per product, massive variant explosion (same item in 50 colors) | Normalize to single product entry per unique assembly instruction set. Group color variants. |
| **Amazon** | Aggressive anti-scraping, product data behind authentication | Use Amazon Product Advertising API (PA-API 5.0) instead of scraping. Rate limit: 1 request/sec. |
| **Home Depot** | Product specs split across multiple tabs, nested specification pages | Multi-step scraper: main page → specifications tab → documents tab. Use Playwright for dynamic content. |
| **Target** | SPA-based product pages, client-side rendering, data in JavaScript bundles | Headless browser rendering via Playwright. Extract product data from embedded JSON-LD or `__NEXT_DATA__`. |

### Product Deduplication & Matching

When the same product is sold across multiple retailers, Guid shows **one unified product page** instead of duplicates.

#### Matching Strategy

1. **Exact match (highest confidence)** — Manufacturer SKU, UPC/EAN barcode, or article number matches across retailers. Example: IKEA KALLAX has the same article number everywhere.
2. **Fuzzy match (medium confidence)** — Product name + brand + key dimensions similarity scoring. Threshold: ≥ 0.85 similarity score. Example: "KALLAX Shelf unit 77x147cm" on IKEA matches "IKEA KALLAX 77x147" on Wayfair.
3. **Manual match (admin override)** — Admin can manually link products across retailers in Studio when automatic matching fails or is incorrect.
4. **Match confidence scoring** — Each cross-retailer link stores a confidence score. Low-confidence matches (< 0.7) are flagged for admin review before merging.

#### Unified Product Page

When a product is matched across retailers:

- **Single product page** with all images aggregated (deduplicated by visual similarity)
- **"Available at" section** — Shows each retailer with current price, availability status, and direct link to buy
- **Price comparison** — Side-by-side pricing across retailers (future monetization via affiliate links)
- **Shared assembly guide** — Same product = same assembly = one guide shared across retailer entries
- **Retailer-specific notes** — If packaging or included hardware differs by retailer, show retailer-specific warnings

### Unified Product Schema

All retailer data maps to the same Prisma models. Each adapter normalizes retailer-specific formats to common fields.

#### Normalization Rules

| Field | IKEA | Wayfair | Amazon | Home Depot | Target |
|-------|------|---------|--------|------------|--------|
| **Name** | `product_name` | `productName` | `title` | `productLabel` | `product.title` |
| **Price** | `current_price` (SEK→USD) | `price.current` | `price.amount` | `pricing.value` | `price.currentRetail` |
| **Brand** | "IKEA" (always) | `brand.name` | `brand` | `brandName` | `brand.name` |
| **SKU** | `article_number` | `sku` | `asin` | `modelNumber` | `tcin` |
| **Category** | `product_type` | `category.name` | `productGroup` | `taxonomy` | `category.name` |
| **Images** | `ProductImage` URLs | `images[]` | `images.variants[]` | `mediaList[]` | `images.primaryUri` |
| **Documents** | `ProductDocument` | `documents[]` | Rarely available | `documents[]` | Rarely available |

**Currency normalization:** All prices stored in USD. Convert at scrape time using a cached exchange rate. Display in user's locale where possible.

### URL Detection & Routing

When a user pastes a retailer URL into the search bar, Guid automatically detects the retailer and extracts the product identifier.

| Retailer | URL Pattern | Extraction |
|----------|-------------|------------|
| **IKEA** | `ikea.com/.../p/{name}-s{articleNumber}` | Regex: extract article number from `-s` suffix |
| **Wayfair** | `wayfair.com/.../pdp/{slug}-{sku}.html` | Extract SKU from last slug segment |
| **Amazon** | `amazon.com/dp/{ASIN}` or `/gp/product/{ASIN}` | Extract 10-character ASIN |
| **Home Depot** | `homedepot.com/p/.../123456789` | Last numeric path segment = product ID |
| **Target** | `target.com/p/.../A-12345678` | Extract DPCI code after `A-` prefix |

**Flow:** User pastes URL → detect retailer from domain → extract product ID → look up in DB → if found, redirect to Guid product page → if not found, offer to queue a scrape.

### Affiliate Revenue (Phase 5+)

Multi-retailer enables **affiliate revenue** as a monetization layer:

- **Amazon Associates** — 4-8% commission on furniture purchased through Guid's links
- **Wayfair affiliate program** — Commission on referred purchases
- **"Buy at" links** — Product pages show "Available at [retailer]" links with embedded affiliate tracking parameters
- **Revenue tracking** — Track clicks and conversions per retailer, per product, per user source
- **Transparency** — Affiliate links disclosed per FTC guidelines ("As an Amazon Associate, Guid earns from qualifying purchases")

### Platform Changes

- **Retailer filter** — Add retailer as a filter option on `/products` (alongside category, price, rating). Show retailer logo pills for quick filtering.
- **Retailer branding** — Small retailer logo badge on product cards and detail pages. Non-intrusive but clear for user trust.
- **Image CDN config** — Extend `remotePatterns` in `next.config.ts` for each new retailer's image CDN domains.
- **Retailer landing pages** — `/retailers/wayfair`, `/retailers/amazon` etc. — browse all products from a specific retailer. SEO value for "Wayfair assembly guides" searches.
- **Admin: retailer management** — Studio page to manage retailer adapters: enable/disable, configure scrape frequency, view health metrics per retailer.

### New Database Fields

```
Product (extend)
  - sourceRetailerId  String   (already exists as source_retailer — formalize as FK)
  - manufacturerSku   String?  (manufacturer's own SKU, separate from retailer SKU)
  - upcEan            String?  (universal barcode for cross-retailer matching)
  - matchGroupId      String?  (groups matched products across retailers)
  - matchConfidence   Float?   (confidence of cross-retailer match)

Retailer (new model)
  - id, name, slug, logoUrl
  - baseUrl, adapterType
  - isActive, lastSyncAt, nextSyncAt
  - affiliateConfig (JSON — tracking URLs, commission rates)
  - rateLimitConfig (JSON — delays, max concurrent)
  - createdAt, updatedAt
```

---

## Phase 6: Native Mobile Apps (iOS & Android)

### Timing

Build native apps **after Phase 5** — once the web app has real customer validation. The web PWA serves as the initial mobile experience; native apps add platform-specific capabilities that a browser can't match.

### Stack: React Native (Expo)

- **Framework:** React Native with Expo for simplified builds, OTA updates, and app store deployment
- **Language:** TypeScript (shared knowledge with Next.js web app)
- **UI:** React Native components styled to match the Guid design system (amber/technical theme)
- **Navigation:** React Navigation or Expo Router
- **State/Data:** Same API endpoints as web app — shared backend, no duplication

### Core Mobile Features (Priority Order)

1. **Native camera integration** — The primary differentiator vs. web
   - Barcode/QR scanner for instant product lookup from box labels
   - Photo capture for OCR (product name/article number from labels)
   - Photo-based troubleshooting in the AI chat (snap the broken part → send to assistant)
   - Future: product recognition from product photos

2. **Offline guide access** — Download guides for offline use
   - Essential for assembling in garages, basements, and areas with poor connectivity
   - Cache guide steps, illustrations, and tool lists locally
   - Sync progress when back online

3. **Push notifications** — Keep users engaged beyond the initial assembly
   - Maintenance reminders ("Time to check your KALLAX cam locks")
   - New guide availability for saved products
   - Chat response notifications (when troubleshooting assistant responds)

### Code Sharing Strategy

| Layer | Shared with Web? | Approach |
|-------|-------------------|----------|
| **API/Backend** | Yes — same Next.js API routes | Mobile app calls the same endpoints |
| **Business logic** | Partially — shared TypeScript types and validation | Extract shared types into a common package |
| **UI components** | No — native components | Rebuild with React Native, same design tokens |
| **Auth** | Same flow — NextAuth JWT tokens | Mobile stores JWT in secure storage (Expo SecureStore) |

### App Store Considerations

- **Apple App Store:** Requires review. Subscription payments must use In-App Purchase (Apple takes 15-30% cut). Plan for this in pricing model.
- **Google Play Store:** Similar review process. Google Play Billing for subscriptions.
- **Deep linking:** `guid.how/products/[id]` → opens in app if installed, falls back to web
- **App Store Optimization (ASO):** Keywords targeting "assembly guide", "product manual", "furniture assembly", "troubleshooting"

---

## Infrastructure & DevOps

### Deployment
- **Hosting:** Vercel (serverless, edge network)
- **Database:** Supabase PostgreSQL (existing)
- **File storage:** Supabase Storage or Vercel Blob (for uploaded PDFs, generated illustrations)
- **Background jobs:** Vercel Cron + Inngest or Trigger.dev (for AI batch processing AND monthly catalog sync)
- **Monthly catalog sync:** Vercel Cron triggers catalog scanner once per month per retailer; Inngest handles the scrape-detect-queue workflow with retries and rate limiting
- **AI APIs:** Google Gemini (Gemini 2.5 Flash, Gemini 2.5 Pro, Nano Banana models — rate-limited, queued)

### Environment Strategy
| Environment | Purpose |
|-------------|---------|
| `development` | Local dev with Supabase DB |
| `preview` | Vercel preview deployments per PR |
| `production` | Live site at guid.how |

### Monitoring (Planned)
- Vercel Analytics for performance
- Error tracking (Sentry)
- AI generation job monitoring dashboard in Studio
