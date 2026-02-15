import { GlassCard } from './GlassCard';
import { Badge } from './Badge';
import { cn, formatCurrency, formatNumber, formatPercentage, getTrend } from '@/lib/utils';

interface MetricCardProps {
  label: string;
  value: number;
  change?: number;
  prefix?: string;
  format?: 'number' | 'currency' | 'percentage';
  className?: string;
}

/**
 * MetricCard Component
 *
 * Display single KPI with trend indicator.
 * Uses GlassCard with variant="default" (no blur - saves budget).
 *
 * @example
 * ```tsx
 * <MetricCard
 *   label="Total Sales"
 *   value={56820}
 *   change={12}
 *   format="currency"
 * />
 * ```
 */
export function MetricCard({
  label,
  value,
  change,
  prefix = '',
  format = 'number',
  className,
}: MetricCardProps) {
  // Format value based on format type
  const formattedValue =
    format === 'currency'
      ? formatCurrency(value)
      : format === 'percentage'
      ? formatPercentage(value)
      : prefix + formatNumber(value);

  // Determine trend direction
  const trend = change !== undefined ? getTrend(change) : null;

  // Get badge variant based on trend
  const getBadgeVariant = () => {
    if (trend === 'up') return 'success';
    if (trend === 'down') return 'danger';
    return 'neutral';
  };

  return (
    <GlassCard
      variant="default"
      className={cn('p-6 hover:-translate-y-1 cursor-default', className)}
    >
      <div className="space-y-3">
        {/* Label */}
        <p className="text-caption text-slate-400 font-medium uppercase tracking-wider">
          {label}
        </p>

        {/* Value and Change */}
        <div className="flex items-baseline justify-between gap-4">
          {/* Value */}
          <h3 className="text-display font-display font-bold text-white tracking-tight">
            {formattedValue}
          </h3>

          {/* Change Badge */}
          {change !== undefined && (
            <Badge variant={getBadgeVariant()}>
              <span className="flex items-center gap-0.5">
                {trend === 'up' && (
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                {trend === 'down' && (
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                {change > 0 ? '+' : ''}
                {formatPercentage(change, 1)}
              </span>
            </Badge>
          )}
        </div>

        {/* Optional context text */}
        <p className="text-micro text-slate-500">vs last month</p>
      </div>
    </GlassCard>
  );
}
