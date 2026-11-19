# Low-Level Design: Inventory Management Module

**Module Name:** Inventory & Stock Logistics (`inventory`)  
**File Reference:** `docs/architecture/LLD/inventory.md`  
**Status:** Approved Specification  

---

## 1. Module Purpose
The Inventory Management Module provides a double-entry, append-only physical stock tracking engine. It calculates stock balances, enforces negative inventory protection, manages cycle count adjustments, logs damage write-offs, and calculates inventory asset valuation using Weighted Average Cost (WAC).

---

## 2. Responsibilities
- Maintain an immutable, append-only ledger of stock movements (`inventory_movements`).
- Maintain an atomic cache table (`inventory_balances`) updated inside the same transaction as movement writes.
- Enforce inventory invariants: Negative stock is prohibited during normal sales dispatches.
- Support physical stock audit adjustments with mandatory reason codes.
- Track unit costs on inward movements to derive Weighted Average Cost (WAC).
- Provide stock valuation reports for balance sheet and P&L derivation.

---

## 3. Input and Output Contracts

```typescript
export type InventoryMovementType = 
  | 'PURCHASE_RECEIPT'
  | 'SALE_DISPATCH'
  | 'PURCHASE_RETURN'
  | 'SALE_RETURN'
  | 'ADJUSTMENT_ADD'
  | 'ADJUSTMENT_SUB'
  | 'DAMAGE_WRITE_OFF';

export interface RecordMovementDTO {
  productId: string;
  movementType: InventoryMovementType;
  quantityMilliUnits: number;     // e.g. 5000 = 5.000 units
  unitCostPaise?: number;         // Required for inward movements
  referenceType: 'PURCHASE_BILL' | 'SALES_INVOICE' | 'DEBIT_NOTE' | 'CREDIT_NOTE' | 'MANUAL_AUDIT';
  referenceId: string;
  notes?: string;
}

export interface InventoryBalanceDTO {
  productId: string;
  sku: string;
  productName: string;
  currentStockUnits: number;      // quantityMilliUnits / 1000
  currentStockMilliUnits: number;
  averageCostPaise: number;       // Weighted average cost per unit
  totalValuationPaise: number;    // (currentStockMilliUnits * averageCostPaise) / 1000
  lastMovementAt: string;
}

export interface StockAdjustmentRequestDTO {
  productId: string;
  adjustmentType: 'ADD' | 'SUBTRACT';
  quantityMilliUnits: number;
  reason: 'PHYSICAL_COUNT_DISCREPANCY' | 'DAMAGED_IN_WAREHOUSE' | 'EXPIRED' | 'FOUND_STOCK';
  notes: string;
}
```

---

## 4. Database Tables

```sql
CREATE TABLE inventory_balances (
    product_id TEXT PRIMARY KEY,
    current_stock_milli_units INTEGER NOT NULL DEFAULT 0,
    weighted_avg_cost_paise INTEGER NOT NULL DEFAULT 0,
    last_updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

CREATE TABLE inventory_movements (
    id TEXT PRIMARY KEY,                       -- UUID v4
    product_id TEXT NOT NULL,
    movement_type TEXT NOT NULL,               -- 'PURCHASE_RECEIPT', 'SALE_DISPATCH', etc.
    quantity_milli_units INTEGER NOT NULL,     -- Positive for inward, negative for outward
    unit_cost_paise INTEGER NOT NULL DEFAULT 0,-- Cost per unit in paise at time of movement
    balance_after_milli_units INTEGER NOT NULL,-- Snapshot of running balance
    reference_type TEXT NOT NULL,              -- Reference table
    reference_id TEXT NOT NULL,                -- Reference row ID
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    created_by TEXT NOT NULL,                  -- User ID
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_inv_mov_product ON inventory_movements(product_id);
CREATE INDEX idx_inv_mov_created_at ON inventory_movements(created_at);
CREATE INDEX idx_inv_mov_ref ON inventory_movements(reference_type, reference_id);
```

---

## 5. API Endpoints

