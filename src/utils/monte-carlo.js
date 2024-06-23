const deepClone = (obj) => JSON.parse(
  JSON.stringify(obj),
);

// 1 sprint = a list of executed tasks
function planSprint(tasks, personnel) {
  let sprint = [];

  tasks.filter(task => task.dependencies.every(d => d.completed)).forEach(task => {
    let assignee = findBestPersonnelForTask(task, personnel);
    if (assignee) {
      sprint.push({ task: task.id, assignee: assignee.name, remainingDuration: task.duration });
      task.duration -= 2; // Assuming 2-week sprints
    }
  });

  return sprint;
}

function updateTasksAndPersonnel(tasks, personnel) {
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
  return { completionDate, sprints };
}

// 1 simulation is a sequence of sprints till project completion
function runMonteCarloSimulation(tasks, personnel, globalParams) {
  const simulations = [];
  const numSimulations = 1000000;

  for (let i = 0; i < numSimulations; i++) {
    let sprintResults = [];
    let remainingTasks = deepClone(tasks);
    let availablePersonnel = deepClone(personnel);
    let allTasksCompleted = false;

    while (!allTasksCompleted) {
      let currentSprint = planSprint(remainingTasks, availablePersonnel);
      sprintResults.push(currentSprint);
      updateTasksAndPersonnel(remainingTasks, availablePersonnel);
      allTasksCompleted = remainingTasks.every(task => task.duration <= 0);
    }

    simulations.push(
      calculateCompletionDate(sprintResults, globalParams.startDate)
    );
  }

  return simulations;
}

export {
  runMonteCarloSimulation,
};
