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

    it('to file', async () => {
      const printer = new LogsPrinter()
      const print = (i) => printer.print('some data ' + i)

      await printer.setup({ output: logFile })

      await print(0)
      await print(1)
      await print(2)

      const fileContent = await fs.readFile(logFile, { encoding: 'utf-8' })

      expect(fileContent).to.eq('some data 0\nsome data 1\nsome data 2\n')
    })
  })
}
