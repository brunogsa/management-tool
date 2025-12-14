import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import monteCarloUseCase from '../../src/use-cases/monte-carlo.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const loadInputTemplate = () => {
  const templatePath = join(__dirname, '../../input-template.json');
  return JSON.parse(readFileSync(templatePath, 'utf8'));
};

const createSeededRandom = (seed) => {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
};

describe('Monte Carlo Load Tests - Tier 1 (100 iterations)', () => {
  let originalRandom;

  beforeEach(() => {
    originalRandom = Math.random;
  });

  afterEach(() => {
    Math.random = originalRandom;
  });

  it('should produce variation in completion weeks with randomness enabled', () => {
    Math.random = createSeededRandom(42);

    const input = loadInputTemplate();
    input.globalParams.numOfMonteCarloIterations = 100;
    input.globalParams.sickRate = 0.05;
    input.globalParams.turnOverRate = 0;

    const result = monteCarloUseCase(input);

    const completionWeeks = result.listOfSimulations.map(s => s.completionWeek);
    const uniqueWeeks = [...new Set(completionWeeks)];

    expect(uniqueWeeks.length).toBeGreaterThan(1);
  });

  it('should maintain percentile ordering', () => {
    Math.random = createSeededRandom(777);

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

  it('should complete all iterations with combined sick leave and turnover', () => {
    Math.random = createSeededRandom(54321);

    const input = loadInputTemplate();
    input.globalParams.numOfMonteCarloIterations = 100;
    input.globalParams.sickRate = 0.08;
    input.globalParams.turnOverRate = 0.03;

    const result = monteCarloUseCase(input);

    expect(result.listOfSimulations).toHaveLength(100);

    for (const iteration of result.listOfSimulations) {
      expect(iteration.completionWeek).toBeGreaterThan(0);
      expect(iteration.completionWeek).toBeLessThan(1000);
    }
  });

  it('should produce consistent results with same seed', () => {
    const runSimulation = () => {
      Math.random = createSeededRandom(99999);

      const input = loadInputTemplate();
      input.globalParams.numOfMonteCarloIterations = 100;
      input.globalParams.sickRate = 0.03;
      input.globalParams.turnOverRate = 0.01;

      return monteCarloUseCase(input);
    };

    const result1 = runSimulation();
    const result2 = runSimulation();

    expect(result1.completionWeekPercentiles).toEqual(result2.completionWeekPercentiles);
  });
});
