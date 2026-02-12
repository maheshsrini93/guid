# Design Guidelines — Guid (guid.how)

> **Workflow note:** Before writing any UI code, read this document. For the full UI/UX development workflow (including required UI/UX Pro Max skill checks and pre-delivery checklist), see the "UI/UX Development Workflow" section in `CLAUDE.md`.

## Design Philosophy

**Technical precision meets bold confidence.** Guid's design signals accuracy and trustworthiness through structured layouts and strong typography, while warm amber tones bring the energy and approachability of a hands-on DIY tool. Every pixel should make the user feel: "This guide knows what it's talking about."

### Principles

1. **Clarity over decoration** — Every element serves the guide. Remove anything that doesn't help the user complete a step.
2. **Structured confidence** — Grid-based layouts, consistent spacing, and strong hierarchy signal reliability.
3. **Warm precision** — Technical accuracy delivered with approachable warmth. Not cold or clinical.
4. **Progress is visible** — The user always knows where they are, what's next, and how far they've come.
5. **Accessible by default** — All designs meet WCAG 2.1 AA. Color is never the sole indicator. Keyboard and screen reader support are first-class.

---

## Accessibility

Accessibility is a foundational requirement, not an afterthought. Every component and pattern must meet these standards.

### Contrast

- **Normal text (< 18px / < 14px bold):** Minimum 4.5:1 contrast ratio against background (WCAG AA).
- **Large text (≥ 18px / ≥ 14px bold):** Minimum 3:1 contrast ratio.
- **UI components and graphical objects:** Minimum 3:1 contrast ratio against adjacent colors.
- **Verify:** Test all token pairings (e.g., `--muted-foreground` on `--muted`) against both light and dark themes.

### Keyboard Navigation

- All interactive elements reachable via Tab key. Tab order matches visual reading order (left-to-right, top-to-bottom).
- Visible focus rings on all focusable elements: `2px solid` amber outline with `2px offset`. Never remove `:focus-visible` styles.
- No keyboard traps — every modal, sheet, and overlay can be dismissed with Escape.
- Guide viewer: Arrow keys (← →) navigate steps on desktop. Home/End jump to first/last step.

### Screen Readers

- Use semantic HTML: `<nav>`, `<main>`, `<article>`, `<section>`, `<aside>`.
- Add `aria-label` to all icon-only buttons (e.g., `aria-label="Close menu"`).
- Guide viewer: Each step is a `<section>` with `aria-labelledby` referencing the step heading. TOC links use `aria-current="step"` for the active step.
- Live regions: Use `aria-live="polite"` for illustration swaps, `role="alert"` for error messages.
- Heading hierarchy: Every page has exactly one `<h1>`. Headings follow `h1 → h2 → h3` without skipping levels.

### Skip Links

- Provide a visually hidden "Skip to main content" link as the first focusable element on every page.
- On guide viewer pages, add a second skip link: "Skip to current step."

### Color Independence

- Never convey information by color alone. Always pair color with an icon, label, or pattern.
- Step status: green + checkmark icon (completed), amber + filled circle (current), gray + outline circle (upcoming).
- Form errors: red text + error icon + `role="alert"`, not just a red border.

### Touch Targets

- Minimum 44x44px for all interactive elements (buttons, links, form controls, step indicators).
- Spacing between adjacent touch targets: minimum 8px gap to prevent mis-taps.

### Reduced Motion

- Respect `prefers-reduced-motion: reduce`. When active:
  - Disable all transitions and animations.
  - Step transitions switch to instant (no slide/fade).
  - Skeleton shimmer replaced with static placeholder.
  - Progress bar updates instantly (no smooth width animation).

---

## Color Palette

### Brand Colors (Orange/Amber)

All colors use oklch for perceptual uniformity. Hex fallbacks provided for older browsers.

