import { readFileSync, writeFileSync } from 'fs';

import monteCarloUseCase from '../use-cases/monte-carlo.js';
import renderImage from '../utils/image-renderer.js';


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
    const inputData = JSON.parse(
      readFileSync(inputJsonFilepath, 'utf8')
    );

    console.log('Running Monte Carlo simulation...');

    const { listOfSimulations, ganttCharts } = monteCarloUseCase(inputData);

    console.log('Monte Carlo simulation completed successfully!');

    console.debug(JSON.stringify(listOfSimulations, null, 2));

    console.log('Generating Gantt charts...');

    await _generateGanttOutputFiles(ganttCharts, outputFilepath);

    console.log('Gantt charts successfully generated!');

  } catch (error) {
    console.error('Failed to perform Monte Carlo simulation:', error);
  }
}

export default monteCarloCommand;
