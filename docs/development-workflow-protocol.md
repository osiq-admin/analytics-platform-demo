# Development Workflow Protocol

**Purpose**: Single authoritative protocol covering the full lifecycle of every feature — Pre-Work → Planning → Execution → Completion. Follow this protocol for every feature, every session, no exceptions.

**Last Updated**: 2026-02-27

---

## Phase A: Pre-Work Verification

Run these checks at the start of every session before doing any new work.

### A1. Clean Git State

```bash
git status                        # Nothing uncommitted
git log origin/main..HEAD         # Nothing unpushed
```

- If uncommitted changes exist → commit or stash
- If unpushed commits exist → push and merge
- If stale branches exist → clean up (`git branch -d <branch>`)

### A2. Read Current State

- Read `docs/progress.md` header → know current milestone range and test counts
- Read `CLAUDE.md` → know current architecture, views, entities
- Read context-level `MEMORY.md` → know key decisions and workflow preferences

### A3. Verify Test Suite

```bash
uv run pytest tests/ --ignore=tests/e2e -v    # Backend tests — ALL PASS
cd frontend && npm run build                   # Frontend — 0 errors
```

If tests fail before you start, fix them first. Never start new work on a broken baseline.

---

## Phase B: Strategic Planning

### B1. Invoke Planning Skill

**Always** invoke `/writing-plans` skill before any implementation plan.

### B2. Research

- Use explore agents to understand affected code
- Read existing plans in `docs/plans/` and build on them
- Check `docs/plans/2026-02-24-comprehensive-roadmap.md` for phase context
- Reference `docs/feature-development-checklist.md` for which systems need updating

### B3. Create Plan Document

- File: `docs/plans/YYYY-MM-DD-<feature-name>.md`
- Include: milestones, tasks, files to modify, verification steps
- **The plan's final task must always be**: "Run Phase D of the Development Workflow Protocol"

### B4. Update Roadmap & Progress

- Update `docs/plans/2026-02-24-comprehensive-roadmap.md` with planned phase
- Add "IN PROGRESS" row to `docs/progress.md` Overall Status table

### B5. Commit the Plan

```bash
git add docs/plans/<plan-file>.md docs/progress.md docs/plans/2026-02-24-comprehensive-roadmap.md
git commit -m "docs: add <feature> implementation plan"
```

---

## Phase C: Execution

### C1. Follow the Plan

Execute tasks in order (subagent-driven or manual).

### C2. Per-Milestone Checks

After each milestone (M_n_), run **Tier 1** completion checks (see Phase D).

### C3. Per-Stage Checks

At each logical stage checkpoint, run **Tier 2** completion checks (see Phase D).

### C4. Commit at Checkpoints

```bash
git add <changed-files>
git commit -m "<type>(<scope>): <description> (M_n_)"
git push origin <branch>
```

---

## Phase D: Milestone Completion Protocol

Three tiers of checks, applied at different granularities.

### Tier 1 — Per-Task (after each M_n_)

| Check | File(s) | Action |
|-------|---------|--------|
| Progress entry | `docs/progress.md` | Add milestone row to the milestone table |
| Tours/scenarios/operations | `frontend/src/data/tourDefinitions.ts`, `scenarioDefinitions.ts`, `operationScripts.ts` | Update if UI changed |
| Architecture registry | `frontend/src/data/architectureRegistry.ts` | Update if sections changed |
| Commit | — | `git commit` with conventional message |

### Tier 2 — Per-Stage (after each stage checkpoint)

All of Tier 1, plus:

