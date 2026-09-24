import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { orderApi } from '../../services/orderApi';
import { staffApi, type StaffMember } from '../../services/staffApi';
import { useToast } from '../../context/ToastContext';
import type { Order } from '../../types';
import { formatCurrency } from '../../utils/formatting';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { ErrorState, LoadingState } from '../../components/ui/States';

const dateLabel = (value?: string | null) => value ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) : '-';
const statusTone = (status: string) => status === 'DELIVERED' ? 'green' : status === 'CANCELLED' ? 'red' : status === 'PROCESSING' || status === 'OUT_FOR_DELIVERY' ? 'amber' : 'indigo';

export default function AdminOrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [statusDraft, setStatusDraft] = useState('');
  const [note, setNote] = useState('');
  const [tracking, setTracking] = useState('');
  const [courier, setCourier] = useState('');
  const [estimated, setEstimated] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updatingTracking, setUpdatingTracking] = useState(false);
  const [updatingPayment, setUpdatingPayment] = useState(false);
  const [workers, setWorkers] = useState<StaffMember[]>([]);
  const [deliveryAgents, setDeliveryAgents] = useState<StaffMember[]>([]);
  const [workerId, setWorkerId] = useState('');
  const [agentId, setAgentId] = useState('');
  const [assigning, setAssigning] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [response, workersResponse, agentsResponse] = await Promise.all([orderApi.get(Number(id)), staffApi.workers(), staffApi.deliveryAgents()]);
      setOrder(response.data);
      setWorkers(workersResponse.data.filter((member) => member.is_active));
      setDeliveryAgents(agentsResponse.data.filter((member) => member.is_active));
      setStatusDraft(response.data.order_status);
      setTracking(response.data.tracking_number ?? '');
      setCourier(response.data.courier_name ?? '');
      setEstimated(response.data.estimated_delivery ?? '');
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [id]);
  const timeline = useMemo(() => order?.status_history?.slice().sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()) ?? [], [order]);

  const updateStatus = async () => {
    if (!order || updatingStatus) return;
    setUpdatingStatus(true);
    try { await orderApi.updateStatus(order.order_id, { status: statusDraft, note: note || undefined }); await load(); addToast('Order status updated successfully', 'success'); }
    catch (error: any) { addToast(error?.response?.data?.detail || 'Invalid order status transition.', 'error'); }
    finally { setUpdatingStatus(false); }
  };

  const updateTrackingInfo = async () => {
    if (!order || updatingTracking) return;
    setUpdatingTracking(true);
    try { await orderApi.updateTracking(order.order_id, { tracking_number: tracking || undefined, courier_name: courier || undefined, estimated_delivery: estimated || undefined }); await load(); addToast('Tracking information updated', 'success'); }
    catch (error: any) { addToast(error?.response?.data?.detail || 'Unable to update tracking.', 'error'); }
    finally { setUpdatingTracking(false); }
  };

  const markCodPaid = async () => {
    if (!order || updatingPayment || order.payment?.payment_status !== 'PAYMENT_PENDING') return;
    if (!window.confirm('Confirm that this COD payment was collected?')) return;
    setUpdatingPayment(true);
    try { await orderApi.markCodPaid(order.order_id); await load(); addToast('COD payment marked as paid', 'success'); }
    catch (error: any) { addToast(error?.response?.data?.detail || 'Unable to update payment.', 'error'); }
    finally { setUpdatingPayment(false); }
  };

  const assign = async (assignmentType: 'WORKER' | 'DELIVERY_AGENT') => {
    if (!order || assigning) return;
    const selectedId = assignmentType === 'WORKER' ? workerId : agentId;
    if (!selectedId) return;
    setAssigning(true);
    try {
      await orderApi.assign(order.order_id, { assigned_to_user_id: Number(selectedId), assignment_type: assignmentType });
      await load();
      if (assignmentType === 'WORKER') setWorkerId(''); else setAgentId('');
      addToast(`${assignmentType === 'WORKER' ? 'Worker' : 'Delivery agent'} assigned successfully`, 'success');
    } catch (error: any) {
      addToast(error?.response?.data?.detail || 'Unable to assign order.', 'error');
    } finally {
      setAssigning(false);
    }
  };

  const cancelAssignment = async (assignmentId: number) => {
    try {
      await orderApi.cancelAssignment(assignmentId);
      await load();
      addToast('Assignment cancelled', 'success');
    } catch (error: any) {
      addToast(error?.response?.data?.detail || 'Unable to cancel assignment.', 'error');
    }
  };

  if (loading) return <LoadingState label="Loading order details" />;
  if (error || !order) return <ErrorState onRetry={() => void load()} />;

  return (
    <div className="space-y-5">
      {order.payment?.payment_method === 'COD' && order.payment.payment_status === 'PAYMENT_PENDING' && <div className="surface flex flex-col gap-3 border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="font-bold text-amber-900">COD payment is pending</div><div className="text-sm text-amber-800">Confirm collection only after cash has been received.</div></div><Button onClick={() => void markCodPaid()} disabled={updatingPayment}>{updatingPayment ? 'Updating...' : 'Mark COD as Paid'}</Button></div>}
      <button onClick={() => navigate('/admin/orders')} className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600"><ArrowLeft size={16} /> Back to orders</button>
      <div className="surface flex flex-col justify-between gap-4 p-6 md:flex-row md:items-center"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Order</p><h1 className="page-heading mt-1 text-3xl font-extrabold text-slate-900">{order.order_number}</h1></div><div className="flex flex-wrap items-center gap-2"><Badge tone={statusTone(order.order_status)}>{order.order_status}</Badge><Badge tone={order.payment_status === 'PAYMENT_SUCCESS' ? 'green' : 'amber'}>{order.payment_status}</Badge></div></div>
      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-5">
          <div className="surface p-5"><h2 className="text-lg font-extrabold">Order summary</h2><div className="mt-5 grid gap-4 md:grid-cols-2"><div><div className="text-xs uppercase tracking-wide text-slate-400">Order date</div><div className="mt-1 font-medium text-slate-800">{dateLabel(order.order_date)}</div></div><div><div className="text-xs uppercase tracking-wide text-slate-400">Payment method</div><div className="mt-1 font-medium text-slate-800">{order.payment_method}</div></div><div><div className="text-xs uppercase tracking-wide text-slate-400">Payment reference</div><div className="mt-1 break-all font-medium text-slate-800">{order.payment?.payment_reference || 'Pending'}</div></div><div><div className="text-xs uppercase tracking-wide text-slate-400">Paid date</div><div className="mt-1 font-medium text-slate-800">{dateLabel(order.payment?.paid_at)}</div></div><div><div className="text-xs uppercase tracking-wide text-slate-400">Tracking</div><div className="mt-1 font-medium text-slate-800">{order.tracking_number || 'Not available yet'}</div></div><div><div className="text-xs uppercase tracking-wide text-slate-400">Estimated delivery</div><div className="mt-1 font-medium text-slate-800">{dateLabel(order.estimated_delivery)}</div></div></div></div>
          <div className="surface p-5"><h2 className="text-lg font-extrabold">Status and tracking</h2><div className="mt-4 grid gap-4 md:grid-cols-2"><label className="text-sm font-semibold text-slate-700">Order status<select value={statusDraft} onChange={(event) => setStatusDraft(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 font-normal"><option>{statusDraft}</option><option>PROCESSING</option><option>PACKED</option><option>SHIPPED</option><option>OUT_FOR_DELIVERY</option><option>DELIVERED</option><option>CANCELLED</option></select></label><label className="text-sm font-semibold text-slate-700">Note<input value={note} onChange={(event) => setNote(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 font-normal" /></label><Button onClick={() => void updateStatus()} disabled={updatingStatus}>{updatingStatus ? 'Updating...' : 'Update status'}</Button></div><div className="mt-6 grid gap-4 md:grid-cols-3"><label className="text-sm font-semibold text-slate-700">Tracking number<input value={tracking} onChange={(event) => setTracking(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 font-normal" /></label><label className="text-sm font-semibold text-slate-700">Courier<input value={courier} onChange={(event) => setCourier(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 font-normal" /></label><label className="text-sm font-semibold text-slate-700">Estimated delivery<input type="date" value={estimated ? estimated.slice(0, 10) : ''} onChange={(event) => setEstimated(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 font-normal" /></label></div><Button className="mt-4" variant="secondary" onClick={() => void updateTrackingInfo()} disabled={updatingTracking}>{updatingTracking ? 'Saving...' : 'Update tracking'}</Button></div>
          <div className="surface p-5"><h2 className="text-lg font-extrabold">Payment history</h2><div className="mt-4 space-y-2">{(order.payment?.history ?? []).map((entry) => <div key={entry.id} className="flex flex-col gap-1 rounded-lg bg-slate-50 p-3 text-sm sm:flex-row sm:items-center sm:justify-between"><span className="font-semibold text-slate-800">{entry.to_status}</span><span className="text-slate-500">{entry.note || ''}</span></div>)}</div></div>
          <div className="surface p-5"><h2 className="text-lg font-extrabold">Assignments</h2><div className="mt-4 grid gap-3 md:grid-cols-2"><div className="flex gap-2"><select aria-label="Select worker" value={workerId} onChange={(event) => setWorkerId(event.target.value)} className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 text-sm"><option value="">Select worker</option>{workers.map((member) => <option key={member.id} value={member.id}>{member.name} ({member.code})</option>)}</select><Button size="sm" onClick={() => void assign('WORKER')} disabled={!workerId || assigning}>Assign</Button></div><div className="flex gap-2"><select aria-label="Select delivery agent" value={agentId} onChange={(event) => setAgentId(event.target.value)} className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 text-sm"><option value="">Select delivery agent</option>{deliveryAgents.map((member) => <option key={member.id} value={member.id}>{member.name} ({member.code})</option>)}</select><Button size="sm" onClick={() => void assign('DELIVERY_AGENT')} disabled={!agentId || assigning}>Assign</Button></div></div><div className="mt-5 space-y-2">{(order.assignments ?? []).map((assignment) => <div key={assignment.id} className="flex flex-col gap-2 rounded-lg bg-slate-50 p-3 text-sm sm:flex-row sm:items-center sm:justify-between"><div><div className="font-semibold text-slate-800">{assignment.assignment_type === 'WORKER' ? 'Worker' : 'Delivery agent'}: {assignment.assigned_to_name}</div><div className="text-slate-500">{assignment.status} {assignment.notes ? `- ${assignment.notes}` : ''}</div></div>{(assignment.status === 'ASSIGNED' || assignment.status === 'ACCEPTED') && <Button size="sm" variant="secondary" onClick={() => void cancelAssignment(assignment.id)}>Cancel</Button>}</div>)}</div></div>
        </div>
        <div className="space-y-5"><div className="surface p-5"><h2 className="text-lg font-extrabold">Customer</h2><div className="mt-4 font-semibold text-slate-800">{order.customer_name ?? `Customer #${order.customer_id}`}</div><div className="mt-1 text-sm text-slate-500">{order.customer_email || 'Email unavailable'}</div></div><div className="surface p-5"><h2 className="text-lg font-extrabold">Order total</h2><div className="mt-4 flex justify-between text-sm text-slate-600"><span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div><div className="mt-2 flex justify-between text-sm text-slate-600"><span>Discount</span><span>-{formatCurrency(order.discount_amount)}</span></div><div className="mt-2 flex justify-between text-sm text-slate-600"><span>Tax and shipping</span><span>{formatCurrency(order.tax_amount + order.shipping_charge)}</span></div><div className="mt-4 flex justify-between border-t border-slate-100 pt-4 text-lg font-bold text-slate-900"><span>Total</span><span>{formatCurrency(order.total_amount)}</span></div></div></div>
      </div>
      <div className="surface p-5"><h2 className="text-lg font-extrabold">Order timeline</h2><div className="mt-4 space-y-2">{timeline.map((entry) => <div key={entry.id} className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 text-sm"><span className="font-semibold text-slate-800">{entry.status}</span><span className="text-slate-500">{dateLabel(entry.created_at)}{entry.changed_by ? ` by ${entry.changed_by}` : ''}</span></div>)}</div></div>
    </div>
  );
}
