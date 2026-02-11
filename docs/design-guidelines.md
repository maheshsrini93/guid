# Design Guidelines — Guid (guid.how)

## Design Philosophy

**Technical precision meets bold confidence.** Guid's design signals accuracy and trustworthiness through structured layouts and strong typography, while warm amber tones bring the energy and approachability of a hands-on DIY tool. Every pixel should make the user feel: "This guide knows what it's talking about."

### Principles

1. **Clarity over decoration** — Every element serves the guide. Remove anything that doesn't help the user complete a step.
2. **Structured confidence** — Grid-based layouts, consistent spacing, and strong hierarchy signal reliability.
3. **Warm precision** — Technical accuracy delivered with approachable warmth. Not cold or clinical.
4. **Progress is visible** — The user always knows where they are, what's next, and how far they've come.

---

## Color Palette

### Brand Colors (Orange/Amber)

| Token | Role | Value (Light) | Description |
|-------|------|---------------|-------------|
| `--primary` | Primary action, CTAs | `oklch(0.75 0.18 55)` | Warm amber — the signature Guid color |
| `--primary-foreground` | Text on primary | `oklch(0.15 0.02 55)` | Dark brown for contrast on amber |
| `--secondary` | Supporting surfaces | `oklch(0.97 0.01 55)` | Very light warm gray |
| `--secondary-foreground` | Text on secondary | `oklch(0.25 0.02 55)` | Dark warm gray |
| `--accent` | Highlights, hover states | `oklch(0.85 0.15 65)` | Light amber for hover/active |
| `--accent-foreground` | Text on accent | `oklch(0.20 0.02 55)` | Dark on light amber |
| `--destructive` | Errors, warnings | `oklch(0.58 0.24 27)` | Red (keep current) |
| `--muted` | Subtle backgrounds | `oklch(0.96 0.005 55)` | Near-white with warm undertone |
| `--muted-foreground` | Secondary text | `oklch(0.55 0.02 55)` | Medium warm gray |

### Semantic Colors

| Use Case | Color | Purpose |
|----------|-------|---------|
| **Step complete** | Green `oklch(0.65 0.18 145)` | Checkmarks, completed step indicators |
| **Current step** | Amber `oklch(0.75 0.18 55)` | Active step highlight |
| **Warning/tip** | Yellow `oklch(0.85 0.15 85)` | Tip callouts in guides |
| **Danger/caution** | Red `oklch(0.58 0.24 27)` | Safety warnings in steps |
| **Info** | Blue `oklch(0.65 0.15 250)` | Tool requirements, part references |

### Dark Mode

Dark mode inverts the luminance scale while preserving amber warmth:
- Background: deep warm charcoal (`oklch(0.16 0.01 55)`)
- Cards: slightly lighter (`oklch(0.22 0.01 55)`)
- Primary amber remains vibrant against dark surfaces
- Text shifts to warm off-white (`oklch(0.96 0.01 55)`)

---

## Typography

### Font Stack

| Role | Font | Usage |
|------|------|-------|
| **Sans (primary)** | Geist Sans | Body text, UI elements, navigation |
| **Mono (technical)** | Geist Mono | Part numbers, measurements, tool specs, code |

### Type Scale

| Level | Size | Weight | Use |
|-------|------|--------|-----|
| **H1** | 2.5rem (40px) | 700 (Bold) | Page titles |
| **H2** | 2rem (32px) | 700 (Bold) | Section headers |
| **H3** | 1.5rem (24px) | 600 (Semibold) | Card titles, step headers |
| **H4** | 1.25rem (20px) | 600 (Semibold) | Subsection headers |
| **Body** | 1rem (16px) | 400 (Regular) | Instructions, descriptions |
| **Body sm** | 0.875rem (14px) | 400 (Regular) | Metadata, captions |
| **Caption** | 0.75rem (12px) | 500 (Medium) | Labels, badges |
| **Mono** | 0.875rem (14px) | 400 (Regular) | Part numbers, measurements |

### Typography Rules
- Guide instructions use **Body** size with generous line-height (1.7) for readability
- Step numbers use **H3** with mono font for the number itself
- Part references (e.g., "Dowel #104321") always use mono font
- Measurements always use mono font with unit labels

---

## Spacing & Layout

### Grid System
- **Max content width:** 1280px (80rem)
- **Page padding:** 1.5rem (mobile), 2rem (tablet), 3rem (desktop)
- **Component gap:** 1rem default, 1.5rem for card grids, 2rem for page sections
- **Card padding:** 1.5rem

