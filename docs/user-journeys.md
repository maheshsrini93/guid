# User Journeys — Guid (guid.how)

## Personas

### P1: Alex — DIY Assembler
**Profile:** 32, apartment renter, bought an IKEA bookshelf online. Has assembled a few things before but isn't confident. Just wants to get it done without stress.
**Goals:** Find the guide fast, follow it step by step, finish without mistakes.
**Frustrations:** Paper manual is confusing, can't tell which screw is which, afraid of messing up and having to restart.

### P2: Dana — Product Owner (Troubleshooter)
**Profile:** 45, homeowner, has a house full of IKEA and Wayfair furniture assembled over the years. Threw away all the manuals. Now a drawer won't close, a shelf is wobbling, and a light fixture needs a bulb replacement she can't figure out.
**Goals:** Get a fast, specific answer to "how do I fix this?" without reading an entire manual. Identify replacement parts by name or photo.
**Frustrations:** Can't find the original manual. Manufacturer sites are mazes. YouTube videos are 20 minutes long for a 2-minute fix. Doesn't know the technical name of the broken part.

### P3: Sam — Pro Installer
**Profile:** 41, TaskRabbit top-rated assembler. Builds 3-5 pieces of furniture per day across multiple brands. Increasingly gets callbacks for repairs and troubleshooting. Needs speed and accuracy.
**Goals:** Quick reference by article number, skim to confirm a tricky step, diagnose repair issues fast, move on to the next job.
**Frustrations:** Hunting for PDFs on manufacturer sites, no quick way to look up a product by its box label, no centralized diagnostic reference for repairs.

### P4: Jordan — Studio Admin
**Profile:** Internal admin/content creator. Responsible for generating, reviewing, and publishing assembly guides at scale.
**Goals:** Use AI to generate high-quality guides, review them efficiently, maintain consistent quality across thousands of products.
**Frustrations:** Manual guide creation is too slow, AI output needs quality control, batch processing needs oversight.

---

## Journey 1: Find & Follow a Guide (Core Loop)

**Persona:** Alex (DIY Assembler)
**Trigger:** Alex just received an IKEA KALLAX shelf unit and wants to assemble it.

### Happy Path

```
1. DISCOVER
   Alex opens guid.how on their phone.

2. SEARCH
   Alex types "KALLAX" in the search bar.
   → Autocomplete suggests "KALLAX Shelf unit, white, 77x147 cm"
   → Product card shows a green "Guide Available" badge.
   → Alex taps the suggestion.

3. GUIDE PAGE (Desktop)
   Alex lands directly on the step-by-step work instructions — no product page in between.
   → Three-column docs-style layout:
     Left: TOC sidebar listing all 24 steps (scrollspy-tracked).
     Center: All steps rendered on a single scrollable page. Overview section at top shows:
       45 min estimated time, Medium difficulty, Tools needed: Phillips screwdriver, hammer.
     Right: Sticky illustration panel showing the current step's diagram.
       Below the illustration: compact Product Info Card with KALLAX thumbnail, price,
       key specs, and a "View details →" link to the full product page.
   → Progress bar at top shows 0% complete.
   → Alex gathers the tools listed in the overview, then starts scrolling through the instructions.

3b. GUIDE PAGE (Mobile)
   Alex taps the KALLAX result on their phone.
   → Lands directly on step 1 as a full-screen card: illustration on top, instruction text below.
   → Overview card shows tools, estimated time, and difficulty.
   → Progress bar shows step 1 of 24.
   → Alex swipes left to advance to the next step.
   → Small info icon in the header links to the full product details page if needed.

5. FOLLOW STEPS
   Alex works through each step:
   → Reads the instruction text (center column on desktop, card on mobile).
   → Studies the illustration in the sticky right panel (desktop) or top of card (mobile).
   → Pinch-to-zoom on illustration for fine detail. Click opens lightbox.
   → Sees a tip callout: "Make sure the smooth side faces outward."
   → On desktop: scrolls to next step (TOC auto-updates). On mobile: swipes left.
   → Progress bar fills incrementally.

6. TRICKY STEP
   At step 14, Alex is confused about screw direction.
   → The illustration clearly shows an anti-clockwise arrow with "Turn left to loosen" label.
   → A warning callout (red, with AlertTriangle icon) says: "Do NOT overtighten — cam lock should be snug, not forced."
   → Alex proceeds confidently.

7. COMPLETE
   Alex finishes step 24.
   → Celebration screen: "You built it! 🎉" with total time and completion badge.
   → Prompt: "Was this guide helpful?" → Alex rates 5 stars.
   → Prompt: "Create an account to save your progress and access guides offline."

8. SIGN UP (optional)
   Alex creates an account to save the KALLAX to their profile.
   → The guide is saved to "My Completed Builds."
```

