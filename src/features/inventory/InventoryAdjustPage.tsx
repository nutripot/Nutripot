import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/layout/PageHeader';
import { FormField } from '../../components/forms/FormField';
import { SelectInput } from '../../components/forms/SelectInput';
import { QuantityInput } from '../../components/forms/QuantityInput';
import { TextInput } from '../../components/forms/TextInput';
import { Button } from '../../components/ui/Button';
import { tokens } from '../../styles/tokens';
import { Product } from '../../types';

export const InventoryAdjustPage: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [movementType, setMovementType] = useState<'ADJUSTMENT_ADD' | 'ADJUSTMENT_SUB' | 'DAMAGE_WRITE_OFF'>('ADJUSTMENT_ADD');
  const [quantityMilliUnits, setQuantityMilliUnits] = useState(1000); // 1.0 unit
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch('/api/v1/products', { credentials: 'include' });
        if (res.ok) {
          const json = (await res.json()) as any;
          if (json.success && json.data) {
            setProducts(json.data);
            if (json.data.length > 0) {
              setSelectedProductId(json.data[0].id);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching products:', err);
      }
    }
    fetchProducts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      setError('Please select a product');
      return;
    }
    if (quantityMilliUnits <= 0) {
      setError('Adjustment quantity must be greater than zero');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/inventory/adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          productId: selectedProductId,
          movementType,
          quantityMilliUnits,
          reason: reason.trim() || undefined,
        }),
      });

      const json = (await res.json()) as any;
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to adjust stock');
      }

      navigate('/inventory');
    } catch (err: any) {
      setError(err.message || 'Stock adjustment failed');
    } finally {
      setIsLoading(false);
    }
  };

  const productOptions = products.map((p) => ({
    value: p.id,
    label: `${p.sku} - ${p.name} (${p.uom})`,
  }));

  const typeOptions = [
    { value: 'ADJUSTMENT_ADD', label: 'Stock Inflow (+ Positive Reconciliation)' },
    { value: 'ADJUSTMENT_SUB', label: 'Stock Deduction (- Negative Reconciliation)' },
    { value: 'DAMAGE_WRITE_OFF', label: 'Damage / Breakage / Expiry Write-Off' },
  ];

  return (
    <div>
      <PageHeader
        title="Stock Adjustment Entry"
        subtitle="Record physical count reconciliation or write-offs with immutable ledger logging"
        secondaryActionLabel="Cancel"
        onSecondaryAction={() => navigate('/inventory')}
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
          <FormField id="product" label="Target Product SKU" required>
            <SelectInput
              id="product"
              options={productOptions}
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
            />
          </FormField>

          <FormField id="movementType" label="Adjustment Nature" required>
            <SelectInput
              id="movementType"
              options={typeOptions}
              value={movementType}
              onChange={(e) => setMovementType(e.target.value as any)}
            />
          </FormField>

          <FormField id="qty" label="Quantity to Adjust" required hint="In native unit precision">
            <QuantityInput
              id="qty"
              valueMilliUnits={quantityMilliUnits}
              onChangeMilliUnits={setQuantityMilliUnits}
            />
          </FormField>

          <FormField id="reason" label="Justification / Audit Reason" hint="Optional notes for audit logs">
            <TextInput
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Annual physical count audit discrepancy"
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
            <Button variant="secondary" type="button" onClick={() => navigate('/inventory')}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isLoading}>
              Commit Stock Adjustment
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
