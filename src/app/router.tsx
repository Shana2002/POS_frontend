import { Navigate, createBrowserRouter } from 'react-router-dom'
import { AppShell } from './AppShell'
import { ProtectedRoute, RoleRoute } from '../auth/ProtectedRoute'
import { LoginPage } from '../pages/LoginPage'
import { AuthenticatedRoutePage, DashboardPage, ForbiddenPage, UnauthorizedPage } from '../pages/AuthPages'
import { AccountPage } from '../pages/AccountPage'
import { UsersPage, BranchesPage, SettingsPage } from '../features/admin/AdminPages'
import { ProductDetailPage, ProductsPage } from '../features/products/ProductPages'
import { CustomerDetailPage, CustomersPage, ExpenseCategoriesPage, SupplierDetailPage, SuppliersPage } from '../features/partners/PartnerPages'
import { OpeningBalancePage, StockLevelsPage, StockMatrixPage, StockMovementsPage, StockValuationPage } from '../features/stock/StockPages'
import { PayablesPage, PurchaseOrderDetailPage, PurchaseOrderEditorPage, PurchaseOrdersPage } from '../features/purchasing/PurchasePages'
import { InvoiceDetailPage, InvoiceEditorPage, InvoicesPage, PosPage } from '../features/invoices/InvoicePages'
import { AgingPage, OutstandingReceivablesPage, PaymentDetailPage, PaymentsPage, RecordPaymentPage } from '../features/payments/PaymentPages'
import { InTransitPage, TransferDetailPage, TransferEditorPage, TransfersPage } from '../features/transfers/TransferPages'
import { DisposalCreatePage, DisposalDetailPage, DisposalsPage, SampleCreatePage, SampleDetailPage, SamplesPage, StockCountCreatePage, StockCountDetailPage, StockCountsPage } from '../features/inventory-operations/InventoryOperationPages'
import { getNavigationForRole } from '../auth/permissions'

