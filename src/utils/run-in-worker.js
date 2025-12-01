import { Worker } from 'worker_threads';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function runInWorker({ modulePath, exportName = 'default', args = [] }) {
  return new Promise((resolvePromise, reject) => {
    const workerPath = resolve(__dirname, 'generic-worker.js');
    const workerData = {
      modulePath,
      exportName,
      args
    };

    const worker = new Worker(workerPath, { workerData });

    worker.on('message', (message) => {
      if (message.success) {
        resolvePromise(message.result);
      } else {
        reject(new Error(message.error));
      }
    });

    worker.on('error', reject);

    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
  });
}

export default runInWorker;
