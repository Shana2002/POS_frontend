import type { UserRole } from './types'

export type NavigationItem = { label: string; path: string; roles: UserRole[] }

const allRoles: UserRole[] = ['ADMIN', 'HO_STAFF', 'BRANCH_MANAGER', 'SALES_REP', 'ACCOUNTS']

export const routePolicies: Array<{ pattern: string; roles: UserRole[] }> = [
  { pattern: '/users', roles: ['ADMIN'] },
  { pattern: '/settings', roles: ['ADMIN'] },
  { pattern: '/expense-categories', roles: ['ADMIN', 'HO_STAFF', 'ACCOUNTS'] },
  { pattern: '/stock/opening', roles: ['ADMIN'] },
  { pattern: '/purchase-orders', roles: ['ADMIN', 'HO_STAFF', 'BRANCH_MANAGER', 'ACCOUNTS'] },
  { pattern: '/pos', roles: ['ADMIN', 'HO_STAFF', 'BRANCH_MANAGER', 'SALES_REP'] },
  { pattern: '/invoices', roles: ['ADMIN', 'HO_STAFF', 'BRANCH_MANAGER', 'SALES_REP'] },
  { pattern: '/payments', roles: ['ADMIN', 'HO_STAFF', 'ACCOUNTS'] },
  { pattern: '/receivables', roles: ['ADMIN', 'HO_STAFF', 'ACCOUNTS'] },
  { pattern: '/transfers/new', roles: ['ADMIN', 'HO_STAFF', 'BRANCH_MANAGER'] },
  { pattern: '/transfers', roles: allRoles },
  { pattern: '/samples/new', roles: ['ADMIN', 'HO_STAFF', 'BRANCH_MANAGER', 'SALES_REP'] },
  { pattern: '/samples', roles: allRoles },
  { pattern: '/disposals/new', roles: ['ADMIN', 'HO_STAFF', 'BRANCH_MANAGER'] },
  { pattern: '/disposals', roles: ['ADMIN', 'HO_STAFF', 'BRANCH_MANAGER', 'ACCOUNTS'] },
  { pattern: '/stock-counts/new', roles: ['ADMIN', 'HO_STAFF', 'BRANCH_MANAGER'] },
  { pattern: '/stock-counts', roles: ['ADMIN', 'HO_STAFF', 'BRANCH_MANAGER', 'ACCOUNTS'] },
  { pattern: '/expenses', roles: ['ADMIN', 'HO_STAFF', 'BRANCH_MANAGER', 'ACCOUNTS'] },
  { pattern: '/reports', roles: ['ADMIN', 'HO_STAFF', 'ACCOUNTS'] },
  { pattern: '/audit-log', roles: ['ADMIN'] },
]

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
  { label: 'Expenses', path: '/expenses', roles: ['ADMIN', 'HO_STAFF', 'BRANCH_MANAGER', 'ACCOUNTS'] },
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
  const policy = getRolesForPath(path)
  if (policy) return policy.includes(role)
  const match = navigation.find((item) => path === item.path || path.startsWith(`${item.path}/`))
  return match ? match.roles.includes(role) : path === '/dashboard'
}

export function getRolesForPath(path: string): UserRole[] | null {
  return routePolicies.find((item) => path === item.pattern || path.startsWith(`${item.pattern}/`))?.roles ??
    navigation.find((item) => path === item.path || path.startsWith(`${item.path}/`))?.roles ??
    (path === '/dashboard' ? allRoles : null)
}

export function getDefaultRoute(role: UserRole): string {
  return canAccess('/dashboard', role) ? '/dashboard' : getNavigationForRole(role)[0]?.path ?? '/forbidden'
}
