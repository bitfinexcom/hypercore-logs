'use strict'

const debug = require('debug')('hcore-logger')
const DHT = require('@hyperswarm/dht')
const uuid = require('uuid')
const FilesWatcher = require('./files-watcher')

const CRYPTO_SIGN_SEEDBYTES = 32

class HyperSwarmDHTLogger {
  /**
   * @param {string} pathlike File path or glob pattern that will be tailed
   * @param {string|null} seed
   */
  constructor (pathlike, seed = null, republish = false) {
    this.pathlike = pathlike
    this.seed = seed && Buffer.allocUnsafe(CRYPTO_SIGN_SEEDBYTES).fill(seed)
    this.republish = republish

    this.sockets = new Map()
    this.node = null
    this.sever = null
    this.watcher = new FilesWatcher(pathlike, republish)
    this.storage = []
  }

  async start () {
    this.node = new DHT()
    this.server = this.node.createServer()

    this.server.on('connection', socket => {
      const id = uuid.v4()
      debug('socket %s connected', id)
      this.addSocket(id, socket)

      if (this.republish) {
        this.storage.forEach(data => socket.write(data))
      }
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

    this.watcher.on('data', data => {
      if (this.republish) {
        this.storage.push(data)
      }
      for (const socket of this.sockets.values()) {
        socket.write(data)
      }
    })

    await this.watcher.start()
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
    this.storage = []
    Array.from(this.sockets.keys()).forEach(id => this.removeSocket(id))
    await this.server.close()
    await this.node.destroy()
    await this.watcher.stop()
    debug('writer closed')
  }
}

module.exports = HyperSwarmDHTLogger
