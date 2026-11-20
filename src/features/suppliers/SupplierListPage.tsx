import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/layout/PageHeader';
import { DataTable, Column } from '../../components/tables/DataTable';
import { SearchInput } from '../../components/tables/SearchInput';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Modal, ConfirmDialog } from '../../components/feedback/Modal';
import { FormField } from '../../components/forms/FormField';
import { TextInput } from '../../components/forms/TextInput';
import { Supplier } from '../../types';
import { formatPaiseToInr } from '../../utils/currency';
import { tokens } from '../../styles/tokens';

export const SupplierListPage: React.FC = () => {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Edit State
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editName, setEditName] = useState('');
  const [editContact, setEditContact] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editGstin, setEditGstin] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete State
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchSuppliers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/suppliers', { credentials: 'include' });
      if (res.ok) {
        const json = (await res.json()) as any;
        if (json.success && json.data) {
          setSuppliers(json.data);
        }
      }
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleOpenEdit = (s: Supplier) => {
    setEditingSupplier(s);
    setEditName(s.name);
    setEditContact(s.contactPerson || '');
    setEditPhone(s.phone || '');
    setEditEmail(s.email || '');
    setEditGstin(s.gstin || '');
    setEditAddress(s.billingAddress || '');
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier) return;
    if (!editName.trim()) {
      setEditError('Supplier name is required');
      return;
    }

    setIsSaving(true);
    setEditError(null);

    try {
      const res = await fetch(`/api/v1/suppliers/${editingSupplier.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: editName.trim(),
          contactPerson: editContact.trim() || undefined,
          phone: editPhone.trim() || undefined,
          email: editEmail.trim() || undefined,
          gstin: editGstin.trim() || undefined,
          billingAddress: editAddress.trim() || undefined,
        }),
      });

      const json = (await res.json()) as any;
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to update supplier');
      }

      setEditingSupplier(null);
      await fetchSuppliers();
    } catch (err: any) {
      setEditError(err.message || 'Update failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingSupplier) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/v1/suppliers/${deletingSupplier.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!res.ok) {
        const json = (await res.json()) as any;
        throw new Error(json.error?.message || 'Failed to deactivate supplier');
      }

      setDeletingSupplier(null);
      await fetchSuppliers();
    } catch (err: any) {
      alert(err.message || 'Deactivation failed');
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.gstin && s.gstin.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.phone && s.phone.includes(searchTerm))
  );

  const columns: Column<Supplier>[] = [
    { key: 'name', header: 'Supplier Name' },
    { key: 'contactPerson', header: 'Contact Person', render: (s) => s.contactPerson || '—' },
    { key: 'phone', header: 'Phone', width: '130px', render: (s) => s.phone || '—' },
    { key: 'gstin', header: 'GSTIN', width: '150px', render: (s) => s.gstin || 'Unregistered' },
    {
      key: 'currentPayablePaise',
      header: 'Outstanding (AP)',
      width: '140px',
      render: (s: any) => {
        const bal = s.currentPayablePaise ?? s.currentBalancePaise ?? 0;
        return (
          <span
            style={{
              fontWeight: tokens.typography.fontWeight.semibold,
              color: bal > 0 ? tokens.colors.danger[600] : tokens.colors.slate[800],
            }}
          >
            {formatPaiseToInr(bal)}
          </span>
        );
      },
    },
    {
      key: 'isActive',
      header: 'Status',
      width: '90px',
      render: (s) => (
        <StatusBadge
          status={s.isActive ? 'Active' : 'Inactive'}
          variant={s.isActive ? 'success' : 'neutral'}
        />
      ),
    },
    {
      key: 'id',
      header: 'Actions',
      width: '230px',
      render: (s) => (
        <div style={{ display: 'flex', gap: tokens.spacing[2], flexWrap: 'nowrap' }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate(`/suppliers/${s.id}/ledger`)}
          >
            Ledger
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleOpenEdit(s)}
          >
            Edit
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setDeletingSupplier(s)}
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
        title="Suppliers"
        subtitle="Manage vendor directory and payable balances"
        actionLabel="Add Supplier"
        onAction={() => navigate('/suppliers/create')}
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
          placeholder="Search by vendor name, GSTIN, or phone..."
        />
        <div style={{ fontSize: tokens.typography.fontSize.xs, color: tokens.colors.slate[500] }}>
          {filtered.length} suppliers registered
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner label="Loading supplier database..." />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          emptyMessage="No suppliers registered yet. Click 'Add Supplier' to create vendor profile."
        />
      )}

      {/* Edit Supplier Modal */}
      {editingSupplier && (
        <Modal
          isOpen={true}
          onClose={() => setEditingSupplier(null)}
          title={`Edit Supplier: ${editingSupplier.name}`}
          width="560px"
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[3] }}>
              <FormField id="edit-supp-name" label="Supplier Name" required>
                <TextInput
                  id="edit-supp-name"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </FormField>

              <FormField id="edit-supp-contact" label="Contact Person">
                <TextInput
                  id="edit-supp-contact"
                  value={editContact}
                  onChange={(e) => setEditContact(e.target.value)}
                />
              </FormField>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: tokens.spacing[3] }}>
                <FormField id="edit-supp-phone" label="Phone">
                  <TextInput
                    id="edit-supp-phone"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                  />
                </FormField>

                <FormField id="edit-supp-email" label="Email">
                  <TextInput
                    id="edit-supp-email"
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                  />
                </FormField>
              </div>

              <FormField id="edit-supp-gstin" label="GSTIN">
                <TextInput
                  id="edit-supp-gstin"
                  value={editGstin}
                  onChange={(e) => setEditGstin(e.target.value.toUpperCase())}
                  placeholder="33ABCDE1234F1Z5"
                />
              </FormField>

              <FormField id="edit-supp-address" label="Billing Address">
                <TextInput
                  id="edit-supp-address"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
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
                onClick={() => setEditingSupplier(null)}
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
      {deletingSupplier && (
        <ConfirmDialog
          isOpen={true}
          title="Deactivate Supplier"
          message={`Are you sure you want to deactivate "${deletingSupplier.name}"? This supplier will be hidden from the active directory.`}
          confirmLabel={isDeleting ? 'Deactivating...' : 'Deactivate Supplier'}
          variant="danger"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeletingSupplier(null)}
        />
      )}
    </div>
  );
};
