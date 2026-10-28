import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { spawn } from 'node:child_process';

const root = path.dirname(fileURLToPath(import.meta.url));
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml' };

export function createServer() {
  return http.createServer(async (request, response) => {
    if (!['GET','HEAD'].includes(request.method)) { response.writeHead(405).end(); return; }
    try {
      const url = new URL(request.url, 'http://localhost');
      const pathname = decodeURIComponent(url.pathname);
      const file = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
      if (!file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
      const contents = await readFile(file);
      response.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream',
        'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
      response.end(request.method === 'HEAD' ? undefined : contents);
    } catch { response.writeHead(404).end('Not found'); }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 8765);
  const server = createServer();
  server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? `Le port ${port} est déjà utilisé. Essayez avec un autre PORT.` : error.message); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => {
    console.log(`Arborescento : http://127.0.0.1:${port}\nGardez cette fenêtre ouverte. Ctrl+C pour arrêter.`);
    if (process.argv.includes('--open') && process.platform === 'win32') {
      const opener = spawn('powershell.exe', ['-NoProfile','-WindowStyle','Hidden','-Command',`Start-Process 'http://127.0.0.1:${port}'`], { windowsHide:true, stdio:'ignore' });
      opener.on('error', () => console.log('Ouvrez le lien ci-dessus dans votre navigateur.'));
      opener.unref();
    }
  });
}