| Check | File(s) | Action |
|-------|---------|--------|
| Test Count Sync | See [Test Count Sync Registry](#test-count-sync-registry) | Update ALL locations with actual counts |
| Progress header | `docs/progress.md` line 5 | Update milestone range and test counts |
| CLAUDE.md counts | `CLAUDE.md` lines 4, 22 | Update test counts, metadata types, milestone range |
| Feature checklist counts | `docs/feature-development-checklist.md` lines 5, 28, 61, 74 | Update test counts |
| Architecture traceability | `docs/architecture-traceability.md` | Update if maturity % changed |
| Exploratory testing | `docs/exploratory-testing-notes.md` | Add findings if any |
| BDD scenarios | `docs/requirements/bdd-scenarios.md` | Add scenarios if applicable |
| Commit + push | — | `git commit && git push` |

### Tier 3 — Per-Phase/Branch (before merging to main)

All of Tier 1 + Tier 2, plus:

| Check | File(s) | Action |
|-------|---------|--------|
| Full test suite | — | Backend + E2E + frontend build all pass |
| Context MEMORY.md | `~/.claude/projects/.../memory/MEMORY.md` | Update current state, key files, design decisions |
| In-repo MEMORY.md | `.claude/memory/MEMORY.md` | Rewrite to match current state |
| README.md | `README.md` | Update test counts, module count, architecture diagram |
| Demo guide | `docs/demo-guide.md` | Add/update feature sections |
| Roadmap | `docs/plans/2026-02-24-comprehensive-roadmap.md` | Mark phase complete |
| Feature checklist | `docs/feature-development-checklist.md` | Add version history row, any new triggers |
| Playwright verification | — | Visual verification of changed views |
| Merge workflow | — | Commit, push, create PR, squash merge, push main |

---

## Test Count Sync Registry

Every file and line containing hardcoded test counts. When test counts change, update **ALL** of these.

### Backend Test Count (currently 506)

| File | Location | Format |
|------|----------|--------|
| `CLAUDE.md` | Line 4 (Project Overview) | `716 tests (506 backend + 210 E2E)` |
| `CLAUDE.md` | Line 9 (Quick Start comment) | `# Run backend tests (506)` |
| `CLAUDE.md` | Line 22 (Architecture) | `506 backend tests + 210 E2E` |
| `README.md` | Line 190 (Project Structure) | `# 572 tests (390 backend + 182 E2E Playwright)` ← **STALE** |
| `README.md` | Line 197 (Testing section comment) | `# Backend tests (390)` ← **STALE** |
| `README.md` | Line 207 (Testing section text) | `572 tests total: 390 backend...` ← **STALE** |
| `docs/progress.md` | Line 5 (header) | `709 total tests: 506 backend + 203 E2E` ← **STALE** |
| `docs/feature-development-checklist.md` | Line 5 (header) | `716 total tests: 506 backend + 210 E2E` |
| `docs/feature-development-checklist.md` | Line 28 (Section 1) | `currently 506` |
| `docs/feature-development-checklist.md` | Line 61 (Section 4) | `currently 506` |
| `docs/feature-development-checklist.md` | Line 74 (Section 5) | `currently 210` |
| `docs/feature-development-checklist.md` | Line 295 (Quick Reference) | `# Backend tests (506+)` |
| `docs/feature-development-checklist.md` | Line 298 (Quick Reference) | `# E2E Playwright tests (210+)` |
| `docs/plans/2026-02-24-comprehensive-roadmap.md` | Line 19 | `572 tests (390 backend + 182 E2E)` ← **STALE** |
| `docs/plans/2026-02-24-comprehensive-roadmap.md` | Line 802-804 (Verification Plan) | `(390)`, `(182)`, `(964 modules)` ← **STALE** |

### E2E Test Count (currently 210)

Same files as above — search for the E2E count alongside backend count.

### Total Test Count (currently 716)

Sum of backend + E2E. Same files as above.

### Frontend Module Count (currently 969)

| File | Location | Format |
|------|----------|--------|
| `CLAUDE.md` | Line 11 | `# Build frontend (969 modules)` |
| `README.md` | Line 31 (Architecture diagram) | `React 19 SPA (964 Vite modules)` ← **STALE** |
| `docs/plans/2026-02-24-comprehensive-roadmap.md` | Line 802 | `(964 modules)` ← **STALE** |

---

## Other Count Registries

### View Count (currently 16)

| File | Location |
|------|----------|
| `CLAUDE.md` | Line 4 (Project Overview) |
| `CLAUDE.md` | Line 18 (Architecture) |
| `docs/progress.md` | Line 5 (header) |
| `docs/feature-development-checklist.md` | Line 5 (header) |

### Scenario Count (currently 26)

| File | Location |
|------|----------|
| `CLAUDE.md` | Line 4 (Project Overview) |
| `docs/progress.md` | Line 5 (header) |
| `docs/feature-development-checklist.md` | Line 5 (header) |

### Architecture Section Count (currently 77, 83.1% metadata-driven)

| File | Location |
|------|----------|
| `docs/progress.md` | Line 5 (header) |
| `docs/feature-development-checklist.md` | Line 5 (header) |
| `docs/architecture-traceability.md` | Header |
| Context-level `MEMORY.md` | Current State section |

### Milestone Range (currently M0-M173)

| File | Location |
|------|----------|
| `CLAUDE.md` | Line 63 (Plans & Progress) |
| Context-level `MEMORY.md` | Current State section |
| In-repo `.claude/memory/MEMORY.md` | Current State section |

---

## Verification Commands

Run these and confirm pass/fail before merging.

```bash
# Backend tests — expect ALL PASS, count matches registry
uv run pytest tests/ --ignore=tests/e2e -v 2>&1 | tail -1
# Expected: "506 passed" (or current count)

# E2E tests — run in batches if >100 tests cause browser crashes
uv run pytest tests/e2e/ -v 2>&1 | tail -1
# Expected: "210 passed" (or current count; run in batches if needed)

# Frontend build — expect 0 errors, module count matches registry
cd frontend && npm run build 2>&1 | grep "modules transformed"
# Expected: "969 modules transformed" (or current count)

# Test count sync — verify all files agree
grep -rn "506\|210\|716" CLAUDE.md README.md docs/progress.md docs/feature-development-checklist.md | grep -i "test\|backend\|e2e"
# Expected: all show same counts

# Module count sync
grep -rn "969\|96[0-9]" CLAUDE.md README.md | grep -i "module"
# Expected: all show 969
```

---

## Quick Reference

```
Session Start → Phase A (verify clean state, read docs, run tests)
New Feature   → Phase B (plan, roadmap, commit plan)
Each Task     → Phase C + Tier 1 (execute, update progress, commit)
Stage Done    → Tier 2 (sync counts, update docs, push)
Branch Done   → Tier 3 (full test suite, all docs, README, MEMORY, merge)
```
