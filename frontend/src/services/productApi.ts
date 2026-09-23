import api from './api';
import type { ApiListResponse, Product } from '../types';

export const productApi = {
  list: (params?: Record<string, string | number | undefined>) => api.get<ApiListResponse<Product>>('/products', { params }),
  get: (id: number) => api.get<Product>(`/products/${id}`),
  create: (payload: Partial<Product>) => api.post<Product>('/products', payload),
  update: (id: number, payload: Partial<Product>) => api.put<Product>(`/products/${id}`, payload),
  remove: (id: number) => api.delete(`/products/${id}`),
};
