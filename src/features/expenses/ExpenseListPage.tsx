import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/layout/PageHeader';
import { DataTable, Column } from '../../components/tables/DataTable';
import { SearchInput } from '../../components/tables/SearchInput';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Expense } from '../../types';
import { formatPaiseToInr } from '../../utils/currency';
import { tokens } from '../../styles/tokens';

export const ExpenseListPage: React.FC = () => {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchExpenses() {
      try {
        const res = await fetch('/api/v1/expenses', { credentials: 'include' });
        if (res.ok) {
          const json = (await res.json()) as any;
          if (json.success && json.data) {
            setExpenses(json.data);
          }
        }
      } catch (err) {
        console.error('Error fetching expenses:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchExpenses();
  }, []);

  const totalExpensePaise = expenses.reduce((sum, e) => sum + e.amountPaise, 0);

  const filtered = expenses.filter(
    (e) =>
      e.voucherNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.vendorName && e.vendorName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (e.description && e.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const columns: Column<Expense>[] = [
    { key: 'voucherNumber', header: 'Voucher #', width: '150px' },
    { key: 'expenseDate', header: 'Date', width: '120px' },
    { key: 'vendorName', header: 'Payee / Vendor', render: (e) => e.vendorName || 'General Payee' },
    { key: 'paymentMode', header: 'Payment Mode', width: '130px' },
    {
      key: 'taxAmountPaise',
      header: 'GST Paid',
      width: '120px',
      render: (e) => (e.taxAmountPaise && e.taxAmountPaise > 0 ? formatPaiseToInr(e.taxAmountPaise) : '₹0.00'),
    },
    {
      key: 'amountPaise',
      header: 'Total Outflow',
      render: (e) => (
        <span style={{ fontWeight: tokens.typography.fontWeight.semibold, color: tokens.colors.danger[600] }}>
          {formatPaiseToInr(e.amountPaise)}
        </span>
      ),
    },
    { key: 'description', header: 'Expense Purpose' },
  ];

  return (
    <div>
      <PageHeader
        title="Operational Expenditures & Overheads"
        subtitle="Track recurring business overheads, operational expenses, and GST input taxes"
        actionLabel="Record Expense Voucher"
        onAction={() => navigate('/expenses/create')}
      />

      {/* Summary Card */}
      <div style={{ marginBottom: tokens.spacing[6], maxWidth: '300px' }}>
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: tokens.borderRadius.lg,
            padding: tokens.spacing[4],
            border: `1px solid ${tokens.colors.slate[200]}`,
          }}
        >
          <div style={{ fontSize: tokens.typography.fontSize.xs, color: tokens.colors.slate[500] }}>
            Total Overheads Logged
          </div>
          <div
            style={{
              fontSize: tokens.typography.fontSize['2xl'],
              fontWeight: tokens.typography.fontWeight.bold,
              color: tokens.colors.danger[600],
              marginTop: tokens.spacing[1],
            }}
          >
            {formatPaiseToInr(totalExpensePaise)}
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
          placeholder="Search by voucher #, payee, or description..."
        />
        <div style={{ fontSize: tokens.typography.fontSize.xs, color: tokens.colors.slate[500] }}>
          {filtered.length} vouchers logged
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner label="Loading operational expenditure log..." />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          emptyMessage="No operational expenses logged yet. Click 'Record Expense Voucher' to add an overhead."
        />
      )}
    </div>
  );
};
