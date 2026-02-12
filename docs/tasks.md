# Tasks — Guid (guid.how)

Auto-derived from master-plan.md, implementation-plan.md, design-guidelines.md, and user-journeys.md.

---

## Phase 1: AI Guide Generation

### 1.0 Open Issues (Blockers)
- [ ] **BLOCKER: Provide instruction writing guidelines** — Product owner must provide detailed requirements for how AI-generated text instructions should be written: vocabulary level, sentence structure, terminology standards, part/tool references, measurement formatting, safety warnings, and accessibility for non-native English speakers. These guidelines drive all prompt engineering.
- [ ] **BLOCKER: Provide illustration creation guidelines** — Product owner must provide detailed requirements for how AI-generated isometric illustrations should look: level of detail, annotation style, color usage, motion/direction indicators, part highlighting, label placement, and consistency standards. These guidelines drive all illustration prompts.

### 1.1 AI Infrastructure Setup
- [ ] **Choose primary vision model** — Benchmark Gemini Pro Vision vs GPT-4o on 10 IKEA assembly PDF pages for fine-detail accuracy (screw direction, part orientation, hole alignment)
- [ ] **Set up AI provider accounts** — Gemini API + OpenAI API keys, rate limit config, cost tracking
- [x] **Build PDF extraction pipeline** — Extract individual pages from assembly PDFs as images using `pdf-lib` or `pdfjs-dist`
- [x] **Create AI abstraction layer** — Provider-agnostic interface for vision analysis (swap primary/secondary models easily)
- [x] **Design structured output schema** — Define the JSON structure for AI-generated guide data (steps, tools, parts, warnings, confidence scores)

### 1.2 AI Generation Pipeline
- [ ] **Build single-product generation endpoint** — Server action: takes a product ID → fetches PDF → runs vision analysis → returns structured guide data
- [ ] **Implement step extraction logic** — AI prompt that analyzes each PDF page and extracts: step number, instruction text, tools needed, parts referenced, warnings, screw directions
- [ ] **Add confidence scoring** — Each step gets a confidence score based on model certainty; flag low-confidence steps
- [ ] **Build illustration generation** — Integrate Nano Banana (`gemini-2.5-flash-image`) for simple steps and Nano Banana Pro (`gemini-3-pro-image-preview`) for complex steps. Auto-classify step complexity based on part count and spatial relationships.
- [ ] **Implement illustration model routing** — Cost-efficiency logic: route simple steps (single part, straightforward action) to Nano Banana (cheaper/faster), complex steps (exploded views, multi-part, fine annotations) to Nano Banana Pro (higher fidelity, ~$0.134/image)
- [ ] **Create quality check automation** — Verify: step count matches PDF pages, all parts referenced, logical step sequence, no missing tools

### 1.3 Pilot & Refinement
- [ ] **Select pilot products** — Pick one product from each category: bookshelf, desk, bed frame, wardrobe, storage unit
- [ ] **Generate pilot guides** — Run generation pipeline on all pilot products
- [ ] **Build review UI in Studio** — Side-by-side view: original PDF (left) vs AI-generated guide (right), per step
- [ ] **Add inline editing on review screen** — Admin can edit instruction text, flag illustrations for regeneration, add notes
- [ ] **Implement feedback loop** — Store reviewer corrections and notes; use them to refine prompts
- [ ] **Integrate instruction writing guidelines into prompts** — Apply the product owner's instruction writing requirements to the text generation prompts. Ensure output meets vocabulary, structure, and accessibility standards for non-native English speakers.
- [ ] **Integrate illustration guidelines into prompts** — Apply the product owner's illustration creation requirements to the Nano Banana / Nano Banana Pro image generation prompts. Ensure output meets style, annotation, and consistency standards.
- [ ] **Iterate on prompts** — Based on pilot review feedback, improve extraction accuracy for problem areas (cam locks, part orientation, screw direction)
- [ ] **Define quality gate** — Set minimum confidence threshold and review pass rate required before batch processing

### 1.4 Batch Processing
- [ ] **Build job queue system** — Database model: `AIGenerationJob` (queued/processing/review/approved/failed)
- [ ] **Create batch processing dashboard** — Studio page: queue overview, progress tracking, completion rates, failure reasons
- [ ] **Implement queue worker** — Background process: picks jobs from queue, runs generation, respects rate limits, handles failures
- [ ] **Add auto-publish for high-confidence guides** — Guides above confidence threshold auto-publish; below threshold → review queue
- [ ] **Build monitoring dashboard** — Real-time stats: jobs completed, average confidence, failure rate, estimated completion time

