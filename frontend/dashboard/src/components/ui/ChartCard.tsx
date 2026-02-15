import { GlassCard } from './GlassCard';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ChartCardProps {
  title: string;
  children: ReactNode;
  blur?: boolean;
  className?: string;
}

/**
 * ChartCard Component
 *
 * Container for chart components with glass styling.
 * Can optionally use blur effect (consumes budget).
 *
 * @example
 * ```tsx
 * <ChartCard title="Weekly Sales" blur>
 *   <WeeklyTrendChart data={data} />
 * </ChartCard>
 * ```
 */
export function ChartCard({ title, children, blur = false, className }: ChartCardProps) {
  return (
    <GlassCard variant={blur ? 'elevated' : 'default'} blur={blur} className={cn('p-6', className)}>
      <div className="space-y-4">
        {/* Title */}
        <h3 className="text-title font-display font-semibold text-white">{title}</h3>

        {/* Chart Content */}
        <div className="w-full">{children}</div>
      </div>
    </GlassCard>
  );
}
