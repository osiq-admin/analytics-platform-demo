# Development Workflow Protocol

**Purpose**: Single authoritative protocol covering the full lifecycle of every feature — Pre-Work → Planning → Execution → Completion. Follow this protocol for every feature, every session, no exceptions.

**Last Updated**: 2026-02-28

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
uv run python -m qa test backend          # Backend tests — ALL PASS
uv run python -m qa quality --python       # Quality scan — ALL PASS
uv run python -m qa gate                   # Quality gate — PASS
cd frontend && npm run build               # Frontend — 0 errors (QA doesn't cover frontend build)
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

After each milestone (M_n_), run **Tier 1** completion checks (see Phase D), plus regression checks:

```bash
uv run python -m qa test backend           # All tests pass
uv run python -m qa report --regression     # No regressions
```

### C3. Per-Stage Checks

At each logical stage checkpoint, run **Tier 2** completion checks (see Phase D), plus regression checks:

```bash
uv run python -m qa test backend           # All tests pass
uv run python -m qa report --regression     # No regressions
```

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
| Tours/scenarios/operations | `frontend/src/data/tourDefinitions.ts`, `scenarioDefinitions.ts`, `operationScripts.ts`, `AppLayout.tsx:getTourIdForPath` | Update if UI changed — add tour, scenario, operations for new views |
| Architecture registry | `frontend/src/data/architectureRegistry.ts` | Update if sections changed — add `data-trace` entries for new panels, **recalculate maturity %** |
| Architecture audit | `docs/architecture-traceability.md` | Update maturity distribution + % if sections added/removed |
| Demo guide | `docs/demo-guide.md` | Update scenario/tour/operation counts if changed |
| Tour registry | `workspace/metadata/tours/registry.json` | Add tour entry, update scenario count + categories if changed |
| QA report | — | Run `uv run python -m qa report` and verify no failures |
| Commit | — | `git commit` with conventional message |

### Tier 2 — Per-Stage (after each stage checkpoint)

All of Tier 1, plus:

