import { program } from 'commander';
import tasksTree from './commands/tasks-tree.js';
import monteCarlo from './commands/monte-carlo.js';

program
  .version('1.0.0')
  .description('Collections of utilities for managing engineering projects and teams.')
  .showHelpAfterError();

program
  .command('tasks-tree <input-json-filepath> <output-folder-filepath>')
  .description('Generate a Mermaid flowchart visualizing task dependencies as a DAG')
  .option('-w, --watch', 'Watch input file and source code for changes and auto-regenerate with live browser preview')
  .showHelpAfterError()
  .action(tasksTree);

program
  .command('monte-carlo <json-input-filepath> <output-folder-filepath>')
  .description('Run Monte Carlo simulation to predict project completion time distribution')
  .showHelpAfterError()
  .action(monteCarlo);

program.parse(process.argv);