| Token | Role | Light Mode | Hex Fallback | Contrast Notes |
|-------|------|-----------|-------------|----------------|
| `--background` | Page background | `oklch(0.99 0.002 55)` | `#fdfcfb` | — |
| `--foreground` | Primary text | `oklch(0.15 0.02 55)` | `#1f1a14` | 15.8:1 on background |
| `--primary` | CTAs, brand actions | `oklch(0.75 0.18 55)` | `#e5932c` | — |
| `--primary-foreground` | Text on primary | `oklch(0.15 0.02 55)` | `#1f1a14` | 7.2:1 on primary |
| `--secondary` | Supporting surfaces | `oklch(0.97 0.01 55)` | `#f6f3f0` | — |
| `--secondary-foreground` | Text on secondary | `oklch(0.25 0.02 55)` | `#3b3228` | 10.1:1 on secondary |
| `--accent` | Highlights, hover states | `oklch(0.85 0.15 65)` | `#f0c07a` | — |
| `--accent-foreground` | Text on accent | `oklch(0.20 0.02 55)` | `#2d261e` | 8.5:1 on accent |
| `--destructive` | Errors, danger actions | `oklch(0.58 0.24 27)` | `#d93636` | — |
| `--destructive-foreground` | Text on destructive | `oklch(0.98 0.005 55)` | `#faf8f6` | 7.8:1 on destructive |
| `--muted` | Subtle backgrounds | `oklch(0.96 0.005 55)` | `#f2efec` | — |
| `--muted-foreground` | Secondary text | `oklch(0.50 0.02 55)` | `#6b5e52` | 5.2:1 on muted (AA) |
| `--card` | Card backgrounds | `oklch(0.99 0.002 55)` | `#fdfcfb` | — |
| `--card-foreground` | Card text | `oklch(0.15 0.02 55)` | `#1f1a14` | 15.8:1 on card |
| `--border` | Borders, separators | `oklch(0.90 0.01 55)` | `#e0d8d0` | 3.1:1 against background |
| `--input` | Input borders | `oklch(0.85 0.01 55)` | `#d1c8be` | — |
| `--ring` | Focus rings | `oklch(0.75 0.18 55)` | `#e5932c` | Same as primary |

> **Note:** `--muted-foreground` was adjusted from L=0.55 to L=0.50 to meet the 4.5:1 AA minimum on muted backgrounds.

### Semantic Colors

Semantic colors always pair with an icon or label (never color-only).

| Use Case | Color | Icon | Purpose |
|----------|-------|------|---------|
| **Step complete** | Green `oklch(0.65 0.18 145)` | `Check` (Lucide) | Completed step indicators |
| **Current step** | Amber `oklch(0.75 0.18 55)` | Filled circle | Active step highlight |
| **Upcoming step** | Gray `oklch(0.70 0.01 55)` | Outline circle | Steps not yet reached |
| **Success** | Green `oklch(0.65 0.18 145)` | `CheckCircle` | Success toasts, confirmations |
| **Warning/tip** | Yellow `oklch(0.85 0.15 85)` | `Lightbulb` | Tip callouts in guides |
| **Danger/caution** | Red `oklch(0.58 0.24 27)` | `AlertTriangle` | Safety warnings in steps |
| **Info** | Blue `oklch(0.65 0.15 250)` | `Info` | Tool requirements, part references |

### Dark Mode

Dark mode inverts the luminance scale while preserving amber warmth. Full token mapping:

| Token | Dark Mode Value | Hex Fallback |
|-------|----------------|-------------|
| `--background` | `oklch(0.16 0.01 55)` | `#1a1714` |
| `--foreground` | `oklch(0.96 0.01 55)` | `#f4f0ec` |
| `--primary` | `oklch(0.75 0.18 55)` | `#e5932c` |
| `--primary-foreground` | `oklch(0.15 0.02 55)` | `#1f1a14` |
| `--secondary` | `oklch(0.22 0.01 55)` | `#2e2924` |
| `--secondary-foreground` | `oklch(0.90 0.01 55)` | `#e0d8d0` |
| `--accent` | `oklch(0.30 0.05 55)` | `#4a3d2e` |
| `--accent-foreground` | `oklch(0.90 0.01 55)` | `#e0d8d0` |
| `--destructive` | `oklch(0.58 0.24 27)` | `#d93636` |
| `--destructive-foreground` | `oklch(0.96 0.01 55)` | `#f4f0ec` |
| `--muted` | `oklch(0.22 0.01 55)` | `#2e2924` |
| `--muted-foreground` | `oklch(0.65 0.015 55)` | `#9c8e80` |
| `--card` | `oklch(0.20 0.01 55)` | `#282320` |
| `--card-foreground` | `oklch(0.96 0.01 55)` | `#f4f0ec` |
| `--border` | `oklch(0.30 0.01 55)` | `#3e3730` |
| `--input` | `oklch(0.30 0.01 55)` | `#3e3730` |
| `--ring` | `oklch(0.75 0.18 55)` | `#e5932c` |

**Dark mode considerations:**
- Illustrations: Add a subtle warm overlay or adjust brightness for dark backgrounds. White illustration backgrounds get a `border-radius` with `--border` color border.
- Shadows: Switch from dark shadows to subtle lighter glows (`0 0 12px oklch(0 0 0 / 0.4)`).
- Images: Product images retain original appearance. No filter/invert.

---

## Typography

### Font Stack

| Role | Font | Usage | Loading |
|------|------|-------|---------|
| **Sans (primary)** | IBM Plex Sans | Body text, UI elements, navigation, headings | `next/font/google` with `font-display: swap` |
| **Mono (technical)** | JetBrains Mono | Part numbers, measurements, tool specs, step numbers, code | `next/font/google` with `font-display: swap` |

**Tailwind config:**
```
fontFamily: {
  sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
  mono: ['JetBrains Mono', 'ui-monospace', 'monospace']
}
```

