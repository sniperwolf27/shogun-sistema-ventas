import type {
  ApiResponse,
  DashboardData,
  TrendDataPoint,
} from './types';

/**
 * API Response from Flask /api/estadisticas
 */
interface FlaskEstadisticasResponse {
  total_pedidos: number;
  ventas_totales: number;
  ganancia_neta: number;
  margen_promedio: number;
  pedidos_pendientes: number;
  pedidos_entregados: number;
}

/**
 * Dashboard API Client
 * Connects to your existing Flask backend + Supabase
 */
class DashboardAPI {
  private baseUrl: string;
  private token: string | null = null;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000/api';
    // Auto-load token from localStorage (same key as backoffice)
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('sb_access_token');
    }
  }

  /**
   * Set authentication token
   */
  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('sb_access_token', token);
    }
  }

  /**
   * Refresh token from localStorage
   */
  private refreshToken() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('sb_access_token');
    }
  }

  /**
   * Generic request method
   */
  private async request<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      // Refresh token in case it changed
      this.refreshToken();

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers,
        cache: 'no-store', // Always get fresh data
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      // Silently fail and use fallback data
      if (process.env.NODE_ENV === 'development') {
        console.log('[API] Using fallback data -', error instanceof Error ? error.message : 'Unknown error');
      }
      return {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get estadísticas generales
   */
  async getEstadisticas(from?: string, to?: string): Promise<ApiResponse<FlaskEstadisticasResponse>> {
    const params = new URLSearchParams();
    if (from) params.set('desde', from);
    if (to) params.set('hasta', to);

    const queryString = params.toString();
    const endpoint = `/estadisticas${queryString ? `?${queryString}` : ''}`;

    return this.request<FlaskEstadisticasResponse>(endpoint);
  }

  /**
   * Calculate date ranges for comparison
   */
  private getDateRanges() {
    const today = new Date();
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const twoMonthsAgo = new Date(today);
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    return {
      currentStart: monthAgo.toISOString().split('T')[0],
      currentEnd: today.toISOString().split('T')[0],
      previousStart: twoMonthsAgo.toISOString().split('T')[0],
      previousEnd: monthAgo.toISOString().split('T')[0],
    };
  }

  /**
   * Calculate percentage change
   */
  private calculateChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Number((((current - previous) / previous) * 100).toFixed(1));
  }

  /**
   * Generate weekly trend from last 7 days
   */
  private async getWeeklyTrend(): Promise<TrendDataPoint[]> {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const today = new Date();
    const trend: TrendDataPoint[] = [];

    // Get data for each of the last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      // Fetch sales for this specific day
      const response = await this.getEstadisticas(dateStr, dateStr);

      trend.push({
        day: days[date.getDay()],
        sales: response.data?.ventas_totales || 0,
        date: dateStr,
      });
    }

    return trend;
  }

  /**
   * Get complete dashboard data
   * Fetches real data from your Flask API + Supabase
   */
  async getDashboardData(): Promise<ApiResponse<DashboardData>> {
    try {
      const ranges = this.getDateRanges();

      // Fetch current and previous period data in parallel
      const [currentResponse, previousResponse] = await Promise.all([
        this.getEstadisticas(ranges.currentStart, ranges.currentEnd),
        this.getEstadisticas(ranges.previousStart, ranges.previousEnd),
      ]);

      if (currentResponse.error) {
        return { error: currentResponse.error };
      }

      if (!currentResponse.data) {
        return { error: 'No statistics data received' };
      }

      const current = currentResponse.data;
      const previous = previousResponse.data || {
        total_pedidos: 0,
        ventas_totales: 0,
        ganancia_neta: 0,
        margen_promedio: 0,
        pedidos_pendientes: 0,
        pedidos_entregados: 0,
      };

      // Calculate metrics with real data
      const avgOrderValue = current.total_pedidos > 0
        ? current.ventas_totales / current.total_pedidos
        : 0;

      const prevAvgOrderValue = previous.total_pedidos > 0
        ? previous.ventas_totales / previous.total_pedidos
        : 0;

      // Return rate estimation (cancelled orders / total orders)
      const returnRate = current.total_pedidos > 0
        ? ((current.total_pedidos - current.pedidos_entregados - current.pedidos_pendientes) / current.total_pedidos) * 100
        : 0;

      const prevReturnRate = previous.total_pedidos > 0
        ? ((previous.total_pedidos - previous.pedidos_entregados - previous.pedidos_pendientes) / previous.total_pedidos) * 100
        : 0;

      // Fetch weekly trend (this might be slow, can be optimized)
      const weeklyTrend = await this.getWeeklyTrend();

      const dashboardData: DashboardData = {
        metrics: {
          totalSales: {
            value: current.ventas_totales,
            change: this.calculateChange(current.ventas_totales, previous.ventas_totales),
            trend: current.ventas_totales > previous.ventas_totales ? 'up' : current.ventas_totales < previous.ventas_totales ? 'down' : 'neutral',
          },
          orders: {
            value: current.total_pedidos,
            change: this.calculateChange(current.total_pedidos, previous.total_pedidos),
            trend: current.total_pedidos > previous.total_pedidos ? 'up' : current.total_pedidos < previous.total_pedidos ? 'down' : 'neutral',
          },
          avgOrderValue: {
            value: avgOrderValue,
            change: this.calculateChange(avgOrderValue, prevAvgOrderValue),
            trend: avgOrderValue > prevAvgOrderValue ? 'up' : avgOrderValue < prevAvgOrderValue ? 'down' : 'neutral',
          },
          returnRate: {
            value: returnRate,
            change: this.calculateChange(returnRate, prevReturnRate),
            // Inverted: lower return rate is better
            trend: returnRate < prevReturnRate ? 'up' : returnRate > prevReturnRate ? 'down' : 'neutral',
          },
        },
        weeklyTrend,
        // Mock data for best seller (TODO: add to API)
        bestSeller: {
          name: 'Producto Destacado',
          sku: 'PROD-001',
          unitsSold: Math.floor(current.total_pedidos * 0.15), // Estimate: 15% of total orders
          revenue: Math.floor(current.ventas_totales * 0.20), // Estimate: 20% of total sales
        },
        // Stock alert based on pending orders
        stockAlert: {
          name: 'Pedidos Pendientes',
          sku: 'PENDING',
          stock: current.pedidos_pendientes,
          threshold: Math.floor(current.total_pedidos * 0.3), // 30% threshold
          status: current.pedidos_pendientes > current.total_pedidos * 0.3 ? 'critical' :
                  current.pedidos_pendientes > current.total_pedidos * 0.2 ? 'low' : 'normal',
        },
      };

      return { data: dashboardData };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to fetch dashboard data',
      };
    }
  }
}

