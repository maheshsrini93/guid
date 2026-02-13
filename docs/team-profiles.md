# Team Profiles — Guid Development Team

## Quick Reference

| Agent | Role | First Task | Blocked By |
|-------|------|-----------|------------|
| **You (Lead)** | AI Pipeline (P1.2.5 - P1.3.9) | P1.2.6 (illustration gen) | None — sequential |
| **Viewer** | Frontend/UI & Guide Viewer | P2.1.1 (font migration) | Wave 2 waits for Backend P2.0.1 |
| **Backend** | Full-Stack Backend | P2.0.1 (guide-first routing) | Wave 2 waits for Pipeline P1.3.2, Wave 3 for P1.3.9 |
| **Polish** | Search, SEO, Perf, Infra | P0.1.1 (Vercel deploy) | None — fully independent |
| **Critic** | Architecture Reviewer | Reviews all changes | None — reviews on demand |

## Agent Definitions

Agent definition files in `.claude/agents/`:

- `.claude/agents/viewer.md` — Design system + guide viewer
- `.claude/agents/backend.md` — Routing + Studio + batch processing
- `.claude/agents/polish.md` — Infrastructure + SEO + search + performance
- `.claude/agents/critic.md` — Read-only architecture reviewer

## Critical Handoff Sequence

```
Backend finishes P2.0.1 (routing)     → Unblocks Viewer Wave 2 (guide viewer)
Pipeline finishes P1.3.2 (pilot)      → Unblocks Backend Wave 2 (review UI)
Pipeline finishes P1.3.9 (quality)    → Unblocks Backend Wave 3 (batch processing)
```

## Shared File Ownership

| File | Primary Owner | Others May Read | Conflict Risk |
|------|--------------|----------------|---------------|
| `src/app/globals.css` | Viewer | All | HIGH — tokens used everywhere |
| `src/app/layout.tsx` | Viewer (fonts) + Polish (Sentry) | All | MEDIUM — coordinate |
| `src/app/products/[articleNumber]/page.tsx` | Backend | Viewer | LOW — Backend first |
| `prisma/schema.prisma` | Backend | Polish (indexes) | LOW — coordinate |
| `docs/tasks.md` | All agents | All | HIGH — sequential commits |
| `docs/changelog.md` | All agents | All | HIGH — sequential commits |

## Task Count by Agent

| Agent | Total Tasks | Wave 1 | Wave 2 | Wave 3+ |
|-------|------------|--------|--------|---------|
| Viewer | 21 | 8 (design system) | 13 (guide viewer) | — |
| Backend | 17 | 5 (routing) | 3 (review UI) | 9 (batch + sync) |
| Polish | 31 | 8 (infra + security) | 7 (SEO) | 16 (search + perf + analytics) |
| Critic | On-demand | Reviews all | Reviews all | Reviews all |
| Lead (you) | 9 | Pipeline P1.2.6-P1.3.9 | — | — |
