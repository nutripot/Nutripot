# Low-Level Design: Settings & Administration Module

**Module Name:** System Settings & Configuration (`settings`)  
**File Reference:** `docs/architecture/LLD/settings.md`  
**Status:** Approved Specification  

---

## 1. Module Purpose
The Settings Module manages organization identity, legal tax registration details, invoice formatting preferences, document numbering sequences, Cloudflare R2 logo uploads, and system-wide default parameters.

---

## 2. Responsibilities
- Store and serve company legal master data (Legal Name, Trade Name, GSTIN, PAN, Registered Address, State Code).
- Manage bank account details printed on outgoing sales invoices.
- Configure document numbering prefixes and starting sequences (Sales Invoices, Quotations, Purchase Bills, Debit Notes, Credit Notes, Payment Receipts).
- Manage company logo storage in Cloudflare R2 and generate public/CDN URLs.
- Manage default financial and inventory options (e.g., allow negative stock override, default credit days).

---

## 3. Input and Output Contracts

```typescript
export interface CompanySettingsDTO {
  companyName: string;
  tradeName?: string;
  gstin: string;
  pan: string;
  stateCode: string;               // 2-digit GST state code (e.g. "29" for Karnataka)
  stateName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  pincode: string;
  phone: string;
  email: string;
  website?: string;
  logoR2Key?: string;
  logoUrl?: string;
  bankAccount: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    ifscCode: string;
    branchName?: string;
    upiId?: string;
  };
  invoicePreferences: {
    invoicePrefix: string;         // e.g. "INV-2026-"
    nextInvoiceNumber: number;
    receiptPrefix: string;         // e.g. "REC-2026-"
    quotePrefix: string;           // e.g. "QT-2026-"
    termsAndConditionsText: string;
  };
  inventoryPreferences: {
    allowNegativeStock: boolean;   // Default false
    defaultReorderAlertThreshold: number;
  };
}
```

---

## 4. Database Tables

```sql
CREATE TABLE settings (
    id TEXT PRIMARY KEY DEFAULT 'SYSTEM_CONFIG',-- Singleton row
    company_name TEXT NOT NULL,
    trade_name TEXT,
    gstin TEXT NOT NULL,
    pan TEXT NOT NULL,
    state_code TEXT NOT NULL,                  -- 2-digit GST code
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
    next_invoice_number INTEGER NOT NULL DEFAULT 1,
    receipt_prefix TEXT NOT NULL DEFAULT 'REC-2026-',
    terms_conditions TEXT,
    allow_negative_stock INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    updated_by TEXT NOT NULL,
    FOREIGN KEY (updated_by) REFERENCES users(id)
);
```

---

## 5. API Endpoints

### 5.1 GET `/api/v1/settings`
- **Description:** Retrieve current business and system configuration.
- **Success Response (200 OK):** `ApiResponse<CompanySettingsDTO>`

### 5.2 PUT `/api/v1/settings`
- **Description:** Update company profile, bank details, and invoice preferences.
- **Request Body:** `Partial<CompanySettingsDTO>`
- **Success Response (200 OK):** `ApiResponse<CompanySettingsDTO>`

### 5.3 POST `/api/v1/settings/logo`
- **Description:** Upload business brand logo to Cloudflare R2 bucket.
- **Request:** `multipart/form-data`
- **Success Response (200 OK):** `{"success": true, "data": { "logoUrl": "https://..." }}`

---

## 6. Business Rules
1. **Singleton Configuration:** The `settings` table contains exactly one configuration row with `id = 'SYSTEM_CONFIG'`.
2. **State Code Validation:** `state_code` must be a valid 2-digit Indian GST state code (e.g. "29" for Karnataka).
3. **Sequence Numbering Integrity:** `next_invoice_number` must never be manually decremented to protect against duplicate invoice numbers.

---

## 7. Validation Rules
- `gstin`: Valid 15-character GSTIN format.
- `stateCode`: 2-digit numeric string.
- `pincode`: 6-digit Indian postal code.
- `phone`: Valid contact number.

---

## 8. Error Handling
| Error Code | HTTP Status | Reason |
|---|---|---|
| `INVALID_STATE_CODE` | 400 | GST State code does not exist in master list |
| `INVALID_IFSC_CODE` | 400 | Bank IFSC code format is invalid |

---

## 9. Authorization Requirements
- Read: `OWNER`, `ADMIN`, `STAFF`.
- Update: Strictly restricted to `OWNER` role.

---

## 10. Dependencies
- Used by `SalesModule` (for tax place of supply and invoice sequence numbering).
- Used by `R2StorageService` for company logo uploads.

---

## 11. Edge Cases
1. **Unconfigured System:** System defaults to initial bootstrap values until Owner completes onboarding wizard.
2. **Logo Asset Deletion:** Replaced logos in R2 are archived to prevent broken links on previously generated PDF copies.

---

## 12. Test Cases
1. **TC-SETT-01:** Updating company GSTIN and state code updates singleton record and logs audit record.
2. **TC-SETT-02:** Non-owner role attempting to update bank details is rejected with 403 Forbidden.
3. **TC-SETT-03:** Validates 15-character GSTIN regex before saving.
