import { _getChildEdge, _getDependencyEdge } from '../../../../src/utils/mermaid-code-generator.js';

describe('Edge Generation Functions', () => {
  describe('_getChildEdge(taskId, dependencyId) -> string', () => {
    it('should generate child edge with "-.-" connector', () => {
      const result = _getChildEdge('epic1', 'us1');

      expect(result).toBe('epic1 -.- us1');
    });

    it('should generate correct edge for different task IDs', () => {
      const result = _getChildEdge('milestone1', 'epic2');

      expect(result).toBe('milestone1 -.- epic2');
    });
  });

  describe('_getDependencyEdge(taskId, dependencyId) -> string', () => {
    it('should generate dependency edge with "==>" connector', () => {
      const result = _getDependencyEdge('us1', 'us2');

      expect(result).toBe('us1 ==> us2');
    });

    it('should generate correct edge for different task IDs', () => {
      const result = _getDependencyEdge('task-a', 'task-b');

      expect(result).toBe('task-a ==> task-b');
    });
  });
});