### 1.5 Monthly Catalog Sync & Auto-Generation
- [ ] **Build monthly catalog sync** — Vercel Cron or Inngest function that runs once per month (e.g., 1st of each month) per retailer. Performs a full catalog diff against the existing Product table to detect all new products. Also triggerable manually from Studio.
- [ ] **Implement catalog diff logic** — Each retailer adapter implements `detectNewProducts()` that compares the retailer's current catalog against the DB and returns products not yet present. Uses sitemaps, RSS feeds, or full category scraping.
- [ ] **Add new product auto-detection** — When sync inserts a new product, check for assembly PDF in ProductDocuments. If PDF exists, auto-create `AIGenerationJob` with `priority: high` and `triggeredBy: auto_sync`.
- [ ] **Implement auto-publish rules** — After pilot quality baselines are set: guides ≥ 90% confidence auto-publish immediately; 70-89% auto-publish with "AI-Generated" badge and flagged for review; < 70% enter review queue only. Thresholds configurable in `AIGenerationConfig`.
- [ ] **Add `guideStatus` field to Product** — Enum: none/queued/generating/in_review/published/no_source_material. Track pipeline state per product.
- [ ] **Add `firstDetectedAt`, `lastScrapedAt`, `isNew` fields to Product** — Track when product was first found, last scraped, and whether it's new (< 30 days since detection).
- [ ] **Add `priority` and `triggeredBy` fields to AIGenerationJob** — Priority: high/normal/low. TriggeredBy: manual/auto_sync/batch. New products from monthly sync get high priority.
- [ ] **Handle assembly PDF updates** — During monthly sync, detect when a product's assembly PDF has changed (hash comparison). Auto-queue regeneration job. Version the old guide.
- [ ] **Handle product delisting** — During monthly sync, detect products no longer in retailer catalog. Mark as `discontinued: true`. Keep guides live. Show "This product has been discontinued" notice on product page.
- [ ] **Build catalog sync dashboard in Studio** — New dashboard section: last sync date per retailer, new products this month, pending generation, auto-published count, review queue depth, time-to-guide distribution, failed scrapes, sync history log.
- [ ] **Add scraper error handling & retry** — Failed scrapes retry with exponential backoff within the sync run. Persistent failures send webhook alert (Slack/email). Individual product failures don't block the batch.
- [ ] **Add "New" badge to product cards** — Show "New" pill badge on products where `isNew: true` (first 30 days after detection). Amber pill, subtle pulse on first view.
- [ ] **Add "Guide in Progress" state** — Product detail page shows "Guide being generated — check back shortly" with progress indicator when `guideStatus` is queued/generating.
- [ ] **Build "Submit a New Guide" CTA** — For products with `guideStatus: no_source_material`, show a prominent CTA card on the product detail page inviting users to contribute assembly knowledge. Do NOT show "Guide Coming Soon" — without source material, guides depend on community input.
- [ ] **Build guide submission form** — `/products/[articleNumber]/submit-guide` page: text instructions input, photo upload (drag-and-drop + camera on mobile, stored in Supabase Storage), video link fields, external resource link fields, optional tool list, estimated time, and difficulty rating. At least one content type required.
- [ ] **Add `GuideSubmission` model** — id, productId, userId, status (pending/approved/rejected/needs_info/processing), textContent, photos (JSON), videoLinks (JSON), externalLinks (JSON), toolsList, estimatedTime, difficulty, reviewedBy, reviewNotes, reviewedAt, timestamps. Run `npx prisma db push`.
- [ ] **Build submission review queue in Studio** — `/studio/submissions` page: list all pending submissions with product name, submitter, content preview, timestamp. Admin can approve, reject, or request more info. Approved submissions become source material for AI-enhanced guide generation.
- [ ] **Build "Generate from submission" action** — Server action that takes an approved GuideSubmission, feeds user text/photos into the AI pipeline to structure into a proper guide with formatted steps. Admin can edit before publishing.
- [ ] **Add "Community Contributed" badge** — Purple outline pill badge shown on guides created from user submissions. Include attribution to the original submitter.
- [ ] **Add `submission_received` to guideStatus enum** — Update Product guideStatus to include `submission_received` for products where a user has submitted guide content.
- [ ] **Add post-sync admin notification** — After each monthly sync completes, send summary email/webhook: new products detected, guides queued, auto-published count, items in review queue, any scraper failures.
- [ ] **Add manual single-product scrape** — Studio action: admin can trigger a scrape + AI generation for a specific product URL without waiting for the next monthly sync (handles "user needs this product now" requests).

