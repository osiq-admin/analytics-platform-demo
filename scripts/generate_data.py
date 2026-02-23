"""Synthetic trade data generator with embedded detection patterns.

Generates CSV data files for the analytics platform demo:
- execution.csv: Trade executions (stocks, options, futures, fx, commodities)
- order.csv: Order records including cancellations for spoofing detection
- md_intraday.csv: Intraday market data for trend detection
- md_eod.csv: End-of-day market data for market event detection

Also generates entity JSON definitions in workspace/metadata/entities/.

Usage:
    python -m scripts.generate_data [--workspace workspace/] [--seed 42]
"""
from __future__ import annotations

import argparse
import csv
import json
import math
import random
from datetime import date, datetime, time, timedelta
from pathlib import Path

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
SEED = 42
DATE_START = date(2024, 1, 2)
DATE_END = date(2024, 2, 29)

# ---------------------------------------------------------------------------
# Product definitions (50 products across 5 instrument types)
# ---------------------------------------------------------------------------
EQUITIES = [
    {"id": "AAPL", "name": "Apple Inc.", "price": 185.0, "vol": 50_000_000},
    {"id": "MSFT", "name": "Microsoft Corp.", "price": 380.0, "vol": 25_000_000},
    {"id": "GOOGL", "name": "Alphabet Inc.", "price": 142.0, "vol": 30_000_000},
    {"id": "AMZN", "name": "Amazon.com Inc.", "price": 175.0, "vol": 40_000_000},
    {"id": "META", "name": "Meta Platforms", "price": 360.0, "vol": 20_000_000},
    {"id": "TSLA", "name": "Tesla Inc.", "price": 245.0, "vol": 35_000_000},
    {"id": "NVDA", "name": "NVIDIA Corp.", "price": 620.0, "vol": 28_000_000},
    {"id": "JPM", "name": "JPMorgan Chase", "price": 175.0, "vol": 12_000_000},
    {"id": "BAC", "name": "Bank of America", "price": 34.0, "vol": 30_000_000},
    {"id": "GS", "name": "Goldman Sachs", "price": 380.0, "vol": 3_000_000},
    {"id": "MS", "name": "Morgan Stanley", "price": 90.0, "vol": 8_000_000},
    {"id": "WFC", "name": "Wells Fargo", "price": 50.0, "vol": 15_000_000},
    {"id": "JNJ", "name": "Johnson & Johnson", "price": 160.0, "vol": 7_000_000},
    {"id": "PFE", "name": "Pfizer Inc.", "price": 28.0, "vol": 25_000_000},
    {"id": "MRK", "name": "Merck & Co.", "price": 120.0, "vol": 9_000_000},
    {"id": "UNH", "name": "UnitedHealth Group", "price": 530.0, "vol": 4_000_000},
    {"id": "XOM", "name": "Exxon Mobil", "price": 100.0, "vol": 18_000_000},
    {"id": "CVX", "name": "Chevron Corp.", "price": 150.0, "vol": 8_000_000},
    {"id": "COP", "name": "ConocoPhillips", "price": 115.0, "vol": 6_000_000},
    {"id": "V", "name": "Visa Inc.", "price": 270.0, "vol": 7_000_000},
    {"id": "MA", "name": "Mastercard Inc.", "price": 430.0, "vol": 4_000_000},
    {"id": "HD", "name": "Home Depot", "price": 350.0, "vol": 5_000_000},
    {"id": "NKE", "name": "Nike Inc.", "price": 105.0, "vol": 8_000_000},
    {"id": "COST", "name": "Costco Wholesale", "price": 670.0, "vol": 3_000_000},
    {"id": "DIS", "name": "Walt Disney", "price": 95.0, "vol": 10_000_000},
]

FX_PAIRS = [
    {"id": "EURUSD", "name": "EUR/USD", "price": 1.0850, "vol": 1_000_000},
    {"id": "GBPUSD", "name": "GBP/USD", "price": 1.2700, "vol": 800_000},
    {"id": "USDJPY", "name": "USD/JPY", "price": 148.50, "vol": 900_000},
    {"id": "USDCHF", "name": "USD/CHF", "price": 0.8700, "vol": 500_000},
    {"id": "AUDUSD", "name": "AUD/USD", "price": 0.6600, "vol": 600_000},
    {"id": "USDCAD", "name": "USD/CAD", "price": 1.3450, "vol": 700_000},
]

COMMODITIES = [
    {"id": "GOLD", "name": "Gold", "price": 2050.0, "vol": 200_000},
    {"id": "SILVER", "name": "Silver", "price": 23.50, "vol": 100_000},
    {"id": "CRUDE_OIL", "name": "Crude Oil WTI", "price": 73.0, "vol": 300_000},
    {"id": "NAT_GAS", "name": "Natural Gas", "price": 2.50, "vol": 150_000},
    {"id": "COPPER", "name": "Copper", "price": 3.85, "vol": 80_000},
    {"id": "WHEAT", "name": "Wheat", "price": 6.10, "vol": 60_000},
    {"id": "CORN", "name": "Corn", "price": 4.50, "vol": 70_000},
    {"id": "SOYBEANS", "name": "Soybeans", "price": 12.80, "vol": 50_000},
]

