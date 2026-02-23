import { useEffect, useRef, useState, useCallback } from "react";
import { createChart, type IChartApi, LineSeries, HistogramSeries, CrosshairMode } from "lightweight-charts";
import { api } from "../../../api/client.ts";
import Panel from "../../../components/Panel.tsx";
import LoadingSpinner from "../../../components/LoadingSpinner.tsx";
import TimeRangeSelector, { rangeToStartDate } from "./TimeRangeSelector.tsx";

interface MarketDataChartProps {
  productId: string;
}

interface EODRow {
  trade_date: string;
  close_price: number;
  volume: number;
}

interface IntradayRow {
  trade_date: string;
  trade_time: string;
  trade_price: number;
  trade_quantity: number;
}

type ViewMode = "eod" | "intraday";

export default function MarketDataChart({ productId }: MarketDataChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartApi = useRef<IChartApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState("3M");
  const [mode, setMode] = useState<ViewMode>("eod");

  const buildChart = useCallback(() => {
    if (!chartRef.current) return;

    if (chartApi.current) {
      chartApi.current.remove();
      chartApi.current = null;
    }

    const chart = createChart(chartRef.current, {
      width: chartRef.current.clientWidth,
      height: 220,
      layout: {
        background: { color: "transparent" },
        textColor: "var(--color-muted)",
        fontSize: 10,
      },
      grid: {
        vertLines: { color: "var(--color-border)" },
        horzLines: { color: "var(--color-border)" },
      },
      crosshair: { mode: CrosshairMode.Normal },
      timeScale: { timeVisible: mode === "intraday" },
    });
    chartApi.current = chart;

    setLoading(true);
    setError(null);

    const startDate = rangeToStartDate(range);
    const params = new URLSearchParams();
    if (startDate) params.set("start_date", startDate);
    if (!startDate) params.set("days", "365");
    const qs = params.toString();

    api
      .get<{ eod: EODRow[]; intraday: IntradayRow[] }>(`/data/market/${productId}?${qs}`)
      .then(({ eod, intraday }) => {
        if (mode === "eod") {
          if (eod.length === 0) {
            setError("No EOD market data available");
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
        } else {
          if (intraday.length === 0) {
            setError("No intraday data available");
            setLoading(false);
            return;
          }
          const sorted = [...intraday].sort((a, b) => {
            const cmp = a.trade_date.localeCompare(b.trade_date);
            return cmp !== 0 ? cmp : a.trade_time.localeCompare(b.trade_time);
          });

          const priceSeries = chart.addSeries(LineSeries, {
            color: "var(--color-accent)",
            lineWidth: 1,
            priceScaleId: "right",
          });
          priceSeries.setData(
            sorted.map((r) => ({
              time: Math.floor(new Date(`${r.trade_date}T${r.trade_time}`).getTime() / 1000) as unknown as string,
              value: Number(r.trade_price),
            }))
          );

          const volSeries = chart.addSeries(HistogramSeries, {
            color: "rgba(100, 150, 250, 0.3)",
            priceScaleId: "left",
            priceFormat: { type: "volume" },
          });
          volSeries.setData(
            sorted.map((r) => ({
              time: Math.floor(new Date(`${r.trade_date}T${r.trade_time}`).getTime() / 1000) as unknown as string,
              value: Number(r.trade_quantity),
            }))
          );
        }

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
  }, [productId, range, mode]);

  useEffect(() => {
    return buildChart();
  }, [buildChart]);

  return (
    <Panel title={`Market Data — ${productId}`}>
      <div className="flex items-center gap-3 mb-2">
        <TimeRangeSelector selected={range} onChange={setRange} />
        <div className="flex gap-1 ml-auto">
          {(["eod", "intraday"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${
                mode === m
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-border text-muted hover:text-foreground"
              }`}
            >
              {m === "eod" ? "EOD" : "Intraday"}
            </button>
          ))}
        </div>
      </div>
      {loading && (
        <div className="flex items-center justify-center h-[220px]">
          <LoadingSpinner size="md" />
        </div>
      )}
      {error && <p className="text-xs text-muted p-4">{error}</p>}
      <div ref={chartRef} className={loading ? "hidden" : ""} />
    </Panel>
  );
}
