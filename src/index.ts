// ============================================================================
// BusinessHub Enterprise - Main Cloudflare Worker API Entrypoint
// Architecture: Modular Monolith with Layered Repositories and Domain Services
// ============================================================================

import { Router, RouteContext, jsonResponse, Env } from '@/lib/router';
import { parseCookies } from '@/lib/auth';

import { UserRepository } from '@/repositories/UserRepository';
import { ProductRepository } from '@/repositories/ProductRepository';
import { InventoryRepository } from '@/repositories/InventoryRepository';
import { CustomerRepository } from '@/repositories/CustomerRepository';
import { SupplierRepository } from '@/repositories/SupplierRepository';
import { SalesRepository } from '@/repositories/SalesRepository';
import { PurchaseRepository } from '@/repositories/PurchaseRepository';
import { CollectionRepository } from '@/repositories/CollectionRepository';
import { ExpenseRepository } from '@/repositories/ExpenseRepository';
import { SettingsRepository } from '@/repositories/SettingsRepository';
import { AuditRepository } from '@/repositories/AuditRepository';

import { AuthService } from '@/services/AuthService';
import { ProductService } from '@/services/ProductService';
import { InventoryService } from '@/services/InventoryService';
import { SalesService } from '@/services/SalesService';
import { PurchaseService } from '@/services/PurchaseService';
import { CollectionService } from '@/services/CollectionService';
import { FinancialService } from '@/services/FinancialService';

const router = new Router();

// --- 1. GLOBAL CORS MIDDLEWARE ---
router.use(async (ctx: RouteContext, next) => {
  const origin = ctx.request.headers.get('Origin') || '*';
  const response = await next();
  
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Access-Control-Allow-Credentials', 'true');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Idempotency-Key');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
});

// --- 2. AUTHENTICATION MIDDLEWARE ---
async function requireAuth(ctx: RouteContext, next: () => Promise<Response>): Promise<Response> {
  const cookies = parseCookies(ctx.request);
  const token = cookies['session_token'] || ctx.request.headers.get('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return jsonResponse({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, 401);
  }

  const userRepo = new UserRepository(ctx.env.DB);
  const authService = new AuthService(userRepo, ctx.env.DB);
  const user = await authService.validateSession(token);

  if (!user || !user.isActive) {
    return jsonResponse({ success: false, error: { code: 'UNAUTHORIZED', message: 'Session expired or invalid' } }, 401);
  }

  ctx.userId = user.id;
  ctx.userRole = user.role;
  return await next();
}

// --- 3. HEALTH & STATUS ---
router.get('/api/v1/health', async () => {
  return jsonResponse({
    success: true,
    data: {
      status: 'healthy',
      system: 'BusinessHub Enterprise',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    },
  });
});

// --- 4. AUTHENTICATION ENDPOINTS ---
router.post('/api/v1/auth/login', async (ctx: RouteContext) => {
  const body = await ctx.request.json<any>();
  if (!body.email || !body.password) {
    return jsonResponse({ success: false, error: { code: 'VALIDATION_FAILED', message: 'Email and password are required' } }, 422);
  }

  const userRepo = new UserRepository(ctx.env.DB);
  const authService = new AuthService(userRepo, ctx.env.DB);

  const ip = ctx.request.headers.get('CF-Connecting-IP') || undefined;
  const ua = ctx.request.headers.get('User-Agent') || undefined;

  const result = await authService.login(body.email, body.password, ip, ua);

  // Set-Cookie header with HttpOnly, Secure, SameSite=Strict
  const cookieVal = `session_token=${result.token}; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=604800`;
  return jsonResponse({ success: true, data: result.user }, 200, { 'Set-Cookie': cookieVal });
});

