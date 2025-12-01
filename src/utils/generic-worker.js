import { parentPort, workerData } from 'worker_threads';


async function run() {
  try {
    const { modulePath, exportName, args } = workerData;

    const module = await import(modulePath);
    const fn = exportName === 'default' ? module.default : module[exportName];

    const result = await fn(...args);

    parentPort.postMessage({ success: true, result });
  } catch (error) {
    parentPort.postMessage({ success: false, error: error.message });
  }
}

run();
