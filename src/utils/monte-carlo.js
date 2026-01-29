import seedrandom from 'seedrandom';
import os from 'os';
import { fileURLToPath } from 'url';
import { deepClone } from './graph.js';
import { info, debug } from './logger.js';
import runInWorker from './run-in-worker.js';
import {
  LEVEL,
  LEVEL_RANK,
  DEFAULT_VELOCITY_RATE,
  DEFAULT_TASK_SPLIT_RATE,
  DEFAULT_WEEKLY_SICK_CHANCE,
  DEFAULT_WEEKLY_QUIT_CHANCE,
  Task,
  Person,
  TASK_TYPE,
  isContainerTask,
  getNextFibonacci
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

// Heuristic weights for task assignment scoring
const ASSIGNMENT_HEURISTIC_WEIGHTS = {
  affinity: 0.35,
  workload: 0.25,
  continuity: 0.20,
  seniority: 0.10,
  knowledgeSpread: 0.10,
};

function _getLevelRank(level) {
  return LEVEL_HIERARCHY.indexOf(level);
}

// Helper to check if task is done (works with both class instances and plain objects from deepClone)
function _isTaskDone(task) {
  if (typeof task.isDone === 'function') {
    return task.isDone();
  }
  // Fallback for plain objects (after deepClone)
  return task.remainingDuration <= 0 && task.remainingReworkDuration <= 0;
}

// Helper to account work on a task (works with both class instances and plain objects)
function _accountWork(task, spentDuration, reworkRateToConsider) {
  if (typeof task.accountWork === 'function') {
    return task.accountWork(spentDuration, reworkRateToConsider);
  }
  // Fallback for plain objects (after deepClone)
  if (task.remainingDuration === undefined) {
    task.remainingDuration = 0;
  }
  if (task.remainingReworkDuration === undefined) {
    task.remainingReworkDuration = 0;
  }

  if (task.remainingDuration >= spentDuration) {
    task.remainingDuration -= spentDuration;
    task.remainingReworkDuration += spentDuration * reworkRateToConsider;
    task.remainingReworkDuration = Math.round(task.remainingReworkDuration * 1e10) / 1e10;
    return;
  }

  const spentOnOriginal = task.remainingDuration;
  task.remainingDuration = 0;
  task.remainingReworkDuration += spentOnOriginal * reworkRateToConsider;

  const spentOnRework = spentDuration - spentOnOriginal;
  task.remainingReworkDuration = Math.max(0, task.remainingReworkDuration - spentOnRework);
  task.remainingReworkDuration = Math.round(task.remainingReworkDuration * 1e10) / 1e10;
}

// Helper to check if person is sick (works with both class instances and plain objects from deepClone)
function _isPersonSick(person, currentWeek) {
  if (typeof person.isSick === 'function') {
    return person.isSick(currentWeek);
  }
  // Fallback for plain objects (after deepClone)
  if (!person.sickUntilWeek) {
    return false;
  }
  return currentWeek <= person.sickUntilWeek;
}

// Helper to check if person is on vacation (works with both class instances and plain objects)
function _isPersonOnVacation(person, currentDate) {
  if (typeof person.isOnVacation === 'function') {
    return person.isOnVacation(currentDate);
  }
  // Fallback for plain objects (after deepClone)
  if (!person.vacationsAt || person.vacationsAt.length === 0) {
    return false;
  }
  const dateToCheck = currentDate instanceof Date ? currentDate : new Date(currentDate);
  for (const vacation of person.vacationsAt) {
    const fromDate = vacation.from instanceof Date ? vacation.from : new Date(vacation.from);
    const toDate = vacation.to instanceof Date ? vacation.to : new Date(vacation.to);
    if (dateToCheck >= fromDate && dateToCheck <= toDate) {
      return true;
    }
  }
  return false;
}

function _isLevelSufficient(personLevel, requiredLevel) {
  return _getLevelRank(personLevel) >= _getLevelRank(requiredLevel);
}

function initializeSimulationState() {
  return {
    currentWeek: 0,
    workedWeeks: [],
    // Track total assignments per person (for workload balancing heuristic)
    assignmentCounts: new Map(),
    // Track which skills each person has worked on (for knowledge spread heuristic)
    // Maps skillName -> Set of personIds
    skillWorkHistory: new Map(),
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

// Updates tracking maps used by the assignment heuristics
// Assumes state.assignmentCounts and state.skillWorkHistory are already initialized
function _updateAssignmentTracking({ assignments, state }) {
  for (const { task, assignedPerson } of assignments) {
    // Increment assignment count for person
    const currentCount = state.assignmentCounts.get(assignedPerson.id) || 0;
    state.assignmentCounts.set(assignedPerson.id, currentCount + 1);

    // Update skill work history
    if (task.requiredSkills) {
      for (const skill of task.requiredSkills) {
        if (!state.skillWorkHistory.has(skill.name)) {
          state.skillWorkHistory.set(skill.name, new Set());
        }
        state.skillWorkHistory.get(skill.name).add(assignedPerson.id);
      }
    }

    // Track last assignee for continuity
    task.lastAssignee = assignedPerson.id;
  }
}

function findStartableTasks(incompleteTasks, taskMap) {
  // incompleteTasks is a Set of task objects (only incomplete leaf tasks)
  // taskMap is used for dependency lookup
  const result = [];

  for (const task of incompleteTasks) {
    // All dependencies must be complete
    const allDependenciesCompleted = !task.dependsOnTasks || task.dependsOnTasks.length === 0 || task.dependsOnTasks.every(depId => {
      const depTask = taskMap.get(depId);
      return depTask && _isTaskDone(depTask);
    });

    if (allDependenciesCompleted) {
      result.push(task);
    }
  }

  return result;
}

function isPersonQualifiedForTask({ person, task }) {
  if (!task.requiredSkills || task.requiredSkills.length === 0) {
    return true;
  }

  return task.requiredSkills.every(requiredSkill => {
    const matchingSkill = person.skills.find(s => s.name === requiredSkill.name);

    if (!matchingSkill) {
      return false;
    }

    return _isLevelSufficient(matchingSkill.minLevel, requiredSkill.minLevel);
  });
}

// Scoring function for skill affinity: measures how well person's skills match task requirements
// Returns value between 0 and 1. Considers:
// - Whether person has all required skills at sufficient level
// - Exact level matches are preferred (1.0) over overqualified (0.8)
// - Person with fewer total skills gets higher score (less overqualified)
function _calculateSkillAffinity({ person, task }) {
  if (!task.requiredSkills || task.requiredSkills.length === 0) {
    return 1.0;
  }

  let matchScore = 0;
  for (const requiredSkill of task.requiredSkills) {
    const matchingSkill = person.skills.find(s => s.name === requiredSkill.name);

    if (!matchingSkill) {
      return 0;
    }

    const personLevelRank = LEVEL_RANK[matchingSkill.minLevel] || 0;
    const requiredLevelRank = LEVEL_RANK[requiredSkill.minLevel] || 0;

    if (personLevelRank < requiredLevelRank) {
      return 0;
    }

    // Exact match is preferred (1.0), overqualified gets slightly lower score (0.8)
    const isExactMatch = personLevelRank === requiredLevelRank;
    matchScore += isExactMatch ? 1.0 : 0.8;
  }

  const skillMatchRatio = matchScore / task.requiredSkills.length;

  // Penalize people with many extra skills (they're overqualified for this task)
  const totalPersonSkills = person.skills?.length || 0;
  const numRequiredSkills = task.requiredSkills.length;
  const overqualificationPenalty = totalPersonSkills > numRequiredSkills
    ? numRequiredSkills / totalPersonSkills
    : 1.0;

  return skillMatchRatio * overqualificationPenalty;
}

// Scoring function for workload balancing: prefers people with fewer active assignments
// Returns score between 0 and 1, where 1 means least loaded
function _calculateWorkloadScore({ person, assignmentCounts }) {
  const currentCount = assignmentCounts.get(person.id) || 0;
  const maxCount = Math.max(...assignmentCounts.values(), 1);
  return 1 - (currentCount / (maxCount + 1));
}

// Scoring function for task continuity: prefers continuing with the same person
// Returns 1.0 if person was last assignee, 0 otherwise
function _calculateContinuityScore({ person, task }) {
  return task.lastAssignee === person.id ? 1.0 : 0;
}

// Scoring function for knowledge spread: prefers spreading skill knowledge across the team
// Returns higher score for people who haven't worked on this skill area yet
// skillWorkHistory maps skillName -> Set of personIds who have worked on it
function _calculateKnowledgeSpreadScore({ person, task, skillWorkHistory }) {
  if (!task.requiredSkills || task.requiredSkills.length === 0) {
    return 1.0;
  }

  let spreadScore = 0;
  for (const requiredSkill of task.requiredSkills) {
    const workersOnSkill = skillWorkHistory.get(requiredSkill.name);

    if (!workersOnSkill || workersOnSkill.size === 0) {
      // No one has worked on this skill yet - high score for spreading
      spreadScore += 1.0;
    } else if (!workersOnSkill.has(person.id)) {
      // Person hasn't worked on this skill - prefer them to spread knowledge
      spreadScore += 0.8;
    } else {
      // Person already worked on this skill - lower score
      spreadScore += 0.3;
    }
  }

  return spreadScore / task.requiredSkills.length;
}

// Combined scoring function for candidate evaluation
// Weights different factors to produce overall suitability score
function _scoreCandidateForTask({ person, task, assignmentCounts, skillWorkHistory }) {
  const affinity = _calculateSkillAffinity({ person, task });
  const workload = _calculateWorkloadScore({ person, assignmentCounts });
  const continuity = _calculateContinuityScore({ person, task });
  const seniority = (LEVEL_RANK[person.level] || 0) / 5;
  const knowledgeSpread = _calculateKnowledgeSpreadScore({ person, task, skillWorkHistory });

  return (
    ASSIGNMENT_HEURISTIC_WEIGHTS.affinity * affinity +
    ASSIGNMENT_HEURISTIC_WEIGHTS.workload * workload +
    ASSIGNMENT_HEURISTIC_WEIGHTS.continuity * continuity +
    ASSIGNMENT_HEURISTIC_WEIGHTS.seniority * seniority +
    ASSIGNMENT_HEURISTIC_WEIGHTS.knowledgeSpread * knowledgeSpread
  );
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

function _processPersonnelLifecycle({ personnel, state, globalParams, currentDate, randomFunc, logContext = {} }) {
  // Reset personnel capacity
  for (const person of personnel) {
    person.availableCapacity = 1;
  }

  // Apply vacation capacity reduction
  applyVacationToPersonnelCapacity({ personnel, currentDate });

  // Process sick leave
  for (const person of personnel) {
    // Start new sick leave if person gets sick
    if (!person.sickUntilWeek && shouldPersonGetSick(globalParams.sickRate, randomFunc)) {
      const duration = generateSickLeaveDuration(randomFunc);
      person.sickUntilWeek = state.currentWeek + duration;
      info('Person got sick', { personId: person.id, duration, ...logContext });

      // Track sick leave periods for Gantt chart
      if (!person.sickLeaves) {
        person.sickLeaves = [];
      }
      person.sickLeaves.push({
        startWeek: state.currentWeek,
        endWeek: person.sickUntilWeek,
      });
    }

    // Reduce capacity if currently sick
    if (_isPersonSick(person, state.currentWeek)) {
      person.availableCapacity = 0;
    } else if (person.sickUntilWeek && state.currentWeek > person.sickUntilWeek) {
      // Clear sick leave marker after recovery
      delete person.sickUntilWeek;
    }
  }

  // Process turnover
  for (const person of personnel) {
    if (!person.hasDeparted && shouldPersonQuit(globalParams.turnOverRate, randomFunc)) {
      markPersonAsDeparted({ person });
      const replacement = createReplacement({ person, currentWeek: state.currentWeek });
      personnel.push(replacement);
      info('Person quit and was replaced', { personId: person.id, replacementId: replacement.id, ...logContext });
    }
  }

  // Process hiring/onboarding counters (decrement like sick leaves)
  for (const person of personnel) {
    // Initialize hiring counter when hiring starts
    if (person.hiringStartWeek !== undefined && person.hiringWeeksRemaining === undefined) {
      const hiringTime = globalParams.timeToHireByLevel[person.level];
      person.hiringWeeksRemaining = hiringTime;
    }

    // Decrement hiring counter
    if (person.hiringWeeksRemaining !== undefined && person.hiringWeeksRemaining > 0) {
      person.hiringWeeksRemaining--;
    }

    // Complete hiring when counter reaches 0
    if (person.hiringWeeksRemaining !== undefined && person.hiringWeeksRemaining <= 0 && !person.hired) {
      person.hired = true;
      info('Person hired', { personId: person.id, personLevel: person.level, ...logContext });

      // Initialize onboarding counter
      const rampUpTime = globalParams.timeToRampUpByLevel[person.level];
      person.onboardingWeeksRemaining = rampUpTime;
    }

    // Decrement onboarding counter
    if (person.onboardingWeeksRemaining !== undefined && person.onboardingWeeksRemaining > 0) {
      person.onboardingWeeksRemaining--;
    }

    // Complete onboarding when counter reaches 0
    if (person.onboardingWeeksRemaining !== undefined && person.onboardingWeeksRemaining <= 0 && !person.onboarded) {
      person.onboarded = true;
      info('Person onboarded', { personId: person.id, personLevel: person.level, ...logContext });
    }
  }

  // Apply onboarding capacity (set to 0 for people still onboarding)
  applyOnboardingCapacityReduction({ personnel });

  // Track worked weeks per person and schedule vacations based on actual work
  // Onboarding counts as work, but vacation and sick leave do not

  // Build vacation calendar once for conflict checking (performance optimization)
  const vacationCalendar = _buildVacationCalendar({ personnel, startDate: currentDate });

  for (const person of personnel) {
    if (person.hasDeparted) continue;
    if (!isPersonHired({ person })) continue;

    const isOnVacation = _isPersonOnVacation(person, currentDate);
    const isSick = _isPersonSick(person, state.currentWeek);
    if (isOnVacation || isSick) continue;

    person.workedWeeks = (person.workedWeeks || 0) + 1;

    // Schedule vacation when person completes a full year of actual work
    const hasWorkedAYear = person.workedWeeks / WEEKS_PER_YEAR >= 1;
    if (hasWorkedAYear) {
      _scheduleVacationForPerson({ person, currentWeek: state.currentWeek, startDate: currentDate, vacationCalendar });
      person.workedWeeks = 0;
      debug('Vacation scheduled', { personId: person.id, ...logContext });
    }
  }
}

function _getAvailablePersonnel({ personnel, currentWeek, currentDate }) {
  return personnel.filter(p =>
    isPersonHired({ person: p }) &&
    isPersonOnboarded({ person: p }) &&
    !p.hasDeparted &&
    p.availableCapacity > 0 &&
    !_isPersonSick(p, currentWeek) &&
    !_isPersonOnVacation(p, currentDate)
  );
}

function _getStartableTasks({ incompleteTasks, taskMap, currentDate }) {
  const startable = findStartableTasks(incompleteTasks, taskMap);
  return filterTasksByStartDate({ tasks: startable, currentDate });
}

function _executeAssignments({ assignments, state, globalParams, taskCompletionDates, incompleteTasks, skipWorkedWeeks = false, logContext = {} }) {
  for (const { task, assignedPerson } of assignments) {
    const reworkRate = globalParams.reworkRateByLevel[assignedPerson.level];
    const velocityRate = globalParams.velocityByLevel[assignedPerson.level];

    const actualWork = Math.min(
      assignedPerson.availableCapacity * velocityRate,
      task.remainingDuration + task.remainingReworkDuration
    );

    _accountWork(task, actualWork, reworkRate);
    assignedPerson.availableCapacity -= actualWork;

    // Record weekly work (skip if not needed for memory optimization)
    if (!skipWorkedWeeks) {
      recordWeeklyWork({
        state,
        task,
        person: assignedPerson,
        workDone: actualWork,
      });
    }

    // Track completion and remove from incomplete set
    if (_isTaskDone(task) && !taskCompletionDates[task.id]) {
      taskCompletionDates[task.id] = state.currentWeek;
      incompleteTasks.delete(task);
      info('Task completed', { taskId: task.id, completionWeek: state.currentWeek, ...logContext });
    }
  }
}

function _processWeeklyWorkAssignments({ incompleteTasks, taskMap, personnel, state, globalParams, currentDate, taskCompletionDates, skipWorkedWeeks = false, logContext = {} }) {
  let hadAnyWork = false;

  // Keep assigning until no more work can be done (allows multiple tasks per person per week)
  while (true) {
    const availablePersonnel = _getAvailablePersonnel({
      personnel,
      currentWeek: state.currentWeek,
      currentDate,
    });

    if (availablePersonnel.length === 0) {
      break;
    }

    const startableTasks = _getStartableTasks({ incompleteTasks, taskMap, currentDate });

    if (startableTasks.length === 0) {
      break;
    }

    const assignments = assignTasksToPersonnel({
      tasks: startableTasks,
      personnel: availablePersonnel,
      assignmentCounts: state.assignmentCounts,
      skillWorkHistory: state.skillWorkHistory,
      logContext,
    });

    if (assignments.length === 0) {
      break;
    }

    debug('Assignments made', {
      assignments: assignments.map(a => ({ task: a.task.id, person: a.assignedPerson.id })),
      ...logContext,
    });

    // Update tracking maps for heuristics
    _updateAssignmentTracking({ assignments, state });

    _executeAssignments({
      assignments,
      state,
      globalParams,
      taskCompletionDates,
      incompleteTasks,
      skipWorkedWeeks,
      logContext,
    });

    hadAnyWork = true;
  }

  return hadAnyWork;
}

function _checkSimulationCompletion(incompleteTasks) {
  return incompleteTasks.size === 0;
}

function _validateSimulationCompletion({ tasks, personnel, taskCompletionDates, maxWeeks }) {
  const incompleteTasks = tasks.filter(task => !_isTaskDone(task) && !isContainerTask(task.type));

  if (incompleteTasks.length === 0) {
    return; // All tasks completed
  }

  const incompleteTaskDetails = incompleteTasks.map(task => {
    const reasons = [];

    // Check if task has unmet dependencies
    if (task.dependsOnTasks && task.dependsOnTasks.length > 0) {
      const incompleteDeps = task.dependsOnTasks.filter(depId => !taskCompletionDates[depId]);
      if (incompleteDeps.length > 0) {
        reasons.push(`blocked by incomplete dependencies: ${incompleteDeps.join(', ')}`);
      }
    }

    // Check if no one has the required skills
    if (task.requiredSkills && task.requiredSkills.length > 0) {
      const missingSkills = task.requiredSkills.filter(reqSkill => {
        return !personnel.some(person =>
          person.skills && person.skills.some(skill =>
            skill.name === reqSkill.name && _getLevelRank(skill.minLevel) >= _getLevelRank(reqSkill.minLevel)
          )
        );
      });

      if (missingSkills.length > 0) {
        const skillDetails = missingSkills.map(s => `${s.name}:${s.minLevel}`).join(', ');
        reasons.push(`no personnel with required skills: ${skillDetails}`);
      }
    }

    if (reasons.length === 0) {
      reasons.push('unknown reason');
    }

    return {
      taskId: task.id,
      taskTitle: task.title,
      reasons,
    };
  });

  const errorMessage = `Simulation could not complete after ${maxWeeks} weeks. Incomplete tasks:\n` +
    incompleteTaskDetails.map(t => `  - ${t.taskId} (${t.taskTitle}): ${t.reasons.join('; ')}`).join('\n');

  throw new Error(errorMessage);
}

function runSingleIteration({ tasks, personnel, globalParams, startDate, seed, taskMap, skipWorkedWeeks = false, logContext = {} }) {
  const randomFunc = seedrandom(seed);
  const state = initializeSimulationState();
  const taskCompletionDates = {};
  const MAX_WEEKS = 1000;

  // Initialize task durations and build incomplete tasks set
  const incompleteTasks = new Set();
  for (const task of tasks) {
    if (task.remainingDuration === undefined) {
      task.remainingDuration = task.mostProbableEstimateInRange || 0;
      task.originalDuration = task.remainingDuration;
    }
    if (task.remainingReworkDuration === undefined) {
      task.remainingReworkDuration = 0;
    }
    // Add all tasks with work to incomplete set
    if (task.remainingDuration > 0 || task.remainingReworkDuration > 0) {
      incompleteTasks.add(task);
    }
  }

  // Initialize personnel runtime properties
  for (const person of personnel) {
    if (!person.hireWeek && person.hired && person.onboarded) {
      person.hireWeek = 0;
    }

    // Initialize onboarding counter for people who are hired but not onboarded
    if (person.hired && !person.onboarded && person.onboardingWeeksRemaining === undefined) {
      const rampUpTime = globalParams.timeToRampUpByLevel[person.level];
      person.onboardingWeeksRemaining = rampUpTime;
      person.hireWeek = 0;
      debug('Person initialized for onboarding', {
        personId: person.id,
        onboardingWeeksRemaining: rampUpTime,
        ...logContext,
      });
    }

    // Convert startDate to hiringStartWeek for people not yet hired
    if (person.startDate && !person.hired) {
      const weekNumber = _calculateWeeksBetween(startDate, person.startDate);
      person.hiringStartWeek = Math.max(1, weekNumber);
      debug('Person startDate converted to hiringStartWeek', {
        personId: person.id,
        startDate: person.startDate.toISOString(),
        hiringStartWeek: person.hiringStartWeek,
        ...logContext,
      });
    }
  }

  while (state.currentWeek < MAX_WEEKS) {
    state.currentWeek++;
    logContext.week = state.currentWeek;
    const currentDate = _addWeeksToDate(startDate, state.currentWeek);

    // Process personnel lifecycle events (hiring, onboarding, turnover, vacations, sick leave)
    _processPersonnelLifecycle({ personnel, state, globalParams, currentDate, randomFunc, logContext });

    // Process weekly work assignments and execution
    const hadWork = _processWeeklyWorkAssignments({
      incompleteTasks,
      taskMap,
      personnel,
      state,
      globalParams,
      currentDate,
      taskCompletionDates,
      skipWorkedWeeks,
      logContext,
    });

    // Check if simulation is complete
    if (!hadWork && _checkSimulationCompletion(incompleteTasks)) {
      info('Simulation complete', { reason: 'All tasks done', ...logContext });
      break;
    }
  }

  // Validate all tasks completed - throws error if tasks remain incomplete
  _validateSimulationCompletion({ tasks, personnel, taskCompletionDates, maxWeeks: MAX_WEEKS });

  return {
    completionWeek: state.currentWeek,
    taskCompletionDates,
    workedWeeks: state.workedWeeks,
  };
}

function runMultipleIterations({ tasks, personnel, numIterations, globalParams, startDate, logContext = {} }) {
  const iterations = [];

  info('Starting Monte Carlo simulation', { numIterations, ...logContext });

  for (let i = 0; i < numIterations; i++) {
    logContext.iterationIndex = i;
    const tasksCopy = deepClone(tasks);
    const personnelCopy = deepClone(personnel);
    const taskMap = new Map(tasksCopy.map(t => [t.id, t]));

    const seed = Date.now() + i;
    const result = runSingleIteration({
      tasks: tasksCopy,
      personnel: personnelCopy,
      globalParams,
      startDate,
      seed,
      taskMap,
      skipWorkedWeeks: true,
      logContext,
    });

    info('Iteration completed', { completionWeek: result.completionWeek, ...logContext });

    // Store minimal data for memory optimization (workedWeeks skipped)
    iterations.push({
      completionWeek: result.completionWeek,
      taskCompletionDates: result.taskCompletionDates,
      seed,
    });
  }

  return {
    iterations,
  };
}

// Runs a batch of iterations (used by workers for parallel execution)
function runIterationBatch({ tasks, personnel, globalParams, startDate, seeds }) {
  const iterations = [];

  for (const seed of seeds) {
    const tasksCopy = deepClone(tasks);
    const personnelCopy = deepClone(personnel);
    const taskMap = new Map(tasksCopy.map(t => [t.id, t]));

    const result = runSingleIteration({
      tasks: tasksCopy,
      personnel: personnelCopy,
      globalParams,
      startDate: new Date(startDate),
      seed,
      taskMap,
      skipWorkedWeeks: true,
    });

    iterations.push({
      completionWeek: result.completionWeek,
      taskCompletionDates: result.taskCompletionDates,
      seed,
    });
  }

  return iterations;
}

// Runs multiple iterations in parallel using worker threads
async function runMultipleIterationsParallel({ tasks, personnel, numIterations, globalParams, startDate, numWorkers, logContext = {} }) {
  const workerCount = numWorkers || Math.max(1, os.cpus().length - 1);
  const iterationsPerWorker = Math.ceil(numIterations / workerCount);

  info('Starting parallel Monte Carlo simulation', { numIterations, numWorkers: workerCount, ...logContext });

  // Generate all seeds upfront
  const baseSeed = Date.now();
  const allSeeds = Array.from({ length: numIterations }, (_, i) => baseSeed + i);

  // Split seeds into batches for each worker
  const batches = [];
  for (let i = 0; i < workerCount; i++) {
    const startIdx = i * iterationsPerWorker;
    const endIdx = Math.min(startIdx + iterationsPerWorker, numIterations);
    if (startIdx < numIterations) {
      batches.push(allSeeds.slice(startIdx, endIdx));
    }
  }

  // Get the module path for workers
  const modulePath = fileURLToPath(import.meta.url);

  // Run batches in parallel
  const workerPromises = batches.map(seeds =>
    runInWorker({
      modulePath,
      exportName: 'runIterationBatch',
      args: [{ tasks, personnel, globalParams, startDate: startDate.toISOString(), seeds }],
    })
  );

  const results = await Promise.all(workerPromises);

  // Flatten results from all workers
  const iterations = results.flat();

  info('Parallel simulation complete', { totalIterations: iterations.length, ...logContext });

  return { iterations };
}

// Quickselect algorithm - O(n) average time to find k-th smallest element
function _quickselect(arr, k, left = 0, right = arr.length - 1) {
  while (left < right) {
    const pivotIndex = _partition(arr, left, right);

    if (pivotIndex === k) {
      return arr[k];
    } else if (pivotIndex < k) {
      left = pivotIndex + 1;
    } else {
      right = pivotIndex - 1;
    }
  }
  return arr[left];
}

function _partition(arr, left, right) {
  // Use median of three for better pivot selection
  const mid = Math.floor((left + right) / 2);
  if (arr[mid] < arr[left]) {
    [arr[left], arr[mid]] = [arr[mid], arr[left]];
  }
  if (arr[right] < arr[left]) {
    [arr[left], arr[right]] = [arr[right], arr[left]];
  }
  if (arr[mid] < arr[right]) {
    [arr[mid], arr[right]] = [arr[right], arr[mid]];
  }

  const pivot = arr[right];
  let i = left;

  for (let j = left; j < right; j++) {
    if (arr[j] <= pivot) {
      [arr[i], arr[j]] = [arr[j], arr[i]];
      i++;
    }
  }

  [arr[i], arr[right]] = [arr[right], arr[i]];
  return i;
}

function _calculatePercentileQuickselect(arr, percentile) {
  const n = arr.length;
  const index = (percentile / 100) * (n - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  // Make a copy for quickselect (it mutates the array)
  const copy = [...arr];

  const lowerValue = _quickselect(copy, lower);

  if (lower === upper) {
    return lowerValue;
  }

  // For upper value, partition was already done, find min in right partition
  let upperValue = Infinity;
  for (let i = lower + 1; i < n; i++) {
    if (copy[i] < upperValue) {
      upperValue = copy[i];
    }
  }

  return lowerValue * (1 - weight) + upperValue * weight;
}

function calculatePercentiles(values, percentilesOfInterest = [50, 75, 90, 95, 99]) {
  // For large arrays, use quickselect for O(n) performance per percentile
  const result = {};

  for (const percentile of percentilesOfInterest) {
    result[`p${percentile}`] = _calculatePercentileQuickselect(values, percentile);
  }

  return result;
}

function shouldTaskSplit(splitRate, randomValue) {
  const effectiveSplitRate = splitRate !== undefined ? splitRate : DEFAULT_TASK_SPLIT_RATE;
  return randomValue < effectiveSplitRate;
}

function createSplitTask({ task, tasks }) {
  // Create new task with same properties
  const splitTask = new Task({ id: `${task.id}-split-${Date.now()}`, title: task.title, type: task.type });

  // Copy properties (spread to avoid mutating original arrays)
  splitTask.requiredSkills = [...(task.requiredSkills || [])];
  splitTask.tasksBeingBlocked = [...(task.tasksBeingBlocked || [])];

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

function shouldPersonGetSick(sickRate, randomFunc) {
  const rate = sickRate ?? DEFAULT_WEEKLY_SICK_CHANCE;
  return randomFunc() < rate;
}

function generateSickLeaveDuration(randomFunc) {
  return Math.floor(randomFunc() * 5) + 1;
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

function applyOnboardingCapacityReduction({ personnel }) {
  for (const person of personnel) {
    // Set capacity to 0 if person is onboarding (not fully onboarded yet)
    // People onboarding should not work on tasks - they are in training/learning mode
    const isOnboarding = person.onboardingWeeksRemaining !== undefined && person.onboardingWeeksRemaining > 0;
    if (isOnboarding) {
      person.availableCapacity = 0;
    }
  }
}

function shouldPersonQuit(quitRate, randomFunc) {
  const rate = quitRate ?? DEFAULT_WEEKLY_QUIT_CHANCE;
  return randomFunc() < rate;
}

function markPersonAsDeparted({ person }) {
  person.hasDeparted = true;
  person.availableCapacity = 0;
}

function filterActivePersonnel({ personnel }) {
  return personnel.filter(person => !person.hasDeparted);
}

function createReplacement({ person, currentWeek }) {
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

  return replacement;
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

function isTaskStartableByDate({ task, currentDate }) {
  if (task.onlyStartableAt === undefined) {
    return true;
  }
  return currentDate >= task.onlyStartableAt;
}

function filterTasksByStartDate({ tasks, currentDate }) {
  return tasks.filter(task => isTaskStartableByDate({ task, currentDate }));
}

// Quickselect variant for iteration objects (by completionWeek)
function _quickselectIteration(arr, k, left = 0, right = arr.length - 1) {
  while (left < right) {
    const pivotIndex = _partitionIteration(arr, left, right);

    if (pivotIndex === k) {
      return arr[k];
    } else if (pivotIndex < k) {
      left = pivotIndex + 1;
    } else {
      right = pivotIndex - 1;
    }
  }
  return arr[left];
}

function _partitionIteration(arr, left, right) {
  const pivot = arr[right].completionWeek;
  let i = left;

  for (let j = left; j < right; j++) {
    if (arr[j].completionWeek <= pivot) {
      [arr[i], arr[j]] = [arr[j], arr[i]];
      i++;
    }
  }

  [arr[i], arr[right]] = [arr[right], arr[i]];
  return i;
}

function findClosestIterationForTargetCompletionWeek({ iterations, targetCompletionWeek }) {
  // Find the first iteration that matches the target completion week
  const match = iterations.find(iter => iter.completionWeek === targetCompletionWeek);
  if (match) return match;

  // Fallback: find the closest iteration if no exact match
  return iterations.reduce((closest, iter) => {
    const currentDiff = Math.abs(iter.completionWeek - targetCompletionWeek);
    const closestDiff = Math.abs(closest.completionWeek - targetCompletionWeek);
    return currentDiff < closestDiff ? iter : closest;
  }, iterations[0]);
}

function extractTaskTimeline({ iteration }) {
  return iteration.taskCompletionDates;
}

function extractTimelineForTargetCompletionWeek({ iterations, targetCompletionWeek }) {
  const iteration = findClosestIterationForTargetCompletionWeek({ iterations, targetCompletionWeek });
  return extractTaskTimeline({ iteration });
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
    const label = `${task.title} _Est=${initialEstimate.toFixed(1)} Rework=${finalRework.toFixed(1)} Blocks=${blockingCount} `;

    // Generate Gantt entry
    const startDateStr = _formatGanttDate(_addWeeksToDate(startDate, taskStartInfo.startWeek));
    const endDateStr = _formatGanttDate(_addWeeksToDate(startDate, completionWeek));

    code += `    ${label} :${task.id}, ${startDateStr}, ${endDateStr}\n`;
  }

  // Section: Vacations
  const hasVacations = personnel.some(p => p.vacationsAt && p.vacationsAt.length > 0);
  if (hasVacations) {
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
  }

  // Section: Sick Leaves
  const hasSickLeaves = personnel.some(p => p.sickLeaves && p.sickLeaves.length > 0);
  if (hasSickLeaves) {
    code += '    section Sick Leaves\n';
    for (const person of personnel) {
      if (!person.sickLeaves || person.sickLeaves.length === 0) continue;

      for (let i = 0; i < person.sickLeaves.length; i++) {
        const sickLeave = person.sickLeaves[i];
        const fromStr = _formatGanttDate(_addWeeksToDate(startDate, sickLeave.startWeek));
        const toStr = _formatGanttDate(_addWeeksToDate(startDate, sickLeave.endWeek));
        code += `    ${person.name} sick :done, sick-${person.id}-${i}, ${fromStr}, ${toStr}\n`;
      }
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
    const aOriginal = a.originalDuration || a.mostProbableEstimateInRange || 0;
    const bOriginal = b.originalDuration || b.mostProbableEstimateInRange || 0;
    const aInProgress = aOriginal > 0 && a.remainingDuration < aOriginal;
    const bInProgress = bOriginal > 0 && b.remainingDuration < bOriginal;

    if (aInProgress && !bInProgress) return -1;
    if (!aInProgress && bInProgress) return 1;

    // Second priority: tasks that block the most other tasks (greedy)
    const blocksA = a.remainingNumOfBlocks ?? a.totalNumOfBlocks ?? 0;
    const blocksB = b.remainingNumOfBlocks ?? b.totalNumOfBlocks ?? 0;
    return blocksB - blocksA;
  });
}

function _sortPersonnelBySeniority(personnel) {
  return [...personnel].sort((a, b) => {
    return (LEVEL_RANK[b.level] || 0) - (LEVEL_RANK[a.level] || 0);
  });
}

function assignTasksToPersonnel({ tasks, personnel, assignmentCounts, skillWorkHistory, logContext = {} }) {
  const assignments = [];
  const assignedTasks = new Set();
  const assignedPersonnel = new Set();

  const prioritizedTasks = sortTasksByPriority(tasks);
  debug('Task priority order', { taskIds: prioritizedTasks.map(t => t.id), ...logContext });

  for (const task of prioritizedTasks) {
    if (assignedTasks.has(task.id)) continue;

    // Score all qualified candidates
    const candidatesAndTheirAssignmentScore = personnel
      .filter(p => !assignedPersonnel.has(p.id))
      .filter(p => p.availableCapacity > 0)
      .filter(p => isPersonQualifiedForTask({ person: p, task }))
      .map(person => ({
        person,
        score: _scoreCandidateForTask({
          person,
          task,
          assignmentCounts,
          skillWorkHistory,
        }),
      }));

    if (candidatesAndTheirAssignmentScore.length === 0) continue;

    const sortedCandidates = candidatesAndTheirAssignmentScore.sort((a, b) => b.score - a.score);
    const bestCandidate = sortedCandidates[0].person;

    debug('Candidate scores for task', {
      taskId: task.id,
      candidates: sortedCandidates.map(c => ({ personId: c.person.id, score: c.score })),
      selectedPersonId: bestCandidate.id,
      ...logContext,
    });

    assignments.push({ task, assignedPerson: bestCandidate });
    assignedTasks.add(task.id);
    assignedPersonnel.add(bestCandidate.id);
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
    crTask.fibonacciEstimate = getNextFibonacci(avgEstimate);
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

function _addPersonToVacationCalendar(vacationCalendar, week, personId) {
  if (!vacationCalendar.has(week)) {
    vacationCalendar.set(week, new Set());
  }
  vacationCalendar.get(week).add(personId);
}

function _isPersonOnVacationInWeek(vacationCalendar, week, personId) {
  const peopleOnVacation = vacationCalendar.get(week);
  return peopleOnVacation && peopleOnVacation.has(personId);
}

function _buildVacationCalendar({ personnel, startDate }) {
  const vacationCalendar = new Map();

  for (const person of personnel) {
    if (!person.vacationsAt) continue;

    for (const vacation of person.vacationsAt) {
      const fromWeek = _calculateWeeksBetween(startDate, vacation.from);
      const toWeek = _calculateWeeksBetween(startDate, vacation.to);

      for (let week = fromWeek; week <= toWeek; week++) {
        _addPersonToVacationCalendar(vacationCalendar, week, person.id);
      }
    }
  }

  return vacationCalendar;
}

function _scheduleVacationForPerson({ person, currentWeek, startDate, vacationCalendar }) {
  const vacationWeeks = VACATION_WEEKS_PER_YEAR;

  if (!person.vacationsAt) {
    person.vacationsAt = [];
  }

  // Find a slot that doesn't conflict with existing vacations
  let candidateStartWeek = currentWeek + 1;

  while (true) {
    let conflictFound = false;

    for (let week = candidateStartWeek; week < candidateStartWeek + vacationWeeks; week++) {
      if (_isPersonOnVacationInWeek(vacationCalendar, week, person.id)) {
        conflictFound = true;
        candidateStartWeek = week + 1;
        break;
      }
    }

    if (!conflictFound) {
      const fromDate = _addWeeksToDate(startDate, candidateStartWeek);
      const toDate = _addWeeksToDate(startDate, candidateStartWeek + vacationWeeks - 1);

      person.vacationsAt.push({ from: fromDate, to: toDate });

      // Update the calendar with the newly scheduled vacation
      for (let week = candidateStartWeek; week < candidateStartWeek + vacationWeeks; week++) {
        _addPersonToVacationCalendar(vacationCalendar, week, person.id);
      }

      break;
    }
  }
}

function scheduleAutomaticVacations({ personnel, currentWeek, startDate }) {
  // Vacation calendar: Map<week, Set<personId>>
  const vacationCalendar = new Map();

  // Populate calendar with existing vacations
  for (const person of personnel) {
    if (!person.vacationsAt) continue;

    for (const vacation of person.vacationsAt) {
      const fromWeek = _calculateWeeksBetween(startDate, vacation.from);
      const toWeek = _calculateWeeksBetween(startDate, vacation.to);

      for (let week = fromWeek; week <= toWeek; week++) {
        _addPersonToVacationCalendar(vacationCalendar, week, person.id);
      }
    }
  }

  // Schedule automatic vacations for each person
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

    const missingWeeks = expectedVacationWeeks - assignedWeeks;

    if (missingWeeks > 0) {
      let candidateStartWeek = currentWeek + 1;

      while (true) {
        let conflictFound = false;

        // Check if this person already has vacation scheduled in any of the candidate weeks
        for (let week = candidateStartWeek; week < candidateStartWeek + missingWeeks; week++) {
          if (_isPersonOnVacationInWeek(vacationCalendar, week, person.id)) {
            conflictFound = true;
            candidateStartWeek = week + 1;
            break;
          }
        }

        if (!conflictFound) {
          const fromDate = _addWeeksToDate(startDate, candidateStartWeek);
          const toDate = _addWeeksToDate(startDate, candidateStartWeek + missingWeeks - 1);

          person.vacationsAt.push({ from: fromDate, to: toDate });

          for (let week = candidateStartWeek; week < candidateStartWeek + missingWeeks; week++) {
            _addPersonToVacationCalendar(vacationCalendar, week, person.id);
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
  const rampUpTime = globalParams.timeToRampUpByLevel[person.level];
  const totalWeeksNeeded = hiringTime + rampUpTime;

  const availableDate = _addWeeksToDate(person.startDate, totalWeeksNeeded);

  return currentDate >= availableDate;
}

export {
  initializeSimulationState,
  recordWeeklyWork,
  findStartableTasks,
  isPersonQualifiedForTask,
  assignWorkToTask,
  runSingleIteration,
  runMultipleIterations,
  runIterationBatch,
  runMultipleIterationsParallel,
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
  isTaskStartableByDate,
  filterTasksByStartDate,
  findClosestIterationForTargetCompletionWeek,
  extractTaskTimeline,
  extractTimelineForTargetCompletionWeek,
  generateGanttChartCode,
};
