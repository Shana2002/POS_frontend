import type { UserRole } from './types'

export type NavigationSection = 'workspace' | 'inventory' | 'finance' | 'administration'
export type NavigationIcon = 'layout-dashboard' | 'shopping-cart' | 'receipt' | 'package' | 'users' | 'truck' | 'tags' | 'warehouse' | 'clipboard-list' | 'credit-card' | 'landmark' | 'arrow-left-right' | 'gift' | 'trash-2' | 'scan-line' | 'wallet-cards' | 'bar-chart-3' | 'user-cog' | 'building-2' | 'settings' | 'scroll-text'
export type NavigationItem = { label: string; path: string; roles: UserRole[]; section: NavigationSection; icon: NavigationIcon }

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
  { label: 'Dashboard', path: '/dashboard', section: 'workspace', icon: 'layout-dashboard', roles: allRoles },
  { label: 'Sales', path: '/pos', section: 'workspace', icon: 'shopping-cart', roles: ['ADMIN', 'HO_STAFF', 'BRANCH_MANAGER', 'SALES_REP'] },
  { label: 'Invoices', path: '/invoices', section: 'workspace', icon: 'receipt', roles: ['ADMIN', 'HO_STAFF', 'BRANCH_MANAGER', 'SALES_REP'] },
  { label: 'Products', path: '/products', section: 'workspace', icon: 'package', roles: allRoles },
  { label: 'Customers', path: '/customers', section: 'workspace', icon: 'users', roles: allRoles },
  { label: 'Suppliers', path: '/suppliers', section: 'workspace', icon: 'truck', roles: ['ADMIN', 'HO_STAFF', 'BRANCH_MANAGER', 'ACCOUNTS'] },
  { label: 'Expense categories', path: '/expense-categories', section: 'workspace', icon: 'tags', roles: ['ADMIN', 'HO_STAFF', 'ACCOUNTS'] },
  { label: 'Stock', path: '/stock', section: 'inventory', icon: 'warehouse', roles: allRoles },
  { label: 'Purchasing', path: '/purchase-orders', section: 'inventory', icon: 'clipboard-list', roles: ['ADMIN', 'HO_STAFF', 'BRANCH_MANAGER', 'ACCOUNTS'] },
  { label: 'Transfers', path: '/transfers', section: 'inventory', icon: 'arrow-left-right', roles: allRoles },
  { label: 'Samples', path: '/samples', section: 'inventory', icon: 'gift', roles: allRoles },
  { label: 'Disposals', path: '/disposals', section: 'inventory', icon: 'trash-2', roles: ['ADMIN', 'HO_STAFF', 'BRANCH_MANAGER', 'ACCOUNTS'] },
  { label: 'Stock counts', path: '/stock-counts', section: 'inventory', icon: 'scan-line', roles: ['ADMIN', 'HO_STAFF', 'BRANCH_MANAGER', 'ACCOUNTS'] },
  { label: 'Payments', path: '/payments', section: 'finance', icon: 'credit-card', roles: ['ADMIN', 'HO_STAFF', 'ACCOUNTS'] },
  { label: 'Receivables', path: '/receivables/outstanding', section: 'finance', icon: 'landmark', roles: ['ADMIN', 'HO_STAFF', 'ACCOUNTS'] },
  { label: 'Expenses', path: '/expenses', section: 'finance', icon: 'wallet-cards', roles: ['ADMIN', 'HO_STAFF', 'BRANCH_MANAGER', 'ACCOUNTS'] },
  { label: 'Reports', path: '/reports/dashboard', section: 'finance', icon: 'bar-chart-3', roles: ['ADMIN', 'HO_STAFF', 'ACCOUNTS'] },
  { label: 'Users', path: '/users', section: 'administration', icon: 'user-cog', roles: ['ADMIN'] },
  { label: 'Branches', path: '/branches', section: 'administration', icon: 'building-2', roles: allRoles },
  { label: 'Settings', path: '/settings', section: 'administration', icon: 'settings', roles: ['ADMIN'] },
  { label: 'Audit log', path: '/audit-log', section: 'administration', icon: 'scroll-text', roles: ['ADMIN'] },
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
