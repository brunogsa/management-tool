import { isFolderLikeTask, TASK_TYPE } from '../../../src/models.js';

describe('isFolderLikeTask(taskType) -> boolean', () => {
  describe('when task type is a folder-like type', () => {
    it('should return true for TASK_TYPE.PROJECT', () => {
      expect(isFolderLikeTask(TASK_TYPE.PROJECT)).toBe(true);
    });

    it('should return true for TASK_TYPE.MILESTONE', () => {
      expect(isFolderLikeTask(TASK_TYPE.MILESTONE)).toBe(true);
    });

    it('should return true for TASK_TYPE.EPIC', () => {
      expect(isFolderLikeTask(TASK_TYPE.EPIC)).toBe(true);
    });
  });

  describe('when task type is a leaf type', () => {
    it('should return false for TASK_TYPE.USER_STORY', () => {
      expect(isFolderLikeTask(TASK_TYPE.USER_STORY)).toBe(false);
    });

    it('should return false for TASK_TYPE.SPIKE', () => {
      expect(isFolderLikeTask(TASK_TYPE.SPIKE)).toBe(false);
    });

    it('should return false for TASK_TYPE.TECH_TASK', () => {
      expect(isFolderLikeTask(TASK_TYPE.TECH_TASK)).toBe(false);
    });

    it('should return false for TASK_TYPE.TECH_DEBT', () => {
      expect(isFolderLikeTask(TASK_TYPE.TECH_DEBT)).toBe(false);
    });

    it('should return false for TASK_TYPE.IMPROVEMENT', () => {
      expect(isFolderLikeTask(TASK_TYPE.IMPROVEMENT)).toBe(false);
    });

    it('should return false for TASK_TYPE.BUG', () => {
      expect(isFolderLikeTask(TASK_TYPE.BUG)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should return false for undefined', () => {
      expect(isFolderLikeTask(undefined)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isFolderLikeTask(null)).toBe(false);
    });

    it('should return false for invalid string', () => {
      expect(isFolderLikeTask('invalid-type')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isFolderLikeTask('')).toBe(false);
    });
  });
});
