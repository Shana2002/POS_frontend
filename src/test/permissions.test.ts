import { describe, expect, it } from 'vitest'
import { canAccess, getDefaultRoute, getNavigationForRole, getRolesForPath, navigation } from '../auth/permissions'
import type { UserRole } from '../auth/types'

const roles: UserRole[] = ['ADMIN', 'HO_STAFF', 'BRANCH_MANAGER', 'SALES_REP', 'ACCOUNTS']

describe('role navigation policy', () => {
  it.each(roles)('returns a safe default and no forbidden routes for %s', (role) => {
    const navigation = getNavigationForRole(role)
    expect(navigation.length).toBeGreaterThan(0)
    expect(canAccess('/dashboard', role)).toBe(true)
    expect(canAccess('/audit-log', role)).toBe(role === 'ADMIN')
    expect(canAccess('/users', role)).toBe(role === 'ADMIN')
    expect(getDefaultRoute(role)).toBe('/dashboard')
  })

  it('restricts settings to administrative roles', () => {
    expect(canAccess('/settings', 'ADMIN')).toBe(true)
    expect(canAccess('/settings', 'HO_STAFF')).toBe(false)
    expect(canAccess('/settings', 'SALES_REP')).toBe(false)
  })

  it('allows every role to read transfers but restricts transfer creation', () => {
    const writers: UserRole[] = ['ADMIN', 'HO_STAFF', 'BRANCH_MANAGER']
    roles.forEach((role) => {
      expect(canAccess('/transfers', role)).toBe(true)
      expect(canAccess('/transfers/in-transit', role)).toBe(true)
      expect(canAccess('/transfers/new', role)).toBe(writers.includes(role))
      expect(getNavigationForRole(role).some((item) => item.path === '/transfers')).toBe(true)
    })
  })

  it('shows expenses only to operational finance roles', () => {
    const expenseRoles: UserRole[] = ['ADMIN', 'HO_STAFF', 'BRANCH_MANAGER', 'ACCOUNTS']
    roles.forEach((role) => {
      expect(canAccess('/expenses', role)).toBe(expenseRoles.includes(role))
      expect(canAccess('/expenses/new', role)).toBe(expenseRoles.includes(role))
      expect(getNavigationForRole(role).some((item) => item.path === '/expenses')).toBe(expenseRoles.includes(role))
    })
  })

  it('restricts dedicated reports to head-office and finance roles', () => {
    const reportRoles: UserRole[] = ['ADMIN', 'HO_STAFF', 'ACCOUNTS']
    roles.forEach((role) => {
      expect(canAccess('/reports/profit-loss', role)).toBe(reportRoles.includes(role))
      expect(getNavigationForRole(role).some((item) => item.path === '/reports/dashboard')).toBe(reportRoles.includes(role))
    })
  })

  it('uses one policy for navigation and direct route access', () => {
    navigation.forEach((item) => {
      expect(getRolesForPath(item.path)).toEqual(item.roles)
      roles.forEach((role) => expect(canAccess(item.path, role)).toBe(item.roles.includes(role)))
    })

    expect(getRolesForPath('/expense-categories')).toEqual(['ADMIN', 'HO_STAFF', 'ACCOUNTS'])
    expect(getRolesForPath('/transfers/new')).toEqual(['ADMIN', 'HO_STAFF', 'BRANCH_MANAGER'])
    expect(getRolesForPath('/reports/profit-loss')).toEqual(['ADMIN', 'HO_STAFF', 'ACCOUNTS'])
  })
})
