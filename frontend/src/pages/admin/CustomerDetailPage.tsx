import { useEffect, useState } from 'react';
import { ArrowLeft, Mail, Phone, UserRound } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { customerApi } from '../../services/customerApi';
import type { CustomerAdmin, Order } from '../../types';
import { formatCurrency } from '../../utils/formatting';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';

const dateLabel = (value?: string | null) => value ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) : 'No orders yet';
const initials = (name: string) => name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
const paymentTone = (status: string) => status === 'PAYMENT_SUCCESS' || status === 'PAID' ? 'green' : status === 'PAYMENT_FAILED' || status === 'FAILED' ? 'red' : 'amber';

export default function AdminCustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<CustomerAdmin | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [notice, setNotice] = useState('');

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [customerResult, ordersResult] = await Promise.all([customerApi.get(Number(id)), customerApi.orders(Number(id))]);
      setCustomer(customerResult.data);
      setOrders(ordersResult.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [id]);

  const toggle = async () => {
    if (!customer) return;
    try {
      await customerApi.update(customer.customer_id, { name: customer.name, email: customer.email, phone: customer.phone, is_active: !customer.is_active });
      setNotice(`Customer account ${customer.is_active ? 'deactivated' : 'activated'}`);
      void load();
    } catch {
      setNotice('Unable to change customer status.');
    }
  };

  if (loading) return <LoadingState label="Loading customer details" />;
  if (error || !customer) return <ErrorState onRetry={() => void load()} />;

  return (
    <div className="space-y-5">
      <button onClick={() => navigate('/admin/customers')} className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600"><ArrowLeft size={16} /> Back to customers</button>
      {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{notice}</div>}
      <div className="surface flex flex-col justify-between gap-5 p-6 md:flex-row md:items-center">
        <div className="flex items-center gap-4"><span aria-label={`${customer.name} initials`} className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-xl font-extrabold text-indigo-700">{initials(customer.name)}</span><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Customer profile</p><h1 className="page-heading mt-1 text-3xl font-extrabold text-slate-900">{customer.name}</h1><p className="mt-1 text-sm text-slate-500">Customer since {dateLabel(customer.created_at)}</p></div></div>
        <div className="flex gap-2"><Badge tone={customer.is_active ? 'green' : 'slate'}>{customer.is_active ? 'ACTIVE' : 'INACTIVE'}</Badge><Button size="sm" variant="secondary" onClick={toggle}>{customer.is_active ? 'Deactivate' : 'Activate'}</Button></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Stat title="Total orders" value={String(customer.total_orders)} /><Stat title="Total spent" value={formatCurrency(customer.total_spent)} /><Stat title="Average order" value={formatCurrency(customer.average_order_value)} /><Stat title="Last order" value={dateLabel(customer.last_order_date)} /></div>
      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.7fr]">
        <div className="surface p-5"><h2 className="text-lg font-extrabold">Account information</h2><div className="mt-5 space-y-4 text-sm"><div className="flex gap-3"><Mail size={17} className="text-slate-400" /><div><div className="text-xs text-slate-400">Email</div><div className="font-semibold">{customer.email}</div></div></div><div className="flex gap-3"><Phone size={17} className="text-slate-400" /><div><div className="text-xs text-slate-400">Phone</div><div className="font-semibold">{customer.phone || 'Not provided'}</div></div></div><div className="flex gap-3"><UserRound size={17} className="text-slate-400" /><div><div className="text-xs text-slate-400">Account status</div><div className="font-semibold">{customer.is_active ? 'Active' : 'Inactive'}</div></div></div></div></div>
        <div className="surface overflow-hidden"><div className="border-b border-slate-100 p-5"><h2 className="text-lg font-extrabold">Order history</h2><p className="mt-1 text-sm text-slate-500">Historical orders are preserved when accounts are deactivated.</p></div>{orders.length === 0 ? <EmptyState title="No orders yet." description="This customer has not placed an order." /> : <div className="overflow-x-auto"><table className="data-table min-w-[700px] text-left text-sm"><thead><tr><th>Order</th><th>Date</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th></tr></thead><tbody>{orders.map((order) => <tr key={order.order_id}><td><Link to={`/admin/orders/${order.order_id}`} className="font-semibold text-indigo-600 hover:text-indigo-800">{order.order_number}</Link></td><td>{dateLabel(order.order_date)}</td><td>{order.items?.length ?? 0} items</td><td className="font-semibold">{formatCurrency(order.total_amount)}</td><td><Badge tone={paymentTone(order.payment_status)}>{order.payment_status}</Badge></td><td><Badge tone={order.order_status === 'CANCELLED' ? 'red' : 'indigo'}>{order.order_status}</Badge></td></tr>)}</tbody></table></div>}</div>
      </div>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: string }) { return <div className="surface p-5"><div className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</div><div className="mt-3 text-2xl font-extrabold text-slate-900">{value}</div></div>; }
