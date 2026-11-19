-- Migration: 0002_triggers_and_indexes.sql
-- Description: Performance indexes and immutability enforcement triggers
-- Dialect: Cloudflare D1 (SQLite)

-- 1. COMPOSITE PERFORMANCE INDEXES

-- Sessions
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Products
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);

-- Inventory
CREATE INDEX IF NOT EXISTS idx_inv_movements_product ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inv_movements_created ON inventory_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_inv_movements_ref ON inventory_movements(reference_type, reference_id);

-- Purchasing
CREATE INDEX IF NOT EXISTS idx_purch_bills_supplier ON purchase_bills(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purch_bills_status ON purchase_bills(status);
CREATE INDEX IF NOT EXISTS idx_purch_bills_date ON purchase_bills(bill_date);
CREATE INDEX IF NOT EXISTS idx_purch_items_bill ON purchase_bill_items(purchase_bill_id);
CREATE INDEX IF NOT EXISTS idx_supp_ledger_supplier ON supplier_ledger(supplier_id, entry_date);

-- Sales
CREATE INDEX IF NOT EXISTS idx_sales_inv_customer ON sales_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_inv_status ON sales_invoices(status);
CREATE INDEX IF NOT EXISTS idx_sales_inv_date ON sales_invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_sales_items_inv ON sales_invoice_items(sales_invoice_id);
CREATE INDEX IF NOT EXISTS idx_cust_ledger_customer ON customer_ledger(customer_id, entry_date);

-- Collections
CREATE INDEX IF NOT EXISTS idx_collections_customer ON collections(customer_id);
CREATE INDEX IF NOT EXISTS idx_collections_date ON collections(payment_date);
CREATE INDEX IF NOT EXISTS idx_allocations_inv ON collection_allocations(sales_invoice_id);

-- Expenses
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);

-- Audit
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);


-- 2. IMMUTABILITY ENFORCEMENT TRIGGERS (Append-Only Ledgers)

-- Inventory Movements Immutability
CREATE TRIGGER IF NOT EXISTS trg_prevent_inv_mov_update
BEFORE UPDATE ON inventory_movements
BEGIN
    SELECT RAISE(FAIL, 'SECURITY_VIOLATION: inventory_movements records are strictly immutable and cannot be updated.');
END;

CREATE TRIGGER IF NOT EXISTS trg_prevent_inv_mov_delete
BEFORE DELETE ON inventory_movements
BEGIN
    SELECT RAISE(FAIL, 'SECURITY_VIOLATION: inventory_movements records are strictly immutable and cannot be deleted.');
END;

-- Customer Ledger Immutability
CREATE TRIGGER IF NOT EXISTS trg_prevent_cust_ledger_update
BEFORE UPDATE ON customer_ledger
BEGIN
    SELECT RAISE(FAIL, 'SECURITY_VIOLATION: customer_ledger records are strictly immutable and cannot be updated.');
END;

CREATE TRIGGER IF NOT EXISTS trg_prevent_cust_ledger_delete
BEFORE DELETE ON customer_ledger
BEGIN
    SELECT RAISE(FAIL, 'SECURITY_VIOLATION: customer_ledger records are strictly immutable and cannot be deleted.');
END;

-- Supplier Ledger Immutability
CREATE TRIGGER IF NOT EXISTS trg_prevent_supp_ledger_update
BEFORE UPDATE ON supplier_ledger
BEGIN
    SELECT RAISE(FAIL, 'SECURITY_VIOLATION: supplier_ledger records are strictly immutable and cannot be updated.');
END;

CREATE TRIGGER IF NOT EXISTS trg_prevent_supp_ledger_delete
BEFORE DELETE ON supplier_ledger
BEGIN
    SELECT RAISE(FAIL, 'SECURITY_VIOLATION: supplier_ledger records are strictly immutable and cannot be deleted.');
END;

-- Audit Logs Immutability
CREATE TRIGGER IF NOT EXISTS trg_prevent_audit_update
BEFORE UPDATE ON audit_logs
BEGIN
    SELECT RAISE(FAIL, 'SECURITY_VIOLATION: audit_logs records are strictly immutable and cannot be updated.');
END;

CREATE TRIGGER IF NOT EXISTS trg_prevent_audit_delete
BEFORE DELETE ON audit_logs
BEGIN
    SELECT RAISE(FAIL, 'SECURITY_VIOLATION: audit_logs records are strictly immutable and cannot be deleted.');
END;
