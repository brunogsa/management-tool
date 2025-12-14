import { readFileSync, writeFileSync } from 'fs';

import monteCarloUseCase from '../use-cases/monte-carlo.js';
import renderImage from '../utils/image-renderer.js';
import { info } from '../utils/logger.js';


function _generateReport({ completionWeekPercentiles, numIterations, startDate }) {
  const formatDate = (weeksFromStart) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + weeksFromStart * 7);
    return date.toISOString().split('T')[0];
  };

  const lines = [
    '# Monte Carlo Simulation Report',
    '',
    '## Simulation Parameters',
    '',
    `- **Start Date:** ${startDate.toISOString().split('T')[0]}`,
    `- **Number of Iterations:** ${numIterations.toLocaleString()}`,
    '',
    '## Completion Date Predictions',
    '',
    '| Percentile | Completion Week | Estimated Date | Interpretation |',
    '|------------|-----------------|----------------|----------------|',
    `| 50th (P50) | Week ${completionWeekPercentiles.p50} | ${formatDate(completionWeekPercentiles.p50)} | Median - 50% chance of completing by this date |`,
    `| 75th (P75) | Week ${completionWeekPercentiles.p75} | ${formatDate(completionWeekPercentiles.p75)} | 75% chance of completing by this date |`,
    `| 90th (P90) | Week ${completionWeekPercentiles.p90} | ${formatDate(completionWeekPercentiles.p90)} | High confidence - 90% chance |`,
    `| 95th (P95) | Week ${completionWeekPercentiles.p95} | ${formatDate(completionWeekPercentiles.p95)} | Very high confidence - 95% chance |`,
    `| 99th (P99) | Week ${completionWeekPercentiles.p99} | ${formatDate(completionWeekPercentiles.p99)} | Near certain - 99% chance |`,
    '',
    '## How to Interpret These Results',
    '',
    '- **P50 (Median):** Use this for internal planning. Half of simulations finished before this point.',
    '- **P75:** A reasonable commitment date with some buffer.',
    '- **P90:** Recommended for external commitments to stakeholders.',
    '- **P95/P99:** Use these when you need very high confidence or contractual guarantees.',
    '',
    '## Gantt Charts',
    '',
    'The following Gantt charts show the task timeline for each percentile:',
    '',
    '- `simulation_50th.png` - Median scenario',
    '- `simulation_75th.png` - 75th percentile scenario',
    '- `simulation_90th.png` - 90th percentile scenario',
    '- `simulation_95th.png` - 95th percentile scenario',
    '- `simulation_99th.png` - 99th percentile scenario',
    '',
  ];

  return lines.join('\n');
}

async function _generateGanttOutputFiles(ganttCharts, outputFilepath) {
  const renderPromises = ganttCharts.map(async ({ identifier, mermaidCode }) => {
    const diagramName = `simulation_${identifier}`;
    const diagramFilepath = `${outputFilepath}/${diagramName}.mmd`;

    writeFileSync(diagramFilepath, mermaidCode);

    await renderImage(
      diagramFilepath,
      diagramName,
      outputFilepath,
    );
  });

  await Promise.all(renderPromises);
}

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
      ganttCharts,
    } = monteCarloUseCase(inputData);

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

    // Generate report
    const startDate = new Date(inputData.globalParams.startDate);
    const numIterations = inputData.globalParams.numOfMonteCarloIterations;

    const reportContent = _generateReport({ completionWeekPercentiles, numIterations, startDate });
    const reportFilepath = `${outputFilepath}/report.md`;
    writeFileSync(reportFilepath, reportContent);

    info('Report generated', { reportFilepath });

    // Save simulations data for inspection and analysis
    const simulationsFilepath = `${outputFilepath}/simulations.json`;
    writeFileSync(simulationsFilepath, JSON.stringify(listOfSimulations, null, 2));
    info('Simulations data saved', { simulationsFilepath });

    info('Generating Gantt charts', { chartCount: ganttCharts.length });

    await _generateGanttOutputFiles(ganttCharts, outputFilepath);

    info('Gantt charts generated', {
      charts: ganttCharts.map(g => `simulation_${g.identifier}.png`),
      outputFilepath,
    });

  } catch (error) {
    console.error('Failed to perform Monte Carlo simulation:', error);
  }
}

export default monteCarloCommand;
