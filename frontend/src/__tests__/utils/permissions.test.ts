import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
} from '@/lib/utils/permissions'

describe('permissions utilities', () => {
  describe('hasPermission', () => {
    it('returns true when permission exists in array', () => {
      const permissions = ['customers.read', 'tickets.read', 'invoices.read']
      expect(hasPermission(permissions, 'customers.read')).toBe(true)
    })

    it('returns false when permission does not exist in array', () => {
      const permissions = ['customers.read', 'tickets.read']
      expect(hasPermission(permissions, 'invoices.read')).toBe(false)
    })

    it('returns false for empty permissions array', () => {
      expect(hasPermission([], 'customers.read')).toBe(false)
    })
  })

  describe('hasAnyPermission', () => {
    it('returns true when at least one permission exists', () => {
      const permissions = ['customers.read', 'tickets.read']
      const required = ['invoices.read', 'customers.read']
      expect(hasAnyPermission(permissions, required)).toBe(true)
    })

    it('returns false when none of the permissions exist', () => {
      const permissions = ['customers.read', 'tickets.read']
      const required = ['invoices.read', 'invoices.create']
      expect(hasAnyPermission(permissions, required)).toBe(false)
    })

    it('returns false for empty permissions array', () => {
      expect(hasAnyPermission([], ['customers.read'])).toBe(false)
    })

    it('returns false for empty required permissions array', () => {
      const permissions = ['customers.read']
      expect(hasAnyPermission(permissions, [])).toBe(false)
    })
  })

  describe('hasAllPermissions', () => {
    it('returns true when all permissions exist', () => {
      const permissions = ['customers.read', 'tickets.read', 'invoices.read']
      const required = ['customers.read', 'tickets.read']
      expect(hasAllPermissions(permissions, required)).toBe(true)
    })

    it('returns false when at least one permission is missing', () => {
      const permissions = ['customers.read', 'tickets.read']
      const required = ['customers.read', 'invoices.read']
      expect(hasAllPermissions(permissions, required)).toBe(false)
    })

    it('returns true for empty required permissions array', () => {
      const permissions = ['customers.read']
      expect(hasAllPermissions(permissions, [])).toBe(true)
    })

    it('returns false for empty permissions array when required exists', () => {
      expect(hasAllPermissions([], ['customers.read'])).toBe(false)
    })
  })
})








