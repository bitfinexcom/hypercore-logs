'use strict'

const debug = require('debug')('hcore-logger')
const { EventEmitter } = require('events')
const DHT = require('@hyperswarm/dht')

class HyperSwarmDHTLogReader extends EventEmitter {
  /**
   * @param {string} feedKey
   * @param {{
   * startDate?: Date
   * endDate?: Date
   * include?: string
   * exclude?: string
   * startPattern?: string
   * endPattern?: string
   * }} streamOpts
   */
  constructor (feedKey, streamOpts = {}) {
    super()

    this.feedKey = feedKey
    this.streamOpts = streamOpts
    this.node = null
    this.socket = null
  }

  async start () {
    this.node = new DHT()
    this.socket = this.node.connect(Buffer.from(this.feedKey, 'hex'))

    this.socket.on('open', () => {
      this.socket.write(JSON.stringify({ command: 'fetch', options: this.streamOpts }))
      debug('socket fully open with the other peer')
    })

    this.socket.on('error', error => {
      debug(error)
      this.emit('error', error)
    })

    this.socket.on('data', data => {
      this.emit('data', data.toString('utf-8'))
    })

    this.socket.on('end', () => {
      debug('Socked ended')
    })

    this.socket.on('close', () => {
      debug('Client closed')
    })
  }

  async stop () {
    await this.socket.destroy()
    await this.node.destroy()
    debug('reader closed')
  }
}

module.exports = HyperSwarmDHTLogReader
