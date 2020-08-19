'use strict'

process.env.DEBUG = 'hcore-logger'

const ram = require('random-access-memory')
const { HyperCoreLogReader } = require('../')

const key = '0db350f414a93274e5613930b79c7226f21270cfc1435b96350422a0abf63dc2'

const client = new HyperCoreLogReader(() => ram(), key, null, null, { snapshot: false, tail: true })

const main = async () => {
  client.on('data', (data) => console.log(data.toString().trim()))
  await client.start()

  setTimeout(async () => {
    await client.stop()
  }, 60000)
}

main()
