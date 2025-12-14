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

describe('Monte Carlo Load Tests - Tier 2 (1,000 iterations)', () => {
  let originalRandom;

  beforeEach(() => {
    originalRandom = Math.random;
  });

  afterEach(() => {
    Math.random = originalRandom;
  });

  it('should handle 1,000 iterations and produce stable percentiles', async () => {
    Math.random = createSeededRandom(123456);

    const input = loadInputTemplate();
    input.globalParams.numOfMonteCarloIterations = 1000;
    input.globalParams.sickRate = 0.03;
    input.globalParams.turnOverRate = 0.01;

    const startTime = Date.now();
    const result = await monteCarloUseCase(input);
    const duration = Date.now() - startTime;

    // Performance: 1,000 iterations should complete in < 30 seconds
    expect(duration).toBeLessThan(30000);

    expect(result.listOfSimulations).toHaveLength(1000);

    const { p50, p75, p90, p95, p99 } = result.completionWeekPercentiles;
    expect(p50).toBeLessThanOrEqual(p75);
    expect(p75).toBeLessThanOrEqual(p90);
    expect(p90).toBeLessThanOrEqual(p95);
    expect(p95).toBeLessThanOrEqual(p99);

    for (const iteration of result.listOfSimulations) {
      expect(iteration.completionWeek).toBeGreaterThan(0);
    }
  });

  it('should demonstrate statistical convergence at 1,000 iterations', async () => {
    Math.random = createSeededRandom(987654);

    const input = loadInputTemplate();
    input.globalParams.numOfMonteCarloIterations = 1000;
    input.globalParams.sickRate = 0.05;
    input.globalParams.turnOverRate = 0;

    const result = await monteCarloUseCase(input);

    const completionWeeks = result.listOfSimulations.map(s => s.completionWeek);
    const mean = completionWeeks.reduce((a, b) => a + b, 0) / completionWeeks.length;
    const variance = completionWeeks.reduce((sum, w) => sum + Math.pow(w - mean, 2), 0) / completionWeeks.length;
    const stdDev = Math.sqrt(variance);

    const { p50, p99 } = result.completionWeekPercentiles;

    // p50 should be close to mean
    expect(Math.abs(p50 - mean)).toBeLessThan(stdDev * 2);

    // p99 should be above mean
    expect(p99).toBeGreaterThanOrEqual(mean);

    // Standard deviation should exist
    expect(stdDev).toBeGreaterThan(0);
  });
});
