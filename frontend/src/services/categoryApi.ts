import api from './api';
import type { ApiListResponse, Category } from '../types';

export const categoryApi = {
  list: (params?: Record<string, string | number | undefined>) => api.get<ApiListResponse<Category>>('/categories', { params }),
  get: (id: number) => api.get<Category>(`/categories/${id}`),
  create: (payload: Partial<Category>) => api.post<Category>('/categories', payload),
  update: (id: number, payload: Partial<Category>) => api.put<Category>(`/categories/${id}`, payload),
  remove: (id: number) => api.delete(`/categories/${id}`),
};
