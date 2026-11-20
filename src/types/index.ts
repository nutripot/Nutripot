// ============================================================================
// BusinessHub Enterprise Management System - Core Domain Types & Contracts
// Standards: Strict TypeScript, Integer Paise for Money, Milli-Units for Qty
// ============================================================================

// --- 1. PRIMITIVES & ENUMS ---

export type UserRole = 'OWNER' | 'ADMIN' | 'STAFF';

export type UnitOfMeasure = 'PCS' | 'KGS' | 'MTR' | 'LTR' | 'BOX';

export type TaxRateBps = 0 | 500 | 1200 | 1800 | 2800; // 0%, 5%, 12%, 18%, 28%

export type InventoryMovementType = 
  | 'PURCHASE_RECEIPT'
  | 'SALE_DISPATCH'
  | 'PURCHASE_RETURN'
  | 'SALE_RETURN'
  | 'ADJUSTMENT_ADD'
  | 'ADJUSTMENT_SUB'
  | 'DAMAGE_WRITE_OFF';

export type PurchaseBillStatus = 'DRAFT' | 'CONFIRMED' | 'PAID' | 'PARTIALLY_PAID' | 'CANCELLED';

export type SalesInvoiceStatus = 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED' | 'CREDITED';

export type PaymentMode = 'CASH' | 'BANK_TRANSFER' | 'UPI' | 'CHEQUE' | 'CARD' | 'CORPORATE_CARD';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    offset?: number;
  };
}

// --- 2. CORE DOMAIN ENTITIES ---

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  userId: string;
  tokenHash: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: string;
  createdAt: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  parentId?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  categoryId: string;
  uom: UnitOfMeasure;
  hsnCode: string;
  taxRateBps: TaxRateBps;
  costPricePaise: number;
  purchasePricePaise?: number;
  sellingPricePaise: number;
  minStockAlertLevel: number;
  reorderLevel?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryBalance {
  productId: string;
  currentStockMilliUnits: number;
  weightedAvgCostPaise: number;
  lastUpdatedAt: string;
}