### Spacing Scale (Tailwind)
| Token | Value | Usage |
|-------|-------|-------|
| `gap-2` | 0.5rem | Tight inline elements |
| `gap-3` | 0.75rem | Related items |
| `gap-4` | 1rem | Default component gap |
| `gap-6` | 1.5rem | Card grids, form fields |
| `gap-8` | 2rem | Page sections |
| `gap-12` | 3rem | Major section breaks |

---

## Components

### Buttons

| Variant | Use Case | Style |
|---------|----------|-------|
| **Primary** | Main CTAs ("Start Guide", "Next Step") | Amber background, dark text, bold weight |
| **Secondary** | Supporting actions ("Save", "Share") | Light warm gray background, dark text |
| **Outline** | Tertiary actions ("Cancel", "Back") | Transparent with warm gray border |
| **Ghost** | Inline actions (filters, nav) | No background, text-only with hover state |
| **Destructive** | Dangerous actions ("Delete Guide") | Red background, white text |

### Cards

- **Product cards:** Image top, info bottom. Subtle warm border. Hover: slight lift (shadow-md) + border color shift to amber.
- **Step cards:** Numbered indicator (amber circle) left-aligned, instruction content right. Connected by a vertical progress line.
- **Stat cards (Studio):** Large mono number, label below. Amber accent for key metrics.

### Guide Viewer

The guide viewer is the core UX — it must be exceptional:

- **Step indicator:** Vertical progress bar on the left with numbered circles. Completed = green fill. Current = amber fill + pulse. Upcoming = gray outline.
- **Step content:** Title (H3), instruction (Body with 1.7 line-height), tip callout (amber background), warning callout (red background).
- **Step illustration:** Right side or below instruction on mobile. Bordered frame with zoom capability.
- **Navigation:** Large "Next Step" / "Previous Step" buttons. Keyboard shortcuts (arrow keys). Swipe on mobile.
- **Progress bar:** Thin amber bar at top showing % complete.

### Product Freshness & Status Badges

Badges communicate product and guide status to users and admins:

| Badge | Context | Style |
|-------|---------|-------|
| **"New"** | Product cards, product detail — product detected within last 30 days (since last monthly sync) | Small amber pill badge, bold text, subtle pulse animation on first view |
| **"AI-Generated"** | Guide viewer — guide was auto-generated and auto-published (70-89% confidence, pending admin review) | Small blue outline pill badge, mono text |
| **"Guide Coming Soon"** | Product detail — product exists but guide is still being generated or in review | Muted gray pill badge, italic text |
| **"Verified"** | Guide viewer — guide has been reviewed and approved by an admin | Small green pill badge with checkmark icon |

**Studio-specific status indicators:**

| Indicator | Context | Style |
|-----------|---------|-------|
| **Guide status dot** | Product list in Studio — shows guide pipeline status at a glance | Colored dot: green (published), amber (in review), blue (generating), gray (no source), red (failed) |
| **Time-to-guide** | Sync dashboard — time from product detection to guide published | Mono font, color-coded: green (< 3 days), amber (3-7 days), red (> 7 days) |

### Forms (Studio)

- **Input fields:** Warm gray border, amber focus ring, generous padding
- **Labels:** Caption size, semibold, uppercase tracking
- **Validation:** Inline error messages in red below the field
- **Required indicators:** Amber asterisk

### Navigation

- **Header:** Clean top bar with logo (left), main nav (center), auth actions (right)
- **Breadcrumbs:** On product detail and guide pages. Subtle separator, current page in bold.
- **Sidebar (Studio):** Fixed left sidebar with icon + label nav items. Amber highlight for active item.

---

## AI-Generated Illustrations

### Generation Models

Illustrations are generated using Google's **Nano Banana** model family, with model selection based on step complexity for cost efficiency:

| Model | API Model ID | Use Case | Resolution | Cost |
|-------|-------------|----------|------------|------|
| **Nano Banana** (Gemini 2.5 Flash Image) | `gemini-2.5-flash-image` | Simple steps: single-part placement, tool usage close-ups, straightforward actions | Up to 2K | Lower cost, faster |
| **Nano Banana Pro** (Gemini 3 Pro Image) | `gemini-3-pro-image-preview` | Complex steps: exploded views, multi-part assemblies, precise spatial relationships, fine text annotations | Up to 4K | ~$0.134/image (1K-2K), ~$0.24/image (4K) |

**Routing logic:** The pipeline auto-classifies each step as simple or complex based on part count, spatial relationships, and annotation requirements, then routes to the appropriate model.

**Batch optimization:** Use Nano Banana Pro Batch API (50% discount) for overnight batch generation of complex illustrations.

