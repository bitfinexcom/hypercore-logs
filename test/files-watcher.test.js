'use strict'

const chai = require('chai')
  .use(require('dirty-chai'))
  .use(require('sinon-chai'))
const { expect } = chai
const { sleep } = require('./helper')
const fs = require('fs').promises
const path = require('path')
const FilesWatcher = require('../src/files-watcher')

module.exports = () => {
  describe('files watcher', () => {
    const tmpDir = path.join(__dirname, 'tmp')

    beforeEach(async () => {
      await fs.mkdir(tmpDir, { recursive: true })
    })

    afterEach(async () => {
      await fs.rm(tmpDir, { recursive: true })
    })

    it('parse simple line', () => {
      const line = 'some data'
      const { path, content } = FilesWatcher.parseLine(line)

      expect(path).to.be.null()
      expect(content).to.equal(line)
    })

    it('parse line with path', () => {
      const line = '/foo/bar/file.log >>> some data'
      const { path, content } = FilesWatcher.parseLine(line)

      expect(path).to.equal('/foo/bar/file.log')
      expect(content).to.equal('some data')
    })

    it('parse line with path and multiple delimiters', () => {
      const line = '/foo/bar/file.log >>> some data >>> any data'
      const { path, content } = FilesWatcher.parseLine(line)

      expect(path).to.equal('/foo/bar/file.log')
      expect(content).to.equal('some data >>> any data')
    })

    it('tail lines', async () => {
      const databuff = []
      const push = (file) => fs.appendFile(
        path.join(tmpDir, file), 'test\n', { encoding: 'utf-8', flag: 'a' }
      )

      await push('temp1.log')
      await push('temp2.log')

      const watcher = new FilesWatcher(path.join(tmpDir, '*.log'), false)

      watcher.on('data', data => databuff.push(data))

      await watcher.start()
      await sleep(500)

      await push('temp1.log')
      await push('temp2.log')
      await sleep(500)

      await watcher.stop()

      expect(databuff).to.eql([
        `${path.join(tmpDir, 'temp1.log')} >>> test`,
        `${path.join(tmpDir, 'temp2.log')} >>> test`
      ])
    }).timeout(120000)

    it('watches new files', async () => {
      const databuff = []
      const push = (file) => fs.writeFile(
        path.join(tmpDir, file), 'test\n', { encoding: 'utf-8', flag: 'a' }
      )
      await push('temp1.log') // create file

      const watcher = new FilesWatcher(path.join(tmpDir, '*.log'))

      watcher.on('data', data => databuff.push(data))

      await watcher.start()
      await sleep(3000)

      await push('temp1.log')
      await push('temp2.log') // create file
      await sleep(500)

      await watcher.stop()

      expect(databuff.length).to.be.equal(2)
    }).timeout(120000)

    it('fetch', async () => {
      const databuff = []
      const filename = path.join(tmpDir, 'temp.log')
      const push = (date) => fs.writeFile(
        filename, `${date} some data\n`, { encoding: 'utf-8', flag: 'a' }
      )
      await push('1970-01-01T00:00:00.000Z')
      await push('1970-01-01T00:10:00.000Z')
      await push('1970-01-01T00:20:00.000Z')
      await push('1970-01-01T00:30:00.000Z')
      await push('1970-01-01T00:40:00.000Z')
      await push('1970-01-01T00:50:00.000Z')

      const watcher = new FilesWatcher(filename)

      await sleep(1000)
      await watcher.start()
      await sleep(3000)

      await watcher.fetch(data => databuff.push(data))

      await sleep(1000)
      await watcher.stop()

      expect(databuff).to.eql([
        '1970-01-01T00:00:00.000Z some data',
        '1970-01-01T00:10:00.000Z some data',
        '1970-01-01T00:20:00.000Z some data',
        '1970-01-01T00:30:00.000Z some data',
        '1970-01-01T00:40:00.000Z some data',
        '1970-01-01T00:50:00.000Z some data'
      ])
    }).timeout(1200000)
  })
}
