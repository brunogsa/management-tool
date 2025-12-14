import { describe, it, expect, jest } from '@jest/globals';
import {
  initializeSimulationState,
  recordWeeklyWork,
  findStartableTasks,
  isPersonQualifiedForTask,
  assignWorkToTask,
  assignTasksToPersonnel,
  runSingleIteration,
  runMultipleIterations,
  calculatePercentiles,
  shouldTaskSplit,
  createSplitTask,
  updateSplitDependencies,
  shouldTaskRequireRework,
  createReworkTask,
  isPersonOnVacation,
  applyVacationToPersonnelCapacity,
  shouldPersonGetSick,
  generateSickLeaveDuration,
  isPersonHired,
  filterHiredPersonnel,
  isHiringComplete,
  completeHiring,
  calculateHireCompletionWeek,
  isPersonOnboarded,
  filterOnboardedPersonnel,
  isOnboardingComplete,
  applyOnboardingCapacityReduction,
  shouldPersonQuit,
  markPersonAsDeparted,
  filterActivePersonnel,
  createReplacement,
  startOnboarding,
  completeOnboarding,
  isTaskStartableByDate,
  filterTasksByStartDate,
  findClosestIterationForTargetCompletionWeek,
  extractTaskTimeline,
  extractTimelineForTargetCompletionWeek,
  generateGanttChartCode,
} from '../../../src/utils/monte-carlo.js';
import { Task, TASK_TYPE, Person, Skill, LEVEL, DEFAULT_VELOCITY_RATE, DEFAULT_REWORK_RATE, DEFAULT_WEEKLY_SICK_CHANCE, DEFAULT_WEEKLY_QUIT_CHANCE, DEFAULT_TIME_TO_HIRE, DEFAULT_TIME_TO_RAMPUP } from '../../../src/models.js';

