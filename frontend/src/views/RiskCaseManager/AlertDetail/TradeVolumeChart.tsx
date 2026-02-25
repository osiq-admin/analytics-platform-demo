import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { api } from "../../../api/client.ts";
import Panel from "../../../components/Panel.tsx";
import LoadingSpinner from "../../../components/LoadingSpinner.tsx";
import { TOOLTIP_STYLE, TOOLTIP_LABEL_STYLE, TOOLTIP_ITEM_STYLE, TICK_STYLE } from "../../../constants/chartStyles.ts";

interface TradeVolumeChartProps {
  productId: string;
  alertDate?: string;
}

interface EODRow {
  trade_date: string;
  volume: number;
}

export default function TradeVolumeChart({ productId, alertDate }: TradeVolumeChartProps) {
  const [data, setData] = useState<{ date: string; volume: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get<{ eod: EODRow[] }>(`/data/market/${productId}?days=90`)
      .then(({ eod }) => {
        const sorted = [...eod]
          .sort((a, b) => a.trade_date.localeCompare(b.trade_date))
          .map((r) => ({ date: r.trade_date, volume: Number(r.volume) }));
        setData(sorted);
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [productId]);

  if (loading) {
    return (
      <Panel title="Trade Volume">
        <div className="flex items-center justify-center h-24">
          <LoadingSpinner size="md" />
        </div>
      </Panel>
    );
  }

  if (data.length === 0) {
    return (
      <Panel title="Trade Volume">
        <p className="text-xs text-muted p-4">No volume data available.</p>
      </Panel>
    );
  }

  return (
    <Panel title={`Trade Volume — ${productId}`}>
      <ResponsiveContainer width="100%" height={150}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="date"
            tick={TICK_STYLE}
            tickFormatter={(v: string) => v.slice(5)}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={TICK_STYLE}
            width={50}
            tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelStyle={TOOLTIP_LABEL_STYLE}
            itemStyle={TOOLTIP_ITEM_STYLE}
          />
          <Bar dataKey="volume" name="Volume" fill="var(--color-accent)" opacity={0.7} radius={[2, 2, 0, 0]} />
          {alertDate && (
            <ReferenceLine x={alertDate} stroke="var(--color-error)" strokeDasharray="3 3" label="" />
          )}
        </BarChart>
      </ResponsiveContainer>
    </Panel>
  );
}
