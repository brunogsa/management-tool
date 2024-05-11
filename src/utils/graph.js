export function calculateUnblocks(task, tasks, memo = {}) {
  if (memo[task.id]) {
    return memo[task.id];
  }
  const dependentTasks = tasks.filter(t => t.dependencies.includes(task.id));
  const unblocks = dependentTasks.reduce((acc, depTask) => {
    // Count this task and all it unblocks
    return acc + 1 + calculateUnblocks(depTask, tasks, memo);
  }, 0);
  memo[task.id] = unblocks;
  return unblocks;
}
