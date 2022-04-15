'use strict'

const debug = require('debug')('hcore-logger')
const HyperCoreLogger = require('./hypercore-logger')
const FilesWatcher = require('./files-watcher')

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

    this.watcher = new FilesWatcher(pathlike, this.feedOpts.valueEncoding)
  }

  static getFileDelimiter () {
    return FilesWatcher.getFileDelimiter()
  }

  static parseLine (line) {
    return FilesWatcher.parseLine(line)
  }

  static formatLine (line, file = null) {
    return FilesWatcher.formatLine(line, file)
  }

  async start () {
    await super.start()

    if (this.republish) {
      const published = new Set([])

      this.watcher.on('data', (data, file) => {
        if (published.has(file)) {
          this.feed.append(data)
        }
      })
      await Promise.all(this.watcher.files.map(async file => {
        for await (const line of this.watcher.readFile(file)) {
          this.feed.append(line)
        }
        published.add(file)
      }))
      this.watcher.on('add', async (file) => {
        for await (const line of this.watcher.readFile(file)) {
          this.feed.append(line)
        }
        published.add(file)
      })
      this.watcher.on('unlink', file => {
        published.delete(file)
      })
    } else {
      this.watcher.on('data', data => {
        this.feed.append(data)
      })
    }

    await this.watcher.start()
    debug('feed started listening for changes on %s', this.pathlike)
  }

  async stop () {
    await super.stop()
    await this.watcher.stop()
  }
}

module.exports = HyperCoreFileLogger
