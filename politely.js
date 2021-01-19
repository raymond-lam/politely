'use strict';

//  politely
//  https://github.com/raymond-lam/politely
//  (c) 2020 Raymond Lam
//
//  Author: Raymond Lam (ray@lam-ray.com)
//
//  politely may be freely distributed under the MIT license.

const all = require('promise-all-reject-later');

const DEFAULT_TIMEOUT = 30000;
const UNCAUGHT_ERROR_EVENT_NAMES = ['uncaughtException', 'unhandledRejection'];
const EXIT_SIGNAL_NAMES = ['SIGINT', 'SIGTERM', 'SIGQUIT', 'SIGHUP'];
const STUB_LOGGER = {
  error() {},
  info() {},
  warn() {},
};

module.exports = async ({
  services,
  logger = STUB_LOGGER,
  timeout = DEFAULT_TIMEOUT,
}) => {
  process.once('exit', () => logger.info('Exiting.'));

  const handleUncaughtError = err => {
    logger.error(err.stack || err);
    process.exit(1);
  };

  for (const eventName of UNCAUGHT_ERROR_EVENT_NAMES) {
    process.once(eventName, handleUncaughtError);
  }

  let isExiting = false;
  const handleExitSignal = async signal => {
    if (isExiting) return;
    isExiting = true;

    logger.info(`Received ${signal}. Stopping...`);

    setTimeout(() => {
      logger.warn('Timed out waiting for graceful exit.');
      process.exit();
    }, timeout).unref();

    await all(services.map(service => service.stop()));

    logger.info('Services should be stopped. Waiting for exit...');
  };

  for (const eventName of EXIT_SIGNAL_NAMES) {
    process.on(eventName, handleExitSignal);
  }

  const startTimeout = setTimeout(() => {
    throw new Error('Timed out waiting for service to start.');
  }, timeout);

  logger.info('Starting services...');
  await all(
    services.map(service => service.start())
  ).finally(() => clearTimeout(startTimeout));
  logger.info('Services are started.');
};
