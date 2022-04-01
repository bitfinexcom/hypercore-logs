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
        `${path.join(tmpDir, 'temp1.log')} >>> test\n`,
        `${path.join(tmpDir, 'temp2.log')} >>> test\n`,
        `${path.join(tmpDir, 'temp3.log')} >>> test\n`
      ])
    }).timeout(1200000)
  })
}
