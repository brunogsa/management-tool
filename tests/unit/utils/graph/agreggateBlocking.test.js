import {
  _agreggateAllTasksYouBlock,
  _agreggateTasksYouDirectlyBlock,
  getTaskMap
} from '../../../../src/utils/graph.js';
import { Task, TASK_TYPE } from '../../../../src/models.js';

describe('_agreggateAllTasksYouBlock(task, taskMap) -> void (mutates task.cummulativeTasksBeingBlocked)', () => {
  describe('when task blocks nothing', () => {
    it('should set cummulativeTasksBeingBlocked to empty array', () => {
      const task = new Task({ id: 't1', title: 'Task 1', type: TASK_TYPE.USER_STORY });
      task.tasksBeingBlocked = [];
      const taskMap = new Map([[task.id, task]]);

      _agreggateAllTasksYouBlock(task, taskMap);

      expect(task.cummulativeTasksBeingBlocked).toEqual([]);
    });
  });

  describe('when task blocks other tasks', () => {
    it('should include all directly blocked task IDs in cummulativeTasksBeingBlocked', () => {
      const blocker = new Task({ id: 'blocker', title: 'Blocker', type: TASK_TYPE.USER_STORY });
      const blocked1 = new Task({ id: 'b1', title: 'Blocked 1', type: TASK_TYPE.USER_STORY });
      const blocked2 = new Task({ id: 'b2', title: 'Blocked 2', type: TASK_TYPE.USER_STORY });

      blocker.tasksBeingBlocked = ['b1', 'b2'];
      blocked1.tasksBeingBlocked = [];
      blocked2.tasksBeingBlocked = [];

      const taskMap = new Map([
        ['blocker', blocker],
        ['b1', blocked1],
        ['b2', blocked2]
      ]);

      _agreggateAllTasksYouBlock(blocker, taskMap);

      expect(blocker.cummulativeTasksBeingBlocked).toEqual(expect.arrayContaining(['b1', 'b2']));
      expect(blocker.cummulativeTasksBeingBlocked.length).toBe(2);
    });

    it('should include all transitively blocked task IDs', () => {
      const t1 = new Task({ id: 't1', title: 'T1', type: TASK_TYPE.USER_STORY });
      const t2 = new Task({ id: 't2', title: 'T2', type: TASK_TYPE.USER_STORY });
      const t3 = new Task({ id: 't3', title: 'T3', type: TASK_TYPE.USER_STORY });

      t1.tasksBeingBlocked = ['t2'];
      t2.tasksBeingBlocked = ['t3'];
      t3.tasksBeingBlocked = [];

      const taskMap = new Map([
        ['t1', t1],
        ['t2', t2],
        ['t3', t3]
      ]);

      _agreggateAllTasksYouBlock(t1, taskMap);

      expect(t1.cummulativeTasksBeingBlocked).toEqual(expect.arrayContaining(['t2', 't3']));
    });

    it('should traverse and aggregate multiple levels of blocking relationships', () => {
      const root = new Task({ id: 'root', title: 'Root', type: TASK_TYPE.USER_STORY });
      const l1 = new Task({ id: 'l1', title: 'L1', type: TASK_TYPE.USER_STORY });
      const l2a = new Task({ id: 'l2a', title: 'L2A', type: TASK_TYPE.USER_STORY });
      const l2b = new Task({ id: 'l2b', title: 'L2B', type: TASK_TYPE.USER_STORY });

      root.tasksBeingBlocked = ['l1'];
      l1.tasksBeingBlocked = ['l2a', 'l2b'];
      l2a.tasksBeingBlocked = [];
      l2b.tasksBeingBlocked = [];

      const taskMap = new Map([
        ['root', root],
        ['l1', l1],
        ['l2a', l2a],
        ['l2b', l2b]
      ]);

      _agreggateAllTasksYouBlock(root, taskMap);

      expect(root.cummulativeTasksBeingBlocked).toEqual(expect.arrayContaining(['l1', 'l2a', 'l2b']));
      expect(root.cummulativeTasksBeingBlocked.length).toBe(3);
    });
  });

  describe('optimization', () => {
    it('should return immediately if cummulativeTasksBeingBlocked already computed', () => {
      const task = new Task({ id: 't1', title: 'Test', type: TASK_TYPE.USER_STORY });
      task.tasksBeingBlocked = ['b1'];
      task.cummulativeTasksBeingBlocked = ['existing'];

      const taskMap = new Map([['t1', task]]);

      _agreggateAllTasksYouBlock(task, taskMap);

      expect(task.cummulativeTasksBeingBlocked).toEqual(['existing']);
    });
  });
});

