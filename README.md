politely
========

[![npm](https://img.shields.io/npm/v/politely)](https://www.npmjs.com/package/politely)
[![CI](https://github.com/raymond-lam/politely/workflows/CI/badge.svg?branch=master)](https://github.com/raymond-lam/politely/actions)
[![Coverage Status](https://coveralls.io/repos/github/raymond-lam/politely/badge.svg?branch=master)](https://coveralls.io/github/raymond-lam/politely?branch=master)
[![MIT license](http://img.shields.io/badge/license-MIT-brightgreen.svg)](http://opensource.org/licenses/MIT)

Ensure that a server process gracefully shuts down.

When your Node service receives a `SIGINT`, `SIGTERM`, `SIGQUIT`, or `SIGHUP` signal, `politely` runs your shutdown routines and waits for them to finish (or timeout) before allowing the process to terminate.

## Usage

### Example

```javascript
const express = require('express');
const politely = require('politely');
const winston = require('winston');

const logger = winston.createLogger({
  transports: [
    new winston.transports.Console(),
  ],
});

const app = express();
let httpServer;

politely({
  services: [
    {
      start() {
        return new Promise(resolve => {
          httpServer = app.listen(8000, resolve);
        });
      },
      stop() {
        return new Promise(resolve => httpServer.close(resolve));
      },
    }
  ],
  timeout: 10000,
  logger,
});
```

### API

`politely` takes a single arguments object:

- `services` - An array of objects, each with a `start` and `stop`. `start` should take no arguments and should return a "thenable" (such as a Promise) which resolves when the given services finishes starting (for example, when the callback of a server's [`listen` method](https://nodejs.org/api/net.html#net_server_listen) is called). `stop` should take no arguments and should return a "thenable" (such as a Promise) which resolves when the given service finishes stopping (for example, when the callback of a server's [`close` method](https://nodejs.org/api/net.html#net_server_close_callback) is called). `stop` is where graceful shutdown routines, such closing server connections or ensuring that buffers are flushed, should reside.
- `logger` (optional) - A object with `info`, `warn`, and `error` methods that accept an argument for a log message string.
- `timeout` (optional, default: 30000) - A positive integer, which is the number of milliseconds `politely` will wait.

## Author

Raymond Lam (ray@lam-ray.com)

## License

MIT