**Why IBM Plex Sans + JetBrains Mono:** IBM Plex Sans was designed for clarity in technical documentation — excellent legibility at all sizes with a professional, approachable feel. JetBrains Mono has precise character differentiation (critical for part numbers like `104321` vs `104231`) and excellent readability at small sizes.

### Type Scale

Desktop sizes shown. Mobile sizes use `clamp()` for fluid scaling.

| Level | Desktop | Mobile | Weight | Line Height | Max Width | Use |
|-------|---------|--------|--------|-------------|-----------|-----|
| **H1** | 2.5rem (40px) | `clamp(1.75rem, 5vw, 2.5rem)` | 700 (Bold) | 1.2 | — | Page titles |
| **H2** | 2rem (32px) | `clamp(1.5rem, 4vw, 2rem)` | 700 (Bold) | 1.25 | — | Section headers |
| **H3** | 1.5rem (24px) | `clamp(1.25rem, 3.5vw, 1.5rem)` | 600 (Semibold) | 1.3 | — | Card titles, step headers |
| **H4** | 1.25rem (20px) | 1.125rem (18px) | 600 (Semibold) | 1.35 | — | Subsection headers |
| **Body** | 1rem (16px) | 1rem (16px) | 400 (Regular) | 1.7 | 72ch (~576px) | Instructions, descriptions |
| **Body sm** | 0.875rem (14px) | 0.875rem (14px) | 400 (Regular) | 1.5 | 72ch | Metadata, captions |
| **Caption** | 0.75rem (12px) | 0.75rem (12px) | 500 (Medium) | 1.4 | — | Labels, badges |
| **Mono** | 0.875rem (14px) | 0.875rem (14px) | 400 (Regular) | 1.5 | — | Part numbers, measurements |

### Typography Rules

- **Line length:** Limit body text to 65–75 characters per line (`max-w-prose` or `max-w-[72ch]`). Guide instructions must never run wider than this.
- **Guide instructions:** Use **Body** size with 1.7 line-height for readability. Each instruction paragraph is its own block with `gap-3` between paragraphs.
- **Step numbers:** Use **H3** with JetBrains Mono for the number itself (e.g., "Step 14").
- **Part references:** Always use JetBrains Mono (e.g., `Dowel #104321`). Wrap in `<code>` for semantic correctness.
- **Measurements:** Always use JetBrains Mono with unit labels (e.g., `77 × 147 cm`).
- **Emphasis in body text:** Use `font-weight: 600` (semibold) for inline emphasis within instructions. Reserve bold (700) for headings only.
- **No minimum below 12px:** Never set text smaller than 12px (Caption size). Mobile body text must be at least 16px to prevent forced zoom.

---

## Spacing & Layout

### Grid System

- **Max content width:** 1280px (80rem)
- **Guide viewer max width:** 1440px (90rem) — wider to accommodate 3-column layout
- **Page padding:** 1rem (mobile), 1.5rem (tablet), 2rem (desktop), 3rem (wide)
- **Component gap:** 1rem default, 1.5rem for card grids, 2rem for page sections
- **Card padding:** 1.5rem

### Spacing Scale (Tailwind)

| Token | Value | Usage |
|-------|-------|-------|
| `gap-1` | 0.25rem | Icon-to-label spacing |
| `gap-2` | 0.5rem | Tight inline elements, badge padding |
| `gap-3` | 0.75rem | Related items, form label to input |
| `gap-4` | 1rem | Default component gap |
| `gap-6` | 1.5rem | Card grids, form fields, card padding |
| `gap-8` | 2rem | Page sections |
| `gap-12` | 3rem | Major section breaks |
| `gap-16` | 4rem | Hero sections, page-level vertical spacing |

### Z-Index Scale

Defined globally to prevent z-index wars:

| Layer | Value | Usage |
|-------|-------|-------|
| `z-base` | `0` | Default content |
| `z-sticky` | `10` | Sticky TOC sidebar, sticky illustration panel |
| `z-header` | `20` | Site header / navbar |
| `z-dropdown` | `30` | Dropdowns, popovers, tooltips |
| `z-sheet` | `40` | Bottom sheets, side panels |
| `z-modal` | `50` | Modals, dialogs, lightbox |
| `z-toast` | `60` | Toast notifications |
| `z-chat` | `70` | Chat bubble / chat panel (always on top) |

### Shadow Scale

| Token | Value | Usage |
|-------|-------|-------|
| `shadow-sm` | `0 1px 2px oklch(0 0 0 / 0.05)` | Subtle depth for inputs, badges |
| `shadow-md` | `0 4px 6px oklch(0 0 0 / 0.07)` | Card hover states, dropdowns |
| `shadow-lg` | `0 10px 15px oklch(0 0 0 / 0.1)` | Modals, floating panels |
| `shadow-xl` | `0 20px 25px oklch(0 0 0 / 0.12)` | Lightbox, elevated overlays |

