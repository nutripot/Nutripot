import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/layout/PageHeader';
import { DataTable, Column } from '../../components/tables/DataTable';
import { SearchInput } from '../../components/tables/SearchInput';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Supplier } from '../../types';
import { formatPaiseToInr } from '../../utils/currency';
import { tokens } from '../../styles/tokens';

export const SupplierListPage: React.FC = () => {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchSuppliers() {
      try {
        const res = await fetch('/api/v1/suppliers', { credentials: 'include' });
        if (res.ok) {
          const json = (await res.json()) as any;
          if (json.success && json.data) {
            setSuppliers(json.data);
          }
        }
      } catch (err) {
        console.error('Error fetching suppliers:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchSuppliers();
  }, []);

  const filtered = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.gstin && s.gstin.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.phone && s.phone.includes(searchTerm))
  );

  const columns: Column<Supplier>[] = [
    { key: 'name', header: 'Supplier Name' },
    { key: 'contactPerson', header: 'Contact Person', render: (s) => s.contactPerson || '—' },
    { key: 'phone', header: 'Phone', width: '130px', render: (s) => s.phone || '—' },
    { key: 'gstin', header: 'GSTIN', width: '150px', render: (s) => s.gstin || 'Unregistered' },
    { key: 'stateCode', header: 'State Code', width: '90px' },
    {
      key: 'currentPayablePaise',
      header: 'Outstanding (AP)',
      render: (s: any) => {
        const bal = s.currentPayablePaise ?? s.currentBalancePaise ?? 0;
        return (
          <span
            style={{
              fontWeight: tokens.typography.fontWeight.semibold,
              color: bal > 0 ? tokens.colors.danger[600] : tokens.colors.slate[800],
            }}
          >
            {formatPaiseToInr(bal)}
          </span>
        );
      },
    },
    {
      key: 'isActive',
      header: 'Status',
      width: '100px',
      render: (s) => (
        <StatusBadge
          status={s.isActive ? 'Active' : 'Inactive'}
          variant={s.isActive ? 'success' : 'neutral'}
        />
      ),
    },
    {
      key: 'id',
      header: 'Ledger',
      width: '120px',
      render: (s) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate(`/suppliers/${s.id}/ledger`)}
        >
          View Statement
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Supplier Directory & Vendor Payables"
        subtitle="Trade creditors, compliance profiles, and accounts payable statements"
        actionLabel="Add Supplier"
        onAction={() => navigate('/suppliers/create')}
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
          placeholder="Search by vendor name, GSTIN, or phone..."
        />
        <div style={{ fontSize: tokens.typography.fontSize.xs, color: tokens.colors.slate[500] }}>
          {filtered.length} suppliers registered
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner label="Loading supplier database..." />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          emptyMessage="No suppliers registered yet. Click 'Add Supplier' to create vendor profile."
        />
      )}
    </div>
  );
};
