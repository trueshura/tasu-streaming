'use strict';

const {describe, it} = require('mocha');
const {assert} = require('chai');
const sinon = require('sinon');

const TasuStreaming = require('../index');

let natsStream;

describe('Connect', () => {
  beforeEach(async function() {
    natsStream = new TasuStreaming({strClientId: 'test-client', strClusterId: 'test-cluster'});
    await natsStream.connected();
  });

  afterEach(async () => {
    natsStream.close();
  });

  it('should connect', async function() {
  });

  it('should close', async () => {
    const done = new Promise((resolve) => {
      natsStream.on('close', resolve);
    });

    natsStream.close();

    await done;
  });

  it('should reconnect', async () => {
    natsStream._scheduleReconnect = sinon.fake();

    natsStream._stan.emit('connection_lost', new Error('fake'));

    assert.isOk(natsStream._scheduleReconnect.calledOnce);
  });

  describe('Unit', async () => {
    describe('Restore subscribers upon reconnect', async () => {
      beforeEach(async () =>{
        natsStream.close();
      })

      it('should _reconnect (infinite)', async () => {
        natsStream._restoreSubscribers = sinon.fake();

        await natsStream._reconnect();

        assert.isOk(natsStream._restoreSubscribers.calledOnce);
      });

      it('should _reconnect once', async () => {
        natsStream._nReconnectAttempts = 1;
        natsStream._restoreSubscribers = sinon.fake();

        await natsStream._reconnect();

        assert.isOk(natsStream._restoreSubscribers.calledOnce);
      });

      it('should NOT reconnect (exhausted)', async () => {
        natsStream._nCurrentAttempt=natsStream._nReconnectAttempts = 1;

        natsStream._reconnect();

        assert.isNotOk(natsStream._restoreSubscribers.calledOnce);
      });
    });
    describe('Subscribers restoration', async () =>{
      it('should restore one', async () => {
        const subs=sinon.fake();
        natsStream.subscribe('test',subs);
        const fakeSubs=natsStream._stan.subscribe=sinon.fake.returns({on: sinon.fake()});

        natsStream._restoreSubscribers();

        assert.isOk(fakeSubs.calledOnce);
        assert.equal(natsStream._mapHandlers.size, 1);
      });

      it('should restore two', async () => {
        const subs=sinon.fake();
        const subs2=sinon.fake();
        natsStream.subscribe('test',subs);
        natsStream.subscribe('test2',subs2);
        const fakeSubs=natsStream._stan.subscribe=sinon.fake.returns({on: sinon.fake()});

        natsStream._restoreSubscribers();

        assert.equal(fakeSubs.callCount, 2);
        assert.equal(natsStream._mapHandlers.size, 2);
      });
    });
  });
});