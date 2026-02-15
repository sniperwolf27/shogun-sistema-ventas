import { GlassCard } from '../ui/GlassCard';
import { Badge } from '../ui/Badge';
import type { Product } from '@/lib/types';
import { formatNumber, formatCurrency } from '@/lib/utils';

interface BestSellerCardProps {
  product: Product;
}

/**
 * BestSellerCard Component
 *
 * Displays best-selling product with key metrics.
 * Uses elevated glass card with blur (consumes 1 from budget).
 *
 * @example
 * ```tsx
 * <BestSellerCard product={dashboardData.bestSeller} />
 * ```
 */
export function BestSellerCard({ product }: BestSellerCardProps) {
  return (
    <GlassCard variant="elevated" blur className="p-6">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-title font-display font-semibold text-white">Best Seller</h3>
          <Badge variant="success">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            Top Product
          </Badge>
        </div>

        {/* Product Info */}
        <div className="flex items-center gap-4">
          {/* Product Image Placeholder */}
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-accent/20 to-purple/20 border border-white/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>

          {/* Product Details */}
          <div className="flex-1">
            <h4 className="text-body font-semibold text-white">{product.name}</h4>
            <p className="text-caption text-slate-400">SKU: {product.sku}</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          {/* Units Sold */}
          <div>
            <p className="text-micro text-slate-500 uppercase tracking-wider mb-1">Units Sold</p>
            <p className="text-title font-display font-bold text-white">
              {formatNumber(product.unitsSold || 0)}
            </p>
          </div>

          {/* Revenue */}
          {product.revenue && (
            <div>
              <p className="text-micro text-slate-500 uppercase tracking-wider mb-1">Revenue</p>
              <p className="text-title font-display font-bold text-white">
                {formatCurrency(product.revenue)}
              </p>
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  );
}
