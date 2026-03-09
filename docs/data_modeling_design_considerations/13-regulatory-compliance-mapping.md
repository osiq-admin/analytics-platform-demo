# Regulatory Compliance Mapping

**Document**: 13 of the Data Modeling Design Considerations series
**Audience**: Compliance Officers, Legal, Audit
**Last updated**: 2026-03-09

---

## Purpose

This document maps the platform's data model, detection models, configuration architecture, and operational workflows to the regulatory requirements they satisfy. It is written for compliance professionals who need to demonstrate to regulators and auditors that the surveillance system meets its obligations.

Every claim in this document traces back to actual metadata files, detection model definitions, or service implementations in the codebase. The platform stores its compliance evidence as machine-readable JSON alongside the configuration it governs, making regulatory audits reproducible rather than reliant on documentation that may drift from reality.

---

## 1. Regulation Coverage Matrix

The following table maps specific regulatory articles and rules to the platform capabilities that satisfy them. Each row references the actual detection model, entity field, or service that provides the evidence.

### 1.1 Market Abuse Regulation (EU MAR)

| Article | Requirement | How the Platform Satisfies It | Evidence |
|---|---|---|---|
| Art. 12(1)(a) | Detect transactions giving false or misleading signals as to supply, demand, or price (wash trading) | **wash_full_day** and **wash_intraday** detection models. Evaluate cancel ratio, VWAP proximity (buy vs. sell VWAP spread), quantity match ratio (buy/sell qty alignment), and same-side percentage across full-day and intraday time windows. Score steps graduate severity (e.g., VWAP proximity <0.5% scores 10, <1% scores 7). | `workspace/metadata/detection_models/wash_full_day.json`, `wash_intraday.json`; settings: `wash_vwap_threshold`, `quantity_match_score_steps`, `vwap_proximity_score_steps` |
| Art. 12(1)(b) | Detect transactions securing the price at an abnormal or artificial level (price manipulation) | **market_price_ramping** detection model. Requires a detected price trend (MUST_PASS gate) via standard deviation multiplier, then evaluates trading activity volume and same-side directionality. Trend detection sensitivity is configurable per asset class (equity: 2.5 SD, FX: 2.0 SD, fixed income: 1.2 SD). | `workspace/metadata/detection_models/market_price_ramping.json`; settings: `trend_sensitivity`, `large_activity_multiplier`, `same_side_pct_score_steps`, `mpr_score_threshold` |
| Art. 12(1)(c) | Detect fictitious orders or deceptive practices -- spoofing and layering | **spoofing_layering** detection model. Requires a cancellation pattern (MUST_PASS gate) with configurable minimum cancel count (default: 5, equity: 3, options: 8), then evaluates opposite-side execution activity. Identifies rapid order placement and cancellation with intent analysis. | `workspace/metadata/detection_models/spoofing_layering.json`; settings: `cancel_count_threshold`, `spoofing_score_threshold` |
| Art. 14 | Prohibition of insider dealing -- trading on material non-public information | **insider_dealing** detection model. Requires a market event (MUST_PASS gate -- price surge, price drop, or volume spike) and evaluates trading activity in related products during a configurable lookback window (default: 30 days, equity: 20 days, options: 10 days). Correlates account trading with subsequent material events. | `workspace/metadata/detection_models/insider_dealing.json`; settings: `insider_lookback_days`, `market_event_score_steps`, `insider_score_threshold` |
| Art. 16 | Maintain effective surveillance systems to detect and report suspicious orders and transactions (STR obligation) | Full detection pipeline: 5 models generate 82 alerts across 5 asset classes. Alert-to-case-to-report-to-submission workflow supports STR/SAR generation. Append-only audit trail captures all detection activity. | `backend/services/audit_service.py`; `workspace/metadata/standards/compliance_requirements.json` (requirement `mar_16_surveillance`) |

### 1.2 Markets in Financial Instruments Directive II (MiFID II)

