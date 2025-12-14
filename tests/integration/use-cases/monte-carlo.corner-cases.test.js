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

describe('Monte Carlo Corner Cases Integration', () => {
  describe('Personnel edge cases', () => {
    it('should throw validation error when no personnel can work on required skills', () => {
      const input = createDeterministicInput();

      // Remove all personnel with backend skills
      input.personnel = input.personnel.filter(p =>
        !p.skills.some(s => s.name === 'backend')
      );

      // Tasks requiring backend (which no one can do) should fail validation before simulation
      expect(() => monteCarloUseCase(input)).toThrow('no personnel can fulfill all requirements');
    });

    it('should handle all personnel starting as not hired', () => {
      const input = createDeterministicInput();

      // Set all personnel to not hired with future start dates
      const futureDate = '2025-02-01';
      for (const person of input.personnel) {
        person.hired = false;
        person.onboarded = false;
        person.startDate = futureDate;
      }

      const result = monteCarloUseCase(input);

      // Should still complete, but take longer due to hiring delay
      expect(result.listOfSimulations).toHaveLength(10);

      // All iterations should complete
      for (const iteration of result.listOfSimulations) {
        expect(iteration.completionWeek).toBeGreaterThan(0);
      }
    });

    it('should handle all personnel needing onboarding', () => {
      const input = createDeterministicInput();

      // Set all personnel to hired but not onboarded
      for (const person of input.personnel) {
        person.hired = true;
        person.onboarded = false;
      }

      const result = monteCarloUseCase(input);

      // Should still complete after onboarding period
      expect(result.listOfSimulations).toHaveLength(10);

      for (const iteration of result.listOfSimulations) {
        expect(iteration.completionWeek).toBeGreaterThan(0);
      }
    });

    it('should handle personnel with overlapping vacations at simulation start', () => {
      const input = createDeterministicInput();

      // Give everyone vacation at the start of simulation
      const vacationStart = '2025-01-15'; // Same as startDate
      const vacationEnd = '2025-01-22';

      for (const person of input.personnel) {
        if (person.hired && person.onboarded) {
          person.vacationsAt = [{ from: vacationStart, to: vacationEnd }];
        }
      }

      const result = monteCarloUseCase(input);

      // Should still complete after vacation ends
      expect(result.listOfSimulations).toHaveLength(10);
    });
  });

  describe('Task edge cases', () => {
    it('should reject tasks with zero estimates', () => {
      const input = createDeterministicInput();

      // Add a leaf task with zero estimate
      input.tasks.push({
        id: 'zero-estimate-task',
        title: 'Zero estimate task',
        type: 'user-story',
        fibonacciEstimate: 0,
        mostProbableEstimateInRange: 0,
        parents: ['epic-auth'],
        dependsOnTasks: [],
        requiredSkills: [],
      });

      // Should throw validation error for zero estimate
      expect(() => monteCarloUseCase(input)).toThrow('has zero estimate');
    });

    it('should handle deep dependency chains', () => {
      const input = createDeterministicInput();

      // Create a chain of 10 dependent tasks
      const chainLength = 10;
      for (let i = 1; i <= chainLength; i++) {
        input.tasks.push({
          id: `chain-task-${i}`,
          title: `Chain Task ${i}`,
          type: 'user-story',
          fibonacciEstimate: 1,
          mostProbableEstimateInRange: 1,
          parents: ['epic-auth'],
          dependsOnTasks: i === 1 ? [] : [`chain-task-${i - 1}`],
          requiredSkills: [],
        });
      }

      const result = monteCarloUseCase(input);

      // Should complete successfully
      expect(result.listOfSimulations).toHaveLength(10);

      // Verify chain order in each iteration
      for (const iteration of result.listOfSimulations) {
        for (let i = 2; i <= chainLength; i++) {
          const prevCompletion = iteration.taskCompletionDates[`chain-task-${i - 1}`];
          const currCompletion = iteration.taskCompletionDates[`chain-task-${i}`];
          expect(currCompletion).toBeGreaterThanOrEqual(prevCompletion);
        }
      }
    });

    it('should handle multiple independent task branches', () => {
      const input = createDeterministicInput();

      // Create 5 independent branches of 3 tasks each
      for (let branch = 1; branch <= 5; branch++) {
        for (let task = 1; task <= 3; task++) {
          input.tasks.push({
            id: `branch-${branch}-task-${task}`,
            title: `Branch ${branch} Task ${task}`,
            type: 'user-story',
            fibonacciEstimate: 2,
            mostProbableEstimateInRange: 2,
            parents: ['epic-auth'],
            dependsOnTasks: task === 1 ? [] : [`branch-${branch}-task-${task - 1}`],
            requiredSkills: [],
          });
        }
      }

      const result = monteCarloUseCase(input);

      // Should complete successfully and parallelize branches
      expect(result.listOfSimulations).toHaveLength(10);
    });

    it('should handle task with no required skills (anyone can work on it)', () => {
      const input = createDeterministicInput();

      // Add task with no skill requirements
      input.tasks.push({
        id: 'no-skills-task',
        title: 'Task requiring no skills',
        type: 'user-story',
        fibonacciEstimate: 5,
        mostProbableEstimateInRange: 4,
        parents: ['epic-auth'],
        dependsOnTasks: [],
        requiredSkills: [],
      });

      const result = monteCarloUseCase(input);

      expect(result.listOfSimulations).toHaveLength(10);

      for (const iteration of result.listOfSimulations) {
        expect(iteration.taskCompletionDates['no-skills-task']).toBeDefined();
      }
    });

    it('should handle taskSplitRate of 0 (no change requests)', () => {
      const input = createDeterministicInput();
      input.globalParams.taskSplitRate = 0;

      const result = monteCarloUseCase(input);

      expect(result.listOfSimulations).toHaveLength(10);

      // No change requests should be created
      for (const iteration of result.listOfSimulations) {
        const crTasks = Object.keys(iteration.taskCompletionDates)
          .filter(id => id.startsWith('change-request-'));
        expect(crTasks).toHaveLength(0);
      }
    });

    it('should handle high taskSplitRate (50%)', () => {
      const input = createDeterministicInput();
      input.globalParams.taskSplitRate = 0.5;

      const result = monteCarloUseCase(input);

      expect(result.listOfSimulations).toHaveLength(10);

      // Many change requests should be created
      for (const iteration of result.listOfSimulations) {
        const crTasks = Object.keys(iteration.taskCompletionDates)
          .filter(id => id.startsWith('change-request-'));
        expect(crTasks.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Global params edge cases', () => {
    it('should handle very high rework rates', () => {
      const input = createDeterministicInput();

      // Set high rework rates for all levels
      input.globalParams.reworkRateByLevel = {
        intern: 0.5,
        junior: 0.4,
        mid: 0.3,
        senior: 0.2,
        specialist: 0.15,
      };

      const result = monteCarloUseCase(input);

      // Should still complete, but take longer
      expect(result.listOfSimulations).toHaveLength(10);
    });

    it('should handle lower than default velocity rates', () => {
      const input = createDeterministicInput({ numIterations: 10 });

      // Set moderately low velocity (not extreme, to keep simulation time reasonable)
      input.globalParams.velocityByLevel = {
        intern: 0.5,
        junior: 0.6,
        mid: 0.7,
        senior: 0.8,
        specialist: 0.9,
      };

      const result = monteCarloUseCase(input);

      // Should still complete, but take longer
      expect(result.listOfSimulations).toHaveLength(10);
    });
  });
});
