#!/usr/bin/env node

'use strict'

process.env.DEBUG = 'hcore-logger'

const fs = require('fs')
const ram = require('random-access-memory')
const yargs = require('yargs')
  .command(
    'read',
    'creates a reader for a hypercore log',
    (y) => y.option('key', { type: 'string', alias: 'k', demandOption: true, description: 'feed public key, use either hex string or path to file' })
      .option('datadir', { type: 'string', alias: 'd', description: 'feed data directory, if ommited RAM memory will be used' })
      .option('tail', { type: 'boolean', description: 'tail the log file' })
      .option('start', { type: 'number', description: 'feed read start, ignored in case if tail is specified' })
      .option('end', { type: 'number', description: 'feed read end, ignored in case if tail is specified' })
  )
  .command(
    'write',
    'creates a hypercore log writer',
    (y) => y.option('key', { type: 'string', alias: 'k', description: 'feed public key, use either hex string or path to file, if not specified alongside with \'secret-key\' it will generate a new one' })
      .option('secret-key', { type: 'string', alias: 's', description: 'feed private key, use either hex string or path to file, if not specified alongside with \'key\' it will generate a new one' })
      .option('datadir', { type: 'string', alias: 'd', description: 'feed data directory, if ommited RAM memory will be used' })
      .option('file', { type: 'string', alias: 'f', description: 'file that will be tailed, use either file or port option' })
      .option('port', { type: 'number', alias: 'p', description: 'UDP server port, use either file or port option' })
  )
  .demandCommand()
  .recommendCommands()
  .help()

const { HyperCoreLogReader, HyperCoreFileLogger, HyperCoreUdpLogger } = require('../')
const { isHexStr, fullpath } = require('../src/helper')

const cmds = ['read', 'write']

const parseKey = (key, keylen, warning) => {
  try {
    if (key === null || key === undefined || typeof key !== 'string') return null
    if (isHexStr(key) && key.length === keylen) return Buffer.from(key, 'hex')
    return fs.readFileSync(fullpath(key))
  } catch (err) {
    console.warn('WARNING_INVALID_KEY: ' + warning, err)
    return null
  }
}

const parseStorage = (dir) => {
  if (dir === null || dir === undefined || typeof dir !== 'string') return () => ram()
  return fullpath(dir)
}

const main = async () => {
  try {
    const argv = yargs.argv
    const [cmd] = argv._

    if (!cmds.includes(cmd)) throw new Error('ERR_CMD_NOT_SUPPORTED')

    let key = parseKey(argv.key, 64, 'key')
    let secretKey = parseKey(argv['secret-key'], 128, 'secret-key')
    const storage = parseStorage(argv.datadir)

    if (cmd === 'read') {
      if (!key) throw new Error('ERR_KEY_REQUIRED')

      let streamOpts = {}
      if (typeof argv.start === 'number') streamOpts.start = argv.start
      if (typeof argv.end === 'number') streamOpts.end = argv.end
      if (argv.tail === true) streamOpts = { snapshot: false, tail: true }

      const client = new HyperCoreLogReader(storage, key, null, null, streamOpts)
      client.on('data', (data) => console.log(data.toString().trim()))

      await client.start()
    }

    if (cmd === 'write') {
      if (argv.port && argv.file) throw new Error('ERR_TRANSPORT_AMBIGUOUS')

      // clear both in case if one is invalid
      if (!key || !secretKey) {
        key = null
        secretKey = null
      }

      let feed = null
      if (argv.port) {
        feed = new HyperCoreUdpLogger(argv.port, storage, key, { secretKey })
      } else if (argv.file) {
        if (!argv.file) throw new Error('ERR_FILE_MISSING')
        feed = new HyperCoreFileLogger(argv.file, storage, key, { secretKey })
      } else {
        throw new Error('ERR_TRANSPORT_MISSING')
      }

      await feed.start()
    }
  } catch (err) {
    console.error(err)
  }
}

main()
