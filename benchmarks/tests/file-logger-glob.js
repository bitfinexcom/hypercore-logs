const http = require('http')
const path = require('path')
const fs = require('fs')
const { HyperCoreFileLogger } = require('hypercore-logs')

const cwd = process.cwd()
const feedDir = path.join(cwd, '/tmp/data')
const key = '0db350f414a93274e5613930b79c7226f21270cfc1435b96350422a0abf63dc2'
const secretKey = 'f66a2bbec992b9d4c3dfadc67b8aa69782334ae7753fce182' +
  '016e06c80b6d0dd0db350f414a93274e5613930b' +
  '79c7226f21270cfc1435b96350422a0abf63dc2'

const logsDir = path.join(cwd, 'logs')
const tailfiles = path.join(logsDir, 'file-*.log')
const server = new HyperCoreFileLogger(tailfiles, true, feedDir, key, { secretKey })

function getPathToFile (index) {
  return path.join(logsDir, `file-${index}.log`)
}

const NUMBER_OF_FILES = 100

if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir)

const startPromise = Promise.all([
  Promise.all(new Array(NUMBER_OF_FILES).map((_, i) => {
    return fs.promises.writeFile(getPathToFile(i), '')
  })),
  server.start()
])

let index = 0

http.createServer(async (request, response) => {
  await startPromise
  await fs.promises.appendFile(getPathToFile(index++ % NUMBER_OF_FILES), 'some data\n')
  response.end('ok')
}).listen(3000)
