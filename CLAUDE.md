# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # Vite dev server with HMR
npm run build            # Production build
npm run build:typecheck  # TypeScript check + production build
npm run lint             # ESLint (flat config, TS + React Hooks)
npm run preview          # Preview production build locally
```

No test runner is configured (no Jest/Vitest).

## Environment Setup

Copy `.env.example` to `.env` and fill in Supabase credentials:
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

Database schema lives in `supabase/migration.sql` — run it in Supabase SQL Editor to bootstrap.

## Architecture

**Stack:** React 19 + TypeScript + Vite + Supabase (PostgreSQL, Auth, Realtime) + Tailwind CSS

### Data flow

```
User action → Component → Custom Hook → Supabase Client → PostgreSQL
                                 ↑ Realtime subscription (WebSocket) ↑
```

### State management

- **AuthContext** (`src/contexts/AuthContext.tsx`): Supabase session, user profile, global role
- **ProjectContext** (`src/contexts/ProjectContext.tsx`): Active project, all entity CRUD (experiments, objectives, strategies, north star metrics, team members). This is the largest file (~950 lines) and the central state hub. Key functions: `createProject` (uses RPC `create_project_with_membership`), `deleteProject`, `addExperiment`, `updateExperiment`, etc.
- **Custom hooks** (`src/hooks/`): `useExperiments`, `useNorthStar`, `useProjects` — each wraps Supabase queries + realtime subscriptions
- No Redux/Zustand — state is React Context + hooks only

### Core domain model

The app tracks growth experiments through an 8-stage pipeline:
`Idea → Prioritized → Building → Live Testing → Analysis → Finished (Winner | Loser | Inconclusive)`

Each experiment has ICE scoring (Impact × Confidence × Ease) and maps to a funnel stage (Acquisition, Activation, Retention, Referral, Revenue).

Key entities: `projects` → `objectives` → `strategies` → `experiments`, plus `north_star_metrics` and `team_members`. Types defined in `src/types.ts`, DB types auto-generated in `src/lib/database.types.ts`.

### Views (4-stage methodology)

| View | File | Purpose |
|------|------|---------|
| Portfolio | `src/PortfolioView.tsx` | Multi-project dashboard |
| 01. Design | `src/RoadmapView.tsx` | Objectives & strategies |
| 02. Explore | `src/App.tsx` (table mode) | Experiment table with ICE scoring |
| 03. Be Agile | `src/App.tsx` (board mode) | Kanban with drag-and-drop (dnd-kit) |
| 04. Learning | `src/App.tsx` (library mode) | Finished experiments & key learnings |

`App.tsx` (~1300 lines) hosts the Explore/BeAgile/Learning views via internal mode switching. It also wires `handleDeleteProject` (calls `deleteProject` from context, then navigates to portfolio) and passes it to both `SettingsView` and `PortfolioView`.

### Key patterns

- **Auth gate**: `AuthGate.tsx` wraps protected content; Supabase Auth with email/password
- **Token caching + custom lock**: `src/lib/supabase.ts` has a custom fetch override to cache access tokens AND a custom `auth.lock` implementation (`simpleLock`) that replaces `navigator.locks`. This prevents deadlocks where `getSession()` acquires the exclusive lock but hangs internally (token refresh/storage), blocking all subsequent Supabase calls forever. **Do not remove the custom lock — it fixes a critical production hang.**
- **Modals/Drawers**: `ExperimentModal.tsx` (create), `ExperimentDrawer.tsx` (detail), `KeyLearningModal.tsx` (triggered on move to Finished)
- **Drag-and-drop**: dnd-kit (`@dnd-kit/core` + `@dnd-kit/sortable`) for Kanban columns
- **Styling**: Mix of CSS variables (`src/index.css`), utility classes, inline styles, and Tailwind via `clsx`/`tailwind-merge`
- **Role mapping**: Frontend roles (Admin/Lead/Viewer) map to DB roles (admin/editor/viewer)

### Database

Schema in `supabase/migration.sql` (686 lines) with:
- Custom enums: `experiment_status`, `funnel_stage`, `metric_type`, `global_role_enum`, `project_role_enum`
- Row Level Security policies for all tables
- RPC functions and triggers (critical: `create_project_with_membership` — creates project + admin membership atomically to avoid RLS chicken-and-egg)
- Hotfixes in `supabase/hotfix_v2.sql` and `supabase/fix_duplicate_rpc.sql`

## Test Credentials

```
Email:    test-security@test.com
Password: TestSecurity123!
Name:     Test Security
```

This user has a project "Test Post-Security Hotfix" with Reforge template data (3 objectives, 6 strategies, experiments).

## Deployment

Hosted on Vercel. `vercel` CLI is in devDependencies. Auto-deploys on push to `main`.
Production: https://growth-experiment-manager.vercel.app

## Supabase URL

```
https://oumhhngnwjijtmgpnhba.supabase.co
```

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **growth-experiment-manager** (427 symbols, 693 relationships, 24 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## When Debugging

1. `gitnexus_query({query: "<error or symptom>"})` — find execution flows related to the issue
2. `gitnexus_context({name: "<suspect function>"})` — see all callers, callees, and process participation
3. `READ gitnexus://repo/growth-experiment-manager/process/{processName}` — trace the full execution flow step by step
4. For regressions: `gitnexus_detect_changes({scope: "compare", base_ref: "main"})` — see what your branch changed

