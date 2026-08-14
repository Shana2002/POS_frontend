import { Navigate, createBrowserRouter } from 'react-router-dom'
import { AppShell } from './AppShell'
import { ProtectedRoute, RoleRoute } from '../auth/ProtectedRoute'
import { LoginPage } from '../pages/LoginPage'
import { AuthenticatedRoutePage, DashboardPage, ForbiddenPage, UnauthorizedPage } from '../pages/AuthPages'
import { AccountPage } from '../pages/AccountPage'
import { UsersPage, BranchesPage, SettingsPage } from '../features/admin/AdminPages'
import { ProductDetailPage, ProductsPage } from '../features/products/ProductPages'
import { CustomerDetailPage, CustomersPage, ExpenseCategoriesPage, SupplierDetailPage, SuppliersPage } from '../features/partners/PartnerPages'
import { getNavigationForRole } from '../auth/permissions'

const adminRoles = ['ADMIN']

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/forbidden', element: <ForbiddenPage /> },
  { path: '/session-expired', element: <UnauthorizedPage /> },
  {
    element: <ProtectedRoute><AppShell /></ProtectedRoute>,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/users', element: <RoleRoute roles={adminRoles}><UsersPage /></RoleRoute> },
      { path: '/branches', element: <BranchesPage /> },
      { path: '/settings', element: <RoleRoute roles={adminRoles}><SettingsPage /></RoleRoute> },
      { path: '/products', element: <ProductsPage /> },
      { path: '/products/:id', element: <ProductDetailPage /> },
      { path: '/customers', element: <CustomersPage /> },
      { path: '/customers/:id', element: <CustomerDetailPage /> },
      { path: '/suppliers', element: <SuppliersPage /> },
      { path: '/suppliers/:id', element: <SupplierDetailPage /> },
      { path: '/expense-categories', element: <ExpenseCategoriesPage /> },
      { path: '/audit-log', element: <RoleRoute roles={adminRoles}><AuthenticatedRoutePage title="Audit log" /></RoleRoute> },
      ...getNavigationForRole('ADMIN').filter((item) => !['/dashboard', '/users', '/branches', '/products', '/customers', '/suppliers', '/expense-categories', '/settings', '/audit-log'].includes(item.path)).map((item) => ({ path: item.path, element: <AuthenticatedRoutePage title={item.label} /> })),
      { path: '/account', element: <AccountPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
])
