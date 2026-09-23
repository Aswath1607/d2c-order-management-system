import { NavLink, Outlet } from 'react-router-dom';
import { Boxes, ChartNoAxesCombined, ClipboardList, FolderTree, LayoutDashboard, LogOut, PackageSearch, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const navItems = [
  { label: 'Dashboard', to: '/admin', icon: LayoutDashboard },
  { label: 'Products', to: '/admin/products', icon: PackageSearch },
  { label: 'Categories', to: '/admin/categories', icon: FolderTree },
  { label: 'Customers', to: '/admin/customers', icon: Users },
  { label: 'Orders', to: '/admin/orders', icon: ClipboardList },
  { label: 'Inventory', to: '/admin/inventory', icon: Boxes },
];

export default function AdminLayout() {
  const { logout } = useAuth();
  const { addToast } = useToast();

  return (
    <div className="min-h-screen bg-[#f7f8fc] md:flex">
      <aside className="w-full max-w-full overflow-hidden border-b border-slate-800 bg-[#111827] text-white md:fixed md:inset-y-0 md:w-64 md:border-b-0">
        <div className="flex items-center justify-between px-5 py-5 md:block">
          <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500 text-xs font-bold">D2</span><div><div className="font-bold tracking-tight">D2C</div><div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Operations</div></div></div>
          <ChartNoAxesCombined className="text-slate-500 md:hidden" size={20} />
        </div>
          <nav className="grid max-w-full grid-cols-6 gap-1 px-3 pb-3 md:block md:space-y-1 md:px-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `flex items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-semibold transition ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
                <item.icon size={17} /><span className="hidden md:inline">{item.label}</span>
            </NavLink>
          ))}
          <button onClick={() => { logout(); addToast('Logged out successfully', 'info'); }} className="col-span-6 mt-1 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 px-3 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-red-600 hover:text-white md:mt-4 md:justify-start"><LogOut size={16} /> <span className="hidden md:inline">Logout</span></button>
        </nav>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:ml-64 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
