'use strict'

process.env.DEBUG = 'hcore-logger'

const dgram = require('dgram')
const path = require('path')
const { HyperCoreUdpLogger } = require('../')

const cwd = process.cwd()
const feedDir = path.join(cwd, '/tmp/data')
const key = '0db350f414a93274e5613930b79c7226f21270cfc1435b96350422a0abf63dc2'
const secretKey = 'f66a2bbec992b9d4c3dfadc67b8aa69782334ae7753fce182016e06c80b6d0dd0db350f414a93274e5613930b79c7226f21270cfc1435b96350422a0abf63dc2'

const port = 7070
const server = new HyperCoreUdpLogger(port, feedDir, key, { secretKey })

const udpclient = dgram.createSocket('udp4')

const main = async () => {
  await server.start()

  const pubinterval = setInterval(() => {
    const message = Buffer.from('some data')
    udpclient.send(message, port, 'localhost')
  }, 3000)

  setTimeout(async () => {
    clearInterval(pubinterval)
    udpclient.close()
    await server.stop()
  }, 20000)
}

main()