export interface InventoryMovement {
  id: string;
  productId: string;
  movementType: InventoryMovementType;
  quantityMilliUnits: number;
  unitCostPaise: number;
  balanceAfterMilliUnits: number;
  referenceType: string;
  referenceId: string;
  notes?: string;
  createdAt: string;
  createdBy: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  gstin?: string;
  pan?: string;
  stateCode?: string;
  billingAddress: string;
  paymentTermsDays: number;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  bankName?: string;
  currentPayablePaise: number;
  currentBalancePaise?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierLedgerEntry {
  id: string;
  supplierId: string;
  entryDate: string;
  entryType: 'PURCHASE_BILL' | 'PAYMENT_DISBURSEMENT' | 'DEBIT_NOTE' | 'OPENING_BALANCE';
  transactionType?: string;
  referenceId: string;
  referenceNumber: string;
  debitPaise: number;
  creditPaise: number;
  runningBalancePaise: number;
  balanceAfterPaise?: number;
  description?: string;
  notes?: string;
  createdAt: string;
  createdBy: string;
}

export interface PurchaseBillItem {
  id: string;
  purchaseBillId: string;
  productId: string;
  quantityMilliUnits: number;
  unitPricePaise: number;
  taxRateBps: number;
  taxAmountPaise: number;
  discountPaise: number;
  totalAmountPaise: number;
}

export interface PurchaseBill {
  id: string;
  billNumber: string;
  supplierId: string;
  supplierBillNumber: string;
  supplierInvoiceNumber?: string;
  billDate: string;
  dueDate: string;
  status: PurchaseBillStatus;
  subtotalPaise: number;
  taxableAmountPaise?: number;
  taxAmountPaise: number;
  totalTaxPaise?: number;
  shippingChargesPaise: number;
  totalAmountPaise: number;
  paidAmountPaise: number;
  notes?: string;
  idempotencyKey?: string;
  items?: PurchaseBillItem[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface Customer {
  id: string;
  name: string;
  companyName?: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  gstin?: string;
  pan?: string;
  stateCode?: string;
  billingAddress: string;
  shippingAddress?: string;
  creditLimitPaise: number;
  creditDays: number;
  currentReceivablePaise: number;
  currentBalancePaise?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerLedgerEntry {
  id: string;
  customerId: string;
  entryDate: string;
  entryType: 'SALES_INVOICE' | 'COLLECTION_RECEIPT' | 'CREDIT_NOTE' | 'OPENING_BALANCE';
  transactionType?: string;
  referenceId: string;
  referenceNumber: string;
  debitPaise: number;
  creditPaise: number;
  runningBalancePaise: number;
  balanceAfterPaise?: number;
  description?: string;
  notes?: string;
  createdAt: string;
  createdBy: string;
}

export interface SalesInvoiceItem {
  id: string;
  salesInvoiceId: string;
  productId: string;
  quantityMilliUnits: number;
  unitPricePaise: number;
  taxRateBps: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  discountPaise: number;
  totalAmountPaise: number;
}

export interface SalesInvoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  invoiceDate: string;
  dueDate: string;
  placeOfSupply: string;
  status: SalesInvoiceStatus;
  subtotalPaise: number;
  taxableAmountPaise?: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  totalTaxPaise: number;
  shippingChargesPaise: number;
  totalAmountPaise: number;
  paidAmountPaise: number;
  notes?: string;
  idempotencyKey?: string;
  items?: SalesInvoiceItem[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface CollectionAllocation {
  id: string;
  collectionId: string;
  salesInvoiceId: string;
  allocatedPaise: number;
  createdAt: string;
}

export interface Collection {
  id: string;
  receiptNumber: string;
  customerId: string;
  paymentDate: string;
  paymentMode: PaymentMode;
  amountPaise: number;
  referenceNumber?: string;
  depositAccount: string;
  unallocatedPaise: number;
  notes?: string;
  allocations?: CollectionAllocation[];
  createdAt: string;
  createdBy: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Expense {
  id: string;
  voucherNumber: string;
  categoryId: string;
  expenseDate: string;
  amountPaise: number;
  taxAmountPaise?: number;
  paymentMode: PaymentMode;
  paymentAccount: string;
  payeeName: string;
  vendorName?: string;
  description: string;
  receiptR2Key?: string;
  taxDeductionPaise: number;
  createdAt: string;
  createdBy: string;
}

export type CollectionReceipt = Collection;

export interface Settings {
  id: string;
  companyName: string;
  tradeName?: string;
  gstin: string;
  pan: string;
  stateCode: string;
  stateName: string;
  address?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  pincode: string;
  phone: string;
  email: string;
  website?: string;
  logoR2Key?: string;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankIfsc: string;
  bankBranch?: string;
  bankUpiId?: string;
  invoicePrefix: string;
  nextInvoiceNumber: number;
  receiptPrefix: string;
  termsConditions?: string;
  allowNegativeStock: boolean;
  updatedAt: string;
  updatedBy: string;
}

export type CompanySettings = Settings;

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValuesJson?: string;
  newValuesJson?: string;
  ipAddress?: string;
  createdAt: string;
}

// --- 3. REPOSITORY INTERFACES ---

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(user: Omit<User, 'createdAt' | 'updatedAt'>): Promise<User>;
  updatePassword(id: string, hash: string, salt: string): Promise<void>;
  count(): Promise<number>;
}

export interface IProductRepository {
  findById(id: string): Promise<Product | null>;
  findBySku(sku: string): Promise<Product | null>;
  list(params: { search?: string; categoryId?: string; isActive?: boolean; limit?: number; offset?: number }): Promise<Product[]>;
  count(params: { search?: string; categoryId?: string; isActive?: boolean }): Promise<number>;
  create(product: Omit<Product, 'createdAt' | 'updatedAt'>): Promise<Product>;
  update(id: string, product: Partial<Product>): Promise<Product>;
  softDelete(id: string): Promise<void>;
}

export interface IInventoryRepository {
  getBalance(productId: string): Promise<InventoryBalance | null>;
  recordMovement(movement: Omit<InventoryMovement, 'createdAt'>): Promise<InventoryMovement>;
  updateBalance(productId: string, stockChangeMilli: number, newWacPaise?: number): Promise<InventoryBalance>;
  listMovements(productId: string, limit?: number): Promise<InventoryMovement[]>;
  listAllBalances(): Promise<Array<InventoryBalance & { sku: string; name: string }>>;
}

export interface IPurchaseRepository {
  findById(id: string): Promise<PurchaseBill | null>;
  list(params: { supplierId?: string; status?: PurchaseBillStatus; limit?: number; offset?: number }): Promise<PurchaseBill[]>;
  create(bill: Omit<PurchaseBill, 'createdAt' | 'updatedAt'>, items: Omit<PurchaseBillItem, 'id' | 'purchaseBillId'>[]): Promise<PurchaseBill>;
  updateStatus(id: string, status: PurchaseBillStatus): Promise<void>;
}

export interface ISalesRepository {
  findById(id: string): Promise<SalesInvoice | null>;
  list(params: { customerId?: string; status?: SalesInvoiceStatus; limit?: number; offset?: number }): Promise<SalesInvoice[]>;
  create(invoice: Omit<SalesInvoice, 'createdAt' | 'updatedAt'>, items: Omit<SalesInvoiceItem, 'id' | 'salesInvoiceId'>[]): Promise<SalesInvoice>;
  updateStatus(id: string, status: SalesInvoiceStatus, paidPaise?: number): Promise<void>;
}

export interface ICustomerRepository {
  findById(id: string): Promise<Customer | null>;
  list(params: { search?: string; limit?: number; offset?: number }): Promise<Customer[]>;
  create(customer: Omit<Customer, 'createdAt' | 'updatedAt'>): Promise<Customer>;
  updateBalance(id: string, balanceChangePaise: number): Promise<number>;
  appendLedger(entry: Omit<CustomerLedgerEntry, 'createdAt'>): Promise<CustomerLedgerEntry>;
  getLedger(customerId: string): Promise<CustomerLedgerEntry[]>;
}

export interface ISupplierRepository {
  findById(id: string): Promise<Supplier | null>;
  list(params: { search?: string; limit?: number; offset?: number }): Promise<Supplier[]>;
  create(supplier: Omit<Supplier, 'createdAt' | 'updatedAt'>): Promise<Supplier>;
  updateBalance(id: string, balanceChangePaise: number): Promise<number>;
  appendLedger(entry: Omit<SupplierLedgerEntry, 'createdAt'>): Promise<SupplierLedgerEntry>;
  getLedger(supplierId: string): Promise<SupplierLedgerEntry[]>;
}

export interface ICollectionRepository {
  create(collection: Omit<Collection, 'createdAt'>, allocations: Omit<CollectionAllocation, 'id' | 'createdAt'>[]): Promise<Collection>;
  findById(id: string): Promise<Collection | null>;
  list(params: { customerId?: string; limit?: number; offset?: number }): Promise<Collection[]>;
}

export interface IExpenseRepository {
  create(expense: Omit<Expense, 'createdAt'>): Promise<Expense>;
  findById(id: string): Promise<Expense | null>;
  list(params: { categoryId?: string; startDate?: string; endDate?: string; limit?: number; offset?: number }): Promise<Expense[]>;
}

export interface ISettingsRepository {
  get(): Promise<Settings>;
  update(settings: Partial<Settings>): Promise<Settings>;
  getNextInvoiceNumberAndIncrement(): Promise<string>;
}

export interface IAuditRepository {
  log(audit: Omit<AuditLog, 'id' | 'createdAt'>): Promise<void>;
  query(params: { entityType?: string; entityId?: string; userId?: string; limit?: number }): Promise<AuditLog[]>;
}

// --- 4. DOMAIN SERVICE INTERFACES ---

export interface IAuthService {
  login(email: string, passwordPlain: string, ip?: string, ua?: string): Promise<{ token: string; user: Omit<User, 'passwordHash' | 'passwordSalt'> }>;
  logout(token: string): Promise<void>;
  validateSession(token: string): Promise<User | null>;
}

export interface IProductService {
  create(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>, userId: string): Promise<Product>;
  update(id: string, data: Partial<Product>, userId: string): Promise<Product>;
  deactivate(id: string, userId: string): Promise<void>;
  getById(id: string): Promise<Product | null>;
  list(params: { search?: string; categoryId?: string; limit?: number; offset?: number }): Promise<{ items: Product[]; total: number }>;
}

export interface IInventoryService {
  verifyStockAvailability(productId: string, requestedMilliUnits: number): Promise<boolean>;
  recordInward(productId: string, qtyMilli: number, unitCostPaise: number, refType: string, refId: string, userId: string): Promise<void>;
  recordOutward(productId: string, qtyMilli: number, refType: string, refId: string, userId: string): Promise<void>;
  adjustStock(productId: string, qtyMilli: number, type: 'ADD' | 'SUB', reason: string, userId: string): Promise<void>;
  getStockValuation(): Promise<{ totalValuationPaise: number; skuCount: number }>;
}

export interface IPurchaseService {
  createBill(data: Omit<PurchaseBill, 'id' | 'billNumber' | 'status' | 'createdAt' | 'updatedAt' | 'paidAmountPaise'>, items: Omit<PurchaseBillItem, 'id' | 'purchaseBillId'>[], userId: string): Promise<PurchaseBill>;
  confirmBill(billId: string, userId: string): Promise<PurchaseBill>;
}

export interface ISalesService {
  createInvoice(data: Omit<SalesInvoice, 'id' | 'invoiceNumber' | 'status' | 'createdAt' | 'updatedAt' | 'paidAmountPaise'>, items: Omit<SalesInvoiceItem, 'id' | 'salesInvoiceId'>[], userId: string): Promise<SalesInvoice>;
  confirmInvoice(invoiceId: string, userId: string): Promise<SalesInvoice>;
}

export interface ICollectionService {
  recordCollection(data: Omit<Collection, 'id' | 'receiptNumber' | 'unallocatedPaise' | 'createdAt'>, requestedAllocations: Array<{ invoiceId: string; amountPaise: number }> | undefined, userId: string): Promise<Collection>;
}

export interface IFinancialService {
  getProfitAndLoss(startDate: string, endDate: string): Promise<{
    grossRevenuePaise: number;
    salesReturnsPaise: number;
    netRevenuePaise: number;
    cogsPaise: number;
    grossProfitPaise: number;
    grossMarginPercent: number;
    operatingExpensesPaise: number;
    netOperatingIncomePaise: number;
    netMarginPercent: number;
  }>;
}
