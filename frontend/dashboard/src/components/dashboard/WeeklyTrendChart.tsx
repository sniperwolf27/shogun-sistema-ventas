'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { TrendDataPoint } from '@/lib/types';

interface WeeklyTrendChartProps {
  data: TrendDataPoint[];
}

/**
 * WeeklyTrendChart Component
 *
 * Line chart showing 7-day sales trend using Recharts.
 *
 * Performance optimizations:
 * - No animations in Recharts
 * - Debounced resize observer (ResponsiveContainer)
 * - Minimal grid (horizontal only)
 *
 * @example
 * ```tsx
 * <WeeklyTrendChart data={dashboardData.weeklyTrend} />
 * ```
 */
export function WeeklyTrendChart({ data }: WeeklyTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        {/* Grid */}
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(255, 255, 255, 0.05)"
          horizontal={true}
          vertical={false}
        />

        {/* X Axis */}
        <XAxis
          dataKey="day"
          stroke="rgba(255, 255, 255, 0.3)"
          style={{ fontSize: '13px', fontFamily: 'DM Sans' }}
          tickLine={false}
          axisLine={false}
        />

        {/* Y Axis */}
        <YAxis
          stroke="rgba(255, 255, 255, 0.3)"
          style={{ fontSize: '13px', fontFamily: 'DM Sans' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
        />

        {/* Tooltip */}
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '12px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
            backdropFilter: 'blur(8px)',
          }}
          labelStyle={{ color: '#F5F5F7', fontWeight: 600, marginBottom: '4px' }}
          itemStyle={{ color: '#0071E3' }}
          formatter={(value: number) => [`$${value.toLocaleString()}`, 'Sales']}
        />

        {/* Line */}
        <Line
          type="monotone"
          dataKey="sales"
          stroke="#0071E3"
          strokeWidth={3}
          dot={false}
          activeDot={{
            r: 6,
            fill: '#0071E3',
            strokeWidth: 2,
            stroke: '#fff',
          }}
          animationDuration={0} // Disable animation for performance
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
