import { deepClone } from './graph.js';

// 1 sprint = a list of executed tasks
function planSprint(tasks, personnel) {
  let sprint = [];

  tasks.filter(
    task => task.tasksBeingBlocked.every(d => d.remainingDuration)
  ).forEach(task => {
    let assignee = findBestPersonnelForTask(task, personnel);
    if (assignee) {
      sprint.push({ task: task.id, assignee: assignee.name, remainingDuration: task.duration });
      task.duration -= 2; // Assuming 2-week sprints
    }
  });

  return sprint;
}

function updateTasksDuration(tasks, executedSprint) {
  tasks.forEach(task => {
    if (task.duration > 0) {
      task.completed = false;
    } else {
      task.completed = true;
    }
  });
}

function calculateCompletionDate(sprints, startDate) {
  const totalWeeks = sprints.length * 2;

  let completionDate = new Date(startDate);
  completionDate.setDate(completionDate.getDate() + totalWeeks * 7);

  return completionDate;
}

// 1 simulation is a sequence of sprints till project completion
function runMonteCarloSimulation(tasks, personnel, globalParams) {
  const simulations = [];
  const numSimulations = globalParams.numOfMonteCarloIterations;

  for (let i = 0; i < numSimulations; i++) {
    let sprintResults = [];
    let remainingTasks = deepClone(tasks);
    let availablePersonnel = deepClone(personnel);
    let allTasksCompleted = false;

    // TODO: Monte Carlo steps
    // 1. Simple simulation: all hired/onboarded, no rework, no split rate, no vacation, no sickness, no turnover. Only handle: different skill level requirements and velocity
    // 2. Handle split rate
    // 3. Handle rework
    // 4. Handle vacation
    // 5. Handle sick rate
    // 6. Handle hiring + onboard
    // 7. Handle turnover rate + re-hiring/onbording
    // 8. Handle onlyStartableAt

    while (!allTasksCompleted) {
      // let currentSprint = planSprint(remainingTasks, availablePersonnel);
      // sprintResults.push(currentSprint);

      // updateTasksDuration(remainingTasks, currentSprint);

      // allTasksCompleted = remainingTasks.every(task => task.duration <= 0);
    }

    // simulations.push({
    //   startDate: globalParams.startDate,
    //   completionDate: calculateCompletionDate(sprintResults, globalParams.startDate),
    //   sprints: sprintResults,
    // });
  }

  return simulations;
}

export {
  runMonteCarloSimulation,
};
