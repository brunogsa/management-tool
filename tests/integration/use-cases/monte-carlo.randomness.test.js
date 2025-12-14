import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
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

describe('Monte Carlo Randomness Integration', () => {
  describe('With randomness enabled', () => {
    let originalRandom;

    beforeEach(() => {
      originalRandom = Math.random;
      // Seed-like deterministic random for testing
      let seed = 12345;
      Math.random = () => {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed / 0x7fffffff;
      };
    });

    afterEach(() => {
      Math.random = originalRandom;
    });

    it('should handle sick leave when enabled', async () => {
      const input = loadInputTemplate();
      input.globalParams.numOfMonteCarloIterations = 10;
      input.globalParams.sickRate = 0.1; // 10% weekly sick rate for testing
      input.globalParams.turnOverRate = 0;

      const result = await monteCarloUseCase(input);

      // Should still complete all iterations
      expect(result.listOfSimulations).toHaveLength(10);

      // Each iteration should have a valid completion week
      for (const iteration of result.listOfSimulations) {
        expect(iteration.completionWeek).toBeGreaterThan(0);
      }
    });

    it('should handle task split rate when enabled', async () => {
      const input = loadInputTemplate();
      input.globalParams.numOfMonteCarloIterations = 10;
      input.globalParams.sickRate = 0;
      input.globalParams.turnOverRate = 0;
      // Template already has taskSplitRate: 0.15

      const result = await monteCarloUseCase(input);

      // Should still complete all iterations
      expect(result.listOfSimulations).toHaveLength(10);
    });

    it('should produce varied results across iterations due to seeded randomness', async () => {
      const input = loadInputTemplate();
      input.globalParams.numOfMonteCarloIterations = 10;
      input.globalParams.sickRate = 0.05;
      input.globalParams.turnOverRate = 0.01;

      const result = await monteCarloUseCase(input);

      // With randomness enabled, completion weeks should vary across iterations
      const completionWeeks = result.listOfSimulations.map(s => s.completionWeek);
      const uniqueWeeks = new Set(completionWeeks);

      // With 10 iterations and random events, we expect some variation
      expect(uniqueWeeks.size).toBeGreaterThan(1);
    });
  });

  describe('Turnover handling', () => {
    let originalRandom;

    beforeEach(() => {
      originalRandom = Math.random;
    });

    afterEach(() => {
      Math.random = originalRandom;
    });

    it('should handle moderate turnover rate', async () => {
      // Deterministic random that triggers some turnover
      let callCount = 0;
      Math.random = () => {
        callCount++;
        // Return low value every 50th call to trigger occasional turnover
        return callCount % 50 === 0 ? 0.001 : 0.999;
      };

      const input = loadInputTemplate();
      input.globalParams.numOfMonteCarloIterations = 10;
      input.globalParams.sickRate = 0;
      input.globalParams.turnOverRate = 0.05; // 5% weekly turnover

      const result = await monteCarloUseCase(input);

      // Should complete despite turnover
      expect(result.listOfSimulations).toHaveLength(10);

      for (const iteration of result.listOfSimulations) {
        expect(iteration.completionWeek).toBeGreaterThan(0);
      }
    });

    it('should create replacements when personnel quit', async () => {
      // Always trigger turnover for first person
      let callCount = 0;
      Math.random = () => {
        callCount++;
        // First random call per week triggers turnover
        return callCount % 10 === 1 ? 0.0001 : 0.999;
      };

      const input = loadInputTemplate();
      input.globalParams.numOfMonteCarloIterations = 10;
      input.globalParams.sickRate = 0;
      input.globalParams.turnOverRate = 0.1;

      const result = await monteCarloUseCase(input);

      // Should still complete
      expect(result.listOfSimulations).toHaveLength(10);
    });
  });
});
