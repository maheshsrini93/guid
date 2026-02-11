# Master Plan — Guid (guid.how)

## Vision

Guid is the **universal product knowledge hub** — step-by-step assembly, setup, troubleshooting, and maintenance guides for any product from any brand. Starting with IKEA furniture, Guid will expand across every product category that comes with a manual, powered by AI-generated guides and enhanced by community contributions.

**One-liner:** The place you go when you need to build, set up, or fix anything — even years after you bought it.

## Problem

People regularly face confusing, missing, or poorly written product instructions. Paper manuals get lost. Manufacturer PDFs are hard to follow. YouTube videos are hit-or-miss. There is no single, reliable destination for clear, step-by-step product guides across brands and categories.

**Pain points:**
- Lost or damaged paper manuals with no easy replacement
- Manufacturer assembly docs that are visual-only, confusing, or assume expertise
- No centralized search — users bounce between brand sites, YouTube, and forums
- Pro installers waste time hunting for instructions across dozens of brands
- No way to save tips, notes, or improvements for future reference
- **Post-purchase helplessness** — Users who've owned a product for months or years throw away the manual, then hit a problem: a battery needs replacing, a spare part is missing, a screw fell out, something broke. Now they're stuck Googling, digging through manufacturer sites, and watching random YouTube videos just to fix a simple issue. There's no fast, conversational way to get product-specific troubleshooting help.

## Target Users

### Primary Personas

1. **DIY Assemblers** — Regular people assembling furniture, appliances, electronics, or outdoor equipment at home. They want clear, stress-free instructions that make them feel capable. Ranges from first-time IKEA builders to experienced home improvers. *Mindset: "I just bought this, help me build it."*

2. **Product Owners (Troubleshooters)** — People who already own a product — sometimes for months or years — and hit a problem. The manual is long gone. Something broke, a part fell out, a battery needs replacing, or they need to disassemble and reassemble after a move. They don't want to read a full guide — they want a fast, conversational answer to a specific question. *Mindset: "Something's wrong and I threw away the manual."*

3. **Pro Installers** — Contractors, handypeople, and TaskRabbit pros who assemble and repair products professionally. They need quick-reference guides and fast diagnostic help, searchable by product, with tool lists and time estimates. Increasingly called back for repair jobs, not just assembly. *Mindset: "I need to confirm this step and move on to the next job."*

### Secondary Personas (future)

4. **Retail Staff** — Store employees and customer support agents who help customers with assembly and troubleshooting questions. Need fast lookup by article number or product name.

5. **Product Managers (B2B)** — Brand and retailer PMs who want to publish and manage assembly and support content for their product catalogs via an embeddable platform.

## Product Categories

### Phase 1 (Current)
- **Furniture** — IKEA catalog (12,961 products seeded)

### Phase 2
- **Electronics & appliances** — TVs, computers, kitchen appliances, smart home devices (setup + troubleshooting)
- **Outdoor & garden** — Grills, sheds, playground equipment, garden structures

### Phase 3
- **Automotive & tools** — Car accessories, power tools, workshop equipment (installation + maintenance)
- **Everything with a manual** — Cast the widest net; any product that ships with instructions

## Emotional Outcome

### Assembly Arc
- **Before:** "I can build this myself" — confidence through clear, approachable instructions
- **During:** "That was so much easier than expected" — relief by turning a dreaded task into a quick win
- **After:** "I built that!" — pride and satisfaction from completing something with your own hands

### Troubleshooting Arc
- **Panic:** "Something's broken and I threw away the manual" — the user feels stuck
- **Relief:** "I just told the chatbot my product name and it knew exactly what to do" — instant, conversational help
- **Trust:** "Guid is the first place I go whenever something goes wrong" — lifetime product companion

## Long-Term Vision (Roadmap)

### Priority 1: AI-Generated Guides
Use AI to automatically generate step-by-step guides from manufacturer PDFs, images, and video. Scale from thousands to millions of products without manual authoring. **The catalog stays permanently fresh** — new products are detected, scraped, and processed through the AI pipeline automatically so guides are available the moment a customer needs them.

**Key scenarios:**
- Admin uploads a KALLAX assembly PDF → AI extracts 24 steps with tool lists, part references, and screw directions → generates isometric illustrations for each step → guide ready for review in minutes instead of hours
- AI reads a visual-only IKEA diagram (no text) and correctly identifies: "Insert cam lock dowel into pre-drilled hole, turn clockwise 90 degrees"
- Batch processing: 2,800 IKEA products with assembly PDFs are queued → AI generates guides overnight → admin reviews flagged low-confidence steps the next morning
- AI detects that a PDF contains instructions for two product variants → automatically splits into two separate guides
- **Monthly catalog sync:** On the 1st of each month, the system scans every retailer's catalog for new products → scrapes them → AI pipeline generates guides in batch → all new guides published within a week. Every product in the current catalog has a guide on Guid.
- **New product coverage:** IKEA adds 15 new products to their catalog this month → next monthly sync detects all 15 → AI generates guides → admin reviews any flagged ones → all 15 are live before the end of the month

