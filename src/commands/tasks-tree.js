import { readFileSync, writeFileSync } from 'fs';

import tasksTreeUseCase from '../use-cases/tasks-tree.js';
import renderImage from '../utils/image-renderer.js';
import startDiagramViewer from '../utils/diagram-viewer.js';
import startAutoreloadWatcher from '../utils/autoreload-watcher.js';


const DIAGRAM_NAME = 'tasks-tree';

async function _generateDiagramOutputFiles(mermaidCode, outputFolderFilepath) {
  const diagramFilepath = `${outputFolderFilepath}/${DIAGRAM_NAME}.mmd`;

  writeFileSync(diagramFilepath, mermaidCode);

  await renderImage(
    diagramFilepath,
    DIAGRAM_NAME,
    outputFolderFilepath,
  );
}

async function tasksTreeCommand(inputJsonFilepath, outputFolderFilepath, options) {
  try {
    const inputData = JSON.parse(
      readFileSync(inputJsonFilepath, 'utf8')
    );

    const mermaidCode = tasksTreeUseCase(inputData);

    await _generateDiagramOutputFiles(mermaidCode, outputFolderFilepath);

    console.log('Tasks dependency flowchart generated successfully!');

    if (options?.watch) {
      const imageFilepath = `${outputFolderFilepath}/${DIAGRAM_NAME}.png`;
      const srcPath = `${process.cwd()}/src`;

      await startDiagramViewer(imageFilepath);
      startAutoreloadWatcher([inputJsonFilepath, srcPath]);
    }
  } catch (error) {
    console.error('Failed to generate tasks tree:', error);
  }
}

export default tasksTreeCommand;
