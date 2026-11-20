import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { FormField } from '../../components/forms/FormField';
import { TextInput } from '../../components/forms/TextInput';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { tokens } from '../../styles/tokens';
import { CompanySettings } from '../../types';

export const SettingsPage: React.FC = () => {
  const [, setSettings] = useState<CompanySettings | null>(null);
  const [companyName, setCompanyName] = useState('SS Nutripot');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');
  const [stateCode, setStateCode] = useState('33');
  const [address, setAddress] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/v1/settings', { credentials: 'include' });
        if (res.ok) {
          const json = (await res.json()) as any;
          if (json.success && json.data) {
            const s = json.data;
            setSettings(s);
            setCompanyName(s.companyName || '');
            setGstin(s.gstin || '');
            setPan(s.pan || '');
            setStateCode(s.stateCode || '33');
            setAddress(s.address || '');
            setBankName(s.bankName || '');
            setAccountNumber(s.accountNumber || '');
            setIfscCode(s.ifscCode || '');
          }
        }
      } catch (err) {
        console.error('Failed to load company settings:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/v1/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          companyName,
          gstin: gstin.trim() || undefined,
          pan: pan.trim() || undefined,
          stateCode,
          address: address.trim() || undefined,
          bankName: bankName.trim() || undefined,
          accountNumber: accountNumber.trim() || undefined,
          ifscCode: ifscCode.trim() || undefined,
        }),
      });

      const json = (await res.json()) as any;
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to update company settings');
      }

      setSuccessMsg('Settings saved successfully.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Settings update failed');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner size="lg" label="Loading settings..." />;
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Manage company profile, GST registration, and bank details"
      />

      <div
        style={{
          maxWidth: '800px',
          backgroundColor: '#ffffff',
          borderRadius: tokens.borderRadius.lg,
          padding: tokens.spacing[6],
          border: `1px solid ${tokens.colors.slate[200]}`,
          boxShadow: tokens.shadows.sm,
        }}
      >
        {successMsg && (
          <div
            style={{
              backgroundColor: tokens.colors.success[50],
              border: `1px solid ${tokens.colors.success[100]}`,
              color: tokens.colors.success[700],
              padding: tokens.spacing[3],
              borderRadius: tokens.borderRadius.md,
              fontSize: tokens.typography.fontSize.sm,
              marginBottom: tokens.spacing[4],
            }}
          >
            {successMsg}
          </div>
        )}

        {errorMsg && (
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
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSave}>
          <h3 style={{ margin: `0 0 ${tokens.spacing[4]}`, fontSize: tokens.typography.fontSize.base }}>
            Legal Corporate Details
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: tokens.spacing[4] }}>
            <FormField id="companyName" label="Registered Company Name" required>
              <TextInput
                id="companyName"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </FormField>

            <FormField id="pan" label="Income Tax PAN (10 Digits)">
              <TextInput
                id="pan"
                value={pan}
                onChange={(e) => setPan(e.target.value.toUpperCase())}
                placeholder="AAAAA0000A"
                maxLength={10}
              />
            </FormField>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: tokens.spacing[4] }}>
            <FormField id="gstin" label="Principal GSTIN" hint="Format: 33AAAAA0000A1Z5">
              <TextInput
                id="gstin"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
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

          <FormField id="address" label="Principal Registered Office Address">
            <TextInput
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Corporate headquarters address"
            />
          </FormField>

          <h3
            style={{
              margin: `${tokens.spacing[6]} 0 ${tokens.spacing[4]}`,
              fontSize: tokens.typography.fontSize.base,
              borderTop: `1px solid ${tokens.colors.slate[200]}`,
              paddingTop: tokens.spacing[4],
            }}
          >
            Bank Settlement Mandate (For Invoices)
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: tokens.spacing[4] }}>
            <FormField id="bank" label="Bank Name">
              <TextInput
                id="bank"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="HDFC Bank"
              />
            </FormField>

            <FormField id="acc" label="Current Account #">
              <TextInput
                id="acc"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="502000XXXXXXX"
              />
            </FormField>

            <FormField id="ifsc" label="IFSC Code">
              <TextInput
                id="ifsc"
                value={ifscCode}
                onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                placeholder="HDFC0000123"
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
            <Button variant="primary" type="submit" isLoading={isSaving}>
              Save Corporate Parameters
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
