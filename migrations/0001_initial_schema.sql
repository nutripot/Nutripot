-- Migration: 0001_initial_schema.sql
-- Description: Core relational schema for BusinessHub Enterprise
-- Dialect: Cloudflare D1 (SQLite)

PRAGMA foreign_keys = ON;

-- 1. USERS & IDENTITY
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'OWNER' CHECK (role IN ('OWNER', 'ADMIN', 'STAFF')),
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
);

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT UNIQUE NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    old_values_json TEXT,
    new_values_json TEXT,
    ip_address TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- 2. PRODUCTS & CATEGORIES
CREATE TABLE IF NOT EXISTS product_categories (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    parent_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    FOREIGN KEY (parent_id) REFERENCES product_categories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    sku TEXT UNIQUE NOT NULL COLLATE NOCASE,
    barcode TEXT UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    category_id TEXT NOT NULL,
    uom TEXT NOT NULL DEFAULT 'PCS' CHECK (uom IN ('PCS', 'KGS', 'MTR', 'LTR', 'BOX')),
    hsn_code TEXT NOT NULL,
    tax_rate_bps INTEGER NOT NULL DEFAULT 1800 CHECK (tax_rate_bps IN (0, 500, 1200, 1800, 2800)),
    cost_price_paise INTEGER NOT NULL DEFAULT 0 CHECK (cost_price_paise >= 0),
    selling_price_paise INTEGER NOT NULL DEFAULT 0 CHECK (selling_price_paise >= 0),
    min_stock_alert_level INTEGER NOT NULL DEFAULT 0 CHECK (min_stock_alert_level >= 0),
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    FOREIGN KEY (category_id) REFERENCES product_categories(id) ON DELETE RESTRICT
);