describe('_agreggateTasksYouDirectlyBlock(tasks, taskMap) -> void (mutates tasks array and task objects)', () => {
  it('should populate tasksBeingBlocked by inverting dependsOnTasks relationships', () => {
    const dependency = new Task({ id: 'dep', title: 'Dependency', type: TASK_TYPE.USER_STORY });
    const dependent = new Task({ id: 'dependent', title: 'Dependent', type: TASK_TYPE.USER_STORY });
    dependent.dependsOnTasks = ['dep'];

    const tasks = [dependency, dependent];
    const taskMap = getTaskMap(tasks);

    _agreggateTasksYouDirectlyBlock(tasks, taskMap);

    expect(dependency.tasksBeingBlocked).toEqual(['dependent']);
  });

  it('should complete successfully with empty tasks array', () => {
    const tasks = [];
    const taskMap = new Map();

    expect(() => {
      _agreggateTasksYouDirectlyBlock(tasks, taskMap);
    }).not.toThrow();
  });

  it('should leave tasksBeingBlocked empty when no dependencies exist', () => {
    const task = new Task({ id: 't1', title: 'Test', type: TASK_TYPE.USER_STORY });
    const tasks = [task];
    const taskMap = getTaskMap(tasks);

    _agreggateTasksYouDirectlyBlock(tasks, taskMap);

    expect(task.tasksBeingBlocked).toEqual([]);
  });

  it('should add dependent task ID to dependency.tasksBeingBlocked', () => {
    const dep = new Task({ id: 'dep', title: 'Dep', type: TASK_TYPE.USER_STORY });
    const t1 = new Task({ id: 't1', title: 'T1', type: TASK_TYPE.USER_STORY });
    const t2 = new Task({ id: 't2', title: 'T2', type: TASK_TYPE.USER_STORY });

    t1.dependsOnTasks = ['dep'];
    t2.dependsOnTasks = ['dep'];

    const tasks = [dep, t1, t2];
    const taskMap = getTaskMap(tasks);

    _agreggateTasksYouDirectlyBlock(tasks, taskMap);

    expect(dep.tasksBeingBlocked).toEqual(expect.arrayContaining(['t1', 't2']));
    expect(dep.tasksBeingBlocked.length).toBe(2);
  });

  it('should allow task to block multiple other tasks', () => {
    const blocker = new Task({ id: 'blocker', title: 'Blocker', type: TASK_TYPE.USER_STORY });
    const blocked1 = new Task({ id: 'b1', title: 'B1', type: TASK_TYPE.USER_STORY });
    const blocked2 = new Task({ id: 'b2', title: 'B2', type: TASK_TYPE.USER_STORY });
    const blocked3 = new Task({ id: 'b3', title: 'B3', type: TASK_TYPE.USER_STORY });

    blocked1.dependsOnTasks = ['blocker'];
    blocked2.dependsOnTasks = ['blocker'];
    blocked3.dependsOnTasks = ['blocker'];

    const tasks = [blocker, blocked1, blocked2, blocked3];
    const taskMap = getTaskMap(tasks);

    _agreggateTasksYouDirectlyBlock(tasks, taskMap);

    expect(blocker.tasksBeingBlocked.length).toBe(3);
  });

  it('should call _agreggateAllTasksYouBlock for each task', () => {
    const t1 = new Task({ id: 't1', title: 'T1', type: TASK_TYPE.USER_STORY });
    const t2 = new Task({ id: 't2', title: 'T2', type: TASK_TYPE.USER_STORY });
    t2.dependsOnTasks = ['t1'];

    const tasks = [t1, t2];
    const taskMap = getTaskMap(tasks);

    _agreggateTasksYouDirectlyBlock(tasks, taskMap);

    expect(t1.cummulativeTasksBeingBlocked).toBeDefined();
    expect(t2.cummulativeTasksBeingBlocked).toBeDefined();
  });

  it('should populate both tasksBeingBlocked and cummulativeTasksBeingBlocked', () => {
    const t1 = new Task({ id: 't1', title: 'T1', type: TASK_TYPE.USER_STORY });
    const t2 = new Task({ id: 't2', title: 'T2', type: TASK_TYPE.USER_STORY });
    const t3 = new Task({ id: 't3', title: 'T3', type: TASK_TYPE.USER_STORY });

    t2.dependsOnTasks = ['t1'];
    t3.dependsOnTasks = ['t2'];

    const tasks = [t1, t2, t3];
    const taskMap = getTaskMap(tasks);

    _agreggateTasksYouDirectlyBlock(tasks, taskMap);

    expect(t1.tasksBeingBlocked).toEqual(['t2']);
    expect(t1.cummulativeTasksBeingBlocked).toEqual(expect.arrayContaining(['t2', 't3']));
    expect(t2.tasksBeingBlocked).toEqual(['t3']);
    expect(t2.cummulativeTasksBeingBlocked).toEqual(['t3']);
  });
});
