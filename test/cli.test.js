'use strict'

const sinon = require('sinon')
const chai = require('chai')
  .use(require('dirty-chai'))
  .use(require('sinon-chai'))
const decache = require('decache')
const ram = require('random-access-memory')
const { expect } = chai
const { sleep } = require('./helper')
const { HyperCoreLogger } = require('../')

process.env.NODE_ENV = 'test'

module.exports = () => {
  describe('logger cli', () => {
    let server, client
    beforeEach(function () {
      sinon.spy(console, 'log')
      server = new HyperCoreLogger(() => ram())
    })

    afterEach(async function () {
      this.timeout(20000)
      decache('../bin/hyperlog.js')
      console.log.restore()

      await Promise.all([
        server && server.stop(),
        client && client.stop()
      ])
    })

    it('should print the logs', async () => {
      const push = (i) => server.feed.append('some data ' + i)

      await server.start()
      push(0)
      push(1)
      push(2)

      process.argv = ['_', '__', 'read', '--key', server.feed.key.toString('hex')]
      const { main } = require('../bin/hyperlog')

      client = (await main()).client
      await sleep(2000)

      expect(console.log).to.be.calledWith('some data 0')
      expect(console.log).to.be.calledWith('some data 1')
      expect(console.log).to.be.calledWith('some data 2')
    }).timeout(12000)

    it('should include logs by regexp', async () => {
      const push = (i) => server.feed.append('some data ' + i)

      await server.start()
      push(0)
      push(1)
      push(2)
      push(3)

      process.argv = ['_', '__', 'read', '--key', server.feed.key.toString('hex'), '--include', '[12]']
      const { main } = require('../bin/hyperlog')

      client = (await main()).client
      await sleep(2000)

      expect(console.log).to.be.calledTwice()
      expect(console.log).to.be.calledWith('some data 1')
      expect(console.log).to.be.calledWith('some data 2')
    }).timeout(12000)

    it('should exclude logs by regexp', async () => {
      const push = (i) => server.feed.append('some data ' + i)

      await server.start()
      push(0)
      push(1)
      push(2)
      push(3)

      process.argv = ['_', '__', 'read', '--key', server.feed.key.toString('hex'), '--exclude', '[12]']
      const { main } = require('../bin/hyperlog')

      client = (await main()).client
      await sleep(2000)

      expect(console.log).to.be.calledTwice()
      expect(console.log).to.be.calledWith('some data 0')
      expect(console.log).to.be.calledWith('some data 3')
    }).timeout(12000)

    it('should omit prefix', async () => {
      const push = (prefix) => server.feed.append(prefix + 'some data')

      await server.start()
      push('')
      push('/foo/bar')
      push('/foo')
      push('')

      process.argv = ['_', '__', 'read', '--key', server.feed.key.toString('hex'), '--remote-prefix', '/foo/bar']
      const { main } = require('../bin/hyperlog')

      client = (await main()).client
      await sleep(2000)

      expect(console.log).to.be.callCount(4)
      expect(console.log).to.be.calledWith('/foosome data')
      expect(console.log).to.be.calledWith('some data')
    }).timeout(12000)
  })
}
