import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { customerApi } from '../../services/customerApi';
import type { Customer, CustomerProfilePayload } from '../../types';
import Button from '../../components/ui/Button';

const emptyProfile: CustomerProfilePayload = {
  first_name: '', last_name: '', email: '', phone: null, date_of_birth: null, gender: null,
  address_line1: '', address_line2: null, city: '', state: '', pincode: '', country: '',
};

export default function ProfilePage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<CustomerProfilePayload>(emptyProfile);

  useEffect(() => {
    const load = async () => {
      if (!user?.email) return;
      try {
        const response = await customerApi.me();
        setCustomer(response.data);
        setForm({ ...emptyProfile, ...response.data });
      } catch (error: any) {
        setError(error?.response?.data?.detail || 'Unable to load your profile.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [user?.email]);

  const updateField = (field: keyof CustomerProfilePayload, value: string) => setForm((current) => ({ ...current, [field]: value }));

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await customerApi.updateMe(form);
      setCustomer(response.data);
      setForm({ ...emptyProfile, ...response.data });
      setEditing(false);
      addToast('Your profile was updated successfully.', 'success');
    } catch (error: any) {
      setError(error?.response?.data?.detail || 'Unable to save your profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-slate-600">Loading profile...</div>;
  if (!customer) return <div className="rounded-2xl bg-white p-5 shadow-sm">{error || 'Profile not found.'}</div>;

  const field = (label: string, key: keyof CustomerProfilePayload, required = false) => (
    <label className="block text-sm font-semibold text-slate-700">
      {label}{required ? ' *' : ''}
      <input required={required} value={String(form[key] ?? '')} onChange={(event) => updateField(key, event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 font-normal outline-none focus:border-indigo-400" />
    </label>
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3"><div className="text-2xl font-bold text-slate-900">Profile</div><Button size="sm" variant="secondary" onClick={() => { setEditing((value) => !value); setError(''); }}>{editing ? 'Close' : 'Edit profile'}</Button></div>
        <div className="space-y-3 text-sm text-slate-600">
          <div><span className="font-medium text-slate-800">Name:</span> {customer.first_name} {customer.last_name}</div>
          <div><span className="font-medium text-slate-800">Email:</span> {customer.email}</div>
          <div><span className="font-medium text-slate-800">Role:</span> {user?.role}</div>
          <div><span className="font-medium text-slate-800">Status:</span> {customer.status}</div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between"><h2 className="text-xl font-bold text-slate-900">Customer Details</h2>{editing && <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Editing</span>}</div>
        {error && <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        {editing ? <form onSubmit={save} className="mt-4 grid gap-4 md:grid-cols-2">
          {field('First name', 'first_name', true)}{field('Last name', 'last_name', true)}{field('Email', 'email', true)}{field('Phone', 'phone')}
          {field('Date of birth', 'date_of_birth')}{field('Gender', 'gender')}{field('Address line 1', 'address_line1', true)}{field('Address line 2', 'address_line2')}
          {field('City', 'city', true)}{field('State', 'state', true)}{field('Pincode', 'pincode', true)}{field('Country', 'country', true)}
          <div className="flex gap-2 md:col-span-2"><Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</Button><Button type="button" variant="secondary" onClick={() => { setForm({ ...emptyProfile, ...customer }); setEditing(false); }}>Cancel</Button></div>
        </form> : <div className="mt-4 grid gap-4 md:grid-cols-2">
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
        </div>}
      </div>
    </div>
  );
}