router.post('/api/v1/auth/logout', async (ctx: RouteContext) => {
  const cookies = parseCookies(ctx.request);
  const token = cookies['session_token'];

  if (token) {
    const userRepo = new UserRepository(ctx.env.DB);
    const authService = new AuthService(userRepo, ctx.env.DB);
    await authService.logout(token);
  }

  const cookieVal = `session_token=; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
  return jsonResponse({ success: true, data: { message: 'Logged out successfully' } }, 200, { 'Set-Cookie': cookieVal });
}, requireAuth);

router.get('/api/v1/auth/me', async (ctx: RouteContext) => {
  const userRepo = new UserRepository(ctx.env.DB);
  const user = await userRepo.findById(ctx.userId!);
  if (!user) {
    return jsonResponse({ success: false, error: { code: 'NOT_FOUND', message: 'User profile not found' } }, 404);
  }
  const { passwordHash: _, passwordSalt: __, ...sanitized } = user;
  return jsonResponse({ success: true, data: sanitized });
}, requireAuth);

// --- 5. PRODUCT MANAGEMENT ENDPOINTS ---
router.get('/api/v1/products', async (ctx: RouteContext) => {
  const search = ctx.url.searchParams.get('search') || undefined;
  const categoryId = ctx.url.searchParams.get('categoryId') || undefined;
  const limit = parseInt(ctx.url.searchParams.get('limit') || '50', 10);
  const offset = parseInt(ctx.url.searchParams.get('offset') || '0', 10);

  const prodRepo = new ProductRepository(ctx.env.DB);
  const invRepo = new InventoryRepository(ctx.env.DB);
  const auditRepo = new AuditRepository(ctx.env.DB);
  const prodService = new ProductService(prodRepo, invRepo, auditRepo);

  const result = await prodService.list({ search, categoryId, limit, offset });
  return jsonResponse({ success: true, data: result.items, meta: { total: result.total, limit, offset } });
}, requireAuth);

router.post('/api/v1/products', async (ctx: RouteContext) => {
  const body = await ctx.request.json<any>();
  const prodRepo = new ProductRepository(ctx.env.DB);
  const invRepo = new InventoryRepository(ctx.env.DB);
  const auditRepo = new AuditRepository(ctx.env.DB);
  const prodService = new ProductService(prodRepo, invRepo, auditRepo);

  const created = await prodService.create(body, ctx.userId!);
  return jsonResponse({ success: true, data: created }, 201);
}, requireAuth);

router.get('/api/v1/products/:id', async (ctx: RouteContext) => {
  const prodRepo = new ProductRepository(ctx.env.DB);
  const product = await prodRepo.findById(ctx.params.id);
  if (!product) {
    return jsonResponse({ success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } }, 404);
  }
  return jsonResponse({ success: true, data: product });
}, requireAuth);

router.put('/api/v1/products/:id', async (ctx: RouteContext) => {
  const body = await ctx.request.json<any>();
  const prodRepo = new ProductRepository(ctx.env.DB);
  const invRepo = new InventoryRepository(ctx.env.DB);
  const auditRepo = new AuditRepository(ctx.env.DB);
  const prodService = new ProductService(prodRepo, invRepo, auditRepo);

  const updated = await prodService.update(ctx.params.id, body, ctx.userId!);
  return jsonResponse({ success: true, data: updated });
}, requireAuth);

router.delete('/api/v1/products/:id', async (ctx: RouteContext) => {
  const prodRepo = new ProductRepository(ctx.env.DB);
  const invRepo = new InventoryRepository(ctx.env.DB);
  const auditRepo = new AuditRepository(ctx.env.DB);
  const prodService = new ProductService(prodRepo, invRepo, auditRepo);

  await prodService.deactivate(ctx.params.id, ctx.userId!);
  return jsonResponse({ success: true, data: { message: 'Product deactivated' } });
}, requireAuth);

// --- 6. INVENTORY MANAGEMENT ENDPOINTS ---
router.get('/api/v1/inventory', async (ctx: RouteContext) => {
  const invRepo = new InventoryRepository(ctx.env.DB);
  const balances = await invRepo.listAllBalances();
  return jsonResponse({ success: true, data: balances });
}, requireAuth);

router.get('/api/v1/inventory/:productId/movements', async (ctx: RouteContext) => {
  const invRepo = new InventoryRepository(ctx.env.DB);
  const movements = await invRepo.listMovements(ctx.params.productId);
  return jsonResponse({ success: true, data: movements });
}, requireAuth);

router.post('/api/v1/inventory/adjust', async (ctx: RouteContext) => {
  const body = await ctx.request.json<any>();
  const invRepo = new InventoryRepository(ctx.env.DB);
  const invService = new InventoryService(invRepo);

  await invService.adjustStock(body.productId, body.quantityMilliUnits, body.type, body.reason, ctx.userId!);
  return jsonResponse({ success: true, data: { message: 'Stock adjusted successfully' } });
}, requireAuth);

// --- 7. PURCHASING & SUPPLIERS ENDPOINTS ---
router.get('/api/v1/suppliers', async (ctx: RouteContext) => {
  const suppRepo = new SupplierRepository(ctx.env.DB);
  const suppliers = await suppRepo.list({});
  return jsonResponse({ success: true, data: suppliers });
}, requireAuth);

router.post('/api/v1/suppliers', async (ctx: RouteContext) => {
  const body = await ctx.request.json<any>();
  const suppRepo = new SupplierRepository(ctx.env.DB);
  const supplierId = 'sup_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);

  const created = await suppRepo.create({
    ...body,
    id: supplierId,
    currentPayablePaise: 0,
    isActive: true,
  });
  return jsonResponse({ success: true, data: created }, 201);
}, requireAuth);

router.get('/api/v1/suppliers/:id/ledger', async (ctx: RouteContext) => {
  const suppRepo = new SupplierRepository(ctx.env.DB);
  const ledger = await suppRepo.getLedger(ctx.params.id);
  return jsonResponse({ success: true, data: ledger });
}, requireAuth);

router.get('/api/v1/purchases', async (ctx: RouteContext) => {
  const purchRepo = new PurchaseRepository(ctx.env.DB);
  const bills = await purchRepo.list({});
  return jsonResponse({ success: true, data: bills });
}, requireAuth);

router.post('/api/v1/purchases', async (ctx: RouteContext) => {
  const body = await ctx.request.json<any>();
  const purchRepo = new PurchaseRepository(ctx.env.DB);
  const invRepo = new InventoryRepository(ctx.env.DB);
  const suppRepo = new SupplierRepository(ctx.env.DB);
  const auditRepo = new AuditRepository(ctx.env.DB);
  const invService = new InventoryService(invRepo);
  const purchService = new PurchaseService(purchRepo, invService, suppRepo, auditRepo);

  const created = await purchService.createBill(body.bill, body.items, ctx.userId!);
  return jsonResponse({ success: true, data: created }, 201);
}, requireAuth);

router.post('/api/v1/purchases/:id/confirm', async (ctx: RouteContext) => {
  const purchRepo = new PurchaseRepository(ctx.env.DB);
  const invRepo = new InventoryRepository(ctx.env.DB);
  const suppRepo = new SupplierRepository(ctx.env.DB);
  const auditRepo = new AuditRepository(ctx.env.DB);
  const invService = new InventoryService(invRepo);
  const purchService = new PurchaseService(purchRepo, invService, suppRepo, auditRepo);

  const confirmed = await purchService.confirmBill(ctx.params.id, ctx.userId!);
  return jsonResponse({ success: true, data: confirmed });
}, requireAuth);

// --- 8. SALES & CUSTOMERS ENDPOINTS ---
router.get('/api/v1/customers', async (ctx: RouteContext) => {
  const custRepo = new CustomerRepository(ctx.env.DB);
  const customers = await custRepo.list({});
  return jsonResponse({ success: true, data: customers });
}, requireAuth);

router.post('/api/v1/customers', async (ctx: RouteContext) => {
  const body = await ctx.request.json<any>();
  const custRepo = new CustomerRepository(ctx.env.DB);
  const customerId = 'cus_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);

  const created = await custRepo.create({
    ...body,
    id: customerId,
    currentReceivablePaise: 0,
    isActive: true,
  });
  return jsonResponse({ success: true, data: created }, 201);
}, requireAuth);

router.get('/api/v1/customers/:id/ledger', async (ctx: RouteContext) => {
  const custRepo = new CustomerRepository(ctx.env.DB);
  const ledger = await custRepo.getLedger(ctx.params.id);
  return jsonResponse({ success: true, data: ledger });
}, requireAuth);

router.get('/api/v1/sales', async (ctx: RouteContext) => {
  const salesRepo = new SalesRepository(ctx.env.DB);
  const invoices = await salesRepo.list({});
  return jsonResponse({ success: true, data: invoices });
}, requireAuth);

router.post('/api/v1/sales', async (ctx: RouteContext) => {
  const body = await ctx.request.json<any>();
  const salesRepo = new SalesRepository(ctx.env.DB);
  const invRepo = new InventoryRepository(ctx.env.DB);
  const custRepo = new CustomerRepository(ctx.env.DB);
  const settingsRepo = new SettingsRepository(ctx.env.DB);
  const auditRepo = new AuditRepository(ctx.env.DB);
  const invService = new InventoryService(invRepo);
  const salesService = new SalesService(salesRepo, invService, custRepo, settingsRepo, auditRepo);

  const created = await salesService.createInvoice(body.invoice, body.items, ctx.userId!);
  return jsonResponse({ success: true, data: created }, 201);
}, requireAuth);

router.post('/api/v1/sales/:id/confirm', async (ctx: RouteContext) => {
  const salesRepo = new SalesRepository(ctx.env.DB);
  const invRepo = new InventoryRepository(ctx.env.DB);
  const custRepo = new CustomerRepository(ctx.env.DB);
  const settingsRepo = new SettingsRepository(ctx.env.DB);
  const auditRepo = new AuditRepository(ctx.env.DB);
  const invService = new InventoryService(invRepo);
  const salesService = new SalesService(salesRepo, invService, custRepo, settingsRepo, auditRepo);

  const confirmed = await salesService.confirmInvoice(ctx.params.id, ctx.userId!);
  return jsonResponse({ success: true, data: confirmed });
}, requireAuth);

// --- 9. COLLECTIONS ENDPOINTS ---
router.get('/api/v1/collections', async (ctx: RouteContext) => {
  const collRepo = new CollectionRepository(ctx.env.DB);
  const collections = await collRepo.list({});
  return jsonResponse({ success: true, data: collections });
}, requireAuth);

router.post('/api/v1/collections', async (ctx: RouteContext) => {
  const body = await ctx.request.json<any>();
  const collRepo = new CollectionRepository(ctx.env.DB);
  const salesRepo = new SalesRepository(ctx.env.DB);
  const custRepo = new CustomerRepository(ctx.env.DB);
  const auditRepo = new AuditRepository(ctx.env.DB);
  const collService = new CollectionService(collRepo, salesRepo, custRepo, auditRepo);

  const created = await collService.recordCollection(body.collection, body.allocations, ctx.userId!);
  return jsonResponse({ success: true, data: created }, 201);
}, requireAuth);

// --- 10. EXPENSES ENDPOINTS ---
router.get('/api/v1/expenses', async (ctx: RouteContext) => {
  const expRepo = new ExpenseRepository(ctx.env.DB);
  const expenses = await expRepo.list({});
  return jsonResponse({ success: true, data: expenses });
}, requireAuth);

router.post('/api/v1/expenses', async (ctx: RouteContext) => {
  const body = await ctx.request.json<any>();
  const expRepo = new ExpenseRepository(ctx.env.DB);
  const voucherNumber = 'EXP-' + Date.now().toString().slice(-6);
  const expenseId = 'exp_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);

  const created = await expRepo.create({
    ...body,
    id: expenseId,
    voucherNumber,
    createdBy: ctx.userId!,
  });
  return jsonResponse({ success: true, data: created }, 201);
}, requireAuth);

// --- 11. FINANCIAL REPORTING ENDPOINTS ---
router.get('/api/v1/reports/profit-loss', async (ctx: RouteContext) => {
  const startDate = ctx.url.searchParams.get('startDate') || '2026-01-01';
  const endDate = ctx.url.searchParams.get('endDate') || '2026-12-31';

  const finService = new FinancialService(ctx.env.DB);
  const pnl = await finService.getProfitAndLoss(startDate, endDate);
  return jsonResponse({ success: true, data: pnl });
}, requireAuth);

// --- 12. SETTINGS ENDPOINTS ---
router.get('/api/v1/settings', async (ctx: RouteContext) => {
  const settingsRepo = new SettingsRepository(ctx.env.DB);
  const settings = await settingsRepo.get();
  return jsonResponse({ success: true, data: settings });
}, requireAuth);

router.put('/api/v1/settings', async (ctx: RouteContext) => {
  const body = await ctx.request.json<any>();
  const settingsRepo = new SettingsRepository(ctx.env.DB);
  const updated = await settingsRepo.update(body);
  return jsonResponse({ success: true, data: updated });
}, requireAuth);

// --- 13. CLOUDFLARE WORKER DEFAULT EXPORT ---
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return await router.handle(request, env);
  },
};
