'use strict'

const fs = require('fs').promises
const path = require('path')
const chai = require('chai')
  .use(require('dirty-chai'))
const { expect } = chai
const { sleep } = require('./helper')

const { HyperSwarmDHTLogger, HyperSwarmDHTLogReader } = require('../')

module.exports = () => {
  describe('DHT logger tests', () => {
    const tmpDir = path.join(__dirname, 'tmp')

    beforeEach(async () => {
      await fs.mkdir(tmpDir, { recursive: true })
    })

    afterEach(async () => {
      await fs.rm(tmpDir, { recursive: true })
    })

    it('logger should push data to the reader', async () => {
      const databuff = []
      const filename = path.join(tmpDir, 'temp.log')
      const push = () => fs.writeFile(
        filename, 'test\n', { encoding: 'utf-8', flag: 'a' }
      )

      await push() // create file if not exists
      const server = new HyperSwarmDHTLogger(filename)

      await server.start()
      await push()
      await push()

      const client = new HyperSwarmDHTLogReader(server.feedKey)

      client.on('data', (data) => { databuff.push(data) })

      await sleep(500)
      await client.start()
      await sleep(2000)

      await push()
      await push()
      await sleep(500)

      await Promise.all([
        server.stop(),
        client.stop()
      ])

      expect(databuff.length).to.be.eq(2)
    }).timeout(1200000)

    it('watches new files', async () => {
      const databuff = []
      const push = (file) => fs.appendFile(
        path.join(tmpDir, file), 'test\n', { encoding: 'utf-8', flag: 'a' }
      )
      await push('temp1.log') // create file

      const server = new HyperSwarmDHTLogger(path.join(tmpDir, '*.log'))

      await server.start()

      const client = new HyperSwarmDHTLogReader(server.feedKey)

      client.on('data', (data) => { databuff.push(data) })

      await sleep(500)
      await client.start()
      await sleep(2000)

      await push('temp1.log')
      await push('temp2.log')
      await push('temp3.log')
      await sleep(500)

      await Promise.all([
        server.stop(),
        client.stop()
      ])

      expect(databuff).to.eql([
        `${path.join(tmpDir, 'temp1.log')} >>> test`,
        `${path.join(tmpDir, 'temp2.log')} >>> test`,
        `${path.join(tmpDir, 'temp3.log')} >>> test`
      ])
    }).timeout(1200000)

    it('logger should republish', async () => {
      const databuff = []
      const filename = path.join(tmpDir, 'temp.log')
      const push = () => fs.writeFile(
        filename, 'test\n', { encoding: 'utf-8', flag: 'a' }
      )

      await push() // create file if not exists
      await push()

      const server = new HyperSwarmDHTLogger(filename, 1, true)

      await server.start()
      await push()

      const client = new HyperSwarmDHTLogReader(server.feedKey)

      client.on('data', (data) => { databuff.push(data) })

      await sleep(1000)
      await client.start()
      await sleep(2000)

      await push()
      await push()
      await sleep(500)

      await Promise.all([
        server.stop(),
        client.stop()
      ])

      expect(databuff.length).to.be.eq(5)
    }).timeout(1200000)

    describe('options', () => {
      async function init (options) {
        const databuff = []
        const filename = path.join(tmpDir, 'temp.log')
        const push = (data) => fs.writeFile(
          filename, data + '\n', { encoding: 'utf-8', flag: 'a' }
        )
        const server = new HyperSwarmDHTLogger(filename)
        await server.start()

        const client = new HyperSwarmDHTLogReader(server.feedKey, options)
        client.on('data', (data) => { databuff.push(data) })

        return {
          push,
          databuff,
          start: () => client.start(),
          stop: () => Promise.all([
            server.stop(),
            client.stop()
          ])
        }
      }

      it('filter logs by date', async () => {
        const { push, databuff, start, stop } = await init({
          startDate: new Date('1970-01-01T00:05:00.000Z'),
          endDate: new Date('1970-01-01T00:35:00.000Z')
        })

        await start()
        await sleep(1000)

        await push('1970-01-01T00:00:00.000Z data')
        await push('1970-01-01T00:10:00.000Z data')
        await push('1970-01-01T00:20:00.000Z data')
        await push('1970-01-01T00:30:00.000Z data')
        await push('1970-01-01T00:40:00.000Z data')
        await push('1970-01-01T00:50:00.000Z data')

        await sleep(1000)
        await stop()

        expect(databuff).to.eql([
          '1970-01-01T00:10:00.000Z data',
          '1970-01-01T00:20:00.000Z data',
          '1970-01-01T00:30:00.000Z data'
        ])
      }).timeout(1200000)

      it('filter logs by date - out of bounds', async () => {
        const { push, databuff, start, stop } = await init({
          startDate: new Date('1970-01-01T00:55:00.000Z'),
          endDate: new Date('1970-01-01T00:59:00.000Z')
        })

        await start()
        await sleep(1000)

        await push('1970-01-01T00:00:00.000Z data')
        await push('1970-01-01T00:10:00.000Z data')
        await push('1970-01-01T00:20:00.000Z data')
        await push('1970-01-01T00:30:00.000Z data')
        await push('1970-01-01T00:40:00.000Z data')
        await push('1970-01-01T00:50:00.000Z data')

        await sleep(1000)
        await stop()

        expect(databuff).to.eql([])
      }).timeout(1200000)

      it('filter logs by date - startDate option', async () => {
        const { push, databuff, start, stop } = await init({
          startDate: new Date('1970-01-01T00:15:00.000Z')
        })

        await start()
        await sleep(1000)

        await push('1970-01-01T00:00:00.000Z data')
        await push('1970-01-01T00:10:00.000Z data')
        await push('1970-01-01T00:20:00.000Z data')
        await push('1970-01-01T00:30:00.000Z data')
        await push('1970-01-01T00:40:00.000Z data')
        await push('1970-01-01T00:50:00.000Z data')

        await sleep(1000)
        await stop()

        expect(databuff).to.eql([
          '1970-01-01T00:20:00.000Z data',
          '1970-01-01T00:30:00.000Z data',
          '1970-01-01T00:40:00.000Z data',
          '1970-01-01T00:50:00.000Z data'
        ])
      }).timeout(1200000)

      it('filter logs by date - endDate option', async () => {
        const { push, databuff, start, stop } = await init({
          endDate: new Date('1970-01-01T00:35:00.000Z')
        })

        await start()
        await sleep(1000)

        await push('1970-01-01T00:00:00.000Z data')
        await push('1970-01-01T00:10:00.000Z data')
        await push('1970-01-01T00:20:00.000Z data')
        await push('1970-01-01T00:30:00.000Z data')
        await push('1970-01-01T00:40:00.000Z data')
        await push('1970-01-01T00:50:00.000Z data')

        await sleep(1000)
        await stop()

        expect(databuff).to.eql([
          '1970-01-01T00:00:00.000Z data',
          '1970-01-01T00:10:00.000Z data',
          '1970-01-01T00:20:00.000Z data',
          '1970-01-01T00:30:00.000Z data'
        ])
      }).timeout(1200000)

      it('filter multiline logs by date', async () => {
        const { push, databuff, start, stop } = await init({
          startDate: new Date('1970-01-01T00:05:00.000Z'),
          endDate: new Date('1970-01-01T00:35:00.000Z')
        })

        await start()
        await sleep(1000)

        await push('1970-01-01T00:00:00.000Z data')
        await push('\t data')
        await push('\t data')
        await push('\t data')
        await push('1970-01-01T00:10:00.000Z data')
        await push('\t data')
        await push('\t data')
        await push('1970-01-01T00:20:00.000Z data')
        await push('\t data')
        await push('\t data')
        await push('\t data')
        await push('1970-01-01T00:40:00.000Z data')
        await push('\t data')
        await push('\t data')
        await push('\t data')

        await sleep(1000)
        await stop()

        expect(databuff).to.eql([
          '1970-01-01T00:10:00.000Z data',
          '\t data',
          '\t data',
          '1970-01-01T00:20:00.000Z data',
          '\t data',
          '\t data',
          '\t data'
        ])
      }).timeout(1200000)

      it('include', async () => {
        const { push, databuff, start, stop } = await init({
          include: 'b'
        })

        await start()
        await sleep(1000)

        await push('aaa')
        await push('abc')
        await push('aaa')
        await push('bbb')
        await push('ccc')
        await push('abb')

        await sleep(1000)
        await stop()

        expect(databuff).to.eql([
          'abc',
          'bbb',
          'abb'
        ])
      }).timeout(1200000)

      it('exclude', async () => {
        const { push, databuff, start, stop } = await init({
          exclude: 'c'
        })

        await start()
        await sleep(1000)

        await push('aaa')
        await push('abc')
        await push('aaa')
        await push('bbb')
        await push('ccc')
        await push('abb')

        await sleep(1000)
        await stop()

        expect(databuff).to.eql([
          'aaa',
          'aaa',
          'bbb',
          'abb'
        ])
      }).timeout(1200000)

      it('include and exclude', async () => {
        const { push, databuff, start, stop } = await init({
          include: 'b',
          exclude: 'c'
        })

        await start()
        await sleep(1000)

        await push('aaa')
        await push('abc')
        await push('aaa')
        await push('bbb')
        await push('ccc')
        await push('abb')

        await sleep(1000)
        await stop()

        expect(databuff).to.eql([
          'bbb',
          'abb'
        ])
      }).timeout(1200000)

      it('start pattern', async () => {
        const { push, databuff, start, stop } = await init({
          startPattern: 'ef'
        })

        await start()
        await sleep(1000)

        await push('abc')
        await push('bcd')
        await push('cde')
        await push('def')
        await push('efg')
        await push('fgh')

        await sleep(1000)
        await stop()

        expect(databuff).to.eql([
          'def',
          'efg',
          'fgh'
        ])
      }).timeout(1200000)

      it('end pattern', async () => {
        const { push, databuff, start, stop } = await init({
          endPattern: 'ef'
        })

        await start()
        await sleep(1000)

        await push('abc')
        await push('bcd')
        await push('cde')
        await push('def')
        await push('efg')
        await push('fgh')

        await sleep(1000)
        await stop()

        expect(databuff).to.eql([
          'abc',
          'bcd',
          'cde'
        ])
      }).timeout(1200000)

      it('start pattern & end pattern', async () => {
        const { push, databuff, start, stop } = await init({
          startPattern: 'd',
          endPattern: 'g'
        })

        await start()
        await sleep(1000)

        await push('abc')
        await push('bcd')
        await push('cde')
        await push('def')
        await push('efg')
        await push('fgh')

        await sleep(1000)
        await stop()

        expect(databuff).to.eql([
          'bcd',
          'cde',
          'def'
        ])
      }).timeout(1200000)

      it('start pattern & end pattern by regexp', async () => {
        const { push, databuff, start, stop } = await init({
          startPattern: '^[a-z]c',
          endPattern: '[fg]'
        })

        await start()
        await sleep(1000)

        await push('abc')
        await push('bcd')
        await push('cde')
        await push('def')
        await push('efg')
        await push('fgh')

        await sleep(1000)
        await stop()

        expect(databuff).to.eql([
          'bcd',
          'cde'
        ])
      }).timeout(1200000)
    })
  })
}
