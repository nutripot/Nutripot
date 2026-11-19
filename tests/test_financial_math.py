import math

def calculate_gst_tax(taxable_paise: int, tax_rate_bps: int, is_intra_state: bool):
    """
    Computes GST tax breakdown in integer paise.
    tax_rate_bps: e.g. 1800 for 18.00%
    """
    total_tax_paise = round((taxable_paise * tax_rate_bps) / 10000)
    
    if is_intra_state:
        # Split equally; if odd, assign remainder to CGST
        cgst_paise = math.ceil(total_tax_paise / 2)
        sgst_paise = total_tax_paise - cgst_paise
        igst_paise = 0
    else:
        cgst_paise = 0
        sgst_paise = 0
        igst_paise = total_tax_paise
        
    assert cgst_paise + sgst_paise + igst_paise == total_tax_paise, "Tax split sum invariant failed!"
    return {
        "taxable_paise": taxable_paise,
        "cgst_paise": cgst_paise,
        "sgst_paise": sgst_paise,
        "igst_paise": igst_paise,
        "total_tax_paise": total_tax_paise,
        "grand_total_paise": taxable_paise + total_tax_paise
    }

def calculate_new_wac(current_qty_milli: int, current_wac_paise: int, inward_qty_milli: int, inward_unit_cost_paise: int):
    """
    Calculates new Weighted Average Cost (WAC) per unit in paise.
    """
    total_qty_milli = current_qty_milli + inward_qty_milli
    if total_qty_milli == 0:
        return 0
    
    current_val_paise = round((current_qty_milli * current_wac_paise) / 1000)
    inward_val_paise = round((inward_qty_milli * inward_unit_cost_paise) / 1000)
    new_wac = round(((current_val_paise + inward_val_paise) * 1000) / total_qty_milli)
    return new_wac

def allocate_collection_fifo(invoices: list, collection_amount_paise: int):
    """
    Allocates payment amount across unpaid invoices sorted by due date (FIFO).
    invoices: list of dicts with 'id', 'unpaid_paise'
    """
    remaining_paise = collection_amount_paise
    allocations = []
    
    for inv in invoices:
        if remaining_paise <= 0:
            break
        alloc = min(inv["unpaid_paise"], remaining_paise)
        allocations.append({
            "invoice_id": inv["id"],
            "allocated_paise": alloc
        })
        remaining_paise -= alloc
        
    return {
        "allocations": allocations,
        "unallocated_advance_paise": remaining_paise
    }

def calculate_pnl(gross_sales_paise: int, returns_paise: int, cogs_paise: int, opex_paise: int):
    net_revenue_paise = gross_sales_paise - returns_paise
    gross_profit_paise = net_revenue_paise - cogs_paise
    net_income_paise = gross_profit_paise - opex_paise
    
    gp_margin = (gross_profit_paise / net_revenue_paise * 100.0) if net_revenue_paise > 0 else 0.0
    net_margin = (net_income_paise / net_revenue_paise * 100.0) if net_revenue_paise > 0 else 0.0
    
    return {
        "net_revenue_paise": net_revenue_paise,
        "gross_profit_paise": gross_profit_paise,
        "gross_margin_percent": round(gp_margin, 2),
        "net_income_paise": net_income_paise,
        "net_margin_percent": round(net_margin, 2)
    }

def run_tests():
    print("=== RUNNING FINANCIAL INVARIANT TESTS ===")
    
    # Test 1: Even paise tax split
    tax1 = calculate_gst_tax(100000, 1800, is_intra_state=True) # ₹1,000.00 @ 18% = ₹180.00
    assert tax1["total_tax_paise"] == 18000
    assert tax1["cgst_paise"] == 9000
    assert tax1["sgst_paise"] == 9000
    print("PASS: Even paise tax split (18% on ₹1,000.00)")
    
    # Test 2: Odd paise tax split
    tax2 = calculate_gst_tax(151, 1800, is_intra_state=True) # ₹1.51 @ 18% = 27.18 paise -> 27 paise
    assert tax2["total_tax_paise"] == 27
    assert tax2["cgst_paise"] == 14
    assert tax2["sgst_paise"] == 13
    assert tax2["cgst_paise"] + tax2["sgst_paise"] == 27
    print("PASS: Odd paise tax split (18% on ₹1.51 -> CGST: 14p, SGST: 13p)")
    
    # Test 3: Inter-state tax (IGST only)
    tax3 = calculate_gst_tax(100000, 1800, is_intra_state=False)
    assert tax3["cgst_paise"] == 0
    assert tax3["sgst_paise"] == 0
    assert tax3["igst_paise"] == 18000
    print("PASS: Inter-state IGST tax assignment")
    
    # Test 4: WAC costing
    # 10 units @ ₹100, then purchase 5 units @ ₹130 -> new avg cost = ₹110
    wac = calculate_new_wac(
        current_qty_milli=10000, 
        current_wac_paise=10000, 
        inward_qty_milli=5000, 
        inward_unit_cost_paise=13000
    )
    assert wac == 11000, f"Expected 11000 paise, got {wac}"
    print(f"PASS: Weighted Average Costing: 10 @ ₹100 + 5 @ ₹130 = ₹{wac/100:.2f}/unit")
    
    # Test 5: Collection FIFO allocation with advance
    invoices = [
        {"id": "inv_1", "unpaid_paise": 400000}, # ₹4,000
        {"id": "inv_2", "unpaid_paise": 500000}, # ₹5,000
    ]
    # Customer pays ₹10,000 (1,000,000 paise)
    res = allocate_collection_fifo(invoices, 1000000)
    assert res["allocations"][0]["allocated_paise"] == 400000
    assert res["allocations"][1]["allocated_paise"] == 500000
    assert res["unallocated_advance_paise"] == 100000 # ₹1,000 surplus advance
    print("PASS: Collection FIFO settlement: Inv 1 fully settled, Inv 2 fully settled, ₹1,000 advance stored")
    
    # Test 6: P&L Calculation
    pnl = calculate_pnl(
        gross_sales_paise=10000000, # ₹1,00,000
        returns_paise=500000,       # ₹5,000
        cogs_paise=5500000,         # ₹55,000
        opex_paise=1500000          # ₹15,000
    )
    assert pnl["net_revenue_paise"] == 9500000   # ₹95,000
    assert pnl["gross_profit_paise"] == 4000000  # ₹40,000
    assert pnl["gross_margin_percent"] == 42.11  # (40,000 / 95,000) * 100
    assert pnl["net_income_paise"] == 2500000    # ₹25,000
    assert pnl["net_margin_percent"] == 26.32    # (25,000 / 95,000) * 100
    print(f"PASS: Profit & Loss: Net Rev ₹{pnl['net_revenue_paise']/100:.2f}, GP ₹{pnl['gross_profit_paise']/100:.2f} ({pnl['gross_margin_percent']}%), Net ₹{pnl['net_income_paise']/100:.2f} ({pnl['net_margin_percent']}%)")
    
    print("\nALL FINANCIAL INVARIANT TESTS PASSED WITH 100% SUCCESS!")

if __name__ == '__main__':
    run_tests()