### 1.6 Database Changes
- [x] **Add `AIGenerationJob` model** — id, productId, status, modelPrimary, modelSecondary, inputPdfUrl, rawOutput, confidenceScore, qualityFlags, reviewedBy, reviewNotes, priority (high/normal/low), triggeredBy (manual/auto_sync/batch), timestamps
- [x] **Add `AIGenerationConfig` model** — id, name, version, promptTemplate, modelConfig, isActive, autoPublishThresholds (JSON: confidence cutoffs for auto/review/hold)
- [x] **Extend Product model** — Add guideStatus (enum), firstDetectedAt, lastScrapedAt, isNew (boolean), discontinued (boolean) fields
- [x] **Run migration** — `npx prisma db push` after schema changes

### 1.7 New Studio Routes
- [ ] **`/studio/ai-generate`** — AI generation dashboard: start jobs, view queue, batch controls
- [ ] **`/studio/ai-generate/[jobId]`** — Single job review: side-by-side PDF vs guide, edit, approve/reject
- [ ] **`/studio/ai-config`** — Prompt template management, model configuration, version history
- [ ] **`/studio/catalog-sync`** — Monthly catalog sync dashboard: last sync dates, new products per cycle, time-to-guide metrics, scraper health, sync history log, manual sync trigger

---

## Phase 2: Polish Current Experience

### 2.0 Guide-First UX Architecture
- [ ] **Implement guide-first routing on `/products/[articleNumber]`** — When a product has a published guide (`guideStatus: published`), render the guide viewer as the primary view instead of the product detail page. When no published guide exists (queued, generating, in_review, no_source_material, none), fall back to the current product detail page. Use the Product model's `guideStatus` field for routing decisions.
- [ ] **Create `/products/[articleNumber]/details` route** — Move the current product detail page (images, specs, ratings, documents, metadata, assembly PDF download) to this sub-route. This page is always accessible regardless of guide status. Linked from the guide viewer's Product Info Card.
- [ ] **Build Product Info Card for guide viewer right column** — Compact card below the sticky illustration panel in the guide viewer's right column. Shows: product thumbnail (48px), product name, article number (JetBrains Mono), price, one key dimension, and a "View details →" link to `/products/[articleNumber]/details`. Entire card clickable. On mobile, replaced by a small info icon in the guide header.
- [ ] **Add guide availability status badges to product cards** — Product cards in search results and browse grid show guide status: green `Check` badge ("Guide Available") for published guides, amber `Loader2` badge ("Guide In Progress") for queued/generating, no badge for products without guides. Badge positioned top-right of card image area.
- [ ] **Update homepage hero to guide-centric messaging** — Change homepage hero text to "Find step-by-step instructions for any product" or similar guide-centric copy. Emphasize finding guides and work instructions over browsing a product catalog. Keep "Browse Products" as the navigation label.
- [ ] **Update SEO meta tags for guide-first landing** — When a guide exists, `/products/[articleNumber]` meta tags should be optimized for guide content: title "How to Assemble [Product] — Step-by-Step Guide | Guid", description focusing on the guide's step count, tools, and difficulty. When no guide exists, keep current product-focused meta tags.
- [ ] **Update internal navigation links** — Audit all internal links that point to `/products/[articleNumber]` to ensure they work correctly with the new guide-first routing. Update breadcrumbs on the guide view and details page.

### 2.1 Design System Update
- [ ] **Migrate fonts to IBM Plex Sans + JetBrains Mono** — Replace Geist Sans/Mono with IBM Plex Sans (primary) and JetBrains Mono (technical) via `next/font/google`. Update Tailwind fontFamily config. Update all components that reference font-family.
- [ ] **Update color palette** — Replace default neutral theme with amber/orange brand colors per design-guidelines.md. Add all tokens including `--background`, `--foreground`, `--card`, `--card-foreground`, `--border`, `--input`, `--ring`. Include hex fallbacks for older browsers.
- [ ] **Update CSS variables for light + dark mode** — Set full oklch token mapping in globals.css for both `:root` and `.dark` classes. All 17 tokens must have both light and dark values per design-guidelines.md.
- [ ] **Audit typography** — Ensure all pages follow the type scale (H1-H4, Body, Caption, Mono). Guide instructions use Body size with 1.7 line-height, max-width 72ch. Part numbers and measurements use JetBrains Mono. Apply fluid type scale with `clamp()` for headings.
- [ ] **Update button styles** — Amber primary, warm gray secondary, per design guidelines. Add all interactive states (hover, active, focus-visible, disabled, loading). Add button sizes (sm, default, lg). Ensure 44px minimum touch targets.
- [ ] **Add dark mode toggle** — Implement theme switcher with full warm dark palette per design-guidelines.md. Deep warm charcoal background, amber remains vibrant.
- [ ] **Add z-index, shadow, and border-radius scales** — Define CSS custom properties for the z-index scale (base through chat), shadow scale (sm through xl), and border-radius scale per design-guidelines.md.
- [ ] **Add accessibility foundations** — Add skip links ("Skip to main content"), visible focus rings on all interactive elements, `prefers-reduced-motion` CSS override, `aria-label` on all icon-only buttons. Verify all color token pairings meet WCAG AA 4.5:1 contrast minimum.

