import { deepClone } from '../../../../src/utils/graph.js';

describe('deepClone(obj) -> object (non-mutating)', () => {
  describe('with simple objects', () => {
    it('should return new object with same properties', () => {
      const obj = { a: 1, b: 2, c: 'test' };
      const cloned = deepClone(obj);
      expect(cloned).toEqual(obj);
      expect(cloned).not.toBe(obj);
    });

    it('should create independent copy that does not share reference', () => {
      const obj = { x: 10, y: 20 };
      const cloned = deepClone(obj);
      expect(cloned).not.toBe(obj);
    });

    it('should not mutate original object when clone is modified', () => {
      const obj = { name: 'original' };
      const cloned = deepClone(obj);
      cloned.name = 'modified';
      expect(obj.name).toBe('original');
      expect(cloned.name).toBe('modified');
    });
  });

  describe('with nested objects', () => {
    it('should clone all nested object properties', () => {
      const obj = { a: { b: { c: 1 } } };
      const cloned = deepClone(obj);
      expect(cloned).toEqual(obj);
      expect(cloned.a).not.toBe(obj.a);
      expect(cloned.a.b).not.toBe(obj.a.b);
    });

    it('should clone deeply nested objects recursively', () => {
      const obj = {
        level1: {
          level2: {
            level3: {
              level4: { value: 'deep' }
            }
          }
        }
      };
      const cloned = deepClone(obj);
      expect(cloned).toEqual(obj);
      expect(cloned.level1.level2.level3.level4).not.toBe(obj.level1.level2.level3.level4);
    });

    it('should maintain original object structure', () => {
      const obj = { a: 1, nested: { b: 2, c: { d: 3 } } };
      const cloned = deepClone(obj);
      expect(cloned.a).toBe(1);
      expect(cloned.nested.b).toBe(2);
      expect(cloned.nested.c.d).toBe(3);
    });
  });

  describe('with arrays', () => {
    it('should clone array and all its elements', () => {
      const arr = [1, 2, 3, 4];
      const cloned = deepClone(arr);
      expect(cloned).toEqual(arr);
      expect(cloned).not.toBe(arr);
    });

    it('should clone nested arrays recursively', () => {
      const arr = [[1, 2], [3, 4], [[5, 6]]];
      const cloned = deepClone(arr);
      expect(cloned).toEqual(arr);
      expect(cloned[0]).not.toBe(arr[0]);
      expect(cloned[2][0]).not.toBe(arr[2][0]);
    });

    it('should clone objects containing arrays and vice versa', () => {
      const obj = {
        arr: [1, 2, { nested: [3, 4] }],
        val: 'test'
      };
      const cloned = deepClone(obj);
      expect(cloned).toEqual(obj);
      expect(cloned.arr).not.toBe(obj.arr);
      expect(cloned.arr[2]).not.toBe(obj.arr[2]);
    });
  });

  describe('edge cases', () => {
    it('should return empty object when cloning empty object', () => {
      const obj = {};
      const cloned = deepClone(obj);
      expect(cloned).toEqual({});
      expect(cloned).not.toBe(obj);
    });

    it('should return null when cloning null', () => {
      const cloned = deepClone(null);
      expect(cloned).toBeNull();
    });

    it('should throw error for objects with circular references', () => {
      const obj = { a: 1 };
      obj.circular = obj;
      expect(() => {
        deepClone(obj);
      }).toThrow();
    });
  });
});
