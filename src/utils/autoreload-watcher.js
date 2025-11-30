import { spawn } from 'child_process';


function startAutoreloadWatcher(watchPaths) {
  const nodemonPath = `${process.cwd()}/node_modules/.bin/nodemon`;

  console.log('\nStarting file watcher...');
  watchPaths.forEach(path => console.log(`Watching: ${path}`));
  console.log('');

  const watchArgs = watchPaths.flatMap(path => ['--watch', path]);

  const nodemon = spawn(nodemonPath, [
    ...watchArgs,
    '--ext', 'js,json',
    '--signal', 'SIGTERM',
    '--exec', 'echo "Files changed, restarting..." && exit 0'
  ], {
    stdio: 'inherit',
    shell: true
  });

  nodemon.on('close', (code) => {
    process.exit(code);
  });

  process.on('SIGINT', () => {
    nodemon.kill('SIGINT');
  });
}

export default startAutoreloadWatcher;
