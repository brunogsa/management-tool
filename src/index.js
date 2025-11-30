import { program } from 'commander';
import tasksTree from './commands/tasks-tree.js';
import monteCarlo from './commands/monte-carlo.js';

program
  .version('1.0.0')
  .description('Collections of utilities for managing engineering projects and teams.');

program
  .command('tasks-tree <input-json-filepath> <output-folder-filepath>')
  .description('Generate a tasks dependency flowchart')
  .option('-w, --watch', 'Watch for changes and auto-regenerate')
  .action(tasksTree);

program
  .command('monte-carlo <json-input-filepath> <output-folder-filepath>')
  .description('Perform a Monte Carlo simulation to predict the project completion time')
  .action(monteCarlo);

program.parse(process.argv);
