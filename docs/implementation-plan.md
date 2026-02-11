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
| **Primary vision model** | TBD (Gemini vs OpenAI) | TBD | Fine-detail image recognition of assembly diagrams — screw rotation, part orientation, hole alignment, hardware identification |
| **Secondary vision model** | TBD (the other one) | TBD | Fallback and validation — cross-check critical details |
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

A benchmark test will compare Gemini Pro Vision vs. GPT-4o on a standard set of IKEA assembly pages to determine primary/secondary assignment.

#### Pipeline

```
[Assembly PDF]
    → PDF page extraction (split into individual pages/images)
    → Vision model analysis (per-page: identify parts, actions, sequence)
    → Structured data extraction (steps, tools, warnings, part references)
    → Guide assembly (compile into AssemblyGuide + AssemblyStep records)
    → Illustration generation (Nano Banana / Nano Banana Pro creates new diagrams per step)
    → Quality score (automated checks: completeness, sequence logic, part coverage)
    → Human review queue (admin reviews in Studio before publishing)
```

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
| `/studio/ai-generate` | AI generation dashboard — start jobs, view queue |
| `/studio/ai-generate/[jobId]` | Review a single AI-generated guide vs. original PDF |
| `/studio/ai-config` | Manage prompt templates and model configuration |

### API Integrations

- **Google Gemini API** — Vision analysis + illustration generation (Nano Banana / Nano Banana Pro)
- **OpenAI API** — Vision analysis (primary or secondary depending on benchmark)
- **PDF processing** — `pdf-lib` or `pdfjs-dist` for page extraction and image conversion

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

### UX Improvements
- Responsive design audit and mobile optimization
- Loading states and skeleton screens across all pages
- Improved search with autocomplete/suggestions
- Better product detail layout with tabbed sections
- Guide viewer UX: progress saving, step bookmarking, dark mode

### Performance
- Image optimization and lazy loading
- Database query optimization (add missing indexes, optimize filter queries)
- Static generation for popular product pages (ISR)
- Edge caching for product data

### SEO
- Structured data (JSON-LD) for products and how-to guides
- Dynamic sitemap generation
- Open Graph and Twitter Card meta tags
- Canonical URLs and proper heading hierarchy

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
- Video guides (embedded or generated)
- Offline guide access (PWA with service worker caching)
- AR overlay for assembly guidance (future — explore WebXR)
- Ad-free experience
- Priority AI-generated guides for user-requested products
- Advanced search and filtering

### New Routes
| Route | Purpose |
|-------|---------|
| `/pricing` | Pricing page with plan comparison |
| `/subscribe` | Stripe Checkout redirect |
| `/account/billing` | Subscription management |

---

## Phase 5: Multi-Retailer Expansion

### Scraper Extensions
- Abstract scraper into a multi-retailer framework
- Add retailer adapters: Wayfair, Amazon, Home Depot, Target
- Unified product schema that normalizes across retailer formats
- `source_retailer` field already exists in Product model

### Platform Changes
- Brand/retailer filtering on product pages
- Retailer-specific image CDN configurations in `next.config.ts`
- Product matching/deduplication across retailers
- Retailer logos and attribution

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
- **Background jobs:** Vercel Cron + Inngest or Trigger.dev (for AI batch processing)
- **AI APIs:** Gemini + OpenAI (rate-limited, queued)

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
