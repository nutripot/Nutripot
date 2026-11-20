import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/layout/PageHeader';
import { DataTable, Column } from '../../components/tables/DataTable';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Customer, CustomerLedgerEntry } from '../../types';
import { formatPaiseToInr } from '../../utils/currency';
import { tokens } from '../../styles/tokens';

export const CustomerLedgerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [entries, setEntries] = useState<CustomerLedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadCustomerLedger() {
      if (!id) return;
      try {
        const [cRes, lRes] = await Promise.all([
          fetch(`/api/v1/customers/${id}`, { credentials: 'include' }),
          fetch(`/api/v1/customers/${id}/ledger`, { credentials: 'include' }),
        ]);

        if (cRes.ok) {
          const cJson = (await cRes.json()) as any;
          if (cJson.success) setCustomer(cJson.data);
        }

        if (lRes.ok) {
          const lJson = (await lRes.json()) as any;
          if (lJson.success && lJson.data) setEntries(lJson.data);
        }
      } catch (err) {
        console.error('Failed to load customer statement:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadCustomerLedger();
  }, [id]);

  const columns: Column<CustomerLedgerEntry>[] = [
    { key: 'createdAt', header: 'Timestamp', width: '180px', render: (e) => new Date(e.createdAt).toLocaleString() },
    { key: 'transactionType', header: 'Transaction Nature', width: '150px' },
    { key: 'referenceId', header: 'Reference ID', width: '140px' },
    {
      key: 'debitPaise',
      header: 'Debit (₹ Invoiced / Due)',
      render: (e) => (e.debitPaise > 0 ? formatPaiseToInr(e.debitPaise) : '—'),
    },
    {
      key: 'creditPaise',
      header: 'Credit (₹ Collected / Paid)',
      render: (e) => (e.creditPaise > 0 ? formatPaiseToInr(e.creditPaise) : '—'),
    },
    {
      key: 'runningBalancePaise',
      header: 'Outstanding Balance',
      render: (e: any) => (
        <span style={{ fontWeight: tokens.typography.fontWeight.semibold }}>
          {formatPaiseToInr(e.runningBalancePaise ?? e.balanceAfterPaise ?? 0)}
        </span>
      ),
    },
    { key: 'description', header: 'Description / Notes', render: (e: any) => e.description || e.notes || '—' },
  ];

  return (
    <div>
      <PageHeader
        title={`Customer Statement: ${customer?.name || 'Loading...'}`}
        subtitle={`GSTIN: ${customer?.gstin || 'B2C / Unregistered'} | State Code: ${customer?.stateCode || '—'} | Outstanding AR: ${formatPaiseToInr(customer?.currentReceivablePaise ?? customer?.currentBalancePaise ?? 0)}`}
        secondaryActionLabel="&larr; Back to Customers"
        onSecondaryAction={() => navigate('/customers')}
      />

      {isLoading ? (
        <LoadingSpinner label="Compiling customer debtor ledger..." />
      ) : (
        <DataTable
          columns={columns}
          data={entries}
          emptyMessage="No financial ledger entries recorded for this debtor."
        />
      )}
    </div>
  );
};
