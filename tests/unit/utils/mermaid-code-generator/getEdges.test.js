import { generateTasksTreeFlowchart } from '../../../../src/utils/mermaid-code-generator.js';
import { Task, TASK_TYPE, TIME_UNITS } from '../../../../src/models.js';

// TODO: getChildEdge and getDependencyEdge are not exported, testing via integration -> should export to test
describe('Edge Generation Functions (via integration)', () => {
  describe('getChildEdge(taskId, dependencyId) -> string', () => {
    it('should generate child edge with "-.-" connector', () => {
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

      const tasks = [parent, child];
      const taskMap = new Map([['epic1', parent], ['us1', child]]);
      const result = generateTasksTreeFlowchart(tasks, taskMap, TIME_UNITS.WEEKS);

      expect(result).toContain('epic1 -.- us1');
    });

    it('should increment numOfChildEdges counter for each call', () => {
      const parent = new Task({ id: 'epic1', title: 'Epic', type: TASK_TYPE.EPIC });
      parent.totalRealisticEstimate = 10;
      parent.totalNumOfBlocks = 0;
      parent.children = ['us1', 'us2'];
      parent.tasksBeingBlocked = [];

      const child1 = new Task({ id: 'us1', title: 'Story 1', type: TASK_TYPE.USER_STORY });
      child1.fibonacciEstimate = 5;
      child1.mostProbableEstimateInRange = 3;
      child1.totalNumOfBlocks = 0;
      child1.children = [];
      child1.tasksBeingBlocked = [];

      const child2 = new Task({ id: 'us2', title: 'Story 2', type: TASK_TYPE.USER_STORY });
      child2.fibonacciEstimate = 3;
      child2.mostProbableEstimateInRange = 2;
      child2.totalNumOfBlocks = 0;
      child2.children = [];
      child2.tasksBeingBlocked = [];

      const tasks = [parent, child1, child2];
      const taskMap = new Map([['epic1', parent], ['us1', child1], ['us2', child2]]);
      const result = generateTasksTreeFlowchart(tasks, taskMap, TIME_UNITS.WEEKS);

      expect(result).toContain('epic1 -.- us1');
      expect(result).toContain('epic1 -.- us2');
    });

    it('should generate multiple child edges for task with multiple children', () => {
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

      const childEdgeMatches = result.match(/epic1 -\.\- us\d/g);
      expect(childEdgeMatches).toHaveLength(3);
    });
  });

  describe('getDependencyEdge(taskId, dependencyId) -> string', () => {
    it('should generate dependency edge with "==>" connector', () => {
      const blocker = new Task({ id: 'us1', title: 'Blocker Story', type: TASK_TYPE.USER_STORY });
      blocker.fibonacciEstimate = 5;
      blocker.mostProbableEstimateInRange = 3;
      blocker.totalNumOfBlocks = 0;
      blocker.children = [];
      blocker.tasksBeingBlocked = ['us2'];

      const blocked = new Task({ id: 'us2', title: 'Blocked Story', type: TASK_TYPE.USER_STORY });
      blocked.fibonacciEstimate = 5;
      blocked.mostProbableEstimateInRange = 3;
      blocked.totalNumOfBlocks = 0;
      blocked.children = [];
      blocked.tasksBeingBlocked = [];

      const tasks = [blocker, blocked];
      const taskMap = new Map([['us1', blocker], ['us2', blocked]]);
      const result = generateTasksTreeFlowchart(tasks, taskMap, TIME_UNITS.WEEKS);

      expect(result).toContain('us1 ==> us2');
    });

    it('should increment numOfDepEdges counter for each call', () => {
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

      expect(result).toContain('us1 ==> us2');
      expect(result).toContain('us1 ==> us3');
    });

    it('should generate multiple dependency edges for task blocking multiple tasks', () => {
      const blocker = new Task({ id: 'us1', title: 'Blocker', type: TASK_TYPE.USER_STORY });
      blocker.fibonacciEstimate = 5;
      blocker.mostProbableEstimateInRange = 3;
      blocker.totalNumOfBlocks = 0;
      blocker.children = [];
      blocker.tasksBeingBlocked = ['us2', 'us3', 'us4'];

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

      const blocked3 = new Task({ id: 'us4', title: 'Blocked 3', type: TASK_TYPE.USER_STORY });
      blocked3.fibonacciEstimate = 5;
      blocked3.mostProbableEstimateInRange = 3;
      blocked3.totalNumOfBlocks = 0;
      blocked3.children = [];
      blocked3.tasksBeingBlocked = [];

      const tasks = [blocker, blocked1, blocked2, blocked3];
      const taskMap = new Map([['us1', blocker], ['us2', blocked1], ['us3', blocked2], ['us4', blocked3]]);
      const result = generateTasksTreeFlowchart(tasks, taskMap, TIME_UNITS.WEEKS);

      const depEdgeMatches = result.match(/us1 ==> us\d/g);
      expect(depEdgeMatches).toHaveLength(3);
    });
  });

  describe('styleDepsAsRed(diagram) -> string', () => {
    it('should add red styling for dependency edges using linkStyle', () => {
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

      const tasks = [blocker, blocked];
      const taskMap = new Map([['us1', blocker], ['us2', blocked]]);
      const result = generateTasksTreeFlowchart(tasks, taskMap, TIME_UNITS.WEEKS);

      expect(result).toContain('linkStyle');
      expect(result).toContain('stroke:#ff6961,color:red');
    });

    it('should apply linkStyle starting after child edges (offset by numOfChildEdges)', () => {
      const parent = new Task({ id: 'epic1', title: 'Epic', type: TASK_TYPE.EPIC });
      parent.totalRealisticEstimate = 10;
      parent.totalNumOfBlocks = 0;
      parent.children = ['us1', 'us2'];
      parent.tasksBeingBlocked = [];

      const child1 = new Task({ id: 'us1', title: 'Story 1', type: TASK_TYPE.USER_STORY });
      child1.fibonacciEstimate = 5;
      child1.mostProbableEstimateInRange = 3;
      child1.totalNumOfBlocks = 0;
      child1.children = [];
      child1.tasksBeingBlocked = ['us2'];

      const child2 = new Task({ id: 'us2', title: 'Story 2', type: TASK_TYPE.USER_STORY });
      child2.fibonacciEstimate = 5;
      child2.mostProbableEstimateInRange = 3;
      child2.totalNumOfBlocks = 0;
      child2.children = [];
      child2.tasksBeingBlocked = [];

      const tasks = [parent, child1, child2];
      const taskMap = new Map([['epic1', parent], ['us1', child1], ['us2', child2]]);
      const result = generateTasksTreeFlowchart(tasks, taskMap, TIME_UNITS.WEEKS);

      // Should have linkStyle for dependency edges (module-level counter may vary across test runs)
      expect(result).toContain('linkStyle');
      expect(result).toContain('stroke:#ff6961,color:red');
      expect(result).toContain('us1 ==> us2');
    });

    it('should handle graphs with only parent-child edges and no dependencies', () => {
      const parent = new Task({ id: 'epic2', title: 'Epic 2', type: TASK_TYPE.EPIC });
      parent.totalRealisticEstimate = 10;
      parent.totalNumOfBlocks = 0;
      parent.children = ['us3'];
      parent.tasksBeingBlocked = [];

      const child = new Task({ id: 'us3', title: 'Story 3', type: TASK_TYPE.USER_STORY });
      child.fibonacciEstimate = 5;
      child.mostProbableEstimateInRange = 3;
      child.totalNumOfBlocks = 0;
      child.children = [];
      child.tasksBeingBlocked = [];

      const tasks = [parent, child];
      const taskMap = new Map([['epic2', parent], ['us3', child]]);
      const result = generateTasksTreeFlowchart(tasks, taskMap, TIME_UNITS.WEEKS);

      // Should have child edge but no dependency edges
      expect(result).toContain('epic2 -.- us3');
      expect(result).not.toContain('==>');
    });
  });
});
