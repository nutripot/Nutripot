import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/layout/PageHeader';
import { DataTable, Column } from '../../components/tables/DataTable';
import { SearchInput } from '../../components/tables/SearchInput';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Product } from '../../types';
import { formatPaiseToInr } from '../../utils/currency';
import { tokens } from '../../styles/tokens';

export const ProductListPage: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchProducts() {
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
    }
    fetchProducts();
  }, []);

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.hsnCode && p.hsnCode.includes(searchTerm))
  );

  const columns: Column<Product>[] = [
    { key: 'sku', header: 'SKU', width: '130px' },
    { key: 'name', header: 'Product Description' },
    { key: 'hsnCode', header: 'HSN Code', width: '110px', render: (p) => p.hsnCode || '—' },
    { key: 'uom', header: 'UOM', width: '90px' },
    {
      key: 'taxRateBps',
      header: 'GST Rate',
      width: '100px',
      render: (p) => `${p.taxRateBps / 100}%`,
    },
    {
      key: 'purchasePricePaise',
      header: 'Cost Price',
      width: '130px',
      render: (p) => formatPaiseToInr(p.purchasePricePaise ?? p.costPricePaise ?? 0),
    },
    {
      key: 'sellingPricePaise',
      header: 'Selling Price',
      width: '130px',
      render: (p) => formatPaiseToInr(p.sellingPricePaise),
    },
    {
      key: 'isActive',
      header: 'Status',
      width: '100px',
      render: (p) => (
        <StatusBadge
          status={p.isActive ? 'Active' : 'Inactive'}
          variant={p.isActive ? 'success' : 'neutral'}
        />
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
          emptyMessage="No products registered yet. Click 'Create SKU' to add one."
        />
      )}
    </div>
  );
};
