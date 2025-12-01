import chokidar from 'chokidar';


function createFileWatcher(paths) {
  const watcher = chokidar.watch(paths, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 100
    }
  });

  return watcher;
}

export default createFileWatcher;
