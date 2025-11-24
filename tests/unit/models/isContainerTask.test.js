import { isContainerTask, TASK_TYPE } from '../../../src/models.js';

describe('isContainerTask(taskType) -> boolean', () => {
  describe('when task type is a container type', () => {
    it('should return true for TASK_TYPE.PROJECT', () => {
      expect(isContainerTask(TASK_TYPE.PROJECT)).toBe(true);
    });

    it('should return true for TASK_TYPE.MILESTONE', () => {
      expect(isContainerTask(TASK_TYPE.MILESTONE)).toBe(true);
    });

    it('should return true for TASK_TYPE.EPIC', () => {
      expect(isContainerTask(TASK_TYPE.EPIC)).toBe(true);
    });
  });

  describe('when task type is a leaf type', () => {
    it('should return false for TASK_TYPE.USER_STORY', () => {
      expect(isContainerTask(TASK_TYPE.USER_STORY)).toBe(false);
    });

    it('should return false for TASK_TYPE.SPIKE', () => {
      expect(isContainerTask(TASK_TYPE.SPIKE)).toBe(false);
    });

    it('should return false for TASK_TYPE.TECH_TASK', () => {
      expect(isContainerTask(TASK_TYPE.TECH_TASK)).toBe(false);
    });

    it('should return false for TASK_TYPE.TECH_DEBT', () => {
      expect(isContainerTask(TASK_TYPE.TECH_DEBT)).toBe(false);
    });

    it('should return false for TASK_TYPE.IMPROVEMENT', () => {
      expect(isContainerTask(TASK_TYPE.IMPROVEMENT)).toBe(false);
    });

    it('should return false for TASK_TYPE.BUG', () => {
      expect(isContainerTask(TASK_TYPE.BUG)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should return false for undefined', () => {
      expect(isContainerTask(undefined)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isContainerTask(null)).toBe(false);
    });

    it('should return false for invalid string', () => {
      expect(isContainerTask('invalid-type')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isContainerTask('')).toBe(false);
    });
  });
});
