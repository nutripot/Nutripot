import { RouteObject, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { LoginPage } from '../features/auth/LoginPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { ProductListPage } from '../features/products/ProductListPage';
import { ProductCreatePage } from '../features/products/ProductCreatePage';
import { InventoryListPage } from '../features/inventory/InventoryListPage';
import { InventoryAdjustPage } from '../features/inventory/InventoryAdjustPage';
import { PurchaseListPage } from '../features/purchases/PurchaseListPage';
import { PurchaseCreatePage } from '../features/purchases/PurchaseCreatePage';
import { SupplierListPage } from '../features/suppliers/SupplierListPage';
import { SupplierCreatePage } from '../features/suppliers/SupplierCreatePage';
import { SupplierLedgerPage } from '../features/suppliers/SupplierLedgerPage';
import { SalesListPage } from '../features/sales/SalesListPage';
import { SalesCreatePage } from '../features/sales/SalesCreatePage';
import { CustomerListPage } from '../features/customers/CustomerListPage';
import { CustomerCreatePage } from '../features/customers/CustomerCreatePage';
import { CustomerLedgerPage } from '../features/customers/CustomerLedgerPage';
import { CollectionListPage } from '../features/collections/CollectionListPage';
import { CollectionCreatePage } from '../features/collections/CollectionCreatePage';
import { ExpenseListPage } from '../features/expenses/ExpenseListPage';
import { ExpenseCreatePage } from '../features/expenses/ExpenseCreatePage';
import { ReportsPage } from '../features/reports/ReportsPage';
import { SettingsPage } from '../features/settings/SettingsPage';

export const routes: RouteObject[] = [
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'products',
        element: <ProductListPage />,
      },
      {
        path: 'products/create',
        element: <ProductCreatePage />,
      },
      {
        path: 'inventory',
        element: <InventoryListPage />,
      },
      {
        path: 'inventory/adjust',
        element: <InventoryAdjustPage />,
      },
      {
        path: 'purchases',
        element: <PurchaseListPage />,
      },
      {
        path: 'purchases/create',
        element: <PurchaseCreatePage />,
      },
      {
        path: 'suppliers',
        element: <SupplierListPage />,
      },
      {
        path: 'suppliers/create',
        element: <SupplierCreatePage />,
      },
      {
        path: 'suppliers/:id/ledger',
        element: <SupplierLedgerPage />,
      },
      {
        path: 'sales',
        element: <SalesListPage />,
      },
      {
        path: 'sales/create',
        element: <SalesCreatePage />,
      },
      {
        path: 'customers',
        element: <CustomerListPage />,
      },
      {
        path: 'customers/create',
        element: <CustomerCreatePage />,
      },
      {
        path: 'customers/:id/ledger',
        element: <CustomerLedgerPage />,
      },
      {
        path: 'collections',
        element: <CollectionListPage />,
      },
      {
        path: 'collections/create',
        element: <CollectionCreatePage />,
      },
      {
        path: 'expenses',
        element: <ExpenseListPage />,
      },
      {
        path: 'expenses/create',
        element: <ExpenseCreatePage />,
      },
      {
        path: 'reports',
        element: <ReportsPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
      {
        path: '*',
        element: <Navigate to="/dashboard" replace />,
      },
    ],
  },
];
