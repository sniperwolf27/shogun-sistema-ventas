import { GlassCard } from '../ui/GlassCard';
import { Badge } from '../ui/Badge';
import type { StockItem } from '@/lib/types';
import { cn } from '@/lib/utils';

interface StockAlertCardProps {
  item: StockItem;
}

/**
 * StockAlertCard Component
 *
 * Displays low stock alert for products.
 * Uses elevated glass card with blur (consumes 1 from budget).
 *
 * @example
 * ```tsx
 * <StockAlertCard item={dashboardData.stockAlert} />
 * ```
 */
export function StockAlertCard({ item }: StockAlertCardProps) {
  // Determine status badge variant and message
  const getStatusConfig = () => {
    if (item.status === 'critical' || item.stock <= 5) {
      return {
        variant: 'danger' as const,
        message: 'Critical',
        icon: (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        ),
      };
    } else if (item.status === 'low' || item.stock <= item.threshold) {
      return {
        variant: 'warning' as const,
        message: 'Low Stock',
        icon: (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        ),
      };
    } else {
      return {
        variant: 'success' as const,
        message: 'In Stock',
        icon: (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        ),
      };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <GlassCard variant="elevated" blur className="p-6">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-title font-display font-semibold text-white">Stock Alert</h3>
          <Badge variant={statusConfig.variant}>
            <span className="flex items-center gap-1">
              {statusConfig.icon}
              {statusConfig.message}
            </span>
          </Badge>
        </div>

        {/* Product Info */}
        <div className="flex items-center gap-4">
          {/* Product Icon */}
          <div
            className={cn(
              'w-16 h-16 rounded-xl border flex items-center justify-center',
              item.status === 'critical'
                ? 'bg-danger/10 border-danger/20'
                : item.status === 'low'
                ? 'bg-warning/10 border-warning/20'
                : 'bg-success/10 border-success/20'
            )}
          >
            <svg className="w-8 h-8 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
          </div>

          {/* Product Details */}
          <div className="flex-1">
            <h4 className="text-body font-semibold text-white">{item.name}</h4>
            <p className="text-caption text-slate-400">SKU: {item.sku}</p>
          </div>
        </div>

        {/* Stock Level */}
        <div className="pt-2">
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-micro text-slate-500 uppercase tracking-wider">Current Stock</p>
            <p
              className={cn(
                'text-title font-display font-bold',
                item.status === 'critical'
                  ? 'text-danger'
                  : item.status === 'low'
                  ? 'text-warning'
                  : 'text-success'
              )}
            >
              {item.stock} units
            </p>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                item.status === 'critical'
                  ? 'bg-danger'
                  : item.status === 'low'
                  ? 'bg-warning'
                  : 'bg-success'
              )}
              style={{ width: `${Math.min((item.stock / item.threshold) * 100, 100)}%` }}
            />
          </div>

          {/* Message */}
          <p className="text-caption text-slate-500 mt-2">
            {item.stock <= 5
              ? 'Restock immediately'
              : item.stock <= item.threshold
              ? 'Consider restocking soon'
              : 'Stock level healthy'}
          </p>
        </div>
      </div>
    </GlassCard>
  );
}
