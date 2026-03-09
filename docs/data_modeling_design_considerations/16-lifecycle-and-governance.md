# 16 -- Lifecycle and Governance

> Pattern versioning, audit trail, change management, and regulatory compliance controls
> for the metadata-driven configuration system.

**Document**: 16 of the Data Modeling Design Considerations series
**Audience**: Product, Compliance, Operations
**Last updated**: 2026-03-09

---

## Overview

Every match pattern, threshold, score step, detection level, and calculation parameter in the platform is metadata --- configuration that can be changed without code deployments. That power requires governance: controls that ensure changes are reviewed, approved, traceable, and reversible.

This document describes the lifecycle management framework that governs all configuration changes. It covers:

1. **Pattern Versioning** --- immutable version history for every configuration change
2. **Change Management Lifecycle** --- state machine governing how changes move from draft to production
3. **Role-Based Approval Matrix** --- who can create, review, and approve each type of change
4. **Audit Trail** --- complete, immutable record of every change with before/after comparison
5. **Regulatory Hold** --- freeze mechanism for configurations under investigation
6. **Impact Analysis** --- pre-change assessment of downstream effects
7. **Retention Policy** --- how long each data type is retained, mapped to regulatory requirements
8. **Emergency Procedures** --- bypass controls for critical situations with post-hoc review

The fundamental design principle: **every configuration change is a versioned, auditable event**. There are no silent modifications, no untracked overrides, and no configuration states that cannot be reproduced for a regulator.

---

## 1. Pattern Versioning

### 1.1 Immutable Version History

Every change to a match pattern creates a new version. Previous versions are never modified or deleted. This immutable history serves three purposes:

- **Regulatory reproduction**: When a regulator asks "what configuration was active when alert ALT-2024-0042 fired?", the answer is a specific version of a specific pattern, preserved exactly as it was at that moment.
- **Rollback safety**: Reverting a change means activating a previous version, not editing the current one. The problematic version remains in the record for post-incident review.
- **Blame traceability**: Every version records who created it, when, and why. There is no configuration state without an accountable author.

### 1.2 Version Schema

The `match_pattern_versions` table stores the complete history of every pattern:

```sql
CREATE TABLE match_pattern_versions (
  version_id    VARCHAR PRIMARY KEY,   -- globally unique version identifier
  pattern_id    VARCHAR NOT NULL,      -- FK to match_patterns; stable across versions
  version_num   INTEGER NOT NULL,      -- monotonically increasing per pattern_id
  created_at    TIMESTAMP NOT NULL,    -- when this version was created (UTC)
  created_by    VARCHAR NOT NULL,      -- user identity who created the version
  change_reason VARCHAR,               -- mandatory for non-draft states; why this change was made
  status        VARCHAR NOT NULL,      -- lifecycle state (see Section 2)
  snapshot      JSON NOT NULL,         -- complete pattern state at this version
  UNIQUE (pattern_id, version_num)
);
```

**Key design decisions:**

- **`pattern_id` stays the same across versions.** When a user modifies a match pattern, the `pattern_id` is preserved. A new `version_id` is generated and `version_num` increments. All references to the pattern (from `calc_pattern_bindings`, `model_pattern_bindings`, detection results, and alerts) use the `version_id`, not the `pattern_id`, so they point to the exact configuration state that was active at the time.

- **`snapshot` is a complete state capture.** The `snapshot` JSON column contains the full match pattern definition at that version: the parent `match_patterns` record plus all `match_pattern_attributes` rows, all bound settings values, and any associated metadata. This is intentionally denormalized. When a regulator or auditor needs to understand what a pattern looked like at version N, they read one JSON document --- they do not need to reconstruct state by replaying a chain of diffs.

- **`change_reason` is mandatory for all states beyond Draft.** When a version transitions from Draft to Review (or any subsequent state), the system requires a human-readable reason. "Updated VWAP threshold for FX from 0.02 to 0.015 per compliance review CR-2024-117" is a valid reason. "misc changes" is rejected by the UI.

### 1.3 Alert-to-Version Linkage

Every alert and detection result records the `version_id` of the pattern that was active when it was generated:

```sql
-- In the unified results table (document 09):
calc_results.pattern_version_id  -> match_pattern_versions.version_id

-- In alerts:
alerts.pattern_version_id        -> match_pattern_versions.version_id
```

This linkage is write-once. When an alert is generated, the `pattern_version_id` is stamped and never updated. Even if the pattern is subsequently modified, deprecated, or archived, the alert permanently references the version that produced it.

