'use strict'

const _ = require('lodash')
const debug = require('debug')('hcore-logger')
const hypercore = require('hypercore')
const Replicator = require('@hyperswarm/replicator')
const { EventEmitter } = require('events')
const { parseLogDate, hasValidDate } = require('./helper')

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
   * @param {number} [streamOpts.startDate]
   * @param {number} [streamOpts.endDate]
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

  async getByIndex (index) {
    return new Promise((resolve, reject) => {
      this.feed.get(index, (err, data) => {
        if (err) return reject(err)
        resolve(data)
      })
    })
  }

  async bisect (compare, getByIndex) {
    let top = this.feed.length
    let bottom = 0

    async function _bisect () {
      const middle = Math.floor((top + bottom) / 2)
      const data = await getByIndex(middle)
      const cmp = compare(data)

      if (cmp < 0) {
        bottom = middle
      } else {
        top = middle
      }

      const newMiddle = Math.floor((top + bottom) / 2)
      if (newMiddle === middle) {
        return middle
      }

      return _bisect()
    }

    return _bisect()
  }

  async findIndexByDate (date) {
    const comparator = item => (date.getTime() > item ? -1 : 1)
    const getValidLog = async index => {
      const line = await this.getByIndex(index)

      if (hasValidDate(line)) return parseLogDate(line)

      return getValidLog(index - 1)
    }
    return this.bisect(comparator, getValidLog)
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

        if (this.streamOpts.start && this.streamOpts.start < 0) {
          this.streamOpts.start = flen + this.streamOpts.start
          if (this.streamOpts.start < 0) this.streamOpts.start = 0
        } else if (this.streamOpts.startDate) {
          this.streamOpts.start = await this.findIndexByDate(this.streamOpts.startDate) + 1
        }

        if (this.streamOpts.end && this.streamOpts.end < 0) {
          this.streamOpts.end = flen + this.streamOpts.end
          if (this.streamOpts.end < 0) this.streamOpts.end = 0
        } else if (this.streamOpts.endDate) {
          this.streamOpts.end = await this.findIndexByDate(this.streamOpts.endDate) + 1
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
