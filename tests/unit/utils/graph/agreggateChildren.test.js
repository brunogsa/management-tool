import {
  _buildAllDescendantsFromChildren,
  _buildChildrenFromParentProps,
  getTaskMap
} from '../../../../src/utils/graph.js';
import { Task, TASK_TYPE } from '../../../../src/models.js';

describe('_buildAllDescendantsFromChildren(task, taskMap) -> void (mutates task.allDescendantTasks)', () => {
  describe('with no children', () => {
    it('should set allDescendantTasks to empty array', () => {
      const task = new Task({ id: 't1', title: 'Task 1', type: TASK_TYPE.USER_STORY });
      task.children = [];
      const taskMap = new Map([[task.id, task]]);

      _buildAllDescendantsFromChildren(task, taskMap);

      expect(task.allDescendantTasks).toEqual([]);
    });
  });

  describe('with direct children only', () => {
    it('should set allDescendantTasks to array containing all direct children IDs', () => {
      const parent = new Task({ id: 'parent', title: 'Parent', type: TASK_TYPE.EPIC });
      const child1 = new Task({ id: 'c1', title: 'Child 1', type: TASK_TYPE.USER_STORY });
      const child2 = new Task({ id: 'c2', title: 'Child 2', type: TASK_TYPE.USER_STORY });

      parent.children = ['c1', 'c2'];
      child1.children = [];
      child2.children = [];

      const taskMap = new Map([
        ['parent', parent],
        ['c1', child1],
        ['c2', child2]
      ]);

      _buildAllDescendantsFromChildren(parent, taskMap);

      expect(parent.allDescendantTasks).toEqual(expect.arrayContaining(['c1', 'c2']));
      expect(parent.allDescendantTasks.length).toBe(2);
    });

    it('should convert internal Set to Array', () => {
      const task = new Task({ id: 't1', title: 'Test', type: TASK_TYPE.EPIC });
      const child = new Task({ id: 'c1', title: 'Child', type: TASK_TYPE.USER_STORY });

      task.children = ['c1'];
      child.children = [];

      const taskMap = new Map([['t1', task], ['c1', child]]);

      _buildAllDescendantsFromChildren(task, taskMap);

      expect(Array.isArray(task.allDescendantTasks)).toBe(true);
    });
  });

  describe('with nested children', () => {
    it('should include grandchildren in allDescendantTasks', () => {
      const grandparent = new Task({ id: 'gp', title: 'GP', type: TASK_TYPE.PROJECT });
      const parent = new Task({ id: 'p', title: 'P', type: TASK_TYPE.EPIC });
      const child = new Task({ id: 'c', title: 'C', type: TASK_TYPE.USER_STORY });

      grandparent.children = ['p'];
      parent.children = ['c'];
      child.children = [];

      const taskMap = new Map([
        ['gp', grandparent],
        ['p', parent],
        ['c', child]
      ]);

      _buildAllDescendantsFromChildren(grandparent, taskMap);

      expect(grandparent.allDescendantTasks).toEqual(expect.arrayContaining(['p', 'c']));
    });

    it('should include all descendants recursively in allDescendantTasks', () => {
      const root = new Task({ id: 'root', title: 'Root', type: TASK_TYPE.PROJECT });
      const l1 = new Task({ id: 'l1', title: 'L1', type: TASK_TYPE.MILESTONE });
      const l2a = new Task({ id: 'l2a', title: 'L2A', type: TASK_TYPE.EPIC });
      const l2b = new Task({ id: 'l2b', title: 'L2B', type: TASK_TYPE.EPIC });
      const l3 = new Task({ id: 'l3', title: 'L3', type: TASK_TYPE.USER_STORY });

      root.children = ['l1'];
      l1.children = ['l2a', 'l2b'];
      l2a.children = ['l3'];
      l2b.children = [];
      l3.children = [];

      const taskMap = new Map([
        ['root', root],
        ['l1', l1],
        ['l2a', l2a],
        ['l2b', l2b],
        ['l3', l3]
      ]);

      _buildAllDescendantsFromChildren(root, taskMap);

      expect(root.allDescendantTasks).toEqual(expect.arrayContaining(['l1', 'l2a', 'l2b', 'l3']));
      expect(root.allDescendantTasks.length).toBe(4);
    });

    it('should traverse and aggregate multiple levels of nesting', () => {
      const tasks = [
        new Task({ id: 'level0', title: 'L0', type: TASK_TYPE.PROJECT }),
        new Task({ id: 'level1', title: 'L1', type: TASK_TYPE.MILESTONE }),
        new Task({ id: 'level2', title: 'L2', type: TASK_TYPE.EPIC }),
        new Task({ id: 'level3', title: 'L3', type: TASK_TYPE.USER_STORY })
      ];

      tasks[0].children = ['level1'];
      tasks[1].children = ['level2'];
      tasks[2].children = ['level3'];
      tasks[3].children = [];

      const taskMap = getTaskMap(tasks);
      _buildAllDescendantsFromChildren(tasks[0], taskMap);

      expect(tasks[0].allDescendantTasks.length).toBe(3);
    });
  });

  describe('optimization', () => {
    it('should return immediately if allDescendantTasks already computed', () => {
      const task = new Task({ id: 't1', title: 'Test', type: TASK_TYPE.EPIC });
      task.children = ['c1'];
      task.allDescendantTasks = ['existing'];

      const taskMap = new Map([['t1', task]]);

      _buildAllDescendantsFromChildren(task, taskMap);

      expect(task.allDescendantTasks).toEqual(['existing']);
    });

    it('should not recompute allDescendantTasks on subsequent calls', () => {
      const task = new Task({ id: 't1', title: 'Test', type: TASK_TYPE.EPIC });
      const child = new Task({ id: 'c1', title: 'Child', type: TASK_TYPE.USER_STORY });

      task.children = ['c1'];
      child.children = [];

      const taskMap = new Map([['t1', task], ['c1', child]]);

      _buildAllDescendantsFromChildren(task, taskMap);
      const firstResult = task.allDescendantTasks;

      _buildAllDescendantsFromChildren(task, taskMap);
      const secondResult = task.allDescendantTasks;

      expect(firstResult).toBe(secondResult);
    });
  });

  describe('error cases', () => {
    it('should throw error or handle gracefully when child ID missing in taskMap', () => {
      const task = new Task({ id: 't1', title: 'Test', type: TASK_TYPE.EPIC });
      task.children = ['missing'];

      const taskMap = new Map([['t1', task]]);

      expect(() => {
        _buildAllDescendantsFromChildren(task, taskMap);
      }).toThrow();
    });
  });
});