### Alternative Discovery Methods

| Method | Flow |
|--------|------|
| **Article number** | Alex types "702.758.14" → exact product match |
| **Product URL paste** | Alex pastes `ikea.com/us/en/p/kallax-...` → system extracts article number → redirects to Guid product page |
| **Barcode scan** | Alex taps camera icon → scans barcode on box → article number extracted → product page loads |
| **Photo of label** | Alex photographs the product name/article number on the box → OCR extracts text → search results shown |
| **Photo of product** | (Future) Alex photographs the assembled product → image recognition identifies it → product page loads |

### Edge Cases

| Scenario | Handling |
|----------|----------|
| **No guide exists (has PDF)** | Route falls back to product detail page with "Guide being generated" status. PDF download available as fallback. |
| **No guide exists (no PDF)** | Route falls back to product detail page with "Submit a New Guide" CTA — user can contribute text instructions, photos, video links, or external resources. No "Guide Coming Soon" — without source material, guides depend on community input. |
| **Guide is AI-generated, not yet reviewed** | Route goes to guide viewer (guide-first) with "AI-Generated" badge. Add disclaimer: "This guide was auto-generated and may contain errors." Product Info Card in right column links to full product details. |
| **User loses internet mid-guide** | (Premium) Offline cache via service worker. (Free) Show last loaded step with "Reconnect to continue" message. |
| **User comes back later** | If signed in, resume from last completed step. If not, guide restarts (prompt to sign in to save progress). |
| **Wrong product variant** | After landing on product page, show variant selector if the product has color/size variants. |

---

## Journey 2: AI Guide Generation Pipeline (Admin)

**Persona:** Jordan (Studio Admin)
**Trigger:** Jordan wants to generate assembly guides for 50 new products that were just scraped.

### Pilot Phase (First Time)

```
1. SELECT PILOT PRODUCTS
   Jordan opens Studio → AI Generate dashboard.
   → Sees a list of products with assembly PDFs but no guide.
   → Selects one product from each category: bookshelf, desk, bed, wardrobe, storage.

2. START GENERATION
   Jordan clicks "Generate Guide" on the first pilot product.
   → System extracts pages from the assembly PDF.
   → Primary vision model analyzes each page (progress shown).
   → Structured guide data is assembled.
   → Illustration generation begins (Gemini creates isometric views per step).
   → Job status: "Processing → Generating illustrations → Ready for review"

3. REVIEW (Side-by-Side)
   Jordan opens the review screen.
   → Left panel: Original PDF page-by-page.
   → Right panel: AI-generated guide step-by-step.
   → Each step shows:
     - Confidence score (e.g., 92%)
     - Generated instruction text
     - Generated illustration
     - Extracted tool requirements
     - Any flagged issues (low confidence, missing parts)

4. EDIT & REFINE
   Jordan edits step 7 — the AI missed that the shelf should be flipped.
   → Jordan corrects the instruction text.
   → Jordan flags the illustration as needing regeneration.
   → Jordan adds a reviewer note: "AI misread part orientation in step 7."

5. APPROVE
   Jordan approves the guide after corrections.
   → Guide is marked as "Reviewed" with Jordan's name.
   → Confidence corrections feed back into the refinement dataset.

6. REPEAT FOR ALL PILOTS
   Jordan processes all 5 pilot products, noting patterns:
   → "AI struggles with cam lock orientation"
   → "Illustrations need more contrast on dark wood"
   → Feeds notes into prompt refinement.
```

