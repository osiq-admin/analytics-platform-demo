# Data Modeling Design Considerations

## Purpose and Philosophy

This directory is a living design reference documenting the conceptual architecture for how calculations, match patterns, time windows, detection models, and scoring should work as a composable, metadata-driven system. It serves as the blueprint for future system redesign of the Risk Case Manager trade surveillance platform.

The documents in this suite capture design principles and architectural decisions that have emerged through iterative analysis. They describe a target state where every aspect of detection configuration --- from what to calculate, at what grain, over what time horizon, and how to score it --- is driven by metadata rather than code.

### Key Principles

- **Match patterns as a universal 3-column structure** (`pattern_key`, `entity`, `entity_attribute`) with a `pattern_type` discriminator. A single, reusable abstraction that drives classification, thresholds, detection levels, scoring, and time window scoping.
- **Calculation instances = match_pattern x calculation** --- parameterized calculations with resolved settings. The cross-product of what to compute and where to apply it.
- **Separate time_windows result table** with simple (precomputable) vs complex (on-the-fly) windows. Time is a first-class dimension, not embedded in calculation logic.
- **Detection level as configuration, not hardcoded** --- driven by match patterns of type `detection_level`. The grain of analysis (order, execution, trader-day, account-product) is data, not code.
- **Entity graph reachability** --- smart attribute resolution walking the relationship graph with cardinality-aware collapse. Attributes are resolved by traversing entity relationships, not by denormalizing everything upfront.
- **Resolution priority by granularity** --- entity key (highest) > most attribute matches > fewer matches > default (lowest). More-specific configuration always wins.
- **Match patterns drive everything**: detection levels, classification, thresholds, scores, settings, time window scoping.

---

## Document Listing

| # | Document | Description |
|---|----------|-------------|
| 00 | `00-index.md` | This file --- master index, reading guide, and cross-references |
| 01 | `01-executive-summary.md` | Business value, strategic positioning, why this matters |
| 02 | `02-current-state-analysis.md` | What exists today (8 entities, 10 calcs, 5 models, settings resolver) |
| 03 | `03-gap-analysis.md` | Bidirectional gap analysis: current state <-> proposed concepts |
| 04 | `04-match-pattern-architecture.md` | Universal 3-column match pattern system (CORE document) |
| 05 | `05-calculation-instance-model.md` | Calc x match pattern = parameterized calculation |
| 06 | `06-time-window-framework.md` | Time window types, registration, join semantics |
| 07 | `07-detection-level-design.md` | Configurable grain, entity graph reachability |
| 08 | `08-resolution-priority-rules.md` | Granularity-based priority, defaults, overrides |
| 09 | `09-unified-results-schema.md` | calc_results star schema, EAV pattern, dimension tables |
| 10 | `10-scoring-and-alerting-pipeline.md` | Multi-dimensional score resolution, trigger logic |
| 11 | `11-entity-relationship-graph.md` | 8 entities, relationships, reachability, cardinality |
| 12 | `12-settings-resolution-patterns.md` | Hierarchy strategy, multi-dimensional, override cascading |
| 13 | `13-regulatory-compliance-mapping.md` | MAR, MiFID II, Dodd-Frank, FINRA, SEC mapping |
| 14 | `14-medallion-integration.md` | Where calc_results, time_windows, match_patterns live in tiers |
| 15 | `15-ux-configuration-experience.md` | Client-facing setup flows, popup wizards, no-manual-work philosophy |
| 16 | `16-lifecycle-and-governance.md` | Pattern versioning, audit trail, change management |
| 17 | `17-performance-and-efficiency.md` | Query optimization, materialization strategy, caching |
| 18 | `18-glossary.md` | Canonical definitions of all terms |

### Appendices

| # | Document | Description |
|---|----------|-------------|
| A | `appendices/A-complete-table-schemas.md` | Full DDL for all proposed tables |
| B | `appendices/B-worked-examples.md` | 5+ end-to-end scenarios with actual data |
| C | `appendices/C-current-vs-proposed-mapping.md` | How current JSON metadata maps to proposed tables |
| D | `appendices/D-implementation-roadmap.md` | Phased approach to migrate from current to proposed |
| E | `appendices/E-composition-model-examples.md` | Composition model worked examples with per-value pattern matching |

---

## Reading Guide by Audience

| Audience | Start With | Then Read | Skip |
|---|---|---|---|
| **Executive / Sales** | 01 Executive Summary, 03 Gap Analysis (summary) | 15 UX Experience | Technical appendices |
| **Product Manager / Owner** | 01 -> 02 -> 03 Gap Analysis -> 15 -> 16 | 04 (concepts only) | Implementation details |
| **Data Engineer** | 02 -> 03 Gap Analysis -> 04 -> 05 -> 06 -> 07 -> 08 -> 09 | Appendices A, B, C | 01 |
| **Financial Modeler / Quant** | 03 Gap Analysis -> 04 -> 05 -> 06 -> 10 -> 12 | Appendix B examples | UX docs |
| **Compliance Officer** | 03 Gap Analysis -> 13 -> 01 -> 10 -> 16 | 08 (override rules) | Technical schemas |
| **Frontend / UX Engineer** | 15 -> 04 (concepts) -> 08 | 16 lifecycle | Backend schemas |
| **Claude Code (AI)** | All docs in order | Appendices A, C, D | None |

---

## Living Document Notice

This directory will grow. New principles are added as separate files. Documents are versioned through git history. When a new concept emerges that warrants its own document, it should be added to this index with the next available number and a clear, descriptive title.

---

## Cross-References

These existing project documents provide context and grounding for the design considerations in this suite:

- [`docs/schemas/`](../schemas/) --- Current JSON schema definitions for all metadata types
- [`docs/plans/`](../plans/) --- Implementation plans and comprehensive roadmap
- [`CLAUDE.md`](../../CLAUDE.md) --- Project conventions, architecture summary, and development instructions
- [`docs/progress.md`](../progress.md) --- Feature milestone tracker (M0--M378+)