### Priority 2: Multi-Retailer Expansion
Add scrapers and integrations for more retailers — Wayfair, Amazon, Home Depot, Target, etc. Become the universal destination regardless of where the product was purchased.

**Key scenarios:**
- User pastes a Wayfair product URL → Guid recognizes the retailer, extracts the product, and shows the guide alongside the IKEA version of the same table
- A user searches "Weber Spirit E-310 grill assembly" → finds the guide even though they bought it on Amazon, not from Weber directly
- Same product sold on IKEA, Wayfair, and Amazon → Guid deduplicates and shows one unified product page with all retailer links
- Pro installer searches by article number from a Home Depot box label → instant match, guide loads in seconds

### Priority 3: AI Troubleshooting Assistant
A conversational AI chatbot that helps users fix, maintain, and troubleshoot products they already own. The user just mentions their product name (or scans it), describes the problem in plain language, and the assistant walks them through a solution — no manual needed. The assistant draws from Guid's guide database, manufacturer documentation, and product knowledge to provide contextual, product-specific help.

**Key scenarios:**
- "My KALLAX shelf is wobbling — how do I tighten it?"
- "I need to replace the battery in my SYMFONISK speaker — how do I open it?"
- "I lost a cam lock screw for my MALM dresser — what's the replacement part number?"
- "The drawer on my HEMNES won't close properly — what should I check?"

The assistant turns Guid from a one-time assembly tool into a **lifetime product companion** — the place you come back to whenever anything goes wrong, long after you've thrown away the manual.

### Priority 4: Community + AI Hybrid
AI generates initial guides; community improves them. Wikipedia-style model where users add tips, photos, warnings, and alternative approaches. AI + human collaboration produces the best guides.

**Key scenarios:**
- AI generates a MALM dresser guide → a pro installer adds a tip to step 8: "Pre-drill the back panel holes to prevent splitting — saves 10 minutes of frustration"
- User completes a BESTÅ guide and leaves a photo showing how they routed cables through the back panel → future users see this community-contributed improvement
- AI-generated guide has a vague step → 3 users flag it as confusing → community member submits a clearer rewrite with a photo → admin approves → guide quality improves organically
- User discovers a hack: "Use a rubber band on the screwdriver tip to grip stripped cam lock screws" → submits it as a community tip → gets upvoted and pinned to the product page

### Priority 5: Native Mobile Apps (iOS & Android)
React Native (Expo) apps built after customer validation on the web platform. The mobile app's killer feature is native camera integration — scan a barcode, photograph a broken part, or snap a product label for instant help.

**Key scenarios:**
- Dana's drawer won't close → opens the Guid app → photographs the broken drawer slide → AI assistant identifies the part and walks her through the fix, all from her phone
- Sam (pro installer) arrives at a job → scans the barcode on the box with his phone → guide loads instantly, no typing needed
- Alex is assembling a bookshelf in the garage with no WiFi → opens the Guid app → the guide he downloaded earlier works offline, step by step
- Dana gets a push notification: "It's been 6 months — time to check the cam locks on your KALLAX shelf" → taps it → opens directly to a quick maintenance checklist

**Timing:** Built after Phase 5 (multi-retailer expansion) — requires validated product-market fit and a stable feature set before investing in native development. The web PWA serves as the initial mobile experience.

## Business Model

### Layer 1: Freemium Subscription
- **Free tier:** Browse all guides, search products, save favorites
- **Premium tier:** AI troubleshooting assistant (unlimited chats), video guides, offline access, AR overlay, priority AI-generated guides, ad-free experience

### Layer 2: B2B SaaS Licensing
- Retailers and brands pay to embed Guid's guide platform into their own product pages
- White-label option for enterprise customers
- API access for integration into retailer apps and support systems

## Success Metrics

| Metric | Description |
|--------|-------------|
| **Guides available** | Total published guides across all categories |
| **Guide completion rate** | % of users who finish a guide they started |
| **Search-to-guide conversion** | % of searches that lead to a guide view |
| **Time saved** | Estimated time saved vs. manufacturer instructions |
| **User satisfaction** | Post-guide rating (was this helpful?) |
| **Premium conversion** | Free-to-paid conversion rate |
| **B2B pipeline** | Retailer interest / demo requests |
| **Chatbot resolution rate** | % of troubleshooting chats resolved without external help |
| **Return visits** | Users coming back for troubleshooting/maintenance (lifetime engagement) |
| **App installs** | iOS + Android app downloads and active installs |
| **Camera usage rate** | % of mobile sessions using barcode scan, photo OCR, or photo diagnosis |
| **Catalog sync coverage** | % of new retailer products detected and ingested per monthly sync cycle (target: ≥ 98%) |
| **New product guide rate** | % of new products with assembly PDFs that have a published guide within 1 week of sync (target: ≥ 95%) |
