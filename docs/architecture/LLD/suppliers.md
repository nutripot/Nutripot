# Low-Level Design: Supplier Management Module

**Module Name:** Supplier & Vendor Management (`suppliers`)  
**File Reference:** `docs/architecture/LLD/suppliers.md`  
**Status:** Approved Specification  

---

## 1. Module Purpose
The Supplier Management Module maintains vendor master data, records commercial terms, tracks Accounts Payable (AP), maintains an immutable vendor ledger, and manages disbursements and debit note reconciliations.

---

## 2. Responsibilities
- Manage supplier master records (Legal entity name, GSTIN, PAN, Contact, Payment Terms, Bank Details).
- Maintain an immutable, double-entry supplier running balance ledger (`supplier_ledger`).
- Track Accounts Payable balances (Total Billed vs. Total Paid).
- Track vendor payment terms and compute upcoming payment obligations.
- Support supplier statement generation and audit reconciliation.

---

## 3. Input and Output Contracts

```typescript
export interface CreateSupplierDTO {
  name: string;
  contactPerson?: string;
  email?: string;
  phone: string;
  gstin?: string;                  // 15-character Indian GSTIN
  pan?: string;                    // 10-character PAN
  billingAddress: string;
  paymentTermsDays: number;        // e.g. 0 (Immediate), 15, 30, 45
  bankDetails?: {
    accountName: string;
    accountNumber: string;
    ifscCode: string;
    bankName: string;
  };
}

export interface SupplierLedgerEntryDTO {
  id: string;
  entryDate: string;
  entryType: 'PURCHASE_BILL' | 'PAYMENT_DISBURSEMENT' | 'DEBIT_NOTE' | 'OPENING_BALANCE';
  referenceId: string;
  referenceNumber: string;
  debitPaise: number;              // Payments made / Debit Notes
  creditPaise: number;             // Bills received
  runningBalancePaise: number;     // Cumulative net payable balance
  notes?: string;
}

export interface SupplierResponseDTO {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string;
  email: string | null;
  gstin: string | null;
  paymentTermsDays: number;
  currentPayablePaise: number;     // Outstanding liability
  isActive: boolean;
  createdAt: string;
}
```

---

## 4. Database Tables

```sql
CREATE TABLE suppliers (
    id TEXT PRIMARY KEY,                       -- UUID v4
    name TEXT NOT NULL,
    contact_person TEXT,
    email TEXT,
    phone TEXT NOT NULL,
    gstin TEXT,
    pan TEXT,
    billing_address TEXT NOT NULL,
    payment_terms_days INTEGER NOT NULL DEFAULT 30,
    bank_account_name TEXT,
    bank_account_number TEXT,
    bank_ifsc TEXT,
    bank_name TEXT,
    current_payable_paise INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
);

CREATE TABLE supplier_ledger (
    id TEXT PRIMARY KEY,
    supplier_id TEXT NOT NULL,
    entry_date TEXT NOT NULL,
    entry_type TEXT NOT NULL,                  -- 'PURCHASE_BILL', 'PAYMENT_DISBURSEMENT', 'DEBIT_NOTE', 'OPENING_BALANCE'
    reference_id TEXT NOT NULL,
    reference_number TEXT NOT NULL,
    debit_paise INTEGER NOT NULL DEFAULT 0,    -- Reduces payable
    credit_paise INTEGER NOT NULL DEFAULT 0,   -- Increases payable
    running_balance_paise INTEGER NOT NULL,    -- Net liability balance
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    created_by TEXT NOT NULL,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_suppliers_gstin ON suppliers(gstin);
CREATE INDEX idx_supp_ledger_supp ON supplier_ledger(supplier_id);
CREATE INDEX idx_supp_ledger_date ON supplier_ledger(entry_date);
```

---

## 5. API Endpoints

### 5.1 GET `/api/v1/suppliers`
- **Description:** List suppliers with search, balance summary, and pagination.
- **Success Response (200 OK):** `ApiResponse<SupplierResponseDTO[]>`

### 5.2 POST `/api/v1/suppliers`
- **Description:** Create a new supplier.
- **Request Body:** `CreateSupplierDTO`
- **Success Response (201 Created):** `ApiResponse<SupplierResponseDTO>`

### 5.3 GET `/api/v1/suppliers/:id/ledger`
- **Description:** Fetch comprehensive running ledger statement for supplier.
- **Query Params:** `startDate=2026-01-01&endDate=2026-11-19`
- **Success Response (200 OK):** `ApiResponse<SupplierLedgerEntryDTO[]>`

---

## 6. Business Rules
1. **Ledger Immutability:** Entries in `supplier_ledger` are strictly append-only.
2. **Double-Entry Balance Invariant:**
   $$\text{running\_balance}_{n} = \text{running\_balance}_{n-1} + \text{credit\_paise}_n - \text{debit\_paise}_n$$
   A positive balance indicates an active liability owed to the vendor.
3. **GSTIN Validation:** When provided, GSTIN must match the standard 15-character alphanumeric Indian format (`^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$`).

---

## 7. Validation Rules
- `name`: Required, 2 to 255 characters.
- `phone`: Required, valid telephone format.
- `paymentTermsDays`: Non-negative integer (0 to 180).

---

## 8. Error Handling
| Error Code | HTTP Status | Reason |
|---|---|---|
| `INVALID_GSTIN` | 400 | GSTIN format invalid |
| `SUPPLIER_HAS_BALANCE` | 400 | Cannot deactivate supplier with outstanding non-zero balance |

---

## 9. Authorization Requirements
- Read endpoints: `OWNER`, `ADMIN`, `STAFF`.
- Create / Update: `OWNER`, `ADMIN`.

---

## 10. Dependencies
- `IPurchaseService`: Calls supplier ledger to credit bills and debit returns.
- `IExpenseService`: Calls supplier ledger for vendor expense disbursements.

---

## 11. Edge Cases
1. **Debit Balance (Advance Payment):** If business pays a supplier before receiving the bill, running balance becomes negative (representing an asset/advance to vendor).
2. **GSTIN Collision:** Warning issued if two vendors share the same GSTIN (can occur with different operating branch divisions).

---

## 12. Test Cases
1. **TC-SUPP-01:** Creating supplier with valid GSTIN and 30-day terms stores record with 0 payable.
2. **TC-SUPP-02:** Recording a ₹10,000 bill appends credit of `1000000` paise and updates `current_payable_paise`.
3. **TC-SUPP-03:** Disbursement of ₹6,000 appends debit of `600000` paise and reduces running balance to `400000` paise.