| Article | Requirement | How the Platform Satisfies It | Evidence |
|---|---|---|---|
| Art. 16(2) | Establish adequate policies and procedures for compliance, including surveillance systems | Full metadata-driven surveillance pipeline with algorithmic detection, graduated scoring, configurable thresholds, and case management. All 5 detection models reference this article in their `regulatory_coverage` metadata. | `workspace/metadata/detection_models/*.json` (all models list Art. 16(2)); `workspace/metadata/standards/compliance_requirements.json` (requirement `mifid2_16_2_org`) |
| Art. 16(6) | Record keeping -- maintain records of services and transactions for regulatory inspection | Audit trail service captures all metadata changes with before/after values. Alert traces preserve calculation scores, settings resolution, and entity context at generation time. Settings history tracks every configuration change. | `backend/services/audit_service.py` (append-only records); `backend/models/alerts.py` (`AlertTrace`, `SettingsTraceEntry`, `CalculationTraceEntry`) |
| Art. 17 | Algorithmic trading controls -- surveillance must cover algo-related abuse patterns | Detection models cover algorithmic abuse scenarios: spoofing/layering (algorithmic order placement patterns), market price ramping (automated trend exploitation), and wash trading (automated matching patterns). | `workspace/metadata/detection_models/spoofing_layering.json`, `market_price_ramping.json` |
| RTS 25 | Order records with precise timestamps, FIX attributes, clock synchronisation | Entity fields aligned with FIX Protocol tags: order_type (Tag 40), status (Tag 39), side (Tag 54), time_in_force (Tag 59), exec_type (Tag 150), capacity (Tag 1057). All timestamps use ISO 8601 format. | `workspace/metadata/standards/fix_protocol.json` (6 FIX tags mapped); `workspace/metadata/standards/iso_mapping.json` (ISO 8601 timestamp compliance); `workspace/metadata/entities/order.json`, `execution.json` |
| RTS 25 | Instrument identification using international standards | Products identified by ISIN (ISO 6166, 12-char format validated), CFI code (ISO 10962, 6-char classification), and currency (ISO 4217). Venues identified by MIC code (ISO 10383, 4-char). Countries validated against ISO 3166-1 alpha-2. | `workspace/metadata/standards/iso_mapping.json` (6 ISO standard mappings with validation rules); `workspace/metadata/entities/product.json`, `venue.json` |

### 1.3 Dodd-Frank Wall Street Reform and Consumer Protection Act

| Article | Requirement | How the Platform Satisfies It | Evidence |
|---|---|---|---|
| Section 747 | Anti-manipulation and anti-spoofing provisions | **spoofing_layering** model detects bidding/offering with intent to cancel before execution. **market_price_ramping** model detects price manipulation through aggressive directional trading. Both models are explicitly mapped to Section 747 in their `regulatory_coverage` metadata. | `workspace/metadata/detection_models/spoofing_layering.json` (regulatory_coverage: "Dodd-Frank, Section 747"); `market_price_ramping.json` (same) |
| Section 763 | Position reporting for swaps and derivatives | Entity model supports derivative instrument classification via `product.instrument_type`, `product.asset_class`, and `product.cfi_code` (ISO 10962). Product entity captures strike price, expiry date, and underlying for derivatives. | `workspace/metadata/entities/product.json` (fields: instrument_type, asset_class, cfi_code, strike, expiry, underlying) |

### 1.4 SEC Rules

| Article | Requirement | How the Platform Satisfies It | Evidence |
|---|---|---|---|
| Section 9(a)(2) | Prohibit transactions creating apparent active trading to manipulate price (wash sales) | **wash_full_day** and **wash_intraday** models detect accounts buying and selling the same product at similar prices and quantities within a single business day or intraday window. Quantity match ratio, VWAP proximity, and same-side percentage provide multi-factor evidence. | `workspace/metadata/detection_models/wash_full_day.json` (regulatory_coverage: "SEC, Section 9(a)(2)"); `wash_intraday.json` (same) |
| Rule 10b-5 | Fraud in connection with purchase or sale of securities -- insider trading | **insider_dealing** model detects trading before material non-public information events. Correlates account trading activity with subsequent price surges, drops, or volume spikes using configurable lookback windows. | `workspace/metadata/detection_models/insider_dealing.json` (regulatory_coverage: "SEC, Rule 10b-5"); `workspace/metadata/standards/compliance_requirements.json` (requirement `sec_10b5_insider`) |
| Rule 15c3-5 | Market access risk management -- pre-trade and post-trade controls | Real-time detection pipeline with configurable thresholds supports post-trade surveillance. Large activity detection uses multiplier-based thresholds (e.g., equity: 2.5x average daily volume). | `workspace/metadata/settings/thresholds/large_activity_multiplier.json` |

### 1.5 FINRA Rules

