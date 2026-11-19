# Low-Level Design: Purchasing Module

**Module Name:** Purchasing & Procurement Logistics (`purchases`)  
**File Reference:** `docs/architecture/LLD/purchases.md`  
**Status:** Approved Specification  

---

## 1. Module Purpose
The Purchasing Module manages the procurement lifecycle, from Purchase Order (PO) creation to Goods Receipt Note (GRN), Purchase Bill confirmation, Accounts Payable generation, and Purchase Returns (Debit Notes).

---

## 2. Responsibilities
- Manage Purchase Orders with status transitions (`DRAFT`, `CONFIRMED`, `PARTIALLY_RECEIVED`, `COMPLETED`, `CANCELLED`).
- Record supplier Purchase Bills with line-item tax calculations (CGST, SGST, IGST) and freight charges in integer paise.
- Coordinate with Inventory Module on bill confirmation to increment stock and update WAC.
- Coordinate with Supplier Management to record Accounts Payable in the supplier ledger.
- Process Purchase Returns (Debit Notes), decrementing stock and issuing supplier debits.

---

## 3. Input and Output Contracts

```typescript
export interface PurchaseItemInputDTO {
  productId: string;
  quantityMilliUnits: number;
  unitPricePaise: number;
  taxRateBps: number;              // e.g. 1800 for 18%
  discountPaise?: number;
}

export interface CreatePurchaseBillDTO {
  supplierId: string;
  supplierBillNumber: string;      // Vendor's invoice number
  billDate: string;                // YYYY-MM-DD
  dueDate: string;                 // YYYY-MM-DD
  items: PurchaseItemInputDTO[];
  shippingChargesPaise?: number;
  notes?: string;
  idempotencyKey?: string;
}

export interface PurchaseBillResponseDTO {
  id: string;
  billNumber: string;              // System auto-generated number: PB-2026-0001
  supplierId: string;
  supplierName: string;
  supplierBillNumber: string;
  billDate: string;
  dueDate: string;
  status: 'DRAFT' | 'CONFIRMED' | 'PAID' | 'PARTIALLY_PAID' | 'CANCELLED';
  subtotalPaise: number;
  taxAmountPaise: number;
  shippingChargesPaise: number;
  totalAmountPaise: number;
  paidAmountPaise: number;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    sku: string;
    quantityUnits: number;
    unitPricePaise: number;
    taxRateBps: number;
    taxAmountPaise: number;
    totalAmountPaise: number;
  }>;
  createdAt: string;
}
```

---

## 4. Database Tables

```sql
CREATE TABLE purchase_bills (
    id TEXT PRIMARY KEY,
    bill_number TEXT UNIQUE NOT NULL,          -- e.g. 'PB-2026-0001'
    supplier_id TEXT NOT NULL,
    supplier_bill_number TEXT NOT NULL,        -- Vendor's invoice number
    bill_date TEXT NOT NULL,
    due_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT',      -- 'DRAFT', 'CONFIRMED', 'PAID', 'PARTIALLY_PAID', 'CANCELLED'
    subtotal_paise INTEGER NOT NULL DEFAULT 0,
    tax_amount_paise INTEGER NOT NULL DEFAULT 0,
    shipping_charges_paise INTEGER NOT NULL DEFAULT 0,
    total_amount_paise INTEGER NOT NULL DEFAULT 0,
    paid_amount_paise INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    idempotency_key TEXT UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    created_by TEXT NOT NULL,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE purchase_bill_items (
    id TEXT PRIMARY KEY,
    purchase_bill_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity_milli_units INTEGER NOT NULL,
    unit_price_paise INTEGER NOT NULL,
    tax_rate_bps INTEGER NOT NULL,
    tax_amount_paise INTEGER NOT NULL,
    discount_paise INTEGER NOT NULL DEFAULT 0,
    total_amount_paise INTEGER NOT NULL,
    FOREIGN KEY (purchase_bill_id) REFERENCES purchase_bills(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

CREATE TABLE debit_notes (
    id TEXT PRIMARY KEY,
    debit_note_number TEXT UNIQUE NOT NULL,    -- e.g. 'DN-2026-0001'
    purchase_bill_id TEXT NOT NULL,
    supplier_id TEXT NOT NULL,
    note_date TEXT NOT NULL,
    total_amount_paise INTEGER NOT NULL,
    reason TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    created_by TEXT NOT NULL,
    FOREIGN KEY (purchase_bill_id) REFERENCES purchase_bills(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_pb_supplier ON purchase_bills(supplier_id);
CREATE INDEX idx_pb_status ON purchase_bills(status);
CREATE INDEX idx_pb_date ON purchase_bills(bill_date);
```