**Query example**: "Show me the exact configuration that produced alert ALT-2024-0042":

```sql
SELECT mpv.snapshot, mpv.version_num, mpv.created_by, mpv.change_reason
FROM alerts a
JOIN match_pattern_versions mpv ON a.pattern_version_id = mpv.version_id
WHERE a.alert_id = 'ALT-2024-0042';
```

### 1.4 Version Comparison

The platform supports side-by-side comparison of any two versions of the same pattern. The comparison computes:

- **Attribute changes**: which match pattern attributes were added, removed, or modified
- **Setting changes**: which bound setting values changed (with before/after values)
- **Score step changes**: which score boundaries shifted
- **Threshold changes**: which pass/fail limits changed

This comparison is both human-readable (displayed in the configuration UI) and machine-readable (JSON diff stored in the audit trail).

---

## 2. Change Management Lifecycle

### 2.1 State Machine

Every match pattern version has a `status` field that tracks its position in the change management lifecycle:

```
Draft --> Review --> Approved --> Active --> Deprecated --> Archived
  |         |                      |
  +---------+                      +--> Regulatory Hold (frozen)
  (revision)
```

### 2.2 State Definitions

**Draft**
- Created by a user, not yet submitted for review.
- Can be freely edited by its creator without generating new versions. Edits within Draft status update the same version record (the only mutable state).
- Not visible to the detection pipeline.
- No approval required to create.

**Review**
- Submitted by the creator for review by an authorized reviewer.
- The creator can no longer edit the version. To make changes, the reviewer returns it to Draft (revision loop).
- The reviewer sees the full impact analysis (Section 6) alongside the proposed changes.
- Time-bounded: if not reviewed within the SLA (configurable, default 48 hours), an escalation notification is sent.

**Approved**
- The reviewer has approved the change, but it has not yet been deployed to production.
- This state exists for organizations that separate approval from deployment (e.g., deploy during a maintenance window).
- An Approved version can be activated immediately or scheduled for future activation.

**Active**
- Currently in use by the detection pipeline.
- Only one version of a given `pattern_id` can be Active at any time. Activating a new version automatically transitions the previously Active version to Deprecated.
- Changes to an Active pattern require creating a new Draft version --- the Active version is never edited in place.

**Deprecated**
- Replaced by a newer Active version.
- Still resolvable by the detection engine (for backward compatibility during transition periods) but flagged in the UI with a visual indicator.
- Retained for the regulatory retention period (see Section 7) before transitioning to Archived.
- Cannot be re-activated directly; must go through the full Draft --> Review --> Approved --> Active cycle again.

**Archived**
- No longer used by the detection pipeline and past its active retention period.
- Retained in cold storage for the regulatory archive retention period.
- Read-only. Cannot be modified, re-activated, or deleted.
- Queryable for audit and regulatory review purposes.

**Regulatory Hold**
- A special state that can be applied to any Active or Deprecated pattern (see Section 5).
- Frozen: cannot be modified, deprecated, or archived while the hold is in effect.
- Applied by a Compliance Officer and linked to a specific case or investigation.
- Released only by the Compliance Officer who placed the hold (or their delegate).

### 2.3 Transition Rules

| From | To | Triggered By | Conditions |
|---|---|---|---|
| (new) | Draft | Any authorized user | None |
| Draft | Review | Creator | Change reason is populated; impact analysis is generated |
| Review | Draft | Reviewer | Reviewer provides revision feedback |
| Review | Approved | Reviewer + Approver | Approval criteria met (see Section 3) |
| Approved | Active | Deployer or scheduler | No conflicting Active version on Regulatory Hold |
| Active | Deprecated | System (automatic) | A newer version of the same `pattern_id` becomes Active |
| Active | Regulatory Hold | Compliance Officer | Hold reason and case reference provided |
| Deprecated | Archived | System (automatic) | Active retention period expired |
| Regulatory Hold | Active | Compliance Officer | Hold explicitly released |

### 2.4 Concurrency Control

Only one version of a given `pattern_id` can be in Draft or Review state at any time. If a user needs to make a new change while a version is already in Review, they must either:

1. Wait for the Review to complete, or
2. Request the reviewer to return the version to Draft, then make their changes

This prevents conflicting concurrent edits and ensures a single, linear version history.

---

## 3. Role-Based Approval Matrix

Different types of configuration changes carry different risk profiles. A new classification pattern that tags FX instruments requires less scrutiny than a threshold change that could suppress alerts. The approval matrix maps change types to the roles authorized to create, review, and approve them.

