'use strict'

const _ = require('lodash')
const debug = require('debug')('hcore-logger')
const fs = require('fs')
const chokidar = require('chokidar')
const readline = require('readline')
const { isGlob } = require('./helper')
const HyperCoreLogger = require('./hypercore-logger')
const Tail = require('tail').Tail

class HyperCoreFileLogger extends HyperCoreLogger {
  /**
   * @param {string} pathlike File path or glob pattern that will be tailed
   * @param {boolean} republish Republish entire file to feed
   * @param {string|Function} feedDir
   * @param {string|Buffer} [feedKey]
   *
   * @param {Object} [feedOpts]
   * @param {boolean} [feedOpts.createIfMissing]
   * @param {'json'|'utf-8'|'binary'} [feedOpts.valueEncoding]
   * @param {boolean} [feedOpts.eagerUpdate]
   * @param {string|Buffer} [feedOpts.secretKey]
   * @param {boolean} [feedOpts.storeSecretKey]
   * @param {number} [feedOpts.storageCacheSize]
   * @param {
        (index: number, data: any, peer: Peer, cb: Function) => void
      } [feedOpts.onwrite]
   * @param {boolean} [feedOpts.stats]
   * @param {Object} [feedOpts.crypto]
   * @param {
        (data, secretKey: string|Buffer, cb: Function) => void
      } feedOpts.crypto.sign
   * @param {
        (signature, data, key: string|Buffer, cb: Function) => void
      } feedOpts.crypto.verify
   * @param {Object} [feedOpts.noiseKeyPair]
   * @param {string|Buffer} feedOpts.noiseKeyPair.publicKey
   * @param {string|Buffer} feedOpts.noiseKeyPair.secretKey
   *
   * @param {Object} [swarmOpts]
   * @param {string[]} [swarmOpts.bootstrap]
   * @param {any} [swarmOpts.ephemeral]
   * @param {number} [swarmOpts.maxPeers]
   * @param {number} [swarmOpts.maxServerSockets]
   * @param {number} [swarmOpts.maxClientSockets]
   * @param {(peer: Peer) => boolean} [swarmOpts.validatePeer]
   * @param {Object} [swarmOpts.queue]
   * @param {number} swarmOpts.queue.requeue
   * @param {Object} swarmOpts.queue.forget
   * @param {number} swarmOpts.queue.forget.unresponsive
   * @param {number} swarmOpts.queue.forget.banned
   * @param {boolean} [swarmOpts.multiplex]
   */
  constructor (
    pathlike, republish,
    feedDir, feedKey = null, feedOpts = null, swarmOpts = null
  ) {
    super(feedDir, feedKey, feedOpts, swarmOpts)

    this.republish = republish
    this.pathlike = pathlike

    /** @type {Object<string, Tail>} */
    this.fileTails = {}
    /** @type {chokidar.FSWatcher | null} */
    this.watcher = null
  }

  static getFileDelimiter () {
    return ' >>> '
  }

  static parseLine (line) {
    const delimiter = HyperCoreFileLogger.getFileDelimiter()
    const [path, ...content] = line.split(delimiter)

    const hasPath = content.length

    return {
      path: hasPath ? path : null,
      content: hasPath ? content.join(delimiter) : line
    }
  }

  static formatLine (line, file = null) {
    const prefix = file ? file + HyperCoreFileLogger.getFileDelimiter() : ''

    return prefix + line
  }

  /**
   * @private
   * @param {String} file
   * @param {{ multiple: Boolean, republish: Boolean }} options
   */
  async watchFile (file, options) {
    if (options.republish) {
      const encoding = this.feedOpts.valueEncoding
      const rstream = fs.createReadStream(file, { encoding })

      const rl = readline.createInterface({
        input: rstream,
        crlfDelay: Infinity
      })

      for await (const line of rl) {
        await new Promise((resolve, reject) => {
          const data = HyperCoreFileLogger.formatLine(line, options.multiple && file) + '\n'
          this.feed.append(data, (err) => err ? reject(err) : resolve())
        })
      }
    }

    const tail = new Tail(file)
    tail.on('line', (line) => {
      const data = HyperCoreFileLogger.formatLine(line, options.multiple && file) + '\n'
      this.feed.append(data)
    })
    tail.watch()

    this.fileTails[file] = tail
  }

  /**
   * @private
   */
  async unwatchFile (file) {
    const watcher = this.fileTails[file]

    if (watcher) {
      watcher.unwatch()
      delete this.fileTails[file]
    }
  }

  async start () {
    await super.start()
    this.watcher = chokidar.watch(this.pathlike)

    this.watcher.on('add', file => this.watchFile(file, {
      multiple: isGlob(this.pathlike),
      republish: this.republish
    }))
    this.watcher.on('unlink', file => this.unwatchFile(file))

    debug('feed started listening for changes on %s', this.pathlike)
  }

  async stop () {
    _.keys(this.fileTails).forEach(file => this.unwatchFile(file))
    if (this.watcher) this.watcher.close()
    await super.stop()
  }
}

module.exports = HyperCoreFileLogger
