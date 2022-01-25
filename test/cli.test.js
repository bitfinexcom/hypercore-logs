'use strict'

const sinon = require('sinon')
const chai = require('chai')
  .use(require('dirty-chai'))
  .use(require('sinon-chai'))
const ram = require('random-access-memory')
const { expect } = chai
const { sleep } = require('./helper')
const { HyperCoreLogger } = require('../')

process.env.NODE_ENV = 'test'

module.exports = () => {
  describe('logger cli', () => {
    beforeEach(function () {
      sinon.spy(console, 'log')
    })

    afterEach(function () {
      console.log.restore()
    })

    it('should print the logs', async () => {
      const server = new HyperCoreLogger(() => ram())
      const push = (i) => server.feed.append('some data ' + i)

      await server.start()
      push(0)
      push(1)
      push(2)

      process.argv = ['_', '__', 'read', '--key', server.feed.key.toString('hex')]
      const { main } = require('../bin/hyperlog')

      const { client } = await main()
      await sleep(2000)

      expect(console.log).to.be.called.with('some data 0')
      expect(console.log).to.be.called.with('some data 1')
      expect(console.log).to.be.called.with('some data 2')

      await Promise.all([
        server.stop(),
        client.stop()
      ])
    }).timeout(120000)

    it('should include logs by regexp', async () => {
      const server = new HyperCoreLogger(() => ram())
      const push = (i) => server.feed.append('some data ' + i)

      await server.start()
      push(0)
      push(1)
      push(2)
      push(3)

      process.argv = ['_', '__', 'read', '--key', server.feed.key.toString('hex'), '--include', '[12]']
      const { main } = require('../bin/hyperlog')

      const { client } = await main()
      await sleep(2000)

      expect(console.log).to.be.calledTwice()
      expect(console.log).to.be.called.with('some data 1')
      expect(console.log).to.be.called.with('some data 2')

      await Promise.all([
        server.stop(),
        client.stop()
      ])
    }).timeout(120000)

    it ('should exclude logs by regexp', async () => {
      const server = new HyperCoreLogger(() => ram())
      const push = (i) => server.feed.append('some data ' + i)

      await server.start()
      push(0)
      push(1)
      push(2)
      push(3)

      process.argv = ['_', '__', 'read', '--key', server.feed.key.toString('hex'), '--exclude', '[12]']
      const { main } = require('../bin/hyperlog')

      const { client } = await main()
      await sleep(2000)

      expect(console.log).to.be.calledTwice()
      expect(console.log).to.be.called.with('some data 0')
      expect(console.log).to.be.called.with('some data 3')

      await Promise.all([
        server.stop(),
        client.stop()
      ])
    }).timeout(120000)
  })
}
