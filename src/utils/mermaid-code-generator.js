import { isFolderLikeTask, TASK_TYPE } from '../models.js';

const IDENT = '  ';
const TWO_IDENT = IDENT + IDENT;
const LINE_BREAK = '\n';

function getNodeDeclaration(task, timeAndEstimateUnit) {
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

  if (isFolderLikeTask(task.type)) {
    node += TWO_IDENT + `Total: ${task.totalRealisticEstimate} ${timeAndEstimateUnit}` + LINE_BREAK + LINE_BREAK;

  } else {
    node += TWO_IDENT + `Fibonnaci: ${task.fibonacciEstimate} ${timeAndEstimateUnit}` + LINE_BREAK;
    node += TWO_IDENT + `Realistic: ${task.mostProbableEstimateInRange} ${timeAndEstimateUnit}` + LINE_BREAK + LINE_BREAK;
  }

  if (task.blocks > 0) {
    node += TWO_IDENT + `Blocks: ${task.blocks}` + LINE_BREAK;
  }

  node += IDENT + tail + LINE_BREAK;

  return node;
}

function getNodeEdge(taskId, dependencyId) {
  return `${taskId} --> ${dependencyId}`;
}

function generateTasksTreeFlowchart(tasks, taskMap, timeAndEstimateUnit) {
  const RENDERER = '%%{init: {"flowchart": {"defaultRenderer": "elk"}} }%%';
  // const RENDERER = '';

  let diagram = RENDERER + LINE_BREAK;
  diagram += 'flowchart TB' + LINE_BREAK;

  tasks.forEach(task => {
    diagram += IDENT + getNodeDeclaration(task, timeAndEstimateUnit) + LINE_BREAK;
  });

  diagram += LINE_BREAK;

  // tasks.filter(task => {
  //   return task.type === TASK_TYPE.EPIC;

  // }).forEach((groupTask) => {
  //     diagram += IDENT + `subgraph ${groupTask.title}` + LINE_BREAK;
  //     diagram += TWO_IDENT + groupTask.id + LINE_BREAK;

  //     groupTask.blocksTasks
  //       .map((taskId) => taskMap.get(taskId))
  //       .filter((task) => {
  //         return !isFolderLikeTask(task.type);
  //       })
  //       .forEach((child) => {
  //         diagram += TWO_IDENT + child.id + LINE_BREAK;
  //       });

  //     diagram += IDENT + 'end' + LINE_BREAK;
  //     diagram += LINE_BREAK;
  // });

  // diagram += LINE_BREAK;

  tasks.forEach(task => {
    task.blocksTasks.forEach((childId) => {
      diagram += IDENT + getNodeEdge(task.id, childId) + LINE_BREAK;
    });

    diagram += LINE_BREAK;
  });

  return diagram;
}

function generateGanttChart(tasks, personnel) {
  let diagram = 'gantt\n    dateFormat  YYYY-MM-DD\n    title Project Gantt Chart\n';

  tasks.forEach(task => {
    diagram += `    ${task.name}: ${task.id}, ${task.startDate}, ${task.realisticDuration}d\n`;
  });

  return diagram;
}

export {
  generateTasksTreeFlowchart,
  generateGanttChart,
};
