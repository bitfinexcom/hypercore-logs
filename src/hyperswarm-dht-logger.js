'use strict'

const debug = require('debug')('hcore-logger')
const DHT = require('@hyperswarm/dht')
const uuid = require('uuid')
const Tail = require('tail').Tail
const { crypto_sign_SEEDBYTES } = require('sodium-universal') // eslint-disable-line

class HyperSwarmDHTLogger {
  /**
   * @param {string} file
   * @param {string|null} seed
   */
  constructor (file, seed = null) {
    this.file = file
    this.seed = seed && Buffer.allocUnsafe(crypto_sign_SEEDBYTES).fill(seed)

    this.sockets = new Map()
    this.node = null
    this.sever = null
    this.fileWatcher = null
  }

  async start () {
    this.node = new DHT()
    this.server = this.node.createServer()

    this.server.on('connection', socket => {
      const id = uuid.v4()
      debug('socket %s connected', id)
      this.addSocket(id, socket)

      socket.on('error', error => {
        debug('socket %s connection %s', id, error)
        this.removeSocket(id)
        debug('socket %s ended', id)
      })

      socket.on('end', () => {
        this.removeSocket(id)
        debug('socket %s ended', id)
      })
    })

    const keyPair = DHT.keyPair(this.seed)

    this.feedKey = keyPair.publicKey.toString('hex')
    debug('key: %s', this.feedKey)
    debug('secret-key: %s', keyPair.secretKey.toString('hex'))

    await this.server.listen(keyPair)

    this.fileWatcher = new Tail(this.file)
    this.fileWatcher.on('line', (line) => {
      for (const socket of this.sockets.values()) {
        socket.write(line)
      }
    })
    this.fileWatcher.watch()
  }

  addSocket (id, socket) {
    this.sockets.set(id, socket)
  }

  removeSocket (id) {
    const socket = this.sockets.get(id)

    if (socket) {
      this.sockets.delete(id)
      socket.end()
      socket.destroy()
    }
  }

  async stop () {
    Array.from(this.sockets.keys()).forEach(id => this.removeSocket(id))
    await this.server.close()
    await this.node.destroy()
    this.fileWatcher.unwatch()
    debug('writer closed')
  }
}

module.exports = HyperSwarmDHTLogger
