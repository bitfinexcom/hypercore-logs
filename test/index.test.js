'use strict'

const bisectTests = require('./bisect.test')
const helperTests = require('./helper.test')
const loggerTests = require('./logger.test')
const fileLoggerTests = require('./logger.file.test')
const dhtLoggerTests = require('./dht-logger.test')
const udpLoggerTests = require('./logger.udp.test')
const cliTests = require('./cli.test')

describe('*** Unit testing! ***', () => {
  bisectTests()
  helperTests()
  loggerTests()
  fileLoggerTests()
  dhtLoggerTests()
  udpLoggerTests()
  cliTests()
})
