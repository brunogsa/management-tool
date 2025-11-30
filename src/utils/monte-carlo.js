import { deepClone } from './graph.js';
import { LEVEL, DEFAULT_VELOCITY_RATE } from '../models.js';

const LEVEL_HIERARCHY = [
  LEVEL.INTERN,
  LEVEL.JUNIOR,
  LEVEL.MID,
  LEVEL.SENIOR,
  LEVEL.SPECIALIST,
];

function _getLevelRank(level) {
  return LEVEL_HIERARCHY.indexOf(level);
}

function _isLevelSufficient(personLevel, requiredLevel) {
  return _getLevelRank(personLevel) >= _getLevelRank(requiredLevel);
}

function initializeSimulationState() {
  return {
    currentWeek: 0,
  };
}

function findStartableTasks(tasks) {
  return tasks.filter(task => {
    const isNotCompleted = task.remainingDuration > 0;
    const allDependenciesCompleted = !task.tasksBeingBlocked || task.tasksBeingBlocked.every(dep => dep.remainingDuration === 0);

    return isNotCompleted && allDependenciesCompleted;
  });
}

function isPersonQualifiedForTask({ person, task }) {
  if (!task.requiredSkills || task.requiredSkills.length === 0) {
    return true;
  }

  return task.requiredSkills.every(requiredSkill => {
    const personSkill = person.skills.find(s => s.name === requiredSkill.name);

    if (!personSkill) {
      return false;
    }

    return _isLevelSufficient(personSkill.minLevel, requiredSkill.minLevel);
  });
}

function assignWorkToTask({ task, person, weeksOfWork }) {
  const velocityRate = DEFAULT_VELOCITY_RATE[person.level];
  const potentialWork = weeksOfWork * velocityRate;

  const actualWeeksUsed = Math.min(
    weeksOfWork,
    person.availableCapacity,
    task.remainingDuration / velocityRate
  );

  const actualWork = actualWeeksUsed * velocityRate;

  task.remainingDuration -= actualWork;
  person.availableCapacity -= actualWeeksUsed;

  return actualWork;
}

// TODO: Implement this helper function
function findBestPersonnelForTask(_task, _personnel) {
  return null;
}

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

function updateTasksDuration(tasks, _executedSprint) {
  tasks.forEach(task => {
    if (task.duration > 0) {
      task.completed = false;
    } else {
      task.completed = true;
    }
  });
}

function _calculateCompletionDate(sprints, startDate) {
  const totalWeeks = sprints * 2;

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
      let currentSprint = planSprint(remainingTasks, availablePersonnel);
      sprintResults.push(currentSprint);

      updateTasksDuration(remainingTasks, currentSprint);

      allTasksCompleted = remainingTasks.every(task => task.duration <= 0);
    }

    simulations.push({
      startDate: globalParams.startDate,
      completionDate: _calculateCompletionDate(sprintResults, globalParams.startDate),
      sprints: sprintResults,
    });
  }

  return simulations;
}

export {
  initializeSimulationState,
  findStartableTasks,
  isPersonQualifiedForTask,
  assignWorkToTask,
  _calculateCompletionDate,
  runMonteCarloSimulation,
};
