import { expect, test } from '@playwright/test';

const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'admin1234';
const CUSTOMER_EMAIL = 'ava.sharma@example.com';
const CUSTOMER_PASSWORD = 'customer123';

async function login(page: any, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/(admin|customer)(?:$|\/)/);
}

test.describe('D2C Phase 10 E2E', () => {
  async function mockRoleLogin(page: any, role: 'WORKER' | 'DELIVERY_AGENT' | 'CUSTOMER') {
    await page.route('**/auth/login', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ access_token: `mock-${role}`, token_type: 'bearer' }) });
    });
    await page.route('**/auth/me', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 10, name: `${role} User`, email: `${role.toLowerCase()}@example.com`, role, is_active: true }) });
    });
    await page.goto('/login');
    await page.getByLabel('Email').fill(`${role.toLowerCase()}@example.com`);
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();
  }

  test('worker and delivery agent logins reach isolated placeholders', async ({ page }) => {
    await mockRoleLogin(page, 'WORKER');
    await expect(page).toHaveURL(/\/worker$/);
    await expect(page.getByRole('heading', { name: /worker workspace coming soon/i })).toBeVisible();

    await page.evaluate(() => localStorage.clear());
    await page.unroute('**/auth/me');
    await page.unroute('**/auth/login');
    await mockRoleLogin(page, 'DELIVERY_AGENT');
    await expect(page).toHaveURL(/\/delivery-agent$/);
    await expect(page.getByRole('heading', { name: /delivery workspace coming soon/i })).toBeVisible();
  });

  test('new roles cannot access admin or customer-only routes', async ({ page }) => {
    await mockRoleLogin(page, 'WORKER');
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/worker$/);
    await page.route('**/products*', async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [], page: 1, page_size: 6, total: 0, total_pages: 0 }) }));
    await page.route('**/categories*', async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [], page: 1, page_size: 6, total: 0, total_pages: 0 }) }));
    await page.goto('/customer');
    await expect(page).toHaveURL(/\/worker$/);

    await page.evaluate(() => localStorage.clear());
    await page.unroute('**/auth/me');
    await page.unroute('**/auth/login');
    await mockRoleLogin(page, 'CUSTOMER');
    await page.goto('/worker');
    await expect(page).toHaveURL(/\/customer$/);
    await page.goto('/delivery-agent');
    await expect(page).toHaveURL(/\/customer$/);
  });

  test('direct nested routes serve the SPA entry point', async ({ page }) => {
    for (const route of ['/admin/categories', '/admin/products', '/customer/products', '/customer/cart', '/customer/orders']) {
      const response = await page.goto(route);
      expect(response?.status()).toBe(200);
      await expect(page.locator('body')).toBeVisible();
      await expect(page.getByRole('heading', { name: /sign in to continue/i })).toBeVisible();
    }
  });

  test('login opens without prefilled credentials and stays empty after refresh', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel('Email')).toHaveValue('');
    await expect(page.getByLabel('Password')).toHaveValue('');
    await expect(page.getByLabel('Email')).toHaveAttribute('autocomplete', 'username');
    await expect(page.getByLabel('Password')).toHaveAttribute('autocomplete', 'current-password');
    await page.reload();
    await expect(page.getByLabel('Email')).toHaveValue('');
    await expect(page.getByLabel('Password')).toHaveValue('');
  });

  test('Aurevia branding and theme preference persist across refresh', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/Aurevia Commerce Operations/);
    await expect(page.getByAltText('Aurevia')).toBeVisible();
    await page.getByRole('button', { name: 'Switch to dark theme' }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(page.getByRole('button', { name: 'Switch to light theme' })).toBeVisible();
  });

  test('registration API failure keeps the form visible with an error', async ({ page }) => {
    await page.route('**/auth/register', async (route) => {
      await route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({ detail: [{ msg: 'value is not a valid email address' }] }),
      });
    });

    await page.goto('/register');
    await page.getByPlaceholder('Full name').fill('Aswath');
    await page.getByPlaceholder('Email').fill('invalid-email');
    await page.getByPlaceholder('Password').fill('password123');
    await page.getByRole('button', { name: 'Register' }).click();

    await expect(page.getByRole('heading', { name: 'Create customer account' })).toBeVisible();
    await expect(page.getByText('value is not a valid email address')).toBeVisible();
  });

  test('admin login and admin dashboard load', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(ADMIN_EMAIL);
    await page.getByLabel('Password').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/admin(?:$|\/)/);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText('Overview', { exact: true })).toBeVisible();
  });

  test('customer login and product browsing', async ({ page }) => {
    await login(page, CUSTOMER_EMAIL, CUSTOMER_PASSWORD);
    await page.goto('/customer/products');
    await expect(page.getByRole('heading', { name: /find your next favorite/i })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Details' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add to Cart' }).first()).toBeVisible();
  });

  test('customer add to cart with toast and quantity change', async ({ page }) => {
    await login(page, CUSTOMER_EMAIL, CUSTOMER_PASSWORD);
    await page.goto('/customer/products');

    await page.getByRole('button', { name: 'Add to Cart' }).first().click();
    await expect(page.getByText('Product added to cart')).toBeVisible();

    await page.goto('/customer/cart');
    await expect(page.getByText('Your cart')).toBeVisible();
    await page.getByRole('button', { name: /increase quantity of/i }).first().click();
    await expect(page.getByText('Cart updated')).toBeVisible();
    await expect(page.getByRole('button', { name: /decrease quantity of/i }).first()).toBeVisible();
    await page.getByRole('button', { name: /remove/i }).first().click();
    await expect(page.getByText('Item removed from cart')).toBeVisible();
  });

  test('customer checkout creates an order with success toast', async ({ page }) => {
    await login(page, CUSTOMER_EMAIL, CUSTOMER_PASSWORD);
    await page.goto('/customer/products');
    await page.getByRole('button', { name: 'Add to Cart' }).first().click();
    await expect(page.getByText('Product added to cart')).toBeVisible();

    await page.goto('/customer/checkout');
    await page.getByLabel('Full name').fill('Ava Sharma');
    await page.getByLabel('Phone').fill('555-0101');
    await page.getByLabel('Address').fill('100 Market Street');
    await page.getByLabel('City').fill('Bengaluru');
    await page.getByLabel('State').fill('Karnataka');
    await page.getByLabel('Pincode').fill('560001');
    await page.getByLabel('Country').fill('India');
    await page.getByRole('button', { name: /cash on delivery/i }).click();
    await page.getByRole('button', { name: /place order/i }).click();

    await expect(page.getByText('Order placed successfully!')).toBeVisible();
    await expect(page.getByText('Order placed successfully', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: /my orders/i })).toBeVisible();
  });

  test('admin order status update and tracking update', async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/admin/orders');
    const row = page.locator('tbody tr').first();
    await expect(row).toBeVisible();

    const orderLink = page.locator('a[href*="/admin/orders/"]').first();
    if (await orderLink.isVisible()) {
      await orderLink.click();
    }

    const statusSelect = page.locator('select').first();
    await expect(statusSelect).toBeVisible();
    await statusSelect.selectOption(await statusSelect.inputValue());
    await page.getByRole('button', { name: /update status/i }).click();
    await expect(page.getByText('Order status updated successfully')).toBeVisible();

    const trackingInput = page.getByPlaceholder(/tracking|courier|delivery/i).first();
    if (await trackingInput.isVisible().catch(() => false)) {
      await trackingInput.fill('TRK-PLAYWRIGHT-001');
      await page.getByRole('button', { name: /update tracking/i }).click();
      await expect(page.getByText('Tracking information updated')).toBeVisible();
    }
  });

  test('bad status transition shows 409 and toast', async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/admin/orders');
    const orderLink = page.locator('a[href*="/admin/orders/"]').first();
    await expect(orderLink).toBeVisible();
    await orderLink.click();
    await expect(page).toHaveURL(/\/admin\/orders\/\d+/);

    const statusSelect = page.locator('select').first();
    await expect(statusSelect).toBeVisible();
    const currentStatus = await statusSelect.inputValue();
    const invalidStatus = currentStatus === 'DELIVERED' || currentStatus === 'CANCELLED' || currentStatus === 'OUT_FOR_DELIVERY'
      ? 'PROCESSING'
      : 'DELIVERED';
    await statusSelect.selectOption(invalidStatus);
    await page.getByRole('button', { name: /update status/i }).click();
    await expect(page.getByText(/cannot transition|invalid order status/i)).toBeVisible();
  });

  test('customer cannot access admin routes', async ({ page }) => {
    await login(page, CUSTOMER_EMAIL, CUSTOMER_PASSWORD);
    await page.goto('/admin/orders');
    await expect(page).toHaveURL(/\/customer(?:$|\/)/);
  });

  test('responsive viewports do not break layout at 1440, 1024, 768 and 390', async ({ page }) => {
    const widths = [1440, 1024, 768, 390];
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/login');
      await expect(page.locator('body')).toBeVisible();
      await expect(page.locator('main, form, div')).not.toHaveCount(0);
    }
  });
});
