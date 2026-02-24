# Next Steps — Analytics Platform Demo

## Testing & Verification
1. **Playwright E2E Testing** of Phase 6 changes:
   - Entity Designer: verify all 8 entities visible (product, execution, order, md_intraday, md_eod, venue, account, trader)
   - Entity Designer: verify product shows ISIN, CFI, MIC, underlying, strike, expiry fields
   - Entity Designer: verify venue entity with 6 MIC codes and friendly names
   - Entity Designer: verify account (220 rows) and trader (50 rows) entities
   - SQL Console: `SELECT * FROM product LIMIT 5` — verify 17 fields
   - SQL Console: `SELECT * FROM venue` — verify 6 rows
   - SQL Console: `SELECT * FROM account LIMIT 5` — verify type, country, risk_rating
   - SQL Console: `SELECT * FROM "order" LIMIT 5` — verify order_type, limit_price, time_in_force, trader_id
   - SQL Console: `SELECT * FROM execution LIMIT 5` — verify order_id, venue_mic, exec_type, capacity
   - SQL Console: `SELECT * FROM md_eod LIMIT 5` — verify OHLCV (all 10 columns)
   - SQL Console: `SELECT * FROM md_intraday LIMIT 5` — verify bid/ask/trade_condition
   - Alert Detail: verify OHLC candlestick chart renders (green up/red down candles)
   - Alert Detail: verify entity context shows corrected asset_class/instrument_type
   - Alert Detail: verify RelatedOrders shows execution columns (order_id, venue_mic, exec_type, capacity)
   - Dashboard: verify asset class chart handles 5 classes (equity, fx, commodity, index, fixed_income)

2. **Regression Testing**:
   - Settings Manager, Mapping Studio D&D, Model Composer create & deploy still work
   - Demo checkpoints (Reset/Step/End) still function
   - Tours and tooltips still work
   - AI Assistant still functions (mock mode)

## Potential Future Features
- News Feed entity (mentioned in design doc)
- Quotes entity (deferred from earlier discussion)
- Order versioning model
- Case management workflow
- More detection models
- Enhanced reporting/export capabilities
- Additional dashboard metrics

## Commands Reference
```bash
# Start the app
./start.sh
# Or manually: uv run uvicorn backend.main:app --port 8000

# Run tests
uv run pytest tests/ -v

# Build frontend
cd frontend && npm run build

# Regenerate data (if needed)
uv run python -m scripts.generate_data
uv run python -m scripts.generate_snapshots
```
