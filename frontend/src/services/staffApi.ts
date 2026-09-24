import api from './api';

export interface StaffMember {
  id: number;
  name: string;
  email: string;
  role: 'WORKER' | 'DELIVERY_AGENT';
  is_active: boolean;
  profile_id: number;
  code: string;
}

export const staffApi = {
  workers: () => api.get<StaffMember[]>('/workers'),
  deliveryAgents: () => api.get<StaffMember[]>('/delivery-agents'),
};