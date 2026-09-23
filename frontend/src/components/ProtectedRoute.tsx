import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Props {
  requireAuth?: boolean;
  allowedRoles?: Array<'ADMIN' | 'CUSTOMER'>;
}

export function ProtectedRoute({ requireAuth = true, allowedRoles }: Props) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-600">Loading...</div>;
  }

  if (requireAuth && !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/customer'} replace />;
  }

  return <Outlet />;
}
