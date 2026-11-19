# REST API v1 Specification: BusinessHub Enterprise

**Base Path:** `/api/v1`  
**Protocol:** HTTPS / TLS 1.3  
**Document Reference:** `docs/api/API.md`  
**Version:** 1.0.0  
**Data Format:** JSON (`application/json; charset=utf-8`)  

---

## 1. Global API Conventions

### 1.1 Standard Request Headers
| Header | Type | Description |
|---|---|---|
| `Content-Type` | String | Must be `application/json` for write operations. |
| `Idempotency-Key` | String | Optional UUID v4 on `POST` transaction creations to guarantee exactly-once execution. |
| `Cookie` | String | Must contain `session_token=<token>` for authenticated endpoints. |

### 1.2 Standard Success Response Envelope
All successful API responses return HTTP 200 (or 201 Created) wrapped in the standard response envelope:
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 25,
    "total": 142
  }
}
```

### 1.3 Standard Error Response Envelope
All error responses return standard HTTP error codes (400, 401, 403, 404, 409, 422, 500) wrapped in a structured envelope. Internal SQL errors, stack traces, and sensitive data are strictly stripped:
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Available stock of 4.000 units is insufficient for requested 10.000 units.",
    "details": {
      "productId": ["Available: 4000 milli-units", "Requested: 10000 milli-units"]
    }
  }
}
```

### 1.4 Standard Currency & Numeric Representation
- All currency amounts are transmitted as **integer paise** (e.g. ₹1,250.75 is sent as `125075`).
- Quantities are transmitted as **integer milli-units** (e.g. 2.500 kg is sent as `2500`).

---

## 2. API Endpoints Directory

### 2.1 Authentication (`/api/v1/auth`)
| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/login` | Public | Authenticates credentials; sets secure `HttpOnly` cookie. |
| `POST` | `/api/v1/auth/logout` | Session | Revokes current session token and clears cookie. |
| `GET` | `/api/v1/auth/me` | Session | Returns currently authenticated user context. |
| `POST` | `/api/v1/auth/change-password` | Session | Changes current user password. |

### 2.2 Dashboard (`/api/v1/dashboard`)
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/dashboard/summary` | Admin | Returns aggregate KPI cards, alerts, and recent transactions. |

### 2.3 Product Management (`/api/v1/products`)
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/products` | Staff+ | List products with pagination, search, and category filters. |
| `POST` | `/api/v1/products` | Admin+ | Create a new product catalog item. |
| `GET` | `/api/v1/products/:id` | Staff+ | Retrieve product details, price slabs, and current stock. |
| `PUT` | `/api/v1/products/:id` | Admin+ | Update product metadata, tax rates, and prices. |
| `DELETE` | `/api/v1/products/:id` | Admin+ | Soft-deactivate product (`isActive = false`). |
| `GET` | `/api/v1/product-categories` | Staff+ | List product hierarchical categories. |
| `POST` | `/api/v1/product-categories` | Admin+ | Create a new category. |

### 2.4 Inventory Management (`/api/v1/inventory`)
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/inventory` | Staff+ | List current stock balances, average cost, and asset valuation. |
| `GET` | `/api/v1/inventory/:productId/movements` | Staff+ | Get chronological immutable movement history for a product. |
| `POST` | `/api/v1/inventory/adjust` | Admin+ | Record manual physical count adjustment or damage write-off. |

### 2.5 Purchasing & Procurement (`/api/v1/purchases`)
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/purchases` | Staff+ | List purchase bills with vendor, date, and status filters. |
| `POST` | `/api/v1/purchases` | Admin+ | Create a new purchase bill in `DRAFT` status. |
| `GET` | `/api/v1/purchases/:id` | Staff+ | Retrieve purchase bill details and line items. |
| `PUT` | `/api/v1/purchases/:id` | Admin+ | Update line items of a draft purchase bill. |
| `POST` | `/api/v1/purchases/:id/confirm` | Admin+ | Confirms bill: increments stock and credits supplier payable. |
| `POST` | `/api/v1/purchases/:id/return` | Admin+ | Issue a Debit Note for returned defective goods. |

### 2.6 Supplier Management (`/api/v1/suppliers`)
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/suppliers` | Staff+ | List suppliers with search and outstanding payable balance. |
| `POST` | `/api/v1/suppliers` | Admin+ | Register a new supplier. |
| `GET` | `/api/v1/suppliers/:id` | Staff+ | Retrieve supplier profile and bank account details. |
| `PUT` | `/api/v1/suppliers/:id` | Admin+ | Update supplier profile and terms. |
| `GET` | `/api/v1/suppliers/:id/ledger` | Staff+ | Get complete running account statement for supplier. |

