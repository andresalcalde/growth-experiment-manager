import type { MetricType } from '../types';

/**
 * Format a metric value based on its type
 * @param value - The numeric value to format
 * @param type - The type of metric (currency, numeric, percentage)
 * @param includeLabel - Whether to include the unit label (for numeric types)
 * @param metricName - The name of the metric (used for numeric types)
 * @returns Formatted string
 */
export function formatMetricValue(
  value: number, 
  type: MetricType, 
  includeLabel: boolean = false,
  metricName?: string
): string {
  switch (type) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    
    case 'percentage':
      return `${value.toLocaleString('en-US')}%`;
    
    case 'numeric':
    default:
      const formatted = value.toLocaleString('en-US');
      if (includeLabel && metricName) {
        // Extract unit from metric name if present (e.g., "Active Users" -> "Users")
        const words = metricName.split(' ');
        const unit = words[words.length - 1];
        return `${formatted} ${unit}`;
      }
      return formatted;
  }
}

/**
 * Get the unit label for input fields based on metric type
 */
export function getUnitLabel(type: MetricType): string {
  switch (type) {
    case 'currency':
      return '$';
    case 'percentage':
      return '%';
    case 'numeric':
    default:
      return 'Units';
  }
}

/**
 * Get the metric type display name
 */
export function getMetricTypeDisplay(type: MetricType): string {
  switch (type) {
    case 'currency':
      return 'Currency ($)';
    case 'percentage':
      return 'Percentage (%)';
    case 'numeric':
    default:
      return 'Numeric (#)';
  }
}

/**
 * Calculate progress percentage
 */
export function calculateProgress(current: number, target: number): number {
  if (target === 0) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}
