import { readFileSync, writeFileSync } from 'fs';

import monteCarloUseCase from '../use-cases/monte-carlo.js';
import { generateReport } from '../utils/monte-carlo.js';
import { info } from '../utils/logger.js';


async function monteCarloCommand(inputJsonFilepath, outputFilepath) {
  try {
    info('Reading input file', { inputJsonFilepath });

    const inputData = JSON.parse(
      readFileSync(inputJsonFilepath, 'utf8')
    );

    info('Input validation passed', {
      taskCount: inputData.tasks.length,
      personnelCount: inputData.personnel.length,
      numIterations: inputData.globalParams.numOfMonteCarloIterations,
      startDate: inputData.globalParams.startDate,
      taskSplitRate: inputData.globalParams.taskSplitRate,
    });

    const memBefore = process.memoryUsage();
    const startTime = Date.now();

    const {
      listOfSimulations,
      completionWeekPercentiles,
      percentileDetails,
    } = await monteCarloUseCase(inputData, { useParallel: true });

    const duration = Date.now() - startTime;
    const memAfter = process.memoryUsage();

    info('Performance metrics', {
      durationMs: duration,
      iterationsPerSec: Math.round(listOfSimulations.length / (duration / 1000)),
      heapUsedBeforeMB: Math.round(memBefore.heapUsed / 1024 / 1024),
      heapUsedAfterMB: Math.round(memAfter.heapUsed / 1024 / 1024),
      heapDeltaMB: Math.round((memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024),
      rssMB: Math.round(memAfter.rss / 1024 / 1024),
    });

    info('Monte Carlo simulation completed', {
      numIterations: listOfSimulations.length,
      percentiles: completionWeekPercentiles,
    });

    // Generate per-percentile reports
    const startDate = new Date(inputData.globalParams.startDate);
    const numIterations = inputData.globalParams.numOfMonteCarloIterations;
    const reportFilepaths = [];

    for (const detail of percentileDetails) {
      const reportContent = generateReport({
        workedWeeks: detail.workedWeeks,
        taskCompletionDates: detail.taskCompletionDates,
        tasks: detail.tasks,
        personnel: detail.personnel,
        globalParams: detail.globalParams,
        startDate,
        percentile: detail.percentile,
        completionWeek: detail.completionWeek,
        completionWeekPercentiles,
        numIterations,
      });

      const reportFilepath = `${outputFilepath}/report_${detail.percentile}th.md`;
      writeFileSync(reportFilepath, reportContent);
      reportFilepaths.push(reportFilepath);
    }

    info('Reports generated', { reportFilepaths });

  } catch (error) {
    console.error('Failed to perform Monte Carlo simulation:', error);
  }
}

export default monteCarloCommand;
