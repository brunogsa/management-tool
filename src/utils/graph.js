import { TASK_TYPE, isFolderLikeTask } from '../models.js';

const deepClone = (obj) => JSON.parse(
  JSON.stringify(obj),
);

function getTaskMap(tasks) {
  return tasks.reduce(
    (acc, task) => {
      return acc.set(task.id, task);
    },

    new Map(),
  );
}

function agreggateTasksYouDirectlyBlock(tasks) {
  const blocksTasks = new Map();

  tasks.forEach((task) => {
    blocksTasks.set(task.id, new Set());
  });

  tasks.forEach((task) => {
    task.dependsOnTasks.forEach((dependencyId) => {
      blocksTasks.get(dependencyId).add(task.id);
    })
  });

  tasks.forEach((task) => {
    task.blocksTasks = [...blocksTasks.get(task.id)];
  });
}

function computeTotalEstimateForTask(task, taskMap) {
  if (!isFolderLikeTask(task.type)) {
    return;
  }

  if (task.totalRealisticEstimate) {
    return;
  }

  if (task.type === TASK_TYPE.PROJECT) {
    const children = task.blocksTasks.map((childId) => {
      return taskMap.get(childId);

    }).filter((childTask) => {
      return childTask.type !== TASK_TYPE.PROJECT;
    });

    const totalRealisticEstimate = children.reduce(
      (acc, childTask) => {
        if (
          childTask.type === TASK_TYPE.MILESTONE
          || childTask.type === TASK_TYPE.EPIC
        ) {
          computeTotalEstimateForTask(childTask, taskMap);
          return acc + childTask.totalRealisticEstimate;
        }

        return acc + childTask.mostProbableEstimateInRange;
      },

      task.mostProbableEstimateInRange,
    );

    task.totalRealisticEstimate = totalRealisticEstimate;

    return;
  }

  if (task.type === TASK_TYPE.MILESTONE) {
    const children = task.blocksTasks.map((childId) => {
      return taskMap.get(childId);

    }).filter((childTask) => {
      return (
        childTask.type !== TASK_TYPE.PROJECT
        && childTask.type !== TASK_TYPE.MILESTONE
      );
    });

    const totalRealisticEstimate = children.reduce(
      (acc, childTask) => {
        if (childTask.type === TASK_TYPE.EPIC) {
          computeTotalEstimateForTask(childTask, taskMap);
          return acc + childTask.totalRealisticEstimate;
        }

        return acc + childTask.mostProbableEstimateInRange;
      },

      task.mostProbableEstimateInRange,
    );

    task.totalRealisticEstimate = totalRealisticEstimate;

    return;
  }

  if (task.type === TASK_TYPE.EPIC) {
    const children = task.blocksTasks.map((childId) => {
      return taskMap.get(childId);

    }).filter((childTask) => {
      return !isFolderLikeTask(childTask.type);
    });

    const totalRealisticEstimate = children.reduce(
      (acc, childTask) => {
        return acc + childTask.mostProbableEstimateInRange;
      },

      task.mostProbableEstimateInRange,
    );

    task.totalRealisticEstimate = totalRealisticEstimate;

    return;
  }

  throw new Error(`Unexpected task type: ${task.type}`);
}

function exploreTaskGraphFromTask(task, taskMap) {
  // console.log(`Starting to count for task ${task.id}`);

  if (task.cummulativeTasksBeingBlocked) {
    // console.log(`Task ${task.id} already explored`);
    return;
  }

  task.cummulativeTasksBeingBlocked = new Set();

  task.blocksTasks.forEach((childId) => {
    task.cummulativeTasksBeingBlocked.add(childId);
  });

  task.blocksTasks.forEach((childId) => {
    const childTask = taskMap.get(childId);

    exploreTaskGraphFromTask(childTask, taskMap);

    childTask.cummulativeTasksBeingBlocked.forEach((taskId) => {
      task.cummulativeTasksBeingBlocked.add(taskId);
    });
  });

  // console.log(`Finished exploring from task ${task.id}`);

  // Convert Set to Array
  task.cummulativeTasksBeingBlocked = [...task.cummulativeTasksBeingBlocked];

  task.blocks = task.cummulativeTasksBeingBlocked.length;
}

function agreggateInfosByExploringTasksGraph(tasks, taskMap) {
  agreggateTasksYouDirectlyBlock(tasks);

  tasks.forEach((task) => {
    computeTotalEstimateForTask(task, taskMap);
    exploreTaskGraphFromTask(task, taskMap);
  });
}

export {
  deepClone,
  getTaskMap,
  agreggateInfosByExploringTasksGraph,
};
