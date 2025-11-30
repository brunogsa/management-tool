import { readFileSync, writeFileSync } from 'fs';
import { watch } from 'chokidar';
import express from 'express';
import open from 'open';

import inputValidator from '../utils/input-validator.js';
import {
  deepClone,
  getTaskMap,
  attachAllDescendantsFromParentProps,
  attachBlockedTasksFromDependsOnProps,
  populateContainerEstimates,
} from '../utils/graph.js';
import { generateTasksTreeFlowchart } from '../utils/mermaid-code-generator.js';
import renderImage from '../utils/image-renderer.js';

import {
  TASK_TYPE,
  isContainerTask,
  Task,
} from '../models.js';


function _highlightOrphanTasks(tasks, taskMap) {
  const hasAtLeast1Epic = !!tasks.find((task) => {
    return task.type === TASK_TYPE.EPIC;
  });
  const hasAtLeast1Milestone = !!tasks.find((task) => {
    return task.type === TASK_TYPE.MILESTONE;
  });
  const hasAtLeast1Project = !!tasks.find((task) => {
    return task.type === TASK_TYPE.PROJECT;
  });

  if (hasAtLeast1Epic) {
    const woEpics = tasks.filter((task) => {
      return !isContainerTask(task.type);

    }).filter((basicTask) => {
      const hasNoEpic = !basicTask.parents
        .map((taskId) => taskMap.get(taskId))
        .find((dependency) => {
          return dependency.type === TASK_TYPE.EPIC;
        });

      return hasNoEpic;
    });

    if (woEpics.length > 0) {
      const noEpicTask = new Task({
        id: 'wo-epic',
        title: 'w/o Epic',
        type: TASK_TYPE.EPIC
      });

      tasks.push(noEpicTask);
      taskMap.set(noEpicTask.id, noEpicTask);

      woEpics.forEach((basicTask) => {
        basicTask.parents.push(noEpicTask.id);
      });
    }
  }

  if (hasAtLeast1Milestone) {
    const woMilestones = tasks.filter((task) => {
      return task.type === TASK_TYPE.EPIC;

    }).filter((epicTask) => {
      const hasNoMilestone = !epicTask.parents
        .map((taskId) => taskMap.get(taskId))
        .find((dependency) => {
          return dependency.type === TASK_TYPE.MILESTONE;
        });

      return hasNoMilestone;
    });

    if (woMilestones.length > 0) {
      const noMilestoneTask = new Task({
        id: 'wo-milestone',
        title: 'w/o Milestone',
        type: TASK_TYPE.MILESTONE
      });

      tasks.push(noMilestoneTask);
      taskMap.set(noMilestoneTask.id, noMilestoneTask);

      woMilestones.forEach((epicTask) => {
        epicTask.parents.push(noMilestoneTask.id);
      });
    }
  }

  if (hasAtLeast1Project) {
    const woProjects = tasks.filter((task) => {
      return task.type === TASK_TYPE.MILESTONE;

    }).filter((milestoneTask) => {
      const hasNoProject = !milestoneTask.parents
        .map((taskId) => taskMap.get(taskId))
        .find((dependency) => {
          return dependency.type === TASK_TYPE.PROJECT;
        });

      return hasNoProject;
    });

    if (woProjects.length > 0) {
      const noProjectTask = new Task({
        id: 'wo-project',
        title: 'w/o Project',
        type: TASK_TYPE.PROJECT
      });

      tasks.push(noProjectTask);
      taskMap.set(noProjectTask.id, noProjectTask);

      woProjects.forEach((milestoneTask) => {
        milestoneTask.parents.push(noProjectTask.id);
      });
    }
  }
}

