# Phase 13: Data Calibration & Alert Distribution Fix — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix alert distribution skew (F-001: 96% MPR alerts, F-010: 0% FX/fixed income/index alerts) so all 5 detection models fire realistic, balanced alerts across all asset classes.

**Architecture:** Modify `scripts/generate_data.py` to add normal trading for FX/fixed income/index, add more embedded detection patterns across asset classes, and add more market events for insider dealing. Raise MPR score threshold to reduce noise alerts. Regenerate all data, snapshots, and verify alert distribution. No backend or frontend code changes needed — this is purely data generation + settings tuning.

**Tech Stack:** Python (scripts/generate_data.py), JSON settings metadata, uv + pytest

---

## Current State (Root Cause Analysis)

### F-001: Alert Distribution Skew
| Model | Current Alerts | Current % | Target Range |
|-------|---------------|-----------|-------------|
| Market Price Ramping | 414 | 96.3% | 15-25% |
| Wash Trading — Full Day | ~2 | 0.5% | 20-30% |
| Wash Trading — Intraday | ~4 | 0.9% | 10-15% |
| Insider Dealing | ~6 | 1.4% | 15-25% |
| Spoofing/Layering | ~4 | 0.9% | 10-20% |
| **TOTAL** | **430** | | **200-350** |

**Root cause**: MPR fires for ANY equity+trend combo (broad gate). Other models only fire for specifically embedded patterns (narrow gate). Normal trading loop only generates equity executions.

### F-010: Asset Class Coverage Gap
| Asset Class | Products | Normal Daily Executions | Embedded Patterns | Alerts |
|------------|----------|------------------------|------------------|--------|
| Equity | 31 | ~8/day × 100 accounts | 12 | 363 |
| Commodity | 10 | 0 (patterns only) | 1 | 67 |
| FX | 6 | 0 | 0 | 0 |
| Index | 2 | ~1/day (too sparse) | 0 | 0 |
| Fixed Income | 1 | 0 | 0 | 0 |

**Root cause**: `_generate_normal_trading()` only loops over `stock_ids` (common_stock + spot), `option_ids`, and `future_ids`. FX pairs (instrument_type=spot, asset_class=fx) are included in stock_ids but the issue is that patterns are missing. Fixed income products exist but have zero normal trading AND zero patterns.

---

## Task 1: Add FX and Fixed Income to Normal Trading Loop

**Files:**
- Modify: `scripts/generate_data.py:877-911` (the `_generate_normal_trading` method)
- Test: Run pipeline and verify execution counts per asset class

**Step 1: Add FX daily trading**

In `scripts/generate_data.py`, inside `_generate_normal_trading()`, after the futures block (line ~911), add a new block for FX pairs:

```python
# ~3 FX executions per day
fx_ids = [pid for pid, info in self.products.items()
          if info["asset_class"] == "fx"]
for _ in range(self.rng.randint(2, 4)):
    pid = self.rng.choice(fx_ids)
    acc = self.rng.choice(active_accounts[:60])
    trader = self.rng.choice(trader_ids[:20])
    self._add_normal_execution(pid, acc, trader, day)
```

**Step 2: Add fixed income daily trading**

After the FX block, add fixed income:

```python
# ~1 fixed income execution per day (low volume realistic for bonds)
fi_ids = [pid for pid, info in self.products.items()
          if info["asset_class"] == "fixed_income"]
if fi_ids and self.rng.random() < 0.6:
    pid = self.rng.choice(fi_ids)
    acc = self.rng.choice(active_accounts[:40])
    trader = self.rng.choice(trader_ids[:10])
    self._add_normal_execution(pid, acc, trader, day)
```

**Step 3: Increase index futures daily volume**

Change the existing futures block probability from 0.7 to generate 2-3 futures trades per day:

```python
# ~2-3 future trades per day (increase from ~1)
for _ in range(self.rng.randint(1, 3)):
    pid = self.rng.choice(future_ids)
    acc = self.rng.choice(active_accounts[:30])
    trader = self.rng.choice(trader_ids[:15])
    self._add_normal_execution(pid, acc, trader, day)
```

**Step 4: Run data generation to verify execution counts**

```bash
uv run python -m scripts.generate_data
```

Expected: execution.csv now has rows for FX pairs and ZB_FUT alongside equities.

**Step 5: Commit**

```bash
git add scripts/generate_data.py
git commit -m "feat(data): add FX, fixed income, and more futures to normal trading loop"
```

---

## Task 2: Add Cross-Asset Embedded Detection Patterns

**Files:**
- Modify: `scripts/generate_data.py:187-264` (pattern constant definitions)
- No test file — verified by running pipeline

**Step 1: Add FX wash trading patterns (2 new)**

After existing WASH_PATTERNS list (line ~200), add 2 FX patterns:

