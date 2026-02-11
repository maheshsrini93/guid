# CLAUDE.md — Guid (guid.how)

## Project Overview
**Guid** — product guides for everything. Step-by-step assembly, setup, troubleshooting, and maintenance guides for any product from any brand. Built with Next.js, currently seeded with IKEA product data via the scraper (`/Users/hashincloud/Ikea Scraper/`). Shares a **Supabase PostgreSQL** database with the scraper.

## Task & Documentation Workflow

**After completing any task from `docs/tasks.md`, immediately:**
1. Mark the task as `[x]` in `docs/tasks.md`
2. Add a dated entry to `docs/changelog.md` describing what was done

**Project documentation lives in `docs/`:**
| File | Purpose |
|------|---------|
| `docs/master-plan.md` | Vision, personas, roadmap, business model, success metrics |
| `docs/implementation-plan.md` | Technical architecture, phase-by-phase build plan, database models |
| `docs/design-guidelines.md` | Colors, typography, components, illustration style, badges |
| `docs/user-journeys.md` | Persona flows, edge cases, cross-journey patterns |
| `docs/tasks.md` | All tasks derived from the above docs — the implementation checklist |
| `docs/changelog.md` | Log of all doc changes — newest first |

When making changes that affect the project plan (new features, changed approaches, removed scope), update all affected docs and log the change in `docs/changelog.md`.

## Commands

```bash
# Dev server
npm run dev

# Build
npm run build

# Prisma
npx prisma generate        # Regenerate client after schema changes
npx prisma db push          # Push schema changes to Supabase
npx prisma db pull          # Introspect existing tables from Supabase
npx tsx prisma/seed.ts      # Seed admin user

# Note: Prisma introspection/migrations MUST use DIRECT_URL (port 5432), not pgbouncer (6543)
```

## Architecture

**Stack:** Next.js 16, TypeScript, Tailwind v4, shadcn/ui, Prisma v6, NextAuth v5 (beta)

**Database:** Supabase PostgreSQL (shared with scraper)
- `DATABASE_URL` (port 6543) = pgbouncer, used at runtime
- `DIRECT_URL` (port 5432) = direct connection, used by Prisma CLI

