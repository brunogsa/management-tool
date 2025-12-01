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

  const data = deepClone(inputData);
  data.taskMap = getTaskMap(data.tasks);

  // Populate graph
  attachAllDescendantsFromParentProps(data.tasks, data.taskMap);
  attachBlockedTasksFromDependsOnProps(data.tasks, data.taskMap);
  populateContainerEstimates(data.tasks, data.taskMap);
  attachBlockingCounts(data.tasks);

  // Generate change requests
  const { changeRequestMilestone, changeRequestTasks } = generateChangeRequests({
    tasks: data.tasks,
    splitRate: inputData.globalParams.taskSplitRate,
  });

  if (changeRequestMilestone) {
    injectChangeRequestsIntoTaskList({
      tasks: data.tasks,
      taskMap: data.taskMap,
      changeRequestMilestone,
      changeRequestTasks,
    });

    // Re-run graph calculations
    attachAllDescendantsFromParentProps(data.tasks, data.taskMap);
    attachBlockedTasksFromDependsOnProps(data.tasks, data.taskMap);
    populateContainerEstimates(data.tasks, data.taskMap);
    attachBlockingCounts(data.tasks);
  }

  // Initialize task remaining durations
  for (const task of data.tasks) {
    task.remainingDuration = task.mostProbableEstimateInRange || 0;
    task.remainingReworkDuration = 0;
  }

  // Run simulations
  const startDate = new Date(inputData.globalParams.startDate);
  const { iterations } = runMultipleIterations({
    tasks: () => deepClone(data.tasks),
    personnel: () => deepClone(inputData.personnel),
    numIterations: inputData.globalParams.numOfMonteCarloIterations,
    globalParams: inputData.globalParams,
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
        tasks: data.tasks,
        personnel: inputData.personnel,
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
