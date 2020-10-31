'use strict';

const {describe, it} = require('mocha');
const {assert} = require('chai');
const sinon = require('sinon');

const TasuStreaming = require('../index');

const sleep = (delay) => {
  return new Promise(resolve => {
    setTimeout(() => resolve(), delay);
  });
};

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
    const done = new Promise((resolve, reject) => {
      natsStream.on('close', resolve);
    });

    natsStream.close();

    await done;
  });

  it('should reconnect', async () => {
    natsStream._nReconnectTimeout = 0;
    natsStream._reconnect = sinon.fake();

    natsStream._stan.emit('connection_lost', new Error('fake'));

    await sleep(200);

    assert.isOk(natsStream._reconnect.calledOnce);
  });

//  describe('Unit', async () => {
//    describe('_reconnect', async () => {
//      it('should _reconnect (infinite)', async () => {
//        natsStream._restoreSubscribers = sinon.fake();
//
//        natsStream._reconnect();
//
//        assert.isOk(natsStream._restoreSubscribers.calledOnce);
//      });
//
//      it('should _reconnect once', async () => {
//        natsStream._nReconnectAttempts = 1;
//        natsStream._restoreSubscribers = sinon.fake();
//
//        natsStream._reconnect();
//
//        assert.isOk(natsStream._restoreSubscribers.calledOnce);
//      });
//
//      it('should NOT reconnect (exhausted)', async () => {
//        natsStream._nCurrentAttempt=natsStream._nReconnectAttempts = 1;
//
//        natsStream._reconnect();
//
//        assert.isNotOk(natsStream._restoreSubscribers.calledOnce);
//      });
//    });
//  });
});