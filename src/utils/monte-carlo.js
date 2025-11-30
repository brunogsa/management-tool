import { deepClone } from './graph.js';
import { LEVEL, DEFAULT_VELOCITY_RATE, DEFAULT_TASK_SPLIT_RATE, Task, Person } from '../models.js';

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
  // Initialize if needed
  if (task.remainingDuration === undefined) {
    task.remainingDuration = 0;
  }
  if (task.remainingReworkDuration === undefined) {
    task.remainingReworkDuration = 0;
  }

  const velocityRate = DEFAULT_VELOCITY_RATE[person.level];

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

function runSingleIteration({ tasks, personnel }) {
  const state = initializeSimulationState();
  const taskCompletionDates = {};
  const MAX_WEEKS = 1000;

  while (state.currentWeek < MAX_WEEKS) {
    state.currentWeek++;

    // Reset personnel capacity each week
    for (const person of personnel) {
      person.availableCapacity = 1;
    }

    // Find startable tasks
    const startableTasks = findStartableTasks(tasks);

    if (startableTasks.length === 0) {
      // Check if all tasks are done
      const allDone = tasks.every(task => task.isDone());
      if (allDone) {
        break;
      }
    }

    // Assign work to tasks
    for (const task of startableTasks) {
      for (const person of personnel) {
        if (person.availableCapacity <= 0) {
          continue;
        }

        if (!isPersonQualifiedForTask({ person, task })) {
          continue;
        }

        assignWorkToTask({ task, person, weeksOfWork: person.availableCapacity });

        // Track completion
        if (task.isDone() && !taskCompletionDates[task.id]) {
          taskCompletionDates[task.id] = state.currentWeek;
        }
      }
    }
  }

  return {
    completionWeek: state.currentWeek,
    taskCompletionDates,
  };
}

function runMultipleIterations({ tasks, personnel, numIterations }) {
  const iterations = [];

  for (let i = 0; i < numIterations; i++) {
    // Use factory functions if provided, otherwise deep clone
    let tasksCopy, personnelCopy;

    if (typeof tasks === 'function') {
      tasksCopy = tasks();
    } else {
      tasksCopy = deepClone(tasks);
    }

    if (typeof personnel === 'function') {
      personnelCopy = personnel();
    } else {
      personnelCopy = deepClone(personnel);
    }

    const result = runSingleIteration({
      tasks: tasksCopy,
      personnel: personnelCopy,
    });

    iterations.push(result);
  }

  return {
    iterations,
  };
}

