# Low-Level Design: Sales Module

**Module Name:** Sales, Orders & Invoicing (`sales`)  
**File Reference:** `docs/architecture/LLD/sales.md`  
**Status:** Approved Specification  

---

## 1. Module Purpose
The Sales Module governs commercial sales interactions: Quotations/Estimations, Sales Orders, Tax-compliant GST Sales Invoices, Goods Dispatch Notes (GDN), and Sales Returns (Credit Notes).

---

## 2. Responsibilities
- Manage sales documentation lifecycles: Quotations -> Sales Orders -> Tax Invoices -> Credit Notes.
- Compute Indian GST tax structures (CGST + SGST for intra-state supplies, IGST for inter-state supplies) in exact integer paise.
- Validate inventory availability atomically before issuing invoices and decrement stock via `InventoryService`.
- Register Accounts Receivable in the Customer Ledger upon invoice issuance.
- Process Sales Returns (Credit Notes) restoring stock and reducing customer debt.

---

## 3. Input and Output Contracts

```typescript
export interface SalesItemInputDTO {
  productId: string;
  quantityMilliUnits: number;
  unitPricePaise: number;
  discountPaise?: number;
}

export interface CreateInvoiceDTO {
  customerId: string;
  invoiceDate: string;             // YYYY-MM-DD
  dueDate: string;                 // YYYY-MM-DD
  placeOfSupplyStateCode: string;  // e.g. "29" for Karnataka, "36" for Telangana
  items: SalesItemInputDTO[];
  shippingChargesPaise?: number;
  notes?: string;
  idempotencyKey?: string;
}

export interface SalesInvoiceResponseDTO {
  id: string;
  invoiceNumber: string;           // e.g. "INV-2026-0001"
  customerId: string;
  customerName: string;
  customerGstin?: string;
  invoiceDate: string;
  dueDate: string;
  status: 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED' | 'CREDITED';
  subtotalPaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  totalTaxPaise: number;
  shippingChargesPaise: number;
  totalAmountPaise: number;
  paidAmountPaise: number;
  outstandingBalancePaise: number;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    sku: string;
    hsnCode: string;
    quantityUnits: number;
    unitPricePaise: number;
    taxRateBps: number;
    cgstPaise: number;
    sgstPaise: number;
    igstPaise: number;
    totalAmountPaise: number;
  }>;
  createdAt: string;
}
```

---

## 4. Database Tables

```sql
CREATE TABLE sales_invoices (
    id TEXT PRIMARY KEY,                       -- UUID v4
    invoice_number TEXT UNIQUE NOT NULL,       -- e.g. 'INV-2026-0001'
    customer_id TEXT NOT NULL,
    invoice_date TEXT NOT NULL,
    due_date TEXT NOT NULL,
    place_of_supply TEXT NOT NULL,             -- 2-digit GST state code
    status TEXT NOT NULL DEFAULT 'DRAFT',      -- 'DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED', 'CREDITED'
    subtotal_paise INTEGER NOT NULL DEFAULT 0,
    cgst_paise INTEGER NOT NULL DEFAULT 0,
    sgst_paise INTEGER NOT NULL DEFAULT 0,
    igst_paise INTEGER NOT NULL DEFAULT 0,
    total_tax_paise INTEGER NOT NULL DEFAULT 0,
    shipping_charges_paise INTEGER NOT NULL DEFAULT 0,
    total_amount_paise INTEGER NOT NULL DEFAULT 0,
    paid_amount_paise INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    idempotency_key TEXT UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    created_by TEXT NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE sales_invoice_items (
    id TEXT PRIMARY KEY,
    sales_invoice_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity_milli_units INTEGER NOT NULL,
    unit_price_paise INTEGER NOT NULL,
    tax_rate_bps INTEGER NOT NULL,
    cgst_paise INTEGER NOT NULL DEFAULT 0,
    sgst_paise INTEGER NOT NULL DEFAULT 0,
    igst_paise INTEGER NOT NULL DEFAULT 0,
    discount_paise INTEGER NOT NULL DEFAULT 0,
    total_amount_paise INTEGER NOT NULL,
    FOREIGN KEY (sales_invoice_id) REFERENCES sales_invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

CREATE TABLE credit_notes (
    id TEXT PRIMARY KEY,
    credit_note_number TEXT UNIQUE NOT NULL,   -- e.g. 'CN-2026-0001'
    sales_invoice_id TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    note_date TEXT NOT NULL,
    taxable_amount_paise INTEGER NOT NULL,
    tax_amount_paise INTEGER NOT NULL,
    total_amount_paise INTEGER NOT NULL,
    reason TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    created_by TEXT NOT NULL,
    FOREIGN KEY (sales_invoice_id) REFERENCES sales_invoices(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_si_customer ON sales_invoices(customer_id);
CREATE INDEX idx_si_status ON sales_invoices(status);
CREATE INDEX idx_si_date ON sales_invoices(invoice_date);
```