**Prisma:** v6 with `prisma-client-js` generator (NOT v7 `prisma-client` — that requires ESM and doesn't support `datasources` option)
- Schema: `prisma/schema.prisma`
- Client: `@prisma/client` (standard import)
- Singleton: `src/lib/prisma.ts`

**Auth:** NextAuth v5 (beta) with credentials provider
- Config: `src/lib/auth.ts`
- Route: `src/app/api/auth/[...nextauth]/route.ts`
- Registration: `src/app/api/auth/register/route.ts`
- Admin: `admin@ikea-guide.local` / `admin123`
- JWT sessions, `/studio/*` routes are admin-only via `src/app/studio/layout.tsx`
- Type casts needed for `session.user.role` — use `as unknown as { role: string }` pattern

**Images:** `next/image` with `remotePatterns` configured for `**.ikea.com` and `**.ikeaimg.com`
- `ImageWithFallback` — client component with loading/error states
- `ProductImageGallery` — clickable thumbnail gallery for product detail

## Routes

### Implemented

| Route | Type | Description |
|-------|------|-------------|
| `/` | Dynamic | Landing page |
| `/products` | Dynamic | Product grid with search, filters, sort & pagination |
| `/products/[articleNumber]` | Dynamic | Product detail (images, docs, assembly guide, save) |
| `/login` | Client | Login form |
| `/register` | Client | Registration form |
| `/profile` | Auth-gated | User profile with saved products |
| `/studio` | Admin-only | Dashboard with stats |
| `/studio/products` | Admin-only | Product catalog with assembly PDF filter |
| `/studio/guides` | Admin-only | Assembly guides list |
| `/studio/guides/new` | Admin-only | Create new assembly guide |
| `/studio/guides/[id]` | Admin-only | Edit guide details & steps |

### Planned (Phase 1: AI Guide Generation)

| Route | Type | Description |
|-------|------|-------------|
| `/studio/ai-generate` | Admin-only | AI generation dashboard — start jobs, view queue, batch controls |
| `/studio/ai-generate/[jobId]` | Admin-only | Review single AI-generated guide vs. original PDF |
| `/studio/ai-config` | Admin-only | Prompt template management, model configuration |
| `/studio/catalog-sync` | Admin-only | Monthly catalog sync dashboard — sync history, new products, scraper health |

### Planned (Phase 3: AI Troubleshooting Assistant)

| Route | Type | Description |
|-------|------|-------------|
| `/chat` | Public | Standalone troubleshooting chat — user describes product + problem |
| `/products/[articleNumber]/chat` | Public | Product-specific chat — context pre-loaded |
| `/api/chat` | API | Streaming chat endpoint (SSE) |

### Planned (Phase 4: Premium Subscription)

| Route | Type | Description |
|-------|------|-------------|
| `/pricing` | Public | Plan comparison page |
| `/subscribe` | Auth-gated | Stripe Checkout redirect |
| `/account/billing` | Auth-gated | Subscription management |

## Database Tables (Prisma models)

### Existing

**From scraper (read-only in this app):**
- `Product` → `products` (12,961 rows) — 38 columns including JSONB dashboard fields
- `ProductImage` → `product_images` (60,607 rows)
- `ProductDocument` → `product_documents` (11,294 rows)
- `ScrapeUrl` → `scrape_urls` (12,745 rows)

**App-owned:**
- `User` → `users` (auth, with role field)
- `Session` → `sessions` (auth)
- `SavedProduct` → `saved_products` (user bookmarks, unique per user+product)
- `AssemblyGuide` → `assembly_guides` (one-to-one with Product, has title/difficulty/tools/published)
- `AssemblyStep` → `assembly_steps` (belongs to guide, ordered by stepNumber)

### Planned (Phase 1)

- `AIGenerationJob` — tracks AI guide generation jobs (status, confidence, models used, priority, triggeredBy)
- `AIGenerationConfig` — prompt templates, model config, auto-publish thresholds (one active at a time)
- `Product` extensions — `guideStatus`, `firstDetectedAt`, `lastScrapedAt`, `isNew`, `discontinued`

### Planned (Phase 3)

- `ChatSession` — troubleshooting chat sessions (userId, productId, status, resolution)
- `ChatMessage` — individual messages (role, content, imageUrl)

## Key Components

**Filter system (`/products`):**
- `SearchInput` — debounced client-side search (300ms)
- `ProductSortSelect` — 6 sort options (name, price, rating, newest)
- `ProductFilters` — sidebar with category, price range, rating, assembly filters
- `ActiveFilters` — removable filter badges
- `MobileFilterSheet` — slide-in sheet for mobile filter access
- `product-filters.ts` — builds Prisma `where` clause from URL params

**Assembly guides:**
- Server Actions in `src/lib/actions/guides.ts` — CRUD for guides and steps
- `AssemblyGuideViewer` — step-by-step viewer with progress indicators
- Published guides appear on product detail pages automatically

## Roadmap Summary

| Phase | Focus | Status |
|-------|-------|--------|
| **Phase 1** | AI Guide Generation — vision model pipeline, illustration generation (Nano Banana / Nano Banana Pro), pilot-first with quality gates, monthly catalog sync & auto-generation | Next |
| **Phase 2** | Polish — design system (amber theme), guide viewer UX, search improvements, performance, SEO | Planned |
| **Phase 3** | AI Troubleshooting Assistant — conversational chatbot, product-aware RAG, photo diagnosis, guided intake | Planned |
| **Phase 4** | Premium Subscription — Stripe, offline access, video guides, ad-free | Planned |
| **Phase 5** | Multi-Retailer Expansion — Wayfair, Amazon, Home Depot, Target adapters | Planned |
| **Phase 6** | Native Mobile Apps — React Native (Expo), camera-first, offline, push notifications | Planned |

**Phase 1 blockers:** Instruction writing guidelines and illustration creation guidelines must be provided by product owner before prompt fine-tuning can begin. See `docs/implementation-plan.md` for details.

## AI Pipeline (Phase 1 — Planned)

**Multi-model strategy:**
- **Primary vision model:** TBD (Gemini Pro Vision vs GPT-4o — benchmark pending)
- **Secondary vision model:** TBD (the other one — fallback/validation)
- **Illustration (simple steps):** Nano Banana (`gemini-2.5-flash-image`) — cheaper, faster
- **Illustration (complex steps):** Nano Banana Pro (`gemini-3-pro-image-preview`) — higher fidelity, up to 4K

**Monthly catalog sync:** Once per month, scan each retailer's catalog → detect new products → auto-scrape → auto-queue AI generation → auto-publish high-confidence guides. Manual single-product scrape available in Studio for urgent requests.

**API integrations:** Google Gemini API, OpenAI API, `pdf-lib` or `pdfjs-dist` for PDF processing

## Key Constraints
- Prisma v7 `prisma-client` generator does NOT work with this setup — stay on v6 `prisma-client-js`
- pgbouncer (port 6543) does NOT support Prisma introspection — always use DIRECT_URL for CLI operations
- IKEA product images are external URLs (ikea.com CDN) — `next.config.ts` has `remotePatterns` configured
- NextAuth v5 type augmentation conflicts — use `as unknown as` cast pattern for `session.user.role`

## Related Project
- Scraper: `/Users/hashincloud/Ikea Scraper/` — populates the shared Supabase DB
- Scraper GitHub: `maheshsrini93/ikea-scraper`
