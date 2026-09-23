import { Outlet } from 'react-router-dom';

export default function PublicLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_right,#e0e7ff_0,#f7f8fc_45%,#eef2ff_100%)] p-4 md:p-8">
      <div className="w-full max-w-6xl">
        <Outlet />
      </div>
    </div>
  );
}