| Change Type | Creator | Reviewer | Approver |
|---|---|---|---|
| New match pattern (classification) | Any user | Data Engineer | Auto-approved |
| New match pattern (threshold/score) | Any user | Data Engineer | Compliance Officer |
| Threshold value change | Compliance Analyst | Senior Analyst | Compliance Officer |
| New detection model | Quant/Modeler | Data Engineer + Compliance | Model Risk Committee |
| Detection level change | Data Engineer | Quant | Model Risk Committee |
| Score step modification | Compliance Analyst | Senior Analyst | Compliance Officer |
| New calculation | Data Engineer | Senior Engineer | Tech Lead |
| Emergency override | Compliance Officer | --- | Auto-approved (post-audit) |

### 3.1 Reading the Matrix

- **Creator**: the role authorized to initiate the change (transition from nothing to Draft).
- **Reviewer**: the role that evaluates the change during the Review state. The reviewer checks technical correctness, impact analysis results, and alignment with policy.
- **Approver**: the role that gives final authorization to transition from Review to Approved. For some low-risk changes (new classification patterns), approval is automatic. For high-risk changes (new detection models, detection level changes), a committee review is required.

### 3.2 Escalation Path

If the designated Approver is unavailable:

1. The system sends an escalation notification after the configured SLA (default: 48 hours).
2. A delegate of equal or higher authority can approve in their place.
3. For committee-level approvals (Model Risk Committee), a quorum of committee members can approve asynchronously.
4. Emergency overrides bypass the approval chain entirely but trigger mandatory post-hoc review (Section 8).

### 3.3 Separation of Duties

The system enforces separation of duties:

- The Creator of a change cannot also be its Reviewer or Approver.
- The Reviewer cannot also be the Approver (for changes requiring both roles).
- Emergency overrides are the sole exception --- a Compliance Officer can self-approve, but the change is flagged for independent review within 24 hours.

---

## 4. Audit Trail

### 4.1 What Is Recorded

Every configuration change generates an immutable audit record. The platform's existing audit trail infrastructure (see `backend/services/audit_service.py`) stores append-only JSON records in `workspace/metadata/_audit/`. The governance framework extends this with structured fields for configuration changes:

**Who** changed what:
- `user_id`: the authenticated user identity
- `user_role`: the role under which the change was made
- `timestamp`: UTC timestamp of the action (ISO 8601)
- `session_id`: the session in which the change was made (for grouping related actions)

**What** changed:
- `pattern_id`: the match pattern affected
- `version_from`: the previous version number (null for new patterns)
- `version_to`: the new version number
- `diff`: structured JSON diff showing before/after for every modified field
- `snapshot_before`: complete pattern state before the change
- `snapshot_after`: complete pattern state after the change

**Why** it changed:
- `change_reason`: mandatory human-readable explanation
- `approval_reference`: link to the approval record (reviewer, approver, timestamps)
- `related_case_id`: optional link to a risk case or investigation that prompted the change
- `regulatory_reference`: optional link to the regulation or policy driving the change

**Impact** of the change:
- `affected_models`: list of detection model IDs that reference this pattern
- `affected_alerts_estimate`: estimated number of alerts that would change based on historical data (from the impact analysis in Section 6)
- `affected_calculations`: list of calculation IDs bound to this pattern
- `affected_settings`: list of setting IDs whose resolved values changed

### 4.2 Audit Record Structure

```json
{
  "audit_id": "AUD-20240315-143022-001",
  "timestamp": "2024-03-15T14:30:22.847Z",
  "user_id": "jsmith",
  "user_role": "compliance_analyst",
  "action": "pattern_version_created",
  "pattern_id": "wash_vwap_equity",
  "version_from": 3,
  "version_to": 4,
  "change_reason": "Tightened VWAP threshold for equity wash trading from 0.02 to 0.015 per quarterly review QR-2024-Q1",
  "diff": {
    "match_pattern_attributes": [],
    "bound_settings": [
      {
        "setting_id": "wash_vwap_threshold",
        "field": "value",
        "before": 0.02,
        "after": 0.015
      }
    ]
  },
  "affected_models": ["wash_full_day", "wash_window"],
  "affected_alerts_estimate": 14,
  "affected_calculations": ["wash_detection"],
  "approval_reference": {
    "reviewer": "agarcia",
    "reviewer_role": "senior_analyst",
    "reviewed_at": "2024-03-15T10:15:00Z",
    "approver": "mchen",
    "approver_role": "compliance_officer",
    "approved_at": "2024-03-15T14:28:00Z"
  }
}
```

