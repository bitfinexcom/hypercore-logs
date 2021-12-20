const http = require('http')
const path = require('path')
const { HyperCoreLogger } = require('hypercore-logs')

const cwd = process.cwd()
const feedDir = path.join(cwd, '/tmp/data')
const key = '0db350f414a93274e5613930b79c7226f21270cfc1435b96350422a0abf63dc2'
const secretKey = 'f66a2bbec992b9d4c3dfadc67b8aa69782334ae7753fce182' +
  '016e06c80b6d0dd0db350f414a93274e5613930b' +
  '79c7226f21270cfc1435b96350422a0abf63dc2'

const server = new HyperCoreLogger(feedDir, key, { secretKey })
const startPromise = server.start()

http.createServer(async (request, response) => {
  await startPromise

  server.feed.append('some data')

  response.end('ok')
}).listen(3000)
