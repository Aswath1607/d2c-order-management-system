import { useEffect, useState } from 'react';
import { orderApi } from '../../services/orderApi';
import type { OrderAssignment } from '../../types';
import Button from '../../components/ui/Button';

export default function WorkerPage() {
  const [assignments, setAssignments] = useState<OrderAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try { setAssignments((await orderApi.myWorkerAssignments()).data.items); }
    catch (err: any) { setError(err?.response?.data?.detail || 'Unable to load assignments.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const update = async (id: number, action: 'accept' | 'start' | 'pack') => {
    try {
      if (action === 'accept') await orderApi.acceptAssignment(id);
      else await orderApi.fulfillAssignment(id, action === 'start' ? 'START_PROCESSING' : 'MARK_PACKED');
      await load();
    }
    catch (err: any) { setError(err?.response?.data?.detail || 'Unable to update assignment.'); }
  };

  if (loading) return <div className="text-slate-600">Loading assignments...</div>;
  return <div className="mx-auto max-w-3xl space-y-5"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Worker workspace</p><h1 className="mt-1 text-3xl font-extrabold text-slate-900">My Assignments</h1></div>{error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}{assignments.length === 0 ? <div className="rounded-2xl bg-white p-8 text-center shadow-sm"><h2 className="text-xl font-bold text-slate-900">No assignments yet</h2><p className="mt-2 text-slate-500">Assigned orders will appear here.</p></div> : <div className="space-y-3">{assignments.map((assignment) => <div key={assignment.id} className="surface flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="font-bold text-slate-900">{assignment.order_number}</div><div className="mt-1 text-sm text-slate-500">Order status: {assignment.order_status} · Assignment: {assignment.status}</div></div><div className="flex gap-2">{assignment.status === 'ASSIGNED' && <Button size="sm" onClick={() => void update(assignment.id, 'accept')}>Accept</Button>}{assignment.status === 'ACCEPTED' && assignment.order_status === 'CONFIRMED' && <Button size="sm" onClick={() => void update(assignment.id, 'start')}>Start processing</Button>}{assignment.status === 'ACCEPTED' && assignment.order_status === 'PROCESSING' && <Button size="sm" onClick={() => void update(assignment.id, 'pack')}>Mark packed</Button>}</div></div>)}</div>}</div>;
}