### 4.3 Immutability Guarantee

Audit records are append-only. The existing `AuditService` writes each record as a separate timestamped JSON file in `workspace/metadata/_audit/`. Records are never modified or deleted by the application. The filename encodes the timestamp, metadata type, item ID, and action, making it trivially sortable and filterable at the filesystem level.

For the governance framework, audit records follow the same pattern:

```
workspace/metadata/_audit/
  20240315T143022847000_match_pattern_wash_vwap_equity_version_created.json
  20240315T143025123000_match_pattern_wash_vwap_equity_status_changed.json
  ...
```

### 4.4 Queryable Audit History

The audit trail supports filtered queries for regulatory and operational needs:

- **By pattern**: "Show me all changes to the `wash_vwap_equity` pattern" --- filter by `pattern_id`
- **By time range**: "Show me all configuration changes in Q1 2024" --- filter by `timestamp`
- **By user**: "Show me all changes made by user `jsmith`" --- filter by `user_id`
- **By change type**: "Show me all threshold changes for wash trading in the last 30 days" --- filter by `affected_models` contains `wash_*` AND `diff.bound_settings` is non-empty AND `timestamp` within range
- **By impact**: "Show me all changes that affected more than 10 alerts" --- filter by `affected_alerts_estimate > 10`
- **By approval chain**: "Show me all changes approved by the Model Risk Committee" --- filter by `approval_reference.approver_role`

---

## 5. Regulatory Hold

### 5.1 Purpose

When a regulator or internal compliance team is investigating suspicious activity, the configuration that was active during the period of interest must be preserved exactly as it was. A regulatory hold prevents any modification to the pattern, ensuring the investigation proceeds against the actual configuration that produced the alerts under review.

### 5.2 Hold Mechanics

- **Who can place a hold**: Compliance Officer role only.
- **What can be held**: Any match pattern in Active or Deprecated status.
- **Hold prevents**: modification, deprecation, archival, and deletion of the pattern version.
- **Hold metadata**:
  - `hold_id`: unique identifier for the hold
  - `pattern_id`: the pattern being held
  - `version_id`: the specific version being held
  - `placed_by`: the Compliance Officer who placed the hold
  - `placed_at`: UTC timestamp
  - `hold_reason`: mandatory explanation
  - `case_reference`: link to the case ID or investigation reference (e.g., `CASE-2024-0087`)
  - `released_by`: null until released
  - `released_at`: null until released

### 5.3 Hold Duration

A regulatory hold has no automatic expiration. It remains in effect until explicitly released by the Compliance Officer who placed it (or their authorized delegate). This design reflects the reality that regulatory investigations have unpredictable timelines.

### 5.4 UI Indicator

Patterns under regulatory hold display a locked icon in all configuration views. Hovering over the icon shows:

- The hold reason
- The case reference
- The Compliance Officer who placed the hold
- The date the hold was placed

Attempting to modify a held pattern displays a clear error message: "This pattern is under regulatory hold (CASE-2024-0087). Contact [Compliance Officer name] to request modification."

### 5.5 Hold Audit Trail

Placing and releasing a hold generates audit records following the same structure as configuration changes:

```json
{
  "audit_id": "AUD-20240320-091500-001",
  "timestamp": "2024-03-20T09:15:00Z",
  "user_id": "mchen",
  "user_role": "compliance_officer",
  "action": "regulatory_hold_placed",
  "pattern_id": "wash_vwap_equity",
  "version_id": "VER-wash_vwap_equity-004",
  "hold_reason": "Under review per regulatory inquiry RI-2024-003",
  "case_reference": "CASE-2024-0087"
}
```

---

## 6. Impact Analysis Before Changes

### 6.1 Purpose

Before any configuration change takes effect, the system performs an automated impact analysis. This analysis gives reviewers and approvers concrete data about the consequences of the proposed change, reducing the risk of unintended side effects.

### 6.2 Analysis Steps

The impact analysis runs five checks, presented to the reviewer as a structured report:

**Step 1: Dependency Scan**

Which models, calculations, and settings reference this pattern?

```
Pattern: wash_vwap_equity (version 4 -> proposed version 5)
Referenced by:
  - Detection Models: wash_full_day, wash_window
  - Calculations: wash_detection (via calc_pattern_binding b_001)
  - Settings: wash_vwap_threshold (bound value changing from 0.02 to 0.015)
```

