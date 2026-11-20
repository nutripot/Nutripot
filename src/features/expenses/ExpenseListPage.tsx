import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/layout/PageHeader';
import { DataTable, Column } from '../../components/tables/DataTable';
import { SearchInput } from '../../components/tables/SearchInput';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Button } from '../../components/ui/Button';
import { Modal, ConfirmDialog } from '../../components/feedback/Modal';
import { FormField } from '../../components/forms/FormField';
import { TextInput } from '../../components/forms/TextInput';
import { DateInput } from '../../components/forms/DateInput';
import { SelectInput } from '../../components/forms/SelectInput';
import { CurrencyInput } from '../../components/forms/CurrencyInput';
import { Expense, PaymentMode } from '../../types';
import { formatPaiseToInr } from '../../utils/currency';
import { tokens } from '../../styles/tokens';

export const ExpenseListPage: React.FC = () => {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Edit State
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editPayee, setEditPayee] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editAmountPaise, setEditAmountPaise] = useState(0);
  const [editMode, setEditMode] = useState<PaymentMode>('UPI');
  const [editDescription, setEditDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete State
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchExpenses = useCallback(async () => {
    setIsLoading(true);
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
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const handleOpenEdit = (e: Expense) => {
    setEditingExpense(e);
    setEditPayee(e.payeeName || (e as any).vendorName || '');
    setEditDate(e.expenseDate);
    setEditAmountPaise(e.amountPaise);
    setEditMode(e.paymentMode || 'UPI');
    setEditDescription(e.description || '');
    setEditError(null);
  };

  const handleSaveEdit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!editingExpense) return;
    if (editAmountPaise <= 0) {
      setEditError('Expense amount must be greater than zero');
      return;
    }

    setIsSaving(true);
    setEditError(null);

    try {
      const res = await fetch(`/api/v1/expenses/${editingExpense.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          payeeName: editPayee.trim() || 'Vendor',
          expenseDate: editDate,
          amountPaise: editAmountPaise,
          paymentMode: editMode,
          description: editDescription.trim(),
        }),
      });

      const json = (await res.json()) as any;
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to update expense');
      }

      setEditingExpense(null);
      await fetchExpenses();
    } catch (err: any) {
      setEditError(err.message || 'Update failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingExpense) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/v1/expenses/${deletingExpense.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!res.ok) {
        const json = (await res.json()) as any;
        throw new Error(json.error?.message || 'Failed to delete expense');
      }

      setDeletingExpense(null);
      await fetchExpenses();
    } catch (err: any) {
      alert(err.message || 'Delete failed');
    } finally {
      setIsDeleting(false);
    }
  };

  const totalExpensePaise = expenses.reduce((sum, e) => sum + e.amountPaise, 0);

  const filtered = expenses.filter(
    (e) =>
      e.voucherNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ((e.payeeName || (e as any).vendorName || '').toLowerCase().includes(searchTerm.toLowerCase())) ||
      (e.description && e.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const modeOptions = [
    { value: 'BANK', label: 'Bank Transfer' },
    { value: 'UPI', label: 'UPI' },
    { value: 'CASH', label: 'Cash' },
    { value: 'CHEQUE', label: 'Cheque' },
  ];

  const columns: Column<Expense>[] = [
    { key: 'voucherNumber', header: 'Voucher #', width: '140px' },
    { key: 'expenseDate', header: 'Date', width: '110px' },
    { key: 'payeeName', header: 'Payee / Vendor', render: (e) => e.payeeName || (e as any).vendorName || 'General Payee' },
    { key: 'paymentMode', header: 'Payment Mode', width: '120px' },
    {
      key: 'amountPaise',
      header: 'Total Outflow',
      width: '130px',
      render: (e) => (
        <span style={{ fontWeight: tokens.typography.fontWeight.semibold, color: tokens.colors.danger[600] }}>
          {formatPaiseToInr(e.amountPaise)}
        </span>
      ),
    },
    { key: 'description', header: 'Description' },
    {
      key: 'id',
      header: 'Actions',
      width: '160px',
      render: (e) => (
        <div style={{ display: 'flex', gap: tokens.spacing[2] }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleOpenEdit(e)}
          >
            Edit
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setDeletingExpense(e)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Expenses"
        subtitle="Track business expenses, overheads, and payments"
        actionLabel="Record Expense"
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
            Total Expenses
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
        <LoadingSpinner label="Loading expenses..." />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          emptyMessage="No expenses recorded yet. Click 'Record Expense' to add one."
        />
      )}

      {/* Edit Expense Modal */}
      {editingExpense && (
        <Modal
          isOpen={true}
          onClose={() => setEditingExpense(null)}
          title={`Edit Expense: ${editingExpense.voucherNumber}`}
          width="500px"
        >
          {editError && (
            <div
              style={{
                backgroundColor: tokens.colors.danger[50],
                border: `1px solid ${tokens.colors.danger[100]}`,
                color: tokens.colors.danger[700],
                padding: tokens.spacing[3],
                borderRadius: tokens.borderRadius.md,
                fontSize: tokens.typography.fontSize.sm,
                marginBottom: tokens.spacing[4],
              }}
            >
              {editError}
            </div>
          )}

          <form onSubmit={handleSaveEdit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[3] }}>
              <FormField id="edit-exp-payee" label="Payee / Vendor" required>
                <TextInput
                  id="edit-exp-payee"
                  required
                  value={editPayee}
                  onChange={(e) => setEditPayee(e.target.value)}
                />
              </FormField>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: tokens.spacing[3] }}>
                <FormField id="edit-exp-date" label="Date" required>
                  <DateInput
                    id="edit-exp-date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                  />
                </FormField>

                <FormField id="edit-exp-mode" label="Payment Mode" required>
                  <SelectInput
                    id="edit-exp-mode"
                    options={modeOptions}
                    value={editMode}
                    onChange={(e) => setEditMode(e.target.value as PaymentMode)}
                  />
                </FormField>
              </div>

              <FormField id="edit-exp-amount" label="Amount (₹)" required>
                <CurrencyInput
                  id="edit-exp-amount"
                  valuePaise={editAmountPaise}
                  onChangePaise={setEditAmountPaise}
                />
              </FormField>

              <FormField id="edit-exp-desc" label="Description">
                <TextInput
                  id="edit-exp-desc"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
              </FormField>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: tokens.spacing[3],
                marginTop: tokens.spacing[5],
                paddingTop: tokens.spacing[4],
                borderTop: `1px solid ${tokens.colors.slate[200]}`,
              }}
            >
              <Button
                variant="secondary"
                type="button"
                onClick={() => setEditingExpense(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                isLoading={isSaving}
              >
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Dialog */}
      {deletingExpense && (
        <ConfirmDialog
          isOpen={true}
          title="Delete Expense"
          message={`Are you sure you want to delete expense voucher ${deletingExpense.voucherNumber} (${formatPaiseToInr(deletingExpense.amountPaise)})?`}
          confirmLabel={isDeleting ? 'Deleting...' : 'Delete Expense'}
          variant="danger"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeletingExpense(null)}
        />
      )}
    </div>
  );
};
