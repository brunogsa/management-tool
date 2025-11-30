import { describe, it, expect } from '@jest/globals';
import {
  initializeSimulationState,
  findStartableTasks,
  isPersonQualifiedForTask,
  assignWorkToTask,
  runSingleIteration,
  runMultipleIterations,
  calculatePercentiles,
  shouldTaskSplit,
  createSplitTask,
  updateSplitDependencies,
} from '../../../src/utils/monte-carlo.js';
import { Task, TASK_TYPE, Person, Skill, LEVEL, DEFAULT_VELOCITY_RATE } from '../../../src/models.js';

describe('Monte Carlo Simulation', () => {
  describe('Phase 1: Simple Simulation Foundation', () => {
    describe('Step 1: Time tracking setup', () => {
      it('should initialize simulation state with week counter starting at 0', () => {
        const state = initializeSimulationState();

        expect(state.currentWeek).toBe(0);
      });

      it('should increment week counter', () => {
        const state = initializeSimulationState();
        state.currentWeek++;

        expect(state.currentWeek).toBe(1);
      });
    });

    describe('Step 2: Task startability detection', () => {
      it('should find tasks with no dependencies as startable', () => {
        const task1 = new Task({ id: 't1', title: 'Task 1', type: TASK_TYPE.USER_STORY });
        task1.tasksBeingBlocked = [];
        task1.remainingDuration = 5;

        const task2 = new Task({ id: 't2', title: 'Task 2', type: TASK_TYPE.USER_STORY });
        task2.tasksBeingBlocked = [];
        task2.remainingDuration = 3;

        const tasks = [task1, task2];
        const startable = findStartableTasks(tasks);

        expect(startable).toHaveLength(2);
        expect(startable).toContain(task1);
        expect(startable).toContain(task2);
      });

      it('should find tasks with all dependencies completed as startable', () => {
        const task1 = new Task({ id: 't1', title: 'Task 1', type: TASK_TYPE.USER_STORY });
        task1.remainingDuration = 0; // completed

        const task2 = new Task({ id: 't2', title: 'Task 2', type: TASK_TYPE.USER_STORY });
        task2.remainingDuration = 5;
        task2.tasksBeingBlocked = [task1]; // depends on task1

        const tasks = [task1, task2];
        const startable = findStartableTasks(tasks);

        expect(startable).toHaveLength(1);
        expect(startable).toContain(task2);
      });

      it('should not find tasks with incomplete dependencies as startable', () => {
        const task1 = new Task({ id: 't1', title: 'Task 1', type: TASK_TYPE.USER_STORY });
        task1.remainingDuration = 3; // not completed

        const task2 = new Task({ id: 't2', title: 'Task 2', type: TASK_TYPE.USER_STORY });
        task2.remainingDuration = 5;
        task2.tasksBeingBlocked = [task1]; // depends on incomplete task1

        const tasks = [task1, task2];
        const startable = findStartableTasks(tasks);

        expect(startable).toHaveLength(1);
        expect(startable).toContain(task1);
        expect(startable).not.toContain(task2);
      });

      it('should not include already completed tasks as startable', () => {
        const task1 = new Task({ id: 't1', title: 'Task 1', type: TASK_TYPE.USER_STORY });
        task1.remainingDuration = 0;
        task1.tasksBeingBlocked = [];

        const tasks = [task1];
        const startable = findStartableTasks(tasks);

        expect(startable).toHaveLength(0);
      });
    });

    describe('Step 3: Basic skill matching', () => {
      it('should qualify person with matching skills at required level', () => {
        const task = new Task({ id: 't1', title: 'Task 1', type: TASK_TYPE.USER_STORY });
        task.requiredSkills = [new Skill({ name: 'JavaScript', minLevel: LEVEL.MID })];

        const person = new Person({ id: 'p1', name: 'Alice', level: LEVEL.MID, isHired: true, isOnboarded: true });
        person.skills = [new Skill({ name: 'JavaScript', minLevel: LEVEL.MID })];

        expect(isPersonQualifiedForTask({ person, task })).toBe(true);
      });

      it('should qualify person with skills above required level', () => {
        const task = new Task({ id: 't1', title: 'Task 1', type: TASK_TYPE.USER_STORY });
        task.requiredSkills = [new Skill({ name: 'JavaScript', minLevel: LEVEL.JUNIOR })];

        const person = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SENIOR, isHired: true, isOnboarded: true });
        person.skills = [new Skill({ name: 'JavaScript', minLevel: LEVEL.SENIOR })];

        expect(isPersonQualifiedForTask({ person, task })).toBe(true);
      });

      it('should not qualify person with skills below required level', () => {
        const task = new Task({ id: 't1', title: 'Task 1', type: TASK_TYPE.USER_STORY });
        task.requiredSkills = [new Skill({ name: 'JavaScript', minLevel: LEVEL.SENIOR })];

        const person = new Person({ id: 'p1', name: 'Alice', level: LEVEL.JUNIOR, isHired: true, isOnboarded: true });
        person.skills = [new Skill({ name: 'JavaScript', minLevel: LEVEL.JUNIOR })];

        expect(isPersonQualifiedForTask({ person, task })).toBe(false);
      });

      it('should not qualify person missing required skills', () => {
        const task = new Task({ id: 't1', title: 'Task 1', type: TASK_TYPE.USER_STORY });
        task.requiredSkills = [
          new Skill({ name: 'JavaScript', minLevel: LEVEL.MID }),
          new Skill({ name: 'React', minLevel: LEVEL.MID }),
        ];

        const person = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SENIOR, isHired: true, isOnboarded: true });
        person.skills = [new Skill({ name: 'JavaScript', minLevel: LEVEL.SENIOR })];

        expect(isPersonQualifiedForTask({ person, task })).toBe(false);
      });

      it('should qualify person with no required skills on task', () => {
        const task = new Task({ id: 't1', title: 'Task 1', type: TASK_TYPE.USER_STORY });
        task.requiredSkills = [];

        const person = new Person({ id: 'p1', name: 'Alice', level: LEVEL.MID, isHired: true, isOnboarded: true });
        person.skills = [new Skill({ name: 'JavaScript', minLevel: LEVEL.MID })];

        expect(isPersonQualifiedForTask({ person, task })).toBe(true);
      });
    });

    describe('Step 4: Simple work assignment', () => {
      it('should assign work from person to task using velocity factor', () => {
        const task = new Task({ id: 't1', title: 'Task 1', type: TASK_TYPE.USER_STORY });
        task.remainingDuration = 10;

        const person = new Person({ id: 'p1', name: 'Alice', level: LEVEL.MID, isHired: true, isOnboarded: true });
        person.availableCapacity = 5;

        const capacityUsed = assignWorkToTask({ task, person, weeksOfWork: 1 });

        // Mid-level has velocity 1.1, so 1 week * 1.1 = 1.1 units of work
        const expectedWork = 1 * DEFAULT_VELOCITY_RATE[LEVEL.MID];
        expect(capacityUsed).toBeCloseTo(expectedWork, 2);
        expect(task.remainingDuration).toBeCloseTo(10 - expectedWork, 2);
      });

      it('should assign work respecting available capacity', () => {
        const task = new Task({ id: 't1', title: 'Task 1', type: TASK_TYPE.USER_STORY });
        task.remainingDuration = 10;

        const person = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SENIOR, isHired: true, isOnboarded: true });
        person.availableCapacity = 2;

        const capacityUsed = assignWorkToTask({ task, person, weeksOfWork: 5 });

        // Can only use 2 weeks of capacity
        const expectedWork = 2 * DEFAULT_VELOCITY_RATE[LEVEL.SENIOR];
        expect(capacityUsed).toBeCloseTo(expectedWork, 2);
        expect(person.availableCapacity).toBe(0);
      });

      it('should assign work respecting remaining task duration', () => {
        const task = new Task({ id: 't1', title: 'Task 1', type: TASK_TYPE.USER_STORY });
        task.remainingDuration = 1;

        const person = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SPECIALIST, isHired: true, isOnboarded: true });
        person.availableCapacity = 10;

        const capacityUsed = assignWorkToTask({ task, person, weeksOfWork: 5 });

        // Task only needs 1 unit, specialist velocity is 1.0, so needs 1 week
        expect(task.remainingDuration).toBe(0);
        expect(capacityUsed).toBeCloseTo(1, 2);
      });

      it('should apply different velocity rates per level', () => {
        const internTask = new Task({ id: 't1', title: 'Task 1', type: TASK_TYPE.USER_STORY });
        internTask.remainingDuration = 10;

        const intern = new Person({ id: 'p1', name: 'Intern', level: LEVEL.INTERN, isHired: true, isOnboarded: true });
        intern.availableCapacity = 10;

        const internWork = assignWorkToTask({ task: internTask, person: intern, weeksOfWork: 1 });
        expect(internWork).toBeCloseTo(1 * DEFAULT_VELOCITY_RATE[LEVEL.INTERN], 2);

        const specialistTask = new Task({ id: 't2', title: 'Task 2', type: TASK_TYPE.USER_STORY });
        specialistTask.remainingDuration = 10;

        const specialist = new Person({ id: 'p2', name: 'Specialist', level: LEVEL.SPECIALIST, isHired: true, isOnboarded: true });
        specialist.availableCapacity = 10;

        const specialistWork = assignWorkToTask({ task: specialistTask, person: specialist, weeksOfWork: 1 });
        expect(specialistWork).toBeCloseTo(1 * DEFAULT_VELOCITY_RATE[LEVEL.SPECIALIST], 2);
      });
    });

    describe('Step 5: Task progress tracking', () => {
      it('should track work via accountWork and reduce remaining duration', () => {
        const task = new Task({ id: 't1', title: 'Task 1', type: TASK_TYPE.USER_STORY });
        task.remainingDuration = 10;

        task.accountWork(3, 0);

        expect(task.remainingDuration).toBe(7);
      });

      it('should detect completion via isDone when all work is done', () => {
        const task = new Task({ id: 't1', title: 'Task 1', type: TASK_TYPE.USER_STORY });
        task.remainingDuration = 5;
        task.remainingReworkDuration = 0;

        expect(task.isDone()).toBe(false);

        task.accountWork(5, 0);

        expect(task.isDone()).toBe(true);
      });

      it('should not be done if rework remains', () => {
        const task = new Task({ id: 't1', title: 'Task 1', type: TASK_TYPE.USER_STORY });
        task.remainingDuration = 5;
        task.remainingReworkDuration = 2;

        task.accountWork(5, 0);

        expect(task.remainingDuration).toBe(0);
        expect(task.remainingReworkDuration).toBe(2);
        expect(task.isDone()).toBe(false);
      });

      it('should initialize remaining duration to 0 on first accountWork call', () => {
        const task = new Task({ id: 't1', title: 'Task 1', type: TASK_TYPE.USER_STORY });

        task.accountWork(3, 0);

        // Task initializes to 0, then subtracts 3, resulting in 0 (capped)
        expect(task.remainingDuration).toBe(0);
      });
    });

    describe('Step 6: Single iteration execution', () => {
      it('should run simulation until all tasks are complete', () => {
        const task1 = new Task({ id: 't1', title: 'Task 1', type: TASK_TYPE.USER_STORY });
        task1.remainingDuration = 2;
        task1.tasksBeingBlocked = [];
        task1.requiredSkills = [];

        const task2 = new Task({ id: 't2', title: 'Task 2', type: TASK_TYPE.USER_STORY });
        task2.remainingDuration = 3;
        task2.tasksBeingBlocked = [];
        task2.requiredSkills = [];

        const tasks = [task1, task2];

        const person = new Person({ id: 'p1', name: 'Alice', level: LEVEL.MID, isHired: true, isOnboarded: true });
        person.skills = [];
        person.availableCapacity = 10;

        const personnel = [person];

        const result = runSingleIteration({ tasks, personnel });

        expect(result.completionWeek).toBeGreaterThan(0);
        expect(task1.isDone()).toBe(true);
        expect(task2.isDone()).toBe(true);
      });

      it('should track completion dates for each task', () => {
        const task1 = new Task({ id: 't1', title: 'Task 1', type: TASK_TYPE.USER_STORY });
        task1.remainingDuration = 1;
        task1.tasksBeingBlocked = [];
        task1.requiredSkills = [];

        const tasks = [task1];

        const person = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SENIOR, isHired: true, isOnboarded: true });
        person.skills = [];
        person.availableCapacity = 10;

        const personnel = [person];

        const result = runSingleIteration({ tasks, personnel });

        expect(result.taskCompletionDates).toBeDefined();
        expect(result.taskCompletionDates.t1).toBeGreaterThan(0);
      });

      it('should handle dependent tasks in correct order', () => {
        const task1 = new Task({ id: 't1', title: 'Task 1', type: TASK_TYPE.USER_STORY });
        task1.remainingDuration = 2;
        task1.tasksBeingBlocked = [];
        task1.requiredSkills = [];

        const task2 = new Task({ id: 't2', title: 'Task 2', type: TASK_TYPE.USER_STORY });
        task2.remainingDuration = 2;
        task2.tasksBeingBlocked = [task1];
        task2.requiredSkills = [];

        const tasks = [task1, task2];

        const person = new Person({ id: 'p1', name: 'Alice', level: LEVEL.MID, isHired: true, isOnboarded: true });
        person.skills = [];
        person.availableCapacity = 10;

        const personnel = [person];

        const result = runSingleIteration({ tasks, personnel });

        expect(result.taskCompletionDates.t1).toBeLessThan(result.taskCompletionDates.t2);
      });

      it('should increment week counter during simulation', () => {
        const task1 = new Task({ id: 't1', title: 'Task 1', type: TASK_TYPE.USER_STORY });
        task1.remainingDuration = 5;
        task1.tasksBeingBlocked = [];
        task1.requiredSkills = [];

        const tasks = [task1];

        const person = new Person({ id: 'p1', name: 'Alice', level: LEVEL.MID, isHired: true, isOnboarded: true });
        person.skills = [];
        person.availableCapacity = 1;

        const personnel = [person];

        const result = runSingleIteration({ tasks, personnel });

        expect(result.completionWeek).toBeGreaterThan(1);
      });
    });

    describe('Step 7: Multiple iterations aggregation', () => {
      it('should run N iterations and collect completion dates', () => {
        const createTasks = () => {
          const task1 = new Task({ id: 't1', title: 'Task 1', type: TASK_TYPE.USER_STORY });
          task1.remainingDuration = 2;
          task1.tasksBeingBlocked = [];
          task1.requiredSkills = [];
          return [task1];
        };

        const createPersonnel = () => {
          const person = new Person({ id: 'p1', name: 'Alice', level: LEVEL.MID, isHired: true, isOnboarded: true });
          person.skills = [];
          return [person];
        };

        const result = runMultipleIterations({
          tasks: createTasks,
          personnel: createPersonnel,
          numIterations: 5,
        });

        expect(result.iterations).toHaveLength(5);
        expect(result.iterations.every(iter => iter.completionWeek > 0)).toBe(true);
      });

      it('should collect completion dates for all tasks across iterations', () => {
        const createTasks = () => {
          const task1 = new Task({ id: 't1', title: 'Task 1', type: TASK_TYPE.USER_STORY });
          task1.remainingDuration = 1;
          task1.tasksBeingBlocked = [];
          task1.requiredSkills = [];

          const task2 = new Task({ id: 't2', title: 'Task 2', type: TASK_TYPE.USER_STORY });
          task2.remainingDuration = 2;
          task2.tasksBeingBlocked = [];
          task2.requiredSkills = [];

          return [task1, task2];
        };

        const createPersonnel = () => {
          const person = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SENIOR, isHired: true, isOnboarded: true });
          person.skills = [];
          return [person];
        };

        const result = runMultipleIterations({
          tasks: createTasks,
          personnel: createPersonnel,
          numIterations: 3,
        });

        expect(result.iterations).toHaveLength(3);
        result.iterations.forEach(iter => {
          expect(iter.taskCompletionDates.t1).toBeDefined();
          expect(iter.taskCompletionDates.t2).toBeDefined();
        });
      });

      it('should create independent copies for each iteration', () => {
        const createTasks = () => {
          const task1 = new Task({ id: 't1', title: 'Task 1', type: TASK_TYPE.USER_STORY });
          task1.remainingDuration = 2;
          task1.tasksBeingBlocked = [];
          task1.requiredSkills = [];
          return [task1];
        };

        const createPersonnel = () => {
          const person = new Person({ id: 'p1', name: 'Alice', level: LEVEL.MID, isHired: true, isOnboarded: true });
          person.skills = [];
          return [person];
        };

        const result = runMultipleIterations({
          tasks: createTasks,
          personnel: createPersonnel,
          numIterations: 10,
        });

        // All iterations should have similar completion times (since tasks are identical)
        const completionWeeks = result.iterations.map(iter => iter.completionWeek);
        const allSimilar = completionWeeks.every(week => week === completionWeeks[0]);
        expect(allSimilar).toBe(true);
      });
    });

    describe('Step 8: Percentile calculation', () => {
      it('should calculate 50th percentile (median)', () => {
        const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const percentiles = calculatePercentiles(values);

        expect(percentiles.p50).toBe(5.5);
      });

      it('should calculate all required percentiles (50th, 75th, 90th, 95th, 99th)', () => {
        const values = Array.from({ length: 100 }, (_, i) => i + 1);
        const percentiles = calculatePercentiles(values);

        expect(percentiles.p50).toBeCloseTo(50.5, 1);
        expect(percentiles.p75).toBeCloseTo(75.25, 1);
        expect(percentiles.p90).toBeCloseTo(90.1, 1);
        expect(percentiles.p95).toBeCloseTo(95.05, 1);
        expect(percentiles.p99).toBeCloseTo(99.01, 1);
      });

      it('should handle unsorted input by sorting first', () => {
        const values = [10, 1, 5, 3, 8, 2, 7, 4, 9, 6];
        const percentiles = calculatePercentiles(values);

        expect(percentiles.p50).toBe(5.5);
      });

      it('should handle small datasets', () => {
        const values = [1, 2, 3];
        const percentiles = calculatePercentiles(values);

        expect(percentiles.p50).toBeCloseTo(2, 1);
        expect(percentiles.p75).toBeCloseTo(2.5, 1);
        expect(percentiles.p90).toBeCloseTo(2.8, 1);
      });

      it('should handle single value', () => {
        const values = [42];
        const percentiles = calculatePercentiles(values);

        expect(percentiles.p50).toBe(42);
        expect(percentiles.p75).toBe(42);
        expect(percentiles.p90).toBe(42);
        expect(percentiles.p95).toBe(42);
        expect(percentiles.p99).toBe(42);
      });
    });
  });

  describe('Phase 2: Task Split Rate', () => {
    describe('Step 9: Split probability detection', () => {
      it('should return true when random value is below split rate', () => {
        const mockRandom = 0.10; // 10% < 15% split rate
        const splitRate = 0.15;

        const result = shouldTaskSplit(splitRate, mockRandom);

        expect(result).toBe(true);
      });

      it('should return false when random value is above split rate', () => {
        const mockRandom = 0.20; // 20% > 15% split rate
        const splitRate = 0.15;

        const result = shouldTaskSplit(splitRate, mockRandom);

        expect(result).toBe(false);
      });

      it('should use default split rate if not provided', () => {
        const mockRandom = 0.10;

        const result = shouldTaskSplit(undefined, mockRandom);

        expect(result).toBe(true); // 10% < 15% default
      });

      it('should handle edge case at exactly split rate', () => {
        const mockRandom = 0.15;
        const splitRate = 0.15;

        const result = shouldTaskSplit(splitRate, mockRandom);

        expect(result).toBe(false); // Should use < not <=
      });

      it('should always split with 100% rate', () => {
        const mockRandom = 0.99;
        const splitRate = 1.0;

        const result = shouldTaskSplit(splitRate, mockRandom);

        expect(result).toBe(true);
      });

      it('should never split with 0% rate', () => {
        const mockRandom = 0.01;
        const splitRate = 0.0;

        const result = shouldTaskSplit(splitRate, mockRandom);

        expect(result).toBe(false);
      });
    });

    describe('Step 10: Split task creation', () => {
      it('should create new task with same properties as original', () => {
        const original = new Task({ id: 't1', title: 'Original Task', type: TASK_TYPE.USER_STORY });
        original.remainingDuration = 10;
        original.requiredSkills = [new Skill({ name: 'JavaScript', minLevel: LEVEL.MID })];

        const { originalTask, splitTask, tasks } = createSplitTask({ task: original, tasks: [original] });

        expect(splitTask.title).toBe('Original Task');
        expect(splitTask.type).toBe(TASK_TYPE.USER_STORY);
        expect(splitTask.requiredSkills).toHaveLength(1);
        expect(splitTask.requiredSkills[0].name).toBe('JavaScript');
        expect(splitTask.id).toContain('t1-split');
      });

      it('should divide remaining duration between original and split', () => {
        const original = new Task({ id: 't1', title: 'Task 1', type: TASK_TYPE.USER_STORY });
        original.remainingDuration = 10;

        const { originalTask, splitTask } = createSplitTask({ task: original, tasks: [original] });

        expect(originalTask.remainingDuration).toBeCloseTo(5, 1);
        expect(splitTask.remainingDuration).toBeCloseTo(5, 1);
        expect(originalTask.remainingDuration + splitTask.remainingDuration).toBeCloseTo(10, 1);
      });

      it('should add split task to tasks array', () => {
        const original = new Task({ id: 't1', title: 'Task 1', type: TASK_TYPE.USER_STORY });
        original.remainingDuration = 10;
        const tasksArray = [original];

        const { tasks } = createSplitTask({ task: original, tasks: tasksArray });

        expect(tasks).toHaveLength(2);
        expect(tasks[1].id).toContain('t1-split');
      });

      it('should handle tasks with zero remaining duration', () => {
        const original = new Task({ id: 't1', title: 'Task 1', type: TASK_TYPE.USER_STORY });
        original.remainingDuration = 0;

        const { originalTask, splitTask } = createSplitTask({ task: original, tasks: [original] });

        expect(originalTask.remainingDuration).toBe(0);
        expect(splitTask.remainingDuration).toBe(0);
      });

      it('should copy tasksBeingBlocked from original', () => {
        const original = new Task({ id: 't1', title: 'Task 1', type: TASK_TYPE.USER_STORY });
        const blocker = new Task({ id: 't0', title: 'Blocker', type: TASK_TYPE.USER_STORY });
        original.remainingDuration = 10;
        original.tasksBeingBlocked = [blocker];

        const { splitTask } = createSplitTask({ task: original, tasks: [original] });

        expect(splitTask.tasksBeingBlocked).toHaveLength(1);
        expect(splitTask.tasksBeingBlocked[0]).toBe(blocker);
      });
    });

    describe('Step 11: Split dependency update', () => {
      it('should make original task block split task', () => {
        const original = new Task({ id: 't1', title: 'Original', type: TASK_TYPE.USER_STORY });
        original.remainingDuration = 10;
        const splitTask = new Task({ id: 't1-split', title: 'Split', type: TASK_TYPE.USER_STORY });
        splitTask.remainingDuration = 5;

        updateSplitDependencies({ originalTask: original, splitTask });

        expect(splitTask.tasksBeingBlocked).toContain(original);
      });

      it('should make split task block everything original was blocking', () => {
        const original = new Task({ id: 't1', title: 'Original', type: TASK_TYPE.USER_STORY });
        const dependent1 = new Task({ id: 't2', title: 'Dependent 1', type: TASK_TYPE.USER_STORY });
        const dependent2 = new Task({ id: 't3', title: 'Dependent 2', type: TASK_TYPE.USER_STORY });

        dependent1.tasksBeingBlocked = [original];
        dependent2.tasksBeingBlocked = [original];

        const splitTask = new Task({ id: 't1-split', title: 'Split', type: TASK_TYPE.USER_STORY });
        const tasks = [original, dependent1, dependent2, splitTask];

        updateSplitDependencies({ originalTask: original, splitTask, tasks });

        expect(dependent1.tasksBeingBlocked).toContain(splitTask);
        expect(dependent2.tasksBeingBlocked).toContain(splitTask);
      });

      it('should not duplicate dependencies', () => {
        const original = new Task({ id: 't1', title: 'Original', type: TASK_TYPE.USER_STORY });
        const splitTask = new Task({ id: 't1-split', title: 'Split', type: TASK_TYPE.USER_STORY });
        splitTask.tasksBeingBlocked = [];

        // Call twice to test deduplication
        updateSplitDependencies({ originalTask: original, splitTask });
        updateSplitDependencies({ originalTask: original, splitTask });

        const originalCount = splitTask.tasksBeingBlocked.filter(t => t === original).length;
        expect(originalCount).toBe(1);
      });

      it('should handle original with no dependents', () => {
        const original = new Task({ id: 't1', title: 'Original', type: TASK_TYPE.USER_STORY });
        const splitTask = new Task({ id: 't1-split', title: 'Split', type: TASK_TYPE.USER_STORY });
        const tasks = [original, splitTask];

        updateSplitDependencies({ originalTask: original, splitTask, tasks });

        expect(splitTask.tasksBeingBlocked).toContain(original);
      });

      it('should maintain existing dependencies on split task', () => {
        const original = new Task({ id: 't1', title: 'Original', type: TASK_TYPE.USER_STORY });
        const blocker = new Task({ id: 't0', title: 'Blocker', type: TASK_TYPE.USER_STORY });
        const splitTask = new Task({ id: 't1-split', title: 'Split', type: TASK_TYPE.USER_STORY });
        splitTask.tasksBeingBlocked = [blocker];

        updateSplitDependencies({ originalTask: original, splitTask });

        expect(splitTask.tasksBeingBlocked).toContain(original);
        expect(splitTask.tasksBeingBlocked).toContain(blocker);
        expect(splitTask.tasksBeingBlocked).toHaveLength(2);
      });
    });
  });
});
