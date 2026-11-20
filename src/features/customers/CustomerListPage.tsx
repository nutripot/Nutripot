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
import { Customer } from '../../types';
import { formatPaiseToInr } from '../../utils/currency';
import { tokens } from '../../styles/tokens';

export const CustomerListPage: React.FC = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Edit State
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editName, setEditName] = useState('');
  const [editContact, setEditContact] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editGstin, setEditGstin] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete State
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/customers', { credentials: 'include' });
      if (res.ok) {
        const json = (await res.json()) as any;
        if (json.success && json.data) {
          setCustomers(json.data);
        }
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c);
    setEditName(c.name);
    setEditContact(c.contactPerson || '');
    setEditPhone(c.phone || '');
    setEditEmail(c.email || '');
    setEditGstin(c.gstin || '');
    setEditAddress(c.billingAddress || '');
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;
    if (!editName.trim()) {
      setEditError('Customer name is required');
      return;
    }

    setIsSaving(true);
    setEditError(null);

    try {
      const res = await fetch(`/api/v1/customers/${editingCustomer.id}`, {
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
        throw new Error(json.error?.message || 'Failed to update customer');
      }

      setEditingCustomer(null);
      await fetchCustomers();
    } catch (err: any) {
      setEditError(err.message || 'Update failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingCustomer) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/v1/customers/${deletingCustomer.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!res.ok) {
        const json = (await res.json()) as any;
        throw new Error(json.error?.message || 'Failed to deactivate customer');
      }

      setDeletingCustomer(null);
      await fetchCustomers();
    } catch (err: any) {
      alert(err.message || 'Deactivation failed');
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.gstin && c.gstin.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.phone && c.phone.includes(searchTerm))
  );

  const columns: Column<Customer>[] = [
    { key: 'name', header: 'Customer / Client Name' },
    { key: 'phone', header: 'Phone', width: '130px', render: (c) => c.phone || '—' },
    { key: 'gstin', header: 'GSTIN', width: '150px', render: (c) => c.gstin || 'B2C (Unregistered)' },
    {
      key: 'currentReceivablePaise',
      header: 'Receivable (AR)',
      width: '140px',
      render: (c: any) => {
        const bal = c.currentReceivablePaise ?? c.currentBalancePaise ?? 0;
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
      render: (c) => (
        <StatusBadge
          status={c.isActive ? 'Active' : 'Inactive'}
          variant={c.isActive ? 'success' : 'neutral'}
        />
      ),
    },
    {
      key: 'id',
      header: 'Actions',
      width: '230px',
      render: (c) => (
        <div style={{ display: 'flex', gap: tokens.spacing[2], flexWrap: 'nowrap' }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate(`/customers/${c.id}/ledger`)}
          >
            Ledger
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleOpenEdit(c)}
          >
            Edit
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setDeletingCustomer(c)}
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
        title="Customers"
        subtitle="Manage client directory and receivable balances"
        actionLabel="Register Customer"
        onAction={() => navigate('/customers/create')}
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
          placeholder="Filter by customer name, GSTIN, or mobile..."
        />
        <div style={{ fontSize: tokens.typography.fontSize.xs, color: tokens.colors.slate[500] }}>
          {filtered.length} customers registered
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner label="Loading customer ledger..." />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          emptyMessage="No customers registered yet. Click 'Register Customer' to add a client."
        />
      )}

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <Modal
          isOpen={true}
          onClose={() => setEditingCustomer(null)}
          title={`Edit Customer: ${editingCustomer.name}`}
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
              <FormField id="edit-cust-name" label="Customer Name" required>
                <TextInput
                  id="edit-cust-name"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </FormField>

              <FormField id="edit-cust-contact" label="Contact Person">
                <TextInput
                  id="edit-cust-contact"
                  value={editContact}
                  onChange={(e) => setEditContact(e.target.value)}
                />
              </FormField>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: tokens.spacing[3] }}>
                <FormField id="edit-cust-phone" label="Phone">
                  <TextInput
                    id="edit-cust-phone"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                  />
                </FormField>

                <FormField id="edit-cust-email" label="Email">
                  <TextInput
                    id="edit-cust-email"
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                  />
                </FormField>
              </div>

              <FormField id="edit-cust-gstin" label="GSTIN">
                <TextInput
                  id="edit-cust-gstin"
                  value={editGstin}
                  onChange={(e) => setEditGstin(e.target.value.toUpperCase())}
                  placeholder="33ABCDE1234F1Z5"
                />
              </FormField>

              <FormField id="edit-cust-address" label="Billing Address">
                <TextInput
                  id="edit-cust-address"
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
                onClick={() => setEditingCustomer(null)}
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
      {deletingCustomer && (
        <ConfirmDialog
          isOpen={true}
          title="Deactivate Customer"
          message={`Are you sure you want to deactivate "${deletingCustomer.name}"? This customer will be hidden from the active directory.`}
          confirmLabel={isDeleting ? 'Deactivating...' : 'Deactivate Customer'}
          variant="danger"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeletingCustomer(null)}
        />
      )}
    </div>
  );
};
