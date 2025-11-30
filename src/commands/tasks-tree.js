import { readFileSync, writeFileSync } from 'fs';
import { watch } from 'chokidar';
import express from 'express';
import open from 'open';

import tasksTreeUseCase from '../use-cases/tasks-tree.js';
import renderImage from '../utils/image-renderer.js';


async function _generateDiagramOutputFiles(mermaidCode, outputFolderFilepath) {
  const diagramName = 'tasks-tree';
  const diagramFilepath = `${outputFolderFilepath}/${diagramName}.mmd`;

  writeFileSync(diagramFilepath, mermaidCode);

  await renderImage(
    diagramFilepath,
    diagramName,
    outputFolderFilepath,
  );
}

async function tasksTreeCommand(inputJsonFilepath, outputFolderFilepath, options) {
  try {
    const inputData = JSON.parse(
      readFileSync(inputJsonFilepath, 'utf8')
    );

    const mermaidCode = tasksTreeUseCase(inputData);

    await _generateDiagramOutputFiles(mermaidCode, outputFolderFilepath);

    console.log('Tasks dependency flowchart generated successfully!');

    if (options?.watch) {
      await _startWatchMode(inputJsonFilepath, outputFolderFilepath);
    }
  } catch (error) {
    console.error('Failed to generate tasks tree:', error);
  }
}

async function _startWatchMode(inputJsonFilepath, outputFolderFilepath) {
  const app = express();
  const clients = [];
  const PORT = 3000;

  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Tasks Tree - Live View</title>
        <style>
          body {
            margin: 0;
            overflow: hidden;
            background: #f5f5f5;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          }
          #container {
            width: 100vw;
            height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            overflow: hidden;
          }
          img {
            max-width: none;
            max-height: none;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            background: white;
            transform-origin: center center;
            transition: none;
            user-select: none;
          }
          .status {
            position: fixed;
            top: 10px;
            right: 10px;
            padding: 8px 16px;
            border-radius: 4px;
            background: #4CAF50;
            color: white;
            font-size: 14px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            z-index: 1000;
          }
          .status.regenerating {
            background: #FF9800;
          }
        </style>
      </head>
      <body>
        <div id="container">
          <img src="/tasks-tree.png?v=${Date.now()}" alt="Tasks Tree" id="diagram">
        </div>
        <div class="status" id="status">Live</div>
        <script>
          const eventSource = new EventSource('/events');
          const container = document.getElementById('container');
          const img = document.getElementById('diagram');
          const status = document.getElementById('status');

          let scale = 1;
          let translateX = 0;
          let translateY = 0;
          let isPanning = false;
          let startX, startY;

          // Pan and zoom functionality
          container.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            scale *= delta;
            scale = Math.max(0.1, Math.min(scale, 10));
            updateTransform();
          });

          container.addEventListener('mousedown', (e) => {
            isPanning = true;
            startX = e.clientX - translateX;
            startY = e.clientY - translateY;
            container.style.cursor = 'grabbing';
          });

          container.addEventListener('mousemove', (e) => {
            if (!isPanning) return;
            translateX = e.clientX - startX;
            translateY = e.clientY - startY;
            updateTransform();
          });

          container.addEventListener('mouseup', () => {
            isPanning = false;
            container.style.cursor = 'grab';
          });

          container.addEventListener('mouseleave', () => {
            isPanning = false;
            container.style.cursor = 'grab';
          });

          function updateTransform() {
            img.style.transform = \`translate(\${translateX}px, \${translateY}px) scale(\${scale})\`;
          }

          eventSource.onmessage = (event) => {
            if (event.data === 'reload') {
              status.textContent = 'Regenerating...';
              status.classList.add('regenerating');

              setTimeout(() => {
                img.src = '/tasks-tree.png?v=' + Date.now();
                status.textContent = 'Live';
                status.classList.remove('regenerating');
              }, 500);
            }
          };

          eventSource.onerror = () => {
            status.textContent = 'Disconnected';
            status.style.background = '#f44336';
          };

          container.style.cursor = 'grab';
        </script>
      </body>
      </html>
    `);
  });

  app.get('/tasks-tree.png', (req, res) => {
    res.sendFile(`${outputFolderFilepath}/tasks-tree.png`, { root: process.cwd() });
  });

  app.get('/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    res.write('data: connected\n\n');

    clients.push(res);

    req.on('close', () => {
      const index = clients.indexOf(res);
      if (index !== -1) {
        clients.splice(index, 1);
      }
    });
  });

  const server = app.listen(PORT, () => {
    console.log(`\nServer running at http://localhost:${PORT}`);
    console.log('Opening browser...');
    open(`http://localhost:${PORT}`);
    console.log('Watching for changes... (Press Ctrl+C to stop)\n');
  });

  const watcher = watch([inputJsonFilepath, `${process.cwd()}/src/**/*.js`], {
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 300,
      pollInterval: 100
    }
  });

  watcher.on('change', async (filepath) => {
    try {
      console.log(`Regenerating due to changes in ${filepath}...`);

      const inputData = JSON.parse(
        readFileSync(inputJsonFilepath, 'utf8')
      );
      const mermaidCode = tasksTreeUseCase(inputData);
      await _generateDiagramOutputFiles(mermaidCode, outputFolderFilepath);

      console.log('Regenerated successfully!');

      clients.forEach(client => {
        client.write('data: reload\n\n');
      });
    } catch (error) {
      console.error('Error regenerating:', error.message);
    }
  });

  process.on('SIGINT', () => {
    console.log('\nShutting down...');
    watcher.close();
    server.close();
    process.exit(0);
  });
}

export default tasksTreeCommand;
