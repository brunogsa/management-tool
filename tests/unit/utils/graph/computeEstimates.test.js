import { _computeTotalEstimateForTask } from '../../../../src/utils/graph.js';
import { Task, TASK_TYPE } from '../../../../src/models.js';

describe('_computeTotalEstimateForTask(task, taskMap) -> void (mutates task.totalRealisticEstimate)', () => {
  describe('for non-folder tasks', () => {
    it('should return immediately without setting totalRealisticEstimate', () => {
      const task = new Task({ id: 't1', title: 'Story', type: TASK_TYPE.USER_STORY });
      task.mostProbableEstimateInRange = 5;
      const taskMap = new Map([['t1', task]]);

      _computeTotalEstimateForTask(task, taskMap);

      expect(task.totalRealisticEstimate).toBeUndefined();
    });

    it('should leave totalRealisticEstimate as undefined', () => {
      const task = new Task({ id: 't1', title: 'Bug', type: TASK_TYPE.BUG });
      task.children = [];
      const taskMap = new Map([['t1', task]]);

      _computeTotalEstimateForTask(task, taskMap);

      expect(task.totalRealisticEstimate).toBeUndefined();
    });
  });

  describe('when already computed', () => {
    it('should return immediately without recomputing', () => {
      const task = new Task({ id: 't1', title: 'Epic', type: TASK_TYPE.EPIC });
      task.totalRealisticEstimate = 42;
      const taskMap = new Map([['t1', task]]);

      _computeTotalEstimateForTask(task, taskMap);

      expect(task.totalRealisticEstimate).toBe(42);
    });

    it('should preserve existing totalRealisticEstimate value', () => {
      const task = new Task({ id: 't1', title: 'Project', type: TASK_TYPE.PROJECT });
      task.totalRealisticEstimate = 100;
      const taskMap = new Map([['t1', task]]);

      _computeTotalEstimateForTask(task, taskMap);

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

      _computeTotalEstimateForTask(project, taskMap);

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

      _computeTotalEstimateForTask(project, taskMap);

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

      _computeTotalEstimateForTask(project, taskMap);

      expect(milestone.totalRealisticEstimate).toBe(2);
      expect(epic.totalRealisticEstimate).toBe(3);
      expect(project.totalRealisticEstimate).toBe(6); // 1 + 2 + 3
    });

    it('should include own mostProbableEstimateInRange in total', () => {
      const project = new Task({ id: 'proj', title: 'Project', type: TASK_TYPE.PROJECT });
      project.children = [];
      project.mostProbableEstimateInRange = 10;

      const taskMap = new Map([['proj', project]]);

      _computeTotalEstimateForTask(project, taskMap);

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

      _computeTotalEstimateForTask(project, taskMap);

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

      _computeTotalEstimateForTask(milestone, taskMap);

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

      _computeTotalEstimateForTask(milestone, taskMap);

      expect(milestone.totalRealisticEstimate).toBe(4); // 1 + 3
    });

    it('should include own mostProbableEstimateInRange in total', () => {
      const milestone = new Task({ id: 'm', title: 'M', type: TASK_TYPE.MILESTONE });
      milestone.children = [];
      milestone.mostProbableEstimateInRange = 7;

      const taskMap = new Map([['m', milestone]]);

      _computeTotalEstimateForTask(milestone, taskMap);

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

      _computeTotalEstimateForTask(milestone, taskMap);

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

      _computeTotalEstimateForTask(epic, taskMap);

      expect(epic.totalRealisticEstimate).toBe(9); // 1 + 3 + 5
    });

    it('should include own mostProbableEstimateInRange in total', () => {
      const epic = new Task({ id: 'e', title: 'E', type: TASK_TYPE.EPIC });
      epic.children = [];
      epic.mostProbableEstimateInRange = 8;

      const taskMap = new Map([['e', epic]]);

      _computeTotalEstimateForTask(epic, taskMap);

      expect(epic.totalRealisticEstimate).toBe(8);
    });

    it('should set totalRealisticEstimate to own estimate when children is empty', () => {
      const epic = new Task({ id: 'e', title: 'E', type: TASK_TYPE.EPIC });
      epic.children = [];
      epic.mostProbableEstimateInRange = 13;

      const taskMap = new Map([['e', epic]]);

      _computeTotalEstimateForTask(epic, taskMap);

      expect(epic.totalRealisticEstimate).toBe(13);
    });
  });

  describe('edge cases', () => {
    it('should set totalRealisticEstimate to own estimate when children array is empty', () => {
      const epic = new Task({ id: 'e', title: 'E', type: TASK_TYPE.EPIC });
      epic.children = [];
      epic.mostProbableEstimateInRange = 21;

      const taskMap = new Map([['e', epic]]);

      _computeTotalEstimateForTask(epic, taskMap);

      expect(epic.totalRealisticEstimate).toBe(21);
    });
  });
});