| Article | Requirement | How the Platform Satisfies It | Evidence |
|---|---|---|---|
| Rule 5210 | Marking the close -- prohibit trading designed to influence closing price | **market_price_ramping** model with trend detection and large activity scoring. Explicitly mapped to FINRA Rule 5210 ("Marking the close -- trading activity near market close"). | `workspace/metadata/detection_models/market_price_ramping.json` (regulatory_coverage: "FINRA, Rule 5210") |
| Rule 3110 | Supervision requirements -- member firms must supervise associated persons | Metadata-driven configuration enables supervisory oversight: all settings, thresholds, and model configurations are reviewable through the platform UI. RBAC roles (analyst, compliance_officer, data_engineer, admin) enforce separation of duties. | `workspace/metadata/governance/roles.json` (4 roles with tier_access and classification_access) |
| Rule 6140 | Wash trade detection -- trading that involves no change in beneficial ownership | **wash_full_day** and **wash_intraday** models. Same detection logic as MAR Art. 12(1)(a) and SEC Section 9(a)(2). | `workspace/metadata/standards/compliance_registry.json` (FINRA entry: "Wash trade detection (Rule 6140)") |

### 1.6 EMIR (European Market Infrastructure Regulation)

| Article | Requirement | How the Platform Satisfies It | Evidence |
|---|---|---|---|
| Art. 9 | Report derivative contract details to trade repositories | Product entity supports derivative classification: `instrument_type` (call_option, put_option, future, swap), `cfi_code` (ISO 10962), `asset_class`, `underlying`, `strike`, `expiry`. Report service generates regulatory reports from case and alert data using configurable templates. | `workspace/metadata/entities/product.json`; `backend/services/report_service.py`; `workspace/metadata/standards/compliance_requirements.json` (requirement `emir_9_reporting`, status: partial) |

### 1.7 BCBS 239 (Principles for Effective Risk Data Aggregation)

| Principle | Name | Platform Compliance | Evidence |
|---|---|---|---|
| 1 | Governance | **Full.** Data governance framework with 4 RBAC roles (analyst, compliance_officer, data_engineer, admin), append-only audit trail, PII registry, cross-view masking enforcement, and business glossary with ownership metadata. | `workspace/metadata/governance/roles.json`; `backend/services/audit_service.py`; `workspace/metadata/governance/pii_registry.json`; `backend/services/masking_wrapper.py` |
| 2 | Data Architecture | **Full.** 11-tier medallion architecture (Landing through Archive), data contracts between tiers, 6-layer materialized adjacency list lineage engine, 8 pipeline stages with dependency ordering. | `workspace/metadata/medallion/tiers.json`; `workspace/metadata/medallion/contracts.json`; `backend/services/lineage_service.py`; `workspace/metadata/medallion/pipeline_stages.json` |
| 3 | Accuracy | **Full.** Quality engine with 7 ISO 25012-aligned dimensions. Accuracy dimension (ISO/IEC 25012:2008 S4.2.2, weight 0.20) with configurable thresholds (critical <60, warning 60-80, healthy >80). Golden records for 4 entity types (301 records). | `workspace/metadata/quality/dimensions.json`; `backend/engine/quality_engine.py`; `workspace/reference/` (product, venue, account, trader golden records) |
| 4 | Completeness | **Full.** Completeness dimension (ISO/IEC 25012:2008 S4.2.1, weight 0.20). Entity gap analysis for all 8 entities. 4 semantic metrics mapped to completeness principle. | `workspace/metadata/quality/dimensions.json`; `workspace/metadata/glossary/entity_gaps.json`; `workspace/metadata/semantic/metrics.json` |
| 5 | Timeliness | **Full.** Timeliness dimension (ISO/IEC 25012:2008 S4.2.4, weight 0.15). Pipeline stages with execution ordering and retention policies per tier (7 days to 7 years). | `workspace/metadata/quality/dimensions.json`; `workspace/metadata/medallion/pipeline_stages.json`; `workspace/metadata/medallion/tiers.json` |
| 6 | Adaptability | **Full.** Metadata-driven architecture (84% of configuration is JSON). 5 configurable detection models with no code changes required. Settings hierarchy with product-specific overrides. New models, thresholds, and scoring rules added through configuration alone. | `workspace/metadata/detection_models/` (5 models); `workspace/metadata/settings/` (thresholds, score steps, score thresholds); `workspace/metadata/` (25+ metadata type directories) |
| 7 | Accuracy (Reporting) | **Partial.** DAG-based calculation engine with topological sort across 4 layers (TRANSACTION, TIME_WINDOW, AGGREGATION, DERIVED). Platinum tier for pre-built KPIs. Gap: no automated reconciliation with external source systems. | `backend/engine/calculation_engine.py`; `workspace/metadata/medallion/tiers.json` (Platinum tier) |
| 8 | Comprehensiveness | **Partial.** 5 models covering 82 alerts across 5 asset classes (equities, FX, futures, options, swaps). 14 compliance requirements mapped. Full data lineage for alert explainability. Gap: credit and operational risk models not in scope. | `workspace/metadata/standards/compliance_requirements.json` (14 requirements); `backend/services/lineage_service.py` |
| 9 | Clarity | **Full.** Business glossary with 45+ ISO 11179-named terms (Object Class + Property + Representation). 6 categories (market_abuse, data_entities, metrics, regulatory, data_quality, architecture). 12 semantic metrics with plain-language definitions. | `workspace/metadata/glossary/terms.json`; `workspace/metadata/glossary/categories.json`; `workspace/metadata/semantic/metrics.json` |
| 10 | Frequency | **Partial.** 8 pipeline stages defined with dependency chains. Event-driven pipeline execution logging. Retention policies per tier. Gap: real-time scheduling engine not implemented; batch execution in current version. | `workspace/metadata/medallion/pipeline_stages.json`; `backend/services/event_service.py` |
| 11 | Distribution | **Full.** 4 RBAC roles with tier-based and classification-based access control. 5 masking algorithms (partial, tokenize, hash, generalize, redact) with role-based unmasking. Cross-view masking enforcement at response time for all data endpoints. 7 field-level masking policies. | `backend/services/rbac_service.py`; `backend/services/masking_service.py`; `backend/services/masking_wrapper.py`; `workspace/metadata/governance/masking_policies.json` |

