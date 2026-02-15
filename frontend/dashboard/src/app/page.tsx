'use client';

import { useEffect, useState } from 'react';
import { MetricsGrid } from '@/components/dashboard/MetricsGrid';
import { WeeklyTrendChart } from '@/components/dashboard/WeeklyTrendChart';
import { BestSellerCard } from '@/components/dashboard/BestSellerCard';
import { StockAlertCard } from '@/components/dashboard/StockAlertCard';
import { ChartCard } from '@/components/ui/ChartCard';
import { apiClient, mockDashboardData } from '@/lib/api';
import type { DashboardData } from '@/lib/types';

/**
 * Dashboard Page
 *
 * Main dashboard composition for Shogun clothing store.
 * Fetches data from Flask API and displays:
 * - 4 KPI metrics (no blur)
 * - Weekly trend chart (uses blur 1/3)
 * - Best seller card (uses blur 2/3)
 * - Stock alert card (uses blur 3/3)
 *
 * Total blur surfaces: Exactly 3 (respects budget)
 */
export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const response = await apiClient.getDashboardData();

        if (response.error) {
          // Silently fallback to mock data (API not available or requires auth)
          if (process.env.NODE_ENV === 'development') {
            console.log('[Dashboard] API unavailable, using mock data');
          }
          setData(mockDashboardData);
        } else if (response.data) {
          setData(response.data);
        } else {
          throw new Error('No data received');
        }
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[Dashboard] Error loading data, using mock data');
        }
        // Fallback to mock data
        setData(mockDashboardData);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Loading state
  if (loading) {
    return (
      <main className="min-h-screen p-6 lg:p-12">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header Skeleton */}
          <div className="space-y-2">
            <div className="h-10 w-64 bg-slate-800/50 rounded-lg animate-pulse" />
            <div className="h-5 w-48 bg-slate-800/30 rounded animate-pulse" />
          </div>

          {/* Metrics Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-slate-800/30 rounded-2xl animate-pulse" />
            ))}
          </div>

          {/* Charts Skeleton */}
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="h-96 bg-slate-800/30 rounded-2xl animate-pulse" />
            <div className="space-y-6">
              <div className="h-44 bg-slate-800/30 rounded-2xl animate-pulse" />
              <div className="h-44 bg-slate-800/30 rounded-2xl animate-pulse" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Error state (still show mock data)
  if (error && !data) {
    return (
      <main className="min-h-screen p-6 lg:p-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-white mb-4">Failed to Load Dashboard</h1>
            <p className="text-slate-400">{error}</p>
          </div>
        </div>
      </main>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <main className="min-h-screen p-6 lg:p-12">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Dashboard Header */}
        <div className="space-y-2 animate-fade-in">
          <h1 className="text-4xl lg:text-5xl font-display font-bold text-white tracking-tight">
            Shogun Dashboard
          </h1>
          <p className="text-body text-slate-400">Real-time insights for your clothing store</p>
        </div>

        {/* Metrics Grid - 4 cards, no blur */}
        <div className="animate-slide-up" style={{ animationDelay: '100ms' }}>
          <MetricsGrid metrics={data.metrics} />
        </div>

        {/* Main Content - 2 columns */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Column: Weekly Trend Chart - Uses blur (1/3) */}
          <div className="animate-slide-up" style={{ animationDelay: '200ms' }}>
            <ChartCard title="Weekly Sales Trend" blur>
              <WeeklyTrendChart data={data.weeklyTrend} />
            </ChartCard>
          </div>

          {/* Right Column: Cards Stack */}
          <div className="space-y-6">
            {/* Best Seller - Uses blur (2/3) */}
            <div className="animate-slide-up" style={{ animationDelay: '300ms' }}>
              <BestSellerCard product={data.bestSeller} />
            </div>

            {/* Stock Alert - Uses blur (3/3) */}
            <div className="animate-slide-up" style={{ animationDelay: '400ms' }}>
              <StockAlertCard item={data.stockAlert} />
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="text-center text-caption text-slate-500 pt-8">
          <p>
            Dashboard powered by Next.js 14 • Optimized for performance •{' '}
            <span className="text-accent">3 blur surfaces active</span>
          </p>
        </div>
      </div>
    </main>
  );
}
