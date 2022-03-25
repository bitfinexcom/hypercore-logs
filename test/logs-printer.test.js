const sinon = require('sinon')
const chai = require('chai')
  .use(require('dirty-chai'))
  .use(require('sinon-chai'))
const fs = require('fs').promises
const path = require('path')
const { expect } = chai

const { LogsPrinter } = require('../')

module.exports = () => {
  describe('logs printer', () => {
    const tmpDir = path.join(__dirname, 'tmp')
    const logFile = path.join(tmpDir, 'temp.log')

    beforeEach(async function () {
      sinon.spy(console, 'log')
      await fs.mkdir(tmpDir, { recursive: true })
    })

    afterEach(async function () {
      console.log.restore()
      await fs.rm(tmpDir, { recursive: true })
    })

    it('default options', async () => {
      const printer = new LogsPrinter()
      const print = (i) => printer.print('some data ' + i)

      await printer.setup({})

      await print(0)
      await print(1)
      await print(2)

      expect(console.log).to.be.callCount(3)
      expect(console.log).to.be.calledWith('some data 0')
      expect(console.log).to.be.calledWith('some data 1')
      expect(console.log).to.be.calledWith('some data 2')
    })

    it('print to file', async () => {
      const printer = new LogsPrinter()
      const print = (i) => printer.print('some data ' + i)

      await printer.setup({ output: logFile })

      await print(0)
      await print(1)
      await print(2)

      const fileContent = await fs.readFile(logFile, { encoding: 'utf-8' })

      expect(fileContent).to.eq('some data 0\nsome data 1\nsome data 2\n')
    })

    it('filter logs - include', async () => {
      const printer = new LogsPrinter()
      const print = (i) => printer.print('some data ' + i)

      await printer.setup({ include: 1 })

      await print(0)
      await print(1)
      await print(2)

      expect(console.log).to.be.callCount(1)
      expect(console.log).to.be.calledWith('some data 1')
    })

    it('filter logs - exclude', async () => {
      const printer = new LogsPrinter()
      const print = (i) => printer.print('some data ' + i)

      await printer.setup({ exclude: 1 })

      await print(0)
      await print(1)
      await print(2)

      expect(console.log).to.be.callCount(2)
      expect(console.log).to.be.calledWith('some data 0')
      expect(console.log).to.be.calledWith('some data 2')
    })

    it('print to files by path with prefix', async () => {
      const printer = new LogsPrinter()
      const print = (path, i) => printer.print(path + ' >>> some data ' + i)

      await printer.setup({ output: tmpDir, 'remote-prefix': '/foo/bar' })

      await print('/foo/bar/a', 0)
      await print('/foo/bar/b', 1)
      await print('/foo/bar/c', 2)

      const files = await fs.readdir(tmpDir)

      expect(files).to.eql(['a', 'b', 'c'])

      const fileA = await fs.readFile(path.join(tmpDir, 'a'), { encoding: 'utf-8' })
      const fileB = await fs.readFile(path.join(tmpDir, 'b'), { encoding: 'utf-8' })
      const fileC = await fs.readFile(path.join(tmpDir, 'c'), { encoding: 'utf-8' })

      expect(fileA).to.eq('some data 0\n')
      expect(fileB).to.eq('some data 1\n')
      expect(fileC).to.eq('some data 2\n')
    })
  })
}