```python
# FX wash patterns
{"account": "ACC-105", "product": "EURUSD", "date": date(2024, 1, 17), "trader": "TRD-028",
 "buys": [(100000, 1.0950, "09:32:15"), (75000, 1.0952, "10:45:30")],
 "sells": [(98000, 1.0951, "12:15:44"), (76000, 1.0949, "14:30:22")]},
{"account": "ACC-106", "product": "USDJPY", "date": date(2024, 2, 6), "trader": "TRD-029",
 "buys": [(150000, 148.50, "09:35:08"), (120000, 148.52, "11:00:33")],
 "sells": [(145000, 148.51, "13:20:17"), (122000, 148.49, "15:10:45")]},
```

**Step 2: Add commodity wash trading pattern (1 new)**

```python
# Commodity wash pattern
{"account": "ACC-107", "product": "CL_FUT", "date": date(2024, 1, 24), "trader": "TRD-030",
 "buys": [(50, 75.20, "09:40:05"), (30, 75.25, "10:50:18")],
 "sells": [(48, 75.22, "12:05:33"), (31, 75.18, "14:40:55")]},
```

**Step 3: Add index futures spoofing patterns (2 new)**

Add to SPOOFING_PATTERNS:

```python
# Index futures spoofing
{"account": "ACC-134", "product": "ES_FUT", "date": date(2024, 1, 16), "trader": "TRD-034",
 "spoof_side": "SELL", "exec_side": "BUY",
 "cancelled_orders": [
     (10, 4800.00, "09:31:02"), (12, 4799.50, "09:31:08"),
     (8, 4799.00, "09:31:14"), (11, 4798.50, "09:31:20"),
 ],
 "filled_order": (5, 4800.50, "09:31:05"),
 "execution": (20, 4795.00, "09:32:00")},
{"account": "ACC-135", "product": "NQ_FUT", "date": date(2024, 2, 14), "trader": "TRD-035",
 "spoof_side": "BUY", "exec_side": "SELL",
 "cancelled_orders": [
     (5, 17200.00, "10:00:03"), (6, 17205.00, "10:00:09"),
     (4, 17210.00, "10:00:15"), (7, 17215.00, "10:00:21"),
 ],
 "filled_order": (3, 17195.00, "10:00:06"),
 "execution": (15, 17230.00, "10:01:00")},
```

**Step 4: Add commodity MPR pattern (1 new)**

Add to MPR_PATTERNS:

```python
# Commodity MPR pattern
{"account": "ACC-114", "product": "GC_FUT", "date": date(2024, 2, 9), "trader": "TRD-030",
 "trend": "up", "trend_start": 2040.0, "trend_end": 2075.0,
 "trades": [("BUY", 5, 2042.00), ("BUY", 8, 2047.00), ("BUY", 6, 2052.00),
            ("BUY", 4, 2057.00), ("BUY", 7, 2062.00), ("BUY", 3, 2067.00),
            ("SELL", 2, 2055.00)]},
```

**Step 5: Add more insider dealing patterns (3 new — FX, commodity, extra equity)**

Add to INSIDER_PATTERNS:

```python
# Additional insider patterns across asset classes
{"account": "ACC-124", "product": "GOOGL", "trader": "TRD-032",
 "event_date": date(2024, 1, 31), "event_type": "surge",
 "pre_price": 142.0, "post_price": 154.0,
 "trade_date": date(2024, 1, 29), "side": "BUY", "qty": 800, "price": 141.50},
{"account": "ACC-125", "product": "TSLA", "trader": "TRD-031",
 "event_date": date(2024, 2, 19), "event_type": "drop",
 "pre_price": 245.0, "post_price": 222.0,
 "trade_date": date(2024, 2, 15), "side": "SELL", "qty": 500, "price": 244.00},
{"account": "ACC-126", "product": "JPM", "trader": "TRD-033",
 "event_date": date(2024, 2, 22), "event_type": "surge",
 "pre_price": 175.0, "post_price": 189.0,
 "trade_date": date(2024, 2, 20), "side": "BUY", "qty": 600, "price": 174.50},
```

**Step 6: Commit**

```bash
git add scripts/generate_data.py
git commit -m "feat(data): add cross-asset detection patterns for FX, commodity, index"
```

---

## Task 3: Raise MPR Score Threshold to Reduce Noise

**Files:**
- Modify: `workspace/metadata/settings/score_thresholds/mpr_score_threshold.json`
- Modify: `workspace/metadata/settings/thresholds/large_activity_multiplier.json`

**Step 1: Raise MPR score threshold**

The MPR equity threshold is currently 10. Raise it to 18 to require stronger signals:

