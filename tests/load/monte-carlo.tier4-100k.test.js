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

describe('Monte Carlo Load Tests - Tier 4 (100,000 iterations)', () => {
  let originalRandom;

  beforeEach(() => {
    originalRandom = Math.random;
  });

  afterEach(() => {
    Math.random = originalRandom;
  });

  it('should handle 100,000 iterations within performance budget', () => {
    Math.random = createSeededRandom(314159);

    const input = loadInputTemplate();
    input.globalParams.numOfMonteCarloIterations = 100000;
    input.globalParams.sickRate = 0.03;
    input.globalParams.turnOverRate = 0.01;

    const startTime = Date.now();
    const result = monteCarloUseCase(input);
    const duration = Date.now() - startTime;

    // Performance budget: 100K iterations should complete in < 10 minutes
    const PERFORMANCE_BUDGET_MS = 600000;
    const iterationsPerSecond = Math.round(100000 / (duration / 1000));

    console.log('\n=== Tier 4 Load Test Results ===');
    console.log(`Duration: ${duration}ms for 100K iterations`);
    console.log(`Throughput: ${iterationsPerSecond} iterations/second`);
    console.log(`Memory usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);

    expect(duration).toBeLessThan(PERFORMANCE_BUDGET_MS);

    expect(result.listOfSimulations).toHaveLength(100000);

    const { p50, p75, p90, p95, p99 } = result.completionWeekPercentiles;
    expect(p50).toBeLessThanOrEqual(p75);
    expect(p75).toBeLessThanOrEqual(p90);
    expect(p90).toBeLessThanOrEqual(p95);
    expect(p95).toBeLessThanOrEqual(p99);

    console.log(`Percentiles: p50=${p50}, p75=${p75}, p90=${p90}, p95=${p95}, p99=${p99}`);

    expect(p50).toBeGreaterThan(0);
    expect(p99).toBeLessThan(500);

    expect(result.ganttCharts).toHaveLength(5);
    console.log('================================\n');
  });

  it('should have excellent statistical precision at 100,000 iterations', () => {
    Math.random = createSeededRandom(271828);

    const input = loadInputTemplate();
    input.globalParams.numOfMonteCarloIterations = 100000;
    input.globalParams.sickRate = 0.05;
    input.globalParams.turnOverRate = 0.02;

    const result = monteCarloUseCase(input);

    const completionWeeks = result.listOfSimulations.map(s => s.completionWeek);
    const mean = completionWeeks.reduce((a, b) => a + b, 0) / completionWeeks.length;
    const variance = completionWeeks.reduce((sum, w) => sum + Math.pow(w - mean, 2), 0) / completionWeeks.length;
    const stdDev = Math.sqrt(variance);

    const { p50 } = result.completionWeekPercentiles;

    console.log(`Statistics: mean=${mean.toFixed(2)}, stdDev=${stdDev.toFixed(2)}, p50=${p50}`);

    // With 100K samples, p50 should be extremely close to mean
    expect(Math.abs(p50 - mean)).toBeLessThan(stdDev * 0.5);

    // Coefficient of variation should be reasonable
    const cv = stdDev / mean;
    expect(cv).toBeLessThan(1);
  });
});