### 2.2 Guide Viewer UX — Three-Column Docs Layout
- [ ] **Build three-column desktop layout** — Implement the three-column guide viewer for ≥ 1024px: TOC sidebar (220px, sticky), work instructions (flex-grow, all steps on one scrollable page), illustration panel (380px, sticky). Max container width 1440px. Each step is a `<section>` with `aria-labelledby`.
- [ ] **Implement scrollspy for TOC** — Use Intersection Observer to track which step the user is currently viewing. Highlight the corresponding TOC item with amber left border, `--primary` text, font-weight 600. Completed steps show muted text + checkmark. Upcoming steps show normal weight.
- [ ] **Build sticky illustration panel** — Right panel fixed to viewport (`position: sticky`, `top: header-height + 1rem`). Displays illustration for the current step (via scrollspy). Crossfade transition (200ms ease-out) when swapping. If current step has no illustration, persist previous step's illustration.
- [ ] **Add click-to-zoom lightbox** — Clicking an illustration opens a full-screen lightbox overlay (`z-modal`). Pinch-to-zoom on touch, scroll-wheel zoom on desktop. Close with Escape key or click-outside.
- [ ] **Build step instruction rendering** — Render all steps on a single page with step headers (number in JetBrains Mono amber circle + title in H3), Body text at 1.7 line-height, max-width 72ch, `gap-12` between steps, `scroll-margin-top` for correct scrollspy landing.
- [ ] **Add tip/warning/info callouts** — Styled callout boxes: Tip (yellow bg, Lightbulb icon), Warning (red bg, AlertTriangle icon), Info (blue bg, Info icon). Left border 3px colored, `rounded-lg`, `p-4`.
- [ ] **Add progress bar** — Thin amber bar at top of guide page showing % of steps scrolled past. Smooth width animation (300ms ease-out). Amber fill, muted track.
- [ ] **Build tablet two-column layout** — For 640-1024px: instructions (~60% width) + sticky illustration (~40%). TOC accessible via floating button that opens a Sheet (slide-in from left).
- [ ] **Build mobile step-by-step cards** — For < 640px: one step per screen as a full-width card. Layout: progress bar (top), illustration (full-width 4:3), step header, instruction text, callouts, navigation buttons ("Previous" outline + "Next Step" primary, 48px height).
- [ ] **Add mobile swipe navigation** — Swipe left for next step, swipe right for previous. 200ms slide transition with fade. Haptic feedback via `navigator.vibrate` if supported.
- [ ] **Add mobile TOC bottom sheet** — Floating button (bottom-right, `List` icon) opens bottom sheet listing all steps with completion states. Tap any step to jump directly.
- [ ] **Add completion screen** — At end of guide: "Guide Complete" heading, total steps, rating prompt (5-star, 48px touch targets), social share buttons (ghost style), sign-up CTA for anonymous users. Subtle checkmark animation (respects `prefers-reduced-motion`).
- [ ] **Add progress saving** — For signed-in users, auto-save current scroll position / step number. On return: banner with "Welcome back! Continue from Step 14?" with "Resume" (primary) and "Start Over" (ghost) buttons.
- [ ] **Add step bookmarking** — Save specific steps across different guides for quick reference. Useful for pro installers who bookmark tricky steps across products.
- [ ] **Add keyboard navigation** — Arrow keys (← →) for step navigation on desktop. Home/End jump to first/last step. Proper focus management and `aria-current="step"` on active TOC item.

### 2.3 Search & Discovery
- [ ] **Add search autocomplete** — As user types (debounced 300ms), show top 5 matching products below search bar with thumbnail, name, article number. Click to navigate directly.
- [ ] **Add article number detection** — If search input is numbers-only (e.g., "702.758.14"), prioritize exact `article_number` match as top result.
- [ ] **Add URL paste detection** — If search input contains "http" or "ikea.com", extract article number from URL, redirect to product page. Show toast: "Detected IKEA product link — redirecting..."
- [ ] **Add recent searches** — Show user's last 5 searches when search input is focused. localStorage for anonymous users, database for signed-in users.
- [ ] **Add zero-result handling** — When no products match: "No products found for '[query]'" with suggestions: similar products (fuzzy match), category browsing links, "Request this product" link.
- [ ] **Add barcode/QR scanner** — Camera button in search bar, scan barcode → extract article number → search (mobile only, requires camera permission)
- [ ] **Add photo-to-text (OCR)** — Camera button: photograph product label → OCR extracts name/number → search
- [ ] **Add search analytics** — Track popular queries, zero-result queries, click-through rates. Identify content gaps for catalog expansion.