### Border Radius Scale

| Token | Value | Usage |
|-------|-------|-------|
| `rounded-sm` | `0.25rem (4px)` | Badges, small chips |
| `rounded-md` | `0.375rem (6px)` | Inputs, buttons |
| `rounded-lg` | `0.5rem (8px)` | Cards, panels |
| `rounded-xl` | `0.75rem (12px)` | Modals, sheets, guide viewer panels |
| `rounded-full` | `9999px` | Pills, avatars, step indicator circles |

---

## Components

### Buttons

#### Variants

| Variant | Use Case | Style |
|---------|----------|-------|
| **Primary** | Main CTAs ("Start Guide", "Next Step") | Amber background (`--primary`), dark text (`--primary-foreground`), font-weight 600 |
| **Secondary** | Supporting actions ("Save", "Share") | `--secondary` background, `--secondary-foreground` text |
| **Outline** | Tertiary actions ("Cancel", "Back") | Transparent background, `--border` border color |
| **Ghost** | Inline actions (filters, nav) | No background or border, text-only |
| **Destructive** | Dangerous actions ("Delete Guide") | `--destructive` background, `--destructive-foreground` text |

#### Sizes

| Size | Height | Padding | Font | Touch Target |
|------|--------|---------|------|-------------|
| **sm** | 32px | `px-3` | Body sm (14px) | 44px (with margin) |
| **default** | 40px | `px-4` | Body (16px) | 44px (with margin) |
| **lg** | 48px | `px-6` | Body (16px), weight 600 | 48px |

#### Interactive States

All button variants follow this state matrix:

| State | Visual Change |
|-------|--------------|
| **Hover** | Lightness shifts +0.05 (lighter) in light mode, +0.05 (lighter) in dark mode. 200ms ease-out. `cursor-pointer`. |
| **Active/Pressed** | Lightness shifts -0.03 (darker). Instant (no transition). |
| **Focus-visible** | 2px amber ring (`--ring`) with 2px offset. No outline on click (only keyboard). |
| **Disabled** | Opacity 0.5. `cursor-not-allowed`. No hover effect. |
| **Loading** | Button disabled + spinner icon replaces text or appears inline. Text: "Loading..." for screen readers (`aria-busy="true"`). |

### Cards

- **Product cards:** Image top (aspect-ratio 4:3), info bottom. `--border` border (1px). Hover: lift with `shadow-md` + border shifts to `--primary` (200ms ease-out). `cursor-pointer`. Focus-visible: amber ring. **Guide availability status:** Each card shows a small badge indicating guide status — green `Check` icon + "Guide Available" for published guides, amber `Loader2` icon + "Guide In Progress" for queued/generating guides, no badge for products without guides. Badge positioned top-right of the card image area, `rounded-full`, `px-2 py-0.5`, Caption size. Cards for products with published guides take users directly to the guide viewer; all others go to the product detail page.
- **Step cards (mobile guide viewer):** Full-width card per step. Step number badge (amber circle, mono font) top-left. Instruction body below. Illustration above instruction on mobile.
- **Stat cards (Studio):** Large JetBrains Mono number, label below in Body sm. Amber accent on key metrics. `--card` background.

### Badges (Unified System)

All badges share a base style: `inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium`. Badges always include an icon or label (never color-only).

#### User-Facing Badges

| Badge | Icon | Background | Border | Text | Context |
|-------|------|-----------|--------|------|---------|
| **"New"** | `Sparkles` | `--primary` (amber) | none | `--primary-foreground` | Product cards — product detected within last 30 days |
| **"AI-Generated"** | `Bot` | transparent | `blue oklch(0.65 0.15 250)` | blue | Guide viewer — auto-generated guide (70-89% confidence) |
| **"Guide in Progress"** | `Loader2` (animated) | `--muted` | none | `--muted-foreground` | Product detail — guide is being generated |
| **"Community Contributed"** | `Users` | transparent | `purple oklch(0.60 0.18 300)` | purple | Guide viewer — guide from user submission |
| **"Verified"** | `CheckCircle` | `green oklch(0.65 0.18 145)` | none | white | Guide viewer — admin-reviewed and approved |

#### Studio-Specific Indicators

| Indicator | Style | Values |
|-----------|-------|--------|
| **Guide status dot** | 8px circle + tooltip text | Green (published), amber (in review), blue (generating), gray (no source), purple (submission received), red (failed) |
| **Time-to-guide** | JetBrains Mono, color-coded | Green (< 3 days), amber (3-7 days), red (> 7 days) |

### Guide Viewer

The guide viewer is Guid's core UX. It uses a **three-column docs-style layout** on desktop (inspired by documentation sites like Ark UI), giving users a complete overview of all steps while keeping illustrations always visible.

#### Desktop Layout (≥ 1024px): Three-Column Scrollspy

