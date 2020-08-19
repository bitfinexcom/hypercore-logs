'use strict'

const debug = require('debug')('hcore-logger')
const HyperCoreLogger = require('./hypercore-logger')
const dgram = require('dgram')

class HyperCoreUdpLogger extends HyperCoreLogger {
  /**
   * @param {string} port UDP server port
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
   * @param {(index: number, data: any, peer: Peer, cb: Function) => void} [feedOpts.onwrite]
   * @param {boolean} [feedOpts.stats]
   * @param {Object} [feedOpts.crypto]: {
   * @param {(data: any, secretKey: string|Buffer, cb: Function) => void} feedOpts.crypto.sign
   * @param {(signature: any, data: any, key: string|Buffer, cb: function name(params)} feedOpts.crypto.verify
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
  constructor (port, feedDir, feedKey = null, feedOpts = null, swarmOpts = null) {
    super(feedDir, feedKey, feedOpts, swarmOpts)

    this.port = port

    this.udp = dgram.createSocket('udp4')
    this.udp.on('message', (raw, rinfo) => {
      const data = this.feedOpts.valueEncoding === 'binary' ? raw
        : raw.toString('utf-8') + '\n'
      this.feed.append(data)
    })
  }

  async start () {
    await super.start()
    await new Promise((resolve, reject) => {
      try {
        this.udp.once('listening', () => {
          const address = this.udp.address()
          debug('server listening %s:%d', address.address, address.port)
          resolve()
        })

        this.udp.bind(this.port)
      } catch (err) {
        reject(err)
      }
    })
  }

  async stop () {
    this.udp.close()
    await super.stop()
  }
}

module.exports = HyperCoreUdpLogger
