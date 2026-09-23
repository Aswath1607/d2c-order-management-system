import { useEffect, useMemo, useState } from 'react';
import { Search, Warehouse } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import { EmptyState, LoadingState } from '../../components/ui/States';
import { inventoryApi } from '../../services/inventoryApi';
import type { Inventory as InventoryItem } from '../../types';

const pageSize = 10;

export default function AdminInventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'HEALTHY' | 'LOW' | 'OUT'>('ALL');
  const [sort, setSort] = useState<'newest' | 'name-asc' | 'name-desc' | 'stock-desc' | 'stock-asc'>('newest');
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);
    try {
      const response = await inventoryApi.list({ page: 1, page_size: 200, sort, stock_status: stockFilter === 'ALL' ? undefined : stockFilter });
      setItems(response.data.items);
      setPage(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [stockFilter, sort]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...items].filter((item) => {
      const haystack = [item.product_name, item.category, item.supplier_name, item.warehouse_location].filter(Boolean).join(' ').toLowerCase();
      if (query && !haystack.includes(query)) return false;
      return true;
    }).sort((a, b) => {
      if (sort === 'name-asc') return (a.product_name ?? '').localeCompare(b.product_name ?? '');
      if (sort === 'name-desc') return (b.product_name ?? '').localeCompare(a.product_name ?? '');
      if (sort === 'stock-asc') return a.available_quantity - b.available_quantity;
      if (sort === 'stock-desc') return b.available_quantity - a.available_quantity;
      return b.inventory_id - a.inventory_id;
    });
  }, [items, search, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const paginatedItems = filteredItems.slice((page - 1) * pageSize, page * pageSize);

  const summary = useMemo(() => {
    const totalProducts = items.length;
    const availableUnits = items.reduce((sum, item) => sum + item.available_quantity, 0);
    const lowStockCount = items.filter((item) => item.available_quantity > 0 && item.available_quantity <= item.reorder_level).length;
    const outOfStockCount = items.filter((item) => item.available_quantity <= 0).length;
    return { totalProducts, availableUnits, lowStockCount, outOfStockCount };
  }, [items]);

  const statusTone = (item: InventoryItem) => {
    if (item.available_quantity <= 0) return 'red';
    if (item.available_quantity <= item.reorder_level) return 'amber';
    return 'green';
  };

  const statusLabel = (item: InventoryItem) => {
    if (item.available_quantity <= 0) return 'Out of stock';
    if (item.available_quantity <= item.reorder_level) return 'Low stock';
    return 'Healthy';
  };

  if (loading) return <LoadingState label="Loading inventory" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Operations</p>
          <h1 className="page-heading mt-1 text-3xl font-extrabold text-slate-900">Inventory</h1>
          <p className="mt-1 text-sm text-slate-500">Operational stock control, replenishment thresholds and fulfillment health.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">Tracked products</div>
          <div className="mt-2 text-3xl font-extrabold text-slate-900">{summary.totalProducts}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">Available units</div>
          <div className="mt-2 text-3xl font-extrabold text-emerald-600">{summary.availableUnits}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">Low stock</div>
          <div className="mt-2 text-3xl font-extrabold text-amber-500">{summary.lowStockCount}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">Out of stock</div>
          <div className="mt-2 text-3xl font-extrabold text-red-500">{summary.outOfStockCount}</div>
        </div>
      </div>

      <div className="surface overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search product, SKU, supplier or warehouse..."
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 focus:bg-white"
            />
          </div>
          <select value={stockFilter} onChange={(event) => setStockFilter(event.target.value as typeof stockFilter)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm">
            <option value="ALL">All stock</option>
            <option value="HEALTHY">Healthy</option>
            <option value="LOW">Low stock</option>
            <option value="OUT">Out of stock</option>
          </select>
          <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm">
            <option value="newest">Newest</option>
            <option value="name-asc">Name A-Z</option>
            <option value="name-desc">Name Z-A</option>
            <option value="stock-desc">Available high-low</option>
            <option value="stock-asc">Available low-high</option>
          </select>
        </div>

        <div className="flex items-center justify-between px-5 py-4">
          <div className="text-sm font-semibold text-slate-700">{filteredItems.length} products</div>
          <div className="flex items-center gap-2 text-slate-500">
            <Warehouse size={16} />
            <span className="text-xs uppercase tracking-[0.16em]">Stock control</span>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <EmptyState title="No inventory matches" description="Try another search or stock filter." />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table min-w-[1100px] text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="pb-3 font-medium">Product</th>
                  <th className="pb-3 font-medium">Category</th>
                  <th className="pb-3 font-medium">Stock</th>
                  <th className="pb-3 font-medium">Available</th>
                  <th className="pb-3 font-medium">Reserved</th>
                  <th className="pb-3 font-medium">Damaged</th>
                  <th className="pb-3 font-medium">Reorder level</th>
                  <th className="pb-3 font-medium">Supplier</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((item) => (
                  <tr key={item.inventory_id} className="border-t border-slate-200">
                    <td className="py-3">
                      <div className="font-semibold text-slate-800">{item.product_name ?? `Product #${item.product_id}`}</div>
                      <div className="text-xs text-slate-400">SKU: {item.sku ?? '—'}</div>
                    </td>
                    <td className="py-3 text-slate-700">{item.category ?? 'Unassigned'}</td>
                    <td className="py-3 text-slate-700">{item.stock_quantity}</td>
                    <td className="py-3 text-slate-700">{item.available_quantity}</td>
                    <td className="py-3 text-slate-700">{item.reserved_quantity}</td>
                    <td className="py-3 text-slate-700">{item.damaged_quantity}</td>
                    <td className="py-3 text-slate-700">{item.reorder_level}</td>
                    <td className="py-3 text-slate-700">{item.supplier_name ?? '—'}</td>
                    <td className="py-3">
                      <Badge tone={statusTone(item)}>{statusLabel(item)}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
          <button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold disabled:opacity-40">Previous</button>
          <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold disabled:opacity-40">Next</button>
        </div>
      </div>
    </div>
  );
}