```
┌──────────────┬──────────────────────────────────┬─────────────────────┐
│  TOC Sidebar │     Work Instructions            │  Illustration Panel │
│  (sticky)    │     (scrollable, all steps)       │  (sticky)           │
│              │                                    │                     │
│  ✓ Overview  │  Step 1: Unbox Contents            │  ┌───────────────┐ │
│  ● Step 1 ← │  Lay out all parts on a clean,     │  │               │ │
│  ○ Step 2    │  flat surface. Verify all parts     │  │  [Isometric   │ │
│  ○ Step 3    │  against the parts list below...    │  │  illustration │ │
│  ○ ...       │                                    │  │  for Step 1]  │ │
│  ○ Step 24   │  ─────────────────────────────     │  │               │ │
│              │                                    │  └───────────────┘ │
│  ──────────  │  Step 2: Attach Side Panels        │                     │
│  ████░░ 8%   │  Take the left side panel (A)...   │  Click to zoom      │
└──────────────┴──────────────────────────────────┴─────────────────────┘
```

**Column widths:** TOC ~220px (fixed) | Instructions flex-grow (min 480px) | Illustration ~380px (fixed).

**TOC Sidebar (left, sticky at `top: header-height + 1rem`):**
- Lists all sections: Overview, Step 1, Step 2, ... Step N.
- **Scrollspy:** Uses Intersection Observer to track which step the user is currently viewing. The corresponding TOC item is highlighted.
- **Step states in TOC:**
  - *Completed:* Muted text (`--muted-foreground`), checkmark icon, no font weight.
  - *Current:* Amber left border (3px), `--primary` text color, font-weight 600, background `--accent` at 10% opacity.
  - *Upcoming:* Normal text color (`--foreground`), font-weight 400.
- **Progress bar:** At bottom of TOC sidebar. Thin horizontal bar showing % of steps scrolled past. Amber fill, muted track.
- **Scroll behavior:** If TOC has more items than viewport height, the TOC itself scrolls to keep the active item visible (centered when possible).

**Work Instructions (center, scrollable):**
- All steps rendered on a single long page, one after another.
- Each step begins with a step header: step number in JetBrains Mono (amber circle badge) + step title in H3.
- Instruction text at Body size, 1.7 line-height, max-width 72ch.
- Tip and warning callouts rendered inline (see Callouts section below).
- Part references in JetBrains Mono.
- Steps separated by `gap-12` (3rem) for clear visual breaks.
- `scroll-margin-top` set on each step heading to account for sticky header height, ensuring scrollspy jumps land correctly.
- Smooth scroll (`scroll-behavior: smooth` on the html element) for TOC link clicks.

**Illustration Panel (right, sticky at `top: header-height + 1rem`):**
- Sticks to viewport while user scrolls through instructions.
- Displays the illustration for the step currently in view (determined by scrollspy).
- **Transition:** Crossfade (opacity 0 → 1, 200ms ease-out) when swapping illustrations between steps.
- **No illustration available:** If the current step has no illustration, the previous step's illustration remains visible. No empty state shown.
- **Click to zoom:** Clicking the illustration opens a lightbox overlay (`z-modal`) with the full-resolution image. Pinch-to-zoom on touch devices.
- **Illustration frame:** `rounded-lg` border, `--border` color, `shadow-sm`. White background (for illustration consistency against any theme).
- **Caption below illustration:** Step number in JetBrains Mono, e.g., "Step 14 of 24". Muted foreground.

**Product Info Card (right column, below illustration, within the sticky container):**

A compact card that gives users essential product context without leaving the guide. Sits below the illustration panel inside the same sticky right column.

- **Container:** `--card` background, `rounded-lg`, `--border` border (1px), `p-3`, `shadow-sm`. Max height ~100px.
- **Layout:** Horizontal — product thumbnail (48px, `rounded-md`) on left, text on right.
- **Content:**
  - Product name (Body sm, semibold, truncate to 1 line)
  - Article number (Caption, JetBrains Mono, `--muted-foreground`)
  - Price (Body sm, `--primary`, JetBrains Mono)
  - One key dimension (Caption, `--muted-foreground`, e.g., "77 × 147 cm")
- **Action:** "View details →" link — Caption size, `--primary` text, `ChevronRight` icon (14px), `cursor-pointer`. Links to `/products/[articleNumber]/details`.
- **Interaction:** Entire card is clickable (navigates to details page). Hover: border shifts to `--primary` at 30% opacity, `shadow-md`. Touch target: minimum 44px height.
- **Mobile:** On mobile (< 640px), the Product Info Card is not shown inline. Instead, a small `Info` icon button in the guide header area links to the details page. `aria-label="View product details"`.

#### Tablet Layout (640–1024px): Two-Column