Change `mpr_score_threshold.json`:
```json
{
  "setting_id": "mpr_score_threshold",
  "name": "MPR Score Threshold",
  "description": "Minimum accumulated score required to generate a Market Price Ramping alert.",
  "value_type": "decimal",
  "default": 18,
  "match_type": "hierarchy",
  "overrides": [
    {
      "match": { "asset_class": "equity" },
      "value": 16,
      "priority": 1
    },
    {
      "match": { "asset_class": "commodity" },
      "value": 14,
      "priority": 1,
      "description": "Slightly lower for commodities — fewer data points"
    },
    {
      "match": { "asset_class": "fixed_income" },
      "value": 12,
      "priority": 1,
      "description": "Lower threshold for fixed income — price movements more significant"
    },
    {
      "match": { "asset_class": "index" },
      "value": 14,
      "priority": 1,
      "description": "Moderate threshold for index instruments"
    }
  ]
}
```

**Step 2: Raise equity large_activity_multiplier**

Raise the equity override from 1.5 to 2.5 to make the "large activity" gate harder to pass:

In `large_activity_multiplier.json`, change the equity override:
```json
{
  "match": { "asset_class": "equity" },
  "value": 2.5,
  "priority": 1
}
```

**Step 3: Commit**

```bash
git add workspace/metadata/settings/score_thresholds/mpr_score_threshold.json workspace/metadata/settings/thresholds/large_activity_multiplier.json
git commit -m "feat(settings): raise MPR thresholds to reduce noise alerts"
```

---

## Task 4: Add Intraday Data for Fixed Income

**Files:**
- Modify: `scripts/generate_data.py:704-730` (the `_generate_intraday_data` method)

**Step 1: Add fixed income to intraday generation**

Currently `_generate_intraday_data()` generates ticks for equities, FX, and key futures. Add ZB_FUT (and any other fixed income) to the futures list.

Read the method and verify ZB_FUT is included in the futures list used for intraday generation. If not, add it:

```python
# Key futures and fixed income for intraday data
fi_and_futures_ids = [pid for pid, info in self.products.items()
                      if info["instrument_type"] == "future"
                      or info["asset_class"] == "fixed_income"]
```

**Step 2: Commit**

```bash
git add scripts/generate_data.py
git commit -m "feat(data): add fixed income to intraday market data generation"
```

---

## Task 5: Regenerate Data, Run Pipeline, Verify Distribution

**Files:**
- No code changes — run scripts and verify output

**Step 1: Regenerate all CSV data**

```bash
uv run python -m scripts.generate_data
```

Expected: execution.csv has more rows (~550-600 up from 509), including FX and fixed income executions.

**Step 2: Regenerate snapshots (which runs the pipeline and generates alerts)**

```bash
uv run python -m scripts.generate_snapshots
```

Expected: Pipeline runs, alerts generated with improved distribution.

**Step 3: Verify alert distribution**

Run this verification script:

```bash
uv run python3 -c "
import pyarrow.parquet as pq
import collections

# Read alert summary
try:
    t = pq.read_table('workspace/alerts/alert_summary.parquet')
    df = t.to_pandas()
    print('=== Alert Distribution by Model ===')
    model_counts = df['model_id'].value_counts()
    total = len(df)
    for model, count in model_counts.items():
        print(f'  {model}: {count} ({count/total*100:.1f}%)')
    print(f'  TOTAL: {total}')
    print()
    print('=== Alert Distribution by Asset Class ===')
    if 'asset_class' in df.columns:
        ac_counts = df['asset_class'].value_counts()
        for ac, count in ac_counts.items():
            print(f'  {ac}: {count} ({count/total*100:.1f}%)')
except Exception as e:
    print(f'Error: {e}')
    print('Check workspace/alerts/ directory')
"
```

**Target distribution:**
- No single model > 35% of alerts
- At least 3 asset classes have alerts
- MPR alerts reduced from 414 to 40-80
- Wash trading alerts increased from ~6 to 30-60
- Insider dealing alerts increased from ~6 to 20-40
- Spoofing alerts increased from ~4 to 15-30
- Total alerts: 150-300

**Step 4: If distribution is still skewed, iterate**

If MPR still dominates:
- Further raise `mpr_score_threshold` equity override (try 20)
- Further raise `large_activity_multiplier` equity override (try 3.0)

If a model has 0 alerts:
- Add more embedded patterns for that model
- Lower the model's score threshold slightly

**Step 5: Commit data files**

```bash
git add workspace/data/csv/ workspace/alerts/ workspace/data/parquet/ workspace/results/ workspace/snapshots/
git commit -m "data: regenerate with calibrated alert distribution"
```

---

## Task 6: Run Backend Tests and Verify No Regressions

**Files:**
- Test: `tests/` (506 backend tests)

**Step 1: Run backend tests**

```bash
uv run pytest tests/ --ignore=tests/e2e -v --tb=short
```

