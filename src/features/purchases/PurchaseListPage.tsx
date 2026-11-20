import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/layout/PageHeader';
import { DataTable, Column } from '../../components/tables/DataTable';
import { SearchInput } from '../../components/tables/SearchInput';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { PurchaseBill } from '../../types';
import { formatPaiseToInr } from '../../utils/currency';
import { tokens } from '../../styles/tokens';

export const PurchaseListPage: React.FC = () => {
  const navigate = useNavigate();
  const [bills, setBills] = useState<PurchaseBill[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchPurchases = async () => {
    try {
      const res = await fetch('/api/v1/purchases', { credentials: 'include' });
      if (res.ok) {
        const json = (await res.json()) as any;
        if (json.success && json.data) {
          setBills(json.data);
        }
      }
    } catch (err) {
      console.error('Error fetching purchases:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, []);

  const handleConfirm = async (id: string) => {
    if (!window.confirm('Confirm this purchase bill? This will inward inventory and credit supplier AP.')) {
      return;
    }
    try {
      const res = await fetch(`/api/v1/purchases/${id}/confirm`, {
        method: 'POST',
        credentials: 'include',
      });
      const json = (await res.json()) as any;
      if (json.success) {
        fetchPurchases();
      } else {
        alert(json.error?.message || 'Failed to confirm purchase bill');
      }
    } catch (err: any) {
      alert(err.message || 'Network error');
    }
  };

  const filtered = bills.filter(
    (b) =>
      b.billNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.supplierInvoiceNumber && b.supplierInvoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStatusVariant = (status: PurchaseBill['status']) => {
    switch (status) {
      case 'CONFIRMED':
      case 'PAID':
        return 'success';
      case 'PARTIALLY_PAID':
        return 'warning';
      case 'DRAFT':
        return 'info';
      case 'CANCELLED':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  const columns: Column<PurchaseBill>[] = [
    { key: 'billNumber', header: 'Internal Bill #', width: '150px' },
    { key: 'billDate', header: 'Date', width: '120px' },
    { key: 'supplierInvoiceNumber', header: 'Supplier Inv #', width: '140px', render: (b) => b.supplierInvoiceNumber || '—' },
    {
      key: 'taxableAmountPaise',
      header: 'Taxable Amount',
      render: (b) => formatPaiseToInr(b.taxableAmountPaise ?? b.subtotalPaise ?? 0),
    },
    {
      key: 'totalTaxPaise',
      header: 'GST Input Tax',
      render: (b) => formatPaiseToInr(b.totalTaxPaise ?? b.taxAmountPaise ?? 0),
    },
    {
      key: 'totalAmountPaise',
      header: 'Total Payable',
      render: (b) => (
        <span style={{ fontWeight: tokens.typography.fontWeight.semibold }}>
          {formatPaiseToInr(b.totalAmountPaise)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '120px',
      render: (b) => <StatusBadge status={b.status} variant={getStatusVariant(b.status)} />,
    },
    {
      key: 'id',
      header: 'Action',
      width: '120px',
      render: (b) =>
        b.status === 'DRAFT' ? (
          <Button variant="primary" size="sm" onClick={() => handleConfirm(b.id)}>
            Confirm Inward
          </Button>
        ) : (
          <span style={{ fontSize: tokens.typography.fontSize.xs, color: tokens.colors.slate[400] }}>
            Confirmed
          </span>
        ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Procurement & Purchase Bills"
        subtitle="Inward goods receipts, GST input tax credits (ITC), and accounts payable (AP)"
        actionLabel="Create Purchase Bill"
        onAction={() => navigate('/purchases/create')}
      />

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
          placeholder="Search by Bill # or Supplier Inv #..."
        />
        <div style={{ fontSize: tokens.typography.fontSize.xs, color: tokens.colors.slate[500] }}>
          Showing {filtered.length} of {bills.length} bills
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner label="Loading procurement records..." />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          emptyMessage="No purchase bills recorded yet. Click 'Create Purchase Bill' to register an inward receipt."
        />
      )}
    </div>
  );
};
