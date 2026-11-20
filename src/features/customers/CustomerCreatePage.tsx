import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/layout/PageHeader';
import { FormField } from '../../components/forms/FormField';
import { TextInput } from '../../components/forms/TextInput';
import { CurrencyInput } from '../../components/forms/CurrencyInput';
import { Button } from '../../components/ui/Button';
import { tokens } from '../../styles/tokens';

export const CustomerCreatePage: React.FC = () => {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gstin, setGstin] = useState('');
  const [stateCode, setStateCode] = useState('33');
  const [billingAddress, setBillingAddress] = useState('');
  const [shippingAddress] = useState('');
  const [creditLimitPaise, setCreditLimitPaise] = useState(0);
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
      setError('Customer name is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/customers', {
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
          shippingAddress: shippingAddress.trim() || undefined,
          creditLimitPaise: creditLimitPaise || undefined,
          openingBalancePaise,
        }),
      });

      const json = (await res.json()) as any;
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to create customer');
      }

      navigate('/customers');
    } catch (err: any) {
      setError(err.message || 'Customer creation failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Register Customer Client"
        subtitle="Create commercial debtor profile with GST validation and credit limits"
        secondaryActionLabel="Cancel"
        onSecondaryAction={() => navigate('/customers')}
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
            <FormField id="name" label="Customer Legal / Trade Name" required>
              <TextInput
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enterprise Customer Ltd"
              />
            </FormField>

            <FormField id="contact" label="Contact Person Name">
              <TextInput
                id="contact"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="Procurement Head / Buyer"
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
                placeholder="buyer@client.com"
              />
            </FormField>

            <FormField id="phone" label="Mobile Phone">
              <TextInput
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 91234 56789"
              />
            </FormField>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: tokens.spacing[4] }}>
            <FormField id="gstin" label="Customer GSTIN (Leave blank for B2C consumer)" hint="15-character statutory GST ID">
              <TextInput
                id="gstin"
                value={gstin}
                onChange={(e) => handleGstinChange(e.target.value)}
                placeholder="33BBBBB0000B1Z8"
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

          <FormField id="billingAddress" label="Registered Billing Address">
            <TextInput
              id="billingAddress"
              value={billingAddress}
              onChange={(e) => setBillingAddress(e.target.value)}
              placeholder="Unit #, Business Park, City, PIN"
            />
          </FormField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: tokens.spacing[4] }}>
            <FormField id="creditLimit" label="Authorized Credit Limit (₹)">
              <CurrencyInput
                id="creditLimit"
                valuePaise={creditLimitPaise}
                onChangePaise={setCreditLimitPaise}
              />
            </FormField>

            <FormField id="openingBalance" label="Opening Balance Receivable (₹)">
              <CurrencyInput
                id="openingBalance"
                valuePaise={openingBalancePaise}
                onChangePaise={setOpeningBalancePaise}
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
            <Button variant="secondary" type="button" onClick={() => navigate('/customers')}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isLoading}>
              Save Customer Profile
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
