# Low-Level Design: Product Management Module

**Module Name:** Product Catalog Management (`products`)  
**File Reference:** `docs/architecture/LLD/products.md`  
**Status:** Approved Specification  

---

## 1. Module Purpose
The Product Management Module governs the central catalog of commercial products, materials, and services, tracking SKUs, barcodes, HSN/SAC codes, tax slabs, units of measure, default pricing, and reorder levels.

---

## 2. Responsibilities
- Manage product lifecycle: creation, modification, categorization, and deactivation.
- Maintain tax configurations (GST tax rate slabs: 0%, 5%, 12%, 18%, 28%) and HSN codes.
- Manage base Unit of Measure (UOM) definitions (Pieces, Kg, Liters, Meters, Boxes).
- Enforce SKU and barcode uniqueness.
- Prevent destructive deletion of products with existing inventory movements, sales, or purchase histories.

---

## 3. Input and Output Contracts

```typescript
export interface CreateProductDTO {
  sku: string;                     // e.g. "LAM-TEAK-01"
  barcode?: string;
  name: string;                    // Product Name
  description?: string;
  categoryId: string;
  uom: 'PCS' | 'KGS' | 'MTR' | 'LTR' | 'BOX';
  hsnCode: string;                 // 4, 6, or 8 digit HSN code
  taxRateBps: number;              // Tax rate in basis points (e.g. 1800 = 18.00%)
  costPricePaise: number;          // Default purchase cost in integer paise
  sellingPricePaise: number;       // Default sale price in integer paise
  minStockAlertLevel: number;      // Reorder trigger point in whole units
}

export interface UpdateProductDTO extends Partial<CreateProductDTO> {
  isActive?: boolean;
}

export interface ProductResponseDTO {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  description: string | null;
  categoryId: string;
  categoryName?: string;
  uom: string;
  hsnCode: string;
  taxRateBps: number;
  costPricePaise: number;
  sellingPricePaise: number;
  minStockAlertLevel: number;
  currentStockUnits?: number;      // Computed from inventory balance
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

---

## 4. Database Tables

```sql
CREATE TABLE product_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    parent_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    FOREIGN KEY (parent_id) REFERENCES product_categories(id) ON DELETE SET NULL
);

CREATE TABLE products (
    id TEXT PRIMARY KEY,                       -- UUID v4
    sku TEXT UNIQUE NOT NULL COLLATE NOCASE,   -- Stock Keeping Unit
    barcode TEXT UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    category_id TEXT NOT NULL,
    uom TEXT NOT NULL DEFAULT 'PCS',           -- Unit of measure
    hsn_code TEXT NOT NULL,                    -- Harmonized System of Nomenclature
    tax_rate_bps INTEGER NOT NULL DEFAULT 1800,-- 18% = 1800 bps
    cost_price_paise INTEGER NOT NULL DEFAULT 0,
    selling_price_paise INTEGER NOT NULL DEFAULT 0,
    min_stock_alert_level INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    FOREIGN KEY (category_id) REFERENCES product_categories(id)
);

CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_hsn ON products(hsn_code);
```

---

## 5. API Endpoints

### 5.1 GET `/api/v1/products`
- **Description:** List products with search, category filtering, and pagination.
- **Query Params:** `search=teak&category_id=cat_1&page=1&limit=25&is_active=true`
- **Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "prod_01",
      "sku": "LAM-TEAK-01",
      "name": "Teak Wood Laminate Sheet 8x4",
      "categoryName": "Laminates",
      "uom": "PCS",
      "hsnCode": "4410",
      "taxRateBps": 1800,
      "costPricePaise": 120000,
      "sellingPricePaise": 185000,
      "minStockAlertLevel": 10,
      "currentStockUnits": 24,
      "isActive": true
    }
  ],
  "meta": { "page": 1, "limit": 25, "total": 1 }
}
```

### 5.2 POST `/api/v1/products`
- **Description:** Create a new product catalog item.
- **Request Body:** `CreateProductDTO`
- **Success Response (201 Created):** `ApiResponse<ProductResponseDTO>`

### 5.3 GET `/api/v1/products/:id`
- **Description:** Fetch product details including current stock.
- **Success Response (200 OK):** `ApiResponse<ProductResponseDTO>`

### 5.4 PUT `/api/v1/products/:id`
- **Description:** Update product metadata, tax rates, or pricing.
- **Request Body:** `UpdateProductDTO`
- **Success Response (200 OK):** `ApiResponse<ProductResponseDTO>`

### 5.5 DELETE `/api/v1/products/:id`
- **Description:** Soft-deactivate product (`isActive = false`).
- **Success Response (200 OK):** `{"success": true, "data": {"message": "Product deactivated"}}`

---

## 6. Business Rules
1. **Uniqueness:** SKU must be unique across all products. Barcodes (if specified) must be globally unique.
2. **Deactivation Policy:** Hard deletion (`DELETE FROM products`) is strictly rejected if the product has associated records in `inventory_movements`, `purchase_items`, or `sales_items`. The system enforces soft deactivation (`is_active = 0`).
3. **Price Precision:** All prices must be non-negative integers in paise. Selling price should generally be greater than or equal to cost price; if lower, a warning is logged.
4. **GST Tax Slabs:** `tax_rate_bps` must be a recognized Indian GST slab: `0` (0%), `500` (5%), `1200` (12%), `1800` (18%), `2800` (28%).

---

## 7. Validation Rules
- `sku`: Required, alphanumeric string, 3 to 50 characters.
- `name`: Required, 2 to 255 characters.
- `hsnCode`: Required, numeric string with length 4, 6, or 8.
- `costPricePaise` & `sellingPricePaise`: Integer >= 0.
- `minStockAlertLevel`: Integer >= 0.
- `uom`: Must be one of `PCS`, `KGS`, `MTR`, `LTR`, `BOX`.

---

## 8. Error Handling
| Error Code | HTTP Status | Reason |
|---|---|---|
| `DUPLICATE_SKU` | 409 | A product with the provided SKU already exists |
| `DUPLICATE_BARCODE` | 409 | Barcode is already assigned to another item |
| `CATEGORY_NOT_FOUND` | 404 | Provided `categoryId` does not exist |
| `CANNOT_DELETE_ACTIVE_PRODUCT` | 400 | Product has existing transactions; must be deactivated instead |

---

## 9. Authorization Requirements
- Read endpoints: Authenticated user (`OWNER`, `ADMIN`, `STAFF`).
- Write/Update/Delete: Authenticated user with role `OWNER` or `ADMIN`.

---

## 10. Dependencies
- `IInventoryService`: Initializes a 0-balance row in `inventory_balances` when a new product is created.
- `IAuditService`: Logs product creation, price modifications, and status changes.

---

## 11. Edge Cases
1. **Case-Insensitive SKUs:** SKUs "sku-01" and "SKU-01" must collide; enforced by SQLite `COLLATE NOCASE`.
2. **Category Deletion:** Categories cannot be deleted if active products are assigned to them.

---

## 12. Test Cases
1. **TC-PROD-01:** Creating product with valid SKU and 18% GST succeeds and initializes 0 stock balance.
2. **TC-PROD-02:** Attempting to create duplicate SKU returns 409 `DUPLICATE_SKU`.
3. **TC-PROD-03:** Updating selling price logs audit record with old and new values.
4. **TC-PROD-04:** Deleting product with existing invoice history sets `is_active = 0` without removing record.
