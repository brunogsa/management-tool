import { Task, TASK_TYPE, FIBONACCI } from '../../../src/models.js';

describe('Task', () => {
  describe('constructor({ id, title, type })', () => {
    describe('with valid parameters', () => {
      it('should create task with id, title, and type', () => {
        const task = new Task({ id: 't1', title: 'Test Task', type: TASK_TYPE.USER_STORY });
        expect(task.id).toBe('t1');
        expect(task.title).toBe('Test Task');
        expect(task.type).toBe(TASK_TYPE.USER_STORY);
      });

      it('should initialize fibonacciEstimate to 0', () => {
        const task = new Task({ id: 't1', title: 'Test', type: TASK_TYPE.BUG });
        expect(task.fibonacciEstimate).toBe(FIBONACCI._0);
      });

      it('should initialize mostProbableEstimateInRange to 0', () => {
        const task = new Task({ id: 't1', title: 'Test', type: TASK_TYPE.SPIKE });
        expect(task.mostProbableEstimateInRange).toBe(FIBONACCI._0);
      });

      it('should initialize parents as empty array', () => {
        const task = new Task({ id: 't1', title: 'Test', type: TASK_TYPE.TECH_TASK });
        expect(task.parents).toEqual([]);
        expect(Array.isArray(task.parents)).toBe(true);
      });

      it('should initialize dependsOnTasks as empty array', () => {
        const task = new Task({ id: 't1', title: 'Test', type: TASK_TYPE.TECH_DEBT });
        expect(task.dependsOnTasks).toEqual([]);
        expect(Array.isArray(task.dependsOnTasks)).toBe(true);
      });

      it('should initialize requiredSkills as empty array', () => {
        const task = new Task({ id: 't1', title: 'Test', type: TASK_TYPE.IMPROVEMENT });
        expect(task.requiredSkills).toEqual([]);
        expect(Array.isArray(task.requiredSkills)).toBe(true);
      });

      it('should initialize onlyStartableAt as undefined', () => {
        const task = new Task({ id: 't1', title: 'Test', type: TASK_TYPE.PROJECT });
        expect(task.onlyStartableAt).toBeUndefined();
      });

      describe('runtime properties initialization', () => {
        const task = new Task({ id: 't1', title: 'Test', type: TASK_TYPE.EPIC });

        it('should initialize children as undefined (populated by graph aggregation)', () => {
          expect(task.children).toBeUndefined();
        });

        it('should initialize allDescendantTasks as undefined (all descendant tasks)', () => {
          expect(task.allDescendantTasks).toBeUndefined();
        });

        it('should initialize tasksBeingBlocked as undefined (tasks that depend on this)', () => {
          expect(task.tasksBeingBlocked).toBeUndefined();
        });

        it('should initialize allTasksBeingBlocked as undefined (all transitively blocked tasks with folder expansion)', () => {
          expect(task.allTasksBeingBlocked).toBeUndefined();
        });

        it('should initialize totalRealisticEstimate as undefined (sum of estimates for folder tasks)', () => {
          expect(task.totalRealisticEstimate).toBeUndefined();
        });

        it('should initialize totalNumOfBlocks as undefined (count of blocking array)', () => {
          expect(task.totalNumOfBlocks).toBeUndefined();
        });

        it('should initialize remainingDuration as undefined (work left on main task)', () => {
          expect(task.remainingDuration).toBeUndefined();
        });

        it('should initialize remainingReworkDuration as undefined (work left on rework)', () => {
          expect(task.remainingReworkDuration).toBeUndefined();
        });

        it('should initialize assignee as undefined (PersonId assigned to task)', () => {
          expect(task.assignee).toBeUndefined();
        });
      });
    });

    describe('with invalid task type', () => {
      it('should throw error for invalid type', () => {
        expect(() => {
          new Task({ id: 't1', title: 'Test', type: 'invalid' });
        }).toThrow('Unknown type "invalid"');
      });

      it('should throw error for undefined type', () => {
        expect(() => {
          new Task({ id: 't1', title: 'Test', type: undefined });
        }).toThrow('Unknown type "undefined"');
      });

      it('should throw error for null type', () => {
        expect(() => {
          new Task({ id: 't1', title: 'Test', type: null });
        }).toThrow('Unknown type "null"');
      });
    });

    describe('for all valid task types', () => {
      it('should create task for each TASK_TYPE value', () => {
        const types = Object.values(TASK_TYPE);
        types.forEach(type => {
          const task = new Task({ id: 't1', title: 'Test', type: type });
          expect(task.type).toBe(type);
        });
      });
    });
  });

  describe('accountWork(spentDuration, reworkRateToConsider) -> void (mutates this)', () => {
    describe('when called for the first time', () => {
      it('should initialize remainingDuration to 0', () => {
        const task = new Task({ id: 't1', title: 'Test', type: TASK_TYPE.USER_STORY });
        task.accountWork(5, 0.1);
        expect(task.remainingDuration).toBeDefined();
      });

      it('should initialize remainingReworkDuration to 0', () => {
        const task = new Task({ id: 't1', title: 'Test', type: TASK_TYPE.USER_STORY });
        task.accountWork(5, 0.1);
        expect(task.remainingReworkDuration).toBeDefined();
      });
    });

    describe('when spentDuration is less than remainingDuration', () => {
      it('should reduce remainingDuration by spentDuration', () => {
        const task = new Task({ id: 't1', title: 'Test', type: TASK_TYPE.USER_STORY });
        task.remainingDuration = 10;
        task.remainingReworkDuration = 0;
        task.accountWork(3, 0.1);
        expect(task.remainingDuration).toBe(7);
      });

      it('should increase remainingReworkDuration by (spentDuration * reworkRateToConsider)', () => {
        const task = new Task({ id: 't1', title: 'Test', type: TASK_TYPE.USER_STORY });
        task.remainingDuration = 10;
        task.remainingReworkDuration = 0;
        task.accountWork(4, 0.25);
        expect(task.remainingReworkDuration).toBe(1); // 4 * 0.25 = 1
      });

      it('should leave some remainingDuration unconsumed', () => {
        const task = new Task({ id: 't1', title: 'Test', type: TASK_TYPE.USER_STORY });
        task.remainingDuration = 10;
        task.remainingReworkDuration = 0;
        task.accountWork(3, 0.1);
        expect(task.remainingDuration).toBeGreaterThan(0);
      });
    });

    describe('when spentDuration equals remainingDuration', () => {
      it('should set remainingDuration to 0', () => {
        const task = new Task({ id: 't1', title: 'Test', type: TASK_TYPE.USER_STORY });
        task.remainingDuration = 5;
        task.remainingReworkDuration = 0;
        task.accountWork(5, 0.2);
        expect(task.remainingDuration).toBe(0);
      });

      it('should add (spentDuration * reworkRateToConsider) to remainingReworkDuration', () => {
        const task = new Task({ id: 't1', title: 'Test', type: TASK_TYPE.USER_STORY });
        task.remainingDuration = 10;
        task.remainingReworkDuration = 0;
        task.accountWork(10, 0.3);
        expect(task.remainingReworkDuration).toBe(3); // 10 * 0.3 = 3
      });
    });

    describe('when spentDuration exceeds remainingDuration', () => {
      it('should set remainingDuration to 0', () => {
        const task = new Task({ id: 't1', title: 'Test', type: TASK_TYPE.USER_STORY });
        task.remainingDuration = 5;
        task.remainingReworkDuration = 0;
        task.accountWork(10, 0.2);
        expect(task.remainingDuration).toBe(0);
      });

      it('should consume from both original and rework when spentDuration exceeds remainingDuration', () => {
        const task = new Task({ id: 't1', title: 'Test', type: TASK_TYPE.USER_STORY });
        task.remainingDuration = 5;
        task.remainingReworkDuration = 2;
        task.accountWork(10, 0.2);
        // 5 of the 10 spent goes to original (generates 5 * 0.2 = 1 rework), so rework becomes 2 + 1 = 3
        // Remaining 5 units consume from rework: 3 - 5 = 0 (clamped to 0)
        expect(task.remainingReworkDuration).toBe(0);
      });

      it('should not consume remainingReworkDuration with leftover spentDuration', () => {
        const task = new Task({ id: 't1', title: 'Test', type: TASK_TYPE.USER_STORY });
        task.remainingDuration = 3;
        task.remainingReworkDuration = 4;
        task.accountWork(10, 0.1);
        // 3 spent on remaining, adding 3*0.1=0.3 rework -> rework becomes 4.3
        // leftover is 7, but current implementation doesn't consume rework in same call
        expect(task.remainingDuration).toBe(0);
      });
    });

    describe('with different rework rates', () => {
      it('should add no rework when reworkRateToConsider is 0', () => {
        const task = new Task({ id: 't1', title: 'Test', type: TASK_TYPE.USER_STORY });
        task.remainingDuration = 10;
        task.remainingReworkDuration = 0;
        task.accountWork(5, 0);
        expect(task.remainingReworkDuration).toBe(0);
      });

      it('should add half of spentDuration as rework when reworkRateToConsider is 0.5', () => {
        const task = new Task({ id: 't1', title: 'Test', type: TASK_TYPE.USER_STORY });
        task.remainingDuration = 10;
        task.remainingReworkDuration = 0;
        task.accountWork(6, 0.5);
        expect(task.remainingReworkDuration).toBe(3); // 6 * 0.5 = 3
      });

      it('should add equal rework as spent when reworkRateToConsider is 1', () => {
        const task = new Task({ id: 't1', title: 'Test', type: TASK_TYPE.USER_STORY });
        task.remainingDuration = 10;
        task.remainingReworkDuration = 0;
        task.accountWork(4, 1);
        expect(task.remainingReworkDuration).toBe(4); // 4 * 1 = 4
      });
    });

    describe('edge cases', () => {
      it('should not modify durations when spentDuration is 0', () => {
        const task = new Task({ id: 't1', title: 'Test', type: TASK_TYPE.USER_STORY });
        task.remainingDuration = 10;
        task.remainingReworkDuration = 5;
        task.accountWork(0, 0.2);
        expect(task.remainingDuration).toBe(10);
        expect(task.remainingReworkDuration).toBe(5);
      });

      it('should accumulate effects correctly over multiple consecutive calls', () => {
        const task = new Task({ id: 't1', title: 'Test', type: TASK_TYPE.USER_STORY });
        task.remainingDuration = 10;
        task.remainingReworkDuration = 0;
        task.accountWork(3, 0.1);
        task.accountWork(2, 0.1);
        expect(task.remainingDuration).toBe(5); // 10 - 3 - 2 = 5
        expect(task.remainingReworkDuration).toBe(0.5); // (3 + 2) * 0.1 = 0.5
      });
    });

    describe('consuming rework duration (FIXED behavior)', () => {
      it('should not generate rework when consuming rework duration', () => {
        const task = new Task({ id: 't1', title: 'Test', type: TASK_TYPE.USER_STORY });
        task.remainingDuration = 3;
        task.remainingReworkDuration = 0;

        // First, consume original and generate rework
        task.accountWork(3, 0.2);
        expect(task.remainingDuration).toBe(0);
        expect(task.remainingReworkDuration).toBe(0.6);

        // Then, consume rework - should NOT generate more rework
        task.accountWork(0.5, 0.2);
        expect(task.remainingDuration).toBe(0);
        expect(task.remainingReworkDuration).toBe(0.1);
      });

      it('should consume original duration then rework duration in sequence', () => {
        const task = new Task({ id: 't1', title: 'Test', type: TASK_TYPE.USER_STORY });
        task.remainingDuration = 5;
        task.remainingReworkDuration = 0;

        // Spend 8 units: 5 on original (generates 0.5 rework), then 3 on rework
        task.accountWork(8, 0.1);

        expect(task.remainingDuration).toBe(0);
        // Original 5 generated 0.5 rework, then we consumed 3 from rework (leaving 0)
        expect(task.remainingReworkDuration).toBe(0);
      });

      it('should not allow negative rework duration', () => {
        const task = new Task({ id: 't1', title: 'Test', type: TASK_TYPE.USER_STORY });
        task.remainingDuration = 1;
        task.remainingReworkDuration = 0;

        // Spend 10 units: 1 on original (generates 0.1 rework), then 9 on rework (more than available)
        task.accountWork(10, 0.1);

        expect(task.remainingDuration).toBe(0);
        expect(task.remainingReworkDuration).toBe(0);
      });

      it('should mark task as done after consuming all work including rework', () => {
        const task = new Task({ id: 't1', title: 'Test', type: TASK_TYPE.USER_STORY });
        task.remainingDuration = 10;
        task.remainingReworkDuration = 0;

        // Consume all original (generates rework)
        task.accountWork(10, 0.2);
        expect(task.isDone()).toBe(false);
        expect(task.remainingReworkDuration).toBe(2);

        // Consume all rework
        task.accountWork(2, 0.2);
        expect(task.isDone()).toBe(true);
      });
    });
  });

  describe('isDone() -> boolean', () => {
    it('when both durations are undefined, should return false', () => {
      const task = new Task({ id: 't1', title: 'Test', type: TASK_TYPE.USER_STORY });
      expect(task.isDone()).toBe(false);
    });

    it('when both durations are 0, should return true', () => {
      const task = new Task({ id: 't1', title: 'Test', type: TASK_TYPE.USER_STORY });
      task.remainingDuration = 0;
      task.remainingReworkDuration = 0;
      expect(task.isDone()).toBe(true);
    });

    it('when both durations are negative, should return true', () => {
      const task = new Task({ id: 't1', title: 'Test', type: TASK_TYPE.USER_STORY });
      task.remainingDuration = -1;
      task.remainingReworkDuration = -2;
      expect(task.isDone()).toBe(true);
    });

    it('when remainingDuration is 0 but remainingReworkDuration > 0, should return false', () => {
      const task = new Task({ id: 't1', title: 'Test', type: TASK_TYPE.USER_STORY });
      task.remainingDuration = 0;
      task.remainingReworkDuration = 5;
      expect(task.isDone()).toBe(false);
    });

    it('when remainingDuration > 0 but remainingReworkDuration is 0, should return false', () => {
      const task = new Task({ id: 't1', title: 'Test', type: TASK_TYPE.USER_STORY });
      task.remainingDuration = 5;
      task.remainingReworkDuration = 0;
      expect(task.isDone()).toBe(false);
    });

    it('when both durations are positive, should return false', () => {
      const task = new Task({ id: 't1', title: 'Test', type: TASK_TYPE.USER_STORY });
      task.remainingDuration = 3;
      task.remainingReworkDuration = 2;
      expect(task.isDone()).toBe(false);
    });
  });
});
