import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'success' | 'danger' | 'warning' | 'neutral' | 'info';
  className?: string;
}

/**
 * Badge Component
 *
 * Status and trend indicator badge
 *
 * @example
 * ```tsx
 * <Badge variant="success">+12%</Badge>
 * <Badge variant="danger">-5%</Badge>
 * ```
 */
export function Badge({ children, variant = 'neutral', className }: BadgeProps) {
  const variantStyles = {
    success: 'bg-success/10 text-success border-success/20',
    danger: 'bg-danger/10 text-danger border-danger/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    neutral: 'bg-slate-800/50 text-slate-400 border-slate-700/50',
    info: 'bg-info/10 text-info border-info/20',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1',
        'text-caption font-medium',
        'rounded-md border',
        'transition-colors duration-200',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
