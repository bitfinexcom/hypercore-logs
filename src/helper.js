'use strict'

const path = require('path')

/**
 * @param {string} pathlike
 * @returns {string}
 */
const fullpath = (pathlike) => path.normalize(path.resolve(pathlike))

/**
 * @param {string} str
 * @returns {boolean}
 */
const isHexStr = (str) => (typeof str === 'string' || str instanceof String) &&
  /^[0-9A-Fa-f]+$/.test(str)

module.exports = {
  fullpath,
  isHexStr
}
