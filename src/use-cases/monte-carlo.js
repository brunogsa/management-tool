import inputValidator from '../utils/input-validator.js';
import {
  deepClone,
  getTaskMap,
  attachAllDescendantsFromParentProps,
  attachBlockedTasksFromDependsOnProps,
  populateContainerEstimates,
  attachBlockingCounts,
} from '../utils/graph.js';
import {
  runMultipleIterations,
  calculatePercentiles,
  findIterationForPercentile,
  generateGanttChartCode,
  generateChangeRequests,
  injectChangeRequestsIntoTaskList,
} from '../utils/monte-carlo.js';


function monteCarloUseCase(inputData) {
  inputValidator(inputData);

  const { globalParams, tasks, personnel } = inputData;

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

    // AI, not sure we need to re-run the thing below, probably just once is fine (gotta investigate)
    // Re-run graph calculations
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
    globalParams, // AI, could probably pass only what it needs explicitly
    startDate,
  });

  // Calculate percentiles
  const completionWeeks = iterations.map(iter => iter.completionWeek);
  const percentiles = calculatePercentiles(completionWeeks);

  // Generate Gantt charts for key percentiles
  const percentilesOfInterest = [50, 75, 90, 95, 99];
  const ganttCharts = percentilesOfInterest.map(percentile => {
    const iteration = findIterationForPercentile({ iterations, percentile });

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
    percentiles,
    ganttCharts,
  };
}

export default monteCarloUseCase;