OPTIONS = [
    {"id": "AAPL_C150", "name": "AAPL Call 150", "option_type": "call", "price": 35.0, "cs": 100},
    {"id": "AAPL_P140", "name": "AAPL Put 140", "option_type": "put", "price": 5.0, "cs": 100},
    {"id": "TSLA_C250", "name": "TSLA Call 250", "option_type": "call", "price": 15.0, "cs": 100},
    {"id": "TSLA_P200", "name": "TSLA Put 200", "option_type": "put", "price": 8.0, "cs": 100},
    {"id": "NVDA_C500", "name": "NVDA Call 500", "option_type": "call", "price": 130.0, "cs": 100},
    {"id": "AMZN_C180", "name": "AMZN Call 180", "option_type": "call", "price": 10.0, "cs": 100},
]

FUTURES = [
    {"id": "ES_FUT", "name": "S&P 500 E-mini", "price": 4800.0, "cs": 50},
    {"id": "NQ_FUT", "name": "Nasdaq 100 E-mini", "price": 16800.0, "cs": 20},
    {"id": "CL_FUT", "name": "Crude Oil Future", "price": 73.0, "cs": 1000},
    {"id": "GC_FUT", "name": "Gold Future", "price": 2050.0, "cs": 100},
    {"id": "ZB_FUT", "name": "30Y Treasury Bond", "price": 120.0, "cs": 1000},
]

# Trader names
FIRST_NAMES = [
    "James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael",
    "Linda", "David", "Elizabeth", "William", "Barbara", "Richard", "Susan",
    "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen", "Christopher",
    "Lisa", "Daniel", "Nancy", "Matthew", "Betty", "Anthony", "Margaret",
    "Mark", "Sandra", "Donald", "Ashley", "Steven", "Dorothy", "Paul",
    "Kimberly", "Andrew", "Emily", "Joshua", "Donna", "Kenneth", "Michelle",
    "Kevin", "Carol", "Brian", "Amanda", "George", "Melissa", "Timothy",
    "Deborah",
]
LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller",
    "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez",
    "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
    "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark",
    "Ramirez", "Lewis", "Robinson", "Walker", "Young", "Allen", "King",
    "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores", "Green",
    "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell",
    "Carter", "Roberts",
]


# ---------------------------------------------------------------------------
# Embedded pattern specifications
# ---------------------------------------------------------------------------

# Wash Trading patterns (4): offsetting buy/sell same product/account/day
WASH_PATTERNS = [
    {"account": "ACC-101", "product": "AAPL", "date": date(2024, 1, 15), "trader": "TRD-026",
     "buys": [(500, 185.00, "09:35:12"), (300, 185.05, "10:15:44")],
     "sells": [(480, 185.02, "11:30:22"), (310, 184.98, "14:00:55")]},
    {"account": "ACC-102", "product": "MSFT", "date": date(2024, 1, 22), "trader": "TRD-026",
     "buys": [(200, 380.50, "09:45:33"), (150, 380.60, "10:30:11")],
     "sells": [(190, 380.45, "13:15:08"), (155, 380.55, "15:00:42")]},
    {"account": "ACC-103", "product": "TSLA", "date": date(2024, 1, 29), "trader": "TRD-027",
     "buys": [(400, 245.00, "09:40:18"), (200, 245.10, "11:00:05")],
     "sells": [(380, 245.05, "12:30:33"), (210, 244.95, "14:45:17")]},
    {"account": "ACC-104", "product": "NVDA", "date": date(2024, 2, 5), "trader": "TRD-027",
     "buys": [(100, 620.00, "10:00:22"), (80, 620.30, "11:15:44")],
     "sells": [(95, 620.10, "13:00:11"), (82, 619.90, "15:30:55")]},
]

# MPR patterns (3): aggressive same-direction trading during price trend
MPR_PATTERNS = [
    {"account": "ACC-111", "product": "GOOGL", "date": date(2024, 1, 18), "trader": "TRD-028",
     "trend": "up", "trend_start": 140.0, "trend_end": 148.0,
     "trades": [("BUY", 80, 141.50), ("BUY", 75, 142.20), ("BUY", 85, 143.00),
                ("BUY", 70, 143.80), ("BUY", 90, 144.50), ("BUY", 65, 145.30),
                ("BUY", 80, 146.00), ("BUY", 55, 147.10), ("SELL", 30, 145.00)]},
    {"account": "ACC-112", "product": "META", "date": date(2024, 2, 1), "trader": "TRD-029",
     "trend": "down", "trend_start": 365.0, "trend_end": 348.0,
     "trades": [("SELL", 60, 363.00), ("SELL", 55, 361.50), ("SELL", 70, 359.00),
                ("SELL", 50, 357.00), ("SELL", 65, 355.50), ("SELL", 45, 353.00),
                ("SELL", 55, 351.00), ("BUY", 20, 358.00)]},
    {"account": "ACC-113", "product": "NVDA", "date": date(2024, 2, 12), "trader": "TRD-029",
     "trend": "up", "trend_start": 615.0, "trend_end": 640.0,
     "trades": [("BUY", 30, 617.00), ("BUY", 25, 620.00), ("BUY", 35, 623.00),
                ("BUY", 28, 626.50), ("BUY", 32, 630.00), ("BUY", 20, 633.00),
                ("BUY", 25, 636.00), ("SELL", 10, 625.00)]},
]

