import { useEffect, useMemo, useState } from 'react';
import { BarChart3, BellRing, Boxes, CircleDollarSign, ShoppingCart, TrendingUp, Warehouse } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import StatCard from '../../components/StatCard';
import { dashboardApi } from '../../services/dashboardApi';
import { orderApi } from '../../services/orderApi';
import type { AlertItem, DashboardSummary, FastMovingProduct, InventoryStatus, ProductMetric, SalesSeries } from '../../types';
import { formatCurrency } from '../../utils/formatting';

const salesRangeOptions = [
  { label: 'Today', value: 1 },
  { label: '7 Days', value: 7 },
  { label: '30 Days', value: 30 },
  { label: '90 Days', value: 90 },
  { label: '1 Year', value: 365 },
];

const orderStatusColors: Record<string, string> = {
  PENDING: '#f59e0b',
  CONFIRMED: '#3b82f6',
  PROCESSING: '#8b5cf6',
  SHIPPED: '#14b8a6',
  OUT_FOR_DELIVERY: '#06b6d4',
  DELIVERED: '#10b981',
  CANCELLED: '#ef4444',
};

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [sales, setSales] = useState<SalesSeries[]>([]);
  const [topProducts, setTopProducts] = useState<ProductMetric[]>([]);
  const [fastMoving, setFastMoving] = useState<FastMovingProduct[]>([]);
  const [inventoryStatus, setInventoryStatus] = useState<InventoryStatus[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [recentOrders, setRecentOrders] = useState<Array<{ order_number: string; customer_id: number; total_amount: number; payment_status: string; order_status: string }>>([]);
  const [selectedRange, setSelectedRange] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const [summaryResult, salesResult, topProductsResult, fastMovingResult, inventoryStatusResult, alertsResult, orderStatusResult, recentOrdersResult] = await Promise.all([
        dashboardApi.summary(),
        dashboardApi.sales(selectedRange),
        dashboardApi.topProducts(5),
        dashboardApi.fastMovingProducts(selectedRange),
        dashboardApi.inventory(),
        dashboardApi.alerts(),
        dashboardApi.orders(),
        orderApi.list({ page: 1, page_size: 5 }),
      ]);
      setSummary(summaryResult.data);
      setSales(salesResult.data);
      setTopProducts(topProductsResult.data);
      setFastMoving(fastMovingResult.data);
      setInventoryStatus(inventoryStatusResult.data);
      setAlerts(alertsResult.data);
      setRecentOrders(recentOrdersResult.data.items);
      const statusCounts = orderStatusResult.data.items.reduce<Record<string, number>>((counts, order) => {
        counts[order.order_status] = (counts[order.order_status] ?? 0) + 1;
        return counts;
      }, {});
      setOrderStatusData(Object.entries(statusCounts).map(([status, value]) => ({
        name: status.replace(/_/g, ' '),
        value,
      })));
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Unable to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, [selectedRange]);

  const pieData = useMemo(() => [
    { name: 'Healthy', value: inventoryStatus.find((row) => row.status === 'HEALTHY')?.count ?? 0, color: '#10b981' },
    { name: 'Low stock', value: inventoryStatus.find((row) => row.status === 'LOW_STOCK')?.count ?? 0, color: '#f59e0b' },
    { name: 'Out of stock', value: inventoryStatus.find((row) => row.status === 'OUT_OF_STOCK')?.count ?? 0, color: '#ef4444' },
  ], [inventoryStatus]);

  const [orderStatusData, setOrderStatusData] = useState<Array<{ name: string; value: number }>>([]);

  if (loading) {
    return <div className="text-slate-600">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Overview</p><h1 className="page-heading mt-1 text-3xl font-extrabold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Monitor your store performance and inventory.</p>
        </div>
        <button onClick={() => void loadDashboard()} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">Refresh</button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Sales" value={formatCurrency(summary?.total_sales ?? 0)} accent="indigo" subtitle="All-time" />
        <StatCard title="Total Orders" value={String(summary?.total_orders ?? 0)} accent="emerald" subtitle="Orders" />
        <StatCard title="Total Customers" value={String(summary?.total_customers ?? 0)} accent="amber" subtitle="Active" />
        <StatCard title="Total Products" value={String(summary?.total_products ?? 0)} accent="slate" subtitle="Catalog" />
        <StatCard title="Today's Sales" value={formatCurrency(summary?.todays_sales ?? 0)} accent="indigo" subtitle="Today" />
        <StatCard title="Today's Orders" value={String(summary?.todays_orders ?? 0)} accent="emerald" subtitle="Today" />
        <StatCard title="Low Stock" value={String(summary?.low_stock_products ?? 0)} accent="amber" subtitle="Products" />
        <StatCard title="Out of Stock" value={String(summary?.out_of_stock_products ?? 0)} accent="red" subtitle="Products" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.8fr_1fr]">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-slate-800"><TrendingUp size={18} /> Sales Overview</div>
            <div className="flex gap-2">
              {salesRangeOptions.map((option) => (
                <button key={option.value} onClick={() => setSelectedRange(option.value)} className={`rounded-md px-2.5 py-1.5 text-xs font-medium ${selectedRange === option.value ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sales}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip formatter={(value: number) => formatCurrency(Number(value))} />
                <Legend />
                <Bar dataKey="sales" fill="#4f46e5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 font-semibold text-slate-800"><BarChart3 size={18} /> Inventory Overview</div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={80} innerRadius={45} label>
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 font-semibold text-slate-800"><ShoppingCart size={18} /> Top Selling Products</div>
          <div className="space-y-3">
            {topProducts.map((item) => (
              <div key={item.product_id} className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                <div>
                  <div className="font-medium text-slate-800">{item.product_name}</div>
                  <div className="text-sm text-slate-500">{item.units_sold} units sold</div>
                </div>
                <div className="font-semibold text-indigo-600">{formatCurrency(item.revenue)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 font-semibold text-slate-800"><Boxes size={18} /> Fast Moving Products</div>
          <div className="space-y-3">
            {fastMoving.map((item) => (
              <div key={item.product_id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-slate-800">{item.product_name}</div>
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${item.days_of_stock !== null && item.days_of_stock < item.reorder_level ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {item.days_of_stock === null ? 'N/A' : `${item.days_of_stock.toFixed(1)} days`}
                  </span>
                </div>
                <div className="mt-2 text-sm text-slate-500">Units sold: {item.units_sold} • velocity: {item.sales_velocity.toFixed(2)}/day • available: {item.available_quantity}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 font-semibold text-slate-800"><Warehouse size={18} /> Order Status</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={orderStatusData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={120} />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {orderStatusData.map((entry) => (
                    <Cell key={entry.name} fill={orderStatusColors[entry.name.toUpperCase().replace(/ /g, '_')] || '#94a3b8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 font-semibold text-slate-800"><BellRing size={18} /> Alerts</div>
          <div className="space-y-3">
            {alerts.length === 0 ? <div className="text-sm text-slate-500">No active alerts.</div> : alerts.slice(0, 6).map((alert) => (
              <div key={alert.alert_id} className={`rounded-lg border p-3 ${alert.severity === 'CRITICAL' ? 'border-red-200 bg-red-50' : alert.severity === 'WARNING' ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium text-slate-800">{alert.product_name}</div>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${alert.severity === 'CRITICAL' ? 'bg-red-600 text-white' : alert.severity === 'WARNING' ? 'bg-amber-500 text-white' : 'bg-slate-600 text-white'}`}>
                    {alert.severity}
                  </span>
                </div>
                <div className="mt-2 text-sm text-slate-600">{alert.message}</div>
                <div className="mt-2 text-xs text-slate-500">{alert.alert_type} • stock {alert.current_stock} • threshold {alert.threshold}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 font-semibold text-slate-800"><CircleDollarSign size={18} /> Recent Transactions</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="pb-3 font-medium">Order</th>
                <th className="pb-3 font-medium">Customer</th>
                <th className="pb-3 font-medium">Amount</th>
                <th className="pb-3 font-medium">Payment</th>
                <th className="pb-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr key={order.order_number} className="border-t border-slate-200">
                  <td className="py-3 text-slate-700">{order.order_number}</td>
                  <td className="py-3 text-slate-700">{order.customer_id}</td>
                  <td className="py-3 text-slate-700">{formatCurrency(order.total_amount)}</td>
                  <td className="py-3 text-slate-700">{order.payment_status}</td>
                  <td className="py-3"><span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">{order.order_status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
