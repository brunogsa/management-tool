import { describe, it, expect } from '@jest/globals';
import { generateReport } from '../../../src/utils/monte-carlo.js';
import { Task, TASK_TYPE, Person, Skill, LEVEL, DEFAULT_VELOCITY_RATE, DEFAULT_REWORK_RATE, DEFAULT_WEEKLY_SICK_CHANCE, DEFAULT_WEEKLY_QUIT_CHANCE, DEFAULT_TIME_TO_HIRE, DEFAULT_TIME_TO_RAMPUP } from '../../../src/models.js';

// Minimal realistic fixture for generateReport tests
// Personnel covers: active, departed, hiring, onboarding, sick
function createTestFixture() {
  const startDate = new Date(2025, 0, 6); // January 6, 2025

  // Tasks: 1 epic container + 2 leaf tasks
  const epic = new Task({ id: 'epic-1', title: 'Epic One', type: TASK_TYPE.EPIC });
  epic.allDescendantTasks = ['task-1', 'task-2'];
  epic.totalRealisticEstimate = 6;

  const task1 = new Task({ id: 'task-1', title: 'Build Feature A', type: TASK_TYPE.USER_STORY });
  task1.mostProbableEstimateInRange = 3;
  task1.parents = ['epic-1'];
  task1.totalNumOfBlocks = 1;
  task1.requiredSkills = [new Skill({ name: 'frontend', minLevel: LEVEL.MID })];

  const task2 = new Task({ id: 'task-2', title: 'Build Feature B', type: TASK_TYPE.USER_STORY });
  task2.mostProbableEstimateInRange = 3;
  task2.parents = ['epic-1'];
  task2.dependsOnTasks = ['task-1'];
  task2.totalNumOfBlocks = 0;
  task2.requiredSkills = [new Skill({ name: 'frontend', minLevel: LEVEL.MID })];

  const tasks = [epic, task1, task2];

  // -- Personnel --

  // Alice: active, got sick during week 2 (recovered by week 3)
  const alice = new Person({ id: 'alice', name: 'Alice', level: LEVEL.SENIOR, isHired: true, isOnboarded: true });
  alice.skills = [new Skill({ name: 'frontend', minLevel: LEVEL.SENIOR })];
  alice.sickLeaves = [{ startWeek: 2, endWeek: 2 }];

  // Bob: departed at week 3
  const bob = new Person({ id: 'bob', name: 'Bob', level: LEVEL.MID, isHired: true, isOnboarded: true });
  bob.skills = [new Skill({ name: 'frontend', minLevel: LEVEL.MID })];
  bob.hasDeparted = true;
  bob.departureWeek = 3;

  // Carol: still being hired (not yet hired), hiringStartWeek = 1
  const carol = new Person({ id: 'carol', name: 'Carol', level: LEVEL.JUNIOR, isHired: false, isOnboarded: false });
  carol.skills = [new Skill({ name: 'frontend', minLevel: LEVEL.JUNIOR })];
  carol.hiringStartWeek = 1;

  // Dave: hired but still onboarding (not yet onboarded)
  const dave = new Person({ id: 'dave', name: 'Dave', level: LEVEL.MID, isHired: true, isOnboarded: false });
  dave.skills = [new Skill({ name: 'frontend', minLevel: LEVEL.MID })];
  dave.onboardingWeeksRemaining = 2;

  const personnel = [alice, bob, carol, dave];

  const globalParams = {
    velocityByLevel: { ...DEFAULT_VELOCITY_RATE },
    reworkRateByLevel: { ...DEFAULT_REWORK_RATE },
    sickRate: DEFAULT_WEEKLY_SICK_CHANCE,
    turnOverRate: DEFAULT_WEEKLY_QUIT_CHANCE,
    timeToHireByLevel: { ...DEFAULT_TIME_TO_HIRE },
    timeToRampUpByLevel: { ...DEFAULT_TIME_TO_RAMPUP },
    taskSplitRate: 0.15,
  };

  // workedWeeks with assignments + unavailabilities covering all statuses
  const workedWeeks = [
    {
      weekNumber: 1,
      assignments: [
        {
          taskId: 'task-1',
          taskTitle: 'Build Feature A',
          personId: 'alice',
          personName: 'Alice',
          personLevel: LEVEL.SENIOR,
          workDone: 1.0,
          workDoneOnOriginal: 0.95,
          workDoneOnRework: 0.05,
          taskRemainingDuration: 2.0,
          taskRemainingRework: 0.05,
        },
        {
          taskId: 'task-1',
          taskTitle: 'Build Feature A',
          personId: 'bob',
          personName: 'Bob',
          personLevel: LEVEL.MID,
          workDone: 1.1,
          workDoneOnOriginal: 1.0,
          workDoneOnRework: 0.1,
          taskRemainingDuration: 1.0,
          taskRemainingRework: 0.13,
        },
      ],
      unavailabilities: [
        { personId: 'carol', personName: 'Carol', status: 'hiring' },
        { personId: 'dave', personName: 'Dave', status: 'onboarding' },
      ],
    },
    {
      weekNumber: 2,
      assignments: [
        {
          taskId: 'task-1',
          taskTitle: 'Build Feature A',
          personId: 'bob',
          personName: 'Bob',
          personLevel: LEVEL.MID,
          workDone: 1.1,
          workDoneOnOriginal: 0.97,
          workDoneOnRework: 0.13,
          taskRemainingDuration: 0,
          taskRemainingRework: 0,
        },
      ],
      unavailabilities: [
        { personId: 'alice', personName: 'Alice', status: 'recovering' },
        { personId: 'carol', personName: 'Carol', status: 'hiring' },
        { personId: 'dave', personName: 'Dave', status: 'onboarding' },
      ],
    },
    {
      weekNumber: 3,
      assignments: [
        {
          taskId: 'task-2',
          taskTitle: 'Build Feature B',
          personId: 'alice',
          personName: 'Alice',
          personLevel: LEVEL.SENIOR,
          workDone: 1.0,
          workDoneOnOriginal: 0.95,
          workDoneOnRework: 0.05,
          taskRemainingDuration: 2.0,
          taskRemainingRework: 0.05,
        },
      ],
      unavailabilities: [
        { personId: 'carol', personName: 'Carol', status: 'hiring' },
      ],
    },
    {
      weekNumber: 4,
      assignments: [
        {
          taskId: 'task-2',
          taskTitle: 'Build Feature B',
          personId: 'alice',
          personName: 'Alice',
          personLevel: LEVEL.SENIOR,
          workDone: 1.0,
          workDoneOnOriginal: 0.95,
          workDoneOnRework: 0.05,
          taskRemainingDuration: 1.0,
          taskRemainingRework: 0.05,
        },
      ],
      unavailabilities: [
        { personId: 'dave', personName: 'Dave', status: 'blocked' },
      ],
    },
    {
      weekNumber: 5,
      assignments: [
        {
          taskId: 'task-2',
          taskTitle: 'Build Feature B',
          personId: 'alice',
          personName: 'Alice',
          personLevel: LEVEL.SENIOR,
          workDone: 1.05,
          workDoneOnOriginal: 1.0,
          workDoneOnRework: 0.05,
          taskRemainingDuration: 0,
          taskRemainingRework: 0,
        },
      ],
    },
  ];

  const taskCompletionDates = {
    'task-1': 2,
    'task-2': 5,
  };

  const completionWeekPercentiles = {
    p50: 5,
    p75: 7,
    p90: 9,
    p95: 11,
    p99: 14,
  };

  return {
    workedWeeks,
    taskCompletionDates,
    tasks,
    personnel,
    globalParams,
    startDate,
    percentile: 50,
    completionWeek: 5,
    completionWeekPercentiles,
    numIterations: 10000,
  };
}

