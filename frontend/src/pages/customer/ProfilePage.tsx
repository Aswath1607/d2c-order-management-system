import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { customerApi } from '../../services/customerApi';
import type { Customer } from '../../types';

export default function ProfilePage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user?.email) return;
      try {
        const response = await customerApi.me();
        setCustomer(response.data);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [user?.email]);

  if (loading) return <div className="text-slate-600">Loading profile...</div>;
  if (!customer) return <div className="rounded-2xl bg-white p-5 shadow-sm">Profile not found.</div>;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-4 text-2xl font-bold text-slate-900">Profile</div>
        <div className="space-y-3 text-sm text-slate-600">
          <div><span className="font-medium text-slate-800">Name:</span> {user?.name}</div>
          <div><span className="font-medium text-slate-800">Email:</span> {user?.email}</div>
          <div><span className="font-medium text-slate-800">Role:</span> {user?.role}</div>
          <div><span className="font-medium text-slate-800">Status:</span> {customer.status}</div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">Customer Details</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-xs uppercase tracking-wide text-slate-500">Name</div>
            <div className="mt-1 font-medium text-slate-800">{customer.first_name} {customer.last_name}</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-xs uppercase tracking-wide text-slate-500">Phone</div>
            <div className="mt-1 font-medium text-slate-800">{customer.phone || 'Not provided'}</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 md:col-span-2">
            <div className="text-xs uppercase tracking-wide text-slate-500">Address</div>
            <div className="mt-1 font-medium text-slate-800">{customer.address_line1 || 'Not provided'}{customer.address_line2 ? `, ${customer.address_line2}` : ''}</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-xs uppercase tracking-wide text-slate-500">City</div>
            <div className="mt-1 font-medium text-slate-800">{customer.city || 'Not provided'}</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-xs uppercase tracking-wide text-slate-500">State</div>
            <div className="mt-1 font-medium text-slate-800">{customer.state || 'Not provided'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
