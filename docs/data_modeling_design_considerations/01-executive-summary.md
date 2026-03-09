# Executive Summary: Data Modeling Design Considerations

**Document**: 01 of the Data Modeling Design Considerations series
**Audience**: C-suite, Sales, Client stakeholders, Product leadership
**Last updated**: 2026-03-09

---

## 1. Business Value Proposition

Trade surveillance platforms have traditionally required months of custom engineering for every new detection scenario. When a regulator mandates a new surveillance model, or a client trades a new asset class, the typical response is a new development project: new tables, new code, new deployments, new testing cycles.

**Our platform eliminates that cycle entirely.**

By treating detection logic as *configuration rather than code*, the platform allows compliance teams to define, adjust, and deploy surveillance models through structured metadata -- without writing a single line of software. A new detection model is simply a new set of metadata rows that describe what to look for, how to score it, and when to raise an alert.

This design delivers three transformative business outcomes:

- **Configure, don't code.** Detection models, scoring thresholds, time windows, and alert templates are all expressed as metadata. Compliance analysts use the platform's configuration UI to build and refine models, removing the traditional handoff to engineering teams.

- **One engine, every market.** The same detection engine processes equities, FX, fixed income, commodities, and derivatives. There is no separate "equity surveillance module" or "FX surveillance module." A single execution path handles all asset classes across all jurisdictions, dramatically reducing the surface area for defects and the cost of regulatory change.

- **Measurable TCO reduction.** Adding a new detection model requires no schema migration, no code deployment, and no regression testing of existing models. The total cost of ownership for each incremental model drops from a typical 3-6 month engineering effort to a configuration exercise measured in days.

This approach gives compliance teams direct ownership of their surveillance logic, eliminates the engineering bottleneck that delays regulatory response, and provides a clear competitive differentiator: *time-to-market measured in days, not quarters.*

---

## 2. Strategic Architecture Summary

The platform's data model is built on five foundational principles that work together to deliver the business outcomes described above.

**One match pattern system drives all configuration.** Match patterns are simple, reusable criteria -- for example, "equity instruments on NYSE" or "all FX instruments" -- that connect detection models to the right thresholds, scoring rules, and settings for each market segment. Instead of hard-coding rules per asset class, the platform resolves the correct configuration at runtime based on what the data looks like. This means the same detection model works across asset classes without modification.

**Composable calculations enable broad reuse.** Each calculation -- such as "large trading activity" or "VWAP proximity" -- is defined once and referenced by any detection model that needs it. Today, 10 calculations serve 5 detection models. As new models are added, they compose from existing calculations, avoiding the duplication that plagues traditional systems.

**Resolution priority by granularity eliminates manual tuning.** When multiple configuration overrides could apply (for example, a global threshold and a product-specific threshold), the system automatically selects the most specific match. There is no manual priority assignment, no ordering conflicts, and no risk of misconfiguration.

**Entity graph reachability removes complex join logic.** The platform's entity model knows that an execution belongs to an order, which belongs to a trader, who sits on a desk. When a detection model needs a trader attribute, the engine traverses the entity graph automatically. Adding a new entity or relationship does not require changes to existing models.

**A single unified results table prevents table sprawl.** All detection models write their scored results to one standardized table structure. There is no per-model results table, no schema divergence between models, and no custom ETL for each new detection scenario. This simplifies downstream reporting, audit queries, and regulatory submissions.

---

## 3. Stakeholder Benefits

| Stakeholder | Benefit |
|---|---|
| **Compliance Officers** | Configure detection models through a guided UI without code changes. Adjust thresholds, scoring rules, and time windows in real time. |
| **Data Engineers** | Single unified results table for all models. No per-model table proliferation, no schema migrations when models are added. |
| **Quants / Modelers** | Compose detection logic from reusable calculation building blocks. Test new combinations without engineering dependencies. |
| **Operations** | Self-service configuration of time windows, thresholds, and scoring steps. Changes take effect immediately without deployment cycles. |
| **IT / Infrastructure** | Predictable, stable schema. No database migrations when new detection models are introduced. Reduced operational risk. |
| **Auditors** | Full traceability from alert to score to calculation to settings to raw data. Every decision in the detection chain is recorded and reproducible. |
| **Sales** | "Configure any surveillance model in minutes, not months." A clear differentiator against competitors that require custom development for each new scenario. |
| **Clients** | Self-service configuration with a guided experience. Reduced vendor dependency. Faster time-to-compliance for new regulatory requirements. |