### Batch Phase (After Quality Gate)

```
7. CONFIGURE BATCH
   After pilot quality reaches the target bar:
   → Jordan locks the current AI config (prompt template + model settings).
   → Opens batch processing: selects "All products with assembly PDF and no guide."
   → Sets priority order: by popularity (most-viewed products first).

8. LAUNCH BATCH
   Jordan starts the batch job.
   → Queue shows: 2,847 products to process.
   → Estimated time: ~48 hours (rate-limited API calls).
   → Progress dashboard shows: completed, processing, failed, queued.

9. QUALITY CONTROL
   As guides complete:
   → Auto-QC flags guides below confidence threshold.
   → Jordan reviews flagged guides first.
   → Approved guides auto-publish.
   → Failed guides enter a manual review queue.

10. MONITOR
    Jordan checks the dashboard daily:
    → Completion rate, average confidence score, failure reasons.
    → Adjusts prompts if a pattern of errors emerges.
```

### Edge Cases

| Scenario | Handling |
|----------|----------|
| **PDF is image-only (no text)** | Vision model handles it — designed for visual-only assembly manuals |
| **PDF has multiple products** | AI detects page ranges per product, generates separate guides |
| **AI can't determine step order** | Flag for manual review with "Low confidence: step ordering" |
| **API rate limit hit** | Queue pauses, resumes automatically. Dashboard shows "Rate limited — resuming in 5m" |
| **Product has no assembly PDF** | Skip in batch. Mark as "No source material" in dashboard. Product page goes live without guide — shows "Submit a New Guide" CTA for community contributions. |
| **Illustration generation fails** | Guide still publishable with text-only steps. Flag illustration for retry. |

---

## Journey 2B: Monthly Catalog Sync (Automated System + Admin Oversight)

**Persona:** Jordan (Studio Admin) + Automated System
**Trigger:** It's the 1st of the month. The system runs its monthly catalog sync to detect new products from each retailer, generate guides, and make them available to users.

### Automated Flow (No Human Intervention)

```
1. MONTHLY SYNC KICKS OFF
   On the 1st of the month, the catalog sync runs automatically for each retailer.
   → Compares each retailer's full product catalog against the Product table.
   → Detects 12 new IKEA products added since the last sync.

2. AUTO-SCRAPE
   For each new product:
   → Scrapes full product data (images, specs, documents, PDFs).
   → Inserts into Product table with guideStatus: "queued".
   → Flags as isNew: true (drives "New" badge for 30 days).
   → firstDetectedAt timestamp recorded.

3. AUTO-QUEUE AI GENERATION
   For each new product WITH an assembly PDF:
   → Creates an AIGenerationJob with priority: "high" and triggeredBy: "auto_sync".
   → Job enters the generation queue ahead of backfill jobs.
   → Products WITHOUT assembly PDFs get guideStatus: "no_source_material".
   → Product page goes live immediately (images, specs, documents) even before guide is ready.

4. AI PIPELINE BATCH RUNS
   Queue worker processes all new jobs over the following days:
   → PDF extraction → vision analysis → step extraction → illustration generation → quality scoring.
   → Same pipeline as manual/batch generation — no separate path.
   → All new product guides generated within ~72 hours of sync.

5. AUTO-PUBLISH (HIGH CONFIDENCE)
   Guide scores 92% confidence:
   → Auto-published. guideStatus → "published".
   → Product page now shows full assembly guide.
   → No admin action required.

6. REVIEW QUEUE (LOW CONFIDENCE)
   Guide scores 78% confidence:
   → Auto-published with "AI-Generated" badge.
   → guideStatus → "in_review". Flagged for admin review within the week.
   → Users can follow the guide immediately; badge signals it hasn't been human-verified yet.
```

### Admin Oversight (Jordan's Post-Sync Routine)

