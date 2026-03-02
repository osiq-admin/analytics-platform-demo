"""Platinum tier service — pre-built KPI generation from Gold tier data."""
from __future__ import annotations

import random
from datetime import datetime, timezone
from pathlib import Path

from backend.models.analytics_tiers import (
    KPIDataPoint,
    KPIDataset,
    KPIDefinition,
    PlatinumConfig,
)


class PlatinumService:
    """Generate and manage pre-built KPI datasets from Gold tier alert data."""

    def __init__(self, workspace: Path, metadata_service):
        self._workspace = workspace
        self._metadata = metadata_service

    def generate_kpi(self, kpi_id: str) -> KPIDataset | None:
        """Generate a KPI dataset. For demo, create realistic synthetic aggregated data."""
        config = self._metadata.load_platinum_config()
        if not config:
            return None
        defn = next((k for k in config.kpi_definitions if k.kpi_id == kpi_id), None)
        if not defn:
            return None

        # Generate synthetic data based on category
        data_points = self._generate_data_points(defn)
        dataset = KPIDataset(
            kpi_id=defn.kpi_id,
            name=defn.name,
            category=defn.category,
            generated_at=datetime.now(timezone.utc).isoformat(),
            period="2026-02",
            data_points=data_points,
            record_count=len(data_points),
        )
        self._metadata.save_kpi_dataset(kpi_id, dataset)
        return dataset

    def generate_all(self) -> list[KPIDataset]:
        """Generate all KPI datasets."""
        config = self._metadata.load_platinum_config()
        if not config:
            return []
        results = []
        for defn in config.kpi_definitions:
            ds = self.generate_kpi(defn.kpi_id)
            if ds:
                results.append(ds)
        return results

    def get_summary(self) -> dict:
        """Summary: total KPIs defined, datasets generated, category counts."""
        config = self._metadata.load_platinum_config()
        datasets = self._metadata.list_kpi_datasets()
        categories: dict[str, int] = {}
        if config:
            for defn in config.kpi_definitions:
                categories[defn.category] = categories.get(defn.category, 0) + 1
        return {
            "total_kpis": len(config.kpi_definitions) if config else 0,
            "datasets_generated": len(datasets),
            "categories": categories,
            "last_generated": datasets[0].generated_at if datasets else "",
        }

    def _generate_data_points(self, defn: KPIDefinition) -> list[KPIDataPoint]:
        """Generate synthetic data points based on KPI category."""
        # Use realistic model IDs and asset classes from the platform
        models = [
            "wash_trading_full_day",
            "wash_trading_intraday",
            "market_price_ramping",
            "insider_dealing",
            "spoofing_layering",
        ]
        asset_classes = ["equity", "fixed_income", "fx", "commodity", "derivative"]

        if defn.category == "alert_summary":
            return self._gen_alert_summary(models, asset_classes)
        elif defn.category == "model_effectiveness":
            return self._gen_model_effectiveness(models)
        elif defn.category == "score_distribution":
            return self._gen_score_distribution(models)
        elif defn.category == "regulatory_report":
            return self._gen_regulatory_report()
        return []

    def _gen_alert_summary(
        self, models: list[str], asset_classes: list[str]
    ) -> list[KPIDataPoint]:
        """Alert counts by model and asset class."""
        rng = random.Random(42)
        points: list[KPIDataPoint] = []
        for m in models[:3]:  # top 3 models
            for ac in asset_classes[:3]:  # top 3 asset classes
                points.append(
                    KPIDataPoint(
                        dimension_values={"model_id": m, "asset_class": ac},
                        metric_name="alert_count",
                        metric_value=rng.randint(5, 30),
                        period="2026-02",
                    )
                )
        return points

    def _gen_model_effectiveness(self, models: list[str]) -> list[KPIDataPoint]:
        """Total alerts and triggered counts per model."""
        rng = random.Random(42)
        points: list[KPIDataPoint] = []
        for m in models:
            total = rng.randint(10, 50)
            triggered = rng.randint(int(total * 0.5), total)
            points.append(
                KPIDataPoint(
                    dimension_values={"model_id": m},
                    metric_name="total_alerts",
                    metric_value=total,
                    period="2026-02",
                )
            )
            points.append(
                KPIDataPoint(
                    dimension_values={"model_id": m},
                    metric_name="triggered",
                    metric_value=triggered,
                    period="2026-02",
                )
            )
        return points

    def _gen_score_distribution(self, models: list[str]) -> list[KPIDataPoint]:
        """Score histogram in 10-point buckets per model."""
        rng = random.Random(42)
        points: list[KPIDataPoint] = []
        buckets = [
            "0-10", "10-20", "20-30", "30-40", "40-50",
            "50-60", "60-70", "70-80", "80-90", "90-100",
        ]
        for m in models[:3]:
            for bucket in buckets:
                points.append(
                    KPIDataPoint(
                        dimension_values={"model_id": m, "score_bucket": bucket},
                        metric_name="count",
                        metric_value=rng.randint(0, 15),
                        period="2026-02",
                    )
                )
        return points

    def _gen_regulatory_report(self) -> list[KPIDataPoint]:
        """Alert counts mapped to regulatory frameworks."""
        reg_model_map = {
            "MAR": ["market_price_ramping", "insider_dealing", "spoofing_layering"],
            "MiFID II": [
                "wash_trading_full_day",
                "wash_trading_intraday",
                "market_price_ramping",
            ],
            "Dodd-Frank": ["wash_trading_full_day", "spoofing_layering"],
            "FINRA": [
                "wash_trading_full_day",
                "wash_trading_intraday",
                "spoofing_layering",
            ],
        }
        rng = random.Random(42)
        points: list[KPIDataPoint] = []
        for reg, reg_models in reg_model_map.items():
            for m in reg_models:
                points.append(
                    KPIDataPoint(
                        dimension_values={"regulation": reg, "model_id": m},
                        metric_name="alert_count",
                        metric_value=rng.randint(3, 25),
                        period="2026-02",
                    )
                )
        return points
