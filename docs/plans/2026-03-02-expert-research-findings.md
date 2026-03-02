# Expert Research Findings: Product, R&D, and Compliance Analysis

**Date**: 2026-03-02
**Context**: Multi-expert research sprint analyzing the analytics-platform-demo from three perspectives: Product Strategy, R&D Architecture, and Regulatory Compliance. Research conducted after Phase 25 (M317-M326) completion.
**Current State**: 25 views, 1704 tests (1418 backend + 286 E2E), 121 architecture sections, 84% metadata-driven, 39 scenarios, M0-M326 complete.

---

## Table of Contents

1. [Product Strategy Analysis](#1-product-strategy-analysis)
2. [R&D Architecture Analysis](#2-rd-architecture-analysis)
3. [Regulatory Compliance Analysis](#3-regulatory-compliance-analysis)
4. [Cross-Expert Synthesis](#4-cross-expert-synthesis)
5. [Recommended Phase Reordering](#5-recommended-phase-reordering)
6. [Sources & References](#6-sources--references)

---

# 1. Product Strategy Analysis

## 1.1 Demo Impact Assessment: What Would WOW a Product Team

### The "Killer Demo Moment" Not Yet Built

The single most impactful missing demo moment is:

**The "Alert-to-Filing" Investigation Workflow** — a live, end-to-end walkthrough where a suspicious alert flows through triage, investigation, evidence collection, narrative generation, and culminates in an auto-generated SAR/STR filing draft. This is the "money shot" that every product team in trade surveillance wants to see, and it is currently absent from the demo.

Why this matters more than anything else on the roadmap:

1. **It is the core use case.** The platform generates alerts (82 across 5 models), has rich explainability (AlertTrace, CalculationTrace, ScoreBreakdown), and stores lineage — but the demo ends at the alert detail. A compliance officer watching this demo will immediately ask: "OK, I see the alert. Now what do I do with it?" There is no answer in the current system.

2. **It demonstrates value in business terms.** According to Eventus, one institution reduced alert triage time from hours to minutes by replacing legacy case management. The demo needs to show that transformation — not just detection, but the entire lifecycle from detection through regulatory filing.

3. **It activates the AI Assistant.** The AI Assistant currently exists but is underutilized in the demo narrative. The killer moment is: click an alert, the AI auto-generates an investigation summary pulling from lineage, trade reconstruction, market data context, and prior cases — then drafts a SAR narrative. This is exactly what Goldman Sachs and Deutsche Bank are testing with agentic AI right now.

### Other High-Impact Demo Moments (Ranked)

| Rank | Feature | Impact | Why |
|------|---------|--------|-----|
| 1 | Alert-to-Filing investigation workflow | Transformative | Core use case, every buyer expects this |
| 2 | AI-generated investigation summary | Very High | Matches NICE Actimize GenAI, Nasdaq AI, Behavox Polaris |
| 3 | Cross-asset correlation visualization | High | Shows sophistication; matches NICE X-Sight |
| 4 | Threshold simulation with before/after | High | Proves tuning capability; sandbox tier already exists |
| 5 | Network analysis graph | Medium-High | Trader-account-product relationship mapping |
| 6 | Real-time streaming simulation | Medium | Live alert generation during demo |

---

## 1.2 Competitive Differentiation Analysis

### What Vendors Are Showcasing in 2025-2026

**NICE Actimize SURVEIL-X** (Market leader):
- Generative AI via "Actimize Intelligence" — LLMs understand context of communications, not just keywords
- 85% false positive reduction, 4x more true misconduct detection
- 150+ language support for communications surveillance
- Holistic surveillance combining trades + communications
- Automated trade reconstruction
- Built-in case management with investigation workflows

**Behavox Polaris**:
- Agentic AI that auto-pulls related chats, emails, voice recordings into a single case
- 9 asset classes out of the box
- "Defensible evidence lineage" — reproducible investigations
- GPU-accelerated AI Risk Policies cutting alerts by 60%+
- Strategic partnership with b-next for expanded coverage
- 86% customer base growth in 2025

**Nasdaq Surveillance AI**:
- Generative AI at every stage of investigation
- Auto-generates consolidated regulatory filing tables, news summaries, sentiment analysis
- 33% reduction in investigation time during pilot
- 80% pump-and-dump detection rate (vs. traditional methods)
- Used by 50 exchanges and 20 international regulators

**SteelEye**:
- Merged with FundApps (2025) for unified compliance platform
- 50+ trade data handlers
- Market data + news + social media integration
- Few-click case construction from orders, trades, comms, market data, news
- Named Best Integrated Surveillance Firm 2025

**Agentic AI Trend**:
- Goldman Sachs and Deutsche Bank testing agentic AI for trading surveillance
- Deutsche Bank working with Google Cloud on AI agents monitoring trading activity
- 44% of finance teams expected to use agentic AI in 2026
- 20x faster alert resolution with automated workflows

### Competitive Position Matrix

| Capability | Our Demo | NICE | Behavox | Nasdaq | SteelEye |
|------------|----------|------|---------|--------|----------|
| Detection models | 5 | 50+ | 9 asset classes | 20+ | 15+ |
| Alert explainability | Strong | Strong | Medium | Strong | Medium |
| Case management | **MISSING** | Full | Full | Full | Full |
| SAR/STR generation | **MISSING** | Yes | Yes | Yes | Yes |
| Communications surveillance | **MISSING** | Core | Core | Partial | Core |
| GenAI investigation | Partial (AI mock) | Full | Full (Agentic) | Full | Emerging |
| Cross-asset correlation | Partial (5 assets) | Full | Full | Full | Full |
| Data lineage | **STRONG** | Limited | Limited | Medium | Limited |
| Metadata-driven arch | **UNIQUE STRENGTH** | Partial | No | No | No |
| Medallion architecture | **UNIQUE STRENGTH** | No | No | No | No |
| Standards compliance | **UNIQUE STRENGTH** | Partial | Partial | Partial | Partial |
| Business glossary | Strong | Limited | No | No | No |
| Platform portability | Planned | Cloud-native | Cloud-native | Cloud-native | Cloud-native |

### Key Differentiators to Emphasize

The platform has three genuine differentiators that no competitor showcases:

1. **Full metadata-driven architecture (84%)** — Competitors are code-heavy; the platform demonstrates that detection models, calculations, mappings, governance rules, and quality gates are all JSON. This is a powerful story for configurability and adaptability (BCBS 239 Principle 6).

2. **11-tier medallion architecture with full lineage** — No competitor demos this. The ability to trace a field from Landing through Bronze, Silver, Gold to Platinum with quality gates at every boundary is unique and addresses BCBS 239 Principles 2-5.

3. **Standards compliance depth** — 18 standards, 48 controls, full BCBS 239 mapping with evidence links. Competitors mention standards; the demo proves compliance with traceable evidence.

### Critical Gap vs. Every Competitor

Every major competitor has **case management and investigation workflows** as a core capability. This is table stakes — its absence is the single most obvious gap a product team will notice. The fact that the platform has robust detection, explainability, and lineage makes this gap even more jarring: the platform does the hard analytical work but stops right before delivering the business outcome.

---

## 1.3 Feature Priority Ranking: Reordered Roadmap

### Recommended New Phase Order

| Priority | Phase | Original Position | Rationale |
|----------|-------|-------------------|-----------|
| **DO NEXT** | **Phase 32 (Case Management)** | Phase 32 (Tier 7) | Table stakes — every competitor has this. Closes the narrative gap. |
| 2nd | **Phase 28 (Alert Tuning + Models)** | Phase 28 (Tier 5) | Threshold simulation uses existing Sandbox tier. 10 new models show breadth. Most impactful analytical feature. |
| 3rd | **Phase 27 (AI Configuration)** | Phase 27 (Tier 5) | AI-generated investigation summaries are the hottest feature in the market. Combine with case management. |
| 4th | **Phase 26 (Migration Readiness)** | Phase 26 (Tier 4) | Important for platform story but not a demo-wow feature. Defer. |
| Drop/Defer | Phase 29 (Security Hardening) | Phase 29 (Tier 6) | Production concern. For a demo, it adds no value. Mention as "designed for" but do not build. |
| Drop/Defer | Phase 30 (Testing Framework) | Phase 30 (Tier 6) | 1704 tests already. More testing infrastructure does not improve the demo. |
| Drop/Defer | Phase 31 (Cloud Infrastructure) | Phase 31 (Tier 6) | Docker/CI/CD is invisible in a demo. Not worth the effort for pitch purposes. |
| Long-term | Phase 33 (Productization) | Phase 33 (Tier 7) | Multi-tenant, plugins — only relevant if going to production. |

### Detailed Phase Recommendations

**Phase 32 should be NEXT (renamed "Investigation & Case Management"):**

The current Phase 32 description is too broad (customizable dashboards + comparative analysis + case management). Recommended split:

- **Phase 27-NEW: Investigation & Case Management** — Immediate next phase:
  - Case lifecycle: Alert Triage → Investigation → Case → Resolution → Filing
  - Case assignment with escalation rules (metadata-driven)
  - Investigation workspace: timeline reconstruction, evidence attachment, narrative editor
  - Disposition workflow: True Positive, False Positive, Escalated, Insufficient Evidence
  - SAR/STR auto-generation from case evidence (template-based, metadata-driven)
  - Case dashboard: open cases, aging, SLA tracking, disposition trends
  - Integration: Click "Investigate" on any alert in RiskCaseManager → opens case workspace

- **Phase 28 (Alert Tuning + Models) stays:**
  - Second most impactful feature. Sandbox tier (Phase 20) enables threshold simulation. Adding 10 more detection models shows breadth and proves metadata-driven architecture works at scale (just add JSON).
  - Back-testing framework is particularly compelling: run new thresholds against historical data, show precision/recall tradeoffs.

- **Phase 29-NEW: AI-Powered Investigation (Enhanced Phase 27):**
  - Combine AI Assistant enhancements with case management:
  - AI auto-generates investigation summary from alert context + lineage + market data
  - AI suggests similar historical cases
  - AI drafts SAR narrative from investigation evidence
  - AI recommends threshold adjustments based on disposition feedback (the "learning" loop)

---

## 1.4 Missing Features Not On the Roadmap

### Critical Missing Features

| Feature | Importance | Competitor Coverage | Recommendation |
|---------|-----------|-------------------|----------------|
| **Communications surveillance (e-comms)** | Very High | ALL competitors have this | Add as a data entity — even simulated email/chat metadata correlated with trades would be powerful |
| **Trader behavioral profiling** | High | Behavox core, NICE growing | Build trader behavioral baselines (normal trading patterns) and flag deviations |
| **Network analysis** | High | Emerging across vendors | Visualize trader-account-product-venue relationship networks |
| **Real-time streaming simulation** | Medium-High | All production systems | Simulate live alert generation during demo for drama |
| **Regulatory calendar integration** | Medium | Standard feature | Correlate alerts with earnings windows, fixing windows, blackout periods |
| **Watchlist/restricted list** | Medium | Standard feature | Cross-reference trades against restricted lists |
| **Cross-market manipulation** | Medium | NICE X-Sight, Nasdaq | Detect manipulation across related instruments (equity + options, spot + futures) |
| **Peer group analysis** | Medium | Emerging | Compare trader behavior against desk/firm peers |
| **Voice/audio surveillance** | Low for demo | NICE, Behavox | Not feasible for a demo — mention as "architecture supports" |

### High-Value Additions for Minimal Effort

1. **E-Comms Entity (simulated)** — Add a `communication` entity with simulated email/chat metadata (timestamp, sender, recipient, subject, keywords). Correlate with trade timestamps. Even mock data showing "Trader X emailed about AAPL 30 minutes before the suspicious trade" would be a powerful demo moment. This directly addresses the holistic surveillance trend that NICE, Behavox, and SteelEye all emphasize.

2. **Trader Behavioral Baseline** — Compute normal trading patterns per trader (average daily volume, typical instruments, usual trading hours, typical order sizes). Flag deviations. This is a new detection layer that does not require new models — just a baseline comparison calculation.

3. **Watchlist Cross-Reference** — Add a `watchlist` reference entity (restricted stocks, grey list, insider list). Cross-reference every execution against the watchlist. Flag matches. This is a 2-hour feature that adds significant demo value.

---

## 1.5 Demo Narrative Gaps

### Current Narrative Arc (Implicit)

The current demo follows a technical architecture narrative:
1. **Define** — Entities, schemas, metadata
2. **Ingest** — Onboarding, connectors, medallion pipeline
3. **Detect** — Models, calculations, alerts
4. **Investigate** — Alert detail, score breakdown, explainability
5. **Govern** — Lineage, quality, masking, standards

This is an **engineering narrative**. It impresses architects and data engineers. It does not tell a **business story** that resonates with a product team making investment decisions.

### Recommended Narrative Arc: "Day in the Life"

Restructure the demo around a **compliance officer persona** investigating a real suspicious activity:

**Act 1: The Alert Arrives (2 minutes)**
- Dashboard shows overnight alerts. One stands out: a high-scoring wash trading alert on AAPL.
- Click through to the alert detail. Score breakdown shows why it fired.
- "The system detected 47 matched trades by the same trader within a 4-hour window, representing 23% of the daily volume."

**Act 2: The Investigation (3 minutes)**
- Click "Investigate" → opens a case workspace (NEW: case management).
- AI auto-generates an investigation summary: "Trader T-042 executed 47 buy/sell pairs in AAPL between 10:15 and 14:22 on 2026-02-28. All trades were self-matched. No genuine change of ownership occurred. The pattern is consistent with artificial volume generation under MAR Article 12(1)(a)."
- Timeline reconstruction: show the trades on a timeline with market data overlay.
- Evidence collection: related orders, executions, market data, account details — all pulled automatically.
- Data lineage: trace the alert back through Gold → Silver → Bronze → Landing to show data provenance (unique differentiator).

**Act 3: The Decision (2 minutes)**
- Analyst marks the case as "True Positive — Wash Trading."
- AI drafts a SAR narrative from the evidence.
- Filing dashboard shows the SAR ready for review and submission.
- Case closed with full audit trail.

**Act 4: The Architecture Story (3 minutes)**
- Now zoom out: "Everything you just saw is metadata-driven."
- Show the detection model is JSON. Show the mapping is JSON. Show the quality gates are JSON.
- Toggle the architecture traceability mode — show that every component is traced.
- Show the medallion architecture — data flowed through 11 tiers with quality gates.
- Show the standards compliance matrix — 18 standards, 48 controls, BCBS 239 mapped.
- "This is not just a surveillance system. This is a surveillance *platform* that can be configured for any regulation, any asset class, any market — without writing code."

**Act 5: The Differentiator (2 minutes)**
- Sandbox: "What if we lower the threshold?" Run the model with different parameters, show before/after.
- Portability: "This runs on DuckDB today. Tomorrow it runs on Snowflake." (Even if Phase 26 is not built, the architecture story is credible.)
- AI: "The AI understands the entire metadata model. Ask it anything." Live Claude API interaction.

### Missing Story Elements

1. **No human persona.** The demo currently demonstrates features. It should follow a person (compliance officer, surveillance analyst) doing their job. The product team needs to envision their users in the system.

2. **No "before vs. after" moment.** The most persuasive demo moment is showing the same workflow with and without the platform. "Today, this investigation takes 4 hours. With our platform, it takes 15 minutes."

3. **No competitive knockout punch.** The demo should have one moment where the audience thinks, "I have never seen another vendor do this." The metadata-driven architecture + full lineage tracing is that moment — but it needs to be framed explicitly: "Show me the exact source field and transformation that produced this alert score. No other platform can do this."

4. **No "scale" story.** 82 alerts across 5 models is modest. The demo should show what happens when you scale to 1,000+ alerts — the case management triage, the AI prioritization, the pattern detection across cases.

---

# 2. R&D Architecture Analysis

## 2.1 Architecture Strengths & Risks

### Strengths

**Metadata-first design is genuinely impressive.** With 139 JSON metadata files across 30+ metadata types, 84% metadata-driven coverage, and a Strategy pattern in the settings resolver (`backend/engine/settings_resolver.py`), this platform walks the talk on configuration-over-code. The `RESOLUTION_STRATEGIES` registry is extensible without modifying the resolver itself. An engineering-savvy audience will immediately recognize this as production-grade thinking, not demo shortcutting.

**The 6-layer lineage engine (`backend/services/lineage_service.py`, 1217 lines) is the most technically differentiated component.** It materializes an adjacency list from 6 independent metadata layers (tier flow, field mapping, calc chain, entity FK, setting impact, regulatory requirements) at startup, then serves graph queries with zero I/O. The composite node ID scheme `{layer}:{type}:{name}:{tier}` prevents cross-layer collisions. This is rare even in production platforms, where lineage is typically a separate product (Marquez, OpenLineage, DataHub).

**The tamper-evident event chain** (`backend/services/event_service.py`) using SHA-256 hash chaining on append-only JSONL is a smart differentiator for surveillance. The `verify_chain()` method provides auditable integrity proof. In a regulatory audience, this alone could generate significant interest.

**DuckDB + PyArrow + Parquet as the analytical backbone** is exactly aligned with the 2025-2026 trend toward embedded analytics. The `DataLoader` (`backend/engine/data_loader.py`) handles CSV-to-Parquet conversion with change detection and optional Iceberg dual-write. This is clean.

**The detection engine** (`backend/engine/detection_engine.py`) with graduated scoring, multi-calculation evaluation, and full explainability traces (AlertTrace) is a compelling demo narrative. Every score can be traced back to the exact setting resolution, override match, and threshold step.

### Risks for Live Demo

**Risk 1 — Single-threaded DuckDB bottleneck.** The `DuckDBManager` (`backend/db.py`) uses a global lock (`self._lock`) for cursor creation. While adequate for demo load, if you demonstrate concurrent queries (e.g., lineage + alert evaluation + SQL console simultaneously), the lock serialization could cause visible lag. DuckDB's `SET threads TO 4` helps for individual query parallelism, but not for concurrent requests.

**Risk 2 — In-memory state loss.** The application is stateful: lineage graph is built at startup, events are in JSONL files, alerts are computed and cached. If the server crashes mid-demo, all state is lost. There is no health check beyond `{"status": "ok"}` — no readiness probe, no state verification.

**Risk 3 — The Iceberg integration has failure modes.** `_init_lakehouse_services` in `db.py` catches all exceptions and falls back to "Parquet-only mode." While graceful degradation is correct, if the demo is supposed to showcase Iceberg features and the extension fails to load silently, you would unknowingly demonstrate a degraded mode.

**Risk 4 — Static file caching.** The `SPAStaticFiles` handler in `main.py` serves from `frontend/dist/` via Starlette's `StaticFiles(html=True)`. As documented in the project memory, aggressive caching has caused stale-code debugging issues. During a live demo, if you make any last-minute frontend fix, the audience could see stale UI.

**Risk 5 — 35 API routers mounted at startup.** The import chain in `main.py` is a single import statement that pulls in 35 modules. If any one module has a circular import or missing dependency, the entire server fails to start. This is a brittle startup surface.

---

## 2.2 Technical Debt Priority

### Fix NOW (Pre-Demo)

**T1: Startup resilience.** Add a health check that verifies critical subsystems (DuckDB connection, metadata service loaded, lineage graph built, number of alerts > 0). Currently `/api/health` returns a static `{"status": "ok"}` regardless of actual system state. A richer health check would catch silent failures before the demo audience notices.

**T2: Iceberg extension load verification.** The `_install_iceberg_extension` method logs a warning but continues silently. Before any Iceberg demo flow, add an explicit `app.state.iceberg_available: bool` flag that the frontend can query. Otherwise, you risk clicking "Schema Evolution" and getting a 500.

**T3: Demo snapshot pre-warming.** The `start.sh` script does not warm the pipeline. The first API call to `/api/lineage/graph` triggers the lineage engine build. Add a startup task that pre-builds the lineage graph, evaluates alerts, and verifies data is loaded before opening the browser.

### Fix Later (Post-Demo)

**T4: MetadataService at 1377 lines** (`backend/services/metadata_service.py`) is a God object. It handles loading for entities, calculations, settings, detection models, contracts, transformations, pipeline stages, navigation, format rules, widgets, and more. This is manageable for a demo, but any future extensibility story should break this into domain-specific services.

**T5: Platform-specific DuckDB SQL** (documented as T17). Detection model queries are raw DuckDB SQL stored in metadata JSON. If you demonstrate migration portability to Snowflake, someone will ask "so the SQL just works?" The answer today is "no." SQLMesh transpilation (Phase 26) addresses this, but it is not built yet.

**T6: No connection pooling.** `DuckDBManager` creates a single connection. For a single-user demo this is fine, but it undermines the multi-tenant story (Phase 32-33).

### Hidden Debt (Not Previously Documented)

**H1: AI Assistant is essentially a stub.** The `suggest_calculation` method in `AIContextBuilder` (`backend/services/ai_context_builder.py`) is entirely pattern-matching on keywords (`"ratio"`, `"aggregate"`, `"window"`), not an LLM call. The `_live_reply` method in `AIAssistant` does call Claude, but the mock mode (which is the default when `llm_api_key` is empty) returns pre-scripted responses. If anyone asks "is this actually using AI?", the honest answer is "the chat uses Claude API when configured, but calculation suggestions are template-based." This gap is the single biggest credibility risk for Phase 27.

**H2: No error boundaries on frontend.** If any view throws a JS exception, the entire SPA could white-screen. React error boundaries are not evident in the view architecture (each view is a single `index.tsx`).

**H3: `nosec` annotations mask real concerns.** There are multiple `# nosec B608` annotations on f-string SQL construction. While these are intentional for a demo, they would immediately flag in a security review. If the audience includes security-conscious engineers, be prepared to explain the demo-only context.

**H4: No rate limiting or CORS configuration.** The FastAPI app has no middleware for CORS, rate limiting, or authentication. This is fine for local demo, but undermines the "production-ready architecture" narrative.

---

## 2.3 High-Impact Technical Features

### Tier 1 — Highest Demo Impact

**2.3.1: Simulated Real-Time Alert Stream (Phase 28 accelerator)**

Add a WebSocket-based alert simulation that pushes new alerts to the Dashboard every 5-10 seconds. The infrastructure is already partially there — `backend/api/ws.py` (WebSocket router) and `backend/services/event_service.py` (event emission). Wire them together:

- A background task generates synthetic market data perturbations
- The detection engine evaluates incrementally
- New alerts are pushed via WebSocket to the Dashboard
- The lineage graph highlights affected nodes in real-time

This turns a static demo into a living system. Engineering audiences viscerally react to real-time updates. The effort is moderate (2-3 days) because the detection engine, event service, and WebSocket infrastructure already exist.

**2.3.2: Agentic AI Alert Triage**

This is the single most impressive feature for a 2025-2026 audience. Instead of the current mock AI assistant, build an AI agent that:

1. Receives an alert from the detection engine
2. Queries the lineage graph to understand data provenance
3. Pulls relevant metadata context (entity schema, calculation chain, settings trace)
4. Generates a triage recommendation: "This alert is likely a false positive because the volume spike correlates with index rebalancing on 2024-03-15, affecting 12 products in the equity asset class"
5. Suggests a threshold adjustment via the what-if analysis endpoint (`/lineage/settings/preview`)

The `AIContextBuilder.build_full_context()` already generates the structured metadata context. The lineage store already has `previewThresholdChange()`. An "AI Triage" button on the RiskCaseManager would orchestrate these existing pieces through Claude tool-use. This is exactly the agentic data platform pattern trending in 2026.

**2.3.3: Field-Level Lineage with Regulatory Impact Visualization**

The lineage engine already computes field-level traces and regulatory tags. Enhance the DataLineage view to show: "If this field changes, these 3 BCBS 239 principles are affected, these 2 MiFID II requirements need re-certification, and these 5 downstream Gold-tier calculations produce stale results." The data exists; the visualization connecting lineage to standards compliance would be unique.

### Tier 2 — Strong Impact, More Effort

**2.3.4: SQLMesh Transpilation Demo (Phase 26 core)**

Demonstrate writing a detection model query once in DuckDB SQL, then showing it transpiled to Snowflake, Databricks, and BigQuery SQL side-by-side in the SQLConsole view (already has Monaco Editor). SQLMesh's `sqlglot.transpile()` handles the actual transpilation. This directly addresses the "platform portability" story.

**2.3.5: DuckLake Integration**

DuckLake (released May 2025) is DuckDB's native lakehouse format that uses a SQL database for all catalog metadata instead of Iceberg's file-based manifest approach. Since this project already uses DuckDB and SQLite, DuckLake integration would be nearly zero-effort and would demonstrate awareness of the absolute bleeding edge of the data lakehouse ecosystem. It would also simplify the existing Iceberg integration by replacing PyIceberg + SQLite catalog with DuckLake's native extension.

**2.3.6: Knowledge Graph for Regulatory Traceability**

Convert the lineage adjacency list into a queryable knowledge graph with semantic relationships: "execution — regulated_by → MiFID II", "wash_trading_model — detects → market_abuse", "trader — has_risk_rating → high". Use DuckDB's `CREATE GRAPH` extension (experimental) or export to a visualization. This connects to the GraphRAG trend and makes the regulatory traceability story tangible.

### Tier 3 — Innovation Differentiators

**2.3.7: Vector Search for Similar Alerts**

Embed alert traces using the calculation score vectors (each alert has N calculation scores). Use DuckDB's `vss` extension for vector similarity search: "Find me alerts similar to this one across all 5 detection models." This is a 1-day feature that demonstrates awareness of the multimodel database trend — using the same analytical engine for both SQL and vector operations.

**2.3.8: MCP Server for AI Tool Access**

Expose the platform's metadata as an MCP (Model Context Protocol) server, allowing any Claude-compatible agent to query entities, calculations, lineage, and alerts through standardized tool definitions. This is the standard for agentic AI tool integration in 2026 and would position the platform as AI-native rather than AI-adjacent.

---

## 2.4 Phase Ordering (Effort-to-Impact Analysis)

| Priority | Phase | Effort | Demo Impact | Dependencies |
|----------|-------|--------|-------------|--------------|
| 1 | **Phase 28 (Alert Tuning) — partial** | 3-5 days | Very High | None |
| 2 | **Phase 27 (AI Configuration) — partial** | 3-5 days | Very High | None |
| 3 | **Phase 26 (Migration Readiness) — partial** | 2-3 days | High | None |
| 4 | **Phase 29 (Security hardening)** | 3-5 days | Medium | None |
| 5 | **Phase 30 (Testing expansion)** | 2-3 days | Low (internal) | None |
| 6 | **Phase 31 (Docker/CI/CD)** | 2-3 days | Medium | None |
| 7 | **Phase 32-33 (Multi-tenant, plugins)** | 5-10 days | Low for demo | Phases 29+ |

**Key insight: Phases 27 and 28 should be done BEFORE Phase 26.** Here is why:

- Phase 28 (Alert Tuning) gives a distribution analysis dashboard and threshold simulation. This is visually dramatic and self-contained — showing an analyst adjusting a threshold slider and watching the alert count change in real-time using the existing `previewThresholdChange` endpoint.

- Phase 27 (AI Configuration) transforms the AI Assistant from a mock/chat tool into an intelligent agent that understands the metadata. This is the "wow factor" feature. A 2-minute demo of AI triaging an alert, explaining its lineage, and recommending a threshold change will be more memorable than any other feature.

- Phase 26 (Migration Readiness) is architecturally important but visually dull unless framed as "write once, deploy anywhere" with live transpilation side-by-side. A minimal version: SQLMesh transpilation in the SQL Console, Arrow interchange proof-of-concept, and a metadata export button.

**Phases 32-33 (multi-tenant, plugins) should be deferred entirely.** They require significant architectural work (tenant isolation, plugin sandboxing) with minimal demo payoff. The architecture already hints at multi-tenancy via `tenant_id` parameters in `LakehouseService`, which is sufficient for a conceptual slide.

---

## 2.5 Demo Stability Hardening

### Must-Do Before Any Live Demo

**5.1: Rich health endpoint.** Replace the static health check with one that verifies: DuckDB connection alive, metadata service loaded, lineage service initialized, Iceberg availability flag, alerts summary Parquet exists. Return `"ok"` or `"degraded"` with per-subsystem status.

**5.2: Pre-warm critical paths in start.sh.** After the server is ready, add curl calls to:
- `/api/lineage/graph?entities=execution&layers=tier_flow`
- `/api/alerts`
- `/api/metadata/entities`

This ensures the first demo click does not trigger cold-start latency.

**5.3: Add React error boundaries.** Wrap each view in an error boundary that displays "This section encountered an error — click to reload" instead of a white screen. This is a 30-minute safety net.

**5.4: Disable browser caching for demo.** Add cache-control headers to the FastAPI static file handler:
```
Cache-Control: no-cache, no-store, must-revalidate
```

**5.5: Create a "demo reset" script** that clears all transient state (events, metrics, lineage runs) and re-runs data generation + alert evaluation. The existing demo checkpoint system (`/api/demo/`) can be extended for this. A single `./reset-demo.sh` command should restore the platform to a known-good state in under 10 seconds.

**5.6: Playwright "demo rehearsal" test.** Create a single E2E test that walks through the exact demo script: Dashboard, click an alert, drill into RiskCaseManager, show lineage, open SQLConsole, demonstrate a settings change. This test should run in under 60 seconds and verify every view renders without errors.

---

## 2.6 Innovation Opportunities

### Cutting-Edge Capabilities for Engineering Audiences

**6.1: Streaming CDC Simulation.** Simulate Change Data Capture by having a background task that modifies CSV files (new executions, price updates) and watches for changes via the existing `_needs_reload` method in `DataLoader`. When changes are detected, re-run the detection engine incrementally and push updated alerts via WebSocket. The audience sees: "A new execution just arrived... the pipeline processes it through Bronze, Silver, Gold... a wash trading alert fires... the lineage graph highlights the affected path." This is the modern data platform story in 30 seconds.

**6.2: Semantic Metadata Search.** Embed all 139 metadata JSON files as vectors using a small embedding model (DuckDB `vss` extension or in-memory FAISS). Allow natural language search: "Which settings affect wash trading detection for equity products?" Instead of navigating through 25 views, the AI Assistant answers with direct links to relevant settings, calculations, and detection models. This turns the metadata catalog from browsable to queryable.

**6.3: Automated Regulatory Gap Detection.** The Standards Compliance Matrix (Phase 25) already has 48 controls with evidence links. Extend it: have the AI analyze the lineage graph and metadata to automatically identify regulatory gaps — "BCBS 239 Principle 4 (Timeliness) requires SLA tracking on data freshness. Your md_intraday entity has no SLA definition. Recommend adding a quality dimension with 15-minute freshness target." This transforms compliance from a checklist to an intelligent system.

**6.4: Time-Travel Debugging.** The Iceberg integration supports snapshots and tags. Build a "Time Machine" UI in the DataLineage view: select a timestamp, see the lineage graph as it existed at that point, compare alert volumes before and after a threshold change. This leverages existing infrastructure (Iceberg snapshots, event hash chain, lineage versioning) in a visually striking way.

**6.5: Federated Query Preview.** In the SQLConsole, add a "Target Platform" dropdown (DuckDB, Snowflake, Databricks, BigQuery). When a user writes a query, show the execution plan for each platform side-by-side (using SQLMesh's `sqlglot` AST). This is a powerful visual for the "platform portability" story without needing actual cloud connections.

---

# 3. Regulatory Compliance Analysis

## 3.1 Regulatory Gap Analysis

### 3.1.1 MAR Obligations Not Covered

**STOR Generation (CRITICAL GAP)**

The platform detects suspicious activity (82 alerts) but has no mechanism to generate Suspicious Transaction and Order Reports (STORs) as required by MAR Article 16(1). ESMA's December 2025 report revealed that while over 4,500 STORs were filed EU-wide, quality was a major concern — reports lacked clear rationale and detailed analysis. The platform's rich alert-trace infrastructure (calculation traces, score breakdowns, related orders) is perfectly positioned to generate high-quality STORs, but the actual STOR document template, pre-population logic, and submission workflow are missing entirely.

Reference: The FCA requires firms to submit STORs "without delay" once suspicion is confirmed, and ESMA has called for strengthened supervision on suspicious transaction reporting.

**What to build**: A STOR template engine that auto-populates from alert data (product ISIN, venue MIC, timestamps, trading pattern description, supporting evidence) with a compliance officer review/edit step before submission. Include STOR quality scoring based on ESMA guidance (completeness of rationale, supporting data, internal investigation summary).

**Annual Compliance Reporting**

MAR Article 16(2) requires firms to demonstrate effectiveness of surveillance arrangements. The platform has no annual compliance report generation capability — no year-over-year alert statistics, model performance metrics, false positive rates, or investigation outcomes aggregation.

**Insider Dealing List Management**

MAR Article 18 requires maintenance of insider lists. The platform detects insider dealing patterns but has no insider list management, PDMR (Persons Discharging Managerial Responsibilities) transaction notification tracking, or cross-referencing of insider lists against detected trading patterns.

### 3.1.2 MiFID II Requirements Beyond RTS 25

**Best Execution (SIGNIFICANT GAP)**

MiFID II Article 27 requires firms to take sufficient steps to obtain the best possible result for clients. The platform has no best execution analysis capability. The FCA published findings from a multifirm review of best execution in UK listed cash equities in December 2025, and may consult on rule changes in this area.

**What to build**: A Best Execution detection model comparing execution prices against consolidated market data (NBBO or European consolidated tape), measuring price improvement/slippage, and generating RTS 28 venue execution quality reports.

**Transaction Reporting (MiFIR Article 26)**

No transaction report generation capability. MiFIR requires 65+ fields per transaction report to competent authorities. While the data model supports many required fields (ISIN, MIC, LEI references), there is no report assembly, validation, or submission mechanism.

**Off-Channel Communications**

The FCA has been following the US enforcement wave on off-channel communications (WhatsApp, personal devices). While primarily a records retention issue, a surveillance platform should at least flag gaps in communication coverage and integrate with eComms surveillance systems.

### 3.1.3 Dodd-Frank / Volcker Rule Implications

**Volcker Rule Compliance**

No proprietary trading detection. The Volcker Rule (Section 619 of Dodd-Frank) prohibits certain proprietary trading by banking entities. Detection requires distinguishing market-making, hedging, and proprietary trading activity — a pattern the platform's entity model (with trader desk, capacity fields) could support but does not implement.

**Large Trader Reporting (SEC Rule 13h-1)**

No large trader identification or Form 13H filing support. Given the platform tracks execution volumes by account, this is a natural extension.

**Consolidated Audit Trail (CAT)**

No CAT reporting capability. US broker-dealers are required to report order lifecycle events to the CAT system.

### 3.1.4 Emerging Regulations

**EU AI Act (HIGH PRIORITY — Effective August 2026)**

Under the EU AI Act, AI systems used in financial services for fraud detection are explicitly exempted from high-risk classification under Annex III, BUT any AI system that affects natural persons' creditworthiness or access to financial services IS classified as high-risk. The EBA is undertaking specific activities in 2026-2027 to support implementation in the banking sector.

**What to build**: An AI Model Governance module that tracks model explainability, bias testing results, human oversight controls, and model decision audit trails. Even if current models are rule-based, demonstrating readiness for AI Act compliance would be a powerful differentiator.

**DORA — Digital Operational Resilience Act (LIVE — January 2025)**

DORA requires ICT risk management, incident reporting, resilience testing, and third-party risk management. The platform's observability tier (EventService, MetricsService) partially addresses monitoring, but DORA requires specific incident classification, reporting timelines (major incidents within hours), and Threat-Led Penetration Testing (TLPT) every 3 years for significant entities. Penalties reach up to 20 million EUR or 10% of annual turnover.

**What to build**: An ICT Incident Register view that classifies incidents (major/significant/minor), tracks notification timelines to competent authorities, and generates DORA-compliant incident reports. Also a Third-Party ICT Risk Register for tracking critical service provider dependencies.

**MiCA — Markets in Crypto-Assets Regulation**

ESMA published final guidelines on market abuse prevention under MiCA in April 2025, requiring standardized JSON schemas for orders and trades, on-chain/off-chain analysis, and social media monitoring. The 18-month transition means full enforcement by late 2026.

### 3.1.5 Cross-Border Considerations

The platform maps 6 regulations (MAR, MiFID II, Dodd-Frank, FINRA, EMIR, SEC) but treats them in isolation. A firm trading on both XLON and XNYS faces simultaneous obligations under MAR and SEC. There is no:
- Jurisdictional conflict resolution (when MAR and SEC have different reporting thresholds)
- Multi-regime alert routing (same alert may need different regulatory filings in different jurisdictions)
- Cross-border position aggregation (an entity trading the same security across jurisdictions)

---

## 3.2 Detection Model Gaps

### 3.2.1 Beyond the Planned 10 Additional Models

The 10 planned models (Benchmark Manipulation, Momentum Ignition, Quote Stuffing, etc.) cover traditional equities manipulation well. However, regulators in 2025-2026 are focused on these additional patterns:

**Social Media-Driven Manipulation (HIGHEST PRIORITY)**

FINRA published a dedicated report on social media-influenced investing in December 2025, identifying a rise in small-cap pump-and-dump schemes using social media recruitment and coordinated promotion patterns. FINRA's 2026 Annual Regulatory Oversight Report specifically calls for firms to enhance "cross-product and cross-customer manipulation surveillances, with particular attention to small-cap equities and coordinated social-media promotion patterns."

**What to build**: A Social Media Correlation model that cross-references unusual volume/price spikes with social media sentiment data, detecting coordinated pump-and-dump campaigns. This would use the platform's existing product and execution entities with an added social sentiment feed.

**AI-Assisted Manipulation**

FINRA's 2026 Regulatory Oversight Report adds new focus on AI and cybersecurity risks, including AI-generated misleading research, AI-driven coordinated trading strategies designed to evade traditional surveillance patterns, and deepfake-enabled identity fraud in trading.

**Crypto/Digital Asset Manipulation**

Under MiCA, crypto-asset service providers (CASPs) must implement surveillance equivalent to traditional markets. ESMA's guidelines require detection of: wash trading in crypto (including MEV-related manipulation), cross-venue manipulation across centralized and decentralized exchanges, and price manipulation through liquidity pool manipulation.

**ESG Greenwashing in Trading**

ESMA has declared greenwashing a key supervisory priority for 2025-2026, and in July 2025 published principles for sustainability-related claims. The first fine under SFDR was issued to Aviva Investments in Luxembourg. While primarily a fund/disclosure issue, a surveillance platform should detect trading patterns that exploit ESG re-ratings (buying ahead of ESG score changes).

**Cross-Customer/Cross-Product Manipulation**

FINRA specifically calls for enhanced "cross-product and cross-customer manipulation surveillances." The current platform detects per-account, per-product patterns. It lacks detection of coordinated activity across related accounts, collusion between seemingly independent traders, and correlated manipulation across products (e.g., manipulating a stock to benefit a derivative position).

### 3.2.2 Detection Model Enhancements for Existing Models

- **Temporal pattern analysis**: Current models use fixed time windows (business day, intraday). Regulators expect adaptive time windows that detect patterns spanning multiple days or executed in micro-second intervals.
- **Cross-asset class correlation**: An insider trading pattern where someone buys options before a stock announcement requires cross-asset surveillance. The platform has 5 asset classes but no cross-asset detection logic.
- **Network analysis**: Identifying beneficial ownership connections and front-running networks. The platform has account and trader entities but no relationship graph for detecting coordinated activity.

---

## 3.3 Compliance Workflow Gaps

### 3.3.1 Case Management Lifecycle (CRITICAL)

The platform has an alert investigation workspace and a submissions workflow (approve/reject), but a real surveillance platform needs a full case management lifecycle:

- **Escalation tiers**: Alert → Case → Investigation → Regulatory Filing. Currently the platform goes from Alert to Submission with no intermediate case stage.
- **Assignment and workload management**: Auto-assignment based on analyst expertise, jurisdiction, or round-robin. No analyst workload balancing.
- **SLA tracking**: Regulatory SLAs vary by jurisdiction (e.g., MAR STOR must be filed "without delay," typically interpreted as within 24-48 hours of suspicion formation). No SLA timer, aging, or breach alerting.
- **Investigation notes and evidence collection**: The alert detail workspace is read-only. Compliance officers need to annotate, attach documents, record interview notes, and document their reasoning.
- **Closure with regulatory disposition**: Cases should close with a documented outcome (filed STOR, false positive with rationale, escalated to law enforcement, etc.).

### 3.3.2 Regulatory Reporting Automation (CRITICAL)

Missing report types that a surveillance platform must generate:

| Report Type | Jurisdiction | Trigger | Current Status |
|---|---|---|---|
| STOR | EU (MAR Art. 16) | Suspicious trading detected | NOT BUILT |
| SAR / STR | US (BSA), UK (POCA) | Suspicious activity | NOT BUILT |
| CTR | US (BSA) | Transactions over $10K | NOT BUILT |
| RTS 25 Order Records | EU (MiFID II) | All orders | PARTIAL (data exists, no report format) |
| RTS 28 Best Execution | EU (MiFID II) | Annual | NOT BUILT |
| Form 13H | US (SEC Rule 13h-1) | Large trader threshold | NOT BUILT |
| CAT Reporting | US (SEC/FINRA) | All order events | NOT BUILT |
| EMIR Trade Reports | EU | Derivative trades | NOT BUILT |

### 3.3.3 Compliance Officer Dashboard (HIGH PRIORITY)

A CCO needs a single-screen view showing:
- **Alert backlog**: Open alerts by age, priority, model, jurisdiction
- **SLA compliance**: Percentage of alerts reviewed within regulatory deadlines
- **Investigation pipeline**: Cases by stage (triage, investigation, escalation, closure)
- **Model performance KPIs**: False positive rates, detection rates, model drift indicators
- **Regulatory calendar**: Upcoming filing deadlines, report due dates
- **Team metrics**: Alerts per analyst, average investigation time, resolution rates

### 3.3.4 Model Governance / Validation (SR 11-7)

The Federal Reserve's SR 11-7 guidance requires model risk management frameworks including independent model validation, ongoing monitoring, and outcomes analysis. The platform's ModelComposer view allows creating and editing models but lacks:

- **Model validation framework**: Independent backtesting against known manipulation cases, precision/recall metrics, false positive rate tracking
- **Model inventory**: SR 11-7 requires a comprehensive inventory of all models in use with risk ratings, validation status, and ownership
- **Model change control**: Version history of model parameters, approval workflow for threshold changes, rollback capability
- **Outcomes analysis**: Comparing model alerts against confirmed manipulation cases to measure effectiveness

### 3.3.5 Record Retention / Legal Hold

SEC Rule 17a-4 requires preservation of records for 6 years (first 2 years in easily accessible format). FINRA Rule 4511 has similar requirements. The platform's Archive tier concept exists in the medallion architecture metadata but has no:

- **Retention policy enforcement**: Automated retention period tracking per record type
- **Legal hold capability**: Ability to suspend deletion of records subject to litigation or regulatory inquiry
- **Tamper-evident storage**: While the audit service is append-only, there is no cryptographic verification of record integrity beyond the event chain
- **Destruction certification**: When retention periods expire, documented destruction with audit trail

---

## 3.4 Demo Impact for Compliance Audience

### 3.4.1 Features That Would Make a CCO Say "We Need This"

**Tier 1: Immediate Impact (build these first)**

1. **STOR Auto-Generation with Quality Scoring** — CCOs spend enormous effort on STOR quality. A button that pre-populates a STOR from alert data with a quality score (based on ESMA guidance) would be immediately compelling. Show the calculation trace, score breakdown, and related orders flowing directly into STOR fields.

2. **Compliance Officer Dashboard with SLA Tracking** — Every CCO wants a single pane of glass showing alert backlog aging, SLA compliance, and team performance. The platform already has 82 alerts across 5 models — the data exists, just needs the dashboard.

3. **Model Performance Analytics** — False positive rates are the bane of surveillance teams. Show a view that tracks false positive rates per model over time, with drill-down to understand WHY a model is generating false positives. The existing settings resolution system (product-specific overrides) is the solution — show that tuning thresholds reduces false positives.

4. **Investigation Annotation and Evidence Trail** — The 8-panel alert investigation workspace is impressive, but it is read-only. Adding annotation capability (compliance officer notes, evidence attachments, disposition recording) transforms it from a read-only dashboard into an actual investigation tool.

**Tier 2: Differentiation**

5. **Cross-Regulation Alert Routing** — Show a single wash-trading alert that simultaneously triggers MAR STOR obligations for EU venues and SEC reporting for US venues. The regulatory_coverage array in detection models already maps this — extend it into a routing engine.

6. **Social Media Correlation Panel** — In the alert investigation workspace, add a panel that shows social media sentiment data for the instrument at the time of the suspicious trading. Even if the data is simulated, showing the concept of correlating trading patterns with social media activity would be forward-looking.

7. **AI Act Readiness Module** — A model governance view that shows explainability metrics, bias testing results, and human oversight controls for each detection model. This does not need to be functional — just showing the metadata structure demonstrates awareness of the August 2026 deadline.

8. **DORA ICT Risk Dashboard** — A view showing system resilience metrics, incident classification, and third-party risk assessment. Given DORA is already in force since January 2025, this shows regulatory awareness.

**Tier 3: Visionary**

9. **Regulatory Calendar with Filing Deadlines** — A timeline view showing upcoming regulatory deadlines (STOR filing windows, annual report due dates, model validation schedules) linked to platform data.

10. **Network Analysis for Coordinated Manipulation** — A graph visualization showing account relationships and coordinated trading patterns, extending the existing React Flow infrastructure.

### 3.4.2 Presentation Strategy

When presenting to a CCO, lead with the **investigation workflow** (alert to STOR to case closure) rather than the architecture. A CCO cares about:
- "Can I demonstrate to the regulator that we detected and reported on time?"
- "How do I reduce false positives without missing real abuse?"
- "Can I see my team's backlog and SLA compliance?"
- "Can I prove our models are validated and governance is documented?"

The platform's metadata-driven architecture, medallion tiers, and ISO alignment are differentiators but should be presented as "how we achieve reliability" not as the primary value proposition.

---

## 3.5 Regulatory Trends 2025-2026

### 3.5.1 FCA Enforcement Trends

The FCA in 2025 signaled fewer investigations with faster resolutions, continuing focus on financial crime, and specific attention to off-channel communications. The FCA's multifirm review of best execution in UK listed cash equities (December 2025) may lead to rule changes. The FCA is exploring execution outcomes across different venues.

### 3.5.2 SEC Enforcement Priorities

The SEC announced record enforcement actions in Q1 FY2025. For 2026, the SEC expects a rise in enforcement actions in insider trading (especially biotech), accounting fraud, and material misrepresentations. The SEC prioritizes charging individuals rather than imposing corporate penalties.

### 3.5.3 FINRA 2026 Priorities

FINRA's 2026 Annual Regulatory Oversight Report adds new focus on AI risks, cybersecurity, and social media-influenced investing. Small-cap pump-and-dump schemes using social media coordination are a specific concern. FINRA expects firms to enhance cross-product and cross-customer manipulation surveillances.

### 3.5.4 ESMA and EU Regulatory Calendar

Key dates for 2026:
- **MiCA market abuse guidelines** — NCAs expect JSON-format order/trade data within 6 months of November 2025 publication
- **EU AI Act high-risk compliance** — August 2, 2026 deadline for financial sector AI systems
- **DORA Commission review** — January 17, 2026 review of strengthened requirements
- **ESMA integrated funds reporting** — 2026 report proposing harmonized templates

### 3.5.5 RegTech Market Context

The global RegTech market is projected to grow from $16 billion in 2025 to $62 billion by 2032 (CAGR 21.3%). AI in RegTech is forecast to reach $3.3 billion by 2026. Cloud-based solutions account for 75% of deployments. This is a market with strong tailwinds.

---

## 3.6 Compliance Expert — Recommended Build Priority

| Priority | Feature | Regulatory Driver | Effort | Demo Impact |
|---|---|---|---|---|
| **P1** | STOR Auto-Generation | MAR Art. 16 | Medium | Very High |
| **P1** | Compliance Officer Dashboard | All | Medium | Very High |
| **P1** | Case Management Lifecycle | MAR, MiFID II, SEC | High | Very High |
| **P2** | Model Performance / Validation | SR 11-7 | Medium | High |
| **P2** | Best Execution Detection | MiFID II Art. 27 | Medium | High |
| **P2** | Social Media Correlation | FINRA 2026 | Medium | High |
| **P2** | Investigation Annotations | All | Low | High |
| **P3** | AI Act Readiness Module | EU AI Act | Low | Medium |
| **P3** | DORA ICT Risk Dashboard | DORA | Low | Medium |
| **P3** | Regulatory Calendar | All | Low | Medium |
| **P3** | Cross-Border Alert Routing | MAR + SEC | Medium | Medium |
| **P4** | MiCA Crypto Surveillance | MiCA | High | Low (unless targeting CASPs) |
| **P4** | Record Retention / Legal Hold | SEC 17a-4, FINRA 4511 | Medium | Low |
| **P4** | Transaction Reporting (MiFIR) | MiFIR Art. 26 | High | Low |

---

# 4. Cross-Expert Synthesis

## 4.1 Unanimous Findings

All three experts converge on the same conclusion — **Case Management & Investigation Workflows** is the single biggest gap:

| Expert | Verdict |
|--------|---------|
| **Product** | "Table stakes — every competitor has it. Its absence is the most damaging gap." |
| **R&D** | "The architecture is solid; the opportunity is making it come alive." |
| **Compliance** | "Detection without reporting is incomplete. Missing the last-mile workflows." |

The platform does the hard analytical work (detection, explainability, lineage) but stops right before delivering the business outcome. Every competitor — NICE Actimize, Behavox, SteelEye, Nasdaq — has case management as a core capability.

## 4.2 Consensus Top 5 Build Items

1. **Case Management View** — alert triage → investigation → case → resolution → filing
2. **STOR/SAR Auto-Generation** — template engine pre-populated from alert data + lineage + evidence
3. **Compliance Officer Dashboard** — backlog aging, SLA tracking, team metrics, model performance
4. **Agentic AI Triage** — Claude tool-use orchestrating lineage + metadata + market data into investigation summaries
5. **Real-Time Alert Simulation** — WebSocket streaming + background detection for live demo drama

## 4.3 Platform Strengths (Unanimous)

All three experts agree these are genuine, unique differentiators:
- **Metadata-driven architecture (84%)** — No competitor has this depth
- **11-tier medallion architecture with full lineage** — Unique in the market
- **Standards compliance depth** — 18 standards, 48 controls, BCBS 239 with evidence links
- **Tamper-evident event chain** — SHA-256 hash chaining for regulatory auditability
- **6-layer lineage engine** — Most technically differentiated component

## 4.4 Market Intelligence Summary

- Trade surveillance market: $4.1B → $9.31B by 2033 (CAGR 9.63%)
- RegTech market: $16B → $62B by 2032 (CAGR 21.3%)
- AI in RegTech: $3.3B by 2026
- 44% of finance teams expected to use agentic AI in 2026
- Goldman Sachs and Deutsche Bank actively testing agentic AI for trade surveillance
- NICE Actimize reports 85% false positive reduction with GenAI
- Nasdaq reports 33% investigation time reduction with AI
- Behavox reports 60%+ alert reduction with AI Risk Policies

---

# 5. Recommended Phase Reordering

## Current vs. Proposed Order

| Current Order | Proposed Order | Rationale |
|---|---|---|
| Phase 26: Migration Readiness | **Phase 27-NEW: Investigation & Case Management** | Table stakes. Closes narrative gap. Every competitor has this. |
| Phase 27: AI Configuration | **Phase 28-NEW: AI-Powered Investigation** | Hottest feature in market. Builds on case management. |
| Phase 28: Alert Tuning + Models | **Phase 29-NEW: Alert Tuning & New Models** | Visual drama + breadth. Proves metadata architecture scales. |
| Phase 29: Security Hardening | **Phase 30-NEW: Demo Stability + Real-Time** | Hardening + WebSocket streaming. Makes demo "live." |
| Phase 30: Testing Framework | **Phase 31-NEW: Migration Readiness (minimal)** | SQLMesh transpilation preview. Platform portability story. |
| Phase 31: Cloud Infrastructure | **DEFER: Security/Testing/Cloud** | Production concerns. Zero demo value. |
| Phase 32: Case Management | *(Promoted to Phase 27-NEW above)* | |
| Phase 33: Productization | **DEFER: Multi-tenant/Plugins** | Only relevant for production. |

## Phases to Drop/Defer for Demo Purposes

- **Phase 29 (Security Hardening)** — Production concern. Mention as "designed for" but do not build for demo.
- **Phase 30 (Testing Framework)** — 1704 tests already. More infrastructure doesn't improve the demo.
- **Phase 31 (Cloud Infrastructure)** — Docker/CI/CD is invisible in a demo.
- **Phase 33 (Productization)** — Multi-tenant, plugins — only relevant if going to production.

---

# 6. Sources & References

## Product Strategy Sources
- [Trade Surveillance System Market to Surpass USD 9.31 Billion by 2033 — SNS Insider](https://www.globenewswire.com/news-release/2025/12/20/3208833/0/en/Trade-Surveillance-System-Market-to-Surpass-USD-9-31-Billion-by-2033-Driven-by-Rising-Regulatory-Scrutiny-and-Electronic-Trading-Growth-SNS-Insider.html)
- [NICE Actimize Empowers SURVEIL-X with Generative AI](https://www.nice.com/press-releases/nice-actimize-empowers-surveil-x-with-generative-ai-launching-a-new-era-in-market-abuse-and-conduct-risk-detection)
- [Behavox Grows Global Customer Base by 86% in 2025; Introduces Polaris](https://aijourn.com/behavox-grows-global-customer-base-by-86-in-2025-introduces-polaris-for-trade-surveillance/)
- [Behavox Strengthens Polaris Through Partnership with b-next](https://www.businesswire.com/news/home/20260127430091/en/Behavox-Strengthens-Its-Polaris-Trade-Surveillance-Platform-Through-Strategic-Partnership-with-b-next)
- [Nasdaq Embeds Innovative AI Capabilities Within its Surveillance Platform](https://ir.nasdaq.com/news-releases/news-release-details/nasdaq-embeds-innovative-ai-capabilities-within-its-surveillance)
- [Nasdaq Surveillance AI — AWS Customer Story](https://aws.amazon.com/ai/generative-ai/customers/nasdaq/)
- [SteelEye Trade Surveillance Features](https://www.steel-eye.com/product-features/trade-surveillance)
- [FundApps and SteelEye Merge for Unified Compliance Platform](https://finance.yahoo.com/news/fundapps-steeleye-merge-create-unified-120000453.html)
- [Goldman Sachs and Deutsche Bank Test Agentic AI for Trade Surveillance](https://michaelbriancotter.wordpress.com/2026/02/27/goldman-sachs-and-deutsche-bank-test-agentic-ai-for-trade-surveillance/)
- [Agentic AI in Financial Services 2026 — Neurons Lab](https://neurons-lab.com/article/agentic-ai-in-financial-services-2026/)
- [Trade Surveillance Best Practices — Eventus](https://www.eventus.com/cat-article/trade-surveillance-revolution/)
- [Trade Surveillance Best Practices — Trapets](https://www.trapets.com/resources/blog/trade-surveillance-best-practices)
- [Trade Surveillance Alert Management: Reducing False Positives — Trapets](https://www.trapets.com/resources/blog/trade-surveillance-alert-management-reducing-false-positives)
- [AI and Machine Learning in Trade Surveillance: A 2025 Guide — Trapets](https://www.trapets.com/resources/blog/ai-machine-learning-trade-surveillance)
- [FinCEN SAR Reporting FAQs October 2025](https://www.fincen.gov/system/files/2025-10/SAR-FAQs-October-2025.pdf)
- [Solidus Labs — Agentic-Based Compliance and Trade Surveillance](https://www.soliduslabs.com/)
- [Trade Surveillance System Market Research 2025-2030 — Yahoo Finance](https://finance.yahoo.com/news/trade-surveillance-system-market-research-103100322.html)

## R&D Architecture Sources
- [Metadata-Driven Architecture as Backbone of Scalable DaaS](https://www.strategy.com/software/blog/why-metadata-driven-architecture-is-the-backbone-of-scalable-data-as-a-service)
- [Data Engineering Trends 2026 for AI-Driven Enterprises](https://www.trigyn.com/insights/data-engineering-trends-2026-building-foundation-ai-driven-enterprises)
- [From Brittle Pipelines to Intelligent Ecosystems](https://medium.com/@rdo.anderson/from-brittle-pipelines-to-intelligent-ecosystems-architecting-the-metadata-driven-data-platform-a176b8a9450b)
- [2026 Data Management Trends — Alation](https://www.alation.com/blog/data-management-trends/)
- [AI Agents Transforming Alert Triage in SOCs](https://vooban.com/en/articles/2026/02/how-ai-agents-are-transforming-alert-triage-in-security-operations-centers)
- [Top 10 AI Trends 2025: Agentic AI and MCP — Splunk](https://www.splunk.com/en_us/blog/artificial-intelligence/top-10-ai-trends-2025-how-agentic-ai-and-mcp-changed-it.html)
- [The Enterprise AI Stack in 2026](https://www.tismo.ai/blog/the-enterprise-ai-stack-in-2026-models-agents-and-infrastructure)
- [2025 State of Apache Iceberg Ecosystem](https://datalakehousehub.com/blog/2026-02-state-of-the-apache-iceberg-ecosystem/)
- [DuckLake: SQL as a Lakehouse Format — DuckDB](https://duckdb.org/2025/05/27/ducklake)
- [SQLMesh: Scalable Data Transformation Framework](https://github.com/TobikoData/sqlmesh)
- [Automated Data Warehouse Migrations — SQLMesh](https://www.tobikodata.com/blog/automated-data-warehouse-migrations)
- [GraphRAG & Knowledge Graphs: Making Data AI-Ready for 2026](https://flur.ee/fluree-blog/graphrag-knowledge-graphs-making-your-data-ai-ready-for-2026/)
- [Six Data Shifts That Will Shape Enterprise AI in 2026 — VentureBeat](https://venturebeat.com/data/six-data-shifts-that-will-shape-enterprise-ai-in-2026)
- [Data 2026 Outlook: The Rise of Semantic Spheres — SiliconANGLE](https://siliconangle.com/2026/01/05/data-2026-outlook-rise-semantic-spheres-influence/)
- [5 Key Trends Shaping Agentic Development in 2026](https://thenewstack.io/5-key-trends-shaping-agentic-development-in-2026/)

## Regulatory Compliance Sources
- [FCA Enforcement Trends In 2025 And Expectations For 2026](https://www.wilmerhale.com/en/insights/blogs/wilmerhale-w-i-r-e-uk/20260109-fca-enforcement-trends-in-2025-and-expectations-for-2026)
- [SEC Record Enforcement Actions Q1 FY2025](https://www.sec.gov/newsroom/press-releases/2025-26)
- [SEC 2025 Year-in-Review](https://www.clearygottlieb.com/news-and-insights/publication-listing/the-shifting-sec-enforcement-landscape-2025-year-in-review)
- [ESMA STOR Report December 2025](https://www.esma.europa.eu/sites/default/files/2025-12/ESMA74-268544963-1554_Report_on_Suspicious_Transaction_and_Order_Reports__STORs_.pdf)
- [ESMA Calls for Strengthened STOR Supervision](https://www.esma.europa.eu/press-news/esma-news/esma-calls-strengthened-supervision-suspicious-transaction-reporting)
- [EBA AI Act Implications for Banking](https://www.eba.europa.eu/sites/default/files/2025-11/d8b999ce-a1d9-4964-9606-971bbc2aaf89/AI%20Act%20implications%20for%20the%20EU%20banking%20sector.pdf)
- [EU AI Act and Financial Services](https://www.twobirds.com/en/insights/2026/recent-developments-on-the-interplay-between-ai-and-financial-institutions)
- [DORA Compliance 2026](https://vantagepoint.io/blog/sf/dora-compliance-2026-what-financial-services-firms-need-to-know-about-digital-operational-resilience)
- [DORA Explained](https://quointelligence.eu/2025/02/dora-explained-scope-requirements-enforcement-deadlines/)
- [ESMA MiCA Market Abuse Guidelines April 2025](https://www.esma.europa.eu/sites/default/files/2025-04/ESMA75-453128700-1408_Final_Report_MiCA_Guidelines_on_prevention_and_detection_of_market_abuse.pdf)
- [FINRA Social Media-Influenced Investing Report 2025](https://www.finra.org/sites/default/files/2025-12/2025-social-media-influenced-investing.pdf)
- [FINRA 2026 Annual Regulatory Oversight Report](https://www.mcguirewoods.com/client-resources/alerts/2025/12/finras-2026-annual-regulatory-oversight-report-same-priorities-new-focus-on-ai-and-cybersecurity/)
- [Fed SR 11-7 Model Risk Management](https://www.federalreserve.gov/supervisionreg/srletters/sr1107.htm)
- [SEC Rule 17a-4 Record Retention](https://www.law.cornell.edu/cfr/text/17/240.17a-4)
- [FINRA Books and Records](https://www.finra.org/rules-guidance/key-topics/books-records)
- [FinReg Timeline 2026](https://www.proskauer.com/report/finreg-timeline-2026)
- [Financial Markets Outlook 2026](https://www.aoshearman.com/en/insights/financial-services-horizon-report-2026/financial-markets-outlook)
- [RegTech Industry Statistics 2025](https://coinlaw.io/regtech-industry-statistics/)
- [Future of Compliance: RegTech Trends](https://www.proxymity.io/views/the-future-of-compliance-emerging-regtech-trends/)
- [Global Crypto Policy Outlook 2025/26](https://www.trmlabs.com/reports-and-whitepapers/global-crypto-policy-review-outlook-2025-26)
