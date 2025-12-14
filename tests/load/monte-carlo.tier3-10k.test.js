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

describe('Monte Carlo Load Tests - Tier 3 (10,000 iterations)', () => {
  let originalRandom;

  beforeEach(() => {
    originalRandom = Math.random;
  });

  afterEach(() => {
    Math.random = originalRandom;
  });

  it('should handle 10,000 iterations within performance budget', () => {
    Math.random = createSeededRandom(11111);

    const input = loadInputTemplate();
    input.globalParams.numOfMonteCarloIterations = 10000;
    input.globalParams.sickRate = 0.05;
    input.globalParams.turnOverRate = 0.01;

    const startTime = Date.now();
    const result = monteCarloUseCase(input);
    const duration = Date.now() - startTime;

    // Performance: 10K iterations should complete in < 90 seconds
    expect(duration).toBeLessThan(90000);

    expect(result.listOfSimulations).toHaveLength(10000);

    const { p50, p75, p90, p95, p99 } = result.completionWeekPercentiles;
    expect(p50).toBeLessThanOrEqual(p75);
    expect(p75).toBeLessThanOrEqual(p90);
    expect(p90).toBeLessThanOrEqual(p95);
    expect(p95).toBeLessThanOrEqual(p99);

    expect(result.ganttCharts).toHaveLength(5);

    console.log(`Tier 3: 10K iterations in ${duration}ms (${Math.round(10000 / (duration / 1000))} iter/sec)`);
  });

  it('should have stable percentile estimates at 10,000 iterations', () => {
    Math.random = createSeededRandom(22222);

    const input = loadInputTemplate();
    input.globalParams.numOfMonteCarloIterations = 10000;
    input.globalParams.sickRate = 0.03;
    input.globalParams.turnOverRate = 0.02;

    const result = monteCarloUseCase(input);

    const completionWeeks = result.listOfSimulations.map(s => s.completionWeek);
    const mean = completionWeeks.reduce((a, b) => a + b, 0) / completionWeeks.length;
    const variance = completionWeeks.reduce((sum, w) => sum + Math.pow(w - mean, 2), 0) / completionWeeks.length;
    const stdDev = Math.sqrt(variance);

    const { p50 } = result.completionWeekPercentiles;

    // With 10K samples, p50 should be very close to mean
    expect(Math.abs(p50 - mean)).toBeLessThan(stdDev);

    // Coefficient of variation should be reasonable
    const cv = stdDev / mean;
    expect(cv).toBeLessThan(0.5);
  });
});
