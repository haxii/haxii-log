const fs = require('fs')
const path = require('path')
const pino = require('pino')
const pretty = require('pino-pretty')

let logger = pino()

function init({dir, name, service, level}) {
  // get logger name from env 1st
  const loggerName = process?.env?.LOGGER_NAME ?? name
  const logPath = path.join(dir ?? 'log', `${loggerName}-${process.pid}.log`)

  var logStreams = [{stream: fs.createWriteStream(logPath)}]

  if (level === 'debug') {
    logStreams.push({stream: pretty()})
  }

  logger = pino({
    level: level ?? 'info',
    messageKey: 'message',
    timestamp: () => ',"time":"' + (new Date()).toISOString() + '"',
    formatters: {
      level: label => { return { level: label } }
    }
  }, pino.multistream(logStreams)).child({
    process: loggerName,
    service: service
  })
}

const loggersWithWho = {}

const log = {
  withWho: function(who) {
    if (!loggersWithWho[who]) {
      loggersWithWho[who] = logger.child({who})
    }
    return loggersWithWho[who]
  },
  log: function() { logger.info(...arguments) },
  info: function() { logger.info(...arguments) },
  debug: function() { logger.debug(...arguments) },
  error: function() { logger.error(...arguments) },
  fatal: function() { logger.fatal(...arguments) }
}

module.exports = log
module.exports.initLogger = init
