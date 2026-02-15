'use client';

import { useEffect, useState, type ReactNode, type ElementType } from 'react';
import { useGlass } from '../providers/GlassProvider';
import { cn } from '@/lib/utils';

interface GlassCardProps {
  variant?: 'default' | 'elevated' | 'subtle';
  blur?: boolean;
  className?: string;
  children: ReactNode;
  as?: ElementType;
}

/**
 * GlassCard Component
 *
 * Core reusable glass morphism surface with performance constraints.
 *
 * Variants:
 * - default: Medium glass effect with border, shadow (no blur - saves budget)
 * - elevated: Strongest glass with backdrop-filter (consumes blur budget)
 * - subtle: Minimal glass, low-alpha background only
 *
 * Performance Features:
 * - Registers with GlassProvider when blur={true}
 * - Falls back to solid background if budget exceeded
 * - Uses CSS containment (contain: layout style)
 * - Optimized shadow rendering (single-layer)
 *
 * @example
 * ```tsx
 * // Default card (no blur, no budget consumption)
 * <GlassCard>Content</GlassCard>
 *
 * // Elevated card with blur (consumes 1 from budget)
 * <GlassCard variant="elevated" blur>Content</GlassCard>
 * ```
 */
export function GlassCard({
  variant = 'default',
  blur = false,
  className,
  children,
  as: Component = 'div',
}: GlassCardProps) {
  const { registerBlurSurface, unregisterBlurSurface } = useGlass();
  const [canBlur, setCanBlur] = useState(false);

  // Register blur surface on mount if blur is requested
  useEffect(() => {
    if (blur) {
      const allowed = registerBlurSurface();
      setCanBlur(allowed);

      // Cleanup: unregister on unmount
      return () => unregisterBlurSurface();
    }
  }, [blur, registerBlurSurface, unregisterBlurSurface]);

  // Base styles applied to all variants
  const baseStyles = cn(
    'relative overflow-hidden rounded-2xl border',
    'contain-layout', // CSS containment for performance
    'transition-transform duration-300 ease-out'
  );

  // Variant-specific styles
  const variantStyles = {
    default: cn(
      'bg-slate-900/60',
      'border-white/10',
      'shadow-glass-md'
    ),
    elevated: cn(
      // If budget allows, use blur. Otherwise, fallback to solid.
      canBlur && blur
        ? 'bg-white/5 backdrop-blur-xl backdrop-saturate-150'
        : 'bg-slate-900/80',
      'border-white/10',
      'shadow-glass-lg'
    ),
    subtle: cn(
      'bg-slate-900/40',
      'border-white/5',
      'shadow-glass-sm'
    ),
  };

  return (
    <Component className={cn(baseStyles, variantStyles[variant], className)}>
      {/* Internal glow effect (pseudo-element replacement) */}
      <div className="absolute inset-0 pointer-events-none rounded-[inherit] opacity-50">
        <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </Component>
  );
}
