import { readFileSync, writeFileSync } from 'fs';

import inputValidator from '../utils/input-validator.js';
import { simulateMonteCarlo } from '../utils/monte-carlo.js';
import { generateGanttChart } from '../utils/mermaid-code-generator.js';
import renderImage from '../utils/image-renderer.js';

function monteCarlo(inputJsonFilepath, outputFilepath) {
  try {
    const inputData = JSON.parse(readFileSync(inputJsonFilepath, 'utf8'));
    inputValidator(inputData);

    const listOfResultingSprints = simulateMonteCarlo(
      inputData,
    );

    listOfResultingSprints.forEach((resultingSprints, index) => {
      const mermaidCode = generateGanttChart(
        resultingSprints,
      );

      writeFileSync(
        `${outputFilepath}/simulation_${index}.mmd`,
        mermaidCode,
      );

      renderImage(
        mermaidCode,
        `simulation_${index}`,
        outputFilepath,
      );
    });

    console.log(
      'Monte Carlo simulation completed successfully!',
    );

  } catch (error) {
    console.error(
      'Failed to perform Monte Carlo simulation:',
      error,
    );
  }
}

export default monteCarlo;