## When Refactoring

- **Renaming**: MUST use `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` first. Review the preview — graph edits are safe, text_search edits need manual review. Then run with `dry_run: false`.
- **Extracting/Splitting**: MUST run `gitnexus_context({name: "target"})` to see all incoming/outgoing refs, then `gitnexus_impact({target: "target", direction: "upstream"})` to find all external callers before moving code.
- After any refactor: run `gitnexus_detect_changes({scope: "all"})` to verify only expected files changed.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Tools Quick Reference

| Tool | When to use | Command |
|------|-------------|---------|
| `query` | Find code by concept | `gitnexus_query({query: "auth validation"})` |
| `context` | 360-degree view of one symbol | `gitnexus_context({name: "validateUser"})` |
| `impact` | Blast radius before editing | `gitnexus_impact({target: "X", direction: "upstream"})` |
| `detect_changes` | Pre-commit scope check | `gitnexus_detect_changes({scope: "staged"})` |
| `rename` | Safe multi-file rename | `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` |
| `cypher` | Custom graph queries | `gitnexus_cypher({query: "MATCH ..."})` |

## Impact Risk Levels

| Depth | Meaning | Action |
|-------|---------|--------|
| d=1 | WILL BREAK — direct callers/importers | MUST update these |
| d=2 | LIKELY AFFECTED — indirect deps | Should test |
| d=3 | MAY NEED TESTING — transitive | Test if critical path |

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/growth-experiment-manager/context` | Codebase overview, check index freshness |
| `gitnexus://repo/growth-experiment-manager/clusters` | All functional areas |
| `gitnexus://repo/growth-experiment-manager/processes` | All execution flows |
| `gitnexus://repo/growth-experiment-manager/process/{name}` | Step-by-step execution trace |

## Self-Check Before Finishing

Before completing any code modification task, verify:
1. `gitnexus_impact` was run for all modified symbols
2. No HIGH/CRITICAL risk warnings were ignored
3. `gitnexus_detect_changes()` confirms changes match expected scope
4. All d=1 (WILL BREAK) dependents were updated

## Keeping the Index Fresh

After committing code changes, the GitNexus index becomes stale. Re-run analyze to update it:

```bash
npx gitnexus analyze
```

If the index previously included embeddings, preserve them by adding `--embeddings`:

```bash
npx gitnexus analyze --embeddings
```

To check whether embeddings exist, inspect `.gitnexus/meta.json` — the `stats.embeddings` field shows the count (0 means no embeddings). **Running analyze without `--embeddings` will delete any previously generated embeddings.**

> Claude Code users: A PostToolUse hook handles this automatically after `git commit` and `git merge`.

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
