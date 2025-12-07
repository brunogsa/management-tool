import { deepClone } from './graph.js';
import {
  LEVEL,
  DEFAULT_VELOCITY_RATE,
  DEFAULT_TASK_SPLIT_RATE,
  DEFAULT_WEEKLY_SICK_CHANCE,
  DEFAULT_WEEKLY_QUIT_CHANCE,
  Task,
  Person,
  TASK_TYPE,
  isContainerTask
} from '../models.js';

const LEVEL_HIERARCHY = [
  LEVEL.INTERN,
  LEVEL.JUNIOR,
  LEVEL.MID,
  LEVEL.SENIOR,
  LEVEL.SPECIALIST,
];

const WEEKS_PER_YEAR = 52;
const VACATION_WEEKS_PER_YEAR = 4;

function _getLevelRank(level) {
  return LEVEL_HIERARCHY.indexOf(level);
}

function _isLevelSufficient(personLevel, requiredLevel) {
  return _getLevelRank(personLevel) >= _getLevelRank(requiredLevel);
}

function initializeSimulationState() {
  return {
    currentWeek: 0,
    workedWeeks: [],
  };
}

function recordWeeklyWork({ state, task, person, workDone }) {
  let weekEntry = state.workedWeeks.find(w => w.weekNumber === state.currentWeek);

  if (!weekEntry) {
    weekEntry = { weekNumber: state.currentWeek, assignments: [] };
    state.workedWeeks.push(weekEntry);
  }

  weekEntry.assignments.push({
    taskId: task.id,
    taskTitle: task.title,
    personId: person.id,
    personName: person.name,
    personLevel: person.level,
    workDone,
    taskRemainingDuration: task.remainingDuration,
    taskRemainingRework: task.remainingReworkDuration,
  });
}

