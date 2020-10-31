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

describe('Pub/Sub', () => {
  beforeEach(async function() {
    natsStream = new TasuStreaming({strClientId: 'test-client', strClusterId: 'test-cluster'});
    await natsStream.connected();
  });

  afterEach(async () => {
    natsStream.close();
  });

  it('should subscribe', async function() {
    natsStream.subscribe('test', sinon.fake());
  });

  it('should publish message', async () => {
    await natsStream.publish('test', 'data');
  });

  it('should receive 2 message', async function () {
    const fSubscription = sinon.fake();
    natsStream.subscribe('test2', fSubscription);
    const objData = {a: 'fake'};
    const objData2 = {a: 'fake2'};

    await natsStream.publish('test2', objData);
    await natsStream.publish('test2', objData2);
    await sleep(1000);

    assert.equal(fSubscription.callCount, 2);
    const [objMsg] = fSubscription.args[0];
    assert.deepEqual(objMsg, objData);
    const [objMsg2] = fSubscription.args[1];
    assert.deepEqual(objMsg2, objData2);
  });
});