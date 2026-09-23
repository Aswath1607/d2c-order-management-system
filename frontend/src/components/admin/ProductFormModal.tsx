import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { productApi } from '../../services/productApi';
import type { Product } from '../../types';
import Button from '../ui/Button';
import ProductImage from '../ProductImage';
import { categoryApi } from '../../services/categoryApi';
import type { Category } from '../../types';

interface ProductFormModalProps {
  product?: Product | null;
  onClose: () => void;
  onSaved: () => void;
  onError: (message: string) => void;
}

type FormState = {
  product_name: string; sku: string; brand: string; category_id: string; description: string;
  price: string; cost_price: string; discount: string; tax_rate: string; image_url: string; status: string;
  initial_stock: string; reorder_level: string; reorder_quantity: string; warehouse_location: string; supplier_name: string;
};

const initialForm: FormState = { product_name: '', sku: '', brand: '', category_id: '', description: '', price: '', cost_price: '', discount: '0', tax_rate: '0', image_url: '', status: 'ACTIVE', initial_stock: '0', reorder_level: '0', reorder_quantity: '0', warehouse_location: '', supplier_name: '' };

export default function ProductFormModal({ product, onClose, onSaved, onError }: ProductFormModalProps) {
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => { void categoryApi.list({ page: 1, page_size: 100, status: 'ACTIVE', sort: 'name-asc' }).then((response) => setCategories(response.data.items)).catch(() => onError('Unable to load active categories.')); }, []);

  useEffect(() => {
    if (!product) return;
    setForm({ product_name: product.product_name, sku: product.sku, brand: product.brand ?? '', category_id: String(product.category_id), description: product.description ?? '', price: String(product.price), cost_price: String(product.cost_price), discount: String(product.discount), tax_rate: String(product.tax_rate), image_url: product.image_url ?? '', status: product.status, initial_stock: '0', reorder_level: '0', reorder_quantity: '0', warehouse_location: '', supplier_name: '' });
  }, [product]);

  const setField = (field: keyof FormState, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const numberValue = (field: keyof FormState) => Number(form[field]) || 0;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.product_name.trim() || !form.sku.trim() || !form.category_id) return onError('Product name, SKU, and a valid category are required.');
    if (numberValue('price') < 0 || numberValue('cost_price') < 0 || numberValue('initial_stock') < 0 || numberValue('reorder_level') < 0 || numberValue('reorder_quantity') < 0) return onError('Prices and stock values cannot be negative.');
    if (numberValue('discount') < 0 || numberValue('discount') > 100) return onError('Discount must be between 0 and 100.');
    setSubmitting(true);
    try {
      const payload = { product_name: form.product_name.trim(), sku: form.sku.trim(), brand: form.brand.trim() || null, category_id: Number(form.category_id), description: form.description.trim() || null, price: numberValue('price'), cost_price: numberValue('cost_price'), discount: numberValue('discount'), tax_rate: numberValue('tax_rate'), image_url: form.image_url.trim() || null, status: form.status, weight: product ? product.weight : 0.5, ...(product ? {} : { initial_stock: numberValue('initial_stock'), reorder_level: numberValue('reorder_level'), reorder_quantity: numberValue('reorder_quantity'), warehouse_location: form.warehouse_location.trim() || null, supplier_name: form.supplier_name.trim() || null }) };
      if (product) await productApi.update(product.product_id, payload);
      else await productApi.create(payload);
      onSaved();
    } catch (error: any) {
      onError(error?.response?.data?.detail || 'Unable to save product.');
    } finally { setSubmitting(false); }
  };

  const field = (label: string, key: keyof FormState, type = 'text', required = false, disabled = false) => <label className="block text-sm font-semibold text-slate-700">{label}{required && <span className="text-red-500"> *</span>}<input required={required} disabled={disabled} type={type} min={type === 'number' ? 0 : undefined} value={form[key]} onChange={(event) => setField(key, event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-indigo-400 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60" /></label>;

  return <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-sm"><form onSubmit={submit} className="my-6 w-full max-w-3xl rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-slate-100 px-6 py-5"><div><h2 className="text-xl font-extrabold text-slate-900">{product ? 'Edit Product' : 'Add Product'}</h2><p className="mt-1 text-sm text-slate-500">{product ? 'Update catalog information without changing inventory.' : 'Create a product and its initial inventory record.'}</p></div><button type="button" onClick={onClose} aria-label="Close product form" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={19} /></button></div>
    <div className="space-y-6 px-6 py-6"><section><h3 className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Product information</h3><div className="mt-3 grid gap-4 md:grid-cols-2">{field('Product name', 'product_name', 'text', true)}{field('SKU', 'sku', 'text', true)}{field('Brand', 'brand')}<label className="block text-sm font-semibold text-slate-700">Category *<select required value={form.category_id} onChange={(event) => setField('category_id', event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm"><option value="">Select category</option>{categories.map((category) => <option key={category.category_id} value={category.category_id}>{category.name}</option>)}</select></label><label className="block text-sm font-semibold text-slate-700 md:col-span-2">Description<textarea value={form.description} onChange={(event) => setField('description', event.target.value)} rows={3} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:bg-white" /></label></div></section>
    <section><h3 className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Pricing and media</h3><div className="mt-3 grid gap-4 md:grid-cols-4">{field('Selling price', 'price', 'number', true)}{field('Cost price', 'cost_price', 'number')}{field('Discount %', 'discount', 'number')}{field('Tax rate %', 'tax_rate', 'number')}<div className="md:col-span-3">{field('Image URL', 'image_url')}</div><ProductImage src={form.image_url} alt="Product preview" className="h-20 w-full rounded-lg" /></div></section>
    {!product && <section><h3 className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Initial inventory</h3><div className="mt-3 grid gap-4 md:grid-cols-3">{field('Initial stock', 'initial_stock', 'number', true)}{field('Reorder level', 'reorder_level', 'number', true)}{field('Reorder quantity', 'reorder_quantity', 'number')}{field('Warehouse', 'warehouse_location')}{field('Supplier', 'supplier_name')}</div></section>}
    {product && <label className="block max-w-xs text-sm font-semibold text-slate-700">Status<select value={form.status} onChange={(event) => setField('status', event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm"><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label>}
    </div><div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" disabled={submitting}>{submitting ? 'Saving...' : product ? 'Save changes' : 'Create product'}</Button></div></form></div>;
}
