'use strict'

const chai = require('chai')
  .use(require('dirty-chai'))
const { expect } = chai
const { sleep } = require('./helper')

const fs = require('fs').promises
const ram = require('random-access-memory')
const { HyperCoreFileLogger, HyperCoreLogReader } = require('../')

module.exports = () => {
  describe('file logger tests', () => {
    it('file logger should push data from file to the reader', async () => {
      const databuff = []
      const filename = `${__dirname}/temp.log`
      const push = () => fs.writeFile(
        filename, 'test\n', { encoding: 'utf-8', flag: 'a' }
      )

      await push() // create file if not exists
      const server = new HyperCoreFileLogger(filename, () => ram())

      await server.start()
      await push()
      await push()

      const client = new HyperCoreLogReader(
        () => ram(), server.feedKey, null, null, { snapshot: false, tail: true }
      )
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

      expect(databuff.length).to.be.eq(2)
    }).timeout(1200000)
  })
}
