import type { UserRole } from './types'

export type NavigationItem = { label: string; path: string; roles: UserRole[] }

export const navigation: NavigationItem[] = [
  { label: 'Dashboard', path: '/dashboard', roles: ['ADMIN', 'HO_STAFF', 'BRANCH_MANAGER', 'SALES_REP', 'ACCOUNTS'] },
  { label: 'Sales', path: '/pos', roles: ['ADMIN', 'HO_STAFF', 'BRANCH_MANAGER', 'SALES_REP'] },
  { label: 'Invoices', path: '/invoices', roles: ['ADMIN', 'HO_STAFF', 'BRANCH_MANAGER', 'SALES_REP'] },
  { label: 'Products', path: '/products', roles: ['ADMIN', 'HO_STAFF', 'BRANCH_MANAGER', 'SALES_REP', 'ACCOUNTS'] },
  { label: 'Customers', path: '/customers', roles: ['ADMIN', 'HO_STAFF', 'BRANCH_MANAGER', 'SALES_REP', 'ACCOUNTS'] },
  { label: 'Suppliers', path: '/suppliers', roles: ['ADMIN', 'HO_STAFF', 'BRANCH_MANAGER', 'ACCOUNTS'] },
  { label: 'Expense categories', path: '/expense-categories', roles: ['ADMIN', 'HO_STAFF', 'ACCOUNTS'] },
  { label: 'Stock', path: '/stock', roles: ['ADMIN', 'HO_STAFF', 'BRANCH_MANAGER', 'SALES_REP', 'ACCOUNTS'] },
  { label: 'Purchasing', path: '/purchase-orders', roles: ['ADMIN', 'HO_STAFF', 'BRANCH_MANAGER', 'ACCOUNTS'] },
  { label: 'Payments', path: '/payments', roles: ['ADMIN', 'HO_STAFF', 'ACCOUNTS'] },
  { label: 'Receivables', path: '/receivables/outstanding', roles: ['ADMIN', 'HO_STAFF', 'ACCOUNTS'] },
  { label: 'Transfers', path: '/transfers', roles: ['ADMIN', 'HO_STAFF', 'BRANCH_MANAGER', 'SALES_REP', 'ACCOUNTS'] },
  { label: 'Samples', path: '/samples', roles: ['ADMIN', 'HO_STAFF', 'BRANCH_MANAGER', 'SALES_REP', 'ACCOUNTS'] },
  { label: 'Disposals', path: '/disposals', roles: ['ADMIN', 'HO_STAFF', 'BRANCH_MANAGER', 'ACCOUNTS'] },
  { label: 'Stock counts', path: '/stock-counts', roles: ['ADMIN', 'HO_STAFF', 'BRANCH_MANAGER', 'ACCOUNTS'] },
  { label: 'Reports', path: '/reports/dashboard', roles: ['ADMIN', 'HO_STAFF', 'ACCOUNTS'] },
  { label: 'Users', path: '/users', roles: ['ADMIN'] },
  { label: 'Branches', path: '/branches', roles: ['ADMIN', 'HO_STAFF', 'BRANCH_MANAGER', 'SALES_REP', 'ACCOUNTS'] },
  { label: 'Settings', path: '/settings', roles: ['ADMIN'] },
  { label: 'Audit log', path: '/audit-log', roles: ['ADMIN'] },
]

export function getNavigationForRole(role: UserRole): NavigationItem[] {
  return navigation.filter((item) => item.roles.includes(role))
}

export function canAccess(path: string, role: UserRole): boolean {
  if (path === '/transfers/new') return ['ADMIN', 'HO_STAFF', 'BRANCH_MANAGER'].includes(role)
  if (path === '/samples/new') return ['ADMIN', 'HO_STAFF', 'BRANCH_MANAGER', 'SALES_REP'].includes(role)
  if (path === '/disposals/new' || path === '/stock-counts/new') return ['ADMIN', 'HO_STAFF', 'BRANCH_MANAGER'].includes(role)
  const match = navigation.find((item) => path === item.path || path.startsWith(`${item.path}/`))
  return match ? match.roles.includes(role) : path === '/dashboard'
}

export function getDefaultRoute(role: UserRole): string {
  return canAccess('/dashboard', role) ? '/dashboard' : getNavigationForRole(role)[0]?.path ?? '/forbidden'
}
