import { MetricCard } from '../ui/MetricCard';
import type { DashboardMetrics } from '@/lib/types';

interface MetricsGridProps {
  metrics: DashboardMetrics;
}

/**
 * MetricsGrid Component
 *
 * 4-card grid displaying main KPIs.
 * Uses default glass cards (no blur) to save budget.
 *
 * @example
 * ```tsx
 * <MetricsGrid metrics={dashboardData.metrics} />
 * ```
 */
export function MetricsGrid({ metrics }: MetricsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Total Sales */}
      <MetricCard
        label="Total Sales"
        value={metrics.totalSales.value}
        change={metrics.totalSales.change}
        format="currency"
      />

      {/* Orders */}
      <MetricCard
        label="Orders"
        value={metrics.orders.value}
        change={metrics.orders.change}
        format="number"
      />

      {/* Avg Order Value */}
      <MetricCard
        label="Avg Order Value"
        value={metrics.avgOrderValue.value}
        change={metrics.avgOrderValue.change}
        format="currency"
      />

      {/* Return Rate */}
      <MetricCard
        label="Return Rate"
        value={metrics.returnRate.value}
        change={metrics.returnRate.change}
        format="percentage"
      />
    </div>
  );
}
