#!/usr/bin/env node

'use strict'

process.env.DEBUG = 'hcore-logger'

const fs = require('fs')
const ram = require('random-access-memory')
const pkg = require('../package.json')
const yargs = require('yargs')

const setCommonReadOptions = y => y
  .option('output', {
    type: 'string',
    alias: 'o',
    description: 'log output directory or file, if not provided output ' +
        'will be logged to console.'
  })
  .option('remote-prefix', {
    type: 'string',
    alias: 'rp',
    description: 'path prefix to be omitted'
  })
  .option('console', {
    type: 'boolean',
    alias: 'c',
    description: 'log output to console, if output provided and console ' +
        'ommited then output would be logged only in file!'
  })
  .option('include', {
    type: 'string',
    desc: 'filter logs by Regular expression'
  })
  .option('exclude', {
    type: 'string',
    desc: 'exclude logs by Regular expression, can be used along with "include" option'
  })

yargs.command(
  'read',
  'creates a reader for a hypercore log',
  (y) => setCommonReadOptions(y).option('key', {
    type: 'string',
    alias: 'k',
    demandOption: true,
    description: 'feed public key, use either hex string or path to file'
  })
    .option('datadir', {
      type: 'string',
      alias: 'd',
      description: 'feed data directory, if ommited RAM memory will be used'
    })
    .option('tail', {
      type: 'boolean',
      description: 'tail the log file'
    })
    .option('start', {
      type: 'number',
      desc: 'feed read start, ignored in case if tail is specified, ' +
          'if negative it\'s considered from feed end'
    })
    .option('end', {
      type: 'number',
      desc: 'feed read end, ignored in case if tail is specified, ' +
          'if negative it\'s considered from feed end'
    })
    .option('start-date', {
      type: 'string',
      desc: 'feed read start by date, ignored in case if start is specified'
    })
    .option('end-date', {
      type: 'string',
      desc: 'feed read end by date, ignored in case if end is specified'
    })
)
  .command(
    'dht-read',
    'creates a reader for a hyperswarm log',
    (y) => setCommonReadOptions(y).option('key', {
      type: 'string',
      alias: 'k',
      demandOption: true,
      description: 'feed public key, use either hex string or path to file'
    })
      .option('start-date', {
        type: 'string',
        desc: 'feed read start by date'
      })
      .option('end-date', {
        type: 'string',
        desc: 'feed read end by date'
      })
  )
  .command(
    'write',
    'creates a hypercore log writer',
    (y) => y.option('key', {
      type: 'string',
      alias: 'k',
      description: 'feed public key, use either hex string or path to file, ' +
        'if not specified alongside with \'secret-key\' ' +
        'it will generate a new one'
    })
      .option('secret-key', {
        type: 'string',
        alias: 's',
        desc: 'feed private key, use either hex string or path to file, ' +
          'if not specified alongside with \'key\' it will generate a new one'
      })
      .option('datadir', {
        type: 'string',
        alias: 'd',
        description: 'feed data directory, if ommited RAM memory will be used'
      })
      .option('file', {
        type: 'string',
        alias: 'f',
        desc: 'file, dir or glob pattern that will be tailed, ' +
          'use quoted arg when passing globs! ' +
          'Use either file or port option.'
      })
      .option('republish', {
        type: 'boolean',
        default: false,
        desc: 'republish entire file to the stream, used alongside file option'
      })
      .option('port', {
        type: 'number',
        alias: 'p',
        description: 'UDP server port, use either file or port option'
      })
  )
  .command(
    'dht-write',
    'creates a hyperswarm log writer',
    (y) => y.option('file', {
      type: 'string',
      alias: 'f',
      desc: 'file, dir or glob pattern that will be tailed, ' +
        'use quoted arg when passing globs! ' +
        'Use either file or port option.'
    })
      .option('seed', {
        type: 'string',
        alias: 's',
        default: null,
        desc: 'Key pair\'s seed'
      })
      .option('republish', {
        type: 'boolean',
        default: false,
        desc: 'republish entire file to the stream'
      })
  )
  .demandCommand()
  .recommendCommands()
  .version(pkg.version)
  .help()

const {
  HyperCoreLogReader, HyperCoreFileLogger, HyperCoreUdpLogger, HyperSwarmDHTLogReader,
  HyperSwarmDHTLogger, LogsPrinter
} = require('../')
const { fullPath, isHexStr } = require('../src/helper')

const cmds = ['read', 'write', 'dht-read', 'dht-write']

const parseKey = (key, keylen, warning) => {
  try {
    if (key === null || key === undefined || typeof key !== 'string') {
      return null
    }

    if (isHexStr(key) && key.length === keylen) return Buffer.from(key, 'hex')

    return fs.readFileSync(fullPath(key))
  } catch (err) {
    console.warn('WARNING_INVALID_KEY: ' + warning, err)
    return null
  }
}

const parseStorage = (dir) => {
  if (dir === null || dir === undefined || typeof dir !== 'string') {
    return () => ram()
  }

  return fullPath(dir)
}

const main = async () => {
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
    if (argv['start-date']) streamOpts.startDate = new Date(argv['start-date'])
    if (argv['end-date']) streamOpts.endDate = new Date(argv['end-date'])
    if (argv.tail === true) streamOpts = { snapshot: false, tail: true }

    const client = new HyperCoreLogReader(storage, key, null, null, streamOpts)
    const printer = new LogsPrinter()

    client.on('data', data => printer.print(data.toString()))

    await printer.setup(argv)
    await client.start()

    return { client }
  }

  if (cmd === 'dht-read') {
    if (!key) throw new Error('ERR_KEY_REQUIRED')

    const streamOpts = {}
    if (argv['start-date']) streamOpts.startDate = new Date(argv['start-date'])
    if (argv['end-date']) streamOpts.endDate = new Date(argv['end-date'])
    if (argv['start-pattern']) streamOpts.startPattern = argv['start-pattern']
    if (argv['end-pattern']) streamOpts.endPattern = argv['end-pattern']
    if (argv.include) streamOpts.include = argv.include
    if (argv.exclude) streamOpts.exclude = argv.exclude

    const client = new HyperSwarmDHTLogReader(key, streamOpts)
    const printer = new LogsPrinter()

    client.on('data', data => printer.print(data))
    client.on('error', () => client.stop())

    await printer.setup(argv)
    await client.start()

    return { client }
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
      feed = new HyperCoreFileLogger(argv.file, argv.republish === true,
        storage, key, { secretKey })
    } else {
      throw new Error('ERR_TRANSPORT_MISSING')
    }

    await feed.start()
    return { feed }
  }

  if (cmd === 'dht-write') {
    if (!argv.file) throw new Error('ERR_FILE_MISSING')
    const feed = new HyperSwarmDHTLogger(argv.file, argv.seed, argv.republish)

    await feed.start()
    return { feed }
  }
}

if (require.main === module) {
  main().catch(console.error)
} else {
  module.exports = { main }
}
