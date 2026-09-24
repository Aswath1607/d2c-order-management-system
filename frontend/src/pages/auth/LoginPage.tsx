import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ArrowRight, LockKeyhole, ShoppingBag } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('admin1234');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const { addToast } = useToast();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const user = await login(email, password);
      addToast('Login successful', 'success');
      navigate(user.role === 'ADMIN' ? '/admin' : '/customer', { replace: true });
    } catch (err: any) {
      const message = err?.response?.data?.detail || 'Invalid email or password';
      setError(message);
      addToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-300/30 md:grid-cols-2">
      <div className="relative overflow-hidden bg-slate-950 p-8 text-white md:p-12">
        <div className="relative z-10"><img src="/branding/aurevia-logo-exact.png" alt="Aurevia" className="h-14 w-auto object-contain" /><h1 className="mt-16 text-4xl font-extrabold tracking-tight">Your store,<br /><span className="text-indigo-400">in motion.</span></h1>
        <p className="mt-5 max-w-sm leading-7 text-slate-300">A calmer way to manage orders, inventory, and customer experiences from one platform.</p><div className="mt-10 flex items-center gap-3 text-sm text-slate-300"><ShoppingBag size={18} className="text-indigo-400" /> Everything in one place</div></div><div className="absolute -bottom-28 -right-28 h-80 w-80 rounded-full border-[35px] border-indigo-500/20" />
      </div>
      <form className="p-8 md:p-12" onSubmit={handleSubmit}>
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-indigo-600">Welcome back</p><h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">Sign in to continue</h2><p className="mt-2 text-sm text-slate-500">Use your account credentials to access your workspace.</p>
        <div className="space-y-4">
          <label className="block text-sm font-semibold text-slate-700">Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 outline-none transition focus:border-indigo-400 focus:bg-white" /></label>
          <label className="block text-sm font-semibold text-slate-700">Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 outline-none transition focus:border-indigo-400 focus:bg-white" /></label>
          {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <button type="submit" disabled={isSubmitting} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 font-bold text-white transition hover:bg-indigo-700 disabled:opacity-60">
            {isSubmitting ? 'Signing in...' : <>Sign in <ArrowRight size={17} /></>}
          </button>
        </div>
        <p className="mt-4 text-sm text-slate-600">
          <LockKeyhole className="mr-1 inline text-slate-400" size={14} /> Need an account? <Link to="/register" className="font-bold text-indigo-600">Register</Link>
        </p>
      </form>
    </div>
  );
}