**Step 2: Alert Impact**

How many alerts would change if this configuration had been active historically? The system reruns the detection pipeline against the last N days of data (configurable, default 30 days) with the proposed configuration and compares the results:

```
Alert Impact (last 30 days):
  - Alerts that would have fired (but didn't):  +6 new alerts
  - Alerts that would NOT have fired (but did): -2 suppressed alerts
  - Alerts with changed scores:                  14 alerts with higher scores
  - Net alert volume change:                     +4 alerts (+5.2%)
```

This gives the reviewer a quantitative understanding of the change's effect on alert volume before it reaches production.

**Step 3: Regulatory Impact**

Which regulations does this pattern affect? The platform's regulatory compliance mapping (document 13) links detection models to regulatory requirements:

```
Regulatory Impact:
  - MAR Art. 12(1)(a): wash trading detection (directly affected)
  - MiFID II Art. 16(2): surveillance system adequacy (indirectly affected)
  - FINRA Rule 5210: publication of transactions (monitoring scope)
```

**Step 4: Downstream Cascade**

What other patterns, settings, or configurations would need updating as a consequence of this change?

```
Downstream Cascade:
  - wash_score_threshold: may need adjustment if alert volume increases significantly
  - wash_qty_score_default: score steps unchanged, but effective score distribution shifts
  - Related patterns using wash_vwap_threshold: 3 patterns (equity, fx, commodity)
  Recommendation: Review wash_score_threshold after 2 weeks of production data
```

**Step 5: Rollback Plan**

The system auto-generates a rollback plan: the specific steps to revert the change if it produces unintended consequences in production.

```
Rollback Plan:
  1. Navigate to Pattern: wash_vwap_equity
  2. Select version 4 (previous active version)
  3. Create new version from version 4 snapshot
  4. Submit for expedited review (mark as rollback)
  5. Activate after approval
  Estimated rollback time: < 15 minutes (with pre-approved reviewer)
```

### 6.3 Impact Analysis Storage

The complete impact analysis report is stored as part of the version record (in the `snapshot` JSON) and referenced in the audit trail. This ensures that the reasoning behind an approval decision is preserved alongside the change itself.

---

## 7. Retention Policy

Configuration data is subject to regulatory retention requirements. The retention policy defines how long each data type is maintained in active (hot) and archive (cold) storage, mapped to the specific regulatory basis.

| Data Type | Active Retention | Archive Retention | Regulatory Basis |
|---|---|---|---|
| Match patterns (active) | Indefinite | N/A | Operational |
| Match patterns (deprecated) | 1 year | 7 years | MAR Art. 16, MiFID II Art. 16 |
| Alert traces | 2 years | 7 years | MAR Art. 16(2) |
| Configuration changes (audit trail) | Indefinite | 10 years | BCBS 239 |
| Score histories | 2 years | 7 years | Regulatory retention |
| Calculation results | 1 year (hot) | 7 years (cold) | MiFID II record keeping |

### 7.1 Active Retention

Active retention means the data is in hot storage, queryable through the standard platform APIs, and available for real-time analysis. Active match patterns are retained indefinitely because they are required for ongoing detection. Deprecated patterns remain in active storage for one year after deprecation to support transition periods and backward-compatible resolution.

### 7.2 Archive Retention

Archive retention means the data has been moved to cold storage (e.g., compressed Parquet files in an archive tier). It is not queryable through standard APIs but can be retrieved for regulatory requests, audits, and investigations. The archive retention periods are driven by the most restrictive applicable regulation:

- **MAR Art. 16**: requires retention of surveillance records for at least 5 years, extendable to 7 years.
- **MiFID II Art. 16(2)**: requires retention of records relating to orders and transactions for at least 5 years.
- **BCBS 239**: requires data governance and aggregation capabilities with retention sufficient for risk reporting, interpreted as 7--10 years for configuration data.

### 7.3 Retention Lifecycle

The retention lifecycle integrates with the medallion architecture (document 14):

```
Active (Gold tier)
  |
  | (active retention period expires)
  v
Archive (Cold storage / Archive tier)
  |
  | (archive retention period expires)
  v
Purge (data destroyed with audit record of purge)
```

Even the purge event is audited: a record is generated noting what was purged, when, by what policy, and the regulatory basis for the retention period that was satisfied.

### 7.4 Regulatory Hold Override

A regulatory hold (Section 5) overrides the retention policy. If a pattern is under regulatory hold, it cannot be archived or purged, regardless of the retention schedule. The hold takes precedence until explicitly released.