async function _generateImage(inputJsonFilepath, outputFolderFilepath) {
  const inputData = JSON.parse(
    readFileSync(inputJsonFilepath, 'utf8')
  );
  inputValidator(inputData);

  const data = deepClone(inputData);
  data.taskMap = getTaskMap(data.tasks);

  _highlightOrphanTasks(
    data.tasks,
    data.taskMap,
  );

  attachAllDescendantsFromParentProps(data.tasks, data.taskMap);
  attachBlockedTasksFromDependsOnProps(data.tasks, data.taskMap);
  populateContainerEstimates(data.tasks, data.taskMap);

  const mermaidCode = generateTasksTreeFlowchart(
    data.tasks,
    data.taskMap,
    data.globalParams.timeAndEstimateUnit,
  );

  const diagramName = 'tasks-tree';

  const diagramFilepath = `${outputFolderFilepath}/${diagramName}.mmd`;
  writeFileSync(
    diagramFilepath,
    mermaidCode
  );

  await renderImage(
    diagramFilepath,
    diagramName,
    outputFolderFilepath,
  );
}

async function tasksTree(inputJsonFilepath, outputFolderFilepath, options) {
  try {
    await _generateImage(inputJsonFilepath, outputFolderFilepath);
    console.log('Tasks dependency flowchart generated successfully!');

    if (options?.watch) {
      await _startWatchMode(inputJsonFilepath, outputFolderFilepath);
    }
  } catch (error) {
    console.error('Failed to generate tasks tree:', error);
  }
}

async function _startWatchMode(inputJsonFilepath, outputFolderFilepath) {
  const app = express();
  const clients = [];
  const PORT = 3000;

  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Tasks Tree - Live View</title>
        <style>
          body {
            margin: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: #f5f5f5;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          }
          img {
            max-width: 95vw;
            max-height: 95vh;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            background: white;
          }
          .status {
            position: fixed;
            top: 10px;
            right: 10px;
            padding: 8px 16px;
            border-radius: 4px;
            background: #4CAF50;
            color: white;
            font-size: 14px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          }
          .status.regenerating {
            background: #FF9800;
          }
        </style>
      </head>
      <body>
        <img src="/tasks-tree.png?v=${Date.now()}" alt="Tasks Tree">
        <div class="status" id="status">Live</div>
        <script>
          const eventSource = new EventSource('/events');
          const img = document.querySelector('img');
          const status = document.getElementById('status');

          eventSource.onmessage = (event) => {
            if (event.data === 'reload') {
              status.textContent = 'Regenerating...';
              status.classList.add('regenerating');

              setTimeout(() => {
                img.src = '/tasks-tree.png?v=' + Date.now();
                status.textContent = 'Live';
                status.classList.remove('regenerating');
              }, 500);
            }
          };

          eventSource.onerror = () => {
            status.textContent = 'Disconnected';
            status.style.background = '#f44336';
          };
        </script>
      </body>
      </html>
    `);
  });

  app.get('/tasks-tree.png', (req, res) => {
    res.sendFile(`${outputFolderFilepath}/tasks-tree.png`, { root: '/' });
  });

  app.get('/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    res.write('data: connected\n\n');

    clients.push(res);

    req.on('close', () => {
      const index = clients.indexOf(res);
      if (index !== -1) {
        clients.splice(index, 1);
      }
    });
  });

  const server = app.listen(PORT, () => {
    console.log(`\nServer running at http://localhost:${PORT}`);
    console.log('Opening browser...');
    open(`http://localhost:${PORT}`);
    console.log('Watching for changes... (Press Ctrl+C to stop)\n');
  });

  const watcher = watch([inputJsonFilepath, 'src/**/*.js'], {
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 300,
      pollInterval: 100
    }
  });

  watcher.on('change', async (filepath) => {
    try {
      console.log(`Regenerating due to changes in ${filepath}...`);
      await _generateImage(inputJsonFilepath, outputFolderFilepath);
      console.log('Regenerated successfully!');

      clients.forEach(client => {
        client.write('data: reload\n\n');
      });
    } catch (error) {
      console.error('Error regenerating:', error.message);
    }
  });

  process.on('SIGINT', () => {
    console.log('\nShutting down...');
    watcher.close();
    server.close();
    process.exit(0);
  });
}

export default tasksTree;
export { _highlightOrphanTasks };