describe('_buildChildrenFromParentProps(tasks, taskMap) -> void (mutates tasks array and task objects)', () => {
  it('should populate children array by inverting parent relationships', () => {
    const parent = new Task({ id: 'parent', title: 'Parent', type: TASK_TYPE.EPIC });
    const child = new Task({ id: 'child', title: 'Child', type: TASK_TYPE.USER_STORY });
    child.parents = ['parent'];

    const tasks = [parent, child];
    const taskMap = getTaskMap(tasks);

    _buildChildrenFromParentProps(tasks, taskMap);

    expect(parent.children).toEqual(['child']);
  });

  it('should complete successfully with empty tasks array', () => {
    const tasks = [];
    const taskMap = new Map();

    expect(() => {
      _buildChildrenFromParentProps(tasks, taskMap);
    }).not.toThrow();
  });

  it('should leave children empty for single task with no parents', () => {
    const task = new Task({ id: 't1', title: 'Test', type: TASK_TYPE.USER_STORY });
    const tasks = [task];
    const taskMap = getTaskMap(tasks);

    _buildChildrenFromParentProps(tasks, taskMap);

    expect(task.children).toEqual([]);
  });

  it('should add task ID to parent.children when task has parents', () => {
    const epic = new Task({ id: 'epic', title: 'Epic', type: TASK_TYPE.EPIC });
    const story1 = new Task({ id: 's1', title: 'Story 1', type: TASK_TYPE.USER_STORY });
    const story2 = new Task({ id: 's2', title: 'Story 2', type: TASK_TYPE.USER_STORY });

    story1.parents = ['epic'];
    story2.parents = ['epic'];

    const tasks = [epic, story1, story2];
    const taskMap = getTaskMap(tasks);

    _buildChildrenFromParentProps(tasks, taskMap);

    expect(epic.children).toEqual(expect.arrayContaining(['s1', 's2']));
    expect(epic.children.length).toBe(2);
  });

  it('should add same child to multiple parents when task has multiple parents', () => {
    const parent1 = new Task({ id: 'p1', title: 'Parent 1', type: TASK_TYPE.EPIC });
    const parent2 = new Task({ id: 'p2', title: 'Parent 2', type: TASK_TYPE.EPIC });
    const child = new Task({ id: 'child', title: 'Child', type: TASK_TYPE.USER_STORY });

    child.parents = ['p1', 'p2'];

    const tasks = [parent1, parent2, child];
    const taskMap = getTaskMap(tasks);

    _buildChildrenFromParentProps(tasks, taskMap);

    expect(parent1.children).toContain('child');
    expect(parent2.children).toContain('child');
  });

  it('should allow same child to appear in multiple parents.children arrays', () => {
    const p1 = new Task({ id: 'p1', title: 'P1', type: TASK_TYPE.MILESTONE });
    const p2 = new Task({ id: 'p2', title: 'P2', type: TASK_TYPE.MILESTONE });
    const shared = new Task({ id: 'shared', title: 'Shared', type: TASK_TYPE.EPIC });

    shared.parents = ['p1', 'p2'];

    const tasks = [p1, p2, shared];
    const taskMap = getTaskMap(tasks);

    _buildChildrenFromParentProps(tasks, taskMap);

    expect(p1.children).toEqual(['shared']);
    expect(p2.children).toEqual(['shared']);
  });

  it('should call _buildAllDescendantsFromChildren for each task', () => {
    const parent = new Task({ id: 'parent', title: 'Parent', type: TASK_TYPE.EPIC });
    const child = new Task({ id: 'child', title: 'Child', type: TASK_TYPE.USER_STORY });
    child.parents = ['parent'];

    const tasks = [parent, child];
    const taskMap = getTaskMap(tasks);

    _buildChildrenFromParentProps(tasks, taskMap);

    expect(parent.allDescendantTasks).toBeDefined();
    expect(child.allDescendantTasks).toBeDefined();
  });

  it('should populate both children and allDescendantTasks for all tasks', () => {
    const milestone = new Task({ id: 'milestone', title: 'M', type: TASK_TYPE.MILESTONE });
    const epic = new Task({ id: 'epic', title: 'E', type: TASK_TYPE.EPIC });
    const story = new Task({ id: 'story', title: 'S', type: TASK_TYPE.USER_STORY });

    epic.parents = ['milestone'];
    story.parents = ['epic'];

    const tasks = [milestone, epic, story];
    const taskMap = getTaskMap(tasks);

    _buildChildrenFromParentProps(tasks, taskMap);

    expect(milestone.children).toEqual(['epic']);
    expect(milestone.allDescendantTasks).toEqual(expect.arrayContaining(['epic', 'story']));
    expect(epic.children).toEqual(['story']);
    expect(epic.allDescendantTasks).toEqual(['story']);
  });
});
