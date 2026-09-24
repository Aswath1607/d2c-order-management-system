export type Role = 'ADMIN' | 'CUSTOMER' | 'WORKER' | 'DELIVERY_AGENT';

export interface Category {
  category_id: number;
  category_slug?: string | null;
  name: string;
  slug: string;
  description?: string | null;
  image_url?: string | null;
  status: string;
  product_count: number;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Product {
  product_id: number;
  product_name: string;
  sku: string;
  category: string;
  category_id: number;
  description?: string | null;
  price: number;
  cost_price: number;
  discount: number;
  tax_rate: number;
  brand?: string | null;
  image_url?: string | null;
  weight: number;
  status: string;
  available_quantity?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface Inventory {
  inventory_id: number;
  product_id: number;
  product_name?: string | null;
  sku?: string | null;
  category?: string | null;
  product_status?: string | null;
  stock_quantity: number;
  reserved_quantity: number;
  damaged_quantity: number;
  reorder_level: number;
  reorder_quantity: number;
  warehouse_location?: string | null;
  supplier_name?: string | null;
  available_quantity: number;
  last_restocked_at?: string | null;
  updated_at?: string | null;
  product?: Product;
}

export interface Customer {
  customer_id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  country?: string | null;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export type CustomerProfilePayload = Omit<Customer, 'customer_id' | 'user_id' | 'status' | 'created_at' | 'updated_at'>;

export interface CustomerAdmin extends Customer {
  name: string;
  is_active: boolean;
  total_orders: number;
  total_spent: number;
  average_order_value: number;
  last_order_date?: string | null;
}

export interface OrderItem {
  order_item_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  discount: number;
  tax: number;
  subtotal: number;
}

export interface OrderStatusHistoryEntry {
  id: number;
  order_id: number;
  status: string;
  note?: string | null;
  changed_by?: string | null;
  created_at?: string | null;
}

export interface Order {
  order_id: number;
  order_number: string;
  customer_id: number;
  customer_name?: string | null;
  customer_email?: string | null;
  items_count?: number;
  order_date?: string | null;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  shipping_charge: number;
  total_amount: number;
  payment_status: string;
  payment_method?: string | null;
  order_status: string;
  shipping_address?: string | null;
  tracking_number?: string | null;
  courier_name?: string | null;
  estimated_delivery?: string | null;
  delivered_at?: string | null;
  cancelled_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  items: OrderItem[];
  status_history?: OrderStatusHistoryEntry[];
  payment?: Payment | null;
  assignments?: OrderAssignment[];
}

export interface OrderAssignment {
  id: number;
  order_id: number;
  order_number: string;
  order_status: string;
  assigned_to_user_id: number;
  assigned_to_name: string;
  assignment_type: 'WORKER' | 'DELIVERY_AGENT';
  status: 'ASSIGNED' | 'ACCEPTED' | 'COMPLETED' | 'REASSIGNED' | 'CANCELLED';
  assigned_by_user_id: number;
  assigned_at: string;
  accepted_at?: string | null;
  completed_at?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export type FulfillmentAction = 'START_PROCESSING' | 'MARK_PACKED' | 'MARK_OUT_FOR_DELIVERY' | 'MARK_DELIVERED';

export interface Payment {
  payment_id: number;
  order_id: number;
  payment_method: string;
  payment_status: string;
  amount: number;
  currency: string;
  provider: string;
  provider_transaction_id?: string | null;
  payment_reference?: string | null;
  failure_reason?: string | null;
  paid_at?: string | null;
  history?: Array<{ id: number; from_status?: string | null; to_status: string; note?: string | null; changed_by?: string | null; created_at?: string | null }>;
}

export interface DashboardSummary {
  total_sales: number;
  total_orders: number;
  total_customers: number;
  total_products: number;
  todays_sales: number;
  todays_orders: number;
  low_stock_products: number;
  out_of_stock_products: number;
}

export interface SalesSeries {
  period: string;
  sales: number;
  orders: number;
}

export interface ProductMetric {
  product_id: number;
  product_name: string;
  units_sold: number;
  revenue: number;
}

export interface FastMovingProduct {
  product_id: number;
  product_name: string;
  units_sold: number;
  sales_velocity: number;
  available_quantity: number;
  reorder_level: number;
  days_of_stock: number | null;
}

export interface InventoryStatus {
  status: string;
  count: number;
}

export interface AlertItem {
  alert_id: number;
  product_id: number;
  product_name: string;
  alert_type: string;
  severity: string;
  message: string;
  current_stock: number;
  threshold: number;
  is_read: boolean;
  created_at: string;
}

export interface ApiListResponse<T> {
  items: T[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}
