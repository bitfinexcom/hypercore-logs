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
    this.watcher = new FilesWatcher(pathlike)
  }

  async start () {
    this.node = new DHT()
    this.server = this.node.createServer()

    this.server.on('connection', async socket => {
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

      if (this.republish) {
        const published = new Set([])

        this.watcher.on('data', (data, file) => {
          if (published.has(file)) {
            socket.write(data)
          }
        })

        await Promise.all(this.watcher.files.map(async file => {
          for await (const line of this.watcher.readFile(file)) {
            socket.write(line)
          }
          published.add(file)
        }))
      } else {
        this.watcher.on('data', data => {
          socket.write(data)
        })
      }
    })

    const keyPair = DHT.keyPair(this.seed)

    this.feedKey = keyPair.publicKey.toString('hex')
    debug('key: %s', this.feedKey)
    debug('secret-key: %s', keyPair.secretKey.toString('hex'))

    await this.server.listen(keyPair)

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