### 5.1 GET `/api/v1/inventory`
- **Description:** List current inventory balances across all products with valuation and low-stock indicators.
- **Query Params:** `search=teak&filter=low_stock&page=1&limit=50`
- **Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "productId": "prod_01",
      "sku": "LAM-TEAK-01",
      "productName": "Teak Wood Laminate Sheet 8x4",
      "currentStockUnits": 24.0,
      "currentStockMilliUnits": 24000,
      "averageCostPaise": 118000,
      "totalValuationPaise": 2832000,
      "lastMovementAt": "2026-11-19T14:30:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 50, "total": 1 }
}
```

### 5.2 GET `/api/v1/inventory/:productId/movements`
- **Description:** Get full audit movement ledger for a specific product.
- **Success Response (200 OK):** `ApiResponse<InventoryMovement[]>`

### 5.3 POST `/api/v1/inventory/adjust`
- **Description:** Perform manual physical count adjustment or damage write-off.
- **Request Body:** `StockAdjustmentRequestDTO`
- **Success Response (200 OK):** `ApiResponse<InventoryBalanceDTO>`

---

## 6. Business Rules
1. **Append-Only Immutability:** Records in `inventory_movements` can never be edited or deleted (`UPDATE` and `DELETE` trigger errors). Any correction requires an offsetting adjustment record.
2. **Negative Stock Prevention:** If `SALE_DISPATCH` or `ADJUSTMENT_SUB` causes `current_stock_milli_units < 0`, the transaction is rolled back immediately with `INSUFFICIENT_STOCK_ERROR`.
3. **Weighted Average Cost (WAC) Update Rule:**
   Upon inward receipt of $Q_{new}$ units at unit cost $C_{new}$, the new average cost $C_{avg}'$ is computed:
   $$C_{avg}' = \frac{(Q_{curr} \times C_{curr}) + (Q_{new} \times C_{new})}{Q_{curr} + Q_{new}}$$
4. **Outward Valuation:** Outward movements (`SALE_DISPATCH`, `DAMAGE_WRITE_OFF`) are costed at the prevailing Weighted Average Cost at transaction time to compute COGS.

---

## 7. Validation Rules
- `quantityMilliUnits`: Positive non-zero integer.
- `reason`: Required for all manual adjustments.
- `unitCostPaise`: Required for `PURCHASE_RECEIPT` and `ADJUSTMENT_ADD`.

---

## 8. Error Handling
| Error Code | HTTP Status | Reason |
|---|---|---|
| `INSUFFICIENT_STOCK` | 400 | Available stock is insufficient to satisfy outward dispatch |
| `INVALID_ADJUSTMENT_REASON` | 400 | Reason code is missing or unapproved |
| `PRODUCT_INACTIVE` | 400 | Cannot move inventory for a deactivated product |

---

## 9. Authorization Requirements
- View Inventory & Movements: `OWNER`, `ADMIN`, `STAFF`.
- Manual Stock Adjustment: Restricted to `OWNER` or `ADMIN`.

---

## 10. Dependencies
- `ProductModule`: Validates product status and references.
- `AuditService`: Logs all manual adjustments and discrepancies.

---

## 11. Edge Cases
1. **Zero Stock Re-inward:** When current stock is 0, new WAC becomes exactly the inward purchase unit cost.
2. **Concurrent Dispatches:** Two simultaneous checkout requests for the last available item will execute sequentially within D1 transactions; the second transaction reads the decremented balance and rejects with `INSUFFICIENT_STOCK`.

---

## 12. Test Cases
1. **TC-INV-01:** Adding 10 units via Purchase Receipt increases stock balance from 0 to 10,000 milli-units and updates WAC.
2. **TC-INV-02:** Dispatching 12 units when only 10 exist throws 400 `INSUFFICIENT_STOCK` and rolls back transaction.
3. **TC-INV-03:** Cycle count adjustment `SUBTRACT` creates `ADJUSTMENT_SUB` movement and decrements balance.
4. **TC-INV-04:** Attempting to `UPDATE` an inventory movement record via SQL raises an exception via trigger.