---

## 8. Emergency Procedures

### 8.1 When Emergency Procedures Apply

Emergency procedures are invoked when a configuration change is urgently needed and the standard approval workflow would introduce unacceptable delay. Scenarios include:

- A threshold is causing a flood of false positive alerts that overwhelm the compliance team.
- A critical detection model is missing alerts due to an incorrect score step configuration.
- A regulatory directive requires an immediate configuration change (e.g., a new sanctions list entry).
- A production incident requires disabling a misconfigured pattern.

### 8.2 Emergency Override Process

1. **Initiation**: A Compliance Officer creates a new version with the `emergency` flag set. This bypasses the Review and Approved states, transitioning directly from Draft to Active.

2. **Immediate effect**: The new version becomes Active immediately. The previously Active version transitions to Deprecated as usual.

3. **Auto-notification**: All stakeholders in the approval matrix for that change type receive an immediate notification:
   - The change that was made (full diff)
   - Who made it and when
   - The emergency justification
   - The case or incident reference

4. **Post-hoc audit**: The emergency change must be reviewed by the standard approval chain within 24 hours. The review either:
   - **Ratifies** the change (the version status is annotated as "emergency, ratified")
   - **Reverts** the change (a new version is created from the previous Active version and activated through the standard workflow)

### 8.3 Emergency Audit Record

Emergency changes generate an enhanced audit record that includes:

```json
{
  "audit_id": "AUD-20240322-023015-001",
  "timestamp": "2024-03-22T02:30:15Z",
  "user_id": "mchen",
  "user_role": "compliance_officer",
  "action": "emergency_override",
  "pattern_id": "mpr_equity_threshold",
  "version_from": 7,
  "version_to": 8,
  "change_reason": "Emergency: MPR model generating 200+ false positives per hour due to incorrect trend_sensitivity after market volatility spike. Adjusting from 2.5 to 3.5 pending full review.",
  "emergency": true,
  "emergency_justification": "Alert flood impacting compliance team ability to process legitimate alerts. Incident INC-2024-0015.",
  "post_hoc_review_deadline": "2024-03-23T02:30:15Z",
  "post_hoc_review_status": "pending"
}
```

### 8.4 Rollback Capability

Every Active version supports one-click rollback to the previous version. The rollback:

1. Creates a new version whose `snapshot` is copied from the target rollback version.
2. Sets `change_reason` to "Rollback from version N to version N-1: [reason]".
3. Follows the emergency override process if immediate activation is needed, or the standard approval workflow otherwise.

The rollback is itself a versioned, audited event --- not a destructive undo. The problematic version remains in the history for post-incident analysis.

---

## Design Principles Summary

The lifecycle and governance framework is built on five non-negotiable principles:

1. **Immutability**: Configuration states are versioned, not overwritten. Every state that ever existed can be reproduced.

2. **Traceability**: Every change links to a who, what, when, why, and impact assessment. The chain from alert to configuration to approval to justification is unbroken.

3. **Separation of duties**: The person who creates a change is not the person who approves it. Emergency overrides are the sole exception, with mandatory post-hoc review.

4. **Regulatory alignment**: Retention periods, hold mechanisms, and audit granularity are designed to satisfy MAR, MiFID II, BCBS 239, Dodd-Frank, FINRA, and SEC requirements.

5. **Operational pragmatism**: The framework includes emergency procedures, auto-generated rollback plans, and quantitative impact analysis. Governance exists to enable confident change, not to prevent it.

---

## Cross-References

| Document | Relationship to This Document |
|---|---|
| 04 Match Pattern Architecture | The patterns governed by this lifecycle framework |
| 05 Calculation Instance Model | Calculation instances reference pattern versions |
| 08 Resolution Priority Rules | Resolution uses the Active version of each pattern |
| 09 Unified Results Schema | Results table records the `pattern_version_id` that produced each result |
| 10 Scoring and Alerting Pipeline | Alerts reference the pattern version active at firing time |
| 13 Regulatory Compliance Mapping | Regulatory requirements that drive retention periods and approval matrices |
| 14 Medallion Integration | Retention tiers map to medallion architecture layers |
| 15 UX Configuration Experience | UI flows for the Draft -> Review -> Approved -> Active workflow |
| 17 Performance and Efficiency | Caching and materialization strategies for versioned patterns |
| Appendix A | Full DDL for `match_pattern_versions` and related governance tables |
| Appendix B | Worked examples including version transitions and emergency overrides |
