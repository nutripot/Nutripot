import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/layout/PageHeader';
import { DataTable, Column } from '../../components/tables/DataTable';
import { SearchInput } from '../../components/tables/SearchInput';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Customer } from '../../types';
import { formatPaiseToInr } from '../../utils/currency';
import { tokens } from '../../styles/tokens';

export const CustomerListPage: React.FC = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchCustomers() {
      try {
        const res = await fetch('/api/v1/customers', { credentials: 'include' });
        if (res.ok) {
          const json = (await res.json()) as any;
          if (json.success && json.data) {
            setCustomers(json.data);
          }
        }
      } catch (err) {
        console.error('Error fetching customers:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchCustomers();
  }, []);

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.gstin && c.gstin.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.phone && c.phone.includes(searchTerm))
  );

  const columns: Column<Customer>[] = [
    { key: 'name', header: 'Customer / Client Name' },
    { key: 'contactPerson', header: 'Contact Person', render: (c) => c.contactPerson || '—' },
    { key: 'phone', header: 'Phone', width: '130px', render: (c) => c.phone || '—' },
    { key: 'gstin', header: 'GSTIN', width: '150px', render: (c) => c.gstin || 'B2C (Unregistered)' },
    { key: 'stateCode', header: 'State Code', width: '90px' },
    {
      key: 'creditLimitPaise',
      header: 'Credit Limit',
      render: (c) => (c.creditLimitPaise ? formatPaiseToInr(c.creditLimitPaise) : 'No Limit'),
    },
    {
      key: 'currentReceivablePaise',
      header: 'Receivable (AR)',
      render: (c: any) => {
        const bal = c.currentReceivablePaise ?? c.currentBalancePaise ?? 0;
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
      render: (c) => (
        <StatusBadge
          status={c.isActive ? 'Active' : 'Inactive'}
          variant={c.isActive ? 'success' : 'neutral'}
        />
      ),
    },
    {
      key: 'id',
      header: 'Statement',
      width: '130px',
      render: (c) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate(`/customers/${c.id}/ledger`)}
        >
          View Statement
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Customer Directory & Accounts Receivable"
        subtitle="Commercial debtors, credit terms, and transaction balance history"
        actionLabel="Register Customer"
        onAction={() => navigate('/customers/create')}
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
          placeholder="Filter by customer name, GSTIN, or mobile..."
        />
        <div style={{ fontSize: tokens.typography.fontSize.xs, color: tokens.colors.slate[500] }}>
          {filtered.length} customers registered
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner label="Loading customer ledger..." />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          emptyMessage="No customers registered yet. Click 'Register Customer' to add a client."
        />
      )}
    </div>
  );
};