// Helper to create default globalParams for tests
// Note: Creates deep copies to prevent test isolation issues
const createDefaultGlobalParams = () => ({
  velocityByLevel: { ...DEFAULT_VELOCITY_RATE },
  reworkRateByLevel: { ...DEFAULT_REWORK_RATE },
  sickRate: DEFAULT_WEEKLY_SICK_CHANCE,
  turnOverRate: DEFAULT_WEEKLY_QUIT_CHANCE,
  timeToHireByLevel: { ...DEFAULT_TIME_TO_HIRE },
  timeToRampUpByLevel: { ...DEFAULT_TIME_TO_RAMPUP },
});

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

      it('should initialize workedWeeks as empty array', () => {
        const state = initializeSimulationState();

        expect(state.workedWeeks).toEqual([]);
        expect(Array.isArray(state.workedWeeks)).toBe(true);
      });
    });

    describe('Step 1.5: Weekly work tracking', () => {
      it('should create new week entry if not exists', () => {
        const state = initializeSimulationState();
        state.currentWeek = 1;

        const task = new Task({ id: 't1', title: 'Task 1', type: TASK_TYPE.USER_STORY });
        task.remainingDuration = 5;
        task.remainingReworkDuration = 0;

        const person = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SENIOR, isHired: true, isOnboarded: true });

        recordWeeklyWork({ state, task, person, workDone: 2 });

        expect(state.workedWeeks).toHaveLength(1);
        expect(state.workedWeeks[0].weekNumber).toBe(1);
        expect(state.workedWeeks[0].assignments).toHaveLength(1);
      });

      it('should append to existing week entry', () => {
        const state = initializeSimulationState();
        state.currentWeek = 1;

        const task1 = new Task({ id: 't1', title: 'Task 1', type: TASK_TYPE.USER_STORY });
        task1.remainingDuration = 5;
        task1.remainingReworkDuration = 0;
        task1.remainingReworkDuration = 0;

        const task2 = new Task({ id: 't2', title: 'Task 2', type: TASK_TYPE.USER_STORY });
        task2.remainingDuration = 3;
        task2.remainingReworkDuration = 0;
        task2.remainingReworkDuration = 0;

        const person = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SENIOR, isHired: true, isOnboarded: true });

        recordWeeklyWork({ state, task: task1, person, workDone: 2 });
        recordWeeklyWork({ state, task: task2, person, workDone: 1 });

        expect(state.workedWeeks).toHaveLength(1);
        expect(state.workedWeeks[0].assignments).toHaveLength(2);
      });

      it('should record all assignment details correctly', () => {
        const state = initializeSimulationState();
        state.currentWeek = 3;

        const task = new Task({ id: 't1', title: 'Implement Feature X', type: TASK_TYPE.USER_STORY });
        task.remainingDuration = 5;
        task.remainingReworkDuration = 0.5;

        const person = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SENIOR, isHired: true, isOnboarded: true });

        recordWeeklyWork({ state, task, person, workDone: 2.5 });

        const assignment = state.workedWeeks[0].assignments[0];
        expect(assignment.taskId).toBe('t1');
        expect(assignment.taskTitle).toBe('Implement Feature X');
        expect(assignment.personId).toBe('p1');
        expect(assignment.personName).toBe('Alice');
        expect(assignment.personLevel).toBe(LEVEL.SENIOR);
        expect(assignment.workDone).toBe(2.5);
        expect(assignment.taskRemainingDuration).toBe(5);
        expect(assignment.taskRemainingRework).toBe(0.5);
      });
    });

    describe('Step 2: Task startability detection', () => {
      it('should find tasks with no dependencies as startable', () => {
        const task1 = new Task({ id: 't1', title: 'Task 1', type: TASK_TYPE.USER_STORY });
        task1.tasksBeingBlocked = [];
        task1.remainingDuration = 5;
        task1.remainingReworkDuration = 0;

        const task2 = new Task({ id: 't2', title: 'Task 2', type: TASK_TYPE.USER_STORY });
        task2.tasksBeingBlocked = [];
        task2.remainingDuration = 3;
        task2.remainingReworkDuration = 0;

        const tasks = [task1, task2];
        const incompleteTasks = new Set(tasks);
        const taskMap = new Map(tasks.map(t => [t.id, t]));
        const startable = findStartableTasks(incompleteTasks, taskMap);

        expect(startable).toHaveLength(2);
        expect(startable).toContain(task1);
        expect(startable).toContain(task2);
      });

      it('should find tasks with all dependencies completed as startable', () => {
        const task1 = new Task({ id: 't1', title: 'Task 1', type: TASK_TYPE.USER_STORY });
        task1.remainingDuration = 0; // completed
        task1.remainingReworkDuration = 0;

        const task2 = new Task({ id: 't2', title: 'Task 2', type: TASK_TYPE.USER_STORY });
        task2.remainingDuration = 5;
        task2.remainingReworkDuration = 0;
        task2.dependsOnTasks = ['t1']; // depends on task1

        const tasks = [task1, task2];
        // Only task2 is incomplete (task1 is done)
        const incompleteTasks = new Set([task2]);
        const taskMap = new Map(tasks.map(t => [t.id, t]));
        const startable = findStartableTasks(incompleteTasks, taskMap);

        expect(startable).toHaveLength(1);
        expect(startable).toContain(task2);
      });

      it('should not find tasks with incomplete dependencies as startable', () => {
        const task1 = new Task({ id: 't1', title: 'Task 1', type: TASK_TYPE.USER_STORY });
        task1.remainingDuration = 3; // not completed
        task1.remainingReworkDuration = 0;

        const task2 = new Task({ id: 't2', title: 'Task 2', type: TASK_TYPE.USER_STORY });
        task2.remainingDuration = 5;
        task2.remainingReworkDuration = 0;
        task2.dependsOnTasks = ['t1']; // depends on incomplete task1

        const tasks = [task1, task2];
        const incompleteTasks = new Set(tasks);
        const taskMap = new Map(tasks.map(t => [t.id, t]));
        const startable = findStartableTasks(incompleteTasks, taskMap);

        expect(startable).toHaveLength(1);
        expect(startable).toContain(task1);
        expect(startable).not.toContain(task2);
      });

      it('should not include already completed tasks as startable', () => {
        const task1 = new Task({ id: 't1', title: 'Task 1', type: TASK_TYPE.USER_STORY });
        task1.remainingDuration = 0;
        task1.remainingReworkDuration = 0;
        task1.tasksBeingBlocked = [];

        const tasks = [task1];
        // No incomplete tasks (task1 is done)
        const incompleteTasks = new Set();
        const taskMap = new Map(tasks.map(t => [t.id, t]));
        const startable = findStartableTasks(incompleteTasks, taskMap);

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
        task1.remainingReworkDuration = 0;
        task1.remainingReworkDuration = 0;
        task1.mostProbableEstimateInRange = 2;
        task1.dependsOnTasks = [];
        task1.tasksBeingBlocked = [];
        task1.allTasksBeingBlocked = [];
        task1.totalNumOfBlocks = 0;
        task1.requiredSkills = [];

        const task2 = new Task({ id: 't2', title: 'Task 2', type: TASK_TYPE.USER_STORY });
        task2.remainingDuration = 3;
        task2.remainingReworkDuration = 0;
        task2.remainingReworkDuration = 0;
        task2.mostProbableEstimateInRange = 3;
        task2.dependsOnTasks = [];
        task2.tasksBeingBlocked = [];
        task2.allTasksBeingBlocked = [];
        task2.totalNumOfBlocks = 0;
        task2.requiredSkills = [];

        const tasks = [task1, task2];

        const person = new Person({ id: 'p1', name: 'Alice', level: LEVEL.MID, isHired: true, isOnboarded: true });
        person.skills = [];
        person.availableCapacity = 10;

        const personnel = [person];

        const globalParams = createDefaultGlobalParams();
        const startDate = new Date('2025-01-01');
        const taskMap = new Map(tasks.map(t => [t.id, t]));

        const result = runSingleIteration({ tasks, personnel, globalParams, startDate, taskMap });

        expect(result.completionWeek).toBeGreaterThan(0);
        expect(task1.isDone()).toBe(true);
        expect(task2.isDone()).toBe(true);
      });

      it('should track completion dates for each task', () => {
        const task1 = new Task({ id: 't1', title: 'Task 1', type: TASK_TYPE.USER_STORY });
        task1.remainingDuration = 1;
        task1.remainingReworkDuration = 0;
        task1.remainingReworkDuration = 0;
        task1.mostProbableEstimateInRange = 1;
        task1.dependsOnTasks = [];
        task1.tasksBeingBlocked = [];
        task1.allTasksBeingBlocked = [];
        task1.totalNumOfBlocks = 0;
        task1.requiredSkills = [];

        const tasks = [task1];

        const person = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SENIOR, isHired: true, isOnboarded: true });
        person.skills = [];
        person.availableCapacity = 10;

        const personnel = [person];

        const globalParams = createDefaultGlobalParams();
        const startDate = new Date('2025-01-01');
        const taskMap = new Map(tasks.map(t => [t.id, t]));

        const result = runSingleIteration({ tasks, personnel, globalParams, startDate, taskMap });

        expect(result.taskCompletionDates).toBeDefined();
        expect(result.taskCompletionDates.t1).toBeGreaterThan(0);
      });

      it('should handle dependent tasks in correct order', () => {
        const task1 = new Task({ id: 't1', title: 'Task 1', type: TASK_TYPE.USER_STORY });
        task1.remainingDuration = 2;
        task1.remainingReworkDuration = 0;
        task1.mostProbableEstimateInRange = 2;
        task1.tasksBeingBlocked = [];
        task1.allTasksBeingBlocked = [];
        task1.totalNumOfBlocks = 0;
        task1.requiredSkills = [];

        const task2 = new Task({ id: 't2', title: 'Task 2', type: TASK_TYPE.USER_STORY });
        task2.remainingDuration = 2;
        task2.remainingReworkDuration = 0;
        task2.mostProbableEstimateInRange = 2;
        task2.dependsOnTasks = ['t1'];
        task2.tasksBeingBlocked = [];
        task2.allTasksBeingBlocked = [];
        task2.totalNumOfBlocks = 0;
        task2.requiredSkills = [];

        const tasks = [task1, task2];

        const person = new Person({ id: 'p1', name: 'Alice', level: LEVEL.MID, isHired: true, isOnboarded: true });
        person.skills = [];
        person.availableCapacity = 10;

        const personnel = [person];

        const globalParams = createDefaultGlobalParams();
        const startDate = new Date('2025-01-01');
        const taskMap = new Map(tasks.map(t => [t.id, t]));

        const result = runSingleIteration({ tasks, personnel, globalParams, startDate, taskMap });

        expect(result.taskCompletionDates.t1).toBeLessThan(result.taskCompletionDates.t2);
      });

      it('should increment week counter during simulation', () => {
        const task1 = new Task({ id: 't1', title: 'Task 1', type: TASK_TYPE.USER_STORY });
        task1.remainingDuration = 5;
        task1.remainingReworkDuration = 0;
        task1.mostProbableEstimateInRange = 5;
        task1.tasksBeingBlocked = [];
        task1.allTasksBeingBlocked = [];
        task1.totalNumOfBlocks = 0;
        task1.requiredSkills = [];

        const tasks = [task1];

        const person = new Person({ id: 'p1', name: 'Alice', level: LEVEL.MID, isHired: true, isOnboarded: true });
        person.skills = [];
        person.availableCapacity = 1;

        const personnel = [person];

        const globalParams = createDefaultGlobalParams();
        const startDate = new Date('2025-01-01');
        const taskMap = new Map(tasks.map(t => [t.id, t]));

        const result = runSingleIteration({ tasks, personnel, globalParams, startDate, taskMap });

        expect(result.completionWeek).toBeGreaterThan(1);
      });
    });

    describe('Step 7: Multiple iterations aggregation', () => {
      it('should run N iterations and collect completion dates', () => {
        const createTasks = () => {
          const task1 = new Task({ id: 't1', title: 'Task 1', type: TASK_TYPE.USER_STORY });
          task1.remainingDuration = 2;
          task1.remainingReworkDuration = 0;
          task1.mostProbableEstimateInRange = 2;
          task1.tasksBeingBlocked = [];
          task1.allTasksBeingBlocked = [];
          task1.totalNumOfBlocks = 0;
          task1.requiredSkills = [];
          return [task1];
        };

        const createPersonnel = () => {
          const person = new Person({ id: 'p1', name: 'Alice', level: LEVEL.MID, isHired: true, isOnboarded: true });
          person.skills = [];
          return [person];
        };

        const globalParams = createDefaultGlobalParams();
        const startDate = new Date('2025-01-01');

        const result = runMultipleIterations({
          tasks: createTasks(),
          personnel: createPersonnel(),
          numIterations: 5,
          globalParams,
          startDate,
        });

        expect(result.iterations).toHaveLength(5);
        expect(result.iterations.every(iter => iter.completionWeek > 0)).toBe(true);
      });

      it('should collect completion dates for all tasks across iterations', () => {
        const createTasks = () => {
          const task1 = new Task({ id: 't1', title: 'Task 1', type: TASK_TYPE.USER_STORY });
          task1.remainingDuration = 1;
          task1.remainingReworkDuration = 0;
          task1.mostProbableEstimateInRange = 1;
          task1.dependsOnTasks = [];
          task1.tasksBeingBlocked = [];
          task1.allTasksBeingBlocked = [];
          task1.totalNumOfBlocks = 0;
          task1.requiredSkills = [];

          const task2 = new Task({ id: 't2', title: 'Task 2', type: TASK_TYPE.USER_STORY });
          task2.remainingDuration = 2;
          task2.remainingReworkDuration = 0;
          task2.mostProbableEstimateInRange = 2;
          task2.dependsOnTasks = [];
          task2.tasksBeingBlocked = [];
          task2.allTasksBeingBlocked = [];
          task2.totalNumOfBlocks = 0;
          task2.requiredSkills = [];

          return [task1, task2];
        };

        const createPersonnel = () => {
          const person = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SENIOR, isHired: true, isOnboarded: true });
          person.skills = [];
          return [person];
        };

        const globalParams = createDefaultGlobalParams();
        const startDate = new Date('2025-01-01');

        const result = runMultipleIterations({
          tasks: createTasks(),
          personnel: createPersonnel(),
          numIterations: 3,
          globalParams,
          startDate,
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
          task1.remainingReworkDuration = 0;
          task1.mostProbableEstimateInRange = 2;
          task1.tasksBeingBlocked = [];
          task1.allTasksBeingBlocked = [];
          task1.totalNumOfBlocks = 0;
          task1.requiredSkills = [];
          return [task1];
        };

        const createPersonnel = () => {
          const person = new Person({ id: 'p1', name: 'Alice', level: LEVEL.MID, isHired: true, isOnboarded: true });
          person.skills = [];
          return [person];
        };

        // Disable sick and turnover to ensure deterministic results
        const globalParams = {
          ...createDefaultGlobalParams(),
          sickRate: 0,
          turnOverRate: 0,
        };
        const startDate = new Date('2025-01-01');

        const result = runMultipleIterations({
          tasks: createTasks(),
          personnel: createPersonnel(),
          numIterations: 10,
          globalParams,
          startDate,
        });

        // All iterations should have similar completion times (since tasks are identical and no random events)
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

        const { originalTask: _originalTask, splitTask, tasks: _tasks } = createSplitTask({ task: original, tasks: [original] });

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

  describe('Phase 3: Rework Modeling', () => {
    describe('Step 12: Rework probability by skill level', () => {
      it('should return true when random value is below rework rate', () => {
        const mockRandom = 0.10; // 10% < 13% junior rework rate
        const reworkRate = 0.13;

        const result = shouldTaskRequireRework(reworkRate, mockRandom);

        expect(result).toBe(true);
      });

      it('should return false when random value is above rework rate', () => {
        const mockRandom = 0.15; // 15% > 13% junior rework rate
        const reworkRate = 0.13;

        const result = shouldTaskRequireRework(reworkRate, mockRandom);

        expect(result).toBe(false);
      });

      it('should use intern rework rate (21%)', () => {
        const mockRandom = 0.20; // 20% < 21%
        const reworkRate = DEFAULT_REWORK_RATE[LEVEL.INTERN];

        const result = shouldTaskRequireRework(reworkRate, mockRandom);

        expect(result).toBe(true);
        expect(reworkRate).toBe(0.21);
      });

      it('should use junior rework rate (13%)', () => {
        const mockRandom = 0.12; // 12% < 13%
        const reworkRate = DEFAULT_REWORK_RATE[LEVEL.JUNIOR];

        const result = shouldTaskRequireRework(reworkRate, mockRandom);

        expect(result).toBe(true);
        expect(reworkRate).toBe(0.13);
      });

      it('should use mid rework rate (8%)', () => {
        const mockRandom = 0.07; // 7% < 8%
        const reworkRate = DEFAULT_REWORK_RATE[LEVEL.MID];

        const result = shouldTaskRequireRework(reworkRate, mockRandom);

        expect(result).toBe(true);
        expect(reworkRate).toBe(0.08);
      });

      it('should use senior rework rate (5%)', () => {
        const mockRandom = 0.04; // 4% < 5%
        const reworkRate = DEFAULT_REWORK_RATE[LEVEL.SENIOR];

        const result = shouldTaskRequireRework(reworkRate, mockRandom);

        expect(result).toBe(true);
        expect(reworkRate).toBe(0.05);
      });

      it('should use specialist rework rate (3%)', () => {
        const mockRandom = 0.02; // 2% < 3%
        const reworkRate = DEFAULT_REWORK_RATE[LEVEL.SPECIALIST];

        const result = shouldTaskRequireRework(reworkRate, mockRandom);

        expect(result).toBe(true);
        expect(reworkRate).toBe(0.03);
      });

      it('should handle edge case at exactly rework rate', () => {
        const mockRandom = 0.13; // Exactly 13%
        const reworkRate = 0.13;

        const result = shouldTaskRequireRework(reworkRate, mockRandom);

        expect(result).toBe(false); // >= means no rework
      });

      it('should always require rework with 100% rate', () => {
        const mockRandom = 0.99;
        const reworkRate = 1.0;

        const result = shouldTaskRequireRework(reworkRate, mockRandom);

        expect(result).toBe(true);
      });

      it('should never require rework with 0% rate', () => {
        const mockRandom = 0.0;
        const reworkRate = 0.0;

        const result = shouldTaskRequireRework(reworkRate, mockRandom);

        expect(result).toBe(false);
      });
    });

    describe('Step 13: Rework task generation', () => {
      it('should create rework task with estimate = original estimate × 0.5', () => {
        const original = new Task({ id: 't1', title: 'Original', type: TASK_TYPE.USER_STORY });
        original.remainingDuration = 10;
        const originalEstimate = 8;

        const result = createReworkTask({ task: original, originalEstimate, tasks: [] });

        expect(result.reworkTask.remainingReworkDuration).toBe(originalEstimate * 0.5);
        expect(result.reworkTask.remainingReworkDuration).toBe(4);
      });

      it('should create rework task with same properties as original', () => {
        const original = new Task({ id: 't1', title: 'Original Task', type: TASK_TYPE.USER_STORY });
        original.remainingDuration = 10;
        const originalEstimate = 8;

        const result = createReworkTask({ task: original, originalEstimate, tasks: [] });

        expect(result.reworkTask.id).toContain('t1-rework');
        expect(result.reworkTask.title).toBe('Original Task');
        expect(result.reworkTask.type).toBe(TASK_TYPE.USER_STORY);
      });

      it('should add rework task to tasks array', () => {
        const original = new Task({ id: 't1', title: 'Original', type: TASK_TYPE.USER_STORY });
        original.remainingDuration = 10;
        const tasks = [original];
        const originalEstimate = 8;

        const result = createReworkTask({ task: original, originalEstimate, tasks });

        expect(result.tasks).toHaveLength(2);
        expect(result.tasks).toContain(original);
        expect(result.tasks).toContain(result.reworkTask);
      });

      it('should copy required skills from original', () => {
        const original = new Task({ id: 't1', title: 'Original', type: TASK_TYPE.USER_STORY });
        original.remainingDuration = 10;
        original.requiredSkills = [
          new Skill({ name: 'Backend', minLevel: LEVEL.SENIOR }),
          new Skill({ name: 'Database', minLevel: LEVEL.MID }),
        ];
        const originalEstimate = 8;

        const result = createReworkTask({ task: original, originalEstimate, tasks: [] });

        expect(result.reworkTask.requiredSkills).toHaveLength(2);
        expect(result.reworkTask.requiredSkills[0].name).toBe('Backend');
        expect(result.reworkTask.requiredSkills[1].name).toBe('Database');
      });

      it('should make rework task depend on original (original blocks rework)', () => {
        const original = new Task({ id: 't1', title: 'Original', type: TASK_TYPE.USER_STORY });
        original.remainingDuration = 10;
        const originalEstimate = 8;

        const result = createReworkTask({ task: original, originalEstimate, tasks: [] });

        expect(result.reworkTask.tasksBeingBlocked).toContain(original);
      });

      it('should initialize rework task with zero remaining duration', () => {
        const original = new Task({ id: 't1', title: 'Original', type: TASK_TYPE.USER_STORY });
        original.remainingDuration = 10;
        const originalEstimate = 8;

        const result = createReworkTask({ task: original, originalEstimate, tasks: [] });

        expect(result.reworkTask.remainingDuration).toBe(0);
      });

      it('should handle tasks with zero original estimate', () => {
        const original = new Task({ id: 't1', title: 'Original', type: TASK_TYPE.USER_STORY });
        original.remainingDuration = 0;
        const originalEstimate = 0;

        const result = createReworkTask({ task: original, originalEstimate, tasks: [] });

        expect(result.reworkTask.remainingReworkDuration).toBe(0);
      });
    });
  });

  describe('Phase 4: Vacation Scheduling', () => {
    describe('Step 14: Vacation data loading', () => {
      it('should return false when person has no vacations', () => {
        const person = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SENIOR, isHired: true, isOnboarded: true });
        const currentDate = new Date('2025-06-15');

        const result = isPersonOnVacation({ person, currentDate });

        expect(result).toBe(false);
      });

      it('should return true when current date falls within vacation period', () => {
        const person = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SENIOR, isHired: true, isOnboarded: true });
        person.vacationsAt = [
          { from: new Date('2025-06-10'), to: new Date('2025-06-20') },
        ];
        const currentDate = new Date('2025-06-15');

        const result = isPersonOnVacation({ person, currentDate });

        expect(result).toBe(true);
      });

      it('should return false when current date is before vacation', () => {
        const person = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SENIOR, isHired: true, isOnboarded: true });
        person.vacationsAt = [
          { from: new Date('2025-06-10'), to: new Date('2025-06-20') },
        ];
        const currentDate = new Date('2025-06-05');

        const result = isPersonOnVacation({ person, currentDate });

        expect(result).toBe(false);
      });

      it('should return false when current date is after vacation', () => {
        const person = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SENIOR, isHired: true, isOnboarded: true });
        person.vacationsAt = [
          { from: new Date('2025-06-10'), to: new Date('2025-06-20') },
        ];
        const currentDate = new Date('2025-06-25');

        const result = isPersonOnVacation({ person, currentDate });

        expect(result).toBe(false);
      });

      it('should return true when current date equals vacation start date', () => {
        const person = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SENIOR, isHired: true, isOnboarded: true });
        person.vacationsAt = [
          { from: new Date('2025-06-10'), to: new Date('2025-06-20') },
        ];
        const currentDate = new Date('2025-06-10');

        const result = isPersonOnVacation({ person, currentDate });

        expect(result).toBe(true);
      });

      it('should return true when current date equals vacation end date', () => {
        const person = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SENIOR, isHired: true, isOnboarded: true });
        person.vacationsAt = [
          { from: new Date('2025-06-10'), to: new Date('2025-06-20') },
        ];
        const currentDate = new Date('2025-06-20');

        const result = isPersonOnVacation({ person, currentDate });

        expect(result).toBe(true);
      });

      it('should check multiple vacation periods', () => {
        const person = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SENIOR, isHired: true, isOnboarded: true });
        person.vacationsAt = [
          { from: new Date('2025-06-10'), to: new Date('2025-06-15') },
          { from: new Date('2025-08-01'), to: new Date('2025-08-10') },
        ];
        const currentDate = new Date('2025-08-05');

        const result = isPersonOnVacation({ person, currentDate });

        expect(result).toBe(true);
      });

      it('should return false when not in any vacation period', () => {
        const person = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SENIOR, isHired: true, isOnboarded: true });
        person.vacationsAt = [
          { from: new Date('2025-06-10'), to: new Date('2025-06-15') },
          { from: new Date('2025-08-01'), to: new Date('2025-08-10') },
        ];
        const currentDate = new Date('2025-07-15');

        const result = isPersonOnVacation({ person, currentDate });

        expect(result).toBe(false);
      });
    });

    describe('Step 15: Capacity reduction during vacation', () => {
      it('should set capacity to 0 when person is on vacation', () => {
        const person = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SENIOR, isHired: true, isOnboarded: true });
        person.vacationsAt = [
          { from: new Date('2025-06-10'), to: new Date('2025-06-20') },
        ];
        person.availableCapacity = 1;
        const currentDate = new Date('2025-06-15');

        applyVacationToPersonnelCapacity({ personnel: [person], currentDate });

        expect(person.availableCapacity).toBe(0);
      });

      it('should not modify capacity when person is not on vacation', () => {
        const person = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SENIOR, isHired: true, isOnboarded: true });
        person.vacationsAt = [
          { from: new Date('2025-06-10'), to: new Date('2025-06-20') },
        ];
        person.availableCapacity = 1;
        const currentDate = new Date('2025-07-15');

        applyVacationToPersonnelCapacity({ personnel: [person], currentDate });

        expect(person.availableCapacity).toBe(1);
      });

      it('should handle multiple personnel with different vacation status', () => {
        const person1 = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SENIOR, isHired: true, isOnboarded: true });
        person1.vacationsAt = [
          { from: new Date('2025-06-10'), to: new Date('2025-06-20') },
        ];
        person1.availableCapacity = 1;

        const person2 = new Person({ id: 'p2', name: 'Bob', level: LEVEL.MID, isHired: true, isOnboarded: true });
        person2.vacationsAt = [
          { from: new Date('2025-07-01'), to: new Date('2025-07-10') },
        ];
        person2.availableCapacity = 1;

        const currentDate = new Date('2025-06-15');

        applyVacationToPersonnelCapacity({ personnel: [person1, person2], currentDate });

        expect(person1.availableCapacity).toBe(0); // On vacation
        expect(person2.availableCapacity).toBe(1); // Not on vacation
      });

      it('should handle personnel with no vacations', () => {
        const person = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SENIOR, isHired: true, isOnboarded: true });
        person.availableCapacity = 1;
        const currentDate = new Date('2025-06-15');

        applyVacationToPersonnelCapacity({ personnel: [person], currentDate });

        expect(person.availableCapacity).toBe(1);
      });

      it('should set capacity to 0 for all personnel on vacation', () => {
        const person1 = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SENIOR, isHired: true, isOnboarded: true });
        person1.vacationsAt = [
          { from: new Date('2025-06-10'), to: new Date('2025-06-20') },
        ];
        person1.availableCapacity = 1;

        const person2 = new Person({ id: 'p2', name: 'Bob', level: LEVEL.MID, isHired: true, isOnboarded: true });
        person2.vacationsAt = [
          { from: new Date('2025-06-10'), to: new Date('2025-06-20') },
        ];
        person2.availableCapacity = 1;

        const currentDate = new Date('2025-06-15');

        applyVacationToPersonnelCapacity({ personnel: [person1, person2], currentDate });

        expect(person1.availableCapacity).toBe(0);
        expect(person2.availableCapacity).toBe(0);
      });
    });
  });

  describe('Phase 5: Sick Leave Simulation', () => {
    describe('Step 16: Weekly sick probability', () => {
      it('should return true when random value is below sick rate', () => {
        const randomFunc = () => 0.0001; // 0.01% < 0.0389% sick rate
        const sickRate = 0.000389;

        const result = shouldPersonGetSick(sickRate, randomFunc);

        expect(result).toBe(true);
      });

      it('should return false when random value is above sick rate', () => {
        const randomFunc = () => 0.0005; // 0.05% > 0.0389% sick rate
        const sickRate = 0.000389;

        const result = shouldPersonGetSick(sickRate, randomFunc);

        expect(result).toBe(false);
      });

      it('should use default sick rate (0.0389%)', () => {
        const randomFunc = () => 0.0003; // 0.03% < 0.0389%
        const sickRate = DEFAULT_WEEKLY_SICK_CHANCE;

        const result = shouldPersonGetSick(sickRate, randomFunc);

        expect(result).toBe(true);
        expect(sickRate).toBe(0.000389);
      });

      it('should handle edge case at exactly sick rate', () => {
        const randomFunc = () => 0.000389; // Exactly 0.0389%
        const sickRate = 0.000389;

        const result = shouldPersonGetSick(sickRate, randomFunc);

        expect(result).toBe(false); // >= means no sick leave
      });

      it('should always get sick with 100% rate', () => {
        const randomFunc = () => 0.99;
        const sickRate = 1.0;

        const result = shouldPersonGetSick(sickRate, randomFunc);

        expect(result).toBe(true);
      });

      it('should never get sick with 0% rate', () => {
        const randomFunc = () => 0.0;
        const sickRate = 0.0;

        const result = shouldPersonGetSick(sickRate, randomFunc);

        expect(result).toBe(false);
      });

      it('should handle very low probability correctly', () => {
        const randomFunc = () => 0.00001; // Very small random
        const sickRate = 0.000389;

        const result = shouldPersonGetSick(sickRate, randomFunc);

        expect(result).toBe(true);
      });
    });

    describe('Step 17: Sick leave duration', () => {
      it('should generate duration between 1 and 5', () => {
        const randomFunc = () => 0.5;

        const duration = generateSickLeaveDuration(randomFunc);

        expect(duration).toBeGreaterThanOrEqual(1);
        expect(duration).toBeLessThanOrEqual(5);
      });

      it('should generate 1 for very low random value', () => {
        const randomFunc = () => 0.0;

        const duration = generateSickLeaveDuration(randomFunc);

        expect(duration).toBe(1);
      });

      it('should generate 5 for very high random value', () => {
        const randomFunc = () => 0.99;

        const duration = generateSickLeaveDuration(randomFunc);

        expect(duration).toBe(5);
      });

      it('should generate 1 for random value in [0, 0.2)', () => {
        const randomFunc = () => 0.1;

        const duration = generateSickLeaveDuration(randomFunc);

        expect(duration).toBe(1);
      });

      it('should generate 2 for random value in [0.2, 0.4)', () => {
        const randomFunc = () => 0.3;

        const duration = generateSickLeaveDuration(randomFunc);

        expect(duration).toBe(2);
      });

      it('should generate 3 for random value in [0.4, 0.6)', () => {
        const randomFunc = () => 0.5;

        const duration = generateSickLeaveDuration(randomFunc);

        expect(duration).toBe(3);
      });

      it('should generate 4 for random value in [0.6, 0.8)', () => {
        const randomFunc = () => 0.7;

        const duration = generateSickLeaveDuration(randomFunc);

        expect(duration).toBe(4);
      });

      it('should generate 5 for random value in [0.8, 1.0]', () => {
        const randomFunc = () => 0.9;

        const duration = generateSickLeaveDuration(randomFunc);

        expect(duration).toBe(5);
      });
    });
  });

  describe('Phase 6: Hiring and Onboarding', () => {
    describe('Step 18: Hiring status tracking', () => {
      it('should return true when person is hired', () => {
        const person = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SENIOR, isHired: true, isOnboarded: true });

        const result = isPersonHired({ person });

        expect(result).toBe(true);
      });

      it('should return false when person is not hired', () => {
        const person = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SENIOR, isHired: false, isOnboarded: false });

        const result = isPersonHired({ person });

        expect(result).toBe(false);
      });

      it('should exclude unhired personnel from available pool', () => {
        const hired = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SENIOR, isHired: true, isOnboarded: true });
        const unhired = new Person({ id: 'p2', name: 'Bob', level: LEVEL.MID, isHired: false, isOnboarded: false });
        const personnel = [hired, unhired];

        const available = filterHiredPersonnel({ personnel });

        expect(available).toHaveLength(1);
        expect(available).toContain(hired);
        expect(available).not.toContain(unhired);
      });

      it('should handle all personnel hired', () => {
        const person1 = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SENIOR, isHired: true, isOnboarded: true });
        const person2 = new Person({ id: 'p2', name: 'Bob', level: LEVEL.MID, isHired: true, isOnboarded: true });
        const personnel = [person1, person2];

        const available = filterHiredPersonnel({ personnel });

        expect(available).toHaveLength(2);
      });

      it('should handle all personnel unhired', () => {
        const person1 = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SENIOR, isHired: false, isOnboarded: false });
        const person2 = new Person({ id: 'p2', name: 'Bob', level: LEVEL.MID, isHired: false, isOnboarded: false });
        const personnel = [person1, person2];

        const available = filterHiredPersonnel({ personnel });

        expect(available).toHaveLength(0);
      });

      it('should handle empty personnel array', () => {
        const personnel = [];

        const available = filterHiredPersonnel({ personnel });

        expect(available).toHaveLength(0);
      });
    });

    describe('Step 19: Hiring delay simulation', () => {
      it('should return false when hiring not yet complete', () => {
        const person = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SENIOR, isHired: false, isOnboarded: false });
        person.hiringStartWeek = 0;
        const currentWeek = 1;
        const hiringTimeInWeeks = 3;

        const result = isHiringComplete({ person, currentWeek, hiringTimeInWeeks });

        expect(result).toBe(false);
      });

      it('should return true when hiring time has passed', () => {
        const person = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SENIOR, isHired: false, isOnboarded: false });
        person.hiringStartWeek = 0;
        const currentWeek = 3;
        const hiringTimeInWeeks = 3;

        const result = isHiringComplete({ person, currentWeek, hiringTimeInWeeks });

        expect(result).toBe(true);
      });

      it('should return true when current week exceeds hiring time', () => {
        const person = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SENIOR, isHired: false, isOnboarded: false });
        person.hiringStartWeek = 0;
        const currentWeek = 5;
        const hiringTimeInWeeks = 3;

        const result = isHiringComplete({ person, currentWeek, hiringTimeInWeeks });

        expect(result).toBe(true);
      });

      it('should handle person with no hiring start week', () => {
        const person = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SENIOR, isHired: false, isOnboarded: false });
        const currentWeek = 5;
        const hiringTimeInWeeks = 3;

        const result = isHiringComplete({ person, currentWeek, hiringTimeInWeeks });

        expect(result).toBe(false);
      });

      it('should mark person as hired when hiring complete', () => {
        const person = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SENIOR, isHired: false, isOnboarded: false });
        person.hiringStartWeek = 0;
        const currentWeek = 3;
        const hiringTimeInWeeks = 3;

        completeHiring({ person, currentWeek, hiringTimeInWeeks });

        expect(person.hired).toBe(true);
      });

      it('should not mark person as hired when hiring not complete', () => {
        const person = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SENIOR, isHired: false, isOnboarded: false });
        person.hiringStartWeek = 0;
        const currentWeek = 1;
        const hiringTimeInWeeks = 3;

        completeHiring({ person, currentWeek, hiringTimeInWeeks });

        expect(person.hired).toBe(false);
      });

      it('should calculate hire completion week correctly', () => {
        const person = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SENIOR, isHired: false, isOnboarded: false });
        person.hiringStartWeek = 2;
        const hiringTimeInWeeks = 3;

        const completionWeek = calculateHireCompletionWeek({ person, hiringTimeInWeeks });

        expect(completionWeek).toBe(5); // 2 + 3
      });
    });

    describe('Step 20: Onboarding status tracking', () => {
      it('should return true when person is onboarded', () => {
        const person = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SENIOR, isHired: true, isOnboarded: true });

        const result = isPersonOnboarded({ person });

        expect(result).toBe(true);
      });

      it('should return false when person is not onboarded', () => {
        const person = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SENIOR, isHired: true, isOnboarded: false });

        const result = isPersonOnboarded({ person });

        expect(result).toBe(false);
      });

      it('should exclude non-onboarded personnel even if hired', () => {
        const onboarded = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SENIOR, isHired: true, isOnboarded: true });
        const notOnboarded = new Person({ id: 'p2', name: 'Bob', level: LEVEL.MID, isHired: true, isOnboarded: false });
        const personnel = [onboarded, notOnboarded];

        const available = filterOnboardedPersonnel({ personnel });

        expect(available).toHaveLength(1);
        expect(available).toContain(onboarded);
        expect(available).not.toContain(notOnboarded);
      });

      it('should handle all personnel onboarded', () => {
        const person1 = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SENIOR, isHired: true, isOnboarded: true });
        const person2 = new Person({ id: 'p2', name: 'Bob', level: LEVEL.MID, isHired: true, isOnboarded: true });
        const personnel = [person1, person2];

        const available = filterOnboardedPersonnel({ personnel });

        expect(available).toHaveLength(2);
      });

      it('should handle all personnel not onboarded', () => {
        const person1 = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SENIOR, isHired: true, isOnboarded: false });
        const person2 = new Person({ id: 'p2', name: 'Bob', level: LEVEL.MID, isHired: true, isOnboarded: false });
        const personnel = [person1, person2];

        const available = filterOnboardedPersonnel({ personnel });

        expect(available).toHaveLength(0);
      });

      it('should return false when onboarding not yet complete', () => {
        const person = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SENIOR, isHired: true, isOnboarded: false });
        person.onboardingStartWeek = 0;
        const currentWeek = 1;
        const rampUpTimeInWeeks = 3;

        const result = isOnboardingComplete({ person, currentWeek, rampUpTimeInWeeks });

        expect(result).toBe(false);
      });

      it('should return true when onboarding time has passed', () => {
        const person = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SENIOR, isHired: true, isOnboarded: false });
        person.onboardingStartWeek = 0;
        const currentWeek = 3;
        const rampUpTimeInWeeks = 3;

        const result = isOnboardingComplete({ person, currentWeek, rampUpTimeInWeeks });

        expect(result).toBe(true);
      });
    });

    describe('Step 21: Capacity during onboarding', () => {
      it('should set capacity to 0 when person is onboarding', () => {
        const person = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SENIOR, isHired: true, isOnboarded: false });
        person.onboardingWeeksRemaining = 2; // Still onboarding
        person.availableCapacity = 1;

        applyOnboardingCapacityReduction({ personnel: [person] });

        expect(person.availableCapacity).toBe(0);
      });

      it('should not modify capacity when person is fully onboarded', () => {
        const person = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SENIOR, isHired: true, isOnboarded: true });
        person.availableCapacity = 1;
        // No onboardingWeeksRemaining means fully onboarded

        applyOnboardingCapacityReduction({ personnel: [person] });

        expect(person.availableCapacity).toBe(1);
      });

      it('should handle multiple personnel with different onboarding status', () => {
        const onboarding = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SENIOR, isHired: true, isOnboarded: false });
        onboarding.onboardingWeeksRemaining = 2; // Still onboarding
        onboarding.availableCapacity = 1;

        const onboarded = new Person({ id: 'p2', name: 'Bob', level: LEVEL.MID, isHired: true, isOnboarded: true });
        onboarded.availableCapacity = 1;

        applyOnboardingCapacityReduction({ personnel: [onboarding, onboarded] });

        expect(onboarding.availableCapacity).toBe(0); // Set to zero during onboarding
        expect(onboarded.availableCapacity).toBe(1); // Not modified
      });

      it('should not reduce capacity when onboarding complete (counter is 0)', () => {
        const person = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SENIOR, isHired: true, isOnboarded: false });
        person.onboardingWeeksRemaining = 0; // Onboarding complete
        person.availableCapacity = 1;

        applyOnboardingCapacityReduction({ personnel: [person] });

        expect(person.availableCapacity).toBe(1); // No reduction
      });

      it('should handle person with no onboarding counter', () => {
        const person = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SENIOR, isHired: true, isOnboarded: false });
        person.availableCapacity = 1;
        // No onboardingWeeksRemaining set

        applyOnboardingCapacityReduction({ personnel: [person] });

        expect(person.availableCapacity).toBe(1); // No reduction
      });

      it('should set capacity to 0 regardless of current capacity value', () => {
        const person = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SENIOR, isHired: true, isOnboarded: false });
        person.onboardingWeeksRemaining = 2; // Still onboarding
        person.availableCapacity = 0.8; // Already reduced capacity

        applyOnboardingCapacityReduction({ personnel: [person] });

        expect(person.availableCapacity).toBe(0); // Set to 0 during onboarding
      });
    });
  });

  describe('Phase 7: Turnover and Replacement', () => {
    describe('Step 22: Weekly quit probability', () => {
      it('should return true when random value is below quit rate', () => {
        const randomFunc = () => 0.001; // 0.1% < 0.301% quit rate
        const quitRate = 0.00301;

        const result = shouldPersonQuit(quitRate, randomFunc);

        expect(result).toBe(true);
      });

      it('should return false when random value is above quit rate', () => {
        const randomFunc = () => 0.004; // 0.4% > 0.301% quit rate
        const quitRate = 0.00301;

        const result = shouldPersonQuit(quitRate, randomFunc);

        expect(result).toBe(false);
      });

      it('should use default quit rate (0.301%)', () => {
        const randomFunc = () => 0.002; // 0.2% < 0.301%
        const quitRate = DEFAULT_WEEKLY_QUIT_CHANCE;

        const result = shouldPersonQuit(quitRate, randomFunc);

        expect(result).toBe(true);
        expect(quitRate).toBe(0.00301);
      });

      it('should handle edge case at exactly quit rate', () => {
        const randomFunc = () => 0.00301; // Exactly 0.301%
        const quitRate = 0.00301;

        const result = shouldPersonQuit(quitRate, randomFunc);

        expect(result).toBe(false); // >= means no quit
      });

      it('should always quit with 100% rate', () => {
        const randomFunc = () => 0.99;
        const quitRate = 1.0;

        const result = shouldPersonQuit(quitRate, randomFunc);

        expect(result).toBe(true);
      });

      it('should never quit with 0% rate', () => {
        const randomFunc = () => 0.0;
        const quitRate = 0.0;

        const result = shouldPersonQuit(quitRate, randomFunc);

        expect(result).toBe(false);
      });

      it('should handle very low probability correctly', () => {
        const randomFunc = () => 0.00001; // Very small random
        const quitRate = 0.00301;

        const result = shouldPersonQuit(quitRate, randomFunc);

        expect(result).toBe(true);
      });
    });

    describe('Step 23: Personnel departure', () => {
      it('should mark person as departed', () => {
        const person = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SENIOR, isHired: true, isOnboarded: true });
        person.availableCapacity = 1;

        markPersonAsDeparted({ person });

        expect(person.hasDeparted).toBe(true);
      });

      it('should set capacity to 0 when departed', () => {
        const person = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SENIOR, isHired: true, isOnboarded: true });
        person.availableCapacity = 1;

        markPersonAsDeparted({ person });

        expect(person.availableCapacity).toBe(0);
      });

      it('should handle person with partial capacity', () => {
        const person = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SENIOR, isHired: true, isOnboarded: true });
        person.availableCapacity = 0.5;

        markPersonAsDeparted({ person });

        expect(person.hasDeparted).toBe(true);
        expect(person.availableCapacity).toBe(0);
      });

      it('should filter out departed personnel', () => {
        const active = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SENIOR, isHired: true, isOnboarded: true });
        const departed = new Person({ id: 'p2', name: 'Bob', level: LEVEL.MID, isHired: true, isOnboarded: true });
        departed.hasDeparted = true;
        const personnel = [active, departed];

        const result = filterActivePersonnel({ personnel });

        expect(result).toHaveLength(1);
        expect(result).toContain(active);
        expect(result).not.toContain(departed);
      });

      it('should handle all personnel active', () => {
        const person1 = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SENIOR, isHired: true, isOnboarded: true });
        const person2 = new Person({ id: 'p2', name: 'Bob', level: LEVEL.MID, isHired: true, isOnboarded: true });
        const personnel = [person1, person2];

        const result = filterActivePersonnel({ personnel });

        expect(result).toHaveLength(2);
      });

      it('should handle all personnel departed', () => {
        const person1 = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SENIOR, isHired: true, isOnboarded: true });
        person1.hasDeparted = true;
        const person2 = new Person({ id: 'p2', name: 'Bob', level: LEVEL.MID, isHired: true, isOnboarded: true });
        person2.hasDeparted = true;
        const personnel = [person1, person2];

        const result = filterActivePersonnel({ personnel });

        expect(result).toHaveLength(0);
      });
    });

    describe('Step 24: Replacement hiring', () => {
      it('should create replacement with same skills and level', () => {
        const original = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SENIOR, isHired: true, isOnboarded: true });
        original.skills = [
          new Skill({ name: 'Backend', minLevel: LEVEL.SENIOR }),
          new Skill({ name: 'Database', minLevel: LEVEL.MID }),
        ];
        const currentWeek = 5;

        const replacement = createReplacement({ person: original, currentWeek });

        expect(replacement.level).toBe(LEVEL.SENIOR);
        expect(replacement.skills).toHaveLength(2);
        expect(replacement.skills[0].name).toBe('Backend');
        expect(replacement.skills[1].name).toBe('Database');
      });

      it('should set replacement as not hired initially', () => {
        const original = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SENIOR, isHired: true, isOnboarded: true });
        const currentWeek = 5;

        const replacement = createReplacement({ person: original, currentWeek });

        expect(replacement.hired).toBe(false);
      });

      it('should set replacement as not onboarded initially', () => {
        const original = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SENIOR, isHired: true, isOnboarded: true });
        const currentWeek = 5;

        const replacement = createReplacement({ person: original, currentWeek });

        expect(replacement.onboarded).toBe(false);
      });

      it('should set hiring start week to next week (after departure)', () => {
        const original = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SENIOR, isHired: true, isOnboarded: true });
        const currentWeek = 5;

        const replacement = createReplacement({ person: original, currentWeek });

        expect(replacement.hiringStartWeek).toBe(6); // Hiring starts next week
      });

      it('should generate unique ID for replacement', () => {
        const original = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SENIOR, isHired: true, isOnboarded: true });
        const currentWeek = 5;

        const replacement = createReplacement({ person: original, currentWeek });

        expect(replacement.id).toContain('p1-replacement');
      });

      it('should return replacement that caller can add to personnel array', () => {
        const original = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SENIOR, isHired: true, isOnboarded: true });
        const personnel = [original];
        const currentWeek = 5;

        const replacement = createReplacement({ person: original, currentWeek });
        personnel.push(replacement);

        expect(personnel).toHaveLength(2);
        expect(personnel).toContain(replacement);
      });
    });

    describe('Step 25: Replacement onboarding', () => {
      it('should start onboarding when hiring completes', () => {
        const person = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SENIOR, isHired: false, isOnboarded: false });
        person.hiringStartWeek = 0;
        const currentWeek = 3;
        const hiringTimeInWeeks = 3;

        startOnboarding({ person, currentWeek, hiringTimeInWeeks });

        expect(person.onboardingStartWeek).toBe(3);
      });

      it('should not start onboarding if hiring not complete', () => {
        const person = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SENIOR, isHired: false, isOnboarded: false });
        person.hiringStartWeek = 0;
        const currentWeek = 1;
        const hiringTimeInWeeks = 3;

        startOnboarding({ person, currentWeek, hiringTimeInWeeks });

        expect(person.onboardingStartWeek).toBeUndefined();
      });

      it('should mark as onboarded when onboarding completes', () => {
        const person = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SENIOR, isHired: true, isOnboarded: false });
        person.onboardingStartWeek = 0;
        const currentWeek = 4;
        const rampUpTimeInWeeks = 4;

        completeOnboarding({ person, currentWeek, rampUpTimeInWeeks });

        expect(person.onboarded).toBe(true);
      });

      it('should not mark as onboarded when onboarding not complete', () => {
        const person = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SENIOR, isHired: true, isOnboarded: false });
        person.onboardingStartWeek = 0;
        const currentWeek = 2;
        const rampUpTimeInWeeks = 4;

        completeOnboarding({ person, currentWeek, rampUpTimeInWeeks });

        expect(person.onboarded).toBe(false);
      });

      it('should handle person with no onboarding start week', () => {
        const person = new Person({ id: 'p1', name: 'Alice', level: LEVEL.SENIOR, isHired: true, isOnboarded: false });
        const currentWeek = 5;
        const rampUpTimeInWeeks = 4;

        completeOnboarding({ person, currentWeek, rampUpTimeInWeeks });

        expect(person.onboarded).toBe(false);
      });
    });
  });

  describe('Phase 8: Task Start Date Constraints', () => {
    describe('isTaskStartableByDate', () => {
      it('should return true when task has no start date constraint', () => {
        const task = new Task({ id: 't1', title: 'Task', type: TASK_TYPE.USER_STORY });
        const currentDate = new Date('2025-06-10');

        const result = isTaskStartableByDate({ task, currentDate });

        expect(result).toBe(true);
      });

      it('should return false when current date is before start constraint', () => {
        const task = new Task({ id: 't1', title: 'Task', type: TASK_TYPE.USER_STORY });
        task.onlyStartableAt = new Date('2025-06-15');
        const currentDate = new Date('2025-06-10');

        const result = isTaskStartableByDate({ task, currentDate });

        expect(result).toBe(false);
      });

      it('should return true when current date equals start constraint', () => {
        const task = new Task({ id: 't1', title: 'Task', type: TASK_TYPE.USER_STORY });
        task.onlyStartableAt = new Date('2025-06-15');
        const currentDate = new Date('2025-06-15');

        const result = isTaskStartableByDate({ task, currentDate });

        expect(result).toBe(true);
      });

      it('should return true when current date is after start constraint', () => {
        const task = new Task({ id: 't1', title: 'Task', type: TASK_TYPE.USER_STORY });
        task.onlyStartableAt = new Date('2025-06-15');
        const currentDate = new Date('2025-06-20');

        const result = isTaskStartableByDate({ task, currentDate });

        expect(result).toBe(true);
      });
    });

    describe('filterTasksByStartDate', () => {
      it('should filter tasks based on date constraints', () => {
        const task1 = new Task({ id: 't1', title: 'Task 1', type: TASK_TYPE.USER_STORY });
        task1.onlyStartableAt = new Date('2025-06-15');

        const task2 = new Task({ id: 't2', title: 'Task 2', type: TASK_TYPE.USER_STORY });
        task2.onlyStartableAt = new Date('2025-07-01');

        const task3 = new Task({ id: 't3', title: 'Task 3', type: TASK_TYPE.USER_STORY });

        const tasks = [task1, task2, task3];
        const currentDate = new Date('2025-06-20');

        const result = filterTasksByStartDate({ tasks, currentDate });

        expect(result).toHaveLength(2);
        expect(result).toContain(task1);
        expect(result).toContain(task3);
        expect(result).not.toContain(task2);
      });
    });
  });

  describe('Phase 9: Output Generation', () => {
    describe('Step 28: Gantt chart data preparation', () => {
      it('should find iteration at specific percentile by completion week', () => {
        const iterations = [
          { completionWeek: 10, taskCompletionDates: {} },
          { completionWeek: 15, taskCompletionDates: {} },
          { completionWeek: 20, taskCompletionDates: {} },
          { completionWeek: 25, taskCompletionDates: {} },
          { completionWeek: 30, taskCompletionDates: {} },
        ];

        const p50Iteration = findClosestIterationForTargetCompletionWeek({ iterations, targetCompletionWeek: 20 });

        expect(p50Iteration.completionWeek).toBe(20);
      });

      it('should find iteration by target completion week correctly', () => {
        const iterations = Array.from({ length: 100 }, (_, i) => ({
          completionWeek: i + 10,
          taskCompletionDates: {},
        }));

        const iteration = findClosestIterationForTargetCompletionWeek({ iterations, targetCompletionWeek: 99 });

        expect(iteration.completionWeek).toBe(99);
      });

      it('should find closest iteration when exact match not found', () => {
        const iterations = [
          { completionWeek: 10, taskCompletionDates: {} },
          { completionWeek: 20, taskCompletionDates: {} },
          { completionWeek: 30, taskCompletionDates: {} },
        ];

        const iteration = findClosestIterationForTargetCompletionWeek({ iterations, targetCompletionWeek: 22 });

        expect(iteration.completionWeek).toBe(20);
      });

      it('should extract task completion dates from iteration', () => {
        const iteration = {
          completionWeek: 20,
          taskCompletionDates: {
            't1': 5,
            't2': 10,
            't3': 15,
          },
        };

        const timeline = extractTaskTimeline({ iteration });

        expect(timeline).toEqual({
          't1': 5,
          't2': 10,
          't3': 15,
        });
      });

      it('should extract timeline for a target completion week', () => {
        const iterations = [
          { completionWeek: 10, taskCompletionDates: { 't1': 5, 't2': 8 } },
          { completionWeek: 15, taskCompletionDates: { 't1': 7, 't2': 12 } },
          { completionWeek: 20, taskCompletionDates: { 't1': 10, 't2': 15 } },
          { completionWeek: 25, taskCompletionDates: { 't1': 12, 't2': 20 } },
          { completionWeek: 30, taskCompletionDates: { 't1': 15, 't2': 25 } },
        ];

        const result = extractTimelineForTargetCompletionWeek({ iterations, targetCompletionWeek: 20 });

        expect(result).toEqual({ 't1': 10, 't2': 15 });
      });
    });

    describe('Step 29: Gantt chart rendering', () => {
      it('should generate Mermaid Gantt chart code from task timeline', () => {
        const iteration = {
          taskCompletionDates: {
            't1': 5,
            't2': 10,
          },
          workedWeeks: [
            { weekNumber: 1, assignments: [{ taskId: 't1', personId: 'p1', workDone: 3 }] },
            { weekNumber: 2, assignments: [{ taskId: 't1', personId: 'p1', workDone: 2 }] },
            { weekNumber: 3, assignments: [{ taskId: 't2', personId: 'p1', workDone: 5 }] },
          ],
        };

        const task1 = new Task({ id: 't1', title: 'Task 1', type: TASK_TYPE.USER_STORY });
        task1.mostProbableEstimateInRange = 5;
        task1.remainingReworkDuration = 0;

        const task2 = new Task({ id: 't2', title: 'Task 2', type: TASK_TYPE.USER_STORY });
        task2.mostProbableEstimateInRange = 5;
        task2.remainingReworkDuration = 0;

        const tasks = [task1, task2];

        const personnel = [
          new Person({ id: 'p1', name: 'Alice', level: LEVEL.MID, isHired: true, isOnboarded: true }),
        ];

        const startDate = new Date('2025-01-01');

        const code = generateGanttChartCode({ iteration, tasks, personnel, title: 'P50 Timeline', startDate });

        expect(code).toContain('gantt');
        expect(code).toContain('title P50 Timeline');
        expect(code).toContain('Task 1');
        expect(code).toContain('Task 2');
      });

      it('should handle tasks with dependencies in Gantt chart', () => {
        const iteration = {
          taskCompletionDates: {
            't1': 5,
            't2': 10,
          },
          workedWeeks: [
            { weekNumber: 1, assignments: [{ taskId: 't1', personId: 'p1', workDone: 3 }] },
            { weekNumber: 2, assignments: [{ taskId: 't1', personId: 'p1', workDone: 2 }] },
            { weekNumber: 6, assignments: [{ taskId: 't2', personId: 'p1', workDone: 5 }] },
          ],
        };

        const task1 = new Task({ id: 't1', title: 'Task 1', type: TASK_TYPE.USER_STORY });
        task1.mostProbableEstimateInRange = 5;
        task1.remainingReworkDuration = 0;

        const task2 = new Task({ id: 't2', title: 'Task 2', type: TASK_TYPE.USER_STORY });
        task2.dependsOnTasks = ['t1'];
        task2.mostProbableEstimateInRange = 5;
        task2.remainingReworkDuration = 0;

        const tasks = [task1, task2];

        const personnel = [
          new Person({ id: 'p1', name: 'Alice', level: LEVEL.MID, isHired: true, isOnboarded: true }),
        ];

        const startDate = new Date('2025-01-01');

        const code = generateGanttChartCode({ iteration, tasks, personnel, title: 'Timeline', startDate });

        expect(code).toContain('gantt');
        expect(code).toContain('Task 1');
        expect(code).toContain('Task 2');
      });

      it('should include sick leave periods in Gantt chart', () => {
        const iteration = {
          taskCompletionDates: {
            't1': 5,
          },
          workedWeeks: [
            { weekNumber: 1, assignments: [{ taskId: 't1', personId: 'p1', workDone: 3 }] },
          ],
        };

        const task1 = new Task({ id: 't1', title: 'Task 1', type: TASK_TYPE.USER_STORY });
        task1.mostProbableEstimateInRange = 5;
        task1.remainingReworkDuration = 0;

        const tasks = [task1];

        const person = new Person({ id: 'p1', name: 'Alice', level: LEVEL.MID, isHired: true, isOnboarded: true });
        person.sickLeaves = [
          { startWeek: 2, endWeek: 3 },
          { startWeek: 7, endWeek: 8 },
        ];

        const personnel = [person];

        const startDate = new Date('2025-01-01');

        const code = generateGanttChartCode({ iteration, tasks, personnel, title: 'Timeline', startDate });

        expect(code).toContain('section Sick Leaves');
        expect(code).toContain('Alice sick');
        expect(code).toContain('sick-p1-0');
        expect(code).toContain('sick-p1-1');
      });
    });

    describe('Task assignment heuristics', () => {
      it('should assign qualified person to task', () => {
        const task = new Task({ id: 't1', title: 'Task 1', type: TASK_TYPE.USER_STORY });
        task.requiredSkills = [{ name: 'javascript', minLevel: LEVEL.MID }];
        task.remainingDuration = 5;

        const person = new Person({ id: 'p1', name: 'Alice', level: LEVEL.MID, isHired: true, isOnboarded: true });
        person.skills = [{ name: 'javascript', minLevel: LEVEL.MID }];
        person.availableCapacity = 1;

        const assignments = assignTasksToPersonnel({
          tasks: [task],
          personnel: [person],
          assignmentCounts: new Map(),
          skillWorkHistory: new Map(),
        });

        expect(assignments).toHaveLength(1);
        expect(assignments[0].task.id).toBe('t1');
        expect(assignments[0].assignedPerson.id).toBe('p1');
      });

      it('should prefer exact skill match over overqualified', () => {
        const task = new Task({ id: 't1', title: 'Task 1', type: TASK_TYPE.USER_STORY });
        task.requiredSkills = [{ name: 'javascript', minLevel: LEVEL.JUNIOR }];
        task.remainingDuration = 5;

        const juniorDev = new Person({ id: 'p1', name: 'Junior', level: LEVEL.JUNIOR, isHired: true, isOnboarded: true });
        juniorDev.skills = [{ name: 'javascript', minLevel: LEVEL.JUNIOR }];
        juniorDev.availableCapacity = 1;

        const seniorDev = new Person({ id: 'p2', name: 'Senior', level: LEVEL.SENIOR, isHired: true, isOnboarded: true });
        seniorDev.skills = [{ name: 'javascript', minLevel: LEVEL.SENIOR }];
        seniorDev.availableCapacity = 1;

        const assignments = assignTasksToPersonnel({
          tasks: [task],
          personnel: [juniorDev, seniorDev],
          assignmentCounts: new Map(),
          skillWorkHistory: new Map(),
        });

        expect(assignments).toHaveLength(1);
        expect(assignments[0].assignedPerson.id).toBe('p1');
      });

      it('should prefer person with fewer total assignments (workload balancing)', () => {
        const task = new Task({ id: 't1', title: 'Task 1', type: TASK_TYPE.USER_STORY });
        task.requiredSkills = [{ name: 'javascript', minLevel: LEVEL.MID }];
        task.remainingDuration = 5;

        const busyDev = new Person({ id: 'p1', name: 'Busy', level: LEVEL.MID, isHired: true, isOnboarded: true });
        busyDev.skills = [{ name: 'javascript', minLevel: LEVEL.MID }];
        busyDev.availableCapacity = 1;

        const freeDev = new Person({ id: 'p2', name: 'Free', level: LEVEL.MID, isHired: true, isOnboarded: true });
        freeDev.skills = [{ name: 'javascript', minLevel: LEVEL.MID }];
        freeDev.availableCapacity = 1;

        const assignmentCounts = new Map([['p1', 5], ['p2', 1]]);

        const assignments = assignTasksToPersonnel({
          tasks: [task],
          personnel: [busyDev, freeDev],
          assignmentCounts,
          skillWorkHistory: new Map(),
        });

        expect(assignments).toHaveLength(1);
        expect(assignments[0].assignedPerson.id).toBe('p2');
      });

      it('should prefer last assignee for continuity', () => {
        const task = new Task({ id: 't1', title: 'Task 1', type: TASK_TYPE.USER_STORY });
        task.requiredSkills = [{ name: 'javascript', minLevel: LEVEL.MID }];
        task.remainingDuration = 5;
        task.lastAssignee = 'p1';

        const alice = new Person({ id: 'p1', name: 'Alice', level: LEVEL.MID, isHired: true, isOnboarded: true });
        alice.skills = [{ name: 'javascript', minLevel: LEVEL.MID }];
        alice.availableCapacity = 1;

        const bob = new Person({ id: 'p2', name: 'Bob', level: LEVEL.MID, isHired: true, isOnboarded: true });
        bob.skills = [{ name: 'javascript', minLevel: LEVEL.MID }];
        bob.availableCapacity = 1;

        const assignments = assignTasksToPersonnel({
          tasks: [task],
          personnel: [alice, bob],
          assignmentCounts: new Map(),
          skillWorkHistory: new Map(),
        });

        expect(assignments).toHaveLength(1);
        expect(assignments[0].assignedPerson.id).toBe('p1');
      });

      it('should prefer spreading knowledge across team', () => {
        const task = new Task({ id: 't1', title: 'Task 1', type: TASK_TYPE.USER_STORY });
        task.requiredSkills = [{ name: 'javascript', minLevel: LEVEL.MID }];
        task.remainingDuration = 5;

        const alice = new Person({ id: 'p1', name: 'Alice', level: LEVEL.MID, isHired: true, isOnboarded: true });
        alice.skills = [{ name: 'javascript', minLevel: LEVEL.MID }];
        alice.availableCapacity = 1;

        const bob = new Person({ id: 'p2', name: 'Bob', level: LEVEL.MID, isHired: true, isOnboarded: true });
        bob.skills = [{ name: 'javascript', minLevel: LEVEL.MID }];
        bob.availableCapacity = 1;

        // Alice has already worked on javascript, Bob hasn't
        const skillWorkHistory = new Map([['javascript', new Set(['p1'])]]);

        const assignments = assignTasksToPersonnel({
          tasks: [task],
          personnel: [alice, bob],
          assignmentCounts: new Map(),
          skillWorkHistory,
        });

        expect(assignments).toHaveLength(1);
        expect(assignments[0].assignedPerson.id).toBe('p2');
      });

      it('should not assign tasks to people without required skills', () => {
        const task = new Task({ id: 't1', title: 'Task 1', type: TASK_TYPE.USER_STORY });
        task.requiredSkills = [{ name: 'javascript', minLevel: LEVEL.MID }];
        task.remainingDuration = 5;

        const pythonDev = new Person({ id: 'p1', name: 'Python Dev', level: LEVEL.SENIOR, isHired: true, isOnboarded: true });
        pythonDev.skills = [{ name: 'python', minLevel: LEVEL.SENIOR }];
        pythonDev.availableCapacity = 1;

        const assignments = assignTasksToPersonnel({
          tasks: [task],
          personnel: [pythonDev],
          assignmentCounts: new Map(),
          skillWorkHistory: new Map(),
        });

        expect(assignments).toHaveLength(0);
      });

      it('should not assign tasks to people with no capacity', () => {
        const task = new Task({ id: 't1', title: 'Task 1', type: TASK_TYPE.USER_STORY });
        task.remainingDuration = 5;

        const person = new Person({ id: 'p1', name: 'Alice', level: LEVEL.MID, isHired: true, isOnboarded: true });
        person.availableCapacity = 0;

        const assignments = assignTasksToPersonnel({
          tasks: [task],
          personnel: [person],
          assignmentCounts: new Map(),
          skillWorkHistory: new Map(),
        });

        expect(assignments).toHaveLength(0);
      });
    });
  });
});
