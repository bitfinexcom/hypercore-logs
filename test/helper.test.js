'use strict'

const chai = require('chai')
  .use(require('dirty-chai'))
const fs = require('fs')
const path = require('path')
const os = require('os')
const { expect } = chai
const { fullPath, isDir, isGlob, isUsrDir, fExists, globPath, resolveUsrDir, resolvePaths, isHexStr } = require('../src/helper')

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

    it('isUsrDir - it should return true in case path starts with user dir (any os)', () => {
      const backup = os.platform

      os.platform = () => 'win32'
      expect(isUsrDir('%UserProfile%\\testing')).to.be.true()
      expect(isUsrDir('%userprofile%\\testing')).to.be.true()
      expect(isUsrDir('%USERPROFILE%/testing')).to.be.true()

      os.platform = () => 'linux'
      expect(isUsrDir('~/testing')).to.be.true()

      os.platform = backup
    })

    it('isUsrDir - it should return false in case path doesn\'t start with user dir (any os)', () => {
      const backup = os.platform

      os.platform = () => 'win32'
      expect(isUsrDir('\\%UserProfile%\\testing')).to.be.false()
      expect(isUsrDir('C:\\\\%userprofile%\\testing')).to.be.false()

      os.platform = () => 'linux'
      expect(isUsrDir('./~/testing')).to.be.false()

      os.platform = backup
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

    it('resolveUsrDir - it should replace home var with full user path in case path starts with user dir (any os)', () => {
      const backup = os.platform

      os.platform = () => 'win32'
      let fullpath = os.homedir() + '\\testing'
      expect(resolveUsrDir('%UserProfile%\\testing')).to.be.equal(fullpath)
      expect(resolveUsrDir('%userprofile%\\testing')).to.be.equal(fullpath)
      expect(resolveUsrDir('%USERPROFILE%\\testing')).to.be.equal(fullpath)

      os.platform = () => 'linux'
      fullpath = path.posix.join(os.homedir(), 'testing')
      expect(resolveUsrDir('~/testing')).to.be.equal(fullpath)

      os.platform = backup
    })

    it('resolveUsrDir - it should return same path in case path doesn\'t start with user dir (any os)', () => {
      const backup = os.platform

      os.platform = () => 'win32'
      expect(resolveUsrDir('\\%UserProfile%\\testing')).to.be.equal('\\%UserProfile%\\testing')
      expect(resolveUsrDir('C:\\\\%userprofile%\\testing')).to.be.equal('C:\\\\%userprofile%\\testing')

      os.platform = () => 'linux'
      expect(resolveUsrDir('./~/testing')).to.be.equal('./~/testing')

      os.platform = backup
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
      const usrDir = os.platform() === 'win32' ? '%userprofile%' : '~'
      const tempfile = path.join(os.homedir(), 'test.log')
      await fs.promises.writeFile(tempfile, 'test', { flag: 'w', encoding: 'utf-8' })

      const results = await Promise.all([
        resolvePaths(path.join(usrDir, '*.log')),
        resolvePaths('./test/*.js'),
        resolvePaths('./test/helper.js'),
        resolvePaths('./test')
      ])
      await fs.promises.unlink(tempfile)

      results.forEach(res => {
        expect(res).to.be.an('array')
        expect(res.length).to.be.greaterThan(0)
        expect(res.every(p => typeof p === 'string')).to.be.true()
      })
    })
  })
}
