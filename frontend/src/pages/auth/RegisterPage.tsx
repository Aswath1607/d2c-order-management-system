import { FormEvent, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../services/authApi';

function getRegistrationError(error: unknown) {
  if (!axios.isAxiosError(error)) {
    return 'Registration failed. Please try again.';
  }

  const detail = error.response?.data?.detail;
  if (typeof detail === 'string') {
    return detail;
  }
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => (typeof item === 'string' ? item : item?.msg))
      .filter((message): message is string => Boolean(message));
    if (messages.length > 0) {
      return messages.join(', ');
    }
  }
  return 'Registration failed. Please try again.';
}

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await authApi.register(form);
      navigate('/login', { replace: true });
    } catch (err: unknown) {
      setError(getRegistrationError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl rounded-2xl bg-white p-8 shadow-lg">
      <div className="mb-6"><span className="brand-lockup"><img src="/branding/aurevia-logo-exact.png" alt="Aurevia" className="h-10 w-auto object-contain" /></span><h2 className="mt-5 text-2xl font-bold text-slate-900">Create customer account</h2></div>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-600 dark:bg-slate-900" />
        <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-600 dark:bg-slate-900" />
        <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Password" className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-600 dark:bg-slate-900" />
        {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 text-white rounded-md py-2 font-semibold disabled:opacity-60">
          {isSubmitting ? 'Creating account...' : 'Register'}
        </button>
      </form>
      <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
        Already have an account? <Link to="/login" className="text-indigo-600">Login</Link>
      </p>
    </div>
  );
}
