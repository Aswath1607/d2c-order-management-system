import { Link } from 'react-router-dom';
import { ArrowRight, ShoppingBag, Trash2 } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { formatCurrency, getDiscountedPrice } from '../../utils/formatting';

export default function CartPage() {
  const { items, updateQuantity, removeItem, clear, subtotal, itemCount } = useCart();
  const { addToast } = useToast();
  const invalidItems = items.filter((item) => Number(item.product.available_quantity ?? 0) <= 0 || item.quantity > Number(item.product.available_quantity ?? 0));

  if (items.length === 0) {
    return (
      <div className="surface px-6 py-16 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><ShoppingBag size={24} /></div>
        <h2 className="mt-5 text-2xl font-extrabold text-slate-900">Your cart is empty</h2><p className="mt-2 text-slate-500">Explore our products and add something you like.</p><Link to="/customer/products" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-bold text-white">Continue shopping <ArrowRight size={16} /></Link>
      </div>
    );
  }

  return (
    <div className="space-y-5"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Shopping bag</p><h1 className="page-heading mt-1 text-3xl font-extrabold text-slate-900">Your cart <span className="text-slate-400">({itemCount})</span></h1></div><div className="grid gap-6 xl:grid-cols-[1.6fr_0.8fr]">
      <div className="surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Cart ({itemCount})</h2>
          <button onClick={() => { clear(); addToast('Cart cleared', 'info'); }} className="flex items-center gap-1.5 text-sm font-semibold text-red-600"><Trash2 size={15} /> Clear cart</button>
        </div>
        {invalidItems.length > 0 && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Your cart contains products that are no longer available in the requested quantity. Please review before checkout.
          </div>
        )}
        <div className="space-y-4">
          {items.map((item) => {
            const available = Number(item.product.available_quantity ?? 0);
            const unavailable = available <= 0 || item.quantity > available;
            return (
              <div key={item.product.product_id} className={`flex flex-col gap-3 rounded-xl border p-4 md:flex-row md:items-center md:justify-between ${unavailable ? 'border-amber-200 bg-amber-50/40' : 'border-slate-200 bg-white'}`}>
                <div>
                  <div className="font-semibold text-slate-800">{item.product.product_name}</div>
                  <div className="text-sm text-slate-500">{formatCurrency(getDiscountedPrice(item.product.price, item.product.discount))} each</div>
                  {unavailable && <div className="mt-1 text-xs font-medium text-amber-700">Requested quantity exceeds available stock.</div>}
                </div>
                <div className="flex items-center gap-3">
                  <button type="button" aria-label={`Decrease quantity of ${item.product.product_name}`} onClick={() => { updateQuantity(item.product.product_id, item.quantity - 1); addToast('Cart updated', 'info'); }} className="h-8 w-8 rounded-md bg-slate-100 text-lg">-</button>
                  <span className="min-w-8 text-center font-medium">{item.quantity}</span>
                  <button type="button" aria-label={`Increase quantity of ${item.product.product_name}`} disabled={item.quantity >= available || available <= 0} onClick={() => { updateQuantity(item.product.product_id, item.quantity + 1); addToast('Cart updated', 'info'); }} className="h-8 w-8 rounded-md bg-slate-100 text-lg disabled:opacity-40">+</button>
                  <button type="button" onClick={() => { removeItem(item.product.product_id); addToast('Item removed from cart', 'info'); }} className="ml-3 text-sm font-medium text-red-600">Remove</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="surface h-fit p-5 xl:sticky xl:top-24">
        <h3 className="text-xl font-bold text-slate-900">Summary</h3>
        <div className="mt-4 space-y-3 text-sm text-slate-600">
          <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
          <div className="flex justify-between"><span>Shipping</span><span>{formatCurrency(0)}</span></div>
          <div className="flex justify-between text-base font-semibold text-slate-900"><span>Total</span><span>{formatCurrency(subtotal)}</span></div>
        </div>
        <Link to={invalidItems.length > 0 ? '#/customer/cart' : '/customer/checkout'} className={`mt-6 inline-flex w-full items-center justify-center rounded-lg px-4 py-3 font-semibold text-white ${invalidItems.length > 0 ? 'cursor-not-allowed bg-slate-300' : 'bg-indigo-600'}`} onClick={(event) => { if (invalidItems.length > 0) event.preventDefault(); }}>
          Proceed to checkout
        </Link>
      </div>
    </div></div>
  );
}
