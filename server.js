require('dotenv').config({ path: __dirname + '/.env' });
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

const next = require('next');
const http = require('http');
const { parse } = require('url');

const dir = __dirname;
const port = parseInt(process.env.PORT || '3001', 10);
const STRIP = process.env.PASSENGER_PATH_PREFIX || '';

const app = next({ dev: false, dir });
const handle = app.getRequestHandler();

app.prepare()
  .then(() => {
    http.createServer((req, res) => {
      if (STRIP && req.url.startsWith(STRIP)) {
        req.url = req.url.slice(STRIP.length) || '/';
      }
      handle(req, res, parse(req.url, true));
    }).listen(port, () => {
      console.log('[suvcraft frontend] ready on port ' + port);
    });
  })
  .catch((err) => {
    console.error('[suvcraft frontend] failed to start:', err);
    process.exit(1);
  });
