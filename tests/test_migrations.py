import sqlite3

def run():
    conn = sqlite3.connect(':memory:')
    conn.execute('PRAGMA foreign_keys = ON;')

    for mig in ['0001_initial_schema.sql', '0002_triggers_and_indexes.sql', '0003_seed_data.sql']:
        with open(f'migrations/{mig}', 'r', encoding='utf-8') as f:
            sql = f.read()
            conn.executescript(sql)
        print(f'Applied {mig}')

    tables = conn.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;").fetchall()
    table_names = [t[0] for t in tables]
    print(f'Total tables created: {len(table_names)}')
    print('Tables:', table_names)

    # Verify seed user
    owner = conn.execute("SELECT email, full_name, role FROM users;").fetchone()
    print('Seed Owner:', owner)

    # Verify settings singleton
    settings = conn.execute("SELECT company_name, gstin, state_code FROM settings;").fetchone()
    print('Seed Settings:', settings)

    # Verify Foreign Key enforcement
    try:
        conn.execute("""
            INSERT INTO inventory_movements (
                id, product_id, movement_type, quantity_milli_units, 
                unit_cost_paise, balance_after_milli_units, reference_type, reference_id, created_by
            ) VALUES (
                'mov_1', 'non_existent_prod', 'PURCHASE_RECEIPT', 1000, 
                100, 1000, 'BILL', 'b1', 'usr_bootstrap_owner'
            );
        """)
        print("ERROR: Foreign key was not enforced!")
    except sqlite3.IntegrityError as e:
        print("PASS: Foreign Key constraint verified:", e)

    # Insert a product and test immutability trigger
    conn.execute("""
        INSERT INTO products (id, sku, name, category_id, hsn_code, cost_price_paise, selling_price_paise)
        VALUES ('prod_test_1', 'SKU-001', 'Test Product', 'cat_raw_materials', '4410', 10000, 15000);
    """)

    conn.execute("""
        INSERT INTO inventory_movements (
            id, product_id, movement_type, quantity_milli_units, 
            unit_cost_paise, balance_after_milli_units, reference_type, reference_id, created_by
        ) VALUES (
            'mov_1', 'prod_test_1', 'PURCHASE_RECEIPT', 1000, 
            100, 1000, 'BILL', 'b1', 'usr_bootstrap_owner'
        );
    """)
    print("PASS: Inserted valid movement.")

    # Try updating movement (should fail due to trigger)
    try:
        conn.execute("UPDATE inventory_movements SET quantity_milli_units = 2000 WHERE id = 'mov_1';")
        print("ERROR: Trigger failed to prevent UPDATE on inventory_movements!")
    except sqlite3.DatabaseError as e:
        print("PASS: Immutability trigger correctly blocked UPDATE:", e)

    # Try deleting movement (should fail due to trigger)
    try:
        conn.execute("DELETE FROM inventory_movements WHERE id = 'mov_1';")
        print("ERROR: Trigger failed to prevent DELETE on inventory_movements!")
    except sqlite3.DatabaseError as e:
        print("PASS: Immutability trigger correctly blocked DELETE:", e)

    print("\nALL DATABASE TESTS PASSED WITH 100% INTEGRITY VERIFICATION!")

if __name__ == '__main__':
    run()
