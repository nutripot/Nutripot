import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/layout/PageHeader';
import { DataTable, Column } from '../../components/tables/DataTable';
import { SearchInput } from '../../components/tables/SearchInput';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { CollectionReceipt } from '../../types';
import { formatPaiseToInr } from '../../utils/currency';
import { tokens } from '../../styles/tokens';

export const CollectionListPage: React.FC = () => {
  const navigate = useNavigate();
  const [collections, setCollections] = useState<CollectionReceipt[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchCollections() {
      try {
        const res = await fetch('/api/v1/collections', { credentials: 'include' });
        if (res.ok) {
          const json = (await res.json()) as any;
          if (json.success && json.data) {
            setCollections(json.data);
          }
        }
      } catch (err) {
        console.error('Error fetching collections:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchCollections();
  }, []);

  const filtered = collections.filter(
    (c) =>
      c.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.referenceNumber && c.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const columns: Column<CollectionReceipt>[] = [
    { key: 'receiptNumber', header: 'Receipt #', width: '150px' },
    { key: 'paymentDate', header: 'Collection Date', width: '130px' },
    { key: 'paymentMode', header: 'Mode', width: '130px' },
    { key: 'referenceNumber', header: 'Ref / UTR #', width: '150px', render: (c) => c.referenceNumber || '—' },
    {
      key: 'amountPaise',
      header: 'Amount Collected',
      render: (c) => (
        <span style={{ fontWeight: tokens.typography.fontWeight.semibold, color: tokens.colors.success[600] }}>
          {formatPaiseToInr(c.amountPaise)}
        </span>
      ),
    },
    {
      key: 'unallocatedPaise',
      header: 'Unallocated Advance',
      render: (c: any) => ((c.unallocatedPaise ?? c.unallocatedAmountPaise ?? 0) > 0 ? formatPaiseToInr(c.unallocatedPaise ?? c.unallocatedAmountPaise) : '₹0.00'),
    },
    {
      key: 'id',
      header: 'Status',
      width: '120px',
      render: () => <StatusBadge status="Reconciled" variant="success" />,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Payment Collections & Inflow Receipts"
        subtitle="Customer cash and bank collections reconciled against accounts receivable"
        actionLabel="Record Collection"
        onAction={() => navigate('/collections/create')}
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
          placeholder="Search by receipt # or UTR reference..."
        />
        <div style={{ fontSize: tokens.typography.fontSize.xs, color: tokens.colors.slate[500] }}>
          {filtered.length} receipts registered
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner label="Loading payment receipts..." />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          emptyMessage="No customer payments received yet. Click 'Record Collection' to register a payment."
        />
      )}
    </div>
  );
};
