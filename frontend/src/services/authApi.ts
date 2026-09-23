import api from './api';

export const authApi = {
  login: (email: string, password: string) => {
    const form = new URLSearchParams();
    form.append('username', email);
    form.append('password', password);
    return api.post('/auth/login', form, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  },
  register: (payload: { name: string; email: string; password: string }) => api.post('/auth/register', payload),
  getMe: () => api.get('/auth/me'),
};