const adminRoles = ['ADMIN']
const purchasingRoles = ['ADMIN', 'HO_STAFF', 'BRANCH_MANAGER', 'ACCOUNTS']
const salesRoles = ['ADMIN', 'HO_STAFF', 'BRANCH_MANAGER', 'SALES_REP']
const paymentRoles = ['ADMIN', 'HO_STAFF', 'ACCOUNTS']
const transferReadRoles = ['ADMIN', 'HO_STAFF', 'BRANCH_MANAGER', 'SALES_REP', 'ACCOUNTS']
const transferWriteRoles = ['ADMIN', 'HO_STAFF', 'BRANCH_MANAGER']
const inventoryReadRoles = ['ADMIN', 'HO_STAFF', 'BRANCH_MANAGER', 'SALES_REP', 'ACCOUNTS']
const inventoryWriteRoles = ['ADMIN', 'HO_STAFF', 'BRANCH_MANAGER', 'SALES_REP']
const disposalWriteRoles = ['ADMIN', 'HO_STAFF', 'BRANCH_MANAGER']

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
      { path: '/stock', element: <StockLevelsPage /> },
      { path: '/stock/matrix', element: <StockMatrixPage /> },
      { path: '/stock/movements', element: <StockMovementsPage /> },
      { path: '/stock/valuation', element: <StockValuationPage /> },
      { path: '/stock/opening', element: <RoleRoute roles={adminRoles}><OpeningBalancePage /></RoleRoute> },
      { path: '/purchase-orders', element: <RoleRoute roles={purchasingRoles}><PurchaseOrdersPage /></RoleRoute> },
      { path: '/purchase-orders/new', element: <RoleRoute roles={purchasingRoles}><PurchaseOrderEditorPage /></RoleRoute> },
      { path: '/purchase-orders/:id/edit', element: <RoleRoute roles={purchasingRoles}><PurchaseOrderEditorPage /></RoleRoute> },
      { path: '/purchase-orders/:id', element: <RoleRoute roles={purchasingRoles}><PurchaseOrderDetailPage /></RoleRoute> },
      { path: '/payables', element: <RoleRoute roles={purchasingRoles}><PayablesPage /></RoleRoute> },
      { path: '/pos', element: <RoleRoute roles={salesRoles}><PosPage /></RoleRoute> },
      { path: '/invoices', element: <RoleRoute roles={salesRoles}><InvoicesPage /></RoleRoute> },
      { path: '/invoices/new', element: <RoleRoute roles={salesRoles}><InvoiceEditorPage /></RoleRoute> },
      { path: '/invoices/:id/edit', element: <RoleRoute roles={salesRoles}><InvoiceEditorPage /></RoleRoute> },
      { path: '/invoices/:id', element: <RoleRoute roles={salesRoles}><InvoiceDetailPage /></RoleRoute> },
      { path: '/payments', element: <RoleRoute roles={paymentRoles}><PaymentsPage /></RoleRoute> },
      { path: '/payments/new', element: <RoleRoute roles={paymentRoles}><RecordPaymentPage /></RoleRoute> },
      { path: '/payments/:id', element: <RoleRoute roles={paymentRoles}><PaymentDetailPage /></RoleRoute> },
      { path: '/receivables/outstanding', element: <RoleRoute roles={paymentRoles}><OutstandingReceivablesPage /></RoleRoute> },
      { path: '/receivables/aging', element: <RoleRoute roles={paymentRoles}><AgingPage /></RoleRoute> },
      { path: '/transfers', element: <RoleRoute roles={transferReadRoles}><TransfersPage /></RoleRoute> },
      { path: '/transfers/new', element: <RoleRoute roles={transferWriteRoles}><TransferEditorPage /></RoleRoute> },
      { path: '/transfers/in-transit', element: <RoleRoute roles={transferReadRoles}><InTransitPage /></RoleRoute> },
      { path: '/transfers/:id', element: <RoleRoute roles={transferReadRoles}><TransferDetailPage /></RoleRoute> },
      { path: '/samples', element: <RoleRoute roles={inventoryReadRoles}><SamplesPage /></RoleRoute> },
      { path: '/samples/new', element: <RoleRoute roles={inventoryWriteRoles}><SampleCreatePage /></RoleRoute> },
      { path: '/samples/:id', element: <RoleRoute roles={inventoryReadRoles}><SampleDetailPage /></RoleRoute> },
      { path: '/disposals', element: <RoleRoute roles={['ADMIN', 'HO_STAFF', 'BRANCH_MANAGER', 'ACCOUNTS']}><DisposalsPage /></RoleRoute> },
      { path: '/disposals/new', element: <RoleRoute roles={disposalWriteRoles}><DisposalCreatePage /></RoleRoute> },
      { path: '/disposals/:id', element: <RoleRoute roles={['ADMIN', 'HO_STAFF', 'BRANCH_MANAGER', 'ACCOUNTS']}><DisposalDetailPage /></RoleRoute> },
      { path: '/stock-counts', element: <RoleRoute roles={['ADMIN', 'HO_STAFF', 'BRANCH_MANAGER', 'ACCOUNTS']}><StockCountsPage /></RoleRoute> },
      { path: '/stock-counts/new', element: <RoleRoute roles={disposalWriteRoles}><StockCountCreatePage /></RoleRoute> },
      { path: '/stock-counts/:id', element: <RoleRoute roles={['ADMIN', 'HO_STAFF', 'BRANCH_MANAGER', 'ACCOUNTS']}><StockCountDetailPage /></RoleRoute> },
      { path: '/audit-log', element: <RoleRoute roles={adminRoles}><AuthenticatedRoutePage title="Audit log" /></RoleRoute> },
      ...getNavigationForRole('ADMIN').filter((item) => !['/dashboard', '/pos', '/payments', '/transfers', '/samples', '/disposals', '/stock-counts', '/users', '/branches', '/products', '/customers', '/suppliers', '/expense-categories', '/stock', '/purchase-orders', '/settings', '/audit-log'].includes(item.path)).map((item) => ({ path: item.path, element: <AuthenticatedRoutePage title={item.label} /> })),
      { path: '/account', element: <AccountPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
])
