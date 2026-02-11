# Changelog — Guid Project Docs

All notable changes to the project documentation (`docs/`) are logged here. Newest entries first.

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
