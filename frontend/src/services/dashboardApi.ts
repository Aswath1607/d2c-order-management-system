import api from './api';
import type { AlertItem, DashboardSummary, FastMovingProduct, InventoryStatus, ProductMetric, SalesSeries } from '../types';

export const dashboardApi = {
  summary: () => api.get<DashboardSummary>('/dashboard/summary'),
  orders: () => api.get<{ items: Array<{ order_status: string; order_id: number }> }>('/dashboard/orders'),
  sales: (days: number) => api.get<SalesSeries[]>(`/dashboard/sales?days=${days}`),
  topProducts: (limit = 5) => api.get<ProductMetric[]>(`/dashboard/top-products?limit=${limit}`),
  fastMovingProducts: (days = 30) => api.get<FastMovingProduct[]>(`/dashboard/fast-moving-products?days=${days}`),
  inventory: () => api.get<InventoryStatus[]>('/dashboard/inventory'),
  alerts: () => api.get<AlertItem[]>('/dashboard/alerts'),
};