```
7. SYNC SUMMARY
   Jordan gets a notification after the monthly sync completes.
   → Opens Studio → Catalog Sync Dashboard.
   → Sees: "12 new products detected, 10 guides auto-published, 2 in review queue."
   → All products scraped successfully. No failures.

8. REVIEW FLAGGED GUIDES
   Jordan opens the review queue within the week.
   → 2 guides at 70-89% confidence. Reviews each one.
   → Side-by-side: original PDF vs AI-generated guide.
   → Corrects a misread part orientation, approves both guides.
   → "AI-Generated" badge removed, "Verified" badge added.

9. MONITOR TRENDS
   Jordan checks monthly trends:
   → Average confidence trending up (prompt refinements working).
   → 1 product had no assembly PDF — Jordan flags for manual upload.
   → Sync completed in 6 hours, all guides generated within 3 days.
```

### The User Experience (Alex Buys a New Product)

```
10. GUIDE AVAILABLE
    Alex buys a product that was added to the retailer catalog this month.
    → Gets home, opens guid.how, searches for the product.
    → Product page is there with images, specs, and assembly guide.
    → "New" badge shows it was recently added.
    → Alex follows the guide step by step.

11. PRODUCT TOO NEW (edge case)
    Alex buys a product that was JUST listed — after the latest monthly sync.
    → Product is NOT yet on Guid.
    → Alex searches → "We don't have that product yet."
    → Clicks "Notify me when guide is available."
    → Next monthly sync picks it up → guide generated → Alex gets notified.
    → In the meantime, Alex can download the PDF from the manufacturer's site.
```

### Edge Cases

| Scenario | Handling |
|----------|----------|
| **Retailer site down during sync** | Sync retries the next day. Dashboard shows "Sync incomplete" with reason. Admin can trigger manual re-sync. |
| **Product has no assembly PDF** | Product page live with images/specs. Guide status: "No source material." Show "Submit a New Guide" button — invite users to contribute assembly knowledge. |
| **Assembly PDF updated by retailer** | Detected during monthly sync via PDF hash change → auto-queue regeneration → new guide replaces old one, versioned. |
| **Product delisted by retailer** | Mark as `discontinued: true`. Keep guide live (users still own the product). Show "This product has been discontinued" notice. |
| **Scraper rate-limited by retailer** | Exponential backoff within the sync run. Monthly cadence means less pressure on retailer servers. Alert admin if persistent. |
| **Large catalog refresh (many new products)** | Queue handles burst naturally. High-priority new products processed first. Dashboard shows estimated completion time. Guides published as they complete over several days. |
| **User needs a product before next sync** | "Request this product" button → admin can trigger a manual single-product scrape + generation from Studio. |

---

## Journey 3: Quick Lookup (Pro Installer)

**Persona:** Sam (Pro Installer)
**Trigger:** Sam is assembling a customer's MALM dresser and needs to confirm the drawer slide orientation.

### Happy Path

```
1. QUICK SEARCH
   Sam opens guid.how on their phone.
   → Taps the search bar, types "MALM 6 drawer" or scans the article number barcode.
   → Product appears instantly (card shows green "Guide Available" badge).

2. JUMP TO STEP (Desktop)
   Sam clicks the MALM result → lands directly on the guide (three-column layout).
   → The TOC sidebar on the left lists all steps. Sam spots "Step 12: Install drawer slides."
   → Clicks step 12 in the TOC → the page smooth-scrolls to step 12. Illustration panel swaps to the step 12 diagram.

2b. JUMP TO STEP (Mobile)
   Sam taps the MALM result → lands directly on the guide → taps the floating TOC button (bottom-right).
   → Bottom sheet opens listing all steps.
   → Sam taps "Step 12: Install drawer slides" → jumps directly to that step card.

3. CONFIRM & GO
   Sam checks the illustration for drawer slide orientation.
   → Sees the arrow indicating "Flat side faces inward."
   → Confirms and continues assembling.
   → Total time on Guid: 30 seconds.
```

### Pro Features (Future Premium)

- **Recent products:** Quick access to last 20 products looked up
- **Favorites:** Save frequently assembled products
- **Step bookmarks:** Mark specific tricky steps across products
- **Offline cache:** Pre-download guides for products on today's schedule

---

## Journey 4: First-Time Visitor Onboarding

