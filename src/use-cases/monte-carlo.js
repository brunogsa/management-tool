import inputValidator from '../utils/input-validator.js';
import {
  getTaskMap,
  attachAllDescendantsFromParentProps,
  attachBlockedTasksFromDependsOnProps,
  populateContainerEstimates,
  attachBlockingCounts,
} from '../utils/graph.js';
import {
  runMultipleIterations,
  calculatePercentiles,
  findClosestIterationForTargetCompletionWeek,
  generateGanttChartCode,
  generateChangeRequests,
  injectChangeRequestsIntoTaskList,
} from '../utils/monte-carlo.js';


// Normalize string dates to Date objects for consistent handling throughout the simulation
function _normalizeDateFields({ tasks, personnel }) {
  for (const task of tasks) {
    if (task.onlyStartableAt && !(task.onlyStartableAt instanceof Date)) {
      task.onlyStartableAt = new Date(task.onlyStartableAt);
    }
  }

  for (const person of personnel) {
    if (person.startDate && !(person.startDate instanceof Date)) {
      person.startDate = new Date(person.startDate);
    }

    if (person.vacationsAt) {
      for (const vacation of person.vacationsAt) {
        if (vacation.from && !(vacation.from instanceof Date)) {
          vacation.from = new Date(vacation.from);
        }
        if (vacation.to && !(vacation.to instanceof Date)) {
          vacation.to = new Date(vacation.to);
        }
      }
    }
  }
}

function monteCarloUseCase(inputData) {
  inputValidator(inputData);

  const { globalParams, tasks, personnel } = inputData;

  // Normalize dates immediately after validation
  _normalizeDateFields({ tasks, personnel });

  const taskMap = getTaskMap(tasks);

  // Populate graph
  attachAllDescendantsFromParentProps(tasks, taskMap);
  attachBlockedTasksFromDependsOnProps(tasks, taskMap);
  populateContainerEstimates(tasks, taskMap);
  attachBlockingCounts(tasks);

  // Generate change requests
  const { changeRequestMilestone, changeRequestTasks } = generateChangeRequests({
    tasks,
    splitRate: globalParams.taskSplitRate,
  });

  if (changeRequestMilestone) {
    injectChangeRequestsIntoTaskList({
      tasks,
      taskMap,
      changeRequestMilestone,
      changeRequestTasks,
    });

    // Graph recalculation IS needed after injecting change requests because:
    // 1. attachAllDescendantsFromParentProps: Sets children[] on changeRequestMilestone
    // 2. attachBlockedTasksFromDependsOnProps: Calculates blocking relationships for new tasks
    // 3. populateContainerEstimates: Sums up estimates for the changeRequestMilestone container
    // 4. attachBlockingCounts: Updates totalNumOfBlocks used for task priority sorting
    attachAllDescendantsFromParentProps(tasks, taskMap);
    attachBlockedTasksFromDependsOnProps(tasks, taskMap);
    populateContainerEstimates(tasks, taskMap);
    attachBlockingCounts(tasks);
  }

  // Run simulations
  const startDate = new Date(globalParams.startDate);

  const { iterations } = runMultipleIterations({
    tasks,
    personnel,
    numIterations: globalParams.numOfMonteCarloIterations,
    globalParams,
    startDate,
  });

  // Calculate completion week for each percentile
  const percentilesOfInterest = [50, 75, 90, 95, 99];
  const completionWeeks = iterations.map(iter => iter.completionWeek);
  const completionWeekPercentiles = calculatePercentiles(completionWeeks, percentilesOfInterest);

  // Generate Gantt charts for key percentiles
  const ganttCharts = percentilesOfInterest.map(percentile => {
    const targetCompletionWeek = completionWeekPercentiles[`p${percentile}`];
    const iteration = findClosestIterationForTargetCompletionWeek({ iterations, targetCompletionWeek });

    return {
      identifier: `${percentile}th`,
      mermaidCode: generateGanttChartCode({
        iteration,
        tasks,
        personnel,
        title: `${percentile}th Percentile Timeline (Week ${iteration.completionWeek})`,
        startDate,
      }),
    };
  });

  return {
    listOfSimulations: iterations,
    completionWeekPercentiles,
    ganttCharts,
  };
}

export default monteCarloUseCase;
