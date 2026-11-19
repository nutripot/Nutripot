# Enterprise Business Management System - Requirements Specification

**Document Version:** 1.0.0  
**Status:** Approved Architectural Baseline  
**Target Platform:** Cloudflare Workers, Cloudflare D1, Cloudflare R2  
**Target Currency Model:** Integer Paise (1 INR = 100 paise; e.g. ₹15,450.50 = `1545050`)  
**Target Quantity Model:** Milli-Units (1.000 Unit = 1000 milli-units)  

---

## 1. Executive Summary & Purpose

The **BusinessHub Management System** is a mission-critical, enterprise-grade business management and resource planning system designed for small-to-medium enterprises (SMEs), trading companies, distributors, and boutique commercial studios. 

The software replaces scattered spreadsheets, manual paper ledgers, fragmented invoicing apps, and isolated WhatsApp messaging by providing a single, highly performant, serverless web platform covering:
- Master Data Management (Products, Categories, Units, Suppliers, Customers).
- Procurement & Inward Logistics (Purchase Orders, Inward Receipts, Bills, Supplier Payables).
- Warehouse & Inventory Logistics (Real-time Stock, Movements, Stock Transfers, Physical Audits).
- Sales & Outward Logistics (Quotations, Orders, Invoicing, Dispatches, Accounts Receivable).
- Financial Management & Collections (Receipts, Expense Vouchers, Vendor Payments, Aging Ledgers).
- Financial Intelligence & Reporting (Profit & Loss, COGS calculation, Tax summaries, Stock Valuation).
- Security, Compliance & Audit (Role-based access, Immutable audit trail, Tamper-resistant sessions).

---

## 2. Core Domain Entities & Taxonomy

To maintain strict domain-driven boundaries and prevent ambiguous data models, the system strictly separates commercial intentions, physical stock movements, and financial settlements:

```
+----------------------------------------------------------------------------------------------------+
|                                    COMMERCIAL CONTRACTS                                           |
|   Purchase Order (PO) -----------------------------------> Sales Order (SO)                        |
+----------------------------------------------------------------------------------------------------+
                                      |                                  |
                                      v                                  v
+----------------------------------------------------------------------------------------------------+
|                                    PHYSICAL MOVEMENTS                                              |
|   Goods Receipt Note (GRN)                                  Goods Dispatch Note (GDN)              |
|        |                                                         |                                 |
|        +-------------------> [ Inventory Movement ] <-------------+                                 |
|                               (Double-Entry Stock Ledger)                                          |
+----------------------------------------------------------------------------------------------------+
                                      |                                  |
                                      v                                  v
+----------------------------------------------------------------------------------------------------+
|                                    FINANCIAL OBLIGATIONS                                           |
|   Purchase Bill (AP Invoice)                               Sales Invoice (AR Invoice)              |
|        |                                                         |                                 |
|        v                                                         v                                 |
|   Vendor Payment (Disbursement)                             Customer Collection (Receipt)          |
|        |                                                         |                                 |
|        +-------------------> [ Financial Ledger ] <--------------+                                 |
|                               (Double-Entry Accounting)                                            |
+----------------------------------------------------------------------------------------------------+
```

### Definitions:
1. **Product Master:** Metadata representing a catalog item (SKU, Name, HSN code, Tax Slab, Unit of Measure, Min Reorder Level, Cost Price, Selling Price). Does *not* store dynamic inventory quantity directly.
2. **Inventory Balance:** Current aggregate available quantity, committed quantity, and physical quantity per warehouse/bin.
3. **Inventory Movement:** Immutable atomic transaction recording quantity changes (`INWARD_PURCHASE`, `OUTWARD_SALE`, `RETURN_INWARD`, `RETURN_OUTWARD`, `SCRAP`, `AUDIT_ADJUSTMENT`) with associated unit valuation.
4. **Purchase Order (PO):** Contractual intent to buy goods from a Supplier. Has no direct financial or inventory effect until confirmed and received.
5. **Purchase Bill / Inward:** The actual commercial invoice received from a Supplier. Generates Accounts Payable (AP) and increments stock upon Goods Receipt.
6. **Sales Order (SO):** Customer order reserving or requesting products.
7. **Sales Invoice:** Final tax-compliant billing document that obligates the customer to pay (Accounts Receivable - AR) and triggers inventory decrement.
8. **Collection:** Monetary receipt from a customer allocated to one or more sales invoices.
9. **Expense:** Operational expenditure (Rent, Electricity, Logistics, Salaries) tracked independently of cost of goods sold (COGS).
10. **Financial Transaction:** Immutable double-entry record capturing debits and credits across assets, liabilities, equity, revenues, and expenses.

---

## 3. Detailed Functional Requirements

