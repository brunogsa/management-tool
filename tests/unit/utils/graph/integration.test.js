import {
  agreggateInfosByExploringTasksGraph,
  getTaskMap
} from '../../../../src/utils/graph.js';
import { Task, TASK_TYPE } from '../../../../src/models.js';

describe('agreggateInfosByExploringTasksGraph(tasks, taskMap) -> void (mutates tasks)', () => {
  it('should call agreggateChildrenTasks with tasks and taskMap', () => {
    const task = new Task({ id: 't1', title: 'Test', type: TASK_TYPE.USER_STORY });
    const tasks = [task];
    const taskMap = getTaskMap(tasks);

    agreggateInfosByExploringTasksGraph(tasks, taskMap);

    expect(task.children).toBeDefined();
  });

  it('should call agreggateTasksYouDirectlyBlock with tasks and taskMap', () => {
    const task = new Task({ id: 't1', title: 'Test', type: TASK_TYPE.USER_STORY });
    const tasks = [task];
    const taskMap = getTaskMap(tasks);

    agreggateInfosByExploringTasksGraph(tasks, taskMap);

    expect(task.tasksBeingBlocked).toBeDefined();
  });

  it('should call computeTotalEstimateForTask for each task', () => {
    const epic = new Task({ id: 'epic', title: 'Epic', type: TASK_TYPE.EPIC });
    epic.mostProbableEstimateInRange = 5;
    const tasks = [epic];
    const taskMap = getTaskMap(tasks);

    agreggateInfosByExploringTasksGraph(tasks, taskMap);

    expect(epic.totalRealisticEstimate).toBeDefined();
  });

  it('should call agreggateTotalNumOfBlocks for each task', () => {
    const task = new Task({ id: 't1', title: 'Test', type: TASK_TYPE.USER_STORY });
    const tasks = [task];
    const taskMap = getTaskMap(tasks);

    agreggateInfosByExploringTasksGraph(tasks, taskMap);

    expect(task.blocking).toBeDefined();
    expect(task.totalNumOfBlocks).toBeDefined();
  });

  it('should execute functions in correct order (children, blocking, then estimates and blocks)', () => {
    const project = new Task({ id: 'proj', title: 'Project', type: TASK_TYPE.PROJECT });
    const epic = new Task({ id: 'epic', title: 'Epic', type: TASK_TYPE.EPIC });
    const story = new Task({ id: 'story', title: 'Story', type: TASK_TYPE.USER_STORY });

    epic.parents = ['proj'];
    story.parents = ['epic'];
    story.dependsOnTasks = [];

    project.mostProbableEstimateInRange = 1;
    epic.mostProbableEstimateInRange = 2;
    story.mostProbableEstimateInRange = 3;

    const tasks = [project, epic, story];
    const taskMap = getTaskMap(tasks);

    agreggateInfosByExploringTasksGraph(tasks, taskMap);

    // Verify all aggregations happened
    expect(project.children).toEqual(['epic']);
    expect(epic.children).toEqual(['story']);
    expect(project.cummulativeChildTasks).toEqual(expect.arrayContaining(['epic', 'story']));
    expect(project.totalRealisticEstimate).toBe(6); // 1 + 2 + 3
  });

  describe('with empty tasks', () => {
    it('should complete successfully without errors', () => {
      const tasks = [];
      const taskMap = new Map();

      expect(() => {
        agreggateInfosByExploringTasksGraph(tasks, taskMap);
      }).not.toThrow();
    });
  });

  describe('with simple linear dependency', () => {
    it('should populate all children, blocking, estimate, and block count properties', () => {
      const t1 = new Task({ id: 't1', title: 'T1', type: TASK_TYPE.USER_STORY });
      const t2 = new Task({ id: 't2', title: 'T2', type: TASK_TYPE.USER_STORY });
      const t3 = new Task({ id: 't3', title: 'T3', type: TASK_TYPE.USER_STORY });

      t2.dependsOnTasks = ['t1'];
      t3.dependsOnTasks = ['t2'];

      t1.mostProbableEstimateInRange = 1;
      t2.mostProbableEstimateInRange = 2;
      t3.mostProbableEstimateInRange = 3;

      const tasks = [t1, t2, t3];
      const taskMap = getTaskMap(tasks);

      agreggateInfosByExploringTasksGraph(tasks, taskMap);

      // Children
      expect(t1.children).toEqual([]);
      expect(t2.children).toEqual([]);
      expect(t3.children).toEqual([]);

      // Blocking
      expect(t1.tasksBeingBlocked).toEqual(['t2']);
      expect(t1.cummulativeTasksBeingBlocked).toEqual(expect.arrayContaining(['t2', 't3']));
      expect(t2.tasksBeingBlocked).toEqual(['t3']);

      // Blocking expansion
      expect(t1.blocking).toEqual(expect.arrayContaining(['t2', 't3']));
      expect(t1.totalNumOfBlocks).toBe(2);
      expect(t2.blocking).toEqual(['t3']);
      expect(t2.totalNumOfBlocks).toBe(1);
    });
  });

  describe('with complex graph', () => {
    it('should correctly aggregate projects containing milestones containing epics', () => {
      const project = new Task({ id: 'proj', title: 'Project', type: TASK_TYPE.PROJECT });
      const milestone = new Task({ id: 'milestone', title: 'Milestone', type: TASK_TYPE.MILESTONE });
      const epic = new Task({ id: 'epic', title: 'Epic', type: TASK_TYPE.EPIC });
      const story = new Task({ id: 'story', title: 'Story', type: TASK_TYPE.USER_STORY });

      milestone.parents = ['proj'];
      epic.parents = ['milestone'];
      story.parents = ['epic'];

      project.mostProbableEstimateInRange = 1;
      milestone.mostProbableEstimateInRange = 2;
      epic.mostProbableEstimateInRange = 3;
      story.mostProbableEstimateInRange = 5;

      const tasks = [project, milestone, epic, story];
      const taskMap = getTaskMap(tasks);

      agreggateInfosByExploringTasksGraph(tasks, taskMap);

      // Verify hierarchical structure
      expect(project.children).toEqual(['milestone']);
      expect(milestone.children).toEqual(['epic']);
      expect(epic.children).toEqual(['story']);

      // Verify cumulative children
      expect(project.cummulativeChildTasks).toEqual(expect.arrayContaining(['milestone', 'epic', 'story']));
      expect(milestone.cummulativeChildTasks).toEqual(expect.arrayContaining(['epic', 'story']));
      expect(epic.cummulativeChildTasks).toEqual(['story']);

      // Verify estimates
      expect(epic.totalRealisticEstimate).toBe(8); // 3 + 5
      expect(milestone.totalRealisticEstimate).toBe(10); // 2 + 8
      expect(project.totalRealisticEstimate).toBe(11); // 1 + 10
    });

    it('should populate children and cummulativeChildTasks for all hierarchy levels', () => {
      const project = new Task({ id: 'proj', title: 'P', type: TASK_TYPE.PROJECT });
      const m1 = new Task({ id: 'm1', title: 'M1', type: TASK_TYPE.MILESTONE });
      const m2 = new Task({ id: 'm2', title: 'M2', type: TASK_TYPE.MILESTONE });
      const e1 = new Task({ id: 'e1', title: 'E1', type: TASK_TYPE.EPIC });
      const e2 = new Task({ id: 'e2', title: 'E2', type: TASK_TYPE.EPIC });

      m1.parents = ['proj'];
      m2.parents = ['proj'];
      e1.parents = ['m1'];
      e2.parents = ['m2'];

      const tasks = [project, m1, m2, e1, e2];
      const taskMap = getTaskMap(tasks);

      agreggateInfosByExploringTasksGraph(tasks, taskMap);

      expect(project.children).toEqual(expect.arrayContaining(['m1', 'm2']));
      expect(project.cummulativeChildTasks).toEqual(expect.arrayContaining(['m1', 'm2', 'e1', 'e2']));
      expect(m1.cummulativeChildTasks).toEqual(['e1']);
      expect(m2.cummulativeChildTasks).toEqual(['e2']);
    });

    it('should populate tasksBeingBlocked and cummulativeTasksBeingBlocked for all dependencies', () => {
      const t1 = new Task({ id: 't1', title: 'T1', type: TASK_TYPE.USER_STORY });
      const t2 = new Task({ id: 't2', title: 'T2', type: TASK_TYPE.USER_STORY });
      const t3 = new Task({ id: 't3', title: 'T3', type: TASK_TYPE.USER_STORY });
      const t4 = new Task({ id: 't4', title: 'T4', type: TASK_TYPE.USER_STORY });

      t2.dependsOnTasks = ['t1'];
      t3.dependsOnTasks = ['t1', 't2'];
      t4.dependsOnTasks = ['t3'];

      const tasks = [t1, t2, t3, t4];
      const taskMap = getTaskMap(tasks);

      agreggateInfosByExploringTasksGraph(tasks, taskMap);

      expect(t1.tasksBeingBlocked).toEqual(expect.arrayContaining(['t2', 't3']));
      expect(t1.cummulativeTasksBeingBlocked.length).toBeGreaterThan(0);
      expect(t2.tasksBeingBlocked).toEqual(['t3']);
      expect(t3.tasksBeingBlocked).toEqual(['t4']);
    });

    it('should compute totalRealisticEstimate for all folder tasks', () => {
      const project = new Task({ id: 'proj', title: 'P', type: TASK_TYPE.PROJECT });
      const milestone = new Task({ id: 'm', title: 'M', type: TASK_TYPE.MILESTONE });
      const epic = new Task({ id: 'e', title: 'E', type: TASK_TYPE.EPIC });

      milestone.parents = ['proj'];
      epic.parents = ['m'];

      project.mostProbableEstimateInRange = 1;
      milestone.mostProbableEstimateInRange = 2;
      epic.mostProbableEstimateInRange = 3;

      const tasks = [project, milestone, epic];
      const taskMap = getTaskMap(tasks);

      agreggateInfosByExploringTasksGraph(tasks, taskMap);

      expect(epic.totalRealisticEstimate).toBe(3);
      expect(milestone.totalRealisticEstimate).toBe(5); // 2 + 3
      expect(project.totalRealisticEstimate).toBe(6); // 1 + 5
    });

    it('should compute blocking and totalNumOfBlocks for all tasks', () => {
      const epic = new Task({ id: 'epic', title: 'Epic', type: TASK_TYPE.EPIC });
      const s1 = new Task({ id: 's1', title: 'S1', type: TASK_TYPE.USER_STORY });
      const s2 = new Task({ id: 's2', title: 'S2', type: TASK_TYPE.USER_STORY });

      s1.parents = ['epic'];
      s2.parents = ['epic'];
      s2.dependsOnTasks = ['s1'];

      const tasks = [epic, s1, s2];
      const taskMap = getTaskMap(tasks);

      agreggateInfosByExploringTasksGraph(tasks, taskMap);

      expect(s1.blocking).toEqual(['s2']);
      expect(s1.totalNumOfBlocks).toBe(1);
      expect(s2.blocking).toEqual([]);
      expect(s2.totalNumOfBlocks).toBe(0);
    });
  });
});
