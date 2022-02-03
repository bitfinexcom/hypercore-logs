'use strict'

const fs = require('fs')
const path = require('path')
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
      await sleep(3000)

      push()
      push()
      await sleep(500)

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
      await sleep(3000)

      await Promise.all([
        server.stop(),
        client.stop()
      ])

      expect(databuff.length).to.be.eq(2)
      expect(databuff[0]).to.be.equal('some data 3')
      expect(databuff[1]).to.be.equal('some data 4')
    }).timeout(1200000)

    describe('print logs on startup', () => {
      const tmpFolder = path.join(__dirname, './tmp')

      beforeEach(async () => {
        if (fs.existsSync(tmpFolder)) await fs.promises.rm(tmpFolder, { recursive: true })
      })

      afterEach(async () => {
        if (fs.existsSync(tmpFolder)) await fs.promises.rm(tmpFolder, { recursive: true })
      })

      it('should print the logs not contained in the local datadir by default', async () => {
        const server = new HyperCoreLogger(() => ram())
        const push = (i) => server.feed.append('some data ' + i)

        await server.start()
        push(0)
        push(1)
        push(2)
        push(3)

        const client = new HyperCoreLogReader(tmpFolder, server.feedKey, null, null, {})

        await sleep(500)
        await client.start()
        await sleep(3000)

        await client.stop()

        push(4)
        push(5)

        const client2 = new HyperCoreLogReader(tmpFolder, server.feedKey, null, null, {})
        const databuff = []
        client2.on('data', (data) => { databuff.push(data.toString()) })

        await sleep(500)
        await client2.start()
        await sleep(3000)

        await client2.stop()

        expect(databuff).to.eql([
          'some data 4',
          'some data 5'
        ])
        await server.stop()
      }).timeout(1200000)
    })
  })
}
