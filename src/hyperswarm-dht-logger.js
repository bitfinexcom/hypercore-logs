'use strict'

const debug = require('debug')('hcore-logger')
const DHT = require('@hyperswarm/dht')
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

    this.sockets = []
    this.node = null
    this.sever = null
    this.fileWatcher = null
  }

  async start () {
    this.node = new DHT()
    this.server = this.node.createServer()

    this.server.on('connection', async socket => {
      this.sockets.push(socket)
      debug('peer connected from %s:%d')

      socket.on('error', error => {
        debug('socket connection %s', error)
      })

      socket.on('end', () => {
        this.sockets.splice(this.sockets.indexOf(socket), 1)
      })
    })

    const keyPair = DHT.keyPair(this.seed)

    this.feedKey = keyPair.publicKey.toString('hex')
    debug('key: %s', this.feedKey)
    debug('secret-key: %s', keyPair.secretKey.toString('hex'))

    await this.server.listen(keyPair)

    this.fileWatcher = new Tail(this.file)
    this.fileWatcher.on('line', (line) => {
      this.sockets.forEach(socket => {
        socket.write(line)
      })
    })
    this.fileWatcher.watch()
  }

  async stop () {
    await this.server.close()
    await this.node.destroy()
    this.fileWatcher.unwatch()
    debug('writer closed')
  }
}

module.exports = HyperSwarmDHTLogger
