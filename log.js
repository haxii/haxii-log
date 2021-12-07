const fs = require('fs')
const path = require('path')
const pino = require('pino')
var pretty = require('pino-pretty')

let logger = pino()
logger.log = logger.info

function init({dir, name, service, level}) {
  const logPath = path.join(dir ?? 'log', `${name}-${process.pid}.log`)

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
    name: name,
    service: service
  })
}

module.exports = logger
module.exports.initLogger = init
