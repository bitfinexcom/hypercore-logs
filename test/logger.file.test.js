'use strict'

const chai = require('chai')
  .use(require('dirty-chai'))
const { expect } = chai
const { sleep } = require('./helper')

const fs = require('fs').promises
const path = require('path')
const ram = require('random-access-memory')
const { HyperCoreFileLogger, HyperCoreLogReader } = require('../')

module.exports = () => {
  describe('file logger tests', () => {
    it('file logger should push data from file to the reader', async () => {
      const databuff = []
      const filename = path.join(__dirname, 'temp.log')
      const push = () => fs.writeFile(
        filename, 'test\n', { encoding: 'utf-8', flag: 'a' }
      )

      await push() // create file if not exists
      const server = new HyperCoreFileLogger(filename, false, () => ram())

      await server.start()
      await push()
      await push()

      const client = new HyperCoreLogReader(
        () => ram(), server.feedKey, null, null, { snapshot: false, tail: true }
      )
      client.on('data', (data) => { databuff.push(data.toString()) })

      await sleep(500)
      await client.start()
      await sleep(3000)

      await push()
      await push()
      await sleep(500)

      await Promise.all([
        server.stop(),
        client.stop()
      ])

      expect(databuff.length).to.be.eq(2)
    }).timeout(1200000)

    it('file logger should republish entire file when specified', async () => {
      const databuff = []
      const filename = path.join(__dirname, 'temp.log')
      const fcontent = 'test1\ntest2\ntest3\ntest4'
      fs.writeFile(filename, fcontent, { encoding: 'utf-8', flag: 'w' })

      const server = new HyperCoreFileLogger(filename, true, () => ram())

      await server.start()

      const client = new HyperCoreLogReader(
        () => ram(), server.feedKey, null, null, { start: -2 }
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
      expect(databuff[0]).to.be.equal('test3\n')
      expect(databuff[1]).to.be.equal('test4\n')
    }).timeout(1200000)

    it('file logger should push data from dir to the reader', async () => {
      const databuff = []
      const dir = __dirname
      const files = [path.join(dir, 'temp1.log'), path.join(dir, 'temp2.log')]
      const push = (i) => fs.writeFile(
        files[i], 'test\n', { encoding: 'utf-8', flag: 'a' }
      )

      await push(0) // create file if not exists
      await push(1) // create file if not exists
      const server = new HyperCoreFileLogger(dir, false, () => ram())

      await server.start()
      await push(0)
      await push(1)

      const client = new HyperCoreLogReader(
        () => ram(), server.feedKey, null, null, { snapshot: false, tail: true }
      )
      client.on('data', (data) => { databuff.push(data.toString()) })

      await sleep(500)
      await client.start()
      await sleep(3000)

      await push(0)
      await push(1)
      await sleep(500)

      await Promise.all([
        server.stop(),
        client.stop()
      ])

      expect(databuff.length).to.be.equal(2)
    }).timeout(1200000)

    it('file logger should push data from glob to the reader', async () => {
      const databuff = []
      const dir = __dirname
      const files = [path.join(dir, 'temp1.log'), path.join(dir, 'temp2.log')]
      const push = (i) => fs.writeFile(
        files[i], 'test\n', { encoding: 'utf-8', flag: 'a' }
      )

      await push(0) // create file if not exists
      await push(1) // create file if not exists
      const server = new HyperCoreFileLogger('test/*.log', false, () => ram())

      await server.start()
      await push(0)
      await push(1)

      const client = new HyperCoreLogReader(
        () => ram(), server.feedKey, null, null, { snapshot: false, tail: true }
      )
      client.on('data', (data) => { databuff.push(data.toString()) })

      await sleep(500)
      await client.start()
      await sleep(3000)

      await push(0)
      await push(1)
      await sleep(500)

      await Promise.all([
        server.stop(),
        client.stop()
      ])

      expect(databuff.length).to.be.equal(2)
    }).timeout(1200000)
  })
}
