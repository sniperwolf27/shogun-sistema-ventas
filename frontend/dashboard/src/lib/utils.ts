type ClassValue = string | number | boolean | undefined | null | ClassValue[];

/**
 * Combine class names with proper handling of conditionals
 * Simplified version without external dependencies
 */
export function cn(...inputs: ClassValue[]): string {
  return inputs
    .flat()
    .filter(Boolean)
    .join(' ')
    .trim();
}

/**
 * Format number as currency
 */
export function formatCurrency(value: number, locale: string = 'en-US'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format number with thousand separators
 */
export function formatNumber(value: number, locale: string = 'en-US'): string {
  return new Intl.NumberFormat(locale).format(value);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format date
 */
export function formatDate(date: Date | string, locale: string = 'en-US'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(dateObj);
}

/**
 * Get trend direction
 */
export function getTrend(value: number): 'up' | 'down' | 'neutral' {
  if (value > 0) return 'up';
  if (value < 0) return 'down';
  return 'neutral';
}

/**
 * Get trend color
 */
export function getTrendColor(trend: 'up' | 'down' | 'neutral'): string {
  switch (trend) {
    case 'up':
      return 'text-success';
    case 'down':
      return 'text-danger';
    default:
      return 'text-slate-400';
  }
}
