import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck, FolderTree, PackageCheck, ShieldCheck, Truck } from 'lucide-react';
import { categoryApi } from '../../services/categoryApi';
import { productApi } from '../../services/productApi';
import type { Category, Product } from '../../types';
import { useCart } from '../../context/CartContext';
import ProductImage from '../../components/ProductImage';
import { formatCurrency, getDiscountedPrice } from '../../utils/formatting';

const getAvailability = (product: Product) => {
  const available = Number(product.available_quantity ?? 0);
  if (available <= 0) {
    return { label: 'Out of stock', tone: 'red', available: false, text: 'Out of stock' };
  }
  if (available <= 5) {
    return { label: 'Low stock', tone: 'amber', available: true, text: `Only ${available} left` };
  }
  return { label: 'In stock', tone: 'green', available: true, text: 'In stock' };
};

export default function CustomerHomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const { addItem } = useCart();

  useEffect(() => {
    const load = async () => {
      try {
        const [productResponse, categoryResponse] = await Promise.all([
          productApi.list({ page: 1, page_size: 6 }),
          categoryApi.list({ page: 1, page_size: 6, status: 'ACTIVE', sort: 'name-asc' }),
        ]);
        setProducts(productResponse.data.items);
        setCategories(categoryResponse.data.items);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  if (loading) return <div className="text-slate-600">Loading featured products...</div>;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-slate-950 px-6 py-12 text-white shadow-xl shadow-indigo-950/10 md:px-12 md:py-16">
        <div className="relative z-10 max-w-xl"><div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-indigo-100"><BadgeCheck size={14} /> Curated for everyday living</div>
        <h1 className="page-heading text-4xl font-extrabold tracking-tight md:text-5xl">Everything you need, delivered simply.</h1>
        <p className="mt-4 max-w-lg text-base leading-7 text-slate-300">Shop thoughtful products from brands you can trust, with clear pricing and order tracking from checkout to doorstep.</p>
        <div className="mt-7 flex flex-wrap gap-3"><Link to="/customer/products" className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-400">Shop products <ArrowRight size={17} /></Link><Link to="/customer/orders" className="rounded-lg border border-white/20 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10">View orders</Link></div></div>
        <div className="pointer-events-none absolute -right-24 -top-32 h-96 w-96 rounded-full border-[40px] border-indigo-500/20" />
      </section>

      {categories.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Collections</p><h2 className="mt-1 text-2xl font-extrabold text-slate-900">Browse categories</h2></div></div>
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            {categories.map((category) => (
              <Link key={category.category_id} to={`/customer/products?category=${encodeURIComponent(category.slug ?? category.name)}`} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><FolderTree size={18} /></div>
                <div className="font-semibold text-slate-800">{category.name}</div>
                <div className="mt-1 text-xs text-slate-500">{category.product_count} products</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">The collection</p><h2 className="mt-1 text-2xl font-extrabold text-slate-900">Popular right now</h2></div><Link to="/customer/products" className="text-sm font-bold text-indigo-600">Browse all <ArrowRight className="inline" size={15} /></Link></div>
      <div className="grid gap-5 md:grid-cols-3">
        {products.slice(0, 6).map((product) => {
          const availability = getAvailability(product);
          return (
            <div key={product.product_id} className="rounded-2xl border bg-white p-5 shadow-sm">
              <ProductImage src={product.image_url} alt={product.product_name} className="mb-4 h-32 w-full rounded-lg" />
              <h3 className="text-lg font-semibold text-slate-800">{product.product_name}</h3>
              <p className="text-sm text-slate-500">{product.category}</p>
              <div className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-500">{availability.text}</div>
              <div className="mt-4 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">{formatCurrency(getDiscountedPrice(product.price, product.discount))}</div>
                  {product.discount > 0 && <div className="text-xs text-emerald-600">{product.discount}% off</div>}
                </div>
                <div className="flex gap-2">
                  <Link to={`/customer/products/${product.product_id}`} className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">View</Link>
                  <button onClick={() => addItem(product, 1)} disabled={!availability.available} className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300">Add</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <section className="grid gap-3 border-y border-slate-200 py-6 md:grid-cols-3">
        {[[ShieldCheck, 'Secure checkout', 'Your account and orders stay protected.'], [Truck, 'Reliable delivery', 'Know what is happening with every order.'], [PackageCheck, 'Fresh inventory', 'Only available products are offered.']].map(([Icon, title, text]) => <div key={title as string} className="flex gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><Icon size={19} /></div><div><div className="font-bold text-slate-800">{title as string}</div><div className="mt-1 text-sm text-slate-500">{text as string}</div></div></div>)}
      </section>
    </div>
  );
}
