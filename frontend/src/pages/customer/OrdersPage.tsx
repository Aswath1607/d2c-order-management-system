import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { orderApi } from '../../services/orderApi';
import type { Order } from '../../types';
import { formatCurrency } from '../../utils/formatting';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    const load = async () => {
      try {
        const response = await orderApi.list({ page: 1, page_size: 20, status: statusFilter === 'ALL' ? undefined : statusFilter });
        setOrders(response.data.items);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [statusFilter]);

  if (loading) return <div className="text-slate-600">Loading orders...</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold text-slate-900">My Orders</h1>
        <select aria-label="Filter orders by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
          <option value="ALL">All orders</option>
          <option value="PENDING">Pending</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="PROCESSING">Processing</option>
          <option value="SHIPPED">Shipped</option>
          <option value="OUT_FOR_DELIVERY">Out for delivery</option>
          <option value="DELIVERED">Delivered</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-slate-800">You haven't placed any orders yet.</h2>
          <p className="mt-2 text-slate-500">Your recent purchases will appear here.</p>
          <Link to="/customer/products" className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white">Start shopping</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.order_id} className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-sm text-slate-500">{order.order_number}</div>
                  <div className="text-xl font-bold text-slate-900">{formatCurrency(order.total_amount)}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-700">Payment: {order.payment_status}</span>
                  <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">{order.order_status}</span>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
                <span>{new Date(order.created_at ?? Date.now()).toLocaleDateString()}</span>
                <Link to={`/customer/orders/${order.order_id}`} className="font-semibold text-indigo-600">View details</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
