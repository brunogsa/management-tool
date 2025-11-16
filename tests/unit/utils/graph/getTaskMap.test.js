import { getTaskMap } from '../../../../src/utils/graph.js';
import { Task, TASK_TYPE } from '../../../../src/models.js';

describe('getTaskMap(tasks) -> Map (non-mutating)', () => {
  it('should create Map with task.id as key and task as value', () => {
    const task1 = new Task({ id: 't1', title: 'Task 1', type: TASK_TYPE.USER_STORY });
    const task2 = new Task({ id: 't2', title: 'Task 2', type: TASK_TYPE.BUG });
    const tasks = [task1, task2];

    const map = getTaskMap(tasks);

    expect(map.get('t1')).toBe(task1);
    expect(map.get('t2')).toBe(task2);
  });

  it('should map each task.id to its corresponding task object', () => {
    const tasks = [
      new Task({ id: 'a', title: 'A', type: TASK_TYPE.EPIC }),
      new Task({ id: 'b', title: 'B', type: TASK_TYPE.MILESTONE }),
      new Task({ id: 'c', title: 'C', type: TASK_TYPE.PROJECT })
    ];

    const map = getTaskMap(tasks);

    expect(map.size).toBe(3);
    tasks.forEach(task => {
      expect(map.get(task.id)).toBe(task);
    });
  });

  it('should return empty Map for empty array', () => {
    const map = getTaskMap([]);
    expect(map.size).toBe(0);
    expect(map instanceof Map).toBe(true);
  });

  it('should return Map with single entry for single task', () => {
    const task = new Task({ id: 'solo', title: 'Solo Task', type: TASK_TYPE.SPIKE });
    const map = getTaskMap([task]);

    expect(map.size).toBe(1);
    expect(map.get('solo')).toBe(task);
  });

  it('should return Map with multiple entries for multiple tasks', () => {
    const tasks = [
      new Task({ id: 't1', title: 'T1', type: TASK_TYPE.USER_STORY }),
      new Task({ id: 't2', title: 'T2', type: TASK_TYPE.TECH_TASK }),
      new Task({ id: 't3', title: 'T3', type: TASK_TYPE.TECH_DEBT }),
      new Task({ id: 't4', title: 'T4', type: TASK_TYPE.IMPROVEMENT })
    ];

    const map = getTaskMap(tasks);
    expect(map.size).toBe(4);
  });

  describe('edge cases', () => {
    it('should use last task when duplicate IDs exist', () => {
      const task1 = new Task({ id: 'dup', title: 'First', type: TASK_TYPE.BUG });
      const task2 = new Task({ id: 'dup', title: 'Second', type: TASK_TYPE.BUG });
      const tasks = [task1, task2];

      const map = getTaskMap(tasks);

      expect(map.get('dup')).toBe(task2);
      expect(map.get('dup').title).toBe('Second');
    });

    it('should return Map instance', () => {
      const map = getTaskMap([]);
      expect(map instanceof Map).toBe(true);
    });
  });
});
