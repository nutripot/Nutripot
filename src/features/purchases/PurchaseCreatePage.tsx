import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/layout/PageHeader';
import { FormField } from '../../components/forms/FormField';
import { SelectInput } from '../../components/forms/SelectInput';
import { TextInput } from '../../components/forms/TextInput';
import { DateInput } from '../../components/forms/DateInput';
import { CurrencyInput } from '../../components/forms/CurrencyInput';
import { QuantityInput } from '../../components/forms/QuantityInput';
import { Button } from '../../components/ui/Button';
import { tokens } from '../../styles/tokens';
import { Product, Supplier, TaxRateBps } from '../../types';
import { formatPaiseToInr } from '../../utils/currency';

interface PurchaseLineItem {
  productId: string;
  sku: string;
  name: string;
  quantityMilliUnits: number;
  unitPricePaise: number;
  taxRateBps: TaxRateBps;
  taxableAmountPaise: number;
  taxAmountPaise: number;
  totalAmountPaise: number;
}

export const PurchaseCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [supplierId, setSupplierId] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('');
  const [notes] = useState('');

  const [items, setItems] = useState<PurchaseLineItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadMasterData() {
      try {
        const [supRes, prodRes] = await Promise.all([
          fetch('/api/v1/suppliers', { credentials: 'include' }),
          fetch('/api/v1/products', { credentials: 'include' }),
        ]);

        if (supRes.ok) {
          const supJson = (await supRes.json()) as any;
          if (supJson.success && supJson.data) {
            setSuppliers(supJson.data);
            if (supJson.data.length > 0) setSupplierId(supJson.data[0].id);
          }
        }

        if (prodRes.ok) {
          const prodJson = (await prodRes.json()) as any;
          if (prodJson.success && prodJson.data) {
            setProducts(prodJson.data);
          }
        }
      } catch (err) {
        console.error('Failed to load master data:', err);
      }
    }
    loadMasterData();
  }, []);

  const handleAddItem = (productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    const qty = 1000; // 1 unit
    const unitPrice = prod.purchasePricePaise ?? prod.costPricePaise ?? 0;
    const taxable = Math.round((qty * unitPrice) / 1000);
    const tax = Math.round((taxable * prod.taxRateBps) / 10000);
    const total = taxable + tax;

    setItems((prev) => [
      ...prev,
      {
        productId: prod.id,
        sku: prod.sku,
        name: prod.name,
        quantityMilliUnits: qty,
        unitPricePaise: unitPrice,
        taxRateBps: prod.taxRateBps,
        taxableAmountPaise: taxable,
        taxAmountPaise: tax,
        totalAmountPaise: total,
      },
    ]);
  };

  const handleUpdateItem = (index: number, qtyMilli: number, unitPrice: number) => {
    setItems((prev) => {
      const updated = [...prev];
      const item = updated[index];
      const taxable = Math.round((qtyMilli * unitPrice) / 1000);
      const tax = Math.round((taxable * item.taxRateBps) / 10000);
      const total = taxable + tax;

      updated[index] = {
        ...item,
        quantityMilliUnits: qtyMilli,
        unitPricePaise: unitPrice,
        taxableAmountPaise: taxable,
        taxAmountPaise: tax,
        totalAmountPaise: total,
      };
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const totalTaxable = items.reduce((sum, item) => sum + item.taxableAmountPaise, 0);
  const totalTax = items.reduce((sum, item) => sum + item.taxAmountPaise, 0);
  const totalAmount = totalTaxable + totalTax;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) {
      setError('Please select a supplier');
      return;
    }
    if (items.length === 0) {
      setError('Add at least one line item to the bill');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          supplierId,
          billDate,
          dueDate,
          supplierInvoiceNumber: supplierInvoiceNumber.trim() || undefined,
          notes: notes.trim() || undefined,
          items: items.map((i) => ({
            productId: i.productId,
            quantityMilliUnits: i.quantityMilliUnits,
            unitPricePaise: i.unitPricePaise,
            taxRateBps: i.taxRateBps,
          })),
        }),
      });

      const json = (await res.json()) as any;
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to create purchase bill');
      }

      navigate('/purchases');
    } catch (err: any) {
      setError(err.message || 'Procurement creation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const supplierOptions = suppliers.map((s) => ({
    value: s.id,
    label: `${s.name} (${s.gstin || 'Unregistered'})`,
  }));

  const productOptions = products.map((p) => ({
    value: p.id,
    label: `${p.sku} - ${p.name} (GST ${p.taxRateBps / 100}%)`,
  }));

  return (
    <div>
      <PageHeader
        title="Record Purchase Inward Receipt"
        subtitle="Capture supplier vendor bill with HSN tax apportionment"
        secondaryActionLabel="Cancel"
        onSecondaryAction={() => navigate('/purchases')}
      />

      <form onSubmit={handleSubmit}>
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: tokens.borderRadius.lg,
            padding: tokens.spacing[6],
            border: `1px solid ${tokens.colors.slate[200]}`,
            marginBottom: tokens.spacing[6],
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

          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: tokens.spacing[4] }}>
            <FormField id="supplier" label="Supplier / Vendor" required>
              <SelectInput
                id="supplier"
                options={supplierOptions}
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
              />
            </FormField>

            <FormField id="billDate" label="Bill Date" required>
              <DateInput
                id="billDate"
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
              />
            </FormField>

            <FormField id="dueDate" label="Payment Due Date" required>
              <DateInput
                id="dueDate"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </FormField>

            <FormField id="invNo" label="Vendor Invoice #">
              <TextInput
                id="invNo"
                value={supplierInvoiceNumber}
                onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
                placeholder="INV-XXXXX"
              />
            </FormField>
          </div>
        </div>

        {/* Line Items */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: tokens.borderRadius.lg,
            padding: tokens.spacing[6],
            border: `1px solid ${tokens.colors.slate[200]}`,
            marginBottom: tokens.spacing[6],
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: tokens.spacing[4],
            }}
          >
            <h3 style={{ margin: 0, fontSize: tokens.typography.fontSize.base, fontWeight: tokens.typography.fontWeight.semibold }}>
              Inward Line Items
            </h3>
            {products.length > 0 && (
              <div style={{ display: 'flex', gap: tokens.spacing[2], alignItems: 'center' }}>
                <select
                  id="add-prod-select"
                  style={{
                    padding: `${tokens.spacing[1]} ${tokens.spacing[2]}`,
                    fontSize: tokens.typography.fontSize.sm,
                    borderRadius: tokens.borderRadius.md,
                    border: `1px solid ${tokens.colors.slate[300]}`,
                  }}
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddItem(e.target.value);
                      e.target.value = '';
                    }
                  }}
                >
                  <option value="" disabled>
                    + Add Product SKU...
                  </option>
                  {productOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: tokens.typography.fontSize.sm,
            }}
          >
            <thead>
              <tr style={{ borderBottom: `2px solid ${tokens.colors.slate[200]}`, textAlign: 'left' }}>
                <th style={{ padding: tokens.spacing[2] }}>Item</th>
                <th style={{ padding: tokens.spacing[2], width: '130px' }}>Quantity</th>
                <th style={{ padding: tokens.spacing[2], width: '150px' }}>Unit Cost (₹)</th>
                <th style={{ padding: tokens.spacing[2], width: '90px' }}>GST %</th>
                <th style={{ padding: tokens.spacing[2], width: '120px' }}>Taxable</th>
                <th style={{ padding: tokens.spacing[2], width: '120px' }}>Total (₹)</th>
                <th style={{ padding: tokens.spacing[2], width: '50px' }}></th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: tokens.spacing[6], color: tokens.colors.slate[400] }}>
                    Select SKUs from dropdown above to add purchase items.
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: `1px solid ${tokens.colors.slate[100]}` }}>
                    <td style={{ padding: tokens.spacing[2] }}>
                      <div style={{ fontWeight: 600 }}>{item.sku}</div>
                      <div style={{ fontSize: tokens.typography.fontSize.xs, color: tokens.colors.slate[500] }}>
                        {item.name}
                      </div>
                    </td>
                    <td style={{ padding: tokens.spacing[2] }}>
                      <QuantityInput
                        id={`qty-${idx}`}
                        valueMilliUnits={item.quantityMilliUnits}
                        onChangeMilliUnits={(qty) => handleUpdateItem(idx, qty, item.unitPricePaise)}
                      />
                    </td>
                    <td style={{ padding: tokens.spacing[2] }}>
                      <CurrencyInput
                        id={`price-${idx}`}
                        valuePaise={item.unitPricePaise}
                        onChangePaise={(price) => handleUpdateItem(idx, item.quantityMilliUnits, price)}
                      />
                    </td>
                    <td style={{ padding: tokens.spacing[2] }}>{item.taxRateBps / 100}%</td>
                    <td style={{ padding: tokens.spacing[2] }}>{formatPaiseToInr(item.taxableAmountPaise)}</td>
                    <td style={{ padding: tokens.spacing[2], fontWeight: 600 }}>
                      {formatPaiseToInr(item.totalAmountPaise)}
                    </td>
                    <td style={{ padding: tokens.spacing[2] }}>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: tokens.colors.danger[600],
                          cursor: 'pointer',
                          fontWeight: 'bold',
                        }}
                      >
                        &times;
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Totals Summary */}
          {items.length > 0 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginTop: tokens.spacing[6],
                paddingTop: tokens.spacing[4],
                borderTop: `1px solid ${tokens.colors.slate[200]}`,
              }}
            >
              <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: tokens.spacing[2] }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: tokens.typography.fontSize.sm }}>
                  <span style={{ color: tokens.colors.slate[500] }}>Taxable Subtotal:</span>
                  <span>{formatPaiseToInr(totalTaxable)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: tokens.typography.fontSize.sm }}>
                  <span style={{ color: tokens.colors.slate[500] }}>Input GST:</span>
                  <span>{formatPaiseToInr(totalTax)}</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: tokens.typography.fontSize.base,
                    fontWeight: tokens.typography.fontWeight.bold,
                    borderTop: `1px solid ${tokens.colors.slate[200]}`,
                    paddingTop: tokens.spacing[2],
                  }}
                >
                  <span>Grand Total:</span>
                  <span style={{ color: tokens.colors.primary[600] }}>{formatPaiseToInr(totalAmount)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: tokens.spacing[3] }}>
          <Button variant="secondary" type="button" onClick={() => navigate('/purchases')}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={isLoading}>
            Submit Inward Bill (Draft)
          </Button>
        </div>
      </form>
    </div>
  );
};