### 1.8 GDPR (General Data Protection Regulation)

| Article | Requirement | How the Platform Satisfies It | Evidence |
|---|---|---|---|
| Art. 25 | Data protection by design and by default | Cross-view masking wrapper enforces PII masking across all data-serving API endpoints (data, query, alerts) at response time. Roles without PII access see redacted values by default. | `backend/services/masking_wrapper.py` (header: "GDPR Art. 25, MAR Art. 16, BCBS 239 P1") |
| Art. 30 | Records of processing activities | PII registry API provides per-field masking status by entity. PII access audit logging records entity, role, and row count per request. | `backend/api/governance.py` (PII registry endpoint); `backend/services/masking_wrapper.py` (PII access audit logging) |

---

## 2. Audit Trail Guarantees

The platform provides end-to-end traceability from every alert back to its source data, through every decision made along the way. This section explains what is recorded, how it is stored, and what auditors can reconstruct.

### 2.1 Alert-to-Source Traceability

Every alert generated by the detection engine carries a complete `AlertTrace` record (defined in `backend/models/alerts.py`) that captures:

- **Entity context**: The exact `product_id`, `account_id`, `business_date`, `asset_class`, `instrument_type`, and any model-specific context fields (e.g., `event_type`, `trend_type`, `pattern_side`) that were present when the alert fired. These are the raw data attributes that triggered the detection.
- **Calculation scores**: For each calculation evaluated (e.g., `large_trading_activity`, `wash_qty_match`, `wash_vwap_proximity`), the trace records the computed value, the score awarded, and the score step that matched.
- **Accumulated score and threshold**: The total score across all calculations and the threshold it was compared against. The alert records whether it fired via `all_passed` (all MUST_PASS calculations met) or `score_based` (accumulated score exceeded threshold).

### 2.2 Settings Resolution Trace

For every setting resolved during alert evaluation, a `SettingsTraceEntry` is recorded:

- **setting_id / setting_name**: Which setting was resolved (e.g., `wash_vwap_threshold`, `cancel_count_threshold`).
- **resolved_value**: The actual value used for this specific alert evaluation.
- **matched_override**: If an override matched, the full override record (match criteria, value, priority).
- **why**: A human-readable explanation of the resolution decision. Examples:
  - `"Matched override: {asset_class=equity} (priority 1)"` -- an asset-class-specific override was used.
  - `"Matched override: {asset_class=equity, exchange_mic=XNYS} (priority 2)"` -- a more specific two-key override won.
  - `"No matching override; using default value"` -- no override applied, so the global default was used.

This means an auditor can answer: "For this specific alert on this specific instrument, which threshold was used, and why was that threshold chosen over the global default?"

### 2.3 Calculation Trace

Each `CalculationTraceEntry` records:

