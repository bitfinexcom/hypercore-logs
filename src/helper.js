'use strict'

const fs = require('fs')
const glob = require('glob')
const os = require('os')
const path = require('path')

/**
 * @param {string} pathlike
 * @returns {string}
 */
const fullPath = (pathlike) => path.normalize(path.resolve(pathlike))

/**
 * @param {string} pathlike
 * @returns {Promise<boolean>}
 */
const isDir = async (pathlike) => {
  try {
    const stats = await fs.promises.stat(pathlike)
    return stats.isDirectory()
  } catch (err) {
    return false
  }
}

/**
 * @param {string} pathlike
 * @returns {boolean}
 */
const isGlob = (pathlike) => /\*|\?|\^|!|\+|@|\[|\]/.test(pathlike)

/**
 * @param {string} pathlike
 * @returns {boolean}
 */
const isUsrDir = (pathlike) => {
  const usrDir = os.platform() === 'win32' ? '%userprofile%' : '~'
  return new RegExp('^' + usrDir, 'i').test(pathlike)
}

/**
 * @param {string} pathlike
 * @returns {Promise<boolean>}
 */
const fExists = async (pathlike) => {
  try {
    await fs.promises.stat(pathlike)
    return true
  } catch (err) {
    if (err.code === 'ENOENT') return false
    throw err
  }
}

/**
 * @param {string} pathlike
 * @returns {Promise<string[]>}
 */
const globPath = async (pathlike) => {
  const matches = await new Promise((resolve, reject) => {
    glob(pathlike, (err, res) => err ? reject(err) : resolve(res))
  })

  return matches.map(p => fullPath(p))
}

/**
 * @param {string} pathlike
 * @returns {string}
 */
const resolveUsrDir = (pathlike) => {
  const usrDir = os.platform() === 'win32' ? '%userprofile%' : '~'
  return pathlike.replace(new RegExp('^' + usrDir, 'i'), os.homedir())
}

/**
 * @param {string} pathlike
 * @returns {Promise<string[]>}
 */
const resolvePaths = async (pathlike) => {
  if (isUsrDir(pathlike)) {
    pathlike = resolveUsrDir(pathlike)
  }

  if (isGlob(pathlike)) return globPath(pathlike)

  if (!await fExists(pathlike)) return []

  if (await isDir(pathlike)) {
    const matches = await globPath(path.join(pathlike, '**/*'))
    const dirs = await Promise.all(matches.map(p => isDir(p)))
    return matches.filter((p, i) => dirs[i] === false)
  }

  return [fullPath(pathlike)]
}

/**
 * @param {string} str
 * @returns {boolean}
 */
const isHexStr = (str) => (typeof str === 'string' || str instanceof String) &&
  /^[0-9A-Fa-f]+$/.test(str)

module.exports = {
  fullPath,
  isDir,
  isGlob,
  isUsrDir,
  fExists,
  globPath,
  resolveUsrDir,
  resolvePaths,
  isHexStr
}
