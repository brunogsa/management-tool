import { computeTotalEstimateForTask, agreggateTotalNumOfBlocks } from '../../../../src/utils/graph.js';
import { Task, TASK_TYPE } from '../../../../src/models.js';

describe('computeTotalEstimateForTask(task, taskMap) -> void (mutates task.totalRealisticEstimate)', () => {
  describe('for non-folder tasks', () => {
    it('should return immediately without setting totalRealisticEstimate', () => {
      const task = new Task({ id: 't1', title: 'Story', type: TASK_TYPE.USER_STORY });
      task.mostProbableEstimateInRange = 5;
      const taskMap = new Map([['t1', task]]);

      computeTotalEstimateForTask(task, taskMap);

      expect(task.totalRealisticEstimate).toBeUndefined();
    });

    it('should leave totalRealisticEstimate as undefined', () => {
      const task = new Task({ id: 't1', title: 'Bug', type: TASK_TYPE.BUG });
      task.children = [];
      const taskMap = new Map([['t1', task]]);

      computeTotalEstimateForTask(task, taskMap);

      expect(task.totalRealisticEstimate).toBeUndefined();
    });
  });

  describe('when already computed', () => {
    it('should return immediately without recomputing', () => {
      const task = new Task({ id: 't1', title: 'Epic', type: TASK_TYPE.EPIC });
      task.totalRealisticEstimate = 42;
      const taskMap = new Map([['t1', task]]);

      computeTotalEstimateForTask(task, taskMap);

      expect(task.totalRealisticEstimate).toBe(42);
    });

    it('should preserve existing totalRealisticEstimate value', () => {
      const task = new Task({ id: 't1', title: 'Project', type: TASK_TYPE.PROJECT });
      task.totalRealisticEstimate = 100;
      const taskMap = new Map([['t1', task]]);

      computeTotalEstimateForTask(task, taskMap);

      expect(task.totalRealisticEstimate).toBe(100);
    });
  });

  describe('for PROJECT type', () => {
    it('should sum totalRealisticEstimate of all MILESTONE children', () => {
      const project = new Task({ id: 'proj', title: 'Project', type: TASK_TYPE.PROJECT });
      const m1 = new Task({ id: 'm1', title: 'M1', type: TASK_TYPE.MILESTONE });
      const m2 = new Task({ id: 'm2', title: 'M2', type: TASK_TYPE.MILESTONE });

      project.children = ['m1', 'm2'];
      project.mostProbableEstimateInRange = 1;
      m1.totalRealisticEstimate = 10;
      m2.totalRealisticEstimate = 20;

      const taskMap = new Map([
        ['proj', project],
        ['m1', m1],
        ['m2', m2]
      ]);

      computeTotalEstimateForTask(project, taskMap);

      expect(project.totalRealisticEstimate).toBe(31); // 1 + 10 + 20
    });

    it('should recursively compute then sum totalRealisticEstimate of all EPIC children', () => {
      const project = new Task({ id: 'proj', title: 'Project', type: TASK_TYPE.PROJECT });
      const epic = new Task({ id: 'epic', title: 'Epic', type: TASK_TYPE.EPIC });
      const story = new Task({ id: 'story', title: 'Story', type: TASK_TYPE.USER_STORY });

      project.children = ['epic'];
      epic.children = ['story'];
      project.mostProbableEstimateInRange = 1;
      epic.mostProbableEstimateInRange = 2;
      story.mostProbableEstimateInRange = 5;

      const taskMap = new Map([
        ['proj', project],
        ['epic', epic],
        ['story', story]
      ]);

      computeTotalEstimateForTask(project, taskMap);

      expect(epic.totalRealisticEstimate).toBe(7); // 2 + 5
      expect(project.totalRealisticEstimate).toBe(8); // 1 + 7
    });

    it('should sum estimates of mixed MILESTONE and EPIC children', () => {
      const project = new Task({ id: 'proj', title: 'Project', type: TASK_TYPE.PROJECT });
      const milestone = new Task({ id: 'm', title: 'M', type: TASK_TYPE.MILESTONE });
      const epic = new Task({ id: 'e', title: 'E', type: TASK_TYPE.EPIC });

      project.children = ['m', 'e'];
      project.mostProbableEstimateInRange = 1;
      milestone.mostProbableEstimateInRange = 2;
      milestone.children = [];
      epic.mostProbableEstimateInRange = 3;
      epic.children = [];

      const taskMap = new Map([
        ['proj', project],
        ['m', milestone],
        ['e', epic]
      ]);

      computeTotalEstimateForTask(project, taskMap);

      expect(milestone.totalRealisticEstimate).toBe(2);
      expect(epic.totalRealisticEstimate).toBe(3);
      expect(project.totalRealisticEstimate).toBe(6); // 1 + 2 + 3
    });

    it('should include own mostProbableEstimateInRange in total', () => {
      const project = new Task({ id: 'proj', title: 'Project', type: TASK_TYPE.PROJECT });
      project.children = [];
      project.mostProbableEstimateInRange = 10;

      const taskMap = new Map([['proj', project]]);

      computeTotalEstimateForTask(project, taskMap);

      expect(project.totalRealisticEstimate).toBe(10);
    });

    it('should recursively trigger computation of children estimates', () => {
      const project = new Task({ id: 'proj', title: 'P', type: TASK_TYPE.PROJECT });
      const milestone = new Task({ id: 'm', title: 'M', type: TASK_TYPE.MILESTONE });
      const epic = new Task({ id: 'e', title: 'E', type: TASK_TYPE.EPIC });

      project.children = ['m'];
      milestone.children = ['e'];
      epic.children = [];

      project.mostProbableEstimateInRange = 1;
      milestone.mostProbableEstimateInRange = 2;
      epic.mostProbableEstimateInRange = 3;

      const taskMap = new Map([['proj', project], ['m', milestone], ['e', epic]]);

      computeTotalEstimateForTask(project, taskMap);

      expect(epic.totalRealisticEstimate).toBe(3);
      expect(milestone.totalRealisticEstimate).toBe(5); // 2 + 3
      expect(project.totalRealisticEstimate).toBe(6); // 1 + 5
    });
  });

  describe('for MILESTONE type', () => {
    it('should recursively compute then sum totalRealisticEstimate of EPIC children', () => {
      const milestone = new Task({ id: 'm', title: 'M', type: TASK_TYPE.MILESTONE });
      const epic = new Task({ id: 'e', title: 'E', type: TASK_TYPE.EPIC });

      milestone.children = ['e'];
      milestone.mostProbableEstimateInRange = 2;
      epic.mostProbableEstimateInRange = 5;
      epic.children = [];

      const taskMap = new Map([['m', milestone], ['e', epic]]);

      computeTotalEstimateForTask(milestone, taskMap);

      expect(epic.totalRealisticEstimate).toBe(5);
      expect(milestone.totalRealisticEstimate).toBe(7); // 2 + 5
    });

    it('should sum mostProbableEstimateInRange of non-epic children', () => {
      const milestone = new Task({ id: 'm', title: 'M', type: TASK_TYPE.MILESTONE });
      const story = new Task({ id: 's', title: 'S', type: TASK_TYPE.USER_STORY });

      milestone.children = ['s'];
      milestone.mostProbableEstimateInRange = 1;
      story.mostProbableEstimateInRange = 3;

      const taskMap = new Map([['m', milestone], ['s', story]]);

      computeTotalEstimateForTask(milestone, taskMap);

      expect(milestone.totalRealisticEstimate).toBe(4); // 1 + 3
    });

    it('should include own mostProbableEstimateInRange in total', () => {
      const milestone = new Task({ id: 'm', title: 'M', type: TASK_TYPE.MILESTONE });
      milestone.children = [];
      milestone.mostProbableEstimateInRange = 7;

      const taskMap = new Map([['m', milestone]]);

      computeTotalEstimateForTask(milestone, taskMap);

      expect(milestone.totalRealisticEstimate).toBe(7);
    });

    it('should recursively trigger computation of epic children estimates', () => {
      const milestone = new Task({ id: 'm', title: 'M', type: TASK_TYPE.MILESTONE });
      const epic = new Task({ id: 'e', title: 'E', type: TASK_TYPE.EPIC });
      const story = new Task({ id: 's', title: 'S', type: TASK_TYPE.USER_STORY });

      milestone.children = ['e'];
      epic.children = ['s'];
      milestone.mostProbableEstimateInRange = 1;
      epic.mostProbableEstimateInRange = 2;
      story.mostProbableEstimateInRange = 3;

      const taskMap = new Map([['m', milestone], ['e', epic], ['s', story]]);

      computeTotalEstimateForTask(milestone, taskMap);

      expect(epic.totalRealisticEstimate).toBe(5); // 2 + 3
      expect(milestone.totalRealisticEstimate).toBe(6); // 1 + 5
    });
  });

  describe('for EPIC type', () => {
    it('should sum mostProbableEstimateInRange of all children', () => {
      const epic = new Task({ id: 'e', title: 'E', type: TASK_TYPE.EPIC });
      const s1 = new Task({ id: 's1', title: 'S1', type: TASK_TYPE.USER_STORY });
      const s2 = new Task({ id: 's2', title: 'S2', type: TASK_TYPE.USER_STORY });

      epic.children = ['s1', 's2'];
      epic.mostProbableEstimateInRange = 1;
      s1.mostProbableEstimateInRange = 3;
      s2.mostProbableEstimateInRange = 5;

      const taskMap = new Map([['e', epic], ['s1', s1], ['s2', s2]]);

      computeTotalEstimateForTask(epic, taskMap);

      expect(epic.totalRealisticEstimate).toBe(9); // 1 + 3 + 5
    });

    it('should include own mostProbableEstimateInRange in total', () => {
      const epic = new Task({ id: 'e', title: 'E', type: TASK_TYPE.EPIC });
      epic.children = [];
      epic.mostProbableEstimateInRange = 8;

      const taskMap = new Map([['e', epic]]);

      computeTotalEstimateForTask(epic, taskMap);

      expect(epic.totalRealisticEstimate).toBe(8);
    });

    it('should set totalRealisticEstimate to own estimate when children is empty', () => {
      const epic = new Task({ id: 'e', title: 'E', type: TASK_TYPE.EPIC });
      epic.children = [];
      epic.mostProbableEstimateInRange = 13;

      const taskMap = new Map([['e', epic]]);

      computeTotalEstimateForTask(epic, taskMap);

      expect(epic.totalRealisticEstimate).toBe(13);
    });
  });

  describe('edge cases', () => {
    it('should set totalRealisticEstimate to own estimate when children array is empty', () => {
      const epic = new Task({ id: 'e', title: 'E', type: TASK_TYPE.EPIC });
      epic.children = [];
      epic.mostProbableEstimateInRange = 21;

      const taskMap = new Map([['e', epic]]);

      computeTotalEstimateForTask(epic, taskMap);

      expect(epic.totalRealisticEstimate).toBe(21);
    });
  });
});

