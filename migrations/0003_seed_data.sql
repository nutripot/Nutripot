-- Migration: 0003_seed_data.sql
-- Description: Standard initial seed data for categories, expense heads, default owner, and company settings
-- Dialect: Cloudflare D1 (SQLite)

-- 1. INITIAL SYSTEM OWNER
-- Email: innovativeden0@gmail.com
-- Temporary bootstrap password: 'ASDf@123'
-- Salt: 16-byte base64 salt: 'YnVzaW5lc3NodWJzYWx0'
-- Derived PBKDF2-SHA256 (100,000 iters): '26b30b2117f004ac1985f1783e144b423038d652e9eb6411d4a0c22c0fa812e2'
INSERT OR IGNORE INTO users (
    id, email, password_hash, password_salt, full_name, role, is_active, created_at, updated_at
) VALUES (
    'usr_bootstrap_owner',
    'innovativeden0@gmail.com',
    '26b30b2117f004ac1985f1783e144b423038d652e9eb6411d4a0c22c0fa812e2',
    'YnVzaW5lc3NodWJzYWx0',
    'System Administrator',
    'OWNER',
    1,
    datetime('now', 'utc'),
    datetime('now', 'utc')
);

-- 2. STANDARD PRODUCT CATEGORIES
INSERT OR IGNORE INTO product_categories (id, name, parent_id) VALUES
('cat_raw_materials', 'Raw Materials', NULL),
('cat_finished_goods', 'Finished Goods', NULL),
('cat_hardware', 'Hardware & Fittings', NULL),
('cat_packaging', 'Packaging Supplies', NULL),
('cat_tools', 'Tools & Machinery', NULL);

-- 3. STANDARD OPERATIONAL EXPENSE CATEGORIES
INSERT OR IGNORE INTO expense_categories (id, name, description) VALUES
('exp_rent', 'Rent & Facilities', 'Commercial property lease and workspace maintenance'),
('exp_utilities', 'Utilities', 'Electricity, water, internet, and office telecom'),
('exp_logistics', 'Freight & Logistics', 'Inward/outward courier, transportation, and cargo'),
('exp_salaries', 'Salaries & Wages', 'Staff payroll, stipends, and worker wages'),
('exp_marketing', 'Marketing & Sales', 'Client acquisition, promotional printing, and ads'),
('exp_repairs', 'Repairs & Maintenance', 'Machinery servicing, equipment and vehicle repair'),
('exp_software', 'Software & IT Subscriptions', 'Cloud infrastructure, accounting tools, and SaaS licenses'),
('exp_taxes', 'Taxes & Statutory Fees', 'Municipal taxes, legal filings, and trade registrations'),
('exp_misc', 'Office Miscellaneous', 'Tea, refreshments, stationery, and petty expenses');

-- 4. SYSTEM SETTINGS SINGLETON
INSERT OR IGNORE INTO settings (
    id, company_name, trade_name, gstin, pan, state_code, state_name,
    address_line1, address_line2, city, pincode, phone, email, website,
    bank_name, bank_account_name, bank_account_number, bank_ifsc, bank_branch, bank_upi_id,
    invoice_prefix, next_invoice_number, receipt_prefix, terms_conditions,
    allow_negative_stock, updated_at, updated_by
) VALUES (
    'SYSTEM_CONFIG',
    'BusinessHub Commercial Enterprises Pvt Ltd',
    'BusinessHub Studios',
    '29AAAAA0000A1Z5',
    'AAAAA0000A',
    '29',
    'Karnataka',
    '100 Industrial Area, 4th Phase, Peenya',
    'Plot 12, Floor 2',
    'Bengaluru',
    '560058',
    '+91-9876543210',
    'accounts@businesshub.local',
    'https://businesshub.local',
    'HDFC Bank',
    'BusinessHub Commercial Enterprises Pvt Ltd',
    '50200012345678',
    'HDFC0001234',
    'Peenya Industrial Branch',
    'businesshub@hdfcbank',
    'INV-2026-',
    1,
    'REC-2026-',
    '1. Goods once sold will be accepted for return only in accordance with our return policy within 7 days.
2. Interest @ 18% per annum will be charged on overdue payments after the credit due date.
3. All disputes are subject to local jurisdiction.',
    0,
    datetime('now', 'utc'),
    'usr_bootstrap_owner'
);
