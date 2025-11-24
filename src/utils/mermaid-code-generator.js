import { isContainerTask, TASK_TYPE } from '../models.js';

const IDENT = '  ';
const TWO_IDENT = IDENT + IDENT;
const LINE_BREAK = '\n';

function _getNodeDeclaration(task, timeAndEstimateUnit) {
  let head, tail;

  if (task.type === TASK_TYPE.PROJECT) {
    head = '>';
    tail = ']';

  } else if (task.type === TASK_TYPE.MILESTONE) {
    head = '([';
    tail = '])';

  } else if (task.type === TASK_TYPE.EPIC) {
    head = '[[';
    tail = ']]';

  } else {
    head = '(';
    tail = ')';
  }

  let node = task.id + head + LINE_BREAK;

  node += TWO_IDENT + task.title + LINE_BREAK;
  node += TWO_IDENT + `__${task.type}__` + LINE_BREAK + LINE_BREAK;

  if (isContainerTask(task.type)) {
    node += TWO_IDENT + `Total: ${task.totalRealisticEstimate} ${timeAndEstimateUnit}` + LINE_BREAK + LINE_BREAK;

  } else {
    node += TWO_IDENT + `Fibonnaci: ${task.fibonacciEstimate} ${timeAndEstimateUnit}` + LINE_BREAK;
    node += TWO_IDENT + `Realistic: ${task.mostProbableEstimateInRange} ${timeAndEstimateUnit}` + LINE_BREAK + LINE_BREAK;
  }

  if (task.totalNumOfBlocks > 0) {
    node += TWO_IDENT + `Blocks: ${task.totalNumOfBlocks}` + LINE_BREAK;
  }

  node += IDENT + tail + LINE_BREAK;

  return node;
}

let numOfChildEdges = 0;
function _getChildEdge(taskId, dependencyId) {
  numOfChildEdges++;
  return `${taskId} -.- ${dependencyId}`;
}

let numOfDepEdges = 0;
function _getDependencyEdge(taskId, dependencyId) {
  numOfDepEdges++;
  return `${taskId} ==> ${dependencyId}`;
}

function _styleDepsAsRed(diagram) {
  for (let i = 0; i < numOfDepEdges; i++) {
    diagram += IDENT + `linkStyle ${numOfChildEdges + i} stroke:#ff6961,color:red;` + LINE_BREAK;
  }

  return diagram;
}

function generateTasksTreeFlowchart(tasks, taskMap, timeAndEstimateUnit) {
  const RENDERER = '';
  // const RENDERER = '%%{init: {"flowchart": {"defaultRenderer": "elk"}} }%%';

  let diagram = RENDERER + LINE_BREAK;
  diagram += 'flowchart TB' + LINE_BREAK;

  tasks.forEach(task => {
    diagram += IDENT + _getNodeDeclaration(task, timeAndEstimateUnit) + LINE_BREAK;
  });

  diagram += LINE_BREAK;

  tasks.forEach(task => {
    task.children.forEach((childId) => {
      diagram += IDENT + _getChildEdge(task.id, childId) + LINE_BREAK;
    });

    diagram += LINE_BREAK;
  });

  diagram += LINE_BREAK;

  tasks.forEach(task => {
    task.tasksBeingBlocked.forEach((taskBeingBlocked) => {
      diagram += IDENT + _getDependencyEdge(task.id, taskBeingBlocked) + LINE_BREAK;
    });

    diagram += LINE_BREAK;
  });

  diagram += LINE_BREAK;

  diagram = _styleDepsAsRed(diagram);

  return diagram;
}

function generateGanttChart(tasks, _personnel) {
  let diagram = 'gantt\n    dateFormat  YYYY-MM-DD\n    title Project Gantt Chart\n';

  tasks.forEach(task => {
    diagram += `    ${task.name}: ${task.id}, ${task.startDate}, ${task.realisticDuration}d\n`;
  });

  return diagram;
}

export {
  generateTasksTreeFlowchart,
  generateGanttChart,
  _getNodeDeclaration,
  _getChildEdge,
  _getDependencyEdge,
  _styleDepsAsRed,
};
