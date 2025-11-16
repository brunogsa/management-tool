import { calculateCompletionDate } from '../../../../src/utils/monte-carlo.js';

describe('calculateCompletionDate(sprints, startDate) -> Date (non-mutating)', () => {
  it('should return startDate unchanged when sprints is 0', () => {
    const startDate = new Date('2025-01-01T00:00:00Z');
    const result = calculateCompletionDate(0, startDate);

    expect(result.getTime()).toBe(startDate.getTime());
  });

  it('should return date 14 days after startDate when sprints is 1', () => {
    const startDate = new Date('2025-01-01T00:00:00Z');
    const result = calculateCompletionDate(1, startDate);

    const expectedDate = new Date(startDate);
    expectedDate.setDate(expectedDate.getDate() + 14);

    expect(result.getTime()).toBe(expectedDate.getTime());
  });

  it('should add 28 days to startDate when sprints is 2', () => {
    const startDate = new Date('2025-01-01T00:00:00Z');
    const result = calculateCompletionDate(2, startDate);

    const expectedDate = new Date(startDate);
    expectedDate.setDate(expectedDate.getDate() + 28);

    expect(result.getTime()).toBe(expectedDate.getTime());
  });

  it('should correctly add (sprints * 14) days to startDate', () => {
    const startDate = new Date('2025-01-01T00:00:00Z');
    const sprints = 5;
    const result = calculateCompletionDate(sprints, startDate);

    const expectedDate = new Date(startDate);
    expectedDate.setDate(expectedDate.getDate() + (sprints * 14));

    expect(result.getTime()).toBe(expectedDate.getTime());
  });

  it('should not modify original startDate object', () => {
    const startDate = new Date('2025-01-01T00:00:00Z');
    const originalTime = startDate.getTime();

    calculateCompletionDate(10, startDate);

    expect(startDate.getTime()).toBe(originalTime);
  });

  it('should return new Date instance', () => {
    const startDate = new Date('2025-01-01T00:00:00Z');
    const result = calculateCompletionDate(3, startDate);

    expect(result).toBeInstanceOf(Date);
    expect(result).not.toBe(startDate);
  });

  describe('edge cases', () => {
    it('should correctly calculate date with 100+ sprints', () => {
      const startDate = new Date('2025-01-01T00:00:00Z');
      const sprints = 100;
      const result = calculateCompletionDate(sprints, startDate);

      const expectedDate = new Date(startDate);
      expectedDate.setDate(expectedDate.getDate() + (sprints * 14));

      expect(result.getTime()).toBe(expectedDate.getTime());
    });

    it('should correctly handle date arithmetic across month boundaries', () => {
      const startDate = new Date('2025-01-28T00:00:00Z'); // Late January
      const result = calculateCompletionDate(1, startDate); // Add 14 days

      // Should be in February
      expect(result.getMonth()).toBe(1); // February is month 1 (0-indexed)
    });

    it('should correctly handle date arithmetic across year boundaries', () => {
      const startDate = new Date('2025-12-20T00:00:00Z'); // Late December
      const result = calculateCompletionDate(2, startDate); // Add 28 days

      // Should be in next year
      expect(result.getFullYear()).toBe(2026);
    });
  });
});