- **calc_id**: Which calculation was executed (e.g., `trend_detection`, `cancel_pattern`).
- **layer**: The calculation's position in the DAG (TRANSACTION, TIME_WINDOW, AGGREGATION, DERIVED).
- **value_field**: Which data field provided the computed value.
- **computed_value**: The actual numeric result.
- **threshold_setting_id / threshold_value**: If a threshold was applied, which setting and what value.
- **score_steps_setting_id / score_awarded / score_step_matched**: Which score step configuration was used, what score was awarded, and which step bracket the value fell into.

### 2.4 Immutability

- **Audit records are append-only.** The `AuditService` writes each record as a separate timestamped JSON file (`YYYYMMDDTHHMMSS_<type>_<id>_<action>.json`) in `workspace/metadata/_audit/`. Records are never modified or deleted.
- **Alert traces are write-once.** Once an `AlertTrace` is generated, it is persisted with its alert and cannot be retroactively altered.
- **Settings history preserves before/after.** Every setting change records both the previous value and the new value, providing a complete change history for regulatory inspection.

### 2.5 PII Access Audit

The cross-view masking wrapper (`backend/services/masking_wrapper.py`) logs every PII access event:

- Which entity's PII was accessed.
- Which role requested the data.
- How many rows were served.
- Whether masking was applied or bypassed (for authorized roles).

This satisfies GDPR Art. 30 (records of processing activities) and MAR Art. 16 (surveillance activity logging).

---

## 3. Regulatory Impact of Match Pattern Architecture

The match pattern system (documented in detail in [04-match-pattern-architecture.md](./04-match-pattern-architecture.md)) has specific properties that matter for regulatory compliance.

### 3.1 Demonstrability

When a regulator asks "why was this threshold used for this product?", the platform can provide a concrete answer:

1. The alert trace records the `SettingsTraceEntry` with the `why` field explaining the resolution.
2. The match pattern that drove the resolution is stored as human-readable JSON (e.g., `{"asset_class": "equity", "exchange_mic": "XNYS"}`).
3. The full resolution chain is traceable: product attributes matched against override criteria, most-specific match won, and the resulting value was applied.

**Example**: A wash trading alert on AAPL (equity, NYSE) uses a VWAP threshold of 0.01 because the product-specific override (`{"product": "AAPL"}`, priority 100) takes precedence over the equity override (0.015, priority 1) and the NYSE equity override (0.012, priority 2). The settings trace records exactly this decision chain.

### 3.2 Reviewability

All configuration is stored as JSON files in `workspace/metadata/`:

- **Detection models**: `workspace/metadata/detection_models/*.json` -- each model's calculations, strictness levels, score thresholds, and regulatory coverage are visible in a single file.
- **Settings and thresholds**: `workspace/metadata/settings/thresholds/*.json` and `score_steps/*.json` -- every threshold, every override, and every score step matrix is human-readable.
- **Match patterns**: `workspace/metadata/match_patterns/*.json` -- each pattern's match criteria and layer (out-of-box vs. custom) are explicit.

Compliance officers can review these files directly. There are no hidden rules embedded in compiled code. The configuration *is* the surveillance logic.

### 3.3 Change Tracking

The audit service records every configuration change with:

- **Timestamp**: When the change was made (ISO 8601).
- **Previous value**: The exact configuration before the change.
- **New value**: The exact configuration after the change.
- **Metadata type and item ID**: What was changed (e.g., "setting", "wash_vwap_threshold").
- **Action**: What happened (create, update, delete).

This provides a complete before/after comparison for every configuration modification.

### 3.4 Regulatory Hold Capability

Match patterns used in active investigations can be flagged to prevent modification. The pattern's `layer` field distinguishes out-of-box patterns (shipped with the platform) from custom patterns (created by the client). Combined with the case management workflow, patterns referenced by open cases can be locked until the investigation concludes.

### 3.5 Jurisdiction-Specific Configuration

The match pattern system supports jurisdiction-specific rules through multi-dimensional matching:

- **UK rules**: Override patterns can match on `registration_country=GB` or `exchange_mic=XLON` to apply UK-specific thresholds.
- **EU rules**: Patterns matching `exchange_mic=XPAR` or `exchange_mic=XFRA` for EU venue-specific configuration.
- **US rules**: Patterns matching `exchange_mic=XNYS` or `exchange_mic=XNAS` for US venue-specific thresholds.

The same detection model processes all jurisdictions; only the thresholds and scoring parameters vary. This is already implemented for settings like `business_date_cutoff` (NYSE: 21:00 UTC, LSE: 16:30 UTC) and `wash_vwap_threshold` (NYSE equity: 0.012 vs. general equity: 0.015).