---

## 4. Key Metrics

**Current Platform State**

| Dimension | Count | Significance |
|---|---|---|
| Entities | 8 | Product, execution, order, market data (EOD + intraday), venue, account, trader |
| Calculations | 10 | Reusable building blocks across all detection models |
| Detection Models | 5 | Market price ramping, wash trading (2 variants), insider dealing, spoofing/layering |
| Match Patterns | 9 | Asset class and venue-specific configuration selectors |
| Settings | 14 | Thresholds, score steps, and score thresholds -- all overridable per match pattern |
| Regulatory Frameworks | 6 | MAR, MiFID II, Dodd-Frank, FINRA, SEC, BCBS 239 |

**Scalability Outlook**

- The same engine scales to **50+ detection models** without schema changes. Each new model is a metadata definition that references existing calculations and settings.
- Each calculation is usable across **all models** -- calculations are not duplicated per model. Adding a new model that uses existing calculations requires zero new calculation code.
- Match patterns provide **granular configuration per asset class and venue**, meaning a single detection model can behave differently for equities vs. FX vs. derivatives without separate implementations.
- Six regulatory frameworks are mapped today, with the metadata structure ready to accommodate additional jurisdictions (APAC, LATAM) through configuration alone.

---

## 5. Architecture at a Glance

The following diagram illustrates the flow from configuration to alert generation. Each box represents a metadata-driven layer; no custom code is required at any stage.

```
                        CONFIGURATION LAYER
                        (All metadata, no code)
    +-----------------------------------------------------------+
    |                                                           |
    |   Match Patterns          Settings                        |
    |   (9 patterns)            (14 thresholds & score rules)   |
    |       |                        |                          |
    |       v                        v                          |
    |   +-----------------------+   +-----------------------+   |
    |   | Detection Level       |   | Scoring               |   |
    |   | Which model runs on   |   | Score steps & final   |   |
    |   | which instruments     |   | score thresholds      |   |
    |   +-----------+-----------+   +-----------+-----------+   |
    |               |                           |               |
    +-----------------------------------------------------------+
                    |                           |
                    v                           v
              +---------------------------------------------+
              |          CALCULATION LAYER                   |
              |          (10 reusable calculations)          |
              |                                             |
              |   Time Windows    Aggregations    Derived   |
              |   Transaction     Comparisons     Ratios    |
              +---------------------+-----------------------+
                                    |
                                    v
              +---------------------------------------------+
              |          UNIFIED RESULTS TABLE               |
              |          (One table for all models)          |
              |                                             |
              |   Scored results + context fields +          |
              |   full calculation trace                     |
              +---------------------+-----------------------+
                                    |
                                    v
              +---------------------------------------------+
              |          ALERTS & CASES                      |
              |                                             |
              |   82 alerts across 5 models, 5 asset        |
              |   classes, with full traceability to         |
              |   every score, calculation, and setting      |
              +---------------------------------------------+
```

**Reading the diagram from top to bottom:**

1. **Match Patterns** determine which instruments and markets a detection model applies to. **Settings** define the thresholds and scoring rules for each pattern.

2. **Detection Level** and **Scoring** configuration resolve automatically based on the most specific match pattern -- no manual priority assignment.

3. The **Calculation Layer** executes reusable calculations (time windows, aggregations, derived metrics) that multiple detection models share.

4. All results flow into a **single Unified Results Table**, regardless of which detection model produced them.

5. Results that exceed the configured score thresholds become **Alerts**, which are grouped into **Cases** for investigation -- with full traceability back through every layer.

---

*This executive summary is the first document in the Data Modeling Design Considerations series. Subsequent documents provide detailed technical specifications for each architectural layer.*
