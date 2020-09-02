'use strict'

const chai = require('chai')
  .use(require('dirty-chai'))
const { expect } = chai
const { fullPath, isDir, isGlob, fExists, globPath, resolvePaths, isHexStr } = require('../src/helper')

module.exports = () => {
  describe('helper tests', () => {
    it('isHexStr - it should return true when string is hex', () => {
      expect(isHexStr('0db350f414a93274e5613930b79c72')).to.be.true()
    })

    it('isHexStr - it should return false when arg is not hex/string', () => {
      expect(isHexStr('gh0db350f414a93274e5613930b79c72')).to.be.false()
      expect(isHexStr(0x33)).to.be.false()
    })

    it('fullPath - it should return right paths', () => {
      expect(fullPath('../test/22.log').startsWith('/test')).to.be.false()
      expect(fullPath('../test/22.log').endsWith('/test/22.log')).to.be.true()
      expect(fullPath('/test/22.log').startsWith('/test/22.log')).to.be.true()
    })

    it('isDir - it should return false for files', async () => {
      const res = await isDir('./test/helper.js')
      expect(res).to.be.false()
    })

    it('isDir - it should return true for dirs', async () => {
      const res = await isDir('./test')
      expect(res).to.be.true()
    })

    it('isGlob - it should return false for files and dirs', () => {
      expect(isGlob('./test/helper.js')).to.be.false()
      expect(isGlob('./test')).to.be.false()
    })

    it('isGlob - it should return true for glob patterns', () => {
      expect(isGlob('**/*.log')).to.be.true()
    })

    it('fExists - it should return false when file/dir doesn\'t exist', async () => {
      const res = await fExists('./test/helper.ts')
      expect(res).to.be.false()
    })

    it('fExists - it should return true when file/dir exists', async () => {
      const [fres, dres] = await Promise.all([
        fExists('./test/helper.js'),
        fExists('./test')
      ])
      expect(fres).to.be.true()
      expect(dres).to.be.true()
    })

    it('globPath - it should return empty array when no match found', async () => {
      const res = await globPath('test/*.ts')
      expect(res).to.be.an('array')
      expect(res.length).to.be.equal(0)
    })

    it('globPath - it should return array of fullpath files when matches found', async () => {
      const res = await globPath('test/*.js')
      expect(res).to.be.an('array')
      expect(res.length).to.be.greaterThan(0)
      expect(res.every(p => typeof p === 'string')).to.be.true()
    })

    it('resolvePaths - it should return empty array when no match found', async () => {
      const results = await Promise.all([
        resolvePaths('./test/*.ts'),
        resolvePaths('./test/helpers.js'),
        resolvePaths('./documents')
      ])

      results.forEach(res => {
        expect(res).to.be.an('array')
        expect(res.length).to.be.equal(0)
      })
    })

    it('resolvePaths - it should return array of fullpath files when matches found', async () => {
      const results = await Promise.all([
        resolvePaths('./test/*.js'),
        resolvePaths('./test/helper.js'),
        resolvePaths('./test')
      ])

      results.forEach(res => {
        expect(res).to.be.an('array')
        expect(res.length).to.be.greaterThan(0)
        expect(res.every(p => typeof p === 'string')).to.be.true()
      })
    })
  })
}
