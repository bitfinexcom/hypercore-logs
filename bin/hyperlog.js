#!/usr/bin/env node

'use strict'

process.env.DEBUG = 'hcore-logger'

const fs = require('fs')
const { join, dirname, basename, normalize } = require('path')
const ram = require('random-access-memory')
const pkg = require('../package.json')
const yargs = require('yargs')
  .command(
    'read',
    'creates a reader for a hypercore log',
    (y) => y.option('key', {
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
      .option('include', {
        type: 'string',
        desc: 'filter logs by Regular expression'
      })
      .option('exclude', {
        type: 'string',
        desc: 'exclude logs by Regular expression, can be used along with "include" option'
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
  .demandCommand()
  .recommendCommands()
  .version(pkg.version)
  .help()

const {
  HyperCoreLogReader, HyperCoreFileLogger, HyperCoreUdpLogger
} = require('../')
const {
  createDir, createFileDir, fullPath, isHexStr, isDir, isDirPath
} = require('../src/helper')

const cmds = ['read', 'write']

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

const writeLine = async (path, line) => {
  const options = { flag: 'a' }
  const data = line + '\n'

  return fs.promises.writeFile(path, data, options)
}

const prepareOutputDestination = async (output) => {
  const path = fullPath(output)
  const isDirectory = await isDir(path) || isDirPath(output)
  const dirCreated = isDirectory ? await createDir(path) : await createFileDir(path)

  if (!dirCreated) {
    throw new Error('ERR_MAKE_OUTPUT_DIR_FAILED')
  }

  return {
    demultiplex: isDirectory,
    path: isDirectory ? path : dirname(path),
    file: isDirectory ? `hyperlog-${Date.now()}.log` : basename(path)
  }
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

    const logConsole = argv.output ? argv.console : true
    const prefixRegExp = argv['remote-prefix'] ? new RegExp(`^${normalize(argv['remote-prefix'])}`) : null
    const { path: destination, file, demultiplex } = argv.output ? await prepareOutputDestination(argv.output) : {}
    const include = argv.include ? new RegExp(argv.include) : null
    const exclude = argv.exclude ? new RegExp(argv.exclude) : null

    let streamOpts = {}
    if (typeof argv.start === 'number') streamOpts.start = argv.start
    if (typeof argv.end === 'number') streamOpts.end = argv.end
    if (argv['start-date']) streamOpts.startDate = new Date(argv['start-date'])
    if (argv['end-date']) streamOpts.endDate = new Date(argv['end-date'])
    if (argv.tail === true) streamOpts = { snapshot: false, tail: true }

    const client = new HyperCoreLogReader(storage, key, null, null, streamOpts)

    client.on('data', async (data) => {
      const originLine = data.toString().trimRight()
      const line = prefixRegExp ? originLine.replace(prefixRegExp, '') : originLine

      if (include && !line.match(include)) return
      if (exclude && line.match(exclude)) return

      if (logConsole) console.log(line)

      if (destination) {
        const { path, content } = HyperCoreFileLogger.parseLine(line)

        if (path && demultiplex) {
          const outpath = join(destination, path)

          await createFileDir(outpath)
          await writeLine(outpath, content)
        } else {
          const outpath = join(destination, file)

          await writeLine(outpath, line)
        }
      }
    })

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
      feed = new HyperCoreFileLogger(argv.file, argv.republish === true,
        storage, key, { secretKey })
    } else {
      throw new Error('ERR_TRANSPORT_MISSING')
    }

    await feed.start()
  }
}

main().catch(console.error)