Expected: ALL 506 tests pass. If any tests fail due to changed data counts (e.g., hardcoded execution counts in test fixtures), update those tests.

**Step 2: Verify frontend builds**

```bash
cd frontend && npm run build
```

Expected: Clean build, 969+ modules.

**Step 3: If tests fail on data counts, fix them**

Tests that reference specific execution/order counts (e.g., `assert len(executions) == 509`) need updating to the new counts. Search for hardcoded data counts:

```bash
grep -rn "509\|519\|430" tests/ --include="*.py" | grep -i "execution\|order\|alert"
```

Update any matched lines with the new counts from the regenerated data.

**Step 4: Commit any test fixes**

```bash
git add tests/
git commit -m "fix(tests): update data count assertions for calibrated data"
```

---

## Task 7: Update Documentation (Phase D — Tier 1)

**Files:**
- Modify: `docs/progress.md` — add Phase 13 milestone entry
- Modify: `docs/exploratory-testing-notes.md` — update F-001 and F-010 status to FIXED

**Step 1: Add milestone entry to progress.md**

Add after the last milestone in the Milestones section:

```markdown
| M174 | Phase 13: Data Calibration | Data generation calibrated: FX/fixed income/index normal trading, cross-asset detection patterns, MPR threshold tuning — balanced alert distribution across 5 models and 3+ asset classes |
```

**Step 2: Update F-001 and F-010 in exploratory-testing-notes.md**

Change F-001 status from OPEN to FIXED:
```
**Status**: FIXED (Phase 13 — M174)
**Resolution**: Raised MPR score threshold (10→16 for equity), raised large_activity_multiplier (1.5→2.5 for equity), added cross-asset detection patterns. Distribution now balanced across 5 models.
```

Change F-010 status from OPEN to FIXED:
```
**Status**: FIXED (Phase 13 — M174)
**Resolution**: Added FX pairs (3/day) and fixed income (0.6/day) to normal trading loop. Increased index futures volume (2-3/day). Added FX wash, index spoofing, and commodity MPR patterns. All 5 asset classes now generate alerts.
```

**Step 3: Update progress.md Overall Status table**

Add row:
```
| Data Calibration (Phase 13) | COMPLETE | Alert distribution balanced: 5 models, 3+ asset classes, no single model >35% — F-001 and F-010 FIXED |
```

**Step 4: Commit**

```bash
git add docs/progress.md docs/exploratory-testing-notes.md
git commit -m "docs: update progress and exploratory testing for Phase 13 completion"
```

---

## Task 8: Update Remaining Docs (Phase D — Tier 2/3)

**Files:**
- Modify: `.claude/memory/MEMORY.md` — update data counts, mention Phase 13 complete
- Modify: `CLAUDE.md` — update data counts if they changed
- Modify: `docs/plans/2026-02-24-comprehensive-roadmap.md` — mark Phase 13 COMPLETE in priority matrix

**Step 1: Update .claude/memory/MEMORY.md**

- Update execution/order counts if changed
- Add: `Phase 13 Data Calibration complete — balanced alert distribution`
- Update "Open findings" note (F-001, F-010 now FIXED)

**Step 2: Update CLAUDE.md data model counts**

If execution/order/alert counts changed, update the Data Model section.

**Step 3: Update roadmap priority matrix**

Change Phase 13 row from PLANNED to COMPLETE.

**Step 4: Update context-level MEMORY.md**

Update "Next priority" to Phase 14 (Medallion Core).

**Step 5: Run Phase D of Development Workflow Protocol**

Follow `docs/development-workflow-protocol.md` Phase D Tier 3 checklist:
- Full test suite verification
- All memory files updated
- README.md updated if data counts changed
- Commit, push, create PR, squash merge

```bash
git add .claude/memory/MEMORY.md CLAUDE.md docs/plans/2026-02-24-comprehensive-roadmap.md
git commit -m "docs: Phase D documentation sweep for Phase 13 completion"
git push -u origin <branch>
gh pr create --title "feat: Phase 13 data calibration — balanced alert distribution" --body "..."
```

---

## Verification Checklist

After all tasks complete, verify:

- [ ] `uv run pytest tests/ --ignore=tests/e2e -v` — ALL backend tests pass
- [ ] `cd frontend && npm run build` — clean build
- [ ] Alert distribution: no single model > 35%
- [ ] Alert distribution: at least 3 asset classes have alerts
- [ ] F-001 status: FIXED in exploratory-testing-notes.md
- [ ] F-010 status: FIXED in exploratory-testing-notes.md
- [ ] progress.md: M174 entry added, Phase 13 COMPLETE in status table
- [ ] Roadmap: Phase 13 marked COMPLETE
- [ ] MEMORY.md files updated
- [ ] Data counts accurate across all docs