**Persona:** Alex (DIY Assembler, first visit)
**Trigger:** Alex Googled "KALLAX assembly instructions" and landed on guid.how.

### Happy Path

```
1. LAND ON GUIDE (via SEO)
   Alex lands directly on the KALLAX guide from Google.
   → Sees the step-by-step work instructions immediately — no product page in between.
   → Product Info Card in the right column shows product thumbnail, price, and key specs
     with a "View details →" link to the full product page.
   → No sign-up wall — the guide is freely accessible.

2. VALUE REALIZATION
   Alex is already in the guide and immediately sees the difference vs. the paper manual:
   → Clear text instructions alongside illustrations — visible from the moment of landing.
   → Tips and warnings that aren't in the original manual.
   → Progress tracking.

3. SOFT PROMPT TO SIGN UP
   After completing step 5, a non-intrusive banner:
   → "Sign up to save your progress and pick up where you left off."
   → "No thanks" dismisses it. No hard gate.

4. COMPLETE GUIDE
   Alex finishes the guide without signing up.
   → Completion screen prompts: "Create a free account to save this guide and get notified about new guides."

5. CONVERT (optional)
   Alex signs up after seeing the value.
   → Email + password (simple).
   → Guide auto-saved to profile.
   → "Welcome to Guid! Here's what you can do..." quick tour.
```

### SEO Landing Experience

| Entry Point | What Alex Sees |
|-------------|----------------|
| Google: "KALLAX assembly" | Guide page directly — work instructions visible immediately (if guide exists) |
| Google: "IKEA article 702.758.14" | Guide page (if guide exists) or product detail page (fallback) |
| Google: "how to assemble IKEA bookshelf" | Category page with guide-available products highlighted, or guide page |
| Direct: guid.how | Homepage: "Find step-by-step instructions for any product" — search bar, popular guides, category browsing |

---

## Journey 4B: Submit a New Guide (Community Contribution)

**Persona:** Alex (DIY Assembler) or Sam (Pro Installer)
**Trigger:** Alex assembled a product that doesn't have a guide on Guid (no manufacturer PDF exists). He wants to help others by sharing what he learned.

### Happy Path

```
1. DISCOVER THE GAP
   Alex finishes assembling a product. Searches for it on Guid.
   → Product page exists (images, specs) but no assembly guide.
   → Instead of "Guide Coming Soon", Alex sees:
     "No guide yet for this product. Know how to assemble this?"
   → Prominent "Submit a New Guide" button.

2. START SUBMISSION
   Alex clicks "Submit a New Guide."
   → If not signed in, prompted to log in or register first.
   → Submission form opens with the product pre-filled.

3. PROVIDE CONTENT
   Alex fills out the form:
   → Writes step-by-step text instructions from memory (freeform text box).
   → Uploads 8 photos he took during assembly (drag-and-drop or camera on mobile).
   → Pastes a YouTube link to a video he found helpful.
   → Adds tool list: "Phillips screwdriver, Allen key (included), hammer."
   → Sets difficulty: "Medium" and estimated time: "45 minutes."
   → All fields optional except at least one content type.

4. SUBMIT FOR REVIEW
   Alex clicks "Submit."
   → Success message: "Thanks for contributing! Your submission is being reviewed."
   → Alex receives an email confirmation.
   → Submission enters the admin review queue.

5. ADMIN REVIEW (Jordan)
   Jordan opens Studio → Submissions queue.
   → Sees Alex's submission with product name, content preview, and timestamp.
   → Reviews the text instructions and photos for quality and accuracy.
   → Decision: Approve → submission becomes source material for guide creation.

6. AI-ENHANCED GUIDE CREATION
   Jordan triggers "Generate from submission" on the approved submission.
   → AI pipeline takes Alex's text and photos → structures into proper steps.
   → AI adds formatting, part references, and generates illustrations.
   → Jordan reviews the AI-structured guide, makes edits, and publishes.

7. GUIDE LIVE
   Guide appears on the product page with "Community Contributed" badge.
   → Alex gets notified: "Your guide submission for [Product] is now live!"
   → Alex's profile shows the contribution (future: contributor reputation).
```

