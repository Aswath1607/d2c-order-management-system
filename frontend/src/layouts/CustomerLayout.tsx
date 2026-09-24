import { ClipboardList, FolderTree, Home, PackageSearch, ShoppingBag, UserRound } from 'lucide-react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import ThemeToggle from '../components/ui/ThemeToggle';

const navItems = [
  { label: 'Home', to: '/customer', icon: Home },
  { label: 'Products', to: '/customer/products', icon: PackageSearch },
  { label: 'Categories', to: '/customer/categories', icon: FolderTree },
  { label: 'Cart', to: '/customer/cart', icon: ShoppingBag },
  { label: 'Orders', to: '/customer/orders', icon: ClipboardList },
  { label: 'Profile', to: '/customer/profile', icon: UserRound },
];

export default function CustomerLayout() {
  const { logout } = useAuth();
  const { itemCount } = useCart();
  const { addToast } = useToast();

  return (
    <div className="min-h-screen bg-[#f7f8fc] text-slate-800">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 lg:px-6">
          <Link to="/customer" className="flex items-center"><img src="/branding/aurevia-mark-exact.png" alt="Aurevia" className="h-9 w-9 object-contain sm:hidden" /><img src="/branding/aurevia-logo-exact.png" alt="Aurevia" className="hidden h-10 w-auto object-contain sm:block" /></Link>
          <nav className="flex items-center gap-1 overflow-x-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
              >
                <span className="flex items-center gap-1.5"><item.icon size={16} /><span className="hidden sm:inline">{item.label}</span>{item.label === 'Cart' && itemCount > 0 && <span className="rounded-full bg-indigo-600 px-1.5 text-[10px] text-white">{itemCount}</span>}</span>
              </NavLink>
            ))}
            <ThemeToggle /><button onClick={() => { logout(); addToast('Logged out successfully', 'info'); }} className="ml-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-slate-700">Logout</button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 lg:px-6 lg:py-8">
        <Outlet />
      </main>
    </div>
  );
}
