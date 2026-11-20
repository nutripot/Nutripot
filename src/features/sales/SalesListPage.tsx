import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/layout/PageHeader';
import { DataTable, Column } from '../../components/tables/DataTable';
import { SearchInput } from '../../components/tables/SearchInput';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { SalesInvoice } from '../../types';
import { formatPaiseToInr } from '../../utils/currency';
import { tokens } from '../../styles/tokens';

export const SalesListPage: React.FC = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchInvoices = async () => {
    try {
      const res = await fetch('/api/v1/sales', { credentials: 'include' });
      if (res.ok) {
        const json = (await res.json()) as any;
        if (json.success && json.data) {
          setInvoices(json.data);
        }
      }
    } catch (err) {
      console.error('Error fetching sales invoices:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleConfirm = async (id: string) => {
    if (!window.confirm('Issue and confirm this Tax Invoice? This will decrement stock balances and debit Customer AR.')) {
      return;
    }
    try {
      const res = await fetch(`/api/v1/sales/${id}/confirm`, {
        method: 'POST',
        credentials: 'include',
      });
      const json = (await res.json()) as any;
      if (json.success) {
        fetchInvoices();
      } else {
        alert(json.error?.message || 'Failed to confirm tax invoice');
      }
    } catch (err: any) {
      alert(err.message || 'Network error');
    }
  };

  const handleDeleteDraft = async (id: string, num: string) => {
    if (!window.confirm(`Delete draft invoice ${num}? This cannot be undone.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/v1/sales/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const json = (await res.json()) as any;
      if (json.success) {
        fetchInvoices();
      } else {
        alert(json.error?.message || 'Failed to delete invoice');
      }
    } catch (err: any) {
      alert(err.message || 'Network error');
    }
  };

  const filtered = invoices.filter(
    (inv) =>
      inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusVariant = (status: SalesInvoice['status']) => {
    switch (status) {
      case 'ISSUED':
      case 'PAID':
        return 'success';
      case 'PARTIALLY_PAID':
        return 'warning';
      case 'DRAFT':
        return 'info';
      case 'CANCELLED':
      case 'CREDITED':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  const columns: Column<SalesInvoice>[] = [
    { key: 'invoiceNumber', header: 'Invoice #', width: '150px' },
    { key: 'invoiceDate', header: 'Date', width: '120px' },
    { key: 'dueDate', header: 'Due Date', width: '120px' },
    {
      key: 'subtotalPaise',
      header: 'Taxable Value',
      render: (i: any) => formatPaiseToInr(i.taxableAmountPaise ?? i.subtotalPaise ?? 0),
    },
    {
      key: 'totalTaxPaise',
      header: 'GST Output Tax',
      render: (i) => formatPaiseToInr(i.totalTaxPaise),
    },
    {
      key: 'totalAmountPaise',
      header: 'Invoice Total',
      render: (i) => (
        <span style={{ fontWeight: tokens.typography.fontWeight.semibold }}>
          {formatPaiseToInr(i.totalAmountPaise)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '130px',
      render: (i) => <StatusBadge status={i.status} variant={getStatusVariant(i.status)} />,
    },
    {
      key: 'id',
      header: 'Actions',
      width: '180px',
      render: (i) =>
        i.status === 'DRAFT' ? (
          <div style={{ display: 'flex', gap: tokens.spacing[2] }}>
            <Button variant="primary" size="sm" onClick={() => handleConfirm(i.id)}>
              Issue
            </Button>
            <Button variant="danger" size="sm" onClick={() => handleDeleteDraft(i.id, i.invoiceNumber)}>
              Delete
            </Button>
          </div>
        ) : (
          <span style={{ fontSize: tokens.typography.fontSize.xs, color: tokens.colors.success[700], fontWeight: 500 }}>
            Issued
          </span>
        ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Tax Invoices & Commercial Sales"
        subtitle="GST-compliant outward invoices, accounts receivable (AR), and revenue tracking"
        actionLabel="Create Invoice"
        onAction={() => navigate('/sales/create')}
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
          placeholder="Search by Invoice #..."
        />
        <div style={{ fontSize: tokens.typography.fontSize.xs, color: tokens.colors.slate[500] }}>
          {filtered.length} invoices registered
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner label="Loading sales journal..." />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          emptyMessage="No sales invoices generated yet. Click 'Create Invoice' to raise a commercial sale."
        />
      )}
    </div>
  );
};