---

## 5. API Endpoints

### 5.1 POST `/api/v1/purchases`
- **Description:** Create a new Purchase Bill in `DRAFT` status.
- **Request Body:** `CreatePurchaseBillDTO`
- **Success Response (201 Created):** `ApiResponse<PurchaseBillResponseDTO>`

### 5.2 POST `/api/v1/purchases/:id/confirm`
- **Description:** Confirms the bill, atomically increments inventory stock, updates WAC, and registers Accounts Payable liability.
- **Success Response (200 OK):** `ApiResponse<PurchaseBillResponseDTO>`

### 5.3 POST `/api/v1/purchases/:id/return`
- **Description:** Issue a Debit Note for defective or returned items; decrements stock and debits supplier account.
- **Request Body:** `{ items: Array<{ productId: string, quantityMilliUnits: number }>, reason: string }`
- **Success Response (200 OK):** `ApiResponse<DebitNoteResponseDTO>`

---

## 6. Business Rules
1. **Integer Arithmetic Invariant:** 
   $$\text{item\_tax} = \text{round}\left(\frac{\text{item\_subtotal} \times \text{tax\_rate\_bps}}{10000}\right)$$
   $$\text{total\_amount\_paise} = \sum(\text{item\_subtotal} + \text{item\_tax}) + \text{shipping\_charges\_paise}$$
2. **Draft Modification:** Line items can be added, modified, or removed only while status is `DRAFT`.
3. **Confirmation Irreversibility:** Once confirmed, a bill cannot be directly deleted or updated; any correction requires a Debit Note or cancellation workflow.
4. **Supplier AP Registration:** Upon confirmation, the exact `total_amount_paise` is credited to `supplier_ledger`.

---

## 7. Validation Rules
- `supplierId`: Must exist and be active.
- `items`: Array must contain at least 1 line item.
- `quantityMilliUnits`: Positive integer > 0.
- `unitPricePaise`: Integer >= 0.

---

## 8. Error Handling
| Error Code | HTTP Status | Reason |
|---|---|---|
| `BILL_ALREADY_CONFIRMED` | 400 | Attempted to modify or re-confirm an already confirmed bill |
| `SUPPLIER_INACTIVE` | 400 | Supplier account is suspended or deactivated |
| `DUPLICATE_SUPPLIER_INVOICE` | 409 | Supplier bill number already logged for this supplier |

---

## 9. Authorization Requirements
- Create / Edit / Confirm: `OWNER` or `ADMIN`.
- View Bills: `OWNER`, `ADMIN`, `STAFF`.

---

## 10. Dependencies
- `SupplierService`: Verifies supplier status and appends payable entry.
- `InventoryService`: Records `PURCHASE_RECEIPT` movements and updates WAC.
- `AuditService`: Logs bill state transitions.

---

## 11. Edge Cases
1. **Duplicate Supplier Invoice Number:** System checks `(supplier_id, supplier_bill_number)` to prevent accidental double-entry of the same vendor bill.
2. **Zero Price Samples:** Unit price of 0 is valid for promotional supplier samples (inventory stock is incremented, WAC is re-weighted down).

---

## 12. Test Cases
1. **TC-PURCH-01:** Creating draft bill accurately calculates line item tax at 1800 bps (18%) and total paise.
2. **TC-PURCH-02:** Confirming bill increments inventory balance and appends payable record to supplier ledger.
3. **TC-PURCH-03:** Calling `/confirm` twice returns error or idempotent original response without duplicating stock.
