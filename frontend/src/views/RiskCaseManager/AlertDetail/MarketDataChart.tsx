import { useEffect, useRef, useState } from "react";
import { createChart, type IChartApi, LineSeries, HistogramSeries } from "lightweight-charts";
import { api } from "../../../api/client.ts";
import Panel from "../../../components/Panel.tsx";
import LoadingSpinner from "../../../components/LoadingSpinner.tsx";

interface MarketDataChartProps {
  productId: string;
}

interface EODRow {
  trade_date: string;
  close_price: number;
  volume: number;
}

export default function MarketDataChart({ productId }: MarketDataChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartApi = useRef<IChartApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    if (chartApi.current) {
      chartApi.current.remove();
      chartApi.current = null;
    }

    const chart = createChart(chartRef.current, {
      width: chartRef.current.clientWidth,
      height: 200,
      layout: {
        background: { color: "transparent" },
        textColor: "var(--color-muted)",
        fontSize: 10,
      },
      grid: {
        vertLines: { color: "var(--color-border)" },
        horzLines: { color: "var(--color-border)" },
      },
      timeScale: { timeVisible: false },
    });
    chartApi.current = chart;

    setLoading(true);
    setError(null);
    api
      .get<{ eod: EODRow[] }>(`/data/market/${productId}?days=60`)
      .then(({ eod }) => {
        if (eod.length === 0) {
          setError("No market data available");
          setLoading(false);
          return;
        }

        const sorted = [...eod].sort((a, b) => a.trade_date.localeCompare(b.trade_date));

        const priceSeries = chart.addSeries(LineSeries, {
          color: "var(--color-accent)",
          lineWidth: 2,
          priceScaleId: "right",
        });
        priceSeries.setData(
          sorted.map((r) => ({ time: r.trade_date, value: Number(r.close_price) }))
        );

        const volumeSeries = chart.addSeries(HistogramSeries, {
          color: "rgba(100, 150, 250, 0.3)",
          priceScaleId: "left",
          priceFormat: { type: "volume" },
        });
        volumeSeries.setData(
          sorted.map((r) => ({ time: r.trade_date, value: Number(r.volume) }))
        );

        chart.timeScale().fitContent();
        setLoading(false);
      })
      .catch((e) => {
        setError(String(e));
        setLoading(false);
      });

    const ro = new ResizeObserver(() => {
      if (chartRef.current && chartApi.current) {
        chartApi.current.applyOptions({ width: chartRef.current.clientWidth });
      }
    });
    ro.observe(chartRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartApi.current = null;
    };
  }, [productId]);

  return (
    <Panel title={`Market Data — ${productId}`}>
      {loading && (
        <div className="flex items-center justify-center h-[200px]">
          <LoadingSpinner size="md" />
        </div>
      )}
      {error && <p className="text-xs text-muted p-4">{error}</p>}
      <div ref={chartRef} className={loading ? "hidden" : ""} />
    </Panel>
  );
}