---

## 5. API Endpoints

### 5.1 POST `/api/v1/sales`
- **Description:** Create a new sales invoice in `DRAFT` status.
- **Request Body:** `CreateInvoiceDTO`
- **Success Response (201 Created):** `ApiResponse<SalesInvoiceResponseDTO>`

### 5.2 POST `/api/v1/sales/:id/confirm`
- **Description:** Finalizes invoice: verifies and decrements stock, issues invoice number, and debits customer AR ledger.
- **Success Response (200 OK):** `ApiResponse<SalesInvoiceResponseDTO>`

### 5.3 POST `/api/v1/sales/:id/return`
- **Description:** Issue a Credit Note for returned goods; replenishes stock and credits customer account.
- **Request Body:** `{ items: Array<{ productId: string, quantityMilliUnits: number }>, reason: string }`
- **Success Response (200 OK):** `ApiResponse<CreditNoteResponseDTO>`

---

## 6. Business Rules
1. **Intra-State vs. Inter-State GST Logic:**
   - If `place_of_supply == company_state_code`: Tax splits equally into **CGST** and **SGST** ($Tax / 2$ each).
   - If `place_of_supply != company_state_code`: Tax applies entirely as **IGST**.
2. **Stock Verification Invariant:** Confirmation fails atomically if any item has `available_stock < requested_qty`.
3. **Sequence Numbering:** Invoice numbers follow continuous, immutable chronological sequences (e.g. `INV-2026-0001`, `INV-2026-0002`).

---

## 7. Validation Rules
- `customerId`: Required, must be an active customer.
- `placeOfSupplyStateCode`: 2-digit valid Indian state code (e.g. "29", "27", "07").
- `items`: At least one item required.

---

## 8. Error Handling
| Error Code | HTTP Status | Reason |
|---|---|---|
| `INSUFFICIENT_STOCK` | 400 | Stock unavailable for one or more items |
| `CREDIT_LIMIT_EXCEEDED`| 400 | Customer outstanding balance exceeds approved credit limit |
| `INVOICE_ALREADY_CONFIRMED`| 400 | Invoice has already been confirmed |

---

## 9. Authorization Requirements
- Create / Confirm / Return: `OWNER` or `ADMIN`.
- View Invoices: `OWNER`, `ADMIN`, `STAFF`.

---

## 10. Dependencies
- `IInventoryService`: Validates stock and logs `SALE_DISPATCH` movements.
- `ICustomerService`: Verifies customer credit limit and appends AR debit entry.
- `ISettingsService`: Retrieves company state code and invoice prefix.

---

## 11. Edge Cases
1. **Odd-Paise Tax Splitting:** In intra-state supplies, if tax is an odd number of paise (e.g. 15 paise), CGST gets 8 paise and SGST gets 7 paise (rounding invariant: CGST + SGST == Total Tax).
2. **Cancellation with Cash Received:** Cancelled invoices with recorded payments require prior payment reallocation or credit voucher issuance.

---

## 12. Test Cases
1. **TC-SALE-01:** Creating intra-state invoice splits 18% tax equally between CGST and SGST in paise.
2. **TC-SALE-02:** Confirming invoice decrements stock and records AR debit in customer ledger.
3. **TC-SALE-03:** Attempting to sell more stock than available triggers rollback with `INSUFFICIENT_STOCK`.
