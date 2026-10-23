import { formatINR, formatDateIST, formatDateTimeIST } from '../src/utils/format';

describe('Formatting Utilities', () => {
  describe('formatINR', () => {
    it('formats numbers to Indian Rupee currency string', () => {
      expect(formatINR(1500)).toBe('₹1,500');
      expect(formatINR(100000)).toBe('₹1,00,000');
      expect(formatINR(0)).toBe('₹0');
    });

    it('handles undefined or null gracefully', () => {
      expect(formatINR(undefined)).toBe('₹0');
      expect(formatINR(null)).toBe('₹0');
      expect(formatINR(NaN)).toBe('₹0');
    });
  });

  describe('formatDateIST', () => {
    it('formats ISO dates correctly', () => {
      const res = formatDateIST('2026-10-23T10:00:00Z');
      expect(res).toContain('2026');
      expect(res).toContain('Oct');
    });

    it('handles invalid dates gracefully', () => {
      expect(formatDateIST('')).toBe('—');
      expect(formatDateIST(null)).toBe('—');
      expect(formatDateIST('not-a-date')).toBe('—');
    });
  });

  describe('formatDateTimeIST', () => {
    it('formats date and time together', () => {
      const res = formatDateTimeIST('2026-10-23T10:30:00Z');
      expect(res).toContain('2026');
      expect(res).toContain('at');
    });
  });
});
