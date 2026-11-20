import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/layout/PageHeader';
import { FormField } from '../../components/forms/FormField';
import { TextInput } from '../../components/forms/TextInput';
import { CurrencyInput } from '../../components/forms/CurrencyInput';
import { Button } from '../../components/ui/Button';
import { tokens } from '../../styles/tokens';

export const SupplierCreatePage: React.FC = () => {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gstin, setGstin] = useState('');
  const [stateCode, setStateCode] = useState('33'); // Default Tamil Nadu
  const [billingAddress, setBillingAddress] = useState('');
  const [openingBalancePaise, setOpeningBalancePaise] = useState(0);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGstinChange = (val: string) => {
    const clean = val.toUpperCase().trim();
    setGstin(clean);
    if (clean.length >= 2 && /^\d{2}/.test(clean)) {
      setStateCode(clean.slice(0, 2));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Supplier name is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: name.trim(),
          contactPerson: contactPerson.trim() || undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          gstin: gstin.trim() || undefined,
          stateCode: stateCode.trim(),
          billingAddress: billingAddress.trim() || undefined,
          openingBalancePaise,
        }),
      });

      const json = (await res.json()) as any;
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to create supplier');
      }

      navigate('/suppliers');
    } catch (err: any) {
      setError(err.message || 'Supplier registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Register Trade Vendor"
        subtitle="Add new supplier profile with GST registration and opening balance"
        secondaryActionLabel="Cancel"
        onSecondaryAction={() => navigate('/suppliers')}
      />

      <div
        style={{
          maxWidth: '750px',
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
            <FormField id="name" label="Legal Entity / Company Name" required>
              <TextInput
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Apex Agri Supplies Ltd"
              />
            </FormField>

            <FormField id="contact" label="Contact Person Name">
              <TextInput
                id="contact"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="Account Manager / Sales Rep"
              />
            </FormField>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: tokens.spacing[4] }}>
            <FormField id="email" label="Email Address">
              <TextInput
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="accounts@vendor.com"
              />
            </FormField>

            <FormField id="phone" label="Phone Number">
              <TextInput
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
              />
            </FormField>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: tokens.spacing[4] }}>
            <FormField id="gstin" label="GSTIN (15 Digits)" hint="First 2 digits determine State Code">
              <TextInput
                id="gstin"
                value={gstin}
                onChange={(e) => handleGstinChange(e.target.value)}
                placeholder="33AAAAA0000A1Z5"
                maxLength={15}
              />
            </FormField>

            <FormField id="stateCode" label="State Code" required>
              <TextInput
                id="stateCode"
                required
                value={stateCode}
                onChange={(e) => setStateCode(e.target.value)}
                placeholder="33"
                maxLength={2}
              />
            </FormField>
          </div>

          <FormField id="address" label="Billing Address">
            <TextInput
              id="address"
              value={billingAddress}
              onChange={(e) => setBillingAddress(e.target.value)}
              placeholder="Street address, City, Pincode"
            />
          </FormField>

          <FormField
            id="openingBalance"
            label="Opening Accounts Payable Balance (₹)"
            hint="Amount previously owed to this supplier upon migration"
          >
            <CurrencyInput
              id="openingBalance"
              valuePaise={openingBalancePaise}
              onChangePaise={setOpeningBalancePaise}
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
            <Button variant="secondary" type="button" onClick={() => navigate('/suppliers')}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isLoading}>
              Save Supplier Profile
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
