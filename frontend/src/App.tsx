import { Navigate, Route, Routes } from 'react-router-dom';

import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ToastProvider } from './context/ToastContext';
import PublicLayout from './layouts/PublicLayout';
import CustomerLayout from './layouts/CustomerLayout';
import AdminLayout from './layouts/AdminLayout';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import CustomerHomePage from './pages/customer/HomePage';
import ProductListPage from './pages/customer/ProductListPage';
import ProductDetailPage from './pages/customer/ProductDetailPage';
import CartPage from './pages/customer/CartPage';
import CheckoutPage from './pages/customer/CheckoutPage';
import OrdersPage from './pages/customer/OrdersPage';
import OrderDetailPage from './pages/customer/OrderDetailPage';
import ProfilePage from './pages/customer/ProfilePage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminProductsPage from './pages/admin/ProductsPage';
import AdminCustomersPage from './pages/admin/CustomersPage';
import AdminCustomerDetailPage from './pages/admin/CustomerDetailPage';
import AdminOrdersPage from './pages/admin/OrdersPage';
import AdminOrderDetailPage from './pages/admin/OrderDetailPage';
import AdminInventoryPage from './pages/admin/InventoryPage';
import AdminCategoriesPage from './pages/admin/CategoriesPage';
import CustomerCategoriesPage from './pages/customer/CategoriesPage';

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <ToastProvider>
          <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['CUSTOMER']} />}>
            <Route path="/customer" element={<CustomerLayout />}>
              <Route index element={<CustomerHomePage />} />
              <Route path="products" element={<ProductListPage />} />
              <Route path="categories" element={<CustomerCategoriesPage />} />
              <Route path="products/:id" element={<ProductDetailPage />} />
              <Route path="cart" element={<CartPage />} />
              <Route path="checkout" element={<CheckoutPage />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="orders/:id" element={<OrderDetailPage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="products" element={<AdminProductsPage />} />
              <Route path="categories" element={<AdminCategoriesPage />} />
              <Route path="customers" element={<AdminCustomersPage />} />
              <Route path="customers/:id" element={<AdminCustomerDetailPage />} />
              <Route path="orders" element={<AdminOrdersPage />} />
              <Route path="orders/:id" element={<AdminOrderDetailPage />} />
              <Route path="inventory" element={<AdminInventoryPage />} />
            </Route>
          </Route>
          </Routes>
        </ToastProvider>
      </CartProvider>
    </AuthProvider>
  );
}
