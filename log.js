const fs = require('fs')
const path = require('path')
const pino = require('pino')
const pinoPretty = require('pino-pretty')

let logger = pino()

function make({serv, proc, target, level, pretty, stack_adj} = {}) {
  serv = process?.env?.LOG_SERV_NAME ?? (serv || 'pino')
  proc = process?.env?.LOG_PROC_NAME ?? proc
  target = process?.env?.LOG_TARGET ?? (target || 'stdout')
  level = process?.env?.LOG_LEVEL ?? (level || 'info')
  pretty = process?.env?.SYS_DEV ? !!process?.env?.SYS_DEV : !!pretty
  stack_adj = stack_adj || 0 // stack adjustment

  if (!['fatal', 'error', 'warn', 'info', 'debug', 'trace'].includes(level)) { level = 'info' }

  const stream = []
  if (pretty) { stream.push({stream: pinoPretty()}) }
  if (target === 'stdout') {
    if (!pretty) {
      stream.push({stream: process.stdout})
    }
  } else {
    try {
      if (!fs.existsSync(target)) { fs.mkdirSync(target, { recursive: true }) }
      const logPath = path.join(target ?? 'log', `${serv}-${proc ?? process.pid}.log`)
      stream.push({stream: fs.createWriteStream(logPath)})
    } catch (error) {
      console.log(`fail to create log dir ${target} with error ${error}`)
      stream.push({stream: process.stdout})
    }
  }

  logger = pino({
    mixin: function(_, level) {
      if (level < 50) { return {} }
      const caller = Error().stack.split('\n').slice(2).filter(s =>
        !s.includes('node_modules/pino') && !s.includes('node_modules\\pino'))[stack_adj].substring(7)
      return {caller}
    },
    level: level ?? 'info',
    messageKey: 'message',
    timestamp: _ => ',"time":"' + (new Date()).toISOString() + '"',
    formatters: {
      bindings: _ => { return { process: proc, service: serv} },
      level: label => { return { level: label } }
    }
  }, pino.multistream(stream))
}

function init({dir, name, service, level}) {
  // get logger name from env 1st
  const loggerName = process?.env?.LOGGER_NAME ?? name
  const logPath = path.join(dir ?? 'log', `${loggerName}-${process.pid}.log`)

  var logStreams = [{stream: fs.createWriteStream(logPath)}]

  if (level === 'debug') {
    logStreams.push({stream: pinoPretty()})
  }

  logger = pino({
    level: level ?? 'info',
    messageKey: 'message',
    errorKey: 'error',
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
module.exports.makeLogger = make