### Edge Cases

| Scenario | Handling |
|----------|----------|
| **Submission is too vague** | Admin sends "Request more info" with specific questions → Alex gets notified and can update |
| **Submission is wrong product** | Admin rejects with note: "This appears to be for a different product" |
| **Multiple submissions for same product** | Admin can merge the best parts from multiple submissions |
| **Spam submission** | Admin rejects. Repeat spam → user flagged for review |
| **Pro installer bulk contributions** | Sam (pro) submits guides for 10 products in a week → qualifies for "Top Contributor" badge (future) |

---

## Journey 5: Troubleshooting with AI Assistant

**Persona:** Dana (Product Owner / Troubleshooter) — also applies to Alex and Sam in repair scenarios
**Trigger:** Dana's KALLAX shelf has been in her living room for 8 months. The manual went in the recycling bin on day one. Now it's wobbling and a small metal piece fell out. Dana has no idea what the part is called or how to fix it.

### Happy Path

```
1. PANIC MOMENT
   Dana notices the KALLAX shelf is leaning. A small metal piece fell out.
   → Dana Googles "KALLAX shelf wobbling fix" → lands on guid.how.
   → Or: Dana remembers Guid from when she first assembled it → goes directly to guid.how.

2. PROACTIVE PROMPT
   As soon as Dana lands on the KALLAX product page, the assistant proactively offers help:
   → A subtle chat bubble appears: "Having trouble with your KALLAX? I can help
     you troubleshoot, find replacement parts, or walk you through a fix."
   → Dana taps it.

3. GUIDED INTAKE
   The assistant doesn't just open an empty chat — it starts with structured starter questions
   to narrow down the problem fast:
   → "What's happening with your KALLAX?" → Quick-pick options:
     [ Wobbling/unstable ] [ Missing part ] [ Something broke ] [ Won't close/open ] [ Other ]
   → Dana taps "Wobbling/unstable."
   → "When did this start?"
     [ Just happened ] [ Gradually over time ] [ After moving it ] [ Not sure ]
   → Dana taps "Just happened."
   → "Did anything fall out or come loose?"
     [ Yes — a piece fell out ] [ Not sure ] [ No, it just wobbles ]
   → Dana taps "Yes — a piece fell out."
   → "Can you send a photo of the piece? This helps me identify exactly what it is."
   → Dana snaps a photo and uploads it.

   → The assistant now has: product (KALLAX), problem (wobbling), timing (just happened),
     detail (piece fell out), and a photo — enough context for a targeted diagnosis.

4. DIAGNOSE
   Assistant: "Got it — KALLAX 77x147 cm. A few things can cause wobbling:
     1. Loose cam locks (the round metal pieces inside the joints)
     2. Missing dowel pins
     3. Uneven surface
     You mentioned a metal piece fell out — can you describe it or send a photo?"

   Dana takes a photo of the fallen piece and uploads it.

   Assistant: "That's a cam lock disc (part #118331). It locks the shelves
     to the frame. Here's how to reinstall it..."

4. GUIDED FIX
   Assistant walks Dana through the fix, one step at a time:
   → "Step 1: Locate the round hole on the shelf panel where this piece came from."
   → "Step 2: Insert the cam lock with the arrow pointing toward the edge..."
   → "Step 3: Use a Phillips screwdriver to turn it clockwise until snug."
   → Each step is conversational — Dana can say "done" or ask clarifying questions.

5. RESOLVED
   Dana: "It's tight now, shelf feels solid!"
   Assistant: "Great! A few tips to prevent this:
     - Check all cam locks every 6 months
     - If you move the shelf, re-tighten all joints after
     - The KALLAX wall anchor kit (sold separately) adds extra stability."

   → Prompt: "Was this helpful?" → Dana rates the chat.
   → Prompt: "Save this product to get maintenance reminders."

6. LIFETIME VALUE
   Dana saves the KALLAX to her profile.
   → 6 months later: "Time to check your KALLAX cam locks!" reminder.
   → Dana is now a returning Guid user — not just for assembly, but for life.
```