# Insider dealing patterns (3): trading before a significant market event
INSIDER_PATTERNS = [
    {"account": "ACC-121", "product": "AMZN", "trader": "TRD-031",
     "event_date": date(2024, 1, 25), "event_type": "surge",
     "pre_price": 175.0, "post_price": 188.0,  # +7.4%
     "trade_date": date(2024, 1, 22), "side": "BUY", "qty": 600, "price": 174.50},
    {"account": "ACC-122", "product": "PFE", "trader": "TRD-031",
     "event_date": date(2024, 2, 8), "event_type": "surge",
     "pre_price": 28.0, "post_price": 30.0,  # +7.1%
     "trade_date": date(2024, 2, 5), "side": "BUY", "qty": 4000, "price": 27.80},
    {"account": "ACC-123", "product": "XOM", "trader": "TRD-032",
     "event_date": date(2024, 2, 15), "event_type": "drop",
     "pre_price": 102.0, "post_price": 93.0,  # -8.8%
     "trade_date": date(2024, 2, 13), "side": "SELL", "qty": 1000, "price": 101.50},
]

# Spoofing patterns (3): order cancellations + opposite-side executions
SPOOFING_PATTERNS = [
    {"account": "ACC-131", "product": "JPM", "date": date(2024, 1, 10), "trader": "TRD-033",
     "spoof_side": "BUY", "exec_side": "SELL",
     "cancelled_orders": [
         (500, 174.50, "09:30:05"), (450, 174.55, "09:30:12"),
         (480, 174.60, "09:30:18"), (520, 174.65, "09:30:25"),
     ],
     "filled_order": (200, 174.80, "09:30:08"),
     "execution": (800, 175.20, "09:31:00")},
    {"account": "ACC-132", "product": "BAC", "date": date(2024, 1, 30), "trader": "TRD-033",
     "spoof_side": "SELL", "exec_side": "BUY",
     "cancelled_orders": [
         (3000, 34.20, "10:15:02"), (2800, 34.18, "10:15:08"),
         (3200, 34.15, "10:15:14"), (2900, 34.12, "10:15:20"),
         (3100, 34.10, "10:15:26"),
     ],
     "filled_order": (1000, 34.05, "10:15:05"),
     "execution": (5000, 33.80, "10:16:00")},
    {"account": "ACC-133", "product": "GS", "date": date(2024, 2, 7), "trader": "TRD-034",
     "spoof_side": "BUY", "exec_side": "SELL",
     "cancelled_orders": [
         (100, 379.00, "14:00:03"), (110, 379.10, "14:00:09"),
         (105, 379.20, "14:00:15"), (95, 379.30, "14:00:21"),
     ],
     "filled_order": (50, 378.80, "14:00:06"),
     "execution": (300, 380.00, "14:01:00")},
]


# ---------------------------------------------------------------------------
# Generator class
# ---------------------------------------------------------------------------

