'use strict'

const debug = require('debug')('hcore-logger')
const { EventEmitter } = require('events')
const DHT = require('@hyperswarm/dht')

class HyperSwarmDHTLogReader extends EventEmitter {
  /**
   * @param {string} feedKey
   */
  constructor (feedKey) {
    super()

    this.feedKey = feedKey
    this.node = null
    this.socket = null
  }

  async start () {
    this.node = new DHT()
    this.socket = this.node.connect(Buffer.from(this.feedKey, 'hex'))

    this.socket.on('open', function () {
      debug('socket fully open with the other peer')
    })

    this.socket.on('data', data => {
      this.emit('data', data.toString('utf-8'))
    })
  }

  async stop () {
    await this.socket.destroy()
    await this.node.destroy()
    debug('reader closed')
  }
}

module.exports = HyperSwarmDHTLogReader