describe('generateReport', () => {
  describe('structure and sections', () => {
    it('should return a string containing all major section headers', () => {
      const fixture = createTestFixture();

      const report = generateReport(fixture);

      expect(report).toContain('# Monte Carlo Simulation Report');
      expect(report).toContain('### Project Overview');
      expect(report).toContain('### Personnel');
      expect(report).toContain('### Task Execution Order');
      expect(report).toContain('### Per-Task Detail');
      expect(report).toContain('### Per-Person Summary');
      expect(report).toContain('### Weekly Timeline');
    });

    it('should include the percentile label in the report title', () => {
      const fixture = createTestFixture();

      const report = generateReport(fixture);

      expect(report).toContain('## 50th Percentile Scenario');
    });

    it('should include start date and end date in project overview', () => {
      const fixture = createTestFixture();

      const report = generateReport(fixture);

      expect(report).toContain('**Start Date:** 2025-01-06');
      expect(report).toContain('**End Date (50th):**');
    });

    it('should include number of iterations', () => {
      const fixture = createTestFixture();

      const report = generateReport(fixture);

      expect(report).toContain('10,000');
    });
  });

  describe('project overview / totals', () => {
    it('should compute and display total effort from assignments', () => {
      const fixture = createTestFixture();

      const report = generateReport(fixture);

      expect(report).toContain('**Total Effort:**');
      expect(report).toMatch(/Total Effort:\*\* \d+\.\d+ dev-weeks/);
    });

    it('should compute and display total rework from assignments', () => {
      const fixture = createTestFixture();

      const report = generateReport(fixture);

      expect(report).toContain('**Total Rework:**');
      expect(report).toMatch(/Total Rework:\*\* \d+\.\d+ dev-weeks/);
    });

    it('should display CR count and effort when change-request tasks exist', () => {
      const fixture = createTestFixture();

      const crTask = new Task({ id: 'change-request-1', title: 'Change Request: 1', type: TASK_TYPE.USER_STORY });
      crTask.mostProbableEstimateInRange = 2;
      fixture.tasks.push(crTask);

      const report = generateReport(fixture);

      expect(report).toContain('**Total CRs:** 1 tasks, 2.00 dev-weeks');
    });

    it('should display vacation, sick, hiring, onboarding weeks', () => {
      const fixture = createTestFixture();

      const report = generateReport(fixture);

      expect(report).toContain('**Total Vacations:**');
      expect(report).toContain('**Total Sick:**');
      expect(report).toContain('**Total Hiring:**');
      expect(report).toContain('**Total Onboarding:**');
    });

    it('should count sick weeks from personnel sickLeaves', () => {
      const fixture = createTestFixture();

      const report = generateReport(fixture);

      // Alice has 1 sick week (startWeek: 2, endWeek: 2 -> 1 week)
      expect(report).toContain('**Total Sick:** 1 dev-weeks');
    });

    it('should count hiring weeks from personnel with hiringStartWeek', () => {
      const fixture = createTestFixture();

      const report = generateReport(fixture);

      // Carol (junior) has hiringStartWeek, DEFAULT_TIME_TO_HIRE for junior = 4
      expect(report).toContain('**Total Hiring:** 4 dev-weeks');
    });
  });

  describe('week date display offset', () => {
    it('should display week dates as start-of-week (weekNumber - 1 offset from startDate)', () => {
      const fixture = createTestFixture();

      const report = generateReport(fixture);

      expect(report).toContain('**Week 1** (2025-01-06)');
      expect(report).toContain('**Week 2** (2025-01-13)');
      expect(report).toContain('**Week 3** (2025-01-20)');
    });

    it('should display percentile dates with start-of-week offset', () => {
      const fixture = createTestFixture();

      const report = generateReport(fixture);

      expect(report).toContain('Week 5 - 2025-02-03');
    });

    it('should display project end date with start-of-week offset', () => {
      const fixture = createTestFixture();

      const report = generateReport(fixture);

      expect(report).toContain('**End Date (50th):** 2025-02-03');
    });

    it('should display departure date with start-of-week offset', () => {
      const fixture = createTestFixture();

      const report = generateReport(fixture);

      const lines = report.split('\n');
      const bobRow = lines.find(l => l.includes('| Bob |'));
      expect(bobRow).toContain('2025-01-20');
    });
  });

  describe('percentile table', () => {
    it('should include a markdown table with all percentile rows', () => {
      const fixture = createTestFixture();

      const report = generateReport(fixture);

      expect(report).toContain('| Percentile | Completion Week | Interpretation |');
      expect(report).toContain('50th (P50)');
      expect(report).toContain('75th (P75)');
      expect(report).toContain('90th (P90)');
      expect(report).toContain('95th (P95)');
      expect(report).toContain('99th (P99)');
    });

    it('should display formatted dates for each percentile week', () => {
      const fixture = createTestFixture();

      const report = generateReport(fixture);

      // p50 = week 5 from 2025-01-06
      expect(report).toMatch(/50th \(P50\).*Week 5/);
    });
  });

  describe('personnel overview', () => {
    it('should list all personnel with name, level, skills, start date', () => {
      const fixture = createTestFixture();

      const report = generateReport(fixture);

      expect(report).toContain('| Alice |');
      expect(report).toContain('| Bob |');
      expect(report).toContain('| Carol |');
      expect(report).toContain('| Dave |');
      expect(report).toContain(LEVEL.SENIOR);
      expect(report).toContain(LEVEL.MID);
      expect(report).toContain(LEVEL.JUNIOR);
      expect(report).toContain('frontend');
    });

    it('should show Departed status for departed personnel', () => {
      const fixture = createTestFixture();

      const report = generateReport(fixture);

      expect(report).toContain('| Departed |');
      expect(report).toContain('| Active |');
    });

    it('should show departure date for departed personnel', () => {
      const fixture = createTestFixture();

      const report = generateReport(fixture);

      // Bob departed at week 3; should have a date, not "-"
      // The row for Bob should contain a formatted departure date
      const lines = report.split('\n');
      const bobRow = lines.find(l => l.includes('| Bob |'));
      expect(bobRow).toBeDefined();
      expect(bobRow).toContain('Departed');
      // Departure date should not be "-"
      expect(bobRow).not.toMatch(/\| - \| Departed \|/);
    });
  });

  describe('task execution order', () => {
    it('should list tasks sorted by start week', () => {
      const fixture = createTestFixture();

      const report = generateReport(fixture);

      const task1Pos = report.indexOf('Build Feature A');
      const task2Pos = report.indexOf('Build Feature B');

      expect(task1Pos).toBeLessThan(task2Pos);
    });

    it('should include task type, title, blocks count, start/end weeks', () => {
      const fixture = createTestFixture();

      const report = generateReport(fixture);

      expect(report).toContain(TASK_TYPE.USER_STORY);
      expect(report).toContain('Build Feature A');
      expect(report).toContain('| ID | Type | Title | Blocks | Start | End |');
    });
  });

  describe('per-task detail', () => {
    it('should show estimate, actual effort, rework for each task', () => {
      const fixture = createTestFixture();

      const report = generateReport(fixture);

      expect(report).toContain('[user-story] task-1: Build Feature A');
      expect(report).toContain('**Estimate:** 3 dev-weeks');
      expect(report).toContain('**Actual Effort:**');
      expect(report).toContain('**Rework:**');
    });

    it('should show per-person contribution table for each task', () => {
      const fixture = createTestFixture();

      const report = generateReport(fixture);

      expect(report).toContain('| Person | Level | Work Done | Rework Done |');
    });

    it('should compute container task metrics from descendants', () => {
      const fixture = createTestFixture();

      const report = generateReport(fixture);

      expect(report).toContain('[epic] epic-1: Epic One');
      expect(report).toContain('**Estimate:** 6 dev-weeks');
    });
  });

  describe('per-person summary', () => {
    it('should show tasks worked, total contribution, rework for each person', () => {
      const fixture = createTestFixture();

      const report = generateReport(fixture);

      expect(report).toContain('#### Alice (senior)');
      expect(report).toContain('**Tasks Worked:**');
      expect(report).toContain('**Total Contribution:**');
      expect(report).toContain('**Total Rework Generated:**');
    });

    it('should show sick weeks and vacation weeks', () => {
      const fixture = createTestFixture();

      const report = generateReport(fixture);

      expect(report).toContain('**Sick Weeks:**');
      expect(report).toContain('**Vacation Weeks:**');
    });

    it('should include departed personnel with departure label', () => {
      const fixture = createTestFixture();

      const report = generateReport(fixture);

      expect(report).toContain('#### Bob (mid)');
      expect(report).toContain('[Departed at');
    });

    it('should include personnel who are still hiring or onboarding', () => {
      const fixture = createTestFixture();

      const report = generateReport(fixture);

      expect(report).toContain('#### Carol (junior)');
      expect(report).toContain('#### Dave (mid)');
    });
  });

  describe('weekly timeline', () => {
    it('should list each week with date and personnel count', () => {
      const fixture = createTestFixture();

      const report = generateReport(fixture);

      expect(report).toContain('**Week 1**');
      expect(report).toContain('**Week 2**');
      expect(report).toContain('**Week 3**');
      expect(report).toContain('personnel active');
    });

    it('should show assignment details per week (person, task, work done)', () => {
      const fixture = createTestFixture();

      const report = generateReport(fixture);

      expect(report).toContain('| Person | Task | Work Done | Rework Done | Remaining Task Effort | Remaining Rework |');
      expect(report).toContain('| Alice |');
      expect(report).toContain('| Build Feature A |');
    });

    it('should show hiring unavailability', () => {
      const fixture = createTestFixture();

      const report = generateReport(fixture);

      expect(report).toContain('Carol');
      expect(report).toContain('Hiring');
    });

    it('should show onboarding unavailability', () => {
      const fixture = createTestFixture();

      const report = generateReport(fixture);

      expect(report).toContain('Dave');
      expect(report).toContain('Onboarding');
    });

    it('should show sick (recovering) unavailability', () => {
      const fixture = createTestFixture();

      const report = generateReport(fixture);

      expect(report).toContain('Recovering (sick)');
    });

    it('should show blocked unavailability in weekly timeline', () => {
      const fixture = createTestFixture();

      const report = generateReport(fixture);

      expect(report).toContain('Blocked (no tasks available)');
    });
  });

  describe('blocked dev-weeks', () => {
    it('should display Total Blocked in project overview', () => {
      const fixture = createTestFixture();

      const report = generateReport(fixture);

      // Dave is blocked in week 4 (1 dev-week)
      expect(report).toContain('**Total Blocked:** 1 dev-weeks');
    });

    it('should show blocked weeks in per-person summary', () => {
      const fixture = createTestFixture();

      const report = generateReport(fixture);

      expect(report).toContain('**Blocked Weeks:**');
    });
  });
});
