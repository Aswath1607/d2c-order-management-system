import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { orderApi } from '../../services/orderApi';
import type { Order } from '../../types';
import { formatCurrency } from '../../utils/formatting';

const timelineStages = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'];

export default function OrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      const response = await orderApi.get(Number(id));
      setOrder(response.data);
    };
    void load();
  }, [id]);

  if (!order) return <div className="text-slate-600">Loading order...</div>;

  const currentStage = timelineStages.indexOf(order.order_status);
  const statusHistory = new Map((order.status_history ?? []).map((entry) => [entry.status, entry.created_at]));

  return (
    <div className="space-y-5"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Order details</p><h1 className="page-heading mt-1 text-3xl font-extrabold text-slate-900">Track your order</h1></div>
      <div className="surface p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm text-slate-500">Order Number</div>
            <h2 className="text-2xl font-bold text-slate-900">{order.order_number}</h2>
          </div>
          <div className="flex gap-2">
            <span className="rounded-full bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-700">Payment: {order.payment_status}</span>
            <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">{order.order_status}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]"><div className="space-y-5"><div className="surface p-5"><h2 className="text-lg font-bold text-slate-900">Order progress</h2><div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-6">{['Placed', 'Confirmed', 'Processing', 'Shipped', 'Out for delivery', 'Delivered'].map((stage, index) => { const done = index <= currentStage; return <div key={stage} className="text-center"><div className={`mx-auto h-3 w-3 rounded-full ${done ? 'bg-indigo-600' : 'bg-slate-200'}`} /><div className={`mt-2 text-[10px] font-semibold ${done ? 'text-indigo-700' : 'text-slate-400'}`}>{stage}</div></div>; })}</div></div>
        <div className="surface p-5">
          <h2 className="text-lg font-bold text-slate-900">Items</h2>
          <div className="mt-4 space-y-4">
            {order.items.map((item) => (
              <div key={item.order_item_id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                <div>
                  <div className="font-medium text-slate-800">Product #{item.product_id}</div>
                  <div className="text-sm text-slate-500">Qty: {item.quantity}</div>
                </div>
                <div className="font-semibold text-slate-900">{formatCurrency(item.subtotal)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="surface h-fit p-5">
          <h2 className="text-lg font-bold text-slate-900">Order Summary</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
            <div className="flex justify-between"><span>Discount</span><span>-{formatCurrency(order.discount_amount)}</span></div>
            <div className="flex justify-between"><span>Tax</span><span>{formatCurrency(order.tax_amount)}</span></div>
            <div className="flex justify-between"><span>Shipping</span><span>{formatCurrency(order.shipping_charge)}</span></div>
            <div className="flex justify-between text-base font-semibold text-slate-900"><span>Total</span><span>{formatCurrency(order.total_amount)}</span></div>
          </div>
          <div className="mt-6 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
            <div className="font-medium text-slate-800">Payment: {order.payment_method} ({order.payment_status})</div>
            <div className="mt-3 font-medium text-slate-800">Shipping Address</div>
            <div className="mt-2 whitespace-pre-line">{order.shipping_address || 'Not available'}</div>
          </div>
        </div>
      </div>
      <div className="surface h-fit p-5">
        <h2 className="text-lg font-bold text-slate-900">Tracking</h2>
        {order.tracking_number || order.courier_name || order.estimated_delivery || order.delivered_at ? (
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            {order.tracking_number && <div className="flex justify-between"><span>Tracking Number</span><span className="font-medium text-slate-800">{order.tracking_number}</span></div>}
            {order.courier_name && <div className="flex justify-between"><span>Courier</span><span className="font-medium text-slate-800">{order.courier_name}</span></div>}
            {order.estimated_delivery && <div className="flex justify-between"><span>Estimated Delivery</span><span className="font-medium text-slate-800">{new Date(order.estimated_delivery).toLocaleDateString()}</span></div>}
            {order.delivered_at && <div className="flex justify-between"><span>Delivered At</span><span className="font-medium text-slate-800">{new Date(order.delivered_at).toLocaleString()}</span></div>}
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">Tracking information will appear once the order is shipped.</p>
        )}
        {order.status_history && order.status_history.length > 0 && (
          <div className="mt-5 border-t border-slate-200 pt-4">
            <div className="text-sm font-semibold text-slate-800">Status history</div>
            <div className="mt-3 space-y-2">
              {order.status_history.slice().reverse().map((entry) => (
                <div key={entry.id} className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 p-2 text-sm text-slate-600">
                  <span>{entry.status}</span>
                  <span>{entry.created_at ? new Date(entry.created_at).toLocaleDateString() : '—'}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div></div>
    </div>
  );
}
