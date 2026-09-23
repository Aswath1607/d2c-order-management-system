import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Settings2 } from 'lucide-react';
import { orderApi } from '../../services/orderApi';
import type { Order } from '../../types';
import { formatCurrency } from '../../utils/formatting';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';

const badgeTone = (status: string) => {
  switch (status) {
    case 'DELIVERED': return 'green';
    case 'CANCELLED': return 'red';
    case 'OUT_FOR_DELIVERY': return 'amber';
    case 'SHIPPED': return 'indigo';
    case 'PACKED': return 'indigo';
    case 'PROCESSING': return 'amber';
    case 'CONFIRMED': return 'indigo';
    case 'PLACED': return 'slate';
    default: return 'slate';
  }
};

const paymentTone = (status: string) => status === 'PAID' ? 'green' : status === 'FAILED' ? 'red' : 'amber';
const dateLabel = (value?: string | null) => value ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) : '—';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [paymentStatus, setPaymentStatus] = useState('ALL');
  const [sort, setSort] = useState('newest');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = async () => { setLoading(true); setError(false); try { const response = await orderApi.list({ page, page_size: 10, search: search || undefined, status: status === 'ALL' ? undefined : status, payment_status: paymentStatus === 'ALL' ? undefined : paymentStatus, sort }); setOrders(response.data.items); setTotalPages(response.data.total_pages); setTotal(response.data.total); } catch { setError(true); } finally { setLoading(false); } };

  useEffect(() => { const timer = window.setTimeout(() => void load(), 250); return () => window.clearTimeout(timer); }, [page, search, status, paymentStatus, sort]);

  const pageText = useMemo(() => total ? `${(page - 1) * 10 + 1}-${Math.min(page * 10, total)}` : '0-0', [page, total]);

  if (loading) return <LoadingState label="Loading orders" />;
  if (error) return <ErrorState onRetry={() => void load()} />;

  return <div className="space-y-5"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Operations</p><h1 className="page-heading mt-1 text-3xl font-extrabold text-slate-900">Orders</h1><p className="mt-1 text-sm text-slate-500">Manage orders, payments, fulfillment and delivery.</p></div><div className="surface overflow-hidden"><div className="flex flex-col gap-3 border-b border-slate-100 p-4 xl:flex-row"><div className="relative flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => { setPage(1); setSearch(event.target.value); }} aria-label="Search orders" placeholder="Search orders..." className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm focus:border-indigo-400 focus:bg-white" /></div><select value={status} onChange={(event) => { setPage(1); setStatus(event.target.value); }} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="ALL">All statuses</option><option value="PLACED">Placed</option><option value="CONFIRMED">Confirmed</option><option value="PROCESSING">Processing</option><option value="PACKED">Packed</option><option value="SHIPPED">Shipped</option><option value="OUT_FOR_DELIVERY">Out for delivery</option><option value="DELIVERED">Delivered</option><option value="CANCELLED">Cancelled</option></select><select value={paymentStatus} onChange={(event) => { setPage(1); setPaymentStatus(event.target.value); }} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="ALL">All payments</option><option value="PENDING">Pending</option><option value="PAID">Paid</option><option value="FAILED">Failed</option><option value="REFUNDED">Refunded</option></select><select value={sort} onChange={(event) => setSort(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="highest">Highest value</option><option value="lowest">Lowest value</option></select></div>{orders.length === 0 ? <EmptyState title="No orders found." description="Try searching by number, customer name or email." /> : <div className="overflow-x-auto"><table className="data-table min-w-[1100px] text-left text-sm"><thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th>Tracking</th><th>Actions</th></tr></thead><tbody>{orders.map((order) => <tr key={order.order_id}><td className="font-semibold text-indigo-700"><Link to={`/admin/orders/${order.order_id}`}>{order.order_number}</Link></td><td><div className="font-medium text-slate-800">{order.customer_name ?? `Customer #${order.customer_id}`}</div><div className="text-xs text-slate-500">{order.customer_email ?? 'customer@unknown'}</div></td><td>{dateLabel(order.order_date)}</td><td>{order.items_count ?? order.items.length}</td><td className="font-semibold">{formatCurrency(order.total_amount)}</td><td><Badge tone={paymentTone(order.payment_status)}>{order.payment_status}</Badge></td><td><Badge tone={badgeTone(order.order_status)}>{order.order_status}</Badge></td><td className="text-xs text-slate-500">{order.tracking_number ?? '—'}</td><td><Link to={`/admin/orders/${order.order_id}`} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Settings2 size={12} /> View</Link></td></tr>)}</tbody></table></div>}<div className="flex items-center justify-between border-t border-slate-100 px-5 py-4"><span className="text-sm text-slate-500">Showing {pageText} of {total} orders</span><div className="flex gap-2"><Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button><span className="px-2 py-2 text-sm text-slate-500">{page}/{Math.max(1, totalPages)}</span><Button size="sm" variant="secondary" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>Next</Button></div></div></div></div>;
}