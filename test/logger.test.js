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

      const client = new HyperCoreLogReader(
        () => ram(), server.feedKey, null, null, { snapshot: false, tail: true }
      )
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

    it('reader should be able to read last x feed data', async () => {
      const databuff = []

      const server = new HyperCoreLogger(() => ram())
      const push = (i) => server.feed.append('some data ' + i)

      await server.start()
      push(0)
      push(1)
      push(2)
      push(3)
      push(4)
      push(5)

      const client = new HyperCoreLogReader(
        () => ram(), server.feedKey, null, null, { start: -3, end: -1 }
      )
      client.on('data', (data) => { databuff.push(data.toString()) })

      await sleep(500)
      await client.start()
      await sleep(500)

      await Promise.all([
        server.stop(),
        client.stop()
      ])

      expect(databuff.length).to.be.eq(2)
      expect(databuff[0]).to.be.equal('some data 3')
      expect(databuff[1]).to.be.equal('some data 4')
    }).timeout(1200000)
  })
}
