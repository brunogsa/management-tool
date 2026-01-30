import { describe, it, expect } from '@jest/globals';
import {
  formatDate,
  addWeeksToDate,
  calculateWeeksBetween,
} from '../../../src/utils/date.js';

describe('date utilities', () => {
  describe('formatDate', () => {
    it('should format date as YYYY-MM-DD', () => {
      const date = new Date(2025, 5, 15); // June 15, 2025

      expect(formatDate(date)).toBe('2025-06-15');
    });

    it('should pad single-digit month and day with leading zeros', () => {
      const date = new Date(2025, 0, 3); // January 3, 2025

      expect(formatDate(date)).toBe('2025-01-03');
    });

    it('should handle year boundaries (Dec 31 -> Jan 1)', () => {
      const dec31 = new Date(2025, 11, 31);
      const jan1 = new Date(2026, 0, 1);

      expect(formatDate(dec31)).toBe('2025-12-31');
      expect(formatDate(jan1)).toBe('2026-01-01');
    });
  });

  describe('addWeeksToDate', () => {
    it('should add weeks to a date correctly', () => {
      const date = new Date(2025, 0, 1); // January 1, 2025

      const result = addWeeksToDate(date, 2);

      expect(formatDate(result)).toBe('2025-01-15');
    });

    it('should handle zero weeks (return same date)', () => {
      const date = new Date(2025, 5, 15);

      const result = addWeeksToDate(date, 0);

      expect(formatDate(result)).toBe('2025-06-15');
    });

    it('should handle negative weeks (go backwards)', () => {
      const date = new Date(2025, 0, 15); // January 15, 2025

      const result = addWeeksToDate(date, -1);

      expect(formatDate(result)).toBe('2025-01-08');
    });

    it('should not mutate the original date', () => {
      const date = new Date(2025, 0, 1);
      const originalTime = date.getTime();

      addWeeksToDate(date, 5);

      expect(date.getTime()).toBe(originalTime);
    });
  });

  describe('calculateWeeksBetween', () => {
    it('should return correct number of full weeks', () => {
      const start = new Date(2025, 0, 1);
      const target = new Date(2025, 0, 22); // 21 days = 3 weeks

      expect(calculateWeeksBetween(start, target)).toBe(3);
    });

    it('should round partial weeks (6 days rounds to 1 week)', () => {
      const start = new Date(2025, 0, 1);
      const target = new Date(2025, 0, 7); // 6 days = 0.857 weeks -> rounds to 1

      expect(calculateWeeksBetween(start, target)).toBe(1);
    });

    it('should round down when remainder is less than half a week', () => {
      const start = new Date(2025, 0, 1);
      const target = new Date(2025, 0, 4); // 3 days = 0.43 weeks -> rounds to 0

      expect(calculateWeeksBetween(start, target)).toBe(0);
    });

    it('should handle same date (0 weeks)', () => {
      const date = new Date(2025, 0, 1);

      expect(calculateWeeksBetween(date, date)).toBe(0);
    });

    it('should handle negative difference (target before start)', () => {
      const start = new Date(2025, 0, 15);
      const target = new Date(2025, 0, 1); // 14 days before

      expect(calculateWeeksBetween(start, target)).toBe(-2);
    });
  });
});
