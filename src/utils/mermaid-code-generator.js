function getNodeDeclaration(task) {
  return `${task.id}(${task.id}: ${task.title})`;
}

function getNodeEdge(taskId, dependencyId) {
  return `${taskId} --> ${dependencyId}`;
}

function generateTasksTreeFlowchart(tasks) {
  const IDENT = '  ';
  const LINE_BREAK = '\n';
  const RENDERER = '%%{init: {"flowchart": {"defaultRenderer": "elk"}} }%%';

  let diagram = RENDERER + LINE_BREAK;
  diagram += 'flowchart TD' + LINE_BREAK;

  tasks.forEach(task => {
    diagram += IDENT + getNodeDeclaration(task) + LINE_BREAK;
  });

  tasks.forEach(task => {
    task.dependsOnTasks.forEach((dependency) => {
      diagram += IDENT + getNodeEdge(task.id, dependency) + LINE_BREAK;
    });
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
