import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/layout/PageHeader';
import { FormField } from '../../components/forms/FormField';
import { SelectInput } from '../../components/forms/SelectInput';
import { TextInput } from '../../components/forms/TextInput';
import { DateInput } from '../../components/forms/DateInput';
import { CurrencyInput } from '../../components/forms/CurrencyInput';
import { Button } from '../../components/ui/Button';
import { tokens } from '../../styles/tokens';
import { Customer, PaymentMode } from '../../types';
import { formatPaiseToInr } from '../../utils/currency';

export const CollectionCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('BANK_TRANSFER');
  const [amountPaise, setAmountPaise] = useState(0);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCustomers() {
      try {
        const res = await fetch('/api/v1/customers', { credentials: 'include' });
        if (res.ok) {
          const json = (await res.json()) as any;
          if (json.success && json.data) {
            setCustomers(json.data);
            if (json.data.length > 0) {
              setCustomerId(json.data[0].id);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load customers:', err);
      }
    }
    loadCustomers();
  }, []);

  const selectedCustomer = customers.find((c) => c.id === customerId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      setError('Please select a customer');
      return;
    }
    if (amountPaise <= 0) {
      setError('Collection amount must be greater than zero');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          customerId,
          paymentDate,
          paymentMode,
          amountPaise,
          referenceNumber: referenceNumber.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      const json = (await res.json()) as any;
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to record collection receipt');
      }

      navigate('/collections');
    } catch (err: any) {
      setError(err.message || 'Collection receipt recording failed');
    } finally {
      setIsLoading(false);
    }
  };

  const customerOptions = customers.map((c) => ({
    value: c.id,
    label: `${c.name} (Due: ${formatPaiseToInr(c.currentReceivablePaise ?? c.currentBalancePaise ?? 0)})`,
  }));

  const modeOptions = [
    { value: 'BANK_TRANSFER', label: 'NEFT / RTGS / IMPS Bank Transfer' },
    { value: 'UPI', label: 'Unified Payments Interface (UPI)' },
    { value: 'CHEQUE', label: 'Commercial Bank Cheque' },
    { value: 'CASH', label: 'Cash Receipt' },
    { value: 'CARD', label: 'Credit / Debit Card' },
  ];

  return (
    <div>
      <PageHeader
        title="Record Payment Inward Collection"
        subtitle="Accept funds from trade debtors with automatic FIFO invoice reconciliation"
        secondaryActionLabel="Cancel"
        onSecondaryAction={() => navigate('/collections')}
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
          <FormField id="cust" label="Payer / Customer" required>
            <SelectInput
              id="cust"
              options={customerOptions}
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            />
          </FormField>

          {selectedCustomer && (
            <div
              style={{
                backgroundColor: tokens.colors.slate[50],
                padding: tokens.spacing[3],
                borderRadius: tokens.borderRadius.md,
                fontSize: tokens.typography.fontSize.sm,
                marginBottom: tokens.spacing[4],
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ color: tokens.colors.slate[600] }}>Current Outstanding AR:</span>
              <span style={{ fontWeight: 600, color: tokens.colors.danger[600] }}>
                {formatPaiseToInr(selectedCustomer.currentReceivablePaise ?? selectedCustomer.currentBalancePaise ?? 0)}
              </span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: tokens.spacing[4] }}>
            <FormField id="amount" label="Amount Collected (₹)" required>
              <CurrencyInput
                id="amount"
                valuePaise={amountPaise}
                onChangePaise={setAmountPaise}
              />
            </FormField>

            <FormField id="date" label="Payment Date" required>
              <DateInput
                id="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </FormField>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: tokens.spacing[4] }}>
            <FormField id="mode" label="Payment Channel" required>
              <SelectInput
                id="mode"
                options={modeOptions}
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
              />
            </FormField>

            <FormField id="ref" label="Bank Ref # / UTR / Cheque #" hint="Audit tracking reference">
              <TextInput
                id="ref"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="UTR20261120XXXX"
              />
            </FormField>
          </div>

          <FormField id="notes" label="Transaction Notes">
            <TextInput
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Cleared via HDFC Bank"
            />
          </FormField>

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
            <Button variant="secondary" type="button" onClick={() => navigate('/collections')}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isLoading}>
              Confirm Inward Collection
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