---

## 4. Detection Model to Regulation Mapping

This is the reverse mapping: for each detection model, which regulations does it satisfy?

| Detection Model | Regulations Covered | Articles / Rules |
|---|---|---|
| **wash_full_day** (Wash Trading -- Full Day) | MAR, MiFID II, SEC | MAR Art. 12(1)(a), MiFID II Art. 16(2), MiFID II RTS 25, SEC Section 9(a)(2) |
| **wash_intraday** (Wash Trading -- Intraday) | MAR, MiFID II, SEC | MAR Art. 12(1)(a), MiFID II Art. 16(2), SEC Section 9(a)(2) |
| **market_price_ramping** (Market Price Ramping) | MAR, Dodd-Frank, FINRA | MAR Art. 12(1)(b), Dodd-Frank Section 747, FINRA Rule 5210 |
| **spoofing_layering** (Spoofing / Layering) | MAR, Dodd-Frank, MiFID II | MAR Art. 12(1)(c), Dodd-Frank Section 747, MiFID II RTS 25 |
| **insider_dealing** (Insider Dealing) | MAR, MiFID II, SEC | MAR Art. 14, MAR Art. 16, MiFID II Art. 16(2), SEC Rule 10b-5 |

### 4.1 Coverage by Abuse Type

| Abuse Type | Models | Asset Classes Covered |
|---|---|---|
| Wash trading | wash_full_day, wash_intraday | Equities, FX, fixed income, commodities, index |
| Price manipulation / ramping | market_price_ramping | Equities, FX, fixed income, commodities, index |
| Spoofing / layering | spoofing_layering | Equities, FX, fixed income, commodities, index |
| Insider dealing | insider_dealing | Equities, FX, fixed income, commodities, index |

All 5 models operate across all 5 asset classes using the same detection engine. Asset-class-specific behavior is achieved entirely through match pattern overrides on thresholds and scoring, not through separate model implementations.

### 4.2 Alert Distribution (Current Data)

The platform currently holds 82 alerts across the 5 models:

| Model | Alert Count | Percentage |
|---|---|---|
| market_price_ramping | ~56 | 68% |
| wash_full_day + wash_intraday | ~14 | 17% |
| insider_dealing | ~7 | 9% |
| spoofing_layering | ~5 | 6% |

---

## 5. Compliance Configuration without Code

### 5.1 What Compliance Officers Can Configure

The platform is designed so that compliance professionals can modify surveillance behavior through the configuration UI without engineering involvement:

**Detection thresholds per asset class:**
- Adjust the `large_activity_multiplier` to change what counts as "large" trading activity (e.g., 2.5x for equities, 3.0x for FX).
- Adjust the `wash_vwap_threshold` to tighten or loosen VWAP proximity sensitivity (e.g., 1.2% for NYSE equities vs. 2% global default).
- Adjust the `cancel_count_threshold` to change the minimum cancellation count for spoofing detection (e.g., 3 for equities, 8 for options).
- Adjust the `insider_lookback_days` to change how far back the system looks for pre-event trading (e.g., 20 days for equities, 10 days for options).

**Scoring sensitivity per jurisdiction:**
- Add score step overrides for specific asset classes or venues. For example, lower the scoring brackets for fixed income to catch subtler patterns (e.g., lower `mpr_score_threshold` from 18 to 7 for fixed income).
- Adjust `trend_sensitivity` per market (1.2 SD for fixed income vs. 2.5 SD for equities).

**New match patterns for regulatory changes:**
- When a new regulation requires different thresholds for a specific instrument type or venue, add a new match pattern (e.g., `{"instrument_type": "bond", "exchange_mic": "XLON"}`) with the appropriate override values.
- Match patterns use a priority system: more specific patterns always win over less specific ones. Product-specific overrides (priority 100) take precedence over asset-class-level overrides (priority 1).

**Score thresholds per model:**
- Each detection model has its own configurable score threshold. The threshold determines the minimum accumulated score required to generate an alert. Current defaults: wash trading 10, spoofing 12, MPR 18, insider dealing 10.
- Thresholds can be overridden per asset class. For example, the equity MPR threshold is 16 (vs. 18 default) to account for higher noise, while the fixed income threshold is 7 to catch rarer but more significant patterns.

### 5.2 No Engineering Involvement Required

