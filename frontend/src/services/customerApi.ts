import api from './api';
import type { ApiListResponse, Customer, CustomerAdmin, Order } from '../types';

export const customerApi = {
  list: (params?: Record<string, string | number | undefined>) => api.get<ApiListResponse<CustomerAdmin>>('/customers', { params }),
  me: () => api.get<Customer>('/customers/me'),
  updateMe: (payload: Partial<Customer>) => api.put<Customer>('/customers/me', payload),
  get: (id: number) => api.get<CustomerAdmin>(`/customers/${id}`),
  create: (payload: Partial<Customer>) => api.post<Customer>('/customers', payload),
  update: (id: number, payload: { name: string; email: string; phone?: string | null; is_active: boolean }) => api.put<CustomerAdmin>(`/customers/${id}`, payload),
  remove: (id: number) => api.delete(`/customers/${id}`),
  orders: (id: number) => api.get<Order[]>(`/customers/${id}/orders`),
  statistics: (id: number) => api.get(`/customers/${id}/statistics`),
};