function findStartableTasks(tasks) {
  // Create a map for quick lookup
  const taskMap = new Map(tasks.map(t => [t.id, t])); // AI, this should be passed around, already calculated

  // AI, we should filter task.onlyStartableAt below as well (not in other functions)

  return tasks.filter(task => {
    // Task must have remaining work
    const isNotCompleted = task.isDone();

    // All dependencies must be complete
    const allDependenciesCompleted = !task.dependsOnTasks || task.dependsOnTasks.length === 0 || task.dependsOnTasks.every(depId => {
      const depTask = taskMap.get(depId);
      return depTask && depTask.isDone();
    });

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

function _processPersonnelLifecycle({ personnel, state, globalParams, currentDate }) {
  // Schedule automatic vacations periodically
  if (state.currentWeek % WEEKS_PER_YEAR === 0) { // AI, some people might have had vacaction, and not worked enough: state.currentWeek >= WEEKS_PER_YEAR && someoneHasWorkedAYear
    scheduleAutomaticVacations({ personnel, currentWeek: state.currentWeek, startDate: currentDate });
  }

  // Reset personnel capacity
  for (const person of personnel) {
    person.availableCapacity = 1;
  }

  // Apply vacation capacity reduction
  applyVacationToPersonnelCapacity({ personnel, currentDate });

  // Process sick leave
  for (const person of personnel) {
    // Start new sick leave if person gets sick
    if (!person.sickUntilWeek && shouldPersonGetSick(globalParams.sickRate || DEFAULT_WEEKLY_SICK_CHANCE, Math.random())) {
      const duration = generateSickLeaveDuration(Math.random());
      person.sickUntilWeek = state.currentWeek + duration;
    }

    // AI, we should also have sick calendar as well, for generating the gantt charts

    // Reduce capacity if currently sick
    if (person.sickUntilWeek && state.currentWeek <= person.sickUntilWeek) { // AI, should have a method Person.isSick(currentWeek)
      person.availableCapacity = 0;
    } else if (person.sickUntilWeek && state.currentWeek > person.sickUntilWeek) {
      // Clear sick leave marker after recovery
      delete person.sickUntilWeek;
    }
  }

  // Process turnover
  for (const person of personnel) {
    if (!person.hasDeparted && shouldPersonQuit(globalParams.turnOverRate || DEFAULT_WEEKLY_QUIT_CHANCE, Math.random())) {
      markPersonAsDeparted({ person });
      createReplacement({ person, currentWeek: state.currentWeek, personnel });
      // The logic for adding the replacement to the personnel should be here somewhere
    }
  }

  // AI, below we should decrement some kind of counter like we did for sick leaves, but for hiring and onboarding

  // Process hiring completion
  for (const person of personnel) {
    const hiringTime = globalParams.timeToHireByLevel[person.level];
    completeHiring({ person, currentWeek: state.currentWeek, hiringTimeInWeeks: hiringTime });
  }

  // Start onboarding
  for (const person of personnel) {
    const hiringTime = globalParams.timeToHireByLevel[person.level];
    if (isHiringComplete({ person, currentWeek: state.currentWeek, hiringTimeInWeeks: hiringTime })) {
      startOnboarding({ person, currentWeek: state.currentWeek, hiringTimeInWeeks: hiringTime });
    }
  }

  // Process onboarding completion
  for (const person of personnel) {
    const rampUpTime = globalParams.timeToRampUpByLevel[person.level];
    completeOnboarding({ person, currentWeek: state.currentWeek, rampUpTimeInWeeks: rampUpTime });
  }

  // AI, people onboarding should have capacity = 0 (not reduced, zero)

  // Apply onboarding capacity reduction
  const maxRampUpTime = Math.max(...Object.values(globalParams.timeToRampUpByLevel));
  applyOnboardingCapacityReduction({ personnel, currentWeek: state.currentWeek, rampUpTimeInWeeks: maxRampUpTime });
}

function _processWeeklyWorkAssignments({ tasks, personnel, state, globalParams, currentDate, taskCompletionDates }) {
  // AI, below we shouls check as well: !p.isSick() and !p.isOnVacation()
  // Filter available personnel
  const availablePersonnel = personnel.filter(p =>
    isPersonHired({ person: p }) &&
    isPersonOnboarded({ person: p }) &&
    !p.hasDeparted &&
    p.availableCapacity > 0 &&
    isPersonAvailableByDate({ person: p, currentDate, globalParams }) // AI, this func should not be necessary if we used isSick() and isOnVacation()
  );

  // Find startable tasks
  let startableTasks = findStartableTasks(tasks);

  // Filter by date constraints
  startableTasks = filterTasksByStartDate({ tasks: startableTasks, currentDate });

  if (startableTasks.length === 0) {
    // AI: Instead of returning `hadWork` on this func, we should probably split it in 3: getStartableTasks, assignTasksToPersonnel and executeAssignedWork. The upper function should then orchestrate them to do what it needs to
    return false;
  }

  // Assign tasks to personnel using heuristic
  const assignments = assignTasksToPersonnel({
    tasks: startableTasks,
    personnel: availablePersonnel,
  });

  // Execute assignments
  for (const { task, assignedPerson } of assignments) {
    const reworkRate = globalParams.reworkRateByLevel[assignedPerson.level];
    const velocityRate = globalParams.velocityByLevel[assignedPerson.level];

    const actualWork = Math.min(
      assignedPerson.availableCapacity * velocityRate,
      task.remainingDuration + task.remainingReworkDuration
    );

    task.accountWork(actualWork, reworkRate);
    assignedPerson.availableCapacity -= actualWork;

    // Record weekly work
    recordWeeklyWork({
      state,
      task,
      person: assignedPerson,
      workDone: actualWork,
    });

    // Track completion
    if (task.isDone() && !taskCompletionDates[task.id]) {
      taskCompletionDates[task.id] = state.currentWeek;
    }
  }

  // AI, we currently have a limitation above: people might be assigned to a short task that does not consume that person entires week capacity. I.e., while people has available capacity, we should keep reassigning tasks to them (until the everyone capacity is consumed or tasks are no longer available)

  return true;
}

function _checkSimulationCompletion(tasks) {
  return tasks.every(task => task.isDone());
}

function runSingleIteration({ tasks, personnel, globalParams, startDate }) {
  const state = initializeSimulationState();
  const taskCompletionDates = {};
  const MAX_WEEKS = 1000;

  // Initialize personnel hire weeks
  for (const person of personnel) {
    if (!person.hireWeek && person.hired && person.onboarded) {
      person.hireWeek = 0;
    }
  }

  while (state.currentWeek < MAX_WEEKS) {
    state.currentWeek++; // AI: Should we have this before checking the simulation is complete?
    const currentDate = _addWeeksToDate(startDate, state.currentWeek);

    // Process personnel lifecycle events (hiring, onboarding, turnover, vacations, sick leave)
    _processPersonnelLifecycle({ personnel, state, globalParams, currentDate });

    // Process weekly work assignments and execution
    const hadWork = _processWeeklyWorkAssignments({
      tasks,
      personnel,
      state,
      globalParams,
      currentDate,
      taskCompletionDates,
    });

    // Check if simulation is complete
    if (!hadWork && _checkSimulationCompletion(tasks)) {
      break;
    }
  }

  return {
    completionWeek: state.currentWeek,
    taskCompletionDates,
    workedWeeks: state.workedWeeks,
  };
}

function runMultipleIterations({ tasks, personnel, numIterations, globalParams, startDate }) {
  const iterations = [];

  for (let i = 0; i < numIterations; i++) {
    const tasksCopy = deepClone(tasks);
    const personnelCopy = deepClone(personnel);

    const result = runSingleIteration({
      tasks: tasksCopy,
      personnel: personnelCopy,
      globalParams,
      startDate,
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
  // AI: random value should be rolled here
  return randomValue < sickRate;
}

function generateSickLeaveDuration(randomValue) {
  // AI, random value should be generated here, not received
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
  // AI, randomValue should be generated here
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
  replacement.hiringStartWeek = currentWeek + 1;

  // Add to personnel array if provided
  if (personnel) {
    personnel.push(replacement);
  }

  // AI, this function should behave in 2 different ways, personnel should probably not be an arg
  return personnel ? { replacement, personnel } : replacement;
}

function startOnboarding({ person, currentWeek, hiringTimeInWeeks }) {
  if (isHiringComplete({ person, currentWeek, hiringTimeInWeeks })) {
    person.onboardingStartWeek = currentWeek;
  }
}

function completeOnboarding({ person, currentWeek, rampUpTimeInWeeks }) {
  if (isOnboardingComplete({ person, currentWeek, rampUpTimeInWeeks })) {
    person.onboarded = true;
  }
}

function hasStartDateConstraint({ task }) { // AI, function is too small and probably should be a boolean (for readability), not a func
  return task.onlyStartableAt !== undefined;
}

function getStartDateConstraint({ task }) { // AI, function is too small and probably should be a var (for readability), not a func
  return task.onlyStartableAt;
}

function isTaskStartableByDate({ task, currentDate }) {
  if (!hasStartDateConstraint({ task })) {
    return true;
  }

  const constraint = getStartDateConstraint({ task });
  return currentDate >= constraint;
}

function filterTasksByStartDate({ tasks, currentDate }) {
  return tasks.filter(task => isTaskStartableByDate({ task, currentDate }));
}

// AI: This could be O(n), instead of O(n * logn), if func({ iterations, percentileValue })
function findIterationForPercentile({ iterations, percentile }) {
  // Sort iterations by completion week
  const sorted = [...iterations].sort((a, b) => a.completionWeek - b.completionWeek);

  // AI, I guess we could have an auxiliary func to reuse the percentile computation logic
  // Calculate percentile index using same algorithm as calculatePercentiles
  const index = (percentile / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  // For simplicity, return the upper index iteration
  // (linear interpolation doesn't make sense for discrete iterations)
  if (weight > 0.5) {
    return sorted[upper];
  }
  return sorted[lower];
}

function extractTaskTimeline({ iteration }) {
  return iteration.taskCompletionDates;
}

function extractPercentilesTimeline({ iterations, percentiles }) {
  return percentiles.map(percentile => {
    const iteration = findIterationForPercentile({ iterations, percentile });
    const timeline = extractTaskTimeline({ iteration });
    return {
      percentile,
      timeline,
    };
  });
}

function _formatGanttDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function _computeTaskStartDates(workedWeeks, tasks) {
  const taskStartDates = {};

  for (const task of tasks) {
    const taskAssignments = [];
    for (const week of workedWeeks) {
      const assignment = week.assignments.find(a => a.taskId === task.id);
      if (assignment) {
        taskAssignments.push({
          week: week.weekNumber,
          person: assignment.personName,
          personId: assignment.personId,
        });
      }
    }

    if (taskAssignments.length > 0) {
      taskStartDates[task.id] = {
        startWeek: taskAssignments[0].week,
        assignments: taskAssignments,
      };
    }
  }

  return taskStartDates;
}

function _generateGanttChartMermaid({ taskStartDates, taskCompletionDates, tasks, personnel, title, startDate }) {
  let code = 'gantt\n';
  code += `    title ${title}\n`;
  code += '    dateFormat YYYY-MM-DD\n';

  // Section: Tasks with assignments
  code += '    section Tasks\n';

  for (const task of tasks) {
    if (isContainerTask(task.type)) continue;

    const completionWeek = taskCompletionDates[task.id];
    if (completionWeek === undefined) continue;

    const taskStartInfo = taskStartDates[task.id];
    if (!taskStartInfo) continue;

    // Calculate task metadata
    const initialEstimate = task.mostProbableEstimateInRange || 0;
    const finalRework = task.remainingReworkDuration || 0;
    const blockingCount = task.totalNumOfBlocks || 0;

    // Build label with metadata
    const label = `${task.title} [Est:${initialEstimate.toFixed(1)}, Rework:${finalRework.toFixed(1)}, Blocks:${blockingCount}]`;

    // Generate Gantt entry
    const startDateStr = _formatGanttDate(_addWeeksToDate(startDate, taskStartInfo.startWeek));
    const endDateStr = _formatGanttDate(_addWeeksToDate(startDate, completionWeek));

    code += `    ${label} :${task.id}, ${startDateStr}, ${endDateStr}\n`;
  }

  // Section: Vacations
  code += '    section Vacations\n';
  for (const person of personnel) {
    if (!person.vacationsAt || person.vacationsAt.length === 0) continue;

    for (let i = 0; i < person.vacationsAt.length; i++) {
      const vacation = person.vacationsAt[i];
      const fromStr = _formatGanttDate(vacation.from);
      const toStr = _formatGanttDate(vacation.to);
      code += `    ${person.name} vacation :crit, vacation-${person.id}-${i}, ${fromStr}, ${toStr}\n`;
    }
  }

  return code;
}

function generateGanttChartCode({ iteration, tasks, personnel, title, startDate }) {
  const { taskCompletionDates, workedWeeks } = iteration;

  const taskStartDates = _computeTaskStartDates(workedWeeks, tasks);

  return _generateGanttChartMermaid({
    taskStartDates,
    taskCompletionDates,
    tasks,
    personnel,
    title,
    startDate,
  });
}

function sortTasksByPriority(tasks) {
  return [...tasks].sort((a, b) => {
    // First priority: finish what we started (tasks with more work done)
    const aInProgress = a.mostProbableEstimateInRange > 0 && a.remainingDuration < a.mostProbableEstimateInRange; // AI, we should have a property Task.originalDuration to compare instead of mostProbableEstimateInRange, since the originalDuration is a probably between the fibonacciEstimate and mostProbableEstimateInRange
    const bInProgress = b.mostProbableEstimateInRange > 0 && b.remainingDuration < b.mostProbableEstimateInRange;

    if (aInProgress && !bInProgress) return -1;
    if (!aInProgress && bInProgress) return 1;

    // Second priority: tasks that block the most other tasks (greedy)
    const blocksA = a.totalNumOfBlocks || 0; // AI, we have a limitation here: totalNumOfBlocks is the original number before tasks starts being done. We should have an auxiliar Tasks.remainingNumOfBlocks, which disconsider the tasks already done. We should them use remainingNumOfBlocks here instead of totalNumOfBlocks
    const blocksB = b.totalNumOfBlocks || 0;
    return blocksB - blocksA;
  });
}

// AI, this function is useful, but I think it could be done once, before simulations even start, right?
function _sortPersonnelBySeniority(personnel) {
  const LEVEL_RANK = {
    specialist: 5,
    senior: 4,
    mid: 3,
    junior: 2,
    intern: 1,
  };

  return [...personnel].sort((a, b) => {
    return (LEVEL_RANK[b.level] || 0) - (LEVEL_RANK[a.level] || 0);
  });
}

function assignTasksToPersonnel({ tasks, personnel }) {
  // TODO: Improve heuristic to consider workload balancing, knowledge silo, and task switching penalties

  const assignments = [];
  const assignedTasks = new Set();
  const assignedPersonnel = new Set();

  const prioritizedTasks = sortTasksByPriority(tasks);
  const sortedPersonnel = _sortPersonnelBySeniority(personnel);

  for (const task of prioritizedTasks) {
    if (assignedTasks.has(task.id)) continue;

    for (const person of sortedPersonnel) {
      if (assignedPersonnel.has(person.id)) continue;
      if (person.availableCapacity <= 0) continue;
      if (!isPersonQualifiedForTask({ person, task })) continue;

      assignments.push({ task, assignedPerson: person });
      assignedTasks.add(task.id);
      assignedPersonnel.add(person.id);
      break;
    }
  }

  return assignments;
}

function generateChangeRequests({ tasks, splitRate }) {
  const userStories = tasks.filter(t => t.type === TASK_TYPE.USER_STORY);

  if (userStories.length === 0 || !splitRate || splitRate === 0) {
    return { changeRequestMilestone: null, changeRequestTasks: [] };
  }

  const avgEstimate = userStories.reduce((sum, t) => sum + (t.mostProbableEstimateInRange || 0), 0) / userStories.length;

  const leafTasks = tasks.filter(t => !isContainerTask(t.type));
  const totalEffort = leafTasks.reduce((sum, t) => sum + (t.mostProbableEstimateInRange || 0), 0);

  const totalChangeEffort = totalEffort * splitRate;
  const numChangeRequests = Math.ceil(totalChangeEffort / avgEstimate);

  const changeRequestMilestone = new Task({
    id: 'milestone-change-requests',
    title: 'Change Requests',
    type: TASK_TYPE.MILESTONE,
  });

  changeRequestMilestone.dependsOnTasks = tasks
    .filter(t => t.type === TASK_TYPE.MILESTONE)
    .map(t => t.id);

  const changeRequestTasks = [];

  for (let i = 1; i <= numChangeRequests; i++) {
    const crTask = new Task({
      id: `change-request-${i}`,
      title: `Change Request: ${i}`,
      type: TASK_TYPE.USER_STORY,
    });
    crTask.fibonacciEstimate = Math.ceil(avgEstimate); // AI, this should be the next fibonacci, greater than mostProbableEstimateInRange
    crTask.mostProbableEstimateInRange = avgEstimate;
    crTask.parents = [changeRequestMilestone.id];

    changeRequestTasks.push(crTask);
  }

  return { changeRequestMilestone, changeRequestTasks };
}

function injectChangeRequestsIntoTaskList({ tasks, taskMap, changeRequestMilestone, changeRequestTasks }) {
  tasks.push(changeRequestMilestone);
  tasks.push(...changeRequestTasks);

  taskMap.set(changeRequestMilestone.id, changeRequestMilestone);
  changeRequestTasks.forEach(cr => taskMap.set(cr.id, cr));

  const project = tasks.find(t => t.type === TASK_TYPE.PROJECT);
  if (project) {
    changeRequestMilestone.parents = [project.id];
  }
}

function _calculateWeeksBetween(startDate, targetDate) {
  const diffMs = targetDate.getTime() - startDate.getTime();
  return Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
}

function _addWeeksToDate(date, weeks) {
  const result = new Date(date);
  result.setDate(result.getDate() + weeks * 7);
  return result;
}

function scheduleAutomaticVacations({ personnel, currentWeek, startDate }) {
  const vacationCalendar = new Map(); // AI, this probably should be global at the simulation level

  for (const person of personnel) {
    if (!person.vacationsAt) continue;

    for (const vacation of person.vacationsAt) {
      const fromWeek = _calculateWeeksBetween(startDate, vacation.from);
      const toWeek = _calculateWeeksBetween(startDate, vacation.to);

      for (let week = fromWeek; week <= toWeek; week++) {
        // AI, we have a limitation here: if 2+ people have vacations at the same time, this map cant represent it
        vacationCalendar.set(week, person.id);
      }
    }
  }

  for (const person of personnel) {
    if (!person.hireWeek) continue;

    const weeksEmployed = currentWeek - person.hireWeek;
    const yearsEmployed = Math.floor(weeksEmployed / WEEKS_PER_YEAR);

    const expectedVacationWeeks = yearsEmployed * VACATION_WEEKS_PER_YEAR;

    if (!person.vacationsAt) {
      person.vacationsAt = [];
    }

    const assignedWeeks = person.vacationsAt.reduce((sum, v) => {
      const diffMs = v.to.getTime() - v.from.getTime();
      const diffWeeks = Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000));
      return sum + diffWeeks;
    }, 0);

    // AI, we need to fix here: the initial assigned weeks does not count on the expectedVacationWeeks. During people vacations, we just don't increase their workedWeeks
    const missingWeeks = expectedVacationWeeks - assignedWeeks;

    if (missingWeeks > 0) {
      let candidateStartWeek = currentWeek + 1;

      while (true) {
        let conflictFound = false;

        for (let week = candidateStartWeek; week < candidateStartWeek + missingWeeks; week++) {
          if (vacationCalendar.has(week)) {
            conflictFound = true;
            candidateStartWeek = week + 1;
            break;
          }
        }

        if (!conflictFound) {
          // AI, this wont work, since this new date can also have conflict. We need a proper auxiliary findWeekForVacation({ vacationCalendar, numOfVacationWeeks }) -> weekNumber
          const fromDate = _addWeeksToDate(startDate, candidateStartWeek);
          const toDate = _addWeeksToDate(startDate, candidateStartWeek + missingWeeks - 1);

          person.vacationsAt.push({ from: fromDate, to: toDate });

          for (let week = candidateStartWeek; week < candidateStartWeek + missingWeeks; week++) {
            vacationCalendar.set(week, person.id);
          }

          break;
        }
      }
    }
  }
}

function isPersonAvailableByDate({ person, currentDate, globalParams }) {
  if (!person.startDate) {
    return true;
  }

  const hiringTime = globalParams.timeToHireByLevel[person.level];
  const rampUpTime = globalParams.timeToRampUpByLevel[person.level]; // AI, is this considered onboard or is a separated concept?
  const totalWeeksNeeded = hiringTime + rampUpTime;

  const availableDate = _addWeeksToDate(person.startDate, totalWeeksNeeded);

  return currentDate >= availableDate;
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
  recordWeeklyWork,
  findStartableTasks,
  isPersonQualifiedForTask,
  assignWorkToTask,
  runSingleIteration,
  runMultipleIterations,
  calculatePercentiles,
  sortTasksByPriority,
  assignTasksToPersonnel,
  generateChangeRequests,
  injectChangeRequestsIntoTaskList,
  scheduleAutomaticVacations,
  isPersonAvailableByDate,
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
  startOnboarding,
  completeOnboarding,
  hasStartDateConstraint,
  getStartDateConstraint,
  isTaskStartableByDate,
  filterTasksByStartDate,
  findIterationForPercentile,
  extractTaskTimeline,
  extractPercentilesTimeline,
  generateGanttChartCode,
  _calculateCompletionDate,
  runMonteCarloSimulation,
};
