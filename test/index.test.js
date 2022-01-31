'use strict'

const bisectTests = require('./bisect.test')
const helperTests = require('./helper.test')
const loggerTests = require('./logger.test')
const fileLoggerTests = require('./logger.file.test')
const udpLoggerTests = require('./logger.udp.test')

describe('*** Unit testing! ***', () => {
  bisectTests()
  helperTests()
  loggerTests()
  fileLoggerTests()
  udpLoggerTests()
})
