import {
  cn,
  formatDate,
  formatCurrency,
  formatPhoneNumber,
  truncateText,
} from '@/lib/utils'

describe('utility functions', () => {
  describe('cn', () => {
    it('merges class names correctly', () => {
      expect(cn('foo', 'bar')).toBe('foo bar')
    })

    it('handles conditional classes', () => {
      expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz')
    })

    it('handles empty input', () => {
      expect(cn()).toBe('')
    })
  })

  describe('formatDate', () => {
    it('formats date string correctly', () => {
      const date = '2024-01-15T10:30:00Z'
      expect(formatDate(date)).toMatch(/Jan 15, 2024/)
    })

    it('formats Date object correctly', () => {
      const date = new Date('2024-01-15T10:30:00Z')
      expect(formatDate(date)).toMatch(/Jan 15, 2024/)
    })

    it('uses custom format string', () => {
      const date = '2024-01-15T10:30:00Z'
      expect(formatDate(date, 'yyyy-MM-dd')).toBe('2024-01-15')
    })

    it('returns empty string for falsy values', () => {
      expect(formatDate('')).toBe('')
      expect(formatDate(null as unknown as string)).toBe('')
    })
  })

  describe('formatCurrency', () => {
    it('formats USD currency correctly', () => {
      expect(formatCurrency(1234.56)).toBe('$1,234.56')
    })

    it('formats zero correctly', () => {
      expect(formatCurrency(0)).toBe('$0.00')
    })

    it('formats negative amounts correctly', () => {
      expect(formatCurrency(-100)).toBe('-$100.00')
    })

    it('uses custom locale', () => {
      expect(formatCurrency(1234.56, 'de-DE', 'EUR')).toContain('1.234,56')
    })
  })

  describe('formatPhoneNumber', () => {
    it('formats 10-digit phone number correctly', () => {
      expect(formatPhoneNumber('1234567890')).toBe('(123) 456-7890')
    })

    it('formats phone number with formatting already', () => {
      expect(formatPhoneNumber('(123) 456-7890')).toBe('(123) 456-7890')
    })

    it('formats phone number with non-digits', () => {
      expect(formatPhoneNumber('123-456-7890')).toBe('(123) 456-7890')
    })

    it('returns original for non-standard format', () => {
      expect(formatPhoneNumber('12345')).toBe('12345')
    })

    it('handles empty string', () => {
      expect(formatPhoneNumber('')).toBe('')
    })
  })

  describe('truncateText', () => {
    it('truncates text longer than maxLength', () => {
      const text = 'This is a very long text that should be truncated'
      expect(truncateText(text, 20)).toBe('This is a very long ...')
    })

    it('returns original text if shorter than maxLength', () => {
      const text = 'Short text'
      expect(truncateText(text, 20)).toBe('Short text')
    })

    it('uses default maxLength of 100', () => {
      const shortText = 'Short'
      expect(truncateText(shortText)).toBe('Short')
    })

    it('handles empty string', () => {
      expect(truncateText('')).toBe('')
    })

    it('handles null/undefined', () => {
      expect(truncateText(null as unknown as string)).toBe('')
      expect(truncateText(undefined as unknown as string)).toBe('')
    })
  })
})