class SyntheticDataGenerator:
    """Generates synthetic trade data with embedded detection patterns."""

    def __init__(self, workspace_dir: Path, seed: int = SEED):
        self.workspace = workspace_dir
        self.csv_dir = workspace_dir / "data" / "csv"
        self.entities_dir = workspace_dir / "metadata" / "entities"
        self.rng = random.Random(seed)

        self.trading_days = _get_trading_days(DATE_START, DATE_END)
        self.products = self._build_product_catalog()
        self.accounts = self._build_accounts()
        self.traders = self._build_traders()

        # Price tracks (product_id → {date → close_price})
        self.eod_prices: dict[str, dict[date, float]] = {}

        # Data accumulators
        self.executions: list[dict] = []
        self.orders: list[dict] = []
        self.md_intraday: list[dict] = []
        self.md_eod: list[dict] = []

        # Counters for unique IDs
        self._exec_seq = 0
        self._order_seq = 0

    # -----------------------------------------------------------------------
    # Public API
    # -----------------------------------------------------------------------

    def generate_all(self) -> dict[str, int]:
        """Generate all data. Returns row counts per CSV."""
        self.csv_dir.mkdir(parents=True, exist_ok=True)
        self.entities_dir.mkdir(parents=True, exist_ok=True)

        self._generate_eod_data()
        self._generate_intraday_data()
        self._generate_normal_trading()
        self._embed_wash_patterns()
        self._embed_mpr_patterns()
        self._embed_insider_patterns()
        self._embed_spoofing_patterns()

        # Sort data for deterministic output
        self.executions.sort(key=lambda r: (r["execution_date"], r["execution_time"]))
        self.orders.sort(key=lambda r: (r["order_date"], r["order_time"]))
        self.md_intraday.sort(key=lambda r: (r["trade_date"], r["product_id"], r["trade_time"]))
        self.md_eod.sort(key=lambda r: (r["trade_date"], r["product_id"]))

        counts = self._write_csvs()
        self._write_entity_definitions()
        return counts

    # -----------------------------------------------------------------------
    # Product catalog
    # -----------------------------------------------------------------------

    def _build_product_catalog(self) -> dict[str, dict]:
        catalog: dict[str, dict] = {}
        for e in EQUITIES:
            catalog[e["id"]] = {
                "asset_class": "equity", "instrument_type": "stock",
                "base_price": e["price"], "avg_volume": e["vol"],
                "name": e["name"],
            }
        for f in FX_PAIRS:
            catalog[f["id"]] = {
                "asset_class": "fx", "instrument_type": "stock",
                "base_price": f["price"], "avg_volume": f["vol"],
                "name": f["name"],
            }
        for c in COMMODITIES:
            catalog[c["id"]] = {
                "asset_class": "commodity", "instrument_type": "stock",
                "base_price": c["price"], "avg_volume": c["vol"],
                "name": c["name"],
            }
        for o in OPTIONS:
            catalog[o["id"]] = {
                "asset_class": "equity", "instrument_type": "option",
                "option_type": o["option_type"], "contract_size": o["cs"],
                "base_price": o["price"], "name": o["name"],
            }
        for fu in FUTURES:
            catalog[fu["id"]] = {
                "asset_class": "equity", "instrument_type": "future",
                "contract_size": fu["cs"], "base_price": fu["price"],
                "name": fu["name"],
            }
        return catalog

    # -----------------------------------------------------------------------
    # Accounts & Traders
    # -----------------------------------------------------------------------

    def _build_accounts(self) -> dict[str, dict]:
        types = ["institutional", "retail", "hedge_fund", "market_maker"]
        weights = [44, 33, 22, 11]
        pool = []
        for t, w in zip(types, weights):
            pool.extend([t] * w)

        accounts: dict[str, dict] = {}
        for i in range(220):
            aid = f"ACC-{i + 1:03d}"
            accounts[aid] = {
                "type": pool[i % len(pool)],
                "name": f"Account {i + 1}",
            }
        return accounts

    def _build_traders(self) -> dict[str, dict]:
        traders: dict[str, dict] = {}
        account_ids = list(self.accounts.keys())
        for i in range(50):
            tid = f"TRD-{i + 1:03d}"
            # Each trader manages 4-5 accounts
            start = i * 4
            managed = account_ids[start:start + 4]
            if not managed:
                managed = [self.rng.choice(account_ids)]
            traders[tid] = {
                "name": f"{FIRST_NAMES[i]} {LAST_NAMES[i]}",
                "accounts": managed,
            }
        return traders

    # -----------------------------------------------------------------------
    # Unique ID generators
    # -----------------------------------------------------------------------

    def _next_exec_id(self) -> str:
        self._exec_seq += 1
        return f"EXE-{self._exec_seq:06d}"

    def _next_order_id(self) -> str:
        self._order_seq += 1
        return f"ORD-{self._order_seq:06d}"

    # -----------------------------------------------------------------------
    # EOD market data
    # -----------------------------------------------------------------------

    def _generate_eod_data(self) -> None:
        """Generate daily close prices and volumes for all products."""
        for pid, info in self.products.items():
            base = info["base_price"]
            vol_base = info.get("avg_volume", 100_000)
            price = base
            prices: dict[date, float] = {}

            for day in self.trading_days:
                # Random walk with slight upward drift
                change = self.rng.gauss(0.0003, 0.015)
                price = price * (1 + change)
                price = round(price, 4)
                prices[day] = price

                vol = int(vol_base * self.rng.uniform(0.6, 1.5))
                self.md_eod.append({
                    "product_id": pid,
                    "trade_date": day.isoformat(),
                    "close_price": price,
                    "volume": vol,
                })

            self.eod_prices[pid] = prices

        # Embed market events for insider dealing patterns
        for pat in INSIDER_PATTERNS:
            self._embed_market_event(pat)

    def _embed_market_event(self, pat: dict) -> None:
        """Override EOD prices to create a significant market event."""
        pid = pat["product"]
        evt_date = pat["event_date"]
        pre_price = pat["pre_price"]
        post_price = pat["post_price"]

        # Find the event date and the day before in trading days
        evt_idx = None
        for i, d in enumerate(self.trading_days):
            if d == evt_date:
                evt_idx = i
                break
        if evt_idx is None or evt_idx < 1:
            return

        prev_date = self.trading_days[evt_idx - 1]

        # Override prices in EOD data
        for row in self.md_eod:
            if row["product_id"] == pid and row["trade_date"] == prev_date.isoformat():
                row["close_price"] = pre_price
            elif row["product_id"] == pid and row["trade_date"] == evt_date.isoformat():
                row["close_price"] = post_price
                # Also spike volume
                row["volume"] = int(row["volume"] * 4)

        # Update price tracks
        self.eod_prices[pid][prev_date] = pre_price
        self.eod_prices[pid][evt_date] = post_price

    # -----------------------------------------------------------------------
    # Intraday market data
    # -----------------------------------------------------------------------

    def _generate_intraday_data(self) -> None:
        """Generate intraday trades for equity products."""
        equity_ids = [pid for pid, info in self.products.items()
                      if info["instrument_type"] == "stock" and info["asset_class"] == "equity"]

        for pid in equity_ids:
            for day in self.trading_days:
                close = self.eod_prices.get(pid, {}).get(day)
                if close is None:
                    continue
                self._generate_intraday_day(pid, day, close)

        # Embed trend days for MPR patterns
        for pat in MPR_PATTERNS:
            self._embed_trend_day(pat)

    def _generate_intraday_day(self, pid: str, day: date, close: float) -> None:
        """Generate ~25 intraday trades for a normal day."""
        # Simulate open near previous close with normal variation
        open_price = close * self.rng.uniform(0.995, 1.005)
        n_trades = self.rng.randint(20, 30)
        base_vol = self.products[pid].get("avg_volume", 100_000)

        for i in range(n_trades):
            # Time between 09:30 and 16:00
            minutes = 390  # trading minutes
            offset = int(minutes * i / n_trades) + self.rng.randint(0, max(1, minutes // n_trades - 1))
            hour = 9 + (30 + offset) // 60
            minute = (30 + offset) % 60
            second = self.rng.randint(0, 59)
            trade_time = f"{hour:02d}:{minute:02d}:{second:02d}"

            # Price interpolates from open toward close with noise
            frac = i / max(n_trades - 1, 1)
            price = open_price + (close - open_price) * frac
            noise = price * self.rng.gauss(0, 0.003)
            price = round(price + noise, 4)

            qty = int(base_vol / n_trades * self.rng.uniform(0.3, 2.0) / 1000)
            qty = max(qty, 100)

            self.md_intraday.append({
                "product_id": pid,
                "trade_date": day.isoformat(),
                "trade_time": trade_time,
                "trade_price": price,
                "trade_quantity": qty,
            })

    def _embed_trend_day(self, pat: dict) -> None:
        """Override intraday data to create a clear price trend."""
        pid = pat["product"]
        day = pat["date"]
        start_p = pat["trend_start"]
        end_p = pat["trend_end"]

        # Remove existing intraday data for this product+date
        self.md_intraday = [
            r for r in self.md_intraday
            if not (r["product_id"] == pid and r["trade_date"] == day.isoformat())
        ]

        # Generate 30 trades showing clear trend
        n_trades = 30
        for i in range(n_trades):
            frac = i / (n_trades - 1)
            # Monotonic trend with small noise (noise small relative to trend)
            base_price = start_p + (end_p - start_p) * frac
            noise = abs(end_p - start_p) * self.rng.gauss(0, 0.02)
            price = round(base_price + noise, 4)

            offset = int(390 * i / n_trades)
            hour = 9 + (30 + offset) // 60
            minute = (30 + offset) % 60
            second = self.rng.randint(0, 59)

            self.md_intraday.append({
                "product_id": pid,
                "trade_date": day.isoformat(),
                "trade_time": f"{hour:02d}:{minute:02d}:{second:02d}",
                "trade_price": price,
                "trade_quantity": self.rng.randint(500, 5000),
            })

        # Also update EOD close to match trend end
        for row in self.md_eod:
            if row["product_id"] == pid and row["trade_date"] == day.isoformat():
                row["close_price"] = end_p
                break

    # -----------------------------------------------------------------------
    # Normal trading (background noise)
    # -----------------------------------------------------------------------

    def _generate_normal_trading(self) -> None:
        """Generate normal trading activity across accounts and products."""
        # Select tradeable products (stocks, fx, commodities — not options/futures for simplicity)
        stock_ids = [pid for pid, info in self.products.items()
                     if info["instrument_type"] == "stock"]
        option_ids = [pid for pid, info in self.products.items()
                      if info["instrument_type"] == "option"]
        future_ids = [pid for pid, info in self.products.items()
                      if info["instrument_type"] == "future"]

        # Active accounts for normal trading (first 100 accounts)
        active_accounts = list(self.accounts.keys())[:100]
        trader_ids = list(self.traders.keys())

        for day in self.trading_days:
            # ~8 stock executions per day across various accounts
            for _ in range(self.rng.randint(6, 10)):
                pid = self.rng.choice(stock_ids)
                acc = self.rng.choice(active_accounts)
                trader = self.rng.choice(trader_ids)
                self._add_normal_execution(pid, acc, trader, day)

            # ~2 option trades per day
            for _ in range(self.rng.randint(1, 3)):
                pid = self.rng.choice(option_ids)
                acc = self.rng.choice(active_accounts[:50])
                trader = self.rng.choice(trader_ids[:25])
                self._add_normal_execution(pid, acc, trader, day)

            # ~1 future trade per day
            if self.rng.random() < 0.7:
                pid = self.rng.choice(future_ids)
                acc = self.rng.choice(active_accounts[:30])
                trader = self.rng.choice(trader_ids[:15])
                self._add_normal_execution(pid, acc, trader, day)

    def _add_normal_execution(self, pid: str, acc: str, trader: str, day: date) -> None:
        info = self.products[pid]
        side = self.rng.choice(["BUY", "SELL"])

        # Get approximate price from EOD or base
        eod = self.eod_prices.get(pid, {}).get(day)
        price = eod if eod else info["base_price"]
        # Add small spread
        price = price * self.rng.uniform(0.998, 1.002)
        price = round(price, 4)

        # Quantity varies by instrument
        if info["instrument_type"] == "stock":
            qty = self.rng.choice([50, 100, 150, 200, 300, 500])
        elif info["instrument_type"] == "option":
            qty = self.rng.choice([5, 10, 20, 50])
        else:  # future
            qty = self.rng.choice([1, 2, 5, 10])

        # Random time during market hours
        hour = self.rng.randint(9, 15)
        minute = self.rng.randint(0, 59)
        second = self.rng.randint(0, 59)
        exec_time = f"{hour:02d}:{minute:02d}:{second:02d}"

        exec_row = {
            "execution_id": self._next_exec_id(),
            "product_id": pid,
            "account_id": acc,
            "trader_id": trader,
            "side": side,
            "price": price,
            "quantity": qty,
            "instrument_type": info["instrument_type"],
            "asset_class": info["asset_class"],
            "execution_date": day.isoformat(),
            "execution_time": exec_time,
            "contract_size": info.get("contract_size", ""),
            "option_type": info.get("option_type", ""),
        }
        self.executions.append(exec_row)

        # Also create a corresponding FILLED order
        order_time = exec_time  # simplification: order time = exec time
        self.orders.append({
            "order_id": self._next_order_id(),
            "product_id": pid,
            "account_id": acc,
            "side": side,
            "order_time": order_time,
            "status": "FILLED",
            "quantity": qty,
            "order_date": day.isoformat(),
        })

    # -----------------------------------------------------------------------
    # Pattern embedding: Wash Trading
    # -----------------------------------------------------------------------

    def _embed_wash_patterns(self) -> None:
        """Embed wash trading patterns: offsetting buy/sell at similar prices."""
        for pat in WASH_PATTERNS:
            pid = pat["product"]
            acc = pat["account"]
            trader = pat["trader"]
            day = pat["date"]
            info = self.products[pid]

            for qty, price, exec_time in pat["buys"]:
                eid = self._next_exec_id()
                self.executions.append({
                    "execution_id": eid,
                    "product_id": pid, "account_id": acc, "trader_id": trader,
                    "side": "BUY", "price": price, "quantity": qty,
                    "instrument_type": info["instrument_type"],
                    "asset_class": info["asset_class"],
                    "execution_date": day.isoformat(),
                    "execution_time": exec_time,
                    "contract_size": info.get("contract_size", ""),
                    "option_type": info.get("option_type", ""),
                })
                self.orders.append({
                    "order_id": self._next_order_id(),
                    "product_id": pid, "account_id": acc,
                    "side": "BUY", "order_time": exec_time,
                    "status": "FILLED", "quantity": qty,
                    "order_date": day.isoformat(),
                })

            for qty, price, exec_time in pat["sells"]:
                eid = self._next_exec_id()
                self.executions.append({
                    "execution_id": eid,
                    "product_id": pid, "account_id": acc, "trader_id": trader,
                    "side": "SELL", "price": price, "quantity": qty,
                    "instrument_type": info["instrument_type"],
                    "asset_class": info["asset_class"],
                    "execution_date": day.isoformat(),
                    "execution_time": exec_time,
                    "contract_size": info.get("contract_size", ""),
                    "option_type": info.get("option_type", ""),
                })
                self.orders.append({
                    "order_id": self._next_order_id(),
                    "product_id": pid, "account_id": acc,
                    "side": "SELL", "order_time": exec_time,
                    "status": "FILLED", "quantity": qty,
                    "order_date": day.isoformat(),
                })

    # -----------------------------------------------------------------------
    # Pattern embedding: Market Price Ramping
    # -----------------------------------------------------------------------

    def _embed_mpr_patterns(self) -> None:
        """Embed MPR patterns: aggressive same-direction trading during trends."""
        for pat in MPR_PATTERNS:
            pid = pat["product"]
            acc = pat["account"]
            trader = pat["trader"]
            day = pat["date"]
            info = self.products[pid]

            for i, (side, qty, price) in enumerate(pat["trades"]):
                # Spread trades across the day
                hour = 9 + (i + 1) * 390 // (len(pat["trades"]) + 1) // 60
                minute = (30 + (i + 1) * 390 // (len(pat["trades"]) + 1)) % 60
                second = self.rng.randint(0, 59)
                exec_time = f"{hour:02d}:{minute:02d}:{second:02d}"

                self.executions.append({
                    "execution_id": self._next_exec_id(),
                    "product_id": pid, "account_id": acc, "trader_id": trader,
                    "side": side, "price": price, "quantity": qty,
                    "instrument_type": info["instrument_type"],
                    "asset_class": info["asset_class"],
                    "execution_date": day.isoformat(),
                    "execution_time": exec_time,
                    "contract_size": info.get("contract_size", ""),
                    "option_type": info.get("option_type", ""),
                })
                self.orders.append({
                    "order_id": self._next_order_id(),
                    "product_id": pid, "account_id": acc,
                    "side": side, "order_time": exec_time,
                    "status": "FILLED", "quantity": qty,
                    "order_date": day.isoformat(),
                })

    # -----------------------------------------------------------------------
    # Pattern embedding: Insider Dealing
    # -----------------------------------------------------------------------

    def _embed_insider_patterns(self) -> None:
        """Embed insider patterns: large trading before market events."""
        for pat in INSIDER_PATTERNS:
            pid = pat["product"]
            acc = pat["account"]
            trader = pat["trader"]
            trade_date = pat["trade_date"]
            info = self.products[pid]
            side = pat["side"]
            total_qty = pat["qty"]
            base_price = pat["price"]

            # Split into 3-5 executions
            n_trades = self.rng.randint(3, 5)
            remaining = total_qty
            for i in range(n_trades):
                if i == n_trades - 1:
                    qty = remaining
                else:
                    qty = int(total_qty / n_trades * self.rng.uniform(0.8, 1.2))
                    qty = min(qty, remaining)
                remaining -= qty

                price = round(base_price * self.rng.uniform(0.999, 1.001), 4)
                hour = self.rng.randint(9, 15)
                minute = self.rng.randint(0, 59)
                second = self.rng.randint(0, 59)
                exec_time = f"{hour:02d}:{minute:02d}:{second:02d}"

                self.executions.append({
                    "execution_id": self._next_exec_id(),
                    "product_id": pid, "account_id": acc, "trader_id": trader,
                    "side": side, "price": price, "quantity": qty,
                    "instrument_type": info["instrument_type"],
                    "asset_class": info["asset_class"],
                    "execution_date": trade_date.isoformat(),
                    "execution_time": exec_time,
                    "contract_size": info.get("contract_size", ""),
                    "option_type": info.get("option_type", ""),
                })
                self.orders.append({
                    "order_id": self._next_order_id(),
                    "product_id": pid, "account_id": acc,
                    "side": side, "order_time": exec_time,
                    "status": "FILLED", "quantity": qty,
                    "order_date": trade_date.isoformat(),
                })

    # -----------------------------------------------------------------------
    # Pattern embedding: Spoofing / Layering
    # -----------------------------------------------------------------------

    def _embed_spoofing_patterns(self) -> None:
        """Embed spoofing patterns: cancelled orders + opposite-side execution."""
        for pat in SPOOFING_PATTERNS:
            pid = pat["product"]
            acc = pat["account"]
            trader = pat["trader"]
            day = pat["date"]
            info = self.products[pid]

            # Cancelled orders (spoof side)
            for qty, price, order_time in pat["cancelled_orders"]:
                self.orders.append({
                    "order_id": self._next_order_id(),
                    "product_id": pid, "account_id": acc,
                    "side": pat["spoof_side"], "order_time": order_time,
                    "status": "CANCELLED", "quantity": qty,
                    "order_date": day.isoformat(),
                })

            # One filled order on spoof side (to look legitimate)
            fq, fp, ft = pat["filled_order"]
            self.orders.append({
                "order_id": self._next_order_id(),
                "product_id": pid, "account_id": acc,
                "side": pat["spoof_side"], "order_time": ft,
                "status": "FILLED", "quantity": fq,
                "order_date": day.isoformat(),
            })
            # Execution for the filled spoof-side order
            self.executions.append({
                "execution_id": self._next_exec_id(),
                "product_id": pid, "account_id": acc, "trader_id": trader,
                "side": pat["spoof_side"], "price": fp, "quantity": fq,
                "instrument_type": info["instrument_type"],
                "asset_class": info["asset_class"],
                "execution_date": day.isoformat(),
                "execution_time": ft,
                "contract_size": info.get("contract_size", ""),
                "option_type": info.get("option_type", ""),
            })

            # Opposite-side execution (the real trade)
            eq, ep, et = pat["execution"]
            self.executions.append({
                "execution_id": self._next_exec_id(),
                "product_id": pid, "account_id": acc, "trader_id": trader,
                "side": pat["exec_side"], "price": ep, "quantity": eq,
                "instrument_type": info["instrument_type"],
                "asset_class": info["asset_class"],
                "execution_date": day.isoformat(),
                "execution_time": et,
                "contract_size": info.get("contract_size", ""),
                "option_type": info.get("option_type", ""),
            })
            self.orders.append({
                "order_id": self._next_order_id(),
                "product_id": pid, "account_id": acc,
                "side": pat["exec_side"], "order_time": et,
                "status": "FILLED", "quantity": eq,
                "order_date": day.isoformat(),
            })

    # -----------------------------------------------------------------------
    # CSV writing
    # -----------------------------------------------------------------------

    def _write_csvs(self) -> dict[str, int]:
        """Write all accumulated data to CSV files."""
        counts = {}

        counts["execution"] = self._write_csv(
            "execution.csv",
            ["execution_id", "product_id", "account_id", "trader_id", "side",
             "price", "quantity", "instrument_type", "asset_class",
             "execution_date", "execution_time", "contract_size", "option_type"],
            self.executions,
        )

        counts["order"] = self._write_csv(
            "order.csv",
            ["order_id", "product_id", "account_id", "side", "order_time",
             "status", "quantity", "order_date"],
            self.orders,
        )

        counts["md_intraday"] = self._write_csv(
            "md_intraday.csv",
            ["product_id", "trade_date", "trade_time", "trade_price", "trade_quantity"],
            self.md_intraday,
        )

        counts["md_eod"] = self._write_csv(
            "md_eod.csv",
            ["product_id", "trade_date", "close_price", "volume"],
            self.md_eod,
        )

        return counts

    def _write_csv(self, filename: str, fieldnames: list[str], rows: list[dict]) -> int:
        path = self.csv_dir / filename
        with open(path, "w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
            writer.writeheader()
            writer.writerows(rows)
        return len(rows)

    # -----------------------------------------------------------------------
    # Entity definitions
    # -----------------------------------------------------------------------

    def _write_entity_definitions(self) -> None:
        """Write entity JSON definitions for each CSV table."""
        entities = {
            "execution": {
                "entity_id": "execution",
                "name": "Trade Execution",
                "description": "Individual trade executions (fills) across all instrument types.",
                "fields": [
                    {"name": "execution_id", "type": "string", "description": "Unique execution identifier", "is_key": True, "nullable": False},
                    {"name": "product_id", "type": "string", "description": "Product/instrument identifier", "is_key": False, "nullable": False},
                    {"name": "account_id", "type": "string", "description": "Trading account identifier", "is_key": False, "nullable": False},
                    {"name": "trader_id", "type": "string", "description": "Trader who executed the trade", "is_key": False, "nullable": False},
                    {"name": "side", "type": "string", "description": "Trade direction", "is_key": False, "nullable": False, "domain_values": ["BUY", "SELL"]},
                    {"name": "price", "type": "decimal", "description": "Execution price per unit", "is_key": False, "nullable": False},
                    {"name": "quantity", "type": "decimal", "description": "Number of units traded", "is_key": False, "nullable": False},
                    {"name": "instrument_type", "type": "string", "description": "Type of instrument", "is_key": False, "nullable": False, "domain_values": ["stock", "option", "future"]},
                    {"name": "asset_class", "type": "string", "description": "Asset class category", "is_key": False, "nullable": False, "domain_values": ["equity", "fx", "commodity"]},
                    {"name": "execution_date", "type": "date", "description": "Date of execution (YYYY-MM-DD)", "is_key": False, "nullable": False},
                    {"name": "execution_time", "type": "string", "description": "Time of execution (HH:MM:SS)", "is_key": False, "nullable": False},
                    {"name": "contract_size", "type": "decimal", "description": "Contract multiplier for options/futures", "is_key": False, "nullable": True},
                    {"name": "option_type", "type": "string", "description": "Option type (call/put)", "is_key": False, "nullable": True, "domain_values": ["call", "put"]},
                ],
                "relationships": [
                    {"target_entity": "order", "join_fields": {"product_id": "product_id", "account_id": "account_id"}, "relationship_type": "many_to_one"},
                    {"target_entity": "md_eod", "join_fields": {"product_id": "product_id", "execution_date": "trade_date"}, "relationship_type": "many_to_one"},
                ],
            },
            "order": {
                "entity_id": "order",
                "name": "Order",
                "description": "Order records including filled, cancelled, and pending orders.",
                "fields": [
                    {"name": "order_id", "type": "string", "description": "Unique order identifier", "is_key": True, "nullable": False},
                    {"name": "product_id", "type": "string", "description": "Product/instrument identifier", "is_key": False, "nullable": False},
                    {"name": "account_id", "type": "string", "description": "Trading account identifier", "is_key": False, "nullable": False},
                    {"name": "side", "type": "string", "description": "Order direction", "is_key": False, "nullable": False, "domain_values": ["BUY", "SELL"]},
                    {"name": "order_time", "type": "string", "description": "Time order was placed (HH:MM:SS)", "is_key": False, "nullable": False},
                    {"name": "status", "type": "string", "description": "Order status", "is_key": False, "nullable": False, "domain_values": ["FILLED", "CANCELLED", "PENDING"]},
                    {"name": "quantity", "type": "decimal", "description": "Order quantity", "is_key": False, "nullable": False},
                    {"name": "order_date", "type": "date", "description": "Date of order (YYYY-MM-DD)", "is_key": False, "nullable": False},
                ],
                "relationships": [],
            },
            "md_intraday": {
                "entity_id": "md_intraday",
                "name": "Intraday Market Data",
                "description": "Intraday trade-level market data (tick data).",
                "fields": [
                    {"name": "product_id", "type": "string", "description": "Product identifier", "is_key": False, "nullable": False},
                    {"name": "trade_date", "type": "date", "description": "Trade date (YYYY-MM-DD)", "is_key": False, "nullable": False},
                    {"name": "trade_time", "type": "string", "description": "Trade time (HH:MM:SS)", "is_key": False, "nullable": False},
                    {"name": "trade_price", "type": "decimal", "description": "Trade price", "is_key": False, "nullable": False},
                    {"name": "trade_quantity", "type": "integer", "description": "Number of units traded", "is_key": False, "nullable": False},
                ],
                "relationships": [],
            },
            "md_eod": {
                "entity_id": "md_eod",
                "name": "End-of-Day Market Data",
                "description": "Daily close prices and volumes for all products.",
                "fields": [
                    {"name": "product_id", "type": "string", "description": "Product identifier", "is_key": False, "nullable": False},
                    {"name": "trade_date", "type": "date", "description": "Trading date (YYYY-MM-DD)", "is_key": False, "nullable": False},
                    {"name": "close_price", "type": "decimal", "description": "Closing price", "is_key": False, "nullable": False},
                    {"name": "volume", "type": "integer", "description": "Total daily volume", "is_key": False, "nullable": False},
                ],
                "relationships": [],
            },
        }

        for entity_id, entity_data in entities.items():
            path = self.entities_dir / f"{entity_id}.json"
            with open(path, "w") as f:
                json.dump(entity_data, f, indent=2)


# ---------------------------------------------------------------------------
# Utility functions
# ---------------------------------------------------------------------------

def _get_trading_days(start: date, end: date) -> list[date]:
    """Return weekdays (Mon-Fri) in the date range, excluding US market holidays."""
    holidays = {
        date(2024, 1, 1),   # New Year's Day
        date(2024, 1, 15),  # MLK Day — note: we keep this as trading day for wash pattern
        date(2024, 2, 19),  # Presidents' Day
    }
    # For demo purposes, keep all weekdays as trading days (including holidays)
    # so embedded patterns on specific dates always work
    days = []
    current = start
    while current <= end:
        if current.weekday() < 5:  # Mon-Fri
            days.append(current)
        current += timedelta(days=1)
    return days


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Generate synthetic trade data")
    parser.add_argument("--workspace", type=Path, default=Path("workspace"),
                        help="Workspace directory (default: workspace/)")
    parser.add_argument("--seed", type=int, default=SEED,
                        help=f"Random seed (default: {SEED})")
    args = parser.parse_args()

    gen = SyntheticDataGenerator(args.workspace, seed=args.seed)
    counts = gen.generate_all()

    print("Data generation complete!")
    for name, count in counts.items():
        print(f"  {name}: {count:,} rows")
    print(f"\nCSV files written to: {gen.csv_dir}")
    print(f"Entity definitions written to: {gen.entities_dir}")


if __name__ == "__main__":
    main()