- TOC collapses — accessible via a floating button (bottom-left) that opens a `Sheet` (slide-in from left).
- Instructions take ~60% width, illustration panel takes ~40% width.
- Illustration panel remains sticky.
- Illustration size reduced but still interactive (tap to zoom).

#### Mobile Layout (< 640px): Step-by-Step Cards

On mobile, the guide switches from a single scrollable page to a **card-based step-by-step** experience optimized for hands-busy assembly:

- **One step per screen:** Full-width card showing the current step.
- **Card layout (top to bottom):**
  1. Progress bar — thin amber bar at very top showing % complete.
  2. Illustration — full-width, aspect-ratio 4:3, tap to zoom into lightbox.
  3. Step header — number badge + title.
  4. Instruction text — Body size, 1.7 line-height, generous padding.
  5. Callouts (if any) — tip/warning boxes.
  6. Navigation buttons — "Previous" (left, outline) and "Next Step" (right, primary amber). Both full height (48px), side by side.
- **Swipe navigation:** Swipe left for next step, swipe right for previous. 200ms slide transition with fade. Haptic feedback on step change (if supported via `navigator.vibrate`).
- **TOC access:** Floating button (bottom-right, `z-sticky`) with `List` icon. Tapping it opens a bottom sheet listing all steps with their completion states. Tap any step to jump directly.
- **Keyboard:** Arrow keys still work on mobile keyboards and external keyboards.

#### Callouts (Tips & Warnings)

Inline callout boxes within step instructions:

| Type | Icon | Background | Border | Text |
|------|------|-----------|--------|------|
| **Tip** | `Lightbulb` | `oklch(0.85 0.15 85) / 15%` (light yellow) | Left border 3px yellow | `--foreground` |
| **Warning** | `AlertTriangle` | `oklch(0.58 0.24 27) / 10%` (light red) | Left border 3px red | `--foreground` |
| **Info** | `Info` | `oklch(0.65 0.15 250) / 10%` (light blue) | Left border 3px blue | `--foreground` |

Callouts use `rounded-lg`, `p-4`, and icon is aligned top-left with text flowing beside it.

#### Completion Experience

When the user scrolls past the final step (desktop) or navigates to the completion screen (mobile):

- **Completion card:** Centered, prominent. Amber gradient border.
- **Content:** "Guide Complete" heading (H2). Total steps completed. Estimated time taken (if tracked).
- **Rating prompt:** "Was this guide helpful?" — 5-star rating with large touch targets (48px star icons).
- **Social sharing:** Share buttons (copy link, Twitter/X, Facebook). Ghost button style.
- **Sign-up CTA (anonymous users):** "Create an account to save this guide." Secondary button.
- **No confetti by default.** Optionally: a subtle checkmark animation (300ms). Disabled when `prefers-reduced-motion: reduce`.

#### Progress Saving (Signed-in Users)

- Auto-save current scroll position / step number as the user progresses.
- On return: banner at top — "Welcome back! Continue from Step 14?" with "Resume" (primary) and "Start Over" (ghost) buttons.
- Saved progress appears on the user's profile page under "In Progress Guides."

### Forms

#### All Contexts (Public + Studio)

- **Input fields:** `--input` border, `rounded-md`, padding `px-3 py-2`, min height 40px. `--ring` focus ring (amber).
- **Labels:** Body sm size (14px), font-weight 500, `--foreground` color. Associated via `for` attribute (required for accessibility).
- **Placeholder text:** `--muted-foreground` color. Never use placeholder as the only label.
- **Validation:** Inline error message in `--destructive` color below the field, with `AlertCircle` icon and `role="alert"`.
- **Required indicator:** Amber asterisk after label text.
- **Help text:** Below input, Caption size, `--muted-foreground`.
- **Disabled state:** Opacity 0.5, `cursor-not-allowed`, no focus ring.

#### Studio-Specific

- **Labels:** Caption size, semibold, uppercase tracking-wide.
- **Complex fields (JSON editors, template editors):** JetBrains Mono, `--muted` background.

### Navigation

- **Header:** Clean top bar with logo (left), main nav (center), auth actions (right). `z-header`. Background `--background` with subtle bottom border. Sticky at top.
- **Breadcrumbs:** On product detail and guide pages. `ChevronRight` separator (Lucide, 12px). Current page in font-weight 600. Previous pages as links.
- **Sidebar (Studio):** Fixed left sidebar (`z-sticky`) with icon + label nav items. Active item: `--accent` background, `--primary` text, left border 3px amber.
- **Mobile bottom navigation:** Icon + label, 5 items max. Active item: amber icon color. `z-header`.

### Toasts & Notifications

- **Position:** Bottom-right (desktop), bottom-center (mobile). `z-toast`.
- **Structure:** Icon (left) + message text + optional action button (right) + dismiss X.
- **Variants:** Success (green + `CheckCircle`), error (red + `XCircle`), info (blue + `Info`), warning (yellow + `AlertTriangle`).
- **Duration:** Auto-dismiss after 5 seconds. Errors persist until dismissed.
- **Accessibility:** `role="status"` for info/success, `role="alert"` for errors.
- **Animation:** Slide up + fade in (200ms ease-out). Respects `prefers-reduced-motion`.

