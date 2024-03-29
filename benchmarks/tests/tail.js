'use strict'

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

const tailfile = path.join(cwd, 'file.log')
const server = new HyperCoreFileLogger(tailfile, true, feedDir, key, { secretKey })

const main = async () => {
  const file = await fs.promises.open('file.log', 'w')

  await file.write('')

  http.createServer(async (request, response) => {
    file.appendFile(`${Math.random()}\n`)

    response.end('ok')
  }).listen(3000)

  await server.start()
}

main()