-- 3. INVENTORY BALANCES & MOVEMENTS
CREATE TABLE IF NOT EXISTS inventory_balances (
    product_id TEXT PRIMARY KEY,
    current_stock_milli_units INTEGER NOT NULL DEFAULT 0,
    weighted_avg_cost_paise INTEGER NOT NULL DEFAULT 0 CHECK (weighted_avg_cost_paise >= 0),
    last_updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS inventory_movements (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    movement_type TEXT NOT NULL CHECK (movement_type IN (
        'PURCHASE_RECEIPT', 'SALE_DISPATCH', 'PURCHASE_RETURN', 
        'SALE_RETURN', 'ADJUSTMENT_ADD', 'ADJUSTMENT_SUB', 'DAMAGE_WRITE_OFF'
    )),
    quantity_milli_units INTEGER NOT NULL,
    unit_cost_paise INTEGER NOT NULL DEFAULT 0 CHECK (unit_cost_paise >= 0),
    balance_after_milli_units INTEGER NOT NULL,
    reference_type TEXT NOT NULL,
    reference_id TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    created_by TEXT NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- 4. SUPPLIERS & PURCHASES
CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT NOT NULL,
    email TEXT,
    gstin TEXT,
    pan TEXT,
    billing_address TEXT NOT NULL,
    payment_terms_days INTEGER NOT NULL DEFAULT 30 CHECK (payment_terms_days >= 0),
    bank_account_name TEXT,
    bank_account_number TEXT,
    bank_ifsc TEXT,
    bank_name TEXT,
    current_payable_paise INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
);

CREATE TABLE IF NOT EXISTS supplier_ledger (
    id TEXT PRIMARY KEY,
    supplier_id TEXT NOT NULL,
    entry_date TEXT NOT NULL,
    entry_type TEXT NOT NULL CHECK (entry_type IN (
        'PURCHASE_BILL', 'PAYMENT_DISBURSEMENT', 'DEBIT_NOTE', 'OPENING_BALANCE'
    )),
    reference_id TEXT NOT NULL,
    reference_number TEXT NOT NULL,
    debit_paise INTEGER NOT NULL DEFAULT 0 CHECK (debit_paise >= 0),
    credit_paise INTEGER NOT NULL DEFAULT 0 CHECK (credit_paise >= 0),
    running_balance_paise INTEGER NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    created_by TEXT NOT NULL,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS purchase_bills (
    id TEXT PRIMARY KEY,
    bill_number TEXT UNIQUE NOT NULL,
    supplier_id TEXT NOT NULL,
    supplier_bill_number TEXT NOT NULL,
    bill_date TEXT NOT NULL,
    due_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
        'DRAFT', 'CONFIRMED', 'PAID', 'PARTIALLY_PAID', 'CANCELLED'
    )),
    subtotal_paise INTEGER NOT NULL DEFAULT 0 CHECK (subtotal_paise >= 0),
    tax_amount_paise INTEGER NOT NULL DEFAULT 0 CHECK (tax_amount_paise >= 0),
    shipping_charges_paise INTEGER NOT NULL DEFAULT 0 CHECK (shipping_charges_paise >= 0),
    total_amount_paise INTEGER NOT NULL DEFAULT 0 CHECK (total_amount_paise >= 0),
    paid_amount_paise INTEGER NOT NULL DEFAULT 0 CHECK (paid_amount_paise >= 0),
    notes TEXT,
    idempotency_key TEXT UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    created_by TEXT NOT NULL,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS purchase_bill_items (
    id TEXT PRIMARY KEY,
    purchase_bill_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity_milli_units INTEGER NOT NULL CHECK (quantity_milli_units > 0),
    unit_price_paise INTEGER NOT NULL CHECK (unit_price_paise >= 0),
    tax_rate_bps INTEGER NOT NULL CHECK (tax_rate_bps >= 0),
    tax_amount_paise INTEGER NOT NULL CHECK (tax_amount_paise >= 0),
    discount_paise INTEGER NOT NULL DEFAULT 0 CHECK (discount_paise >= 0),
    total_amount_paise INTEGER NOT NULL CHECK (total_amount_paise >= 0),
    FOREIGN KEY (purchase_bill_id) REFERENCES purchase_bills(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS debit_notes (
    id TEXT PRIMARY KEY,
    debit_note_number TEXT UNIQUE NOT NULL,
    purchase_bill_id TEXT NOT NULL,
    supplier_id TEXT NOT NULL,
    note_date TEXT NOT NULL,
    total_amount_paise INTEGER NOT NULL CHECK (total_amount_paise >= 0),
    reason TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    created_by TEXT NOT NULL,
    FOREIGN KEY (purchase_bill_id) REFERENCES purchase_bills(id) ON DELETE RESTRICT,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- 5. CUSTOMERS & SALES
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    company_name TEXT,
    phone TEXT NOT NULL,
    email TEXT,
    gstin TEXT,
    pan TEXT,
    billing_address TEXT NOT NULL,
    shipping_address TEXT,
    credit_limit_paise INTEGER NOT NULL DEFAULT 0 CHECK (credit_limit_paise >= 0),
    credit_days INTEGER NOT NULL DEFAULT 30 CHECK (credit_days >= 0),
    current_receivable_paise INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
);

CREATE TABLE IF NOT EXISTS customer_ledger (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    entry_date TEXT NOT NULL,
    entry_type TEXT NOT NULL CHECK (entry_type IN (
        'SALES_INVOICE', 'COLLECTION_RECEIPT', 'CREDIT_NOTE', 'OPENING_BALANCE'
    )),
    reference_id TEXT NOT NULL,
    reference_number TEXT NOT NULL,
    debit_paise INTEGER NOT NULL DEFAULT 0 CHECK (debit_paise >= 0),
    credit_paise INTEGER NOT NULL DEFAULT 0 CHECK (credit_paise >= 0),
    running_balance_paise INTEGER NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    created_by TEXT NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS sales_invoices (
    id TEXT PRIMARY KEY,
    invoice_number TEXT UNIQUE NOT NULL,
    customer_id TEXT NOT NULL,
    invoice_date TEXT NOT NULL,
    due_date TEXT NOT NULL,
    place_of_supply TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
        'DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED', 'CREDITED'
    )),
    subtotal_paise INTEGER NOT NULL DEFAULT 0 CHECK (subtotal_paise >= 0),
    cgst_paise INTEGER NOT NULL DEFAULT 0 CHECK (cgst_paise >= 0),
    sgst_paise INTEGER NOT NULL DEFAULT 0 CHECK (sgst_paise >= 0),
    igst_paise INTEGER NOT NULL DEFAULT 0 CHECK (igst_paise >= 0),
    total_tax_paise INTEGER NOT NULL DEFAULT 0 CHECK (total_tax_paise >= 0),
    shipping_charges_paise INTEGER NOT NULL DEFAULT 0 CHECK (shipping_charges_paise >= 0),
    total_amount_paise INTEGER NOT NULL DEFAULT 0 CHECK (total_amount_paise >= 0),
    paid_amount_paise INTEGER NOT NULL DEFAULT 0 CHECK (paid_amount_paise >= 0),
    notes TEXT,
    idempotency_key TEXT UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    created_by TEXT NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS sales_invoice_items (
    id TEXT PRIMARY KEY,
    sales_invoice_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity_milli_units INTEGER NOT NULL CHECK (quantity_milli_units > 0),
    unit_price_paise INTEGER NOT NULL CHECK (unit_price_paise >= 0),
    tax_rate_bps INTEGER NOT NULL CHECK (tax_rate_bps >= 0),
    cgst_paise INTEGER NOT NULL DEFAULT 0 CHECK (cgst_paise >= 0),
    sgst_paise INTEGER NOT NULL DEFAULT 0 CHECK (sgst_paise >= 0),
    igst_paise INTEGER NOT NULL DEFAULT 0 CHECK (igst_paise >= 0),
    discount_paise INTEGER NOT NULL DEFAULT 0 CHECK (discount_paise >= 0),
    total_amount_paise INTEGER NOT NULL CHECK (total_amount_paise >= 0),
    FOREIGN KEY (sales_invoice_id) REFERENCES sales_invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS credit_notes (
    id TEXT PRIMARY KEY,
    credit_note_number TEXT UNIQUE NOT NULL,
    sales_invoice_id TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    note_date TEXT NOT NULL,
    taxable_amount_paise INTEGER NOT NULL CHECK (taxable_amount_paise >= 0),
    tax_amount_paise INTEGER NOT NULL CHECK (tax_amount_paise >= 0),
    total_amount_paise INTEGER NOT NULL CHECK (total_amount_paise >= 0),
    reason TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    created_by TEXT NOT NULL,
    FOREIGN KEY (sales_invoice_id) REFERENCES sales_invoices(id) ON DELETE RESTRICT,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- 6. COLLECTIONS & ALLOCATIONS
CREATE TABLE IF NOT EXISTS collections (
    id TEXT PRIMARY KEY,
    receipt_number TEXT UNIQUE NOT NULL,
    customer_id TEXT NOT NULL,
    payment_date TEXT NOT NULL,
    payment_mode TEXT NOT NULL CHECK (payment_mode IN (
        'CASH', 'BANK_TRANSFER', 'UPI', 'CHEQUE', 'CARD'
    )),
    amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
    reference_number TEXT,
    deposit_account TEXT NOT NULL DEFAULT 'MAIN_BANK',
    unallocated_paise INTEGER NOT NULL DEFAULT 0 CHECK (unallocated_paise >= 0),
    notes TEXT,
    idempotency_key TEXT UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    created_by TEXT NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS collection_allocations (
    id TEXT PRIMARY KEY,
    collection_id TEXT NOT NULL,
    sales_invoice_id TEXT NOT NULL,
    allocated_paise INTEGER NOT NULL CHECK (allocated_paise > 0),
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
    FOREIGN KEY (sales_invoice_id) REFERENCES sales_invoices(id) ON DELETE RESTRICT
);

-- 7. EXPENSES & OVERHEAD
CREATE TABLE IF NOT EXISTS expense_categories (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
);

CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    voucher_number TEXT UNIQUE NOT NULL,
    category_id TEXT NOT NULL,
    expense_date TEXT NOT NULL,
    amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
    payment_mode TEXT NOT NULL CHECK (payment_mode IN (
        'CASH', 'BANK_TRANSFER', 'UPI', 'CORPORATE_CARD'
    )),
    payment_account TEXT NOT NULL DEFAULT 'MAIN_BANK',
    payee_name TEXT NOT NULL,
    description TEXT NOT NULL,
    receipt_r2_key TEXT,
    tax_deduction_paise INTEGER NOT NULL DEFAULT 0 CHECK (tax_deduction_paise >= 0),
    idempotency_key TEXT UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    created_by TEXT NOT NULL,
    FOREIGN KEY (category_id) REFERENCES expense_categories(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- 8. SYSTEM CONFIGURATION SINGLETON
CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY DEFAULT 'SYSTEM_CONFIG',
    company_name TEXT NOT NULL,
    trade_name TEXT,
    gstin TEXT NOT NULL,
    pan TEXT NOT NULL,
    state_code TEXT NOT NULL,
    state_name TEXT NOT NULL,
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    city TEXT NOT NULL,
    pincode TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    website TEXT,
    logo_r2_key TEXT,
    bank_name TEXT NOT NULL,
    bank_account_name TEXT NOT NULL,
    bank_account_number TEXT NOT NULL,
    bank_ifsc TEXT NOT NULL,
    bank_branch TEXT,
    bank_upi_id TEXT,
    invoice_prefix TEXT NOT NULL DEFAULT 'INV-2026-',
    next_invoice_number INTEGER NOT NULL DEFAULT 1 CHECK (next_invoice_number > 0),
    receipt_prefix TEXT NOT NULL DEFAULT 'REC-2026-',
    terms_conditions TEXT,
    allow_negative_stock INTEGER NOT NULL DEFAULT 0 CHECK (allow_negative_stock IN (0, 1)),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    updated_by TEXT NOT NULL,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE RESTRICT
);
