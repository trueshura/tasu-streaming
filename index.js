const EventEmitter = require('events');
const TRID = require('trid');
const STAN = require('node-nats-streaming');
const Logger = require('./lib/logger');

module.exports = class extends EventEmitter {
  constructor(options = {}) {
    super();

    this._strClusterId = options.strClusterId || 'local-cluster';
    this._strClientId = options.strClientId || (new TRID({prefix: 'client'})).base();

    this._logger = options.logger || Logger(this._strClusterId, this._strClientId);
    this._nCurrentAttempt = 0;
    this._nReconnectAttempts = options.maxReconnectAttempts || -1;
    this._nReconnectTimeout = options.nReconnectTimeout || 1000;

    // see https://github.com/nats-io/stan.js#connect-options
    //  and https://github.com/nats-io/nats.js#connect-options
    this._defaults = {
      stanMaxPingOut: 3,
      stanPingInterval: 1000,
      connectTimeout: 5000
    };
    this._options = options;
    this._mapHandlers = new Map();

    this._connect();
  }

  connected() {
    return this._promiseConnected;
  }

  scheduleReconnect() {

  }

  _connect() {
    this._stan = STAN.connect(
      this._strClusterId,
      this._strClientId,
      {...this._defaults, ...this._options}
    );

    let initial = true;
    this._promiseConnected = new Promise((resolve, reject) => {
      this._stan.on('connect', () => {
        initial = false;
        this._logger.info('Connected');
        resolve();
      });
      this._stan.on('error', (err) => {
        if (initial) {
          this._logger.error(`Failed to connect: ${err.message}`);
          reject(err);
        } else {
          this._logger.error(`Error: ${err.message}`);
        }

        setTimeout(this._reconnect.bind(this), this._nReconnectTimeout);
      });
    });

    this._stan.on('connection_lost', (error) => {
      this._logger.error(`Disconnected from STAN: ${error.message}`);
      setTimeout(this._reconnect.bind(this), this._nReconnectTimeout);
    });

    this._stan.on('close', () => {
      this._logger.info(`Connection closed`);
      this.emit('close');
    });
  }

  async _reconnect() {
    if (!~this._nReconnectAttempts || ++this._nCurrentAttempt <= this._nReconnectAttempts) {
      try {
        this._logger.info(`Reconnecting`);
        this._connect();
        await this.connected();
        this._restoreSubscribers();
      } catch (e) {
        setTimeout(this._reconnect.bind(this), this._nReconnectTimeout);
      }
    } else {
      this._logger.info(`No more reconnect attempt will be made`);
      this.emit('end');
    }
  }

  _restoreSubscribers() {
    for (let [topic, [handler, bQueue]] of this._mapHandlers) {
      this.subscribe(topic, handler, bQueue);
    }
  }

  subscribe(strTopic, fHandler, bQueue = false) {
    const opts = this._stan.subscriptionOptions();
    opts.setDeliverAllAvailable();
    opts.setDurableName(`${strTopic}-durable`);

    const subscriptionDurable = bQueue ?
      this._stan.subscribe(strTopic, `${strTopic}.workers`, opts) :
      this._stan.subscribe(strTopic, opts);
    subscriptionDurable.on('message', (msg) => {
      const data = msg.getData();
      this._logger.debug(`[<<' ${strTopic} '<<] ${data.toString()}`);
      try {
        const objMsg = JSON.parse(data);
        fHandler(objMsg);
      } catch (e) {
        fHandler(data);
      }
    });

    this._mapHandlers.set(strTopic, [fHandler, bQueue, subscriptionDurable]);
    this._logger.info(`Subscribed from ${strTopic}`);
  }

  unsubscribe(strTopic) {
    const [, , subscription] = this._mapHandlers.get(strTopic);
    if (!subscription) throw new Error(`No subscribers for ${strTopic}`);

    this._logger.info(`Unsubscribed from ${strTopic}`);
    subscription.unsubscribe();
    this._mapHandlers.delete(strTopic);
  }

  publish(strTopic, data) {
    if (typeof data === 'object') data = JSON.stringify(data);

    return new Promise((resolve, reject) => {
      this._stan.publish(strTopic, data, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  close() {
    if (this._stan) {
      this._stan.close();
    } else {
      this._logger.error('Seems to be already closed');
    }
    this._stan = undefined;
  }
};