import { TASK_TYPE, isContainerTask } from '../models.js';

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

function _buildAllDescendantsFromChildren(task, taskMap) {
  if (task.allDescendantTasks) {
    return;
  }

  task.allDescendantTasks = new Set();

  task.children.forEach((childId) => {
    task.allDescendantTasks.add(childId);

    const childTask = taskMap.get(childId);

    _buildAllDescendantsFromChildren(childTask, taskMap);

    childTask.allDescendantTasks.forEach((taskId) => {
      task.allDescendantTasks.add(taskId);
    });
  });

  task.allDescendantTasks = _setToArray(task.allDescendantTasks);
}

function _buildChildrenFromParentProps(tasks, taskMap) {
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
    _buildAllDescendantsFromChildren(task, taskMap);
  });
}

function _buildBlockingRelationships(tasks, taskMap) {
  // Step 1: Build direct blocking relationships (task.tasksBeingBlocked)
  const directBlockingMap = new Map();

  tasks.forEach((task) => {
    directBlockingMap.set(task.id, new Set());
  });

  tasks.forEach((task) => {
    task.dependsOnTasks.forEach((dependencyId) => {
      directBlockingMap.get(dependencyId).add(task.id);
    });
  });

  tasks.forEach((task) => {
    task.tasksBeingBlocked = _setToArray(directBlockingMap.get(task.id));
  });

  // Step 2: Recursively compute transitive blocking (without folder expansion yet)
  const transitiveBlockingMap = new Map();

  function computeTransitiveBlocking(task) {
    if (transitiveBlockingMap.has(task.id)) {
      return transitiveBlockingMap.get(task.id);
    }

    const transitiveBlocked = new Set();

    task.tasksBeingBlocked.forEach((blockedId) => {
      transitiveBlocked.add(blockedId);

      const blockedTask = taskMap.get(blockedId);
      const blockedTransitive = computeTransitiveBlocking(blockedTask);

      blockedTransitive.forEach((taskId) => {
        transitiveBlocked.add(taskId);
      });
    });

    transitiveBlockingMap.set(task.id, transitiveBlocked);
    return transitiveBlocked;
  }

  tasks.forEach((task) => {
    computeTransitiveBlocking(task);
  });

  // Step 3: Expand folder-like tasks and set task.allTasksBeingBlocked
  tasks.forEach((task) => {
    const transitiveBlocked = transitiveBlockingMap.get(task.id);
    const allBlocked = new Set();

    transitiveBlocked.forEach((blockedId) => {
      allBlocked.add(blockedId);

      const blockedTask = taskMap.get(blockedId);

      if (isContainerTask(blockedTask.type)) {
        blockedTask.allDescendantTasks.forEach((childId) => {
          allBlocked.add(childId);
        });
      }
    });

    task.allTasksBeingBlocked = _setToArray(allBlocked);
    task.totalNumOfBlocks = task.allTasksBeingBlocked.length;
  });
}

function _computeTotalEstimateForTask(task, taskMap) {
  if (!isContainerTask(task.type)) {
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

function attachAllDescendantsFromParentProps(tasks, taskMap) {
  _buildChildrenFromParentProps(tasks, taskMap);
}

function attachBlockedTasksFromDependsOnProps(tasks, taskMap) {
  _buildBlockingRelationships(tasks, taskMap);
}

function populateContainerEstimates(tasks, taskMap) {
  tasks.forEach((task) => {
    _computeTotalEstimateForTask(task, taskMap);
  });
}

export {
  deepClone,
  _setToArray,
  getTaskMap,
  _buildAllDescendantsFromChildren,
  _buildChildrenFromParentProps,
  _buildBlockingRelationships,
  _computeTotalEstimateForTask,
  attachAllDescendantsFromParentProps,
  attachBlockedTasksFromDependsOnProps,
  populateContainerEstimates,
};
