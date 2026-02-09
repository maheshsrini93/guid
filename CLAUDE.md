# CLAUDE.md — Guid (guid.how)

## Project Overview
**Guid** — product guides for everything. Step-by-step assembly, setup, and troubleshooting guides for any product. Built with Next.js, currently seeded with IKEA product data via the scraper (`/Users/hashincloud/Ikea Scraper/`). Shares a **Supabase PostgreSQL** database with the scraper.

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

## Database Tables (Prisma models)

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

## Key Constraints
- Prisma v7 `prisma-client` generator does NOT work with this setup — stay on v6 `prisma-client-js`
- pgbouncer (port 6543) does NOT support Prisma introspection — always use DIRECT_URL for CLI operations
- IKEA product images are external URLs (ikea.com CDN) — `next.config.ts` has `remotePatterns` configured
- NextAuth v5 type augmentation conflicts — use `as unknown as` cast pattern for `session.user.role`

## Related Project
- Scraper: `/Users/hashincloud/Ikea Scraper/` — populates the shared Supabase DB
- Scraper GitHub: `maheshsrini93/ikea-scraper`
