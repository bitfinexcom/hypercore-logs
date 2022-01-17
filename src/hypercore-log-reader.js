'use strict'

const _ = require('lodash')
const debug = require('debug')('hcore-logger')
const hypercore = require('hypercore')
const Replicator = require('@hyperswarm/replicator')
const bisect = require('hypercore-bisect')
const { EventEmitter } = require('events')

class HyperCoreLogReader extends EventEmitter {
  /**
   * @param {string|Function} feedDir
   * @param {string|Buffer} feedKey
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
   *
   * @param {Object} [streamOpts]
   * @param {number} [streamOpts.start]
   * @param {number} [streamOpts.end]
   * @param {number} [streamOpts.dateStart]
   * @param {number} [streamOpts.dateEnd]
   * @param {boolean} [streamOpts.snapshot]
   * @param {boolean} [streamOpts.tail]
   * @param {number} [streamOpts.timeout]
   * @param {boolean} [streamOpts.wait]
   * @param {number} [streamOpts.batch]
   */
  constructor (
    feedDir, feedKey, feedOpts = null, swarmOpts = null, streamOpts = null
  ) {
    super()

    feedOpts = feedOpts || {}
    this.feedOpts = _.assign(feedOpts, {
      valueEncoding: feedOpts.valueEncoding || 'utf-8',
      sparse: true,
      live: true,
      overwrite: false
    })

    swarmOpts = swarmOpts || {}
    this.swarmOpts = _.assign(swarmOpts, {
      live: true,
      upload: false,
      download: true,
      announce: true,
      lookup: true
    })

    streamOpts = streamOpts || {}
    this.streamOpts = _.assign(streamOpts, { live: true })

    this.feedKey = feedKey
    this.feedDir = feedDir
  }

  async findIndexByDate (date) {
    const opts = { returnClosest: true }
    const comparator = (item, cb) => {
      const logDate = Date.parse(item.split(' ')[0])

      if (Number.isNaN(logDate)) throw new Error('the logs dont have a timestamp')

      return cb(null, (date.getTime() > logDate ? -1 : 1))
    }

    return new Promise((resolve, reject) => {
      return bisect(this.feed, comparator, opts, (err, index, entry) => {
        if (err) return reject(err)

        resolve(index)
      })
    })
  }

  async start () {
    this.feed = hypercore(this.feedDir, this.feedKey, this.feedOpts)

    await new Promise((resolve, reject) => {
      this.feed.ready((err) => err ? reject(err) : resolve())
    })

    this.swarm = new Replicator()
    await this.swarm.add(this.feed, this.swarmOpts)

    await new Promise((resolve) => {
      this.feed.update({ ifAvailable: true }, async () => {
        this.feedKey = this.feed.key.toString('hex')
        const flen = this.feed.length

        if (this.streamOpts.dateStart) {
          this.streamOpts.start = await this.findIndexByDate(this.streamOpts.dateStart)
        } else if (this.streamOpts.start && this.streamOpts.start < 0) {
          this.streamOpts.start = flen + this.streamOpts.start
          if (this.streamOpts.start < 0) this.streamOpts.start = 0
        }

        if (this.streamOpts.dateEnd) {
          this.streamOpts.end = await this.findIndexByDate(this.streamOpts.dateEnd)
        } else if (this.streamOpts.end && this.streamOpts.end < 0) {
          this.streamOpts.end = flen + this.streamOpts.end
          if (this.streamOpts.end < 0) this.streamOpts.end = 0
        }

        this.stream = this.feed.createReadStream(this.streamOpts)
          .on('data', (data) => this.emit('data', data))

        debug('key: %s', this.feedKey)
        debug('feed length: %d', this.feed.length)

        resolve()
      })
    })
  }

  async stop () {
    await this.swarm.destroy()
    this.stream.destroy()
    this.removeAllListeners()

    await new Promise((resolve, reject) => {
      this.feed.close((err) => err ? reject(err) : resolve())
    })

    debug('reader closed')
  }
}

module.exports = HyperCoreLogReader
