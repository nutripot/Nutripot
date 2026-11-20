import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/layout/PageHeader';
import { FormField } from '../../components/forms/FormField';
import { TextInput } from '../../components/forms/TextInput';
import { SelectInput } from '../../components/forms/SelectInput';
import { CurrencyInput } from '../../components/forms/CurrencyInput';
import { QuantityInput } from '../../components/forms/QuantityInput';
import { Button } from '../../components/ui/Button';
import { tokens } from '../../styles/tokens';
import { UnitOfMeasure, TaxRateBps } from '../../types';

export const ProductCreatePage: React.FC = () => {
  const navigate = useNavigate();

  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [hsnCode, setHsnCode] = useState('');
  const [uom, setUom] = useState<UnitOfMeasure>('PCS');
  const [taxRateBps, setTaxRateBps] = useState<TaxRateBps>(1800);
  const [purchasePricePaise, setPurchasePricePaise] = useState(0);
  const [sellingPricePaise, setSellingPricePaise] = useState(0);
  const [reorderLevel, setReorderLevel] = useState(10000); // 10 units in milli-units

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sku.trim() || !name.trim()) {
      setError('SKU and Product Name are required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          sku: sku.trim().toUpperCase(),
          name: name.trim(),
          hsnCode: hsnCode.trim() || undefined,
          uom,
          taxRateBps,
          purchasePricePaise,
          sellingPricePaise,
          reorderLevel,
        }),
      });

      const json = (await res.json()) as any;
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to create product');
      }

      navigate('/products');
    } catch (err: any) {
      setError(err.message || 'Failed to save product');
    } finally {
      setIsLoading(false);
    }
  };

  const uomOptions = [
    { value: 'PCS', label: 'Pieces (PCS)' },
    { value: 'KGS', label: 'Kilograms (KGS)' },
    { value: 'MTR', label: 'Meters (MTR)' },
    { value: 'LTR', label: 'Liters (LTR)' },
    { value: 'BOX', label: 'Boxes (BOX)' },
  ];

  const taxOptions = [
    { value: '0', label: '0% Exempted' },
    { value: '500', label: '5% GST' },
    { value: '1200', label: '12% GST' },
    { value: '1800', label: '18% GST (Standard Goods)' },
    { value: '2800', label: '28% GST (Luxury / High Rate)' },
  ];

  return (
    <div>
      <PageHeader
        title="Create New SKU"
        subtitle="Define new commercial item with taxation and baseline costing"
        secondaryActionLabel="Cancel"
        onSecondaryAction={() => navigate('/products')}
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: tokens.spacing[4] }}>
            <FormField id="sku" label="SKU Code" required hint="e.g. PRD-NUTRI-01">
              <TextInput
                id="sku"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="SKU-XXXX"
              />
            </FormField>

            <FormField id="name" label="Product Commercial Name" required>
              <TextInput
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Product description"
              />
            </FormField>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: tokens.spacing[4] }}>
            <FormField id="hsn" label="HSN Code" hint="Tariff Chapter & Item">
              <TextInput
                id="hsn"
                value={hsnCode}
                onChange={(e) => setHsnCode(e.target.value)}
                placeholder="e.g. 21069099"
              />
            </FormField>

            <FormField id="uom" label="Unit of Measure (UOM)" required>
              <SelectInput
                id="uom"
                options={uomOptions}
                value={uom}
                onChange={(e) => setUom(e.target.value as UnitOfMeasure)}
              />
            </FormField>

            <FormField id="tax" label="GST Rate" required>
              <SelectInput
                id="tax"
                options={taxOptions}
                value={String(taxRateBps)}
                onChange={(e) => setTaxRateBps(Number(e.target.value) as TaxRateBps)}
              />
            </FormField>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: tokens.spacing[4] }}>
            <FormField id="purchasePrice" label="Cost Price (₹ Excl. Tax)" required>
              <CurrencyInput
                id="purchasePrice"
                valuePaise={purchasePricePaise}
                onChangePaise={setPurchasePricePaise}
              />
            </FormField>

            <FormField id="sellingPrice" label="Base Selling Price (₹)" required>
              <CurrencyInput
                id="sellingPrice"
                valuePaise={sellingPricePaise}
                onChangePaise={setSellingPricePaise}
              />
            </FormField>

            <FormField id="reorder" label="Reorder Threshold" required hint="In selected UOM">
              <QuantityInput
                id="reorder"
                valueMilliUnits={reorderLevel}
                onChangeMilliUnits={setReorderLevel}
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
            <Button variant="secondary" type="button" onClick={() => navigate('/products')}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isLoading}>
              Save SKU to Database
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
