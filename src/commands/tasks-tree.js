import { readFileSync, writeFileSync } from 'fs';

import inputValidator from '../utils/input-validator.js';
import { generateTasksTreeFlowchart } from '../utils/mermaid-code-generator.js';
import { renderImage } from '../utils/image-renderer.js';

function tasksTree(inputJsonFilepath, outputFolderFilepath) {
  try {
    const inputData = JSON.parse(
      readFileSync(inputJsonFilepath, 'utf8')
    );
    inputValidator(inputData);

    const mermaidCode = generateTasksTreeFlowchart(
      inputData.tasks
    );

    writeFileSync(
      `${outputFolderFilepath}/diagram.mmd`,
      mermaidCode
    );

    renderImage(
      mermaidCode,
      `${outputFolderFilepath}/diagram.png`
    );

    console.log(
      'Tasks dependency flowchart generated successfully!',
    );

  } catch (error) {
    console.error(
      'Failed to generate tasks tree:',
      error,
    );
  }
}

export default tasksTree;
