import { readFileSync, writeFileSync } from 'fs';

import inputValidator from '../utils/input-validator.js';
import { runMonteCarloSimulation } from '../utils/monte-carlo.js';
import { generateGanttChart } from '../utils/mermaid-code-generator.js';
import renderImage from '../utils/image-renderer.js';

async function monteCarlo(inputJsonFilepath, outputFilepath) {
  try {
    const inputData = JSON.parse(readFileSync(inputJsonFilepath, 'utf8'));
    inputValidator(inputData);

    const listOfSimulations = runMonteCarloSimulation(
      inputData.tasks,
      inputData.personnel,
      inputData.globalParams,
    );

    console.log(
      'Monte Carlo simulation completed successfully!',
    );

    console.log('Analyzing simulations..');

    // TODO: Check the percentiles of the durations (sprints)
    const duration50th = 20;
    const duration75th = 25;
    const duration90th = 30;
    const duration95th = 35;
    const duration99th = 40;

    const exemplaryFor50th = listOfSimulations.find((simulation) => simulation.sprints.length === duration50th);
    const exemplaryFor75th = listOfSimulations.find((simulation) => simulation.sprints.length === duration75th);
    const exemplaryFor90th = listOfSimulations.find((simulation) => simulation.sprints.length === duration90th);
    const exemplaryFor95th = listOfSimulations.find((simulation) => simulation.sprints.length === duration95th);
    const exemplaryFor99th = listOfSimulations.find((simulation) => simulation.sprints.length === duration99th);
    //
    console.log('Generating Gantt charts..');

    [
      [ exemplaryFor50th, "50th" ],
      [ exemplaryFor75th, "75th" ],
      [ exemplaryFor90th, "90th" ],
      [ exemplaryFor95th, "95th" ],
      [ exemplaryFor99th, "99th" ],

    ].forEach(async ([ resultingSprints, identifier ]) => {

      const mermaidCode = generateGanttChart(
        resultingSprints,
      );

      const diagramName = `simulation_${identifier}`;

      writeFileSync(
        `${outputFilepath}/${diagramName}.mmd`,
        mermaidCode,
      );

      await renderImage(
        mermaidCode,
        diagramName,
        outputFilepath,
      );
    });

    console.log(
      'Gantt charts successfully generated!',
    );

  } catch (error) {
    console.error(
      'Failed to perform Monte Carlo simulation:',
      error,
    );
  }
}

export default monteCarlo;
