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
- [ ] **Build PDF extraction pipeline** — Extract individual pages from assembly PDFs as images using `pdf-lib` or `pdfjs-dist`
- [ ] **Create AI abstraction layer** — Provider-agnostic interface for vision analysis (swap primary/secondary models easily)
- [ ] **Design structured output schema** — Define the JSON structure for AI-generated guide data (steps, tools, parts, warnings, confidence scores)

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
- [ ] **Add "Guide Coming Soon" state** — Product detail page shows "Guide being generated — check back shortly" with progress indicator when `guideStatus` is queued/generating.
- [ ] **Add post-sync admin notification** — After each monthly sync completes, send summary email/webhook: new products detected, guides queued, auto-published count, items in review queue, any scraper failures.
- [ ] **Add manual single-product scrape** — Studio action: admin can trigger a scrape + AI generation for a specific product URL without waiting for the next monthly sync (handles "user needs this product now" requests).

### 1.6 Database Changes
- [ ] **Add `AIGenerationJob` model** — id, productId, status, modelPrimary, modelSecondary, inputPdfUrl, rawOutput, confidenceScore, qualityFlags, reviewedBy, reviewNotes, priority (high/normal/low), triggeredBy (manual/auto_sync/batch), timestamps
- [ ] **Add `AIGenerationConfig` model** — id, name, version, promptTemplate, modelConfig, isActive, autoPublishThresholds (JSON: confidence cutoffs for auto/review/hold)
- [ ] **Extend Product model** — Add guideStatus (enum), firstDetectedAt, lastScrapedAt, isNew (boolean), discontinued (boolean) fields
- [ ] **Run migration** — `npx prisma db push` after schema changes

### 1.7 New Studio Routes
- [ ] **`/studio/ai-generate`** — AI generation dashboard: start jobs, view queue, batch controls
- [ ] **`/studio/ai-generate/[jobId]`** — Single job review: side-by-side PDF vs guide, edit, approve/reject
- [ ] **`/studio/ai-config`** — Prompt template management, model configuration, version history
- [ ] **`/studio/catalog-sync`** — Monthly catalog sync dashboard: last sync dates, new products per cycle, time-to-guide metrics, scraper health, sync history log, manual sync trigger

---

## Phase 2: Polish Current Experience

### 2.1 Design System Update
- [ ] **Update color palette** — Replace default neutral theme with amber/orange brand colors per design-guidelines.md
- [ ] **Update CSS variables** — Set new oklch values for primary, secondary, accent, muted in globals.css (light + dark)
- [ ] **Audit typography** — Ensure all pages follow the type scale (H1-H4, Body, Caption, Mono)
- [ ] **Update button styles** — Amber primary, warm gray secondary, per design guidelines
- [ ] **Add dark mode toggle** — Implement theme switcher with warm dark palette

### 2.2 Guide Viewer UX
- [ ] **Redesign step indicators** — Vertical progress bar with numbered circles (amber current, green complete, gray upcoming)
- [ ] **Add step-by-step navigation** — Large Next/Previous buttons, keyboard arrow key support
- [ ] **Add swipe navigation** — Touch swipe left/right on mobile for step navigation
- [ ] **Add progress bar** — Thin amber bar at page top showing % complete
- [ ] **Add step jump** — Tap any step number in the progress bar to jump directly to it (for pro users)
- [ ] **Add tip/warning callouts** — Styled callout boxes: amber for tips, red for warnings
- [ ] **Add zoom on illustrations** — Pinch-to-zoom on mobile, click-to-zoom on desktop
- [ ] **Add completion screen** — Celebration on final step with time taken, rating prompt, sign-up CTA

### 2.3 Search & Discovery
- [ ] **Add search autocomplete** — Suggest products as user types (debounced, top 5 results)
- [ ] **Add article number detection** — If search input is numbers-only, prioritize exact article_number match
- [ ] **Add URL paste detection** — If search input contains "http", extract article number from URL, redirect to product
- [ ] **Add barcode/QR scanner** — Camera button in search bar, scan barcode → extract article number → search
- [ ] **Add photo-to-text (OCR)** — Camera button: photograph product label → OCR extracts name/number → search
- [ ] **Add "No guide" handling** — Product without guide: show PDF download link + "Notify me when guide is available" button

### 2.4 Performance & SEO
- [ ] **Add JSON-LD structured data** — Product schema + HowTo schema on guide pages
- [ ] **Generate dynamic sitemap** — `sitemap.xml` with all product pages and guide pages
- [ ] **Add Open Graph meta tags** — Per-page OG title, description, image for social sharing
- [ ] **Implement ISR** — Incremental Static Regeneration for popular product pages
- [ ] **Optimize database queries** — Review slow queries, add missing indexes, optimize filter builder
- [ ] **Add image lazy loading** — Ensure all product images and illustrations use lazy loading
- [ ] **Add skeleton loading states** — Skeleton screens on product grid, product detail, and guide viewer

### 2.5 Mobile Optimization
- [ ] **Responsive audit** — Test all pages at 375px, 640px, 768px, 1024px, 1280px
- [ ] **Mobile guide viewer** — Full-screen step view with swipe navigation, illustration above text
- [ ] **Mobile search** — Full-screen search overlay with recent searches
- [ ] **Touch targets** — Ensure all buttons/links meet 44px minimum touch target

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

### 4.2 Premium Features
- [ ] **Offline guide access** — Service worker caching for saved guides (PWA)
- [ ] **Video guides** — Video player component on guide steps (when video content exists)
- [ ] **Ad-free experience** — Conditional ad rendering based on subscription
- [ ] **Priority AI guides** — "Request a guide" button: premium users' requests are prioritized in the AI queue

### 4.3 Premium UI
- [ ] **Build pricing page** — `/pricing` with plan comparison table
- [ ] **Build upgrade flow** — "Upgrade" button → Stripe Checkout → success redirect
- [ ] **Build billing management** — `/account/billing` with Stripe Customer Portal link
- [ ] **Add premium badges** — Show premium badge on profile and in navigation
- [ ] **Add premium gate modals** — Tasteful modals when free users hit premium features

---

## Phase 5: Multi-Retailer Expansion

### 5.1 Scraper Framework
- [ ] **Abstract scraper architecture** — Create a retailer adapter interface in the scraper project
- [ ] **Build Wayfair adapter** — Scraper adapter for Wayfair product pages
- [ ] **Build Amazon adapter** — Scraper adapter for Amazon product pages (assembly-required products)
- [ ] **Build Home Depot adapter** — Scraper adapter for Home Depot product pages
- [ ] **Product deduplication** — Detect when the same product exists across retailers

### 5.2 Platform Changes
- [ ] **Add retailer filter** — Filter products by retailer on `/products`
- [ ] **Add retailer branding** — Show retailer logo/badge on product cards and detail pages
- [ ] **Extend image config** — Add `remotePatterns` for new retailer CDNs in `next.config.ts`
- [ ] **Normalize product schema** — Ensure all retailer data maps to the same Prisma fields
- [ ] **URL detection per retailer** — Detect retailer from pasted URLs (amazon.com, wayfair.com, etc.)

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
