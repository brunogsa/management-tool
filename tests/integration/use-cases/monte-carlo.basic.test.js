import { describe, it, expect } from '@jest/globals';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import monteCarloUseCase from '../../../src/use-cases/monte-carlo.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load the real input-template.json for all tests
const loadInputTemplate = () => {
  const templatePath = join(__dirname, '../../../input-template.json');
  return JSON.parse(readFileSync(templatePath, 'utf8'));
};

// Create deterministic input (no randomness) for stable tests
const createDeterministicInput = ({ numIterations = 10 } = {}) => {
  const input = loadInputTemplate();
  input.globalParams.numOfMonteCarloIterations = numIterations;
  input.globalParams.sickRate = 0;
  input.globalParams.turnOverRate = 0;
  return input;
};

describe('Monte Carlo Basic Integration', () => {
  describe('Basic simulation flow', () => {
    it('should complete simulation and return expected structure', async () => {
      const input = createDeterministicInput();

      const result = await monteCarloUseCase(input);

      expect(result).toHaveProperty('listOfSimulations');
      expect(result).toHaveProperty('completionWeekPercentiles');
      expect(result).toHaveProperty('percentileDetails');
    });

    it('should run the specified number of iterations', async () => {
      const input = createDeterministicInput({ numIterations: 10 });

      const result = await monteCarloUseCase(input);

      expect(result.listOfSimulations).toHaveLength(10);
    });

    it('should calculate percentiles for p50, p75, p90, p95, p99', async () => {
      const input = createDeterministicInput();

      const result = await monteCarloUseCase(input);

      expect(result.completionWeekPercentiles).toHaveProperty('p50');
      expect(result.completionWeekPercentiles).toHaveProperty('p75');
      expect(result.completionWeekPercentiles).toHaveProperty('p90');
      expect(result.completionWeekPercentiles).toHaveProperty('p95');
      expect(result.completionWeekPercentiles).toHaveProperty('p99');
    });

    it('should generate percentile details for each percentile', async () => {
      const input = createDeterministicInput();

      const result = await monteCarloUseCase(input);

      expect(result.percentileDetails).toHaveLength(5);
      expect(result.percentileDetails.map(d => d.percentile)).toEqual([
        50, 75, 90, 95, 99,
      ]);
    });
  });

  describe('Iteration results', () => {
    it('should track completion week for each iteration', async () => {
      const input = createDeterministicInput();

      const result = await monteCarloUseCase(input);

      for (const iteration of result.listOfSimulations) {
        expect(iteration).toHaveProperty('completionWeek');
        expect(typeof iteration.completionWeek).toBe('number');
        expect(iteration.completionWeek).toBeGreaterThan(0);
      }
    });

    it('should track task completion dates for each iteration', async () => {
      const input = createDeterministicInput();

      const result = await monteCarloUseCase(input);

      for (const iteration of result.listOfSimulations) {
        expect(iteration).toHaveProperty('taskCompletionDates');
        expect(typeof iteration.taskCompletionDates).toBe('object');
      }
    });

    it('should store seed for deterministic replay (workedWeeks skipped for memory optimization)', async () => {
      const input = createDeterministicInput();

      const result = await monteCarloUseCase(input);

      for (const iteration of result.listOfSimulations) {
        // workedWeeks is skipped for memory optimization, but seed is stored for replay
        expect(iteration).toHaveProperty('seed');
        expect(typeof iteration.seed).toBe('number');
      }
    });
  });

  describe('Percentile ordering', () => {
    it('should have p50 <= p75 <= p90 <= p95 <= p99', async () => {
      const input = createDeterministicInput();

      const result = await monteCarloUseCase(input);
      const { p50, p75, p90, p95, p99 } = result.completionWeekPercentiles;

      expect(p50).toBeLessThanOrEqual(p75);
      expect(p75).toBeLessThanOrEqual(p90);
      expect(p90).toBeLessThanOrEqual(p95);
      expect(p95).toBeLessThanOrEqual(p99);
    });
  });

  describe('Task dependencies', () => {
    it('should complete dependent tasks after their dependencies', async () => {
      const input = createDeterministicInput();

      const result = await monteCarloUseCase(input);

      for (const iteration of result.listOfSimulations) {
        const { taskCompletionDates } = iteration;

        // story-login depends on task-auth-infra
        if (taskCompletionDates['story-login'] && taskCompletionDates['task-auth-infra']) {
          expect(taskCompletionDates['story-login']).toBeGreaterThanOrEqual(
            taskCompletionDates['task-auth-infra']
          );
        }

        // bug-search-pagination depends on story-browse-products
        if (taskCompletionDates['bug-search-pagination'] && taskCompletionDates['story-browse-products']) {
          expect(taskCompletionDates['bug-search-pagination']).toBeGreaterThanOrEqual(
            taskCompletionDates['story-browse-products']
          );
        }

        // milestone-production depends on milestone-mvp
        // This is a container, so we check the downstream task completions
        if (taskCompletionDates['story-checkout'] && taskCompletionDates['story-login']) {
          // story-checkout is under milestone-production which depends on milestone-mvp
          // story-login is under milestone-mvp
          expect(taskCompletionDates['story-checkout']).toBeGreaterThanOrEqual(
            taskCompletionDates['story-login']
          );
        }
      }
    });
  });

  describe('Percentile details', () => {
    it('should include completion data for each percentile', async () => {
      const input = createDeterministicInput();

      const result = await monteCarloUseCase(input);

      for (const detail of result.percentileDetails) {
        expect(detail).toHaveProperty('percentile');
        expect(detail).toHaveProperty('completionWeek');
        expect(detail).toHaveProperty('workedWeeks');
        expect(detail).toHaveProperty('taskCompletionDates');
      }
    });
  });

  describe('Deterministic behavior with no randomness', () => {
    it('should complete all iterations in the same number of weeks when deterministic', async () => {
      const input = createDeterministicInput();

      const result = await monteCarloUseCase(input);
      const completionWeeks = result.listOfSimulations.map(s => s.completionWeek);
      const uniqueWeeks = [...new Set(completionWeeks)];

      // All iterations should finish in the same week when there's no randomness
      expect(uniqueWeeks).toHaveLength(1);
    });

    it('should produce stable percentiles when no randomness', async () => {
      const input = createDeterministicInput();

      const result = await monteCarloUseCase(input);

      // With no randomness, all iterations complete in same week
      // Percentile interpolation may produce slightly different fractional values,
      // but they should all round to the same integer week
      const { p50, p75, p90, p95, p99 } = result.completionWeekPercentiles;

      const roundedP50 = Math.round(p50);
      expect(Math.round(p75)).toBe(roundedP50);
      expect(Math.round(p90)).toBe(roundedP50);
      expect(Math.round(p95)).toBe(roundedP50);
      expect(Math.round(p99)).toBe(roundedP50);
    });
  });

  describe('Personnel lifecycle', () => {
    it('should handle personnel with startDate (hiring during simulation)', async () => {
      const input = createDeterministicInput();

      // David Chen has startDate: "2025-02-15" and hired: false
      const david = input.personnel.find(p => p.id === 'dev-david');
      expect(david).toBeDefined();
      expect(david.hired).toBe(false);
      expect(david.startDate).toBe('2025-02-15');

      const result = await monteCarloUseCase(input);

      // Simulation should complete successfully
      expect(result.listOfSimulations).toHaveLength(10);

      // All iterations should have valid completion weeks
      for (const iteration of result.listOfSimulations) {
        expect(iteration.completionWeek).toBeGreaterThan(0);
      }
    });

    it('should handle personnel in onboarding (hired but not onboarded)', async () => {
      const input = createDeterministicInput();

      // Carol Martinez has hired: true, onboarded: false
      const carol = input.personnel.find(p => p.id === 'dev-carol');
      expect(carol).toBeDefined();
      expect(carol.hired).toBe(true);
      expect(carol.onboarded).toBe(false);

      const result = await monteCarloUseCase(input);

      // Simulation should complete successfully
      expect(result.listOfSimulations).toHaveLength(10);
    });

    it('should handle vacation periods', async () => {
      const input = createDeterministicInput();

      // Alice has a vacation from 2025-03-10 to 2025-03-17
      const alice = input.personnel.find(p => p.id === 'dev-alice');
      expect(alice).toBeDefined();
      expect(alice.vacationsAt).toHaveLength(1);

      const result = await monteCarloUseCase(input);

      // Simulation should complete successfully
      expect(result.listOfSimulations).toHaveLength(10);
    });
  });

  describe('Task constraints', () => {
    it('should handle task with onlyStartableAt constraint', async () => {
      const input = createDeterministicInput();

      // spike-q2-features has onlyStartableAt: "2025-04-01"
      const q2Spike = input.tasks.find(t => t.id === 'spike-q2-features');
      expect(q2Spike).toBeDefined();
      expect(q2Spike.onlyStartableAt).toBe('2025-04-01');

      const result = await monteCarloUseCase(input);

      // Simulation should complete successfully
      expect(result.listOfSimulations).toHaveLength(10);

      // The Q2 spike should be completed in all iterations
      for (const iteration of result.listOfSimulations) {
        expect(iteration.taskCompletionDates['spike-q2-features']).toBeDefined();

        // Q2 spike starts April 1, 2025. Simulation starts Jan 15, 2025.
        // That's approximately 11 weeks difference.
        // The task should not complete before week 11.
        expect(iteration.taskCompletionDates['spike-q2-features']).toBeGreaterThanOrEqual(11);
      }
    });
  });

  describe('Change requests', () => {
    it('should generate change requests when taskSplitRate is set', async () => {
      const input = createDeterministicInput();

      // Template has taskSplitRate: 0.15
      expect(input.globalParams.taskSplitRate).toBe(0.15);

      const result = await monteCarloUseCase(input);

      // Simulation should complete successfully
      expect(result.listOfSimulations).toHaveLength(10);

      // Change request tasks should be completed
      for (const iteration of result.listOfSimulations) {
        // At least one change request should exist
        const crTasks = Object.keys(iteration.taskCompletionDates)
          .filter(id => id.startsWith('change-request-'));
        expect(crTasks.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Task completion', () => {
    it('should complete all user stories from the template', async () => {
      const input = createDeterministicInput();

      const userStoryIds = input.tasks
        .filter(t => t.type === 'user-story')
        .map(t => t.id);

      const result = await monteCarloUseCase(input);

      for (const iteration of result.listOfSimulations) {
        for (const storyId of userStoryIds) {
          expect(iteration.taskCompletionDates[storyId]).toBeDefined();
          expect(iteration.taskCompletionDates[storyId]).toBeGreaterThan(0);
        }
      }
    });

    it('should complete all leaf tasks (non-container tasks)', async () => {
      const input = createDeterministicInput();

      const containerTypes = ['project', 'milestone', 'epic'];
      const leafTaskIds = input.tasks
        .filter(t => !containerTypes.includes(t.type))
        .map(t => t.id);

      const result = await monteCarloUseCase(input);

      for (const iteration of result.listOfSimulations) {
        for (const taskId of leafTaskIds) {
          expect(iteration.taskCompletionDates[taskId]).toBeDefined();
          expect(iteration.taskCompletionDates[taskId]).toBeGreaterThan(0);
        }
      }
    });
  });
});