// Export singleton instance
export const apiClient = new DashboardAPI();

// Export mock data for development/testing (fallback)
export const mockDashboardData: DashboardData = {
  metrics: {
    totalSales: {
      value: 56820,
      change: 12,
      trend: 'up',
    },
    orders: {
      value: 3420,
      change: 10,
      trend: 'up',
    },
    avgOrderValue: {
      value: 58,
      change: 5,
      trend: 'up',
    },
    returnRate: {
      value: 1.8,
      change: -0.2,
      trend: 'up', // Lower is better for return rate
    },
  },
  weeklyTrend: [
    { day: 'Mon', sales: 7800, date: '2026-02-09' },
    { day: 'Tue', sales: 8200, date: '2026-02-10' },
    { day: 'Wed', sales: 7500, date: '2026-02-11' },
    { day: 'Thu', sales: 9100, date: '2026-02-12' },
    { day: 'Fri', sales: 8800, date: '2026-02-13' },
    { day: 'Sat', sales: 10500, date: '2026-02-14' },
    { day: 'Sun', sales: 4920, date: '2026-02-15' },
  ],
  bestSeller: {
    name: 'Suede Jacket',
    sku: 'SJ-001',
    unitsSold: 850,
    revenue: 42500,
  },
  stockAlert: {
    name: 'Cargo Pants',
    sku: 'CP-005',
    stock: 8,
    threshold: 10,
    status: 'critical',
  },
};
