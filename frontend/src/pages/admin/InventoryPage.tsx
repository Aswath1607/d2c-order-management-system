import { useEffect, useMemo, useState } from 'react';
import { History, Pencil, Plus, Search, SlidersHorizontal, Warehouse, X } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { EmptyState, LoadingState } from '../../components/ui/States';
import { inventoryApi } from '../../services/inventoryApi';
import type { Inventory as InventoryItem } from '../../types';

const pageSize = 10;

type Modal = 'restock' | 'adjust' | 'edit' | 'history' | null;

type InventoryTransaction = {
  transaction_id: number;
  transaction_type: string;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reference_type?: string | null;
  reference_id?: string | null;
  remarks?: string | null;
  created_at?: string | null;
};

type EditForm = {
  stock_quantity: string;
  reserved_quantity: string;
  reorder_level: string;
  reorder_quantity: string;
  warehouse_location: string;
  supplier_name: string;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  const responseData = (error as { response?: { data?: { detail?: unknown } } })?.response?.data;
  const detail = responseData?.detail;
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (Array.isArray(detail)) {
    const messages = detail.map((entry) => {
      if (typeof entry === 'string') return entry;
      if (entry && typeof entry === 'object' && 'msg' in entry && typeof entry.msg === 'string') return entry.msg;
      return '';
    }).filter(Boolean);
    if (messages.length) return messages.join('; ');
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

export default function AdminInventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'HEALTHY' | 'LOW' | 'OUT'>('ALL');
  const [sort, setSort] = useState<'newest' | 'name-asc' | 'name-desc' | 'stock-desc' | 'stock-asc'>('newest');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<Modal>(null);
  const [selected, setSelected] = useState<InventoryItem | null>(null);
  const [quantity, setQuantity] = useState('');
  const [remarks, setRemarks] = useState('');
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await inventoryApi.list({ page: 1, page_size: 100, sort, stock_status: stockFilter === 'ALL' ? undefined : stockFilter });
      setItems(response.data.items);
      setPage(1);
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Unable to load inventory.'));
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

  const closeModal = () => {
    setModal(null);
    setSelected(null);
    setQuantity('');
    setRemarks('');
    setEditForm(null);
    setHistoryError('');
  };

  const openOperation = (item: InventoryItem, action: Exclude<Modal, 'history' | null>) => {
    setNotice('');
    setError('');
    setSelected(item);
    setModal(action);
    setQuantity('');
    setRemarks('');
    setEditForm({
      stock_quantity: String(item.stock_quantity),
      reserved_quantity: String(item.reserved_quantity),
      reorder_level: String(item.reorder_level),
      reorder_quantity: String(item.reorder_quantity),
      warehouse_location: item.warehouse_location ?? '',
      supplier_name: item.supplier_name ?? '',
    });
  };

  const openHistory = async (item: InventoryItem) => {
    setNotice('');
    setError('');
    setSelected(item);
    setModal('history');
    setTransactions([]);
    setHistoryError('');
    setHistoryLoading(true);
    try {
      const response = await inventoryApi.history(item.product_id);
      setTransactions(response.data as InventoryTransaction[]);
    } catch (historyLoadError) {
      setHistoryError(getErrorMessage(historyLoadError, 'Unable to load transaction history.'));
    } finally {
      setHistoryLoading(false);
    }
  };

  const submitOperation = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    setError('');
    try {
      if (modal === 'restock' || modal === 'adjust') {
        const amount = Number(quantity);
        if (!Number.isFinite(amount) || (modal === 'restock' ? amount <= 0 : amount === 0)) throw new Error(modal === 'restock' ? 'Enter a quantity greater than zero.' : 'Enter a non-zero adjustment.');
        if (modal === 'restock') await inventoryApi.restock(selected.product_id, amount, remarks.trim() || undefined);
        else await inventoryApi.adjust(selected.product_id, amount, remarks.trim() || undefined);
        setNotice(modal === 'restock' ? 'Inventory restocked successfully.' : 'Stock adjusted successfully.');
      } else if (modal === 'edit' && editForm) {
        const values = { ...Object.fromEntries(Object.entries(editForm).map(([key, value]) => [key, ['warehouse_location', 'supplier_name'].includes(key) ? value.trim() || null : Number(value)])), damaged_quantity: selected.damaged_quantity };
        const numericValues = Object.entries(values).filter(([key]) => !['warehouse_location', 'supplier_name'].includes(key)).map(([, value]) => value as number);
        if (numericValues.some((value) => !Number.isFinite(value) || value < 0)) throw new Error('Inventory quantities and reorder values cannot be negative.');
        if ((values.reserved_quantity as number) > (values.stock_quantity as number)) throw new Error('Reserved quantity cannot exceed stock quantity.');
        await inventoryApi.update(selected.product_id, values);
        setNotice('Inventory details updated successfully.');
      }
      closeModal();
      await load();
    } catch (operationError) {
      setError(getErrorMessage(operationError, 'Unable to update inventory.'));
    } finally {
      setSubmitting(false);
    }
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

      {(notice || error) && <div role={error ? 'alert' : 'status'} className={`rounded-xl border px-4 py-3 text-sm font-semibold ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{error || notice}</div>}

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
                  <th className="pb-3 font-medium">Actions</th>
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
                    <td className="py-3">
                      <div className="flex items-center gap-1">
                        <Button type="button" size="sm" variant="secondary" onClick={() => openOperation(item, 'restock')} aria-label={`Restock ${item.product_name ?? 'product'}`} title="Restock"><Plus size={14} />Restock</Button>
                        <Button type="button" size="sm" variant="secondary" onClick={() => openOperation(item, 'adjust')} aria-label={`Adjust ${item.product_name ?? 'product'}`} title="Adjust stock"><SlidersHorizontal size={14} />Adjust</Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => openOperation(item, 'edit')} aria-label={`Edit ${item.product_name ?? 'product'}`} title="Edit inventory"><Pencil size={14} /></Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => void openHistory(item)} aria-label={`View history for ${item.product_name ?? 'product'}`} title="Transaction history"><History size={14} /></Button>
                      </div>
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

      {modal && selected && modal !== 'history' && editForm && <div className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-sm"><form onSubmit={submitOperation} className="w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-slate-800"><div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 dark:border-slate-700"><div><h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-50">{modal === 'restock' ? 'Restock inventory' : modal === 'adjust' ? 'Adjust stock' : 'Edit inventory'}</h2><p className="mt-1 text-sm text-slate-500">{selected.product_name ?? `Product #${selected.product_id}`}</p></div><button type="button" onClick={closeModal} aria-label="Close inventory form" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"><X size={19} /></button></div><div className="space-y-4 px-6 py-6">{modal !== 'edit' ? <><label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">{modal === 'restock' ? 'Quantity' : 'Adjustment quantity'}<input required type="number" min={modal === 'restock' ? '0.01' : undefined} step="0.01" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-600 dark:bg-slate-900" />{modal === 'adjust' && <span className="mt-1 block text-xs font-normal text-slate-500">Enter a positive quantity to add stock or a negative quantity to remove stock.</span>}</label><label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Remarks<textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} rows={3} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900" /></label></> : <div className="grid gap-4 sm:grid-cols-2">{(['stock_quantity', 'reserved_quantity', 'reorder_level', 'reorder_quantity'] as const).map((field) => <label key={field} className="block text-sm font-semibold capitalize text-slate-700 dark:text-slate-200">{field.replaceAll('_', ' ')}<input required type="number" min="0" step="0.01" value={editForm[field]} onChange={(event) => setEditForm({ ...editForm, [field]: event.target.value })} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-600 dark:bg-slate-900" /></label>)}<label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Warehouse<input value={editForm.warehouse_location} onChange={(event) => setEditForm({ ...editForm, warehouse_location: event.target.value })} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-600 dark:bg-slate-900" /></label><label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Supplier<input value={editForm.supplier_name} onChange={(event) => setEditForm({ ...editForm, supplier_name: event.target.value })} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-600 dark:bg-slate-900" /></label></div>}</div><div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4 dark:border-slate-700"><Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button><Button type="submit" disabled={submitting}>{submitting ? 'Saving...' : modal === 'restock' ? 'Restock' : modal === 'adjust' ? 'Adjust stock' : 'Save changes'}</Button></div></form></div>}

      {modal === 'history' && selected && <div className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-sm"><div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl dark:bg-slate-800"><div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 dark:border-slate-700"><div><h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-50">Transaction history</h2><p className="mt-1 text-sm text-slate-500">{selected.product_name ?? `Product #${selected.product_id}`}</p></div><button type="button" onClick={closeModal} aria-label="Close transaction history" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"><X size={19} /></button></div><div className="max-h-[65vh] overflow-y-auto p-4 sm:p-6">{historyLoading ? <LoadingState label="Loading transaction history" /> : historyError ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">{historyError}</div> : transactions.length === 0 ? <EmptyState title="No transactions yet" description="This product has no recorded inventory transactions." /> : <><div className="hidden overflow-x-auto md:block"><table className="data-table ml-0 min-w-[1060px] w-[1060px] table-fixed text-left text-sm"><colgroup><col className="w-[130px]" /><col className="w-[90px]" /><col className="w-[110px]" /><col className="w-[190px]" /><col className="w-[350px]" /><col className="w-[190px]" /></colgroup><thead><tr><th>Type</th><th>Quantity</th><th>Stock</th><th>Reference</th><th>Remarks</th><th>Timestamp</th></tr></thead><tbody>{transactions.map((transaction) => <tr key={transaction.transaction_id}><td className="align-top"><Badge tone={transaction.transaction_type === 'IN' ? 'green' : transaction.transaction_type === 'ADJUSTMENT' ? 'amber' : 'slate'}>{transaction.transaction_type}</Badge></td><td className="align-top">{transaction.quantity}</td><td className="align-top">{transaction.previous_stock} to {transaction.new_stock}</td><td className="align-top" style={{ whiteSpace: 'normal', overflowWrap: 'anywhere' }}><div className="whitespace-normal break-words">{[transaction.reference_type, transaction.reference_id].filter(Boolean).join(' #') || '—'}</div></td><td className="align-top" style={{ whiteSpace: 'normal', overflowWrap: 'anywhere' }}><div className="whitespace-normal break-words">{transaction.remarks || '—'}</div></td><td className="align-top" style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}><div className="overflow-hidden whitespace-nowrap">{transaction.created_at ? new Date(transaction.created_at).toLocaleString() : '—'}</div></td></tr>)}</tbody></table></div><div className="space-y-3 md:hidden">{transactions.map((transaction) => <article key={transaction.transaction_id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-600"><div className="flex items-start justify-between gap-3"><Badge tone={transaction.transaction_type === 'IN' ? 'green' : transaction.transaction_type === 'ADJUSTMENT' ? 'amber' : 'slate'}>{transaction.transaction_type}</Badge><time className="text-right text-xs text-slate-500">{transaction.created_at ? new Date(transaction.created_at).toLocaleString() : '—'}</time></div><dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm"><div><dt className="text-xs text-slate-500">Quantity</dt><dd className="font-semibold text-slate-800 dark:text-slate-100">{transaction.quantity}</dd></div><div><dt className="text-xs text-slate-500">Stock</dt><dd className="font-semibold text-slate-800 dark:text-slate-100">{transaction.previous_stock} to {transaction.new_stock}</dd></div><div><dt className="text-xs text-slate-500">Reference</dt><dd className="break-words text-slate-700 dark:text-slate-200">{[transaction.reference_type, transaction.reference_id].filter(Boolean).join(' #') || '—'}</dd></div><div className="col-span-2"><dt className="text-xs text-slate-500">Remarks</dt><dd className="break-words text-slate-700 dark:text-slate-200">{transaction.remarks || '—'}</dd></div></dl></article>)}</div></>}</div></div></div>}
    </div>
  );
}
