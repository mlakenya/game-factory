#!/usr/bin/env node
// Static server for dist/ used by Playwright. Serves an empty /sdk.js so builds run on the mock platform.
import { createServer } from 'node:http';
import { createReadStream, existsSync, readdirSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { ROOT } from './lib.mjs';

const port = Number(process.env.PORT ?? 4173);
const dist = join(ROOT, 'dist');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.json': 'application/json',
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav' };

createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (url.endsWith('/sdk.js')) { res.writeHead(200, { 'content-type': 'text/javascript' }); return res.end(''); }
  if (url === '/') {
    const list = existsSync(dist) ? readdirSync(dist).map((d) => `<li><a href="/${d}/index.html?mock">${d}</a></li>`).join('') : '';
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    return res.end(`<h1>dist/</h1><ul>${list}</ul>`);
  }
  let file = normalize(join(dist, url));
  if (!file.startsWith(dist)) { res.writeHead(403); return res.end(); }
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!existsSync(file)) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
}).listen(port, () => console.log(`serving dist/ on http://localhost:${port}`));
