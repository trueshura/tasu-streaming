const winston = require('winston');

module.exports = function(strCluesterId, strClientId) {
  const {TASU_LOG_LEVEL, LOG_LEVEL, TASU_LOG_TIMESTAMP} = process.env;
  const strLevel = TASU_LOG_LEVEL || LOG_LEVEL || 'error';
  const strId = `tasu-streaming.${strCluesterId}.${strClientId}`;

  const formatter = function(options) {
    const strTimeStamp = TASU_LOG_TIMESTAMP ? options.timestamp() : '';
    return [
      strTimeStamp, strId, options.level.toUpperCase(), options.message || '',
      options.meta && Object.keys(options.meta).length ? JSON.stringify(options.meta) : ''].join(' ');
  };

  return  (winston.createLogger)({
    transports: [
      new (winston.transports.Console)({
        level: strLevel,
        timestamp: function() {
          const now = new Date();
          return now.toISOString();
        },
        formatter,
        stderrLevels: ['error']
      })
    ]
  });
};
