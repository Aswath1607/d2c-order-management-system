import { NavLink, Outlet } from 'react-router-dom';
import { Boxes, ChartNoAxesCombined, ClipboardList, FolderTree, LayoutDashboard, LogOut, PackageSearch, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ThemeToggle from '../components/ui/ThemeToggle';

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
    <div className="min-h-screen bg-[#f7f8fc] md:flex dark:bg-slate-950">
        <aside className="w-full max-w-full overflow-hidden border-b border-slate-200 bg-white text-slate-800 dark:border-slate-800 dark:bg-[#111827] dark:text-white md:fixed md:inset-y-0 md:w-64 md:border-b-0">
          <div className="flex items-center justify-between px-5 py-5 md:block">
          <div className="flex items-center gap-3"><span className="brand-lockup"><img src="/branding/aurevia-mark-exact.png" alt="Aurevia" className="h-8 w-8 object-contain md:hidden" /><img src="/branding/aurevia-logo-exact.png" alt="Aurevia" className="hidden h-10 w-auto object-contain md:block" /></span><div className="sr-only">Commerce operations</div></div>
          <ChartNoAxesCombined className="text-slate-500 dark:text-slate-400 md:hidden" size={20} />
        </div>
          <nav className="grid max-w-full grid-cols-6 gap-1 px-3 pb-3 md:block md:space-y-1 md:px-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
                className={({ isActive }) => `flex items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-semibold transition ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/30' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'}`}
            >
                <item.icon size={17} /><span className="hidden md:inline">{item.label}</span>
            </NavLink>
          ))}
          <div className="col-span-6 mt-1 flex items-center gap-2 md:mt-4"><ThemeToggle /><button onClick={() => { logout(); addToast('Logged out successfully', 'info'); }} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-red-600 hover:text-white dark:border-slate-700 dark:text-slate-300 md:justify-start"><LogOut size={16} /> <span className="hidden md:inline">Logout</span></button></div>
        </nav>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:ml-64 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
