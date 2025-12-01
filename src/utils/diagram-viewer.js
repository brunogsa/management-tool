import { existsSync } from 'fs';
import { basename } from 'path';
import express from 'express';
import open from 'open';
import createFileWatcher from './file-watcher.js';


const SSE_EVENT_END_INDICATOR = '\n\n';

function _buildSSE(event) {
  return `data: ${event}${SSE_EVENT_END_INDICATOR}`;
}

const RELOAD_EVENT = _buildSSE('reload');

async function startDiagramViewer(imageFilepath) {
  const app = express();
  const PORT = 3000;
  const imageName = basename(imageFilepath);
  const clients = [];

  // Watch the image file for changes
  const watcher = createFileWatcher(imageFilepath);
  watcher.on('change', (filepath) => {
    console.log(`Diagram file changed: ${filepath}`);
    console.log(`Notifying ${clients.length} browser(s)...`);
    clients.forEach(client => {
      client.write(RELOAD_EVENT);
    });
    console.log('SSE reload event sent successfully');
  });

  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${imageName} - Live View</title>
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
          .status.reloading {
            background: #FF9800;
          }
        </style>
      </head>
      <body>
        <div id="container">
          <img src="/diagram.png?v=${Date.now()}" alt="${imageName}" id="diagram">
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

          // Restore pan/zoom state from sessionStorage
          const savedState = sessionStorage.getItem('diagramViewState');
          if (savedState) {
            const state = JSON.parse(savedState);
            scale = state.scale;
            translateX = state.translateX;
            translateY = state.translateY;
            updateTransform();
          }

          function saveState() {
            sessionStorage.setItem('diagramViewState', JSON.stringify({
              scale,
              translateX,
              translateY
            }));
          }

          // Pan and zoom functionality
          container.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            scale *= delta;
            scale = Math.max(0.1, Math.min(scale, 10));
            updateTransform();
            saveState();
          });

          container.addEventListener('mousedown', (e) => {
            e.preventDefault();
            isPanning = true;
            startX = e.clientX - translateX;
            startY = e.clientY - translateY;
            container.style.cursor = 'grabbing';
          });

          container.addEventListener('mousemove', (e) => {
            if (!isPanning) return;
            e.preventDefault();
            translateX = e.clientX - startX;
            translateY = e.clientY - startY;
            updateTransform();
          });

          container.addEventListener('mouseup', (e) => {
            if (isPanning) {
              e.preventDefault();
              isPanning = false;
              container.style.cursor = 'grab';
              saveState();
            }
          });

          container.addEventListener('mouseleave', () => {
            if (isPanning) {
              isPanning = false;
              container.style.cursor = 'grab';
              saveState();
            }
          });

          function updateTransform() {
            img.style.transform = \`translate(\${translateX}px, \${translateY}px) scale(\${scale})\`;
          }

          eventSource.onmessage = (event) => {
            console.log('SSE event received:', event.data);
            if (event.data === 'reload') {
              console.log('Reloading diagram image...');
              // Diagram updated, reload image
              status.textContent = 'Updating...';
              status.classList.add('reloading');
              img.src = '/diagram.png?v=' + Date.now();
              img.onload = () => {
                console.log('Diagram image reloaded successfully');
                status.textContent = 'Live';
                status.classList.remove('reloading');
              };
            }
          };

          eventSource.onerror = () => {
            // Server is restarting, show reloading status
            status.textContent = 'Reloading...';
            status.classList.add('reloading');
            status.style.background = '#FF9800';

            // Try to reconnect
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          };

          container.style.cursor = 'grab';
        </script>
      </body>
      </html>
    `);
  });

  app.get('/diagram.png', (req, res) => {
    if (existsSync(imageFilepath)) {
      res.sendFile(imageFilepath, { root: process.cwd() });
    } else {
      res.status(404).send('Diagram not found');
    }
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
    console.log(`Server running at http://localhost:${PORT}`);
    console.log('Opening browser...');
    open(`http://localhost:${PORT}`);
  });

  process.on('SIGTERM', () => {
    server.close();
    process.exit(0);
  });

  process.on('SIGINT', () => {
    server.close();
    process.exit(0);
  });
}

export default startDiagramViewer;
