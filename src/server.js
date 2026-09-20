const fs = require('fs');
const http = require('http');
const https = require('https');
const app = require('./app');
const { sequelize } = require('./models');

const PORT = process.env.PORT || 3000;

// Optional: run HTTPS directly out of Node, for deployments with no reverse
// proxy in front (see docs/DEPLOYMENT.md, "PM2 only"). Leave both unset to
// keep the previous plain-HTTP behavior unchanged — e.g. behind nginx,
// which is the more common setup and terminates TLS itself.
const TLS_KEY_PATH = process.env.TLS_KEY_PATH;
const TLS_CERT_PATH = process.env.TLS_CERT_PATH;
const HTTP_REDIRECT_PORT = process.env.HTTP_REDIRECT_PORT || 80;

async function start() {
  try {
    await sequelize.authenticate();
    console.log('MSSQL connection established.');

    if (TLS_KEY_PATH && TLS_CERT_PATH) {
      const options = {
        key: fs.readFileSync(TLS_KEY_PATH),
        cert: fs.readFileSync(TLS_CERT_PATH),
      };
      https.createServer(options, app).listen(PORT, () => console.log(`HTTPS server listening on port ${PORT}`));

      // Certificates are only read once at startup above — after a renewal,
      // the process needs restarting (e.g. `pm2 restart brgshopping` from a
      // certbot renewal hook) to pick up the new files.
      http
        .createServer((req, res) => {
          // Host header carries the *incoming* (HTTP) port, e.g. ":8080" in
          // a non-standard-port setup — strip it and target the real HTTPS
          // port instead, so this doesn't just redirect back to itself.
          const host = (req.headers.host || '').replace(/:\d+$/, '');
          const portSuffix = String(PORT) === '443' ? '' : `:${PORT}`;
          res.writeHead(301, { Location: `https://${host}${portSuffix}${req.url}` });
          res.end();
        })
        .listen(HTTP_REDIRECT_PORT, () => console.log(`HTTP->HTTPS redirect listening on port ${HTTP_REDIRECT_PORT}`));
    } else {
      app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
    }
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

start();
