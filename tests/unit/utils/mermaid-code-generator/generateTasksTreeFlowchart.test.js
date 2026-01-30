import { generateTasksTreeFlowchart } from '../../../../src/utils/mermaid-code-generator.js';
import { Task, TASK_TYPE, TIME_UNITS } from '../../../../src/models.js';

describe('generateTasksTreeFlowchart(tasks, taskMap, timeAndEstimateUnit) -> string', () => {
  describe('flowchart structure', () => {
    it('should generate flowchart with "flowchart LR" header', () => {
      const task = new Task({ id: 'us1', title: 'Story', type: TASK_TYPE.USER_STORY });
      task.fibonacciEstimate = 5;
      task.mostProbableEstimateInRange = 3;
      task.totalNumOfBlocks = 0;
      task.children = [];
      task.tasksBeingBlocked = [];

      const result = generateTasksTreeFlowchart([task], new Map([['us1', task]]), TIME_UNITS.WEEKS);

      expect(result).toContain('flowchart LR');
    });

    it('should generate empty flowchart for empty tasks array', () => {
      const result = generateTasksTreeFlowchart([], new Map(), TIME_UNITS.WEEKS);

      expect(result).toContain('flowchart LR');
      expect(result.trim().endsWith('flowchart LR')).toBe(true);
    });

    it('should generate flowchart with single task node', () => {
      const task = new Task({ id: 'us1', title: 'Story', type: TASK_TYPE.USER_STORY });
      task.fibonacciEstimate = 5;
      task.mostProbableEstimateInRange = 3;
      task.totalNumOfBlocks = 0;
      task.children = [];
      task.tasksBeingBlocked = [];

      const result = generateTasksTreeFlowchart([task], new Map([['us1', task]]), TIME_UNITS.WEEKS);

      expect(result).toContain('us1(');
      expect(result).toContain('Story');
    });
  });

  describe('node generation', () => {
    it('should generate nodes for all tasks in array', () => {
      const task1 = new Task({ id: 'us1', title: 'Story 1', type: TASK_TYPE.USER_STORY });
      task1.fibonacciEstimate = 5;
      task1.mostProbableEstimateInRange = 3;
      task1.totalNumOfBlocks = 0;
      task1.children = [];
      task1.tasksBeingBlocked = [];

      const task2 = new Task({ id: 'us2', title: 'Story 2', type: TASK_TYPE.USER_STORY });
      task2.fibonacciEstimate = 3;
      task2.mostProbableEstimateInRange = 2;
      task2.totalNumOfBlocks = 0;
      task2.children = [];
      task2.tasksBeingBlocked = [];

      const task3 = new Task({ id: 'us3', title: 'Story 3', type: TASK_TYPE.USER_STORY });
      task3.fibonacciEstimate = 8;
      task3.mostProbableEstimateInRange = 5;
      task3.totalNumOfBlocks = 0;
      task3.children = [];
      task3.tasksBeingBlocked = [];

      const tasks = [task1, task2, task3];
      const taskMap = new Map([['us1', task1], ['us2', task2], ['us3', task3]]);
      const result = generateTasksTreeFlowchart(tasks, taskMap, TIME_UNITS.WEEKS);

      expect(result).toContain('us1(');
      expect(result).toContain('Story 1');
      expect(result).toContain('us2(');
      expect(result).toContain('Story 2');
      expect(result).toContain('us3(');
      expect(result).toContain('Story 3');
    });

    it('should generate nodes with proper indentation', () => {
      const task = new Task({ id: 'us1', title: 'Story', type: TASK_TYPE.USER_STORY });
      task.fibonacciEstimate = 5;
      task.mostProbableEstimateInRange = 3;
      task.totalNumOfBlocks = 0;
      task.children = [];
      task.tasksBeingBlocked = [];

      const result = generateTasksTreeFlowchart([task], new Map([['us1', task]]), TIME_UNITS.WEEKS);

      // Check for indentation (2 spaces)
      expect(result).toContain('  us1(');
    });

    it('should separate nodes with blank lines', () => {
      const task1 = new Task({ id: 'us1', title: 'Story 1', type: TASK_TYPE.USER_STORY });
      task1.fibonacciEstimate = 5;
      task1.mostProbableEstimateInRange = 3;
      task1.totalNumOfBlocks = 0;
      task1.children = [];
      task1.tasksBeingBlocked = [];

      const task2 = new Task({ id: 'us2', title: 'Story 2', type: TASK_TYPE.USER_STORY });
      task2.fibonacciEstimate = 3;
      task2.mostProbableEstimateInRange = 2;
      task2.totalNumOfBlocks = 0;
      task2.children = [];
      task2.tasksBeingBlocked = [];

      const result = generateTasksTreeFlowchart([task1, task2], new Map([['us1', task1], ['us2', task2]]), TIME_UNITS.WEEKS);

      // Nodes should be separated with double newlines
      expect(result).toMatch(/\n\n/);
    });
  });

  describe('edge generation for parent-child relationships', () => {
    it('should generate child edges for tasks with children', () => {
      const parent = new Task({ id: 'epic1', title: 'Epic', type: TASK_TYPE.EPIC });
      parent.totalRealisticEstimate = 10;
      parent.totalNumOfBlocks = 0;
      parent.children = ['us1'];
      parent.tasksBeingBlocked = [];

      const child = new Task({ id: 'us1', title: 'Story', type: TASK_TYPE.USER_STORY });
      child.fibonacciEstimate = 5;
      child.mostProbableEstimateInRange = 3;
      child.totalNumOfBlocks = 0;
      child.children = [];
      child.tasksBeingBlocked = [];

      const result = generateTasksTreeFlowchart([parent, child], new Map([['epic1', parent], ['us1', child]]), TIME_UNITS.WEEKS);

      expect(result).toContain('epic1 -.- us1');
    });

    it('should generate multiple child edges when task has multiple children', () => {
      const parent = new Task({ id: 'epic1', title: 'Epic', type: TASK_TYPE.EPIC });
      parent.totalRealisticEstimate = 15;
      parent.totalNumOfBlocks = 0;
      parent.children = ['us1', 'us2', 'us3'];
      parent.tasksBeingBlocked = [];

      const child1 = new Task({ id: 'us1', title: 'Story 1', type: TASK_TYPE.USER_STORY });
      child1.fibonacciEstimate = 5;
      child1.mostProbableEstimateInRange = 3;
      child1.totalNumOfBlocks = 0;
      child1.children = [];
      child1.tasksBeingBlocked = [];

      const child2 = new Task({ id: 'us2', title: 'Story 2', type: TASK_TYPE.USER_STORY });
      child2.fibonacciEstimate = 5;
      child2.mostProbableEstimateInRange = 3;
      child2.totalNumOfBlocks = 0;
      child2.children = [];
      child2.tasksBeingBlocked = [];

      const child3 = new Task({ id: 'us3', title: 'Story 3', type: TASK_TYPE.USER_STORY });
      child3.fibonacciEstimate = 5;
      child3.mostProbableEstimateInRange = 3;
      child3.totalNumOfBlocks = 0;
      child3.children = [];
      child3.tasksBeingBlocked = [];

      const tasks = [parent, child1, child2, child3];
      const taskMap = new Map([['epic1', parent], ['us1', child1], ['us2', child2], ['us3', child3]]);
      const result = generateTasksTreeFlowchart(tasks, taskMap, TIME_UNITS.WEEKS);

      expect(result).toContain('epic1 -.- us1');
      expect(result).toContain('epic1 -.- us2');
      expect(result).toContain('epic1 -.- us3');
    });

    it('should not generate child edges for tasks without children', () => {
      const task = new Task({ id: 'us1', title: 'Story', type: TASK_TYPE.USER_STORY });
      task.fibonacciEstimate = 5;
      task.mostProbableEstimateInRange = 3;
      task.totalNumOfBlocks = 0;
      task.children = [];
      task.tasksBeingBlocked = [];

      const result = generateTasksTreeFlowchart([task], new Map([['us1', task]]), TIME_UNITS.WEEKS);

      expect(result).not.toContain('-.-');
    });
  });

  describe('edge generation for blocking relationships', () => {
    it('should generate dependency edges for tasks blocking other tasks', () => {
      const blocker = new Task({ id: 'us1', title: 'Blocker', type: TASK_TYPE.USER_STORY });
      blocker.fibonacciEstimate = 5;
      blocker.mostProbableEstimateInRange = 3;
      blocker.totalNumOfBlocks = 0;
      blocker.children = [];
      blocker.tasksBeingBlocked = ['us2'];

      const blocked = new Task({ id: 'us2', title: 'Blocked', type: TASK_TYPE.USER_STORY });
      blocked.fibonacciEstimate = 5;
      blocked.mostProbableEstimateInRange = 3;
      blocked.totalNumOfBlocks = 0;
      blocked.children = [];
      blocked.tasksBeingBlocked = [];

      const result = generateTasksTreeFlowchart([blocker, blocked], new Map([['us1', blocker], ['us2', blocked]]), TIME_UNITS.WEEKS);

      expect(result).toContain('us1 ==>|blocks| us2');
    });

    it('should generate multiple dependency edges when task blocks multiple tasks', () => {
      const blocker = new Task({ id: 'us1', title: 'Blocker', type: TASK_TYPE.USER_STORY });
      blocker.fibonacciEstimate = 5;
      blocker.mostProbableEstimateInRange = 3;
      blocker.totalNumOfBlocks = 0;
      blocker.children = [];
      blocker.tasksBeingBlocked = ['us2', 'us3'];

      const blocked1 = new Task({ id: 'us2', title: 'Blocked 1', type: TASK_TYPE.USER_STORY });
      blocked1.fibonacciEstimate = 5;
      blocked1.mostProbableEstimateInRange = 3;
      blocked1.totalNumOfBlocks = 0;
      blocked1.children = [];
      blocked1.tasksBeingBlocked = [];

      const blocked2 = new Task({ id: 'us3', title: 'Blocked 2', type: TASK_TYPE.USER_STORY });
      blocked2.fibonacciEstimate = 5;
      blocked2.mostProbableEstimateInRange = 3;
      blocked2.totalNumOfBlocks = 0;
      blocked2.children = [];
      blocked2.tasksBeingBlocked = [];

      const tasks = [blocker, blocked1, blocked2];
      const taskMap = new Map([['us1', blocker], ['us2', blocked1], ['us3', blocked2]]);
      const result = generateTasksTreeFlowchart(tasks, taskMap, TIME_UNITS.WEEKS);

      expect(result).toContain('us1 ==>|blocks| us2');
      expect(result).toContain('us1 ==>|blocks| us3');
    });

    it('should style dependency edges as red using linkStyle', () => {
      const blocker = new Task({ id: 'us1', title: 'Blocker', type: TASK_TYPE.USER_STORY });
      blocker.fibonacciEstimate = 5;
      blocker.mostProbableEstimateInRange = 3;
      blocker.totalNumOfBlocks = 0;
      blocker.children = [];
      blocker.tasksBeingBlocked = ['us2'];

      const blocked = new Task({ id: 'us2', title: 'Blocked', type: TASK_TYPE.USER_STORY });
      blocked.fibonacciEstimate = 5;
      blocked.mostProbableEstimateInRange = 3;
      blocked.totalNumOfBlocks = 0;
      blocked.children = [];
      blocked.tasksBeingBlocked = [];

      const result = generateTasksTreeFlowchart([blocker, blocked], new Map([['us1', blocker], ['us2', blocked]]), TIME_UNITS.WEEKS);

      expect(result).toContain('linkStyle');
      expect(result).toContain('stroke:#ff6961,color:red');
    });
  });

  describe('complete flowchart integration', () => {
    it('should generate complete flowchart with nodes, child edges, dependency edges, and styling', () => {
      const project = new Task({ id: 'proj1', title: 'Project', type: TASK_TYPE.PROJECT });
      project.totalRealisticEstimate = 30;
      project.totalNumOfBlocks = 0;
      project.children = ['epic1'];
      project.tasksBeingBlocked = [];

      const epic = new Task({ id: 'epic1', title: 'Epic', type: TASK_TYPE.EPIC });
      epic.totalRealisticEstimate = 15;
      epic.totalNumOfBlocks = 2;
      epic.children = ['us1', 'us2'];
      epic.tasksBeingBlocked = [];

      const story1 = new Task({ id: 'us1', title: 'Story 1', type: TASK_TYPE.USER_STORY });
      story1.fibonacciEstimate = 5;
      story1.mostProbableEstimateInRange = 3;
      story1.totalNumOfBlocks = 0;
      story1.children = [];
      story1.tasksBeingBlocked = ['us2'];

      const story2 = new Task({ id: 'us2', title: 'Story 2', type: TASK_TYPE.USER_STORY });
      story2.fibonacciEstimate = 5;
      story2.mostProbableEstimateInRange = 3;
      story2.totalNumOfBlocks = 0;
      story2.children = [];
      story2.tasksBeingBlocked = [];

      const tasks = [project, epic, story1, story2];
      const taskMap = new Map([['proj1', project], ['epic1', epic], ['us1', story1], ['us2', story2]]);
      const result = generateTasksTreeFlowchart(tasks, taskMap, TIME_UNITS.WEEKS);

      // Verify flowchart header
      expect(result).toContain('flowchart LR');

      // Verify all nodes are present
      expect(result).toContain('proj1>');
      expect(result).toContain('epic1[[');
      expect(result).toContain('us1(');
      expect(result).toContain('us2(');

      // Verify child edges
      expect(result).toContain('proj1 -.- epic1');
      expect(result).toContain('epic1 -.- us1');
      expect(result).toContain('epic1 -.- us2');

      // Verify dependency edge
      expect(result).toContain('us1 ==>|blocks| us2');

      // Verify styling
      expect(result).toContain('linkStyle');
      expect(result).toContain('stroke:#ff6961,color:red');

      // Verify block count display
      expect(result).toContain('Blocks: 2');
    });
  });
});
