import { readFileSync, writeFileSync } from 'fs';

import inputValidator from '../utils/input-validator.js';
import { deepClone, getTaskMap, agreggateInfosByExploringTasksGraph } from '../utils/graph.js';
import { generateTasksTreeFlowchart } from '../utils/mermaid-code-generator.js';
import renderImage from '../utils/image-renderer.js';

import {
  TASK_TYPE,
  isFolderLikeTask,
  getEmptyTask,
} from '../models.js';


function highlightOrphanTasks(tasks, taskMap) {
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
      return !isFolderLikeTask(task.type);

    }).filter((basicTask) => {
      const hasNoEpic = !basicTask.parents
        .map((taskId) => taskMap.get(taskId))
        .find((dependency) => {
          return dependency.type === TASK_TYPE.EPIC;
        });

      return hasNoEpic;
    });

    if (woEpics.length > 0) {
      const noEpicTask = getEmptyTask('wo-epic', 'w/o Epic', TASK_TYPE.EPIC);
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
      const noMilestoneTask = getEmptyTask('wo-milestone', 'w/o Milestone', TASK_TYPE.MILESTONE);
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
      const noProjectTask = getEmptyTask('wo-project', 'w/o Project', TASK_TYPE.PROJECT);
      tasks.push(noProjectTask);
      taskMap.set(noProjectTask.id, noProjectTask);

      woProjects.forEach((milestoneTask) => {
        milestoneTask.parents.push(noProjectTask.id);
      });
    }
  }
}

async function tasksTree(inputJsonFilepath, outputFolderFilepath) {
  try {
    const inputData = JSON.parse(
      readFileSync(inputJsonFilepath, 'utf8')
    );
    inputValidator(inputData);

    const data = deepClone(inputData);
    data.taskMap = getTaskMap(data.tasks);

    highlightOrphanTasks(
      data.tasks,
      data.taskMap,
    );

    agreggateInfosByExploringTasksGraph(
      data.tasks,
      data.taskMap,
    );

    const mermaidCode = generateTasksTreeFlowchart(
      data.tasks,
      data.taskMap,
      data.globalParams.timeAndEstimateUnit,
    );

    const diagramName = "tasks-tree";

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
