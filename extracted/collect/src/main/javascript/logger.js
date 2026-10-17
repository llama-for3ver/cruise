import configurations from './configurations'

const CorsClient = require('cardinal-cors-client')

class ConsoleAppender {
  constructor() { }
  log(level, message) {
    if (window.console !== undefined) {
      const levelMapping = ['debug', 'info', 'warn', 'error']
      let logLevel = levelMapping[level]
      logLevel = logLevel === undefined ? 'debug' : logLevel
      if (console[logLevel] !== undefined && typeof console[logLevel] === 'function') {
        console[logLevel](message)
      }
    }
  }
}

class AjaxAppender {
  messageBuffer = []
  defaults = {
    environment: 'stag',
    maxBufferLength: 7,
    remoteUrl: configurations.urls.s3Writer
  }
  configurations = {}
  constructor(configurationOverrides) {
    Object.assign(this.configurations, this.defaults, configurationOverrides)

    // Attempt to send any logs that remain in the message queue before the page redirects
    let context = this
    let flushHandler = function (event) {
      try {
        if (context.messageBuffer.length > 0) {
          context.sendLogBatch()
        }
      } catch (e) {
        // eat exception
      }
    }

    if (window.addEventListener) {
      window.addEventListener('beforeunload', flushHandler);
    } else if (window.attachEvent) {
      window.attachEvent('onbeforeunload', flushHandler);
    }
  }
  log(level, message) {
    this.messageBuffer.push({ level: level, message: message })

    if (this.messageBuffer.length >= this.configurations.maxBufferLength) {
      this.sendLogBatch()
    }
  }
  sendLogBatch() {
    let requestBody = {
      mutator: 'GenericLogs',
      data: this.messageBuffer.splice(0),
      userAgent: navigator.userAgent,
      application: this.configurations.application
    }

    let options = {
      headers: {
        'X-Cardinal-Tid': this.configurations.tId
      }
    }

    let url = this.configurations.remoteUrl + '/' + this.configurations.environment + '/log'

    return CorsClient.sendRequest(url, requestBody, options)
      .then((response) => {
        if (response !== undefined && response.status !== undefined && response.status === 'ok') {
          return true
        } else {
          return false
        }
      })
    ['catch'](function (error) {
      try {
        console.info('failed to send logs to remote server. response text [' + error.response + '] response statusCode [' + error.statusCode + ']')
      } catch (e) {
        // Insight - Eat exception if logging fails
      }
      return false
    })
  }
}

class Logger {
  appenders = []
  namespace = ""
  messageFormat = "{nampespace} - "

  constructor(namespace, appenders, messageFormat) {
    if (namespace !== undefined && typeof namespace === 'string') {
      this.namespace = namespace
    } else {
      this.namespace = 'Unknown Namespace'
    }

    if (messageFormat !== undefined && typeof messageFormat === 'string') {
      this.messageFormat = messageFormat
    }

    this.messageFormat = this.messageFormat.replace(/{nampespace}/, this.namespace)

    if (appenders !== undefined) {
      this.appenders = appenders
    } else {
      throw new TypeError("Appenders cannot be undefined")
    }
  }

  log(level, message) {
    message = this.messageFormat + message
    this.appenders.forEach(appender => {
      if (appender !== undefined && typeof appender.log === 'function') {
        appender.log(level, message)
      }
    })
  }

  updateMessageFormat(newFormat) {
    if (newFormat !== undefined && typeof newFormat === 'string') {
      this.messageFormat = newFormat
      this.messageFormat = this.messageFormat.replace(/{nampespace}/, this.namespace)
    }
  }

  debug(message) {
    this.log(0, message)
  }
  info(message) {
    this.log(1, message)
  }
  warn(message) {
    this.log(2, message)
  }
  error(message) {
    this.log(3, message)
  }
}

class CardinalLogger {
  activeAppenders = []
  appenderMapping = {
    'console': ConsoleAppender,
    'ajax': AjaxAppender
  }
  defaults = {
    application: 'CentinelAPI JS',
    appenders: ['console'],
    mdc: {
      mcsId: '',
      tId: configurations.tId
    }
  }
  configurations = {
    environment: configurations.environment
  }
  messageFormatTemplate = 'Tid-{tid} McsId-{mcsid} ReferenceId-{referenceId} OrgUnitId-{orgUnitId} TxnId-{txnId} {nampespace} - '
  messageFormat = ''
  loggers = []

  configure(configurationOverrides) {
    Object.assign(this.configurations, this.defaults, configurationOverrides)

    if (this.configurations != undefined) {
      if (this.configurations.appenders != undefined && this.configurations.appenders.length > 0) {
        // INSIGHT - empty out existing appenders if already configured once
        this.activeAppenders = []
        this.configurations.appenders.forEach((appenderName) => {
          this.createAppender(appenderName)
        })
      }
    }

    this.applyMDC()
  }

  createAppender(appenderName) {
    if (this.appenderMapping[appenderName] !== undefined) {
      let configurations = {
        application: this.configurations.application,
        environment: this.configurations.environment,
        tId: this.configurations.mdc.tId
      }
      this.activeAppenders.push(new this.appenderMapping[appenderName](configurations))
    }
  }

  getInstance(namespace) {
    let loggerInstance = new Logger(namespace, this.activeAppenders, this.messageFormat)
    this.loggers.push(loggerInstance)
    return loggerInstance
  }

  addMDC(mdc) {
    if (mdc !== undefined && typeof mdc === 'object') {
      Object.assign(this.configurations.mdc, mdc)
      this.applyMDC()
    } else {
      throw TypeError("MDC argument must be a valid object")
    }
  }

  applyMDC() {
    if (this.configurations.mdc !== undefined && typeof this.configurations.mdc === 'object') {
      // make changes to messageFormat
      this.messageFormat = this.messageFormatTemplate
      let mcsId = this.configurations.mdc.mcsId !== undefined ? this.configurations.mdc.mcsId : ""
      let tId = this.configurations.mdc.tId !== undefined ? this.configurations.mdc.tId : ""
      let orgUnitId = this.configurations.mdc.orgUnitId !== undefined ? this.configurations.mdc.orgUnitId : ""
      let referenceId = this.configurations.mdc.referenceId !== undefined ? this.configurations.mdc.referenceId : ""

      let transactionId = this.configurations.mdc.transactionId !== undefined ? this.configurations.mdc.transactionId : ""

      this.messageFormat = this.messageFormat.replace(/{mcsid}/, mcsId)
      this.messageFormat = this.messageFormat.replace(/{tid}/, tId)
      this.messageFormat = this.messageFormat.replace(/{orgUnitId}/, orgUnitId)
      this.messageFormat = this.messageFormat.replace(/{txnId}/, transactionId)
      this.messageFormat = this.messageFormat.replace(/{referenceId}/, referenceId)


      // Broadcast change to all existing loggers
      if (this.loggers.length > 0) {
        this.loggers.forEach((loggerInstance) => {
          loggerInstance.updateMessageFormat(this.messageFormat)
        })
      }
    }
  }
}

const CardinalLoggerSingelton = new CardinalLogger()
CardinalLoggerSingelton.configure({})

export { Logger, CardinalLoggerSingelton as CardinalLogger, ConsoleAppender, AjaxAppender }