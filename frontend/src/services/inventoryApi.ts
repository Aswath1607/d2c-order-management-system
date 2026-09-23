import api from './api';
import type { ApiListResponse, Inventory } from '../types';

export const inventoryApi = {
  list: (params?: Record<string, string | number | undefined>) => api.get<ApiListResponse<Inventory>>('/inventory', { params }),
  get: (productId: number) => api.get<Inventory>(`/inventory/${productId}`),
  update: (productId: number, payload: Partial<Inventory>) => api.put<Inventory>(`/inventory/${productId}`, payload),
  adjust: (productId: number, quantity: number, remarks?: string) => api.post<Inventory>(`/inventory/${productId}/adjust?quantity=${quantity}`, { remarks }),
  restock: (productId: number, quantity: number, remarks?: string) => api.post<Inventory>(`/inventory/${productId}/restock?quantity=${quantity}`, { remarks }),
  history: (productId: number) => api.get(`/inventory/${productId}/history`),
};