### Modals & Dialogs

- **Overlay:** `oklch(0 0 0 / 0.5)` backdrop. `z-modal`. Click outside to dismiss.
- **Container:** `--card` background, `rounded-xl`, `shadow-xl`, max-width 500px. Centered vertically and horizontally.
- **Header:** H3 title + optional description text. Close button (top-right, `X` icon, ghost style).
- **Footer:** Action buttons right-aligned. Primary action right, cancel/secondary left.
- **Focus trap:** Focus stays within modal while open. First focusable element auto-focused on open. Focus returns to trigger on close.
- **Keyboard:** Escape to close.

### Empty States

For pages/sections with no content:

- **Centered layout:** Icon (48px, `--muted-foreground`) + heading (H4) + description (Body sm, `--muted-foreground`) + optional CTA button.
- **Examples:**
  - No saved products: `Bookmark` icon, "No saved products yet", "Browse products to save your favorites."
  - No search results: `Search` icon, "No results for '[query]'", suggestions list.
  - No guide: See "Submit a New Guide CTA" below.

### Submit a New Guide CTA

For products without an assembly guide (`guideStatus: no_source_material`), the product detail page shows a prominent call-to-action instead of a guide viewer:

- **Container:** Centered card within the "Assembly Guide" tab area. `--secondary` background, dashed `--primary` border (2px), `rounded-xl`.
- **Icon:** Lucide `PenLine` (32px, `--primary` color) centered above text.
- **Heading:** "No guide yet for this product" — H4, `--foreground`.
- **Body text:** "Know how to assemble this? Share your knowledge and help others!" — Body, `--muted-foreground`.
- **CTA button:** "Submit a New Guide" — Primary amber button, full width on mobile, auto width on desktop.
- **Subtext:** "You can submit text instructions, photos, video links, or any helpful resources." — Caption, `--muted-foreground`.

### Video Guide Cards

For products with YouTube creator videos:

- **Video card:** Thumbnail (YouTube video thumbnail, aspect-ratio 16:9, `rounded-lg`), creator avatar (24px circle, left), creator name (Body sm, semibold), video title (Body, font-weight 500), view count (Caption, mono), helpfulness score.
- **Video player:** Embedded YouTube iframe, responsive 16:9 aspect ratio, `rounded-lg`.
- **Creator attribution strip:** Below the player — channel name (linked), subscriber count (JetBrains Mono), "Was this helpful?" thumbs up/down buttons with count.
- **Multiple videos layout:** Vertical stack on mobile, 2-column grid on desktop. Sorted by helpfulness rating.

### AI Troubleshooting Chat

The chat assistant has its own set of UI components:

- **Proactive bubble:** Floating chat bubble (bottom-right, `z-chat`) with amber accent. Pulsing dot to draw attention. Text: "Need help? Ask the assistant." Appears after 3 seconds on product pages, dismissible. Respects `prefers-reduced-motion` (no pulse when reduced).
- **Guided intake chips:** On chat open, structured starter questions appear as tappable chips (not free text). Styled as `rounded-full` pill buttons with `--secondary` background, `--border` border, `--primary` border on hover. Categories: "Wobbling/unstable", "Missing part", "Something broke", "Won't close/open", "Other". Min touch target 44px.
- **Message bubbles:**
  - *User messages:* Right-aligned, `--primary` background, `--primary-foreground` text. All corners rounded (`rounded-xl`).
  - *Assistant messages:* Left-aligned, `--secondary` background, `--secondary-foreground` text. Guid logo avatar (24px) left of first message.
- **Image attachments:** Inline thumbnail in message bubble, `rounded-lg`, tap to expand into lightbox. Camera icon button next to text input.
- **Typing indicator:** Three pulsing dots in assistant bubble style. `aria-label="Assistant is typing"`.
- **Step-by-step repair cards:** Fix instructions render as compact cards within the chat: numbered, with optional inline illustration thumbnail. `--card` background, `rounded-lg`.
- **Part identification card:** Part name (H4), part number (JetBrains Mono, `--primary`), product image (small), "Where to buy" link (primary button style).
- **Escalation card:** `--muted` background, pre-filled issue summary text, "Contact manufacturer" button (secondary style).

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
- **Background:** Clean white — no distracting patterns. In dark mode, the illustration panel uses a white background with a subtle border.
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
| **Screw rotation** | Circular arrow (CW/CCW) with label in JetBrains Mono |
| **Part numbers** | Rounded badge with JetBrains Mono font |
| **Tools needed** | Small tool icon in corner |
| **Warning areas** | Red dashed outline |
| **Step complexity indicator** | (Internal) Simple steps → Nano Banana, Complex steps → Nano Banana Pro |

