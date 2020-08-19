'use strict'

process.env.DEBUG = 'hcore-logger'

const path = require('path')
const { HyperCoreFileLogger } = require('../')

const cwd = process.cwd()
const feedDir = path.join(cwd, '/tmp/data')
const key = '0db350f414a93274e5613930b79c7226f21270cfc1435b96350422a0abf63dc2'
const secretKey = 'f66a2bbec992b9d4c3dfadc67b8aa69782334ae7753fce182016e06c80b6d0dd0db350f414a93274e5613930b79c7226f21270cfc1435b96350422a0abf63dc2'

const tailfile = path.join(cwd, 'file.log')
const server = new HyperCoreFileLogger(tailfile, feedDir, key, { secretKey })

const main = async () => {
  await server.start()
  setTimeout(async () => {
    await server.stop()
  }, 20000)
}

main()
