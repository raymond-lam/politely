/* global describe it afterEach */
/* eslint-disable no-magic-numbers */

'use strict';

const {expect} = require('chai');
const EventEmitter = require('events');
const sinon = require('sinon');
const politely = require('./politely');

const sandbox = sinon.createSandbox();

afterEach(() => {
  sandbox.restore();
});

const getFakeProcess = () => {
  const fakeProcess = new EventEmitter();
  for (const eventName of ['on', 'once']) {
    sandbox.
      stub(process, eventName).
      callsFake(fakeProcess[eventName].bind(fakeProcess));
  }
  return fakeProcess;
};

describe('politely', function() { // eslint-disable-line func-names
  this.timeout(30000); // eslint-disable-line no-invalid-this

  for (const signalName of ['SIGINT', 'SIGTERM', 'SIGQUIT', 'SIGHUP']) {
    it(
      `calls .start() on the given services, and .stop() when ${signalName} `
        + 'signal is received',
      () => {
        const services = [
          {
            start: sandbox.fake.returns(Promise.resolve()),
            stop: sandbox.fake.returns(Promise.resolve()),
          },
          {
            start: sandbox.fake.returns(Promise.resolve()),
            stop: sandbox.fake.returns(Promise.resolve()),
          },
        ];

        const fakeProcess = getFakeProcess();
        sandbox.stub(process, 'exit').throws();

        politely({services});
        fakeProcess.emit(signalName);

        expect(services[0].start.callCount).to.equal(1);
        expect(services[0].stop.callCount).to.equal(1);
        expect(services[1].start.callCount).to.equal(1);
        expect(services[1].stop.callCount).to.equal(1);
      },
    );
  }

  it('exits the process with status code 1 if uncaught exception', () => {
    const fakeProcess = getFakeProcess();
    const exitStub = sandbox.stub(process, 'exit');

    politely({
      services: [
        {
          start() { return Promise.resolve(); },
          stop() { return Promise.resolve(); },
        },
      ],
    });

    fakeProcess.emit('uncaughtException', new Error('fake error'));

    expect(exitStub.callCount).to.equal(1);
    expect(exitStub.lastCall.calledWith(1)).to.equal(true);
  });

  it('exits the process with status code 1 if unhandled rejection', () => {
    const fakeProcess = getFakeProcess();
    const exitStub = sandbox.stub(process, 'exit');

    politely({
      services: [
        {
          start() { return Promise.resolve(); },
          stop() { return Promise.resolve(); },
        },
      ],
    });

    fakeProcess.emit('unhandledRejection', 'fake rejection');

    expect(exitStub.callCount).to.equal(1);
    expect(exitStub.lastCall.calledWith(1)).to.equal(true);
  });

  it('times out if the promise returned by .start() does not resolve', () => {
    const clock = sandbox.useFakeTimers();
    sandbox.stub(process, 'exit');

    politely({
      services: [
        {
          start() { return new Promise(); },
          stop() { return Promise.resolve(); },
        },
      ],
      timeout: 5000,
    });

    expect(
      () => clock.tick(6000),
    ).to.throw('Timed out waiting for service to start');
  });

  it(
    'times out if the promise returned by .stop() does not resolve',
    async () => {
      const fakeProcess = getFakeProcess();
      const exitStub = sandbox.stub(process, 'exit');

      politely({
        services: [
          {
            start() { return Promise.resolve(); },
            stop() { return new Promise(); },
          },
        ],
        timeout: 500,
      });

      fakeProcess.emit('SIGTERM', 'SIGTERM');
      await new Promise(resolve => setTimeout(resolve, 1000));
      expect(exitStub.callCount).to.equal(1);
      expect(exitStub.lastCall.calledWith()).to.equal(true);
    },
  );

  it(
    'only calls .stop() once if multiple shutdown signals are received',
    async () => {
      const fakeProcess = getFakeProcess();

      const service = {
        start() { return Promise.resolve(); },
        stop: sandbox.fake.returns(
          new Promise(resolve => setTimeout(resolve, 500)),
        ),
      };
      politely({services: [service]});

      fakeProcess.emit('SIGTERM', 'SIGTERM');
      fakeProcess.emit('SIGTERM', 'SIGTERM');
      await new Promise(resolve => setTimeout(resolve, 1000));

      expect(service.stop.callCount).to.equal(1);
    },
  );
});