function _calculatePercentile(sortedValues, percentile) {
  const index = (percentile / 100) * (sortedValues.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  if (lower === upper) {
    return sortedValues[lower];
  }

  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

function calculatePercentiles(values) {
  const sorted = [...values].sort((a, b) => a - b);

  return {
    p50: _calculatePercentile(sorted, 50),
    p75: _calculatePercentile(sorted, 75),
    p90: _calculatePercentile(sorted, 90),
    p95: _calculatePercentile(sorted, 95),
    p99: _calculatePercentile(sorted, 99),
  };
}

function shouldTaskSplit(splitRate, randomValue) {
  const effectiveSplitRate = splitRate !== undefined ? splitRate : DEFAULT_TASK_SPLIT_RATE;
  return randomValue < effectiveSplitRate;
}

function createSplitTask({ task, tasks }) {
  // Create new task with same properties
  const splitTask = new Task({ id: `${task.id}-split-${Date.now()}`, title: task.title, type: task.type });

  // Copy properties
  splitTask.requiredSkills = [...(task.requiredSkills || [])];
  splitTask.tasksBeingBlocked = task.tasksBeingBlocked || [];

  // Divide remaining duration
  const halfDuration = task.remainingDuration / 2;
  task.remainingDuration = halfDuration;
  splitTask.remainingDuration = halfDuration;

  // Initialize rework duration for split task
  splitTask.remainingReworkDuration = 0;

  // Add to tasks array
  tasks.push(splitTask);

  return {
    originalTask: task,
    splitTask,
    tasks,
  };
}

function updateSplitDependencies({ originalTask, splitTask, tasks }) {
  // Make split task depend on original (original blocks split)
  if (!splitTask.tasksBeingBlocked) {
    splitTask.tasksBeingBlocked = [];
  }
  if (!splitTask.tasksBeingBlocked.includes(originalTask)) {
    splitTask.tasksBeingBlocked.push(originalTask);
  }

  // Make split task block everything original was blocking
  if (tasks) {
    for (const task of tasks) {
      if (task.tasksBeingBlocked && task.tasksBeingBlocked.includes(originalTask)) {
        if (!task.tasksBeingBlocked.includes(splitTask)) {
          task.tasksBeingBlocked.push(splitTask);
        }
      }
    }
  }
}

function shouldTaskRequireRework(reworkRate, randomValue) {
  return randomValue < reworkRate;
}

function createReworkTask({ task, originalEstimate, tasks }) {
  // Create new task with same properties
  const reworkTask = new Task({ id: `${task.id}-rework-${Date.now()}`, title: task.title, type: task.type });

  // Copy properties
  reworkTask.requiredSkills = [...(task.requiredSkills || [])];

  // Set rework duration to half of original estimate
  reworkTask.remainingReworkDuration = originalEstimate * 0.5;

  // Initialize remaining duration to 0
  reworkTask.remainingDuration = 0;

  // Make rework task depend on original (original blocks rework)
  reworkTask.tasksBeingBlocked = [task];

  // Add to tasks array
  tasks.push(reworkTask);

  return {
    task,
    reworkTask,
    tasks,
  };
}

function isPersonOnVacation({ person, currentDate }) {
  if (!person.vacationsAt || person.vacationsAt.length === 0) {
    return false;
  }

  for (const vacation of person.vacationsAt) {
    const from = new Date(vacation.from);
    const to = new Date(vacation.to);

    if (currentDate >= from && currentDate <= to) {
      return true;
    }
  }

  return false;
}

function applyVacationToPersonnelCapacity({ personnel, currentDate }) {
  for (const person of personnel) {
    if (isPersonOnVacation({ person, currentDate })) {
      person.availableCapacity = 0;
    }
  }
}

function shouldPersonGetSick(sickRate, randomValue) {
  return randomValue < sickRate;
}

function generateSickLeaveDuration(randomValue) {
  return Math.floor(randomValue * 5) + 1;
}

function isPersonHired({ person }) {
  return person.hired === true;
}

function filterHiredPersonnel({ personnel }) {
  return personnel.filter(person => isPersonHired({ person }));
}

function isHiringComplete({ person, currentWeek, hiringTimeInWeeks }) {
  if (person.hiringStartWeek === undefined) {
    return false;
  }
  return currentWeek >= person.hiringStartWeek + hiringTimeInWeeks;
}

function completeHiring({ person, currentWeek, hiringTimeInWeeks }) {
  if (isHiringComplete({ person, currentWeek, hiringTimeInWeeks })) {
    person.hired = true;
  }
}

function calculateHireCompletionWeek({ person, hiringTimeInWeeks }) {
  return person.hiringStartWeek + hiringTimeInWeeks;
}

function isPersonOnboarded({ person }) {
  return person.onboarded === true;
}

function filterOnboardedPersonnel({ personnel }) {
  return personnel.filter(person => isPersonOnboarded({ person }));
}

function isOnboardingComplete({ person, currentWeek, rampUpTimeInWeeks }) {
  if (person.onboardingStartWeek === undefined) {
    return false;
  }
  return currentWeek >= person.onboardingStartWeek + rampUpTimeInWeeks;
}

function applyOnboardingCapacityReduction({ personnel, currentWeek, rampUpTimeInWeeks }) {
  for (const person of personnel) {
    // Only reduce capacity if person is onboarding (not fully onboarded yet)
    if (!isOnboardingComplete({ person, currentWeek, rampUpTimeInWeeks }) && person.onboardingStartWeek !== undefined) {
      person.availableCapacity = person.availableCapacity * 0.5;
    }
  }
}

function shouldPersonQuit(quitRate, randomValue) {
  return randomValue < quitRate;
}

function markPersonAsDeparted({ person }) {
  person.hasDeparted = true;
  person.availableCapacity = 0;
}

function filterActivePersonnel({ personnel }) {
  return personnel.filter(person => !person.hasDeparted);
}

function createReplacement({ person, currentWeek, personnel }) {
  const replacement = new Person({
    id: `${person.id}-replacement-${Date.now()}`,
    name: `${person.name} Replacement`,
    level: person.level,
    isHired: false,
    isOnboarded: false,
  });

  // Copy skills
  replacement.skills = [...(person.skills || [])];

  // Set hiring start week
  replacement.hiringStartWeek = currentWeek;

  // Add to personnel array if provided
  if (personnel) {
    personnel.push(replacement);
  }

  return personnel ? { replacement, personnel } : replacement;
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
  runSingleIteration,
  runMultipleIterations,
  calculatePercentiles,
  shouldTaskSplit,
  createSplitTask,
  updateSplitDependencies,
  shouldTaskRequireRework,
  createReworkTask,
  isPersonOnVacation,
  applyVacationToPersonnelCapacity,
  shouldPersonGetSick,
  generateSickLeaveDuration,
  isPersonHired,
  filterHiredPersonnel,
  isHiringComplete,
  completeHiring,
  calculateHireCompletionWeek,
  isPersonOnboarded,
  filterOnboardedPersonnel,
  isOnboardingComplete,
  applyOnboardingCapacityReduction,
  shouldPersonQuit,
  markPersonAsDeparted,
  filterActivePersonnel,
  createReplacement,
  _calculateCompletionDate,
  runMonteCarloSimulation,
};