### Alternative Entry Points

| Entry | Flow |
|-------|------|
| **Proactive prompt (product page)** | Dana lands on the KALLAX page → assistant bubble pops up offering help → taps → guided intake begins with product pre-filled |
| **Proactive prompt (homepage)** | Dana opens guid.how → assistant greets: "Need help with a product?" → Dana types product name → guided intake begins |
| **Global chat** | Dana goes to `/chat` → types product name → assistant identifies product → guided intake begins |
| **Photo-first** | Dana takes a photo of the broken piece → assistant identifies the product and part from the image |
| **Search "fix KALLAX"** | Search detects troubleshooting intent → routes to chat instead of guide |

### Edge Cases

| Scenario | Handling |
|----------|----------|
| **Can't identify product from description** | Ask clarifying questions: "Do you have the article number? It's on a sticker on the back." Or: "Can you send a photo of the product?" |
| **Problem requires a replacement part** | Provide exact part number + where to buy it (IKEA spare parts, third-party). Link to the retailer's spare parts page. |
| **Problem is beyond DIY repair** | "This might need professional help. Here's what to tell a furniture repair service: [pre-filled issue description]." |
| **Product not in database** | "I don't have this product in my system yet. Can you upload a photo of the product label? I'll do my best to help with general guidance." |
| **User asks about assembly (not troubleshooting)** | Detect intent, redirect: "It looks like you want to assemble this product — I have a full step-by-step guide! [Start Assembly Guide]" |
| **Free tier limit reached** | "You've used your 3 free chats this month. Upgrade to Premium for unlimited troubleshooting help." Show what Premium includes. |

---

## Journey 6: Subscription Upgrade (Future)

**Persona:** Alex (returning user)
**Trigger:** Alex has used Guid for 3 products and wants premium features.

### Happy Path

```
1. HIT FREE TIER LIMIT
   Alex tries to access a YouTube creator video guide → "Premium feature" modal.
   → Shows what's included: creator video guides, offline access, AR overlay, ad-free.
   → "Upgrade for $X/month" button.

2. PRICING PAGE
   Alex views the pricing page.
   → Free vs. Premium comparison table.
   → Annual discount option.

3. CHECKOUT
   Alex clicks "Start Premium."
   → Stripe Checkout opens.
   → Alex enters payment info and confirms.

4. PREMIUM ACTIVATED
   → Immediate access to all premium features.
   → "Welcome to Premium" confirmation email.
   → Premium badge on profile.
```

---

## Cross-Journey Patterns

### Universal Search Behavior

| Input Type | Detection | Action |
|------------|-----------|--------|
| Text (3+ chars) | Default | Fuzzy search by product name, type, description |
| Numbers only | Article number pattern | Exact match on `article_number` |
| URL (contains http) | URL detection | Extract article number from retailer URL, redirect to product |
| Camera input | Barcode/QR/OCR | Scan → extract text/number → search |
| Photo of product | Image recognition (future) | AI identifies product → search |

### Authentication Touchpoints

| Moment | Prompt Type | Reason |
|--------|-------------|--------|
| Save a product | Soft prompt | Need account to save |
| Resume a guide | Soft prompt | Need account to track progress |
| Rate a guide | Soft prompt | Need account for ratings |
| Use troubleshooting chat (4+ times/month) | Soft prompt → hard gate | Free tier allows 3 chats/month |
| Access premium | Hard gate | Requires subscription |
| Studio access | Hard gate | Requires admin role |

### Error States

| Error | User Message | Recovery |
|-------|-------------|----------|
| Product not found | "We don't have that product yet. Try a different search." | Show similar products, "Request this product" form, or "Submit a New Guide" if they know the product |
| Guide generating | "Guide is being generated — check back shortly." | Show progress indicator + PDF download as fallback |
| No guide (no source) | "No guide yet for this product." | Show "Submit a New Guide" button — user can contribute text, photos, or video links |
| Server error | "Something went wrong. We're on it." | Retry button + cached content if available |
| Network offline | "You're offline." | Show cached guides (premium) or "Reconnect" message |
