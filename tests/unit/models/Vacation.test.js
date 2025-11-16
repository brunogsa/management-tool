import { Vacation } from '../../../src/models.js';

describe('Vacation', () => {
  describe('constructor({ from, to })', () => {
    it('should create vacation with from and to dates', () => {
      const vacation = new Vacation({ from: '2025-01-01', to: '2025-01-10' });
      expect(vacation.from).toBeInstanceOf(Date);
      expect(vacation.to).toBeInstanceOf(Date);
    });

    it('should convert from string to Date object', () => {
      const vacation = new Vacation({ from: '2025-01-01', to: '2025-01-10' });
      expect(vacation.from).toBeInstanceOf(Date);
      expect(vacation.from.toISOString()).toContain('2025-01-01');
    });

    it('should preserve date values correctly', () => {
      const vacation = new Vacation({ from: '2025-03-15T12:00:00Z', to: '2025-03-20T12:00:00Z' });
      const fromStr = vacation.from.toISOString();
      const toStr = vacation.to.toISOString();
      expect(fromStr).toContain('2025-03-15');
      expect(toStr).toContain('2025-03-20');
    });

    describe('validation', () => {
      it('should throw error when from and to are the same date', () => {
        expect(() => {
          new Vacation({ from: '2025-01-15', to: '2025-01-15' });
        }).toThrow('Vacation from and to dates cannot be the same');
      });

      it('should throw error when to date is before from date', () => {
        expect(() => {
          new Vacation({ from: '2025-01-20', to: '2025-01-10' });
        }).toThrow('Vacation to date cannot be before from date');
      });
    });
  });
});