All of the above changes are made by editing JSON metadata files (or through the platform's Settings Manager UI). The changes take effect on the next detection run. Specifically:

- No code deployments.
- No database schema migrations.
- No regression testing of existing models (the detection engine reads configuration at runtime).
- No downtime or restart required.

### 5.3 All Changes Audited

Every configuration change generates an audit trail record with:

- Who made the change (derived from the active session role).
- When the change was made (ISO 8601 timestamp).
- What was changed (metadata type, item ID, action).
- The previous value and the new value (full before/after comparison).

This means compliance teams have a complete history of every threshold adjustment, every scoring change, and every match pattern addition -- which is itself a regulatory requirement under MiFID II Art. 16(6) and MAR Art. 16.

---

## 6. Regulatory Reporting Support

### 6.1 Alert-to-Submission Pipeline

The platform supports the full lifecycle from initial detection through regulatory submission:

```
Detection Engine      Case Management       Report Generation      Submission
     |                     |                      |                    |
  5 models            Case creation          Template-based         Workflow-
  82 alerts           Alert linking          report generation      managed
  Score traces        Investigation          STOR/SAR fields        submission
  Entity context      Annotations            resolved from          with status
                      SLA tracking           case + alert data      tracking
                      Disposition
```

**Step 1: Alert generation.** The detection engine evaluates candidates against model criteria. Alerts that exceed the score threshold are generated with full traces (entity context, calculation scores, settings resolution).

**Step 2: Case creation.** Alerts are linked to investigation cases (`Case` model in `backend/models/cases.py`). Each case tracks:
- Status: open, investigating, escalated, resolved, closed.
- Priority: critical, high, medium, low.
- Category: market_abuse (default), or other categories as needed.
- Assignee: the analyst responsible for the investigation.
- SLA: due date, SLA hours (default 72), SLA status (on_track, at_risk, breached).
- Annotations: notes, dispositions, escalations, and evidence attachments (each with author, timestamp, type, and content).

**Step 3: Report generation.** The `ReportService` (`backend/services/report_service.py`) generates regulatory reports from templates:
- Templates are stored in `workspace/metadata/report_templates/` as JSON files.
- Each template defines sections and fields, with source paths that reference case and alert data.
- The service resolves fields from case data (e.g., `case.title`, `case.priority`, `case.alert_ids.length`) and alert data using dot-notation traversal.
- Generated reports are persisted as JSON in `workspace/reports/` with unique report IDs (e.g., `RPT-A1B2C3D4`).

**Step 4: Submission workflow.** The submission workflow (`workspace/metadata/workflows/submission.json`) manages the regulatory filing lifecycle with status tracking and deadline management.

### 6.2 STR/SAR Generation

Suspicious Transaction Reports (STR) and Suspicious Activity Reports (SAR) are generated from case data using the report service. The report template system supports:

- **Field resolution from case data**: Case title, description, priority, status, assignee, alert count, and timestamps.
- **Field resolution from alert data**: Detection model, entity context (product, account, trader), calculation scores, and accumulated evidence.
- **Static fields**: Regulation identifier, reporting entity, and template-specific constants.
- **Generated fields**: Report generation timestamp, report ID.

### 6.3 Regulatory Deadline Tracking

The case SLA system supports regulatory deadline management:

- Each case has configurable SLA hours (default: 72 hours).
- SLA status is tracked as on_track, at_risk, or breached.
- Due dates are set at case creation and can be adjusted based on priority or regulatory requirements.
- The compliance dashboard provides trend charts, SLA tracking, and priority distribution views.

---

## 7. Known Gaps and Roadmap Items

Transparency about what the platform does not yet cover is as important for compliance as documenting what it does. The following gaps are tracked in the standards compliance registry (`workspace/metadata/standards/compliance_registry.json`):

### 7.1 Identification Standards

| Gap | Description | Regulatory Driver | Roadmap |
|---|---|---|---|
| ISO 17442 (LEI) | No Legal Entity Identifier field on account or trader entities | MiFID II Art. 26, EMIR Art. 9 | Phase 24+ |
| ISO 18774 (FISN) | No Financial Instrument Short Name field on product entity | ANNA DSB | Phase 24+ |
| ANNA DSB UTI | No Unique Trade Identifier field on executions for derivative reporting | EMIR Art. 9, ANNA DSB | Phase 24+ |

### 7.2 Regulatory Coverage

| Gap | Description | Regulatory Driver | Roadmap |
|---|---|---|---|
| EU SSR | No short sell flag on orders or accounts | EU SSR Art. 5-8 | Phase 25+ |
| MiFID II RTS 6 | No algorithm ID on orders or executions for algorithmic trading requirements | MiFID II RTS 6 Art. 1-8 | Phase 25+ |
| MiFID II Art. 27 | No venue comparison metrics for best execution analysis | MiFID II Art. 27 | Phase 26+ |
| SFTR | Securities financing transactions not in scope | SFTR Art. 4 | Phase 27+ |
| CFTC Rules | No CFTC-specific surveillance requirements | CEA Section 4c | Phase 25+ |
| FCA MAR (UK) | UK MAR not distinguished from EU MAR (post-Brexit divergence) | UK MAR | Phase 25+ |
| APAC Regulators | Product entity has `regulatory_scope=APAC` but no specific APAC regulatory requirements implemented | ASIC MIR, MAS SFA, HKMA guidelines | Phase 26+ |

### 7.3 Partial Implementations

| Item | Current State | Gap | Regulatory Driver |
|---|---|---|---|
| MiFID II RTS 25 clock sync | Timestamps use ISO 8601 format | No clock synchronisation enforcement (1ms HFT / 100ms standard) | MiFID II RTS 25 |
| EMIR Art. 9 reporting | Product entity supports derivative classification | Full swap data repository and trade repository integration not in scope | EMIR Art. 9 |
| ISO 20022 messaging | Field naming partially aligned with ISO 20022 canonical naming | Full message generation not implemented | SWIFT migration |
| ISO 27001 encryption | RBAC and masking enforced | Data encryption at rest not implemented (demo uses unencrypted Parquet) | ISO 27001 |
| BCBS 239 Principle 7 | Calculation DAG ensures computational accuracy | No automated reconciliation with external source systems | BCBS 239 |
| BCBS 239 Principle 10 | Pipeline stages defined with dependency chains | Real-time scheduling engine not implemented; batch execution only | BCBS 239 |

---

## 8. Standards Compliance Summary

The platform's overall compliance posture as assessed in the standards compliance matrix (`workspace/metadata/standards/compliance_matrix.json`):

| Category | Standards | Full | Partial | Gap |
|---|---|---|---|---|
| Identification | ISO 6166, 10383, 10962, 4217, 3166, 8601 | 6 | 0 | 0 |
| Messaging | ISO 20022, FIX Protocol | 0 | 2 | 0 |
| Metadata | ISO 11179 | 1 | 0 | 0 |
| Data Quality | ISO 8000, ISO 25012 | 2 | 0 | 0 |
| Security | ISO 27001 | 0 | 1 | 0 |
| Risk Management | BCBS 239 | 0 | 1 | 0 |
| Data Management | DAMA-DMBOK | 1 | 0 | 0 |
| Ontology | FIBO | 0 | 1 | 0 |
| Regulatory | EU MAR | 1 | 0 | 0 |
| Regulatory | MiFID II | 0 | 1 | 0 |
| Regulatory | Dodd-Frank | 0 | 1 | 0 |
| **Totals** | **18 standards** | **11** | **7** | **0** |

48 total controls: 30 full, 14 partial, 4 gap. Overall compliance score: **77%**.

---

## 9. Cross-References

| Document | Relevance |
|---|---|
| [04-match-pattern-architecture.md](./04-match-pattern-architecture.md) | How the match pattern system works -- the configuration primitive that drives all regulatory-relevant settings |
| [10-scoring-and-alerting-pipeline.md](./10-scoring-and-alerting-pipeline.md) | How alerts are scored and generated -- the detection pipeline compliance depends on |
| [12-settings-resolution-patterns.md](./12-settings-resolution-patterns.md) | How thresholds and overrides are resolved -- the audit trail for "why this value?" |
| [16-lifecycle-and-governance.md](./16-lifecycle-and-governance.md) | Change management and governance -- how configuration changes are tracked and controlled |
| `workspace/metadata/standards/bcbs239_mapping.json` | Full BCBS 239 principle-by-principle mapping with evidence links |
| `workspace/metadata/standards/compliance_matrix.json` | Detailed standards compliance matrix with 48 controls |
| `workspace/metadata/standards/compliance_requirements.json` | 14 granular regulatory requirements mapped to implementations |
| `workspace/metadata/standards/compliance_registry.json` | Consolidated registry of 18 standards with gap analysis |
| `workspace/metadata/standards/fix_protocol.json` | FIX Protocol field mappings (6 tags) |
| `workspace/metadata/standards/iso_mapping.json` | ISO standard field mappings with validation rules |
