import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/layout/PageHeader';
import { DataTable, Column } from '../../components/tables/DataTable';
import { SearchInput } from '../../components/tables/SearchInput';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Button } from '../../components/ui/Button';
import { Modal, ConfirmDialog } from '../../components/feedback/Modal';
import { FormField } from '../../components/forms/FormField';
import { TextInput } from '../../components/forms/TextInput';
import { SelectInput } from '../../components/forms/SelectInput';
import { CurrencyInput } from '../../components/forms/CurrencyInput';
import { QuantityInput } from '../../components/forms/QuantityInput';
import { Product, UnitOfMeasure, TaxRateBps } from '../../types';
import { formatPaiseToInr } from '../../utils/currency';
import { tokens } from '../../styles/tokens';

export const ProductListPage: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Edit State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editSku, setEditSku] = useState('');
  const [editName, setEditName] = useState('');
  const [editHsn, setEditHsn] = useState('');
  const [editUom, setEditUom] = useState<UnitOfMeasure>('PCS');
  const [editTaxRateBps, setEditTaxRateBps] = useState<TaxRateBps>(1800);
  const [editCostPricePaise, setEditCostPricePaise] = useState(0);
  const [editSellingPricePaise, setEditSellingPricePaise] = useState(0);
  const [editReorderLevel, setEditReorderLevel] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete State
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/products', { credentials: 'include' });
      if (res.ok) {
        const json = (await res.json()) as any;
        if (json.success && json.data) {
          setProducts(json.data);
        }
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setEditSku(p.sku);
    setEditName(p.name);
    setEditHsn(p.hsnCode || '');
    setEditUom(p.uom || 'PCS');
    setEditTaxRateBps((p.taxRateBps as TaxRateBps) || 1800);
    setEditCostPricePaise(p.costPricePaise ?? p.purchasePricePaise ?? 0);
    setEditSellingPricePaise(p.sellingPricePaise ?? 0);
    setEditReorderLevel(p.minStockAlertLevel ?? (p as any).reorderLevel ?? 0);
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    if (!editName.trim()) {
      setEditError('Product name is required');
      return;
    }

    setIsSaving(true);
    setEditError(null);

    try {
      const res = await fetch(`/api/v1/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          sku: editSku.trim().toUpperCase(),
          name: editName.trim(),
          hsnCode: editHsn.trim() || '21069099',
          uom: editUom,
          taxRateBps: editTaxRateBps,
          costPricePaise: editCostPricePaise,
          purchasePricePaise: editCostPricePaise,
          sellingPricePaise: editSellingPricePaise,
          minStockAlertLevel: editReorderLevel,
          reorderLevel: editReorderLevel,
        }),
      });

      const json = (await res.json()) as any;
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to update product');
      }

      setEditingProduct(null);
      await fetchProducts();
    } catch (err: any) {
      setEditError(err.message || 'Update failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingProduct) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/v1/products/${deletingProduct.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!res.ok) {
        const json = (await res.json()) as any;
        throw new Error(json.error?.message || 'Failed to delete product');
      }

      setDeletingProduct(null);
      await fetchProducts();
    } catch (err: any) {
      alert(err.message || 'Delete failed');
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.hsnCode && p.hsnCode.includes(searchTerm))
  );

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
    { value: '1800', label: '18% GST (Standard)' },
    { value: '2800', label: '28% GST' },
  ];

  const columns: Column<Product>[] = [
    { key: 'sku', header: 'SKU', width: '130px' },
    { key: 'name', header: 'Product Description' },
    { key: 'hsnCode', header: 'HSN Code', width: '110px', render: (p) => p.hsnCode || '—' },
    { key: 'uom', header: 'UOM', width: '80px' },
    {
      key: 'taxRateBps',
      header: 'GST',
      width: '90px',
      render: (p) => `${p.taxRateBps / 100}%`,
    },
    {
      key: 'purchasePricePaise',
      header: 'Cost Price',
      width: '120px',
      render: (p) => formatPaiseToInr(p.costPricePaise ?? p.purchasePricePaise ?? 0),
    },
    {
      key: 'sellingPricePaise',
      header: 'Selling Price',
      width: '120px',
      render: (p) => formatPaiseToInr(p.sellingPricePaise),
    },
    {
      key: 'isActive',
      header: 'Status',
      width: '90px',
      render: (p) => (
        <StatusBadge
          status={p.isActive ? 'Active' : 'Inactive'}
          variant={p.isActive ? 'success' : 'neutral'}
        />
      ),
    },
    {
      key: 'id',
      header: 'Actions',
      width: '150px',
      render: (p) => (
        <div style={{ display: 'flex', gap: tokens.spacing[2] }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleOpenEdit(p)}
          >
            Edit
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setDeletingProduct(p)}
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
        title="Products"
        subtitle="Catalog of products, pricing, and stock thresholds"
        actionLabel="New Product"
        onAction={() => navigate('/products/create')}
      />

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
          placeholder="Filter by SKU, product name, or HSN code..."
        />
        <div style={{ fontSize: tokens.typography.fontSize.xs, color: tokens.colors.slate[500] }}>
          Showing {filtered.length} of {products.length} registered SKUs
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner label="Loading product catalog..." />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          emptyMessage="No products registered yet. Click 'New Product' to add one."
        />
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <Modal
          isOpen={true}
          onClose={() => setEditingProduct(null)}
          title={`Edit Product: ${editingProduct.sku}`}
          width="640px"
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: tokens.spacing[4] }}>
              <FormField id="edit-sku" label="SKU Code" required>
                <TextInput
                  id="edit-sku"
                  required
                  value={editSku}
                  onChange={(e) => setEditSku(e.target.value)}
                />
              </FormField>

              <FormField id="edit-name" label="Product Name" required>
                <TextInput
                  id="edit-name"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </FormField>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: tokens.spacing[4] }}>
              <FormField id="edit-hsn" label="HSN Code">
                <TextInput
                  id="edit-hsn"
                  value={editHsn}
                  onChange={(e) => setEditHsn(e.target.value)}
                />
              </FormField>

              <FormField id="edit-uom" label="UOM" required>
                <SelectInput
                  id="edit-uom"
                  options={uomOptions}
                  value={editUom}
                  onChange={(e) => setEditUom(e.target.value as UnitOfMeasure)}
                />
              </FormField>

              <FormField id="edit-tax" label="GST Rate" required>
                <SelectInput
                  id="edit-tax"
                  options={taxOptions}
                  value={String(editTaxRateBps)}
                  onChange={(e) => setEditTaxRateBps(Number(e.target.value) as TaxRateBps)}
                />
              </FormField>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: tokens.spacing[4] }}>
              <FormField id="edit-costPrice" label="Cost Price (₹)" required>
                <CurrencyInput
                  id="edit-costPrice"
                  valuePaise={editCostPricePaise}
                  onChangePaise={setEditCostPricePaise}
                />
              </FormField>

              <FormField id="edit-sellingPrice" label="Selling Price (₹)" required>
                <CurrencyInput
                  id="edit-sellingPrice"
                  valuePaise={editSellingPricePaise}
                  onChangePaise={setEditSellingPricePaise}
                />
              </FormField>

              <FormField id="edit-reorder" label="Reorder Level" required>
                <QuantityInput
                  id="edit-reorder"
                  valueMilliUnits={editReorderLevel}
                  onChangeMilliUnits={setEditReorderLevel}
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
                onClick={() => setEditingProduct(null)}
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
      {deletingProduct && (
        <ConfirmDialog
          isOpen={true}
          title="Delete Product"
          message={`Are you sure you want to remove "${deletingProduct.name}" (${deletingProduct.sku})? This product will be deactivated from the catalog.`}
          confirmLabel={isDeleting ? 'Deleting...' : 'Delete Product'}
          variant="danger"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeletingProduct(null)}
        />
      )}
    </div>
  );
};
