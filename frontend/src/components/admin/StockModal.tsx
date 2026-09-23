import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { inventoryApi } from '../../services/inventoryApi';
import type { Inventory, Product } from '../../types';
import Button from '../ui/Button';

export default function StockModal({ product, inventory, onClose, onSaved, onError }: { product: Product; inventory: Inventory; onClose: () => void; onSaved: () => void; onError: (message: string) => void }) {
  const [action, setAction] = useState<'restock' | 'adjust' | 'damage' | 'return'>('restock');
  const [quantity, setQuantity] = useState('');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const amount = Number(quantity) || 0;
  const change = action === 'damage' ? -amount : amount;
  const newStock = inventory.stock_quantity + change;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (amount <= 0) return onError('Enter a quantity greater than zero.');
    setSubmitting(true);
    try {
      if (action === 'restock' || action === 'return') await inventoryApi.restock(product.product_id, amount, remarks);
      else await inventoryApi.adjust(product.product_id, change, remarks);
      onSaved();
    } catch (error: any) { onError(error?.response?.data?.detail || 'Unable to update inventory.'); } finally { setSubmitting(false); }
  };

  return <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"><form onSubmit={submit} className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-slate-100 px-6 py-5"><div><h2 className="text-xl font-extrabold text-slate-900">Update inventory</h2><p className="mt-1 text-sm text-slate-500">{product.product_name}</p></div><button type="button" onClick={onClose} aria-label="Close inventory form" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={19} /></button></div><div className="space-y-5 px-6 py-6"><div className="grid grid-cols-3 gap-3"><div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-500">Current stock</div><div className="mt-1 text-lg font-bold">{inventory.stock_quantity}</div></div><div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-500">Available</div><div className="mt-1 text-lg font-bold">{inventory.available_quantity}</div></div><div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-500">Reserved</div><div className="mt-1 text-lg font-bold">{inventory.reserved_quantity}</div></div></div><div className="grid grid-cols-2 gap-3"><label className={`rounded-xl border p-3 text-sm font-semibold ${action === 'restock' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200'}`}><input type="radio" checked={action === 'restock'} onChange={() => setAction('restock')} className="mr-2" />Restock</label><label className={`rounded-xl border p-3 text-sm font-semibold ${action === 'adjust' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200'}`}><input type="radio" checked={action === 'adjust'} onChange={() => setAction('adjust')} className="mr-2" />Adjustment</label></div><label className="block text-sm font-semibold text-slate-700">Quantity<input required type="number" min="0.01" step="0.01" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3" /></label><label className="block text-sm font-semibold text-slate-700">Remarks<textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} rows={2} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2" /></label><div className="rounded-xl bg-indigo-50 p-3 text-sm text-indigo-800">New stock preview: <strong>{newStock}</strong> ({action === 'restock' ? '+' : '+'}{amount})</div></div><div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" disabled={submitting}>{submitting ? 'Updating...' : 'Update inventory'}</Button></div></form></div>;
}
