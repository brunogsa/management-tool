import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import monteCarloUseCase from '../../src/use-cases/monte-carlo.js';
import { deepClone } from '../../src/utils/graph.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load the real input-template.json for all tests
const loadInputTemplate = () => {
  const templatePath = join(__dirname, '../../input-template.json');
  return JSON.parse(readFileSync(templatePath, 'utf8'));
};

describe('Monte Carlo Load Tests', () => {
  // These tests use higher iteration counts and validate performance
  // Run separately with: yarn test:load
  // Purpose: validate performance at scale and ensure statistical accuracy

  let originalRandom;

  beforeEach(() => {
    originalRandom = Math.random;
  });

  afterEach(() => {
    Math.random = originalRandom;
  });

  describe('Statistical validation tests', () => {
    it('should produce variation in completion weeks with randomness enabled', () => {
      let seed = 42;
      Math.random = () => {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed / 0x7fffffff;
      };

      const input = loadInputTemplate();
      input.globalParams.numOfMonteCarloIterations = 50;
      input.globalParams.sickRate = 0.05;
      input.globalParams.turnOverRate = 0;

      const result = monteCarloUseCase(input);

      const completionWeeks = result.listOfSimulations.map(s => s.completionWeek);
      const uniqueWeeks = [...new Set(completionWeeks)];

      // With randomness, we expect some variation in completion weeks
      expect(uniqueWeeks.length).toBeGreaterThan(1);
    });

    it('should have percentile spread increase with more randomness', () => {
      let seed = 12345;
      Math.random = () => {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed / 0x7fffffff;
      };

      const inputLow = loadInputTemplate();
      inputLow.globalParams.numOfMonteCarloIterations = 30;
      inputLow.globalParams.sickRate = 0.01;
      inputLow.globalParams.turnOverRate = 0;

      seed = 12345;
      const resultLow = monteCarloUseCase(inputLow);
      const spreadLow = resultLow.completionWeekPercentiles.p99 - resultLow.completionWeekPercentiles.p50;

      const inputHigh = loadInputTemplate();
      inputHigh.globalParams.numOfMonteCarloIterations = 30;
      inputHigh.globalParams.sickRate = 0.15;
      inputHigh.globalParams.turnOverRate = 0;

      seed = 12345;
      const resultHigh = monteCarloUseCase(inputHigh);
      const spreadHigh = resultHigh.completionWeekPercentiles.p99 - resultHigh.completionWeekPercentiles.p50;

      expect(spreadHigh).toBeGreaterThanOrEqual(spreadLow);
    });

    it('should produce consistent results across multiple runs with same seed', () => {
      const runSimulation = () => {
        let seed = 99999;
        Math.random = () => {
          seed = (seed * 1103515245 + 12345) & 0x7fffffff;
          return seed / 0x7fffffff;
        };

        const input = loadInputTemplate();
        input.globalParams.numOfMonteCarloIterations = 20;
        input.globalParams.sickRate = 0.03;
        input.globalParams.turnOverRate = 0.01;

        return monteCarloUseCase(deepClone(input));
      };

      const result1 = runSimulation();
      const result2 = runSimulation();
      const result3 = runSimulation();

      expect(result1.completionWeekPercentiles).toEqual(result2.completionWeekPercentiles);
      expect(result2.completionWeekPercentiles).toEqual(result3.completionWeekPercentiles);
    });

    it('should maintain percentile ordering regardless of randomness', () => {
      let seed = 777;
      Math.random = () => {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed / 0x7fffffff;
      };

      const input = loadInputTemplate();
      input.globalParams.numOfMonteCarloIterations = 100;
      input.globalParams.sickRate = 0.1;
      input.globalParams.turnOverRate = 0.02;

      const result = monteCarloUseCase(input);
      const { p50, p75, p90, p95, p99 } = result.completionWeekPercentiles;

      expect(p50).toBeLessThanOrEqual(p75);
      expect(p75).toBeLessThanOrEqual(p90);
      expect(p90).toBeLessThanOrEqual(p95);
      expect(p95).toBeLessThanOrEqual(p99);
    });

    it('should complete all iterations even with combined sick leave and turnover', () => {
      let seed = 54321;
      Math.random = () => {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed / 0x7fffffff;
      };

      const input = loadInputTemplate();
      input.globalParams.numOfMonteCarloIterations = 30;
      input.globalParams.sickRate = 0.08;
      input.globalParams.turnOverRate = 0.03;

      const result = monteCarloUseCase(input);

      expect(result.listOfSimulations).toHaveLength(30);

      for (const iteration of result.listOfSimulations) {
        expect(iteration.completionWeek).toBeGreaterThan(0);
        expect(iteration.completionWeek).toBeLessThan(1000);
      }
    });
  });

  describe('Medium-scale tests (500-2000 iterations)', () => {
    it('should handle 500 iterations and demonstrate statistical convergence', () => {
      let seed = 987654;
      Math.random = () => {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed / 0x7fffffff;
      };

      const input = loadInputTemplate();
      input.globalParams.numOfMonteCarloIterations = 500;
      input.globalParams.sickRate = 0.05;
      input.globalParams.turnOverRate = 0;

      const result = monteCarloUseCase(input);

      // With 500 iterations, we should see a reasonable distribution
      const completionWeeks = result.listOfSimulations.map(s => s.completionWeek);

      // Calculate mean and standard deviation
      const mean = completionWeeks.reduce((a, b) => a + b, 0) / completionWeeks.length;
      const variance = completionWeeks.reduce((sum, w) => sum + Math.pow(w - mean, 2), 0) / completionWeeks.length;
      const stdDev = Math.sqrt(variance);

      // Percentiles should be within reasonable range of mean
      const { p50, p99 } = result.completionWeekPercentiles;

      // p50 should be close to mean (within 2 std devs for normal-ish distribution)
      expect(Math.abs(p50 - mean)).toBeLessThan(stdDev * 2);

      // p99 should be above mean
      expect(p99).toBeGreaterThanOrEqual(mean);

      // Standard deviation should exist (not zero) indicating real variation
      expect(stdDev).toBeGreaterThan(0);
    });

    it('should handle 1000 iterations and produce stable percentiles', () => {
      let seed = 123456;
      Math.random = () => {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed / 0x7fffffff;
      };

      const input = loadInputTemplate();
      input.globalParams.numOfMonteCarloIterations = 1000;
      input.globalParams.sickRate = 0.03;
      input.globalParams.turnOverRate = 0.01;

      const startTime = Date.now();
      const result = monteCarloUseCase(input);
      const duration = Date.now() - startTime;

      // Performance check: 1000 iterations should complete in reasonable time
      expect(duration).toBeLessThan(60000); // 60 seconds max

      // All iterations should complete
      expect(result.listOfSimulations).toHaveLength(1000);

      // Percentiles should be properly ordered
      const { p50, p75, p90, p95, p99 } = result.completionWeekPercentiles;
      expect(p50).toBeLessThanOrEqual(p75);
      expect(p75).toBeLessThanOrEqual(p90);
      expect(p90).toBeLessThanOrEqual(p95);
      expect(p95).toBeLessThanOrEqual(p99);

      // All iterations should have valid completion weeks
      for (const iteration of result.listOfSimulations) {
        expect(iteration.completionWeek).toBeGreaterThan(0);
      }
    });

    it('should handle 2000 iterations with high randomness parameters', () => {
      let seed = 11111;
      Math.random = () => {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed / 0x7fffffff;
      };

      const input = loadInputTemplate();
      input.globalParams.numOfMonteCarloIterations = 2000;
      input.globalParams.sickRate = 0.08;
      input.globalParams.turnOverRate = 0.02;

      const startTime = Date.now();
      const result = monteCarloUseCase(input);
      const duration = Date.now() - startTime;

      // Should complete in reasonable time
      expect(duration).toBeLessThan(120000); // 2 minutes max

      expect(result.listOfSimulations).toHaveLength(2000);

      // With high randomness, expect wider spread between p50 and p99
      const { p50, p99 } = result.completionWeekPercentiles;
      const spread = p99 - p50;
      expect(spread).toBeGreaterThan(0);

      // All Gantt charts should be generated
      expect(result.ganttCharts).toHaveLength(5);
    });
  });

  describe('Production-scale tests (1 million iterations)', () => {
    it('should handle 1 million iterations within performance budget', () => {
      let seed = 314159;
      Math.random = () => {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed / 0x7fffffff;
      };

      const input = loadInputTemplate();
      input.globalParams.numOfMonteCarloIterations = 1000000;
      input.globalParams.sickRate = 0.03;
      input.globalParams.turnOverRate = 0.01;

      const startTime = Date.now();
      const result = monteCarloUseCase(input);
      const duration = Date.now() - startTime;

      // Performance budget: 1M iterations must complete within 5 minutes
      // This equates to ~3,333 iterations/second minimum throughput
      const PERFORMANCE_BUDGET_MS = 300000; // 5 minutes
      const iterationsPerSecond = Math.round(1000000 / (duration / 1000));

      console.log('\n=== Production Load Test Results ===');
      console.log(`Duration: ${duration}ms for 1M iterations`);
      console.log(`Throughput: ${iterationsPerSecond} iterations/second`);
      console.log(`Memory usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);

      expect(duration).toBeLessThan(PERFORMANCE_BUDGET_MS);

      // All iterations should complete
      expect(result.listOfSimulations).toHaveLength(1000000);

      // Percentiles should be properly ordered
      const { p50, p75, p90, p95, p99 } = result.completionWeekPercentiles;
      expect(p50).toBeLessThanOrEqual(p75);
      expect(p75).toBeLessThanOrEqual(p90);
      expect(p90).toBeLessThanOrEqual(p95);
      expect(p95).toBeLessThanOrEqual(p99);

      console.log(`Percentiles: p50=${p50}, p75=${p75}, p90=${p90}, p95=${p95}, p99=${p99}`);

      // Verify reasonable completion week range
      expect(p50).toBeGreaterThan(0);
      expect(p99).toBeLessThan(500);

      // Statistical validation with 1M samples
      const completionWeeks = result.listOfSimulations.map(s => s.completionWeek);
      const mean = completionWeeks.reduce((a, b) => a + b, 0) / completionWeeks.length;
      const variance = completionWeeks.reduce((sum, w) => sum + Math.pow(w - mean, 2), 0) / completionWeeks.length;
      const stdDev = Math.sqrt(variance);

      console.log(`Statistics: mean=${mean.toFixed(2)}, stdDev=${stdDev.toFixed(2)}`);
      console.log('=====================================\n');

      // p50 should be very close to mean with 1M samples
      expect(Math.abs(p50 - mean)).toBeLessThan(stdDev);

      // Coefficient of variation should be reasonable
      const coefficientOfVariation = stdDev / mean;
      expect(coefficientOfVariation).toBeLessThan(1);

      // All Gantt charts should be generated
      expect(result.ganttCharts).toHaveLength(5);
    });
  });
});
