import { _setToArray } from '../../../../src/utils/graph.js';

describe('_setToArray(set) -> array (non-mutating)', () => {
  it('should convert Set with items to Array with same items', () => {
    const set = new Set([1, 2, 3]);
    const arr = _setToArray(set);
    expect(arr).toEqual([1, 2, 3]);
    expect(Array.isArray(arr)).toBe(true);
  });

  it('should convert empty Set to empty Array', () => {
    const set = new Set();
    const arr = _setToArray(set);
    expect(arr).toEqual([]);
    expect(Array.isArray(arr)).toBe(true);
  });

  it('should preserve all values from Set', () => {
    const set = new Set(['a', 'b', 'c', 'd']);
    const arr = _setToArray(set);
    expect(arr).toContain('a');
    expect(arr).toContain('b');
    expect(arr).toContain('c');
    expect(arr).toContain('d');
    expect(arr.length).toBe(4);
  });

  it('should return instance of Array', () => {
    const set = new Set([10, 20]);
    const arr = _setToArray(set);
    expect(Array.isArray(arr)).toBe(true);
  });

  it('should maintain value types of all elements', () => {
    const set = new Set([1, 'string', true, null, { obj: 'value' }]);
    const arr = _setToArray(set);
    expect(typeof arr[0]).toBe('number');
    expect(typeof arr[1]).toBe('string');
    expect(typeof arr[2]).toBe('boolean');
    expect(arr[3]).toBeNull();
    expect(typeof arr[4]).toBe('object');
  });
});
