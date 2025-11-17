import { TASK_TYPE, isFolderLikeTask } from '../models.js';

const deepClone = (obj) => JSON.parse(
  JSON.stringify(obj),
);

const _setToArray = (set) => ([...set]);

function getTaskMap(tasks) {
  return tasks.reduce(
    (acc, task) => {
      return acc.set(task.id, task);
    },

    new Map(),
  );
}

function _agreggateAllChildTasks(task, taskMap) {
  if (task.cummulativeChildTasks) {
    return;
  }

  task.cummulativeChildTasks = new Set();

  task.children.forEach((childId) => {
    task.cummulativeChildTasks.add(childId);

    const childTask = taskMap.get(childId);

    _agreggateAllChildTasks(childTask, taskMap);

    childTask.cummulativeChildTasks.forEach((taskId) => {
      task.cummulativeChildTasks.add(taskId);
    });
  });

  task.cummulativeChildTasks = _setToArray(task.cummulativeChildTasks);
}

function _agreggateChildrenTasks(tasks, taskMap) {
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
    task.children = _setToArray(
      mapToChildrenTasks.get(task.id)
    );
  });

  tasks.forEach((task) => {
    _agreggateAllChildTasks(task, taskMap);
  });
}

function _agreggateAllTasksYouBlock(task, taskMap) {
  if (task.cummulativeTasksBeingBlocked) {
    return;
  }

  task.cummulativeTasksBeingBlocked = new Set();

  task.tasksBeingBlocked.forEach((childId) => {
    task.cummulativeTasksBeingBlocked.add(childId);

    const childTask = taskMap.get(childId);

    _agreggateAllTasksYouBlock(childTask, taskMap);

    childTask.cummulativeTasksBeingBlocked.forEach((taskId) => {
      task.cummulativeTasksBeingBlocked.add(taskId);
    });
  });

  task.cummulativeTasksBeingBlocked = _setToArray(task.cummulativeTasksBeingBlocked);
}

function _agreggateTasksYouDirectlyBlock(tasks, taskMap) {
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
    task.tasksBeingBlocked = _setToArray(
      mapToTasksBeingBlocked.get(task.id)
    );
  });

  tasks.forEach((task) => {
    _agreggateAllTasksYouBlock(task, taskMap);
  });
}

function _computeTotalEstimateForTask(task, taskMap) {
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
          _computeTotalEstimateForTask(childTask, taskMap);
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
          _computeTotalEstimateForTask(childTask, taskMap);
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

function _agreggateTotalNumOfBlocks(task, taskMap) {
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

  task.blocking = _setToArray(blocking);
  task.totalNumOfBlocks = task.blocking.length;
}

function agreggateInfosByExploringTasksGraph(tasks, taskMap) {
  _agreggateChildrenTasks(tasks, taskMap);
  _agreggateTasksYouDirectlyBlock(tasks, taskMap);

  tasks.forEach((task) => {
    _computeTotalEstimateForTask(task, taskMap);
    _agreggateTotalNumOfBlocks(task, taskMap);
  });
}

export {
  deepClone,
  _setToArray,
  getTaskMap,
  _agreggateAllChildTasks,
  _agreggateChildrenTasks,
  _agreggateAllTasksYouBlock,
  _agreggateTasksYouDirectlyBlock,
  _computeTotalEstimateForTask,
  _agreggateTotalNumOfBlocks,
  agreggateInfosByExploringTasksGraph,
};
