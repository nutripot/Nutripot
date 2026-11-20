import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/layout/PageHeader';
import { DataTable, Column } from '../../components/tables/DataTable';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Supplier, SupplierLedgerEntry } from '../../types';
import { formatPaiseToInr } from '../../utils/currency';
import { tokens } from '../../styles/tokens';

export const SupplierLedgerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [entries, setEntries] = useState<SupplierLedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadLedger() {
      if (!id) return;
      try {
        const [supRes, ledgerRes] = await Promise.all([
          fetch(`/api/v1/suppliers/${id}`, { credentials: 'include' }),
          fetch(`/api/v1/suppliers/${id}/ledger`, { credentials: 'include' }),
        ]);

        if (supRes.ok) {
          const sJson = (await supRes.json()) as any;
          if (sJson.success) setSupplier(sJson.data);
        }

        if (ledgerRes.ok) {
          const lJson = (await ledgerRes.json()) as any;
          if (lJson.success && lJson.data) setEntries(lJson.data);
        }
      } catch (err) {
        console.error('Failed to load ledger:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadLedger();
  }, [id]);

  const columns: Column<SupplierLedgerEntry>[] = [
    { key: 'createdAt', header: 'Timestamp', width: '180px', render: (e) => new Date(e.createdAt).toLocaleString() },
    { key: 'transactionType', header: 'Transaction Nature', width: '150px' },
    { key: 'referenceId', header: 'Reference ID', width: '140px' },
    {
      key: 'debitPaise',
      header: 'Debit (₹ Paid / Debited)',
      render: (e) => (e.debitPaise > 0 ? formatPaiseToInr(e.debitPaise) : '—'),
    },
    {
      key: 'creditPaise',
      header: 'Credit (₹ Inward Bill)',
      render: (e) => (e.creditPaise > 0 ? formatPaiseToInr(e.creditPaise) : '—'),
    },
    {
      key: 'runningBalancePaise',
      header: 'Cumulative Balance',
      render: (e: any) => (
        <span style={{ fontWeight: tokens.typography.fontWeight.semibold }}>
          {formatPaiseToInr(e.runningBalancePaise ?? e.balanceAfterPaise ?? 0)}
        </span>
      ),
    },
    { key: 'description', header: 'Narrative Description', render: (e: any) => e.description || e.notes || '—' },
  ];

  return (
    <div>
      <PageHeader
        title={`Supplier Statement: ${supplier?.name || 'Loading...'}`}
        subtitle={`GSTIN: ${supplier?.gstin || 'Unregistered'} | State Code: ${supplier?.stateCode || '—'} | Outstanding AP: ${formatPaiseToInr(supplier?.currentPayablePaise ?? supplier?.currentBalancePaise ?? 0)}`}
        secondaryActionLabel="&larr; Back to Suppliers"
        onSecondaryAction={() => navigate('/suppliers')}
      />

      {isLoading ? (
        <LoadingSpinner label="Compiling immutable ledger..." />
      ) : (
        <DataTable
          columns={columns}
          data={entries}
          emptyMessage="No ledger transactions recorded for this vendor."
        />
      )}
    </div>
  );
};
