import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/layout/PageHeader';
import { SummaryCard } from '../../components/ui/SummaryCard';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { DataTable, Column } from '../../components/tables/DataTable';
import { tokens } from '../../styles/tokens';
import { formatPaiseToInr } from '../../utils/currency';
import { formatMilliToUnit } from '../../utils/quantity';

interface DashboardMetrics {
  totalRevenuePaise: number;
  totalCollectionsPaise: number;
  outstandingReceivablesPaise: number;
  outstandingPayablesPaise: number;
  lowStockItemsCount: number;
}

interface LowStockItem {
  id: string;
  sku: string;
  name: string;
  currentStock: number;
  reorderLevel: number;
  uom: string;
}

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [reportsRes, inventoryRes] = await Promise.all([
          fetch('/api/v1/reports/profit-loss', { credentials: 'include' }),
          fetch('/api/v1/inventory/low-stock', { credentials: 'include' }),
        ]);

        let rev = 0;
        if (reportsRes.ok) {
          const rep = (await reportsRes.json()) as any;
          if (rep.success && rep.data) {
            rev = rep.data.totalSalesPaise || 0;
          }
        }

        let lowStockList: LowStockItem[] = [];
        if (inventoryRes.ok) {
          const inv = (await inventoryRes.json()) as any;
          if (inv.success && inv.data) {
            lowStockList = inv.data;
          }
        }

        // Aggregate dummy/real metrics
        setMetrics({
          totalRevenuePaise: rev,
          totalCollectionsPaise: 0,
          outstandingReceivablesPaise: 0,
          outstandingPayablesPaise: 0,
          lowStockItemsCount: lowStockList.length,
        });
        setLowStock(lowStockList);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  if (isLoading) {
    return <LoadingSpinner size="lg" label="Compiling executive dashboard..." />;
  }

  const columns: Column<LowStockItem>[] = [
    { key: 'sku', header: 'SKU', width: '120px' },
    { key: 'name', header: 'Product Name' },
    {
      key: 'currentStock',
      header: 'Current Stock',
      render: (item) => `${formatMilliToUnit(item.currentStock)} ${item.uom}`,
    },
    {
      key: 'reorderLevel',
      header: 'Reorder Level',
      render: (item) => `${formatMilliToUnit(item.reorderLevel)} ${item.uom}`,
    },
    {
      key: 'id',
      header: 'Action',
      render: (item) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate(`/purchases/create?productId=${item.id}`)}
        >
          Create Purchase
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Executive Dashboard"
        subtitle="Real-time financial position, working capital, and operational status"
        actionLabel="Create Invoice"
        onAction={() => navigate('/sales/create')}
        secondaryActionLabel="Record Purchase"
        onSecondaryAction={() => navigate('/purchases/create')}
      />

      {/* KPI Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: tokens.spacing[4],
          marginBottom: tokens.spacing[8],
        }}
      >
        <SummaryCard
          title="Total Gross Revenue"
          value={formatPaiseToInr(metrics?.totalRevenuePaise || 0)}
          subtitle="FY 2026-27 Invoiced"
          variant="primary"
        />
        <SummaryCard
          title="Collections Received"
          value={formatPaiseToInr(metrics?.totalCollectionsPaise || 0)}
          subtitle="Realized Inflow"
          variant="success"
        />
        <SummaryCard
          title="Receivables (AR)"
          value={formatPaiseToInr(metrics?.outstandingReceivablesPaise || 0)}
          subtitle="Due from Customers"
          variant="default"
        />
        <SummaryCard
          title="Payables (AP)"
          value={formatPaiseToInr(metrics?.outstandingPayablesPaise || 0)}
          subtitle="Due to Suppliers"
          variant="danger"
        />
        <SummaryCard
          title="Low Stock Alerts"
          value={String(metrics?.lowStockItemsCount || 0)}
          subtitle="Items below reorder point"
          variant={metrics?.lowStockItemsCount ? 'warning' : 'default'}
        />
      </div>

      {/* Quick Operations Bar */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: tokens.borderRadius.lg,
          padding: tokens.spacing[4],
          marginBottom: tokens.spacing[8],
          border: `1px solid ${tokens.colors.slate[200]}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: tokens.spacing[3],
        }}
      >
        <div>
          <div
            style={{
              fontSize: tokens.typography.fontSize.sm,
              fontWeight: tokens.typography.fontWeight.semibold,
              color: tokens.colors.slate[800],
            }}
          >
            Quick Operations
          </div>
          <div style={{ fontSize: tokens.typography.fontSize.xs, color: tokens.colors.slate[500] }}>
            Execute transactional workflows with strict ledger validation
          </div>
        </div>

        <div style={{ display: 'flex', gap: tokens.spacing[2], flexWrap: 'wrap' }}>
          <Button variant="secondary" size="sm" onClick={() => navigate('/products/create')}>
            + New Product
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate('/collections/create')}>
            + Record Collection
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate('/expenses/create')}>
            + Record Expense
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate('/inventory/adjust')}>
            Stock Adjustment
          </Button>
        </div>
      </div>

      {/* Low Stock Alerts Section */}
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: tokens.spacing[3],
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: tokens.typography.fontSize.lg,
              fontWeight: tokens.typography.fontWeight.bold,
              color: tokens.colors.slate[900],
            }}
          >
            Critical Low Stock Alerts
          </h2>
          <Button variant="ghost" size="sm" onClick={() => navigate('/inventory')}>
            View Full Inventory &rarr;
          </Button>
        </div>

        <DataTable
          columns={columns}
          data={lowStock}
          emptyMessage="All SKU stock balances are currently within designated reorder thresholds."
        />
      </div>
    </div>
  );
};
