import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/layout/PageHeader';
import { FormField } from '../../components/forms/FormField';
import { SelectInput } from '../../components/forms/SelectInput';
import { TextInput } from '../../components/forms/TextInput';
import { DateInput } from '../../components/forms/DateInput';
import { CurrencyInput } from '../../components/forms/CurrencyInput';
import { Button } from '../../components/ui/Button';
import { tokens } from '../../styles/tokens';
import { PaymentMode } from '../../types';

export const ExpenseCreatePage: React.FC = () => {
  const navigate = useNavigate();

  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenseHeadId, setExpenseHeadId] = useState('exp_rent');
  const [amountPaise, setAmountPaise] = useState(0);
  const [taxAmountPaise, setTaxAmountPaise] = useState(0);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('BANK_TRANSFER');
  const [vendorName, setVendorName] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [description, setDescription] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amountPaise <= 0) {
      setError('Expense amount must be greater than zero');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          expenseDate,
          expenseHeadId,
          amountPaise,
          taxAmountPaise,
          paymentMode,
          vendorName: vendorName.trim() || undefined,
          referenceNumber: referenceNumber.trim() || undefined,
          description: description.trim() || undefined,
        }),
      });

      const json = (await res.json()) as any;
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to record expense voucher');
      }

      navigate('/expenses');
    } catch (err: any) {
      setError(err.message || 'Expense voucher creation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const headOptions = [
    { value: 'exp_rent', label: 'Office & Warehouse Rent' },
    { value: 'exp_utilities', label: 'Electricity & Utilities' },
    { value: 'exp_logistics', label: 'Freight, Logistics & Shipping' },
    { value: 'exp_packaging', label: 'Packaging Materials' },
    { value: 'exp_salaries', label: 'Staff Payroll & Salaries' },
    { value: 'exp_marketing', label: 'Advertising, PR & Marketing' },
    { value: 'exp_legal', label: 'Legal, Audit & Professional Fees' },
    { value: 'exp_it', label: 'IT, Cloud Infrastructure & Subscriptions' },
    { value: 'exp_misc', label: 'Miscellaneous Office Expenses' },
  ];

  const modeOptions = [
    { value: 'BANK_TRANSFER', label: 'Bank Transfer (NEFT/RTGS/IMPS)' },
    { value: 'UPI', label: 'UPI' },
    { value: 'CORPORATE_CARD', label: 'Corporate Card' },
    { value: 'CHEQUE', label: 'Cheque' },
    { value: 'CASH', label: 'Petty Cash' },
  ];

  return (
    <div>
      <PageHeader
        title="Record Expense Voucher"
        subtitle="Log operational overheads and business expenses"
        secondaryActionLabel="Cancel"
        onSecondaryAction={() => navigate('/expenses')}
      />

      <div
        style={{
          maxWidth: '680px',
          backgroundColor: '#ffffff',
          borderRadius: tokens.borderRadius.lg,
          padding: tokens.spacing[6],
          border: `1px solid ${tokens.colors.slate[200]}`,
          boxShadow: tokens.shadows.sm,
        }}
      >
        {error && (
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
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: tokens.spacing[4] }}>
            <FormField id="head" label="Accounting Expense Head" required>
              <SelectInput
                id="head"
                options={headOptions}
                value={expenseHeadId}
                onChange={(e) => setExpenseHeadId(e.target.value)}
              />
            </FormField>

            <FormField id="date" label="Voucher Date" required>
              <DateInput
                id="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
              />
            </FormField>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: tokens.spacing[4] }}>
            <FormField id="amount" label="Total Expense Outflow (₹)" required>
              <CurrencyInput
                id="amount"
                valuePaise={amountPaise}
                onChangePaise={setAmountPaise}
              />
            </FormField>

            <FormField id="tax" label="Embedded GST Paid (₹)" hint="For input tax credit claim">
              <CurrencyInput
                id="tax"
                valuePaise={taxAmountPaise}
                onChangePaise={setTaxAmountPaise}
              />
            </FormField>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: tokens.spacing[4] }}>
            <FormField id="mode" label="Disbursement Mode" required>
              <SelectInput
                id="mode"
                options={modeOptions}
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
              />
            </FormField>

            <FormField id="payee" label="Vendor / Payee Name">
              <TextInput
                id="payee"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                placeholder="Landlord / Utility Provider"
              />
            </FormField>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: tokens.spacing[4] }}>
            <FormField id="ref" label="Invoice / Receipt #">
              <TextInput
                id="ref"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="REC-XXXXX"
              />
            </FormField>

            <FormField id="desc" label="Business Purpose / Narrative">
              <TextInput
                id="desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. November warehouse lease rental"
              />
            </FormField>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: tokens.spacing[3],
              marginTop: tokens.spacing[6],
              paddingTop: tokens.spacing[4],
              borderTop: `1px solid ${tokens.colors.slate[200]}`,
            }}
          >
            <Button variant="secondary" type="button" onClick={() => navigate('/expenses')}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isLoading}>
              Record Expense Voucher
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