### 2.4 Product Detail Layout (`/products/[articleNumber]/details`)
- [ ] **Add tabbed sections** — Reorganize the product detail page (now at `/products/[articleNumber]/details`) into tabs: Overview (images, specs) | Documents (PDFs, manuals) | Related Products. The "Assembly Guide" tab is no longer needed here since the guide is the primary view at `/products/[articleNumber]`. Sticky tab bar on scroll.
- [ ] **Add image gallery lightbox** — Click any product image to open full-screen lightbox with zoom (scroll wheel desktop, pinch mobile) and swipe between images.
- [ ] **Add spec table** — Clean key-value table for product specifications: dimensions, weight, materials, color, article number. Mono font for measurements.
- [ ] **Add related products carousel** — Horizontal scrollable row of related products at bottom (same category, similar price range).

### 2.5 Performance
- [ ] **Optimize image loading** — Configure `next/image` with responsive `sizes` prop, serve 320w/640w/960w/1280w srcset. Blur-up placeholders for perceived performance.
- [ ] **Add lazy loading** — All below-the-fold images use `loading="lazy"`. Only first 4 product cards and primary product image load eagerly.
- [ ] **Profile and optimize database queries** — Enable Prisma query logging, identify slow queries (target: all product list queries under 200ms). Add composite indexes for `(category, current_price)`, `(category, average_rating)`, `(product_type, guide_status)`.
- [ ] **Optimize filter query builder** — Review `product-filters.ts` for N+1 queries, unnecessary JOINs, suboptimal WHERE clause ordering. Ensure most selective filter applied first.
- [ ] **Implement ISR** — Incremental Static Regeneration for product detail pages (`revalidate: 86400`). Pre-generate top 100 most-viewed product pages at build time.
- [ ] **Add edge caching** — Cache product list API responses (`s-maxage=3600, stale-while-revalidate=86400`). Cache completed assembly guide data aggressively.
- [ ] **Add skeleton loading states** — Skeleton screens with shimmer animation on product grid (card-shaped placeholders), product detail (image + text blocks), guide viewer (progress bar + instruction), and search results.

