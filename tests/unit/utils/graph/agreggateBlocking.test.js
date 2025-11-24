import {
  _buildBlockingRelationships,
  getTaskMap
} from '../../../../src/utils/graph.js';
import { Task, TASK_TYPE } from '../../../../src/models.js';

describe('_buildBlockingRelationships(tasks, taskMap) -> void (mutates tasks)', () => {
  describe('when task blocks nothing', () => {
    it('should set tasksBeingBlocked and allTasksBeingBlocked to empty arrays', () => {
      const task = new Task({ id: 't1', title: 'Task 1', type: TASK_TYPE.USER_STORY });
      const tasks = [task];
      const taskMap = getTaskMap(tasks);

      _buildBlockingRelationships(tasks, taskMap);

      expect(task.tasksBeingBlocked).toEqual([]);
      expect(task.allTasksBeingBlocked).toEqual([]);
      expect(task.totalNumOfBlocks).toBe(0);
    });
  });

  describe('direct blocking relationships', () => {
    it('should populate tasksBeingBlocked by inverting dependsOnTasks relationships', () => {
      const dependency = new Task({ id: 'dep', title: 'Dependency', type: TASK_TYPE.USER_STORY });
      const dependent = new Task({ id: 'dependent', title: 'Dependent', type: TASK_TYPE.USER_STORY });
      dependent.dependsOnTasks = ['dep'];

      const tasks = [dependency, dependent];
      const taskMap = getTaskMap(tasks);

      _buildBlockingRelationships(tasks, taskMap);

      expect(dependency.tasksBeingBlocked).toEqual(['dependent']);
      expect(dependency.allTasksBeingBlocked).toEqual(['dependent']);
    });

    it('should handle multiple tasks depending on same dependency', () => {
      const dep = new Task({ id: 'dep', title: 'Dep', type: TASK_TYPE.USER_STORY });
      const t1 = new Task({ id: 't1', title: 'T1', type: TASK_TYPE.USER_STORY });
      const t2 = new Task({ id: 't2', title: 'T2', type: TASK_TYPE.USER_STORY });

      t1.dependsOnTasks = ['dep'];
      t2.dependsOnTasks = ['dep'];

      const tasks = [dep, t1, t2];
      const taskMap = getTaskMap(tasks);

      _buildBlockingRelationships(tasks, taskMap);

      expect(dep.tasksBeingBlocked).toEqual(expect.arrayContaining(['t1', 't2']));
      expect(dep.tasksBeingBlocked.length).toBe(2);
      expect(dep.allTasksBeingBlocked).toEqual(expect.arrayContaining(['t1', 't2']));
      expect(dep.totalNumOfBlocks).toBe(2);
    });
  });

  describe('transitive blocking relationships', () => {
    it('should include all transitively blocked task IDs in allTasksBeingBlocked', () => {
      const t1 = new Task({ id: 't1', title: 'T1', type: TASK_TYPE.USER_STORY });
      const t2 = new Task({ id: 't2', title: 'T2', type: TASK_TYPE.USER_STORY });
      const t3 = new Task({ id: 't3', title: 'T3', type: TASK_TYPE.USER_STORY });

      t2.dependsOnTasks = ['t1'];
      t3.dependsOnTasks = ['t2'];

      const tasks = [t1, t2, t3];
      const taskMap = getTaskMap(tasks);

      _buildBlockingRelationships(tasks, taskMap);

      expect(t1.allTasksBeingBlocked).toEqual(expect.arrayContaining(['t2', 't3']));
      expect(t2.allTasksBeingBlocked).toEqual(['t3']);
    });

    it('should traverse and aggregate multiple levels of blocking', () => {
      const root = new Task({ id: 'root', title: 'Root', type: TASK_TYPE.USER_STORY });
      const l1 = new Task({ id: 'l1', title: 'L1', type: TASK_TYPE.USER_STORY });
      const l2a = new Task({ id: 'l2a', title: 'L2A', type: TASK_TYPE.USER_STORY });
      const l2b = new Task({ id: 'l2b', title: 'L2B', type: TASK_TYPE.USER_STORY });

      l1.dependsOnTasks = ['root'];
      l2a.dependsOnTasks = ['l1'];
      l2b.dependsOnTasks = ['l1'];

      const tasks = [root, l1, l2a, l2b];
      const taskMap = getTaskMap(tasks);

      _buildBlockingRelationships(tasks, taskMap);

      expect(root.allTasksBeingBlocked).toEqual(expect.arrayContaining(['l1', 'l2a', 'l2b']));
      expect(root.allTasksBeingBlocked.length).toBe(3);
      expect(root.totalNumOfBlocks).toBe(3);
    });
  });

  describe('folder expansion in blocking relationships', () => {
    it('should expand blocked Epic to include its children in allTasksBeingBlocked', () => {
      const blocker = new Task({ id: 'blocker', title: 'Blocker', type: TASK_TYPE.USER_STORY });
      const epic = new Task({ id: 'epic', title: 'Epic', type: TASK_TYPE.EPIC });
      const s1 = new Task({ id: 's1', title: 'Story 1', type: TASK_TYPE.USER_STORY });
      const s2 = new Task({ id: 's2', title: 'Story 2', type: TASK_TYPE.USER_STORY });

      epic.dependsOnTasks = ['blocker'];
      s1.parents = ['epic'];
      s2.parents = ['epic'];

      const tasks = [blocker, epic, s1, s2];
      const taskMap = getTaskMap(tasks);

      // Need to populate children and allDescendantTasks first
      epic.children = ['s1', 's2'];
      epic.allDescendantTasks = ['s1', 's2'];

      _buildBlockingRelationships(tasks, taskMap);

      expect(blocker.allTasksBeingBlocked).toEqual(expect.arrayContaining(['epic', 's1', 's2']));
      expect(blocker.totalNumOfBlocks).toBe(3);
    });

    it('should not expand non-folder tasks in allTasksBeingBlocked', () => {
      const blocker = new Task({ id: 'blocker', title: 'Blocker', type: TASK_TYPE.USER_STORY });
      const story = new Task({ id: 'story', title: 'Story', type: TASK_TYPE.USER_STORY });

      story.dependsOnTasks = ['blocker'];

      const tasks = [blocker, story];
      const taskMap = getTaskMap(tasks);

      _buildBlockingRelationships(tasks, taskMap);

      expect(blocker.allTasksBeingBlocked).toEqual(['story']);
      expect(blocker.totalNumOfBlocks).toBe(1);
    });

    it('should expand transitively blocked folders', () => {
      const t1 = new Task({ id: 't1', title: 'T1', type: TASK_TYPE.USER_STORY });
      const t2 = new Task({ id: 't2', title: 'T2', type: TASK_TYPE.USER_STORY });
      const epic = new Task({ id: 'epic', title: 'Epic', type: TASK_TYPE.EPIC });
      const s1 = new Task({ id: 's1', title: 'Story 1', type: TASK_TYPE.USER_STORY });
      const s2 = new Task({ id: 's2', title: 'Story 2', type: TASK_TYPE.USER_STORY });

      t2.dependsOnTasks = ['t1'];
      epic.dependsOnTasks = ['t2'];
      s1.parents = ['epic'];
      s2.parents = ['epic'];

      const tasks = [t1, t2, epic, s1, s2];
      const taskMap = getTaskMap(tasks);

      // Setup folder structure
      epic.children = ['s1', 's2'];
      epic.allDescendantTasks = ['s1', 's2'];

      _buildBlockingRelationships(tasks, taskMap);

      expect(t1.allTasksBeingBlocked).toEqual(expect.arrayContaining(['t2', 'epic', 's1', 's2']));
      expect(t1.totalNumOfBlocks).toBe(4);
    });

    it('should expand blocked Milestone to include its children in allTasksBeingBlocked', () => {
      const blocker = new Task({ id: 'blocker', title: 'Blocker', type: TASK_TYPE.USER_STORY });
      const milestone = new Task({ id: 'milestone', title: 'Milestone', type: TASK_TYPE.MILESTONE });
      const epic1 = new Task({ id: 'e1', title: 'Epic 1', type: TASK_TYPE.EPIC });
      const epic2 = new Task({ id: 'e2', title: 'Epic 2', type: TASK_TYPE.EPIC });
      const s1 = new Task({ id: 's1', title: 'Story 1', type: TASK_TYPE.USER_STORY });

      milestone.dependsOnTasks = ['blocker'];
      epic1.parents = ['milestone'];
      epic2.parents = ['milestone'];
      s1.parents = ['e1'];

      const tasks = [blocker, milestone, epic1, epic2, s1];
      const taskMap = getTaskMap(tasks);

      // Setup folder structure
      milestone.children = ['e1', 'e2'];
      milestone.allDescendantTasks = ['e1', 'e2', 's1'];
      epic1.children = ['s1'];
      epic1.allDescendantTasks = ['s1'];
      epic2.children = [];
      epic2.allDescendantTasks = [];

      _buildBlockingRelationships(tasks, taskMap);

      expect(blocker.allTasksBeingBlocked).toEqual(expect.arrayContaining(['milestone', 'e1', 'e2', 's1']));
      expect(blocker.totalNumOfBlocks).toBe(4);
    });

    it('should expand blocked Project to include all descendants in allTasksBeingBlocked', () => {
      const blocker = new Task({ id: 'blocker', title: 'Blocker', type: TASK_TYPE.USER_STORY });
      const project = new Task({ id: 'project', title: 'Project', type: TASK_TYPE.PROJECT });
      const milestone = new Task({ id: 'm1', title: 'Milestone 1', type: TASK_TYPE.MILESTONE });
      const epic = new Task({ id: 'e1', title: 'Epic 1', type: TASK_TYPE.EPIC });
      const story = new Task({ id: 's1', title: 'Story 1', type: TASK_TYPE.USER_STORY });

      project.dependsOnTasks = ['blocker'];
      milestone.parents = ['project'];
      epic.parents = ['m1'];
      story.parents = ['e1'];

      const tasks = [blocker, project, milestone, epic, story];
      const taskMap = getTaskMap(tasks);

      // Setup folder structure
      project.children = ['m1'];
      project.allDescendantTasks = ['m1', 'e1', 's1'];
      milestone.children = ['e1'];
      milestone.allDescendantTasks = ['e1', 's1'];
      epic.children = ['s1'];
      epic.allDescendantTasks = ['s1'];

      _buildBlockingRelationships(tasks, taskMap);

      expect(blocker.allTasksBeingBlocked).toEqual(expect.arrayContaining(['project', 'm1', 'e1', 's1']));
      expect(blocker.totalNumOfBlocks).toBe(4);
    });

    it('should expand all folder types (Project, Milestone, Epic) when mixed', () => {
      const blocker = new Task({ id: 'blocker', title: 'Blocker', type: TASK_TYPE.USER_STORY });
      const project = new Task({ id: 'proj', title: 'Project', type: TASK_TYPE.PROJECT });
      const milestone = new Task({ id: 'ms', title: 'Milestone', type: TASK_TYPE.MILESTONE });
      const epic = new Task({ id: 'epic', title: 'Epic', type: TASK_TYPE.EPIC });

      // Blocker blocks all three folder types
      project.dependsOnTasks = ['blocker'];
      milestone.dependsOnTasks = ['blocker'];
      epic.dependsOnTasks = ['blocker'];

      const tasks = [blocker, project, milestone, epic];
      const taskMap = getTaskMap(tasks);

      // Setup folder structures with some descendants
      project.children = [];
      project.allDescendantTasks = ['p1', 'p2'];
      milestone.children = [];
      milestone.allDescendantTasks = ['m1'];
      epic.children = [];
      epic.allDescendantTasks = ['e1', 'e2', 'e3'];

      _buildBlockingRelationships(tasks, taskMap);

      // Should include all three folders plus all their descendants
      expect(blocker.allTasksBeingBlocked).toEqual(expect.arrayContaining([
        'proj', 'p1', 'p2',      // Project + descendants (3)
        'ms', 'm1',              // Milestone + descendants (2)
        'epic', 'e1', 'e2', 'e3' // Epic + descendants (4)
      ]));
      expect(blocker.totalNumOfBlocks).toBe(9); // 3 + 2 + 4 = 9
    });
  });

  describe('edge cases', () => {
    it('should handle empty tasks array', () => {
      const tasks = [];
      const taskMap = new Map();

      expect(() => {
        _buildBlockingRelationships(tasks, taskMap);
      }).not.toThrow();
    });

    it('should handle tasks with no dependencies', () => {
      const task = new Task({ id: 't1', title: 'Test', type: TASK_TYPE.USER_STORY });
      const tasks = [task];
      const taskMap = getTaskMap(tasks);

      _buildBlockingRelationships(tasks, taskMap);

      expect(task.tasksBeingBlocked).toEqual([]);
      expect(task.allTasksBeingBlocked).toEqual([]);
    });
  });
});
