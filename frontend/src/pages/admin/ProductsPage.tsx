import { useEffect, useMemo, useState } from 'react';
import { Archive, Edit3, Eye, PackagePlus, Plus, Search, Trash2 } from 'lucide-react';
import { productApi } from '../../services/productApi';
import { inventoryApi } from '../../services/inventoryApi';
import type { Inventory, Product } from '../../types';
import { formatCurrency } from '../../utils/formatting';
import ProductImage from '../../components/ProductImage';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import ProductFormModal from '../../components/admin/ProductFormModal';
import StockModal from '../../components/admin/StockModal';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [stock, setStock] = useState('ALL');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<'create' | 'edit' | 'stock' | 'view' | null>(null);
  const [selected, setSelected] = useState<Product | null>(null);
  const [confirmProduct, setConfirmProduct] = useState<Product | null>(null);
  const [notice, setNotice] = useState('');
  const pageSize = 10;

  const load = async () => {
    setLoading(true); setError(false);
    try {
      const [productsResult, inventoryResult] = await Promise.all([productApi.list({ page: 1, page_size: 100, status: status === 'ALL' ? undefined : status }), inventoryApi.list({ page: 1, page_size: 100 })]);
      setProducts(productsResult.data.items); setInventory(inventoryResult.data.items); setPage(1);
    } catch { setError(true); } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [status]);

  const inventoryByProduct = useMemo(() => new Map(inventory.map((item) => [item.product_id, item])), [inventory]);
  const categories = useMemo(() => Array.from(new Set(products.map((product) => product.category))).sort(), [products]);
  const visibleProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = products.filter((product) => {
      const item = inventoryByProduct.get(product.product_id);
      const matchesSearch = !query || [product.product_name, product.sku, product.brand, product.category].some((value) => value?.toLowerCase().includes(query));
      const matchesCategory = category === 'ALL' || product.category === category;
      const available = item?.available_quantity ?? product.available_quantity ?? 0;
      const matchesStock = stock === 'ALL' || (stock === 'OUT' ? available <= 0 : stock === 'LOW' ? available > 0 && available <= (item?.reorder_level ?? 0) : available > (item?.reorder_level ?? 0));
      return matchesSearch && matchesCategory && matchesStock;
    });
    return filtered.sort((a, b) => sort === 'name-asc' ? a.product_name.localeCompare(b.product_name) : sort === 'name-desc' ? b.product_name.localeCompare(a.product_name) : sort === 'price-asc' ? a.price - b.price : sort === 'price-desc' ? b.price - a.price : sort === 'oldest' ? a.product_id - b.product_id : b.product_id - a.product_id);
  }, [products, inventoryByProduct, search, category, stock, sort]);
  const totalPages = Math.max(1, Math.ceil(visibleProducts.length / pageSize));
  const pagedProducts = visibleProducts.slice((page - 1) * pageSize, page * pageSize);
  const showNotice = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(''), 2200); };
  const selectedInventory = selected ? inventoryByProduct.get(selected.product_id) : undefined;

  const toggleStatus = async (product: Product) => {
    try { await productApi.update(product.product_id, { ...product, status: product.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }); showNotice(`Product ${product.status === 'ACTIVE' ? 'deactivated' : 'activated'}`); await load(); } catch (error: any) { showNotice(error?.response?.data?.detail || 'Unable to update product'); }
  };
  const remove = async (product: Product) => {
    try { await productApi.remove(product.product_id); showNotice('Product deleted successfully'); await load(); } catch (error: any) { showNotice(error?.response?.data?.detail || 'This product has historical orders and cannot be permanently deleted.'); }
  };

  if (loading) return <LoadingState label="Loading products" />;
  if (error) return <ErrorState onRetry={() => void load()} />;

  return (
    <div className="space-y-5"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Catalog</p><h1 className="page-heading mt-1 text-3xl font-extrabold text-slate-900">Products</h1><p className="mt-1 text-sm text-slate-500">Manage your product catalog, pricing and inventory.</p></div><Button onClick={() => { setSelected(null); setModal('create'); }}><Plus size={17} /> Add product</Button></div>
      {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">✓ {notice}</div>}
      <div className="surface overflow-hidden"><div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center"><div className="relative min-w-0 flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search products, SKU, brand..." className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 focus:bg-white" /></div><select value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="ALL">All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select><select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="ALL">All statuses</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select><select value={stock} onChange={(event) => { setStock(event.target.value); setPage(1); }} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="ALL">All stock</option><option value="IN">In stock</option><option value="LOW">Low stock</option><option value="OUT">Out of stock</option></select><select value={sort} onChange={(event) => setSort(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="name-asc">Name A-Z</option><option value="name-desc">Name Z-A</option><option value="price-asc">Price low-high</option><option value="price-desc">Price high-low</option></select></div><div className="flex items-center justify-between px-5 py-4"><div className="text-sm font-semibold text-slate-700">{visibleProducts.length} products</div><div className="text-xs text-slate-500">Showing {visibleProducts.length ? (page - 1) * pageSize + 1 : 0}-{Math.min(page * pageSize, visibleProducts.length)} of {visibleProducts.length}</div></div>
      {visibleProducts.length === 0 ? <EmptyState title="No products found" description="Try changing your search or filters." action={<Button size="sm" onClick={() => { setSearch(''); setCategory('ALL'); setStock('ALL'); }}>Clear filters</Button>} /> : <div className="overflow-x-auto"><table className="data-table min-w-[900px] text-left text-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="font-medium">Product</th><th className="font-medium">SKU</th><th className="font-medium">Category</th><th className="font-medium">Price</th><th className="font-medium">Stock</th><th className="font-medium">Status</th><th className="font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagedProducts.map((product) => { const item = inventoryByProduct.get(product.product_id); const available = item?.available_quantity ?? product.available_quantity ?? 0; const stockTone = available <= 0 ? 'red' : available <= (item?.reorder_level ?? 0) ? 'amber' : 'green'; return (
              <tr key={product.product_id} className="border-t border-slate-200">
                <td className="py-3 text-slate-700"><div className="flex items-center gap-3"><ProductImage src={product.image_url} alt="" className="h-10 w-10 rounded-lg" /><div><div className="font-semibold text-slate-800">{product.product_name}</div><div className="text-xs text-slate-400">{product.brand}</div></div></div></td>
                <td className="py-3 text-slate-700">{product.sku}</td><td className="py-3 text-slate-700">{product.category}</td><td className="py-3 font-semibold text-slate-800">{formatCurrency(product.price)}</td><td className="py-3"><div className="font-semibold text-slate-800">{available} available</div><div className="text-xs text-slate-400">{item?.reserved_quantity ?? 0} reserved / {item?.stock_quantity ?? available} total</div></td><td className="py-3"><Badge tone={product.status === 'INACTIVE' ? 'slate' : stockTone}>{product.status === 'INACTIVE' ? 'INACTIVE' : available <= 0 ? 'OUT OF STOCK' : available <= (item?.reorder_level ?? 0) ? 'LOW STOCK' : 'ACTIVE'}</Badge></td><td className="py-3 text-right"><div className="flex justify-end gap-1"><button aria-label={`View ${product.product_name}`} onClick={() => { setSelected(product); setModal('view'); }} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-indigo-600"><Eye size={16} /></button><button aria-label={`Edit ${product.product_name}`} onClick={() => { setSelected(product); setModal('edit'); }} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-indigo-600"><Edit3 size={16} /></button><button aria-label={`Update stock for ${product.product_name}`} onClick={() => { setSelected(product); setModal('stock'); }} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-indigo-600"><PackagePlus size={16} /></button><button aria-label={`${product.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} ${product.product_name}`} onClick={() => void toggleStatus(product)} className="rounded-lg p-2 text-slate-400 hover:bg-amber-50 hover:text-amber-600"><Archive size={16} /></button><button aria-label={`Delete ${product.product_name}`} onClick={() => setConfirmProduct(product)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={16} /></button></div></td>
              </tr>
            ); })}
          </tbody>
        </table></div>}<div className="flex items-center justify-between border-t border-slate-100 px-5 py-4"><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold disabled:opacity-40">Previous</button><span className="text-sm text-slate-500">Page {page} of {totalPages}</span><button disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold disabled:opacity-40">Next</button></div></div>
      {modal === 'create' && <ProductFormModal onClose={() => setModal(null)} onSaved={() => { setModal(null); showNotice('Product created successfully'); void load(); }} onError={showNotice} />}
      {modal === 'edit' && selected && <ProductFormModal product={selected} onClose={() => setModal(null)} onSaved={() => { setModal(null); showNotice('Product updated successfully'); void load(); }} onError={showNotice} />}
      {modal === 'stock' && selected && selectedInventory && <StockModal product={selected} inventory={selectedInventory} onClose={() => setModal(null)} onSaved={() => { setModal(null); showNotice('Inventory updated successfully'); void load(); }} onError={showNotice} />}
      {modal === 'view' && selected && <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/40 p-4" onClick={() => setModal(null)}><div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex gap-5"><ProductImage src={selected.image_url} alt={selected.product_name} className="h-36 w-36 shrink-0 rounded-xl" /><div><h2 className="text-2xl font-extrabold text-slate-900">{selected.product_name}</h2><p className="mt-1 text-sm text-slate-500">{selected.sku} · {selected.brand || 'No brand'} · {selected.category}</p><div className="mt-4 text-2xl font-bold text-slate-900">{formatCurrency(selected.price)}</div><div className="mt-3"><Badge tone={selected.status === 'ACTIVE' ? 'green' : 'slate'}>{selected.status}</Badge></div></div></div><div className="mt-6 grid grid-cols-3 gap-3">{[['Total stock', selectedInventory?.stock_quantity ?? 0], ['Available', selectedInventory?.available_quantity ?? selected.available_quantity ?? 0], ['Reserved', selectedInventory?.reserved_quantity ?? 0]].map(([label, value]) => <div key={label as string} className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-500">{label as string}</div><div className="mt-1 text-lg font-bold">{value as number}</div></div>)}</div><p className="mt-5 text-sm leading-6 text-slate-600">{selected.description || 'No product description provided.'}</p><div className="mt-6 flex justify-end"><Button variant="secondary" onClick={() => setModal(null)}>Close</Button></div></div></div>}
      {confirmProduct && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"><div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><h2 className="text-xl font-extrabold text-slate-900">Delete product?</h2><p className="mt-2 text-sm leading-6 text-slate-500">Are you sure you want to permanently delete <strong>{confirmProduct.product_name}</strong>? Products with order history will be safely rejected.</p><div className="mt-6 flex justify-end gap-3"><Button variant="secondary" onClick={() => setConfirmProduct(null)}>Cancel</Button><Button variant="danger" onClick={() => { const product = confirmProduct; setConfirmProduct(null); void remove(product); }}>Delete product</Button></div></div></div>}
    </div>
  );
}
