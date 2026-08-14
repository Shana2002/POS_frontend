import { describe, expect, it } from 'vitest'
import { canAccess, getDefaultRoute, getNavigationForRole } from '../auth/permissions'
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
})
