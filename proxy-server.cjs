/**
 * Local Proxy Server for Development
 *
 * Contourne les problèmes de CORS et de certificat auto-signé
 * en proxyfiant les requêtes vers l'API backend.
 *
 * Usage: node proxy-server.cjs
 */

const http = require('http');
const https = require('https');

const PROXY_PORT = 4000;
const TARGET_HOST = '91.121.59.49';
const TARGET_PORT = 10001;

// Origines autorisées
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://france-tourisme-observation.webflow.io',
  'https://www.france-tourisme-observation.fr',
];

const server = http.createServer((req, res) => {
  const origin = req.headers.origin || '';

  // CORS headers
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Collecter le body
  let body = [];
  req.on('data', (chunk) => body.push(chunk));
  req.on('end', () => {
    body = Buffer.concat(body);

    const options = {
      hostname: TARGET_HOST,
      port: TARGET_PORT,
      path: req.url,
      method: req.method,
      headers: {
        ...req.headers,
        host: `${TARGET_HOST}:${TARGET_PORT}`,
      },
      rejectUnauthorized: false, // Accepter le certificat auto-signé
    };

    // Supprimer les headers problématiques
    delete options.headers['host'];
    delete options.headers['connection'];

    const proxyReq = https.request(options, (proxyRes) => {
      // Copier les headers de la réponse
      const responseHeaders = { ...proxyRes.headers };
      delete responseHeaders['access-control-allow-origin'];
      delete responseHeaders['access-control-allow-credentials'];

      res.writeHead(proxyRes.statusCode, responseHeaders);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      console.error('Proxy error:', err.message);
      res.writeHead(502);
      res.end(JSON.stringify({ error: 'Proxy error', message: err.message }));
    });

    if (body.length > 0) {
      proxyReq.write(body);
    }
    proxyReq.end();
  });
});

server.listen(PROXY_PORT, () => {
  console.log(`\n🚀 Proxy server running on http://localhost:${PROXY_PORT}`);
  console.log(`   Proxying to https://${TARGET_HOST}:${TARGET_PORT}`);
  console.log(`\n   Press Ctrl+C to stop\n`);
});
