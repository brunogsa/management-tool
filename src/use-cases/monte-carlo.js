import inputValidator from '../utils/input-validator.js';
import {
  deepClone,
  getTaskMap,
  attachAllDescendantsFromParentProps,
  attachBlockedTasksFromDependsOnProps,
  populateContainerEstimates,
} from '../utils/graph.js';
import { runMonteCarloSimulation } from '../utils/monte-carlo.js';
import { generateGanttChart } from '../utils/mermaid-code-generator.js';


function monteCarloUseCase(inputData) {
  inputValidator(inputData);

  const data = deepClone(inputData);
  data.taskMap = getTaskMap(data.tasks);

  attachAllDescendantsFromParentProps(data.tasks, data.taskMap);
  attachBlockedTasksFromDependsOnProps(data.tasks, data.taskMap);
  populateContainerEstimates(data.tasks, data.taskMap);

  const listOfSimulations = runMonteCarloSimulation(
    inputData.tasks,
    inputData.personnel,
    inputData.globalParams,
  );

  // TODO: Check the percentiles of the durations (sprints)
  const duration50th = 20;
  const duration75th = 25;
  const duration90th = 30;
  const duration95th = 35;
  const duration99th = 40;

  const exemplaryFor50th = listOfSimulations.find((simulation) => simulation.sprints.length === duration50th);
  const exemplaryFor75th = listOfSimulations.find((simulation) => simulation.sprints.length === duration75th);
  const exemplaryFor90th = listOfSimulations.find((simulation) => simulation.sprints.length === duration90th);
  const exemplaryFor95th = listOfSimulations.find((simulation) => simulation.sprints.length === duration95th);
  const exemplaryFor99th = listOfSimulations.find((simulation) => simulation.sprints.length === duration99th);

  const ganttCharts = [
    { simulation: exemplaryFor50th, identifier: '50th' },
    { simulation: exemplaryFor75th, identifier: '75th' },
    { simulation: exemplaryFor90th, identifier: '90th' },
    { simulation: exemplaryFor95th, identifier: '95th' },
    { simulation: exemplaryFor99th, identifier: '99th' },
  ].map(({ simulation, identifier }) => ({
    identifier,
    mermaidCode: generateGanttChart(simulation),
  }));

  return { listOfSimulations, ganttCharts };
}

export default monteCarloUseCase;
