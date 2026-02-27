const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '127.0.0.1';
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

function send(res, status, body, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': contentType });
  res.end(body);
}

function sendJson(res, status, value) {
  send(res, status, JSON.stringify(value), 'application/json; charset=utf-8');
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(new Error(`Invalid JSON body: ${err.message}`));
      }
    });
    req.on('error', reject);
  });
}

function serveFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      send(res, 404, 'Not Found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    send(res, 200, data, MIME[ext] || 'application/octet-stream');
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'GET' && url.pathname === '/app-config.js') {
    const enableSkillEditor = String(process.env.VITE_ENABLE_SKILL_EDITOR || '').toLowerCase() === 'true';
    send(
      res,
      200,
      `window.__OPENLUNARIS_CONFIG__ = Object.freeze({ enableSkillEditor: ${enableSkillEditor} });`,
      MIME['.js']
    );
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/proxy') {
    readJsonBody(req)
      .then(async (payload) => {
        const webhookUrl = String(payload.webhookUrl || '').trim();
        const text = String(payload.text || '').trim();
        const skillId = payload.skillId == null ? null : String(payload.skillId).trim();
        const model = String(payload.model || 'or-fast').trim();
        const outputMode = ['text', 'email', 'ticket', 'json'].includes(payload.outputMode) ? payload.outputMode : 'text';
        const messages = Array.isArray(payload.messages)
          ? payload.messages
              .map((msg) => ({
                role: String(msg?.role || '').trim(),
                content: String(msg?.content || '')
              }))
              .filter((msg) => ['system', 'user', 'assistant'].includes(msg.role) && msg.content.trim())
          : [];

        if (!webhookUrl) {
          sendJson(res, 400, { error: 'webhookUrl is required' });
          return;
        }

        if (!messages.length && !text) {
          sendJson(res, 400, { error: 'messages or text is required' });
          return;
        }

        const upstreamPayload = {
          model,
          skillId,
          outputMode,
          messages
        };

        if (text) upstreamPayload.text = text;

        const upstream = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(upstreamPayload)
        });

        const responseBody = await upstream.text();
        send(res, upstream.status, responseBody, 'text/plain; charset=utf-8');
      })
      .catch((err) => {
        sendJson(res, 502, { error: `Proxy request failed: ${err.message}` });
      });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/favicon.png') {
    serveFile(res, path.join(ROOT, 'public', 'favicon.png'));
    return;
  }

  let filePath = path.join(ROOT, url.pathname === '/' ? 'index.html' : url.pathname);

  if (!filePath.startsWith(ROOT)) {
    send(res, 403, 'Forbidden');
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (!err && stat.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
    serveFile(res, filePath);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`UI running at http://localhost:${PORT}`);
});
