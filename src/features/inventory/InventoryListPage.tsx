import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/layout/PageHeader';
import { DataTable, Column } from '../../components/tables/DataTable';
import { SearchInput } from '../../components/tables/SearchInput';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { formatPaiseToInr } from '../../utils/currency';
import { formatMilliToUnit } from '../../utils/quantity';
import { tokens } from '../../styles/tokens';

interface InventoryItemView {
  productId: string;
  sku: string;
  name: string;
  uom: string;
  currentStock: number;
  reorderLevel: number;
  weightedAverageCostPaise: number;
  totalValuationPaise: number;
}

export const InventoryListPage: React.FC = () => {
  const navigate = useNavigate();
  const [inventory, setInventory] = useState<InventoryItemView[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchInventory() {
      try {
        const res = await fetch('/api/v1/inventory', { credentials: 'include' });
        if (res.ok) {
          const json = (await res.json()) as any;
          if (json.success && json.data) {
            setInventory(json.data);
          }
        }
      } catch (err) {
        console.error('Error fetching inventory:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchInventory();
  }, []);

  const totalValuation = inventory.reduce(
    (sum, item) => sum + (item.totalValuationPaise || 0),
    0
  );

  const filtered = inventory.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns: Column<InventoryItemView>[] = [
    { key: 'sku', header: 'SKU', width: '130px' },
    { key: 'name', header: 'Product Name' },
    {
      key: 'currentStock',
      header: 'Available Stock',
      render: (item) => (
        <span
          style={{
            fontWeight: tokens.typography.fontWeight.semibold,
            color:
              item.currentStock <= item.reorderLevel
                ? tokens.colors.danger[600]
                : tokens.colors.slate[800],
          }}
        >
          {formatMilliToUnit(item.currentStock)} {item.uom}
        </span>
      ),
    },
    {
      key: 'reorderLevel',
      header: 'Reorder Point',
      render: (item) => `${formatMilliToUnit(item.reorderLevel)} ${item.uom}`,
    },
    {
      key: 'weightedAverageCostPaise',
      header: 'WAC Unit Cost',
      render: (item) => formatPaiseToInr(item.weightedAverageCostPaise),
    },
    {
      key: 'totalValuationPaise',
      header: 'Stock Asset Value',
      render: (item) => (
        <span style={{ fontWeight: tokens.typography.fontWeight.semibold }}>
          {formatPaiseToInr(item.totalValuationPaise)}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Inventory Valuation & Stock Balances"
        subtitle="Real-time stock ledger calculated using Weighted Average Cost (WAC)"
        actionLabel="Adjust Stock"
        onAction={() => navigate('/inventory/adjust')}
      />

      {/* Overview Card */}
      <div
        style={{
          display: 'flex',
          gap: tokens.spacing[4],
          marginBottom: tokens.spacing[6],
        }}
      >
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: tokens.borderRadius.lg,
            padding: tokens.spacing[4],
            border: `1px solid ${tokens.colors.slate[200]}`,
            flex: 1,
          }}
        >
          <div style={{ fontSize: tokens.typography.fontSize.xs, color: tokens.colors.slate[500] }}>
            Total Warehouse Asset Valuation
          </div>
          <div
            style={{
              fontSize: tokens.typography.fontSize['2xl'],
              fontWeight: tokens.typography.fontWeight.bold,
              color: tokens.colors.primary[600],
              marginTop: tokens.spacing[1],
            }}
          >
            {formatPaiseToInr(totalValuation)}
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: tokens.borderRadius.lg,
            padding: tokens.spacing[4],
            border: `1px solid ${tokens.colors.slate[200]}`,
            flex: 1,
          }}
        >
          <div style={{ fontSize: tokens.typography.fontSize.xs, color: tokens.colors.slate[500] }}>
            Tracked Stock Keeping Units
          </div>
          <div
            style={{
              fontSize: tokens.typography.fontSize['2xl'],
              fontWeight: tokens.typography.fontWeight.bold,
              color: tokens.colors.slate[800],
              marginTop: tokens.spacing[1],
            }}
          >
            {inventory.length} SKUs
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: tokens.spacing[4],
        }}
      >
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search by SKU or item name..."
        />
      </div>

      {isLoading ? (
        <LoadingSpinner label="Auditing inventory balances..." />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          emptyMessage="No inventory records available. Create purchase receipts or initial adjustments to load stock."
        />
      )}
    </div>
  );
};
