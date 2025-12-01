import inputValidator from '../utils/input-validator.js';
import {
  deepClone,
  getTaskMap,
  attachAllDescendantsFromParentProps,
  attachBlockedTasksFromDependsOnProps,
  populateContainerEstimates,
} from '../utils/graph.js';
import { generateTasksTreeFlowchart } from '../utils/mermaid-code-generator.js';

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

function tasksTreeUseCase(inputData) {
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

  return mermaidCode;
}

export default tasksTreeUseCase;
export { _highlightOrphanTasks };
