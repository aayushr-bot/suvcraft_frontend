// cPanel / shared-hosting entry point for the storefront.
const next = require('next');
const http = require('http');

const port = parseInt(process.env.PORT || '3001', 10);
const hostname = process.env.HOST || '127.0.0.1';
const dev = process.env.NODE_ENV !== 'production';

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  http.createServer((req, res) => handle(req, res)).listen(port, () => {
    console.log(`[frontend] ready on http://${hostname}:${port}`);
  });
});