### 2.7 Sales & Invoicing (`/api/v1/sales`)
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/sales` | Staff+ | List sales invoices with customer, date, and status filters. |
| `POST` | `/api/v1/sales` | Admin+ | Create a new sales invoice in `DRAFT` status. |
| `GET` | `/api/v1/sales/:id` | Staff+ | Retrieve sales invoice details, GST split, and line items. |
| `PUT` | `/api/v1/sales/:id` | Admin+ | Update draft sales invoice. |
| `POST` | `/api/v1/sales/:id/confirm` | Admin+ | Confirms invoice: verifies & decrements stock, debits customer AR. |
| `POST` | `/api/v1/sales/:id/return` | Admin+ | Issue a Credit Note for returned goods and replenish stock. |

### 2.8 Customer Management (`/api/v1/customers`)
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/customers` | Staff+ | List customers with outstanding receivables and credit limits. |
| `POST` | `/api/v1/customers` | Admin+ | Create a new customer profile. |
| `GET` | `/api/v1/customers/:id` | Staff+ | Retrieve customer details and credit terms. |
| `PUT` | `/api/v1/customers/:id` | Admin+ | Update customer profile. |
| `GET` | `/api/v1/customers/:id/ledger` | Staff+ | Get running statement of account for customer. |
| `GET` | `/api/v1/customers/:id/aging` | Staff+ | Get receivables aging breakdown (0-30, 31-60, 61-90, 90+). |

### 2.9 Collections & Receipts (`/api/v1/collections`)
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/collections` | Staff+ | List customer payment receipts. |
| `POST` | `/api/v1/collections` | Staff+ | Record a customer payment and allocate against invoices. |
| `GET` | `/api/v1/collections/:id` | Staff+ | Retrieve collection voucher and invoice allocation details. |

### 2.10 Operational Expenses (`/api/v1/expenses`)
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/expenses` | Admin+ | List operational expenses with date and category filters. |
| `POST` | `/api/v1/expenses` | Admin+ | Create a new operational expense voucher. |
| `POST` | `/api/v1/expenses/upload-receipt` | Admin+ | Upload receipt file to Cloudflare R2 bucket. |
| `GET` | `/api/v1/expense-categories` | Admin+ | List active operational expense categories. |

### 2.11 Financial Reporting & Analytics (`/api/v1/reports`)
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/reports/profit-loss` | Owner | Generate complete Profit & Loss statement for date range. |
| `GET` | `/api/v1/reports/cash-flow` | Owner | Generate Operating Cash Flow report. |
| `GET` | `/api/v1/reports/gst/gstr-1` | Admin+ | Generate GSTR-1 outward supplies return summary. |
| `GET` | `/api/v1/reports/aging/receivables` | Admin+ | Generate comprehensive customer AR aging report. |
| `GET` | `/api/v1/reports/aging/payables` | Admin+ | Generate comprehensive vendor AP aging report. |
| `GET` | `/api/v1/reports/export/csv` | Admin+ | Stream CSV export for selected register or report. |

### 2.12 Settings & Configuration (`/api/v1/settings`)
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/settings` | Staff+ | Retrieve business identity, tax details, and invoice preferences. |
| `PUT` | `/api/v1/settings` | Owner | Update business details, bank accounts, and invoice sequences. |
| `POST` | `/api/v1/settings/logo` | Owner | Upload brand logo to Cloudflare R2. |

### 2.13 Audit Logs (`/api/v1/audit`)
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/audit/logs` | Owner | Query immutable system audit trail with user and entity filters. |

---

## 3. Standard Error Code Catalog

| Code | HTTP Status | Description |
|---|---|---|
| `UNAUTHORIZED` | 401 | Missing, expired, or invalid session token |
| `FORBIDDEN` | 403 | Insufficient role permissions for this resource |
| `NOT_FOUND` | 404 | Target entity ID does not exist |
| `VALIDATION_FAILED` | 422 | Request body failed schema validation |
| `DUPLICATE_SKU` | 409 | Product SKU already exists in catalog |
| `DUPLICATE_BARCODE` | 409 | Barcode is already registered |
| `INSUFFICIENT_STOCK` | 400 | Dispatched quantity exceeds available inventory |
| `CREDIT_LIMIT_EXCEEDED` | 400 | Customer outstanding balance exceeds authorized credit limit |
| `BILL_ALREADY_CONFIRMED` | 400 | Purchase bill has already been confirmed |
| `INVOICE_ALREADY_CONFIRMED`| 400 | Sales invoice has already been issued |
| `ALLOCATION_SUM_MISMATCH`| 400 | Collection allocations exceed total payment received |
| `IMMUTABLE_RECORD` | 400 | Attempted to update or delete an append-only ledger entry |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests in time window |
| `INTERNAL_ERROR` | 500 | Unhandled server error (details logged securely) |
