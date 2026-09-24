import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { productApi } from '../../services/productApi';
import { orderApi } from '../../services/orderApi';
import type { Order } from '../../types';
import { formatCurrency, getDiscountedPrice } from '../../utils/formatting';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, clear, subtotal } = useCart();
  const { addToast } = useToast();
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
  });
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!items.length && !confirmedOrder) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
        <h2 className="text-2xl font-extrabold text-slate-900">Your cart is empty</h2>
        <p className="mt-2 text-slate-500">Add products before checkout.</p>
        <Link to="/customer/products" className="mt-5 inline-block rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white">Continue shopping</Link>
      </div>
    );
  }

  if (confirmedOrder) {
    return (
      <div className="rounded-2xl bg-white p-8 shadow-sm">
        <div className="mx-auto max-w-xl text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl">✓</div>
          <h1 className="mt-5 text-3xl font-extrabold text-slate-900">Order placed successfully!</h1>
          <p className="mt-3 text-slate-600">Your order has been created and is being prepared.</p>
          <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-left">
            <div className="text-sm text-slate-500">Order</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">{confirmedOrder.order_number}</div>
            <div className="mt-3 flex justify-between text-sm text-slate-600"><span>Total</span><span className="font-semibold text-slate-900">{formatCurrency(confirmedOrder.total_amount)}</span></div>
            <div className="mt-2 flex justify-between text-sm text-slate-600"><span>Payment</span><span className="font-semibold text-slate-900">{confirmedOrder.payment_method}</span></div>
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link to={`/customer/orders/${confirmedOrder.order_id}`} className="rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white">View Order</Link>
            <Link to="/customer/orders" className="rounded-lg border border-slate-200 px-5 py-3 font-semibold text-slate-700">My Orders</Link>
            <Link to="/customer/products" className="rounded-lg border border-slate-200 px-5 py-3 font-semibold text-slate-700">Continue Shopping</Link>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!items.length) {
      const msg = 'Cart is empty.';
      setError(msg);
      addToast(msg, 'warning');
      return;
    }

    const requiredFields = [form.name.trim(), form.address.trim(), form.city.trim(), form.state.trim(), form.pincode.trim(), form.phone.trim()];
    if (requiredFields.some((field) => !field)) {
      const msg = 'Please complete all shipping details before placing your order.';
      setError(msg);
      addToast(msg, 'error');
      return;
    }

    setSubmitting(true);
    try {
      await Promise.all(items.map(async ({ product, quantity }) => {
        const latestResponse = await productApi.get(product.product_id);
        const latestProduct = latestResponse.data;
        const available = Number(latestProduct.available_quantity ?? 0);
        if (latestProduct.status !== 'ACTIVE') {
          throw new Error(`${latestProduct.product_name} is no longer available.`);
        }
        if (available <= 0 || quantity > available) {
          throw new Error(`Requested quantity exceeds available stock for ${latestProduct.product_name}.`);
        }
      }));

      const shippingAddress = `${form.name}\n${form.address}\n${form.city}, ${form.state} ${form.pincode}\n${form.country}\nPhone: ${form.phone}`;
      const payload = {
        shipping_address: shippingAddress,
        payment_method: paymentMethod,
        items: items.map((item) => ({ product_id: item.product.product_id, quantity: item.quantity })),
      };
      const response = await orderApi.create(payload);
      let completedOrder = response.data;
      if (paymentMethod !== 'COD') {
        const paymentResponse = await orderApi.initiatePayment(response.data.order_id);
        completedOrder = { ...response.data, payment_status: paymentResponse.data.payment_status, payment: paymentResponse.data };
      }
      clear();
      setConfirmedOrder(completedOrder);
      addToast(paymentMethod === 'COD' ? 'Order placed successfully' : 'Sandbox payment approved; no real funds were captured.', 'success');
    } catch (err: any) {
      const message = err?.response?.data?.detail || err?.message || 'Unable to place order. Please try again.';
      setError(message);
      addToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Secure checkout</p><h1 className="page-heading mt-1 text-3xl font-extrabold text-slate-900">Complete your order</h1><p className="mt-1 text-sm text-slate-500">A few details and your order will be on its way.</p></div><div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <form onSubmit={handleSubmit} className="surface p-5">
        <h2 className="text-xl font-bold text-slate-900">Shipping address</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700"><span>Full name</span><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2" /></label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700"><span>Phone</span><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2" /></label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 md:col-span-2"><span>Address</span><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2" /></label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700"><span>City</span><input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2" /></label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700"><span>State</span><input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2" /></label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700"><span>Pincode</span><input value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2" /></label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 md:col-span-2"><span>Country</span><input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2" /></label>
        </div>

        <div className="mt-6">
          <h3 className="text-lg font-semibold text-slate-800">Payment method</h3>
          <div className="mt-3 flex flex-wrap gap-3">
            {['COD', 'UPI', 'CARD', 'NET_BANKING'].map((method) => (
              <button key={method} type="button" onClick={() => setPaymentMethod(method)} className={`rounded-lg px-4 py-2 text-sm font-medium ${paymentMethod === method ? 'bg-indigo-600 text-white' : 'border border-slate-200 bg-white text-slate-700'}`}>
                {method === 'COD' ? 'Cash on Delivery' : method === 'NET_BANKING' ? 'Net Banking' : method === 'CARD' ? 'Credit / Debit Card' : 'UPI'}
              </button>
            ))}
          </div>
          {paymentMethod !== 'COD' && <p className="mt-3 text-xs text-slate-500">Sandbox payment mode: this demo uses a mock provider and stores only safe transaction metadata.</p>}
        </div>

        {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <button type="submit" disabled={submitting} className="mt-6 w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white disabled:opacity-60">
          {submitting ? 'Placing order...' : 'Place Order'}
        </button>
      </form>

      <div className="surface h-fit p-5 xl:sticky xl:top-24">
        <h3 className="text-xl font-bold text-slate-900">Order Summary</h3>
        <div className="mt-4 space-y-3 text-sm text-slate-600">
          {items.map((item) => (
            <div key={item.product.product_id} className="flex items-center justify-between gap-3">
              <span>{item.product.product_name} × {item.quantity}</span>
              <span>{formatCurrency(getDiscountedPrice(item.product.price, item.product.discount) * item.quantity)}</span>
            </div>
          ))}
        </div>
        <div className="mt-5 border-t border-slate-200 pt-4 space-y-3 text-sm text-slate-600">
          <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
          <div className="flex justify-between"><span>Shipping</span><span>{formatCurrency(0)}</span></div>
          <div className="flex justify-between text-base font-semibold text-slate-900"><span>Total</span><span>{formatCurrency(subtotal)}</span></div>
        </div>
      </div>
    </div></div>
  );
}
