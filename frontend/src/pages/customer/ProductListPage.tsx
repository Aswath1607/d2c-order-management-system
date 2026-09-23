import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { categoryApi } from '../../services/categoryApi';
import type { Category, Product } from '../../types';
import { Search, SlidersHorizontal } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { productApi } from '../../services/productApi';
import ProductImage from '../../components/ProductImage';
import { formatCurrency, getDiscountedPrice } from '../../utils/formatting';

const getAvailability = (product: Product) => {
  const available = Number(product.available_quantity ?? 0);
  if (available <= 0) return { label: 'Out of stock', available: false, text: 'Out of stock' };
  if (available <= 5) return { label: 'Low stock', available: true, text: `Only ${available} left` };
  return { label: 'In stock', available: true, text: 'In stock' };
};

export default function ProductListPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('featured');
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const selectedCategory = searchParams.get('category') ?? '';
  const { addItem, items, updateQuantity } = useCart();
  const { addToast } = useToast();

  const loadProducts = async () => {
    setLoading(true);
    try {
      const response = await productApi.list({ page: 1, page_size: 20, name: search || undefined, category: selectedCategory || undefined });
      setProducts(response.data.items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProducts();
  }, [search, selectedCategory]);

  useEffect(() => { void categoryApi.list({ page: 1, page_size: 100, status: 'ACTIVE', sort: 'name-asc' }).then((response) => setCategories(response.data.items)); }, []);

  const displayedProducts = useMemo(() => {
    const next = [...products];
    if (sort === 'price-low') return next.sort((a, b) => Number(a.price) - Number(b.price));
    if (sort === 'price-high') return next.sort((a, b) => Number(b.price) - Number(a.price));
    if (sort === 'name-asc') return next.sort((a, b) => a.product_name.localeCompare(b.product_name));
    if (sort === 'name-desc') return next.sort((a, b) => b.product_name.localeCompare(a.product_name));
    return next.sort((a, b) => Number(b.available_quantity ?? 0) - Number(a.available_quantity ?? 0));
  }, [products, sort]);

  if (loading) return <div className="text-slate-600">Loading products...</div>;

  return (
    <div className="space-y-5">
      <div className="surface flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
        <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Catalog</p><h1 className="page-heading mt-1 text-2xl font-extrabold text-slate-900">Find your next favorite</h1><p className="mt-1 text-sm text-slate-500">{displayedProducts.length} products available today</p></div>
        <div className="relative w-full md:max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} /><input aria-label="Search products" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products" className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none transition focus:border-indigo-400 focus:bg-white" /></div>
      </div>
      <div className="flex flex-col gap-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-center gap-2"><SlidersHorizontal size={15} /> Category<select aria-label="Filter by category" value={selectedCategory} onChange={(event) => { if (event.target.value) setSearchParams({ category: event.target.value }); else setSearchParams({}); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"><option value="">All categories</option>{categories.map((category) => <option key={category.category_id} value={category.slug}>{category.name}</option>)}</select></label>
        <div className="flex items-center gap-2">
          <span>Sort:</span>
          <select aria-label="Sort products" value={sort} onChange={(event) => setSort(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"><option value="featured">Featured</option><option value="price-low">Price: Low to High</option><option value="price-high">Price: High to Low</option><option value="name-asc">Name: A to Z</option><option value="name-desc">Name: Z to A</option></select>
        </div>
      </div>
      {displayedProducts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center"><h2 className="text-lg font-semibold text-slate-900">No products found.</h2><p className="mt-2 text-sm text-slate-500">Try another search or category filter.</p></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
          {displayedProducts.map((product) => {
            const availability = getAvailability(product);
            return (
              <div key={product.product_id} className="rounded-2xl border bg-white p-4 shadow-sm">
                <ProductImage src={product.image_url} alt={product.product_name} className="mb-4 h-44 w-full rounded-lg" />
                <div className="text-xs uppercase tracking-wide text-indigo-600">{product.category}</div>
                <h3 className="mt-2 text-lg font-semibold text-slate-900">{product.product_name}</h3>
                <div className="mt-2 text-sm text-slate-500">{product.brand}</div>
                <div className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{availability.text}</div>
                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900">{formatCurrency(getDiscountedPrice(product.price, product.discount))}</div>
                    {product.discount > 0 && <div className="text-xs text-emerald-600">Save {product.discount}%</div>}
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Link to={`/customer/products/${product.product_id}`} className="rounded-md border border-slate-200 px-2.5 py-2 text-sm text-slate-700">Details</Link>
                    {(() => {
                      const quantity = items.find((item) => item.product.product_id === product.product_id)?.quantity ?? 0;
                      const available = Number(product.available_quantity ?? 0);
                      if (!availability.available) return <span className="rounded-md bg-slate-100 px-2.5 py-2 text-sm font-medium text-slate-500">Out of Stock</span>;
                      if (!quantity) return <button onClick={() => { addItem(product); addToast('Product added to cart', 'success'); }} className="rounded-md bg-indigo-600 px-2.5 py-2 text-sm text-white">Add to Cart</button>;
                      return <div className="flex items-center gap-2">
                        <button aria-label={`Decrease ${product.product_name} quantity`} onClick={() => updateQuantity(product.product_id, quantity - 1)} className="h-9 w-9 rounded-md bg-slate-100 text-lg">−</button>
                        <span className="min-w-5 text-center font-medium">{quantity}</span>
                        <button aria-label={`Increase ${product.product_name} quantity`} disabled={quantity >= available} onClick={() => updateQuantity(product.product_id, quantity + 1)} className="h-9 w-9 rounded-md bg-slate-100 text-lg disabled:cursor-not-allowed disabled:opacity-40">+</button>
                      </div>;
                    })()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