---

## Responsive Breakpoints

| Breakpoint | Width | Key Layout Changes |
|------------|-------|--------------------|
| **Mobile** | < 640px | Single column. Stacked cards. Bottom nav. Full-width images. Guide viewer: step-by-step cards with swipe. TOC via bottom sheet. |
| **Tablet** | 640–1024px | Two-column product grid. Guide viewer: two-column (instructions + sticky illustration), TOC via sheet. Side-by-side layout where appropriate. |
| **Desktop** | 1024–1280px | Three-column product grid. Sidebar filters visible. Guide viewer: full three-column layout (TOC + instructions + illustration). |
| **Wide** | > 1280px | Max-width container (1440px for guide viewer, 1280px for other pages), centered content. Generous side padding. |

### Responsive Principles

- **Mobile-first CSS:** Write styles for mobile, add complexity at larger breakpoints.
- **Touch targets:** All interactive elements meet 44px minimum at all breakpoints.
- **No horizontal scroll:** Test at every breakpoint to ensure content fits viewport. Use `overflow-x-hidden` on `body` as a safety net.
- **Images:** Use `next/image` with responsive `sizes` prop. Serve appropriate sizes per viewport (320w, 640w, 960w, 1280w).
- **Typography:** Fluid type scale using `clamp()` prevents text from being too large on mobile or too small on desktop.

---

## Animation & Motion

### Timing & Easing

| Context | Duration | Easing | Notes |
|---------|----------|--------|-------|
| **Hover states** | 200ms | `ease-out` | Color, shadow, border changes |
| **Focus ring** | 150ms | `ease-out` | Ring appearance |
| **Layout shifts** | 200ms | `ease-in-out` | Panel open/close, accordion expand |
| **Page transitions** | 200ms | `ease-out` | Opacity 0 → 1 fade |
| **Mobile step transitions** | 200ms | `ease-in-out` | Slide left/right with fade |
| **Illustration crossfade** | 200ms | `ease-out` | Opacity swap in sticky panel |
| **Toast enter/exit** | 200ms / 150ms | `ease-out` / `ease-in` | Slide up + fade in, slide down + fade out |
| **Skeleton shimmer** | 1.5s | `linear` | Continuous `animate-pulse` |
| **Progress bar fill** | 300ms | `ease-out` | Smooth width increase |

### Rules

- **No bouncy or playful animations.** Motion should feel precise and intentional.
- **Use `transform` and `opacity` only** for animations. Never animate `width`, `height`, `top`, or `left` (causes expensive repaints).
- **Skeleton screens over spinners.** Skeleton placeholders matching the final layout shape are preferred for content loading. Spinners only for discrete actions (form submit, button loading).
- **No continuous decorative animations.** `animate-spin` is allowed only on loading indicators. No `animate-bounce` on icons or decorative elements.
- **Easing direction:** `ease-out` for elements entering the viewport. `ease-in` for elements exiting. `ease-in-out` for elements transitioning in place.
- **Smooth scroll:** `scroll-behavior: smooth` on `<html>` for TOC anchor clicks and guide navigation. Disable when `prefers-reduced-motion: reduce`.

### Reduced Motion Override

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## Iconography

- **Library:** Lucide React
- **Sizes:** 16px inline (`w-4 h-4`), 20px default (`w-5 h-5`), 24px hero (`w-6 h-6`), 32px feature icons, 48px empty states
- **Style:** Stroke-based, 1.5px stroke weight. Never use filled variants for UI icons.
- **Color:** Inherits text color by default (`currentColor`). Amber (`--primary`) for interactive/active states.
- **Accessibility:** All icon-only buttons must have `aria-label`. Decorative icons use `aria-hidden="true"`.
- **No emojis as icons.** Always use Lucide SVG icons. Emojis are for user-generated content only.

---

## Interactive State Patterns

Summary of interactive states across all components:

| State | Visual Treatment | Applies To |
|-------|-----------------|------------|
| **Default** | Base styles as defined | All interactive elements |
| **Hover** | Lightness shift +0.05, `shadow-md` for cards, `cursor-pointer` | Buttons, cards, links, badges |
| **Active/Pressed** | Lightness shift -0.03 | Buttons, links |
| **Focus-visible** | 2px `--ring` outline, 2px offset | All focusable elements |
| **Disabled** | Opacity 0.5, `cursor-not-allowed`, no hover | Buttons, inputs, links |
| **Loading** | Spinner icon + `aria-busy="true"`, element disabled | Buttons, forms |
| **Error** | `--destructive` border + error icon + `role="alert"` message | Inputs, forms |
| **Empty** | Centered icon + heading + description + optional CTA | Lists, grids, search results |
| **Skeleton** | `animate-pulse` placeholder matching layout shape | Cards, text blocks, images |
