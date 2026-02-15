/**
 * Dashboard Data Types
 */

export interface Metric {
  value: number;
  change: number;
  trend: 'up' | 'down' | 'neutral';
}

export interface DashboardMetrics {
  totalSales: Metric;
  orders: Metric;
  avgOrderValue: Metric;
  returnRate: Metric;
}

export interface TrendDataPoint {
  day: string;
  sales: number;
  date: string;
}

export interface Product {
  name: string;
  sku: string;
  unitsSold?: number;
  revenue?: number;
  image?: string;
}

export interface StockItem {
  name: string;
  sku: string;
  stock: number;
  threshold: number;
  status: 'critical' | 'low' | 'normal';
}

export interface DashboardData {
  metrics: DashboardMetrics;
  weeklyTrend: TrendDataPoint[];
  bestSeller: Product;
  stockAlert: StockItem;
}

/**
 * API Response Types
 */

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export interface EstadisticasResponse {
  total_ventas: number;
  total_pedidos: number;
  ticket_promedio: number;
  tasa_devolucion: number;
  cambio_ventas?: number;
  cambio_pedidos?: number;
  cambio_ticket?: number;
  cambio_devolucion?: number;
}

export interface CanalVentasResponse {
  canal: string;
  total: number;
  cantidad: number;
}

export interface EstadoPedidoResponse {
  estado: string;
  cantidad: number;
}
