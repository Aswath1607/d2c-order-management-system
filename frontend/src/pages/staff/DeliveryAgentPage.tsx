import { useEffect, useState } from 'react';
import { orderApi } from '../../services/orderApi';
import type { OrderAssignment } from '../../types';
import Button from '../../components/ui/Button';

export default function DeliveryAgentPage() {
  const [assignments, setAssignments] = useState<OrderAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = async () => { try { setAssignments((await orderApi.myDeliveryAssignments()).data.items); } catch (err: any) { setError(err?.response?.data?.detail || 'Unable to load deliveries.'); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);
  const update = async (id: number, action: 'accept' | 'outForDelivery' | 'delivered') => { try { if (action === 'accept') await orderApi.acceptAssignment(id); else await orderApi.fulfillAssignment(id, action === 'outForDelivery' ? 'MARK_OUT_FOR_DELIVERY' : 'MARK_DELIVERED'); await load(); } catch (err: any) { setError(err?.response?.data?.detail || 'Unable to update delivery assignment.'); } };
  if (loading) return <div className="text-slate-600">Loading deliveries...</div>;
  return <div className="mx-auto max-w-3xl space-y-5"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Delivery workspace</p><h1 className="mt-1 text-3xl font-extrabold text-slate-900">My Deliveries</h1></div>{error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}{assignments.length === 0 ? <div className="rounded-2xl bg-white p-8 text-center shadow-sm"><h2 className="text-xl font-bold text-slate-900">No deliveries yet</h2><p className="mt-2 text-slate-500">Assigned shipments will appear here.</p></div> : <div className="space-y-3">{assignments.map((assignment) => <div key={assignment.id} className="surface flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="font-bold text-slate-900">{assignment.order_number}</div><div className="mt-1 text-sm text-slate-500">Order status: {assignment.order_status} · Assignment: {assignment.status}</div></div><div className="flex gap-2">{assignment.status === 'ASSIGNED' && <Button size="sm" onClick={() => void update(assignment.id, 'accept')}>Accept</Button>}{assignment.status === 'ACCEPTED' && assignment.order_status === 'SHIPPED' && <Button size="sm" onClick={() => void update(assignment.id, 'outForDelivery')}>Mark out for delivery</Button>}{assignment.status === 'ACCEPTED' && assignment.order_status === 'OUT_FOR_DELIVERY' && <Button size="sm" onClick={() => void update(assignment.id, 'delivered')}>Mark delivered</Button>}</div></div>)}</div>}</div>;
}