import api from './api';
import type { ApiListResponse, Order } from '../types';

export const orderApi = {
  list: (params?: Record<string, string | number | undefined>) => api.get<ApiListResponse<Order>>('/orders', { params }),
  get: (id: number) => api.get<Order>(`/orders/${id}`),
  create: (payload: { shipping_address: string; payment_method: string; items: Array<{ product_id: number; quantity: number }> }) => api.post<Order>('/orders', payload),
  updateStatus: (id: number, payload: { status: string; note?: string }) => api.patch<Order>(`/orders/${id}/status`, payload),
  updateTracking: (id: number, payload: { tracking_number?: string; courier_name?: string; estimated_delivery?: string | null }) => api.patch<Order>(`/orders/${id}/tracking`, payload),
  update: (id: number, payload: Record<string, unknown>) => api.patch<Order>(`/orders/${id}/status`, payload),
  remove: (id: number) => api.delete(`/orders/${id}`),
};
