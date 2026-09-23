import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { productApi } from '../../services/productApi';
import type { Product } from '../../types';
import ProductImage from '../../components/ProductImage';
import { formatCurrency, getDiscountedPrice } from '../../utils/formatting';

const getAvailability = (product: Product) => {
  const available = Number(product.available_quantity ?? 0);
  if (available <= 0) return { label: 'Out of stock', available: false, text: 'Out of stock' };
  if (available <= 5) return { label: 'Low stock', available: true, text: `Only ${available} left` };
  return { label: 'In stock', available: true, text: 'In stock' };
};

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const { addItem, items, updateQuantity } = useCart();
  const { addToast } = useToast();

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      const response = await productApi.get(Number(id));
      setProduct(response.data);
    };
    void load();
  }, [id]);

  if (!product) return <div className="text-slate-600">Loading product...</div>;

  const availability = getAvailability(product);
  const cartQuantity = items.find((item) => item.product.product_id === product.product_id)?.quantity ?? 0;
  const available = Number(product.available_quantity ?? 0);

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="grid gap-6 md:grid-cols-2">
        <ProductImage src={product.image_url} alt={product.product_name} className="h-80 w-full rounded-2xl" />
        <div>
          <Link to={`/customer/products?category=${encodeURIComponent(product.category_slug ?? product.category)}`} className="text-sm uppercase tracking-wide text-indigo-600 hover:text-indigo-800">{product.category}</Link>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">{product.product_name}</h1>
          <p className="mt-3 text-slate-600">{product.description}</p>
          <div className="mt-4 flex items-center gap-3">
            <span className="text-3xl font-bold text-slate-900">{formatCurrency(getDiscountedPrice(product.price, product.discount))}</span>
            {product.discount > 0 && <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">{product.discount}% off</span>}
          </div>
          <div className="mt-3 flex items-center gap-3 text-sm">
            <span className={`rounded-full px-2 py-1 font-semibold ${availability.available ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{availability.text}</span>
            {availability.available && available <= 5 && <span className="text-slate-500">Only {available} left</span>}
          </div>
          <div className="mt-4 text-sm text-slate-500">Brand: {product.brand || 'N/A'} • SKU: {product.sku}</div>
          <div className="mt-6 flex items-center gap-3">
            <label className="text-sm font-medium text-slate-700">Qty</label>
            <button aria-label="Decrease quantity" type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="h-10 w-10 rounded-md bg-slate-100 text-lg">−</button>
            <input type="number" min={1} max={available || 1} value={quantity} onChange={(e) => setQuantity(Math.min(Math.max(Number(e.target.value) || 1, 1), available || 1))} className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-center" disabled={!availability.available} />
            <button aria-label="Increase quantity" type="button" onClick={() => setQuantity((value) => Math.min(available || 1, value + 1))} className="h-10 w-10 rounded-md bg-slate-100 text-lg" disabled={!availability.available}>+</button>
          </div>
          {cartQuantity > 0 && <div className="mt-3 text-sm font-medium text-emerald-600">Added to cart: {cartQuantity}</div>}
          <div className="mt-6 flex gap-3">
            {!availability.available ? <span className="rounded-lg bg-slate-100 px-4 py-2.5 font-semibold text-slate-500">Out of Stock</span> : cartQuantity > 0 ? <div className="flex items-center gap-3">
              <button type="button" aria-label="Decrease cart quantity" onClick={() => { updateQuantity(product.product_id, cartQuantity - 1); addToast('Cart updated', 'info'); }} className="h-10 w-10 rounded-md bg-slate-100 text-lg">−</button>
              <span className="min-w-6 text-center font-medium">{cartQuantity}</span>
              <button type="button" aria-label="Increase cart quantity" disabled={cartQuantity >= available} onClick={() => { updateQuantity(product.product_id, cartQuantity + 1); addToast('Cart updated', 'info'); }} className="h-10 w-10 rounded-md bg-slate-100 text-lg disabled:opacity-40">+</button>
            </div> : <button type="button" onClick={() => { addItem(product, quantity); addToast('Product added to cart', 'success'); }} className="rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white">Add to cart</button>}
            <button type="button" onClick={() => navigate('/customer/products')} className="rounded-lg border border-slate-200 px-4 py-2.5 font-semibold text-slate-700">Back to products</button>
          </div>
        </div>
      </div>
    </div>
  );
}
