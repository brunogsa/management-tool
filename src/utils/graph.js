import { TASK_TYPE, isFolderLikeTask } from '../models.js';

const deepClone = (obj) => JSON.parse(
  JSON.stringify(obj),
);

const setToArray = (set) => ([...set]);

function getTaskMap(tasks) {
  return tasks.reduce(
    (acc, task) => {
      return acc.set(task.id, task);
    },

    new Map(),
  );
}

function agreggateAllChildTasks(task, taskMap) {
  if (task.cummulativeChildTasks) {
    return;
  }

  task.cummulativeChildTasks = new Set();

  task.children.forEach((childId) => {
    task.cummulativeChildTasks.add(childId);

    const childTask = taskMap.get(childId);

    agreggateAllChildTasks(childTask, taskMap);

    childTask.cummulativeChildTasks.forEach((taskId) => {
      task.cummulativeChildTasks.add(taskId);
    });
  });

  task.cummulativeChildTasks = setToArray(task.cummulativeChildTasks);
}

function agreggateChildrenTasks(tasks, taskMap) {
  const mapToChildrenTasks = new Map();

  tasks.forEach((task) => {
    mapToChildrenTasks.set(task.id, new Set());
  });

  tasks.forEach((task) => {
    task.parents.forEach((parentId) => {
      mapToChildrenTasks.get(parentId).add(task.id);
    });
  });

  tasks.forEach((task) => {
    task.children = setToArray(
      mapToChildrenTasks.get(task.id)
    );
  });

  tasks.forEach((task) => {
    agreggateAllChildTasks(task, taskMap);
  });
}

function agreggateAllTasksYouBlock(task, taskMap) {
  if (task.cummulativeTasksBeingBlocked) {
    return;
  }

  task.cummulativeTasksBeingBlocked = new Set();

  task.tasksBeingBlocked.forEach((childId) => {
    task.cummulativeTasksBeingBlocked.add(childId);

    const childTask = taskMap.get(childId);

    agreggateAllTasksYouBlock(childTask, taskMap);

    childTask.cummulativeTasksBeingBlocked.forEach((taskId) => {
      task.cummulativeTasksBeingBlocked.add(taskId);
    });
  });

  task.cummulativeTasksBeingBlocked = setToArray(task.cummulativeTasksBeingBlocked);
}

function agreggateTasksYouDirectlyBlock(tasks, taskMap) {
  const mapToTasksBeingBlocked = new Map();

  tasks.forEach((task) => {
    mapToTasksBeingBlocked.set(task.id, new Set());
  });

  tasks.forEach((task) => {
    task.dependsOnTasks.forEach((dependencyId) => {
      mapToTasksBeingBlocked.get(dependencyId).add(task.id);
    });
  });

  tasks.forEach((task) => {
    task.tasksBeingBlocked = setToArray(
      mapToTasksBeingBlocked.get(task.id)
    );
  });

  tasks.forEach((task) => {
    agreggateAllTasksYouBlock(task, taskMap);
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
    const children = task.children.map((childId) => {
      return taskMap.get(childId);
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
    const children = task.children.map((childId) => {
      return taskMap.get(childId);
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
    const children = task.children.map((childId) => {
      return taskMap.get(childId);
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

function agreggateTotalNumOfBlocks(task, taskMap) {
  const blocking = new Set();

  task.cummulativeTasksBeingBlocked.forEach((idOfTaskBeingBlocked) => {
    blocking.add(idOfTaskBeingBlocked);

    const tasksBeingBlocked = taskMap.get(idOfTaskBeingBlocked);

    if (isFolderLikeTask(tasksBeingBlocked.type)) {
      tasksBeingBlocked.cummulativeChildTasks.forEach((childId) => {
        blocking.add(childId);
      });
    }
  });

  task.blocking = setToArray(blocking);
  task.totalNumOfBlocks = task.blocking.length;
}

function agreggateInfosByExploringTasksGraph(tasks, taskMap) {
  agreggateChildrenTasks(tasks, taskMap);
  agreggateTasksYouDirectlyBlock(tasks, taskMap);

  tasks.forEach((task) => {
    computeTotalEstimateForTask(task, taskMap);
    agreggateTotalNumOfBlocks(task, taskMap);
  });
}

export {
  deepClone,
  setToArray,
  getTaskMap,
  agreggateAllChildTasks,
  agreggateChildrenTasks,
  agreggateAllTasksYouBlock,
  agreggateTasksYouDirectlyBlock,
  computeTotalEstimateForTask,
  agreggateTotalNumOfBlocks,
  agreggateInfosByExploringTasksGraph,
};
