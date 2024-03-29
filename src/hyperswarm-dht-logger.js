'use strict'

const debug = require('debug')('hcore-logger')
const DHT = require('@hyperswarm/dht')
const uuid = require('uuid')
const FilesWatcher = require('./files-watcher')
const { parseLogDate, hasValidDate, sequenceSplit } = require('./helper')

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

      socket.on('data', async data => {
        const { command, options } = JSON.parse(data.toString('utf-8'))
        const filter = this.createFilter(options)

        if (command === 'fetch') {
          if (this.republish) {
            await this.watcher.fetch(data => {
              if (filter(data)) {
                socket.write(data)
              }
            })
          } else {
            this.watcher.on('data', data => {
              if (filter(data)) {
                socket.write(data)
              }
            })
          }
        }
      })
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

    await this.watcher.start()
  }

  createFilter (options) {
    const checkStartDate = sequenceSplit(data => {
      if (!hasValidDate(data)) return false
      return parseLogDate(data) >= Date.parse(options.startDate)
    })
    const checkEndDate = sequenceSplit(data => {
      if (!hasValidDate(data)) return false
      return parseLogDate(data) > Date.parse(options.endDate)
    })
    const checkStartPattern = sequenceSplit(data => {
      return data.match(options.startPattern)
    })
    const checkEndPattern = sequenceSplit(data => {
      return data.match(options.endPattern)
    })

    return (data) => {
      if (options.startDate && !checkStartDate(data)) return false
      if (options.endDate && checkEndDate(data)) return false
      if (options.startPattern && !checkStartPattern(data)) return false
      if (options.endPattern && checkEndPattern(data)) return false
      if (options.include && !data.match(options.include)) return false
      if (options.exclude && data.match(options.exclude)) return false

      return true
    }
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
    await this.watcher.stop()
    debug('writer closed')
  }
}

module.exports = HyperSwarmDHTLogger
