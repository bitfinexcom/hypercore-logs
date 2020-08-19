'use strict'

const chai = require('chai')
  .use(require('dirty-chai'))
const { expect } = chai
const { sleep } = require('./helper')

const dgram = require('dgram')
const ram = require('random-access-memory')
const { HyperCoreUdpLogger, HyperCoreLogReader } = require('../')

module.exports = () => {
  describe('udp logger tests', () => {
    it('udp logger should push retrieved data to the reader', async () => {
      const databuff = []
      const udpclient = dgram.createSocket('udp4')
      const push = () => new Promise((resolve, reject) =>
        udpclient.send('test\n', 7070, 'localhost', (err) => err ? reject(err) : resolve()))

      const server = new HyperCoreUdpLogger(7070, () => ram())

      await server.start()
      await push()
      await push()

      const client = new HyperCoreLogReader(() => ram(), server.feedKey, null, null, { snapshot: false, tail: true })
      client.on('data', (data) => { databuff.push(data.toString()) })

      await sleep(500)
      await client.start()
      await sleep(500)

      await push()
      await push()

      await Promise.all([
        server.stop(),
        client.stop()
      ])
      udpclient.close()

      expect(databuff.length).to.be.gt(0).and.lt(3)
    }).timeout(1200000)
  })
}