### 2.6 SEO
- [ ] **Add JSON-LD structured data** — Product schema on product detail pages (name, image, brand, sku, offers). HowTo schema on guide pages (steps, tools, totalTime). BreadcrumbList on all pages. Organization schema on homepage.
- [ ] **Generate dynamic sitemap** — Auto-generated `sitemap.xml` with all product and guide pages. Split into category-based sitemaps with sitemap index for 12,000+ URLs. Reference in `robots.txt`.
- [ ] **Add Open Graph meta tags** — Per-page `og:title`, `og:description`, `og:image` (product's primary image), `og:url`. Enables rich previews on Facebook, LinkedIn.
- [ ] **Add Twitter Card meta tags** — `twitter:card` (summary_large_image), `twitter:title`, `twitter:description`, `twitter:image`.
- [ ] **Add canonical URLs** — Every page declares canonical URL to prevent duplicate content (especially with filter/sort URL params).
- [ ] **Audit heading hierarchy** — Every page has exactly one H1, proper H1→H2→H3 hierarchy, no skipped levels.
- [ ] **Write unique meta per page** — Unique `<title>` and `<meta description>` for every page. Products: "[Product] — Assembly Guide | Guid". Guides: "How to Assemble [Product] — Step-by-Step | Guid".

### 2.7 Mobile Optimization
- [ ] **Full responsive audit** — Test all pages at 375px (iPhone SE), 390px (iPhone 14/15), 768px (iPad), 1024px, 1280px. Fix all layout breakage.
- [ ] **Mobile guide viewer audit** — Verify mobile step-by-step card layout (built in 2.2) works at 375px and 390px. Illustration above text, 48px navigation buttons, swipe working. Bottom sheet TOC accessible.
- [ ] **Mobile search overlay** — Full-screen search experience with recent searches, trending products, keyboard-optimized input.
- [ ] **Touch targets audit** — All interactive elements meet 44px minimum. Increase padding on buttons, links, filter chips.
- [ ] **Bottom sheet patterns** — Use slide-up bottom sheets on mobile for filter menus, sort options, step jump instead of dropdown menus.
- [ ] **Pull-to-refresh** — On product list and guide pages for native-app feel.

---

## Phase 3: AI Troubleshooting Assistant

### 3.1 Chat Infrastructure
- [ ] **Add `ChatSession` model** — id, userId (optional), productId (optional), status (active/resolved/abandoned), resolution (solved/unsolved/escalated), timestamps
- [ ] **Add `ChatMessage` model** — id, sessionId, role (user/assistant), content, imageUrl (optional), createdAt
- [ ] **Run migration** — `npx prisma db push` after schema changes
- [ ] **Build streaming chat API** — `/api/chat` endpoint with Server-Sent Events for streaming AI responses
- [ ] **Choose conversational AI model** — Evaluate Claude vs GPT-4o for product-aware troubleshooting conversations

### 3.2 Product Context & RAG
- [ ] **Build product context assembler** — Given a product ID, compile: product metadata, assembly guide steps, document summaries, care instructions, materials, key facts into a structured context block
- [ ] **Implement product identification from chat** — Extract product name/article number from user's first message, match to database, confirm with user
- [ ] **Build document context extraction** — Parse and chunk ProductDocument PDFs (parts lists, care guides) for retrieval
- [ ] **Create system prompt template** — Product-specific system prompt with all context, troubleshooting persona, step-by-step guidance style

### 3.3 Chat UI
- [ ] **Build chat component** — Message bubbles (user/assistant), text input, send button, streaming response display
- [ ] **Build proactive greeting** — Chat bubble that appears on product pages and homepage offering help: "Having trouble with your product? I can help you troubleshoot, find replacement parts, or walk you through a fix."
- [ ] **Build guided diagnostic intake** — Structured starter questions on chat open to narrow down the problem before free-form conversation: product identification → problem category (wobbling, missing part, broke, won't close, other) → timing (just happened, gradual, after move) → photo upload (optional). Collect enough context for a targeted first response.
- [ ] **Add image upload to chat** — User can attach a photo of the broken part/problem for visual diagnosis
- [ ] **Build `/chat` page** — Standalone chat: user describes product + problem from scratch, guided intake begins immediately
- [ ] **Build product page chat widget** — Chat button on product detail page, product context pre-loaded, guided intake skips product identification
- [ ] **Add conversation history** — Show previous messages on scroll-up, persist for signed-in users
- [ ] **Add typing indicator** — Show "Guid is thinking..." while AI generates response

### 3.4 Smart Features
- [ ] **Part identification from photos** — User uploads photo of a broken/missing part → AI identifies the part name, number, and where to buy replacements
- [ ] **Intent detection** — Detect if user wants assembly help (redirect to guide) vs troubleshooting (stay in chat)
- [ ] **Escalation flow** — If AI can't resolve: generate a pre-filled issue summary for the user to send to manufacturer support
- [ ] **Maintenance reminders** — After resolving a chat, offer to save the product and set periodic maintenance reminders

### 3.5 Tiering & Limits
- [ ] **Implement free tier limit** — 3 troubleshooting chats per month for free users
- [ ] **Track chat usage** — Count chats per user per billing period
- [ ] **Build upgrade prompt** — When free limit reached, show premium upgrade modal with chat-specific value prop

---

## Phase 4: Premium Subscription

### 4.1 Stripe Integration
- [ ] **Install Stripe SDK** — `npm install stripe @stripe/stripe-js`
- [ ] **Create Stripe products/prices** — Free, Premium ($X/mo), Premium Annual ($Y/yr)
- [ ] **Build Checkout endpoint** — API route that creates Stripe Checkout session
- [ ] **Build webhook handler** — Handle `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- [ ] **Add subscription field to User** — `subscriptionTier` (free/premium), `stripeCustomerId`, `subscriptionEndsAt`
- [ ] **Build middleware** — Check subscription status for premium-gated features

### 4.2 YouTube Creator Video Integration
- [ ] **Add `CreatorProfile` model** — id, userId, youtubeChannelUrl, youtubeChannelId, channelName, subscriberCount (cached), isVerified, totalVideos, totalHelpfulVotes, timestamps. Run migration.
- [ ] **Add `VideoSubmission` model** — id, productId, creatorId, youtubeUrl, youtubeVideoId, title, description, language, stepsCovered (JSON), status (pending/approved/rejected), helpfulVotes, unhelpfulVotes, reviewedBy, reviewNotes, timestamps. Run migration.
- [ ] **Build creator registration flow** — `/creators/register` page: sign up as creator, link YouTube channel (URL input + manual verification or OAuth), create CreatorProfile.
- [ ] **Build video submission form** — `/creators/submit` page: select product (search), paste YouTube URL (auto-extract video ID and thumbnail), add title, description, language. One product can have multiple videos.
- [ ] **Build video review queue in Studio** — `/studio/videos` page: list pending video submissions with product name, creator info, YouTube thumbnail preview. Admin approve/reject with notes.
- [ ] **Build video display on product detail** — Embedded YouTube player on product page (in "Video Guides" tab). Creator attribution strip: channel name, subscriber count, "Was this helpful?" thumbs up/down.
- [ ] **Build creator profile page** — `/creators/[id]` page: channel info, subscriber count, all submitted and approved videos, total helpfulness score.
- [ ] **Add helpfulness voting** — Thumbs up/down on video cards. Sort videos by helpfulness rating. Track votes per user to prevent abuse.

### 4.3 Other Premium Features
- [ ] **Offline guide access** — Service worker caching for saved guides (PWA)
- [ ] **Ad-free experience** — Conditional ad rendering based on subscription
- [ ] **Priority AI guides** — "Request a guide" button: premium users' requests are prioritized in the AI queue

### 4.4 Premium UI
- [ ] **Build pricing page** — `/pricing` with plan comparison table
- [ ] **Build upgrade flow** — "Upgrade" button → Stripe Checkout → success redirect
- [ ] **Build billing management** — `/account/billing` with Stripe Customer Portal link
- [ ] **Add premium badges** — Show premium badge on profile and in navigation
- [ ] **Add premium gate modals** — Tasteful modals when free users hit premium features

---

## Phase 5: Multi-Retailer Expansion

### 5.1 Retailer Adapter Framework
- [ ] **Design adapter interface** — Create a `RetailerAdapter` interface with standard methods: `detectNewProducts()`, `scrapeProduct()`, `scrapeCategory()`, `extractDocuments()`, `extractImages()`, `getRateLimitConfig()`, `getRobotsRules()`. Document the interface contract.
- [ ] **Refactor IKEA scraper into adapter** — Extract the existing IKEA scraper logic into an `IkeaAdapter` class that implements `RetailerAdapter`. Validate that monthly sync still works with the adapter pattern.
- [ ] **Add `Retailer` model** — id, name, slug, logoUrl, baseUrl, adapterType, isActive, lastSyncAt, nextSyncAt, affiliateConfig (JSON), rateLimitConfig (JSON), timestamps. Run migration.
- [ ] **Build adapter registry** — Central registry that maps retailer slugs to adapter implementations. Used by monthly sync to iterate all active retailers.
- [ ] **Build Wayfair adapter** — Implement `RetailerAdapter` for Wayfair. Handle: product APIs, variant explosion (normalize to single product per unique assembly), brand extraction from multi-seller listings.
- [ ] **Build Home Depot adapter** — Implement `RetailerAdapter` for Home Depot. Handle: multi-tab product pages (main → specifications → documents), nested spec extraction via Playwright.
- [ ] **Build Amazon adapter** — Implement `RetailerAdapter` using Amazon Product Advertising API (PA-API 5.0) instead of scraping. Handle: ASIN extraction, rate limits (1 req/sec), limited assembly PDF availability.
- [ ] **Build Target adapter** — Implement `RetailerAdapter` for Target. Handle: SPA rendering via Playwright, DPCI extraction, embedded JSON-LD data extraction.
- [ ] **Adapter validation pipeline** — For each new adapter: scrape 100 test products → verify data quality (images load, prices parsed, categories mapped) → full catalog scrape → integrate into monthly sync.

### 5.2 Product Deduplication & Matching
- [ ] **Add cross-retailer fields to Product** — `manufacturerSku` (String?), `upcEan` (String?), `matchGroupId` (String?), `matchConfidence` (Float?). Run migration.
- [ ] **Build exact matching** — Match products across retailers by manufacturer SKU, UPC/EAN barcode, or article number. Highest confidence level.
- [ ] **Build fuzzy matching** — Match by product name + brand + key dimensions similarity scoring. Threshold: ≥ 0.85 similarity score. Flag low-confidence matches (< 0.7) for admin review.
- [ ] **Build admin match management** — Studio page: view auto-detected matches, confirm/reject fuzzy matches, manually link products across retailers.
- [ ] **Build unified product page** — When a product is matched across retailers: single product page with aggregated images, "Available at" section with each retailer's price and buy link, shared assembly guide.

### 5.3 Data Normalization
- [ ] **Build normalization layer** — Each adapter's `scrapeProduct()` returns raw retailer data → normalization layer maps to Prisma Product fields using retailer-specific rules (field name mapping, currency conversion, category mapping).
- [ ] **Currency normalization** — All prices stored in USD. Convert at scrape time using cached exchange rate (refresh daily). Store original price and currency for reference.
- [ ] **Category mapping** — Map each retailer's category taxonomy to Guid's unified categories. Maintain a mapping table per retailer, editable in Studio.

### 5.4 URL Detection & Routing
- [ ] **Build URL detection engine** — When user pastes a URL in search: detect retailer from domain, extract product ID using retailer-specific regex patterns (IKEA article number, Amazon ASIN, Wayfair SKU, Home Depot product ID, Target DPCI).
- [ ] **URL-to-product routing** — Detected retailer + product ID → look up in DB → if found, redirect to Guid product page → if not found, offer to queue a scrape.

### 5.5 Platform Changes
- [ ] **Add retailer filter** — Filter products by retailer on `/products`. Show retailer logo pills for quick filtering.
- [ ] **Add retailer branding** — Small retailer logo badge on product cards and detail pages. Non-intrusive, builds user trust.
- [ ] **Extend image config** — Add `remotePatterns` in `next.config.ts` for each new retailer's image CDN domains (Wayfair, Amazon, Home Depot, Target).
- [ ] **Build retailer landing pages** — `/retailers/wayfair`, `/retailers/amazon`, etc. Browse all products from a specific retailer. SEO value for "[Retailer] assembly guides" searches.
- [ ] **Build retailer management in Studio** — Admin page: manage retailer adapters, enable/disable, configure scrape frequency, view health metrics per retailer, trigger manual sync.
- [ ] **Add price comparison section** — On unified product pages with multiple retailers: side-by-side price comparison with direct buy links.

### 5.6 Affiliate Revenue Setup
- [ ] **Integrate Amazon Associates** — Add affiliate tracking parameters to Amazon buy links. Track clicks and conversions.
- [ ] **Integrate Wayfair affiliate** — Same for Wayfair affiliate program.
- [ ] **Add affiliate disclosure** — FTC-compliant disclosure on product pages: "As an Amazon Associate, Guid earns from qualifying purchases."
- [ ] **Build affiliate analytics** — Track clicks, conversions, and revenue per retailer, per product, per user source. Dashboard in Studio.

---

## Phase 6: Native Mobile Apps (iOS & Android)

### 6.1 React Native Setup
- [ ] **Initialize Expo project** — Create React Native app with Expo, TypeScript, and Expo Router
- [ ] **Set up design system** — Port Guid amber/technical design tokens (colors, typography, spacing) to React Native StyleSheet
- [ ] **Implement auth flow** — JWT token storage via Expo SecureStore, login/register screens, shared auth with web backend
- [ ] **Build navigation structure** — Tab navigator (Home, Search, Chat, Profile) + stack navigators for detail screens
- [ ] **Connect to existing API** — Configure API client to call the same Next.js API routes as the web app

### 6.2 Native Camera Features (Priority)
- [ ] **Barcode/QR scanner** — Native camera integration for scanning product barcodes and QR codes from box labels
- [ ] **Photo capture for OCR** — Photograph product name/article number from labels → OCR extraction → product search
- [ ] **Photo capture for troubleshooting** — In-chat photo capture → send directly to AI assistant for visual diagnosis
- [ ] **Future: product recognition** — Photograph the assembled product itself → AI identifies the product

### 6.3 Core App Screens
- [ ] **Home screen** — Search bar, popular guides, recent products, proactive chat prompt
- [ ] **Product detail screen** — Native version of product page with image gallery, guide launcher, chat button
- [ ] **Guide viewer screen** — Full-screen step-by-step viewer optimized for mobile: swipe navigation, pinch-to-zoom illustrations
- [ ] **Chat screen** — Native chat UI with guided diagnostic intake, image upload from camera roll or live capture
- [ ] **Profile screen** — Saved products, completed guides, chat history, subscription management

### 6.4 Offline & Push
- [ ] **Offline guide caching** — Download guide steps and illustrations for offline use (premium feature)
- [ ] **Push notification setup** — Expo Notifications for maintenance reminders, new guide alerts, chat responses
- [ ] **Sync engine** — Queue offline actions (guide progress, saved products) and sync when back online

### 6.5 App Store Deployment
- [ ] **Apple App Store submission** — App review, screenshots, description, keywords (ASO)
- [ ] **Google Play Store submission** — Same preparation for Android
- [ ] **In-App Purchase integration** — Apple/Google billing for premium subscription (required by store policies)
- [ ] **Deep linking** — `guid.how/products/[id]` opens in app if installed, falls back to web

---

## Ongoing / Cross-Cutting

### Infrastructure
- [ ] **Set up Vercel deployment** — Connect repo, configure environment variables, deploy
- [ ] **Set up preview deployments** — Auto-deploy PRs to preview URLs
- [ ] **Add error tracking** — Sentry integration for runtime error monitoring
- [ ] **Set up CI** — GitHub Actions: lint, type check, build on every PR

### Security
- [ ] **Audit auth flow** — Review NextAuth config for vulnerabilities
- [ ] **Add rate limiting** — Rate limit API routes (auth, search, AI generation)
- [ ] **Validate all inputs** — Server-side validation on all API routes and server actions
- [ ] **Secure AI API keys** — Ensure API keys are only in server-side env, never exposed to client

### Analytics
- [ ] **Add Vercel Analytics** — Page views, performance metrics
- [ ] **Track guide engagement** — Steps viewed, completion rate, time per step, drop-off points
- [ ] **Track search patterns** — What users search for, zero-result queries, discovery method usage
