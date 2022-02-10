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

      it('should print all logs including the local datadir if start option is specified', async () => {
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

        const client2 = new HyperCoreLogReader(tmpFolder, server.feedKey, null, null, { start: 0 })
        const databuff = []
        client2.on('data', (data) => { databuff.push(data.toString()) })

        await sleep(500)
        await client2.start()
        await sleep(3000)

        await client2.stop()

        expect(databuff).to.eql([
          'some data 0',
          'some data 1',
          'some data 2',
          'some data 3',
          'some data 4',
          'some data 5'
        ])

        await server.stop()
      }).timeout(1200000)
    })

    it('filter logs by date', async () => {
      const databuff = []

      const server = new HyperCoreLogger(() => ram())
      const push = (date) => server.feed.append(date + ' some data ')

      await server.start()
      push('1970-01-01T00:00:00.000Z')
      push('1970-01-01T00:10:00.000Z')
      push('1970-01-01T00:20:00.000Z')
      push('1970-01-01T00:30:00.000Z')
      push('1970-01-01T00:40:00.000Z')
      push('1970-01-01T00:50:00.000Z')

      const client = new HyperCoreLogReader(
        () => ram(), server.feedKey, null, null, { startDate: new Date('1970-01-01T00:05:00.000Z'), endDate: new Date('1970-01-01T00:35:00.000Z') }
      )
      client.on('data', (data) => { databuff.push(data.toString()) })

      await sleep(1500)
      await client.start()
      await sleep(3000)

      await Promise.all([
        server.stop(),
        client.stop()
      ])

      expect(databuff).to.eql([
        '1970-01-01T00:10:00.000Z some data ',
        '1970-01-01T00:20:00.000Z some data ',
        '1970-01-01T00:30:00.000Z some data '
      ])
    }).timeout(1200000)

    it('filter logs by date - out of bounds', async () => {
      const databuff = []

      const server = new HyperCoreLogger(() => ram())
      const push = (date) => server.feed.append(date + ' some data ')

      await server.start()
      push('1970-01-01T00:00:00.000Z')
      push('1970-01-01T00:10:00.000Z')
      push('1970-01-01T00:20:00.000Z')
      push('1970-01-01T00:30:00.000Z')
      push('1970-01-01T00:40:00.000Z')
      push('1970-01-01T00:50:00.000Z')

      const client = new HyperCoreLogReader(
        () => ram(), server.feedKey, null, null, { startDate: new Date('1970-01-01T00:55:00.000Z'), endDate: new Date('1970-01-01T00:59:00.000Z') }
      )
      client.on('data', (data) => { databuff.push(data.toString()) })

      await sleep(1500)
      await client.start()
      await sleep(3000)

      await Promise.all([
        server.stop(),
        client.stop()
      ])

      expect(databuff).to.eql([])
    }).timeout(1200000)

    it('filter logs by date - startDate option', async () => {
      const databuff = []

      const server = new HyperCoreLogger(() => ram())
      const push = (date) => server.feed.append(date + ' some data')

      await server.start()
      push('1970-01-01T00:00:00.000Z')
      push('1970-01-01T00:10:00.000Z')
      push('1970-01-01T00:20:00.000Z')
      push('1970-01-01T00:30:00.000Z')
      push('1970-01-01T00:40:00.000Z')
      push('1970-01-01T00:50:00.000Z')

      const client = new HyperCoreLogReader(
        () => ram(), server.feedKey, null, null, { startDate: new Date('1970-01-01T00:15:00.000Z') }
      )
      client.on('data', (data) => { databuff.push(data.toString()) })

      await sleep(1500)
      await client.start()
      await sleep(3000)

      await Promise.all([
        server.stop(),
        client.stop()
      ])

      expect(databuff).to.eql([
        '1970-01-01T00:20:00.000Z some data',
        '1970-01-01T00:30:00.000Z some data',
        '1970-01-01T00:40:00.000Z some data',
        '1970-01-01T00:50:00.000Z some data'
      ])
    }).timeout(1200000)

    it('filter logs by date - endDate option', async () => {
      const databuff = []

      const server = new HyperCoreLogger(() => ram())
      const push = (date) => server.feed.append(date + ' some data')

      await server.start()
      push('1970-01-01T00:00:00.000Z')
      push('1970-01-01T00:10:00.000Z')
      push('1970-01-01T00:20:00.000Z')
      push('1970-01-01T00:30:00.000Z')
      push('1970-01-01T00:40:00.000Z')
      push('1970-01-01T00:50:00.000Z')

      const client = new HyperCoreLogReader(
        () => ram(), server.feedKey, null, null, { endDate: new Date('1970-01-01T00:35:00.000Z') }
      )
      client.on('data', (data) => { databuff.push(data.toString()) })

      await sleep(1500)
      await client.start()
      await sleep(3000)

      await Promise.all([
        server.stop(),
        client.stop()
      ])

      expect(databuff).to.eql([
        '1970-01-01T00:00:00.000Z some data',
        '1970-01-01T00:10:00.000Z some data',
        '1970-01-01T00:20:00.000Z some data',
        '1970-01-01T00:30:00.000Z some data'
      ])
    }).timeout(1200000)

    it('filter multiline logs by date', async () => {
      const databuff = []

      const server = new HyperCoreLogger(() => ram())
      const push = (date) => server.feed.append(date + ' some data')

      await server.start()
      push('1970-01-01T00:00:00.000Z')
      push('\t')
      push('\t')
      push('\t')
      push('1970-01-01T00:10:00.000Z')
      push('\t')
      push('\t')
      push('1970-01-01T00:20:00.000Z')
      push('\t')
      push('\t')
      push('\t')
      push('1970-01-01T00:40:00.000Z')
      push('\t')
      push('\t')
      push('\t')

      const client = new HyperCoreLogReader(
        () => ram(), server.feedKey, null, null, { startDate: new Date('1970-01-01T00:05:00.000Z'), endDate: new Date('1970-01-01T00:35:00.000Z') }
      )
      client.on('data', (data) => { databuff.push(data.toString()) })

      await sleep(1500)
      await client.start()
      await sleep(3000)

      await Promise.all([
        server.stop(),
        client.stop()
      ])

      expect(databuff).to.eql([
        '1970-01-01T00:10:00.000Z some data',
        '\t some data',
        '\t some data',
        '1970-01-01T00:20:00.000Z some data',
        '\t some data',
        '\t some data',
        '\t some data'
      ])
    }).timeout(1200000)
  })
}
