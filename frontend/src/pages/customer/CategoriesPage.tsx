import { useEffect, useState } from 'react';
import { ArrowRight, FolderTree } from 'lucide-react';
import { Link } from 'react-router-dom';
import { categoryApi } from '../../services/categoryApi';
import type { Category } from '../../types';
import ProductImage from '../../components/ProductImage';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';

export default function CustomerCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(false);
  const load = async () => { setLoading(true); try { const response = await categoryApi.list({ page: 1, page_size: 100, status: 'ACTIVE', sort: 'name-asc' }); setCategories(response.data.items); } catch { setError(true); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);
  if (loading) return <LoadingState label="Loading categories" />; if (error) return <ErrorState onRetry={() => void load()} />;
  return <div className="space-y-6"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Browse by collection</p><h1 className="page-heading mt-1 text-3xl font-extrabold text-slate-900">Categories</h1><p className="mt-1 text-sm text-slate-500">Find products grouped around the way you shop.</p></div>{categories.length === 0 ? <EmptyState title="No categories are available right now." description="Check back soon for new collections." /> : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{categories.map((category) => <Link key={category.category_id} to={`/customer/products?category=${encodeURIComponent(category.slug)}`} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg"><ProductImage src={category.image_url} alt={category.name} className="h-44 w-full transition duration-300 group-hover:scale-105" /><div className="p-4"><div className="flex items-center gap-2 text-indigo-600"><FolderTree size={15} /><span className="text-xs font-bold uppercase tracking-wider">Collection</span></div><h2 className="mt-2 text-lg font-extrabold text-slate-900">{category.name}</h2><p className="mt-1 text-sm text-slate-500">{category.product_count} products</p><div className="mt-4 flex items-center gap-1 text-sm font-bold text-indigo-600">Browse <ArrowRight size={15} /></div></div></Link>)}</div>}</div>;
}
