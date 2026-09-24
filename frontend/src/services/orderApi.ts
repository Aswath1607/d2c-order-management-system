import api from './api';
import type { ApiListResponse, FulfillmentAction, Order, OrderAssignment, Payment } from '../types';

export const orderApi = {
  list: (params?: Record<string, string | number | undefined>) => api.get<ApiListResponse<Order>>('/orders', { params }),
  get: (id: number) => api.get<Order>(`/orders/${id}`),
  create: (payload: { shipping_address: string; payment_method: string; items: Array<{ product_id: number; quantity: number }> }) => api.post<Order>('/orders', payload),
  initiatePayment: (id: number) => api.post<Payment>(`/orders/${id}/payment`),
  markCodPaid: (id: number, reference?: string) => api.patch<Payment>(`/orders/${id}/payment/cod`, { reference }),
  listAssignments: (id: number) => api.get<{ items: OrderAssignment[] }>(`/orders/${id}/assignments`),
  assign: (id: number, payload: { assigned_to_user_id: number; assignment_type: 'WORKER' | 'DELIVERY_AGENT'; notes?: string }) => api.post<OrderAssignment>(`/orders/${id}/assignments`, payload),
  cancelAssignment: (id: number) => api.patch<OrderAssignment>(`/assignments/${id}/cancel`),
  acceptAssignment: (id: number) => api.patch<OrderAssignment>(`/assignments/${id}/accept`),
  completeAssignment: (id: number) => api.patch<OrderAssignment>(`/assignments/${id}/complete`),
  fulfillAssignment: (assignmentId: number, action: FulfillmentAction) => api.patch<OrderAssignment>(`/assignments/${assignmentId}/fulfillment`, { action }),
  myWorkerAssignments: () => api.get<{ items: OrderAssignment[] }>('/worker/assignments'),
  myDeliveryAssignments: () => api.get<{ items: OrderAssignment[] }>('/delivery-agent/assignments'),
  updateStatus: (id: number, payload: { status: string; note?: string }) => api.patch<Order>(`/orders/${id}/status`, payload),
  updateTracking: (id: number, payload: { tracking_number?: string; courier_name?: string; estimated_delivery?: string | null }) => api.patch<Order>(`/orders/${id}/tracking`, payload),
  update: (id: number, payload: Record<string, unknown>) => api.patch<Order>(`/orders/${id}/status`, payload),
  remove: (id: number) => api.delete(`/orders/${id}`),
};