describe('agreggateTotalNumOfBlocks(task, taskMap) -> void (mutates task.blocking and task.totalNumOfBlocks)', () => {
  describe('when task blocks nothing', () => {
    it('should set blocking to empty array', () => {
      const task = new Task({ id: 't1', title: 'T1', type: TASK_TYPE.USER_STORY });
      task.cummulativeTasksBeingBlocked = [];
      const taskMap = new Map([['t1', task]]);

      agreggateTotalNumOfBlocks(task, taskMap);

      expect(task.blocking).toEqual([]);
    });

    it('should set totalNumOfBlocks to 0', () => {
      const task = new Task({ id: 't1', title: 'T1', type: TASK_TYPE.USER_STORY });
      task.cummulativeTasksBeingBlocked = [];
      const taskMap = new Map([['t1', task]]);

      agreggateTotalNumOfBlocks(task, taskMap);

      expect(task.totalNumOfBlocks).toBe(0);
    });
  });

  describe('when task blocks leaf tasks', () => {
    it('should set blocking to array of blocked task IDs', () => {
      const blocker = new Task({ id: 'blocker', title: 'Blocker', type: TASK_TYPE.USER_STORY });
      const b1 = new Task({ id: 'b1', title: 'B1', type: TASK_TYPE.USER_STORY });
      const b2 = new Task({ id: 'b2', title: 'B2', type: TASK_TYPE.BUG });

      blocker.cummulativeTasksBeingBlocked = ['b1', 'b2'];

      const taskMap = new Map([
        ['blocker', blocker],
        ['b1', b1],
        ['b2', b2]
      ]);

      agreggateTotalNumOfBlocks(blocker, taskMap);

      expect(blocker.blocking).toEqual(expect.arrayContaining(['b1', 'b2']));
    });

    it('should set totalNumOfBlocks to count of blocked tasks', () => {
      const blocker = new Task({ id: 'blocker', title: 'Blocker', type: TASK_TYPE.USER_STORY });
      const b1 = new Task({ id: 'b1', title: 'B1', type: TASK_TYPE.USER_STORY });
      const b2 = new Task({ id: 'b2', title: 'B2', type: TASK_TYPE.USER_STORY });

      blocker.cummulativeTasksBeingBlocked = ['b1', 'b2'];

      const taskMap = new Map([
        ['blocker', blocker],
        ['b1', b1],
        ['b2', b2]
      ]);

      agreggateTotalNumOfBlocks(blocker, taskMap);

      expect(blocker.totalNumOfBlocks).toBe(2);
    });
  });

  describe('when task blocks folder tasks', () => {
    it('should expand folder to include all cummulativeChildTasks', () => {
      const blocker = new Task({ id: 'blocker', title: 'Blocker', type: TASK_TYPE.USER_STORY });
      const epic = new Task({ id: 'epic', title: 'Epic', type: TASK_TYPE.EPIC });
      epic.cummulativeChildTasks = ['s1', 's2'];

      blocker.cummulativeTasksBeingBlocked = ['epic'];

      const taskMap = new Map([
        ['blocker', blocker],
        ['epic', epic]
      ]);

      agreggateTotalNumOfBlocks(blocker, taskMap);

      expect(blocker.blocking).toEqual(expect.arrayContaining(['epic', 's1', 's2']));
    });

    it('should include both folder ID and all its children IDs in blocking array', () => {
      const blocker = new Task({ id: 'blocker', title: 'Blocker', type: TASK_TYPE.USER_STORY });
      const milestone = new Task({ id: 'milestone', title: 'M', type: TASK_TYPE.MILESTONE });
      milestone.cummulativeChildTasks = ['e1', 'e2', 's1'];

      blocker.cummulativeTasksBeingBlocked = ['milestone'];

      const taskMap = new Map([
        ['blocker', blocker],
        ['milestone', milestone]
      ]);

      agreggateTotalNumOfBlocks(blocker, taskMap);

      expect(blocker.blocking).toContain('milestone');
      expect(blocker.blocking).toContain('e1');
      expect(blocker.blocking).toContain('e2');
      expect(blocker.blocking).toContain('s1');
    });

    it('should set totalNumOfBlocks to count of all expanded tasks', () => {
      const blocker = new Task({ id: 'blocker', title: 'Blocker', type: TASK_TYPE.USER_STORY });
      const epic = new Task({ id: 'epic', title: 'Epic', type: TASK_TYPE.EPIC });
      epic.cummulativeChildTasks = ['s1', 's2', 's3'];

      blocker.cummulativeTasksBeingBlocked = ['epic'];

      const taskMap = new Map([
        ['blocker', blocker],
        ['epic', epic]
      ]);

      agreggateTotalNumOfBlocks(blocker, taskMap);

      expect(blocker.totalNumOfBlocks).toBe(4); // epic + s1 + s2 + s3
    });
  });

  describe('with mixed blocking', () => {
    it('should combine both leaf and expanded folder tasks in blocking array', () => {
      const blocker = new Task({ id: 'blocker', title: 'Blocker', type: TASK_TYPE.USER_STORY });
      const leaf = new Task({ id: 'leaf', title: 'Leaf', type: TASK_TYPE.BUG });
      const epic = new Task({ id: 'epic', title: 'Epic', type: TASK_TYPE.EPIC });
      epic.cummulativeChildTasks = ['s1', 's2'];

      blocker.cummulativeTasksBeingBlocked = ['leaf', 'epic'];

      const taskMap = new Map([
        ['blocker', blocker],
        ['leaf', leaf],
        ['epic', epic]
      ]);

      agreggateTotalNumOfBlocks(blocker, taskMap);

      expect(blocker.blocking).toEqual(expect.arrayContaining(['leaf', 'epic', 's1', 's2']));
    });

    it('should deduplicate IDs using Set before converting to array', () => {
      const blocker = new Task({ id: 'blocker', title: 'Blocker', type: TASK_TYPE.USER_STORY });
      const epic1 = new Task({ id: 'e1', title: 'E1', type: TASK_TYPE.EPIC });
      const epic2 = new Task({ id: 'e2', title: 'E2', type: TASK_TYPE.EPIC });
      epic1.cummulativeChildTasks = ['s1'];
      epic2.cummulativeChildTasks = ['s1']; // Same child

      blocker.cummulativeTasksBeingBlocked = ['e1', 'e2'];

      const taskMap = new Map([
        ['blocker', blocker],
        ['e1', epic1],
        ['e2', epic2]
      ]);

      agreggateTotalNumOfBlocks(blocker, taskMap);

      // s1 should only appear once
      const s1Count = blocker.blocking.filter(id => id === 's1').length;
      expect(s1Count).toBe(1);
    });

    it('should set totalNumOfBlocks to accurate count after deduplication', () => {
      const blocker = new Task({ id: 'blocker', title: 'Blocker', type: TASK_TYPE.USER_STORY });
      const epic1 = new Task({ id: 'e1', title: 'E1', type: TASK_TYPE.EPIC });
      const epic2 = new Task({ id: 'e2', title: 'E2', type: TASK_TYPE.EPIC });
      epic1.cummulativeChildTasks = ['s1'];
      epic2.cummulativeChildTasks = ['s1'];

      blocker.cummulativeTasksBeingBlocked = ['e1', 'e2'];

      const taskMap = new Map([
        ['blocker', blocker],
        ['e1', epic1],
        ['e2', epic2]
      ]);

      agreggateTotalNumOfBlocks(blocker, taskMap);

      // Should be: e1, e2, s1 (deduplicated) = 3
      expect(blocker.totalNumOfBlocks).toBe(3);
    });
  });
});