### 3.1 Authentication & Identity (AUTH)
- **AUTH-01:** Single-owner system initialization with bootstrap admin account.
- **AUTH-02:** Secure credential verification using PBKDF2-SHA256 with cryptographically random salts (or Argon2id where supported by WebCrypto).
- **AUTH-03:** Session tokens issued as encrypted/signed JWTs or WebCrypto HMAC-SHA256 tokens stored exclusively in `HttpOnly`, `SameSite=Strict`, `Secure` cookies.
- **AUTH-04:** Rate limiting on `/api/v1/auth/login` to prevent credential stuffing (5 failed attempts per 15 minutes per IP).
- **AUTH-05:** Explicit logout endpoint that invalidates session records in D1.
- **AUTH-06:** Audit log recording on all login, logout, and password modification events.

### 3.2 Master Data: Products & Catalogs (PROD)
- **PROD-01:** Unique SKU and Barcode indexing.
- **PROD-02:** Categorization with parent-child hierarchical support.
- **PROD-03:** Standard Unit of Measure (UOM) support (Pieces, Kilograms, Meters, Liters, Boxes) with fractional quantity handling up to 3 decimal places (1.000 = 1000 milli-units).
- **PROD-04:** HSN/SAC code tracking and applicable GST tax slabs (0%, 5%, 12%, 18%, 28%).
- **PROD-05:** Configurable reorder alert thresholds (`min_stock_alert_level`).
- **PROD-06:** Soft deactivation for discontinued products to preserve historical relational integrity.

### 3.3 Warehouse & Inventory Logistics (INV)
- **INV-01:** Real-time stock computation from immutable movement ledgers.
- **INV-02:** Strict inventory movement types:
  - `PURCHASE_RECEIPT` (increases stock, references Purchase Bill)
  - `SALE_DISPATCH` (decreases stock, references Sales Invoice)
  - `PURCHASE_RETURN` (decreases stock, references Debit Note)
  - `SALE_RETURN` (increases stock, references Credit Note)
  - `ADJUSTMENT_ADD` / `ADJUSTMENT_SUB` (manual audited cycle count corrections)
  - `DAMAGE_WRITE_OFF` (decreases stock with explicit expense allocation)
- **INV-03:** Negative inventory prevention by default. Transactions requesting more stock than available are rejected with `INSUFFICIENT_STOCK_ERROR` unless explicit backorder flag is set.
- **INV-04:** Stock Valuation using Weighted Average Cost (WAC) and First-In First-Out (FIFO) models.

### 3.4 Purchasing & Vendor Logistics (PURCH)
- **PURCH-01:** Purchase Order (PO) creation with line items, tax breakdowns, discount calculation, and freight charges.
- **PURCH-02:** PO lifecycle: `DRAFT` -> `CONFIRMED` -> `PARTIALLY_RECEIVED` -> `COMPLETED` -> `CANCELLED`.
- **PURCH-03:** Purchase Inward / Bill creation verifying received quantities against PO quantities.
- **PURCH-04:** Automatic generation of Accounts Payable (AP) liability for the supplier upon Bill confirmation.
- **PURCH-05:** Purchase Return workflow generating Debit Notes and reducing supplier liability or creating debit balances.

### 3.5 Supplier Management (SUPP)
- **SUPP-01:** Comprehensive supplier profile (Legal Name, Trade Name, GSTIN, PAN, Phone, Email, Billing Address, Payment Terms).
- **SUPP-02:** Running balance ledger displaying all bills, payments, debit notes, and outstanding payable balances.
- **SUPP-03:** Supplier payment terms (Net 15, Net 30, Due on Receipt, Advance).

### 3.6 Sales & Outward Logistics (SALE)
- **SALE-01:** Sales Quotation / Estimation generation with PDF export support.
- **SALE-02:** Quotation to Sales Order conversion.
- **SALE-03:** Sales Invoice generation compliant with Indian GST requirements (CGST, SGST, IGST calculation based on place of supply).
- **SALE-04:** Invoice status lifecycle: `DRAFT` -> `ISSUED` -> `PARTIALLY_PAID` -> `PAID` -> `CANCELLED` -> `CREDITED`.
- **SALE-05:** Automatic inventory decrement on invoice confirmation.
- **SALE-06:** Sales Return workflow generating tax-compliant Credit Notes and restocking eligible items.

### 3.7 Customer Relationship & Receivables (CUST)
- **CUST-01:** Customer master record (Name, Company, GSTIN, Phone, Email, Billing & Shipping addresses, Credit Limit, Credit Days).
- **CUST-02:** Credit limit enforcement: Alert or block invoices when outstanding balance exceeds assigned credit limit.
- **CUST-03:** Detailed customer ledger showing all invoices, receipts, credit notes, and aging buckets (0-30 days, 31-60 days, 61-90 days, 90+ days).

### 3.8 Collections & Receipts (COLL)
- **COLL-01:** Payment entry recording incoming funds via Cash, Bank Transfer (NEFT/RTGS/IMPS), UPI, Cheque, or Card.
- **COLL-02:** Invoice allocation: A single collection can pay one invoice, split across multiple invoices (FIFO or explicit selection), or remain as an unallocated customer credit balance.
- **COLL-03:** Payment receipt voucher generation and printable delivery.
- **COLL-04:** Automatic update of invoice payment status (`ISSUED` -> `PARTIALLY_PAID` -> `PAID`).

