'use strict'

const chai = require('chai')
  .use(require('dirty-chai'))
const { expect } = chai
const { fullpath, isHexStr } = require('../src/helper')

module.exports = () => {
  describe('helper tests', () => {
    it('isHexStr - it should return true when string is hex', () => {
      expect(isHexStr('0db350f414a93274e5613930b79c7226f21270cfc1435b96350422a0abf63dc2')).to.be.true()
    })

    it('isHexStr - it should return false when arg is not string or hex', () => {
      expect(isHexStr('gh0db350f414a93274e5613930b79c7226f21270cfc1435b96350422a0abf63dc2')).to.be.false()
      expect(isHexStr(0x33)).to.be.false()
    })

    it('fullpath - it should return right paths', () => {
      expect(fullpath('../test/test22.log').startsWith('/test')).to.be.false()
      expect(fullpath('../test/test22.log').endsWith('/test/test22.log')).to.be.true()
      expect(fullpath('/test/test22.log').startsWith('/test/test22.log')).to.be.true()
    })
  })
}
