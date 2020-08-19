'use strict'

const chai = require('chai')
  .use(require('dirty-chai'))
const { expect } = chai
const { sleep } = require('./helper')

const ram = require('random-access-memory')
const { HyperCoreLogger, HyperCoreLogReader } = require('../')

module.exports = () => {
  describe('logger tests', () => {
    it('logger should push data to the reader', async () => {
      const databuff = []

      const server = new HyperCoreLogger(() => ram())
      const push = () => server.feed.append('some data')

      await server.start()
      push()
      push()

      const client = new HyperCoreLogReader(() => ram(), server.feedKey, null, null, { snapshot: false, tail: true })
      client.on('data', (data) => { databuff.push(data.toString()) })

      await sleep(500)
      await client.start()
      await sleep(500)

      push()
      push()

      await Promise.all([
        server.stop(),
        client.stop()
      ])

      expect(databuff.length).to.be.eq(2)
    }).timeout(1200000)
  })
}