### 3.9 Expenses & Overhead Management (EXP)
- **EXP-01:** Categorized operational expenses (Rent, Utilities, Travel, Logistics, Marketing, Repairs, Wages, Software, Miscellaneous).
- **EXP-02:** Vendor/payee tracking and tax deduction (TDS) reference recording.
- **EXP-03:** Attachment of receipt images/invoices stored in Cloudflare R2.
- **EXP-04:** Payment mode tracking (Bank, Cash, Corporate Card).

### 3.10 Financial Reporting & Accounting Intelligence (FIN)
- **FIN-01:** Profit & Loss (P&L) Statement:
  - Revenue from Operations (Gross Sales minus Sales Returns).
  - Cost of Goods Sold (Opening Stock + Purchases - Closing Stock).
  - Gross Profit (Revenue - COGS) and Gross Margin %.
  - Operational Expenses (Categorized Opex).
  - Net Operating Income (Gross Profit - Opex).
- **FIN-02:** Stock Valuation Report (Total asset value of inventory at cost).
- **FIN-03:** Cash Flow Summary (Operating inflows from collections vs. outflows to suppliers and expenses).
- **FIN-04:** Product Profitability Analysis (Margin per SKU based on purchase cost vs. realized sales price).

### 3.11 Operational & Compliance Reports (REP)
- **REP-01:** GST Report Generator:
  - GSTR-1 Outward Supplies Summary (B2B, B2CL, B2CS with CGST/SGST/IGST breakdown).
  - GSTR-2 / Inward Supplies Summary (Input Tax Credit verification).
- **REP-02:** Accounts Receivable & Accounts Payable Aging Reports.
- **REP-03:** Fast-Moving vs. Slow-Moving Stock Analysis.
- **REP-04:** Export capability to standard CSV and JSON.

### 3.12 Audit Logging & Security Tracking (AUDIT)
- **AUDIT-01:** Comprehensive audit logging for all transactional writes, state transitions, updates, and cancellations.
- **AUDIT-02:** Stored audit fields: `timestamp`, `user_id`, `entity_type`, `entity_id`, `action`, `old_values_json`, `new_values_json`, `ip_address`, `user_agent`.
- **AUDIT-03:** Audit records are strictly read-only and immutable.

### 3.13 System Configuration & Settings (SETT)
- **SETT-01:** Business Profile: Name, Logo (R2 storage), Address, Contact, GSTIN, PAN, Bank Details for invoices.
- **SETT-02:** Invoice Customization: Prefix (e.g. `INV-2026-`), starting sequence number, terms & conditions footer.
- **SETT-03:** Tax Configuration: Default tax rates, intra-state vs inter-state tax logic.

---

## 4. Non-Functional Requirements (NFR)

| Category | Requirement | Target Specification |
|---|---|---|
| **Performance** | API Latency | < 50ms for cached reads, < 150ms for transactional writes at Cloudflare Edge. |
| **Precision** | Monetary Calculation | 100% exact integer arithmetic in paise. Floating-point types forbidden. |
| **Scalability** | Cloudflare Workers | Serverless, globally distributed execution with zero cold-starts. |
| **Storage** | Cloudflare D1 | Fast, edge-replicated SQLite relational engine with ACID transactions. |
| **Availability** | System Uptime | 99.95% target SLA on Cloudflare edge network. |
| **Security** | Session Management | Cryptographically signed, `HttpOnly`, `SameSite=Strict`, `Secure` cookies. |
| **Integrity** | Foreign Keys & Cascades | SQLite foreign key enforcement enabled on every connection (`PRAGMA foreign_keys = ON;`). |
| **Auditability** | Data Immutability | Critical financial movements and audit logs cannot be updated or deleted via API. |
| **Accessibility** | UI Standards | Clean, high-contrast, keyboard-navigable interface following WCAG 2.1 AA. |

---

## 5. Mathematical & Precision Standards

### 5.1 Currency Standard: Integer Paise
All monetary fields across the database, APIs, and business calculations are strictly typed as 64-bit integers (`BIGINT` or `INTEGER` in SQLite) representing **paise**:
- ₹1.00 = 100 paise.
- ₹1,499.50 = `149950`.
- Display formatting: Convert to decimal string only at the presentation layer using a dedicated helper (`formatPaiseToRupees(149950) -> "₹1,499.50"`).
- Intermediate tax calculations use integer rounding with `Math.round((base_paise * tax_rate_bps) / 10000)`.

### 5.2 Quantity Standard: Thousandth Units (Milli-Units)
To allow accurate measurement of weighted items, lengths, and fractions (e.g., 2.5 kg, 1.75 meters):
- 1.000 Unit = 1000 milli-units (`INTEGER`).
- 2.500 kg = `2500` milli-units.
- When discrete pieces are used, `quantity = count * 1000`.
- Stock balances and movements are calculated in integer milli-units to guarantee zero floating-point drift.
