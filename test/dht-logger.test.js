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
      push()
      push()

      const client = new HyperSwarmDHTLogReader(server.feedKey)

      client.on('data', (data) => { databuff.push(data) })

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
      await sleep(3000)

      push('temp1.log')
      push('temp2.log')
      push('temp3.log')
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
      push()

      const server = new HyperSwarmDHTLogger(filename, 1, true)

      await server.start()
      push()

      const client = new HyperSwarmDHTLogReader(server.feedKey)

      client.on('data', (data) => { databuff.push(data) })

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

      expect(databuff.length).to.be.eq(5)
    }).timeout(1200000)

    it('filter logs by date', async () => {
      const databuff = []
      const filename = path.join(tmpDir, 'temp.log')
      const push = (date) => fs.writeFile(
        filename, `${date} some data\n`, { encoding: 'utf-8', flag: 'a' }
      )
      push('1970-01-01T00:00:00.000Z')
      push('1970-01-01T00:10:00.000Z')
      push('1970-01-01T00:20:00.000Z')
      push('1970-01-01T00:30:00.000Z')
      push('1970-01-01T00:40:00.000Z')
      push('1970-01-01T00:50:00.000Z')

      const server = new HyperSwarmDHTLogger(filename, 1, true)

      await server.start()

      const client = new HyperSwarmDHTLogReader(server.feedKey, {
        startDate: new Date('1970-01-01T00:05:00.000Z'),
        endDate: new Date('1970-01-01T00:35:00.000Z')
      })

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
        '1970-01-01T00:20:00.000Z some data',
        '1970-01-01T00:30:00.000Z some data'
      ])
    }).timeout(1200000)

    it('filter logs by date - out of bounds', async () => {
      const databuff = []
      const filename = path.join(tmpDir, 'temp.log')
      const push = (date) => fs.writeFile(
        filename, `${date} some data\n`, { encoding: 'utf-8', flag: 'a' }
      )
      push('1970-01-01T00:00:00.000Z')
      push('1970-01-01T00:10:00.000Z')
      push('1970-01-01T00:20:00.000Z')
      push('1970-01-01T00:30:00.000Z')
      push('1970-01-01T00:40:00.000Z')
      push('1970-01-01T00:50:00.000Z')

      const server = new HyperSwarmDHTLogger(filename, 1, true)

      await server.start()

      const client = new HyperSwarmDHTLogReader(server.feedKey, {
        startDate: new Date('1970-01-01T00:55:00.000Z'),
        endDate: new Date('1970-01-01T00:59:00.000Z')
      })
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
      const filename = path.join(tmpDir, 'temp.log')
      const push = (date) => fs.writeFile(
        filename, `${date} some data\n`, { encoding: 'utf-8', flag: 'a' }
      )
      push('1970-01-01T00:00:00.000Z')
      push('1970-01-01T00:10:00.000Z')
      push('1970-01-01T00:20:00.000Z')
      push('1970-01-01T00:30:00.000Z')
      push('1970-01-01T00:40:00.000Z')
      push('1970-01-01T00:50:00.000Z')

      const server = new HyperSwarmDHTLogger(filename, 1, true)

      await server.start()

      const client = new HyperSwarmDHTLogReader(server.feedKey, { startDate: new Date('1970-01-01T00:15:00.000Z') })
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
      const filename = path.join(tmpDir, 'temp.log')
      const push = (date) => fs.writeFile(
        filename, `${date} some data\n`, { encoding: 'utf-8', flag: 'a' }
      )
      push('1970-01-01T00:00:00.000Z')
      push('1970-01-01T00:10:00.000Z')
      push('1970-01-01T00:20:00.000Z')
      push('1970-01-01T00:30:00.000Z')
      push('1970-01-01T00:40:00.000Z')
      push('1970-01-01T00:50:00.000Z')

      const server = new HyperSwarmDHTLogger(filename, 1, true)

      await server.start()

      const client = new HyperSwarmDHTLogReader(server.feedKey, { endDate: new Date('1970-01-01T00:35:00.000Z') })
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
      const filename = path.join(tmpDir, 'temp.log')
      const push = (date) => fs.writeFile(
        filename, `${date} some data\n`, { encoding: 'utf-8', flag: 'a' }
      )
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

      const server = new HyperSwarmDHTLogger(filename, 1, true)

      await server.start()

      const client = new HyperSwarmDHTLogReader(server.feedKey, {
        startDate: new Date('1970-01-01T00:05:00.000Z'),
        endDate: new Date('1970-01-01T00:35:00.000Z')
      })
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