| Check | File(s) | Action |
|-------|---------|--------|
| Test Count Sync | See [Test Count Sync Registry](#test-count-sync-registry) | Update ALL locations with actual counts |
| Quality gate | — | Run `uv run python -m qa gate` — must PASS |
| Progress header | `docs/progress.md` line 5 | Update milestone range and test counts |
| CLAUDE.md counts | `CLAUDE.md` lines 4, 22 | Update test counts, metadata types, milestone range |
| Feature checklist counts | `docs/feature-development-checklist.md` lines 5, 28, 61, 74 | Update test counts |
| Content Accuracy Audit | See [feature-development-checklist.md Section 11](feature-development-checklist.md#11-content-accuracy-verification) | For each file in the staleness table, verify descriptions, labels, counts, and selectors match current codebase. Cross-reference: (1) tour step descriptions against actual view component source, (2) scenario sidebar labels against navigation metadata, (3) scenario data counts/values against actual data files, (4) architecture registry descriptions against actual component behavior, (5) scenario/operation counts in registry files against actual definitions, (6) README/CLAUDE.md counts against test/build output |
| Architecture traceability | `docs/architecture-traceability.md` | Update if maturity % changed |
| Exploratory testing | `docs/exploratory-testing-notes.md` | Add findings if any |
| BDD scenarios | `docs/requirements/bdd-scenarios.md` | Add scenarios if applicable |
| Commit + push | — | `git commit && git push` |

### Tier 3 — Per-Phase/Branch (before merging to main)

All of Tier 1 + Tier 2, plus:

| Check | File(s) | Action |
|-------|---------|--------|
| Full QA verification | — | See [Full QA Verification Suite](#full-qa-verification-suite) below |
| Context MEMORY.md | `~/.claude/projects/.../memory/MEMORY.md` | Update current state, key files, design decisions |
| In-repo MEMORY.md | `.claude/memory/MEMORY.md` | Rewrite to match current state |
| README.md | `README.md` | Update test counts, module count, architecture diagram |
| Demo guide | `docs/demo-guide.md` | Add/update feature sections |
| Roadmap | `docs/plans/2026-02-24-comprehensive-roadmap.md` | Mark phase complete |
| Feature checklist | `docs/feature-development-checklist.md` | Add version history row, any new triggers |
| Playwright verification | — | Visual verification of changed views |
| Merge workflow | — | Commit, push, create PR, squash merge, push main |

#### Full QA Verification Suite

Run these as part of Tier 3 before merging:

```bash
# Full QA verification suite
uv run python -m qa test backend           # Backend tests — ALL PASS
uv run python -m qa quality --python       # Quality scan — ALL PASS
uv run python -m qa gate                   # Quality gate — PASS
uv run python -m qa baseline update        # Save new regression baseline
cd frontend && npm run build               # Frontend — 0 errors
uv run python -m qa test e2e              # E2E tests — ALL PASS
```

---

## Test Count Sync Registry

Every file and line containing hardcoded test counts. When test counts change, update **ALL** of these. Current test counts are also available via `uv run python -m qa report`.

### Backend Test Count (currently 794)

| File | Location | Format |
|------|----------|--------|
| `CLAUDE.md` | Line 4 (Project Overview) | `1018 tests (794 backend + 224 E2E)` |
| `CLAUDE.md` | Quick Start comment | `# Run backend tests (794)` |
| `CLAUDE.md` | Architecture section | `794 backend tests + 224 E2E` |
| `README.md` | Project Structure | `# 1018 tests (794 backend + 224 E2E Playwright)` |
| `README.md` | Testing section comment | `# Backend tests (794)` |
| `README.md` | Testing section text | `1018 tests total: 794 backend...` |
| `docs/progress.md` | Line 5 (header) | `1018 total tests: 794 backend + 224 E2E` |
| `docs/feature-development-checklist.md` | Line 5 (header) | `1018 total tests: 794 backend + 224 E2E` |
| `docs/feature-development-checklist.md` | Section 1 | `currently 794` |
| `docs/feature-development-checklist.md` | Section 4 | `currently 794` |
| `docs/feature-development-checklist.md` | Section 5 | `currently 224` |
| `docs/feature-development-checklist.md` | Quick Reference | `# Backend tests (794+)` |
| `docs/feature-development-checklist.md` | Quick Reference | `# E2E Playwright tests (224+)` |
| `docs/plans/2026-02-24-comprehensive-roadmap.md` | Current State | `1018 tests (794 backend + 224 E2E)` |

### E2E Test Count (currently 224)

Same files as above — search for the E2E count alongside backend count.

### Total Test Count (currently 1018)

Sum of backend + E2E. Same files as above.

### Frontend Module Count (currently 971)

| File | Location | Format |
|------|----------|--------|
| `CLAUDE.md` | Line 11 | `# Build frontend (971 modules)` |
| `README.md` | Line 31 (Architecture diagram) | `React 19 SPA (971 Vite modules)` |

---

## Other Count Registries

### View Count (currently 20)

| File | Location |
|------|----------|
| `CLAUDE.md` | Line 4 (Project Overview) |
| `CLAUDE.md` | Line 18 (Architecture) |
| `docs/progress.md` | Line 5 (header) |
| `docs/feature-development-checklist.md` | Line 5 (header) |

### Scenario Count (currently 32)

| File | Location |
|------|----------|
| `CLAUDE.md` | Line 4 (Project Overview) |
| `docs/progress.md` | Line 5 (header) |
| `docs/feature-development-checklist.md` | Line 5 (header) |

### Architecture Section Count (currently 94, 81.9% metadata-driven)

| File | Location |
|------|----------|
| `docs/progress.md` | Line 5 (header) |
| `docs/feature-development-checklist.md` | Line 5 (header) |
| `docs/architecture-traceability.md` | Header |
| Context-level `MEMORY.md` | Current State section |

### Operation Script Count (currently 122 across 20 views)

| File | Location |
|------|----------|
| `docs/demo-guide.md` | Operations section |
| Context-level `MEMORY.md` | Current State section |
| In-repo `.claude/memory/MEMORY.md` | Current State section |

### Tour Count (currently 23 tours in registry)

| File | Location |
|------|----------|
| `workspace/metadata/tours/registry.json` | `tours` array length |
| `docs/demo-guide.md` | Tour registry section |

### Milestone Range (currently M0-M227)

| File | Location |
|------|----------|
| `CLAUDE.md` | Line 63 (Plans & Progress) |
| Context-level `MEMORY.md` | Current State section |
| In-repo `.claude/memory/MEMORY.md` | Current State section |

---

## Verification Commands

Run these and confirm pass/fail before merging.

```bash
# Backend tests via QA automation — expect ALL PASS, count matches registry
uv run python -m qa test backend
# Expected: "794 passed" (or current count)

# E2E tests via QA automation — run in batches if >100 tests cause browser crashes
uv run python -m qa test e2e
# Expected: "224 passed" (or current count; run in batches if needed)

# Quality scan — expect ALL PASS
uv run python -m qa quality --python

# Quality gate — expect PASS
uv run python -m qa gate

# View latest test report
uv run python -m qa report

# Frontend build — expect 0 errors, module count matches registry
cd frontend && npm run build 2>&1 | grep "modules transformed"
# Expected: "971 modules transformed" (or current count)

# Test count sync — verify all files agree
grep -rn "794\|224\|1018" CLAUDE.md README.md docs/progress.md docs/feature-development-checklist.md | grep -i "test\|backend\|e2e"
# Expected: all show same counts

# Module count sync
grep -rn "971" CLAUDE.md README.md | grep -i "module"
# Expected: all show 971

# Architecture audit — verify maturity % matches registry
grep -c "metadataMaturity:" frontend/src/data/architectureRegistry.ts
# Expected: 94 (or current section count)
```

---

## QA Automation Framework

The project includes a built-in QA automation toolkit at `qa/`. Use it instead of direct tool invocations.

### Commands

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `uv run python -m qa test backend` | Run backend tests with report | Every milestone |
| `uv run python -m qa test e2e` | Run E2E tests with report | Pre-merge |
| `uv run python -m qa quality --python` | Run all quality tools (ruff, bandit, radon, vulture, coverage) | Every stage |
| `uv run python -m qa quality --security` | Run security tools only | Security review |
| `uv run python -m qa quality --coverage` | Run coverage only | Coverage check |
| `uv run python -m qa gate` | Evaluate quality gate (pass/fail) | Pre-merge |
| `uv run python -m qa report` | Show latest test report | After test runs |
| `uv run python -m qa baseline update` | Save regression baseline | After merge |
| `uv run python -m qa report --regression` | Compare against baseline | Pre-merge |
| `uv run python -m qa report --flaky` | Detect flaky tests | Investigation |
| `uv run python -m qa watch` | Auto-run affected tests on file changes | During development |
| `uv run python -m qa hooks install` | Install git pre-push hook | Project setup |
| `uv run python -m qa hooks uninstall` | Remove git pre-push hook | Cleanup |

### Reports

- Test reports: `qa/reports/runs/<timestamp>/`
- Quality reports: `qa/reports/quality/<timestamp>/`
- Regression baselines: `qa/reports/baselines/`
- Latest symlinks: `qa/reports/runs/LATEST`, `qa/reports/quality/LATEST`

---

## Quick Reference

```
Session Start → Phase A (verify clean state, read docs, run tests)
New Feature   → Phase B (plan, roadmap, commit plan)
Each Task     → Phase C + Tier 1 (execute, update progress, commit)
Stage Done    → Tier 2 (sync counts, update docs, push)
Branch Done   → Tier 3 (full test suite, all docs, README, MEMORY, merge)
```
