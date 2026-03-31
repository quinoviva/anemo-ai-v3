'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface DataPoint {
  date: string;
  hgb: number | null;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-panel rounded-xl px-3 py-2 text-xs shadow-lg border border-primary/20">
        <p className="text-muted-foreground font-medium">{label}</p>
        <p className="text-primary font-bold text-sm">{payload[0].value.toFixed(1)} g/dL</p>
      </div>
    );
  }
  return null;
};

export default function HemoglobinTrendChart({ data }: { data: DataPoint[] }) {
  const validData = data.filter(d => d.hgb !== null && d.hgb > 0);

  if (validData.length < 2) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/10 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary/60"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        </div>
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
          {validData.length === 0 ? 'No scan data yet' : 'Scan at least twice to see your trend'}
        </p>
      </div>
    );
  }

  // Normal Hgb ranges (WHO): Female 12, Male 13 — use 12 as conservative lower bound
  const min = Math.max(0, Math.min(...validData.map(d => d.hgb ?? 0)) - 2);
  const max = Math.max(...validData.map(d => d.hgb ?? 0)) + 2;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={validData} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
        <defs>
          <linearGradient id="hgbGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(346 100% 50%)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(346 100% 50%)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontWeight: 600 }}
          axisLine={false}
          tickLine={false}
          dy={6}
        />
        <YAxis
          domain={[min, max]}
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
          tickCount={4}
        />
        {/* Normal range reference lines */}
        <ReferenceLine y={12} stroke="hsl(346 100% 50% / 0.3)" strokeDasharray="4 4" />
        <ReferenceLine y={17.5} stroke="hsl(346 100% 50% / 0.3)" strokeDasharray="4 4" />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(346 100% 50% / 0.2)', strokeWidth: 1 }} />
        <Area
          type="monotone"
          dataKey="hgb"
          stroke="hsl(346 100% 50%)"
          strokeWidth={2}
          fill="url(#hgbGradient)"
          dot={{ r: 4, fill: 'hsl(346 100% 50%)', strokeWidth: 2, stroke: 'hsl(var(--background))' }}
          activeDot={{ r: 6, fill: 'hsl(346 100% 50%)', stroke: 'hsl(var(--background))', strokeWidth: 2 }}
          connectNulls
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