### Style: Isometric Technical

All illustrations — regardless of which Nano Banana model generates them — must follow the same **isometric technical** style for visual consistency across an entire guide:

- **Perspective:** Isometric 3D view (30-degree angle) — consistent across all steps
- **Line weight:** Clean, precise lines with consistent stroke width
- **Colors:** Product parts in neutral tones (warm grays, wood tones), hardware in metallic silver, highlighted parts in amber
- **Annotations:** Numbered callouts pointing to specific parts, action arrows showing direction of movement
- **Background:** Clean white or very light warm gray — no distracting patterns
- **Consistency:** Same angle, scale, and style across all steps in a guide — no visible quality difference between Nano Banana and Nano Banana Pro output
- **Resolution:** Generate at 2K minimum for web, 4K (via Nano Banana Pro) for illustrations requiring fine detail (small hardware, text labels, exploded views)

### Prompt Consistency

To ensure visual consistency between Nano Banana (simple steps) and Nano Banana Pro (complex steps):
- Use a shared **style preamble** in all illustration prompts (angle, color palette, line weight, background)
- Include **reference images** from previously approved illustrations as style anchors (Nano Banana Pro supports up to 14 reference images)
- Run a **visual consistency check** post-generation: compare color histogram and style metrics between steps in the same guide
- Detailed illustration creation guidelines will be provided by the product owner (see implementation-plan.md Phase 1 open issues)

### Annotation Standards

| Element | Visual Treatment |
|---------|-----------------|
| **Part being installed** | Highlighted with amber outline or fill |
| **Direction of movement** | Curved arrow with amber color |
| **Screw rotation** | Circular arrow (CW/CCW) with label |
| **Part numbers** | Rounded badge with mono font |
| **Tools needed** | Small tool icon in corner |
| **Warning areas** | Red dashed outline |
| **Step complexity indicator** | (Internal) Simple steps → Nano Banana, Complex steps → Nano Banana Pro |

### AI Troubleshooting Chat

The chat assistant has its own set of UI components:

- **Proactive bubble:** Floating chat bubble (bottom-right corner) with amber accent. Pulsing dot to draw attention. Text: "Need help? Ask the assistant." Appears after 3 seconds on product pages, dismissible.
- **Guided intake chips:** On chat open, structured starter questions appear as tappable chips (not free text). Styled as rounded pill buttons with warm gray background, amber border on hover. Categories: "Wobbling/unstable", "Missing part", "Something broke", "Won't close/open", "Other".
- **Message bubbles:**
  - *User messages:* Right-aligned, amber background, dark text. Rounded corners (all four).
  - *Assistant messages:* Left-aligned, light warm gray background, dark text. Avatar icon (Guid logo, small) left of first message.
- **Image attachments:** Inline thumbnail in message bubble, rounded corners, tap to expand. Camera icon button next to text input.
- **Typing indicator:** Three pulsing dots in assistant bubble style. Text below: "Guid is thinking..."
- **Step-by-step repair cards:** When the assistant provides fix instructions, each step renders as a compact card within the chat (not just text). Numbered, with optional inline illustration thumbnail.
- **Part identification card:** When AI identifies a part from a photo, show a structured card: part name, part number (mono font), product image, "Where to buy" link.
- **Escalation card:** If assistant can't resolve, show a card with pre-filled issue summary + "Contact manufacturer" button.

---

## Responsive Breakpoints

| Breakpoint | Width | Layout Changes |
|------------|-------|----------------|
| **Mobile** | < 640px | Single column, stacked cards, bottom nav, full-width images |
| **Tablet** | 640–1024px | Two-column product grid, side-by-side guide layout |
| **Desktop** | 1024–1280px | Three-column product grid, sidebar filters visible |
| **Wide** | > 1280px | Max-width container, centered content |

---

## Animation & Motion

- **Transitions:** 150ms ease for hover states, 200ms ease for layout shifts
- **Page transitions:** Subtle fade (opacity 0 → 1, 200ms)
- **Step transitions:** Slide left/right with fade for guide step navigation
- **Loading:** Skeleton screens matching final layout shape
- **Progress:** Smooth width animation on progress bars
- **No bouncy or playful animations** — motion should feel precise and intentional

---

## Iconography

- **Library:** Lucide React (already installed)
- **Size:** 20px default (w-5 h-5), 16px for inline (w-4 h-4), 24px for hero (w-6 h-6)
- **Style:** Stroke-based, 1.5px stroke weight
- **Color:** Inherits text color by default. Amber for interactive/active states.
