import { Outlet } from 'react-router-dom';
import ThemeToggle from '../components/ui/ThemeToggle';

export default function PublicLayout() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_right,#e0e7ff_0,#f7f8fc_45%,#eef2ff_100%)] p-4 md:p-8 dark:bg-slate-950">
      <div className="absolute right-4 top-4"><ThemeToggle /></div>
      <div className="w-full max-w-6xl">
        <Outlet />
      </div>
    </div>
  );
}
